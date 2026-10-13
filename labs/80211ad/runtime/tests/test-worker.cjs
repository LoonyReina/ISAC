'use strict';
// Actual Node worker_threads lifecycle tests and a SEPARATE browser-loader VM
// harness. VM coverage is not a browser execution/performance measurement.
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { Worker } = require('node:worker_threads');
const { EventEmitter } = require('node:events');
const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'worker/receiver-worker.js');
const Client = require('../worker/client.js');
const Protocol = require('../worker/protocol.js');
const terminalTypes = new Set(['complete', 'cancelled', 'superseded', 'error']);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const config = (extra = {}) => ({ frames: 2, oversample: 2, max_delay_chips: 8, pulse_halfspan_chips: 4, ...extra });
const target = () => ({ range_m: 0.25, velocity_mps: 1, gain: { real: 1, imag: 0 } });
function mailbox() {
  const events = [], waiters = new Set();
  function receive(e) {
    events.push(e);
    for (const w of [...waiters]) if (w.p(e)) { waiters.delete(w); clearTimeout(w.timer); w.ok(e); }
  }
  function wait(p, ms = 10000) {
    const previous = events.find(p); if (previous) return Promise.resolve(previous);
    return new Promise((ok, bad) => {
      const w = { p, ok, timer: setTimeout(() => { waiters.delete(w); bad(new Error('Worker event timeout: ' + JSON.stringify(events.slice(-6)))); }, ms) };
      waiters.add(w);
    });
  }
  return { events, receive, wait,
    terminal: (id, ms) => wait(e => e.id === id && terminalTypes.has(e.type) && !e.rejected, ms),
    rejected: id => wait(e => e.id === id && e.rejected),
    clear() { for (const w of waiters) clearTimeout(w.timer); waiters.clear(); } };
}
const stub = `
(function(root){
'use strict';
var trace = { running:0, maxRunning:0, completed:0, work:0, generated:0, processed:0 };
root.fixtureTrace=trace;
var defaults={frames:2,frame_chips:41285,oversample:8,max_delay_chips:768,pulse_halfspan_chips:16,scnr_db:20,seed:80211,rotation:'pi2',oscillator_hz:0,fs_hz:1760000000,carrier_hz:60000000000,stf_threshold:Math.sqrt(1/8),pfa_family:.001,fractional_phase:true};
function validateConfig(input){var c=Object.assign({},defaults,input);if(!Number.isInteger(c.frames)||c.frames<1||c.frames>64)throw Error('frames');if(![2,4,8].includes(c.oversample))throw Error('oversample');if(!Number.isInteger(c.max_delay_chips)||c.max_delay_chips<1||c.max_delay_chips>1024)throw Error('max_delay_chips');return c;}
function validateTargets(c,ts){for(var t of ts)if(!Number.isFinite(t.range_m)||!Number.isFinite(t.velocity_mps)||t.range_m<0||Math.abs(t.velocity_mps)>100000)throw Error('target');return ts.map(t=>Object.assign({gain:{real:1,imag:0}},t));}
function validateObservation(o){if(o.samples.length!==o.config.frames)throw Error('frames mismatch');var n=(3328+o.config.max_delay_chips+128+2*o.config.pulse_halfspan_chips)*o.config.oversample+1;for(var r of o.samples)if(r.real.length!==n||r.imag.length!==n)throw Error('row length');return o;}
function obs(c){var n=(3328+c.max_delay_chips+128+2*c.pulse_halfspan_chips)*c.oversample+1;var rows=Array.from({length:c.frames},()=>({real:new Float64Array(n),imag:new Float64Array(n)}));rows[0].real[0]=c.seed;return {config:c,samples:rows,noise_variance:1,start_chip:-c.pulse_halfspan_chips,pulse_noise_filter:new Float64Array([1]),provenance:{model:'fixture only',truth_in_receiver:false,synthetic:true,standard_compliance:false,pre_payload_only:true,noisy:true}};}
async function work(h,n,stage){trace.running++;trace.maxRunning=Math.max(trace.maxRunning,trace.running);try{for(var i=0;i<n;i++){await h.checkpoint(stage,i,n);trace.work++;}trace.completed++;}finally{trace.running--;}}
var api={validateConfig,validateTargets,validateObservation,budget:function(){},
 observationDigest:async function(){return 'fixture-sample-digest';},observationMetadataDigest:function(){return 'fixture-metadata-digest';},
 synthesize:async function(c,t,o){trace.generated++;if(c.seed===88888)throw Error('fixture failure');await work(o.hooks,c.seed===99999?10000:3,'synthesize');return obs(c);},
 process:async function(o,p,h){trace.processed++;await work(h,p.nfft===255?10000:4,'process');return {fixture:true,seed:o.config.seed,nfft:p.nfft,truth_in_receiver:false};},
 exportObservation:function(o){return {config:Object.assign({},o.config),samples:o.samples.map(r=>({real:Array.from(r.real),imag:Array.from(r.imag)})),noise_variance:o.noise_variance,start_chip:o.start_chip,pulse_noise_filter:Array.from(o.pulse_noise_filter),provenance:Object.assign({},o.provenance)};}
};root.AdReceiver=api;if(typeof module==='object')module.exports=api;
}(typeof globalThis!=='undefined'?globalThis:this));
`;
function browserVM(t, opts = {}) {
  const box = mailbox(), timers = new Set(), imports = []; let handler;
  const scope = {
    setTimeout(fn, ms) { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); return timer; },
    clearTimeout(timer) { clearTimeout(timer); timers.delete(timer); },
    postMessage: x => box.receive(structuredClone(x)),
    addEventListener(name, fn) { if (name === 'message') handler = fn; },
    TextEncoder, TextDecoder, performance
  };
  scope.self = scope; const context = vm.createContext(scope);
  scope.importScripts = (...urls) => {
    imports.push(...urls);
    if (opts.failImport) throw Error('fixture import failure');
    for (const url of urls) {
      const code = !opts.real && url.endsWith('/receiver.js') ? stub
        : !opts.real && url.endsWith('/sha256.js') ? ''
        : fs.readFileSync(path.resolve(root, 'worker', url), 'utf8');
      vm.runInContext(code, context, { filename: url });
    }
  };
  vm.runInContext(fs.readFileSync(entry, 'utf8'), context, { filename: entry });
  t.after(() => { for (const timer of timers) clearTimeout(timer); box.clear(); });
  return { ...box, context, imports, send: x => handler({ data: x }) };
}
async function nodeWorker(t, opts = {}) {
  let filename = entry, temp;
  if (opts.stub || opts.failImport) {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ad-worker-test-'));
    fs.mkdirSync(path.join(temp, 'worker')); fs.mkdirSync(path.join(temp, 'js'));
    for (const f of ['receiver-worker.js', 'protocol.js']) fs.copyFileSync(path.join(root, 'worker', f), path.join(temp, 'worker', f));
    if (opts.stub) fs.writeFileSync(path.join(temp, 'js/receiver.js'), stub);
    filename = path.join(temp, 'worker/receiver-worker.js');
  }
  const worker = new Worker(filename), box = mailbox();
  worker.on('message', box.receive); worker.on('error', e => box.receive({ type: 'transport-error', message: e.message }));
  t.after(async () => { box.clear(); await worker.terminate(); if (temp) fs.rmSync(temp, { recursive: true, force: true }); });
  const ready = await box.wait(e => e.type === 'ready');
  return { ...box, worker, ready, filename, send: x => worker.postMessage(x) };
}
async function generate(w, id = 'raw', c = config(), noise = false) {
  w.send({ type: 'generate', id, config: c, targets: [target()], noise });
  const e = await w.terminal(id); assert.equal(e.type, 'complete', JSON.stringify(e)); return e;
}
function oneTerminal(w, id, type) {
  const found = w.events.filter(e => e.id === id && terminalTypes.has(e.type) && !e.rejected);
  assert.equal(found.length, 1); assert.equal(found[0].type, type);
}
function noStale(w, id, boundary) {
  assert.equal(w.events.slice(boundary).some(e => e.id === id && ['progress', 'complete'].includes(e.type)), false);
}

