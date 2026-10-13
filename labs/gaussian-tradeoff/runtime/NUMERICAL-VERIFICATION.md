# Gaussian ISAC JS numerical verification

The implementation recomputes all quantities from fresh matrices and parameters. Oracle records are consumed only by tests, never imported by the runtime. The scientific scope is the independently derived operational isotropic-prior Gaussian matrix model, not every printed expression or full-paper reproduction.

## Owned reproducible gates

Run `bash run_all.sh` from the full-evidence package.

- Fresh reference parity: 2,382 scalar/matrix checks across M=1,2,3,4,6, varying Nc/Ns/T/noise/prior/power, noncommuting complex covariances, 30 source48 weights, continuous between-preset κ and 7 Wishart cases. This includes actual Y/X posterior means, full real BFIM over all Ns rows, and the transpose distinction between row-acting and h-column posterior covariance. Maximum scaled difference: 1.25×10⁻¹²
- Source finite-integral regression: all 39 Figure4 configuration points are freshly integrated, maximum absolute disagreement below 6.9×10⁻¹². Twenty rank-one sphere MI cases, T=1,2,4,16 and SNR=.01,.1,1,10,100, disagree by less than 1.7×10⁻¹¹. The two Fig10 single-channel power-convention presets also solve; 61 cases in this gate
- Boundary regression: 72 independently supplied requests ×5 weights, plus zero/deep fades and custom covariance selection, gives 366 cases. All 360 covariance solutions pass full-matrix certificate and power checks without threshold relaxation. Maximum recorded relative supporting gap: 1.73×10⁻⁹
- Direct Python audit of three fresh JS executions: 1,986 independent NumPy comparisons of actual matrices, X/Y/noise/truth, real FIM/posterior, raw statistics, power and KKT gradients; maximum scaled discrepancy below 3.5×10⁻¹⁵. Twenty independent arbitrary complex PSD competitors per covariance point also pass
- Codec/Worker suite includes exact signed-zero roundtrips, invalid Unicode/sparse/accessor/prototype/nonfinite/resource rejection, immutable ownership, canonical hashes, history labels, accepted-only supersession, cancellation, rejected-newer restoration, queued results, death/restart and actual production-kernel execution in Node and the browser module branch VM

Logs and raw outputs are under `reports/`. Counts describe different checks and are not combined into a paper-figure acceptance count.

## Independent audit

The separate port reviewer reported passing fresh complex-matrix and 420-digit Wishart checks, direct sphere integration, 38 held-input/truth-exclusion checks, 9 tiny-rate regressions, 360 boundary certificates and 70-digit rechecks of ten worst numerical certificates. The separate protocol reviewer exercised 25 randomized ordered-duplex schedules settling 1,222 promises exactly once. Final independent acceptance remains tied to the exact hashes in that review; this document does not substitute for it.

## Accuracy and computation classes

- Covariance optimization: convex global supporting-plane certificate, binary64 feasibility and matrix gradient; numerical failure if relative gap exceeds 10⁻⁸
- Gaussian MI, conditional posterior and real FIM: exact mathematical model expressions, evaluated in binary64; no finite-block coding or decoder claim
- Gaussian/Stiefel averages and truth-only MSE: seeded finite Monte Carlo, normal-approximation SE; neither rigorous coverage nor simultaneous bands. Shared draws correlate points across κ
- Finite Wishart and rank-one sphere values: numerical integration of exact finite-dimensional expressions. Refinement, quadrature, mass and tail diagnostics remain visible; no rigorous entropy interval is asserted
- MP: explicitly an approximation, never used as a Wishart truth replacement or KKT certificate
- Full-MIMO Stiefel rate: absent, returned as null with an explicit reason. No Gaussian logdet substitution and no achieved-region hull

The source's Eq109 sign and Eq93–94 coordinate/prior inconsistencies remain explicit; direct real likelihood, source95 trace and source48 sensing-minus-rate objective define this implementation. Both 24 dB Pt/PT conventions are preserved.

## Measured resources

`reports/benchmark.json` records end-to-end actual Node Worker timings and exact canonical export sizes for the tested cases. Representative observations are roughly 0.15 s for the teaching 64-block six-weight run, 0.64 s for 512 blocks at Fig10 settings, and 0.91 s for rank-one T=16/SNR=100 quadrature. These are single diagnostic runs in a shared environment, not browser timings, distributional benchmarks or latency guarantees. Runtime cancellation yields macrotasks; its wall-clock guard is cooperative, not hard preemption.

## Preserved failures and fixes

`DEVELOPMENT-FIXES.json` records the initially exposed water-level and linear-μ conditioning defects. All original boundary inputs are retained. Fixes improved algebra/root scaling without lowering certificate thresholds, deleting positive modes or silently substituting another prior/power/channel.
