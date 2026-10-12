# Independent actual-JavaScript audit

Final status: **PASS** for core SHA-256 `4642fbf9f2f054052119f6944bc2c6f20a4f16390167c8017b7887bfa5fd0bd6`.

- 148,162 independent mathematical, directional-power, and source-evidence cross-checks
- 52 bounded input/helper guard checks, including the N≤128 limit
- 21 static scientific/source-content safeguards
- 209 requests: all 14 frozen fixtures, 160 new seeded random configurations, and precision, budget, alias, nullspace and QoS boundaries
- 24 randomized PSD/nullspace covariance cases exercise the actual core covariance and pattern functions
- Seven expected numerical-range errors remain explicit errors, never false geometric infeasibility or NaN/Infinity

This verifies the actual JavaScript numerical core and static scientific content. It does not claim browser, accessibility, visual-layout, deployment, or publication validation. The audit does not implement or reproduce the paper's optimizer.

## Re-run

Requirements: Node.js, Python 3, NumPy and mpmath. The independent oracle uses 360 decimal digits for direct complex algebra. No network, credentials, author code, or source PDFs are required.

The examples assume this folder is `scripts/shared-array-independent-audit` inside the checkout. Adjust that relative folder if needed. Run from the checkout root:

```sh
mkdir -p audit-output
python3 scripts/shared-array-independent-audit/prepare_actual_js_inputs.py \
  --fixtures data/shared-array-fixtures.json \
  --output audit-output/actual-js-inputs.json
node scripts/shared-array-independent-audit/run_actual_js.mjs \
  --adapter scripts/shared-array-independent-audit/actual_js_adapter.mjs \
  --core shared-array-core.js \
  --inputs audit-output/actual-js-inputs.json \
  --output audit-output/actual-js-output.json
python3 scripts/shared-array-independent-audit/audit_actual_content.py \
  --repo . --report audit-output/actual-content-results.json
node scripts/shared-array-independent-audit/audit_actual_guards.cjs \
  shared-array-core.js audit-output/actual-guard-results.json
python3 scripts/shared-array-independent-audit/audit_actual_js.py \
  --inputs audit-output/actual-js-inputs.json \
  --outputs audit-output/actual-js-output.json \
  --content-report audit-output/actual-content-results.json \
  --report audit-output/actual-js-results.json
```

The saved deterministic request file can replace the first command. Generated raw output is intentionally not bundled; it contains full numerical snapshots and can be regenerated. Saved compact results and `validation-summary.json` identify the audited hashes.

## Independence and scope

The adapter only maps API calls. Evaluation comes from actual `core.evaluate`; directional probes use actual `core.pattern`; random-factor covariances use actual `core.covariance`. The Python oracle never imports the producer's reference math. It independently builds physical channels, steering, direct high-precision Gram–Schmidt projections, covariance matrices, powers, ranks and constraints.

Checks include:

- Physical element support, full/subarray aperture, no channel renormalization, actual total trace and per-antenna powers
- Desired data power, independent radar interference, SINR, shared data-only semantics and QoS boundary status
- Strict-null target upper bound, equality for the projected beam and inequality for random nullspace covariances
- Actual directional-power calls with the common bound 0≤P(u)≤N·P, without per-curve peak normalization
- Exact alignment versus genuine empty nullspace, near-opposite-endfire aliases, one radar element, zero budgets/channel, and explicit extreme numerical errors
- Analytic tiny target identities checked relatively against high precision; corresponding `_direct` values retained and checked on an absolute scale, acknowledging cancellation
- Conditional source normalization: the printed PR/N yields .35P0 radar trace and split total at most .85P0 under the stated settings. This is not evidence of which power the authors actually simulated

General algebra tolerance is 3e-11 absolute plus 3e-11 relative. Tiny q and projected analytic target identities use 8e-13 relative tolerance without an absolute floor. Physical support zeros are exact. Numerical rank uses a disclosed P·1e-11 threshold and is not confused with mathematical rank. No epsilon floor changes q or physical feasibility.

The seven tiny-q errors preserve the documented whole-evaluation diagnostic domain, including extreme near-alignment at zero radar budget. Ordinary zero-budget cases and exact q=0 with zero radar budget are supported.

The source content assertions accompany manual comparison to the verified VoR/arXiv source audit. They are not a claim that matching text alone proves scientific correctness. If the core or content changes, rerun against the new hashes.
