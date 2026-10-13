import {parentPort} from 'node:worker_threads';
import {createController} from './protocol.mjs';
const controller=createController(record=>parentPort.postMessage(record));
parentPort.on('message',message=>controller.receive(message));
