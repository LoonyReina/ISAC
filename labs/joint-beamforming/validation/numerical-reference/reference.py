"""Source-faithful covariance QSDPs for arXiv:1912.03420v2.
No author data/code is used. Every output is recomputed from its H and Gamma.
"""
from __future__ import annotations
import dataclasses, hashlib, json, time, warnings
from pathlib import Path
import cvxpy as cp
import numpy as np
from scipy.linalg import qr

@dataclasses.dataclass(frozen=True)
class Config:
    antennas: int = 10
    total_power: float = 1.0
    noise: float = .01
    target_degrees: tuple = (-40., 0., 40.)
    beam_width_degrees: float = 10.
    grid_step_degrees: float = .1
    cross_weight: float = 1.


def herm(a): return (a + a.conj().T)/2

def matrix_json(a):
    a=np.asarray(a)
    return {"real":a.real.tolist(), "imag":a.imag.tolist()}

def matrix_from_json(a): return np.asarray(a['real'])+1j*np.asarray(a['imag'])

def fingerprint(a):
    return hashlib.sha256(np.ascontiguousarray(a,dtype='<c16').tobytes()).hexdigest()

def basis_matrices(m):
    bs=[]
    for i in range(m):
        a=np.zeros((m,m),complex); a[i,i]=1; bs.append(a)
    for i in range(m):
        for j in range(i+1,m):
            a=np.zeros((m,m),complex); a[i,j]=a[j,i]=1/np.sqrt(2); bs.append(a)
    for i in range(m):
        for j in range(i+1,m):
            a=np.zeros((m,m),complex); a[i,j]=1j/np.sqrt(2); a[j,i]=-1j/np.sqrt(2); bs.append(a)
    return np.array(bs)

class RadarModel:
    def __init__(self,cfg=Config()):
        self.cfg=cfg; m=cfg.antennas
        if m<2 or cfg.total_power<=0 or cfg.noise<=0 or cfg.grid_step_degrees<=0 or cfg.beam_width_degrees<=0 or cfg.cross_weight<0: raise ValueError('Invalid physical/model parameters')
        if len(cfg.target_degrees)<2: raise ValueError('At least two target directions required')
        self.angles=np.arange(round(180/cfg.grid_step_degrees)+1)*cfg.grid_step_degrees-90
        self.steering=np.exp(1j*np.pi*np.arange(m)[None,:]*np.sin(np.deg2rad(self.angles))[:,None])
        self.targets=np.exp(1j*np.pi*np.arange(m)[None,:]*np.sin(np.deg2rad(cfg.target_degrees))[:,None])
        self.desired=(np.min(np.abs(self.angles[:,None]-np.asarray(cfg.target_degrees)[None,:]),axis=1)<=cfg.beam_width_degrees/2+1e-12).astype(float)
        self.basis=basis_matrices(m)
        self.A=np.einsum('li,bij,lj->lb',self.steering.conj(),self.basis,self.steering).real
        self.C=np.array([np.einsum('i,bij,j->b',self.targets[q].conj(),self.basis,self.targets[p]) for p in range(len(self.targets)) for q in range(p+1,len(self.targets))])
        pat=np.column_stack((self.A,-self.desired))/np.sqrt(len(self.angles))
        cross=np.vstack((self.C.real,self.C.imag))*np.sqrt(cfg.cross_weight/len(self.C))
        D=np.vstack((pat,np.column_stack((cross,np.zeros(len(cross))))))
        # Exact thin QR compresses 1807 residual rows into 101; no eigenvalue truncation.
        self.QR=qr(D,mode='economic',check_finite=False)[1]
        self.D=D

    def coordinates(self,R): return np.einsum('bij,ji->b',self.basis,R).real
    def cvx_coordinates(self,R):
        m=self.cfg.antennas
        return cp.hstack([cp.real(R[i,i]) for i in range(m)]+[np.sqrt(2)*cp.real(R[i,j]) for i in range(m) for j in range(i+1,m)]+[np.sqrt(2)*cp.imag(R[i,j]) for i in range(m) for j in range(i+1,m)])
    def objective(self,R,alpha): return cp.sum_squares(self.QR@cp.hstack((self.cvx_coordinates(R),alpha)))
    def metrics(self,R,alpha=None,R0=None):
        p=np.einsum('li,ij,lj->l',self.steering.conj(),R,self.steering).real
        if alpha is None: alpha=float(self.desired@p/(self.desired@self.desired))
        corr=self.targets.conj()@R@self.targets.T
        l1=float(np.mean((alpha*self.desired-p)**2))
        pairs=[abs(corr[q,p])**2 for p in range(len(corr)) for q in range(p+1,len(corr))]
        l2=float(np.mean(pairs))
        out={'alpha':float(alpha),'pattern_loss':l1,'cross_loss':l2,'objective':l1+self.cfg.cross_weight*l2,'pattern':p.tolist(),'target_gram':matrix_json(corr),'eigenvalues':np.linalg.eigvalsh(herm(R)).tolist(),'rank_at_1e-7':int(np.sum(np.linalg.eigvalsh(herm(R))>1e-7))}
        if R0 is not None:
            p0=np.einsum('li,ij,lj->l',self.steering.conj(),R0,self.steering).real
            out['eq46_mse']=float(np.mean((p-p0)**2))
        return out


