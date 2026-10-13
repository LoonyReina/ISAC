# Independent numerical review: OFDM ICI receiver

## Decision

The final source-derived **bounded reference passes the numerical checks performed**. It runs actual MUSIC, APES/GLRT-OMP, joint original-observation refits, CFAR and literal CFO ambiguity correction. No unresolved arithmetic defect was found in the checked scope after two edge bugs were corrected by the implementation owner.

This is **not a reproduction of the paper’s original figures or a calibrated detector**. The unfavorable outcomes are real and must remain visible in teaching or demonstrations: missed targets, cross-angle duplicates, range ghosts, nominal versus achieved false-alarm distinctions, and budget-limited output. Passing the mathematics does not establish the paper’s favorable performance curves.

Source: [Keskin, Wymeersch and Koivunen, arXiv:2103.15694v1](https://arxiv.org/pdf/2103.15694v1), fixed PDF SHA-256 ec454aa4e6e270f780ee28772b37ebc8f213203f9bf121bbf82a53cdc97dd5b5. Source text fidelity was separately audited. This review independently examines numerical implementation and evidence integrity.

## Scope and reproducibility

All review files were created in this review directory. No owner source, results, repository, browser, or remote was modified. Every run used single-thread OpenBLAS/OMP/MKL. Source/core hashes were checked before inspection, then the owner’s corrected core was rechecked. The complete input/evidence manifest is review-manifest.json.

Final core: fee9e4a55707fe251f73bf343d0ac0142607d6c827cfd4e8bd0c974bba439cdb

- 21/21 independent grouped numerical/adversarial checks pass
- 16/16 owner unit regressions and 8/8 source-auditor regressions were independently rerun and pass
- All 95 saved full-stage arrays pass replay/definition checks, with zero unchecked arrays and verified manifest/archive/core identity
- 294 method-level metric records pass exhaustive one-to-one association, stored-error, miss and false-detection checks: 96 bounded trials plus the mechanism and source-dimension captures, three methods each
- All 39 bounded grouped/pooled method summaries agree with independently recomputed counts, FDR and conditional RMSE
- 56 controlled-diagnostic checks pass over 16 paired trials and 32 receiver executions, including complete output replay, paired inputs, known-X baselines, association and summaries

Primary commands, run from this review directory:

    OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python independent_numerics.py
    OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python metrics_and_false_positives.py
    OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python verify_saved_stages.py
    OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python verify_controlled_diagnostic.py

The last two scripts intentionally rerun their supporting checks. They do not write the implementation owner’s directory. Exact dependency versions are recorded in numerical-results.json. Runtime measurements here describe this cloud executor, not browser/UI performance.

## Independently derived checks

### Observation, conjugation and channel basis

The independent direct oscillator sum and explicit unitary DFT reproduce Eq. 10 for positive and negative Doppler, non-real gains, fractional delays, transmit beam gain, both ICI and ICI-free cases, and identical noise. The held mechanism observation also matches explicit dense reconstruction.

For Y with sample rows and receive-antenna columns, R = sum YᴴY has signal eigenvectors proportional to conjugated array steering. MUSIC must project a* onto the noise subspace. The tested sign is correct. With v = w*, the distortionless constraint is aᵀv = 1. The pilot matrix is Fᴴ diag(x) F_L, and unit-modulus symbols make its columns orthonormal; arbitrary-amplitude pilots use the same subspace through QR.

The independently constrained solver eliminates the aᵀv = 1 constraint using an SVD null basis, residualizes each symbol with an independently built pilot SVD, and solves the remaining free-coordinate least-squares problem. It does not call the production covariance profiler or constrained solve. Single- and multiple-CFO fits with QPSK and nonconstant-modulus symbols agree.

A separate 80-decimal-digit simultaneous KKT solve agrees to 8.9e-16 in objective and 1.1e-15 in channels. This is high-precision linear algebra on independently constructed double-precision matrix entries, not an 80-digit continuous waveform simulation.

### APES, GLRT and joint OMP

At fixed CFO, minimizing the channel coefficients leaves the orthogonal-pilot-null residual. Minimizing vᴴQv subject to aᵀv = 1 yields v = Q⁻¹a*/(aᵀQ⁻¹a*) and cost 1/(aᵀQ⁻¹a*). The grid search, selected continuous CFOs, profiled costs, normalized Eq. 65 statistic and unnormalized Eq. 49 statistic agree with separate least-squares oracles.

Every accepted support in the held capture was rebuilt from the ORIGINAL observation. All channels are jointly refitted; earlier coefficients are not frozen. The five accepted joint refits have maximum relative objective discrepancy below 9.3e-13, channel discrepancy below 2.0e-11, and normal-equation residual below 7.7e-11. Nested profiled objectives are nonincreasing. The full-cube residual energy need not be monotone because it is not the optimized objective.

The saved 95-array archive contains actual full observations, covariances, selected-CFO and joint beamformers, channel arrays, residuals and maps. These are not maps synthesized from detection coordinates. Independent dense Fourier maps and SVD-based intermediate checks agree; CFAR threshold/count arithmetic was separately verified.

### Delay/Doppler map, gain and ambiguity

Inverse frequency FFT and forward slow-time FFT reproduce bᴴGc, signed Doppler bins, and complex gain for both odd and even symbol counts. The score divided by NM returns the effective transmit-beam gain for APES. The conventional FFT route uses unnormalized receive summation: its on-angle gain includes an additional N_R factor. Absolute gain/map comparisons must label or remove that receive normalization.

The implemented ambiguity rule is the literal source Eq. 36. It passes both-sign, multiple-zone tests, and deliberately retains the known failure when CFO estimation crosses an alias-zone boundary. A nearest-alias repair was not substituted. Local CFO refinement is not a global optimality certificate; the bounded interval is much smaller than the formal fast-time principal interval.

### CFAR and model boundaries

CA-CFAR uses unique wrapped Doppler training cells and only valid delay support q = 0,...,L−1. It does not dilute training with structural zeros outside the recovered tap support. Independent cell enumeration, count, multiplier and threshold checks agree. A separate 40,000-window iid exponential test checks the nominal multiplier, not the adaptive receiver’s achieved false-alarm rate.

Integer delays inside retained support are exact. In the tested N=64,L=12 basis, q=4.37 has relative projection error 0.1691, and the CP endpoint q=16 has error 1.0 despite being CP-valid. Finite channel support is an additional restriction beyond the CP condition.

Duplicate CFOs, zero observations, and insufficient residual degrees of freedom remain explicit rank failures. All-one symbols produce a flat CFO objective: the API still returns an arbitrary minimizer and does not flag identifiability. Such symbols must not be presented as a working CFO-estimation example.

## Corrected defects

1. MUSIC discarded both included search endpoints when finding local peaks. A strong −40° target in a [−40°,40°] scan was replaced by a 5.134° sidelobe while unresolved_peak_count remained zero; the positive endpoint mirrored this failure. The owner added endpoint handling/flags. Both independent endpoint regressions now pass.
2. Config accepted M=1, but CFAR’s wrapped local neighbors included the CUT itself, rejecting every range peak. A 1e6-power CUT above threshold 198 was rejected. The owner deduplicated actual wrapped neighbors and excluded the CUT. The independent M=1 regression now passes.

Neither defect changes the reported mechanism or sweep outcomes. Original failure evidence is preserved in numerical-results-before-fixes.json. Initial core was edf3688586e76dccd5423cd3e49b4abad83f08d79db4e6ee966f924dbb8c9e5c; final core is pinned above.

## Fairness, truth separation and outcome retention

Inspection confirms targets enter the generator and evaluation, not receive/OMP initialization, stopping, search bounds or default MDL model order. Declared known-angle/CFO tests below are explicitly conditional operator diagnostics, not receiver benchmarks. The paired end-to-end diagnostic uses observed MUSIC candidates. The optional shared_music argument necessarily relies on the caller to provide a legitimate estimate.

The scientific conventional comparator removes the identical known X, rather than using the source’s printed omission as a deliberately weakened baseline. APES and conventional FFT share observation, X, candidate angles and search/CFAR support. The ICI-free counterfactual shares X, noise, angles and slow-time phase; only intra-symbol Doppler is removed. Adaptive spatial filtering and finite-channel modeling also differ between receiver families, so their comparison does not isolate only ICI handling.

One-to-one matching preserves duplicate detections as false, retains misses, and does not encode misses as zero error. FFT detection association uses ambiguous Doppler while APES requires unwrapped Doppler, as disclosed. Conditional velocity errors are physical errors, so FFT alias penalties remain large even when ambiguous detection association succeeds. Source-style V/(V+reference hits) and conventional V/(V+all hits) are kept separately; neither is per-cell Pfa.

### Verified outcomes

| Evidence | APES | Known-X FFT | ICI-free FFT |
|---|---:|---:|---:|
| Five-target mechanism: all-target hits / false | 4 / 1 | 1 / 1 | 1 / 1 |
| 96 bounded trials: reference hits / false | 96 / 198 | 8 / 64 | 85 / 151 |
| 96 bounded trials: all-target hits | 192 | 72 | 181 |
| Source-dimension capped capture: hits / false | 2 / 33 | 2 / 3 | 2 / 137 |

The mechanism retains the weak-target miss and the fourth spurious CFO on the −35° branch, which reaches its OMP cap. The source-dimension capture has Pmax=1 and reaches its cap in both angle branches; it is not a convergence result or a 100-realization source sweep.

Bounded APES source-style FDR is 198/(198+96)=0.67347. Its conventional pooled FDR is 198/(198+192)=0.50769. High detection probability cannot be presented without these false detections.

## Why many false detections persist

### Observed geometry

The 198 reduced APES false detections comprise 192 cross-angle duplicates at another target’s true delay, five other range detections near the correct Doppler, and one near-own-delay/wrong-Doppler detection. All 64 reduced conventional-FFT and all 151 reduced ICI-free false detections are cross-angle duplicates by this classification.

The source-dimension APES 33 false detections comprise two cross-angle duplicates, 27 other range detections near the true Doppler, and four others. Its ICI-free comparator’s 137 comprise two, 134 and one respectively. This geometric classification is evidence about outputs, not proof of a unique causal decomposition.

### Conditional operator mechanism

If two exact finite-tap targets share CFO, the null projector removes both temporal signal components. Q then contains projected noise rather than the other target’s interference covariance, so it cannot use that removed covariance to suppress the other angle. A paired exact-grid conditional operator check, with supplied angle/CFO and common X/noise, finds Q differs from projected-noise covariance by only 1.9e-14 relative. Interferer response is −6.10 dB. Changing the interferer CFO gives −76.68 dB in that diagnostic. This demonstrates the operator mechanism; it does not promise end-to-end detection improvement.

### Controlled end-to-end evidence, including contrary outcomes

The owner’s additional 16 paired trials were independently replayed in full. Candidate angles come from the same-CFO observation and are reused unchanged. X, noise, gains, delays, thresholds and association rules are identical. Only the second target CFO is shifted by +1.6, exactly two slow-time alias periods; its slow phases agree within 1.3e-14. These trials do not replace any unfavorable original result.

| Delay condition, eight pairs | Same-CFO APES hits / false | Distinct-CFO APES hits / false |
|---|---:|---:|
| Exact-grid | 8 of 16 / 8 | 16 of 16 / 16 |
| Fractional +0.3 | 16 of 16 / 16 | 16 of 16 / 0 |

Conventional FFT stays at 8 of 16 hits and eight false detections in all four cells. No controlled trial reaches an OMP cap. Distinct CFO helps weak-target recovery in the exact-grid example but INCREASES false detections; the fractional example removes its false detections. No monotonic false-positive benefit is established. Reusing observed angles also means this isolates the later receiver stages conditional on that candidate set.

### CFAR ridge sensitivity

A predeclared detector-geometry diagnostic constructs a strong Doppler-concentrated range ridge with a small modulation. With the existing 2D window, the interior threshold is approximately 0.81 times the ridge CUT and four local maxima are admitted. A Doppler ridge contributes to only a small fraction of training cells, so averaging over mostly low-power Doppler cells can make the threshold too low for the ridge. This is a distribution/model limitation, not a multiplier arithmetic bug. It is consistent with, but does not uniquely establish the origin of, the source-dimension range ghosts. No window or threshold was tuned to remove them.

### H0 evidence does not calibrate Pfa

The 64 held-out noise frames have zero full-pipeline detections and zero fixed-angle accepted CFOs. All 64 full-pipeline runs stop at MDL order zero. For zero events in 64 independent frames, the one-sided 95% binomial upper bound is 4.573% per frame. It does not certify 1e−4 per-cell CFAR, conditional recovery-stage calibration, or low false discovery under targets.

## Remaining limits and teaching gate

- No original-size full-OMP 100-trial sweep, source-curve digitization agreement, global CFO-search proof, or production false-alarm calibration
- Source-dimension evidence is explicitly Pmax=1; larger joint block allocations have different time/memory costs and were not benchmarked here
- Reduced N/M, changed physical velocities, sample-count gain, dwell, Doppler bin width and target-to-support-edge distances prevent treating the reduced sweep as dynamically equivalent to the original system
- Unspecified source peak picking, channel length, CFAR windows, grids and association choices remain declared operational choices
- Fractional-delay mismatch, literal alias-boundary failures, all-one-symbol non-identifiability, rank failures and caps remain substantive limitations
- No user-interface execution, fresh browser computation, communications BER, self-interference, field-data or deployment validation is included

A teaching interface may accurately demonstrate this bounded mathematical pipeline and its retained failures. It must identify frozen replay versus fresh computation, attach parameter and source/model labels, expose all detections and stop reasons, and avoid presenting perfect recovery, a universal ICI benefit, or original-paper figure reproduction.

## Pinned evidence hashes

### Audited source and implementation artifacts

- source-private.pdf: `ec454aa4e6e270f780ee28772b37ebc8f213203f9bf121bbf82a53cdc97dd5b5`
- ici_reference.py: `fee9e4a55707fe251f73bf343d0ac0142607d6c827cfd4e8bd0c974bba439cdb`
- test_reference.py: `8e6efca806b0f8564d8ca0e33619e998c1bd5143ad0def7b6504b3f7deaa05eb`
- run_experiments.py: `7aca10aa35196792116ac52d569fe924876a00f2e2387272e9d06a106eaddf88`
- review/SOURCE-AUDIT.md: `f8c535886778288977192f12c5c7f56ea384821a663bb1d60b04d3207345eecf`
- controlled_cfo_comparison.py: `4e50d0b73a87ee801ced6c64a261dfcb2d12917164ef56631cc6afd561aed4e1`
- results/mechanism.json: `530a9c992797b91bec2bbe783c27f7e391cf39f28a72b81e14ef517716b6388b`
- results/mechanism-input.npz: `9a3a2232cad34705d815df1a6c494a6a45e39b213c9610633b299337da0b1072`
- results/mechanism-full-stages.json: `9fcdc451f2c376addaeeb142d224545701d8d3f6cf064e7c600c14c625d7cbe2`
- results/mechanism-full-stages.npz: `4647b2c60afe89c7deb3cb997f2b6fbafe6db2a5a9709866692b42657702a831`
- results/bounded-tableII.json: `a668cd3c95a98aeaee63898617547430a7c8f742c3a52354a3f00e1499353649`
- results/original-dimension-capped-capture.json: `ca8375e03443ef9d7af01531a9f2a4e86fc0d6f2cec50295d7bd975ac24784d9`
- results/noise-only-holdout.json: `a68b03fef23436af8d6562b90701d650bed89844786892753969e2d7732d829d`
- results/controlled-cfo-comparison.json: `f7f1dc94ae9a3a7307b0b54962085463eadca517775e8f6bac0ce551be533865`

### Independent review artifacts

- independent_numerics.py: `3eb7c8faaa62e1385b4ef219129ed2c3025b2b72b1c77493bc4eb2ddbe8bd59c`
- metrics_and_false_positives.py: `c04e6a0df7ec87696b8375aca8f0a505a98b2acae4a40e6b6891026ec4c05401`
- verify_saved_stages.py: `601eeb8e448196d83733f78e6c2d82d3cefe298868e0ac4b7e824b8b6b9d3f5a`
- verify_controlled_diagnostic.py: `0d5c46806471769ad15d4137483665cc33493fab9e10ff6847174aeda6a3cb9f`
- numerical-results.json: `d63e3e6a29fb2ca6165cb575241a15cb2dcb0e43a0d3ca592d60dff459dc4033`
- numerical-results-before-fixes.json: `4ccf7fc3e9095ae94a4cf056eb760671240b43f51e5c97c8946d7541e300c32c`
- metrics-results.json: `d3a9241250b2d283b021e96ab8595392d34e2df4dde6b7d1afa2e6f43ab48258`
- saved-stage-results.json: `cfe1feeb5da4e0ee55decf92a3b155626f60d7a231be5e437c08bb5c066cef17`
- controlled-diagnostic-results.json: `b1003bcea6dafbd4085570d322c52b14aa0e3f5067a4a3ba5a6d5b7037f3d2be`
- owner-regression-run.log: `f14f4f146727eeee5e24284a0059016aa0aa2ab8edd4968694da0e3ee2bb4557`
- source-auditor-regression-run.log: `500548e87a8a6a658834d3567d7a9f78e1a46b715894c2ed9dbab534bae45c00`

The source PDF and extracted paper text are private review inputs, not included in this review deliverable.
