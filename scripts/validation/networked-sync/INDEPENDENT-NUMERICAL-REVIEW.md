# Independent networked-ISAC numerical review

## Current disposition

The source-derived receiver core and its bounded original-dimension experiment pass this independent numerical review. All 432 pair trials, 1,296 method evaluations, 4,722 structured substeps, selected fresh receiver reruns, a full six-stage exemplar, and final archive/freeze identity have been verified. No numerical blocker remains within this scope. This is not acceptance of a live/browser port, published curve reproduction, or an author-code reproduction.

Reviewed core: SHA-256 `88a161d7d7d55ad4a2e703b0afb590c69644b0c61eaf370c2f6f519fc650f10e`.

The owner supplied a source audit of fixed arXiv:2607.18680v1 and its rendered PDF, including five formula crosswalks. The primary PDF hash recorded in that audit is `e8da91552c32d61dd40cbc3c0224c7b654df04e9a4c3e85c0781d58f66853f02`. This numerical reviewer inspected the audit and complemented it with independent algebra and finite cases; it did not infer that operational notation repairs identify the unpublished author implementation.

## Verified numerical properties

- All 19 owner tests reproduced on isolated copies; all 11 new independent tests passed
- Direct physical observation loops verify receiver/transmitter indexing, ordinary transmit transpose, pilot placement, delay sign, slow-time sign, and complex gain handling
- Arbitrary complex, asymmetric-dimension tensor factors verify all Khatri–Rao orderings and each mode LS update against a 70-digit independent linear-system oracle; maximum element error 1.87e-15
- Thirteen finite projection cases, including the original 10/20/36-sample factor lengths, compare the production FFT/refinement result against independently enumerated stationary-polynomial roots refined at 70 digits; maximum relative correlation-power gap 3.65e-14
- Complex scaling and component permutations preserve tensors and phase generators over the tested finite scales; first-entry normalization preserves the represented tensor
- Twelve rank-three reciprocal permutation/sign cases recover both signs of clock offset and CFO. Fresh noiseless rank-1/2/3 cases test smoothed initialization, ESPRIT-LS and structured refinement from directly synthesized observations
- Standard SVD `UΣVᴴ` requires the first row of `Vᴴ` to represent the temporal factor `Cᵀ`; the implemented ESPRIT temporal sign is correct in the tested cases
- Unequal-noise, two-target nuisance-FIM derivatives agree with 70-digit differentiation to maximum absolute matrix error 2.28e-13. Unknown gain nuisance elimination increases covariance relative to known gains in the tested case
- Receiver calls remain operational when truth-only model/FIM/identifiability helpers are deliberately unavailable. The inspected estimator signatures and driver data flow keep truth out of estimation, initialization, pairing and stopping
- Exact reciprocal half-period delay/clock and Doppler/CFO aliases are retained as ambiguities, rather than resolved with truth
- Synthetic aggregation confirms numerical failures stay in the success-rate denominator, geometry-failed estimates remain in all-solved RMSE, and success-conditioned RMSE is separate

## Important limitations retained

Projection of an unconstrained factor LS solution in ordinary Euclidean norm is not generally the exact constrained tensor LS subproblem. In six same-observation, same-initialization, five-iteration noisy runs, the projected method shows nonmonotone substeps and a bad random-start local minimum. The raw traces are in `evidence/independent-checks.json`; none was discarded or replaced by a truth-selected start. No monotonicity or global-convergence conclusion is supported.

The source geometry criterion is only a range-versus-baseline test. An estimate with deliberately wrong timing/CFO can still pass it. All-solved errors, numerical failure counts and the separately labeled gross-error diagnostic must remain visible with success-conditioned RMSE.

The smoothed algebraic method is a declared three-axis source-derived variant. It is not a verified reconstruction of the paper's CP-VDM benchmark. Exact author code was not verified, restrictive reference-package terms were not accepted, and no third-party implementation source was copied. The source's cycles/radians, unfolding and SVD ambiguities are operational-reconstruction choices, not blanket claims that the authors' code was erroneous.

Reflection-gain law, beam distribution/norm, array axes, smoothing window, projection search, component scoring, geometry rejection sampling and independent pair-clock draws are declared simulation choices. They rule out exact published-curve claims. Known rank, separable post-demodulation observations and principal-interval physical priors are required. No time-domain ICI/ISI, network-cycle clock solver or hardware behavior is tested here.

The independent tests use finite nonvanishing signal/gauge scales. Absolute small-column guards mean the implementation does not establish scale invariance for arbitrarily tiny floating-point amplitudes.

## Reporting correction

