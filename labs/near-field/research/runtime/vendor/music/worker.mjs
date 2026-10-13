/** One active job per worker; transferable Y buffer; cooperative cancel messages.
 * Browser module worker and Node worker_threads use the same receiver source.
 */
import {receiveMusic,receivePlaneWave} from './receiver.mjs';
let send,listen;
if(typeof globalThis.postMessage==='function'){send=(m,t)=>postMessage(m,t);listen=f=>{globalThis.onmessage=e=>f(e.data);};}
else{const {parentPort}=await import('node:worker_threads');send=(m,t)=>parentPort.postMessage(m,t);listen=f=>parentPort.on('message',f);}
let active=null;
listen(async message=>{const {id,type}=message??{};if(type==='cancel'){if(active?.id===id)active.cancelled=true;return;}if(type!=='receive'&&type!=='plane'){send({id,type:'error',error:'Unsupported worker message'});return;}if(active){send({id,type:'error',error:'Worker busy; cancel or wait for current job'});return;}if(typeof id!=='string'||!id){send({id,type:'error',error:'Nonempty string job id required'});return;}const job={id,cancelled:false};active=job;try{const fn=type==='plane'?receivePlaneWave:receiveMusic;const result=await fn(message.request,{cancelled:()=>job.cancelled,onProgress:p=>send({id,type:'progress',...p})});const transfers=[];for(const a of [result.denominator,result.diagnostics?.eigenvaluesNormalized,result.diagnostics?.principalVector])if(a?.buffer)transfers.push(a.buffer);send({id,type:'result',result},transfers);}catch(e){send({id,type:'error',error:e.message});}finally{active=null;}});
