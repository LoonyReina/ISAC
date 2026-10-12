"""Recompute phase-I certificates for all primary ZF-infeasible channels."""
from validate_feasibility import *
cases=[]
for f in (ROOT/'results').glob('trial-*-zf-*.json'):
    r=json.loads(f.read_text())
    if r['status']=='infeasible': cases.append((r['trial'],int(r['gamma_db'])))
for trial,gamma_db in sorted(cases): phase_one(trial,gamma_db)
