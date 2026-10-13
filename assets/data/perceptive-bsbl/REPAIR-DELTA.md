# v2 repair delta for independent acceptance

## Immutable baseline

Original v1 manifest: `5f47f913b67a51776ce16e26db61ff197bcbb0dd9c545d1c9510e2ec7bb238df`. The original directory was never edited. `V1-MANIFEST.json` preserves its exact manifest; `fixtures-v1/` and `V1-PRESERVATION.json` preserve all13 compact original fixture files and hashes. New numerical runs are separately stored under `fixtures/` with v2 executed-code provenance. Both current and historically executed Python source hashes remain distinct.

`model.mjs`, `complex.mjs`, `solver.mjs`, and `evaluation.mjs` are byte-for-byte unchanged. Numerical interpretation, proposal, dense acceptance, thresholds, rank guards, extraction, and baselines were not retuned. The independently passed mathematical core is not replaced.

## Changes

1. New `schema.mjs` validates complete per-method schemas separately from running snapshots. FM gamma, every objective/history field, covariance status/blocks, extraction/evaluation and same-acquisition digest are mandatory for full results. Method/cap/status/result-prefix/budget relationships are checked; complete cannot omit results or conceal caps. Nested live requests, even unused solver options, reject unknown keys and invalid values
2. `record.mjs` uses that closed schema, preserving immutable round trips and all old valid records. Unknown request/acquisition/evaluator/result/history/extraction/evaluation/covariance/diagnostic fields no longer pass as unchecked claims. Model/acquisition digests remain integrity checks, never authorship authentication
3. `check-record.mjs` branches by declared method, never by an optional gamma field. It regenerates the full acquisition/request and separate truth, verifies diagnostics, initial/final objectives, every accepted candidate against the current full candidate set (with explicit numerical-tie tolerance), predicted/dense deltas, action kinds, tolerance descent, final posterior/covariance, full extraction/evaluation, transferred thresholds, baseline histories, and applicable terminal stopping reasons
4. Checker budgets are checked before decode, after asynchronous boundaries, through numerical work, and before returning. Baseline Halt results are rethrown as Halt. Empty/zero-action branches cannot evade cancellation/exhaustion. Interrupted checker work never returns passed. Valid execution evidence with unavailable initial/posterior/final fields returns `incomplete` with explicit `unavailable` explanations and no invented objective or false mathematical-failure claim
5. `runner.mjs` checks empty-support privileged LS cancellation/work/deadline boundaries. Strict live request validation occurs before acquisition construction, including unused method options and forbidden variant overrides
6. `client.mjs` catches synchronous launch postMessage failure, clears the timer/active state, terminates the actual Worker and rethrows the launch error. A result packet requires a terminal record status; running is a protocol failure. Worker error/exit events are queued after already-received packets so asynchronous record decoding retains valid last evidence and a clean exit cannot preempt a legitimate final packet. Supersession tickets, unique IDs, stale suppression and immutable old-run receipts remain intact

## Explicit expectation changes in adapted port-side regression copies

The original independent probes and findings remain untouched in the independent-review bundle. Copies under `tests/independent-regressions/` have these narrowly documented assertions adjusted:

- A genuinely interrupted initial FM run verifies as `incomplete`, with an empty mathematical-failure list and explicit unavailable evidence; the old probe required `passed`
- An invalid new request now fails before acquisition. Its honest receipt has no record; an older completed/cancelled receipt remains immutable and is never substituted for it
- Signed-zero canonicalization is tested on an allowed numeric field. Unknown diagnostic fields are now rejected by the closed schema; signed zero still normalizes to positive zero
- Port-side reports bind `src/build-info.mjs` rather than the enclosing final manifest, avoiding a self-referential manifest/report hash cycle. The independently rerun external audit can bind the final manifest directly

All59 adapted rehashed-adversary probes and all16 adapted lifecycle probes pass. The35-test suite includes actual Node Workers for synchronous transport failure, nonterminal result packets, final-packet-before-clean-exit ordering, cancellation, hard deadlines, replacement and stale-message suppression. Independent numerical comparison still covers19,393 checks and all1,762 accepted actions in fresh fixtures; max dense-objective discrepancy remains3.574e-10.

The original transient repair-test failures are retained under clearly named initial/setup logs. They concern updated error wording, the intentionally earlier request rejection, a packet/exit race found by the new actual-Worker test (fixed), and a relative-path error generating the preservation binding (fixed). Final full tests were rerun after each source repair.

## Honest checker scope

`passed` means the available complete/capped record's declared numerical evidence is self-consistent within stated numerical tolerance. It does not mean convergence, recovery success, historical authenticity, verified wall-clock timing, or trust in a foreign code hash. `executionStatus` remains separate. `incomplete` is never a pass. Direct checker cancellation/exhaustion throws Halt; callers must display interrupted verification rather than reuse a prior pass.

No browser, UI, website, remote, publication, Codex or user-computer work occurred. Real browser/module-Worker and whole-site acceptance remain separate gates.

## Final pre-handoff consistency additions

Before any v2 hash was handed off, independent static review found three further metadata/stop conditions. Recorded budget limits now equal the effective request budget exactly; privileged LS exact/nearest-grid labels must agree with the physical off-grid convention; dense-candidate rejection must satisfy its negative marginal trigger, dense-vs-predicted agreement guard, and uphill/tiny actual delta. Three deterministic regressions cover these cases. An internal candidate manifest generated before these comments was superseded before delivery. The complete source-bound tests, fresh fixtures, oracle comparisons and profiles were rerun after these changes. `SOURCE-CHANGES.json` lists exact old/new module hashes.
