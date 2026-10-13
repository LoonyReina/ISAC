'use strict';
// Actual worker_threads lifecycle tests; browser loader VM tests are explicitly
// separate compatibility checks and are not browser execution/performance evidence.
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {Worker}=require('node:worker_threads'),{EventEmitter}=require('node:events');
const Client=require('../worker/client.js'),Codec=require('../js/codec.js'),Protocol=require('../worker/protocol.js');
const root=path.resolve(__dirname,'..'),entry=path.join(root,'worker/receiver-worker.js');
const terminalTypes=new Set(['complete','cancelled','superseded','error']);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const request=(extra={})=>({operation:'generate',config:{shape:[4,8,5],rank:1,iterations:1,seed:7,...extra}});
function mailbox(){const events=[],waiters=new Set();function receive(e){events.push(e);for(const w of [...waiters])if(w.p(e)){waiters.delete(w);clearTimeout(w.timer);w.resolve(e);}}function wait(p,ms=15000){const old=events.find(p);if(old)return Promise.resolve(old);return new Promise((resolve,reject)=>{const w={p,resolve,timer:setTimeout(()=>{waiters.delete(w);reject(new Error('Timeout: '+JSON.stringify(events.slice(-4))));},ms)};waiters.add(w);});}return {events,receive,wait,terminal:id=>wait(e=>e.id===id&&terminalTypes.has(e.type)&&!e.rejected),rejected:id=>wait(e=>e.id===id&&e.rejected),clear(){for(const w of waiters)clearTimeout(w.timer);waiters.clear();}};}
const stub=`
(function(root){'use strict';
const defaults={shape:[4,8,5],rank:1,iterations:1,tolerance:1e-4,projectionOversampling:16,bandwidthHz:1e7,carrierHz:28e9,spacingWavelengths:.5,seed:7,snrDb:5,offsetS:35e-9,cfoHz:320,scenario:'ordinary',trace:'summary'};
const trace={active:0,maxActive:0,completed:0};root.fixtureTrace=trace;
function validateRequest(r){if(!r||!['generate','held'].includes(r.operation))throw Error('operation');const c={...defaults,...r.config};if(!Number.isInteger(c.iterations)||c.iterations<1||c.iterations>20)throw Error('iterations');if(!Number.isInteger(c.seed)||c.seed<0||c.seed>4294967295)throw Error('seed');if(c.shape.some((n,i)=>n<[4,8,5][i]||n>[10,36,20][i]))throw Error('shape');if(r.operation==='held'){if(!r.observation)throw Error('observation');if(r.observation.generationConfig&&r.observation.generationConfig.seed!==c.seed)throw Error('generation metadata changed');}return {operation:r.operation,config:c,observation:r.observation};}
function observation(c){const n=c.shape.reduce((a,b)=>a*b,1),p=c.shape[1]*c.shape[2],o={shape:c.shape.slice(),observations:[Array(2*n).fill(0),Array(2*n).fill(0)],pilots:[Array.from({length:2*p},(_,i)=>i%2?0:1),Array.from({length:2*p},(_,i)=>i%2?0:1)],configPhysics:{bandwidthHz:c.bandwidthHz,carrierHz:c.carrierHz,spacingWavelengths:c.spacingWavelengths},generationConfig:{seed:c.seed,snrDb:c.snrDb,offsetS:c.offsetS,cfoHz:c.cfoHz,scenario:c.scenario}};o.observations[0][0]=c.seed;return o;}
async function run(r,h){r=validateRequest(r);trace.active++;trace.maxActive=Math.max(trace.maxActive,trace.active);try{const n=r.config.seed===99999?10000:4;for(let i=0;i<n;i++)await h.checkpoint('fixture-compute',{done:i,total:n});if(r.config.seed===88888)throw Error('fixture kernel failure');trace.completed++;return {status:'fresh-execution',config:r.config,observation:r.operation==='held'?r.observation:observation(r.config),methods:{fixture:{numerical_success:true}},fixtureSeed:r.config.seed};}finally{trace.active--;}}
const api={validateRequest,run};root.NetworkedSync=api;if(typeof module==='object')module.exports=api;
}(globalThis));`;
// FIFO transport delay only: the real Worker and kernel remain unchanged. The
// observed mailbox sees messages as Node receives them; delivery can be paused
// without sleeps or reordering to model a busy consumer's queued messages.
class DelayedTransport extends EventEmitter {
 constructor(worker){super();this.worker=worker;this.observed=mailbox();this.queue=[];this.paused=false;this.pauseAfter=null;worker.on('message',e=>{this.observed.receive(e);if(this.paused)this.queue.push(e);else{this.emit('message',e);if(this.pauseAfter&&this.pauseAfter(e))this.paused=true;}});for(const type of ['error','messageerror','exit'])worker.on(type,e=>this.emit(type,e));}
 postMessage(e){this.worker.postMessage(e);}
 flush(){this.paused=false;this.pauseAfter=null;for(const e of this.queue.splice(0))this.emit('message',e);}
 terminate(){this.observed.clear();return this.worker.terminate();}
}
async function nodeWorker(t,opts={}){
 let filename=entry,temp;if(opts.stub||opts.failImport){temp=fs.mkdtempSync(path.join(os.tmpdir(),'ns-worker-test-'));fs.mkdirSync(path.join(temp,'worker'));fs.mkdirSync(path.join(temp,'js'));for(const f of ['receiver-worker.js','protocol.js'])fs.copyFileSync(path.join(root,'worker',f),path.join(temp,'worker',f));for(const f of ['codec.js','sha256.js'])fs.copyFileSync(path.join(root,'js',f),path.join(temp,'js',f));if(opts.stub)fs.writeFileSync(path.join(temp,'js/receiver.js'),stub);filename=path.join(temp,'worker/receiver-worker.js');}
 const actualWorker=new Worker(filename),worker=opts.delay?new DelayedTransport(actualWorker):actualWorker,box=mailbox();worker.on('message',box.receive);worker.on('error',e=>box.receive({type:'transport-error',message:e.message}));t.after(async()=>{box.clear();await worker.terminate();if(temp)fs.rmSync(temp,{recursive:true,force:true});});const ready=await box.wait(e=>e.type==='ready');return {...box,worker,ready,filename,send:x=>worker.postMessage(x)};
}
function browserVM(t,opts={}){const box=mailbox(),timers=new Set(),imports=[];let handler;const scope={TextEncoder,TextDecoder,performance,setTimeout(fn,ms){const timer=setTimeout(()=>{timers.delete(timer);fn();},ms);timers.add(timer);return timer;},clearTimeout(timer){clearTimeout(timer);timers.delete(timer);},postMessage:x=>box.receive(structuredClone(x)),addEventListener(name,fn){if(name==='message')handler=fn;}};scope.self=scope;const context=vm.createContext(scope);scope.importScripts=(...urls)=>{imports.push(...urls);if(opts.failImport)throw Error('fixture import failure');for(const url of urls){const code=!opts.real&&url.endsWith('/receiver.js')?stub:fs.readFileSync(path.resolve(root,'worker',url),'utf8');vm.runInContext(code,context,{filename:url});}};vm.runInContext(fs.readFileSync(entry,'utf8'),context,{filename:entry});t.after(()=>{for(const timer of timers)clearTimeout(timer);box.clear();});return {...box,context,imports,send:x=>handler({data:x})};}
async function run(w,id='run',extra={}){w.send({type:'run',id,request:request(extra)});const e=await w.terminal(id);assert.equal(e.type,'complete',JSON.stringify(e));return e;}
function oneTerminal(w,id,type){const es=w.events.filter(e=>e.id===id&&terminalTypes.has(e.type)&&!e.rejected);assert.equal(es.length,1);assert.equal(es[0].type,type);}
function noStale(w,id,boundary){assert.equal(w.events.slice(boundary).some(e=>e.id===id&&['progress','complete'].includes(e.type)),false);}

