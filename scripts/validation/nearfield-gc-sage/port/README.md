> Repository packaging: the unchanged numerical module is `labs/near-field/nearfield-gc-sage-core.js` (published as `nearfield-gc-sage-core.js`). Fixture data is shared with `../reference/fixtures/`; Node regression entry points are `tests/nearfield-gc-sage-core.test.cjs` and `tests/nearfield-gc-sage-history.test.cjs`. The CLI runner resolves source and published layouts without a second core copy. Original numerical/historical evidence below retains its audited scope.

# Reduced one-bounce GC-SAGE JavaScript core

A dependency-free Float64 UMD/CommonJS port of the separately verified Python inverse estimator. It fits unknown geometry from observed complex samples. It is **not** a forward-model demonstration, the complete GC-SAGE algorithm, or a reproduction of the paper's Figures 5–9.

Source: [arXiv:2605.01162v1](https://arxiv.org/pdf/2605.01162v1), restricted to the one-bounce mechanism-comparison core. The sibling reference package records the source formula ambiguities, numerical choices, and scientific limits.

Algorithm contract: `reduced-gc-sage-2d/0.2.0-all-channel-region`. This version describes the bounded numerical model, not a Git revision. `initialize` and `fit` attach it to their computed results. Version the contract when a geometry, acquisition, gain, or update rule changes; do not relabel old numerical results.

## Run

```sh
node --test test-core.js test-history.js
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python compare-reference.py
node run-fixture.js fixtures/default-observations.json > result.json
```

Node tests and browser runtime have no package dependencies. The cross-language oracle driver needs the existing sibling `nearfield-gc-sage-reference` package, NumPy, and SciPy. It imports and runs that estimator without changing it, then launches a separate Node process that receives **only observations and declared priors/options**. The expected values remain outside that process. All generated files are written here, never into the reference package.

## Browser or Node API

```js
// Node: const G = require('./gc-sage.js');
// Browser/worker: importScripts('gc-sage.js'); const G = NearfieldGCSAGE;
const input = G.fromFixture(observedDataFixture);
const initial = G.initialize(input.observations, input.model, input.options);
const scattering = G.fit(input.observations, input.model, 'scattering', input.options, initial);
const hybrid = G.fit(input.observations, input.model, 'hybrid', input.options, initial);
const jsonSafe = G.serializable(hybrid);
// Optional observer-only review history:
const reviewed = G.fit(input.observations, input.model, 'hybrid',
  {...input.options, record_history: true}, initial);
```

Observations are `{real: Q-by-P matrix, imag: Q-by-P matrix}` or packed `{rows: Q, cols: P, real: Float64Array, imag: Float64Array}` in Tx-major Rx order. Input data are copied. Output predictions use the packed layout. Path gains are `{real: Float64Array(Q), imag: Float64Array(Q)}`. Positions are meters, frequencies Hz, delays seconds, and `reference_delays_ns`/`max_delay_ns` nanoseconds.

Model fields are exactly `tx`, `rx`, `frequencies`, `region`, `reference_pair`, `path_count`, and `max_delay_ns`. Numerical options have the same names/defaults as Python. The additional observer option `record_history` is Boolean and defaults to false; see `HISTORY.md` for its separately versioned schema. Unknown fields, nonfinite values, fractional/negative iteration budgets, invalid observation shapes, and unsupported acquisitions throw explicit errors. Expected-result fixtures cannot be passed through `fromFixture`.

The strict initializer handle must be the object returned by `initialize` in the **same runtime**. A private snapshot binds it to the complete observation hash and model-prior hash; forged, copied, or changed-data handles are refused. Editing its public states cannot inject a physical location. Both methods deep-copy the same private snapshot. A worker should perform initialization and both fits together; reinitialize rather than transferring or serializing this handle.

Observation SHA-256 is over explicit little-endian interleaved complex128 bytes and matches the reference. Model SHA-256 is over this port's canonical model-field JSON, so its string is intentionally not Python's implementation-specific model digest.

## What executes

- Greedy matched-filter reference-delay initialization, bounded Brent refinement, and single-channel SAGE sweeps
- Joint complex minimum-norm least squares to initialize per-channel nuisance gains
- Pathwise hidden data from current residual cancellation
- Ellipse searches for a shared scatterer and, in hybrid mode, a unit-normal common reflecting line with physical per-channel ray intersections
- Independent complex gain LS for **both** candidate families and both methods
- Objective-based mechanism choice, incumbent gain refitting, global residual recomputation, and non-worsening acceptance
- Actual delay/geometry projection ledgers, update-level SSE traces, measured numerical-phase wall time, and tolerance/budget stopping reasons

Reference delays remain fixed during spatial sweeps. A missing/unresolved reference path is not rescued with simulator truth. No mechanism or true visibility mask is supplied. Fitted gains can approach zero independently across channels. Optional power thresholding is an exposed noise heuristic only and is never used by the optimizer.

## Numerics and scope

Per-candidate gain profiling uses complex dot products divided by tone count; candidate ranking uses captured energy and final objectives use direct residual SSE. Joint initialization uses one-sided complex Jacobi SVD on design columns, avoiding normal-equation condition-number squaring. Singular values below `eps * max(P,L) * max(sigma)` are discarded, matching NumPy's default rank scale. The returned initializer includes rank and singular values. Rank diagnostics are conditional on the fixed delays, not proof of geometric identifiability.

Bounded delay refinement follows SciPy's convergence safeguards (see NOTICE for its BSD license). Geometry search, angular refinement, acceptance tolerance, and sweep stopping match the reference. JavaScript uses Float64 and direct trigonometric evaluations; no Float32 shortcut or alternative random generator is introduced.

Declared validation scope is known-L=2, one-Tx, 2-D one-bounce synthetic data. Generic matrix primitives are also tested separately; this does not validate full MIMO, automatic model order, 3-D, two/high bounces, unknown timing offsets, real measured channels, or frequency-dependent gains. Free per-channel gains absorb carrier phase, so wideband slopes and their variation across the physical aperture identify geometry. Single-tone fitting and a delay bound reaching another tone-lattice alias class are refused. Supported commensurate held-out tone subsets preserve the original lattice alias.

`region` constrains the reference point and **every modeled channel bounce**, including channels whose fitted gains are later tiny or zero. The common bounce check is inclusive with a 1e-10 m coordinate tolerance; the reference-point check retains the original strict bounds. This conservative literal reading of the bounded plane/line sets in source Eqs. 19, 21, and 23b supersedes the earlier reference-point-only rule in both Python and JavaScript. A visible-channel-only reading could define a different feasible set; it is not silently assumed here. The original source/results remain under `superseded/reference-point-region-v1/`. Receiver coordinates are used exactly as supplied; the default 48 sparse virtual positions preserve the 1.49146747855 m physical aperture.

A valid search with no geometry returns an incumbent `unlocalized` state with null location, rather than invented coordinates. Missing candidate costs are `null` with `no valid candidate` status (Python uses internal +Infinity); unsearched reflection cost is `null` with `not searched`. Unexpected nonfinite metrics throw rather than silently becoming JSON null. A sweep cap is never called convergence. Low training error and objective convergence do not prove correct mapping.

## Future browser integration contract

This deliverable is a synchronous pure core. It contains **no UI or worker wrapper**, and it was not benchmarked in an actual browser. Node timings and UMD sandbox checks are not browser-latency evidence.

A future UI must run it in a dedicated Worker, terminate/replace that Worker for cancellation, and reject results with stale run IDs. A normal cancel message cannot interrupt a synchronous fit. Run initialization and the same-data pair in the same worker. Debounce edits, keep physical aperture when changing sample count, expose alias errors and unlocalized states, and display the actual trace and additional hybrid compute cost. Do not publish or claim real-time interactivity from this package alone.

## Evidence

- `test-core.js`: focused mathematical, inverse, acquisition, provenance, nonmutation, failure, and UMD tests
- `test-history.js`: bit-identical enabled/disabled fits, full-step SSE replay, snapshot isolation, rejected/retained/unlocalized states, and honest counters
- `HISTORY.md`: optional compact historical-state output schema
- `compare-reference.py`: fresh unmodified Python-versus-actual-JavaScript driver
- `run-fixture.js`: estimator process with no expected-output access
- `fixtures/default-observations.json`: observation-only common input
- `fixtures/default-expected.json`: separate original Python oracle outputs
- `fixtures/*-observations.json`: observation-only adverse/held-out regression cases
- `results/*-python.json`, `results/*-javascript.json`: complete actual traces/states/gains/predictions
- `results/cross-language-summary.json`, `results/node-tests.tap`: machine-readable comparisons and test log
- `results/compact-expected.json`: all-case scalar, trace, geometry, gain and delay expected outputs without repeated full predictions
- `PORT-REPORT.md`: short gate report and limitations
- `DELIVERY-MANIFEST.md`: compact integration file set; raw audit outputs remain locally reproducible
