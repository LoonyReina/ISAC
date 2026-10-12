'use strict';
// Actual estimator + observation generator + worker, under a controlled DOM VM.
// This suite is not a rendered-browser, network or device-latency certificate.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function locate(flat,source){return fs.existsSync(path.join(root,flat))?path.join(root,flat):path.join(root,source);}
function read(flat,source){return fs.readFileSync(locate(flat,source),'utf8');}
const html=read('nearfield-gc-sage.html','content/pages/nearfield-gc-sage.html'),script=read('nearfield-gc-sage.js','labs/near-field/nearfield-gc-sage.js'),workerScript=read('nearfield-gc-sage-worker.js','labs/near-field/nearfield-gc-sage-worker.js'),core=read('nearfield-gc-sage-core.js','labs/near-field/nearfield-gc-sage-core.js'),observations=read('nearfield-gc-sage-observations.js','labs/near-field/nearfield-gc-sage-observations.js'),shell=read('experiment-record.js','shared/records/experiment-record.js'),css=read('nearfield-gc-sage.css','labs/near-field/nearfield-gc-sage.css');
const API=require(locate('nearfield-gc-sage.js','labs/near-field/nearfield-gc-sage.js')),G=require(locate('nearfield-gc-sage-core.js','labs/near-field/nearfield-gc-sage-core.js'));
const normalize=x=>JSON.parse(JSON.stringify(x,(_k,v)=>ArrayBuffer.isView(v)?Array.from(v):v));
function near(a,b,tol=1e-8){assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tol,`${a} != ${b}`);}
function setup({missingCore=false,missingObservations=false,missingWorker=false,missingRecord=false,workerImportFails=false,workerThrows=false,staleVersion=false}={}){
  class Element{
    constructor(id=''){this.id=id;this.value='';this.checked=false;this.hidden=false;this.disabled=false;this.open=false;this.dataset={};this.attrs={};this.events={};this.textContent='';this.innerHTML='';this.width=1100;this.height=220;}
    addEventListener(type,fn,capture=false){(this.events[type]??=[]).push({fn,capture});}
    setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}
    fire(type){const event={target:this,stopped:false,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}};for(const {fn} of [...(this.events[type]||[])].sort((a,b)=>Number(b.capture)-Number(a.capture))){fn(event);if(event.stopped)break;}return event;}
    getContext(){return null;}remove(){}append(){}
  }
  const els={},workers=[],events={},timers=new Map(),blobs=[],downloads=[];let timer=0,tick=0;
  for(const[,id]of html.matchAll(/\bid="([^"]+)"/g))els[id]=new Element(id);
  const initial={snr:'15',aperture:'1.49146747855',bandwidth:'1000000000',seed:'260501162',scene:'normal',budget:'reference',method:'hybrid',path:'0',history:'0','sample-q':'23','sample-p':'32'};
  Object.entries(initial).forEach(([k,v])=>els['gcs-'+k].value=v);els['gcs-auto'].checked=true;els['gcs-prediction-inspect'].checked=true;els['gcs-evaluation'].hidden=true;
  const forbidden=()=>{throw new Error('Unexpected network, persistence or autoplay');};
  class Worker{
    constructor(url){if(workerThrows)throw new Error('worker creation blocked');this.url=url;this.requests=[];this.messages=[];this.calls=[];this.terminated=false;workers.push(this);}
    postMessage(message,...transfer){assert.equal(transfer.length,0,'main Y must not be transferred away');this.requests.push(structuredClone(message));}
    terminate(){this.terminated=true;}
    compute(){
      const w=this,context=vm.createContext({performance:{now:()=>++tick},postMessage:m=>w.messages.push(structuredClone(m)),importScripts:url=>{assert.equal(url,'nearfield-gc-sage-core.js?v=gc-sage-live-20261012-1');if(workerImportFails)throw new Error('core import blocked');vm.runInContext(core,context);vm.runInContext(`const realCore=NearfieldGCSAGE;let privateInitial;NearfieldGCSAGE={...realCore,initialize(y,m,o){calls.push({kind:'initialize',hash:realCore.observationHash(y),modelKeys:Object.keys(m),options:{...o}});privateInitial=realCore.initialize(y,m,o);return privateInitial;},fit(y,m,mode,o,initial){calls.push({kind:'fit',mode,hash:realCore.observationHash(y),shared:initial===privateInitial,options:{...o}});return realCore.fit(y,m,mode,o,initial);}};`,context);},calls:this.calls});
      vm.runInContext('self=globalThis;',context);vm.runInContext(workerScript,context);context.onmessage({data:this.requests.at(-1)});return this.messages;
    }
    deliver(m){this.onmessage?.({data:structuredClone(m)});}
    finish(){this.compute();this.messages.forEach(m=>this.deliver(m));return this.messages;}
  }
  const context=vm.createContext({document:{getElementById:id=>els[id]||null,createElement:tag=>{const e=new Element();if(tag==='a')e.click=()=>downloads.push({href:e.href,name:e.download});return e;},body:{append(){}}},performance:{now:()=>++tick},addEventListener:(name,fn)=>(events[name]??=[]).push(fn),setTimeout:(fn,delay)=>{const id=++timer;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),Blob:class{constructor(parts){this.parts=parts;blobs.push(this);}},URL:{createObjectURL:()=>`blob:test-${blobs.length}`,revokeObjectURL(){}},fetch:forbidden,setInterval:forbidden,requestAnimationFrame:forbidden,localStorage:new Proxy({},{get:forbidden}),sessionStorage:new Proxy({},{get:forbidden})});
  vm.runInContext('window=globalThis;',context);if(!missingWorker)context.Worker=Worker;if(!missingCore)vm.runInContext(core,context);if(!missingObservations)vm.runInContext(observations,context);if(staleVersion)vm.runInContext("NearfieldGCSAGE={...NearfieldGCSAGE,VERSION:'obsolete'};",context);if(!missingRecord)vm.runInContext(shell,context);vm.runInContext(script,context);
  return {els,workers,context,events,timers,blobs,downloads,click:id=>els['gcs-'+id].fire('click'),change(id,value,type='change'){const e=els['gcs-'+id];if(typeof value==='boolean')e.checked=value;else e.value=String(value);e.fire(type);},flush(){for(const[id,t]of [...timers])if(t.delay===280){timers.delete(id);t.fn();}},run(){this.click('run');return workers.at(-1);},complete(){const w=this.run();w.finish();assert.equal(els['gcs-download'].disabled,false,els['gcs-status'].textContent);return this.download();},download(){const count=blobs.length;this.click('download');return blobs.length>count?JSON.parse(blobs.at(-1).parts[0]):null;}};
}
function cleared(s){assert.equal(s.els['gcs-download'].disabled,true);assert.equal(s.els['gcs-record-preview'].textContent,'');assert.equal(s.els['gcs-summary-scattering'].textContent,'尚未估计');assert.equal(s.els['gcs-summary-hybrid'].textContent,'尚未估计');assert.equal(s.els['gcs-evaluation'].hidden,true);assert.match(s.els['gcs-values'].textContent,/尚无/);}
let completedFixture;
function reusableMessages(){if(!completedFixture){const s=setup(),w=s.run();w.compute();completedFixture=w.messages;}return structuredClone(completedFixture);}
function deliverFixture(s,w=s.run()){for(const m of reusableMessages())w.deliver({...m,runId:w.requests[0].runId});return w;}

