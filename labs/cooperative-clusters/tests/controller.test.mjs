import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { createLessonController, loadRetainedFixture } from '../labs/cooperative-clusters/cooperative-fim-controller.mjs';
import { createBatchRequest, PROVENANCE } from '../labs/cooperative-clusters/cooperative-fim-model.mjs';
import { runFixtureBatch } from '../labs/cooperative-clusters/cooperative-fim-core.mjs';
import { createWorkerHandler } from '../labs/cooperative-clusters/cooperative-fim-worker.mjs';
const fixture = JSON.parse(await readFile(new URL('../assets/data/cooperative-fim-retained-coordinates.json', import.meta.url)));
const state = { preset: 'network', view: 'average', trials: 64 };
const fullBatch = await runFixtureBatch(createBatchRequest(state, fixture, 'placeholder'), { yield_control: async () => {} });
const cloneBatch = request_id => ({ ...structuredClone(fullBatch), request_id });
class FakeWorker {
  listeners = new Map(); messages = []; terminated = false; historical = new Map();
  addEventListener(type, fn) { this.listeners.set(type, fn); this.historical.set(type, fn); }
  removeEventListener(type, fn) { if (this.listeners.get(type) === fn) this.listeners.delete(type); }
  postMessage(message) { this.messages.push(structuredClone(message)); }
  terminate() { this.terminated = true; }
  emit(message) { this.historical.get('message')?.({ data: message }); }
  crash(message = 'Worker exploded') { this.historical.get('error')?.({ message }); }
  progress(attempted, request_id = this.messages[0].request_id) { this.emit({ type: 'progress', request_id, progress: { request_id, attempted, requested_attempts: 128, complete: false } }); }
  finish(request_id = this.messages[0].request_id) { this.emit({ type: 'result', request_id, batch: cloneBatch(request_id) }); }
}
function harness(options = {}) {
  const workers = [], snapshots = [];
  const controller = createLessonController({ fixture, initialState: state,
    workerFactory: () => { const worker = new FakeWorker(); workers.push(worker); return worker; },
    onChange: value => snapshots.push(value), ...options });
  return { controller, workers, snapshots };
}

test('single lifecycle, stale inputs, reset-current-preset, and snapshot download', async () => {
  const source = structuredClone(fixture), snapshots = [];
  const controller = createLessonController({ fixture: source, onChange: value => snapshots.push(value) });
  source.fixed[0].stations[0][0] = 99;
  assert.equal(controller.getSnapshot().phase, 'ready');
  await controller.run();
  assert.deepEqual(snapshots.map(value => value.phase), ['running', 'ready']);
  const original = controller.getSnapshot();
  assert.equal(original.result.sides[0].result.analysis.trace_inverse, 0.375);
  assert.equal(original.result.provenance.asset_integrity.verified, false);
  controller.setInputs({ n: 1 });
  assert.equal(controller.getSnapshot().phase, 'stale');
  assert.equal(controller.getSnapshot().result.state.n, 4);
  const downloaded = JSON.parse(controller.downloadJSON());
  assert.equal(downloaded.currentControls.n, 1);
  assert.equal(downloaded.result.state.n, 4);
  assert.equal(downloaded.result.provenance.core_sha256, PROVENANCE.core_sha256);
  assert.throws(() => { original.state.n = 2; }, TypeError);
  await controller.run();
  assert.equal(controller.getSnapshot().result.sides[1].result.analysis.trace_inverse, 'infinity');
  assert.equal(original.result.sides[1].result.analysis.trace_inverse, 0.125);
  controller.setInputs({ preset: 'collinear', epsilon: '1e-07' });
  controller.reset();
  assert.equal(controller.getSnapshot().state.preset, 'collinear');
  assert.equal(controller.getSnapshot().state.epsilon, '1e-05');
  assert.equal(controller.getSnapshot().state.trials, 256);
  controller.destroy();
  assert.throws(() => controller.setInputs({ n: 2 }), /destroyed/);
});

