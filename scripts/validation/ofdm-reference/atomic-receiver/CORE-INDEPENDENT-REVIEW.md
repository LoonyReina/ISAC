# Independent CS-ANL1 source and numerical-core review

Review date: 2026-10-12 UTC. Review scope: fixed-source formulation, preserved independent Python evidence, new common-input solves, actual JavaScript numerical core, and actual worker logic executed in Node worker threads. No repository/site edits, publication, detector implementation, or browser interaction was performed by this review.

## Decision

**Pass for the bounded finite-SDP numerical core at the exact hashes below.** Two false-convergence defects found during review were fixed and their regressions now pass. This decision does not establish browser/UI readiness, original-paper figure reproduction, or unconditional equality between the finite 2-D SDP and the continuous atomic norm.

- Core: `3d5656febab24737613e135946aada744d6083c93d5fe9d722b4f6ac2d568d14`
- Worker: `3ae8a8d4620690330fa358d37557039d330e84b38db7434bc0f831743424344f`
- Runtime version label: `atomic-eq27-js-v0.1-pre-review`
- Execution used for JS tests: Node v24.19.0, not browser timing
- 78 original reference files matched the pre-port `REFERENCE-FREEZE.json`

A subsequent code or version-label change needs an updated hash and rerun of affected tests. The tested worker version handshake checks the runtime label; it is not a cryptographic code-identity check. Deployment should preserve exact artifact identity and avoid mixing old worker/core assets.

## Source and mathematical formulation

