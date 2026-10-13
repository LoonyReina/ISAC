/* ES module Worker. Lifecycle fencing pattern adapted from accepted sibling
 * 80211ad Worker; all scientific code is specific to this 2021 interpretation. */
import {validId,validateRequest,LIMITS} from './protocol.js';
import {experimentSteps} from '../js/evaluation.js';
import {practicalReceiverInput,sparseSpaSteps} from '../js/receiver.js';
import {encode,sha256} from '../js/codec.js';
const node=typeof process==='object'&&Boolean(process.versions?.node);
const port=node?(await import('node:worker_threads')).parentPort:null;
if(node&&!port)throw new Error('Must run in a Worker thread');
const send=x=>node?port.postMessage(x):self.postMessage(x);
const listen=f=>node?port.on('message',f):self.addEventListener('message',e=>f(e.data));
let selected=null,executing=null,scheduled=false,held=null;const ids=new Set(),STOP={};
const now=()=>performance.now();
function terminal(t,type,extras={}){if(t.terminal)return;send({type,id:t.id,operation:t.type,...extras});t.terminal=true;}
function stop(t,type,reason){if(!t||t.terminal)return;if(!t.stop){t.stop=type;t.reason=reason;}if(t!==executing)terminal(t,t.stop,{reason:t.reason,partial:t.partial});}
function check(t){if(t.stop||selected!==t)throw STOP;if(now()-t.started>LIMITS.maxWallMs){const e=new Error('30-second Worker wall budget exceeded');e.code='TIME_LIMIT';throw e;}}
async function checkpoint(t){check(t);await new Promise(resolve=>setTimeout(resolve,0));check(t);}
function schedule(){if(scheduled||executing||!selected||selected.terminal)return;scheduled=true;setTimeout(()=>{scheduled=false;if(!executing&&selected&&!selected.terminal)execute(selected);},0);}
async function execute(t){executing=t;t.started=now();try{
 await checkpoint(t);
 if(t.type==='export'){const text=encode(held.result),digest=await sha256(text);await checkpoint(t);terminal(t,'complete',{result:{schema:'sensing-otfs-export-v1',resultId:held.id,sha256:digest,bytes:new TextEncoder().encode(text).length,text}});}
 else {
  const practical=t.type==='receive'?practicalReceiverInput(t.request.input):null,iterator=t.type==='run'?experimentSteps(t.request.config):sparseSpaSteps(practical);let item;
  do {item=iterator.next();if(!item.done){const {partial,...progress}=item.value;if(partial)t.partial=partial;const time=now(),boundary=progress.stage!=='spa_iteration';if(boundary||time-t.lastProgress>25){send({type:'progress',id:t.id,operation:t.type,progress,...(boundary&&t.partial?{partial:t.partial}:{})});t.lastProgress=time;}await checkpoint(t);}}while(!item.done);
  let result=item.value;if(practical)result={...result,estimatedGains:practical.estimatedGains,receiverInputPolicy:'raw y + predicted support/pilot/statistical powers only'};
  await checkpoint(t);held={id:t.id,result};terminal(t,'complete',{result});
 }
 }catch(e){if(t.partial){t.partial.status=t.stop??'failed';if(t.reason!=='released')held={id:t.id,result:t.partial};}if(t.stop||e===STOP)terminal(t,t.stop??'superseded',{reason:t.reason??'newer-request',partial:t.partial});else terminal(t,'error',{partial:t.partial,error:{code:e?.code??'KERNEL_ERROR',message:String(e?.message??e).slice(0,1000)}});}
 finally{t.request=null;if(selected===t)selected=null;executing=null;schedule();}}
function reject(x,code,message){send({type:'error',id:validId(x?.id)?x.id:null,rejected:true,error:{code,message}});}
listen(x=>{let req;try{
 if(validId(x?.id)&&ids.has(x.id))return reject(x,'REUSED_ID','Use a fresh id; accepted ids cannot be reused');
 if(ids.size>=LIMITS.maxRequests)return reject(x,'SESSION_LIMIT','Restart after 10,000 accepted requests');
 req=validateRequest(x,held);if(req.type==='export'&&(selected||executing))return reject(x,'WORKER_BUSY','Export requires an idle Worker');
 }catch(e){return reject(x,e.code??'INVALID_INPUT',String(e.message??e).slice(0,1000));}
 ids.add(req.id);
 if(req.type==='cancel'){const cancelled=Boolean(selected&&selected.id===req.targetId&&!selected.terminal);if(cancelled){stop(selected,'cancelled','requested');selected=null;}return send({type:'complete',id:req.id,operation:'cancel',result:{targetId:req.targetId,cancelled}});}
 if(req.type==='release'){const resultId=held?.id??null;stop(selected,'cancelled','released');selected=null;held=null;return send({type:'complete',id:req.id,operation:'release',result:{releasedResultId:resultId}});}
 stop(selected,'superseded','newer-request-accepted');selected={id:req.id,type:req.type,request:req,partial:null,terminal:false,stop:null,lastProgress:-Infinity};send({type:'accepted',id:req.id,operation:req.type});schedule();
});
send({type:'ready',ok:true,protocol:'sensing-otfs-module-worker-v1',limits:LIMITS});
