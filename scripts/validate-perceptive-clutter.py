#!/usr/bin/env python3
"""Independent standard-library check of the shipped JavaScript scalar model.
Uses explicit JS input arrays, then complex finite sums / matrix products in Python.
No assumption of Python random.gauss / JS same-seed parity; no external dependencies.
Run from repository: python3 scripts/validate-perceptive-clutter.py
"""
import cmath, hashlib, json, math, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
JS=r"""
const C=require('./perceptive-clutter-core.js');
const rows=[];for(const alpha of [0,1e-18,.2,.8,.95,.99,1-Number.EPSILON,1])for(const order of C.ORDERS){const r=C.simulate({count:24,alpha,order});rows.push({alpha,order,input:r.input,background:r.background,output:r.output,cov:Array.from({length:24},(_,p)=>Array.from({length:24},(_,q)=>C.noiseCovariance(p+1,q+1,alpha,.04,order)))});}
const runs=[];for(const scenario of C.SCENARIOS)for(const order of C.ORDERS)runs.push(C.simulate({scenario,order}));
console.log(JSON.stringify({rows,runs}));
"""
def main():
    actual=json.loads(subprocess.check_output(['node','-e',JS],cwd=ROOT,text=True))
    errors={'finite_weight_background':0.,'matrix_output':0.,'matrix_covariance':0.,'full_record_background':0.,'full_record_output':0.}
    def check(key,x,y):
        error=abs(x-y); errors[key]=max(errors[key],error)
        if error>2e-11*max(1,abs(x),abs(y)):raise AssertionError((key,x,y,error))
    for row in actual['rows']:
        a=row['alpha']; mode=row['order']; x=list(map(lambda z:complex(*z),row['input'])); n=len(x)
        L=[[0 if k>p else (a if mode=='updated' else 1) if k==p else -(1-a)*a**(p-k-(mode=='previous')) for k in range(n)] for p in range(n)]
        for p in range(n):
            bg=(1-a)*sum(a**(p-k)*x[k] for k in range(p+1))
            check('finite_weight_background',complex(*row['background'][p]),bg)
            check('matrix_output',complex(*row['output'][p]),sum(v*z for v,z in zip(L[p],x)))
            for q in range(n):check('matrix_covariance',row['cov'][p][q],.04*sum(v*w for v,w in zip(L[p],L[q])))
    for run in actual['runs']:
        a=run['config']['alpha']; mode=run['config']['order']; x=list(map(lambda z:complex(*z),run['input']))
        for p in range(len(x)):
            bg=(1-a)*sum(a**(p-k)*x[k] for k in range(p+1)); old=(1-a)*sum(a**(p-1-k)*x[k] for k in range(p))
            check('full_record_background',complex(*run['background'][p]),bg)
            check('full_record_output',complex(*run['output'][p]),x[p]-(bg if mode=='updated' else old))
    # Conditional fixed-PDF phase check, not a paper-wide or typeset-edition claim.
    a=.5;w=math.pi/2;p=2
    recurrence=(1-a)*sum(a**(p-k)*cmath.exp(1j*w*k) for k in range(1,p+1))
    printed=cmath.exp(1j*w)*(1-a)*(1-a**p*cmath.exp(1j*w*p))/(1-a*cmath.exp(1j*w))
    assert abs(recurrence-complex(-.5,.25))<1e-14
    assert abs(printed-complex(-.25,.5))<1e-14
    assert abs(abs(recurrence)-abs(printed))<1e-14
    result={'status':'pass','method':'Independent Python finite sums and LL transpose against actual JavaScript arrays; no RNG parity assumption','core_sha256':hashlib.sha256((ROOT/'perceptive-clutter-core.js').read_bytes()).hexdigest(),'operator_cases':len(actual['rows']),'covariance_entries':len(actual['rows'])*24*24,'full512_record_cases':len(actual['runs']),'maximum_absolute_errors':errors,'conditional_pdf_phase_example':{'alpha':a,'omega':w,'p':p,'causal':[recurrence.real,recurrence.imag],'printed':[printed.real,printed.imag],'equal_magnitude_error':abs(abs(recurrence)-abs(printed))},'limits':['No browser or publication check','No real observations, network, multipath recovery, distance/angle estimation, CFAR or original-figure reproduction','Monte Carlo is a separate validation, not this deterministic script']}
    (ROOT/'data/perceptive-clutter-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