test('loading, shared loads, retry after load error, and no stale success', async () => {
  let resolveLoad, calls = 0;
  const controller = createLessonController({ loadFixture: () => { calls++; return new Promise(resolve => { resolveLoad = resolve; }); } });
  assert.equal(controller.getSnapshot().phase, 'loading');
  const a = controller.load(), b = controller.load();
  assert.equal(a, b);
  await Promise.resolve();
  assert.equal(calls, 1);
  resolveLoad(fixture); await a;
  assert.equal(controller.getSnapshot().phase, 'ready');
  let fails = true;
  const retry = createLessonController({ loadFixture: async () => { if (fails) throw new Error('offline'); return fixture; } });
  await retry.run();
  assert.equal(retry.getSnapshot().phase, 'error');
  assert.equal(retry.getSnapshot().error, 'offline');
  assert.equal(retry.getSnapshot().result, null);
  fails = false; await retry.run();
  assert.equal(retry.getSnapshot().phase, 'ready');
  assert.equal(retry.getSnapshot().result.state.n, 4);
});

test('asset loader verifies both accepted byte hashes and rejects corruption/missing assets', async () => {
  const fetchImpl = async url => {
    const bytes = await readFile(url);
    return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
  };
  const loaded = await loadRetainedFixture({ fetchImpl, cryptoImpl: webcrypto,
    fixtureURL: new URL('../assets/data/cooperative-fim-retained-coordinates.json', import.meta.url) });
  assert.equal(loaded.integrity.verified, true);
  assert.deepEqual(loaded.fixture, fixture);
  const c = createLessonController({ loadFixture: () => loaded }); await c.run();
  assert.equal(c.getSnapshot().result.provenance.asset_integrity.verified, true);
  await assert.rejects(loadRetainedFixture({ cryptoImpl: webcrypto, fetchImpl: async () => ({ ok: true, arrayBuffer: async () => new TextEncoder().encode('{}').buffer }) }), /integrity mismatch/);
  await assert.rejects(loadRetainedFixture({ cryptoImpl: webcrypto, fetchImpl: async () => ({ ok: false, status: 404 }) }), /HTTP 404/);
  await assert.rejects(loadRetainedFixture({ fetchImpl, cryptoImpl: {} }), /Web Crypto/);
});

test('Worker average completion retains all input/output, progress, and statistics', async () => {
  const { controller, workers } = harness();
  const run = controller.run(), worker = workers[0];
  assert.equal(worker.messages[0].type, 'run');
  worker.progress(8);
  assert.equal(controller.getSnapshot().progress.attempted, 8);
  worker.finish(); await run;
  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.phase, 'ready');
  assert.equal(snapshot.activeRequestId, null);
  assert.equal(snapshot.progress.complete, true);
  assert.equal(snapshot.result.batch.records.length, 128);
  assert.equal(snapshot.result.inputSnapshot.request.samples.length, 64);
  assert.ok(worker.terminated);
  const download = JSON.parse(controller.downloadJSON());
  assert.equal(download.result.statistics.finitePairs, 64);
  assert.equal(download.result.batch.records.length, 128);
  assert.equal(download.result.provenance.fixture_sha256, PROVENANCE.fixture_sha256);
});

test('cancel sends protocol message, retains partial counts, and reports no aggregate', async () => {
  const { controller, workers } = harness();
  const pending = controller.run(), worker = workers[0], id = worker.messages[0].request_id;
  worker.progress(8); controller.cancel();
  assert.equal(controller.getSnapshot().phase, 'cancelling');
  assert.equal(worker.messages[1].type, 'cancel');
  const abort = new AbortController();
  const batch = await runFixtureBatch(createBatchRequest(state, fixture, id), { signal: abort.signal,
    batch_size: 9, yield_control: async () => {}, on_progress: () => abort.abort() });
  worker.emit({ type: 'result', request_id: id, batch }); await pending;
  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.phase, 'cancelled');
  assert.equal(snapshot.progress.attempted, 9);
  assert.deepEqual(snapshot.result.sides.map(side => side.summary.attempted), [5, 4]);
  assert.equal(snapshot.result.sides[0].summary.mean_trace_inverse, null);
  assert.equal(snapshot.result.statistics.pairedMeanDelta, null);
  assert.ok(worker.terminated);
});

