#!/usr/bin/env python3
"""Independent audit of canonical snapshots produced by the ACTUAL JS core.
No import of production Python or JS math. mpmath supplies direct complex algebra.
The adapter may rename fields but must not recreate model or pattern calculations.
"""
from pathlib import Path
from types import SimpleNamespace
import argparse, json, math
import numpy as np
import mpmath as mp
mp.mp.dps=360
ap=argparse.ArgumentParser();ap.add_argument('--inputs',required=True);ap.add_argument('--outputs',required=True);ap.add_argument('--report',required=True);ap.add_argument('--content-report');a=ap.parse_args()
def strict(path):
 def no(s):raise ValueError('Nonfinite JSON token '+s)
 return json.loads(Path(path).read_text(),parse_constant=no)
req=strict(a.inputs);out=strict(a.outputs)
count=0;fail=[];missing=[];metrics={};where=''
def ck(label,g,w,atol=3e-11,rtol=3e-11):
 global count
 count+=1
 ga=np.asarray(g);wa=np.asarray(w)
 if ga.dtype==bool:ga=ga.astype(int)
 if wa.dtype==bool:wa=wa.astype(int)
 if ga.shape!=wa.shape:fail.append({'case':where,'check':label,'shape_got':list(ga.shape),'shape_want':list(wa.shape)});return
 err=float(np.max(np.abs(ga-wa))) if ga.size else 0.
 scale=float(np.max(np.abs(wa))) if wa.size else 0.
 metrics[label]=max(metrics.get(label,0.),err)
 if not math.isfinite(err) or err>atol+rtol*scale:fail.append({'case':where,'check':label,'absolute_error':str(err),'expected_scale':str(scale)})
def exact(label,g,w):ck(label,g==w,True,0,0)
def cx(x,matrix=False):
 def scalar(z):
  if isinstance(z,(int,float)):return complex(z)
  if len(z)!=2:raise ValueError('Complex numbers must use [real,imaginary] or a real scalar')
  return complex(*z)
 return np.array([[scalar(z) for z in row] for row in x] if matrix else [scalar(z) for z in x])
def arr(n,u):return np.exp(1j*np.pi*np.arange(n)*u)
def ma(n,u):return mp.matrix([mp.exp(mp.j*mp.pi*m*mp.mpf(u)) for m in range(n)])
def ip(x,y):return sum(mp.conj(x[k])*y[k] for k in range(len(x)))
def mp_projection(n,uu,ut,g):
 bt=ma(n,ut)/mp.sqrt(n)
 if not g:return bt,mp.mpf(1),n
 delta=mp.mpf(ut)-mp.mpf(uu)
 if n==1 or delta in [mp.mpf(-2),mp.mpf(0),mp.mpf(2)]:return mp.zeros(n,1),mp.mpf(0),n-1
 bu=ma(n,uu)/mp.sqrt(n);p=bt-bu*ip(bu,bt);return p,mp.re(ip(p,p)),n-1
def ri(n,uu,ut):return float(abs(ip(ma(n,uu),ma(n,ut))/n)**2)
def expected(c):
 n,nr,nc=c.n,c.nr,c.n-c.nr;P=c.total_power;pr=P*c.radar_fraction;pc=P*(1-c.radar_fraction)
 p,q,nullity=mp_projection(nr,c.user_u,c.target_u,c.channel_gain)
 wc=np.r_[np.zeros(nr),np.sqrt(pc/nc)*arr(n,c.user_u)[nr:]]
 wr=np.r_[np.sqrt(pr/nr)*arr(nr,c.target_u),np.zeros(nc)]
 pp=np.array([complex(x) for x in p]);rs={
 'split_no_null':(wc,wr),
 'projection_raw_diagnostic':(wc,np.r_[np.sqrt(pr)*pp,np.zeros(nc)]),
 'shared_aim_user':(np.sqrt(P/n)*arr(n,c.user_u),np.zeros(n)),
 'shared_aim_target':(np.sqrt(P/n)*arr(n,c.target_u),np.zeros(n))}
 if pr==0:rs['split_null_fixed_power']=(wc,np.zeros(n))
 elif q>0:rs['split_null_fixed_power']=(wc,np.r_[np.array([complex(mp.sqrt(pr/q)*x) for x in p]),np.zeros(nc)])
 rc=ri(nc,c.user_u,c.target_u);rn=ri(n,c.user_u,c.target_u)
 tc={'split_no_null':(pc*nc*rc,pr*nr),'projection_raw_diagnostic':(pc*nc*rc,float(mp.mpf(pr*nr)*q*q)),'split_null_fixed_power':(pc*nc*rc,float(mp.mpf(pr*nr)*q)),'shared_aim_user':(P*n*rn,0.),'shared_aim_target':(P*n,0.)}
 return rs,tc,q,nullity
