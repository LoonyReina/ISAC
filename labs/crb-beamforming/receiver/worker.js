/* One bounded numerical job. Every reply is bound to both generation and digest. */
importScripts('../crb-multiuser-data.js','../crb-multiuser-model.js','runtime-manifest.js','core.js');
(function(){
'use strict';
let current=null,lastRunId=-1;
function send(job,type,extra={}){postMessage({type,id:job.id,jobDigest:job.jobDigest,...extra});}
function validIdentity(m){return Number.isSafeInteger(m.id)&&m.id>=0&&typeof m.jobDigest==='string'&&/^[a-f0-9]{64}$/.test(m.jobDigest);}
function pump(job){
  if(current!==job||job.terminal)return;
  try{
    const progress=job.experiment.step();if(current!==job)return;
    if(job.experiment.status==='running'){
      if(performance.now()-job.lastPosted>=CrbReceiverCore.LIMITS.progressMs){send(job,'progress',{progress});job.lastPosted=performance.now();}
      setTimeout(()=>pump(job),0);
    }else{job.terminal=true;send(job,'result',{result:job.experiment.summary()});}
  }catch(e){job.terminal=true;job.experiment.cancel();send(job,'error',{operation:'run',error:String(e.message||e)});}
}
onmessage=function(event){
  const m=event.data||{};
  if(!validIdentity(m)){postMessage({type:'error',id:m.id,jobDigest:m.jobDigest,operation:m.type==='export'?'export':'run',error:'Invalid receiver message identity'});return;}
  if(m.type==='cancel'){
    if(!current||current.id!==m.id||current.jobDigest!==m.jobDigest)return;
    const result=current.experiment.cancel();current.terminal=true;send(current,'cancelled',{result});return;
  }
  if(m.type==='export'){
    if(!current||current.id!==m.id||current.jobDigest!==m.jobDigest)return;
    try{send(current,'export',{text:current.experiment.exportText()});}catch(e){send(current,'error',{operation:'export',error:String(e.message||e)});}return;
  }
  if(m.type!=='run'){postMessage({type:'error',id:m.id,jobDigest:m.jobDigest,operation:'run',error:'Unsupported receiver message'});return;}
  try{
    if(m.id<=lastRunId)throw Error('Run IDs must increase monotonically');
    const request=CrbReceiverCore.validateRequest(m.request);
    if(request.jobDigest!==m.jobDigest)throw Error('Worker request digest mismatch');
    if(current&&!current.terminal){const previous=current;previous.experiment.cancel();previous.terminal=true;send(previous,'cancelled',{result:previous.experiment.summary()});}
    const job={id:m.id,jobDigest:m.jobDigest,experiment:CrbReceiverCore.createExperiment(request),lastPosted:-Infinity,terminal:false};
    lastRunId=m.id;current=job;setTimeout(()=>pump(job),0);
  }catch(e){postMessage({type:'error',id:m.id,jobDigest:m.jobDigest,operation:'run',error:String(e.message||e)});}
};
})();
