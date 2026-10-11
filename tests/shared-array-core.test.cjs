'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../shared-array-core.js');
const fixtures = require('../data/shared-array-fixtures.json');
const { validate } = require('../scripts/validate-shared-array.cjs');

const near = (a, b, atol = 2e-11, rtol = 2e-11) =>
  assert.ok(Math.abs(a - b) <= atol + rtol * Math.max(Math.abs(a), Math.abs(b)), `${a} != ${b}`);
const relative = (a, b, tol = 2e-12) => near(a, b, 0, tol);
const abs2 = z => z[0] * z[0] + z[1] * z[1];
const multiply = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const independentSteering = (n, u) => Array.from({ length: n }, (_, m) => [Math.cos(Math.PI * m * u), Math.sin(Math.PI * m * u)]);
function independentInner(a, b) {
  return a.reduce((s, z, i) => [s[0] + z[0] * b[i][0] + z[1] * b[i][1],
    s[1] + z[0] * b[i][1] - z[1] * b[i][0]], [0, 0]);
}
function quadratic(R, a) {
  const ra = R.map(row => row.reduce((s, z, j) => {
    const t = multiply(z, a[j]); return [s[0] + t[0], s[1] + t[1]];
  }, [0, 0]));
  return independentInner(a, ra);
}
function coherence(n, d) {
  const z = independentSteering(n, d).reduce((s, v) => [s[0] + v[0], s[1] + v[1]], [0, 0]);
  return abs2(z) / (n * n);
}
function random(seed) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}
function assertFinite(value) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value));
  if (value && typeof value === 'object') Object.values(value).forEach(assertFinite);
}

test('all 14 frozen Python fixtures match actual JavaScript fields and two numerical errors', () => {
  const result = validate();
  assert.equal(result.fixture_cases, 14);
  assert.equal(result.error_checks, 2);
  assert.ok(result.numeric_checks > 10000);
  assert.ok(result.max_primary_relative_error < 3e-12);
});

test('UMD works without a DOM or CommonJS and preserves the default result', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../shared-array-core.js'), 'utf8'), sandbox);
  assert.equal(typeof sandbox.window.SharedArrayCore.evaluate, 'function');
  assert.equal(typeof sandbox.window.SharedArrayCore.pattern, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.SharedArrayCore.evaluate())), JSON.parse(JSON.stringify(C.evaluate())));
  assert.ok(Object.isFrozen(C.DEFAULTS));
  const options = { nr: 6 }, original = { ...options };
  C.evaluate(options);
  assert.deepEqual(options, original);
  assert.equal(C.DEFAULTS.nr, 4);
});

test('default exact resource, SINR and raw-to-restored projection identities', () => {
  const d = C.evaluate(), r = d.recipes, rho2 = (2 + Math.sqrt(2)) / 8, q = 1 - rho2;
  relative(d.projection.q, q);
  near(r.split_no_null.desired, 2);
  near(r.split_no_null.radar_interference, 2 * rho2);
  near(r.split_no_null.sinr, 2 / (2 * rho2 + 0.05));
  near(r.split_no_null.target_power, 2 + 2 * rho2);
  near(r.projection_raw_diagnostic.radiated_power, 0.5 + 0.5 * q);
  near(r.projection_raw_diagnostic.target_independent_radar_power, 2 * q * q);
  near(r.split_null_fixed_power.target_independent_radar_power, 2 * q);
  near(r.split_null_fixed_power.target_power, 2);
  near(r.split_null_fixed_power.sinr, 40);
  near(d.projection.amplification, 1.3208031034962908);
  assert.equal(r.shared_aim_user.target_power, 0);
  near(r.shared_aim_user.sinr, 160);
  near(r.shared_aim_target.target_power, 8);
  near(r.shared_aim_target.sinr, 0);
});

