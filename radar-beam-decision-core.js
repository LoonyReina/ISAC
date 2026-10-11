/* Independent synthetic radar-aided communication-beam teaching model.
 * No DeepSense measurements, author code, CNN, or paper-score reproduction.
 * RNG: Mulberry32 uint32 + cached Box–Muller normals, partial Fisher–Yates
 * split sampling. This is deterministic JavaScript, NOT NumPy PCG64 parity.
 * Labels and ranks use an anchored 1e-12 power near-tie rule. Loss uses the
 * actual maximum power, no floor; a display dB floor must never enter metrics.
 */
(function (root) {
  'use strict';
  const DEFAULT_CONFIG = Object.freeze({
    seed: 37, elements: 16, beams: 64, scenes: 3, runsPerScene: 12,
    framesPerRun: 64, trainBudget: 512, neighbors: 7,
    sceneShift: 0.12, runShift: 0.04, contextWeight: 0.18,
    noiseSd: 0.006, lossThresholdDb: 3, tieTolerance: 1e-12
  });
  const MODES = Object.freeze(['interleaved_frames', 'held_trajectories', 'held_scene']);
  const RNG_DESCRIPTION = 'Mulberry32 uint32, cached Box–Muller normals, partial Fisher–Yates sampling; not bit-identical to the NumPy PCG64 prototype';

  function normalizeConfig(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RangeError('Configuration must be an object');
    const cfg = { ...DEFAULT_CONFIG, ...input };
    for (const [key, min, max] of [
      ['seed', 0, 0xffffffff], ['elements', 1, 256], ['beams', 2, 256],
      ['scenes', 2, 12], ['runsPerScene', 4, 64], ['framesPerRun', 4, 512],
      ['trainBudget', 1, 100000], ['neighbors', 1, 512]
    ]) {
      if (!Number.isInteger(cfg[key]) || cfg[key] < min || cfg[key] > max) {
        throw new RangeError(`${key} must be an integer in [${min}, ${max}]`);
      }
    }
    // Supported teaching-control domain, not an unrestricted physical simulator.
    for (const [key, max] of [['sceneShift', 2], ['runShift', 2], ['contextWeight', 2], ['noiseSd', 1], ['tieTolerance', 1e-6]]) {
      if (!Number.isFinite(cfg[key]) || cfg[key] < 0 || cfg[key] > max) throw new RangeError(`${key} must be finite and in [0, ${max}]`);
    }
    if (!Number.isFinite(cfg.lossThresholdDb) || cfg.lossThresholdDb < 0) throw new RangeError('lossThresholdDb must be finite and nonnegative');
    if (cfg.neighbors > cfg.trainBudget) throw new RangeError('neighbors cannot exceed trainBudget');
    return Object.freeze(cfg);
  }

  function createRng(seed) {
    let state = seed >>> 0, spare = null;
    function uniform() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function normal() {
      if (spare !== null) { const value = spare; spare = null; return value; }
      // 1-U is in (0,1], so log(0) is excluded without consuming extra draws.
      const radius = Math.sqrt(-2 * Math.log(1 - uniform()));
      const phase = 2 * Math.PI * uniform();
      spare = radius * Math.sin(phase);
      return radius * Math.cos(phase);
    }
    return { uniform, normal };
  }

  function finiteVector(value, name, length) {
    const isVector = Array.isArray(value) || (ArrayBuffer.isView(value) && !(value instanceof DataView));
    if (!isVector || !value.length || (length !== undefined && value.length !== length)) throw new RangeError(`Invalid ${name} dimensions`);
    // Array.from turns sparse holes into undefined; every() then rejects them.
    const vector = Array.from(value);
    if (!vector.every(item => Number.isFinite(item))) throw new RangeError(`${name} must be dense and finite`);
    return vector;
  }
  const sinc = x => x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
  function beamPowers(u, beamU, elements = DEFAULT_CONFIG.elements) {
    // u and every codebook center mean sin(theta), hence [-1,1]. Biased sensor
    // x[0] is a feature proxy and can lie outside that physical geometry domain.
    if (!Number.isFinite(u) || Math.abs(u) > 1 || !Number.isInteger(elements) || elements < 1 || elements > 256) throw new RangeError('ULA needs u in [-1,1] and 1..256 integer elements');
    return finiteVector(beamU, 'beam codebook').map(center => {
      if (Math.abs(center) > 1) throw new RangeError('Beam direction cosine must be in [-1,1]');
      // Half-wavelength ULA is periodic in direction cosine with period 2.
      // Reduce to [-1,1] for a removable singularity at even differences.
      const delta = u - center;
      const d = delta - 2 * Math.round(delta / 2);
      return (sinc(elements * d / 2) / sinc(d / 2)) ** 2;
    });
  }

  function validatePowers(powers) {
    if (!powers || !powers.length || Array.from(powers).some(p => !Number.isFinite(p) || p < 0)) {
      throw new RangeError('Powers must be a nonempty finite nonnegative vector');
    }
  }
  function lowestTiedMax(powers, atol = DEFAULT_CONFIG.tieTolerance) {
    validatePowers(powers);
    if (!Number.isFinite(atol) || atol < 0) throw new RangeError('Invalid power tolerance');
    const maximum = Math.max(...powers);
    return Array.from(powers).findIndex(p => p >= maximum - atol);
  }
  function rankWithTies(powers, atol = DEFAULT_CONFIG.tieTolerance) {
    validatePowers(powers);
    if (!Number.isFinite(atol) || atol < 0) throw new RangeError('Invalid power tolerance');
    const available = powers.map(() => true), ranking = [];
    // Never use a pairwise tolerance comparator: that relation is nontransitive.
    // Re-anchor at the ACTUAL remaining maximum on every selection.
    for (let k = 0; k < powers.length; k++) {
      let maximum = -Infinity;
      for (let j = 0; j < powers.length; j++) if (available[j] && powers[j] > maximum) maximum = powers[j];
      let chosen = 0;
      while (!available[chosen] || powers[chosen] < maximum - atol) chosen++;
      ranking.push(chosen);
      available[chosen] = false;
    }
    return ranking;
  }

  function generate(input = {}) {
    const cfg = normalizeConfig(input), rng = createRng(cfg.seed);
    const beamU = Array.from({ length: cfg.beams }, (_, j) => -0.95 + 1.9 * j / (cfg.beams - 1));
    const rows = [];
    for (let scene = 0; scene < cfg.scenes; scene++) {
      const sceneContext = 2 * scene / (cfg.scenes - 1) - 1;
      for (let run = 0; run < cfg.runsPerScene; run++) {
        const runContext = 2 * rng.uniform() - 1;
        const runOffset = cfg.runShift * (2 * rng.uniform() - 1);
        const originJitter = 0.04 * rng.uniform() - 0.02;
        const direction = run % 2 === 0 ? 1 : -1;
        let commonNoise = 0;
        for (let frame = 0; frame < cfg.framesPerRun; frame++) {
          const trueU = direction * (-0.8 + 1.6 * frame / (cfg.framesPerRun - 1)) + originJitter;
          commonNoise = 0.8 * commonNoise + 0.6 * cfg.noiseSd * rng.normal();
          const x = [trueU + cfg.sceneShift * sceneContext + runOffset + commonNoise,
            cfg.contextWeight * sceneContext, cfg.contextWeight * runContext];
          const power = beamPowers(trueU, beamU, cfg.elements);
          rows.push({ id: rows.length, scene, run, frame, trueU, x, power,
            label: lowestTiedMax(power, cfg.tieTolerance) });
        }
      }
    }
    return { rows, beamU, rng: RNG_DESCRIPTION };
  }

  function splitIndices(dataset, input = {}, mode = 'held_trajectories') {
    const cfg = normalizeConfig(input);
    if (!MODES.includes(mode)) throw new RangeError(`Unknown split mode: ${mode}`);
    const targetScene = cfg.scenes - 1, firstTargetRun = cfg.runsPerScene - 4;
    const isTarget = row => row.scene === targetScene && row.run >= firstTargetRun;
    const test = [], pool = [];
    dataset.rows.forEach((row, index) => {
      if (isTarget(row) && row.frame % 4 === 2) test.push(index);
      else if (!(mode === 'held_trajectories' && isTarget(row)) &&
        !(mode === 'held_scene' && row.scene === targetScene)) pool.push(index);
    });
    if (pool.length < cfg.trainBudget) throw new RangeError('Eligible pool is smaller than trainBudget');
    if (!test.length) throw new RangeError('No test anchors');
    const rng = createRng((cfg.seed + 1009) >>> 0);
    // Partial Fisher–Yates gives a uniform sample without replacement.
    for (let i = 0; i < cfg.trainBudget; i++) {
      const j = i + Math.floor(rng.uniform() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return { train: pool.slice(0, cfg.trainBudget).sort((a, b) => a - b), test,
      eligibleCount: pool.length, targetScene, firstTargetRun };
  }

  function fitPredictor(trainX, trainLabels, beamU, input = {}) {
    const cfg = normalizeConfig(input);
    if (!Array.isArray(trainX) || !trainX.length || cfg.neighbors > trainX.length) throw new RangeError('Inconsistent training dimensions');
    const dimensions = finiteVector(trainX[0], 'training feature').length;
    const x = Array.from(trainX, row => finiteVector(row, 'training feature', dimensions));
    const codebook = finiteVector(beamU, 'beam codebook', cfg.beams);
    if (codebook.some(value => Math.abs(value) > 1)) throw new RangeError('Beam direction cosine must be in [-1,1]');
    const targetU = finiteVector(trainLabels, 'training labels', x.length).map(label => {
      if (!Number.isInteger(label) || label < 0 || label >= codebook.length) throw new RangeError('Invalid training label');
      return codebook[label];
    });
    // Capture only feature vectors, training targets, fixed geometry and settings.
    // The returned predictor cannot receive metadata, true u, or test powers/labels.
    function predict(queryX) {
      const query = finiteVector(queryX, 'observed feature', dimensions);
      const nearest = x.map((row, index) => {
        const distance = row.reduce((sum, value, j) => sum + (value - query[j]) ** 2, 0);
        if (!Number.isFinite(distance)) throw new RangeError('Feature distance overflow');
        return { index, distance };
      }).sort((a, b) => a.distance - b.distance || a.index - b.index).slice(0, cfg.neighbors);
      let weightedTarget = 0, totalWeight = 0;
      nearest.forEach(item => {
        const weight = 1 / (item.distance + 1e-6);
        weightedTarget += weight * targetU[item.index];
        totalWeight += weight;
      });
      if (!Number.isFinite(weightedTarget) || !Number.isFinite(totalWeight) || totalWeight <= 0) throw new RangeError('Weighted prediction overflow');
      const estimatedU = weightedTarget / totalWeight;
      if (!Number.isFinite(estimatedU) || Math.abs(estimatedU) > 1) throw new RangeError('Invalid predicted direction cosine');
      const ranking = Object.freeze(rankWithTies(beamPowers(estimatedU, codebook, cfg.elements), cfg.tieTolerance));
      return Object.freeze({ estimatedU, ranking });
    }
    return Object.freeze({ predict });
  }

  function predictRankings(dataset, train, test, input = {}) {
    const model = fitPredictor(train.map(i => dataset.rows[i].x),
      train.map(i => dataset.rows[i].label), dataset.beamU, input);
    return Object.freeze(test.map(i => model.predict(dataset.rows[i].x)));
  }

  function describeSplit(dataset, split) {
    const group = row => `${row.scene}/${row.run}`;
    const trainingGroups = new Set(split.train.map(i => group(dataset.rows[i])));
    const testGroups = new Set(split.test.map(i => group(dataset.rows[i])));
    const nearby = split.test.filter(i => split.train.some(j => {
      const a = dataset.rows[i], b = dataset.rows[j];
      return a.scene === b.scene && a.run === b.run && Math.abs(a.frame - b.frame) <= 2;
    })).length;
    return { trainCount: split.train.length, testCount: split.test.length,
      eligibleCount: split.eligibleCount, testRunCount: testGroups.size,
      overlappingRuns: [...testGroups].filter(groupId => trainingGroups.has(groupId)).length,
      nearbyAnchorCount: nearby };
  }

  function run(input = {}, mode = 'held_trajectories') {
    const config = normalizeConfig(input), dataset = generate(config);
    const split = splitIndices(dataset, config, mode);
    // Freeze every prediction before any held-out label/power evaluation.
    const predictions = predictRankings(dataset, split.train, split.test, config);
    return { config, mode, dataset, train: split.train, test: split.test, predictions,
      splitSummary: describeSplit(dataset, split) };
  }

  function lossDb(bestPower, achievedPower) {
    if (!Number.isFinite(bestPower) || bestPower <= 0 || !Number.isFinite(achievedPower) || achievedPower < 0 || achievedPower > bestPower) {
      throw new RangeError('Loss needs positive best power and achieved power in [0,best]');
    }
    if (achievedPower === 0) return Infinity;
    // Log difference avoids overflowing best / achieved. There is NO metric floor.
    return 10 * (Math.log10(bestPower) - Math.log10(achievedPower));
  }

  function evaluateSample(row, prediction, k, input = {}) {
    const cfg = normalizeConfig(input);
    // Validate the COMPLETE permutation, including beams outside this K prefix.
    const ranking = finiteVector(prediction.ranking, 'full candidate ranking', cfg.beams);
    const power = finiteVector(row.power, 'evaluation powers', cfg.beams);
    if (!Number.isInteger(k) || k < 1 || k > cfg.beams ||
      new Set(ranking).size !== cfg.beams || ranking.some(j => !Number.isInteger(j) || j < 0 || j >= cfg.beams)) throw new RangeError('Invalid candidate list or budget');
    validatePowers(power);
    if (!Number.isInteger(row.label) || row.label < 0 || row.label >= cfg.beams) throw new RangeError('Invalid evaluation label');
    const candidates = ranking.slice(0, k), bestPower = Math.max(...power);
    const achievedPower = Math.max(...candidates.map(j => power[j]));
    // Choose the lowest indexed EXACT achiever for the displayed probed maximum.
    // The metric never substitutes the tolerance-tied label's slightly lower power.
    const bestProbedBeam = Math.min(...candidates.filter(j => power[j] === achievedPower));
    return { id: row.id, k, candidates, hit: candidates.includes(row.label),
      bestPower, achievedPower, bestProbedBeam, lossDb: lossDb(bestPower, achievedPower),
      probeFraction: k / cfg.beams, idealProbeCountSavedFraction: 1 - k / cfg.beams };
  }

  function quantile(values, probability) {
    const sorted = values.slice().sort((a, b) => a - b), index = (sorted.length - 1) * probability;
    const lo = Math.floor(index), hi = Math.ceil(index);
    if (lo === hi || sorted[lo] === sorted[hi]) return sorted[lo];
    if (sorted[hi] === Infinity) return Infinity;
    return sorted[lo] + (index - lo) * (sorted[hi] - sorted[lo]);
  }

  function metrics(result, k) {
    const samples = result.test.map((rowIndex, i) => evaluateSample(result.dataset.rows[rowIndex], result.predictions[i], k, result.config));
    const count = samples.length, hitRate = samples.filter(sample => sample.hit).length / count;
    const losses = samples.map(sample => sample.lossDb);
    return { k, count, topKHitRate: hitRate, beamMissRate: 1 - hitRate,
      meanLossDb: losses.reduce((sum, value) => sum + value, 0) / count,
      p95LossDb: quantile(losses, 0.95),
      lossAboveThresholdRate: losses.filter(value => value > result.config.lossThresholdDb).length / count,
      lossThresholdDb: result.config.lossThresholdDb, probeFraction: k / result.config.beams,
      idealProbeCountSavedFraction: 1 - k / result.config.beams, perSample: samples };
  }

  const api = Object.freeze({ DEFAULT_CONFIG, MODES, RNG_DESCRIPTION, normalizeConfig,
    createRng, beamPowers, lowestTiedMax, rankWithTies, generate, splitIndices,
    fitPredictor, predictRankings, describeSplit, run, lossDb, evaluateSample, metrics });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RadarBeamDecisionCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
