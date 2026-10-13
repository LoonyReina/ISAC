/** Portable numerical evidence only. Not a browser download/import UI.
 * One byte ceiling is shared by writer and reader. Imported output is always an
 * unverified claim until replay. Raw receiver x/y remain the authoritative data.
 */
import {SCHEMA_VERSION,KERNEL_VERSION,LIMITS,validateReceiver,inputDigest,canonicalJSON,createGridSearch,KernelError} from './kernel.mjs';
import {object,model,parameters,number} from './validation.mjs';
export const EVIDENCE_SCHEMA='otfs-sensing-evidence-v1';
export const MAX_EVIDENCE_UTF8_BYTES=16*1024*1024;
const invalid=message=>{throw new KernelError('invalid-evidence',message);};
function finiteTree(root){const stack=[[root,0]];while(stack.length){const [v,depth]=stack.pop();if(depth>16)invalid('Evidence nesting exceeds16');if(v===null)continue;if(typeof v==='number'){if(!Number.isFinite(v))invalid('Nonfinite evidence number');continue;}if(typeof v==='string'){if(v.length>2048)invalid('Evidence string exceeds2048 characters');continue;}if(typeof v==='boolean')continue;if(typeof v!=='object')invalid('Unsupported evidence value');if(Array.isArray(v)){if(v.length>LIMITS.maxCandidates)invalid('Evidence array exceeds candidate cap');for(const child of v)stack.push([child,depth+1]);}else{if(Object.keys(v).length>64)invalid('Evidence object has too many fields');for(const [k,child]of Object.entries(v)){if(k.length>80||['__proto__','prototype','constructor'].includes(k))invalid('Unsafe evidence field');stack.push([child,depth+1]);}}}}
function validateResult(result){
  if(!result||typeof result!=='object')invalid('Missing result');finiteTree(result);
  if(result.schemaVersion!==SCHEMA_VERSION||result.kernelVersion!==KERNEL_VERSION)invalid('Unsupported sensing kernel/schema version');
  const receiver=validateReceiver(result.receiver),planned=receiver.gridShape[0]*receiver.gridShape[1];
  if(result.algorithm!=='source-style-exhaustive-grid'||result.knownPathCount!==1||result.model!==receiver.model)invalid('Inconsistent method/model identity');
  if(!Number.isInteger(result.operatorEvaluations)||result.operatorEvaluations<0||result.operatorEvaluations>planned||result.operatorEvaluations>receiver.settings.maxEvaluations||result.plannedCandidates!==planned)invalid('Invalid candidate count or count exceeds declared evaluation budget');
  if(!Array.isArray(result.candidates)||result.candidates.length!==result.operatorEvaluations)invalid('Candidate array length/count mismatch');
  if(!['grid-exhausted','evaluation-cap','time-cap','cancelled','superseded','no-informative-candidate','running'].includes(result.status))invalid('Unsupported result status');
  if(result.globalOnContinuum!==false)invalid('This kernel cannot certify a continuum optimum');
  if(result.globalOnDeclaredGrid===true&&(result.status!=='grid-exhausted'||result.operatorEvaluations!==planned||result.invalidCandidates!==0))invalid('Improper grid-optimum claim');
  for(let j=0;j<result.candidates.length;j++){const c=result.candidates[j];if(c.index!==j||!['computed','uninformative-template'].includes(c.status))invalid('Candidate order/status invalid');}
  return receiver;
}
function cleanEvaluation(raw,frame){if(raw===null)return null;object(raw,'evaluation',['trueDelayBin','trueDopplerBin','trueGain']);parameters(frame,raw.trueDelayBin,raw.trueDopplerBin);object(raw.trueGain,'trueGain',['re','im']);return {trueDelayBin:raw.trueDelayBin,trueDopplerBin:raw.trueDopplerBin,trueGain:{re:number(raw.trueGain.re,-1e6,1e6,'trueGain.re'),im:number(raw.trueGain.im,-1e6,1e6,'trueGain.im')}};}
export async function createEvidence(result,{generationModel,evaluation=null}={}){const receiver=validateResult(result);model(generationModel);return {schema:EVIDENCE_SCHEMA,inputDigest:await inputDigest(receiver),generationModel,evaluation:cleanEvaluation(evaluation,receiver.frame),result:structuredClone(result),provenance:'Reported JavaScript computation; imported records require numerical replay',runtimeBoundary:'Node/JavaScript evidence only; browser download, rendering and UI untested'};}
export function serializeEvidence(record){finiteTree(record);if(record.schema!==EVIDENCE_SCHEMA)invalid('Wrong evidence schema');validateResult(record.result);const text=JSON.stringify(record),bytes=new TextEncoder().encode(text).byteLength;if(bytes>MAX_EVIDENCE_UTF8_BYTES)invalid(`Evidence exceeds shared ${MAX_EVIDENCE_UTF8_BYTES}-byte export/import limit`);return {text,utf8Bytes:bytes};}
export async function parseEvidence(text){
  if(typeof text!=='string')invalid('Evidence must be a JSON string');const bytes=new TextEncoder().encode(text).byteLength;if(bytes>MAX_EVIDENCE_UTF8_BYTES)invalid('Evidence exceeds shared export/import byte limit');
  let record;try{record=JSON.parse(text);}catch{invalid('Malformed JSON');}
  finiteTree(record);object(record,'evidence',['schema','inputDigest','generationModel','evaluation','result','provenance','runtimeBoundary']);if(record.schema!==EVIDENCE_SCHEMA)invalid('Wrong evidence schema');
  const receiver=validateResult(record.result);model(record.generationModel);cleanEvaluation(record.evaluation,receiver.frame);if(record.inputDigest!==await inputDigest(receiver))invalid('Receiver digest mismatch');
  return {status:'unverified-import',utf8Bytes:bytes,record};
}
/** Recompute exactly the stored candidate prefix, independent of original timing
 * cap/cancellation. Timing and historical terminal reason are not authenticated.
 * No imported score, truth or selected point is used to initialize the search.
 */
