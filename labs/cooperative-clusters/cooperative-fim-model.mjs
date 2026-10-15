import { evaluateGeometry, evaluateAttempt, summarizeAllAttempts, POPULATION_SCOPE, DEFAULT_RTOL, ROUNDOFF_RATIO } from './cooperative-fim-core.mjs';

export const DEFAULT_STATE = Object.freeze({ preset: 'symmetric', n: 4, epsilon: '1e-05', view: 'single', trials: 256 });
export const PROVENANCE = Object.freeze({
  source: 'https://arxiv.org/pdf/2403.20228v3#page=2',
  source_pdf_sha256: '9c8fc76d85b3fdaedbcfd7a2bb97560c7bfe4afa5323d852c570f99ffd870acd',
  core_sha256: 'ecaccbc421e50359bc8b8725103730d9c4f8d31b813f82dff113c54e64a661c3',
  fixture_sha256: '07fa3de3e8aa966d1d88a4d9c07868019802b98c0bbf1bf057c69a14166bfb19',
  core_file: 'labs/cooperative-clusters/cooperative-fim-core.mjs',
  fixture_file: 'assets/data/cooperative-fim-retained-coordinates.json',
  runtime: 'Coordinates are recomputed by the accepted Eq. (5)/(6) core; no runtime numerical oracles or RNG emulation.',
});

export function immutable(value) {
  const copy = structuredClone(value);
  const freeze = item => {
    if (item && typeof item === 'object' && !Object.isFrozen(item)) {
      Object.values(item).forEach(freeze);
      Object.freeze(item);
    }
    return item;
  };
  return freeze(copy);
}

/** Defaults fill omitted fields; invalid/unknown values are rejected, never coerced. */
export function normalizeState(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('State must be an object');
  const allowed = { preset: ['symmetric', 'collinear', 'network'], n: [1, 2, 4],
    epsilon: ['0.001', '1e-05', '1e-07'], view: ['single', 'average'], trials: [64, 128, 256] };
  for (const key of Object.keys(value)) {
    if (!Object.hasOwn(allowed, key)) throw new TypeError(`Unknown state field: ${key}`);
    if (!allowed[key].includes(value[key])) throw new TypeError(`Unsupported ${key}: ${String(value[key])}`);
  }
  return Object.freeze({ ...DEFAULT_STATE, ...value });
}

function fixed(fixture, id) {
  const found = fixture?.fixed?.find(item => item.id === id);
  if (!found) throw new TypeError(`Missing retained fixture: ${id}`);
  return found;
}
function samples(fixture, count) {
  if (!Array.isArray(fixture?.samples) || fixture.samples.length < count) throw new TypeError(`Need ${count} retained layouts`);
  const selected = fixture.samples.slice(0, count);
  if (!selected.every((sample, index) => sample?.trial_index === index)) throw new TypeError('Retained trial indices must preserve their exact leading order');
  return selected;
}
function geometryInput(source, n) {
  return { stations: source.stations, target: source.target, beta: 2, information_scale: 1, prefix_n: n };
}

export function comparisonInputs(value, fixture) {
  const state = normalizeState(value);
  let entries;
  if (state.preset === 'symmetric') {
    const source = fixed(fixture, 'cardinal_four_unit');
    entries = [2, state.n].map(n => ({ source, n, label: `N = ${n}`, fixtureId: source.id }));
  } else if (state.preset === 'collinear') {
    entries = ['0.001', state.epsilon].map(epsilon => {
      const source = fixed(fixture, `near_collinear_${epsilon}`);
      return { source, n: 4, label: `ε = ${epsilon}`, fixtureId: source.id };
    });
  } else {
    const source = samples(fixture, 1)[0];
    entries = [4, 8].map(n => ({ source, n, label: `N = ${n}`, fixtureId: 'retained_trial_0' }));
  }
  const baseN = entries[0].n;
  return immutable(entries.map(({ source, n, label, fixtureId }) => ({
    label, fixtureId, input: geometryInput(source, n),
    resource: { stations: n, orderedTerms: n * n, powerRatio: n / baseN },
  })));
}

function provenance(fixture) {
  return { ...PROVENANCE, retained: fixture.provenance ?? null, relative_tolerance: DEFAULT_RTOL,
    roundoff_ratio: ROUNDOFF_RATIO, population_scope: POPULATION_SCOPE,
    hash_scope: 'Hashes identify the byte-for-byte accepted core and original fixture assets. Injected test inputs are separately retained in inputSnapshot.' };
}
function explain(state, sides) {
  const a = sides[0].result.analysis, b = sides[1].result.analysis;
  const ratio = a.status === 'finite' && b.status === 'finite' ? b.trace_inverse / a.trace_inverse : null;
  if (state.preset === 'collinear') return '横向信息仍强，纵向信息很弱。数值门槛可能拒绝给出有限逆矩阵界限；本例改变几何，站数与参与功率不变。';
  if (b.status === 'singular') return '一个站只约束一个方向，位置 MSE 下界为无穷大；不能画成有限的闭合椭圆。';
  const comparison = ratio === null ? '有限界限未能完成比较。' : `本布局的候选下界是基准的 ${(ratio * 100).toFixed(2)}%。`;
  return `${comparison}站数 ${sides[0].resource.stations} → ${sides[1].resource.stations}，有序项 ${sides[0].resource.orderedTerms} → ${sides[1].resource.orderedTerms}；每站条件保持不变，总参与功率随站数变化。这是理论下界，不是测得的误差。`;
}

