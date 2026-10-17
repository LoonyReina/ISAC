/** Reduced literal Eq.14 teaching model. No continuous-pulse equivalence claim. */
export const MODEL_VERSION = 'literal8x8-pattern-v1';
const TAU = 2 * Math.PI;
const EPS = Number.EPSILON;
export const GRID = Object.freeze({ side: 81, step: 0.025, qMin: 0, qMax: 2, aMin: -1, aMax: 1, coarseStride: 8 });
export const SOLVER = Object.freeze({ name: 'bounded-eight-direction-pattern-search', maxIterations: 160, initialStep: 0.025, tolerance: 1e-7, scoreTolerance: 1e-13, cellMargin: 1e-8 });
const directions = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function finiteVector(x, length, name) {
  if (!x || x.length !== length || !Array.from(x).every(Number.isFinite)) throw new RangeError(`${name}: finite interleaved complex vector of length ${length} required`);
}
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function dot(x,y) { let re=0,im=0; for(let i=0;i<x.length;i+=2){re+=x[i]*y[i]+x[i+1]*y[i+1];im+=x[i]*y[i+1]-x[i+1]*y[i];} return [re,im]; }
function energy(x) { let e=0; for (let i=0;i<x.length;i++) e+=x[i]*x[i]; return e; }
function cmul(x,h) { const z=new Float64Array(x.length);for(let i=0;i<x.length;i+=2){z[i]=h[0]*x[i]-h[1]*x[i+1];z[i+1]=h[0]*x[i+1]+h[1]*x[i];}return z; }
function kernel(size, offset, derivative=false) {
  const v=new Float64Array(size*2), dv=derivative?new Float64Array(size*2):null;
  for(let d=0;d<size;d++) for(let n=0;n<size;n++) {
    const omega=TAU*n/size, theta=omega*(d+offset), re=Math.cos(theta)/size, im=Math.sin(theta)/size;
    v[2*d]+=re;v[2*d+1]+=im;
    if(derivative){dv[2*d]-=omega*im;dv[2*d+1]+=omega*re;}
  }
  return {v,dv};
}
/** x is interleaved complex, column-major: x[k + N*l]. */
export class LiteralOTFS {
  constructor(x,{N=8,M=8}={}) {
    if(!Number.isInteger(N)||!Number.isInteger(M)||N<2||M<2||N>64||M>64) throw new RangeError('dimensions must be integers in [2,64]');
    finiteVector(x,2*N*M,'x');if(!(energy(x)>0))throw new RangeError('nonzero x required');
    this.x=Float64Array.from(x);this.N=N;this.M=M;
  }
  validate(q,a,derivatives=false){
    if(!Number.isFinite(q)||!Number.isFinite(a)||q<0||q>=this.M||Math.abs(a)>=this.N) throw new RangeError('require finite 0<=q<M and |a|<N');
    if(derivatives&&Number.isInteger(q))throw new RangeError('delay cell boundary: ordinary derivatives undefined');
  }
  action(q,a,derivatives=false){this.validate(q,a,derivatives);return this._action(q,a,kernel(this.M,q,derivatives),kernel(this.N,a,derivatives),derivatives);}
  _action(q,a,qk,ak,derivatives=false){
    const {N,M}=this,z=new Float64Array(2*N*M),za=derivatives?new Float64Array(z.length):null;
    for(let lp=0;lp<M;lp++)for(let kp=0;kp<N;kp++){
      const i=2*(kp+N*lp),isi=lp>=M-Math.ceil(q)?1:0,slope=lp/(N*M)-isi/N,theta=TAU*(a*slope-isi*kp/N),c=Math.cos(theta),s=Math.sin(theta);
      z[i]=this.x[i]*c-this.x[i+1]*s;z[i+1]=this.x[i]*s+this.x[i+1]*c;
      if(derivatives){za[i]=-TAU*slope*z[i+1];za[i+1]=TAU*slope*z[i];}
    }
    const multiply=(input,D,E)=>{
      const b=new Float64Array(z.length),u=new Float64Array(z.length);
      for(let lp=0;lp<M;lp++)for(let k=0;k<N;k++){
        const o=2*(k+N*lp);
        for(let kp=0;kp<N;kp++){
          const d=2*((kp-k+N)%N),i=2*(kp+N*lp);
          b[o]+=D[d]*input[i]-D[d+1]*input[i+1];b[o+1]+=D[d]*input[i+1]+D[d+1]*input[i];
        }
      }
      for(let l=0;l<M;l++)for(let k=0;k<N;k++){
        const o=2*(k+N*l);
        for(let lp=0;lp<M;lp++){
          const d=2*((lp-l+M)%M),i=2*(k+N*lp);
          u[o]+=b[i]*E[d]-b[i+1]*E[d+1];u[o+1]+=b[i]*E[d+1]+b[i+1]*E[d];
        }
      }
      return u;
    };
    const u=multiply(z,ak.v,qk.v);
    if(!derivatives)return u;
    const uq=multiply(z,ak.v,qk.dv),ua=multiply(z,ak.dv,qk.v),phaseTerm=multiply(za,ak.v,qk.v);
    for(let i=0;i<ua.length;i++)ua[i]+=phaseTerm[i];
    return {u,uq,ua};
  }
}
export function profile(y,u){
  if(!u||u.length<2||u.length%2)throw new RangeError('nonempty complex template required');
  finiteVector(u,u.length,'u');finiteVector(y,u.length,'y');
  const e=energy(u);if(!(e>0)&&Number.isFinite(e))throw new RangeError('positive template energy required');if(!Number.isFinite(e))throw new RangeError('finite template energy required');
  const [re,im]=dot(u,y),h=[re/e,im/e];let residual=0;
  for(let i=0;i<u.length;i+=2){const dr=y[i]-h[0]*u[i]+h[1]*u[i+1],di=y[i+1]-h[0]*u[i+1]-h[1]*u[i];residual+=dr*dr+di*di;}
  return {score:(re*re+im*im)/e,h,residual};
}
function inverse(A){
  const n=A.length,B=A.map((r,i)=>[...r,...Array.from({length:n},(_,j)=>+(i===j))]);
  for(let c=0;c<n;c++){
    let p=c;for(let r=c+1;r<n;r++)if(Math.abs(B[r][c])>Math.abs(B[p][c]))p=r;
    if(!Number.isFinite(B[p][c])||B[p][c]===0)return null;
    [B[p],B[c]]=[B[c],B[p]];const pivot=B[c][c];for(let j=0;j<2*n;j++)B[c][j]/=pivot;
    for(let r=0;r<n;r++)if(r!==c){const factor=B[r][c];for(let j=0;j<2*n;j++)B[r][j]-=factor*B[c][j];}
  }
  return B.map(r=>r.slice(n));
}
function eigenvaluesSymmetric(A){
  const B=A.map(r=>r.slice()),n=B.length;
  for(let iter=0;iter<100;iter++){
    let p=0,q=1,big=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(B[i][j])>big){big=Math.abs(B[i][j]);p=i;q=j;}
    const scale=Math.max(...B.map((r,i)=>Math.abs(r[i])));
    if(big<=EPS*Math.max(scale,Number.MIN_VALUE)*4)break;
    const angle=.5*Math.atan2(2*B[p][q],B[q][q]-B[p][p]),c=Math.cos(angle),s=Math.sin(angle),pp=B[p][p],qq=B[q][q],pq=B[p][q];
    B[p][p]=c*c*pp-2*s*c*pq+s*s*qq;B[q][q]=s*s*pp+2*s*c*pq+c*c*qq;B[p][q]=B[q][p]=0;
    for(let k=0;k<n;k++)if(k!==p&&k!==q){const kp=B[k][p],kq=B[k][q];B[k][p]=B[p][k]=c*kp-s*kq;B[k][q]=B[q][k]=s*kp+c*kq;}
  }
  return B.map((r,i)=>r[i]).sort((a,b)=>a-b);
}
/** Ordinary local CRB with unknown complex amplitude, no pseudoinverse fallback. */
export function fisher(model,q,a,h,variance){
  if(!Number.isFinite(variance)||variance<=0)throw new RangeError('positive finite variance required');
  finiteVector(h,2,'h');model.validate(q,a);
  if(Number.isInteger(q))return {ok:false,reason:'delay_boundary',covariance:null,std:null,fim:null};
  const {u,uq,ua}=model.action(q,a,true),J=[u,cmul(u,[0,1]),cmul(uq,h),cmul(ua,h)];
  const F=J.map(x=>J.map(y=>2*dot(x,y)[0]/variance)),eigenvalues=eigenvaluesSymmetric(F);
  if(!F.flat().every(Number.isFinite)||eigenvalues[0]<=EPS*eigenvalues[3]*100)return {ok:false,reason:'singular_or_ill_conditioned_fim',fim:F,eigenvalues,covariance:null,std:null};
  const C=inverse(F);if(!C||!C.flat().every(Number.isFinite))return {ok:false,reason:'fim_inversion_failed',fim:F,covariance:null,std:null};
  const covariance=C.slice(2).map(r=>r.slice(2)),e=energy(u),V=J.slice(2).map(v=>{const d=dot(u,v).map(t=>t/e),projection=cmul(u,d);return Float64Array.from(v,(t,i)=>t-projection[i]);});
  const efficientFisher=V.map(x=>V.map(y=>2*dot(x,y)[0]/variance)),schur=inverse(efficientFisher);
  if(!schur||!schur.flat().every(Number.isFinite)||C[2][2]<=0||C[3][3]<=0)return {ok:false,reason:'ill_conditioned_projected_information',fim:F,covariance:null,std:null};
  const schurError=Math.max(...covariance.flatMap((r,i)=>r.map((v,j)=>Math.abs(v-schur[i][j]))));
  return {ok:true,fim:F,fullCovariance:C,covariance,std:[Math.sqrt(C[2][2]),Math.sqrt(C[3][3])],eigenvalues,efficientFisher,schurError};
}
/** Mulberry32 + Box-Muller. Each CN draw has real/imag variance 1/2. Not NumPy PCG64. */
export function seededNoise(seed,length=64){
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('seed must be uint32');
  if(!Number.isInteger(length)||length<1||length>4096)throw new RangeError('noise length must be integer in [1,4096]');
  let state=seed>>>0;
  const uniform=()=>{state=(state+0x6D2B79F5)>>>0;let t=Math.imul(state^(state>>>15),state|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  const w=new Float64Array(2*length);
  for(let i=0;i<length;i++){const u=Math.max(uniform(),1/4294967296),v=uniform(),r=Math.sqrt(-Math.log(u)),angle=TAU*v;w[2*i]=r*Math.cos(angle);w[2*i+1]=r*Math.sin(angle);}return w;
}
function candidate(model,y,q,a,origin='grid'){return {q,a,...profile(y,model.action(q,a)),origin};}
/** New browser optimizer. Every attempt is constrained to one open delay cell. */
export function refine(model,y,starts,{maxIterations=SOLVER.maxIterations}={}){
  finiteVector(y,2*model.N*model.M,'y');
  if(!Array.isArray(starts)||starts.length===0)throw new RangeError('nonempty starts required');
  if(!Number.isInteger(maxIterations)||maxIterations<0||maxIterations>1000)throw new RangeError('maxIterations must be integer in [0,1000]');
  let best=null;const statuses=[];
  for(const start of starts){
    if(!Array.isArray(start)||start.length!==2||!start.every(Number.isFinite)||start[0]<0||start[0]>2||start[1]<-1||start[1]>1)throw new RangeError('start outside receiver domain');
    const grid=candidate(model,y,...start);if(best===null||grid.score>best.score)best=grid;
    const cell=Math.max(0,Math.ceil(start[0])-1),lo=cell+SOLVER.cellMargin,hi=cell+1-SOLVER.cellMargin;
    let current=candidate(model,y,clamp(start[0],lo,hi),start[1],'local'),step=SOLVER.initialStep,evaluations=1,iterations=0;
    for(;iterations<maxIterations&&step>SOLVER.tolerance;iterations++){
      let next=current;
      for(const [dq,da] of directions){const q=clamp(current.q+dq*step,lo,hi),a=clamp(current.a+da*step,-1,1);if(q===current.q&&a===current.a)continue;const t=candidate(model,y,q,a,'local');evaluations++;if(t.score>next.score+SOLVER.scoreTolerance*(1+Math.abs(next.score)))next=t;}
      if(next===current)step/=2;else current=next;
    }
    const success=step<=SOLVER.tolerance;
    statuses.push({start:[...start],result:[current.q,current.a],cell,bounds:[[lo,hi],[-1,1]],score:current.score,success,status:success?'step_tolerance':'iteration_limit',iterations,evaluations,finalStep:step,method:SOLVER.name});
    if(current.score>best.score)best={...current,solver_success:success};
  }
  return {best,statuses};
}
export function createTeachingEngine(fixture){
  if(fixture?.config?.N!==8||fixture?.config?.M!==8)throw new RangeError('teaching fixture requires N=M=8');
  const model=new LiteralOTFS(fixture.x,fixture.config),truth=Array.isArray(fixture.truth_qa)?[...fixture.truth_qa]:null;
  if(!Array.isArray(truth)||truth.length!==2||!truth.every(Number.isFinite)||truth[0]<0||truth[0]>2||truth[1]<-1||truth[1]>1||Number.isInteger(truth[0]))throw new RangeError('interior truth within receiver domain required');
  finiteVector(fixture.h,2,'h');
  const h=[...fixture.h],signal=cmul(model.action(...truth),h),templates=new Float64Array(6561*128),energies=new Float64Array(6561),qks=Array.from({length:81},(_,i)=>kernel(8,i/40)),aks=Array.from({length:81},(_,i)=>kernel(8,-1+i/40));
  for(let qi=0;qi<81;qi++)for(let ai=0;ai<81;ai++){const id=qi*81+ai,u=model._action(qi/40,-1+ai/40,qks[qi],aks[ai]);templates.set(u,id*128);energies[id]=energy(u);}
  const observe=(snrDb,seed)=>{
    if(!Number.isFinite(snrDb)||snrDb< -25||snrDb>20)throw new RangeError('SNR must be finite in [-25,20] dB');
    const noise=seededNoise(seed,64),noiseVariance=10**(-snrDb/10),scale=Math.sqrt(noiseVariance),observation=Float64Array.from(signal,(v,i)=>v+scale*noise[i]);
    return {observation,noiseVariance,snrDb,seed};
  };
  const estimate=(observation,{local=true,maxIterations=SOLVER.maxIterations}={})=>{
    finiteVector(observation,128,'observation');const heatmap=new Float64Array(6561),cellBest=[-1,-1];let fineIndex=0,coarseIndex=0;
    for(let id=0;id<6561;id++){
      let re=0,im=0;const start=id*128;
      for(let j=0;j<128;j+=2){re+=templates[start+j]*observation[j]+templates[start+j+1]*observation[j+1];im+=templates[start+j]*observation[j+1]-templates[start+j+1]*observation[j];}
      const score=(re*re+im*im)/energies[id];heatmap[id]=score;
      if(score>heatmap[fineIndex])fineIndex=id;
      const qi=Math.floor(id/81),ai=id%81;
      if(qi%8===0&&ai%8===0&&score>heatmap[coarseIndex])coarseIndex=id;
      if(qi>0&&qi<40&&(cellBest[0]<0||score>heatmap[cellBest[0]]))cellBest[0]=id;
      if(qi>40&&qi<80&&(cellBest[1]<0||score>heatmap[cellBest[1]]))cellBest[1]=id;
    }
    const coordinate=id=>[Math.floor(id/81)/40,-1+(id%81)/40];
    const extract=id=>({...candidate(model,observation,...coordinate(id)),index:id,score:heatmap[id]});
    const fine=extract(fineIndex),coarse=extract(coarseIndex),startIds=[...new Set([fineIndex,...cellBest])],starts=startIds.map(coordinate);
    const refined=local?refine(model,observation,starts,{maxIterations}):{best:fine,statuses:[]};
    // Preserve the exact cached fine-grid baseline, even if summation roundoff differs.
    const selected=refined.best.score>fine.score?refined.best:{...fine};
    return {coarse,fine,local:selected,statuses:refined.statuses,heatmap,starts,grid:{...GRID,candidates:6561,coarseCandidates:121},method:MODEL_VERSION};
  };
  const run=(snrDb,seed,options={})=>{const obs=observe(snrDb,seed);return {...estimate(obs.observation,options),...obs,truth:[...truth],crb:fisher(model,...truth,h,obs.noiseVariance)};};
  return {model,observe,estimate,run,cacheBytes:templates.byteLength+energies.byteLength};
}
