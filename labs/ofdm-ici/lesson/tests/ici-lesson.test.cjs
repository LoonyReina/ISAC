'use strict';
// Node Worker execution and controlled DOM/transport tests are not browser certification.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const { Worker } = require('node:worker_threads');
const K = require('../../runtime/js/ici-kernel.js');
const { Controller, parseImport, recordJSON, inspectCFAR, MAX_IMPORT_BYTES } = require('../ici-controller.js');
const runtime = path.resolve(__dirname, '../../runtime');
const copy = value => structuredClone(value);
const config = () => ({ music_order: 1, angle_min: -40, angle_max: -20, angle_step: 10, cfo_min: -.5, cfo_max: .5, cfo_points: 5, max_omp: 1, normalized_threshold: .1 });
const scene = () => ({ seed: 3, noise_seed: 7, noise_variance: .01, symbols: 'qam16', targets: [{ delay_samples: 3, epsilon: .25, angle_deg: -30, alpha_real: 1, alpha_imag: .3 }] });
const fileOf = text => ({ size: Buffer.byteLength(text, 'utf8'), async text() { return text; } });
function nativeController(options = {}) {
  const requests = [];
  const controller = new Controller({ ...options, makeWorker() {
    const worker = new Worker(path.join(runtime, 'worker/ici-worker.js'));
    const post = worker.postMessage.bind(worker);
    worker.postMessage = message => { requests.push(copy(message)); return post(message); };
    return worker;
  } });
  return { controller, requests };
}
function hashComplex(value) {
  const bytes = Buffer.alloc(value.real.length * 16);
  for (let i = 0; i < value.real.length; i++) {
    bytes.writeDoubleLE(value.real[i], 16 * i);
    bytes.writeDoubleLE(value.imag[i], 16 * i + 8);
  }
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
class ControlledWorker extends EventEmitter {
  constructor() { super(); this.sent = []; this.terminated = 0; }
  postMessage(message) { this.sent.push(copy(message)); }
  terminate() { this.terminated++; return Promise.resolve(0); }
  latestRun() { return this.sent.filter(message => message.type === 'run').at(-1); }
  progress(run, phase = 'cfo_search') { this.emit('message', { type: 'progress', runId: run.runId, progress: { phase, input_revision: run.input.input_revision } }); }
  complete(run, result) { this.emit('message', { type: 'complete', runId: run.runId, result: copy(result) }); }
}
let fixturePromise;
function fixture() {
  if (!fixturePromise) fixturePromise = (async () => {
    const { controller } = nativeController();
    try { const terminal = await controller.run(scene(), config()); assert.equal(terminal.type, 'complete'); return terminal.result; }
    finally { await controller.dispose(); }
  })();
  return fixturePromise;
}
async function controlled(t) {
  const result = await fixture(), workers = [];
  const controller = new Controller({ makeWorker() { const w = new ControlledWorker(); workers.push(w); return w; } });
  t.after(() => controller.dispose());
  return { controller, workers, result };
}

const frozen = {
  'js/evaluate.js': [7206, 'bcf9be4cb478928e4744d3dea357e20b38f53b793f67a7a5f9e43c64255c51ac'],
  'js/ici-kernel.js': [35957, '3c9e13e8bbd478802c4292999c7633b4e35dba7f2b7a861e7413dce43ac5ddbe'],
  'js/linalg.js': [18255, 'c7e21dadbac282314c504c5f1b73a4de18964c18ee1d06cc34eedcce1d81509a'],
  'js/sha256.js': [2476, '11ed1580ff4e1f5c627389c242079fc72595fd69bbf101c43c662aa61c01d657'],
  'worker/ici-client.js': [7124, '1397e1f04bb674973fdebc29213c2531e8383b3aa3f959504761f65dcdf20b75'],
  'worker/ici-worker.js': [8491, '864131d8d1d91658397a3ca7cd2f1e8cb55ab847a90c7d6c6ef6271d6e66f9fc']
};
test('the six runtime files match both the declared source freeze and independently pinned bytes', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(runtime, 'SOURCE-FREEZE.json'), 'utf8'));
  assert.equal(manifest.runtime_files.length, 6);
  for (const entry of manifest.runtime_files) {
    assert.deepEqual([entry.bytes, entry.sha256], frozen[entry.path]);
    const data = fs.readFileSync(path.join(runtime, entry.path));
    assert.equal(data.length, entry.bytes);
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'), entry.sha256);
  }
});

test('actual Node Worker computes scene, recomputes on held Y, and treats truth as evaluation only', { timeout: 20000 }, async t => {
  const { controller: c, requests } = nativeController(); t.after(() => c.dispose());
  assert.equal((await c.run(scene(), config())).type, 'complete');
  const first = c.completed, result = first.result;
  assert.equal(result.computation, 'fresh');
  assert.equal(first.source, 'simulation');
  assert.equal(result.receiver.angles[0].stop_reason, 'iteration_cap');
  assert.ok(result.receiver.detections.length > 0);
  assert.equal(result.provenance.x_sha256, hashComplex(result.input.x));
  assert.equal(result.provenance.y_sha256, hashComplex(result.input.y));
  assert.deepEqual(result.receiver.provenance, result.fft_known_x.provenance);
  assert.equal(result.fft_ici_free_counterfactual.provenance.paired_operational_y_sha256, result.provenance.y_sha256);
  assert.equal(result.fft_ici_free_counterfactual.provenance.y_sha256, hashComplex(result.input.y_ici_free_counterfactual));
  assert.deepEqual(result.truth_evaluation_only, scene().targets);
  assert.equal(first.evaluation.apes.hits, 1);
  assert.equal(requests.filter(r => r.type === 'run')[0].input.mode, 'simulate');

  c.edit('receiver');
  assert.equal((await c.run(scene(), { ...config(), pfa: .001 })).type, 'complete');
  const second = c.completed, held = requests.filter(r => r.type === 'run').at(-1).input;
  assert.equal(held.mode, 'raw');
  for (const key of ['simulation', 'truth', 'truth_evaluation_only', 'detections', 'evaluation']) assert.equal(key in held, false, key);
  assert.equal(second.result.truth_evaluation_only, null);
  assert.deepEqual(second.truth, first.truth);
  assert.deepEqual(second.generator, first.generator);
  assert.equal(second.result.provenance.y_sha256, result.provenance.y_sha256);
  assert.equal(second.result.provenance.x_sha256, result.provenance.x_sha256);
  assert.notEqual(second.result.provenance.config_sha256, result.provenance.config_sha256);
  assert.notEqual(second.runId, first.runId);
  assert.notEqual(second.result.provenance.input_revision, result.provenance.input_revision);
  assert.equal(second.evaluation.apes.hits, 1);

  c.observation.truth = [{ ...scene().targets[0], delay_samples: 11 }];
  c.edit('receiver');
  assert.equal((await c.run(scene(), { ...config(), pfa: .001 })).type, 'complete');
  assert.deepEqual(c.completed.result.receiver.detections, second.result.receiver.detections);
  assert.deepEqual(c.completed.result.fft_known_x.detections, second.result.fft_known_x.detections);
  assert.equal(c.completed.evaluation.apes.hits, 0);
  assert.equal(c.completed.evaluation.apes.misses, 1);
  assert.equal(c.completed.evaluation.apes.false_detections, second.result.receiver.detections.length);

  c.edit('scene');
  assert.equal(c.observation, null);
  const changedScene = { ...scene(), seed: 4, noise_seed: 8 };
  assert.equal((await c.run(changedScene, config())).type, 'complete');
  assert.notEqual(c.completed.result.provenance.x_sha256, first.result.provenance.x_sha256);
  assert.notEqual(c.completed.result.provenance.y_sha256, first.result.provenance.y_sha256);
  assert.deepEqual(c.completed.truth, changedScene.targets);
});

