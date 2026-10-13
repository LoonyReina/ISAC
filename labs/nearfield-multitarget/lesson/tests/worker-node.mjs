import {parentPort,workerData} from 'node:worker_threads';
const queued=[];globalThis.self={postMessage:m=>parentPort.postMessage(m),onmessage:null};parentPort.on('message',data=>{if(self.onmessage)self.onmessage({data});else queued.push(data);});await import(workerData.url);for(const data of queued)self.onmessage({data});
