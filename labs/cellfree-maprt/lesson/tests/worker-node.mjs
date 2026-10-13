// Minimal Node transport only; production Worker module is unchanged.
import {parentPort,workerData} from 'node:worker_threads';
let ready=false,queue=[];globalThis.self={postMessage:m=>parentPort.postMessage(m)};
parentPort.on('message',data=>ready?self.onmessage({data}):queue.push(data));
await import(workerData.url);ready=true;for(const data of queue)self.onmessage({data});queue=[];
