"""Fresh reviewer comparisons using the actual JS core and independent Python.

Writes only into this port package's independent/ directory. No implementation
is copied, no expected outputs are supplied to JS, and no seed is filtered.
"""
import os
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['OMP_NUM_THREADS'] = '1'
import sys
sys.dont_write_bytecode = True
from pathlib import Path
from dataclasses import asdict
import hashlib
import json
import subprocess
import numpy as np

HERE = Path(__file__).resolve().parent
CORE=HERE.parents[3]/'nearfield-gc-sage-core.js'
if not CORE.exists():CORE=HERE.parents[3]/'labs/near-field/nearfield-gc-sage-core.js'
REF = HERE.parent / 'reference'
sys.path.insert(0, str(REF))
from gc_sage import Options, initialize, fit, observation_hash, ALGORITHM_VERSION
from experiments import Scene, simulate, evaluate


def clean(value):
    if isinstance(value, np.ndarray): return clean(value.tolist())
    if isinstance(value, np.generic): return value.item()
    if isinstance(value, dict): return {k: clean(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)): return [clean(v) for v in value]
    if isinstance(value, float) and not np.isfinite(value): return None
    return value


def js_call(payload):
    process = subprocess.run(['node', str(HERE/'independent-runner.js')],
                             input=json.dumps(clean(payload)), text=True,
                             capture_output=True, check=True)
    return json.loads(process.stdout)


def packed(z):
    return {'rows': z.shape[0], 'cols': z.shape[1],
            'real': z.real.ravel(), 'imag': z.imag.ravel()}


def unpack(z):
    return (np.asarray(z['real']) + 1j*np.asarray(z['imag'])).reshape(z['rows'], z['cols'])


