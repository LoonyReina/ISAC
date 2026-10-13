# Perceptive: bounded numerical reference and evidence

## Result and classification

The original direct known-symbol recovery reference is numerically implemented and independently checked. This is a **justified correlation-off MMV interpretation**, accompanied by a **source-inspired single-logdet diagnostic** and explicitly labelled extensions. It is not an author-code transcription or exact Fig.4 reproduction. No browser or website code was changed. No source PDFs or unlicensed code are included or executed.

The primary solver sees only actual Y, dictionary W built from known symbols/tones/grid, known noise variance and options. True support, path count, transmitter association and angles remain in separate generator/evaluator state. The privileged LS receiver is marked separately.

Independent final acceptance is recorded in `INDEPENDENT-ACCEPTANCE.md`; the original independent checker scripts accompany that report. The core is frozen at the hashes in `results/runtime.json` and the final manifest.

## Numerical acceptance

- Proper-complex evidence: J = R logdet C + tr(Y^H C^-1Y), with block prior gamma I and fixed known noise
- Cholesky posterior and leave-one-block-out formula checked by independent formulations, finite differences, analytic orthogonal optima, scaling/noise transformations, MMV mixing/replication and explicit path sums
- 25 implementation tests; independent adapter reports 905 checks against the final API
- Independent experiment audit: 480 trials, 2,400 method records, 83,793 accepted FM actions independently recomputed; maximum dense-objective discrepancy 8.42e−10
- The independent audit reports 18,179 experiment checks, including raw observations, fair input pairing, extraction, counts, intervals and bootstrap calculations
- All 4,960 candidate three-delay-support unions were independently rank-checked for one declared dictionary; minimum relative singular value 0.04624. This finite numerical check is not a general uniqueness/noisy-resolution theorem

The proposal is a projected covariance stationary candidate, not the exact scalar constrained optimum. `no_improving_projected_candidate` is not a convergence-to-stationarity or global-optimum certificate. Uphill proposals are rejected by dense evidence. Source sign/normalization conflicts and concrete counterexamples are in `SOURCE-CONTRACT.md` and `FAILURE-AND-REPAIR-LOG.md`.

## Frozen experiment and budgets

64 tones, B=20 MHz, two transmitters with two elements each, four receive elements, half-wavelength arrays, delay grid q=0..31 at25ns, one t=0 snapshot. Four known QPSK streams have unit aggregate transmit-symbol energy. Fixed physical scene: delays {4,11,23}, users {0,1,0}, complex gain magnitudes {1,.7,.45}, continuous AoAs {−28,12,41} degrees and AoDs {18,−36,29} degrees. These are teaching choices, not the paper's unrecovered random scene/link budget. Total received SNR is ||Yclean||²/(64*4*sigma²).

Thresholds were selected once from 24 noise-only and18 signal-validation realizations, before main testing. The frozen plan is SHA256 `08b71d148def86b195a75fee41b1fb7089ee8ab964bb678c18909d0cd7dab679`. Main SNR points use the same underlying symbol/noise draws across algorithms and SNR levels, with only noise scale changed. Sampling uses minimum40, maximum80 trials and a predeclared Wilson half-width target0.12 for each practical method. The target was met at every SNR. Intervals are descriptive under this precision-stopping design, not time-uniform confidence guarantees.

Acquisition resources and observations are identical across methods. Computational budgets are explicit rather than falsely called identical: block methods cap120 accepted updates, row-SBL300, OMP12 blocks; wall times are retained. Known-delay-support LS has privileged information. Noise variance is supplied equally to all methods. No common LS refit is applied.

The full experiment, including validation, took492.72 seconds with one BLAS thread. It produced440 paired SNR trials,10 illustrative trials and30 stress trials (2,400 method records), plus42 validation fixtures, about41MB before final audit supplements. The precision/resource bounds were frozen before the run.

## Paired SNR results

