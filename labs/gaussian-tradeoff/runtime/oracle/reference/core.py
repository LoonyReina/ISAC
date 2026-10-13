"""Independent numerical reference for arXiv:2204.06938v8.

Source equations are identified in SOURCE-AUDIT.md. No author code is used.
Rates are bits per complex channel use; covariance is XX^H/T.
"""
from __future__ import annotations
from dataclasses import dataclass
import math
import numpy as np
from scipy.integrate import quad
from scipy.optimize import brentq
from scipy.special import eval_genlaguerre, gammaln


def _positive(x, name, allow_inf=False):
    x = float(x)
    if x <= 0 or (not np.isfinite(x) and not (allow_inf and x == math.inf)):
        raise ValueError(f'{name} must be positive and finite' + (' or +inf' if allow_inf else ''))
    return x


def _integer(x, name):
    if isinstance(x, bool) or int(x) != x or x < 1:
        raise ValueError(f'{name} must be a positive integer')
    return int(x)


def hermitian_psd(a, name='matrix'):
    a = np.asarray(a, dtype=complex)
    if a.ndim != 2 or a.shape[0] != a.shape[1] or not a.size or not np.isfinite(a).all():
        raise ValueError(f'{name} must be a finite nonempty square matrix')
    scale = max(1.0, np.linalg.norm(a, 2))
    if np.linalg.norm(a-a.conj().T) > 1e-11*scale:
        raise ValueError(f'{name} must be Hermitian')
    vals, vecs = np.linalg.eigh((a+a.conj().T)/2)
    if vals[0] < -1e-11*scale:
        raise ValueError(f'{name} must be positive semidefinite')
    return np.maximum(vals, 0), vecs


@dataclass(frozen=True)
class Model:
    m: int
    ns: int
    t: int
    power_per_antenna: float
    sensing_noise: float = 1.0
    communication_noise: float = 1.0
    prior_variance: float = 1.0

    def __post_init__(self):
        for k in ('m', 'ns', 't'):
            object.__setattr__(self, k, _integer(getattr(self, k), k))
        for k in ('power_per_antenna', 'sensing_noise', 'communication_noise'):
            _positive(getattr(self, k), k)
        _positive(self.prior_variance, 'prior_variance', allow_inf=True)

    @property
    def budget(self): return self.m*self.power_per_antenna
    @property
    def z(self): return self.sensing_noise/(self.t*self.prior_variance)
    @property
    def sensing_scale(self): return self.sensing_noise*self.ns/self.t


def sample_covariance(x):
    x = np.asarray(x, dtype=complex)
    if x.ndim != 2 or min(x.shape) < 1 or not np.isfinite(x).all():
        raise ValueError('X must be a finite nonempty matrix')
    return x @ x.conj().T/x.shape[1]


def conditional_crb(covariance, model: Model):
    """Eq. (95), conditional on known X, or deterministic covariance bound.
    A supplied covariance is not silently treated as a realized waveform.
    """
    eig, _ = hermitian_psd(covariance, 'covariance')
    if len(eig) != model.m:
        raise ValueError('covariance dimension does not match model')
    d = eig + model.z
    if np.any(d <= 0): return math.inf
    if model.z == 0 and eig[0] <= np.finfo(float).eps*model.m*eig[-1]:
        raise ValueError('unregularized covariance is numerically rank-ambiguous; use a proper prior')
    return float(model.sensing_scale*np.sum(1/d))


def minimum_crb(model: Model):
    """Eq. (97), available only if full-rank deterministic covariance fits T."""
    if model.t < model.m:
        raise ValueError('Eq. (97) full-rank sample covariance requires T >= M')
    return model.sensing_scale*model.m/(model.power_per_antenna+model.z)


def real_bfim(x, sensing_noise=1.0, prior_variance=1.0):
    """One row of Hs, eta=[Re(h), Im(h)], from the actual real likelihood.
    CN(0,v) has real-coordinate variance v/2 and prior information 2/v.
    """
    _positive(sensing_noise,'sensing_noise'); _positive(prior_variance,'prior_variance',True)
    x = np.asarray(x, dtype=complex)
    sample_covariance(x)
    a=x.T
    b=np.block([[a.real, -a.imag], [a.imag, a.real]])
    return 2*(b.T@b/sensing_noise+np.eye(2*x.shape[0])/prior_variance)


