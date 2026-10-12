/* Two calibrated receivers: a known-noise, marginalized Gaussian LRT.
 * Independent teaching model; NOT the source paper's maximization-based MAPRT.
 * Reference: detection_reference.py SHA-256
 * 4c3594b498431ba33f638b5c3be9811691e48231396a903dcbc1e906fcde2f0b.
 * Complex values are [I,Q]. CN(0,sigma²) means E|n|²=sigma², with
 * sigma²/2 in each real component. One fixed, prespecified candidate only.
 * Runtime raw processing uses proven sufficient matching, not a dense solve.
 * Only the simulator sees targetPresent; its random alpha is never returned.
 */
(function(root){'use strict';
const MIN_POSITIVE_RHO=1e-10,MAX_RHO=1e4,MIN_PFA=1e-12,MAX_PFA=1-1e-12;
const MAX_LENGTH=4096,MIN_SCALE=1e-8,MAX_SCALE=1e8;
const DEFAULTS=Object.freeze({rho:3,kappa:.75,pfa:.05,length:16,energy:1,noisePower:1,seed:843287});
const RNG_DESCRIPTION='Mulberry32 uint32 + cached Box–Muller; I then Q, each with variance 1/2; U1=1-uniform in (0,1]; not Python random.gauss same-seed parity';
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function finite(x,name){if(typeof x!=='number'||!Number.isFinite(x))throw new RangeError(`${name} must be a finite number`);return x;}
function integer(x,name,min,max=Number.MAX_SAFE_INTEGER){if(!Number.isSafeInteger(x)||x<min||x>max)throw new RangeError(`${name} must be a safe integer in [${min},${max}]`);return x;}
function probability(p){finite(p,'pfa');if(p<MIN_PFA||p>MAX_PFA)throw new RangeError('pfa must be in [1e-12,1-1e-12]');return p;}
function scaleValue(v,name){finite(v,name);if(v<MIN_SCALE||v>MAX_SCALE)throw new RangeError(`${name} must be in [1e-8,1e8]`);return v;}
function options(o,keys){if(!o||typeof o!=='object'||Array.isArray(o)||(Object.getPrototypeOf(o)!==Object.prototype&&Object.getPrototypeOf(o)!==null))throw new RangeError('options must be a plain object');for(const key of Reflect.ownKeys(o))if(typeof key!=='string'||!keys.includes(key))throw new RangeError(`unsupported option ${String(key)}`);return o;}
function valueOr(o,k,fallback){return hasOwn(o,k)?o[k]:fallback;}
function denseArray(a,min,max,name){if(!Array.isArray(a)||a.length<min||a.length>max)throw new RangeError(`${name} has unsupported dimensions`);for(let i=0;i<a.length;i++)if(!hasOwn(a,i))throw new RangeError(`${name} must not contain holes or inherited entries`);return a;}
function complex(v,name='complex value',magnitudeLimit=false){denseArray(v,2,2,name);finite(v[0],name);finite(v[1],name);if((magnitudeLimit?Math.hypot(v[0],v[1]):Math.max(Math.abs(v[0]),Math.abs(v[1])))>1e100)throw new RangeError(`${name} exceeds supported magnitude 1e100`);return [v[0],v[1]];}
function pair(z){denseArray(z,2,2,'receiver outputs');return [complex(z[0]),complex(z[1])];}
const absSquared=z=>Math.hypot(z[0],z[1])**2;
const multiply=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
// Error-free partial sums, with a final half-even correction as in math.fsum.
function sum(values){const partials=[];for(let x of values){let n=0;for(let y of partials){if(Math.abs(x)<Math.abs(y)){const swap=x;x=y;y=swap;}const hi=x+y,lo=y-(hi-x);if(lo)partials[n++]=lo;x=hi;}partials.length=n;partials.push(x);}let n=partials.length,hi=0,lo=0;if(n){hi=partials[--n];while(n){const x=hi,y=partials[--n];hi=x+y;lo=y-(hi-x);if(lo)break;}if(n&&((lo<0&&partials[n-1]<0)||(lo>0&&partials[n-1]>0))){const y=lo*2,x=hi+y;if(y===x-hi)hi=x;}}return hi;}
const models=new WeakSet();
class Model{
  constructor(rho=3,kappa=.75){finite(rho,'rho');finite(kappa,'kappa');if(rho!==0&&(rho<MIN_POSITIVE_RHO||rho>MAX_RHO))throw new RangeError('rho must be exactly 0 or within [1e-10,1e4]');if(kappa<0||kappa>1)throw new RangeError('kappa must be in [0,1]');this.rho=rho;this.kappa=kappa;models.add(this);Object.freeze(this);}
  get signalEigenvalues(){return [this.rho*(1+this.kappa),this.rho*(1-this.kappa)];}
  get nullWeights(){return this.signalEigenvalues.map(b=>b/(1+b));}
  get logDeterminant(){const [bp,bm]=this.signalEigenvalues;return Math.log1p(bp)+Math.log1p(bm);}
}
function modelValue(model){if(!model||!models.has(model))throw new RangeError('model must be constructed with Model');return model;}
function createModel(rho=3,kappa=.75){return new Model(rho,kappa);}
function localEnergies(z){return pair(z).map(absSquared);}
function energySum(z){return sum(localEnergies(z));}
function quadraticEigen(z,model){const [z1,z2]=pair(z),[ap,am]=modelValue(model).nullWeights;const plus=[(z1[0]+z2[0])/Math.SQRT2,(z1[1]+z2[1])/Math.SQRT2],minus=[(z1[0]-z2[0])/Math.SQRT2,(z1[1]-z2[1])/Math.SQRT2];return ap*absSquared(plus)+am*absSquared(minus);}
function quadraticMatrix(z,model,input={}){
  // Audit-only expansion: cancellation near the nullspace can create signed
  // last-bit error. Never use this in place of the nonnegative eigen runtime.
  const [z1,z2]=pair(z);modelValue(model);options(input,['correlationPhase']);const phase=finite(valueOr(input,'correlationPhase',0),'correlationPhase');
  const [bp,bm]=model.signalEigenvalues,D=(1+bp)*(1+bm),diagonal=model.rho+model.rho**2*(1-model.kappa)*(1+model.kappa);
  const cross=multiply([model.rho*model.kappa*Math.cos(phase),model.rho*model.kappa*Math.sin(phase)],multiply([z1[0],-z1[1]],z2));
  return (diagonal*(absSquared(z1)+absSquared(z2))+2*cross[0])/D;
}
function logLikelihoodRatio(z,model){return quadraticEigen(z,model)-model.logDeterminant;}
function waveformEnergy(s){denseArray(s,1,MAX_LENGTH,'waveform');const powers=[];for(const v of s){const z=complex(v,'waveform sample');if(Math.hypot(...z)>Math.sqrt(MAX_SCALE))throw new RangeError('waveform energy exceeds supported domain');powers.push(absSquared(z));}return scaleValue(sum(powers),'waveform energy');}
function qpskWaveform(length=16,energy=1){integer(length,'length',1,MAX_LENGTH);scaleValue(energy,'energy');let scale=Math.sqrt(energy/length);
  // The requested endpoint energy can round outward after square/root arithmetic.
  // Move only this generated amplitude inward by one representable value; do not
  // clip measured observations or silently accept an out-of-domain waveform.
  if(length*scale**2<MIN_SCALE)scale=nextUpPositive(scale);
  if(length*scale**2>MAX_SCALE)scale=nextDownPositive(scale);
  const symbols=[[1,0],[0,1],[-1,0],[0,-1]];return Array.from({length},(_,i)=>symbols[i%4].map(x=>x*scale));}
function matchedOutput(y,s,noisePower=1){const e=waveformEnergy(s);scaleValue(noisePower,'noisePower');denseArray(y,s.length,s.length,'observation');const re=[],im=[];for(let i=0;i<s.length;i++){const a=s[i],b=complex(y[i],'observation',true);re.push(a[0]*b[0]+a[1]*b[1]);im.push(a[0]*b[1]-a[1]*b[0]);}const denominator=Math.sqrt(noisePower)*Math.sqrt(e);return [sum(re)/denominator,sum(im)/denominator];}
function matchedPair(y,s,noisePower=1){denseArray(y,2,2,'receiver blocks');return [matchedOutput(y[0],s,noisePower),matchedOutput(y[1],s,noisePower)];}
function rawLogLikelihoodRatio(y,s,noisePower,model){return logLikelihoodRatio(matchedPair(y,s,noisePower),model);}
const nextBuffer=new ArrayBuffer(8),nextView=new DataView(nextBuffer);
function nextUpPositive(x){if(x===Infinity)return x;if(x===0)return Number.MIN_VALUE;nextView.setFloat64(0,x,false);let high=nextView.getUint32(0,false),low=nextView.getUint32(4,false);if(low===0xffffffff){low=0;high++;}else low++;nextView.setUint32(0,high,false);nextView.setUint32(4,low,false);return nextView.getFloat64(0,false);}
function nextDownPositive(x){if(x===0)return 0;nextView.setFloat64(0,x,false);let high=nextView.getUint32(0,false),low=nextView.getUint32(4,false);if(low===0){low=0xffffffff;high--;}else low--;nextView.setUint32(0,high,false);nextView.setUint32(4,low,false);return nextView.getFloat64(0,false);}
function ulp(x){return nextUpPositive(x)-x;}
function log1pmx(x){if(x>=.125)return Math.log1p(x)-x;let term=-.5*x*x;const terms=[term];for(let n=3;n<80;n++){term*=-x*(n-1)/n;terms.push(term);if(Math.abs(term)<=ulp(Math.abs(sum(terms))))break;}return sum(terms);}
function phiAndDelta(h){if(h===0)return [1,0];if(h>=.125){const phi=-Math.expm1(-h)/h;return [phi,phi-1];}let term=-.5*h;const terms=[term];for(let n=2;n<80;n++){term*=-h/(n+1);terms.push(term);if(Math.abs(term)<=ulp(Math.abs(sum(terms))))break;}const delta=sum(terms);return [1+delta,delta];}
function logTail(t,u,v){
  // log P(uX+vY>t) for independent unit exponentials. No near-equality snapping.
  if(typeof t!=='number'||Number.isNaN(t))throw new RangeError('t must be a non-NaN number');finite(u,'u');finite(v,'v');if(Math.min(u,v)<0)throw new RangeError('weights must be nonnegative');
  if(t<0)return 0;if(t===Infinity||Math.max(u,v)===0)return -Infinity;if(t===0)return 0;if(v>u){const swap=u;u=v;v=swap;}
  const x=t/u;if(!Number.isFinite(x)||v===0)return -x;if(u===v)return log1pmx(x);if(x===0)return 0;
  const ratio=(u-v)/v,h=Number.isFinite(ratio)?x*ratio:(t/v)*((u-v)/u),[phi,delta]=phiAndDelta(h),a=x*phi;
  return log1pmx(a)+x*delta;
}
function tail(t,u,v){return Math.exp(logTail(t,u,v));}
function lowerCdf(t,u,v){const logSurvival=logTail(t,u,v);return logSurvival===0?0:-Math.expm1(logSurvival);}
function tailQuantile(pfa,u,v){probability(pfa);finite(u,'u');finite(v,'v');if(Math.min(u,v)<0||Math.max(u,v)===0)throw new RangeError('nonnegative weights, at least one positive, required');const scale=Math.max(u,v),ratio=Math.min(u,v)/scale,target=Math.log(pfa);let lo=0,hi=Math.max(1,-target);while(logTail(hi,1,ratio)>target)hi*=2;for(let i=0;i<128;i++){const mid=lo+(hi-lo)/2;if(mid===lo||mid===hi)break;if(logTail(mid,1,ratio)>target)lo=mid;else hi=mid;}let result=scale*hi;if(!Number.isFinite(result))throw new RangeError('quantile exceeds finite binary64 range');if(logTail(result,u,v)>target)result=nextUpPositive(result);return result;}
const calibrations=new WeakSet();
function calibratedDetector(model,pfa=.05){modelValue(model);probability(pfa);const energyThreshold=tailQuantile(pfa,1,1),[bp,bm]=model.signalEigenvalues;let result;if(model.rho===0){result={model,pfa,jointThreshold:0,energyThreshold,jointPd:pfa,energySumPd:pfa,jointMiss:1-pfa,energySumMiss:1-pfa,jointTieRandomization:pfa};}else{const jointThreshold=tailQuantile(pfa,...model.nullWeights);result={model,pfa,jointThreshold,energyThreshold,jointPd:tail(jointThreshold,bp,bm),energySumPd:tail(energyThreshold,1+bp,1+bm),jointMiss:lowerCdf(jointThreshold,bp,bm),energySumMiss:lowerCdf(energyThreshold,1+bp,1+bm),jointTieRandomization:0};}result.logLrThreshold=result.jointThreshold-model.logDeterminant;Object.freeze(result);calibrations.add(result);return result;}
function calibrationValue(c){if(!c||!calibrations.has(c))throw new RangeError('calibration must come from calibratedDetector');return c;}
function decideJoint(z,calibration,input={}){calibrationValue(calibration);options(input,['tieUniform']);if(calibration.model.rho===0){pair(z);const u=valueOr(input,'tieUniform',null);if(typeof u!=='number'||!Number.isFinite(u)||u<0||u>=1)throw new RangeError('rho=0 requires an independent uniform in [0,1)');return u<calibration.jointTieRandomization;}return quadraticEigen(z,calibration.model)>calibration.jointThreshold;}
function decideEnergySum(z,calibration){calibrationValue(calibration);return energySum(z)>calibration.energyThreshold;}
function createRng(seed=DEFAULTS.seed){integer(seed,'seed',0,0xffffffff);let state=seed>>>0,spare=null;function uniform(){state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}function normal(){if(spare!==null){const value=spare;spare=null;return value;}const radius=Math.sqrt(-2*Math.log(1-uniform())),angle=2*Math.PI*uniform();spare=radius*Math.sin(angle);return radius*Math.cos(angle);}return Object.freeze({uniform,normal});}
function complexStandardNormal(rng){if(!rng||typeof rng.normal!=='function')throw new RangeError('rng must provide normal()');return [finite(rng.normal(),'normal draw')/Math.SQRT2,finite(rng.normal(),'normal draw')/Math.SQRT2];}
function generateObservations(rng,model,s,noisePower,input){
  // Cholesky simulation is separate from the detector eigenbasis. Alpha is
  // constant within each block and independently redrawn on each invocation.
  modelValue(model);const e=waveformEnergy(s);scaleValue(noisePower,'noisePower');options(input,['targetPresent']);if(!hasOwn(input,'targetPresent')||typeof input.targetPresent!=='boolean')throw new RangeError('simulator requires boolean targetPresent');let alpha=[[0,0],[0,0]];
  if(input.targetPresent){const g1=complexStandardNormal(rng),g2=complexStandardNormal(rng),scale=Math.sqrt(model.rho*noisePower/e),independent=Math.sqrt((1-model.kappa)*(1+model.kappa));alpha=[g1.map(v=>scale*v),g1.map((v,i)=>scale*(model.kappa*v+independent*g2[i]))];}
  const sigma=Math.sqrt(noisePower);return alpha.map(a=>s.map(w=>{const signal=multiply(a,w),noise=complexStandardNormal(rng);return signal.map((v,i)=>v+sigma*noise[i]);}));
}
function wilsonInterval(successes,trials,zScore=1.959963984540054){integer(trials,'trials',1);integer(successes,'successes',0,trials);finite(zScore,'zScore');if(zScore<=0||zScore>1e6)throw new RangeError('zScore must be in (0,1e6]');const p=successes/trials,denominator=1+zScore**2/trials,center=(p+zScore**2/(2*trials))/denominator,radius=zScore*Math.sqrt(p*(1-p)/trials+zScore**2/(4*trials**2))/denominator;return [successes===0?0:Math.max(0,center-radius),successes===trials?1:Math.min(1,center+radius)];}
function resourceLedger(length,input={}){
  options(input,['blocks','templateMode','bitsPerReal','modelDownRealsPerUpdate','modelUpdates']);integer(length,'length',1,MAX_LENGTH);const blocks=integer(valueOr(input,'blocks',1),'blocks',1),templateMode=valueOr(input,'templateMode','per_block'),bitsPerReal=valueOr(input,'bitsPerReal',null),modelDownRealsPerUpdate=integer(valueOr(input,'modelDownRealsPerUpdate',0),'modelDownRealsPerUpdate',0),modelUpdates=integer(valueOr(input,'modelUpdates',0),'modelUpdates',0);
  if(!['per_block','once','cached'].includes(templateMode))throw new RangeError('templateMode must be per_block, once, or cached');if(bitsPerReal!==null)integer(bitsPerReal,'bitsPerReal',1,128);const templateUpdates=templateMode==='per_block'?blocks:Number(templateMode==='once'),down=4*length*templateUpdates,modelDown=modelDownRealsPerUpdate*modelUpdates,schemes={};
  for(const [name,upReals,templateDownReals,modelDownReals] of [['centralRaw',4*length*blocks,0,0],['localComplexMatch',4*blocks,down,modelDown],['localEnergySum',2*blocks,down,modelDown]]){const totalReals=upReals+templateDownReals+modelDownReals,payloadBits=bitsPerReal===null?null:totalReals*bitsPerReal;for(const count of [upReals,templateDownReals,modelDownReals,totalReals,...(payloadBits===null?[]:[payloadBits])])integer(count,'payload count',0);schemes[name]=Object.freeze({upReals,templateDownReals,modelDownReals,totalReals,averageRealsPerBlock:totalReals/blocks,payloadBits});}
  return Object.freeze({receivers:2,length,blocks,templateMode,templateUpdates,bitsPerReal,modelDownRealsPerUpdate,modelUpdates,schemes:Object.freeze(schemes),caveat:'Numerical payload only; finite-bit quantization is not simulated. Center model/waveform availability and star unicast are assumptions. Explicit model downlink is the total across both receivers per update; zero means omitted, not free. Cached templates exclude historical acquisition. Calibration, framing, timestamps, computation, RF chains, topology, latency and energy are excluded.'});
}
const api=Object.freeze({MIN_POSITIVE_RHO,MAX_RHO,MIN_PFA,MAX_PFA,MAX_LENGTH,MIN_SCALE,MAX_SCALE,DEFAULTS,RNG_DESCRIPTION,Model,createModel,localEnergies,energySum,quadraticEigen,quadraticMatrix,logLikelihoodRatio,waveformEnergy,qpskWaveform,matchedOutput,matchedPair,rawLogLikelihoodRatio,logTail,tail,lowerCdf,tailQuantile,calibratedDetector,decideJoint,decideEnergySum,createRng,complexStandardNormal,generateObservations,wilsonInterval,resourceLedger});
if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.DistributedDetectionCore=api;
})(typeof window!=='undefined'?window:null);
