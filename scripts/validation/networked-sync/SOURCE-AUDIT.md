# Source audit: networked ISAC synchronization (arXiv v1)

## Result

Primary identity, Algorithm 1, simulation dimensions, SNR definition, Figures 2–3 axes, and Table I were verified. Several implementation-critical choices are missing, and PDF-confirmed notation and parameterization issues require explicit interpretations. This supports a declared independent reference, not an exact reproduction claim.

## Provenance

- Fixed version: [2607.18680v1](https://arxiv.org/abs/2607.18680v1), submitted 2026-07-21T03:56:02Z
- Authors: Lin Chen, Yifan Liang, Hongbin Li; Stevens Institute of Technology
- Official PDF: 13 pages; SHA-256 e8da91552c32d61dd40cbc3c0224c7b654df04e9a4c3e85c0781d58f66853f02
- Audit date: 2026-10-12 UTC
- Main-paper author code was not located in the bounded search. This is not proof of absence.
- Paper files were inspected privately outside this deliverable. No PDF, source, extracted full text, or source figure is included.

## Numerical configuration facts

- M=10, N=36, K=20; L=1 (Figure 2), L=2 (Figure 3); one snapshot
- Carrier 28 GHz, bandwidth 10 MHz, spacing B/(N−1)=285714.285714 Hz, symbol duration 1.5/spacing=5.25 microseconds, antenna spacing lambda/2
- BS positions in metres: (80,80), (−80,−80), (80,−80), (−80,80); six pairs
- Positions sampled inside the 160 m square; speeds 0–30 m/s; random directions; pairwise offset SDs 10 ns and 100 Hz
- L=2 separation: at least 12 degrees and 12 m of bistatic range; all-link interpretation is not explicit
- SNR is reflection-coefficient energy divided by per-complex-sample noise variance, before beamformer and array gain
- 500 trials per pair / 3,000 pair-trials; R=20 and relative residual tolerance 1e−4
- Figure 2 SNRs: −30 through 5 dB, 5-dB steps; Figure 3: −25 through 10 dB, 5-dB steps
- Plotted units: TO and delay in seconds, CFO and Doppler in Hz, angles in degrees
- RMSE is conditioned on success; failure means any estimated bistatic range below the pair baseline. Table I is success rate over all trials
- Detailed source locators, numerical Table I values, and unresolved aggregation choices are in source_audit.json.

## Implementation-critical findings

### Frequency units

Status: PDF-confirmed notation/parameterization issue requiring interpretation

Eq.19 uses omega in [0,2pi), while Eq.20 contains exp(−j*2pi*omega). This is mathematically defined, but mixes customary angular-frequency and cycles/sample parameterizations and gives a redundant frequency interval.

Declare one convention: x[q]=a*exp(j*q*psi), psi in [-pi,pi), or cycles/sample over a unit interval. Convert Eq.26 using radians/sample.

Sources: [Eqs.19–20, p4](https://arxiv.org/html/2607.18680v1#S4.E19)

### Unfolding dimensions

Status: PDF-confirmed notation/parameterization issue requiring interpretation

Algorithm 1 writes D*X^T with dimensions product-of-other-modes × current-mode, whereas Appendix B explicitly defines conventional mode-2 unfolding as N×MK. Its corresponding model identity and Eq.63 do not conform to that shape.

Choose and document unfolding/Khatri-Rao/reshape order together. For Y2 shaped N×MK, recover C⊙A as (B†Y2)^T, with column-major M×K reshape when antenna index is fastest. Verify elementwise noiseless reconstruction.

Sources: [Algorithm 1 lines3–5, p5](https://arxiv.org/html/2607.18680v1#alg1); [Appendix B, Eq.63, p12](https://arxiv.org/html/2607.18680v1#A2.E63)

### Soe offset sign

Status: analytic_inference_from_verified_equations

Under the Eq.2 positive-exponent phase-slope convention, Eq.10 c_j1*conj(c_j2) has delay slope +4pi*Delta_f*Delta_tau_j2 and Doppler slope -4pi*T*Delta_nu_j2. Eq.11 uses the opposite conversion signs and thus returns the j1 offsets while labelling them j2.

Do not silently treat the printed Eq.11 as consistent. Any sign correction is a documented implementation interpretation; test positive and negative offsets noiselessly.

Sources: [Eqs.10–11, p4](https://arxiv.org/html/2607.18680v1#S3.E10); [Eqs.2,5, p3](https://arxiv.org/html/2607.18680v1#S2.E5); [Eq.26, p5](https://arxiv.org/html/2607.18680v1#S4.E26)

### Esprit svd conjugation

Status: analytic_inference_from_verified_equations

For a rank-one matrix a*c^T and standard SVD U*S*V^H, the right singular vector is proportional to conj(c). Eq.64 names q as a right singular vector and applies a positive forward phase-difference formula without conjugating.

Either define q=conj(V[:,0]) explicitly, or negate the temporal phase slope of V[:,0]; validate Doppler sign.

Sources: [Appendix B, text before and Eq.64, p12](https://arxiv.org/html/2607.18680v1#A2.E64)

### Doppler geometry sign

Status: analytic_inference_from_verified_equations

Eq.53 uses nu=(outward unit vectors summed)·velocity/lambda, positive for increasing bistatic path length; Eq.2 uses a positive slow-time complex exponent. This is a paper convention rather than the common negative path-length-derivative convention for received complex-baseband Doppler.

Preserve the paper-defined sign for source alignment, and label it explicitly; avoid claiming this sign is universal RF convention.

Sources: [Eq.53 and following definition, p8](https://arxiv.org/html/2607.18680v1#S5.E53); [Eq.2, p3](https://arxiv.org/html/2607.18680v1#S2.E2)

### Steering and link index

Status: verified_with_implementation_risk

Receive steering has positive spatial phase. The subscript i names the receiving BS: w_j1 is transmitted at BS-j2. The transmit contraction is a_t^T*w, not a_t^H*w.

Keep a clear receiver/transmitter index mapping and ordinary transpose in signal synthesis.

Sources: [Eqs.1–4 and definitions, p3](https://arxiv.org/html/2607.18680v1#S2.E1); [Eq.17, p4](https://arxiv.org/html/2607.18680v1#S4.E17)

### Alpha distribution

Status: not_specified_in_inspected_paper

No numerical reflection-coefficient distribution, magnitudes/phases, pathloss rule, target RCS, or forward/reverse correlation rule was located.

Alpha choices affect stated SNR and beamformed amplitudes; record them as assumptions and do not describe them as author settings.

Sources: [Eq.2 and definitions, p3](https://arxiv.org/html/2607.18680v1#S2.E2); [Section VI, p8](https://arxiv.org/html/2607.18680v1#S6)

### Beamformer distribution

Status: not_specified_in_inspected_paper

Random initial beamforming is described for first-snapshot tracking, but the distribution and normalization of the random vectors are absent; single-snapshot simulation beamforming details are not separately explicit.

Declare the beamforming law, norm/power, whether each BS uses one common beam across its pairs, and random seed. Do not absorb its gain into alpha while claiming the same SNR definition.

Sources: [Section V-A, p7](https://arxiv.org/html/2607.18680v1#S5.SS1); [Algorithm 2 lines1,7, p8](https://arxiv.org/html/2607.18680v1#alg2); [Section VI, p8](https://arxiv.org/html/2607.18680v1#S6)

### Array orientation

Status: not_specified_in_inspected_paper

The signed-broadside operator is named but no algebraic reference axis, per-BS array orientation, or front/back branch convention is supplied for mapping Cartesian positions to angles.

Declare orientations and principal angle branch. Inward-facing arrays or a global shared axis are different experimental assumptions.

Sources: [Notations, pp2–3](https://arxiv.org/html/2607.18680v1#S1); [Eq.4, p3](https://arxiv.org/html/2607.18680v1#S2.E4)

### Pilots

Status: not_specified_in_inspected_paper

Pilot symbols are divided out; their constellation, amplitude, normalization, and randomization are not supplied for the simulations.

Unit-modulus pilots keep independent equal-variance Gaussian noise after division; if chosen, label that assumption.

Sources: [Eq.1, p3](https://arxiv.org/html/2607.18680v1#S2.E1); [Eq.16, p4](https://arxiv.org/html/2607.18680v1#S4.E16)

### Projection optimization

Status: not_specified_in_inspected_paper

Eq.25 defines an argmax but no grid, oversampling, refinement, optimizer tolerance, tie policy, or treatment of zero columns.

Declare the numerical maximizer and independently test high-SNR frequency bias. A grid-only result may be quantization-limited.

Sources: [Eq.25, p5](https://arxiv.org/html/2607.18680v1#S4.E25)

### Cpvdm initializer

Status: partly_specified

Using CP-VDM B/C initialization is explicit. The exact 2013-reference algorithm variant, smoothing parameters, eigenvector scaling, and branch handling are absent.

A source-algebra CP-VDM variant is legitimate if labelled independent and its choices are exposed; it is not verified author code.

Sources: [Section VI first paragraph, p8](https://arxiv.org/html/2607.18680v1#S6)

### Stopping details

Status: not_specified_in_inspected_paper

Algorithm 1 does not define epsilon_1 or A_1 although the first stopping test needs a previous residual. It says check convergence without an explicit break instruction; zero denominator and residual increases are unaddressed.

State initial-residual and break semantics and a zero-residual guard. The specified norm is unsquared. Record residual histories and iteration counts.

Sources: [Algorithm 1 lines1,6–7, p5](https://arxiv.org/html/2607.18680v1#alg1)

### Cals optimality

Status: analytic_caveat

The paper itself describes LS then Euclidean column projection as an approximate constrained subproblem solution. Euclidean projection need not minimize the original D-weighted LS loss, so monotonicity/global optimality do not follow automatically.

Test residual behavior; do not equate a bounded local CALS run with proven global ML or guaranteed CRB attainment.

Sources: [Eqs.21–25 and explanatory text, p5](https://arxiv.org/html/2607.18680v1#S4.E21)

### Puma and matrix pencil

Status: partly_specified

The Notations name PUMA for factor columns and matrix pencil for multi-tone vectors, with references but no detailed settings.

On already projected exact single-tone columns, direct adjacent phase recovery is algebraically equivalent in exact arithmetic; disclose any substitution. Multi-tone SOE-MP needs explicit pencil/order choices.

Sources: [Notations, pp2–3](https://arxiv.org/html/2607.18680v1#S1)

### Phase aliasing

Status: not_specified_in_inspected_paper

Branch selection, delay phase unwrapping, circular-vs-linear association, and out-of-range arcsin handling are not specified.

Use one declared phase branch and consistent signed delays. Avoid truth-based branch selection in estimation. Report numerical invalids distinctly.

Sources: [Eqs.26–27, p5](https://arxiv.org/html/2607.18680v1#S4.E26)

### Association

Status: verified_with_implementation_risk

Eq.27 compares all L! cross-link permutations. Subtracting a constant inside a variance does not change it. Means for offsets are permutation-invariant, but branch wrapping can break naive linear phase operations.

Keep association independent of truth. Separately document any truth-to-estimate permutation used only to score RMSE; paper does not prescribe that scoring match.

Sources: [Eq.27, p5](https://arxiv.org/html/2607.18680v1#S4.E27)

### Pair offsets global consistency

Status: not_specified_in_inspected_paper

Pairwise Gaussian offsets and sign reciprocity are stated; a set of per-BS clocks enforcing cycle sums across all six pairs is not supplied.

Declare independent pair offsets versus differences of global BS clocks; these are not identical covariance models.

Sources: [Section VI, p8](https://arxiv.org/html/2607.18680v1#S6); [Eq.5, p3](https://arxiv.org/html/2607.18680v1#S2.E5)

### Monte carlo joint sampling

Status: not_specified_in_inspected_paper

The stated counts do not resolve whether one network geometry/noise seed is shared across all six pair trials, or how draws are paired across methods and SNR values.

Expose seeds, generation order, cross-method pairing, and statistical unit. If six pairs share a scene, do not count them as independent for confidence intervals.

Sources: [Section VI-A, pp8–10](https://arxiv.org/html/2607.18680v1#S6.SS1)

### Success definition

Status: verified_with_reporting_caveat

The displayed RMSE excludes any pair-trial whose estimated range for at least one target falls below the BS baseline. It does not exclude all high-error or physically impossible angle estimates by a stated rule.

Report success counts and conditional RMSE together. Add unconditional errors/failure categories for an independent audit, labelled additional metrics.

Sources: [Section VI-A p9, below Figures2–6](https://arxiv.org/html/2607.18680v1#S6.SS1); [Eq.51, p8](https://arxiv.org/html/2607.18680v1#S5.E51)

### Table and curves

Status: verified_boundary

Table I gives numerical success percentages; Figures2–3 give five RMSE plots each without machine-readable values.

Table percentages are source targets, not reproduced results. Do not fabricate exact RMSE source data from qualitative curves.

Sources: [Table I, p10](https://arxiv.org/html/2607.18680v1#S6.T1); [Figure2, p9](https://arxiv.org/html/2607.18680v1#S5.F2); [Figure3, p9](https://arxiv.org/html/2607.18680v1#S5.F3)

### Known rank and separation

Status: partly_specified

L is supplied to Algorithm1. Figure3 assumes at least 12-degree angular and 12-m bistatic-range separation but gives no Doppler separation, exclusion radius near BSs, or rejection sampler.

Record rank knowledge and exact separation predicate. Do not present source results as blind model-order estimation or unresolved-target performance.

Sources: [Algorithm1 input, p5](https://arxiv.org/html/2607.18680v1#alg1); [Figure3 discussion, p10](https://arxiv.org/html/2607.18680v1#S6.SS1)

### Crb nuisance parameters

Status: verified_with_reporting_caveat

Section IV-C includes offsets, target delay/Doppler/angles, and real/imaginary reflection coefficients in its joint information matrix. It assumes independent circular complex Gaussian noise.

A simplified single-link or known-amplitude bound is a different benchmark. Match nuisance parameters and units, or label the bound as independent.

Sources: [Section IV-C, Eqs.36–43, pp6–7](https://arxiv.org/html/2607.18680v1#S4.SS3)

## Delivery and claim boundary

An independently implemented, bounded numerical reference under declared choices can test signal algebra and selected trends. Without author settings/code and the original full Monte Carlo protocol, do not claim exact reproduction of Figures 2–3/Table I or broad superiority/CRB attainment.

Official reference-20 code is listed at [Tensorlab+](https://www.tensorlabplus.net/papers/sorensen2013cpdv.html), with [restrictive terms](https://www.tensorlabplus.net/license.html). No code was downloaded and no agreement was accepted. The 2013 reference package is not the 2026 paper authors' simulation implementation.

## Audit artifacts

- source_audit.json: complete structured facts, uncertainties, exact locators, and numerical Table I
- SOURCE_AUDIT.md: readable assessment
- No implementation or numerical experiment is contained in this audit

## Visually verified formula crosswalk

Official PDF pages 4, 5, 9, and 12 were locally rendered and actually viewed as pixels. Rendered source images remain outside this package. These observations distinguish literal printed formulas from a declared operational reconstruction; they do not identify the authors' unpublished code.

### Generator units

Locator: p4, Eqs.19–20

Printed short formula: omega_l ∈ [0,2π); v_Q(omega_l)=[1,e^(−j2πω_l),...,e^(−j2π(Q−1)ω_l)]^T

Observation: The displayed domain is an angular-frequency interval while the exponent is cycles/sample parameterization. It remains a mathematically defined but redundantly parameterized set.

Operational reconstruction: Use either exp(j*q*psi) with psi∈[−π,π), or exp(−j*2π*q*f) with f on a unit interval. Record the translation into Eq.26.

Claim limit: A parameterization ambiguity verified in the PDF; no assertion about the authors' code.

### Cals unfolding

Locator: p5, Eq.21 and Algorithm1 lines3–5; p12, AppendixB opening paragraph

Printed short formula: min_X ||D X^T−E||_F^2; line4: X=B, D=C⊙A, E=Y^(2)⊘S^(2); AppendixB: Y^(2)⊘S^(2)∈C^(N×MK)

Observation: D X^T has shape MK×N, whereas the explicit AppendixB mode-2 definition has shape N×MK.

Operational reconstruction: Transpose conventional mode unfoldings when used in D X^T LS, and fix the nonupdated-mode ordering consistently.

Claim limit: Literal conventions do not match each other dimensionally. A standard operational reconstruction is not evidence of the authors' precise tensor ordering.

### Esprit ls dimensions

Locator: p12, AppendixB and Eq.63

Printed short formula: C_hat⊙A_hat=(B_hat^T)^†(Y^(2)⊘S^(2))

Observation: For B of shape N×L and the declared unfolding N×MK, the right-hand product is (N×L)(N×MK), which is undefined in general.

Operational reconstruction: If Y2=B(C⊙A)^T has shape N×MK, then C⊙A=(B^†Y2)^T. This is ordinary transpose, not Hermitian transpose.

Claim limit: Dimensionally consistent reconstruction under the explicitly chosen conventional unfolding; not a claim about author implementation.

### Esprit right singular vector

Locator: p12, text before Eq.64 and Eq.64

Printed short formula: nu_hat=arg(q_under^H q_over / ||q_under||_2^2)/(2πT_sym)

Observation: The text calls q a right singular vector. Under X=UΣV^H and X=a c^T, q=V[:,0] is proportional to conjugate(c), so its forward phase slope is negative that of c. Here under removes the last row and over removes the first row.

Operational reconstruction: Use conjugate(V[:,0]) as the recovered temporal factor c, or negate the forward phase slope from V[:,0].

Claim limit: This is conditional on the standard X=UΣV^H convention; a q convention different from that standard is not explicitly specified.

### Soe mp offset label

Locator: p4, Eqs.10–11; p3, Eqs.2,5; p5, Eq.26

Printed short formula: d_tau=c_tau,j1⊛c_tau,j2*; Delta_tau_hat,j2=−angle(d_tau)/(4πDelta_f); Delta_nu_hat,j2=angle(d_nu)/(4πT_sym)

Observation: Taking angle as the signed adjacent-sample phase slope, the Eq.10 product has slopes +4πDelta_f*Delta_tau_j2 and −4πT_sym*Delta_nu_j2, using Eq.2 and reciprocity. Thus Eq.11's printed conversion yields the j1 offset under that convention.

Operational reconstruction: For j2 output use +slope(d_tau)/(4πDelta_f), −slope(d_nu)/(4πT_sym), or interchange the order of the product. Label this explicitly.

Claim limit: A sign/label ambiguity under the declared phase-slope convention, not proof of how the authors implemented matrix pencil.

