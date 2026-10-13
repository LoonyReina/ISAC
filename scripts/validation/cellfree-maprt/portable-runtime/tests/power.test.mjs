import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {PowerProblem} from '../power.mjs';
const directory=fileURLToPath(new URL('.',import.meta.url));
const fixture=JSON.parse(fs.readFileSync(`${directory}power_oracle_cases.json`));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const mv=(A,x)=>A.map(row=>dot(row,x));
const q=(A,p)=>dot(p,mv(A,p));
let maximumSinrDifference=0,maximumAmplitudeDifference=0,maximumGap=0,maximumCertificateRecomputeDifference=0,minimumSlack=0,subproblemCount=0;
const results=[];

// Independent implementation of the supporting-plane certificate, using the
// stored multipliers but neither the production certificate nor its Jacobian.
function checkCertificate(problem,record,quadratic,linear,free){
  const p=record.p,cert=record.certificate,n=free.length;
  const c=[...problem.b.map((b,i)=>b*p[i+1]/Math.sqrt(problem.gamma)-Math.hypot(1,...problem.a[i].map((a,j)=>a*p[j]))),...problem.power_coeff.map(row=>problem.cap-dot(row,p.map(v=>v*v))),...free.map(i=>p[i]),...free.map(i=>problem.upper[i]-p[i])];
  const J=[...problem.a.map((row,i)=>free.map(j=>(j===i+1?problem.b[i]/Math.sqrt(problem.gamma):0)-row[j]*row[j]*p[j]/Math.hypot(1,...row.map((a,k)=>a*p[k])))),...problem.power_coeff.map(row=>free.map(j=>-2*row[j]*p[j])),...free.map((_,i)=>Array.from({length:n},(_,j)=>+(i===j))),...free.map((_,i)=>Array.from({length:n},(_,j)=>- +(i===j)))];
  const gradient=free.map(j=>2*dot(quadratic[j],p)+linear[j]);
  const residual=gradient.map((g,j)=>g-J.reduce((s,row,i)=>s+cert.multipliers[i]*row[j],0));
  const objective=q(quadratic,p)+dot(linear,p);
  const lower=objective-dot(cert.multipliers,c)+free.reduce((s,k,j)=>s+Math.min(-residual[j]*p[k],residual[j]*(problem.upper[k]-p[k])),0);
  const gap=objective-lower,error=Math.abs(gap-cert.global_subproblem_gap_upper);
  assert.ok(cert.multipliers.every(v=>v>=0&&Number.isFinite(v)),'dual feasibility');
  assert.ok(error<=2e-11*Math.max(1,Math.abs(objective)),`independent certificate mismatch: ${error}`);
  assert.ok(Math.min(...c)>=-2e-7,'source primal feasibility gate');
  assert.ok(gap<=2e-6*Math.max(1,Math.abs(objective)),'source global-subproblem gap gate');
  assert.ok(record.accepted&&record.solver_success,'genuine solver convergence is required');
  minimumSlack=Math.min(minimumSlack,...c);maximumGap=Math.max(maximumGap,gap);maximumCertificateRecomputeDifference=Math.max(maximumCertificateRecomputeDifference,error);subproblemCount++;
}
for(const item of fixture.cases){
  const problem=new PowerProblem(item.problem),communication=problem.communicationCentric();
  assert.ok(communication.accepted,`${item.name} communication solve`);
  const Q=Array.from({length:problem.n},(_,i)=>Array.from({length:problem.n},(_,j)=>i===j?problem.power_coeff.reduce((s,r)=>s+r[i],0):0));
  checkCertificate(problem,communication,Q,Array(problem.n).fill(0),[1,2]);
  assert.ok(Math.abs(communication.metrics.total_power_w-item.scipy_communication.metrics.total_power_w)<1e-8);
  const ccp={};
  for(const allow of [false,true]){
    const key=allow?'with_sensing':'without_sensing';ccp[key]=[];
    for(let i=0;i<item.starts[key].length;i++){
      const run=problem.ccp(item.starts[key][i],allow),source=item.scipy_ccp[key][i];
      assert.ok(run.accepted,`${item.name}/${key}/${i}: ${run.termination}`);
      assert.ok(source.accepted,`independent SciPy comparator must have passed its source gates`);
      assert.equal(run.termination,'source_tangent_tolerance');
      assert.ok(run.final.source_tangent_improvement<=1e-8);
      const delta=Math.abs(run.final.metrics.sensing_sinr-source.final.metrics.sensing_sinr);
      const amplitudeDelta=Math.max(...run.final.p.map((v,j)=>Math.abs(v-source.final.p[j])));
      maximumSinrDifference=Math.max(maximumSinrDifference,delta);maximumAmplitudeDifference=Math.max(maximumAmplitudeDifference,amplitudeDelta);
      assert.ok(delta<2e-6,`SciPy SINR disagreement ${delta}`);
      for(const r of run.iterations){
        const prev=r.p_previous,t=1+q(problem.Bn,prev),num=q(problem.An,prev);
        const Q=problem.Bn.map(row=>row.map(v=>v*num/(t*t))),l=mv(problem.An,prev).map(v=>-2*v/t);
        checkCertificate(problem,r,Q,l,allow?[0,1,2]:[1,2]);
        const gain=dot(r.p.map((v,j)=>2*(v-prev[j])-(r.t_new-t)/t*prev[j]),mv(problem.An,prev))/t;
        assert.ok(Math.abs(gain-r.source_tangent_improvement)<1e-12);
        assert.ok(gain>=-2e-7&&r.actual_sinr_improvement>=-2e-7,'source monotonicity gate');
      }
      ccp[key].push(run);
    }
  }
  results.push({name:item.name,communication,ccp});
}
const fixture0=fixture.cases[0],p=new PowerProblem(fixture0.problem),start=fixture0.starts.with_sensing[0];
const infeasibleProblem=new PowerProblem({...fixture0.problem,b:fixture0.problem.b.map(v=>v*.001)});
const failures={infeasible_communication:infeasibleProblem.communicationCentric(),infeasible_initial:p.ccp([0,0,0]),iteration_cap:p.ccp(start,true,1,0),subproblem_cap:p.ccp(start,true,100,1e-8,1),zero_iteration_cap:p.ccp(start,true,0)};
assert.equal(failures.infeasible_communication.accepted,false);
assert.equal(failures.infeasible_initial.termination,'infeasible_initial');
assert.equal(failures.iteration_cap.termination,'iteration_cap');
assert.equal(failures.subproblem_cap.termination,'subproblem_failure');
assert.equal(failures.subproblem_cap.iterations[0].solver_success,false);
assert.equal(failures.subproblem_cap.iterations[0].iterations,1);
assert.equal(failures.zero_iteration_cap.termination,'iteration_cap');
const loose=p.certificate(start,[[1,0,0],[0,1,0],[0,0,1]],[0,0,0],[0,1,2]);
assert.equal(loose.global_subproblem_gap_accepted,false,'loose global gap is rejected');
assert.throws(()=>new PowerProblem({...fixture0.problem,A:[[1,2,0],[2,1,0],[0,0,1]]}),/positive semidefinite/);
const summary={passed:true,continuous_problem_cases:fixture.cases.length,ccp_runs:fixture.cases.length*6,accepted_convex_subproblems:subproblemCount,maximum_source_vs_browser_sensing_sinr_difference:maximumSinrDifference,maximum_source_vs_browser_amplitude_difference:maximumAmplitudeDifference,maximum_numerical_convex_subproblem_gap:maximumGap,minimum_primal_slack:minimumSlack,maximum_independent_certificate_recompute_difference:maximumCertificateRecomputeDifference,failure_probes:Object.fromEntries(Object.entries(failures).map(([k,v])=>[k,{accepted:v.accepted,termination:v.termination??v.message}])),arithmetic:'float64 numerical certificates, not directed rounding',optimality_scope:'Each accepted convex tangent subproblem only; no global nonconvex ratio optimum claim'};
fs.writeFileSync(`${directory}power_validation.json`,JSON.stringify({summary,results,failures},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
