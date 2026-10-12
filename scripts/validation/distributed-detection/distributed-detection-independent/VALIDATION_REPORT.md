# Independent validation: two-receiver detection/compression lesson

Date: 2026-10-11 UTC. Result: **PASS for the stated independent Gaussian teaching model.** No repository edits, implementation in the website, browser UI, publication, or paper-detector reproduction was performed.

Audited reference: `scripts/distributed-detection-reference/detection_reference.py`, SHA-256 `4c3594b498431ba33f638b5c3be9811691e48231396a903dcbc1e906fcde2f0b`.

## 1. Mathematical verdict and scope

The assumptions must stay visible: a fixed known nonzero waveform, known noise variance, two calibrated complex receiver coordinates, independent proper white receiver noise, and an unknown random reflection vector α with a **known distribution** CN(0,qRκ). A generator sample of α is never detector information. The detection probability averages over α and receiver noise. It is a single prespecified hypothesis/location; no localization, unknown-noise adaptation, or search-wide false-alarm guarantee follows.

Let u=s/√E and extend u to a unitary time-domain basis [u,V]. Each normalized receiver block decomposes into zᵣ=uᴴyᵣ/σ and wᵣ=Vᴴyᵣ/σ. Both hypotheses have the same independent wᵣ∼CN(0,I). Under H1 the signal appears only in zᵣ because Vᴴs=0. Thus the full likelihood ratio factors through the two complex matched outputs exactly. This is an observation-level sufficiency statement for this binary model, not lossless reconstruction of raw samples or universal sufficiency for later tasks. Unknown σ² would change the argument.

With C=I+ρRκ, the marginalized Gaussian log likelihood ratio is

log Λ(z) = zᴴ(I−C⁻¹)z − log det C.

The conjugations, sign, complex-noise normalization, and covariance eigenvalues are correct. For z±=(z₁±z₂)/√2, b±=ρ(1±κ) and a±=b±/(1+b±), Q=a₊|z₊|²+a₋|z₋|². Under H0 its exponential weights are (a₊,a₋); under H1 they are (b₊,b₋). The proposed energy-sum baseline has weights (1,1) and (1+b₊,1+b₋).

At κ=0, Q=[ρ/(1+ρ)](e₁+e₂): two local energies retain the binary detection likelihood. At ρ=3,κ=.75 the energy-identical observations (√2,√2) and (√2,−√2) yield Q=3.36 and 12/7. With Pfa=.05 they fall on opposite sides of the joint threshold. This proves that the two energies cannot in general recover the full complex-data likelihood. It does **not** establish that local processing itself is inferior: locally calculated complex matched outputs are sufficient.

## 2. Essential correction: distinguish energy sum from optimal energy-message fusion

Let eᵣ=|zᵣ|², d=1+ρ, c=ρκ and D=d²−c²=(1+b₊)(1+b₋). Integrating over the unavailable relative phase gives

log Λ_E(e₁,e₂) = −log D + (1−d/D)(e₁+e₂) + log I₀(2c√(e₁e₂)/D).

The Bessel term depends on the energy product when c>0. Consequently, **a Pd difference between the joint detector and the simple energy sum is not the performance loss of the optimal detector using two energy messages**. For example, at ρ=3,κ=.75, energy pairs (2,2) and (4,0) have the same sum but log Λ_E≈.30755159 and .14494561. The independent tests also reproduce this formula by integrating the complex-data likelihood over relative phase. No optimal-energy-only ROC has been computed here.

## 3. Limits, calibration, and numerical audit

The unequal, equal-positive, and one-zero exponential tail formulas are correct. The reference handles nearly equal weights without snapping the model and solves a normalized log-survival equation, including Pfa close to one. At κ=1 the minus signal eigenvalue is zero; the noise covariance is still positive definite. At ρ=0 the hypotheses coincide and Q is constant, so exact arbitrary Pfa for this Q-based detector needs an independent randomized tie decision; it then has Pd=Pfa. The energy-sum noise statistic can itself produce a nontrivial test at that endpoint, also with Pd=Pfa.

Declared domain checked: ρ∈{0}∪[10⁻¹⁰,10⁴], κ∈[0,1], Pfa∈[10⁻¹²,1−10⁻¹²]. Inputs to the actual reference audit are compared with their exact binary-float values; the separate fixture JSON instead records exact intended decimal inputs.

All eight independent audit groups pass:

- 336 model/Pfa combinations with a 100-decimal-digit oracle, including all endpoints, near-zero/near-one κ, tiny/high ρ, and extreme Pfa
- 72 direct survival/CDF/equal/zero/near-equal tail cases
- 240 independent matrix/eigen/common-phase/coordinate-covariance checks
- 16 direct full 2L-dimensional Gaussian likelihood calculations, residual perturbations, and waveform-phase changes
- Both phase and energy-domain counterexamples, including phase integration of the energy likelihood
- 300,000 independent matched-domain trials per hypothesis, plus 20,000 actual raw-generator covariance trials
- Degenerate randomization, finite-input guards, and detector interface separation from truth
- Explicit finite-run numerical-payload ledger arithmetic

