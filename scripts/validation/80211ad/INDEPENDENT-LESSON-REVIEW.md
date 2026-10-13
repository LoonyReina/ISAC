# Independent 802.11ad lesson review

Date: 2026-10-12 UTC. **Accepted for the declared local lesson/controller/export scope on the exact final freeze below. No unresolved blocking defect remains in this audited scope.** Browser and aggregate integration gates remain separate.

## Scope

The actual page, lesson controller, view models, drawing code, production download/import handlers and frozen numerical runtime were reviewed in isolated copies. The owner worktree was read but never edited by this review. The accepted numerical runtime remains the 22-file freeze `b84547a2bdad7da400238c267d2a6d089b33af8f2474d8f733f18c85d9a9b430`, with manifest byte SHA256 `6a7ceabfa149918d07fb6999fa1680edac77b98a32f08017b370968843d30260`.

This review uses actual Node `worker_threads`, a lightweight DOM/event harness, and a separate classic-script VM-loader check. Neither DOM nor VM is a browser/layout engine. No actual browser, remote task, Codex executor, publication or deployment was used. Original figures/full-paper reproduction, IEEE PHY/standards certification, measured RF, browser heap, browser speed, font rasterization, touch/keyboard/screen-reader operation and cross-engine floating-point identity are not certified.

## Independent executed lesson tests

The independent `review.test.cjs` reads the production controller/view/runtime from an isolated snapshot. It does not replace the kernel or implement a parallel receiver. Fresh generated observations use nondefault geometry, complex gain, seed, pulse support and policy. Its checks cover:

- All 13 stage models bind to actual raw samples, intermediate correlation/product/channel arrays and output axes. Plot navigation, frame/range/Doppler inspection and truth display do not submit numerical jobs or change either held hash
- Phase energies, STF mask/run curves, uncompensated detector power, lag-128 products, STF/CEF correlations, centered CEF coefficients, lag-512 products, apparent velocity, selected slow-time columns, DFT rows and record inspection retain their actual values
- SVG path coordinates agree with an independent calculation of the display transform, including its declared equal-index downsampling. Downsampling is a display reduction, not peak-preserving scientific processing; complete arrays remain in records
- Every canvas cell agrees with the actual power map, fixed −80…+10 dB color reference, row reversal, threshold mask and every candidate overlay. Candidate table rows agree with the numeric output and history export retains all candidates
- Scene changes mark previous results historical, disable held-policy reuse where needed and generate new observations. Receiver-policy changes retain the observation ID, raw-sample SHA256 and metadata SHA256
- Raw and historical exports come through real mounted click handlers. Independent Node crypto recomputes raw little-endian zero-normalized sample digests and sorted-key metadata hashes. Raw reimport is a fresh processing job with no imported truth evaluation; histories cannot be imported as fresh raw input
- Rejected STF acquisition retains maps/candidates/errors under a persistent diagnostic label. M=1 has null adjacent-frame estimates, null map and null detection
- Invalid replacement imports clear held state while the previous completed result remains explicitly noncurrent. Stale file reads, changed drafts, cancellation, reset, repeated reset, dead Worker transport, explicit raw recovery and new computation cannot resurrect an obsolete completion
- Oversized files are rejected before `file.text()`. Raw versus escaped non-ASCII metadata, sparse arrays serialized as null sample slots, nonfinite values, excessive finite values and hash-tampered metadata are rejected. Signed-zero raw/export/import identity is independently checked
- Legal ±1e8 sample components pass actual import/process/view/history without nonfinite-to-null coercion. Joint map/sample/nfft resource boundaries are checked without treating numerical workspace estimates as heap limits

`browser-loader.test.cjs` separately evaluates the page's seven actual classic scripts, in page order, without CommonJS. The automatically mounted production UI computes through an actual Node Worker, navigates all stages and produces a raw record through the actual Blob/anchor download-handler path with Node Blob and an instrumented URL provider. This supports the declared classic loader and event wiring only, not actual browser rendering or Worker scheduling.

## Preserved existing source

`preservation.json` independently compares the original Golay page and all three old Golay runtime assets to `git show HEAD` from the owner worktree. The page is byte-identical after removing exactly one additive continuation paragraph immediately after the `#paper` section opener. IDs and script URLs are identical.

Original page SHA256: `b35163fdd40353b9c079ba3e03696d6b81a21ce117e867a020688b25eab5ea5c`

Additive page SHA256: `0d8aca6c69bc6eb97a06cf4ecf1ec6b6076860a60b5773b48c126bdc26337ea1`

- `golay-radar-core.js`: `7bb174df7ec5bdaa1bbad3a9631f086fdb947c8d648dcb6e1b19bcc5a0aea7c3`
- `golay-radar.js`: `feeee43f95b97dfb381d1018a66ed75436fd4c15a871f236b90af6fbaca26a44`
- `golay-radar.css`: `9a571a89464e08bcb228cd54f730df816baeef40ddc3ae1c596a938efe5b5dce`