Inspected the preserved [arXiv:1610.04218v2](https://arxiv.org/pdf/1610.04218v2), including its Eq. (21), Eq. (27), Eqs. (34)–(50), Table I, observation model, and simulation settings. Pages 14–15 were also inspected as rendered images. Inspected Theorem 1 and §IV-C of the cited [arXiv:1505.02510v3](https://arxiv.org/pdf/1505.02510v3).

The implemented convex problem is the actual finite two-level-Toeplitz Eq. (27):

minimize 0.5‖r−e−Sz‖² + λ tr(T)/(2MN) + λt/2 + μΣ|eᵢ|,
subject to [[T,z],[zᴴ,t]] positive semidefinite and T two-level Toeplitz.

There is no frequency dictionary or discretized-frequency proxy in either the ADMM optimization or this review’s independent CVXPY model. The latter uses a full Hermitian (MN+1)×(MN+1) variable and explicit equality constraints between every pair of equal-lag entries, independently of the reference’s shift-invariance constraints and ADMM lag operator.

Confirmed conventions:

- Column-major signal index i=m+Mn and lag Tᵢⱼ=U_(m−p,n−q); rectangular 3×4 tests prevent an unnoticed square-only transposition
- Atom exp(2πi[mφ−nψ]) has squared Euclidean norm MN; λ/(2MN) trace normalization is preserved
- Complex symbol multiplication is diagonal S, and z updates use conjugate(S). The printed Eq. (43) unconjugated right-hand side is inconsistent with Eq. (40) and the objective
- Lag averaging divides by (M−|k|)(N−|j|); it is the least-squares inverse, not the raw Frobenius adjoint
- Trace regularization is subtracted at the central zero-lag coefficient, with magnitude λ/(2MNρ)
- CS-AN fixes e=0; free e with μ=0 is correctly rejected as degenerate

The exact joint block update is justified directly. Let a=θ+g/ρ, β=2ρ, q=|s|² and w=β/(q+β). Eliminating z in each sample’s quadratic leaves 0.5w|r−sa−e|²+μ|e|. Therefore e=soft(r−sa, μ/w), followed by z=[conj(s)(r−e)+βa]/(q+β). This is an objective-faithful realization of the joint minimization in Eq. (35), not a literal implementation of the lagged simultaneous z/e steps printed in Table I.

For multiplier G on Θ−B, projection is ΠPSD(B−G/ρ), multiplier update is G←G+ρ(Θ−B), and stationarity gives ν=conj(s)(r−e−sz)=−2G_(top,last). The source audit’s correction to the printed −g/2 is consistent with the objective. Dual peak magnitude is λ, equivalently squared magnitude λ².

## Finite-SDP exactness boundary

The multidimensional Toeplitz construction provides a lower bound to the continuous atomic norm in general. A valid Vandermonde decomposition of the optimum can certify equality; rank(T)<min(M,N) is a sufficient decomposition condition in the cited theorem. A larger numerical rank does not prove inequality, but does not establish equality by that sufficient condition. Finite-precision low rank is numerical evidence, not an exact theorem-level certificate.

Accordingly this review approves a solver for the actual finite Eq. (27), not an unconditional exact continuous-atomic-norm solver for every 2-D instance. An extraction grid is also not a certificate of the continuous dual inequality. No support size, true K, true path parameters, or simulator seed is accepted by the receiver input contract.

## Independent numerical checks

### Nine new common-observation cases

The observations were generated outside the receiver using a new review seed, then frozen before JS replay. Included source-model signal-dependent QPSK errors, phase-rotated observations, arbitrary complex data, mixed/all muted symbols, rectangular QAM, an analytic off-grid single atom, a large-μ case equivalent to fixed-e CS-AN, and zero data. Muted/arbitrary cases are explicitly algebraic stress tests, not the paper’s experiments.

- All nine Python ADMM runs converge and independent full-matrix SCS solves return optimal
- Maximum Python/SCS objective difference: 6.3491×10⁻⁹
- Maximum relative predicted-observation difference: 1.6737×10⁻⁷
- Final-hash JS matches every Python convergence iteration count
- Maximum JS/Python objective difference: 1.6820×10⁻¹⁴
- Maximum JS/Python z-vector difference: 2.4256×10⁻¹²
- Recomputed objectives, Toeplitz/Hermitian structure, PSD minimum eigenvalues, primal residuals, stationarity, and declared stopping thresholds pass
- Maximum difference between reported and independent lifted minimum eigenvalue: 7.080×10⁻¹⁴

The JS projection embeds each complex Hermitian matrix H as [[Re H,−Im H],[Im H,Re H]], performs symmetric Jacobi eigendecomposition and negative-eigenvalue clipping, and reconstructs the complex projection by averaging the duplicate blocks. This is the correct real representation; no scale-factor correction is omitted.

### Thirty-eight direct PSD cases

Independent NumPy eigendecompositions cover dimensions 1, 2, 5, 13 and 17; zero, positive/negative/tiny/repeated eigenvalues; rank-one and ill-conditioned spectra; pure-imaginary off-diagonal entries; very small/large scales; and deliberate non-Hermitian input followed by Hermitianization.

- 38/38 pass
- Worst normalized projection discrepancy: 8.934×10⁻¹⁴
- Worst normalized idempotence discrepancy: 7.104×10⁻¹⁴

These numerical tests support this bounded implementation; they are not a proof for arbitrary floating-point magnitudes or unlimited dimensions.

### Twenty-one API/terminal-state guards

All pass at the final hash. They cover rejected loose/nonfinite eigensolver tolerances, huge finite inputs with fixed/free errors, eigensolver failure, nonfinite observations, dimension cap, forbidden truth/seed inputs, μ=0 semantics, cancellation/max-iteration terminal behavior, and immutable snapshots. Failed iterations are terminal `numerical_failure`; later `step` calls do not resume them.

### Twelve worker-logic checks

The actual `worker.js` was run unchanged through its reviewed Node worker-thread adapter. All pass: version mismatch, truth rejection, cancellation, supersession, duplicate/stale IDs, iteration-cap status, both false-convergence regressions, eigensolver failure, successful solve after errors, and invalid requests preserving an already active valid job.

This is a nonbrowser logic gate. It does not verify a real browser’s Worker scheduling, UI result rejection, page lifecycle, control latency, network/cache behavior, or the user’s desktop performance. No headless or other browser was launched by this review.

## Defects found and resolved

### AR-CORE-001: loose projection tolerance caused false convergence

At initial hash `06ce5a23dfbc71094a18c1335ba4685ac5a060d16875ff09e278d4f0a6451df0`, the analytic atom with eigTol=1 was reported converged after 199 iterations at objective 4.746399945, versus independent optimum approximately 0.369924126. The embedded eigen residual was approximately 61.62. Accepted tolerance was so loose that necessary rotations were skipped.

Fixed by requiring the validated eigTol=10⁻¹² and explicitly requiring projection accuracy relative to the ADMM stopping thresholds. Regression now rejects the offending setting instead of reporting success.

### AR-CORE-002: overflow made Infinity≤Infinity pass convergence

At intermediate hash `ad113658c4af6a90b663bc9020a314666e12c5f35e9b3924cfe4cf9149972163`, scalar r=10¹⁶⁰, s=1, λ=.49, μ=.12, fixedError=true and maxIter=1 produced status converged with infinite objective, primal residual, eigen residual and tolerances. Squared norms had overflowed even though the input values were finite.

Fixed by checking eigensolver scale and all convergence diagnostics for finiteness, rejecting unresolved soft-threshold regularization at extreme floating-point scales, and making iteration failure terminal. Fixed/free-error tests at 10¹⁶⁰ and 10²⁰⁰ now fail explicitly rather than claim convergence. This is a dynamic-range guard, not a claim of supporting such scales.

Full original counterexamples and fix disposition are retained in `REVIEW-FINDINGS.json`.

## Preserved 16×16 evidence independently recomputed

The first run remains `time_limit`; the later continuation remains distinct. Total recorded robust run: 20,170 iterations, 596.448718 seconds. Recomputed objective 0.9412299922757836 matches the stored result; SCS objective 0.9412301226869609 gives cross-solver difference 1.304111773×10⁻⁷.

Recomputed primal residual is 3.15793×10⁻⁷, lifted minimum eigenvalue −1.19782×10⁻⁷, and z-stationarity residual 2.26696×10⁻⁹. Independently checked the repaired primal/dual certificate arrays, moment equalities, PSD eigenvalues, dual linkage and error infinity bound:

- Numerical feasible lower: 0.9390629432097534
- Numerical feasible upper: 0.9412300374438602
- Remaining finite-SDP gap: 0.002167094234106881

The 1.304×10⁻⁷ solver difference is not this gap or an error bound to the exact optimum. The repaired interval is floating-point evidence, not exact interval/rational certification, and does not certify continuous atomic-norm equality.

## Gates that remain open

1. Actual supported-browser Worker, cancellation, stale/superseded presentation, interruption/reload, input/export, and desktop latency/memory checks
2. Complete declared detection and support-extraction protocol, thresholds, false-alarm/miss denominators, conditioning of gain recovery, and non-oracle MUSIC model-order choice
3. The complete Fig. 8 100-realization × 11-BER × 2-scenario experiment with all methods and retained failures; the original-size CS-AN ablation remains time-limited
4. Original M=16,N=64 figures and separate waveform-level Doppler/ICI validity tests
5. Any exact multidimensional atomic-norm/decomposition claim beyond the finite SDP

The source observation approximation, source-update corrections, genuine reduced dimension, offline original-size evidence, and above boundaries must stay visible in subsequent lesson/UI work. In particular, a scene slider must not imply recomputation of the offline 16×16 checkpoint.

## Reproduction artifacts

- `independent_checks.py`, `fresh-inputs.json`, `fresh-python-results.json`: new common inputs and independently parameterized SCS references
- `replay_js.js`, `fresh-js-results.json`, `compare_js.py`, `js-crosscheck.json`: exact final-hash numerical replay and independent recomputation
- `psd_fixtures.py`, `psd-inputs.json`, `check_psd.js`, `psd-results.json`: independent PSD fixture gate
- `check_guards.cjs`, `guard-results.json`: settings, numerical failure, cancellation and state-isolation checks
- `check_worker.cjs`, `worker-results.json`: actual worker logic in Node; no browser inference
- `check_preserved.py`, `preserved-evidence-check.json`: original-size frozen numerical evidence verification
- `REVIEW-FINDINGS.json`, `REVIEW-FREEZE.json`: defects, disposition, and reviewed artifact identities
