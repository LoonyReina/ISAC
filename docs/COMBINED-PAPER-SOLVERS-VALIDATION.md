# Bounded joint-beamforming and weighted-waveform integration

Date: 2026-10-12. Source baseline: `e69e07d8c3377a8c0067032e44609081c68c2842`.

## What this release covers

This extends two existing lessons, without creating another paper card or route:

- [`joint-beamforming.html`](../joint-beamforming.html#intuition): identify the known complex H, hard per-user SINR threshold and equal per-antenna power before running the actual radar-only Eq.(15), SDR Eq.(32) and optimized-ZF Eq.(40) with constructive factor recovery. M=10/K=2 and the original 1801-point radar model are bounded live scope. The old M=8 analytic construction remains in its own prerequisite panel with unchanged numerical core/controller.
- [`waveform-design.html`](../waveform-design.html#intuition): first solve strict covariance, then use that exact fresh X₀ in Section IV's weighted equality-energy problem. The weighted feasible set is wider: it keeps total energy and drops covariance equality. The DFT teaching baseline is not X₀. The two rho=1 completion conventions remain explicit.

The approved joint three-file runtime and weighted core are byte-identical to their independent numerical approvals. Existing public URLs, all original lesson IDs, source editions, citation metrics, historical hashes and failed numerical attempts are retained. Exact-field inverse tests allow only the declared coverage metadata changes; historical guards are not reset and no broad migration exception is added.

## Independent prepublication evidence

- Joint numerical reference: [selected-core report](../validation/numerical-reference/NUMERICAL-GATE-REPORT.md), [readable evidence](../validation/numerical-reference/PUBLIC-EVIDENCE.md), and [live implementation scope](JOINT-BEAMFORMING-LIVE-VALIDATION.md). Independent integration review ran 18 tests, a real controller-to-Node-Worker-to-Blob flow and 12 independently recomputed result slots. Three lifecycle findings were repaired: Cancel followed immediately by Run, late errors from replaced Workers, and cancellation transport exceptions. These are actual Node/controlled-DOM observations, not rendered-browser verification.
- Weighted: [numerical scope](WAVEFORM-WEIGHTED-VALIDATION.md), [live implementation scope](WAVEFORM-WEIGHTED-LIVE-VALIDATION.md), and [independent integration review](../scripts/validation/waveform-design/weighted/UI-INDEPENDENT-REVIEW.md). The independent review covered 33 Worker checks, 26 fresh inputs/107 weighted points, 40 non-rendering controller checks and 94/94 focused author regressions.

The full joint reference remains exactly 25,845,796 bytes when reconstructed, SHA-256 `3baff9d3e29cec528442fc2c4b9ab8dc34aceb7076803ca4e0c1f6783b4a59b2`. It is supplied as [three optional raw parts](../validation/OPTIONAL-REFERENCE-DOWNLOAD.md), not as a nonexistent hosted single ZIP. Parts and other offline evidence are not fetched by lesson startup code. A separate [export checker](../validation/export-checker/README.md) reports incomplete cancellation payloads honestly; it does not manufacture missing final state.

## Evidence boundaries that remain open

- Joint: the 32 paired channels × 11 thresholds preserve 704 first attempts and 135 refinements. Each method has 347 accepted outcomes; five common infeasible pairs have independent residual-adjusted evidence. This differs from the original 1000-trial, K=4/6, SSP and receiver studies. Live `iteration_limit` means unresolved; no timeout, offline truth or ZF failure turns it into SDR infeasibility.
- Weighted: the source-exact rho=.1 Fig.3 curve remains nonmatching. The 10/12 dB means 12.882/14.831 differ from approximate visual source readings 13.36/15.59. No weight or normalization is tuned to fit the picture. Constant-modulus/similarity, original directional design, full figures and unresolved ZF/averaging conventions remain open.
- Both: Node Worker and controlled-DOM execution do not validate browser network loading, layout, keyboard behavior, actual browser downloads or device timing. Previous strict-waveform browser observations concern that older strict-only release. The new hosted-browser gate remains open, including real interruption/rerun flows, fresh-input recomputation, exact downloaded-record replay and desktop/narrow layouts.
- Full-paper reproduction remains unestablished for every paper in the execution checklist. This release is a bounded algorithm integration, not total project completion.

## Aggregate build protocol

Run from authoritative source with Node.js 24:

1. `node scripts/build-compatibility.cjs --test --reproducible`
2. `node --test tests/compatibility-build.test.cjs`
3. `node scripts/build-compatibility.cjs --check`

The builder creates a seedless isolated compatibility layout, regenerates pages, validates links/dependencies and runs the whole legacy-layout test set. The separate builder suite verifies output/source isolation and seedless generation. `dist/` is generated, never edited or committed. The release-specific aggregate outcome is recorded after these commands finish; this protocol alone is not a pass claim.