## Initial defects, repairs and retained evidence

The initial independent suite passed 10 of its then 13 checks and retained three failures in `initial-review.log`:

1. Delayed import A could overwrite a newer nfft draft after import B finished. Setting nfft=16 after B, then resolving A, changed the form to 32 and actually processed 32. The production event callback now fences its post-await mutations by controller epoch/result state
2. Delayed reset completion could overwrite a later scene draft. Setting seed=881177 during the old Worker's asynchronous termination was reset to 80211. Form reset now happens synchronously; old termination completion no longer mutates newer fields
3. The four-series range I/Q plot called purple CEF I teal and olive CEF Q ochre. Legends now derive their labels from each actual curve color/style

All three were independently rechecked in `second-review.log`, which passed 13/13. Additional later checks cover the classic loader, admitted high amplitude, resource boundaries and SVG coordinate fidelity. The original failing snapshot and minimal `probe-races.cjs` are retained.

Review also requested preserving same-file retry after current import failure while ensuring stale imports cannot clear a newer file selection; clarifying that 29 candidates belongs to the historical record's nfft256 reprocessing; labeling the configured ideal-SCNR bound separately in noiseless runs; and preventing unreadable narrow-screen SVG axis scaling. These are bound to the final review below rather than inferred accepted from an owner message.

## Allocation and validation boundaries

The view uses the frozen API dynamically; receiver algorithms are not reimplemented in the lesson. Raw UI import first checks the browser File size, then checks the actual read string's character and UTF-8 byte bounds, enforces ASCII and validates the parsed observation before submitting it. Enveloped raw JSON validates with `copy:false`; naked raw JSON uses the runtime parser and may allocate normalized typed arrays while validating. The parsed JSON itself already occupies memory.

There is no claim that all validation precedes all cloning. `Client._submit` calls `postMessage`, so the transport's first structured clone necessarily precedes Worker protocol validation. Worker normalization and later outgoing structured clones also allocate. The standard mounted UI rejects malformed JSON before an import request, but direct programmatic client callers do not gain an unbounded-input/zero-allocation guarantee. JSON parse, `toJSON`, stringify, TextEncoder byte counting and message cloning contain synchronous non-preemptible sections. Raw export checks its 100 MiB UTF-8 limit after serialization; history checks 160 MiB after serialization. These are file/record limits, not browser heap or instant-cancel guarantees. Hard Worker termination does not interrupt a current synchronous main-thread parse/stringify.

## Scientific interpretation retained

The page separates source-perfect CFO synchronization from the implemented combined-frequency extension. Oscillator frequency and Doppler remain inseparable; global Moose under multipath is a mixed statistic. Accepted gates do not establish correct/unambiguous estimates. CFO-alias timing failure, fractional waveform single-frame bias, source RC versus separately normalized finite-RRC noise mismatch, first-frame cancellation, fixed-range stop-and-hop and unequal integration/time supports remain visible.

All map candidates are diagnostics; no truth-based deletion or target-count truncation is added. The known-noise H0 family bound does not control signal sidelobe candidates or prove CFAR calibration. The source-like historical nfft10000/28-candidate result stays distinct from same-record bounded nfft256/29-candidate reprocessing and from newly generated JavaScript observations. The current UI is single-record evaluation; it does not pretend to run historical Monte Carlo scans, rate intervals or variance estimates.

## Final acceptance and reproduction

The final lesson canonical freeze is `77b4347b33a549b57d6e7283efb579bbaaa00b41e2bae792049d4059952e98dd`; manifest byte SHA256 `24c721c5337653c79c8e403d1d56d717835e9f709db321fb3ed018c978aaa4cd`. All 13 owned file entries were rehashed and the canonical JSON-of-files freeze was recomputed independently. All 22 runtime entries remain exact. `final-post-test-stability.json` verifies both freezes after tests and byte identity with the owner worktree.

Key final bytes:

| File | SHA256 |
|---|---|
| content/pages/80211ad-receiver.html | d0800e5f1b969fbba61b8eed0197298891e6a380f672caf2011bfc8e2664b6e2 |
| lesson/controller.js | 1e295a1d12ed09b943fc0105987b4b1de8688129fe58087addd39e070e329c37 |
| lesson/lesson.js | 7a890a51bffa4ef51520ecf51c0aff720c12eb373e1194d1c7fa73eaa711a8eb |
| lesson/stages.js | f24aa698e1321737011176c5366288d8b041f367726c2f79f51e6f39dc76f260 |
| lesson/lesson.css | 5b1c1a5a39538984fc6f69cde3cbc6ea280e4c06409d0ae615d31ccb55d3f03f |

The `lesson/` paths above are under `labs/80211ad/`. Full owned/runtime inventories are retained in their manifest copies and `final-freeze-verification.json`.

