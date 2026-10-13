/** Generator/evaluator boundary. Never imported by the numerical receiver or Worker. */
import {buildChannel,qam,validateFrame,validateReceiver,KernelError,LIMITS} from './kernel.mjs';
function random32(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),a|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const fail=(s)=>{throw new KernelError('invalid-input',s);};
export function generateObservation({frame,paths,order=16,noiseVariance=0.1,seed=1,settings={maxIterations:30,tolerance:1e-9,damping:1,edgeTolerance:1e-13,captureHistory:true}}) {
  validateFrame(frame);
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)fail('seed must be uint32');
  if(typeof noiseVariance!=='number'||!Number.isFinite(noiseVariance)||noiseVariance<LIMITS.minVariance||noiseVariance>LIMITS.maxVariance)fail('invalid generator noiseVariance');
  const H=buildChannel(frame,paths),D=frame.N*frame.M,{symbols:constellation,labels}=qam(order);
  // Domain-separated independent data/noise streams. Actual receiver arrays are authoritative.
  const data=random32(seed^0x243f6a88),noise=random32(seed^0x85a308d3),truthIndices=Array.from({length:D},()=>Math.floor(data()*order));
  const x=truthIndices.map(i=>constellation[i]),noiseSamples=[],y=[];
  for(let r=0;r<D;r++){
    let re=0,im=0;for(let j=0;j<D;j++){re+=H[r][j].re*x[j].re-H[r][j].im*x[j].im;im+=H[r][j].re*x[j].im+H[r][j].im*x[j].re;}
    const radius=Math.sqrt(-2*Math.log(1-noise())),angle=2*Math.PI*noise(),scale=Math.sqrt(noiseVariance/2);
    const w={re:scale*radius*Math.cos(angle),im:scale*radius*Math.sin(angle)};noiseSamples.push(w);y.push({re:re+w.re,im:im+w.im});
  }
  const receiver=validateReceiver({frame,model:'eq14_literal',csi:'perfect-supplied',H,y,noiseVariance,constellation,settings});
  return {schemaVersion:'otfs-observation-v1',taskKind:'communication',receiver,
    generator:{version:'mulberry32-domain-separated-box-muller-v1',seed,frame,paths,order,noiseVariance},
    evaluation:{truthIndices,bitLabels:labels,transmittedSymbols:x,noiseSamples},
    convention:'Literal Eq14: sampled cyclic prehistory, right endpoints, negative carriers, one-sample DD origin, effective h-prime convention; not exact finite rectangular waveform.'};
}
export function evaluateDetector(result,evaluation) {
  const {probabilities:p,logProbabilities:lp}=result;
  if(!Array.isArray(p)||!Array.isArray(lp)||!p.length||p.length!==lp.length)fail('malformed detector result');
  const D=p.length,Q=p[0]?.length,labels=qam(Q).labels,truth=evaluation.truthIndices;
  if(!Array.isArray(truth)||truth.length!==D||Array.from(truth).some(x=>!Number.isInteger(x)||x<0||x>=Q))fail('invalid evaluation truth');
  let symbols=0,bits=0,entropy=0,score=0;const hard=[];
  for(let i=0;i<D;i++){
    if(!Array.isArray(p[i])||!Array.isArray(lp[i])||p[i].length!==Q||lp[i].length!==Q)fail('malformed posterior shape');let sum=0,best=0;
    for(let q=0;q<Q;q++){
      if(!Number.isFinite(p[i][q])||p[i][q]<0||p[i][q]>1||!Number.isFinite(lp[i][q])||Math.abs(Math.exp(lp[i][q])-p[i][q])>1e-10)fail('invalid posterior probability/log consistency');
      sum+=p[i][q];if(p[i][q]>p[i][best])best=q;entropy+=p[i][q]*lp[i][q];
    }
    if(Math.abs(sum-1)>1e-9)fail('posterior row not normalized');hard.push(best);symbols+=best!==truth[i];
    for(let b=0;b<labels[0].length;b++)bits+=labels[best][b]!==labels[truth[i]][b];score+=lp[i][truth[i]];
  }
  return {symbolErrorRate:symbols/D,bitErrorRate:bits/(D*labels[0].length),
    entropyProxyBits:Math.log2(Q)+entropy/(D*Math.LN2),truthLogScoreBits:Math.log2(Q)+score/(D*Math.LN2),hardIndices:hard,
    interpretation:'Entropy proxy is not capacity or measured mutual information. Truth log score can be negative.'};
}
