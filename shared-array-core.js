/* Independent analytic teaching model, not Liu et al.'s SDR/manifold optimizer.
 * Half-wave ULA, a[m] = exp(j*pi*m*u), u = sin(theta), no 1/sqrt(N).
 * Complex numbers are [real, imaginary]; powers are ensemble linear powers.
 * Port of the frozen, public Python reference in scripts/shared-array-reference.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SharedArrayCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DEFAULTS = Object.freeze({
    n: 8, nr: 4, total_power: 1, radar_fraction: 0.5, noise_power: 0.05,
    channel_gain: 1, channel_phase: 0.37, user_u: 0, target_u: 0.25, qos_linear: 20
  });
  const MIN_NORMAL = 2 ** -1022;
  // A browser teaching model materializes five dense covariance matrices.
  // Bound that resource use explicitly rather than allocating an arbitrary n².
  const MAX_ELEMENTS = 128;
  const zeros = n => Array.from({ length: n }, () => [0, 0]);
  const indices = n => Array.from({ length: n }, (_, m) => m);
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const subtract = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const multiply = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const conjugate = a => [a[0], -a[1]];
  const abs2 = a => Math.hypot(a[0], a[1]) ** 2;
  const phase = angle => [Math.cos(angle), Math.sin(angle)];
  const scale = (a, k) => a.map(z => typeof k === 'number' ? [k * z[0], k * z[1]] : multiply(k, z));

  // Expansion summation keeps small residual energies and the centered mean.
  // This is a numerical summation technique, not an epsilon floor on physics.
  function sum(values) {
    const partials = [];
    for (let x of values) {
      let i = 0;
      for (let y of partials) {
        if (Math.abs(x) < Math.abs(y)) [x, y] = [y, x];
        const hi = x + y;
        const lo = y - (hi - x);
        if (lo !== 0) partials[i++] = lo;
        x = hi;
      }
      partials.length = i;
      partials.push(x);
    }
    return partials.reduceRight((a, b) => a + b, 0);
  }

  function inner(a, b) {
    let z = [0, 0];
    for (let i = 0; i < a.length; i++) z = add(z, multiply(conjugate(a[i]), b[i]));
    return z;
  }
  const norm2 = a => sum(a.map(abs2));
  const steering = (element_indices, u) => element_indices.map(m => phase(Math.PI * m * u));

  function covariance(factors) {
    const n = factors[0].length;
    return indices(n).map(i => indices(n).map(j =>
      factors.reduce((s, w) => add(s, multiply(w[i], conjugate(w[j]))), [0, 0])));
  }

  // The caller supplies beam vectors, e.g. [recipe.wc, recipe.wr].
  // The scan coordinate is u, NOT degrees; no per-curve peak normalization.
  function pattern(factors, u) {
    const a = steering(indices(factors[0].length), u);
    return sum(factors.map(w => abs2(inner(a, w))));
  }

  function dirichlet_power(n, delta_u) {
    let d = delta_u % 2;
    if (d > 1) d -= 2;
    if (d < -1) d += 2;
    if (d === 0) return 1;
    const half_cycles = n * d / 2;
    // Exact integer identities recognize theoretical zeros, never a tolerance.
    if (Number.isInteger(half_cycles)) return 0;
    return (Math.sin(n * Math.PI * d / 2) / (n * Math.sin(Math.PI * d / 2))) ** 2;
  }

  function wrapped_spatial_delta(target_u, user_u) {
    const d = target_u - user_u;
    // Subtract each endpoint first: near-opposite endfire can otherwise round
    // to exactly +/-2 and falsely become an exact steering alias.
    if (d > 1) return (target_u - 1) - (user_u + 1);
    if (d < -1) return (target_u + 1) - (user_u - 1);
    return d;
  }

  function numerical_error(message) {
    const error = new RangeError(message);
    error.code = 'NUMERICAL_RANGE';
    return error;
  }

  function stable_projection(nr, user_u, target_u, channel_gain = 1) {
    const bt = scale(steering(indices(nr), target_u), 1 / Math.sqrt(nr));
    if (channel_gain === 0) return { projected: bt, q: 1, nullity: nr };
    const d = wrapped_spatial_delta(target_u, user_u);
    if (nr === 1 || d === 0) return { projected: zeros(nr), q: 0, nullity: nr - 1 };
    const step = Math.PI * d, center = (nr - 1) / 2;
    // Stable complex expm1: exp(j*x)-1 = -2*sin(x/2)^2 + j*sin(x).
    // Forming 1-|rho|^2 directly would erase a genuine near-alignment q.
    const e = indices(nr).map(m => [-2 * Math.sin(step * (m - center) / 2) ** 2,
      Math.sin(step * (m - center))]);
    const mean_e = [sum(e.map(z => z[0])) / nr, sum(e.map(z => z[1])) / nr];
    const common = scale([phase(step * center)], 1 / Math.sqrt(nr))[0];
    const bu_phases = steering(indices(nr), user_u);
    const projected = e.map((z, m) => multiply(multiply(bu_phases[m], common), subtract(z, mean_e)));
    const q = norm2(projected);
    if (q === 0) throw numerical_error('positive geometric projection underflowed; do not label it infeasible');
    if (q < MIN_NORMAL) throw numerical_error('positive projection energy is subnormal; relative-accuracy range exceeded, not geometric infeasibility');
    return { projected, q, nullity: nr - 1 };
  }

  function validate_config(options) {
    if (options === null || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('configuration must be an object');
    }
    for (const key of Object.keys(options)) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) throw new TypeError('unknown configuration field: ' + key);
    }
    const cfg = { ...DEFAULTS, ...options };
    if (!Number.isSafeInteger(cfg.n) || !Number.isSafeInteger(cfg.nr)) throw new RangeError('n and nr must be integers');
    if (!(1 <= cfg.nr && cfg.nr < cfg.n)) throw new RangeError('both physical subarrays must be nonempty');
    if (cfg.n > MAX_ELEMENTS) throw new RangeError('n exceeds the supported maximum of ' + MAX_ELEMENTS + ' elements');
    if (!Object.values(cfg).every(Number.isFinite)) throw new RangeError('parameters must be finite');
    if (cfg.total_power <= 0 || cfg.noise_power <= 0) throw new RangeError('strictly positive power and noise required');
    if (cfg.radar_fraction < 0 || cfg.radar_fraction > 1 || cfg.channel_gain < 0) throw new RangeError('invalid power fraction or channel gain');
    if (cfg.user_u < -1 || cfg.user_u > 1 || cfg.target_u < -1 || cfg.target_u > 1) throw new RangeError('u must equal a physical sin(theta) in [-1,1]');
    if (cfg.qos_linear < 0) throw new RangeError('qos must be nonnegative');
    return cfg;
  }

  // Exact binary exponent extraction avoids Math.log2 rounding around powers
  // of two. Same 64-ulp boundary convention as the reference, not a pass fudge.
  const float_view = new DataView(new ArrayBuffer(8));
  function ulp(x) {
    x = Math.abs(x);
    if (!Number.isFinite(x)) return x;
    if (x < MIN_NORMAL) return Number.MIN_VALUE;
    float_view.setFloat64(0, x, false);
    const exponent = (float_view.getUint32(0, false) >>> 20) & 0x7ff;
    return 2 ** (exponent - 1023 - 52);
  }

  function recipe_metrics(cfg, name, wc, wr, shared = false) {
    const factors = shared ? [wc] : [wc, wr];
    const channel = scale(steering(indices(cfg.n), cfg.user_u),
      scale([phase(cfg.channel_phase)], Math.sqrt(cfg.channel_gain))[0]);
    const desired = abs2(inner(channel, wc));
    const radar_interference = shared ? 0 : abs2(inner(channel, wr));
    const sinr = desired / (radar_interference + cfg.noise_power);
    const r = covariance(factors);
    const diagonal = r.map((row, m) => row[m][0]);
    const band = 64 * ulp(Math.max(1, sinr, cfg.qos_linear));
    return {
      name, feasible_recipe: true, wc, wr, covariance: r,
      radiated_power: sum(diagonal), per_antenna_power: diagonal,
      desired, multiuser_interference: 0, radar_interference, noise: cfg.noise_power,
      sinr, qos_met: sinr >= cfg.qos_linear, qos_margin: sinr - cfg.qos_linear,
      qos_roundoff_band: band,
      qos_status: Math.abs(sinr - cfg.qos_linear) <= band ? 'numerical_boundary' : (sinr > cfg.qos_linear ? 'passes' : 'fails'),
      target_power: pattern(factors, cfg.target_u),
      target_comm_power: pattern([wc], cfg.target_u),
      target_independent_radar_power: shared ? 0 : pattern([wr], cfg.target_u),
      max_per_antenna: Math.max(...diagonal),
      equal_power_deviation: Math.max(...diagonal.map(x => Math.abs(x - cfg.total_power / cfg.n)))
    };
  }

  function assert_finite_tree(value) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw numerical_error('derived value exceeds the finite numerical range; not geometric infeasibility');
    }
    if (value && typeof value === 'object') Object.values(value).forEach(assert_finite_tree);
  }

  function evaluate(options = {}) {
    const cfg = validate_config(options);
    const n = cfg.n, nr = cfg.nr, nc = n - nr;
    const pr = cfg.total_power * cfg.radar_fraction;
    const pc = cfg.total_power * (1 - cfg.radar_fraction);
    const wc = zeros(nr).concat(scale(steering(indices(nc).map(m => m + nr), cfg.user_u), Math.sqrt(pc / nc)));
    const wr0 = scale(steering(indices(nr), cfg.target_u), Math.sqrt(pr / nr)).concat(zeros(nc));
    const { projected, q, nullity } = stable_projection(nr, cfg.user_u, cfg.target_u, cfg.channel_gain);
    const raw = scale(projected, Math.sqrt(pr)).concat(zeros(nc));
    const recipes = {
      split_no_null: recipe_metrics(cfg, 'split_no_null', wc, wr0),
      projection_raw_diagnostic: recipe_metrics(cfg, 'projection_raw_diagnostic', wc, raw)
    };
    let status;
    if (pr === 0) {
      recipes.split_null_fixed_power = recipe_metrics(cfg, 'split_null_fixed_power', wc, zeros(n));
      status = 'radar_power_zero_no_normalization_needed';
    } else if (q > 0) {
      // Normalize residual components first: sqrt(pr/q) can overflow although
      // the final physical beam has finite total power. Math.hypot is scale-safe.
      const pn = Math.hypot(...projected.flat());
      const wr = projected.map(z => [Math.sqrt(pr) * (z[0] / pn), Math.sqrt(pr) * (z[1] / pn)]).concat(zeros(nc));
      recipes.split_null_fixed_power = recipe_metrics(cfg, 'split_null_fixed_power', wc, wr);
      status = 'defined';
    } else {
      recipes.split_null_fixed_power = {
        name: 'split_null_fixed_power', feasible_recipe: false,
        reason: nullity === 0 ? 'positive_radar_power_nullspace_empty' : 'target_steering_projection_zero_not_architecture_infeasibility'
      };
      status = 'undefined_zero_projection';
    }
    for (const [aim, u] of [['user', cfg.user_u], ['target', cfg.target_u]]) {
      const name = 'shared_aim_' + aim;
      const w = scale(steering(indices(n), u), Math.sqrt(cfg.total_power / n));
      recipes[name] = recipe_metrics(cfg, name, w, zeros(n), true);
    }

    // Primary target values use analytical identities at cancellation-limited
    // zeros. Direct vector sums remain independently inspectable diagnostics.
    const delta = wrapped_spatial_delta(cfg.target_u, cfg.user_u);
    const rc = dirichlet_power(nc, delta), rn = dirichlet_power(n, delta);
    const target_components = {
      split_no_null: [pc * nc * rc, pr * nr],
      projection_raw_diagnostic: [pc * nc * rc, pr * nr * q * q],
      split_null_fixed_power: [pc * nc * rc, pr * nr * q],
      shared_aim_user: [cfg.total_power * n * rn, 0],
      shared_aim_target: [cfg.total_power * n, 0]
    };
    for (const [name, r] of Object.entries(recipes)) {
      if (!r.feasible_recipe) continue;
      for (const key of ['target_power', 'target_comm_power', 'target_independent_radar_power']) r[key + '_direct'] = r[key];
      const [tc, tr] = target_components[name];
      Object.assign(r, {
        target_power: tc + tr, target_comm_power: tc, target_independent_radar_power: tr,
        target_value_method: 'analytic factor identity; direct complex-sum diagnostics retained'
      });
    }

    let witness = null;
    if (q === 0 && nullity > 0 && pr > 0) {
      // A different nullspace beam, never normalization of a zero vector.
      const local = zeros(nr);
      local[0] = [Math.sqrt(pr / 2), 0];
      local[1] = scale([phase(Math.PI * cfg.user_u)], -Math.sqrt(pr / 2))[0];
      witness = recipe_metrics(cfg, 'boundary_nullspace_witness', wc, local.concat(zeros(nc)));
    }
    const result = {
      config: cfg,
      resources: {
        positions_lambda: indices(n).map(m => m / 2), rf_chains: n,
        comm_streams: 1, split_radar_streams: pr > 0 ? 1 : 0,
        shared_independent_radar_streams: 0, aperture_lambda: (n - 1) / 2,
        radar_subarray_aperture_lambda: (nr - 1) / 2,
        comm_subarray_aperture_lambda: (nc - 1) / 2,
        radar_power_budget: pr, comm_power_budget: pc,
        enforced_power_constraint: 'total trace only; no equal-diagonal constraint'
      },
      projection: {
        q, status, nullity, amplification: q > 0 ? 1 / Math.sqrt(q) : null,
        raw_radar_power: pr * q, raw_total_power: pc + pr * q,
        intended_fixed_total: cfg.total_power
      },
      recipes, boundary_nullspace_witness: witness
    };
    // JSON.stringify silently turns nonfinite values into null. Refuse that
    // corruption explicitly when an otherwise finite input overflows a metric.
    assert_finite_tree(result);
    return result;
  }

  // Exported helpers validate their caller-supplied shapes and finite values;
  // the internal model uses the same unwrapped functions on validated config.
  function checked_count(n) {
    if (!Number.isSafeInteger(n) || n < 1 || n > MAX_ELEMENTS) throw new RangeError('element count must be an integer in [1,' + MAX_ELEMENTS + ']');
  }
  function checked_u(u) {
    if (!Number.isFinite(u) || u < -1 || u > 1) throw new RangeError('u must equal a physical sin(theta) in [-1,1]');
  }
  function checked_complex(z) {
    if (!Array.isArray(z) || z.length !== 2 || !Object.hasOwn(z, 0) || !Object.hasOwn(z, 1) || !Number.isFinite(z[0]) || !Number.isFinite(z[1])) {
      throw new RangeError('complex value must be a dense finite [real, imaginary] pair');
    }
  }
  function checked_vector(v) {
    if (!Array.isArray(v)) throw new TypeError('beam vector must be an array');
    checked_count(v.length);
    for (let i = 0; i < v.length; i++) {
      if (!Object.hasOwn(v, i)) throw new RangeError('beam vector must be dense');
      checked_complex(v[i]);
    }
  }
  function checked_factors(factors) {
    if (!Array.isArray(factors)) throw new TypeError('factors must be an array of beam vectors');
    checked_count(factors.length);
    for (let i = 0; i < factors.length; i++) {
      if (!Object.hasOwn(factors, i)) throw new RangeError('factors must be dense');
      checked_vector(factors[i]);
      if (factors[i].length !== factors[0].length) throw new RangeError('factor dimensions must agree');
    }
  }
  function finite_result(value) { assert_finite_tree(value); return value; }
  const checked_binary_complex = fn => (a, b) => {
    checked_complex(a); checked_complex(b); return finite_result(fn(a, b));
  };
  return Object.freeze({
    DEFAULTS, evaluate, validate_config, MIN_NORMAL, MAX_ELEMENTS,
    pattern(factors, u) { checked_factors(factors); checked_u(u); return finite_result(pattern(factors, u)); },
    steering(element_indices, u) {
      if (!Array.isArray(element_indices)) throw new TypeError('element indices must be an array');
      checked_count(element_indices.length); checked_u(u);
      for (let i = 0; i < element_indices.length; i++) {
        const m = element_indices[i];
        if (!Object.hasOwn(element_indices, i) || !Number.isSafeInteger(m) || m < 0 || m >= MAX_ELEMENTS) throw new RangeError('element indices must be dense integers in [0,' + (MAX_ELEMENTS - 1) + ']');
      }
      return steering(element_indices, u);
    },
    inner(a, b) {
      checked_vector(a); checked_vector(b);
      if (a.length !== b.length) throw new RangeError('vector dimensions must agree');
      return finite_result(inner(a, b));
    },
    norm2(a) { checked_vector(a); return finite_result(norm2(a)); },
    covariance(factors) { checked_factors(factors); return finite_result(covariance(factors)); },
    scale(a, k) {
      checked_vector(a);
      if (typeof k === 'number') { if (!Number.isFinite(k)) throw new RangeError('scale must be finite'); }
      else checked_complex(k);
      return finite_result(scale(a, k));
    },
    dirichlet_power(n, delta_u) {
      checked_count(n);
      if (!Number.isFinite(delta_u)) throw new RangeError('spatial difference must be finite');
      return finite_result(dirichlet_power(n, delta_u));
    },
    wrapped_spatial_delta(target_u, user_u) {
      checked_u(target_u); checked_u(user_u); return wrapped_spatial_delta(target_u, user_u);
    },
    stable_projection(nr, user_u, target_u, channel_gain = 1) {
      checked_count(nr); checked_u(user_u); checked_u(target_u);
      if (!Number.isFinite(channel_gain) || channel_gain < 0) throw new RangeError('channel gain must be finite and nonnegative');
      return finite_result(stable_projection(nr, user_u, target_u, channel_gain));
    },
    ulp(x) { if (!Number.isFinite(x)) throw new RangeError('ulp input must be finite'); return ulp(x); },
    complex: Object.freeze({
      add: checked_binary_complex(add), subtract: checked_binary_complex(subtract), multiply: checked_binary_complex(multiply),
      conjugate(z) { checked_complex(z); return conjugate(z); },
      abs2(z) { checked_complex(z); return finite_result(abs2(z)); }
    })
  });
});