test('shared data-only recipes never double-count the same symbol as radar interference', () => {
  for (const name of ['shared_aim_user', 'shared_aim_target']) {
    const r = C.evaluate().recipes[name];
    assert.equal(r.radar_interference, 0);
    assert.equal(r.multiuser_interference, 0);
    assert.equal(r.target_independent_radar_power, 0);
    assert.ok(r.wr.every(z => abs2(z) === 0));
    near(r.sinr, r.desired / r.noise);
  }
});

test('exact alignment does not epsilon-normalize a zero vector or declare architecture failure', () => {
  const d = C.evaluate({ target_u: 0 });
  assert.equal(d.projection.q, 0);
  assert.equal(d.projection.amplification, null);
  assert.equal(d.projection.nullity, 3);
  assert.equal(d.projection.status, 'undefined_zero_projection');
  const b = d.recipes.split_null_fixed_power;
  assert.equal(b.feasible_recipe, false);
  assert.equal(b.reason, 'target_steering_projection_zero_not_architecture_infeasibility');
  assert.ok(!('wc' in b) && !('radiated_power' in b));
  const witness = d.boundary_nullspace_witness;
  near(witness.radiated_power, 1);
  near(C.norm2(witness.wr), 0.5);
  near(witness.radar_interference, 0);
  near(witness.target_independent_radar_power, 0);
  near(witness.target_comm_power, 2);
  near(witness.target_power, 2);
});

test('one radar element and positive radar power have an empty strict-null subspace', () => {
  for (const target_u of [-0.73, 0, 0.5, 1]) {
    const d = C.evaluate({ nr: 1, target_u });
    assert.equal(d.projection.q, 0);
    assert.equal(d.projection.nullity, 0);
    assert.equal(d.recipes.split_null_fixed_power.reason, 'positive_radar_power_nullspace_empty');
    assert.equal(d.boundary_nullspace_witness, null);
  }
});

test('positive and negative near-alignment retain relative q accuracy without a floor', () => {
  for (const nr of [2, 3, 4, 7]) for (const delta of [1e-6, 1e-9, 1e-12, -1e-12]) {
    const { projected, q } = C.stable_projection(nr, 0, delta);
    const predicted = (Math.PI * delta) ** 2 * (nr * nr - 1) / 12;
    assert.ok(q > 0);
    relative(q, predicted, 2e-10);
    const residual = independentInner(independentSteering(nr, 0), projected);
    assert.ok(Math.sqrt(abs2(residual)) <= 5e-15 * Math.sqrt(nr * C.norm2(projected)));
  }
});

test('near-alignment normalization restores radar trace, not discarded target direction', () => {
  for (const target_u of [1e-12, -1e-12]) {
    const d = C.evaluate({ target_u }), r = d.recipes.split_null_fixed_power;
    near(C.norm2(r.wr), 0.5);
    near(r.radiated_power, 1);
    relative(r.target_independent_radar_power, 2 * d.projection.q);
    assert.ok(d.projection.amplification > 1e11);
    near(r.max_per_antenna, 0.225);
    assert.ok(r.target_independent_radar_power < 3e-23);
  }
});

test('orthogonal radar steering retains all projected power', () => {
  const d = C.evaluate({ target_u: 0.5 }), r = d.recipes;
  near(d.projection.q, 1);
  near(r.projection_raw_diagnostic.radiated_power, 1);
  near(r.split_no_null.radar_interference, 0);
  near(r.split_null_fixed_power.target_independent_radar_power, 2);
});

test('exact opposite-endfire alias is distinct from all four adjacent endpoint cases', () => {
  for (const [user_u, target_u] of [[-1, 1], [1, -1]]) {
    const d = C.evaluate({ user_u, target_u });
    assert.equal(d.projection.q, 0);
    assert.equal(d.recipes.split_null_fixed_power.feasible_recipe, false);
    near(d.boundary_nullspace_witness.target_independent_radar_power, 0);
  }
  const adjacent = 1 - Number.EPSILON / 2;
  for (const [user_u, target_u] of [[-1, adjacent], [adjacent, -1], [1, -adjacent], [-adjacent, 1]]) {
    const d = C.evaluate({ user_u, target_u });
    assert.ok(d.projection.q > 0);
    relative(d.projection.q, Math.PI ** 2 * (1 - adjacent) ** 2 * 15 / 12);
    assert.equal(d.recipes.split_null_fixed_power.feasible_recipe, true);
  }
});

