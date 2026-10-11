# Independent off-grid range reference

These artifacts were produced before the website implementation. `reference.py`
imports no repository model and is the independent numerical/export-shape oracle
for `offgrid-range-model-v1`. It uses Python 3 and NumPy. The JavaScript website
has no Python, NumPy, build-time, network, or third-party runtime dependency.

## Files and provenance

- `reference.py`: frozen model and three scenario definitions
- `fixtures/*.json`: complete observations and both estimates for all 2,001 trials,
  plus selected-trial score arrays, resource/settings ledgers, and summaries
- `fixtures/rng-port-fixtures.json`: 12 seed/domain edge cases with exact uint32
  hash/state and uniform expectations, and tolerant normal-draw expectations
- `verify_reference.py` and `verification.json`: original 80-check independent
  verification, including a real 2N-by-2 SVD least-squares comparison
- `verify_port.cjs` and `port-verification.json`: original separate scalar
  JavaScript rescore of Python fixtures and RNG port checks; no website imports
- `reference-output.txt`: original reference run output
- `audit_actual_core.cjs` and `actual-core-audit.json`: a later, independent
  production-core comparison against the frozen Python fixtures (20 groups,
  all 2001 observation rows and 4002 estimator results); the script uses a
  repository-relative path and the report does not claim browser verification
- `probe_initial.py`, `probe_initial_results.txt`, `probe.py`, and
  `probe_low_snr_results.txt`: both complete exploratory sweeps used to select the
  illustrative low-SNR preset; they are provenance, not production APIs

The low-SNR fixture (range 25.1 m, SNR -5 dB, seed 7, 1,000 trials) was selected
AFTER exploration because this finite sample has larger fine-grid RMSE. It is a
fixed counterexample, not an unbiased benchmark, universal ordering, expected
RMSE claim, or significance result. Other sweep outcomes remain visible in the
retained results. The gross-error criterion was fixed at strict absolute error
>9.375 m before fixture calculation. No large/boundary-error rows were removed.

Source copies preserve numerical code and data. Only an unused environment-
specific `sys.path` insertion and the now-unused `sys` import were removed from
both exploratory scripts for portability. No caches or credentials are retained.
The recorded runtimes describe the reference environment, not browser timing.
These original verification reports do not certify the production site or UI.

## Reproduce

From the repository root, with Python/NumPy already available:

```sh
OPENBLAS_NUM_THREADS=1 python3 scripts/offgrid-range-reference/reference.py
OPENBLAS_NUM_THREADS=1 python3 scripts/offgrid-range-reference/verify_reference.py
node scripts/offgrid-range-reference/verify_port.cjs
node --test tests/offgrid-range-core.test.cjs
node scripts/offgrid-range-reference/audit_actual_core.cjs
```

The first three commands regenerate their corresponding artifacts. Generation
and verification runtime fields may differ. Floating math-library last bits may
vary; integer RNG states/uniform draws must match exactly. The Node regression
suite compares the actual website core against every frozen trial and summary,
plus pairing, receiver isolation, ties, failures, cancellation, and export replay.
