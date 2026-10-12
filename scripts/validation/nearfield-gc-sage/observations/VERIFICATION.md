# Verification: reduced GC-SAGE observation/evaluation module

Date: 12 October 2026. Runtime version: `reduced-gc-sage-observations/1.0.0`. Generator: `mulberry32-midpoint-box-muller/1`. Geometry: `reduced-gc-sage-2d/0.2.0-all-channel-region`.

## Result and scope

All numerical gates below passed on the final recorded source. This is Node v24.19.0 and Python/NumPy/SciPy verification of the synthetic observation/evaluation module and its integration with the sibling inverse core. It is **not** actual-browser latency/interaction QA, field-data validation, full-paper replication, or a guarantee of recovered geometry. The UI worker's separate browser gate is still required before release. No existing repository, core, or other shared package was edited here.

- 24 Node tests passed, zero failed/skipped
- All 160 offered acquisition combinations generated finite full-size data and passed the inverse initializer's declared-model/alias validation
- Independent Python reconstruction covered those 160 combinations at seeds 0, 260501162, and 4294967295: **480 cases passed**
- 11 shared-observation/shared-fit evaluation cases matched the unmodified Python evaluator: **171 numeric comparisons**, maximum absolute difference **5.68434e−13**, maximum scaled difference **9.60502e−15**
- **1296 padded assignment cases** matched SciPy 1.17 exactly, including dummy nodes, absence, duplicate delays, exact 0.5 ns ties and realistic second-unit floating-point boundaries
- Final-source exhaustive acquisition/budget integration: **160 configurations × 2 budgets × 2 methods = 640 actual fits**. No thrown/invalid result, mismatched observation digest, or objective-monotonicity failure occurred
- The pure UMD runtime also ran in a fresh browser-like VM without CommonJS imports or ambient random state; this verifies module loading, not a real browser or UI

## Final source identity

| Source | SHA-256 |
| --- | --- |
| `nearfield-gc-sage-observations.js` | `598f7eeb3c7a02a6a3b95c198a9c48d9b88f6f276eab422a6fb8d406600b496d` |
| Sibling `gc-sage.js` used in final integration sweep | `fe96407e6a09c71aa141d75fecaf26d23e15bbc1514f30ed121262dbdfc3ceda` |
| Reference `experiments.py` | `77f461f96605cc5bffa405cb9643e4794a9aa60c7140e0bde2d04f0d309efc90` |
| Reference `gc_sage.py` | `73bb37a4b5c764d09a3f9231fd4e5acb51063e458e9dd4d661f42d3f303edeb0` |

The inverse core source includes its separately developed optional history support; this package never edits it. Both source hashes are captured at the beginning of the integration run. No runtime reads of fixture/expected-output files occur.

## Generator and geometry oracle

`oracle-generator.py` independently implements the documented uint32/Box–Muller arithmetic in Python and calls the unmodified reference simulator for geometry, support, clean channel, and noise calibration. It does not compare JS noise against NumPy PCG64 at equal seeds. Across 480 full-size cases, maximum differences were:

| Quantity | Maximum absolute error |
| --- | ---: |
| Clean complex sample | 7.42107e−15 |
| Geometry delay, seconds | 1.65436e−24 |
| Bounce coordinate, metres | 0 |
| Complex noise sample using the documented common generator | 5.79474e−15 |
| Noise variance | 3.10862e−15 |
| Standard normal draw | 8.88178e−16 |

All support arrays and reference indices matched exactly. The first three aperture controls give 48/48 finite-segment support; the default long aperture gives 32/48. Reference-blind support is always first nine receivers, with index23 still blind. Normal/reference-blind noise arrays are exactly equal at a fixed acquisition/seed. A 10 dB nominal SNR increase divides variance by ten and noise amplitude by sqrt(10), without changing standardized draws.

`fixtures/analytical-noiseless.json` is a second, independently derived scalar-math/cmath three-receiver/five-tone fixture. Correct known states give exactly zero observed SSE, clean error, point error, visible-reflection RMS, normal error and line-offset error. It is outside the runtime and is never replayed as a live fit.

## Evaluation oracle and deliberate presentation differences

The 11 evaluation cases include scattering and hybrid actual fit inputs for default, reference-blind, absent-path, narrowband and noiseless reference scenes, plus an explicitly unlocalized state. The Python oracle evaluates the **identical observations, truth and JavaScript state/prediction arrays**, isolating evaluator arithmetic from solver differences.