test('cancel beats already-queued successful completion and ignores later progress', async () => {
  const { controller, workers } = harness();
  const pending = controller.run(), worker = workers[0];
  worker.progress(16); controller.cancel(); worker.progress(32);
  assert.equal(controller.getSnapshot().progress.attempted, 16);
  worker.finish(); await pending;
  assert.equal(controller.getSnapshot().phase, 'cancelled');
  assert.equal(controller.getSnapshot().result.batch.complete, false);
  assert.equal(controller.getSnapshot().result.sides[0].summary.mean_trace_inverse, null);
});

test('blocked Worker cancellation is bounded and preserves only known partial counts', async () => {
  const { controller, workers } = harness({ cancelTimeoutMs: 5 });
  const pending = controller.run(), worker = workers[0];
  worker.progress(8); controller.cancel(); await pending;
  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.phase, 'cancelled');
  assert.equal(snapshot.result, null);
  assert.equal(snapshot.progress.attempted, 8);
  assert.equal(snapshot.progress.countsAreLastReported, true);
  assert.ok(worker.terminated);
  worker.finish(); assert.equal(controller.getSnapshot(), snapshot);
});

test('replacement rejects stale progress, result, protocol error, and native error', async () => {
  const { controller, workers } = harness();
  const oldRun = controller.run(), old = workers[0];
  old.progress(8);
  const newRun = controller.run(), current = workers[1];
  await oldRun;
  assert.ok(old.terminated);
  assert.equal(old.messages[1].type, 'cancel');
  const before = controller.getSnapshot();
  old.progress(32); old.finish(); old.emit({ type: 'error', request_id: old.messages[0].request_id, error: 'old error' }); old.crash();
  assert.equal(controller.getSnapshot(), before);
  current.finish(); await newRun;
  assert.equal(controller.getSnapshot().result.request_id, current.messages[0].request_id);
});

test('input changes terminate obsolete work; invalid state leaves active work untouched', async () => {
  const { controller, workers } = harness();
  const pending = controller.run(), worker = workers[0], before = controller.getSnapshot();
  assert.throws(() => controller.setInputs({ trials: 3 }), /Unsupported/);
  assert.throws(() => controller.setInputs(null), /object/);
  assert.equal(controller.getSnapshot(), before);
  assert.equal(worker.terminated, false);
  controller.setInputs({ trials: 128 }); await pending;
  const stale = controller.getSnapshot();
  assert.equal(stale.phase, 'stale');
  assert.equal(stale.result, null);
  assert.ok(worker.terminated);
  worker.finish(); worker.crash(); assert.equal(controller.getSnapshot(), stale);
});

test('current Worker failures clear results, and malformed progress cannot move counts backward', async () => {
  const { controller, workers } = harness();
  let pending = controller.run(), worker = workers[0];
  worker.finish(); await pending;
  pending = controller.run(); worker = workers[1];
  assert.equal(controller.getSnapshot().result, null);
  worker.progress(16); worker.progress(8); worker.progress(200); worker.progress(32, 'wrong-id');
  assert.equal(controller.getSnapshot().progress.attempted, 16);
  worker.crash('loading failed'); await pending;
  assert.equal(controller.getSnapshot().phase, 'error');
  assert.equal(controller.getSnapshot().result, null);
  assert.throws(() => controller.downloadJSON(), /no calculation/);
  worker.finish(); assert.equal(controller.getSnapshot().phase, 'error');
});

test('Worker construction failure and result identity mismatch are explicit failures', async () => {
  const throwing = harness({ workerFactory: () => { throw new Error('Worker unavailable'); } });
  await throwing.controller.run();
  assert.equal(throwing.controller.getSnapshot().phase, 'error');
  const { controller, workers } = harness();
  const pending = controller.run(), worker = workers[0], id = worker.messages[0].request_id;
  worker.emit({ type: 'result', request_id: id, batch: cloneBatch('wrong') }); await pending;
  assert.equal(controller.getSnapshot().phase, 'error');
  assert.match(controller.getSnapshot().error, /ID mismatch/);
});

