"""Portable production-download audit adapted from the accepted independent adapter.
Uses the exact separately authored dense oracle, never imports the JS implementation.
Available partial evidence can be valid, but the report remains incomplete.
"""
import os
for k in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','MKL_NUM_THREADS'):os.environ[k]='1'
import sys,json,time,hashlib,argparse,importlib.util
from pathlib import Path
sys.dont_write_bytecode=True
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('records',nargs='+',help='Native record JSON files, or a production download directory with MANIFEST.json')
parser.add_argument('--oracle',type=Path,default=Path(__file__).resolve().parent/'oracle/dense_oracle.py',help='Exact frozen dense_oracle.py; hash checked before loading')
args=parser.parse_args()
ORACLE_SHA='2745e67d3c2f064fea819cabe20673180713f74139c0101a2a18973a7e7cb4ac'
try:
 if not args.oracle.is_file():raise ValueError('Frozen dense_oracle.py missing; provide --oracle PATH')
 if hashlib.sha256(args.oracle.read_bytes()).hexdigest()!=ORACLE_SHA:raise ValueError('Frozen oracle hash mismatch')
 import numpy as np
 from scipy.linalg import cho_factor,cho_solve
 from scipy.optimize import linear_sum_assignment
 spec=importlib.util.spec_from_file_location('perceptive_independent_oracle',args.oracle);O=importlib.util.module_from_spec(spec);spec.loader.exec_module(O)
except Exception as error:
 print(json.dumps({'status':'failed','error':str(error),'sourceAuthenticity':'not-verified'}));sys.exit(1)
unavailable=[]
checks=actions=increases=ties=0;maxerr=0.;failures=[];case_reports=[];tie_details=[];started=time.time()
def check(ok,label):
 global checks
 checks+=1
 if not ok:failures.append(label)
def near(a,b,label,rtol=2e-7,atol=2e-9):
 ok=np.shape(a)==np.shape(b) and np.allclose(a,b,rtol=rtol,atol=atol)
 check(ok,label+(''if ok else f' (max={np.max(np.abs(np.asarray(a)-np.asarray(b)),initial=0):.8g})'))
def arr(a):return np.asarray(a['data']).reshape(a['rows'],a['cols'],2)@np.array([1,1j])
def state(w,y,g,d,sigma,r):
 f=cho_factor(O.covariance(w,g,d,sigma),lower=True);cy=cho_solve(f,y);ld=2*np.log(np.diag(f[0]).real).sum();quad=np.vdot(y,cy).real
 return f,float(r*ld+quad),float(y.shape[1]*ld+quad),float(quad)
def proposal(w,y,g,d,sigma,k,r,rtol,base):
 if g[k]:s,q=O.cavity(w,y,g,d,sigma,k)
 else:
  b=w[:,k*d:(k+1)*d];s=O.hermitian(b.conj().T@cho_solve(base,b));q=b.conj().T@cho_solve(base,y)
 lam,u=np.linalg.eigh(s)
 if lam[-1]<=0 or lam[0]<=rtol*lam[-1]:return None
 v=np.sum(abs(u.conj().T@q)**2,axis=1)
 new=max(0.,float(np.mean(v/(r*lam**2)-1/lam)))
 delta=O.block_objective(new,lam,v,r)-O.block_objective(g[k],lam,v,r)
 return new,delta