test('raw import triggers a fresh Node Worker computation with verified sample hashes and no imported truth', { timeout: 20000 }, async t => {
  const result = await fixture(), rawText = recordJSON(K.exportRaw(result, 'saved-input'));
  const { controller: c, requests } = nativeController(); t.after(() => c.dispose());
  assert.throws(() => c.exportRaw(), /完成/);
  assert.throws(() => c.exportHistory(), /完成/);
  assert.ok(await c.importFile(fileOf(rawText)));
  assert.equal(c.state, 'imported'); assert.equal(c.completed, null);
  assert.equal((await c.run(scene(), config())).type, 'complete');
  assert.equal(c.completed.source, 'imported-raw'); assert.equal(c.completed.truth, null);
  assert.equal(c.completed.evaluation, null); assert.equal(c.completed.generator, null);
  assert.equal(c.completed.scene, null); assert.equal(c.completed.result.computation, 'fresh');
  assert.deepEqual(c.completed.result.receiver.detections, result.receiver.detections);
  assert.equal(c.completed.result.provenance.y_sha256, result.provenance.y_sha256);
  assert.notEqual(c.completed.result.provenance.input_revision, 'saved-input');
  assert.equal(requests.filter(r => r.type === 'run').at(-1).input.mode, 'raw');
  assert.deepEqual(parseImport(c.exportRaw()).expected_hashes, parseImport(rawText).expected_hashes);
  const history = JSON.parse(c.exportHistory());
  assert.equal(history.status, 'historical-computation-record-not-a-fresh-input');
  assert.throws(() => parseImport(JSON.stringify(history)), /historical|历史|explicit raw/);
  assert.throws(() => parseImport(recordJSON(result)), /historical|历史|explicit raw/);

  const wrong = JSON.parse(rawText); wrong.y.real[0] += .1;
  assert.ok(await c.importFile(fileOf(JSON.stringify(wrong))));
  const prior = c.completed;
  const terminal = await c.run(scene(), config());
  assert.equal(terminal.type, 'error'); assert.match(c.error.message, /checksum mismatch: y_sha256/);
  assert.equal(c.state, 'error'); assert.equal(c.completed, prior);
  assert.ok(await c.importFile(fileOf(rawText)));
  assert.equal((await c.run(scene(), config())).type, 'complete');
});

test('raw import rejects output smuggling, malformed shapes, nonfinite values, null pilots and bad config', async () => {
  const raw = JSON.parse(recordJSON(K.exportRaw(await fixture(), 'validate')));
  const invalid = [
    value => { value.truth = []; }, value => { value.receiver = {}; }, value => { value.simulation = scene(); },
    value => { value.mode = 'simulate'; }, value => { value.schema_version = 'ofdm-ici-result-v1'; },
    value => { value.input_revision = ''; }, value => { value.input_revision = 'a'.repeat(129); },
    value => { value.y.shape = [16, 64, 7]; }, value => { value.x.real.pop(); },
    value => { value.y.imag[0] = null; }, value => { value.y.real[0] = 1000001; },
    value => { value.x.real[0] = 0; value.x.imag[0] = 0; },
    value => { value.noise_variance = 0; }, value => { value.config.refine = true; },
    value => { value.config.n = 128; }, value => { value.max_wall_ms = 9; },
    value => { value.expected_hashes = { x_sha256: '0'.repeat(64) }; },
    value => { value.expected_hashes.y_sha256 = 'X'.repeat(64); },
    value => { value.expected_hashes.extra = '0'.repeat(64); },
    value => { value.expected_hashes.y_ici_free_sha256 = 'a'; }
  ];
  for (const mutate of invalid) { const value = copy(raw); mutate(value); assert.throws(() => parseImport(JSON.stringify(value)), mutate.toString()); }
});

test('UTF-8 import and record budgets are measured in bytes, including misleading file sizes', async t => {
  const { controller: c } = await controlled(t);
  const raw = recordJSON(K.exportRaw(await fixture(), 'utf8'));
  const nonAscii = '"' + '界'.repeat(Math.ceil(MAX_IMPORT_BYTES / 3)) + '"';
  assert.ok(nonAscii.length < MAX_IMPORT_BYTES);
  assert.ok(Buffer.byteLength(nonAscii) > MAX_IMPORT_BYTES);
  assert.throws(() => parseImport(nonAscii), /UTF-8/);
  assert.throws(() => recordJSON({ label: '界界' }, 12), /UTF-8/);
  assert.equal(recordJSON({ label: '界界' }, Buffer.byteLength('{"label":"界界"}')), '{"label":"界界"}');
  let reads = 0;
  assert.equal(await c.importFile({ size: MAX_IMPORT_BYTES + 1, text() { reads++; return raw; } }), false);
  assert.equal(reads, 0);
  assert.equal(await c.importFile({ text() { reads++; return raw; } }), false);
  assert.equal(reads, 0);
  assert.equal(await c.importFile({ size: 1, async text() { reads++; return nonAscii; } }), false);
  assert.equal(reads, 1); assert.equal(c.state, 'error'); assert.equal(c.observation, null);
});

test('controlled supersession ignores old progress and queued completion while newest run owns state', async t => {
  const { controller: c, workers, result } = await controlled(t);
  const first = c.run(scene(), config()), w = workers[0], oldRun = w.latestRun();
  w.progress(oldRun); assert.equal(c.progress.phase, 'cfo_search');
  const second = c.run({ ...scene(), seed: 4 }, config()), current = w.latestRun();
  assert.notEqual(oldRun.runId, current.runId); assert.equal(c.progress, null);
  w.progress(oldRun, 'old'); assert.equal(c.progress, null);
  w.complete(oldRun, result); assert.equal((await first).type, 'stale'); assert.equal(c.completed, null); assert.equal(c.state, 'running');
  w.progress(current, 'current'); assert.equal(c.progress.phase, 'current');
  w.complete(current, result); assert.equal((await second).type, 'complete');
  assert.equal(c.completed.runId, current.runId); assert.equal(c.progress, null); assert.equal(c.state, 'complete');
});

