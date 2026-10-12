#!/usr/bin/env python3
"""Independent numerical checks: residual LS, analytic kernel, units, RNG/exports.
This validates the standalone reference, not a future browser implementation.
"""
import hashlib, inspect, json, math, time
from pathlib import Path
import numpy as np
import reference as ref

ROOT=Path(__file__).parent
checks=[]
def check(name, predicate, detail=None):
    if not bool(predicate): raise AssertionError(name+': '+str(detail))
    checks.append({'name':name,'passed':True,'detail':detail})
def close(a,b,atol=1e-10): return np.allclose(a,b,atol=atol,rtol=0)

def direct_real_lstsq(y,x,f,grid):
    # Independently construct the real 2N x 2 design and use SVD least squares.
    out=[]
    for r in grid:
        a=np.array([complex(xk)*complex(math.cos(-4*math.pi*fk*r/ref.C), math.sin(-4*math.pi*fk*r/ref.C)) for xk,fk in zip(x,f)])
        design=np.column_stack((np.r_[a.real,a.imag],np.r_[-a.imag,a.real]))
        data=np.r_[y.real,y.imag]
        gain,*_=np.linalg.lstsq(design,data,rcond=None)
        residual=data-design@gain
        out.append({'gain':gain,'residual':float(residual@residual),'score':float(gain@gain)})
    residuals=np.array([r['residual'] for r in out])
    return out,int(np.argmin(residuals))

def analytic_kernel(offset):
    # Geometric-series response for k=0..N-1; r - R positive uses positive phase.
    q=2*ref.DF*offset/ref.C
    if abs(q-round(q))<1e-14: return 1+0j
    return np.exp(1j*math.pi*(ref.N-1)*q)*math.sin(math.pi*ref.N*q)/(ref.N*math.sin(math.pi*q))

start=time.perf_counter()
check('receiver signature has no truth/gain/noise inputs',list(inspect.signature(ref.receive).parameters)==['y','known'])
check('unit energy known waveform',np.vdot(ref.X,ref.X).real==1)
check('two nested grids same closed endpoints',np.array_equal(ref.COARSE,ref.FINE[::10]) and ref.FINE[0]==0 and ref.FINE[-1]==120)
check('search strictly shorter than one ambiguity period',120<ref.C/(2*ref.DF)==150)
check('physical first-null/period and maximum delay',ref.FIRST_NULL_M==9.375 and 2*120/ref.C==8e-7 and 2*120/ref.C<ref.CP)
check('nominal and endpoint bandwidth are distinct',ref.N*ref.DF==16e6 and ref.F[-1]-ref.F[0]==15e6)
useful=np.fft.ifft(ref.X,norm='ortho')
check('Parseval useful and full-symbol CP energy',close(np.vdot(useful,useful).real,1) and close(np.vdot(np.r_[useful,useful],np.r_[useful,useful]).real,2))
# A rectangular OFDM burst is not strictly bandlimited; nominal occupied-bin bandwidth is used.
check('fixed CP and duration ledger',ref.TU==1e-6 and ref.CP==1e-6 and ref.ledger()['totalBurstDurationS']==2e-6)

known=ref.receiver_templates(ref.X,ref.F,ref.FINE)
y,meta=ref.generate_observation(43.7,.7,None,2026,0)
received=ref.receive(y,known)
expected=np.exp(.7j)*np.array([analytic_kernel(r-43.7) for r in ref.FINE])
actual=(known['templates'].conj().T@y)
check('noise-free complex response equals analytic geometric sum',close(actual,expected,2e-14),float(np.max(np.abs(actual-expected))))
for offset in [ref.FIRST_NULL_M,-ref.FIRST_NULL_M]:
    a=ref.receiver_templates(ref.X,ref.F,[43.7+offset])
    check(f'first-null response at offset {offset}',ref.receive(y,a)['maxScore']<1e-26)
