import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { DEFAULT_STATE, PROVENANCE, normalizeState, comparisonInputs, computeSingleComparison, createBatchRequest, batchComparison, cancelledBatch } from '../labs/cooperative-clusters/cooperative-fim-model.mjs';
import { runFixtureBatch } from '../labs/cooperative-clusters/cooperative-fim-core.mjs';
const fixtureBytes = await readFile(new URL('../assets/data/cooperative-fim-retained-coordinates.json', import.meta.url));
const fixture = JSON.parse(fixtureBytes);
const near = (actual, expected, rtol = 2e-12) => assert.ok(Math.abs(actual - expected) <= rtol * Math.max(Math.abs(expected), 1e-300), `${actual} != ${expected}`);
const replay = (state, source = fixture, options = {}) => runFixtureBatch(createBatchRequest(state, source, 'model-test'), { yield_control: async () => {}, ...options });

test('exact accepted asset hashes and canonical strict state', async () => {
  const core = await readFile(new URL('../labs/cooperative-clusters/cooperative-fim-core.mjs', import.meta.url));
  assert.equal(createHash('sha256').update(core).digest('hex'), PROVENANCE.core_sha256);
  assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'), PROVENANCE.fixture_sha256);
  assert.deepEqual(normalizeState(), DEFAULT_STATE);
  assert.equal(DEFAULT_STATE.trials, 256);
  assert.ok(Object.isFrozen(normalizeState()));
  for (const bad of [null, [], 4, 'x', { preset: 'other' }, { n: 3 }, { n: '4' }, { n: true }, { epsilon: 1e-5 },
    { epsilon: '0.00001' }, { view: 'all' }, { trials: 1 }, { trials: '256' }, { seed: 1 }, { beta: 3 }, { n: NaN }]) {
    assert.throws(() => normalizeState(bad), TypeError);
  }
});

test('symmetric prefixes recompute exact pair matrices, geometry, and resources', () => {
  const result = computeSingleComparison({}, fixture);
  assert.deepEqual(result.sides.map(side => side.result.fim), [[[6, 2], [2, 6]], [[16, 0], [0, 16]]]);
  assert.deepEqual(result.sides.map(side => side.result.analysis.eigenvalues), [[4, 8], [16, 16]]);
  assert.deepEqual(result.sides.map(side => side.result.analysis.trace_inverse), [0.375, 0.125]);
  assert.deepEqual(result.sides.map(side => side.resource), [
    { stations: 2, orderedTerms: 4, powerRatio: 1 }, { stations: 4, orderedTerms: 16, powerRatio: 2 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.sides[0].result.pair_contributions)), [[[[4, 0], [0, 0]], [[1, 1], [1, 1]]], [[[1, 1], [1, 1]], [[0, 0], [0, 4]]]]);
  assert.deepEqual(result.sides[0].result.stations, result.sides[1].result.stations.slice(0, 2));
  const one = computeSingleComparison({ n: 1 }, fixture).sides[1].result;
  assert.equal(one.analysis.status, 'singular');
  assert.equal(one.analysis.trace_inverse, 'infinity');
  assert.equal(one.analysis.inverse, undefined);
  assert.deepEqual(computeSingleComparison({ n: 2 }, fixture).sides[0].result, computeSingleComparison({ n: 2 }, fixture).sides[1].result);
});

test('near-collinear presets preserve finite, unstable, and unresolved gates', () => {
  for (const [epsilon, status, eigenvalue] of [['0.001', 'finite', 1.6749950313e-5], ['1e-05', 'unstable', 1.6749999995e-9], ['1e-07', 'singular_or_roundoff_unresolved', 1.674999999999949e-13]]) {
    const result = computeSingleComparison({ preset: 'collinear', epsilon }, fixture);
    const side = result.sides[1];
    assert.equal(side.result.analysis.status, status);
    near(side.result.analysis.eigenvalues[0], eigenvalue, 5e-11);
    assert.equal(side.resource.powerRatio, 1);
    assert.equal(side.result.singularity_certificate, null);
    if (status === 'finite') {
      near(side.result.analysis.trace_inverse, 59701.7496373, 1e-11);
      near(side.result.analysis.bound_region_semiaxes[0], 244.3392511183, 1e-11);
    } else {
      assert.equal(side.result.analysis.trace_inverse, null);
      assert.equal(side.result.analysis.bound_region_semiaxes, undefined);
    }
  }
});

