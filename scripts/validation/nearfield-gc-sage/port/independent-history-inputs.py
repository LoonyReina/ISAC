"""Generate observation-only reviewer inputs; do not export simulator truth."""
import os
os.environ['OPENBLAS_NUM_THREADS']='1'
import sys
sys.dont_write_bytecode=True
from pathlib import Path
from dataclasses import asdict
import json
import numpy as np
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'reference'))
from experiments import Scene,simulate
from gc_sage import Options

def serial(x):
    if isinstance(x,np.ndarray):return x.tolist()
    if isinstance(x,np.generic):return x.item()
    raise TypeError(type(x).__name__)

cases=[]
for name,scene,overrides in [
    ('default',Scene(),{}),
    ('zero-sweeps',Scene(),{'max_sweeps':0}),
    ('one-sweep',Scene(),{'max_sweeps':1}),
    ('low-snr',Scene(snr_db=5,seed=1),{}),
    ('small-aperture',Scene(aperture=.05,seed=0),{}),
    ('narrowband',Scene(bandwidth=20e6),{}),
    ('reference-blind',Scene(reference_blind=True),{}),
    ('absent-second-path',Scene(reflection_visible=False),{})]:
    y,m,_=simulate(scene)
    cases.append({'name':name,'fixture':{'observations_real':y.real,'observations_imag':y.imag,
        'model':asdict(m),'options':{**asdict(Options()),**overrides}}})
(HERE/'independent/history-inputs.json').write_text(json.dumps(cases,default=serial))
