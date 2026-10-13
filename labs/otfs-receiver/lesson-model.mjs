/** Pure lesson adapter. Generation/evaluation never enter either receiver Worker. */
import {createTemplateOperator,physicalCoordinates} from './sensing/operators.mjs';
import {validateReceiver as validateSensing,evaluateCandidate} from './sensing/kernel.mjs';
import {frame as validateSensingFrame,parameters,model as validateModel} from './sensing/validation.mjs';
import {validateReceiver as validateCommunication,qam} from './communication/kernel.mjs';
import {generateObservation} from './communication/simulation.mjs';
import {exportLessonRecord,importLessonInputs} from './lesson-evidence.mjs';

export class LessonError extends Error {
  constructor(code,message){super(message);this.name='LessonError';this.code=code;}
}
const fail=message=>{throw new LessonError('invalid-input',message);};
const copy=value=>structuredClone(value);
export function deepFreeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);}return value;}
function object(value,keys,name){if(!value||Object.getPrototypeOf(value)!==Object.prototype)fail(`${name} must be a plain object`);for(const key of Object.keys(value))if(!keys.includes(key))fail(`${name}.${key} is not allowed`);}
function number(value,low,high,name){if(typeof value!=='number'||!Number.isFinite(value)||value<low||value>high)fail(`${name} must be finite in [${low},${high}]`);return value;}
function seed(value,name){number(value,0,0xffffffff,name);if(!Number.isInteger(value))fail(`${name} must be uint32`);return value;}
function guarded(action){try{return action();}catch(error){if(error?.code)throw error;throw new LessonError('invalid-input',String(error?.message??error));}}
function random32(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),a|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}

export const DEFAULT_SENSING_CONFIG=deepFreeze({
  frame:{N:4,M:8,T:6.4e-6,fc:5.89e9},generationModel:'eq14_literal',fittedModel:'eq14_literal',
  delayBin:1.2,dopplerBin:0.6,gain:{re:0.8,im:0.3},noiseVariance:0.03,dataSeed:1901,noiseSeed:4171,
  bounds:[[0.05,3.8],[-1.4,1.4]],gridShape:[65,65],
  settings:{maxEvaluations:16641,maxElapsedMs:30000,chunkCandidates:64}
});
export const DEFAULT_COMMUNICATION_CONFIG=deepFreeze({
  frame:{N:3,M:4},paths:[{delayBin:0.7,dopplerBin:0.3,gain:{re:0.8,im:0.3}},{delayBin:2.1,dopplerBin:-0.65,gain:{re:0.4,im:-0.25}}],
  order:16,noiseVariance:0.1,seed:2718,
  settings:{maxIterations:30,tolerance:1e-9,damping:1,edgeTolerance:0,captureHistory:true}
});
const OBSERVATION_SCHEMA='otfs-lesson-observation-v1';
const observationKeys=['schemaVersion','taskKind','receiver','generator','evaluation','provenance'];
function observation(raw,task){object(raw,observationKeys,'observation');if(raw.schemaVersion!==OBSERVATION_SCHEMA||raw.taskKind!==task)fail(`Expected ${task} lesson observation`);return raw;}

