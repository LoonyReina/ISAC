# Proposed bounded browser optimizer, after the reference gate

Status: proposal only. No browser algorithm implementation or browser latency claim is established by this reference package. Python timings are not UI control-to-result latency.

## Actual computation to port

A Web Worker can solve the covariance QSDPs for an edited H and Γ. Use the same Hermitian coordinates, original 1801 angular samples (or a declared smaller grid only if later necessary), compact exact quadratic objective, linear per-antenna/SINR/ZF constraints, and PSD cones. After optimization, run the paper's constructive SDR rank reduction or phase-correct row QR and recompute all physical metrics. Stored reference JSON is suitable for regression checks and an explicitly historical evidence panel; it must never masquerade as a fresh solve.

Two credible implementations should be benchmarked before picking one:

1. Locally bundled, license-verified SCS WebAssembly build from the official solver source, preserving its homogeneous self-dual embedding, dual residual, objective gap, and infeasibility certificates. This is the strongest correspondence with the independent reference. A deployable bundle, build provenance, sizes and browser support must be verified; this package does not assert that one is presently available.
2. An in-repository real-Hermitian conic QP splitting solver in JavaScript. Express `min 1/2 xᵀPx` with affine equalities/inequalities and a product of PSD cones, then use a convergent proximal ADMM or primal-dual splitting method. An ADMM x-step factors the constant regularized quadratic/affine system once per run; cone steps project scalar inequalities and Hermitian PSD blocks. PSD projection needs an independently tested complex Hermitian eigensolver or real embedding. SDR requires the R, Rk and residual-covariance blocks; ZF requires R plus linear H R Hᴴ constraints. A general solver must optimize every iteration, not interpolate a precomputed table. An iteration/time cap can yield “not converged”; it cannot itself establish infeasibility.

Start with M=10/K=2 and one channel at a time, bounded Γ4–24 dB. Benchmark default, active high-Γ, rank-deficient H, zero/weak channels, and infeasible cases. Use a fixed maximum iteration/time budget documented with residual thresholds. Do not set a latency promise until those browser measurements exist. The full 1000-channel benchmark remains batch work.

## Numerical acceptance before UI

- Cross-check fresh random channels, edited complex entries, threshold endpoints, and active/inactive constraints against independent Python solutions, including both algorithms
- Compare objective, diagonal power, PSD residuals, primal/dual residuals and gap, then recovered-factor covariance, SINR, and ZF leakage
- Where optima are nonunique, compare feasible objectives and invariant constraints rather than requiring identical Rk, Wc/Wr or SDR sum rate
- Preserve separate `optimal/accepted`, `iteration-limit`, `numerical-rejection`, `infeasible-certificate`, and `cancelled` outcomes
- Never normalize or clip a materially invalid covariance into an apparently valid answer. Report every permitted tiny negative-eigenvalue correction and revalidate the factors afterward
- Export complete H, dimensions, units, solver/version/settings, seed, source/core hashes, iterations, timing, objective parts, factors, and residual gates

## Interaction and teaching contract

Changing a control invalidates the previous result immediately. Give runs monotonically increasing IDs; discard older worker messages, cancel an older run, and keep failed/new inputs from displaying stale “success.” Provide progress and an explicit run button for nontrivial changes. Reset, rapid repeated changes, cancellation, repeated solve and invalid inputs need tests.

Teach the actual sequence: source streams → covariance budget → radar objective/SINR constraints → constrained solver iterations and residuals → SDR rank reduction or ZF row QR → recovered communication/radar powers. Compare actual optimized SDR and ZF with the same solved radar-only reference. Retain the older analytic A/B/C page as a separately labeled prerequisite if useful; it cannot stand in for this algorithm.

## Remaining acceptance work

Implement/validate one credible numerical core; benchmark median/p95/worst control-to-result latency on actual supported browsers, including the largest allowed domain; integrate the UI; run site regression and browser interruption/accessibility checks. Until then, `liveExecution=prerequisite-only` (or `in-progress` only after real port work starts) and `latency=not-measured` remain accurate.