test('prediction-first default is paused, data-free and has no worker or exported record',()=>{
 const s=setup();cleared(s);assert.equal(s.workers.length,0);assert.equal(s.els['gcs-run'].disabled,false);assert.match(s.els['gcs-map-scattering'].innerHTML,/等待实际估计/);assert.equal(s.els['gcs-inspector'].open,false);assert.equal(s.download(),null);assert.equal(s.blobs.length,0);assert.equal(s.timers.size,0);
});
test('actual worker initializes once then fits same Y and per-family budget with private same-runtime handle',()=>{
 const s=setup(),w=s.run();w.finish();const r=s.download();assert.ok(r,s.els['gcs-status'].textContent);assert.equal(w.calls.length,3);assert.deepEqual(w.calls.map(c=>c.kind),['initialize','fit','fit']);assert.deepEqual(w.calls.filter(c=>c.kind==='fit').map(c=>c.mode),['scattering','hybrid']);assert.ok(w.calls.every(c=>c.hash===r.observations.observation_sha256));assert.ok(w.calls.slice(1).every(c=>c.shared));assert.deepEqual(w.calls[1].options,w.calls[2].options);
 assert.deepEqual(Object.keys(w.requests[0]).sort(),['model','observations','options','runId']);assert.deepEqual(Object.keys(w.requests[0].model).sort(),['frequencies','max_delay_ns','path_count','reference_pair','region','rx','tx']);assert.equal(w.requests[0].model.path_count,2);assert.equal(w.requests[0].observations.real.length,3072);assert.equal(r.observations.real.length,3072);assert.equal(r.observations.imag.length,3072);assert.equal(r.results.scattering.observation_sha256,r.results.hybrid.observation_sha256);assert.equal(r.observations.observation_sha256,'45022c1d55ce93d7626aa47881fa66dbc2328883c03cc4d5aa0368794b003788');
 near(r.results.scattering.trace.at(-1).sse,158.1824937173,1e-7);near(r.results.hybrid.trace.at(-1).sse,155.0922726406,1e-7);assert.ok(r.results.hybrid.budget.reflection_candidates>0);assert.equal(r.results.scattering.budget.reflection_candidates,0);assert.match(s.els['gcs-common-cost'].textContent,/同一运行时初始化一次/);assert.match(s.els['gcs-summary-hybrid'].textContent,/目标稳定|未证明收敛/);
});
test('complete JSON retains actual Y, histories, nulls, timing, separate truth and bounded preview',()=>{
 const s=setup();deliverFixture(s);const r=s.download();assert.ok(r);assert.equal(r.algorithm_version,G.VERSION);assert.equal(r.receiver_input.model.reference_pair,23);assert.equal(r.receiver_input.ledger.evaluation_only,undefined);assert.equal(r.receiver_input.model.truth,undefined);assert.equal(r.evaluation_only.truth.evaluation_only,true);assert.equal(r.evaluation_only.metrics.scattering.mechanisms_correct,null);assert.ok(r.timing.worker_total_ms>=0);assert.ok(r.timing.end_to_end_ms>=0);assert.ok(r.completed_at);assert.equal(r.initialization.shared_once_in_same_worker,true);assert.ok(s.downloads.at(-1).name.endsWith('.json'));
 s.els['gcs-record'].open=true;s.els['gcs-record'].fire('toggle');const preview=s.els['gcs-record-preview'].textContent;assert.ok(preview.length<=12000);assert.equal(JSON.parse(preview).previewInfo.completeRecord,false);assert.ok(r.results.hybrid.history.updates.length>0);assert.equal(r.results.hybrid.history.initial.states[0].point,null);
});
test('truth, path, and history controls never regenerate observations or call worker; record stays atomic',()=>{
 const s=setup();deliverFixture(s);const before=s.download(),count=s.workers.length;s.change('truth',true);assert.equal(s.els['gcs-evaluation'].hidden,false);assert.match(s.els['gcs-truth-summary'].textContent,/实际接收 SNR/);assert.match(s.els['gcs-map-hybrid'].innerHTML,/真值/);s.change('path',1);s.change('history',0,'input');assert.equal(s.workers.length,count);assert.match(s.els['gcs-map-hybrid'].innerHTML,/尚未得到有效几何/);assert.equal(s.els['gcs-map-hybrid'].attrs['data-history-index'],'0');assert.match(s.els['gcs-values'].textContent,/null（未定位）/);assert.deepEqual(s.download(),before);s.change('truth',false);assert.doesNotMatch(s.els['gcs-map-hybrid'].innerHTML,/真值（紫色）/);assert.equal(s.els['gcs-evaluation'].hidden,true);
});
test('every real history frame recomputes SSE and final geometry, with two identical metric axes',()=>{
 const s=setup();deliverFixture(s);const r=s.download();for(const mode of ['scattering','hybrid']){const result=r.results[mode];for(let i=0;i<result.trace.length;i++){const states=API.replayHistory(result,i),pred=G.predict(states,r.receiver_input.model.frequencies);near(G.residualSSE(r.observations,pred),result.trace[i].sse,1e-8);}const final=API.replayHistory(result,result.trace.length-1);for(let i=0;i<2;i++)for(const key of ['kind','point','normal','gains','delays','bounce_points'])assert.deepEqual(normalize(final[i][key]),normalize(result.states[i][key]));}
 for(const mode of ['scattering','hybrid']){const map=s.els['gcs-map-'+mode].innerHTML;assert.match(map,/相同范围 −0.5 到 7 m，等比例/);assert.match(map,/width="500" height="500"/);assert.doesNotMatch(map,/NaN|Infinity/);}s.change('history',0,'input');s.click('next');assert.equal(s.els['gcs-history'].value,1);s.click('prev');assert.equal(s.els['gcs-history'].value,0);s.click('final');assert.equal(s.els['gcs-history'].value,r.results.hybrid.trace.length-1);
});
test('fresh acquisition edits recompute model and observations while stale messages are ignored',()=>{
 const s=setup(),w=deliverFixture(s),old=reusableMessages();s.change('aperture','.35','input');cleared(s);assert.equal(w.terminated,true);s.change('aperture','.35');s.flush();const next=s.workers.at(-1);assert.equal(next.requests[0].model.rx.at(-1)[0],2.35);assert.notEqual(G.observationHash(next.requests[0].observations),G.observationHash(w.requests[0].observations));for(const m of old)w.deliver({...m,runId:w.requests[0].runId});cleared(s);assert.match(s.els['gcs-status'].textContent,/正在生成/);assert.equal(s.download(),null);
});
test('budget-only changes preserve exact Y but use declared new per-family settings',()=>{
 const s=setup();deliverFixture(s);const first=s.download();s.change('budget','reduced');s.flush();const w=s.workers.at(-1);assert.equal(G.observationHash(w.requests[0].observations),first.observations.observation_sha256);assert.equal(w.requests[0].options.angle_grid,128);assert.equal(w.requests[0].options.max_sweeps,6);w.finish();const second=s.download();assert.ok(second,s.els['gcs-status'].textContent);assert.equal(second.simulator.observations_reused_for_budget_only,true);assert.deepEqual(second.observations,first.observations);assert.equal(second.receiver_input.options.angle_grid,128);
});
test('new noise changes visible seed and actual Y; same seed/config generation is reproducible',()=>{
 const s=setup();deliverFixture(s);const first=s.download();s.click('noise');const w=s.workers.at(-1);assert.equal(s.els['gcs-seed'].value,'260501163');assert.notEqual(G.observationHash(w.requests[0].observations),first.observations.observation_sha256);s.click('cancel');s.els['gcs-seed'].value='260501162';const same=s.run();assert.equal(G.observationHash(same.requests[0].observations),first.observations.observation_sha256);assert.equal(same.requests[0].observations.real.length,3072);
});
test('reference-blind preset restores declared defaults without putting truth into solver inputs',()=>{
 const s=setup();s.change('bandwidth','20000000');s.change('seed','10');s.change('budget','reduced');s.change('scene','reference-blind');assert.equal(s.els['gcs-bandwidth'].value,'1000000000');assert.equal(s.els['gcs-budget'].value,'reference');assert.equal(s.els['gcs-seed'].value,'260501162');const w=s.run();assert.equal(w.requests[0].model.reference_pair,23);assert.equal(w.requests[0].truth,undefined);assert.equal(w.requests[0].seed,undefined);assert.equal(w.requests[0].scene,undefined);assert.equal(w.requests[0].model.rx.length,48);assert.notEqual(G.observationHash(w.requests[0].observations),'45022c1d55ce93d7626aa47881fa66dbc2328883c03cc4d5aa0368794b003788');
});
test('cancel truly terminates worker in every phase and forbids partial-comparison export',()=>{
 for(const phase of ['initializing','scattering','hybrid']){const s=setup(),w=s.run();const messages=reusableMessages();for(const m of messages){w.deliver({...m,runId:w.requests[0].runId});if(m.type==='phase'&&m.phase===phase)break;}assert.equal(s.download(),null);s.click('cancel');cleared(s);assert.equal(w.terminated,true);messages.forEach(m=>w.deliver({...m,runId:w.requests[0].runId}));cleared(s);assert.match(s.els['gcs-status'].textContent,/已终止/);}
});
test('silent edits cannot export old Blob or accept pending result under new controls',()=>{
 const s=setup();deliverFixture(s);s.els['gcs-seed'].value='12';const n=s.blobs.length;assert.equal(s.download(),null);assert.equal(s.blobs.length,n);cleared(s);const t=setup(),w=t.run();t.els['gcs-bandwidth'].value='20000000';for(const m of reusableMessages())w.deliver({...m,runId:w.requests[0].runId});cleared(t);assert.match(t.els['gcs-status'].textContent,/设置已改变/);
});
test('reset clears completed results, pending debounce and cached observation reuse',()=>{
 const s=setup();deliverFixture(s);s.els['gcs-auto'].checked=false;s.els['gcs-method'].value='scattering';s.els['gcs-path'].value='1';s.els['gcs-sample-q'].value='0';s.els['gcs-sample-p'].value='0';s.els['gcs-prediction-certain'].checked=true;s.els['gcs-prediction-inspect'].checked=false;s.change('seed','1');s.click('reset');s.flush();cleared(s);assert.equal(s.els['gcs-seed'].value,'260501162');assert.equal(s.els['gcs-scene'].value,'normal');assert.equal(s.workers.length,1);assert.match(s.els['gcs-status'].textContent,/已恢复默认/);assert.equal(s.els['gcs-truth'].checked,false);assert.equal(s.els['gcs-auto'].checked,true);assert.equal(s.els['gcs-method'].value,'hybrid');assert.equal(s.els['gcs-path'].value,'0');assert.equal(s.els['gcs-sample-q'].value,'23');assert.equal(s.els['gcs-sample-p'].value,'32');assert.equal(s.els['gcs-prediction-certain'].checked,false);assert.equal(s.els['gcs-prediction-inspect'].checked,true);
});
test('invalid and unsupported controls clear all old numerical output and are never silently substituted',()=>{
 for(const[id,value]of [['seed',''],['seed','1.5'],['seed','4294967296'],['seed','-1'],['bandwidth','2000000000'],['aperture','100'],['budget','unknown'],['scene','invented']]){const s=setup();deliverFixture(s);s.els['gcs-'+id].value=value;s.run();cleared(s);assert.equal(s.workers.length,1);assert.match(s.els['gcs-status'].textContent,/未完成/);}
});
test('missing modules, unavailable Worker and main version mismatch disable live controls with explanation',()=>{
 for(const options of [{missingCore:true},{missingObservations:true},{missingWorker:true},{missingRecord:true},{staleVersion:true}]){const s=setup(options);cleared(s);assert.equal(s.els['gcs-run'].disabled,true);assert.equal(s.els['gcs-snr'].disabled,true);assert.match(s.els['gcs-status'].textContent,/未完成/);assert.ok(html.includes('把每一步接回原文'));}
});
test('worker imports only estimator and rejects truth-bearing messages and version/import failures',()=>{
 const s=setup({workerImportFails:true}),w=s.run();const out=w.finish();assert.equal(out.at(-1).type,'error');cleared(s);assert.match(s.els['gcs-status'].textContent,/核心加载失败/);
 const t=setup(),bad=t.run();bad.requests[0].truth={point:[1,1]};assert.equal(bad.compute().at(-1).type,'error');assert.match(bad.messages.at(-1).message,/只接受/);
 const u=setup({workerThrows:true});u.run();cleared(u);assert.match(u.els['gcs-status'].textContent,/worker creation blocked/);
 assert.equal((workerScript.match(/importScripts\(/g)||[]).length,1);assert.doesNotMatch(workerScript,/observations\.js|GCSAGEObservations|fetch\(|localStorage/);
});
test('nonfinite, mixed-version, inconsistent-hash and inconsistent-history results fail closed',()=>{
 for(const mutate of [r=>r.algorithm_version='old',r=>r.observation_sha256='bad',r=>r.history.schema_version='old',r=>r.trace.at(-1).sse=NaN,r=>r.trace.at(-1).sse+=1,r=>r.history.updates=[],r=>r.stopping_reason='fabricated']){const s=setup(),w=s.run(),messages=reusableMessages();const m=messages.find(m=>m.type==='result');mutate(m.result);for(const data of messages){w.deliver({...data,runId:w.requests[0].runId});if(data===m)break;}cleared(s);assert.match(s.els['gcs-status'].textContent,/未完成/);}
 const s=setup(),w=s.run();w.onerror({message:'blocked'});cleared(s);assert.match(s.els['gcs-status'].textContent,/Worker/);deliverFixture(s);assert.equal(s.els['gcs-download'].disabled,false);
});
test('wrong run IDs and late worker errors cannot mutate current accepted comparison',()=>{
 const s=setup(),old=s.run();s.click('cancel');deliverFixture(s);const before=s.download(),message=reusableMessages().find(m=>m.type==='result');old.deliver(message);old.onerror({message:'late'});assert.deepEqual(s.download(),before);const next=s.run();for(const m of reusableMessages())next.deliver({...m,runId:next.requests[0].runId+50});cleared(s);
});
test('auto toggle permits deliberate predictions; inspection and resize do not rewrite records',()=>{
 const s=setup();deliverFixture(s);s.change('auto',false);s.change('snr','20');s.flush();assert.equal(s.workers.length,1);cleared(s);s.change('auto',true);s.flush();assert.equal(s.workers.length,2);
 const t=setup();deliverFixture(t);const record=t.download();for(const fn of t.events.resize||[])fn();t.change('history',0,'input');t.change('method','scattering');assert.deepEqual(t.download(),record);
});
test('semantic labels, six anchors, equal-map layout, keyboard history and no autoplay/storage',()=>{
 for(const id of ['question','model','experiment','paper','limits','reproduce'])assert.ok(html.includes('id="'+id+'"'));
 for(const id of ['snr','aperture','bandwidth','scene','seed','budget','method','path','history','sample-q','sample-p'])assert.ok(html.includes('for="gcs-'+id+'"'),id);
 for(const id of ['run','cancel','reset','noise','prev','next','final','download'])assert.match(html,new RegExp('<button[^>]*id="gcs-'+id+'"[^>]*>|<button[^>]*id="gcs-'+id+'"'));
 for(const term of ['路径数恰为 2','不是完整 GC-SAGE','arxiv.org/pdf/2605.01162v1','每个建模通道','cτ/2','不是相同总计算量','回看已计算更新','参考位置漏掉反射路径','默认暂停','每格 Y 是复数','<noscript>'])assert.ok(html.includes(term),term);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);assert.match(css,/aspect-ratio:1/);assert.match(css,/:focus-visible/);assert.match(css,/prefers-reduced-motion/);assert.doesNotMatch(script,/setInterval|requestAnimationFrame|Math\.random|fetch\(|localStorage|sessionStorage|\.focus\(|scrollIntoView/);assert.doesNotMatch(html,/<input[^>]*type="file"/);
});

test('real reference-blind solve preserves missed truth path even when objective converges',()=>{
 const s=setup();s.change('scene','reference-blind');const r=s.complete();assert.equal(r.simulator.config.scene,'reference-blind');assert.equal(r.evaluation_only.truth.visibility[1][23],false);assert.ok(['scattering','hybrid'].every(m=>r.results[m].converged));assert.match(s.els['gcs-status'].textContent,/目标已稳定/);s.change('truth',true);assert.match(s.els['gcs-truth-summary'].textContent,/参考位置不可见/);assert.ok(r.evaluation_only.metrics.hybrid.paths.some(p=>!p.matched));
});
test('real reduced-budget narrowband solve preserves budget status and unmatched null errors',()=>{
 const s=setup();s.change('bandwidth','20000000');s.change('budget','reduced');const r=s.complete();assert.ok(['scattering','hybrid'].some(m=>!r.results[m].converged));assert.match(s.els['gcs-status'].textContent,/预算上限/);for(const mode of ['scattering','hybrid'])for(const state of r.results[mode].states)if(state.kind==='unlocalized'){assert.equal(state.point,null);assert.equal(state.normal,null);assert.equal(state.bounce_points,null);}s.change('truth',true);assert.ok(r.evaluation_only.metrics.hybrid.paths.some(p=>p.interaction_rmse_m===null));s.change('history',0,'input');assert.match(s.els['gcs-values'].textContent,/null（未定位）/);
});

test('prediction feedback follows the learner choice only after truth reveal without recomputing',()=>{
 const s=setup();deliverFixture(s);const count=s.workers.length;
 s.els['gcs-prediction-certain'].checked=true;s.els['gcs-prediction-inspect'].checked=false;s.els['gcs-prediction-certain'].fire('change');assert.equal(s.els['gcs-prediction-feedback'].textContent,'');
 s.els['gcs-truth'].checked=true;s.els['gcs-truth'].fire('change');assert.match(s.els['gcs-prediction-feedback'].textContent,/你预测“残差低就一定更准”/);assert.match(s.els['gcs-prediction-feedback'].textContent,/不保证/);
 s.els['gcs-prediction-certain'].checked=false;s.els['gcs-prediction-not-certain'].checked=true;s.els['gcs-prediction-not-certain'].fire('change');assert.match(s.els['gcs-prediction-feedback'].textContent,/你预测“不一定更准”/);assert.equal(s.workers.length,count);
});
