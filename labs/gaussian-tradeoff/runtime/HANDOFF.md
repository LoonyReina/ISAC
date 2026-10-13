# Gaussian ISAC Worker integration handoff

## Deliverables

- `gaussian-tradeoff-js-v0.1-runtime.zip`: self-contained runtime ES modules, unchanged first-party linear-algebra helper and integration/scientific-boundary documentation
- `gaussian-tradeoff-js-v0.1-full-evidence.zip`: the same runtime plus portable original Python reference, fresh oracle inputs, tests, logs and raw numerical evidence
- `SOURCE-FREEZE.json`: exact seven runtime source hashes and accepted source identities
- `ARTIFACT-MANIFEST.json`: all full-evidence file hashes except the manifest itself and post-packaging verification
- `ARCHIVE-VERIFICATION.json`: member-byte verification and archive hashes (external to avoid a self-reference)

No UI repository, remote repository, local executor or Codex environment was used or modified. No source PDF, figure image or author code is included. Runtime has no external network or npm dependency.

## Consumer contract

Use `createWorkerClient()` from runtime.mjs and editable inputs from presets.mjs. A request returns `{id,result,cancel}`. A successful terminal event is `complete`; its payload contains `{input,result,inputHash,runRecord,freshExecution:true}`. All plots, tables and exports must consume this single result object. Do not duplicate formulas or treat history imports as a fresh run. Use the strict canonical codec rather than ordinary JSON serialization for exported records.

Maintain pending/error/cancelled/superseded/dead/reset states. An invalid new request preserves the prior accepted request; a valid new one supersedes it. Never keep a success plot under the identity of a rejected candidate. A historical record's integrity hash is not evidence that its mathematics was freshly executed.

`firstBlock` shows actual X/R/Y and posterior. `evaluationOnly.truth` and `evaluation` are score-only views and must never be fed to the estimator. `posteriorCovarianceColumn` is the transpose of the row-acting matrix in general; do not merge those labels. `realBFIM` is one row; `fullRealBFIM` explicitly states all-real/all-imag coordinate ordering.

## Useful controls

Expose finite κ continuously within [0,10⁶], plus a separate communication-only choice. Keep the reviewed six teaching weights as landmarks, not lookup outputs. B, seed, power, proper prior/noise, H and optional Q are real inputs with explicit bounds. A covariance editor must preserve Hermitian PSD and trace checks. T<M remains allowed for Gaussian/proper-prior sensing, while an unachievable fixed sample covariance is reported rather than silently resized.

The source presets and teaching example stay distinct. Fig4 is finite Wishart integration. Fig10 presets are one shared frozen channel under two labeled power conventions, not a live or author-tabulated fading expectation. Source91-style rank-one sphere MI remains in its own panel. The general Stiefel rate field is null and must stay unavailable.

## Required scientific labels

Keep exact model expression, convex certificate, finite quadrature, finite Monte Carlo and approximation labels distinct. The covariance outer pair is not generally an achieved law pair. Gaussian signaling is a valid law in the rank-deficient teaching channel but is not the paper's stronger null-space-completed construction. Random fixed covariance is not deterministic known input.

No full-paper reproduction, exact p(X)-optimized region, finite code, general finite-SNR MIMO Stiefel rate or achieved-hull claim is authorized. The accepted source conflict interpretations and Pt/PT ambiguity remain visible in every result.

## Verification boundary

Owned tests, actual Node Worker and full-kernel browser module VM are recorded. There is no actual-browser runtime, performance, rendering, UI integration or published-site acceptance in this package. Independent port and protocol reviews must pin these source/archive hashes before an integration gate claims acceptance. See NUMERICAL-VERIFICATION.md and PROTOCOL-HANDOFF.md.