def factor_psd(a,tolerance=2e-6):
    ev,vec=np.linalg.eigh(herm(a))
    if ev.min() < -tolerance: raise ValueError(f'Covariance is not PSD within recovery tolerance: {ev.min()}')
    b=vec*np.sqrt(np.maximum(ev,0))[None,:]
    return b,{'min_eigenvalue_before_clip':float(ev.min()),'negative_eigenvalue_mass_clipped':float(-np.minimum(ev,0).sum()),'factor_residual_fro':float(np.linalg.norm(b@b.conj().T-a))}


def recover_sdr(R,Rks,H,gamma=None):
    cols=[]; removed=[]
    for k,Rk in enumerate(Rks):
        h=H[k].conj(); power=float(np.real(H[k]@Rk@h))
        if power <= 1e-14:
            if gamma == 0: w=np.zeros(R.shape[0],complex)
            else: raise ValueError('Rank-one recovery has zero desired power')
        else: w=Rk@h/np.sqrt(power)
        cols.append(w)
        removed.append(float(np.linalg.eigvalsh(herm(Rk-np.outer(w,w.conj()))).min()))
    Wc=np.column_stack(cols)
    Wr,info=factor_psd(R-Wc@Wc.conj().T)
    info['rank_reduction_remainder_min_eigenvalues']=removed
    info['recovered_communication_ranks']=[int(np.linalg.matrix_rank(np.outer(w,w.conj()),tol=1e-9)) for w in cols]
    return Wc,Wr,info


def recover_zf(R,H):
    # Paper allows any covariance square root, important for singular optima.
    L,info=factor_psd(R)
    # A^H=Q U => A=U^H Q^H, the paper's row QR.
    Q,U=np.linalg.qr((H@L).conj().T,mode='complete')
    k=H.shape[0]
    phases=np.ones(Q.shape[1],complex)
    for j in range(k):
        z=U[j,j]
        if abs(z)>0: phases[j]=z/abs(z)
    Q=Q*phases[None,:]
    B=L@Q
    W=np.column_stack((B,np.zeros((R.shape[0],k),complex)))
    info['row_qr_lower']=matrix_json(H@B[:,:k])
    info['qr_unitarity_fro']=float(np.linalg.norm(Q.conj().T@Q-np.eye(len(Q))))
    return W[:,:k],W[:,k:],info


def validate_factors(R,Wc,Wr,H,cfg,gamma):
    Fc=H@Wc; Fr=H@Wr
    desired=np.abs(np.diag(Fc))**2
    inter=np.sum(np.abs(Fc)**2,axis=1)-desired
    radar=np.sum(np.abs(Fr)**2,axis=1)
    sinr=desired/(inter+radar+cfg.noise)
    Rw=Wc@Wc.conj().T+Wr@Wr.conj().T
    return {'desired_power':desired.tolist(),'interuser_power':inter.tolist(),'radar_power':radar.tolist(),'sinr_linear':sinr.tolist(),'sinr_db':(10*np.log10(sinr)).tolist(),'min_sinr_db':float(10*np.log10(sinr.min())),'sinr_margin_linear':float(sinr.min()-gamma),'sum_rate_bits_per_use':float(np.log2(1+sinr).sum()),'radar_interference_to_noise_mean':float(np.mean(radar/cfg.noise)),'factor_covariance_fro':float(np.linalg.norm(Rw-R)),'factor_diagonal_max_error':float(np.max(np.abs(np.diag(Rw)-cfg.total_power/cfg.antennas))),'factor_total_power':float(np.trace(Rw).real),'Fc':matrix_json(Fc),'Fr':matrix_json(Fr)}

