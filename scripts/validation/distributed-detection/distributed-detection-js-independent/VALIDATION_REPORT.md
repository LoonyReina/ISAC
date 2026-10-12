# Independent validation of the actual two-station JavaScript detection core

Date: 2026-10-11 UTC. Verdict: **PASS for the stated known-noise Gaussian teaching model.**

Audited module: `distributed-detection-core.js`

SHA-256: `955846d7e7361ad5b2d9f6ab8690d3a6579dc58d0d2634f523ab4b3ba63170c7`

This audit executed the actual exported JavaScript functions. Independent expectations came from a 100-decimal-digit scalar oracle, high-precision covariance inversion, direct full raw covariance calculations, explicit payload arithmetic, and independently generated random observations. The target file was unchanged throughout the final audit. No implementation files were edited by this validator.

## What passed

- 336 parameter/Pfa cases from the independent fixture corpus: thresholds, H0 calibration, joint and energy-sum Pd, stable miss probabilities, and log-likelihood thresholds
- 96 tail/CDF cases: equal, zero and nearly equal weights; high Pfa; small and large arguments; common weight scales from 10⁻¹⁰⁰ to 10¹⁰⁰
- 252 quadratic/likelihood cases: high-precision 2×2 covariance inversion, the separate cross-term matrix expression, common phase, consistently rotated station covariance, rank-one nullspace, tiny/large observations
- 16 raw-observation cases: full 2L×2L Gaussian densities, complex matched normalization, orthogonal residual perturbations, and waveform phase changes
- Identical-energy/opposite-phase counterexample and three numerical phase integrations of the energy-message likelihood
- 12 exact finite-run, bidirectional payload ledgers with per-block, once and cached templates, explicit model updates, and optional bit accounting
- 300,000 independently generated observations per hypothesis, passed through the actual JS decision functions
- 20,000 trials per hypothesis through the actual JS raw generator, checked for means, covariance, properness, normalization and absence of returned truth fields
- 8,192 QPSK waveform energy endpoint cases, covering every L=1…4096 at E=10⁻⁸ and E=10⁸; 63 additional waveform/noise normalization combinations
- 60 Wilson score intervals against an independent 100-digit expression, including exact zero-success/all-success bounds
- 226 input, object-branding and truth-separation checks, including sparse and inherited array entries, malformed dimensions, nonfinite values, wrong types, unsupported tiny positive ρ, forged model/calibration objects, unsafe integer payload counts, and ρ=0 tie randomization

The report has eleven substantive audit groups plus a target-file integrity check. Every group passed.

## Numerical results

At the exact binary64 inputs received by JavaScript, maximum measured errors were:

| Quantity | Maximum error |
|---|---:|
| Joint threshold, relative | 3.90×10⁻¹⁶ |
| Energy threshold, relative | 9.65×10⁻¹⁷ |
| H0 log-Pfa, relative | 7.61×10⁻¹⁶ |
| Joint Pd, absolute | 1.54×10⁻¹⁶ |
| Energy-sum Pd, absolute | 1.13×10⁻¹⁶ |
| Joint miss probability, relative | 6.98×10⁻¹⁶ |
| Energy-sum miss probability, relative | 6.68×10⁻¹⁶ |
| Direct log-tail, relative | 2.54×10⁻¹⁶ |
| Direct lower CDF, relative | 2.33×10⁻¹⁶ |
| Raw dense-covariance log likelihood, absolute | 1.02×10⁻¹⁴ |

The original fixture file records intended exact decimals. JavaScript receives rounded binary64 values. Near Pfa=0.999999999999, the small difference between those two inputs produces up to 2.2122×10⁻⁵ relative threshold difference from the *exact-decimal* fixture. That is input representation sensitivity, not the implementation error above. The audit retains the original fixtures and independently recomputes expectations using the exact binary values actually supplied.

For ρ=3, κ=0.75 and Pfa=0.05:

- Joint threshold ≈3.103538506508492
- Joint Pd ≈0.6433127617254235
- Energy-sum threshold ≈4.743864518390579
- Energy-sum Pd ≈0.6243193955523239

The κ=0 equivalence, κ=1 formula Pd=Pfa^(1/(1+2ρ)), ρ=0 randomized endpoint, and stable tiny-ρ calibration all passed. Distinct nearly equal weights are not snapped to equal weights.

The audit-only expanded matrix expression has last-bit cancellation near the κ=1 nullspace. In the tested nullspace example it returned values on the order of 10⁻¹⁵ while the positive-weight eigen runtime returned exactly zero. Matrix comparisons therefore use a scale-aware absolute tolerance near zero; the runtime retains its nonnegative eigen calculation.

## Independent Monte Carlo

Seed 843287; 300,000 trials per hypothesis. The audit uses its own xorshift32 uniform generator, Box–Muller complex normal draws and Cholesky correlated amplitude construction, then calls the actual exported JS decisions. This is separate from the module's Mulberry32 generator and its detector eigenbasis.

