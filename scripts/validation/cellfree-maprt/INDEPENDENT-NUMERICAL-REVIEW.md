# Cell-free MAPRT independent review

Status: ACCEPTED for the source-derived reduced conditional numerical core and exact source-free release bytes identified below. Full-paper, deployment and browser gates are excluded.

## Scope and source

The reviewed implementation is a reduced-dimensional conditional reference for the multistatic MAPRT and CCP allocation in Behdad et al., arXiv:2305.12523v2. It is not a reproduction of the full paper's figures. The source PDF SHA-256 was independently checked as `30b871e5bb3dd1a66fab1a4c2ab3974abb8a7e664e04e2dfa62f6e50679c0d10`. Source pages 8, 9 and 15 were visually inspected, alongside the source text for the steering model, numerical setup and channel moments. Source files and rendered pages remain outside this review deliverable.

No reference-owner files were edited. Audit snapshots, independent checks and logs live in this directory. The existing demonstration toy was not used as scientific evidence or modified.

## Established checks

- Source Eqs.11-18 match the actual time / receive-AP / antenna row stacking, receive-AP / transmit-AP nuisance ordering, column-major channel vectorization, transmit steering transpose, and Kronecker clutter covariance
- Source Eqs.20-33 maximize proper-complex Gaussian joint densities over RCS and clutter under H1 and clutter under H0. The RCS prior normalizer is retained, while common clutter/noise normalizers cancel
- A marginalized Gaussian LRT has the same data-dependent quadratic in this fixed linear Gaussian design but a different constant. Ranking equivalence after recalibration is conditional and does not make the models or definitions interchangeable
- Source Eqs.36-37 covariance contractions agree with independently written direct sums, including complex correlated RCS and the transmit clutter covariance transpose
- Source common amplitudes are square roots of stream powers, and coherent stream cross terms are retained. Constraints use expected per-AP coefficients, not separate per-AP power variables or instantaneous block power limits
- The CCP tangent objective and auxiliary t elimination are consistent with Eqs.39-49. The supporting-hyperplane/Lagrange/box residual certificate bounds the convex subproblem numerically only. It does not certify global optimality of the original ratio
- Reduced settings explicitly distinguish the synthetic 4-TX / 2-RX / M=2 / 2-UE geometry and reconstructed orthogonal-pilot MMSE moments from unrecovered paper simulation settings

## Independent oracle results (final numerical core v4)

All 26 owner unit tests passed in an isolated copy, including the bounded solver-retry contract. A separately written oracle suite covers 18 randomized complex multistatic/dense models and three 80-decimal checks. Maximum absolute errors:

- Explicit physical antenna observations: 5.62e-15
- Source target-energy matrix A: 3.42e-13
- Source clutter-energy matrix B: 2.28e-13
- Optimized full joint densities: 4.45e-15
- Integrated observation-covariance density ratio: 7.11e-15
- Posterior estimates against independent augmented least squares: 1.62e-15
- Real-augmented least-squares score: 1.61e-15
- 80-decimal oracle: 2.13e-15

Evidence: `independent-oracles-v4.json`, `independent-unit-tests-selected-v4.log`, and the exact source hashes in `independent-selected-v4.json`.

## Bugs found, owner-fixed, and rechecked

1. Rank-deficient estimated UE channels caused unpivoted reduced QR to remove arbitrary extra target directions. Replaced with a rank-aware SVD basis
2. An absolute-scale PSD tolerance accepted entirely negative physical-scale A/B matrices. Replaced with a matrix-scale-relative test
3. Invalid calibration confidence returned NaN intervals. Domain validation now rejects it
4. An absolute Hermitian tolerance accepted materially non-Hermitian physical-scale priors. Replaced with a matrix-scale-relative check and explicit accepted-roundoff symmetrization
5. Zero target steering returned a NaN sensing precoder. It is now rejected

Each was reproduced independently and regression-tested after the owner fixed it. None was shown to affect the selected scenario before correction. No paper error is claimed.

## Selected Monte Carlo and exact regeneration

The selected run uses 1024 fitted and 1024 held-out communication samples; 16384 independent H0 calibration blocks; and 8192 H0/H1 evaluation pairs. Four allocations, four RCS values (-30, -20, -10, 0 dBsm), two detectors and two Pfa targets yield 64 cells.

