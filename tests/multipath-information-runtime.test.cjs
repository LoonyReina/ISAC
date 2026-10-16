'use strict';
// Current-code regression tests, portable between authored and compatibility layouts.
// Adapted from the accepted lesson controller/view suite and independent lifecycle
// checks. Controlled Workers and the small DOM adapter below test ownership only:
// they are not browser/layout/timing evidence or an independent numerical oracle.
const {test, before} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

const root = path.resolve(__dirname, '..');
const sourceLayout = fs.existsSync(path.join(root, 'labs/channel-geometry/multipath-information-controller.mjs'));
const runtimeRoot = sourceLayout ? path.join(root, 'labs/channel-geometry') : root;
const page = fs.readFileSync(path.join(root, sourceLayout ? 'content/pages/multipath-channel.html' : 'multipath-channel.html'), 'utf8');
const lesson = page.match(/<!-- MULTIPATH-INFORMATION:START -->([\s\S]*?)<!-- MULTIPATH-INFORMATION:END -->/)?.[1];
const load = name => import(pathToFileURL(path.join(runtimeRoot, name)).href);
const turn = () => new Promise(resolve => setImmediate(resolve));
let core, createChannel, createLessonController, mountLesson, views, defaultRecord, boundaryRecord, phaseRecord;

before(async () => {
  [core, {createChannel, createLessonController}, {mountLesson}, views] = await Promise.all([
    load('multipath-information-core/multipath-fisher-core.mjs'),
    load('multipath-information-controller.mjs'),
    load('multipath-information-ui.mjs'),
    load('multipath-information-views.mjs'),
  ]);
  // Three current-core white-noise scenes replace the external 5.5 MiB preset fixture.
  defaultRecord = core.computeScene(core.DEFAULT_INPUT, {requestId: 'runtime-default'});
  boundaryRecord = core.computeScene({...core.DEFAULT_INPUT, heightM: 0}, {requestId: 'runtime-boundary'});
  phaseRecord = core.computeScene({...core.DEFAULT_INPUT, phaseRad: Math.PI}, {requestId: 'runtime-phase'});
  assert.equal(defaultRecord.status, 'finite');
  assert.equal(phaseRecord.status, 'finite');
});

function controlledWorkers() {
  const workers = [];
  function workerFactory() {
    const worker = {
      dead: false,
      postMessage(message) { this.message = message; },
      terminate() { this.dead = true; },
    };
    workers.push(worker);
    return worker;
  }
  function message(worker, type, payload, requestId = worker.message.requestId) {
    worker.onmessage({data: {type, requestId, ...payload}});
  }
  const reply = (worker, record) => message(worker, 'result', {record: {...record, recordId: worker.message.requestId}});
  const progress = (worker, index, record) => message(worker, 'progress', {progress: {index, record}});
  const latest = type => workers.findLast(worker => !worker.dead && worker.message.type === type);
  return {workers, workerFactory, message, reply, progress, latest};
}

// Reusing a record under another input is confined to transport/ownership checks.
// No scientific assertion relies on these synthetic records.
const synthetic = (input, id = 'synthetic-ownership-only') => ({...defaultRecord, input: {...input}, recordId: id});
const syntheticSweep = input => ({
  schemaVersion: 'multipath-position-information.sweep.v1', input: {...input},
  status: 'complete', partial: false, completed: core.HEIGHTS.length, total: core.HEIGHTS.length,
  records: core.HEIGHTS.map(heightM => synthetic({...input, heightM})),
});
function controllerHarness(t, options = {}) {
  const transport = controlledWorkers();
  const controller = createLessonController({core, workerFactory: transport.workerFactory, ...options});
  t.after(() => controller.dispose());
  return {...transport, controller};
}