test('cancel suppresses a queued completion and permits a new run on the same worker', async t => {
  const { controller: c, workers, result } = await controlled(t);
  const pending = c.run(scene(), config()), w = workers[0], run = w.latestRun();
  c.cancel(); assert.equal(c.state, 'cancelled'); assert.equal(c.progress, null);
  assert.deepEqual(w.sent.at(-1), { type: 'cancel', runId: run.runId });
  w.progress(run); w.complete(run, result);
  assert.equal((await pending).type, 'stale'); assert.equal(c.completed, null); assert.equal(c.state, 'cancelled');
  const next = c.run(scene(), config()), current = w.latestRun(); w.complete(current, result);
  assert.equal((await next).type, 'complete'); assert.equal(workers.length, 1);
});

test('reset invalidates old observation, exported results, progress and queued completion', async t => {
  const { controller: c, workers, result } = await controlled(t);
  const first = c.run(scene(), config()), w = workers[0]; w.complete(w.latestRun(), result); await first;
  const second = c.run(scene(), config()), current = w.latestRun(); w.progress(current);
  c.reset(); assert.equal(c.state, 'idle'); assert.equal(c.observation, null); assert.equal(c.completed, null);
  assert.equal(c.dirty, 'scene'); assert.equal(c.source, 'simulation'); assert.equal(c.progress, null);
  assert.deepEqual(w.sent.at(-1), { type: 'reset' });
  w.complete(current, result); assert.equal((await second).type, 'stale'); assert.equal(c.state, 'idle');
  assert.throws(() => c.exportHistory(), /完成/);
  const third = c.run(scene(), config()); assert.equal(w.latestRun().input.mode, 'simulate'); w.complete(w.latestRun(), result);
  assert.equal((await third).type, 'complete');
});

test('edits invalidate queued results and scene dirtiness cannot be downgraded by receiver edits', async t => {
  const { controller: c, workers, result } = await controlled(t);
  const pending = c.run(scene(), config()), w = workers[0], old = w.latestRun();
  c.edit('scene'); c.edit('receiver');
  assert.equal(c.dirty, 'scene'); assert.equal(c.state, 'dirty'); assert.equal(c.observation, null);
  w.complete(old, result); assert.equal((await pending).type, 'stale'); assert.equal(c.completed, null);
  const next = c.run(scene(), config()); assert.equal(w.latestRun().input.mode, 'simulate');
  w.complete(w.latestRun(), result); assert.equal((await next).type, 'complete');
});

for (const invalidator of ['reset', 'cancel', 'edit']) test(`late file read cannot resurrect state after ${invalidator}`, async t => {
  const { controller: c } = await controlled(t), raw = recordJSON(K.exportRaw(await fixture(), 'delayed'));
  let finish;
  const importing = c.importFile({ size: Buffer.byteLength(raw), text() { return new Promise(resolve => { finish = resolve; }); } });
  assert.equal(c.state, 'importing'); c[invalidator](); const state = c.state;
  finish(raw); assert.equal(await importing, false); assert.equal(c.observation, null); assert.equal(c.state, state);
});

test('latest import wins, and a newer run also invalidates an in-flight file read', async t => {
  const { controller: c, workers, result } = await controlled(t);
  const raw = recordJSON(K.exportRaw(result, 'import-a')); let finish;
  const pending = c.importFile({ size: Buffer.byteLength(raw), text() { return new Promise(resolve => { finish = resolve; }); } });
  assert.ok(await c.importFile(fileOf(recordJSON(K.exportRaw(result, 'import-b')))));
  finish(raw); assert.equal(await pending, false); assert.equal(c.observation.raw.input_revision, 'import-b');
  const read = c.importFile({ size: Buffer.byteLength(raw), text() { return new Promise(resolve => { finish = resolve; }); } });
  const run = c.run(scene(), config()), w = workers[0];
  finish(raw); assert.equal(await read, false); assert.equal(c.state, 'running');
  w.complete(w.latestRun(), result); assert.equal((await run).type, 'complete');
});

test('import cancels an active run, and its queued result cannot overwrite imported observation', async t => {
  const { controller: c, workers, result } = await controlled(t);
  const pending = c.run(scene(), config()), w = workers[0], old = w.latestRun();
  assert.ok(await c.importFile(fileOf(recordJSON(K.exportRaw(result, 'incoming')))));
  w.complete(old, result); assert.equal((await pending).type, 'stale');
  assert.equal(c.state, 'imported'); assert.equal(c.completed, null); assert.equal(c.observation.raw.input_revision, 'incoming');
});

for (const failure of ['error', 'exit']) test(`a dead Worker (${failure}) is replaced and a fresh run can complete`, async t => {
  const { controller: c, workers, result } = await controlled(t);
  const pending = c.run(scene(), config()), dead = workers[0];
  if (failure === 'error') dead.emit('error', new Error('synthetic transport failure')); else dead.emit('exit', 1);
  assert.equal((await pending).type, 'error'); assert.equal(c.state, 'error'); assert.equal(c.completed, null);
  const retry = c.run(scene(), config()), fresh = workers[1];
  assert.equal(dead.terminated, 1); assert.ok(fresh); assert.equal(dead.listenerCount('message'), 0);
  fresh.complete(fresh.latestRun(), result); assert.equal((await retry).type, 'complete'); assert.equal(c.error, null);
});

test('actual Node Worker supersession and cancellation during CFO work never complete stale jobs', { timeout: 20000 }, async t => {
  let cancelAtSearch = false, cancelled = false;
  const { controller: c } = nativeController({ onChange(state) {
    if (cancelAtSearch && !cancelled && state.progress?.phase === 'cfo_search') { cancelled = true; state.cancel(); }
  } }); t.after(() => c.dispose());
  const first = c.run(scene(), { ...config(), cfo_points: 113 }), second = c.run(scene(), config());
  assert.equal((await first).type, 'stale'); assert.equal((await second).type, 'complete');
  const previous = c.completed;
  cancelAtSearch = true;
  assert.equal((await c.run(scene(), { ...config(), cfo_points: 113 })).type, 'stale');
  assert.equal(cancelled, true); assert.equal(c.state, 'cancelled'); assert.equal(c.completed, previous);
  cancelAtSearch = false;
  assert.equal((await c.run(scene(), config())).type, 'complete');
});

