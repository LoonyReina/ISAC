# Conditional uplink receiver: numerical contract

Status: independently accepted bounded interpreted numerical model, 2026-10-13. Final reference SHA-256: `c83ba035ee49d8011c2b3b8f5f0260b7e95fd2fb562781f03e63a1ea7407ddce`. This is not a reproduction of Figures 11–12, the complete sensing/prediction chain, or the whole paper.

## Fixed source

Weijie Yuan et al., *Integrated Sensing and Communication-assisted Orthogonal Time Frequency Space Transmission for Vehicular Networks*, arXiv:2105.03125v2, 11 May 2021. Original PDF: https://arxiv.org/pdf/2105.03125v2 . Local source/2105.03125v2.pdf SHA-256: `57e8c349ee32452bd53d42625da4295c6e4014ca1c2e52bb17584fea40ce1f98`. Equation numbers below refer only to this PDF. No official implementation is assumed.

## Observable model and permitted inputs

Index a frame by r=(k,l) in Z_N × Z_M; k is Doppler and l delay. The unitary ISFFT/SFFT definitions and dimensions give integer k_p=ν_p N T and l_p=τ_p M Δf. Distinct supports s_p are declared externally available predicted support. They are not estimated from the simulated truth. Correct-support and deliberately one-bin-mismatched experiments are separate.

Use a single effective post-combining coefficient a_p = sqrt(N_r) κ_p h_p exp(-j2πν_pτ_p). The physical combining scale is absorbed into a declared statistical effective-gain law; no separate array gain is claimed. The coherent raw model is

y[r] = sum_p a_p x[r−s_p] + n[r], n[r] iid CN(0,N0), E|n|²=N0.

Circular indices are used in both coordinates. A known pilot replaces one data cell q: x[q]=xpl, |xpl|²=Ep; all other cells independently carry equiprobable real BPSK ±sqrt(Es). No guard cells. Frame energy is (NM−1)Es+Ep. The pilot is neither additional data nor zero-cost. All path phases remain inside a; no impossible global path-dependent derotation is applied to y.

The receiver receives only raw y, declared predicted supports, q/xpl, Es/N0, declared gain-prior powers λ_p, and iteration settings. The simulation draws true a_p independently CN(0,λ_p). The true a, x and physical support are held by the evaluator only. Supplied-perfect-CSI is an explicitly extra-information oracle. A one-bin support mismatch is passed unchanged to the estimator and graph; it is never repaired from truth.

## Pilot estimation and exact diagnostic covariance

For distinct, correct support, a_hat[p]=y[q+s_p]/xpl. Define data vector d excluding the pilot and

B[p,t] = (1/xpl) sum_{j≠p: t=q+s_p−s_j} a_j.

Then e=a_hat−a = B d + n_arrivals/xpl. Conditional on fixed true a:

- E[e]=0
- C_e=E[e eᴴ]=Es B Bᴴ+(N0/Ep)I
- P_e=E[e eᵀ]=Es B Bᵀ (real BPSK can make the error improper)
- E[e dᵀ]=Es B
- Var(e_p)=(Es sum_{j≠p}|a_j|²+N0)/Ep

The diagonal formula assumes distinct supports; shared contamination cells can create off-diagonal covariance. The arrival-noise covariance becomes an arrival-coincidence matrix if supports repeat. Repeated supports identify only their summed effective coefficient: aggregate before estimation/graph construction, or reject as individually unidentifiable. Zero/weak gains remain legal.

The conditional covariance above is an evaluation diagnostic, never receiver input. The receiver uses the declared statistical marginal variance v_p=(Es sum_{j≠p}λ_j+N0)/Ep. This is an exact prior-averaged second moment under the stated law, but it does not make the posterior error independent of a_hat, d or the current y. Because a_hat is computed from y itself, p(x|y,a_hat(y))=p(x|y). A detector treating a_hat as independent side information can double-use current evidence. We preserve this limitation rather than claim an exact posterior.

