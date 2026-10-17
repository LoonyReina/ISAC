import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {basis,fit,multiply,drain,experimentSteps,makeData,runAsync} from './kernel.mjs';
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures.json',import.meta.url)));
let checks=0,maxRelative=0;
function near(x,y,rtol=2e-9,atol=2e-12){assert.ok(Number.isFinite(x)&&Number.isFinite(y));const e=Math.abs(x-y);assert.ok(e<=atol+rtol*Math.abs(y),`${x} != ${y}, error ${e}`);if(Math.abs(y)>1e-10)maxRelative=Math.max(maxRelative,e/Math.abs(y));checks++;}
function compare(got,expected,path=''){for(const [k,v] of Object.entries(expected)){const p=path+'.'+k;if(v&&typeof v==='object')compare(got[k],v,p);else if(p.includes('delay_1')&&k==='matched_amplitude_retention_db'){assert.ok(got.matched_amplitude_retention_abs<1e-12);checks++;}else near(got[k],v);}}
const results=[];for(const f of fixtures.experiments){const start=performance.now(),got=drain(experimentSteps(f.data));compare(got,f.expected);results.push({seed:f.data.seed,count:f.data.count,rho:f.data.rho,milliseconds:performance.now()-start,result:got});}
for(const f of fixtures.fits){const got=fit(f.a,f.y);got.h.forEach((x,i)=>near(x,f.h[i]));compare(got.diagnostics,f.diagnostics);}
// Signed delay and complex nonconjugating operator.
const x=[1,2,2,-3,-4,5,6,7,-8,-9],a=basis(x,[2],[1,3],1,1);assert.deepEqual([...a.data].slice(0,6),[6,7,-4,5,2,-3]);
for(let j=0;j<3;j++){const re=a.data[2*j],im=a.data[2*j+1];near(a.data[6+2*j],re*(re*re+im*im));near(a.data[7+2*j],im*(re*re+im*im));}
const data=makeData('quick',104),idx=Array.from({length:1024},(_,i)=>16+i),A=basis(data.blocks[0].x,idx),h=Float64Array.from({length:24},(_,i)=>Math.sin(i+.5)),y=multiply(A,h),actual=fit(A,y);actual.h.forEach((v,i)=>near(v,h[i]));
const scales=Array.from({length:12},(_,j)=>10**(-5+10*j/11)),scaled={...A,data:Float64Array.from(A.data,(v,i)=>v*scales[(i>>1)%12])};const scaledh=fit(scaled,y).h;scaledh.forEach((v,i)=>near(v*scales[i>>1],h[i]));
for(const mode of ['zero','constant','envelope']){const z=Float64Array.from({length:2112},(_,i)=>mode==='zero'?0:mode==='constant'?(i%2?0:1):(i%2?Math.sin(i>>1):Math.cos(i>>1)));assert.throws(()=>fit(basis(z,idx),y),/excitation/);}
for(const orders of [[],[0],[2],[1,1],[1.5],[true]])assert.throws(()=>basis(x,[2],orders,1,1));for(const indices of [[0],[4],[1.5],[]])assert.throws(()=>basis(x,indices));assert.throws(()=>basis([NaN,0],[0],[1],0,0));assert.throws(()=>fit(A,[NaN]));
const snapshot=[...actual.h];multiply(basis(data.blocks[1].x,idx),actual.h);assert.deepEqual([...actual.h],snapshot);
assert.deepEqual(makeData('quick',42),makeData('quick',42));assert.notDeepEqual(makeData('quick',42).blocks[0].x,makeData('quick',42).blocks[1].x);
const sync=drain(experimentSteps(data));let yielded=0;const asyncResult=await runAsync(data,{budgetMs:.001,schedule:async()=>{yielded++;}});assert.deepEqual(asyncResult,sync);assert.ok(yielded>100);
let controller=new AbortController();controller.abort();await assert.rejects(runAsync(data,{signal:controller.signal}),{name:'AbortError'});
controller=new AbortController();let progress=0;await assert.rejects(runAsync(data,{signal:controller.signal,budgetMs:.001,schedule:async()=>{},onProgress:()=>{if(++progress===10)controller.abort();}}),{name:'AbortError'});assert.equal(progress,10);
// Failed/cancelled invocation cannot poison the next one.
assert.deepEqual(await runAsync(data,{budgetMs:50}),sync);
fs.writeFileSync(new URL('./PARITY-RESULTS.json',import.meta.url),JSON.stringify({checks,maxRelative,results},null,2));
console.log(`PASS ${checks} scalar parity checks; 8 NumPy-PCG64 experiment cases, 8 SVD coefficient fits, forward signs, recovery/scaling, rank/malformed guards, heldout isolation, deterministic seeds, sync/async identity, pre/mid cancellation and restart`);
console.log('Largest relative error on nonzero reference fields:',maxRelative);
