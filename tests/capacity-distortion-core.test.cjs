'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
// The compatibility build uses the public root path; direct scientific checks
// use only this narrow fallback to the canonical numerical source.
const publicCore = path.join(__dirname, '../capacity-distortion-core.js');
const C = require(fs.existsSync(publicCore) ? publicCore : '../labs/capacity-distortion/capacity-distortion-core.js');
const fixturePath = path.join(__dirname, '../scripts/validation/capacity-distortion/independent-reference-fixtures.json');
const ref = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}, tolerance ${tolerance}`);
const sum = a => a.reduce((s, v) => s + v, 0);
function finiteTree(value) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), String(value));
  else if (Array.isArray(value)) value.forEach(finiteTree);
  else if (value && typeof value === 'object') Object.values(value).forEach(finiteTree);
}
function generic(f, budget) { return C.createModel({ ps: f.ps, wy: f.wy_sxy, vz: f.vz_sxz, loss: f.loss_sh, costs: f.cost_b, budget }); }
function assertCertified(r, tolerance = 1e-9) {
  assert.equal(r.status, 'converged'); assert.equal(r.converged, true); assert.equal(r.feasible, true);
  assert.ok(r.gapNats <= tolerance); close(sum(r.p), 1, 1e-12);
  assert.equal(r.trace.length, r.iterations + 1); finiteTree(r);
  for (let k = 1; k < r.trace.length; k++) {
    assert.ok(r.trace[k].feasible);
    if (r.trace[k - 1].feasible) assert.ok(r.trace[k].objectiveChange >= -1e-10, `objective decreased at ${k}`);
  }
}

test('binary Bayes estimator uses only x,z, with explicit impossible-observation and tie behavior', () => {
  const low = C.bayesRisk(C.binaryModel({ q: .4 }));
  assert.deepEqual(low.estimator, [[0, 0], [0, 1]]); assert.deepEqual(low.costs, [.4, 0]);
  assert.equal(low.observationProbability[0][1], 0); assert.equal(low.conditionalRisk[0][1], null);
  assert.deepEqual(C.bayesRisk(C.binaryModel({ q: .5 })).estimator, [[0, 0], [0, 1]]);
  assert.deepEqual(C.bayesRisk(C.binaryModel({ q: .8 })).estimator, [[1, 0], [0, 1]]);
  close(C.bayesRisk(C.binaryModel({ q: .8 })).costs[0], .2);
});

test('Eq.22 posterior normalizes reachable outputs and represents unreachable outputs without NaN', () => {
  const p = [.3, .7], q = C.posterior(C.binaryModel(), p);
  assert.deepEqual(q.reachable, [[true, false], [true, true]]);
  for (let s = 0; s < 2; s++) for (let y = 0; y < 2; y++) close(q.q[s][0][y] + q.q[s][1][y], q.reachable[s][y] ? 1 : 0);
  close(q.q[0][0][0], .3); close(q.q[1][0][0], 1); close(q.q[1][1][1], 1); finiteTree(q);
});

test('rate is I(X;Y|S) in bits, not the state-marginal channel rate', () => {
  const m = C.metrics(C.binaryModel(), [.5, .5]); close(m.rateBits, .4, 1e-14); close(m.rateNats, .4 * Math.LN2, 1e-14);
  close(m.distortion, .2); close(C.metrics(C.binaryModel(), [1, 0]).rateBits, 0);
  const stateUnknownRate = C.binaryEntropy(.2) - .5 * C.binaryEntropy(.4);
  assert.ok(Math.abs(m.rateBits - stateUnknownRate) > .1);
});

test('every actual BA iterate matches the independent binary log-odds recurrence', () => {
  for (const q of [.1, .4, .5, .8]) for (const mu of [.25, 1, 2, 8, 20]) {
    const r = C.solve(C.binaryModel({ q }), { mu, tolerance: 1e-12, maxIterations: 10000 });
    assertCertified(r, 1e-12);
    const c0 = Math.min(q, 1 - q);
    for (const row of r.trace) {
      const exact = -mu * c0 / q * (1 - (1 - q) ** row.iteration);
      close(row.logP[0] - row.logP[1], exact, 2e-12);
      close(row.distortion, c0 * row.p[0], 1e-14);
    }
    const exact = C.binaryOracle({ q, mu }); close(r.p[0], exact.p[0], 2e-11);
    close(r.rateBits, exact.rateBits, 5e-10);
  }
});

test('custom positive initialization follows its own recurrence, not a cached curve', () => {
  const r = C.solve(C.binaryModel({ q: .4 }), { mu: 1.3, initialP: [.9, .1], maxIterations: 12, tolerance: 1e-14 });
  assert.equal(r.status, 'max_iterations');
  let logOdds = Math.log(9);
  for (const row of r.trace) { close(row.logP[0] - row.logP[1], logOdds, 2e-13); logOdds = .6 * logOdds - 1.3 * .4; }
});

test('independent binary scalar fixtures and paper Fig.2 budget anchors agree', () => {
  for (const f of ref.binary_penalized) {
    const r = C.solve(C.binaryModel({ q: f.q }), { mu: f.mu, tolerance: 1e-12, maxIterations: 10000 });
    assertCertified(r, 1e-12); close(r.p[0], f.analytic_p0, 2e-11); close(r.p[0], f.independent_scalar_p0, 1e-8);
  }
  for (const f of ref.fig2_budget_points) {
    const oracle = C.binaryOracle({ q: .4, distortionBudget: f.budget_D });
    close(oracle.rateBits, f.analytic_rate_bits, 1e-13); close(oracle.rateBits, f.rate_bits, 1e-8);
    assert.ok(oracle.distortion <= f.budget_D + 1e-14);
  }
});

test('binary active/inactive input-cost fixtures match and never force equality when inactive', () => {
  for (const strategy of ['bisection', 'projected-gradient']) for (const f of ref.binary_active_cost_extension) {
    const r = C.solve(C.binaryModel({ q: f.q, costs: [0, 1], budget: f.B }), { mu: f.mu, dualStrategy: strategy });
    assertCertified(r); close(r.p[0], f.analytic_p0, 3e-9); close(r.objectiveNats, f.penalized_nats, 1e-8);
    const active = 1 - f.analytic_p0 >= f.B - 1e-10;
    const expectedLambda = active ? f.q * (Math.log(f.analytic_p0 / (1 - f.analytic_p0)) + f.mu) : 0;
    close(r.lambda, Math.max(0, expectedLambda), 1e-8);
    if (!active) { assert.equal(r.lambda, 0); assert.ok(r.cost < f.B); }
  }
});

test('literal Eq.24 dual path is selectable and default bisection/fallback are disclosed', () => {
  const m = C.binaryModel({ costs: [0, 1], budget: .3 });
  const literal = C.solve(m, { mu: 1, dualStrategy: 'projected-gradient', innerFallback: false });
  assertCertified(literal); assert.equal(literal.trace[1].innerStrategy, 'projected-gradient');
  assert.equal(literal.trace[1].innerFallback, false); assert.ok(literal.trace[1].innerIterations > 1);
  const fallback = C.solve(m, { mu: 1, dualStrategy: 'projected-gradient', maxInnerIterations: 1 });
  assertCertified(fallback); assert.equal(fallback.trace[1].innerStrategy, 'bisection'); assert.equal(fallback.trace[1].innerFallback, true);
  const capped = C.solve(m, { mu: 1, dualStrategy: 'projected-gradient', maxInnerIterations: 1, innerFallback: false });
  assert.equal(capped.status, 'inner_not_converged'); assert.equal(capped.converged, false); assert.equal(capped.feasible, true);
  assert.ok(Number.isFinite(capped.lowerNats)); assert.ok(capped.gapNats > 1e-9); finiteTree(capped);
});

test('two independent generic nonbinary models match SLSQP/KKT fixtures', () => {
  for (const f of [ref.asymmetric_ternary_extension, ref.three_output_extension]) {
    for (const expected of f.solutions) {
      const m = generic(f, expected.B == null ? f.budget_B : expected.B), r = C.solve(m, { mu: expected.mu, tolerance: 1e-10, maxIterations: 10000 });
      assertCertified(r, 1e-10); C.bayesRisk(m).costs.forEach((c, x) => close(c, f.bayes_c[x], 1e-14));
      close(r.rateBits, expected.rate_bits, 1e-7); close(r.distortion, expected.distortion, 1e-7);
      close(r.objectiveNats, expected.penalized_nats, 1e-8); r.p.forEach((p, x) => close(p, expected.p[x], 1e-6));
    }
  }
});

test('projected-gradient also independently solves a genuine ternary channel', () => {
  const f = ref.three_output_extension, expected = f.solutions.find(v => v.B === .9 && v.mu === .7);
  const r = C.solve(generic(f, .9), { mu: .7, dualStrategy: 'projected-gradient', innerFallback: false, tolerance: 1e-9 });
  assertCertified(r); close(r.rateBits, expected.rate_bits, 1e-7); close(r.distortion, expected.distortion, 1e-7);
  assert.equal(r.trace.some(v => v.innerFallback), false);
});

test('infeasible budgets, exact boundary faces, and multiple minimum-cost symbols are explicit', () => {
  const impossible = C.solve(C.binaryModel({ costs: [2, 3], budget: 1.999 }));
  assert.equal(impossible.status, 'infeasible_cost'); assert.equal(impossible.p, null); assert.equal(impossible.feasible, false); finiteTree(impossible);
  const endpoint = C.solve(C.binaryModel({ costs: [0, 1], budget: 0 }), { mu: 100 });
  assertCertified(endpoint); assert.deepEqual(endpoint.p, [1, 0]); assert.deepEqual(endpoint.support, [0]); assert.equal(endpoint.lambda, null);
  const f = ref.three_output_extension, raw = JSON.parse(JSON.stringify(generic(f, 0)));
  raw.costs = [0, 1, 0]; const multiple = C.solve(C.createModel(raw), { mu: .4 });
  assertCertified(multiple); assert.equal(multiple.p[1], 0); assert.ok(multiple.p[0] > 0 && multiple.p[2] > 0);
});

test('cost unit rescaling preserves the optimizer, including tiny nonzero budgets', () => {
  const base = C.solve(C.binaryModel({ costs: [0, 1], budget: .1 }), { mu: 1 });
  for (const scale of [1e-12, 1e-6, 1e6]) for (const strategy of ['bisection', 'projected-gradient']) {
    const r = C.solve(C.binaryModel({ costs: [0, scale], budget: .1 * scale }), { mu: 1, dualStrategy: strategy });
    assertCertified(r); assert.equal(r.exactCostBoundary, false); close(r.p[1], .1, 2e-12); close(r.p[0], base.p[0], 2e-12); close(r.lambda * scale, base.lambda, 1e-10);
  }
});

test('subnormal cost units retain certified normalized multipliers without nonfinite exports', () => {
  const r = C.solve(C.binaryModel({ costs: [0, 1e-310], budget: 1e-311 }), { mu: 1 });
  assertCertified(r); close(r.p[1], .1, 1e-11); assert.equal(r.lambda, null); assert.equal(r.multiplierOverflow, true);
  assert.ok(r.certificateLambdaNormalized > 0); assert.ok(r.updateLambdaNormalized > 0); finiteTree(r);
});

test('zero state probabilities, flat objective, q>.5 and q=1 use the actual Bayes model', () => {
  for (const q of [0, 1]) {
    const r = C.solve(C.binaryModel({ q }), { mu: 100 }); assertCertified(r); close(r.rateBits, q); close(r.distortion, 0);
  }
  assert.equal(C.binaryOracle({ q: 0 }).status, 'optimal_nonunique');
  const nonunique = C.solve(C.binaryModel({ q: 0 }), { mu: 100, initialP: [.9, .1] });
  assertCertified(nonunique); close(nonunique.p[0], .9); close(nonunique.objectiveNats, 0);
  close(C.binaryOracle({ q: .8, mu: 2 }).p[0], 1 / (1 + Math.exp(.5)), 1e-14);
});

test('noisy binary extension rebuilds both channel marginals and agrees with direct closed metrics', () => {
  const q = .4, noise = .2, p = [.3, .7], model = C.binaryModel({ q, noise });
  assert.deepEqual(model.wy, model.vz);
  close(C.metrics(model, p).rateBits, q * (C.binaryEntropy(noise + (1 - 2 * noise) * p[1]) - C.binaryEntropy(noise)), 1e-14);
  assert.ok(C.bayesRisk(model).costs[1] > 0);
  const r = C.solve(model, { mu: 2 }); assertCertified(r); assert.ok(r.distortion > C.binaryOracle({ q, mu: 2 }).distortion);
  const zeroInformation = C.solve(C.binaryModel({ noise: .5 }), { mu: 2 }); assertCertified(zeroInformation); close(zeroInformation.rateBits, 0, 1e-14);
});

test('iteration limits never masquerade as convergence and all records are deterministic JSON', () => {
  const options = { mu: 2, maxIterations: 1, tolerance: 1e-14 }, m = C.binaryModel();
  const r = C.solve(m, options); assert.equal(r.status, 'max_iterations'); assert.equal(r.converged, false); assert.equal(r.iterations, 1); assert.equal(r.trace.length, 2);
  assert.ok(r.gapNats > 1e-14); assert.equal(JSON.stringify(r), JSON.stringify(C.solve(m, options))); finiteTree(r);
  const zero = C.solve(m, { mu: 2, maxIterations: 0 }); assert.equal(zero.iterations, 0); assert.equal(zero.status, 'max_iterations');
  const infeasibleStart = C.solve(C.binaryModel({ costs: [0, 1], budget: .1 }), { maxIterations: 0 });
  assert.equal(infeasibleStart.feasible, false); assert.equal(infeasibleStart.gapNats, null); assert.equal(infeasibleStart.lowerNats, null);
});

test('log-domain support survives exported probability underflow without clipping', () => {
  const r = C.solve(C.binaryModel({ q: .1 }), { mu: 10000, maxIterations: 100, tolerance: 1e-12 });
  assertCertified(r, 1e-12); assert.equal(r.p[0], 0); assert.ok(r.logP[0] < -745); assert.ok(Number.isFinite(r.logP[0]));
  finiteTree(r);
});

test('validated models are immutable and reject invalid tensors, losses, costs, probabilities, and options', () => {
  const source = JSON.parse(JSON.stringify(C.binaryModel())), m = C.createModel(source); source.wy[0][0][0] = .2; assert.equal(m.wy[0][0][0], 1); assert.ok(Object.isFrozen(m.wy[0][0]));
  for (const mutate of [v => v.ps = [.2, .2], v => v.ps[0] = NaN, v => v.wy[0][0] = [.8, .3], v => v.wy[0][0] = [1], v => v.vz.pop(), v => v.loss[0][0] = -1, v => v.costs = [0], v => v.budget = Infinity]) {
    const raw = JSON.parse(JSON.stringify(m)); mutate(raw); assert.throws(() => C.createModel(raw));
  }
  for (const options of [{ mu: -1 }, { mu: NaN }, { tolerance: 0 }, { maxIterations: -1 }, { maxIterations: 1.5 }, { initialP: [1, 0] }, { initialP: [.2, .2] }, { dualStrategy: 'unknown' }, { maxInnerIterations: 0 }]) assert.throws(() => C.solve(m, options));
  assert.throws(() => C.metrics(m, [0, 0])); assert.throws(() => C.binaryModel({ q: 2 })); assert.throws(() => C.binaryModel({ noise: NaN }));
  const rounded = JSON.parse(JSON.stringify(m)); rounded.ps = [.6, .400000000000001]; close(sum(C.createModel(rounded).ps), 1, 1e-15);
});
