// Bounded self-consistency verification. Integrity is not authentication, and interruptions never pass.
import {decodeRecord,hashObject,plain} from './record.mjs';
import {matrix,identity,energy,adjointProduct,solve,columns,rows,hermitian,chol,logdet,innerReal,NumericalError} from './complex.mjs';
import {observe} from './model.mjs';
import {denseState,projectedCandidate,blockOMP,privilegedLS} from './solver.mjs';
import {extract,evaluate,THRESHOLDS,dictionaryDiagnostics} from './evaluation.mjs';
import {makeBudget,Halt} from './budget.mjs';
import {HALT_STOPS} from './schema.mjs';
import {BUILD} from './build-info.mjs';
const mat=a=>matrix(a.rows,a.cols,a.data);
const close=(a,b,tol=2e-7)=>typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b));
function valuesClose(a,b){
 if(typeof a==='number'||typeof b==='number')return close(a,b);
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return a===b;
 if(Array.isArray(a)!==Array.isArray(b))return false;
 return Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&valuesClose(a[k],b[k]));
}
function cost(g,s,q,weight){if(g===0)return 0;const a=identity(s.rows);for(let i=0;i<a.data.length;i++)a.data[i]+=g*s.data[i];const l=chol(a);return weight*logdet(l)-g*innerReal(q,solve(l,q));}
function candidates(W,Y,st,gamma,d,sigma2,weight,rankRtol,budget){
 budget.check(2*W.rows*W.rows*W.cols+W.rows*W.cols*Y.cols+W.rows*W.cols*d);
 const cw=solve(st.factor,W),allq=adjointProduct(W,st.cy),out=[],warnings=new Set();let best=null;
 for(let k=0;k<gamma.length;k++){
  budget.check(50*d*d*d+d*d*Y.cols);const ids=Array.from({length:d},(_,j)=>k*d+j),wk=columns(W,ids);let s=hermitian(adjointProduct(wk,columns(cw,ids))),q=rows(allq,k*d,d);
  if(gamma[k]>0){const denominator=identity(d);for(let i=0;i<denominator.data.length;i++)denominator.data[i]-=gamma[k]*s.data[i];try{const l=chol(hermitian(denominator));s=hermitian(solve(l,s));q=solve(l,q);}catch(error){if(!(error instanceof NumericalError))throw error;warnings.add('leave_one_out_refactor_fallback');const without=new Float64Array(gamma);without[k]=0;const cavity=denseState(W,Y,without,d,sigma2,weight,budget);s=hermitian(adjointProduct(wk,solve(cavity.factor,wk)));q=adjointProduct(wk,cavity.cy);}}
  const proposal=projectedCandidate(s,q,weight,rankRtol);if(proposal===null){warnings.add('rank_deficient_candidate_block');out.push(null);continue;}const delta=cost(proposal,s,q,weight)-cost(gamma[k],s,q,weight),candidate={block:k,proposal,delta};out.push(candidate);if(best===null||delta<best.delta)best=candidate;
 }
 return {all:out,best,warnings};
}
function propagateHalt(result){if(HALT_STOPS.includes(result.stop))throw new Halt(result.stop);}
export async function checkRecord(input,{budget:limits,isCancelled=()=>false}={}){
 const budget=makeBudget(limits,isCancelled);budget.check(2);
 const record=await decodeRecord(typeof input==='string'?input:JSON.stringify(input));budget.check();
 const p=record.payload,a=p.acquisition,c=a.config,W=mat(a.W),Y=mat(a.Y),truth={...p.evaluator,clean:mat(p.evaluator.clean),Xtruth:p.evaluator.Xtruth?mat(p.evaluator.Xtruth):null};
 let checks=0,actions=0,properIncreases=0;const failures=[],unavailable=[];
 const check=(ok,label)=>{budget.check(1);checks++;if(!ok)failures.push(label);};
 const matrixClose=(x,z,label)=>check(x.rows===z.rows&&x.cols===z.cols&&x.data.every((v,i)=>close(v,z.data[i])),label);
 budget.check(c.N*(c.Np*c.K*c.MT)*8+c.N*c.M*12);
 const generated=plain(observe(p.request.acquisition));
 check(valuesClose(generated.acquisition,a),'complete raw acquisition / request replay');
 check(valuesClose(generated.evaluator,p.evaluator),'separate evaluator / request replay');
 check(valuesClose(dictionaryDiagnostics(W),p.diagnostics),'dictionary diagnostics replay');
 for(const[name,r]of Object.entries(p.results)){
  await budget.yield();const full=r.stop!=='running';let X=mat(r.X);
  if(name==='block_omp'){
   const replay=await blockOMP(W,Y,c.K*c.MT,a.sigma2,{maxBlocks:r.actions,residualFactor:r.residual_factor??(p.request.solverOptions?.block_omp?.residualFactor??1.15)},{budget});propagateHalt(replay);
   if(replay.stop==='numerical_failure')unavailable.push(`${name}: replay numerical failure`);
   else{matrixClose(replay.X,X,'OMP same-Y replay');check(valuesClose(replay.history,r.history),'OMP full history replay');check(valuesClose(replay.warnings,r.warnings),'OMP warnings replay');}
   if(full&&!HALT_STOPS.includes(r.stop)&&r.stop!=='numerical_failure'){
    if(r.stop==='max_blocks')check(r.actions===r.max_blocks,'OMP action cap status');
    else{const terminal=await blockOMP(W,Y,c.K*c.MT,a.sigma2,{maxBlocks:r.max_blocks,residualFactor:r.residual_factor},{budget});propagateHalt(terminal);check(terminal.stop===r.stop&&terminal.actions===r.actions,'OMP terminal stopping reason');}
   }
  }else if(name==='privileged_delay_support_ls'){
   budget.check(1);
   if(r.actions===0){check(X.data.every(v=>v===0),'unexecuted/empty LS zero coefficients');if(r.stop!=='empty_privileged_support')unavailable.push(`${name}: solve not executed`);}
   else{const replay=privilegedLS(W,Y,r.privileged_information.known_delay_indices,c.K*c.MT,budget);propagateHalt(replay);if(replay.stop==='numerical_failure')unavailable.push(`${name}: replay numerical failure`);else matrixClose(replay.X,X,'privileged same-Y LS replay');}
  }else if(r.initial_objective===null){
   check(r.actions===0&&r.gamma.every(v=>v===0)&&X.data.every(v=>v===0),'unavailable FM state contains no fabricated estimates');unavailable.push(`${name}: initial objective/posterior unavailable`);
  }else{
   const d=r.block_size,weight=name==='single_log_fm_projected'?1:Y.cols,gamma=new Float64Array(r.gamma.length),observedWarnings=new Set();let st=denseState(W,Y,gamma,d,a.sigma2,weight,budget);
   check(close(st.objective,r.initial_objective),'initial declared objective replay');check(close(st.mmv_objective,r.initial_mmv_objective),'initial proper MMV objective replay');
   for(const action of r.history){
    await budget.yield();const before=st,choices=candidates(W,Y,st,gamma,d,a.sigma2,weight,r.rank_rtol,budget),chosen=choices.all[action.block];
    choices.warnings.forEach(v=>observedWarnings.add(v));check(chosen!==null,'accepted block has valid projected candidate');
    if(chosen){check(close(action.new_gamma,chosen.proposal),'projected candidate gamma replay');check(close(action.predicted_delta,chosen.delta),'marginal predicted delta replay');check(chosen.delta<=(choices.best?.delta??Infinity)+2e-7*Math.max(1,Math.abs(chosen.delta),Math.abs(choices.best?.delta??0)),'best projected candidate including numerical ties');}
    const kind=gamma[action.block]===0?'add':action.new_gamma===0?'delete':'reestimate';check(kind===action.kind,'accepted action kind replay');gamma[action.block]=action.new_gamma;st=denseState(W,Y,gamma,d,a.sigma2,weight,budget);
    check(close(action.objective,st.objective),'accepted dense objective replay');check(close(action.mmv_objective,st.mmv_objective),'accepted proper MMV objective replay');check(close(action.dense_delta,st.objective-before.objective),'accepted dense delta replay');const threshold=r.tolerance*Math.max(1,before.quadratic,W.rows*weight);check(st.objective-before.objective< -threshold,'accepted dense descent exceeds tolerance');if(st.mmv_objective>before.mmv_objective+1e-8){properIncreases++;check(name==='single_log_fm_projected','proper uphill limited to diagnostic');}actions++;
   }
   check(valuesClose(Array.from(gamma),r.gamma),'complete final gamma replay');
   if(full&&['no_improving_projected_candidate','no_valid_candidate','dense_candidate_rejected'].includes(r.stop)){
    const choices=candidates(W,Y,st,gamma,d,a.sigma2,weight,r.rank_rtol,budget),threshold=r.tolerance*Math.max(1,st.quadratic,W.rows*weight);
    choices.warnings.forEach(v=>observedWarnings.add(v));if(r.stop==='no_valid_candidate')check(choices.best===null,'no-valid-candidate terminal claim');
    else if(r.stop==='no_improving_projected_candidate')check(choices.best!==null&&choices.best.delta>=-threshold,'no-improving-proposal terminal claim');
    else if(choices.best){observedWarnings.add('dense_evidence_uphill_or_tiny_rejected');check(choices.best.delta< -threshold,'dense-rejected negative marginal trigger');const candidateGamma=new Float64Array(gamma);candidateGamma[choices.best.block]=choices.best.proposal;const state=denseState(W,Y,candidateGamma,d,a.sigma2,weight,budget);const actual=state.objective-st.objective;check(Math.abs(actual-choices.best.delta)<=2e-7*Math.max(1,st.quadratic,W.rows*weight,Math.abs(choices.best.delta)),'dense-rejected marginal/dense agreement guard');check(actual>=-threshold,'dense-rejected terminal claim');}else check(false,'dense-rejected missing candidate');
   }
   budget.check(W.rows*W.cols*Y.cols);const mean=adjointProduct(W,st.cy);for(let row=0;row<mean.rows;row++)for(let j=0;j<2*mean.cols;j++)mean.data[2*row*mean.cols+j]*=gamma[Math.floor(row/d)];matrixClose(mean,X,'posterior mean replay');check(close(st.objective,r.objective),'final declared objective replay');check(close(st.mmv_objective,r.mmv_objective),'final proper MMV objective replay');
   if(full&&r.posterior_covariance_status==='complete'){
    budget.check(2*W.rows*W.rows*W.cols+W.rows*W.cols*d);const cw=solve(st.factor,W);for(let k=0;k<gamma.length;k++){const ids=Array.from({length:d},(_,j)=>k*d+j),cov=hermitian(adjointProduct(columns(W,ids),columns(cw,ids)));for(let i=0;i<cov.data.length;i++)cov.data[i]*=-gamma[k]*gamma[k];for(let j=0;j<d;j++)cov.data[2*(j*d+j)]+=gamma[k];matrixClose(cov,mat(r.posterior_covariance_blocks[k]),'posterior covariance block replay');}
   }else if(full)unavailable.push(`${name}: covariance ${r.posterior_covariance_status}`);
   if(full&&!HALT_STOPS.includes(r.stop)&&r.stop!=='numerical_failure'&&r.posterior_covariance_status==='complete')check(valuesClose([...observedWarnings].sort(),r.warnings),'FM warnings replay');
  }
  if(full){budget.check(c.N*c.Np*c.K*c.MT*c.M+1000);const threshold=THRESHOLDS[name];check(r.extraction.relativePower===threshold.relative&&close(r.extraction.absolutePower,threshold.absolutePerNoise*a.sigma2),'frozen transferred threshold');const ex=extract(X,c,threshold.relative,threshold.absolutePerNoise*a.sigma2);check(valuesClose(ex,r.extraction),'full extraction replay');check(valuesClose(evaluate(X,ex.estimates,{...a,W,Y},truth),r.evaluation),'full evaluation replay');}
  else unavailable.push(`${name}: running snapshot has no final extraction/evaluation`);
  if(HALT_STOPS.includes(r.stop)||r.stop==='numerical_failure')unavailable.push(`${name}: execution ${r.stop}`);
 }
 if(!['complete','capped'].includes(p.status))unavailable.push(`execution status ${p.status}`);
 budget.check();const importedExecutionCodeMatchesCurrent=await hashObject(p.provenance.build.codeSha256)===await hashObject(BUILD.codeSha256);budget.check();
 return Object.freeze({status:failures.length?'failed':unavailable.length?'incomplete':'passed',executionStatus:p.status,checks,acceptedActionsRecomputed:actions,singleLogProperMMVIncreases:properIncreases,failures:Object.freeze(failures),unavailable:Object.freeze(unavailable),importedExecutionCodeMatchesCurrent,currentCodeSha256:BUILD.codeSha256,executedCodeSha256:p.provenance.build.codeSha256,verificationWorkUnits:budget.used,scope:'closed-schema numerical self-consistency; reported timing, code authorship, and historical execution are not authenticated'});
}
