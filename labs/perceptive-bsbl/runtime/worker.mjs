import {runExperiment} from './runner.mjs';
let send,listen;
if(typeof process!=='undefined'&&process.versions?.node){const {parentPort}=await import('node:worker_threads');if(!parentPort)throw new Error('worker.mjs must run inside a Worker');send=value=>parentPort.postMessage(value);listen=fn=>parentPort.on('message',fn);}else{send=value=>globalThis.postMessage(value);listen=fn=>{globalThis.onmessage=e=>fn(e.data);};}
let active=null;const seen=new Set();
listen(async message=>{
 if(message?.type==='cancel'){if(active?.id===message.runId)active.cancelled=true;return;}
 if(message?.type!=='run'||typeof message.runId!=='string'||message.runId.length>100||seen.size>=1||active){send({type:'protocol_error',runId:message?.runId??null,message:'unique run ID and one active run required'});return;}
 const state={id:message.runId,cancelled:false};active=state;seen.add(state.id);
 try{const record=await runExperiment(message.request,{runId:state.id,isCancelled:()=>state.cancelled,onRecord:async record=>send({type:'partial',runId:state.id,record})});send({type:'result',runId:state.id,record});}catch(error){send({type:'error',runId:state.id,error:{name:error.name,message:error.message}});}finally{if(active===state)active=null;}
});