export function replayEvidence(parsed,{relativeTolerance=2e-10}={}){
  number(relativeTolerance,1e-14,1e-8,'relativeTolerance');if(parsed?.status!=='unverified-import')invalid('Parse before replay');const stored=parsed.record.result,receiver=validateResult(stored),count=stored.operatorEvaluations;
  const replayInput={...receiver,settings:{...receiver.settings,maxEvaluations:Math.max(1,count),maxElapsedMs:LIMITS.maxElapsedMs}};
  const search=createGridSearch(replayInput,{now:()=>0});if(count)while(search.status==='running')search.step();const actual=search.result();
  let comparisons=0,maxScaledError=0;const mismatches=[];
  function compare(a,b,path){if(typeof b==='number'){const scaled=typeof a==='number'?Math.abs(a-b)/(1+Math.abs(b)):Infinity;comparisons++;maxScaledError=Math.max(maxScaledError,scaled);if(scaled>relativeTolerance)mismatches.push(path);return;}if(Array.isArray(b)){if(!Array.isArray(a)||a.length!==b.length){mismatches.push(path);return;}for(let j=0;j<b.length;j++)compare(a[j],b[j],`${path}[${j}]`);return;}if(b!==null&&typeof b==='object'){if(a===null||typeof a!=='object'){mismatches.push(path);return;}if(Object.keys(a).sort().join()!==Object.keys(b).sort().join())mismatches.push(path+'.keys');for(const k of Object.keys(b))compare(a[k],b[k],`${path}.${k}`);return;}if(a!==b)mismatches.push(path);}
  compare(stored.candidates,actual.candidates,'candidates');compare(stored.selected,actual.selected,'selected');compare(stored.grid,actual.grid,'grid');compare(stored.invalidCandidates,actual.invalidCandidates,'invalidCandidates');compare(stored.equalBestScoreCount,actual.equalBestScoreCount,'equalBestScoreCount');
  return {status:mismatches.length?'replay-mismatch':'numerical-prefix-replayed',candidateCount:count,plannedCandidates:stored.plannedCandidates,completeGrid:count===stored.plannedCandidates,comparisons,maxScaledError,mismatches:mismatches.slice(0,32),verifiedScope:'Computed candidate prefix, selected profile inspection, axes and numerical counts only; source provenance/timing/cancellation/generation truth not authenticated',runtimeBoundary:'JavaScript replay; no browser UI'};
}
