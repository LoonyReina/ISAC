/* Exact port of the accepted interpreted arXiv:2105.03125v2 numerical core.
 * Complex vectors use [real0,imag0,real1,imag1,...]. This file has no truth,
 * random generator, fixture lookup, DOM, or transport dependency. */
import {LIMITS,fail,keys,finite,vector,shapeOf,supportOf,pilotIndexOf,pilotOf,settingsOf,power,mod,preflight} from './validation.js';
export {LIMITS};
export const MODES=Object.freeze(['moment_repaired','ignored_uncertainty','literal_operational']);
export function validateSupport(shape,support){return supportOf(shapeOf(shape),support);}
export function graphIndices(shape,support){shape=shapeOf(shape);support=supportOf(shape,support);const [N,M]=shape,P=support.length,idx=new Int32Array(N*M*P);for(let k=0;k<N;k++)for(let l=0;l<M;l++)for(let p=0;p<P;p++)idx[(k*M+l)*P+p]=mod(k-support[p][0],N)*M+mod(l-support[p][1],M);return idx;}
export function rawCircularFrame({shape,x,support,gains,noise}){shape=shapeOf(shape);support=supportOf(shape,support);const L=shape[0]*shape[1],P=support.length; x=vector(x,2*L,'x');gains=vector(gains,2*P,'gains');noise=noise===undefined?new Float64Array(2*L):vector(noise,2*L,'noise');const idx=graphIndices(shape,support),y=new Float64Array(2*L);for(let r=0;r<L;r++){let re=0,im=0;for(let p=0;p<P;p++){const t=2*idx[r*P+p],ar=gains[2*p],ai=gains[2*p+1];re+=ar*x[t]-ai*x[t+1];im+=ar*x[t+1]+ai*x[t];}y[2*r]=re+noise[2*r];y[2*r+1]=im+noise[2*r+1];}return y;}
export function estimateEffectiveGains({shape,y,support,pilotIndex,pilot}){shape=shapeOf(shape);support=supportOf(shape,support);pilotIndex=pilotIndexOf(shape,pilotIndex);pilot=pilotOf(pilot);y=vector(y,2*shape[0]*shape[1],'y');const ep=pilot[0]**2+pilot[1]**2,a=new Float64Array(2*support.length);for(let p=0;p<support.length;p++){const r=2*(mod(support[p][0]+pilotIndex[0],shape[0])*shape[1]+mod(support[p][1]+pilotIndex[1],shape[1]));a[2*p]=(y[r]*pilot[0]+y[r+1]*pilot[1])/ep;a[2*p+1]=(y[r+1]*pilot[0]-y[r]*pilot[1])/ep;}return a;}
export function priorGainErrorVariance(priorPowers,Es,Ep,N0){if(!(Array.isArray(priorPowers)||priorPowers instanceof Float64Array)||priorPowers.length<1||priorPowers.length>3)fail('INVALID_INPUT','1–3 statistical prior powers required');const lam=vector(priorPowers,priorPowers.length,'priorPowers',{min:0,max:1e6});power(Es,'Es');power(Ep,'Ep');power(N0,'N0');const sum=lam.reduce((a,b)=>a+b,0);return Float64Array.from(lam,x=>(Es*(sum-x)+N0)/Ep);}
const FIELDS=['shape','support','y','estimatedGains','pilotIndex','pilot','Es','N0','gainVariance','mode','maxIterations','damping','tolerance'];
export function validateReceiverInput(input){preflight(input);keys(input,FIELDS,['shape','support','y','estimatedGains','pilotIndex','pilot','Es','N0'],'receiver');const shape=shapeOf(input.shape),support=supportOf(shape,input.support),L=shape[0]*shape[1],P=support.length;const pilot=pilotOf(input.pilot),pilotIndex=pilotIndexOf(shape,input.pilotIndex);const mode=input.mode===undefined?'moment_repaired':input.mode;if(!MODES.includes(mode))fail('INVALID_MODE','Unsupported detector mode');const Es=power(input.Es,'Es'),N0=power(input.N0,'N0');const y=vector(input.y,2*L,'y'),estimatedGains=vector(input.estimatedGains,2*P,'estimatedGains',{min:-1e24,max:1e24});let gainVariance=input.gainVariance===undefined?new Float64Array(P):vector(input.gainVariance,P,'gainVariance',{min:0,max:1e36});if(mode==='ignored_uncertainty')gainVariance.fill(0);if(mode==='literal_operational')gainVariance.fill((P*Es+N0)/(pilot[0]**2+pilot[1]**2));return {shape,support,y,estimatedGains,pilotIndex,pilot,Es,N0,gainVariance,mode,...settingsOf(input)};}
function norm2(a,b){const m=Math.max(a,b),x=Math.exp(a-m),y=Math.exp(b-m),sum=x+y;return [x/sum,y/sum];}
export function* sparseSpaSteps(input){
 const c=validateReceiverInput(input),{shape,support,y,pilot,pilotIndex,Es,N0,mode,maxIterations,damping,tolerance}=c,a=c.estimatedGains,v=c.gainVariance,L=shape[0]*shape[1],P=support.length,E=L*P,idx=graphIndices(shape,support),q=pilotIndex[0]*shape[1]+pilotIndex[1],ep=pilot[0]**2+pilot[1]**2,chi=Math.sqrt(Es);
 let incoming=new Float64Array(2*E).fill(.5),marginal=new Float64Array(2*L).fill(.5),lastDecisions=new Uint8Array(L),status='iteration_cap';const dataMask=new Uint8Array(L).fill(1);dataMask[q]=0;const history=[];
 const means=new Float64Array(2*E),second=new Float64Array(E),symvar=new Float64Array(E),meanSum=new Float64Array(2*L),varianceTerms=new Float64Array(E),varianceSum=new Float64Array(L),a2=new Float64Array(P),f2v=new Float64Array(2*E);let asumR=0,asumI=0;for(let p=0;p<P;p++){a2[p]=Math.hypot(a[2*p],a[2*p+1])**2;asumR+=a[2*p];asumI+=a[2*p+1];}
 for(let iteration=1;iteration<=maxIterations;iteration++){
   meanSum.fill(0);varianceSum.fill(0);
   for(let r=0;r<L;r++)for(let p=0;p<P;p++){const e=r*P+p,isPilot=idx[e]===q,mr=isPilot?pilot[0]:(-chi*incoming[2*e]+chi*incoming[2*e+1]),mi=isPilot?pilot[1]:0;means[2*e]=mr;means[2*e+1]=mi;second[e]=isPilot?ep:Es;symvar[e]=Math.max(0,second[e]-Math.hypot(mr,mi)**2);meanSum[2*r]+=a[2*p]*mr-a[2*p+1]*mi;meanSum[2*r+1]+=a[2*p]*mi+a[2*p+1]*mr;varianceTerms[e]=a2[p]*symvar[e]+v[p]*second[e];varianceSum[r]+=varianceTerms[e];}
   for(let p=0;p<P;p++)for(let r=0;r<L;r++){
     const e=r*P+p,ar=a[2*p],ai=a[2*p+1],mr=means[2*e],mi=means[2*e+1];let muR,muI,V;
     if(mode==='literal_operational') {const sr=asumR-ar,si=asumI-ai;muR=mr*sr-mi*si;muI=mr*si+mi*sr;let sum=0;for(let j=0;j<P;j++)sum+=(a2[j]+v[p])*symvar[r*P+j];V=Math.max(N0,N0+Es*(v[p]*(P-1)+sum-(a2[p]+v[p])*symvar[e]));}
     else {muR=meanSum[2*r]-(ar*mr-ai*mi);muI=meanSum[2*r+1]-(ar*mi+ai*mr);V=Math.max(N0,N0+varianceSum[r]-varianceTerms[e]+v[p]*chi*chi);}
     let probs;if(idx[e]===q)probs=[.5,.5];else {const rr=y[2*r]-muR,ri=y[2*r+1]-muI;const r0=rr+ar*chi,i0=ri+ai*chi,r1=rr-ar*chi,i1=ri-ai*chi;probs=norm2(-(Math.hypot(r0,i0)**2)/V-Math.log(V),-(Math.hypot(r1,i1)**2)/V-Math.log(V));
       // Boundary guard only: the returned decoder still uses the pinned
       // distance arithmetic. Both BPSK candidates have equal V, so this LLR is
       // algebraically equivalent and exposes subtraction/normalization loss.
       const stableLlr=4*chi*(rr*ar+ri*ai)/V;
       const stablePositive=stableLlr>=0?1/(1+Math.exp(-stableLlr)):Math.exp(stableLlr)/(1+Math.exp(stableLlr));
       if(!Number.isFinite(stableLlr)||Math.abs(probs[1]-stablePositive)>1e-9)fail('NUMERICAL_CONDITIONING','Candidate likelihood is numerically unresolved in the declared Float64 distance arithmetic');
     }
     f2v[2*e]=Math.log(Math.max(probs[0],1e-300));f2v[2*e+1]=Math.log(Math.max(probs[1],1e-300));
   }
   const total=new Float64Array(2*L);for(let e=0;e<E;e++){total[2*idx[e]]+=f2v[2*e];total[2*idx[e]+1]+=f2v[2*e+1];}
   const next=new Float64Array(2*L),updated=new Float64Array(2*E);let delta=0,marginalDelta=0,decisionChanges=0,entropy=0;
   const decisions=new Uint8Array(L),posteriorMean=new Float64Array(2*L);
   for(let t=0;t<L;t++){const z=norm2(total[2*t],total[2*t+1]);next[2*t]=z[0];next[2*t+1]=z[1];decisions[t]=z[1]>z[0]?1:0;posteriorMean[2*t]=-chi*z[0]+chi*z[1];if(t!==q){marginalDelta=Math.max(marginalDelta,Math.abs(z[0]-marginal[2*t]),Math.abs(z[1]-marginal[2*t+1]));decisionChanges+=decisions[t]!==lastDecisions[t]?1:0;entropy-=z[0]*Math.log2(Math.max(z[0],1e-300))+z[1]*Math.log2(Math.max(z[1],1e-300));}}
   posteriorMean[2*q]=pilot[0];posteriorMean[2*q+1]=pilot[1];
   for(let e=0;e<E;e++){const z=norm2(total[2*idx[e]]-f2v[2*e],total[2*idx[e]+1]-f2v[2*e+1]);for(let b=0;b<2;b++){updated[2*e+b]=damping*z[b]+(1-damping)*incoming[2*e+b];delta=Math.max(delta,Math.abs(updated[2*e+b]-incoming[2*e+b]));}}
   let residualMse=0;for(let r=0;r<L;r++){let pr=0,pi=0;for(let p=0;p<P;p++){const t=2*idx[r*P+p],ar=a[2*p],ai=a[2*p+1];pr+=ar*posteriorMean[t]-ai*posteriorMean[t+1];pi+=ar*posteriorMean[t+1]+ai*posteriorMean[t];}residualMse+=Math.hypot(y[2*r]-pr,y[2*r+1]-pi)**2;}
   incoming=updated;marginal=next;lastDecisions=decisions;const h={iteration,maxMessageChange:delta,maxMarginalChange:marginalDelta,decisionChanges,meanEntropyBits:entropy/(L-1),pluginResidualMse:residualMse/L};history.push(h);
   if(!marginal.every(Number.isFinite)||!incoming.every(Number.isFinite)||!Object.values(h).every(Number.isFinite))status='nonfinite_failure';else if(Math.max(delta,marginalDelta)<tolerance)status='converged';
   yield {stage:'spa_iteration',iteration,maxIterations,history:h};if(status!=='iteration_cap')break;
 }
 const decisions=new Float64Array(2*L);for(let t=0;t<L;t++)decisions[2*t]=marginal[2*t+1]>marginal[2*t]?chi:-chi;decisions[2*q]=pilot[0];decisions[2*q+1]=pilot[1];
 return {probabilities:marginal,probabilitiesValidMask:dataMask.slice(),knownPilotFlatIndex:q,knownPilotValue:pilot.slice(),decisions,status,iterations:history.length,history,dataMask,gainVariance:v};
}
export function sparseSpa(input){const iterator=sparseSpaSteps(input);let step;do{step=iterator.next();}while(!step.done);return step.value;}
const PRACTICAL_FIELDS=['shape','support','y','pilotIndex','pilot','Es','N0','priorPowers','mode','maxIterations','damping','tolerance'];
export function practicalReceiverInput(input){preflight(input);keys(input,PRACTICAL_FIELDS,['shape','support','y','pilotIndex','pilot','Es','N0','priorPowers'],'practical receiver');const shape=shapeOf(input.shape),support=supportOf(shape,input.support),pilot=pilotOf(input.pilot);const priorPowers=vector(input.priorPowers,support.length,'priorPowers',{min:0,max:1e6});const estimatedGains=estimateEffectiveGains({...input,shape,support,pilot});const gainVariance=priorGainErrorVariance(priorPowers,input.Es,pilot[0]**2+pilot[1]**2,input.N0);const {priorPowers:_ignored,...rest}=input;return {...rest,shape,support,pilot,estimatedGains,gainVariance};}
export function receive(input){const i=practicalReceiverInput(input);return {...sparseSpa(i),estimatedGains:i.estimatedGains,receiverInputPolicy:'raw y + declared predicted support/pilot/powers only; no current truth'};}
