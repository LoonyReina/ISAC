/** NEW deterministic Eq17 objective completion. NOT the printed Eq20–21 algorithm. */
import {runPrintedVariant} from './printed-variant.mjs';
import {LiteralOTFS, jointProfile} from './joint/joint-core.mjs';
export const VERSION='NEW-eq17-residual-bcd-v1';
export const GRID=Array.from({length:81},(_,i)=>[.2+.2*Math.floor(i/9),-.8+.2*(i%9)]);
const dot=(a,b)=>{let re=0,im=0;for(let i=0;i<a.length;i+=2){re+=a[i]*b[i]+a[i+1]*b[i+1];im+=a[i]*b[i+1]-a[i+1]*b[i];}return [re,im];};
const norm=a=>a.reduce((s,v)=>s+v*v,0);
const sub=(a,u,h)=>{for(let i=0;i<a.length;i+=2){a[i]-=u[i]*h[0]-u[i+1]*h[1];a[i+1]-=u[i]*h[1]+u[i+1]*h[0];}return a;};
const residual=(y,U,ids,h,skip=-1)=>{const r=Float64Array.from(y);ids.forEach((id,p)=>{if(id!==null&&p!==skip)sub(r,U[id],h[p]);});return r;};
const scalar=(r,u)=>{const e=norm(u),c=dot(u,r),h=c.map(v=>v/e);return {score:(c[0]**2+c[1]**2)/e,h,residual:norm(sub(Float64Array.from(r),u,h))};};
function prepare({x,y,P,grid=GRID,maxRounds=5}){
 if(![1,2,3].includes(P)||!Number.isInteger(maxRounds)||maxRounds<0||maxRounds>10)throw new RangeError('P=1..3; maxRounds=0..10');
 if(!Array.isArray(grid)||grid.length<P||grid.length>81||grid.some(t=>!Array.isArray(t)||t.length!==2||!t.every(Number.isFinite)||t[0]<0||t[0]>2||Math.abs(t[1])>1))throw new RangeError('finite grid in q=[0,2],a=[-1,1], at most 81 points');
 if(new Set(grid.map(t=>JSON.stringify(t))).size!==grid.length)throw new RangeError('distinct grid points required');
 if(!Array.isArray(y)||y.length!==128||!y.every(Number.isFinite))throw new RangeError('finite y with 64 complex samples required');
 const model=new LiteralOTFS(x);const U=grid.map(t=>model.action(...t));return {y,P,grid,U,maxRounds};
}
export function literalFirstRound(input){
 const {y,P,grid,U}=prepare(input),scores=U.map(u=>scalar(y,u).score);let selected=0;for(let j=1;j<scores.length;j++)if(scores[j]>scores[selected])selected=j;
 const ids=Array(P).fill(selected),ls=jointProfile(y,ids.map(i=>U[i]));return {algorithm:'printed-v1-zero-gain-synchronous-first-round',scores,ids,theta:ids.map(i=>grid[i]),ls,status:P>1?'blocked_duplicate_support_at_first_gain_solve':'single_path_finite_grid_ml',scope:'No invented exclusion, no pseudoinverse, no claim that authors used this tie rule. Unique maximum makes every path identical.'};
}
export function runCompletion(input){
 const {y,P,grid,U,maxRounds}=prepare(input);let ids=Array(P).fill(null),h=Array.from({length:P},()=>[0,0]),history=[],previous=norm(y),candidateEvaluations=0,best=null,stable=false;
 if(maxRounds===0)return {version:VERSION,status:'not_run',iterations:0,history,ids:null,theta:null,h:null,residual:null,candidateEvaluations,scope:'Eq17 residual BCD completion; not literal Eq21'};
 for(let round=0;round<maxRounds;round++){
  const oldIds=[...ids],steps=[];
  for(let p=0;p<P;p++){
   const r= residual(y,U,ids,h,p),occupied=new Set(ids.filter((id,k)=>k!==p&&id!==null));let pick=null;const scores=[];
   for(let j=0;j<U.length;j++){if(occupied.has(j)){scores.push(null);continue;}const candidate=scalar(r,U[j]);candidateEvaluations++;scores.push(candidate.score);if(!pick||candidate.score>pick.score)pick={id:j,...candidate};}
   if(!pick)throw new Error('no available distinct support');ids[p]=pick.id;h[p]=pick.h;const objective=norm(residual(y,U,ids,h));steps.push({path:p,id:pick.id,h:pick.h,score:pick.score,scores,objectiveBefore:previous,objectiveAfter:objective,excludedIds:[...occupied]});
   if(objective>previous+1e-9*(1+previous))throw new Error('nonmonotone block update');previous=objective;
  }
  const ls=jointProfile(y,ids.map(i=>U[i]));if(!ls.ok)return {version:VERSION,status:ls.status,iterations:round+1,history:[...history,{round:round+1,steps,ls}],ids,theta:ids.map(i=>grid[i]),h:null,residual:null,candidateEvaluations};
  if(ls.residual>previous+1e-9*(1+previous))throw new Error('nonmonotone joint gain update');h=ls.h;previous=ls.residual;stable=ids.every((id,p)=>id===oldIds[p]);history.push({round:round+1,steps,ids:[...ids],h:ls.h.map(v=>[...v]),residual:ls.residual,condition:ls.condition,scaled_normal_defect:ls.scaled_normal_defect,supportStable:stable});best=ls;
  // Identical support alone need not imply coordinate-stationary gains after refit.
  if(stable){const next=history.at(-2);if(next&&Math.abs(next.residual-ls.residual)<=1e-11*(1+ls.residual))break;stable=false;}
 }
 return {version:VERSION,status:stable?'finite_grid_fixed_point':'iteration_limit',iterations:history.length,history,ids,theta:ids.map(i=>grid[i]),h,residual:best.residual,condition:best.condition,scaled_normal_defect:best.scaled_normal_defect,candidateEvaluations,scope:'Exact Eq17 single-path residual minimization, Gauss-Seidel updates, distinct supports and round-end Eq19 solve; not the printed Eq20–21 update or a global optimum'};
}
export function sequential(input){const {y,P,grid,U}=prepare(input),r=Float64Array.from(y),stages=[],ids=[];for(let p=0;p<P;p++){let best=null;for(let j=0;j<U.length;j++){if(ids.includes(j))continue;const v=scalar(r,U[j]);if(!best||v.score>best.score)best={id:j,...v};}ids.push(best.id);sub(r,U[best.id],best.h);stages.push(best);}return {status:'finite_grid_sequential',ids,theta:ids.map(i=>grid[i]),h:stages.map(s=>s.h),residual:norm(r),stages,candidateEvaluations:P*U.length-P*(P-1)/2,scope:'same x/y/grid; sequential single-path residual fits, no joint gain refit'};}
export function complexTermWitness(input,fit){const {y,P,U}=prepare(input);let witness=null;for(let p=0;p<P;p++)for(let j=0;j<U.length;j++){let cr=0,ci=0;for(let q=0;q<P;q++)if(q!==p){const c=dot(U[j],U[fit.ids[q]]),h=fit.h[q];cr+=h[0]*c[0]-h[1]*c[1];ci+=h[0]*c[1]+h[1]*c[0];}const c=dot(U[j],y),e=norm(U[j]),I=[(cr*c[0]+ci*c[1])/e,(ci*c[0]-cr*c[1])/e];if(!witness||Math.abs(I[1])>Math.abs(witness.I[1]))witness={path:p,candidate:j,I};}return witness;}
export async function runAll(input,progress=()=>{}){const literal=literalFirstRound(input);progress('source');await new Promise(r=>setTimeout(r,0));const proposed=runCompletion(input);progress('bcd');await new Promise(r=>setTimeout(r,0));const baseline=sequential(input);const printedVariant=runPrintedVariant({...input,grid:input.grid??GRID});return {literal,proposed,baseline,printedVariant,complexTerm:proposed.h?complexTermWitness(input,proposed):null};}
