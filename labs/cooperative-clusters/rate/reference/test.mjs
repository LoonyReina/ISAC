import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {performance} from 'node:perf_hooks';
import {validateInput,integrateSync,integrateSteps,analyticTruncationBounds,calculate,CancelledError,CONFIG,MODEL_ID,KERNEL_VERSION} from './kernel.mjs';
const reference=JSON.parse(fs.readFileSync(new URL('./python-parity-reference.json',import.meta.url)));
const rows=[];
for(const row of reference.rows){
 const p={L:row.L,kappa:row.kappa},t=performance.now();
 const coarse=integrateSync(p,'coarse'),refined=integrateSync(p,'refined'),elapsedMs=performance.now()-t;
 const parity=Math.abs(refined-row.refined),delta=Math.abs(refined-coarse);
 assert(parity<=1e-6,JSON.stringify({p,parity}));assert(delta<=1e-6);
 const tails=analyticTruncationBounds(p);for(const k of ['low_z','high_z','small_v'])assert(Math.abs(tails[k]-row.tails[k])<1e-20);
 rows.push({...p,coarse,refined,pythonRefined:row.refined,parity,refinementChange:delta,analyticTruncation:tails,elapsedMs});
}
for(let L=1;L<=5;L++){
 const selected=rows.filter(r=>r.L===L);for(let i=1;i<selected.length;i++)assert(selected[i].refined>=selected[i-1].refined-1e-12);
 assert(Math.abs(selected[0].refined-rows[0].refined)<1e-6);
}
for(const r of rows.filter(r=>r.L===1))assert.equal(r.refined,rows[0].refined);
for(const invalid of [null,[],{}, {L:true,kappa:0},{L:0,kappa:0},{L:6,kappa:0},{L:2.1,kappa:0},{L:'3',kappa:0},{L:3,kappa:NaN},{L:3,kappa:Infinity},{L:3,kappa:-.1},{L:3,kappa:1.1},{L:3,kappa:'0.5'},{L:3,kappa:.5,pc:0}])assert.throws(()=>validateInput(invalid));
assert.throws(()=>integrateSync({L:3,kappa:.5},'custom'));
await assert.rejects(calculate({L:3,kappa:.5},{chunkSlices:9}));
const controller=new AbortController();let yields=0;
await assert.rejects(calculate({L:5,kappa:1},{signal:controller.signal,yieldControl:async()=>{if(++yields===3)controller.abort();}}),CancelledError);assert.equal(yields,3);
const pre=new AbortController();pre.abort();await assert.rejects(calculate({L:1,kappa:0},{signal:pre.signal}),CancelledError);
let schedulerCalls=0;
const runtime=await calculate({L:3,kappa:.5},{yieldControl:async()=>{schedulerCalls++;}});
assert(schedulerCalls>1000);assert.equal(runtime.selected.refined,rows.find(r=>r.L===3&&r.kappa===.5).refined);assert.equal(runtime.status,'computed-policy-checks-passed');
// Snapshot is captured before any yield, so caller edits cannot mutate the active input.
const changing={L:2,kappa:.25};const snap=await calculate(changing,{yieldControl:async()=>{changing.L=5;changing.kappa=1;}});assert.equal(snap.input.L,2);assert.equal(snap.input.kappa,.25);
const generator=integrateSteps({L:5,kappa:1});assert.equal(generator.next().value.slicesCompleted,1);generator.return();
// Real event-loop yield cancellation (not a promise-microtask-only scheduler).
const live=new AbortController();const cancelStarted=performance.now();setTimeout(()=>live.abort(),10);
await assert.rejects(calculate({L:5,kappa:1},{signal:live.signal}),CancelledError);
const liveCancelObservedMs=performance.now()-cancelStarted;
const summary={identity:'offline-node-validation',modelId:MODEL_ID,kernelVersion:KERNEL_VERSION,config:CONFIG,node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,referenceSourceHashes:reference.source_sha256,coverage:'35 cases: L 1..5, kappa 0,.125,.25,.5,.75,.875,1; fixed alpha4 K3 pc.5; all 20 proposed UI choices included',maxParity:Math.max(...rows.map(r=>r.parity)),maxRefinement:Math.max(...rows.map(r=>r.refinementChange)),liveCancelObservedMs,runtimeDiagnostic:runtime,tests:'parity, tails, monotonicity, kappa0 invariance, L1 irrelevance, input guards, fixed profiles, generator closure, pre-abort, deterministic cancellation, real event-loop cancellation, input snapshot',rows};
fs.writeFileSync(new URL('./validation-results.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',cases:rows.length,maxParity:summary.maxParity,maxRefinement:summary.maxRefinement,liveCancelObservedMs}));
