/** Dependency-free browser/public entry. Only the independently validated finite
 * domain is accepted. Internal low-level model evaluation is not a public API. */
import {evaluateModel,missingBranch,ModelError,METHOD_VERSION,TOLERANCES} from './numerical-kernel.mjs';
import {PROVENANCE} from './provenance.mjs';
export const SCHEMA_VERSION='multipath-position-information.scene.v1';
export const CORE_VERSION='1.0.0-bounded';
export const HEIGHTS=Object.freeze([0,0.01,0.05,0.1,0.25,0.5,1,2,4,6]);
export const PHASES=Object.freeze([0,0.3,Math.PI/2,Math.PI]);
export const DEFAULT_INPUT=Object.freeze({heightM:0.5,phaseRad:0.3,noiseMode:'white'});
export const SOURCE=Object.freeze({
  title:'Evaluation of Position-related Information in Multipath Components for Indoor Positioning',
  id:'arXiv:1409.1467v2',format:'PDF',url:'https://arxiv.org/pdf/1409.1467v2',
  sha256:'9fbf11a7043424d15bbcc030532ac196e29b3a9ea1c5a738fc59b497c734195f',
  locators:[{page:3,equations:['7','8–12'],topic:'proper-complex likelihood, sampled covariance and full FIM'},
    {page:4,equations:['17','following unnumbered Schur expression'],topic:'PEB and nuisance elimination'},
    {page:5,equations:['22'],topic:'one-way geometry derivative'},
    {page:6,equations:['28','29'],topic:'synchronized EFIM and nonoverlap approximation'}],
  htmlLocatorWarning:'Corresponding HTML EFIM equations are 36/37; do not label them PDF equations',
});
const now=()=>globalThis.performance?.now?.()??Date.now();
const copyJson=value=>JSON.parse(JSON.stringify(value));
const nextTask=()=>new Promise(resolve=>setTimeout(resolve,0));
export function validateInput(input) {
  const errors=[];
  if(!input||typeof input!=='object'||Array.isArray(input))return ['Input must be an object with heightM, phaseRad and noiseMode'];
  for(const key of Object.keys(input))if(!['heightM','phaseRad','noiseMode'].includes(key))errors.push(`Unsupported field: ${key}`);
  if(typeof input.heightM!=='number'||!HEIGHTS.includes(input.heightM))errors.push('heightM must be exactly one of 0, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 4, 6');
  if(typeof input.phaseRad!=='number'||!PHASES.includes(input.phaseRad))errors.push('phaseRad must be exactly 0, 0.3, Math.PI/2 or Math.PI radians');
  if(!['white','colored'].includes(input.noiseMode))errors.push('noiseMode must be white or colored');
  return errors;
}
export function buildPreset(input) {
  const errors=validateInput(input);
  if(errors.length)throw new ModelError('invalid-input',errors.join('; '));
  const times=Array.from({length:193},(_,i)=>i*0.25);
  const pdp=times.map(t=>input.noiseMode==='colored'&&t>17?0.1*Math.exp(-(t-17)/8):0);
  return {times,pdp,dt:0.25,n0:0.01,rolloff:0.6,tp:1,position:[6,input.heightM],anchors:[[0,2],[0,-2]],
    gains:[[1,0],[0.7*Math.cos(input.phaseRad),0.7*Math.sin(input.phaseRad)]]};
}
function safeInput(value, seen=new WeakSet()) {
  if(typeof value==='number')return Number.isFinite(value)?value:{invalidNumber:String(value)};
  if(value===undefined)return {invalidType:'undefined'};
  if(typeof value==='function'||typeof value==='symbol'||typeof value==='bigint')return {invalidType:typeof value};
  if(value===null||typeof value!=='object')return value;
  if(seen.has(value))return {invalidType:'circular-reference'};
  seen.add(value);
  if(Array.isArray(value))return value.map(x=>safeInput(x,seen));
  return Object.fromEntries(Object.keys(value).sort().map(k=>[k,safeInput(value[k],seen)]));
}
function baseRecord(input,requestId) {
  return {schemaVersion:SCHEMA_VERSION,coreVersion:CORE_VERSION,methodVersion:METHOD_VERSION,
    provenance:{...copyJson(PROVENANCE),source:copyJson(SOURCE)},
    recordId:String(requestId??'scene'),input:safeInput(input),validatedDomain:false,
    units:{time:'ns',distance:'m',delayJacobian:'ns/m',positionInformation:'m^-2',peb:'m',frequency:'ns^-1',noise:'declared ns-normalized proper-complex convention'},
    resource:{paths:2,physicalAnchors:1,reflections:1,rolloff:0.6,pulseDurationNs:1,fullLinePulseEnergy:1,
      timeGrid:{startNs:0,endNs:48,spacingNs:0.25,samples:193,endpointIncluded:true},N0:0.01,whiteVarianceN0OverTs:0.04,
      pdpRule:input?.noiseMode==='colored'?'q[i]=0 for t[i]<=17 ns; 0.1 exp(-(t[i]-17)/8) otherwise':'q[i]=0',
      pdpInterpolationForApproximation:'linear in the actual supplied sample grid',
      trueGainRule:'alpha1=1, alpha2=0.7 exp(i phaseRad)',gainKnowledge:'unknown independent complex gains',clockKnowledge:'known synchronized clock',
      covariancePositionDerivative:'omitted: locally fixed observed-domain covariance',normalization:'unit full-line pulse energy; no per-scene or per-delay normalization'},
    limits:['Both x and y are unknown; (6,h) only specifies the true scene',
      'Known single wall and associated paths; synthetic conditional gains and PDP',
      'Covariance/PDP locally fixed; noise and PDP estimation uncertainty omitted',
      'Conditional local finite-sample CRLB, not a localization receiver or measured accuracy',
      'Not source Figures 3–5, original room geometry, or full-paper acceptance',
      'Source approximation also uses local-PDP stationarity and an infinite pulse window',
      'Height sweep changes geometry and delay overlap together; phase intervention keeps geometry fixed'],
    tolerances:{...TOLERANCES},status:'pending',reason:null,geometry:null,samples:null,covariance:null,fisher:null,
    exact:missingBranch('pending',null),approximate:missingBranch('not-computed',null),knownGain:missingBranch('not-computed',null),unknownClock:missingBranch('not-computed',null),
    timing:{elapsedComputeMs:null,environment:'caller runtime',browserPaintMeasured:false},lastCompletedStage:null};
}
function finish(rec,start) {rec.timing.elapsedComputeMs=now()-start;return rec;}
function fail(rec,error,start) {
  const status=error instanceof ModelError?error.status:'numerical-failure';
  const reason=error instanceof ModelError?error.reason:'unexpected-numerical-exception';
  rec.status=status;rec.reason=reason;rec.exact=missingBranch(status,reason);
  rec.failureDiagnostics=error instanceof ModelError?error.diagnostics:null;
  return finish(rec,start);
}
function cancelled(rec,start,reason='request-cancelled') {
  rec.status='cancelled';rec.reason=reason;rec.exact=missingBranch('cancelled',reason);
  rec.approximate=missingBranch('cancelled',reason);rec.knownGain=missingBranch('cancelled',reason);rec.unknownClock=missingBranch('cancelled',reason);
  return finish(rec,start);
}
function adopt(rec,result,start) {
  Object.assign(rec,result);rec.status=rec.exact.status;rec.reason=rec.exact.reason;
  rec.lastCompletedStage='complete';return finish(rec,start);
}
/** Synchronous utility for numerical tests or use inside an owned Worker. */
export function computeScene(input=DEFAULT_INPUT,{requestId='scene',shouldCancel=()=>false}={}) {
  const start=now(),rec=baseRecord(input,requestId);
  try {
    const model=buildPreset(input);rec.validatedDomain=true;
    if(shouldCancel())return cancelled(rec,start);
    const gen=evaluateModel(model);let step=gen.next();
    while(!step.done){rec.lastCompletedStage=step.value.stage;if(shouldCancel())return cancelled(rec,start);step=gen.next();}
    return adopt(rec,step.value,start);
  }catch(error){return fail(rec,error,start);}
}
/** Yields during covariance and Cholesky stages. Abort/replacement is observed at
 * stage checkpoints, not through a stale result after the entire sweep. */
