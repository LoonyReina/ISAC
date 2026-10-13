import {LIMITS,assert,keys,integer,snapshotJSON,validateRequest,makeRecord,checkRecord,validateResult} from './records.mjs';
const PROTOCOL='dual-array-worker-v1';
/** Exported for focused protocol tests. Browser and worker_threads execute this same handler. */
export function createWorkerHandler(send,{runRequest,now=()=>performance.now()}={}){
  let claimed=false;
  return async function receive(input){if(claimed){send({protocol:PROTOCOL,kind:'rejected',id:null,revision:null,status:'error',error:'Worker is single-use; start a new Worker'});return;}let message,id=null,revision=null;
    try{message=snapshotJSON(input);keys(message,['protocol','kind','id','revision','operation','input','budgetMs'],'Worker message');assert(message.protocol===PROTOCOL&&message.kind==='run','Worker protocol mismatch');assert(typeof message.id==='string'&&/^dual_[1-9][0-9]*$/.test(message.id),'Worker id invalid');id=message.id;revision=integer(message.revision,1,Number.MAX_SAFE_INTEGER,'Worker revision');assert(id===`dual_${revision}`,'Worker identity mismatch');integer(message.budgetMs,1,LIMITS.maxBudgetMs,'Worker budgetMs');assert(message.operation==='run'||message.operation==='verify','Worker operation invalid');assert(!claimed,'Worker is single-use; start a new Worker');claimed=true;if(message.operation==='run')validateRequest(message.input);
    }catch(error){send({protocol:PROTOCOL,kind:'terminal',id,revision,status:'error',error:String(error.message)});return;}
    const started=now();let lastProgress=-Infinity,lastYield=started;
    const emit=payload=>send({protocol:PROTOCOL,id,revision,...payload});
    const checkpoint=progress=>{if(now()-started>message.budgetMs){const error=new Error('Worker computation budget exceeded');error.code='budget-exceeded';throw error;}if(progress&&now()-lastProgress>=40){lastProgress=now();emit({kind:'progress',progress:snapshotJSON(progress,32768),elapsedMs:now()-started});}};
    const control={checkpoint,onProgress:checkpoint,async step(stage,completed,total){checkpoint({stage,completed,total});if(now()-lastYield>=8){await new Promise(resolve=>setTimeout(resolve,0));lastYield=now();checkpoint();}}};
    try{checkpoint();if(message.operation==='run'){const record=await makeRecord(message.input,{runRequest,control});checkpoint();const assessed=validateResult(record.execution.result,record.execution.request);emit({kind:'terminal',status:assessed.status==='numeric-estimates'?'completed':'absent-estimate',record,elapsedMs:now()-started});}else{const verification=await checkRecord(message.input,{runRequest,control});checkpoint();emit({kind:'terminal',status:verification.status==='passed'?'completed':verification.status,record:message.input,verification,elapsedMs:now()-started});}}
    catch(error){emit({kind:'terminal',status:error.code==='budget-exceeded'?'budget-exceeded':'error',error:String(error.message),elapsedMs:now()-started});}
  };
}
if(typeof globalThis.addEventListener==='function'&&typeof globalThis.postMessage==='function'&&typeof document==='undefined'){
  const receive=createWorkerHandler(message=>globalThis.postMessage(message));globalThis.addEventListener('message',event=>{void receive(event.data);});
}else if(typeof process!=='undefined'&&process.versions?.node){
  const {isMainThread,parentPort}=await import('node:worker_threads');if(!isMainThread&&parentPort){const receive=createWorkerHandler(message=>parentPort.postMessage(message));parentPort.on('message',message=>{void receive(message);});}
}