export function computeSingleComparison(value, fixture) {
  const state = normalizeState(value);
  const inputs = comparisonInputs(state, fixture);
  const sides = inputs.map(({ label, input, resource }) => ({ label, resource, result: evaluateGeometry(input) }));
  return immutable({ state, kind: 'single', sides,
    geometry: inputs.map(({ label, fixtureId, input }) => ({ label, fixtureId, ...input })),
    explanation: explain(state, sides), provenance: provenance(fixture), inputSnapshot: { state, comparisons: inputs },
  });
}

export function createBatchRequest(value, fixture, request_id) {
  const state = normalizeState(value);
  if (state.preset !== 'network' || state.view !== 'average') throw new TypeError('Batches are available only for the network average view');
  return immutable({ request_id, samples: samples(fixture, state.trials), prefixes: [4, 8],
    trial_budget: state.trials, beta: 2, information_scale: 1 });
}

/** Cancellation wins even if a completion was already queued by a Worker. */
export function cancelledBatch(batch) {
  return { ...batch, state: 'cancelled', complete: false,
    summaries: batch.prefixes.map(n => ({ n, ...summarizeAllAttempts(
      batch.records.filter(record => record.n === n).map(record => record.result),
      { complete: false, expected_attempts: batch.trial_budget }) })),
  };
}

export function pairedStatistics(batch) {
  const base = { attemptedPairs: 0, expectedPairs: batch.trial_budget, complete: batch.complete,
    finitePairs: 0, pairedMeanDelta: null, descriptivePairedSE: null,
    meaning: 'B8 minus B4 within the same retained layout; descriptive finite-sample standard error, not a confidence interval or proof of finite expectation.' };
  const pairs = new Map();
  for (const record of batch.records) {
    if (!pairs.has(record.trial_index)) pairs.set(record.trial_index, new Map());
    pairs.get(record.trial_index).set(record.n, record.result.analysis);
  }
  const deltas = [];
  for (const pair of pairs.values()) {
    if (!pair.has(4) || !pair.has(8)) continue;
    base.attemptedPairs++;
    const a = pair.get(4), b = pair.get(8);
    if (a.status === 'finite' && b.status === 'finite' && Number.isFinite(a.trace_inverse) && Number.isFinite(b.trace_inverse)) {
      base.finitePairs++;
      deltas.push(b.trace_inverse - a.trace_inverse);
    }
  }
  if (!batch.complete || base.attemptedPairs !== base.expectedPairs) return { ...base, status: 'incomplete_run' };
  if (base.finitePairs !== base.expectedPairs) return { ...base, status: 'incomplete_numerical_resolution' };
  // Kahan sum avoids avoidable cancellation; no unsuccessful pair is filtered into an aggregate.
  let sum = 0, compensation = 0;
  for (const delta of deltas) {
    const term = delta - compensation, next = sum + term;
    compensation = (next - sum) - term; sum = next;
  }
  const mean = sum / deltas.length;
  const variance = deltas.length > 1 ? deltas.reduce((total, delta) => total + (delta - mean) ** 2, 0) / (deltas.length - 1) : null;
  return { ...base, status: 'all_finite_paired_sample_not_expectation_proof', pairedMeanDelta: mean,
    descriptivePairedSE: variance === null ? null : Math.sqrt(variance / deltas.length) };
}

export function batchComparison(value, fixture, batch) {
  const state = normalizeState(value);
  const request = createBatchRequest(state, fixture, batch?.request_id);
  if (!batch || batch.trial_budget !== state.trials || JSON.stringify(batch.prefixes) !== '[4,8]' || !Array.isArray(batch.records)
    || !Array.isArray(batch.summaries) || batch.summaries.length !== 2 || batch.attempted !== batch.records.length
    || batch.requested_attempts !== state.trials * 2) throw new TypeError('Batch does not match the requested comparison');
  if (typeof batch.complete !== 'boolean' || batch.state !== (batch.complete ? 'completed' : 'cancelled')
    || batch.records.length > state.trials * 2 || (batch.complete && batch.records.length !== state.trials * 2)
    || !batch.records.every((record, index) => record.trial_index === Math.floor(index / 2)
      && record.n === [4, 8][index % 2] && typeof record.result?.analysis?.status === 'string')) {
    throw new TypeError('Batch attempt order, completion, or status records are invalid');
  }
  const inputs = comparisonInputs(state, fixture);
  const single = { state, sides: inputs.map(({ label, input, resource }) => ({ label, resource,
    result: evaluateAttempt(input, { retain_pairs: false }) })),
    geometry: inputs.map(({ label, fixtureId, input }) => ({ label, fixtureId, ...input })),
    provenance: provenance(fixture) };
  // Recompute summary bookkeeping from every retained record, including failures.
  const summaries = [4, 8].map(n => ({ n, ...summarizeAllAttempts(
    batch.records.filter(record => record.n === n).map(record => record.result),
    { complete: batch.complete, expected_attempts: state.trials }) }));
  const checked = { ...batch, summaries };
  const sides = single.sides.map((side, index) => ({ ...side, summary: summaries[index], geometryOnly: true }));
  return immutable({ ...single, kind: 'average', sides, batch: checked, statistics: pairedStatistics(checked),
    explanation: batch.complete ? '逐布局先求逆矩阵界限，再对所有尝试求汇总。布局 0 只是位置示例，不代表平均布局；有限样本不证明总体期望或方差有限。'
      : '本次运行已取消，保留已尝试计数，不报告完成样本的均值或配对差值。',
    inputSnapshot: { state, request },
  });
}
