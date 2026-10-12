# Independent JavaScript review: weighted Section IV core

Date: 2026-10-12

## Verdict and identity

**Accept the actual JavaScript numerical core for its declared bounded Section IV objective, including both hard-case selections.** This is a separate stage from the accepted Python reference. It does not accept a browser UI, Worker integration, figure reproduction, deployment, or the rest of the paper.

- Accepted file: `../waveform-weighted-reference/js-core/weighted-core.js`
- Accepted SHA-256: `70f720a7f67f95b139f31171370d86e9e348bf9a91b4a0d0c38717a66cf5a6a3`
- Accepted version: `weighted-eq16-real-jacobi-secular-v0.2`
- Initially reviewed SHA-256: `d6eda558e2817e070fdcd2ebf03f2849b4d7cb326ce08f0916da2e7ff5456f17`
- Frozen Python reference SHA-256: `5871d0a8ae481a723f662c120e87e24f8ef8534ebc5d88c8a63ce9bea987e880`
- Fixed source PDF SHA-256: `e79052feb8fd898002a71c9b1f20fd75cb757159b6e92071e97812e85b62d798`

The mathematical/source and original experiment review remains separately preserved at `../waveform-weighted-review/REVIEW.md`. In particular, the unresolved published Fig. 3 weighted-curve discrepancy is unchanged by this JS acceptance.

## Algorithm and certificate inspection

The implementation genuinely computes a fresh solution from H, S, X0, rho and Pt. It contains no reference-fixture lookup, network calls, stored waveform path, or copied strict-covariance solver.

Its real symmetric representation of the complex Hermitian problem is valid. For a complex X, stacking real and imaginary rows preserves its Frobenius norm and its real objective. The real matrix `[[Re Q,-Im Q],[Im Q,Re Q]]` duplicates each eigenvalue but preserves the full solution space. The implementation keeps all 2N real eigenvectors and all L columns, without an erroneous factor of two in the energy budget. Canonical completions may therefore differ from a complex-eigenvector implementation at nonunique endpoints.

A complete cyclic Jacobi decomposition is followed by a bracketed bisection of the source's secular energy equation. Common objective scaling differs from the Python implementation by using the Frobenius Q norm. This does not change the mathematical objective. Exact energy equality is checked on the returned X; there is no post-hoc rescaling of the pseudoinverse that would alter its observed communication component.

The implementation separately handles zero energy, singular-boundary/no-completion, positive hard completion, and the regular branch. It retains negative multipliers and repeated minimum eigenspaces. Canonical and radar-closest selections follow the same explicitly disclosed extension as the Python reference.

The PSD-defect bound is structurally justified. For computed A, V and q, the difference between `A+nu I` and `V diag(q+nu) V^T` is bounded by the reconstruction residual plus `|nu|` times the orthogonality residual. Since the reconstructed shifted spectrum is nonnegative, this controls a possible negative eigenvalue of the actual shifted A. The global objective gap includes that defect, independently evaluated stationarity, and energy error. The code does not pretend that reusing its eigenvalue list is an independent PSD certificate.

The reviewer recomputed the shifted spectrum from the original complex matrices using SciPy, checked that no negative eigenvalue exceeded the claimed PSD slack, reconstructed stationarity and objective, and compared the reported lower bound with independent optimum values. No bound failure was found in the tested inputs. These are floating-point certificates, not interval-arithmetic proofs.

## Independent fresh-input evidence

The actual CommonJS module was run with Node v24.19.0. Inputs were selected by this review after the author fixture suite was written. Both tie modes were executed; comparisons used the actual returned JS X rather than a wrapper's expected values.

### Primary objective and cross-language checks

Seed: 202610121344

- **195 new inputs, 390 actual JS solves**, all passing
- Arbitrary complex matrices; authentic same-H/S positive-definite strict references; zero symbols and rank-deficient H; source N=16,K=4,L=20; maximum simultaneous N=32,K=32,L=128; L<N generalized problems; zero/minimum/maximum energy; tiny and large coefficients; repeated minima; exact and near-hard cases
- Additional stress combines entries at the declared magnitude cap, all maximum dimensions, a rank-one channel, and both extreme positive energy limits
- **24 fresh full real lifted primal SDPs**, using CVXPY/Clarabel independently of either eigensecular implementation
- **24 two-sided unitary comparisons**, with unchanged source objective
- Input immutability verified after every actual solve
- Maximum relative energy residual: **4.55e−13**
- Maximum relative objective discrepancy from frozen Python: **2.56e−13**
- Maximum independently reconstructed scaled KKT residual: **9.78e−14**
- Maximum relative objective discrepancy from the fresh primal SDPs: **2.18e−10**
- Shifted-PSD defect underbounds found: **0**

The reviewer also independently recomputed received samples, per-user MUI, total MUI, waveform distance and covariance from each returned X. Covariance relative disagreement was at most 3.18e−16. Received-sample errors stayed below 0.008 of a conservative componentwise matrix-product forward-error allowance. This forward-error treatment matters when very large individual HX terms cancel; dividing only by a nearly zero final sample is not an honest floating-point comparison. Neither implementation is claimed to provide arbitrarily accurate residuals for severely ill-conditioned data.

