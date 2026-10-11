'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const C = require('../golay-radar-core.js');
const fixture = require('../data/golay-radar-validation.json');
const sources = require('../data/golay-radar-sources.json');
const root = path.resolve(__dirname, '..');
const near = (x, y, tolerance = 3e-12) => assert.ok(Math.abs(x - y) <= tolerance, `${x} != ${y}`);
const add = (x, y) => [x[0] + y[0], x[1] + y[1]];
const mul = (x, y) => [x[0] * y[0] - x[1] * y[1], x[0] * y[1] + x[1] * y[0]];
const conj = x => [x[0], -x[1]];
const exp = x => [Math.cos(x), Math.sin(x)];
const scale = (x, a) => [x[0] * a, x[1] * a];
const abs = x => Math.hypot(x[0], x[1]);
const cnear = (x, y, tolerance = 3e-12) => { near(x[0], y[0], tolerance); near(x[1], y[1], tolerance); };
const arrayNear = (x, y, tolerance = 3e-12) => {
  assert.equal(x.length, y.length);
  x.forEach((z, i) => cnear(z, y[i], tolerance));
};
function autocorrelation(q, lag, omega = 0) {
  let total = [0, 0];
  for (let k = 0; k < q.length; k++) {
    if (k + lag >= 0 && k + lag < q.length) {
      total = add(total, scale(exp(omega * k), q[k] * q[k + lag]));
    }
  }
  return total;
}
function analytic(a, b, lag, delay, alpha, omega, separation) {
  const cross = add(autocorrelation(a, lag - delay, omega),
    mul(exp(omega * separation), autocorrelation(b, lag - delay, omega)));
  return scale(mul(mul(alpha, exp(omega * lag)), cross), 1 / (2 * a.length));
}
function globalRecord(options) {
  const r = C.resources({ n: options.n, guard: options.guard, lmax: options.lmax }), { a, b } = C.golay(options.n);
  const second = options.mode === 'AA' ? a : b;
  const tx = new Array(r.observationChips).fill(0);
  a.forEach((v, i) => { tx[i] = v; tx[r.separationChips + i] = second[i]; });
  const y = tx.map((_, i) => options.targets.reduce((sum, t) => {
    const index = i - t.delay;
    if (index < 0 || index >= tx.length) return sum;
    const omega = Object.hasOwn(t, 'velocity') ? 4 * Math.PI * t.velocity * 60e9 / (299792458 * 1.76e9) : options.omega;
    return add(sum, scale(mul(t.alpha, exp(omega * i)), tx[index]));
  }, [0, 0]));
  return { ya: y.slice(0, options.n + options.lmax), yb: y.slice(r.separationChips, r.separationChips + options.n + options.lmax) };
}

test('UMD exports work in CommonJS and a browser without side effects', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root, 'golay-radar-core.js'), 'utf8'), context);
  assert.equal(typeof context.GolayRadarCore.observe, 'function');
  near(context.GolayRadarCore.observe().z[12][0], 1);
  assert.ok(Object.isFrozen(C.cfg));
  assert.ok(Object.isFrozen(C));
  assert.equal(C.cfg.n, 128);
  assert.equal(C.cfg.dmax, 127);
  assert.equal(C.cfg.lmax, 127);
  assert.equal(C.cfg.guard, 128);
});

test('independent recursion is binary and aperiodically complementary at every lag', () => {
  for (const n of [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]) {
    const { a, b } = C.golay(n);
    assert.equal(a.length, n);
    assert.equal(b.length, n);
    assert.ok(a.concat(b).every(v => v === 1 || v === -1));
    for (let lag = -n; lag <= n; lag++) {
      cnear(add(autocorrelation(a, lag), autocorrelation(b, lag)), [lag === 0 ? 2 * n : 0, 0], 0);
    }
  }
  assert.deepEqual(C.golay(4), { a: [1, 1, 1, -1], b: [1, 1, -1, 1] });
});

