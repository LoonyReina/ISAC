/* Numerical-only Worker protocol. No DOM, network or simulation truth. */
'use strict';
importScripts('atomic-receiver-core.js?v=atomic-eq27-v1');
const core=self.AtomicReceiverCore;
let active=null,lastAcceptedId=-1;
const WRAPPER_VERSION='atomic-receiver-history-v1';
const send=(value)=>self.postMessage({...value,wrapperVersion:WRAPPER_VERSION});
send({type:'ready',version:core.VERSION});
self.onmessage=({data:m})=>{
 if(!m||typeof m!=='object')return send({type:'error',requestId:null,error:'Invalid message'});
 if(m.type==='cancel'){
  if(active&&active.id===m.requestId){const token=active;token.solver.cancel();active=null;send({type:'cancelled',requestId:token.id,version:core.VERSION,iterations:token.solver.iterations,reason:'requested'});}
  return;
 }
 if(m.type!=='solve')return send({type:'error',requestId:m.requestId??null,error:'Unsupported message type'});
 const id=m.requestId;
 if(!Number.isSafeInteger(id)||id<0||id<=lastAcceptedId)return send({type:'error',requestId:id??null,error:'Solve requestId must be a fresh increasing nonnegative safe integer'});
 if(m.expectedVersion!==core.VERSION)return send({type:'error',requestId:id,error:'Core version mismatch',version:core.VERSION});
 let solver;
 try{solver=core.createSolver(m.input,m.settings||{});}catch(e){return send({type:'error',requestId:id,error:String(e.message),version:core.VERSION});}
 if(active){const old=active;old.solver.cancel();send({type:'cancelled',requestId:old.id,version:core.VERSION,iterations:old.solver.iterations,reason:'superseded'});}
 const token={id,solver,lastProgress:0,history:[],historyDecimated:false,recordEvery:solver.snapshot(false).settings.recordEvery};active=token;lastAcceptedId=id;
 const saveHistory=()=>{const q=solver.snapshot(false);if(token.history.at(-1)?.iteration===q.iterations)return;token.history.push({iteration:q.iterations,z:q.z,e:q.e,nu:q.nu,t:q.t,last:q.last});if(token.history.length>256){token.history=token.history.filter((_,i,a)=>i===0||i===a.length-1||i%2===0);token.historyDecimated=true;}};
 saveHistory();
 send({type:'started',requestId:id,version:core.VERSION});
 const pump=()=>{
  if(active!==token||solver.status!=='running')return;
  try{
   const every=token.recordEvery;
   const state=solver.step(Math.min(4,every-solver.iterations%every)),time=performance.now();
   if(state.iterations%every===0||state.status!=='running')saveHistory();
   if(active!==token)return;
   if(state.status==='running'){
    if(time-token.lastProgress>=100){send({type:'progress',requestId:id,version:core.VERSION,iterations:state.iterations,last:state.last});token.lastProgress=time;}
    setTimeout(pump,0);
   }else{const result={...solver.snapshot(true),history:token.history,historyDecimated:token.historyDecimated,historyKind:'actual-ADMM-states-no-interpolation'};if(active===token){active=null;send({type:'result',requestId:id,version:core.VERSION,result});}}
  }catch(e){if(active===token){active=null;send({type:'error',requestId:id,version:core.VERSION,error:String(e.message)});}}
 };
 setTimeout(pump,0);
};
