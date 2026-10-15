/**
 * Normalized, all-stations-accept arXiv:2403.20228v3 Eq. (5)/(6).
 * No sampler, receiver, physical calibration, approximation, or rank repair.
 * Plain numbers/arrays in and JSON-safe records out. No environment imports.
 */
export const DEFAULT_RTOL = 1e-8;
export const ROUNDOFF_RATIO = 64 * Number.EPSILON;
export const DOMAIN = Object.freeze({
  min_stations: 1, max_stations: 32, min_beta: 2, max_beta: 4,
  min_information_scale: 0.001, max_information_scale: 1000,
  min_radius: 1 / 128, max_radius: 16, max_coordinate_magnitude: 64,
  max_trials: 256, max_batch_size: 64,
});
export const POPULATION_SCOPE = Object.freeze({
  n2: 'With independent uniform bearings and positive finite radii, the exact no-rejection N=2 ensemble mean of trace(F^-1) is infinite. A finite sample mean does not estimate a finite population mean.',
  n_ge_3: 'No finiteness, variance, convergence, or confidence-coverage claim is made for N>=3.',
  units: 'Normalized information prefactor and coordinates; a bound on unbiased position MSE, not measured localization error or receiver RMSE.',
});

export class InputError extends TypeError {
  constructor(message) { super(message); this.name = 'InputError'; }
}

function requireCondition(condition, message) {
  if (!condition) throw new InputError(message);
}

function real(value) { return typeof value === 'number' && Number.isFinite(value); }
function vector2(value) { return Array.isArray(value) && value.length === 2 && real(value[0]) && real(value[1]); }
function matrix2(value) { return Array.isArray(value) && value.length === 2 && vector2(value[0]) && vector2(value[1]); }
function clone2(value) { return [value[0], value[1]]; }
function tolerance(value) {
  requireCondition(real(value) && value > ROUNDOFF_RATIO && value < 1,
    'relative_tolerance must exceed 64 machine epsilon and be below one');
  return value;
}

/** Copy and validate a bounded geometry. Values are rejected, never clamped. */
export function validateGeometry(input) {
  requireCondition(input !== null && typeof input === 'object' && !Array.isArray(input), 'geometry must be an object');
  const { stations, target = [0, 0], beta = 2, information_scale = 1,
    prefix_n = stations?.length } = input;
  requireCondition(Array.isArray(stations) && stations.length >= 1 && stations.length <= DOMAIN.max_stations,
    'stations must be an array of 1..32 finite two-vectors');
  requireCondition(vector2(target), 'target must be a finite numeric two-vector');
  requireCondition(Array.from(stations).every(vector2), 'stations must contain finite numeric two-vectors');
  requireCondition([target, ...stations].every(v => v.every(x => Math.abs(x) <= DOMAIN.max_coordinate_magnitude)),
    'coordinate magnitudes must be <=64');
  requireCondition(real(beta) && beta >= DOMAIN.min_beta && beta <= DOMAIN.max_beta, 'beta must be numeric and in [2,4]');
  requireCondition(real(information_scale) && information_scale >= DOMAIN.min_information_scale && information_scale <= DOMAIN.max_information_scale,
    'information_scale must be numeric and in [0.001,1000]');
  requireCondition(Number.isInteger(prefix_n) && prefix_n >= 1 && prefix_n <= stations.length, 'prefix_n must select a nonempty leading station prefix');
  // Validate the entire supplied geometry, including any currently unused tail.
  for (const station of stations) {
    const radius = Math.hypot(target[0] - station[0], target[1] - station[1]);
    requireCondition(radius >= DOMAIN.min_radius && radius <= DOMAIN.max_radius,
      'each station-target radius must be in [1/128,16]; no distance floor is applied');
  }
  return { stations: stations.map(clone2), target: clone2(target), beta, information_scale, prefix_n };
}

// Every binary64 value is an integer multiple of 2^-1074. Exact BigInt
// orientation certifies rank-one *input geometry*, rather than interpreting a
// rounded zero determinant or an approximate cross product as a proof.
function binary64Integer(value) {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value, false);
  const bits = view.getBigUint64(0, false);
  const exponent = Number((bits >> 52n) & 0x7ffn);
  const fraction = bits & ((1n << 52n) - 1n);
  const magnitude = exponent === 0 ? fraction : ((1n << 52n) | fraction) << BigInt(exponent - 1);
  return bits >> 63n ? -magnitude : magnitude;
}