test('classic browser loader VM: separate generation/process/export; truth is absent from held snapshot', async t => {
  const w = browserVM(t);
  assert.equal(w.events[0].ok, true);
  assert.deepEqual(w.imports, ['./protocol.js', '../js/sha256.js', '../js/receiver.js']);
  const generated = await generate(w);
  assert.equal(generated.result.observationId, 'raw'); assert.equal('samples' in generated.result, false);
  assert.equal('targets' in generated.result, false);
  for (const nfft of [2, 8]) {
    w.send({ type: 'process', id: 'p' + nfft, observationId: 'raw', options: { nfft } });
    assert.equal((await w.terminal('p' + nfft)).result.nfft, nfft);
  }
  w.send({ type: 'export', id: 'snapshot', observationId: 'raw' });
  const observation = (await w.terminal('snapshot')).result.observation;
  assert.equal(observation.provenance.truth_in_receiver, false);
  assert.equal(Object.keys(observation).some(k => /target|truth/.test(k)), false);
  observation.samples[0].real[0] = 0;
  w.send({ type: 'export', id: 'again', observationId: 'raw' });
  assert.equal((await w.terminal('again')).result.observation.samples[0].real[0], 80211);
  assert.equal(w.context.fixtureTrace.generated, 1); assert.equal(w.context.fixtureTrace.processed, 2);
});

