// The generation gate belongs to UI orchestration, not to the scientific model.
export function createController(makeScheduler, notify=()=>{}, yieldTask=()=>new Promise(r=>setTimeout(r,0))) {
 let generation=0, scheduler=null, phase='unconfigured', error=null;
 const state=()=>({generation,phase,error,snapshot:scheduler?.snapshot()??null});
 const publish=()=>notify(state());
 function configure(config){generation++;scheduler?.cancel();scheduler=null;phase='invalid';error=null;
  try {scheduler=makeScheduler(config.stations,config.m,config.psi,config.seed);phase='ready';} catch(e){error=e.message;}
  publish();return state();
 }
 function cancel(){if(phase!=='running')return;generation++;scheduler.cancel();phase='partial';publish();}
 async function run(count){
  if(!scheduler||!['ready','complete'].includes(phase))throw new Error('Reset parameters or seed before starting a cancelled run');
  if(!Number.isInteger(count)||count<1||count>scheduler.snapshot().remaining)throw new RangeError('Invalid remaining request count');
  const token=++generation, current=scheduler;phase='running';publish();
  let left=count;
  try {while(left){await yieldTask();if(token!==generation||current!==scheduler)return state();const n=Math.min(left,128);current.chunk(n);left-=n;publish();}
   if(token===generation){phase='complete';publish();}
  }catch(e){if(token===generation){error=e.message;phase='error';publish();}}
  return state();
 }
 return {configure,cancel,run,state};
}
