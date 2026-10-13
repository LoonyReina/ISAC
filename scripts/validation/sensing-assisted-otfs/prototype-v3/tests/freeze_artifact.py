"""Explicit release freeze. Do not run against an accepted freeze after edits.
Run full regression first, then this script, then verify_manifest.py.
"""
from pathlib import Path
import json,hashlib,datetime,sys,platform
ROOT=Path(__file__).resolve().parents[1]
REFERENCE=ROOT.parent/'sensing-assisted-otfs-reference'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def item(p):return {'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':sha(p)}
assert sha(REFERENCE/'MANIFEST.json')=='7108881a6de2402f519ca7e6ccb806b83196db9fdcb14fb330e023b21b5bdc1a'
reference=json.loads((REFERENCE/'MANIFEST.json').read_text())
for f in reference['files']:
 p=REFERENCE/f['path'];assert p.stat().st_size==f['bytes'] and sha(p)==f['sha256'],f['path']
for name in ['kernel-tests.json','worker-tests.json','oracle-js-verification.json','actual-worker-python-verification.json','deferred-client-tests.json','signed-zero-worker-tests.json','conditioning-tests.json']:
 r=json.loads((ROOT/'reports'/name).read_text());assert r.get('allPassed',r.get('pass',False)),name
stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
runtime=[*sorted((ROOT/'js').glob('*.js')),*sorted((ROOT/'worker').glob('*.js')),ROOT/'index.html',ROOT/'harness.js']
common={'version':'v3','supersedesManifestSha256':'48f70dd4e0a4b80853ce8a69d1351bf67fc9a1ba29b930d063e87b4738f9b283','frozenAtUtc':stamp,'source':'https://arxiv.org/pdf/2105.03125v2','referenceSha256':sha(REFERENCE/'reference.py'),'referenceManifestSha256':sha(REFERENCE/'MANIFEST.json'),'scope':'Bounded fresh coherent effective-gain integer-support interpreted receiver. Actual Node Worker accepted; browser and website gates open.'}
(ROOT/'RUNTIME-MANIFEST.json').write_text(json.dumps({'schema':'sensing-otfs-browser-runtime-manifest-v1',**common,'files':[item(p) for p in runtime]},indent=2)+'\n')
files=[p for p in sorted(ROOT.rglob('*')) if p.is_file() and '__pycache__' not in p.parts and p.name!='MANIFEST.json' and p.suffix!='.pyc']
manifest={'schema':'sensing-otfs-browser-artifact-manifest-v1',**common,'sourceReferenceFilesReverified':len(reference['files']),'runtime':{'python':sys.version,'platform':platform.platform()},'acceptance':{'kernelCodecChecks':20,'fullOutputFixtures':113,'independentScalarOracle':True,'actualNodeWorkerLifecycleChecks':16,'signedZeroActualWorkerChecks':3,'conditioningChecks':8,'freshActualWorkerFullOutputRecords':16,'halfTieCategoricalDifferencePolicy':'Explicit limited allowance requiring near-half probabilities in both implementations and full per-iteration trace proof; no output snapping','browserVerified':False,'siteChanged':False,'sourceFigureReproduction':False},'files':[item(p) for p in files]}
(ROOT/'MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({'manifestSha256':sha(ROOT/'MANIFEST.json'),'runtimeManifestSha256':sha(ROOT/'RUNTIME-MANIFEST.json'),'artifactFiles':len(files),'runtimeFiles':len(runtime),'sourceFilesReverified':len(reference['files'])},indent=2))