def posterior_mean(y, x, sensing_noise=1.0, prior_variance=1.0):
    """Gaussian posterior mean/MAP. Receives observations and known X only."""
    _positive(sensing_noise,'sensing_noise'); _positive(prior_variance,'prior_variance',True)
    x=np.asarray(x,dtype=complex); y=np.asarray(y,dtype=complex)
    sample_covariance(x)
    if y.ndim!=2 or y.shape[1]!=x.shape[1] or not np.isfinite(y).all():
        raise ValueError('Y must match X block length')
    if np.isinf(prior_variance):
        sv=np.linalg.svd(x,compute_uv=False)
        if x.shape[0]>x.shape[1] or sv[-1]<=np.finfo(float).eps*max(x.shape)*sv[0]:
            raise ValueError('improper-prior posterior requires an identifiable, numerically full-row-rank X')
    precision=x@x.conj().T+(sensing_noise/prior_variance)*np.eye(x.shape[0])
    return np.linalg.solve(precision,(y@x.conj().T).conj().T).conj().T


def gaussian_rate(h, covariance, noise=1.0):
    """Exact conditional Gaussian MI divided by T, Eq. (110a)."""
    _positive(noise,'noise')
    eig, _=hermitian_psd(covariance,'covariance')
    h=np.asarray(h,dtype=complex)
    if h.ndim!=2 or h.shape[1]!=len(eig) or not np.isfinite(h).all():
        raise ValueError('H must be a finite compatible matrix')
    s=h@np.asarray(covariance)@h.conj().T/noise
    out=np.linalg.eigvalsh((s+s.conj().T)/2)
    return float(np.log1p(np.maximum(out,0)).sum()/np.log(2))


def objective_gradient(w, a, delta, kappa):
    w=np.asarray(w,float); a=np.asarray(a,float)
    if np.isinf(kappa):
        return -float(np.log1p(a*w).sum()), -a/(1+a*w)
    f=float(np.sum(1/(w+delta))-kappa*np.log1p(a*w).sum())
    grad=-1/(w+delta)**2-kappa*a/(1+a*w)
    return f,grad


def covariance_shape(h, model: Model, kappa: float):
    """Solve source (48) specialized to isotropic matrix-estimation prior.

    In H^H H eigenbasis q_i=P_T*w_i. Min sum 1/(w_i+delta)
    - kappa*sum ln(1+a_i*w_i), w>=0, sum w=M. This is NOT
    water filling except at kappa=+inf. Convex KKT roots use scipy.brentq.
    Exact equivalence to (48): kappa=alpha*P_T/((1-alpha)*Ns).
    """
    if np.isnan(kappa) or kappa<0: raise ValueError('kappa must be nonnegative')
    if model.z<=0: raise ValueError('shaping requires a proper finite prior')
    h=np.asarray(h,complex)
    if h.ndim!=2 or h.shape[1]!=model.m or not np.isfinite(h).all():
        raise ValueError('H must be a finite compatible matrix')
    g,v=np.linalg.eigh(h.conj().T@h/model.communication_noise)
    g=np.maximum(g,0); a=g*model.power_per_antenna
    delta=model.z/model.power_per_antenna; budget=float(model.m)
    if np.max(a)==0 or kappa==0:
        w=np.ones(model.m)
    elif np.isinf(kappa):
        inv=np.where(a>0,1/np.maximum(a,np.finfo(float).tiny),np.inf)
        finite=np.sort(inv[np.isfinite(inv)])
        level=None
        for n in range(1,len(finite)+1):
            level=(budget+finite[:n].sum())/n
            if n==len(finite) or level<=finite[n]: break
        w=np.maximum(0,level-inv)
    else:
        def score(x,ai): return 1/(x+delta)**2+kappa*ai/(1+ai*x)
        def allocation(mu):
            out=[]
            for ai in a:
                if score(0,ai)<=mu: out.append(0.)
                elif score(budget,ai)>=mu: out.append(budget)
                else: out.append(brentq(lambda x:score(x,ai)-mu,0,budget,xtol=2e-14,rtol=1e-14))
            return np.asarray(out)
        lo=min(score(budget,ai) for ai in a)
        hi=max(score(0,ai) for ai in a)
        mu=brentq(lambda mu:allocation(mu).sum()-budget,lo,hi,xtol=1e-14,rtol=2e-14)
        w=allocation(mu)
        # Enforce feasible budget, keeping optimization certificate independent.
        w *= budget/w.sum()
    covariance=(v*(model.power_per_antenna*w))@v.conj().T
    f,grad=objective_gradient(w,a,delta,kappa)
    # Supporting hyperplane over the simplex gives a global lower bound.
    gap=max(0.,float(np.dot(grad,w)-budget*np.min(grad)))
    return {'covariance':covariance,'eigenvalues':model.power_per_antenna*w,
            'eigenvectors':v,'normalized_allocation':w,'channel_gains':g,
            'objective':f,'global_gap_bound':gap,'feasibility_residual':float(abs(w.sum()-budget)),
            'min_allocation':float(w.min()),'gradient':grad,'kappa':float(kappa),
            'source48_alpha':1. if np.isinf(kappa) else float(kappa*model.ns/(model.power_per_antenna+kappa*model.ns))}


