'use strict';
// Real numerical core + real worker script in a controlled DOM/Worker VM.
// These checks are behavioral, not a browser-layout or live-network certificate.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
function read(publicPath,sourcePath){const p=path.join(root,publicPath);return fs.readFileSync(fs.existsSync(p)?p:path.join(root,sourcePath),'utf8');}
const html=read('theory.html','content/pages/theory.html'),script=read('capacity-distortion.js','labs/capacity-distortion/capacity-distortion.js'),workerScript=read('capacity-distortion-worker.js','labs/capacity-distortion/capacity-distortion-worker.js'),core=read('capacity-distortion-core.js','labs/capacity-distortion/capacity-distortion-core.js'),shell=read('experiment-record.js','shared/records/experiment-record.js'),css=read('capacity-distortion.css','labs/capacity-distortion/capacity-distortion.css');
const normalize=x=>JSON.parse(JSON.stringify(x)),near=(x,y,t=1e-9)=>a.ok(Number.isFinite(x)&&Math.abs(x-y)<=t,`${x} ≠ ${y}`);
function setup({missingCore=false,missingWorker=false,missingShell=false,workerCoreMissing=false,workerThrows=false,width=560}={}){
 class E{
  constructor(id=''){this.id=id;this.children=[];this.attrs={};this.events={};this.value='';this.checked=false;this.open=false;this.hidden=false;this.disabled=false;this.clientWidth=width;this._text='';}
  set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
  set innerHTML(_){throw Error('unsafe HTML sink');}setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}
  append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;this._text='';}addEventListener(t,f){(this.events[t]??=[]).push(f);}
  fire(t,extra={}){for(const f of this.events[t]||[])f({target:this,...extra});}remove(){}
 }
 const els={},events={},workers=[],timers=new Map(),blobs=[],downloads=[],urls=[],revoked=[];let timerId=0,tick=0;
 for(const[,id]of html.matchAll(/\bid="([^"]+)"/g))els[id]=new E(id);
 const trap=()=>{throw Error('forbidden remote/storage/automatic effect');};
 class W{
  constructor(url){if(workerThrows)throw Error('Worker constructor failed');this.url=url;this.terminated=false;this.messages=[];this.requests=[];this.solveCalls=[];workers.push(this);}
  postMessage(request){this.requests.push(normalize(request));}
  terminate(){this.terminated=true;}
  compute(){
   const w=this,ctx=vm.createContext({performance:{now:()=>++tick},postMessage:m=>w.messages.push(normalize(m)),importScripts:url=>{a.equal(url,'capacity-distortion-core.js?v=finite-ba-v1');if(workerCoreMissing)throw Error('core request blocked');vm.runInContext(core,ctx);vm.runInContext('const actualCore=CapacityDistortion;CapacityDistortion={...actualCore,solve(m,o){solveCalls.push(JSON.parse(JSON.stringify(o)));return actualCore.solve(m,o);}};',ctx);},solveCalls:this.solveCalls});
   vm.runInContext('self=globalThis;',ctx);vm.runInContext(workerScript,ctx);ctx.self.onmessage({data:this.requests.at(-1)});return this.messages;
  }
  deliver(message){if(this.onmessage)this.onmessage({data:message});}
  finish(){this.compute();for(const m of this.messages)this.deliver(m);return this.messages.at(-1);}
 }
 const context=vm.createContext({document:{getElementById:id=>els[id]||null,createElementNS:()=>new E(),createElement:tag=>{const e=new E();if(tag==='a')e.click=()=>downloads.push({href:e.href,filename:e.download});return e;},body:{append(){}}},performance:{now:()=>++tick},addEventListener:(t,f)=>(events[t]??=[]).push(f),setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),Blob:class{constructor(parts,options){this.parts=parts;this.options=options;blobs.push(this);}},URL:{createObjectURL:()=>{const u='blob:cd-'+urls.length;urls.push(u);return u;},revokeObjectURL:u=>revoked.push(u)},fetch:trap,requestAnimationFrame:trap,setInterval:trap,localStorage:new Proxy({},{get:trap}),sessionStorage:new Proxy({},{get:trap})});
 vm.runInContext('window=globalThis;',context);if(!missingWorker)context.Worker=W;if(!missingCore)vm.runInContext(core,context);if(!missingShell)vm.runInContext(shell,context);vm.runInContext(script,context);
 return {els,events,workers,timers,blobs,downloads,urls,revoked,context,click:id=>els[id].fire('click'),change(id,value,type='input'){if(typeof value==='boolean')els[id].checked=value;else els[id].value=String(value);els[id].fire(type);},flush(){for(const[id,t]of [...timers])if(t.delay===240){timers.delete(id);t.fn();}},resize(){for(const f of events.resize||[])f();},run(){els['cd-run'].fire('click');return workers.at(-1);},complete(){const w=this.run();const m=w.finish();a.equal(m.type,'result',JSON.stringify(m));return m.result;},download(){els['cd-record-download'].fire('click');return blobs.length?JSON.parse(blobs.at(-1).parts[0]):null;}};
}
const series=(s,id,name)=>s.els[id].children.filter(n=>n.attrs['data-series']===name);
const markers=s=>s.els['cd-frontier'].children.filter(n=>n.attrs['data-mu']!==undefined);
const probabilities=s=>s.els['cd-pmf'].children.filter(n=>n.attrs['data-input']!==undefined).map(n=>Number(n.attrs['data-probability']));
function extension(s,budget=.7){s.change('cd-model','binary-extension');s.change('cd-cost',true);s.change('cd-budget',budget);}
function checkCleared(s){a.equal(s.els['cd-results'].hidden,true);for(const id of ['cd-pmf','cd-frontier','cd-objective','cd-gap','cd-metrics','cd-step-cards','cd-posterior-body','cd-trace-body','cd-frontier-body'])a.equal(s.els[id].children.length,0,id);a.equal(s.els['cd-record-download'].disabled,true);a.equal(s.els['cd-record-preview'].textContent,'');}

