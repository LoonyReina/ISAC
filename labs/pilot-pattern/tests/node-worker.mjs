import {parentPort,workerData} from 'node:worker_threads';
globalThis.postMessage=message=>parentPort.postMessage(message);
globalThis.addEventListener=(name,handler)=>{if(name==='message')parentPort.on('message',data=>handler({data}));};
await import(workerData.url);