### Secondary nearest-reference objective

Seed: 202610121348

- **41 further fresh inputs, 82 actual JS solves**
- Independent known-eigenspace or separately computed null(H) oracle, using `Xp=H^H(HH^H)^−1 S` when applicable
- **1,968 primary-optimal feasible rivals** with different nullspace completions
- Exact zero and tiny nonzero reference projections, repeated positive minimum eigenvalues/negative multipliers, and transformed complex cases
- **Six phase-equivariance comparisons** for unique radar-closest hard-case selections
- Maximum relative secondary distance discrepancy from the independent oracle: **2.71e−14**
- Maximum relative nearest-waveform discrepancy: **1.34e−14**
- **Three negative controls** changed returned X while retaining its metadata; independent checks correctly rejected all three

The secondary test does not demand entrywise agreement of arbitrary canonical completions. It checks energy, primary objective, nearest-reference distance when selected, and the disclosed zero-projection fallback.

### API, boundaries, and module behavior

- **3,123 new complex-scalar analytic cases**: 347 distinct phases, three energies including 10^−12 and 10^12, and three weights including both endpoints
- All pass; maximum relative analytic objective discrepancy 7.70e−15 and energy residual 7.74e−15
- **32 explicit matrix/parameter/option admission checks**, covering malformed pairs, sparse arrays, ragged shapes, empty inputs, nonfinite values, invalid weights, limits exceeded and exact admitted endpoints
- Six additional invalid-option-type checks pass
- Deep-frozen input arrays and options work, confirming the solver does not need to mutate inputs
- Exports and LIMITS resist mutation
- A standalone-global export loaded in a Node VM gives exactly the same non-timing output as CommonJS

The VM check is an export/packaging test, not a browser, Worker, screen, or UI test.

## Issue found and corrected

In v0.1 the pair validator used `Array.some`. JavaScript skips holes in a sparse array, so a missing real or imaginary coordinate could pass the initial check, enter numerical computation as NaN, and fail later as `NumericalError('Objective scaling overflow')`. This violated the documented malformed-input admission behavior.

It did **not** produce a falsely certified waveform. The issue was fixed in v0.2 by explicitly checking indices 0 and 1 as finite numbers. Missing-coordinate cases now raise `InputError` before arithmetic. The source diff contains only that parser condition and the version identifier; no numerical algorithm was changed. Original bytes, failing guards, and an independently rerun reproduction of the fault are retained under `revisions/v01/`. All final suites ran against the accepted v0.2 hash.

## Important teaching and integration conditions

1. **`certified` certifies numerical objective/energy conditions, not exact branch identity or waveform accuracy.** For authentic positive-definite strict X0, rho<1 is mathematically regular. A sufficiently small projection may nevertheless be classified as numerical-hard by the documented thresholds.
2. **Near-hard waveform agreement is weaker than objective agreement.** One fresh case, `authentic-54`, is regular in the Python computation and numerical-hard in JS. Its canonical waveforms differ by about 1.48 times the energy radius, while the relative objective difference is only 1.94e−14 and both bounds pass. The radar-closest choice removes the arbitrary canonical endpoint selection, but it still does not imply exact waveform digits for an ill-conditioned near-hard problem.
3. **Expose numerical diagnostics and uncertainty.** Show the selected tie rule, numerical hard-case/range classification, equality residual and objective bound. Do not silently relabel a numerical cluster as an exact algebraic nullspace.
4. **Keep the secondary option explicit.** The source does not specify radar-closest tie selection. Zero/tiny projected reference has a canonical fallback and a numerical secondary-distance allowance. Exact nearest-primary-optimum language needs the stated exact eigenspace and range conditions.
5. **Keep scope boundaries unchanged.** This solver does not preserve fixed covariance or constant modulus, optimize sum rate or radar detection, or fix the quantitative Fig. 3 mismatch. The published weighted curve remains unreproduced; do not use this pass as a full-figure badge.
6. **A later UI/Worker gate remains necessary.** It must validate input propagation, cancellation/repeated runs, residual/error display, endpoint labeling, and that actual new inputs invoke this core. This review authorizes no repository edit or publication by itself.

## Reproduce

Run in this directory with the existing `../atomic-receiver-reference/.venv/bin/python` and Node:

1. `python review_js.py`
2. `python review_js_ties.py`
3. `node api_guards.cjs ../waveform-weighted-reference/js-core/weighted-core.js api-guard-results.json`
4. `node module_smoke.cjs ../waveform-weighted-reference/js-core/weighted-core.js module-smoke-results.json`

The scripts generate or retain complete fresh inputs, actual JS outputs, independently computed diagnostics, SDP results, negative controls and API results. See `SUMMARY.json` for the bounded gate, and `manifest.json` for artifact hashes. No UI, shared repository, publication, remote task, credential, or package installation was involved.