class Solver:
    def __init__(self,model,kind,H=None):
        self.model=model; self.kind=kind; self.H=H
        m=model.cfg.antennas; cfg=model.cfg
        if kind not in ('radar','sdr','zf'): raise ValueError(kind)
        if H is not None and (H.shape[1]!=m or H.shape[0]>=m or not np.isfinite(H).all()): raise ValueError('H shape or entries invalid')
        self.R=cp.Variable((m,m),hermitian=True,name='R'); self.alpha=cp.Variable(name='alpha')
        cons=[self.R >> 0,cp.real(cp.diag(self.R))==cfg.total_power/m]
        self.Rks=[]; self.p=None; self.sinr_cons=[]
        self.g=cp.Parameter(nonneg=True,value=1,name='gamma')
        # Equivalent nondividing SINR condition (1+Gamma)s >= Gamma(t+noise).
        self.a=cp.Parameter(nonneg=True,value=2); self.b=cp.Parameter(nonneg=True,value=1)
        if kind=='sdr':
            k=H.shape[0]; self.Rks=[cp.Variable((m,m),hermitian=True,name=f'R{j}') for j in range(k)]
            cons += [self.R-sum(self.Rks) >> 0]+[r >> 0 for r in self.Rks]
            for j,r in enumerate(self.Rks):
                h=H[j].conj(); s=cp.real(H[j]@r@h); t=cp.real(H[j]@self.R@h)
                c=self.a*s-self.b*t >= self.b*cfg.noise
                self.sinr_cons.append(c); cons.append(c)
        elif kind=='zf':
            self.p=cp.Variable(H.shape[0],name='p')
            cons += [H@self.R@H.conj().T==cp.diag(self.p),self.p>=self.g*cfg.noise]
        self.constraints=cons
        self.problem=cp.Problem(cp.Minimize(model.objective(self.R,self.alpha)),cons)

    def solve(self,gamma_db=12,solver='CLARABEL',R0=None,linear_gamma=None,solver_settings=None):
        gamma=10**(gamma_db/10) if linear_gamma is None else float(linear_gamma)
        if not np.isfinite(gamma) or gamma<0: raise ValueError('Gamma must be finite and nonnegative')
        self.g.value=gamma; self.a.value=(1+gamma)/max(1,gamma); self.b.value=gamma/max(1,gamma)
        settings={'CLARABEL':dict(tol_gap_abs=1e-9,tol_gap_rel=1e-9,tol_feas=1e-9,max_iter=250),'SCS':dict(eps=2e-7,max_iters=100000,acceleration_lookback=10)}[solver]
        if solver_settings is not None: settings.update(solver_settings)
        t0=time.perf_counter()
        result={'kind':self.kind,'gamma_db':float(gamma_db) if linear_gamma is None else None,'gamma_linear':gamma,'solver':solver,'settings':settings,'warm_start':False}
        try:
            with warnings.catch_warnings(record=True) as caught:
                warnings.simplefilter('always'); value=self.problem.solve(solver=solver,warm_start=False,**settings)
            result['warnings']=[str(w.message) for w in caught]
        except Exception as e:
            result.update(status='solver_error',error=str(e),elapsed_seconds=time.perf_counter()-t0); return result
        stats=self.problem.solver_stats
        result.update(status=self.problem.status,elapsed_seconds=time.perf_counter()-t0,solve_seconds=stats.solve_time,iterations=stats.num_iters)
        if stats.extra_stats and isinstance(stats.extra_stats,dict) and 'info' in stats.extra_stats:
            result['solver_info']={key:(float(v) if np.isfinite(v) else None) if isinstance(v,(int,float,np.number)) else v for key,v in stats.extra_stats['info'].items()}
        if self.problem.status not in ('optimal','optimal_inaccurate'):
            result['solution_available']=False; return result
        R=herm(np.asarray(self.R.value)); alpha=float(self.alpha.value)
        result.update(solution_available=True,solver_objective=float(value),R=matrix_json(R),metrics=self.model.metrics(R,alpha,R0))
        res={'diagonal_max_error':float(np.max(np.abs(np.diag(R)-self.model.cfg.total_power/len(R)))),'minimum_eigenvalue':float(np.linalg.eigvalsh(R).min()),'objective_recompute_abs':abs(float(value)-result['metrics']['objective']),'constraint_max_violation':float(max(np.max(c.violation()) for c in self.constraints))}
        result['residuals']=res
        result['dual_values']=[matrix_json(c.dual_value) for c in self.constraints]
        if self.kind=='sdr': result['Rks_for_kkt']=[matrix_json(r.value) for r in self.Rks]
        result['kkt']=kkt_diagnostics(self.model,result,self.H)
        result.pop('Rks_for_kkt',None)
        try:
            if self.kind=='sdr':
                Rks=[herm(np.asarray(r.value)) for r in self.Rks]
                result['Rks']=[matrix_json(r) for r in Rks]
                res['communication_min_eigenvalues']=[float(np.linalg.eigvalsh(r).min()) for r in Rks]
                res['radar_covariance_min_eigenvalue']=float(np.linalg.eigvalsh(herm(R-sum(Rks))).min())
                Wc,Wr,info=recover_sdr(R,Rks,self.H,gamma)
            elif self.kind=='zf':
                result['p']=self.p.value.tolist()
                res['zf_covariance_offdiagonal_max']=float(np.max(np.abs(self.H@R@self.H.conj().T-np.diag(self.p.value))))
                Wc,Wr,info=recover_zf(R,self.H)
            else:
                Wr,info=factor_psd(R); Wc=np.zeros((len(R),0),complex)
            result.update(Wc=matrix_json(Wc),Wr=matrix_json(Wr),recovery=info)
            if self.kind!='radar':
                result['factor_metrics']=validate_factors(R,Wc,Wr,self.H,self.model.cfg,gamma)
                Rw=Wc@Wc.conj().T+Wr@Wr.conj().T
                result['recovered_objective']=self.model.metrics(Rw)['objective']
            result['recovery_status']='recovered'
        except Exception as e:
            result.update(recovery_status='failed',recovery_error=str(e))
        return result


