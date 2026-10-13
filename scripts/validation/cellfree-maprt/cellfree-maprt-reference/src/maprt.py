"""Independent implementation of Behdad et al. arXiv:2305.12523v2 Eqs. 11–33.

All vectors are proper complex baseband quantities. Public detector methods receive
only observations and known design/prior information, never realized nuisance truth.
"""
from __future__ import annotations
import numpy as np
from scipy.linalg import block_diag, cho_factor, cho_solve
from scipy.stats import beta as beta_distribution


def hermitian(a):
    return (a + a.conj().T) / 2


def _spd(a, n, name):
    a = np.asarray(a, complex)
    if a.shape != (n, n) or not np.isfinite(a).all():
        raise ValueError(f'{name} must be finite {n}x{n}')
    scale=max(np.linalg.norm(a),np.finfo(float).tiny)
    if np.linalg.norm(a-a.conj().T)>1e-10*scale:
        raise ValueError(f'{name} must be Hermitian at its own physical scale')
    a=hermitian(a)  # remove only accepted relative roundoff before Cholesky
    try:
        l = np.linalg.cholesky(a)
    except np.linalg.LinAlgError as exc:
        raise ValueError(f'{name} must be positive definite; singular priors need a reduced support') from exc
    return a, l


def cn(rng, shape):
    """Proper CN(0,I), so E|z|²=1; two real draws per complex sample."""
    return (rng.standard_normal(shape) + 1j * rng.standard_normal(shape)) / np.sqrt(2)


def steering(directions, antennas):
    """Eq. 4, direction vectors point from AP to target, ULA axis is y."""
    directions = np.asarray(directions, float)
    distances = np.linalg.norm(directions, axis=-1)
    if antennas < 1 or np.any(distances <= 0):
        raise ValueError('positive antenna count and nonzero path vectors required')
    return np.exp(1j*np.pi*directions[..., 1, None]/distances[..., None]*np.arange(antennas))


def bistatic_gains(tx, rx, target, carrier_hz, rcs_dbsm):
    """Eq. 13. Output includes physical RCS variance; alpha stays normalized."""
    dtx = np.linalg.norm(np.asarray(tx)-target, axis=1)
    drx = np.linalg.norm(np.asarray(rx)-target, axis=1)
    if carrier_hz <= 0 or np.any(dtx <= 0) or np.any(drx <= 0):
        raise ValueError('carrier and distances must be positive')
    wavelength = 299792458.0 / carrier_hz
    return wavelength**2 * 10**(rcs_dbsm/10) / ((4*np.pi)**3*drx[:,None]**2*dtx[None,:]**2)


def observation_design(w, symbols, amplitudes, atx, arx, gains):
    """Eqs. 1,12,16,17; rows ordered time, receive AP, antenna.

    w: (Ntx,M,J), symbols: (tau,J); h order receive AP, transmit AP,
    then column-major vec(H_rk). alpha order receive AP, transmit AP.
    """
    w, symbols = np.asarray(w, complex), np.asarray(symbols, complex)
    p = np.asarray(amplitudes, float)
    if w.ndim != 3 or symbols.ndim != 2:
        raise ValueError('w and symbols need 3 and 2 dimensions')
    k, m, j = w.shape
    r = np.asarray(arx).shape[0]
    if symbols.shape[1] != j or p.shape != (j,) or np.any(p < 0):
        raise ValueError('inconsistent stream dimensions/nonnegative amplitudes')
    if np.shape(atx) != (k,m) or np.shape(arx) != (r,m) or np.shape(gains) != (r,k):
        raise ValueError('inconsistent steering or gain dimensions')
    if any(not np.isfinite(v).all() for v in [w,symbols,p,atx,arx,gains]) or np.any(np.asarray(gains)<0):
        raise ValueError('finite values and nonnegative gains required')
    x = np.einsum('kmj,tj,j->tkm',w,symbols,p)
    gg, xx = [], []
    for xt in x:
        projection = np.einsum('km,km->k',atx,xt)  # transpose, not adjoint
        gr = [arx[q,:,None]*(np.sqrt(gains[q])*projection)[None,:] for q in range(r)]
        gg.append(block_diag(*gr))
        xx.append(np.kron(np.eye(r),np.kron(xt.reshape(1,-1),np.eye(m))))
    return np.concatenate(gg,axis=0),np.concatenate(xx,axis=0),x