The first inspected driver timed SCPD refinement without its initializer, while timing the full ESPRIT call. This was reported to the owner and corrected before the sweep: each method now records initialization-inclusive tensor-estimator time, with SCPD initialization/refinement separated. The timing scope explicitly excludes generation and reciprocal parameter extraction. These are offline diagnostics, not device/browser latency claims.

## Replay

From this review directory:

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python independent_checks.py
cd snapshot
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python -m unittest -v test_sync_core.py
```

Independent oracles and trial metrics: `independent_checks.py`, `evidence/independent-checks.json`, `evidence/independent-checks.log`, `evidence/independent-noisy-observation.npz`.

The full-trial verifier is `review_persisted_evidence.py`. It independently recomputes geometry, direct observations, factor residuals, phase slopes, every association score, reciprocal estimates, evaluation assignment, error/success/failure aggregation, and every SCPD substep tensor from recorded amplitudes/phases. Exact floating-point observation hash regeneration alone reuses the isolated owner's deterministic generator, and is labeled separately.


## Completed original-dimension evidence review

The final reduced experiment covers M=10, N=36, K=20, known L=1/2, SNR −25/−10/+5 dB, 12 independently generated network scenes per rank and six correlated pair trials per scene/SNR. The 432 pair trials represent 24 independent scene clusters, not 432 independent geometries. Source-defined SNR is pre-beam reflection-coefficient energy/noise, and received SNR is separately checked.

- All 432 expected trial IDs appear exactly once; all three methods remain present for each trial
- 864 independent direct-physics observation reconstructions agree with deterministic observations to relative error at most 4.62e-15
- 2,592 raw-observation/normalized-observation/pilot hashes match exactly; all six selected observation NPZ files match their regenerated arrays
- All 1,296 estimates, association permutations/scores, truth-only evaluation assignments, errors, geometry decisions, gross-error flags and pooled summaries agree with independent recomputation
- All 4,722 actual projected-update tensors reconstructed from saved amplitude/phase records match recorded residuals to relative error at most 2.99e-16
- 864 initializer reuse checks establish that SCPD begins at the exact saved same-data smoothed-CP result; 1,296 timing checks confirm the disclosed initialization-inclusive scope
- Eighteen method/pair reruns across both ranks and all three SNRs reproduce every stored estimator field exactly, with maximum field difference zero
- All 12 retained stress runs and the duplicate-path failure are accounted for
- The six-stage exemplar contains twelve LS/projection columns. Independent indexed LS, direct correlation evaluation of every saved grid point, 70-digit stationary-root peak checks, and tensor residual reconstruction all pass

All 864 SCPD links meet the source relative-stopping test, while 64 full sweeps and 283 substeps are nonmonotone. At L=2/−25 dB, all 72 pair trials have the separately labeled gross-error diagnostic, including nine passing the source geometry filter. At L=2/+5 dB, geometry success is 67/72 and four trials still have gross-error flags. These outcomes are preserved, and demonstrate why stopping and geometry success cannot certify accuracy.

No realized principal-interval, CP-assumption, or numerical sufficient-rank violations occurred in this finite sweep. The maximum realized composite Doppler/subcarrier-spacing ratio is 0.017405, and the minimum effective gain magnitude is 0.038841. These are realized sample diagnostics, not universal bounds for Gaussian offsets or arbitrary scenes.

## Final provenance

- Owner core SHA-256: `88a161d7d7d55ad4a2e703b0afb590c69644b0c61eaf370c2f6f519fc650f10e`
- Owner `FREEZE.json` SHA-256: `94f0c92acb978981a0fe5d4891fe95acb5d8ce557f5b92ca6a84dc9d2637e3ab`
- Full-stage exemplar SHA-256: `386956b8c2462c66bd12833eb157df1f67f0a6a2cd560d529c1fb2162f758612`
- Source-free archive SHA-256: `0d801fd2dfa7da281772da48c33c5bd6f1e8c781a4004bbef4eac1f4c538f25a` (8,368,985 bytes)
- All 34 frozen owner files match disk and archived bytes; archive CRC and path safety checks pass

The owner archive is `../networked-sync-kernel-v0.1-sourcefree.zip`. The reviewer did not edit owner code, operate a browser, touch a UI repository, download reference code, accept restrictive terms, or install packages.

## Full replay commands

Run single-threaded from this review directory:

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python review_persisted_evidence.py owner-evidence
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python replay_selected_receivers.py
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python review_stage_and_freeze.py
```

`evidence/full-evidence-review.json`, `evidence/independently-recomputed-trial-metrics.jsonl`, `evidence/selected-reruns-and-diagnostics.json`, and `evidence/stage-and-freeze-review.json` contain the full machine-readable outcomes. `REVIEW-FREEZE.json` hashes the isolated reviewed source, scripts and review evidence.
