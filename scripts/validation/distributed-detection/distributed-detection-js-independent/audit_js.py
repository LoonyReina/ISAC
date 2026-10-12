#!/usr/bin/env python3
"""Portable independent audit of the actual two-station JS implementation.
Usage: python audit_js.py --core /path/to/distributed-detection-core.js
Writes only beside this audit. Requires Node, mpmath, NumPy and SciPy.
"""
from __future__ import annotations
import argparse, hashlib, json, math, pathlib, subprocess, sys
import mpmath as mp
import numpy as np
import scipy
from scipy.stats import binomtest
from oracle import tail, quantile, parameters, energy_log_lrt
ROOT=pathlib.Path(__file__).resolve().parent
mp.mp.dps=100

def exact(x): return mp.mpf(float(x))
def encodez(z): return [[float(v.real),float(v.imag)] for v in z]
def decodez(z): return np.array([complex(*v) for v in z])
def near(a,b,rtol=2e-12,atol=1e-14):
    assert math.isclose(float(a),float(b),rel_tol=rtol,abs_tol=atol),(a,b)

def payload():
    fixtures=json.loads((ROOT/'high-precision-fixtures.json').read_text())['cases']
    calibration=[{k:float(v[k]) for k in ['rho','kappa','pfa']} for v in fixtures]
    tails=[{'t':x,'u':1.,'v':ratio} for ratio in [0,1e-20,1e-12,1e-6,.25,.9,1-1e-12,1] for x in [1e-15,1e-12,1e-6,.01,.1,1,10,100,1000]]
    # Additional tests preserve common scale over 200 orders of magnitude.
    tails += [{'t':scale*x,'u':scale,'v':scale*ratio} for scale in [1e-100,1e100] for ratio in [0,.75,1-1e-12,1] for x in [1e-12,1,100]]
    rng=np.random.default_rng(4371109);quadratics=[]
    for rho in [1e-10,.001,3,1e4]:
        for k in [0,1e-8,.75,1-1e-12,1]:
            for _ in range(12):
                z=rng.normal(size=2)+1j*rng.normal(size=2)
                th=rng.uniform(-math.pi,math.pi,size=2)
                quadratics.append({'rho':rho,'kappa':k,'z':encodez(z),'rotated':encodez(z*np.exp(1j*th)),'phase':float(th[0]-th[1]),'common':encodez(z*np.exp(1j*th[0]))})
    # Cancellation near rank-one nullspace and observation-scale extremes.
    for rho in [1e-10,3,1e4]:
        for z in [np.array([2+3j,-2-3j]),np.array([2+3j,-2-3j+1e-10]),np.array([1e-100+1e-100j,1e-100-1e-100j]),np.array([1e90+1e90j,-1e90+1e90j])]:
            th=np.array([.31,-.82]);quadratics.append({'rho':rho,'kappa':1.,'z':encodez(z),'rotated':encodez(z*np.exp(1j*th)),'phase':float(th[0]-th[1]),'common':encodez(z*np.exp(1j*th[0]))})
    rng=np.random.default_rng(41917);raw=[]
    for length in [1,2,5,11]:
        s=rng.normal(size=length)+1j*rng.normal(size=length);E=np.vdot(s,s).real;noise=.7
        for rho,k in [(0,.75),(.02,0),(3,.75),(3,1)]:
            y=rng.normal(size=(2,length))+1j*rng.normal(size=(2,length))
            res=rng.normal(size=(2,length))+1j*rng.normal(size=(2,length))
            for i in range(2):res[i]-=s*np.vdot(s,res[i])/E
            raw.append({'rho':rho,'kappa':k,'noise':noise,'s':encodez(s),'y':[encodez(v) for v in y],'residualY':[encodez(v) for v in y+res],'phaseS':encodez(s*np.exp(.71j))})
    ledgers=[{'length':L,'options':{'blocks':B,'templateMode':mode,'bitsPerReal':bits,'modelDownRealsPerUpdate':M,'modelUpdates':U}} for L,B,M,U,bits in [(16,10,0,0,None),(16,7,6,2,32),(1,1,2,3,1),(4096,127,13,9,128)] for mode in ['per_block','once','cached']]
    return {'calibration':calibration,'tails':tails,'quadratics':quadratics,'raw':raw,'ledgers':ledgers,'phaseIntegration':[[2,2],[4,0],[.3,1.7]],'wilson':[{'successes':s,'trials':n,'z':z} for n in [1,2,10,100,100000] for s in sorted(set([0,1,n//2,n-1,n])) for z in [1.,1.959963984540054,2.5758293035489004]],'trials':300000}

parser=argparse.ArgumentParser();parser.add_argument('--core',required=True);args=parser.parse_args()
core=pathlib.Path(args.core).resolve();before=hashlib.sha256(core.read_bytes()).hexdigest()
P=payload();(ROOT/'audit-input.json').write_text(json.dumps(P,indent=2)+'\n')
run=subprocess.run(['node',str(ROOT/'run_core.cjs'),str(core)],input=json.dumps(P),text=True,capture_output=True)
if run.returncode:
    # Relative reproduction hints; no host-specific absolute paths in published output.
    err=run.stderr.replace(str(core),core.name).replace(str(ROOT),'AUDIT_DIR')
    print(err,file=sys.stderr);raise SystemExit(run.returncode)
O=json.loads(run.stdout);(ROOT/'actual-js-results.json').write_text(json.dumps(O,indent=2)+'\n')
checks=[]
def check(name,fn):
    try:detail=fn();checks.append({'name':name,'passed':True,'detail':detail})
    except Exception as e:checks.append({'name':name,'passed':False,'error':str(e)})
    print(name,'PASS' if checks[-1]['passed'] else 'FAIL',flush=True)

def calibration():
    maxima={'thresholdRelative':0.,'energyThresholdRelative':0.,'logPfaRelative':0.,'pdAbsolute':0.,'energyPdAbsolute':0.,'missRelative':0.,'energyMissRelative':0.};intentMax=0.;worst={}
    fixtures=json.loads((ROOT/'high-precision-fixtures.json').read_text())['cases']
    for inp,observed,intended in zip(P['calibration'],O['calibration'],fixtures):
        rho,k,p=map(exact,(inp['rho'],inp['kappa'],inp['pfa']));a,b,c=parameters(rho,k)
        te=quantile(p,1,1);tq=mp.mpf(0) if rho==0 else quantile(p,*a)
        pd=p if rho==0 else tail(tq,*b);pe=p if rho==0 else tail(te,*c)
        metrics={'energyThresholdRelative':abs(exact(observed['energyThreshold'])/te-1),'pdAbsolute':abs(exact(observed['jointPd'])-pd),'energyPdAbsolute':abs(exact(observed['energySumPd'])-pe),'missRelative':abs(exact(observed['jointMiss'])/(1-pd)-1),'energyMissRelative':abs(exact(observed['energySumMiss'])/(1-pe)-1)}
        if rho==0:
            assert observed['jointThreshold']==0 and observed['jointPd']==float(p) and observed['jointTieRandomization']==float(p)
        else:
            metrics.update(thresholdRelative=abs(exact(observed['jointThreshold'])/tq-1),logPfaRelative=abs(mp.log(tail(exact(observed['jointThreshold']),*a))/mp.log(p)-1))
            assert observed['jointPd']+5e-14>=observed['energySumPd'],inp
            intentMax=max(intentMax,float(abs(exact(observed['jointThreshold'])/mp.mpf(intended['joint_threshold'])-1)))
            if k==0:near(observed['jointPd'],observed['energySumPd'],2e-13,0)
            if k==1:near(observed['jointPd'],mp.power(p,1/(1+2*rho)),2e-13,0)
        for key,value in metrics.items():
            value=float(value)
            if value>maxima[key]:maxima[key]=value;worst[key]=inp
            assert value<5e-13,(key,inp,value)
        near(observed['logLrThreshold'],tq-mp.log(c[0])-mp.log(c[1]),2e-12,1e-14)
    return {'cases':len(P['calibration']),'maxErrors':maxima,'worstCases':worst,'maxThresholdRelativeDifferenceFromExactDecimalIntent':intentMax,'oracleInputs':'Exact binary64 values passed to JavaScript; fixture decimal intent retained separately','scope':'336 inherited independent fixture parameter points, recomputed by 100-digit independent scalar oracle'}

def tails():
    worstLog=worstCdf=worstSurv=0.
    for inp,obs in zip(P['tails'],O['tails']):
        t,u,v=map(exact,(inp['t'],inp['u'],inp['v']));surv=tail(t,u,v);lg=mp.log(surv);cdf=1-surv
        eLog=float(abs(exact(obs['logTail'])/lg-1));eCdf=float(abs(exact(obs['cdf'])/cdf-1));eSurv=float(abs(exact(obs['tail'])-surv))
        worstLog=max(worstLog,eLog);worstCdf=max(worstCdf,eCdf);worstSurv=max(worstSurv,eSurv)
        assert eLog<5e-13 and eCdf<5e-13 and eSurv<5e-14,(inp,obs,eLog,eCdf)
        assert obs['tail']==obs['swapped'],inp
    return {'cases':len(P['tails']),'maxLogTailRelativeError':worstLog,'maxLowerCdfRelativeError':worstCdf,'maxSurvivalAbsoluteError':worstSurv,'nearEqualWeights':'Actual distinct weights retained, no equal-weight snapping','scales':[1e-100,1,1e100]}

def quadratics():
    worstQ=worstPhase=worstMatrix=0.;nullspace=[];changes=0
    for i,(inp,obs) in enumerate(zip(P['quadratics'],O['quadratics'])):
        z=[mp.mpc(exact(a),exact(b)) for a,b in inp['z']];rho,k=map(exact,(inp['rho'],inp['kappa']));a,b,c=parameters(rho,k)
        eigenExpected=a[0]*abs(z[0]+z[1])**2/2+a[1]*abs(z[0]-z[1])**2/2
        cov=mp.matrix([[1+rho,rho*k],[rho*k,1+rho]]);Z=mp.matrix(z)
        expected=mp.re((Z.transpose_conj()*(mp.eye(2)-cov**-1)*Z)[0])
        llr=expected-mp.log(mp.det(cov));near(obs['q'],expected,2e-12,1e-25);near(obs['logLr'],llr,2e-12,1e-25)
        energy=float(sum(abs(t)**2 for t in z));errorScale=max(1e-300,energy*max(float(a[0]),float(a[1])))
        eQ=abs(obs['q']-float(expected))/errorScale;ePhase=abs(obs['rotated']-obs['q'])/errorScale;eMatrix=abs(obs['matrix']-obs['q'])/errorScale
        assert ePhase<5e-13 and eMatrix<5e-13,(i,inp,ePhase,eMatrix)
        near(obs['common'],obs['q'],2e-12,errorScale*5e-13)
        assert obs['q']>=0
        worstQ=max(worstQ,eQ);worstPhase=max(worstPhase,ePhase);worstMatrix=max(worstMatrix,eMatrix)
        near(obs['sum'],energy,2e-13,1e-250)
        if inp['kappa']>0 and abs(obs['changedDataOnly']-obs['q'])>1e-8:changes+=1
        if eigenExpected==0:nullspace.append({'rho':inp['rho'],'q':obs['q'],'matrix':obs['matrix']})
    assert changes>0
    return {'cases':len(P['quadratics']),'maxQScaledAbsoluteError':worstQ,'maxCovariancePhaseScaledAbsoluteError':worstPhase,'maxMatrixScaledAbsoluteError':worstMatrix,'scale':'sum energy times maximum H0 weight; avoids misleading relative errors at nullspace','rankOneNullspace':nullspace,'singleStationDataOnlyRotationChangesDetected':changes}

def raw():
    worst=0.;zWorst=0.
    for inp,obs in zip(P['raw'],O['raw']):
        s=decodez(inp['s']);y=np.array([decodez(v) for v in inp['y']]);L=len(s);E=np.vdot(s,s).real;noise=inp['noise'];rho=inp['rho'];k=inp['kappa']
        c0=noise*np.eye(2*L,dtype=complex);R=np.array([[1,k],[k,1]]);c1=c0+(rho*noise/E)*np.kron(R,np.outer(s,s.conj()));Y=y.reshape(-1)
        # Independent dense complex Gaussian density, no matched-output/eigen formula.
        llr=float((np.vdot(Y,np.linalg.solve(c0,Y))-np.vdot(Y,np.linalg.solve(c1,Y))).real-np.linalg.slogdet(c1)[1]+np.linalg.slogdet(c0)[1])
        expected=y@s.conj()/math.sqrt(noise*E);actual=decodez(obs['z']);zWorst=max(zWorst,float(max(abs(expected-actual))))
        assert np.allclose(expected,actual,rtol=2e-13,atol=2e-13)
        assert np.allclose(actual,decodez(obs['residualZ']),rtol=2e-13,atol=2e-13)
        near(obs['llr'],llr,2e-11,1e-11);worst=max(worst,abs(obs['llr']-llr))
        near(obs['llr'],obs['residualLlr'],2e-12,1e-12);near(obs['llr'],obs['phaseLlr'],2e-12,1e-12)
    return {'cases':len(P['raw']),'maxDenseLogLrAbsoluteError':worst,'maxMatchedOutputAbsoluteError':zWorst,'checks':['full 2L-by-2L covariance','orthogonal residual perturbation','common waveform phase','known complex noise-power normalization']}

def counterexamples():
    p,m=O['counterexample'];assert p['e']==m['e'];near(p['q'],3.36);near(m['q'],12/7)
    assert p['joint'] and not m['joint'] and not p['energy'] and not m['energy']
    values=[]
    for row in O['phaseIntegration']:
        integral=float(np.mean(np.exp(row['values'])));truth=energy_log_lrt(*row['e'],3,.75)
        near(math.log(integral),truth,2e-12,1e-12);values.append(float(truth))
    assert values[0]>values[1]
    return {'sameEnergyComplexStatistics':[p['q'],m['q']],'jointDecisions':[p['joint'],m['joint']],'sameSumEnergyDomainLogLr':values[:2],'phaseIntegrationPointsPerCase':4096,'interpretation':'Energy sum is not the optimal two-energy-message detector when rho*kappa>0; no optimal-energy ROC claimed'}

def ledger():
    for inp,observed in zip(P['ledgers'],O['ledgers']):
        L=inp['length'];o=inp['options'];B=o['blocks'];updates={'per_block':B,'once':1,'cached':0}[o['templateMode']];td=4*L*updates;md=o['modelDownRealsPerUpdate']*o['modelUpdates']
        assert observed['receivers']==2 and observed['length']==L and observed['blocks']==B and observed['templateUpdates']==updates
        for name,up,down,extra in [('centralRaw',4*L*B,0,0),('localComplexMatch',4*B,td,md),('localEnergySum',2*B,td,md)]:
            row=observed['schemes'][name];total=up+down+extra
            assert row['upReals']==up and row['templateDownReals']==down and row['modelDownReals']==extra and row['totalReals']==total
            assert row['averageRealsPerBlock']==total/B and row['payloadBits']==(None if o['bitsPerReal'] is None else total*o['bitsPerReal'])
    return {'cases':len(P['ledgers']),'scope':'Two-receiver star-unicast scalar payload only; no finite-bit losslessness, latency, hardware, computation or measured traffic claim'}

def monte_carlo():
    mc=O['monteCarlo'];N=mc['trialsPerHypothesis'];rows=[];a,b,c=parameters(3,.75);t=quantile('.05',*a);te=quantile('.05',1,1)
    for row in mc['rows']:
        out={'hypothesis':row['hypothesis']}
        for name,count,target in [('joint',row['jointCount'],.05 if row['hypothesis']=='H0' else float(tail(t,*b))),('energy',row['energyCount'],.05 if row['hypothesis']=='H0' else float(tail(te,*c)))]:
            interval=binomtest(count,N).proportion_ci(.99)
            assert interval.low<=target<=interval.high,(name,row,count/N,target,interval)
            out[name]={'count':count,'rate':count/N,'analytic':target,'exact99pctInterval':[interval.low,interval.high]}
        rows.append(out)
    return {'seed':mc['seed'],'generator':'Independent xorshift32 uniform, Box-Muller complex CN, Cholesky correlated amplitude; actual exported JS decision functions','trialsPerHypothesis':N,'interval':'99% exact Clopper-Pearson, pointwise not simultaneous','rows':rows}

def generator():
    data=O['rawGenerator'];N=data['trialsPerHypothesis'];worst=0.
    for row in data['rows']:
        diag=4 if row['hypothesis']=='H1' else 1;cross=2.25 if row['hypothesis']=='H1' else 0
        truth=[diag,diag,cross,0];sigma=[diag/math.sqrt(N)]*2+[math.sqrt((diag*diag+cross*cross)/(2*N)),math.sqrt((diag*diag-cross*cross)/(2*N))]
        errors=[abs(x-t)/sd for x,t,sd in zip(row['covariance'],truth,sigma)]
        errors.extend(abs(x)/math.sqrt(diag/(2*N)) for x in row['means'])
        errors.extend(abs(x)/(diag/math.sqrt(N)) for x in row['pseudoCovariance'][:4])
        errors.extend(abs(x)/math.sqrt((diag*diag+cross*cross)/(2*N)) for x in row['pseudoCovariance'][4:])
        worst=max(worst,max(errors));assert max(errors)<6,(row,errors);assert row['truthLeaks']==0
    return {'seed':data['seed'],'trialsPerHypothesis':N,'rows':data['rows'],'maxMomentErrorInStandardErrors':worst,'tolerance':'Prespecified six standard errors per component; raw generator moments and properness, not rare-tail verification'}

def waveform_endpoints():
    data=O['waveformEndpoints'];assert data['cases']==8192 and data['maxRelativeEnergyError']<8e-16
    worst=0.
    for row in O['matchedScaleEndpoints']:
        truth=math.sqrt(row['measuredEnergy']/row['noise']);value=row['matched'];near(value[0],truth,8e-16,0);assert value[1]==0
        worst=max(worst,abs(value[0]/truth-1))
    return {'waveformEndpointCases':data['cases'],'maxRelativeEnergyError':data['maxRelativeEnergyError'],'matchedNoiseEnergyScaleCases':len(O['matchedScaleEndpoints']),'maxMatchedRelativeError':worst,'note':'QPSK helper may move generated amplitude one representable step inward to respect inclusive energy domain; supplied values are never clipped'}

def wilson():
    worst=0.
    for row,obs in zip(P['wilson'],O['wilson']):
        n=mp.mpf(row['trials']);s=mp.mpf(row['successes']);z=exact(row['z']);p=s/n;denom=1+z*z/n
        center=(p+z*z/(2*n))/denom;radius=z*mp.sqrt(p*(1-p)/n+z*z/(4*n*n))/denom
        expected=[max(mp.mpf(0),center-radius),min(mp.mpf(1),center+radius)]
        for a,b in zip(obs,expected):near(a,b,2e-12,2e-15);worst=max(worst,float(abs(exact(a)-b)))
        if s==0:assert obs[0]==0
        if s==n:assert obs[1]==1
        assert 0<=obs[0]<=obs[1]<=1
    return {'cases':len(P['wilson']),'maxAbsoluteError':worst,'exactEndpoints':True,'method':'Independent 100-digit Wilson score expression'}

def guards():
    failed=[x for x in O['guards'] if not x['passed']]
    assert not failed,failed
    return {'cases':len(O['guards']),'allPassed':True,'checks':O['guards'],'independenceLimit':'Function interfaces cannot establish that caller-supplied rho=0 tieUniform is independent; documentation must require it'}

for name,fn in [('high_precision_calibration',calibration),('stable_tail_and_cdf',tails),('quadratic_likelihood_phase_covariance',quadratics),('raw_dense_covariance_sufficiency',raw),('phase_and_energy_likelihood_counterexamples',counterexamples),('finite_payload_ledger',ledger),('independent_actual_js_detector_monte_carlo',monte_carlo),('actual_js_raw_generator_moments',generator),('generated_waveform_and_scale_endpoints',waveform_endpoints),('wilson_interval_endpoints',wilson),('input_guards_truth_separation',guards)]:check(name,fn)
unchanged=before==hashlib.sha256(core.read_bytes()).hexdigest()==O['core_sha256'] and O['unchanged'];checks.append({'name':'core_unchanged_during_audit','passed':unchanged})
report={'core_file':core.name,'core_sha256':before,'oracle_precision_decimal_digits':mp.mp.dps,'fixtures_sha256':hashlib.sha256((ROOT/'high-precision-fixtures.json').read_bytes()).hexdigest(),'runtime_versions':{'node':subprocess.check_output(['node','--version'],text=True).strip(),'python':sys.version.split()[0],'numpy':np.__version__,'scipy':scipy.__version__,'mpmath':mp.__version__},'checks':checks,'passed':all(c['passed'] for c in checks),'limitations':['Finite deterministic grid, not every possible binary64 input','Monte Carlo covers representative ordinary probabilities, not 1e-12 tails','No browser/UI, publication, paper MAPRT reproduction, or optimal two-energy-domain ROC','Known white noise, calibrated coordinates, known prior and fixed single hypothesis; no unknown-noise or search-wide guarantee']}
(ROOT/'audit-results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':report['passed'],'core_sha256':before,'failed':[c['name'] for c in checks if not c['passed']]},indent=2));sys.exit(not report['passed'])