def clutter_covariance(rtx, rrx):
    """Eq. 18 with R_rk=R_tx,rk ⊗ R_rx,rk. Axes are receiver, transmitter."""
    rtx, rrx = np.asarray(rtx),np.asarray(rrx)
    if rtx.shape != rrx.shape or rtx.ndim != 4 or rtx.shape[-1]!=rtx.shape[-2]:
        raise ValueError('link covariance tensors must have equal (R,K,M,M) shapes')
    return block_diag(*[np.kron(rtx[r,k],rrx[r,k]) for r in range(rtx.shape[0]) for k in range(rtx.shape[1])])


class MAPRT:
    """Source Eq.32 via stable prior-whitened Schur elimination.

    R_alpha and R_h must be SPD. Clutter-free is represented by X of zero width
    and R_h=(0,0), not inverse of a singular zero prior. Outputs include the
    source prior-density normalizer; thresholds must use the same convention.
    """
    def __init__(self, g, x, r_alpha, r_h, noise_variance):
        self.g,self.x=np.asarray(g,complex),np.asarray(x,complex)
        if self.g.ndim!=2 or self.x.ndim!=2 or self.g.shape[0]!=self.x.shape[0]:
            raise ValueError('G/X must be matrices with matching rows')
        if self.g.shape[1]<1 or not np.isfinite(self.g).all() or not np.isfinite(self.x).all():
            raise ValueError('finite matrices and nonempty RCS dimension required')
        if not np.isfinite(noise_variance) or noise_variance<=0:
            raise ValueError('noise variance must be positive')
        self.noise=float(noise_variance)
        self.ra,self.la=_spd(r_alpha,self.g.shape[1],'R_alpha')
        self.rh,self.lh=_spd(r_h,self.x.shape[1],'R_h')
        self.u=self.x@self.lh/np.sqrt(self.noise)
        self.v=self.g@self.la/np.sqrt(self.noise)
        self.k0=hermitian(np.eye(self.u.shape[1])+self.u.conj().T@self.u)
        self.c0=cho_factor(self.k0,lower=True)
        self.vr=self.v-self.u@cho_solve(self.c0,self.u.conj().T@self.v)
        self.schur=hermitian(np.eye(self.v.shape[1])+self.v.conj().T@self.vr)
        self.cs=cho_factor(self.schur,lower=True)
        self.qmatrix=hermitian(self.vr@cho_solve(self.cs,self.vr.conj().T))
        self.log_c3=-self.g.shape[1]*np.log(np.pi)-2*np.log(np.diag(self.la).real).sum()
        self.log_det_ratio=-2*np.log(np.diag(self.cs[0]).real).sum()

    def _y(self,y):
        y=np.asarray(y,complex)
        if y.ndim not in (1,2) or y.shape[0]!=self.g.shape[0] or not np.isfinite(y).all():
            raise ValueError('y rows must match observation dimension; finite observations required')
        return y/np.sqrt(self.noise)

    def quadratic(self,y):
        yn=self._y(y)
        z=self.vr.conj().T@yn
        value=np.real(np.sum(z.conj()*cho_solve(self.cs,z),axis=0))
        return value

    def score(self,y):
        return self.quadratic(y)+self.log_c3

    def marginalized_log_lrt(self,y):
        """Separate integrated LRT; same conditional quadratic, different constant."""
        return self.quadratic(y)+self.log_det_ratio

    def estimates(self,y):
        yn=self._y(y)
        za=cho_solve(self.cs,self.vr.conj().T@yn)
        zh0=cho_solve(self.c0,self.u.conj().T@yn)
        zh1=cho_solve(self.c0,self.u.conj().T@(yn-self.v@za))
        return {'alpha_h1':self.la@za,'h_h0':self.lh@zh0,'h_h1':self.lh@zh1}

    def direct_log_joint_ratio(self,y):
        """Independent full normal-equation maximization, evaluated in densities.

        For validation, explicitly builds Eq.28–30 in original coordinates.
        Tiny physical covariance scaling is intentional; production avoids it.
        """
        y=np.asarray(y,complex)
        if y.ndim!=1:
            raise ValueError('oracle handles a single observation')
        n=self.noise
        ia=np.linalg.solve(self.ra,np.eye(self.ra.shape[0]))
        ih=np.linalg.solve(self.rh,np.eye(self.rh.shape[0]))
        d=self.x.conj().T@self.x+n*ih
        c=self.g.conj().T@self.g+n*ia
        e=self.g.conj().T@self.x
        a,b=self.g.conj().T@y,self.x.conj().T@y
        h0=np.linalg.solve(d,b)
        theta=np.linalg.solve(np.block([[c,e],[e.conj().T,d]]),np.r_[a,b])
        alpha,h1=theta[:len(a)],theta[len(a):]
        cost0=np.vdot(y-self.x@h0,y-self.x@h0).real/n+np.vdot(h0,ih@h0).real
        residual=y-self.g@alpha-self.x@h1
        cost1=np.vdot(residual,residual).real/n+np.vdot(alpha,ia@alpha).real+np.vdot(h1,ih@h1).real
        return float(cost0-cost1+self.log_c3)


