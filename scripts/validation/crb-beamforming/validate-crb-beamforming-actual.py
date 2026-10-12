#!/usr/bin/env python3
"""Read actual JS exports; compare Node outputs with independently derived NumPy oracles.
Run: python3 scripts/validate-crb-beamforming-actual.py [--check].
Node executes the actual core; NumPy independently computes expected values.
"""
import hashlib,json,subprocess,math,sys,tempfile
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
TMP=tempfile.TemporaryDirectory(prefix='crb-beamforming-audit-')
RESULT=ROOT/'data'/'crb-beamforming-actual-validation.json'
CORE=ROOT/'crb-beamforming-core.js'
PREFIX=Path(TMP.name)/'crb-beamforming-actual'
rng=np.random.default_rng(202610101519)
checks=[]
failures=[]

def as_js_complex(x):
    return np.stack([np.real(x),np.imag(x)],axis=-1).tolist()
def from_js_complex(x):
    a=np.asarray(x,float);return a[...,0]+1j*a[...,1]
def check(name,passed,**detail):
    row={'name':name,'passed':bool(passed),**detail};checks.append(row)
    if not passed: failures.append(row)
def near(x,y,rtol=2e-10,atol=2e-9):
    if x is None or y is None:return x is None and y is None
    return bool(np.allclose(x,y,rtol=rtol,atol=atol))
def ula(n,t):
    m=np.arange(n)-(n-1)/2;a=np.exp(1j*np.pi*m*np.sin(t))
    return a,1j*np.pi*np.cos(t)*m*a

def fim_of_factors(W,c):
    a,da=ula(c['nt'],c['theta']);b,db=ula(c['nr'],c['theta']);al=complex(*c['alpha'])
    A=np.outer(b,a.conj());dA=np.outer(db,a.conj())+np.outer(b,da.conj())
    z=(A@W).reshape(-1,order='F');d=(al*dA@W).reshape(-1,order='F')
    D=np.stack([d,z,1j*z],axis=1)
    F=2*c['snapshots']/c['radarNoise']*np.real(D.conj().T@D)
    if np.vdot(z,z).real==0:return F,None,None
    # Projection, independently performed on the original complex mean derivatives.
    rem=d-z*np.vdot(z,d)/np.vdot(z,z).real
    j=2*c['snapshots']/c['radarNoise']*np.vdot(rem,rem).real
    return F,float(j),float(np.vdot(z,z).real)

rhos=[0,1e-100,1e-18,1e-17,1e-16,1e-15,1e-14,1e-12,1e-10,1e-8,1e-6,.001,.01,.1,.3,.5,.8,.99,1-1e-12,1]
qs=[0,1e-8,.01,.1,.25,.64,.9,.99,1-1e-12,1,1+1e-12,1.01]
solves=[{'rho':r,'q':q} for r in rhos for q in qs]
# Exact transition, plus values just either side, for ordinary overlaps.
solves += [{'rho':r,'q':q} for r in [.1,.3,.5,.8,.99] for q in [r*r,np.nextafter(r*r,0),np.nextafter(r*r,1)]]
mains=[{'rho':r,'db':d,'none':n} for r in [0,.5,1e-8,1] for d in [-200,0,10,18,20,20+1e-10,22,200] for n in [False,True]]
angles=np.linspace(-90,90,721).tolist()
info=[]
for k in range(90):
    nt=int(rng.choice([2,3,5,8]));nr=nt+int(rng.integers(1,7));rank=int(rng.integers(1,nt+1))
    W=rng.normal(size=(nt,rank))+1j*rng.normal(size=(nt,rank));W/=np.linalg.norm(W)
    c={'nt':nt,'nr':nr,'snapshots':32,'power':1,'communicationNoise':.01,'radarNoise':float(10**rng.uniform(-2,2)),'alpha':rng.normal(size=2).tolist(),'theta':float(rng.uniform(-1.3,1.3))}
    info.append({'factors':as_js_complex(W.T),'options':c})
# Simple input structural singularities.
info += [
 {'factors':as_js_complex(np.ones((1,8))/np.sqrt(8)), 'options':{'alpha':[0,0]}},
 {'factors':as_js_complex(np.ones((1,8))/np.sqrt(8)), 'options':{'theta':np.pi/2}},
 {'factors':as_js_complex(np.zeros((1,8))), 'options':{}},
 {'factors':as_js_complex(np.array([[1+.3j,.2+.8j]])), 'options':{'nt':2,'nr':1}},
]
for i in range(20):
    w=np.sin(1.13*(np.arange(8)+1)*(i+1))+1j*np.cos(.97*(np.arange(8)+1)*(i+1))
    info.append({'factors':as_js_complex(w[None,:]),'options':{'nr':1,'theta':.37,'alpha':[.7,.4]}})
