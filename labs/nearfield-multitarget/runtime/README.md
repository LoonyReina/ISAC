# Near-field multi-target covariance: v2 protocol repair

Fixed source: Ruan et al., arXiv:2506.07052v1. This is a new dependency-free JavaScript numerical implementation of the intended Eq.17 PSD covariance SDP and Eq.18 rank-one recovery. It is not a weight lookup, precomputed-curve replay, localization-success demonstration, or full-paper reproduction. No source PDF is included. No website, repository, PR, publication, or user-computer/Codex changes were made.

## Version scope

Only worker orchestration, protocol tests/harness and documentation differ from v1. solver.mjs, model.mjs, certificate.mjs, linalg.mjs and sampler.mjs are byte-identical to the frozen original, as checked by freeze.py and recorded in MANIFEST.json. Existing numerical fixtures and Python oracle outputs are inherited unchanged. tests/original-rejected-protocol-evidence.json preserves the independent auditor’s rejected v1 events, including dropped proposed evidence and accepted malformed []/empty-ID requests. No old evidence is rewritten.

## Current evidence

The independently accepted Python reference is bound by manifest SHA-256 `61c52e8aeaab24674d205dd8a7572d0dbd419d2a1767a64e420facc1914e0f9b` (65 artifacts, 13 tests). Its source crosswalk, independent source audit, retained solver failures, and receiver limitations remain applicable. The v1 numerical core passed independent review; this separately versioned v2 changes orchestration only and awaits protocol review. The original bundle remains frozen at manifest f758a0e9c5651153413a8e1fede99289b5c1888021e5854d70a64f32d2d42dc7.

Default bounded case: centered 6×6 half-wavelength array, wavelength .01 m, power 23 dBm, noise −50 dBm, two 4-bit/s/Hz users, three targets, epsilon .1. Exact user/target coordinates are in `model.mjs` and every fixture.

- Proposed primal/dual objective interval: [0.0010355009363633694, 0.0010355053580313] W; relative gap 4.27008e−6; recovered rates 4.0000097646 and 4.0000010409
- NCCS interval: [0.0991809318172783, 0.09918137534090901] W; relative gap 4.47186e−6; recovered rates 4.0000201894 and 4.0000021045
- Actual default solves require 92 and 89 Newton steps, typically about 0.1 second each in this Node executor. This is not a browser/hardware real-time guarantee
- Five independently varied bounded scenes, each with both modes: baseline, epsilon .05, rate 3, power .17 W, and first-target x offset .005 m. All ten pass post-recovery gates and independent NumPy full-physical-space primal/dual checks
- Nine of ten fresh CVXPY comparators are accepted and agree within 4.0e−6 relative objective. The lower-power NCCS raw CVXPY result is rejected; its failed residuals are preserved rather than counted as a matched optimum
- The same JS algorithm also produces two source-setting candidates (10×10, 17 bit/s/Hz, noise −80 dBm). Proposed interval starts at 0.008162766152022447 W with relative gap 2.70117e−6; NCCS starts at 0.09863689390755813 W with gap 4.33867e−6. Fresh independent NumPy 100×100 physical checks pass. These are unreviewed source-optimization candidates, not accepted source/full-paper results. Fresh original CVXPY attempts still fail and do not overwrite the existing 32 failed attempts

## Actual algorithm

`model.mjs` freshly evaluates spherical distances, dipole hemisphere gain, complex negative propagation phase, and per-channel norm weights. H contains the five normalized transmit channel rows. For full row rank, B=Hᴴ(HHᴴ)⁻¹=Q(HQ)⁻¹, G=BᴴB=(HHᴴ)⁻¹. The small coordinates use physical covariance P B Z Bᴴ. The metric constraint is tr(GZ)≤1, never tr(Z)≤1. A singular/ill-conditioned factorization is an explicit numerical failure; this implementation does not pretend rank-deficient scenes are solved.

Three separate 5×5 Hermitian PSD matrices represent F₁, F₂, and R_s. Their sum is R, with scalar mu. There are 76 real variables in orthonormal Hermitian coordinates. A log-det Newton barrier uses:

- −logdet of each PSD matrix
- −log of each power, SINR, target-illumination and positive-mu slack
- −log(epsilon² mu² − |R_ij|²) for each target pair in proposed mode

NCCS removes only these three pair barriers. It shares all other parameters, constraints, optimizer settings and acceptance gates. Derivatives are analytic and central-difference tested. Newton systems are diagonally equilibrated and Cholesky solved, with no hidden regularization. A feasible channel-image diagonal start is constructed. Its failure is labeled `strict_diagonal_start_unavailable_not_infeasibility`; only a separately violated analytical per-user rate upper bound is labeled infeasible.

The implementation follows a barrier path with multiplier ×5, guarded Newton/backtracking, and yields every eight accepted/proposed Newton steps. It stops on a nominal barrier gap, then requires independently reconstructed dual bounds and actual physical post-recovery gates. No solver status alone creates acceptance.

## Dual certificate and recovery

Barrier slacks supply positive target alpha, SINR eta, power lambda, and (for proposed) SOC multipliers (rho,w). Alpha/eta/lambda/rho/w are normalized so sum(alpha)−epsilon sum(rho)=1; rho≥|w| is checked. The common dual Hermitian block is −sum(alpha_l T_l)+sum(eta_k gamma U_k)+cross(w). Its off-diagonal target entries are w/2. Required blocks are lambda G+C and lambda G+C−eta_k(gamma+1)U_k. Generalized minimum eigenvalues raise lambda as needed, plus 1e−10 safety shift. The bound is P lambda−sum(eta_k gamma noise/||h_k||²). Raw multipliers, shift, eigenvalues, lower/upper and gap are exported. This is a floating-point numerical certificate, not interval arithmetic.

