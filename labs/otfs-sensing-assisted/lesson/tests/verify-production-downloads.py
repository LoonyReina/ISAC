#!/usr/bin/env python3
"""Verify the seven production Blob downloads, then independently inspect pairing and teaching projections."""
import hashlib,json,math,os,subprocess,sys
from pathlib import Path
root=Path(sys.argv[1]).resolve()
script=Path(__file__).with_name('record-oracle.py')
manifest=json.loads((root/'MANIFEST.json').read_text());reports=[]
def decode(v):
 if isinstance(v,list):return [decode(x) for x in v]
 if isinstance(v,dict):
  if '$number' in v:return -0.0
  if '$typed' in v:return [decode(x) for x in v['values']]
  return {k:decode(x) for k,x in v.items()}
 return v
records={}
for row in manifest['records']:
 p=root/row['file'];raw=p.read_bytes();assert len(raw)==row['bytes'] and hashlib.sha256(raw).hexdigest()==row['sha256']
 env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','OPENBLAS_NUM_THREADS':'1'}
 check=subprocess.run([sys.executable,str(script),str(p)],capture_output=True,text=True,env=env);report=json.loads(check.stdout);assert check.returncode==0,(row['name'],report)
 assert report['exactCategoricalParity'] and report['allScientificFieldsIndependentlyEstablished'];reports.append(report);(root/(row['name']+'-independent.json')).write_text(json.dumps(report,indent=2)+'\n')
 wrapper=json.loads(raw);records[row['name']]=decode(json.loads(wrapper['payload']['text'])['value'])
 teaching=json.loads((root/(row['name']+'-teaching.json')).read_text())
 if wrapper['operation']=='run':
  c=records[row['name']]['configuration'];N,M=c['shape']
  for f,v in zip(records[row['name']]['frames'],teaching):
   for k,g in enumerate(v['gains']):
    s=c['predictedSupport'][k];arrival=[(c['pilotIndex'][0]+s[0])%N,(c['pilotIndex'][1]+s[1])%M];assert g['arrival']==arrival
    y=complex(*f['y'][2*(arrival[0]*M+arrival[1]):2*(arrival[0]*M+arrival[1])+2]);p=complex(*f['pilot']);est=y/p
    assert abs(complex(*g['estimate'])-est)<1e-12
   for k,s in enumerate(c['predictedSupport']):
    assert v['graph']['incoming'][k]['coordinate']==[(-s[0])%N,(-s[1])%M]
    assert v['graph']['outgoing'][k]['coordinate']==[s[0]%N,s[1]%M]
 else:
  assert abs(teaching['maxAbsoluteDifference']-max(r['delta'] for r in teaching['rows']))<1e-15
  assert abs(teaching['maxAbsoluteDifference']-.4999130751997302)<1e-12
x=records['default']['frames'][0];y=records['mismatch']['frames'][0]
for k in ['x','y','noise','trueGainsEvaluationOnly','dataSignsEvaluationOnly']:assert x[k]==y[k],k
assert x['estimatedGains']!=y['estimatedGains'];assert x['records'][3]==y['records'][3]
energy=records['energy']['frames']
for i in [0,2]:
 a,b=energy[i:i+2]
 for k in ['noise','trueGainsEvaluationOnly','dataSignsEvaluationOnly','N0']:assert a[k]==b[k],k
 assert a['x']!=b['x'] and a['y']!=b['y'];assert abs(a['energyLedger']['totalFrameEnergy']-355)<1e-12;assert abs(b['energyLedger']['totalFrameEnergy']-256)<1e-12
out={'allPassed':True,'productionDownloads':len(reports),'receiverRecords':sum(x['receiverRecords'] for x in reports),'maximumAbsoluteError':max(x['maximumAbsoluteError'] for x in reports),'exactCategoricalParity':True,'sameYMismatchOracleInvariance':True,'energyPrimitivesAndN0Paired':True,'energyYChanged':True,'gainAndGraphTeachingProjectionChecked':True,'browserEngine':False,'sourceAuthenticity':'not-verified'}
(root/'INDEPENDENT-SUMMARY.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