test('destroy during load/Worker run prevents late publications and releases Worker', async () => {
  const { controller, workers, snapshots } = harness();
  const pending = controller.run(), worker = workers[0];
  controller.destroy(); await pending;
  const count = snapshots.length;
  worker.finish(); worker.crash(); assert.equal(snapshots.length, count);
  assert.ok(worker.terminated);
  let resolveLoad;
  const loading = createLessonController({ loadFixture: () => new Promise(resolve => { resolveLoad = resolve; }) });
  const load = loading.load(); await Promise.resolve(); loading.destroy(); resolveLoad(fixture); await load;
  assert.equal(loading.getSnapshot().phase, 'loading');
});

test('Worker handler uses accepted batch core, handles cancel, replacement, and errors', async () => {
  const messages = [];
  let handler;
  handler = createWorkerHandler(message => {
    messages.push(message);
    if (message.type === 'progress') void handler({ data: { type: 'cancel', request_id: message.request_id } });
  });
  await handler({ data: { type: 'run', request_id: 'real-core', state, fixture } });
  const result = messages.find(message => message.type === 'result');
  assert.equal(result.batch.state, 'cancelled');
  assert.equal(result.batch.attempted, 8);
  assert.equal(result.batch.summaries[0].mean_trace_inverse, null);
  const errors = [];
  const bad = createWorkerHandler(message => errors.push(message));
  await bad({ data: { type: 'run', request_id: 'bad-state', state: { n: 3 }, fixture } });
  assert.equal(errors[0].type, 'error');
  const resolvers = [], replaced = [];
  const replace = createWorkerHandler(message => replaced.push(message), { runBatch: request => new Promise(resolve => resolvers.push(() => resolve(cloneBatch(request.request_id)))) });
  const a = replace({ data: { type: 'run', request_id: 'old', state, fixture } });
  const b = replace({ data: { type: 'run', request_id: 'new', state, fixture } });
  resolvers[0](); resolvers[1](); await Promise.all([a, b]);
  assert.equal(replaced.length, 1);
  assert.equal(replaced[0].request_id, 'new');
});

test('repeated run requests during loading execute only the newest request', async () => {
  let resolveLoad, factoryCalls = 0;
  const workers = [];
  const controller = createLessonController({ initialState: state,
    loadFixture: () => new Promise(resolve => { resolveLoad = resolve; }),
    workerFactory: () => { factoryCalls++; const worker = new FakeWorker(); workers.push(worker); return worker; } });
  const first = controller.run(), second = controller.run();
  await Promise.resolve(); resolveLoad(fixture);
  await first;
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(factoryCalls, 1);
  workers[0].finish(); await second;
  assert.equal(controller.getSnapshot().phase, 'ready');
  controller.destroy();
});

test('loader supports explicit flattened fixture and core URLs', async () => {
  const requested = [];
  const loaded = await loadRetainedFixture({ fixtureURL: 'https://example.invalid/assets/data/fixture.json',
    coreURL: 'https://example.invalid/core.mjs', cryptoImpl: webcrypto, fetchImpl: async url => {
      requested.push(String(url));
      const bytes = await readFile(new URL(url.pathname.endsWith('fixture.json')
        ? '../assets/data/cooperative-fim-retained-coordinates.json' : '../labs/cooperative-clusters/cooperative-fim-core.mjs', import.meta.url));
      return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
    } });
  assert.deepEqual(requested, ['https://example.invalid/assets/data/fixture.json', 'https://example.invalid/core.mjs']);
  assert.equal(loaded.integrity.verified, true);
});

test('root-flattened default fixture URL stays beneath the GitHub Pages project prefix', async () => {
  const source = await readFile(new URL('../labs/cooperative-clusters/cooperative-fim-controller.mjs', import.meta.url), 'utf8');
  const literal = source.match(/fixtureURL = new URL\('([^']+)', import\.meta\.url\)/)?.[1];
  assert.equal(literal, './assets/data/cooperative-fim-retained-coordinates.json');
  assert.equal(new URL(literal, 'https://loonyreina.github.io/ISAC/cooperative-fim-controller.mjs').href,
    'https://loonyreina.github.io/ISAC/assets/data/cooperative-fim-retained-coordinates.json');
});