def audit_fm(case,name,v,w,y,d,sigma):
 global actions,increases,ties,maxerr
 label=f'{case}/{name}';d=v['block_size'];r=1 if name=='single_log_fm_projected'else y.shape[1];g=np.zeros(w.shape[1]//d)
 f,old,oldproper,quad=state(w,y,g,d,sigma,r)
 if v['initial_objective'] is None:
  check(v['actions']==0 and not v['history'] and v['stop'] in ['work_budget','wall_budget','cancelled'],label+' honest no-initial-evidence halt');near(arr(v['X']),np.zeros((w.shape[1],y.shape[1])),label+' unavailable X zero');return
 near(v['initial_objective'],old,label+' initial objective');near(v['initial_mmv_objective'],oldproper,label+' initial proper')
 for it,h in enumerate(v['history']):
  k=h['block'];check(h['iteration']==it+1,label+' ordered action index');near(h['old_gamma'],g[k],label+' old gamma',rtol=0,atol=0)
  props=[proposal(w,y,g,d,sigma,j,r,v['rank_rtol'],f)for j in range(len(g))];valid=[(j,p)for j,p in enumerate(props)if p is not None]
  check(bool(valid),label+' valid candidate exists')
  if props[k] is None:failures.append(label+' chosen invalid rank');break
  best=min(valid,key=lambda v:v[1][1]);new,delta=props[k];threshold=v['tolerance']*max(1,quad,w.shape[0]*r)
  near(h['new_gamma'],new,label+' independent trace projected proposal',rtol=5e-6,atol=1e-10*max(1,abs(new)))
  near(h['predicted_delta'],delta,label+' cavity marginal delta',rtol=2e-5,atol=2e-8*max(1,abs(delta)))
  tie_tol=5e-9*max(1,abs(delta),abs(best[1][1]))
  check(delta<=best[1][1]+tie_tol,label+' best projected candidate at this trace state')
  if best[0]!=k and abs(delta-best[1][1])<=tie_tol:
   ties+=1;tie_details.append(dict(case=case,method=name,iteration=it+1,chosen=k,oracle_minimum=best[0],chosen_delta=delta,minimum_delta=best[1][1],trace_local_tolerance=tie_tol))
  check(delta< -threshold+1e-9*max(1,abs(delta)),label+' marginal threshold passed')
  kind='add'if g[k]==0 else'delete'if h['new_gamma']==0 else'reestimate';check(h['kind']==kind,label+' kind')
  g[k]=h['new_gamma'];f,value,proper,quad_new=state(w,y,g,d,sigma,r);maxerr=max(maxerr,abs(value-h['objective']))
  near(value,h['objective'],label+' dense accepted objective',rtol=1e-9,atol=3e-7);near(proper,h['mmv_objective'],label+' dense accepted proper objective',rtol=1e-9,atol=3e-7);near(value-old,h['dense_delta'],label+' dense delta',rtol=3e-5,atol=3e-7)
  check(value<old,label+' strict declared descent');check(value-old< -threshold+1e-8*max(1,abs(value-old)),label+' dense threshold passed')
  if proper>oldproper+1e-8:increases+=1;check(name=='single_log_fm_projected',label+' proper increase only diagnostic')
  old,oldproper,quad=value,proper,quad_new;actions+=1
 check(v['actions']==len(v['history']),label+' count');near(g,v['gamma'],label+' final gamma');near(old,v['objective'],label+' final objective');near(oldproper,v['mmv_objective'],label+' final proper')
 mu,cov=O.posterior_measurement(w,y,g,d,sigma);near(mu,arr(v['X']),label+' dense mean',rtol=3e-6,atol=1e-8)
 if v.get('posterior_covariance_status')=='complete':
  check(len(v['posterior_covariance_blocks'])==len(g),label+' covariance count')
  for k,b in enumerate(v['posterior_covariance_blocks']):near(arr(b),cov[k*d:(k+1)*d,k*d:(k+1)*d],label+f' covariance {k}',rtol=1e-5,atol=1e-9*max(1,np.max(abs(cov))))
 if v['stop'] in ('no_improving_projected_candidate','no_valid_candidate'):
  ps=[proposal(w,y,g,d,sigma,j,r,v['rank_rtol'],f)for j in range(len(g))];ps=[p for p in ps if p is not None]
  if v['stop']=='no_valid_candidate':check(not ps,label+' no rank-valid proposals')
  else:check(bool(ps) and min(p[1]for p in ps)>=-v['tolerance']*max(1,quad,w.shape[0]*r)-2e-8,label+' true no improving projected proposal')
 if v['stop']=='max_actions':check(v['actions']==v['max_actions'],label+' cap exact')

def audit_baseline(case,name,v,w,y,d,sigma):
 label=f'{case}/{name}';x=arr(v['X'])
 if name=='privileged_delay_support_ls':
  check(v['privileged_information']['user_or_angle_information']is False,label+' privilege limited');delays=sorted(set(v['privileged_information']['known_delay_indices']));ids=[q*d+j for q in delays for j in range(d)]
  if v['stop']=='numerical_failure':check(len(ids)>w.shape[0] or np.linalg.matrix_rank(w[:,ids],tol=1e-11*np.linalg.norm(w[:,ids],2))<len(ids),label+' explicit unsupported rank failure');return
  expected=np.zeros_like(x)
  if ids:expected[ids]=np.linalg.lstsq(w[:,ids],y,rcond=None)[0]
  near(x,expected,label+' independent same-Y least squares',rtol=3e-6,atol=2e-8);return
 bases=[]
 for k in range(w.shape[1]//d):
  b=w[:,k*d:(k+1)*d]
  if b.shape[1]>b.shape[0] or np.linalg.matrix_rank(b,tol=1e-11*np.linalg.norm(b,2))<d:bases.append(None)
  else:bases.append(np.linalg.qr(b,mode='reduced')[0])
 active=[];res=y.copy();expected=np.zeros_like(x)
 for h in v['history']:
  scores=[-np.inf if k in active or q is None else np.linalg.norm(q.conj().T@res)**2 for k,q in enumerate(bases)];chosen=h['block'];best=max(scores);near(scores[chosen],best,label+' independent OMP selected score',rtol=1e-8,atol=1e-12);active.append(chosen);ids=[k*d+j for k in active for j in range(d)];coef=np.linalg.lstsq(w[:,ids],y,rcond=None)[0];res=y-w[:,ids]@coef;expected.fill(0);expected[ids]=coef;near(h['residual_energy'],np.linalg.norm(res)**2,label+' OMP residual',rtol=3e-6)
 near(x,expected,label+' independent OMP X',rtol=3e-6,atol=2e-8);check(v['actions']==len(active),label+' OMP action count')
 if v['stop']=='noise_discrepancy':check(np.linalg.norm(res)**2<=v['residual_factor']*w.shape[0]*y.shape[1]*sigma+1e-7*max(1,np.linalg.norm(res)**2),label+' discrepancy')
 if v['stop']=='max_blocks':check(len(active)==v['max_blocks'],label+' exact block cap')
 if v['stop'] in ('no_positive_remaining_block','rank_limit'):
  scores=[-np.inf if k in active or q is None else np.linalg.norm(q.conj().T@res)**2 for k,q in enumerate(bases)]
  if v['stop']=='no_positive_remaining_block':check(max(scores)<=1e-12*max(1,np.linalg.norm(y)**2)+1e-10,label+' terminal no positive block')
  else:check((len(active)+1)*d>w.shape[0],label+' exact underdetermined rank cap')

def extraction(x,c,rel,ab):
 powers=np.mean(abs(x.reshape(c['Np'],c['K'],c['MT'],c['M']))**2,axis=(2,3));th=max(ab,rel*powers.max());out=[]
 for q,k in zip(*np.where((powers>=th)&(powers>0))):
  b=x[(q*c['K']+k)*c['MT']:(q*c['K']+k+1)*c['MT']];total=np.linalg.norm(b)**2;rx=np.vdot(b[:,:-1],b[:,1:]);tx=np.vdot(b[:-1,:],b[1:,:]);valid=min(abs(rx),abs(tx))>1e-14*total;sa=-np.angle(rx)/np.pi;sd=-np.angle(tx)/np.pi;aoa=np.rad2deg(np.arcsin(np.clip(sa,-1,1)));aod=np.rad2deg(np.arcsin(np.clip(sd,-1,1)));template=np.exp(-1j*np.pi*np.arange(c['MT'])*np.sin(np.deg2rad(aod)))[:,None]*np.exp(-1j*np.pi*np.arange(c['M'])*np.sin(np.deg2rad(aoa)))[None,:];gain=np.vdot(template,b)/(c['MT']*c['M']);sv=np.linalg.svd(b,compute_uv=False)
  out.append(dict(q=int(q),user=int(k),power=float(powers[q,k]),delay_seconds=q/(c['g']*c['bandwidth']),total_path_length_m=q*c['c']/(c['g']*c['bandwidth']),aoa=aoa if valid else None,aod=aod if valid else None,sin_aoa=sa if valid else None,sin_aod=sd if valid else None,valid_angles=bool(valid),gain_real=gain.real if valid else None,gain_imag=gain.imag if valid else None,adjacent_rx_power=abs(rx)/(c['MT']*(c['M']-1)),rank_residual=np.sum(sv[1:]**2)/max(total,1e-300)))
 return out,powers.ravel(),th

def random_stream(seed):
 state=(seed^0x9e3779b9)&0xffffffff
 if state==0:state=0x6d2b79f5
 while True:
  state^=(state<<13)&0xffffffff;state^=state>>17;state^=(state<<5)&0xffffffff;state&=0xffffffff
  yield(state+.5)/4294967296

def audit_scene(file):
 p=json.loads(file.read_text())['payload'];a=p['acquisition'];truth=p['evaluator'];c=a['config'];s=arr(a['symbols']);w=arr(a['W']);y=arr(a['Y']);d=c['K']*c['MT'];label=file.stem
 stream=random_stream(a['symbolSeed']);expected=np.array([1j**int(next(stream)*4)for _ in range(c['N']*d)]).reshape(c['N'],d)/np.sqrt(d);near(s,expected,label+' seeded fresh symbols',atol=1e-14);near(np.sum(abs(s)**2,axis=1),1*np.ones(c['N']),label+' total symbol energy')
 stream=random_stream(a['noiseSeed']);z=np.array([np.sqrt(-np.log(next(stream)))*np.exp(2j*np.pi*next(stream))for _ in range(c['N']*c['M'])]).reshape(c['N'],c['M']);near(z,arr(a['noiseUnit']),label+' independent seeded noise',atol=1e-14);near(z*np.sqrt(a['sigma2']),arr(a['noise']),label+' proper complex normalization')
 paths=[dict(transmitter=q['user'],delay_seconds=q['q']/(c['g']*c['bandwidth']),gain=complex(*q['gain']),aoa_rad=np.deg2rad(q['aoa']),aod_rad=np.deg2rad(q['aod']))for q in truth['paths']]
 clean=O.explicit_received(s.reshape(c['N'],c['K'],c['MT']),np.arange(c['N']),paths,N=c['N'],B=c['bandwidth'],receive_elements=c['M'],Ts=1);near(clean,arr(truth['clean']),label+' scalar physical forward sum');near(y,clean+z*np.sqrt(a['sigma2']),label+' fresh raw Y');near(w,O.dictionary(s.reshape(c['N'],c['K'],c['MT']),np.arange(c['N']),N=c['N'],g=c['g'],grid_size=c['Np']),label+' independent dictionary')
 if any(not float(q['q']).is_integer()for q in truth['paths']):check(truth['offGrid'] and truth['Xtruth']is None,label+' exact offgrid isolation')
 else:
  xt=O.truth_blocks(paths,transmitter_count=c['K'],transmit_elements=c['MT'],receive_elements=c['M'],B=c['bandwidth'],g=c['g'],grid_size=c['Np'],Ts=1);near(xt,arr(truth['Xtruth']),label+' separate on-grid truth');near(w@xt,clean,label+' W X truth consistency')
 for name,v in p['results'].items():
  for required in ('X','history','actions','stop','warnings'):
   check(required in v,label+' required '+required)
  if name in ('mmv_fm_projected','single_log_fm_projected','row_sbl_fm'):
   check('gamma' in v,label+' required gamma')
  if 'gamma'in v:audit_fm(label,name,v,w,y,d,a['sigma2'])
  else:audit_baseline(label,name,v,w,y,d,a['sigma2'])
  if v.get('stop')=='running':
   unavailable.append(label+'/'+name+': partial snapshot has no terminal extraction/evaluation');continue
  check('extraction' in v and 'evaluation' in v,label+' terminal extraction/evaluation required')
  check(v['acquisitionSha256']==p['provenance']['acquisitionSha256'],label+' same observation bound');x=arr(v['X']);ex=v['extraction'];es,powers,th=extraction(x,c,ex['relativePower'],ex['absolutePower']);near(powers,ex['powers'],label+' full delay-user powers');near(th,ex['threshold'],label+' threshold');check(len(es)==len(ex['estimates']),label+' retain all estimates')
  for a1,b1 in zip(es,ex['estimates']):
   check(a1.keys()==b1.keys(),label+' extraction field completeness')
   for k in a1:
    if a1[k]is None:check(b1[k]is None,label+' invalid null angle')
    else:near(a1[k],b1[k],label+' extraction '+k,atol=1e-7)
  ev=v['evaluation'];pn=np.linalg.norm(clean)**2;near(ev['observation_nmse'],np.linalg.norm(w@x-clean)**2/pn,label+' observation NMSE')if pn else check(ev['observation_nmse']is None,label+' zero signal NMSE')
  if truth['Xtruth']is not None and np.linalg.norm(arr(truth['Xtruth']))>0:near(ev['block_nmse'],np.linalg.norm(x-arr(truth['Xtruth']))**2/np.linalg.norm(arr(truth['Xtruth']))**2,label+' coefficient NMSE')
  else:check(ev['block_nmse']is None,label+' unavailable block NMSE')
  check(ev['matched']+ev['missed']==len(paths),label+' physical misses denominator');check(ev['matched']+ev['spurious']==len(es),label+' physical spurious denominator')
  true_set={(q['q'],q['user'])for q in truth['paths']};est_set={(e['q'],e['user'])for e in es};check(ev['support_estimated']==len(est_set),label+' estimated support count');check(ev['truth_paths']==len(paths) and ev['estimated_paths']==len(es),label+' raw path counts')
  if truth['offGrid']:check(ev['exact_support']is None and ev['support_true']is None and ev['support_recovered']is None,label+' unavailable offgrid support metrics')
  else:check(ev['exact_support']==(true_set==est_set) and ev['support_true']==len(true_set) and ev['support_recovered']==len(true_set&est_set),label+' exact support metrics')
  check(ev['association_correct_unambiguous']==sum(m['user_correct']is True for m in ev['matches']) and ev['association_denominator_unambiguous']==sum(m['user_correct']is not None for m in ev['matches']),label+' association denominators')
  if paths and es:
   dist=abs(np.array([q['q']for q in truth['paths']])[:,None]-np.array([e['q']for e in es])[None,:]);ii,jj=linear_sum_assignment(np.where(dist<=.51,dist,1e6));good=[(i,j)for i,j in zip(ii,jj)if dist[i,j]<=.51];check(len(good)==ev['matched'],label+' assignment cardinality');near(sum(dist[i,j]for i,j in good),sum(abs(m['delay_error_bins'])for m in ev['matches']),label+' min delay association cost')
  for m in ev['matches']:
   if m['same_delay_matching_ambiguous']:check(m['user_correct']is None and'aoa_error_deg'not in m,label+' ambiguous physical metrics excluded')
   t=truth['paths'][m['truth_index']];e=es[m['estimate_index']];dq=e['q']-t['q'];near(m['delay_error_bins'],dq,label+' matched delay');near(m['delay_error_seconds'],dq/(c['g']*c['bandwidth']),label+' matched seconds');near(m['path_length_error_m'],dq*c['c']/(c['g']*c['bandwidth']),label+' matched total path length')
   ambiguous=any(i!=m['truth_index'] and abs(q['q']-t['q'])<1e-9 for i,q in enumerate(truth['paths']));check(m['same_delay_matching_ambiguous']==ambiguous,label+' physical association ambiguity')
   if not ambiguous:
    check(m['user_correct']==(e['user']==t['user']),label+' user association')
    if e['valid_angles']:
     near(m['aoa_error_deg'],e['aoa']-t['aoa'],label+' AoA error');near(m['aod_error_deg'],e['aod']-t['aod'],label+' AoD error');near(m['sin_aoa_error'],e['sin_aoa']-np.sin(np.deg2rad(t['aoa'])),label+' sin AoA error');near(m['sin_aod_error'],e['sin_aod']-np.sin(np.deg2rad(t['aod'])),label+' sin AoD error')
  if name=='privileged_delay_support_ls':check(sorted(v['privileged_information']['known_delay_indices'])==sorted(int(np.floor(q['q']+.5))for q in truth['paths']),label+' explicit nearest support privilege')
 case_reports.append({'name':label,'methods':len(p['results']),'status':p['status']})
 if p['status'] not in ('complete','capped'):unavailable.append(label+': original execution '+p['status'])
 if p['budgets']['notRunMethods']:unavailable.append(label+': methods not run '+', '.join(p['budgets']['notRunMethods']))

try:
 files=[]
 for item in args.records:
  path=Path(item)
  if path.is_dir():
   manifest=json.loads((path/'MANIFEST.json').read_text())
   for row in manifest['records']:
    file=path/row['file'];check(hashlib.sha256(file.read_bytes()).hexdigest()==row['sha256'],row['name']+' production Blob byte hash');files.append(file)
  else:files.append(path)
 for file in files:
  if file.stat().st_size>8000000:raise ValueError('record exceeds 8MB')
  doc=json.loads(file.read_text(),parse_constant=lambda x:(_ for _ in ()).throw(ValueError('nonfinite '+x)))
  check(doc.get('schema')=='perceptive-bsbl-live-record-v1',file.name+' schema')
  audit_scene(file)
 # A controlled same-Y pair proves practical solvers did not acquire path multiplicity.
 named={p.stem:json.loads(p.read_text())['payload'] for p in files}
 if 'sameY-one-path' in named and 'sameY-two-coincident' in named:
  one,two=named['sameY-one-path'],named['sameY-two-coincident']
  for key in ('W','Y','symbols','noise','noiseUnit'):near(arr(one['acquisition'][key]),arr(two['acquisition'][key]),'sameY pair '+key,rtol=0,atol=0)
  for name in ('mmv_fm_projected','single_log_fm_projected','row_sbl_fm','block_omp'):
   a,b=one['results'][name],two['results'][name];near(arr(a['X']),arr(b['X']),name+' unchanged practical output under truth multiplicity',rtol=0,atol=0);check(a['history']==b['history'],name+' unchanged practical trace')
except Exception as error:
 failures.append(type(error).__name__+': '+str(error))
result={'status':'failed' if failures else 'incomplete' if unavailable else 'passed','availableEvidenceValid':not failures,'checks':checks,'accepted_actions':actions,'single_log_proper_increases':increases,'trace_local_candidate_ties':ties,'maximum_dense_objective_error':maxerr,'failures':failures,'unavailable':unavailable,'cases':case_reports,'seconds':time.time()-started,'oracle_sha256':ORACLE_SHA,'sourceAuthenticity':'not-verified','browserEngine':False}
print(json.dumps(result,indent=2));sys.exit(1 if failures else 0)
