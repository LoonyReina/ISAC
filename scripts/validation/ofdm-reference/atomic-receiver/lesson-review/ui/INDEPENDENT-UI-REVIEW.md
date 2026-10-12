# Independent controller, page and style review

Date: 2026-10-12. Decision: PASS for the exact source bytes below within the Node/VM/static scope. This is separate from the already frozen model/history review one directory above. No implementation files were modified by this reviewer.

## Reviewed bytes

| Source | SHA-256 |
| --- | --- |
| content/pages/atomic-ofdm-receiver.html | 9d7be02258115e605f9bdb541fcd1e67f15eef2a3e0a794553612b32f497ba54 |
| labs/ofdm-reference/atomic-receiver.js | b01de3d5ec1668469630a0b013b7ce1328fcb102504e4213db3bb1c6d93ae3ef |
| labs/ofdm-reference/atomic-receiver.css | f19f6679205699ebd6a0276e3cfbacc6a7e5afc56cc5d31bf4fa387edac83421 |
| tests/atomic-receiver-ui.test.cjs | 9a1a95eba7cb4cdd0e0c971fed223cb7e14d7bc57503b7c4dd2066b5faad2422 |

Dependencies retain their independently reviewed hashes: core `3d5656fe…`, lesson model `69e4047b…`, history Worker `233a7265…`. Full hashes are in `UI-REVIEW-FREEZE.json` and `ui-results.json`.

## Test method

Seventeen fresh independent suites execute the actual authored controller in a Node VM. The independent DOM model implements the range input's value clamping when value/min/max change, which the original author's generic mock did not model. Two integration scenarios use genuine concurrent Node worker threads running the exact authored Worker/core. Additional lifecycle and corruption checks replay authentic recorded Worker messages into fresh controller contexts. A saved numeric fixture is reviewer test data only and is never used by the site implementation.

The tests do not use a browser, headless browser, Playwright, CDP, visual renderer or network. The DOM model is purpose-built, not a complete browser substitute. Its range sanitization check is a regression model for a known ordering issue, not hosted-browser confirmation.

The author's UI suite was independently staged with exact source bytes inside the review directory and run separately: **36 passed, 0 failed**. This author suite is supporting regression evidence, not counted as independent work. The repository's old-layout aggregate tests were not run directly from its source root, and the implementation worktree was not changed.

## Observed passing behavior

- Initial page is paused and numerical-data-free. It creates no Worker or autoplay loop before Run, does not use persistence/network fallbacks, and hides truth by default
- Run launches two actual Workers with exactly equal M,N,r,s,lambda,mu. Both receive identical budgets and tolerances; only fixedError differs. No truth, true path count, seed or transmitted symbols enter Worker input
- Default CS-ANL1 converges at 504 iterations with 9 candidates; CS-AN converges at 950 with 15 candidates. Default selected inspection is the actual CS-ANL1 final state, not iteration 0
- Switching between the longer and shorter histories selects the correct final iteration in both directions, with max set before slider value
- All **32 retained default frames and 512 complex cells** were checked against the actual numeric snapshots: every complex textual decomposition, every matrix cell's displayed magnitude and coordinates, residual energy, candidate-circle count and diagnostic object. Both methods and zero initialization are covered. Each dual heatmap has 4,096 sampled cells plus its 60-cell color legend
- Navigation visits only stored history frames: zero/null initialization, sampled iteration 50, previous/next and terminal states. The controller does not interpolate hidden solver states
- Threshold exploration changes candidate postprocessing while preserving the committed observation and all solver arrays/settings/history. Truth reveal adds only the two truth markers/evaluation, without changing the candidate set or optimizer. Default 7 extra CS-ANL1 candidates and error-support TP=2,FP=1,FN=0 remain visible
- A temporarily invalid threshold while results arrive disables export but does not cancel the other solve. Correcting it restores the completed pair's export without creating new Workers
- Every generator/solver control's input and change event invalidates exports, marks previous results stale, and stops obsolete workers. Preset/reset controls do not auto-run. Silent changed generator values are checked again before accepting results or exporting
- Superseded callbacks cannot replace a newer run. Completed branches ignore delayed progress/error/result/ready messages, including wrong core or wrapper version, while active branches still enforce version handshakes
- Partial results, explicit cancellation, Worker-reported numerical errors and cancelled notifications never export a successful pair. Late terminal messages do not revive them
- Missing/mismatched core/model/Worker, constructor failures, stale handshake versions and readiness timeouts produce visible blockers with no fabricated fallback result
- Nineteen malformed-result variants are rejected: failed status, stale version, wrong dimensions/iteration counts, nonfinite numeric state, absent/fake history, inconsistent terminal values/settings, nonzero purported initialization, violated stationarity/primal/dual stopping checks, inaccurate projection claims and excessive eigen residual
- Actual iteration-limit runs for both methods retain max_iter at 500, label them unconfirmed convergence, and export those honest terminal states
- Source/controller/style/test hashes were unchanged throughout the final independent run

