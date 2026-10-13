# Fixed-source audit and scope

## Identity and access

- Yifeng Xiong, Fan Liu, Yuanhao Cui, Weijie Yuan, Tony Xiao Han, Giuseppe Caire
- *On the Fundamental Tradeoff of Integrated Sensing and Communications Under Gaussian Channels*
- Fixed version: arXiv:2204.06938v8, submitted 2023-06-07 02:52:03 UTC; initial submission 2022-04-14
- [Version record](https://arxiv.org/abs/2204.06938v8), [HTML](https://arxiv.org/html/2204.06938v8), [official PDF](https://arxiv.org/pdf/2204.06938v8)
- PDF inspected locally, including rendered pp. 13, 14 and 17. SHA-256: `8bfc316c0faf57c42a8cf2395a1bce594a9f987750f37287680fdb9e190dc342` (1,295,124 bytes)
- HTML SHA-256 at access: `565825aebb9c3d0a91dbb7598df9d60afa2883300d17d566ec016e8336bec656`
- Access audit date: 2026-10-12 UTC. Temporary source copies are outside this deliverable. No paper text/PDF/images, author code, or third-party source repository is redistributed. No new agreement was accepted.

## What is reproduced

This is a bounded numerical reference for the matrix-response estimation specialization in §V-B. It implements the convex covariance-shaping problem (48), conditional Bayesian matrix error (95), Gaussian-input rate and averaged sensing error (110), and the deterministic-covariance outer pair (112). It also evaluates the explicitly asymptotic semi-unitary expressions (56)–(57) and (111), without presenting them as exact finite-SNR mutual information.

The selected named numerical comparison is Fig. 4: finite-dimensional isotropic complex-Wishart inverse-trace averages versus the printed Marchenko–Pastur approximation (100), with M=Ns in {2,4,6}, T=4M, sensing noise variance 1, covariance I, and prior precision swept from 0.01 to 100. Grid spacing and random sample counts are reference choices because the paper does not specify them.

A second, bounded Fig. 10 configuration audit computes the vector CRB–rate bounds at M=Nc=Ns=4, T=16, iid Hc entries CN(0,1/M), independent Hs entries CN(0,1), and the two explicit interpretations of the printed 24 dB power. It is not a digitized-curve reproduction or a claim that the exact distribution-optimized region was solved.

## Equation-to-implementation crosswalk

| Source | Operational meaning | Implementation / test |
|---|---|---|
| (2)–(4) | Yc=HcX+Zc; Ys=HsX+Zs; R=XXᴴ/T; expected trace M·PT; conditional MI/T | Model, sample_covariance, gaussian_rate |
| (6)–(7), (11) | Invert the conditional information first, then average over known waveform X | conditional_crb; crb_from_waveforms |
| (14), (96)–(97) | Isotropic matrix-estimation optimum has sample covariance PT·I, if T≥M | minimum_crb, semiunitary_waveforms |
| (41)–(42) | Fixed sample covariance with random Stiefel modulation versus iid Gaussian symbols with fixed ensemble covariance | separate waveform generators and energy tests |
| (48)–(50) | Convex sensing-minus-rate covariance shaping; Jensen/entropy outer pair | covariance_shape; global supporting-hyperplane gap |
| (51)–(57) | Input-law-dependent achievable pairs; semi-unitary rate is high-SNR asymptotic | Gaussian rate/CRB; asymptotic rate separately flagged |
| (92), (94)–(95) | Entire complex response matrix, represented by 2MNs real parameters | real_bfim; posterior_mean; independent real-likelihood check |
| (99)–(100), Fig. 4 | Finite Wishart expectation and isotropic large-system approximation | isotropic_gaussian_crb; mp_resolvent |
| (101) | Printed componentwise general-covariance approximation | printed_mp101, retained as diagnostic, not a certified bound |
| (103) | Unregularized finite complex-Wishart inverse mean, T>M and full rank | analytic endpoint test |
| (110)–(112), Fig. 10 | Gaussian inner pair, semi-unitary asymptotic pair and covariance outer pair | seeded fading sweep, per-channel and finite-waveform records |

## Preserved source conflicts and operational choices

1. **Optimization sign.** Rendered PDF p. 14 Eq. (109) minimizes inverse trace plus α times log determinant, with α≥0. Eq. (48) instead uses a minus-rate term and is convex. The plus sign would penalize both error and information, so it does not generate the stated favorable tradeoff. This reference implements (48), not a silently edited (109). A literal-plus counterexample is retained in numerical evidence.
2. **Real prior normalization.** Rendered PDF p. 13 states JP=σp⁻²I immediately after specifying complex variance σp², but (94) uses 2σs²/(Tσp²), and (95) yields the correct complex posterior error. Under the stated proper-complex convention, each real component has variance σp²/2, and direct likelihood differentiation gives JP=2σp⁻²I. Operational code derives the real FIM and independently checks it against (95). Literal-line and operational factors are recorded separately.
3. **Power notation.** The general model’s Eq. (3) uses expected trace M·PT. Table II uses lowercase Pt/σ²=24 dB without an explicit conversion to PT. Both Pper-antenna=10^(24/10) and Ptotal=10^(24/10), Pper-antenna=Ptotal/M are evaluated. The plotted Fig. 10 scale is compatible with the total-power interpretation; this visual consistency is an inference, not an author-confirmed convention or tuning criterion.
4. **Wishart scaling.** The sample covariance is XXᴴ/T. Although the surrounding text calls it CW(Σ,T), Eq. (103) includes the T/(T−M) factor, establishing that the normalized sample covariance, not the unnormalized Wishart sum, is required operationally.
5. **General covariance approximation.** Eq. (101) inserts each population eigenvalue separately into the isotropic MP formula. It is retained literally. Its general validity is not assumed: the second spectral moment from independent complex-Gaussian moments is tr(Σ²)+(trΣ)²/T; the componentwise prescription gives (1+M/T)tr(Σ²). These differ for unequal eigenvalues, so the componentwise construction is not the general population-covariance spectral law. This observation alone does not disprove every source asymptotic path: with fixed prior/noise, z scales as 1/T, and the unregularized inverse first moment agrees. Accordingly (101) remains an uncertified general-covariance approximation here, not a universally rejected asymptotic statement. The finite scalar/isotropic integrations, not (101), validate the sensing calculations.
6. **High-SNR rate forms.** Eq. (56) uses the determinant over nonzero signal eigenvalues, while (111a) places an identity inside the determinant. Both carry an unspecified O(σc²) term. The code records both leading expressions and their difference. Neither is relabeled as an exact finite-SNR inner-bound certificate. All logarithms, including c0, are consistently converted from nats to bits.
7. **Finite rank.** Eq. (97)’s full-rank sample covariance requires T≥M. A proper Gaussian prior keeps (95) finite with rank-deficient X; an improper-prior unexcited direction has infinite error. The unregularized Gaussian inverse mean additionally needs T>M. These are separately enforced.

8. **Real-coordinate transform.** Rendered Eq. (93)'s printed 2×2 factor maps [h;h*] to [Re h;−Im h], whereas (92) names +Im h. For M=Ns=2, directly evaluating the printed conjugations/block ordering of (94) can give nonzero imaginary entries, inconsistent with a real-parameter Fisher matrix. The independently derived real likelihood is therefore the operational full BFIM. Only the independently checked inverse-trace formula (95) is retained from this passage. An external numerical reviewer separately verified full posterior/Hessian agreement and recorded this source inconsistency.

## Assumptions retained

- Complex discrete-time block model. T counts complex channel uses, not independent Monte Carlo trials; rate is bits per complex use, error is the sum of complex coefficient squared errors, or divided by MNs when labeled normalized
- No conversion to bits per real use, range/angle units, physical bandwidth, aperture, or RF energy is implied
- X is known perfectly at the sensing receiver and unknown as data at the communication receiver; the fading covariance design has instantaneous Hc knowledge, as required by source (48)
- Sensing target and communication channel are statistically independent; priors/noises are proper complex Gaussian and independent; no nonlinear angle nuisance parameter is silently inserted
- Gaussian signaling has the same expected power as semi-unitary signaling but fluctuating block energy; blocks are never normalized after generation
- A deterministic waveform with the same covariance has zero data rate. Randomness on a fixed-covariance Stiefel manifold can carry data; fixed covariance does not mean a deterministic transmitted waveform
- Bayesian bound and estimator error are separate outputs. In this linear proper-Gaussian specialization the conditional posterior covariance makes (95) exact Bayes MMSE; finite Monte Carlo estimator MSE still has sampling uncertainty. The estimator receives Y, X and model variances, never truth
- Per-realization channel covariance power is constrained to M·PT. This does not introduce an across-fading power-allocation policy

## What remains unclaimed

No full-paper reproduction; no exact functional optimization over arbitrary p(X); no finite-SNR general-MIMO Stiefel mutual-information evaluator; no finite-length code or communication decoder; no angle-estimation figures; no rank-one Fig. 11 null-space completion reproduction; no pilot/CSI acquisition overhead; no hardware or measured-data validation; no browser/UI or runtime-latency claim.

The source does not provide exact random seeds, sample sizes, covariance-weight grid, numerical solver tolerances, quadrature rules, or tabulated figure data. These are explicit reference settings. An independent reviewer must still check the frozen package before integration.