test('classic loader VM: cancelling generation invalidates held state and the Worker remains reusable', async t => {
  const w = browserVM(t); await generate(w, 'prior');
  w.send({ type: 'generate', id: 'slow', config: config({ seed: 99999 }), targets: [target()] });
  await w.wait(e => e.id === 'slow' && e.type === 'progress');
  const boundary = w.events.length;
  w.send({ type: 'cancel', id: 'cancel-slow', targetId: 'slow' });
  assert.equal((await w.terminal('slow')).type, 'cancelled');
  assert.equal((await w.terminal('cancel-slow')).result.cancelled, true);
  w.send({ type: 'process', id: 'stale', observationId: 'prior' });
  assert.equal((await w.rejected('stale')).error.code, 'OBSERVATION_NOT_HELD');
  noStale(w, 'slow', boundary); oneTerminal(w, 'slow', 'cancelled');
  await generate(w, 'reusable');
});

test('classic loader VM: cancellation retains raw observation; burst supersession serializes all kernels', async t => {
  const w = browserVM(t); await generate(w);
  w.send({ type: 'process', id: 'p-old', observationId: 'raw', options: { nfft: 255 } });
  await w.wait(e => e.id === 'p-old' && e.type === 'progress');
  w.send({ type: 'cancel', id: 'cancel-p', targetId: 'p-old' });
  assert.equal((await w.terminal('p-old')).type, 'cancelled');
  w.send({ type: 'process', id: 'p-burst', observationId: 'raw', options: { nfft: 255 } });
  await w.wait(e => e.id === 'p-burst' && e.type === 'progress'); const boundary = w.events.length;
  for (let i = 0; i < 8; i++) w.send({ type: 'process', id: 'burst' + i, observationId: 'raw', options: { nfft: i + 2 } });
  assert.equal((await w.terminal('p-burst')).type, 'superseded');
  for (let i = 0; i < 7; i++) assert.equal((await w.terminal('burst' + i)).type, 'superseded');
  assert.equal((await w.terminal('burst7')).result.nfft, 9);
  assert.equal(w.context.fixtureTrace.maxRunning, 1); noStale(w, 'p-burst', boundary);
});

