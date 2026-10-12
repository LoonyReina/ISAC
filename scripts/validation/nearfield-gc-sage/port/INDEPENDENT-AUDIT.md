# Independent numerical audit of the reduced GC-SAGE JavaScript core

12 October 2026

## Decision

**PASS for the explicitly declared reduced inverse-estimation core.** The final JavaScript source agrees with an independently maintained Python reference across 55 fresh observation cases (110 fits), including every retained failure case, and six additional complex least-squares stress cases. No unresolved numerical blocker was found for this contract. This is not a browser/UI acceptance test or reproduction of the complete paper experiments.

Frozen algorithm contract: `reduced-gc-sage-2d/0.2.0-all-channel-region`.

| File | Tested SHA-256 |
|---|---|
| `gc-sage.js` | `6baeea9ea710162ba91ad8919c33c6b0a5d8f6cf664b8bd2f3ac2442a68fcc68` |
| sibling `nearfield-gc-sage-reference/gc_sage.py` | `73bb37a4b5c764d09a3f9231fd4e5acb51063e458e9dd4d661f42d3f303edeb0` |

The independent harness checks that the JavaScript source hash does not change during its run. The owner’s final eight-case comparison also records these same source hashes.

## Independent evidence

`independent-audit.py` generates fresh noisy observations using the separate Python simulator and passes only the observations, acquisition/model priors, and common numerical options to the actual JavaScript core through `independent-runner.js`. No expected parameter values, truth geometry, mechanism labels, or visibility masks are supplied to the estimator. Each language independently initializes the same observation matrix. All cases and failures are retained in `independent/fresh-comparison.json`.

Coverage:

- 40 cases: seeds 0–9 at each of 5, 10, 15, and 20 dB nominal SNR
- 10 cases: seeds 0–9 with the physical aperture reduced to 5 cm
- Default, noiseless, 20 MHz bandwidth, reference-blind reflection, and absent-second-path cases
- Both scattering-only and hybrid estimators on every case, 110 fits total
- Six independent arbitrary complex joint-LS fixtures: dense two-column, dense five-column, complex duplicate column, zero column, near-dependence at 1e-8, and all-zero design

All 55 cases pass. Final mechanism labels, convergence flags, stopping reasons, trace lengths, observation hashes, and candidate/compute ledgers match exactly. States, gains, per-channel delays, geometry, predictions, final SSE, and full SSE traces meet the declared numerical tolerances.

| Quantity | Maximum observed difference |
|---|---:|
| Initialized reference delay | 5.6632807954e-7 ns |
| Final SSE, absolute | 3.5648275571e-5 |
| Complex predicted sample, absolute magnitude | 7.7881524614e-7 |
| Global SSE trace, absolute | 1.8961335013e-4 |

The near-dependent complex-LS case has relative gain error 1.12585334e-8 and relative prediction error 1.19216184e-8 against NumPy’s SVD least-squares result. The other five LS cases have errors below 8.4e-16 or exactly zero. All six ranks agree.

Tolerances were fixed in the harness: 2e-5 for reference delays in ns and compared state/prediction quantities; SSE 2e-4 + 2e-8 relative. These are comparison tolerances, not an accuracy claim against physical truth.

Additional final-source evidence inspected:

- Owner’s 52/52 focused Node tests, including finite-input/provenance/alias/region/serialization guards
- Owner’s eight fresh full-array Python/JavaScript comparisons, including every trace decision and subproblem SSE
- Train-only held-out-frequency check: fit 48 tones, predict 16 unseen tones without refitting gains or geometry. Cross-language held-out SSE differences are 2.8484e-9 for scattering and 2.4658e-9 for hybrid
- Corrected Python package: 38/38 tests also pass from an independently extracted ZIP

The six arbitrary LS cases and 55-case fresh comparison are reviewer-run evidence. The 52-test suite and eight-case held-out comparison were run by the port owner; their final source hashes and retained result files were inspected.

## Actual inverse problem and fairness

The code solves for unknown reference delays from the observations, then iterates path-residual reconstruction, constrained spatial searches, complex gain least squares, and accepted state updates. The hybrid compares scattering, reflection, and incumbent candidates. It does not substitute truth labels or forward-render known geometry as an estimator.

The scattering baseline already estimates an independent complex gain for each path and receive channel. Therefore it already handles partial visibility; the hybrid is not being compared against an artificially all-visible baseline. Both methods use identical noisy observations, data-derived initialization, known path count, gain model, scattering search schedule, stopping criteria, and incumbent acceptance. Hybrid additionally evaluates reflection candidates and is charged for them. This is **shared base budget with explicit additional hybrid work**, not an equal-total-FLOP comparison.

The default fit evaluates 1,188 scattering candidates for each method; hybrid adds 1,108 valid reflection candidates. The ledger counts candidate-tone projections, joint gain refits, and related stages, rather than pretending to measure every FLOP. Timings in the 110 independent fits ranged from 0.111 to 0.645 seconds for the numerical fit in Node on this environment. These exclude initialization/process overhead and are not a browser latency guarantee.

Read-only inspection checked the residual cancellation, complex profiling, unit-normal mirrored-transmitter construction, ray segment intersection, per-channel path length, common-plane consistency, and one-sided complex Jacobi-SVD LS. The latter solves through singular vectors rather than forming normal equations and returns a minimum-norm solution in the tested deficient cases.

A private runtime-issued initializer is kept separately from its public representation. Direct checks confirmed that mutating public initial delays/gains does not change the seed, fabricated/deserialized initializers are rejected, changed observations cannot reuse a stale initializer, and unexpected truth-bearing model fields are rejected. This is an API provenance guard; it is not a claim that arbitrary malicious caller code can be prevented from constructing truth-informed observations or priors.

