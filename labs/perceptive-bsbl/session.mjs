// DOM-independent ownership boundary. View state and URL fragments never enter this API.
import { createBrowserClient } from './runtime/client.mjs';
import { canonical, decodeRecord, encodeRecord, deepFreeze } from './runtime/record.mjs';
import { validateRequest } from './runtime/schema.mjs';
import { validateBudget } from './runtime/budget.mjs';
import { LIMITS } from './runtime/model.mjs';

const errorInfo = error => Object.freeze({ name: error?.name ?? 'Error', message: String(error?.message ?? error), reason: error?.reason ?? null });
function abortError(reason) {
  const error = new Error(reason);
  error.name = 'AbortError';
  return error;
}
function browserChecker() {
  if (typeof globalThis.Worker !== 'function') throw new Error('module Worker API unavailable; no main-thread checker fallback');
  return new globalThis.Worker(new URL('./check-worker.mjs', import.meta.url), { type: 'module' });
}

// Handles both browser Workers and real Node worker_threads Workers.
function startJob(factory, type, input, milliseconds) {
  const jobId = globalThis.crypto.randomUUID();
  let worker, timer, resolve, reject, settled = false, terminated = Promise.resolve();
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  const finish = (error, result) => {
    if (settled) return terminated;
    settled = true;
    clearTimeout(timer);
    // Terminate even successful jobs; no dormant checker or validator survives a job.
    try { terminated = Promise.resolve(worker?.terminate()).catch(() => {}); } catch {}
    if (error) reject(error); else resolve(result);
    return terminated;
  };
  const receive = message => {
    if (settled || message?.jobId !== jobId) return;
    if (message.type === 'result') finish(null, message.result);
    else if (message.type === 'error') {
      const error = new Error(message.error?.message ?? 'Worker error');
      error.name = message.error?.name ?? 'WorkerError';
      error.reason = message.error?.reason ?? null;
      finish(error);
    } else finish(new Error('Unknown checker Worker response'));
  };
  try {
    worker = factory();
    if (typeof worker.on === 'function') {
      worker.on('message', receive);
      worker.on('error', error => finish(error));
      worker.on('exit', code => finish(new Error(`Checker Worker exited before a result (${code})`)));
    } else {
      worker.onmessage = event => receive(event.data);
      worker.onerror = event => finish(new Error(event.message ?? 'Checker Worker error'));
      worker.onmessageerror = () => finish(new Error('Checker Worker structured-clone failure'));
    }
    timer = setTimeout(() => finish(abortError('checker_hard_wall_deadline')), milliseconds);
    worker.postMessage({ type, jobId, ...input });
  } catch (error) { finish(error); }
  return { promise, cancel: (reason = 'cancelled') => finish(abortError(reason)) };
}

/**
 * createLessonSession({client?, checkerFactory?, onChange?})
 *
 * run(request) performs full Worker-side acquisition validation before replacing an owner.
 * replay() re-executes the exact stored request using the current runtime and compares its
 * generated acquisition hash. It is not a raw-Y-input runner. check() independently replays
 * the stored raw record in its own Worker. sourceRecord preserves imported execution hashes.
 * exportText({source:true}) exports that source; the default exports the displayed record.
 * All exports are exact encodeRecord output, without UI metadata or a second envelope.
 */