alias=ref.X*np.exp(.7j)*np.exp(-2j*np.pi*ref.F*2*(43.7+150)/ref.C)
check('sampled delay periodicity at +150m',close(alias,y,5e-14))
check('search endpoints are distinct observations',not close(known['templates'][:,0],known['templates'][:,-1],1e-3))

alpha=.3*np.exp(1.37j);on_grid=alpha*known['templates'][:,73]
r=ref.receive(on_grid,known)
check('arbitrary complex nuisance gain is fitted',r['estimateM']==36.5 and close(r['fittedGain'],[alpha.real,alpha.imag]) and r['residualEnergy']<1e-28)
yn,_=ref.generate_observation(25.1,.7,-5,7,1)
r0=ref.receive(yn,known);r1=ref.receive(yn*np.exp(2.17j),known)
check('global observation phase rotation leaves range/score unchanged',r0['index']==r1['index'] and close(r0['scores'],r1['scores'],5e-14))
zero=ref.receive(np.zeros(ref.N,dtype=complex),known)
check('all-zero observation preserves declared tie convention',zero['estimateM']==0 and zero['tieCount']==241)
mid, _=ref.generate_observation(42.5,.7,None,2026,0)
coarse_mid=ref.receive(mid,ref.receiver_templates(ref.X,ref.F,ref.COARSE))
check('symmetric midpoint numerical tie chooses lower range',coarse_mid['estimateM']==40 and coarse_mid['tieCount']==2,coarse_mid['tieCount'])
for ytest in [np.ones(15), np.r_[np.nan,np.zeros(15)],np.r_[np.inf,np.zeros(15)]]:
    try: ref.receive(ytest,known);raise AssertionError('invalid input accepted')
    except ValueError: pass
check('invalid/nonfinite observations reject, not silently clipped',True)
try: ref.receiver_templates(np.zeros(16),ref.F,ref.COARSE);raise AssertionError('zero x accepted')
except ValueError: pass
check('zero known waveform energy rejects',True)

# Selected-realization independent objective verification, all candidates.
for name,yt in [('noiseless',y),('noisy-index1',yn)]:
    direct,minimum=direct_real_lstsq(yt,ref.X,ref.F,ref.FINE)
    r=ref.receive(yt,known)
    check(name+' SVD real LS grid winner equals profile receiver',float(ref.FINE[minimum])==r['estimateM'])
    check(name+' all SVD LS scores match profile scores',close([d['score'] for d in direct],r['scores'],2e-13))
    check(name+' projected and direct residual energies match',abs(direct[minimum]['residual']-r['residualEnergy'])<2e-13)

# Verify serialized rows, all aggregates, common-input rescores, determinism.
for scenario in ref.SCENARIOS:
    path=ROOT/'fixtures'/(scenario['name']+'.json')
    data=json.loads(path.read_text());rows=data['trials'];cfg=data['settings']
    check(scenario['name']+' attempted rows preserved',len(rows)==cfg['trials'])
    check(scenario['name']+' distinct RNG domains/states',len({tuple(r['initialStateUint32']) for r in rows})==len(rows))
    for key in ['coarse','fine']:
        error=np.array([row[key]['estimateM']-cfg['truthRangeM'] for row in rows])
        summary=data['summary'][key]
        check(scenario['name']+' '+key+' RMSE recomputes from all rows',abs(math.sqrt(float(np.mean(error**2)))-summary['rmseM'])<2e-13)
        check(scenario['name']+' '+key+' gross-count recomputes before any trimming',sum(abs(error)>ref.GROSS_THRESHOLD_M)==summary['grossErrorCount'])
        check(scenario['name']+' '+key+' signed errors retained',close(error,[row[key]['signedErrorM'] for row in rows],0))
    for i in sorted(set([0,min(1,len(rows)-1),len(rows)-1])):
        again,_=ref.generate_observation(cfg['truthRangeM'],cfg['truthPhaseRad'],cfg['snrDb'],cfg['seedUint32'],i)
        check(scenario['name']+f' row {i} deterministic observation replay',ref.complex_pairs(again)==rows[i]['observation'])
        for key,grid in [('coarse',ref.COARSE),('fine',ref.FINE)]:
            rx=ref.receive(again,ref.receiver_templates(ref.X,ref.F,grid))
            check(scenario['name']+f' row {i} {key} same-observation replay',rx['estimateM']==rows[i][key]['estimateM'])
    check(scenario['name']+' nested raw max objective nondecreasing',all(row['fine']['maxScore']>=row['coarse']['maxScore']-1e-12 for row in rows))