test('all 128 candidate delays and arbitrary common phases recover a complex impulse', () => {
  for (let delay = 0; delay < 128; delay++) {
    const alpha = scale(exp(delay * Math.PI / 31), 0.7);
    const r = C.observe({ targets: [{ delay, alpha }] });
    assert.equal(r.ya.length, 255);
    assert.equal(r.yb.length, 255);
    assert.equal(r.z.length, 128);
    for (let lag = 0; lag < 128; lag++) cnear(r.z[lag], lag === delay ? alpha : [0, 0]);
  }
});

test('known fixed windows match one global transmit/receive timeline at the minimum guard', () => {
  for (const mode of ['AA', 'AB']) {
    const options = {
      n: 16, guard: 15, lmax: 15, mode, omega: -0.013,
      targets: [{ delay: 0, alpha: [.6, .8] }, { delay: 15, alpha: [-.3, .4], velocity: 50 }]
    };
    const r = C.observe(options), direct = globalRecord(options);
    arrayNear(r.ya, direct.ya);
    arrayNear(r.yb, direct.yb);
    // A truth change leaves the observation boundaries, record lengths and lag axis fixed.
    const alternate = C.observe({ ...options, targets: [{ delay: 3, alpha: [1, 0] }] });
    assert.equal(r.ya.length, alternate.ya.length);
    assert.equal(r.observationChips, alternate.observationChips);
  }
});

test('za=CA/N, zb=CB/N and z=(za+zb)/2 use complete samples at the delay endpoint', () => {
  const r = C.observe({ targets: [{ delay: 127, alpha: [.6, .8] }] });
  for (let lag = 0; lag <= r.lmax; lag++) {
    let ca = [0, 0], cb = [0, 0];
    for (let k = 0; k < r.n; k++) {
      ca = add(ca, scale(r.ya[lag + k], r.a[k]));
      cb = add(cb, scale(r.yb[lag + k], r.b[k]));
    }
    cnear(r.za[lag], scale(ca, 1 / r.n));
    cnear(r.zb[lag], scale(cb, 1 / r.n));
    cnear(r.z[lag], scale(add(r.za[lag], r.zb[lag]), .5));
  }
  cnear(r.z[127], [.6, .8]);
  // Capturing only N chips would leave just one sample of the latest echo.
  near(abs(scale(add(scale(r.ya[127], r.a[0]), scale(r.yb[127], r.b[0])), 1 / 256)), 1 / 128);
});

test('A+A and A+B share energy, active time, elapsed span and absolute normalization', () => {
  const aa = C.observe({ mode: 'AA' }), ab = C.observe({ mode: 'AB' });
  assert.deepEqual(aa.resources, ab.resources);
  assert.equal(aa.a.concat(aa.b).reduce((s, v) => s + v * v, 0), 256);
  assert.equal(ab.a.concat(ab.b).reduce((s, v) => s + v * v, 0), 256);
  assert.deepEqual(aa.a, aa.b);
  near(Math.max(...aa.z.filter((_, i) => i !== 12).map(abs)), .1484375);
  near(Math.max(...ab.z.filter((_, i) => i !== 12).map(abs)), 0);
  const lower = C.observe({ targets: [{ delay: 12, alpha: [.1, 0] }] });
  near(abs(lower.z[12]), .1);
});

test('complex addition cancels sidelobes; adding magnitudes cannot', () => {
  const r = C.observe({ targets: [{ delay: 12, alpha: [.6, .8] }] });
  const wrong = r.za.map((z, i) => (abs(z) + abs(r.zb[i])) / 2);
  near(wrong[33], 13 / 128);
  near(abs(r.z[33]), 0);
  assert.ok(Math.max(...wrong.filter((_, i) => i !== 12)) > .1);
});