export function createLessonSession({ client = createBrowserClient(), checkerFactory = browserChecker, onChange } = {}) {
  const listeners = new Set(typeof onChange === 'function' ? [onChange] : []);
  let state = Object.freeze({ record: null, sourceRecord: null, receipt: null, execution: null,
    busy: false, validating: false, importBusy: false, mode: 'fresh', checkReport: null,
    checkBusy: false, error: null, owner: 0, revision: 0, disposed: false });
  let intent = 0, runToken = 0, fileToken = 0, checkToken = 0;
  let validationJob = null, checkJob = null, lastOperation = Promise.resolve(null);
  const encodings = new WeakMap();
  const patch = changes => {
    state = Object.freeze({ ...state, ...changes });
    for (const listener of [...listeners]) {
      // A renderer cannot take ownership away or interrupt lifecycle cleanup by throwing.
      try { listener(state); } catch {}
    }
  };
  const alive = () => { if (state.disposed) throw new Error('lesson session disposed'); };
  const track = promise => { lastOperation = promise; return promise; };
  const stopValidation = reason => { const done = validationJob?.cancel(reason); validationJob = null; return done; };
  const stopCheck = reason => { ++checkToken; const done = checkJob?.cancel(reason); checkJob = null; return done; };
  const incomplete = (record, reason) => deepFreeze({ status: 'incomplete', executionStatus: record?.payload.status ?? null,
    checks: 0, failures: [], unavailable: [reason], interrupted: true, owner: state.owner,
    recordSha256: record?.payloadSha256 ?? null });
  const commitRecord = record => {
    stopCheck('record_changed');
    patch({ record, revision: state.revision + 1, checkReport: null, checkBusy: false });
  };

  function launch(input, mode, sourceRecord = null) {
    let request;
    try {
      alive();
      const text = canonical(input === undefined ? {} : input);
      if (new TextEncoder().encode(text).length > 64000) throw new RangeError('Worker request exceeds 64 KB');
      request = JSON.parse(text);
      validateRequest(request);
    } catch (error) {
      // An invalid B never changes runToken, owner, active A, or A's cancel route.
      if (!state.disposed) patch({ error: errorInfo(error) });
      return track(Promise.reject(error));
    }
    const ticket = ++intent;
    ++fileToken;
    stopValidation('newer_request');
    const job = startJob(checkerFactory, 'validate', { request }, 21000);
    validationJob = job;
    patch({ validating: true, importBusy: false, error: null });
    return track((async () => {
      let token;
      try {
        const preflight = await job.promise;
        if (state.disposed || ticket !== intent) return null;
        validationJob = null;
        if (sourceRecord && preflight.acquisitionSha256 !== sourceRecord.payload.provenance.acquisitionSha256) {
          throw new Error('Replay request regenerates a different acquisition; imported source retained');
        }
        const owner = state.owner + 1;
        token = ++runToken;
        stopCheck('new_run');
        patch({ owner, record: null, sourceRecord, revision: state.revision + 1, receipt: null, execution: null,
          mode, busy: true, validating: false, checkReport: null, checkBusy: false, error: null });
        const result = await client.run(request, record => {
          if (!state.disposed && token === runToken && state.owner === owner) commitRecord(record);
        });
        if (state.disposed || token !== runToken || state.owner !== owner) return null;
        let receipt = result;
        if (sourceRecord) {
          receipt = deepFreeze({ ...result, replay: { sourcePayloadSha256: sourceRecord.payloadSha256,
            sourceAcquisitionSha256: sourceRecord.payload.provenance.acquisitionSha256,
            generatedAcquisitionSha256: result.record?.payload.provenance.acquisitionSha256 ?? null,
            acquisitionMatches: result.record ? result.record.payload.provenance.acquisitionSha256 === sourceRecord.payload.provenance.acquisitionSha256 : null,
            kind: 'same-request-regeneration-current-runtime' } });
        }
        if (result.record) commitRecord(result.record);
        patch({ receipt, execution: receipt, busy: false, error: result.error ? errorInfo(result.error) : null });
        return receipt;
      } catch (error) {
        if (state.disposed || (token === undefined ? ticket !== intent : token !== runToken)) return null;
        validationJob = null;
        patch({ validating: false, ...(token === undefined ? {} : { busy: false }), error: errorInfo(error) });
        throw error;
      }
    })());
  }

  function importRead(read) {
    try { alive(); } catch (error) { return track(Promise.reject(error)); }
    const ticket = ++intent, file = ++fileToken;
    stopValidation('import_selected');
    patch({ validating: false, importBusy: true, error: null });
    return track((async () => {
      try {
        const text = await read();
        if (state.disposed || ticket !== intent || file !== fileToken) return null;
        const record = await decodeRecord(text);
        if (state.disposed || ticket !== intent || file !== fileToken) return null;
        const token = ++runToken, owner = state.owner + 1;
        stopCheck('imported_record');
        // Install first. A delayed termination of the previous run cannot hide the new owner.
        patch({ owner, record, sourceRecord: null, revision: state.revision + 1, receipt: null, execution: null,
          mode: 'imported', busy: false, importBusy: false, checkReport: null, checkBusy: false, error: null });
        await client.cancel({ hard: true, reason: 'record_imported' });
        return !state.disposed && token === runToken ? record : null;
      } catch (error) {
        if (state.disposed || ticket !== intent || file !== fileToken) return null;
        patch({ importBusy: false, error: errorInfo(error) });
        throw error;
      }
    })());
  }

  function check({ budget } = {}) {
    let limits;
    try {
      alive();
      if (!state.record) throw new Error('No record to check');
      if (state.busy) throw new Error('Wait for execution to stop before checking its evidence');
      limits = validateBudget(budget);
    } catch (error) { return track(Promise.reject(error)); }
    stopCheck('newer_check');
    const token = checkToken, owner = state.owner, revision = state.revision, record = state.record;
    const current = () => !state.disposed && token === checkToken && owner === state.owner && revision === state.revision;
    patch({ checkBusy: true, checkReport: null, error: null });
    return track((async () => {
      try {
        const text = await exportRecord(record);
        if (!current()) return null;
        checkJob = startJob(checkerFactory, 'check', { text, budget: limits }, limits.maxMilliseconds + 1000);
        const report = await checkJob.promise;
        if (!current()) return null;
        checkJob = null;
        if (!['passed', 'failed', 'incomplete'].includes(report?.status) || report.executionStatus !== record.payload.status ||
            !Array.isArray(report.failures) || !Array.isArray(report.unavailable) ||
            (report.status === 'passed' && (!['complete', 'capped'].includes(record.payload.status) || report.failures.length || report.unavailable.length))) {
          throw new Error('Invalid or incomplete checker report cannot be presented as passed');
        }
        const attached = deepFreeze({ ...report, owner, recordSha256: record.payloadSha256 });
        patch({ checkBusy: false, checkReport: attached });
        return attached;
      } catch (error) {
        if (!current()) return null;
        checkJob = null;
        const report = incomplete(record, `${error.name}: ${error.message}`);
        patch({ checkBusy: false, checkReport: report, error: errorInfo(error) });
        return report;
      }
    })());
  }

  function exportRecord(record) {
    if (!record) return Promise.reject(new Error('No record to export'));
    if (!encodings.has(record)) encodings.set(record, encodeRecord(record));
    return encodings.get(record);
  }
  function cancel({ hard = false } = {}) {
    if (state.disposed) return Promise.resolve(false);
    const hadPending = state.validating || state.importBusy || state.checkBusy;
    ++intent; ++fileToken;
    const validationStopped = stopValidation('cancelled');
    const report = state.checkBusy ? incomplete(state.record, 'checker cancelled') : state.checkReport;
    const checkerStopped = stopCheck('cancelled');
    patch({ validating: false, importBusy: false, checkBusy: false, checkReport: report });
    return Promise.all([client.cancel({ hard, reason: 'user_cancelled' }), validationStopped, checkerStopped]).then(([cancelled]) => Boolean(cancelled || hadPending));
  }
  function dispose() {
    if (state.disposed) return Promise.resolve();
    ++intent; ++runToken; ++fileToken;
    const validationStopped = stopValidation('disposed');
    const report = state.checkBusy ? incomplete(state.record, 'checker disposed') : state.checkReport;
    const checkerStopped = stopCheck('disposed');
    patch({ disposed: true, busy: false, validating: false, importBusy: false, checkBusy: false, checkReport: report });
    listeners.clear();
    return Promise.all([client.dispose(), validationStopped, checkerStopped]).then(() => undefined);
  }
  const api = {
    get state() { return state; },
    get lastOperation() { return lastOperation; },
    snapshot: () => state,
    subscribe(listener) { alive(); if (typeof listener !== 'function') throw new TypeError('listener required'); listeners.add(listener); return () => listeners.delete(listener); },
    run: request => launch(request, 'fresh'),
    replay() {
      if (!state.record) return track(Promise.reject(new Error('No record to replay')));
      const source = state.sourceRecord ?? state.record;
      return launch(source.payload.request, 'replay', source);
    },
    importText: text => importRead(() => text),
    importFile: file => importRead(() => {
      if (!file || typeof file.text !== 'function') throw new TypeError('Readable record file required');
      if (!Number.isFinite(file.size) || file.size < 0 || file.size > LIMITS.maxRecordBytes) throw new RangeError('record exceeds byte cap');
      return file.text();
    }),
    check, cancel, dispose,
    exportText: ({ source = false } = {}) => exportRecord(source ? state.sourceRecord : state.record),
    rawText: ({ source = false } = {}) => exportRecord(source ? state.sourceRecord : state.record)
  };
  return Object.freeze(api);
}
