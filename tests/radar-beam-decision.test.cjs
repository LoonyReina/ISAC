'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../radar-beam-decision-core.js');
const defaultRuns = core.MODES.map(mode => core.run({}, mode));
const close = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

function checkMembership(result) {
  const { config: cfg, dataset, train, test: anchors, mode } = result;
  const trainSet = new Set(train);
  assert.equal(train.length, cfg.trainBudget);
  assert.equal(trainSet.size, train.length);
  assert.ok(anchors.every(i => !trainSet.has(i)));
  assert.ok(anchors.every(i => { const row = dataset.rows[i]; return row.scene === cfg.scenes - 1 && row.run >= cfg.runsPerScene - 4 && row.frame % 4 === 2; }));
  if (mode === 'held_trajectories') assert.ok(train.every(i => { const row = dataset.rows[i]; return row.scene !== cfg.scenes - 1 || row.run < cfg.runsPerScene - 4; }));
  if (mode === 'held_scene') assert.ok(train.every(i => dataset.rows[i].scene !== cfg.scenes - 1));
  assert.equal(result.splitSummary.testRunCount, 4);
  if (mode !== 'interleaved_frames') {
    assert.equal(result.splitSummary.overlappingRuns, 0);
    assert.equal(result.splitSummary.nearbyAnchorCount, 0);
  }
}
function checkMonotonic(result, budgets) {
  let previous = null;
  for (const k of budgets) {
    const actual = core.metrics(result, k);
    if (previous) {
      assert.ok(actual.topKHitRate >= previous.topKHitRate);
      assert.ok(actual.meanLossDb <= previous.meanLossDb + 1e-12);
      assert.ok(actual.p95LossDb <= previous.p95LossDb + 1e-12);
      assert.ok(actual.lossAboveThresholdRate <= previous.lossAboveThresholdRate);
      actual.perSample.forEach((sample, i) => {
        assert.ok(sample.lossDb <= previous.perSample[i].lossDb + 1e-12);
        assert.ok(!previous.perSample[i].hit || sample.hit);
        assert.deepEqual(sample.candidates.slice(0, previous.k), previous.perSample[i].candidates);
      });
    }
    previous = actual;
  }
  assert.equal(previous.k, result.config.beams);
  assert.equal(previous.topKHitRate, 1);
  assert.equal(previous.beamMissRate, 0);
  assert.equal(previous.meanLossDb, 0);
  assert.equal(previous.p95LossDb, 0);
  assert.equal(previous.lossAboveThresholdRate, 0);
  assert.equal(previous.probeFraction, 1);
  assert.equal(previous.idealProbeCountSavedFraction, 0);
}

test('independent synthetic defaults, rows and matched fixed anchors', () => {
  assert.deepEqual(core.DEFAULT_CONFIG, { seed: 37, elements: 16, beams: 64, scenes: 3, runsPerScene: 12, framesPerRun: 64, trainBudget: 512, neighbors: 7, sceneShift: .12, runShift: .04, contextWeight: .18, noiseSd: .006, lossThresholdDb: 3, tieTolerance: 1e-12 });
  assert.equal(defaultRuns[0].dataset.rows.length, 2304);
  for (const run of defaultRuns) {
    checkMembership(run);
    assert.equal(run.test.length, 64);
    assert.deepEqual(run.test, defaultRuns[0].test);
    assert.ok(Object.isFrozen(run.predictions));
    assert.ok(run.predictions.every(p => Object.isFrozen(p) && Object.isFrozen(p.ranking)));
    assert.ok(run.predictions.every(p => new Set(p.ranking).size === 64));
  }
});

test('ULA unit norm, all codebook midpoint labels, numerical null and power bounds', () => {
  const beamU = defaultRuns[0].dataset.beamU;
  beamU.forEach((u, index) => close(core.beamPowers(u, beamU)[index], 1));
  for (let j = 0; j < beamU.length - 1; j++) {
    const power = core.beamPowers((beamU[j] + beamU[j + 1]) / 2, beamU);
    assert.equal(core.lowestTiedMax(power), j);
    assert.equal(core.rankWithTies(power)[0], j);
  }
  for (const row of defaultRuns[0].dataset.rows) assert.ok(row.power.every(p => p >= 0 && p <= 1 + 1e-12));
  assert.ok(core.beamPowers(0, [.125], 16)[0] > 0, 'analytic null retains a tiny floating-point sinc residual');
  close(core.beamPowers(1, [-1], 16)[0], 1);
});

test('anchored ranking does not use a nontransitive pairwise tolerance comparison', () => {
  assert.deepEqual(core.rankWithTies([0, .75, 1.5], 1), [1, 2, 0]);
  assert.deepEqual(core.rankWithTies([1 - 1.5e-12, 1 - .75e-12, 1]), [1, 2, 0]);
  assert.deepEqual(core.rankWithTies([.5, .5, .5]), [0, 1, 2]);
  assert.equal(core.lowestTiedMax([.5, .5]), 0);
});

