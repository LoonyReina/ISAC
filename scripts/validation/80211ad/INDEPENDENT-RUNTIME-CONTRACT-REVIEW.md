# Independent 802.11ad classic-runtime contract review

**PASS for the pinned review snapshot. No unresolved defect in the reviewed narrow boundary.**

Reviewed 2026-10-12T21:32:16.796Z. All executions and mutations used isolated copies. The integration worktree was read-only. No browser, remote, Codex, deployment, or external publication operation was performed.

## Actual verification

- **361/361 independent focused checks passed** on the final 17-profile checker
- **22/22 grouped regressions passed**: 10 classic contract tests and 12 unchanged ESM/parser tests
- **One clean compatibility build passed**, followed by **25/25 serial negative and output-preservation builds**
- All 25 negatives exited with status 1 before publication: 22 fresh destinations remained absent; three existing destinations retained every original byte and the independent sentinel
- **905 snapshot files** retained their exact byte counts and hashes after review; input-inventory SHA-256: `5899cce99aa76298d9d28150c99cf6bd36868e105251708d3526f22deb21c305`
- The accepted lesson's **13 frozen files** match freeze `77b4347b33a549b57d6e7283efb579bbaaa00b41e2bae792049d4059952e98dd`; its manifest SHA-256 is `24c721c5337653c79c8e403d1d56d717835e9f709db321fb3ed018c978aaa4cd`
- All **22 runtime-manifest entries** were separately checked against their recorded byte counts and SHA-256 values

Clean-build result: **898 staging entries, 873 public files, 32 HTML pages, 3350 dependency edges**. Compatibility-tree SHA-256: `8d145bfcd727c92a83d7af3461966b617b8618a6ea7a02ea369678cffdd3ff80`. Public-tree SHA-256: `5e4988aa716963937ce557b9ef0adfb133659182f0ddc8e0c55fbe8f3ad7bbf4`.

The clean build intentionally omitted aggregate `--test`, `--reproducible`, migration audit, and subsequent `--check`. This report does not inherit those claims from other reviewers. Node.js 24.19.0, Python 3.12.14, NumPy 2.3.5, and SciPy 1.17.0 were verified locally. The serial build harness bounded BLAS/OpenMP threads to one.

## Exact protected graph and source scope

The checker owns **17 complete-source profiles**: the eight earlier ICI profiles and nine new 802.11ad profiles. Source paths, SHA-256 values, policy labels, endpoint order, URL bases, and exact source literals are code-owned. A JSON change alone cannot weaken them; changing source bytes and matching both JSON/identity hashes also fails. Known frozen hashes are tied to their exact public paths across the complete published identity inventory, including copies outside the namespace under another extension.

The two owned public namespaces admit only those profiles and 29 enumerated auxiliary paths. This is an inventory constraint, not a claim that all files with a particular extension execute. The allowed runtime CJS tests, shell/Python scripts, documents, and freeze files are outside the reviewed browser runtime graph.

The four new reviewed browser-runtime edges are:

1. `new Worker('labs/80211ad/runtime/worker/receiver-worker.js')`, resolved from `80211ad-receiver.html`
2. `./protocol.js`, resolved from `labs/80211ad/runtime/worker/receiver-worker.js`
3. `../js/sha256.js`, resolved from that same Worker URL
4. `../js/receiver.js`, resolved from that same Worker URL

The three imports are the actual ordered arguments of one `importScripts` call. **The Worker does not import evaluation.js.** Evaluation is separately loaded on the page after receiver.js and consumed by the lesson controller.

An independent Node VM simulation loaded all three actual browser-branch import arguments synchronously, observed the receiver export and `ready: true`, and confirmed evaluation was absent. Another simulation loaded the actual seven page scripts in order, observed the expected browser globals, and captured exactly one lazy default Worker construction across two client requests. Document-to-Worker and Worker-to-import URL resolution was checked at `/`, `/ISAC/`, and `/nested/project/` deployment prefixes. The current page has no base element, and every script is deferred classic JS. These are local VM/URL checks, not actual-browser or network evidence.

Optional Node branches use `node:worker_threads`, protocol.js, receiver.js, and receiver.js's sha256.js require. They are distinguished from the three browser `importScripts` edges. The historical literal require/fetch checks remain unchanged; this review does not promote them to generic Node dependency discovery.

## Adversarial coverage

Each of all 17 profiles was checked for missing source/identity, altered source, jointly spoofed source/JSON/identity hashes, policy downgrade, and duplicate/relocated known hashes under six extension forms. Further cases covered both namespaces under ten extensions, every importScripts endpoint omission and metadata mutation, duplicate and malformed inputs, unexpected fields/schema, unrelated editable legacy scripts, default Worker endpoint changes, and changed Worker literals with refreshed JSON hashes. Instrumentation confirmed the checker compiles the current source set without executing it.

