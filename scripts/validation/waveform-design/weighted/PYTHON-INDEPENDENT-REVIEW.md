# Independent review: Section IV weighted waveform reference

Date: 2026-10-12

## Verdict

**The final Python optimization reference passes this independent mathematical and numerical review, including the optional radar-closest hard-case selection. The published Fig. 3 weighted curve has not been quantitatively reproduced.**

The computed source-parameter experiment is internally consistent, uses the stated resources, and demonstrates the intended tradeoff. However, its omnidirectional `rho=0.1` curve differs materially from the fixed source plot. This remains an explicit research limitation. It is not appropriate to label the computation a completed Fig. 3 reproduction or to claim whole-paper completion. Constant-modulus Section V, directional original target synthesis, and the detection experiments remain outside this acceptance.

This review does not inspect or approve a JavaScript port, live UI, repository changes, or publication.

### Frozen inputs

- Source: https://arxiv.org/pdf/1711.05220v1, Section IV, Eqs. (16)–(25), Algorithm 1; Section VI-A, Figs. 3–4
- PDF SHA-256: `e79052feb8fd898002a71c9b1f20fd75cb757159b6e92071e97812e85b62d798`, independently rechecked
- Accepted `reference.py` SHA-256: `5871d0a8ae481a723f662c120e87e24f8ef8534ebc5d88c8a63ce9bea987e880`
- Solver ID: `weighted-equality-trs-eigh-brentq-with-hard-case-completion-v3`
- Source PDF text and rendered pages 5 and 9 were independently inspected
- The existing separately validated strict-covariance solver was reused only to generate authentic reference waveforms; it was not rewritten

## 1. Mathematical findings

### Exact problem, dimensions, units, and provenance

The implementation solves

`min_X rho ||H X - S||_F^2 + (1-rho)||X-X0||_F^2`, with `||X||_F^2 = E = L Pt`.

`H` is K×N, `S` is K×L, and `X,X0` are N×L. Multiplication is `HX`, not `H^H X`. The source constraint is an exact energy sphere, not an inequality ball, fixed spatial covariance, or constant modulus. `Pt` is average total array power in the normalized model; `E` is block energy. No physical symbol duration is supplied, so a conversion to joules is unsupported.

The paper specifies `X0` as an optimum of its strict covariance problem for the **same** H and S, with positive-definite covariance R, trace(R)=Pt and L≥N. Arbitrary supplied X0 and L<N are useful generalized-objective tests but are not the original complete construction. The candidate discloses this distinction.

Expanding the objective gives `Q=rho H^H H+(1-rho)I`, `G=rho H^H S+(1-rho)X0`, and the required constant `c=rho||S||²+(1-rho)||X0||²`. Those expressions and the reported original objective are correct.

### Regular secular solve and global conditions

For positive energy, a global solution satisfies stationarity `(Q+lambda I)X=G`, sphere equality, and `Q+lambda I >= 0`. The sufficiency follows by subtracting objective values of two feasible waveforms: at exact stationarity the difference equals the quadratic form of `Q+lambda I` on their displacement.

With `Q=V diag(q) V^H`, the regular solution is `X=V diag(1/(q+lambda))V^H G`. Its scalar energy equation uses the **squared complex magnitudes** of V^H G. The fixed source's displayed scalar expansion omits modulus bars, but the preceding Frobenius expression determines the intended calculation. The implementation correctly uses magnitudes.

On `lambda > -q_min`, the secular power is strictly decreasing when G≠0. Brent's bracketed scalar root method solves the same equation that the source solves by a line search; this is an explicitly identified numerical substitution, not a different optimization problem. Negative multipliers are legitimate and are tested. Restricting lambda to nonnegative values would be incorrect for the equality problem.

The implementation's separate shifted variable `t=lambda+q_min` avoids subtractive cancellation near the PSD boundary. It does not clip tiny regular denominators or erase tiny regular projections.

### Authentic strict reference implies regularity for rho<1

The author's proof is correct. Write an authentic strict optimum as `X0=sqrt(L) F U`, with F invertible and `U U^H=I`. Let `C=F^H H^H S`. The Procrustes optimum permits `C=P U`, P positive semidefinite, including rank-deficient C. Then

`F^H G = [rho P + (1-rho)sqrt(L) F^H F] U`.

For 0≤rho<1, the bracket is positive definite. Thus G has full row rank and its projection onto any nonempty eigenspace is nonzero. The regular secular root exists. This statement concerns exact arithmetic and positive energy; a floating-point implementation can classify a sufficiently tiny projection as numerically zero. Such classification must not be presented as a mathematical counterexample to this proof.

