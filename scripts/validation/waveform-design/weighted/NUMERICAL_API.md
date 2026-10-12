# Independently accepted JavaScript core: source-equivalent weighted Eq.(16)

Accepted core file: `weighted-core.js`. No UI, Worker or shared repository changes. Reference Python v3 SHA256 5871d0a8ae481a723f662c120e87e24f8ef8534ebc5d88c8a63ce9bea987e880 is frozen and independently accepted for optimization only. The original Fig.3 weighted-curve discrepancy remains open.

CommonJS exports and standalone browser global `WeightedWaveformCore`:

    solve(H,S,X0,rho,Pt,{tieBreak:'canonical'|'radar-closest'})
    evaluate(H,S,X0,rho,Pt,X)

Complex entries are [real,imaginary]. Option defaults to canonical; unknown options reject. Inputs are copied and never mutated. LIMITS, VERSION, InputError and NumericalError are exported. No network, packages, fixture imports, random generation or lookup tables are used in the solver.

The same N≤32,K≤32,L≤128, entry magnitude≤10^6, E=0 or10^−12≤E≤10^12 limits apply. E=L Pt exactly, with negative/invalid Pt and rho rejected. Output-only cap rounding slack is separate from unchanged input cap. Irregular/ragged/nonfinite matrices and shape errors reject before computation. Zero energy solves the singleton directly.

## Numerical differences from Python

The source's complex Hermitian Q eigenproblem is represented exactly by the real symmetric matrix [[ReQ,−ImQ],[ImQ,ReQ]]. Each complex eigenvalue appears twice. V has 2N real rows, and [ReX;ImX] is solved as 2N×L. This retains the entire complex solution space and solves the same source matrix trust-region problem. Canonical nonunique completions may differ; compare objective and energy, and compare X only where uniqueness is established.

A cyclic real Jacobi eigensolver computes all eigenvectors, with residual and orthogonality checks. Bisection solves the same monotonically decreasing secular equation using t=λ+λmin, retaining tiny nonzero projections on the regular branch. There is no generic optimizer or post-hoc rescaling that changes the communication component.

Common objective normalization is max(E||Q||F,√E||G||F,tiny), rather than Python's spectral Q norm. The physical multiplier and returned objective are unscaled back. Eigenvalue and range thresholds use the actual real embedding dimension 2N; all thresholds are exported. Numerically clustered/near-hard results remain explicitly approximate to certificate tolerance, not exact algebraic branch claims.

Both canonical and separately labeled radar-closest hard-case rules follow the reference specification. The radar-closest option aligns the residual-energy completion with projected X0 in the selected numerical eigenspace. Zero/tiny projected reference falls back to canonical, exposes the threshold and secondary discrepancy bound, and retains nonuniqueness. Source-provenance ρ<1 remains regular in exact arithmetic.

## Certificate

Direct H X, weighted objective, per-user MUI, waveform distance, energy, received samples and covariance are recomputed from X. Equality energy, stationarity and the residual-based global lower bound must pass or the solver throws NumericalError. Nonfinite output throws.

The JavaScript lower bound includes eigensystem backward error explicitly: A+νI differs from Vdiag(q+ν)Vᵀ by at most ||A−Vdiag(q)Vᵀ||F+|ν| ||I−VVᵀ||F. Since q+ν≥0 in the reconstructed spectrum, this is a PSD-defect bound. It enters the approximate-KKT global-gap bound along with stationarity and energy residuals. The source dual diagnostic remains separate, especially when a numerical hard-case classification has a tiny range residual. This is floating-point evidence, not interval arithmetic.

Output status `certified` means the declared numerical checks passed for the submitted matrices. It does not certify the original figure, a sum-rate optimum, covariance preservation, constant modulus, radar detection performance, browser UI or deployment.

## Recompute cross-language checks

From the built-site root:

    OPENBLAS_NUM_THREADS=1 python3 scripts/validation/waveform-design/weighted/validate-core.py --core weighted-core.js --output /tmp/weighted-cross-language.json

The portable checker executes actual JavaScript X on26 fixtures and128 new seeded problems, then independently recomputes original objective, energy, PSD/KKT and the frozen Python optimum. Source fixtures are test-only and never part of the UI computation path. The independent JavaScript gate has accepted SHA25670f720a7f67f95b139f31171370d86e9e348bf9a91b4a0d0c38717a66cf5a6a3; see JAVASCRIPT-INDEPENDENT-REVIEW.md and javascript-review-summary.json. That gate excludes UI, browser and publication.
