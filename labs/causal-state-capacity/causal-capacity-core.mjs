/** Fixed causal-state Proposition 4 evaluator. No finite communication code. */
export const SCHEMA_VERSION = '1.0.0';
export const IMPLEMENTATION_VERSION = '1.0.0';
export const MODULE_ID = 'causal-binary-state-cancellation-fixed-quarter';
export const PAPER_ID = 'tradeoffs-causal-state-communication-2013';
export const NUMERICAL_TOLERANCE = 1e-12;
export const THRESHOLD_BRACKET = Object.freeze([0.1551404838969245, 0.1551404838969247]);
export const THRESHOLD_BRACKET_DECIMAL = Object.freeze(['0.1551404838969245', '0.1551404838969247']);
const P = 0.25;
const Q = 0.25;
const VARIABLES = Object.freeze(['U', 'E', 'V', 'Z', 'S', 'X', 'Y', 'Shat']);

export function binaryEntropy(x) {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 1) {
    throw new TypeError('Entropy requires a finite numeric probability in [0,1].');
  }
  return x === 0 || x === 1 ? 0 : -x * Math.log2(x) - (1 - x) * Math.log2(1 - x);
}

function validateBudget(D, count = 1) {
  if (count !== 1 || typeof D !== 'number' || !Number.isFinite(D)) {
    throw new TypeError('Supply exactly one finite numeric D; p and q overrides are unsupported.');
  }
  if (D < 0 || D > 0.5) throw new RangeError('D must be in [0,0.5].');
}

function freezeTree(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
  return value;
}

function bernoulli(bit, probability) { return bit ? probability : 1 - probability; }

function enumerateAtoms(d) {
  const r = (Q - d) / (1 - 2 * d);
  const atoms = [];
  for (let U = 0; U < 2; U++) for (let E = 0; E < 2; E++) {
    for (let V = 0; V < 2; V++) for (let Z = 0; Z < 2; Z++) {
      const S = U ^ E;
      const X = V ^ S;
      const Y = X ^ S ^ Z;
      atoms.push({ U, E, V, Z, S, X, Y, Shat: U,
        probability: bernoulli(U, r) * bernoulli(E, d) * 0.5 * bernoulli(Z, P) });
    }
  }
  return atoms;
}

function key(atom, variables) { return variables.map(name => atom[name]).join(''); }

function marginalMap(atoms, variables) {
  const result = new Map();
  for (let i = 0; i < 2 ** variables.length; i++) {
    result.set(i.toString(2).padStart(variables.length, '0'), 0);
  }
  for (const atom of atoms) {
    const k = key(atom, variables);
    result.set(k, (result.get(k) ?? 0) + atom.probability);
  }
  return result;
}

function marginalRows(atoms, variables) {
  return { variables, outcomes: [...marginalMap(atoms, variables)].map(([outcome, probability]) => ({
    values: [...outcome].map(Number), probability,
  })) };
}

// Direct log-ratio sum, rather than the closed-form binary entropy expression.
function mutualInformation(atoms, left, right) {
  const joint = marginalMap(atoms, [...left, ...right]);
  const a = marginalMap(atoms, left);
  const b = marginalMap(atoms, right);
  let total = 0;
  for (const [outcome, probability] of joint) {
    if (probability === 0) continue;
    total += probability * Math.log2(probability /
      (a.get(outcome.slice(0, left.length)) * b.get(outcome.slice(left.length))));
  }
  return total;
}

function conditionalEntropy(atoms, target, given) {
  const joint = marginalMap(atoms, [...given, ...target]);
  const base = marginalMap(atoms, given);
  let total = 0;
  for (const [outcome, probability] of joint) if (probability !== 0) {
    total -= probability * Math.log2(probability / base.get(outcome.slice(0, given.length)));
  }
  return total;
}

function independenceResidual(atoms, left, right) {
  const joint = marginalMap(atoms, [...left, ...right]);
  const a = marginalMap(atoms, left);
  const b = marginalMap(atoms, right);
  return Math.max(...[...joint].map(([outcome, probability]) => Math.abs(probability -
    a.get(outcome.slice(0, left.length)) * b.get(outcome.slice(left.length)))));
}

function probabilityOfOne(atoms, variable) {
  return atoms.reduce((sum, atom) => sum + (atom[variable] === 1 ? atom.probability : 0), 0);
}

function metricsFromAtoms(atoms) {
  const informationUVY = mutualInformation(atoms, ['U', 'V'], ['Y']);
  const informationUVS = mutualInformation(atoms, ['U', 'V'], ['S']);
  return {
    informationUVY, informationUVS,
    informationUS: mutualInformation(atoms, ['U'], ['S']),
    pmfObjective: informationUVY - informationUVS,
    actualDistortion: atoms.reduce((sum, atom) => sum +
      (atom.S !== atom.Shat ? atom.probability : 0), 0),
    conditionalEntropySGivenU: conditionalEntropy(atoms, ['S'], ['U']),
  };
}