test('CFAR inspection agrees with actual frozen threshold/count/detection arrays at every retained cell', async () => {
  const result = await fixture(), c = result.input.config;
  const maps = [...result.receiver.angles.flatMap(angle => angle.recoveries), ...result.fft_known_x.maps, ...result.fft_ici_free_counterfactual.maps];
  assert.ok(maps.length >= 3);
  for (const map of maps) {
    assert.deepEqual(map.power.shape, [64, 16]); assert.deepEqual(map.threshold.shape, [12, 16]);
    for (let q = 0; q < c.l; q++) for (let d = 0; d < c.m; d++) {
      const view = inspectCFAR(map, c, q, d), index = q * c.m + d;
      assert.equal(view.tested, true); assert.equal(view.power, map.power.data[index]);
      assert.equal(view.threshold, map.threshold.data[index]); assert.equal(view.training_count, map.training_cells.data[index]);
      assert.equal(view.reconstructed_training_count, view.training_count);
      assert.equal(new Set(view.training_indices).size, view.training_indices.length);
      assert.ok(!view.training_indices.includes(index)); assert.ok(view.guard_indices.includes(index));
      assert.ok(view.training_indices.every(i => i >= 0 && i < c.l * c.m && !view.guard_indices.includes(i)));
      const reconstructed = view.training_mean * view.multiplier;
      assert.ok(Math.abs(reconstructed - view.threshold) <= 1e-12 * Math.max(1, Math.abs(view.threshold)));
      assert.equal(view.recorded_detection, view.crosses_threshold && view.strict_local_maximum);
    }
    assert.deepEqual(inspectCFAR(map, c, c.l, 0), { tested: false, reason: 'outside_retained_support' });
    assert.equal(inspectCFAR(map, c, -1, 0).tested, false);
    assert.equal(inspectCFAR(map, c, 0, c.m).tested, false);
  }
});

test('CFAR view preserves slow-time wrapping, range clipping and duplicate-free wide windows', () => {
  const c = K.config({ ...config(), cfar_guard: [1, 1], cfar_train: [11, 8] });
  const power = Float64Array.from({ length: 64 * 16 }, (_, i) => 1 + i / 1000);
  power[0] = 10000; const actual = K.cfar(power, c);
  const map = { power: { shape: [64, 16], data: power }, threshold: { shape: [12, 16], data: actual.threshold }, training_cells: { shape: [12, 16], data: actual.training }, detections: actual.cuts };
  for (const [q, d] of [[0, 0], [11, 15], [5, 8]]) {
    const view = inspectCFAR(map, c, q, d);
    assert.equal(view.training_count, view.reconstructed_training_count);
    assert.equal(view.recorded_detection, view.crosses_threshold && view.strict_local_maximum);
    assert.ok(view.training_indices.every(i => i < 12 * 16));
    assert.ok(view.guard_indices.includes(q * 16 + (d + 15) % 16));
    assert.ok(Math.abs(view.training_mean * view.multiplier - view.threshold) < 1e-10);
  }
});

test('actual Node Worker reset during CFO work clears results and can compute again', { timeout: 20000 }, async t => {
  let resetAtSearch = false, reset = false;
  const { controller: c } = nativeController({ onChange(state) {
    if (resetAtSearch && !reset && state.progress?.phase === 'cfo_search') { reset = true; state.reset(); }
  } }); t.after(() => c.dispose());
  assert.equal((await c.run(scene(), config())).type, 'complete');
  resetAtSearch = true;
  assert.equal((await c.run(scene(), { ...config(), cfo_points: 113 })).type, 'stale');
  assert.equal(reset, true); assert.equal(c.state, 'idle'); assert.equal(c.completed, null); assert.equal(c.observation, null);
  resetAtSearch = false;
  assert.equal((await c.run(scene(), config())).type, 'complete');
});

test('actual Worker time cap is an error, leaves no fresh completion, and a valid import recovers', { timeout: 20000 }, async t => {
  const result = await fixture(), raw = K.toJSON(K.exportRaw(result, 'time-limited'));
  raw.max_wall_ms = 10;
  const { controller: c } = nativeController(); t.after(() => c.dispose());
  assert.ok(await c.importFile(fileOf(JSON.stringify(raw))));
  assert.equal((await c.run(scene(), { ...config(), cfo_points: 113 })).type, 'error');
  assert.equal(c.state, 'error'); assert.equal(c.error.code, 'TIME_CAP'); assert.equal(c.error.status, 'time_cap');
  assert.equal(c.completed, null);
  delete raw.max_wall_ms;
  assert.ok(await c.importFile(fileOf(JSON.stringify(raw))));
  assert.equal((await c.run(scene(), config())).type, 'complete');
});

test('actual Worker verifies the paired ICI-free hash independently and refuses altered counterfactual data', { timeout: 20000 }, async t => {
  const raw = K.toJSON(K.exportRaw(await fixture(), 'counterfactual-integrity'));
  raw.y_ici_free_counterfactual.imag[2] += .2;
  const { controller: c } = nativeController(); t.after(() => c.dispose());
  assert.ok(await c.importFile(fileOf(JSON.stringify(raw))));
  assert.equal((await c.run(scene(), config())).type, 'error');
  assert.match(c.error.message, /checksum mismatch: y_ici_free_sha256/); assert.equal(c.completed, null);
});

test('disposing a controller during a run suppresses completion and removes Worker listeners', async t => {
  const { controller: c, workers, result } = await controlled(t);
  const pending = c.run(scene(), config()), w = workers[0], old = w.latestRun();
  await c.dispose(); assert.equal(w.terminated, 1); assert.equal(w.listenerCount('message'), 0);
  w.complete(old, result);
  assert.equal((await pending).type, 'stale'); assert.equal(c.state, 'disposed'); assert.equal(c.completed, null);
});

test('CFAR strict local maximum rule retains tied peaks as nondetections', () => {
  const c = K.config(config()), power = new Float64Array(64 * 16).fill(1);
  power[3 * 16] = power[3 * 16 + 15] = 1000;
  const actual = K.cfar(power, c), map = { power: { data: power }, threshold: { data: actual.threshold }, training_cells: { data: actual.training }, detections: actual.cuts };
  for (const d of [0, 15]) {
    const view = inspectCFAR(map, c, 3, d);
    assert.equal(view.crosses_threshold, true); assert.equal(view.strict_local_maximum, false); assert.equal(view.recorded_detection, false);
  }
});

const root = path.resolve(__dirname, '../../../..');
const pagePath = fs.existsSync(path.join(root, 'content/pages/ofdm-ici-receiver.html')) ? path.join(root, 'content/pages/ofdm-ici-receiver.html') : path.join(root, 'ofdm-ici-receiver.html');
const lessonPath = path.resolve(__dirname, '../ici-lesson.js');
function pageText() { return fs.readFileSync(pagePath, 'utf8'); }

