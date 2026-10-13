# Independent numerical audit: source-derived 802.11ad radar receiver

Audit date: 2026-10-12 UTC. Outcome: **accepted for the explicitly bounded numerical reference and future faithful replay/porting; no unresolved numerical implementation defect found in that scope.** This is not certification of PHY compliance, the complete paper, the original authors' implementation, measured radar performance, or a future browser port.

## Exact accepted version

Owner freeze: `70191a5acbb6ab90d1da3791aaee86d557b8605884cac8251fb834acda4a3024`. The owner's manifest verifies all 58 listed files. Independent tests ran against a stable isolated copy; no input file changed during the audit.

- `src/receiver.py`: `3cb8d43eb79dc9ffd3a8beadbc2a6ead72a94fdf051f1bdaa96ce4f3b7ac8295`
- `src/map_detection.py`: `d25d6beb1876e68dd0574c14f2c3a8bda6f842f4524a686752b24c4aa232a1bb`
- `run_experiments.py`: `a57842b429623031b4c40e2826538d502da7a9b5c469112e0be13c81db91a754`
- `evidence/experiment-results.json`: `0d48be7d2c0a742c23f4c25f9120e628298aed03801f995fad6bd0d493fef7b7`
- `evidence/trial-results.json`: `5a7030e9aa178500839780e11af8de987c099899412766fe219614b7fd86e235`

This numerical audit reads the supplied fixed-source and chip-order audits as provenance. It does not re-audit the normative IEEE PHY or independently establish the original radar authors' unspecified implementation choices. Fixed paper identity remains arXiv:1702.05833v1. No source PDF, IEEE document, or third-party simulator is redistributed here.

## Executed validation and reproducibility

- **23 independent tests passed**, in `independent_audit.py`; detailed metrics and complete input hashes are in `final-audit-results.json`, and the test log is `final-audit.log`
- **18 owner tests passed** on the final numerical code
- **11 persisted fixtures** replay exactly from measured arrays and public receiver settings; their seeded forward models also regenerate identical raw samples
- **1,216 retained trial rows** and **26 summary objects** were independently recomputed, including unconditional diagnostic MSE/RMSE, accepted-only RMSE, accepted counts/fractions, exact binomial intervals, signed error quantiles, and squared-error Monte Carlo standard errors
- A fresh isolated replay began with empty fixture/evidence output directories. Main experiments, resolution checks, bias checks, first-frame cancellation, CFO alias, map detection, and fixture verification regenerated **34 JSON/NPZ files**. All were byte-identical except the two summary JSON files containing runtime values; every non-runtime value in those two files was identical. See `final-replay-comparison.json`
- All runs pinned BLAS/OpenMP/NumExpr thread counts to one. No owner source file, UI repository, remote executor, or browser was modified

To rerun the independent oracles against the preserved accepted copy:

```sh
python independent_audit.py --reference frozen-reference --output rerun-audit-results.json
```

To rerun the clean-output comparison after regenerating `final-replay`, run `python compare_replay.py`. The exact generator commands are recorded in `final-replay-comparison.json`. Python/NumPy/SciPy versions for the selected experiments are 3.12.14/2.3.5/1.17.0; the independent scalar pulse oracle uses mpmath at 60 decimal digits.

## Corrections independently requested and verified

1. **RRC special-point tolerance.** The initial `rrc()` used NumPy's default relative tolerance around t=±1. Arbitrary values such as t=0.99999 were flattened to the pole limit, with a 9.01e-6 amplitude error. The owner set `rtol=0`. Final arbitrary-point comparison with the 60-digit analytic formula has maximum RRC error 4.32e-13. Supported power-of-two oversampling grids were unaffected by the original problem
2. **Physical delay-search endpoint.** Initially, phase 7/8 with declared maximum delay 128 searched through 128.875 chips. The owner restricted acquisition and channel-map candidates to the declared closed interval, and recalculated the acquisition family count over every valid phase/delay pair. The independent endpoint test now ends at 127.875 for that phase, and ten combinations of oversampling/fractional-mode verify the exact count. This is q·D+1 candidates when all q phases and integer maximum D are used
3. **Ambiguity and single-target labeling.** Adversarial testing found accepted but wrong timing with oscillator offset 7 MHz, beyond the 128-lag CFO principal interval. The owner retained this fixture and exposed the principal intervals and accepted-is-not-unambiguous interpretation. Mixed-target global Moose results are explicitly single-target-assumption statistics