function classify(D) {
  if (D >= Q) return 'plateau';
  if (D < THRESHOLD_BRACKET[0]) return 'infeasible';
  if (D <= THRESHOLD_BRACKET[1]) return 'boundary_within_numerical_resolution';
  return 'feasible';
}

function diagnostics(atoms, d, formula, metrics) {
  const normalization = Math.abs(atoms.reduce((sum, atom) => sum + atom.probability, 0) - 1);
  const r = (Q - d) / (1 - 2 * d);
  const expectedMarginals = { U: r, E: d, V: 0.5, Z: P, S: Q, X: 0.5, Y: 0.5, Shat: r };
  const marginalResiduals = Object.fromEntries(VARIABLES.map(name =>
    [name, Math.abs(probabilityOfOne(atoms, name) - expectedMarginals[name])]));
  const independenceResiduals = {
    E_independent_U: independenceResidual(atoms, ['E'], ['U']),
    V_independent_UEZ: independenceResidual(atoms, ['V'], ['U', 'E', 'Z']),
    Z_independent_UEV: independenceResidual(atoms, ['Z'], ['U', 'E', 'V']),
    S_independent_Z: independenceResidual(atoms, ['S'], ['Z']),
    S_independent_V: independenceResidual(atoms, ['S'], ['V']),
  };
  const mappings = {
    S_equals_U_xor_E: atom => atom.S === (atom.U ^ atom.E),
    X_equals_V_xor_S: atom => atom.X === (atom.V ^ atom.S),
    Y_equals_X_xor_S_xor_Z: atom => atom.Y === (atom.X ^ atom.S ^ atom.Z),
    Y_equals_V_xor_Z: atom => atom.Y === (atom.V ^ atom.Z),
    Shat_equals_U: atom => atom.Shat === atom.U,
  };
  const deterministicMappingViolationCounts = Object.fromEntries(Object.entries(mappings)
    .map(([name, predicate]) => [name, atoms.filter(atom => !predicate(atom)).length]));
  const deterministicMappingResiduals = Object.fromEntries(Object.entries(mappings)
    .map(([name, predicate]) => [name, atoms.reduce((sum, atom) => sum +
      (!predicate(atom) ? atom.probability : 0), 0)]));
  let factorizationResidual = 0;
  for (const atom of atoms) factorizationResidual = Math.max(factorizationResidual, Math.abs(
    atom.probability - bernoulli(atom.U, r) * bernoulli(atom.E, d) * 0.5 * bernoulli(atom.Z, P)));
  const identities = {
    objectiveIdentity: Math.abs(metrics.pmfObjective - formula.rawInformationBalance),
    sourceCostIdentity: Math.abs(metrics.informationUS - formula.stateDescriptionCost),
    descriptionCostUVS: Math.abs(metrics.informationUVS - formula.stateDescriptionCost),
    channelCapacityIdentity: Math.abs(metrics.informationUVY - formula.unconstrainedCapacity),
    conditionalEntropyIdentity: Math.abs(metrics.conditionalEntropySGivenU - binaryEntropy(d)),
    distortionIdentity: Math.abs(metrics.actualDistortion - d),
  };
  const residuals = [normalization, factorizationResidual, ...Object.values(marginalResiduals),
    ...Object.values(independenceResiduals), ...Object.values(deterministicMappingResiduals), ...Object.values(identities)];
  const passed = atoms.length === 16 && atoms.every(atom => Number.isFinite(atom.probability) && atom.probability >= 0) &&
    Object.values(deterministicMappingViolationCounts).every(count => count === 0) &&
    residuals.every(value => Number.isFinite(value) && value <= NUMERICAL_TOLERANCE);
  return { passed, tolerance: NUMERICAL_TOLERANCE, normalizationResidual: normalization,
    minAtomProbability: Math.min(...atoms.map(atom => atom.probability)),
    expectedMarginals, marginalResiduals, independenceResiduals, factorizationResidual,
    deterministicMappingViolationCounts, deterministicMappingResiduals, ...identities,
    maximumRequiredResidual: Math.max(...residuals),
    diagnosticOnly: {
      E_S_independenceResidual: independenceResidual(atoms, ['E'], ['S']),
      X_S_independenceResidual: independenceResidual(atoms, ['X'], ['S']),
      note: 'E is independent of U, not generally S. X-S marginal independence does not remove current-state access in X=V xor S.',
    },
  };
}

