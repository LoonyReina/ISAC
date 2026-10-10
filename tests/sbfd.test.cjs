'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../sbfd-core.js');

// Independent SI constants and explicit complex sums keep these checks from
// merely repeating the implementation's own intermediate calculations.
const c = 299792458;
const N = 2048;
const Fs = 20e6;
const df = Fs / N;
const fc = 6.8e9;
const To = 128e-6;
const near = (actual, expected, tolerance = 1e-12) => {
  assert.ok(Number.isFinite(actual), `Expected a finite value, got ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected} by more than ${tolerance}`);
};
function explicitPower(count, cycles) {
  let re = 0;
  let im = 0;
  for (let n = 0; n < count; n++) {
    const phase = 2 * Math.PI * n * cycles;
    re += Math.cos(phase);
    im += Math.sin(phase);
  }
  return (re * re + im * im) / (count * count);
}

test('SBFD constants preserve the declared independent ideal-grid model', () => {
  assert.equal(C.cfg.c, c);
  assert.equal(C.cfg.N, N);
  assert.equal(C.cfg.Fs, Fs);
  assert.equal(C.cfg.df, 9765.625);
  assert.equal(C.cfg.fc, fc);
  assert.equal(C.cfg.To, To);
  assert.equal(C.cfg.nulls, 254);
  near(C.cfg.N * C.cfg.df, C.cfg.Fs);
});

test('default allocation reproduces all published one-based active ranges', () => {
  assert.deepEqual(C.allocation(598), [
    { kind: 'null', start: 1, end: 64, count: 64 },
    { kind: 'sense1', start: 65, end: 662, count: 598 },
    { kind: 'null', start: 663, end: 725, count: 63 },
    { kind: 'sense2', start: 726, end: 1323, count: 598 },
    { kind: 'null', start: 1324, end: 1386, count: 63 },
    { kind: 'comm', start: 1387, end: 1984, count: 598 },
    { kind: 'null', start: 1985, end: 2048, count: 64 }
  ]);
});

test('every allowed sensing allocation covers exactly 2048 disjoint bins', () => {
  for (let K = 128; K <= 880; K++) {
    const blocks = C.allocation(K);
    const seen = new Uint8Array(N);
    const counts = { null: 0, sense1: 0, sense2: 0, comm: 0 };
    assert.deepEqual(blocks.map(block => block.kind),
      ['null', 'sense1', 'null', 'sense2', 'null', 'comm', 'null']);
    assert.deepEqual(blocks.filter(block => block.kind === 'null').map(block => block.count),
      [64, 63, 63, 64]);
    let next = 1;
    for (const block of blocks) {
      assert.ok(Number.isInteger(block.start) && Number.isInteger(block.end));
      assert.equal(block.start, next, `Gap or overlap at K=${K}`);
      assert.ok(block.start >= 1 && block.end <= N && block.end >= block.start);
      assert.equal(block.count, block.end - block.start + 1);
      assert.ok(block.count > 0);
      counts[block.kind] += block.count;
      for (let bin = block.start; bin <= block.end; bin++) {
        assert.equal(seen[bin - 1], 0, `Bin ${bin} reused at K=${K}`);
        seen[bin - 1]++;
      }
      next = block.end + 1;
    }
    assert.equal(next, N + 1);
    assert.ok(seen.every(count => count === 1));
    assert.deepEqual(counts, { null: 254, sense1: K, sense2: K, comm: 1794 - 2 * K });
    assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), N);
  }
});

test('default metrics distinguish grid width, center span and reported velocity resolution', () => {
  const s = C.metrics();
  assert.equal(s.K, 598);
  assert.equal(s.M, 1216);
  assert.equal(s.Kc, 598);
  assert.equal(s.width, 5839843.75);
  assert.equal(s.span, 5830078.125);
  near(s.width - s.span, df);
  near(s.rangeNull, 25.667849246822744);
  near(s.cpi, 0.155648);
  near(s.velocityNull, 0.1416244544628604);
  assert.ok(Math.abs(s.velocityNull - 0.145) > 0.003,
    'Calculated spacing must not silently reuse the paper-reported 0.145 m/s');
  assert.equal(s.occupied, 1794);
  assert.equal(s.nulls, 254);
  near(100 * s.occupied / N, 87.59765625);
  near(100 * s.nulls / N, 12.40234375);
  near(c / (2 * N * df), 7.49481145);
});

