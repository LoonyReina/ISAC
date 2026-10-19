# Fresh extended-CRB independent parity evidence

This is new local verification generated on 2026-10-18. It does not recover the missing original CVXPY raw outputs or the historical full archive.

The 18 frozen inputs are copied byte-for-byte from the recovered fresh-inputs-regenerated.json. Their parsed values match the recreated deterministic generator, and represent the original declared scenario seeds and grid. Original historical JSON byte identity is not established. The exact known-hash recovered JS core and utility files were copied unchanged. The independent oracle, verifier, JS runner and NumPy checker were copied unchanged from the recovery tree; no solver setting or acceptance threshold was tuned.

All 18 Clarabel solver outputs are optimal_inaccurate, not optimal. The warning and raw outputs are retained. All 18 independently repaired oracle certificates meet the pre-existing physical and dual-gap gates; all 18 fresh JS outputs meet the unchanged objective-parity, physical, dual, and Schur gates. Four arbitrary-PSD helper recoveries also pass. SUMMARY.json contains the numerical extrema and versions. SCS is installed but was not used by this oracle run.

No fresh lifecycle, baseline, algebra, historical-helper, Worker, UI-handler or browser tests are claimed by this bundle. Previously observed 15-second harness timeout remains preserved in the original recovery evidence. This run does not resolve browser/import/mobile/performance or source-provenance gaps, and is not interval-certified or exact-paper-figure reproduction.

## Reproduce

Use PYTHONPATH=/workspace/shared/recovery/python-deps and OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 TMPDIR=/workspace/shared/recovery/tmp for Python commands. Run in this evidence root:

1. python -u run-fresh.py
2. python tests/verify_oracle.py
3. node tests/run-port.cjs
4. python tests/check_port.py

The run-fresh.py driver imports the unchanged oracle, checks the recovered frozen inputs against the generator, writes each result incrementally, and preserves exceptions as structured output if any. No exception occurred in this run. Manifests describe new evidence identities, not missing historical output identities. Keep the evidence separate from public runtime files. No upload, deployment, browser use or Codex access occurred.