def cn(rng, shape):
    return (rng.standard_normal(shape)+1j*rng.standard_normal(shape))/np.sqrt(2)


def gaussian_waveforms(covariance, t, count, seed):
    eig,v=hermitian_psd(covariance,'covariance'); t=_integer(t,'t');count=_integer(count,'count')
    rng=np.random.default_rng(seed)
    return np.einsum('ij,bjt->bit',v*np.sqrt(eig),cn(rng,(count,len(eig),t)))


def semiunitary_waveforms(covariance,t,count,seed):
    eig,v=hermitian_psd(covariance,'covariance');t=_integer(t,'t');count=_integer(count,'count')
    active=eig>0; rank=int(active.sum())
    if rank>t: raise ValueError('rank(covariance) cannot exceed T')
    rng=np.random.default_rng(seed); result=[]
    for _ in range(count):
        if rank==0: result.append(np.zeros((len(eig),t),complex));continue
        q,r=np.linalg.qr(cn(rng,(t,rank)),mode='reduced')
        phases=np.diag(r)/np.abs(np.diag(r));q=q*phases
        result.append(np.sqrt(t)*(v[:,active]*np.sqrt(eig[active]))@q.conj().T)
    return np.asarray(result)


def crb_from_waveforms(x,model):
    x=np.asarray(x,complex)
    if x.ndim!=3 or x.shape[1:]!=(model.m,model.t) or not np.isfinite(x).all():
        raise ValueError('waveform batch must have shape (n,M,T)')
    # SVD preserves structural null directions when M>T and avoids squaring
    # conditioning before deciding whether an unregularized inverse is defined.
    sv=np.linalg.svd(x,compute_uv=False)
    if model.z==0 and model.t<model.m:return np.full(len(x),math.inf)
    if model.z==0:
        ambiguous=(sv[:,-1]>0)&(sv[:,-1]<=np.finfo(float).eps*max(model.m,model.t)*sv[:,0])
        if np.any(ambiguous):
            raise ValueError('unregularized waveform is numerically rank-ambiguous; use a proper prior')
    d=sv**2/model.t+model.z
    if model.m>sv.shape[1]:
        d=np.concatenate([d,np.full((len(x),model.m-sv.shape[1]),model.z)],axis=1)
    with np.errstate(divide='ignore'): return model.sensing_scale*np.sum(1/d,axis=1)


def mean_se(values):
    values=np.asarray(values,float)
    if values.ndim!=1 or len(values)<2 or not np.isfinite(values).all():
        raise ValueError('mean/SE requires at least two finite independent values')
    return {'mean':float(values.mean()),'standard_error':float(values.std(ddof=1)/np.sqrt(len(values))),
            'count':len(values),'interval_type':'normal approximation, mean +/- 1.96 SE; not a rigorous confidence guarantee'}


def isotropic_gaussian_crb(m,t,q,ns=1,sensing_noise=1.,prior_variance=1.):
    """Finite-dimensional exact Wishart eigenvalue integration; no MP limit.
    Also supports T<M via nonzero eigenvalues of the dual Wishart matrix.
    """
    m=_integer(m,'m');t=_integer(t,'t');ns=_integer(ns,'ns')
    _positive(q,'q');_positive(sensing_noise,'sensing_noise');_positive(prior_variance,'prior_variance',True)
    z=sensing_noise/(prior_variance*t);rank=min(m,t);dof=max(m,t);alpha=dof-rank
    if z==0:
        if t<=m:return {'value':math.inf,'quadrature_error':0.}
        return {'value':float(sensing_noise*ns*m/(q*(t-m))),'quadrature_error':0.}
    def density(x):
        if x<=0:return 0.
        s=sum(np.exp(gammaln(k+1)-gammaln(k+alpha+1))*eval_genlaguerre(k,alpha,x)**2 for k in range(rank))
        return np.exp(alpha*np.log(x)-x)*s
    value,error=quad(lambda x:density(x)/(q*x/t+z),0,np.inf,epsabs=2e-10,epsrel=2e-11,limit=250)
    scale=sensing_noise*ns/t
    return {'value':float(scale*(value+(m-rank)/z)),'quadrature_error':float(scale*error)}