test('classic loader VM: release cancels processing, rejects stale observation, and consumes control IDs', async t => {
  const w = browserVM(t); await generate(w);
  w.send({ type: 'process', id: 'active', observationId: 'raw', options: { nfft: 255 } });
  await w.wait(e => e.id === 'active' && e.type === 'progress');
  w.send({ type: 'export', id: 'busy-export', observationId: 'raw' });
  assert.equal((await w.rejected('busy-export')).error.code, 'WORKER_BUSY');
  w.send({ type: 'release', id: 'release' });
  assert.equal((await w.terminal('release')).result.releasedObservationId, 'raw');
  assert.equal((await w.terminal('active')).reason, 'released');
  w.send({ type: 'export', id: 'stale', observationId: 'raw' });
  assert.equal((await w.rejected('stale')).error.code, 'OBSERVATION_NOT_HELD');
  w.send({ type: 'release', id: 'release' });
  assert.equal((await w.rejected('release')).error.code, 'REUSED_ID');
});

test('strict protocol: rejected malformed/oversized requests do not supersede a valid running job', async t => {
  const w = browserVM(t);
  w.send({ type: 'generate', id: 'good', config: config(), targets: [target()] });
  let poisonCalls = 0; const accessor = {}; Object.defineProperty(accessor, 'frames', { enumerable: true, get() { poisonCalls++; return 2; } });
  const cycle = {}; cycle.self = cycle;
  let deep = {}; for (let i = 0; i < 15; i++) deep = { deeper: deep };
  const invalid = [null, [], {}, { type: 'hello', id: 'unknown' }, { type: 'generate', id: 'bad id' },
    { type: 'generate', id: 'extra', config: config(), targets: [], truth: [] },
    { type: 'generate', id: 'config-extra', config: { ...config(), target_truth: [] }, targets: [] },
    { type: 'generate', id: 'target-extra', config: config(), targets: [{ ...target(), truth: [] }] },
    { type: 'generate', id: 'gain-extra', config: config(), targets: [{ ...target(), gain: { real: 1, imag: 0, phase: 0 } }] },
    { type: 'generate', id: 'many', config: config(), targets: Array.from({ length: 9 }, target) },
    { type: 'generate', id: 'noise', config: config(), targets: [], noise: 'true' },
    { type: 'generate', id: 'infinite', config: { ...config(), scnr_db: Infinity }, targets: [] },
    { type: 'generate', id: 'cycle', config: cycle, targets: [] },
    { type: 'generate', id: 'deep', config: deep, targets: [] },
    { type: 'generate', id: 'string', config: { ...config(), rotation: 'a'.repeat(2048) }, targets: [] },
    { type: 'generate', id: 'accessor', config: accessor, targets: [] },
    { type: 'generate', id: 'samples', config: config({ frames: 64, oversample: 8, max_delay_chips: 1024 }), targets: [] },
    { type: 'cancel', id: 'cancel-missing' }, { type: 'release', id: 'release-extra', observationId: 'x' }];
  for (const input of invalid) w.send(input);
  assert.equal(w.events.filter(e => e.rejected).length, invalid.length);
  assert.equal(poisonCalls, 0);
  assert.equal((await w.terminal('good')).type, 'complete');
  w.send({ type: 'generate', id: 'good', config: config(), targets: [] });
  assert.equal((await w.rejected('good')).error.code, 'REUSED_ID'); oneTerminal(w, 'good', 'complete');
});

test('strict import: truth, metadata extensions, malformed samples, and stale IDs are rejected', async t => {
  const w = browserVM(t); await generate(w);
  w.send({ type: 'export', id: 'snapshot', observationId: 'raw' });
  const base = (await w.terminal('snapshot')).result.observation;
  const invalid = [o => { o.truth_evaluation_only = []; }, o => { o.provenance.truth_in_receiver = true; },
    o => { o.provenance.target_range = 1; }, o => { o.samples[0].truth = true; },
    o => { o.samples[0].real[0] = NaN; }, o => { o.samples.pop(); }, o => { o.samples[0].imag.pop(); }];
  for (let i = 0; i < invalid.length; i++) {
    const o = structuredClone(base); invalid[i](o); w.send({ type: 'import', id: 'bad' + i, observation: o }); await w.rejected('bad' + i);
  }
  w.send({ type: 'process', id: 'unchanged', observationId: 'raw' });
  assert.equal((await w.terminal('unchanged')).result.nfft, 2);
  w.send({ type: 'import', id: 'restored', observation: base });
  assert.equal((await w.terminal('restored')).result.observationId, 'restored');
  w.send({ type: 'process', id: 'old-id', observationId: 'raw' });
  assert.equal((await w.rejected('old-id')).error.code, 'OBSERVATION_NOT_HELD');
});