Mean complex-block NMSE below is linear power ratio, computed before detection thresholding. Lower is better. The physical scene is fixed; these trials quantify symbol/noise variation, not a population of geometries.

| SNR dB | Trials | MMV projected-FM | Single-log diagnostic | Row-SBL | Block OMP | Privileged delay-support LS |
|---|---|---|---|---|---|---|
| -5 | 40 | 0.497314 | 1.970554 | 0.574935 | 0.711887 | 0.735283 |
| 0 | 80 | 0.205173 | 0.724774 | 0.184960 | 0.280931 | 0.225009 |
| 5 | 80 | 0.073913 | 0.255849 | 0.057928 | 0.103191 | 0.071154 |
| 10 | 80 | 0.024709 | 0.084831 | 0.018287 | 0.022501 | 0.022501 |
| 15 | 80 | 0.007972 | 0.027340 | 0.005783 | 0.007115 | 0.007115 |
| 20 | 80 | 0.002535 | 0.008754 | 0.001827 | 0.002250 | 0.002250 |

Exact delay-user support recovery fraction after the frozen validation-selected thresholds:

| SNR dB | MMV projected-FM | Single-log diagnostic | Row-SBL | Block OMP | Privileged delay-support LS |
|---|---|---|---|---|---|
| -5 | 0.0500 | 0.0000 | 0.0500 | 0.0000 | 0.4000 |
| 0 | 0.4125 | 0.4375 | 0.7500 | 0.0000 | 0.9625 |
| 5 | 1.0000 | 0.9875 | 1.0000 | 0.5125 | 1.0000 |
| 10 | 1.0000 | 1.0000 | 1.0000 | 0.5750 | 1.0000 |
| 15 | 1.0000 | 1.0000 | 1.0000 | 0.5750 | 1.0000 |
| 20 | 1.0000 | 1.0000 | 1.0000 | 0.6250 | 1.0000 |

**No universal win:** row-SBL has lower block NMSE than the primary method at0–20dB. OMP/privileged LS have lower block NMSE at10–20dB. The source-inspired single-logdet diagnostic has worse block NMSE across these conditions. At−5dB the primary misses38 and produces59 spurious delay-gated estimates across120 true paths; at0dB it misses34 and produces19 spurious estimates across240 true paths. These unfavorable results are retained.

**Threshold caution:** validation chose relative power0.20 for OMP, close to the weakest main-scene power ratio0.2025. Consequently some correctly recovered weak blocks are pruned. Its support percentages must not be used to claim a large inherent recovery advantage for the primary solver; pre-threshold NMSE and full validation score grids remain available. The other thresholds and empirical noise cutoffs are in `results/calibration.json`. These are heuristic selection thresholds, not calibrated detections/Pfa.

For the primary solver, the10dB paired experiment has80/80 exact-support successes (Wilson descriptive interval [0.9542, 1.0]), no misses/spurious estimates among240 paths, AoA RMSE0.685° and AoD RMSE1.467°. Errors are conditional on matching and must accompany the miss counts shown at lower SNR. Phase-coordinate errors, association denominators and all angle records are retained.

Paired bootstrap95% intervals for mean block-NMSE difference (primary minus OMP) are retained for every SNR. At10dB the interval is [0.001689, 0.002723]. This interval concerns this fixed scene and the declared algorithms/selection settings.

## Reduced Fig.4-structure illustration

Ten fresh symbol/noise realizations at10dB retain the fixed scene. Primary:10/10 exact-support recoveries,30/30 matched paths, zero misses/spurious, block NMSE0.02389, AoA RMSE0.555° and AoD RMSE1.291°. Every point/estimate is in raw outputs. This preserves the repeated-fixed-scene structure, not original coordinates, powers, source-size dimensions or an exact figure reproduction.

## Stress and mismatch extensions

Each row has five fresh paired trials at20dB. Values below are for the primary method.

