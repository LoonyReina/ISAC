import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker as NodeWorker} from 'node:worker_threads';
import {ResearchController} from '../controller.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
async function until(fn){const end=Date.now()+5000;while(!fn()){if(Date.now()>end)throw Error('Timeout waiting for controlled recovery');await sleep(1);}}
async function tracked(run){
 const previous=globalThis.Worker,created=[];globalThis.Worker=class extends NodeWorker {constructor(...args){super(...args);this.ended=false;this.on('exit',()=>this.ended=true);created.push(this);}};
 const c=new ResearchController();try{await run(c,created);}finally{await c.close();await Promise.all(created.map(w=>w.terminate()));if(previous===undefined)delete globalThis.Worker;else globalThis.Worker=previous;}
}

test('overlapping actual-Worker recovery is single-flight and close terminates every created Worker',{timeout:15000},async()=>tracked(async(c,created)=>{
 const old=await c.experiment.solverClientPromise;await old.terminate();const original=old.terminate.bind(old),gate=deferred();let calls=0;
 old.terminate=async()=>{calls++;await gate.promise;return original();};
 let first,second;try{
  first=c.action('solve');await until(()=>calls===1);second=c.action('solve');await sleep(20);assert.equal(calls,1,'second action joins existing repair');gate.resolve();
  const results=await Promise.all([first,second]);assert.deepEqual(results.map(r=>r.status),['superseded','observation_ready']);assert.equal(created.length,3,'one solver replacement, no orphan');
  await c.close();assert.ok(created.every(w=>w.ended),'all created Workers have exited');assert.equal(c.recoveryTasks.size,0);
 }finally{gate.resolve();await Promise.allSettled([first,second]);}
}));

test('close during pending actual-Worker replacement prevents new Worker creation and waits for repair',{timeout:15000},async()=>tracked(async(c,created)=>{
 const old=await c.experiment.solverClientPromise;await old.terminate();const original=old.terminate.bind(old),gate=deferred();let calls=0;
 old.terminate=async()=>{calls++;await gate.promise;return original();};
 let running,closing;try{
  running=c.action('solve');await until(()=>calls===1);closing=c.close();let secondCloseDone=false;const secondClose=c.close().then(()=>{secondCloseDone=true;});await sleep(20);assert.equal(secondCloseDone,false,'repeated close also waits for pending recovery');gate.resolve();await Promise.all([closing,secondClose]);
  assert.equal((await running).status,'superseded');assert.equal(created.length,2,'closed controller does not create a replacement');assert.ok(created.every(w=>w.ended));assert.equal(c.recoveryTasks.size,0);
 }finally{gate.resolve();await Promise.allSettled([running,closing]);}
}));

test('reset while actual-Worker repair is pending closes old owner and keeps only new owned clients',{timeout:15000},async()=>tracked(async(c,created)=>{
 const old=await c.experiment.solverClientPromise;await old.terminate();const original=old.terminate.bind(old),gate=deferred();let calls=0;
 old.terminate=async()=>{calls++;await gate.promise;return original();};let running;
 try{running=c.action('solve');await until(()=>calls===1);c.reset();gate.resolve();assert.equal((await running).status,'superseded');assert.equal((await c.action('solve')).status,'observation_ready');await c.close();assert.equal(created.length,4,'two new owner clients, no stale replacement');assert.ok(created.every(w=>w.ended));assert.equal(c.recoveryTasks.size,0);}finally{gate.resolve();await Promise.allSettled([running]);}
}));
