# Joint beamforming: deployed desktop evidence

Verified 2026-10-12, 14:45:49–14:54:18 UTC, on [PR77](https://github.com/LoonyReina/ISAC/pull/77), deployed main `ec7a5c334a98faef1725be3bcc43a6c46af12d08`, source tree `dab42c88901dd1027005f5072c7a451cfc711f27`. The main [build/deployment run38264401600](https://github.com/LoonyReina/ISAC/actions/runs/38264401600) succeeded. The check used the canonical [joint-beamforming lesson](https://loonyreina.github.io/ISAC/joint-beamforming.html#experiment).

Environment: dot cloud Chrome, reported user agent Chrome/154.0.0.0 on Linux x86_64; viewport1180 CSS px, document scrollWidth1165. Exact engine build and CPU were not recorded. This is bounded desktop evidence, not all-browser or full-paper acceptance. Earlier Node/controlled-DOM reports retain their original non-browser scope.

## Actual controls and outcomes

- Default radar-only, SDR and optimized-ZF solves completed. Fresh H00=0.823456789+0.123456789j and Gamma12.3 reached the actual requests; the accepted same-model radar baseline was visibly reused rather than represented as a new solve. Keyboard Enter worked
- At the1000-iteration cap, SDR remained `iteration_limit` and ZF converged in142 iterations
- At high Gamma, SDR exhausted20000 iterations while ZF returned a numerical infeasibility certificate after1000. The SDR result remained unresolved; the ZF certificate and offline reference did not relabel it infeasible
- Actual running SDR cancellation was observed at96 iterations; immediate Run without an edit restarted actual progress at96 iterations, then Reset cleared the still-running state
- Preset replacement during actual SDR192 iterations disabled the old export. The replacement default finished without stale overwrite
- Blank H input was rejected with its Chinese error and disabled Run. A zero first user row yielded the actual analytic upper bound0 and `infeasible_bound` for both methods
- Desktop traces, raw pattern and legends were readable. Only the channel/matrix tables scrolled locally; no page-wide horizontal overflow was observed. Notebook navigation and Back retained the canonical route. No site-origin console errors were observed

## Actual downloaded-state audit

Five actual browser JSON downloads were independently checked with the frozen [NumPy export checker](../validation/export-checker/README.md). All15recorded numerical result slots passed evidence-consistency checks, including repeated/reused radar baselines. The checker recomputes saved states, objectives, constraints, factors and conservative bounds; this is not a claim that all five optimization problems were independently re-solved. Passing the evidence audit does not change an iteration-limited or infeasible status into convergence.

| Record | Bytes | SDR / ZF status | SHA-256 |
|---|---:|---|---|
| default-record.json | 383042 | converged / converged | 55bc0d6f6747ebf0bcb942a7751cce3f2fbf0844f066874a90dceb99aba8480f |
| edited-record.json | 382785 | converged / converged | 0c56fd97a6e41429d1a2ea7e692fc3c2c2fe1d5e6506c722d93d0e5af12d6150 |
| budget-record.json | 373934 | iteration_limit / converged | 940da6a4bfe5db07e6e1f98362be69cd80adf5475a8912baf7bf88858e1567e4 |
| certificate-record.json | 491798 | iteration_limit / infeasible_certificate | 16dfd367e826cf8e67c21cfd42a38d402179eb16438068cb4705b31b6663a25f |
| zero-row-record.json | 145909 | infeasible_bound / infeasible_bound | 1faa26044fa0d0eea204a9bcce1c053ffd8339c0b0a33cd82cabc58b64a7fa52 |

The [machine-readable dated summary](../data/joint-beamforming-browser-20261012.json) records exact resource/record/audit hashes, individual states, observations and open gates. Raw downloaded files and full checker outputs remain retained with the validation session; no private machine paths or credentials are included here.

## Served resource identity

All eight listed joint page/runtime resources matched the independently frozen release output, including all three numerical files. Generated HTML is identified by its published hash, separately from the handwritten page source.

| Served resource | SHA-256 |
|---|---|
| joint-beamforming.html | ba5178c9ffb8ad42daa8b0f79286d0674fbcfc1e7eba13e28402de288ef4d036 |
| joint-beamforming-optimizer.js | b6a6c1a37b1ada4c13628b1c68d3418c20bfd0484a445265c56eda4bf14732c3 |
| joint-beamforming-optimizer-model.js | fdcd02f83c3346b327224e692fa41c27732326b9eaf8791bbef5e43be23a1a3c |
| joint-beamforming-optimizer-data.js | 89fc8965a95c8b0046be66837cc11335f904a9dcb326b1a29df101d785c9d43a |
| joint-beamforming-optimizer.css | 9ee50d8b3ce5e25262665d7bc12bfe5798aaba605f308e2947c2ccd58191c84f |
| joint-beamforming-optimizer/core.js | a6de335f1a57d144cc8aebee1c33ec80397c3c948a9d93c38c1fafbcd1cf262b |
| joint-beamforming-optimizer/hermitian.js | da5721e4c3abfc616792c06684add0a41925f53125afc2e4abe6279e6c7bec7a |
| joint-beamforming-optimizer/worker.js | 7c0ebef89c8c005e62af9725b0f333633d1f6657aae6096e503399a976afefde |

## Timing boundary and remaining gates

Four individual observations measure Run control to the batch's last terminal Worker response, excluding final rendering/paint and download:

- Default, radar freshly solved:1456.1ms
- Fresh edited H/Gamma, explicitly reused radar baseline:535.4ms
- Short-budget preset:1687.8ms
- High-Gamma capped run:23301.8ms

Each record separately retains core, method round-trip, render and record-assembly intervals. Core runtime ends before final certificate/recovery assembly. These different configurations and baseline-cache states do not form a repeated benchmark; no pooled median/p95/worst, cold-start guarantee or universal real-time claim is made.

This closes the bounded deployed desktop interaction and actual downloaded-state evidence gate. Narrow screens, other browsers, repeated fixed-input timing, exact paint time and the entire allowed input/domain remain unverified. Original1000-channel/K4/K6/SSP, finite QPSK, receiver and full-paper experiments remain open. Weighted-waveform acceptance is separate.
