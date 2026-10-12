# Independent numerical review

Paper: *Joint Transmit Beamforming for Multiuser MIMO Communications and Radar*, fixed [arXiv:1912.03420v2](https://arxiv.org/pdf/1912.03420v2). Reviewed the supplied local PDF and source text. Review date: 2026-10-12.

## Verdict and scope

The implemented radar-only, SDR, and **optimized covariance ZF** programs match the cited paper equations. Their beamforming recovery is algebraically sound. The initial numerical smoke outputs are independently corroborated to about 1e-8 objective accuracy. The `optimal_inaccurate` Clarabel statuses are retained rather than silently treated as certificates: their exposed dual matrices show poor stationarity even when primal residuals are tiny. A later investigation identified a CVXPY complex-dual extraction artifact, so failure of this exposed-multiplier diagnostic is not itself failure of the canonical solver certificate. The primary SCS outputs have independently confirmed small primal, dual, and complementarity residuals.

This verifies an independently written implementation of the paper's optimization core, not reproduction of the original numerical figures. The running 32-channel K=2 sweep is an original-dimensional reduced Monte Carlo experiment; the paper uses 1000 trials per configuration and K=2,4,6. SSP, QPSK finite-block/receiver experiments, original author random seeds and solver tolerances remain outside the established result.

No implementation file was modified by this reviewer. Review scripts and outputs are contained in this review directory.

## Equation-by-equation audit

- Eq.10 uses a(theta)^H R a(theta); the half-wavelength ULA steering used in code is consistent with the paper setup
- Eq.12 includes all 1801 equally spaced points from −90 to +90 degrees inclusive, at 0.1-degree spacing. The target mask has three inclusive 10-degree beams at −40, 0, +40 degrees, for 303 mask samples
- Eq.13 uses 2/(P²−P)=1/3 times the three unordered pair cross-correlation squared magnitudes. Real and imaginary residuals are both present. It is not only a beampattern-MSE surrogate
- Eq.14 uses wc=1; Eq.15 enforces a Hermitian PSD covariance with each antenna power Pt/M=.1 and free real alpha. The exact thin QR preserves the complete quadratic objective; it does not discard small eigenvalues
- Eq.32 enforces R PSD, every Rk PSD, R−sum(Rk) PSD, per-antenna equality, and (1+Gamma)s_k >= Gamma(t_k+noise). The implementation divides both sides by max(1,Gamma), preserving the feasible set and extending the Gamma=0 limit without division by zero
- Eq.33 computes w_k=Rk h_k/sqrt(h_k^H Rk h_k). Eq.34 factors the remaining PSD covariance. An eigenvalue-based square root is mathematically equivalent to Cholesky here and handles singular optimal covariances; clipping is limited to reported numerical negative eigenvalues, with recovered covariance and SINR checked afterward
- Eq.40 jointly optimizes R, alpha and p under H R H^H=diag(p), per-antenna equality, PSD and p>=Gamma*noise. This is the paper's optimized ZF; it is not a channel-pseudoinverse baseline
- Eq.42 forms a complete QR of (H L)^H, fixes column phases so the diagonal gains are nonnegative, and appends K zero columns. The result is M by (M+K), with K communications columns followed by M radar columns
- Source settings M=10, Pt=1, noise variance .01, independent CN(0,1) channel entries and Gamma in dB converted by 10^(Gamma/10) are correct

One source-text inconsistency should not be propagated: the paragraph after Eq.40 says radar loss decreases as Gamma increases, but the nested feasible sets imply that the **minimized radar loss is nondecreasing** with Gamma. The surrounding discussion of looser communication constraints is consistent with this correction. Eq.46 beampattern distance from a particular radar-only optimum is a different metric and need not inherit every monotonicity statement about the optimized objective.

## Independent solve

`independent_review.py` does not import `reference.py`. It constructs full-grid vectorized steering maps, directly encodes the three cross-correlations, and solves Eqs.15/32/40 with SCS at eps=1e-8. It independently recomputes objectives, PSD/diagonal constraints, SDR inequalities, Eq.33 columns, ZF channel structure and the recovered physical SINRs.

For the original seed 2026101201 and Gamma=12 dB:

| Program | Independent full-grid SCS objective | Difference from initial Clarabel | Max CVXPY primal violation |
|---|---:|---:|---:|
| Radar-only | 0.313699143289 | −4.74e-9 | 1.60e-9 |
| SDR | 0.313699144385 | −4.75e-9 | 2.41e-9 |
| Optimized ZF | 0.313815602945 | −9.45e-9 | 8.25e-12 |

The full-grid SCS programs also agree with the reference's compressed-objective SCS smoke within 1.14e-8. Independent canonical checks use the actual exported SCS A,b,c,P,x,y,s, not just its status string:

| Program | max abs(Ax+s−b) | max abs(Px+A^T y+c) | primal−dual objective |
|---|---:|---:|---:|
| Radar-only | 1.59e-9 | 1.30e-10 | 1.02e-11 |
| SDR | 2.45e-9 | 2.79e-9 | 3.13e-11 |
| Optimized ZF | 2.08e-11 | 2.93e-11 | −1.35e-12 |

The tiny signed negative objective gap in the final row is floating-point residual, not evidence of an exact negative duality gap.

## Dual/KKT interpretation

The installed CVXPY version is 1.9.3. Inspection of `Complex2Real.invert` confirms that it already applies the factor of two when mapping the realified PSD dual to the exposed complex dual. Therefore the exposed multiplier enters Hermitian stationarity with factor **1**. Applying another factor 2 is wrong for this environment; the script retains that calculation only as a negative control.

Independent full-grid objective gradients reproduce the compressed-objective SCS smoke covariance stationarity norms:

- Radar 2.40e-7
- SDR 5.62e-7, with worst Rk stationarity 8.88e-8
- ZF 4.96e-8

The initial Clarabel smoke has small primal residuals but exposed duals with appreciable non-Hermitian components; one SDR multiplier has norm(Z−Z^H)=.088. This cannot be attributed purely to solver accuracy: the block-extraction issue below can invalidate exposed-dual diagnostics. Its near-identical independently verified objective supports the primal answer, but these exposed duals should not be described as a tight optimality certificate.

The script also computes conservative supporting-hyperplane lower bounds using the reduced objective min_alpha Lr(R,alpha), the returned multipliers, stationarity-residual minimum eigenvalues, and trace bounds trace(R)=Pt and trace(Rk)<=Pt. These are numerical bounds, not interval-arithmetic certificates. For the compressed SCS smoke, objective minus computed lower bound is about 1.23e-7, 4.93e-7, and 2.89e-8 for radar, SDR and ZF respectively.

## Recovery stress tests

`test_reference.py` calls the reviewed routines without modifying them. All 71 checks pass:

- Random complex Hermitian matrices, including non-Toeplitz cases, agree between direct full-grid objective and exact QR compression
- The Hermitian coordinate basis reconstructs random matrices
- Eq.33 preserves each desired user's signal power and gives PSD rank-reduction remainders for K=2,4,6, starting from full-rank Rk
- Eq.34 recovers the full covariance
- Eq.42 recovers exact positive diagonal channel gains and zero radar leakage for K=2,4,6, with singular rank-K and full-rank covariances

## Reporting requirements for the sweep

The frozen validation plan appropriately separates solver status, numerical acceptance and feasibility outcomes. Recovered-SINR and dual gates do reject some `optimal` SCS results, especially at high Gamma. Keep all primary outcomes. If an accuracy-refinement pass is added, freeze and disclose its separate policy and retain the original outcomes.

Use paired accepted cases with explicit denominators for radar/SINR/rate averages. Feasibility and numerical-rejection counts must use all original trials. A solver `infeasible` status is a numerical solver outcome, not a hand-proved impossibility. Do not interpolate over rejected cases or silently count them as feasible. Nonuniqueness of the SDR covariance decomposition can change recovered rates/SINRs without changing the optimal radar loss, so agreement of covariance objectives alone does not establish the exact original rate curves.

## Files and reproduction

Use the supplied isolated Python environment with NumPy, SciPy, CVXPY, SCS and Clarabel:

- `independent_review.py`: independent full-grid solver, recomputation and dual diagnostics
- `independent_review.json`: original Clarabel smoke audit and initial independent solves
- `independent_review_scs.json`: compressed SCS smoke audit and independent full-grid/canonical comparisons
- `test_reference.py`, `algebra_tests.json`: 71 algebra checks
- `high_gamma_review.py`: separately targeted stricter full-grid check at trial 006, Gamma=22 dB

## Important high-Gamma finding: complex-dual extraction

A separately targeted full-grid SCS eps=2e-9 solve of trial 006 at Gamma=22 dB returned objective 0.3498318710835182, only −4.66e-11 from the primary compressed solve. It took 58,750 iterations. Direct recovered minimum SINR was 21.9999984123 dB (relative shortfall 3.66e-7), comfortably inside the frozen 2e-5 relative gate. Maximum primal violation was 2.32e-9; canonical maximum dual residual 1.12e-9; objective gap 4.28e-11.

Despite that excellent canonical certificate, CVXPY's exposed complex multipliers gave covariance stationarity about .05 and a purported negative PSD-dual eigenvalue about −.003. This discrepancy is an actual dual-unpacking artifact, not merely uncertainty about the factor of two.

For a realified constraint T(R)=[[ReR,−ImR],[ImR,ReR]], partition its real symmetric dual D into D11,D12,D21,D22. The exact adjoint is

Z = D11 + D22 + i(D21 − D12).

CVXPY 1.9.3's inverse reduction exposes 2(D11+iD21), implicitly assuming D11=D22 and D21=−D12. Arbitrary valid real-cone duals need not satisfy those assumptions, especially with redundant structure. The full-block expression is Hermitian and PSD whenever D is PSD and satisfies Re tr(Z^H R)=tr(D T(R)).

`check_dual_mapping.py` performs a fresh compressed SCS solve and stops inversion immediately before Complex2Real. On the same canonical trial-006/Gamma-22 solution, applying the exact full-block adjoint gives covariance stationarity 6.49e-9 and Rk stationarity 6.74e-9 and 7.74e-9, with minimum dual eigenvalues no worse than −3.66e-15. This verifies the artifact directly.

The supplementary `refinement.py` formulation was reviewed read-only. Its explicit Hermitian real coordinates, real PSD cones and PSDDual full-block adjoint are correct. This is an equivalent convex optimization formulation, not a changed objective or relaxed primal constraints. The original exposed-dual rejections must remain in the primary record, but should be labeled by cause; supplementary correct-adjoint certification is a valid way to distinguish numerical failure from an extraction artifact.

Added artifacts: `high_gamma_review.json`, `check_dual_mapping.py`, `dual_mapping_check.json`, and `audit_sweep.py`. The primary and supplementary sweeps are still in progress at this checkpoint; final review will be appended rather than inferred from partial outputs.

## Completed primary-sweep audit

All 704 primary records are present: 32 paired channels × 11 thresholds × 2 methods. Independent re-evaluation confirms:

- Objective discrepancy at most 1.62e-14 against direct 1801-angle pattern-plus-cross loss
- Recovered SINR discrepancy at most 5.43e-12 in linear units
- Exact channel-byte consistency across each trial's two methods and all Gamma values
- No accepted record fails the independently recomputed recovered-SINR gate

| Method | Accepted | Numerical gate rejection | Solver-infeasible | Total |
|---|---:|---:|---:|---:|
| SDR | 244 | 104 | 4 | 352 |
| Optimized ZF | 347 | 0 | 5 | 352 |

Of the 104 SDR numerical rejections, 103 were solver-status `optimal` and one was `optimal_inaccurate`. Gate rejection is intentionally distinct from solver infeasibility. Some rejections concern realification-dual extraction artifacts described above; others concern physical recovered-SINR or other numerical residuals. The worst accepted relative recovered-SINR shortfall is 1.999e-5, consistent with the predeclared 2e-5 tolerance. The worst accepted covariance eigenvalue is about −1.74e-6, consistent with the predeclared −2e-6 tolerance: these are numerical-feasibility claims at those tolerances, not exact-arithmetic feasibility.

See `sweep_audit.json` for the full independent per-record audit. Any supplementary/refined aggregate still requires its own final audit.

## Independently checked near-boundary infeasibility

Trial 006, Gamma=24 dB was not resolved by the primary SDR solve or the initial objective-refinement attempts. A separate exact-feasible-set phase-I program maximizes the common scaled SINR margin delta; original feasibility requires its maximum to be nonnegative.

`audit_phase_one.py` independently recomputes the exported primal and dual evidence. After normalizing every dual multiplier by sum(lambda)=1.0000000080367, the coefficient of the unbounded margin variable cancels exactly. The dual constant is c=2.0108004518e-5. Covariance-stationarity operator residual norms are 2.5509e-8, 3.1339e-8 and 3.3588e-8. All normalized cone duals are PSD to numerical precision and all scalar inequality multipliers are positive.

Since every feasible covariance is PSD with trace(R)=Pt=1 and trace(Rk)<=Pt, a conservative residual-adjusted lower bound on the minimized negative margin is

c − Pt*(||E_R||op + sum_k ||E_Rk||op) = 2.0017567730e-5 > 0.

Consequently the maximum common margin is at most −2.0017567730e-5. This establishes requested-threshold infeasibility to the reported numerical-certification precision, rather than merely relabeling a solver timeout/error. The directly returned margin is −2.0109466009e-5, consistent with this bound. This remains a numerical certificate, not an interval-arithmetic proof. Full independently recalculated values and the exact input hash are in `phase_one_audit.json`.

## Final supplementary and aggregate audit

All 135 supplementary attempts are retained. Independent physical and objective re-evaluation found no discrepancies affecting acceptance. Their reported objectives match direct full-grid evaluation within 5.00e-15, and recovered SINRs within 5.55e-12. The proper full-block dual diagnostics agree with independent gradients; accepted supplementary solutions have covariance stationarity at most 2.05e-7.

The first-accepted-attempt selection rule was independently reconstructed, and all 694 final accepted solutions were directly checked. Final outcomes are:

| Method | Numerically accepted | Independently certified infeasible | Unresolved | Total |
|---|---:|---:|---:|---:|
| SDR | 347 | 5 | 0 | 352 |
| Optimized ZF | 347 | 5 | 0 | 352 |

The infeasible cases are the same five channels at Gamma=24 dB: trials 0, 6, 9, 20 and 22. Separate residual-adjusted phase-I bounds for the larger SDR feasible set are positive for all five; their infeasibility also establishes infeasibility of its ZF-constrained subset. The conservative lower bounds on negative maximum margin are respectively .00199528, .0000200176, .00169198, .00203707 and .00178816. They are numerical certificates under explicitly checked residual and cone bounds.

Performance summaries use 32 paired accepted channels at Gamma=4 through 22 dB and 27 paired accepted channels at 24 dB. Independently recomputed means, Monte Carlo standard errors and every 5000-resample bootstrap interval agree with `summary.json` within 2.14e-14. Bootstrap intervals are conditional on accepted channels; they do not remove threshold-dependent selection effects or turn 32 trials into the paper's 1000-trial study. The frozen primary index hash is unchanged.

The generated figure was visually inspected. Its title discloses M=10/K=2, 32 paired channels, no SSP and reduced scope. Low-Gamma Eq.46 values around 1e-14 should be understood as numerical agreement with the radar-only optimum, not a physically meaningful gain quantified to that precision. The remaining limits are unchanged: no original 1000-channel sweeps, K=4/6 performance curves, SSP comparison, finite-block receiver experiments, browser execution, or measured browser latency.

Final reviewer artifacts: `refinement_audit.json`, `final_selection_audit.json`, and five `phase_one_audit_trial_*.json` files. No source/formulation/recovery error remains open in this bounded reference experiment. The complex-dual extraction defect was isolated and correctly addressed by the separately declared equivalent real-cone formulation; original attempts remain available.

## Re-running this review

Place this directory alongside `joint-beamforming-reference`, or set `JOINT_BEAMFORMING_REFERENCE_ROOT` to the reference directory. Use its declared compatible scientific Python environment. From this review directory run:

```
python independent_review.py
python independent_review.py --input smoke-scs.json --output independent_review_scs.json
python test_reference.py
python high_gamma_review.py
python check_dual_mapping.py
python audit_sweep.py
python audit_sweep.py --refinement
for t in 0 6 9 20 22; do python audit_phase_one.py --trial "$t"; done
python audit_final_selection.py
```

The full-grid high-Gamma strict solve may take substantially longer than the smoke tests. Single-thread BLAS settings were used for reproducible resource usage. These commands write only review outputs; they do not edit the reference implementation.
