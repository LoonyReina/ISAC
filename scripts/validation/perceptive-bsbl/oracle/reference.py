"""Original NumPy/SciPy bounded direct-MMV reference. See SOURCE-CONTRACT.md.
No author code is imported, translated, executed, or included.
"""
from dataclasses import dataclass, asdict
import time
import numpy as np
from scipy.linalg import cho_factor, cho_solve

@dataclass(frozen=True)
class Config:
    N: int = 64
    K: int = 2
    MT: int = 2
    M: int = 4
    Np: int = 32
    g: int = 2
    bandwidth: float = 20e6
    c: float = 299792458.
    @property
    def d(self): return self.K*self.MT
    @property
    def delay_step(self): return 1/(self.g*self.bandwidth)

@dataclass(frozen=True)
class Path:
    q: float
    user: int
    aoa: float
    aod: float
    gain: complex

DEFAULT_PATHS=(Path(4,0,-28.,18.,1.*np.exp(.31j)),
               Path(11,1,12.,-36.,.7*np.exp(-.83j)),
               Path(23,0,41.,29.,.45*np.exp(1.23j)))

def steering(count,angle):
    return np.exp(-1j*np.pi*np.arange(count)*np.sin(np.deg2rad(angle)))

def known_symbols(seed,cfg=Config()):
    rng=np.random.default_rng(seed)
    return np.exp(1j*np.pi/2*rng.integers(0,4,(cfg.N,cfg.K,cfg.MT)))/np.sqrt(cfg.d)

def dictionary(symbols,cfg=Config(),tones=None):
    if tones is None: tones=np.arange(cfg.N)
    phase=np.exp(-2j*np.pi*np.outer(tones,np.arange(cfg.Np))/(cfg.g*cfg.N))
    return (phase[:,:,None]*symbols.reshape(len(tones),1,cfg.d)).reshape(len(tones),cfg.Np*cfg.d)

def path_sum(symbols,paths,cfg=Config(),tones=None):
    if tones is None: tones=np.arange(cfg.N)
    y=np.zeros((len(tones),cfg.M),complex)
    for p in paths:
        tx=symbols[:,p.user,:]@steering(cfg.MT,p.aod)
        phase=np.exp(-2j*np.pi*np.asarray(tones)*p.q/(cfg.g*cfg.N))
        y+=p.gain*(tx*phase)[:,None]*steering(cfg.M,p.aoa)[None,:]
    return y

def truth_blocks(paths,cfg=Config()):
    x=np.zeros((cfg.Np*cfg.d,cfg.M),complex)
    for p in paths:
        if not float(p.q).is_integer(): raise ValueError('Off-grid paths have no exact grid coefficients')
        sl=slice(int(p.q)*cfg.d+p.user*cfg.MT,int(p.q)*cfg.d+(p.user+1)*cfg.MT)
        x[sl]+=p.gain*np.outer(steering(cfg.MT,p.aod),steering(cfg.M,p.aoa))
    return x

def observe(symbol_seed,noise_seed,snr_db,paths=DEFAULT_PATHS,cfg=Config()):
    s=known_symbols(symbol_seed,cfg); w=dictionary(s,cfg); clean=path_sum(s,paths,cfg)
    sigma2=float(np.mean(abs(clean)**2)/10**(snr_db/10))
    rng=np.random.default_rng(noise_seed)
    z=(rng.standard_normal(clean.shape)+1j*rng.standard_normal(clean.shape))/np.sqrt(2)
    return {'W':w,'Y':clean+np.sqrt(sigma2)*z,'Yclean':clean,'symbols':s,
            'noise_unit':z,'sigma2':sigma2}

def hermitian(a): return (a+a.conj().T)*.5

def dense_state(w,y,gamma,block_size,sigma2,weight=None):
    if sigma2<=0 or not np.isfinite(sigma2): raise ValueError('Positive finite known noise variance required')
    g=np.repeat(gamma,block_size)
    c=hermitian((w*g)@w.conj().T)+sigma2*np.eye(w.shape[0])
    chol=cho_factor(c,lower=True,check_finite=False)
    cy=cho_solve(chol,y,check_finite=False)
    logdet=float(2*np.log(np.real(np.diag(chol[0]))).sum())
    quadratic=float(np.real(np.vdot(y,cy)))
    weight=y.shape[1] if weight is None else weight
    return {'objective':weight*logdet+quadratic,'mmv_objective':y.shape[1]*logdet+quadratic,
            'chol':chol,'cy':cy,'logdet':logdet,'quadratic':quadratic,'C':c}