The full-build cases below additionally test the real mapped-source, staging, dependency, and publication path. Error attribution matters: some missing inputs are rejected by source validation or existing HTML/require checks before reaching the new classic gate.

| Mutation | Output after rejection | Observed error |
|---|---|---|
| missing-worker-source | Destination absent | Error: Missing source: labs/80211ad/runtime/worker/receiver-worker.js |
| missing-worker-public-endpoint | Destination absent | Error: Unreviewed or missing frozen classic source |
| missing-importScripts-source-1 | Destination absent | Error: Missing source: labs/80211ad/runtime/worker/protocol.js |
| missing-importScripts-source-2 | Destination absent | Error: Missing source: labs/80211ad/runtime/js/sha256.js |
| missing-importScripts-source-3 | Destination absent | Error: Missing source: labs/80211ad/runtime/js/receiver.js |
| missing-importScripts-public-endpoint-1 | Destination absent | Error: Unmapped public dependency: labs/80211ad/runtime/worker/receiver-worker.js → ./protocol.js |
| missing-importScripts-public-endpoint-2 | Destination absent | Error: Unmapped public dependency: 80211ad-receiver.html → labs/80211ad/runtime/js/sha256.js |
| missing-importScripts-public-endpoint-3 | Destination absent | Error: Unmapped public dependency: 80211ad-receiver.html → labs/80211ad/runtime/js/receiver.js |
| worker-source-plus-json-hash-spoof | Destination absent | AssertionError [ERR_ASSERTION]: Unreviewed classic runtime contract: exact code-owned paths, hashes, policies and endpoints required |
| controller-source-plus-json-hash-spoof | Destination absent | AssertionError [ERR_ASSERTION]: Unreviewed classic runtime contract: exact code-owned paths, hashes, policies and endpoints required |
| source-manifest-and-json-spoof | Destination absent | AssertionError [ERR_ASSERTION]: Unreviewed classic runtime contract: exact code-owned paths, hashes, policies and endpoints required |
| worker-policy-downgrade | Destination absent | AssertionError [ERR_ASSERTION]: Unreviewed classic runtime contract: exact code-owned paths, hashes, policies and endpoints required |
| omit-importScripts-json-endpoint-1 | Destination absent | AssertionError [ERR_ASSERTION]: Unreviewed classic runtime contract: exact code-owned paths, hashes, policies and endpoints required |
| omit-importScripts-json-endpoint-2 | Destination absent | AssertionError [ERR_ASSERTION]: Unreviewed classic runtime contract: exact code-owned paths, hashes, policies and endpoints required |
| omit-importScripts-json-endpoint-3 | Destination absent | AssertionError [ERR_ASSERTION]: Unreviewed classic runtime contract: exact code-owned paths, hashes, policies and endpoints required |
| wrong-document-worker-base | Destination absent | AssertionError [ERR_ASSERTION]: Unreviewed classic runtime contract: exact code-owned paths, hashes, policies and endpoints required |
| wrong-importScripts-document-base | Destination absent | AssertionError [ERR_ASSERTION]: Unreviewed classic runtime contract: exact code-owned paths, hashes, policies and endpoints required |
| known-hash-relocated-renamed-dat | Destination absent | Error: Frozen classic source path mismatch: downloads/renamed-runtime.dat |
| unknown-namespace-.JS | Destination absent | Error: Unreviewed classic source path: labs/80211ad/rogue.JS |
| unknown-namespace-.cjs | Destination absent | Error: Unreviewed classic source path: labs/80211ad/rogue.cjs |
| unknown-namespace-.dat | Destination absent | Error: Unreviewed classic source path: labs/80211ad/rogue.dat |
| unknown-namespace-extensionless | Destination absent | Error: Unreviewed classic source path: labs/80211ad/rogue |
| missing-source-preserves-existing | Existing output byte-identical | Error: Missing source: labs/80211ad/runtime/worker/receiver-worker.js |
| source-mutation-preserves-existing | Existing output byte-identical | Error: Unreviewed frozen classic source hash: labs/80211ad/lesson/controller.js |
| spoof-preserves-existing | Existing output byte-identical | AssertionError [ERR_ASSERTION]: Unreviewed classic runtime contract: exact code-owned paths, hashes, policies and endpoints required |

Existing-output cases began with the successful public build and an appended sentinel in an existing file. The preserved tree's review-harness digest is `1bfc6a21508fcf4ac8cf271a6a3eb8c78db4f7e3cb9c0f8eba91ba68b46b5216`; that digest uses the harness's path/hash JSON encoding and is distinct from the builder's output hash.

## Preserved earlier guarantees