test('strict protocol standalone: typed views, shared buffers, sparse arrays, depth, and limits', () => {
  assert.throws(() => Protocol.preflight(new Uint8Array(1)), /Float64Array/);
  assert.throws(() => Protocol.preflight(new Float64Array(new SharedArrayBuffer(8))), /nonshared/);
  assert.throws(() => Protocol.preflight(new Array(2)), /dense/);
  const a = [1]; a.extra = true; assert.throws(() => Protocol.preflight(a), /additional/);
  const child = {}; assert.throws(() => Protocol.preflight({ a: child, b: child }), /shared/);
  assert.throws(() => Protocol.validateOptions({ nfft: 256 }, { frames: 64, max_delay_chips: 1024 }), /map-cell/);
  assert.throws(() => Protocol.validateOptions({ nfft: 1 }, { frames: 2, max_delay_chips: 8 }), /nfft/);
  assert.throws(() => Protocol.validateOptions({ max_wall_ms: 9 }, { frames: 2, max_delay_chips: 8 }), /max_wall_ms/);
  for (const options of [{ stf_threshold: 1 }, { pfa_family: 0 }, { fractional_phase: 'false' }])
    assert.throws(() => Protocol.validateOptions(options, { frames: 2, max_delay_chips: 8 }), { code: 'INVALID_OPTIONS' });
});

test('actual Node worker_threads: prompt cancellation, supersession, raw-state preservation, wall deadline, and errors', async t => {
  const w = await nodeWorker(t, { stub: true }); assert.equal(w.ready.ok, true);
  w.send({ type: 'generate', id: 'slow', config: config({ seed: 99999 }), targets: [] });
  await w.wait(e => e.id === 'slow' && e.type === 'progress');
  const started = Date.now(); w.send({ type: 'cancel', id: 'cancel', targetId: 'slow' });
  assert.equal((await w.terminal('slow')).type, 'cancelled'); assert.ok(Date.now() - started < 2000);
  await generate(w);
  w.send({ type: 'process', id: 'old', observationId: 'raw', options: { nfft: 255 } });
  await w.wait(e => e.id === 'old' && e.type === 'progress');
  w.send({ type: 'process', id: 'latest', observationId: 'raw', options: { nfft: 3 } });
  assert.equal((await w.terminal('old')).type, 'superseded'); assert.equal((await w.terminal('latest')).result.nfft, 3);
  w.send({ type: 'process', id: 'deadline', observationId: 'raw', options: { nfft: 255, max_wall_ms: 10 } });
  assert.equal((await w.terminal('deadline')).error.code, 'TIME_LIMIT');
  w.send({ type: 'generate', id: 'throws', config: config({ seed: 88888 }), targets: [] });
  assert.equal((await w.terminal('throws')).error.code, 'KERNEL_ERROR');
  await generate(w, 'after-failure');
});

test('Node and classic-loader VM: import failure is explicit and requests cannot hang', async t => {
  const browser = browserVM(t, { failImport: true });
  assert.equal(browser.events[0].ok, false);
  browser.send({ type: 'generate', id: 'missing', config: {}, targets: [] });
  assert.equal((await browser.rejected('missing')).error.code, 'KERNEL_LOAD_FAILED');
  const node = await nodeWorker(t, { failImport: true }); assert.equal(node.ready.ok, false);
  node.send({ type: 'generate', id: 'missing', config: {}, targets: [] });
  assert.equal((await node.rejected('missing')).error.code, 'KERNEL_LOAD_FAILED');
});

