'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const C = require('../offgrid-range-core.js');
const root = path.join(__dirname, '../scripts/offgrid-range-reference');
const readFixture = name => JSON.parse(fs.readFileSync(path.join(root, 'fixtures', name + '.json'), 'utf8'));
const known = {coarse: C.receiverTemplates(C.X, C.F, C.COARSE), fine: C.receiverTemplates(C.X, C.F, C.FINE)};
function near(actual, expected, tolerance = 1e-12, label = '') {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} != ${expected} (tolerance ${tolerance})`);
}
function compare(actual, expected, label = '', tolerance = 1e-12) {
  if (typeof expected === 'number') { near(actual, expected, tolerance, label); return; }
  if (expected === null || typeof expected !== 'object') { assert.equal(actual, expected, label); return; }
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), label + ' exact schema keys');
  for (const key of Object.keys(expected)) compare(actual[key], expected[key], label + '.' + key, tolerance);
}
function multiply([ar, ai], [br, bi]) { return [ar * br - ai * bi, ar * bi + ai * br]; }
const fixtures = Object.fromEntries(Object.keys(C.PRESETS).map(name => [name, readFixture(name)]));
const results = Object.fromEntries(Object.entries(C.PRESETS).map(([name, options]) => [name, C.experiment(options)]));

for (const name of Object.keys(C.PRESETS)) test(name + ': exact reference schema and every observation, fit, error, score, and aggregate', () => {
  const expected = fixtures[name], actual = results[name];
  compare(actual, expected, name);
  assert.equal(actual.trials.length, expected.settings.trials);
  assert.equal(actual.summary.coarse.failedTrials, 0);
  assert.equal(actual.summary.fine.failedTrials, 0);
  // JSON.stringify canonicalizes Python's harmless -0.0 entries to zero.
  assert.deepEqual(actual.resources, JSON.parse(JSON.stringify(expected.resources)));
  const states = new Set(), domains = new Set();
  for (let i = 0; i < actual.trials.length; i++) {
    const row = actual.trials[i], oracle = expected.trials[i];
    assert.equal(row.trialIndex, i);
    assert.deepEqual(row.initialStateUint32, oracle.initialStateUint32);
    assert.equal(row.domainHashUint32, oracle.domainHashUint32);
    domains.add(row.domain); states.add(JSON.stringify(row.initialStateUint32));
    for (const key of ['coarse', 'fine']) {
      assert.equal(row[key].estimateM, oracle[key].estimateM);
      assert.equal(row[key].tieCount, oracle[key].tieCount);
      assert.equal(row[key].grossError, oracle[key].grossError);
      assert.equal(row[key].signedErrorM, row[key].estimateM - actual.settings.truthRangeM);
      assert.equal(row[key].squaredErrorM2, row[key].signedErrorM ** 2);
      assert.equal(row[key].grossError, Math.abs(row[key].signedErrorM) > 9.375);
      assert.ok(!Object.hasOwn(row[key], 'scores'), 'only selected trial has exported score arrays');
    }
    assert.ok(row.fine.maxScore >= row.coarse.maxScore, 'nested raw maximum on the exact same Y');
    assert.ok(row.fine.selectedScore >= row.coarse.selectedScore - row.fine.tieTolerance);
  }
  assert.equal(states.size, actual.trials.length);
  assert.equal(domains.size, actual.trials.length);
  assert.equal(actual.plot.coarseScores.length, 25);
  assert.equal(actual.plot.fineScores.length, 241);
});

test('all 12 uint32 seed/domain fixtures: hash/state/uniform exact, all 384 normal draws tolerant', () => {
  const data = readFixture('rng-port-fixtures');
  assert.equal(data.rngVersion, C.RNG_VERSION);
  assert.equal(data.fixtures.length, 12);
  for (const f of data.fixtures) {
    const rng = new C.RandomStream(f.seedUint32, f.domain);
    assert.equal(rng.domainHashUint32, f.domainHashUint32);
    assert.deepEqual(rng.initialStateUint32, f.initialStateUint32);
    for (const expected of f.uniform) {
      assert.equal(rng.uniform(), expected);
      assert.ok(rng.state.every(v => Number.isInteger(v) && v >= 0 && v <= 4294967295));
    }
    const normal = new C.RandomStream(f.seedUint32, f.domain);
    for (const expected of f.normal) near(normal.normal(), expected, 2e-14);
  }
});

test('RNG rejects non-uint32 seeds and empty/non-ASCII domains without coercion', () => {
  for (const seed of [-1, 4294967296, 0.5, NaN, Infinity, '7', true, null])
    assert.throws(() => new C.RandomStream(seed, 'domain'), /uint32/);
  for (const domain of ['', '距离', 'trial/\u0080', null, 7])
    assert.throws(() => new C.RandomStream(0, domain), /ASCII/);
  for (const seed of [0, 4294967295]) {
    const r = new C.RandomStream(seed, 'ascii/edge');
    for (let j = 0; j < 100; j++) { const u = r.uniform(); assert.ok(u > 0 && u < 1); }
  }
});

test('physical resource ledger: normalized energy, periodic CP, units, closed nested support', () => {
  const r = C.ledger();
  assert.equal(r.cMps, 300000000);
  assert.equal(r.knownWaveform.reduce((sum, z) => sum + z[0] ** 2 + z[1] ** 2, 0), 1);
  assert.ok(r.knownWaveform.every(z => z[0] ** 2 + z[1] ** 2 === 1 / 16));
  assert.deepEqual(r.coarseGridM, r.fineGridM.filter((_, i) => i % 10 === 0));
  assert.deepEqual([r.coarseGridM[0], r.coarseGridM.at(-1), r.fineGridM[0], r.fineGridM.at(-1)], [0,120,0,120]);
  assert.equal(r.coarseGridM.length, 25); assert.equal(r.fineGridM.length, 241);
  assert.equal(r.nominalDftBandwidthHz, 16000000); assert.equal(r.toneEndpointSpanHz, 15000000);
  assert.equal(r.rangeResponseFirstNullOffsetM, 9.375); assert.equal(r.rangeResponseNullToNullWidthM, 18.75);
  assert.equal(r.rangeAmbiguityPeriodM, 150);
  assert.equal(r.delayAmbiguityPeriodS, 0.000001);
  assert.equal(2 * 120 / r.cMps, 0.0000008);
  assert.ok(r.cpDurationS > 2 * 120 / r.cMps);
  assert.equal(r.cpDurationS, r.usefulDurationS);
  assert.equal(r.totalBurstDurationS, 0.000002);
  assert.deepEqual([r.usefulEnergy, r.cpEnergy, r.totalBurstEnergy], [1,1,2]);
  // Independent unitary inverse FFT Parseval check and full-symbol CP repeat.
  const time = Array.from({length: 16}, (_, n) => {
    let re = 0, im = 0;
    C.X.forEach(([xr, xi], k) => { const p = 2 * Math.PI * k * n / 16;
      re += (xr * Math.cos(p) - xi * Math.sin(p)) / 4;
      im += (xr * Math.sin(p) + xi * Math.cos(p)) / 4; });
    return [re, im];
  });
  near(time.reduce((sum, [re, im]) => sum + re * re + im * im, 0), 1, 1e-14);
  near([...time, ...time].reduce((sum, [re, im]) => sum + re * re + im * im, 0), 2, 2e-14);
});

test('off-grid truth is never rounded; endpoint and on-grid targets have exact noiseless estimates', () => {
  for (const truthRangeM of [0, 120, 15, 43.7, 25.123456789]) {
    const record = C.experiment({...C.PRESETS['noise-free-offgrid'], truthRangeM});
    assert.equal(record.settings.truthRangeM, truthRangeM);
    if ([0, 120, 15].includes(truthRangeM)) {
      assert.equal(record.trials[0].coarse.estimateM, truthRangeM);
      assert.equal(record.trials[0].fine.estimateM, truthRangeM);
      assert.ok(record.trials[0].fine.residualEnergy < 1e-27);
    }
    const [generated] = C.generateObservation(truthRangeM, 0.7, null, 2026, 0);
    assert.deepEqual(record.trials[0].observation, generated);
  }
});

test('zero data is uninformative and all candidates tie at the lowest endpoint', () => {
  for (const key of ['coarse', 'fine']) {
    const result = C.receive(Array.from({length: 16}, () => [0,0]), known[key]);
    assert.equal(result.estimateM, 0); assert.equal(result.index, 0);
    assert.equal(result.tieCount, key === 'coarse' ? 25 : 241);
    assert.equal(result.maxScore, 0); assert.equal(result.selectedScore, 0);
    assert.equal(result.residualEnergy, 0); assert.equal(result.tieTolerance, 64 * Number.EPSILON);
    assert.ok(result.scores.every(score => score === 0));
  }
});

test('midpoint and numerical tolerance ties choose lowest range; raw maximum is kept separately', () => {
  const [coarseY] = C.generateObservation(42.5, 0.7, null, 2026, 0);
  const coarse = C.receive(coarseY, known.coarse);
  assert.equal(coarse.estimateM, 40); assert.equal(coarse.tieCount, 2);
  const [fineY] = C.generateObservation(43.75, 0.7, null, 2026, 0);
  const fine = C.receive(fineY, known.fine);
  assert.equal(fine.estimateM, 43.5); assert.equal(fine.tieCount, 2);
  for (const r of [coarse, fine]) {
    assert.equal(r.maxScore, Math.max(...r.scores));
    assert.equal(r.selectedScore, r.scores[r.index]);
    assert.ok(r.maxScore - r.selectedScore <= r.tieTolerance);
    near(r.tieTolerance, 64 * Number.EPSILON * Math.max(1, r.maxScore), 0);
  }
  const tiny = C.receive(coarseY.map(z => z.map(v => v * 1e-9)), known.coarse);
  assert.equal(tiny.estimateM, 0); assert.equal(tiny.tieCount, 25);
  assert.ok(tiny.maxScore > tiny.selectedScore, 'raw maximum differs from tolerance-selected score');
});

test('unknown complex gain is fitted; global phase rotates the fit, not range or scores', () => {
  const template = C.receiverTemplates(C.X, C.F, [36.5]).templates[0];
  const alpha = [0.7, -1.3], result = C.receive(template.map(z => multiply(alpha, z)), known.fine);
  assert.equal(result.estimateM, 36.5); compare(result.fittedGain, alpha, 'fitted gain', 1e-14);
  assert.ok(result.residualEnergy < 1e-28);
  const original = fixtures['low-snr-counterexample'].trials[1].observation;
  const rotation = [Math.cos(2.17), Math.sin(2.17)];
  const before = C.receive(original, known.fine), after = C.receive(original.map(z => multiply(rotation, z)), known.fine);
  assert.equal(after.index, before.index); compare(after.scores, before.scores, 'rotated scores', 1e-14);
  compare(after.fittedGain, multiply(rotation, before.fittedGain), 'rotated gain', 1e-14);
  near(after.residualEnergy, before.residualEnergy, 1e-14);
});

test('independent real 2N×2 least-squares equations reproduce profile gain and direct residual', () => {
  for (const source of [fixtures['noise-free-offgrid'], fixtures['low-snr-counterexample']]) {
    const row = source.trials[source.settings.plotTrialIndex], y = row.observation;
    for (const key of ['coarse', 'fine']) {
      const actual = C.receive(y, known[key]);
      const directScores = known[key].templates.map(template => {
        let aa = 0, ab = 0, bb = 0, ay = 0, by = 0;
        for (let k = 0; k < 16; k++) {
          // Real design columns [ar,ai]^T and [-ai,ar]^T.
          const [ar, ai] = template[k], [yr, yi] = y[k];
          aa += ar * ar + ai * ai; ab += ar * -ai + ai * ar; bb += ai * ai + ar * ar;
          ay += ar * yr + ai * yi; by += -ai * yr + ar * yi;
        }
        const determinant = aa * bb - ab * ab;
        const re = (bb * ay - ab * by) / determinant, im = (aa * by - ab * ay) / determinant;
        return re * re + im * im;
      });
      compare(actual.scores, directScores, 'real LS scores', 1e-13);
      const directResidual = known[key].templates[actual.index].reduce((sum, z, k) => {
        const fit = multiply(actual.fittedGain, z);
        return sum + (y[k][0] - fit[0]) ** 2 + (y[k][1] - fit[1]) ** 2;
      }, 0);
      near(actual.residualEnergy, directResidual, 1e-14);
    }
  }
});

test('finite-tone ideal response agrees with geometric sum, null offsets, and 150 m periodicity', () => {
  const truth = 43.7, grid = [0, 43.7 - 9.375, 43.7, 43.7 + 9.375, 120, 193.7];
  const scores = C.idealResponse(truth, grid);
  grid.forEach((candidate, i) => {
    const d = 2 * Math.PI * 1000000 * 2 * (candidate - truth) / 300000000;
    const expected = Math.abs(Math.sin(d / 2)) < 1e-14 ? 1 : (Math.sin(16 * d / 2) / (16 * Math.sin(d / 2))) ** 2;
    near(scores[i], expected, 1e-13);
  });
  assert.ok(scores[1] < 1e-27 && scores[3] < 1e-27);
  near(scores[2], 1, 1e-14); near(scores[5], 1, 1e-14);
  const zero = C.idealResponse(0, [0,120]);
  assert.ok(zero[1] < 0.01, 'distinct search endpoints, no wrapped difference');
});

test('noise is complex variance / 2 per real component and standardized draws persist across truth and SNR', () => {
  const settings = [25.1, 0.7, -5, 7, 1];
  const [y, meta] = C.generateObservation(...settings);
  const [clean, noiselessMeta] = C.generateObservation(25.1, 0.7, null, 7, 1);
  const [higher, higherMeta] = C.generateObservation(25.1, 0.7, 5, 7, 1);
  const [shifted, shiftedMeta] = C.generateObservation(80.234567, -1.2, -5, 7, 1);
  const [shiftedClean] = C.generateObservation(80.234567, -1.2, null, 7, 1);
  const normal = new C.RandomStream(7, meta.domain), scale = Math.sqrt(meta.sigma2 / 2);
  let noiseEnergy = 0;
  for (let k = 0; k < 16; k++) for (let component = 0; component < 2; component++) {
    const noise = y[k][component] - clean[k][component];
    near(noise, scale * normal.normal(), 5e-16);
    near(higher[k][component] - clean[k][component], noise / Math.sqrt(10), 5e-16);
    near(shifted[k][component] - shiftedClean[k][component], noise, 5e-16);
    noiseEnergy += noise * noise;
  }
  near(meta.sigma2, 1 / (16 * 10 ** -0.5), 0); near(noiseEnergy, meta.noiseEnergy, 2e-15);
  for (const other of [noiselessMeta, higherMeta, shiftedMeta]) {
    assert.equal(other.domain, meta.domain); assert.deepEqual(other.initialStateUint32, meta.initialStateUint32);
  }
  assert.equal(noiselessMeta.sigma2, 0); assert.equal(noiselessMeta.noiseEnergy, 0);
  let draws = 0;
  const original = C.RandomStream.prototype.normal;
  C.RandomStream.prototype.normal = function() { draws++; return original.call(this); };
  try { C.generateObservation(43.7, 0.7, null, 0, 999); } finally { C.RandomStream.prototype.normal = original; }
  assert.equal(draws, 32, 'noiseless runs still draw each real/imag standardized normal');
});

test('all-row metrics retain gross and boundary errors; strict threshold and physical signed difference', () => {
  const r = results['low-snr-counterexample'];
  for (const key of ['coarse', 'fine']) {
    const values = r.trials.map(row => row[key].signedErrorM);
    near(Math.sqrt(values.reduce((sum, e) => sum + e * e, 0) / values.length), r.summary[key].rmseM, 2e-12);
    near(values.reduce((sum, e) => sum + e, 0) / values.length, r.summary[key].biasM, 2e-13);
    assert.equal(values.filter(e => Math.abs(e) > 9.375).length, r.summary[key].grossErrorCount);
    assert.equal(Math.max(...values.map(Math.abs)), 94.9);
    assert.ok(r.trials.some(row => row[key].estimateM === 120 && row[key].signedErrorM === 94.9));
    assert.ok(r.trials.some(row => row[key].estimateM === 0 && row[key].signedErrorM === -25.1));
  }
  assert.equal(r.summary.coarse.boundaryEstimateCount, 17); assert.equal(r.summary.fine.boundaryEstimateCount, 7);
  assert.equal(r.summary.paired.fineLowerAbsoluteErrorCount, 219);
  assert.equal(r.summary.paired.equalAbsoluteErrorCount, 132);
  assert.equal(r.summary.paired.fineHigherAbsoluteErrorCount, 649);
  const fabricated = {status: 'estimate', estimateM: 9.375};
  assert.equal(C.resultMetrics(fabricated, 0).grossError, false);
  assert.equal(C.resultMetrics({...fabricated, estimateM: 9.37500001}, 0).grossError, true);
  assert.equal(C.resultMetrics({status: 'estimate', estimateM: 120}, 25.1).signedErrorM, 94.9);
});

test('deterministic repeated runs and longer runs preserve complete trial prefixes', () => {
  const settings = {...C.PRESETS['low-snr-counterexample'], trials: 17};
  const short = C.experiment(settings), repeat = C.experiment(settings);
  assert.deepEqual(short, repeat);
  assert.deepEqual(short.trials, results['low-snr-counterexample'].trials.slice(0, 17));
  const changed = C.experiment({...settings, seedUint32: 8});
  assert.notDeepEqual(changed.trials[0].observation, short.trials[0].observation);
  assert.notDeepEqual(changed.trials[0].initialStateUint32, short.trials[0].initialStateUint32);
  const selectedFirst = C.experiment({...settings, plotTrialIndex: 16});
  assert.deepEqual(selectedFirst.summary, short.summary);
  assert.deepEqual(selectedFirst.trials, short.trials);
});

test('selected trial rescoring uses only saved Y, changes only plot/settings, no RNG or mutation', () => {
  const original = results['low-snr-counterexample'], saved = JSON.stringify(original);
  const normal = C.RandomStream.prototype.normal;
  C.RandomStream.prototype.normal = () => { throw new Error('RNG forbidden during selection/plotting'); };
  try {
    for (const index of [0, 1, 11, 999, 1]) {
      const selected = C.selectTrial(original, index);
      assert.equal(selected.settings.plotTrialIndex, index); assert.equal(selected.plot.trialIndex, index);
      assert.strictEqual(selected.trials, original.trials); assert.strictEqual(selected.summary, original.summary);
      compare(selected.plot.fineScores, C.receive(original.trials[index].observation, known.fine).scores);
      assert.equal(JSON.stringify(original), saved);
    }
    C.idealResponse(43.7, [0, 43.7, 120]);
  } finally { C.RandomStream.prototype.normal = normal; }
  for (const index of [-1, 1000, 1.5, NaN]) assert.throws(() => C.selectTrial(original, index), /existing attempted/);
});

test('chunked sessions match synchronous output, snapshots are isolated, and completion is stable', () => {
  const o = {...C.PRESETS['high-snr-offgrid'], trials: 29};
  const session = C.createSession(o);
  assert.equal(session.status, 'running'); assert.equal(session.done, false); assert.equal(session.attempted, 0);
  assert.equal(session.totalTrials, 29);
  assert.deepEqual(session.runChunk(7), {done: false, attemptedTrials: 7, totalTrials: 29, status: 'running'});
  const partial = session.getRecord();
  assert.equal(partial.trials.length, 7); assert.equal(partial.settings.trials, 29);
  assert.equal(partial.summary.coarse.rmseM, null); assert.match(partial.summary.coarse.status, /incomplete; running/);
  partial.trials[0].observation[0][0] = 999;
  assert.notEqual(session.getRecord().trials[0].observation[0][0], 999);
  while (!session.done) session.step(7);
  assert.equal(session.status, 'complete'); assert.equal(session.attempted, 29);
  assert.deepEqual(session.getRecord(), C.experiment(o));
  assert.deepEqual(session.cancel(), session.getRecord(), 'late cancellation does not invalidate a complete run');
  assert.equal(session.runChunk(5).attemptedTrials, 29, 'no duplicate trials on repeated run after completion');
  assert.deepEqual(session.finish(), session.snapshot());
  const selected = session.selectTrial(28);
  assert.equal(selected.plot.trialIndex, 28);
  assert.deepEqual(selected.trials, C.experiment(o).trials);
});

test('cancellation preserves attempted rows, declared B, and incomplete null headline metrics', () => {
  const session = C.createRun({...C.PRESETS['low-snr-counterexample'], trials: 100});
  session.runChunk(13);
  const stopped = session.cancel();
  assert.equal(session.status, 'cancelled'); assert.equal(session.done, true);
  assert.equal(stopped.settings.trials, 100); assert.equal(stopped.trials.length, 13);
  assert.deepEqual(stopped.trials, results['low-snr-counterexample'].trials.slice(0, 13));
  for (const key of ['coarse', 'fine']) {
    assert.equal(stopped.summary[key].attemptedTrials, 13); assert.equal(stopped.summary[key].successfulTrials, 13);
    assert.equal(stopped.summary[key].failedTrials, 0); assert.equal(stopped.summary[key].rmseM, null);
    assert.equal(stopped.summary[key].biasM, null); assert.equal(stopped.summary[key].grossErrorCount, null);
    assert.match(stopped.summary[key].status, /incomplete; cancelled; requested 100 trials/);
  }
  assert.deepEqual(session.finish(), stopped); session.runChunk(100);
  assert.deepEqual(session.getRecord(), stopped);
  const empty = C.createSession(C.PRESETS['high-snr-offgrid']).cancel();
  assert.equal(empty.trials.length, 0); assert.equal(empty.plot, null); assert.equal(empty.summary.fine.rmseM, null);
  const beforeSelected = C.createSession({...C.PRESETS['high-snr-offgrid'], plotTrialIndex: 99});
  beforeSelected.runChunk(2); assert.equal(beforeSelected.cancel().plot, null);
});

test('generation failures retain every attempted row; mixed and failed aggregates are never successes-only RMSE', () => {
  for (const overrides of [{truthRangeM: 121}, {truthPhaseRad: 4}, {snrDb: 21}, {seedUint32: -1}]) {
    const failed = C.experiment({...C.PRESETS['noise-free-offgrid'], ...overrides, trials: 3});
    assert.equal(failed.trials.length, 3); assert.equal(failed.plot, null);
    failed.trials.forEach((row, i) => {
      assert.equal(row.trialIndex, i); assert.equal(row.coarse.status, 'failed'); assert.equal(row.fine.status, 'failed');
      assert.ok(row.coarse.reason.length > 0); assert.ok(!Object.hasOwn(row, 'observation'));
    });
    for (const key of ['coarse', 'fine']) assert.deepEqual(failed.summary[key], {
      attemptedTrials: 3, successfulTrials: 0, failedTrials: 3, rmseM: null, biasM: null,
      grossErrorCount: null, status: 'incomplete; failed trials retained; aggregate not reported'});
  }
  const good = results['noise-free-offgrid'].trials[0];
  const rows = [good, {coarse: {status: 'failed', reason: 'injected numerical failure'}, fine: good.fine}];
  assert.equal(C.summarize(rows, 'coarse').rmseM, null); assert.equal(C.summarize(rows, 'coarse').failedTrials, 1);
  assert.equal(C.summarize(rows, 'fine').status, 'complete');
});


test('injected generation and receiver numerical failures remain explicit rows and finite JSON', () => {
  const normal = C.RandomStream.prototype.normal;
  let draw = 0, generated;
  C.RandomStream.prototype.normal = function() { return ++draw === 1 ? Infinity : normal.call(this); };
  try { generated = C.experiment({...C.PRESETS['high-snr-offgrid'], trials: 2}); }
  finally { C.RandomStream.prototype.normal = normal; }
  assert.equal(generated.trials.length, 2);
  assert.equal(generated.trials[0].coarse.status, 'failed');
  assert.match(generated.trials[0].coarse.reason, /finite/);
  assert.ok(!Object.hasOwn(generated.trials[0], 'observation'));
  assert.equal(generated.trials[1].coarse.status, 'estimate');
  assert.equal(generated.summary.coarse.failedTrials, 1);
  assert.equal(generated.summary.coarse.rmseM, null);
  assert.doesNotMatch(JSON.stringify(generated), /Infinity|NaN/);
  const max = Math.max;
  let call = 0, received;
  Math.max = (...args) => { if (++call === 1) throw new RangeError('injected receiver arithmetic failure'); return max(...args); };
  try { received = C.experiment({...C.PRESETS['high-snr-offgrid'], trials: 2}); }
  finally { Math.max = max; }
  assert.equal(received.trials.length, 2);
  assert.equal(received.trials[0].coarse.status, 'failed');
  assert.equal(received.trials[0].fine.status, 'estimate');
  assert.equal(received.trials[0].observation.length, 16);
  assert.equal(received.summary.coarse.rmseM, null);
  assert.equal(received.summary.fine.status, 'complete');
  assert.equal(received.summary.paired.successfulPairedTrials, 1);
  assert.deepEqual(Object.keys(received.plot).sort(), ['fineScores', 'trialIndex']);
});

test('invalid shapes/nonfinite inputs reject, no silent clipping, coercion, or NaN JSON measurement', () => {
  for (const y of [[], Array(15).fill([0,0]), [[NaN,0]], Array(16).fill([Infinity,0]), Array(16).fill([1e308,1e308])])
    assert.throws(() => C.receive(y, known.fine));
  for (const grid of [[], [1,1], [2,1], [0,NaN]]) assert.throws(() => C.receiverTemplates(C.X, C.F, grid));
  assert.throws(() => C.receiverTemplates(Array(16).fill([0,0]), C.F, [0]), /energy/);
  assert.throws(() => C.receiverTemplates(C.X, [0], [0]), /frequencies/);
  assert.throws(() => C.receiverTemplates(C.X, C.F, [0], 0), /speed/);
  for (const o of [{trials: 0}, {trials: 1001}, {trials: 1.5}, {plotTrialIndex: -1}, {plotTrialIndex: 1000},
    {plotTrialIndex: 0.5}, {truthRangeM: NaN}, {snrDb: Infinity}, {snrDb: -1e6}, {snrDb: 1e6}, {seedUint32: '7'}, {unknown: 1}])
    assert.throws(() => C.createSession(o));
  const session = C.createSession(C.PRESETS['noise-free-offgrid']);
  for (const size of [0, -1, 1001, 0.5, '1']) assert.throws(() => session.runChunk(size));
  for (const index of [-1, 1000, 0.5]) assert.throws(() => C.generateObservation(43.7, 0.7, null, 0, index));
});

test('receiver architecture accepts only Y and known templates; poisoned truth/noise/seed properties are never read', () => {
  assert.equal(C.receive.length, 2);
  const forbidden = ['truth','truthRangeM','truthPhaseRad','seed','seedUint32','noise','sigma2','snrDb','trueGain'];
  const trap = () => { throw new Error('forbidden generator information accessed by receiver'); };
  const plainKnown = {...known.fine}, observation = fixtures['low-snr-counterexample'].trials[1].observation.map(z => z.slice());
  for (const key of forbidden) {
    Object.defineProperty(plainKnown, key, {get: trap});
    Object.defineProperty(observation, key, {get: trap});
  }
  const result = C.receive(observation, plainKnown);
  assert.equal(result.estimateM, 24);
  const source = C.receive.toString();
  assert.doesNotMatch(source, /generateObservation|RandomStream|truthRangeM|truthPhaseRad|seedUint32|snrDb|Math\.(?:cos|sin|random)/);
  assert.deepEqual(Object.keys(known.fine).sort(), ['candidates','energy','templates']);
  assert.ok(Object.isFrozen(known.fine)); assert.ok(Object.isFrozen(known.fine.templates[0][0]));
  assert.ok(Object.isFrozen(C.X[0])); assert.ok(Object.isFrozen(C.PRESETS['noise-free-offgrid']));
});

test('precomputed receiver performs no trig; no model path calls Math.random', () => {
  const y = fixtures['low-snr-counterexample'].trials[1].observation;
  const original = {cos: Math.cos, sin: Math.sin, random: Math.random};
  const forbidden = () => { throw new Error('forbidden runtime trig/random'); };
  try {
    Math.cos = forbidden; Math.sin = forbidden; Math.random = forbidden;
    assert.equal(C.receive(y, known.fine).estimateM, 24);
  } finally { Object.assign(Math, original); }
  Math.random = forbidden;
  try {
    const r = C.experiment({...C.PRESETS['high-snr-offgrid'], trials: 3});
    assert.equal(r.summary.fine.failedTrials, 0);
    C.selectTrial(r, 2);
  } finally { Math.random = original.random; }
});

test('JSON export round trip replays every selected result using only resource ledger and saved Y', () => {
  for (const source of Object.values(results)) {
    const record = JSON.parse(JSON.stringify(source)), r = record.resources;
    assert.deepEqual(record, source);
    for (const key of ['coarse', 'fine']) {
      const prepared = C.receiverTemplates(r.knownWaveform, r.frequencyOffsetsHz, r[key + 'GridM'], r.cMps);
      for (const index of new Set([0, record.settings.plotTrialIndex, record.trials.length - 1])) {
        const row = record.trials[index], actual = C.resultMetrics(C.receive(row.observation, prepared), record.settings.truthRangeM);
        compare(actual, row[key], 'exported observation rescore');
      }
    }
    assert.doesNotMatch(JSON.stringify(record), /NaN|Infinity/);
  }
});

test('browser global loads without DOM, dependencies, network, or module globals', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../offgrid-range-core.js'), 'utf8'), context);
  assert.equal(context.OffgridRangeCore.MODEL_VERSION, C.MODEL_VERSION);
  const r = context.OffgridRangeCore.experiment(context.OffgridRangeCore.PRESETS['noise-free-offgrid']);
  assert.equal(r.trials[0].coarse.estimateM, 45); assert.equal(r.trials[0].fine.estimateM, 43.5);
});

test('independent reference, complete sweeps, fixture provenance and original verification are retained', () => {
  for (const name of ['reference.py','verify_reference.py','verify_port.cjs','probe.py','probe_initial.py',
    'probe_initial_results.txt','probe_low_snr_results.txt','verification.json','port-verification.json','README.md'])
    assert.ok(fs.statSync(path.join(root, name)).size > 0, name);
  const verification = JSON.parse(fs.readFileSync(path.join(root, 'verification.json')));
  assert.equal(verification.passedChecks, 80);
  const manifest = readFixture('summary');
  for (const name of Object.keys(C.PRESETS)) {
    const bytes = fs.readFileSync(path.join(root, 'fixtures', name + '.json'));
    assert.equal(bytes.length, manifest[name].bytes);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), manifest[name].sha256);
  }
  assert.ok(!fs.existsSync(path.join(root, '__pycache__')));
  for (const name of ['probe.py', 'probe_initial.py', 'README.md'])
    assert.doesNotMatch(fs.readFileSync(path.join(root, name), 'utf8'), /\/workspace\/|\/root\/|\/tmp\//);
});
