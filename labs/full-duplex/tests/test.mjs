import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import {Controller,DEFAULTS,validateConfig} from './controller.mjs';
import {compute} from './worker.mjs';
import {makeData,runAsync,fit} from './kernel.mjs';
let checks=0;const ok=(fn)=>{fn();checks++;};
const created=[],timers=new Map();let tick=0;
const c=new Controller({workerFactory:()=>{const w={terminate(){this.dead=true;},postMessage(m){this.request=m;}};created.push(w);return w;},setTimer:f=>{timers.set(++tick,f);return tick;},clearTimer:n=>timers.delete(n)});
ok(()=>assert.equal(c.state.status,'idle'));ok(()=>assert.throws(()=>c.exportData()));
c.run(DEFAULTS);const w0=created.at(-1),id0=w0.request.id;ok(()=>assert.equal(c.state.status,'running'));
c.invalidate();ok(()=>assert(w0.dead));w0.onmessage({data:{id:id0,type:'result',result:{old:true}}});ok(()=>assert.equal(c.state.status,'stale'));ok(()=>assert.throws(()=>c.exportData()));
c.run(DEFAULTS);const w1=created.at(-1);c.cancel();ok(()=>assert(w1.dead));ok(()=>assert.equal(c.state.status,'cancelled'));
c.run(DEFAULTS);const w2=created.at(-1);c.run({...DEFAULTS,seed:0});const w3=created.at(-1);ok(()=>assert(w2.dead));w2.onmessage({data:{id:w2.request.id,type:'error',message:'stale failure'}});ok(()=>assert.equal(c.state.status,'running'));w3.onmessage({data:{id:w3.request.id,type:'result',result:{fresh:true},elapsedMs:2}});ok(()=>assert.equal(c.state.status,'ready'));ok(()=>assert(JSON.parse(c.exportData()).result.fresh));ok(()=>assert.equal(timers.size,0));c.invalidate();ok(()=>assert.throws(()=>c.exportData()));
for(const bad of [{...DEFAULTS,seed:NaN},{...DEFAULTS,seed:-1},{...DEFAULTS,seed:2**32},{...DEFAULTS,seed:1.2},{...DEFAULTS,preset:'quick'},{...DEFAULTS,delay:2}]){c.run(bad);ok(()=>assert.equal(c.state.status,'error'));ok(()=>assert.equal(c.state.result,null));}
c.run(DEFAULTS);created.at(-1).onerror({message:'module unavailable',preventDefault(){}});ok(()=>assert.equal(c.state.status,'error'));
c.run(DEFAULTS);[...timers.values()][0]();ok(()=>assert.equal(c.state.status,'error'));ok(()=>assert.equal(timers.size,0));
const broken=new Controller({workerFactory:()=>{throw Error('unsupported')}});broken.run(DEFAULTS);ok(()=>assert.equal(broken.state.status,'error'));
// Simulate strict Window receiver checks: timer methods must never be extracted/unbound.
const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
globalThis.setTimeout=function(...a){assert.equal(this,globalThis);return Reflect.apply(originalSet,globalThis,a);};globalThis.clearTimeout=function(...a){assert.equal(this,globalThis);return Reflect.apply(originalClear,globalThis,a);};
try{const browserTimer=new Controller({workerFactory:()=>({postMessage(){},terminate(){}})});browserTimer.run(DEFAULTS);ok(()=>assert.equal(browserTimer.state.status,'running'));browserTimer.cancel();ok(()=>assert.equal(browserTimer.state.status,'cancelled'));}finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
let msgs=[];await compute({type:'run',id:1,config:{...DEFAULTS,seed:-1}},m=>msgs.push(m));ok(()=>assert.deepEqual(msgs.map(m=>m.type),['error']));
msgs=[];await compute({type:'run',id:2,config:DEFAULTS},m=>msgs.push(m),{make:()=>({}),run:async()=>{throw Error('rank-deficient excitation')}});ok(()=>assert.equal(msgs.at(-1).message,'rank-deficient excitation'));ok(()=>assert(!msgs.some(m=>m.type==='result')));
// Real rank failure, resource bounds, and malformed generator paths.
ok(()=>assert.throws(()=>fit({rows:12,cols:2,data:new Float64Array(48).fill(1)},new Float64Array(24)),/rank-deficient/));
ok(()=>assert.throws(()=>fit({rows:4097,cols:1,data:new Float64Array(8194)},new Float64Array(8194)),/bounded/));
await assert.rejects(runAsync({count:4097,rho:0,blocks:[]}),/invalid bounded/);checks++;
const actual=await new Promise((resolve,reject)=>{const w=new Worker(new URL('./test-worker-bridge.mjs',import.meta.url));const timer=setTimeout(()=>{w.terminate();reject(Error('test timeout'));},30000);w.on('error',reject);w.on('message',m=>{if(m.type==='result'||m.type==='error'){clearTimeout(timer);w.terminate();m.type==='result'?resolve(m):reject(Error(m.message));}});w.postMessage({type:'run',id:11,config:DEFAULTS});});
const baseline=await runAsync(makeData('iid',DEFAULTS.seed));ok(()=>assert.deepEqual(actual.result,baseline));ok(()=>assert(actual.elapsedMs>0));ok(()=>assert(baseline.targets.nonlinear_delay_1.matched_amplitude_retention_abs<1e-12));
const corr=await runAsync(makeData('correlated',DEFAULTS.seed));ok(()=>assert(corr.targets.nonlinear_delay_8.matched_amplitude_retention_abs<baseline.targets.nonlinear_delay_8.matched_amplitude_retention_abs));
const here=await readFile(new URL('./kernel.mjs',import.meta.url));ok(()=>assert.equal(createHash('sha256').update(here).digest('hex'),'441bf5a359dba43b3abcad1bc8289708da34680928901104463714f146a2fbe0'));
console.log(JSON.stringify({checks,status:'PASS',worker_compute_ms:actual.elapsedMs,iid_suppression:baseline.models.nonlinear.holdout_suppression_db,iid_retention:baseline.targets.nonlinear_delay_8.matched_amplitude_retention_abs,correlated_retention:corr.targets.nonlinear_delay_8.matched_amplitude_retention_abs,browser_QA:'NOT RUN'},null,2));