test('all sensing counts conserve resources and change range aperture but not Doppler aperture', () => {
  let previousRange = Infinity;
  for (let K = 128; K <= 880; K++) {
    const s = C.metrics(K, 1216);
    assert.equal(s.K, K);
    assert.equal(s.M, 1216);
    assert.equal(s.Kc, 1794 - 2 * K);
    assert.equal(s.occupied, 1794);
    assert.equal(s.nulls, 254);
    assert.equal(2 * K + s.Kc + s.nulls, N);
    assert.ok(s.Kc > 0);
    near(s.width, K * df);
    near(s.span, (K - 1) * df);
    near(s.rangeNull, c / (2 * K * df));
    near(s.velocityNull, c / (2 * fc * 1216 * To));
    assert.ok(s.rangeNull < previousRange);
    previousRange = s.rangeNull;
  }
  assert.equal(C.metrics(128).Kc, 1538);
  assert.equal(C.metrics(880).Kc, 34);
});

test('every allowed symbol count changes only the coherent-time aperture', () => {
  let previousVelocity = Infinity;
  for (let M = 128; M <= 2432; M++) {
    const s = C.metrics(598, M);
    assert.equal(s.M, M);
    assert.equal(s.Kc, 598);
    near(s.cpi, M * To);
    near(s.velocityNull, c / (2 * fc * M * To));
    near(s.rangeNull, c / (2 * 598 * df));
    assert.ok(s.velocityNull < previousVelocity);
    previousVelocity = s.velocityNull;
  }
  for (const M of [128, 256, 598, 1216]) {
    near(C.metrics(598, 2 * M).velocityNull, C.metrics(598, M).velocityNull / 2);
    near(C.metrics(598, 2 * M).cpi, 2 * C.metrics(598, M).cpi);
  }
  near(C.metrics(256).rangeNull, C.metrics(128).rangeNull / 2);
});

test('normalized responses attain unit power at zero, including the single-sample case', () => {
  for (const count of [1, 2, 128, 598, 880, 1216, 2048, 2432]) {
    near(C.power(count, 0), 1);
    near(C.rangePower(0, count), 1);
    near(C.velocityPower(0, count), 1);
  }
  for (const cycles of [-8.25, -0.5, -1e-12, 0, 0.13, 0.5, 11.375]) {
    near(C.power(1, cycles), 1);
  }
});

test('range and velocity responses have the independently calculated first nulls', () => {
  for (let K = 128; K <= 880; K++) {
    const offset = c / (2 * K * df);
    near(C.rangePower(offset, K), 0, 1e-20);
    near(C.rangePower(-offset, K), 0, 1e-20);
  }
  for (let M = 128; M <= 2432; M++) {
    const offset = c / (2 * fc * M * To);
    near(C.velocityPower(offset, M), 0, 1e-20);
    near(C.velocityPower(-offset, M), 0, 1e-20);
  }
  near(C.rangePower(7.49481145, 2048), 0, 1e-20);
  for (const count of [128, 598, 880, 1216, 2048, 2432]) {
    for (const multiple of [1, 2, 3, count - 1]) {
      near(C.power(count, multiple / count), 0, 1e-20);
    }
  }
});

test('Dirichlet power agrees with an independent explicit coherent complex sum', () => {
  const cycles = [-2.3, -1, -0.5, -0.0317, -1e-9, 0, 0.00041,
    0.07123, 0.4123, 0.5, 0.999999999, 1, 2.3];
  for (const count of [1, 2, 128, 598, 880, 1216, 2048, 2432]) {
    for (const value of cycles) {
      near(C.power(count, value), explicitPower(count, value), 1e-10);
    }
  }
});

test('SI-unit range and monostatic velocity wrappers match explicit phase sums', () => {
  for (const K of [128, 598, 880, 2048]) {
    for (const offset of [-150, -25.67, -0.2, 0, 0.2, 13, 150]) {
      near(C.rangePower(offset, K), explicitPower(K, -2 * df * offset / c), 1e-10);
    }
  }
  for (const M of [128, 598, 1216, 2432]) {
    for (const offset of [-1, -0.31, -0.001, 0, 0.001, 0.17, 1]) {
      near(C.velocityPower(offset, M), explicitPower(M, 2 * fc * offset * To / c), 1e-10);
    }
  }
});

test('removable integer-cycle singularities and nearby points are finite and stable', () => {
  for (const count of [1, 128, 598, 2048, 2432]) {
    for (const integer of [-1e12, -100, -2, -1, 0, 1, 2, 100, 1e12]) {
      near(C.power(count, integer), 1);
    }
    for (const cycles of [-1 - 2 ** -40, -1 + 2 ** -40,
      -(2 ** -40), 2 ** -40, 1 - 2 ** -40, 1 + 2 ** -40]) {
      const value = C.power(count, cycles);
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
      near(value, explicitPower(count, cycles), 1e-10);
    }
  }
});