test('lesson page has unique anchors, seven explicit stages, labeled controls and local deferred runtime order', () => {
  const html = pageText(), ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), m => m[1]);
  assert.equal(ids.length, new Set(ids).size, 'duplicate HTML ID');
  for (const id of ['question', 'model', 'experiment', 'paper', 'limits', 'reproduce', 'ici-root', 'ici-run', 'ici-cancel', 'ici-reset', 'ici-import', 'ici-export-raw', 'ici-export-history', 'ici-status', 'ici-progress', 'ici-truth', 'ici-evaluation']) assert.ok(ids.includes(id), id);
  assert.deepEqual(Array.from(html.matchAll(/data-stage="([^"]+)"/g), m => m[1]), ['observe', 'music', 'cfo', 'refit', 'cfar', 'unwrap', 'evaluate']);
  assert.equal((html.match(/aria-current="step"/g) || []).length, 1);
  for (const match of html.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const prefix = html.slice(0, match.index), wrapped = prefix.lastIndexOf('<label') > prefix.lastIndexOf('</label>');
    assert.ok(wrapped || /aria-label=/.test(match[0]) || html.includes(`for="${match[1]}"`), `unlabeled ${match[1]}`);
  }
  assert.match(html, /<noscript>/); assert.match(html, /id="ici-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /id="ici-progress"[^>]*aria-live="off"/);
  const teaching=require(path.join(root,'tests/helpers/teaching-page-assets.cjs'))(root,path.relative(root,pagePath),html);
  const scripts = Array.from(html.matchAll(/<script\s+defer\s+src="([^"]+)"/g), m => m[1]);
  assert.deepEqual(scripts, ['labs/ofdm-ici/runtime/js/linalg.js', 'labs/ofdm-ici/runtime/js/sha256.js', 'labs/ofdm-ici/runtime/js/evaluate.js', 'labs/ofdm-ici/runtime/js/ici-kernel.js', 'labs/ofdm-ici/runtime/worker/ici-client.js', 'labs/ofdm-ici/lesson/ici-controller.js', 'labs/ofdm-ici/lesson/ici-lesson.js', ...teaching.deferUrls]);
  assert.deepEqual(Array.from(html.matchAll(/<script\b[^>]*src="([^"]+)"/g),m=>m[1]),[...scripts.slice(0,7),...teaching.scriptUrls]);
  for (const script of scripts) assert.ok(fs.existsSync(path.join(root, script)), script);
});

test('page and lesson preserve scientific limitations and do not upload, auto-run, or load saved startup results', () => {
  const html = pageText(), source = fs.readFileSync(lessonPath, 'utf8'), css = fs.readFileSync(path.resolve(__dirname, '../ici-lesson.css'), 'utf8');
  for (const phrase of ['2103.15694v1', '有限网格', '非原论文图复现', '不做零填充', '原式区号', '真值只用于仿真和评估', '历史记录', '5 MiB UTF-8', '80 MiB', '4/3/1', '未复现原文低 FDR', '实际浏览器性能']) assert.ok(html.includes(phrase), phrase);
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|setInterval\s*\(|requestAnimationFrame\s*\(/);
  assert.match(css, /@media\(max-width:760px\)/); assert.match(css, /prefers-reduced-motion/); assert.match(css, /:focus-visible/);
  const ids = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), m => m[1]));
  for (const [, id] of source.matchAll(/\$\('(ici-[^']+)'\)/g)) assert.ok(ids.has(id), `missing literal DOM binding: ${id}`);
});

// Purpose-built in-memory HTML/event harness. It executes the production mount()
// and render functions, but does not claim layout, accessibility or browser QA.
function lightDocument(html, { canvas = true } = {}) {
  const byId = new Map(), canvasCalls = [], downloads = [], windowEvents = {};
  const decode = text => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.dataset = {}; this.events = {}; this._value = ''; this._text = ''; this._html = ''; if (this.tagName !== 'SVG') this.hidden = false; this.checked = false; this.disabled = false; this.style = {}; this.width = 880; this.height = 330; this.files = []; this.classes = new Set(); this.classList = { toggle: (name, force) => { const on = force === undefined ? !this.classes.has(name) : force; if (on) this.classes.add(name); else this.classes.delete(name); return on; }, contains: name => this.classes.has(name), add: name => this.classes.add(name), remove: name => this.classes.delete(name) }; }
    setAttribute(name, value) { value = String(value); this.attrs[name] = value; if (name === 'id') { this.id = value; byId.set(value, this); } if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value; if (name === 'value') this._value = value; if (['checked', 'hidden', 'disabled', 'selected'].includes(name) && !(name === 'hidden' && this.tagName === 'SVG')) this[name] = true; if (['width', 'height'].includes(name)) this[name] = Number(value); }
    getAttribute(name) { return this.attrs[name] ?? null; }
    hasAttribute(name) { return name in this.attrs; }
    // SVG hidden is an attribute; assigning .hidden must not reflect it.
    toggleAttribute(name, force) { const on = force === undefined ? !this.hasAttribute(name) : force; if (on) this.setAttribute(name, ''); else this.removeAttribute(name); return on; }
    removeAttribute(name) { delete this.attrs[name]; }
    set value(value) { this._value = String(value); }
    get value() { return this.tagName === 'OPTION' && !('value' in this.attrs) ? this.textContent : this._value; }
    set textContent(value) { this._text = String(value); this._html = ''; this.children = []; }
    get textContent() { return this._text + this.children.map(node => node.textContent).join(''); }
    set innerHTML(value) { this._html = String(value); this._text = ''; this.children = []; parse(this._html, this); if (this.tagName === 'SELECT') this._value = (this.options.find(o => o.selected) || this.options[0])?.value || ''; }
    get innerHTML() { return this._html; }
    get options() { return this.children.filter(node => node.tagName === 'OPTION'); }
    append(...nodes) { for (const node of nodes) { if (typeof node === 'string') { this._text += node; continue; } node.parentElement = this; this.children.push(node); } }
    appendChild(node) { this.append(node); return node; }
    replaceChildren(...nodes) { this.children = []; this._text = ''; this._html = ''; this.append(...nodes); }
    matches(selector) { const attr = selector.match(/^\[([^=\]]+)(?:=["']?([^\]"']+)["']?)?\]$/); if (attr) return this.hasAttribute(attr[1]) && (attr[2] === undefined || this.getAttribute(attr[1]) === attr[2]); return selector.startsWith('#') ? this.id === selector.slice(1) : this.tagName === selector.toUpperCase(); }
    closest(selector) { for (let el = this; el; el = el.parentElement) if (el.matches(selector)) return el; return null; }
    querySelectorAll(selector) { const selectors = selector.split(',').map(s => s.trim()), found = []; for (const node of this.children) { if (selectors.some(s => node.matches(s))) found.push(node); found.push(...node.querySelectorAll(selector)); } return found; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(type, listener) { (this.events[type] ||= []).push(listener); }
    removeEventListener(type, listener) { this.events[type] = (this.events[type] || []).filter(fn => fn !== listener); }
    async fire(type, extra = {}) { const event = { type, target: this, preventDefault() {}, ...extra }; const returned = []; for (let el = this; el; el = el.parentElement) for (const fn of el.events[type] || []) returned.push(fn(event)); await Promise.all(returned); }
    click() { if (this.tagName === 'A') downloads.push({ href: this.href, download: this.download }); else return this.fire('click'); }
    focus() { this.focused = true; }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(node => node !== this); }
    getContext() { if (!canvas) return null; return new Proxy({}, { get(_target, name) { return (...args) => { for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), `canvas ${String(name)} received ${arg}`); canvasCalls.push([name, ...args]); }; }, set(target, name, value) { target[name] = value; return true; } }); }
    getBoundingClientRect() { return { width: 880, height: 330, left: 0, top: 0 }; }
  }
  function parse(markup, parent) {
    const stack = [parent], tokens = markup.match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/g) || [];
    for (const token of tokens) {
      if (token.startsWith('<!')) continue;
      if (token.startsWith('</')) { const tag = token.match(/^<\/\s*([^\s>]+)/)?.[1].toUpperCase(); for (let i = stack.length - 1; i > 0; i--) if (stack[i].tagName === tag) { stack.length = i; break; } continue; }
      if (token.startsWith('<')) {
        const match = token.match(/^<([a-z][\w:-]*)([\s\S]*?)\/?\s*>$/i); if (!match) continue;
        const node = new Element(match[1]);
        for (const attr of match[2].matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) node.setAttribute(attr[1], decode(attr[2] ?? attr[3] ?? attr[4] ?? ''));
        stack.at(-1).append(node);
        if (!/^(INPUT|BR|HR|META|LINK|IMG|AREA|BASE|SOURCE|WBR)$/.test(node.tagName) && !token.endsWith('/>')) stack.push(node);
      } else stack.at(-1)._text += decode(token);
    }
    for (const select of parent.querySelectorAll('select')) select._value = (select.options.find(o => o.selected) || select.options[0])?.value || '';
  }
  const document = new Element('document');
  document.getElementById = id => byId.get(id) || null;
  document.createElement = tag => new Element(tag);
  document.createElementNS = (_namespace, tag) => new Element(tag);
  document.defaultView = { addEventListener(type, fn) { windowEvents[type] = fn; }, removeEventListener(type) { delete windowEvents[type]; } };
  parse(html, document); document.body = document.querySelector('body');
  return { document, get(id) { const el = byId.get(id); assert.ok(el, `missing harness element ${id}`); return el; }, canvasCalls, downloads, windowEvents };
}

