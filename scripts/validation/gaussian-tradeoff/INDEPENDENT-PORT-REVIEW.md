# Independent Gaussian ISAC JS/Worker port review

Status: PASS for the frozen bounded JS/Worker numerical port and portable packages after independent archive-derived replay. All confirmed defects are fixed on the final hashes below. This report does not approve a browser UI or claim actual browser execution.

## Scope and isolation

All reviewer edits are confined to `gaussian-tradeoff-port-review/`. The implementation was copied into `snapshot-01/`, `snapshot-02/` and `snapshot-03/`; no owner source, UI repository, remote or desktop task was edited. The separate protocol reviewer worked only in `protocol-review/`. Reference tests and output fixtures are not imported by the independent numerical oracle.

The frozen reference core and archive were checked directly:

- Core SHA-256: `b06e329b927cda7adb1e2d38b320a1f2ca1bee287ebe8dec50d6de86fe176bb2`
- Reference archive SHA-256: `235619c80cc0ebf8551138a1ef241adefacddb0f15a79ca973718fb5ccd5481c`
- Accepted reference review: `../gaussian-tradeoff-independent-review/REVIEW.md`

The source interpretation remains the accepted operational reconstruction of arXiv:2204.06938v8. Equation (48) is the sensing-minus-rate objective; Eq. (109)'s printed sign is not silently substituted. The estimator/Fisher matrix is derived from the actual proper-complex likelihood, retaining the prior factor two and explaining the Eq. (93)–(94) coordinate conflict. Both 24 dB total and per-antenna power interpretations remain separate. The source convention is not fitted to a plot.

## Independent numerical tests

`audit_numerics.py` creates fresh deterministic random inputs, independent of the owner's fixtures and frozen implementation. It uses NumPy direct full-matrix inverses and real-coordinate solves, mpmath exact-polynomial moments, and SciPy direct output-density integration.

The revised numeric snapshot passes 266 checks:

- Fresh complex channels and noncommuting PSD covariances for every M=1…6, with Nc, Ns, T, prior, both noises and power varied
- Continuously selected non-preset κ values, κ=0 and the communication-only endpoint
- Full complex gradient, feasibility, PSD and convex supporting-plane gap, plus 80 independent noncommuting PSD competitors for each of 30 shaping solutions
- Gaussian-input MI and covariance-only error computed directly from the actual matrices
- Full real-coordinate posterior solve, one-row and all-Ns-row Fisher matrices, row/column posterior covariance conventions, and inverse trace
- Actual X, Y, R, truth-only squared error, proper structural-null directions, Gaussian unnormalized block energy and Stiefel fixed sample covariance
- Raw Monte Carlo means, sample standard errors and approximate intervals; the records do not call those exact expectations
- Proper-prior and identifiable/improper posterior cases; two rank/condition failures are retained as explicit exceptions, not discarded or reported as finite answers
- Nine finite-Wishart cases via 420-digit exact Laguerre-polynomial moment recurrence, including T<M, T=M, T>M and extreme prior/noise ratios
- Nine independent MP spectral-density integrals, including the zero atom when M/T>1; MP stays an approximation
- Eight sphere MI cases via the direct density of 2||Y||² as a noncentral chi-square variable, including T=16/SNR=100 and small SNR; this differs from the port's scaled-Bessel radial implementation

Observed maxima, reproduced on archive-derived `final-snapshot/`:

- Ordinary Gaussian-rate difference: 1.34e-15 bits/complex use
- Covariance-only error difference: 5.78e-15
- Posterior coefficient difference: 1.85e-15
- Ordinary independent relative supporting-plane gap: 9.77e-15
- Sphere-MI difference: 2.15e-11 bits/complex use
- Finite-Wishart absolute difference: 2.62e-10, on an expectation of order 10⁴; comparison is scale-aware

`audit_boundaries.py` separately evaluates 72 fresh legal boundary requests × 5 weights, including rank-deficient/weak-mode complex channels, κ=1e-200 through 998723.153, and the declared variance/power endpoints. After fixes, all 360 shaping calculations succeed and satisfy the independent global gap threshold 1e-8. Maximum NumPy relative gap is 1.54e-9; the maximum 70-digit rechecked gap is 1.44e-9. `audit_highprecision_certificate.py` recomputes the ten worst binary64 cases with 70-digit full complex inverses and eigensystems; all satisfy the same global gap threshold. No certificate is treated as an interval-proof in exact arithmetic.

`audit_held_inputs.py` adds 38 checks for actual draw reuse and estimation isolation:

