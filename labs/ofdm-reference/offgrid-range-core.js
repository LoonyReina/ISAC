/* One static monostatic target, two finite grids, paired complex observations.
 * Independent numerical reference and fixtures: scripts/offgrid-range-reference/.
 * Complex values are [real, imaginary]. Receiver inputs contain known design only.
 */
(function(root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OffgridRangeCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const MODEL_VERSION = 'offgrid-range-model-v1';
  const RNG_VERSION = 'xoshiro128ss-splitmix32-fnv1a-ascii-boxmuller-v1';
  const cfg = Object.freeze({c: 300000000, n: 16, df: 1000000, tu: 0.000001,
    cp: 0.000001, rangePeriod: 150, firstNullM: 9.375, grossThresholdM: 9.375,
    maxTrials: 1000, tieUlps: 64});
  const X = Object.freeze([[1,0],[0,1],[-1,0],[0,-1],[0,1],[1,0],[0,-1],[-1,0],
    [-1,0],[0,1],[1,0],[0,-1],[1,0],[-1,0],[0,-1],[0,1]].map(z => Object.freeze(z.map(v => v / 4))));
  const F = Object.freeze(Array.from({length: cfg.n}, (_, k) => k * cfg.df));
  const COARSE = Object.freeze(Array.from({length: 25}, (_, j) => 5 * j));
  const FINE = Object.freeze(Array.from({length: 241}, (_, j) => 0.5 * j));
  const PRESETS = Object.freeze({
    'noise-free-offgrid': Object.freeze({name: 'noise-free-offgrid', truthRangeM: 43.7,
      truthPhaseRad: 0.7, snrDb: null, seedUint32: 2026, trials: 1, plotTrialIndex: 0}),
    'high-snr-offgrid': Object.freeze({name: 'high-snr-offgrid', truthRangeM: 43.7,
      truthPhaseRad: 0.7, snrDb: 10, seedUint32: 2026, trials: 1000, plotTrialIndex: 0}),
    'low-snr-counterexample': Object.freeze({name: 'low-snr-counterexample', truthRangeM: 25.1,
      truthPhaseRad: 0.7, snrDb: -5, seedUint32: 7, trials: 1000, plotTrialIndex: 1})
  });
  const clone = value => JSON.parse(JSON.stringify(value, (key, item) => {
    if (typeof item === 'number' && !Number.isFinite(item)) throw new RangeError('nonfinite value cannot be exported as a measurement: ' + key);
    return item;
  }));
  function finite(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(label + ' must be finite');
    return value;
  }
  function uint32(seed) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new RangeError('seed must be a uint32');
  }
  function complexVector(values, label) {
    if (!Array.isArray(values) || !values.length) throw new TypeError(label + ': nonempty finite complex vector required');
    for (const z of values) {
      if (!Array.isArray(z) || z.length !== 2) throw new TypeError(label + ': complex pairs required');
      finite(z[0], label); finite(z[1], label);
    }
  }
  function realVector(values, label) {
    if (!Array.isArray(values) || !values.length) throw new TypeError(label + ': nonempty finite vector required');
    values.forEach(v => finite(v, label));
  }
  function compensatedSum(values) {
    let sum = 0, correction = 0;
    for (const value of values) {
      const next = sum + value;
      correction += Math.abs(sum) >= Math.abs(value) ? (sum - next) + value : (value - next) + sum;
      sum = next;
    }
    return sum + correction;
  }
  class RandomStream {
    constructor(seed, domain) {
      uint32(seed);
      if (typeof domain !== 'string' || !domain.length || /[^\x00-\x7f]/.test(domain)) throw new TypeError('nonempty ASCII domain required');
      let hash = 2166136261;
      for (let i = 0; i < domain.length; i++) hash = Math.imul(hash ^ domain.charCodeAt(i), 16777619) >>> 0;
      this.domainHashUint32 = hash;
      let z = (seed ^ hash) >>> 0;
      const mix = () => {
        z = (z + 0x9e3779b9) >>> 0;
        let v = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
        v = Math.imul(v ^ (v >>> 15), 0x735a2d97) >>> 0;
        return (v ^ (v >>> 15)) >>> 0;
      };
      this.state = [mix(), mix(), mix(), mix()];
      if (!this.state.some(Boolean)) throw new RangeError('zero PRNG state');
      this.initialStateUint32 = this.state.slice();
      this.spare = null;
    }
    uniform() {
      let [a, b, c, d] = this.state;
      const rotate = (v, k) => ((v << k) | (v >>> (32 - k))) >>> 0;
      const result = Math.imul(rotate(Math.imul(b, 5), 7), 9) >>> 0;
      const t = (b << 9) >>> 0;
      c = (c ^ a) >>> 0; d = (d ^ b) >>> 0; b = (b ^ c) >>> 0;
      a = (a ^ d) >>> 0; c = (c ^ t) >>> 0; d = rotate(d, 11);
      this.state = [a, b, c, d];
      return (result + 0.5) / 4294967296;
    }
    normal() {
      if (this.spare !== null) { const value = this.spare; this.spare = null; return value; }
      const radius = Math.sqrt(-2 * Math.log(this.uniform()));
      const angle = 2 * Math.PI * this.uniform();
      this.spare = radius * Math.sin(angle);
      return radius * Math.cos(angle);
    }
  }
  function receiverTemplates(x, fHz, candidatesM, cMps = cfg.c) {
    complexVector(x, 'x'); realVector(fHz, 'frequencies'); realVector(candidatesM, 'candidates');
    if (fHz.length !== x.length) throw new RangeError('matching finite frequencies required');
    if (candidatesM.some((v, i) => i > 0 && v <= candidatesM[i - 1])) throw new RangeError('strictly increasing finite candidates required');
    if (finite(cMps, 'propagation speed') <= 0) throw new RangeError('positive propagation speed required');
    const energy = compensatedSum(x.map(z => z[0] * z[0] + z[1] * z[1]));
    if (!Number.isFinite(energy) || energy <= 0) throw new RangeError('positive known waveform energy required');
    // Candidate-major layout; all trigonometry happens once before trial scans.
    const templates = candidatesM.map(r => Object.freeze(x.map((z, k) => {
      const phase = -2 * Math.PI * fHz[k] * (2 * r / cMps);
      const co = Math.cos(phase), si = Math.sin(phase);
      if (!Number.isFinite(co) || !Number.isFinite(si)) throw new RangeError('nonfinite candidate template');
      return Object.freeze([z[0] * co - z[1] * si, z[0] * si + z[1] * co]);
    })));
    return Object.freeze({templates: Object.freeze(templates), energy,
      candidates: Object.freeze(candidatesM.slice())});
  }
  function receive(y, known) {
    complexVector(y, 'y');
    if (!known || !Array.isArray(known.templates) || !Array.isArray(known.candidates) ||
        !known.candidates.length || known.templates.length !== known.candidates.length ||
        !Number.isFinite(known.energy) || known.energy <= 0) throw new TypeError('prepared known templates required');
    realVector(known.candidates, 'candidates');
    if (known.candidates.some((v, i) => i > 0 && v <= known.candidates[i - 1])) throw new RangeError('strictly increasing finite candidates required');
    const scores = [], gains = [], a = known.templates, energy = known.energy;
    let maxScore = -Infinity;
    for (let j = 0; j < a.length; j++) {
      if (!Array.isArray(a[j]) || a[j].length !== y.length) throw new RangeError('observation size does not match known waveform');
      let re = 0, im = 0;
      for (let k = 0; k < y.length; k++) {
        re += a[j][k][0] * y[k][0] + a[j][k][1] * y[k][1];
        im += a[j][k][0] * y[k][1] - a[j][k][1] * y[k][0];
      }
      re /= energy; im /= energy;
      const score = re * re + im * im;
      if (!Number.isFinite(score)) throw new RangeError('nonfinite candidate score');
      gains.push([re, im]); scores.push(score); maxScore = Math.max(maxScore, score);
    }
    const tolerance = cfg.tieUlps * Number.EPSILON * Math.max(1, maxScore);
    let index = -1, tieCount = 0;
    for (let j = 0; j < scores.length; j++) if (scores[j] >= maxScore - tolerance) {
      if (index < 0) index = j;
      tieCount++;
    }
    const fitted = gains[index];
    // Sum complex residual samples directly: no cancellation-prone norm subtraction.
    let residualEnergy = 0;
    for (let k = 0; k < y.length; k++) {
      const z = a[index][k];
      const er = y[k][0] - (fitted[0] * z[0] - fitted[1] * z[1]);
      const ei = y[k][1] - (fitted[0] * z[1] + fitted[1] * z[0]);
      residualEnergy += er * er + ei * ei;
    }
    if (!Number.isFinite(residualEnergy)) throw new RangeError('nonfinite residual energy');
    return {status: 'estimate', index, estimateM: known.candidates[index], fittedGain: fitted,
      selectedScore: scores[index], maxScore, tieTolerance: tolerance, tieCount, residualEnergy, scores};
  }
  function cleanObservation(truthM, phaseRad) {
    const alpha = [Math.cos(phaseRad), Math.sin(phaseRad)];
    return X.map((z, k) => {
      const phase = -2 * Math.PI * F[k] * (2 * truthM / cfg.c);
      const co = Math.cos(phase), si = Math.sin(phase);
      const ar = alpha[0] * z[0] - alpha[1] * z[1], ai = alpha[0] * z[1] + alpha[1] * z[0];
      return [ar * co - ai * si, ar * si + ai * co];
    });
  }
  function generateObservation(truthM, phaseRad, snrDb, seed, trialIndex) {
    if (finite(truthM, 'truth') < 0 || truthM > 120) throw new RangeError('truth outside declared search interval [0,120] m');
    if (finite(phaseRad, 'phase') < -Math.PI || phaseRad > Math.PI) throw new RangeError('phase outside bounded interval [-pi,pi]');
    if (snrDb !== null && (finite(snrDb, 'SNR') < -20 || snrDb > 20)) throw new RangeError('SNR must be null (noise-free) or within [-20,20] dB');
    if (!Number.isInteger(trialIndex) || trialIndex < 0 || trialIndex >= cfg.maxTrials) throw new RangeError('trial index outside bounded run');
    const domain = 'offgrid-range-v1/noise/trial/' + trialIndex;
    const rng = new RandomStream(seed, domain);
    const sigma2 = snrDb === null ? 0 : 1 / (cfg.n * 10 ** (snrDb / 10));
    const scale = Math.sqrt(sigma2 / 2), clean = cleanObservation(truthM, phaseRad);
    let noiseEnergy = 0;
    const observation = clean.map(z => {
      // Draw real first, imaginary second, even when multiplying by zero.
      const re = scale * rng.normal(), im = scale * rng.normal();
      noiseEnergy += re * re + im * im;
      return [z[0] + re, z[1] + im];
    });
    complexVector(observation, 'generated observation'); finite(noiseEnergy, 'noise energy');
    return [observation, {domain, domainHashUint32: rng.domainHashUint32,
      initialStateUint32: rng.initialStateUint32.slice(), sigma2, noiseEnergy}];
  }
  function idealResponse(truthRangeM, displayCandidatesM) {
    if (finite(truthRangeM, 'truth') < 0 || truthRangeM > 120) throw new RangeError('truth outside declared search interval [0,120] m');
    return receive(cleanObservation(truthRangeM, 0), receiverTemplates(X, F, displayCandidatesM)).scores;
  }
  function resultMetrics(result, truthM) {
    const {scores, ...withoutScores} = result;
    const error = result.estimateM - truthM;
    return {...withoutScores, signedErrorM: error, squaredErrorM2: error * error,
      grossError: Math.abs(error) > cfg.grossThresholdM};
  }
  function summarize(rows, key, incompleteReason = '') {
    const successful = rows.filter(row => row[key] && row[key].status === 'estimate').map(row => row[key]);
    const n = successful.length, total = rows.length;
    if (n !== total || incompleteReason || total === 0) return {
      attemptedTrials: total, successfulTrials: n, failedTrials: total - n,
      rmseM: null, biasM: null, grossErrorCount: null,
      status: n !== total ? 'incomplete; failed trials retained; aggregate not reported' :
        'incomplete; ' + (incompleteReason || 'no attempted trials') + '; aggregate not reported'};
    const errors = successful.map(r => r.signedErrorM);
    const mseM2 = compensatedSum(successful.map(r => r.squaredErrorM2)) / n;
    const gross = successful.filter(r => r.grossError).length;
    return {attemptedTrials: n, successfulTrials: n, failedTrials: 0,
      biasM: compensatedSum(errors) / n, mseM2, rmseM: Math.sqrt(mseM2),
      grossErrorCount: gross, grossErrorFraction: gross / n,
      maximumAbsErrorM: Math.max(...errors.map(Math.abs)),
      boundaryEstimateCount: successful.filter(r => r.estimateM === 0 || r.estimateM === 120).length,
      status: 'complete'};
  }
  function pairedSummary(rows) {
    const pairs = rows.filter(r => r.coarse.status === 'estimate' && r.fine.status === 'estimate');
    const delta = r => Math.abs(r.fine.signedErrorM) - Math.abs(r.coarse.signedErrorM);
    return {successfulPairedTrials: pairs.length,
      fineLowerAbsoluteErrorCount: pairs.filter(r => delta(r) < -1e-12).length,
      fineHigherAbsoluteErrorCount: pairs.filter(r => delta(r) > 1e-12).length,
      equalAbsoluteErrorCount: pairs.filter(r => Math.abs(delta(r)) <= 1e-12).length,
      nestedMaxScoreViolationCount: pairs.filter(r => r.fine.maxScore < r.coarse.maxScore - 1e-12).length};
  }
  function ledger() {
    return {geometry: 'static monostatic; tau=2R/c', cMps: cfg.c,
      cConvention: 'rounded teaching constant, not exact SI c', toneCount: cfg.n,
      frequencyOffsetsHz: F.slice(), deltaFHz: cfg.df, usefulDurationS: cfg.tu,
      cpDurationS: cfg.cp, totalBurstDurationS: cfg.tu + cfg.cp, sampleRateHz: cfg.n * cfg.df,
      usefulEnergy: 1, cpEnergy: 1, totalBurstEnergy: 2,
      energyUnits: 'normalized, not joules', knownWaveform: X.map(z => z.slice()),
      signalGainMagnitude: 1, noiselessReceivedUsefulEnergy: 1,
      bandwidthConvention: 'N*deltaF nominal DFT bandwidth; endpoint span differs',
      nominalDftBandwidthHz: cfg.n * cfg.df, toneEndpointSpanHz: (cfg.n - 1) * cfg.df,
      rangeResponseFirstNullOffsetM: cfg.firstNullM, rangeResponseNullToNullWidthM: 2 * cfg.firstNullM,
      delayAmbiguityPeriodS: 1 / cfg.df, rangeAmbiguityPeriodM: cfg.rangePeriod,
      searchIntervalM: [0,120], endpointPolicy: 'both endpoints included, interval shorter than 150 m ambiguity period',
      coarseGridM: COARSE.slice(), fineGridM: FINE.slice(), coarseGridStepM: 5, fineGridStepM: 0.5, nestedFactor: 10,
      grossErrorDefinition: 'abs(estimateM-truthM)>9.375, strictly greater; all attempted trials kept',
      grossErrorThresholdM: cfg.grossThresholdM,
      tiePolicy: 'choose lowest candidate within 64*binary64_epsilon*max(1,maxScore) of maxScore',
      targetPresence: 'assumed; no absent-target trials, detection threshold, or detection claim',
      receiverInputs: ['complex Y','known X','known frequency offsets','candidate grid','c'],
      receiverExcludes: ['truth','true phase/gain','noise samples','noise variance','seed']};
  }
  const knownGrids = Object.freeze({coarse: receiverTemplates(X, F, COARSE), fine: receiverTemplates(X, F, FINE)});
  function runOptions(options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('settings object required');
    const allowed = ['name','truthRangeM','truthPhaseRad','snrDb','seedUint32','trials','plotTrialIndex'];
    for (const key of Object.keys(options)) if (!allowed.includes(key)) throw new RangeError('Unknown setting: ' + key);
    const o = {name: 'custom', truthRangeM: 43.7, truthPhaseRad: 0.7, snrDb: null,
      seedUint32: 2026, trials: 1000, plotTrialIndex: 0, ...options};
    if (typeof o.name !== 'string') throw new TypeError('experiment name must be a string');
    // Nonfinite settings cannot be exported faithfully as JSON. Finite out-of-domain
    // generator inputs become retained failure rows, as in the Python reference.
    finite(o.truthRangeM, 'truth'); finite(o.truthPhaseRad, 'phase'); finite(o.seedUint32, 'seed');
    if (o.snrDb !== null) {
      finite(o.snrDb, 'SNR');
      const gamma = 10 ** (o.snrDb / 10), variance = 1 / (2 * cfg.n * gamma);
      if (!Number.isFinite(gamma) || !Number.isFinite(variance) || gamma <= 0 || variance <= 0)
        throw new RangeError('SNR does not produce finite positive noise metadata');
    }
    if (!Number.isInteger(o.trials) || o.trials < 1 || o.trials > cfg.maxTrials ||
        !Number.isInteger(o.plotTrialIndex) || o.plotTrialIndex < 0 || o.plotTrialIndex >= o.trials)
      throw new RangeError('bounded positive trials and valid selected index required');
    return o;
  }
  function settingsRecord(o) {
    return {truthRangeM: o.truthRangeM, truthPhaseRad: o.truthPhaseRad, snrDb: o.snrDb,
      snrConvention: 'received useful signal energy / expected total useful-window noise energy; equals per-tone SNR for equal-energy tones',
      complexNoiseVariancePerTone: o.snrDb === null ? 0 : 1 / (cfg.n * 10 ** (o.snrDb / 10)),
      realNoiseVariancePerComponent: o.snrDb === null ? 0 : 1 / (2 * cfg.n * 10 ** (o.snrDb / 10)),
      matchedFilterSignalToNoiseDb: o.snrDb === null ? null : o.snrDb + 10 * Math.log10(cfg.n),
      seedUint32: o.seedUint32, trials: o.trials, plotTrialIndex: o.plotTrialIndex};
  }
  function plotRow(row, known = knownGrids) {
    if (!row || !row.observation) return null;
    let plot = null;
    for (const key of ['coarse','fine']) if (row[key].status === 'estimate') {
      const result = receive(row.observation, known[key]);
      if (!plot) plot = {trialIndex: row.trialIndex};
      plot[key + 'Scores'] = result.scores;
    }
    return plot;
  }
  function selectTrial(record, index) {
    if (!record || !Array.isArray(record.trials) || !Number.isInteger(index) ||
        index < 0 || index >= record.trials.length) throw new RangeError('selected trial must be an existing attempted row');
    const r = record.resources;
    const known = {coarse: receiverTemplates(r.knownWaveform, r.frequencyOffsetsHz, r.coarseGridM, r.cMps),
      fine: receiverTemplates(r.knownWaveform, r.frequencyOffsetsHz, r.fineGridM, r.cMps)};
    return {...record, settings: {...record.settings, plotTrialIndex: index}, plot: plotRow(record.trials[index], known)};
  }
  function createSession(options = {}) {
    const o = runOptions(options), rows = [];
    let status = 'running';
    function progress() { return {done: status !== 'running', attemptedTrials: rows.length, totalTrials: o.trials, status}; }
    function runChunk(size = 25) {
      if (!Number.isInteger(size) || size < 1 || size > cfg.maxTrials) throw new RangeError('chunk size must be an integer in [1,1000]');
      if (status !== 'running') return progress();
      const end = Math.min(rows.length + size, o.trials);
      while (rows.length < end) {
        const index = rows.length, row = {trialIndex: index, seedUint32: o.seedUint32};
        try {
          const [y, meta] = generateObservation(o.truthRangeM, o.truthPhaseRad, o.snrDb, o.seedUint32, index);
          Object.assign(row, meta, {observation: y});
          for (const key of ['coarse','fine']) {
            try { row[key] = resultMetrics(receive(y, knownGrids[key]), o.truthRangeM); }
            catch (error) { row[key] = {status: 'failed', reason: String(error.message || error)}; }
          }
        } catch (error) {
          row.coarse = {status: 'failed', reason: String(error.message || error)};
          row.fine = {...row.coarse};
        }
        rows.push(row);
      }
      if (rows.length === o.trials) status = 'complete';
      return progress();
    }
    function getRecord() {
      const reason = status === 'complete' ? '' : status + '; requested ' + o.trials + ' trials';
      return clone({schema: 'offgrid-range-export-v1', modelVersion: MODEL_VERSION, rngVersion: RNG_VERSION,
        name: o.name, settings: settingsRecord(o), resources: ledger(),
        summary: {coarse: summarize(rows, 'coarse', reason), fine: summarize(rows, 'fine', reason), paired: pairedSummary(rows)},
        plot: plotRow(rows[o.plotTrialIndex]), trials: rows,
        limits: ['finite fixed pseudo-random trials; no universal ranking or confidence claim',
          'two grid estimators; truth is continuous, estimator is not continuous optimization',
          'no detection, multi-target resolution, Doppler, timing error, clutter, or calibration claim']});
    }
    function cancel() { if (status === 'running') status = 'cancelled'; return getRecord(); }
    function finish() { if (status === 'running') runChunk(cfg.maxTrials); return getRecord(); }
    function select(index) {
      if (!Number.isInteger(index) || index < 0 || index >= rows.length) throw new RangeError('selected trial must be an existing attempted row');
      o.plotTrialIndex = index; return getRecord();
    }
    return Object.freeze({runChunk, step: runChunk, getRecord, snapshot: getRecord, cancel, finish, selectTrial: select,
      get status() { return status; }, get done() { return status !== 'running'; },
      get attempted() { return rows.length; }, get totalTrials() { return o.trials; }});
  }
  function experiment(options = {}) { return createSession(options).finish(); }
  return Object.freeze({MODEL_VERSION, RNG_VERSION, cfg, X, F, COARSE, FINE, PRESETS, RandomStream,
    receiverTemplates, receive, generateObservation, idealResponse, resultMetrics, summarize, ledger,
    createSession, createRun: createSession, selectTrial, experiment});
});
