// Node VM exercises browser-specific module branches. This is NOT browser execution.
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {defaultSpec} from '../defaults.mjs';
import {realizeAcceptedCovariance,observe,receiverRequest} from '../runtime/src/adapter.mjs';
const runtime=new URL('../runtime/',import.meta.url);
async function browserWorker(entry){
 const cache=new Map(),loaded=[],messages=[];let terminalResolve,terminalReject;
 const terminal=new Promise((resolve,reject)=>{terminalResolve=resolve;terminalReject=reject;});
 const context=vm.createContext({performance,setTimeout,clearTimeout,structuredClone,Float64Array,ArrayBuffer,postMessage:m=>{messages.push(m);if(m.type==='error')terminalReject(Error(m.error));if(m.type==='result')terminalResolve(m.result);}});
 assert.equal(vm.runInContext('typeof process',context),'undefined');assert.equal(vm.runInContext('typeof require',context),'undefined');assert.equal(vm.runInContext('typeof module',context),'undefined');
 async function moduleFor(url){
  if(!url.href.startsWith(runtime.href))throw Error('Module escaped frozen runtime');if(cache.has(url.href))return cache.get(url.href);
  const source=await readFile(url,'utf8');
  const module=new vm.SourceTextModule(source,{context,identifier:url.href,initializeImportMeta:meta=>{meta.url=url.href;},importModuleDynamically:async(spec,ref)=>{
   loaded.push(spec);const dependency=await moduleFor(new URL(spec,ref.identifier));if(dependency.status==='unlinked')await dependency.link(link);if(dependency.status==='linked')await dependency.evaluate();return dependency;
  }});cache.set(url.href,module);return module;
 }
 const link=(spec,ref)=>moduleFor(new URL(spec,ref.identifier));const main=await moduleFor(new URL(entry,runtime));await main.link(link);await main.evaluate();
 assert.equal(typeof context.onmessage,'function');
 return {context,loaded,messages,request(data){context.onmessage({data});return terminal;}};
}
const spec=defaultSpec();
const solver=await browserWorker('src/solver-worker.mjs');
assert.deepEqual(solver.loaded,['linalg','hermitian','numerics','model','optimizer','metrics','core'].map(n=>`../vendor/solver/${n}.js`));
assert.equal(vm.runInContext('typeof NearfieldCrbKernel.createSolver',solver.context),'function');
const solved=await solver.request({id:'browser-branch-solver',type:'solve',input:spec.designInput,options:spec.solverOptions});
assert.equal(solved.acceptance,'accepted_numerical_candidate');assert.equal(solved.status,'central_path_finished');assert.ok(solved.physicalGate.passed);assert.ok(solver.messages.some(m=>m.type==='progress'&&m.phase==='optimization'));
const realized=realizeAcceptedCovariance(spec.designInput,solved),observation=observe(realized.X,spec.designInput,spec.scene);
const receiver=await browserWorker('src/receiver-worker.mjs');
const request=receiverRequest(observation.Y,spec.designInput,spec.receiver);
assert.deepEqual(Object.keys(request).sort(),['Y','array','domain','knownM','options']);
const received=await receiver.request({id:'browser-branch-receiver',type:'receive',request});
assert.equal(received.status,'ok');assert.equal(received.domain.count,40401);assert.ok(received.refinement.attempts.some(a=>!a.success));
console.log(JSON.stringify({kind:'node_vm_browser_branch_not_browser_execution',solver:solved.status,acceptance:solved.acceptance,loaderOrder:solver.loaded,receiver:received.status,gridPoints:received.domain.count,refinementStatuses:received.refinement.attempts.map(a=>a.status),receiverPayloadKeys:Object.keys(request).sort()}));