export function evaluateCausalCapacity(D) {
  validateBudget(D, arguments.length);
  const d = Math.min(D, Q);
  const formula = {
    expression: '1-h(1/4)-h(1/4)+h(min(D,1/4))',
    unconstrainedCapacity: 1 - binaryEntropy(P),
    stateDescriptionCost: binaryEntropy(Q) - binaryEntropy(d),
  };
  formula.rawInformationBalance = formula.unconstrainedCapacity - formula.stateDescriptionCost;
  const atoms = enumerateAtoms(d);
  const metrics = metricsFromAtoms(atoms);
  const status = classify(D);
  const result = {
    schemaVersion: SCHEMA_VERSION, implementationVersion: IMPLEMENTATION_VERSION,
    implementationCommit: null, moduleId: MODULE_ID, paperId: PAPER_ID,
    source: {
      title: 'Causal State Communication', authors: ['Chiranjib Choudhuri', 'Young-Han Kim', 'Urbashi Mitra'],
      url: 'https://web.eng.ucsd.edu/~yhk/pdfs/it2013jun.pdf', doi: '10.1109/TIT.2013.2245719',
      pages: [3715, 3716], equations: ['Theorem 3, Eq. (11)', 'Proposition 4'],
      retainedSourceSha256: '43bbfbd4f841f79d4900531f291391f937851225625a7ee7f86391f3edd1edd4',
      frozenContractSha256: '9a963b977420c22bee968f10691a481ef5dd1ab851be185aecb6f895e988a003',
      constructionNote: 'Independently verified reverse test channel; the printed forward-independent-error construction does not attain this biased-source formula.',
    },
    method: 'single-letter asymptotic theorem evaluation; not finite-code execution',
    model: {
      encoderTiming: 'causal_current_state', decoderTiming: 'delayed_block_state_reconstruction',
      channel: 'Y=X xor S xor Z', inputRule: 'X=V xor S', reconstruction: 'Shat=U',
      distortion: 'binary Hamming', informationUnits: 'bits/channel use', p: P, q: Q,
      assumptions: ['iid state', 'iid channel noise independent of state', 'no input-cost constraint', 'no feedback'],
    },
    requestedD: D, effectiveD: d,
    alphabet: { variables: VARIABLES, eachVariable: [0, 1], enumeratedAtoms: 16,
      auxiliaryCardinalities: { U: 2, V: 2 }, theoremBounds: { U: 4, V: 3 } },
    distribution: {
      direction: 'reverse_test_channel_S_given_U',
      UProbabilityOne: (Q - d) / (1 - 2 * d), EProbabilityOne: d,
      VProbabilityOne: 0.5, ZProbabilityOne: P,
      definition: 'U~Bern((q-d)/(1-2d)); E~Bern(d); V~Bern(1/2); Z~Bern(p); independent U,E,V,Z; S=U xor E; X=V xor S; Y=X xor S xor Z; Shat=U',
      independence: ['U independent E', 'V independent (U,E,Z)', 'Z independent (U,E,V)'],
      causalExplanation: 'The reverse channel specifies a joint auxiliary law, not physical source generation. Current S is used to cancel the channel state; the description U is conveyed by asymptotic delayed block coding.',
    },
    atoms,
    marginals: Object.fromEntries(VARIABLES.map(name => [name, marginalRows(atoms, [name])])),
    jointMarginals: { UVY: marginalRows(atoms, ['U', 'V', 'Y']), UVS: marginalRows(atoms, ['U', 'V', 'S']),
      US: marginalRows(atoms, ['U', 'S']), UE: marginalRows(atoms, ['U', 'E']),
      SZ: marginalRows(atoms, ['S', 'Z']), VS: marginalRows(atoms, ['V', 'S']) },
    formula, metrics,
    feasibility: {
      status,
      feasibleRate: status === 'feasible' || status === 'plateau' ? formula.rawInformationBalance : null,
      thresholdBracket: THRESHOLD_BRACKET, thresholdBracketDecimal: THRESHOLD_BRACKET_DECIMAL,
      thresholdEquation: 'h(D*)=2*h(1/4)-1',
      exactBoundaryStatement: 'At the mathematical exact threshold the asymptotic achievable rate is zero. Binary floating-point values inside the closed certified bracket are unresolved.',
      boundaryClassification: 'Closed bracket using the displayed binary64 endpoint literals; no sign clamp or tolerance-based feasibility decision.',
    },
    checks: diagnostics(atoms, d, formula, metrics),
    exclusions: ['not a Fig. 2 reproduction', 'strictly causal curve gate remains closed',
      'no finite communication code or physical sensing experiment', 'no general p/q controls'],
  };
  if (!result.checks.passed) throw new Error('Internal PMF consistency checks failed; no result is accepted.');
  return freezeTree(result);
}

/** JSON includes the full PMF and diagnostics, without nondeterministic timestamps. */
export function exportCausalCapacityJSON(D) {
  validateBudget(D, arguments.length);
  return JSON.stringify(evaluateCausalCapacity(D), null, 2) + '\n';
}
