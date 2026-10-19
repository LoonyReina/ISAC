# Independent source review

Reviewed 2026-10-18. Approval is source-mechanics-only, using explicitly synthetic fixtures. No scientific acceptance, genuine final dataset/pins, numerical trajectory validation, browser QA or publication is implied.

Owner addressed review findings:
- Required independent acceptance receipt SHA-256 supplied separately from receipt; rejects pilot receipts and changed/unbound consumed source bytes
- Reject duplicate phase-I entries, duplicate study points, duplicate per-row attempts, cross-row selected files, mismatched indexed/raw attempt identities, and phase-I entries outside the point inventory
- Preserve unresolved phase-I entries even when no selected row carries their certificate_file; counts include failed attempts and phase-I records
- Import/export bind exact K2 and user-load input bytes plus K2 schema, archive, user-load schema, summary and acceptance identity
- Preserve new raw independent_gate.failures diagnostics in ledger

Independent checks: 13 Python tests pass in test_independent_gates.py; 11 Node tests pass in independent-lifecycle.test.mjs (8 copied baseline mechanisms plus 3 independent additions). Owner's 5 Python baseline tests also rerun successfully. Node harness is a DOM/Worker stub, not a real browser.

Independent additions verify wrong receipt pin, duplicate records, cross-row selection, inventory identity, unresolved phase-I retention, stale import rejection, parameter reset invalidation, late worker errors, and that cached imported results/metrics never become trusted output. Current import finalizer updates its token after launching the new worker and clears the picker only when token === epoch. Pagehide aborts loading, invalidates workers/imports, and prevents late enablement.

Reviewed source SHA-256:
- build_data.py: 019bed063946f7601a89fe74d68a9c8ab8e8a7ebdafb57196cc63e94c351f51c
- adapt_ui.py: 4f19bc07db6020089eb583578e79d3d986c3001f9e361e3748291a854c28381e
- ssp/ssp-model.mjs: bd25dda27e62c58ca15f577faf92c562ae2f9cde71c79bcd201bef27f69c7812
- ssp/ssp-ui.mjs: 716c816609458df8af4757e4e88b54cea4f5cb413a92ba24e5d17ed3054e7c8c

Required before real-data/release approval: independently supplied final receipt hash, full real inventory and source hashes, real selected W0 seed replay, accepted source identity and schemas, genuine pins generation, integration regression checks and browser QA. Current source remains intentionally fail-closed without pins.

## Actual accepted data review (2026-10-18 06:26 UTC)

Passed output-only real-data review. Independent script `verify_real_mapping.py` and result `REAL-MAPPING-REVIEW.json` record exact source bindings. Checked every one of 3,651 receipt-bound files against final receipt SHA-256 684a0cb8a3d46eb871e977588daa5e0b566697fdb4557ec42aec8740e1c2ba76. All 576 selected-method rows and all cells/accounting/metrics preserve source values. All 1,119 optimizer ledger entries and 34 phase-I certificates preserve index identity and raw diagnostics. All 45 representative W0 matrices exactly reproduce frozen PCG64 seed initialization; all 30 convex reference associations preserve selected raw beamformers or absence thereof and linked certificates.

Actual teaching JSON SHA-256: 99390536b5d9f711e0bed55d9f298cb6704febe4c1a53174a9ce660cb830a939. Pins module SHA-256: f91e5f2f8a476f60ff36778335277f3c0357201839cadede41d565dc70fb1ec5. Both data pins match actual bytes and schemas; K2 archive pin matches its source metadata.

Reviewed and reran the owner's real-data ledger/worker tests: 9/9 pass. All ten ledger columns match source for every one of 1,153 entries across 24 pages, final page 3 entries; K6/Γ20 filter matches 250 entries. Reset, search, unfiltered download and focus boundary mechanics pass. All 45 real starts also reproduce the accepted raw initial objective in JS, and K2 remains usable. Real inventory retains 31 SSP caps, 7 unresolved SSP rows, 68 certified-infeasible convex rows, 16 QoS-passing accepted vs 17 finite selected SSP rows, and K6/Γ20 common n=3 with 202/5000 undefined bootstrap draws. Independently reran 11 lifecycle/source tests successfully against current UI.

Current UI SHA-256 supersedes earlier source review UI hash: 74f45993beeea01012220797f239eba7aca6c35f4eb3c35fdb4640770d21524f. Dynamic outcome and bootstrap prose was inspected against actual data. No browser, assembled page, full-site integration, deployment or publication approval is implied. Strict trajectory equivalence is not claimed.
