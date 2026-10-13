# Independent audit: bounded 802.11ad numerical port and Worker

Date: 2026-10-12 UTC. **Accepted for the declared bounded numerical and Worker contract. No unresolved blocking defect remains in the audited final runtime.** This is not a browser/UI acceptance, original-paper reproduction, complete PHY, standards certification, hardware validation, or guarantee of arbitrary-input analog pulse accuracy.

## Exact accepted bytes

Runtime freeze: `b84547a2bdad7da400238c267d2a6d089b33af8f2474d8f733f18c85d9a9b430`

Runtime manifest byte SHA256: `6a7ceabfa149918d07fb6999fa1680edac77b98a32f08017b370968843d30260`

All 22 manifest files were independently checked, the canonical freeze ID was recomputed, and the complete accepted runtime is preserved in `final-candidate/`. The six executable numerical/protocol files remained unchanged during the final tests:

| File | SHA256 |
|---|---|
| js/receiver.js | fb44f41a9fce21f7bbcdf9558e2c87df5750dab4c5560d1b5c595ad0b4125090 |
| js/sha256.js | 9b620ba2e4decf0014a5e6ce30b3e17c99b3d1df103e0d6a6ef4c40c65f96342 |
| js/evaluation.js | 1171d1f19b8f330f0da12ed79e5247d2b129b4cf13f2af68113aeae4c54a0e1d |
| worker/protocol.js | 41a7b0bd3a28a1acd4051a47ca6e42bf2100a2afc381f27e1bd35846be1b6458 |
| worker/receiver-worker.js | 0e422167dbb93a92e459405362cf67a8b0fa8dac26629d8bfe92c06fc4dc902b |
| worker/client.js | 866a92a3408351ded4f48020be1d3f5dd1f050846287be4e3a57320fa56f44e5 |

Accepted Python dependency: freeze `70191a5acbb6ab90d1da3791aaee86d557b8605884cac8251fb834acda4a3024`. Its 58-file manifest also verifies. Python receiver SHA256 is `3cb8d43eb79dc9ffd3a8beadbc2a6ead72a94fdf051f1bdaa96ce4f3b7ac8295`; map detector SHA256 is `d25d6beb1876e68dd0574c14f2c3a8bda6f842f4524a686752b24c4aa232a1bb`. The earlier independent numerical report establishes this reference's accepted reconstruction scope; this review does not repeat its paper/sequence provenance audit or upgrade its scientific claims.

## Independent executed coverage

### Fresh held-waveform and full-stage numerical checks

`results/final-numerical-report.json` records **7,105,533 numeric comparisons**, including cross-host-branch duplicates, across **13 fresh scenes and four same-held-record policy branches**. These are not the owner's pre-existing fixtures. No owner JavaScript fixture generator or comparison harness was imported.

Fresh scenes span q=2/4/8, both physical modulation modes, 1/2/3/4/5/7/64 frames, nondefault integer pulse halfspans 4/5/6/7/9/11/15/17/19/21/23/27/31, delay limits down to one chip, start/end-near fractional delays, high/very small complex gains, SCNR −60 and +100 dB, exact cancellation, high/aliased oscillators, and odd/zero-padded DFT sizes. Four branches independently change fractional-phase policy, STF gate, detector PFA and nfft without changing held samples.

Every existing Python stage output is checked, rather than only peaks: phase energies, selected symbols, corrected symbols, STF normalized correlation, correlation curves, channel extraction, Moose outputs, full complex DFT/power arrays, threshold masks and candidate lists. Discrete choices, masks, nulls, statuses, indices and counts must agree exactly. Newly exposed STF pass/run arrays, all 1,920 lag-128 products, per-frame 1,536 lag-512 products, all adjacent-frame 3,328-sample products, pooled sums, and separate Gu/Gv contributions are reconstructed independently.

Independent mathematical oracles additionally use:

- Fixed hexadecimal Ga/Gb chip literals, rather than the runtime's recurrence, to reconstruct all 3,328 unrotated and j^n-modulated chips
- Direct complex sums of held samples for full-preamble correlation, CEF, all 512 centered-channel coefficients, frequency cross-products and slow-time DFT
- Explicit innovation-coefficient accumulation for known colored-noise output variance, without the owner's convolution or variance function
- 70-digit scalar RC sums at 80 unseen complex waveform/frame points spanning q=2/4/8, field boundaries, fractional delay, complex gain and oscillator/Doppler phase. Worst error is 2.02e−11 in a high-gain scene; the new q=8 case is below 6.73e−13
- 1,071 pulse points against 70-digit analytic formulas. Supported sample-grid worst errors are 1.81e−16 for RC and 1.95e−16 for RRC
- Direct finite-time Fisher sums at five frame/training-size combinations, including the undefined one-sample bound

The declared tolerance was fixed before execution: ordinary absolute 2e−10 plus relative 2e−9; frequency absolute 2e−6 Hz plus the same relative tolerance. Decisions are exact. Maximum observed error/tolerance ratio is below 0.013. Large unnormalized product sums can have larger absolute rounding errors while remaining far inside relative tolerance; the report preserves per-stage maxima instead of hiding these under a single peak metric.

The complete deterministic outputs of the CommonJS and classic UMD branches are numerically identical in the same Node engine; only elapsed host timing is excluded. This verifies both loaders, not independent browser-engine transcendental arithmetic. Separate actual Node Worker tests verify transport and lifecycle.

### Fresh simulation-noise checks

`results/final-noise-report.json` records 96 new seeded noise-only records, 32 each at q=2/4/8, halfspans 4/17/32 and SCNR −30/0/+70 dB. In 1,570,976 complex samples:

- Empirical sample variance / declared variance: 1.001090, 0.999869, 1.001844
- Empirical adjacent real covariance / exact finite-RRC covariance: 1.001401, 1.000543, 1.001839
- Fixed matched-cell second moment / directly accumulated innovation variance: 0.895435, 1.183131, 0.785329
- Matched detections: 2/32, 0/32, 0/32 under the selected 0.05 family bound; accepted acquisitions: zero in all groups

These small-sample statistics support noise units and coloration. They do not certify tiny false-alarm probabilities or statistical quality of the noncryptographic generator.

### Truth, identity, replay and evaluation

`results/final-invariants-report.json` checks all-trial versus accepted-only denominators, retained rejected errors, explicit null unavailable estimates and null accepted-only RMSE when none are accepted. Changing generator-only seed, SCNR and oscillator metadata while holding samples/noise variance fixed changes metadata identity but leaves all numerical estimates unchanged. Target truth is absent from receiver inputs and enters the separate evaluation helper only afterward. Static dependency checks find no fixture/file/network lookup in the kernel and no evaluation import in the Worker.

The sample digest independently matches Node crypto's frame-major interleaved Float64LE bytes with canonical +0. The separate metadata digest, original/effective configuration, processing overrides and expected-hash replay are checked in the hostile suite. Signed zero is explicitly normalized; this is not automatically the legacy Python raw-byte digest when signed-zero bits differ. Hashes establish the supplied record's identity, not real-world authenticity or provenance. Expected hashes are optional on import; an accepted replacement import that later fails its expected-hash check clears the prior held state under the declared replacement lifecycle, without publishing a mismatching record.

### Actual Worker and hostile-input contract

See `hostile-review/FINAL-REPORT.md` and its retained JSON evidence. The final actual-Node tests include:

- 40 malformed Worker requests and five strict structural preflight cases: nonfinite values, sparse/inconsistent shapes, oversized vectors/configs, unknown/truth fields and unsupported types
- Rejected new requests leave an accepted earlier job and held observation intact
- Three real cancellation/supersession/release races: one terminal result per accepted request, with no stale successful result or progress after its cancellation fence
- 11 forbidden simulation/identity processing overrides; only declared receiver-policy overrides are permitted
- Five hash-tamper classes, exact export/import replay, metadata identity checks and unchanged held exports after policy branches
- Ten zero/tiny/max-amplitude finite cases, actual Worker transport death/restart, and evaluation finite-overflow/null/Infinity validation

All were rerun against the exact final six executable files and 22-file freeze. The first structured clone, plain-array validation/normalization, JSON parsing/export and outgoing structured clone remain synchronous bounded sections; cancellation is cooperative at numerical macrotask checkpoints, not instantaneous everywhere. Maximum-size latency measurements remain Node-only host evidence.