Eq.18 recovery uses f_k=F_k e_k/sqrt((F_k)_kk) in channel-image coordinates, transfers every residual into R_s, and lifts to physical space. Checks explicitly recompute SINRs, gains and correlations from the full physical channels and lifted matrices, and verify channel-image basis identity plus desired-power preservation. Checks include physical covariance PSD, sensing PSD, each recovery-difference PSD, total power, two recovered SINRs/rates, all target gains, all three actual weighted pair magnitudes, reconstruction error, dual PSD and objective gap. Physical PSD/power/cross/gain tolerance is 1e−7 P, rate margin −1e−3, reconstruction 1e−7 P; dual PSD tolerance −1e−8 and relative gap ≤1e−4; basis identity error ≤1e−8 and desired-power relative error ≤1e−7. All numeric residuals are exported.

The Python oracle does not call JS math. It reconstructs spherical channels using the accepted reference, verifies B and full 36×36 / 100×100 physical constraints, and builds full-space dual blocks lambda I+Hᴴ C H. It separately invokes fresh CVXPY solves. See `tests/python-oracle-results.json`.

## Sampling and source limitations

`sampler.mjs` samples the actual strictly positive 5×5 optimized total covariance with a Cholesky factor and lifts through B. No negative eigenvalues are clipped in this path; clipped power is explicitly zero, and pre/post factorization ensemble covariance and powers are retained. The seeded complex Gaussian symbol law is an implementation choice. Proposed and NCCS use the same seed, 1000 snapshots, noise draws and ensemble cap. They do not have identical finite-block energy:

- Proposed pre/post ensemble power 0.19952620550889624 W, finite block energy 199.14672714375314 W·symbol
- NCCS pre/post ensemble power about 0.1995261953405478 W, finite block energy 198.85447524612877 W·symbol

Neither sample is secretly rescaled to match energy or SNR. The unit W·symbol is not joules without a symbol duration.

Literal Eq.12 receive hemisphere is evaluated and yields exactly zero echo; output equals the same retained noise. A separately labeled reciprocal-direction extension computes a nonzero echo. Eq.9's missing final conjugation is explicitly resolved using Eq.8/Eq.16 covariance algebra. The undefined Eq.19 index and structurally singular full-space R_X are retained: sample transmit rank ≤5 <36/100. No inverse, pseudoinverse, loading, Capon spectrum or localization plot is silently substituted. This prototype does not implement loaded-receiver spectra.

## Execution and protocol

Runtime has no external packages. Import `solve`, then `certify`; optional `sample` only accepts an accepted certificate. The web entry point is `new Worker('./worker.mjs', {type:'module'})`.

Request: `{type:'solve', id:'unique-string', input:{...}, sample:false, seed:6252, options:{maxSteps:500,maxMs:10000,relativeGap:1e-5}}`. Both proposed and NCCS are solved freshly. Progress records precede one terminal result/failed/error/cancelled record. Cancel: `{type:'cancel',id:'same-id'}`. One job per Worker; concurrent solve is an explicit busy error. Restart after cancellation is supported. UI should reject stale IDs and terminate its Worker on navigation/destruction for hard cancellation. No UI is included. See PROTOCOL-V2.md for strict schemas, per-mode terminal evidence, uniqueness and cancellation semantics.

Bounds: side 4..10, two users/three targets, each coordinate magnitude ≤2 m and z≥.05 m, wavelength .005..02 m, 0<power≤1 W, noise 1e−12..1e−6 W, rate (0,17], epsilon .01..5e−1, integer snapshots 32..1024. These are runtime bounds, not a claim every allowed scene is feasible or well-conditioned. Solver caps: at most 600 Newton steps, 70 steps/barrier stage, 60 line-search trials/step, and 10 seconds per mode. Defaults are 500 steps and 10 seconds. Eigensolver has a 100-sweep cap. Failure states remain failures and capped raw coordinates are retained when available.

## Tests and outstanding browser gate

- `node tests/core.test.mjs`: 10 tests pass
- `node tests/worker-node.test.mjs`: separate-thread adapter checks fresh pair, both retained cap failures, the actual rate1e−6/epsilon.22 partial failure and deterministic replay, singular failures, 22 malformed input/option/ID cases, busy/wrong-cancel/cancel/restart, duplicate IDs and stale-result suppression. It is explicitly not a browser test
- `tests/python-oracle.py`: all 12 independent physical primal/dual checks pass; actual comparator failures retained
- `tests/worker-browser.cjs`: real Chromium module-Worker harness supplied, but execution here is blocked by `process_singleton_posix: socket() failed: Operation not permitted`, including one escalated retry. Browser numerical/protocol verification remains open. No browser-passed claim is made

For replay, use Node ≥18. Python requires the accepted reference's NumPy/CVXPY/Clarabel environment. The oracle’s adjacent-reference import is intentionally test-only; runtime files import neither fixtures nor Python. Browser harness requires an allowed local server and Chromium. No source PDF is published or redistributed.

Provenance: elementary complex linalg was copied from the existing cellfree-maprt browser prototype; Hermitian coordinate and new barrier/dual/eigenvalue/sampler code are original here. Independent NumPy tests validate the algebra in this actual problem, rather than trusting reuse alone.