test('actual Node Worker client: cancellation, progress observer faults, release, termination, and restart', async t => {
  const w = await nodeWorker(t, { stub: true });
  const client = new Client(w.worker, { createWorker: () => new Worker(w.filename), onEvent() {} }); t.after(() => client.dispose());
  const first = client.generate(config(), [target()], { id: 'first', onProgress() { throw Error('observer'); } });
  assert.equal((await first.result).type, 'complete');
  const processing = client.process('first', { nfft: 255 }, { id: 'processing' });
  await w.wait(e => e.id === 'processing' && e.type === 'progress');
  assert.equal(processing.cancel(), true); assert.equal((await processing.result).type, 'cancelled');
  const release = client.release(); assert.equal((await release.result).type, 'complete');
  assert.throws(() => client.release({ id: 'first' }), { code: 'REUSED_ID' });
  const active = client.generate(config({ seed: 99999 }), [], { id: 'restart-me' });
  await client.restart(); assert.equal((await active.result).reason, 'client-restarted');
  assert.equal((await client.ready).ok, true);
  const fresh = client.generate(config(), [], { id: 'first' }); assert.equal((await fresh.result).type, 'complete');
  await client.dispose(); assert.equal(client.pending.size, 0); assert.throws(() => client.release(), { code: 'CLIENT_DISPOSED' });
});

test('client independently suppresses queued cancelled/superseded results; release wins over queued completion', async t => {
  class FakeWorker extends EventEmitter { postMessage() {} async terminate() {} }
  const worker = new FakeWorker(), visible = [], client = new Client(worker, { onEvent: e => visible.push(e) }); t.after(() => client.dispose());
  const old = client.generate(config(), []), fresh = client.generate(config(), []);
  worker.emit('message', { type: 'accepted', id: fresh.id });
  visible.length = 0;
  worker.emit('message', { type: 'progress', id: old.id, progress: { stale: true } });
  worker.emit('message', { type: 'complete', id: old.id, result: { stale: true } });
  assert.equal((await old.result).type, 'superseded'); assert.equal(visible.length, 0);
  fresh.cancel(); worker.emit('message', { type: 'complete', id: fresh.id, result: { late: true } });
  assert.equal((await fresh.result).type, 'cancelled');
  const pending = client.generate(config(), []); const released = client.release();
  worker.emit('message', { type: 'complete', id: pending.id, result: { late: true } });
  assert.equal((await pending.result).reason, 'released');
  worker.emit('message', { type: 'complete', id: released.id, result: {} }); await released.result;
  const dies = client.generate(config(), []); const checked = assert.rejects(dies.result, { code: 'WORKER_EXITED' });
  worker.emit('exit', 1); await checked; assert.equal(client.pending.size, 0);
});

test('browser client UMD branch: event listeners detach and cancellation transport errors settle pending work', async t => {
  const listeners = new Map(); let terminated = false, count = 0;
  const worker = { postMessage() { if (++count > 1) throw Error('closed'); },
    addEventListener(n, f) { listeners.set(n, f); }, removeEventListener(n, f) { if (listeners.get(n) === f) listeners.delete(n); }, terminate() { terminated = true; } };
  const context = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(root, 'worker/client.js'), 'utf8'), context);
  const client = new context.AdWorkerClient(worker); t.after(() => client.dispose());
  const task = client.generate(config(), []), checked = assert.rejects(task.result, { code: 'POST_MESSAGE_FAILED' });
  task.cancel(); await checked; await client.dispose(); assert.equal(terminated, true); assert.equal(listeners.size, 0);
});