- Recover the common Gaussian standard draw from κ=0, and predict each subsequent covariance-shaped X
- Recover compatible Stiefel row prefixes, including changes of active rank
- Verify identical truth/noise across the selected κ cases and complete deterministic replay
- Preserve literal X/Y while changing estimator prior/noise, actually changing the estimate
- Reject an attempted truth argument to the posterior API
- Retain a positive covariance mode of 1e-20, rejecting its Stiefel realization when rank(Q)=2>T=1

`audit_tiny_rate.mjs` adds nine scalar-identity regression cases down to H=1e-14. The Gaussian MI remains positive and agrees with direct log1p evaluation, rather than rounding to zero after adding the identity.

## Defects found and owner fixes

1. **Low-SNR communication-only water filling lost the power budget.** Subtracting two inverse gains of order 1e9 produced relative trace errors up to 1.59e-7 and explicit optimizer rejection. The owner switched to shifted inverse-gain offsets; the independent fresh cases pass without loosening feasibility tolerances.
2. **Linear μ bisection lost resolution at extreme legal prior/noise ratios.** An initial score bracket reaching about 1e30 could not resolve an optimum near one accurately enough after the fixed iteration count. The owner switched to logarithmic positive-μ bisection. All initially failing cases pass their original certificate threshold.
3. **Production progress events omitted the completed count.** The kernel emitted `completed`; the transport forwarded only `done`. Actual Node Worker evidence confirmed the missing counts. The revised runtime maps the field and preserves completion progress.
4. **Worker factory validation occurred after allocation and after option spread.** Invalid options leaked an allocated Worker and an accessor was invoked before descriptor-first validation. Revised factory preflight owns options before asynchronous allocation and cleans up failed attachment. Preserved red regressions now pass.

The owner also corrected very-small-SNR rate cancellation by evaluating log1p of the signal eigenvalues. Independent tiny-rate regressions confirm it.

All initial and intermediate failures, exception diagnostics and stdout/stderr logs are preserved. The initial boundary run had 23 explicit optimization exceptions out of 72 requests; the first numerical fix reduced that to six, and the final numerical fix removes all 23 in this same suite.

Two reviewer-oracle errors are also preserved and explicitly distinguished from implementation defects: an 85-digit Wishart recurrence suffered cancellation for a very large argument and required 420 digits; an initial held-draw check attempted to invert a rank-deficient covariance. The corrected check predicts X from the held standard draw and handles Stiefel active prefixes. Neither is counted as an owner bug.

## Codec and lifecycle review

See `protocol-review/PROTOCOL-REVIEW.md` for exact pins and evidence.

- Strict canonical tagged JSON preserves signed zero and arbitrary valid Unicode and hashes the immutable snapshot
- Both asynchronous SHA-256 stages were deliberately paused while the caller mutated input, result and record fields; encoding/decoding remained bound to the original owned bytes
- Sparse arrays, unsupported prototypes, accessors, dangerous keys, nonfinite data and resource excesses reject
- Actual production Node Worker tests cover ready, progress, invalid-request preservation, accepted-only supersession, cancellation/recovery and raw/history records
- Actual Node Worker process death is reported; a distinct production worker restarts successfully
- Simulated duplex-transport tests cover held completion and factory/lifecycle races: 25 seeded schedules settle 1,222 run promises exactly once, without stranded state
- Browser module-loading branch is exercised through Node VM modules, separately from worker_threads

The Node VM is not a browser. No real browser, UI rendering, page lifetime/navigation, CSP, bundler, mobile performance or desktop interaction was exercised or approved.

## Acceptance limits

- This is a bounded isotropic proper-complex Gaussian model, with explicit numerical inverse/condition and cooperative resource guards; it is not a theorem that every syntactically legal extreme input will finish
- General-MIMO finite-SNR Stiefel MI is not evaluated and is not displayed as Gaussian log-det MI
- A known deterministic waveform has zero communication MI; a random fixed-covariance waveform need not
- The covariance outer pair is not generally a jointly achieved rate–error pair
- Gaussian power is an expected covariance-trace contract. Per-block energies fluctuate and are retained; Stiefel uses a fixed block-energy/sample-covariance contract when rank(Q)≤T
- Confidence intervals are pointwise approximate normal intervals; common draws correlate weights. They are not exact expectations or simultaneous confidence bands
- Numerical quadrature estimates and omitted-tail probability are not rigorous entropy-error intervals
- Source Figure 10 presets are single fixed channels under two explicit power interpretations, not a new fading expectation or a digitized source-figure match
- Worker raw imports require fresh execution; history imports retain explicit historical/non-fresh labeling
- No UI integration, whole-paper reproduction, general input-distribution optimum, Figure 11 null-space completion or browser latency guarantee is approved

## Replay

All scripts use the isolated snapshot supplied on their command line. Use one BLAS thread. The final independent and portable replay commands are:

