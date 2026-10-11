'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../reference-uncertainty-core.js');
const B = require('../offgrid-range-core.js');
const R = require('../reference-uncertainty-record.js');
const DATE = '2026-10-11T17:00:00.000Z';
const branches = ['oracle', 'pilot', 'stress'];
const clone = value => structuredClone(value);
const json = value => JSON.parse(JSON.stringify(value));
const near = (a, b) => assert.ok(Math.abs(a - b) <= 1e-11 + 1e-10 * Math.max(Math.abs(a), Math.abs(b)), `${a} != ${b}`);

function setup(options = {}) {
  const generatorConfig = {truthRangeM: options.truthRangeM ?? 25, snrDb: options.snrDb ?? null, noiseSeed: options.noiseSeed ?? 2026};
  const referenceOptions = {pilotMode: options.pilotMode ?? 'irregular', errorMode: options.errorMode ?? 'random',
    errorCount: options.errorCount ?? 0, referenceSeed: options.referenceSeed ?? 2026};
  const frame = C.generate(generatorConfig), reference = C.reference(referenceOptions);
  const referenceConfig = {...referenceOptions, stressMetadata: reference.stressMetadata};
  const inputs = C.assemble(frame.observation, reference.reference, referenceConfig.pilotMode);
  const results = Object.fromEntries(branches.map(branch => [branch, C.receive(inputs[branch])]));
  const branch = options.branch ?? 'stress', index = options.index ?? 100;
  return {generatorConfig, referenceConfig, frame, inputs, results,
    selectedInspection: {branch, value: C.candidateAt(inputs[branch], index), truthMarkerShown: true, injectionMarksShown: false}};
}
function record(options) { return R.makeRecord(setup(options), DATE); }
function reconstructed(r, b) {
  const saved = r.receiverInputs[b];
  return {ySelected: saved.sampleIndices.map(k => r.observation[k]), referenceSelected: saved.referenceSelected,
    frequencyOffsetsHz: saved.sampleIndices.map(k => r.sharedDesign.frequencyOffsetsHz[k]),
    candidatesM: r.sharedDesign.candidatesM, cMps: r.sharedDesign.cMps};
}
function mutateRejected(value, mutate, pattern) {
  const bad = clone(value); mutate(bad);
  assert.throws(() => R.validateRecord(bad), pattern);
}