export async function computeSceneAsync(input=DEFAULT_INPUT,{requestId='scene',signal,shouldCancel=()=>false,yieldTask=nextTask,onProgress=()=>{}}={}) {
  const start=now(),rec=baseRecord(input,requestId),isCancelled=()=>signal?.aborted||shouldCancel();
  try {
    const model=buildPreset(input);rec.validatedDomain=true;
    if(isCancelled())return cancelled(rec,start);
    const gen=evaluateModel(model);let step=gen.next();
    while(!step.done) {
      rec.lastCompletedStage=step.value.stage;onProgress({requestId:rec.recordId,...step.value});
      if(isCancelled())return cancelled(rec,start);
      await yieldTask();if(isCancelled())return cancelled(rec,start);
      step=gen.next();
    }
    if(isCancelled())return cancelled(rec,start);
    return adopt(rec,step.value,start);
  }catch(error){return fail(rec,error,start);}
}
export async function computeSweep(input=DEFAULT_INPUT,{requestId='sweep',signal,shouldCancel=()=>false,yieldTask=nextTask,onProgress=()=>{}}={}) {
  const started=now(),records=[];
  const inputErrors=validateInput(input);
  for(let i=0;i<HEIGHTS.length;i++) {
    const sceneInput=input&&typeof input==='object'?{...input,heightM:HEIGHTS[i]}:input;
    const id=`${requestId}:${i}`;
    let rec;
    if(inputErrors.length)rec=fail(baseRecord(sceneInput,id),new ModelError('invalid-input',inputErrors.join('; ')),now());
    else if(signal?.aborted||shouldCancel())rec=cancelled(baseRecord(sceneInput,id),now(),'not-attempted-after-cancellation');
    else rec=await computeSceneAsync(sceneInput,{requestId:id,signal,shouldCancel,yieldTask});
    rec.sweepIndex=i;rec.sweepHeightM=HEIGHTS[i];
    records.push(rec);onProgress({requestId,completed:records.filter(r=>r.status!=='cancelled').length,total:HEIGHTS.length,index:i,record:rec});
  }
  const partial=records.some(r=>r.status==='cancelled');
  return {schemaVersion:'multipath-position-information.sweep.v1',coreVersion:CORE_VERSION,methodVersion:METHOD_VERSION,provenance:{...copyJson(PROVENANCE),source:copyJson(SOURCE)},
    recordId:String(requestId),input:safeInput(input),heightsM:[...HEIGHTS],status:inputErrors.length?'invalid-input':partial?'cancelled':'complete',
    partial,completed:records.filter(r=>r.status!=='cancelled').length,total:HEIGHTS.length,records,timing:{elapsedComputeMs:now()-started,browserPaintMeasured:false}};
}
/** Stable key ordering; refuses nonfinite numeric outputs instead of silently
 * converting them into apparent zero/null scientific results. */
