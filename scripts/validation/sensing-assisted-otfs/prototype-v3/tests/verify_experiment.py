"""Rebuild actual Worker exports in Python; no JS-result lookup in the oracle.
The frozen accepted Python reference is a parity oracle. The source fixture
and scalar-loop oracle are separately verified by generate_oracles.py.
"""
from pathlib import Path
import json,hashlib,math,importlib.util,sys
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pinned_ref',ROOT/'reference-copy/reference.py');r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
assert hashlib.sha256((ROOT/'reference-copy/reference.py').read_bytes()).hexdigest()=='c83ba035ee49d8011c2b3b8f5f0260b7e95fd2fb562781f03e63a1ea7407ddce'
from generate_oracles import encode_output,check_numbers
class RNG:
 def __init__(self,seed):self.state=seed;self.spare=None
 def uniform(self):
  self.state=(self.state+0x6D2B79F5)&0xffffffff
  t=((self.state^(self.state>>15))*(self.state|1))&0xffffffff
  t=(t^((t+(((t^(t>>7))*(t|61))&0xffffffff))&0xffffffff))&0xffffffff
  return ((t^(t>>14))+.5)/4294967296
 def normal(self):
  if self.spare is not None:v=self.spare;self.spare=None;return v
  radius=math.sqrt(-2*math.log(self.uniform()));angle=2*math.pi*self.uniform();self.spare=radius*math.sin(angle);return radius*math.cos(angle)
def decode(x):
 if isinstance(x,list):return [decode(v) for v in x]
 if isinstance(x,dict):
  if '$number' in x:
   assert x=={'$number':'-0'};return -0.0
  if '$typed' in x:return np.array([decode(v) for v in x['values']],dtype={'Float64Array':float,'Int8Array':np.int8,'Uint8Array':np.uint8,'Int32Array':np.int32}[x['$typed']])
  return {k:decode(v) for k,v in x.items()}
 return x
def complex_array(x):return np.asarray(x)[::2]+1j*np.asarray(x)[1::2]
def plain(x):
 if isinstance(x,np.ndarray):return x.tolist()
 if isinstance(x,list):return [plain(v) for v in x]
 if isinstance(x,dict):return {k:plain(v) for k,v in x.items()}
 return x
assert math.copysign(1.,decode({'$number':'-0'}))==-1
assert np.signbit(decode({'$typed':'Float64Array','values':[{'$number':'-0'},0]})).tolist()==[True,False]
export=json.loads((ROOT/'reports/actual-worker-export.json').read_text());assert hashlib.sha256(export['text'].encode()).hexdigest()==export['sha256'];wire=json.loads(export['text']);assert wire['codec']=='sensing-otfs-finite-typed-json-v2';out=decode(wire['value']);c=out['configuration'];shape=tuple(c['shape']);L=np.prod(shape);P=len(c['physicalSupport']);rng=RNG(c['seed']);primitives=[]
for f in range(c['frames']):
 signs=np.array([-1 if rng.uniform()<.5 else 1 for _ in range(L)])
 gains=np.array([math.sqrt(c['priorPowers'][p]/2)*(rng.normal()+1j*rng.normal()) for p in range(P)])
 noise=np.array([(rng.normal()+1j*rng.normal())/math.sqrt(2) for _ in range(L)])
 primitives.append((signs,gains,noise))
maxima={'rawY':0.,'gainDraw':0.,'noiseDraw':0.,'estimatedGains':0.,'probabilities':0.};records=[]
for f in out['frames']:
 signs,gains,standard_noise=primitives[f['frame']];Es=c['dataEnergy'] if f['normalization']=='source_per_data' else L*c['dataEnergy']/(L-1+c['pilotPowerRatio']);Ep=Es*c['pilotPowerRatio'];pilot=math.sqrt(Ep)*np.exp(1j*c['pilotPhase']);x=(signs*math.sqrt(Es)).astype(complex).reshape(shape);x[tuple(c['pilotIndex'])]=pilot;noise=(standard_noise*math.sqrt(c['N0'])).reshape(shape);y=r.raw_circular_frame(x,c['physicalSupport'],gains,noise);ah=r.estimate_effective_gains(y,c['predictedSupport'],c['pilotIndex'],pilot);v=r.prior_gain_error_variance(c['priorPowers'],Es,Ep,c['N0'])
 maxima['rawY']=max(maxima['rawY'],float(np.max(abs(y.ravel()-complex_array(f['y'])))));maxima['gainDraw']=max(maxima['gainDraw'],float(np.max(abs(gains-complex_array(f['trueGainsEvaluationOnly'])))));maxima['noiseDraw']=max(maxima['noiseDraw'],float(np.max(abs(noise.ravel()-complex_array(f['noise'])))));maxima['estimatedGains']=max(maxima['estimatedGains'],float(np.max(abs(ah-complex_array(f['estimatedGains'])))))
 assert np.array_equal(signs,f['dataSignsEvaluationOnly']);assert np.max(abs(x.ravel()-complex_array(f['x'])))<1e-12;assert abs(f['energyLedger']['totalFrameEnergy']-((L-1)*Es+Ep))<1e-10;assert np.max(abs(v-f['receiverGainVariance']))<1e-12
 for rec in f['records']:
  oracle=rec['mode']=='supplied_perfect_csi';expected=r.sparse_spa(y,c['physicalSupport'] if oracle else c['predictedSupport'],gains if oracle else ah,c['pilotIndex'],pilot,Es,c['N0'],np.zeros(P) if oracle else v,mode='ignored_uncertainty' if oracle else rec['mode'],max_iterations=c['maxIterations'],damping=c['damping'],tolerance=c['tolerance']);actual=plain(rec);expected_json=encode_output(expected);details=check_numbers(actual,expected_json,f"{f['frame']}/{f['normalization']}/{rec['mode']}");maxima['probabilities']=max(maxima['probabilities'],float(np.max(abs(rec['probabilities']-expected['probabilities'].ravel()))));bits=L-1;err=int(np.sum(expected['decisions'][expected['data_mask']]!=x.ravel()[expected['data_mask']].real));assert rec['metrics']['bits']==bits;assert rec['metrics']['errors']==err;assert rec['metrics']['capped']==(expected['status']=='iteration_cap');records.append({'frame':f['frame'],'normalization':f['normalization'],'mode':rec['mode'],'status':rec['status'],'errors':err,'fullOutputParity':details})
assert max(maxima.values())<3e-11
report={'allPassed':True,'signedZeroCodecPythonCheck':True,'exportSha256':export['sha256'],'seed':c['seed'],'independentFrameDraws':c['frames'],'fullReceiverRecords':len(records),'maxAbsoluteErrors':maxima,'records':records,'scope':'Python independently regenerates Mulberry32/Box-Muller draws, raw x/y/noise, estimates/variances/energy/denominators; all decoder probabilities/decisions/status/history versus pinned accepted reference. Actual Node module Worker export, not a browser engine.'}
(ROOT/'reports/actual-worker-python-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='records'},indent=2))