def main():
    out = HERE/'independent'
    out.mkdir(exist_ok=True)
    source_hash = hashlib.sha256(CORE.read_bytes()).hexdigest()
    records, failures = [], []
    cases = [('snr-%g-seed-%d' % (snr, seed), Scene(snr_db=snr, seed=seed))
             for snr in [5.,10.,15.,20.] for seed in range(10)]
    cases += [('aperture-005-seed-%d' % seed, Scene(aperture=.05, seed=seed)) for seed in range(10)]
    cases += [('default', Scene()), ('noiseless', Scene(snr_db=float('inf'))),
              ('narrowband', Scene(bandwidth=20e6)),
              ('reference-blind', Scene(reference_blind=True)),
              ('absent-path', Scene(reflection_visible=False))]
    for name, scene in cases:
        y, model, truth = simulate(scene)
        options = Options()
        payload = {'observations_real':y.real,'observations_imag':y.imag,
                   'model':asdict(model),'options':asdict(options)}
        actual = js_call(payload)
        initial = initialize(y, model, options)
        record = {'case':name, 'scene':asdict(scene), 'methods':{},
                  'delay_max_error_ns':float(np.max(np.abs(np.asarray(actual['initial_delays_ns'])-initial.reference_delays_ns))),
                  'observation_sha256_matches':actual['observation_sha256']==observation_hash(y)}
        if record['delay_max_error_ns'] > 2e-5 or not record['observation_sha256_matches']:
            failures.append(name+': initializer/observation mismatch')
        for mode in ['scattering','hybrid']:
            expected = fit(y,model,mode,options,initial)
            a = actual['methods'][mode]
            observed_prediction = unpack(a['prediction'])
            total_sse = float(np.sum(abs(y-observed_prediction)**2))
            expected_sse = expected.trace[-1]['sse']
            prediction_error = float(np.max(abs(observed_prediction-expected.prediction)))
            trace_a = [step['sse'] for step in a['trace']]
            trace_b = [step['sse'] for step in expected.trace]
            same_trace_length = len(trace_a)==len(trace_b)
            trace_error = float(np.max(np.abs(np.asarray(trace_a)-trace_b))) if same_trace_length else None
            budget_equal = all(a['budget'][k]==v for k,v in asdict(expected.budget).items() if k!='seconds')
            state_errors = []
            for sa, sb in zip(a['states'],expected.states):
                gain = np.asarray(sa['gains']['real'])+1j*np.asarray(sa['gains']['imag'])
                error = {'gains':float(np.max(abs(gain-sb.gains))),
                         'delay_ns':float(np.max(abs(np.asarray(sa['delays'])-sb.delays))*1e9)}
                for field in ['point','normal','bounce_points']:
                    aa,bb=sa[field],getattr(sb,field)
                    error[field] = None if aa is None and bb is None else float(np.max(abs(np.asarray(aa)-bb)))
                state_errors.append(error)
            metadata_ok = ([s['kind'] for s in a['states']] == [s.kind for s in expected.states]
                           and a['converged']==expected.converged
                           and a['stopping_reason']==expected.stopping_reason)
            entry = {'sse_abs_error':abs(total_sse-expected_sse),
                     'sse_relative_error':abs(total_sse-expected_sse)/max(abs(expected_sse),1e-30),
                     'prediction_max_complex_error':prediction_error,'trace_max_error':trace_error,
                     'compute_ledger_exact':budget_equal,'metadata_exact':metadata_ok,
                     'state_errors':state_errors,'js_seconds':a['budget']['seconds'],
                     'python_seconds':expected.budget.seconds,
                     'python_evaluation':evaluate(expected,y,model,truth)}
            # Numeric tolerance covers near-tied finite-grid paths; labels and budgets
            # must still match exactly on this fixed declared benchmark.
            ok = (entry['sse_abs_error'] <= 2e-4+2e-8*abs(expected_sse)
                  and prediction_error <= 2e-5 and metadata_ok and budget_equal
                  and same_trace_length and trace_error <= 2e-4+2e-8*max(trace_b))
            for error in state_errors:
                ok &= all(v is None or v <= 2e-5 for v in error.values())
            entry['pass'] = bool(ok)
            if not ok: failures.append(name+': '+mode)
            record['methods'][mode]=entry
        records.append(record)
        print(name, all(v['pass'] for v in record['methods'].values()), flush=True)
    # Fresh arbitrary complex LS tests, including singular and near-singular cases.
    rng=np.random.default_rng(921)
    ls_records=[]
    for name,p,l,kind in [('dense-two',64,2,'full'),('dense-five',18,5,'full'),
                          ('complex-duplicate',32,3,'duplicate'),('zero-column',20,3,'zero'),
                          ('near-dependent-1e-8',64,2,'near'),('all-zero',12,2,'allzero')]:
        design=rng.normal(size=(p,l))+1j*rng.normal(size=(p,l))
        observations=rng.normal(size=(4,p))+1j*rng.normal(size=(4,p))
        if kind=='duplicate': design[:,1]=design[:,0]*np.exp(.7j)
        if kind=='zero': design[:,0]=0
        if kind=='near': design[:,1]=design[:,0]*np.exp(.7j)+1e-8*(rng.normal(size=p)+1j*rng.normal(size=p))
        if kind=='allzero': design[:]=0
        a=js_call({'action':'joint','design':packed(design),'observations':packed(observations)})
        actual=unpack(a['gains']);expected,_,rank,svals=np.linalg.lstsq(design,observations.T,rcond=None);expected=expected.T
        relative_gain_error=float(np.linalg.norm(actual-expected)/max(np.linalg.norm(expected),1e-30))
        pred_a=actual@design.T;pred_b=expected@design.T
        prediction_error=float(np.linalg.norm(pred_a-pred_b)/max(np.linalg.norm(pred_b),1e-30))
        ok=a['rank']==int(rank) and relative_gain_error<1e-6 and prediction_error<1e-6
        rec={'case':name,'rank_python':int(rank),'rank_js':a['rank'],
             'relative_gain_error':relative_gain_error,'relative_prediction_error':prediction_error,'pass':bool(ok)}
        ls_records.append(rec)
        if not ok:failures.append('joint LS: '+name)
    assert hashlib.sha256(CORE.read_bytes()).hexdigest()==source_hash,'Core changed during independent audit'
    result={'pass':not failures,'failures':failures,'cases':records,'joint_ls':ls_records,
            'algorithm_version_python':ALGORITHM_VERSION,
            'source_sha256':{'gc-sage.js':source_hash,'gc_sage.py':hashlib.sha256((REF/'gc_sage.py').read_bytes()).hexdigest()},
            'scope':'Fresh actual-JS versus independent Python; 55 cases, all fixed seeds retained; no UI or browser performance certification'}
    (out/'fresh-comparison.json').write_text(json.dumps(clean(result),indent=2)+'\n')
    print(json.dumps({'pass':result['pass'],'failures':failures,'cases':len(records),'joint_ls':ls_records},indent=2),flush=True)
    if failures:raise SystemExit(1)


if __name__=='__main__':main()