test('record copies the exact computed frame, full results, metadata, and selected candidate', () => {
  const snapshot = setup({truthRangeM: 43.7, snrDb: 0, errorCount: 4, index: 175});
  const actual = R.makeRecord(snapshot, DATE);
  assert.equal(R.validateRecord(actual), true);
  assert.equal(actual.schema, 'reference-uncertainty-record-v1');
  assert.equal(actual.kind, 'computed-mechanism-record');
  assert.equal(actual.provenance.modelVersion, C.MODEL_VERSION);
  assert.equal(actual.provenance.baseModelVersion, B.MODEL_VERSION);
  assert.equal(actual.provenance.rngVersion, B.RNG_VERSION);
  assert.equal(actual.provenance.sourcePage, 'reference-uncertainty.html#experiment');
  assert.equal(actual.provenance.sourceRevision, null);
  assert.equal(actual.provenance.recordCreatedAt, DATE);
  assert.equal(actual.provenance.observationCount, 1);
  assert.equal(actual.provenance.monteCarlo, false);
  assert.equal(actual.provenance.paperReproduction, false);
  assert.equal(actual.generatorConfig.noiseTrialIndex, 0);
  assert.deepEqual(actual.observation, snapshot.frame.observation);
  assert.deepEqual(actual.generatorConfig.noiseMetadata, snapshot.frame.noiseMetadata);
  assert.deepEqual(actual.referenceConfig.stressMetadata, snapshot.referenceConfig.stressMetadata);
  assert.deepEqual(actual.selectedInspection, snapshot.selectedInspection);
  assert.ok(actual.observation.flat().some(v => v !== Number(v.toFixed(8))), 'raw precision is preserved');
  for (const branch of branches) {
    const output = actual.branchResults[branch];
    for (const key of Object.keys(snapshot.results[branch])) assert.deepEqual(output[key], snapshot.results[branch][key]);
    assert.equal(output.scores.length, 600);
    assert.equal(output.sampleCount, branch === 'pilot' ? 4 : 16);
    assert.equal(output.matchingTerms, branch === 'pilot' ? 2400 : 9600);
    assert.equal(output.referenceEnergy, branch === 'pilot' ? 0.25 : 1);
    assert.equal(output.noiseOnlyMeanAtFixedCandidate, snapshot.frame.noiseMetadata.sigma2 / output.referenceEnergy);
    assert.match(output.noiseOnlyMeanKind, /theoretical/);
    assert.equal(actual.evaluationTruth.selectedSignedErrorM[branch], output.estimateM - snapshot.frame.truth.rangeM);
    assert.deepEqual(reconstructed(actual, branch), snapshot.inputs[branch]);
    assert.deepEqual(Object.keys(reconstructed(actual, branch)).sort(), ['ySelected', 'referenceSelected', 'frequencyOffsetsHz', 'candidatesM', 'cMps'].sort());
  }
  assert.equal(actual.sharedDesign.candidatesM.length, 600);
  assert.equal(actual.sharedDesign.frequencyOffsetsHz.length, 16);
  assert.equal(actual.sharedDesign.symbolDurationIncludingCpS, 0.000002);
  assert.equal(actual.sharedDesign.usefulGridEnergy, 1);
  assert.match(actual.sharedDesign.energyMeaning, /not Joules/);
  assert.match(actual.sharedDesign.candidateStepMeaning, /not physical resolution/);
  assert.equal(actual.referenceConfig.symbolErrorDefinition, 'injected-symbol-mismatch');
  assert.equal(actual.referenceConfig.dataSymbolCount, 12);
  assert.equal(actual.referenceConfig.frameSymbolCount, 16);
  assert.equal(actual.branchResults.oracle.declaredInformation.trueSymbolCount, 16);
  assert.equal(actual.branchResults.pilot.declaredInformation.processedSampleCount, 4);
  assert.equal(actual.branchResults.stress.declaredInformation.uncertainReferenceSymbolCount, 12);
  assert.ok(Buffer.byteLength(JSON.stringify(actual)) < 1024 * 1024);
});

test('serialization round-trip retains baseline equality, comb ties, noisy data and five-key replay', () => {
  const fixtures = [{}, {pilotMode: 'comb'}, {truthRangeM: 43.7, snrDb: 0, errorCount: 4},
    {pilotMode: 'comb', errorMode: 'ramp', errorCount: 12, index: 250},
    {truthRangeM: 120, pilotMode: 'comb', errorMode: 'ramp', errorCount: 12, index: 30}];
  for (const options of fixtures) {
    const snapshot = setup(options), actual = json(R.makeRecord(snapshot, DATE));
    assert.equal(R.validateRecord(actual), true);
    for (const b of branches) {
      const replay = json(C.receive(reconstructed(actual, b)));
      for (const key of Object.keys(replay)) assert.deepEqual(actual.branchResults[b][key], replay[key]);
    }
    const point = json(C.candidateAt(reconstructed(actual, actual.selectedInspection.branch), actual.selectedInspection.value.index));
    assert.deepEqual(actual.selectedInspection.value, point);
    if (!options.errorCount) assert.deepEqual(actual.branchResults.oracle.scores, actual.branchResults.stress.scores);
  }
  const aliases = record({pilotMode: 'comb'});
  assert.deepEqual(aliases.branchResults.pilot.tiedIndices, [100, 250, 400, 550]);
  assert.deepEqual(aliases.branchResults.pilot.tiedCandidatesM, [25, 62.5, 100, 137.5]);
  assert.equal(aliases.branchResults.pilot.estimateM, 25);
  const wrapped = record({truthRangeM: 120, pilotMode: 'comb', errorMode: 'ramp', errorCount: 12, index: 30});
  assert.equal(wrapped.branchResults.stress.estimateM, 7.5);
  assert.deepEqual(wrapped.evaluationTruth.rampEquivalentRange, {kind: 'analytic-equivalence', equivalentRangeM: 7.5});
  assert.equal(wrapped.evaluationTruth.selectedSignedErrorM.stress, -112.5, 'evaluate the selected candidate without truth-assisted tie/period selection');
});

