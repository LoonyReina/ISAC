import {LIMITS,assert,integer,validateRequest,snapshotJSON} from './records.mjs';
const PROTOCOL='dual-array-worker-v1';
/** One actual Worker per task. Cancellation kills computation, it does not merely ignore output. */
export class WorkerClient {
  constructor({workerFactory=()=>new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'}),onMessage=()=>{},onCallbackError=()=>{},setTimer=setTimeout.bind(globalThis),clearTimer=clearTimeout.bind(globalThis)}={}){
    assert(typeof workerFactory==='function'&&typeof onMessage==='function','client callbacks required');
    this.workerFactory=workerFactory;this.onMessage=onMessage;this.onCallbackError=onCallbackError;this.setTimer=setTimer;this.clearTimer=clearTimer;this._current=null;this._revision=0;this._readToken=0;this._disposed=false;this.lastCallbackError=null;
  }
  get state(){return this._disposed?'disposed':this._current?'running':'idle';}
  get current(){return this._current?Object.freeze({id:this._current.id,revision:this._current.revision}):null;}
  _emit(message){try{this.onMessage(Object.freeze(message));}catch(error){this.lastCallbackError=error;try{this.onCallbackError(error);}catch{/* Observer failures must not corrupt Worker ownership. */}}}
  _cleanup(job){if(job.timer!==null)this.clearTimer(job.timer);job.timer=null;for(const [event,listener]of job.listeners){if(typeof job.worker.removeEventListener==='function')job.worker.removeEventListener(event,listener);else if(typeof job.worker.off==='function')job.worker.off(event,listener);}job.listeners=[];try{const termination=job.worker.terminate();if(termination&&typeof termination.catch==='function')termination.catch(()=>{});}catch{/* Termination attempted even after a platform worker error. */}}
  _settle(job,status,extra={}){if(!job||job.done)return;job.done=true;this._cleanup(job);if(this._current===job)this._current=null;this._emit({protocol:PROTOCOL,kind:'terminal',id:job.id,revision:job.revision,status,...extra});}
  _listen(job,event,listener){job.listeners.push([event,listener]);if(typeof job.worker.addEventListener==='function')job.worker.addEventListener(event,listener);else{assert(typeof job.worker.on==='function','Worker must support message/error events');job.worker.on(event,listener);}}
  start(input,{operation='run',budgetMs=30000}={}){
    assert(!this._disposed,'WorkerClient is disposed');this._readToken++;assert(operation==='run'||operation==='verify','unknown Worker operation');integer(budgetMs,1,LIMITS.maxBudgetMs,'budgetMs');
    // The snapshot is taken synchronously before callbacks, Worker creation or asynchronous reads.
    const owned=operation==='run'?validateRequest(input):snapshotJSON(input);if(operation==='verify')assert(owned.schema==='dual-array-record-v1','record schema required');
    const revision=++this._revision,id=`dual_${revision}`;const worker=this.workerFactory();assert(worker&&typeof worker.postMessage==='function'&&typeof worker.terminate==='function','invalid Worker factory');const job={id,revision,worker,done:false,timer:null,listeners:[]},previous=this._current;this._current=job;
    const message=event=>{if(job.done||this._current!==job||this._disposed)return;const m=(event&&typeof event==='object'&&'data'in event)?event.data:event;if(!m||m.protocol!==PROTOCOL||m.id!==id||m.revision!==revision)return;if(m.kind==='progress'){this._emit(m);return;}if(m.kind!=='terminal')return;const statuses=['completed','absent-estimate','historical-source-verified','error','budget-exceeded'];if(!statuses.includes(m.status)){this._settle(job,'error',{error:'Malformed Worker terminal status'});return;}const {protocol,kind,id:ignoredId,revision:ignoredRevision,status,...rest}=m;this._settle(job,status,rest);};
    const failure=event=>this._settle(job,'error',{error:String(event?.message||'Worker startup or message decoding failed')});
    try{this._listen(job,'message',message);this._listen(job,'error',failure);this._listen(job,'messageerror',failure);job.timer=this.setTimer(()=>this._settle(job,'budget-exceeded',{error:'Worker wall-clock budget exceeded; Worker terminated'}),budgetMs);}
    catch(error){this._settle(job,'error',{error:String(error.message)});if(previous&&!previous.done)this._settle(previous,'superseded');return Object.freeze({id,revision});}
    // Current ownership is assigned before the old terminal callback. A reentrant start wins.
    if(previous)this._settle(previous,'superseded');
    if(this._current===job&&!job.done&&!this._disposed){try{worker.postMessage({protocol:PROTOCOL,kind:'run',id,revision,operation,input:owned,budgetMs});}catch(error){this._settle(job,'error',{error:String(error.message)});}}
    return Object.freeze({id,revision});
  }
  run(input,options){return this.start(input,options);}
  verify(record,options={}){return this.start(record,{...options,operation:'verify'});}
  cancel(){this._readToken++;if(this._current)this._settle(this._current,'cancelled');}
  invalidate(){this.cancel();}
  invalidateImports(){this._readToken++;}
  /** An older file.text() result can never replace a newer selection, start, cancel or disposal. */
  async readRecordFile(file,{budgetMs=30000}={}){assert(!this._disposed,'WorkerClient is disposed');const token=++this._readToken;assert(file&&typeof file.text==='function','readable file required');integer(file.size,0,LIMITS.maxRecordBytes,'file.size');let text;try{text=await file.text();}catch(error){if(token!==this._readToken||this._disposed)return Object.freeze({status:'stale'});throw error;}if(token!==this._readToken||this._disposed)return Object.freeze({status:'stale'});assert(typeof text==='string'&&text.length<=LIMITS.maxRecordBytes&&new TextEncoder().encode(text).byteLength<=LIMITS.maxRecordBytes,'record file byte budget exceeded');const record=snapshotJSON(JSON.parse(text));if(token!==this._readToken||this._disposed)return Object.freeze({status:'stale'});const identity=this.verify(record,{budgetMs});return Object.freeze({status:'started',...identity});}
  dispose(){if(this._disposed)return;this._disposed=true;this._readToken++;if(this._current)this._settle(this._current,'disposed');}
}
