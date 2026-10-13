/** Browser/Node Gaussian ISAC Worker runtime and transport client.
 * Accepted-only supersession, held queued completions and lifecycle-epoch fencing
 * adapt the independently reviewed first-party networked-sync-browser-prototype
 * worker/client.js and worker/receiver-worker.js. See that project's
 * networked-sync-port-review/worker-review/WORKER-REVIEW.md for source review.
 * This file is a new ES-module adaptation, and has its own regression suite.
 */
import {snapshot,keys,encodeRecord,isRecord,utf8Length} from './codec.mjs';
export const protocol='gaussian-isac-worker-v1';
export const runtimeLimits=Object.freeze({maxRequests:10000,maxWallMs:120000});
export const validId=id=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(id);
const now=()=>globalThis.performance?.now?.()??Date.now();
const delay=()=>new Promise(resolve=>setTimeout(resolve,0));
const messageOf=e=>String(e?.message??e??'Unknown error').slice(0,1000).replace(/[\uD800-\uDFFF]/g,'?');
const codeOf=(e,fallback)=>typeof e?.code==='string'&&/^[A-Z0-9_-]{1,64}$/.test(e.code)?e.code:fallback;
function error(code,message,id=null){const e=new Error(message);e.name='GaussianWorkerError';e.code=code;e.id=id;return e;}
/** Optional diagnostic metadata can never prevent delivery of the primary error.
 * Inspect own data descriptors only; enforce a small budget before strict clone.
 * 64 KiB conservative bytes, 2,048 nodes, depth 12, 64 object keys/512 array items.
 */
function safeDiagnostics(source){
  try{
    if(source===null||typeof source!=='object')return undefined;
    const descriptor=Object.getOwnPropertyDescriptor(source,'diagnostics');
    if(!descriptor||!('value'in descriptor)||!isRecord(descriptor.value))return undefined;
    let nodes=0,bytes=0;const seen=new Set();
    function inspect(value,depth){
      if(++nodes>2048||depth>12)throw new Error('Diagnostic structure budget');
      if(value===null||typeof value==='boolean'||typeof value==='number')bytes+=32;
      else if(typeof value==='string'){if(value.length>10920)throw new Error('Diagnostic string budget');bytes+=6*utf8Length(value)+16;}
      else if(typeof value==='object'){
        if(seen.has(value))throw new Error('Diagnostic cycle');seen.add(value);
        const array=Array.isArray(value);
        if(array){if(Object.getPrototypeOf(value)!==Array.prototype||Object.getOwnPropertyDescriptor(value,'length').value>512)throw new Error('Diagnostic array budget');}
        else if(!isRecord(value))throw new Error('Diagnostic prototype');
        const names=Reflect.ownKeys(value);if(names.length>(array?513:64))throw new Error('Diagnostic key budget');bytes+=16;
        for(const key of names){
          if(array&&key==='length')continue;
          if(typeof key!=='string'||key.length>128)throw new Error('Diagnostic key');
          const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!('value'in d)||!d.enumerable)throw new Error('Diagnostic accessor');
          bytes+=6*utf8Length(key)+8;inspect(d.value,depth+1);
        }
        seen.delete(value);
      }else throw new Error('Diagnostic value');
      if(bytes>65536)throw new Error('Diagnostic byte budget');
    }
    inspect(descriptor.value,0);return snapshot(descriptor.value);
  }catch{return undefined;}
}
function errorPayload(source,fallback){const payload={code:codeOf(source,fallback),message:messageOf(source)},diagnostics=safeDiagnostics(source);if(diagnostics!==undefined)payload.diagnostics=diagnostics;return payload;}
/** Injectable numerical runtime. validateInput is synchronous and run is async.
 * Checkpoints always yield a MACROTASK before returning, then check cancellation.
 * Wall limits are cooperative checkpoint limits, not hard preemption.
 */