test('constructed weak echo is coherently cancelled by A+A and preserved by A+B', () => {
  const targets = [{ delay: 12, alpha: [1, 0] }, { delay: 33, alpha: [.1, 0] }];
  const aa = C.observe({ targets, mode: 'AA' }), ab = C.observe({ targets });
  cnear(aa.z[33], [.1 - 13 / 128, 0]);
  cnear(ab.z[33], [.1, 0]);
  near(abs(aa.z[33]), .0015625);
  near(abs(ab.z[12]), 1);
  // This is a chosen coherent-interference example, not a detection probability.
});

test('full samplewise Doppler agrees with independent weighted-correlation formula at every lag', () => {
  for (const mode of ['AA', 'AB']) for (const omega of [0, 1e-12, 1e-5, -.003, Math.PI / 256, .07]) {
    for (const delay of [0, 12, 127]) {
      const alpha = [.4, -.9], r = C.observe({ mode, omega, targets: [{ delay, alpha }] });
      for (let lag = 0; lag <= 127; lag++) {
        cnear(r.z[lag], analytic(r.a, r.b, lag, delay, alpha, omega, 256), 5e-12);
      }
    }
  }
});

test('true-delay response includes both intraburst and interburst coherent factors', () => {
  const alpha = [-.3, .7], delay = 33;
  for (const omega of [0, 1e-14, -.003, .07, Math.PI / 256]) {
    const r = C.observe({ omega, targets: [{ delay, alpha }] });
    let finiteSum = [0, 0];
    for (let k = 0; k < 128; k++) finiteSum = add(finiteSum, exp(omega * k));
    const expected = scale(mul(mul(mul(alpha, exp(omega * delay)), finiteSum), add([1, 0], exp(omega * 256))), 1 / 256);
    cnear(r.z[delay], expected);
  }
  near(abs(C.observe({ omega: Math.PI / 256 }).z[12]), 0);
  // At pi/N the Dirichlet term is substantially attenuated even if interburst phase is 2pi.
  const r = C.observe({ omega: Math.PI / 128 });
  assert.ok(abs(r.z[12]) > .63 && abs(r.z[12]) < .64);
});

test('physical signs and realistic +/-50 m/s produce only a small short-gap distortion', () => {
  const p = C.physical(50), m = C.physical(-50);
  near(p.frequency, 20013.845711889124);
  near(p.omega * 256, .018291011100669222);
  near(m.frequency, -p.frequency);
  const positive = C.observe({ targets: [{ delay: 12, alpha: [1, 0], velocity: 50 }] });
  const negative = C.observe({ targets: [{ delay: 12, alpha: [1, 0], velocity: -50 }] });
  arrayNear(positive.z, C.observe({ omega: p.omega }).z);
  positive.z.forEach((z, i) => cnear(negative.z[i], conj(z)));
  near(abs(positive.z[12]), .9999546955063618, 1e-12);
  near(Math.max(...positive.z.filter((_, i) => i !== 12).map(abs)), .001178901, 1e-9);
});

test('synthetic long gap changes elapsed resources, preserves energy, and almost nulls a 50 m/s peak', () => {
  const p = C.physical(50), separation = Math.round(C.cfg.fs / (2 * p.frequency));
  assert.equal(separation, 43970);
  const r = C.observe({ guard: separation - 128, omega: p.omega });
  assert.equal(r.guard, 43842);
  assert.equal(r.observationChips, 44225);
  assert.equal(r.activeChips, 256);
  assert.equal(r.ya.length, 255);
  assert.ok(abs(r.z[12]) < .00002);
  assert.ok(r.resources.observationSeconds > 25e-6);
  for (let lag = 0; lag <= 127; lag++) cnear(r.z[lag], analytic(r.a, r.b, lag, 12, [1, 0], p.omega, separation));
});

