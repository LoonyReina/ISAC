#!/usr/bin/env python3
"""Independent NumPy full-physical-space check of production exported JSON.
Usage: python3 record-oracle.py /path/to/downloaded.json
This reads evidence only. It neither solves a new optimization problem nor authenticates provenance.
No JS numerical implementation, fixture, or earlier reference oracle is imported.
"""
import json
import math
import pathlib
import sys
import numpy as np

LIMIT = 64 * 1024 * 1024
issues = []

def check(mode, name, ok, detail=None):
    if not bool(ok):
        issues.append({'mode': mode, 'check': name, 'detail': detail})

def close(mode, name, actual, expected, scale=1., rtol=3e-7):
    a, b = np.asarray(actual), np.asarray(expected)
    error = float(np.linalg.norm(a-b))
    tolerance = 2e-11*scale + rtol*float(np.linalg.norm(b))
    check(mode, name, np.all(np.isfinite(a)) and np.all(np.isfinite(b)) and error <= tolerance,
          {'absoluteError': error, 'tolerance': tolerance})

def matrix(v):
    assert set(v) == {'rows', 'cols', 're', 'im'}, 'unknown matrix keys'
    shape = (v['rows'], v['cols'])
    a = np.array(v['re'], dtype=float).reshape(shape) + 1j*np.array(v['im'], dtype=float).reshape(shape)
    assert np.all(np.isfinite(a)), 'nonfinite matrix'
    return a

def eig(a):
    return np.linalg.eigvalsh((a+a.conj().T)/2)

def channel(c, points, receive=False):
    side = c['side']; wl = c['wavelength']
    axis = (np.arange(side)-(side-1)/2)*wl/2
    coords = np.array([[x, y + (.06 if receive else 0), 0.] for x in axis for y in axis])
    displacement = np.asarray(points)[:,None,:] - coords[None,:,:]
    distance = np.linalg.norm(displacement, axis=2)
    amp = np.sqrt(6.) * displacement[:,:,2] * wl/(4*np.pi*distance**2)
    return amp*np.exp(-2j*np.pi*distance/wl)