## Defects resolved during review

### 1. Range value assigned before max

The initial `selectFinal` set slider value while its maximum was still 0 or the previous branch's shorter bound. A real range value is sanitized/clamped, so this could select initialization or a nonfinal frame. The author now updates max before value. The independent range-aware regression passes on first completion and branch switching. Hosted browser confirmation remains required.

### 2. Nonzero state accepted as “true zero initialization”

An otherwise authentic result whose history[0].z.re[0], history[0].nu.re[0] and history[0].t were replaced by 99 was initially accepted and exported while the UI labeled the frame zero initialization. The final controller requires all initial z/e/nu components and t to be exactly zero. Three independently injected nonzero initialization variants now reject.

### 3. Late wrong-version message from completed branch invalidated accepted pair

After a completed pair, a same-run late error with an obsolete version initially reached version checking before the completed-branch guard, removing export. The final controller ignores completed-branch messages before checking their versions. Wrong-core and wrong-wrapper variants of ready/progress/error/result now leave the accepted pair unchanged; active-worker version checking remains strict.

### 4. Full-state versus diagnostic history wording

The page now correctly says full states include iteration 0, every 50 iterations and the terminal state, while the scalar diagnostic trace also preserves iteration 1. It no longer implies that the complete state history contains iteration 1.

Related hardening in the author's final controller, also tested independently, rejects false stationarity/projection convergence and keeps transient invalid postprocessing controls from cancelling numerical work.

## Evidence and claim review

The page keeps the finite Eq27 SDP separate from an unconditional multidimensional atomic-norm certificate. It discloses source corrections, the post-solve 64x64 sampling and chosen candidate threshold, teaching association rules, error-support threshold, affine-iterate objective limitations, actual residual versus true noise, and complex magnitude versus power. It retains the distinction between convergence and detection correctness, and between single-scene counts and probabilities.

Original 16x16 work is explicitly offline. Full Figure8, author detector/BER protocol, gain re-estimation, model-order selection and physical ICI/receiver correctness remain open. Existing CS-ANL1 extra candidates and dense-error failures are not disguised.

Static inspection confirms labeled controls, semantic buttons/selects, polite status reporting, focus-visible styling, a narrow-screen breakpoint, reduced-motion rules, a no-JavaScript explanation and readable numeric alternatives. These are presence/consistency checks only.

## Explicitly not approved here

- Hosted resource/network loading or browser Worker import/caching behavior
- Desktop/tablet/mobile layout, glyphs, overflow, plot readability or contrast
- Actual keyboard/focus/screen-reader behavior
- Browser timing, memory use, cancellation latency or browser compatibility
- Aggregate compatibility build, publication, PR/CI or deployed site acceptance
- Full detector, Figure8/BER statistics, physical OFDM/ICI accuracy, unconditional continuous atomic-norm equivalence

Those gates remain with the parent and supported hosted-browser acceptance route. No browser approval is inferred from these passing VM tests.

## Runnable evidence

From this directory, with Node v24.19.0 and no extra packages:

    node check_ui.cjs /path/to/worktree
    node run_authored_tests.cjs /path/to/worktree

`ui-results.json` contains the 17 independent outcomes and final source hashes. `authored-tests.json` / `authored-tests.log` record the separate 36-test authored regression run. `harness.cjs` implements the independent DOM/Worker test surface. `UI-REVIEW-FREEZE.json` binds these artifacts without changing the earlier model/history freeze.
