#!/usr/bin/env python3
"""Oracle driver only: imports the UNMODIFIED reference, runs actual JS separately.
No reference estimator is reimplemented here. No expected output enters JS inputs.
All generated files are under this port directory; reference imports are read-only.
"""
import os
os.environ.setdefault('OPENBLAS_NUM_THREADS','1')
os.environ.setdefault('OMP_NUM_THREADS','1')
import sys
sys.dont_write_bytecode = True
import hashlib
import json
import platform
import subprocess
from dataclasses import asdict, replace
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent
REFERENCE=HERE.parent/'reference'
ROOT=HERE.parents[3]
CORE=ROOT/'nearfield-gc-sage-core.js'
if not CORE.exists():CORE=ROOT/'labs/near-field/nearfield-gc-sage-core.js'
sys.path.insert(0,str(REFERENCE))
from gc_sage import Model,Options,initialize,fit,observation_hash,ALGORITHM_VERSION
from experiments import Scene,simulate,evaluate

def clean(v):
    if isinstance(v,np.ndarray):return clean(v.tolist())
    if isinstance(v,dict):return {k:clean(x) for k,x in v.items()}
    if isinstance(v,(list,tuple)):return [clean(x) for x in v]
    if isinstance(v,(np.floating,float)) and not np.isfinite(v):return str(v)
    if isinstance(v,np.generic):return v.item()
    return v

def write(path,data):path.write_text(json.dumps(clean(data),indent=2,allow_nan=False)+'\n')

def serial_state(s):
    return {'kind':s.kind,'reference_delay':s.reference_delay,'delays':s.delays,
            'gains':{'real':s.gains.real,'imag':s.gains.imag},'point':s.point,
            'normal':s.normal,'bounce_points':s.bounce_points,'theta':s.theta,
            'prediction':{'rows':s.prediction.shape[0],'cols':s.prediction.shape[1],
                          'real':s.prediction.real.ravel(),'imag':s.prediction.imag.ravel()}}

