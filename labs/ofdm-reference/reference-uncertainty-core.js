/* One immutable transmitted grid and one observation, three reference conditions.
 * Thin wrapper around OffgridRangeCore; complex samples are [real, imaginary].
 * Truth and injection records never enter receive() or candidateAt().
 */
(function(root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./offgrid-range-core.js'));
  else root.ReferenceUncertaintyCore = factory(root.OffgridRangeCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(base) {
  'use strict';
  if (!base || typeof base.receiverTemplates !== 'function' || typeof base.receive !== 'function')
    throw new Error('OffgridRangeCore must be loaded before ReferenceUncertaintyCore');

  const MODEL_VERSION = 'reference-uncertainty-model-v1';
  const cfg = Object.freeze({c: base.cfg.c, n: base.cfg.n, df: base.cfg.df,
    tu: base.cfg.tu, cp: base.cfg.cp, rangePeriod: base.cfg.rangePeriod,
    firstNullM: base.cfg.firstNullM, tieUlps: base.cfg.tieUlps, gridStepM: 0.25,
    usefulEnergy: 1, phaseRad: 0.7, minTruthM: 0, maxTruthM: 120,
    nominalBandwidthHz: 16000000, toneSpanHz: 15000000});
  const X = base.X, F = base.F;
  const CANDIDATES = Object.freeze(Array.from({length: 600}, (_, j) => j / 4));
  const PILOTS = Object.freeze({irregular: Object.freeze([0,3,7,15]), comb: Object.freeze([0,4,8,12])});
  const ALL = Object.freeze(Array.from({length: cfg.n}, (_, k) => k));
  const INPUT_KEYS = Object.freeze(['ySelected', 'referenceSelected', 'frequencyOffsetsHz', 'candidatesM', 'cMps']);
  const copyComplex = values => values.map(z => z.slice());

  function finite(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(label + ' must be finite');
    return value;
  }
  function uint32(value, label) {
    if (!Number.isInteger(value) || value < 0 || value > 4294967295) throw new RangeError(label + ' must be a uint32');
  }
  function keysOnly(value, allowed, label, requireAll = false) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
      throw new TypeError(label + ' must be a plain object');
    for (const key of Reflect.ownKeys(value)) {
      if (!allowed.includes(key)) throw new TypeError(label + ': unexpected key ' + String(key));
      if (!Object.prototype.hasOwnProperty.call(Object.getOwnPropertyDescriptor(value, key), 'value'))
        throw new TypeError(label + ': accessor properties are not allowed');
    }
    if (requireAll && allowed.some(key => !Object.prototype.hasOwnProperty.call(value, key)))
      throw new TypeError(label + ': exactly the five receiver input keys are required');
  }
  function complexVector(values, label) {
    if (!Array.isArray(values) || !values.length) throw new TypeError(label + ': nonempty complex vector required');
    for (const z of values) {
      if (!Array.isArray(z) || z.length !== 2) throw new TypeError(label + ': complex pairs required');
      finite(z[0], label); finite(z[1], label);
    }
  }
  function realVector(values, label) {
    if (!Array.isArray(values) || !values.length) throw new TypeError(label + ': nonempty finite vector required');
    for (const value of values) finite(value, label);
  }
  function validateIndices(indices, length) {
    if (!Array.isArray(indices) || !indices.length) throw new RangeError('nonempty pilot/sample indices required');
    const seen = new Set();
    for (const index of indices) {
      if (!Number.isInteger(index) || index < 0 || index >= length || seen.has(index))
        throw new RangeError('distinct sample indices within the observation required');
      seen.add(index);
    }
  }
  function pilotsFor(mode) {
    if (typeof mode !== 'string' || !Object.prototype.hasOwnProperty.call(PILOTS, mode))
      throw new RangeError('pilotMode must be irregular or comb');
    const indices = PILOTS[mode];
    validateIndices(indices, cfg.n);
    return indices;
  }

  function generate(options = {}) {
    keysOnly(options, ['truthRangeM', 'snrDb', 'noiseSeed'], 'generator options');
    const {truthRangeM = 43.7, snrDb = null, noiseSeed = 2026} = options;
    if (finite(truthRangeM, 'truthRangeM') < cfg.minTruthM || truthRangeM > cfg.maxTruthM)
      throw new RangeError('truthRangeM must be within [0,120] m');
    if (![null,-10,0,10,20].includes(snrDb)) throw new RangeError('snrDb must be null, -10, 0, 10, or 20');
    uint32(noiseSeed, 'noiseSeed');
    const [observation, metadata] = base.generateObservation(truthRangeM, cfg.phaseRad, snrDb, noiseSeed, 0);
    return {observation, truth: {rangeM: truthRangeM, phaseRad: cfg.phaseRad,
      alpha: [Math.cos(cfg.phaseRad), Math.sin(cfg.phaseRad)], transmitSymbols: copyComplex(X)},
      noiseMetadata: {...metadata, seedUint32: noiseSeed, snrDb, rngVersion: base.RNG_VERSION}};
  }

  // Quarter-turn arithmetic preserves exact QPSK values and exact correct pilots.
  function quarterTurn(z, turns) {
    if (turns === 0) return z.slice();
    if (turns === 1) return [-z[1], z[0]];
    if (turns === 2) return [-z[0], -z[1]];
    return [z[1], -z[0]];
  }
  function reference(options = {}) {
    keysOnly(options, ['pilotMode', 'errorMode', 'errorCount', 'referenceSeed'], 'reference options');
    const {pilotMode = 'irregular', errorMode = 'random', errorCount = 0, referenceSeed = 2026} = options;
    const pilots = pilotsFor(pilotMode), dataIndices = ALL.filter(k => !pilots.includes(k));
    if (!['random', 'rotate', 'ramp'].includes(errorMode)) throw new RangeError('errorMode must be random, rotate, or ramp');
    if (!Number.isInteger(errorCount) || errorCount < 0 || errorCount > dataIndices.length)
      throw new RangeError('errorCount must be an integer within [0,12]');
    uint32(referenceSeed, 'referenceSeed');
    if (errorMode !== 'random' && (pilotMode !== 'comb' || errorCount !== 12))
      throw new RangeError('rotate and ramp require comb pilots and errorCount=12');
    const permutationDomain = MODEL_VERSION + '/reference/permutation/' + pilotMode;
    const rotationDomain = MODEL_VERSION + '/reference/rotations/' + pilotMode;
    const permutationRng = new base.RandomStream(referenceSeed, permutationDomain);
    const rotationRng = new base.RandomStream(referenceSeed, rotationDomain);
    const permutation = dataIndices.slice();
    for (let j = permutation.length - 1; j > 0; j--) {
      const other = Math.floor(permutationRng.uniform() * (j + 1));
      [permutation[j], permutation[other]] = [permutation[other], permutation[j]];
    }
    // Draw once for every position, independent of requested error count.
    const randomTurns = ALL.map(() => 1 + Math.floor(rotationRng.uniform() * 3));
    const selected = new Set(permutation.slice(0, errorCount));
    const rotationQuarterTurns = ALL.map(k => pilots.includes(k) ? 0 : errorMode === 'rotate' ? 1 :
      errorMode === 'ramp' ? k % 4 : selected.has(k) ? randomTurns[k] : 0);
    const errorIndices = ALL.filter(k => rotationQuarterTurns[k] !== 0);
    return {reference: X.map((z, k) => quarterTurn(z, rotationQuarterTurns[k])),
      stressMetadata: {pilotMode, errorMode, errorCount: errorIndices.length, errorIndices,
        rotationQuarterTurns, dataIndices: dataIndices.slice(), pilotIndices: pilots.slice(),
        referenceSeed, permutation, permutationDomain, rotationDomain, rngVersion: base.RNG_VERSION}};
  }

  function assemble(observation, suppliedReference, pilotMode = 'irregular') {
    complexVector(observation, 'observation'); complexVector(suppliedReference, 'reference');
    if (observation.length !== cfg.n || suppliedReference.length !== cfg.n)
      throw new RangeError('assembly requires exactly 16 observation and reference samples');
    const pilots = pilotsFor(pilotMode);
    // Complete all index validation before performing any index selection.
    validateIndices(ALL, observation.length); validateIndices(pilots, observation.length);
    validateIndices(ALL, suppliedReference.length); validateIndices(pilots, X.length);
    const select = (indices, refs) => ({ySelected: indices.map(k => observation[k].slice()),
      referenceSelected: indices.map(k => refs[k].slice()), frequencyOffsetsHz: indices.map(k => F[k]),
      candidatesM: CANDIDATES.slice(), cMps: cfg.c});
    return {oracle: select(ALL, X), pilot: select(pilots, X), stress: select(ALL, suppliedReference)};
  }

  function validateInput(input) {
    keysOnly(input, INPUT_KEYS, 'receiver input', true);
    complexVector(input.ySelected, 'ySelected'); complexVector(input.referenceSelected, 'referenceSelected');
    realVector(input.frequencyOffsetsHz, 'frequencyOffsetsHz'); realVector(input.candidatesM, 'candidatesM');
    if (input.ySelected.length !== input.referenceSelected.length || input.ySelected.length !== input.frequencyOffsetsHz.length)
      throw new RangeError('observation, reference and frequency dimensions must agree');
    if (input.candidatesM.some((r, j) => j > 0 && r <= input.candidatesM[j - 1]))
      throw new RangeError('strictly increasing candidates required');
    if (finite(input.cMps, 'cMps') <= 0) throw new RangeError('positive cMps required');
  }
  function receive(input) {
    validateInput(input);
    const known = base.receiverTemplates(input.referenceSelected, input.frequencyOffsetsHz, input.candidatesM, input.cMps);
    const result = base.receive(input.ySelected, known);
    const tiedIndices = [];
    result.scores.forEach((q, j) => { if (q >= result.maxScore - result.tieTolerance) tiedIndices.push(j); });
    return {...result, tiedIndices, tiedCandidatesM: tiedIndices.map(j => input.candidatesM[j]),
      referenceEnergy: known.energy, sampleCount: input.ySelected.length,
      matchingTerms: input.ySelected.length * input.candidatesM.length};
  }
  function candidateAt(input, index) {
    validateInput(input);
    if (!Number.isInteger(index) || index < 0 || index >= input.candidatesM.length)
      throw new RangeError('candidate index outside candidate table');
    const candidateM = input.candidatesM[index];
    const known = base.receiverTemplates(input.referenceSelected, input.frequencyOffsetsHz, [candidateM], input.cMps);
    const fit = base.receive(input.ySelected, known), templateSamples = known.templates[0];
    const contributions = templateSamples.map(([ar, ai], k) => {
      const [yr, yi] = input.ySelected[k];
      return [(ar * yr + ai * yi) / known.energy, (ar * yi - ai * yr) / known.energy];
    });
    const residuals = templateSamples.map(([ar, ai], k) => {
      const [yr, yi] = input.ySelected[k], [gr, gi] = fit.fittedGain;
      return [yr - (gr * ar - gi * ai), yi - (gr * ai + gi * ar)];
    });
    return {index, candidateM, fittedGain: fit.fittedGain, score: fit.selectedScore,
      residualEnergy: fit.residualEnergy, referenceEnergy: known.energy,
      sampleCount: input.ySelected.length, contributions, templateSamples: copyComplex(templateSamples), residuals};
  }

  return Object.freeze({MODEL_VERSION, cfg, X, F, PILOTS, CANDIDATES, generate, reference, assemble, receive, candidateAt});
});
