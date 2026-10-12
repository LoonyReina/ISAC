"""Deterministic algebra, recovery, boundary and infeasibility tests."""
from reference import *
from experiment import accepted
ROOT=Path(__file__).parent
checks=[]
def check(name,passed,**details):
    checks.append(dict(name=name,passed=bool(passed),**details));print(name,bool(passed),flush=True)

m=RadarModel();rng=np.random.default_rng(501);B=rng.normal(size=(10,10))+1j*rng.normal(size=(10,10));R=B@B.conj().T;R/=np.trace(R).real
x=m.coordinates(R);a=2.4
pattern=np.array([np.vdot(v,R@v).real for v in m.steering]);direct=np.mean((a*m.desired-pattern)**2)+sum(abs(np.vdot(m.targets[q],R@m.targets[p]))**2 for p in range(3) for q in range(p+1,3))/3
compressed=np.linalg.norm(m.QR@np.r_[x,a])**2
check('direct full-grid objective equals QR-compressed objective',abs(direct-compressed)<1e-11,error=abs(direct-compressed))
check('Hermitian basis reconstruction',np.linalg.norm(np.einsum('b,bij->ij',x,m.basis)-R)<1e-12)
check('inclusive desired-beam endpoints and count',m.desired.sum()==303 and len(m.angles)==1801,count=int(m.desired.sum()))
H=rng_channel(400);cols=[];rks=[]
for k in range(2):
 V=(rng.normal(size=(10,3))+1j*rng.normal(size=(10,3)))/20;rks.append(V@V.conj().T)
R=sum(rks)+.03*np.eye(10);Wc,Wr,info=recover_sdr(R,rks,H,1)
check('Eq33 rank-one recovery and unchanged covariance',np.linalg.norm(Wc@Wc.conj().T+Wr@Wr.conj().T-R)<1e-12 and min(info['rank_reduction_remainder_min_eigenvalues'])>-1e-12)
check('Eq33 preserved each desired power',max(abs(abs(H[k]@Wc[:,k])**2-np.real(H[k]@rks[k]@H[k].conj())) for k in range(2))<1e-12)
# Construct a non-diagonal H with known ZF feasibility and rank-deficient R.
U=np.linalg.qr((rng.normal(size=(10,10))+1j*rng.normal(size=(10,10))))[0]
R=U@np.diag([.2,.3,.5,0,0,0,0,0,0,0])@U.conj().T
H=np.diag([2.,3.])@U[:,:2].conj().T
Wc,Wr,info=recover_zf(R,H);F=H@Wc
check('row QR handles singular covariance',np.linalg.norm(Wc@Wc.conj().T+Wr@Wr.conj().T-R)<1e-12 and np.linalg.norm(H@Wr)<1e-7 and np.linalg.norm(F-np.diag(np.sqrt([.8,2.7])))<1e-12)
try: factor_psd(np.diag([1.,-.001]));check('material PSD failure is rejected',False)
except ValueError: check('material PSD failure is rejected',True)
solver_results={}
for label,kind,channel,linear_gamma in [
 ('radar','radar',None,0),('sdr_zero','sdr',rng_channel(2026101201),0),('zf_zero','zf',rng_channel(2026101201),0),
 ('zero_H_positive_Gamma_sdr','sdr',np.zeros((2,10),complex),1),('zero_H_positive_Gamma_zf','zf',np.zeros((2,10),complex),1),
 ('identical_users_sdr','sdr',np.ones((2,10),complex),2),('identical_users_zf','zf',np.ones((2,10),complex),2),
 ('above_total_power_bound_sdr','sdr',rng_channel(2026101201),1e5),('above_total_power_bound_zf','zf',rng_channel(2026101201),1e5)]:
 result=Solver(m,kind,channel).solve(solver='SCS',linear_gamma=linear_gamma);solver_results[label]=result
 if 'positive_Gamma' in label or 'identical_users' in label or 'above_total' in label:
  check(label+' remains infeasible',result['status']=='infeasible',status=result['status'],certificate_residual=result.get('solver_info',{}).get('res_infeas'))
obj0=solver_results['radar']['metrics']['objective'];obj1=solver_results['sdr_zero']['metrics']['objective'];obj2=solver_results['zf_zero']['metrics']['objective']
check('Gamma=0 SDR reaches radar-only optimum',abs(obj0-obj1)<1e-6,objective_difference=obj1-obj0)
check('Gamma=0 ZF retains correlation constraint loss',obj2>obj0+1e-5,objective_difference=obj2-obj0)
# Deterministic conservative upper bound: desired <= Pt*||h||^2 and denominator >= noise.
check('high-Gamma fixtures violate necessary power bound',1e5>max(np.sum(abs(rng_channel(2026101201))**2,axis=1))/.01)
save_json(ROOT/'results/boundary-tests.json',dict(checks=checks,all_passed=all(x['passed'] for x in checks),solver_results=solver_results))
if not all(x['passed'] for x in checks): raise SystemExit(1)