test('responses are even and periodic; axis scaling does not invent a new aperture', () => {
  for (const count of [128, 598, 880, 1216, 2048, 2432]) {
    for (const cycles of [0, 0.00017, 0.017, 0.123, 0.4999]) {
      const value = C.power(count, cycles);
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
      near(C.power(count, -cycles), value);
      near(C.power(count, cycles + 1), value, 1e-10);
      near(C.power(count, cycles - 2), value, 1e-10);
    }
  }
  for (const K of [128, 598, 880, 2048]) {
    near(C.rangePower(c / (2 * df), K), 1);
  }
  for (const M of [128, 1216, 2432]) {
    near(C.velocityPower(c / (2 * fc * To), M), 1);
  }
});

test('power-to-decibel conversion uses a finite -60 dB display floor', () => {
  for (const [power, expected] of [[1, 0], [0.1, -10], [0.01, -20],
    [1e-5, -50], [1e-6, -60], [1e-12, -60], [0, -60]]) {
    near(C.db(power), expected);
  }
});

test('range and velocity cuts include endpoints, remain symmetric and use model powers', () => {
  for (const [kind, counts, extent, response] of [
    ['range', [128, 598, 880, 2048], 150, C.rangePower],
    ['velocity', [128, 1216, 2432], 1, C.velocityPower]
  ]) {
    for (const count of counts) {
      const cut = C.cut(kind, count, extent);
      assert.equal(cut.length, 601);
      near(cut[0].x, -extent);
      near(cut.at(-1).x, extent);
      near(cut[300].x, 0);
      near(cut[300].power, 1);
      near(cut[300].db, 0);
      for (let i = 0; i < cut.length; i++) {
        const point = cut[i];
        assert.ok(Number.isFinite(point.x));
        assert.ok(Number.isFinite(point.power) && point.power >= 0 && point.power <= 1);
        assert.ok(Number.isFinite(point.db) && point.db >= -60 && point.db <= 0);
        near(point.power, response(point.x, count));
        near(point.db, C.db(point.power));
        near(point.x, -cut[cut.length - 1 - i].x, 1e-10);
        near(point.power, cut[cut.length - 1 - i].power, 1e-10);
        if (i > 0) assert.ok(point.x > cut[i - 1].x);
      }
    }
  }
});

test('cut sample count changes plotting density without changing shared physical values', () => {
  for (const [kind, count, extent] of [['range', 598, 150], ['velocity', 1216, 1]]) {
    const coarse = C.cut(kind, count, extent, 61);
    const fine = C.cut(kind, count, extent, 601);
    assert.equal(coarse.length, 61);
    coarse.forEach((point, i) => {
      near(point.x, fine[10 * i].x, 1e-10);
      near(point.power, fine[10 * i].power, 1e-10);
      near(point.db, fine[10 * i].db, 1e-8);
    });
  }
});

test('metrics and allocations reject noninteger and out-of-domain control inputs', () => {
  for (const K of [0, -1, 127, 881, 2048, 598.5, NaN, Infinity, -Infinity, '598', null]) {
    assert.throws(() => C.metrics(K, 1216), RangeError);
    assert.throws(() => C.allocation(K), RangeError);
  }
  for (const M of [0, -1, 127, 2433, 1216.5, NaN, Infinity, -Infinity, '1216', null]) {
    assert.throws(() => C.metrics(598, M), RangeError);
  }
});

test('low-level responses reject invalid counts and nonfinite offsets', () => {
  for (const count of [0, -1, 1.5, NaN, Infinity, -Infinity, '598', null]) {
    assert.throws(() => C.power(count, 0), RangeError);
    assert.throws(() => C.rangePower(0, count), RangeError);
    assert.throws(() => C.velocityPower(0, count), RangeError);
  }
  for (const offset of [NaN, Infinity, -Infinity, '0', null]) {
    assert.throws(() => C.power(598, offset), RangeError);
    assert.throws(() => C.rangePower(offset, 598), RangeError);
    assert.throws(() => C.velocityPower(offset, 1216), RangeError);
  }
});

test('cuts reject invalid axes, extents, counts and sample grids before plotting', () => {
  for (const kind of ['', 'doppler', 'other', null]) {
    assert.throws(() => C.cut(kind, 598, 1), RangeError);
  }
  for (const extent of [0, -1, NaN, Infinity, '1', null]) {
    assert.throws(() => C.cut('range', 598, extent), RangeError);
  }
  for (const count of [0, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => C.cut('range', count, 150), RangeError);
  }
  for (const samples of [0, 1, -1, 2.5, NaN, Infinity, '601', null]) {
    assert.throws(() => C.cut('velocity', 1216, 1, samples), RangeError);
  }
});
