// Actual Node Worker carrying an explicitly test-only numerical fixture.
import {parentPort} from 'node:worker_threads';
import {createRuntime} from '../runtime.mjs';
import {run,validateInput} from './protocol-fixture-kernel.mjs';
const runtime=createRuntime(message=>parentPort.postMessage(message),{run,validateInput});
parentPort.on('message',message=>runtime.receive(message));
