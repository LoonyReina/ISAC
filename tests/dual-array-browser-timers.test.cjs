'use strict';
// Receiver-strict host timer doubles exercise the browser contract in Node.
// These are deterministic lifecycle regressions, not actual-browser acceptance.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const modules = Promise.all([
  import('../labs/dual-array/runtime/client.mjs'),
  import('../labs/dual-array/lesson/session.mjs'),
  import('../labs/dual-array/lesson/model.mjs'),
]);

class TestWorker {
  constructor() { this.listeners = new Map(); this.sent = []; this.terminations = 0; }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type, fn) { assert.equal(this.listeners.get(type), fn); this.listeners.delete(type); }
  postMessage(message) { this.sent.push(message); }
  terminate() { this.terminations++; }
  emit(type, event) { this.listeners.get(type)?.(event); }
  finish(status = 'completed') {
    const {protocol, id, revision} = this.sent.at(-1);
    this.emit('message', {data: {protocol, id, revision, kind: 'terminal', status}});
  }
}

function timers(receiver) {
  let next = 0;
  const pending = new Map(), scheduled = [], cleared = [];
  return {
    pending, scheduled, cleared,
    set: function (callback, delay) {
      if (this !== receiver()) throw new TypeError('Illegal invocation: setTimeout receiver');
      assert.equal(arguments.length, 2);
      const handle = next++;
      scheduled.push({handle, callback, delay}); pending.set(handle, callback);
      return handle;
    },
    clear: function (handle) {
      if (this !== receiver()) throw new TypeError('Illegal invocation: clearTimeout receiver');
      assert.equal(arguments.length, 1);
      cleared.push(handle); pending.delete(handle);
    },
    fire(handle) { const callback = pending.get(handle); assert.equal(typeof callback, 'function'); callback(); },
  };
}