test('zero radar budget bypasses normalization at exact zero projection', () => {
  for (const nr of [1, 4, 7]) {
    const d = C.evaluate({ radar_fraction: 0, target_u: 0, nr });
    assert.equal(d.recipes.split_null_fixed_power.feasible_recipe, true);
    near(d.recipes.split_null_fixed_power.radiated_power, 1);
    assert.equal(d.projection.status, 'radar_power_zero_no_normalization_needed');
    assert.equal(d.resources.split_radar_streams, 0);
    assert.equal(d.boundary_nullspace_witness, null);
  }
});

test('zero communication budget keeps split desired power and SINR at zero', () => {
  for (const qos_linear of [0, 20]) {
    const d = C.evaluate({ radar_fraction: 1, target_u: 0.5, qos_linear });
    for (const name of ['split_no_null', 'split_null_fixed_power']) {
      assert.equal(d.recipes[name].desired, 0);
      assert.equal(d.recipes[name].sinr, 0);
      assert.equal(d.recipes[name].qos_status, qos_linear === 0 ? 'numerical_boundary' : 'fails');
    }
  }
});

test('zero user channel removes the null constraint even for a single radar element', () => {
  for (const nr of [1, 4]) {
    const d = C.evaluate({ nr, channel_gain: 0 });
    assert.equal(d.projection.nullity, nr);
    assert.equal(d.projection.q, 1);
    assert.equal(d.recipes.split_null_fixed_power.feasible_recipe, true);
    for (const r of Object.values(d.recipes)) {
      assert.equal(r.desired, 0);
      assert.equal(r.radar_interference, 0);
      assert.equal(r.sinr, 0);
    }
    near(d.recipes.split_no_null.target_power, d.recipes.split_null_fixed_power.target_power);
  }
});