| Scenario | True paths total | Misses | Spurious | Mean clean-observation NMSE |
|---|---|---|---|---|
| single_path | 5 | 0 | 0 | 0.000921 |
| weak_path_0.08_amplitude | 15 | 5 | 0 | 0.002105 |
| adjacent_bins_10_11 | 15 | 0 | 0 | 0.001946 |
| same_delay_different_users | 15 | 0 | 0 | 0.001649 |
| same_delay_same_user_unsupported | 15 | 5 | 0 | 0.001449 |
| offgrid_0.35_bins | 15 | 0 | 6 | 0.005142 |

All five0.08-amplitude weak paths are missed by the frozen detector. Two same-delay paths from different transmitters retain separate transmitter blocks. Same-delay/same-transmitter paths merge into a summed block and cannot be separated by the rank-one extraction branch; one physical path is missed in every trial. Off-grid observations use true continuous delays+0.35 bins and an unchanged inverse dictionary; extra peaks and delay bias remain, with no exact on-grid X/NMSE asserted. The off-grid LS diagnostic receives nearest-grid true-delay support and is explicitly labelled mismatched.

Same-delay matching cannot uniquely pair individual truth paths using delay alone. Original raw assignments remain for transparency; use `results/ambiguity-aware-metrics.json` for unambiguous-only association/angle errors. No physical angle/user claim is made from arbitrary tied assignments. All estimates, including split/spurious peaks, are retained.

## Caps, failures and review repairs

18 accepted-update-cap outcomes remain in the2,400 records, all from the single-log diagnostic; none from the primary/row-SBL/OMP receivers. Cap returns are included in every denominator and summary. The independent audit found17,535 diagnostic actions that increased proper-MMV evidence while decreasing their declared single-log objective. This is the intended normalization diagnostic, not a hidden successful MMV solver.

The default numerical path was frozen before running. During the run, independent review requested additional API option guards; the exact executed core is preserved as `reference-executed-v1.py` (SHA256 c650d3c2fccae4a5138fbbc710261a8aafda9b8d8aabb90d917395422841aed7). Final `reference.py` adds validation only (SHA256 2a78defdf9f01ad7af14e7cd16b48d20b89137292abf471d12eaeacf604c5c70). Deterministic replay recovered120 missing noise-calibration status records and checked saved X; no thresholds or frozen estimates changed.

Final replay review also corrected bookkeeping for future runs: current runner records actual imported core and runner hashes before calibration, and the supplement consumes that record. The exact historical runner is preserved as `experiments-executed-v1.py`; this completed run has an explicitly retrospective execution-provenance record bound to the independent audit. Existing frozen numerical/runtime outputs were left untouched. An isolated provenance test reuses frozen fixtures without rerunning or retuning the statistical experiment.

## Deliverables and limits

- `reference.py`: original forward model, projected-FM variants, posterior, baselines and extraction
- `test_reference.py`:25 implementation tests; independent scripts and acceptance are separately identified
- `EXPERIMENT-PLAN.json`, `experiments.py`, `complete_evidence.py`: frozen experiment and non-tuning supplements
- `fixtures/GENERATOR-EVALUATOR-METADATA.json`: complete configuration, actual paths/gains, seeds and separate truth
- `fixtures/*.npz`: exact raw observations, symbols/noise and every complex estimate
- `results/all-trials.jsonl`: all estimates, histories, matches/misses/spurious outcomes and stopping reasons
- `results/summary.json`: all metrics and descriptive/paired uncertainty; `failure-history.json` retains caps
- `SOURCE-CONTRACT.md`, source links/hashes, source verification and failure/repair ledger

Further gates remain closed: JS/browser port, live recomputation, browser replay/lifecycle, website integration/deployment, original-size figures, Doppler, indirect channel-estimation branch, matrix clutter, stronger same-delay/same-user recovery and real-system claims. Numerical acceptance does not imply those gates have passed.
