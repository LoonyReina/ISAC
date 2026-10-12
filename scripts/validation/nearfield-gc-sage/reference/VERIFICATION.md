# Verification: reduced one-bounce GC-SAGE reference

Date: 12 October 2026. Scope: a first offline numerical gate for an independently implemented two-path synthetic inverse problem. **This is not a reproduction of full GC-SAGE or the paper's Figures 5–9.**

## Geometry correction and evidence version

Current algorithm: reduced-gc-sage-2d/0.2.0-all-channel-region. The prior reference-point-only implementation and its full numerical evidence are preserved separately as superseded results.

An independent source check found that Eqs. 19 and 21 define the relevant geometric point sets within V; Eq. 23 uses their intersection for every modeled channel. The corrected implementation requires every bounce point to be within the declared region, with an inclusive 1e-10 m coordinate tolerance. This is a conservative all-channel interpretation, including channels with negligible fitted gains. The paper does not explicitly resolve whether invisible channels could be exempted. It is a declared stronger prior, not a claim that an out-of-region continuation of a reflecting plane is physically impossible.

Concrete regression: at a 40 ns reference delay and angle 112×2π/1024, the previous model accepted a reference point near (6.499788,3.763941) even though another bounce was near (6.507792,3.754289), outside xmax=6.5. The corrected model rejects it without using any truth visibility or geometry. Both Python and JavaScript implement the same guard.

All fixed-seed, held-out, failure, and alias checks were rerun after this correction. The default and SNR-seed conclusions remain unchanged. In the 20 MHz case the hybrid now selects the same final fit as scattering-only; both still fail the geometric matching criterion. Cross-language agreement against the earlier model is retained only as superseded evidence.

## Gate result

- 38 deterministic numerical/API/failure tests passed; zero failures and errors
- The full verification command exited successfully
- The standalone ZIP was extracted into a clean temporary directory and all 38 tests passed there too
- All 40 nominal SNR/seed runs and all 10 small-aperture runs are retained
- Default, noiseless, held-out-tone, three failure-scenario, and alias-guard evidence are saved
- Estimator source files exactly match the SHA-256 hashes saved in results/verification-summary.json
- No browser implementation, browser timing, or field-data experiment has been tested here

Command: OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python verify.py

Environment: Python 3.12.14, NumPy 2.3.5, SciPy 1.17.0. This report records this execution; rerunning writes fresh timings and numerical evidence.

## Acquisition and prior ledger

| Item | Value / meaning |
|---|---|
| Scene | Synthetic fixed point plus finite planar reflector; both hidden from the estimator |
| Model order | Two paths, known; neither mechanism label is supplied |
| Geometric restriction | One-bounce, two-dimensional, synchronized absolute delays |
| Transceivers | One Tx at (1,0); 48 Rx positions from x=2 to x=3.49146747855 at y=0 |
| Physical aperture | 1.49146748 m |
| Physical sample spacing | 0.03173335 m, or 3.17553 wavelengths at the 30 GHz metadata carrier |
| Sampling disclosure | Sparse/decimated virtual aperture, not 48 densely spaced 0.75-wavelength elements |
| Frequencies | 64 uniformly spaced tones, centered at zero, spanning 1 GHz |
| Tone separation | 15.87301587 MHz |
| Delay alias period | 63.00000000 ns, approximately 18.8869 m total path length |
| Declared delay prior | Physical endpoint separation to 55 ns; independent of simulator true delays |
| Spatial prior | [0,6.5] × [0.05,6.5] m; transceiver positions known |
| Reference index | 23 (zero-based), inside both default paths' support |
| Complex observations | 3072 (6144 real scalar values) |
| Nuisance gains | 96 free complex path/channel gains in each estimator |
| Noise | Independent circular complex Gaussian; PCG64 seed; fixed variance based on unblocked-scene power |
| Default SNR | 15 dB nominal; 14.395 dB realized received SNR |
| Default reflection support | 32 of 48 Rx samples; mask used only by simulator and evaluation |
| Energy accounting | Normalized channel-observation model; no calibrated transmit joules or pilot power claim |

