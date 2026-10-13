/** Independently bounded one-run lesson envelope. Imported outputs are claims only.
 * The communication wrapper has its own full structural checks and tests; it
 * does not borrow sensing's parser or pretend that a digest authenticates output.
 */
import {validateReceiver as sensingInput,inputDigest as sensingDigest,canonicalJSON as canonical,SCHEMA_VERSION as sensingSchema,KERNEL_VERSION as sensingVersion} from './sensing/kernel.mjs';
import {createEvidence,MAX_EVIDENCE_UTF8_BYTES} from './sensing/evidence.mjs';
import {validateReceiver as communicationInput,inputDigest as communicationDigest,SCHEMA_VERSION as communicationSchema,KERNEL_VERSION as communicationVersion,INPUT_ENCODING} from './communication/kernel.mjs';
export const MAX_RECORD_UTF8_BYTES=MAX_EVIDENCE_UTF8_BYTES;
export const RECORD_SCHEMA='otfs-lesson-one-run-v1';
export class EvidenceError extends Error {constructor(code,message){super(message);this.name='EvidenceError';this.code=code;}}
const invalid=message=>{throw new EvidenceError('invalid-evidence',message);};
const tooLarge=()=>{throw new EvidenceError('evidence-too-large',`One-run evidence exceeds the symmetric ${MAX_RECORD_UTF8_BYTES}-byte UTF-8 writer/parser limit`);};
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const tasks=['sensing','communication'];
function object(value,allowed,name,required=allowed){if(!value||Object.getPrototypeOf(value)!==Object.prototype)invalid(`${name} must be a plain object`);for(const key of Object.keys(value))if(!allowed.includes(key))invalid(`${name}.${key} is unexpected`);for(const key of required)if(!Object.hasOwn(value,key))invalid(`${name}.${key} is required`);}
function array(value,length,name){if(!Array.isArray(value)||value.length!==length||!Array.from({length},(_,i)=>Object.hasOwn(value,i)).every(Boolean))invalid(`${name} must have ${length} dense entries`);return value;}
function number(value,low,high,name){if(typeof value!=='number'||!Number.isFinite(value)||value<low||value>high)invalid(`${name} must be finite in [${low},${high}]`);return value;}
function integer(value,low,high,name){number(value,low,high,name);if(!Number.isInteger(value))invalid(`${name} must be an integer`);return value;}
function string(value,name){if(typeof value!=='string'||value.length>4096)invalid(`${name} must be a string of at most 4096 characters`);}
function scalar(value,name){object(value,['re','im'],name);number(value.re,-Number.MAX_VALUE,Number.MAX_VALUE,`${name}.re`);number(value.im,-Number.MAX_VALUE,Number.MAX_VALUE,`${name}.im`);}
function vector(value,length,name){array(value,length,name).forEach((v,i)=>scalar(v,`${name}[${i}]`));}
function realVector(value,length,name,low=-Number.MAX_VALUE,high=Number.MAX_VALUE){array(value,length,name).forEach(v=>number(v,low,high,name));}
function finiteTree(root){
  const stack=[[root,0]];let count=0;
  while(stack.length){const [value,depth]=stack.pop();if(depth>18||++count>3000000)invalid('Evidence exceeds depth/node cap');
    if(value===null||typeof value==='boolean'||typeof value==='string')continue;
    if(typeof value==='number'){if(!Number.isFinite(value))invalid('Nonfinite evidence number');continue;}
    if(!value||typeof value!=='object')invalid('Evidence contains a non-JSON value');
    if(Array.isArray(value)){if(value.length>16641)invalid('Evidence array exceeds 16641 entries');if(Object.keys(value).length!==value.length)invalid('Evidence arrays cannot have extra keys or holes');for(let i=0;i<value.length;i++){if(!Object.hasOwn(value,i))invalid('Sparse evidence array');stack.push([value[i],depth+1]);}}
    else {if(Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length>64)invalid('Evidence must use bounded plain objects');for(const [key,child]of Object.entries(value)){if(key.length>80||['__proto__','prototype','constructor'].includes(key))invalid('Unsafe evidence key');stack.push([child,depth+1]);}}
  }
}
/** Testable byte boundary used by BOTH task writers and BOTH task parsers. */
export function encodeBoundedRecord(record){finiteTree(record);const text=JSON.stringify(record),utf8Bytes=new TextEncoder().encode(text).byteLength;if(utf8Bytes>MAX_RECORD_UTF8_BYTES)tooLarge();return {text,utf8Bytes};}
export function decodeBoundedRecord(text){if(typeof text!=='string')invalid('Evidence must be a JSON string');const utf8Bytes=new TextEncoder().encode(text).byteLength;if(utf8Bytes>MAX_RECORD_UTF8_BYTES)tooLarge();let record;try{record=JSON.parse(text);}catch{invalid('Malformed evidence JSON');}finiteTree(record);return {record,utf8Bytes};}
function digestFormat(value){if(typeof value!=='string'||!/^sha256:[0-9a-f]{64}$/.test(value))invalid('Invalid receiver digest');}
function physical(value){object(value,['delayS','dopplerHz','monostaticRangeM','monostaticVelocityMps','velocitySign'],'physical');for(const key of ['delayS','dopplerHz','monostaticRangeM','monostaticVelocityMps'])number(value[key],-Number.MAX_VALUE,Number.MAX_VALUE,key);string(value.velocitySign,'velocitySign');}
const fitKeys=['status','templateEnergy','innerProduct','gain','score','residual','negativeLogLikelihoodUpToConstant','logLikelihood'];
function fit(value,D,{candidate=false,selected=false,inspection=false}={}){
  const prefix=candidate?['index','qIndex','aIndex','delayBin','dopplerBin']:[];
  const extra=selected?['physical','inspection']:inspection?['template','fitted','residualVector']:[];
  const keys=value?.status==='uninformative-template'?['status','templateEnergy','reason'] :fitKeys;
  object(value,[...prefix,...keys,...extra],'sensing fit');
  for(const key of prefix)number(value[key],-Number.MAX_VALUE,Number.MAX_VALUE,key);
  number(value.templateEnergy,0,Number.MAX_VALUE,'templateEnergy');
  if(value.status==='uninformative-template'){string(value.reason,'reason');return;}
  if(value.status!=='computed')invalid('Unsupported sensing candidate status');
  scalar(value.innerProduct,'innerProduct');scalar(value.gain,'gain');
  for(const key of ['score','residual','negativeLogLikelihoodUpToConstant'])number(value[key],0,Number.MAX_VALUE,key);
  number(value.logLikelihood,-Number.MAX_VALUE,Number.MAX_VALUE,'logLikelihood');
  if(selected){physical(value.physical);fit(value.inspection,D,{inspection:true});}
  if(inspection)for(const key of ['template','fitted','residualVector'])vector(value[key],D,key);
}
async function sensingResult(result){
  object(result,['schemaVersion','kernelVersion','taskKind','knownPathCount','algorithm','model','status','receiver','grid','selected','candidates','operatorEvaluations','plannedCandidates','invalidCandidates','equalBestScoreCount','partial','globalOnDeclaredGrid','globalOnContinuum','selectionPolicy','informationStatus','continuousRefinement','localCRB','likelihoodConvention','source','ledger','timing'],'sensing result');
  // The frozen native package validates method identity, limits, counts, and
  // continuum/grid claims. Extra strict shape checks below close its loose fields.
  await createEvidence(result,{generationModel:result.model});
  const r=sensingInput(result.receiver),D=r.frame.N*r.frame.M;
  if(result.taskKind!=='radar')invalid('Wrong sensing task kind');
  const g=result.grid;object(g,['qAxis','aAxis','shape','spacingBins','order','endpoints','resolutionOrigin'],'grid');
  realVector(g.qAxis,r.gridShape[0],'qAxis');realVector(g.aAxis,r.gridShape[1],'aAxis');realVector(g.shape,2,'shape');realVector(g.spacingBins,2,'spacingBins');
  if(canonical(g.shape)!==canonical(r.gridShape))invalid('Grid shape mismatch');
  for(const key of ['order','endpoints','resolutionOrigin'])string(g[key],key);
  result.candidates.forEach((c,i)=>{fit(c,D,{candidate:true});if(c.qIndex!==Math.floor(i/r.gridShape[1])||c.aIndex!==i%r.gridShape[1]||c.delayBin!==g.qAxis[c.qIndex]||c.dopplerBin!==g.aAxis[c.aIndex])invalid('Candidate coordinates/order inconsistent with grid');});
  if(result.selected!==null){if(result.selected.status!=='computed')invalid('Selected candidate must be informative');fit(result.selected,D,{candidate:true,selected:true});integer(result.selected.index,0,result.operatorEvaluations-1,'selected index');}
  integer(result.invalidCandidates,0,result.operatorEvaluations,'invalidCandidates');integer(result.equalBestScoreCount,0,result.operatorEvaluations,'equalBestScoreCount');
  for(const key of ['partial','globalOnDeclaredGrid','globalOnContinuum'])if(typeof result[key]!=='boolean')invalid(`${key} must be Boolean`);
  for(const key of ['selectionPolicy','informationStatus','likelihoodConvention'])string(result[key],key);
  for(const key of ['continuousRefinement','localCRB']){object(result[key],['status','reason'],key);if(result[key].status!=='unavailable')invalid(`${key} must remain unavailable`);string(result[key].reason,'reason');}
  object(result.source,['id','url','coreSha256','locators'],'source');Object.values(result.source).forEach(v=>string(v,'source field'));
  object(result.ledger,['N','M','T','fc','deltaFHz','bandwidthHz','usefulDurationS','sampleCount','vectorOrder','cMps','energyUnits','transmitEnergy','observationEnergy','noiseVariance'],'ledger');
  for(const [key,value]of Object.entries(result.ledger))if(['vectorOrder','energyUnits'].includes(key))string(value,key);else number(value,0,Number.MAX_VALUE,key);
  object(result.timing,['runtime','initializationMs','candidateComputeMs','elapsedMs'],'sensing timing');string(result.timing.runtime,'runtime');for(const key of ['initializationMs','candidateComputeMs','elapsedMs'])number(result.timing[key],0,Number.MAX_VALUE,key);
  return r;
}
function posterior(value,D,Q,name){
  array(value.probabilities,D,`${name} probabilities`);array(value.logProbabilities,D,`${name} logs`);
  for(let d=0;d<D;d++){
    realVector(value.probabilities[d],Q,'probability row',0,1);realVector(value.logProbabilities[d],Q,'log probability row');
    let total=0;for(let q=0;q<Q;q++){total+=value.probabilities[d][q];if(Math.abs(Math.exp(value.logProbabilities[d][q])-value.probabilities[d][q])>1e-9)invalid('Probability/log inconsistency');}
    if(Math.abs(total-1)>1e-8)invalid('Probability row must normalize');
  }
}
function delta(record,iteration){if(record.iteration!==iteration)invalid('History/trace iteration mismatch');number(record.messageDelta,0,1,'messageDelta');number(record.marginalDelta,0,1,'marginalDelta');}
function mpgResult(result,r){
  object(result,['algorithm','status','iterations','probabilities','logProbabilities','trace','history','graph','posteriorInterpretation'],'MP-G result');
  if(result.algorithm!=='mp-g'||!['running','converged','max-iterations'].includes(result.status))invalid('Invalid MP-G identity/status');
  const D=r.y.length,Q=r.constellation.length,n=integer(result.iterations,0,r.settings.maxIterations,'iterations');posterior(result,D,Q,'MP-G');
  const g=result.graph;object(g,['edgeCount','edges','cutoff','removedGramFrobenius','pairwiseScalarTermsPerIteration','G','z','unaryLogProbabilities'],'graph');
  const E=integer(g.edgeCount,0,D*(D-1)/2,'edgeCount');array(g.edges,E,'edges');let previous=-1;
  for(const edge of g.edges){object(edge,['i','j','coefficient'],'edge');integer(edge.i,0,D-1,'edge.i');integer(edge.j,edge.i+1,D-1,'edge.j');if(edge.i*D+edge.j<=previous)invalid('Edges must be strictly sorted');previous=edge.i*D+edge.j;scalar(edge.coefficient,'edge coefficient');}
  for(const key of ['cutoff','removedGramFrobenius'])number(g[key],0,Number.MAX_VALUE,key);
  if(g.pairwiseScalarTermsPerIteration!==2*E*Q*Q)invalid('Pairwise work count mismatch');
  array(g.G,D,'G').forEach(row=>vector(row,D,'Gram row'));vector(g.z,D,'z');array(g.unaryLogProbabilities,D,'unary').forEach(row=>realVector(row,Q,'unary row'));
  array(result.trace,n,'trace').forEach((step,i)=>{object(step,['iteration','messageDelta','marginalDelta'],'trace entry');delta(step,i+1);});
  array(result.history,r.settings.captureHistory?n+1:0,'history').forEach((step,i)=>{
    object(step,['iteration','messageDelta','marginalDelta','probabilities','logProbabilities','incomingLogMessages'],'history entry');delta(step,i);posterior(step,D,Q,'snapshot');
    array(step.incomingLogMessages,2*E,'incoming messages').forEach(row=>realVector(row,Q,'message row'));
  });
  if(result.status==='converged'&&n<1)invalid('Convergence requires a computed iteration');
  if(result.status==='max-iterations'&&n!==r.settings.maxIterations)invalid('Iteration-cap status without exhausted cap');
  if(result.status==='running'&&n>=r.settings.maxIterations)invalid('Running status exceeds iteration cap');
  string(result.posteriorInterpretation,'posteriorInterpretation');
}
function lmmseResult(result,r){
  object(result,['algorithm','status','iterations','probabilities','logProbabilities','effectiveSinr','residualVariance','gain','solveRelativeResidual','choleskyPivotRatio','posteriorInterpretation'],'LMMSE result');
  if(result.algorithm!=='full-lmmse-effective-awgn'||result.status!=='solved'||result.iterations!==1)invalid('Invalid LMMSE identity/status');
  const D=r.y.length;posterior(result,D,r.constellation.length,'LMMSE');
  realVector(result.effectiveSinr,D,'effectiveSinr',0);realVector(result.residualVariance,D,'residualVariance',0);vector(result.gain,D,'gain');
  number(result.solveRelativeResidual,0,1e-6,'solveRelativeResidual');number(result.choleskyPivotRatio,0,1,'choleskyPivotRatio');string(result.posteriorInterpretation,'posteriorInterpretation');
}
function metadata(record,r,task){
  object(record,['generator','evaluation','provenance'],'observation metadata');string(record.provenance,'provenance');const D=r.y.length;
  if(record.generator!==null){const g=record.generator;
    if(task==='sensing'){
      object(g,['version','frame','generationModel','dataSeed','noiseSeed','noiseVariance','dataSeedXor','noiseSeedXor'],'sensing generator');
      if(g.version!=='mulberry32-two-seed-domain-separated-box-muller-v1'||!['eq14_literal','exact_rect_finite'].includes(g.generationModel)||g.dataSeedXor!==0x243f6a88||g.noiseSeedXor!==0x85a308d3)invalid('Unknown sensing generator convention');
      integer(g.dataSeed,0,0xffffffff,'dataSeed');integer(g.noiseSeed,0,0xffffffff,'noiseSeed');
    }else{
      object(g,['version','seed','frame','paths','order','noiseVariance'],'communication generator');
      if(g.version!=='mulberry32-domain-separated-box-muller-v1'||![4,16].includes(g.order))invalid('Unknown communication generator convention');integer(g.seed,0,0xffffffff,'seed');
      if(!Array.isArray(g.paths)||g.paths.length<1||g.paths.length>2)invalid('Expected one/two generator paths');
      g.paths.forEach(p=>{object(p,['delayBin','dopplerBin','gain'],'path');number(p.delayBin,0,r.frame.M,'delayBin');number(p.dopplerBin,-r.frame.N,r.frame.N,'dopplerBin');if(p.delayBin===r.frame.M||Math.abs(p.dopplerBin)===r.frame.N)invalid('Path outside open endpoint domain');scalar(p.gain,'path gain');number(p.gain.re,-4,4,'gain.re');number(p.gain.im,-4,4,'gain.im');});
      if(g.order!==r.constellation.length)invalid('Generator constellation mismatch');
    }
    if(canonical(g.frame)!==canonical(r.frame)||g.noiseVariance!==r.noiseVariance)invalid('Generator/receiver frame or variance mismatch');
  }
  if(record.evaluation!==null){const e=record.evaluation;
    if(task==='sensing'){
      object(e,['generationModel','trueDelayBin','trueDopplerBin','trueGain','noiseless','noiseSamples'],'sensing evaluation');
      if(!['eq14_literal','exact_rect_finite'].includes(e.generationModel)||record.generator&&e.generationModel!==record.generator.generationModel)invalid('Evaluation generation model mismatch');
      number(e.trueDelayBin,0,r.frame.M,'trueDelayBin');number(e.trueDopplerBin,-r.frame.N,r.frame.N,'trueDopplerBin');if(e.trueDelayBin===r.frame.M||Math.abs(e.trueDopplerBin)===r.frame.N)invalid('Truth outside open endpoint domain');scalar(e.trueGain,'trueGain');vector(e.noiseless,D,'noiseless');vector(e.noiseSamples,D,'noiseSamples');
    }else{
      object(e,['truthIndices','bitLabels','transmittedSymbols','noiseSamples'],'communication evaluation');
      const Q=r.constellation.length;array(e.truthIndices,D,'truthIndices').forEach(i=>integer(i,0,Q-1,'truth index'));
      array(e.bitLabels,Q,'bitLabels').forEach(row=>array(row,Math.log2(Q),'bit label').forEach(i=>integer(i,0,1,'bit')));vector(e.transmittedSymbols,D,'transmittedSymbols');vector(e.noiseSamples,D,'noiseSamples');
    }
  }
}
const commonTerminal=['schemaVersion','kernelVersion','type','requestId','inputDigest','status','receiver','error'];
async function terminal(record,r,task,digest){
  const t=record;
  object(t,[...commonTerminal,...(task==='sensing'?['workerWallMs','result']:['inputEncoding','elapsedMs','methods','timing','comparison','partialResult','partial'])],'terminal',['schemaVersion','kernelVersion','type','requestId','inputDigest','status']);
  if(t.schemaVersion!==(task==='sensing'?sensingSchema:communicationSchema)||t.kernelVersion!==(task==='sensing'?sensingVersion:communicationVersion)||t.type!=='terminal')invalid('Unsupported terminal identity');
  if(typeof t.requestId!=='string'||!/^[A-Za-z0-9_.:-]{1,80}$/.test(t.requestId))invalid('Invalid terminal requestId');
  if(!['completed','cancelled','superseded','invalid-input','numerical-failure','internal-error'].includes(t.status))invalid('Unsupported transport status');
  if(t.inputDigest!==null&&t.inputDigest!==digest)invalid('Terminal digest differs from exact input');
  if(t.status==='completed'&&t.inputDigest!==digest)invalid('Completed terminal needs receiver digest');
  if(t.status==='completed'&&t.error)invalid('Completed terminal cannot contain an error');
  const interrupted=['cancelled','superseded'].includes(t.status),failed=['invalid-input','numerical-failure','internal-error'].includes(t.status);
  if(failed&&(!t.error||t.result||t.methods||t.partial))invalid('Failed transport must contain only an error, no method outputs');
  if(t.receiver&&canonical(t.receiver)!==canonical(r))invalid('Terminal receiver mismatch');
  if(t.error){object(t.error,['name','message'],'terminal error',['message']);string(t.error.message,'error message');if(t.error.name!==undefined)string(t.error.name,'error name');}
  if(task==='sensing'){
    if(t.workerWallMs!==undefined)number(t.workerWallMs,0,Number.MAX_VALUE,'workerWallMs');
    if(t.result){const actual=await sensingResult(t.result);if(canonical(actual)!==canonical(r))invalid('Sensing result receiver mismatch');}
    if(t.status==='completed'&&(!t.result||!['grid-exhausted','evaluation-cap','time-cap','no-informative-candidate'].includes(t.result.status)))invalid('Completed sensing method must have a terminal finite-grid status');
    if(interrupted&&t.result&&t.result.status!==t.status)invalid('Interrupted sensing result status mismatch');
  }else{
    if(t.inputEncoding!==INPUT_ENCODING)invalid('Unsupported communication input encoding');
    if(t.elapsedMs!==undefined)number(t.elapsedMs,0,Number.MAX_VALUE,'elapsedMs');
    if(t.methods){object(t.methods,['mpg','lmmse'],'methods');mpgResult(t.methods.mpg,r);lmmseResult(t.methods.lmmse,r);}
    if(t.partial){object(t.partial,['mpg'],'partial');mpgResult(t.partial.mpg,r);}
    if(t.partialResult!==undefined&&typeof t.partialResult!=='boolean')invalid('partialResult must be Boolean');
    if(t.status==='completed'&&(!t.methods||t.partial||t.partialResult!==false||t.methods.mpg.status==='running'))invalid('Completed communication comparison is incomplete');
    if(interrupted&&(t.methods||t.partial&&t.partialResult!==true))invalid('Interrupted communication result cannot be a completed comparison');
    if(t.timing){object(t.timing,['runtime','validationAndDigestMs','mpInitializationMs','mpWithYieldMs','lmmseMs','totalCoreWallMs'],'communication timing');for(const [key,value]of Object.entries(t.timing))if(key==='runtime')string(value,key);else number(value,0,Number.MAX_VALUE,key);}
    if(t.comparison!==undefined)string(t.comparison,'comparison');
  }
}
async function validateRecord(record){
  object(record,['schema','task','inputEncoding','inputDigest','receiver','observation','terminal','importPolicy'],'record');
  if(record.schema!==RECORD_SCHEMA||!tasks.includes(record.task)||record.inputEncoding!==INPUT_ENCODING||record.importPolicy!=='inputs-only; outputs and generation provenance remain unverified')invalid('Unsupported lesson record identity/policy');
  digestFormat(record.inputDigest);
  const r=(record.task==='sensing'?sensingInput:communicationInput)(record.receiver),digest=await(record.task==='sensing'?sensingDigest:communicationDigest)(r);
  if(record.inputDigest!==digest)invalid('Receiver digest mismatch');
  metadata(record.observation,r,record.task);await terminal(record.terminal,r,record.task,digest);return r;
}
async function guarded(action){try{return await action();}catch(error){if(error instanceof EvidenceError)throw error;throw new EvidenceError('invalid-evidence',String(error?.message??error));}}
export async function exportLessonRecord(task,rawTerminal,rawObservation){return guarded(async()=>{
  if(!tasks.includes(task))invalid('Task must be sensing or communication');
  // Check unsupported values and the byte cap before any copying can silently
  // turn Infinity into null or lose holes/undefined fields.
  finiteTree({terminal:rawTerminal,observation:rawObservation});
  object(rawObservation,['schemaVersion','taskKind','receiver','generator','evaluation','provenance'],'observation');
  if(rawObservation.schemaVersion!=='otfs-lesson-observation-v1'||rawObservation.taskKind!==task)invalid('Observation/task mismatch');
  const input=task==='sensing'?sensingInput:communicationInput;
  const receiver=input(rawTerminal?.result?.receiver??rawTerminal?.receiver??rawObservation.receiver);
  const base=input(rawObservation.receiver);
  const sameKeys=task==='sensing'?['frame','x','y','noiseVariance']:['frame','H','y','noiseVariance','constellation','model','csi'];
  for(const key of sameKeys)if(canonical(receiver[key])!==canonical(base[key]))invalid(`Observation ${key} differs from submitted receiver`);
  const record={schema:RECORD_SCHEMA,task,inputEncoding:INPUT_ENCODING,inputDigest:await(task==='sensing'?sensingDigest:communicationDigest)(receiver),receiver,
    observation:{generator:rawObservation.generator,evaluation:rawObservation.evaluation,provenance:rawObservation.provenance},terminal:rawTerminal,
    importPolicy:'inputs-only; outputs and generation provenance remain unverified'};
  const encoded=encodeBoundedRecord(record);await validateRecord(record);return encoded;
});}
export async function importLessonInputs(text){return guarded(async()=>{
  const {record}=decodeBoundedRecord(text),receiver=await validateRecord(record);
  // Do not expose stored estimates/probabilities/history to the current-result
  // gate. Reuse only verified input shapes/digest and start a fresh solve.
  const observation={schemaVersion:'otfs-lesson-observation-v1',taskKind:record.task,receiver,
    generator:record.observation.generator,evaluation:null,provenance:'unverified-import; generator metadata unverified; evaluation omitted; fresh solve required'};
  return freeze({task:record.task,receiver,observation,status:'unverified-import'});
});}