test('retained layout zero uses exact paired nearest prefixes and unchanged q', () => {
  const out = computeSingleComparison({ preset: 'network' }, fixture);
  assert.deepEqual(out.sides[0].result.stations, out.sides[1].result.stations.slice(0, 4));
  near(out.sides[0].result.analysis.trace_inverse, 0.07272386704462028);
  near(out.sides[1].result.analysis.trace_inverse, 0.026585503705105783);
  assert.deepEqual(out.sides.map(side => side.resource.orderedTerms), [16, 64]);
  assert.equal(out.sides[1].resource.powerRatio, 2);
  assert.equal(out.provenance.retained.seed, 2026101401);
  assert.equal(out.inputSnapshot.comparisons[0].input.stations.length, 32);
});

test('all retained trial budgets recompute inverse then average and paired statistics', async () => {
  const expected = [[64, 0.06955966558787262, 0.029254614938990675], [128, 0.07324586585644174, 0.032436873966593165], [256, 0.07868089385470375, 0.034634514427569076]];
  for (const [trials, a, b] of expected) {
    const state = { preset: 'network', view: 'average', trials };
    const batch = await replay(state), result = batchComparison(state, fixture, batch);
    assert.equal(batch.records.length, trials * 2);
    assert.equal(result.kind, 'average');
    assert.equal(result.sides[0].geometryOnly, true);
    result.sides.forEach(side => {
      assert.equal(side.summary.attempted, trials);
      assert.deepEqual(side.summary.status_counts, { finite: trials });
      assert.equal(side.summary.aggregate_status, 'all_finite_sample_not_expectation_proof');
      assert.ok(side.summary.sqrt_mean_trace_inverse > side.summary.mean_root_trace_inverse);
    });
    near(result.sides[0].summary.mean_trace_inverse, a);
    near(result.sides[1].summary.mean_trace_inverse, b);
    near(result.statistics.pairedMeanDelta, b - a);
    assert.equal(result.inputSnapshot.request.samples.length, trials);
    if (trials === 256) {
      near(result.statistics.descriptivePairedSE, 0.004155870787878111);
      near(result.sides[0].summary.sqrt_mean_trace_inverse, 0.2805011476887461);
      near(result.sides[0].summary.mean_root_trace_inverse, 0.2288053845930387);
    }
  }
});

test('invalid, unstable, and singular attempts are all retained, never finite-only averaged', async () => {
  const state = { preset: 'network', view: 'average', trials: 64 };
  const invalid = structuredClone(fixture);
  invalid.samples[0].stations[0] = [0, 0];
  let batch = await replay(state, invalid), result = batchComparison(state, invalid, batch);
  assert.equal(result.batch.records.length, 128);
  assert.equal(result.sides[0].result.analysis.status, 'invalid_input');
  for (const side of result.sides) {
    assert.deepEqual(side.summary.status_counts, { invalid_input: 1, finite: 63 });
    assert.equal(side.summary.mean_trace_inverse, null);
    assert.equal(side.summary.aggregate_status, 'incomplete_numerical_resolution');
  }
  assert.equal(result.statistics.pairedMeanDelta, null);
  const singular = structuredClone(fixture);
  singular.samples[3].stations = Array.from({ length: 32 }, (_, i) => [1 + i / 4, 0]);
  batch = await replay(state, singular); result = batchComparison(state, singular, batch);
  for (const side of result.sides) {
    assert.equal(side.summary.status_counts.singular, 1);
    assert.equal(side.summary.mean_trace_inverse, 'infinity');
  }
  assert.equal(result.statistics.pairedMeanDelta, null);
  singular.samples[2].stations[0] = [0, 0];
  batch = await replay(state, singular); result = batchComparison(state, singular, batch);
  assert.equal(result.sides[0].summary.status_counts.invalid_input, 1);
  assert.equal(result.sides[0].summary.mean_trace_inverse, 'infinity');
  const unstable = structuredClone(fixture);
  unstable.samples[2].stations = Array.from({ length: 8 }, (_, i) => fixture.fixed.find(x => x.id === 'near_collinear_1e-05').stations[i % 4]);
  result = batchComparison(state, unstable, await replay(state, unstable));
  assert.equal(result.sides[0].summary.status_counts.unstable, 1);
  assert.equal(result.sides[0].summary.mean_trace_inverse, null);
});

