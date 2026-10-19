/** Literal Eq14 sampled-cyclic OTFS and Eq37/39–44 Gram-factor MP-G.
 * Independent JS implementation. Proper-complex variance v=E|w|².
 * No FFT proxy, truth inputs, offline answers, or Gaussian message replacement.
 */
export const SCHEMA_VERSION = 'otfs-communication-v1';
export const KERNEL_VERSION = '0.2.0';
export const INPUT_ENCODING = 'sorted-key-json-js-v1';
export const LIMITS = Object.freeze({ maxN:3, maxM:4, maxD:12, maxPaths:2,
  maxIterations:100, minVariance:1e-6, maxVariance:1000,
  maxComponent:16, maxObservationComponent:64, maxSnapshots:101 });
export class KernelError extends Error {
  constructor(code, message) { super(message); this.name='KernelError'; this.code=code; }
}
const fail=(s)=>{throw new KernelError('invalid-input',s);};
const numericFail=(s)=>{throw new KernelError('numerical-failure',s);};
const finite=(x)=>typeof x==='number' && Number.isFinite(x);
function object(x,name,keys) {
  if (!x || typeof x!=='object' || Array.isArray(x) || Object.getPrototypeOf(x)!==Object.prototype) fail(`${name} must be a plain object`);
  for(const k of Object.keys(x)) if(!keys.includes(k)) fail(`${name}.${k} is not an allowed field`);
}
function bounded(x,lo,hi,name) {if(!finite(x)||x<lo||x>hi) fail(`${name} must be finite in [${lo}, ${hi}]`); return x;}
function integer(x,lo,hi,name) {bounded(x,lo,hi,name);if(!Number.isInteger(x)) fail(`${name} must be an integer`);return x;}
function scalar(x,name,bound=LIMITS.maxComponent) {
  object(x,name,['re','im']);bounded(x.re,-bound,bound,`${name}.re`);bounded(x.im,-bound,bound,`${name}.im`);return {re:x.re,im:x.im};
}
export function validateFrame(f) {
  object(f,'frame',['N','M']);return {N:integer(f.N,1,LIMITS.maxN,'N'),M:integer(f.M,1,LIMITS.maxM,'M')};
}
const zeros=(n)=>new Float64Array(n);
const cabs2=(r,i)=>r*r+i*i;
const clone=(x)=>JSON.parse(JSON.stringify(x));
function checkFinite(a,name) {for(const x of a) if(!Number.isFinite(x)) numericFail(`${name} contains nonfinite arithmetic`);}
function normalize(a) {
  let m=-Infinity;for(const x of a) if(x>m)m=x;
  if(!Number.isFinite(m)) numericFail('nonfinite log normalization');
  let sum=0;for(const x of a)sum+=Math.exp(x-m);
  const logsum=Math.log(sum);const out=Float64Array.from(a,x=>(x-m)-logsum);checkFinite(out,'log probability');return out;
}
function logSumExp(a) {let m=-Infinity;for(const x of a)if(x>m)m=x;let s=0;for(const x of a)s+=Math.exp(x-m);return m+Math.log(s);}
function pack(re,im,rows,cols) {return Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>({re:re[r*cols+c],im:im[r*cols+c]})));}
function unpack(matrix) {return {re:Float64Array.from(matrix.flat(),x=>x.re),im:Float64Array.from(matrix.flat(),x=>x.im)};}
export function qam(order) {
  if(order!==4&&order!==16) fail('Only unit-energy QPSK/16-QAM are approved');
  const n=Math.sqrt(order),norm=Math.sqrt(2*(order-1)/3),symbols=[],labels=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++) {
    symbols.push({re:(2*i-(n-1))/norm,im:(2*j-(n-1))/norm});
    const bits=[];for(const k of [i,j])for(let b=Math.log2(n)-1;b>=0;b--)bits.push(((k^(k>>1))>>b)&1);labels.push(bits);
  }
  return {symbols,labels};
}
function dirichlet(n,arg) {let re=0,im=0;for(let k=0;k<n;k++){const t=2*Math.PI*arg*k/n;re+=Math.cos(t)/n;im+=Math.sin(t)/n;}return [re,im];}
export function buildChannel(frame,paths) {
  const {N,M}=validateFrame(frame),D=N*M;
  if(!Array.isArray(paths)||paths.length<1||paths.length>LIMITS.maxPaths)fail('paths must have length 1 or 2');
  const clean=Array.from(paths,(p,idx)=>{
    object(p,`paths[${idx}]`,['delayBin','dopplerBin','gain']);
    bounded(p.delayBin,0,M, 'delayBin');if(p.delayBin===M)fail('delayBin must be < M');
    bounded(p.dopplerBin,-N,N,'dopplerBin');if(Math.abs(p.dopplerBin)===N)fail('|dopplerBin| must be < N');
    return {...p,gain:scalar(p.gain,'path gain',4)};
  });
  const re=zeros(D*D),im=zeros(D*D);
  for(const p of clean)for(let row=0;row<D;row++)for(let col=0;col<D;col++) {
    const k=row%N,l=Math.floor(row/N),kp=col%N,lp=Math.floor(col/N);
    const [dr,di]=dirichlet(N,kp-k+p.dopplerBin),[er,ei]=dirichlet(M,lp-l+p.delayBin);
    const phase=2*Math.PI*p.dopplerBin*lp/(N*M)-(lp>=M-Math.ceil(p.delayBin)?2*Math.PI*(kp+p.dopplerBin)/N:0);
    const pr=Math.cos(phase),pi=Math.sin(phase),vr=dr*er-di*ei,vi=dr*ei+di*er;
    const ar=vr*pr-vi*pi,ai=vr*pi+vi*pr,t=row*D+col;
    re[t]+=p.gain.re*ar-p.gain.im*ai;im[t]+=p.gain.re*ai+p.gain.im*ar;
  }
  checkFinite(re,'channel');checkFinite(im,'channel');
  return pack(re,im,D,D);
}
export function validateReceiver(input) {
  object(input,'receiver',['frame','model','csi','H','y','noiseVariance','constellation','settings']);
  const frame=validateFrame(input.frame),D=frame.N*frame.M;
  if(input.model!=='eq14_literal')fail('model must be eq14_literal');
  if(input.csi!=='perfect-supplied')fail('csi must be perfect-supplied (the provenance must establish this claim)');
  if(!Array.isArray(input.H)||input.H.length!==D)fail('H must be D by D, row-major matrix');
  const H=Array.from(input.H,(row,i)=>{
    if(!Array.isArray(row)||row.length!==D)fail(`H[${i}] must be a dense row of D entries`);
    return Array.from(row,(x,j)=>scalar(x,`H[${i}][${j}]`));
  });
  if(!Array.isArray(input.y)||input.y.length!==D)fail('y must have D complex entries');
  const y=Array.from(input.y,(x,i)=>scalar(x,`y[${i}]`,LIMITS.maxObservationComponent));
  const noiseVariance=bounded(input.noiseVariance,LIMITS.minVariance,LIMITS.maxVariance,'noiseVariance');
  if(!Array.isArray(input.constellation)||![4,16].includes(input.constellation.length))fail('constellation must be ordered QPSK/16-QAM');
  const c=Array.from(input.constellation,(x,i)=>scalar(x,`constellation[${i}]`,2)),canonical=qam(c.length).symbols;
  for(let i=0;i<c.length;i++)if(Math.hypot(c[i].re-canonical[i].re,c[i].im-canonical[i].im)>1e-12)fail('constellation must use canonical unit-energy square QAM ordering');
  object(input.settings,'settings',['maxIterations','tolerance','damping','edgeTolerance','captureHistory']);
  const s=input.settings;
  integer(s.maxIterations,1,LIMITS.maxIterations,'maxIterations');bounded(s.tolerance,1e-14,1e-3,'tolerance');
  bounded(s.damping,0.05,1,'damping');bounded(s.edgeTolerance,0,1e-12,'edgeTolerance');
  if(typeof s.captureHistory!=='boolean')fail('captureHistory must be boolean');
  return {frame,model:input.model,csi:input.csi,H,y,noiseVariance,constellation:c,settings:{...s}};
}
function gram(input) {
  const D=input.y.length,{re:hr,im:hi}=unpack(input.H),gr=zeros(D*D),gi=zeros(D*D),zr=zeros(D),zi=zeros(D);
  for(let i=0;i<D;i++){
    for(let r=0;r<D;r++){const t=r*D+i;zr[i]+=hr[t]*input.y[r].re+hi[t]*input.y[r].im;zi[i]+=hr[t]*input.y[r].im-hi[t]*input.y[r].re;}
    for(let j=i;j<D;j++){
      let re=0,im=0;for(let r=0;r<D;r++){const a=r*D+i,b=r*D+j;re+=hr[a]*hr[b]+hi[a]*hi[b];im+=hr[a]*hi[b]-hi[a]*hr[b];}
      gr[i*D+j]=gr[j*D+i]=re;gi[i*D+j]=im;gi[j*D+i]=-im;
    }
  }
  checkFinite(gr,'Gram matrix');checkFinite(gi,'Gram matrix');checkFinite(zr,'matched observation');checkFinite(zi,'matched observation');
  return {D,hr,hi,gr,gi,zr,zi};
}
function rows(a,D,Q) {return Array.from({length:D},(_,i)=>Array.from(a.slice(i*Q,(i+1)*Q)));}
function posterior(logp,D,Q) {
  const probs=Float64Array.from(logp,x=>Math.exp(x));
  checkFinite(probs,'probabilities');
  for(let i=0;i<D;i++){let s=0;for(let a=0;a<Q;a++)s+=probs[i*Q+a];if(Math.abs(s-1)>2e-10)numericFail('posterior row failed normalization');}
  return {probabilities:rows(probs,D,Q),logProbabilities:rows(logp,D,Q)};
}
/** One step is one synchronous flooding iteration; yielded state is genuinely computed. */
export function createMPG(input) {
  const validated=validateReceiver(input),g=gram(validated),{D,gr,gi,zr,zi}=g,c=validated.constellation,Q=c.length,v=validated.noiseVariance,s=validated.settings;
  let maxG=1;for(let t=0;t<gr.length;t++)maxG=Math.max(maxG,Math.hypot(gr[t],gi[t]));const cutoff=s.edgeTolerance*maxG;
  const unary=zeros(D*Q),edges=[];let removed2=0;
  for(let i=0;i<D;i++){
    const u=zeros(Q);for(let a=0;a<Q;a++)u[a]=(2*(zr[i]*c[a].re+zi[i]*c[a].im)-gr[i*D+i]*cabs2(c[a].re,c[a].im))/v;
    unary.set(normalize(u),i*Q);
    for(let j=i+1;j<D;j++)if(Math.hypot(gr[i*D+j],gi[i*D+j])>cutoff)edges.push({i,j,coefficient:{re:gr[i*D+j],im:gi[i*D+j]}});else removed2+=2*cabs2(gr[i*D+j],gi[i*D+j]);
  }
  const E=edges.length,pair=zeros(E*Q*Q);
  edges.forEach(({i,j},e)=>{for(let a=0;a<Q;a++)for(let b=0;b<Q;b++) {
    const cr=c[a].re*c[b].re+c[a].im*c[b].im,ci=c[a].re*c[b].im-c[a].im*c[b].re;
    pair[(e*Q+a)*Q+b]=-2*(gr[i*D+j]*cr-gi[i*D+j]*ci)/v;
  }});
  checkFinite(pair,'pair potentials');
  let incoming=new Float64Array(E*2*Q).fill(-Math.log(Q)),post=unary.slice(),iteration=0,status='running';const trace=[],history=[];
  const graph={edgeCount:E,edges,cutoff,removedGramFrobenius:Math.sqrt(removed2),pairwiseScalarTermsPerIteration:2*E*Q*Q,
    G:pack(gr,gi,D,D),z:Array.from(zr,(re,i)=>({re,im:zi[i]})),unaryLogProbabilities:rows(unary,D,Q)};
  function snapshot(messageDelta,marginalDelta) {
    return {iteration,messageDelta,marginalDelta,...posterior(post,D,Q),incomingLogMessages:rows(incoming,E*2,Q)};
  }
  if(s.captureHistory)history.push(snapshot(0,0));
  const beliefFor=(messages)=>{const b=unary.slice();edges.forEach(({i,j},e)=>{for(let a=0;a<Q;a++){b[i*Q+a]+=messages[(2*e)*Q+a];b[j*Q+a]+=messages[(2*e+1)*Q+a];}});return b;};
  return {graph,
    get status(){return status;},get iteration(){return iteration;},
    step(){
      if(status!=='running')return null;
      const belief=beliefFor(incoming),updated=zeros(incoming.length),buf=zeros(Q);
      edges.forEach(({i,j},e)=>{
        const toI=zeros(Q),toJ=zeros(Q);
        for(let a=0;a<Q;a++){
          for(let b=0;b<Q;b++)buf[b]=pair[(e*Q+a)*Q+b]+belief[j*Q+b]-incoming[(2*e+1)*Q+b];toI[a]=logSumExp(buf);
          for(let b=0;b<Q;b++)buf[b]=pair[(e*Q+b)*Q+a]+belief[i*Q+b]-incoming[(2*e)*Q+b];toJ[a]=logSumExp(buf);
        }
        updated.set(normalize(toI),2*e*Q);updated.set(normalize(toJ),(2*e+1)*Q);
      });
      if(s.damping<1)for(let t=0;t<updated.length;t++){
        const a=Math.log(s.damping)+updated[t],b=Math.log1p(-s.damping)+incoming[t],m=Math.max(a,b);updated[t]=m+Math.log(Math.exp(a-m)+Math.exp(b-m));
      }
      checkFinite(updated,'messages');let messageDelta=0;for(let t=0;t<updated.length;t++)messageDelta=Math.max(messageDelta,Math.abs(Math.exp(updated[t])-Math.exp(incoming[t])));
      incoming=updated;const beliefNext=beliefFor(incoming),next=zeros(D*Q);
      for(let i=0;i<D;i++)next.set(normalize(beliefNext.slice(i*Q,(i+1)*Q)),i*Q);
      let marginalDelta=0;for(let t=0;t<next.length;t++)marginalDelta=Math.max(marginalDelta,Math.abs(Math.exp(next[t])-Math.exp(post[t])));
      post=next;iteration++;const record={iteration,messageDelta,marginalDelta};trace.push(record);
      if(s.captureHistory)history.push(snapshot(messageDelta,marginalDelta));
      if(messageDelta<s.tolerance)status='converged';else if(iteration>=s.maxIterations)status='max-iterations';
      return {...record,status};
    },
    result(){return {algorithm:'mp-g',status,iterations:iteration,...posterior(post,D,Q),trace:clone(trace),history:clone(history),graph:clone(graph),
      posteriorInterpretation:'Loopy sum-product marginals are approximate; message convergence does not certify exact inference.'};}
  };
}
/** Full complex Hermitian Cholesky solve; positive v regularizes rank-deficient H. */
function cholesky(gr,gi,D,lambda) {
  const lr=zeros(D*D),li=zeros(D*D);let minPivot=Infinity,maxPivot=0;
  for(let i=0;i<D;i++)for(let j=0;j<=i;j++){
    let re=gr[i*D+j]+(i===j?lambda:0),im=gi[i*D+j];
    for(let k=0;k<j;k++){const a=i*D+k,b=j*D+k;re-=lr[a]*lr[b]+li[a]*li[b];im-=li[a]*lr[b]-lr[a]*li[b];}
    if(i===j){if(!finite(re)||re<=0||Math.abs(im)>1e-8*Math.max(1,Math.abs(re)))numericFail('LMMSE Cholesky is not finite positive definite');lr[i*D+j]=Math.sqrt(re);minPivot=Math.min(minPivot,re);maxPivot=Math.max(maxPivot,re);}
    else {lr[i*D+j]=re/lr[j*D+j];li[i*D+j]=im/lr[j*D+j];}
  }
  return {lr,li,minPivot,maxPivot};
}
function solveCholesky(lr,li,br,bi,D) {
  const xr=zeros(D),xi=zeros(D),yr=zeros(D),yi=zeros(D);
  for(let i=0;i<D;i++) {let re=br[i],im=bi[i];for(let k=0;k<i;k++){const t=i*D+k;re-=lr[t]*yr[k]-li[t]*yi[k];im-=lr[t]*yi[k]+li[t]*yr[k];}yr[i]=re/lr[i*D+i];yi[i]=im/lr[i*D+i];}
  for(let i=D-1;i>=0;i--){let re=yr[i],im=yi[i];for(let k=i+1;k<D;k++){const t=k*D+i;re-=lr[t]*xr[k]+li[t]*xi[k];im-=lr[t]*xi[k]-li[t]*xr[k];}xr[i]=re/lr[i*D+i];xi[i]=im/lr[i*D+i];}
  checkFinite(xr,'LMMSE solve');checkFinite(xi,'LMMSE solve');return {re:xr,im:xi};
}
export function lmmse(input) {
  const validated=validateReceiver(input),{D,hr,hi,gr,gi}=gram(validated),c=validated.constellation,Q=c.length,v=validated.noiseVariance;
  const energy=c.reduce((s,x)=>s+cabs2(x.re,x.im),0)/Q,{lr,li,minPivot,maxPivot}=cholesky(gr,gi,D,v/energy),wr=zeros(D*D),wi=zeros(D*D);
  for(let col=0;col<D;col++){
    const br=zeros(D),bi=zeros(D);for(let i=0;i<D;i++){br[i]=hr[col*D+i];bi[i]=-hi[col*D+i];}
    const s=solveCholesky(lr,li,br,bi,D);for(let i=0;i<D;i++){wr[i*D+col]=s.re[i];wi[i*D+col]=s.im[i];}
  }
  const ar=zeros(D*D),ai=zeros(D*D),outR=zeros(D),outI=zeros(D);
  for(let i=0;i<D;i++)for(let r=0;r<D;r++) {
    const a=i*D+r;outR[i]+=wr[a]*validated.y[r].re-wi[a]*validated.y[r].im;outI[i]+=wr[a]*validated.y[r].im+wi[a]*validated.y[r].re;
    for(let j=0;j<D;j++){const b=r*D+j,t=i*D+j;ar[t]+=wr[a]*hr[b]-wi[a]*hi[b];ai[t]+=wr[a]*hi[b]+wi[a]*hr[b];}
  }
  const post=zeros(D*Q),effectiveSinr=[],residualVariance=[],gain=[];
  for(let i=0;i<D;i++){
    let residual=0;for(let j=0;j<D;j++){if(j!==i)residual+=energy*cabs2(ar[i*D+j],ai[i*D+j]);residual+=v*cabs2(wr[i*D+j],wi[i*D+j]);}
    const gainR=ar[i*D+i],gainI=ai[i*D+i],u=zeros(Q);
    if(!finite(residual)||residual<0)numericFail('LMMSE residual variance is nonfinite or negative');
    let normalizedGainPower=0;
    if(residual===0) {
      // Exact zero filter is uninformative. Nonzero filters with a zero squared
      // norm expose floating-point underflow and must not silently claim success.
      for(let r=0;r<D;r++)if(wr[i*D+r]!==0||wi[i*D+r]!==0)numericFail('LMMSE residual variance underflow for a nonzero filter');
      if(gainR!==0||gainI!==0||outR[i]!==0||outI[i]!==0)numericFail('Inconsistent zero-information LMMSE row');
    } else {
      // Remove the common |out|²/residual term analytically before evaluating.
      // Whitening keeps ratios scale-stable without an absolute variance floor.
      const scale=Math.sqrt(residual),nr=outR[i]/scale,ni=outI[i]/scale,br=gainR/scale,bi=gainI/scale;
      normalizedGainPower=cabs2(br,bi);
      const matchedR=nr*br+ni*bi,matchedI=ni*br-nr*bi;
      for(let a=0;a<Q;a++)u[a]=2*(matchedR*c[a].re+matchedI*c[a].im)-normalizedGainPower*cabs2(c[a].re,c[a].im);
    }
    post.set(normalize(u),i*Q);effectiveSinr.push(energy*normalizedGainPower);residualVariance.push(residual);gain.push({re:gainR,im:gainI});
  }
  checkFinite(effectiveSinr,'LMMSE effective SINR');
  // Independent residual of (G+v/E I) W=H^H exposes an unreliable solve.
  let err2=0,rhs2=0;for(let i=0;i<D;i++)for(let col=0;col<D;col++){
    let re=0,im=0;for(let k=0;k<D;k++){const a=i*D+k,b=k*D+col,rr=gr[a]+(i===k?v/energy:0);re+=rr*wr[b]-gi[a]*wi[b];im+=rr*wi[b]+gi[a]*wr[b];}
    re-=hr[col*D+i];im+=hi[col*D+i];err2+=cabs2(re,im);rhs2+=cabs2(hr[col*D+i],hi[col*D+i]);
  }
  const solveRelativeResidual=Math.sqrt(err2)/Math.max(1,Math.sqrt(rhs2));
  if(!finite(solveRelativeResidual)||solveRelativeResidual>1e-6)numericFail('LMMSE linear solve residual exceeds 1e-6');
  return {algorithm:'full-lmmse-effective-awgn',status:'solved',iterations:1,...posterior(post,D,Q),effectiveSinr,residualVariance,gain,
    solveRelativeResidual,choleskyPivotRatio:minPivot/maxPivot,
    posteriorInterpretation:'Effective-AWGN scalar calibration with uniform unit-energy symbols; this is not exact multiuser posterior inference.'};
}
export function solveSync(input) {
  const receiver=validateReceiver(input),mp=createMPG(receiver);while(mp.status==='running')mp.step();
  return {schemaVersion:SCHEMA_VERSION,kernelVersion:KERNEL_VERSION,status:'completed',receiver,mpg:mp.result(),lmmse:lmmse(receiver)};
}
export function canonicalJSON(value) {
  if(typeof value==='number'&&!Number.isFinite(value))fail('Cannot serialize a nonfinite value');
  if(value===null||['string','boolean','number'].includes(typeof value))return JSON.stringify(value);
  if(typeof value!=='object')fail('Canonical input must contain only finite JSON values');
  if(Array.isArray(value))return '['+Array.from(value,canonicalJSON).join(',')+']';
  if(Object.getPrototypeOf(value)!==Object.prototype)fail('Canonical objects must be plain JSON objects');
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalJSON(value[k])).join(',')+'}';
}
export async function inputDigest(receiver) {
  const bytes=new TextEncoder().encode(canonicalJSON(validateReceiver(receiver)));
  const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return 'sha256:'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
}
