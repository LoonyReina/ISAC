# Independent CRB export-checker review

## Decision

**ACCEPT within the declared numerical-consistency scope**, after owner hardening.

Reviewed final checker SHA-256:
`06a73ea4825613dfe6af32ffe5a8e6dac12b9d22ef0556c7e8de49f541a4c66f`

The initial checker was **REJECTED**. The initial defects and numerical counterexamples remain in this review folder; the owner patched the checker, and all substantive regression assertions now pass. No production checker, frozen JavaScript core, or reference code was edited by this review. No optimizer, JavaScript runtime, browser, network, or publication action was invoked by the review.

## Reproducible tests

From the extracted checker bundle root, with Python and NumPy installed:

```sh
OPENBLAS_NUM_THREADS=1 PYTHON=python3 sh independent-review/run-independent-review.sh
```

This portable command uses bundled fixtures only. It runs:

- 295 substantive adversarial assertions, within 325 total probes; 30 extra probes observe deliberately unauthenticated descriptive metadata and are not acceptance assertions
- 9 CLI/parser rejection assertions
- 16 targeted math regression assertions, including a valid tiny positive CRB control

All **320 bundled assertions pass**. Detailed output: `adversarial-results.json`, `parser-cli-results.json`, `math/regression-after-final-fix.json`, and `SUMMARY.json`.

The original test environment used:

```sh
OPENBLAS_NUM_THREADS=1 PYTHON=/workspace/shared/isac-paper-execution/atomic-receiver-reference/.venv/bin/python sh independent-review/run-independent-review.sh --include-legacy
```

`--include-legacy` additionally needs the external sibling archive at `../crb-beamforming-browser-prototype/independent-review`. Its 13 saved-state assertions also pass, for **333 substantive assertions** in the full review. That optional archive is not required for the portable bundled tests. Its location can be overridden when running its driver directly:

```sh
OPENBLAS_NUM_THREADS=1 python3 independent-review/prior_fixture_regression.py --legacy-root /path/to/frozen-kernel/independent-review
```

No saved-state test reruns the JavaScript solver. `default-live-record.json` is a byte-for-byte review-local copy of the supplied actual adapter envelope, SHA-256 `a12eefbe2486c2a3d81488f2b56c79fe9757a0ace3fb1cc7758e9a7bc183cb52`.

## Initial defects and verified fixes

Initial checker SHA-256:
`85f6ec14afadb82e04e5be7d28e08926dd4c2fe291527ad7bda1c1e48f274fc7`

1. **Missing independent Fisher verification could permit materially wrong CRB.** A bare fresh-Nt4 result with alpha.real = 1.6e-162 and radarNoiseMw = 5e-324 passed with physicalAccepted=true. Squared alpha rounded to the minimum binary64 subnormal. Reported CRB was 1.1890314182171052e-8; an 80-digit Decimal scalar replay using exact binary64 input values and the same effective information gave 2.2947639637653278e-8. The reported bound was 48.19% too low. The overflowing full Fisher matrix became null, and that independent check was silently skipped. The fixed checker refuses physical acceptance for unsupported subnormal alpha-squared/noise scales or missing finite positive Fisher verification. Reproduction: `math/subnormal-alpha-crb.json`; initial evidence: `math/numeric-extremes-results.json`.

2. **Absolute tolerances swallowed impossible tiny exported CRB/root values.** With normal radarNoiseMw = 1e-295, the correct CRB is about 1.1890314165e-303 and the full Fisher is finite. Initially, a reported CRB of -1e-301, a positive reported CRB about 84 times the correct value, or a grossly inflated tiny root-CRB could still pass physicalAccepted=true. The fixed checker uses relative-only scalar radar and Fisher/CRB comparisons and requires accepted reported physical radar fields to be finite and positive. All corruptions now reject; the correctly reported tiny positive CRB still passes. Reproduction: `math/negative-exported-crb.json`; final evidence: `math/regression-after-final-fix.json`.

3. **Malformed envelope/trace and impossible terminal metadata could pass.** Examples included schemaVersion=true, a string trace with samples=1, impossible trace rows, and converged with iterations=0. The fixed checker validates integer envelope version/count, typed bounded trace rows/order/timing, terminal iteration rules, and final trace/state consistency where the core emits a terminal trace. Saved examples have descriptive `envelope-*` and `converged-iterations-zero.json` names.

