"""Independent audit runner for the production JS solver (no BA reimplementation)."""
import argparse,hashlib,json,pathlib,subprocess,numpy as np
from independent_reference import optimize,bayes_cost
HERE=pathlib.Path(__file__).parent
parser=argparse.ArgumentParser()
parser.add_argument('--core',required=True,help='Path to production capacity-distortion-core.js')
args=parser.parse_args()
rng=np.random.default_rng(180505713)
rows=[]
for k in range(75):
 ns=2;nx=3;ny=3;nz=3
 ps=rng.dirichlet(np.ones(ns));w=rng.dirichlet(np.ones(ny),size=(ns,nx));v=rng.dirichlet(np.ones(nz),size=(ns,nx))
 b=np.sort(rng.uniform(0,2,nx));B=float(rng.uniform(b.min(),b.max()));mu=float(rng.uniform(0,15));loss=np.array([[0,1],[1,0]])
 c,_=bayes_cost(ps,v,loss);ref=optimize(ps,w,c,b,B,mu)
 rows.append({'id':k,'model':{'ps':ps.tolist(),'wy':w.tolist(),'vz':v.tolist(),'loss':loss.tolist(),'costs':b.tolist(),'budget':B},'mu':mu,'ref':ref})
(HERE/'randomized_optimizer_fixtures.json').write_text(json.dumps(rows,indent=2)+'\n')
core=str(pathlib.Path(args.core).resolve())
js='''const fs=require('fs'), c=require(process.argv[1]);
const rows=JSON.parse(fs.readFileSync(process.argv[2]));
const output=rows.flatMap(row=>['bisection','projected-gradient'].map(strategy=>{
const o=c.solve(c.createModel(row.model),{mu:row.mu,tolerance:1e-10,maxIterations:10000,dualStrategy:strategy});
return {id:row.id,strategy,status:o.status,p:o.p,rateBits:o.rateBits,distortion:o.distortion,cost:o.cost,objectiveNats:o.objectiveNats,gapNats:o.gapNats,iterations:o.iterations,fallbackIterations:o.trace.filter(t=>t.innerFallback).length,totalInnerIterations:o.trace.reduce((n,t)=>n+t.innerIterations,0)};}));
process.stdout.write(JSON.stringify(output));'''
output=json.loads(subprocess.check_output(['node','-e',js,core,str(HERE/'randomized_optimizer_fixtures.json')]))
summary={'production_core_sha256':hashlib.sha256(pathlib.Path(core).read_bytes()).hexdigest(),'fixture_count':len(rows),'production_runs':len(output),'seed':180505713,'failures':[],
 'max_objective_error':0.,'max_rate_error':0.,'max_distortion_error':0.,'max_probability_error':0.,'max_certificate_gap':0.,'max_iterations':0,'runs_using_disclosed_bisection_fallback':0,'max_total_inner_iterations':0}
for o in output:
 row=rows[o['id']];ref=row['ref'];oe=abs(o['objectiveNats']-ref['penalized_nats'])
 if o['status']!='converged' or oe>2e-7:summary['failures'].append({'id':o['id'],'strategy':o['strategy'],'status':o['status'],'objective_error':oe})
 summary['max_objective_error']=max(summary['max_objective_error'],oe)
 summary['max_rate_error']=max(summary['max_rate_error'],abs(o['rateBits']-ref['rate_bits']))
 summary['max_distortion_error']=max(summary['max_distortion_error'],abs(o['distortion']-ref['distortion']))
 summary['max_probability_error']=max(summary['max_probability_error'],max(abs(a-b) for a,b in zip(o['p'],ref['p'])))
 summary['max_certificate_gap']=max(summary['max_certificate_gap'],o['gapNats'] or 0)
 summary['max_iterations']=max(summary['max_iterations'],o['iterations'])
 summary['runs_using_disclosed_bisection_fallback']+=int(o['fallbackIterations']>0)
 summary['max_total_inner_iterations']=max(summary['max_total_inner_iterations'],o['totalInnerIterations'])
(HERE/'production_crosscheck_results.json').write_text(json.dumps({'summary':summary,'outputs':output},indent=2)+'\n')
print(json.dumps(summary,indent=2))

if summary['failures']:
    raise SystemExit('Independent comparison failed')