## Regional-constraint correction and source interpretation

Primary source: [arXiv 2605.01162v1](https://arxiv.org/pdf/2605.01162v1), Eqs. 19, 21, and 23b; derivations and apparent formula ambiguities are documented in the sibling technical audit.

Independent review found that the initial implementation constrained only the reference interaction point to the declared region. A concrete default-model candidate at 40 ns and angle `112*2π/1024` has reference point approximately `(6.49978760945, 3.76394132985)` inside the box but another channel’s bounce at `(6.50779247479, 3.75428939480)`, outside the x ≤ 6.5 m bound.

The source defines bounded plane/line sets with interaction points in the region and then constructs channel-specific intersections. The approved conservative contract now requires **every modeled channel’s bounce** to remain inside the region, with 1e-10 m tolerance. This includes channels whose estimated gain is tiny or zero. Whether the intended source feasible set exempts physically invisible channels is not fully explicit; no such exemption is assumed here. A plane continuing beyond the search region is not physically impossible. The correction is a stronger source-grounded bounded-region prior, not a universal law of reflection.

Both independent implementations were corrected and all evidence rerun. The default optimum and SNR-seed outcomes remain unchanged, while the 20 MHz adverse case changes: the hybrid now reaches the same final fit as scattering. The previous reference-only-region core/results are preserved under `superseded/reference-point-region-v1/` and the sibling Python superseded package. Old 1,128-reflection-candidate evidence is not attributed to this version.

Another reviewer-found issue was serialization of nonfinite typed-array elements into JSON nulls. The final code recursively checks typed arrays, throws for unexpected NaN/Infinity, and passes the added nested Float32/Float64 regression. Deliberately unavailable candidates instead use explicit null costs plus availability statuses.

## Accuracy, failure cases, and what the numbers mean

The default measured-observation residual SSE is 160.563570 for scattering and 156.207002 for hybrid; both converge in four sweeps. Separately, the synthetic truth-channel NMSE is −25.8169 and −27.6281 dB. Default reflector interaction RMSE is about 0.1543 m versus 0.02923 m. These truth metrics are evaluation-only and are never used by the estimator.

At 5/10/15/20 dB, both hybrid mechanism labels are correct in 7/10, 9/10, 9/10, and 10/10 fixed-seed runs. Lower hybrid SSE and lower truth-channel NMSE occur in 9/10, 10/10, 10/10, and 10/10 runs. All 40 converge. With only 5 cm aperture, both labels are correct in 4/10 runs. The benchmark does not hide wrong point/surface labels.

The 20 MHz case has unresolved/incorrect geometry and neither truth path is successfully assigned under the declared delay association. The blind-reference case misses the reflection and reaches the sweep budget. The absent-second-path case violates the known-L=2 assumption; the extra estimate is left unmatched rather than counted as a detected physical path, and labels can be wrong. Truth association uses partial assignment by reference delay with a 0.5 ns gate and dummy unmatched nodes, never estimated mechanism labels as an oracle.

Held-out-frequency validation is one declared default case, not a population generalization result. No held-out-receiver validation is claimed: unconstrained per-receiver gains cannot be inferred at a wholly unseen receiver. Gain-design rank diagnostics are conditional on the fitted delays and do not establish geometric identifiability. Convergence means objective stabilization, not correct mapping.

## Acquisition and remaining scope limits

This is a 2-D, one-bounce, known-L=2 synthetic problem. It uses one transmitter, 48 sparse virtual receiver samples preserving a 1.49146747855 m physical aperture, 64 tones spanning 1 GHz, a known absolute delay origin and declared delay window, and frequency-flat per-path/per-channel complex gains. Receiver spacing is about 3.1755 wavelengths at 30 GHz and must be disclosed as sparse sampling rather than silently described as a half-wave array.

The declared 55 ns delay window fits within the 63 ns ambiguity period for 64 tones spanning 1 GHz. Its bound is derived from the declared region/acquisition, not centered on hidden truth. Changing to 64 tones spanning 2 GHz produces a 31.5 ns ambiguity period and is explicitly refused with the same 55 ns prior. Single-tone and unsupported/ambiguous acquisition cases are also refused. Reducing the paper’s sample count cannot silently retain its original unambiguous range.

Free channel gains absorb carrier phase; usable geometry information here comes from wideband phase slopes. Reference delays are data-estimated and then held fixed during the spatial sweeps. Reference-path visibility/separability remains an important assumption and is tested adversely.

There is no unknown path-count/AIC estimator, two-/higher-bounce estimator, diffraction model, full 3-D reconstruction, raw measured data replication, or complete Figures 5–9/Tables I–III reproduction. The source-consistency corrections and unresolved notation ambiguities are stated rather than silently advertised as exact transcription.

## Integration gate still required

The core is synchronous. An ordinary cancellation message cannot interrupt a running solve. A future UI must terminate and replace a dedicated worker, reject stale run IDs, apply bounded resource limits, and display actual elapsed time and failure/budget states. A reviewer-run Node `worker_threads` smoke test confirmed termination of an active expensive solve before completion (`independent/cancellation-smoke.json`), but this is not a browser-worker or UI integration test. Browser rendering, responsiveness, repeated starts, stale result rejection, and real browser timing remain untested.

## Reproduction

From this directory:

```sh
node --test test-core.js
python compare-reference.py
python independent-audit.py
```

The Python reference must be present as sibling `nearfield-gc-sage-reference` with its documented NumPy/SciPy dependencies. Fresh observations, evaluator truth metrics, source hashes, full comparisons, and failed scientific outcomes are retained. No UI or capacity release files were changed by this audit.
