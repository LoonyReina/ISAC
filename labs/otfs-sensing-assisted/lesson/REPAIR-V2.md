# Lesson boundary repair v2

This supplement supersedes four lesson-layer behaviors from the rejected functional lesson commit `3c25b52619582f757a6c1fc7b445322cf7e7e8c7`. Its original `LESSON-FREEZE.json`, `PUBLIC-ASSETS.json`, `OWNED-TESTS.json`, old evidence and v3 numerical runtime remain byte-for-byte preserved. The separate v2 freeze records before/after hashes; it does not rewrite the original acceptance history.

## Reproduced defects and repairs

- **L01: unrelated exact reference.** An arbitrary imported `operation=receive` result was labelled as the fixed 3×3 counterexample and compared with its unrelated offline posterior. The exact comparison now requires full canonical scientific input identity: shape, support, every raw-y component, pilot position/value, Es/N0/prior powers, mode and iteration settings. Other valid receives get a generic view labelled with the actual mode and runId, no fixed exact reference/KL/BER, and bounded row-by-row digital inspection. Selecting another record clears the receive display rather than leaving stale output as current.
- **L02: reset race.** Reset/suspend continuations previously overwrote newer selection or status after awaiting termination. Selection and notices now change synchronously before waiting; the continuation has no late state writes. Destroy closes admission before awaiting termination. Deterministic tests delay acknowledgement of a real Worker's actual termination.
- **L03: orphaned old owner.** A failed newer postMessage or Worker-rejected request previously cleared session.active despite A remaining active in the validated runtime client. Session retains per-request owners and restores the client's still-current owner when the newer request was never accepted. Cancel remains directed at A. Both failure routes are tested with real Workers and narrowly injected B transport/validation faults.
- **L04: raw-only failure.** The real pilot-energy boundary failure can retain x/y/noise and energy without estimates or receiver results. Its view now shows the raw frame, labels missing estimates/probabilities/decisions explicitly, avoids estimator-dependent helpers, and exports/imports/rechecks the genuine partial. Import parse rejection is separated from record adoption/rendering; an observer exception cannot be relabelled as a rejected unchanged import.

The reported preview-bound copy mismatch is also fixed: the 12,000-character limit now includes its truncation suffix.

## Evidence

`evidence/repair-v2/before/` preserves the independent rejection reports and failing raw records. The original frozen lesson/worktree is not modified.

- Original 47 tests plus 12 new deterministic boundary tests: **59 passed, 0 skipped**
- New suite: `tests/boundary-v2.test.mjs`
- Seven refreshed production mount → actual Node Worker → download Blob records: **37 receiver records**, independent Python full-output parity and exact categorical parity, maximum error `2.375877272697835e-14`
- Three additional production exports: changed-y generic receive, non-3×3 generic receive, and the genuine raw-only estimator failure. All download/import/explicit-self-consistency flows pass. Independent Python checks pass for two additional receivers and the retained raw-only frame (zero fabricated receivers).
- No numerical, codec, runtime Worker/client, source fixture or source interpretation changes

Run all lesson tests with `PYTHONDONTWRITEBYTECODE=1 node --test labs/otfs-sensing-assisted/lesson/tests/*.test.mjs`.

Production evidence entrypoints are `tests/export-records.mjs`, `tests/verify-production-downloads.py` and new `tests/export-boundary-v2.mjs`. Frozen evidence is under `evidence/repair-v2/`.

This is Node module Worker and mounted light-DOM evidence. Real browser rendering/download/accessibility, site integration/build and deployment remain separate gates. Independent reviewer reacceptance is still pending at author freeze.