test('client causality: rejected newer requests preserve accepted work, including queued older completion', async t => {
  class FakeWorker extends EventEmitter { postMessage() {} async terminate() {} }
  for (const completeFirst of [false, true]) {
    const worker = new FakeWorker(), visible = [], client = new Client(worker, { onEvent: e => visible.push(e) });
    t.after(() => client.dispose());
    const old = client.generate(config(), [], { id: 'valid' });
    worker.emit('message', { type: 'accepted', id: old.id });
    const bad = client.generate(config({ frames: 0 }), [], { id: 'invalid' });
    const rejection = assert.rejects(bad.result, { code: 'INVALID_INPUT' });
    if (completeFirst) worker.emit('message', { type: 'complete', id: old.id, result: { valid: true } });
    worker.emit('message', { type: 'error', id: bad.id, rejected: true, error: { code: 'INVALID_INPUT', message: 'frames' } });
    await rejection;
    if (!completeFirst) worker.emit('message', { type: 'complete', id: old.id, result: { valid: true } });
    assert.equal((await old.result).type, 'complete');
    assert.equal(visible.some(e => e.id === old.id && e.type === 'complete'), true);
  }
});

test('client causality: accepted newer requests suppress deferred completion; cancel/release settle it exactly once', async t => {
  class FakeWorker extends EventEmitter { postMessage() {} async terminate() {} }
  for (const action of ['accepted', 'cancel', 'release']) {
    const worker = new FakeWorker(), client = new Client(worker); t.after(() => client.dispose());
    const old = client.generate(config(), []); worker.emit('message', { type: 'accepted', id: old.id });
    const next = client.generate(config(), []);
    worker.emit('message', { type: 'complete', id: old.id, result: { stale: true } });
    if (action === 'accepted') worker.emit('message', { type: 'accepted', id: next.id });
    if (action === 'cancel') old.cancel();
    if (action === 'release') client.release();
    assert.equal((await old.result).type, action === 'accepted' ? 'superseded' : 'cancelled');
  }
});

test('actual Node client: invalid newer processing request cannot strand a valid active processing promise', async t => {
  const w = await nodeWorker(t, { stub: true }), client = new Client(w.worker); t.after(() => client.dispose());
  const raw = client.generate(config(), []); await raw.result;
  const old = client.process(raw.id, { nfft: 255 }); await w.wait(e => e.id === old.id && e.type === 'progress');
  const bad = client.process(raw.id, { nfft: 257 }); await assert.rejects(bad.result, { code: 'INVALID_OPTIONS' });
  assert.equal(client.currentId, old.id);
  old.cancel(); assert.equal((await old.result).type, 'cancelled');
});

test('client restart attaches an explicit new Worker before waiting on delayed old termination', async t => {
  class FakeWorker extends EventEmitter {
    postMessage() {}
    async terminate() { await sleep(30); }
  }
  const previous = new FakeWorker(), next = new FakeWorker(), client = new Client(previous); t.after(() => client.dispose());
  const restarting = client.restart(next);
  next.emit('message', { type: 'ready', ok: true });
  await restarting; assert.equal((await client.ready).ok, true);
});