## Source crosswalk: literal versus justified interpretation

| PDF | Literal issue | Implemented policy |
|---|---|---|
| 19 | Both symbol coordinates begin with k; k=ν/(NT), l=τ/(MΔf) have wrong dimensions | Use x[(k−k_p)_N,(l−l_p)_M] and k_p=νNT,l_p=τMΔf; impulse and transform tests |
| 19,40,47 | sqrt(N_r) and κ/phase are inconsistent between equations; Eq.40 directly estimates received effective coefficient | Model/estimate effective a; absorb scale/phase explicitly, no global derotation |
| 42 | (P Es+N0)/Ep ignores P−1 interferers and their powers; fails P=1 | Preserve literal output; corrected second moment derived above, receiver uses λ only |
| 45 | Missing evidence normalizer | Read proportionality, normalize probabilities |
| 49,52 | 49 excludes destination correctly; 52 uses target X[p] mean inside interferer p′ sum | Repaired mode uses each interferer mean m_j; diagnostic preserves target-mean literal |
| 50→52/53 | A finite constellation mixture is not generally Gaussian | Name the replacement a Gaussian moment approximation; exact local mixture and tiny posterior tests expose gap |
| 57 | Entire bracket has outer Es: Es[σ_p²+(|κ_p′hhat_p′|²+σ_p²)V_p′]; target p variance repeated; target gain uncertainty absent | Literal operational diagnostic retains it. Repaired mode follows Eq.56: |a_hat_j|²Var(X_j)+v_j E|X_j|² for each interferer and v_p|χ|² for candidate target |
| 58/59 | Denominator printed sum_q p_q is self-referential | Product over incoming messages normalized by sum over candidate products; implemented log-domain |

## Explicit detector definitions

1. `moment_repaired`: an audited-moment, diagonal independent-error surrogate derived from the source graph. With cavity mean m_j, symbol variance t_j, and second moment u_j, residual mean for target p is μ_-p=sum_{j≠p}a_hat_j m_j. For candidate χ, V_pχ=N0+sum_{j≠p}(|a_hat_j|² t_j+v_j u_j)+v_p|χ|². Message ∝ exp(-|y−μ_-p−a_hat_pχ|²/V_pχ)/V_pχ. A pilot neighbor has m=xpl,t=0,u=Ep. BPSK data have u=Es. This accounts for proper-complex marginal variances only; it ignores cross-path covariance, pseudo-covariance, and same-frame dependence.
2. `ignored_uncertainty`: identical raw y, a_hat, graph, initialization, damping and stopping, but v=0. This is the only clean same-y uncertainty ablation.
3. `literal_operational`: preserve Eq.42, the target-mean Eq.52 index and exact outer-Es Eq.57 parentheses. Repair Eq.59 only so it is executable. The invalid literal normalization itself is retained as an explicit non-executable defect. This is a diagnostic, not a endorsed detector.
4. `supplied_perfect_csi`: same raw y, physical true support and effective a, v=0. Extra information is explicit. Its large graph still uses approximate Gaussian messages, not exact ML/MAP.

All modes operate in the observation domain, algebraically avoiding division by a_hat. This preserves the repaired likelihood at zero gain. Flooding iterations, probability-domain damping, fixed tolerance/cap are declared choices. Convergence of messages/decisions is not decoding correctness. Caps and failures remain in the result denominators.

## Exact tests and bounded experiment

