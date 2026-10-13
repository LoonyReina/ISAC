# Independent acceptance: pilot-pattern functional teaching lesson

Date: 2026-10-13 UTC. Paper identity: `supplement-case-pilot`. Route: `pilot-patterns.html`; existing prerequisite: `pilot-design.html`.

## Decision and exact binding

ACCEPTED for strict site integration and a separate real-browser gate. No remaining defect was found in the scoped functional/source review. This is not full-site, browser-layout/accessibility, deployment, measured-RF, original-figure or whole-paper acceptance.

- Source commit: `9cab398174e4fe14beb28dcca62b6e542968b2f4`
- Source tree: `41b8279de0b6a63bd6b84b8f59ff5240a2d315cc`
- Frozen v4 source manifest SHA-256: `18ad28cf435178d526b331eb9a2764a622fa54e3af5d972536aa8ed25e68d04d`
- Source-free module archive SHA-256: `2136fbcc073d791bd40763075df0b6457bd687fa3eef58a5a2fa6b8936df78a4`
- Accepted numerical-port manifest SHA-256: `08c3947e6e3d49b34b47035231d307c34a0a373bc5beb2532695ed426e7dbd80`

All 23 owned files were verified against the frozen manifest before and after the final rerun. The worktree was clean. The diff from the declared base contains exactly those 23 files. All five numerical runtime files remain byte-identical to the independently accepted port. `ACCEPTANCE.json` includes their full source-file binding. Changes to these bytes require appropriate revalidation; a later integration commit may preserve them unchanged.

## Independently executed evidence

The reviewer wrote a separate lightweight DOM/event/select/canvas-command harness, separate assertions, a Node worker_threads adapter executing the production Worker module, and a NumPy replay that imports no author numerical implementation or author test helper. This is not a browser or layout engine.

- 382 mounted-controller assertions: initial defaults/no autorun; selected raw, retained, phase, short-FFT and H projections; 23,232 physical-map cell drawing commands; physical units and axes; absolute-power colors; candidate ordering/tie metadata; same-y guard reprocessing; waveform edits; truth-free evaluation; A/B/C/D patterns; all six stress presets; JSON imports, rehashed forged/omitted/partial fields; actual Worker cancellation, replacement and navigation; production Blob ownership; and stored-study arithmetic/source labels
- 38 deterministic lifecycle assertions: reentrant reset, destroy, reset→new-run, double reset, reset A→reset B→new-run, terminal callback replacement, stale synchronous failure, postMessage failure/restart, old fatal events, and delayed file-read/disposal ownership
- 53 further assertions: stale generator curves absent after raw-only import, actual maximum-domain Worker run, time-budget expiry/no partial export/restart, parser depth/size/escaped duplicate keys, front-end domain limits, active/inactive controls, and a real module-startup failure followed by a new working Worker
- Total: 473 Node assertions across 19 independently authored cases, all passing
- 13 actual production-created Blob downloads, including A/D scenes, all stress cases, generated truth-free processing, imported raw without truth, and the maximum domain
- 1,511 independent NumPy assertions: independently regenerated JS-seeded QPSK/noise, finite CP-inclusive transmitter, integer/fractional physical propagation, raw y, all retained indices and samples, unit-modulus derotation, complete short FFT, selected bins/tones, H, entire physical Z/power maps, candidates/tie groups, aliases, evaluation matches/errors, noise variance and energy/SNR ledgers

The maximum tested record contains 13,632 complex raw samples, four fractional paths, J=3, Ncp=96 and three guards. Its actual JSON is 8,423,441 bytes. The final sampled Worker time was 614.801477 ms in Node; this is neither browser control-to-paint timing nor a mobile/heap guarantee.

Largest final absolute residuals: physical raw y 1.75e-13, recovered H 2.01e-14, full complex Z 6.48e-12, normalized map power 1.39e-14. Raw |Z|² residual 1.65e-9 is small relative to its unnormalized power scale. All comparisons pass the already-accepted array-scale tolerance, 1e-12 absolute plus 1e-10 times maximum reference-array magnitude; structural integers and indices are exact.