export function generateSensing(config={}){return guarded(()=>{
  object(config,Object.keys(DEFAULT_SENSING_CONFIG),'sensing config');
  const c={...copy(DEFAULT_SENSING_CONFIG),...copy(config)};
  c.frame=validateSensingFrame(c.frame);validateModel(c.generationModel);validateModel(c.fittedModel);
  parameters(c.frame,c.delayBin,c.dopplerBin);object(c.gain,['re','im'],'gain');
  const gain={re:number(c.gain.re,-4,4,'gain.re'),im:number(c.gain.im,-4,4,'gain.im')};
  seed(c.dataSeed,'dataSeed');seed(c.noiseSeed,'noiseSeed');number(c.noiseVariance,1e-8,1e4,'noiseVariance');
  const data=random32(c.dataSeed^0x243f6a88),noise=random32(c.noiseSeed^0x85a308d3),symbols=qam(4).symbols;
  const x=Array.from({length:c.frame.N*c.frame.M},()=>copy(symbols[Math.floor(data()*4)]));
  const template=createTemplateOperator(c.frame,x,c.generationModel).apply(c.delayBin,c.dopplerBin);
  const noiseless=template.map(s=>({re:gain.re*s.re-gain.im*s.im,im:gain.re*s.im+gain.im*s.re}));
  const noiseSamples=noiseless.map(()=>{const radius=Math.sqrt(-2*Math.log(1-noise())),angle=2*Math.PI*noise(),scale=Math.sqrt(c.noiseVariance/2);return {re:scale*radius*Math.cos(angle),im:scale*radius*Math.sin(angle)};});
  const y=noiseless.map((s,i)=>({re:s.re+noiseSamples[i].re,im:s.im+noiseSamples[i].im}));
  // Validate the actual draw exactly once. Invalid requested scenarios reject;
  // there is no resampling, clipping, gain correction, or truth-centered grid.
  const receiver=validateSensing({frame:c.frame,x,y,model:c.fittedModel,noiseVariance:c.noiseVariance,bounds:c.bounds,gridShape:c.gridShape,settings:c.settings});
  return deepFreeze({schemaVersion:OBSERVATION_SCHEMA,taskKind:'sensing',receiver,
    generator:{version:'mulberry32-two-seed-domain-separated-box-muller-v1',frame:c.frame,generationModel:c.generationModel,dataSeed:c.dataSeed,noiseSeed:c.noiseSeed,noiseVariance:c.noiseVariance,dataSeedXor:0x243f6a88,noiseSeedXor:0x85a308d3},
    evaluation:{generationModel:c.generationModel,trueDelayBin:c.delayBin,trueDopplerBin:c.dopplerBin,trueGain:gain,noiseless,noiseSamples},
    provenance:'generated-local; named nominal operator; no audited cross-model physical equivalence'});
});}
export function generateCommunication(config={}){return guarded(()=>{
  object(config,Object.keys(DEFAULT_COMMUNICATION_CONFIG),'communication config');
  const c={...copy(DEFAULT_COMMUNICATION_CONFIG),...copy(config)};
  // The accepted simulator remains authoritative, including its two streams.
  const generated=generateObservation(c);
  return deepFreeze({schemaVersion:OBSERVATION_SCHEMA,taskKind:'communication',receiver:generated.receiver,generator:copy(generated.generator),evaluation:generated.evaluation,provenance:generated.convention});
});}
export function sensingReceiver(raw,overrides={}){return guarded(()=>{
  const base=observation(raw,'sensing').receiver;
  object(overrides,['model','bounds','gridShape','settings'],'sensing receiver overrides');
  const receiver=validateSensing({...base,...overrides,settings:{...base.settings,...overrides.settings}});
  return deepFreeze(receiver);
});}
export function communicationReceiver(raw,settings={}){return guarded(()=>{
  const base=observation(raw,'communication').receiver;
  object(settings,Object.keys(DEFAULT_COMMUNICATION_CONFIG.settings),'communication settings');
  return deepFreeze(validateCommunication({...base,settings:{...base.settings,...settings}}));
});}
export function inspectSensing(receiver,q,a){return guarded(()=>{
  const valid=validateSensing(receiver);
  const {frame,x,y,model,noiseVariance}=valid;
  return deepFreeze(evaluateCandidate({frame,x,y,model,noiseVariance},q,a));
});}
export function evaluateSensing(result,evaluation){return guarded(()=>{
  if(evaluation===null||evaluation===undefined)return deepFreeze({status:'unavailable',reason:'No verified local evaluation truth is available',delayBinError:null,dopplerBinError:null,gainError:null});
  object(evaluation,['generationModel','trueDelayBin','trueDopplerBin','trueGain','noiseless','noiseSamples'],'sensing evaluation');
  const receiver=validateSensing(result?.receiver);validateModel(evaluation.generationModel);
  parameters(receiver.frame,evaluation.trueDelayBin,evaluation.trueDopplerBin);object(evaluation.trueGain,['re','im'],'trueGain');number(evaluation.trueGain.re,-4,4,'trueGain.re');number(evaluation.trueGain.im,-4,4,'trueGain.im');
  if(evaluation.generationModel!==receiver.model)return deepFreeze({status:'unavailable-model-mismatch',reason:'The named models have no audited common waveform/target mapping; residual-only nominal-operator mismatch',delayBinError:null,dopplerBinError:null,gainError:null});
  if(!result.selected)return deepFreeze({status:'unavailable',reason:'No informative selected candidate',delayBinError:null,dopplerBinError:null,gainError:null});
  const selected=result.selected;parameters(receiver.frame,selected.delayBin,selected.dopplerBin);object(selected.gain,['re','im'],'selected gain');number(selected.gain.re,-Number.MAX_VALUE,Number.MAX_VALUE,'selected gain.re');number(selected.gain.im,-Number.MAX_VALUE,Number.MAX_VALUE,'selected gain.im');
  const truthPhysical=physicalCoordinates(receiver.frame,evaluation.trueDelayBin,evaluation.trueDopplerBin),selectedPhysical=physicalCoordinates(receiver.frame,selected.delayBin,selected.dopplerBin);
  return deepFreeze({status:'evaluated-matched-model',delayBinError:selected.delayBin-evaluation.trueDelayBin,dopplerBinError:selected.dopplerBin-evaluation.trueDopplerBin,
    gainError:Math.hypot(selected.gain.re-evaluation.trueGain.re,selected.gain.im-evaluation.trueGain.im),
    monostaticRangeErrorM:selectedPhysical.monostaticRangeM-truthPhysical.monostaticRangeM,monostaticVelocityErrorMps:selectedPhysical.monostaticVelocityMps-truthPhysical.monostaticVelocityMps,
    interpretation:'Single-draw errors under the identical named model; not RMSE, detection, uniqueness, or continuum optimality'});
});}
export async function exportRecord(task,terminal,observation){return exportLessonRecord(task,terminal,observation);}
export async function importInputs(text){return importLessonInputs(text);}
