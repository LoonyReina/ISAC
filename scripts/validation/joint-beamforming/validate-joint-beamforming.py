import json,numpy as np
from pathlib import Path
import argparse, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description="Independent NumPy verification of executed beamforming JavaScript, not an SDR/ZF reproduction")
parser.add_argument('--check',action='store_true',help='Check existing checked-in report without rewriting it')
args=parser.parse_args()
node_source="""const c=require('./joint-beamforming-core.js');
const etas=[0,1e-30,1e-20,1e-12,.001,.1,.25,.5,.73,.8,.9688685286041494,.99,1-1e-12,1];
console.log(JSON.stringify(etas.map(eta=>c.compute(eta,.01,12)),(_,v)=>v===-Infinity?'−Infinity':v));"""
actual=json.loads(subprocess.check_output(['node','-e',node_source],cwd=ROOT,text=True))
def complex_json(a):
    a=np.asarray(a)
    return {'real':a.real.tolist(), 'imag':a.imag.tolist()}

def metrics(Wc, Wr, H, A, sigma2):
    R=Wc@Wc.conj().T+Wr@Wr.conj().T
    Gc=H@Wc; Gr=H@Wr
    desired=np.abs(np.diag(Gc))**2
    inter=np.sum(abs(Gc)**2,axis=1)-desired
    radar=np.sum(abs(Gr)**2,axis=1)
    C=A.conj().T@R@A
    powers=np.real(np.diag(C))
    rho=C/np.sqrt(powers[:,None]*powers[None,:])
    return {'Wc':complex_json(Wc),'Wr':complex_json(Wr),'R':complex_json(R),'eigenvalues':np.linalg.eigvalsh(R).tolist(),'rank':int(np.linalg.matrix_rank(R,tol=1e-10)),'trace':float(np.trace(R).real),'per_antenna':np.diag(R).real.tolist(),'target_gram_E_yp_yq_star':complex_json(C),'paper_cross_correlation_E_yp_star_yq':complex_json(C.T),'target_power':powers.tolist(),'normalized_target_gram':complex_json(rho),'H_Wc':complex_json(Gc),'H_Wr':complex_json(Gr),'desired_power':desired.tolist(),'communication_interference':inter.tolist(),'radar_interference':radar.tolist(),'noise_power':np.broadcast_to(sigma2,desired.shape).tolist(),'sinr':(desired/(inter+radar+sigma2)).tolist()}


def cx(a):
 a=np.asarray(a);return a[...,0]+1j*a[...,1]
def reim(o): return np.array(o['real'])+1j*np.array(o['imag'])
bm=np.array([1,-1j,-1,1j,1,-1j,-1,1j])/np.sqrt(8);bp=bm.conj();b0=np.ones(8)/np.sqrt(8);At=np.sqrt(8)*np.column_stack([bm,b0,bp])
errors={};checked=[]
def check(name,a,b,tol=1e-10):
 err=float(np.max(abs(np.asarray(a)-np.asarray(b))));errors[name]=max(errors.get(name,0),err)
 assert err<tol,(name,err)
for run in actual:
 eta=run['eta'];a=np.sqrt(eta);b=np.sqrt(1-eta);h=a*bm-1j*b*bp;q=a*bp-1j*b*bm;H=np.vstack([h.conj(),b0])
 cases={'A':(np.column_stack([bm-1j*bp,b0])/np.sqrt(3),np.zeros((8,1),complex)),'B':(np.column_stack([bm,b0])/np.sqrt(3),bp[:,None]/np.sqrt(3)),'C':(np.column_stack([h,b0])/np.sqrt(3),q[:,None]/np.sqrt(3))}
 check('H',cx(run['H']),H)
 for recipe in run['recipes']:
  k=recipe['id'];wc,wr=cases[k];ref=metrics(wc,wr,H,At,.01);R=wc@wc.conj().T+wr@wr.conj().T
  for key,reference in [('Wc',wc),('Wr',wr),('R',R),('Fc',H@wc),('Fr',H@wr),('corr',At.conj().T@R@At)]:check(key,cx(recipe[key]),reference)
  check('eigenvalues',recipe['eigen'],np.linalg.eigvalsh(R)[::-1]);assert recipe['rank']==ref['rank']
  check('diagonal',recipe['diagonal'],np.diag(R).real);check('trace',recipe['trace'],np.trace(R).real)
  check('normalized_correlation',recipe['correlation'],abs(reim(ref['normalized_target_gram'])))
  angles=np.array(recipe['angles']);V=np.exp(1j*np.pi*np.arange(8)[:,None]*np.sin(np.deg2rad(angles)));pattern=np.einsum('ij,ij->j',V.conj(),R@V).real
  check('pattern_1801',recipe['pattern'],pattern)
  for j,u in enumerate(recipe['users']):
   for key,rkey in [('desired','desired_power'),('interuser','communication_interference'),('radar','radar_interference'),('noise','noise_power'),('sinr','sinr')]:check(key,u[key],ref[rkey][j])
   if eta==0 and k=='B' and j==0: assert u['sinr']==0 and u['db']=='−Infinity'
   else:
    assert np.isfinite(u['db']);check('db',u['db'],10*np.log10(u['sinr']))
  if k=='B' and eta>0: # relative precision, not only loose absolute tolerances, for very small positive eta
   exact=eta/(1-eta+.03); observed=recipe['users'][0]['sinr'];assert observed>0
   assert abs(observed/exact-1)<1e-12,(eta,observed,exact)
  checked.append({'eta':eta,'recipe':k,'sinr':[u['sinr'] for u in recipe['users']]})
report={'passed':True,'actual_module':'joint-beamforming-core.js','cases_checked':len(checked),'angle_samples_per_recipe':1801,'max_errors':errors,'endpoint_zero_and_small_positive_relative_precision_pass':True,'selected_results':checked}

report['source']='https://arxiv.org/abs/1912.03420v2'
report['scope']='Independent analytic construction and implementation validation; no optimized SDR/ZF reproduction'
report['numpy_version']=np.__version__
report['steering']='a_m(theta)=exp(i*pi*m*sin(theta)); m=0,...,7; unnormalized norm sqrt8'
report['cross_correlation']='corr[p][q]=E[y_p y_q*]; paper Pc(p,q)=corr[q][p]'
report['covariance']='Ensemble E[xx^H] for uncorrelated unit-power source streams; not an exact finite random-block covariance'
target=ROOT/'data/joint-beamforming-validation.json'
if args.check:
    saved=json.loads(target.read_text())
    assert saved['passed'] is True and saved['cases_checked']==report['cases_checked']
    assert saved['source']==report['source']
    assert saved['endpoint_zero_and_small_positive_relative_precision_pass'] is True
    for a,b in zip(saved['selected_results'],report['selected_results'],strict=True):
        assert a['eta']==b['eta'] and a['recipe']==b['recipe']
        assert np.allclose(a['sinr'],b['sinr'],rtol=1e-12,atol=0)
    assert max(saved['max_errors'].values())<1e-10
    print('PASS: existing validation report matches freshly executed JavaScript and independent NumPy results')
else:
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(report,indent=2)+'\n')
    print('Wrote',target.relative_to(ROOT))
print(json.dumps({k:v for k,v in report.items() if k!='selected_results'},indent=2))
