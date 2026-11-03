'use strict';
// DOM-event contracts exercise capture/target/bubble order, not browser rendering.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.resolve(__dirname,'../features/teaching19'),box={};vm.runInNewContext(fs.readFileSync(path.join(dir,'lessons.js'),'utf8'),box);
const {installTheoryAdapter}=require(path.join(dir,'theory-adapters.js'));
function fixture(id){
 const lesson=JSON.parse(JSON.stringify(box.Guided19Data.lessons.find(l=>l.id===id))),nodes=new Map();let host;
 function node(s){if(!nodes.has(s)){const listeners={};const n={id:s.slice(1),type:'number',value:'0.2',disabled:false,hidden:false,textContent:'',dataset:{},getAttribute(){return null},setAttribute(){},removeAttribute(){},addEventListener(t,f,capture=false){(listeners[t]??=[]).push({f,capture});},removeEventListener(t,f){listeners[t]=(listeners[t]||[]).filter(x=>x.f!==f)},emit(t,target,capture){for(const l of listeners[t]||[])if(l.capture===capture)l.f({type:t,target})},dispatchEvent(e){const t=e.type;if(host!==this)host.emit(t,this,true);this.emit(t,this,true);this.emit(t,this,false);if(host!==this)host.emit(t,this,false);},click(){this.dispatchEvent({type:'click'})}};nodes.set(s,n);}return nodes.get(s);}
 host=node(lesson.ui.rootSelector);
 const inputSelectors=id.includes('causal')?['#cc-budget','#cc-budget-slider']:['#mpi-height','#mpi-noise'];
 const doc={querySelector:node,querySelectorAll:s=>s==='[data-budget]'?[node('#cc-preset')]:inputSelectors.includes(s)?[node(s)]:['#mpi-coincident','#mpi-reset','#mpi-retry'].includes(s)?[node(s)]:[],defaultView:{Event:class{constructor(type){this.type=type}}}};
 lesson.ui.recordInputSelectors=inputSelectors;
 return {lesson,node,doc,install:()=>installTheoryAdapter(doc,lesson)};
}
test('causal synchronized budget snapshot is taken after native input; pending and silent edits stay stale',async()=>{
 const f=fixture('tradeoffs-causal-state-communication-2013'),n=f.node;
 n('#cc-budget').addEventListener('input',()=>{n('#cc-budget-slider').value=n('#cc-budget').value;n('#cc-status').dataset.phase='pending'});
 const a=f.install();await a.run('first');assert(!a.ready());n('#cc-status').dataset.phase='ready';assert(a.ready());
 await a.run('compare');assert.equal(n('#cc-budget').value,'0.3');assert.equal(n('#cc-budget-slider').value,'0.3');assert(!a.ready());n('#cc-status').dataset.phase='ready';assert(a.ready());n('#cc-budget').dispatchEvent({type:'change'});assert(a.ready(),'paired change does not invalidate completed input submission');
 await a.run('failure');n('#cc-status').dataset.phase='ready';assert(a.ready(),'scientific infeasibility is still a completed calculation');
 n('#cc-budget').value='0.2';assert(!a.ready(),'silent input cannot relabel old result');n('#cc-budget').dispatchEvent({type:'input'});assert(!a.ready());n('#cc-status').dataset.phase='invalid';assert(a.ready(),'invalid terminal remains readable, without scientific success');
 await a.run('first');n('#cc-status').dataset.phase='ready';assert(a.ready());a.dispose();assert(!a.ready());
 const refreshed=f.install();assert(!refreshed.ready(),'refresh cannot claim the old output as a new requested run');refreshed.dispose();
});
test('multipath native singular preset snapshots its changed height, permits failure read, rejects cancellation and stale results',async()=>{
 const f=fixture('supplement-case-multipath-channel'),n=f.node;
 n('#mpi-coincident').addEventListener('click',()=>{n('#mpi-height').value='0';n('#position-information').dataset.mpiState='pending';n('#position-information').dataset.mpiRecordId=''});
 const a=f.install();await a.run('failure');assert(!a.ready());n('#position-information').dataset.mpiState='complete';n('#position-information').dataset.mpiRecordId='singular-h0';assert(a.ready());assert.equal(a.getState().scientificSuccess,'not inferred');assert.equal(a.getState().parameters[0].value,'0');
 n('#mpi-height').value='0.5';assert(!a.ready());n('#mpi-height').dispatchEvent({type:'input'});assert(!a.ready(),'input alone cannot claim a new result before native change submits');n('#mpi-height').dispatchEvent({type:'change'});n('#position-information').dataset.mpiState='pending';assert(!a.ready());n('#position-information').dataset.mpiState='complete';assert(a.ready());n('#mpi-cancel').click();assert(!a.ready());a.dispose();assert(!f.install().ready());
});
test('causal live PMF is included in guide output and its selected atom explains product and marginal sum',async()=>{
 const l=box.Guided19Data.lessons.find(l=>l.id.includes('causal-state'));assert(l.ui.readSelectors.includes('#cc-mechanism'));
 const source=path.resolve(__dirname,'../labs/causal-state-capacity');const base=fs.existsSync(path.join(source,'causal-capacity-core.mjs'))?source:path.resolve(__dirname,'..');
 const {evaluateCausalCapacity}=await import(path.join(base,'causal-capacity-core.mjs')),{atomText}=await import(path.join(base,'causal-capacity-view.mjs'));
 for(const D of [.15,.2,.3]){const r=evaluateCausalCapacity(D);for(let i=0;i<16;i++){const text=atomText(r,i);assert(text.includes('独立变量的乘积'));assert(text.includes('同一 UE 行'));assert(text.includes('不是相加 bit 数'));}}
});