The centered-channel trailing-support defect was independently identified by another reviewer before this audit's final run. Its owner fix adds actual receive-record samples. This audit verifies the repaired result at 24 combinations of endpoint delay, oversampling, and pulse halfspan, including full 512-coefficient extraction; maximum direct-sum discrepancy was 1.09e-14.

## Mathematical oracle coverage

### Physical chips, modulation, pulse shaping, and timing epoch

The scalar reference builds the 3,328-chip preamble from source-audited fixed hexadecimal literals, independent of the owner's Golay generator. It checks both unrotated chips and the explicit j^n modulation before pulse shaping.

At 96 unseen waveform sample/frame points, a 60-digit scalar sum evaluates each fractional-delay RC contribution and its absolute-receive-time Doppler phase. Cases span q=1/2/8/16, halfspan=4/16/64, both modulation modes, near-zero/end-of-search delays, preamble-field boundaries, and positive/negative Doppler. Maximum absolute waveform discrepancy is **3.56e-13**. Fractional delay remains in pulse evaluation; it is not rounded to a truth cell.

For one fractional-delay record, replacing pre-shaping j^n modulation with post-reception derotation and a real-chip waveform changes the normalized waveform by about 0.633. These models are not interchangeable at fractional timing. The model uses finite-support samples of an ideal post-matched-filter RC waveform, plus finite RRC-filtered noise. It does not run two finite TX/RX RRC filters. An independent direct convolution at q=8, halfspan=16 differs from the implementation's truncated ideal RC pulse by **7.82e-4** at the worst impulse sample. This is a documented reconstruction choice, not a passed physical filter-cascade identity.

Energy-based fractional phase selection matches independent direct energy sums. Seven unseen noiseless delays, including endpoints, estimate to within half of the q=8 timing step. q=8 gives a **10.646 mm timing-grid spacing** at 1.76 Gchip/s. The range-Doppler map itself keeps **85.168 mm range-bin spacing**, shifted by the selected fractional phase. Neither number alone is a claim of two-target range resolution or real-world accuracy.

### STF, frame boundary, CFO, and Moose

Direct normalized lag-128/window-128 sums agree across 6,724 positions in the final receive records; maximum active-region discrepancy is 3.12e-14. The first passing index is the trailing correlation index; confirmation occurs 127 samples later. It is not the frame start. The implementation uses this detector as a gate and separately performs a bounded full-known-preamble timing search. It must not be described as a wholly source-specified STF-only frame-boundary algorithm.

The preliminary full-preamble peak, lag-128 combined-frequency estimate, lag-512 single-frame Moose sum, pooled same-record sum, and adjacent-frame Moose sum were reconstructed directly from actual complex samples. Unseen custom sample/carrier rates and complex gain scalings agree with physical units and signs to numerical precision. Positive complex Doppler produces positive in-principal-interval velocity under the declared convention. The within-frame correction leaves interframe physical phase intact.

At fractional delay 41.381 chips and q=8, single-frame Moose has a noiseless **+0.0081256 m/s** bias and the 128-lag combined-frequency estimate has **+10.408 Hz** bias; delay 53.173 chips retains the documented approximately **+0.0540 m/s** single-frame bias. The two-frame estimator remains exact in these noiseless, fixed-delay, constant-gain cases because it compares identical waveform positions. No truth correction removes these floors.

Ten velocities immediately inside/outside ambiguity boundaries and beyond one period reproduce the expected wrapping while retaining full unwrapped evaluation errors. With K=41,285 chips, the two-frame principal interval is approximately **±53.2513 m/s**, with a 106.5025 m/s period. The lag-128 CFO principal interval is **±6.875 MHz**; lag-512 single-frame frequency is **±1.71875 MHz**. Boundary values themselves have the usual phase-cut ambiguity. Known simulator oscillator settings are not subtracted by the receiver. Unknown oscillator offset and Doppler remain inseparable without another reference.

### CEF, centered channel, slow-time DFT, and map detection

514 direct CEF sums across both rotation modes confirm the complex 1/1024 correlation and zero-lag gain with the surrounding prefix/trailing context. Maximum direct-correlation discrepancy is 1.06e-14. No isolated Gu/Gv aperiodic-complementarity shortcut was used.

