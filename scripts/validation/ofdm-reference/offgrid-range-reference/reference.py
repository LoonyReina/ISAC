#!/usr/bin/env python3
"""Independent OFDM off-grid range teaching reference; normalized energy, SI units.
No repository code is imported. Receiver APIs accept observations and known design only.
Run: OPENBLAS_NUM_THREADS=1 python3 reference.py
"""
from __future__ import annotations
import argparse, hashlib, json, math, time
from pathlib import Path
import numpy as np

MODEL_VERSION = 'offgrid-range-model-v1'
RNG_VERSION = 'xoshiro128ss-splitmix32-fnv1a-ascii-boxmuller-v1'
MASK = 0xffffffff
C = 300_000_000.0  # Explicit rounded teaching c, matching course-core.js (not exact SI c).
N = 16
DF = 1_000_000.0
TU = 1.0 / DF
CP = TU
F = np.arange(N, dtype=float) * DF
X = np.array([1,1j,-1,-1j,1j,1,-1j,-1,-1,1j,1,-1j,1,-1,-1j,1j], dtype=complex)/4
COARSE = np.arange(25, dtype=float)*5.0
FINE = np.arange(241, dtype=float)*0.5
FIRST_NULL_M = C/(2*N*DF)
GROSS_THRESHOLD_M = FIRST_NULL_M
TIE_ULPS = 64
MAX_TRIALS = 1000

class RandomStream:
    """32-bit arithmetic matches Math.imul / >>> 0 exactly; ASCII domains only."""
    def __init__(self, seed: int, domain: str):
        if type(seed) is not int or not 0 <= seed <= MASK:
            raise ValueError('seed must be a uint32')
        if not domain or not domain.isascii():
            raise ValueError('nonempty ASCII domain required')
        h = 2166136261
        for char in domain:
            h = ((h ^ ord(char))*16777619) & MASK
        self.domain_hash = h
        z = seed ^ h
        def mix():
            nonlocal z
            z = (z+0x9e3779b9) & MASK
            v = z
            v = ((v ^ (v >> 16))*0x21f0aaad) & MASK
            v = ((v ^ (v >> 15))*0x735a2d97) & MASK
            return (v ^ (v >> 15)) & MASK
        self.state = [mix() for _ in range(4)]
        if not any(self.state):
            raise ValueError('zero PRNG state')
        self.initial_state = self.state.copy()
        self.spare = None
    def uniform(self):
        a,b,c,d = self.state
        rot = lambda v,k: ((v << k) | (v >> (32-k))) & MASK
        result = (rot((b*5)&MASK, 7)*9) & MASK
        t = (b << 9) & MASK
        c ^= a; d ^= b; b ^= c; a ^= d; c ^= t; d = rot(d,11)
        self.state = [a,b,c,d]
        return (result+0.5)/4294967296
    def normal(self):
        if self.spare is not None:
            result,self.spare = self.spare,None
            return result
        radius = math.sqrt(-2*math.log(self.uniform()))
        angle = 2*math.pi*self.uniform()
        self.spare = radius*math.sin(angle)
        return radius*math.cos(angle)

def finite_complex_vector(values, label):
    a = np.asarray(values, dtype=complex)
    if a.ndim != 1 or not len(a) or not np.all(np.isfinite(a)):
        raise ValueError(f'{label}: nonempty finite complex vector required')
    return a

def receiver_templates(x, f_hz, candidates_m, c_mps=C):
    x = finite_complex_vector(x,'x')
    f = np.asarray(f_hz, dtype=float)
    g = np.asarray(candidates_m, dtype=float)
    if f.shape != x.shape or not np.all(np.isfinite(f)):
        raise ValueError('matching finite frequencies required')
    if g.ndim != 1 or not len(g) or not np.all(np.isfinite(g)) or np.any(np.diff(g)<=0):
        raise ValueError('strictly increasing finite candidates required')
    if not math.isfinite(c_mps) or c_mps <= 0:
        raise ValueError('positive propagation speed required')
    energy = float(np.vdot(x,x).real)
    if not math.isfinite(energy) or energy <= 0:
        raise ValueError('positive known waveform energy required')
    a = x[:,None]*np.exp(-2j*np.pi*f[:,None]*(2*g[None,:]/c_mps))
    return {'templates':a,'energy':energy,'candidates':g.copy()}

def receive(y, known):
    """Profile complex LS. No truth, noise variance, RNG, true phase, or target range."""
    y = finite_complex_vector(y,'y')
    a,energy,g = known['templates'],known['energy'],known['candidates']
    if len(y) != a.shape[0]:
        raise ValueError('observation size does not match known waveform')
    fitted_gain = (a.conj().T @ y)/energy
    score = np.abs(fitted_gain)**2  # |a^H y|^2/E^2: normalized fitted-gain power.
    if not np.all(np.isfinite(score)):
        raise ValueError('nonfinite candidate score')
    max_score = float(np.max(score))
    tolerance = TIE_ULPS*np.finfo(float).eps*max(1.0,max_score)
    tied = np.flatnonzero(score >= max_score-tolerance)
    index = int(tied[0])  # Smallest range within declared numerical tie tolerance.
    fitted = complex(fitted_gain[index])
    # Direct residual sum avoids cancellation in ||y||² - |a^H y|²/E.
    residual_energy = float(np.vdot(y-fitted*a[:,index],y-fitted*a[:,index]).real)
    return {'status':'estimate','index':index,'estimateM':float(g[index]),
            'fittedGain':[fitted.real,fitted.imag],'selectedScore':float(score[index]),
            'maxScore':max_score,'tieTolerance':tolerance,'tieCount':len(tied),
            'residualEnergy':residual_energy,'scores':score}

