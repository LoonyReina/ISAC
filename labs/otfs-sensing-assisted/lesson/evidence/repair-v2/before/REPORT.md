# Independent record, session and ownership review

Frozen commit: `3c25b52619582f757a6c1fc7b445322cf7e7e8c7`
Reviewed files: `labs/otfs-sensing-assisted/lesson/{record,session,lesson,adapter}.mjs` and supporting frozen codec/validation/client/evaluation/receiver/protocol source. Read repository AGENTS.md and lesson README. Runtime: Node 24.19.0. Review performed 2026-10-13 UTC.

## Verdict

Three reproducible defects block acceptance. These require teaching-layer/session repairs. No frozen runtime kernel changes are recommended. Evidence is independent executable probes using production modules, real Node module Workers and the provided light DOM harness; it is not browser evidence.

## 1. Async reset clears a newer selected run

Location: `session.mjs:31-33`, especially `reset()` after `await this.restart('reset')`.

A completed first run has a Worker. Delay the acknowledgement of that Worker's termination, call reset, then start a new run while reset is waiting. The newer run receives its own selected ID and active owner. When the older reset finishes, it sets selected to null and notice to “尚未运行”, although the newer run remains active. The newer run eventually completes but never regains selection. User-visible result becomes hidden.

Reproduction: `node probe-ownership.mjs`, first case. Actual Worker termination is initiated immediately; only its returned Promise acknowledgement is gated. This deterministically exercises the existing asynchronous race. `ownership-results.json` records selected=null with activeId=newId and state=running, then selected=null after new completion.

Repair expectation: either make reset's clear-selection step synchronous before any newer action can intervene, or fence its asynchronous continuation against newer ownership/selection. Apply the same ownership principle to suspend/destroy continuations and messages.

## 2. Rejected newer transport loses the old active owner

Location: `session.mjs:16-18,24,27`; `active` is replaced before acceptance and cleared on the newer terminal.

Start A and wait for its real raw_frame_ready progress. Inject a failure only for B's second run postMessage. The client correctly restores currentId=A and keeps A in pending, but session.active becomes null and busy false after B resolves as error. Cancel therefore does nothing. A still finishes in the background; session state/notice remain B's error.

Reproduction: `node probe-ownership.mjs`, second case. Both scientific computation and lifecycle events for A use a real Node Worker; only B's outgoing postMessage is deliberately made to throw. `ownership-results.json` captures active=null, busy=false, clientCurrent=A and pendingIds=[A]. A completes even after session.cancel().

Repair expectation: retain/restore the preceding accepted owner until B is accepted, and keep cancellation directed at the actual live compute owner. Cover Worker-rejected requests as well as postMessage failure.

## 3. Valid raw-only retained evidence crashes rendering/import

Location: `lesson.mjs:26` calls contaminationRows/gainRows and later renderGraph; `adapter.mjs:16` gainRows directly indexes frame.estimatedGains. `record.mjs:70-80` explicitly permits raw partial frames with no estimator. `session.mjs:29` changes history/selection before emitting a render, and its catch re-emits the same failing selected data.

The first probe constructs a strictly accepted raw-only partial. Import changes selection and appends history, render throws “Cannot read properties of undefined (reading '0')”, then import reports “导入被拒绝；当前运行/所选记录未被替换” even though selection did change. The catch's second emit throws again. The old completed entry can be recovered by selecting its ID.

A stronger fully genuine case requires no fabricated evidence: rectangle preset with dataEnergy=1e-6, pilotPowerRatio=1e-6, pilotPhase=0.1 and maxIterations=1. Derived declared Ep is exactly 1e-12, but squared complex pilot components sum to 9.999999999999998e-13. Submission accepts, then the frozen estimator correctly enforces its numeric bound and throws. Worker retains a raw frame with no estimator. The resulting production record passes structural validation AND explicit full same-implementation prefix replay. Production mount still throws when showing that real failure.

Reproduction: `node probe-genuine-raw-failure.mjs`. Evidence: `genuine-raw-estimator-failure.json`, `genuine-raw-failure-results.json`. The untrusted structural-only companion is `raw-without-estimator.json` and is intentionally not a genuine prefix; its explicit replay fails. Both must be safe to display, since structural acceptance is intentionally weaker than replay.

Repair expectation: render raw frame, energy ledger, raw x/y/noise and unavailable-estimator placeholders without indexing missing arrays; do not call estimator-dependent graph/contamination helpers until estimates exist. Keep the kernel unchanged. Make import failure wording/state transactional, or prevent render failures from masquerading as parse rejection.

## Additional review and coverage boundaries

- Static inspection found explicit root/nested allowlists, duplicate/unsafe-key preflight, UTF-8/hash checks, depth/node/file limits, canonical typed codec text, lossless numeric array conversion, signed-zero tagging, exact scientific relationships, masks, counts and distinct authenticity/replay layers.
- Existing tests were inspected, including signed-zero roundtrip and tamper detection, root/nested schema mutation, no-result terminals, genuine cancelled prefixes, delayed files, pinned downloads and fresh rerun IDs. The parent independently ran the provided suite. This reviewer does not claim an additional rerun of that entire suite.
- Independent executions here: three ownership/import cases in probe-ownership.mjs and the genuine failing-record/mounted-UI case in probe-genuine-raw-failure.mjs. The genuine record's integrity, structure, selfConsistency and sameImplementationReplay all passed; sourceAuthenticity and independentNumericalReplay correctly stayed not-run.
- A supplementary large strict-schema/adversarial script submission failed before process creation due to an exec-server transport disconnect; it did not run or create a file. No result from that attempted script is claimed.
- Remaining work: adversarial duplicate/depth/node/budget fuzz beyond provided tests; independent async check/edit/import selection interleavings; author repairs and regression rerun; actual browser rendering, scheduling, DOM, accessibility and download behavior; whole-site integration/build and online verification.
- Arbitrary receive imports being compared against the fixed tiny reference were independently noticed and delegated back to the parent for reproduction/reporting; they are not double-counted in this report.
- Worktree stayed unmodified by this reviewer. An existing Python cache generated by the parent's suite was disclosed and removed by the parent; final git status was clean.