Direct complex slow-time sums reproduce selected odd-sized FFT/zero-padded FFT cells within 2.58e-16. Frequency-matched zero-padding checks preserve the unpadded values and nominal 1/CPI resolution. The exact finite-time unknown-amplitude Fisher bound agrees with an independent long-double time-grid calculation to 2.23e-16 relative error; the paper's large-M approximation is correctly kept separate.

Noise-output variance was reconstructed by explicitly accumulating each independent innovation coefficient, instead of invoking the owner's convolution routine. Maximum discrepancy is 1.09e-18. The map detector's variance, conservative phase/range/Doppler union threshold, full above-threshold mask, periodic-Doppler/nonperiodic-range neighborhood, and local maxima agree with independent calculations. The map family bound concerns noise-only H0; it does not bound signal sidelobe candidates or prove target identity. The final source-setting two-target map emits **28 local-maximum candidates**, including sidelobes, and preserves all 31,356 above-threshold cells.

### New noise, failure, and adversarial cases

512 new noise-only trials were run at q=1 and q=8 (256 each), with family bound 0.05. The searched matched detector fired 12/256 and 1/256, respectively; accepted front-end results were zero in both sets. Fixed-cell empirical second moments were 1.047 and 1.041 times their exact variance. These modest samples are compatible with the bound and do not validate extremely small false-alarm probabilities.

48 new low-SCNR signal trials (16 each at −30/−20/−10 dB) had **zero accepted acquisitions**. At −20 and −10 dB, all 16 matched filters detected a return while STF acquisition still failed. A detected matched-filter return is therefore not an end-to-end successful measurement. Exact destructive cancellation, unequal-range opposite-velocity mixtures, and aliased oscillator settings remain visible. A global multi-target Moose number is a mixed statistic; the range-Doppler channel map is the appropriate per-range observable. First-frame-only acquisition can also reject records with strong later frames.

## Selected experiment findings and interpretation

The regenerated Fig.8-selected two-frame velocity RMSEs are **0.08824045, 0.02842131, 0.01014312, and 0.002980484 m/s** at 10/20/30/40 dB, using 128 trials per point. All 128 are accepted at each point. The same-observation pooled-single-frame baseline is retained, but it uses STF lag-512 pairs, whereas the cross-frame method uses full preambles and a longer temporal separation. This does not establish an equal-integration-energy/time advantage.

Fig.10-selected STF and CEF have **identical range estimates in all 512 main rows** and RMSEs **4.95765, 4.51037, 4.44514, and 4.44514 mm** at 0/6/12/20 dB. The shared fractional-grid front end and this target/grid placement dominate these selected results. Do not draw a CEF superiority claim from them. The high-SCNR floor is a target-specific grid effect, not general millimeter ranging certification.

All 192 owner low-SCNR stress trials fail acceptance. The experiment's unconditional fields are explicitly **all diagnostic estimates**, including failed acquisitions; they are not successful-measurement accuracy. Accepted-only RMSE is null when none are accepted. Signed outliers, alias errors, and failure rows remain in the data. The main noise-only run has 11/1,024 matched false detections (1.0742%, exact 95% CI 0.5374–1.9139%) under a 5% family bound, with zero STF acquisitions.

The same-range resolution extension is also reproducible. Its long-CPI improvement assumes fixed range; the implied 0.131–0.135 m displacement exceeds a range bin. It is a mechanism demonstration under stop-and-hop assumptions, not a physically complete long-CPI vehicular receiver.

## Required acceptance boundary for any future port

Preserve input/fixture identity; physical modulation and fractional timing; actual waveform-derived complex samples; known-noise assumptions; full-record baseline pairing; the acquisition/detection distinction; all rejected diagnostic estimates, biases, aliases and sidelobes; and source-versus-reconstruction labels. An interactive port requires its own numerical equivalence tests against this freeze. This review does not pass an unbuilt port.

Still outside scope: complete communication PHY, beamforming/antenna gains, self-interference/clutter scenes beyond scalar Gaussian noise, range migration, independent noise estimation/CFAR, antenna/oscillator calibration, original 10,000-trial curves, exact original synchronizer settings, digitized figure matching, full paper reproduction, standards conformance, and measured hardware performance. Nothing in this audit upgrades those claims.
