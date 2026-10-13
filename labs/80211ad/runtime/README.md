# Bounded fresh-computation 802.11ad receiver runtime

This is a first-party, dependency-free JavaScript numerical runtime and isolated Worker interface for the accepted source-derived Python receiver associated with Kumari et al., arXiv:1702.05833v1. It executes a bounded subset on newly generated or imported received samples. It is **not a UI, publication, full-paper reproduction, original figure replication, measured radar, complete communication PHY, or standards-compliance implementation**. Node Worker and classic browser-loader VM tests are separate from actual browser performance and rendering checks, which remain unperformed here.

## Numerical chain

- Chip-exact Ga128/Gb128 recurrence, final reversal, complete 3328-chip STF/CEF context, and default physical j^n chip modulation
- Arbitrary fractional-delay waveform from finite-support ideal raised cosine, absolute receive-time Doppler plus oscillator offset, complex gains, and independently normalized finite-RRC colored receiver noise
- Actual phase-energy search, normalized lag128 STF run detector, preliminary full-preamble search, coarse combined-frequency estimation and within-frame correction
- Full searched STF/Gu/Gv/CEF/preamble correlations, centered 512-bin CP-indexed channel, actual lag512 and adjacent-frame product arrays/sums, global single-target Moose diagnostics
- Uncorrected complex per-frame CEF channel, full slow-time DFT, all map powers and above-threshold mask, all local candidate maxima with no target-count cap
- Separate post-receiver evaluation utility retaining all-trial and accepted-trial error denominators, bias and RMSE; ideal CRLB helpers explicitly do not account for acquisition selection, truncation, colored noise or synchronization errors

No fixture table, stored curve or target list is used by the receiver. Source/scenario generation and held-observation processing are separate operations. Changing nfft, STF threshold, detection PFA or phase-search policy can recompute a held record without re-running the generator. The raw sample hash is stable across such branches.

## Quick local execution

```js
const K = require('./js/receiver.js');
const observation = await K.synthesize(
  {frames: 2, oversample: 8, max_delay_chips: 768, seed: 80211},
  [{range_m: 25.17, velocity_mps: 20, gain: {real: 1, imag: 0}}]
);
const result = await K.process(observation, {nfft: 64});
console.log(result.acquisition.accepted, result.estimate.multi_frame_velocity_mps);
```

For an application, use `worker/client.js` and `worker/receiver-worker.js`; do not run heavy numerical work on a UI thread. See `worker/README.md` for the exact request protocol, cancellation, supersession, release, import/export and restart lifecycle. Node direct use above intentionally omits Worker scheduling overhead.

## Fixed source identity

- Paper: https://arxiv.org/abs/1702.05833v1
- Accepted reference freeze ID: `70191a5acbb6ab90d1da3791aaee86d557b8605884cac8251fb834acda4a3024`
- Accepted MANIFEST.json byte SHA256: `133586b0a85f3d2324b75bbb70ef71f0e1c3404dbf70904e581022c72ec8bd6a`
- Receiver Python byte SHA256: `3cb8d43eb79dc9ffd3a8beadbc2a6ead72a94fdf051f1bdaa96ce4f3b7ac8295`
- Map detector Python byte SHA256: `d25d6beb1876e68dd0574c14f2c3a8bda6f842f4524a686752b24c4aa232a1bb`

These identifiers are deliberately distinct. `SOURCE-FREEZE.json` records the source dependency and first-party helper provenance. No source PDF, extracted paper text, IEEE Office document or copied third-party implementation is redistributed.

## Bounds and modes

| Setting | Supported runtime |
|---|---|
| Oversampling | 2, 4, 8; source 8× is executable |
| Frames | 1..64, further constrained by sample budget |
| Delay search | Integer maximum 1..1024 chips |
| Pulse half-support | Integer 4..32 chips |
| Total complex received samples | ≤2,000,000 |
| Slow-time nfft | Frames..256, including non-powers of two |
| Map cells | ≤262,144; upper-delay phase can reduce actual width |
| Simulated targets | 0..8, each gain component ≤100 absolute |
| Frame spacing | Integer ≤10,000,000 chips, exceeding complete receive support |
| Sample and carrier rates | Fixed 1.76 GHz and 60 GHz |
| SCNR / oscillator | −60..100 dB / absolute ≤100 MHz |
| Default wall time | 30 seconds; process request may select 10..120,000 ms |

Bounds are checked before numerical allocation. The first transport clone, JSON parsing, validation, output cloning and garbage collection are not fully interruptible numerical stages; they remain separately bounded. Cancellation and supersession are checked at real macrotask yields inside FFT, synthesis, hashing, per-frame correlation and DFT loops. Terminating/restarting the Worker is the hard-stop option.

## Replay and verification

```sh
python tests/verify_manifest.py
node tests/test-kernel.cjs
node tests/verify_oracles.cjs
node tests/test-worker.cjs
node tests/benchmark.cjs
```

Verify distributed bytes before rerunning tests. Test/benchmark reruns intentionally refresh dated reports and therefore change full-evidence manifest bytes; verification never silently repairs them. Runtime-only verification uses `python tests/verify_manifest.py --runtime`.

The full evidence archive contains independently generated Python waveform fixtures, primitive oracles, expected stage outputs, hashes and retained initial harness failures. The small runtime archive does not pretend to include those large fixture arrays. `tests/NUMERICAL-VERIFICATION.md` explains tolerances and fresh versus historical inputs. `reports/resource-benchmark.json` records measured Node resources with actual macrotask yields; it is not a browser benchmark.

The original source-like two-target stored example has **28 candidate peaks at nfft10000**. The bounded port reprocesses exactly that historical received record at **nfft256**, yielding **29 candidates** in both Python and JS. Both counts remain identified with their own processing settings. The nfft10000 map is outside this runtime; neither count is a confirmed target count.

## Interpretation requirements

Acquisition, threshold detection and physical identifiability are separate. A diagnostic peak exists even after acquisition fails; never present it as a successful estimate merely because it is the maximum. All rejected records remain available. Across-frame and within-frame methods have different integration counts and spacing despite sharing the same raw observation. STF2048 and CEF1024 comparisons share the full-preamble front end and do not establish equal-energy/time end-to-end superiority.

Oscillator offset and Doppler add in these observations and cannot be separated. Coarse lag128, within-frame lag512 and adjacent-frame estimates have different principal intervals. Global Moose assumes a single target; a multi-target result is a mixture diagnostic. No success flag unwraps an alias.

The signal is a truncated ideal RC cascade; noise is a separately normalized finite RRC filter. They are not one exact pair of finite cascaded filters. The exported scalar RRC helper is verified on the supported 2×/4×/8× noise grids, with exact singular-grid branches; arbitrary off-grid values extremely close to its analytic pole are not a validated analog pulse calculator. Signal RC evaluation is fractional; supported-path waveform accuracy is independently tested.

First-frame acquisition can reject targets that cancel there but return strongly later. Fractional timing, j^n boundary transients and coarse CFO can create systematic bias. Map familywise bounds apply to noise-only Gaussian H0 with known noise covariance, not target-generated sidelobes; every local maximum remains a candidate. Zero padding changes bin spacing and detector family count, not finite-CPI resolution.

Fixed-range stop-and-hop is used even at long CPI. Range migration, phase noise, self-interference, spatial array/beamforming calibration, clutter, header/payload, overlapping packets and communication demodulation are not implemented. Source perfect-synchronization/ideal-noise CRLB comparisons do not certify the actual receiver's selected errors.