// Minimal DOM with actual engine mounting: events invoke real record callbacks across try-block scope.
function engineFixture({predict=true,compare=true,saved=null,externalAdapter=null}={}){
 class N{
  constructor(tag){this.tagName=tag.toUpperCase();this.childNodes=[];this.parentElement=null;this.hidden=false;this.dataset={};this.attrs={};this.events={};this.value='';this.textContent='';}
  get children(){return this.childNodes;}get parentNode(){return this.parentElement;}
  append(...ns){for(const n of ns){n.remove();n.parentElement=this;this.childNodes.push(n);}}prepend(...ns){for(const n of ns.reverse()){n.remove();n.parentElement=this;this.childNodes.unshift(n);}}
  remove(){if(this.parentElement){const p=this.parentElement;p.childNodes.splice(p.childNodes.indexOf(this),1);this.parentElement=null;}}
  before(n){const p=this.parentElement,i=p.childNodes.indexOf(this);n.remove();p.childNodes.splice(i,0,n);n.parentElement=p;}
  after(n){const p=this.parentElement;n.remove();p.childNodes.splice(p.childNodes.indexOf(this)+1,0,n);n.parentElement=p;}
  replaceWith(n){this.before(n);this.remove();}replaceChildren(...ns){for(const c of [...this.childNodes])c.remove();this.append(...ns);}
  contains(n){return n===this||this.childNodes.some(c=>c.contains(n));}
  querySelectorAll(s){const all=this.childNodes.flatMap(c=>[c,...c.querySelectorAll('*')]);return all.filter(n=>s==='*'||s==='#'+n.id||s==='.'+n.className);}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}addEventListener(t,f){(this.events[t]??=[]).push(f);}removeEventListener(t,f){this.events[t]=(this.events[t]||[]).filter(x=>x!==f);}
  async fire(t){for(const f of this.events[t]||[])await f({target:this});}click(){return this.fire('click');}focus(){}scrollIntoView(){}
 }
 const root=new N('main');root.id='root';for(const id of ['run','status','result']){const n=new N(id==='run'?'button':'p');n.id=id;root.append(n);}
 let ready=false,storage=saved,mutate=()=>{};
 const doc={querySelector:s=>s==='#root'?root:root.querySelector(s),querySelectorAll:s=>s==='#root'?[root]:root.querySelectorAll(s),createElement:t=>new N(t),createTextNode:t=>{const n=new N('text');n.textContent=t;return n;},createComment:()=>new N('comment'),defaultView:{localStorage:{getItem:()=>storage,setItem:(k,v)=>storage=v},location:{hash:''},addEventListener(){},removeEventListener(){},MutationObserver:class{constructor(callback){mutate=callback;}observe(){}disconnect(){}}}};
 const steps=[{role:'orient',title:'Start'},...(predict?[{role:'predict',title:'Predict'}]:[]),{role:'run',title:'Run'},{role:'read',title:'Read'},...(compare?[{role:'compare',title:'Compare'}]:[]),{role:'algorithm',title:'Explain'}];
 const lesson={id:'fixture',entryHref:'fixture.html',executionHref:'fixture.html',steps,firstRun:{runSelector:'#run'},ui:{rootSelector:'#root',liveSelectors:['#status'],actionSelectors:['#run'],readSelectors:['#result']},predictionQuestion:{options:['A','B']},knownUnknown:{known:[],unknown:[]},priorKnowledge:[],feedbackMetricSelectors:['#result']};
 const adapter={query:s=>doc.querySelector(s),ready:()=>ready,busy:()=>false,getState:()=>({serial:1,revision:0,submittedRevision:0}),prepare(){},run(){ready=true;},actions:{compare},dispose(){},...externalAdapter};adapter.query=s=>doc.querySelector(s);
 const context={module:{exports:{}},TheoryGuidedAdapters:{installTheoryAdapter:()=>adapter},Date,Math,console};vm.runInNewContext(fs.readFileSync(path.join(dir,'engine.js'),'utf8'),context);
 const mounted=context.module.exports.mount(doc,lesson),find=text=>root.querySelectorAll('*').find(n=>n.tagName==='BUTTON'&&n.textContent===text);
 return {mounted,doc,root,find,lesson,record:()=>storage,ready:v=>ready=v,mutate:()=>mutate()};
}
test('stage review and record import call the mounted renderer; back and refresh retain history only',async()=>{
 const f=engineFixture(),learning=f.root.querySelector('.gl-learning');learning.open=true;await learning.fire('toggle');
 await f.find('Read').click();assert.equal(f.mounted.step,3);assert(f.find('回到运行步骤，重建当前结果'));
 await f.find('回到运行步骤，重建当前结果').click();assert.equal(f.mounted.step,2);
 await f.find('采用本课起点，运行真实核心').click();await f.mounted.next.click();assert.equal(f.mounted.step,3);await f.mounted.back.click();assert.equal(f.mounted.step,2);
 const record=JSON.parse(f.record());record.step=4;const file=f.root.querySelectorAll('*').find(n=>n.type==='file');file.files=[{size:100,text:async()=>JSON.stringify(record)}];await file.fire('change');assert.equal(f.mounted.step,4);assert(!f.root.querySelector('.gl-save-status').textContent.includes('render is not defined'));
 const restored=engineFixture({saved:f.record()});assert.equal(restored.mounted.step,4);assert(restored.find('回到运行步骤，重建当前结果'),'refresh supplies recovery without trusting history');
});
test('courses without prediction or comparison do not invent either requirement',async()=>{
 const f=engineFixture({predict:false,compare:false});const learning=f.root.querySelector('.gl-learning');learning.open=true;await learning.fire('toggle');await f.find('Read').click();
 const text=f.root.querySelector('.gl-feedback').querySelectorAll('*').map(n=>n.textContent).join(' ');assert(!text.includes('回看原预测'));assert(!text.includes('返回热身'));assert(!text.includes('只改一项'));assert(text.includes('解释本次证据'));
});
test('causal native UI and real controller complete compare, infeasible run, invalid input and recovery with guided freshness',async()=>{
 const source=path.resolve(__dirname,'../labs/causal-state-capacity'),base=fs.existsSync(path.join(source,'causal-capacity-ui.mjs'))?source:path.resolve(__dirname,'..');
 const {mountCausalCapacityLesson}=await import(path.join(base,'causal-capacity-ui.mjs'));
 const f=fixture('tradeoffs-causal-state-communication-2013');
 for(const s of ['#cc-budget','#cc-budget-slider'])Object.defineProperty(f.node(s),'valueAsNumber',{get(){return this.value===''?NaN:Number(this.value)}});
 // Model the real range input's 0.001 step sanitization, independently of the exact number box.
 let sliderValue='0.2';Object.defineProperty(f.node('#cc-budget-slider'),'value',{get(){return sliderValue},set(value){sliderValue=String(Math.round(Number(value)*1000)/1000)}});
 f.node('#cc-preset').dataset.budget='0.1551404838969245';
 const ui=mountCausalCapacityLesson(f.doc,{autoStart:false}),a=f.install(),settle=()=>new Promise(resolve=>setImmediate(resolve));
 await a.run('first');await settle();assert(a.ready());assert.equal(ui.controller.getState().result.requestedD,.2);
 await a.run('compare');await settle();assert(a.ready());let r=ui.controller.getState().result;assert.equal(r.requestedD,.3);assert.equal(r.metrics.actualDistortion,.25);assert.equal(r.feasibility.status,'plateau');
 await a.run('failure');await settle();assert(a.ready());r=ui.controller.getState().result;assert.equal(r.requestedD,.15);assert.equal(r.feasibility.status,'infeasible');assert.equal(r.feasibility.feasibleRate,null);
 f.node('#cc-preset').click();await settle();assert(a.ready(),'native endpoint preset updates submitted inputs after synchronization');assert.equal(ui.controller.getState().result.feasibility.status,'boundary_within_numerical_resolution');assert.equal(ui.controller.getState().result.feasibility.feasibleRate,null);
 f.node('#cc-budget').value='';f.node('#cc-budget').dispatchEvent({type:'input'});await settle();assert(a.ready(),'invalid terminal readable without claiming a numerical result');assert.equal(ui.controller.getState().phase,'invalid');assert.equal(ui.controller.getState().result,null);
 await a.run('first');await settle();assert(a.ready());assert.equal(ui.controller.getState().result.requestedD,.2);a.dispose();ui.dispose();
});
test('reordered study steps reject old positional records rather than silently resuming another stage',()=>{
 const {newRecord,readRecord}=require(path.join(dir,'engine.js'));
 for(const lesson of [...box.Guided19Data.lessons,...(box.Guided19Data.variants||[])]){
  const hasAlgorithmBridge=['otfs-joint-estimation-2020','ofdm-passive-atomic-errors-2017'].includes(lesson.id);
  assert.equal(lesson.recordVersion,hasAlgorithmBridge?'algorithm-bridges-20261103-v1':'study-20261103-v1');
  const record=newRecord(lesson);record.step=Math.min(3,lesson.steps.length-1);record.visited=[record.step];record.attempted=[record.step];
  assert.equal(readRecord(JSON.stringify(record),lesson).step,record.step);
  record.version='feedback-20261025-v1';
  assert.throws(()=>readRecord(JSON.stringify(record),lesson),/课程版本已更新/,'old numeric step must not map onto a newly ordered stage');
 }
});
test('native endpoint submission remains current when native target handlers register after the guide',async()=>{
 const source=path.resolve(__dirname,'../labs/causal-state-capacity'),base=fs.existsSync(path.join(source,'causal-capacity-ui.mjs'))?source:path.resolve(__dirname,'..');
 const {mountCausalCapacityLesson}=await import(path.join(base,'causal-capacity-ui.mjs'));
 const f=fixture('tradeoffs-causal-state-communication-2013');
 for(const s of ['#cc-budget','#cc-budget-slider'])Object.defineProperty(f.node(s),'valueAsNumber',{get(){return this.value===''?NaN:Number(this.value)}});
 let slider='0.2';Object.defineProperty(f.node('#cc-budget-slider'),'value',{get(){return slider},set(v){slider=String(Math.round(Number(v)*1000)/1000)}});
 const a=f.install(),ui=mountCausalCapacityLesson(f.doc,{autoStart:false}),settle=()=>new Promise(resolve=>setImmediate(resolve));
 await a.run('first');await settle();assert(a.ready());await a.run('compare');await settle();assert(a.ready());await a.run('failure');await settle();assert(a.ready());
 for(const D of ['0.1551404838969245','0.1551404838969247']){
  f.node('#cc-preset').dataset.budget=D;f.node('#cc-preset').click();assert(!a.ready(),'pending is not a readable terminal');await settle();
  const r=ui.controller.getState().result;assert.equal(r.feasibility.status,'boundary_within_numerical_resolution');assert.equal(r.feasibility.feasibleRate,null);assert.equal(f.node('#cc-budget').value,D);assert.equal(f.node('#cc-budget-slider').value,'0.155');assert(a.ready(),'completed original endpoint must permit guided progression');
 }
 f.node('#cc-budget').value='0.2';assert(!a.ready(),'editing exact authoritative input without submitting remains stale');f.node('#cc-budget').dispatchEvent({type:'input'});await settle();assert(a.ready());assert.equal(ui.controller.getState().result.requestedD,.2);a.dispose();ui.dispose();
});

