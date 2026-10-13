// One bounded validation/check job per actual module Worker. Never a UI-thread fallback.
import { checkRecord } from './runtime/check-record.mjs';
import { observe } from './runtime/model.mjs';
import { validateRequest } from './runtime/schema.mjs';
import { hashObject } from './runtime/record.mjs';

let send, listen;
if (typeof process !== 'undefined' && process.versions?.node) {
  const { parentPort } = await import('node:worker_threads');
  if (!parentPort) throw new Error('check-worker.mjs requires a Worker');
  send = message => parentPort.postMessage(message);
  listen = handler => parentPort.on('message', handler);
} else {
  send = message => globalThis.postMessage(message);
  listen = handler => { globalThis.onmessage = event => handler(event.data); };
}
let used = false;
listen(async message => {
  if (used || typeof message?.jobId !== 'string' || !['validate', 'check'].includes(message.type)) {
    send({ type: 'error', jobId: message?.jobId, error: { name: 'ProtocolError', message: 'One known job per Worker is required' } });
    return;
  }
  used = true;
  try {
    let result;
    if (message.type === 'validate') {
      validateRequest(message.request);
      // observe also rejects incompatible default paths and invalid derived noise variance.
      // This acquisition preflight remains in the Worker, before a live run changes owner.
      const data = observe(message.request.acquisition);
      result = { acquisitionSha256: await hashObject(data.acquisition) };
    } else {
      result = await checkRecord(message.text, { budget: message.budget });
    }
    send({ type: 'result', jobId: message.jobId, result });
  } catch (error) {
    send({ type: 'error', jobId: message.jobId, error: { name: error.name, message: error.message, reason: error.reason ?? null } });
  }
});