## Defects requested, repaired and rechecked

Original failures are retained under `hostile-review/`; no owner implementation file was edited by this audit.

1. A rejected newer client request could hide the earlier valid completion as stale/superseded. The client now restores selection based on accepted/rejected request causality
2. Arbitrary unit-norm noise filters could be accepted while output claimed finite-RRC covariance. Validation now checks each canonical declared RRC tap within absolute 1e−12, in addition to norm/length
3. Multi-frame signal accumulation progress could exceed its total. The progress index now remains within its declared bound
4. Legal ±1e8 complex sample components could produce ~2e16 map power and hit the old 1e16 guard. The finite power envelope is now consistent with admitted samples
5. Extreme finite evaluation truth/errors could produce Infinity RMSE/bias. The separate helper now rejects outside its declared evaluation domain
6. Admitted non-ASCII metadata could fail export/reimport. The bounded record contract now explicitly admits ASCII metadata only and rejects unsupported input before accepting it
7. Malformed helper results could null-coerce missing estimates or pass through nonfinite comparison metadata. Required estimates/comparison values are now validated before arithmetic

Nonblocking retained limitation: arbitrary scalar RRC evaluations extremely close to ±1 suffer cancellation (up to 2.374e−4 absolute in this probe). The actual receiver noise grids hit the singularity exactly and use the special branch; all supported q=2/4/8 grid points passed at ~2e−16. Documentation now limits this helper appropriately. It is not a general high-accuracy off-grid analog pulse calculator.

## Scientific interpretation and historical-map boundary

The accepted reference's limitations remain mandatory. The source perfect-synchronization/ideal-noise bound is a comparator; it is not proved attained by this front end. Oscillator frequency and Doppler are inseparable. An accepted aliased record may still have wrong timing or velocity. Global Moose on mixed targets is a combined statistic. Fractional-delay single-frame bias, j^n boundary effects and first-frame cancellation remain observable.

Rejected-acquisition correlations/maps are diagnostics, not successful measurements. The stricter STF branch in this review retains eight map candidates while rejecting acquisition. Candidate lists retain sidelobes; a noise-only family bound does not control target-induced sidelobes or establish target count. Conditional accepted-trial RMSE does not replace unconditional all-trial diagnostics.

The source-like historical two-target record has 28 candidate maxima at nfft=10,000. The bounded port's same-record nfft=256 replay has 29 candidates, separately recomputed by Python and JavaScript in the owner's historical comparison. This review verified that those distinct settings/counts and original source-file hashes remain identified; it does not relabel the 256-bin result as the original full map. Our new direct-DFT tests complement rather than duplicate that historical comparison.

The waveform is finite-support ideal post-matched-filter RC signal plus separately normalized finite RRC-colored noise, not two finite RRC filters proven identical to that RC signal. Fixed-range stop-and-hop remains used at long CPI; implied target movement/range migration is not modeled. Zero-padding improves grid spacing, not finite-CPI resolution. No full PHY, payload, communication demodulation, beamforming/array calibration, self-interference scene, phase noise, measured hardware or original 10,000-trial figure reproduction is certified.

## Reproduction and evidence

Run from this review directory:

```sh
python generate_independent.py
python add_trace_override_oracles.py
AD_CANDIDATE="$PWD/final-candidate" AUDIT_REPORT=rerun-numerical-report.json node check_independent_final.cjs
AD_CANDIDATE="$PWD/final-candidate" NOISE_REPORT=rerun-noise-report.json node probe_noise_units.cjs
AD_CANDIDATE="$PWD/final-candidate" EVAL_REPORT=rerun-invariants-report.json node check_eval_and_invariants.cjs
```

Python source generation expects the sibling accepted `80211ad-reference` directory. Saved `oracles/` and `trace-oracles/` allow checking the frozen JS without regeneration. The numerical report includes the source hashes, tested executable hashes, stable-byte result, per-stage counts, errors and exact failures (none in final). `results/final-freeze-verification.json` binds the 22 runtime files. The hostile report supplies its exact executable test commands. `AUDIT-MANIFEST.json` hashes the independent final report, scripts and evidence.

No browser, UI repository, remote machine or publication was used or changed. Actual browser rendering, memory, cancellation latency and cross-engine behavior require their own later review.