test('trusted-click microtask checkpoint cannot leave Next stale after native endpoint completion',async()=>{
 const source=path.resolve(__dirname,'../labs/causal-state-capacity'),base=fs.existsSync(path.join(source,'causal-capacity-ui.mjs'))?source:path.resolve(__dirname,'..');
 const {mountCausalCapacityLesson}=await import(path.join(base,'causal-capacity-ui.mjs'));
 const native=fixture('tradeoffs-causal-state-communication-2013');
 for(const s of ['#cc-budget','#cc-budget-slider'])Object.defineProperty(native.node(s),'valueAsNumber',{get(){return this.value===''?NaN:Number(this.value)}});
 let slider='0.2';Object.defineProperty(native.node('#cc-budget-slider'),'value',{get(){return slider},set(v){slider=String(Math.round(Number(v)*1000)/1000)}});
 const ui=mountCausalCapacityLesson(native.doc,{autoStart:false}),a=native.install(),guide=engineFixture({externalAdapter:a}),settle=()=>new Promise(resolve=>setImmediate(resolve));
 guide.lesson.steps[4].role='failure';
 const learning=guide.root.querySelector('.gl-learning');learning.open=true;await learning.fire('toggle');await guide.find('Compare').click();
 await guide.find('运行这次失效 / 迁移练习').click();await settle();guide.mutate();assert.equal(ui.controller.getState().result.requestedD,.15);assert.equal(guide.mounted.next.disabled,false);
 for(const D of ['0.1551404838969245','0.1551404838969247']){
  const preset=native.node('#cc-preset');preset.dataset.budget=D;
  // Unlike synchronous dispatchEvent(), a real user click can perform a microtask
  // checkpoint after native target callbacks and before ancestor bubble callbacks.
  preset.emit('click',preset,false);await settle();guide.mutate();
  assert.equal(ui.controller.getState().phase,'ready');assert.equal(ui.controller.getState().result.feasibility.feasibleRate,null);assert.equal(a.ready(),false);assert.equal(guide.mounted.next.disabled,true);
  native.node(native.lesson.ui.rootSelector).emit('click',preset,false);assert(a.ready(),'adapter now owns the exact endpoint snapshot');
  await guide.root.fire('click');assert.equal(guide.mounted.next.disabled,false,'click completion must refresh Next after the final adapter transition');
  assert(guide.root.querySelector('.gl-status').textContent.includes('实际执行已返回'));
 }
 native.node('#cc-budget').value='0.2';await guide.root.fire('click');assert.equal(guide.mounted.next.disabled,true,'unsubmitted edit must remain blocked');
 native.node('#cc-budget').dispatchEvent({type:'input'});await settle();guide.mutate();assert.equal(guide.mounted.next.disabled,false);assert.equal(ui.controller.getState().result.requestedD,.2);
 guide.mounted.dispose();assert.equal(guide.root.events.click.length,0,'dispose removes the final-click refresh listener');ui.dispose();
});
