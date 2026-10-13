# Independent Worker and codec review

**Final scoped result: all targeted final-byte checks passed.** Every reproduced defect below was fixed by the owner and independently retested. This is a focused correctness/resource/lifecycle review, not a generic security certification.

## Exact bytes

Source: `final-snapshot/`, independently copied from the owner after freeze. All seven runtime files match the declared freeze, and were unchanged in both the snapshot and owner directory after testing.

- `SOURCE-FREEZE.json`: `2e74d10363e2d2feac9a06ec0c061c9d8059345023a3274c530a30f02728018b`
- `ARTIFACT-MANIFEST.json`: `6cfb8514a1787ef6f007be39258870c423cc2887776ada7ec25b5b97f116af25`

| Runtime | SHA-256 |
| --- | --- |
| js/codec.js | ea32aa145a59794a21421ee7d900bc8d59566ddd734416aeb2d570bae333c1a5 |
| js/sha256.js | 9f1dfd6b3c81f5647db4a2f8259e8e4cc756d27183b1e0a9c43b586f361952e6 |
| js/linalg.js | 7d5983a18f3bf1b54db5076944bc12e84c9489059dc66481fcba277f65bdaafc |
| js/receiver.js | 473e7739d35a7dcde7807edb0627a9f0058a4d193518a6c8cfa6745a6218de98 |
| worker/client.js | 2ec4be85c09f9abfa6a86da8995ed1b6c6c67bbd28518ca299f67db19dca19eb |
| worker/protocol.js | 7a2eebeed3e169bf9339a75d87b317190d84ddf9ee9cedb07737039f64422a38 |
| worker/receiver-worker.js | e2f50711ef502d8ec6cb185a7e5d9f3cb00444512fe57c8d4de8bbfa12a5d534 |

Verification: `final-freeze-verification.json`, `final-hashes.sha256`, `final-summary.json`.

## Reproduced findings and fixes

| Finding on earlier exact snapshots | Owner fix and final verification |
| --- | --- |
| A late factory restart replaced a newer explicit worker, stranded its actual numerical request, and could resurrect a disposed client | Lifecycle epochs fence stale continuations and dispose unused transports; unchanged actual-Node race regressions pass |
| Direct `decodeRecord(object)` yielded while hashing caller-owned data, then returned mutated rank/samples with stale identity | Object import, identity, and history-export inputs snapshot before yielding; mutation regression passes |
| Rejected `Symbol.toStringTag` getters executed during preflight | Captured native typed-array accessors and descriptor-first rejection; getter regression passes |
| Canonical serialization consumed inherited array iterators, replacing validated finite values with NaN/null or expanding output; direct observation validation also trusted inherited `shape.reduce` | Indexed canonical emission/native lengths and explicit dimension product; ordinary/typed subclass and zero-sample shape regressions pass |
| Direct receiver shape/held snapshots consumed inherited iterators; bounds/shape validation trusted supplied iteration and `some` | Indexed copies and comparisons, indexed magnitude checks and own-value descriptor validation; all four direct-array regressions pass |

The direct-object/subclass findings were not demonstrated as structured-clone transport bypasses. Actual Worker cloning isolates those prototypes. They nevertheless affected exported direct APIs. No unbounded iterator was executed.

Original failures, hashes, and finite repros are retained in `initial-snapshot/`, intermediate snapshots, `audit-*-initial.json`, `audit-*-async-fixes.json`, expanded intermediate reports, and `WORKER-REVIEW-INTERIM.md`. No owner files were edited by this reviewer.

## Final test evidence

| Suite / probe set | Final result |
| --- | --- |
| Owner codec + Worker suites, independently rerun | 41/41 passed |
| Independent Worker/hash groups | 8/8 passed |
| Independent async integrity/lifecycle regressions | 3/3 passed |
| Independent codec/protocol boundary groups | 13/13 passed |
| Independent direct receiver array regressions | 4/4 passed |
| Actual Node session cap | 10,000 controls completed; client and Worker reject request 10,001; no pending promises |
| Actual kernel full-cap/zero-output probes | 5/5 completed with finite output, passing record preflight and successful history export |

Coverage includes independent Node-crypto hashes of canonical config/raw binary samples, Unicode/signed zero/byte offsets/chunk boundaries, typed arrays, sparse/nonfinite/shared buffers, strict metadata and config rejection, malformed/tampered import rejection before supersession, import/export/recompute/history labels, cancellation/supersession, invalid-newer-request recovery, worker death/restart, depth/nodes/UTF-8/key/array/total budgets, and session quotas.

The actual Worker tests use Node `worker_threads`; independent lifecycle tests use the actual numerical core. The owner suite also includes separately labeled fixture-kernel and browser-loader VM tests. **A VM is not an actual browser.** No browser/device/CSP/asset loading/UI/accessibility/navigation, live RF, repository, publication, or remote integration was exercised.

## Final result-size probes

All full cases: shape 10×36×20, rank 3, 20 sweeps, tolerance 1e-10, full trace. These are single local Node measurements, not universal accuracy or latency claims.

| Oversampling | SNR | Run elapsed | Result event JSON bytes | Conservative preflight bytes |
| --- | --- | --- | --- | --- |
| 16 | -25 dB | 2,203 ms | 13,383,352 | 20,004,651 |
| 16 | 40 dB | 2,645 ms | 14,557,528 | 21,998,138 |
| 32 | -25 dB | 2,294 ms | 9,687,393 | 13,931,129 |
| 32 | 40 dB | 2,088 ms | 20,333,528 | 29,943,857 |

All four had finite output and completed history exports. The -25 dB/32 case retained one SCPD link's numerical failure; completion does not mean numerical success. The compact zero scene likewise retained failed numerical methods and exported successfully. Largest measured result: 20.33 MB JSON / 29.94 MB conservative, well within the codec's 64 MiB record budget.

Limits of this evidence: the Worker does not explicitly preflight every fresh result before hold/send; these production cap probes found no output-budget violation. The historical unused receiver `maxRequestBytes: 8 MiB` constant was removed before the final freeze. Final direct-kernel dimension/vector bounds and codec/history 64 MiB budgets are separate limits. No over-limit numerical request bypass was reproduced. The 120-second wall limit was reviewed as a cooperative checkpoint limit, not timed to expiration or treated as hard preemption.

## Reproduction

From this review directory:

    node --test final-snapshot/tests/test-codec.cjs final-snapshot/tests/test-worker.cjs
    node audit-worker.cjs ./final-snapshot ./audit-worker-final.json
    node audit-races.cjs ./final-snapshot ./audit-races-final.json
    node audit-boundaries.cjs ./final-snapshot ./audit-boundaries-final.json
    node audit-direct-arrays.cjs ./final-snapshot ./audit-direct-arrays-final.json
    node audit-session.cjs ./final-snapshot ./audit-session-final.json
    node audit-budgets.cjs ./final-snapshot ./audit-budgets-final.json

JSON reports retain tested runtime hashes. Corresponding `*-final.log` files retain console evidence. Harness/report hashes are in `reviewer-final-evidence.json`. Numerical/source-paper parity and archive integrity are separate parent review gates.
