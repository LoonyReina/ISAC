#!/usr/bin/env node
/** Full-output JS/Python port parity and separately derived scalar-oracle checks.
 * This is a Node kernel test. It does not claim browser/Worker lifecycle coverage.
 * node tests/verify_oracles.mjs [--seed 123] [--runtime-output path] [--fixtures-only]
 * python3 tests/generate_oracles.py --verify-runtime reports/oracle-runtime-nonfixture.json
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomInt } from 'node:crypto';
import { sparseSpa } from '../js/receiver.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PINNED = 'c83ba035ee49d8011c2b3b8f5f0260b7e95fd2fb562781f03e63a1ea7407ddce';
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  assert(index + 1 < args.length, `Missing value for ${name}`);
  return args[index + 1];
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const receiverSha256 = sha(fs.readFileSync(path.join(ROOT, 'js/receiver.js')));
const fixtureBytes = fs.readFileSync(path.join(ROOT, 'fixtures/full-output-oracles.json'));
const fixtures = JSON.parse(fixtureBytes);
assert.equal(fixtures.referenceSha256, PINNED);
assert.equal(sha(fs.readFileSync(path.join(ROOT, 'reference-copy/reference.py'))), PINNED);

function typedInput(input) {
  return { ...input, shape: [...input.shape], support: input.support.map(s => [...s]),
    y: Float64Array.from(input.y), estimatedGains: Float64Array.from(input.estimatedGains),
    pilotIndex: [...input.pilotIndex], pilot: [...input.pilot],
    gainVariance: Float64Array.from(input.gainVariance) };
}

function plainResult(result) {
  return {
    probabilities: Array.from(result.probabilities),
    probabilitiesValidMask: Array.from(result.probabilitiesValidMask),
    knownPilotFlatIndex: result.knownPilotFlatIndex,
    knownPilotValue: Array.from(result.knownPilotValue),
    decisions: Array.from(result.decisions), status: result.status,
    iterations: result.iterations, history: result.history.map(row => ({ ...row })),
    dataMask: Array.from(result.dataMask), gainVariance: Array.from(result.gainVariance),
  };
}

function compare(actual, expected, location = 'result', errors = { maximumAbsoluteError: 0, numericValuesCompared: 0, tieSensitiveCategoricalDifferences: 0 }, allowedTies = new Set()) {
  if (allowedTies.has(location)) {
    errors.tieSensitiveCategoricalDifferences++;
    return errors;
  }
  if (Array.isArray(expected)) {
    assert(Array.isArray(actual), `${location}: must be an array`);
    assert.equal(actual.length, expected.length, `${location}: array length`);
    expected.forEach((v, i) => compare(actual[i], v, `${location}[${i}]`, errors, allowedTies));
  } else if (expected !== null && typeof expected === 'object') {
    assert(actual && typeof actual === 'object', `${location}: must be an object`);
    for (const [key, value] of Object.entries(expected)) {
      assert(Object.hasOwn(actual, key), `${location}: missing ${key}`);
      compare(actual[key], value, `${location}.${key}`, errors, allowedTies);
    }
  } else if (typeof expected === 'number') {
    assert.equal(typeof actual, 'number', `${location}: number type`);
    assert(Number.isFinite(actual), `${location}: nonfinite value`);
    const difference = Math.abs(actual - expected);
    const exact = /\.(?:knownPilotFlatIndex|iterations|iteration|decisionChanges)$/.test(location)
      || /\.(?:probabilitiesValidMask|dataMask)\[\d+\]$/.test(location);
    const tolerance = exact ? 0 : 3e-12 + 2e-11 * Math.abs(expected);
    assert(difference <= tolerance, `${location}: ${actual} != ${expected}; absolute error ${difference}, tolerance ${tolerance}`);
    errors.maximumAbsoluteError = Math.max(errors.maximumAbsoluteError, difference);
    errors.numericValuesCompared++;
  } else {
    assert.equal(actual, expected, location);
  }
  return errors;
}

function auditCategoricalTies(fixture, output) {
  const expected = fixture.expected, input = fixture.input, allowed = new Set();
  const L = input.shape[0] * input.shape[1], q = expected.knownPilotFlatIndex;
  const closeToHalf = p => Math.abs(p - .5) <= 3e-12;
  const label = (probs, cell) => Number(probs[2 * cell + 1] > probs[2 * cell]);
  const decisionDifferences = [];
  for (let cell = 0; cell < L; cell++) {
    if (output.decisions[2 * cell] === expected.decisions[2 * cell]) continue;
    assert.notEqual(cell, q, 'Known pilot cannot receive a tie exception');
    const jsP = output.probabilities[2 * cell + 1], pyP = expected.probabilities[2 * cell + 1];
    assert(closeToHalf(jsP) && closeToHalf(pyP), `${fixture.id}: non-tie hard decision mismatch at cell ${cell}`);
    assert.equal(output.decisions[2 * cell], (label(output.probabilities, cell) ? 1 : -1) * Math.sqrt(input.Es));
    assert.equal(expected.decisions[2 * cell], (label(expected.probabilities, cell) ? 1 : -1) * Math.sqrt(input.Es));
    allowed.add(`${fixture.id}.decisions[${2 * cell}]`);
    decisionDifferences.push({ cell, expected: expected.decisions[2 * cell], actual: output.decisions[2 * cell],
      expectedPositiveProbability: pyP, actualPositiveProbability: jsP });
  }
  const historyDifferences = output.history.flatMap((row, i) => row.decisionChanges !== expected.history[i]?.decisionChanges
    ? [{ iteration: i + 1, expected: expected.history[i]?.decisionChanges, actual: row.decisionChanges }] : []);
  if (!decisionDifferences.length && !historyDifferences.length) return { allowed, report: null };
  const pythonTraces = fixtures.probabilityTraces[`${fixture.frameId}__${fixture.receiverVariant}`];
  assert(pythonTraces, 'Missing independent Python rerun probability traces');
  const rawTraces = [], traceDifferences = [];
  let previousPython = Array(L).fill(0), previousJs = Array(L).fill(0), previousTies = Array(L).fill(false);
  let maxTraceProbabilityError = 0;
  for (let k = 1; k <= output.iterations; k++) {
    const python = pythonTraces[k - 1];
    const js = plainResult(sparseSpa(typedInput({ ...input, maxIterations: k, tolerance: 0 })));
    const comparison = compare(js.probabilities, python, `${fixture.id}.trace${k}.probabilities`);
    assert(comparison.maximumAbsoluteError <= 3e-12, 'Per-iteration probabilities exceed independent trace tolerance');
    maxTraceProbabilityError = Math.max(maxTraceProbabilityError, comparison.maximumAbsoluteError);
    const pyLabels = Array(L).fill(0), jsLabels = Array(L).fill(0), ties = Array(L).fill(false);
    let pyCount = 0, jsCount = 0;
    const contributions = [];
    for (let cell = 0; cell < L; cell++) {
      pyLabels[cell] = label(python, cell); jsLabels[cell] = label(js.probabilities, cell);
      if (cell === q) continue;
      ties[cell] = closeToHalf(python[2 * cell + 1]) && closeToHalf(js.probabilities[2 * cell + 1]);
      if (pyLabels[cell] !== jsLabels[cell]) assert(ties[cell], `${fixture.id} trace ${k}: non-tie argmax divergence at ${cell}`);
      const pyChanged = Number(pyLabels[cell] !== previousPython[cell]);
      const jsChanged = Number(jsLabels[cell] !== previousJs[cell]);
      pyCount += pyChanged; jsCount += jsChanged;
      if (pyChanged !== jsChanged) {
        assert((pyLabels[cell] !== jsLabels[cell] && ties[cell])
          || (previousPython[cell] !== previousJs[cell] && previousTies[cell]), 'Count difference is not explained by a current or previous half tie');
        contributions.push({ cell, pythonChanged: pyChanged, jsChanged,
          pythonPositiveProbability: python[2 * cell + 1], jsPositiveProbability: js.probabilities[2 * cell + 1],
          previousTie: previousTies[cell], currentTie: ties[cell] });
      }
    }
    assert.equal(pyCount, expected.history[k - 1].decisionChanges, 'Python raw history does not match reconstructed argmax trace');
    assert.equal(jsCount, output.history[k - 1].decisionChanges, 'JS raw history does not match reconstructed argmax trace');
    assert.equal(jsCount - pyCount, contributions.reduce((sum, row) => sum + row.jsChanged - row.pythonChanged, 0));
    if (jsCount !== pyCount) {
      allowed.add(`${fixture.id}.history[${k - 1}].decisionChanges`);
      traceDifferences.push({ iteration: k, expectedCount: pyCount, actualCount: jsCount, contributions });
    }
    rawTraces.push({ iteration: k, expectedProbabilities: python, actualProbabilities: js.probabilities,
      expectedDecisionChanges: pyCount, actualDecisionChanges: jsCount });
    previousPython = pyLabels; previousJs = jsLabels; previousTies = ties;
  }
  return { allowed, report: { id: fixture.id, halfTieTolerance: 3e-12,
    decisionDifferences, historyDifferences, traceDifferences, maxTraceProbabilityError, rawTraces,
    interpretation: 'Raw values are preserved. Only unstable argmax/count differences proven to arise from both marginals within 3e-12 of one half are permitted.' } };
}

function checkResultContract(output, input) {
  const L = input.shape[0] * input.shape[1];
  assert(output.probabilities instanceof Float64Array, 'probabilities must use Float64Array');
  assert(output.decisions instanceof Float64Array, 'decisions must use Float64Array');
  assert(output.probabilitiesValidMask instanceof Uint8Array, 'probabilitiesValidMask must use Uint8Array');
  assert(output.dataMask instanceof Uint8Array, 'dataMask must use Uint8Array');
  assert.equal(output.probabilities.length, 2 * L);
  assert.equal(output.decisions.length, 2 * L);
  assert.equal(output.history.length, output.iterations);
  assert(output.iterations <= input.maxIterations);
  const q = input.pilotIndex[0] * input.shape[1] + input.pilotIndex[1];
  assert.equal(output.knownPilotFlatIndex, q);
  for (let i = 0; i < L; i++) {
    const p0 = output.probabilities[2 * i], p1 = output.probabilities[2 * i + 1];
    assert(Number.isFinite(p0) && Number.isFinite(p1) && p0 >= 0 && p1 >= 0 && p0 <= 1 && p1 <= 1);
    assert(Math.abs(p0 + p1 - 1) < 5e-15, `Probability row ${i} is not normalized`);
    assert.equal(output.dataMask[i], Number(i !== q));
    assert.equal(output.probabilitiesValidMask[i], Number(i !== q));
  }
  assert.equal(output.probabilities[2 * q], .5);
  assert.equal(output.probabilities[2 * q + 1], .5);
  assert.equal(output.decisions[2 * q], input.pilot[0]);
  assert.equal(output.decisions[2 * q + 1], input.pilot[1]);
}

const results = [];
const actualById = new Map();
const tieReports = [];
for (const fixture of fixtures.cases) {
  const inputs = typedInput(fixture.input);
  const original = JSON.stringify(fixture.input);
  const output = sparseSpa(inputs);
  checkResultContract(output, fixture.input);
  const plain = plainResult(output);
  const ties = auditCategoricalTies(fixture, plain);
  if (ties.report) tieReports.push(ties.report);
  const full = compare(plain, fixture.expected, fixture.id, undefined, ties.allowed);
  const independent = fixture.independentScalarProbabilities;
  let independentMax = 0;
  assert.equal(plain.probabilities.length, independent.length);
  for (let i = 0; i < independent.length; i++) {
    independentMax = Math.max(independentMax, Math.abs(plain.probabilities[i] - independent[i]));
  }
  assert(independentMax < 3e-12, `${fixture.id}: independent scalar mismatch ${independentMax}`);
  assert.equal(JSON.stringify(fixture.input), original, 'Fixture input was mutated');
  assert.deepEqual(Array.from(inputs.y), fixture.input.y, 'Kernel mutated observation input');
  assert.deepEqual(Array.from(inputs.estimatedGains), fixture.input.estimatedGains, 'Kernel mutated gains input');
  assert.deepEqual(Array.from(inputs.gainVariance), fixture.input.gainVariance, 'Kernel mutated variance input');
  results.push({ id: fixture.id, fullOutputReferenceParity: full,
    independentScalarMaximumProbabilityError: independentMax,
    status: plain.status, iterations: plain.iterations, pass: true });
  actualById.set(fixture.id, plain);
}

const counterexample = actualById.get('retained_discrepancy_converged');
const exact = fixtures.retainedDiscrepancy;
const gaps = exact.dataFlatIndices.map((cell, i) => Math.abs(counterexample.probabilities[2 * cell + 1] - exact.integratedGainMarginals[i][1]));
const retainedGap = Math.max(...gaps);
assert.equal(counterexample.status, 'converged');
assert.equal(Number(retainedGap.toFixed(6)), .499913);
assert(Math.abs(retainedGap - exact.estimatedGainSurrogateMaximumGap) < 3e-12);

// A local seeded PRNG is used only for fresh runtime input generation. The JS
// detector never reads fixture outputs, physical truth, or exact marginals.
function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRuntime(seed) {
  const uniform = makeRng(seed);
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(uniform(), Number.MIN_VALUE))) * Math.cos(2 * Math.PI * uniform());
  const shape = [5, 7], L = shape[0] * shape[1];
  const physicalSupport = [[0, 0], [2, -3], [-1, 2]];
  const support = [[0, 0], [2, -3], [-1, 3]];
  const priorPowers = [.63, .29, .08], Es = .83, N0 = .16;
  const pilotIndex = [2, 4], pilot = [2.4, 3.2];
  const q = pilotIndex[0] * shape[1] + pilotIndex[1];
  const mod = (x, n) => ((x % n) + n) % n;
  const trueGains = priorPowers.flatMap(power => [Math.sqrt(power / 2) * normal(), Math.sqrt(power / 2) * normal()]);
  const transmittedSymbols = Array(2 * L).fill(0);
  const noise = Array.from({ length: 2 * L }, () => Math.sqrt(N0 / 2) * normal());
  for (let i = 0; i < L; i++) transmittedSymbols[2 * i] = (uniform() < .5 ? -1 : 1) * Math.sqrt(Es);
  transmittedSymbols[2 * q] = pilot[0]; transmittedSymbols[2 * q + 1] = pilot[1];
  const y = Array(2 * L).fill(0);
  for (let cell = 0; cell < L; cell++) {
    const k = Math.floor(cell / shape[1]), l = cell % shape[1];
    physicalSupport.forEach(([sk, sl], p) => {
      const target = mod(k + sk, shape[0]) * shape[1] + mod(l + sl, shape[1]);
      const ar = trueGains[2 * p], ai = trueGains[2 * p + 1];
      const xr = transmittedSymbols[2 * cell], xi = transmittedSymbols[2 * cell + 1];
      y[2 * target] += ar * xr - ai * xi; y[2 * target + 1] += ar * xi + ai * xr;
    });
  }
  for (let i = 0; i < y.length; i++) y[i] += noise[i];
  const Ep = pilot[0] ** 2 + pilot[1] ** 2;
  const estimatedGains = support.flatMap(([sk, sl]) => {
    const arrival = mod(pilotIndex[0] + sk, shape[0]) * shape[1] + mod(pilotIndex[1] + sl, shape[1]);
    const yr = y[2 * arrival], yi = y[2 * arrival + 1];
    return [(yr * pilot[0] + yi * pilot[1]) / Ep, (yi * pilot[0] - yr * pilot[1]) / Ep];
  });
  const totalPower = priorPowers.reduce((a, b) => a + b, 0);
  const gainVariance = priorPowers.map(power => (Es * (totalPower - power) + N0) / Ep);
  const base = { shape, support, y, estimatedGains, pilotIndex, pilot, Es, N0, gainVariance,
    maxIterations: 40, damping: .43, tolerance: 1e-7 };
  const runs = ['moment_repaired', 'ignored_uncertainty', 'literal_operational', 'supplied_perfect_csi'].map(variant => {
    const input = variant === 'supplied_perfect_csi'
      ? { ...base, mode: 'ignored_uncertainty', support: physicalSupport, estimatedGains: trueGains, gainVariance: [0, 0, 0] }
      : { ...base, mode: variant };
    const output = sparseSpa(typedInput(input));
    checkResultContract(output, input);
    return { id: `runtime_${seed}_${variant}`, receiverVariant: variant, input, result: plainResult(output) };
  });
  assert(!fixtures.cases.some(c => JSON.stringify(c.input.y) === JSON.stringify(y)), 'Runtime accidentally repeats fixture y');
  return { schema: 'sensing-assisted-otfs-runtime-export-v1', seed,
    generatedBy: 'Node runtime input generation, direct sparseSpa calls, no fixture output lookup',
    referenceSha256: PINNED, receiverSha256,
    evaluatorOnly: { physicalSupport, trueGains, transmittedSymbols, noise, priorPowers, predictedSupportMismatch: true },
    runs };
}

let runtime = null;
let runtimePath = null;
if (!args.includes('--fixtures-only')) {
  const seed = Number(getArg('--seed', randomInt(0, 4294967296)));
  assert(Number.isInteger(seed) && seed >= 0 && seed <= 4294967295, '--seed must be an unsigned 32-bit integer');
  runtime = makeRuntime(seed);
  runtimePath = path.resolve(ROOT, getArg('--runtime-output', 'reports/oracle-runtime-nonfixture.json'));
  fs.mkdirSync(path.dirname(runtimePath), { recursive: true });
  fs.writeFileSync(runtimePath, JSON.stringify(runtime, null, 2) + '\n');
}
const report = {
  allPassed: true, fixtureCount: results.length, referenceSha256: PINNED, receiverSha256,
  fixtureSha256: sha(fixtureBytes),
  maximumFullOutputAbsoluteError: Math.max(...results.map(r => r.fullOutputReferenceParity.maximumAbsoluteError)),
  maximumIndependentScalarProbabilityError: Math.max(...results.map(r => r.independentScalarMaximumProbabilityError)),
  numericValuesCompared: results.reduce((sum, r) => sum + r.fullOutputReferenceParity.numericValuesCompared, 0),
  categoricalRoundoffPolicy: fixtures.categoricalRoundoffPolicy,
  tieSensitiveCaseCount: tieReports.length,
  tieSensitiveCategoricalDifferences: results.reduce((sum, r) => sum + r.fullOutputReferenceParity.tieSensitiveCategoricalDifferences, 0),
  retainedCounterexample: { maximumMarginalGap: retainedGap, status: counterexample.status, iterations: counterexample.iterations },
  runtimeExport: runtime ? { file: path.relative(ROOT, runtimePath), seed: runtime.seed,
    sha256: sha(fs.readFileSync(runtimePath)), runCount: runtime.runs.length,
    pythonVerification: 'Run generate_oracles.py --verify-runtime against this exact export' } : null,
  scope: 'Node kernel tests only; full-output reference parity and separate independent scalar probabilities are distinct evidence layers',
  results,
};
fs.writeFileSync(path.join(ROOT, 'reports/oracle-js-verification.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'reports/oracle-tie-diagnostic.json'), JSON.stringify({
  allDifferencesIndependentlyExplained: true, categoricalRoundoffPolicy: fixtures.categoricalRoundoffPolicy,
  cases: tieReports,
}, null, 2) + '\n');
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
