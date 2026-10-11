# OFDM 时间插值教学：模型、证据与验证

Date: 2026-10-11 UTC. This is an independently constructed sparse-probe mechanism lesson, not an LTE/NR PHY implementation, measured-hardware replication, detector or original-figure reproduction.

## Source and evidence boundary

Carlos Baquero Barneto et al., *Full-Duplex OFDM Radar With LTE and 5G NR Waveforms: Challenges, Solutions, and Measurements*, IEEE TMTT 67(10), 4042–4054, October 2019. DOI: https://doi.org/10.1109/TMTT.2019.2930510. Fixed inspected manuscript: https://arxiv.org/abs/1908.03418v1, submitted 2019-08-09. The 13-page author manuscript was not compared page-for-page with the journal typesetting. The source manifest records the PDF hash and exact locators; no PDF or rendered source pages are distributed here.

- p.3 Eq.(4): complex interpolation **across time at fixed subcarrier**, using real observed brackets and preserving active samples
- p.3 Eqs.(1)–(3): diagonal target phase and active-cell quotient
- pp.3–4 Eq.(5): windowed periodogram; our rectangle weights do not reproduce hardware Hamming processing or the full detector
- pp.4–5 Table I / Fig.2: simulations, including RMSE conditional on detection
- pp.5–6 Fig.3: synthetic SI examples, not RF measurements
- p.8 Fig.6 and pp.9–11 Figs.7–9: separate RF/drone/vehicle measurement evidence, not frontend data

## Model contract

The core uses time-major index `m*32+k`, complex pairs `[real,imaginary]`, N=32, M=33, approximate c=3e8 m/s, fc=5 GHz, Δf=1 MHz, λ=0.06 m. Tu=1 μs and CP=1 μs; **Tr=0.5 ms is a sparse probe-start interval, not Tu+CP**. The first-to-last probe span is 16 ms, while MTr=16.5 ms enters DFT spacing. The frequency endpoint span is 31 MHz, while NΔf=32 MHz enters the 4.6875 m native range-bin spacing. Native Doppler spacing is 60.6060606 Hz. Range/Doppler periodicities are 150 m and 2000 Hz, not measured detection limits.

Generated truth is R=37.5 m, |a|=1, phase(a)=0.37 rad; static fD=0 is the initial UI state. Core target domain is 0≤R<150 m and |fD|≤800 Hz. UI presets are 0,31.25,62.5,125,250,500,−125,800 Hz. Positive Doppler means closing radial velocity v=0.03 fD m/s in this monostatic low-speed approximation. Maximum modeled displacement over 16 ms is 0.384 m. The frozen-range, diagonal OFDM channel remains an approximation.

A rectangular interior hole removes k=10…21 and times strictly between m₀=16−G/2 and m₁=16+G/2, G∈{2,4,8,16}. Endpoints remain observed. J=1056 display cells; missing=12(G−1); K=1068−12G actual observations and transmit-energy units. Varying G changes energy. The two processors within one setting share precisely the same observations, noise, bandwidth, time and search grid.

Active X=j^((k+3m) mod4); inactive X=0. Y=Xh+W with h=a exp(−j2πkΔf·2R/c+j2πfDmTr). Independent proper complex W has E|W|²=σ² and real/imaginary variances σ²/2. Divide only at active cells. Unit modulus preserves equal noise variance after division. Inactive `[0,0]` is internal masked storage; the UI raw data exposes `null` and the table says 未观测. It never labels that storage as a measured zero channel. Nonconstant-modulus QAM requires different quotient noise/weighting.

Interior fill is (1−u)d[m₀,k]+u d[m₁,k], u=(m−m₀)/G. It never uses target truth, already filled points, frequency-neighbor samples, boundary extrapolation or permanently-null-row recovery. The original values remain in the result, so selecting them recovers the original data: no new information, no loss from this retained-value linear operation itself.

## Processing and diagnostics

For unit-gain candidate s(R′,f′), z_obs=s_obsᴴd/K and z_fill=s_fullᴴLd/J. The complex sum precedes magnitude or power. The observed-data statistic eliminates the unknown complex gain under this ideal single-target iid-noise model. The conventional filled full-grid template is not automatically the equivalent likelihood; the transformed physical mean is aLs_obs and noise covariance is σ²LLᴴ.

Maps use separable direct sums on **fixed** candidates R′=150i/64, i=0…63, and f′=−800+25j Hz, j=0…64. Their 2.34375 m /25 Hz evaluation spacing is not physical resolution. Candidate axes, interpolation and normalization do not depend on generated truth. Truth crosshairs and true-candidate diagnostics are explicitly evaluation-only; the truth point may not lie on the display grid. RGB scale is common and fixed, −40 to+6 dB referenced to unit power, with unmodified linear data retained. No per-peak normalization, windowing, threshold, CFAR or target declaration.

