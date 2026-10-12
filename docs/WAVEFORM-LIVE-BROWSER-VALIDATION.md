# Strict-covariance waveform: deployed desktop smoke evidence

Verified 2026-10-12, 12:37–12:41 UTC, on [PR74](https://github.com/LoonyReina/ISAC/pull/74), main `961ba88dd8e827518465e7e656626e1feab9f95d`, successful build/deployment `38249748136`. Chrome desktop viewport 1180 CSS px, document scrollWidth 1165; browser version and CPU were not recorded. The [release-specific lesson URL](https://loonyreina.github.io/ISAC/waveform-design.html?v=961ba88#experiment) served verified new bytes. The unversioned path initially served prior CDN-cached HTML. At 12:44:42–49 UTC a fresh Chrome navigation and separate HTTP fetch both returned the new live/offline page at the canonical URL; Last-Modified 12:36:38 UTC and Cache-Control max-age 600 were recorded. The temporary cache lag was resolved.

## Actual input, computation and download

All four new JavaScript resource hashes matched the frozen source, including controller `409c1c44769cf67470330da8d5229bc74aa9e7de1a374a627e8ea46fd29082d3`. The actual downloaded default record re-solved in Node with exactly the same X, maximum entry difference 0. Input SHA-256: `1ea45be3ef0573f08eb85828d0da98aeb5c95f7be57f2a009447c3c90b07a600`; objective 9.172415105388419, energy 8.000000000000002, covariance relative residual 3.2835693106267915e−16.

Verified fresh default, original omnidirectional N16/K4/L20 parameters, zero H, new seed and deterministic same-input reruns. Manual H/S/R with bogus stored X and an old record were re-solved from the actual matrices. All six matrix views, diagnostic-only SNR, malformed JSON/zero-R errors and recovery, edited-input invalidation, reset, the 27-state offline panel, keyboard Run, notebook topic `waveform-design` and Back worked. Plots were legible without horizontal overflow, and no site-origin console errors were observed.

## Precisely scoped response timings

These values measure already-prepared input through validated Worker response, including Worker startup/compute/message return but excluding input generation/parsing, render/paint and download. They are not Run-to-display latency.

- First default: 342.8 ms
- Five subsequent same-default runs: 28.9, 28.5, 41.9, 33.3, 30.8 ms; descriptive median 30.8 ms and maximum 41.9 ms, with no robust p95 estimate
- One source-size N16/K4/L20 run: 71.2 ms
- One maximum-UI N16/K8/L64 run: 145.9 ms

Different configurations and first/subsequent conditions are not pooled into a benchmark. A named-device, repeated performance/paint study remains open.

## What this check did not establish

The attempted Cancel action arrived after the largest solve had already completed and the button was disabled. Actual in-flight browser cancellation was therefore not verified; VM/Node cancellation guards remain separate evidence. Reset clears results, but overlap with a still-running Worker was not established. Narrow/device-specific layouts and real Run-to-painted-result timing were not verified in this run.

This is bounded strict-covariance-core functionality evidence. The original multi-direction R designer, ZF/averaging conventions, complete Figures3–4, weighted-tradeoff and constant-modulus branches remain open. No full-paper reproduction or universal real-time guarantee follows from these smoke tests.
