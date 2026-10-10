'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../near-field-core.js');

function near(actual, expected, tolerance = 1e-12, label = '') {
  assert.ok(Number.isFinite(actual), `${label}: non-finite value ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} differs from ${expected} by more than ${tolerance}`);
}

function relative(actual, expected, tolerance, label = '') {
  near(actual, expected, Math.abs(expected) * tolerance, label);
}

function bounded(value, label = '') {
  assert.ok(Number.isFinite(value) && value >= 0 && value <= 1,
    `${label}: normalized coherence ${value} is outside [0, 1]`);
}

function scale(vector, magnitude, phase) {
  const re = magnitude * Math.cos(phase), im = magnitude * Math.sin(phase);
  return vector.map(v => ({re: v.re * re - v.im * im, im: v.re * im + v.im * re}));
}

// Independent reference: direct geometric lengths at moderate ranges, followed
// by the pairwise-cosine identity. It does not call steering or coherence.
function directCoherence(N, candidate, truth) {
  const phases = Array.from({length: N}, (_, n) => {
    const x = (n - (N - 1) / 2) * 0.005;
    const deltaTruth = Math.sqrt(truth * truth + x * x) - truth;
    const deltaCandidate = candidate === Infinity ? 0
      : Math.sqrt(candidate * candidate + x * x) - candidate;
    return 2 * Math.PI / 0.01 * (deltaCandidate - deltaTruth);
  });
  let power = N;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) power += 2 * Math.cos(phases[i] - phases[j]);
  }
  return power / (N * N);
}

test('fixed SI configuration, centered odd ULAs, and aperture-derived metrics', () => {
  assert.deepEqual(C.cfg, {
    lambda: 0.01, d: 0.005, counts: [33, 65, 129],
    minTruth: 4, maxTruth: 40, minCandidate: 2, maxCandidate: 80, step: 0.1
  });
  assert.ok(Object.isFrozen(C.cfg));
  assert.ok(Object.isFrozen(C.cfg.counts));
  for (const [N, D, rayleigh] of [[33, 0.16, 5.12], [65, 0.32, 20.48], [129, 0.64, 81.92]]) {
    const xs = C.positions(N), m = C.metrics(N, 4);
    assert.equal(xs.length, N);
    assert.equal(xs[(N - 1) / 2], 0);
    near(xs[0], -D / 2);
    near(xs[N - 1], D / 2);
    near(xs.reduce((sum, x) => sum + x, 0), 0);
    for (let n = 1; n < N; n++) near(xs[n] - xs[n - 1], 0.005);
    near(m.D, D);
    near(m.rayleigh, rayleigh);
    near(m.rangeToAperture, 4 / D);
  }
  const xs = C.positions(33);
  xs[0] = 999;
  near(C.positions(33)[0], -0.08, 1e-15, 'positions are returned independently');
});

test('independent exact-geometry checkpoints reproduce the one-way toy model', () => {
  // These independently calculated values are model checks, not paper results.
  const checkpoints = [
    [4, 0.1323007291, 0.2027350052, 0.3675160662],
    [8, 0.2015995712, 0.6839095186, 0.02311367785],
    [20, 0.7857007749, 0.9422027254, 0.0005927485214],
    [40, 0.9421933416, 0.9852708803, 0.00003705606884]
  ];
  for (const [r, planeMatch, doubledRangeMatch, kappa] of checkpoints) {
    const m = C.metrics(129, r);
    near(m.planeMatch, planeMatch, 6e-11, `plane match at ${r} m`);
    near(C.coherence(C.steering(129, 2 * r), C.steering(129, r)), doubledRangeMatch, 6e-11);
    relative(m.kappa, kappa, 2e-10, `kappa at ${r} m`);
  }
  for (const N of C.cfg.counts) {
    for (const truth of [4, 8, 17.25, 20, 40]) {
      for (const candidate of [2, 4, 7.3, 20, 40, 80]) {
        near(C.coherence(C.steering(N, candidate), C.steering(N, truth)),
          directCoherence(N, candidate, truth), 2e-11, `${N}, ${candidate}, ${truth}`);
      }
      near(C.metrics(N, truth).planeMatch, directCoherence(N, Infinity, truth), 2e-11);
    }
  }
});