def sensing_quadratic_matrices(w,symbols,atx,arx,gains,r_alpha,r_h):
    """Source Eqs.36–37 via independent stream-basis covariance contraction."""
    j=w.shape[-1]
    designs=[observation_design(w,symbols,np.eye(j)[i],atx,arx,gains)[:2] for i in range(j)]
    a=np.empty((j,j),complex);b=np.empty((j,j),complex)
    for i in range(j):
        for l in range(j):
            a[i,l]=np.trace(designs[l][0]@r_alpha@designs[i][0].conj().T)
            b[i,l]=np.trace(designs[l][1]@r_h@designs[i][1].conj().T)
    return hermitian(a).real,hermitian(b).real


def exact_binomial_interval(successes,trials,confidence=.95):
    if not 0<=successes<=trials or trials<1 or not 0<confidence<1:
        raise ValueError('valid count/trials/confidence required')
    alpha=1-confidence
    lo=0. if successes==0 else beta_distribution.ppf(alpha/2,successes,trials-successes+1)
    hi=1. if successes==trials else beta_distribution.ppf(1-alpha/2,successes+1,trials-successes)
    return [float(lo),float(hi)]


def calibrate(scores,pfa,confidence=.95):
    """Order-statistic threshold. Continuous-score assumption explicitly checked.

    Threshold is kth ascending sample; decision >= threshold. Independent future
    exceedance probability has Beta(N+1-k,k) sampling uncertainty under continuous
    iid H0. No assertion of exact finite-sample prescribed Pfa for this threshold.
    """
    scores=np.asarray(scores,float)
    if scores.ndim!=1 or len(scores)<2 or not np.isfinite(scores).all() or not 0<pfa<1 or not 0<confidence<1:
        raise ValueError('finite null scores and 0<pfa<1 required')
    k=int(np.ceil((len(scores)+1)*(1-pfa)))
    if not 1<=k<=len(scores):
        raise ValueError('calibration sample size cannot resolve requested tail')
    ordered=np.sort(scores)
    if np.any(np.diff(ordered)==0):
        raise ValueError('ties/degenerate statistic require an explicit randomized decision')
    a=1-confidence
    return {'threshold':float(ordered[k-1]),'order_k':k,'trials':len(scores),
            'target_pfa':float(pfa),'continuous_iid_assumption':True,
            'expected_future_pfa_over_calibration':float((len(scores)+1-k)/(len(scores)+1)),
            'calibration_tail_interval':[float(beta_distribution.ppf(a/2,len(scores)+1-k,k)),float(beta_distribution.ppf(1-a/2,len(scores)+1-k,k))]}
