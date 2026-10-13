'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { Worker } = require('node:worker_threads');
const root = path.resolve(__dirname, '..');
const dir = fs.existsSync(path.join(root, 'labs/perceptive-bsbl/session.mjs'))
  ? path.join(root, 'labs/perceptive-bsbl') : path.join(root, 'perceptive-bsbl');
const load = file => import(pathToFileURL(path.join(dir, file)).href);
const modules = Promise.all([load('session.mjs'), load('runtime/client.mjs'), load('runtime/record.mjs')]);
const small = (seed = 31) => ({ acquisition: { config: { N: 16, K: 1, M: 2, Np: 8 }, symbolSeed: seed, noiseSeed: 83,
  paths: [{ q: 2, user: 0, aoa: -24, aod: 15, gain: [1, 0] }, { q: 5, user: 0, aoa: 32, aod: -21, gain: [.5, .1] }] },
  methods: ['mmv_fm_projected', 'block_omp', 'privileged_delay_support_ls'],
  solverOptions: { mmv_fm_projected: { maxActions: 2 }, block_omp: { maxBlocks: 2 } } });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function until(predicate, message = 'condition', timeout = 6000) {
  const start = Date.now();
  while (!predicate()) { if (Date.now() - start > timeout) throw new Error('Timed out: ' + message); await pause(2); }
}
async function create(t) {
  const [{ createLessonSession }, { createNodeClient }] = await modules;
  const client = await createNodeClient(), active = new Set(), jobs = [];
  function watch(worker, role) {
    active.add(worker);
    worker.once('exit', () => active.delete(worker));
    const post = worker.postMessage.bind(worker);
    worker.postMessage = message => { jobs.push({ role, type: message.type, worker }); return post(message); };
    return worker;
  }
  const runtimeFactory = client.factory;
  client.factory = () => watch(runtimeFactory(), 'runtime');
  const session = createLessonSession({ client, checkerFactory: () => watch(new Worker(pathToFileURL(path.join(dir, 'check-worker.mjs')), { type: 'module' }), 'checker') });
  t.after(async () => { await session.dispose(); await until(() => active.size === 0, 'all actual Workers terminated'); });
  return { session, client, active, jobs };
}
let sampleTextPromise;
async function sampleText() {
  if (!sampleTextPromise) sampleTextPromise = (async () => {
    const [, { createNodeClient }, { encodeRecord }] = await modules;
    const client = await createNodeClient();
    try { const receipt = await client.run(small()); return await encodeRecord(receipt.record); }
    finally { await client.dispose(); }
  })();
  return sampleTextPromise;
}

test('actual module Worker execution yields immutable native codec exports and isolated request data', async t => {
  const { session, jobs } = await create(t);
  const request = small(), pending = session.run(request);
  assert.equal(session.lastOperation, pending);
  request.acquisition.symbolSeed = 999;
  const receipt = await pending;
  assert.equal(receipt.status, 'capped');
  assert.equal(session.state.mode, 'fresh');
  assert.equal(session.state.busy, false);
  assert.equal(session.state.record.payload.request.acquisition.symbolSeed, 31);
  assert.equal(session.state.execution, session.state.receipt);
  assert.ok(Object.isFrozen(session.state.record.payload.acquisition.Y.data));
  assert.ok(Object.isFrozen(session.state));
  assert.throws(() => { session.state.record.payload.acquisition.Y.data[0] = 9; }, TypeError);
  const [, , { encodeRecord, decodeRecord }] = await modules;
  assert.equal(await session.rawText(), await encodeRecord(session.state.record));
  assert.deepEqual(await decodeRecord(await session.exportText()), session.state.record);
  assert.ok(jobs.some(job => job.type === 'validate' && job.role === 'checker'));
  assert.ok(jobs.some(job => job.type === 'run' && job.role === 'runtime'));
});

test('schema-invalid B leaves active actual Worker A owned and cancellable', async t => {
  const { session, client } = await create(t);
  const a = session.run({ methods: ['row_sbl_fm'] });
  await until(() => session.state.busy && client.active, 'run A started');
  const owner = session.state.owner, actual = client.active;
  await assert.rejects(session.run({ methods: ['invented'] }), /methods/);
  assert.equal(session.state.owner, owner);
  assert.equal(client.active, actual);
  assert.equal(session.state.busy, true);
  assert.equal(await session.cancel({ hard: true }), true);
  const receipt = await a;
  assert.equal(receipt.status, 'hard_cancelled');
  assert.equal(session.state.owner, owner);
  assert.equal(session.state.receipt.runId, actual.runId);
});

