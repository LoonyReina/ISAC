"""Phase-I exact feasible-set diagnostic for unresolved SDR cases.
Maximize a common SINR-inequality margin at the requested threshold.
A negative optimum establishes the requested SDR is infeasible within numerical certification accuracy.
"""
from refinement import *
ROOT=Path(__file__).parent


def conservative_certificate(out):
    H=matrix_from_json(out['H']);gamma=10**(out['gamma_db']/10);a=(1+gamma)/gamma
    ds=[matrix_from_json(x) for x in out['duals']];eta=ds[1].real;ls=np.array([float(ds[5+j].real) for j in range(len(H))])
    scale=sum(ls); zs=[herm(ds[i])/scale for i in [0,2,3,4]]
    shifts=[]
    for i,z in enumerate(zs):
        delta=max(0.,1e-11-float(np.linalg.eigvalsh(z).min()));shifts.append(delta);zs[i]=z+delta*np.eye(10)
    et=eta/scale;lam=ls/scale
    ER=np.diag(et)-zs[0]-zs[1];EK=[]
    for j in range(len(H)):
        hh=np.outer(H[j].conj(),H[j]);ER+=lam[j]*hh;EK.append(zs[1]-zs[2+j]-a*lam[j]*hh)
    norms=[float(np.max(np.abs(np.linalg.eigvalsh(herm(e))))) for e in [ER]+EK]
    c=float(-.1*sum(et)+.01*sum(lam));conservative=c-sum(norms)
    return {'method':'Normalize sum(lambda)=1, make dual PSD with recorded diagonal shifts, subtract Pt times spectral norms of residual stationarity matrices; each primal R and Rk is PSD with trace<=Pt. This certificate is specifically M10 K2 Pt1 noise.01.','dual_psd_diagonal_shifts':shifts,'dual_constant':c,'stationarity_operator_norms':norms,'residual_corrected_lower_bound_on_negative_margin':conservative,'implies_infeasible':bool(conservative>1e-6),'dual_psd_multipliers':[matrix_json(z) for z in zs],'power_equality_multiplier':et.tolist(),'sinr_multipliers':lam.tolist()}

def phase_one(trial=6,gd=24):
 model=RadarModel();H=rng_channel(2026101201+trial);s=RealConeSolver(model,'sdr',H)
 gamma=10**(gd/10);s.a.value=(1+gamma)/gamma;s.b.value=1.;s.g.value=gamma
 margin=cp.Variable(name='common_scaled_sinr_margin')
 core=list(s.problem.constraints[:-len(H)])
 for j,Rk in enumerate(s.Rks):
  h=H[j].conj();core.append(s.a*cp.real(H[j]@Rk@h)-s.b*cp.real(H[j]@s.R@h)>=s.b*model.cfg.noise+margin)
 p=cp.Problem(cp.Maximize(margin),core);start=time.perf_counter()
 val=p.solve(solver='CLARABEL',tol_gap_abs=1e-10,tol_gap_rel=1e-10,tol_feas=1e-10,max_iter=300)
 ds=[PSDDual(c,10).dual_value if i in (0,2,3,4) else c.dual_value for i,c in enumerate(core)]
 eta=ds[1];gR=np.diag(eta)-ds[0]-ds[2];grks=[];ls=[]
 for j in range(len(H)):
  lam=float(ds[5+j]);ls.append(lam);hh=np.outer(H[j].conj(),H[j]);gR+=lam*hh;grks.append(float(np.linalg.norm(ds[2]-ds[3+j]-s.a.value*lam*hh)))
 dual_constant=float(-model.cfg.total_power/model.cfg.antennas*sum(eta)+model.cfg.noise*sum(ls))
 out=dict(purpose='phase-I common normalized SINR margin, exact SDR feasible set',trial=trial,gamma_db=gd,H=matrix_json(H),status=p.status,maximum_margin=float(val),dual_bound_on_negative_margin=dual_constant,duality_gap=float(-val-dual_constant),elapsed_seconds=time.perf_counter()-start,iterations=p.solver_stats.num_iters,R=matrix_json(s.R.value),Rks=[matrix_json(r.value) for r in s.Rks],duals=[matrix_json(d) for d in ds],primal_max_violation=float(max(np.max(c.violation()) for c in core)),covariance_stationarity=float(np.linalg.norm(gR)),communication_stationarity=grks,margin_stationarity=abs(sum(ls)-1),dual_min_eigenvalue=min(float(np.linalg.eigvalsh(herm(ds[i])).min()) for i in [0,2,3,4]),dual_min_inequality=min(ls),settings=dict(tol_gap_abs=1e-10,tol_gap_rel=1e-10,tol_feas=1e-10,max_iter=300))
 out['negative_margin_certified']=bool(out['status'] in ('optimal','optimal_inaccurate') and out['maximum_margin']<-1e-6 and out['dual_bound_on_negative_margin']>1e-6 and abs(out['duality_gap'])<1e-7 and max(out['covariance_stationarity'],*out['communication_stationarity'],out['margin_stationarity'],out['primal_max_violation'])<1e-7 and out['dual_min_eigenvalue']>-1e-8 and out['dual_min_inequality']>=0)
 out['conservative_certificate']=conservative_certificate(out)
 save_json(ROOT/f'results/phase-one-trial-{trial:03d}-gamma-{gd}.json',out)
 print(json.dumps({k:v for k,v in out.items() if k not in ['H','R','Rks','duals']},indent=2),flush=True)
 return out
if __name__=='__main__':phase_one()
