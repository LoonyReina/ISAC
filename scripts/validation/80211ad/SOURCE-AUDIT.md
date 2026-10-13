# Fixed-source audit and bounded execution contract

Source: Kumari, Choi, González-Prelcic and Heath, *IEEE 802.11ad-Based Radar: An Approach to Joint Vehicular Communication-Radar System*, arXiv:1702.05833v1, 2017-02-20, https://arxiv.org/pdf/1702.05833v1. The 35-page PDF was retrieved on 2026-10-12 and independently SHA-256 checked as `c16755b358bfe4152fea3bba5bc54c05370a0d8491aa481a73816bb12447e8b8`. Numbering below is v1 only, not the later journal version. Original PDFs and text extraction are temporary audit inputs and are not distributed.

## Scope chosen before implementation

Execute the specified SC preamble rather than the site's old isolated generic Golay pair. Generate received pulse-shaped, fractional-delay, Doppler-modulated noisy records; estimate timing and frequency from those records; run source STF/CEF correlators and multi-frame Moose and channel/DFT processing. Select reduced Monte Carlo counterparts of Fig.8 (single/double-frame velocity) and Fig.10 (STF/CEF amplitude timing), plus the finite-CPI multi-target construction of Figs.13–14. Also calibrate detection on noise-only observations and preserve all failed acquisitions, missed detections, grid errors, ambiguity and sidelobes.

This is a simulation-only selected-algorithm reference with explicit deviations. It is not a reproduction of all paper figures, a standard-compliance certification, a communication PHY implementation, a road test, or measured RF data. The receiver may not read simulator target parameters. Source figures use 10,000 Monte Carlo trials; our smaller trial count and uncertainty must be disclosed. No claim of matching digitized original curve points is made.

## Equation and implementation crosswalk

| Source | Contract |
|---|---|
| §II-A, Figs.1–2 | SC STF has 16 Ga128 copies and one inverted Ga128, length 2176; CEF is Gu512, Gv512, then −Gb128, length1152. Total3328. Gu=[−Gb,−Ga,+Gb,−Ga], Gv=[−Gb,+Ga,−Gb,−Ga]. Normative base sequence ordering has a separate primary-source audit. |
| Eq.(1), §III-A | Unit-energy RRC TX/RX pulse filters, rolloff0.25; 1.76Gchip/s. 2.16GHz channel width is not chip rate. Pulse support and oversampling are reproduction choices because v1 does not fix them. |
| Eq.(6), (10), (11), (13) | Monostatic R=cτ/2; positive complex exponential exp(+j2πf_Dt), with positive v defined toward the radar so f_D=2v/λ. Stop-and-hop fixed delay and constant coefficient during CPI. Clutter+noise represented by circular Gaussian noise. |
| Eq.(14), (15) | Trailing normalized STF autocorrelation, lag128, window128, threshold sqrt(1/8), require128 consecutive passes. Raw first crossing is a coarse index, not an exact frame origin. |
| §IV-A symbol synchronization | v1 cites energy-based fractional timing but omits oversampling factor and complete implementation. Our finite-grid energy maximization must be labeled an explicit receiver choice. |
| §IV-A CFO | v1 assumes perfect carrier-offset compensation. We actually estimate combined Doppler+CFO from repeated STF and use it for within-frame timing/channel refinement, preserving original observations for Doppler. Unknown oscillator offset is inseparable from target Doppler without another reference. |
| Eq.(16), (17) | Correlate16 repeated Ga128 chips (2048 chips) and choose peak. Compare CEF on the exact same noisy observation and timing phase; declare unequal integration gain (2048 vs1024). |
| Eq.(18), (19) | 1/1024 normalized complex sum of two512-chip correlations, retaining surrounding inverted128-chip blocks. Never claim isolated Gu/Gv aperiodic complementarity. Extraction-coordinate offsets must be stated; centered local lags within±128 preserve cyclic extension. |
| Eq.(20) | Printed negative Doppler phase conflicts with Eq.(13)'s positive phase and Eq.(18). Use Eq.(13)'s declared positive convention and verify sign from simulated waveform; do not silently reverse velocity. |
| Eq.(21), (28) | Exponential known-output-noise threshold. Distinguish fixed test cell from maximum over searched cells; a searched detector needs a familywise threshold or independent calibration. Input sample variance is not the normalized matched-filter output variance. |
| Eq.(23), (24) | Correlate identical training positions across frames, or STF positions512 chips apart within each frame; only valid index pairs are used. Printed upper bound includes an unavailable extra frame if read literally. Use M−1 adjacent frame pairs. P=2048 is source STF observation length; only1536 single-frame lag512 pairs fit within it. |
| Eq.(25), (26), AppendixA | Report paper asymptotic formulas separately from exact finite-time Fisher information. Eq.(26) is a large-M approximation and cannot be silently treated as the exact M=2 bound. |
| Eq.(27), Remark3 | Moose principal interval±1/(2Δt); finite observation resolution1/(MΔt); FFT zero padding changes grid spacing, not resolution. |
| §IV-C, Figs.13–14 | Run per-frame CEF channel correlation followed by slow-time DFT; no synthetic peaks or truth-populated map. |
| Eq.(29) | Printed factor MK_CD T_s/T is dimensionless. Do not label its literal product with log2(1+SNR) bps. Communication throughput is outside this milestone. |

## Unresolved original settings and conflicting descriptions

- v1 does not give fractional-timing oversampling factor, RRC FIR support, seeds, actual preamble detector search/gating convention, CFO compensation implementation, or exact CEF extraction buffer offsets. Its cited synchronizers are distinct algorithms; a reference implementation choice must not be described as the original authors' code.
- v1 Fig.8 sets single frame STF P=2048, lag512; double frame P=3328, separation K=41285. Those have different integration energy/time. Add a same-observation pooled-single-frame baseline, and disclose remaining use-of-samples differences. These are not equal-resource transmitter comparisons.
- v1 Fig.10 uses range50m, speed20m/s and source SCNR0–22dB. The fractional true delay is not an integer chip and may not be rounded before waveform generation.
- v1 multi-target setup has recipient range14.32m, speed30m/s and a target separated by4.26m/30m/s; final discussion and figure14 imply the second target is nearer (approximately10.06m). It also prints a confusing angle difference(100°,90°). Use explicitly chosen ranges10.06/14.32m and speeds60/30m/s, disclose direct scalar gains and omitted antenna response. Never infer a uniquely specified angle gain from this text.
- v1 multi-target CPI128000 chips, M=10 implies K=12800 and T=72.727µs at1.76Gchip/s. Doppler bin is13750Hz, not the printed13750kHz. Its34.375m/s arithmetic uses c≈3e8 and60GHz. Use c=299792458m/s and report the resulting34.351m/s. Do not treat1000× zero padding as improved resolution.
- Source uses8×2 UPA, RCS10dBsm, and link-budget assumptions. Scalar post-beamforming SCNR simulations do not reproduce that array, EIRP, clutter scene, self-interference cancellation, beam training, MAC, data modulation or measured range claims.