Reference calculations match within the reported tolerance. Deliberate, tested presentation/edge changes are:

1. Scattering-only mechanism score is null/inapplicable rather than scoring its unavailable reflector label as a detection failure
2. All undefined/unmatched geometry is represented as null, with reasons
3. Gain-power support threshold is opt-in, uses simulator-known noise and is labeled a display heuristic; continuous gain power remains available
4. A truly singular conditional design has null infinite condition number with a reason; zero-energy normalized metrics are likewise null
5. Perpendicular-normal line-offset uses the original estimated unit normal inside an absolute dot product. This fixes the reference evaluator's `sign(0)` alignment collapse, which spuriously reports zero distance. A separate exact perpendicular fixture checks a 1 m distance and 90-degree normal angle

Observed SSE and truth-only clean NMSE are recomputed separately. Association excludes labels, uses the full padded assignment and does not forcibly match an absent path. The exact 0.5 ns threshold is not equivalent to a greedy inclusive pair gate: tied dummy assignments can remain unmatched. Visible-interaction RMS does not score unobserved bounces or pretend to recover physical reflector endpoints.

## Full offered-regime integration, including adverse outcomes

For each configuration, the simulator produced Y once. Both numerical budgets shared the same Y; each budget produced one data-derived initializer shared by scattering and hybrid fits. Reference budget is the core default (256 angles, 12 sweeps); reduced budget uses 128 angles, 6 sweeps. All other options remain the same per family. The complete record retains every run, label, association, actual budget/stopping state and operation count.

The following counts are descriptive for **one fixed browser-generator seed 260501162 over a heterogeneous control grid**, not statistical accuracy estimates or browser timings:

| Scene/budget | Runs per method | Scattering converged | Hybrid converged | Runs with unmatched estimates, each method | Hybrid all-label matches |
| --- | ---: | ---: | ---: | ---: | ---: |
| Normal/reference | 80 | 67 | 60 | 32 | 29 |
| Normal/reduced | 80 | 53 | 45 | 32 | 29 |
| Reference-blind/reference | 80 | 80 | 80 | 80 | 0 |
| Reference-blind/reduced | 80 | 80 | 80 | 80 | 0 |

Sweep-budget termination is preserved, not mislabeled convergence. Convergence with unmatched estimates in every tested reference-blind configuration illustrates that a stationary training objective does not repair a reference-missed path. Short aperture/narrowband inaccuracies are retained, not retried until favorable. No claim is made that these outcomes hold for all seeds or physical environments.

The full final-source sweep took approximately 113.46 seconds in this Node environment. It is aggregate verification time across 640 fits, **not** browser/user-device latency or a real-time performance claim.

### Fresh default, for reproducibility only

The browser generator's default observation digest is `45022c1d55ce93d7626aa47881fa66dbc2328883c03cc4d5aa0368794b003788`. It intentionally differs from the NumPy PCG64 default digest. A fresh reference-budget fit gives:

| Metric | Scattering-only | Hybrid |
| --- | ---: | ---: |
| Observed SSE | 158.1824937173 | 155.0922726406 |
| Clean NMSE, dB | −26.8148255474 | −28.8053750528 |
| Point error, m | 0.00139528333 | 0.00184508675 |
| Visible-reflection interaction RMS, m | 0.1539837589 | 0.0266859298 |
| Sweeps | 5 | 4 |
| Converged | true | true |

The hybrid's point error is slightly worse here despite lower SSE and better overall channel/reflection metrics. This is retained; the lesson must not imply every metric improves. These documentation numbers are not imported into the runtime. Any fallback demonstration must be separately generated from current source and labeled saved data.

## Evidence and reproduction

- `node --test test-observations.cjs` → `results/node-tests.tap`
- `python oracle-reference.py` → offline JSON fixtures and `results/oracle-comparison.json`
- `python oracle-generator.py` → `results/generator-comparison.json`
- `node verify-regimes.cjs` → `results/regime-comparison.json`

The Node tests additionally cover seed change/repeatability, nonmutation, resource/SNR formulas, truth API isolation, absent/unlocalized paths, matched-delay complex normalization/global display scale, alias refusal, invalid bounds, zero-energy/singular nulls, and finite-input arithmetic overflow refusal. Runtime packaging, worker lifecycle, actual browser controls/replay/cancellation, keyboard/reduced-motion and publication are intentionally outside this package's gate.
