/* Classic browser Worker / actual Node worker_threads transport.
 * Scheduling and cancellation fencing adapted from first-party
 * 80211ad-browser-prototype/worker/receiver-worker.js. Numerical core is new.
 * No network, fixtures, UI, or truth-assisted receiver inputs. */
(function(){
'use strict';
const node=typeof process==='object'&&process.versions&&process.versions.node&&typeof require==='function';
const port=node?require('node:worker_threads').parentPort:null;
if(node&&!port)throw new Error('Run receiver-worker.js in a Worker');
const send=node?x=>port.postMessage(x):x=>self.postMessage(x);
const listen=node?f=>port.on('message',f):f=>self.addEventListener('message',e=>f(e.data));
let kernel,codec,protocol,loadError,held=null,selected=null,executing=null,scheduled=false,submissionSequence=0,lastAcceptedSequence=0;
const ids=new Set(),pendingValidation=new Set(),STOP={name:'AbortError',code:'CANCELLED'};
const now=typeof performance==='object'&&typeof performance.now==='function'?()=>performance.now():Date.now;
const detail=e=>String(e&&e.message||e||'Unknown error').slice(0,1000);
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(id);
function reject(message,code,text){send({type:'error',id:message&&validId(message.id)?message.id:null,rejected:true,error:{code,message:text}});}
function terminal(token,type,extra){if(token.terminal)return;send(Object.assign({type,id:token.id,operation:token.type},extra||{}));token.terminal=true;}
function stop(token,type,reason){if(!token||token.terminal)return;if(!token.stopReason){token.stopReason=type;token.stopDetail=reason;}if(token!==executing){terminal(token,type,{reason});token.request=null;token.snapshot=null;}}
function check(token){if(token.stopReason||selected!==token)throw STOP;if(now()-token.started>protocol.limits.maxWallMs){const e=new Error('Worker wall-time budget exceeded');e.code='TIME_LIMIT';throw e;}}
function progress(token,stage,details){
  check(token);if(typeof stage!=='string')return;const t=now(),d=details&&typeof details==='object'?details:{};
  if(stage!==token.lastStage||t-token.lastProgress>=25||(Number.isFinite(d.done)&&d.done===d.total)){
    token.lastStage=stage;token.lastProgress=t;
    // Only finite simple progress metadata crosses this channel, never numerical traces.
    const p={stage:stage.slice(0,128)};for(const k of ['done','total','link','iteration','axis'])if(typeof d[k]==='number'&&Number.isFinite(d[k]))p[k]=d[k];
    if(typeof d.method==='string')p.method=d.method.slice(0,64);if(typeof d.success==='boolean')p.success=d.success;
    send({type:'progress',id:token.id,operation:token.type,progress:p});
  }
}
async function checkpoint(token,stage,details){check(token);await new Promise(resolve=>setTimeout(resolve,0));check(token);progress(token,stage,details);}
function schedule(){if(scheduled||executing||!selected||selected.terminal)return;scheduled=true;setTimeout(()=>{scheduled=false;if(!executing&&selected&&!selected.terminal)execute(selected);},0);}
function metadata(entry){return {observationId:entry.id,config:entry.config,shape:entry.observation.shape,identity:entry.identity,origin:entry.origin,freshExecution:false};}
async function execute(token){
  executing=token;token.started=now();
  try{
    await checkpoint(token);
    const req=token.request,hooks={checkpoint:(stage,d)=>checkpoint(token,stage,d),progress:(stage,d)=>{if(stage&&typeof stage==='object')progress(token,stage.stage,stage);else progress(token,stage,d);}};
    let output,entry;
    if(req.type==='run'||req.type==='process'){
      const result=await kernel.run(req.request,hooks);await checkpoint(token);
      if(!result||!result.observation)throw new Error('Receiver result must include raw observation');
      codec.validateObservation(result.observation);
      const config=result.config||req.request.config;
      const identity=await codec.identity(config,result.observation,hooks);await checkpoint(token);
      const observationId=req.type==='process'?req.observationId:token.id;
      entry={id:observationId,config,observation:result.observation,identity,origin:req.request.operation==='generate'?'fresh-generated-observation':'held-observation',result};
      held=entry;output={observationId,identity,origin:entry.origin,freshExecution:true,result};
    }else if(req.type==='import'){
      const record=req.record;await checkpoint(token,'import-record',{done:1,total:1});
      entry={id:token.id,config:record.config,observation:record.observation,identity:record.identity,origin:'imported-observation',result:record.mode==='history'?record.historical.result:null};
      held=entry;output=Object.assign(metadata(entry),{mode:record.mode,label:record.mode==='history'?codec.historicalLabel:'raw-import-not-fresh-execution'});
      if(record.mode==='history')output.historical=record.historical;
    }else if(req.type==='export'){
      const snapshot=token.snapshot;
      // Clone a stored result to avoid accidental aliasing with its observation in
      // the exported tree, and strip its redundant raw tensor copy from history.
      const input={config:snapshot.config,observation:snapshot.observation};
      if(req.mode==='history'){const copy=JSON.parse(codec.canonicalStringify(snapshot.result));delete copy.observation;input.result=copy;}
      output=await codec.encodeRecord(input,req.mode,hooks);await checkpoint(token);
    }
    terminal(token,'complete',{result:output});
  }catch(e){if(token.stopReason||e===STOP)terminal(token,token.stopReason||'superseded',{reason:token.stopDetail||'newer-request'});else terminal(token,'error',{error:{code:e&&e.code||'KERNEL_ERROR',message:detail(e)}});}
  finally{token.request=null;token.snapshot=null;if(selected===token)selected=null;executing=null;schedule();}
}
async function handle(message){
  if(loadError)return reject(message,'KERNEL_LOAD_FAILED',loadError);
  let req,reservedId=null;const sequence=++submissionSequence;
  try{
    if(message&&validId(message.id)&&(ids.has(message.id)||pendingValidation.has(message.id)))return reject(message,'REUSED_ID','Use a fresh id for every request');
    if(ids.size+pendingValidation.size>=protocol.limits.maxRequests)return reject(message,'SESSION_LIMIT','Restart after 10,000 accepted requests');
    req=protocol.validateRequest(message,kernel,held);
    if(req.type==='export'&&(selected||executing))return reject(message,'WORKER_BUSY','Export requires an idle Worker');
    if(req.type==='import'){
      // All hash and receiver validation precedes acceptance. No invalid imported
      // record can cancel a running receiver or invalidate its held observation.
      reservedId=req.id;pendingValidation.add(req.id);req.record=await codec.decodeRecord(req.record);pendingValidation.delete(req.id);
    }
  }catch(e){if(reservedId)pendingValidation.delete(reservedId);return reject(message,e&&e.code||'INVALID_INPUT',detail(e));}
  if(sequence<lastAcceptedSequence)return reject(message,'STALE_VALIDATION','A newer request was accepted during validation');
  ids.add(req.id);lastAcceptedSequence=sequence;
  if(req.type==='cancel'){
    const cancelled=Boolean(selected&&selected.id===req.targetId&&!selected.terminal);
    if(cancelled){stop(selected,'cancelled','requested');selected=null;}
    return send({type:'complete',id:req.id,operation:'cancel',result:{targetId:req.targetId,cancelled}});
  }
  if(req.type==='release'){
    const releasedObservationId=held?held.id:null;stop(selected,'cancelled','released');selected=null;held=null;
    return send({type:'complete',id:req.id,operation:'release',result:{releasedObservationId}});
  }
  stop(selected,'superseded','newer-request');
  // Preserve old raw state until a replacement completes; failed/cancelled work
  // cannot accidentally make an uncomputed snapshot look fresh.
  selected={id:req.id,type:req.type,request:req,snapshot:req.type==='export'?held:null,terminal:false,stopReason:null,lastStage:null,lastProgress:-Infinity};
  send({type:'accepted',id:req.id,operation:req.type});schedule();
}
listen(handle);
try{
  if(node){codec=require('../js/codec.js');protocol=require('./protocol.js');kernel=require('../js/receiver.js');}
  else{importScripts('../js/sha256.js','../js/codec.js','./protocol.js','../js/linalg.js','../js/receiver.js');codec=self.NetworkedSyncCodec;protocol=self.NetworkedSyncWorkerProtocol;kernel=self.NetworkedSync;}
  for(const name of ['validateRequest','run'])if(!kernel||typeof kernel[name]!=='function')throw new Error('NetworkedSync.'+name+' missing');
}catch(e){loadError=detail(e);}
send({type:'ready',ok:!loadError,protocol:'networked-sync-worker-v1',limits:protocol?protocol.limits:null,error:loadError?{code:'KERNEL_LOAD_FAILED',message:loadError}:null});
}());
