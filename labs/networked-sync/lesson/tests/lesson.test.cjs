'use strict';
// Actual Node worker_threads and the production lesson controller/view.
// The DOM harness is deliberately not a browser, layout, or accessibility audit.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Worker } = require('node:worker_threads');
const L = require('../controller.js');
const lightDocument = require('./dom-harness.cjs');
const root = path.resolve(__dirname, '../../../..');
const runtime = path.resolve(__dirname, '../../runtime');
const workerEntry = path.join(runtime, 'worker/receiver-worker.js');
const page = () => fs.readFileSync(path.join(root, fs.existsSync(path.join(root, 'content/pages/networked-sync.html')) ? 'content/pages/networked-sync.html' : 'networked-sync.html'), 'utf8');
const config = (extra = {}) => ({ ...L.defaults(), shape: [4, 8, 5], rank: 1, iterations: 1, seed: 57, ...extra });
const fileOf = text => ({ size: Buffer.byteLength(text), async text() { return text; } });
const gate = () => { let resolve, reject; const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; }); return { promise, resolve, reject }; };
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
// Intentionally independent of runtime codec/sha256 code.
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value === 0 ? 0 : value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
function identity(record) {
  const o = record.observation, metadata = { shape: o.shape };
  for (const key of ['configPhysics', 'generationConfig']) if (key in o) metadata[key] = o[key];
  const prefix = Buffer.from('networked-sync-samples-f64le-zero-normalized-v1\0', 'utf8');
  const header = Buffer.alloc(12); o.shape.forEach((x, i) => header.writeUInt32LE(x, 4 * i));
  const vectors = [...o.observations, ...o.pilots];
  const data = Buffer.alloc(vectors.reduce((n, a) => n + a.length, 0) * 8); let offset = 0;
  for (const vector of vectors) for (const value of vector) { data.writeDoubleLE(value === 0 ? 0 : value, offset); offset += 8; }
  return { config_sha256: sha(canonical({ config: record.config, observation_metadata: metadata })), sample_sha256: sha(Buffer.concat([prefix, header, data])) };
}
function transport() {
  const workers = [], sent = [], events = [];
  const createWorker = () => {
    const worker = new Worker(workerEntry), post = worker.postMessage.bind(worker);
    worker.postMessage = message => { sent.push(structuredClone(message)); post(message); };
    worker.on('message', event => events.push(structuredClone(event)));
    workers.push(worker); return worker;
  };
  return { workers, sent, events, createWorker };
}
function actual(t, options = {}) {
  const tr = transport(), changes = [], waiters = new Set();
  const c = new L.Controller({ ...options, createWorker: tr.createWorker, onChange(state) {
    changes.push({ state: state.state, stage: state.progress?.stage, result: state.result, held: state.held });
    for (const w of [...waiters]) if (w.p(state)) { waiters.delete(w); clearTimeout(w.timer); w.resolve(state); }
    options.onChange?.(state);
  } });
  const when = p => p(c) ? Promise.resolve(c) : new Promise((resolve, reject) => {
    const w = { p, resolve, timer: setTimeout(() => { waiters.delete(w); reject(Error('Controller wait timed out: ' + c.state + '/' + c.progress?.stage)); }, 15000) }; waiters.add(w);
  });
  t?.after(async () => { for (const w of waiters) clearTimeout(w.timer); await c.dispose(); await Promise.all(tr.workers.map(w => w.terminate())); });
  return { ...tr, c, changes, when };
}
let fixturePromise;
function fixture() {
  return fixturePromise ||= (async () => {
    const { c } = actual();
    try {
      assert.equal((await c.generate(config())).type, 'complete');
      const result = structuredClone(c.result), held = structuredClone(c.held);
      const raw = (await c.exportRecord('raw')).result, history = (await c.exportRecord('history')).result;
      return { raw, history, result, held };
    } finally { await c.dispose(); }
  })();
}
function resultIdentity(c) { return { config: c.result.config, observation: c.result.observation }; }

