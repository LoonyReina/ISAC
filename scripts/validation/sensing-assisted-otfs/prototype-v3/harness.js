import {SensingOtfsClient} from './worker/client.js';
import {encode,sha256} from './js/codec.js';
import {validateExperimentConfig} from './js/evaluation.js';
const $=id=>document.getElementById(id),createWorker=()=>new Worker(new URL('./worker/receiver-worker.js',import.meta.url),{type:'module'});
let client,job=null,result=null,generation=0;
function render(x){if(!x)return;result=x;$('export').disabled=false;$('rows').replaceChildren();for(const f of x.frames??[])for(const r of f.records){const row=document.createElement('tr');for(const value of [`${f.frame+1} / ${f.normalization}`,r.mode,`${r.metrics.errors} / ${r.metrics.bits}`,`${r.status} / ${r.iterations}`]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}$('rows').append(row);}$('ledger').textContent=JSON.stringify({status:x.status,seed:x.configuration?.seed,energyLedgers:x.frames?.map(f=>({frame:f.frame,normalization:f.normalization,...f.energyLedger})),summary:x.summary},null,2);}
async function setup(){client=new SensingOtfsClient(createWorker(),{createWorker});const ready=await client.ready;$('status').textContent=ready.ok?'Ready for fresh computation':'Worker failed to start';}
$('run').onclick=async()=>{
 let config;
 try {const norm=$('normalization').value;config=validateExperimentConfig({seed:Number($('seed').value),frames:Number($('frames').value),normalizations:norm==='both'?['source_per_data','equal_total_frame']:[norm],predictedSupport:$('support').value==='mismatch'?[[0,0],[1,2],[-1,4]]:[[0,0],[1,2],[-2,4]],N0:10**(-Number($('snr').value)/10),pilotPowerRatio:Number($('ratio').value),maxIterations:Number($('iterations').value)});}catch(e){$('status').textContent=`${e.code??'Error'}: ${e.message}`;return;}
 const g=++generation;$('status').textContent='Generating fresh data, channel gains and noise…';$('cancel').disabled=false;$('export').disabled=true;result=null;$('rows').replaceChildren();
 try {job=client.run(config,{onProgress:(p,partial)=>{if(g!==generation)return;if(partial)render(partial);$('status').textContent=[p.stage,p.mode,p.iteration===undefined?'':`iteration ${p.iteration}`].filter(Boolean).join(' · ');}});const e=await job.result;if(g!==generation)return;render(e.result??e.partial);$('status').textContent=e.type==='complete'?'Complete. Every capped or failed receiver record remains in the denominator.':`${e.type}: completed partial records retained`;}
 catch(e){if(g!==generation)return;render(e.partial);$('status').textContent=`${e.code??'Error'}: ${e.message}`;}
 finally {if(g===generation){job=null;$('cancel').disabled=true;}}
};
$('cancel').onclick=()=>{if(job)job.cancel();};
$('restart').onclick=async()=>{++generation;job=null;$('cancel').disabled=true;$('status').textContent='Restarting Worker…';try{await client.restart();const r=await client.ready;$('status').textContent=r.ok?'Worker restarted. Previously completed results remain downloadable.':'Worker restart failed';}catch(e){$('status').textContent=e.message;}};
$('export').onclick=async()=>{if(!result)return;try{const text=encode(result),digest=await sha256(text),wrapped=JSON.stringify({schema:'sensing-otfs-export-v1',sha256:digest,bytes:new TextEncoder().encode(text).length,text},null,2),blob=new Blob([wrapped],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`sensing-otfs-${result.configuration.seed}-${result.status}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('status').textContent=`Raw result export prepared; SHA-256 ${digest}`;}catch(e){$('status').textContent=e.message;}};
setup().catch(e=>{$('status').textContent=`Worker unavailable: ${e.message}`;});
