from reference import *
from collections import Counter
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).parent;out=ROOT/'results'
primary=[json.loads(p.read_text()) for p in sorted(out.glob('trial-*.json'))]
assert len(primary)==704 and (out/'refinement/index.json').exists()
selected={};attempts={}
for p in primary:
 key=(p['trial'],p['kind'],int(p['gamma_db']));stem=f"trial-{p['trial']:03d}-{p['kind']}-gamma-{int(p['gamma_db']):02d}"
 rr=[json.loads(f.read_text()) for f in sorted((out/'refinement').glob(stem+'-attempt-*.json'))]
 attempts[key]=[p]+rr
 good=[x for x in [p]+rr if x['accepted']]
 x=good[0] if good else ([z for z in rr if z['status']=='infeasible'] or rr or [p])[-1]
 state='accepted' if x['accepted'] else ('solver_infeasible' if x['status']=='infeasible' else 'unresolved_numerical')
 phase=out/f'phase-one-trial-{key[0]:03d}-gamma-{key[2]}.json'
 if state=='unresolved_numerical' and phase.exists() and json.loads(phase.read_text()).get('conservative_certificate',{}).get('implies_infeasible'): state='phase_one_infeasible'
 selected[key]=(x,state)

rng=np.random.default_rng(2026101299)
def stats(values):
 a=np.asarray(values,dtype=float)
 if len(a)==0:return {'n':0,'mean':None,'bootstrap95':None}
 means=np.mean(a[rng.integers(0,len(a),size=(5000,len(a)))],axis=1)
 return {'n':len(a),'mean':float(a.mean()),'mc_standard_error':float(a.std(ddof=1)/np.sqrt(len(a))) if len(a)>1 else None,'bootstrap95':[float(v) for v in np.quantile(means,[.025,.975])]}
def wilson(k,n):
 z=1.959963984540054;p=k/n;den=1+z*z/n;center=(p+z*z/(2*n))/den;half=z*np.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
 return [float(center-half),float(center+half)]
gammas=list(range(4,25,2));summary=[]
for gd in gammas:
 row={'gamma_db':gd,'methods':{}}
 pair=[i for i in range(32) if all(selected[(i,k,gd)][1]=='accepted' for k in ['sdr','zf'])]
 row['paired_accepted_trials']=pair;row['paired_accepted_count']=len(pair)
 for kind in ['sdr','zf']:
  cells=[selected[(i,kind,gd)] for i in range(32)];counts=Counter(state for r,state in cells)
  row['methods'][kind]={'status_counts':dict(counts),'accepted_fraction':counts['accepted']/32,'accepted_fraction_wilson95':wilson(counts['accepted'],32),'paired_objective':stats([selected[(i,kind,gd)][0]['metrics']['objective'] for i in pair]),'paired_eq46_mse':stats([selected[(i,kind,gd)][0]['metrics']['eq46_mse'] for i in pair]),'paired_min_sinr_db':stats([selected[(i,kind,gd)][0]['factor_metrics']['min_sinr_db'] for i in pair]),'paired_sum_rate':stats([selected[(i,kind,gd)][0]['factor_metrics']['sum_rate_bits_per_use'] for i in pair]),'paired_radar_interference_to_noise':stats([selected[(i,kind,gd)][0]['factor_metrics']['radar_interference_to_noise_mean'] for i in pair])}
 row['paired_zf_minus_sdr_objective']=stats([selected[(i,'zf',gd)][0]['metrics']['objective']-selected[(i,'sdr',gd)][0]['metrics']['objective'] for i in pair])
 row['paired_zf_minus_sdr_eq46_mse']=stats([selected[(i,'zf',gd)][0]['metrics']['eq46_mse']-selected[(i,'sdr',gd)][0]['metrics']['eq46_mse'] for i in pair])
 summary.append(row)