## Scientific interpretation and provenance

The committed record supplies the actual 192-delay × 121-Doppler physical grid, complex intermediate arrays and coherent sums. Waveform edits generate new x/y; ell edits retain the exact observation. Evaluation truth is optional and cannot alter receiver arrays/candidates. Imported raw is labeled as receiver replay without physical-origin certification, with unknown generator energy/noise variance. Forged results with newly computed hashes do not pass semantic replay.

The default extended guard retains 16/96 useful samples and exposes sixfold restored-noise variance. A's pure-delay ties remain visible; D's tilted exact witnesses remain even when a particular alias falls outside the displayed map. Candidate multiplicity is not a unique detection or multi-target-resolution certificate. All failure presets execute the same receiver pipeline, including continuous Doppler, +6000 Hz, off-mask payload, beyond-guard delay93, declared valid fractional-pulse delay, and zero signal. Zero reference energy remains undefined rather than perfect accuracy.

The fixed 600-frame evidence remains explicitly offline: 200 paired frames per 0/10/20 dB, worse extended-guard NMSE at 0/10 dB and better at 20 dB. The stored frame-level means and paired intervals were independently recomputed. The lesson review did not rerun that full historical raw study; the unchanged port's earlier independent 600-frame gate remains separate. Live JS seeds are not represented as NumPy-seed parity. Source interpretations remain local and attributed; no third-party paper text, PDF or figure was added.

## Repaired findings

Four independently reported defects were repaired by the owner and retested:

1. Session validation callbacks could reset/destroy/start a newer request, then let the older request dispatch or overwrite ownership
2. Native F0 max=5 incorrectly excluded supported S=8/F0=7; dependent bounds now synchronize before draft validation
3. Reset left completed map/FFT/pair captions behind; output metadata and evaluation panels now clear
4. Raw-only import could leave the prior generator clean/noise plot visible; the canvas now clears and truth toggles cannot revive it

Rejected-candidate evidence, original observations and corrected reviewer-harness assumptions are preserved and explained in ATTEMPTS.md. The accepted runtime was not changed to fix any UI/wrapper defect.

## Controlled reductions and remaining gates

The natural 192×192 FFT is an explicitly documented separately port-verified relationship, not an extra live plot. The physical map is not relabeled as FFT. Skipped-derotation and per-path/predecessor decomposition have no accepted runtime interface; the lesson says they are absent. Optional live Monte Carlo is absent. These are scoped reductions, not passing claims for unavailable controls or all 59 design specifications.

Before publication acceptance, separately complete exact-file registry/catalog/compatibility integration and the full reproducible aggregate build; actual hosted browser module loading/CSP, responsive and narrow-screen visual checks, keyboard/accessibility, navigation/cancel/return flows, control-to-paint and resource measurements, native file/download handoff, downloaded-record replay, and exact-commit Pages verification. Targeted narrow-layout check: the static 64-character source PDF hash is an unbroken string in the source panel; verify it wraps without page-level overflow at 320/390 px and add scoped wrapping if needed. This is a source-inspection risk, not a measured browser failure. Preserve the existing paper identity and prerequisite. Node canvas commands do not certify pixels, layout, native validity UX or accessibility.

## Publication and reproduction

This acceptance text, ACCEPTANCE.json and ACCEPTED-SOURCE-MANIFEST.json are original source-free review artifacts and may be published with the lesson. The larger review evidence remains a separate artifact, not required runtime content. Final report files are MOUNTED-FINAL.json, LIFECYCLE-FINAL.json, LIMITS-FINAL.json, REPLAY-FINAL.json and BINDING-BEFORE/AFTER.json. Run the separate reviewer scripts against the bound repository-shaped source and Python/NumPy. The final run imported no author assertion suite and performed no owner-source edit, browser use, remote/Codex call, push, merge or deployment.
