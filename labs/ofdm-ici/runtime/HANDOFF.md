# Fresh kernel handoff

## Frozen runtime

`SOURCE-FREEZE.json` pins six runtime files. Kernel SHA256:
`3c9e13e8bbd478802c4292999c7633b4e35dba7f2b7a861e7413dce43ac5ddbe`.

Actual source-derived stages execute from accepted samples. No UI/repository integration/publication was performed. All runtime files are dependency-free local JavaScript; browser Worker use must load all four numerical scripts. Main integration should use the Worker/client protocol, not execute long numerical work in a rendering thread.

## Established by final owner rerun

`reports/full-regression.log` is the final full run against the frozen runtime, exit0.

- 17 complete oracle inputs:16 fresh varied cases and separate held finite-grid case. 985 real/imag/data component-array comparisons and34,341 numeric scalar checks; maximum normalized array discrepancy1.698e−11 at declared2e−8 absolute/relative acceptance tolerance
- All-ones case comparison deliberately stops at MUSIC/R/full CFO profile because a flat profile has arbitrary numerical minimizers; downstream parity is unclaimed, output retained
- Two native JavaScript-generated non-real-gain QPSK/QAM cases re-executed in Python:106 component-array comparisons, sample-generation relative discrepancies<4.6e−15
- 265 independent NumPy/SciPy algebra cases;55 algebra API/UMD/error contracts;58 Python evaluation comparisons and500 exhaustive assignment checks
- 17 kernel acceptance/rejection/determinism/held-Y/alias/rank tests and15 Worker/client tests; no skips
- Actual Node Worker completion, cancellation during CFO work, supersession, stale-result defense, reset, time-cap and import errors pass
- Browser importScripts and client branches run in a VM only. No actual browser/device measurement

The separate independent port review is coordinated outside this owner directory. Its conclusions should be cited separately and must refer to these exact runtime hashes; do not inherit the earlier Python review as port acceptance.

## Measured bounded runtime

Node-only held case final3 trials:2.58–2.78s. One forced7-angle×4-OMP QAM-noise workload exercised all3164 CFO evaluations, all28 accepted refits and7 retained caps:10.59s. Maximum observed checkpoint gap across these runs~215ms. Maximum measured numeric payload14.5MB; whole-process RSS after that workload~254MB, not a peak allocation or browser memory bound. All timings are in `reports/resource-benchmark.json`. No meaningful p95 is inferred from3 repeats.

Keep dimensions64/16/8/8/L12 and Pmax1–4 fixed until a new review measures an expanded envelope. Grid-only refinements are rejected. Configurable search narrowing/coarsening, target values, seeds, QPSK/QAM, nominal thresholds and declared order stay within validated structural limits. Unretained delays and CFO outside configured search remain misses/failures, never clamped.

## Required UI interpretation if integrated later

- “Fresh” means recomputed from accepted X/Y/config, including a held imported observation; “simulated” and “saved replay” remain separate concepts
- Show source version, config, provenance, finite-grid limitation, all selected CFO records and stop reasons
- Keep ordinary FFT known-X-demodulated on identical Y/angles; distinguish synthetic ICI-free comparison and receive gain normalization
- Show all detections, false detections, misses, source/conventional FDR denominators and conditional errors together
- Preserve held finite-grid4 hits /3 false /1 miss and cap; do not swap in original refined4/1/1 evidence or imply published curves are reproduced
- Show flat CFO and near-rank MDL warnings, endpoint/search-bound flags, source literal alias failures and nominal-versus-achieved Pfa distinction
- Do not display a cancelled, superseded, time-capped or rejected run as complete; no partial-results completion guarantee is made
- Raw import must validate schema/shapes/finite arrays and optional expected SHA hashes. A historical output object cannot be a fresh result

## Remaining gates

Actual browser latency/heap/cancellation, UI presentation/accessibility/navigation, any repository changes, expanded numerical dimensions, original-paper figures, full-size converged OMP, calibrated Pfa and communications/field claims remain outside this deliverable.

## Artifacts

- `ofdm-ici-kernel-v0.1-runtime.zip`: six runtime files plus contracts/source freeze; no fixture startup payload
- `ofdm-ici-kernel-v0.1-full-evidence.zip`: full original numerical source, fixtures, reports, reproducible test scripts and documentation
- `ARTIFACT-MANIFEST.json` and `ARCHIVE-VERIFICATION.json`: hashes and member-byte verification

Python regeneration expects the separately delivered frozen `ofdm-ici-reference` directory alongside this package. Private source PDF/text/screenshots are excluded. JavaScript runtime and saved-fixture checks run without that reference or Python.
