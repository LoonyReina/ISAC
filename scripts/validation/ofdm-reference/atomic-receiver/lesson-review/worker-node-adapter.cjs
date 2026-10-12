'use strict';
// Execute the actual authored browser Worker in a fresh VM in a real Node worker thread.
// Only its exact local numerical-core import is permitted; no browser, DOM or network.
const {parentPort,workerData}=require('node:worker_threads'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(workerData.worktree),canonical=path.join(root,'labs/ofdm-reference');
const dir=fs.existsSync(path.join(canonical,'atomic-receiver-core.js'))?canonical:root;
const sandbox={performance,setTimeout,clearTimeout,console,postMessage:value=>parentPort.postMessage(value)};sandbox.self=sandbox;
const context=vm.createContext(sandbox);
sandbox.importScripts=(name)=>{if(name!=='atomic-receiver-core.js?v=atomic-eq27-v1')throw Error('Unexpected Worker import '+name);vm.runInContext(fs.readFileSync(path.join(dir,'atomic-receiver-core.js'),'utf8'),context,{filename:'atomic-receiver-core.js'});};
vm.runInContext(fs.readFileSync(path.join(dir,'atomic-receiver-worker.js'),'utf8'),context,{filename:'atomic-receiver-worker.js'});
parentPort.on('message',data=>sandbox.onmessage({data}));