test('semantic-invalid B is rejected by preflight before superseding A', async t => {
  const { session, client } = await create(t);
  const a = session.run({ methods: ['row_sbl_fm'] });
  await until(() => session.state.busy && client.active, 'run A started');
  const owner = session.state.owner, actual = client.active;
  await assert.rejects(session.run({ acquisition: { paths: [] } }), /variance/);
  assert.equal(session.state.owner, owner);
  assert.equal(client.active, actual);
  assert.equal(session.state.busy, true);
  await session.cancel({ hard: true });
  assert.equal((await a).status, 'hard_cancelled');
});

test('incompatible implicit default paths also fail before ownership changes', async t => {
  const { session } = await create(t);
  await session.importText(await sampleText());
  const before = session.state.record, owner = session.state.owner;
  await assert.rejects(session.run({ acquisition: { config: { Np: 8 } } }), /q/);
  assert.equal(session.state.record, before);
  assert.equal(session.state.owner, owner);
  assert.equal(session.state.mode, 'imported');
});

test('rapid valid starts cannot install stale receipts or launch older validation work', async t => {
  const { session, jobs } = await create(t);
  const a = session.run(small(71)), b = session.run(small(72)), c = session.run(small(73));
  const results = await Promise.all([a, b, c]);
  assert.equal(results[0], null); assert.equal(results[1], null);
  assert.equal(session.state.record.payload.request.acquisition.symbolSeed, 73);
  assert.equal(session.state.receipt, results[2]);
  assert.equal(jobs.filter(job => job.type === 'run').length, 1);
});

test('superseding an already running job cannot reuse its record or final receipt', async t => {
  const { session } = await create(t);
  const a = session.run({ methods: ['row_sbl_fm'] });
  await until(() => session.state.record, 'A acquisition evidence');
  const ownerA = session.state.owner, recordA = session.state.record;
  const b = session.run(small(81));
  const [, receiptB] = await Promise.all([a, b]);
  assert.ok(session.state.owner > ownerA);
  assert.equal(session.state.receipt, receiptB);
  assert.notEqual(session.state.record.payload.runId, recordA.payload.runId);
  assert.equal(session.state.record.payload.request.acquisition.symbolSeed, 81);
  assert.ok(Object.isFrozen(recordA));
});

test('file read resolving after a newer run cannot replace its record', async t => {
  const { session } = await create(t);
  const text = await sampleText(), read = deferred();
  const file = session.importFile({ size: text.length, text: () => read.promise });
  const current = await session.run(small(89));
  read.resolve(text);
  assert.equal(await file, null);
  assert.equal(session.state.record, current.record);
  assert.equal(session.state.mode, 'fresh');
});

test('stale file read errors cannot overwrite a newer successful record', async t => {
  const { session } = await create(t);
  const read = deferred(), old = session.importFile({ size: 1, text: () => read.promise });
  await session.importText(await sampleText());
  const current = session.state.record;
  read.reject(new Error('old unreadable file'));
  assert.equal(await old, null);
  assert.equal(session.state.record, current);
  assert.equal(session.state.error, null);
  assert.equal(session.state.importBusy, false);
});

test('newest file selection wins and invalid active import preserves cancellable run', async t => {
  const { session, client } = await create(t);
  const text = await sampleText(), read = deferred();
  const old = session.importFile({ size: text.length, text: () => read.promise });
  const newer = await session.importFile({ size: text.length, text: async () => text });
  read.resolve(text);
  assert.equal(await old, null);
  assert.equal(session.state.record, newer);
  const a = session.run({ methods: ['row_sbl_fm'] });
  await until(() => session.state.busy && client.active, 'A started');
  const owner = session.state.owner;
  await assert.rejects(session.importText('{invalid'), /JSON|property|position|Unexpected/);
  assert.equal(session.state.owner, owner); assert.ok(client.active);
  await session.cancel({ hard: true }); await a;
});

test('oversized files are rejected before reading and do not erase the current record', async t => {
  const { session } = await create(t);
  await session.importText(await sampleText()); const before = session.state.record;
  let read = false;
  await assert.rejects(session.importFile({ size: 8000001, text: async () => { read = true; return ''; } }), /cap/);
  assert.equal(read, false); assert.equal(session.state.record, before);
});

