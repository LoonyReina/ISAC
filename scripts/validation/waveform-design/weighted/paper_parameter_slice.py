#!/usr/bin/env python3
"""Original Fig.3/4 omnidirectional parameter slice; no full-figure claim."""
import json,sys
from pathlib import Path
import numpy as np
from scipy import linalg
from reference import solve,pack,unpack,norm2,input_hash,evaluate
from experiment_helpers import cn,symbols,strict0,strict
ROOT=Path(__file__).resolve().parent
SEED=171105225; TRIALS=256
SNR=list(range(-2,13,2));RHOS=[0,.001,.003,.01,.03,.1,.3,.6,.9,1]
ANGLES=np.linspace(-90,90,361)

def rate(H,S,X,snr):
    e=np.mean(np.abs(H@X-S)**2,axis=1);p=np.mean(np.abs(S)**2,axis=1)
    return float(np.sum(np.log2(1+p/(e+10**(-snr/10)))))

def pattern(X):return strict.beampattern(X@X.conj().T/X.shape[1],ANGLES)

def stats(a):
    a=np.asarray(a);return {'mean':a.mean(axis=0).tolist(),'standardError':(a.std(axis=0,ddof=1)/np.sqrt(a.shape[0])).tolist()}

def main():
    rng=np.random.default_rng(SEED);rows=[];patterns=[];maxenergy=0;maxgap=0;hard=0
    for trial in range(TRIALS):
        H=cn(rng,(4,16));S=symbols(rng,4,20);R=np.eye(16)/16;X0=strict0(H,S,R)
        sol=solve(H,S,X0,.1,1);end=solve(H,S,X0,1,1);nearest=solve(H,S,X0,1,1,tie_break='radar-closest')
        assert sol['status']=='certified' and end['status']=='certified'
        X=unpack(sol['X']);Xe=unpack(end['X'])
        raw=linalg.pinv(H)@S;rawenergy=norm2(raw);zf=raw*np.sqrt(20/rawenergy)
        waveforms={'strictOmni':X0,'weightedRho0p1':X,'communicationEnergyOptimum':Xe,'communicationEnergyRadarClosest':unpack(nearest['X']),'declaredEqualPowerZF':zf}
        met={key:evaluate(H,S,X0,.1,1,W) for key,W in waveforms.items()}
        for m in met.values():m.pop('covariance')
        rates={key:[rate(H,S,W,dB) for dB in SNR] for key,W in waveforms.items()}
        patt={key:pattern(W) for key,W in waveforms.items()}
        patterr={key:float(np.mean((patt[key]-1)**2)) for key in patt}
        inputdata={'H':pack(H),'S':pack(S),'X0':pack(X0),'R':pack(R),'rho':.1,'Pt':1}
        assert met['weightedRho0p1']['weightedObjective']<=met['strictOmni']['weightedObjective']+1e-10
        rows.append({'trial':trial,'inputSha256':input_hash(inputdata),'metrics':met,'rate':rates,
                     'patternMSEAgainstOmniLinear':patterr,'rawZFEnergy':rawenergy,
                     'endpointBranch':end['branch'],'endpointNullCompletionEnergy':end['diagnostics']['completionEnergy'],
                     'weightedCertificate':sol['certificate']})
        patterns.append(patt)
        maxenergy=max(maxenergy,sol['metrics']['energyResidualRelative'],end['metrics']['energyResidualRelative'])
        maxgap=max(maxgap,sol['certificate']['residualBoundGap']/sol['certificate']['objectiveCertificateScale'])
        hard+=end['branch']=='hard-case-completion'
        if trial==0:
            (ROOT/'paper-first-input.json').write_text(json.dumps(inputdata,indent=2)+'\n')
            (ROOT/'paper-first-solutions.json').write_text(json.dumps({'weighted':sol,'endpoint':end,'radarClosestEndpoint':nearest,'strict':pack(X0),'declaredEqualPowerZF':pack(zf),'anglesDeg':ANGLES.tolist(),'rawPatterns':{k:v.tolist() for k,v in patt.items()}},indent=2)+'\n')
    methods=list(rows[0]['rate']);summary={}
    for m in methods:
        summary[m]={'rate':stats([r['rate'][m] for r in rows]),'mui':stats([r['metrics'][m]['mui'] for r in rows]),'radarWaveformDistance':stats([r['metrics'][m]['radarWaveformDistance'] for r in rows]),'weightedObjective':stats([r['metrics'][m]['weightedObjective'] for r in rows]),'patternMSEAgainstOmniLinear':stats([r['patternMSEAgainstOmniLinear'][m] for r in rows]),'rawPattern':stats([p[m] for p in patterns])}
    paired={}
    for m in ['strictOmni','declaredEqualPowerZF']:
        paired['weightedRho0p1-minus-'+m]={'rate':stats([np.array(r['rate']['weightedRho0p1'])-r['rate'][m] for r in rows]),'mui':stats([r['metrics']['weightedRho0p1']['mui']-r['metrics'][m]['mui'] for r in rows])}
    out={'status':'computed-original-parameter-omnidirectional-slice-not-full-figure-reproduction',
         'source':'https://arxiv.org/pdf/1711.05220v1','locators':'Section IV Eq16-25 Algorithm1; Section VI-A Fig3/4',
         'seed':SEED,'generator':'numpy PCG64/default_rng','trials':TRIALS,'N':16,'K':4,'L':20,'Pt':1,
         'channel':'iid CN(0,1); exact known flat channel, fixed in frame','symbols':'iid unit-power QPSK',
         'rho':.1,'snrDb':SNR,'snrGridEvidence':'-2,0,2,4,6,8,10,12 dB points visible in source Fig.3',
         'rateDefinition':'sum log2(1+per-user mean symbol power/(per-user mean residual power+N0)); N0=Pt/10^(SNRdB/10)',
         'rateWarning':'Gaussian log diagnostic, not QPSK true mutual information or globally optimized sum rate',
         'patternDefinition':'a(theta)^H (XX^H/L) a(theta), a_n=exp(j pi n sin(theta)); no per-curve peak normalization',
         'anglesDeg':ANGLES.tolist(),'summaries':summary,'pairedDifferences':paired,
         'zeroMUIAnalyticRate':[float(4*np.log2(1+10**(dB/10))) for dB in SNR],
         'weightedMUIWinCountVsStrict':sum(r['metrics']['weightedRho0p1']['mui']<r['metrics']['strictOmni']['mui'] for r in rows),
         'weightedRateWinCountsVsStrict':[sum(r['rate']['weightedRho0p1'][j]>r['rate']['strictOmni'][j] for r in rows) for j in range(len(SNR))],
         'rhoOneHardCompletionTrials':hard,'maximumEnergyRelativeResidual':maxenergy,'maximumWeightedCertificateRelativeGap':maxgap,
         'rawZFBlockEnergy':stats([r['rawZFEnergy'] for r in rows]),
         'endpointTieBreak':'communicationEnergyOptimum is canonical; communicationEnergyRadarClosest adds an explicit secondary radar-distance tie break at equal primary optimum.',
         'baselineLimit':'ZF = sqrt(E/||H†S||²) H†S is disclosed comparison. Source normalization and receiver gain treatment unresolved.',
         'missingOriginalDetails':['Original seed and trial count/averaging','Whether Fig4 is single realization or average','Original ZF normalization/receiver gain convention','Directional least-squares R target profile/grid/weights/constraints; directional original curves not reproduced','Fig5 detection probability model/normalization; Fig6 pattern MSE angular weighting'],
         'trialsDetail':rows}
    (ROOT/'paper-parameter-slice.json').write_text(json.dumps(out,indent=2,allow_nan=False)+'\n')
    print(json.dumps({k:out[k] for k in ['status','trials','weightedMUIWinCountVsStrict','rhoOneHardCompletionTrials','maximumEnergyRelativeResidual','maximumWeightedCertificateRelativeGap','rawZFBlockEnergy']},indent=2))
    print('10 dB metrics:')
    for m in methods: print(m, 'rate',summary[m]['rate']['mean'][6], 'MUI',summary[m]['mui']['mean'],'distance',summary[m]['radarWaveformDistance']['mean'])
    # Reduced rho sweep (source N,L,Pt and K set, own trial count and radar proxy).
    rng=np.random.default_rng(SEED+1);sweep=[]
    for k in [4,6,8]:
        for trial in range(64):
            H=cn(rng,(k,16));S=symbols(rng,k,20);X0=strict0(H,S,np.eye(16)/16)
            curves=[]
            for rho in RHOS:
                sol=solve(H,S,X0,rho,1,tie_break='radar-closest');assert sol['status']=='certified'
                X=unpack(sol['X']);m=sol['metrics']
                curves.append({'rho':rho,'mui':m['mui'],'radarWaveformDistance':m['radarWaveformDistance'],'ratePerUser10dB':rate(H,S,X,10)/k,'linearPatternMSE':float(np.mean((pattern(X)-1)**2)),'branch':sol['branch']})
            mui=np.array([x['mui'] for x in curves]);dist=np.array([x['radarWaveformDistance'] for x in curves])
            assert np.all(np.diff(mui)<=1e-8) and np.all(np.diff(dist)>=-1e-8)
            sweep.append({'K':k,'trial':trial,'curves':curves,'H':pack(H) if trial==0 else None,'S':pack(S) if trial==0 else None})
    sweepsummary={str(k):{metric:stats([[c[metric] for c in r['curves']] for r in sweep if r['K']==k]) for metric in ['mui','radarWaveformDistance','ratePerUser10dB','linearPatternMSE']} for k in [4,6,8]}
    (ROOT/'rho-sweep.json').write_text(json.dumps({'status':'reduced-weighted-objective-sweep-not-Fig5-or-Fig6-reproduction','seed':SEED+1,'trialsPerK':64,'tieBreak':'radar-closest explicit secondary objective; prior canonical endpoint sweep retained under revisions/v2-canonical-validated','rho':RHOS,'N':16,'L':20,'Pt':1,'K':[4,6,8],'sourceProvenance':'Strict isotropic X0 from original H/S per trial; same inputs across rho','radarProxyWarning':'Waveform-distance and raw-pattern-MSE diagnostics; no detection probability and not original directional MSE figure','summary':sweepsummary,'trials':sweep},indent=2,allow_nan=False)+'\n')
    print('rho sweep: 1920 freshly solved points; all 192 paired MUI/deviation monotonicity checks passed')
if __name__=='__main__':main()
