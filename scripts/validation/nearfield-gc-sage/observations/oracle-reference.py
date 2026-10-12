#!/usr/bin/env python3
"""Offline-only independent fixture export/evaluation comparison, no runtime use."""
import os
os.environ['OPENBLAS_NUM_THREADS']='1'
os.environ['OMP_NUM_THREADS']='1'
import sys
sys.dont_write_bytecode=True
from pathlib import Path
from dataclasses import asdict
import json, hashlib, subprocess, math, cmath, copy, tempfile
from types import SimpleNamespace
import numpy as np
from scipy.optimize import linear_sum_assignment
HERE=Path(__file__).resolve().parent
REFERENCE=HERE.parent/'reference'
BROWSER=HERE.parent/'port'
sys.path.insert(0,str(REFERENCE))
from experiments import simulate, Scene, evaluate
from gc_sage import Model, PathState, FitResult, Budget, steering

def safe(x):
    if isinstance(x,np.ndarray): return safe(x.tolist())
    if isinstance(x,np.generic): return safe(x.item())
    if isinstance(x,dict): return {k:safe(v) for k,v in x.items()}
    if isinstance(x,(tuple,list)): return [safe(v) for v in x]
    if isinstance(x,float) and not math.isfinite(x): return None
    return x

def packed(a):
    return {'rows':a.shape[0],'cols':a.shape[1],'real':a.real.ravel().tolist(),'imag':a.imag.ravel().tolist()}

def unpack(a):
    return (np.array(a['real'])+1j*np.array(a['imag'])).reshape(a['rows'],a['cols'])

def packed_truth(t):
    r=copy.deepcopy(t)
    for k in ['clean','noise']:r[k]=packed(t[k])
    r['gains']=[{'real':g.real.tolist(),'imag':g.imag.tolist()} for g in t['gains']]
    r['evaluation_only']=True
    return safe(r)

def result_from_json(r):
    states=[]
    for s in r['states']:
        states.append(PathState(s['kind'],s['reference_delay'],np.array(s['delays']),np.array(s['gains']['real'])+1j*np.array(s['gains']['imag']),unpack(s['prediction']),
            None if s['point'] is None else np.array(s['point']),None if s['normal'] is None else np.array(s['normal']),None if s['bounce_points'] is None else np.array(s['bounce_points']),s['theta']))
    init=SimpleNamespace(budget=Budget(**r['initialization']['budget']),reference_delays_ns=r['initialization']['reference_delays_ns'])
    return FitResult(r['mode'],states,r['trace'],r['converged'],r['stopping_reason'],Budget(**r['budget']),init,r['observation_sha256'])

def write(name,payload):
    (HERE/name).write_text(json.dumps(safe(payload),indent=2,allow_nan=False)+'\n')

def analytic_fixture():
    # Entirely independent scalar math/cmath derivation, no reference simulator.
    c=299792458.0; rx=[2.,3.,4.];f=[-1e7,-5e6,0.,5e6,1e7];g=.8*cmath.exp(.7j)
    delay0=[(1+math.sqrt((x-1)**2+1))/c for x in rx]
    delay1=[math.sqrt((x-1)**2+16)/c for x in rx]
    bounces=[[(1+x)/2,2.] for x in rx];visibility=[True,True,False]
    states=[];signals=[]
    for index,delays in enumerate([delay0,delay1]):
        gains=[1.+0j if index==0 else (g if visible else 0j) for visible in visibility]
        signal=np.array([[gain*cmath.exp(-2j*math.pi*tone*delay) for tone in f] for gain,delay in zip(gains,delays)])
        signals.append(signal)
        states.append({'kind':['scattering','reflection'][index],'reference_delay':delays[1],'delays':delays,
            'gains':{'real':[z.real for z in gains],'imag':[z.imag for z in gains]},'prediction':packed(signal),
            'point':[[1,1],bounces[1]][index],'normal':None if index==0 else [0,1],
            'bounce_points':[[1,1] for _ in rx] if index==0 else bounces,'theta':None})
    y=sum(signals);model={'tx':[[1,0]],'rx':[[x,0] for x in rx],'frequencies':f,'reference_pair':1,'path_count':2,'max_delay_ns':55,'region':[0,6.5,.05,6.5]}
    truth={'evaluation_only':True,'clean':packed(y),'noise':packed(np.zeros_like(y)),'noise_variance':0.,'point':[1,1],'surface_point':[1.5,2],'surface_normal':[0,1],
        'kinds':['scattering','reflection'],'delays':[delay0,delay1],'visibility':[[True]*3,visibility],'bounce_points':[[[1,1]]*3,bounces]}
    result={'mode':'hybrid','prediction':packed(y),'states':states,'converged':True,'stopping_reason':'Analytical noiseless fixture, no optimization','trace':[{'sweep':0,'sse':0}]}
    write('fixtures/analytical-noiseless.json',{'purpose':'Independent scalar analytical fixture, not an optimizer output or generated live observation','observations':packed(y),'model':model,'truth':truth,'result':result,
          'expected':{'sse':0,'clean_error_energy':0,'point_error_m':0,'interaction_rmse_m':0,'normal_error_deg':0,'plane_distance_error_m':0,'reflection_visible_fraction':2/3}})

