import {parentPort} from 'node:worker_threads';
import {compute} from './worker.mjs';
parentPort.on('message',m=>compute(m,data=>parentPort.postMessage(data)));