export function createRuntime(send,{run,validateInput,yieldTask=delay,maxWallMs=runtimeLimits.maxWallMs,maxRequests=runtimeLimits.maxRequests}={}){
  if(typeof send!=='function'||typeof run!=='function'||typeof validateInput!=='function'||typeof yieldTask!=='function')throw new TypeError('send, run, validateInput and yieldTask must be functions');
  if(!Number.isFinite(maxWallMs)||maxWallMs<=0||!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>runtimeLimits.maxRequests)throw new TypeError('Invalid runtime limits');
  const used=new Set();let selected=null,executing=null,scheduled=false,dead=false;
  const STOP=Object.freeze({code:'CANCELLED'});
  const emit=e=>{if(!dead)send(snapshot(e));};
  function terminal(job,type,extra={}){if(job.terminal)return;const event=snapshot({type,id:job.id,operation:'run',...extra});job.terminal=true;if(!dead)send(event);}
  function stop(job,type,reason){if(!job||job.terminal)return;if(!job.stop){job.stop=type;job.reason=reason;}if(job!==executing)terminal(job,job.stop,{reason:job.reason});}
  function check(job){if(dead||job.stop||selected!==job)throw STOP;if(now()-job.started>maxWallMs)throw error('TIME_LIMIT','Cooperative Worker wall-time budget exceeded');}
  function progress(job,stage,details={}){
    check(job);
    if(stage&&typeof stage==='object'){details=stage;stage=details.stage??details.phase;}
    if(typeof stage!=='string')return;
    const p={stage:stage.slice(0,128).replace(/[\uD800-\uDFFF]/g,'?')};
    for(const key of ['done','total','iteration','block','kappaIndex'])if(typeof details[key]==='number'&&Number.isFinite(details[key]))p[key]=details[key];
    if(p.done===undefined&&typeof details.completed==='number'&&Number.isFinite(details.completed))p.done=details.completed;
    const t=now();if(job.lastStage===p.stage&&t-job.lastProgress<25&&p.done!==p.total)return;
    job.lastStage=p.stage;job.lastProgress=t;emit({type:'progress',id:job.id,operation:'run',progress:p});
  }
  async function checkpoint(job,stage,details){check(job);await yieldTask();check(job);progress(job,stage,details);}
  function schedule(){if(dead||scheduled||executing||!selected||selected.terminal)return;scheduled=true;setTimeout(()=>{scheduled=false;if(!dead&&!executing&&selected&&!selected.terminal)void execute(selected);},0);}
  async function execute(job){
    executing=job;job.started=now();
    try{
      await checkpoint(job);
      const result=snapshot(await run(job.input,{checkpoint:(s,d)=>checkpoint(job,s,d),progress:(s,d)=>progress(job,s,d)}));
      await checkpoint(job);
      const runRecord=await encodeRecord({input:job.input,result},'history');
      await checkpoint(job);
      terminal(job,'complete',{result:{input:job.input,result,inputHash:runRecord.inputHash,runRecord,freshExecution:true},elapsedMs:now()-job.started});
    }catch(e){
      if(dead||job.stop||e===STOP)terminal(job,job.stop??'cancelled',{reason:job.reason??'runtime-closed'});
      else terminal(job,'error',{rejected:false,error:errorPayload(e,'KERNEL_ERROR')});
    }finally{job.input=null;if(selected===job)selected=null;executing=null;schedule();}
  }
  function reject(id,e){emit({type:'error',id:validId(id)?id:null,rejected:true,error:errorPayload(e,'INVALID_INPUT')});return false;}
  const api={
    receive(raw){
      if(dead)return false;
      let req,id=null;
      try{
        // Descriptor inspection precedes reading even an id from untrusted objects.
        // Preserve a safe own data id when other fields fail validation.
        if(raw!==null&&typeof raw==='object'){const d=Object.getOwnPropertyDescriptor(raw,'id');if(d&&'value'in d&&validId(d.value))id=d.value;}
        keys(raw,['type','id','input','targetId'],['type','id'],'message');
        const message=snapshot(raw);id=message.id;
        if(!validId(id))throw error('INVALID_ID','Request id must be 1..128 safe ASCII characters');
        if(used.has(id))throw error('REUSED_ID','Use a fresh id for every accepted request');
        if(used.size>=maxRequests)throw error('SESSION_LIMIT','Restart Worker after accepted-request budget is exhausted');
        if(message.type==='cancel'){
          keys(message,['type','id','targetId']);if(!validId(message.targetId))throw error('INVALID_ID','Invalid cancellation target');req=message;
        }else if(message.type==='run'){
          keys(message,['type','id','input']);
          // All structural AND semantic validation finishes before supersession.
          const input=snapshot(validateInput(message.input));
          req={type:'run',id,input};
        }else throw error('UNKNOWN_TYPE','Expected run or cancel');
      }catch(e){return reject(id,e);}
      used.add(id);
      if(req.type==='cancel'){
        const cancelled=!!(selected&&selected.id===req.targetId&&!selected.terminal);
        if(cancelled){stop(selected,'cancelled','requested');selected=null;}
        emit({type:'complete',id,operation:'cancel',result:{targetId:req.targetId,cancelled}});return true;
      }
      stop(selected,'superseded','newer-valid-request');
      selected={id,input:req.input,terminal:false,stop:null,reason:null,lastStage:null,lastProgress:-Infinity};
      emit({type:'accepted',id,operation:'run'});schedule();return true;
    },
    close(){if(dead)return;stop(selected,'cancelled','runtime-closed');selected=null;dead=true;},
    get state(){return Object.freeze({dead,currentId:selected?.id??null,executingId:executing?.id??null,acceptedRequests:used.size});}
  };
  emit({type:'ready',ok:true,protocol,limits:{maxRequests,maxWallMs}});return Object.freeze(api);
}
let instances=0;
function optionKeys(value,allowed){if(!isRecord(value))throw error('INVALID_OPTIONS','Options must be an object');for(const k of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,k);if(typeof k!=='string'||!allowed.includes(k)||!d||!('value'in d)||!d.enumerable)throw error('INVALID_OPTIONS','Unknown or accessor option');}}
export class GaussianWorkerClient{
  constructor(worker,options={}){
    optionKeys(options,['onEvent','createWorker']);
    if(options.onEvent!==undefined&&typeof options.onEvent!=='function')throw error('INVALID_OPTIONS','onEvent must be a function');
    if(options.createWorker!==undefined&&typeof options.createWorker!=='function')throw error('INVALID_OPTIONS','createWorker must be a function');
    this.options={...options};this.pending=new Map();this.usedIds=new Set();this.currentId=null;this.counter=0;this.sequence=0;this.disposed=false;this.failed=null;this.generation=0;this.lifecycleEpoch=0;this._attach(worker);
  }
  _attach(worker){
    if(!worker||typeof worker.postMessage!=='function'||(typeof worker.addEventListener!=='function'&&typeof worker.on!=='function'))throw error('INVALID_WORKER','Pass an existing browser or Node Worker');
    if(typeof worker.addEventListener==='function'?typeof worker.removeEventListener!=='function':(typeof worker.off!=='function'&&typeof worker.removeListener!=='function'))throw error('INVALID_WORKER','Worker must support listener removal');
    this.worker=worker;this.prefix='gaussian-'+(++instances)+'-'+Date.now().toString(36);this.readyEvent=null;
    this.ready=new Promise(resolve=>{this._readyResolve=resolve;});const generation=++this.generation;
    this._message=e=>{if(this.generation===generation)this._receive(e.data);};this._nodeMessage=e=>{if(this.generation===generation)this._receive(e);};
    this._error=e=>{if(this.generation===generation)this._fail(error('WORKER_TRANSPORT_ERROR',messageOf(e)));};
    this._exit=code=>{if(this.generation===generation&&!this.disposed)this._fail(error('WORKER_EXITED','Worker exited with code '+code));};
    this.browser=typeof worker.addEventListener==='function';
    if(this.browser){worker.addEventListener('message',this._message);worker.addEventListener('error',this._error);worker.addEventListener('messageerror',this._error);}
    else{worker.on('message',this._nodeMessage);worker.on('error',this._error);worker.on('messageerror',this._error);worker.on('exit',this._exit);}
  }
  _detach(){
    const worker=this.worker;
    if(this.browser){worker.removeEventListener('message',this._message);worker.removeEventListener('error',this._error);worker.removeEventListener('messageerror',this._error);}
    else{const off=typeof worker.off==='function'?worker.off.bind(worker):worker.removeListener.bind(worker);off('message',this._nodeMessage);off('error',this._error);off('messageerror',this._error);off('exit',this._exit);}
    ++this.generation;
  }
  _notify(e){try{this.options.onEvent?.(e);}catch{/* Observers cannot alter lifecycle. */}}
  _accepted(entry){
    if(entry.accepted||!entry.compute)return;entry.accepted=true;
    for(const [id,older]of this.pending)if(older.compute&&older.sequence<entry.sequence){older.superseded=true;if(older.deferred)this._receive({type:'superseded',id,operation:'run',reason:'newer-request-accepted'});}
  }
  _restoreCurrent(){
    let newest=null,newestId=null;
    for(const [id,entry]of this.pending)if(entry.compute&&!entry.superseded&&!entry.cancelReason&&(!newest||entry.sequence>newest.sequence)){newest=entry;newestId=id;}
    this.currentId=newestId;if(newest?.deferred){const e=newest.deferred;newest.deferred=null;this._receive(e);}
  }
  _receive(raw){
    if(this.disposed||this.failed)return;
    let e;try{e=snapshot(raw);}catch(err){this._fail(error('INVALID_WORKER_EVENT',messageOf(err)));return;}
    if(!e||typeof e!=='object')return;
    if(e.type==='ready'){this.readyEvent=e;this._readyResolve(e);this._notify(e);if(!e.ok)this._fail(error('KERNEL_LOAD_FAILED',e.error?.message??'Kernel failed to load'));return;}
    const entry=this.pending.get(e.id);if(!entry)return;
    // A raw duplicate-id rejection must not settle the original accepted run.
    if(e.type==='error'&&e.rejected&&entry.accepted)return;
    const current=!entry.compute||e.id===this.currentId;
    if(e.type==='accepted'||e.type==='progress'){
      this._accepted(entry);if(current&&!entry.cancelReason){if(e.type==='progress'){try{entry.onProgress?.(e.progress);}catch{}}this._notify(e);}return;
    }
    if(!['complete','cancelled','superseded','error'].includes(e.type))return;
    if(e.type==='complete'&&entry.compute)this._accepted(entry);
    if(e.type==='complete'&&entry.compute&&entry.cancelReason)e=snapshot({type:'cancelled',id:e.id,operation:'run',reason:entry.cancelReason,queuedResultSuppressed:true});
    else if(e.type==='complete'&&entry.compute&&entry.superseded)e=snapshot({type:'superseded',id:e.id,operation:'run',reason:'stale-result-suppressed'});
    else if(e.type==='complete'&&entry.compute&&!current){entry.deferred=e;return;}
    this.pending.delete(e.id);if(entry.compute&&current)this.currentId=null;
    if(e.type==='error'){const failure=error(e.error?.code??'WORKER_ERROR',e.error?.message??'Worker error',e.id),diagnostics=safeDiagnostics(e.error);if(diagnostics!==undefined)Object.defineProperty(failure,'diagnostics',{value:diagnostics,enumerable:true});entry.reject(failure);}else entry.resolve(e);
    if(current&&!entry.silent)this._notify(e);
    if(current&&entry.compute&&e.type==='error'&&e.rejected&&!entry.accepted)this._restoreCurrent();
  }
  _fail(e){
    if(this.failed||this.disposed)return;this.failed=e;
    this._readyResolve(snapshot({type:'ready',ok:false,error:{code:e.code,message:e.message}}));
    for(const [id,entry]of this.pending)entry.reject(error(e.code,e.message,id));this.pending.clear();this.currentId=null;
    this._notify(snapshot({type:'dead',error:{code:e.code,message:e.message}}));
  }
  _submit(type,body,options={},silent=false){
    if(this.disposed)throw error('CLIENT_DISPOSED','Client has been disposed');if(this.failed)throw this.failed;
    optionKeys(options,['id','onProgress']);if(options.onProgress!==undefined&&typeof options.onProgress!=='function')throw error('INVALID_OPTIONS','onProgress must be a function');
    const id=options.id===undefined?this.prefix+'-'+(++this.counter):options.id;
    if(!validId(id))throw error('INVALID_ID','Invalid request id');if(this.usedIds.has(id))throw error('REUSED_ID','Use a fresh request id',id);
    if(this.usedIds.size>=runtimeLimits.maxRequests)throw error('SESSION_LIMIT','Restart after 10,000 submitted requests');
    // Preflight before structured clone: getters must never be invoked by posting.
    const payload=snapshot({type,id,...body}),compute=type==='run';let resolve,reject;
    const result=new Promise((ok,bad)=>{resolve=ok;reject=bad;});
    const entry={type,compute,sequence:++this.sequence,accepted:false,superseded:false,deferred:null,resolve,reject,onProgress:options.onProgress,cancelReason:null,silent};
    this.usedIds.add(id);this.pending.set(id,entry);if(compute)this.currentId=id;
    try{this.worker.postMessage(payload);}catch(e){this.pending.delete(id);reject(error('POST_MESSAGE_FAILED',messageOf(e),id));if(compute)this._restoreCurrent();}
    return Object.freeze({id,result,cancel:()=>this.cancel(id)});
  }
  run(input,options){return this._submit('run',{input},options);}
  cancel(id=this.currentId){
    if(this.disposed||this.failed||!id||!this.pending.get(id)?.compute)return false;
    const entry=this.pending.get(id);entry.cancelReason='requested';if(entry.deferred)this._receive({type:'cancelled',id,operation:'run',reason:'requested'});
    try{const action=this._submit('cancel',{targetId:id},{},true),generation=this.generation;action.result.catch(e=>{if(!this.disposed&&this.generation===generation)this._fail(e);});return true;}catch(e){this._fail(e);return false;}
  }
  async dispose(reason='client-disposed'){
    if(typeof reason!=='string'||utf8Length(reason)>128)throw error('INVALID_REASON','Dispose reason must be a well-formed string of at most 128 UTF-8 bytes');
    ++this.lifecycleEpoch;if(this.disposed)return;this.disposed=true;this._detach();
    this._readyResolve(snapshot({type:'ready',ok:false,error:{code:'CLIENT_DISPOSED',message:'Client disposed before readiness'}}));
    for(const [id,entry]of this.pending)entry.resolve(snapshot({type:'cancelled',id,operation:entry.type,reason}));this.pending.clear();this.currentId=null;
    if(typeof this.worker.terminate==='function')await this.worker.terminate();
  }
  async restart(worker){
    if(worker===undefined&&!this.options.createWorker)throw error('WORKER_REQUIRED','Pass a replacement Worker or configure createWorker');
    if(worker!==undefined&&worker===this.worker)throw error('WORKER_REQUIRED','Restart needs a distinct Worker');
    const closing=this.dispose('client-restarted'),epoch=this.lifecycleEpoch;let next;
    if(worker!==undefined)next=worker;
    else{
      await closing;if(epoch!==this.lifecycleEpoch)return this;
      try{next=await this.options.createWorker();}catch(e){if(epoch!==this.lifecycleEpoch)return this;throw e;}
      if(epoch!==this.lifecycleEpoch){if(next&&next!==this.worker&&typeof next.terminate==='function')await next.terminate();return this;}
    }
    if(next===this.worker)throw error('WORKER_REQUIRED','Restart needs a distinct Worker');
    this.usedIds.clear();this.counter=0;this.failed=null;this._attach(next);this.disposed=false;await closing;return this;
  }
}
/** Instantiate the actual module Worker. Browser and Node selection is distinct. */
export async function createWorkerClient(options={}){
  // Validate own data descriptors before spreading options or allocating a
  // transport. Invalid options/getters must neither execute nor leak a Worker.
  optionKeys(options,['onEvent','createWorker']);
  if(options.onEvent!==undefined&&typeof options.onEvent!=='function')throw error('INVALID_OPTIONS','onEvent must be a function');
  if(options.createWorker!==undefined&&typeof options.createWorker!=='function')throw error('INVALID_OPTIONS','createWorker must be a function');
  const ownedOptions={...options};
  const factory=ownedOptions.createWorker??(async()=>{
    if(typeof Worker==='function')return new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
    const {Worker:NodeWorker}=await import('node:worker_threads');return new NodeWorker(new URL('./worker.mjs',import.meta.url),{type:'module'});
  });
  const worker=await factory();
  try{return new GaussianWorkerClient(worker,{...ownedOptions,createWorker:factory});}
  catch(e){if(worker&&typeof worker.terminate==='function'){try{await worker.terminate();}catch{/* Preserve construction failure. */}}throw e;}
}
