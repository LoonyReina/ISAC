/* Real browser Worker; chunks yield to run/cancel messages. */
'use strict';
importScripts('../extended/hermitian.js','../extended/linalg.js','../extended/core.js');
let active=null;
function finish(job){postMessage({type:'result',runId:job.id,record:job.solver.result(),workerWallMs:performance.now()-job.started});if(active===job)active=null;}
function tick(job){if(active!==job)return;try{const progress=job.solver.step(2);if(job.solver.status!=='running')return finish(job);postMessage({type:'progress',runId:job.id,progress});setTimeout(()=>tick(job),0);}catch(e){postMessage({type:'error',runId:job.id,message:String(e.message)});if(active===job)active=null;}}
onmessage=({data})=>{if(!data||typeof data.runId!=='string'||data.runId.length>100)return;if(data.type==='cancel'){if(active&&active.id===data.runId){active.solver.cancel();finish(active);}return;}if(data.type!=='run')return;if(active){active.solver.cancel();finish(active);}try{const job={id:data.runId,started:performance.now(),solver:CrbExtendedOptimizer.createSolver(data.input,data.options)};active=job;postMessage({type:'started',runId:job.id});setTimeout(()=>tick(job),0);}catch(e){postMessage({type:'error',runId:data.runId,message:String(e.message)});}};