function certifiedCollinear(stations, target) {
  if (stations.length === 1) return true;
  const tx = binary64Integer(target[0]), ty = binary64Integer(target[1]);
  const ax = tx - binary64Integer(stations[0][0]);
  const ay = ty - binary64Integer(stations[0][1]);
  return stations.slice(1).every(s => {
    const x = tx - binary64Integer(s[0]), y = ty - binary64Integer(s[1]);
    return ax * y === ay * x;
  });
}

function analyzeMatrix(fim, rtol, singularCertificate = false) {
  const empty = status => ({ status, trace_inverse: null });
  if (!matrix2(fim)) return empty('invalid_matrix');
  // Check original values: normalization can underflow an unequal tiny entry.
  if (fim[0][1] !== fim[1][0]) return empty('nonsymmetric');
  const scale = Math.max(...fim.flat().map(Math.abs));
  if (scale === 0) return empty('zero_information');
  const a = fim[0][0] / scale, b = fim[0][1] / scale;
  const c = fim[1][0] / scale, d = fim[1][1] / scale;
  // This public analyzer requires exact symmetry. The core constructs it
  // exactly. Do not silently choose one half of an asymmetric external matrix.
  const trace = a + d;
  const disc = Math.hypot(a - d, 2 * b);
  const large = (trace + disc) / 2;
  const determinant = a * d - b * c;
  const small = large > 0 ? determinant / large : (trace - disc) / 2;
  const ratio = large > 0 ? small / large : null;
  const equal = disc <= ROUNDOFF_RATIO * Math.max(Math.abs(trace), 1);
  const theta = Math.atan2(2 * b, a - d) / 2;
  const eigenvectors = equal ? [[1, 0], [0, 1]]
    : [[-Math.sin(theta), Math.cos(theta)], [Math.cos(theta), Math.sin(theta)]];
  const out = {
    status: 'unset', trace_inverse: null, matrix_scale: scale,
    normalized_eigenvalues: [small, large], eigenvalues: [small * scale, large * scale],
    eigenvectors, eigenvector_orientation_defined: !equal,
    min_max_eigenvalue_ratio: ratio, relative_tolerance: rtol,
    normalized_determinant: determinant,
  };
  if (large <= 0 || small < -ROUNDOFF_RATIO * large) out.status = 'non_psd';
  else if (singularCertificate) {
    out.status = 'singular';
    out.trace_inverse = 'infinity';
  } else if (ratio <= ROUNDOFF_RATIO) out.status = 'singular_or_roundoff_unresolved';
  else if (ratio <= rtol) out.status = 'unstable';
  else {
    const inverse = [[(d / determinant) / scale, (-b / determinant) / scale],
      [(-c / determinant) / scale, (a / determinant) / scale]];
    const bound = inverse[0][0] + inverse[1][1];
    const eigenBound = ((1 / small) + (1 / large)) / scale;
    if (!inverse.flat().every(real) || !real(bound) || bound <= 0 || !real(eigenBound) || eigenBound <= 0) {
      out.status = 'inverse_overflow';
    } else {
      Object.assign(out, { status: 'finite', inverse,
        trace_inverse: bound, root_trace_inverse: Math.sqrt(bound),
        eigenvalue_trace_inverse: eigenBound,
        bound_region_semiaxes: [1 / Math.sqrt(small * scale), 1 / Math.sqrt(large * scale)],
      });
    }
  }
  // Raw external matrices can exceed the geometry contract. Preserve a
  // numerical failure instead of allowing Infinity -> JSON null conversion.
  if (!out.eigenvalues.every(real)) return empty('eigenvalue_overflow');
  return out;
}

/** Analyze an exactly symmetric matrix; no caller-supplied singularity flag. */
export function analyzeFim(fim, { relative_tolerance = DEFAULT_RTOL } = {}) {
  return analyzeMatrix(fim, tolerance(relative_tolerance));
}

