from refinement import *
import hashlib
model=RadarModel(); R0=matrix_from_json(json.loads((ROOT/'results/radar.json').read_text())['R']);index=[]
plan=json.loads((ROOT/'REFINEMENT-PLAN.json').read_text())
for path in sorted((ROOT/'results').glob('trial-*.json')):
    primary=json.loads(path.read_text())
    if primary['accepted']: continue
    H=matrix_from_json(primary['H']);kind=primary['kind'];gd=primary['gamma_db'];trial=primary['trial']
    for attempt,solver,extra in [(1,'CLARABEL',None),(2,'SCS',dict(eps=2e-9,max_iters=200000))]:
        r=RealConeSolver(model,kind,H).solve(gd,solver,R0=R0,solver_settings=extra)
        r.update(trial=trial,seed=primary['seed'],H=primary['H'],H_sha256=primary['H_sha256'],config=primary['config'],primary_attempt=path.name,refinement_attempt=attempt)
        r['accepted'],r['gate_failures']=accepted(r)
        name=path.stem+f'-attempt-{attempt}.json';save_json(ROOT/'results/refinement'/name,r)
        brief={k:r[k] for k in ['trial','kind','gamma_db','status','accepted','gate_failures','elapsed_seconds','iterations'] if k in r};brief.update(file=name,solver=solver,attempt=attempt)
        index.append(brief);print(json.dumps(brief),flush=True)
        save_json(ROOT/'results/refinement/progress.json',{'records':index})
        if r['accepted'] or r['status']=='infeasible': break
save_json(ROOT/'results/refinement/index.json',{'records':index,'plan':plan,'reference_sha256':hashlib.sha256((ROOT/'reference.py').read_bytes()).hexdigest(),'refinement_sha256':hashlib.sha256((ROOT/'refinement.py').read_bytes()).hexdigest()})