test('evaluation uses actual power maximum, never the tolerance-tied label power', () => {
  const cfg = { beams: 2, trainBudget: 7 };
  const power = [1 - .5e-12, 1], label = core.lowestTiedMax(power);
  assert.equal(label, 0);
  const sample = core.evaluateSample({ id: 0, power, label }, { ranking: [0, 1] }, 1, cfg);
  assert.equal(sample.hit, true);
  assert.equal(sample.bestPower, 1);
  assert.ok(sample.lossDb > 0);
  close(sample.lossDb, 10 * (Math.log10(1) - Math.log10(power[0])), 1e-20);
});

test('loss is uncapped, exact zero is infinite, small positive powers are not floored', () => {
  assert.equal(core.lossDb(1, 0), Infinity);
  assert.equal(core.lossDb(1, 1), 0);
  close(core.lossDb(1, Number.MIN_VALUE), 3233.062153431158, 1e-10);
  const result = { config: core.normalizeConfig({ beams: 2, trainBudget: 7 }),
    dataset: { rows: [{ id: 0, label: 1, power: [0, 1] }] }, test: [0], predictions: [{ ranking: [0, 1] }] };
  const m = core.metrics(result, 1);
  assert.equal(m.meanLossDb, Infinity);
  assert.equal(m.p95LossDb, Infinity);
  assert.equal(m.lossAboveThresholdRate, 1);
  assert.equal(core.metrics(result, 2).meanLossDb, 0);
});

test('fixed original NumPy seed-49 null-proximity fixture is preserved without claiming JS sample membership', () => {
  // Original NumPy PCG64 prototype, held-scene row 2266 / selected beam 40.
  // This is a supplied metric fixture, NOT a JavaScript-generated seed-49 row.
  const best = .9960103361670658, achieved = 3.1550589621386463e-13;
  close(core.lossDb(best, achieved), 124.99256365562623, 1e-10);
  assert.ok(core.lossDb(best, achieved) > 10 * Math.log10(best / 1e-12) + 4.9);
});

test('test-label, oracle-power and true-direction interventions cannot change predictions', () => {
  const result = core.run(), { dataset, train, test: anchors, config } = result;
  const before = core.predictRankings(dataset, train, anchors, config);
  for (const index of anchors) {
    const row = dataset.rows[index];
    row.label = (row.label + 13) % config.beams;
    row.power = Array(config.beams).fill(.1);
    row.trueU = .9;
  }
  assert.deepEqual(core.predictRankings(dataset, train, anchors, config), before);
  // Stronger structural boundary: make every forbidden test input throw on access.
  for (const index of anchors) for (const key of ['label', 'power', 'trueU']) {
    Object.defineProperty(dataset.rows[index], key, { get() { throw Error(`Oracle ${key} was read`); } });
  }
  assert.deepEqual(core.predictRankings(dataset, train, anchors, config), before);
});

test('renaming all metadata preserves predictions at fixed membership', () => {
  const result = core.run(), before = result.predictions;
  result.dataset.rows.forEach(row => {
    row.id = `renamed-${row.id}`; row.scene = 'hidden'; row.run = -999; row.frame = null;
  });
  assert.deepEqual(core.predictRankings(result.dataset, result.train, result.test, result.config), before);
});

test('supervised predictor depends on training labels and copies its training inputs', () => {
  const beamU = defaultRuns[0].dataset.beamU, x = Array.from({ length: 7 }, () => [0, 0, 0]);
  const left = core.fitPredictor(x, Array(7).fill(10), beamU);
  const right = core.fitPredictor(x, Array(7).fill(50), beamU);
  assert.equal(left.predict([0, 0, 0]).ranking[0], 10);
  assert.equal(right.predict([0, 0, 0]).ranking[0], 50);
  assert.notDeepEqual(left.predict([0, 0, 0]), right.predict([0, 0, 0]));
  const before = left.predict([0, 0, 0]);
  x[0][0] = 12345;
  assert.deepEqual(left.predict([0, 0, 0]), before);
  assert.throws(() => left.predict({ x: [0, 0, 0], label: 10 }));
});

test('all 64 nested budgets are monotone and exhaustive for each split', () => {
  for (const run of defaultRuns) checkMonotonic(run, Array.from({ length: 64 }, (_, i) => i + 1));
});

test('seed reset is reproducible; different seeds alter observations and memberships', () => {
  assert.deepEqual(core.run(), defaultRuns[1]);
  const other = core.run({ seed: 38 });
  assert.notDeepEqual(other.dataset.rows[0].x, defaultRuns[1].dataset.rows[0].x);
  assert.notDeepEqual(other.train, defaultRuns[1].train);
  assert.deepEqual(other.test, defaultRuns[1].test);
  assert.match(core.RNG_DESCRIPTION, /not bit-identical.*NumPy PCG64/);
});

test('forty seed/control settings validate membership and metrics without imposing score ordering', () => {
  for (let seed = 0; seed < 20; seed++) {
    for (const control of ['shifted', 'zero_shifts']) {
      const cfg = control === 'shifted' ? { seed } : { seed, sceneShift: 0, runShift: 0 };
      let anchors = null;
      for (const mode of core.MODES) {
        const result = core.run(cfg, mode);
        checkMembership(result);
        if (anchors) assert.deepEqual(result.test, anchors);
        anchors = result.test;
        checkMonotonic(result, [1, 3, 5, 8, 16, 64]);
      }
    }
  }
});