test('all 600 ties survive when the actual computed observation is all zero', () => {
  // The serializer validates supplied data; it does not re-run or authenticate the generator.
  const snapshot = setup({snrDb: 0, pilotMode: 'comb', index: 599, branch: 'pilot'});
  snapshot.frame.observation = Array.from({length: 16}, () => [0, 0]);
  snapshot.inputs = C.assemble(snapshot.frame.observation, snapshot.inputs.stress.referenceSelected, 'comb');
  snapshot.results = Object.fromEntries(branches.map(b => [b, C.receive(snapshot.inputs[b])]));
  snapshot.selectedInspection.value = C.candidateAt(snapshot.inputs.pilot, 599);
  const actual = R.makeRecord(snapshot, DATE);
  for (const b of branches) {
    assert.equal(actual.branchResults[b].tieCount, 600);
    assert.equal(actual.branchResults[b].index, 0);
    assert.deepEqual(actual.branchResults[b].tiedIndices, Array.from({length: 600}, (_, j) => j));
    assert.deepEqual(actual.branchResults[b].tiedCandidatesM, C.CANDIDATES);
  }
  assert.equal(actual.selectedInspection.value.index, 599);
});

test('dual seeds and structured seed semantics are preserved without changing the observation', () => {
  for (const errorMode of ['random', 'rotate', 'ramp']) {
    const a = record({pilotMode: 'comb', errorMode, errorCount: 12, snrDb: 0, referenceSeed: 7});
    const b = record({pilotMode: 'comb', errorMode, errorCount: 12, snrDb: 0, referenceSeed: 8});
    assert.deepEqual(a.observation, b.observation);
    assert.equal(a.generatorConfig.noiseSeed, 2026); assert.equal(b.referenceConfig.referenceSeed, 8);
    assert.equal(a.referenceConfig.referenceSeedAffectsSymbols, errorMode === 'random');
    if (errorMode === 'random') assert.notDeepEqual(a.receiverInputs.stress.referenceSelected, b.receiverInputs.stress.referenceSelected);
    else assert.deepEqual(a.receiverInputs.stress.referenceSelected, b.receiverInputs.stress.referenceSelected);
    assert.deepEqual(a.referenceConfig.rampConvention, errorMode === 'ramp' ? {referencePhase: '+pi*k/2', shiftM: 37.5, periodM: 150, wrap: '[0,150)'} : null);
  }
});

test('record creation and validation never call numerical model methods, randomness, or JSON stringify', () => {
  const source = fs.readFileSync(path.join(__dirname, '../reference-uncertainty-record.js'), 'utf8');
  const snapshot = setup({snrDb: 0, errorCount: 4});
  const context = vm.createContext({serializedSnapshot: JSON.stringify(snapshot), createdAt: DATE});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../offgrid-range-core.js'), 'utf8') + '\n' +
    fs.readFileSync(path.join(__dirname, '../reference-uncertainty-core.js'), 'utf8'), context);
  vm.runInContext(`
    const forbidden = () => { throw new Error('forbidden numerical recomputation'); };
    ReferenceUncertaintyCore = {...ReferenceUncertaintyCore, generate: forbidden, reference: forbidden, assemble: forbidden, receive: forbidden, candidateAt: forbidden};
    OffgridRangeCore = {...OffgridRangeCore, generateObservation: forbidden, receiverTemplates: forbidden, receive: forbidden, RandomStream: forbidden};
    Math.random = forbidden;
    const snapshot = JSON.parse(serializedSnapshot);
    JSON.stringify = forbidden;
  `, context);
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('ReferenceUncertaintyRecord.validateRecord(ReferenceUncertaintyRecord.makeRecord(snapshot, createdAt))', context), true);
  assert.throws(() => vm.runInNewContext(source), /must be loaded/);
  assert.equal(Object.isFrozen(R), true);
  for (const [name, key] of [['ReferenceUncertaintyCore', 'MODEL_VERSION'], ['OffgridRangeCore', 'MODEL_VERSION'], ['OffgridRangeCore', 'RNG_VERSION']]) {
    const unsupported = {ReferenceUncertaintyCore: {...C}, OffgridRangeCore: {...B}};
    unsupported[name][key] = 'unreviewed-v2';
    assert.throws(() => vm.runInNewContext(source, unsupported), /Unsupported model or RNG version/);
  }
});

