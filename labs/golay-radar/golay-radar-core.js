/* Independent chip-rate Golay lesson, not an IEEE 802.11ad PHY implementation.
 * Complex values are [real, imaginary]. Positive velocity means approaching.
 * Two fixed N+lmax records begin at 0 and N+guard; no truth-dependent window.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GolayRadarCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const cfg = Object.freeze({
    n: 128, dmax: 127, lmax: 127, guard: 128,
    fs: 1.76e9, fc: 60e9, c: 299792458,
    tc: 1 / 1.76e9, lambda: 299792458 / 60e9
  });
  const TAU = 2 * Math.PI;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  function finite(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(name + ' must be a finite number');
    }
    return value;
  }
  function integer(value, name, low, high) {
    finite(value, name);
    if (!Number.isSafeInteger(value) || value < low || value > high) {
      throw new RangeError(name + ' must be an integer in ' + low + '..' + high);
    }
    return value;
  }
  function object(value, name, allowed) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError(name + ' must be an object');
    }
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) throw new TypeError('Unknown ' + name + ' field: ' + key);
    }
  }
  function valueOr(o, key, fallback) { return own(o, key) ? o[key] : fallback; }
  function length(n) {
    integer(n, 'n', 1, 4096);
    if ((n & (n - 1)) !== 0) throw new RangeError('n must be a power of two');
    return n;
  }
  function complex(z, name) {
    if (!Array.isArray(z) || z.length !== 2) throw new TypeError(name + ' must be [real, imaginary]');
    finite(z[0], name + '[0]');
    finite(z[1], name + '[1]');
    return z;
  }
  function geometry(options) {
    const n = length(valueOr(options, 'n', cfg.n));
    const lmax = integer(valueOr(options, 'lmax', cfg.lmax), 'lmax', 0, 4095);
    const guard = integer(valueOr(options, 'guard', cfg.guard), 'guard', lmax, 1e9);
    return { n, lmax, guard };
  }
  function golay(n = cfg.n) {
    length(n);
    let a = [1], b = [1];
    while (a.length < n) {
      const oldA = a, oldB = b;
      a = oldA.concat(oldB);
      b = oldA.concat(oldB.map(x => -x));
    }
    return { a, b };
  }
  function magnitude(z) {
    complex(z, 'z');
    return Math.hypot(z[0], z[1]);
  }
  function physical(velocity) {
    finite(velocity, 'velocity');
    const frequency = finite(2 * velocity / cfg.lambda, 'derived frequency');
    const omega = finite(TAU * frequency / cfg.fs, 'derived omega');
    return { velocity, frequency, omega, lambda: cfg.lambda };
  }
  function metrics(g) {
    const separationChips = g.n + g.guard;
    const activeChips = 2 * g.n;
    const transmitSpanChips = separationChips + g.n;
    const observationChips = transmitSpanChips + g.lmax;
    return {
      separationChips, activeChips, observationChips,
      capturedSamples: 2 * (g.n + g.lmax), transmitSpanChips,
      activeSeconds: activeChips / cfg.fs,
      separationSeconds: separationChips / cfg.fs,
      observationSeconds: observationChips / cfg.fs,
      transmitSpanSeconds: transmitSpanChips / cfg.fs,
      rangeStep: cfg.c / (2 * cfg.fs),
      rangeMax: g.lmax * cfg.c / (2 * cfg.fs), energyChips: activeChips
    };
  }
  function resources(options = {}) {
    object(options, 'resource options', ['n', 'guard', 'lmax']);
    return metrics(geometry(options));
  }
  // Mulberry32 is a deterministic visualization PRNG, not a cryptographic RNG.
  // Open-interval uniforms prevent log(0). Each Box-Muller pair supplies both
  // independent quadratures of one CN(0, variance) sample; records never reuse it.
  function random(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return (((t ^ (t >>> 14)) >>> 0) + 0.5) / 4294967296;
    };
  }
  function noise(count, variance, uniform) {
    const output = [];
    for (let i = 0; i < count; i++) {
      if (variance === 0) output.push([0, 0]);
      else {
        const radius = Math.sqrt(-2 * Math.log(uniform())) * Math.sqrt(variance / 2);
        const angle = TAU * uniform();
        output.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
      }
    }
    return output;
  }
  function receive(template, start, targets, count, variance, uniform, compensation) {
    const y = noise(count, variance, uniform);
    for (const target of targets) {
      for (let k = 0; k < template.length; k++) {
        const i = target.delay + k;
        const phase = finite(target.omega * (start + i), 'sample Doppler phase');
        const cr = Math.cos(phase), ci = Math.sin(phase), sign = template[k];
        y[i][0] += sign * (target.alpha[0] * cr - target.alpha[1] * ci);
        y[i][1] += sign * (target.alpha[0] * ci + target.alpha[1] * cr);
      }
    }
    if (compensation !== 0) {
      for (let i = 0; i < count; i++) {
        const phase = finite(-compensation * (start + i), 'compensation phase');
        const cr = Math.cos(phase), ci = Math.sin(phase), re = y[i][0], im = y[i][1];
        y[i] = [re * cr - im * ci, re * ci + im * cr];
      }
    }
    for (const z of y) complex(z, 'received sample');
    return y;
  }
  function correlate(template, record, lmax) {
    const output = [], n = template.length;
    for (let lag = 0; lag <= lmax; lag++) {
      let re = 0, im = 0;
      for (let k = 0; k < n; k++) {
        re += template[k] * record[k + lag][0];
        im += template[k] * record[k + lag][1];
      }
      output.push(complex([re / n, im / n], 'correlation'));
    }
    return output;
  }
  function observe(options = {}) {
    object(options, 'observation options', [
      'targets', 'mode', 'n', 'guard', 'lmax', 'omega',
      'noiseVariance', 'seed', 'compensationOmega'
    ]);
    const g = geometry(options), r = metrics(g);
    const mode = valueOr(options, 'mode', 'AB');
    if (mode !== 'AB' && mode !== 'AA') throw new RangeError('mode must be AB or AA');
    const omega = finite(valueOr(options, 'omega', 0), 'omega');
    const compensation = finite(valueOr(options, 'compensationOmega', 0), 'compensationOmega');
    const variance = finite(valueOr(options, 'noiseVariance', 0), 'noiseVariance');
    if (variance < 0) throw new RangeError('noiseVariance must be nonnegative');
    const seed = integer(valueOr(options, 'seed', 1), 'seed', 0, 4294967295);
    const inputTargets = valueOr(options, 'targets', [{ delay: 12, alpha: [1, 0] }]);
    if (!Array.isArray(inputTargets)) throw new TypeError('targets must be an array');
    if (inputTargets.length > 128) throw new RangeError('At most 128 targets are supported');
    const targets = Array.from(inputTargets, target => {
      object(target, 'target', ['delay', 'alpha', 'velocity']);
      const delay = integer(target.delay, 'target delay', 0, g.lmax);
      const alpha = complex(target.alpha, 'target alpha').slice();
      const targetOmega = own(target, 'velocity') ? physical(target.velocity).omega : omega;
      return { delay, alpha, omega: targetOmega };
    });
    const pair = golay(g.n), a = pair.a, b = mode === 'AA' ? a.slice() : pair.b;
    const uniform = random(seed), count = g.n + g.lmax;
    const ya = receive(a, 0, targets, count, variance, uniform, compensation);
    const yb = receive(b, r.separationChips, targets, count, variance, uniform, compensation);
    const za = correlate(a, ya, g.lmax), zb = correlate(b, yb, g.lmax);
    const z = za.map((v, i) => [v[0] / 2 + zb[i][0] / 2, v[1] / 2 + zb[i][1] / 2]);
    return {
      a, b, ya, yb, za, zb, z, n: g.n, guard: g.guard, lmax: g.lmax,
      separationChips: r.separationChips, activeChips: r.activeChips,
      observationChips: r.observationChips, resources: r
    };
  }
  return Object.freeze({ cfg, golay, observe, physical, magnitude, resources });
});
