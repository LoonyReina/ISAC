# Weighted waveform: pre-fix deployed desktop evidence

Verified 2026-10-12, 14:49:02–14:53:01 UTC, on [PR77](https://github.com/LoonyReina/ISAC/pull/77), main `ec7a5c334a98faef1725be3bcc43a6c46af12d08`. The canonical [weighted lesson](https://loonyreina.github.io/ISAC/waveform-design.html#weighted-experiment) was operated in dot cloud Chrome at viewport1180 CSS px, document scrollWidth1165. These observations identify the release before the following small display/import repair. Post-fix hosted-browser acceptance remains PENDING.

## What actually ran in the browser

Default strict+weighted rho=.1, a same-input ten-point sweep, source-size N16/K4/L20 rho=1 with both endpoint conventions, rho=0, zero H, and maximum N16/K8/L64 with off-grid rho=.37 plus ten grid points executed actual solvers. Energy and the changed-covariance constraint were visible. Rho/tie edits invalidated plots/export; blank rho was rejected in the main Chinese alert. Reset, keyboard Enter, notebook navigation and Back worked. No site-origin console error was observed.

At source-size rho=1, the canonical and radar-closest downloads had nearly equal zero MUI and energy20, but waveform distances28.59782475897 and0.6647170158053. This is explicit nonunique primary-optimum selection, not an unavoidable radar penalty. Rho=0 returned X0 with distance4.6907e−31. Zero H/rho1/radar-closest retained MUI80, energy20 and distance0.

## Download replay and independent numerical evidence

Five actual downloads contain24distinct weighted solves at25stored selected/sweep locations. An independent audit ran the exact production Worker in Node threads, starting only from top-level H/S/R and the current weighted request. It traced the freshly computed strict X0 object into every weighted call and ignored poisoned saved outputs. Strict/weighted waveforms and every certificate reproduced exactly; other deterministic numeric fields differed by at most1.776e−15 after unit-floor scaling.

An independent NumPy/SciPy pass ran1965checks with zero failures. Maximum objective/reference difference was1.482e−15 of certificate scale, energy residual2.243e−13, original-complex KKT residual1.363e−15 and strict covariance residual2.151e−15. The strict waveform's independent SVD objective gap was2.842e−14 absolute. Its reported JS lower bound differed by up to5.451e−10 absolute on the maximum case, within the declared scale-aware tolerance.

There were zero near-hard regular downloaded cases; no general near-hard waveform-accuracy claim follows. A nonunique canonical completion is basis-dependent, so independent checks use the appropriate objective, subspace and energy invariants. This numerical replay harness did not operate a browser or certify the later UI repair.

| Actual record | Bytes | SHA-256 |
|---|---:|---|
| default-record.json | 72678 | 98da6e2e3062db5e1cc5b0127521ae675564dbe883288b70d9a1a0a180749c3d |
| sweep-record.json | 350744 | e5f85f3a0845a918f87c78dac9f9c879bb76b3e2058516af32070d7f17ca0215 |
| source-rho1-closest-record.json | 382406 | 4f8ac0d134d0156410efd74a03e892456c159bce3d221d7538a93c28c0b4eb27 |
| source-rho1-canonical-record.json | 381490 | 6bd3b1982dab731fedbc1d8a3153743163855f52729acf7130175a9389248416 |
| max-domain-sweep-record.json | 4793548 | 8cc8331d8a311c99d108c6621c9aad9f5bd566498439feaa9947ca12cc9eefa8 |

The [dated machine-readable summary](../data/waveform-weighted-browser-20261012.json) preserves pre-fix observations, issue descriptions and numerical audit extrema. Complete raw records, fresh replay outputs and independent audit scripts remain retained with the validation session.

## Observed issues and bounded repair

The default tradeoff plot formatted all small x-axis values as0.0. Its numeric points were present, but tick labels did not communicate their scale. The maximum-domain full record was4,793,548bytes, exceeding the old1MiB manual-text import cap; numerical replay of that record must not be described as successful whole-record browser reimport. The weighted-specific error reason also needed to be visible locally, in addition to the main alert.

The small follow-up is limited to adaptive tick labels, an explicit8MiB bounded text import, local error text and regression tests. It does not change either numerical core, the model or the Worker. Independent prepublication review passed29new checks, including the actual4,793,548-byte record to a fresh11-point Worker solve, exact8MiB/over-limit UTF-8 boundaries, poisoned-output rejection and44axis pairs. The prior40controller/race checks also passed. These are Node/controlled-DOM checks; a new hosted-browser verification is still required after deployment.

## Gates still open

The attempted weighted Cancel action arrived after the maximum sweep had already finished and the button was disabled. Actual in-flight browser cancellation was NOT verified. Narrow screens, other browsers, repeated timing and exact painted-result latency remain open, as does post-fix full-record browser reimport and plot/error presentation.

The source-exact Fig.3 weighted curve remains nonmatching; no weight, energy or normalization is adjusted to fit the figure. Original directional design, ZF/averaging conventions, full figures and constant-modulus/similarity branches remain open. This evidence does not establish full-paper reproduction.
