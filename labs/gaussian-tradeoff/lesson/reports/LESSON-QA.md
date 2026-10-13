# Gaussian tradeoff lesson: final mounted UI and actual Worker receipt

Date: 2026-10-12 UTC. Node: v24.19.0.

## Local gate result

- 45/45 tests passed; no failures, skips or cancellations. Recorded wall time: 6.126 seconds
- 16 controller/runtime gates and 29 mounted/static UI gates
- 9 production mounted UI scenarios delivered 18 actual raw/history download payloads, totaling 1,125,782 UTF-8 bytes
- All 9 scenarios imported their downloaded history through the production file-input handler, then replayed through the production replay button; newly computed result digests matched exactly
- A separate replay process independently decoded the tagged records and verified SHA-256, then launched a fresh actual Node Worker for every one of the 18 files. All downloaded historical results matched bit-for-bit; corresponding raw/history pairs agreed
- All seven numerical/Worker/codec files match final accepted SOURCE-FREEZE.json; lesson integration did not change runtime source
- Production controller/view/entry/CSS/page hashes were captured before module loading, remained unchanged during export generation, and were rechecked before packaging

## Maximum UI dimension/block case

The ninth case used a fresh complex 6×6 communication H, M=Nc=Ns=6, T=32, B=512, and all six UI landmark weights, including continuous κ=3.14159. The exact H and inputs are in the actual raw file; no precomputed result was used.

- Initial mounted UI run: 1564.122 ms
- Entire case including downloads, import and actual UI replay: 3277.816 ms
- Actual raw download: 3,394 UTF-8 bytes
- Actual history download: 924,197 UTF-8 bytes
- Whole-Node RSS at case start: 103,718,912 bytes
- Highest observed whole-Node RSS, sampled every 10 ms: 225,177,600 bytes
- Observed rise from case start: 121,458,688 bytes
- Cumulative process maxRSS through that case: 219,900 KiB

RSS includes this Node process, Worker threads, DOM harness, export text and audit copies. Sampling is not a guaranteed instantaneous peak and the cumulative metric includes earlier cases. These figures are observations of this Node run, not a browser memory limit, benchmark promise, or proof that every allowed model combination succeeds.

## Coverage

Export cases: arbitrary continuous weight/fresh complex H; fresh non-real custom Q; changed three-port model; T=1 with explicitly unrealizable Stiefel; held Gaussian posterior; held Stiefel posterior; finite Wishart with structural zeros; finite rank-one sphere MI; and maximum UI dimensions/blocks.

The 45 gates also cover all matrix/component/law/stage displays without regeneration; independently reconstructed sample covariance; immutable result/record arrays; unchanged held X/Y with changed posterior assumptions; exact raw/history provenance; explicit fresh replay; invalid input/covariance/hash replacement preservation; accepted-only supersession; cancellation/hard stop; actual Worker death; restart/reset/suspension; stale file reads and obsolete failures; same-file retry; delayed old-Worker termination during import/reset/restart; restart while hidden; cold-start cancellation while the actual Worker factory is pending; snapshot before Worker readiness; stale raw-export/import hash completion across newer work; rejected-candidate preservation of a valid current export; custom-Q KKT labels; and removal of stale truth scores.

The UI calls the frozen numerical Worker. The evidence exporter captures only text delivered by production download callbacks and never synthesizes substitute records. The independent decoder uses Node Buffer/crypto and does not import the runtime codec.

## Reproduction

From the source or compatibility staging root:

```sh
node --test labs/gaussian-tradeoff/lesson/tests/*.test.mjs
node labs/gaussian-tradeoff/lesson/tests/export-ui-records.mjs --out /absolute/new/evidence-directory
node labs/gaussian-tradeoff/lesson/tests/replay-ui-records.mjs --manifest /absolute/new/evidence-directory/UI-EXPORT-MANIFEST.json
```

Directories are explicit. Export refuses an existing manifest; replay refuses to overwrite an existing replay report. Preserve receipts and use a fresh output directory or extraction for another run.

## Evidence

- lesson-tests-final.log: 45/45 results
- ui-exports/UI-EXPORT-MANIFEST.json: case inputs, actual Worker operations, source hashes, exact download names/bytes/digests and Node-only memory observations
- ui-exports/UI-REPLAY-REPORT.json: 18 separate fresh Worker replays
- ui-exports/*.json: untouched canonical payloads from actual download handlers
- ui-exports.log and ui-replay.log: command output
- provisional-35/ and provisional-42/: preserved earlier receipts; these predate the final UI lifecycle fixes
- lesson-tests-expanded-41.log and lesson-tests-expanded-44.log: intermediate passing gate receipts

Export manifest SHA-256: `8b261cd1054cf62288795c33c0d4f01248e23c988b44a8d210cbb99ea269c04a`

Replay report SHA-256: `c9d4306a0f544e7d591d6e61981d257c5268558559ff0beccf6d454e0245c91d`

Runtime source-freeze SHA-256: `ea5c2ad520d33962b4d33e9f6e9f89e9ddaa3e1ee41e4d249250c54da91cb113`

## Development history and limits

The initial 32/35 run is preserved under provisional-35. A provisional kernel test hash predated the accepted final snapshot; the final source-freeze was verified and only the test expectation changed. A stale file-selection completion was corrected. An overly presentation-specific truth test was adjusted to check the substantive absence of old arrays; the final lesson also hides no-result truth output. Independent review subsequently found stale raw-export/import digest completion and delayed-restart races; the corrected behavior is covered in the final suite. Cold-start preparing work now keeps Cancel enabled and is covered by an actual delayed-factory regression. No superseded receipt is relabeled as acceptance of newer bytes.

This is actual Node worker_threads plus a first-party lightweight mounted DOM/event harness. It is not an actual browser, CSS/layout engine, screen reader, mobile device, online deployment verification, browser-performance audit, or an additional independent scientific audit of the underlying mathematical model. Digest equality establishes content identity, not provenance authenticity or scientific truth. No remote browser or published site was used.