- 1,048,576 calibration/evaluation scores were independently recomputed using augmented complex least-squares residual-cost operators. Maximum absolute difference was 9.09495e-13
- All thresholds, event counts, complement counts, exact binomial intervals and AP/SP paired discordance counts passed independent reconstruction
- Independent direct source A/B contractions at the saved physical scale and finite fit/holdout moment rebuilding passed
- The owner's independent observation-covariance verifier was separately rerun in the isolated snapshot. It recomputed 66 iteration certificates and 71 solver attempts, including five retained status-8 failures and five bounded retries. All six final CCP restarts converged, and no failed restart was silently replaced or omitted
- Fourteen malformed/stale-record mutations were independently rerun and all rejected
- A fresh full experiment regeneration produced byte-identical copies of all four NPZ files, totaling 357 arrays. Settings, solver records and detector checks were exactly equal; results were exactly equal after removing elapsed time only

Independent evidence: `independent-selected-v4.json`, `independent-owner-verifier-v4.log`, `independent-full-replay-run.log`, `independent-full-replay-verify.log`, `independent-full-replay-equality.json`, `independent-record-mutations-v4.log`.

## Solver recovery transparency

An initial full smoke grid retained status-8 SLSQP line-search failures. A second same-candidate retry attempt also failed and was retained. The final solver permits at most one extra call only when a status-8 candidate already passes the primal/gap gates. That call starts at the candidate amplitudes scaled by (1-1e-7); objective, constraints and tolerances remain unchanged. It still must return genuine success and pass all numerical gates. The contraction is toward the box origin, not necessarily into the feasible set, because active communication constraints may worsen. Regression tests cover identical subproblem functions, exact contracted initialization, at-most-two calls, ineligible failures, a retained failed retry and a falsely successful but infeasible retry.

## Scientific findings and retained limitations

1. All four allocations have at least one independent holdout moment constraint violation. For ISAC, fitted first-UE SINR is 1.995262315 (3 dB), but holdout is 1.946725929; fitted AP4 power is 1 W, but holdout is 1.011013146 W. These are genuine finite-moment generalization limits, not failed detector arithmetic
2. The selected ISAC+S sensing amplitude is approximately 2.59e-16, so its results coincide with ISAC. This fixed geometry does not establish a dedicated-sensing-beam advantage
3. At 0 dBsm and target Pfa=0.01, AP detections are 6465/8192 for ISAC (Pd=0.7891846) and 7339/8192 for the non-paper cap-saturated baseline (Pd=0.8958740). Their sensing-SINR surrogates are 2.0415044 and 1.7685796 respectively, while expected total powers are 1.1851345 W and 2.1431961 W. Neither the surrogate nor equal per-AP caps guarantees Pd ordering or equal used energy
4. At target Pfa=0.1, false-alarm counts range from 802 to 894 out of 8192. Eight of those 32 cells have conditional evaluation intervals excluding the nominal target. At target Pfa=0.01, counts range from 69 to 97; all 32 intervals include the target. These are correlated cells, and each interval conditions on its frozen threshold; this is not a simultaneous calibration guarantee or a count of independent failures
5. Weak-signal misses and false alarms remain in every raw array and count. The lowest reported Pd is 70/8192, close to its evaluated null rate, rather than a hidden failed trial

This acceptance covers a source-derived conditional numerical core only. It does not accept original source figures, deployment feasibility, global ratio optimality, full-paper reproduction, a browser implementation, or UI integration. Synthetic geometry/covariances and missing original simulation choices remain disclosed.

## Exact accepted release identity

- Archive: `cellfree-maprt-reference-v1-sourcefree.tar.gz`
- Size: 46,222,011 bytes
- Archive SHA-256: `52356ca01b77482a1c3a42d70f7fe4dc0914a20c5b29695d5e5e8f8a6df7981b`
- Manifest SHA-256: `30a8e28487ddce0542d767482e02b6eb6af9397a5b69187071f5507cd8e774a5`
- Manifest records: 63 files; archive closure: those 63 files plus the manifest, with zero extra/duplicate/unsafe members
- Every archived member's bytes, size and SHA-256 match both the manifest and owner tree
- All reviewed core, tests, runner/checker and selected scientific data remain exact. The final plotting-script cache/caption change was rechecked by exact regeneration of both PNGs
- HANDOFF wording was narrowed to the observed local candidates, rather than claiming no dedicated-sensing solution could help. It preserves all holdout, calibration, surrogate and source-scale limitations
- No source PDF, extracted paper text, TeX/Bib, source-page imagery or unverified author code is included. The two images are newly generated numerical figures, visually reviewed

Final receipt: `independent-archive-readback.json`. This acceptance applies only to the exact archive and manifest hashes above. Future code/data changes require affected numerical checks; a browser port requires independent browser and interaction verification.