const acceptedRuntimeHashes = {
  'js/codec.js': 'ea32aa145a59794a21421ee7d900bc8d59566ddd734416aeb2d570bae333c1a5',
  'js/linalg.js': '7d5983a18f3bf1b54db5076944bc12e84c9489059dc66481fcba277f65bdaafc',
  'js/receiver.js': '473e7739d35a7dcde7807edb0627a9f0058a4d193518a6c8cfa6745a6218de98',
  'js/sha256.js': '9f1dfd6b3c81f5647db4a2f8259e8e4cc756d27183b1e0a9c43b586f361952e6',
  'worker/client.js': '2ec4be85c09f9abfa6a86da8995ed1b6c6c67bbd28518ca299f67db19dca19eb',
  'worker/protocol.js': '7a2eebeed3e169bf9339a75d87b317190d84ddf9ee9cedb07737039f64422a38',
  'worker/receiver-worker.js': 'e2f50711ef502d8ec6cb185a7e5d9f3cb00444512fe57c8d4de8bbfa12a5d534'
};
test('lesson uses the exact seven frozen runtime JavaScript files', () => {
  for (const [file, expected] of Object.entries(acceptedRuntimeHashes)) assert.equal(sha(fs.readFileSync(path.join(runtime, file))), expected, file);
});
test('actual Worker returns fresh source-derived arrays and independently matching config/sample digests', { timeout: 20000 }, async t => {
  const { c, sent } = actual(t);
  assert.equal((await c.generate(config())).type, 'complete');
  assert.equal(c.state, 'complete'); assert.equal(c.result.status, 'fresh-execution');
  assert.equal(c.result.operation, 'generate'); assert.equal(c.result.boundaries.truth_in_receiver, false);
  assert.deepEqual(c.held.identity, identity(resultIdentity(c)));
  assert.ok(c.result.pilot_divided[0].data.length > 0);
  assert.ok(c.result.methods.scpd.links[0].trace.length > 1);
  assert.equal(sent.filter(x => x.type === 'run').length, 1);
  assert.ok(sent.every(x => !('truth' in x) && !('evaluation' in x)));
});
test('held policy recomputes actual receiver without regenerating samples; generation metadata cannot change', { timeout: 20000 }, async t => {
  const { c, sent } = actual(t); await c.generate(config());
  const held = structuredClone(c.held), observation = structuredClone(c.result.observation);
  for (const policy of [{ iterations: 2 }, { projectionOversampling: 8 }, { tolerance: .001 }, { trace: 'summary' }]) {
    assert.equal((await c.process(policy)).type, 'complete');
    assert.equal(c.result.operation, 'held'); assert.equal(c.held.id, held.id);
    assert.equal(c.held.identity.sample_sha256, held.identity.sample_sha256);
    assert.deepEqual(c.result.observation, observation);
    assert.deepEqual(c.held.identity, identity(resultIdentity(c)));
    assert.equal('truth' in c.result, false); assert.equal('evaluation' in c.result, false);
  }
  assert.notEqual(c.held.identity.config_sha256, held.identity.config_sha256);
  assert.equal(sent.filter(x => x.type === 'run').length, 1);
  assert.equal(sent.filter(x => x.type === 'process').length, 4);
  const previous = c.result;
  for (const policy of [{ seed: 99 }, { snrDb: 0 }, { offsetS: 0 }, { bandwidthHz: 1e6 }]) await assert.rejects(c.process(policy), /固定观测/);
  assert.equal(c.result, previous); assert.equal(c.state, 'complete');
});
test('raw and history export/import are identity-bound; history never becomes a fresh execution', { timeout: 20000 }, async t => {
  const f = await fixture(), { c, sent } = actual(t);
  assert.deepEqual(f.raw.identity, identity(f.raw)); assert.equal(f.raw.mode, 'raw');
  assert.equal(f.history.historical.freshExecution, false);
  assert.equal(f.history.historical.label, 'historical-import-not-fresh-execution');
  assert.equal('observation' in f.history.historical.result, false);
  assert.equal((await c.importFile(fileOf(JSON.stringify(f.raw)))).type, 'complete');
  assert.equal(c.state, 'imported'); assert.equal(c.result, null); assert.equal(c.historical, null);
  assert.deepEqual(c.held.identity, f.raw.identity);
  await c.process({ iterations: 1 }); assert.equal(c.result.operation, 'held');
  assert.equal('truth' in c.result, false); assert.equal('evaluation' in c.result, false);
  const alteredHistory = structuredClone(f.history); alteredHistory.historical.result.untrusted_history_marker = 'not a computed result';
  await c.importRecord(alteredHistory);
  assert.equal(c.result, null); assert.equal(c.state, 'imported');
  assert.equal(c.historical.freshExecution, false); assert.equal(c.historical.result.untrusted_history_marker, 'not a computed result');
  await c.process({ iterations: 1 }); assert.equal('untrusted_history_marker' in c.result, false);
  assert.equal(c.historical, null); assert.equal(sent.some(x => x.type === 'run'), false);
});
test('signed-zero records normalize consistently in config, samples, and known pilots', { timeout: 20000 }, async t => {
  const { raw } = await fixture(), record = structuredClone(raw), { c } = actual(t);
  record.config.cfoHz = -0; record.observation.generationConfig.cfoHz = -0;
  record.observation.observations[0][0] = -0;
  const pilotZero = record.observation.pilots[0].findIndex(x => x === 0); assert.ok(pilotZero >= 0);
  record.observation.pilots[0][pilotZero] = -0; record.identity = identity(record);
  assert.equal((await c.importRecord(record)).type, 'complete');
  const exported = (await c.exportRecord('raw')).result;
  assert.deepEqual(exported.identity, identity(record)); assert.deepEqual(exported.identity, identity(exported));
  assert.equal(Object.is(exported.config.cfoHz, -0), false);
  assert.equal(Object.is(exported.observation.observations[0][0], -0), false);
  assert.equal(Object.is(exported.observation.pilots[0][pilotZero], -0), false);
});
for (const field of ['samples', 'pilots', 'metadata']) test(`rejected ${field} replacement preserves prior held/result and export identity`, { timeout: 20000 }, async t => {
  const { raw } = await fixture(), { c } = actual(t); await c.generate(config({ seed: 58 }));
  const previous = c.result, held = structuredClone(c.held), bad = structuredClone(raw);
  if (field === 'samples') bad.observation.observations[0][0] += .125;
  else if (field === 'pilots') bad.observation.pilots[0] = bad.observation.pilots[0].map(x => -x);
  else { bad.config.seed++; bad.observation.generationConfig.seed++; }
  await assert.rejects(c.importRecord(bad), { code: 'HASH_MISMATCH' });
  assert.equal(c.result, previous); assert.deepEqual(c.held, held); assert.equal(c.state, 'complete');
  assert.deepEqual((await c.exportRecord('raw')).result.identity, held.identity);
});
test('invalid newer request and hash-invalid import cannot suppress an already accepted computation', { timeout: 20000 }, async t => {
  const { raw } = await fixture(), { c, when, events } = actual(t);
  const running = c.generate(config({ iterations: 8 })); await when(x => x.progress?.stage === 'mode-update-start');
  const acceptedId = c.active, bad = structuredClone(raw); bad.observation.observations[0][0] += .01;
  await assert.rejects(c.generate(config({ iterations: 0 })), /iterations/);
  await assert.rejects(c.importRecord(bad), { code: 'HASH_MISMATCH' });
  assert.equal((await running).type, 'complete'); assert.equal(c.state, 'complete');
  assert.equal(c.held.id, acceptedId); assert.equal(c.result.config.iterations, 8);
  assert.equal(events.filter(x => x.id === acceptedId && x.type === 'complete').length, 1);
});
test('accepted newer computation supersedes active work and only presents the selected result', { timeout: 20000 }, async t => {
  const { c, when, changes } = actual(t);
  const first = c.generate(config({ seed: 80, iterations: 12 })); await when(x => x.progress?.stage === 'mode-update-start');
  const boundary = changes.length, replacement = c.generate(config({ seed: 81 }));
  assert.equal((await first).type, 'superseded'); assert.equal((await replacement).type, 'complete');
  assert.equal(c.result.config.seed, 81);
  assert.equal(changes.slice(boundary).some(x => x.state === 'complete' && x.result?.config.seed === 80), false);
});
test('accepted raw import supersedes an active computation without presenting imported data as computed', { timeout: 20000 }, async t => {
  const { raw } = await fixture(), { c, when, changes } = actual(t);
  const running = c.generate(config({ seed: 82, iterations: 12 })); await when(x => x.progress?.stage === 'mode-update-start');
  const boundary = changes.length, imported = c.importRecord(raw);
  assert.equal((await running).type, 'superseded'); assert.equal((await imported).type, 'complete');
  assert.equal(c.state, 'imported'); assert.equal(c.result, null); assert.equal(c.historical, null);
  assert.deepEqual(c.held.identity, raw.identity);
  assert.equal(changes.slice(boundary).some(x => x.state === 'complete' && x.result?.config.seed === 82), false);
});
for (const action of ['cancel', 'reset', 'stop', 'suspend']) test(`actual active ${action} invalidates queued output and supports an explicit restart`, { timeout: 20000 }, async t => {
  const { c, when } = actual(t); await c.generate(config());
  const running = c.generate(config({ seed: 91, iterations: 12 })); await when(x => x.progress?.stage === 'mode-update-start');
  await c[action](); assert.notEqual((await running).type, 'complete');
  assert.equal(c.state, { cancel: 'cancelled', reset: 'idle', stop: 'dead', suspend: 'suspended' }[action]);
  assert.equal(c.result, null); assert.equal(c.held, null); assert.equal(c.canExport, false);
  await assert.rejects(c.exportRecord('raw'));
  await c.restart(); assert.equal((await c.generate(config())).type, 'complete');
});
test('dead actual Worker rejects its running action and recovers after restart', { timeout: 20000 }, async t => {
  const { c, when, workers } = actual(t);
  const running = c.generate(config({ iterations: 12 })); const rejection = assert.rejects(running, e => /WORKER_(EXITED|TRANSPORT_ERROR)/.test(e.code));
  await when(x => x.progress?.stage === 'mode-update-start'); await workers[0].terminate(); await rejection;
  assert.equal(c.state, 'dead'); assert.equal(c.result, null); assert.equal(c.held, null);
  await c.restart(); assert.equal((await c.generate(config())).type, 'complete'); assert.equal(workers.length, 2);
});
test('idle actual Worker death clears held state and exportability before another action', { timeout: 20000 }, async t => {
  const { c, workers } = actual(t); await c.generate(config()); assert.equal(c.canExport, true);
  await workers[0].terminate();
  assert.equal(c.state, 'dead'); assert.equal(c.result, null); assert.equal(c.held, null); assert.equal(c.canExport, false);
  await c.restart(); assert.equal((await c.generate(config())).type, 'complete');
});
for (const action of ['cancel', 'reset', 'stop', 'restart', 'suspend']) test(`late asynchronous file read cannot resurrect state after ${action}`, { timeout: 20000 }, async t => {
  const { raw } = await fixture(), text = JSON.stringify(raw), { c } = actual(t), read = gate();
  const pending = c.importFile({ size: text.length, text: () => read.promise }); await c[action]();
  const state = c.state; read.resolve(text); assert.equal((await pending).type, 'cancelled');
  assert.equal(c.state, state); assert.equal(c.held, null); assert.equal(c.result, null);
});
test('latest file import wins out-of-order reads without discarding held raw on invalid newer import', { timeout: 20000 }, async t => {
  const { raw } = await fixture(), text = JSON.stringify(raw), { c } = actual(t), read = gate();
  const old = c.importFile({ size: text.length, text: () => read.promise });
  await c.importFile(fileOf(text)); const held = structuredClone(c.held); read.resolve(text);
  assert.equal((await old).type, 'cancelled'); assert.deepEqual(c.held, held);
  const bad = structuredClone(raw); bad.identity.config_sha256 = '0'.repeat(64);
  await assert.rejects(c.importFile(fileOf(JSON.stringify(bad))), { code: 'HASH_MISMATCH' });
  assert.deepEqual(c.held, held); assert.equal(c.state, 'imported');
});
test('newer explicit generation invalidates an earlier pending file read', { timeout: 20000 }, async t => {
  const { raw } = await fixture(), text = JSON.stringify(raw), { c } = actual(t), read = gate();
  const old = c.importFile({ size: text.length, text: () => read.promise });
  const fresh = c.generate(config({ seed: 999 })); await fresh; const held = structuredClone(c.held);
  read.resolve(text); assert.equal((await old).type, 'cancelled');
  assert.deepEqual(c.held, held); assert.equal(c.result.config.seed, 999);
});
test('suspended page rejects attempted generation without changing suspension or allocating a Worker', { timeout: 20000 }, async t => {
  const { c, workers } = actual(t); await c.generate(config()); await c.suspend();
  const count = workers.length; await assert.rejects(c.generate(config()), /暂停/);
  assert.equal(c.state, 'suspended'); assert.equal(c.suspended, true); assert.equal(workers.length, count);
  assert.equal(c.result, null); assert.equal(c.held, null); assert.equal(c.canExport, false);
});
test('newer reset supersedes an older restart that is awaiting actual Worker termination', { timeout: 20000 }, async t => {
  const { c, workers } = actual(t); await c.generate(config());
  const restart = c.restart(); const reset = c.reset(); await Promise.all([restart, reset]);
  assert.equal(c.client, null); assert.equal(c.state, 'idle'); assert.equal(workers.length, 1);
  assert.equal(c.held, null); assert.equal(c.result, null);
});
test('newer held computation invalidates an earlier pending file read without generating samples', { timeout: 20000 }, async t => {
  const { raw } = await fixture(), text = JSON.stringify(raw), { c, sent } = actual(t), read = gate();
  await c.generate(config({ seed: 117 }));
  const old = c.importFile({ size: text.length, text: () => read.promise });
  await c.process({ iterations: 2 }); const held = structuredClone(c.held);
  read.resolve(text); assert.equal((await old).type, 'cancelled'); assert.deepEqual(c.held, held);
  assert.equal(c.result.config.seed, 117); assert.equal(c.result.config.iterations, 2);
  assert.equal(sent.filter(x => x.type === 'run').length, 1);
});