function withHostTimers(fn) {
  const saved = Object.fromEntries(['setTimeout', 'clearTimeout'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const clock = timers(() => globalThis);
  Object.defineProperty(globalThis, 'setTimeout', {...saved.setTimeout, value: clock.set});
  Object.defineProperty(globalThis, 'clearTimeout', {...saved.clearTimeout, value: clock.clear});
  try { return fn(clock); }
  finally { for (const [key, descriptor] of Object.entries(saved)) Object.defineProperty(globalThis, key, descriptor); }
}

function clientFixture(WorkerClient, options = {}) {
  const workers = [], messages = [];
  const client = new WorkerClient({workerFactory: () => { const worker = new TestWorker(); workers.push(worker); return worker; }, onMessage: m => messages.push(m), ...options});
  return {client, workers, messages};
}

function closed(worker, clock) {
  assert.equal(worker.terminations, 1);
  assert.equal(worker.listeners.size, 0);
  assert.equal(clock.pending.size, 0);
}

function lifecycle(name, fn) {
  test(name, async () => {
    const [{WorkerClient}, {LessonSession}, {sceneRequest, DEFAULT_DRAFT}] = await modules;
    withHostTimers(clock => fn({WorkerClient, LessonSession, request: sceneRequest(DEFAULT_DRAFT), clock}));
  });
}

lifecycle('Default host timers receive the global owner on completion, including zero handle', ({WorkerClient, request, clock}) => {
  const {client, workers, messages} = clientFixture(WorkerClient);
  const identity = client.start(request, {budgetMs: 137});
  assert.equal(client.state, 'running'); assert.equal(workers[0].sent.length, 1);
  assert.deepEqual(clock.scheduled.map(({handle, delay}) => ({handle, delay})), [{handle: 0, delay: 137}]);
  workers[0].finish();
  assert.equal(client.state, 'idle'); assert.deepEqual(messages.map(m => [m.status, m.id, m.revision]), [['completed', identity.id, identity.revision]]);
  assert.deepEqual(clock.cleared, [0]); closed(workers[0], clock);
});

lifecycle('Default setTimeout binding works independently of an injected clearTimer', ({WorkerClient, request, clock}) => {
  const cleared = [];
  const {client, workers} = clientFixture(WorkerClient, {clearTimer: function (handle) { assert.equal(this, client); cleared.push(handle); clock.clear.call(globalThis, handle); }});
  client.start(request); assert.equal(workers[0].sent.length, 1); client.cancel();
  assert.deepEqual(cleared, [0]); closed(workers[0], clock);
});

lifecycle('Default clearTimeout binding works independently of an injected setTimer', ({WorkerClient, request, clock}) => {
  const {client, workers, messages} = clientFixture(WorkerClient, {setTimer: function (...args) { assert.equal(this, client); return clock.set.apply(globalThis, args); }});
  client.start(request); assert.equal(workers[0].sent.length, 1); client.cancel();
  assert.deepEqual(messages.map(m => m.status), ['cancelled']); assert.deepEqual(clock.cleared, [0]); closed(workers[0], clock);
});

lifecycle('Default timer bindings retain their construction-time host functions', ({WorkerClient, request, clock}) => {
  const {client, workers} = clientFixture(WorkerClient);
  globalThis.setTimeout = () => { throw Error('replacement must not schedule this client'); };
  globalThis.clearTimeout = () => { throw Error('replacement must not clear this client'); };
  client.start(request); assert.equal(client.state, 'running'); client.cancel(); closed(workers[0], clock);
});

lifecycle('Wall-clock expiry clears the bound host timer and terminates once', ({WorkerClient, request, clock}) => {
  const {client, workers, messages} = clientFixture(WorkerClient);
  client.start(request, {budgetMs: 1}); const late = workers[0].listeners.get('message');
  clock.fire(0); assert.equal(client.state, 'idle'); assert.deepEqual(messages.map(m => m.status), ['budget-exceeded']);
  late({data: {...workers[0].sent[0], kind: 'terminal', status: 'completed'}});
  client.cancel(); client.dispose(); assert.equal(messages.length, 1); assert.deepEqual(clock.cleared, [0]); closed(workers[0], clock);
});

lifecycle('Repeated cancel and start preserve independent timer ownership', ({WorkerClient, request, clock}) => {
  const {client, workers, messages} = clientFixture(WorkerClient);
  client.start(request); client.cancel(); client.cancel(); client.start(request); workers[1].finish();
  assert.deepEqual(messages.map(m => m.status), ['cancelled', 'completed']); assert.deepEqual(clock.cleared, [0, 1]); workers.forEach(worker => closed(worker, clock));
});

for (const type of ['error', 'messageerror']) lifecycle(`Worker ${type} clears the bound host timer and removes listeners`, ({WorkerClient, request, clock}) => {
  const {client, workers, messages} = clientFixture(WorkerClient);
  client.start(request); const stale = workers[0].listeners.get(type); workers[0].emit(type, {message: 'platform failure'}); stale({message: 'late failure'});
  assert.equal(client.state, 'idle'); assert.deepEqual(messages.map(m => [m.status, m.error]), [['error', 'platform failure']]); assert.deepEqual(clock.cleared, [0]); closed(workers[0], clock);
});

lifecycle('PostMessage failure clears the host timer without leaving a Worker owner', ({WorkerClient, request, clock}) => {
  const worker = new TestWorker(); worker.postMessage = () => { throw Error('clone failed'); };
  const {client, messages} = clientFixture(WorkerClient, {workerFactory: () => worker}); client.start(request);
  assert.equal(client.state, 'idle'); assert.deepEqual(messages.map(m => [m.status, m.error]), [['error', 'clone failed']]); assert.deepEqual(clock.cleared, [0]); closed(worker, clock);
});

lifecycle('Reentrant supersession starts the newest Worker and clears only displaced timers', ({WorkerClient, request, clock}) => {
  let client, restarted = false;
  const fixture = clientFixture(WorkerClient, {onMessage: m => {
    fixture.messages.push(m);
    if (m.status === 'superseded' && !restarted) { restarted = true; client.start(request); }
  }}); client = fixture.client;
  client.start(request); client.start(request);
  assert.deepEqual(fixture.workers.map(w => w.sent.length), [1, 0, 1]); assert.equal(client.current.id, 'dual_3');
  assert.deepEqual(clock.cleared, [0, 1]); assert.deepEqual([...clock.pending.keys()], [2]);
  fixture.workers[2].finish(); assert.deepEqual(fixture.messages.map(m => [m.id, m.status]), [['dual_1', 'superseded'], ['dual_2', 'superseded'], ['dual_3', 'completed']]);
  assert.deepEqual(clock.cleared, [0, 1, 2]); fixture.workers.forEach(w => closed(w, clock));
});

lifecycle('Production LessonSession run reset cycles clear host timers and terminate Workers', ({LessonSession, clock}) => {
  const workers = [], session = new LessonSession({workerFactory: () => { const worker = new TestWorker(); workers.push(worker); return worker; }});
  for (let i = 0; i < 3; i++) { session.run(); assert.equal(session.state.status, 'running'); assert.equal(workers[i].sent.length, 1); session.reset(); assert.equal(session.state.status, 'idle'); assert.equal(session.client, null); }
  session.dispose(); assert.deepEqual(clock.cleared, [0, 1, 2]); workers.forEach(w => closed(w, clock));
});

lifecycle('Production LessonSession reentrant reset and run keeps the newest timer owner', ({LessonSession, clock}) => {
  let restarted = false; const workers = [];
  const session = new LessonSession({workerFactory: () => { const worker = new TestWorker(); workers.push(worker); return worker; }, onChange: state => {
    if (state.status === 'running' && !restarted) { restarted = true; session.reset(); session.run(); throw Error('old observer failure'); }
  }});
  session.run(); assert.equal(session.state.status, 'running'); assert.equal(workers.length, 1); assert.equal(workers[0].sent.length, 1);
  assert.equal(clock.pending.size, 1); assert.equal(session.lastCallbackError.message, 'old observer failure');
  session.cancel(); assert.equal(session.client, null); assert.equal(session.state.status, 'cancelled'); assert.deepEqual(clock.cleared, [0]); closed(workers[0], clock);
});

lifecycle('Injected timer functions retain their identity and WorkerClient receiver contract', ({WorkerClient, request, clock: host}) => {
  let client; const clock = timers(() => client);
  const fixture = clientFixture(WorkerClient, {setTimer: clock.set, clearTimer: clock.clear}); client = fixture.client;
  assert.equal(client.setTimer, clock.set); assert.equal(client.clearTimer, clock.clear);
  client.start(request, {budgetMs: 47}); client.cancel(); client.start(request); clock.fire(1);
  client.start(request); fixture.workers[2].emit('error', {message: 'injected timer worker error'}); client.start(request); client.dispose();
  assert.deepEqual(clock.cleared, [0, 1, 2, 3]); assert.deepEqual(fixture.messages.map(m => m.status), ['cancelled', 'budget-exceeded', 'error', 'disposed']);
  assert.equal(clock.scheduled[0].delay, 47); fixture.workers.forEach(w => closed(w, clock)); assert.equal(host.scheduled.length, 0);
});

lifecycle('Injected scheduler failure still terminates the new Worker and reports one error', ({WorkerClient, request, clock}) => {
  const {client, workers, messages} = clientFixture(WorkerClient, {setTimer: function () { assert.equal(this, client); throw Error('scheduler unavailable'); }});
  client.start(request); assert.equal(client.state, 'idle'); assert.equal(workers[0].sent.length, 0);
  assert.deepEqual(messages.map(m => [m.status, m.error]), [['error', 'scheduler unavailable']]); assert.deepEqual(clock.cleared, []); closed(workers[0], clock);
});

lifecycle('Observer failure after completion cannot retain timers or Worker ownership', ({WorkerClient, request, clock}) => {
  const errors = [], {client, workers} = clientFixture(WorkerClient, {onMessage: () => { throw Error('observer failed'); }, onCallbackError: error => errors.push(error.message)});
  client.start(request); workers[0].finish(); assert.equal(client.state, 'idle'); assert.deepEqual(errors, ['observer failed']); assert.deepEqual(clock.cleared, [0]); closed(workers[0], clock);
});

test('Timer repair exact inverse accepts only the pinned current client and recovers all old bytes', () => {
  const fs = require('node:fs'), path = require('node:path');
  const {correction, sha, withoutClient} = require('./helpers/dual-array-browser-timer-preservation.cjs');
  const current = fs.readFileSync(path.join(__dirname, '..', correction.path));
  const before = withoutClient(current);
  assert.equal(sha(before), '16e2d61c07929a57520e25e3ffe2ba6d89998fbfdbbc0b8edee7415dabbfd824');
  assert.deepEqual(Buffer.from(before.toString().replace(correction.from, correction.to)), current);
  assert.throws(() => withoutClient(before));
  assert.throws(() => withoutClient(Buffer.concat([current, Buffer.from('\n')])));
  assert.throws(() => withoutClient(Buffer.from(current.toString().replace('budgetMs=30000', 'budgetMs=30001'))));
  assert.throws(() => withoutClient(Buffer.from(current.toString().replace('setTimeout.bind(globalThis)', 'setTimeout'))));
  assert.throws(() => withoutClient(Buffer.from(current.toString().replace('clearTimeout.bind(globalThis)', 'clearTimeout'))));
});

test('Timer repair leaves the complete historical functional inventory and scientific suite unchanged', () => {
  const fs = require('node:fs'), path = require('node:path');
  const {correction, sha, withoutClient} = require('./helpers/dual-array-browser-timer-preservation.cjs');
  const root = path.join(__dirname, '..'), read = file => fs.readFileSync(path.join(root, file));
  const frozen = read('labs/dual-array/FUNCTIONAL-FREEZE.json');
  assert.equal(sha(frozen), '183fae1a6f7b536d582595440763a7f57a1aed8b0dcd23e31bbd5a2c4897fbd6');
  const files = JSON.parse(frozen).files;
  assert.equal(files.length, 21);
  for (const row of files) {
    const actual = read(row.path), accepted = row.path === correction.path ? withoutClient(actual) : actual;
    assert.equal(accepted.length, row.bytes, row.path);
    assert.equal(sha(accepted), row.sha256, row.path);
  }
  const freeze = JSON.parse(read('tests/helpers/dual-array-browser-timer-repair.json'));
  assert.equal(freeze.schema, 'dual-array-browser-timer-repair-v1');
  assert.deepEqual(freeze.correction, correction);
  for (const row of freeze.files) { const bytes = read(row.path); assert.equal(bytes.length, row.bytes, row.path); assert.equal(sha(bytes), row.sha256, row.path); }
});
