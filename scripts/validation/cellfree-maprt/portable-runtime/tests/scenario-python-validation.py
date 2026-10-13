"""Independent SciPy/NumPy oracle, using fresh browser realization inputs.

Run: node tests/scenario.test.mjs /tmp/scenario-validation-record.json
     python tests/scenario-python-validation.py /tmp/scenario-validation-record.json
No reference tree files are written. A pinned hash detects reference changes.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import sys
import numpy as np
from scipy.linalg import block_diag

ROOT=Path(__file__).resolve().parents[2]/'cellfree-maprt-reference'
assert hashlib.sha256((ROOT/'src/scenario.py').read_bytes()).hexdigest()=='4d1f24f05e960d4dbb059792f15a3139c7e458098aaa3a5d86cc98b6d5ecda1a'
sys.path.insert(0,str(ROOT))
from src.scenario import precoders
from src.maprt import steering,bistatic_gains,clutter_covariance,observation_design,sensing_quadratic_matrices

def decode(obj):
    if obj.get('type')=='complex-matrix-f64-json-v1':
        return (np.array(obj['re'])+1j*np.array(obj['im'])).reshape(obj['rows'],obj['cols'])
    return obj

record=json.loads(Path(sys.argv[1]).read_text(),object_hook=decode)
errors={}
def check(name,actual,expected,tol=2e-10):
    actual=np.asarray(actual);expected=np.asarray(expected)
    assert actual.shape==expected.shape,(name,actual.shape,expected.shape)
    error=float(np.linalg.norm(actual-expected)/max(np.linalg.norm(expected),np.finfo(float).tiny))
    assert error<tol,(name,error)
    errors[name]=max(errors.get(name,0),error)

for case in record['records']:
    s=case['scenario'];tx=np.array(s['tx']);rx=np.array(s['rx']);target=np.array(s['target']);ue=np.array(s['ue'])
    k,r,m,u,tau=4,2,2,2,10;noise=s['noise'];wl=299792458/s['settings']['carrier_hz']
    atx=steering(target-tx,m);arx=steering(rx-target,m)
    check('atx',s['atx'],atx);check('arx',s['arx'],arx)
    h0=((wl/(4*np.pi*np.linalg.norm(target-tx,axis=1)))[:,None]*atx).ravel()
    check('h0',s['h0'][:,0],h0)
    for i,user in enumerate(ue):
        blocks=[]
        for ap in tx:
            direction=user-ap;distance=np.linalg.norm(direction)
            gain=(wl/(4*np.pi*distance))**2*1e-3/noise
            d=np.arange(m)[:,None]-np.arange(m)[None,:]
            blocks.append(gain*.45**np.abs(d)*np.exp(1j*np.pi*direction[1]/distance*d))
        cov=block_diag(*blocks);hat=cov@np.linalg.solve(cov+.5*np.eye(k*m),cov)
        check('channel_covariance',s['channelCovariances'][i],cov)
        check('estimate_covariance',s['estimateCovariances'][i],hat)
        check('error_covariance',s['errorCovariances'][i],cov-hat)
    for fit_name in ['fit','holdout']:
        fitted=s[fit_name];raw=fitted['raw'];beams=[];effective=[];leaks=[]
        for h,error,w,effective_js,leak_js in zip(raw['estimates'],raw['errors'],raw['precoders'],raw['effective'],raw['sensingLeak']):
            beam=precoders(h,h0,1.)
            check('precoders',w,beam)
            eff=(h+error).conj().T@beam;leak=error.conj().T@beam[:,0]
            check('effective',effective_js,eff);check('leak',leak_js[:,0],leak)
            beams.append(beam);effective.append(eff);leaks.append(leak)
        beams=np.array(beams);effective=np.array(effective);leaks=np.array(leaks)
        b=np.abs(np.mean(effective[:,np.arange(u),np.arange(1,u+1)],axis=0))
        a2=np.mean(np.abs(effective)**2,axis=0);a2[:,0]=np.mean(np.abs(leaks)**2,axis=0)
        a2[np.arange(u),np.arange(1,u+1)]-=b**2
        a=np.sqrt(np.maximum(0,a2));f=np.mean(np.sum(np.abs(beams.reshape(-1,k,m,u+1))**2,axis=2),axis=0)
        check(fit_name+'_b',fitted['b'],b);check(fit_name+'_a',fitted['a'],a);check(fit_name+'_power',fitted['powerCoeff'],f)
    check('design_precoders',s['w'],precoders(s['designEstimatedChannels'],h0,1.))
    rtx=np.empty((r,k,m,m),complex);rrx=np.empty_like(rtx)
    for ri in range(r):
        for ki in range(k):
            direction=rx[ri]-tx[ki];dist=np.linalg.norm(direction);d=np.arange(m)[:,None]-np.arange(m)[None,:]
            gain=.3*1e-4*(wl/(4*np.pi*dist))**2
            rtx[ri,ki]=.35**np.abs(d)*np.exp(1j*np.pi*direction[1]/dist*d)
            rrx[ri,ki]=gain*.25**np.abs(d)*np.exp(-1j*np.pi*direction[1]/dist*d)
    rh=clutter_covariance(rtx,rrx)
    check('rtx',s['rtx'],rtx);check('rrx',s['rrx'],rrx);check('clutter_covariance',s['rH'],rh)
    for design_case in case['checks']:
        djs=design_case['design'];scale=design_case['clutterScale']
        gains=bistatic_gains(tx,rx,target,s['settings']['carrier_hz'],design_case['rcsDbsm'])
        g,x,transmit=observation_design(s['w'].reshape(k,m,u+1),s['symbols'],design_case['amplitudes'],atx,arx,gains)
        check('gains',djs['gains'],gains);check('observation_g',djs['g'],g)
        check('observation_x',djs['x'],x if scale else np.empty((tau*r*m,0)))
        check('transmit',djs['transmit'],transmit.reshape(tau,k*m))
        check('scaled_rh',djs['rH'],scale*rh if scale else np.empty((0,0)))
        a,b=sensing_quadratic_matrices(s['w'].reshape(k,m,u+1),s['symbols'],atx,arx,gains,s['rAlpha'],scale*rh)
        check('sensing_a',design_case['sensing']['A'],a);check('sensing_b',design_case['sensing']['B'],b)
        assert np.linalg.eigvalsh(a).min()>=-1e-12*np.linalg.norm(a)
        assert np.linalg.eigvalsh(b).min()>=-1e-12*np.linalg.norm(b)
print(json.dumps({'passed':True,'scenarios':len(record['records']),'maximum_relative_error':max(errors.values()),'errors':errors},indent=2))
