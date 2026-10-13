"""Create source-free, relocatable original-implementation packages and hash manifest."""
from pathlib import Path
import hashlib,json,zipfile,sys
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT.parent
sha=lambda b:hashlib.sha256(b).hexdigest()
runtime=['kernel.mjs','math.mjs','presets.mjs','runtime.mjs','worker.mjs','codec.mjs','vendor/linalg.js']
reference={'paper':'arxiv:2204.06938v8','pdf_sha256':'8bfc316c0faf57c42a8cf2395a1bce594a9f987750f37287680fdb9e190dc342','core_sha256':'b06e329b927cda7adb1e2d38b320a1f2ca1bee287ebe8dec50d6de86fe176bb2','manifest_sha256':'716560ac0ecb32689ad187b6866f7ead4e07fe76d21e4490991bde5c4110ddad','archive_sha256':'235619c80cc0ebf8551138a1ef241adefacddb0f15a79ca973718fb5ccd5481c'}
freeze={'schema':'gaussian-isac-js-source-freeze-v1','release':'0.1','date':'2026-10-12','reference':reference,'runtime_files':{f:sha((ROOT/f).read_bytes()) for f in runtime},'source_free':'No paper PDF, source figure image or author code is included; code is original first-party implementation','testing_boundary':'actual Node worker_threads plus browser-module-branch VM; no actual browser or UI validation','presets':'input matrices only, never table-driven result lookup'}
(ROOT/'SOURCE-FREEZE.json').write_text(json.dumps(freeze,indent=2)+'\n')
exclude={'ARTIFACT-MANIFEST.json','ARCHIVE-VERIFICATION.json'}
files=sorted(p for p in ROOT.rglob('*') if p.is_file() and p.name not in exclude and '__pycache__' not in p.parts and p.suffix not in {'.pyc','.zip','.tar','.gz'})
manifest={'schema':'gaussian-isac-js-artifact-manifest-v1','self_excluded':True,'files':[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in files]}
(ROOT/'ARTIFACT-MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
full=files+[ROOT/'ARTIFACT-MANIFEST.json'];support=['README.md','HANDOFF.md','PROTOCOL-HANDOFF.md','ATTRIBUTION.md','NUMERICAL-VERIFICATION.md','SOURCE-FREEZE.json','DEVELOPMENT-FIXES.json'];rows=[]
for label,selected in [('runtime',[ROOT/x for x in runtime+support]),('full-evidence',full)]:
 target=OUT/f'gaussian-tradeoff-js-v0.1-{label}.zip'
 with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for p in sorted(selected):
   name='gaussian-tradeoff-js-v0.1/'+str(p.relative_to(ROOT));i=zipfile.ZipInfo(name,(2026,10,12,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;i.external_attr=(0o100755 if p.suffix=='.sh' else 0o100644)<<16;z.writestr(i,p.read_bytes())
 with zipfile.ZipFile(target) as z:
  names=z.namelist();assert len(names)==len(set(names))==len(selected)
  for p in selected:assert z.read('gaussian-tradeoff-js-v0.1/'+str(p.relative_to(ROOT)))==p.read_bytes()
  assert not any(n.lower().endswith(('.pdf','.png','.jpg','.jpeg','.webp')) for n in names)
 rows.append({'kind':label,'path':str(target),'bytes':target.stat().st_size,'sha256':sha(target.read_bytes()),'members':len(selected),'member_bytes_verified':True})
verification={'schema':'gaussian-isac-js-archive-verification-v1','source_free':True,'archive_members_match_files':True,'manifest_sha256':sha((ROOT/'ARTIFACT-MANIFEST.json').read_bytes()),'source_freeze_sha256':sha((ROOT/'SOURCE-FREEZE.json').read_bytes()),'archives':rows}
(ROOT/'ARCHIVE-VERIFICATION.json').write_text(json.dumps(verification,indent=2)+'\n');print(json.dumps(verification,indent=2))