test('actual Node Worker: fresh kernel result, raw/history export, validated import and fresh held recomputation',async t=>{
 const w=await nodeWorker(t);assert.equal(w.ready.ok,true);const a=await run(w,'fresh',{trace:'full'});assert.equal(a.result.freshExecution,true);assert.equal(a.result.result.status,'fresh-execution');assert.ok(a.result.result.methods.scpd);assert.equal(a.result.result.boundaries.truth_in_receiver,false);
 w.send({type:'export',id:'raw',observationId:'fresh',mode:'raw'});const raw=(await w.terminal('raw')).result;assert.equal(raw.mode,'raw');assert.deepEqual(await Codec.identity(raw.config,raw.observation),raw.identity);
 w.send({type:'export',id:'history',observationId:'fresh',mode:'history'});const history=(await w.terminal('history')).result;assert.equal(history.historical.freshExecution,false);assert.equal('observation'in history.historical.result,false);
 w.send({type:'release',id:'release'});await w.terminal('release');w.send({type:'import',id:'import',record:Codec.canonicalStringify(history)});const imported=await w.terminal('import');assert.equal(imported.result.freshExecution,false);assert.equal(imported.result.label,Codec.historicalLabel);
 w.send({type:'process',id:'rerun',observationId:'import',config:{iterations:2}});const processed=await w.terminal('rerun');assert.equal(processed.type,'complete',JSON.stringify(processed));assert.equal(processed.result.freshExecution,true);assert.equal(processed.result.result.operation,'held');assert.equal('truth'in processed.result.result,false);assert.equal('evaluation'in processed.result.result,false);assert.equal(processed.result.identity.sample_sha256,raw.identity.sample_sha256);assert.notEqual(processed.result.identity.config_sha256,raw.identity.config_sha256);
 const progress=w.events.filter(e=>e.id==='fresh'&&e.type==='progress');assert.ok(progress.some(e=>e.progress.stage==='initialization-start'));assert.ok(progress.some(e=>e.progress.stage==='hash-samples'));assert.equal(w.events.at(-1).type,'complete');oneTerminal(w,'fresh','complete');
});
function cancelledAfterAcknowledgement(w,id,ack){
 assert.equal(ack.operation,'cancel');assert.equal(ack.result.targetId,id);assert.equal(ack.result.cancelled,true);
 const boundary=w.events.indexOf(ack);assert.notEqual(boundary,-1,'Cancellation acknowledgement must be observed');
 // Only receipt of the acknowledgement establishes the raw transport fence.
 // Progress already sent by the Worker may arrive after the caller sends cancel.
 noStale(w,id,boundary+1);oneTerminal(w,id,'cancelled');
}
test('actual Node Worker: cooperative cancellation suppresses stale completion and preserves previously held raw data',async t=>{
 const w=await nodeWorker(t);await run(w,'prior');w.send({type:'run',id:'long',request:request({shape:[6,12,8],rank:2,iterations:20})});await w.wait(e=>e.id==='long'&&e.type==='progress');w.send({type:'cancel',id:'cancel',targetId:'long'});const ack=await w.terminal('cancel');assert.equal(ack.result.cancelled,true);assert.equal((await w.terminal('long')).type,'cancelled');cancelledAfterAcknowledgement(w,'long',ack);w.send({type:'export',id:'old-raw',observationId:'prior',mode:'raw'});assert.equal((await w.terminal('old-raw')).type,'complete');await run(w,'reusable');cancelledAfterAcknowledgement(w,'long',ack);
});
test('actual Node Worker: FIFO-delayed pre-cancel progress is legal, post-ack progress or completion is not',async t=>{
 const w=await nodeWorker(t,{delay:true});await run(w,'prior');
 w.worker.pauseAfter=e=>e.id==='long'&&e.type==='progress';
 w.send({type:'run',id:'long',request:request({shape:[6,12,8],rank:2,iterations:20})});
 const first=await w.wait(e=>e.id==='long'&&e.type==='progress');
 // Wait for actual additional Worker progress to be held, not a guessed delay.
 await w.worker.observed.wait(e=>e.id==='long'&&e.type==='progress'&&e!==first);
 const sentBoundary=w.events.length;assert.ok(w.worker.queue.some(e=>e.id==='long'&&e.type==='progress'));
 w.send({type:'cancel',id:'cancel',targetId:'long'});
 const ack=await w.worker.observed.terminal('cancel');assert.equal(ack.result.cancelled,true);
 assert.equal((await w.worker.observed.terminal('long')).type,'cancelled');w.worker.flush();
 // The old pre-send assertion demonstrably rejects this legal FIFO trace.
 assert.throws(()=>noStale(w,'long',sentBoundary),assert.AssertionError);
 cancelledAfterAcknowledgement(w,'long',ack);
 const trace=w.events.filter(e=>e.id==='long'||e.id==='cancel');
 t.diagnostic(JSON.stringify(trace.map(e=>({id:e.id,type:e.type,stage:e.progress&&e.progress.stage,cancelled:e.result&&e.result.cancelled}))));
 // Inject stale messages into copies of that observed event stream. Each
 // must fail the same oracle, including a completion before the acknowledgement.
 const ackIndex=w.events.indexOf(ack);
 for(const type of ['progress','complete']){
  const events=w.events.slice();events.splice(ackIndex+1,0,{type,id:'long',operation:'run',progress:{stage:'injected-stale'},result:{stale:true}});
  assert.throws(()=>cancelledAfterAcknowledgement({events},'long',ack),assert.AssertionError);
 }
 const early=w.events.slice();early.splice(ackIndex,0,{type:'complete',id:'long',operation:'run',result:{stale:true}});
 assert.throws(()=>cancelledAfterAcknowledgement({events:early},'long',ack),assert.AssertionError);
 w.send({type:'export',id:'old-raw',observationId:'prior',mode:'raw'});assert.equal((await w.terminal('old-raw')).type,'complete');await run(w,'reusable');cancelledAfterAcknowledgement(w,'long',ack);
});
test('actual Worker client: cancellation rejects real completion already queued by delayed transport',async t=>{
 const w=await nodeWorker(t,{delay:true}),events=[];let progress=0;
 const client=new Client(w.worker,{onEvent:e=>events.push(e)});t.after(()=>client.dispose());
 w.worker.paused=true;
 const task=client.run(request(),{id:'queued',onProgress:()=>progress++});
 assert.equal((await w.worker.observed.terminal('queued')).type,'complete');
 assert.equal(task.cancel(),true);w.worker.flush();
 const result=await task.result;assert.equal(result.type,'cancelled');assert.equal(result.queuedResultSuppressed,true);
 assert.equal(progress,0);assert.equal(events.some(e=>e.id==='queued'&&['progress','complete'].includes(e.type)),false);
 const ack=await w.worker.observed.wait(e=>e.operation==='cancel'&&e.type==='complete');assert.equal(ack.result.cancelled,false);
 assert.equal((await client.run(request(),{id:'reusable'}).result).type,'complete');assert.equal(client.pending.size,0);
});
test('Node Worker transport with deterministic kernel fixture: burst supersession serializes and emits one terminal per accepted id',async t=>{
 const w=await nodeWorker(t,{stub:true});w.send({type:'run',id:'old',request:request({seed:99999})});await w.wait(e=>e.id==='old'&&e.type==='progress');const boundary=w.events.length;for(let i=0;i<8;i++)w.send({type:'run',id:'new'+i,request:request({seed:i+10})});assert.equal((await w.terminal('old')).type,'superseded');for(let i=0;i<7;i++)assert.equal((await w.terminal('new'+i)).type,'superseded');assert.equal((await w.terminal('new7')).result.result.fixtureSeed,17);oneTerminal(w,'old','superseded');for(let i=0;i<8;i++)oneTerminal(w,'new'+i,i===7?'complete':'superseded');noStale(w,'old',boundary);
});
test('Node Worker: malformed, changed generation metadata, and hash-invalid imports never cancel accepted work',async t=>{
 const w=await nodeWorker(t,{stub:true});const first=await run(w,'prior');w.send({type:'export',id:'export',observationId:'prior',mode:'raw'});const raw=(await w.terminal('export')).result;
 w.send({type:'run',id:'good',request:request({seed:99999})});await w.wait(e=>e.id==='good'&&e.type==='progress');const bad=JSON.parse(JSON.stringify(raw));bad.observation.observations[0][0]++;
 const invalid=[{type:'run',id:'shape',request:request({shape:[100,12,8]})},{type:'run',id:'unknown',request:{...request(),truth:[]}},{type:'run',id:'infinite',request:request({seed:Infinity})},{type:'run',id:'extra',request:request({extra:true})},{type:'process',id:'metadata',observationId:'prior',config:{seed:8}},{type:'import',id:'tamper',record:bad},{type:'export',id:'busy',observationId:'prior',mode:'raw'}];
 for(const x of invalid)w.send(x);for(const x of invalid)await w.rejected(x.id);assert.equal(w.events.some(e=>e.id==='good'&&terminalTypes.has(e.type)),false);assert.equal((await w.rejected('tamper')).error.code,'HASH_MISMATCH');w.send({type:'cancel',id:'cancel-good',targetId:'good'});assert.equal((await w.terminal('good')).type,'cancelled');assert.equal(first.result.freshExecution,true);
});
test('Node Worker: release cancels execution, invalidates held id, consumes control id, then recovers',async t=>{
 const w=await nodeWorker(t,{stub:true});await run(w,'held');w.send({type:'run',id:'busy',request:request({seed:99999})});await w.wait(e=>e.id==='busy'&&e.type==='progress');w.send({type:'release',id:'release'});assert.equal((await w.terminal('release')).result.releasedObservationId,'held');assert.equal((await w.terminal('busy')).reason,'released');w.send({type:'export',id:'stale',observationId:'held',mode:'raw'});assert.equal((await w.rejected('stale')).error.code,'OBSERVATION_NOT_HELD');w.send({type:'release',id:'release'});assert.equal((await w.rejected('release')).error.code,'REUSED_ID');await run(w,'after');
});
test('Node Worker: numerical exception is terminal error and allows subsequent fresh request',async t=>{
 const w=await nodeWorker(t,{stub:true});w.send({type:'run',id:'failure',request:request({seed:88888})});assert.equal((await w.terminal('failure')).error.code,'KERNEL_ERROR');oneTerminal(w,'failure','error');await run(w,'after');
});
test('Node Worker load failure emits ready failure and explicit rejected requests',async t=>{
 const w=await nodeWorker(t,{failImport:true});assert.equal(w.ready.ok,false);w.send({type:'run',id:'run',request:request()});assert.equal((await w.rejected('run')).error.code,'KERNEL_LOAD_FAILED');
});
test('actual Worker client: progress, rejected request preserves valid work, dead Worker failure, restart and cleanup',async t=>{
 const w=await nodeWorker(t,{stub:true}),events=[],client=new Client(w.worker,{onEvent:e=>events.push(e),createWorker:()=>new Worker(w.filename)});t.after(()=>client.dispose());
 // nodeWorker already consumed initial ready; lifecycle below uses an explicit replacement.
 await client.restart();assert.equal((await client.ready).ok,true);let progress=0;const a=client.run(request(),{id:'good',onProgress:()=>progress++});const bad=client.run(request({iterations:0}),{id:'bad'});await assert.rejects(bad.result);assert.equal((await a.result).type,'complete');assert.ok(progress>0);assert.equal(events.some(e=>e.id==='good'&&e.type==='complete'),true);
 const slow=client.run(request({seed:99999}),{id:'slow'});const rejected=assert.rejects(slow.result,e=>['WORKER_EXITED','WORKER_TRANSPORT_ERROR'].includes(e.code));await sleep(10);await client.worker.terminate();await rejected;assert.throws(()=>client.run(request()),e=>['WORKER_EXITED','WORKER_TRANSPORT_ERROR'].includes(e.code));await client.restart();assert.equal((await client.ready).ok,true);assert.equal((await client.run(request(),{id:'restarted'}).result).type,'complete');assert.equal(client.pending.size,0);await client.dispose();assert.throws(()=>client.run(request()),{code:'CLIENT_DISPOSED'});
});
class FakeWorker extends EventEmitter{constructor(){super();this.sent=[];}postMessage(x){this.sent.push(x);}async terminate(){return 0;}message(e){this.emit('message',e);}}
test('client rejects stale queued completion after accepted supersession; invalid newer request restores deferred older completion',async()=>{
 const worker=new FakeWorker(),events=[],c=new Client(worker,{onEvent:e=>events.push(e)});worker.message({type:'ready',ok:true});
 const a=c.run(request(),{id:'a'}),b=c.run(request(),{id:'b'});worker.message({type:'accepted',id:'a'});worker.message({type:'complete',id:'a',result:{stale:true}});assert.equal(c.pending.has('a'),true);worker.message({type:'accepted',id:'b'});assert.equal((await a.result).type,'superseded');worker.message({type:'complete',id:'b',result:{fresh:true}});assert.equal((await b.result).result.fresh,true);assert.equal(events.some(e=>e.id==='a'&&e.type==='complete'),false);
 const d=c.run(request(),{id:'d'}),e=c.run(request({iterations:0}),{id:'e'}),bad=assert.rejects(e.result);worker.message({type:'complete',id:'d',result:{kept:true}});worker.message({type:'error',id:'e',rejected:true,error:{code:'INVALID_INPUT',message:'bad'}});await bad;assert.equal((await d.result).result.kept,true);await c.dispose();
});
test('client cancellation fences already queued result, observer throws are isolated, duplicate ids rejected',async()=>{
 const worker=new FakeWorker(),c=new Client(worker,{onEvent(){throw Error('observer');}});worker.message({type:'ready',ok:true});const a=c.run(request(),{id:'a',onProgress(){throw Error('progress observer');}});worker.message({type:'accepted',id:'a'});worker.message({type:'progress',id:'a',progress:{stage:'stage'}});assert.equal(a.cancel(),true);worker.message({type:'complete',id:'a',result:{stale:true}});assert.equal((await a.result).type,'cancelled');assert.throws(()=>c.run(request(),{id:'a'}),{code:'REUSED_ID'});await c.dispose();
});
test('client rejects postMessage failure without disturbing current valid request',async()=>{
 const worker=new FakeWorker(),c=new Client(worker);const a=c.run(request(),{id:'a'});worker.postMessage=()=>{throw Error('clone failed');};const b=c.run(request(),{id:'b'});await assert.rejects(b.result,{code:'POST_MESSAGE_FAILED'});worker.message({type:'complete',id:'a',result:{ok:true}});assert.equal((await a.result).result.ok,true);await c.dispose();
});
test('client old-transport listeners cannot settle a replacement Worker request',async()=>{
 const old=new FakeWorker(),c=new Client(old),saved=[...old.listeners('message')];const stale=c.run(request(),{id:'old'}),replacement=new FakeWorker();await c.restart(replacement);assert.equal((await stale.result).reason,'client-restarted');replacement.message({type:'ready',ok:true});const next=c.run(request(),{id:'next'});for(const cb of saved)cb({type:'complete',id:'next',result:{stale:true}});assert.equal(c.pending.has('next'),true);replacement.message({type:'complete',id:'next',result:{fresh:true}});assert.equal((await next.result).result.fresh,true);await c.dispose();
});
test('separate classic-browser loader VM: real kernel and codec branches execute; no browser/device claim',async t=>{
 const w=browserVM(t,{real:true});assert.equal(w.events[0].ok,true);assert.deepEqual(w.imports,['../js/sha256.js','../js/codec.js','./protocol.js','../js/linalg.js','../js/receiver.js']);const a=await run(w);assert.equal(a.result.freshExecution,true);assert.ok(a.result.result.methods.scpd);oneTerminal(w,'run','complete');
});
test('separate browser-loader VM: serialized fixture kernel plus cancel/supersede/recovery and load failure',async t=>{
 const w=browserVM(t);w.send({type:'run',id:'old',request:request({seed:99999})});await w.wait(e=>e.id==='old'&&e.type==='progress');w.send({type:'run',id:'new',request:request()});assert.equal((await w.terminal('old')).type,'superseded');await w.terminal('new');assert.equal(w.context.fixtureTrace.maxActive,1);const broken=browserVM(t,{failImport:true});assert.equal(broken.events[0].ok,false);broken.send({type:'run',id:'bad',request:request()});assert.equal((await broken.rejected('bad')).error.code,'KERNEL_LOAD_FAILED');
});
test('protocol rejects hostile object input before getters or numerical work',()=>{
 let called=0;const config={};Object.defineProperty(config,'seed',{enumerable:true,get(){called++;return 7;}});const kernel={validateRequest(){throw Error('Should not reach kernel');}};
 assert.throws(()=>Protocol.validateRequest({type:'run',id:'a',request:{operation:'generate',config}},kernel));assert.equal(called,0);const sparse=new Array(1000001);assert.throws(()=>Protocol.validateRequest({type:'run',id:'b',request:{operation:'generate',config:{shape:sparse}}},kernel),{code:'INPUT_LIMIT'});
 const req=JSON.parse('{"operation":"generate","config":{"__proto__":{}}}');assert.throws(()=>Protocol.validateRequest({type:'run',id:'c',request:req},kernel),{code:'UNKNOWN_FIELD'});
});

