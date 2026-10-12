# Joint beamforming numerical gate report

Date: 2026-10-12. Fixed source: [arXiv1912.03420v2](https://arxiv.org/pdf/1912.03420v2). Exact PDF SHA-256: `efab9278425f628e33296624fa656b782b84f11c0447bd98487828c04b4094e2`.

## Result

The actual radar-only covariance optimization and both paper beamforming algorithms now execute from a newly supplied channel and SINR threshold. The original-dimensional M=10/K=2 selected experiment has 347 numerically accepted SDR results and 347 numerically accepted optimized-ZF results across 32 paired channels × 11 thresholds. Both methods are infeasible on the same five channels at Γ 24 dB; all 32 channels are accepted at every threshold 4–22 dB. There are no unresolved final outcomes in this selected grid.

This closes the independent selected-core numerical gate. It is a reduced-Monte-Carlo reproduction of the transmit/optimization experiment with declared deviations, not complete Fig. 3–8 reproduction or full-paper reproduction. The 1000-trial studies, K=4/6, SSP comparison, finite QPSK/receiver experiments, browser solver and measured browser latency remain open.

## Source and model fidelity

Eq. 12–15 pattern fitting plus pairwise target-correlation loss is solved with free α, PSD covariance and exact equal per-antenna power. Algorithm 1 solves Eq. 32, recovers rank-one communication columns with Eq. 33, and factors the remaining radar covariance. Algorithm 2 solves Eq. 40 and performs covariance factorization and phase-correct row QR for Eq. 42. Both use identical original power/noise/aperture/grid resources and the same paired channel draws.

The grid is 1801 angles from −90° through 90° in 0.1° steps. There are 303 desired on-beam points for inclusive 10° beams at −40°,0°,40°. Pt=1, each antenna has average power .1, noise variance = .01, and the three pairwise correlation powers have weight 1/3. Exact thin-QR objective compression changes neither samples nor objective; the independent reviewer also solved an uncompressed full-grid formulation.

The solved radar-only objective is 0.3136991361, with optimized scale 2.472782492 and numerical covariance rank 4 at threshold 1e−7. The independent full-grid value is 0.3136991433. Differences at this scale are numerical, and are not changes in physical model.

## Selected experiment and interpretation

Seeds 2026101201–2026101232 use NumPy PCG64 and iid complex CN(0,1) channel entries. H is fixed across the 11 thresholds and shared by both methods in each trial. The plotted values are means over the same accepted pair at each threshold; the last threshold uses 27 rather than 32 pairs. Intervals in the exported summary use 5000 paired bootstrap resamples with seed 2026101299. These small-sample conditional intervals are not substitutes for the source's 1000-channel results.

| Γ dB | Accepted pairs | SDR Eq14 loss | ZF Eq14 loss | SDR Eq46 MSE | ZF Eq46 MSE |
|---:|---:|---:|---:|---:|---:|
| 4 | 32/32 | 0.31369916 | 0.31648229 | 2.78764e-14 | 0.000926255 |
| 6 | 32/32 | 0.31369915 | 0.31648229 | 3.10183e-14 | 0.000926254 |
| 8 | 32/32 | 0.31370041 | 0.31648229 | 1.11835e-07 | 0.00092625 |
| 10 | 32/32 | 0.31374356 | 0.31648229 | 6.13108e-06 | 0.000926253 |
| 12 | 32/32 | 0.31390365 | 0.31648711 | 3.52833e-05 | 0.000924969 |
| 14 | 32/32 | 0.31422438 | 0.31651511 | 0.000110314 | 0.000934128 |
| 16 | 32/32 | 0.31475612 | 0.31662933 | 0.000266133 | 0.000981781 |
| 18 | 32/32 | 0.31617677 | 0.31752558 | 0.000717485 | 0.00128463 |
| 20 | 32/32 | 0.32243786 | 0.32328906 | 0.00384397 | 0.00429357 |
| 22 | 32/32 | 0.36629976 | 0.36706335 | 0.0468355 | 0.047476 |
| 24 | 27/32 | 0.47234886 | 0.47353860 | 0.1622 | 0.163432 |

`results/selected-experiment.png` and `.svg` plot the actual computed patterns and statistics. Eq. 46 MSE compares to the optimized radar-only pattern, not the desired binary pattern and not the previous teaching recipe. Values below 1e−10 indicate numerical agreement with radar-only, not validated physical precision. The optimized Eq. 14 loss and Eq. 46 distance are separate quantities.

The low-threshold ZF loss stays nearly constant because H R Hᴴ must remain diagonal even when the SINR bound is inactive. SDR can keep the radar-only optimum at low thresholds. Every accepted paired SDR objective is below its ZF counterpart. Within each channel/method, the largest numerical decrease in objective as Γ rises is 1.271e−7, below the 5e−5 ordering check. Achieved SINRs, rate and radar interference are exported, but different optimal SDR decompositions can yield different rates; no undocumented rate tie-breaker was imposed.

## Solver diagnostics and preserved attempts

All 704 primary attempts used SCS with eps 2e−7, max 100000 iterations, warm_start=false, and identical problem budgets for both methods. Original outcomes remain unchanged:

- SDR: 244 accepted, 104 numerical-gate rejections, 4 solver-infeasible
- ZF: 347 accepted, 5 solver-infeasible

The rejections prompted 135 supplementary attempts using an equivalent explicit real-cone formulation: Clarabel first, then SCS eps 2e−9/max 200000 if necessary. These did not loosen any numerical acceptance threshold. Both algorithms use the same constraint/objective model. Every secondary status, residual, time, and unsuccessful attempt is preserved.

A verified CVXPY 1.9.3 dual-extraction issue affected diagnostic interpretation. For a realified PSD dual D, the correct adjoint is `D11+D22+j(D21−D12)`. Exposed native complex duals can use a half-block formula that relies on block symmetry; asymmetric solver dual blocks made some reported complex stationarity/PSD checks misleading even when the canonical certificate was accurate. The independent reviewer recovered the full blocks from the same solve and confirmed the correction. The explicit-real-cone implementation avoids that assumption. A dual-extraction rejection alone is not evidence that the primal optimum was wrong.

Factor recovery matters independently: some original solves met the nominal covariance constraints yet slightly missed the stricter recovered-factor SINR tolerance. Those attempts are rejected, retained and refined, not relabeled successful based on solver status.

## Feasibility certificate

At trial 6, Γ 24 dB, the original SDR ran to 100000 iterations with gross residuals; explicit-real solver retries also failed. A separate phase-I SDP maximized the common scaled SINR feasibility margin over the exact SDR covariance feasible set. Its negative margin was certified with a residual-adjusted dual bound, rather than inferred from a timeout.

Normalize nonnegative inequality multipliers to sum one. With PSD dual multipliers and equality multiplier η, let c be the dual constant and E_R/E_Rk the remaining stationarity matrices. Since each primal PSD block has trace at most Pt, `c−Pt(||E_R||op+Σ||E_Rk||op)` lower-bounds the negative maximum margin. For trial 6 this bound is 2.0017567730e−5>0. Thus its maximum margin is strictly negative at numerical-certification precision. The same diagnostic gives positive conservative bounds for trials 0,9,20,22. These five SDR-infeasible cases are necessarily ZF-infeasible because the ZF feasible set is more restrictive. Full multipliers, spectral residual norms and corrections are exported.

This is floating-point numerical certification with explicit residual bounds, not an interval-arithmetic or symbolic proof. The original timeout and solver errors remain visible alongside the later certificate.

## Accuracy and cost

Among the 694 accepted final results:

- Maximum objective recomputation discrepancy 5.11e−15
- Maximum per-antenna covariance error 2.12e−7; smallest covariance eigenvalue −1.74e−6, within the frozen PSD tolerance
- Maximum factor covariance error 1.75e−6; maximum factor per-antenna error 4.86e−7
- Worst recovered-SINR relative shortfall 1.999e−5, within the predeclared 2e−5 gate
- Maximum stationarity norm 1.898e−4, within 2e−4; maximum complementary-slackness error 7.82e−6
- ZF radar leakage power at most 3.86e−31 and inter-user leakage power at most 6.69e−12 in the recovered factors

Primary end-to-end Python solve-call times (includes canonicalization when incurred): SDR median 0.263s / p95 4.674s / worst 27.590s; ZF median 0.034s / p95 0.111s / worst 0.276s. These include failures and equal primary budgets.135 refinement calls add 236.97s total, with 46.79s worst case. They are reported separately, because refinement selection is conditional and is not a fair same-budget speed comparison. CPU thread settings were 1; exact software/platform versions are recorded. These are neither browser benchmarks nor latency promises.

## Validation and limits

The local boundary suite passed 16 checks, including full-grid/objective identity, desired endpoints, Eq. 33 power preservation, singular ZF covariance, Γ 0 distinctions, and known-infeasible channels. An independent reviewer performed 71 additional algebra cases, separate full-grid SCS solutions, a replay audit of all 704 primary records, full-block dual checks, and phase-I certificate checks. Its final refinement audit is retained with the review package.

Recommended tracking is source audited-for-selected-core, model verified for this covariance scope, algorithm partial-offline, independentValidation passed for this scope, selectedExperiment partial with declared 32-trial/K=2/baseline deviations, fullPaper not-reproduced, liveExecution prerequisite-only, uiLearning pending and browser latency not-measured. Developing the real browser optimizer is a separate next gate; numerical reference outputs must not be served as fake live computation.