- The eight earlier ICI profile records reconstruct exactly the frozen contract hash `9ac8bb24a41551df925836613976b77f1723616f1be05cdd4a76b6e3041f10fe`
- All 32 ESM profiles and all 32 mapped source hashes were verified; the ESM contract file, parser, and regression file are byte-identical to the accepted pre-802.11ad snapshot
- The historical .js literal fetch/require/require.resolve hook and dynamic course-loader checks are textually unchanged
- The additional checker does not interpret unrelated editable legacy scripts as frozen reviewed runtimes

## Exact reviewed hashes

| File | SHA-256 |
|---|---|
| `scripts/build/classic-dependencies.cjs` | `5cb9e98427d6ec52575e90f66f56d541158d80a656c08de65fb2267b0ab33c8e` |
| `scripts/build/classic-runtime-contracts.json` | `6f8cde98198636e56d6abee00e9e93551b97d6438e1159905df27823e547b7a1` |
| `scripts/build/compatibility.cjs` | `e989512e7cd48ef7cebd390906b500e2a1d32e4cc5f7f1a9cdbcd16b5167b11f` |
| `scripts/build/module-dependencies.cjs` | `b6f25e6eede9505fd49b2a1f770d85b3c11d5c35ee88411a0c126b02f918b303` |
| `scripts/build/module-runtime-contracts.json` | `5babd9eb79a7b95d51f4c91713948f12d201416b1f33a34ef90a6c16fac7649a` |
| `tests/classic-dependencies.test.cjs` | `4c9efcf46c41e7889b75237e58b9e346e3ef2c5c7a7775e3591f8be0834ac032` |
| `tests/module-dependencies.test.cjs` | `143c419faa3fa702b4a40b1e225f51db82b1bd94b93091c1d420cffe7a079a9b` |
| `build/compatibility-manifest.json` | `c057f29d20da749b434996a40bf25050f09e3b4e7647fc35f54ee0dbdaf273d5` |
| `labs/80211ad/lesson/LESSON-FREEZE.json` | `24c721c5337653c79c8e403d1d56d717835e9f709db321fb3ed018c978aaa4cd` |

### Nine new executable profiles

| Public source | SHA-256 |
|---|---|
| `labs/80211ad/runtime/js/evaluation.js` | `1171d1f19b8f330f0da12ed79e5247d2b129b4cf13f2af68113aeae4c54a0e1d` |
| `labs/80211ad/runtime/js/receiver.js` | `fb44f41a9fce21f7bbcdf9558e2c87df5750dab4c5560d1b5c595ad0b4125090` |
| `labs/80211ad/runtime/js/sha256.js` | `9b620ba2e4decf0014a5e6ce30b3e17c99b3d1df103e0d6a6ef4c40c65f96342` |
| `labs/80211ad/runtime/worker/client.js` | `866a92a3408351ded4f48020be1d3f5dd1f050846287be4e3a57320fa56f44e5` |
| `labs/80211ad/runtime/worker/protocol.js` | `41a7b0bd3a28a1acd4051a47ca6e42bf2100a2afc381f27e1bd35846be1b6458` |
| `labs/80211ad/runtime/worker/receiver-worker.js` | `0e422167dbb93a92e459405362cf67a8b0fa8dac26629d8bfe92c06fc4dc902b` |
| `labs/80211ad/lesson/controller.js` | `1e295a1d12ed09b943fc0105987b4b1de8688129fe58087addd39e070e329c37` |
| `labs/80211ad/lesson/stages.js` | `f24aa698e1321737011176c5366288d8b041f367726c2f79f51e6f39dc76f260` |
| `labs/80211ad/lesson/lesson.js` | `7a890a51bffa4ef51520ecf51c0aff720c12eb373e1194d1c7fa73eaa711a8eb` |

## Limits and integration handoff

This is a frozen-profile and build-publication review, not a generic JavaScript dependency parser, arbitrary runtime-discovery guarantee, or security certification. Caller-provided Worker factories, moved documents, future base-element changes, and arbitrary injected code are not inferred. The page's current script order, root-level public document name, and absent base element were explicitly checked.

No actual browser loading, MIME/CSP behavior, cross-origin policy, rendering, UI responsiveness, numerical accuracy, deployment, or remote CI was tested here. Source freezes in this review are byte/hash inventories; they do not certify filesystem modes. The owner separately noted that run_all.sh's executable bit will be restored without a content change.

The hashes above bind the source snapshot reviewed before this report is added to the integration's evidence inventory. Adding the report/link metadata changes later aggregate tree hashes. Any change to the checker, contracts, protected runtime/lesson source, or reviewed endpoint policy requires re-review. The integration/release owner remains responsible for final aggregate tests, reproducibility, freshness, and the final publication snapshot.

Evidence retained with this review includes `focused-review.cjs`, `final-focused-results.json`, `focused-final-regressions.log`, `full-build-negative-review.cjs`, `full-build-results.json`, per-case build logs, the complete public dependency-edge list, source-input freeze, post-review byte verification, and baseline-preservation comparison.