Maximum observed relative threshold error: 3.90×10⁻¹⁶. Maximum relative log-Pfa error: 7.61×10⁻¹⁶. Maximum absolute Pd error: 1.54×10⁻¹⁶. These are measured finite-grid results, not a proof covering every floating-point input.

For ρ=3,κ=.75,Pfa=.05, the independent oracle gives:

- Joint threshold: 3.1035385065084921788864915700
- Joint Pd: .6433127617254234615991347384
- Energy-sum threshold: 4.7438645183905783758502737858
- Energy-sum Pd: .6243193955523238264249802299

Independent Monte Carlo seed 843287, N=300,000 per hypothesis: joint H0 rate .0500333 (99% exact interval [.0490135,.0510674]); joint H1 rate .6441233 ([.6418678,.6463743]); energy H1 rate .6257233 ([.6234438,.6279988]). All analytic targets lie in the reported pointwise intervals. The tests do not claim Monte Carlo validation of 10⁻¹² probabilities.

Nonblocking numerical qualification: the audit-only cross-term matrix evaluation can produce tiny signed roundoff near the κ=1 nullspace, e.g. Q≈−2.03×10⁻¹⁵ for z=(2+3i,−2−3i),ρ=3. The runtime eigen evaluation is exactly zero there. Retain the positive-weight eigen runtime and use absolute, not purely relative, tolerance for independent matrix checks near Q=0.

## 4. Calibration and cost boundaries

A common phase rotation leaves Q invariant. Independent receiver-coordinate rotations leave it invariant only when the covariance is transformed consistently: C₁₂ gains phase θ₁−θ₂. Rotating only the observation and leaving the known correlated prior fixed changes the model. Moreover, unobserved random station phases cannot generally be handled by merely setting κ=0: a phase mixture may have zero cross-covariance while retaining dependence between magnitudes.

The counts 4L raw, 4 complex-match, and 2 energy real-number payloads per block are correct for two receivers. When the center already knows s but each local processor needs a full per-block unicast waveform, the local schemes additionally receive 4L real values. Caching amortization and model/calibration updates must be explicit. Only parameters needed at a location should be charged there; prior knowledge at the center does not imply that every receiver needs every prior parameter.

A bit count obtained by multiplying by b is a specified representation assumption. Exact real-valued sufficiency does not imply lossless finite-bit transmission. The ledger establishes no throughput, latency, energy, hardware, packet-overhead, or congestion result.

## 5. Source boundary

The official [Behdad arXiv fixed v2](https://arxiv.org/abs/2305.12523v2), revised 2024-03-27, and the supplied matching PDF were checked. PDF SHA-256 is `30b871e5bb3dd1a66fab1a4c2ab3974abb8a7e664e04e2dfa62f6e50679c0d10`. Its Section VII, equations (20)–(33), uses a maximization-based MAPRT with unknown reflection and target-free channel coefficients; the teaching model integrates out its unknown reflection vector and omits target-free clutter. The paper permits a general reflection covariance, while its numerical setup on page 11 uses independent reflection coefficients. These are background links and distinctions, not a claim to reproduce its detector or figures.

The required stable official/full-text source for the Zou paper remains missing according to the handoff. This audit makes no claim of equation-level equivalence to that paper. Even if two simplified Gaussian tests can yield related quadratic statistics at fixed parameters, that does not certify reproduction of the source MAPRT.

## 6. Reproduction

Artifacts in this directory:

- `oracle.py`: standalone 100-digit scalar oracle and energy-message likelihood
- `high-precision-fixtures.json`: 336 exact-decimal calibration cases
- `audit_reference.py`: independent executable audit importing the producer reference read-only
- `audit-results.json`: tested reference digest, numerical results, Monte Carlo counts/intervals, and limitations

Run:

    python oracle.py --rho 3 --kappa .75 --pfa .05
    python oracle.py --fixtures high-precision-fixtures.json
    python audit_reference.py --reference scripts/distributed-detection-reference/detection_reference.py

Dependencies used: Python 3, mpmath 1.3.0, numpy 2.3.5, scipy 1.17.0. The producer runtime itself uses only Python's standard library. A later website must independently test its own numerical translation, controls, truth separation, and presentation; this validation does not certify any unbuilt UI.

### Final prose and producer-test review

`TEACHING_HANDOFF.zh.md` and `SOURCE_BOUNDARIES.md` were subsequently read against the audited core. They preserve the necessary assumptions, energy-baseline distinction, phase-coordinate and phase-mixture caveats, payload-only accounting, and paper-versus-independent-derivation boundary. Minor wording corrections were requested: specify ρ>0 when invoking a positive proportionality or phase information, identify the oracle as mpmath at 100 decimal digits rather than Python Decimal, and refresh the rounded example threshold. All three wording corrections were applied and verified against the frozen prose; they do not change the validated model or code. The producer's 14 unit tests were also rerun independently and all passed.

The final audit was rerun after adding explicit relative-error checks for the stable joint-miss outputs: all eight groups still pass, maximum miss-probability relative error 6.97e-16. The reference SHA was checked before and after execution and remained unchanged.
