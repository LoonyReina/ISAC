import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import {LessonController,validateRecord,inputSnapshot,matches} from './controller.mjs';
import {calculate} from './kernel.mjs';
const fixture=await calculate({L:3,kappa:.5},{yieldControl:()=>Promise.resolve(),chunkSlices:8});
function harness(options={}){
  const calls=[];const controller=new LessonController({execute:(envelope,hooks)=>new Promise((resolve,reject)=>calls.push({envelope,hooks,resolve,reject})),...options});
  return {controller,calls,finish:(i=0,result=fixture,extra={})=>calls[i].resolve({...calls[i].envelope,result,...extra})};
}
test('kernel is byte-exact accepted source',async()=>{assert.equal(createHash('sha256').update(await readFile(new URL('./kernel.mjs',import.meta.url))).digest('hex'),'44465ebfe45a8340bca293b27586d5e7c7376a90d8bb55544c142a37a47e3588');});
test('all 20 lesson choices calculate and pass consumer gate',async()=>{
  for(const L of [1,2,3,5])for(const kappa of [0,.25,.5,.75,1]){
    const input={L,kappa},r=await calculate(input,{yieldControl:()=>Promise.resolve(),chunkSlices:8});validateRecord(r,input);assert.equal(r.equivalentToBaseline,L===1||kappa===0);
  }
});
test('complete result and export are snapshots',async()=>{const h=harness();const task=h.controller.run();h.finish();await task;assert.equal(h.controller.state.status,'complete');const output=h.controller.exportRecord();output.selected.refined=0;assert.equal(h.controller.exportRecord().selected.refined,fixture.selected.refined);});
test('edit invalidates result and all stale progress/results',async()=>{const h=harness();const task=h.controller.run();h.controller.edit({L:5,kappa:1});assert.ok(h.calls[0].hooks.signal.aborted);h.calls[0].hooks.onProgress({...h.calls[0].envelope,progress:{target:'selected',phase:'refined'}});h.finish();await task;assert.equal(h.controller.state.status,'dirty');assert.equal(h.controller.state.progress,null);assert.equal(h.controller.exportRecord(),null);});
test('cancel, reset, and navigation invalidate unfinished and completed exports',async()=>{for(const action of ['cancel','reset','dispose']){const h=harness();const task=h.controller.run();h.controller[action]();h.finish();await task;assert.notEqual(h.controller.state.status,'complete');assert.equal(h.controller.exportRecord(),null);}const h=harness();const task=h.controller.run();h.finish();await task;h.controller.edit({L:2,kappa:.5});assert.equal(h.controller.exportRecord(),null);});
test('repeat run rejects late older success and progress',async()=>{const h=harness();const first=h.controller.run();const second=h.controller.run();h.finish(0);await first;assert.equal(h.controller.state.status,'running');h.calls[0].hooks.onProgress({...h.calls[0].envelope,progress:{target:'baseline',phase:'coarse'}});assert.equal(h.controller.state.progress,null);h.finish(1);await second;assert.equal(h.controller.state.status,'complete');assert.equal(h.controller.state.result.envelope.requestId,2);});
test('matching progress allowed, mismatched identity blocked',async()=>{const h=harness();const task=h.controller.run(),c=h.calls[0],progress={target:'baseline',phase:'coarse'};c.hooks.onProgress({...c.envelope,modelId:'wrong',progress});assert.equal(h.controller.state.progress,null);c.hooks.onProgress({...c.envelope,progress});assert.deepEqual(h.controller.state.progress,progress);h.finish(0,fixture,{kernelVersion:'wrong'});await task;assert.equal(h.controller.state.status,'failed');});
test('malformed or nonfinite completed data never exports',async()=>{for(const mutate of [r=>r.selected.refined=NaN,r=>r.difference=Infinity,r=>r.input.K=9,r=>r.refinement.selected=1,r=>r.analyticTruncation.baseline.sum=0,r=>r.equivalentToBaseline=true,r=>r.status='partial']){const h=harness(),r=structuredClone(fixture);mutate(r);const task=h.controller.run();h.finish(0,r);await task;assert.equal(h.controller.state.status,'failed');assert.equal(h.controller.exportRecord(),null);}});
test('worker load failure and execution rejection remain failed',async()=>{const h=harness();const task=h.controller.run();h.calls[0].reject(new Error('Worker could not run'));await task;assert.equal(h.controller.state.status,'failed');assert.equal(h.controller.exportRecord(),null);});
test('timeout aborts and late success cannot replace it',async()=>{let timeout;const h=harness({setTimer:fn=>{timeout=fn;return 1;},clearTimer:()=>{}});const task=h.controller.run();timeout();assert.equal(h.controller.state.status,'timeout');assert.ok(h.calls[0].hooks.signal.aborted);h.finish();await task;assert.equal(h.controller.state.status,'timeout');assert.equal(h.controller.exportRecord(),null);});
test('strict public inputs and envelope identity',()=>{for(const input of [{L:4,kappa:.5},{L:3,kappa:.1},{L:'3',kappa:.5},{L:3,kappa:.5,pc:1}])assert.throws(()=>inputSnapshot(input));assert.equal(matches({},{generation:1,requestId:1}),false);});
test('actual Worker module computes through Node adapter (not browser evidence)',async()=>{
  const worker=new Worker(new URL('./test-worker-adapter.mjs',import.meta.url));
  try{const h=harness(),task=h.controller.run(),env=h.calls[0].envelope;
    const result=await new Promise((resolve,reject)=>{worker.on('error',reject);worker.on('message',m=>{if(m.type==='result')resolve(m);else if(m.type==='error')reject(Error(m.error));});worker.postMessage({type:'run',envelope:env});});
    assert.ok(matches(result,env));validateRecord(result.result,env.input);h.calls[0].resolve(result);await task;assert.equal(h.controller.state.status,'complete');
  }finally{await worker.terminate();}
});

test('default timer wrappers preserve host receiver for scheduling and cleanup',async()=>{
  const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
  let scheduled=0,cleared=0;
  globalThis.setTimeout=function(...args){assert.equal(this,globalThis,'setTimeout host receiver');scheduled++;return originalSet(...args);};
  globalThis.clearTimeout=function(...args){assert.equal(this,globalThis,'clearTimeout host receiver');cleared++;return originalClear(...args);};
  try{
    const h=harness();let task=h.controller.run();h.finish();await task;assert.equal(h.controller.state.status,'complete');
    task=h.controller.run();h.controller.cancel();h.finish(1);await task;assert.equal(h.controller.state.status,'cancelled');
    assert.equal(scheduled,2);assert.equal(cleared,2);
  }finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});
