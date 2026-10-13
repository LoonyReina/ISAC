# Bounded runtime handoff

## Ready to consume locally

- `js/receiver.js`, `js/sha256.js`: dependency-free actual waveform and receiver computation
- `js/evaluation.js`: bounded truth-only post-processing, never loaded by the receiver Worker
- `worker/receiver-worker.js`, `worker/protocol.js`, `worker/client.js`: classic browser/Node worker, strict held-observation identity, cancellation/supersession, release/restart, dual-hash export and verified import
- `FORMAT.md`: scientific arrays, codec and source-versus-processing boundary
- `SOURCE-FREEZE.json`: accepted source and first-party helper provenance
- `RUNTIME-MANIFEST.json`: portable exact-byte runtime freeze
- `ARTIFACT-MANIFEST.json`: full first-party evidence freeze

The package owns no UI, repository integration, remote task, deployment or publication. A future UI must keep scene generation separate from held processing and show the source/version/mode and held observation ID/hash. Changing displayed truth, resizing, changing units or inspecting a plot must not regenerate samples. Stale/cancelled responses must never reappear as completed current results; use the provided client and handle its terminal statuses.

## Verified locally

- 11 owner kernel checks, including SHA codec, exact seed replay, input/resource bounds, truth isolation, held-policy identity, null M1 map, cancellation/time cap and evaluation denominators
- 26 oracle checks across23 observations:22 freshly generated independent Python cases plus1 historical source record;4,596,654 numeric comparisons,9 held-policy recomputations and35 invalid-input guardrails
- 18 Worker/client tests, zero skips, including actual Node Workers and separately labeled classic browser-loader VM coverage
- Independent parent-assigned numerical/hostile audit is maintained outside this owner package; its final acceptance/hash receipt is authoritative for that separate gate

All full complex arrays, accepted/rejected decisions, maps, masks, candidates and extra scientific traces are compared. No numerical failure was hidden by post-hoc tolerance changes. Initial test-harness failures and prior-code receipts remain in `tests/reports`; runtime contract repairs are recorded in `DEVELOPMENT-FIXES.json` with independent reproductions.

## Important measured boundaries

`reports/resource-benchmark.json` covers source8× cases and near-max configurations with real macrotask yields. The55-frame8× max-sample case has1,999,415 complex received samples. The64-frame2× case reaches262,144 map cells with8 targets. These are Node cloud-host measurements; they do not establish a browser timing or total heap guarantee.

`worker/BOUNDARY-BENCHMARK.json` separately measures the synchronous transport/normalization/export boundary on a near2M-sample record. Its recorded export+hash+transport is about1.55s; a release queued during plain-array normalization takes about0.95s; the caller's import postMessage clone takes about161ms. Cooperative heavy-loop cancellation is responsive, but bounded synchronous parsing/cloning is not preemptible. Worker termination is the hard-stop route. Do not promise an always-instant Cancel button for large imports/exports.

The small runtime archive omits all large oracle waveform archives. Run `./run_all.sh --runtime-only` and `python tests/verify_manifest.py --runtime` for that artifact. The full evidence archive supports `python tests/verify_manifest.py` followed by `./run_all.sh`. Full test reruns refresh dated reports, so verify distributed evidence before rerunning; do not silently rebuild a manifest to hide a changed receipt. Fresh Python fixture regeneration additionally requires the separately accepted Python reference identified in SOURCE-FREEZE; ordinary JS fixture replay does not.

## Scientific limits to keep visible

- All data synthetic; complete PHY/standards compliance, measured RF and full-paper/figure reproduction remain unclaimed
- Actual source8× and full3328-chip preamble are implemented; no isolated-Golay replacement or stored-curve lookup
- Finite RC signal versus independently normalized finite RRC noise is an explicit mismatch
- Rejected acquisition retains all diagnostic peaks; neither a peak nor an accepted gate establishes correct/unambiguous estimates
- Source perfect-synchronization/iid-noise bounds are ideal comparators; observed colored-noise/fractional timing/boundary bias and selection are different
- Coarse CFO and Doppler/oscillator apparent velocities have aliases; oscillator and Doppler are inseparable
- Global Moose requires a single target and is a mixture diagnostic for several targets
- Same raw records can have unequal integration chips and temporal spacing; do not claim unconditional equal-resource superiority
- nfft10000 is outside the cap256. Historical source28 candidates and same-record bounded256 map29 candidates are distinct settings, not a discrepancy to hide
- Map thresholds are known-noise H0 familywise bounds, not bounds on signal sidelobe candidates; keep every candidate
- Range is fixed through the CPI. No range-migration correction, payload, overlapping packets, array calibration, self-interference or communication demodulation

## Next gate

Integrate only after reviewing exact frozen bytes. Real browser Worker lifecycle, UI stale-state/export flows, scientific labels, accessibility and measured browser resources require a separate UI/browser review. No screenshot or VM loader test here substitutes for that gate.
