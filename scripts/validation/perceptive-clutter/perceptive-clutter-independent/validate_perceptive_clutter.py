#!/usr/bin/env python3
"""Independent, read-only audit of the builder's exact JS core bytes."""
import json,math,hashlib,subprocess,cmath,argparse,tempfile
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--core',type=Path,default=Path('perceptive-clutter-core.js'))
parser.add_argument('--fixture',type=Path,default=ROOT/'explicit-clutter-fixture.json')
parser.add_argument('--output',type=Path,default=Path('perceptive-clutter-independent-results.json'))
args=parser.parse_args();CORE=args.core.resolve()
temp=tempfile.TemporaryDirectory(prefix='clutter-independent-');snapshot=Path(temp.name)/'core-under-test.cjs';snapshot.write_bytes(CORE.read_bytes());h=hashlib.sha256(snapshot.read_bytes()).hexdigest()
checks={};caveats=[]
def call(jobs):
 p=subprocess.run(['node',str(ROOT/'js_bridge.cjs'),str(snapshot)],input=json.dumps(jobs),text=True,capture_output=True,check=True)
 return json.loads(p.stdout)
def pairs(x): return [[float(z.real),float(z.imag)] for z in x]
def complexify(x): return np.array([complex(*v) for v in x])
def near(x,y,atol=3e-12,rtol=2e-12):
 a=np.asarray(x);b=np.asarray(y);err=float(np.max(np.abs(a-b))) if a.size else 0
 assert np.all(np.abs(a-b)<=atol+rtol*np.abs(b)),err
 return err

def oracle(x,a):
 n=len(x);B=np.zeros((n,n));P=np.zeros((n,n));state=np.zeros(n)
 for p in range(n):
  u=np.zeros(n);u[p]=1;P[p]=u-state;state=a*state+(1-a)*u;B[p]=state
 return B@x,a*(P@x),P@x,B,a*P,P
rng=np.random.default_rng(39184);x=rng.normal(size=43)+1j*rng.normal(size=43)
alphas=[0,1e-18,1e-12,.01,.2,.5,.95,.99,.999999,np.nextafter(1.,0.),1]
jobs=[{'op':'filter','args':[pairs(x),a,o]} for a in alphas for o in ['updated','previous']]
res=call(jobs);maxerr=0
for job,r in zip(jobs,res):
 assert r['ok'];a=job['args'][1];o=job['args'][2];b,u,p,*_=oracle(x,a)
 for name,v in [('background',b),('updated',u),('previous',p),('output',u if o=='updated' else p)]:maxerr=max(maxerr,near(complexify(r['value'][name]),v))
 if 0<a<1e-10:
  # Compare scaled residual, not an absolute tolerance that can hide all-zero output.
  near(complexify(r['value']['updated'])/a,p)
checks['filter_operator_both_orders']={'cases':len(jobs),'max_error':maxerr}

jobs=[];expected=[]
for a in alphas:
 _,_,_,B,U,P=oracle(np.zeros(43),a)
 for p,q in [(1,1),(1,2),(2,2),(2,43),(41,43),(43,43)]:
  for o,M in [('updated',U),('previous',P)]:
   jobs.append({'op':'noiseCovariance','args':[p,q,a,.71,o]});expected.append(.71*np.dot(M[p-1],M[q-1]))
 for p in [0,1,2,43]:
  jobs.append({'op':'backgroundVariance','args':[p,a,.71]});expected.append(0 if p==0 else .71*np.dot(B[p-1],B[p-1]))
err=0
for r,v in zip(call(jobs),expected):assert r['ok'];err=max(err,near(r['value'],v,atol=3e-15))
checks['finite_covariance_operator']={'cases':len(jobs),'max_error':err}

# Floating frequency response; direct complex division as independent route.
jobs=[];expected=[]
for a in alphas:
 for w in [0,1e-30,1e-15,1e-8,.1,-.37,math.pi,2*math.pi,2*math.pi+.2]:
  for o in ['updated','previous']:
   jobs.append({'op':'gain','args':[a,w,o]})
   wr=math.remainder(w,math.tau);num=complex(2*math.sin(wr/2)**2,math.sin(wr));g=1 if a==1 else (a if o=='updated' else 1)*num/((1-a)+a*num);expected.append(g)
err=0
for r,v in zip(call(jobs),expected):assert r['ok'];err=max(err,near(complex(*r['value']),v))
checks['steady_complex_gain']={'cases':len(jobs),'max_error':err}

