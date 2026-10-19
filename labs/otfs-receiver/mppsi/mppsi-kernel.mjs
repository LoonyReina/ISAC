/** Synchronous edge-PMF MP-Psi, Raviteja 1802.05242v2 Eqs35–41.
 * Eq40 final-product normalization and first-posterior fallback are declared completions.
 * No detector receives truth. The historical comparator below is immutable.
 */
import {buildChannel,qam,solveSync} from './accepted-kernel.mjs';
export {buildChannel,qam};
export const VERSION='mppsi-teaching-1';
const abs2=z=>z.re*z.re+z.im*z.im;
const clone=x=>JSON.parse(JSON.stringify(x));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const complex=z=>z&&finite(z.re)&&finite(z.im);
const fail=s=>{throw new Error(s);};
function softmax(a){if(!a.every(finite))fail('Nonfinite likelihood');const m=Math.max(...a),s=a.reduce((v,x)=>v+Math.exp(x-m),0);return a.map(x=>Math.exp((x-m)-Math.log(s)));}
const argmax=a=>a.indexOf(Math.max(...a));
export function decisionStep({eta,previousEta,maximumEta,iteration,maxIterations,drop}){
 const maximum=Math.max(maximumEta,eta);
 return {iteration,eta,max_eta:maximum,updated_decision:eta>previousEta,status:eta===1?'all_confident':eta<maximum-drop?'confidence_drop':iteration===maxIterations?'iteration_cap':'running'};
}
export function detectMPPsi({H,y,noiseVariance,constellation,settings={}}){
 const {damping=.7,gamma=.01,drop=.2,maxIterations=50,captureHistory=true}=settings;
 const R=H?.length,C=H?.[0]?.length,Q=constellation?.length;
 if(!Array.isArray(H)||!Number.isInteger(R)||R<1||R>64||!Number.isInteger(C)||C<1||C>64||!H.every(r=>Array.isArray(r)&&r.length===C&&r.every(complex))||!Array.isArray(y)||y.length!==R||!y.every(complex)||!Array.isArray(constellation)||Q<2||Q>256||!constellation.every(complex))fail('Finite conforming H/y/constellation required');
 if(!finite(noiseVariance)||noiseVariance<=0||!finite(damping)||damping<=0||damping>1||!finite(gamma)||gamma<=0||gamma>=1||!finite(drop)||drop<0||drop>1||!Number.isInteger(maxIterations)||maxIterations<1||maxIterations>200||typeof captureHistory!=='boolean')fail('Invalid MP-Psi settings');
 const E=R*C,power=H.flat().map(abs2),mask=H.flat().map(z=>z.re!==0||z.im!==0),sp=constellation.map(abs2);
 let p=Array.from({length:E},()=>Array(Q).fill(1/Q)),previousEta=0,maximumEta=0,selected=null,selectedIteration=null,fallback=false,post,status;
 const trace=[],history=[],edgeIndex=Math.max(0,mask.findIndex(Boolean));
 for(let iteration=1;iteration<=maxIterations;iteration++){
  const symbolMeans=p.map(row=>({re:row.reduce((s,v,a)=>s+v*constellation[a].re,0),im:row.reduce((s,v,a)=>s+v*constellation[a].im,0)}));
  const symbolVars=p.map((row,e)=>{const v=row.reduce((s,x,a)=>s+x*sp[a],0)-abs2(symbolMeans[e]);if(v< -1e-12)fail('Negative symbol variance');return Math.max(v,0);});
  const weighted=H.flat().map((h,e)=>({re:h.re*symbolMeans[e].re-h.im*symbolMeans[e].im,im:h.re*symbolMeans[e].im+h.im*symbolMeans[e].re}));
  const mean=[],variance=[],ll=[];
  for(let d=0;d<R;d++){
   let mr=0,mi=0,vv=0;for(let c=0;c<C;c++){const e=d*C+c;mr+=weighted[e].re;mi+=weighted[e].im;vv+=power[e]*symbolVars[e];}
   for(let c=0;c<C;c++){
    const e=d*C+c,h=H[d][c],mu={re:mr-weighted[e].re,im:mi-weighted[e].im},v=noiseVariance+vv-power[e]*symbolVars[e];
    if(!finite(v)||v<=0)fail('Invalid effective variance');mean.push(mu);variance.push(v);
    const rr=y[d].re-mu.re,ri=y[d].im-mu.im;
    ll.push(constellation.map((s,a)=>mask[e]?(2*(rr*(h.re*s.re-h.im*s.im)+ri*(h.re*s.im+h.im*s.re))-power[e]*sp[a])/v:0));
   }
  }
  if(!ll.flat().every(finite))fail('Nonfinite likelihood arithmetic');
  const total=Array.from({length:C},(_,c)=>Array.from({length:Q},(_,a)=>{let sum=0;for(let d=0;d<R;d++)sum+=ll[d*C+c][a];return sum;}));
  post=total.map(softmax);
  const extrinsic=ll.map((l,e)=>softmax(total[e%C].map((x,a)=>x-l[a])));
  const updated=extrinsic.map((row,e)=>row.map((x,a)=>mask[e]?damping*x+(1-damping)*p[e][a]:1/Q));
  const eta=post.filter(row=>Math.max(...row)>=1-gamma).length/C;
  const entry=decisionStep({eta,previousEta,maximumEta,iteration,maxIterations,drop});
  if(selected===null){selected=clone(post);selectedIteration=iteration;fallback=!entry.updated_decision;}
  if(entry.updated_decision){selected=clone(post);selectedIteration=iteration;fallback=false;}
  let delta=0;for(let e=0;e<E;e++)for(let a=0;a<Q;a++)delta=Math.max(delta,Math.abs(updated[e][a]-p[e][a]));
  entry.message_delta=delta;trace.push(entry);status=entry.status;maximumEta=entry.max_eta;
  if(captureHistory){const e=edgeIndex;history.push({iteration,posterior:clone(post),edge0:{observation:Math.floor(e/C),symbol:e%C,active:mask[e],oldMessage:p[e].slice(),symbolMean:symbolMeans[e],symbolVariance:symbolVars[e],mean:mean[e],variance:variance[e],logLikelihood:ll[e].slice(),extrinsic:extrinsic[e].slice(),messages:updated[e].slice()}});}
  p=updated;previousEta=eta;if(status!=='running')break;
 }
 return {algorithm:'MP-Psi',probabilities:selected,final_probabilities:post,hard:selected.map(argmax),iterations:trace.length,status,selected_iteration:selectedIteration,fallback_used:fallback,trace,history,edge_count:mask.filter(Boolean).length};
}
function settings(cap){return {maxIterations:cap,tolerance:1e-9,damping:.7,edgeTolerance:0,captureHistory:false};}
const defaults={scenario:'fractional',snrDb:10,seed:180205242,maxIterations:50};
function validateConfig(config){if(!config||typeof config!=='object'||Array.isArray(config)||Object.keys(config).some(k=>!['scenario','snrDb','seed','maxIterations'].includes(k)))fail('Invalid configuration object');const c={...defaults,...config};if(!['fractional','integer'].includes(c.scenario)||!finite(c.snrDb)||c.snrDb<0||c.snrDb>30||!Number.isInteger(c.seed)||c.seed<0||c.seed>4294967295||!Number.isInteger(c.maxIterations)||c.maxIterations<1||c.maxIterations>50)fail('Use scenario fractional/integer, SNR 0–30 dB, uint32 seed and 1–50 iterations');return c;}
function rng(seed){let t=seed>>>0;return ()=>{t=(t+0x6D2B79F5)>>>0;let x=Math.imul(t^(t>>>15),1|t);x^=x+Math.imul(x^(x>>>7),61|x);return ((x^(x>>>14))>>>0)/4294967296;};}
function channelsFor(scenario){const frame={N:3,M:4},delays=scenario==='integer'?[0,1]:[.35,1.4],paths=delays.map((delayBin,i)=>({delayBin,dopplerBin:i?-.41:.23,gain:i?{re:.65*Math.cos(.7),im:.65*Math.sin(.7)}:{re:1,im:0}}));const matched=buildChannel(frame,paths),rounded=buildChannel(frame,paths.map(p=>({...p,delayBin:Math.floor(p.delayBin+.5)}))).map(row=>row.map(z=>Math.hypot(z.re,z.im)<1e-12?{re:0,im:0}:z));return {frame,paths,matched,rounded};}
export function runPaired(config={}){
 const cfg=validateConfig(config),channels=channelsFor(cfg.scenario),alphabet=qam(4),random=rng(cfg.seed),truth=Array.from({length:12},()=>Math.floor(random()*4)),noiseVariance=10**(-cfg.snrDb/10);
 const noise=truth.map(()=>{const r=Math.sqrt(-2*Math.log(Math.max(Number.MIN_VALUE,random())))*Math.sqrt(noiseVariance/2),theta=2*Math.PI*random();return {re:r*Math.cos(theta),im:r*Math.sin(theta)};});
 const y=channels.matched.map((row,d)=>row.reduce((sum,h,c)=>{const x=alphabet.symbols[truth[c]];return {re:sum.re+h.re*x.re-h.im*x.im,im:sum.im+h.re*x.im+h.im*x.re};},{...noise[d]}));
 return replayPaired({schema:VERSION,config:cfg,noiseVariance,y,truth});
}
export function replayPaired(record){
 if(!record||typeof record!=='object'||Array.isArray(record)||record.schema!==VERSION||Object.keys(record).some(k=>!['schema','config','noiseVariance','y','truth'].includes(k)))fail('Unsupported replay schema');
 const cfg=validateConfig(record.config),channels=channelsFor(cfg.scenario),alphabet=qam(4),{y,truth,noiseVariance}=record;
 if(!Array.isArray(y)||y.length!==12||!y.every(z=>complex(z)&&Math.max(Math.abs(z.re),Math.abs(z.im))<=64)||!Array.isArray(truth)||truth.length!==12||!truth.every(a=>Number.isInteger(a)&&a>=0&&a<4)||!finite(noiseVariance)||Math.abs(noiseVariance-10**(-cfg.snrDb/10))>1e-12)fail('Invalid replay observation, truth or noise variance');
 const results={};for(const model of ['matched','rounded']){
  const H=channels[model];
  // Legacy csi token is required by frozen API; it is NOT rounded-model provenance.
  const input={frame:channels.frame,model:'eq14_literal',csi:'perfect-supplied',H,y,noiseVariance,constellation:alphabet.symbols,settings:settings(cfg.maxIterations)},baseline=solveSync(input);
  results['mppsi_'+model]=detectMPPsi({H,y,noiseVariance,constellation:alphabet.symbols,settings:{maxIterations:cfg.maxIterations,captureHistory:true}});
  results['mpg_'+model]=baseline.mpg;results['lmmse_'+model]=baseline.lmmse;
 }
 for(const [key,r] of Object.entries(results)){r.hard=r.probabilities.map(argmax);r.symbolErrors=r.hard.filter((a,c)=>a!==truth[c]).length;r.bitErrors=r.hard.reduce((sum,a,c)=>sum+alphabet.labels[a].filter((bit,j)=>bit!==alphabet.labels[truth[c]][j]).length,0);r.model=key.endsWith('_matched')?'matched':'rounded';}
 const cleanRecord={schema:VERSION,config:cfg,noiseVariance,y:clone(y),truth:truth.slice()};
 return {record:cleanRecord,results,channels,truth:truth.slice(),noiseVariance};
}
