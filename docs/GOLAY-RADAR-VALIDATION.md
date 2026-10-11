# Golay training-to-radar mechanism validation

Date: 2026-10-11. Fixed analytical source: [arXiv:1702.05833v1](https://arxiv.org/abs/1702.05833v1), dated 2017-02-20. DOI identity: [10.1109/TVT.2017.2774762](https://doi.org/10.1109/TVT.2017.2774762). Equation/figure references are to this preprint, not the uninspected journal full text.

## Teaching scope

This is an independent, original Chinese lesson about reusing known communication training sequences to measure delay. It is not an IEEE 802.11ad PHY implementation, CEF-compliance demonstration, original-paper performance reproduction, road measurement, detector, or precision claim.

The first experiment changes one integer echo delay and compares repeated A+A against complementary A+B. Both use two 128-chip transmissions with unit chip amplitude, 256 units of normalized chip energy, identical starts/guards, complete receive records, search interval and noise conditions. Selecting a curve only highlights it; both remain plotted.

Closed native disclosures progressively add:

1. A chip-sign strip and signed real/imaginary correlations; complex addition precedes magnitude. A deliberately incorrect magnitude-before-sum overlay demonstrates the lost cancellation
2. A fixed coherent weak-echo construction at d=12 and d=33, with optional repeatable proper-complex Gaussian noise
3. Full samplewise physical Doppler at ±50 m/s and 60 GHz, followed by a separately labeled +50 m/s long-gap synthetic stress
4. Exact model assumptions, known/unknown quantities, source correspondence and CEF processing limits

No slow-time layer is implemented in the UI or JavaScript API. Reference-only Python slow-time checks are identified as source-audit checks, not a feature claim.

## Numerical model and receiver boundary

Constants are c=299792458 m/s, fc=60 GHz, fs=1.76 GHz, Tc=1/fs. Independent sequences use A0=B0=[1], A′=[A,B], B′=[A,−B], to N=128. Their actual bit order is not claimed to be the standard Ga/Gb order.

The two fixed receive windows begin at transmit starts 0 and D=N+G, each with N+dmax samples. Default G=128 and dmax=127, so each record has 255 samples. Every candidate lag uses all 128 template samples. Receiver windows do not depend on target truth. The record model retains exp(jω(start+n)) for every sample, including both intraburst and interburst Doppler.

The direct receiver forms CA/N and CB/N, then z=(CA+CB)/(2N). Complex values are [real, imaginary]. Positive velocity is approaching and gives positive baseband phase progression. Optional core-only compensation rotates every sample and is tested only as an explicitly known-frequency oracle; the lesson does not offer it as an estimator.

Resources are recorded separately:

- Active chips 256, active time 145.454545 ns
- A/B start separation 256 chips, 145.454545 ns
- First transmission start to second transmission end 384 chips, 218.181818 ns
- Complete observation support 511 chips, 290.340909 ns; latest required sample has global index 510
- 510 captured samples in the two records; this count is not the elapsed span
- Minimum nonoverlapping repetition stride 511 chips for this isolated model; this lesson simulates one pair only
- Delay-grid spacing 0.08516831193 m and maximum searched range 10.8163756153 m

The grid spacing is not physical range resolution, measurement precision or a CRB. Chip rate is not equated with occupied RF bandwidth or the nominal 2.16 GHz channel width. Fractional delay, pulse shaping, range migration, RF self-interference, clutter and synchronization error are omitted.

## Reference results

Default single target d=12, α=1:

- A+B true-delay amplitude 1 and exactly zero at other searched integer lags
- A+A true-delay amplitude 1 and maximum off-target amplitude 0.1484375
- Weak construction d=12, α=1 and d=33, α=0.1: A+A at d=33 is −0.0015625; A+B is 0.1. This intentionally chosen phase-sensitive example is not a detection-probability evaluation
- +50 m/s: fD=20013.8457118891 Hz, A/B start phase difference 0.0182910111 rad, true-delay amplitude 0.999954695506, largest off-target amplitude approximately 0.001178901
- Long-gap stress D=43970/G=43842: energy remains 256 chips, but complete observation becomes 44225 chips / 25.127841 μs. The near-π interburst phase suppresses the true-delay coefficient

Noise is deterministic for the visualization: seeded Mulberry32 uniforms and Box–Muller pairs generate proper-complex samples with E|w|²=σ². A+A and A+B get the same physical input noise arrays at the same seed; different receive windows and quadratures do not reuse samples. Reset, resize and disclosure toggles do not resample noise. Python's independent RNG is tested separately and is not asserted to match JavaScript's noisy draws.

The optional noisy weak exercise uses σ²=0.1. Strong echo per-chip SNR is 10 dB, weak echo per-chip SNR is −10 dB. The complete A+B receiver's output variance at one lag is σ²/(2N); no search-wide false-alarm claim follows.

## Source distinction

The linked source manifest records primary-source identity, fixed version, locators and the boundary of each supporting reference. No paper PDF or copied performance plot is included.

The source's signed 512-chip blocks U=[−B,−A,B,−A], V=[−B,A,−B,−A] must not be treated as a standalone aperiodic Golay pair. With the independent canonical N=128 base pair, their summed extreme aperiodic lag is 2 and maximum offzero value is 66, versus zero-lag 1024. Their periodic correlations are complementary; the surrounding stream [−A,U,V,−B] supplies cyclic extensions that restore the local correlation sum over relative lags −128…128. This independently checked processing distinction does not validate the complete standard receiver, nor make a local post-synchronization channel-spread condition an absolute radar-range limit.

The preprint's Eq. (20) sign and Eq. (29) dimensional issue are scoped explicitly to v1; no journal-wide correction claim is made. No new citation or discussion counts are inferred.

## Implementation and tests

- `golay-radar-core.js`: dependency-free UMD/CommonJS pure numerical API, strict geometry/type/key validation, complete receive vectors and correlations
- `scripts/validate-golay-radar.py`: Python standard-library independent reference, portable script-relative fixture destination and `--check`
- `data/golay-radar-validation.json`: 12 noiseless direct-record scenarios, including both complete receive vectors and all correlations, source-audit checks and constants
- `tests/golay-radar.test.cjs`: recursive complementarity, all searched delays, complex amplitudes, resource equality, complete-window truth independence, analytic finite Doppler, weak construction, long gap, wrong processing, seeded noise, exact noise covariance, covariance Monte Carlo and invalid inputs
- `tests/golay-radar-ui.test.cjs`: native events, reset, deterministic noise, wrong-order toggle, fixed exercises, endpoints, real/imaginary components, visible-width redraw, finite chart geometry, failure clearing and accessible static markup
- `tests/golay-radar-integration.test.cjs`: registry, four available influence teaching cases, six-level waveforms integration, preserved influence snapshots, actual local routes and source boundaries

SVG coordinate systems use the actual visible CSS width and redraw when a native disclosure opens. Axes use fixed absolute normalization. The weak panel explicitly zooms d=26–40 with a 0–0.25 scale; the physical-Doppler residual panel uses 0–0.003 and omits the true-delay sample rather than counting it as a sidelobe. Invalid states clear stale plots and numerical claims while leaving static educational content readable. A noscript summary contains actual default results. There is no autoplay, network request, parameter upload, third-party runtime or persistent local storage.

## Executed local verification

- Dedicated pure numerical Node suite: 34/34 passed
- Dedicated DOM/UI suite: 8/8 passed
- Python reference script: 46/46 checks, 12 fixture scenarios; `--check` passed from both repository cwd and `/tmp`

Commands for a clean local rerun:

```
node --test tests/golay-radar*.test.cjs
python3 scripts/validate-golay-radar.py --check
node --test tests/*.test.cjs
node scripts/generate-site.cjs --check
git diff --check
```

Final integration passed all 360/360 Node tests (including 34 core, 8 UI and 7 new Golay integration tests), generator freshness and `git diff --check`. The 80211ad bibliography card is now the fourth available teaching case among the same nine papers; only its case link and reading plan changed. There are 20 units, 9 cases, 31 concepts and the same 8 directions. Golay is in the existing waveforms direction and the existing signals-networks bibliography group. All frontier reading/standard changes from merge `d722169e5cc1aa10b810ebc24f31bb498fb7c070` remain; its live verification is appended separately to the historical frontier record.

The UI review independently exercised 24 delay/mode/phase/component states, fixed-panel independence, seeded-noise stability, wrong-order values, exact 0.25 axis labeling, reset, hidden/reopened layouts, narrow-width geometry and error recovery: 9/9 checks passed. A conditional legend identifies the purple wrong-order curve even when its control disclosure is closed. The raw-data region is labeled, keyboard-focusable and scrollable.

DOM harness execution and static geometry checks do not certify rendered text bounds, a real screen reader, actual keyboard operation, browser engines, online asset loading or deployment. Parent release review owns real-browser and live deployment checks; none are claimed here.

## Independent audit of the actual JavaScript core

A separate auditor evaluated the frozen core SHA-256 `7bb174df7ec5bdaa1bbad3a9631f086fdb947c8d648dcb6e1b19bcc5a0aea7c3` without importing the builder's reference code or fixtures. Independent bit-parity sequence construction, a single global NumPy transmit/receive timeline, fixed-window extraction and NumPy correlation were compared with the actual Node-produced receive records and outputs.

- 259 actual-core scenarios and 3,946 assertions passed, including maximum supported N=4,096 and lmax=4,095
- 106 malformed, nonfinite or insufficient-guard inputs were rejected
- Maximum absolute discrepancy across receive vectors and correlations: 2.11×10⁻¹⁵; independent weighted-Doppler response discrepancy: 1.90×10⁻¹⁵
- 8,192 seeded noise trials per mode checked proper-complex quadratures, variance and the distinct A+A/A+B output covariance structure; this is numerical/noise-law validation, not detector evaluation
- ±50 m/s produces the same magnitudes, including peak 0.999954695506 and maximum off-target magnitude 0.001178901043; the long-gap peak is approximately 1.57006825×10⁻⁵
- Block-only correction and insufficient-guard counterexamples were independently checked, supporting the full samplewise model and receiver-support boundary
- Auditor reran the repository's 34/34 core tests and rechecked the core hash unchanged

No material numerical issue remained. The magnitude helper can return Infinity if both components are `Number.MAX_VALUE`; this is outside the lesson's reachable values and is not asserted to be a finite representable magnitude. The browser error path clears nonfinite plotted results. This independent audit does not validate IEEE compliance, actual RF hardware, detector performance, physical fractional-delay behavior or deployment.


## Verified publication and live browser checks

On 2026-10-11 UTC, [PR #30](https://github.com/LoonyReina/ISAC/pull/30) merged as `ff83ffdc23cf352187c0995259d4aada714a4b81`. The Pages build and deployment run `38110542129` succeeded for that exact commit. All 22 remote files matched the frozen local tree; seven live entry files matched their expected bytes: the lesson HTML, runtime, core, CSS, reading directory, learning map and experiment catalog.

Actual cloud Chrome checks covered desktop 1165 CSS client pixels and narrow 323 CSS client pixels at 150% desktop browser zoom, not a physical phone. Delay endpoints 0/127, complex reflection phase, real/imaginary components, the incorrect magnitude-first overlay, its persistent legend, the fixed weak-echo example, deterministic noise across close/reopen, velocities −50/0/+50 m/s, and the independent long-gap stress behaved as described. Repeated reset restored all default controls. All six SVGs redrew for narrow or reopened layouts; rendered text remained inside their SVG bounds, with no page-wide horizontal overflow.

Native disclosures were exercised with Enter and Space. The labeled complex-data region accepted keyboard focus, and ArrowDown/ArrowRight scrolled inside it without widening the document. The bibliography card and the matching-template knowledge node both opened the initialized lesson; the beginner map route remained distinct from the deep case. The browser was restored to desktop width and 100% zoom.

The captured error-log sample contained extension-origin metadata errors; no non-extension error appeared in that sample. This is not an all-browser console certification. Physical phones, real screen readers, print rendering, JavaScript-disabled browsing, other browser engines, hardware performance and IEEE compliance were not tested. No lesson code changes were required after deployment.