test('stable path difference agrees with exact geometry and survives distant cancellation', () => {
  for (const x of [-0.32, -0.105, 0, 0.105, 0.32]) {
    for (const r of [2, 4, 20, 80]) {
      for (const theta of [-1, -0.37, 0, 0.37, 1]) {
        const direct = Math.sqrt(r * r + x * x - 2 * r * x * Math.sin(theta)) - r;
        near(C.pathDifference(x, r, theta), direct, 3e-14);
        near(C.pathDifference(x, r, theta), C.pathDifference(-x, r, -theta), 1e-15);
      }
    }
  }
  for (const r of [1e8, 1e12, 1e16]) {
    // At these scales sqrt(r^2+x^2)-r rounds to zero; the rationalized
    // expression must preserve the tiny physical broadside path difference.
    const x = 0.32;
    assert.equal(Math.hypot(r, x) - r, 0);
    relative(C.pathDifference(x, r), x * x / (2 * r), 2e-15);
    assert.ok(C.pathDifference(x, r) > 0);
    near(C.pathDifference(x, r, 0.37), -x * Math.sin(0.37), 1e-9);
  }
  assert.equal(C.pathDifference(0, 4), 0);
});

test('broadside steering is symmetric, unit magnitude, centered, and one-way', () => {
  for (const N of C.cfg.counts) {
    for (const r of [2, 4, 8, 20, 40, 80]) {
      const a = C.steering(N, r), center = (N - 1) / 2;
      near(a[center].re, 1);
      near(a[center].im, 0);
      for (let n = 0; n < N; n++) {
        const v = a[n], mirror = a[N - 1 - n];
        near(v.re * v.re + v.im * v.im, 1);
        near(v.x, -mirror.x);
        near(v.phase, mirror.phase);
        near(v.re, mirror.re);
        near(v.im, mirror.im);
        const direct = Math.sqrt(r * r + v.x * v.x) - r;
        near(v.phase, -2 * Math.PI / 0.01 * direct, 1e-11,
          'propagation phase uses one path, not a doubled round trip');
      }
      near(C.coherence(a, a), 1);
    }
  }
});

test('coherence profiles out independent common phase and nonzero complex gain', () => {
  for (const N of C.cfg.counts) {
    for (const [r, candidate] of [[4, 4], [4, 8], [8, 25], [20, 2], [40, 80]]) {
      const a = C.steering(N, candidate), b = C.steering(N, r), baseline = C.coherence(a, b);
      for (const phase of [-Math.PI, -0.73, 0, 0.37, Math.PI / 2, 9.1]) {
        near(C.coherence(C.steering(N, candidate, {phase}), b), baseline, 5e-14);
        near(C.coherence(a, C.steering(N, r, {phase})), baseline, 5e-14);
        for (const gain of [1e-6, 0.25, 7, 1e6]) {
          near(C.coherence(scale(a, gain, phase), b), baseline, 5e-14);
          near(C.coherence(a, scale(b, gain, phase)), baseline, 5e-14);
          near(C.coherence(scale(a, gain, phase), scale(b, 0.7, 0.51)), baseline, 5e-14);
        }
      }
      near(C.coherence(a, b), C.coherence(b, a));
    }
  }
  // Non-unit vectors check the actual energy normalization and conjugation.
  near(C.coherence([{re: 1, im: 0}, {re: 0, im: 2}],
    [{re: 0, im: 3}, {re: 4, im: 0}]), 0.2);
  near(C.coherence([{re: 1, im: 0}, {re: 1, im: 0}],
    [{re: 1, im: 0}, {re: -1, im: 0}]), 0);
  near(C.coherence([{re: 3, im: -4}], [{re: -2, im: 7}]), 1);
});