def posterior(w,y,gamma,block_size,sigma2,full_covariance=False):
    st=dense_state(w,y,gamma,block_size,sigma2)
    g=np.repeat(gamma,block_size); mu=g[:,None]*(w.conj().T@st['cy'])
    if not full_covariance:return mu
    cw=cho_solve(st['chol'],w,check_finite=False)
    covariance=hermitian(np.diag(g)-(g[:,None]*(w.conj().T@cw))*g[None,:])
    return mu,covariance

def block_terms(s,q):
    lam,u=np.linalg.eigh(hermitian(s)); energies=np.sum(abs(u.conj().T@q)**2,axis=1)
    return lam,energies

def block_cost(gamma,lam,energies,weight):
    den=1+gamma*lam
    return float(np.sum(weight*np.log1p(gamma*lam)-gamma*energies/den))

def block_derivative(gamma,lam,energies,weight):
    den=1+gamma*lam
    return float(np.sum(weight*lam/den-energies/den**2))

def projected_candidate(lam,energies,weight):
    return max(0.,float(np.mean(energies/(weight*lam**2)-1/lam)))

def recover_fm(w,y,block_size,sigma2,variant='mmv_fm_projected',max_actions=120,
               tolerance=1e-7,rank_rtol=1e-11,record_gamma=False):
    """Truth-free greedy marginal proposal optimization with dense evidence acceptance.
    Projected proposals are NOT exact constrained scalar optimizers.
    """
    start=time.perf_counter(); w=np.asarray(w,complex); y=np.asarray(y,complex)
    if not isinstance(max_actions,(int,np.integer)) or max_actions<0:raise ValueError('max_actions must be a nonnegative integer')
    if not np.isfinite(tolerance) or tolerance<0:raise ValueError('tolerance must be finite and nonnegative')
    if not np.isfinite(rank_rtol) or not 0<=rank_rtol<1:raise ValueError('rank_rtol must lie in [0,1)')
    if not isinstance(block_size,(int,np.integer)) or block_size<=0: raise ValueError('Positive integer block size required')
    if w.ndim!=2 or y.ndim!=2 or w.shape[0]!=y.shape[0] or w.shape[1]%block_size or not all(w.shape) or not y.shape[1]: raise ValueError('Invalid shapes')
    if not np.all(np.isfinite(w)) or not np.all(np.isfinite(y)): raise ValueError('Nonfinite input')
    if variant not in ('mmv_fm_projected','single_log_fm_projected'):raise ValueError(variant)
    r=y.shape[1] if variant=='mmv_fm_projected' else 1
    gamma=np.zeros(w.shape[1]//block_size); history=[]; warnings=set(); stop='max_actions'
    st=dense_state(w,y,gamma,block_size,sigma2,r)
    initial=st['objective']; initial_mmv=st['mmv_objective']
    for iteration in range(max_actions):
        cw=cho_solve(st['chol'],w,check_finite=False)
        allq=w.conj().T@st['cy']; best=None
        for k in range(len(gamma)):
            sl=slice(k*block_size,(k+1)*block_size); wk=w[:,sl]
            s=hermitian(wk.conj().T@cw[:,sl]); q=allq[sl]
            if gamma[k]>0:
                # Reconstruct leave-one-out quantities from full covariance.
                denom=hermitian(np.eye(block_size)-gamma[k]*s)
                try:
                    dc=cho_factor(denom,lower=True,check_finite=False)
                    s=hermitian(cho_solve(dc,s,check_finite=False));q=cho_solve(dc,q,check_finite=False)
                except np.linalg.LinAlgError:
                    warnings.add('leave_one_out_refactor_fallback')
                    gm=gamma.copy();gm[k]=0
                    lo=dense_state(w,y,gm,block_size,sigma2,r)
                    s=hermitian(wk.conj().T@cho_solve(lo['chol'],wk,check_finite=False));q=wk.conj().T@lo['cy']
            lam,energy=block_terms(s,q)
            if np.max(lam)<=0 or np.min(lam)<=rank_rtol*np.max(lam):
                warnings.add('rank_deficient_candidate_block');continue
            proposal=projected_candidate(lam,energy,r)
            delta=block_cost(proposal,lam,energy,r)-block_cost(gamma[k],lam,energy,r)
            if best is None or delta<best[0]:best=(delta,k,proposal)
        threshold=tolerance*max(1.,st['quadratic'],w.shape[0]*r)
        if best is None:stop='no_valid_candidate';break
        delta,k,proposal=best
        if delta>=-threshold:stop='no_improving_projected_candidate';break
        newgamma=gamma.copy();newgamma[k]=proposal
        candidate=dense_state(w,y,newgamma,block_size,sigma2,r)
        actual=candidate['objective']-st['objective']
        if abs(actual-delta)>2e-7*max(1.,st['quadratic'],w.shape[0]*r,abs(delta)):
            warnings.add('dense_evidence_delta_mismatch');stop='numerical_failure';break
        if actual>=-threshold:
            warnings.add('dense_evidence_uphill_or_tiny_rejected');stop='dense_candidate_rejected';break
        kind='add' if gamma[k]==0 else ('delete' if proposal==0 else 'reestimate')
        entry={'iteration':iteration+1,'kind':kind,'block':int(k),'old_gamma':float(gamma[k]),
               'new_gamma':float(proposal),'predicted_delta':delta,'dense_delta':actual,
               'objective':candidate['objective'],'mmv_objective':candidate['mmv_objective']}
        if record_gamma:entry['gamma']=newgamma.tolist()
        history.append(entry);gamma=newgamma;st=candidate
    mu=posterior(w,y,gamma,block_size,sigma2)
    return {'X':mu,'gamma':gamma,'history':history,'initial_objective':initial,
            'initial_mmv_objective':initial_mmv,'objective':st['objective'],'mmv_objective':st['mmv_objective'],
            'actions':len(history),'stop':stop,'warnings':sorted(warnings),'seconds':time.perf_counter()-start,
            'variant':variant,'max_actions':max_actions,'tolerance':tolerance}

def block_omp(w,y,block_size,sigma2,residual_factor=1.15,max_blocks=12):
    """Noise-discrepancy stopped block OMP; no support or path count is supplied."""
    start=time.perf_counter();w=np.asarray(w,complex);y=np.asarray(y,complex)
    if not isinstance(block_size,(int,np.integer)) or block_size<=0:raise ValueError('Positive integer block size required')
    if w.ndim!=2 or y.ndim!=2 or w.shape[0]!=y.shape[0] or w.shape[1]%block_size or not all(w.shape) or not y.shape[1]:raise ValueError('Invalid shapes')
    if not np.all(np.isfinite(w)) or not np.all(np.isfinite(y)):raise ValueError('Nonfinite input')
    if not np.isfinite(sigma2) or sigma2<=0:raise ValueError('Positive finite noise variance required')
    if not np.isfinite(residual_factor) or residual_factor<=0:raise ValueError('Positive finite residual factor required')
    if not isinstance(max_blocks,(int,np.integer)) or max_blocks<0:raise ValueError('max_blocks must be a nonnegative integer')
    residual=y.copy();active=[]; history=[];x=np.zeros((w.shape[1],y.shape[1]),complex)
    bases=[]
    for k in range(w.shape[1]//block_size):
        u,s,_=np.linalg.svd(w[:,k*block_size:(k+1)*block_size],full_matrices=False)
        bases.append(u[:,s>max(s,default=0)*1e-11])
    stop='max_blocks'
    for _ in range(max_blocks):
        if np.sum(abs(residual)**2)<=residual_factor*y.size*sigma2:stop='noise_discrepancy';break
        score=np.array([np.sum(abs(b.conj().T@residual)**2) for b in bases]);score[active]=-np.inf
        k=int(np.argmax(score))
        if not np.isfinite(score[k]) or score[k]<=1e-12*max(1.,np.sum(abs(y)**2)):
            stop='no_positive_remaining_block';break
        previous_energy=float(np.sum(abs(residual)**2));active.append(k)
        rows=np.concatenate([np.arange(j*block_size,(j+1)*block_size) for j in active])
        coeff=np.linalg.lstsq(w[:,rows],y,rcond=1e-11)[0];residual=y-w[:,rows]@coeff
        x[:]=0;x[rows]=coeff;history.append({'block':k,'residual_energy':float(np.sum(abs(residual)**2))})
        if previous_energy-np.sum(abs(residual)**2)<=1e-12*max(1.,previous_energy):
            stop='residual_stagnation';break
    return {'X':x,'actions':len(active),'stop':stop,'warnings':[],'seconds':time.perf_counter()-start,
            'history':history,'variant':'block_omp','residual_factor':residual_factor}

def known_support_ls(w,y,known_delays,block_size):
    start=time.perf_counter();rows=np.concatenate([np.arange(int(q)*block_size,(int(q)+1)*block_size) for q in sorted(set(known_delays))])
    x=np.zeros((w.shape[1],y.shape[1]),complex);x[rows]=np.linalg.lstsq(w[:,rows],y,rcond=1e-11)[0]
    return {'X':x,'actions':1,'stop':'privileged_known_delay_support','warnings':[],
            'seconds':time.perf_counter()-start,'variant':'privileged_delay_support_ls'}

def extract(x,cfg=Config(),relative_power=.08,absolute_power=0.):
    if cfg.MT<2 or cfg.M<2:raise ValueError('Angle extraction requires at least two elements on each array')
    blocks=x.reshape(cfg.Np,cfg.K,cfg.MT,cfg.M)
    powers=np.mean(abs(blocks)**2,axis=(2,3));threshold=max(absolute_power,relative_power*float(np.max(powers)))
    out=[]
    for q,k in np.argwhere((powers>=threshold)&(powers>0)):
        b=blocks[q,k];cr=np.sum(b[:,:-1].conj()*b[:,1:]);ct=np.sum(b[:-1,:].conj()*b[1:,:])
        valid_angles=bool(min(abs(cr),abs(ct))>1e-14*np.sum(abs(b)**2))
        sin_aoa=float(-np.angle(cr)/np.pi);sin_aod=float(-np.angle(ct)/np.pi)
        aoa=float(np.degrees(np.arcsin(np.clip(sin_aoa,-1,1))));aod=float(np.degrees(np.arcsin(np.clip(sin_aod,-1,1))))
        rank=np.linalg.svd(b,compute_uv=False);rank_res=float(np.sum(rank[1:]**2)/max(np.sum(rank**2),1e-300))
        atoms=np.outer(steering(cfg.MT,aod),steering(cfg.M,aoa));gain=np.vdot(atoms,b)/(cfg.MT*cfg.M)
        out.append({'q':int(q),'user':int(k),'delay_seconds':float(q*cfg.delay_step),
                    'total_path_length_m':float(q*cfg.delay_step*cfg.c),'power':float(powers[q,k]),
                    'aoa':aoa if valid_angles else None,'aod':aod if valid_angles else None,
                    'sin_aoa':sin_aoa if valid_angles else None,'sin_aod':sin_aod if valid_angles else None,
                    'valid_angles':valid_angles,
                    'gain_real':float(gain.real) if valid_angles else None,'gain_imag':float(gain.imag) if valid_angles else None,
                    'adjacent_rx_power':float(abs(cr)/(cfg.MT*(cfg.M-1))),
                    'rank_residual':rank_res})
    return out

def dictionary_diagnostics(w,known_delays=None,block_size=4):
    sv=np.linalg.svd(w,compute_uv=False);wn=w/np.maximum(np.linalg.norm(w,axis=0),1e-300)
    gram=abs(wn.conj().T@wn);np.fill_diagonal(gram,0)
    out={'shape':list(w.shape),'rank':int(np.sum(sv>sv[0]*1e-11)),
         'row_condition':float(sv[0]/sv[-1]),'column_coherence':float(np.max(gram)),
         'globally_unique_dense_inverse':False}
    if known_delays is not None:
        ids=np.concatenate([np.arange(int(q)*block_size,(int(q)+1)*block_size) for q in sorted(set(known_delays))])
        s=np.linalg.svd(w[:,ids],compute_uv=False)
        out.update({'true_support_columns':len(ids),'true_support_rank':int(np.sum(s>s[0]*1e-11)),
                    'true_support_condition':float(s[0]/s[-1])})
    return out
