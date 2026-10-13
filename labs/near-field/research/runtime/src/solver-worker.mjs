import {loadSolver} from './solver-loader.mjs';
import {validateDesign,validateSolverOptions,keys,clone,LIMITS} from './contract.mjs';
const Core=await loadSolver();
let send,listen;
if(typeof globalThis.postMessage==='function'){send=m=>postMessage(m);listen=f=>{globalThis.onmessage=e=>f(e.data);};}
else{const {parentPort}=await import('node:worker_threads');send=m=>parentPort.postMessage(m);listen=f=>parentPort.on('message',f);}
const now=()=>performance.now(),yieldLoop=()=>new Promise(r=>setTimeout(r,0));
let active=null,pending=null;
const terminal=(job,status)=>send({id:job.id,type:'result',result:{status,acceptance:'not_accepted',terminal:true}});
async function run(job){active=job;const began=now(),slices={setupMs:0,maxNewtonStepMs:0,assessmentMs:0},p=v=>send({id:job.id,type:'progress',...v});try{
 p({phase:'queued',iterations:0});await yieldLoop();if(job.cancelled||job.superseded){terminal(job,job.superseded?'superseded':'cancelled');return;}
 let started=now();const solver=Core.createSolver(job.input,job.options);slices.setupMs=now()-started;p({phase:'setup',iterations:0,elapsedMs:now()-began});await yieldLoop();
 while(solver.status==='running'&&!job.cancelled&&!job.superseded){started=now();const state=solver.step(1);slices.maxNewtonStepMs=Math.max(slices.maxNewtonStepMs,now()-started);p({phase:'optimization',...state});await yieldLoop();}
 if(job.cancelled||job.superseded){started=now();solver.cancel();slices.assessmentMs=now()-started;terminal(job,job.superseded?'superseded':'cancelled');return;}
 p({phase:'assessment',elapsedMs:now()-began});started=now();const result=solver.result();slices.assessmentMs=now()-started;await yieldLoop();
 if(job.cancelled||job.superseded){terminal(job,job.superseded?'superseded':'cancelled');return;}
 result.worker={elapsedMs:now()-began,slices,cooperative:true,maxNonYieldingSliceObservedMs:Math.max(...Object.values(slices)),latencyStatement:'Messages are handled only between bounded setup, one Newton step, and terminal assessment. Observations are not hard timing guarantees.',limits:LIMITS};send({id:job.id,type:'result',result});
 }catch(e){send({id:job.id,type:'error',error:String(e.message??e)});}finally{active=null;if(pending){const next=pending;pending=null;void run(next);}}}
listen(message=>{try{keys(message,['id','type','input','options'],'solver worker message');const {id,type}=message;if(typeof id!=='string'||id.length<1||id.length>128)throw Error('Job id must be 1..128 characters');if(type==='cancel'){if(Object.keys(message).some(k=>!['id','type'].includes(k)))throw Error('Cancel has extra fields');let matched=false;if(active?.id===id){active.cancelled=true;matched=true;}if(pending?.id===id){terminal(pending,'cancelled');pending=null;matched=true;}send({id,type:'cancel_ack',matched});return;}if(type!=='solve')throw Error('Unsupported worker message');validateDesign(message.input);validateSolverOptions(message.options??{});if(active?.id===id||pending?.id===id)throw Error('Duplicate active job id');const job={id,input:clone(message.input),options:clone(message.options??{}),cancelled:false,superseded:false};if(active){active.superseded=true;if(pending)terminal(pending,'superseded');pending=job;}else void run(job);}catch(e){send({id:typeof message?.id==='string'&&message.id.length<=128?message.id:null,type:'error',error:String(e.message??e)});}});