const realAvailable = fs.existsSync(path.join(root, 'js/receiver.js'));
if (process.argv.includes('--require-core') && !realAvailable) throw Error('Real receiver.js missing; core coverage cannot be skipped');
test('actual Node Worker real numerical core: fresh generation, process, raw export/import, and superseded cancellation', { skip: !realAvailable }, async t => {
  const w = await nodeWorker(t); assert.equal(w.ready.ok, true, JSON.stringify(w.ready));
  const generated = await generate(w, 'native-raw', config({ max_delay_chips: 16 }), true);
  assert.equal(generated.result.complexSamples > 0, true);
  w.send({ type: 'process', id: 'native-process', observationId: 'native-raw', options: { nfft: 4 } });
  const result = await w.terminal('native-process', 30000); assert.equal(result.type, 'complete', JSON.stringify(result));
  assert.equal(result.result.provenance.truth_in_receiver, false);
  assert.equal(typeof result.result.provenance.observation_sha256, 'string');
  w.send({ type: 'process', id: 'native-policy', observationId: 'native-raw', options: {
    nfft: 4, stf_threshold: 1 - Number.EPSILON, pfa_family: 0.05, fractional_phase: false } });
  const policy = await w.terminal('native-policy', 30000); assert.equal(policy.type, 'complete', JSON.stringify(policy));
  assert.equal(policy.result.provenance.observation_sha256, result.result.provenance.observation_sha256);
  assert.equal(policy.result.provenance.observation_metadata_sha256, result.result.provenance.observation_metadata_sha256);
  assert.deepEqual(policy.result.provenance.processing_overrides, { stf_threshold: 1 - Number.EPSILON, pfa_family: 0.05, fractional_phase: false });
  assert.equal(policy.result.acquisition.accepted, false);
  w.send({ type: 'export', id: 'native-export', observationId: 'native-raw' });
  const exported = await w.terminal('native-export'); assert.equal(exported.type, 'complete');
  assert.equal(exported.result.schema, '80211ad-raw-observation-v1');
  assert.equal(exported.result.observation_sha256, result.result.provenance.observation_sha256);
  assert.equal(exported.result.observation_metadata_sha256, result.result.provenance.observation_metadata_sha256);
  assert.equal(exported.result.observation.config.fractional_phase, true);
  const snapshot = JSON.parse(JSON.stringify(exported.result.observation));
  const expected_hashes = { observation_sha256: exported.result.observation_sha256, observation_metadata_sha256: exported.result.observation_metadata_sha256 };
  w.send({ type: 'import', id: 'native-import', observation: snapshot, expected_hashes });
  assert.equal((await w.terminal('native-import')).type, 'complete');
  w.send({ type: 'process', id: 'native-replay', observationId: 'native-import', options: { nfft: 4 } });
  const replay = await w.terminal('native-replay', 30000); assert.equal(replay.type, 'complete', JSON.stringify(replay));
  // Runtime duration is measured anew and is intentionally not replay data.
  delete replay.result.resources.elapsed_ms; delete result.result.resources.elapsed_ms;
  assert.deepEqual(replay.result, result.result);
  const corrupt = structuredClone(snapshot); corrupt.samples[0].real[0] += 0.1;
  w.send({ type: 'import', id: 'native-corrupt', observation: corrupt, expected_hashes });
  assert.equal((await w.terminal('native-corrupt')).error.code, 'HASH_MISMATCH');
  w.send({ type: 'process', id: 'native-after-corrupt', observationId: 'native-import' });
  assert.equal((await w.rejected('native-after-corrupt')).error.code, 'OBSERVATION_NOT_HELD');
  const changedMetadata = structuredClone(snapshot); changedMetadata.config.seed += 1;
  w.send({ type: 'import', id: 'native-metadata-corrupt', observation: changedMetadata, expected_hashes });
  assert.equal((await w.terminal('native-metadata-corrupt')).error.code, 'HASH_MISMATCH');
  w.send({ type: 'generate', id: 'native-slow', config: config({ frames: 32, oversample: 8, max_delay_chips: 768, pulse_halfspan_chips: 16 }), targets: [target()] });
  await w.wait(e => e.id === 'native-slow' && e.type === 'progress', 30000);
  w.send({ type: 'generate', id: 'native-new', config: config({ frames: 1 }), targets: [], noise: false });
  assert.equal((await w.terminal('native-slow', 30000)).type, 'superseded');
  assert.equal((await w.terminal('native-new', 30000)).type, 'complete');
  oneTerminal(w, 'native-slow', 'superseded');
});

test('classic browser loader VM with real core: smoke only, no browser/performance claim', { skip: !realAvailable }, async t => {
  const w = browserVM(t, { real: true }); assert.equal(w.events[0].ok, true, JSON.stringify(w.events[0]));
  await generate(w, 'browser-native', config({ frames: 1 }));
  w.send({ type: 'process', id: 'browser-process', observationId: 'browser-native' });
  const e = await w.terminal('browser-process', 30000); assert.equal(e.type, 'complete', JSON.stringify(e));
  assert.equal(e.result.map, null);
});
