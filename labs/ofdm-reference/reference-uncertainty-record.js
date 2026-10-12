/* A bounded record of already-computed values, not a simulator or replay verifier.
 * No generator, reference, receiver, or candidate calculation is called here.
 * Validation checks the schema and arithmetic relationships of supplied values;
 * it does not authenticate their provenance or independently reproduce the model.
 */
(function(root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports)
    module.exports = factory(require('./reference-uncertainty-core.js'), require('./offgrid-range-core.js'));
  else root.ReferenceUncertaintyRecord = factory(root.ReferenceUncertaintyCore, root.OffgridRangeCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(core, base) {
  'use strict';
  if (!core || !base || !core.cfg || !base.cfg || !core.MODEL_VERSION || !base.MODEL_VERSION || !base.RNG_VERSION)
    throw new Error('ReferenceUncertaintyCore and OffgridRangeCore must be loaded before ReferenceUncertaintyRecord');
  // Schema v1 is reviewed only for these implementations. Record provenance still
  // uses their immutable exported constants, never a guessed runtime revision.
  if (core.MODEL_VERSION !== 'reference-uncertainty-model-v1' || base.MODEL_VERSION !== 'offgrid-range-model-v1' ||
      base.RNG_VERSION !== 'xoshiro128ss-splitmix32-fnv1a-ascii-boxmuller-v1')
    throw new Error('Unsupported model or RNG version for reference-uncertainty-record-v1');

  const SCHEMA = 'reference-uncertainty-record-v1', KIND = 'computed-mechanism-record';
  const BRANCHES = ['oracle', 'pilot', 'stress'], ALL = Array.from({length: 16}, (_, k) => k);
  const RESULT_KEYS = ['status', 'index', 'estimateM', 'fittedGain', 'selectedScore', 'maxScore',
    'residualEnergy', 'scores', 'tieTolerance', 'tieCount', 'tiedIndices', 'tiedCandidatesM',
    'referenceEnergy', 'sampleCount', 'matchingTerms'];
  const LIMITS = ['single static monostatic OFDM target', 'fixed 16-tone useful grid',
    'one synthetic observation; no Monte Carlo', 'finite 600-candidate search grid',
    'artificial reference-symbol errors; not a decoder or a semi-blind algorithm',
    'different reference information; equal shared design is not equal information',
    'not a paper reproduction, detection claim, performance certification, screenshot, or session log',
    'no network or persistent storage; download request is not a saved-file receipt'];
  const SHARED_DESIGN = {
    cMps: core.cfg.c, n: core.cfg.n, dfHz: core.cfg.df, tuS: core.cfg.tu, cpS: core.cfg.cp,
    frequencyOffsetsHz: core.F, candidatesM: core.CANDIDATES,
    nominalBandwidthHz: core.cfg.nominalBandwidthHz, toneSpanHz: core.cfg.toneSpanHz,
    usefulGridEnergy: core.cfg.usefulEnergy, symbolDurationIncludingCpS: core.cfg.tu + core.cfg.cp,
    energyMeaning: 'normalized useful-grid energy; not Joules or measured RF energy',
    rangePeriodM: core.cfg.rangePeriod, fullBandFirstNullM: core.cfg.firstNullM,
    candidateStepM: core.cfg.gridStepM, candidateStepMeaning: 'computational grid spacing; not physical resolution',
    score: 'abs(sum(conj(template)*y)/referenceEnergy)^2',
    tieRule: 'Q >= maxQ - 64*EPSILON*max(1,maxQ)', selectedTieRule: 'smallest candidate index'
  };
  const DECLARED_INFORMATION = {
    oracle: {trueSymbolCount: 16, uncertainReferenceSymbolCount: 0, processedSampleCount: 16,
      meaning: 'all 16 true transmitted symbols are extra receiver reference information'},
    pilot: {trueSymbolCount: 4, uncertainReferenceSymbolCount: 0, processedSampleCount: 4,
      meaning: 'only four true pilot symbols and their four observation samples are used'},
    stress: {trueSymbolCount: 4, uncertainReferenceSymbolCount: 12, processedSampleCount: 16,
      meaning: 'four true pilots plus 12 supplied reference symbols that are not guaranteed correct'}
  };
  const RAMP_CONVENTION = {referencePhase: '+pi*k/2', shiftM: 37.5, periodM: 150, wrap: '[0,150)'};
  const NOISE_MEAN_KIND = 'theoretical-pure-noise-mean-at-fixed-candidate; not a measurement or threshold';
  const TIME_MEANING = 'record construction time; not physical acquisition or successful download time';

  function reject(label, message) { throw new TypeError(label + ': ' + message); }
  function check(condition, label, message) { if (!condition) reject(label, message); }
  function finite(value, label) { check(typeof value === 'number' && Number.isFinite(value), label, 'finite number required'); }
  function nonnegative(value, label) { finite(value, label); check(value >= 0, label, 'nonnegative number required'); }
  function integer(min, max) { return (value, label) => {
    finite(value, label); check(Number.isInteger(value) && value >= min && value <= max, label, 'integer within [' + min + ',' + max + '] required');
  }; }
  const uint32 = integer(0, 4294967295), sampleIndex = integer(0, 15), candidateIndex = integer(0, 599);
  function literal(expected) { return (value, label) => check(value === expected, label, 'expected ' + String(expected)); }
  function oneOf(choices) { return (value, label) => check(choices.includes(value), label, 'unsupported enum value'); }
  function boolean(value, label) { check(typeof value === 'boolean', label, 'boolean required'); }
  function date(value, label) {
    check(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value), label, 'canonical UTC ISO timestamp required');
    const parsed = Date.parse(value);
    check(Number.isFinite(parsed) && new Date(parsed).toISOString() === value, label, 'valid UTC ISO timestamp required');
  }
  function keys(value, names, label) {
    check(value !== null && typeof value === 'object' && !Array.isArray(value) &&
      [Object.prototype, null].includes(Object.getPrototypeOf(value)), label, 'plain object required');
    const actual = Reflect.ownKeys(value);
    check(actual.length === names.length && actual.every(k => typeof k === 'string' && names.includes(k)), label, 'exact known fields required (unknown or missing field)');
    for (const key of actual) {
      const d = Object.getOwnPropertyDescriptor(value, key);
      check(Object.prototype.hasOwnProperty.call(d, 'value') && d.enumerable, label + '.' + key, 'enumerable data property required; accessors are not allowed');
    }
  }
  function object(spec) { return (value, label) => {
    keys(value, Object.keys(spec), label);
    for (const key of Object.keys(spec)) spec[key](value[key], label + '.' + key);
  }; }
  function array(item, min, max = min) { return (value, label) => {
    check(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype && value.length >= min && value.length <= max, label, 'plain array length within [' + min + ',' + max + '] required');
    const actual = Reflect.ownKeys(value);
    check(actual.length === value.length + 1 && actual.every(k => k === 'length' ||
      (typeof k === 'string' && /^(0|[1-9]\d*)$/.test(k) && Number(k) < value.length)), label, 'dense array with no extra fields required');
    for (let j = 0; j < value.length; j++) {
      const d = Object.getOwnPropertyDescriptor(value, String(j));
      check(d && Object.prototype.hasOwnProperty.call(d, 'value') && d.enumerable, label + '[' + j + ']', 'enumerable data item required; accessors are not allowed');
    }
    for (let j = 0; j < value.length; j++) item(value[j], label + '[' + j + ']');
  }; }
  function exact(expected) {
    if (Array.isArray(expected)) return (value, label) => {
      array(() => {}, expected.length)(value, label);
      expected.forEach((item, j) => exact(item)(value[j], label + '[' + j + ']'));
    };
    if (expected && typeof expected === 'object') return object(Object.fromEntries(Object.entries(expected).map(([k, v]) => [k, exact(v)])));
    return literal(expected);
  }
  function copy(value) {
    if (Array.isArray(value)) return value.map(copy);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)]));
    return value;
  }
  function same(actual, expected, label) { exact(expected)(actual, label); }
  function near(actual, expected, label) {
    finite(expected, label + '.expected');
    check(Math.abs(actual - expected) <= 1e-11 + 1e-10 * Math.max(Math.abs(actual), Math.abs(expected)), label, 'arithmetic consistency mismatch');
  }
  const pair = array(finite, 2), complex = count => array(pair, count);
  const generatorSpec = {truthRangeM: (v, p) => { finite(v, p); check(v >= 0 && v <= 120, p, 'range within [0,120] m required'); },
    snrDb: oneOf([null, -10, 0, 10, 20]), noiseSeed: uint32};
  const noiseSpec = {domain: literal('offgrid-range-v1/noise/trial/0'), domainHashUint32: literal(328163849),
    initialStateUint32: array(uint32, 4), sigma2: nonnegative, noiseEnergy: nonnegative,
    seedUint32: uint32, snrDb: generatorSpec.snrDb, rngVersion: literal(base.RNG_VERSION)};
  const stressSpec = {pilotMode: oneOf(['irregular', 'comb']), errorMode: oneOf(['random', 'rotate', 'ramp']),
    errorCount: integer(0, 12), errorIndices: array(sampleIndex, 0, 12), rotationQuarterTurns: array(integer(0, 3), 16),
    dataIndices: array(sampleIndex, 12), pilotIndices: array(sampleIndex, 4), referenceSeed: uint32,
    permutation: array(sampleIndex, 12), permutationDomain: oneOf(['irregular', 'comb'].map(mode => core.MODEL_VERSION + '/reference/permutation/' + mode)),
    rotationDomain: oneOf(['irregular', 'comb'].map(mode => core.MODEL_VERSION + '/reference/rotations/' + mode)), rngVersion: literal(base.RNG_VERSION)};
  const referenceSpec = {pilotMode: stressSpec.pilotMode, errorMode: stressSpec.errorMode, errorCount: stressSpec.errorCount,
    referenceSeed: uint32, stressMetadata: object(stressSpec)};
  const truthSpec = {rangeM: generatorSpec.truthRangeM, phaseRad: literal(core.cfg.phaseRad), alpha: pair, transmitSymbols: complex(16)};
  const resultSpec = {status: literal('estimate'), index: candidateIndex, estimateM: finite, fittedGain: pair,
    selectedScore: nonnegative, maxScore: nonnegative, residualEnergy: nonnegative, scores: array(nonnegative, 600),
    tieTolerance: nonnegative, tieCount: integer(1, 600), tiedIndices: array(candidateIndex, 1, 600),
    tiedCandidatesM: array(finite, 1, 600), referenceEnergy: nonnegative, sampleCount: oneOf([4, 16]), matchingTerms: oneOf([2400, 9600])};
  const inspectionSpec = {branch: oneOf(BRANCHES), value: object({index: candidateIndex, candidateM: finite, fittedGain: pair,
    score: nonnegative, residualEnergy: nonnegative, referenceEnergy: nonnegative, sampleCount: oneOf([4, 16]),
    contributions: array(pair, 4, 16), templateSamples: array(pair, 4, 16), residuals: array(pair, 4, 16)}),
    truthMarkerShown: boolean, injectionMarksShown: boolean};
  const inputSpec = count => ({ySelected: complex(count), referenceSelected: complex(count), frequencyOffsetsHz: array(finite, count),
    candidatesM: array(finite, 600), cMps: literal(core.cfg.c)});
  const snapshotSpec = {generatorConfig: object(generatorSpec), referenceConfig: object(referenceSpec),
    frame: object({observation: complex(16), truth: object(truthSpec), noiseMetadata: object(noiseSpec)}),
    inputs: object(Object.fromEntries(BRANCHES.map(b => [b, object(inputSpec(b === 'pilot' ? 4 : 16))]))),
    results: object(Object.fromEntries(BRANCHES.map(b => [b, object(resultSpec)]))), selectedInspection: object(inspectionSpec)};

  function validateComputed(snapshot) {
    object(snapshotSpec)(snapshot, 'snapshot');
    const {generatorConfig: gen, referenceConfig: ref, frame, inputs, results, selectedInspection: inspection} = snapshot;
    const noise = frame.noiseMetadata, stress = ref.stressMetadata, pilots = core.PILOTS[ref.pilotMode];
    const data = ALL.filter(k => !pilots.includes(k));
    same(frame.truth.rangeM, gen.truthRangeM, 'truth range / generatorConfig');
    same(frame.truth.transmitSymbols, core.X, 'truth transmitSymbols');
    near(frame.truth.alpha[0], Math.cos(frame.truth.phaseRad), 'truth alpha real / phaseRad');
    near(frame.truth.alpha[1], Math.sin(frame.truth.phaseRad), 'truth alpha imaginary / phaseRad');
    same(noise.seedUint32, gen.noiseSeed, 'noise seed / generatorConfig');
    same(noise.snrDb, gen.snrDb, 'noise SNR / generatorConfig');
    same(noise.sigma2, gen.snrDb === null ? 0 : 1 / (16 * 10 ** (gen.snrDb / 10)), 'noise sigma2');
    check(noise.initialStateUint32.some(Boolean), 'noise initialStateUint32', 'zero RNG state is invalid');
    if (gen.snrDb === null) same(noise.noiseEnergy, 0, 'noiseless noiseEnergy');
    for (const key of ['pilotMode', 'errorMode', 'errorCount', 'referenceSeed']) same(stress[key], ref[key], 'stressMetadata.' + key);
    same(stress.pilotIndices, pilots, 'stressMetadata.pilotIndices');
    same(stress.dataIndices, data, 'stressMetadata.dataIndices');
    same(stress.permutation.slice().sort((a, b) => a - b), data, 'stressMetadata.permutation');
    same(stress.permutationDomain, core.MODEL_VERSION + '/reference/permutation/' + ref.pilotMode, 'stressMetadata.permutationDomain');
    same(stress.rotationDomain, core.MODEL_VERSION + '/reference/rotations/' + ref.pilotMode, 'stressMetadata.rotationDomain');
    const errors = ALL.filter(k => stress.rotationQuarterTurns[k] !== 0);
    same(stress.errorIndices, errors, 'stressMetadata.errorIndices / quarter turns');
    same(stress.errorCount, errors.length, 'stressMetadata.errorCount / quarter turns');
    pilots.forEach(k => same(stress.rotationQuarterTurns[k], 0, 'pilot quarter turn ' + k));
    if (ref.errorMode === 'random') same(errors, stress.permutation.slice(0, ref.errorCount).sort((a, b) => a - b), 'random errorIndices / permutation');
    else {
      same(ref.pilotMode, 'comb', 'structured pilotMode'); same(ref.errorCount, 12, 'structured errorCount');
      ALL.forEach(k => same(stress.rotationQuarterTurns[k], pilots.includes(k) ? 0 : ref.errorMode === 'rotate' ? 1 : k % 4, 'structured quarter turn ' + k));
    }
    for (const branch of BRANCHES) {
      const input = inputs[branch], result = results[branch], indices = branch === 'pilot' ? pilots : ALL;
      same(input.ySelected, indices.map(k => frame.observation[k]), branch + '.ySelected / actual observation');
      same(input.frequencyOffsetsHz, indices.map(k => core.F[k]), branch + '.frequencyOffsetsHz / sample indices');
      same(input.candidatesM, core.CANDIDATES, branch + '.candidatesM');
      if (branch !== 'stress') same(input.referenceSelected, indices.map(k => core.X[k]), branch + '.referenceSelected');
      else input.referenceSelected.forEach((z, k) => {
        const [re, im] = core.X[k], turn = stress.rotationQuarterTurns[k];
        same(z, turn === 0 ? [re, im] : turn === 1 ? [-im, re] : turn === 2 ? [-re, -im] : [im, -re], 'stress.referenceSelected / injected quarter turn ' + k);
      });
      same(result.sampleCount, indices.length, branch + '.sampleCount');
      same(result.matchingTerms, indices.length * 600, branch + '.matchingTerms');
      same(result.referenceEnergy, indices.length / 16, branch + '.referenceEnergy');
      same(result.maxScore, Math.max(...result.scores), branch + '.maxScore');
      same(result.tieTolerance, core.cfg.tieUlps * Number.EPSILON * Math.max(1, result.maxScore), branch + '.tieTolerance');
      // The actual tie set is read only from all 600 supplied scores.
      const tiedIndices = result.scores.reduce((out, q, j) => { if (q >= result.maxScore - result.tieTolerance) out.push(j); return out; }, []);
      same(result.tiedIndices, tiedIndices, branch + '.tiedIndices / scores');
      same(result.tieCount, tiedIndices.length, branch + '.tieCount');
      same(result.tiedCandidatesM, tiedIndices.map(j => core.CANDIDATES[j]), branch + '.tiedCandidatesM');
      same(result.index, tiedIndices[0], branch + '.index / smallest tie');
      same(result.estimateM, core.CANDIDATES[result.index], branch + '.estimateM');
      same(result.selectedScore, result.scores[result.index], branch + '.selectedScore');
      same(result.selectedScore, result.fittedGain[0] * result.fittedGain[0] + result.fittedGain[1] * result.fittedGain[1], branch + '.selectedScore / fittedGain');
      const observationEnergy = input.ySelected.reduce((sum, z) => sum + z[0] * z[0] + z[1] * z[1], 0);
      near(result.residualEnergy, observationEnergy - result.referenceEnergy * result.selectedScore, branch + '.residualEnergy / energy balance');
    }
    const point = inspection.value, input = inputs[inspection.branch], result = results[inspection.branch];
    same(point.candidateM, core.CANDIDATES[point.index], 'selectedInspection.candidateM');
    same(point.score, result.scores[point.index], 'selectedInspection.score / branch score');
    same(point.score, point.fittedGain[0] * point.fittedGain[0] + point.fittedGain[1] * point.fittedGain[1], 'selectedInspection.score / fittedGain');
    same(point.sampleCount, result.sampleCount, 'selectedInspection.sampleCount');
    same(point.referenceEnergy, result.referenceEnergy, 'selectedInspection.referenceEnergy');
    for (const key of ['contributions', 'templateSamples', 'residuals']) same(point[key].length, point.sampleCount, 'selectedInspection.' + key + '.length');
    let residualEnergy = 0, templateEnergy = 0; const sum = [0, 0];
    point.templateSamples.forEach(([ar, ai], j) => {
      const [yr, yi] = input.ySelected[j], [gr, gi] = point.fittedGain;
      same(point.contributions[j], [(ar * yr + ai * yi) / point.referenceEnergy, (ar * yi - ai * yr) / point.referenceEnergy], 'selectedInspection.contributions[' + j + ']');
      same(point.residuals[j], [yr - (gr * ar - gi * ai), yi - (gr * ai + gi * ar)], 'selectedInspection.residuals[' + j + ']');
      const [er, ei] = point.residuals[j]; residualEnergy += er * er + ei * ei;
      templateEnergy += ar * ar + ai * ai;
      sum[0] += point.contributions[j][0]; sum[1] += point.contributions[j][1];
    });
    same(point.residualEnergy, residualEnergy, 'selectedInspection.residualEnergy');
    near(templateEnergy, point.referenceEnergy, 'selectedInspection.templateEnergy');
    near(sum[0], point.fittedGain[0], 'selectedInspection.sum.real'); near(sum[1], point.fittedGain[1], 'selectedInspection.sum.imaginary');
    if (point.index === result.index) {
      same(point.fittedGain, result.fittedGain, 'selectedInspection.selected fittedGain');
      same(point.residualEnergy, result.residualEnergy, 'selectedInspection.selected residualEnergy');
    }
    return true;
  }

  const recordSpec = {
    kind: literal(KIND), schema: literal(SCHEMA),
    provenance: object({modelVersion: literal(core.MODEL_VERSION), baseModelVersion: literal(base.MODEL_VERSION), rngVersion: literal(base.RNG_VERSION),
      sourcePage: literal('reference-uncertainty.html#experiment'), sourceRevision: literal(null), recordCreatedAt: date,
      recordCreatedAtMeaning: literal(TIME_MEANING), evidenceKind: literal('single-synthetic-observation'), observationCount: literal(1), monteCarlo: literal(false), paperReproduction: literal(false)}),
    generatorConfig: object({...generatorSpec, phaseRad: literal(core.cfg.phaseRad), noiseMetadata: object(noiseSpec), noiseTrialIndex: literal(0)}),
    referenceConfig: object({...referenceSpec, referenceSeedAffectsSymbols: boolean, symbolErrorDefinition: literal('injected-symbol-mismatch'),
      dataSymbolCount: literal(12), frameSymbolCount: literal(16), rampConvention: (v, p) => v === null ? undefined : exact(RAMP_CONVENTION)(v, p)}),
    sharedDesign: exact(SHARED_DESIGN), observation: complex(16),
    receiverInputs: object(Object.fromEntries(BRANCHES.map(b => [b, object({sampleIndices: array(sampleIndex, b === 'pilot' ? 4 : 16), referenceSelected: complex(b === 'pilot' ? 4 : 16)})]))),
    branchResults: object(Object.fromEntries(BRANCHES.map(b => [b, object({...resultSpec, declaredInformation: exact(DECLARED_INFORMATION[b]),
      noiseOnlyMeanAtFixedCandidate: nonnegative, noiseOnlyMeanKind: literal(NOISE_MEAN_KIND)})]))),
    evaluationTruth: object({...truthSpec, selectedSignedErrorM: object(Object.fromEntries(BRANCHES.map(b => [b, finite]))),
      rampEquivalentRange: (v, p) => v === null ? undefined : object({kind: literal('analytic-equivalence'), equivalentRangeM: finite})(v, p)}),
    selectedInspection: object(inspectionSpec), limits: exact(LIMITS)
  };

  function validateRecord(record) {
    // The exact bounded shape is checked before selecting indices or cloning data.
    object(recordSpec)(record, 'record');
    const gen = record.generatorConfig, ref = record.referenceConfig, truth = record.evaluationTruth, results = {}, inputs = {};
    for (const branch of BRANCHES) {
      const saved = record.receiverInputs[branch], result = record.branchResults[branch];
      const indices = branch === 'pilot' ? core.PILOTS[ref.pilotMode] : ALL;
      same(saved.sampleIndices, indices, 'receiverInputs.' + branch + '.sampleIndices');
      // This is an explicit five-key reconstruction. Evaluation truth is never copied into it.
      inputs[branch] = {ySelected: indices.map(k => record.observation[k]), referenceSelected: saved.referenceSelected,
        frequencyOffsetsHz: indices.map(k => record.sharedDesign.frequencyOffsetsHz[k]), candidatesM: record.sharedDesign.candidatesM, cMps: record.sharedDesign.cMps};
      results[branch] = Object.fromEntries(RESULT_KEYS.map(key => [key, result[key]]));
      same(result.noiseOnlyMeanAtFixedCandidate, gen.noiseMetadata.sigma2 / result.referenceEnergy, branch + '.noiseOnlyMeanAtFixedCandidate');
      same(truth.selectedSignedErrorM[branch], result.estimateM - truth.rangeM, branch + '.selectedSignedErrorM');
    }
    same(ref.referenceSeedAffectsSymbols, ref.errorMode === 'random', 'referenceSeedAffectsSymbols');
    same(ref.rampConvention, ref.errorMode === 'ramp' ? RAMP_CONVENTION : null, 'rampConvention');
    same(truth.rampEquivalentRange, ref.errorMode === 'ramp' ? {kind: 'analytic-equivalence', equivalentRangeM: (truth.rangeM + 37.5) % 150} : null, 'rampEquivalentRange');
    validateComputed({generatorConfig: {truthRangeM: gen.truthRangeM, snrDb: gen.snrDb, noiseSeed: gen.noiseSeed},
      referenceConfig: Object.fromEntries(Object.keys(referenceSpec).map(key => [key, ref[key]])),
      frame: {observation: record.observation, truth: Object.fromEntries(Object.keys(truthSpec).map(key => [key, truth[key]])), noiseMetadata: gen.noiseMetadata},
      inputs, results, selectedInspection: record.selectedInspection});
    return true;
  }

  function makeRecord(snapshot, recordCreatedAt = new Date().toISOString()) {
    validateComputed(snapshot); date(recordCreatedAt, 'recordCreatedAt');
    const {generatorConfig: gen, referenceConfig: ref, frame, inputs, results, selectedInspection} = snapshot;
    const receiverInputs = {}, branchResults = {}, selectedSignedErrorM = {};
    for (const branch of BRANCHES) {
      receiverInputs[branch] = {sampleIndices: branch === 'pilot' ? core.PILOTS[ref.pilotMode] : ALL, referenceSelected: inputs[branch].referenceSelected};
      branchResults[branch] = {...results[branch], declaredInformation: DECLARED_INFORMATION[branch],
        noiseOnlyMeanAtFixedCandidate: frame.noiseMetadata.sigma2 / results[branch].referenceEnergy, noiseOnlyMeanKind: NOISE_MEAN_KIND};
      selectedSignedErrorM[branch] = results[branch].estimateM - frame.truth.rangeM;
    }
    const record = {kind: KIND, schema: SCHEMA,
      provenance: {modelVersion: core.MODEL_VERSION, baseModelVersion: base.MODEL_VERSION, rngVersion: base.RNG_VERSION,
        sourcePage: 'reference-uncertainty.html#experiment', sourceRevision: null, recordCreatedAt, recordCreatedAtMeaning: TIME_MEANING,
        evidenceKind: 'single-synthetic-observation', observationCount: 1, monteCarlo: false, paperReproduction: false},
      generatorConfig: {...gen, phaseRad: frame.truth.phaseRad, noiseMetadata: frame.noiseMetadata, noiseTrialIndex: 0},
      referenceConfig: {...ref, referenceSeedAffectsSymbols: ref.errorMode === 'random', symbolErrorDefinition: 'injected-symbol-mismatch',
        dataSymbolCount: 12, frameSymbolCount: 16, rampConvention: ref.errorMode === 'ramp' ? RAMP_CONVENTION : null},
      sharedDesign: SHARED_DESIGN, observation: frame.observation, receiverInputs, branchResults,
      evaluationTruth: {...frame.truth, selectedSignedErrorM,
        rampEquivalentRange: ref.errorMode === 'ramp' ? {kind: 'analytic-equivalence', equivalentRangeM: (frame.truth.rangeM + 37.5) % 150} : null},
      selectedInspection, limits: LIMITS};
    validateRecord(record);
    return copy(record);
  }

  return Object.freeze({SCHEMA, KIND, makeRecord, validateRecord});
});
