export function createSession(workerFactory,onState=()=>{}){
 let id=0,worker=null,state={status:'idle',result:null,input:null};
 const emit=s=>{state=s;onState(state);};
 const stop=()=>{if(worker)worker.terminate();worker=null;};
 return {
  run(input){stop();const ticket=++id;const snapshot=JSON.parse(JSON.stringify(input));emit({status:'running',result:null,input:snapshot});worker=workerFactory();const receive=message=>{const data=message.data??message;if(data.id!==id||ticket!==id||state.status!=='running')return;if(data.error){stop();emit({...state,status:'error',error:data.error});}else if(data.result){stop();emit({...state,status:'completed',result:data.result});}else emit({...state,progress:data.progress});};if(worker.addEventListener){worker.addEventListener('message',receive);worker.addEventListener('error',e=>{if(ticket===id){stop();emit({...state,status:'error',error:e.message});}});}else{worker.on('message',receive);worker.on('error',e=>{if(ticket===id){stop();emit({...state,status:'error',error:e.message});}});}worker.postMessage({id:ticket,input:snapshot});return ticket;},
  invalidate(){++id;stop();emit({status:'stale',result:null,input:null});},
  cancel(){if(state.status!=='running')return false;++id;stop();emit({status:'cancelled',result:null,input:null});return true;},
  export(){if(state.status!=='completed'||!state.result)throw new Error('No current completed result');return JSON.stringify({schema:'joint-grid-teaching-v1',input:state.input,result:state.result});},
  state:()=>state,dispose(){++id;stop();}
 };
}