test('oracle compensation rotates every absolute-time sample, including noise, and restores common Doppler', () => {
  const omega = .013, targets = [{ delay: 0, alpha: [.6, .8] }, { delay: 127, alpha: [-.3, .4] }];
  const corrected = C.observe({ omega, compensationOmega: omega, targets });
  const stationary = C.observe({ targets });
  arrayNear(corrected.z, stationary.z);
  arrayNear(corrected.ya, stationary.ya);
  arrayNear(corrected.yb, stationary.yb);
  const noisy = C.observe({ omega, targets, noiseVariance: .1, seed: 42 });
  const noisyCorrected = C.observe({ omega, compensationOmega: omega, targets, noiseVariance: .1, seed: 42 });
  noisy.ya.forEach((z, i) => cnear(noisyCorrected.ya[i], mul(z, exp(-omega * i))));
  noisy.yb.forEach((z, i) => cnear(noisyCorrected.yb[i], mul(z, exp(-omega * (256 + i)))));
  const raw = C.observe({ omega: C.physical(50).omega });
  const blockOnly = raw.za.map((z, i) => scale(add(z, mul(raw.zb[i], exp(-C.physical(50).omega * 256))), .5));
  assert.ok(Math.max(...blockOnly.filter((_, i) => i !== 12).map(abs)) > .0004);
});

test('target velocities override the shared omega and one oracle cannot correct distinct Dopplers', () => {
  const targets = [{ delay: 12, alpha: [.6, .8], velocity: 50 }, { delay: 33, alpha: [.1, -.2], velocity: -50 }];
  const r = C.observe({ targets, omega: 1 });
  arrayNear(r.z, C.observe({ targets }).z);
  const terms = targets.map(t => C.observe({ targets: [t] }));
  r.z.forEach((z, i) => cnear(z, add(terms[0].z[i], terms[1].z[i])));
  const compensated = C.observe({ targets, compensationOmega: C.physical(50).omega });
  assert.ok(Math.max(...compensated.z.filter((_, i) => i !== 12 && i !== 33).map(abs)) > .0001);
});

test('physical and resource units distinguish capture samples, span, active energy and range grid', () => {
  const r = C.resources();
  assert.equal(r.separationChips, 256);
  assert.equal(r.activeChips, 256);
  assert.equal(r.observationChips, 511);
  assert.equal(r.transmitSpanChips, 384);
  assert.equal(r.capturedSamples, 510);
  assert.equal(r.energyChips, 256);
  near(r.rangeStep, .08516831193181819);
  near(r.rangeMax, 10.81637561534091);
  near(r.rangeStep * 12, 1.0220197431818183);
  near(r.rangeStep * 33, 2.81055429375);
  near(r.observationSeconds, 511 / 1.76e9);
  near(r.activeSeconds, 256 / 1.76e9);
  near(C.magnitude([.6, .8]), 1);
  assert.equal(C.resources({ n: 1, lmax: 0, guard: 0 }).observationChips, 2);
  cnear(C.observe({ n: 1, lmax: 0, guard: 0, targets: [{ delay: 0, alpha: [1, 0] }] }).z[0], [1, 0]);
});

test('empty scene is truly zero without noise, and outputs never mutate input or future calls', () => {
  const options = { targets: [{ delay: 12, alpha: [.6, .8] }], seed: 7 };
  const snapshot = JSON.stringify(options), first = C.observe(options);
  assert.equal(JSON.stringify(options), snapshot);
  first.a[0] = 99;
  first.ya[12][0] = 99;
  first.z[12][0] = 99;
  cnear(C.observe(options).z[12], [.6, .8]);
  const empty = C.observe({ targets: [] });
  assert.ok(empty.ya.concat(empty.yb, empty.z).every(z => z[0] === 0 && z[1] === 0));
});

