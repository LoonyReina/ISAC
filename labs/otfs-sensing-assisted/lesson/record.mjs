/* Production record boundary. Hashes prove byte integrity, never authorship.
 * Import is bounded structural validation; explicit checking replays the frozen
 * implementation. The separately supplied Python oracle is another evidence layer. */
import {encode,decode,sha256} from '../runtime/js/codec.js';
import {keys,fail,finite,integer} from '../runtime/js/validation.js';
import {validateExperimentConfig,experimentSteps,MODEL_NOTICES} from '../runtime/js/evaluation.js';
import {practicalReceiverInput,validateReceiverInput,sparseSpa,estimateEffectiveGains,priorGainErrorVariance} from '../runtime/js/receiver.js';
export const MAX_IMPORT_BYTES=8*1024*1024;
export const RECORD_SCHEMA='sensing-assisted-otfs-lesson-record-v1';
export const PROVENANCE=Object.freeze({source:'https://arxiv.org/pdf/2105.03125v2',sourceVersion:'2105.03125v2',sourcePdfSha256:'57e8c349ee32452bd53d42625da4295c6e4014ca1c2e52bb17584fea40ce1f98',runtimeVersion:'v3',manifestSha256:'352370b7ba1046e748b6d4e0ec6cde296ccf37d060da56a2ca079249ef491de6',runtimeManifestSha256:'5a51d315a6f33b352149cc388bcb72edda1a22876cacd89a375b5b1337127a7e',referenceSha256:'c83ba035ee49d8011c2b3b8f5f0260b7e95fd2fb562781f03e63a1ea7407ddce'});
const EXECUTION={environment:'module-compatible runtime; execution environment not authenticated',durationBasis:'caller elapsed monotonic milliseconds including worker scheduling and transport'};
const POLICY={sourceAuthenticity:'not-verified',independentNumericalReplay:'not-run',history:'untrusted imported history until explicit same-implementation replay',halfTies:'No probability snapping or deletion. Independent cross-language categorical disagreements require per-iteration half-tie localization; all other fields remain strict.'};
const RNG='Mulberry32-open-uniform-BoxMuller-v1; independent fresh frame primitives; no per-realization gain normalization';
const PAIRING='All receiver modes use this exact raw y; practical modes share estimates/support/initialization/schedule/stopping. No statistical interval from one or two frames.';
const GAIN_WARNING='Under support mismatch this includes assigned missing/wrong-support bias; true gain used here only for evaluation';
const SUMMARY_WARNING='One/two fresh frames demonstrate mechanics; not a BER curve or evidence of a universal advantage';
const RECEIVE_POLICIES=['raw y + predicted support/pilot/statistical powers only','raw y + declared predicted support/pilot/powers only; no current truth'];
const ROOT=['schema','canonicalPaperId','runtimePaperId','provenance','runId','parentRunId','operation','status','reason','startedAt','durationMs','execution','input','payload','counts','verificationPolicy'];
const TERMINALS=['complete','cancelled','superseded','error','failed','partial'];
const RSTATUS=['converged','iteration_cap','nonfinite_failure','exception_failure'];
const FRAME_BASE=['frame','normalization','Es','Ep','N0','pilot','x','y','noise','trueGainsEvaluationOnly','dataSignsEvaluationOnly','energyLedger','records','status'];
const FRAME_EST=['estimatedGains','receiverGainVariance','predictedSupport','physicalSupportEvaluationOnly','gainErrorEvaluation'];
const FRAME_END=['pairedRepairedMinusIgnoredBER','pairing'];
const RESULT_FIELDS=['probabilities','probabilitiesValidMask','knownPilotFlatIndex','knownPilotValue','decisions','status','iterations','history','dataMask','gainVariance'];
const encoder=new TextEncoder();
const assert=(ok,msg)=>{if(!ok)fail('INVALID_RECORD',msg);};
const exact=(a,b,label)=>assert(encode(a)===encode(b),`${label}: values, fields or types differ`);
function strict(x,names,label){keys(x,names,names,label);}
// Scan before JSON.parse: duplicate keys would otherwise disappear, and a small
// byte budget alone does not bound maliciously deep/numerous JSON containers.
function jsonPreflight(text){
 let i=0,nodes=0;const stack=[];
 while(i<text.length){const ch=text[i];if(/\s/.test(ch)){i++;continue;}
  if(ch==='"'){const start=i++;let closed=false;while(i<text.length){if(text[i]==='\\'){i+=2;continue;}if(text[i++]==='"'){closed=true;break;}}assert(closed,'Unterminated JSON string');
   const parent=stack.at(-1);if(parent?.object&&parent.key){const name=JSON.parse(text.slice(start,i));assert(name.length<=128&&!['__proto__','constructor','prototype'].includes(name)&&!parent.names.has(name),'Duplicate, unsafe or oversized JSON key');parent.names.add(name);parent.key=false;}nodes++;
  }else if(ch==='{'||ch==='['){stack.push({object:ch==='{',key:ch==='{',names:new Set()});assert(stack.length<=32,'JSON nesting budget exceeded');i++;nodes++;}
  else if(ch==='}'||ch===']'){stack.pop();i++;}
  else if(ch===','){if(stack.at(-1)?.object)stack.at(-1).key=true;i++;}
  else if(ch===':'){i++;}
  else {const start=i;while(i<text.length&&!/[\s,\[\]{}:"]/.test(text[i]))i++;assert(i>start,'Malformed JSON token');nodes++;}
  assert(nodes<=500000,'JSON node budget exceeded');
 }
}
function isId(x){return typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(x)&&!['constructor','prototype','__proto__'].includes(x);}
function array(x,length,label){assert(Array.isArray(x)&&x.length===length,`${label}: invalid array length`);}
function typed(x,type,length,label,{min=-Number.MAX_VALUE,max=Number.MAX_VALUE}={}){assert(x instanceof type&&x.length===length&&x.buffer instanceof ArrayBuffer,`${label}: invalid dtype or length`);for(const v of x)finite(v,label,min,max);}
function clone(x){return decode(encode(x));}
function freezeTree(x){if(x&&typeof x==='object'&&!ArrayBuffer.isView(x)){for(const v of Object.values(x))freezeTree(v);Object.freeze(x);}return x;}
function normalized(operation,input){if(operation==='run')return validateExperimentConfig(input);assert(operation==='receive','Unknown operation');const i=practicalReceiverInput(input),c=validateReceiverInput(i);return {shape:c.shape,support:c.support,y:c.y,pilotIndex:c.pilotIndex,pilot:c.pilot,Es:c.Es,N0:c.N0,priorPowers:Array.from(input.priorPowers),mode:c.mode,maxIterations:c.maxIterations,damping:c.damping,tolerance:c.tolerance};}
function decoderSchema(r,c,{evaluation=false,mode=null}={}){
 const extras=evaluation?['mode','extraInformationOracle','metrics']:['estimatedGains','receiverInputPolicy'];
 const exception=r?.status==='exception_failure';strict(r,[...RESULT_FIELDS,...extras,...(exception?['exception','numericalFailureCode']:[])],'receiver result');
 const L=c.shape[0]*c.shape[1],P=(c.support??c.predictedSupport).length,q=c.pilotIndex[0]*c.shape[1]+c.pilotIndex[1],pilot=c.pilot,Es=c.Es;
 assert(RSTATUS.includes(r.status),'Unknown receiver status');typed(r.probabilities,Float64Array,2*L,'probabilities',{min:0,max:1});typed(r.decisions,Float64Array,2*L,'decisions');typed(r.dataMask,Uint8Array,L,'dataMask',{min:0,max:1});typed(r.probabilitiesValidMask,Uint8Array,L,'probabilitiesValidMask',{min:0,max:1});typed(r.gainVariance,Float64Array,P,'gainVariance',{min:0});
 exact(r.knownPilotFlatIndex,q,'known pilot index');exact(r.knownPilotValue,pilot,'known pilot value');
 for(let t=0;t<L;t++){const expected=t===q?0:1;assert(r.dataMask[t]===expected&&r.probabilitiesValidMask[t]===expected,'Pilot/data/probability mask mismatch');assert(Math.abs(r.probabilities[2*t]+r.probabilities[2*t+1]-1)<=2e-15,'Probabilities must normalize');if(t===q){exact([r.probabilities[2*t],r.probabilities[2*t+1]],[.5,.5],'Known pilot neutral probability');exact([r.decisions[2*t],r.decisions[2*t+1]],pilot,'Known pilot decision');}else{exact(r.decisions[2*t],r.probabilities[2*t+1]>r.probabilities[2*t]?Math.sqrt(Es):-Math.sqrt(Es),'BPSK probability/decision relationship');exact(r.decisions[2*t+1],0,'Real BPSK decision');}}
 integer(r.iterations,'iterations',exception?0:1,c.maxIterations);array(r.history,r.iterations,'history');
 for(let j=0;j<r.history.length;j++){const h=r.history[j];strict(h,['iteration','maxMessageChange','maxMarginalChange','decisionChanges','meanEntropyBits','pluginResidualMse'],'iteration summary');exact(h.iteration,j+1,'History iteration');finite(h.maxMessageChange,'maxMessageChange',0,1);finite(h.maxMarginalChange,'maxMarginalChange',0,1);integer(h.decisionChanges,'decisionChanges',0,L-1);finite(h.meanEntropyBits,'meanEntropyBits',0,1+1e-14);finite(h.pluginResidualMse,'pluginResidualMse',0,Number.MAX_VALUE);if(j<r.history.length-1)assert(Math.max(h.maxMessageChange,h.maxMarginalChange)>=c.tolerance,'History continued after convergence');}
 if(r.status==='converged'){const h=r.history.at(-1);assert(Math.max(h.maxMessageChange,h.maxMarginalChange)<c.tolerance,'Convergence threshold mismatch');}
 if(r.status==='iteration_cap'){exact(r.iterations,c.maxIterations,'Iteration cap');const h=r.history.at(-1);assert(Math.max(h.maxMessageChange,h.maxMarginalChange)>=c.tolerance,'Cap status despite convergence');}
 if(exception){exact(r.iterations,0,'Exception iterations');assert(typeof r.exception==='string'&&r.exception.length<=1000,'Invalid exception description');assert(r.numericalFailureCode===null||(typeof r.numericalFailureCode==='string'&&/^[A-Z0-9_]{1,100}$/.test(r.numericalFailureCode)),'Invalid numerical failure code');for(const p of r.probabilities)exact(p,.5,'Exception fallback probabilities');}
 const oracle=mode==='supplied_perfect_csi',effective=oracle?'ignored_uncertainty':(mode??c.mode),statistical=priorGainErrorVariance(c.priorPowers,Es,pilot[0]**2+pilot[1]**2,c.N0),v=effective==='ignored_uncertainty'?new Float64Array(P):effective==='literal_operational'?new Float64Array(P).fill((P*Es+c.N0)/(pilot[0]**2+pilot[1]**2)):statistical;
 // An exception fallback preserves the detector input variance, before mode rewriting.
 exact(r.gainVariance,exception?(oracle?new Float64Array(P):statistical):v,'Receiver variance mode');
 if(evaluation){exact(r.mode,mode,'Receiver mode order');exact(r.extraInformationOracle,oracle,'Extra-information label');strict(r.metrics,['errors','bits','BER','frameErrors','frames','FER','correctPayloadBits','capped','failureCountedConservatively'],'metrics');}
 else {assert(RECEIVE_POLICIES.includes(r.receiverInputPolicy),'Unknown receiver input policy');typed(r.estimatedGains,Float64Array,2*P,'estimatedGains');exact(r.estimatedGains,estimateEffectiveGains(c),'Raw-y gain estimates');}
}
function validateResult(operation,input,result,status){
 if(result===null){assert(status!=='complete','Complete record requires result');return;}
 if(operation==='receive'){decoderSchema(result,input);return;}
 const c=input;strict(result,['schema','configuration','notices','rng','frames','status','summary'],'run result');exact(result.schema,'sensing-assisted-otfs-live-v1','Runtime schema');exact(result.configuration,c,'Normalized input/configuration');exact(result.notices,MODEL_NOTICES,'Model notices');exact(result.rng,RNG,'RNG declaration');assert(['complete','partial','cancelled','superseded','failed'].includes(result.status),'Invalid raw result status');if(status==='complete')exact(result.status,'complete','Terminal/result completion');
 const total=c.frames*c.normalizations.length;assert(Array.isArray(result.frames)&&result.frames.length<=total,'Invalid frame count');
 for(let j=0;j<result.frames.length;j++){
  const f=result.frames[j],hasEstimate=Object.hasOwn(f,'estimatedGains'),complete=f.status==='complete';strict(f,[...FRAME_BASE,...(hasEstimate?FRAME_EST:[]),...(complete?FRAME_END:[])],'frame');assert(['partial','complete'].includes(f.status),'Invalid frame status');if(j<result.frames.length-1)assert(complete,'Only the last frame may be partial');assert(!complete||hasEstimate,'Complete frame lacks estimator');
  exact(f.frame,Math.floor(j/c.normalizations.length),'Frame order');exact(f.normalization,c.normalizations[j%c.normalizations.length],'Normalization order');
  const L=c.shape[0]*c.shape[1],P=c.physicalSupport.length,Es=f.normalization==='source_per_data'?c.dataEnergy:L*c.dataEnergy/(L-1+c.pilotPowerRatio),Ep=Es*c.pilotPowerRatio,pilot=[Math.sqrt(Ep)*Math.cos(c.pilotPhase),Math.sqrt(Ep)*Math.sin(c.pilotPhase)],q=c.pilotIndex[0]*c.shape[1]+c.pilotIndex[1];exact(f.Es,Es,'Data energy');exact(f.Ep,Ep,'Pilot energy');exact(f.N0,c.N0,'Noise variance');exact(f.pilot,pilot,'Pilot');
  for(const name of ['x','y','noise'])typed(f[name],Float64Array,2*L,name);typed(f.trueGainsEvaluationOnly,Float64Array,2*P,'Truth gains');typed(f.dataSignsEvaluationOnly,Int8Array,L,'Truth data signs',{min:-1,max:1});for(const sign of f.dataSignsEvaluationOnly)assert(sign===-1||sign===1,'Data sign must be BPSK');
  for(let t=0;t<L;t++)exact([f.x[2*t],f.x[2*t+1]],t===q?pilot:[f.dataSignsEvaluationOnly[t]*Math.sqrt(Es),0],'Raw transmitted symbol');
  exact(f.energyLedger,{cellCount:L,pilotCount:1,dataCount:L-1,guardCount:0,dataEnergy:(L-1)*Es,pilotEnergy:Ep,totalFrameEnergy:(L-1)*Es+Ep,referenceBudget:L*c.dataEnergy,noiseVariance:c.N0,noiseReferenceUnchanged:true},'Energy ledger');
  if(hasEstimate){typed(f.estimatedGains,Float64Array,2*P,'Estimated gains');typed(f.receiverGainVariance,Float64Array,P,'Receiver gain variance',{min:0});exact(f.predictedSupport,c.predictedSupport,'Predicted support');exact(f.physicalSupportEvaluationOnly,c.physicalSupport,'Physical support');exact(f.estimatedGains,estimateEffectiveGains({shape:c.shape,support:c.predictedSupport,y:f.y,pilotIndex:c.pilotIndex,pilot}),'Pilot gain estimate');exact(f.receiverGainVariance,priorGainErrorVariance(c.priorPowers,Es,pilot[0]**2+pilot[1]**2,c.N0),'Prior gain variance');let numerator=0,denominator=0;for(let k=0;k<2*P;k++){numerator+=(f.estimatedGains[k]-f.trueGainsEvaluationOnly[k])**2;denominator+=f.trueGainsEvaluationOnly[k]**2;}exact(f.gainErrorEvaluation,{squaredError:numerator,trueEnergy:denominator,NMSE:denominator===0?null:numerator/denominator,warning:GAIN_WARNING},'Gain evaluation');}
  assert(Array.isArray(f.records)&&f.records.length<=c.modes.length,'Invalid receiver record count');if(!hasEstimate)exact(f.records.length,0,'Unestimated frame cannot have receivers');if(complete)exact(f.records.length,c.modes.length,'Completed frame receiver count');
  for(let k=0;k<f.records.length;k++){const r=f.records[k],mode=c.modes[k];decoderSchema(r,{...c,support:mode==='supplied_perfect_csi'?c.physicalSupport:c.predictedSupport,pilot,Es},{evaluation:true,mode});const bits=L-1,failed=['nonfinite_failure','exception_failure'].includes(r.status);let errors=0;for(let t=0;t<L;t++)if(t!==q&&r.decisions[2*t]!==f.x[2*t])errors++;if(failed)errors=bits;exact(r.metrics,{errors,bits,BER:errors/bits,frameErrors:errors>0?1:0,frames:1,FER:errors>0?1:0,correctPayloadBits:bits-errors,capped:r.status==='iteration_cap',failureCountedConservatively:failed},'Error denominator and failure retention');}
  if(complete){const repaired=f.records.find(x=>x.mode==='moment_repaired'),ignored=f.records.find(x=>x.mode==='ignored_uncertainty');exact(f.pairedRepairedMinusIgnoredBER,repaired&&ignored?repaired.metrics.BER-ignored.metrics.BER:null,'Same-y paired BER');exact(f.pairing,PAIRING,'Same-y pairing declaration');}
 }
 if(result.status==='complete'){exact(result.frames.length,total,'Completed frame count');assert(result.frames.every(f=>f.status==='complete'),'Complete result contains partial frame');exact(result.summary,{independentFrameDraws:c.frames,conditionFrameCount:total,receiverRecords:total*c.modes.length,allCappedAndFailureRecordsRetained:true,confidenceInterval:null,warning:SUMMARY_WARNING},'Run summary');}else exact(result.summary,null,'Partial result summary');
}
function counts(operation,c,result){if(operation==='receive')return {requestedFrames:0,storedFrames:0,completedFrames:0,requestedReceiverRecords:1,completedReceiverRecords:result?1:0,unfinished:result?[]:[{operation:'receive'}]};const all=[];for(let frame=0;frame<c.frames;frame++)for(const normalization of c.normalizations)for(const mode of c.modes)all.push({frame,normalization,mode});const completed=result?.frames.reduce((n,f)=>n+f.records.length,0)??0;return {requestedFrames:c.frames*c.normalizations.length,storedFrames:result?.frames.length??0,completedFrames:result?.frames.filter(f=>f.status==='complete').length??0,requestedReceiverRecords:all.length,completedReceiverRecords:completed,unfinished:all.slice(completed)};}
async function packageText(text){return {text,sha256:await sha256(text),bytes:encoder.encode(text).length};}
async function unpack(p,label){strict(p,['text','sha256','bytes'],label);assert(typeof p.text==='string'&&p.text.length<=MAX_IMPORT_BYTES,'Payload text exceeds import budget');integer(p.bytes,label+' bytes',0,MAX_IMPORT_BYTES);assert(/^[a-f0-9]{64}$/.test(p.sha256),'Invalid SHA-256');assert(p.bytes===encoder.encode(p.text).length,`${label}: byte count mismatch`);assert(await sha256(p.text)===p.sha256,`${label}: SHA-256 mismatch`);jsonPreflight(p.text);const value=decode(p.text);exact(encode(value),p.text,`${label}: noncanonical codec text`);return value;}
function baseChecks(){return {integrity:{status:'passed',detail:'Exact UTF-8 byte counts and SHA-256 match both preserved codec texts; this is not proof of authorship'},structure:{status:'passed',detail:'Strict root/schema/dtype/shape/finite-value/mask/pilot/energy/probability/status/count checks passed'},selfConsistency:{status:'not-run',detail:'Import display does not run a decoder; saved raw draws and complete history remain untrusted'},sameImplementationReplay:{status:'not-run',detail:'Use explicit check to recompute every available field with the frozen implementation'},independentNumericalReplay:{status:'not-run',detail:'Run the independent Python production-record oracle separately; it has not run in this browser'},sourceAuthenticity:{status:'not-run',detail:'Not verified: declared source/runtime hashes and internal checks do not authenticate the file author or runtime source'}};}
export async function createRecord({runId,parentRunId=null,operation,input,result=null,status,reason=null,startedAt,durationMs}){
 const c=normalized(operation,input),snapshot=clone(result);validateResult(operation,c,snapshot,status);
 const record={schema:RECORD_SCHEMA,canonicalPaperId:'otfs-sensing-assisted-2021',runtimePaperId:'paperotfs-sensing-assisted-2021',provenance:{...PROVENANCE},runId,parentRunId,operation,status,reason,startedAt,durationMs,execution:{...EXECUTION},input:await packageText(encode(c)),payload:await packageText(encode(snapshot)),counts:counts(operation,c,snapshot),verificationPolicy:{...POLICY}};
 return parseRecord(JSON.stringify(record,null,2)+'\n');
}
export async function parseRecord(text){
 assert(typeof text==='string'&&text.length<=MAX_IMPORT_BYTES,'Record must be text at most 8 MiB');assert(encoder.encode(text).length<=MAX_IMPORT_BYTES,'Record exceeds 8 MiB UTF-8 budget');jsonPreflight(text);const record=JSON.parse(text);strict(record,ROOT,'record');exact(record.schema,RECORD_SCHEMA,'Record schema');exact(record.canonicalPaperId,'otfs-sensing-assisted-2021','Canonical paper ID');exact(record.runtimePaperId,'paperotfs-sensing-assisted-2021','Frozen runtime paper ID');exact(record.provenance,PROVENANCE,'Declared provenance');exact(record.execution,EXECUTION,'Execution metadata');exact(record.verificationPolicy,POLICY,'Verification policy');assert(isId(record.runId)&&((record.parentRunId===null)||(isId(record.parentRunId)&&record.parentRunId!==record.runId)),'Invalid run or parent ID');assert(['run','receive'].includes(record.operation),'Invalid operation');assert(TERMINALS.includes(record.status),'Invalid terminal status');assert(record.reason===null||(typeof record.reason==='string'&&record.reason.length<=1000),'Invalid terminal reason');assert(typeof record.startedAt==='string'&&record.startedAt.length===24&&Number.isFinite(Date.parse(record.startedAt))&&new Date(record.startedAt).toISOString()===record.startedAt,'Expected canonical UTC timestamp');finite(record.durationMs,'durationMs',0,86400000);const input=await unpack(record.input,'input'),result=await unpack(record.payload,'payload');exact(input,normalized(record.operation,input),'Canonical input');validateResult(record.operation,input,result,record.status);exact(record.counts,counts(record.operation,input,result),'Completion and missing-work counts');return {record:freezeTree(record),text,input:freezeTree(input),result:freezeTree(result),checks:baseChecks()};
}
export async function checkRecord(view){
 const report=baseChecks();let v;
 try{v=await parseRecord(view.text);exact(view.record,v.record,'Selected metadata snapshot');exact(view.result,v.result,'Selected result snapshot');exact(view.input,v.input,'Selected input snapshot');}catch(error){for(const key of ['integrity','structure','selfConsistency','sameImplementationReplay'])report[key]={status:'failed',detail:error.message};return report;}
 if(v.result===null){report.selfConsistency={status:'passed',detail:'No result claimed; zero completed evidence and pending work match'};report.sameImplementationReplay={status:'not-run',detail:'No stored numerical result to compare'};return report;}
 try{
  let matched=false,boundaries=0;
  if(v.record.operation==='receive'){const i=practicalReceiverInput(v.input),r={...sparseSpa(i),estimatedGains:i.estimatedGains,receiverInputPolicy:v.result.receiverInputPolicy};exact(v.result,r,'Full practical receiver replay');matched=true;boundaries=1;}
  else {
   const target=encode(v.result),iter=experimentSteps(v.input);let last=null;
   const matches=partial=>{if(!partial)return false;if((v.result.status==='complete')!==(partial.status==='complete'))return false;return encode({...partial,status:v.result.status})===target;};
   try{while(true){const step=iter.next();if(step.done){boundaries++;matched=matches(step.value);break;}if(step.value.partial)last=step.value.partial;if(step.value.stage!=='spa_iteration'){boundaries++;if(matches(last)){matched=true;break;}}}}catch(error){if(v.record.status!=='complete'&&matches(last))matched=true;else throw error;}
  }
  assert(matched,'Saved raw frames, complete decoder histories, and summaries do not match any genuine runtime prefix');report.selfConsistency={status:'passed',detail:'Every saved scientific field matches a genuine deterministic run/prefix; incomplete work is not invented'};report.sameImplementationReplay={status:'passed',detail:`Frozen same-implementation recomputation matched all retained raw and decoder fields (${boundaries} execution boundaries inspected); this is not independent correctness evidence`};
 }catch(error){report.selfConsistency={status:'failed',detail:error.message};report.sameImplementationReplay={status:'failed',detail:error.message};}
 return report;
}
