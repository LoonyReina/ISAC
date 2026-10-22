/** NEW minimally completed printed Eq20–21 variant. NOT source-verified conventions. */
import {LiteralOTFS,jointProfile} from './joint/joint-core.mjs';
export const VERSION='NEW-printed-eq21-real-distinct-v1';
const dot=(a,b)=>{let r=0,i=0;for(let k=0;k<a.length;k+=2){r+=a[k]*b[k]+a[k+1]*b[k+1];i+=a[k]*b[k+1]-a[k+1]*b[k];}return [r,i];};
export function runPrintedVariant({x,y,P,grid,maxRounds=5}){
 if(![1,2,3].includes(P)||!Number.isInteger(maxRounds)||maxRounds<0||maxRounds>10)throw new RangeError('P=1..3, rounds=0..10');
 if(!Array.isArray(y)||y.length!==128||!y.every(Number.isFinite)||!Array.isArray(grid)||grid.length<P||grid.length>81||new Set(grid.map(t=>JSON.stringify(t))).size!==grid.length)throw new RangeError('finite observation and distinct bounded grid required');
 const model=new LiteralOTFS(x),U=grid.map(t=>model.action(...t)),energies=U.map(u=>dot(u,u)[0]),correlations=U.map(u=>dot(u,y));let ids=Array(P).fill(null),h=Array.from({length:P},()=>[0,0]),history=[],evaluations=0,stable=false,last=null,cycle=false;const seen=new Set();
 for(let round=0;round<maxRounds;round++){
  const previousIds=[...ids],previousGains=h.map(v=>[...v]),next=[],updates=[];
  for(let p=0;p<P;p++){
   const candidates=U.map((u,j)=>{let cr=0,ci=0;for(let q=0;q<P;q++)if(q!==p&&previousIds[q]!==null){const [gr,gi]=dot(u,U[previousIds[q]]),[hr,hi]=previousGains[q];cr+=hr*gr-hi*gi;ci+=hr*gi+hi*gr;}const [yr,yi]=correlations[j],e=energies[j],S=(yr*yr+yi*yi)/e,I=[(cr*yr+ci*yi)/e,(ci*yr-cr*yi)/e];evaluations++;return {S,I,scoreReal:S-I[0],scoreImag:-I[1]};});
   let selected=null;for(let j=0;j<U.length;j++)if(!next.includes(j)&&(selected===null||candidates[j].scoreReal>candidates[selected].scoreReal))selected=j;next.push(selected);updates.push({path:p,selected,excludedByDistinctConvention:next.slice(0,-1),candidates});
  }
  ids=next;last=jointProfile(y,ids.map(i=>U[i]));const row={round:round+1,previousIds,previousGains,updates,ids:[...ids],ls:last};history.push(row);if(!last.ok)return {version:VERSION,status:last.status,iterations:history.length,history,ids,theta:ids.map(i=>grid[i]),h:null,residual:null,candidateEvaluations:evaluations,cycleDetected:cycle};
  h=last.h.map(v=>[...v]);stable=ids.every((id,p)=>id===previousIds[p]);const key=JSON.stringify(ids);if(seen.has(key)&&!stable)cycle=true;seen.add(key);if(stable)break;
 }
 return {version:VERSION,status:maxRounds===0?'not_run':stable?'finite_grid_fixed_point':'iteration_limit',iterations:history.length,history,ids:maxRounds?ids:null,theta:maxRounds?ids.map(i=>grid[i]):null,h:maxRounds?h:null,residual:maxRounds?last.residual:null,candidateEvaluations:evaluations,cycleDetected:cycle,conventions:['maximize real part of the individual printed S-I','exclude prior selected current-round grid points in path-index order','lowest-index exact tie','all interference uses previous-round paths and gains','zero initial gains and one Eq19 solve per completed round'],scope:'Minimal explicit completion of printed Eq20–21; real-part and duplicate selection remain unsourced choices. No monotonicity or original-algorithm equivalence claim.'};
}
