#!/usr/bin/env python3
"""Independent Python implementation of the documented RNG plus reference scene.
The browser runtime never reads this script, its fixtures, or expected results.
"""
import os
os.environ['OPENBLAS_NUM_THREADS']='1';os.environ['OMP_NUM_THREADS']='1'
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,math,subprocess,hashlib
import numpy as np
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'reference'))
from experiments import simulate,Scene

def normals(seed,count):
    mask=2**32-1;state=seed;out=[]
    def uniform():
        nonlocal state
        state=(state+0x6d2b79f5)&mask;t=state
        t=((t^(t>>15))*(t|1))&mask
        t=(t^((t+((t^(t>>7))*(t|61)&mask))&mask))&mask
        return ((t^(t>>14))+.5)/2**32
    while len(out)<count:
        radius=math.sqrt(-2*math.log(uniform()));angle=2*math.pi*uniform()
        out.extend([radius*math.cos(angle),radius*math.sin(angle)])
    return np.array(out[:count])

configurations=[dict(snrDb=snr,aperture=a,bandwidthHz=b,seed=seed,scene=scene)
    for a in [.05,.35,.75,1.49146747855] for b in [20e6,100e6,250e6,500e6,1e9]
    for snr in [5,10,15,20] for scene in ['normal','reference-blind'] for seed in [0,260501162,4294967295]]
script="""
const fs=require('node:fs'),path=require('node:path'),root=path.resolve('../../../../'),runtime=fs.existsSync(path.join(root,'nearfield-gc-sage-observations.js'))?path.join(root,'nearfield-gc-sage-observations.js'):path.join(root,'labs/near-field/nearfield-gc-sage-observations.js'),O=require(runtime);
const configs=JSON.parse(fs.readFileSync(0,'utf8'));
const serialize=x=>ArrayBuffer.isView(x)?Array.from(x):x;
for(const c of configs){const s=O.generate(c);process.stdout.write(JSON.stringify({config:c,model:s.model,truth:s.truth,ledger:s.ledger},(_,v)=>serialize(v))+'\\n');}
"""
p=subprocess.Popen(['node','-e',script],cwd=HERE,text=True,stdin=subprocess.PIPE,stdout=subprocess.PIPE)
p.stdin.write(json.dumps(configurations));p.stdin.close()
errors={k:0. for k in ['clean_complex','delays_s','bounce_m','noise_complex','noise_variance','normal_standard']}
records=[]
for line in p.stdout:
    data=json.loads(line);c=data['config'];t=data['truth']
    scene=Scene(snr_db=c['snrDb'],aperture=c['aperture'],bandwidth=c['bandwidthHz'],seed=c['seed'],reference_blind=c['scene']=='reference-blind')
    _,model,truth=simulate(scene)
    def unpack(v):return (np.array(v['real'])+1j*np.array(v['imag'])).reshape(v['rows'],v['cols'])
    normals_expected=normals(c['seed'],6144)
    noise_expected=math.sqrt(truth['noise_variance']/2)*(normals_expected[:3072]+1j*normals_expected[3072:]).reshape(48,64)
    diffs={'clean_complex':np.max(abs(unpack(t['clean'])-truth['clean'])),'delays_s':np.max(abs(np.array(t['delays'])-truth['delays'])),
      'bounce_m':np.max(abs(np.array(t['bounce_points'])-truth['bounce_points'])),'noise_complex':np.max(abs(unpack(t['noise'])-noise_expected)),
      'noise_variance':abs(t['noise_variance']-truth['noise_variance']),
      'normal_standard':np.max(abs(np.concatenate([np.array(t['noise']['real']),np.array(t['noise']['imag'])])/math.sqrt(t['noise_variance']/2)-normals_expected))}
    assert np.array_equal(t['visibility'],truth['visibility'])
    assert data['model']['reference_pair']==model.reference_pair
    assert data['model']['max_delay_ns']==55
    assert all(float(d)<1e-11 for d in diffs.values()),(c,diffs)
    for name,value in diffs.items():errors[name]=max(errors[name],float(value))
    records.append({'config':c,'max_clean_error':float(diffs['clean_complex']),'max_noise_error':float(diffs['noise_complex']),'support':int(np.sum(truth['visibility'][1]))})
assert p.wait()==0
assert len(records)==480
report={'scope':'Independent Python documented PRNG + unmodified reference scene/noise variance; no cross-seed NumPy noise equality claim',
  'cases':len(records),'max_absolute_errors':errors,'all_passed':True,
  'source_sha256':hashlib.sha256(((HERE.parents[3]/'nearfield-gc-sage-observations.js' if (HERE.parents[3]/'nearfield-gc-sage-observations.js').exists() else HERE.parents[3]/'labs/near-field/nearfield-gc-sage-observations.js')).read_bytes()).hexdigest(),'records':records}
(HERE/'results/generator-comparison.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='records'},indent=2))
