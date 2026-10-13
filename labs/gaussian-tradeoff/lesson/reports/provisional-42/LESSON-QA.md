# Gaussian tradeoff lesson: mounted UI and actual Worker receipt

Date: 2026-10-12 UTC. Node: v24.19.0.

## Accepted result

- 42/42 tests passed; no failures, skips or cancellations. Recorded wall time: 5.909 seconds
- 16 controller/runtime gates and 26 mounted/static UI gates
- 8 production mounted UI scenarios delivered 16 actual raw/history download payloads, totaling 198,191 UTF-8 bytes
- All 8 scenarios imported their downloaded history through the production file-input handler, then replayed through the production replay button; newly computed result digests matched exactly
- A separate replay process independently decoded the tagged records and verified their SHA-256 identities, then launched a fresh actual Node Worker for every one of the 16 files. Every downloaded historical result matched the new result bit-for-bit; matching raw/history pairs agreed
- All seven numerical/Worker/codec source files match the final accepted `SOURCE-FREEZE.json`; no runtime source was changed for lesson integration
- Production controller/view/entry/CSS/page hashes were captured before module loading and remained unchanged throughout evidence generation

## Cases and gates

Mounted export cases: fresh complex H with continuous κ=3.14159; fresh non-real custom Q with exact power budget; changed three-port shape/model; T=1 with explicitly unrealizable Stiefel; held Gaussian X/Y posterior; held Stiefel X/Y posterior; finite Wishart with structural zero directions; finite rank-one sphere MI.

Tests also cover read-only law/matrix/component/truth/stage selections, all displayed matrix choices, source-derived SVG data, independent reconstruction of sample covariance, recursive record immutability, changed posterior assumptions with identical X/Y, raw/history provenance, invalid model/covariance/record replacement preservation, accepted-only supersession, cancellation/hard stop, actual Worker death, restart, reset, page suspension, stale file reads, obsolete read errors, same-file retry, delayed old-Worker termination during import/reset, stale truth removal, input snapshot before delayed Worker readiness, stale raw-export hashing across a replacement run, valid/corrupt import hashing across a replacement run, rejected-candidate preservation of a valid in-progress export, and custom-Q KKT labeling.

The UI adds no numerical shortcut: compute requests enter the frozen actual Worker. The export harness captures only the text supplied to the production download callback. It does not construct alternate export records.

## Reproduction

From the source or compatibility staging root:

```sh
node --test labs/gaussian-tradeoff/lesson/tests/*.test.mjs
node labs/gaussian-tradeoff/lesson/tests/export-ui-records.mjs --out /absolute/new/evidence-directory
node labs/gaussian-tradeoff/lesson/tests/replay-ui-records.mjs --manifest /absolute/new/evidence-directory/UI-EXPORT-MANIFEST.json
```

Output directories are explicit. The exporter refuses to replace a prior manifest, and the replay command refuses to overwrite an existing replay report. Preserve receipts and select a fresh directory when repeating.

## Evidence files

- `lesson-tests-final.log`: full 42/42 test output
- `lesson-tests-expanded-41.log`: prior expanded 41/41 run
- `provisional-35/`: preserved prior 35-test receipt, exports and portable replay artifact
- `ui-exports/UI-EXPORT-MANIFEST.json`: per-download name, exact byte count/hash, input identity, result identity, source hashes, case inputs, and actual Worker request operations
- `ui-exports/UI-REPLAY-REPORT.json`: all 16 fresh independent-decoder replays
- `ui-exports/*.json`: actual canonical download bytes
- `ui-exports.log` and `ui-replay.log`: command output

Manifest SHA-256: `8435d6b4a9b5decac0bf23aea599ecabbbde76ed80effb4cc2b651f224bc3eee`

Replay report SHA-256: `6ee8f425f6b6e8f4469403e2bf34eaf7684565f6273a94019381ea9019250bfa`

Final runtime source-freeze SHA-256: `ea5c2ad520d33962b4d33e9f6e9f89e9ddaa3e1ee41e4d249250c54da91cb113`

## Development receipt and boundaries

`provisional-35/lesson-tests-first.log` preserves the first run: 32/35. One failure was a provisional test hash pinned before the final accepted kernel snapshot. The final accepted kernel hash was verified against the source-freeze and only the test expectation changed. A stale file-selection completion regression was corrected in the lesson. The truth test initially over-required a hidden container even though the old arrays were already replaced by an explicit no-result message; its substantive assertion checks absence of stale truth/score arrays. The final lesson additionally hides this no-result output. An independent lifecycle audit then identified stale raw-export completion and stale failed-import hashing across newer runs; the lesson was corrected and their regressions are included in the final 42 tests. The preserved 35-test receipt predates these final lesson changes and must not be treated as acceptance of the final bytes.

This is actual Node `worker_threads` plus a first-party lightweight mounted DOM/event harness. It is not actual-browser module loading, network loading, layout, CSS rendering, mobile/keyboard/screen-reader certification, browser memory/performance validation, online deployment verification, or additional independent scientific validation of the mathematical model. SHA-256 confirms content identity, not provenance authenticity or scientific truth. No remote browser or published site was used.