4. **Rejected/capped status evidence was insufficiently constrained.** Relabeling a capped state as numerical_failure or numerical_rejection without a diagnostic, corrupting rejection-gate failure lists, or appending garbage numerical/recovery data to the analytical state-free rejection could pass evidence. A cap relabeled cancelled also initially passed. The fixed checker checks the associated diagnostic/gate/status contracts, requires cancellation before the cap, and makes the analytical exception state-free. These cases still never bypassed physical acceptance; the defect concerned the evidence audit's success declaration.

The original checker source is preserved as `check_export.initial-reviewed.py`, and exploratory initial results are in `adversarial-results.initial.json`. Repeated type variants in that file are probes, not separate root-cause counts. It is possible to repeat the historical attack suite deliberately against the rejected snapshot:

```sh
OPENBLAS_NUM_THREADS=1 python3 independent-review/adversarial_review.py --checker independent-review/check_export.initial-reviewed.py --output independent-review/adversarial-results.initial.json
```

## Numerical audit findings

- The receive/transmit steering derivative and complex row-channel convention are consistent with the accepted independent model. The rank test replays `rank(H [a, a_dot]) = 2` through singular values, with the frozen relative tolerance 1e-8.
- The full real Fisher matrix uses the parameter Jacobians `(alpha D, A, i A)` and entries `(2L / radarNoiseMw) Re tr(J_i^H J_j R)`. Eliminating the two amplitude nuisance parameters yields the same CRB as the effective-information expression. Final accepted states require this finite positive verification.
- Actual recovered power and every user's SINR are recomputed directly from H and Wc. Wks agree with the normalized final primal variables, relaxedR agrees with their sum, and Wc recovery agrees with principal eigenvectors and the reported rank-one residuals.
- The cone projection is replayed with independent NumPy eigendecomposition. The primal residual is `||Ax-z||_infinity`; dual stationarity is `||A^T rho(w-z)-e_t||_infinity`; the linear proximal equation is `A^T rho(Ax-(2z-w))-e_t = 0`. The claimed residuals and numerical convergence gates are checked.
- The certificate trace correction has the correct sign and scaling. With normalized covariance blocks and total trace at most 1, write `E=A^T y-e_t`, support=`y_linear^T lower`, and `m=min(0,min_j lambda_min(E_j))`. The minimization lower bound is `-support+m`, and the normalized-information upper bound is its negative. The checker validates dual cone signs, epigraph stationarity, conservative stationarity eigenvalues, support, correction, and bound consistency. Missing/null/forged certificates cannot produce physical acceptance.
- Honest caps, full-state cancellations, rank failures, invalid-CRB rejections, and valid infeasibility separators pass the evidence audit while retaining physicalAccepted=false. Missing finalState fails for numerical results. The validated analytical individual-SINR infeasibility bound is the sole state-free exception.

The actual supplied envelope and fresh Nt4/Nt6/Nt8 fixtures physically accept. Optional legacy saved states additionally cover K=3 and mW-to-W rescaling. Missing/forged state, covariance, recovery, power, SINR, rank, radar metrics, certificate fields, envelope digests, and gate/status mismatches reject in the final suite.

## Scope and remaining limits

- This is a floating-point consistency/certificate review within explicit tolerances, not an interval-arithmetic proof or a proof of exact iteration history.
- Envelope hashes, timing, labels, generator declarations, and descriptive metadata do not authenticate their origin. The checker correctly keeps browserProvenanceEstablished=false. Thirty nonbinding metadata-type probes are intentionally observational.
- The lesson envelope's fixed alpha/noise settings already excluded the two extreme-scale math exploits. They mattered because the checker also accepts bare frozen-kernel results over a wider input domain.
- No browser execution, runtime performance, full-paper reproduction, or production readiness follows from this decision.

## Source checks

Frozen `core.js` SHA-256 remained:
`208f4d91db12d5c24d8bff921a1f31806cea846cb3f1a3a6101f7520f2e335c1`

Accepted independent math review source SHA-256:
`c0e67b9fc08a5b96ba757732d3ac63d951326a60b5caf9eca5220864e8179433`
