#!/usr/bin/env python3
"""230-decimal-place direct array/Fisher checks for tiny modal components.
No formula import. Requires Node and mpmath (development check only).
Run: python3 scripts/validate-crb-beamforming-highprecision.py [--check].
"""
from pathlib import Path
import json,subprocess,hashlib,sys,tempfile
import mpmath as mp
mp.mp.dps=230
ROOT=Path(__file__).resolve().parents[1]
TMP=tempfile.TemporaryDirectory(prefix='crb-beamforming-audit-')
RESULT=ROOT/'data'/'crb-beamforming-highprecision-validation.json'
core=ROOT/'crb-beamforming-core.js'
prefix=str(Path(TMP.name)/'crb-beamforming-highprecision')
inputs=[{'rho':r,'q':q} for r in [0,1e-100,1e-18,1e-17,1e-15,1e-12,1e-8,.5,1] for q in [0,.25,1]]
angles=[-90,-37,-5,-.001,-1e-16,0,1e-16,.001,5,37,90]
# Pattern API selection will be finalized against the public exported API, not guessed.
js=r'''const c=require(process.argv[1]),p=JSON.parse(process.argv[2]);const out=p.inputs.map(x=>{let r=c.solve(x.rho,x.q);return {input:x,result:r,pattern:c.modalPattern(r.modalFactors,p.angles)}});process.stdout.write(JSON.stringify({cfg:c.cfg,rows:out}));'''
hash0=hashlib.sha256(core.read_bytes()).hexdigest()
r=subprocess.run(['node','-e',js,str(core),json.dumps({'inputs':inputs,'angles':angles})],check=True,capture_output=True,text=True)
actual=json.loads(r.stdout);Path(prefix+'-node-output.json').write_text(r.stdout)
c=actual['cfg'];nt=c['nt'];nr=c['nr'];P=mp.mpf(str(c['power']));fac=2*mp.mpf(c['snapshots'])/mp.mpf(str(c['radarNoise']))
mt=[mp.mpf(i)-mp.mpf(nt-1)/2 for i in range(nt)];mr=[mp.mpf(i)-mp.mpf(nr-1)/2 for i in range(nr)]
normm=mp.sqrt(sum(x*x for x in mt));checks=[]
def ck(name,x,y,tol=mp.mpf('5e-10')):
    ok=(x is None and y is None) if x is None or y is None else (abs(mp.mpf(str(x))-y)<=tol*abs(y) if y!=0 else x==0)
    checks.append({'name':name,'passed':bool(ok),'actual':x,'expected':None if y is None else mp.nstr(y,25)})
for i,row in enumerate(actual['rows']):
    inp=row['input'];r=row['result'];rho=mp.mpf(str(inp['rho']));q=mp.mpf(str(inp['q']))
    if q<=rho*rho:cu,cv=mp.mpf(1),mp.mpf(0)
    else:cu=rho*mp.sqrt(q)+mp.sqrt(1-rho*rho)*mp.sqrt(1-q);cv=mp.sqrt(1-rho*rho)*mp.sqrt(q)-rho*mp.sqrt(1-q)
    w=[mp.sqrt(P)*(cu/mp.sqrt(nt)+cv*m/normm) for m in mt]
    # Compute original mean and derivative directly from complete arrays.
    aw=sum(w);adw=sum(-1j*mp.pi*m*wj for m,wj in zip(mt,w))
    z=[aw for _ in mr];d=[1j*mp.pi*m*aw+adw for m in mr]
    D=[d,z,[1j*x for x in z]]
    F=mp.matrix([[fac*mp.re(sum(mp.conj(x)*y for x,y in zip(D[j],D[k]))) for k in range(3)] for j in range(3)])
    if rho==0 and q==1:
        ck(f'{i}_singular',r['metrics']['effective'],None)
    else:
        info=F[0,0]-(F[0,1]*F[0,1]+F[0,2]*F[0,2])/F[1,1]
        ck(f'{i}_high_precision_schur',r['metrics']['effective'],info)
        ck(f'{i}_rad2',r['crbRad2'],1/info)
        ck(f'{i}_root_degree',r['rootCrbDeg'],180/mp.pi/mp.sqrt(info))
    for j,degree in enumerate(angles):
        theta=mp.mpf(str(degree))*mp.pi/180
        response=sum(mp.exp(-1j*mp.pi*m*mp.sin(theta))*wj for m,wj in zip(mt,w))
        expected=abs(response)**2
        # Structural exact null for pure odd beam at broadside.
        if rho==0 and q==1 and degree==0:expected=mp.mpf(0)
        # At non-broadside theoretical pattern nulls below 1e-100, finite trig
        # double precision is reported as absolute-error limited, not relative.
        if degree!=0 and expected<mp.mpf('1e-100'):
            checks.append({'name':f'{i}_pattern_{degree}','passed':abs(row['pattern'][j])<1e-25,'actual':row['pattern'][j],'expected':mp.nstr(expected,25),'criterion':'absolute 1e-25 for trig-array null'})
        else:ck(f'{i}_pattern_{degree}',row['pattern'][j],expected,tol=mp.mpf('2e-8'))
fail=[x for x in checks if not x['passed']]
res={'status':'PASS' if not fail else 'FAIL','precision_decimal_digits':mp.mp.dps,'core_sha256':hash0,'final_sha256':hashlib.sha256(core.read_bytes()).hexdigest(),'check_count':len(checks),'failure_count':len(fail),'failures':fail,'checks':checks}
if '--check' in sys.argv:
    saved=json.loads(RESULT.read_text())
    for key in ['status','core_sha256','check_count','failure_count']:
        assert res[key]==saved[key], ('Saved audit metadata mismatch',key)
else:
    RESULT.write_text(json.dumps(res,indent=2,allow_nan=False)+'\n')
if res['failure_count']:
    raise SystemExit('Independent actual-core audit failed')
print(json.dumps({k:v for k,v in res.items() if k not in ['checks']},indent=2))