At rho=0, authentic feasible X0 is recovered. At E=0, the only feasible waveform is zero, and the usual finite-multiplier KKT condition need not apply because the equality gradient vanishes. The direct singleton treatment is correct.

### Hard cases and the scope of the endpoint extension

If G has no component in the minimum eigenspace, the boundary particular solution is `Xp=(Q-q_min I)^dagger G`. If its energy is below E, an orthogonal minimum-eigenspace component of energy `E-||Xp||²` is required. If the energy equals E, no completion is required. If it exceeds E, the solution is regular.

At rho=1 and rank-deficient H, this includes `Xp=H^dagger S` and completion in null(H). For full-row-rank H, zero MUI is achievable whenever `||H^dagger S||²<=E`. This occurs in the tested source N=16,K=4 regime. A pseudoinverse alone can violate the exact energy equality.

The source's printed Algorithm 1 and Eq. (23) display only the pseudoinverse term; they do not specify this nullspace component. The candidate's completion is a justified, disclosed boundary/generalized-reference extension. This does **not** invalidate the paper's regular algorithm, and authentic positive-definite strict provenance excludes exact interior hard cases for rho<1.

### Global bound and numerical claims

The candidate independently reports objective, energy, scaled stationarity, shifted PSD residual, range residual, source-dual diagnostic, and a residual-based objective lower bound. Re-derivation confirms the residual bound. It includes the possible small negative shifted eigenvalue, stationarity residual, and imperfect sphere equality; consequently it does not discard a tiny G component merely because a numerical rank decision calls it zero.

The source-dual expression at a numerically classified singular boundary is a diagnostic unless exact range consistency is established. The residual bound is the appropriate practical acceptance test there. All certificates remain floating-point evidence, not interval-arithmetic proofs.

## 2. Optional radar-closest selection

Canonical minimum-eigenspace completion remains the default. `tie_break='radar-closest'` is an explicit additional secondary objective, not an algorithm attributed to the source.

For an exact hard solution set `X=Xp+Vmin W`, let `e=E-||Xp||²` and `P0=Vmin^H X0`. Orthogonality reduces the secondary distance to a constant plus `||W-P0||²`, subject to `||W||²=e`. Cauchy–Schwarz gives the unique nearest completion `W=sqrt(e) P0/||P0||` when P0≠0. If P0=0, all completions are equally near. Zero completion and regular unique solutions require no tie selection.

The implementation follows this construction. If the reference projection is below a declared numerical threshold, it retains canonical selection and reports nonuniqueness **at that threshold**, plus a secondary-distance loss bound `4 sqrt(e) ||P0||`. The statement concerns the selected numerical eigenspace when eigenvalues/projections are only numerically clustered; exact nearest-primary-optimum language requires exact eigenspace and range assumptions. These qualifications are present.

This option materially improves endpoint teaching: at rho=1 the primary radar weight vanishes, and arbitrary canonical completion can produce a large radar-distance jump unrelated to a deterioration of the optimum communication objective. The preserved counterexample and separate option prevent that jump from being mistaken for a unique optimal tradeoff. For six new authentic source inputs, rho=1−1e−8 approached the radar-closest endpoint, with maximum relative waveform difference 4.51e−7.

## 3. Independent tests and findings

The reviewer did not simply rerun author-selected tests. Fresh cases use seeds 202610121326 and 202610121333. Candidate outputs were compared with separate methods and independently recomputed quantities.

### Final primary solver

- 146 fresh inputs: authentic non-isotropic strict references, generalized supplied references, zero energy, negative multipliers, repeated minima, hard/boundary/regular endpoints, near-hard projections, and source N=16,K=4,L=20 cases
- All 146 pass independently recomputed objective, energy, stationarity, PSD, and global-bound checks
- Maximum relative energy residual: 1.67e−15
- Maximum independently reconstructed relative bound gap: 9.25e−14
- 36 independently constructed **full real lifted primal SDPs**, solved by CVXPY/Clarabel, agree to at most 3.51e−10 relative objective discrepancy
- 10 diagonal near-hard cases compared with a separately written 100-decimal-digit scalar oracle; largest absolute objective discrepancy 9.98e−16
- 16 two-sided unitary transformation tests pass; largest regular-waveform equivariance error 8.18e−14
- All 275 stored author outputs independently pass metric/KKT/bound recomputation. The stored author records contain 3,288 rivals and 75 successful SLSQP runs; these are verified record counts, not claimed as new reviewer runs

Six additional paper-sized Schur-complement dual SDPs agree within 7.91e−8 relative. Clarabel marks all six `optimal_inaccurate`; cone residuals and warnings are retained. These are supplementary consistency checks, not high-precision dual certificates. They ran against v2; the six canonical waveforms are among the 146 outputs verified unchanged in v3.