test('client ignores duplicate-id rejection of an already accepted request',async()=>{
 const worker=new FakeWorker(),c=new Client(worker),a=c.run(request(),{id:'original'});worker.message({type:'accepted',id:'original'});worker.message({type:'error',id:'original',rejected:true,error:{code:'REUSED_ID',message:'Duplicate transport id'}});assert.equal(c.pending.has('original'),true);worker.message({type:'complete',id:'original',result:{kept:true}});assert.equal((await a.result).result.kept,true);await c.dispose();
});

test('protocol applies actual receiver tiny/huge/nonunit and immutable metadata bounds before acceptance',()=>{
 const kernel=require('../js/receiver.js'),config=kernel.validateConfig({shape:[4,8,5],rank:1}),base=kernel.generate(config).observation;
 for(const change of [o=>o.observations[0].fill(Number.MIN_VALUE),o=>o.observations[0][0]=Number.MAX_VALUE,o=>o.pilots[0][0]=2,o=>o.configPhysics.bandwidthHz*=2,o=>o.generationConfig.seed++]){
  const observation=JSON.parse(JSON.stringify(base));change(observation);assert.throws(()=>Protocol.validateRequest({type:'run',id:'boundary',request:{operation:'held',config,observation}},kernel));
 }
});

function gate(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
test('actual Worker: late factory restart cannot replace newer explicit restart or strand its running task',{timeout:10000},async t=>{
 const workers=[],make=()=>{const w=new Worker(entry);workers.push(w);return w;},entered=gate(),release=gate(),c=new Client(make(),{createWorker:async()=>{entered.resolve();await release.promise;return make();}});t.after(async()=>{release.resolve();await c.dispose();await Promise.all(workers.map(w=>w.terminate()));});await c.ready;
 const older=c.restart();await entered.promise;const replacement=make();await c.restart(replacement);assert.equal((await c.ready).ok,true);const running=c.run(request(),{id:'newer-worker-run'});release.resolve();await older;assert.equal(c.worker,replacement);assert.equal((await running.result).type,'complete');assert.equal(c.pending.size,0);
});
test('actual Worker: dispose while restart factory awaits cannot resurrect client',{timeout:10000},async t=>{
 const workers=[],make=()=>{const w=new Worker(entry);workers.push(w);return w;},entered=gate(),release=gate(),c=new Client(make(),{createWorker:async()=>{entered.resolve();await release.promise;return make();}});t.after(async()=>{release.resolve();await c.dispose();await Promise.all(workers.map(w=>w.terminate()));});await c.ready;
 const restarting=c.restart();await entered.promise;await c.dispose();release.resolve();await restarting;assert.equal(c.disposed,true);assert.throws(()=>c.run(request()),{code:'CLIENT_DISPOSED'});
});
test('client lifecycle epochs choose newest overlapping factory and discard stale factory failures',async()=>{
 const gates=[gate(),gate()],entered=[gate(),gate()];let i=0;const c=new Client(new FakeWorker(),{createWorker:async()=>{const n=i++;entered[n].resolve();return gates[n].promise;}}),old=c.restart();await entered[0].promise;const newer=c.restart();await entered[1].promise;const replacement=new FakeWorker();gates[1].resolve(replacement);await newer;gates[0].resolve(Promise.reject(Error('obsolete factory failure')));await old;assert.equal(c.worker,replacement);assert.equal(c.disposed,false);await c.dispose();
});

test('obsolete cancellation rejection cannot fail a newer Worker installed by another rejection handler',async()=>{
 const old=new FakeWorker(),replacement=new FakeWorker(),c=new Client(old),a=c.run(request(),{id:'old'});const restarted=a.result.catch(()=>c.restart(replacement));a.cancel();old.emit('error',Error('transport failure'));await restarted;await Promise.resolve();assert.equal(c.worker,replacement);assert.equal(c.failed,null);replacement.message({type:'ready',ok:true});const next=c.run(request(),{id:'new'});replacement.message({type:'complete',id:'new',result:{ok:true}});assert.equal((await next.result).result.ok,true);await c.dispose();
});