accepted_records=[r for r,state in selected.values() if state=='accepted']
maxima={
 'direct_objective_abs_error':max(r['residuals']['objective_recompute_abs'] for r in accepted_records),
 'diagonal_max_error':max(r['residuals']['diagonal_max_error'] for r in accepted_records),
 'minimum_covariance_eigenvalue':min(r['residuals']['minimum_eigenvalue'] for r in accepted_records),
 'factor_covariance_fro':max(r['factor_metrics']['factor_covariance_fro'] for r in accepted_records),
 'factor_diagonal_max_error':max(r['factor_metrics']['factor_diagonal_max_error'] for r in accepted_records),
 'relative_recovered_sinr_shortfall':max(max(0,-r['factor_metrics']['sinr_margin_linear']/max(1,r['gamma_linear'])) for r in accepted_records),
 'stationarity_max':max(max([r['kkt']['covariance_stationarity_fro'],r['kkt']['alpha_stationarity_abs']]+r['kkt']['other_stationarity_norms']) for r in accepted_records),
 'dual_min_psd_eigenvalue':min(r['kkt']['dual_min_psd_eigenvalue'] for r in accepted_records),
 'complementarity_max_abs':max(r['kkt']['complementarity_max_abs'] for r in accepted_records),
 'zf_max_radar_power':max(max(r['factor_metrics']['radar_power']) for r in accepted_records if r['kind']=='zf'),
 'zf_max_interuser_power':max(max(r['factor_metrics']['interuser_power']) for r in accepted_records if r['kind']=='zf')}
monotonic=[];dominance=[]
for trial in range(32):
 for kind in ['sdr','zf']:
  rs=[selected[(trial,kind,g)][0] for g in gammas if selected[(trial,kind,g)][1]=='accepted']
  for a,b in zip(rs,rs[1:]):
   monotonic.append(dict(trial=trial,kind=kind,from_gamma=a['gamma_db'],to_gamma=b['gamma_db'],drop=a['metrics']['objective']-b['metrics']['objective']))
 for g in gammas:
  s,ss=selected[(trial,'sdr',g)];z,zs=selected[(trial,'zf',g)]
  if ss==zs=='accepted': dominance.append(dict(trial=trial,gamma_db=g,sdr_minus_zf=s['metrics']['objective']-z['metrics']['objective']))
checks={'maximum_objective_monotonicity_drop':max(x['drop'] for x in monotonic),'maximum_sdr_minus_zf_objective':max(x['sdr_minus_zf'] for x in dominance),'ordering_tolerance':5e-5,'monotonicity_violations':[x for x in monotonic if x['drop']>5e-5],'dominance_violations':[x for x in dominance if x['sdr_minus_zf']>5e-5]}
def tim(d):
 a=np.array(d);return dict(n=len(d),median_seconds=float(np.median(a)),p95_seconds=float(np.quantile(a,.95)),worst_seconds=float(a.max()),total_seconds=float(a.sum()))
primary_counts={k:dict(Counter('accepted' if r['accepted'] else 'solver_infeasible' if r['status']=='infeasible' else 'numerical_rejection' for r in primary if r['kind']==k)) for k in ['sdr','zf']}
final_counts={k:dict(Counter(state for (trial,kind,g),(r,state) in selected.items() if kind==k)) for k in ['sdr','zf']}
refinement=json.loads((out/'refinement/index.json').read_text())['records']
full={'scope':'Original M10/K2 selected-experiment slice, 32 paired trials, original grid/objective; full paper not reproduced','primary_attempt_count':len(primary),'primary_counts':primary_counts,'refinement_attempt_count':len(refinement),'final_counts':final_counts,'summary_by_gamma':summary,'accepted_residual_extrema':maxima,'ordering_checks':checks,'primary_timings':{k:tim([r['elapsed_seconds'] for r in primary if r['kind']==k]) for k in ['sdr','zf']},'refinement_timings':tim([r['elapsed_seconds'] for r in refinement]),'bootstrap':{'resamples':5000,'seed':2026101299,'interval':'percentile 95%, conditional on paired accepted channels at each Gamma','caveat':'Finite sample of 32; denominators vary at infeasible/failed thresholds. Intervals do not remove selection bias or reproduce 1000-trial source curves.'},'selection_records':[{'trial':key[0],'kind':key[1],'gamma_db':key[2],'state':state,'selected_refinement_attempt':r.get('refinement_attempt'),'status':r['status'],'gate_failures':r['gate_failures']} for key,(r,state) in selected.items()]}
save_json(out/'summary.json',full)
# Actual numeric curves, never hand-drawn peaks.
plt.rcParams.update({'font.size':10,'axes.spines.top':False,'axes.spines.right':False})
fig,axs=plt.subplots(2,2,figsize=(12,8),constrained_layout=True)
radar=json.loads((out/'radar.json').read_text());angles=RadarModel().angles
ax=axs[0,0];ax.plot(angles,radar['metrics']['pattern'],color='black',label='Solved radar-only')
for kind,color in [('sdr','#1664b5'),('zf','#c75717')]:
 pair=summary[4]['paired_accepted_trials'];patterns=np.array([selected[(i,kind,12)][0]['metrics']['pattern'] for i in pair]);ax.plot(angles,patterns.mean(axis=0),label=f'{kind.upper()} mean ({len(pair)} paired)',color=color)
