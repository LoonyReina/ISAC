# Scientific report: two-dimensional pilot patterns

Date: 2026-10-13. Existing paper: `supplement-case-pilot`; fixed arXiv:2401.09643v3. Status: **accepted bounded interpreted core** after independent scientific review. No UI, publication, or other paper was changed.

## Main result and limitation

The independently implemented extended-guard receiver recovers the declared four-path beyond-CP scene from actual linear CP-OFDM I/Q, with complex-cell NMSE 1.28e−28 for staggered D. The ordinary-CP receiver applied to **identical raw D samples** has 0.07215 NMSE. Source-style staggering relocates exact 2D aliases; it does not remove every alias.

**The longer guard has a real noise cost.** Keeping 16 of 96 useful samples raises recovered noise variance by six. In the fixed paired-noise scene, it worsens cell NMSE at 0 and 10 dB, and improves it at 20 dB. This crossover, along with false candidates and model failures, is part of the result rather than a plotting exception.

This is an independently accepted bounded standard-resolution interpreted core, not exact Fig.10/Fig.23 values, IAA/MUSIC, measured RF, or whole-paper reproduction. Original figure settings remain incomplete. Every synthetic scene, sample budget, seed and numerical decision is declared in the contract/configuration.

## Physical chain and fairness

Unnormalized complex-exponential synthesis creates a complex-baseband sample stream with actual cyclic prefixes, an unknown preceding symbol, zero off-mask sensing tones and (when J>1) unknown intervening payload symbols. Each path delays the entire finite stream noncircularly. Slow-time and continuously evolving Doppler models are distinct. Fractional delays evaluate a declared finite rectangular CP-symbol pulse exactly; they are not a circular shift approximation.

The receiver sees raw y, known pilots and grid only. It discards CP plus ell comb repetitions, de-rotates the offset, takes the shorter FFT with source 1/N normalization, selects/remaps bins, restores N/L and divides by known pilots. Coherent direct sums and zero-padded transforms retain the complex phases. Truth is used only to evaluate outputs. Ell is never chosen from hidden delay truth.

A/D comparisons share scene, immutable seed, noise draw and measured total frame energy but have different transmitted and received samples. Only the D ell=5/ell=0 comparison is labeled same observation. All CP-inclusive frames have energy 2700 in the Fig.23 structure experiment. For D: 384 sensing RE, 1.44 MHz allocated band, 1.35 MHz occupied-tone span per symbol, 0.694444 microsecond samples, 1.725 ms first-to-last RS spacing, 1.875 ms complete frame including preceding symbol. The retained guard supports delays up to 92 samples and retains 322.902 units of transmit energy versus 1937.412 useful sensing-symbol energy. Full detailed ledgers are exported.

## Fig.10 relationship checks

Twenty fixtures cover A/B/C/D1/D3, native pattern lengths and common M=12, both zero and nonzero delay/Doppler truth. The source B repetition is labeled as an adaptation. Every expected comb-lattice relationship is checked by direct physical-frequency sums, including unequal sidelobes and pure-delay/pure-Doppler aliases. Maximum equal-height alias amplitude error is 4.44e−16; maximum complex relationship residual is 3.81e−12 at sum amplitudes up to hundreds.

Exact alias enumeration uses complex steering collinearity, includes kappa2=0 and F0 offsets, refuses K=1 and M<=2 uniqueness claims, and checks the full pairwise difference domain for a half-open rectangle. Linear D keeps tilted aliases. An apparent zero-Doppler-only improvement is never treated as elimination of all 2D aliases. Zero padding refines the evaluated coordinates and adds no physical resolution.

## Declared Fig.23(a–c)-structure experiment

N=96, Ncp=12, comb6, M=24, J=1, delta_f=15 kHz. The four delays are [3,20,36,72] samples; Dopplers [0,−400,400,800] Hz; unequal complex gains are fixed before running. Noiseless cell NMSE: A extended 9.51e−29, D extended 1.28e−28, D ordinary CP 0.07215.

The frozen finite-grid candidate rule selects at most eight peaks, with fixed neighborhood/threshold/suppression. Noiseless bounded outputs are A: 2/4 truth matches and 6 false candidates out of 8 selected; D extended: 4/4 matches and 3 false candidates out of 7; D ordinary CP: 3/4 matches and 4 false candidates out of 7. These are **policy-selected candidates, not unique detections**. A's strongest family contains six numerically equal aliases; a fixed candidate cap cannot turn that ambiguity into unique information. The exported `near_tie_group_size` makes this multiplicity visible. Conditional Doppler error for the four D-extended matches is 12.5 Hz on the declared 25 Hz grid; delay error is zero in this on-grid synthetic scene.

Two project-owned figures show the spectra on a common absolute power scale and the noise tradeoff. Red circles are evaluation-only truth overlays. No paper image was reused.