actual={x['id']:x for x in out['cases']}
exact('unique output IDs',len(actual),len(out['cases']))
exact('input/output IDs',set(actual),{x['id'] for x in req['cases']})
for case in req['cases']:
 where=case['id'];item=actual.get(where)
 if not item:continue
 if case['expected']=='numerical_error':
  exact('explicit numerical error',item['status'],'error')
  msg=item.get('error',{}).get('message','').lower()
  exact('numeric error not false geometric infeasibility',any(w in msg for w in ['subnormal','underflow','relative-accuracy','numerical range']),True)
  continue
 if item['status']!='ok':fail.append({'case':where,'check':'unexpected execution error','detail':item.get('error')});continue
 try:
  c=SimpleNamespace(**case['config']);s=item['evaluation'];P=c.total_power;pr=P*c.radar_fraction;pc=P*(1-c.radar_fraction);n,nr,nc=c.n,c.nr,c.n-c.nr
  es,targets,q,nullity=expected(c)
  ck('q high precision',s['projection']['q'],float(q),0,8e-13)
  exact('nullity',s['projection']['nullity'],nullity)
  ck('raw total trace',s['projection']['raw_total_power'],pc+pr*float(q))
  ck('physical positions',s['resources']['positions_lambda'],np.arange(n)/2)
  ck('full aperture',s['resources']['aperture_lambda'],(n-1)/2)
  ck('radar aperture',s['resources']['radar_subarray_aperture_lambda'],(nr-1)/2)
  ck('communication aperture',s['resources']['comm_subarray_aperture_lambda'],(nc-1)/2)
  exact('RF chains',s['resources']['rf_chains'],n)
  exact('shared independent stream count',s['resources']['shared_independent_radar_streams'],0)
  if 'split_null_fixed_power' not in es:exact('undefined projection state',s['recipes']['split_null_fixed_power']['feasible_recipe'],False)
  h=np.sqrt(c.channel_gain)*np.exp(1j*c.channel_phase)*arr(n,c.user_u)
  for name,(w,r) in es.items():
   v=s['recipes'][name];exact(name+' recipe exists',v['feasible_recipe'],True)
   W=cx(v['wc']);Rr=cx(v['wr']);R=cx(v['covariance'],matrix=True);C=np.outer(w,w.conj())+np.outer(r,r.conj())
   ck('weight wc',W,w);ck('weight wr',Rr,r);ck('actual covariance',R,C);ck('Hermitian',R,R.conj().T)
   ck('PSD negative part',min(0.,np.linalg.eigvalsh(R).min()),0)
   ck('actual trace',v['radiated_power'],np.trace(R).real)
   ck('expected trace',v['radiated_power'],np.trace(C).real)
   ck('per-antenna actual diagonal',v['per_antenna_power'],np.diag(R).real)
   ck('reported max antenna',v['max_per_antenna'],max(np.diag(R).real))
   if not name.startswith('shared'):
    ck('comm physical support',W[:nr],np.zeros(nr),0,0);ck('radar physical support',Rr[nr:],np.zeros(nc),0,0)
    ck('block cross covariance',R[:nr,nr:],np.zeros((nr,nc)),0,0)
   else:
    ck('no independent shared radar beam',Rr,np.zeros(n),0,0);ck('no independent shared radar term',v['radar_interference'],0,0,0)
   if name!='projection_raw_diagnostic':ck('fixed common power',v['radiated_power'],P)
   D=abs(np.vdot(h,w))**2;I=abs(np.vdot(h,r))**2
   ck('desired',v['desired'],D);ck('radar interference',v['radar_interference'],I);ck('SINR',v['sinr'],D/(I+c.noise_power))
   tc,tr=targets[name]
   ck('target primary total',v['target_power'],tc+tr)
   ck('target primary communication',v['target_comm_power'],tc)
   if name in ['split_null_fixed_power','projection_raw_diagnostic']:ck('tiny target radar identity',v['target_independent_radar_power'],tr,0,8e-13)
   else:ck('target primary radar',v['target_independent_radar_power'],tr)
   at=arr(n,c.target_u)
   for key,z in [('target_comm_power_direct',abs(np.vdot(at,W))**2),('target_independent_radar_power_direct',abs(np.vdot(at,Rr))**2),('target_power_direct',abs(np.vdot(at,W))**2+abs(np.vdot(at,Rr))**2)]:ck('direct diagnostic '+key,v[key],z)
   if name=='split_null_fixed_power':
    ck('strict user null',abs(np.vdot(h,Rr))**2,0)
    ck('strict-null target upper bound attained',v['target_independent_radar_power'],float(mp.mpf(pr*nr)*q),0,8e-13)
   gamma=v['sinr'];band=v['qos_roundoff_band'];margin=gamma-c.qos_linear
   status='numerical_boundary' if abs(margin)<=band else ('passes' if margin>0 else 'fails')
   exact('QoS boundary semantics',v['qos_status'],status)
   exact_rank=int(np.linalg.norm(w)>0)+int(np.linalg.norm(r)>0)
   numerical_rank=int(np.linalg.matrix_rank(R,tol=P*1e-11))
   expected_rank=int(np.linalg.norm(w)**2>P*1e-11)+int(np.linalg.norm(r)**2>P*1e-11)
   exact('numerical rank with disclosed tolerance',numerical_rank,expected_rank)
   probes=item.get('pattern_probes',{}).get(name)
   if probes is None:
    if 'actual recipe directional-power calls' not in missing:missing.append('actual recipe directional-power calls')
   else:
    exact('directional sample count',len(probes),len(req['directions'])+2)
    for probe in probes:
     a0=arr(n,probe['u']);pw=np.vdot(a0,C@a0)
     ck('actual recipe directional power',probe['value'],pw.real)
     ck('common graph lower bound',min(0.,probe['value']),0)
     ck('common graph upper bound',max(0.,probe['value']-n*P),0)
  if q==0 and nullity>0 and pr>0:
   v=s['boundary_nullspace_witness'];wr=cx(v['wr']);ck('separate witness radar budget',np.vdot(wr,wr).real,pr);ck('separate witness null',abs(np.vdot(h,wr))**2,0);ck('separate witness target radar',v['target_independent_radar_power'],0)
 except Exception as e:fail.append({'case':where,'check':'schema/oracle exception','detail':str(e)})