ax.set(xlabel='Angle (degrees)',ylabel='Transmit power aᴴRa',title='Fig.3 scope: Γ=12 dB; no SSP');ax.legend(fontsize=9)
for kind,color in [('sdr','#1664b5'),('zf','#c75717')]:
 for ax,field,label in [(axs[0,1],'paired_eq46_mse','Eq.46 power-pattern MSE'),(axs[1,0],'paired_objective','Optimized radar objective Lr')]:
  st=[row['methods'][kind][field] for row in summary];means=np.array([x['mean'] for x in st]);interval=np.array([x['bootstrap95'] for x in st]);ax.plot(gammas,means,'o-',color=color,label=kind.upper());ax.fill_between(gammas,np.maximum(interval[:,0],1e-16),interval[:,1],color=color,alpha=.12);ax.set(xlabel='Γ (dB)',ylabel=label)
axs[0,1].axhspan(1e-16,1e-10,color='gray',alpha=.06);axs[0,1].text(.98,.08,'Below 1e−10: numerical agreement with radar-only',transform=axs[0,1].transAxes,ha='right',fontsize=8,color='#555555');axs[0,1].set_yscale('log');axs[0,1].set_title('Fig.5 scope: paired accepted cases, 95% bootstrap');axs[0,1].legend()
axs[1,0].set_title('Same Eq.14 objective for both algorithms');axs[1,0].legend()
ax=axs[1,1]
for kind,color in [('sdr','#1664b5'),('zf','#c75717')]:
 ac=[r['methods'][kind]['status_counts'].get('accepted',0) for r in summary];inf=[r['methods'][kind]['status_counts'].get('solver_infeasible',0)+r['methods'][kind]['status_counts'].get('phase_one_infeasible',0) for r in summary];rej=[r['methods'][kind]['status_counts'].get('unresolved_numerical',0) for r in summary]
 ax.plot(gammas,ac,'o-',color=color,label=f'{kind.upper()} accepted');ax.plot(gammas,inf,'x--',color=color,label=f'{kind.upper()} infeasible (certified)')
 if any(rej):ax.plot(gammas,rej,'s:',color=color,label=f'{kind.upper()} unresolved')
ax.set(xlabel='Γ (dB)',ylabel='Trial count / 32',ylim=(-.5,33),title='Fig.8 scope: all outcomes retained');ax.legend(fontsize=8)
fig.suptitle('Joint beamforming: actual M=10, K=2 optimization • 32 paired channels\nReduced Monte Carlo slice; not original 1000-trial or full-paper reproduction',fontsize=13)
fig.savefig(out/'selected-experiment.png',dpi=160);fig.savefig(out/'selected-experiment.svg');plt.close(fig)
print(json.dumps({k:full[k] for k in ['primary_counts','refinement_attempt_count','final_counts','accepted_residual_extrema','ordering_checks','primary_timings','refinement_timings']},indent=2))
