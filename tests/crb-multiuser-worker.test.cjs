'use strict';
// Execute the unchanged browser Worker and relative imports in Node worker_threads.
// This is not browser rendering, loading, interaction, or latency certification.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Worker} = require('node:worker_threads');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const loc = (flat, source) => path.join(root, fs.existsSync(path.join(root, flat)) ? flat : source);
const dir = path.dirname(loc('crb-multiuser/worker.js', 'labs/crb-beamforming/multiuser/worker.js'));
const D = require(loc('crb-multiuser-data.js', 'labs/crb-beamforming/crb-multiuser-data.js'));
const M = require(loc('crb-multiuser-model.js', 'labs/crb-beamforming/crb-multiuser-model.js'));
function harness({importFailure = false} = {}) {
  const code = `const {parentPort,workerData}=require('node:worker_threads'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({performance,setTimeout,Float64Array,ArrayBuffer,postMessage:m=>parentPort.postMessage(m),importScripts:(...names)=>{if(workerData.importFailure)throw Error('Controlled import failure');for(const name of names){if(!['hermitian.js','linalg.js','core.js'].includes(name))throw Error('Unexpected relative import');vm.runInContext(fs.readFileSync(path.join(workerData.dir,name),'utf8'),context,{filename:name});}}});
vm.runInContext('self=globalThis;',context);vm.runInContext(fs.readFileSync(path.join(workerData.dir,'worker.js'),'utf8'),context,{filename:'worker.js'});parentPort.on('message',data=>context.onmessage({data}));`;
  const worker = new Worker(code, {eval: true, workerData: {dir, importFailure}}), messages = [], pending = [];
  let failure;
  const failed = new Promise(resolve => worker.on('error', error => { failure = error; resolve(error); for (const p of pending.splice(0)) {clearTimeout(p.timer); p.reject(error);} }));
  worker.on('message', message => { messages.push(message); for (const p of [...pending]) if (p.predicate(message)) {clearTimeout(p.timer); pending.splice(pending.indexOf(p), 1); p.resolve(message);} });
  return {messages, failed, send: message => worker.postMessage(message),
    wait(predicate, ms = 20000) { const found = messages.find(predicate); if (found) return Promise.resolve(found); if (failure) return Promise.reject(failure);
      return new Promise((resolve, reject) => {const p = {predicate, resolve, reject}; p.timer = setTimeout(() => {pending.splice(pending.indexOf(p), 1); reject(Error('Node Worker test timed out'));}, ms); pending.push(p);}); },
    async stop() {for (const p of pending) clearTimeout(p.timer); await worker.terminate();}
  };
}
const terminal = (id, type = 'result') => m => m.id === id && m.type === type;
const clone = value => JSON.parse(JSON.stringify(value));
test('all four executed runtime bytes match the declared immutable hashes', () => {
  for (const [file, hash] of Object.entries(D.KERNEL.runtimeFiles)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, path.basename(file)))).digest('hex'), hash, file);
});
test('actual Worker imports the real solver, emits progress, solves default, and survives full record replay', async () => {
  const h = harness(); try {
    h.send({type: 'run', id: 1, input: D.DEFAULT_INPUT, options: M.optionsFor(D.DEFAULT_INPUT)});
    const progress = await h.wait(terminal(1, 'progress')); assert.ok(progress.progress.iterations > 0); assert.ok(progress.progress.elapsedMs >= 0);
    const result = (await h.wait(terminal(1))).result;
    assert.equal(result.status, 'converged'); assert.equal(result.physicalGate.passed, true); assert.deepEqual(result.input, D.DEFAULT_INPUT);
    assert.equal(result.version, D.KERNEL.version); assert.equal(result.Wc.real.length, 4); assert.equal(result.Wc.real[0].length, 2);
    assert.ok(result.finalState.x.length > 0); assert.ok(result.certificate.dual.length > 0);
    const record = M.buildRecord({input: D.DEFAULT_INPUT, result, runId: 1}), imported = M.parseImport(M.exportRecord(record));
    assert.equal(imported.historical, true); assert.deepEqual(imported.input, D.DEFAULT_INPUT);
    h.send({type: 'run', id: 2, input: imported.input, options: M.optionsFor(imported.input)});
    const fresh = M.validateResult((await h.wait(terminal(2))).result, imported.input);
    assert.equal(fresh.status, 'converged');
    assert.ok(Math.abs(fresh.metrics.radar.rootCrbDegrees - result.metrics.radar.rootCrbDegrees) < 1e-12);
    assert.equal(h.messages.filter(terminal(1)).length, 1); assert.equal(h.messages.filter(terminal(2)).length, 1);
  } finally { await h.stop(); }
});
test('actual Worker accepts immediate and mid-run cancellation; obsolete cancel IDs are ignored', async () => {
  const h = harness(); try {
    for (const [id, afterProgress] of [[10, false], [11, true]]) {
      h.send({type: 'run', id, input: D.DEFAULT_INPUT, options: M.optionsFor(D.DEFAULT_INPUT)});
      if (afterProgress) {await h.wait(terminal(id, 'progress')); h.send({type: 'cancel', id: 900});}
      h.send({type: 'cancel', id}); const cancelled = await h.wait(terminal(id, 'cancelled'));
      assert.equal(cancelled.result.status, 'cancelled'); assert.equal(cancelled.result.physicalGate.passed, false);
      assert.equal(cancelled.result.Wc, undefined); M.validateResult(cancelled.result, D.DEFAULT_INPUT);
    }
    h.send({type: 'run', id: 12, input: D.DEFAULT_INPUT}); await h.wait(terminal(12));
    assert.ok(!h.messages.some(m => [10, 11].includes(m.id) && m.type === 'result'));
    assert.ok(!h.messages.some(m => m.id === 900));
  } finally { await h.stop(); }
});
test('actual Worker replacement cancels prior work and returns only the current fresh result', async () => {
  const h = harness(); try {
    h.send({type: 'run', id: 20, input: D.DEFAULT_INPUT}); await h.wait(terminal(20, 'progress'));
    const input = {...clone(D.DEFAULT_INPUT), gammaDb: 0}; h.send({type: 'run', id: 21, input});
    await h.wait(terminal(20, 'cancelled')); const result = (await h.wait(terminal(21))).result;
    assert.equal(result.status, 'converged'); M.validateResult(result, input);
    assert.ok(!h.messages.some(terminal(20))); assert.equal(h.messages.filter(terminal(21)).length, 1);
  } finally { await h.stop(); }
});
test('actual iteration cap is unresolved; zero/rank-deficient channels retain their distinct terminal reason', async () => {
  const h = harness(); try {
    h.send({type: 'run', id: 30, input: D.DEFAULT_INPUT, options: {...M.optionsFor(D.DEFAULT_INPUT), maxIterations: 1}});
    const limited = (await h.wait(terminal(30))).result; M.validateResult(limited, D.DEFAULT_INPUT);
    assert.equal(limited.status, 'iteration_limit'); assert.equal(limited.iterations, 1); assert.equal(limited.physicalGate.passed, false); assert.equal(limited.Wc, undefined);
    const input = clone(D.DEFAULT_INPUT); input.H.real[0].fill(0); input.H.imag[0].fill(0);
    h.send({type: 'run', id: 31, input}); const zero = (await h.wait(terminal(31))).result;
    M.validateResult(zero, input); assert.ok(['rank_condition_not_met', 'infeasible_bound'].includes(zero.status)); assert.equal(zero.physicalGate.passed, false);
    const rank = clone(D.DEFAULT_INPUT); rank.H = {real: [[1,0,0,1],[0,1,1,0]], imag: [[0,0,0,0],[0,0,0,0]]};
    h.send({type: 'run', id: 32, input: rank}); const rejected = (await h.wait(terminal(32))).result;
    M.validateResult(rejected, rank); assert.equal(rejected.status, 'rank_condition_not_met'); assert.equal(rejected.failureReason, null); assert.deepEqual(rejected.physicalGate.failures, ['theorem2_rank_condition']); assert.ok(rejected.metrics.users.every(u => u.ratioToThreshold >= 1 - D.TOLERANCES.sinrRelative));
  } finally { await h.stop(); }
});
test('actual Worker rejects malformed protocol, nonfinite input, bad shapes and unsupported solver options, then recovers', async () => {
  const h = harness(); try {
    const bad = clone(D.DEFAULT_INPUT); bad.H.real[0][0] = NaN;
    const cases = [{type: 'wat', id: 40}, {type: 'run', id: -1, input: D.DEFAULT_INPUT}, {type: 'run', id: 1.5, input: D.DEFAULT_INPUT}, {type: 'run', id: 41, input: bad}, {type: 'run', id: 42, input: {...D.DEFAULT_INPUT, H: {real: [[1]], imag: [[0]]}}}, {type: 'run', id: 43, input: D.DEFAULT_INPUT, options: {maxIterations: 50001}}, {type: 'run', id: 44, input: D.DEFAULT_INPUT, options: {unreviewed: true}}];
    for (const request of cases) {h.send(request); const message = await h.wait(terminal(request.id, 'error')); assert.ok(message.error.length); assert.equal(message.result, undefined);}
    h.send({type: 'run', id: 45, input: D.DEFAULT_INPUT}); assert.equal((await h.wait(terminal(45))).result.status, 'converged');
    for (const request of cases) assert.ok(!h.messages.some(terminal(request.id)));
  } finally { await h.stop(); }
});
test('actual Worker import failure propagates an error instead of a stored numerical answer', async () => {
  const h = harness({importFailure: true}); try {assert.match((await h.failed).message, /Controlled import failure/); assert.deepEqual(h.messages, []);} finally {await h.stop();}
});
