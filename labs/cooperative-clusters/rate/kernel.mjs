/** Independent nearest-L PPP reduced-power integral; NOT Theorem 2 reproduction. */
export const MODEL_ID = 'independent-nearest-L-alpha4-K3-pc0.5-exogenous-v1';
export const KERNEL_VERSION = '0.1.0-review-candidate';
export const POLICY_THRESHOLD_NATS = 1e-6;
const LO=-80, HI=36, W=40;
export const CONFIG = Object.freeze({lo:LO,hi:HI,W,coarse:Object.freeze({order:8,inner:64}),refined:Object.freeze({order:12,inner:96})});
export class CancelledError extends Error { constructor(){super('Calculation cancelled; no result');this.name='CancelledError';} }
export function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Expected input object');
  if (Object.keys(input).some(k=>!['L','kappa'].includes(k))) throw new RangeError('Only L and kappa are configurable; alpha=4, K=3, pc=0.5');
  const {L,kappa}=input;
  if (!Number.isInteger(L)||L<1||L>5) throw new RangeError('L must be integer 1..5');
  if (typeof kappa!=='number'||!Number.isFinite(kappa)||kappa<0||kappa>1) throw new RangeError('kappa must be finite in [0,1]');
  return Object.freeze({L,kappa,alpha:4,K:3,pc:0.5});
}
function legendre(n) {
  const x=new Float64Array(n),w=new Float64Array(n);
  for(let i=0;i<Math.ceil(n/2);i++) {
    let z=Math.cos(Math.PI*(i+0.75)/(n+0.5)),p=0,dp=0;
    for(let iter=0;iter<100;iter++) {
      let p1=1,p2=0;
      for(let j=1;j<=n;j++){const p3=p2;p2=p1;p1=((2*j-1)*z*p2-(j-1)*p3)/j;}
      p=p1;dp=n*(z*p-p2)/(z*z-1);
      const next=z-p/dp;
      if(Math.abs(next-z)<4e-16){z=next;break;}
      z=next;if(iter===99)throw new Error('Quadrature root failed');
    }
    // Re-evaluate derivative at final root.
    let p1=1,p2=0;
    for(let j=1;j<=n;j++){const p3=p2;p2=p1;p1=((2*j-1)*z*p2-(j-1)*p3)/j;}
    dp=n*(z*p1-p2)/(z*z-1);
    x[i]=-z;x[n-1-i]=z;w[i]=w[n-1-i]=2/((1-z*z)*dp*dp);
  }
  return {x,w};
}
function composite(lo,hi,order){
  const {x,w}=legendre(order),segments=Math.ceil((hi-lo)/2),half=(hi-lo)/segments/2;
  const nodes=[],weights=[];
  for(let s=0;s<segments;s++) for(let j=0;j<order;j++) {nodes.push(lo+(2*s+1)*half+half*x[j]);weights.push(half*w[j]);}
  return {nodes,weights};
}
// Module-local geometry cache contains quadrature nodes only, never rates/reference tables.
const geometry=new Map();
function grid(profile,L){
  const key=`${profile}:${L}`;if(geometry.has(key))return geometry.get(key);
  const {order,inner}=CONFIG[profile],z=composite(LO,HI,order),v=composite(0,W,order),g=legendre(inner);
  const rows=v.nodes.map((w,i)=>{
    const vv=Math.exp(-w),oneMinus=-Math.expm1(-w),u2=new Float64Array(inner),jac=new Float64Array(inner);
    for(let j=0;j<inner;j++){const u=Math.exp(-w*(g.x[j]+1)/2);u2[j]=u*u;jac[j]=w*u/oneMinus*g.w[j]/2;}
    return {v2:vv*vv,weight:v.weights[i]*(L-1)*vv*oneMinus**(L-2),u2,jac};
  });
  const value={z,rows};geometry.set(key,value);return value;
}
function boundedLoss(x){
  if(!Number.isFinite(x)||x < -2e-13 || x > 1+2e-13) throw new Error('Invalid transform loss');
  return Math.min(1,Math.max(0,x));
}
function logRemaining(loss){return Math.log1p(-boundedLoss(loss));}
function difference(loga,logb){
  if(loga===-Infinity){if(logb!==-Infinity)throw new Error('Invalid vanished transform');return 0;}
  if(!Number.isFinite(loga)||Number.isNaN(logb))throw new Error('Nonfinite transform');
  if(logb-loga>2e-13)throw new Error('Negative transform difference');
  return Math.exp(loga)*(-Math.expm1(Math.min(0,logb-loga)));
}
export function analyticTruncationBounds(input){
  const {L}=validateInput(input);let moment=1;
  if(L>1){let beta=2;for(let b=1;b<L-1;b++)beta*=b/(b+0.5);moment=(L-1)*beta;}
  const low_z=Math.exp(LO/4)*4*L*Math.pow(.5,.25)*1.2746284833592645*moment;
  const high_z=(4/Math.PI)**L*2/L*Math.exp(-HI*L/2);
  const small_v=L===1?0:(L-1)*Math.exp(-W)*(Math.log1p(L*3*.5)+2*(W+1)+Math.log(2)+2/L+1);
  return Object.freeze({low_z,high_z,small_v,sum:low_z+high_z+small_v,interpretation:'Analytic omitted-domain upper bounds only; exclude in-domain quadrature error'});
}
/** Pull-based generator: each next() computes one z slice, then yields. No reference lookup. */
export function* integrateSteps(input,profile='refined') {
  const {L,kappa}=validateInput(input);
  if(!['coarse','refined'].includes(profile))throw new RangeError('Unknown fixed profile');
  const {z,rows}=grid(profile,L);let result=0,compensation=0;
  for(let i=0;i<z.nodes.length;i++){
    const zz=Math.exp(z.nodes[i]),root=Math.sqrt(zz),exterior=(1+root*Math.atan(root))**(-L);
    let integrand;
    if(L===1)integrand=-Math.expm1(-3*Math.log1p(.5*zz));
    else {
      const q1=zz/(1+zz),d1=-Math.expm1(-3*Math.log1p(.5*zz));
      const la1=logRemaining((1-kappa)*q1),lb1=logRemaining((1-kappa)*q1+kappa*d1);
      integrand=0;
      for(const row of rows){
        let la=la1,lb=lb1;
        if(L>2){let aq=0,ad=0;
          for(let j=0;j<row.u2.length;j++){
            aq+=row.jac[j]*zz/(row.u2[j]+zz);
            ad+=row.jac[j]*(-Math.expm1(-3*Math.log1p(.5*zz/row.u2[j])));
          }
          la+=(L-2)*logRemaining((1-kappa)*aq);
          lb+=(L-2)*logRemaining((1-kappa)*aq+kappa*ad);
        }
        lb-=3*Math.log1p(.5*zz/row.v2);
        integrand+=row.weight*difference(la,lb);
      }
    }
    const term=z.weights[i]*exterior*integrand;
    if(!Number.isFinite(term)||term<0)throw new Error('Invalid integrand');
    const corrected=term-compensation,next=result+corrected;compensation=(next-result)-corrected;result=next;
    yield Object.freeze({phase:profile,slicesCompleted:i+1,slicesTotal:z.nodes.length});
  }
  if(!Number.isFinite(result)||result<0)throw new Error('Invalid integral');
  return result;
}
export function integrateSync(input,profile='refined'){
  const steps=integrateSteps(input,profile);let step;do{step=steps.next();}while(!step.done);return step.value;
}
export async function calculate(input,options={}){
  const snapshot=validateInput(input);
  const {signal,yieldControl=()=>new Promise(resolve=>setTimeout(resolve,0)),chunkSlices=1,onProgress}=options;
  if(!Number.isInteger(chunkSlices)||chunkSlices<1||chunkSlices>8)throw new RangeError('chunkSlices integer 1..8');
  if(typeof yieldControl!=='function'||(onProgress!==undefined&&typeof onProgress!=='function'))throw new TypeError('Invalid callbacks');
  const start=performance.now();let maxChunkMs=0;
  const check=()=>{if(signal?.aborted)throw new CancelledError();};
  async function run(params,profile){
    check();const steps=integrateSteps(params,profile);
    while(true){check();const t=performance.now();let step;
      for(let i=0;i<chunkSlices;i++){check();step=steps.next();if(step.done)break;}
      maxChunkMs=Math.max(maxChunkMs,performance.now()-t);check();
      if(step.done)return step.value;
      onProgress?.({target:params.L===1?'baseline':'selected',...step.value});
      await yieldControl();check();
    }
  }
  const current={L:snapshot.L,kappa:snapshot.kappa},base={L:1,kappa:0};
  const baselineCoarse=await run(base,'coarse'),baselineRefined=await run(base,'refined');
  const coarse=snapshot.L===1?baselineCoarse:await run(current,'coarse');
  const refined=snapshot.L===1?baselineRefined:await run(current,'refined');
  check();const refinement={baseline:Math.abs(baselineCoarse-baselineRefined),selected:Math.abs(coarse-refined),interpretation:'Observed two-level difference; not an error bound'};
  if(refinement.baseline>POLICY_THRESHOLD_NATS||refinement.selected>POLICY_THRESHOLD_NATS)throw new Error('Refinement check failed; no result');
  return Object.freeze({status:'computed-policy-checks-passed',identity:'this-execution-numerical-integral',modelId:MODEL_ID,kernelVersion:KERNEL_VERSION,input:snapshot,units:'nats/channel-use',config:CONFIG,
    baseline:{coarse:baselineCoarse,refined:baselineRefined},selected:{coarse,refined},difference:refined-baselineRefined,
    equivalentToBaseline:snapshot.L===1||snapshot.kappa===0,refinement,analyticTruncation:{baseline:analyticTruncationBounds(base),selected:analyticTruncationBounds(current)},threshold:POLICY_THRESHOLD_NATS,elapsedMs:performance.now()-start,maxChunkMs});
}
