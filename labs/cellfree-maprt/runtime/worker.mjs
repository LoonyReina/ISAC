// Actual dedicated module Worker. Termination is the hard cancellation boundary.
import {run,replay} from './runtime.mjs';
import {encode,decode} from './codec.mjs';
let busy=false,generation=0;
self.onmessage=async ({data:m})=>{if(!m||typeof m.id!=='string')return;const {id,type}=m;if(type==='cancel'){generation++;self.postMessage({id,type:'cancel-ack',requiresTerminateForImmediateStop:true});return;}if(busy){self.postMessage({id,type:'error',error:'worker busy'});return;}if(type!=='run'&&type!=='replay'){self.postMessage({id,type:'error',error:'unknown command'});return;}busy=true;let g=++generation;try{let value=type==='run'?await run(m.settings,{cancelled:()=>g!==generation,progress:p=>self.postMessage({id,type:'progress',...p})}):replay(decode(m.record));if(g===generation)self.postMessage({id,type:'result',record:encode(value)});}catch(e){self.postMessage({id,type:'error',error:String(e.message??e)});}finally{busy=false;}};