test('fully neutral context control and invalid parameter guards', () => {
  for (const mode of core.MODES) checkMonotonic(core.run({ sceneShift: 0, runShift: 0, contextWeight: 0 }, mode), [1, 5, 64]);
  assert.throws(() => core.run({ seed: -1 }));
  assert.throws(() => core.run({ trainBudget: 99999 }));
  assert.throws(() => core.run({}, 'unknown'));
  assert.throws(() => core.metrics(defaultRuns[0], 0));
  assert.throws(() => core.metrics(defaultRuns[0], 65));
  assert.throws(() => core.lossDb(0, 0));
  assert.throws(() => core.rankWithTies([NaN]));
  assert.throws(() => core.normalizeConfig({ neighbors: 513 }));
});

test('dense nonempty predictor inputs reject sparse or malformed arrays', () => {
  const beamU = defaultRuns[0].dataset.beamU;
  const x = Array.from({ length: 7 }, () => [0, 0, 0]), labels = Array(7).fill(10);
  const invalidRows = [null, {}, Array(7), [[], ...x.slice(1)], [[0, , 0], ...x.slice(1)], [x[0], , ...x.slice(2)]];
  for (const input of invalidRows) assert.throws(() => core.fitPredictor(input, labels, beamU), RangeError);
  for (const input of [null, {}, [], Array(7), [10, , 10, 10, 10, 10, 10], [10, 10, 10, 10, 10, 10, NaN]]) {
    assert.throws(() => core.fitPredictor(x, input, beamU), RangeError);
  }
  for (const input of [null, [], Array(64), beamU.map((v, i) => i === 3 ? Infinity : v), beamU.map((v, i) => i === 3 ? 1.01 : v)]) {
    assert.throws(() => core.fitPredictor(x, labels, input), RangeError);
  }
  const model = core.fitPredictor(x, labels, beamU);
  for (const query of [null, {}, [], Array(3), [0, , 0], [0, NaN, 0], [0, Infinity, 0]]) {
    assert.throws(() => model.predict(query), RangeError);
  }
  assert.deepEqual(model.predict(new Float64Array([0, 0, 0])), model.predict([0, 0, 0]));
});

test('bounded controls and finite-distance overflow are rejected explicitly', () => {
  for (const key of ['sceneShift', 'runShift', 'contextWeight', 'noiseSd', 'tieTolerance']) {
    assert.throws(() => core.normalizeConfig({ [key]: Number.MAX_VALUE }), RangeError);
  }
  for (const input of [null, [], 'configuration']) assert.throws(() => core.normalizeConfig(input), RangeError);
  const beamU = defaultRuns[0].dataset.beamU;
  const model = core.fitPredictor(Array.from({ length: 7 }, () => [0, 0, 0]), Array(7).fill(10), beamU);
  assert.throws(() => model.predict([Number.MAX_VALUE, 0, 0]), /distance overflow/);
  assert.throws(() => model.predict([1e154, 1e154, 1e154]), /distance overflow/);
  const distant = model.predict([1e153, 1e153, 1e153]);
  assert.ok(Number.isFinite(distant.estimatedU));
  const boundary = core.generate({ sceneShift: 2, runShift: 2, contextWeight: 2, noiseSd: 1 });
  assert.ok(boundary.rows.every(row => row.x.every(Number.isFinite)));
});

test('ULA geometry uses physical direction cosines and rejects sparse or overflowing inputs', () => {
  for (const u of [NaN, Infinity, Number.MAX_VALUE, -1.01, 1.01]) assert.throws(() => core.beamPowers(u, [0]), RangeError);
  for (const beamU of [null, [], Array(2), [0, , .5], [0, Number.MAX_VALUE], [0, -1.01]]) assert.throws(() => core.beamPowers(0, beamU), RangeError);
  for (const elements of [0, 1.5, 257, Infinity]) assert.throws(() => core.beamPowers(0, [0], elements), RangeError);
  close(core.beamPowers(-1, [1], 16)[0], 1);
  close(core.beamPowers(1, [-1], 16)[0], 1);
});

test('single-sample evaluation rejects sparse full rankings even beyond the probed prefix', () => {
  const row = { id: 0, label: 0, power: Array(64).fill(.5) };
  const ranking = Array.from({ length: 64 }, (_, i) => i);
  delete ranking[63];
  for (const k of [1, 63, 64]) {
    assert.throws(() => core.evaluateSample(row, { ranking }, k), /full candidate ranking must be dense and finite/);
  }
  const complete = Array.from({ length: 64 }, (_, i) => i);
  const power = Array(64).fill(.5);
  delete power[63];
  assert.throws(() => core.evaluateSample({ ...row, power }, { ranking: complete }, 1), /evaluation powers must be dense and finite/);
  assert.throws(() => core.evaluateSample(row, { ranking: Array(64).fill(0) }, 1), /Invalid candidate list/);
  assert.equal(core.evaluateSample(row, { ranking: complete }, 1).lossDb, 0);
});
