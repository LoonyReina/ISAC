/* Lesson lifecycle and bounded record transport. Numerical algorithms remain in the frozen runtime. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../runtime/js/ici-kernel.js'),require('../runtime/js/evaluate.js'),require('../runtime/worker/ici-client.js'));else root.ICILesson=factory(root.ICIKernel,root.ICIEvaluation,root.ICIWorkerClient);})(typeof globalThis!=='undefined'?globalThis:this,function(K,E,Client){'use strict';
const MAX_IMPORT_BYTES=5*1024*1024, MAX_RECORD_BYTES=80*1024*1024;
const clone=v=>JSON.parse(JSON.stringify(K.toJSON(v)));
const bytes=s=>new TextEncoder().encode(s).byteLength;
function parseImport(text){
 if(typeof text!=='string'||text.length>MAX_IMPORT_BYTES||bytes(text)>MAX_IMPORT_BYTES)throw Error('导入超过 5 MiB UTF-8 上限');
 const v=K.parseRawJSON(text),allowed=['schema_version','input_revision','mode','config','x','y','noise_variance','y_ici_free_counterfactual','max_wall_ms','expected_hashes'];
 for(const key of Object.keys(v))if(!allowed.includes(key))throw Error('原始输入含不允许字段：'+key);
 if(typeof v.input_revision!=='string'||v.input_revision.length<1||v.input_revision.length>128)throw Error('输入版本必须为 1–128 字符');
 if(K.config(v.config).tx_angle_deg!==-30)throw Error('本课固定发射波束 −30°；导入不能改变 tx_angle_deg');const x=K.complexInput(v.x,[64,16],'x');K.complexInput(v.y,[16,64,8],'y');
 for(let i=0;i<x.length;i+=2)if(Math.hypot(x[i],x[i+1])<1e-12)throw Error('已知 X 不能含空子载波');
 if(v.y_ici_free_counterfactual!==undefined)K.complexInput(v.y_ici_free_counterfactual,[16,64,8],'y_ici_free_counterfactual');
 if(!(typeof v.noise_variance==='number'&&Number.isFinite(v.noise_variance)&&v.noise_variance>=1e-12&&v.noise_variance<=1e6))throw Error('噪声方差无效');
 if(v.max_wall_ms!==undefined&&(!Number.isInteger(v.max_wall_ms)||v.max_wall_ms<10||v.max_wall_ms>120000))throw Error('计算时间上限无效');
 if(v.expected_hashes!==undefined){for(const key of Object.keys(v.expected_hashes))if(!['x_sha256','y_sha256','y_ici_free_sha256'].includes(key))throw Error('未知校验字段');for(const key of ['x_sha256','y_sha256'])if(!/^[a-f0-9]{64}$/.test(v.expected_hashes[key]||''))throw Error('缺少完整 X/Y SHA-256');if(v.expected_hashes.y_ici_free_sha256!==undefined&&!/^[a-f0-9]{64}$/.test(v.expected_hashes.y_ici_free_sha256))throw Error('反事实 SHA-256 无效');}
 return v;
}
// Native JSON.stringify turns numeric -0 into 0, which would invalidate byte-identity hashes.
// Encode numeric tokens directly; strings still use native escaping. No marker replacement.
function encodeJSON(value){
 if(typeof value==='number')return Number.isFinite(value)?(Object.is(value,-0)?'-0.0':JSON.stringify(value)):'null';
 if(ArrayBuffer.isView(value))return '['+Array.from(value,v=>encodeJSON(v)??'null').join(',')+']';
 if(Array.isArray(value))return '['+Array.from(value,v=>encodeJSON(v)??'null').join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined&&typeof v!=='function'&&typeof v!=='symbol').map(([key,v])=>JSON.stringify(key)+':'+encodeJSON(v)).join(',')+'}';
 return JSON.stringify(value);
}
function recordJSON(value,limit=MAX_RECORD_BYTES){const text=encodeJSON(value);if(bytes(text)>limit)throw Error('导出超过 UTF-8 大小上限');return text;}
function evaluation(result,truth){return truth?{apes:E.evaluate(result.receiver.detections,truth,result.input.config,false),fft_known_x:E.evaluate(result.fft_known_x.detections,truth,result.input.config,true),fft_ici_free_counterfactual:result.fft_ici_free_counterfactual?E.evaluate(result.fft_ici_free_counterfactual.detections,truth,result.input.config,true):null}:null;}
class Controller{
 constructor(options={}){this.makeWorker=options.makeWorker||(()=>new Worker('labs/ofdm-ici/runtime/worker/ici-worker.js'));this.notify=options.onChange||(()=>{});this.client=null;this.epoch=0;this.counter=0;this.job=null;this.observation=null;this.completed=null;this.dirty='scene';this.state='idle';this.error=null;this.progress=null;this.source='simulation';}
 emit(){this.notify(this);}
 edit(kind='receiver'){this.epoch++;this.job?.cancel();this.job=null;this.progress=null;this.dirty=this.dirty==='scene'||kind==='scene'?'scene':'receiver';if(kind==='scene'){this.source='simulation';this.observation=null;}this.state='dirty';this.error=null;this.emit();}
 ensureClient(){if(this.client&&(this.client.failed||this.client.disposed)){this.client.dispose();this.client=null;}if(!this.client)this.client=new Client(this.makeWorker());return this.client;}
 async run(scene,config){
 const token=++this.epoch;this.job?.cancel();this.job=null;this.error=null;this.progress=null;this.state='running';this.emit();let job;
 try{
 const cfg=K.config(config);if(cfg.tx_angle_deg!==-30)throw Error('本课固定发射波束 −30°');const held=this.observation&&this.dirty!=='scene',revision='lesson-'+(++this.counter)+'-'+Date.now().toString(36);
 const request=held?{...this.observation.raw,input_revision:revision,config:cfg}:{schema_version:K.SCHEMA,input_revision:revision,mode:'simulate',config:cfg,simulation:clone(scene)};
 const truth=held?this.observation.truth:null,source=held?this.observation.source:'simulation';
 job=this.ensureClient().run(request,{onProgress:p=>{if(token===this.epoch){this.progress=p;this.emit();}}});this.job=job;
 const terminal=await job.result;if(token!==this.epoch)return {type:'stale'};
 this.job=null;this.progress=null;
 if(terminal.type!=='complete'){this.state=terminal.type;this.emit();return terminal;}
 const r=terminal.result,knownTruth=held?truth:r.truth_evaluation_only;
 // Only this locally completed computation may supply a result. Imported objects never enter this slot.
 this.observation={raw:K.exportRaw(r,revision),truth:knownTruth,source,generator:held?this.observation.generator:r.input.generator};
 this.completed={result:r,truth:knownTruth,evaluation:evaluation(r,knownTruth),source,generator:this.observation.generator,runId:job.runId,scene:source==='simulation'?clone(scene):null};
 this.source=source;this.dirty=null;this.state='complete';this.emit();return terminal;
 }catch(error){if(token!==this.epoch)return {type:'stale'};this.job=null;this.state='error';this.error=error;this.emit();return {type:'error',error};}
 }
 cancel(){this.epoch++;this.job?.cancel();this.job=null;this.state='cancelled';this.progress=null;this.emit();}
 reset(){this.epoch++;this.client?.reset();this.job=null;this.observation=null;this.completed=null;this.dirty='scene';this.source='simulation';this.state='idle';this.error=null;this.progress=null;this.emit();}
 async importFile(file){
 const token=++this.epoch;this.job?.cancel();this.job=null;this.state='importing';this.error=null;this.progress=null;this.emit();
 try{if(!file||!Number.isFinite(file.size)||file.size>MAX_IMPORT_BYTES)throw Error('导入文件超过 5 MiB 或大小未知');const text=await file.text();if(token!==this.epoch)return false;const raw=parseImport(text);if(token!==this.epoch)return false;this.observation={raw,truth:null,source:'imported-raw',generator:null};this.source='imported-raw';this.dirty='receiver';this.state='imported';this.emit();return raw;}catch(error){if(token!==this.epoch)return false;this.state='error';this.error=error;this.emit();return false;}
 }
 exportRaw(){if(!this.completed)throw Error('先完成一次计算');return recordJSON(K.exportRaw(this.completed.result,'exported-'+this.completed.result.provenance.input_revision),MAX_IMPORT_BYTES);}
 exportHistory(){if(!this.completed)throw Error('先完成一次计算');return recordJSON({schema_version:'ofdm-ici-lesson-history-v1',status:'historical-computation-record-not-a-fresh-input',lesson_version:'1.0.0',record:this.completed});}
 async dispose(){this.epoch++;this.job=null;this.state='disposed';await this.client?.dispose();}
}
// A view-only reconstruction of the exact declared CFAR stencil, never a second detector.
function inspectCFAR(map,c,q,d){if(q<0||q>=c.l||d<0||d>=c.m)return {tested:false,reason:'outside_retained_support'};const cells=new Set(),guards=new Set();for(let qi=Math.max(0,q-c.cfar_train[0]);qi<Math.min(c.l,q+c.cfar_train[0]+1);qi++)for(let dd=-c.cfar_train[1];dd<=c.cfar_train[1];dd++){const di=(d+dd+c.m)%c.m,delta=Math.min((di-d+c.m)%c.m,(d-di+c.m)%c.m),idx=qi*c.m+di;if(Math.abs(qi-q)<=c.cfar_guard[0]&&delta<=c.cfar_guard[1])guards.add(idx);else cells.add(idx);}const idx=q*c.m+d,power=map.power.data[idx],threshold=map.threshold.data[idx],count=map.training_cells.data[idx],mean=Array.from(cells).reduce((s,i)=>s+map.power.data[i],0)/cells.size,alpha=count*Math.expm1(-Math.log(c.pfa)/count);const neighbors=new Set();for(let qi=Math.max(0,q-1);qi<Math.min(c.l,q+2);qi++)for(let dd=-1;dd<=1;dd++)neighbors.add(qi*c.m+(d+dd+c.m)%c.m);neighbors.delete(idx);const local=power>Math.max(...Array.from(neighbors,i=>map.power.data[i]));return {tested:true,power,threshold,training_count:count,reconstructed_training_count:cells.size,training_mean:mean,multiplier:alpha,crosses_threshold:power>threshold,strict_local_maximum:local,recorded_detection:map.detections.some(x=>x.delay_samples===q&&x.slow_bin===d),training_indices:[...cells],guard_indices:[...guards],note:'Training stencil derived for inspection; threshold/count/detections read from actual runtime'};}
return {Controller,parseImport,recordJSON,inspectCFAR,MAX_IMPORT_BYTES,MAX_RECORD_BYTES};
});
