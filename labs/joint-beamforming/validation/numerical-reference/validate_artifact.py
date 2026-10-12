"""Read-only release integrity and final gate checks; no solver rerun."""
import json,hashlib
from pathlib import Path
root=Path(__file__).parent
freeze=json.loads((root/'REFERENCE-FREEZE.json').read_text())
for entry in freeze['files']:
    p=root/entry['path'];assert p.is_file(),entry['path']
    assert hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256'],entry['path']
s=json.loads((root/'results/summary.json').read_text())
assert s['primary_attempt_count']==704 and s['refinement_attempt_count']==135
assert s['final_counts']['sdr']=={'accepted':347,'solver_infeasible':4,'phase_one_infeasible':1}
assert s['final_counts']['zf']=={'accepted':347,'solver_infeasible':5}
assert not s['ordering_checks']['monotonicity_violations'] and not s['ordering_checks']['dominance_violations']
assert json.loads((root/'results/boundary-tests.json').read_text())['all_passed']
review=json.loads((root/'independent-review/final_selection_audit.json').read_text())
assert review['all_checks_passed']
print(f"PASS: {len(freeze['files'])} file hashes,704 primary attempts,135 refinements,694 accepted solutions,10 infeasible outcomes, independent final audit")