async function mounted(t, options = {}) {
  const harness = lightDocument(pageText(), options), workers = [], downloads = [];
  const { mount } = require(lessonPath);
  const view = mount(harness.document, { makeWorker() { const worker = new ControlledWorker(); workers.push(worker); return worker; }, download(text, name) { downloads.push({ text, name }); } });
  t.after(() => view.controller.dispose());
  return { ...harness, view, workers, downloads };
}
async function deliverUI(harness, result) {
  const running = harness.get('ici-run').fire('click'), worker = harness.workers.at(-1);
  assert.ok(worker, 'UI run must create an actual controller Worker request');
  worker.complete(worker.latestRun(), result);
  await running; await new Promise(setImmediate);
  assert.equal(harness.view.controller.state, 'complete');
  return worker;
}

test('production UI mounts without precomputed output and renders every stage from actual Node Worker arrays', async t => {
  const h = await mounted(t), r = await fixture();
  assert.equal(h.workers.length, 0); assert.equal(h.view.controller.state, 'idle');
  assert.equal(h.get('ici-line').hasAttribute('hidden'), false);
  h.get('ici-line').hidden = true;
  assert.equal(h.get('ici-line').hasAttribute('hidden'), false, 'SVG expando cannot hide the plot');
  assert.match(h.get('ici-status').textContent, /尚未计算/);
  assert.equal(h.get('ici-export-history').disabled, true); assert.equal(h.get('ici-truth').checked, false);
  assert.equal(h.view.readScene().targets.length, 5);
  const w = await deliverUI(h, r);
  assert.equal(w.latestRun().input.mode, 'simulate');
  assert.match(h.get('ici-provenance').textContent, new RegExp(r.provenance.y_sha256));
  assert.ok(h.get('ici-array-values').innerHTML.includes('<table>'));
  for (const stage of ['observe', 'music', 'cfo', 'refit', 'cfar', 'unwrap', 'evaluate']) {
    await h.document.querySelector(`[data-stage="${stage}"]`).fire('click');
    assert.ok(h.get('ici-stage-title').textContent.length > 5, stage);
    assert.equal(h.get('ici-line').hasAttribute('hidden'), stage === 'cfar', stage + ' SVG visibility attribute');
    assert.equal(h.get('ici-map').hidden, stage !== 'cfar', stage + ' HTML canvas visibility');
    assert.ok(h.get('ici-stage-summary').textContent.length > 8, stage);
    assert.doesNotMatch(h.get('ici-stage-details').innerHTML, /\bundefined\b|\bNaN\b/, stage);
    assert.doesNotMatch(h.get('ici-line').innerHTML, /\bundefined\b|\bNaN\b|\bInfinity\b/, stage);
  }
  assert.ok(h.canvasCalls.some(call => call[0] === 'fillRect'));
  assert.match(h.get('ici-stops').textContent, /iteration_cap/);
  assert.equal(w.sent.filter(message => message.type === 'run').length, 1, 'views cannot call the solver');
  assert.equal(h.get('ici-evaluation').hidden, true);
  h.get('ici-truth').checked = true; await h.get('ici-truth').fire('change');
  assert.equal(h.get('ici-evaluation').hidden, false);
  assert.match(h.get('ici-evaluation').textContent, /命中 1\/1/);
  assert.match(h.get('ici-evaluation').textContent, /源式 FDR/);
  assert.match(h.get('ici-evaluation').textContent, /常规 FDR/);
  assert.equal(w.sent.filter(message => message.type === 'run').length, 1);
  h.get('ici-truth').checked = false; await h.get('ici-truth').fire('change');
  assert.equal(h.get('ici-evaluation').hidden, true);
});

test('production UI labels retained results stale, recomputes on held Y, generates scene edits and resets cleanly', async t => {
  const h = await mounted(t), result = await fixture(), w = await deliverUI(h, result);
  h.get('ici-pfa').value = '.001'; await h.get('ici-pfa').fire('change');
  assert.equal(h.view.controller.dirty, 'receiver'); assert.match(h.get('ici-status').textContent, /上一次完整结果/);
  assert.match(h.get('ici-provenance').textContent, /上次完整结果/); assert.match(h.get('ici-run').textContent, /保留 Y\/X/);
  await deliverUI(h, result); assert.equal(w.latestRun().input.mode, 'raw'); assert.equal(w.latestRun().input.config.pfa, .001);
  h.get('ici-seed').value = '99'; await h.get('ici-seed').fire('change');
  assert.equal(h.view.controller.dirty, 'scene');
  await deliverUI(h, result); assert.equal(w.latestRun().input.mode, 'simulate'); assert.equal(w.latestRun().input.simulation.seed, 99);
  await h.get('ici-reset').fire('click');
  assert.equal(h.view.controller.state, 'idle'); assert.equal(h.view.controller.completed, null);
  assert.equal(h.get('ici-export-raw').disabled, true); assert.equal(h.get('ici-export-history').disabled, true);
  assert.equal(h.get('ici-detections').innerHTML, ''); assert.equal(h.get('ici-evaluation').hidden, true);
  assert.equal(h.get('ici-preset').value, 'five'); assert.equal(h.get('ici-seed').value, '20261012');
  assert.equal(h.view.readScene().targets.length, 5);
  assert.match(h.get('ici-stage-title').textContent, /^01/);
});