test('cancelled attempts preserve per-side status counts and withhold every aggregate', async () => {
  const state = { preset: 'network', view: 'average', trials: 64 }, abort = new AbortController();
  const batch = await replay(state, fixture, { signal: abort.signal, batch_size: 5, on_progress: () => abort.abort() });
  const out = batchComparison(state, fixture, batch);
  assert.equal(batch.attempted, 5);
  assert.equal(batch.state, 'cancelled');
  assert.deepEqual(out.sides.map(side => side.summary.attempted), [3, 2]);
  assert.equal(out.statistics.attemptedPairs, 2);
  for (const side of out.sides) {
    assert.equal(side.summary.mean_trace_inverse, null);
    assert.equal(side.summary.aggregate_status, 'incomplete_run');
  }
  assert.equal(out.statistics.pairedMeanDelta, null);
  const forced = batchComparison(state, fixture, cancelledBatch(await replay(state)));
  assert.equal(forced.batch.attempted, 128);
  assert.equal(forced.sides[0].summary.mean_trace_inverse, null);
  assert.equal(forced.statistics.descriptivePairedSE, null);
});

test('input and output snapshots are immutable, copied, and JSON-safe', async () => {
  const source = structuredClone(fixture);
  const out = computeSingleComparison({}, source);
  source.fixed[0].stations[0][0] = 99;
  assert.equal(out.inputSnapshot.comparisons[0].input.stations[0][0], 1);
  assert.throws(() => { out.sides[0].result.fim[0][0] = 0; }, TypeError);
  assert.throws(() => { out.state.n = 1; }, TypeError);
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(out))), JSON.stringify(out));
  const one = computeSingleComparison({ n: 1 }, fixture);
  assert.equal(JSON.parse(JSON.stringify(one)).sides[1].result.analysis.trace_inverse, 'infinity');
  const request = createBatchRequest({ preset: 'network', view: 'average', trials: 64 }, fixture, 'immutable');
  assert.throws(() => { request.samples[0].stations[0][0] = 0; }, TypeError);
});

test('missing/reordered fixtures and forged batch completion/order are rejected', async () => {
  assert.throws(() => comparisonInputs({}, { fixed: [] }), /Missing/);
  const reversed = { ...fixture, samples: [...fixture.samples].reverse() };
  assert.throws(() => comparisonInputs({ preset: 'network' }, reversed), /indices/);
  assert.throws(() => createBatchRequest({}, fixture, 'bad'), /only/);
  const state = { preset: 'network', view: 'average', trials: 64 };
  const batch = await replay(state);
  const bad = structuredClone(batch); [bad.records[0], bad.records[1]] = [bad.records[1], bad.records[0]];
  assert.throws(() => batchComparison(state, fixture, bad), /order/);
  const short = { ...batch, records: batch.records.slice(0, 100), attempted: 100 };
  assert.throws(() => batchComparison(state, fixture, short), /completion/);
});
