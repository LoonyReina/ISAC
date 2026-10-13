/** UI lifecycle only. Numerical work stays in the byte-frozen module Workers.
 * This controller has no generator, truth, RNG, optimizer or detector code.
 */
import {inputDigest as sensingDigest,validateReceiver as validateSensing} from './sensing/kernel.mjs';
import {inputDigest as communicationDigest,validateReceiver as validateCommunication} from './communication/kernel.mjs';

const busy = status => ['preparing','running','cancelling'].includes(status);
const copy = value => structuredClone(value);

export function createLessonSession({task,workerFactory,onState=()=>{}}) {
  if (!['sensing','communication'].includes(task)) throw new TypeError('Unknown lesson task');
  const digest = task==='sensing' ? sensingDigest : communicationDigest;
  const validate = task==='sensing' ? validateSensing : validateCommunication;
  let worker=null, revision=0, serial=0, disposed=false, active=null, lastPostedId=null;
  let state={task,status:'idle',requestId:null,inputDigest:null,receiver:null,observation:null,
    terminal:null,progress:null,error:null,elapsedMs:null};
  const notify = patch => {state={...state,...patch};onState({...state});};
  function fail(error) {
    active=null;
    notify({status:error?.code==='invalid-input'?'invalid-input':'error',terminal:null,
      error:{message:String(error?.message||error||'Worker error').slice(0,500)}});
  }
  function receive(message) {
    if(disposed||!active||!message||message.requestId!==active.id||active.revision!==revision)return;
    if(message.inputDigest && message.inputDigest!==active.digest){fail(new Error('Worker input digest mismatch'));return;}
    if(message.type==='progress') {
      // Progress is a computed iteration or batch, not a successful comparison.
      notify({status:state.status==='cancelling'?'cancelling':'running',progress:message});return;
    }
    if(message.type==='protocol-error'){fail(new Error(message.error?.message||'Worker protocol error'));return;}
    if(message.type!=='terminal')return;
    const job=active;active=null;
    if(message.status==='completed'&&message.inputDigest!==job.digest){fail(new Error('Missing completed input identity'));return;}
    // A requested cancellation wins even if a completed packet was already in flight.
    if(job.cancelRequested && message.status==='completed') {
      notify({status:'cancelled',terminal:null,progress:null,elapsedMs:performance.now()-job.started});return;
    }
    notify({status:message.status==='internal-error'||message.status==='numerical-failure'?'error':message.status,
      terminal:message,progress:null,error:message.error??null,elapsedMs:performance.now()-job.started});
  }
  function ensureWorker() {
    if(worker)return;
    worker=workerFactory(task);
    if(!worker||typeof worker.postMessage!=='function')throw new Error('Worker is unavailable');
    const endpoint=worker;
    const workerError=error=>{if(!disposed&&worker===endpoint){worker=null;endpoint.terminate();if(active)fail(error);}};
    if(typeof worker.addEventListener==='function') {
      worker.addEventListener('message',event=>receive(event.data));
      worker.addEventListener('error',event=>workerError(new Error(event.message||'Worker failed')));
      worker.addEventListener('messageerror',()=>workerError(new Error('Worker response could not be decoded')));
    } else if(typeof worker.on==='function') {
      worker.on('message',receive);worker.on('error',workerError);
    } else throw new Error('Unsupported Worker event API');
  }
  function stopActive() {
    // A newer request can be hashing while an older submitted run still works.
    // Cancel the actual outstanding Worker identity, not only the newest job.
    if(worker&&lastPostedId)worker.postMessage({type:'cancel',requestId:lastPostedId});
    active=null;
  }
  function invalidate(reason='inputs changed') {
    if(disposed)return;revision++;stopActive();
    notify({status:'stale',requestId:null,inputDigest:null,terminal:null,progress:null,error:null,reason,elapsedMs:null});
  }
  async function run(raw,observation=null) {
    if(disposed)throw new Error('Lesson session is disposed');
    // Do not cancel here: the new accepted Worker run supersedes its old run.
    const currentRevision=++revision,id=`${task}-${++serial}`;
    const job={id,revision:currentRevision,digest:null,posted:false,started:performance.now(),cancelRequested:false};
    active=job;
    notify({status:'preparing',requestId:id,inputDigest:null,receiver:null,observation,
      terminal:null,progress:null,error:null,elapsedMs:null,reason:null});
    try {
      const receiver=validate(raw),inputIdentity=await digest(receiver);
      if(disposed||active!==job||revision!==currentRevision)return null;
      job.digest=inputIdentity;ensureWorker();job.posted=true;lastPostedId=id;
      notify({status:'running',receiver, inputDigest:inputIdentity});
      worker.postMessage({type:'run',requestId:id,receiver:copy(receiver)});
      return id;
    } catch(error) {
      if(active===job&&revision===currentRevision){
        // New malformed inputs must also invalidate any older in-flight work.
        if(worker&&lastPostedId)worker.postMessage({type:'cancel',requestId:lastPostedId});
        fail(error);
      }
      return null;
    }
  }
  function cancel() {
    if(!active||!busy(state.status))return false;
    active.cancelRequested=true;
    if(!active.posted){revision++;stopActive();notify({status:'cancelled',terminal:null,progress:null});}
    else {worker.postMessage({type:'cancel',requestId:active.id});notify({status:'cancelling'});}
    return true;
  }
  function reset() {
    revision++;stopActive();
    notify({status:'idle',requestId:null,inputDigest:null,receiver:null,observation:null,
      terminal:null,progress:null,error:null,elapsedMs:null,reason:null});
  }
  function reject(error) {revision++;stopActive();fail(error);}
  function dispose() {
    if(disposed)return;revision++;stopActive();disposed=true;worker?.terminate();worker=null;
  }
  return {run,invalidate,cancel,reset,reject,dispose,getState:()=>({...state}),get busy(){return busy(state.status);}};
}
