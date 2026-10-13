import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {EventEmitter} from 'node:events';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {createRuntime,GaussianWorkerClient,createWorkerClient,protocol} from '../runtime.mjs';
import {decodeRecord,canonicalStringify,encodeRecord,hashCanonical} from '../codec.mjs';
import {run as fixtureRun,validateInput as fixtureValidate} from './protocol-fixture-kernel.mjs';
import {makePreset,run as kernelRun} from '../kernel.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=10000){const end=Date.now()+ms;while(!f()){if(Date.now()>end)throw new Error('Timed out waiting for test event');await sleep(3);}return f();}
function fixtureClient(options={}){return new GaussianWorkerClient(new Worker(new URL('./protocol-fixture-worker.mjs',import.meta.url),{type:'module'}),options);}
class FakeWorker extends EventEmitter{constructor(){super();this.sent=[];this.terminated=0;}postMessage(e){this.sent.push(e);}terminate(){this.terminated++;return Promise.resolve(0);}event(e){this.emit('message',e);}}
const completed=id=>({type:'complete',id,operation:'run',result:{answer:id}});
const rejected=id=>({type:'error',id,rejected:true,error:{code:'INVALID_INPUT',message:'Invalid candidate'}});

test('runtime validates candidates before queued/current supersession and assigns one terminal',async()=>{
  const events=[],runtime=createRuntime(e=>events.push(e),{run:fixtureRun,validateInput:fixtureValidate});
  assert.equal(runtime.receive({type:'run',id:'old',input:{value:1,steps:20}}),true);
  assert.equal(runtime.receive({type:'run',id:'invalid',input:{value:'bad'}}),false);assert.equal(runtime.state.currentId,'old');
  assert.equal(runtime.receive({type:'run',id:'new',input:{value:2}}),true);
  await until(()=>events.find(e=>e.id==='new'&&e.type==='complete'));
  assert.equal(events.filter(e=>e.id==='old'&&e.type==='superseded').length,1);assert(!events.some(e=>e.id==='old'&&e.type==='complete'));
  assert(events.find(e=>e.id==='invalid'&&e.rejected));assert(Object.isFrozen(events.at(-1).result.runRecord));runtime.close();
});
test('runtime descriptor-first messages, duplicate ids, cancellation, session and wall limits',async()=>{
  const events=[];let calls=0;const runtime=createRuntime(e=>events.push(e),{run:fixtureRun,validateInput:fixtureValidate,maxRequests:2});
  runtime.receive({get id(){calls++;return 'x';},type:'run',input:{value:1}});assert.equal(calls,0);
  runtime.receive({id:'run',type:'run',input:{value:1,steps:30}});runtime.receive({id:'run',type:'run',input:{value:2}});
  runtime.receive({id:'cancel',type:'cancel',targetId:'run'});runtime.receive({id:'over',type:'cancel',targetId:'run'});
  await until(()=>events.some(e=>e.id==='run'&&e.type==='cancelled'));
  assert.equal(events.find(e=>e.id==='over').error.code,'SESSION_LIMIT');assert.equal(events.find(e=>e.id==='run'&&e.rejected).error.code,'REUSED_ID');assert(!events.some(e=>e.id==='run'&&e.type==='complete'));runtime.close();
  const timed=[];const r2=createRuntime(e=>timed.push(e),{run:fixtureRun,validateInput:fixtureValidate,maxWallMs:1,yieldTask:()=>sleep(5)});
  r2.receive({type:'run',id:'slow',input:{value:1}});await until(()=>timed.some(e=>e.id==='slow'&&e.type==='error'));assert.equal(timed.at(-1).error.code,'TIME_LIMIT');r2.close();
});
test('actual Node fixture Worker freezes output and preserves signed zero/history',async t=>{
  const c=fixtureClient();t.after(()=>c.dispose());assert.equal((await c.ready).protocol,protocol);
  const input={value:-0,steps:2},job=c.run(input);input.value=9;const result=await job.result;
  assert.equal(result.type,'complete');assert(Object.is(result.result.result.answer,-0));assert(Object.isFrozen(result.result.result));
  const record=await decodeRecord(canonicalStringify(result.result.runRecord));assert.equal(record.mode,'history');assert(Object.is(record.input.value,-0));
});
test('actual Node candidate rejection preserves ongoing run; accepted replacement cancels it',async t=>{
  const events=[],c=fixtureClient({onEvent:e=>events.push(e)});t.after(()=>c.dispose());await c.ready;
  const old=c.run({value:1,steps:80},{id:'old'});await until(()=>events.some(e=>e.id==='old'&&e.type==='progress'));
  await assert.rejects(c.run({value:'invalid'},{id:'bad'}).result);assert.equal(c.currentId,'old');assert.equal((await old.result).type,'complete');
  const long=c.run({value:2,steps:1000},{id:'long'});await until(()=>events.some(e=>e.id==='long'&&e.type==='progress'));
  const next=c.run({value:3,steps:2},{id:'next'});assert.equal((await long.result).type,'superseded');assert.equal((await next.result).result.result.answer,3);
  assert(!events.some(e=>e.id==='long'&&e.type==='complete'));
});
test('actual Node cooperative cancellation after progress is terminal and does not emit stale success',async t=>{
  const events=[],c=fixtureClient({onEvent:e=>events.push(e)});t.after(()=>c.dispose());await c.ready;
  const job=c.run({value:1,steps:1000},{id:'cancel-me'});await until(()=>events.some(e=>e.id===job.id&&e.type==='progress'));assert.equal(job.cancel(),true);
  assert.equal((await job.result).type,'cancelled');await sleep(25);assert(!events.some(e=>e.id===job.id&&e.type==='complete'));
  assert.equal((await c.run({value:4}).result).result.result.answer,4);
});
test('actual Node rejects nonfinite output and survives numerical error',async t=>{
  const c=fixtureClient();t.after(()=>c.dispose());await c.ready;
  await assert.rejects(c.run({value:1,badResult:true}).result,{code:'NONFINITE'});
  await assert.rejects(c.run({value:1,throwError:true}).result,{code:'KERNEL_ERROR'});
  assert.equal((await c.run({value:5}).result).type,'complete');
});
test('actual Node death rejects pending work and restart computes with a new generation',async t=>{
  const c=fixtureClient();t.after(()=>c.dispose());await c.ready;
  const job=c.run({value:1,steps:1000}),failure=assert.rejects(job.result,e=>e.code==='WORKER_EXITED');await c.worker.terminate();await failure;assert(c.failed);assert.throws(()=>c.run({value:2}));
  await c.restart(new Worker(new URL('./protocol-fixture-worker.mjs',import.meta.url),{type:'module'}));await c.ready;assert.equal((await c.run({value:8}).result).result.result.answer,8);
});
test('client holds an old queued completion until a newer invalid candidate is rejected',async()=>{
  const w=new FakeWorker(),events=[],c=new GaussianWorkerClient(w,{onEvent:e=>events.push(e)});
  const a=c.run({value:1},{id:'a'});w.event({type:'accepted',id:'a'});const b=c.run({value:2},{id:'b'}),bad=assert.rejects(b.result,{code:'INVALID_INPUT'});
  w.event(completed('a'));assert(c.pending.get('a').deferred);assert(!events.some(e=>e.type==='complete'));
  w.event(rejected('b'));await bad;assert.equal((await a.result).type,'complete');assert(events.some(e=>e.id==='a'&&e.type==='complete'));await c.dispose();
});
test('client suppresses deferred completion on valid supersession and cancellation',async()=>{
  const w=new FakeWorker(),c=new GaussianWorkerClient(w);
  const a=c.run({value:1},{id:'a'});w.event({type:'accepted',id:'a'});const b=c.run({value:2},{id:'b'});w.event(completed('a'));w.event({type:'accepted',id:'b'});
  assert.equal((await a.result).type,'superseded');w.event(completed('a'));w.event(completed('b'));assert.equal((await b.result).type,'complete');
  const x=c.run({value:3},{id:'x'});w.event({type:'accepted',id:'x'});assert(x.cancel());w.event(completed('x'));assert.equal((await x.result).type,'cancelled');await c.dispose();
});
test('client accepted duplicate-id rejection and old-generation events cannot settle current work',async()=>{
  const w=new FakeWorker(),c=new GaussianWorkerClient(w);const a=c.run({value:1},{id:'a'});w.event({type:'accepted',id:'a'});w.event(rejected('a'));assert(c.pending.has('a'));
  const oldHandler=c._nodeMessage,next=new FakeWorker();await c.restart(next);assert.equal((await a.result).type,'cancelled');
  const b=c.run({value:2},{id:'b'});oldHandler(completed('b'));assert(c.pending.has('b'));next.event(completed('b'));assert.equal((await b.result).type,'complete');await c.dispose();
});
test('client handles postMessage failure without stranding older deferred completion',async()=>{
  const w=new FakeWorker(),c=new GaussianWorkerClient(w);const a=c.run({value:1},{id:'a'});w.event({type:'accepted',id:'a'});
  w.postMessage=()=>{w.event(completed('a'));throw new Error('clone failure');};
  await assert.rejects(c.run({value:2},{id:'b'}).result,{code:'POST_MESSAGE_FAILED'});assert.equal((await a.result).type,'complete');await c.dispose();
});
test('client snapshot rejects getter inputs before transport and frozen callbacks cannot mutate history',async()=>{
  const w=new FakeWorker(),c=new GaussianWorkerClient(w);let called=0;assert.throws(()=>c.run({get value(){called++;return 1;}}));assert.equal(called,0);assert.equal(w.sent.length,0);
  const a=c.run({value:1});w.event(completed(a.id));const out=await a.result;assert(Object.isFrozen(out.result));await c.dispose();
});
test('restart epochs fence late factories and prevent resurrection after disposal',async()=>{
  let deliver;const c=new GaussianWorkerClient(new FakeWorker(),{createWorker:()=>new Promise(r=>{deliver=r;})});
  const late=c.restart();await until(()=>deliver);const current=new FakeWorker();await c.restart(current);const stale=new FakeWorker();deliver(stale);await late;assert.equal(c.worker,current);assert.equal(stale.terminated,1);assert.equal(c.disposed,false);
  let deliver2;c.options.createWorker=()=>new Promise(r=>{deliver2=r;});const pending=c.restart();await until(()=>deliver2);await c.dispose();const stale2=new FakeWorker();deliver2(stale2);await pending;assert.equal(c.disposed,true);assert.equal(stale2.terminated,1);
});
test('explicit replacement attaches before old asynchronous terminate resolves',async()=>{
  let finish;const old=new FakeWorker();old.terminate=()=>new Promise(r=>{finish=r;});const c=new GaussianWorkerClient(old),next=new FakeWorker();const restarting=c.restart(next);
  next.event({type:'ready',ok:true,protocol});assert.equal((await c.ready).protocol,protocol);finish(0);await restarting;await c.dispose();
});
test('actual production Node Worker runs numerical kernel and exact replayable record',async t=>{
  const c=await createWorkerClient();t.after(()=>c.dispose());await c.ready;
  const input=makePreset('teaching');input.blocks=4;input.kappas=[0,1,'communication-only'];input.selectedIndex=1;
  const event=await c.run(input,{id:'real-teaching'}).result;assert.equal(event.type,'complete');assert.equal(event.result.result.shapes.length,3);
  const decoded=await decodeRecord(canonicalStringify(event.result.runRecord)),replay=await kernelRun(decoded.input);
  assert.equal(await hashCanonical(replay),decoded.historical.resultHash);assert.equal(event.result.inputHash,await hashCanonical(decoded.input));
  const raw=await encodeRecord({input:decoded.input,result:replay},'raw');assert(!Object.hasOwn(raw,'historical'));
});
test('actual production Node invalid candidate preserves a current real numerical run',async t=>{
  const events=[],c=await createWorkerClient({onEvent:e=>events.push(e)});t.after(()=>c.dispose());await c.ready;
  const input=makePreset();input.blocks=16;const a=c.run(input,{id:'real-preserve'});await until(()=>events.some(e=>e.id===a.id&&e.type==='progress'));
  const bad={...input,blocks:1};await assert.rejects(c.run(bad,{id:'real-invalid'}).result);assert.equal((await a.result).type,'complete');
});
test('actual production Node cancellation is observed within asynchronous checkpoints',async t=>{
  const events=[],c=await createWorkerClient({onEvent:e=>events.push(e)});t.after(()=>c.dispose());await c.ready;
  const input=makePreset();input.blocks=512;const a=c.run(input,{id:'real-cancel'});await until(()=>events.some(e=>e.id===a.id&&e.type==='progress'));a.cancel();assert.equal((await a.result).type,'cancelled');assert(!events.some(e=>e.id===a.id&&e.type==='complete'));
});
test('browser self.onmessage branch in module VM validates, cancels, supersedes, and completes (not a real browser)',async()=>{
  assert.equal(typeof vm.SourceTextModule,'function','Run with --experimental-vm-modules');
  const events=[],context=vm.createContext({setTimeout,clearTimeout,performance,TextEncoder,crypto:webcrypto,self:{postMessage:e=>events.push(structuredClone(e))}}),cache=new Map();
  const root=new URL('../',import.meta.url);
  async function load(url){
    if(cache.has(url.href))return cache.get(url.href);
    const filename=url.pathname.endsWith('/kernel.mjs')?new URL('./protocol-fixture-kernel.mjs',import.meta.url):url;
    const mod=new vm.SourceTextModule(await readFile(filename,'utf8'),{context,identifier:url.href,initializeImportMeta:meta=>{meta.url=url.href;},importModuleDynamically:()=>{throw new Error('Browser branch attempted a Node dynamic import');}});cache.set(url.href,mod);
    await mod.link((specifier,referencing)=>load(new URL(specifier,referencing.identifier)));return mod;
  }
  const entry=await load(new URL('worker.mjs',root));await entry.evaluate();assert.equal(events[0].type,'ready');assert.equal(vm.runInContext('typeof self.onmessage',context),'function');
  function send(message){context.messageText=JSON.stringify(message);vm.runInContext('self.onmessage({data:JSON.parse(messageText)})',context);}
  send({type:'run',id:'a',input:{value:1,steps:100}});await until(()=>events.some(e=>e.id==='a'&&e.type==='progress'));
  send({type:'run',id:'bad',input:{value:'bad'}});assert(events.some(e=>e.id==='bad'&&e.rejected));
  send({type:'run',id:'b',input:{value:2,steps:100}});await until(()=>events.some(e=>e.id==='a'&&e.type==='superseded'));
  send({type:'cancel',id:'cancel-b',targetId:'b'});await until(()=>events.some(e=>e.id==='b'&&e.type==='cancelled'));
  send({type:'run',id:'c',input:{value:3}});await until(()=>events.some(e=>e.id==='c'&&e.type==='complete'));const done=events.find(e=>e.id==='c'&&e.type==='complete');assert.equal(done.result.result.answer,3);assert(Object.is(done.result.result.negativeZero,-0));
  assert(!events.some(e=>['a','b'].includes(e.id)&&e.type==='complete'));
});

