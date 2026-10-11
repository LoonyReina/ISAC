# Independent actual-JavaScript detection audit

This portable package audits the real `distributed-detection-core.js` module. It does not substitute a Python reimplementation for executing the JavaScript detector.

## Reproduce

From this directory, run:

```sh
python audit_js.py --core path/to/distributed-detection-core.js
```

The target module is read-only. Results are written beside this audit. Node.js, Python 3.10+, mpmath, NumPy, and SciPy are required; exact tested versions are in `audit-results.json`. No browser, network, publication, or write to the target module is performed by this command.

## Files

- `VALIDATION_REPORT.md`: scope, results, mathematical boundaries and qualifications
- `audit_js.py`: independent 100-digit, dense-covariance and statistical comparison
- `run_core.cjs`: executes the actual JS exports, malformed-input checks and simulation
- `oracle.py`: standalone independent 100-decimal-digit scalar oracle
- `high-precision-fixtures.json`: the inherited independent 336-case exact-decimal corpus
- `audit-input.json`: complete deterministic JS input corpus used by this run
- `actual-js-results.json`: raw outputs of the actual JS execution
- `audit-results.json`: machine-readable verdict, numerical errors, statistical intervals and guards
- `SHA256SUMS`: artifact integrity checks

All example observations and Monte Carlo data are synthetic. This package contains no private absolute paths, user information, credentials, third-party paper text, source PDF, or deployment claim. The implementation itself remains in its normal site location and is identified by digest in the report.