def main():
    supplied=json.loads((REFERENCE/'fixtures/default-observations.json').read_text())
    y=np.array(supplied['observations_real'])+1j*np.array(supplied['observations_imag'])
    md=supplied['model'];model=Model(**{**md,'tx':np.array(md['tx']),'rx':np.array(md['rx']),'frequencies':np.array(md['frequencies']),'region':tuple(md['region'])})
    _,_,truth=simulate(Scene())
    cases=[('default',y,model,truth)]
    for name,scene in [('noiseless',Scene(snr_db=float('inf'))),('narrow-aperture',Scene(aperture=.05,seed=0)),('narrowband',Scene(bandwidth=20e6)),('reference-blind',Scene(reference_blind=True)),('absent-path',Scene(reflection_visible=False)),('low-snr',Scene(snr_db=5,seed=1))]:
        yy,mm,tt=simulate(scene);cases.append((name,yy,mm,tt))
    train=np.arange(y.shape[1])%4!=3
    cases.append(('heldout-tones',y[:,train],replace(model,frequencies=model.frequencies[train]),truth))
    summary={'algorithm_version':ALGORITHM_VERSION,'scope':'Actual JS versus fresh unmodified Python reference; synthetic reduced one-bounce only',
             'node':subprocess.check_output(['node','--version'],text=True).strip(),'python':platform.python_version(),'numpy':np.__version__,
             'source_sha256':{str(p.name):hashlib.sha256(p.read_bytes()).hexdigest() for p in [REFERENCE/'gc_sage.py',REFERENCE/'experiments.py',CORE]},
             'tolerances':{'delay_ns_atol':2e-5,'state_absolute':2e-5,'sse_atol':2e-4,'sse_rtol':2e-8},'cases':{}}
    failures=[]
    for name,yy,mm,tt in cases:
        inp=REFERENCE/'fixtures'/f'{name}-observations.json'
        if name!='default':write(inp,{'purpose':'Observed-data-only regression input; truth and expected results are separate','observations_real':yy.real,'observations_imag':yy.imag,'model':asdict(mm),'options':asdict(Options())})
        initial=initialize(yy,mm,Options())
        expected={'reference_delays_ns':initial.reference_delays_ns,'initializer_trace_sse':initial.delay_trace_sse,'initialization_budget':asdict(initial.budget),'methods':{}}
        for mode in ['scattering','hybrid']:
            r=fit(yy,mm,mode,Options(),initial)
            expected['methods'][mode]={'states':[serial_state(s) for s in r.states],'trace':r.trace,'converged':r.converged,'stopping_reason':r.stopping_reason,'budget':asdict(r.budget)}
            if name!='heldout-tones':expected['methods'][mode]['evaluation_only']=evaluate(r,yy,mm,tt)
            else:
                pred=sum(s.gains[:,None]*np.exp(-2j*np.pi*s.delays[:,None]*model.frequencies[~train]) for s in r.states)
                expected['methods'][mode]['heldout_sse']=float(np.sum(abs(y[:,~train]-pred)**2))
        write(HERE/'results'/f'{name}-python.json',expected)
        actual=json.loads(subprocess.check_output(['node',str(HERE/'run-fixture.js'),str(inp)],text=True))
        write(HERE/'results'/f'{name}-javascript.json',actual)
        checks={'algorithm_version':{'pass':actual['initialization']['algorithm_version']==ALGORITHM_VERSION and all(r['algorithm_version']==ALGORITHM_VERSION for r in actual['methods'].values())}}
        if not checks['algorithm_version']['pass']:failures.append(name+': algorithm version')
        def compare(label,a,b,atol=2e-5,rtol=2e-8):
            aa,bb=np.asarray(a,dtype=float),np.asarray(b,dtype=float)
            ok=aa.shape==bb.shape and bool(np.allclose(aa,bb,atol=atol,rtol=rtol,equal_nan=False))
            checks[label]={'pass':ok,'max_abs_error':float(np.max(np.abs(aa-bb))) if aa.shape==bb.shape and aa.size else None}
            if not ok:failures.append(name+': '+label)
        compare('reference_delays_ns',actual['initialization']['reference_delays_ns'],expected['reference_delays_ns'])
        compare('initializer_trace_sse',actual['initialization']['delay_trace_sse'],expected['initializer_trace_sse'],atol=2e-4)
        hash_ok=actual['initialization']['observation_sha256']==observation_hash(yy)
        checks['observation_sha256']={'pass':hash_ok}
        if not hash_ok:failures.append(name+': observation hash')
        for mode in ['scattering','hybrid']:
            a=actual['methods'][mode];b=expected['methods'][mode]
            metadata_ok=a['converged']==b['converged'] and a['stopping_reason']==b['stopping_reason'] and [s['kind'] for s in a['states']]==[s['kind'] for s in b['states']]
            checks[mode+'_states_and_convergence']={'pass':metadata_ok}
            if not metadata_ok:failures.append(name+': '+mode+' metadata')
            compare(mode+'_sse_trace',[s['sse'] for s in a['trace']],[s['sse'] for s in b['trace']],atol=2e-4)
            trace_metadata=len(a['trace'])==len(b['trace']) and all(all(x[k]==z[k] for k in ['sweep','path','accepted','kind']) for x,z in zip(a['trace'],b['trace']))
            checks[mode+'_trace_decisions']={'pass':trace_metadata}
            if not trace_metadata:failures.append(name+': '+mode+' trace decisions')
            for key in ['scattering_subproblem_sse','reflection_subproblem_sse']:
                for j,(x,z) in enumerate(zip(a['trace'][1:],b['trace'][1:]),1):
                    value=z[key]
                    if value is None or not np.isfinite(value):
                        if x[key] is not None:failures.append(f'{name}: {mode} trace{j} {key} unavailable')
                    else:compare(f'{mode}_trace{j}_{key}',x[key],value,atol=2e-4)
            same_ledger=all(a['budget'][k]==b['budget'][k] for k in b['budget'] if k!='seconds')
            checks[mode+'_compute_ledger']={'pass':same_ledger}
            if not same_ledger:failures.append(name+': '+mode+' compute ledger')
            for i,(sa,sb) in enumerate(zip(a['states'],b['states'])):
                for key in ['delays','point','normal','bounce_points','theta']:
                    if sa[key] is None or sb[key] is None:
                        if sa[key]!=sb[key]:failures.append(f'{name}: {mode} path{i} {key}')
                    else:compare(f'{mode}_path{i}_{key}',sa[key],sb[key],atol=2e-14 if key=='delays' else 2e-5)
                for key in ['real','imag']:
                    compare(f'{mode}_path{i}_gains_{key}',sa['gains'][key],sb['gains'][key])
                    compare(f'{mode}_path{i}_prediction_{key}',sa['prediction'][key],sb['prediction'][key])
            if name=='heldout-tones':
                pred=np.zeros((y.shape[0],sum(~train)),dtype=complex)
                for s in a['states']:
                    gains=np.array(s['gains']['real'])+1j*np.array(s['gains']['imag'])
                    pred+=gains[:,None]*np.exp(-2j*np.pi*np.array(s['delays'])[:,None]*model.frequencies[~train])
                compare(mode+'_heldout_sse',float(np.sum(abs(y[:,~train]-pred)**2)),b['heldout_sse'],atol=2e-4)
        summary['cases'][name]={'pass':all(v['pass'] for v in checks.values()),'checks':checks,
            'js_initialization_seconds':actual['initialization']['budget']['seconds'],
            'js_sse':{mode:actual['methods'][mode]['trace'][-1]['sse'] for mode in ['scattering','hybrid']},
            'js_fit_seconds':{mode:actual['methods'][mode]['budget']['seconds'] for mode in ['scattering','hybrid']}}
        print(name,summary['cases'][name]['pass'],summary['cases'][name]['js_sse'])
    summary['failures']=failures;summary['pass']=not failures
    write(HERE/'results/cross-language-summary.json',summary)
    compact={'algorithm_version':ALGORITHM_VERSION,'purpose':'Separate expected output evidence; never estimator input','cases':{}}
    for name,*_ in cases:
        raw=json.loads((HERE/'results'/f'{name}-python.json').read_text())
        compact['cases'][name]={'reference_delays_ns':raw['reference_delays_ns'],'initializer_trace_sse':raw['initializer_trace_sse'],'methods':{}}
        for mode,r in raw['methods'].items():
            compact['cases'][name]['methods'][mode]={k:v for k,v in r.items() if k!='evaluation_only'}
            compact['cases'][name]['methods'][mode]['states']=[{k:v for k,v in state.items() if k!='prediction'} for state in r['states']]
    write(HERE/'results/compact-expected.json',compact)
    if failures:print('FAILED:',*failures,sep='\n');sys.exit(1)
    print('PASS: all eight actual-JS/common-observation comparisons')
if __name__=='__main__':main()
