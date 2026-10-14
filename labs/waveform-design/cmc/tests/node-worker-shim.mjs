// Node-only test adapter. Never referenced by the teaching page.
import {parentPort} from 'node:worker_threads';
globalThis.postMessage=data=>parentPort.postMessage(data);
await import('../cmc-worker.mjs');
parentPort.on('message',data=>globalThis.onmessage({data}));
