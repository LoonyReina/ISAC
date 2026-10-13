export const SCHEMA_VERSION = 'otfs-sensing-grid-v1';
export const KERNEL_VERSION = '0.1.0';
export const MODELS = Object.freeze(['eq14_literal','exact_rect_finite']);
export const LIMITS = Object.freeze({maxN:4,maxM:8,maxD:32,maxGridAxis:129,maxCandidates:16641,
  maxAbsX:16,maxAbsY:64,minNoiseVariance:1e-8,maxNoiseVariance:1e4,minTransmitEnergy:1e-20,
  minTemplateEnergy:1e-25,maxElapsedMs:30000,maxChunkCandidates:64,maxSessionRequests:1000});
export class KernelError extends Error { constructor(code,message) {super(message);this.name='KernelError';this.code=code;} }
export const fail=message=>{throw new KernelError('invalid-input',message);};
export const numericFail=message=>{throw new KernelError('numerical-failure',message);};
export function object(v,name,keys) {
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail(`${name} must be a plain object`);
  for(const k of Object.keys(v))if(!keys.includes(k))fail(`${name}.${k} is not allowed`);
}
export function number(v,lo,hi,name) {if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)fail(`${name} must be finite in [${lo},${hi}]`);return v;}
export function integer(v,lo,hi,name){number(v,lo,hi,name);if(!Number.isInteger(v))fail(`${name} must be an integer`);return v;}
export function vector(v,D,name,bound) {
  if(!Array.isArray(v)||v.length!==D||!Array.from({length:D},(_,i)=>Object.hasOwn(v,i)).every(Boolean))fail(`${name} must have ${D} complex entries in d=k+N*l order`);
  return v.map((z,i)=>{object(z,`${name}[${i}]`,['re','im']);return {re:number(z.re,-bound,bound,`${name}[${i}].re`),im:number(z.im,-bound,bound,`${name}[${i}].im`)};});
}
export function frame(f) {
  object(f,'frame',['N','M','T','fc']);
  const out={N:integer(f.N,1,LIMITS.maxN,'N'),M:integer(f.M,1,LIMITS.maxM,'M'),T:number(f.T,1e-9,1,'T seconds'),fc:number(f.fc,1e6,1e12,'fc Hz')};
  if(out.N*out.M>LIMITS.maxD)fail('frame exceeds 32 samples');return out;
}
export function parameters(f,q,a){number(q,0,f.M,'delayBin');number(a,-f.N,f.N,'dopplerBin');if(q===f.M||Math.abs(a)===f.N)fail('Need 0 <= q < M and |a| < N');}
export function model(m){if(!MODELS.includes(m))fail('Choose eq14_literal or exact_rect_finite explicitly');return m;}
export const energy=v=>v.reduce((s,z)=>s+z.re*z.re+z.im*z.im,0);
export function knownSignal(x,D){const out=vector(x,D,'x',LIMITS.maxAbsX);if(energy(out)<LIMITS.minTransmitEnergy)fail('x has insufficient transmit energy (<1e-20)');return out;}
export function validateObservation(raw) {
  object(raw,'observation',['frame','x','y','model','noiseVariance']);const f=frame(raw.frame),D=f.N*f.M;
  return {frame:f,x:knownSignal(raw.x,D),y:vector(raw.y,D,'y',LIMITS.maxAbsY),model:model(raw.model),
    noiseVariance:number(raw.noiseVariance,LIMITS.minNoiseVariance,LIMITS.maxNoiseVariance,'noiseVariance E|w|²')};
}
export function validateReceiver(raw) {
  object(raw,'receiver',['frame','x','y','model','noiseVariance','bounds','gridShape','settings']);
  const base=validateObservation({frame:raw.frame,x:raw.x,y:raw.y,model:raw.model,noiseVariance:raw.noiseVariance});
  if(!Array.isArray(raw.bounds)||raw.bounds.length!==2||![0,1].every(i=>Object.hasOwn(raw.bounds,i)&&Array.isArray(raw.bounds[i])&&raw.bounds[i].length===2&&[0,1].every(j=>Object.hasOwn(raw.bounds[i],j))))fail('bounds must be [[qMin,qMax],[aMin,aMax]]');
  const [[ql,qh],[al,ah]]=raw.bounds;parameters(base.frame,ql,al);parameters(base.frame,qh,ah);if(!(ql<qh&&al<ah))fail('search bounds must be strictly increasing');
  if(!Array.isArray(raw.gridShape)||raw.gridShape.length!==2||![0,1].every(i=>Object.hasOwn(raw.gridShape,i)))fail('gridShape must be [delayCount,dopplerCount]');
  const gridShape=raw.gridShape.map((n,i)=>integer(n,2,LIMITS.maxGridAxis,`gridShape[${i}]`));
  const count=gridShape[0]*gridShape[1];if(count>LIMITS.maxCandidates)fail('grid exceeds 16641 candidates');
  object(raw.settings,'settings',['maxEvaluations','maxElapsedMs','chunkCandidates']);
  const settings={maxEvaluations:integer(raw.settings.maxEvaluations,1,LIMITS.maxCandidates,'maxEvaluations'),
    maxElapsedMs:number(raw.settings.maxElapsedMs,1,LIMITS.maxElapsedMs,'maxElapsedMs'),chunkCandidates:integer(raw.settings.chunkCandidates,1,LIMITS.maxChunkCandidates,'chunkCandidates')};
  return {...base,bounds:[[ql,qh],[al,ah]],gridShape,settings};
}
export function canonicalJSON(value) {
  if(typeof value==='number'&&!Number.isFinite(value))fail('Cannot serialize nonfinite values');
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonicalJSON).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalJSON(value[k])).join(',')+'}';
}
export async function inputDigest(raw){const bytes=new TextEncoder().encode(canonicalJSON(validateReceiver(raw)));const d=await globalThis.crypto.subtle.digest('SHA-256',bytes);return 'sha256:'+Array.from(new Uint8Array(d),v=>v.toString(16).padStart(2,'0')).join('');}
