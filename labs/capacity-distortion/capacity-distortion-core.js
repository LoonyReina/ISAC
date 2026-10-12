/* Kobayashi–Caire–Kramer, arXiv:1805.05713v1, Eqs. (22)–(25).
 * Finite-alphabet, receiver-known-state modified Blahut–Arimoto solver.
 * Natural-log objective I(X;Y|S) - mu E[c(X)]; displayed rate is in bits/use.
 * wy[s][x][y] and vz[s][x][z] are compatible channel marginals; the estimator
 * sees only (x,z), whereas the communication receiver knows s. No sampled
 * ground truth, finite-length code, Gaussian quantization, or RNG is used.
 */
(function (root) {
  'use strict';
  const VERSION = 'finite-ba-1.0.0';
  const LN2 = Math.LN2;
  const NORMALIZATION_TOLERANCE = 1e-10;
  const knownModels = new WeakSet();
  const sum = a => a.reduce((s, v) => s + v, 0);
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  function finite(v, name) {
    if (!Number.isFinite(v)) throw new RangeError(name + ' must be finite');
    return v;
  }
  function nonnegative(v, name) {
    finite(v, name);
    if (v < 0) throw new RangeError(name + ' must be nonnegative');
    return v;
  }
  function array(v, n, name) {
    if (!Array.isArray(v) || v.length === 0 || (n != null && v.length !== n)) {
      throw new RangeError(name + ' has invalid shape');
    }
    return v;
  }
  function freeze(v) {
    if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); }
    return v;
  }
  function probability(v, n, name) {
    array(v, n, name);
    const a = v.map((x, i) => nonnegative(x, name + '[' + i + ']'));
    const total = sum(a);
    if (Math.abs(total - 1) > NORMALIZATION_TOLERANCE) throw new RangeError(name + ' must sum to one');
    // Remove only accepted roundoff, never silently repair a non-normalized model.
    return a.map(x => x / total);
  }
  function tensor(v, ns, nx, name) {
    array(v, ns, name); array(v[0], nx, name + '[0]');
    const ny = array(v[0][0], null, name + '[0][0]').length;
    return v.map((s, i) => array(s, nx, name + '[' + i + ']').map((row, x) =>
      probability(row, ny, name + '[' + i + '][' + x + ']')));
  }
  function createModel(input) {
    if (!input || typeof input !== 'object') throw new TypeError('model must be an object');
    const ps = probability(input.ps, null, 'ps'), ns = ps.length;
    array(input.wy, ns, 'wy');
    const nx = array(input.wy[0], null, 'wy[0]').length;
    const wy = tensor(input.wy, ns, nx, 'wy'), vz = tensor(input.vz, ns, nx, 'vz');
    array(input.loss, ns, 'loss');
    const nh = array(input.loss[0], null, 'loss[0]').length;
    const loss = input.loss.map((r, s) => array(r, nh, 'loss[' + s + ']').map((v, h) => nonnegative(v, 'loss[' + s + '][' + h + ']')));
    const costs = input.costs == null ? Array(nx).fill(0) : array(input.costs, nx, 'costs').map((v, x) => nonnegative(v, 'costs[' + x + ']'));
    const budget = input.budget == null ? null : finite(input.budget, 'budget');
    const model = { ps, wy, vz, loss, costs, budget,
      dimensions: { states: ns, inputs: nx, outputs: wy[0][0].length, feedback: vz[0][0].length, estimates: nh } };
    knownModels.add(model);
    return freeze(model);
  }
  const modelOf = m => knownModels.has(m) ? m : createModel(m);
  function bayesRisk(input) {
    const m = modelOf(input), { states: ns, inputs: nx, feedback: nz, estimates: nh } = m.dimensions;
    const estimator = [], observationProbability = [], riskByObservation = [], conditionalRisk = [], costs = [];
    for (let x = 0; x < nx; x++) {
      const estimates = [], probabilities = [], risks = [], conditional = [];
      for (let z = 0; z < nz; z++) {
        let probabilityZ = 0;
        const loss = Array(nh).fill(0);
        for (let s = 0; s < ns; s++) {
          const joint = m.ps[s] * m.vz[s][x][z];
          probabilityZ += joint;
          for (let h = 0; h < nh; h++) loss[h] += joint * m.loss[s][h];
        }
        // Deterministic lowest-index tie breaking, including impossible observations.
        let best = 0;
        for (let h = 1; h < nh; h++) if (loss[h] < loss[best]) best = h;
        estimates.push(best); probabilities.push(probabilityZ); risks.push(loss[best]);
        conditional.push(probabilityZ > 0 ? loss[best] / probabilityZ : null);
      }
      estimator.push(estimates); observationProbability.push(probabilities); riskByObservation.push(risks);
      conditionalRisk.push(conditional); costs.push(sum(risks));
    }
    return { costs, estimator, observationProbability, riskByObservation, conditionalRisk };
  }
  function logSumExp(a) {
    const maximum = Math.max(...a);
    if (maximum === -Infinity) return -Infinity;
    return maximum + Math.log(sum(a.map(v => Math.exp(v - maximum))));
  }
  function normalizeLogs(logs) {
    const normalizer = logSumExp(logs);
    if (!Number.isFinite(normalizer)) throw new RangeError('empty or numerically unsupported input support');
    return logs.map(v => v - normalizer);
  }
  function logDistribution(input, n) { return probability(input, n, 'p').map(v => v === 0 ? -Infinity : Math.log(v)); }
  // Eq. (22) in the log domain. This also keeps positive but subnormal input
  // mass alive internally when exported exp(logP) has rounded to zero.
  function channelState(m, logP, includePosterior) {
    const { states: ns, inputs: nx, outputs: ny } = m.dimensions;
    const logOutput = [], divergences = Array(nx).fill(0), posteriorQ = [];
    for (let s = 0; s < ns; s++) {
      const out = [];
      for (let y = 0; y < ny; y++) out.push(logSumExp(logP.map((p, x) => m.wy[s][x][y] > 0 ? p + Math.log(m.wy[s][x][y]) : -Infinity)));
      logOutput.push(out);
      const q = [];
      for (let x = 0; x < nx; x++) {
        const row = [];
        for (let y = 0; y < ny; y++) {
          const w = m.wy[s][x][y];
          if (m.ps[s] > 0 && w > 0) divergences[x] += m.ps[s] * w * (Math.log(w) - out[y]);
          if (includePosterior) row.push(w > 0 && out[y] !== -Infinity ? Math.exp(logP[x] + Math.log(w) - out[y]) : 0);
        }
        if (includePosterior) q.push(row);
      }
      if (includePosterior) posteriorQ.push(q);
    }
    return { logOutput, divergences, posteriorQ };
  }
  function posterior(input, p) {
    const m = modelOf(input), state = channelState(m, logDistribution(p, m.dimensions.inputs), true);
    return { q: state.posteriorQ, outputProbability: state.logOutput.map(row => row.map(Math.exp)),
      // All-zero posterior columns represent impossible outputs, not a division by zero.
      reachable: state.logOutput.map(row => row.map(v => v !== -Infinity)) };
  }
  function directMetrics(m, p, c, mu, state) {
    // A zero-mass input contributes zero, even if its directional derivative is infinite.
    const rateNats = p.reduce((v, px, x) => v + (px > 0 ? px * state.divergences[x] : 0), 0);
    const distortion = dot(p, c), cost = dot(p, m.costs);
    return { rateNats, rateBits: rateNats / LN2, distortion, cost, objectiveNats: rateNats - mu * distortion };
  }
  function metrics(input, p, options = {}) {
    const m = modelOf(input), mu = nonnegative(options.mu == null ? 0 : options.mu, 'mu');
    const logP = logDistribution(p, m.dimensions.inputs), normalizedP = logP.map(Math.exp);
    return directMetrics(m, normalizedP, bayesRisk(m).costs, mu, channelState(m, logP, false));
  }
  // Eq. (23) softmax and Eq. (24) projected dual, or a disclosed bisection
  // substitute solving the identical fixed-Q subproblem. Normalize cost range
  // internally so feasibility and tolerances do not depend on cost units.
  function costUpdate(base, costs, budget, tolerance, controls) {
    const activeCosts = costs.filter((_, i) => base[i] !== -Infinity);
    const minimum = Math.min(...activeCosts), range = Math.max(...activeCosts) - minimum;
    const shifted = costs.map(v => range > 0 ? (v - minimum) / range : 0);
    const target = budget == null || range === 0 ? null : (budget - minimum) / range;
    function at(dual) {
      const logP = normalizeLogs(base.map((v, i) => v === -Infinity ? -Infinity : v - dual * shifted[i]));
      const p = logP.map(Math.exp);
      const lambda = range > 0 ? dual / range : 0;
      return { logP, p, lambda: Number.isFinite(lambda) ? lambda : null, multiplierOverflow: !Number.isFinite(lambda), normalizedDual: dual,
        cost: dot(p, costs), normalizedCost: dot(p, shifted) };
    }
    const unrestricted = at(0);
    const common = { innerConverged: true, innerIterations: 0, innerBracketIterations: 0, innerStrategy: 'inactive', innerFallback: false };
    if (target == null || unrestricted.normalizedCost <= target) return { ...unrestricted, ...common };
    let gradientIterations = 0;
    if (controls.dualStrategy === 'projected-gradient') {
      // Initialize on the feasible side by doubling a trial multiplier. The
      // paper leaves dual initialization unspecified. From this side the safe
      // monotone gradient steps preserve primal feasibility, so the reported
      // objective is a genuine lower bound, not merely tolerance-feasible.
      let initialDual = 1, value = at(initialDual), bracketIterations = 1;
      while (value.normalizedCost > target && bracketIterations < 1024) {
        initialDual *= 2; value = at(initialDual); bracketIterations++;
      }
      if (value.normalizedCost > target) throw new RangeError('projected dual initialization failed to bracket budget');
      common.innerBracketIterations = bracketIterations;
      // Unit step in normalized cost coordinates: original alpha=1/range^2.
      // The normalized derivative has Lipschitz constant <=1/4, hence safe.
      while (gradientIterations < controls.maxInnerIterations) {
        const residual = value.normalizedCost - target;
        if (Math.abs(residual) <= tolerance) return { ...value, ...common, innerIterations: gradientIterations, innerStrategy: 'projected-gradient' };
        value = at(Math.max(0, value.normalizedDual + residual));
        gradientIterations++;
      }
      if (Math.abs(value.normalizedCost - target) <= tolerance) return { ...value, ...common, innerIterations: gradientIterations, innerStrategy: 'projected-gradient' };
      if (!controls.innerFallback) return { ...value, ...common, innerConverged: false, innerIterations: gradientIterations, innerStrategy: 'projected-gradient' };
    }
    let lo = 0, hi = 1, high = at(hi), innerIterations = 1;
    while (high.normalizedCost > target && innerIterations < 1024) {
      lo = hi; hi *= 2;
      if (!Number.isFinite(hi)) throw new RangeError('cost multiplier exceeds floating-point range');
      high = at(hi); innerIterations++;
    }
    if (high.normalizedCost > target) throw new RangeError('cost multiplier failed to bracket budget');
    while (innerIterations < 1200) {
      const mid = lo + (hi - lo) / 2;
      if (mid === lo || mid === hi) break;
      const current = at(mid); innerIterations++;
      if (current.normalizedCost > target) lo = mid;
      else { hi = mid; high = current; }
      if (target - high.normalizedCost <= tolerance && hi - lo <= tolerance * Math.max(1, hi)) break;
    }
    return { ...high, ...common, innerIterations: innerIterations + gradientIterations, innerStrategy: 'bisection', innerFallback: gradientIterations > 0 };
  }
  // Supporting-hyperplane bound for the concave objective. Minimizing its
  // one-cost dual is a finite envelope problem; check zero and line crossings.
  // This is a certificate only: it never replaces a BA distribution update.
  function certificate(m, state, c, mu, current, support, budget) {
    const a = support.map(x => state.divergences[x] - mu * c[x]);
    const b = support.map(x => m.costs[x]);
    if (!a.every(Number.isFinite)) return { upperNats: null, gapNats: null, certificateLambda: null, certificateLambdaNormalized: null, reason: 'missing_output_support' };
    const minimum = Math.min(...b), range = Math.max(...b) - minimum;
    let normalizedLambda = 0, upper = Math.max(...a);
    if (budget != null && range > 0) {
      const scaled = b.map(v => (v - minimum) / range), target = (budget - minimum) / range;
      const evaluate = l => Math.max(...a.map((v, i) => v + l * (target - scaled[i])));
      upper = evaluate(0);
      for (let i = 0; i < a.length; i++) for (let j = 0; j < i; j++) {
        if (scaled[i] === scaled[j]) continue;
        const candidate = (a[i] - a[j]) / (scaled[i] - scaled[j]);
        if (candidate >= 0 && Number.isFinite(candidate)) {
          const bound = evaluate(candidate);
          if (bound < upper) { upper = bound; normalizedLambda = candidate; }
        }
      }
    }
    const lambda = range > 0 ? normalizedLambda / range : 0;
    const rawGapNats = upper - current.objectiveNats;
    const roundoffTolerance = 1e-12 * Math.max(1, Math.abs(upper), Math.abs(current.objectiveNats));
    return { upperNats: upper, gapNats: Math.max(0, rawGapNats), rawGapNats, roundoffTolerance,
      certificateLambda: Number.isFinite(lambda) ? lambda : null, certificateLambdaNormalized: normalizedLambda,
      multiplierOverflow: !Number.isFinite(lambda), reason: null };
  }

  function solve(input, options = {}) {
    const m = modelOf(input), c = bayesRisk(m).costs, nx = m.dimensions.inputs;
    const mu = nonnegative(options.mu == null ? 0 : options.mu, 'mu');
    const tolerance = nonnegative(options.tolerance == null ? 1e-9 : options.tolerance, 'tolerance');
    const costTolerance = nonnegative(options.costTolerance == null ? 1e-12 : options.costTolerance, 'costTolerance');
    const maxIterations = options.maxIterations == null ? 2000 : options.maxIterations;
    if (!Number.isInteger(maxIterations) || maxIterations < 0 || maxIterations > 1000000) throw new RangeError('maxIterations must be an integer in [0,1000000]');
    if (tolerance === 0 || costTolerance === 0) throw new RangeError('tolerances must be positive');
    const minimum = Math.min(...m.costs), range = Math.max(...m.costs) - minimum, budget = m.budget;
    const scaledCosts = m.costs.map(v => range > 0 ? (v - minimum) / range : 0);
    const scaledBudget = budget == null || range === 0 ? null : (budget - minimum) / range;
    const controls = { dualStrategy: options.dualStrategy == null ? 'bisection' : options.dualStrategy,
      maxInnerIterations: options.maxInnerIterations == null ? 10000 : options.maxInnerIterations, innerFallback: options.innerFallback !== false };
    if (!['bisection', 'projected-gradient'].includes(controls.dualStrategy)) throw new RangeError('dualStrategy must be bisection or projected-gradient');
    if (!Number.isInteger(controls.maxInnerIterations) || controls.maxInnerIterations < 1 || controls.maxInnerIterations > 1000000) throw new RangeError('maxInnerIterations must be in [1,1000000]');
    if (!c.every(v => Number.isFinite(mu * v))) throw new RangeError('mu times Bayes risk exceeds floating-point range');
    const settings = { mu, tolerance, costTolerance, costToleranceUnit: 'fraction of input-cost range', maxIterations, ...controls, projectedDualStepNormalized: 1, projectedDualInitialization: 'feasible-side doubling bracket', initialP: options.initialP == null ? null : options.initialP.slice(), logarithm: 'natural', rateUnit: 'bits/channel use' };
    if (budget != null && budget < minimum) return { version: VERSION, status: 'infeasible_cost', converged: false, feasible: false,
      reason: 'budget is below the minimum input cost', minimumCost: minimum, budget, p: null, rateBits: null, rateNats: null,
      distortion: null, cost: null, objectiveNats: null, lambda: null, gapNats: null, iterations: 0, trace: [], settings };
    const boundary = budget != null && budget === minimum;
    const support = Array.from({ length: nx }, (_, x) => x).filter(x => !boundary || m.costs[x] === minimum);
    const supplied = options.initialP == null ? Array(nx).fill(1 / nx) : probability(options.initialP, nx, 'initialP');
    for (const x of support) if (supplied[x] === 0) throw new RangeError('initialP must have positive mass on every feasible input symbol');
    let logP = normalizeLogs(supplied.map((p, x) => support.includes(x) ? Math.log(p) : -Infinity));
    const trace = [];
    let last = null, status = 'max_iterations';
    const supportSet = new Set(support);
    for (let iteration = 0; iteration <= maxIterations; iteration++) {
      const p = logP.map(Math.exp), state = channelState(m, logP, false);
      const current = directMetrics(m, p, c, mu, state);
      const bound = certificate(m, state, c, mu, current, support, boundary ? null : budget);
      const costResidualNormalized = scaledBudget == null ? 0 : dot(p, scaledCosts) - scaledBudget;
      const feasible = budget == null || (range === 0 ? minimum <= budget : costResidualNormalized <= costTolerance);
      const numericalFailure = feasible && bound.rawGapNats < -bound.roundoffTolerance;
      if (!feasible || numericalFailure) bound.gapNats = null;
      const previous = trace.length ? trace[trace.length - 1] : null;
      const record = { iteration, p, logP: logP.map(v => Number.isFinite(v) ? v : null), ...current, lambda: boundary ? null : bound.certificateLambda,
        updateLambda: last ? last.lambda : null, updateLambdaNormalized: last ? last.normalizedDual : null, ...bound, lowerNats: feasible ? current.objectiveNats : null, feasible, costResidualNormalized,
        complementarityResidual: budget == null || boundary ? 0 : Math.abs(bound.certificateLambdaNormalized * costResidualNormalized), costResidual: budget == null ? null : current.cost - budget,
        deltaL1: previous ? sum(p.map((v, x) => Math.abs(v - previous.p[x]))) : null,
        objectiveChange: previous ? current.objectiveNats - previous.objectiveNats : null,
        innerIterations: last ? last.innerIterations : 0, innerBracketIterations: last ? last.innerBracketIterations : 0, innerStrategy: last ? last.innerStrategy : null,
        innerFallback: last ? last.innerFallback : false, innerConverged: last ? last.innerConverged : null };
      trace.push(record);
      if (feasible && bound.gapNats != null && bound.gapNats <= tolerance) { status = 'converged'; break; }
      if (numericalFailure) { status = 'numerical_failure'; break; }
      if (last && !last.innerConverged) { status = 'inner_not_converged'; break; }
      if (iteration === maxIterations) break;
      // E_s,y log Q(x|y,s) = log P(x) + D(W_x || W_P), Eq. (22).
      // The algebraic form avoids underflow in Q before taking its logarithm.
      const base = logP.map((v, x) => supportSet.has(x) ? v + state.divergences[x] - mu * c[x] : -Infinity);
      last = costUpdate(base, m.costs, boundary ? null : budget, costTolerance, controls);
      logP = last.logP;
    }
    const final = trace[trace.length - 1];
    return { version: VERSION, status, converged: status === 'converged', feasible: final.feasible,
      ...final, reason: status === 'converged' ? null : status === 'inner_not_converged' ? 'projected dual reached its iteration limit' : status === 'numerical_failure' ? 'upper bound is materially below the feasible objective' : 'iteration limit reached before the objective-gap tolerance', iterations: final.iteration, bayesCosts: c, support, exactCostBoundary: boundary,
      initializationProjected: false, initialSupportReduced: boundary, budget, trace, settings };
  }
  function binaryEntropy(p) {
    finite(p, 'p'); if (p < 0 || p > 1) throw new RangeError('p must be in [0,1]');
    return p === 0 || p === 1 ? 0 : (-p * Math.log(p) - (1 - p) * Math.log1p(-p)) / LN2;
  }
  function binaryModel(options = {}) {
    const q = options.q == null ? .4 : options.q, noise = options.noise == null ? 0 : options.noise;
    for (const [name, value] of [['q', q], ['noise', noise]]) {
      finite(value, name); if (value < 0 || value > 1) throw new RangeError(name + ' must be in [0,1]');
    }
    // Y = SX xor N, N~Bern(noise), Z=Y. noise=0 is the paper's Fig. 2.
    const wy = [[[1 - noise, noise], [1 - noise, noise]], [[1 - noise, noise], [noise, 1 - noise]]];
    return createModel({ ps: [1 - q, q], wy, vz: wy, loss: [[0, 1], [1, 0]],
      costs: options.costs == null ? [0, 0] : options.costs, budget: options.budget });
  }
  function binaryOracle(options = {}) {
    const q = options.q == null ? .4 : options.q, mu = nonnegative(options.mu == null ? 0 : options.mu, 'mu');
    finite(q, 'q'); if (q < 0 || q > 1) throw new RangeError('q must be in [0,1]');
    const risk = Math.min(q, 1 - q);
    let p0 = q === 0 ? .5 : 1 / (1 + Math.exp(mu * risk / q));
    const status = q === 0 ? 'optimal_nonunique' : 'optimal';
    if (options.distortionBudget != null) {
      const d = finite(options.distortionBudget, 'distortionBudget');
      if (d < 0) return { status: 'infeasible_distortion', p: null, rateBits: null, distortion: null };
      // Capacity under a distortion budget, separate from the penalized oracle.
      p0 = risk === 0 ? .5 : Math.min(.5, d / risk);
    }
    return { status, p: [p0, 1 - p0], rateBits: q * binaryEntropy(p0), distortion: risk * p0,
      objectiveNats: q * binaryEntropy(p0) * LN2 - mu * risk * p0, bayesCosts: [risk, 0] };
  }
  const api = Object.freeze({ VERSION, NORMALIZATION_TOLERANCE, createModel, bayesRisk, posterior, metrics, solve, binaryModel, binaryOracle, binaryEntropy });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CapacityDistortion = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