mat_actual={x['id']:x for x in out.get('matrix_cases',[])}
if not (out.get('capabilities',{}).get('covariancePattern') or out.get('capabilities',{}).get('matrixFactorAPI')):missing.append('supplemental arbitrary-covariance actual API; requires inspection when binding')
else:
 exact('matrix output IDs',set(mat_actual),{x['id'] for x in req['matrix_cases']})
 for case in req['matrix_cases']:
  where=case['id'];item=mat_actual.get(where)
  if not item:continue
  if item['status']!='ok':fail.append({'case':where,'check':'matrix execution','detail':item.get('error')});continue
  R=cx(case['covariance'],matrix=True);n=case['n'];tr=np.trace(R).real
  if 'covariance' in item:ck('arbitrary factor covariance',cx(item['covariance'],matrix=True),R)
  exact('matrix sample count',len(item['probes']),len(case['directions']))
  for probe in item['probes']:
   a0=arr(n,probe['u']);want=np.vdot(a0,R@a0).real
   ck('arbitrary matrix directional power',probe['value'],want)
   ck('arbitrary matrix graph upper bound',max(0.,probe['value']-n*tr),0)
   ck('arbitrary matrix nonnegative',min(0.,probe['value']),0)
  if case['kind']=='radar_null_psd':
   _,q,_=mp_projection(n,case['user_u'],case['target_u'],1)
   at=arr(n,case['target_u']);au=arr(n,case['user_u'])
   ck('random null covariance user leakage',np.vdot(au,R@au).real,0)
   ck('random null covariance target bound',max(0.,np.vdot(at,R@at).real-float(tr*n*q)),0)
where='source conditional normalization'
x=out.get('source_conditional')
if x:
 ck('literal radar trace',x['radar_trace_literal'],.35);ck('split trace upper bound',x['split_trace_upper_bound'],.85);ck('shared enforced trace',x['shared_trace'],1.)
 exact('conditional source claim kind',x['claim_kind'],req['source_conditional']['claim_kind'])
elif a.content_report:
 content=strict(a.content_report)
 required={'conditional printed normalization','no author implementation accusation','source version and locators','metadata says implementation unverified'}
 passed={x['check'] for x in content.get('checks',[]) if x['passed']}
 exact('static source audit status',content.get('status'),'PASS')
 exact('static source required safeguards',required<=passed,True)
else:missing.append('source-normalization prose/diagnostic requires actual API or static-content audit')
summary={'status':'FAIL' if fail else ('PASS_WITH_EXPLICIT_COVERAGE_GAPS' if missing else 'PASS'),'checks':count,'failures':fail,'coverage_gaps':missing,'maximum_absolute_errors':metrics,'cases':len(req['cases']),'matrix_cases':len(req['matrix_cases']),'mpmath_digits':mp.mp.dps,'core_sha256':out.get('core_sha256'),'engine':out.get('engine'),'source_content_evidence':strict(a.content_report).get('sha256') if a.content_report else None}
Path(a.report).write_text(json.dumps(summary,indent=2,allow_nan=False)+'\n')
print(json.dumps({k:summary[k] for k in ['status','checks','cases','matrix_cases','coverage_gaps']},indent=2))
if fail:print(json.dumps(fail[:12],indent=2))
raise SystemExit(bool(fail))