def generate_observation(truth_m, phase_rad, snr_db, seed, trial_index):
    """Truth belongs to generator/evaluator; each trial has a separately seeded domain."""
    if not math.isfinite(truth_m) or not 0 <= truth_m <= 120:
        raise ValueError('truth outside declared search interval [0,120] m')
    if not math.isfinite(phase_rad) or not -math.pi <= phase_rad <= math.pi:
        raise ValueError('phase outside bounded interval [-pi,pi]')
    if snr_db is not None and (not math.isfinite(snr_db) or not -20<=snr_db<=20):
        raise ValueError('SNR must be null (noise-free) or within [-20,20] dB')
    if type(trial_index) is not int or not 0<=trial_index<MAX_TRIALS:
        raise ValueError('trial index outside bounded run')
    domain = f'offgrid-range-v1/noise/trial/{trial_index}'
    rng = RandomStream(seed,domain)
    standard = np.array([complex(rng.normal(),rng.normal()) for _ in range(N)])
    sigma2 = 0.0 if snr_db is None else 1.0/(N*10**(snr_db/10))
    noise = math.sqrt(sigma2/2)*standard
    alpha = complex(math.cos(phase_rad),math.sin(phase_rad))
    clean = alpha*X*np.exp(-2j*np.pi*F*(2*truth_m/C))
    return clean+noise, {'domain':domain,'domainHashUint32':rng.domain_hash,
                       'initialStateUint32':rng.initial_state,'sigma2':sigma2,
                       'noiseEnergy':float(np.vdot(noise,noise).real)}

def complex_pairs(a):
    return [[float(z.real),float(z.imag)] for z in a]

def result_metrics(result,truth_m):
    error = result['estimateM']-truth_m
    return {k:v for k,v in result.items() if k!='scores'} | {
        'signedErrorM':error,'squaredErrorM2':error**2,
        'grossError':abs(error)>GROSS_THRESHOLD_M}

def summarize(rows,key):
    successful = [r[key] for r in rows if r[key].get('status')=='estimate']
    n,len_all = len(successful),len(rows)
    if n != len_all:
        # Never quietly report a successes-only RMSE under the all-trials label.
        return {'attemptedTrials':len_all,'successfulTrials':n,'failedTrials':len_all-n,
                'rmseM':None,'biasM':None,'grossErrorCount':None,
                'status':'incomplete; failed trials retained; aggregate not reported'}
    errors = [r['signedErrorM'] for r in successful]
    se = [r['squaredErrorM2'] for r in successful]
    return {'attemptedTrials':n,'successfulTrials':n,'failedTrials':0,
            'biasM':math.fsum(errors)/n,'mseM2':math.fsum(se)/n,
            'rmseM':math.sqrt(math.fsum(se)/n),
            'grossErrorCount':sum(r['grossError'] for r in successful),
            'grossErrorFraction':sum(r['grossError'] for r in successful)/n,
            'maximumAbsErrorM':max(map(abs,errors)),
            'boundaryEstimateCount':sum(r['estimateM'] in (0,120) for r in successful),
            'status':'complete'}

def ledger():
    return {'geometry':'static monostatic; tau=2R/c', 'cMps':C,
            'cConvention':'rounded teaching constant, not exact SI c', 'toneCount':N,
            'frequencyOffsetsHz':F.tolist(),'deltaFHz':DF,'usefulDurationS':TU,
            'cpDurationS':CP,'totalBurstDurationS':TU+CP,'sampleRateHz':N*DF,
            'usefulEnergy':1,'cpEnergy':1,'totalBurstEnergy':2,
            'energyUnits':'normalized, not joules','knownWaveform':complex_pairs(X),
            'signalGainMagnitude':1,'noiselessReceivedUsefulEnergy':1,
            'bandwidthConvention':'N*deltaF nominal DFT bandwidth; endpoint span differs',
            'nominalDftBandwidthHz':N*DF,'toneEndpointSpanHz':(N-1)*DF,
            'rangeResponseFirstNullOffsetM':FIRST_NULL_M,
            'rangeResponseNullToNullWidthM':2*FIRST_NULL_M,
            'delayAmbiguityPeriodS':1/DF,'rangeAmbiguityPeriodM':C/(2*DF),
            'searchIntervalM':[0,120],'endpointPolicy':'both endpoints included, interval shorter than 150 m ambiguity period',
            'coarseGridM':COARSE.tolist(),'fineGridM':FINE.tolist(),
            'coarseGridStepM':5,'fineGridStepM':0.5,'nestedFactor':10,
            'grossErrorDefinition':'abs(estimateM-truthM)>9.375, strictly greater; all attempted trials kept',
            'grossErrorThresholdM':GROSS_THRESHOLD_M,
            'tiePolicy':'choose lowest candidate within 64*binary64_epsilon*max(1,maxScore) of maxScore',
            'targetPresence':'assumed; no absent-target trials, detection threshold, or detection claim',
            'receiverInputs':['complex Y','known X','known frequency offsets','candidate grid','c'],
            'receiverExcludes':['truth','true phase/gain','noise samples','noise variance','seed']}

