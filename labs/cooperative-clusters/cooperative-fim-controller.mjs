import { DEFAULT_STATE, PROVENANCE, normalizeState, immutable, computeSingleComparison, batchComparison, cancelledBatch } from './cooperative-fim-model.mjs';

/** Fetch and verify exact accepted bytes before enabling any run. URLs follow the root-flattened integration map. */
export async function loadRetainedFixture({ fetchImpl = globalThis.fetch, cryptoImpl = globalThis.crypto,
  fixtureURL = new URL('./assets/data/cooperative-fim-retained-coordinates.json', import.meta.url),
  coreURL = new URL('./cooperative-fim-core.mjs', import.meta.url) } = {}) {
  if (typeof fetchImpl !== 'function' || !cryptoImpl?.subtle) throw new Error('Fixture integrity verification requires fetch and Web Crypto');
  const assets = [
    [new URL(fixtureURL, import.meta.url), PROVENANCE.fixture_sha256],
    [new URL(coreURL, import.meta.url), PROVENANCE.core_sha256],
  ];
  const buffers = await Promise.all(assets.map(async ([url, expected]) => {
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`Could not load ${url.pathname}: HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    const digest = await cryptoImpl.subtle.digest('SHA-256', bytes);
    const actual = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    if (actual !== expected) throw new Error(`SHA-256 integrity mismatch: ${url.pathname}`);
    return bytes;
  }));
  return { fixture: JSON.parse(new TextDecoder().decode(buffers[0])), integrity: {
    verified: true, core_sha256: PROVENANCE.core_sha256, fixture_sha256: PROVENANCE.fixture_sha256,
  } };
}

const browserWorker = () => new Worker(new URL('./cooperative-fim-worker.mjs', import.meta.url), { type: 'module' });

/** DOM-independent lifecycle; every published snapshot and computation input is immutable. */
export function createLessonController({ fixture: initialFixture, loadFixture = loadRetainedFixture,
  workerFactory = browserWorker, onChange = () => {}, initialState = DEFAULT_STATE, cancelTimeoutMs = 2000 } = {}) {
  if (typeof onChange !== 'function' || typeof workerFactory !== 'function' || typeof loadFixture !== 'function') throw new TypeError('Controller callbacks must be functions');
  if (!Number.isFinite(cancelTimeoutMs) || cancelTimeoutMs < 0) throw new TypeError('cancelTimeoutMs must be nonnegative');
  let fixture = initialFixture ? immutable(initialFixture) : null;
  let integrity = { verified: false, reason: 'Injected fixture; original asset hashes are provenance, not an integrity assertion for this input.' };
  let snapshot = immutable({ state: normalizeState(initialState), phase: fixture ? 'ready' : 'loading', result: null,
    progress: null, error: null, activeRequestId: null });
  let active = null, sequence = 0, runIntent = 0, loading = null, disposed = false;
  const requireLive = () => { if (disposed) throw new Error('Controller is destroyed'); };
  const emit = patch => {
    snapshot = immutable({ ...snapshot, ...patch });
    onChange(snapshot);
    return snapshot;
  };
  const finishJob = job => {
    if (job.timer) clearTimeout(job.timer);
    job.worker?.removeEventListener?.('message', job.message);
    job.worker?.removeEventListener?.('error', job.error);
    job.worker?.removeEventListener?.('messageerror', job.error);
    job.worker?.terminate();
    if (active === job) active = null;
    job.resolve?.(snapshot);
  };
  const abandon = () => {
    if (!active) return;
    const job = active;
    active = null;
    try { job.worker?.postMessage?.({ type: 'cancel', request_id: job.id }); }
    catch { /* Obsolete workers are terminated even if their channel has failed. */ }
    finally { finishJob(job); }
  };
  const resultWithProvenance = (result, request_id) => immutable({ ...result, request_id,
    provenance: { ...result.provenance, asset_integrity: integrity } });
  const fail = (job, error) => {
    if (active !== job || disposed) return;
    emit({ phase: 'error', result: null, error: String(error?.message ?? error), activeRequestId: null });
    finishJob(job);
  };

  function load() {
    requireLive();
    if (fixture) return Promise.resolve(snapshot);
    if (loading) return loading;
    emit({ phase: 'loading', error: null, result: null });
    loading = Promise.resolve().then(() => loadFixture()).then(value => {
      if (disposed) return snapshot;
      fixture = immutable(value?.fixture ?? value);
      integrity = value?.integrity ? immutable(value.integrity) : integrity;
      // Validate availability without computing or substituting any retained result.
      if (!fixture || !Array.isArray(fixture.fixed) || !Array.isArray(fixture.samples)) throw new TypeError('Invalid retained fixture structure');
      return emit({ phase: 'ready', error: null });
    }).catch(error => {
      fixture = null;
      if (!disposed) emit({ phase: 'error', result: null, error: String(error?.message ?? error), activeRequestId: null });
      return snapshot;
    }).finally(() => { loading = null; });
    return loading;
  }

  function setInputs(patch) {
    requireLive();
    // Validate before cancelling existing work; a bad UI value cannot destroy a valid run.
    normalizeState(patch);
    const state = normalizeState({ ...snapshot.state, ...patch });
    if (JSON.stringify(state) === JSON.stringify(snapshot.state)) return snapshot;
    runIntent++;
    abandon();
    return emit({ state, phase: fixture ? 'stale' : (loading ? 'loading' : snapshot.phase),
      progress: null, error: null, activeRequestId: null });
  }

  async function run() {
    requireLive();
    const intent = ++runIntent;
    if (!fixture) await load();
    if (disposed || intent !== runIntent || !fixture) return snapshot;
    abandon();
    const state = normalizeState(snapshot.state), id = `comparison-${++sequence}`;
    const job = { id, state, worker: null, resolve: null, cancellationRequested: false, timer: null };
    active = job;
    emit({ phase: 'running', result: null, progress: { request_id: id, attempted: 0,
      requested_attempts: state.preset === 'network' && state.view === 'average' ? state.trials * 2 : 2,
      complete: false }, error: null, activeRequestId: id });
    if (state.preset !== 'network' || state.view !== 'average') {
      try {
        const result = resultWithProvenance(computeSingleComparison(state, fixture), id);
        if (active === job) emit({ phase: 'ready', result, progress: { request_id: id, attempted: 2, requested_attempts: 2, complete: true }, activeRequestId: null });
        finishJob(job);
      } catch (error) { fail(job, error); }
      return snapshot;
    }
    return new Promise(resolve => {
      job.resolve = resolve;
      try {
        const worker = workerFactory();
        if (!worker || typeof worker.postMessage !== 'function' || typeof worker.addEventListener !== 'function' || typeof worker.terminate !== 'function') throw new TypeError('workerFactory must return a Worker-compatible object');
        job.worker = worker;
        job.message = event => {
          const message = event?.data;
          if (disposed || active !== job || message?.request_id !== job.id) return;
          if (message.type === 'progress') {
            if (job.cancellationRequested) return;
            const progress = message.progress;
            if (!progress || progress.request_id !== job.id || !Number.isInteger(progress.attempted)
              || progress.attempted < snapshot.progress.attempted || progress.attempted > state.trials * 2
              || progress.requested_attempts !== state.trials * 2) return;
            emit({ progress: { ...progress, complete: false } });
          } else if (message.type === 'error') {
            fail(job, message.error ?? 'Worker calculation failed');
          } else if (message.type === 'result') {
            try {
              if (message.batch?.request_id !== job.id) throw new Error('Worker batch request ID mismatch');
              const batch = job.cancellationRequested ? cancelledBatch(message.batch) : message.batch;
              const result = resultWithProvenance(batchComparison(state, fixture, batch), id);
              emit({ phase: batch.complete ? 'ready' : 'cancelled', result,
                progress: { request_id: id, attempted: batch.attempted, requested_attempts: batch.requested_attempts, complete: batch.complete },
                activeRequestId: null, error: null });
              finishJob(job);
            } catch (error) { fail(job, error); }
          }
        };
        job.error = event => fail(job, event?.message ?? 'Worker failed to load or transfer its result');
        worker.addEventListener('message', job.message);
        worker.addEventListener('error', job.error);
        worker.addEventListener('messageerror', job.error);
        worker.postMessage({ type: 'run', request_id: id, state, fixture });
      } catch (error) { fail(job, error); }
    });
  }

  function cancel() {
    requireLive();
    if (!active || active.cancellationRequested) return snapshot;
    const job = active;
    job.cancellationRequested = true;
    emit({ phase: 'cancelling', result: null });
    try { job.worker?.postMessage({ type: 'cancel', request_id: job.id }); }
    catch (error) { fail(job, error); return snapshot; }
    if (active === job) job.timer = setTimeout(() => {
      if (active !== job || disposed) return;
      // A blocked Worker cannot certify unreported attempts. Preserve the last reported count only.
      emit({ phase: 'cancelled', result: null, activeRequestId: null,
        progress: { ...snapshot.progress, complete: false, countsAreLastReported: true } });
      finishJob(job);
    }, cancelTimeoutMs);
    return snapshot;
  }

  function reset(preset = snapshot.state.preset) {
    requireLive();
    return setInputs({ ...DEFAULT_STATE, preset });
  }
  function downloadJSON() {
    requireLive();
    if (!snapshot.result) throw new Error('There is no calculation snapshot to download');
    return JSON.stringify({ format: 'isac-cooperative-fim-comparison-v1', phase: snapshot.phase,
      currentControls: snapshot.state, result: snapshot.result }, null, 2);
  }
  function destroy() {
    if (disposed) return;
    runIntent++;
    abandon();
    disposed = true;
  }
  return Object.freeze({ getSnapshot: () => snapshot, setInputs, run, cancel, reset, load, downloadJSON, destroy });
}