test('checker runs in an actual separate module Worker and binds pass to exact record identity', async t => {
  const { session, jobs } = await create(t);
  await session.importText(await sampleText());
  const report = await session.check();
  assert.equal(report.status, 'passed');
  assert.equal(report.recordSha256, session.state.record.payloadSha256);
  assert.equal(report.owner, session.state.owner);
  assert.equal(report.executionStatus, 'capped');
  assert.ok(report.checks > 0); assert.ok(report.acceptedActionsRecomputed > 0);
  assert.equal(session.state.checkBusy, false);
  assert.ok(jobs.some(job => job.type === 'check' && job.role === 'checker'));
});

test('an intentionally rehashed false estimate passes codec but fails numerical Worker checking', async t => {
  const { session } = await create(t);
  const [, , { sealRecord, encodeRecord }] = await modules;
  const source = JSON.parse(await sampleText());
  source.payload.results.mmv_fm_projected.X.data[0] += .5;
  const forged = await sealRecord(source.payload);
  await session.importText(await encodeRecord(forged));
  const report = await session.check();
  assert.equal(report.status, 'failed');
  assert.ok(report.failures.length > 0);
});

test('work-limited execution is incomplete, never a reused pass', async t => {
  const { session } = await create(t);
  await session.importText(await sampleText());
  assert.equal((await session.check()).status, 'passed');
  const receipt = await session.run({ ...small(), budget: { maxWorkUnits: 1 } });
  assert.equal(receipt.status, 'work_budget');
  assert.equal(session.state.checkReport, null);
  const report = await session.check();
  assert.equal(report.status, 'incomplete');
  assert.ok(report.unavailable.length > 0);
});

test('checker budget exhaustion throws in runtime and appears only as interrupted incomplete evidence', async t => {
  const { session } = await create(t);
  await session.importText(await sampleText());
  assert.equal((await session.check()).status, 'passed');
  const report = await session.check({ budget: { maxWorkUnits: 1 } });
  assert.equal(report.status, 'incomplete');
  assert.equal(report.interrupted, true);
  assert.match(report.unavailable.join(' '), /work_budget/);
  assert.notEqual(session.state.checkReport.status, 'passed');
});

test('cancel terminates actual checker and cannot restore an earlier passed badge', async t => {
  const { session, jobs } = await create(t);
  await session.importText(await sampleText());
  await session.check();
  const before = jobs.filter(job => job.type === 'check').length;
  const pending = session.check();
  await until(() => jobs.filter(job => job.type === 'check').length > before, 'checker launched');
  const worker = jobs.findLast(job => job.type === 'check').worker;
  await session.cancel();
  assert.equal(await pending, null);
  assert.equal(worker.threadId, -1);
  assert.equal(session.state.checkReport.status, 'incomplete');
  assert.equal(session.state.checkBusy, false);
});

test('importing a new owner invalidates late checker completion and exported A remains valid A', async t => {
  const { session, jobs } = await create(t);
  await session.importText(await sampleText());
  const a = session.state.record, exportedA = session.exportText();
  const pending = session.check();
  await until(() => jobs.some(job => job.type === 'check'), 'checker launched');
  await session.run(small(101));
  await pending;
  assert.equal(session.state.checkReport, null);
  assert.equal(session.state.record.payload.request.acquisition.symbolSeed, 101);
  const [, , { decodeRecord }] = await modules;
  assert.equal((await decodeRecord(await exportedA)).payloadSha256, a.payloadSha256);
});

test('request replay preserves historical source and proves matching regenerated acquisition separately', async t => {
  const { session } = await create(t);
  const historical = fs.readFileSync(path.join(dir, 'fixtures/v1-accepted-cap.json'), 'utf8');
  const [, , { decodeRecord, encodeRecord }] = await modules;
  const original = await decodeRecord(historical);
  await session.importText(historical);
  const check = await session.check();
  assert.equal(check.status, 'passed');
  assert.equal(check.importedExecutionCodeMatchesCurrent, false);
  assert.deepEqual(session.state.record.payload.provenance, original.payload.provenance);
  const result = await session.replay();
  assert.equal(session.state.mode, 'replay');
  assert.equal(result.replay.acquisitionMatches, true);
  assert.equal(session.state.sourceRecord.payloadSha256, original.payloadSha256);
  assert.equal(await session.exportText({ source: true }), await encodeRecord(original));
  assert.notDeepEqual(session.state.record.payload.provenance.build.codeSha256, original.payload.provenance.build.codeSha256);
  assert.equal(session.state.record.payload.provenance.acquisitionSha256, original.payload.provenance.acquisitionSha256);
  await session.replay();
  assert.equal(session.state.sourceRecord.payloadSha256, original.payloadSha256);
  assert.equal(await session.rawText({ source: true }), await encodeRecord(original));
});