payload={'solves':solves,'mains':mains,'angles':angles,'information':info,'kappas':[0,1e-12,.001,.1,.25,.5,.75,.9,.99,1-1e-12,1]}
input_path=Path(str(PREFIX)+'-inputs.json');out_path=Path(str(PREFIX)+'-node-output.json')
input_path.write_text(json.dumps(payload))
js=r'''
const fs=require('fs'),path=process.argv[1],p=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),c=require(path);
const out={api:Object.keys(c),cfg:c.cfg,gammaMax:c.gammaMax,baseInformation:c.baseInformation,baseRootDeg:c.baseRootDeg};
out.solves=p.solves.map(x=>({input:x,result:c.solve(x.rho,x.q),targetPattern:c.solve(x.rho,x.q).modalFactors?c.modalPattern(c.solve(x.rho,x.q).modalFactors,[0])[0]:null}));
out.mains=p.mains.map(x=>({input:x,result:c.main(x.rho,x.db,x.none)}));
out.information=p.information.map(x=>({input:x,result:c.information(x.factors,x.options)}));
out.companions=p.kappas.map(k=>{const r=c.companion(k);return {result:r,pattern:c.pattern(r.factors,p.angles),modalPattern:c.modalPattern(r.modalFactors,p.angles)}});
out.patterns=[0,.5,1].flatMap(r=>[0,.25,.9,1].map(q=>{const r0=c.solve(r,q);return {rho:r,q,result:r0,pattern:c.pattern([r0.w],p.angles)}}));
out.frontiers=[0,.5,1].map(r=>({rho:r,points:c.frontier(r)}));
process.stdout.write(JSON.stringify(out));
'''
hash_before=hashlib.sha256(CORE.read_bytes()).hexdigest()
r=subprocess.run(['node','-e',js,str(CORE),str(input_path)],capture_output=True,text=True,check=True)
out_path.write_text(r.stdout)
hash_after=hashlib.sha256(CORE.read_bytes()).hexdigest()
actual=json.loads(r.stdout);cfg=actual['cfg'];nt=cfg['nt'];nr=cfg['nr'];P=cfg['power'];L=cfg['snapshots'];nv=cfg['radarNoise'];nc=cfg['communicationNoise'];alpha=complex(*cfg['alpha'])
Db=np.pi**2*nr*(nr**2-1)/12;Dt=np.pi**2*nt*(nt**2-1)/12
base=2*abs(alpha)**2*L/nv*Db*nt*P
a,da=ula(nt,0);b,db=ula(nr,0);u=np.ones(nt)/np.sqrt(nt);v=(np.arange(nt)-(nt-1)/2);v=v/np.linalg.norm(v)
check('core_hash_stable_during_run',hash_before==hash_after,before=hash_before,after=hash_after)
check('base_information',near(actual['baseInformation'],base))
check('base_root_degree',near(actual['baseRootDeg'],180/np.pi/np.sqrt(base)))

def expected_main(rho,q):
    if q>1:return {'status':'infeasible'}
    plateau=q<=rho*rho
    # Derive optimum using equivalent geometric angle construction at ordinary scale.
    if plateau:cu,cv=1.,0.
    else:cu=rho*np.sqrt(q)+np.sqrt(1-rho*rho)*np.sqrt(1-q);cv=np.sqrt(1-rho*rho)*np.sqrt(q)-rho*np.sqrt(1-q)
    g=cu*cu
    return {'status':'singular' if rho==0 and q==1 else 'regular','regime':'plateau' if plateau else 'tradeoff','cu':cu,'cv':cv,'g':g,'information':base*g,'root':None if g==0 else 180/np.pi/np.sqrt(base*g),'snr':P/nc*(rho*cu+np.sqrt(1-rho*rho)*cv)**2}

for i,row in enumerate(actual['solves']):
    inp=row['input'];r=row['result'];e=expected_main(inp['rho'],inp['q']);label=f"solve_{i}_rho{inp['rho']}_q{inp['q']}"
    check(label+'_status',r['status']==e['status'])
    if e['status']=='infeasible':
        check(label+'_infeasible_nulls',r['w'] is None and r['g'] is None and r['metrics'] is None)
        continue
    check(label+'_classification_consistency',r['status']==r['metrics']['status'],top=r['status'],metrics=r['metrics']['status'])
    check(label+'_regime',r['regime']==e['regime'])
    check(label+'_illumination',near(r['g'],e['g'],atol=0))
    check(label+'_canonical_pattern_matches_gain',near(row['targetPattern'],P*nt*e['g'],rtol=1e-12,atol=0))
    w=from_js_complex(r['w']);h=from_js_complex(r['h'])
    check(label+'_power',near(np.vdot(w,w).real,P))
    check(label+'_snr',near(r['actualSnr'],e['snr']) and r['actualSnr']>=r['requiredSnr']-1e-9)
    if e['status']=='regular':
        check(label+'_effective_information',near(r['metrics']['effective'],e['information'],rtol=3e-9,atol=0),expected=e['information'],actual=r['metrics']['effective'])
        check(label+'_crb_rad2',near(r['crbRad2'],1/e['information'],rtol=3e-9,atol=0),expected=1/e['information'],actual=r['crbRad2'])
        check(label+'_root_crb_deg',near(r['rootCrbDeg'],e['root'],rtol=3e-9,atol=0),expected=e['root'],actual=r['rootCrbDeg'])
        # Compare full FIM at ordinary scales (small effective information can cancel from FIM subtraction).
        if e['g']>1e-10:
            F,j,s=fim_of_factors(w[:,None],cfg)
            check(label+'_full_fim',near(r['metrics']['fim'],F) and near(r['metrics']['known'],F[0,0]))
    else:check(label+'_singular_nulls',r['crbRad2'] is None and r['rootCrbDeg'] is None)