test('input, returned record, and later candidate/marker records are deeply isolated', () => {
  const snapshot = setup({snrDb: 0, errorCount: 4}), before = clone(snapshot);
  const original = R.makeRecord(snapshot, DATE), originalCopy = clone(original);
  assert.deepEqual(snapshot, before, 'makeRecord does not mutate its snapshot');
  snapshot.selectedInspection = {branch: 'pilot', value: C.candidateAt(snapshot.inputs.pilot, 201), truthMarkerShown: false, injectionMarksShown: true};
  const later = R.makeRecord(snapshot, '2026-10-11T17:00:01.000Z');
  assert.deepEqual(original, originalCopy);
  assert.deepEqual(later.observation, original.observation);
  assert.deepEqual(later.branchResults, original.branchResults);
  assert.notDeepEqual(later.selectedInspection, original.selectedInspection);
  snapshot.frame.observation[0][0] = 99;
  snapshot.inputs.stress.referenceSelected[0][0] = 99;
  snapshot.results.stress.scores[0] = 99;
  snapshot.referenceConfig.stressMetadata.rotationQuarterTurns[0] = 3;
  snapshot.frame.noiseMetadata.initialStateUint32[0] = 99;
  snapshot.selectedInspection.value.contributions[0][0] = 99;
  assert.deepEqual(original, originalCopy);
  later.sharedDesign.candidatesM[0] = 99;
  later.referenceConfig.stressMetadata.pilotIndices[0] = 99;
  assert.equal(C.CANDIDATES[0], 0); assert.equal(C.PILOTS.irregular[0], 0);
  assert.deepEqual(original, originalCopy);
  assert.equal(R.validateRecord(original), true);
});

test('every record field is bounded and unknown/missing fields, versions, dates and enums fail closed', () => {
  const good = record({snrDb: 0, errorCount: 4});
  const cases = [
    [r => r.schema = 'reference-uncertainty-record-v2', /schema/],
    [r => r.provenance.modelVersion = 'other-model', /modelVersion/],
    [r => r.provenance.baseModelVersion = 'other-model', /baseModelVersion/],
    [r => r.provenance.rngVersion = 'other-rng', /rngVersion/],
    [r => r.generatorConfig.noiseMetadata.rngVersion = 'other-rng', /rngVersion/],
    [r => r.referenceConfig.stressMetadata.rngVersion = 'other-rng', /rngVersion/],
    [r => r.provenance.sourceRevision = 'guessed-hash', /sourceRevision/],
    [r => r.referenceConfig.errorMode = 'unknown', /errorMode/],
    [r => r.referenceConfig.pilotMode = 'unknown', /pilotMode/],
    [r => r.selectedInspection.branch = 'unknown', /branch/],
    [r => r.generatorConfig.snrDb = -5, /snrDb/],
    [r => r.extra = 1, /fields/], [r => r.observation[0].push(1), /length/],
    [r => delete r.observation[0][0], /dense/], [r => r.observation.extra = 1, /dense/],
    [r => delete r.selectedInspection.value.score, /fields/],
    [r => r.receiverInputs.oracle.truth = r.evaluationTruth, /fields/],
    [r => r.branchResults.oracle.scores.length = 599, /length/],
    [r => r.branchResults.oracle.scores.push(0), /length/],
    [r => r.sharedDesign.candidatesM[100] = 25.1, /candidatesM/],
    [r => r.sharedDesign.frequencyOffsetsHz[1] = 1, /frequencyOffsetsHz/],
    [r => r.selectedInspection.value.templateSamples.length = 15, /length/],
    [r => r.limits = [], /length/],
    [r => r.referenceConfig.stressMetadata.permutation = Array(12).fill(0), /permutation/],
    [r => r.generatorConfig.noiseMetadata.initialStateUint32 = [0, 0, 0, 0], /zero RNG state/],
    [r => r.provenance.recordCreatedAt = '2026-02-30T17:00:00.000Z', /timestamp/],
    [r => r.provenance.recordCreatedAt = '2026-10-11', /timestamp/]
  ];
  for (const [mutate, pattern] of cases) mutateRejected(good, mutate, pattern);
  for (const value of [null, '', 'tomorrow', '2026-10-11T17:00:00Z', '2026-13-11T17:00:00.000Z'])
    assert.throws(() => R.makeRecord(setup(), value), /timestamp/);
  const auto = R.makeRecord(setup());
  assert.equal(new Date(auto.provenance.recordCreatedAt).toISOString(), auto.provenance.recordCreatedAt);
});

