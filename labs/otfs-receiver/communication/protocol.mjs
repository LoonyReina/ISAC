import {SCHEMA_VERSION,KERNEL_VERSION,INPUT_ENCODING,KernelError,validateReceiver,createMPG,lmmse,inputDigest} from './kernel.mjs';
const now=()=>performance.now();
const delay=()=>new Promise(resolve=>setTimeout(resolve,0));
const validId=(id)=>typeof id==='string'&&id.length>=1&&id.length<=80&&/^[A-Za-z0-9_.:-]+$/.test(id);
/** Shared protocol controller. Browser and Node endpoints both exercise this module. */
export function createController(send,{yieldTask=delay}={}) {
  let active=null;const usedIds=new Set();
  function emit(record) {send({schemaVersion:SCHEMA_VERSION,kernelVersion:KERNEL_VERSION,inputEncoding:INPUT_ENCODING,...record});}
  function terminal(job,status,extra={}) {
    if(job.terminal)return;job.terminal=true;
    emit({type:'terminal',requestId:job.id,status,inputDigest:job.digest??null,
      elapsedMs:now()-job.started,...extra});if(active===job)active=null;
  }
  async function run(job,raw) {
    try {
      const start=now(),receiver=validateReceiver(raw);job.receiver=receiver;
      emit({type:'progress',requestId:job.id,phase:'validating',iteration:0});
      job.digest=await inputDigest(receiver);
      if(job.stop){terminal(job,job.stop);return;}
      emit({type:'progress',requestId:job.id,inputDigest:job.digest,phase:'running',iteration:0});
      await yieldTask();if(job.stop){terminal(job,job.stop);return;}
      const initStart=now(),mp=createMPG(receiver),initMs=now()-initStart,mpStart=now();
      while(mp.status==='running') {
        if(job.stop){terminal(job,job.stop,{partial:{mpg:mp.result()},partialResult:true});return;}
        const record=mp.step();
        emit({type:'progress',requestId:job.id,inputDigest:job.digest,phase:'mp-g',...record});
        // A real macrotask yield allows cancellation/supersession in actual Worker event loops.
        await yieldTask();
      }
      const mpMs=now()-mpStart;if(job.stop){terminal(job,job.stop,{partial:{mpg:mp.result()},partialResult:true});return;}
      const lmStart=now(),linear=lmmse(receiver),lmmseMs=now()-lmStart;
      await yieldTask();if(job.stop){terminal(job,job.stop,{partial:{mpg:mp.result()},partialResult:true});return;}
      terminal(job,'completed',{receiver,methods:{mpg:mp.result(),lmmse:linear},
        timing:{runtime:'worker-core',validationAndDigestMs:initStart-start,mpInitializationMs:initMs,mpWithYieldMs:mpMs,lmmseMs,totalCoreWallMs:now()-start},
        comparison:'Both methods used the identical supplied H, y, constellation and proper-complex noise variance.',partialResult:false});
    } catch(e) {
      terminal(job,e instanceof KernelError?e.code:'internal-error',{error:{name:e.name||'Error',message:String(e.message||e).slice(0,500)}});
    }
  }
  return {receive(message) {
    if(!message||typeof message!=='object'||Array.isArray(message)) {emit({type:'protocol-error',status:'invalid-input',requestId:null,error:{message:'Message must be an object'}});return;}
    const {type,requestId}=message;
    if(!validId(requestId)){emit({type:'protocol-error',status:'invalid-input',requestId:null,error:{message:'requestId must be 1–80 safe identifier characters'}});return;}
    if(type==='cancel'){
      if(Object.keys(message).some(k=>!['type','requestId'].includes(k))){emit({type:'protocol-error',status:'invalid-input',requestId,error:{message:'Unknown cancel field'}});return;}
      if(active?.id===requestId)active.stop='cancelled';else emit({type:'cancel-ignored',requestId,status:'not-active'});return;
    }
    if(type!=='run'||Object.keys(message).some(k=>!['type','requestId','receiver'].includes(k))){emit({type:'protocol-error',status:'invalid-input',requestId,error:{message:'Expected run or cancel with known fields'}});return;}
    if(usedIds.has(requestId)){emit({type:'protocol-error',status:'invalid-input',requestId,error:{message:'requestId already used; use a fresh unique id'}});return;}
    if(usedIds.size>=1000){emit({type:'protocol-error',status:'invalid-input',requestId,error:{message:'Worker session request budget exhausted; create a fresh Worker'}});return;}
    usedIds.add(requestId);if(active)active.stop='superseded';
    const job={id:requestId,started:now(),terminal:false,stop:null};active=job;void run(job,message.receiver);
  }};
}
/** Consumer-side stale-result filter. Input changes invalidate immediately. */
export function createResultGate() {
  let expected=null;
  return {expect(requestId,digest){expected={requestId,digest};},invalidate(){expected=null;},
    accepts(record){return !!expected&&record.type==='terminal'&&record.status==='completed'&&record.requestId===expected.requestId&&record.inputDigest===expected.digest;}};
}