function domHarness(t) {
  assert.ok(lesson, 'the current page contains the isolated lesson');
  const element = id => ({
    id, disabled: true, hidden: false, checked: false, value: '', files: [],
    textContent: '', innerHTML: '', dataset: {}, attrs: {}, events: {}, clientWidth: 620,
    addEventListener(type, fn) { this.events[type] = fn; },
    setAttribute(name, value) { this.attrs[name] = String(value); },
  });
  const nodes = new Map([...lesson.matchAll(/\bid="(mpi-[^"]+)"/g)].map(([, id]) => [id, element(id)]));
  const phases = [...lesson.matchAll(/<input\b[^>]*name="mpi-phase"[^>]*>/g)].map(([tag]) => ({
    ...element('phase'), value: tag.match(/\bvalue="([^"]+)"/)[1], checked: /\bchecked\b/.test(tag),
  }));
  const attributeNodes = (attribute, datasetKey) => [...lesson.matchAll(new RegExp(`<button\\b[^>]*${attribute}="([^"]+)"[^>]*>`, 'g'))]
    .map(([, value]) => ({...element(attribute), dataset: {[datasetKey]: value}}));
  const viewButtons = attributeNodes('data-mpi-view', 'mpiView');
  const presetButtons = attributeNodes('data-mpi-preset', 'mpiPreset');
  nodes.get('mpi-height').value = '0.5';
  nodes.get('mpi-noise').value = 'white';
  nodes.get('mpi-near').checked = true;
  nodes.get('mpi-prompt').value = 'ordering';
  nodes.get('mpi-prediction-answer').hidden = true;
  const transport = controlledWorkers(), listeners = new Map(), events = [];
  const globals = Object.fromEntries(['window', 'Worker', 'requestAnimationFrame'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const restore = () => {
    for (const [key, descriptor] of Object.entries(globals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  };
  let mounted;
  t.after(() => {
    try { mounted?.dispose(); } finally { restore(); }
  });
  globalThis.window = {
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); },
  };
  globalThis.Worker = class { constructor() { return transport.workerFactory(); } };
  globalThis.requestAnimationFrame = () => 0; // Deliberately no synthetic paint/latency assertion.
  const domRoot = {
    dataset: {},
    querySelector(query) {
      if (query === 'input[name="mpi-phase"]:checked') return phases.find(p => p.checked);
      return nodes.get(query.slice(1));
    },
    querySelectorAll(query) {
      if (query.includes('mpi-phase')) return phases;
      if (query === '[data-mpi-view]') return viewButtons;
      if (query === '[data-mpi-preset]') return presetButtons;
      if (query === 'button,input,select') return [...nodes.values(), ...phases, ...viewButtons, ...presetButtons];
      return [];
    },
    dispatchEvent(event) { events.push(event); },
  };
  mounted = mountLesson(domRoot);
  return {nodes, phases, viewButtons, presetButtons, listeners, events, root: domRoot, mounted, ...transport};
}

// Pure view and current-core contracts.
test('all typed scientific states explain their distinct failure or pending condition', () => {
  for (const status of ['finite', 'pending', 'idle', 'invalid-input', 'singular-nuisance-block',
    'numerically-unresolved-nuisance', 'numerically-unresolved-position', 'unidentifiable-position',
    'covariance-factorization-failed', 'singular-clock-nuisance', 'not-computed', 'cancelled', 'error']) {
    assert.notEqual(views.statusText(status), '结果尚未通过检查', status);
    assert.equal(views.statusText({status}), views.statusText(status));
  }
  assert.match(views.statusText('singular-nuisance-block'), /复增益参数化/);
  assert.match(views.statusText('numerically-unresolved-position'), /当前精度/);
});

test('zero records never claim that both computed branches are finite', () => {
  for (const records of [[], [null, undefined], new Array(10)]) {
    assert.match(views.sweepGaps(records), /尚无已计算点/);
    assert.doesNotMatch(views.sweepGaps(records), /两分支均为有限值/);
  }
  assert.match(views.sweepGaps([defaultRecord]), /已计算点的两分支均为有限值/);
  assert.match(views.sweepGaps([boundaryRecord]), /data-mpi-gap="0:exact"/);
  assert.match(views.sweepGaps([boundaryRecord]), /复增益参数化/);
});

test('current core keeps h=0 typed and null rather than inventing a finite exact bound', () => {
  assert.equal(boundaryRecord.validatedDomain, true);
  assert.equal(boundaryRecord.status, 'singular-nuisance-block');
  assert.equal(boundaryRecord.exact.status, 'singular-nuisance-block');
  assert.equal(boundaryRecord.exact.pebM, null);
  assert.equal(boundaryRecord.exact.ellipse, null);
  assert.equal(boundaryRecord.approximate.status, 'finite');
  assert.ok(boundaryRecord.approximate.pebM > 0);
  assert.match(views.conclusion(boundaryRecord), /不意味着所有物理位置信息为零/);
});

test('ellipse shares one metric scale and omits the singular exact branch', () => {
  const output = views.ellipsePlot(defaultRecord);
  assert.match(output.html, /data-mpi-equal-scale="true"/);
  assert.match(output.html, /data-mpi-ellipse="exact"/);
  assert.match(output.html, /data-mpi-ellipse="approximate"/);
  assert.ok(output.extent > Math.max(...defaultRecord.exact.ellipse.semiaxesM, ...defaultRecord.approximate.ellipse.semiaxesM));
  const boundary = views.ellipsePlot(boundaryRecord).html;
  assert.doesNotMatch(boundary, /data-mpi-ellipse="exact"/);
  assert.match(boundary, /data-mpi-ellipse="approximate"/);
  assert.doesNotMatch(views.ellipsePlot(null).html, /data-mpi-ellipse=/);
});

test('sweep presentation uses log-metre points and breaks line segments at typed null gaps', () => {
  const records = [.01, .05, .1].map(heightM => synthetic({...core.DEFAULT_INPUT, heightM}));
  records[1] = {...records[1], exact: {status: 'unidentifiable-position', pebM: null}};
  const html = views.sweepPlot(records, {heightM: .1});
  assert.match(html, /data-mpi-log="true"/);
  assert.match(html, /PEB \/ m/);
  assert.match(html, /data-mpi-height="0.1"/);
  assert.match(html, /tabindex="0" role="button"/);
  assert.doesNotMatch(html, /<path/);
  assert.equal((html.match(/class="mpi-exact" fill="none"/g) || []).length, 2);
  assert.match(views.sweepGaps(records), /data-mpi-gap="0.05:exact"/);
  assert.match(views.sweepPlot([], {pending: true}), /正在计算 10 个指定场景/);
});

test('actual phase intervention preserves sampled templates but changes complex mean', () => {
  assert.deepEqual(phaseRecord.geometry.tauNs, defaultRecord.geometry.tauNs);
  assert.deepEqual(phaseRecord.samples.pulseTemplates, defaultRecord.samples.pulseTemplates);
  assert.notDeepEqual(phaseRecord.samples.complexMean, defaultRecord.samples.complexMean);
  const sameId = {...phaseRecord, recordId: defaultRecord.recordId};
  assert.equal(views.pulsePlot(defaultRecord), views.pulsePlot(sameId));
  assert.notEqual(views.pulsePlot(defaultRecord, true), views.pulsePlot(sameId, true));
  assert.match(views.conclusion(defaultRecord), /略低于/);
  assert.match(views.conclusion(defaultRecord), /不是通用上界或下界/);
});

test('actual core replay recomputes saved matrices and PEB, preserving only validated inputs', async () => {
  const saved = structuredClone(defaultRecord);
  saved.exact.pebM = 123456;
  saved.exact.efim = [[123456, 0], [0, 123456]];
  saved.samples.pulseTemplates[0][0] = 123456;
  const replayed = await core.replayRecord(core.exportRecord(saved), {requestId: 'runtime-replay', yieldTask: async () => {}});
  assert.equal(replayed.status, 'finite');
  assert.deepEqual(replayed.input, core.DEFAULT_INPUT);
  assert.equal(replayed.recordId, 'runtime-replay');
  assert.equal(replayed.replayOf, defaultRecord.recordId);
  assert.equal(replayed.exact.pebM, defaultRecord.exact.pebM);
  assert.deepEqual(replayed.exact.efim, defaultRecord.exact.efim);
  assert.deepEqual(replayed.samples.pulseTemplates, defaultRecord.samples.pulseTemplates);
});

test('actual core rejects off-grid inputs, changed resources/versions, and malformed replay JSON', async () => {
  for (const mutate of [
    record => { record.input.heightM = .333; },
    record => { record.input.phaseRad = .2; },
    record => { record.input.noiseMode = 'custom'; },
    record => { record.resource.N0 = 99; },
    record => { record.coreVersion = 'unreviewed'; },
  ]) {
    const record = structuredClone(defaultRecord); mutate(record);
    const rejected = await core.replayRecord(record);
    assert.equal(rejected.status, 'invalid-input');
    assert.equal(rejected.validatedDomain, false);
    assert.equal(rejected.exact.pebM, null);
    assert.equal(rejected.approximate.pebM, null);
  }
  assert.equal((await core.replayRecord('{x')).status, 'invalid-input');
});

// Controller transport and lifecycle ownership; no real Worker scheduling claimed.
test('selection invalidates synchronously, newer scene wins, and only matching sweeps survive', async t => {
  const h = controllerHarness(t), c = h.controller;
  const first = c.select(core.DEFAULT_INPUT);
  h.reply(h.latest('scene'), defaultRecord); await first;
  const firstSweep = h.latest('sweep');
  h.reply(firstSweep, syntheticSweep(core.DEFAULT_INPUT)); await turn();
  const sweepId = c.getState().sweep.recordId;
  const stale = c.select({...core.DEFAULT_INPUT, heightM: .1});
  const staleWorker = h.latest('scene');
  assert.equal(c.getState().current, null);
  assert.equal(c.getState().status, 'pending');
  assert.equal(c.getState().sweep.recordId, sweepId);
  const newest = c.select({...core.DEFAULT_INPUT, heightM: 4});
  assert.equal(await stale, null);
  assert.equal(staleWorker.dead, true);
  h.reply(staleWorker, synthetic({...core.DEFAULT_INPUT, heightM: .1}));
  assert.equal(c.getState().current, null);
  h.reply(h.latest('scene'), synthetic({...core.DEFAULT_INPUT, heightM: 4})); await newest;
  assert.equal(c.getState().current.input.heightM, 4);
  assert.equal(c.getState().sweep.recordId, sweepId);
  const changed = c.select({...core.DEFAULT_INPUT, phaseRad: Math.PI});
  assert.equal(c.getState().sweep, null);
  assert.deepEqual(c.getState().progress, []);
  h.reply(h.latest('scene'), phaseRecord); await changed;
  assert.notEqual(h.latest('sweep'), firstSweep);
});

test('cancel retains inputs but rejects stale scene, progress and complete sweep messages', async t => {
  const h = controllerHarness(t), c = h.controller;
  const selected = c.select(core.DEFAULT_INPUT);
  h.reply(h.latest('scene'), defaultRecord); await selected;
  const sweep = h.latest('sweep');
  h.progress(sweep, 0, boundaryRecord);
  assert.equal(c.getState().progress.length, 1);
  const pending = c.select({...core.DEFAULT_INPUT, heightM: .1});
  const scene = h.latest('scene');
  c.cancel();
  assert.equal(await pending, null);
  h.reply(scene, synthetic({...core.DEFAULT_INPUT, heightM: .1}));
  h.progress(sweep, 1, defaultRecord);
  h.reply(sweep, syntheticSweep(core.DEFAULT_INPUT)); await turn();
  const state = c.getState();
  assert.equal(state.status, 'cancelled');
  assert.equal(state.input.heightM, .1);
  assert.equal(state.current, null);
  assert.equal(state.sweep, null);
  assert.deepEqual(state.progress, []);
  assert.ok(h.workers.every(worker => worker.dead));
});

test('channel ignores wrong request IDs and replaced workers, and terminates each owner', async t => {
  const h = controlledWorkers(), channel = createChannel(core, {workerFactory: h.workerFactory});
  t.after(() => channel.dispose());
  const one = channel.run('scene', core.DEFAULT_INPUT);
  const two = channel.run('scene', {...core.DEFAULT_INPUT, heightM: 4});
  assert.equal(await one, null);
  assert.equal(h.workers[0].dead, true);
  let finished = false; two.then(() => { finished = true; });
  h.message(h.workers[1], 'result', {record: {wrong: true}}, 'not-current');
  h.message(h.workers[0], 'result', {record: {stale: true}}); await turn();
  assert.equal(finished, false);
  h.message(h.workers[1], 'result', {record: {newest: true}});
  assert.deepEqual(await two, {newest: true});
  assert.equal(h.workers[1].dead, true);
});

test('different-input sweep replay progress stays nondrawable until ownership transfers', async t => {
  const published = [], h = controllerHarness(t, {onState: state => published.push(state)}), c = h.controller;
  const incoming = {...core.DEFAULT_INPUT, phaseRad: Math.PI / 2, noiseMode: 'colored'};
  const pending = c.replay('{}'), replayWorker = h.latest('replay');
  h.progress(replayWorker, 0, synthetic({...incoming, heightM: 0}));
  h.progress(replayWorker, 1, synthetic({...incoming, heightM: .01}));
  assert.equal(c.getState().sweepStatus, 'replaying');
  assert.deepEqual(c.getState().input, core.DEFAULT_INPUT);
  assert.equal(c.getState().current, null);
  assert.equal(c.getState().sweep, null);
  assert.ok(published.every(state => state.progress.length === 0));
  assert.doesNotMatch(views.sweepPlot(c.getState().progress), /data-mpi-height=/);
  h.reply(replayWorker, syntheticSweep(incoming)); await pending;
  assert.deepEqual(c.getState().input, incoming);
  assert.equal(c.getState().sweepStatus, 'complete');
  assert.equal(c.getState().progress.length, core.HEIGHTS.length);
  assert.deepEqual(c.getState().current.input, incoming);
});

test('a newer selection prevents replay progress and results from changing visible input', async t => {
  const h = controllerHarness(t), c = h.controller;
  const incoming = {...core.DEFAULT_INPUT, phaseRad: Math.PI / 2, noiseMode: 'colored'};
  const replay = c.replay('{}'), replayWorker = h.latest('replay');
  h.progress(replayWorker, 0, synthetic({...incoming, heightM: 0}));
  const selected = c.select({...core.DEFAULT_INPUT, heightM: 4});
  assert.equal(await replay, null);
  h.progress(replayWorker, 1, synthetic({...incoming, heightM: .01}));
  h.reply(replayWorker, syntheticSweep(incoming));
  assert.equal(c.getState().input.heightM, 4);
  assert.deepEqual(c.getState().progress, []);
  assert.equal(c.getState().sweep, null);
  h.reply(h.latest('scene'), synthetic({...core.DEFAULT_INPUT, heightM: 4})); await selected;
  assert.equal(c.getState().current.input.heightM, 4);
  assert.equal(c.getState().input.noiseMode, 'white');
});

for (const ending of ['pagehide', 'dispose']) {
  test(`${ending} invalidates a deferred file read before it can create a replay worker`, async t => {
    const h = domHarness(t); let finishRead;
    h.nodes.get('mpi-import').files = [{size: 2, text: () => new Promise(resolve => { finishRead = resolve; })}];
    const pending = h.nodes.get('mpi-import').events.change();
    assert.equal(h.workers.length, 1);
    if (ending === 'pagehide') h.listeners.get('pagehide')();
    else h.mounted.dispose();
    finishRead('{}'); await pending; await turn();
    assert.equal(h.workers.length, 1);
    assert.ok(h.workers.every(worker => worker.dead));
    assert.equal(h.mounted.controller.getState().current, null);
    if (ending === 'dispose') assert.equal(h.listeners.size, 0);
  });
}

test('h=0 controls, singular display, prediction clearing and rejected-import cleanup agree', async t => {
  const h = domHarness(t);
  assert.equal(h.root.dataset.mpiState, 'pending');
  assert.equal(h.nodes.get('mpi-download-scene').disabled, true);
  assert.match(h.nodes.get('mpi-gap-status').innerHTML, /尚无已计算点/);
  h.reply(h.latest('scene'), defaultRecord); await turn();
  h.nodes.get('mpi-reveal').events.click();
  assert.match(h.nodes.get('mpi-prediction-answer').textContent, /PEB/);
  assert.equal(h.nodes.get('mpi-download-scene').disabled, false);
  h.nodes.get('mpi-coincident').events.click();
  assert.equal(h.nodes.get('mpi-height').value, '0');
  assert.equal(h.nodes.get('mpi-exact-peb').textContent, '—');
  assert.match(h.nodes.get('mpi-prediction-answer').textContent, /旧预测读数已清空/);
  h.reply(h.latest('scene'), boundaryRecord); await turn();
  assert.equal(h.root.dataset.mpiState, 'singular-nuisance-block');
  assert.equal(h.mounted.controller.getState().input.heightM, 0);
  assert.equal(h.nodes.get('mpi-height').value, '0');
  assert.equal(h.nodes.get('mpi-exact-peb').textContent, '—');
  assert.notEqual(h.nodes.get('mpi-approx-peb').textContent, '—');
  assert.equal(h.nodes.get('mpi-coincident-note').hidden, false);
  assert.doesNotMatch(h.nodes.get('mpi-ellipse').innerHTML, /data-mpi-ellipse="exact"/);
  assert.match(h.nodes.get('mpi-ellipse').innerHTML, /data-mpi-ellipse="approximate"/);
  h.nodes.get('mpi-import').files = [{size: 2, text: async () => '{x'}];
  const pending = h.nodes.get('mpi-import').events.change(); await turn();
  h.reply(h.latest('replay'), await core.replayRecord('{x')); await pending;
  assert.equal(h.root.dataset.mpiState, 'invalid-input');
  assert.equal(h.nodes.get('mpi-download-scene').disabled, true);
  assert.equal(h.nodes.get('mpi-download-sweep').disabled, true);
  assert.equal(h.nodes.get('mpi-exact-peb').textContent, '—');
  assert.equal(h.nodes.get('mpi-approx-peb').textContent, '—');
  assert.doesNotMatch(h.nodes.get('mpi-ellipse').innerHTML, /data-mpi-ellipse=/);
  assert.doesNotMatch(h.nodes.get('mpi-main-plot').innerHTML, /data-mpi-height=/);
  assert.deepEqual(h.mounted.controller.getState().progress, []);
  assert.match(h.nodes.get('mpi-gap-status').innerHTML, /尚无已计算点/);
  assert.match(h.nodes.get('mpi-import-message').textContent, /导入被拒绝/);
  assert.equal(h.nodes.get('mpi-height').value, '0');
  assert.equal(h.phases.find(phase => phase.checked).value, '0.3');
});

test('pagehide cancels active work and persisted pageshow starts a fresh request', async t => {
  const h = domHarness(t), first = h.latest('scene');
  h.listeners.get('pagehide')();
  assert.equal(first.dead, true);
  assert.equal(h.root.dataset.mpiState, 'cancelled');
  h.reply(first, defaultRecord); await turn();
  assert.equal(h.mounted.controller.getState().current, null);
  h.listeners.get('pageshow')({persisted: false});
  assert.equal(h.workers.length, 1);
  h.listeners.get('pageshow')({persisted: true});
  const resumed = h.latest('scene');
  assert.notEqual(resumed, first);
  assert.equal(h.root.dataset.mpiState, 'pending');
  h.reply(resumed, defaultRecord); await turn();
  assert.equal(h.root.dataset.mpiState, 'finite');
  assert.equal(h.mounted.controller.getState().current.recordId, resumed.message.requestId);
});

test('keyboard point selection and reset preserve request ownership and reset only lesson controls', async t => {
  const h = domHarness(t);
  h.reply(h.latest('scene'), defaultRecord); await turn();
  let prevented = false;
  h.nodes.get('mpi-main-plot').events.keydown({
    key: 'Enter', preventDefault() { prevented = true; },
    target: {closest: () => ({dataset: {mpiHeight: '4'}})},
  });
  assert.equal(prevented, true);
  assert.equal(h.nodes.get('mpi-height').value, '4');
  assert.equal(h.nodes.get('mpi-near').checked, false);
  assert.equal(h.nodes.get('mpi-exact-peb').textContent, '—');
  h.nodes.get('mpi-reveal').events.click();
  h.nodes.get('mpi-iq').checked = true;
  h.viewButtons.find(button => button.dataset.mpiView === 'pulse').events.click();
  h.nodes.get('mpi-reset').events.click();
  assert.equal(h.nodes.get('mpi-prediction-answer').hidden, true);
  assert.equal(h.nodes.get('mpi-height').value, '0.5');
  assert.equal(h.nodes.get('mpi-noise').value, 'white');
  assert.equal(h.nodes.get('mpi-near').checked, true);
  assert.equal(h.nodes.get('mpi-iq').checked, false);
  assert.equal(h.nodes.get('mpi-prompt').value, 'ordering');
  assert.equal(h.viewButtons.find(button => button.dataset.mpiView === 'bound').attrs['aria-pressed'], 'true');
  assert.equal(h.nodes.get('mpi-download-scene').disabled, true);
  assert.deepEqual(h.mounted.controller.getState().input, core.DEFAULT_INPUT);
});

test('current lesson retains a unique namespace, fixed presets, PDF locators and static-example boundary', () => {
  assert.ok(lesson);
  const ids = [...lesson.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.ok(ids.every(id => id === 'position-information' || id.startsWith('mpi-')));
  assert.doesNotMatch(lesson, /type="range"/);
  assert.match(lesson, /arxiv.org\/pdf\/1409.1467v2#page=6/);
  assert.match(lesson, /HTML 的 EFIM 编号是 \(36\)\/\(37\)/);
  assert.match(lesson, /不是当前动态输出/);
  assert.match(lesson, /没有运行定位接收机/);
  const select = lesson.match(/<select id="mpi-height"[\s\S]*?<\/select>/)[0];
  const heights = [...select.matchAll(/<option value="([^"]+)"/g)].map(([, height]) => Number(height)).sort((a, b) => a - b);
  assert.deepEqual(heights, [...core.HEIGHTS]);
});