def mode_check(r, c):
    name = r['mode']; start = len(issues)
    if r['status'] != 'candidate':
        if r['status'] == 'infeasible_single_user_bound':
            hu = channel(c,c['users']); bounds=np.log2(1+c['power']*np.sum(abs(hu)**2,axis=1)/c['noise'])
            close(name,'single-user bounds',r['details']['rateUpperBounds'],bounds)
            check(name,'analytic infeasibility',np.min(bounds)<c['rate'])
        return {'mode':name, 'status':'preserved_failure', 'savedStatus':r['status'], 'savedAccepted':r['accepted']}
    P=c['power']; N=c['side']**2; gamma=2.**c['rate']-1
    h=channel(c,c['users']+c['targets']); norms=np.linalg.norm(h,axis=1); H=h/norms[:,None]
    m=r['matrices']; B=matrix(m['basis']); Z=matrix(m['R']); F=[matrix(v) for v in m['F']]
    newS=matrix(m['Rs']); Xcov=matrix(m['rx']); Scov=matrix(m['rs']); beams=matrix(m['beams'])
    assert B.shape==(N,5) and Xcov.shape==(N,N) and beams.shape==(N,2), 'wrong physical dimensions'
    canonical=H.conj().T@np.linalg.inv(H@H.conj().T); G=B.conj().T@B
    close(name,'canonical B',B,canonical); close(name,'H B identity',H@B,np.eye(5))
    lift=lambda A:P*B@A@B.conj().T
    oldS=Z-F[0]-F[1]; oldPhysicalS=lift(oldS); fullF=[lift(A) for A in F]
    f=np.column_stack([A[:,k]/np.sqrt(A[k,k].real) for k,A in enumerate(F)])
    differences=[fullF[k]-P*np.outer(B@f[:,k],(B@f[:,k]).conj()) for k in range(2)]
    close(name,'full Rx from reduced Z',Xcov,lift(Z),P)
    close(name,'physical recovered beams',beams,np.sqrt(P)*B@f,np.sqrt(P))
    close(name,'reduced recovered sensing',newS,Z-f@f.conj().T)
    close(name,'physical recovered sensing',Scov,lift(newS),P)
    close(name,'aggregate covariance',Xcov,beams@beams.conj().T+Scov,P)
    close(name,'old sensing plus differences',Scov,oldPhysicalS+sum(differences),P)
    for label,A in [('Rx',Xcov),('Rs',Scov),('originalRs',oldPhysicalS)]+[(f'F{k}',A) for k,A in enumerate(fullF)]+[(f'difference{k}',A) for k,A in enumerate(differences)]:
        close(name,'Hermitian '+label,A,A.conj().T,P)
        check(name,'physical PSD '+label,float(eig(A)[0])>=-1e-7*P)
    power=np.trace(Xcov).real; close(name,'power',r['power'],power,P)
    close(name,'metric power',power,P*np.trace(G@Z).real,P)
    observed=H@Xcov@H.conj().T; received=H@beams; observedS=H@Scov@H.conj().T
    gains=np.diag(observed).real[2:]; pairs=[(2,3),(2,4),(3,4)]; cross=np.array([abs(observed[i,j]) for i,j in pairs])
    rates=[]; sinrs=[]; desired_errors=[]
    for k in range(2):
        desired=abs(received[k,k])**2
        interference=abs(received[k,1-k])**2+observedS[k,k].real+c['noise']/norms[k]**2
        sinr=desired/interference; sinrs.append(sinr); rates.append(np.log2(1+sinr))
        old=(H@fullF[k]@H.conj().T)[k,k].real
        desired_errors.append(abs(desired-old)/max(desired,1e-30))
        close(name,f'desired preserved {k}',desired,old,P)
        close(name,f'SINR preserved {k}',sinr,old/(observed[k,k].real-old+c['noise']/norms[k]**2))
    close(name,'all rates',r['rates'],rates); close(name,'all SINRs',r['sinrs'],sinrs)
    close(name,'target gains',r['gains'],gains,P); close(name,'pair moduli',r['correlation'],cross,P)
    cert=r['certificate']; alpha=np.array(cert['alpha']); eta=np.array(cert['eta']); rho=np.array(cert['rhos']); lam=cert['lambda']
    C=np.diag(np.r_[eta*gamma,-alpha]).astype(complex)
    for q in cert['cross']:
        value=(q['re']+1j*q['im'])/2; C[q['i'],q['j']]+=value; C[q['j'],q['i']]+=value.conjugate()
    blocks=[C]
    for k in range(2):
        block=C.copy(); block[k,k]-=eta[k]*(gamma+1); blocks.append(block)
    dual_psd=np.array([eig(A+lam*G)[0] for A in blocks])
    full_dual=np.array([eig(H.conj().T@A@H+lam*np.eye(N))[0] for A in blocks])
    close(name,'reduced dual eigenvalues',cert['dualPSD'],dual_psd,max(1,lam))
    check(name,'full physical dual PSD',np.min(full_dual)>=-1e-8*max(1,lam))
    check(name,'dual nonnegative',lam>=0 and np.all(alpha>=0) and np.all(eta>=0) and np.all(rho>=0))
    close(name,'dual normalization',sum(alpha)-c['epsilon']*sum(rho),1)
    check(name,'dual cone',all(rho[k]+1e-12>=math.hypot(q['re'],q['im']) for k,q in enumerate(cert['cross'])))
    upper=P*lam-sum(eta*gamma*c['noise']/norms[:2]**2); lower=r['objective']; gap=(upper-lower)/max(lower,1e-30)
    close(name,'upper bound',cert['upper'],upper,P); close(name,'lower bound',cert['lower'],lower,P)
    res={'basisIdentityError':np.linalg.norm(H@B-np.eye(5)), 'recoveryDesiredRelativeError':max(desired_errors),
         'minRxEigenvalue':eig(Xcov)[0], 'minRsEigenvalue':eig(Scov)[0],
         'minRecoveryDifferenceEigenvalue':min(eig(A)[0] for A in differences),'powerExcess':power-P,
         'illuminationMargin':min(gains)-lower,'rateMargin':min(rates)-c['rate'],
         'covarianceReconstructionError':np.linalg.norm(Xcov-beams@beams.conj().T-Scov),
         'dualMinEigenvalue':min(dual_psd),'relativeGap':gap}
    if name=='proposed': res['maxCrossExcess']=max(cross)-c['epsilon']*lower
    for key,value in res.items():
        close(name,'residual '+key,r['residual'][key],value,1 if key in ['basisIdentityError','recoveryDesiredRelativeError','rateMargin','dualMinEigenvalue','relativeGap'] else P)
    result={'mode':name,'savedAccepted':r['accepted'],'power':float(power),'objective':lower,'upper':float(upper),'relativeGap':float(gap),'minimumFullDualEigenvalue':float(min(full_dual))}
    s=r.get('sampler')
    if s and s.get('status')!='failed':
        T=c['snapshots']; X=matrix(s['sampleX']); noise=matrix(s['sampleNoise']); Rhat=X@X.conj().T/T
        assert X.shape==(N,T) and noise.shape==(N,T), 'sample dimensions'
        ex=float(np.linalg.norm(X)**2); en=float(np.linalg.norm(noise)**2); ev=eig(Rhat); threshold=max(float(ev[-1])*1e-9,np.finfo(float).tiny); rank=int(np.sum(ev>threshold))
        close(name,'sample support',X,B@(H@X),np.sqrt(P*T))
        close(name,'finite energy',s['finiteTransmitBlockEnergy'],ex,P*T); close(name,'finite average power',s['finiteAverageTransmitPower'],ex/T,P)
        close(name,'finite noise energy',s['finiteNoiseBlockEnergy'],en,c['noise']*N*T)
        close(name,'Rhat trace',np.trace(Rhat).real,ex/T,P); check(name,'rank at most five',rank<=5)
        for key in ['preclipCovariance','postclipCovariance']: close(name,key,matrix(s[key]),Xcov,P)
        close(name,'ensemble preclip power',s['ensemblePowerPreclip'],np.trace(matrix(s['preclipCovariance'])).real,P)
        close(name,'ensemble postclip power',s['ensemblePowerPostclip'],np.trace(matrix(s['postclipCovariance'])).real,P)
        check(name,'no clipping',s['clippedPower']==0)
        hr=channel(c,c['targets'],receive=True).T; echo=hr@(h[2:]@X)
        close(name,'reciprocal extension echo',s['reciprocalExtensionEchoEnergy'],np.linalg.norm(echo)**2,max(float(np.linalg.norm(echo)**2),1e-30))
        check(name,'literal zero receive hemisphere',all(p[2]>0 for p in c['targets']) and s['literalEq12EchoEnergy']==0 and s['literalEq12OutputEqualsNoise'] is True)
        check(name,'Eq19 singular retained',s['strictEq19']=={'status':'undefined_singular_rx','maximumTransmitRank':5,'transmitDimension':N,'undefinedPrintedIndex':'h_tilde_l,0'})
        result.update(sampleRank=rank,rankThreshold=threshold,finiteEnergy=ex,noiseEnergy=en,empiricalCovarianceRelativeError=float(np.linalg.norm(Rhat-Xcov)/np.linalg.norm(Xcov)))
    result['status']='self_consistent' if len(issues)==start else 'inconsistent'
    return result

def main():
    path=pathlib.Path(sys.argv[1]); assert path.stat().st_size<=LIMIT,'record exceeds 64 MiB'
    def reject(v): raise ValueError('non-finite JSON '+v)
    def pairs(items):
        result={}
        for key,value in items:
            assert key not in result,'duplicate JSON key'
            result[key]=value
        return result
    record=json.loads(path.read_text(),parse_constant=reject,object_pairs_hook=pairs)
    assert record['schema']=='nearfield-multitarget-run-v1','unknown schema'
    c=record['settings']['config']; modes=[mode_check(r,c) for r in record['payload'].get('results',[])]
    output={'selfConsistent':not issues,'sourceAuthenticated':False,'freshSolve':False,'modes':modes,'issues':issues,'scope':'Independent NumPy reconstruction of saved physical evidence only'}
    print(json.dumps(output,ensure_ascii=False,allow_nan=False))
    return 0 if not issues else 1
if __name__=='__main__':
    try: sys.exit(main())
    except Exception as error:
        print(json.dumps({'selfConsistent':False,'error':str(error)}));sys.exit(1)