The reference two-column tone design has condition number 1.06799 in the nominal scene, computed only for evaluation. For the fitted hybrid geometry, every channel's conditional gain matrix has rank 2, minimum normalized singular value 0.95374, and worst condition number 1.09485. These are linear-gain checks conditional on geometry; they do not establish global geometric or mechanism identifiability.

The largest reference one-bounce length over the declared rectangular region is 16.028940 m (53.466788 ns), evaluated at its corners. Thus the independently declared 55 ns bound covers the entire allowed reference-geometry region in the default acquisition and remains below its 63 ns alias period. It is not a truth-centered window.

### Aliasing is an explicit guard

With 64 tones over 2 GHz, the delay period is 31.5 ns and the path-length period is 9.44346 m. The prototype refuses the unchanged 55 ns prior. It does not silently assume the same unambiguous range as the paper's denser frequency sampling. A unit fixture confirms that two delays differing by one tone-grid period are identical up to a fitted complex scalar. Supported held-out-tone subsets retain the original tone lattice's alias period.

## Actual inverse updates

Both estimators receive precisely the same complex observation array and data-derived initializer. Their per-channel complex gains and partial-visibility treatment are the same. No true delay, point, surface, normal, mechanism label, or visibility mask enters the estimator API.

The initialized delays are 10.00819061 ns and 14.56166427 ns. Simulation-only true reference delays are 10.00061556 ns and 14.53682892 ns. Their nonzero estimation errors demonstrate that truth was not substituted for the delay estimates.

Each spatial step removes the other path, searches ellipse-constrained scattering candidates and (for the hybrid) common-normal reflection candidates, fits each candidate's channel-wise gains, and accepts only an objective-improving update. The first hybrid sweep temporarily labels the point as a reflector; later residual cancellation changes it to a scatterer. The final result is produced by the iteration, not by a forced one-point/one-reflector assignment.

## Default result: observed-data fit versus truth-only accuracy

| Metric | Scattering-only | Hybrid |
|---|---:|---:|
| Observed-data SSE | 160.56357000 | 156.20700222 |
| Observed relative residual, dB | -14.538 | -14.657 |
| Clean-channel NMSE, dB, truth-only | -25.817 | -27.628 |
| Point error, m, truth-only | 0.003388 | 0.001989 |
| Reflector visible interaction-point RMS error, m, truth-only | 0.154251 | 0.029228 |
| Reflection support classification, heuristic | 0.9792 | 0.9792 |
| Sweeps | 4 | 4 |
| Converged | True | True |

The hybrid reflector normal error is 0.7263 degrees. The distance from a fixed true surface point to its estimated line is 0.000380 m. Unilluminated physical endpoints are not claimed as recovered.

In the noiseless synthetic case the hybrid clean-channel NMSE is -83.06 dB, versus -31.55 dB for scattering-only. Remaining hybrid error is finite-grid/refinement error; this is not a perfect symbolic solution claim.

## All fixed-seed SNR results

Every integer seed 0–9 was run at each nominal SNR below. No failed or inconvenient seed was removed. Counts are descriptive results from this small synthetic benchmark, not confidence statements about real environments.

| Nominal SNR, dB | Both hybrid labels correct | Hybrid lower observed SSE | Hybrid lower clean NMSE | Median scattering clean NMSE, dB | Median hybrid clean NMSE, dB |
|---|---:|---:|---:|---:|---:|
| 5 | 7/10 | 9/10 | 9/10 | -18.86 | -19.13 |
| 10 | 9/10 | 10/10 | 10/10 | -23.37 | -24.18 |
| 15 | 9/10 | 10/10 | 10/10 | -27.13 | -28.94 |
| 20 | 10/10 | 10/10 | 10/10 | -29.64 | -34.01 |

All 40 nominal hybrid runs reached the declared objective tolerance. A lower observed-data residual does not imply correct mechanism labels. The hybrid mislabel cases were:

- 5 dB, seed 0: scattering → reflection
- 5 dB, seed 1: reflection → scattering
- 5 dB, seed 7: scattering → reflection
- 10 dB, seed 0: scattering → reflection
- 15 dB, seed 0: scattering → reflection