test('production UI imports raw values and custom grid, withholds absent counterfactual/truth, and exports honest records', async t => {
  const native = nativeController(); t.after(() => native.controller.dispose());
  const raw = K.toJSON(K.exportRaw(await fixture(), 'ui-raw-import'));
  delete raw.y_ici_free_counterfactual; delete raw.expected_hashes.y_ici_free_sha256;
  assert.ok(await native.controller.importFile(fileOf(JSON.stringify(raw))));
  assert.equal((await native.controller.run(scene(), config())).type, 'complete');
  const r = native.controller.completed.result, h = await mounted(t);
  h.get('ici-import').files = [fileOf(JSON.stringify(raw))]; await h.get('ici-import').fire('change');
  assert.equal(h.view.controller.state, 'imported'); assert.equal(h.workers.length, 0);
  assert.equal(h.get('ici-angle-step').value, '10'); assert.equal(h.view.readConfig().angle_step, 10);
  assert.match(h.get('ici-angle-step').textContent, /导入格距 10/);
  const w = await deliverUI(h, r);
  assert.equal(w.latestRun().input.mode, 'raw'); assert.equal(h.view.controller.completed.truth, null);
  h.view.changeStage('cfar'); h.get('ici-method').value = 'free'; await h.get('ici-method').fire('change');
  assert.match(h.get('ici-stage-summary').textContent, /没有 ICI-free 反事实/);
  assert.match(h.get('ici-array-description').textContent, /没有可用/);
  h.get('ici-method').value = 'fft'; await h.get('ici-method').fire('change');
  assert.match(h.get('ici-stage-summary').textContent, /同 Y 的已知 X FFT/);
  h.get('ici-truth').checked = true; await h.get('ici-truth').fire('change');
  assert.match(h.get('ici-evaluation').textContent, /没有可信仿真真值/);
  assert.equal(w.sent.filter(message => message.type === 'run').length, 1);
  await h.get('ici-export-raw').fire('click'); await h.get('ici-export-history').fire('click');
  assert.equal(h.downloads.length, 2);
  const exported = parseImport(h.downloads[0].text), history = JSON.parse(h.downloads[1].text);
  assert.equal(exported.y_ici_free_counterfactual, undefined); assert.equal(exported.truth, undefined);
  assert.equal(exported.expected_hashes.y_sha256, r.provenance.y_sha256);
  assert.equal(history.status, 'historical-computation-record-not-a-fresh-input');
  assert.equal(history.record.truth, null); assert.equal(history.record.evaluation, null);
  h.get('ici-import').files = [fileOf(h.downloads[1].text)]; await h.get('ici-import').fire('change');
  assert.equal(h.view.controller.state, 'error'); assert.match(h.get('ici-status').textContent, /上一次完整结果/);
  assert.match(h.get('ici-record-status').textContent, /historical|raw-input/);
});

test('production UI shows actual CFAR details without a canvas context', async t => {
  const h = await mounted(t, { canvas: false }); await deliverUI(h, await fixture());
  h.get('ici-cut-q').value = '3'; h.get('ici-cut-d').value = '13'; h.view.changeStage('cfar');
  assert.match(h.get('ici-stage-summary').textContent, /训练数=63/);
  assert.match(h.get('ici-stage-summary').textContent, /实际输出检测/);
  assert.doesNotMatch(h.get('ici-stage-summary').textContent, /q≥L/);
  assert.match(h.get('ici-stage-details').textContent, /记录训练数 \/ 重建去重数/);
});

test('production UI survives delayed import/reset, queued cancellation and restored page lifecycle', async t => {
  const h = await mounted(t), result = await fixture(), raw = recordJSON(K.exportRaw(result, 'ui-delayed'));
  let finish;
  h.get('ici-import').files = [{ size: Buffer.byteLength(raw), text() { return new Promise(resolve => { finish = resolve; }); } }];
  const importing = h.get('ici-import').fire('change');
  assert.equal(h.get('ici-run').disabled, true);
  await h.get('ici-reset').fire('click'); finish(raw); await importing;
  assert.equal(h.view.controller.state, 'idle'); assert.equal(h.view.controller.observation, null);
  const run = h.get('ici-run').fire('click'), w = h.workers[0], old = w.latestRun();
  await h.get('ici-cancel').fire('click'); w.complete(old, result); await run;
  assert.equal(h.view.controller.state, 'cancelled'); assert.equal(h.view.controller.completed, null);
  await deliverUI(h, result);
  h.windowEvents.pagehide(); await new Promise(setImmediate);
  assert.equal(w.terminated, 1); assert.equal(h.view.controller.state, 'disposed');
  h.windowEvents.pageshow({ persisted: true });
  assert.equal(h.view.controller.state, 'dirty'); assert.match(h.get('ici-status').textContent, /上一次完整结果/);
  await deliverUI(h, result); assert.equal(h.workers.length, 2);
});

test('production UI renders no-angle/no-detection results across all stages without invented maps or zero errors', async t => {
  const native = nativeController(); t.after(() => native.controller.dispose());
  assert.equal((await native.controller.run(scene(), { ...config(), music_order: 0 })).type, 'complete');
  const h = await mounted(t), r = native.controller.completed.result;
  assert.equal(r.receiver.angles.length, 0); await deliverUI(h, r);
  for (const stage of ['observe', 'music', 'cfo', 'refit', 'cfar', 'unwrap', 'evaluate']) {
    h.view.changeStage(stage);
    assert.doesNotMatch(h.get('ici-line').innerHTML, /\bNaN\b|\bInfinity\b|\bundefined\b/);
    assert.doesNotMatch(h.get('ici-stage-summary').textContent, /\bundefined\b/);
  }
  assert.match(h.get('ici-stops').textContent, /无返回角度/);
  assert.match(h.get('ici-detections').textContent, /无原始检测/);
  h.get('ici-truth').checked = true; await h.get('ici-truth').fire('change');
  assert.match(h.get('ici-evaluation').textContent, /命中 0\/1；漏检 1/);
  assert.match(h.get('ici-evaluation').textContent, /条件 RMSE：距离 —/);
});

