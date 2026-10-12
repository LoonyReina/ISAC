# Reduced GC-SAGE: deployed desktop verification

Verified 2026-10-12, 12:11–12:16 UTC, against [PR73](https://github.com/LoonyReina/ISAC/pull/73), source `8cd2f4e432bed3150a978c48763f19ee1e05a742` and successful GitHub Pages build/deployment `38246933365`. The [canonical experiment](https://loonyreina.github.io/ISAC/nearfield-gc-sage.html#experiment) ran in Chrome at 1180 CSS-pixel viewport width; document scrollWidth 1165. Browser version, CPU and operating system were not recorded.

## Observed computation and downloaded bytes

The first default run used observation SHA-256 `20a915dff2f601ec31570dc1188984f44f26437ffa45a977907dc90a3eb9fcfc`. Scattering-only finished at SSE 158.182493717262 in 5 sweeps; hybrid finished at 155.0922726405695 in 4 sweeps. Both used the same observations, priors and data-derived initializer.

The actual downloaded JSON was parsed and re-solved using the released Node core. The observation hash matched; maximum SSE difference was 2.85e−14 and maximum final-state numerical difference 4.45e−16, with no categorical mismatch. This verifies this downloaded record, not every possible input or a hardware acquisition.

## Individual timing sample

First default sampling-to-complete: 940.1 ms. Worker total: 567.3 ms, comprising initialization 36.4 ms, scattering 220.9 ms and hybrid 308.9 ms, plus worker overhead. End-to-end includes sampling, worker startup, both fits, evaluation and completed-result rendering; it excludes JSON serialization/download. Method order is scattering then hybrid, including actual history recording and variable runtime warm-up.

These are individual observations, not median/p95 estimates. Sampled bandwidth runs under different conditions ranged 657–1293.3 ms; they are not pooled into a benchmark. Repeatable fixed-configuration latency, largest-domain memory and device variability remain open.

## Desktop learning and failure checks

- Initial results are empty; prediction precedes actual computation. History index 0 shows the real initialization; final replay agrees with the solved result. Truth reveal leaves fits unchanged
- Equal-scale maps were visually readable without horizontal overflow. Each of 5 bandwidth, 4 aperture and 4 SNR choices was individually exercised. This does not cover all 160 Cartesian acquisitions in a browser
- At 100 MHz the 12-sweep cap is visible. At 20 MHz the reduced budget reaches 6 sweeps. Neither is labelled false convergence
- The reference-blind preset converges while reflection association fails; the unmatched error stays null. Budget-only changes retain the exact observation hash and disclose reuse; new-noise changes the hash
- Cancellation and reset during actual worker computation clear results/export. Reset restores seed, budget, truth and auto settings. Invalid seed −1 disables export. Rapid SNR 5→20 finishes at the actual 20 dB input without stale overwrite
- Keyboard Run, guide→canonical experiment→notebook selection and browser Back work. The notebook selects the registered `nearfield-gc-sage` topic. No site-origin console errors were found

This accepts the bounded 2-D, one-bounce, known-L=2 teaching loop and its downloaded computation record. Full multi-bounce/3-D estimation, unknown path count, measured VNA data and original paper experiment coverage remain open. The guide question separately clarifies that the scattering baseline already permits per-channel complex gains; the geometric comparison must not pretend it requires full-array visibility.