test('the plane model removes curvature and is exactly candidate-range blind', () => {
  for (const N of C.cfg.counts) {
    const plane = C.steering(N, 2, {plane: true});
    for (const r of [2, 4, 8, 40, 80, 400, 1e8]) {
      assert.deepEqual(C.steering(N, r, {plane: true}), plane);
      near(C.coherence(plane, C.steering(N, r, {plane: true, phase: 0.73})), 1);
    }
    for (const r of [4, 8, 20, 40]) {
      const truth = C.steering(N, r), expected = directCoherence(N, Infinity, r);
      for (const candidate of [2, 4, 8, 20, 80]) {
        near(C.coherence(C.steering(N, candidate, {plane: true}), truth), expected, 2e-11);
      }
    }
  }
  const s = C.experiment();
  assert.ok(s.planeMatch < 0.14, 'mismatch is not silently peak-normalized to one');
  assert.ok(s.curves.every(p => p.nf === s.planeMatch && p.ff === 1));
});

test('far-field convergence and the finite-aperture paraxial kappa limit', () => {
  near(C.metrics(129, 400).planeMatch, 0.9994072041, 6e-11);
  for (const N of C.cfg.counts) {
    const values = [400, 4000, 40000].map(r => C.metrics(N, r).planeMatch);
    assert.ok(values[0] < values[1] && values[1] < values[2]);
    assert.ok(values[2] > 0.9999999);
    const xs = Array.from({length: N}, (_, i) => (i - (N - 1) / 2) * 0.005);
    const meanSquare = xs.reduce((sum, x) => sum + x * x, 0) / N;
    const varianceSquare = xs.reduce((sum, x) => sum + (x * x - meanSquare) ** 2, 0) / N;
    const r = 4000, paraxial = (2 * Math.PI / 0.01) ** 2 * varianceSquare / (4 * r ** 4);
    relative(C.metrics(N, r).kappa, paraxial, 1e-8);
    relative(C.metrics(N, 2 * r).kappa / C.metrics(N, r).kappa, 1 / 16, 1e-8,
      'fixed finite aperture has asymptotic inverse-fourth-power sensitivity');
  }
});

test('phase-derivative variance and local coherence finite differences both recover kappa', () => {
  for (const N of C.cfg.counts) {
    for (const r of [4, 8, 20, 40]) {
      const kappa = C.metrics(N, r).kappa, h = r * 1e-4;
      const plus = C.steering(N, r + h), minus = C.steering(N, r - h);
      const q = plus.map((v, i) => (v.phase - minus[i].phase) / (2 * h));
      const mean = q.reduce((sum, value) => sum + value, 0) / N;
      const variance = q.reduce((sum, value) => sum + (value - mean) ** 2, 0) / N;
      relative(variance, kappa, 5e-8, 'finite-difference derivative after removing common phase');
      const truth = C.steering(N, r);
      const curvature = fraction => {
        const delta = r * fraction;
        return (2 - C.coherence(C.steering(N, r + delta), truth)
          - C.coherence(C.steering(N, r - delta), truth)) / (2 * delta * delta);
      };
      const coarse = curvature(0.004), fine = curvature(0.001);
      assert.ok(Math.abs(fine - kappa) < Math.abs(coarse - kappa),
        `${N}, ${r}: halving toward the local limit should improve the estimate`);
      relative(fine, kappa, 6e-6, 'C(r+delta,r) = 1 - kappa delta^2 + o(delta^2)');
    }
  }
});