def rng_channel(seed,k=2,m=10):
    r=np.random.Generator(np.random.PCG64(seed))
    return (r.standard_normal((k,m))+1j*r.standard_normal((k,m)))/np.sqrt(2)


def save_json(path,obj): Path(path).write_text(json.dumps(obj,indent=2,allow_nan=False)+'\n')


def kkt_diagnostics(model,result,H):
    # CVXPY 1.9 native complex PSD duals use Re tr(Z^H R), no factor two.
    R=matrix_from_json(result['R']); gamma=result['gamma_linear']; kind=result['kind']
    v=np.r_[model.coordinates(R),result['metrics']['alpha']]
    grad=2*model.QR.T@model.QR@v
    gR=np.einsum('b,bij->ij',grad[:-1],model.basis)
    d=[matrix_from_json(x) for x in result['dual_values']]
    gR+=np.diag(d[1])-d[0]
    complement=[float(np.trace(d[0].conj().T@R).real)]
    dual_eigs=[float(np.linalg.eigvalsh(herm(d[0])).min())]
    variable_grads=[]; dual_nonnegative=[]
    a=(1+gamma)/max(1,gamma); b=gamma/max(1,gamma)
    if kind=='sdr':
        # Read current solver variables via result populated before this call.
        Rks=[matrix_from_json(x) for x in result.get('Rks_for_kkt',[])]
        gR-=d[2]
        dual_eigs.append(float(np.linalg.eigvalsh(herm(d[2])).min()))
        for j in range(len(H)):
            lam=float(d[3+len(H)+j].real); hh=np.outer(H[j].conj(),H[j])
            gR+=b*lam*hh
            variable_grads.append(float(np.linalg.norm(d[2]-d[3+j]-a*lam*hh)))
            dual_eigs.append(float(np.linalg.eigvalsh(herm(d[3+j])).min()))
            dual_nonnegative.append(lam)
            if Rks:
                complement.append(float(np.trace(d[3+j].conj().T@Rks[j]).real))
                slack=a*float(np.real(H[j]@Rks[j]@H[j].conj()))-b*(float(np.real(H[j]@R@H[j].conj()))+model.cfg.noise)
                complement.append(lam*slack)
        if Rks: complement.append(float(np.trace(d[2].conj().T@(R-sum(Rks))).real))
    if kind=='zf':
        gR+=H.conj().T@d[2]@H
        variable_grads.append(float(np.linalg.norm(-np.diag(d[2]).real-d[3].real)))
        dual_nonnegative.extend(d[3].real.tolist())
        p=np.diag(H@R@H.conj().T).real
        complement.extend((d[3].real*(p-gamma*model.cfg.noise)).tolist())
    return dict(covariance_stationarity_fro=float(np.linalg.norm(gR)),alpha_stationarity_abs=float(abs(grad[-1])),other_stationarity_norms=variable_grads,dual_min_psd_eigenvalue=min(dual_eigs),dual_min_inequality_value=min(dual_nonnegative) if dual_nonnegative else None,complementarity_max_abs=max(abs(x) for x in complement),complex_psd_dual_convention='CVXPY 1.9 native complex PSD, multiplier 1')