| Hypothesis / detector | Count | Observed rate | Analytic rate | 99% exact interval |
|---|---:|---:|---:|---|
| H0 / joint | 15,203 | 0.0506767 | 0.05 | [0.0496506, 0.0517170] |
| H0 / energy sum | 15,070 | 0.0502333 | 0.05 | [0.0492116, 0.0512694] |
| H1 / joint | 193,196 | 0.6439867 | 0.6433128 | [0.6417309, 0.6462378] |
| H1 / energy sum | 187,110 | 0.6237000 | 0.6243194 | [0.6214181, 0.6259780] |

Every target lies within its reported pointwise Clopper–Pearson interval. These are pointwise 99% intervals, not a simultaneous coverage claim. They do not empirically certify probabilities of 10⁻¹².

The actual raw generator used seed 453893 and 20,000 trials per hypothesis. Its covariance, pseudo-covariance and means were within 2.771 standard errors of the analytical values; the prespecified acceptance bound was six standard errors per component. No alpha, hypothesis or truth metadata was returned with the observations.

## Correct scientific interpretation

The model is yᵣ=αᵣs+nᵣ, with a fixed known waveform, known white complex-noise power, two calibrated station coordinates, and unknown random α with known proper Gaussian covariance. It examines one fixed detection candidate. The marginal H1 matched covariance is C=I+ρRκ, and the log likelihood is zᴴ(I−C⁻¹)z−log det C.

The full raw likelihood and the two complex matched outputs agree because orthogonal waveform residuals have the same independent noise distribution under both hypotheses. This is sufficient compression for this particular binary model. It is not lossless reconstruction of the samples, sufficiency for arbitrary later tasks, an unknown-noise result, or a whole-map false-alarm guarantee.

At ρ>0, κ=0 the energy sum realizes the same likelihood test. At ρ=3, κ=0.75, observations (√2,√2) and (√2,−√2) have identical local energies but joint statistics 3.36 and 12/7. They yield opposite joint decisions at Pfa=0.05. This establishes that energies do not generally recover the full complex likelihood; it does not establish that distributed computation itself loses information.

The optimal likelihood after only two energy messages generally contains a log I₀ term depending on the energy product. The audit reconstructed that likelihood by integrating the actual JS complex likelihood over 4,096 relative phases per example. Energy pairs (2,2) and (4,0), which have the same sum, have different energy-domain log likelihoods, approximately 0.30755159 and 0.14494561. Accordingly, the implemented energy sum is a specific baseline, not the optimal energy-domain algorithm; no optimal-energy ROC was computed.

Changing station coordinates requires changing covariance with them: C′₁₂=e^(i(θ₁−θ₂))C₁₂. This invariance passed. Rotating station data alone while keeping a correlated prior fixed changed the statistic in nondegenerate tests, as it should. Unknown station-phase drift is outside this calibrated model.

At ρ=0, both hypotheses coincide. The constant Q statistic needs an independent Uniform[0,1) tie draw to attain arbitrary specified Pfa, and then Pd=Pfa. The JS core rejects missing or invalid ties and uses strict U<Pfa. No software signature can establish that a caller's tie draw is statistically independent; that remains an explicit model requirement.

## Input and payload boundaries

The tested model domain is ρ∈{0}∪[10⁻¹⁰,10⁴], κ∈[0,1], Pfa∈[10⁻¹²,1−10⁻¹²], 1≤L≤4096, and E,σ²∈[10⁻⁸,10⁸]. Invalid tiny positive ρ values are rejected rather than silently replaced with zero. Observations are finite, dense [I,Q] pairs. Models and calibrations are frozen and branded; copying or inheriting their fields does not create a valid detector object. Direct fake truth getters attached to observations were not read by the detectors.

The generated QPSK helper can move its amplitude one representable step inward when square/root roundoff would put the generated energy outside an inclusive endpoint. This was verified across all lengths. It does not clip supplied waveforms or observed data.

The ledger counts real-number payloads for two receivers and star unicast. It includes explicitly chosen template refresh/caching and optional model downlink. The center is assumed to already have its waveform/model. Historical cached acquisition, packet overhead, synchronization, computation, RF chains, latency, energy and topology effects are not inferred. Multiplying by bits per real does not simulate quantization or establish finite-bit losslessness.

## Source and verification limits

This is an independent marginalized Gaussian LRT, not a reproduction of the maximization-based MAPRT in the motivating [Behdad et al. fixed arXiv v2](https://arxiv.org/abs/2305.12523v2). It does not claim that the correlated example reproduces that paper's numerical setup. The separate distributed-versus-centralized paper remains motivation only where stable full-text provenance was unresolved in the research handoff; no equation, resource formula or original curve from it is certified here.

This audit validates the actual JS numerical core and its tested contract, not the page layout, accessibility, browser event flow, deployment, original-paper algorithm, or hardware. The deterministic grid is finite, and no claim is made about every binary64 input or arbitrary adversarial JavaScript object behavior. Re-run this package whenever the core digest changes.
