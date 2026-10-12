"""Read-only verification of the exact-byte selected public evidence."""
from pathlib import Path
import hashlib,json
p=Path(__file__).resolve().parent
m=json.loads((p/'PUBLIC-EVIDENCE-MANIFEST.json').read_text())
h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
assert h(p/'REFERENCE-FREEZE.json')==m['originalFreezeSha256']
original={r['path']:r for r in json.loads((p/'REFERENCE-FREEZE.json').read_text())['files']}
assert len(original)==917
for r in m['includedOriginalFiles']:
 assert h(p/r['path'])==r['sha256'],r['path']
 if r['sourceOriginalFreezeEntry']:assert original[r['path']]['sha256']==r['sha256']
s=json.loads((p/'results/summary.json').read_text());a=json.loads((p/'results/sweep-index.json').read_text());b=json.loads((p/'results/refinement/index.json').read_text())
assert len(a['records'])==s['primary_attempt_count']==704
assert len(b['records'])==s['refinement_attempt_count']==135
assert len(s['selection_records'])==704
assert s['final_counts']['sdr']=={'accepted':347,'solver_infeasible':4,'phase_one_infeasible':1}
assert s['final_counts']['zf']=={'accepted':347,'solver_infeasible':5}
for trial in [0,6,9,20,22]:
 c=json.loads((p/f'results/phase-one-trial-{trial:03d}-gamma-24.json').read_text())
 assert c['conservative_certificate']['implies_infeasible']
print(f"PASS {len(m['includedOriginalFiles'])} exact original files,917 original hashes,704 primary/135 refinement/final704 selections,5 certificates")