Maps compute lazily when the native processing disclosure opens and cache by gap/Doppler/noise. Changing the selected time or resizing does not recompute the numerical map. Initial maps call measured ~18 ms in Node in this environment; this is not a mobile-browser benchmark. Both maps contain 4160 SVG cells; parent-owned actual-browser review is required for device responsiveness.

Diagnostics alone inspect truth. Noiseless midpoint ratio is cos(πfDGTr); zero magnitude has undefined phase. At G=8,fD=125 Hz midpoint vanishes but whole-target true-candidate power remains about0.895696. At250Hz midpoint ratio is−1; at500Hz it returns to+1 although missing-cell MSE is16/7 and true-candidate filled power is100/121. This prevents a correct midpoint from masquerading as full-gap recovery. Static fill restores this constant noiseless channel; ordinary rectangular-aperture Dirichlet sidelobes still exist.

The optional noise switch uses 0 dB active-cell signal/noise power ratio with fixed XorShift32 seed20261011 and Box–Muller proper-complex draws. No new random draws on resize/toggle. A single realization is not an empirical probability or detector evaluation.

For fixed candidate, noise factors are1/K and ‖Lᴴs‖²/J². The displayed noise comparison always uses R′=37.5m,f′=0Hz, independently of target truth. At static G=8 these are0.00102880658436214 and0.00128594180440771. Three displayed points from two observed endpoints have covariance/σ² [[1,.5,0],[.5,.5,.5],[0,.5,1]] of rank2. Smaller midpoint variance does not create independent data. No large covariance inverse, diagonal jitter or independent-map-pixel assumption is used.

## Reproduce

No frontend or site-build dependencies are introduced. Node's built-in test runner executes the numerical and mock-DOM regressions. The independent scientific reference requires Python3 and NumPy (2.3.5 was used here); it does not import the JavaScript core. Do not install dependencies merely to view the static site.

```sh
node scripts/generate-site.cjs --check
node --test tests/*.test.cjs
python3 scripts/validate-ofdm-interpolation.py
# Regenerates data/ofdm-interpolation-validation.json deterministically here.
git diff --check
```

The producer reference includes15 analytical/independent-loop/seeded-Monte-Carlo checks and7 fixture sets. Its separately scoped three-sample pointwise threshold demonstration is a reference validation of correlated noise, **not a feature or detection claim of this page**. The frontend intentionally omits that threshold example.

## Executed checks

- Numerical native tests:16/16 passed, including all7 independently produced fixtures, arbitrary complex endpoints, every control preset/gap, midpoint signs/zero phase/500Hz counterexample, direct coherent sums, fixed separable maps, truth independence, covariance/adjoint factors, pointwise efficiency bound, seeded noise and rejection of invalid inputs
- UI mock-DOM tests:9/9 passed, including32 preset/gap combinations, lazy/cached maps, current raw values, unobserved `null`, endpoint/focus changes, seeded noise, reset/reopen/resize, zero phase, failure clearing, missing core, finite SVG coordinates at widths220–1000 and native-control/data-access contracts
- Independent actual-JavaScript scientific audit:157 checks passed on core SHA256 `b5ae3998fe556db64738a0c8e585463f95267e6c315d58faf4532486d3ce32b8`, including188 states, arbitrary nonseparable data and masks, all native DFT points, six complete maps compared against direct sums,53 invalid cases, and8192 noise realizations; maximum deterministic discrepancy5.51e−14
- Separate independent producer review:30 checks passed;7 fixtures agree to floating-point precision. Separate actual-core audit:35 states,210 candidates,24,960 map cells and21 structural checks passed (initial core; later changes only tightened input validation)
- Full repository suite:393/393 passed; targeted integration suite:92/92 passed; generator freshness and whitespace checks passed. The Python reference regenerated its15 checks and7 fixture sets byte-for-byte against the supplied independent producer output. Exact final artifact hashes are recorded in the release handoff.
- Independent actual-renderer DOM audit:88 checks across six states passed. A separate learning/runtime review passed9 groups covering64 states, widths220–950, map/cache/fold/reset/error states and metadata preservation; both are DOM harnesses, not browser layout certification. Final renderer additionally rejects empty native-control values before numeric conversion.

The numerical core rejects holes in complex pairs, nonfinite numbers, components above1e100, malformed masks/counts and inconsistent diagnostic geometry. Failed UI calculations clear all old charts/results/data before displaying recovery guidance. Reset clears the data cache and restores static, G=8, no-noise, m=16.

## Browser and release boundary

This builder performed no browser control, commit, remote write or deployment. Mock DOM is not browser layout/accessibility certification. Before release, inspect actual desktop/narrow SVG labels, color-scale ticks, disclosure reopening, keyboard controls and raw-data scrolling, repeated resets, lazy map responsiveness, bibliography navigation, resources and console. After publication verify the exact deployed commit and live assets. Do not infer those results from this document or CI alone.

The existing Golay live-QA appendix is preserved. The new lesson activates only the existing `ofdm_full_duplex` bibliography entry as the fifth available case; source influence snapshots,31 concepts,8 directions and all beginner-map entries remain intact.