### Secondary option

- 56 new cases, including exact/tiny zero reference projection, repeated positive minimum eigenvalues, interior arbitrary-reference cancellation, zero completion, regular solutions, and authentic source endpoints
- 78 independent real equality-SLSQP secondary solves
- 2,160 feasible primary-optimal nullspace rivals
- Maximum relative secondary objective discrepancy from the separate known/null(H)-space oracle: 2.89e−15
- Maximum relative nearest-waveform error: 2.28e−15
- All 146 v2 fresh canonical waveforms remain exactly numerically unchanged in v3

### Two issues found and fixed

1. **Zero-quadratic scaling overflow.** Valid rho=1, H=0 problems with E≥4 formed `E/tiny` before multiplying by zero, producing NaNs. The revised implementation multiplies before dividing and handles an exactly flat quadratic explicitly. E=4,10,10^12 regression cases now pass.
2. **Output cap rejected roundoff at maximum energy.** For scalar E=10^12, 30 of 301 complex reference phases produced a valid output whose computed magnitude was marginally greater than 10^6. Reapplying the strict input cap rejected those outputs. Generated-output validation now allows a small declared rounding allowance; input caps remain strict. All 301 independent maximum-energy phase tests pass, maximum energy residual 4.89e−16.

Original v1/v2 faults and corrected outcomes are retained in `regression-results.json`; the complete v2 review evidence is preserved in `v2-evidence/`.

## 4. Experiment review and remaining mismatch

Source settings were verified against the fixed PDF: N=16, K=4, L=20, Pt=1, iid CN(0,1) channels, unit-power QPSK, half-wavelength ULA, rho=0.1, and the visible Fig. 3 SNR grid −2:2:12 dB.

The reviewer independently regenerated all 256 seeded channel/symbol draws and recomputed the five methods' metrics, per-user Gaussian-log diagnostic, raw beampatterns, and aggregate means/standard errors. This is an experiment-evaluator audit using the already independently validated candidate solver, not a second independent optimizer.

- 1,280 metric blocks recomputed; largest absolute discrepancy 7.11e−14
- Rate discrepancy at most 5.33e−15; aggregate discrepancy at most 1.78e−15
- All 192 stored paired rho sweeps satisfy nonincreasing MUI and nondecreasing waveform distance
- Both canonical and radar-closest endpoint variants are separately labeled; the new rho sweep uses the radar-closest secondary selection and preserves the original canonical data

**Quantitative mismatch:** approximate blue-marker readings from the fixed rendered Fig. 3 give weighted-omni rates about 13.36 and 15.59 bps/Hz at 10 and 12 dB. The computed rates are 12.8821±0.0261 and 14.8313±0.0377 (Monte Carlo standard error). The discrepancies, about 0.48 and 0.76, exceed the conservative ±0.1 plot-reading uncertainty and the computed sampling uncertainty. By contrast, approximate strict-omni markers 10.56/11.64 agree with computed 10.5305/11.6260. Pixel locations and the simple reproducible approximate-reading procedure are preserved. These readings are not exact recovered figure data.

The fixed source does not resolve the difference in its implementation/normalization convention. No parameter was tuned to fit the plot. The paper's unknown seed/trial count and original ZF receiver-gain convention remain open, but they must not be used to imply that the weighted discrepancy has been explained.

Interpretation limits are correctly stated: the reported log formula is a Gaussian-style diagnostic, not QPSK mutual information, BER, throughput, or the objective actually optimized. Waveform distance is not beampattern MSE or detection probability. Raw same-power beampatterns must not be independently peak-normalized. The disclosed equal-power pseudoinverse comparator is not established as the paper's exact ZF implementation.

## 5. Reproduction and files

The existing official-package solver environment was reused. No packages, external accounts, credentials, remote tasks, repository files, or deployed pages were changed.

From this review directory, use the Python executable in `../atomic-receiver-reference/.venv/bin/python`:

1. `python independent_review.py`
2. `python review_tie_break.py`
3. `python review_regressions.py`
4. `python review_experiments.py`
5. Optional supplementary large-cone check: `python source_dual_sdp.py`

Key machine-readable results are `independent-results.json`, `tie-review-results.json`, `regression-results.json`, `experiment-review-results.json`, and `source-dual-sdp-results.json`. All newly generated primary and secondary fixture inputs and complete candidate outputs are included. Python 3.12.14, NumPy 2.3.5, SciPy 1.17.0, CVXPY 1.9.3, and mpmath 1.3.0 were used. See `manifest.json` for hashes.
