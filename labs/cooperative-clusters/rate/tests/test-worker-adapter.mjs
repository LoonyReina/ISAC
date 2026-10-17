// Test-only Node adapter; production Worker uses the browser's self API.
import {parentPort} from 'node:worker_threads';
globalThis.self={postMessage:value=>parentPort.postMessage(value)};
await import('./worker.mjs');
parentPort.on('message',data=>self.onmessage({data}));
