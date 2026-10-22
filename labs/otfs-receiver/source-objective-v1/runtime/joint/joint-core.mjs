/** Project Eqs17–19 extension. Finite-grid profile LS only, NOT C2 L-BFGS-B. */
import {LiteralOTFS} from '../statistics/otfs-core.mjs';
export {LiteralOTFS};
export const VERSION='joint-grid-profile-v1';
export const GRID=Array.from({length:25},(_,i)=>[[.2,.6,1,1.4,1.8][Math.floor(i/5)],[-.8,-.4,0,.4,.8][i%5]]);
const energy=x=>x.reduce((s,v)=>s+v*v,0);
const dot=(x,y)=>{let r=0,i=0;for(let k=0;k<x.length;k+=2){r+=x[k]*y[k]+x[k+1]*y[k+1];i+=x[k]*y[k+1]-x[k+1]*y[k];}return [r,i];};
const sub=(x,y,h)=>{for(let k=0;k<x.length;k+=2){x[k]-=y[k]*h[0]-y[k+1]*h[1];x[k+1]-=y[k]*h[1]+y[k+1]*h[0];}};
function singularValues(R){
 const n=2*R.length,A=Array.from({length:n},()=>Array(n).fill(0));
 for(let i=0;i<R.length;i++)for(let j=0;j<R.length;j++){const [r,b]=R[i][j];A[2*i][2*j]=r;A[2*i+1][2*j+1]=r;A[2*i][2*j+1]=-b;A[2*i+1][2*j]=b;}
 for(let sweep=0;sweep<80;sweep++){let changed=false;for(let p=0;p<n;p++)for(let q=p+1;q<n;q++){let a=0,b=0,g=0;for(let k=0;k<n;k++){a+=A[k][p]**2;b+=A[k][q]**2;g+=A[k][p]*A[k][q];}if(Math.abs(g)<=Number.EPSILON*8*Math.sqrt(a*b))continue;changed=true;const z=(b-a)/(2*g),t=(z>=0?1:-1)/(Math.abs(z)+Math.hypot(1,z)),c=1/Math.hypot(1,t),s=c*t;for(let k=0;k<n;k++){const v=A[k][p],w=A[k][q];A[k][p]=c*v-s*w;A[k][q]=s*v+c*w;}}if(!changed)break;}
 return Array.from({length:n},(_,j)=>Math.hypot(...A.map(r=>r[j]))).sort((a,b)=>b-a);
}
export function jointProfile(y,U){
 const p=U.length,n=y.length;if(![1,2,3].includes(p)||n<2||n%2||!Array.from(y).every(Number.isFinite)||U.some(u=>u.length!==n||!Array.from(u).every(Number.isFinite)))throw new RangeError('finite matching complex vectors, P=1..3');
 const V=U.map(u=>Float64Array.from(u)),Q=[],R=Array.from({length:p},()=>Array.from({length:p},()=>[0,0])),piv=Array.from({length:p},(_,i)=>i),diag=[];
 for(let k=0;k<p;k++){let j=k;for(let t=k+1;t<p;t++)if(energy(V[t])>energy(V[j]))j=t;[V[k],V[j]]=[V[j],V[k]];[piv[k],piv[j]]=[piv[j],piv[k]];for(let t=0;t<k;t++)[R[t][k],R[t][j]]=[R[t][j],R[t][k]];
 const d=Math.sqrt(energy(V[k]));diag.push(d);if(!(d>1e-10*Math.max(...diag)))return {ok:false,status:'rank_deficient',rank:k};R[k][k]=[d,0];Q[k]=Float64Array.from(V[k],v=>v/d);
 for(let t=k+1;t<p;t++){let h=dot(Q[k],V[t]);sub(V[t],Q[k],h);const again=dot(Q[k],V[t]);sub(V[t],Q[k],again);R[k][t]=[h[0]+again[0],h[1]+again[1]];}}
 const sv=singularValues(R),condition=sv[0]/sv.at(-1);if(!Number.isFinite(condition)||condition>1e8)return {ok:false,status:'ill_conditioned',condition};
 const hp=Q.map(q=>dot(q,y));for(let k=p-1;k>=0;k--){for(let j=k+1;j<p;j++){const [a,b]=R[k][j],[c,d]=hp[j];hp[k][0]-=a*c-b*d;hp[k][1]-=a*d+b*c;}hp[k]=hp[k].map(v=>v/R[k][k][0]);}
 const h=Array(p);piv.forEach((j,i)=>h[j]=hp[i]);const r=Float64Array.from(y);U.forEach((u,i)=>sub(r,u,h[i]));const residual=energy(r),normal=Math.hypot(...U.flatMap(u=>dot(u,r)))/Math.max(sv[0]*Math.sqrt(energy(y)),Number.MIN_VALUE);
 if(!Number.isFinite(residual)||!Number.isFinite(normal)||normal>1e-10)return {ok:false,status:'ls_numerical_failure',condition,scaled_normal_defect:normal};
 return {ok:true,status:'full_rank_conditioned',rank:p,h,r:Array.from(r),residual,condition,scaled_normal_defect:normal};
}
export function evaluate(model,y,theta,gradient=false){const actions=theta.map(t=>model.action(...t,gradient)),out=jointProfile(y,actions.map(v=>gradient?v.u:v));if(out.ok&&gradient)out.gradient=actions.flatMap((a,p)=>[a.uq,a.ua].map(d=>{const [r,i]=dot(out.r,d),[hr,hi]=out.h[p];return -2*(r*hr-i*hi);}));return out;}
export async function fitGrid({x,y,P,grid=GRID},progress=()=>{}){
 if(![2,3].includes(P))throw new RangeError('known P=2 or 3');if(!Array.isArray(grid)||grid.length<P||grid.length>25||grid.some(t=>!Array.isArray(t)||t.length!==2||!t.every(Number.isFinite)||t[0]<0||t[0]>2||Math.abs(t[1])>1))throw new RangeError('finite public grid within q=[0,2], a=[-1,1]');
 const model=new LiteralOTFS(x),U=grid.map(t=>model.action(...t)),best=[],failures={};let count=0;
 async function visit(ids,start){if(ids.length===P){const out=jointProfile(y,ids.map(i=>U[i]));count++;if(out.ok){best.push({...out,ids:[...ids],theta:ids.map(i=>grid[i])});best.sort((a,b)=>{if(a.residual!==b.residual)return a.residual-b.residual;for(let i=0;i<P;i++)if(a.ids[i]!==b.ids[i])return a.ids[i]-b.ids[i];return 0;});if(best.length>4)best.pop();}else failures[out.status]=(failures[out.status]||0)+1;if(count%32===0){progress(count);await new Promise(r=>setTimeout(r,0));}return;}for(let i=start;i<=grid.length-(P-ids.length);i++)await visit([...ids,i],i+1);}
 await visit([],0);const single=singleGrid(y,U,grid),r=Float64Array.from(y),stages=[];for(let k=0;k<P;k++){const stage=singleGrid(r,U,grid);if(!stage){break;}stages.push(stage);sub(r,U[stage.id],stage.h[0]);}const sequential={theta:stages.map(v=>v.theta[0]),h:stages.map(v=>v.h[0]),residual:energy(r),status:stages.length===P?'finite_grid_estimate':'incomplete',stages};return {version:VERSION,baselines:{single,sequential},status:best.length?'finite_grid_estimate':'no_identifiable_support',optimizerStatus:'not_run',supportCount:count,failures,best:best[0]||null,starts:best.map(v=>({theta:v.theta,residual:v.residual,cellBounds:v.theta.map(([q])=>{const c=Math.max(0,Math.ceil(q)-1);return [[c+1e-8,Math.min(c+1-1e-8,2)],[-1,1]];})})),scope:'finite grid only; no continuous refinement, convergence or recovery claim'};
}

function singleGrid(y,U,grid){let best=null;for(let i=0;i<U.length;i++){const out=jointProfile(y,[U[i]]);if(out.ok&&(!best||out.residual<best.residual))best={...out,id:i,theta:[grid[i]]};}return best;}
