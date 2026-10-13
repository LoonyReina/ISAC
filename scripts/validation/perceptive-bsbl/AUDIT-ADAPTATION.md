# Portable record audit adaptation

`check-download.py` retains the accepted independent v2 adapter's equations-first numerical functions, and uses the exact independently authored dense oracle with SHA-256 `2745e67d3c2f064fea819cabe20673180713f74139c0101a2a18973a7e7cb4ac`.

Changes from the independent v2 adapter:

- Replace workspace-specific imports and discovery with positional native files or the production Blob manifest, plus an explicit `--oracle` option
- Check the oracle bytes before import; provide helpful JSON failure and normal `--help`
- Preserve the numerical checks for forward observation, all accepted projected proposals, best candidate at each actual trace state, dense objectives and deltas, final mean/covariance, OMP/LS, extraction and ambiguity-aware evaluator metrics
- Allow actual running snapshots to omit terminal covariance/extraction/evaluation. Audit the available mean/trace and mark the unavailable terminal quantities `incomplete`; do not synthesize fields
- Mark original partial/failure/cancellation/budget states and unexecuted methods incomplete even when every available numerical quantity agrees
- Include production Blob byte hashes and a controlled same-W/Y one-path versus two-coincident-half-gain-path practical-solver invariance check
- No untrusted source execution, historical provenance rewrite, or pass-on-exception fallback

This is an adapter-level regression against an independent oracle, not a new independent human review of the lesson. Native closed-schema/integrity/adversarial tests and the independent lesson review remain separate.