test('invalid raw candidate retains its safe request id and cannot supersede current work',async()=>{
  const events=[],r=createRuntime(e=>events.push(e),{run:fixtureRun,validateInput:fixtureValidate});r.receive({type:'run',id:'keep',input:{value:1,steps:20}});
  for(const [id,input]of [['nonfinite',{value:Infinity}],['sparse',{value:1,extra:[,1]}],['unicode',{value:1,extra:'\ud800'}]]){
    r.receive({type:'run',id,input});const e=events.find(e=>e.id===id);assert(e?.rejected);assert.equal(r.state.currentId,'keep');
  }
  await until(()=>events.some(e=>e.id==='keep'&&e.type==='complete'));r.close();
});
test('oversized complete event falls back to terminal resource error rather than stranding its promise',async()=>{
  const events=[],r=createRuntime(e=>events.push(e),{validateInput:x=>x,run:async()=>({values:Array(90).fill('x'.repeat(65536))})});
  r.receive({type:'run',id:'large',input:{value:1}});await until(()=>events.some(e=>e.id==='large'&&e.type==='error'));assert.equal(events.at(-1).error.code,'INPUT_LIMIT');assert(!events.some(e=>e.id==='large'&&e.type==='complete'));r.close();
});
test('browser-style client event listener branch handles completion, messageerror and detachment',async()=>{
  class BrowserFake{
    constructor(){this.listeners=new Map();this.sent=[];this.terminated=0;}
    addEventListener(type,cb){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(cb);}
    removeEventListener(type,cb){this.listeners.get(type)?.delete(cb);}
    postMessage(e){this.sent.push(e);}terminate(){this.terminated++;}
    event(type,data){for(const cb of this.listeners.get(type)??[])cb(type==='message'?{data}:data);}
  }
  const w=new BrowserFake(),c=new GaussianWorkerClient(w);w.event('message',{type:'ready',ok:true,protocol});await c.ready;
  const a=c.run({value:1});w.event('message',completed(a.id));assert.equal((await a.result).type,'complete');
  const b=c.run({value:2}),bad=assert.rejects(b.result,{code:'WORKER_TRANSPORT_ERROR'});w.event('messageerror',{message:'decode failed'});await bad;await c.dispose();assert.equal(w.listeners.get('message').size,0);assert.equal(w.terminated,1);
});
test('runtime and client enforce 10,000-session caps without pending promises',async()=>{
  const events=[],r=createRuntime(e=>events.push(e),{run:fixtureRun,validateInput:fixtureValidate});
  for(let i=0;i<10000;i++)assert(r.receive({type:'cancel',id:'c'+i,targetId:'absent'}));assert.equal(r.receive({type:'cancel',id:'overflow',targetId:'absent'}),false);assert.equal(events.at(-1).error.code,'SESSION_LIMIT');r.close();
  const w=new FakeWorker(),c=new GaussianWorkerClient(w);w.postMessage=e=>w.event(completed(e.id));
  for(let i=0;i<10000;i++)await c.run({value:1}).result;assert.throws(()=>c.run({value:2}),{code:'SESSION_LIMIT'});assert.equal(c.pending.size,0);await c.dispose();
});