/** Literal N² sum, including i=j and both i,j / j,i. No factor 1/2. */
export function evaluateGeometry(input, { retain_pairs = true, relative_tolerance = DEFAULT_RTOL } = {}) {
  requireCondition(typeof retain_pairs === 'boolean', 'retain_pairs must be boolean');
  const rtol = tolerance(relative_tolerance);
  const validated = validateGeometry(input);
  const { target, beta, information_scale, prefix_n } = validated;
  const stations = validated.stations.slice(0, prefix_n);
  const offsets = stations.map(s => [target[0] - s[0], target[1] - s[1]]);
  const radii = offsets.map(v => Math.hypot(...v));
  const bearings = offsets.map((v, i) => [v[0] / radii[i], v[1] / radii[i]]);
  const weights = radii.map(r => r ** -beta);
  const pairs = retain_pairs ? Array.from({ length: prefix_n }, () => []) : null;
  let xx = 0, xy = 0, yy = 0;
  for (let i = 0; i < prefix_n; i++) {
    for (let j = 0; j < prefix_n; j++) {
      const x = bearings[i][0] + bearings[j][0], y = bearings[i][1] + bearings[j][1];
      const weight = information_scale * weights[i] * weights[j];
      const cxx = weight * (x * x), cxy = weight * (x * y), cyy = weight * (y * y);
      xx += cxx; xy += cxy; yy += cyy;
      if (retain_pairs) pairs[i].push([[cxx, cxy], [cxy, cyy]]);
    }
  }
  const fim = [[xx, xy], [xy, yy]];
  if (!fim.flat().every(real) || weights.some(w => !real(w) || w <= 0) || !fim.flat().some(x => x !== 0)) {
    throw new RangeError('FIM arithmetic failed within the declared domain');
  }
  const singular = certifiedCollinear(stations, target);
  return {
    stations, target, beta, information_scale, n: prefix_n,
    radii, unit_bearings_station_to_target: bearings, weights, fim,
    pair_count: prefix_n ** 2, pair_contributions: pairs,
    singularity_certificate: singular ? 'exact_binary64_input_collinearity' : null,
    analysis: analyzeMatrix(fim, rtol, singular),
  };
}

/** Invalid geometry is one retained failed attempt, never a finite fallback. */
export function evaluateAttempt(input, options = {}) {
  try { return evaluateGeometry(input, options); }
  catch (error) {
    if (!(error instanceof InputError || error instanceof RangeError)) throw error;
    return { analysis: { status: error instanceof InputError ? 'invalid_input' : 'arithmetic_failure',
      trace_inverse: null }, error: error.message };
  }
}

function normalizedMean(values) {
  // Positive bounded terms; averaging after scaling prevents sum overflow.
  const scale = Math.max(...values);
  let sum = 0, correction = 0;
  for (const value of values) {
    const x = value / scale - correction;
    const next = sum + x;
    correction = (next - sum) - x; sum = next;
  }
  return (sum / values.length) * scale;
}

/** Eq. (6): average individual inverse traces, with ALL attempts retained. */
export function summarizeAllAttempts(records, { complete = true, expected_attempts = records?.length } = {}) {
  requireCondition(Array.isArray(records) && records.length <= DOMAIN.max_trials, 'records must contain at most 256 attempts');
  requireCondition(Number.isInteger(expected_attempts) && expected_attempts >= records.length && expected_attempts <= DOMAIN.max_trials,
    'expected_attempts must be an integer between attempted and 256');
  requireCondition(typeof complete === 'boolean', 'complete must be boolean');
  const countMap = new Map();
  const analyses = records.map(r => r?.analysis ?? r);
  for (const r of analyses) {
    const status = typeof r?.status === 'string' ? r.status : 'invalid_record';
    countMap.set(status, (countMap.get(status) ?? 0) + 1);
  }
  const counts = Object.fromEntries(countMap);
  const out = { attempted: records.length, expected_attempts, complete: complete && records.length === expected_attempts,
    status_counts: counts, mean_trace_inverse: null, sqrt_mean_trace_inverse: null, mean_root_trace_inverse: null };
  if (!out.complete) out.aggregate_status = 'incomplete_run';
  else if (!records.length) out.aggregate_status = 'no_trials';
  else if (counts.singular) {
    Object.assign(out, { aggregate_status: 'contains_infinite_bound',
      mean_trace_inverse: 'infinity', sqrt_mean_trace_inverse: 'infinity', mean_root_trace_inverse: 'infinity' });
  } else if (counts.finite !== records.length) out.aggregate_status = 'incomplete_numerical_resolution';
  else {
    const values = analyses.map(r => r.trace_inverse);
    if (!values.every(v => real(v) && v > 0)) out.aggregate_status = 'invalid_finite_record';
    else {
      const mean = normalizedMean(values), scale = Math.max(...values);
      const normalizedAverage = mean / scale;
      let squared = 0;
      for (const value of values) squared += (value / scale - normalizedAverage) ** 2;
      const sd = values.length > 1 ? Math.sqrt(squared / (values.length - 1)) * scale : null;
      const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(values.length / 2);
      const median = values.length % 2 ? sorted[mid] : sorted[mid - 1] + (sorted[mid] - sorted[mid - 1]) / 2;
      Object.assign(out, { aggregate_status: 'all_finite_sample_not_expectation_proof',
        mean_trace_inverse: mean, sqrt_mean_trace_inverse: Math.sqrt(mean),
        mean_root_trace_inverse: normalizedMean(values.map(Math.sqrt)),
        sample_sd_trace_inverse: sd, descriptive_mean_se: sd === null ? null : sd / Math.sqrt(values.length),
        maximum_trace_inverse: scale, median_trace_inverse: median });
    }
  }
  return out;
}

