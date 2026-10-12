# Independent portable export checker review

## Verdict and exact freeze

**Pass for the reviewed numerical-evidence consistency scope. No remaining correctness blocker was found in the reviewed equations and final tests.** This verdict is tied to `check_export.py` SHA-256:

`f9fec5ec833a024549fe5451c24fa28c9f1e8544983960d602ca6f940fd67722`

The independent reviewed snapshot has identical bytes. The checker itself was not edited by this reviewer. Runtime and reference implementation were also not edited.

A checker result of `passed: true` means the supplied numerical evidence is internally consistent with the implemented model and the result's status. It does **not** mean the optimization converged. An honest iteration limit can pass this audit while remaining an unsuccessful optimization outcome. The checker preserves this distinction in its notice.

## Final executed coverage

- 67 supplied kernel fixtures audited directly and inside nested method/result UI-style wrappers: **134 of 134 passed**.
- Fixture statuses: 58 converged, 4 iteration limits, 4 numerical infeasibility certificates, and 1 analytical infeasibility bound.
- 18 independent control/mutation tests: **18 expectations met**, comprising 5 valid controls and 13 hostile or missing-field mutations that were rejected.
- Fixture SHA-256 hashes and individual outcomes are recorded in `export_checker_final_fixture_audit.json`.
- Independent mutation details and checker rejection reasons are recorded in `export_checker_final_mutation_audit.json`.

Coverage includes SDR, optimized ZF, and radar-only results; M=4 through 10; ordinary and active SINR constraints; zero and degenerate channels; successful and capped outcomes; positive infeasibility certificates; and legitimate unattempted/null UI slots.

## Mathematical and evidence checks reviewed

The checker rebuilds the 1,801-angle grid and the complete Eq. (12)-(15) radar objective, including analytical elimination of alpha and all three target cross-correlations. It independently reconstructs the Hermitian coordinate basis, affine model and its row normalization, product PSD cone, and the gradient. It uses NumPy linear algebra rather than the JavaScript helpers, saved answers, or a CVXPY solve.

For numerical outputs, it ties R and the SDR Rk matrices to the supplied coordinate state; checks z = projection_C(w); and recomputes primal and true stationarity residuals. It recomputes physical power, factor covariance, effective communication/radar channels, individual SINRs and metrics. Accepted SDR results additionally require Rk and residual radar covariance PSD, covariance SINR inequalities, and Eq. (33) recovery. Accepted ZF results additionally require Eq. (40), Eq. (42)'s positive diagonal effective communication channel, and the radar channel nullspace. Radar results require M-by-zero communication factors, empty effective-channel arrays, no users, null absent SINR metrics, and the correct communication-constraint flag.

The objective and separation bounds use independently recomputed support and Hermitian operator norms. With unit total power, every feasible covariance block has trace at most one. For a cone-polar dual y, the objective lower bound is `-f(x) - support(y) - sum_j ||grad_j f(x) + (A^T y)_j||op`. The feasibility separator omits f and its gradient. The checker validates dual cone signs, operator-penalty vector shape and conservatism, arithmetic, and any claimed positive separator. Small tolerated positive PSD-dual eigenvalues are additionally subtracted in the independent bound. These are conservative floating-point numerical checks, not interval-arithmetic proofs.

## Fail-closed gaps found and fixed before this freeze

The initial candidate accepted or mishandled several concrete malformed cases. Final regression tests cover their corrections:

- Missing H inside an otherwise valid mixed envelope
- Loose, unvalidated solver tolerance
- Broadcasting unequal real and imaginary matrix shapes
- A modified w in the nullspace of A transpose with an inconsistent projection z
- Rotated ZF communication factors that preserved covariance and SINR but violated Eq. (42)
- An indefinite SDR remainder and forged cone state
- Attempted missing, scalar, or list-valued result slots
- Extra operator-norm penalty entries
- Invented radar-only effective communication metrics
- Malformed raw results hidden behind unattempted-wrapper flags
- Unsupported oversized dimensions rejected before model allocation

Legitimate wrappers with method/status metadata and legitimate unattempted null slots continue to work. Strong raw numerical signatures take precedence over wrapper handling. Preconditions now stop evaluation immediately.

## Limits

1. The checker cannot establish actual browser execution, downloaded-file provenance, source/code-delivery identity, runtime timing, UI stale-state behavior, random-channel generation provenance, or genuine live computation. Internally consistent fabricated or offline-generated evidence cannot be distinguished by numerical checks alone.
2. Accepted version identifiers are compatibility labels, not cryptographic proof of which code executed. The reviewed runtime hashes below bind the separately reviewed source files only.
3. The checker audits relevant numerical fields and claims, not every informational metadata field or trace. It is not an exhaustive hostile-document security parser or a proof against all malformed inputs.
4. Numerical tolerance and floating-point arithmetic remain in use. “Certificate” means a checked numerical bound within those declared tolerances, not a formal exact-arithmetic theorem.
5. This work adds export-evidence checking. It does not close previously excluded paper experiments or supply actual browser timing/UI evidence.

## Runtime bytes rechecked unchanged

- core.js: `a6de335f1a57d144cc8aebee1c33ec80397c3c948a9d93c38c1fafbcd1cf262b`
- hermitian.js: `da5721e4c3abfc616792c06684add0a41925f53125afc2e4abe6279e6c7bec7a`
- worker.js: `7c0ebef89c8c005e62af9725b0f333633d1f6657aae6096e503399a976afefde`

## Reproduction

From the reviewer directory, using a Python environment with NumPy:

```sh
CHECKER_PATH="$PWD/export-checker-reviewed-snapshot.py" \
CHECKER_AUDIT_OUTPUT=export_checker_final_mutation_audit.json \
python test_export_checker_mutations.py
python audit_export_checker_fixtures.py
```

The scripts reference the shared execution tree and fixture paths. They are independent review scripts, not the portable end-user checker. `EXPORT-CHECKER-REVIEW-MANIFEST.json` binds this report, checker snapshot, scripts, and final evidence hashes.
