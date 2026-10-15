import { runFixtureBatch } from './cooperative-fim-core.mjs';
import { createBatchRequest } from './cooperative-fim-model.mjs';

/** Exported for deterministic protocol tests; the browser uses the same handler. */
export function createWorkerHandler(postMessage, { runBatch = runFixtureBatch } = {}) {
  let active = null;
  return async function handleMessage(event) {
    const message = event?.data ?? event;
    if (message?.type === 'cancel') {
      if (active?.request_id === message.request_id) active.controller.abort();
      return;
    }
    if (message?.type !== 'run') return;
    active?.controller.abort();
    const job = { request_id: message.request_id, controller: new AbortController() };
    active = job;
    try {
      const request = createBatchRequest(message.state, message.fixture, message.request_id);
      const batch = await runBatch(request, { signal: job.controller.signal, batch_size: 8,
        on_progress: progress => { if (active === job) postMessage({ type: 'progress', request_id: job.request_id, progress }); },
      });
      if (active === job) postMessage({ type: 'result', request_id: job.request_id, batch });
    } catch (error) {
      if (active === job) postMessage({ type: 'error', request_id: job.request_id, error: String(error?.message ?? error) });
    } finally {
      if (active === job) active = null;
    }
  };
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof self.document === 'undefined') {
  const handleMessage = createWorkerHandler(message => self.postMessage(message));
  self.addEventListener('message', event => { void handleMessage(event); });
}