def experiment(name,truth_m=43.7,phase_rad=0.7,snr_db=None,seed=2026,trials=1000,plot_trial=0):
    if type(trials) is not int or not 1<=trials<=MAX_TRIALS or not 0<=plot_trial<trials:
        raise ValueError('bounded positive trials and valid selected index required')
    known = {'coarse':receiver_templates(X,F,COARSE),'fine':receiver_templates(X,F,FINE)}
    rows=[]; plotted=None
    for index in range(trials):
        row={'trialIndex':index,'seedUint32':seed}
        try:
            y,noise_meta=generate_observation(truth_m,phase_rad,snr_db,seed,index)
            row.update(noise_meta)
            row['observation']=complex_pairs(y)
            for key in ('coarse','fine'):
                try:
                    r=receive(y,known[key])
                    row[key]=result_metrics(r,truth_m)
                    if index==plot_trial:
                        if plotted is None: plotted={'trialIndex':index}
                        plotted[key+'Scores']=r['scores'].tolist()
                except (ValueError,ArithmeticError) as error:
                    row[key]={'status':'failed','reason':str(error)}
        except (ValueError,ArithmeticError) as error:
            row['coarse']=row['fine']={'status':'failed','reason':str(error)}
        rows.append(row)
    summaries={key:summarize(rows,key) for key in ('coarse','fine')}
    paired=[r for r in rows if r['coarse']['status']=='estimate' and r['fine']['status']=='estimate']
    summaries['paired']={'successfulPairedTrials':len(paired),
        'fineLowerAbsoluteErrorCount':sum(abs(r['fine']['signedErrorM'])<abs(r['coarse']['signedErrorM'])-1e-12 for r in paired),
        'fineHigherAbsoluteErrorCount':sum(abs(r['fine']['signedErrorM'])>abs(r['coarse']['signedErrorM'])+1e-12 for r in paired),
        'equalAbsoluteErrorCount':sum(abs(abs(r['fine']['signedErrorM'])-abs(r['coarse']['signedErrorM']))<=1e-12 for r in paired),
        'nestedMaxScoreViolationCount':sum(r['fine']['maxScore']<r['coarse']['maxScore']-1e-12 for r in paired)}
    return {'schema':'offgrid-range-export-v1','modelVersion':MODEL_VERSION,'rngVersion':RNG_VERSION,
        'name':name,'settings':{'truthRangeM':truth_m,'truthPhaseRad':phase_rad,'snrDb':snr_db,
          'snrConvention':'received useful signal energy / expected total useful-window noise energy; equals per-tone SNR for equal-energy tones',
          'complexNoiseVariancePerTone':0 if snr_db is None else 1/(N*10**(snr_db/10)),
          'realNoiseVariancePerComponent':0 if snr_db is None else 1/(2*N*10**(snr_db/10)),
          'matchedFilterSignalToNoiseDb':None if snr_db is None else snr_db+10*math.log10(N),
          'seedUint32':seed,'trials':trials,'plotTrialIndex':plot_trial},
        'resources':ledger(),'summary':summaries,'plot':plotted,'trials':rows,
        'limits':['finite fixed pseudo-random trials; no universal ranking or confidence claim',
                  'two grid estimators; truth is continuous, estimator is not continuous optimization',
                  'no detection, multi-target resolution, Doppler, timing error, clutter, or calibration claim']}

SCENARIOS = [
    {'name':'noise-free-offgrid','truth_m':43.7,'snr_db':None,'seed':2026,'trials':1,'plot_trial':0},
    {'name':'high-snr-offgrid','truth_m':43.7,'snr_db':10,'seed':2026,'trials':1000,'plot_trial':0},
    {'name':'low-snr-counterexample','truth_m':25.1,'snr_db':-5,'seed':7,'trials':1000,'plot_trial':1},
]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,default=Path(__file__).parent/'fixtures')
    args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    started=time.perf_counter();summary={}
    for scenario in SCENARIOS:
        result=experiment(**scenario)
        output=args.out/(scenario['name']+'.json')
        data=json.dumps(result,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n'
        output.write_text(data)
        summary[scenario['name']]={'settings':result['settings'],'summary':result['summary'],
                                    'sha256':hashlib.sha256(data.encode()).hexdigest(),'bytes':len(data.encode())}
    summary['generationSeconds']=time.perf_counter()-started
    (args.out/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False,allow_nan=False)+'\n')
    print(json.dumps(summary,indent=2,ensure_ascii=False))

if __name__=='__main__': main()