/**
 * Bounded fixture replay. Samples are copied before the first yield. Request ID
 * is echoed, not a global UI state manager. Use AbortController for replacement;
 * caller must also reject results whose request_id is no longer current.
 */
export async function runFixtureBatch(request, { signal, batch_size = 8,
  yield_control = () => new Promise(resolve => setTimeout(resolve, 0)), on_progress } = {}) {
  requireCondition(request !== null && typeof request === 'object', 'request must be an object');
  const { request_id, samples, prefixes = [4, 8], trial_budget = samples?.length,
    beta = 2, information_scale = 1 } = request;
  requireCondition(typeof request_id === 'string' && request_id.length > 0 && request_id.length <= 128, 'request_id must be a nonempty string of at most 128 characters');
  requireCondition(Array.isArray(samples) && samples.length > 0 && samples.length <= DOMAIN.max_trials, 'samples must contain 1..256 retained geometries');
  requireCondition(Number.isInteger(trial_budget) && trial_budget >= 1 && trial_budget <= samples.length, 'trial_budget must select a nonempty leading sample prefix');
  requireCondition(Array.isArray(prefixes) && prefixes.length > 0 && prefixes.length <= DOMAIN.max_stations &&
    Array.from(prefixes).every((n, i) => Number.isInteger(n) && n >= 1 && n <= 32 && (i === 0 || n > prefixes[i - 1])),
  'prefixes must be strictly increasing unique integers in [1,32]');
  requireCondition(Number.isInteger(batch_size) && batch_size >= 1 && batch_size <= DOMAIN.max_batch_size, 'batch_size must be an integer in [1,64]');
  requireCondition(typeof yield_control === 'function' && (on_progress === undefined || typeof on_progress === 'function'), 'batch callbacks must be functions');
  requireCondition(signal === undefined || (signal !== null && typeof signal.aborted === 'boolean'), 'signal must expose boolean aborted');
  // Parameters are a request contract, not a repeated sample failure.
  validateGeometry({ stations: [[1, 0]], beta, information_scale });
  const selectedPrefixes = [...prefixes];
  const selected = Array.from(samples.slice(0, trial_budget), sample => {
    try { return { geometry: validateGeometry({ stations: sample?.stations, target: sample?.target, beta, information_scale }) }; }
    catch (error) {
      if (!(error instanceof InputError)) throw error;
      return { error: error.message };
    }
  });
  const records = [];
  let workSinceYield = 0;
  const total = trial_budget * selectedPrefixes.length;
  const finish = cancelled => ({ request_id, state: cancelled ? 'cancelled' : 'completed', complete: !cancelled,
    requested_attempts: total, attempted: records.length, trial_budget, prefixes: selectedPrefixes,
    beta, information_scale, sample_source: 'retained_coordinates_no_rng_emulation', records,
    summaries: selectedPrefixes.map(n => ({ n, ...summarizeAllAttempts(records.filter(r => r.n === n).map(r => r.result),
      { complete: !cancelled, expected_attempts: trial_budget }) })), population_scope: POPULATION_SCOPE });
  for (let trial = 0; trial < selected.length; trial++) {
    for (const n of selectedPrefixes) {
      if (signal?.aborted) return finish(true);
      const sample = selected[trial];
      const result = sample.error ? { analysis: { status: 'invalid_input', trace_inverse: null }, error: sample.error }
        : evaluateAttempt({ ...sample.geometry, prefix_n: n }, { retain_pairs: false });
      records.push({ trial_index: trial, n, result });
      workSinceYield++;
      if (workSinceYield >= batch_size && records.length < total) {
        if (on_progress) on_progress({ request_id, attempted: records.length, requested_attempts: total, complete: false });
        await yield_control();
        workSinceYield = 0;
      }
    }
  }
  if (signal?.aborted) return finish(true);
  return finish(false);
}