```sh
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 NUMEXPR_NUM_THREADS=1
python audit_numerics.py --snapshot final-snapshot --tag final
python audit_boundaries.py --snapshot final-snapshot --tag final
python audit_highprecision_certificate.py --tag final
python audit_held_inputs.py --snapshot final-snapshot --tag final
node audit_tiny_rate.mjs "$PWD/final-snapshot"
node audit_kernel_contract.mjs "$PWD/final-snapshot"
python audit_custom_selection.py
python audit_presets.py --snapshot final-snapshot --tag final
(cd portable-replay && bash run_all.sh)
node runtime_smoke.mjs "$PWD/runtime-replay"
```


## Final freeze, packaging and full replay — 12 October 2026 UTC

The reviewer independently validated both archives before extraction. The full evidence archive contains exactly its 41 manifest-listed files plus `ARTIFACT-MANIFEST.json`. The runtime archive contains 14 files. All archive entries are unique ordinary files under the declared package root, with no traversal, symlinks, paper assets or interpreter caches. All archived bytes match the owner directory and every declared runtime hash; all 231 packaging checks pass.

- Runtime archive: `gaussian-tradeoff-js-v0.1-runtime.zip`
- Runtime SHA-256: `41466405b1e72bb1bee681cf4c8ca0c9dfe638fc59dd7089a4698f8a2aedeaf4`
- Full evidence archive: `gaussian-tradeoff-js-v0.1-full-evidence.zip`
- Full evidence SHA-256: `b5ec92cbb3745e418b08d3a13888bb528235a265a4e6cba5f697b74f5524e5bd`
- Source freeze SHA-256: `ea5c2ad520d33962b4d33e9f6e9f89e9ddaa3e1ee41e4d249250c54da91cb113`
- Artifact manifest SHA-256: `5c936503bb32472514199ed9da64e173bcfb71dfef9cb8195945387db9a573bf`
- Final kernel SHA-256: `0f2dc07dc891593cfe2190d09d395a6be4b7343a43c52f45dd6b1b9a6d176310`
- Final math SHA-256: `930bedc07777ea6c078bc742dbc4b64938cf963b8f44c35902f80967f47fd79d`
- Final runtime SHA-256: `94352d73c3921f7a83b6313ccdf31d2f0aa3e311c5de342f9cf18f002e1b6758`
- Final codec SHA-256: `cd210349a1755aba09af3c8bcf0ebb046a935ca8acd3f1839a56b8a9c4f033aa`

The immutable `final-snapshot/` was extracted from the full archive. All independent suites above were rerun against it. A second extracted copy, `portable-replay/`, passed the complete owner gate without referencing the original owner directory: 2,382 numerical comparisons, 61 integral/preset cases, 366 stress cases, 1,986 NumPy evidence comparisons and 37 codec/Worker tests. The three live numerical evidence records replay byte-identically. Only the three reports containing elapsed-time/benchmark measurements differ, as expected; `portable-replay-comparison.json` records this distinction. No source file changed during replay.

The separately extracted runtime-only package ran a real Node Worker, produced six fresh shaping results, and passed canonical history decoding. Its initial smoke invocation under Node `--input-type=module` failed because that CLI flag was inherited by the file-backed Worker; the preserved log identifies this host-invocation error. Running the same smoke as a normal `.mjs` file passes. Node's experimental-VM-module warnings are preserved and do not establish real-browser acceptance.

Additional final-source checks pass:

- 14 direct-kernel preflight/async-ownership tests, including accessors, array prototypes, malformed Unicode, nonfinite/amplitude limits and the optional-custom-covariance work cap
- 9 selected-custom-covariance checks on actual noncommuting X/Y/posterior/score and fixed Stiefel sample covariance
- 13 preset provenance checks: exact accepted teaching H, exact frozen Figure 10 first-channel H under both power conventions, and the complete 39-point Figure 4 prior grid
- 5 extra independent safe-error-diagnostic checks, including hostile metadata, immutable finite diagnostics, real numerical degeneracy and successful subsequent execution

The complete independent protocol suite was rerun on the exact archive-derived source, including the revised numerical-error serializer. Its final report SHA-256 is `3f69e5733a2273f11ab109f06d0178f59fafdfa69a0db4769540cfb98edb0683`. All seven runtime source files match the main final snapshot. There are no outstanding mathematical, codec, lifecycle or packaging findings within this bounded review scope.

`REVIEW-FREEZE.json` records the final review files, all final snapshot members, preserved initial/intermediate evidence and package identities. `verify_review.py` rechecks those hashes and the owner archive/freeze identities. This review is ready for the next separately authorized UI/browser integration stage; it does not supply that stage's acceptance.