def mp_resolvent(beta,z):
    """Stable normalized MP Stieltjes transform on the negative real axis."""
    _positive(beta,'beta')
    if z<0 or not np.isfinite(z):raise ValueError('z must be nonnegative finite')
    if z==0:return 1/(1-beta) if beta<1 else math.inf
    root=np.sqrt((z+beta-1)**2+4*z)
    if z+1-beta>=0:return float(2/(root+z+1-beta))
    return float((root-(z+1-beta))/(2*beta*z))


def printed_mp101(eigenvalues,model):
    """Literal source (101), approximation only; not independently certified for general covariance.
    See independent second-moment counterexample in evidence.
    """
    q=np.asarray(eigenvalues,float)
    if len(q)!=model.m or np.any(q<=0): raise ValueError('Eq. (101) needs strictly positive covariance eigenvalues')
    return float(model.sensing_scale*sum(mp_resolvent(model.m/model.t,model.z/qi)/qi for qi in q))


def semiunitary_asymptotic_rate(h,covariance,model,identity_inside=False):
    """Source (56)/(57), or (111a) if identity_inside. NOT certified finite-SNR MI."""
    eig,_=hermitian_psd(covariance)
    h=np.asarray(h,complex);vals=np.linalg.eigvalsh(h@covariance@h.conj().T/model.communication_noise)
    vals=vals[vals>1e-11*max(1.,float(vals.max(initial=0)))]
    r=len(vals)
    if r==0:return 0.
    if r>model.t:raise ValueError('active channel rank exceeds T')
    c=r/model.t*((model.t-r/2)*np.log(model.t/np.e)-gammaln(model.t)+np.log(2*np.sqrt(np.pi)))
    logs=np.log1p(vals) if identity_inside else np.log(vals)
    return float(((1-r/(2*model.t))*logs.sum()+c)/np.log(2))


def achievable_hull(points):
    """Upper concave time-sharing hull of finite achievable (CRB,rate) inputs.
    Must never be fed asymptotic rates as certified achievable points.
    """
    clean=sorted((float(x),float(y)) for x,y in points if np.isfinite(x) and np.isfinite(y))
    unique=[]
    for p in clean:
        if unique and p[0]==unique[-1][0]:unique[-1]=(p[0],max(p[1],unique[-1][1]))
        else:unique.append(p)
    monotone=[]
    for p in unique:
        if not monotone or p[1]>monotone[-1][1]:monotone.append(p)
    hull=[]
    for p in monotone:
        while len(hull)>=2:
            a,b=hull[-2:]
            cross=(b[0]-a[0])*(p[1]-b[1])-(b[1]-a[1])*(p[0]-b[0])
            if cross>=0:hull.pop()
            else:break
        hull.append(p)
    return hull


def rank_one_sphere_rate(snr,t):
    """Exact rank-one semi-unitary-input MI via a 1-D output radial integral.
    Independent finite-SNR check of source (91), NOT a general MIMO formula.
    Noise is CN(0,I_T); input is uniform on radius sqrt(T*snr) in C^T.
    """
    from scipy.special import ive
    from scipy.stats import ncx2
    t=_integer(t,'t')
    if not np.isfinite(snr) or snr<0:raise ValueError('snr must be nonnegative finite')
    if snr==0:return {'rate':0.,'quadrature_error':0.,'omitted_tail_probability':0.}
    radius=np.sqrt(t*snr);upper=radius+max(14.,np.sqrt(t)+12)
    def log_py(r):
        ar=radius*r
        if ar<1e-12:return -t*np.log(np.pi)-r*r-radius*radius
        return -t*np.log(np.pi)-r*r-radius*radius+gammaln(t)+(1-t)*np.log(ar)+np.log(ive(t-1,2*ar))+2*ar
    def integrand(r):
        if r==0:return 0.
        radial=4*r*ncx2.pdf(2*r*r,2*t,2*radius*radius)
        return radial*(-log_py(r)-t*np.log(np.pi*np.e))
    val,err=quad(integrand,0,upper,points=[radius] if radius>0 else None,epsabs=2e-10,epsrel=2e-10,limit=250)
    return {'rate':float(val/(t*np.log(2))),'quadrature_error':float(err/(t*np.log(2))),
            'omitted_tail_probability':float(ncx2.sf(2*upper*upper,2*t,2*radius*radius))}