test('same-request replay refuses mismatch without relabelling or destroying imported source', async t => {
  const { session } = await create(t);
  const [, , { sealRecord, encodeRecord }] = await modules;
  const source = JSON.parse(await sampleText());
  source.payload.request.acquisition.symbolSeed += 1;
  await session.importText(await encodeRecord(await sealRecord(source.payload)));
  const before = session.state.record, owner = session.state.owner;
  await assert.rejects(session.replay(), /different acquisition/);
  assert.equal(session.state.owner, owner); assert.equal(session.state.record, before);
  assert.equal(session.state.mode, 'imported');
});

test('dispose terminates pending actual checker and validation Workers and ignores file completion', async t => {
  const { session, active, jobs } = await create(t);
  await session.importText(await sampleText());
  const check = session.check();
  await until(() => jobs.some(job => job.type === 'check'), 'checker launched');
  const run = session.run(small());
  await session.dispose();
  assert.equal(await check, null); assert.equal(await run, null);
  await until(() => active.size === 0, 'all disposed Workers exited');
  assert.equal(session.state.disposed, true);
  assert.equal(session.state.busy, false); assert.equal(session.state.checkBusy, false);
  await assert.rejects(session.run(small()), /disposed/);
});

test('disposal during File.text prevents subsequent import and callbacks', async t => {
  const { session } = await create(t);
  const read = deferred(); let changes = 0;
  session.subscribe(() => changes++);
  const pending = session.importFile({ size: 100, text: () => read.promise });
  await session.dispose(); const atDisposal = changes;
  read.resolve(await sampleText());
  assert.equal(await pending, null);
  assert.equal(session.state.record, null);
  assert.equal(changes, atDisposal);
});

test('read-only view snapshots and subscriptions cannot mutate ownership or prevent cleanup', async t => {
  const { session } = await create(t);
  await session.importText(await sampleText());
  const owner = session.state.owner, record = session.state.record;
  const unsubscribe = session.subscribe(() => { throw new Error('renderer failed'); });
  assert.equal(session.snapshot(), session.state);
  assert.equal(session.state.owner, owner); assert.equal(session.state.record, record);
  await session.check();
  assert.equal(session.state.owner, owner); assert.equal(session.state.record, record);
  unsubscribe();
});

test('hard-cancelled available acquisition remains owned partial evidence and checks incomplete', async t => {
  const { session } = await create(t);
  const pending = session.run({ methods: ['row_sbl_fm'] });
  await until(() => session.state.record, 'received same-job acquisition');
  const runId = session.state.record.payload.runId;
  await session.cancel({ hard: true });
  const receipt = await pending;
  assert.equal(receipt.status, 'hard_cancelled');
  assert.equal(receipt.lastEvidenceAvailable, true);
  assert.equal(session.state.record.payload.runId, runId);
  assert.equal(session.state.record.payload.status, 'hard_cancelled');
  const report = await session.check();
  assert.equal(report.status, 'incomplete');
  assert.equal(report.executionStatus, 'hard_cancelled');
});

test('cancelling a preflight prevents the numerical Worker from launching', async t => {
  const { session, jobs } = await create(t);
  const pending = session.run(small());
  assert.equal(session.state.validating, true);
  await session.cancel({ hard: true });
  assert.equal(await pending, null);
  assert.equal(jobs.filter(job => job.type === 'run').length, 0);
  assert.equal(session.state.record, null);
  assert.equal(session.state.owner, 0);
});

test('null and closed-schema nested requests reject without invalidating existing evidence', async t => {
  const { session } = await create(t);
  await session.importText(await sampleText());
  const record = session.state.record, owner = session.state.owner;
  for (const request of [null, { solverOptions: { block_omp: { unused: 1 } } }, { acquisition: { config: { hidden: 1 } } }]) {
    await assert.rejects(session.run(request));
    assert.equal(session.state.record, record); assert.equal(session.state.owner, owner);
  }
});