## Paired noise experiment

200 independent proper-complex noise frames per SNR, 600 total. The SNR reference plane is D's clean mean received power over complete sensing blocks. The same variance and time-noise vector are applied to A and D; each D receiver sees the exact same y. Results below are mean cell NMSE. The interval is a frame-level paired approximate 95% interval for ordinary-CP minus extended-guard NMSE; positive means extended guard is better.

| SNR dB | D extended | D ordinary CP | Paired difference [95% interval] |
|---:|---:|---:|---:|
| 0 | 1.035283 | 0.244003 | -0.791280 [-0.799083, -0.783477] |
| 10 | 0.103616 | 0.089381 | -0.014235 [-0.015056, -0.013413] |
| 20 | 0.010371 | 0.073845 | 0.063474 [0.063332, 0.063617] |

All 1,800 receiver outputs and all 600 actual noise vectors are retained. Every y is reconstructed exactly as exported clean+noise and checked against its hash. No failed numerical trial was dropped. Per-frame candidates, assignments, misses, false candidates, conditional errors and frame-mean intervals are in `results/experiments.json`. These are fixed-scene numerical experiments, not scene-population claims or calibrated detection probabilities.

## Retained model failures and limits

| Case | NMSE versus source ideal | Best-common-gain-aligned residual / source ideal energy |
|---|---:|---:|
| continuous_scene_frequencies | 0.0244593 | 0.0243919 |
| continuous_plus_6000Hz | 3.71346 | 0.040282 |
| fractional_rectangular_pulse | 1.48499e-27 | 8.2088e-28 |
| nonRS_payload | 5.04762 | 5.03142 |
| beyond_guard_delay93 | 0.012698 | 0.0126439 |
| zero_signal | undefined: zero reference energy | undefined |

Continuous phase changes the source constant-per-symbol approximation, even at the declared scene frequencies. Best-common-gain alignment is evaluation-only and prevents an absorbable common phase from masquerading as all of the distortion. Extra off-mask payload destroys the short-transform recovery assumption. Delay 93 is beyond the 92-sample guard and fails. Fractional propagation passes under the explicitly declared rectangular pulse, which is not an RF pulse-shaping validation. Zero-signal output has no candidates and undefined NMSE denominator, rather than a fabricated zero-error percentage.

## Validation and corrections retained

Author tests: 43 checks including 390 tiny direct-synthesis/DFT cases across all requested valid N/S/ell/offset combinations; largest tiny complex residual 1.65e−14. Direct versus FFT tests include J=2 and arbitrary negative/noninteger Doppler. Explicit covariance operators, unequal pilot powers, empirical 12,000-draw covariance, inter-symbol independence and same-y cross-guard correlation are checked. Ten mutation sentinels cover source remap/sign/missing-j/grid errors, circular delay, oracle guard, new noise in same-y ablations, off-mask division and stale output. Receiver replay passes 1,878 checks including all 600 raw noise frames and 1,800 recovered-cell arrays, with maximum replay difference 4.55e−12 (energy summation rounding).

The separate auditor derived its own operators and source counterexamples, rather than trusting author helpers. It found and required corrections to invalid domain acceptance, tolerance-shrunken rectangle boundaries, and exact-float sorting of alias ties. The tie correction uses a declared relative 1e−12 map-power grouping and fixed truth-blind grid ordering, verified under ±1e−14 perturbations. Initial pre-correction candidate results remain explicitly superseded in `results/experiments-pre-tie-correction.json`; the initial author J>1 mutation fixture failure remains in `results/author-tests-attempt1.json`.

The source-discrepancy ledger keeps literal remap/grid/mask/dimension/congruence/origin issues, Eq.(13)'s missing j, omitted zero-coordinate aliases, and unresolved later Table I language explicit. Corrections are project interpretations, not author-issued errata. The independent acceptance record accompanies the bundle. Its separate tests cover 26,000 raw impulses, 780 independently generated physical cases, 10,304 small patterns, 600 exact noise-seed regenerations, 1,800 noisy receiver outputs and 1,809 candidate/evaluation reports with zero final disagreements.

## Resource and remaining gates

Single-threaded full experiment runtime was 3.76 seconds. The source-free snapshot plus compressed delivery archive is budgeted below 150 MB; no large sweep, external code execution, model download or source-PDF redistribution occurred. `MANIFEST.json` binds all code, configuration, numerical records, reports and figures; archive SHA binds that manifest.

Still outside scope: continuous Delay-and-Sum AF, sourced IAA/MUSIC settings and implementation, synthesized/irregular patterns, exact Table II overheads, Fig.23(d–f), author-figure numeric replication, browser port/parity/performance, and teaching-site integration. Independent acceptance of this bounded core is required before a browser port; port validation is a separate gate.