test('seeded CN noise is repeatable, AA/AB matched at the input, and independent between records', () => {
  const options = { targets: [], noiseVariance: .1, seed: 0 };
  const aa = C.observe({ ...options, mode: 'AA' }), ab = C.observe(options);
  assert.deepEqual(ab, C.observe(options));
  assert.deepEqual(aa.ya, ab.ya);
  assert.deepEqual(aa.yb, ab.yb);
  assert.notDeepEqual(ab.ya, ab.yb);
  assert.notDeepEqual(ab.ya, C.observe({ ...options, seed: 1 }).ya);
  assert.notDeepEqual(aa.z, ab.z); // Same input noise, different matched-filter coefficients.
  const nonempty = C.observe({ noiseVariance: .1, seed: 0 });
  const nonemptyAA = C.observe({ noiseVariance: .1, seed: 0, mode: 'AA' });
  const clean = C.observe(), cleanAA = C.observe({ mode: 'AA' });
  nonempty.yb.forEach((z, i) => cnear(add(z, scale(clean.yb[i], -1)), add(nonemptyAA.yb[i], scale(cleanAA.yb[i], -1))));
});

test('exact complete-window Gaussian covariance is diagonal for AB, colored for AA', () => {
  const { a, b } = C.golay(128), variance = .1;
  for (let lag = -127; lag <= 127; lag++) {
    const ab = scale(add(autocorrelation(a, lag), autocorrelation(b, lag)), variance / (4 * 128 ** 2));
    cnear(ab, [lag === 0 ? variance / 256 : 0, 0], 1e-16);
  }
  const aaAt21 = variance * autocorrelation(a, 21)[0] / (2 * 128 ** 2);
  assert.ok(Math.abs(aaAt21) > 0);
  near(aaAt21 / (variance / 256), -13 / 128);
});

test('Monte Carlo verifies input properness, independent windows, and output variance/covariance', () => {
  const trials = 16384, variance = .4, n = 16, expected = variance / (2 * n);
  let mean = [0, 0], power = 0, pseudo = [0, 0], outputCov = [0, 0];
  let inputPower = 0, inputPseudo = [0, 0], windowCov = [0, 0], inputAdjacent = [0, 0];
  for (let i = 0; i < trials; i++) {
    const r = C.observe({ n, lmax: 15, guard: 16, targets: [], noiseVariance: variance, seed: (8088 + Math.imul(i, 2654435761)) >>> 0 });
    const z = r.z[0], w = r.ya[0];
    mean = add(mean, z);
    power += abs(z) ** 2;
    pseudo = add(pseudo, mul(z, z));
    outputCov = add(outputCov, mul(z, conj(r.z[5])));
    inputPower += abs(w) ** 2;
    inputPseudo = add(inputPseudo, mul(w, w));
    windowCov = add(windowCov, mul(w, conj(r.yb[0])));
    inputAdjacent = add(inputAdjacent, mul(w, conj(r.ya[1])));
  }
  near(power / trials / expected, 1, .04);
  assert.ok(abs(mean) / trials < .04 * Math.sqrt(expected));
  assert.ok(abs(pseudo) / trials < .04 * expected);
  assert.ok(abs(outputCov) / trials < .04 * expected);
  near(inputPower / trials / variance, 1, .04);
  assert.ok(abs(inputPseudo) / trials < .04 * variance);
  assert.ok(abs(windowCov) / trials < .04 * variance);
  assert.ok(abs(inputAdjacent) / trials < .04 * variance);
});