for i,row in enumerate(actual['mains']):
    x=row['input'];r=row['result'];q=0 if x['none'] else 10**(x['db']/10)*nc/P;e=expected_main(x['rho'],q)
    check(f'main_{i}_threshold_conversion',near(r['q'],q,rtol=1e-12,atol=0) and r['status']==e['status'])
    if e['status']=='regular':check(f'main_{i}_root',near(r['rootCrbDeg'],e['root'],rtol=3e-9,atol=0))

max_fim_rel=0;max_eff_rel=0
for i,row in enumerate(actual['information']):
    x=row['input'];r=row['result'];c={**cfg,**x['options']};W=from_js_complex(x['factors']).T
    F,j,s=fim_of_factors(W,c)
    check(f'generic_{i}_FIM',near(r['fim'],F,rtol=4e-10,atol=1e-7))
    check(f'generic_{i}_covariance',near(from_js_complex(r['covariance']),W@W.conj().T))
    check(f'generic_{i}_power',near(r['power'],np.linalg.norm(W)**2))
    if i<90:
        max_fim_rel=max(max_fim_rel,np.linalg.norm(np.array(r['fim'])-F)/np.linalg.norm(F))
        max_eff_rel=max(max_eff_rel,abs(r['effective']-j)/j)
        check(f'generic_{i}_effective',r['status']=='regular' and near(r['effective'],j,rtol=2e-9,atol=0))
        check(f'generic_{i}_conversion',near(r['crbRad2'],1/j) and near(r['rootCrbDeg'],180/np.pi/np.sqrt(j)))
    else:check(f'generic_{i}_singular',r['status']=='singular',status=r['status'],effective=r['effective'])

reference_pattern=None
for i,row in enumerate(actual['companions']):
    r=row['result'];k=r['kappa'];W=from_js_complex(r['factors']).T
    F,j,s=fim_of_factors(W,cfg)
    jclosed=2*abs(alpha)**2*L*P/nv*(nt*Db*.5+nr*Dt*.5*(1-k*k))
    check(f'companion_{i}_full_fim',near(r['metrics']['fim'],F))
    check(f'companion_{i}_information',near(r['metrics']['effective'],jclosed) and near(j,jclosed))
    check(f'companion_{i}_same_sinr',near(r['sinr'],50) and near(r['desired'],.5) and near(r['interference'],0))
    check(f'companion_{i}_power_split',near(r['dataPower'],.5*(1+k*k)) and near(r['probingPower'],.5*(1-k*k)) and near(r['power'],P))
    check(f'companion_{i}_degrees',near(r['rootCrbDeg'],180/np.pi/np.sqrt(jclosed)))
    p=[]
    for theta in np.deg2rad(angles):
        av,dav=ula(nt,theta);p.append(float(np.linalg.norm(av.conj()@W)**2))
    check(f'companion_{i}_pattern_independent',near(row['pattern'],p))
    check(f'companion_{i}_modal_pattern',near(row['modalPattern'],p))
    if reference_pattern is None:reference_pattern=row['pattern']
    check(f'companion_{i}_same_full_pattern',near(row['pattern'],reference_pattern))
for i,row in enumerate(actual['patterns']):
    W=from_js_complex(row['result']['w'])[:,None]
    oracle=[float(np.linalg.norm(ula(nt,theta)[0].conj()@W)**2) for theta in np.deg2rad(angles)]
    check(f'main_pattern_{i}',near(row['pattern'],oracle))
for row in actual['frontiers']:
    for p in row['points']:
        e=expected_main(row['rho'],10**(p['db']/10)*nc/P)
        check(f'frontier_{row["rho"]}_{p["db"]}',p['status']==e['status'] and (e['status']!='regular' or near(p['rootCrbDeg'],e['root'])))
res={'status':'PASS' if not failures else 'FAIL','core_path':'crb-beamforming-core.js','core_sha256':hash_before,'hash_after':hash_after,'check_count':len(checks),'failure_count':len(failures),'max_generic_fim_relative_error':max_fim_rel,'max_generic_effective_relative_error':max_eff_rel,'failures':failures,'checks':checks,'independence':'Only the actual module is executed in Node. Expected results independently derived in this Python script; no producer formula imports.'}
if '--check' in sys.argv:
    saved=json.loads(RESULT.read_text())
    for key in ['status','core_sha256','check_count','failure_count']:
        assert res[key]==saved[key], ('Saved audit metadata mismatch',key)
else:
    RESULT.write_text(json.dumps(res,indent=2,allow_nan=False)+'\n')
if res['failure_count']:
    raise SystemExit('Independent actual-core audit failed')
print(json.dumps({k:v for k,v in res.items() if k not in ['checks','failures']},indent=2))
for row in failures[:30]:print(json.dumps(row))