- Independent exhaustive BPSK contamination enumeration (≤12 unknown bits), covariance/pseudo-covariance/cross-covariance, P=1, uneven complex gains, duplicated/zero/weak gains
- Tiny exact known-gain posterior and independent Eq.50 local mixture; tree/single-path exactness and explicit loopy/moment-approximation discrepancies
- Tiny exact physical unknown-gain posterior integrates CN(0,diag λ) gains for each word: y|x ~ CN(0,A_x diag(λ) A_xᴴ+N0 I). This uses y once and includes the pilot
- Zero uncertainty must reduce repaired mode to ignored mode exactly; initialization, damping and y are identical
- Main declared compute cap: 120 independent frames per condition; N=M=16,P=3, supports [(0,0),(1,2),(-2,4)], λ=[0.6,0.3,0.1], pilot/data power ratio 100 (20 dB), nominal SNR 7/11/15 dB, max 40 iterations, damping 0.5, tolerance 1e-7. Independent channels, bits and noise each frame; common draws across receiver variants and normalized frame variants
- Source-style Es=1, Ep=100 and separate equal-frame-energy normalization Es=NM/(NM−1+100), Ep=100Es; both use N0=10^(−SNR/10), so the equal-budget run really changes transmit energy instead of silently re-normalizing its noise. No guarded method is in this first comparison; therefore normalizations do not claim overhead superiority
- Primary comparison: paired frame BER difference (repaired−ignored), paired frame bootstrap 95% interval with 2,000 resamples. Also errors/bits, FER, mean correctly decoded payload bits/frame, gain NMSE, convergence/caps, entropy and run time. Zero observed FER has exact one-sided binomial 95% upper bound; zero BER uses that conservative frame bound, not an invalid independent-bit bound

## Open gates and missing settings

Sensing-derived support prediction, physical receive combining, fractional delay/Doppler and practical pulses, coding, source-size curves, guarded-reference mask/threshold, OFDM waveform/MMSE, downlink, browser implementation/lifecycle, and full-paper reproduction remain open. The source does not fix all tap-power laws, noise/SNR reference planes, integer rounding, damping, schedule, stop thresholds, or Monte Carlo size; this reference declares its own choices. No tuning to printed curves and no guaranteed BER benefit are assumed.

## Independent fixture result and retained counterexample

The separately derived fixture in source/independent-fixtures.json uses N=M=3, three equally spaced support shifts, eight real BPSK data bits and complex pilot 3+4j. It deliberately shares contaminating symbols among gain estimates. The full covariance diagonals are [0.02865,0.03838,0.05371], versus literal Eq.42 scalar 0.0892. Full covariance, pseudo-covariance and error/data cross-covariance agree exactly between the implementation and the independently frozen fixture. The independently marginalized unknown-gain posterior agrees within 7e-15.

On the same fixture, the estimated-gain moment surrogate converges yet differs from the true physical-model marginal by 0.499913 for one bit; mean exact-to-approximate Bernoulli KL is 0.144596 nats. This is retained as a counterexample to interpreting convergence or independent-error marginal variances as exact posterior correctness. The exact Eq.50 local factor mixture also differs from its Gaussian approximation by 0.011591 in the independent fixture. The original Eq.46 product factors are exact conditional on true fixed gains, but generally not after marginalizing shared uncertain gains.

For P=1, plugging a_hat=a+n_p/xpl into another observation yields residual noise n_r−(n_p/xpl)x_r; different data residuals share the pilot noise, and the pilot-arrival residual itself is exactly zero. Adding a diagonal target variance is only a surrogate approximation. Gain draws are independent complex Gaussians with declared population powers; no sample-by-sample unit-norm normalization is applied.


## Final acceptance and archive integrity

The independent reviewer accepted the final bounded interpreted core and all 5,760 receiver records. Eighteen independent scalar-loop message comparisons agree within 5.55e-16; all four previously failing API validation checks now reject as required. Every raw condition/frame observation was independently rebuilt (maximum difference 8.88e-16); energy, payload, gain estimates, variance inputs, error counts, caps and paired observations were checked. The local replay independently confirms 48 complete probability/history replays exactly and checks all 5,760 records. Twelve unit tests pass. The API-hardening rerun has identical scientific results to the retained initial finite-input sweep. See independent-audit/REVIEW.md, results/replay-validation.json and MANIFEST.json. Acceptance covers this scoped numerical evidence only.