def main():
    cases=[]
    scenes={'default':Scene(),'reference-blind':Scene(reference_blind=True),'absent-path':Scene(reflection_visible=False),'narrowband':Scene(bandwidth=20e6),'noiseless':Scene(snr_db=float('inf'))}
    for name,scene in scenes.items():
        y,m,t=simulate(scene)
        # Regenerate actual fits from common observed data; no cached multi-MB fits required.
        with tempfile.TemporaryDirectory(prefix='gc-sage-evaluator-') as directory:
            fixture=Path(directory)/'observations.json'
            fixture.write_text(json.dumps(safe({'observations_real':y.real,'observations_imag':y.imag,'model':asdict(m),'options':{}})))
            raw=json.loads(subprocess.check_output(['node',str(BROWSER/'run-fixture.js'),str(fixture)],text=True))
        for mode in ['scattering','hybrid']:
            r=raw['methods'][mode];expected=evaluate(result_from_json(r),y,m,t)
            cases.append({'name':name+'/'+mode,'observations':packed(y),'model':asdict(m),'truth':packed_truth(t),'result':r,'expected':safe(expected)})
    # Matched-but-unlocalized state: geometry must stay null.
    template=copy.deepcopy(cases[1]);template['name']='null-geometry';s=template['result']['states'][0]
    s.update(kind='unlocalized',point=None,normal=None,bounce_points=None)
    y,m,t=simulate(Scene());template['expected']=safe(evaluate(result_from_json(template['result']),y,m,t));cases.append(template)
    write('fixtures/oracle-evaluation.json',{'reference':'experiments.evaluate, unmodified; shared observations, truth and JavaScript fit inputs','cases':cases})
    # Exact padded assignment ties, plus realistic second-valued decimal inputs.
    association=[]
    grids=[[0,.5e-9,1e-9],[0,0,.5e-9],[10e-9,10.5e-9,11e-9],[10e-9,10e-9,12e-9]]
    for grid in grids:
      for actual0 in grid:
       for actual1 in grid:
        for estimated0 in grid:
         for estimated1 in grid:
          for present in [[True,True],[True,False],[False,True],[False,False]]:
            actual=np.array([actual0,actual1]);estimated=np.array([estimated0,estimated1]);indices=np.flatnonzero(present);k=len(indices);l=2
            cost=np.zeros((k+l,k+l));cost[:k,:l]=np.abs(actual[indices,None]-estimated[None,:])*1e9;cost[:k,l:]=.25;cost[k:,:l]=.25
            rows,cols=linear_sum_assignment(cost);matches=[None,None]
            for row,col in zip(rows,cols):
                if row<k and col<l and cost[row,col]<=.5:matches[int(indices[row])]=int(col)
            association.append({'actual':actual,'estimated':estimated,'present':present,'association':matches,'columns':cols})
    write('fixtures/oracle-association.json',{'scipy_version':__import__('scipy').__version__,'cases':association})
    analytic_fixture()
    subprocess.run(['node',str(HERE/'oracle-evaluate-runner.cjs')],check=True)
    print('Exported',len(cases),'evaluation fixtures and',len(association),'assignment cases')

if __name__=='__main__': main()