// Mounted production UI tests follow. No numerical method is stubbed.
function mounted(t, options = {}) {
  const V = require('../lesson.js'), h = lightDocument(page(), options), tr = transport(), downloads = [];
  const app = V.mount(h.document, { createWorker: tr.createWorker, download(text, name) { downloads.push({ text, name }); } });
  t.after(async () => { await app.dispose(); await Promise.all(tr.workers.map(w => w.terminate())); });
  return { ...h, ...tr, app, downloads };
}
async function compactRun(h) {
  h.get('ns-shape').value = 'compact'; h.get('ns-rank').value = '1'; h.get('ns-iterations').value = '1';
  await h.get('ns-run').fire('click'); assert.equal(h.app.controller.state, 'complete');
}
function captureNextProgress(h, predicate, action) {
  const c = h.app.controller, prior = c.onChange; let hit = false, outcome;
  c.onChange = state => { prior(state); if (!hit && predicate(state)) { hit = true; outcome = action(); } };
  return { get hit() { return hit; }, async done() { await outcome; c.onChange = prior; } };
}
test('mounted production UI generates real output, exports raw/history and recomputes imported raw', { timeout: 20000 }, async t => {
  const h = mounted(t); assert.equal(h.workers.length, 0); assert.equal(h.get('ns-export-raw').disabled, true);
  await compactRun(h); assert.ok(h.canvasCalls.length > 0 || h.document.querySelectorAll('svg').length > 0);
  const plot = h.get('ns-line').innerHTML; assert.match(plot, /<polyline/);
  await h.get('ns-export-raw').fire('click'); assert.equal(h.get('ns-line').innerHTML, plot); assert.equal(h.get('ns-line').hidden, false);
  await h.get('ns-export-history').fire('click'); assert.equal(h.get('ns-line').innerHTML, plot); assert.equal(h.get('ns-line').hidden, false);
  assert.equal(h.downloads.length, 2);
  const raw = JSON.parse(h.downloads[0].text), history = JSON.parse(h.downloads[1].text);
  assert.deepEqual(raw.identity, identity(raw)); assert.equal(history.historical.freshExecution, false);
  h.get('ns-import').files = [fileOf(h.downloads[0].text)]; await h.get('ns-import').fire('change');
  assert.equal(h.app.controller.state, 'imported'); assert.equal(h.app.controller.result, null);
  await h.get('ns-apply').fire('click'); assert.equal(h.app.controller.result.operation, 'held');
  assert.equal(h.app.controller.held.identity.sample_sha256, raw.identity.sample_sha256);
  assert.equal('truth' in h.app.controller.result, false);
});
test('mounted policy changes recompute held samples while rejected scene settings preserve committed result', { timeout: 20000 }, async t => {
  const h = mounted(t); await compactRun(h); const first = structuredClone(h.app.controller.held);
  h.get('ns-iterations').value = '2'; await h.get('ns-iterations').fire('change'); await h.get('ns-apply').fire('click');
  assert.equal(h.app.controller.result.config.iterations, 2);
  assert.equal(h.app.controller.held.identity.sample_sha256, first.identity.sample_sha256);
  const current = h.app.controller.result; h.get('ns-iterations').value = '0'; await h.get('ns-run').fire('click');
  assert.equal(h.app.controller.result, current); assert.equal(h.app.controller.state, 'complete');
  assert.ok(h.app.controller.error);
});
test('mounted repeated Run accepts only the latest selected scene', { timeout: 20000 }, async t => {
  const h = mounted(t); h.get('ns-rank').value = '1'; h.get('ns-iterations').value = '1';
  h.get('ns-seed').value = '123'; const older = h.get('ns-run').fire('click');
  h.get('ns-seed').value = '124'; const latest = h.get('ns-run').fire('click');
  await Promise.all([older, latest]); assert.equal(h.app.controller.state, 'complete');
  assert.equal(h.app.controller.result.config.seed, 124);
  await h.get('ns-export-raw').fire('click');
  assert.equal(JSON.parse(h.downloads.at(-1).text).config.seed, 124);
});
test('mounted hash-invalid import cannot replace a running accepted numerical result', { timeout: 20000 }, async t => {
  const h = mounted(t), { raw } = await fixture(), bad = structuredClone(raw);
  bad.observation.observations[0][0] += .125;
  h.get('ns-rank').value = '1'; h.get('ns-iterations').value = '8'; h.get('ns-seed').value = '151';
  const trigger = captureNextProgress(h, c => c.busy && c.progress?.stage === 'mode-update-start', () => {
    h.get('ns-import').files = [fileOf(JSON.stringify(bad))]; return h.get('ns-import').fire('change');
  });
  await h.get('ns-run').fire('click'); await trigger.done(); assert.equal(trigger.hit, true);
  assert.equal(h.app.controller.state, 'complete'); assert.equal(h.app.controller.result.config.seed, 151);
  assert.deepEqual(h.app.controller.held.identity, identity(resultIdentity(h.app.controller)));
});
test('mounted rejected import restores the prior numerical plot after temporary validation state', { timeout: 20000 }, async t => {
  const h = mounted(t), { raw } = await fixture(); await compactRun(h);
  const prior = h.app.controller.result, plot = h.get('ns-line').innerHTML, bad = structuredClone(raw);
  bad.observation.observations[0][0] += .25; h.get('ns-import').files = [fileOf(JSON.stringify(bad))];
  await h.get('ns-import').fire('change');
  assert.equal(h.app.controller.result, prior); assert.equal(h.app.controller.state, 'complete');
  assert.equal(h.get('ns-line').hidden, false); assert.equal(h.get('ns-line').innerHTML, plot);
});
test('mounted original-to-compact replacement synchronizes visible tensor indices to the actual bounds', { timeout: 20000 }, async t => {
  const h = mounted(t); h.get('ns-shape').value = 'original'; h.get('ns-rank').value = '1'; h.get('ns-iterations').value = '1';
  await h.get('ns-run').fire('click'); assert.equal(h.app.controller.state, 'complete');
  for (const [id, value] of [['ns-antenna', '9'], ['ns-symbol', '19'], ['ns-tone', '35']]) { h.get(id).value = value; await h.get(id).fire('change'); assert.equal(h.get(id).value, value); }
  await compactRun(h);
  for (const [id, value] of [['ns-antenna', '5'], ['ns-symbol', '7'], ['ns-tone', '11']]) assert.equal(h.get(id).value, value);
  assert.deepEqual(h.app.controller.result.config.shape, [6, 12, 8]);
});
test('late reset termination cannot overwrite draft controls or result from a newer mounted Run', { timeout: 20000 }, async t => {
  const h = mounted(t); await compactRun(h);
  const oldWorker = h.workers[0], terminate = oldWorker.terminate.bind(oldWorker), closing = gate();
  oldWorker.terminate = async () => { await closing.promise; return terminate(); };
  t.after(() => closing.resolve());
  const reset = h.get('ns-reset').fire('click');
  h.get('ns-seed').value = '887'; h.get('ns-rank').value = '1'; h.get('ns-iterations').value = '1';
  await h.get('ns-run').fire('click'); const freshSeed = h.app.controller.result?.config.seed;
  closing.resolve(); await reset; assert.equal(freshSeed, 887);
  assert.equal(h.get('ns-seed').value, '887'); assert.equal(h.get('ns-rank').value, '1'); assert.equal(h.get('ns-iterations').value, '1');
  assert.equal(h.app.controller.state, 'complete'); assert.equal(h.app.controller.result.config.seed, 887);
});
for (const action of ['cancel', 'reset', 'stop']) test(`mounted ${action} during real computation cannot leave a current or exportable result`, { timeout: 20000 }, async t => {
  const h = mounted(t); await compactRun(h); h.get('ns-iterations').value = '12';
  const trigger = captureNextProgress(h, c => c.busy && c.progress?.stage === 'mode-update-start', () => h.get('ns-' + action).fire('click'));
  await h.get('ns-run').fire('click'); await trigger.done(); assert.equal(trigger.hit, true);
  assert.equal(h.app.controller.result, null); assert.equal(h.app.controller.held, null);
  assert.equal(h.get('ns-export-raw').disabled, true);
  await h.get('ns-restart').fire('click'); await compactRun(h);
});
test('mounted actual Worker death is visible and explicit restart permits a fresh run', { timeout: 20000 }, async t => {
  const h = mounted(t); h.get('ns-rank').value = '1'; h.get('ns-iterations').value = '12';
  const trigger = captureNextProgress(h, c => c.busy && c.progress?.stage === 'mode-update-start', () => h.workers[0].terminate());
  await h.get('ns-run').fire('click'); await trigger.done(); assert.equal(trigger.hit, true);
  assert.equal(h.app.controller.state, 'dead'); assert.equal(h.app.controller.result, null);
  assert.equal(h.get('ns-export-raw').disabled, true);
  await h.get('ns-restart').fire('click'); await compactRun(h); assert.equal(h.workers.length, 2);
});
test('mounted concurrent import reads and reset do not overwrite a newer state or selected file', { timeout: 20000 }, async t => {
  const h = mounted(t), { raw } = await fixture(), text = JSON.stringify(raw), read = gate();
  h.get('ns-import').files = [{ size: text.length, text: () => read.promise }]; const old = h.get('ns-import').fire('change');
  h.get('ns-import').files = [fileOf(text)]; await h.get('ns-import').fire('change'); const held = structuredClone(h.app.controller.held);
  h.get('ns-import').value = 'new-selection.json'; h.get('ns-iterations').value = '7'; read.resolve(text); await old;
  assert.deepEqual(h.app.controller.held, held); assert.equal(h.get('ns-import').value, 'new-selection.json');
  assert.equal(h.get('ns-iterations').value, '7');
  const delayed = gate(); h.get('ns-import').files = [{ size: text.length, text: () => delayed.promise }];
  const stale = h.get('ns-import').fire('change'); await h.get('ns-reset').fire('click'); delayed.resolve(text); await stale;
  assert.equal(h.app.controller.state, 'idle'); assert.equal(h.app.controller.held, null); assert.equal(h.get('ns-export-raw').disabled, true);
});
test('mounted page suspension clears active computation and requires restart before further work', { timeout: 20000 }, async t => {
  const h = mounted(t); await compactRun(h); h.get('ns-iterations').value = '12';
  const trigger = captureNextProgress(h, c => c.busy && c.progress?.stage === 'mode-update-start', () => h.fireWindow('pagehide', { persisted: true }));
  await h.get('ns-run').fire('click'); await trigger.done(); assert.equal(trigger.hit, true);
  assert.equal(h.app.controller.state, 'suspended'); assert.equal(h.app.controller.result, null);
  assert.equal(h.get('ns-export-history').disabled, true);
  await h.fireWindow('pageshow', { persisted: true }); assert.equal(h.app.controller.result, null);
  await h.get('ns-restart').fire('click'); await compactRun(h);
});
test('all mounted lesson views and truth toggle remain read-only over the same actual observation', { timeout: 20000 }, async t => {
  const h = mounted(t), stages = require('../stages.js'); await compactRun(h);
  const before = h.sent.length, saved = JSON.stringify(h.app.controller.result), hash = h.app.controller.held.identity.sample_sha256;
  for (const stage of stages) {
    await h.document.querySelector('[data-stage="' + stage.id + '"]').fire('click');
    assert.equal(h.get('ns-stage-title').textContent, stage.title);
    assert.ok(h.get('ns-summary').textContent.length > 5, stage.id);
    for (const id of ['ns-summary', 'ns-array-values', 'ns-line', 'ns-secondary']) assert.doesNotMatch(h.get(id).textContent + h.get(id).innerHTML, /undefined|NaN|Infinity/, stage.id + '/' + id);
  }
  h.get('ns-truth').checked = true; await h.get('ns-truth').fire('change');
  assert.match(h.get('ns-truth-content').textContent, /仅事后评价/);
  assert.equal(h.sent.length, before); assert.equal(JSON.stringify(h.app.controller.result), saved);
  assert.equal(h.app.controller.held.identity.sample_sha256, hash);
});
test('mounted failed current file read clears its selection for same-file retry', { timeout: 20000 }, async t => {
  const h = mounted(t), { raw } = await fixture(), text = JSON.stringify(raw); let fails = true;
  const file = { size: text.length, async text() { if (fails) throw Error('temporary file read failure'); return text; } };
  h.get('ns-import').files = [file]; h.get('ns-import').value = 'retry.json'; await h.get('ns-import').fire('change');
  assert.equal(h.get('ns-import').value, ''); assert.match(h.get('ns-record-status').textContent, /temporary file read failure/);
  fails = false; h.get('ns-import').files = [file]; h.get('ns-import').value = 'retry.json'; await h.get('ns-import').fire('change');
  assert.equal(h.app.controller.state, 'imported'); assert.equal(h.get('ns-import').value, '');
});
test('obsolete failed file read does not replace newer successful import status or selection', { timeout: 20000 }, async t => {
  const h = mounted(t), { raw } = await fixture(), text = JSON.stringify(raw), read = gate();
  h.get('ns-import').files = [{ size: text.length, text: () => read.promise }]; const old = h.get('ns-import').fire('change');
  h.get('ns-import').files = [fileOf(text)]; await h.get('ns-import').fire('change');
  const status = h.get('ns-record-status').textContent, held = structuredClone(h.app.controller.held);
  h.get('ns-import').value = 'newer-choice.json'; read.reject(Error('obsolete file read failure')); await old;
  assert.equal(h.get('ns-record-status').textContent, status); assert.equal(h.get('ns-import').value, 'newer-choice.json');
  assert.deepEqual(h.app.controller.held, held);
});
test('read-only chart omits failed nonfinite samples rather than drawing zero markers', () => {
  const V = require('../lesson.js'), html = V.chart([{ name: 'partial failure', x: [1, 2, 3], y: [2, null, NaN], points: true }], 'direction', 'relative residual');
  const h = lightDocument('<body><svg>' + html + '</svg></body>');
  assert.equal(h.document.querySelectorAll('circle').length, 1);
  assert.doesNotMatch(html, /NaN|Infinity/);
});
test('read-only chart renders actual typed-array eigenvalues with finite coordinates', async () => {
  const V = require('../lesson.js'), f = await fixture();
  const init = f.result.methods.smooth.links[0]; assert.ok(init.subspace_eigenvalues instanceof Float64Array);
  const view = V.buildView(f.result, 'initialize', { method: 'scpd', link: 0, antenna: 0, symbol: 0, column: 0, iteration: 1, axis: 0, quantity: 'amplitude', tensor: 'observation', ambiguity: false, truth: false });
  assert.match(view.line, /<polyline/); assert.doesNotMatch(view.line, /NaN|Infinity/);
  assert.deepEqual(Array.from(view.arrays['保留子空间特征值']), Array.from(init.subspace_eigenvalues));
});
test('read-only slices use the declared C-order, and method comparison normalizes each direction separately', async () => {
  const V = require('../lesson.js'), { result: r } = await fixture();
  const s = { method: 'scpd', link: 1, antenna: 2, symbol: 1, tone: 3, slice: 'slowtime', column: 0, iteration: 1, axis: 1, quantity: 'power', tensor: 'raw', ambiguity: false, truth: false };
  const view = V.buildView(r, 'observation', s), [, N, T] = r.config.shape, raw = r.observation.observations[1], row = [];
  for (let k = 0; k < T; k++) { const i = 2 * ((s.antenna * N + s.tone) * T + k); row.push(raw[i], raw[i + 1]); }
  assert.deepEqual(view.arrays['所选慢时间列 I/Q'], row);
  const power = []; for (let n = 0; n < N; n++) for (let k = 0; k < T; k++) { const i = 2 * ((s.antenna * N + n) * T + k); power.push(raw[i] * raw[i] + raw[i + 1] * raw[i + 1]); }
  assert.deepEqual(view.arrays['所选 n×k 切片标量'], power);
  const compare = V.buildView(r, 'compare', s), h = lightDocument('<body><svg>' + compare.line + '</svg></body>');
  const norms = r.pilot_divided.map(y => Math.sqrt(y.data.reduce((sum, x) => sum + x * x, 0)));
  assert.ok(Math.abs(norms[0] - norms[1]) > .01, 'fixture directions must exercise different denominators');
  const ratios = Object.values(r.methods).flatMap(method => method.links.map((link, j) => link.residual_norm / norms[j]));
  const circles = h.document.querySelectorAll('circle'), max = Math.max(...ratios); assert.equal(circles.length, ratios.length);
  const axis = h.document.querySelector('path').getAttribute('d').match(/^M[\d.]+ ([\d.]+)V([\d.]+)H/); assert.ok(axis);
  const top = Number(axis[1]), bottom = Number(axis[2]);
  circles.forEach((circle, i) => assert.ok(Math.abs(Number(circle.getAttribute('cy')) - (bottom - (bottom - top) * ratios[i] / max)) < 1e-9));
});
test('summary trace never substitutes final factors for unavailable selected-substep fit or residual', { timeout: 20000 }, async t => {
  const V = require('../lesson.js'), { c } = actual(t); await c.generate(config({ trace: 'summary' }));
  const link = c.result.methods.scpd.links[0]; assert.ok(link?.factors); assert.equal(link.trace[1].substeps[0].factors, undefined);
  for (const tensor of ['fit', 'residual']) {
    const s = { method: 'scpd', link: 0, antenna: 0, symbol: 0, column: 0, iteration: 1, axis: 0, quantity: 'amplitude', tensor, ambiguity: false, truth: false };
    const observation = V.buildView(c.result, 'observation', s);
    assert.equal(observation.line, ''); assert.equal(observation.secondary, '');
    assert.match(observation.summary, /summary|未保存|不能/);
    assert.equal('所选子载波行 I/Q' in observation.arrays, false);
    const residual = V.buildView(c.result, 'residual', s);
    assert.match(residual.line, /<polyline/); assert.equal(residual.secondary, '');
    assert.match(residual.secondaryCaption, /未保存|不能/);
    assert.equal('子步所选张量切片模' in residual.arrays, false);
  }
});
test('ambiguity display reverses both plotted factor columns and phase labels without mutating actual result', { timeout: 20000 }, async t => {
  const V = require('../lesson.js'), { c } = actual(t); await c.generate(config({ shape: [6, 12, 8], rank: 2 }));
  assert.ok(c.result.methods.scpd.links[0]); const before = JSON.stringify(c.result);
  const result = V.buildView(c.result, 'factor', { method: 'scpd', link: 0, antenna: 0, symbol: 0, column: 0, iteration: 1, axis: 1, quantity: 'amplitude', tensor: 'observation', ambiguity: true, truth: false });
  const h = lightDocument('<body>' + result.table + '</body>'), rows = h.document.querySelectorAll('tr').slice(1);
  for (let axis = 0; axis < 3; axis++) {
    const shown = Number(rows[axis].querySelectorAll('td')[1].textContent), expected = c.result.methods.scpd.links[0].phases[axis][1];
    assert.ok(Math.abs(shown - expected) < 1e-6, `axis ${axis}: label ${shown} does not describe displayed reversed column ${expected}`);
  }
  const fs = c.result.methods.scpd.links[0].factors, [M, N, T] = c.result.config.shape, part = result.arrays['所选秩一分量重建 I/Q'];
  assert.equal(part.length, 2 * M * N * T);
  for (let m = 0; m < M; m++) for (let n = 0; n < N; n++) for (let k = 0; k < T; k++) {
    let re = 1, im = 0; [m, n, k].forEach((q, axis) => { const i = 2 * (q * fs[axis].cols + 1), a = fs[axis].data[i], b = fs[axis].data[i + 1]; [re, im] = [re * a - im * b, re * b + im * a]; });
    const i = 2 * ((m * N + n) * T + k); assert.ok(Math.abs(part[i] - re) < 1e-10); assert.ok(Math.abs(part[i + 1] - im) < 1e-10);
  }
  assert.equal(JSON.stringify(c.result), before);
});
test('page controls are labeled, stages are progressive, and scientific/runtime limits stay explicit', () => {
  const html = page(), stages = require('../stages.js');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.deepEqual([...html.matchAll(/data-stage="([^"]+)"/g)].map(m => m[1]), stages.map(s => s.id));
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  for (const match of html.matchAll(/<(input|select)\b[^>]*id="([^"]+)"[^>]*>/g)) {
    const before = html.slice(0, match.index);
    assert.ok(/aria-label=/.test(match[0]) || before.lastIndexOf('<label') > before.lastIndexOf('</label>'), match[2]);
  }
  for (const text of ['64 MiB', '主值', '已知秩', '500', '432', '3.2003', '独立验收', 'Node', '不替代', 'δτ', 'δν']) assert.ok(html.includes(text), text);
  for (const text of ['v_src', 'v_phys', '−v_src', 'L=3']) assert.ok(html.includes(text), 'source sign / bounded-rank disclosure: ' + text);
  assert.match(html, /<figure tabindex="0" role="group"/);
  assert.match(html, /id="ns-progress"[^>]*aria-live="off"/);
  assert.match(html, /id="ns-announcement"[^>]*aria-live="polite"/);
  for (const stage of stages) for (const value of Object.values(stage)) assert.equal(typeof value, 'string');
  const source = fs.readFileSync(path.join(__dirname, '../lesson.js'), 'utf8');
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|setInterval/);
});

module.exports = { identity, canonical };
