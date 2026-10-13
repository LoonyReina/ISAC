import {WorkerClient} from './runtime/protocol.mjs';
// A submission owns its promise and state before any externally supplied callback.
// Revocation terminates actual CPU work, not merely the output's visibility.
export function createSession({workerFactory=url=>new Worker(url,{type:'module'}),onChange=()=>{}}={}) {
 const state={status:'idle',stage:'',record:null,stale:false,provenance:'',error:null,elapsedMs:null,revision:0,active:null};
 let client=null,dead=false;
 const notify=()=>onChange(state);
 function settle(job,value){if(job?.resolve){const resolve=job.resolve;job.resolve=null;resolve(value);}}
 function stop(reason){const old=state.active;state.active=null;const previous=client;client=null;previous?.dispose();settle(old,{status:reason});}
 function invalidState(reason){state.revision++;stop(reason);state.stale=!!state.record;state.status=reason;state.stage='';state.error=null;}
 function invalidate(reason='edited'){invalidState(reason);notify();}
 function ensure(job){
  if(client)return client;
  const worker=workerFactory(new URL('./runtime/worker.mjs',import.meta.url));
  if(dead||state.active!==job){worker.terminate();return null;}
  client=new WorkerClient(worker,message=>{
   const active=state.active;if(!active)return;
   if(message.kind==='started'){state.status='running';state.stage=message.operation;notify();return;}
   if(message.kind==='progress'){state.stage=`${message.stage} ${message.completed}/${message.total}（阶段内）`;notify();return;}
   if(message.kind!=='terminal'&&message.kind!=='rejected')return;
   state.active=null;state.elapsedMs=message.elapsedMs??null;state.status=message.status;state.stage='';state.error=message.error??null;
   if(message.status==='completed'&&active.operation!=='replay'){state.record=message.result;state.stale=false;state.provenance=active.provenance;}
   if(message.status!=='completed'){state.stale=!!state.record;const previous=client;client=null;previous?.dispose();}
   settle(active,message);notify();
  });
  return client;
 }
 async function run(operation,input,provenance='本次计算',budgetMs=10000){
  if(dead)throw Error('页面会话已关闭');if(state.active)return {status:'busy'};
  let owned;try{owned=structuredClone(input);}catch(error){state.status='error';state.error=String(error.message);state.stale=!!state.record;notify();return {status:'error',error:state.error};}
  const job={operation,provenance,revision:++state.revision,resolve:null};
  const promise=new Promise(resolve=>{job.resolve=resolve;});
  state.active=job;state.status='validating';state.error=null;state.stage='';notify();
  // reset/destroy/replacement in onChange has already settled THIS job. Never
  // reacquire ownership or settle a newer request's promise after returning.
  if(dead||state.active!==job)return await promise;
  try{const owner=ensure(job);if(dead||state.active!==job||!owner)return await promise;owner.run(operation,owned,budgetMs);}
  catch(error){if(state.active===job){stop('error');state.status='error';state.error=String(error.message);state.stale=!!state.record;notify();}else settle(job,{status:'cancelled'});return {status:'error',error:String(error.message)};}
  return await promise;
 }
 return {state,run,invalidate,cancel(){invalidate('cancelled');},reset(){invalidState('idle');state.record=null;state.stale=false;state.provenance='';state.elapsedMs=null;notify();},suspend(){invalidate('navigation');},resume(){if(!dead){state.status=state.record?'completed':'idle';notify();}},destroy(){if(dead)return;dead=true;invalidState('closed');notify();},get workerActive(){return !!client;}};
}