test('production browser module VM loads full kernel and vendor path, and matches Node replay (not browser performance)',async()=>{
  const events=[],context=vm.createContext({setTimeout,clearTimeout,performance,TextEncoder,crypto:webcrypto,self:{postMessage:e=>events.push(structuredClone(e))}}),cache=new Map();
  async function load(url){if(cache.has(url.href))return cache.get(url.href);const mod=new vm.SourceTextModule(await readFile(url,'utf8'),{context,identifier:url.href,initializeImportMeta:meta=>{meta.url=url.href;},importModuleDynamically:()=>{throw new Error('Browser source attempted a Node dynamic import');}});cache.set(url.href,mod);await mod.link((specifier,referencing)=>load(new URL(specifier,referencing.identifier)));return mod;}
  const mod=await load(new URL('../worker.mjs',import.meta.url));await mod.evaluate();
  const input=makePreset();input.blocks=2;input.kappas=[0,1];input.selectedIndex=1;
  context.messageText=JSON.stringify({type:'run',id:'vm-real',input});vm.runInContext('self.onmessage({data:JSON.parse(messageText)})',context);
  await until(()=>events.some(e=>e.id==='vm-real'&&['complete','error'].includes(e.type)));
  const terminal=events.find(e=>e.id==='vm-real'&&['complete','error'].includes(e.type));assert.equal(terminal.type,'complete',JSON.stringify(terminal.error));
  const record=await decodeRecord(canonicalStringify(terminal.result.runRecord));assert.equal(await hashCanonical(await kernelRun(record.input)),record.historical.resultHash);assert.equal(vm.runInContext('typeof globalThis.SyncLinalg',context),'object');
});