test('production mounted UI completes an actual Node Worker round-trip from imported X/Y to rendered CFAR', { timeout: 20000 }, async t => {
  const h = lightDocument(pageText()), { mount } = require(lessonPath), requests = [];
  const view = mount(h.document, { makeWorker() {
    const worker = new Worker(path.join(runtime, 'worker/ici-worker.js')), post = worker.postMessage.bind(worker);
    worker.postMessage = message => { requests.push(copy(message)); post(message); };
    return worker;
  } }); t.after(() => view.controller.dispose());
  const raw = recordJSON(K.exportRaw(await fixture(), 'mounted-native'));
  h.get('ici-import').files = [fileOf(raw)]; await h.get('ici-import').fire('change');
  assert.equal(h.get('ici-new-noise').disabled, true, 'raw input has no truth-backed resimulation');
  await h.get('ici-run').fire('click');
  assert.equal(view.controller.state, 'complete'); assert.equal(view.controller.completed.source, 'imported-raw');
  assert.equal(requests.filter(message => message.type === 'run').length, 1);
  const computed = view.controller.completed.result;
  assert.equal(computed.computation, 'fresh'); assert.equal(computed.provenance.y_sha256, hashComplex(computed.input.y));
  assert.match(h.get('ici-status').textContent, /本次计算完成/);
  h.get('ici-cut-q').value = '3'; h.get('ici-cut-d').value = '13'; view.changeStage('cfar');
  assert.match(h.get('ici-stage-summary').textContent, /训练数=63/);
  assert.match(h.get('ici-stage-summary').textContent, /实际输出检测/);
  assert.ok(h.canvasCalls.some(call => call[0] === 'strokeRect'));
  await h.get('ici-reset').fire('click');
  assert.equal(h.get('ici-config').textContent, '尚无配置'); assert.equal(h.get('ici-diagnostics').textContent, '尚无结果');
  assert.equal(h.get('ici-new-noise').disabled, false);
});

test('an invalid replacement run explicitly cancels the prior owned job before validation and recovers', async t => {
  const { controller: c, workers, result } = await controlled(t);
  const first = c.run(scene(), config()), w = workers[0], old = w.latestRun();
  assert.equal((await c.run({}, { n: 128 })).type, 'error');
  assert.equal(c.state, 'error'); assert.equal(c.job, null);
  assert.ok(w.sent.some(m => m.type === 'cancel' && m.runId === old.runId), 'invalid replacement must cancel prior work');
  const pendingEntry = c.client.pending.get(old.runId);
  assert.equal(pendingEntry.cancelRequested, true);
  w.emit('message', { type: 'cancelled', runId: old.runId, reason: 'requested' });
  assert.equal((await first).type, 'stale'); assert.equal(c.client.pending.size, 0);
  const retry = c.run(scene(), config()); w.complete(w.latestRun(), result);
  assert.equal((await retry).type, 'complete'); assert.equal(c.state, 'complete');
});

test('lesson fixed transmit beam is enforced on import and direct run without changing the frozen kernel', async t => {
  const r = await fixture(), raw = K.toJSON(K.exportRaw(r, 'wrong-transmit-beam'));
  raw.config.tx_angle_deg = 0;
  assert.equal(K.config(raw.config).tx_angle_deg, 0, 'underlying kernel remains broader and unchanged');
  assert.throws(() => parseImport(JSON.stringify(raw)), /固定发射波束/);
  const { controller: c, workers } = await controlled(t);
  assert.equal((await c.run(scene(), { ...config(), tx_angle_deg: 0 })).type, 'error');
  assert.match(c.error.message, /固定发射波束/); assert.equal(workers.length, 0);
});

test('imported held observations run independently of an invalid unused simulation draft', async t => {
  const h = await mounted(t), raw = K.toJSON(K.exportRaw(await fixture(), 'independent-import'));
  h.get('ici-target-0-angle').value = ''; await h.get('ici-target-0-angle').fire('change');
  assert.throws(() => h.view.readScene(), /有效数字/);
  h.get('ici-import').files = [fileOf(JSON.stringify(raw))]; await h.get('ici-import').fire('change');
  assert.equal(h.view.controller.state, 'imported'); assert.equal(h.get('ici-new-noise').disabled, true);
  const w = await deliverUI(h, await fixture());
  assert.equal(w.latestRun().input.mode, 'raw'); assert.equal(h.view.controller.completed.truth, null);
});

test('raw export preserves signed-zero sample bytes and hashes across an actual Worker round trip', async t => {
  const { controller: c } = nativeController(); t.after(() => c.dispose());
  const raw = K.toJSON(K.exportRaw(await fixture(), 'signed-zero-source'));
  raw.y.real[0] = -0; raw.x.imag[0] = -0; delete raw.expected_hashes;
  const text = recordJSON(raw);
  assert.equal(Object.is(parseImport(text).y.real[0], -0), true);
  assert.ok(await c.importFile(fileOf(text)));
  assert.equal((await c.run(null, raw.config)).type, 'complete');
  const first = c.completed.result, exported = c.exportRaw();
  const parsed = parseImport(exported);
  assert.equal(Object.is(parsed.y.real[0], -0), true); assert.equal(Object.is(parsed.x.imag[0], -0), true);
  assert.equal(hashComplex(parsed.y), first.provenance.y_sha256);
  assert.equal(hashComplex(parsed.x), first.provenance.x_sha256);
  assert.ok(await c.importFile(fileOf(exported)));
  assert.equal((await c.run(null, raw.config)).type, 'complete');
  assert.equal(c.completed.result.provenance.y_sha256, first.provenance.y_sha256);
  assert.equal(c.completed.result.provenance.x_sha256, first.provenance.x_sha256);
});

test('signed-zero record serialization preserves arbitrary strings and has no replacement-marker collisions', () => {
  const values = { number: -0, positive: 0, list: [-0, 0, NaN, Infinity], text: '-0 "-0" __NEGATIVE_ZERO__ \\n \\" 界', nested: { '-0': '0', value: -0 }, undefinedField: undefined };
  const encoded = recordJSON(values), parsed = JSON.parse(encoded);
  assert.match(encoded, /\"number\":-0\.0/);
  const sparse=[];sparse.length=2;sparse[2]=undefined;assert.equal(recordJSON(sparse),'[null,null,null]');
  const proto=JSON.parse('{"__proto__":{"kept":true}}');assert.deepEqual(JSON.parse(recordJSON(proto)),proto);
  assert.equal(Object.is(parsed.number, -0), true); assert.equal(Object.is(parsed.positive, 0), true);
  assert.equal(Object.is(parsed.list[0], -0), true); assert.equal(parsed.list[2], null); assert.equal(parsed.list[3], null);
  assert.equal(parsed.text, values.text); assert.equal(parsed.nested['-0'], '0');
  assert.equal(Object.is(parsed.nested.value, -0), true); assert.equal('undefinedField' in parsed, false);
});

test('record serialization reads immutable typed arrays directly without a deep K.toJSON clone', () => {
  const real = new Float64Array([-0, 1, NaN, Infinity]);
  const value = { array: { shape: [4], real, imag: new Float64Array(4) }, failed: -Infinity };
  const saved = K.toJSON;
  try {
    K.toJSON = () => { throw Error('Serialization must not make an unnecessary numerical-result deep copy'); };
    const parsed = JSON.parse(recordJSON(value));
    assert.equal(Object.is(parsed.array.real[0], -0), true);
    assert.deepEqual(parsed.array.real.slice(1), [1, null, null]); assert.equal(parsed.failed, null);
    assert.equal(value.array.real, real); assert.equal(Object.is(real[0], -0), true);
    assert.equal(Number.isNaN(real[2]), true); assert.equal(real[3], Infinity);
  } finally { K.toJSON = saved; }
});