# Use real default simulation and independent component propagation; same-record invariants.
configs=[{'alpha':a,'order':o,'scenario':s} for a in [0,.95,1] for o in ['updated','previous'] for s in ['continuous','stop','depart']]
res=call([{'op':'simulate','args':[c]} for c in configs]);maxerr=0
base_noise=None;base_inputs={}
for c,r in zip(configs,res):
 assert r['ok'];v=r['value'];a=c['alpha'];o=c['order'];mode=c['scenario'];n=len(v['input']);assert n==512
 xs=complexify(v['input']);b,u,p,B,U,P=oracle(xs,a)
 for name,y in [('background',b),('updated',u),('previous',p),('output',u if o=='updated' else p)]:maxerr=max(maxerr,near(complexify(v[name]),y))
 noise=complexify(v['generatorOnly']['noise']);target=complexify(v['generatorOnly']['target']);clutter=complexify(v['generatorOnly']['clutter'])
 near(xs,noise+target+clutter)
 if base_noise is None:base_noise=noise
 else:near(noise,base_noise,atol=0,rtol=0)
 if mode not in base_inputs:base_inputs[mode]=xs
 else:near(xs,base_inputs[mode],atol=0,rtol=0)
 M=U if o=='updated' else P
 near(v['noiseCovarianceFirst4'],.04*(M[:4]@M[:4].T),atol=4e-15)
 outtarget=M@target
 finite=np.mean(np.abs(outtarget)**2)/np.mean(np.abs(target)**2)
 near(v['metrics']['finiteTargetPowerRatio'],finite)
 if mode=='stop':
  near(target[256:],np.repeat(target[255],256))
  near(outtarget[256:],outtarget[255]*a**np.arange(1,257))
 if mode=='depart':
  near(target[256:],np.zeros(256))
  target_bg=B@target
  exponents=np.arange(1 if o=='updated' else 0,257 if o=='updated' else 256)
  near(outtarget[256:],-target_bg[255]*a**exponents)
 for j in [0,1,256,511]:near(v['noiseTheory'][j]['output'],.04*np.dot(M[j],M[j]),atol=4e-15)
 # Full selected phasor relationship must use previous b in previous mode.
 used=b if o=='updated' else np.r_[0,b[:-1]];near(xs,used+complexify(v['output']))
checks['actual_simulations']={'cases':len(configs),'max_matrix_error':maxerr,'same_noise_and_input_verified':True,'stop_depart_and_two_orders':True}

# Full explicit reference fixture cross-language parity, avoiding RNG equivalence claims.
f=json.loads(args.fixture.read_text())
r=call([{'op':'filter','args':[f['input'],.95]}])[0];assert r['ok']
for k,v in [('background','background'),('updated','post'),('previous','pre')]:near(r['value'][k],f[v])
checks['python_explicit_fixture_cross_language']=True

# Sample alias, matched noise and count-one input boundary.
ali=call([{'op':'generate','args':[{'fD':f}]} for f in [0,500,-500,2,502,-498]])
for i,j in [(0,1),(0,2),(3,4),(3,5)]:near(ali[i]['value']['input'],ali[j]['value']['input'],atol=2e-12)
for scenario in ['continuous','stop','depart']:
 for order in ['updated','previous']:
  r=call([{'op':'simulate','args':[{'count':1,'scenario':scenario,'order':order}]}])[0];assert r['ok'];assert r['value']['config']['eventIndex']==1
checks['alias_and_count_one']=True

invalid=[('filter',[[[1,2]],-1]),('filter',[[[1,2]],2]),('filter',[[],.5]),('filter',[[[1,2,3]],.5]),('filter',[[[1e101,0]],.5]),('filter',[[[1,2]],.5,'bad']),('normalize',[{'count':0}]),('normalize',[{'count':4097}]),('normalize',[{'dt':0}]),('normalize',[{'noisePower':-1}]),('normalize',[{'seed':-1}]),('normalize',[{'scenario':'bad'}]),('normalize',[{'eventIndex':513}]),('noiseCovariance',[0,1,.5]),('backgroundVariance',[-1,.5]),('gain',[.5,0,'bad']),('dbPower',[-1])]
r=call([{'op':op,'args':args} for op,args in invalid]);assert all(not v['ok'] for v in r)
checks['input_guard_rejections']=len(invalid)

# Endpoint decimal and plot-log conventions.
r=call([{'op':'dbPower','args':[0]},{'op':'dbPower','args':[1e-300]},{'op':'memory','args':[0]},{'op':'memory','args':[1]}]);assert r[0]['value']=='-Infinity';near(r[1]['value'],-3000);assert r[2]['value']['updatesToOnePercent']==1;assert r[3]['value']['updatesToOnePercent']=='Infinity'
checks['zero_tiny_power_and_memory_endpoints']=True

# Inspect broad accepted utility domain without claiming a visible UI defect.
edge_jobs=[{'op':'gain','args':[.999999,1e100]},{'op':'gain','args':[.999999,1e-320]},{'op':'simulate','args':[{'count':1,'dt':1e-310}]}]
edge=call(edge_jobs)
# Regressions of the repaired numeric API edges are explicit assertions.
assert not edge[0]['ok'], 'huge omega must be rejected by the declared bound'
assert not edge[2]['ok'], 'unrepresentable sample-rate dt must be rejected'
assert edge[1]['ok'] and edge[1]['value'][1]>0, 'representable subnormal gain vanished'
small_expected=(.999999/(1-.999999))*1e-320
assert abs(edge[1]['value'][1]/small_expected-1)<1e-9
checks['repaired_domain_and_subnormal_edges']=True
if edge[0]['ok'] and edge[0]['value']==[0,0]:caveats.append('gain admits huge omega but subtractive range reduction maps 1e100 spuriously to exact DC; outside fixed UI')
if edge[1]['ok'] and edge[1]['value']==[0,0]:caveats.append('gain at alpha=.999999, omega=1e-320 underflows product prematurely; nonzero ~1e-314 gain is representable; outside fixed UI')
if edge[2]['ok'] and edge[2]['value']['metrics']['sampleRateHz']=='Infinity':caveats.append('dt=1e-310 is accepted but returns infinite sample-rate/DFT metrics; outside fixed UI')
current=hashlib.sha256(CORE.read_bytes()).hexdigest();out={'status':'PASS bounded teaching core' if not caveats else 'PASS bounded teaching core; see accepted-domain caveats','core_filename':CORE.name,'tested_sha256':h,'current_sha256':current,'changed_while_testing':h!=current,'checks':checks,'outside_ui_caveats':caveats,'node_version':subprocess.check_output(['node','--version'],text=True).strip()}
args.output.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
