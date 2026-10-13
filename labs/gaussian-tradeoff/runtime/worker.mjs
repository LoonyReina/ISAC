/** Actual module-Worker entry point. No fixture or reference data is loaded. */
import {run,validateInput} from './kernel.mjs';
import {createRuntime} from './runtime.mjs';
if(typeof self==='object'&&typeof self.postMessage==='function'){
  // Browser module Worker branch. Tested separately in a VM; VM is not a browser.
  let runtime;self.onmessage=event=>runtime.receive(event.data);
  runtime=createRuntime(message=>self.postMessage(message),{run,validateInput});
}else if(typeof process==='object'&&process.versions?.node){
  // Node worker_threads branch. Never imported in the browser branch.
  const {parentPort}=await import('node:worker_threads');
  if(!parentPort)throw new Error('worker.mjs must run in a Worker');
  const runtime=createRuntime(message=>parentPort.postMessage(message),{run,validateInput});
  parentPort.on('message',message=>runtime.receive(message));
}else throw new Error('No supported Worker transport');
