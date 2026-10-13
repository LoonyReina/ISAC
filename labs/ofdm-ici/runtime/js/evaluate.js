/* Evaluation only. Never call from MUSIC, search, stopping, or simulation inference.
 * Source contract: unchanged Python run_experiments.evaluation on pinned
 * ici_reference.py fee9e4a55707fe251f73bf343d0ac0142607d6c827cfd4e8bd0c974bba439cdb.
 * One-to-one rectangular minimum-cost matching retains duplicate detections.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ICIEvaluation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const INVALID_COST = 1e9;

  function finite(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(name + ' must be a finite number');
    }
    return value;
  }
  function modulo(x, p) { return ((x % p) + p) % p; }

  // Primal-dual Hungarian shortest augmenting paths. With rectangular inputs,
  // assign every member of the smaller side and then reject source sentinel
  // costs >=1e8. The objective and gates match SciPy linear_sum_assignment.
  // Equally optimal assignments need not choose the same pairs as SciPy.
  function linearSumAssignment(cost) {
    if (!Array.isArray(cost)) throw new TypeError('cost must be an array');
    const rows = cost.length;
    const cols = rows ? cost[0].length : 0;
    for (const row of cost) {
      if (!Array.isArray(row) || row.length !== cols) throw new TypeError('cost must be rectangular');
      for (const value of row) finite(value, 'assignment cost');
    }
    if (!rows || !cols) return [];
    const transposed = rows > cols;
    const n = transposed ? cols : rows;
    const m = transposed ? rows : cols;
    const at = (i, j) => transposed ? cost[j][i] : cost[i][j];
    const u = new Float64Array(n + 1);
    const v = new Float64Array(m + 1);
    const p = new Int32Array(m + 1);
    const way = new Int32Array(m + 1);
    for (let i = 1; i <= n; i++) {
      p[0] = i;
      let j0 = 0;
      const minv = new Float64Array(m + 1); minv.fill(Infinity);
      const used = new Uint8Array(m + 1);
      do {
        used[j0] = 1;
        const i0 = p[j0];
        let delta = Infinity, j1 = 0;
        for (let j = 1; j <= m; j++) {
          if (used[j]) continue;
          const cur = at(i0 - 1, j - 1) - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (let j = 0; j <= m; j++) {
          if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
          else minv[j] -= delta;
        }
        j0 = j1;
      } while (p[j0] !== 0);
      do {
        const j1 = way[j0]; p[j0] = p[j1]; j0 = j1;
      } while (j0 !== 0);
    }
    const pairs = [];
    for (let j = 1; j <= m; j++) {
      if (!p[j]) continue;
      pairs.push(transposed ? [j - 1, p[j] - 1] : [p[j] - 1, j - 1]);
    }
    pairs.sort((a, b) => a[0] - b[0]);
    return pairs;
  }

  function summarize(result, referenceIndex = 0) {
    if (!Number.isInteger(referenceIndex) || referenceIndex < 0) throw new RangeError('referenceIndex must be nonnegative');
    const values = Object.values(result.matches);
    const hits = result.matched_count;
    const falseCount = result.false_detections;
    const hasReference = referenceIndex < result.target_count;
    const referenceHit = hasReference && Object.prototype.hasOwnProperty.call(result.matches, referenceIndex) ? 1 : 0;
    const rmse = key => values.length ? Math.sqrt(values.reduce((sum, v) => sum + v[key] * v[key], 0) / values.length) : null;
    return {
      matched_count: hits,
      false_detections: falseCount,
      missed_target_indices: result.missed_target_indices.slice(),
      reference_target_index: hasReference ? referenceIndex : null,
      source_FDR_V_over_V_plus_reference_S: falseCount + referenceHit ? falseCount / (falseCount + referenceHit) : null,
      conventional_FDR_V_over_all_detections: falseCount + hits ? falseCount / (falseCount + hits) : null,
      conditional_all_hit_range_rmse_m: rmse('range_error_m'),
      conditional_all_hit_velocity_rmse_mps: rmse('velocity_error_mps')
    };
  }

  function evaluate(detections, truth, cfg, ambiguous = false) {
    if (!Array.isArray(detections) || !Array.isArray(truth)) throw new TypeError('detections and truth must be arrays');
    if (typeof ambiguous !== 'boolean') throw new TypeError('ambiguous must be boolean');
    const rho = 1 + finite(cfg.cp_ratio, 'config.cp_ratio');
    const m = finite(cfg.m, 'config.m');
    const n = finite(cfg.n, 'config.n');
    const bandwidth = finite(cfg.bandwidth, 'config.bandwidth');
    const carrier = finite(cfg.carrier, 'config.carrier');
    const lightSpeed = finite(cfg.light_speed, 'config.light_speed');
    if (rho <= 0 || m <= 0 || n <= 0 || bandwidth <= 0 || carrier <= 0 || lightSpeed <= 0) throw new RangeError('evaluation units and dimensions must be positive');
    for (const [name, rows] of [['detection', detections], ['truth', truth]]) {
      for (const row of rows) for (const key of ['delay_samples', 'epsilon', 'angle_deg']) finite(row[key], name + '.' + key);
    }
    const period = 1 / rho;
    const bin = period / m;
    const rangeStep = lightSpeed / (2 * bandwidth);
    const velocityPerEpsilon = lightSpeed / (2 * carrier * (n / bandwidth));
    const cost = truth.map(t => {
      const truthEpsilon = ambiguous ? modulo(t.epsilon + period / 2, period) - period / 2 : t.epsilon;
      return detections.map(d => {
        const dq = Math.abs(d.delay_samples - t.delay_samples);
        let de = Math.abs(d.epsilon - truthEpsilon);
        if (ambiguous) de = Math.min(de, Math.abs(de - period));
        const da = Math.abs(d.angle_deg - t.angle_deg);
        return dq <= 1 && de <= 1.5 * bin && da <= 2 ? dq + de / bin + da / 2 : INVALID_COST;
      });
    });
    const matches = {};
    for (const [k, j] of linearSumAssignment(cost)) {
      if (cost[k][j] >= 1e8) continue;
      const t = truth[k], d = detections[j];
      matches[k] = {
        detection_index: j,
        range_error_m: (d.delay_samples - t.delay_samples) * rangeStep,
        velocity_error_mps: (d.epsilon - t.epsilon) * velocityPerEpsilon,
        epsilon_error: d.epsilon - t.epsilon,
        angle_error_deg: d.angle_deg - t.angle_deg
      };
    }
    const missed = truth.map((_, k) => k).filter(k => !Object.prototype.hasOwnProperty.call(matches, k));
    const matchedCount = Object.keys(matches).length;
    const result = {
      matches,
      matched_count: matchedCount,
      target_count: truth.length,
      false_detections: detections.length - matchedCount,
      missed_target_indices: missed,
      association_domain: ambiguous ? 'ambiguous-for-FFT-source-footnote8' : 'unambiguous-for-APES-source-footnote8',
      association_tolerances: { delay_samples: 1, doppler_bins: 1.5, angle_deg: 2 },
      detections
    };
    // These additions are descriptive statistics, not extra association gates.
    result.hits = matchedCount;
    result.misses = missed.length;
    result.summary = summarize(result, 0);
    return result;
  }

  return { evaluate, summarize, linearSumAssignment, version: '1.0.0' };
});
