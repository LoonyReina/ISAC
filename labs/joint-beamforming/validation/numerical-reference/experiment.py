from reference import *
import argparse, platform
ROOT=Path(__file__).parent

def accepted(r):
    issues=[]; gate=json.loads((ROOT/'VALIDATION-PLAN.json').read_text())['gates']
    if not r.get('solution_available'): return False,['no_solution']
    if r.get('recovery_status')!='recovered': issues.append('factor_recovery_failed')
    x=r['residuals']; k=r['kkt']; f=r.get('factor_metrics',{})
    for key in ('constraint_max_violation',):
        if x[key]>gate['primal_constraint_max_violation']: issues.append(key)
    if x['minimum_eigenvalue']<gate['minimum_covariance_eigenvalue']: issues.append('psd')
    if max([k['covariance_stationarity_fro'],k['alpha_stationarity_abs']]+k['other_stationarity_norms'])>gate['stationarity_fro']: issues.append('stationarity')
    if k['dual_min_psd_eigenvalue']<gate['dual_min_psd_eigenvalue']: issues.append('dual_psd')
    if k['dual_min_inequality_value'] is not None and k['dual_min_inequality_value']<gate['dual_min_inequality_value']: issues.append('dual_inequality')
    if k['complementarity_max_abs']>gate['complementarity_max_abs']: issues.append('complementarity')
    gap=r.get('solver_info',{}).get('gap')
    if gap is not None and abs(gap)>gate['relative_objective_gap']*max(1,abs(r['solver_objective'])): issues.append('duality_gap')
    if f:
        if f['factor_covariance_fro']>gate['factor_covariance_fro']: issues.append('factor_covariance')
        if f['factor_diagonal_max_error']>gate['factor_per_antenna_error']: issues.append('factor_diagonal')
        if -f['sinr_margin_linear']>gate['recovered_sinr_relative_shortfall']*max(1,r['gamma_linear']): issues.append('recovered_sinr')
    return not issues,issues

def run():
    parser=argparse.ArgumentParser();parser.add_argument('--trials',type=int,default=32);parser.add_argument('--solver',default='SCS');args=parser.parse_args()
    model=RadarModel(); cfg=dataclasses.asdict(model.cfg); output=ROOT/'results';output.mkdir(exist_ok=True)
    r=Solver(model,'radar').solve(solver=args.solver);r['accepted'],r['gate_failures']=accepted(r)
    save_json(output/'radar.json',r); R0=matrix_from_json(r['R'])
    plan=json.loads((ROOT/'VALIDATION-PLAN.json').read_text());records=[]
    for trial in range(args.trials):
        seed=plan['seed_base']+trial;H=rng_channel(seed)
        solvers={kind:Solver(model,kind,H) for kind in ['sdr','zf']}
        for gd in plan['gamma_db']:
            for kind,solver in solvers.items():
                path=output/f'trial-{trial:03d}-{kind}-gamma-{gd:02d}.json'
                result=solver.solve(gd,args.solver,R0=R0)
                result.update(trial=trial,seed=seed,H=matrix_json(H),H_sha256=fingerprint(H),config=cfg)
                result['accepted'],result['gate_failures']=accepted(result)
                save_json(path,result)
                brief={k:result[k] for k in ['trial','seed','kind','gamma_db','status','accepted','gate_failures','elapsed_seconds','iterations']}
                if result.get('solution_available'): brief.update(objective=result['metrics']['objective'],eq46_mse=result['metrics']['eq46_mse'],min_sinr_db=result.get('factor_metrics',{}).get('min_sinr_db'))
                records.append(brief)
                print(json.dumps(brief),flush=True)
        save_json(output/'progress.json',{'finished_trials':trial+1,'records':records})
    save_json(output/'sweep-index.json',{'plan':plan,'actual_trials':args.trials,'primary_solver':args.solver,'radar_accepted':r['accepted'],'records':records,'versions':{'python':platform.python_version(),'numpy':np.__version__,'cvxpy':cp.__version__},'core_sha256':hashlib.sha256((ROOT/'reference.py').read_bytes()).hexdigest()})
if __name__=='__main__': run()