test('convenience factory validates options before allocation or getter execution and cleans failed construction',async()=>{
  let constructed=0,terminated=0,getterCalls=0;
  const factory=()=>{constructed++;return new FakeWorker();};
  await assert.rejects(createWorkerClient({unexpected:true,createWorker:factory}),{code:'INVALID_OPTIONS'});
  await assert.rejects(createWorkerClient({get onEvent(){getterCalls++;return ()=>{};},createWorker:factory}),{code:'INVALID_OPTIONS'});
  await assert.rejects(createWorkerClient({onEvent:2,createWorker:factory}),{code:'INVALID_OPTIONS'});
  assert.equal(constructed,0);assert.equal(getterCalls,0);
  await assert.rejects(createWorkerClient({createWorker:()=>{constructed++;return {postMessage(){},terminate(){terminated++;}};}}),{code:'INVALID_WORKER'});
  assert.equal(constructed,1);assert.equal(terminated,1);
  const c=await createWorkerClient({createWorker:factory});assert.equal(constructed,2);const old=c.worker;await c.restart();assert.equal(constructed,3);assert.equal(old.terminated,1);await c.dispose();
});
test('real numerical progress exposes finite completed counts as done',async t=>{
  const events=[],c=await createWorkerClient({onEvent:e=>events.push(e)});t.after(()=>c.dispose());await c.ready;
  const input=makePreset();input.blocks=2;input.kappas=[0];input.selectedIndex=0;await c.run(input).result;
  const shape=events.filter(e=>e.type==='progress'&&e.progress.stage==='shape'),wave=events.filter(e=>e.type==='progress'&&e.progress.stage==='waveforms');
  assert(shape.some(e=>e.progress.done===1&&e.progress.total===1));assert(wave.some(e=>e.progress.done===2&&e.progress.total===2));
});