Path association uses reference-delay distances with dummy unmatched nodes and a fixed 0.5 ns evaluation tolerance. Estimated mechanism labels are never an association oracle. The deliberately scattering-only baseline cannot label a reflector, so its all-label accuracy is not a useful success metric; its signal fit, point/interaction errors, and visibility handling are the meaningful comparators.

## Held-out frequencies

Geometry and gains are estimated on 48 tones; 16 unseen tones are predicted without refitting. Scattering-only held-out SSE is 43.97967565; hybrid is 42.46012300. Relative held-out residuals are -14.167 and -14.320 dB respectively. This is one held-out default-scene check, not a broad generalization study.

A held-out-Rx prediction is not claimed because each new receiver's gain is unconstrained and unknown. Such a test would need an added amplitude/phase interpolation prior.

## Retained failure examples

1. **5 cm aperture, seeds 0–9:** the hybrid identifies both mechanisms correctly in only 4/10 runs. Wrong point/surface labels remain in the results even when clean-channel NMSE is low. A good channel fit is insufficient evidence of the correct physical map.
2. **20 MHz bandwidth:** inverse bandwidth is 50 ns versus about 4.5 ns between the true reference paths. The implemented initializer fails to separate the geometry correctly; both target paths remain unmatched under the explicit evaluation tolerance. The true reference design condition number rises to about 11.95. This is a demonstrated failure of this noisy bounded estimator, not a theorem that all superresolution methods must fail.
3. **Reference blind to the reflection:** only the first fifth of the finite reflector's receive support remains, and the chosen reference cannot see it. The reflection is present elsewhere but is unmatched. Clean-channel NMSE degrades to approximately −9.58 dB, and the run reaches its sweep budget rather than convergence. No true delay or alternate truth-selected reference rescues it.
4. **Second path absent while L=2 is imposed:** this intentionally violates the nonzero two-path model-order assumption. The algorithm can overfit a noise component and misclassify the remaining path. The extra estimate and absent target stay unmatched; they are not forced into a flattering accuracy score.
5. **Single tone:** the profiled geometry loss is flat once each channel has a free complex gain. The inverse API refuses the problem.
6. **Ambiguous frequency acquisition:** the 64-tone/2-GHz configuration is refused with the original 55 ns prior. Unknown timing/alias class is not solved by hiding the true delay inside a narrow search window.

Full outputs for each example and all seeds are in results/.

## Compute accounting

The same scattering search and incumbent-refit budget is available to both methods. The hybrid pays for its additional reflection search.

| Default run | Scattering-only | Hybrid |
|---|---:|---:|
| Valid scattering candidates evaluated | 1188 | 1188 |
| Valid reflection candidates evaluated | 0 | 1108 |
| Candidate-tone projections | 3,649,536 | 7,053,312 |
| Incumbent gain-refit tone products | 24,576 | 24,576 |
| Measured Python fitting time, s | 0.1100 | 0.2095 |

Initialization is shared and separately counted. Timings are measured on this Python environment and include local runtime variability. They do not establish browser performance, live interactivity, or a portable speedup.

## Browser-port contract

- fixtures/default-observations.json contains only observed complex samples and declared model/search settings
- fixtures/default-expected.json contains separate reference numerical outputs; never feed these back as estimator inputs or use them as canned live results
- Match the port to the common observations before comparing random-seed runs; NumPy PCG64 and a browser PRNG need not generate the same samples
- Preserve the acquisition guards, unknown visibility fitting, same-data comparator, per-channel gains, objective trace, unmatched/failed states, and extra hybrid compute cost
- Use a worker, cancellation, and measured wall time for live runs; do not promise instantaneous fitting before benchmarking

## Remaining scope

No UI, independent external code review, full 3-D implementation, two-/high-bounce inference, automatic model-order selection, electromagnetic diffraction amplitude law, arbitrary timing offset, complete Figure-5 ray-tracing reproduction, or Figures 6–9 measurement-data reproduction has been completed. The first reduced numerical reference gate has passed; the next bounded step is a tested browser port of this declared problem.
