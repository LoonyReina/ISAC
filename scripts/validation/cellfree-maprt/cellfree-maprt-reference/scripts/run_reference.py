"""Generate the bounded experiment, retaining every solver and Monte Carlo trial.

No paper figure claim. All paired detections use the identical observation matrix;
allocation comparisons preserve the source budget and reuse common latent draws.
"""
from pathlib import Path
import argparse,hashlib,json,os,platform,sys,time
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
import scipy
from scipy.stats import norm
from src.maprt import MAPRT,cn,bistatic_gains,observation_design,sensing_quadratic_matrices,calibrate,exact_binomial_interval
from src.power import PowerProblem
from src.scenario import make_scenario
ROOT=Path(__file__).resolve().parents[1]


def write_json(path,value):path.write_text(json.dumps(value,indent=2,allow_nan=False)+'\n')

def hash_file(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def feasible_starts(problem,comm,with_sensing):
    base=np.asarray(comm['p'])
    max_scale=np.sqrt(problem.cap/max(problem.power_coeff@base**2))
    candidates=[]
    for i,fraction in enumerate([.1,.45,.85]):
        p=base*(1+fraction*(max_scale-1))
        if with_sensing:
            # Exact residual upper bounds for a sensing amplitude while holding
            # the now-strictly-feasible communication amplitudes fixed.
            cap_res=problem.cap-problem.power_coeff@p**2
            c_bounds=np.sqrt(np.maximum(cap_res,0)/problem.power_coeff[:,0])
            lhs=(problem.b*p[1:])**2/problem.gamma-1-np.sum((problem.a*p[None,:])**2,axis=1)
            com_bounds=np.sqrt(np.maximum(lhs,0)/np.maximum(problem.a[:,0]**2,1e-300))
            p[0]=[.2,.6,.9][i]*min(np.min(c_bounds),np.min(com_bounds))
        candidates.append(p)
    return candidates


def main(args):
    started=time.monotonic();out=ROOT/'evidence'/args.output;out.mkdir(parents=True,exist_ok=True)
    s=make_scenario(args.seed,args.channel_samples)
    hold=make_scenario(args.seed+7,args.channel_samples)
    settings=s['settings']|{'calibration_trials':args.calibration,'evaluation_trials':args.trials,
              'rcs_dbsm':args.rcs,'pfa':[.1,.01],'ccp_restarts':3,'max_ccp_iterations':100,
              'ccp_tolerance':1e-8,'SLSQP_maxiter':400,'SLSQP_ftol':1e-11,
              'calibration_seed':[args.seed,101],'evaluation_seed':[args.seed,202],
              'holdout_channel_seed':args.seed+7,'holdout_channel_samples':args.channel_samples,
              'python':platform.python_version(),'numpy':np.__version__,'scipy':scipy.__version__,
              'thread_environment':{k:os.environ.get(k) for k in ['OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','MKL_NUM_THREADS','NUMEXPR_NUM_THREADS']},
              'core_sha256':{str(p.relative_to(ROOT)):hash_file(p) for p in sorted((ROOT/'src').glob('*.py'))},
              'source_pdf_sha256':'30b871e5bb3dd1a66fab1a4c2ab3974abb8a7e664e04e2dfa62f6e50679c0d10',
              'interval_scope':'pointwise 95%; evaluation Clopper-Pearson conditional on frozen threshold; calibration Beta order-statistic separately; no familywise or deployment guarantee'}
    noise=settings['noise_variance_w'];nobs=settings['tau_s']*settings['Nrx']*settings['M']
    gains0=bistatic_gains(s['tx'],s['rx'],s['target'],settings['carrier_hz'],0.)
    a,b=sensing_quadratic_matrices(s['w'],s['symbols'],s['atx'],s['arx'],gains0,s['r_alpha'],s['r_h'])
    problem=PowerProblem(a,b,nobs*noise,s['b'],s['a'],s['power_coeff'],1.,settings['communication_gamma'])
    comm=problem.communication_centric()
    allocations={'comm_centric':comm};runs={}
    if not comm['accepted']:
        write_json(out/'solver_records.json',{'comm_centric':comm,'termination':'communication_infeasible_or_solver_failure'})
        write_json(out/'settings.json',settings)
        raise RuntimeError('communication baseline is infeasible or failed; record retained')
    for name,with_sensing in [('isac',False),('isac_plus_s',True)]:
        starts=feasible_starts(problem,comm,with_sensing)
        records=[problem.ccp(p,allow_sensing=with_sensing) for p in starts]
        direct=[problem.direct_ratio(p,allow_sensing=with_sensing) for p in starts]
        accepted=[(i,r) for i,r in enumerate(records) if r['accepted']]
        selected=max(accepted,key=lambda ir:ir[1]['final']['metrics']['sensing_sinr']) if accepted else None
        runs[name]={'starts':[p.tolist() for p in starts],'ccp':records,'direct_ratio':direct,
                    'selected_restart':None if selected is None else selected[0],
                    'selection':'largest source sensing-SINR among accepted converged restarts; all failures/local outcomes retained'}
        if selected is not None:allocations[name]=selected[1]['final']
    # Non-paper baseline: rescale communication-only powers to saturate its most
    # restrictive AP; same cap, explicitly not equal actual total power.
    pc=np.asarray(comm['p']);scale=np.sqrt(1/max(problem.power_coeff@pc**2));ps=pc*scale
    allocations['comm_cap_saturated']={'p':ps.tolist(),'accepted':bool(np.min(problem.constraints(ps))>=-2e-7),
                                     'metrics':problem.metrics(ps),'not_paper_baseline':True,'amplitude_scale':float(scale)}
    held=PowerProblem(a,b,nobs*noise,hold['b'],hold['a'],hold['power_coeff'],1.,settings['communication_gamma'])
    for allocation in allocations.values():
        p=np.array(allocation['p'])
        allocation['heldout_channel_moment_metrics']=held.metrics(p)
        allocation['heldout_minimum_soc_slack']=float(np.min(held.constraints(p)))
        allocation['heldout_moment_constraint_violation']=bool(np.min(held.constraints(p)) < -2e-7)
        allocation['constraint_scope']='fit empirical expected powers/SINRs; holdout checks are estimates, not deterministic guarantees'
    # Deliberate negative cases exercise accounting, never added to the scientific
    # performance cells or silently replaced with successful fallback results.
    infeasible=PowerProblem(a,b,nobs*noise,s['b']*.001,s['a'],s['power_coeff'],1.,settings['communication_gamma'])
    failure_probes={'infeasible_communication':infeasible.communication_centric(),
                    'infeasibility_witness':{'maximum_possible_desired_soc_side':(infeasible.b*infeasible.upper[1:]/np.sqrt(infeasible.gamma)).tolist(),'noise_norm_lower_bound':1.,'reason':'any desired side below one proves the corresponding communication SOC impossible'},
                    'infeasible_initial':problem.ccp(np.zeros(len(s['b'])+1)),
                    'iteration_cap':problem.ccp(feasible_starts(problem,comm,True)[0],max_iterations=1,tolerance=0),
                    'subproblem_cap':problem.ccp(feasible_starts(problem,comm,True)[0],subproblem_maxiter=1)}
    write_json(out/'solver_records.json',{'allocations':allocations,'runs':runs,'negative_probes':failure_probes,
                 'RCS_scaling':'uniform physical RCS rescales A only, so the mathematical power optimizer is unchanged across this RCS sweep',
                 'global_ratio_optimality':'not claimed; direct ratio runs are independent local checks, not proof'})
    write_json(out/'settings.json',settings)
    design={k:v for k,v in s.items() if isinstance(v,np.ndarray)}
    design.update(A_rcs0=a,B=b,holdout_b=hold['b'],holdout_a=hold['a'],holdout_power_coeff=hold['power_coeff'],
                  holdout_effective_channels=hold['moment_effective_channels'],holdout_sensing_leak=hold['moment_sensing_leak'],holdout_precoders=hold['moment_precoders'])
    np.savez_compressed(out/'design_and_channel_moments.npz',**design)
    cal_rng=np.random.default_rng(np.random.SeedSequence([args.seed,101]));ev_rng=np.random.default_rng(np.random.SeedSequence([args.seed,202]))
    nh=s['r_h'].shape[0];na=s['r_alpha'].shape[0]
    cal_h=cn(cal_rng,(nh,args.calibration));cal_n=cn(cal_rng,(nobs,args.calibration))
    ev_h=cn(ev_rng,(nh,args.trials));ev_n=cn(ev_rng,(nobs,args.trials));ev_a=cn(ev_rng,(na,args.trials))
    np.savez_compressed(out/'raw_common_trials.npz',calibration_trial_id=np.arange(args.calibration),evaluation_trial_id=np.arange(args.trials),
                        truth_calibration_z_h=cal_h,truth_calibration_z_n=cal_n,truth_evaluation_z_h=ev_h,
                        truth_evaluation_z_n=ev_n,truth_evaluation_z_alpha=ev_a)
    lh=np.linalg.cholesky(s['r_h']);la=np.linalg.cholesky(s['r_alpha'])
    rows=[];paired=[];all_scores={};witnesses={};checks=[]
    for name,allocation in allocations.items():
        p=np.array(allocation['p'])
        for rcs in args.rcs:
            gains=gains0*10**(rcs/10)
            g,x,transmit=observation_design(s['w'],s['symbols'],p,s['atx'],s['arx'],gains)
            yc=x@(lh@cal_h)+np.sqrt(noise)*cal_n
            y0=x@(lh@ev_h)+np.sqrt(noise)*ev_n
            y1=y0+g@(la@ev_a)
            # Only observation/prior/design enters detector, not any truth arrays.
            detectors={'AP':MAPRT(g,x,s['r_alpha'],s['r_h'],noise),
                       'SP':MAPRT(g,np.zeros((nobs,0)),s['r_alpha'],np.zeros((0,0)),noise)}
            stem=f'{name}__rcs_{rcs:g}'
            witnesses[stem+'__y_calibration_first32']=yc[:,:32]
            witnesses[stem+'__y_h0_first32']=y0[:,:32];witnesses[stem+'__y_h1_first32']=y1[:,:32]
            witnesses[stem+'__G']=g;witnesses[stem+'__X']=x;witnesses[stem+'__transmit']=transmit
            decisions={}
            for label,det in detectors.items():
                sc,s0,s1=det.score(yc),det.score(y0),det.score(y1)
                key=stem+'__'+label
                all_scores[key+'__calibration']=sc;all_scores[key+'__h0']=s0;all_scores[key+'__h1']=s1
                # Exact integral constant and source MAP normalizer differ. The
                # shifted threshold makes the two definitions' decisions agree.
                offset=det.log_det_ratio-det.log_c3
                checks.append({'allocation':name,'rcs_dbsm':rcs,'detector':label,
                    'max_direct_joint_error_first8':float(max(abs(det.score(y1[:,i])-det.direct_log_joint_ratio(y1[:,i])) for i in range(8))),
                    'map_vs_integrated_constant_shift':float(offset),
                    'quadratic_min':float(min(np.min(sc-det.log_c3),np.min(s0-det.log_c3),np.min(s1-det.log_c3))),
                    'source_sinr_direct_trace':float(np.trace(g@s['r_alpha']@g.conj().T).real/(nobs*noise+np.trace(x@s['r_h']@x.conj().T).real)),
                    'source_sinr_quadratic':float(10**(rcs/10)*problem.sinr(p))})
                for target_pfa in [.1,.01]:
                    calibration=calibrate(sc,target_pfa)
                    threshold=calibration['threshold']
                    d0=s0>=threshold;d1=s1>=threshold
                    decisions[(label,target_pfa)]=d1
                    all_scores[key+f'__pfa_{target_pfa:g}__decision_h0']=d0
                    all_scores[key+f'__pfa_{target_pfa:g}__decision_h1']=d1
                    n0,n1=int(d0.sum()),int(d1.sum())
                    integrated=det.marginalized_log_lrt(y1)>=(threshold+offset)
                    rows.append({'allocation':name,'rcs_dbsm':rcs,'detector':label,'target_pfa':target_pfa,
                        'threshold_calibration':calibration,'evaluation_trials':args.trials,'false_alarms':n0,'detections':n1,'misses':args.trials-n1,'correct_rejections':args.trials-n0,
                        'estimated_pfa':n0/args.trials,'estimated_pd':n1/args.trials,
                        'pfa_clopper_pearson_95':exact_binomial_interval(n0,args.trials),
                        'pd_clopper_pearson_95':exact_binomial_interval(n1,args.trials),
                        'integrated_lrt_shifted_threshold_decision_disagreements':int(np.sum(integrated!=d1)),
                        'actual_block_tx_energy_symbol_w':float(np.sum(np.abs(transmit)**2)),
                        'average_power_resource':allocation['metrics'],'source_sensing_sinr':float(problem.sinr(p)*10**(rcs/10)),
                        'threshold_unit':'log optimized joint-density ratio; natural logarithm'})
            for target_pfa in [.1,.01]:
                da,ds=decisions[('AP',target_pfa)],decisions[('SP',target_pfa)]
                diff=da.astype(int)-ds.astype(int);mean=float(diff.mean());se=float(diff.std(ddof=1)/np.sqrt(len(diff)))
                paired.append({'allocation':name,'rcs_dbsm':rcs,'target_pfa':target_pfa,'comparison':'AP minus SP on identical cluttered H1 observations',
                               'trial_count':len(diff),'pd_difference':mean,'paired_normal_95':[max(-1.,mean-1.96*se),min(1.,mean+1.96*se)],
                               'AP_only_detections':int(np.sum(diff==1)),'SP_only_detections':int(np.sum(diff==-1))})
    np.savez_compressed(out/'raw_detector_scores_and_decisions.npz',**all_scores)
    np.savez_compressed(out/'raw_observation_witnesses.npz',**witnesses)
    write_json(out/'detector_checks.json',checks)
    write_json(out/'results.json',{'cells':rows,'paired_detector_comparisons':paired,
              'conditional_scope':'fixed target, geometry, communication-channel design and symbol block; randomized RCS/clutter/noise per independent trial',
              'raw_record_contract':'All latent draws and trial IDs, exact design matrices and all scores/decisions retained. Full observations regenerate from stored arrays; first 32 are stored directly for every point. Latent truths are never passed to detector.',
              'failure_policy':'all scientific cells with unavailable allocation omitted with solver failure retained; counts disclose existing cells',
              'allocation_count':len(allocations),'cell_count':len(rows),'wall_seconds':time.monotonic()-started})
    print(json.dumps({'output':str(out),'allocations':list(allocations),'cells':len(rows),'seconds':time.monotonic()-started,
                      'heldout_violations':{k:v['heldout_moment_constraint_violation'] for k,v in allocations.items()},
                      'ccp_terminations':{k:[r['termination'] for r in v['ccp']] for k,v in runs.items()}}))

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--calibration',type=int,default=16384);parser.add_argument('--trials',type=int,default=8192)
    parser.add_argument('--channel-samples',type=int,default=1024);parser.add_argument('--seed',type=int,default=2026101301)
    parser.add_argument('--rcs',type=float,nargs='+',default=[-30,-20,-10,0]);parser.add_argument('--output',default='selected')
    main(parser.parse_args())