test('prediction-first default has no implicit solve, graph, export or animation',()=>{
 const s=setup();checkCleared(s);a.equal(s.workers.length,0);a.equal(s.els['cd-run'].disabled,false);a.equal(s.els['cd-q'].value,'.4');a.equal(s.els['cd-mu'].value,'2');a.equal(s.els['cd-cap'].value,'2000');a.equal(s.els['cd-step'].disabled,true);a.equal(s.els['cd-trace-details'].open,false);
 s.change('cd-prediction','one','change');a.equal(s.workers.length,0);a.equal(s.download(),null);
});
test('happy path executes actual worker BA for selected mu and every frontier point',()=>{
 const s=setup();s.change('cd-prediction','one','change');const result=s.complete(),r=result.selected,w=s.workers[0];
 a.equal(s.els['cd-results'].hidden,false,s.els['cd-status'].textContent);a.equal(w.solveCalls.length,result.frontier.length);a.ok(w.solveCalls.every(c=>c.initialP===undefined));a.equal(r.status,'converged');near(r.p[0],1/(1+Math.exp(2)),1e-7);a.deepEqual(probabilities(s),r.p);a.equal(markers(s).length,result.frontier.length);a.match(s.els['cd-prediction-note'].textContent,/多发 X=1/);a.match(s.els['cd-status'].textContent,/本机本次测量/);
 for(const point of result.frontier){const node=markers(s).find(n=>Number(n.attrs['data-mu'])===point.mu);near(Number(node.attrs['data-distortion']),point.distortion);near(Number(node.attrs['data-rate']),point.rateBits);a.equal(node.attrs['data-certified'],String(point.converged));a.equal(point.trace,undefined);}
 a.equal(series(s,'cd-frontier','selected-iterate-path').length,1);a.equal(series(s,'cd-frontier','analytic-oracle').length,1);a.equal(series(s,'cd-frontier','paper-separation').length,1);a.equal(series(s,'cd-frontier','budget-plateau').length,1);a.equal(series(s,'cd-frontier','exact-endpoint').length,1);a.equal(result.exactEndpoint.origin,'direct-degenerate-evaluation-not-finite-mu');a.equal(result.exactEndpoint.distortion,0);
});
test('paper separation uses (0,0) to (q,q), with distinct achieved frontier and budget plateau',()=>{
 const s=setup();s.complete();const svg=s.els['cd-frontier'],baseline=series(s,'cd-frontier','paper-separation')[0].attrs.points.split(' ').map(p=>p.split(',').map(Number)),plateau=series(s,'cd-frontier','budget-plateau')[0].attrs.points.split(' ').map(p=>p.split(',').map(Number));
 const x0=58,xq=560-17;near(baseline[0][0],x0);near(baseline[1][0],xq);near(plateau[0][0],(x0+xq)/2);near(plateau[1][0],xq);near(plateau[0][1],baseline[1][1]);a.match(s.els['cd-overlay-note'].textContent,/通信阶段不用反馈感知/);a.equal(svg.attrs['data-x-max'],'0.4');
});
test('input event clears stale plots/export immediately, then debounces actual fresh inputs',()=>{
 const s=setup();const first=s.complete();const old=s.workers[0];s.change('cd-q','.2');checkCleared(s);a.equal(s.workers.length,1);a.equal(old.terminated,true);s.change('cd-mu','4');s.flush();a.equal(s.workers.length,2);const w=s.workers.at(-1);a.deepEqual(w.requests[0].model.ps,[.8,.2]);a.equal(w.requests[0].settings.mu,4);const r=w.finish().result;near(r.selected.distortion,.2/(1+Math.exp(4)),1e-7);a.notEqual(r.selected.rateBits,first.selected.rateBits);a.equal(s.els['cd-results'].hidden,false);
});
test('superseded worker results and progress cannot overwrite a newer result',()=>{
 const s=setup(),old=s.run();old.compute();s.change('cd-q','.1');a.equal(old.terminated,true);s.flush();const newer=s.workers.at(-1),answer=newer.finish().result,currentText=s.els['cd-status'].textContent;
 for(const message of old.messages)old.deliver(message);a.equal(s.els['cd-status'].textContent,currentText);near(s.download().controls.q,.1);a.deepEqual(probabilities(s),answer.selected.p);old.onerror({message:'late worker error'});a.equal(s.els['cd-results'].hidden,false);
});
test('wrong request token is ignored; silent input changes before reply start a fresh request',()=>{
 const s=setup(),w=s.run();const msg=w.compute().at(-1);w.deliver({...msg,token:msg.token+1});checkCleared(s);s.els['cd-mu'].value='3';w.deliver(msg);checkCleared(s);s.flush();a.equal(s.workers.length,2);s.workers.at(-1).finish();a.equal(s.download().controls.mu,3);
});
test('cancel and reset terminate work and leave unrevealed defaults without stale results',()=>{
 const s=setup(),w=s.run();w.compute();s.click('cd-cancel');a.equal(w.terminated,true);checkCleared(s);w.deliver(w.messages.at(-1));checkCleared(s);a.match(s.els['cd-status'].textContent,/已取消/);s.complete();s.els['cd-record-details'].open=true;s.els['cd-trace-details'].open=true;s.change('cd-q','.5');s.click('cd-reset');s.flush();checkCleared(s);a.equal(s.els['cd-q'].value,'.4');a.equal(s.els['cd-record-details'].open,false);a.equal(s.els['cd-trace-details'].open,false);a.equal(s.els['cd-step'].disabled,true);a.match(s.els['cd-status'].textContent,/尚未运行/);
});
test('errors after success clear every graph, number and record; valid rerun recovers',()=>{
 const s=setup();s.complete();s.change('cd-q','');checkCleared(s);a.match(s.els['cd-status'].textContent,/失败.*清除旧图/);s.change('cd-q','.4');s.flush();s.workers.at(-1).finish();a.equal(s.els['cd-results'].hidden,false);const w=s.run();w.onerror({message:'script blocked'});checkCleared(s);a.match(s.els['cd-status'].textContent,/Worker/);s.complete();a.equal(s.els['cd-results'].hidden,false);
});
test('missing core, Worker, worker-imported core and constructor failure remain readable',()=>{
 for(const options of [{missingCore:true},{missingWorker:true}]){const s=setup(options);checkCleared(s);a.equal(s.els['cd-run'].disabled,true);a.equal(s.els['cd-primary-controls'].disabled,true);a.match(s.els['cd-status'].textContent,/未能加载|Web Worker/);}
 const s=setup({workerCoreMissing:true}),w=s.run();a.equal(w.finish().type,'error');checkCleared(s);a.match(s.els['cd-status'].textContent,/核心未能加载/);
 const t=setup({workerThrows:true});t.run();checkCleared(t);a.match(t.els['cd-status'].textContent,/constructor failed/);
});
test('missing shared record shell disables only export, not the numerical lesson',()=>{
 const s=setup({missingShell:true});s.complete();a.equal(s.els['cd-results'].hidden,false);a.equal(s.els['cd-record-download'].disabled,true);a.match(s.els['cd-record-status'].textContent,/导出组件未能加载/);a.equal(s.download(),null);
});
test('selected iterate inspector binds actual previous posterior, PMF, multiplier and current metrics without solving',()=>{
 const s=setup(),result=s.complete(),workerCount=s.workers.length,trace=result.selected.trace;s.change('cd-step',1);a.equal(s.workers.length,workerCount);a.deepEqual(probabilities(s),trace[1].p);a.match(s.els['cd-step-cards'].textContent,/p̄0=\[0.5, 0.5\]/);a.match(s.els['cd-posterior-body'].textContent,/不可达/);a.equal(series(s,'cd-frontier','selected-step')[0].attrs['data-iteration'],'1');a.equal(s.download().inspection.iteration,1);
 s.change('cd-step',0);a.deepEqual(probabilities(s),trace[0].p);a.match(s.els['cd-step-cards'].textContent,/尚未进行输入更新/);a.equal(s.els['cd-trace-body'].children.length,0);s.els['cd-trace-details'].open=true;s.els['cd-trace-details'].fire('toggle');a.equal(s.els['cd-trace-body'].children.length,trace.length);a.equal(s.workers.length,workerCount);
});
test('cost-constrained iteration inspector exposes feasible/infeasible initialization and true dual updates',()=>{
 const s=setup();extension(s,.2);s.change('cd-noise',0);const r=s.complete().selected;a.equal(r.trace[0].feasible,false);s.change('cd-step',0);a.match(s.els['cd-step-cards'].textContent,/初始成本不可行/);s.change('cd-step',1);a.ok(r.trace[1].updateLambda>0);a.match(s.els['cd-step-cards'].textContent,/输入更新 λ=/);near(r.cost,.2,1e-9);a.equal(s.els['cd-oracle'].disabled,true);a.equal(series(s,'cd-frontier','analytic-oracle').length,0);
});
test('max-iteration points remain explicitly uncertified and are not joined into a smooth optimum',()=>{
 const s=setup();s.change('cd-cap',0);const result=s.complete();a.equal(result.selected.status,'max_iterations');a.match(s.els['cd-status'].textContent,/上限 · 未收敛/);a.equal(series(s,'cd-frontier','certified-frontier').length,0);const pending=markers(s).filter(n=>n.attrs['data-certified']==='false');a.ok(pending.length>0);a.ok(pending.every(n=>n.attrs.fill==='#fff'&&n.attrs.stroke==='#a74613'));a.equal(s.download().selectedResult.converged,false);
});
test('noise extension reruns both channel and feedback; analytic overlays remain invalid',()=>{
 const s=setup();s.change('cd-model','binary-extension');s.change('cd-noise','.2');const first=s.complete();near(first.model.wy[1][1][0],.2);a.deepEqual(first.model.wy,first.model.vz);a.ok(first.risk.costs[1]>0);a.equal(s.els['cd-oracle'].disabled,true);a.equal(series(s,'cd-frontier','analytic-oracle').length,0);a.equal(series(s,'cd-frontier','paper-separation').length,0);s.change('cd-noise','.3');s.flush();const next=s.workers.at(-1).finish().result;a.notEqual(first.selected.rateBits,next.selected.rateBits);a.notEqual(first.selected.distortion,next.selected.distortion);
});
test('generic ternary preset and feedback-strength change execute the general core',()=>{
 const s=setup();s.change('cd-model','ternary');s.change('cd-budget','.9');s.change('cd-mu','0');const r=s.complete();a.equal(s.els['cd-q'].disabled,true);a.equal(r.model.dimensions.inputs,3);near(r.selected.p[0],.4328769342224575,1e-6);near(r.selected.rateBits,.6423078718112164,1e-7);a.deepEqual(r.risk.costs,[.35,.2175,.05]);a.equal(probabilities(s).length,3);a.equal(s.download().model.jointConvention,'wy times vz given s,x (conditionally independent)');s.change('cd-feedback','0');s.flush();const modified=s.workers.at(-1).finish().result;a.deepEqual(modified.risk.costs,[.35,.35,.35]);a.equal(series(s,'cd-frontier','analytic-oracle').length,0);
});
test('q=0 and q=0.5 handle nonuniqueness and ties without nonfinite chart coordinates',()=>{
 const s=setup();s.change('cd-q',0);const r=s.complete();a.equal(r.selected.rateBits,0);a.equal(r.selected.distortion,0);a.match(s.els['cd-pmf-note'].textContent,/最优分布不唯一/);a.equal(series(s,'cd-frontier','analytic-oracle').length,0);for(const id of ['cd-pmf','cd-frontier','cd-objective','cd-gap'])for(const n of s.els[id].children)a.doesNotMatch(JSON.stringify(n.attrs),/NaN|Infinity/);s.change('cd-q','.5');s.flush();const t=s.workers.at(-1).finish().result;a.equal(t.risk.estimator[0][0],0);
});
test('exact minimum-cost boundary is direct support reduction; negative budget yields no invented optimum',()=>{
 const s=setup();extension(s,0);s.change('cd-noise',0);const r=s.complete();a.equal(r.selected.exactCostBoundary,true);a.deepEqual(r.selected.p,[1,0]);a.equal(r.selected.rateBits,0);a.match(s.els['cd-status'].textContent,/精确最低成本支持/);s.change('cd-budget','-.1');s.flush();const fail=s.workers.at(-1).finish().result;a.equal(fail.selected.status,'infeasible_cost');a.equal(s.els['cd-results'].hidden,false);for(const id of ['cd-pmf','cd-frontier','cd-objective','cd-gap'])a.equal(s.els[id].children.length,0);a.match(s.els['cd-pmf-note'].textContent,/没有可行分布/);const record=s.download();a.equal(record.selectedResult.p,null);a.deepEqual(record.frontier,[]);
});
test('export is a fresh full actual record, with bounded preview and no artificial seed',()=>{
 const s=setup(),result=s.complete();const calls=s.workers[0].solveCalls.length;s.els['cd-record-details'].open=true;s.els['cd-record-details'].fire('toggle');a.ok(s.els['cd-record-preview'].textContent.length<=12000);const preview=JSON.parse(s.els['cd-record-preview'].textContent);a.equal(preview.previewInfo.completeRecord,false);const record=s.download();a.equal(s.downloads.at(-1).filename,'capacity-distortion-record.json');a.match(s.els['cd-record-status'].textContent,/已请求浏览器下载/);a.equal(record.kind,'computed-paper-algorithm-record');a.deepEqual(record.selectedResult.trace,result.selected.trace);a.deepEqual(record.frontier,result.frontier);a.equal(record.source.version,'arXiv:1805.05713v1');a.equal(record.coverage.gaussianFigure3,false);a.equal(record.conventions.randomSeed,undefined);a.equal(record.conventions.randomness,'none; deterministic algorithm');a.equal(s.workers[0].solveCalls.length,calls);
});
test('silent control edits are rejected before the shell click listener can emit a Blob',()=>{
 const s=setup();s.complete();s.els['cd-q'].value='.25';a.equal(s.download(),null);a.equal(s.blobs.length,0);a.equal(s.els['cd-record-download'].disabled,true);a.match(s.els['cd-record-status'].textContent,/重新计算/);
});
test('resize and pure trace inspection do not recompute, redraw randomness, or change computation timestamp',()=>{
 const s=setup();s.complete();const before=s.download(),count=s.workers.length;s.els['cd-frontier'].clientWidth=310;s.resize();s.change('cd-step',0);const after=s.download();a.equal(s.workers.length,count);a.equal(after.computedAt,before.computedAt);a.equal(after.timing.controlToResultMs,before.timing.controlToResultMs);a.deepEqual(after.selectedResult,before.selectedResult);a.equal(s.els['cd-frontier'].attrs.viewBox,'0 0 310 275');a.equal(after.inspection.iteration,0);
});
test('nonfinite and mismatched worker results fail closed after previous success',()=>{
 for(const mutation of [r=>{r.selected.rateBits=NaN;},r=>{r.selected.distortion=Infinity;},r=>{r.model.ps=[.1,.9];},r=>{r.selected.trace=[];},r=>{r.selected.status='fabricated';},r=>{r.selected.gapNats=1;r.selected.converged=true;}]){
  const s=setup();s.complete();const w=s.run(),message=w.compute().at(-1);mutation(message.result);w.deliver(message);checkCleared(s);a.match(s.els['cd-status'].textContent,/失败/);
 }
});
test('model control bounds reject invalid numeric, strategy, fractional cap and oversized inputs',()=>{
 for(const[id,value]of [['cd-q','.6'],['cd-mu','25'],['cd-cap','1.5'],['cd-cap','10001'],['cd-inner-cap','0'],['cd-tolerance','1e-8'],['cd-dual','unknown'],['cd-model','unregistered']]){const s=setup();s.complete();s.change(id,value);checkCleared(s);a.match(s.els['cd-status'].textContent,/失败/,id);}
});
test('all lesson controls are labelled, source boundaries are explicit, and no remote/storage effects exist',()=>{
 for(const id of ['cd-q','cd-mu','cd-prediction','cd-model','cd-noise','cd-cost','cd-budget','cd-feedback','cd-cap','cd-tolerance','cd-dual','cd-inner-cap','cd-oracle','cd-step'])a.ok(html.includes('for="'+id+'"'),id);
 for(const id of ['cd-pmf','cd-frontier','cd-objective','cd-gap'])a.ok(html.includes('role="img" aria-labelledby="'+id+'-caption"'),id);
 for(const term of ['CAPACITY-DISTORTION:START','CAPACITY-DISTORTION:END','Gaussian Fig. 3 尚未复现','查看第 k 次迭代','通信阶段不使用反馈','预算是松弛的','不是有限码长编码器','arXiv:1805.05713v1','reading.html#guide-tradeoffs-feedback-capacity-distortion-2018'])a.ok(html.includes(term),term);
 a.doesNotMatch(script+workerScript,/innerHTML|fetch\(|setInterval|requestAnimationFrame|Math\.random|localStorage|sessionStorage|\.focus\(|scrollIntoView/);a.match(css,/:focus-visible/);a.match(css,/min-height:44px/);a.match(css,/@media\(max-width:850px\)/);a.ok(html.includes('<noscript>'));
});

test('long traces have a bounded moving table window while JSON retains every real iteration',()=>{
 const s=setup();s.change('cd-q','.01');s.change('cd-cap','1000');s.change('cd-tolerance','1e-11');const r=s.complete();a.ok(r.selected.trace.length>200);a.equal(s.els['cd-trace-body'].children.length,0);s.els['cd-trace-details'].open=true;s.els['cd-trace-details'].fire('toggle');a.equal(s.els['cd-trace-body'].children.length,200);a.match(s.els['cd-trace-coverage'].textContent,/最多 200 行/);s.change('cd-step',0);a.equal(s.els['cd-trace-body'].children[0].children[0].textContent,'0');a.equal(s.download().selectedResult.trace.length,r.selected.trace.length);
});
test('silently invalid controls during a pending response fail safely rather than throwing from the worker handler',()=>{
 const s=setup(),w=s.run();const m=w.compute().at(-1);s.els['cd-q'].value='';a.doesNotThrow(()=>w.deliver(m));checkCleared(s);a.match(s.els['cd-status'].textContent,/失败/);
});
test('mixed main/worker algorithm versions are rejected and ordinary static checkpoints survive disabled JS features',()=>{
 for(const mutate of [r=>r.algorithmVersion='stale-version',r=>r.selected.version='stale-version']){const s=setup(),w=s.run(),m=w.compute().at(-1);mutate(m.result);w.deliver(m);checkCleared(s);a.match(s.els['cd-status'].textContent,/版本不一致/);}
 const block=html.slice(html.indexOf('<!-- CAPACITY-DISTORTION:START -->'),html.indexOf('<!-- CAPACITY-DISTORTION:END -->'));
 const normal=block.replace(/<noscript>[\s\S]*?<\/noscript>/g,'');a.ok(normal.includes('id="cd-static-checkpoints"'));a.ok(normal.includes('I=0.4 bit/使用，D=0.2'));a.ok(normal.includes('本节论文模型'));a.doesNotMatch(script,/精确数值间隙/);a.match(script,/报告的数值间隙为 0/);
});