test('all 219 array-size and half-metre range control combinations stay finite, bounded, and normalized', () => {
  for (const N of C.cfg.counts) {
    for (let range = C.cfg.minTruth; range <= C.cfg.maxTruth; range += 0.5) {
      const s = C.experiment({N, range});
      assert.equal(s.N, N);
      assert.equal(s.range, range);
      assert.equal(s.truth.length, N);
      assert.equal(s.curves.length, 781);
      assert.equal(s.curves[0].r, 2);
      assert.equal(s.curves.at(-1).r, 80);
      assert.ok(Number.isFinite(s.kappa) && s.kappa > 0);
      near(s.D, (N - 1) * 0.005);
      near(s.rayleigh, 2 * s.D * s.D / 0.01);
      near(s.rangeToAperture, range / s.D);
      const atTruth = s.curves.find(p => p.r === range);
      assert.ok(atTruth, 'literal truth is sampled');
      near(atTruth.nn, 1);
      for (let i = 0; i < s.curves.length; i++) {
        const p = s.curves[i];
        bounded(p.nn, `N=${N}, truth=${range}, candidate=${p.r}`);
        bounded(p.nf);
        bounded(p.ff);
        assert.equal(p.nf, s.planeMatch);
        assert.equal(p.ff, 1);
        if (i) assert.ok(p.r > s.curves[i - 1].r);
      }
    }
  }
});

test('off-grid and near-grid truth values are sampled literally without losing the scan bounds', () => {
  for (const range of [4, 4.2, 4.3, 4.037, 4 + 5e-11, 17.25, 39.99, 40]) {
    const s = C.experiment({N: 33, range});
    const atTruth = s.curves.filter(p => p.r === range);
    assert.equal(atTruth.length, 1, `exact truth ${range} must occur once`);
    near(atTruth[0].nn, 1);
    assert.equal(s.curves[0].r, 2);
    assert.equal(s.curves.at(-1).r, 80);
    assert.ok(s.curves.length === 781 || s.curves.length === 782);
    for (let i = 1; i < s.curves.length; i++) assert.ok(s.curves[i].r > s.curves[i - 1].r);
  }
});

test('calculation is deterministic and experiment output is independently allocated', () => {
  const s = C.experiment({N: 65, range: 17.25});
  assert.deepEqual(C.experiment({N: 65, range: 17.25}), s);
  s.truth[0].re = 999;
  s.curves[0].nn = 999;
  const next = C.experiment({N: 65, range: 17.25});
  bounded(next.curves[0].nn);
  assert.ok(Math.abs(next.truth[0].re) <= 1);
  assert.equal(C.experiment().N, 129);
  assert.equal(C.experiment().range, 4);
});

test('invalid sizes, ranges, geometry, phase, and degenerate correlation inputs are rejected', () => {
  for (const N of [0, -1, 2, 32, 64, 128, 130, 33.5, '33', NaN, Infinity, null]) {
    assert.throws(() => C.positions(N), RangeError);
    assert.throws(() => C.steering(N, 4), RangeError);
    assert.throws(() => C.metrics(N, 4), RangeError);
    assert.throws(() => C.experiment({N}), RangeError);
  }
  for (const range of [0, -1, NaN, Infinity, -Infinity, '4', null, undefined]) {
    assert.throws(() => C.pathDifference(0.1, range), RangeError);
    assert.throws(() => C.steering(33, range), RangeError);
    assert.throws(() => C.metrics(33, range), RangeError);
    assert.throws(() => C.experiment({range}), RangeError);
  }
  for (const range of [3.999, 40.001, 400]) assert.throws(() => C.experiment({range}), RangeError);
  for (const x of [NaN, Infinity, -Infinity, '0']) assert.throws(() => C.pathDifference(x, 4), RangeError);
  for (const theta of [NaN, Infinity, -Infinity, '0']) assert.throws(() => C.pathDifference(0.1, 4, theta), RangeError);
  for (const phase of [NaN, Infinity, -Infinity, '0']) assert.throws(() => C.steering(33, 4, {phase}), RangeError);
  const one = [{re: 1, im: 0}], zero = [{re: 0, im: 0}];
  assert.throws(() => C.coherence([], []), RangeError);
  assert.throws(() => C.coherence(one, []), RangeError);
  assert.throws(() => C.coherence(one, [...one, ...one]), RangeError);
  assert.throws(() => C.coherence(zero, one), RangeError);
  assert.throws(() => C.coherence(one, zero), RangeError);
});