export function exportRecord(record) {
  function canonical(value) {
    if(typeof value==='number'&&!Number.isFinite(value))throw new TypeError('Cannot export nonfinite scientific values');
    if(Array.isArray(value))return value.map(canonical);
    if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
    return value;
  }
  return JSON.stringify(canonical(record),null,2)+'\n';
}
function verifyReplay(record) {
  if(!record||![SCHEMA_VERSION,'multipath-position-information.sweep.v1'].includes(record.schemaVersion))throw new ModelError('invalid-input','unsupported-replay-schema');
  if(record.coreVersion!==CORE_VERSION||record.methodVersion!==METHOD_VERSION||exportRecord(record.provenance)!==exportRecord({...PROVENANCE,source:SOURCE}))throw new ModelError('invalid-input','unsupported-replay-version-or-provenance');
  const errors=validateInput(record.input);if(errors.length)throw new ModelError('invalid-input',errors.join('; '));
  if(record.schemaVersion.endsWith('sweep.v1')) {
    if(JSON.stringify(record.heightsM)!==JSON.stringify(HEIGHTS)||!Array.isArray(record.records)||record.records.length!==HEIGHTS.length)throw new ModelError('invalid-input','unsupported-replay-sweep-grid');
    record.records.forEach((scene,i)=>{
      verifyReplay(scene);
      if(scene.schemaVersion!==SCHEMA_VERSION||scene.input.heightM!==HEIGHTS[i]||scene.input.phaseRad!==record.input.phaseRad||scene.input.noiseMode!==record.input.noiseMode)throw new ModelError('invalid-input','inconsistent-replay-sweep-point');
    });
  } else if(exportRecord(record.resource)!==exportRecord(baseRecord(record.input,'resource-validation').resource))throw new ModelError('invalid-input','unsupported-replay-resource-settings');
}
export async function replayRecord(recordOrJson,options={}) {
  let source;
  try {source=typeof recordOrJson==='string'?JSON.parse(recordOrJson):recordOrJson;verifyReplay(source);}
  catch(error){return fail(baseRecord(source?.input,options.requestId??'replay'),error instanceof ModelError?error:new ModelError('invalid-input',error instanceof SyntaxError?'malformed-replay-JSON':'invalid-replay-document'),now());}
  const requestId=options.requestId??`${source.recordId}:replay`;
  // Saved matrices/PEB are never trusted: every accepted replay recomputes inputs.
  const result=source.schemaVersion.endsWith('sweep.v1')?await computeSweep(source.input,{...options,requestId}):await computeSceneAsync(source.input,{...options,requestId});
  result.replayOf=source.recordId;return result;
}
/** Optional local UI controller. Invalidation is synchronous. A superseded request
 * still returns its cancelled receipt to its caller, but cannot publish a result. */
export function createLatestRunner({onInvalidate=()=>{},onResult=()=>{},onProgress=()=>{}}={}) {
  let generation=0,active=null;
  const start=async(kind,input)=>{
    active?.abort();const token=++generation;active=new AbortController();
    const signal=active.signal,requestId=`mpi-${token}`;
    onInvalidate({requestId,input:safeInput(input),status:'pending',clearOldMetrics:true,disableOldExport:true});
    const run=kind==='sweep'?computeSweep:computeSceneAsync;
    const record=await run(input,{requestId,signal,shouldCancel:()=>token!==generation,
      onProgress:p=>{if(token===generation&&!signal.aborted)onProgress(p);}});
    if(token===generation&&!signal.aborted)onResult(record);
    return record;
  };
  return {startScene:input=>start('scene',input),startSweep:input=>start('sweep',input),
    cancel:()=>{active?.abort();generation++;onInvalidate({status:'cancelled',clearOldMetrics:true,disableOldExport:true});},
    dispose:()=>{active?.abort();generation++;}};
}