test('physical positions, original element channel gains and coherent apertures are explicit', () => {
  const r = C.evaluate({ nr: 6 }).resources;
  assert.deepEqual(r.positions_lambda, [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
  assert.equal(r.rf_chains, 8);
  assert.equal(r.aperture_lambda, 3.5);
  assert.equal(r.radar_subarray_aperture_lambda, 2.5);
  assert.equal(r.comm_subarray_aperture_lambda, 0.5);
  for (const [n, nr] of [[4, 2], [8, 4], [12, 6]]) {
    const d = C.evaluate({ n, nr }).recipes;
    near(d.shared_aim_user.desired, n);
    near(d.split_no_null.desired, 0.5 * (n - nr));
  }
});

test('global complex channel phase changes no power or SINR metric', () => {
  const a = C.evaluate({ channel_phase: 0.37 }).recipes;
  for (const phase of [-2.4, 0, 1.7, 20]) {
    const b = C.evaluate({ channel_phase: phase }).recipes;
    for (const key in a) for (const metric of ['desired', 'radar_interference', 'sinr']) near(a[key][metric], b[key][metric]);
  }
});

test('Hermitian channel convention equals the conjugated paper transpose convention', () => {
  const d = C.evaluate({ user_u: 0.19, target_u: -0.27, channel_phase: -0.73 });
  const h = independentSteering(8, d.config.user_u).map(z => multiply(z, [Math.cos(-0.73), Math.sin(-0.73)]));
  const paper = h.map(z => [z[0], -z[1]]);
  for (const r of Object.values(d.recipes)) {
    const directTranspose = w => paper.reduce((s, z, i) => { const t = multiply(z, w[i]); return [s[0] + t[0], s[1] + t[1]]; }, [0, 0]);
    near(r.desired, abs2(directTranspose(r.wc)));
    near(r.radar_interference, abs2(directTranspose(r.wr)));
    const wrong = abs2(independentInner(paper, r.wc));
    if (r.name === 'shared_aim_user') assert.ok(Math.abs(wrong - r.desired) > 1);
  }
});

test('actual antenna powers diagnose rather than enforce equal-diagonal constraints', () => {
  const d = C.evaluate().recipes;
  for (const name of ['shared_aim_user', 'shared_aim_target']) {
    near(d[name].equal_power_deviation, 0);
    d[name].per_antenna_power.forEach(p => near(p, 1 / 8));
  }
  assert.ok(d.split_null_fixed_power.equal_power_deviation > 0.07);
  near(d.split_null_fixed_power.max_per_antenna, 0.202097657163519);
  near(d.split_null_fixed_power.radiated_power, 1);
});

test('all fixture covariances are Hermitian PSD with correct block support and trace', () => {
  const rng = random(114);
  for (const expected of Object.values(fixtures.cases)) {
    const d = C.evaluate(expected.config), nr = d.config.nr, n = d.config.n;
    for (const r of [...Object.values(d.recipes), d.boundary_nullspace_witness].filter(r => r && r.feasible_recipe)) {
      const R = r.covariance;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        near(R[i][j][0], R[j][i][0]); near(R[i][j][1], -R[j][i][1]);
        if (!r.name.startsWith('shared') && ((i < nr) !== (j < nr))) {
          assert.equal(R[i][j][0], 0); near(R[i][j][1], 0, 0, 0);
        }
      }
      near(r.radiated_power, r.per_antenna_power.reduce((a, b) => a + b, 0));
      near(r.radiated_power, r.wc.concat(r.wr).reduce((s, z) => s + abs2(z), 0));
      r.per_antenna_power.forEach((p, i) => near(p, R[i][i][0]));
      for (let k = 0; k < 10; k++) {
        const a = Array.from({ length: n }, () => [rng() * 2 - 1, rng() * 2 - 1]);
        const p = quadratic(R, a);
        assert.ok(p[0] >= -1e-12); near(p[1], 0);
      }
    }
  }
});

test('default independent split factors have rank two and shared data covariance rank one', () => {
  const d = C.evaluate();
  for (const r of Object.values(d.recipes)) {
    if (r.name.startsWith('shared')) {
      near(C.norm2(r.wc), 1); assert.equal(C.norm2(r.wr), 0);
    } else {
      const cross = independentInner(r.wc, r.wr);
      near(cross[0], 0); near(cross[1], 0);
      assert.ok(C.norm2(r.wc) > 0 && C.norm2(r.wr) > 0);
    }
  }
});

test('181-angle renderer scans equal independent covariance quadratics and share a fixed bound', () => {
  for (const nr of [1, 2, 4, 6, 7]) {
    const d = C.evaluate({ nr });
    for (const r of Object.values(d.recipes).filter(r => r.feasible_recipe)) {
      for (let degrees = -90; degrees <= 90; degrees++) {
        const u = Math.sin(degrees * Math.PI / 180), a = independentSteering(8, u);
        const p = C.pattern([r.wc, r.wr], u), direct = quadratic(r.covariance, a);
        near(p, direct[0]); near(direct[1], 0);
        assert.ok(p >= 0 && p <= 8 * r.radiated_power + 1e-11);
      }
      near(C.pattern([r.wc, r.wr], d.config.target_u), r.target_power_direct);
    }
  }
});

test('stable projection agrees with independently constructed Gram-Schmidt away from alignment', () => {
  for (const nr of [2, 4, 7]) for (const [uu, ut] of [[0.12, 0.25], [-0.6, 0.43], [0, 0.5]]) {
    const { projected, q } = C.stable_projection(nr, uu, ut);
    const bu = independentSteering(nr, uu).map(z => z.map(v => v / Math.sqrt(nr)));
    const bt = independentSteering(nr, ut).map(z => z.map(v => v / Math.sqrt(nr)));
    const rho = independentInner(bu, bt);
    const direct = bt.map((z, i) => { const p = multiply(bu[i], rho); return [z[0] - p[0], z[1] - p[1]]; });
    direct.forEach((z, i) => { near(projected[i][0], z[0]); near(projected[i][1], z[1]); });
    near(q, direct.reduce((s, z) => s + abs2(z), 0));
  }
});

test('600 seeded states agree with independently summed steering-coherence identities', () => {
  const rng = random(20261011);
  for (let k = 0; k < 600; k++) {
    const cfg = { nr: 2 + Math.floor(rng() * 6), target_u: 2 * rng() - 1, user_u: 2 * rng() - 1,
      radar_fraction: 0.01 + 0.98 * rng(), channel_gain: 0.1 + 3.9 * rng(),
      noise_power: 0.005 + 0.195 * rng(), total_power: 0.1 + 1.9 * rng(), channel_phase: rng() * 6 - 3 };
    const d = C.evaluate(cfg), r = d.recipes, nc = 8 - cfg.nr;
    const pr = cfg.total_power * cfg.radar_fraction, pc = cfg.total_power * (1 - cfg.radar_fraction);
    const delta = cfg.target_u - cfg.user_u;
    const rr = coherence(cfg.nr, delta), rc = coherence(nc, delta), rn = coherence(8, delta), q = 1 - rr;
    near(d.projection.q, q);
    const desired = cfg.channel_gain * pc * nc;
    near(r.split_no_null.desired, desired);
    near(r.split_no_null.radar_interference, cfg.channel_gain * pr * cfg.nr * rr);
    near(r.split_no_null.target_power, pr * cfg.nr + pc * nc * rc);
    near(r.projection_raw_diagnostic.radiated_power, pc + pr * q);
    near(r.projection_raw_diagnostic.target_independent_radar_power, pr * cfg.nr * q * q);
    near(r.split_null_fixed_power.radiated_power, cfg.total_power);
    near(r.split_null_fixed_power.target_power, pr * cfg.nr * q + pc * nc * rc);
    near(r.split_null_fixed_power.sinr, desired / cfg.noise_power);
    near(r.shared_aim_user.target_power, cfg.total_power * 8 * rn);
    near(r.shared_aim_target.sinr, cfg.channel_gain * cfg.total_power * 8 * rn / cfg.noise_power);
    assertFinite(d);
  }
});

test('four-plus-four total target cancellation is special; six-plus-two is not constant', () => {
  const values = [];
  for (const target_u of [-0.83, -0.25, 0.1, 0.5, 0.73]) {
    const four = C.evaluate({ nr: 4, target_u }).recipes.split_null_fixed_power;
    near(four.target_power, 2);
    values.push(C.evaluate({ nr: 6, target_u }).recipes.split_null_fixed_power.target_power);
  }
  assert.ok(Math.max(...values) - Math.min(...values) > 0.5);
});

test('no recipe ranking or optimized architecture dominance is built into the model', () => {
  const r = C.evaluate({ target_u: 0.5 }).recipes;
  assert.equal(r.split_null_fixed_power.qos_status, 'passes');
  assert.equal(r.shared_aim_user.qos_status, 'passes');
  assert.ok(r.split_null_fixed_power.target_power > r.shared_aim_user.target_power);
  assert.ok(r.shared_aim_target.target_power > r.split_null_fixed_power.target_power);
  assert.equal(r.shared_aim_target.qos_status, 'fails');
  const aligned = C.evaluate({ target_u: 0 }).recipes;
  assert.ok(aligned.shared_aim_user.target_power > aligned.split_no_null.target_power);
  assert.ok(aligned.shared_aim_user.sinr > aligned.split_no_null.sinr);
});

test('total power scales illumination and received powers, not every interference-limited SINR', () => {
  const a = C.evaluate().recipes, b = C.evaluate({ total_power: 2 }).recipes;
  for (const name in a) {
    for (const metric of ['desired', 'radar_interference', 'target_power', 'radiated_power']) near(b[name][metric], 2 * a[name][metric]);
    if (name !== 'split_no_null') near(b[name].sinr, 2 * a[name].sinr);
  }
  assert.ok(b.split_no_null.sinr < 2 * a.split_no_null.sinr);
});

test('QoS equality uses explicit 64-ulp numerical-boundary status rather than an epsilon pass', () => {
  const d = C.evaluate({ target_u: 0.5, qos_linear: 40 }).recipes;
  assert.equal(d.split_null_fixed_power.qos_status, 'numerical_boundary');
  assert.equal(d.shared_aim_user.qos_status, 'passes');
  assert.equal(d.shared_aim_target.qos_status, 'fails');
  for (const r of Object.values(d)) assert.equal(r.qos_met, r.sinr >= 40);
  const before = C.evaluate({ qos_linear: 0 }).recipes, after = C.evaluate({ qos_linear: 1e6 }).recipes;
  for (const name in before) {
    assert.deepEqual(before[name].wc, after[name].wc);
    assert.deepEqual(before[name].covariance, after[name].covariance);
    assert.equal(before[name].sinr, after[name].sinr);
  }
  assert.equal(C.ulp(1), Number.EPSILON);
  assert.equal(C.ulp(1 - Number.EPSILON / 2), Number.EPSILON / 2);
  assert.equal(C.ulp(0), Number.MIN_VALUE);
});

test('tiny nonzero-user target powers use analytical identities and keep direct diagnostics', () => {
  const user_u = 0.37, target_u = user_u + 1e-16, d = C.evaluate({ user_u, target_u });
  const q = d.projection.q, r = d.recipes.split_null_fixed_power;
  relative(q, Math.PI ** 2 * (target_u - user_u) ** 2 * 15 / 12);
  assert.equal(r.target_independent_radar_power, 2 * q);
  assert.ok(Number.isFinite(r.target_independent_radar_power_direct));
  assert.equal(r.target_value_method, 'analytic factor identity; direct complex-sum diagnostics retained');
  near(r.target_independent_radar_power_direct, C.pattern([r.wr], target_u));
});

test('scale-safe normalization keeps very small normal q finite and fixed-power', () => {
  for (const target_u of [1e-150, -1e-150, 1e-154, -1e-154]) {
    const d = C.evaluate({ target_u });
    assertFinite(d);
    relative(d.projection.q, Math.PI ** 2 * target_u ** 2 * 15 / 12, 5e-14);
    near(d.recipes.split_null_fixed_power.radiated_power, 1);
    near(C.norm2(d.recipes.split_null_fixed_power.wr), 0.5);
    assert.ok(d.projection.amplification > 1e149);
  }
});

test('subnormal and underflow projection errors are numerical range, never infeasibility', () => {
  for (const target_u of [1e-155, -1e-155, 1e-156, 1e-160, 1e-163, 1e-200]) {
    assert.throws(() => C.evaluate({ target_u }), error =>
      error instanceof RangeError && error.code === 'NUMERICAL_RANGE' && /not geometric infeasibility|do not label it infeasible/.test(error.message));
  }
  // Frozen reference computes q diagnostically even without radar power.
  assert.throws(() => C.evaluate({ target_u: 1e-160, radar_fraction: 0 }), error => error.code === 'NUMERICAL_RANGE');
});

test('invalid configurations and derived overflow cannot silently serialize as null', () => {
  for (const cfg of [{ nr: 0 }, { nr: 8 }, { n: 4.5 }, { nr: true }, { noise_power: 0 }, { total_power: 0 },
    { radar_fraction: -0.1 }, { radar_fraction: 1.1 }, { target_u: 1.01 }, { user_u: -1.01 },
    { channel_gain: -1 }, { qos_linear: -1 }, { channel_phase: NaN }, { noise_power: Infinity }, { nr: '4' }]) {
    assert.throws(() => C.evaluate(cfg), RangeError);
  }
  for (const cfg of [null, [], 2, { targetU: 0 }]) assert.throws(() => C.evaluate(cfg), TypeError);
  for (const cfg of [{ total_power: Number.MAX_VALUE }, { channel_gain: Number.MAX_VALUE }, { noise_power: Number.MIN_VALUE }]) {
    assert.throws(() => C.evaluate(cfg), error => error.code === 'NUMERICAL_RANGE');
  }
});

test('source identity and frozen citation snapshot are retained without metric refresh', () => {
  const s = require('../data/shared-array-sources.json');
  assert.equal(s.canonical.doi, '10.1109/TWC.2018.2803045');
  assert.equal(s.canonical.authors[0], 'Fan Liu');
  assert.equal(s.canonical.volume, 17);
  assert.equal(s.retained_bibliography_snapshot.id, 'mu_mimo');
  assert.equal(s.retained_bibliography_snapshot.openalex, 963);
  assert.equal(s.retained_bibliography_snapshot.semantic_scholar, 936);
  assert.equal(s.retained_bibliography_snapshot.social, 'unavailable');
  assert.equal(s.retained_bibliography_snapshot.refreshed, false);
});

test('bounded dimensions prevent untrusted n-squared allocations', () => {
  assert.equal(C.MAX_ELEMENTS, 128);
  for (const n of [129, 1e6, Number.MAX_SAFE_INTEGER]) assert.throws(() => C.evaluate({ n }), /maximum/);
  assert.throws(() => C.evaluate({ n: Number.MAX_SAFE_INTEGER + 1 }), /integers/);
  const largest = C.evaluate({ n: 128, nr: 64 });
  assert.equal(largest.recipes.shared_aim_user.covariance.length, 128);
  near(largest.recipes.shared_aim_user.radiated_power, 1);
});

test('exported numerical helpers reject sparse, ragged, nonfinite and mismatched inputs', () => {
  const v = [[1, 0], [0, 1]], badVectors = [[], [1, 2], [[1]], [[1, 0, 0]], [[Infinity, 0]], [[1, undefined]], Array(2), [Array(2)]];
  for (const bad of badVectors) {
    assert.throws(() => C.norm2(bad));
    assert.throws(() => C.inner(bad, v));
    assert.throws(() => C.pattern([bad], 0));
    assert.throws(() => C.covariance([bad]));
  }
  assert.throws(() => C.inner(v, [[1, 0]]), /dimensions/);
  for (const factors of [[], [v, [[1, 0]]], Array(2), [v, , v]]) {
    assert.throws(() => C.pattern(factors, 0));
    assert.throws(() => C.covariance(factors));
  }
  for (const u of [NaN, Infinity, 1.01, -1.01, '0']) {
    assert.throws(() => C.pattern([v], u));
    assert.throws(() => C.steering([0, 1], u));
    assert.throws(() => C.stable_projection(2, u, 0));
    assert.throws(() => C.wrapped_spatial_delta(u, 0));
  }
  for (const count of [0, -1, 129, 1.5, Infinity]) {
    assert.throws(() => C.stable_projection(count, 0, 0.25));
    assert.throws(() => C.dirichlet_power(count, 0.25));
  }
  for (const ind of [[], [-1], [128], [0.5], Array(2), [Infinity]]) assert.throws(() => C.steering(ind, 0));
  for (const k of [Infinity, NaN, '1', [1], [1, Infinity]]) assert.throws(() => C.scale(v, k));
  assert.throws(() => C.stable_projection(4, 0, 0.25, -1));
  assert.throws(() => C.dirichlet_power(4, Infinity));
  assert.throws(() => C.complex.abs2([Number.MAX_VALUE, 0]), error => error.code === 'NUMERICAL_RANGE');
  assert.throws(() => C.complex.multiply([1, 0], [1]), /complex/);
  assert.throws(() => C.ulp(Infinity), /finite/);
});
