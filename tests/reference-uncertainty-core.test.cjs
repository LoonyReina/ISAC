'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const C = require('../reference-uncertainty-core.js');
const old = require('../offgrid-range-core.js');
const alpha = [Math.cos(0.7), Math.sin(0.7)];
const all = Array.from({length: 16}, (_, k) => k);
const norm = ([re, im]) => re * re + im * im;
const multiply = ([ar, ai], [br, bi]) => [ar * br - ai * bi, ar * bi + ai * br];
const phase = angle => [Math.cos(angle), Math.sin(angle)];
const clone = value => structuredClone(value);
function near(actual, expected, tolerance = 1e-11) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected}, tolerance ${tolerance}`);
}
function pairNear(actual, expected, tolerance = 1e-11) {
  near(actual[0], expected[0], tolerance); near(actual[1], expected[1], tolerance);
}
function setup({truthRangeM = 25, snrDb = null, noiseSeed = 2026,
  pilotMode = 'irregular', errorMode = 'random', errorCount = 0, referenceSeed = 2026} = {}) {
  const generated = C.generate({truthRangeM, snrDb, noiseSeed});
  const injected = C.reference({pilotMode, errorMode, errorCount, referenceSeed});
  return {...generated, ...injected, inputs: C.assemble(generated.observation, injected.reference, pilotMode)};
}
// Independent analytical evaluator: no generation/templates/receive helper calls.
function independentObservation(rangeM) {
  return C.X.map((x, k) => multiply(multiply(alpha, x), phase(-4 * Math.PI * k * 1e6 * rangeM / 3e8)));
}
function independentCandidate(reference, indices, rangeM, observation) {
  const energy = reference.reduce((sum, z) => sum + norm(z), 0);
  const templates = reference.map((z, j) => multiply(z, phase(-4 * Math.PI * indices[j] * 1e6 * rangeM / 3e8)));
  const raw = templates.map(([ar, ai], j) => multiply([ar, -ai], observation[indices[j]]));
  const gain = raw.reduce((sum, z) => [sum[0] + z[0] / energy, sum[1] + z[1] / energy], [0,0]);
  const residualEnergy = templates.reduce((sum, a, j) => {
    const predicted = multiply(gain, a), y = observation[indices[j]];
    return sum + (y[0] - predicted[0]) ** 2 + (y[1] - predicted[1]) ** 2;
  }, 0);
  return {gain, q: norm(gain), residualEnergy, energy};
}

test('fixed useful-grid resources and existing core stay immutable and unchanged', () => {
  const filename = path.join(__dirname, '../offgrid-range-core.js');
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'),
    'ae47307d87ea1295aba99f9bf4d284332d26a6454d9a0b37520c252eae9b17ab');
  assert.strictEqual(C.X, old.X); assert.strictEqual(C.F, old.F);
  assert.equal(C.CANDIDATES.length, 600);
  assert.deepEqual([C.CANDIDATES[0], C.CANDIDATES.at(-1)], [0,149.75]);
  assert.ok(C.CANDIDATES.every((r, j) => r === j * 0.25));
  assert.deepEqual(C.PILOTS, {irregular: [0,3,7,15], comb: [0,4,8,12]});
  assert.equal(C.X.reduce((sum, x) => sum + norm(x), 0), 1);
  assert.ok(C.X.every(x => norm(x) === 1 / 16));
  assert.equal(C.cfg.usefulEnergy, 1);
  assert.equal(C.cfg.nominalBandwidthHz, 16000000); assert.equal(C.cfg.toneSpanHz, 15000000);
  assert.equal(C.cfg.tu + C.cfg.cp, 0.000002);
  assert.ok(2 * C.cfg.maxTruthM / C.cfg.c < C.cfg.cp);
  assert.throws(() => C.X[0][0] = 9, TypeError);
  assert.throws(() => C.CANDIDATES.push(150), TypeError);
  assert.throws(() => C.PILOTS.comb.push(16), TypeError);
});

test('F1: zero-error full references are bit-for-bit identical at every candidate with and without noise', () => {
  for (const snrDb of [null,-10,0,10,20]) {
    const s = setup({snrDb});
    assert.deepEqual(s.inputs.oracle, s.inputs.stress);
    const oracle = C.receive(s.inputs.oracle), stress = C.receive(s.inputs.stress);
    assert.deepEqual(oracle, stress);
    for (let j = 0; j < C.CANDIDATES.length; j++) {
      const a = C.candidateAt(s.inputs.oracle, j), b = C.candidateAt(s.inputs.stress, j);
      assert.deepEqual(a, b);
      assert.equal(a.score, oracle.scores[j]);
    }
    if (snrDb === null) {
      const atTruth = C.candidateAt(s.inputs.oracle, 100);
      pairNear(atTruth.fittedGain, alpha); near(atTruth.score, 1); near(atTruth.residualEnergy, 0);
    }
  }
});

test('F2: every noiseless full-band score matches independent Dirichlet sine-ratio formula', () => {
  for (const truthRangeM of [0,25,43.7,120]) {
    const s = setup({truthRangeM});
    const expectedY = independentObservation(truthRangeM);
    s.observation.forEach((z, k) => pairNear(z, expectedY[k]));
    const result = C.receive(s.inputs.oracle);
    for (let j = 0; j < C.CANDIDATES.length; j++) {
      const u = 2 * 1e6 * (C.CANDIDATES[j] - truthRangeM) / 3e8;
      const expected = Math.abs(Math.sin(Math.PI * u)) < 1e-14 ? 1 :
        (Math.sin(16 * Math.PI * u) / (16 * Math.sin(Math.PI * u))) ** 2;
      near(result.scores[j], expected);
    }
  }
  const s = setup();
  const special = {...s.inputs.oracle, candidatesM: [25,34.375,175]};
  const q = C.receive(special).scores;
  near(q[0], 1); near(q[1], 0); near(q[2], 1);
  assert.equal(C.cfg.firstNullM, 9.375); assert.equal(C.cfg.rangePeriod, 150);
});

test('F3: comb aliases are explicit and fixed-noise periodic peaks do not require knowledge of truth', () => {
  const clean = setup({pilotMode: 'comb'}), result = C.receive(clean.inputs.pilot);
  assert.deepEqual(result.tiedCandidatesM, [25,62.5,100,137.5]);
  assert.deepEqual(result.tiedIndices, [100,250,400,550]);
  assert.equal(result.tieCount, 4); assert.equal(result.estimateM, 25);
  const firstTemplate = C.candidateAt(clean.inputs.pilot, 100).templateSamples;
  for (const index of result.tiedIndices) {
    const point = C.candidateAt(clean.inputs.pilot, index);
    near(point.score, 1); near(point.residualEnergy, 0); pairNear(point.fittedGain, alpha);
    point.templateSamples.forEach((z, k) => pairNear(z, firstTemplate[k]));
  }
  const noisy = setup({pilotMode: 'comb', snrDb: -10});
  const noisyResult = C.receive(noisy.inputs.pilot);
  for (let j = 0; j < 450; j++) near(noisyResult.scores[j], noisyResult.scores[j + 150]);
  assert.equal(noisyResult.tieCount, 4);
  assert.notDeepEqual(noisyResult.tiedCandidatesM, result.tiedCandidatesM);
  noisyResult.tiedCandidatesM.slice(1).forEach((r, j) => near(r - noisyResult.tiedCandidatesM[j], 37.5));
  const irregular = C.receive(setup().inputs.pilot);
  assert.deepEqual(irregular.tiedCandidatesM, [25]);
});

test('F4: any one nonpilot sign flip yields gain 7α/8 and Q=49/64 at truth', () => {
  for (const pilotMode of ['irregular', 'comb']) {
    const s = setup({pilotMode});
    for (const k of all.filter(k => !C.PILOTS[pilotMode].includes(k))) {
      const reference = C.X.map((x, j) => j === k ? x.map(v => -v) : x.slice());
      const input = C.assemble(s.observation, reference, pilotMode).stress;
      const point = C.candidateAt(input, 100);
      pairNear(point.fittedGain, alpha.map(v => v * 7 / 8)); near(point.score, 49 / 64);
      const expected = independentCandidate(reference, all, 25, independentObservation(25));
      pairNear(point.fittedGain, expected.gain); near(point.residualEnergy, expected.residualEnergy);
    }
  }
});

test('F5: two patterns with twelve errors have different coherent sums, and ramp has a perfect wrong peak', () => {
  const rotate = setup({pilotMode: 'comb', errorMode: 'rotate', errorCount: 12});
  const ramp = setup({pilotMode: 'comb', errorMode: 'ramp', errorCount: 12});
  assert.deepEqual(rotate.observation, ramp.observation);
  for (const s of [rotate, ramp]) {
    assert.equal(s.stressMetadata.errorCount, 12); assert.equal(s.stressMetadata.errorIndices.length, 12);
    for (const k of C.PILOTS.comb) assert.deepEqual(s.reference[k], C.X[k]);
    assert.deepEqual(s.inputs.oracle, rotate.inputs.oracle);
  }
  const rotatePoint = C.candidateAt(rotate.inputs.stress, 100);
  pairNear(rotatePoint.fittedGain, multiply(alpha, [4 / 16, -12 / 16])); near(rotatePoint.score, 0.625);
  near(C.candidateAt(ramp.inputs.stress, 100).score, 0);
  const falsePeak = C.candidateAt(ramp.inputs.stress, 250);
  pairNear(falsePeak.fittedGain, alpha); near(falsePeak.score, 1); near(falsePeak.residualEnergy, 0);
  assert.deepEqual(C.receive(ramp.inputs.stress).tiedCandidatesM, [62.5]);
  // Both legal symbol/range descriptions produce the same noiseless observation.
  for (let k = 0; k < 16; k++) {
    const ambiguousY = multiply(multiply(alpha, ramp.reference[k]), phase(-4 * Math.PI * k * 1e6 * 62.5 / 3e8));
    pairNear(ambiguousY, ramp.observation[k]);
  }
  const wrapped = setup({truthRangeM: 120, pilotMode: 'comb', errorMode: 'ramp', errorCount: 12});
  assert.deepEqual(C.receive(wrapped.inputs.stress).tiedCandidatesM, [7.5]);
  near(C.candidateAt(wrapped.inputs.stress, 30).residualEnergy, 0);
});

test('F6: unknown complex gain absorbs global reference phase without changing any Q or residual', () => {
  const s = setup({snrDb: 10}), original = C.receive(s.inputs.oracle);
  for (const theta of [Math.PI / 2, 0.83]) {
    const rotatedInput = {...s.inputs.oracle, referenceSelected: C.X.map(z => multiply(z, phase(theta)))};
    const rotated = C.receive(rotatedInput);
    assert.deepEqual(rotated.tiedCandidatesM, original.tiedCandidatesM);
    for (let j = 0; j < C.CANDIDATES.length; j++) {
      const a = C.candidateAt(s.inputs.oracle, j), b = C.candidateAt(rotatedInput, j);
      near(rotated.scores[j], original.scores[j]); near(a.residualEnergy, b.residualEnergy);
      pairNear(b.fittedGain, multiply(a.fittedGain, phase(-theta)));
    }
  }
});

test('F7: noise weight-square norms are 1/E, with useful-grid energy and unrenormalized scores', () => {
  const s = setup({snrDb: 10});
  near(s.noiseMetadata.sigma2, 1 / 160);
  for (const name of ['oracle', 'pilot', 'stress']) {
    const input = s.inputs[name], result = C.receive(input);
    const energy = input.referenceSelected.reduce((sum, z) => sum + norm(z), 0);
    const weightsSquared = input.referenceSelected.reduce((sum, z) => sum + norm(z) / energy ** 2, 0);
    near(weightsSquared, 1 / energy);
    assert.equal(result.referenceEnergy, name === 'pilot' ? 0.25 : 1);
    assert.equal(result.sampleCount, name === 'pilot' ? 4 : 16);
    assert.equal(result.matchingTerms, name === 'pilot' ? 2400 : 9600);
    near(s.noiseMetadata.sigma2 * weightsSquared, s.noiseMetadata.sigma2 * (name === 'pilot' ? 4 : 1));
    for (const j of [0,100,321,599]) {
      const point = C.candidateAt(input, j), sum = point.contributions.reduce((a, z) => [a[0] + z[0], a[1] + z[1]], [0,0]);
      pairNear(sum, point.fittedGain); near(norm(sum), result.scores[j]);
      near(point.residuals.reduce((total, z) => total + norm(z), 0), point.residualEnergy);
      assert.equal(point.contributions.length, result.sampleCount);
    }
  }
  const input = {ySelected: [[1,1],[-1,-1]], referenceSelected: [[1,0],[1,0]],
    frequencyOffsetsHz: [0,1e6], candidatesM: [0], cMps: 3e8};
  const point = C.candidateAt(input, 0);
  assert.deepEqual(point.fittedGain, [0,0]); assert.equal(point.score, 0);
  assert.ok(point.contributions.reduce((sum, z) => sum + norm(z), 0) > 0, 'premature power sum would wrongly be positive');
});

test('F8: all-zero observation preserves all 600 ties and actual tie tolerance', () => {
  const s = setup(), input = {...s.inputs.oracle, ySelected: all.map(() => [0,0])};
  const result = C.receive(input);
  assert.equal(result.tieCount, 600); assert.deepEqual(result.tiedCandidatesM, C.CANDIDATES);
  assert.deepEqual(result.tiedIndices, Array.from({length: 600}, (_, j) => j));
  assert.equal(result.estimateM, 0); assert.equal(result.index, 0);
  assert.equal(result.tieTolerance, 64 * Number.EPSILON); assert.equal(result.residualEnergy, 0);
  assert.ok(result.scores.every(q => q === 0));
});

test('F8: invalid vectors, nonfinite values, zero energy, dimensions, candidates and indices throw', () => {
  const input = setup().inputs.oracle;
  const invalid = [null, {}, [], {...input, ySelected: []}, {...input, referenceSelected: []},
    {...input, frequencyOffsetsHz: []}, {...input, candidatesM: []},
    {...input, referenceSelected: all.map(() => [0,0])},
    {...input, ySelected: [[1,0]]}, {...input, frequencyOffsetsHz: [0]},
    {...input, candidatesM: [1,1]}, {...input, candidatesM: [1,0]},
    {...input, candidatesM: [0,NaN]}, {...input, candidatesM: [0,Infinity]},
    {...input, cMps: 0}, {...input, cMps: -1}, {...input, cMps: Infinity},
    {...input, referenceSelected: all.map(() => [Number.MAX_VALUE,Number.MAX_VALUE])},
    {...input, ySelected: all.map(() => [Number.MAX_VALUE,Number.MAX_VALUE])}];
  for (const key of ['ySelected', 'referenceSelected']) {
    for (const value of [NaN, Infinity, -Infinity, '1', null, undefined]) {
      const bad = clone(input); bad[key][5][0] = value; invalid.push(bad);
    }
    const bad = clone(input); bad[key][15] = [1]; invalid.push(bad);
  }
  for (const value of [NaN,Infinity,-Infinity]) {
    const bad = clone(input); bad.frequencyOffsetsHz[15] = value; invalid.push(bad);
  }
  for (const bad of invalid) {
    assert.throws(() => C.receive(bad));
    assert.throws(() => C.candidateAt(bad, 0));
  }
  for (const index of [-1,600,0.5,NaN,Infinity,'1',null,undefined]) assert.throws(() => C.candidateAt(input, index));
  for (const mode of ['', 'other', [], [0,4,8,16], null, 1]) assert.throws(() => C.assemble(C.X, C.X, mode));
  for (const bad of [[], C.X.slice(0,15), [...C.X,[0,0]], [...C.X.slice(0,15),[NaN,0]]]) {
    assert.throws(() => C.assemble(bad, C.X)); assert.throws(() => C.assemble(C.X, bad));
  }
});

test('receiver accepts only the five explicit sample/design inputs and never invokes metadata accessors', () => {
  const input = setup().inputs.oracle;
  assert.deepEqual(Object.keys(input).sort(), ['ySelected','referenceSelected','frequencyOffsetsHz','candidatesM','cMps'].sort());
  for (const key of ['truth', 'truthRangeM', 'truthPhase', 'trueX', 'errorMask', 'errorRate', 'noiseSeed', 'sigma2', 'noiseMetadata', 'stressMetadata']) {
    assert.throws(() => C.receive({...input, [key]: 25}), /unexpected key/);
    assert.throws(() => C.candidateAt({...input, [key]: 25}, 0), /unexpected key/);
  }
  assert.throws(() => C.receive({...input, [Symbol('truth')]: 25}), /unexpected key/);
  const hidden = {...input}; Object.defineProperty(hidden, 'truthRangeM', {value: 25});
  assert.throws(() => C.receive(hidden), /unexpected key/);
  const accessor = {...input}; let called = false;
  Object.defineProperty(accessor, 'ySelected', {get() { called = true; return input.ySelected; }});
  assert.throws(() => C.receive(accessor), /accessor/); assert.equal(called, false);
  assert.throws(() => C.receive(Object.assign(Object.create({truthRangeM: 25}), input)), /plain object/);
  for (const key of Object.keys(input)) { const incomplete = {...input}; delete incomplete[key]; assert.throws(() => C.receive(incomplete)); }
});

test('truth replacement, mutation and hidden evaluation records cannot affect assembled receiver results', () => {
  const s = setup({snrDb: 0, errorCount: 7});
  const before = Object.fromEntries(Object.entries(s.inputs).map(([key, input]) => [key, C.receive(input)]));
  s.truth.rangeM = 99; s.truth.alpha.fill(100); s.truth.transmitSymbols[0][0] = -900;
  s.truth = {rangeM: -500, transmitSymbols: []};
  s.noiseMetadata.sigma2 = 1e30; s.stressMetadata.errorIndices.fill(0);
  const after = Object.fromEntries(Object.entries(s.inputs).map(([key, input]) => [key, C.receive(input)]));
  assert.deepEqual(after, before);
  assert.deepEqual(C.assemble(s.observation, s.reference, 'irregular'), s.inputs);
  // Assembly is a value boundary: later caller mutations do not alter selected samples.
  s.observation[0][0] = -1000; s.reference[0][0] = 1000;
  assert.deepEqual(C.receive(s.inputs.oracle), before.oracle);
  assert.deepEqual(C.receive(s.inputs.stress), before.stress);
  assert.equal(C.X[0][0], 0.25);
});

test('reference errors are exact, nested and reproducible with per-position rotations independent of h', () => {
  for (const pilotMode of ['irregular', 'comb']) {
    for (const referenceSeed of [0,2026,4294967295]) {
      let previous = [];
      const full = C.reference({pilotMode, errorMode: 'random', errorCount: 12, referenceSeed});
      for (let h = 0; h <= 12; h++) {
        const options = {pilotMode, errorMode: 'random', errorCount: h, referenceSeed};
        const r = C.reference(options);
        assert.deepEqual(r, C.reference(options));
        assert.equal(r.stressMetadata.errorCount, h); assert.equal(r.stressMetadata.errorIndices.length, h);
        assert.ok(previous.every(k => r.stressMetadata.errorIndices.includes(k)));
        for (let k = 0; k < 16; k++) {
          if (C.PILOTS[pilotMode].includes(k)) assert.deepEqual(r.reference[k], C.X[k]);
          if (r.stressMetadata.errorIndices.includes(k)) {
            assert.equal(r.stressMetadata.rotationQuarterTurns[k], full.stressMetadata.rotationQuarterTurns[k]);
            assert.ok([1,2,3].includes(r.stressMetadata.rotationQuarterTurns[k]));
          } else assert.deepEqual(r.reference[k], C.X[k]);
          assert.equal(norm(r.reference[k]), 1 / 16);
        }
        assert.deepEqual(r.stressMetadata.errorIndices, r.stressMetadata.permutation.slice(0,h).sort((a,b) => a-b));
        previous = r.stressMetadata.errorIndices;
      }
    }
  }
});

test('noise and reference streams are separate; changing reference conditions preserves physical y and oracle/pilot', () => {
  const generated = C.generate({truthRangeM: 43.7, snrDb: 0, noiseSeed: 7});
  const originalY = clone(generated.observation);
  for (const pilotMode of ['irregular', 'comb']) {
    let baseline;
    for (const referenceSeed of [7,8,2026]) {
      for (const errorCount of [0,3,12]) {
        const r = C.reference({pilotMode, errorCount, referenceSeed});
        const inputs = C.assemble(generated.observation, r.reference, pilotMode);
        assert.deepEqual(generated.observation, originalY);
        assert.notEqual(r.stressMetadata.permutationDomain, generated.noiseMetadata.domain);
        assert.notEqual(r.stressMetadata.rotationDomain, generated.noiseMetadata.domain);
        const results = [C.receive(inputs.oracle), C.receive(inputs.pilot)];
        if (baseline) assert.deepEqual(results, baseline); else baseline = results;
      }
    }
  }
  const a = C.reference({errorCount: 9, referenceSeed: 7});
  const b = C.reference({errorCount: 9, referenceSeed: 8});
  assert.notDeepEqual(a.reference, b.reference);
  assert.deepEqual(C.generate({truthRangeM: 43.7, snrDb: 0, noiseSeed: 7}), generated);
  assert.notDeepEqual(C.generate({truthRangeM: 43.7, snrDb: 0, noiseSeed: 8}).observation, originalY);
  assert.deepEqual(C.reference({errorCount: 9, referenceSeed: 7}), a);
});

test('fixed standard normal sample is retained across SNR and truth changes, without Monte Carlo', () => {
  for (const truthRangeM of [0,43.7,120]) {
    const clean = C.generate({truthRangeM, snrDb: null, noiseSeed: 42});
    const low = C.generate({truthRangeM, snrDb: 0, noiseSeed: 42});
    const high = C.generate({truthRangeM, snrDb: 20, noiseSeed: 42});
    assert.deepEqual(low.noiseMetadata.initialStateUint32, high.noiseMetadata.initialStateUint32);
    near(low.noiseMetadata.sigma2 / high.noiseMetadata.sigma2, 100);
    for (let k = 0; k < 16; k++) for (let part = 0; part < 2; part++)
      near(low.observation[k][part] - clean.observation[k][part], 10 * (high.observation[k][part] - clean.observation[k][part]));
    near(low.noiseMetadata.noiseEnergy / high.noiseMetadata.noiseEnergy, 100);
  }
  const a = C.generate({truthRangeM: 0, snrDb: 0, noiseSeed: 42});
  const b = C.generate({truthRangeM: 120, snrDb: 0, noiseSeed: 42});
  const ac = C.generate({truthRangeM: 0, snrDb: null, noiseSeed: 42});
  const bc = C.generate({truthRangeM: 120, snrDb: null, noiseSeed: 42});
  for (let k = 0; k < 16; k++) for (let part = 0; part < 2; part++)
    near(a.observation[k][part] - ac.observation[k][part], b.observation[k][part] - bc.observation[k][part]);
});

test('invalid generation/reference options fail instead of silently changing the model', () => {
  for (const truthRangeM of [-0.01,120.01,NaN,Infinity,'25',null]) assert.throws(() => C.generate({truthRangeM}));
  for (const snrDb of [-20,-5,5,Infinity,NaN,'0',false]) assert.throws(() => C.generate({snrDb}));
  for (const seed of [-1,4294967296,0.5,NaN,Infinity,'7',null]) {
    assert.throws(() => C.generate({noiseSeed: seed})); assert.throws(() => C.reference({referenceSeed: seed}));
  }
  for (const errorCount of [-1,13,0.5,NaN,Infinity,'1',null]) assert.throws(() => C.reference({errorCount}));
  for (const errorMode of ['unknown', '', null]) assert.throws(() => C.reference({errorMode}));
  for (const errorMode of ['rotate', 'ramp']) {
    assert.throws(() => C.reference({pilotMode: 'irregular', errorMode, errorCount: 12}));
    assert.throws(() => C.reference({pilotMode: 'comb', errorMode, errorCount: 11}));
  }
  assert.throws(() => C.generate({referenceSeed: 1}));
  assert.throws(() => C.reference({noiseSeed: 1}));
});

test('browser UMD exposes the same model and fails clearly if its existing-core dependency is missing', () => {
  const baseCode = fs.readFileSync(path.join(__dirname, '../offgrid-range-core.js'), 'utf8');
  const wrapperCode = fs.readFileSync(path.join(__dirname, '../reference-uncertainty-core.js'), 'utf8');
  assert.throws(() => vm.runInNewContext(wrapperCode), /OffgridRangeCore must be loaded/);
  const context = vm.createContext({});
  vm.runInContext(baseCode + '\n' + wrapperCode, context);
  const values = vm.runInContext(`(() => {
    const C = ReferenceUncertaintyCore, a = C.generate({truthRangeM:25});
    const b = C.reference({pilotMode:'comb',errorMode:'ramp',errorCount:12});
    return C.receive(C.assemble(a.observation,b.reference,'comb').stress);
  })()`, context);
  assert.equal(values.estimateM, 62.5); near(values.selectedScore, 1);
  assert.deepEqual(Array.from(values.tiedCandidatesM), [62.5]);
});