test('strict validation rejects nonfinite, coerced, sparse, unsupported and physically overlapping inputs', () => {
  for (const n of [0, -1, 3, 1.5, '128', NaN, Infinity, 8192, null]) assert.throws(() => C.golay(n));
  for (const options of [null, [], 'AB', { mod: 'AB' }, { mode: 'BA' }, { n: 3 },
    { lmax: -1 }, { lmax: 1.5 }, { lmax: 4096 }, { guard: 126 }, { guard: -1 },
    { guard: 1e9 + 1 }, { guard: 128.1 }, { n: undefined },
    { omega: NaN }, { omega: '0' }, { compensationOmega: Infinity },
    { noiseVariance: -.1 }, { noiseVariance: Infinity }, { noiseVariance: null },
    { seed: -1 }, { seed: 2 ** 32 }, { seed: 1.5 }, { seed: '1' },
    { targets: null }, { targets: {} }, { targets: new Array(1) },
    { targets: new Array(129).fill({ delay: 0, alpha: [1, 0] }) },
    { targets: [null] }, { targets: [{ delay: 128, alpha: [1, 0] }] },
    { targets: [{ delay: -1, alpha: [1, 0] }] }, { targets: [{ delay: .5, alpha: [1, 0] }] },
    { targets: [{ delay: '12', alpha: [1, 0] }] }, { targets: [{ delay: 12 }] },
    { targets: [{ delay: 12, alpha: [1] }] }, { targets: [{ delay: 12, alpha: [1, 0, 0] }] },
    { targets: [{ delay: 12, alpha: ['1', 0] }] }, { targets: [{ delay: 12, alpha: [1, Infinity] }] },
    { targets: [{ delay: 12, alpha: new Array(2) }] },
    { targets: [{ delay: 12, alpha: [1, 0], omega: 0 }] },
    { targets: [{ delay: 12, alpha: [1, 0], velocity: NaN }] }]) {
    assert.throws(() => C.observe(options), `Accepted ${JSON.stringify(options)}`);
  }
  for (const velocity of [NaN, Infinity, '50', null, Number.MAX_VALUE]) assert.throws(() => C.physical(velocity));
  for (const z of [1, [1], [1, NaN], [1, 2, 3], new Array(2)]) assert.throws(() => C.magnitude(z));
  assert.throws(() => C.resources({ dmax: 127 }));
  assert.throws(() => C.resources({ guard: 126 }));
  assert.throws(() => C.observe({ omega: Number.MAX_VALUE }));
  assert.throws(() => C.observe({ targets: [{ delay: 12, alpha: [Number.MAX_VALUE, 0] }] }));
});

for (const [name, scenario] of Object.entries(fixture.scenarios)) {
  test('independent Python direct-record fixture: ' + name, () => {
    assert.equal(scenario.options.noiseVariance, 0);
    const r = C.observe(scenario.options);
    assert.deepEqual(r.a, scenario.a);
    assert.deepEqual(r.b, scenario.b);
    for (const key of ['ya', 'yb', 'za', 'zb', 'z']) arrayNear(r[key], scenario[key]);
    assert.equal(r.separationChips, scenario.separation_chips);
    assert.equal(r.activeChips, scenario.active_chips);
    assert.equal(r.observationChips, scenario.observation_chips);
  });
}

test('portable Python standard-library fixture regeneration passes from a different cwd', () => {
  const run = spawnSync('python3', [path.join(root, 'scripts/validate-golay-radar.py'), '--check'], { cwd: '/tmp', encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const report = JSON.parse(run.stdout);
  assert.equal(report.checked, true);
  assert.equal(report.reference_tests, 46);
  assert.equal(report.noiseless_scenarios, 12);
  assert.equal(path.resolve(report.output), path.join(root, 'data/golay-radar-validation.json'));
});

test('committed sources and data keep standard compliance, performance reproduction, and edition boundaries explicit', () => {
  assert.equal(fixture.standardCompliance, false);
  assert.equal(fixture.reproductionOfPaperResults, false);
  assert.equal(sources.independentConstruction.standardCompliance, false);
  assert.equal(sources.independentConstruction.paperPerformanceReproduction, false);
  assert.equal(sources.analyticalSourceVersion, 'arXiv:1702.05833v1');
  assert.equal(sources.paper.doi, '10.1109/TVT.2017.2774762');
  assert.ok(sources.sources.some(s => s.id === 'arxiv-v1' && s.redistributePDF === false));
  assert.ok(sources.importantCautions.some(s => s.includes('Journal full text not inspected')));
  assert.equal(fixture.tests.passed, fixture.tests.total);
  assert.ok(fixture.tests.checks.every(t => t.passed));
});