low=json.loads((ROOT/'fixtures/low-snr-counterexample.json').read_text())
check('fixed low-SNR teaching sample has larger fine RMSE',low['summary']['fine']['rmseM']>low['summary']['coarse']['rmseM'])
check('fixed low-SNR sample has fine worse on 649 trials',low['summary']['paired']['fineHigherAbsoluteErrorCount']==649)
check('same high error/boundary outcomes retained',low['summary']['coarse']['maximumAbsErrorM']==94.9 and low['summary']['fine']['maximumAbsErrorM']==94.9)
check('failure rows invalidate complete aggregate rather than disappear',ref.summarize([{'x':{'status':'failed','reason':'injected verification failure'}}],'x')['rmseM'] is None)
failed=ref.experiment('invalid-truth-verification',truth_m=121,trials=2)
check('generator failure preserves every attempted trial',len(failed['trials'])==2 and failed['summary']['coarse']['failedTrials']==2 and failed['summary']['fine']['rmseM'] is None)

# PRNG portable fixtures include edge seeds and every output needed for a port check.
rng_fixtures=[]
for seed in [0,7,2026,ref.MASK]:
    for index in [0,1,999]:
        domain=f'offgrid-range-v1/noise/trial/{index}'
        rng=ref.RandomStream(seed,domain);initial=rng.initial_state.copy();uniform=[rng.uniform() for _ in range(8)]
        rng=ref.RandomStream(seed,domain);normal=[rng.normal() for _ in range(32)]
        rng_fixtures.append({'seedUint32':seed,'domain':domain,'domainHashUint32':rng.domain_hash,'initialStateUint32':initial,'uniform':uniform,'normal':normal})
(ROOT/'fixtures/rng-port-fixtures.json').write_text(json.dumps({'rngVersion':ref.RNG_VERSION,'fixtures':rng_fixtures},indent=2)+'\n')
check('uniforms avoid closed endpoints',all(0<u<1 for v in rng_fixtures for u in v['uniform']))
# Distribution sanity is a diagnostic, not a proof of PRNG independence or normality.
values=[]
for i in range(1000):
    rng=ref.RandomStream(7,f'offgrid-range-v1/noise/trial/{i}')
    values.append([rng.normal() for _ in range(32)])
values=np.array(values);flat=values.ravel()
noise_diag={'drawCount':len(flat),'mean':float(flat.mean()),'variance':float(flat.var()),
            'lagOneCorrelation':float(np.corrcoef(flat[:-1],flat[1:])[0,1]),
            'sameToneAdjacentTrialCorrelation':float(np.corrcoef(values[:-1,0],values[1:,0])[0,1])}
check('bounded Gaussian-stream sanity (not a proof)',abs(noise_diag['mean'])<.03 and abs(noise_diag['variance']-1)<.05,noise_diag)
report={'referenceVersion':ref.MODEL_VERSION,'passedChecks':len(checks),'checks':checks,
        'runtimeSeconds':time.perf_counter()-start,'noiseDiagnostic':noise_diag,
        'scope':'standalone independent Python reference and serialized fixtures; future JS/browser implementation not checked'}
(ROOT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2,allow_nan=False)+'\n')
print(json.dumps({'passedChecks':len(checks),'runtimeSeconds':report['runtimeSeconds'],'noiseDiagnostic':noise_diag},indent=2))
