import fs from 'node:fs/promises';
const nativeFetch=globalThis.fetch;globalThis.fetch=async (url,options)=>String(url).startsWith('file:')?new Response(await fs.readFile(url)):nativeFetch(url,options);
import {parentPort,workerData} from 'node:worker_threads';
globalThis.postMessage=message=>parentPort.postMessage(message);
globalThis.addEventListener=(name,handler)=>{if(name==='message')parentPort.on('message',data=>handler({data}));};
await import(workerData.url);