test('numeric error diagnostics survive immutable Worker events and managed-client rejection',async()=>{
  const original={inverseCondition:1e13,eigenvalues:[1,1e-13],relativeGap:1e-7,feasibility:1e-12};
  const failure=Object.assign(new Error('Numerical certificate failed'),{code:'OPTIMIZATION_FAILED',diagnostics:original});
  const w=new FakeWorker(),events=[],r=createRuntime(e=>{events.push(e);w.event(e);},{validateInput:x=>x,run:async()=>{throw failure;}});w.postMessage=e=>r.receive(e);
  const c=new GaussianWorkerClient(w);let rejection;
  await assert.rejects(c.run({value:1},{id:'diagnostic'}).result,e=>{rejection=e;return e.code==='OPTIMIZATION_FAILED'&&e.message==='Numerical certificate failed';});
  const event=events.find(e=>e.id==='diagnostic'&&e.type==='error');assert.deepEqual(event.error.diagnostics,original);assert.deepEqual(rejection.diagnostics,original);
  assert(Object.isFrozen(event.error.diagnostics.eigenvalues));assert(Object.isFrozen(rejection.diagnostics.eigenvalues));assert.throws(()=>{rejection.diagnostics={};},TypeError);
  original.eigenvalues[0]=5;assert.equal(event.error.diagnostics.eigenvalues[0],1);assert.equal(rejection.diagnostics.eigenvalues[0],1);
  await c.dispose();r.close();
});
test('malformed, accessor, inherited and resource-heavy diagnostics fall back to original code/message',async()=>{
  let getters=0;const cyclic={};cyclic.self=cyclic;
  const malformed=[{bad:Infinity},{bad:[,1]},cyclic,{get secret(){getters++;return 1;}},{huge:'x'.repeat(20000)},{huge:Array(513).fill(1)},Object.create({inherited:true})];
  for(const diagnostics of malformed){
    const failure=Object.assign(new Error('Primary error'),{code:'NUMERICAL_FAILURE',diagnostics}),events=[];
    const r=createRuntime(e=>events.push(e),{validateInput:x=>x,run:async()=>{throw failure;}});r.receive({type:'run',id:'bad-diag',input:{}});
    await until(()=>events.some(e=>e.id==='bad-diag'&&e.type==='error'));const event=events.find(e=>e.type==='error');assert.equal(event.error.code,'NUMERICAL_FAILURE');assert.equal(event.error.message,'Primary error');assert(!Object.hasOwn(event.error,'diagnostics'));r.close();
  }
  for(const inherited of [false,true]){
    const failure=Object.assign(new Error('Primary error'),{code:'NUMERICAL_FAILURE'});
    if(inherited)Object.setPrototypeOf(failure,{diagnostics:{condition:10}});else Object.defineProperty(failure,'diagnostics',{get(){getters++;return {condition:10};}});
    const events=[],r=createRuntime(e=>events.push(e),{validateInput(){throw failure;},run:fixtureRun});r.receive({type:'run',id:'bad-diag',input:{}});const event=events.find(e=>e.type==='error');assert.equal(event.error.message,'Primary error');assert(!Object.hasOwn(event.error,'diagnostics'));r.close();
  }
  assert.equal(getters,0);
});

test('actual production Node Worker retains inverse-condition failure diagnostics',async t=>{
  const events=[],c=await createWorkerClient({onEvent:e=>events.push(e)});t.after(()=>c.dispose());await c.ready;
  const input={operation:'posterior',X:{re:[[1000,0],[0,0]],im:[[0,0],[0,0]]},Y:{re:[[0,0]],im:[[0,0]]},sensingNoise:1e-5,priorVariance:1e5};
  await assert.rejects(c.run(input,{id:'condition-failure'}).result,e=>e.code==='NUMERICAL_DEGENERACY'&&e.diagnostics.condition>1e12&&Object.isFrozen(e.diagnostics));
  const failure=events.find(e=>e.id==='condition-failure'&&e.type==='error');assert.equal(failure.error.diagnostics.minimumEigenvalue,1e-5);assert(Object.isFrozen(failure.error.diagnostics));
});