Final executed results:

- **20/20 independent lesson/loader checks, zero skips or failures**: `final-independent-tests.log`
- **29/29 owner lesson regressions independently rerun, zero skips or failures**: `final-author-tests-rerun.log`
- **11 kernel and 18 Worker tests independently rerun, zero failures**: `final-runtime-tests.log`
- Corrected Moose points/rays preserve the actual complex-sum angle with equal physical x/y scale and visible origin; M1 omits its null adjacent-frame point. Independent screen-coordinate calculations agree
- Narrow plots have a focusable horizontal-scroll figure and 860px minimum SVG width. This fixes the static sub-readable proportional-label sizing; actual browser layout/focus/touch behavior is still untested
- Failed current file import clears its selection for retry, while stale operations cannot change a newer draft or selection
- The deliberate direct-client clone test demonstrates getter evaluation during `postMessage` before remote Worker validation; the same suite verifies that malformed mounted JSON is rejected before any import submission

Maximum resource checks here are exact admission arithmetic, oversized File preflight, limited serialization-guard tests and actual high-amplitude processing. This audit did not benchmark a maximum-size 2M-sample UI workflow or allocate artificial 100/160 MiB exports. Existing accepted Node runtime resource measurements are not promoted to browser measurements.

### Independent Python export replay

See `numerical/NUMERICAL-AUDIT.md`, `numerical/SOURCES-AND-EXPORT-HASHES.json` and the per-case JSON reports. Python receiver/detector dependency freeze is `70191a5acbb6ab90d1da3791aaee86d557b8605884cac8251fb834acda4a3024`; all 58 reference entries were verified.

The final mounted export manifest is `f80610f3cc0f79e3b4f946af9b500753b32157481698f54f168f9e274ea20c8a`. Its four actual production-handler raw/history pairs and five production source hashes match the final lesson bytes. Independent replay gives **1,668,006 numeric comparisons plus 116,624 exact checks, zero failures**.

Separately, seven independently chosen fresh Controller scenes, four held-policy branches and one reimport give 12 output pairs: **4,891,472 numeric comparisons and 64,166 exact checks, zero failures**. Of those numeric comparisons, 2,217,332 check raw/history identity; 1,713,024 are Python stage comparisons; 606,567 independently reconstruct complex products, sums and traces; 354,307 check full noiseless synthesis; 98 check evaluation; 144 check effective configuration. These counts include intentionally nested/repeated acquisition outputs and are not counts of unique receiver estimates.

A further five independently mounted form/click/download cases on a pre-final view snapshot pass 1,155,893 numeric and 22,531 exact checks. They are retained as supplementary controller/runtime evidence, not certification of final view bytes. Initial owner-mounted exports also remain separately hashed; only the refreshed final package binds final view bytes.

The replay checks full acquired/corrected symbols, STF/CEF/full-preamble correlations, selected phase, detection gates/thresholds/noise variance, all centered CEF coefficients, Moose products/sums/estimates, all complex DFT/power/map axes/masks/candidates, separate evaluation and deterministic raw reimport. Additional direct sums use held samples and fixed audited Ga/Gb literals. Truth enters only the evaluation step. Noisy observations are replayed as exported; full noiseless waveform arrays are independently reconstructed for alias, oscillator/bias and cancellation scenes.

Preregistered tolerance is absolute 2e−10 plus relative 2e−9, or frequency absolute 2e−6 Hz plus relative 2e−9; discrete choices/masks/nulls/indices/counts must match exactly. Worst fresh-controller error/tolerance ratio is 0.0499615695. Every comparison passed without widening tolerances.

Adverse cases remain adverse: the new accepted 7.0363795 MHz combined-frequency scene aliases to approximately −6.7136353 MHz and retains 76 candidates; strict STF rejects the same held baseline while retaining four diagnostic candidates; mixed-target global Moose produces neither true velocity and has null single-target evaluation; M1 retains null maps/adjacent-frame values. See the numerical report for complete scene settings and unrounded results.

### Reproduce the final local review

From this review directory:

```sh
AD_SOURCE="$PWD/final-source" node --test review.test.cjs browser-loader.test.cjs
(cd final-source && node --test labs/80211ad/lesson/tests/lesson.test.cjs)
(cd final-source && bash labs/80211ad/runtime/run_all.sh --runtime-only)
(cd numerical && REPLAY_MANIFEST=final-owner-mounted-export-manifest.json REPLAY_REPORT=rerun-final-mounted-python.json python replay_controller_exports.py)
```

The runtime test command writes a new kernel report only inside the isolated copy, outside the accepted 22-file runtime inventory. Fresh-generation commands change request IDs/timestamps; retain the original exported evidence and manifests when replaying. The full repository aggregate build, route/dependency integration, published URLs and actual browser are outside this acceptance and must be checked by their respective integration/release gates.
