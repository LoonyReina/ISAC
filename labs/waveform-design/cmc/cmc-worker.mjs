import {solveEvents} from './cmc-core.mjs';
let live=null;
const emit=message=>globalThis.postMessage(message);
function end(current){if(live===current)live=null;}
globalThis.onmessage=({data})=>{
 if(data?.type==='cancel'){
  if(live&&data.runId===live.runId){const current=live;end(current);current.generator.return();emit({type:'cancelled',runId:current.runId,lastCheckpoint:current.last,eligible:false});}return;
 }
 if(data?.type!=='run'||typeof data.runId!=='string'||data.runId.length>100)return;
 if(live){emit({type:'error',runId:data.runId,error:'One active run allowed',eligible:false});return;}
 const current={runId:data.runId,generator:solveEvents(data.input),started:performance.now(),last:null};live=current;
 const pump=()=>{
  if(live!==current)return;
  if(performance.now()-current.started>5000){end(current);current.generator.return();emit({type:'timeout',runId:current.runId,lastCheckpoint:current.last,eligible:false});return;}
  try{const step=current.generator.next();
   if(step.done){end(current);emit({type:'result',runId:current.runId,result:step.value,elapsedMs:performance.now()-current.started});}
   else{current.last=step.value;emit({type:'checkpoint',runId:current.runId,checkpoint:step.value});setTimeout(pump,0);}
  }catch(error){end(current);emit({type:'error',runId:current.runId,error:String(error),eligible:false});}
 };
 setTimeout(pump,0);
};