test('nonfinite, wrong primitive types and invalid seeds are rejected before cloning', () => {
  const good = record({snrDb: 0, errorCount: 4});
  const numericPaths = [r => r.observation[0], r => r.branchResults.oracle.scores, r => r.selectedInspection.value.fittedGain,
    r => r.generatorConfig.noiseMetadata.initialStateUint32, r => r.referenceConfig.stressMetadata.rotationQuarterTurns];
  for (const get of numericPaths) for (const value of [NaN, Infinity, -Infinity, '1', null, undefined, 1n])
    mutateRejected(good, r => { get(r)[0] = value; }, /finite/);
  for (const seed of [-1, 4294967296, 0.5, NaN, Infinity, '7', null]) {
    mutateRejected(good, r => r.generatorConfig.noiseSeed = seed);
    mutateRejected(good, r => r.referenceConfig.referenceSeed = seed);
  }
  mutateRejected(good, r => r.selectedInspection.truthMarkerShown = 1, /boolean/);
  mutateRejected(good, r => r.branchResults.stress.residualEnergy = -1, /nonnegative/);
  const snapshot = setup(); snapshot.frame.observation[0][0] = NaN;
  assert.throws(() => R.makeRecord(snapshot, DATE), /finite/);
});

test('accessors, symbol keys, exotic objects and omitted fields never enter serialization', () => {
  const good = record();
  let called = false;
  const accessor = clone(good);
  Object.defineProperty(accessor.provenance, 'modelVersion', {enumerable: true, get() { called = true; return C.MODEL_VERSION; }});
  assert.throws(() => R.validateRecord(accessor), /accessors/); assert.equal(called, false);
  const itemAccessor = clone(good);
  Object.defineProperty(itemAccessor.observation[0], '0', {enumerable: true, get() { called = true; return 0; }});
  assert.throws(() => R.validateRecord(itemAccessor), /accessors/); assert.equal(called, false);
  for (const makeBad of [r => Object.defineProperty(r, 'hidden', {value: 1}), r => r[Symbol('hidden')] = 1,
    r => r.observation[Symbol('hidden')] = 1, r => Object.setPrototypeOf(r.provenance, {extra: 1}),
    r => Object.setPrototypeOf(r.observation, Object.create(Array.prototype)),
    r => r.toJSON = () => { called = true; return {}; }, r => Object.defineProperty(r, 'kind', {enumerable: false})]) {
    const bad = clone(good); makeBad(bad); assert.throws(() => R.validateRecord(bad));
  }
  assert.equal(called, false);
  const snapshot = setup();
  for (const key of Object.keys(snapshot)) {
    const bad = clone(snapshot); delete bad[key]; assert.throws(() => R.makeRecord(bad, DATE), /fields/);
  }
  const extraInput = clone(snapshot); extraInput.inputs.pilot.truthRangeM = 25;
  assert.throws(() => R.makeRecord(extraInput, DATE), /fields/);
});

