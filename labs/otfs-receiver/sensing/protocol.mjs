import {SCHEMA_VERSION,KERNEL_VERSION,LIMITS,KernelError,validateReceiver,inputDigest,createGridSearch} from './kernel.mjs';
const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));
const validId=id=>typeof id==='string'&&id.length>=1&&id.length<=80&&/^[A-Za-z0-9_.:-]+$/.test(id);
/** Same tested protocol runs in real Node Worker and prospective browser Worker. */
export function createController(send,{yieldControl=yieldTask}={}){
  let active=null;const usedIds=new Set();
  const emit=record=>send({schemaVersion:SCHEMA_VERSION,kernelVersion:KERNEL_VERSION,...record});
  function terminal(job,status,extra={}){if(job.terminal)return;job.terminal=true;emit({type:'terminal',requestId:job.id,inputDigest:job.digest??null,status,workerWallMs:performance.now()-job.started,...extra});if(active===job)active=null;}
  async function run(job,raw){
    try{
      const receiver=validateReceiver(raw);job.digest=await inputDigest(receiver);
      if(job.stop){terminal(job,job.stop);return;}
      emit({type:'progress',phase:'validated',requestId:job.id,inputDigest:job.digest,evaluations:0});
      await yieldControl();if(job.stop){terminal(job,job.stop);return;}
      const search=createGridSearch(receiver);job.search=search;
      while(search.status==='running'){
        if(job.stop){search.stop(job.stop);terminal(job,job.stop,{result:search.result()});return;}
        const update=search.step();emit({type:'progress',phase:'grid',requestId:job.id,inputDigest:job.digest,...update});
        await yieldControl();
      }
      if(job.stop){terminal(job,job.stop,{result:{...search.result(),status:job.stop,partial:true,globalOnDeclaredGrid:false}});return;}
      const result=search.result();terminal(job,'completed',{result});
    }catch(error){terminal(job,error instanceof KernelError?error.code:'internal-error',{error:{name:error.name??'Error',message:String(error.message??error).slice(0,500)}});}
  }
  return {receive(message){
    if(!message||typeof message!=='object'||Array.isArray(message)){emit({type:'protocol-error',status:'invalid-input',requestId:null,error:{message:'Message must be a plain object'}});return;}
    const {type,requestId}=message;
    if(!validId(requestId)){emit({type:'protocol-error',status:'invalid-input',requestId:null,error:{message:'Use a unique 1–80 character safe requestId'}});return;}
    if(type==='cancel'){
      if(Object.keys(message).some(k=>!['type','requestId'].includes(k))){emit({type:'protocol-error',status:'invalid-input',requestId,error:{message:'Unexpected cancel field'}});return;}
      if(active?.id===requestId)active.stop='cancelled';else emit({type:'cancel-ignored',status:'not-active',requestId});return;
    }
    if(type!=='run'||Object.keys(message).some(k=>!['type','requestId','receiver'].includes(k))){emit({type:'protocol-error',status:'invalid-input',requestId,error:{message:'Expected run or cancel with known fields'}});return;}
    if(usedIds.has(requestId)||usedIds.size>=LIMITS.maxSessionRequests){emit({type:'protocol-error',status:'invalid-input',requestId,error:{message:'Duplicate requestId or exhausted 1000-request Worker session'}});return;}
    usedIds.add(requestId);if(active)active.stop='superseded';const job={id:requestId,started:performance.now(),stop:null,terminal:false};active=job;void run(job,message.receiver);
  }};
}
/** UI must invalidate immediately on edits; only matching IDs AND digest are current. */
export function createResultGate(){let expected=null;return {expect(requestId,digest){if(!validId(requestId)||typeof digest!=='string'||!/^sha256:[0-9a-f]{64}$/.test(digest))throw new KernelError('invalid-input','Invalid gate identity');expected={requestId,digest};},invalidate(){expected=null;},accepts(record){return !!expected&&record.type==='terminal'&&record.status==='completed'&&record.requestId===expected.requestId&&record.inputDigest===expected.digest;}};}