test('bad actual input slices are rejected instead of exporting a misleading shared observation', () => {
  const good = setup({snrDb: 0, errorCount: 4});
  for (const change of [s => s.inputs.pilot.ySelected[1][0] += 1,
    s => s.inputs.stress.ySelected[15][1] += 1,
    s => s.inputs.pilot.frequencyOffsetsHz[1] = 1e6,
    s => s.inputs.oracle.referenceSelected[0][0] = -0.25,
    s => s.inputs.stress.referenceSelected[1][0] += 0.25,
    s => s.inputs.oracle.candidatesM[300] += 0.25,
    s => s.inputs.stress.cMps = 1]) {
    const bad = clone(good); change(bad); assert.throws(() => R.makeRecord(bad, DATE));
  }
  const actual = R.makeRecord(good, DATE);
  mutateRejected(actual, r => r.receiverInputs.pilot.sampleIndices[1] = 1, /sampleIndices/);
});

test('score/tie/index/budget inconsistencies, partial edits, and structured metadata tampering are rejected', () => {
  const good = record({pilotMode: 'comb', errorMode: 'ramp', errorCount: 12, index: 250});
  const cases = [
    [r => r.branchResults.stress.scores[0] = 100, /maxScore/],
    [r => r.branchResults.stress.scores[250] += 0.01, /maxScore/],
    [r => r.branchResults.pilot.tieCount = 1, /tieCount/],
    [r => r.branchResults.pilot.tiedIndices = [100], /tiedIndices/],
    [r => r.branchResults.pilot.tiedCandidatesM[1] = 62, /tiedCandidatesM/],
    [r => r.branchResults.pilot.index = 250, /smallest tie/],
    [r => r.branchResults.pilot.tieTolerance *= 2, /tieTolerance/],
    [r => r.branchResults.pilot.matchingTerms = 9600, /matchingTerms/],
    [r => r.branchResults.pilot.referenceEnergy = 1, /referenceEnergy/],
    [r => r.branchResults.pilot.sampleCount = 16, /sampleCount/],
    [r => r.branchResults.oracle.residualEnergy = 10, /energy balance/],
    [r => r.branchResults.stress.fittedGain[0] += 1, /fittedGain/],
    [r => r.selectedInspection.value.index = 251, /candidateM/],
    [r => r.selectedInspection.value.score += 1, /branch score/],
    [r => r.selectedInspection.value.contributions[0][0] += 1, /contributions/],
    [r => r.selectedInspection.value.residuals[0][0] += 1, /residuals/],
    [r => r.selectedInspection.value.residualEnergy += 1, /residualEnergy/],
    [r => r.generatorConfig.noiseSeed += 1, /noise seed/],
    [r => r.referenceConfig.referenceSeed += 1, /referenceSeed/],
    [r => r.referenceConfig.referenceSeedAffectsSymbols = true, /referenceSeedAffectsSymbols/],
    [r => r.referenceConfig.stressMetadata.rotationQuarterTurns[1] = 2, /structured quarter/],
    [r => r.referenceConfig.stressMetadata.rotationQuarterTurns[0] = 1, /errorIndices/],
    [r => r.receiverInputs.stress.referenceSelected[1][0] += 1, /quarter turn/],
    [r => r.evaluationTruth.selectedSignedErrorM.stress = 0, /selectedSignedErrorM/],
    [r => r.evaluationTruth.alpha = [1, 0], /truth alpha/],
    [r => r.evaluationTruth.rampEquivalentRange.equivalentRangeM = 25, /rampEquivalentRange/],
    [r => r.branchResults.stress.noiseOnlyMeanAtFixedCandidate = 1, /noiseOnlyMeanAtFixedCandidate/],
    [r => r.branchResults.stress.declaredInformation.trueSymbolCount = 16, /trueSymbolCount/]
  ];
  for (const [mutate, pattern] of cases) mutateRejected(good, mutate, pattern);
});

test('representative seeds, SNRs, modes, selected branches, boundaries and timestamps remain valid', () => {
  for (const truthRangeM of [0, 25, 43.7, 120]) for (const snrDb of [null, -10, 0, 10, 20]) {
    const actual = record({truthRangeM, snrDb, errorCount: 7, noiseSeed: 4294967295, referenceSeed: 0, branch: 'pilot', index: 599});
    assert.equal(R.validateRecord(json(actual)), true);
    near(actual.generatorConfig.noiseMetadata.sigma2, snrDb === null ? 0 : 1 / (16 * 10 ** (snrDb / 10)));
  }
});
