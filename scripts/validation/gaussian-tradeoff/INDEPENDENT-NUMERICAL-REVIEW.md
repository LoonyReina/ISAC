# Independent Gaussian ISAC mathematical and numerical review

Status: PASS for the frozen bounded numerical reference after full independent replay. Final documentation and source-free packaging also pass the recorded hash checks. This report does not approve browser integration or claim a complete paper reproduction.

## Reviewed identity and boundaries

- Fixed source: https://arxiv.org/pdf/2204.06938v8, *On the Fundamental Tradeoff of Integrated Sensing and Communications Under Gaussian Channels*
- Independently verified PDF metadata: 27 pages, version 8, 7 June 2023; SHA-256 `8bfc316c0faf57c42a8cf2395a1bce594a9f987750f37287680fdb9e190dc342`
- Visually reviewed actual rendered pages 13, 14 and 17, and checked Eq. (48) against extracted PDF text. The web PDF renderer failed; existing local renders and actual local PDF supplied the visual evidence
- Source assets remain outside the deliverable. No license was accepted and no PDF, figure image, or author code is redistributed
- Only isolated snapshots under this review directory were edited. No owner implementation, UI repository, remote, or desktop task was changed
- All numerical work used one BLAS thread. Checks completed in seconds; no broad Monte Carlo replay was started while the networked-sync release held the compute window

## Source interpretation decision

The source conflicts are real, not extraction artifacts:

1. Page 14 Eq. (109) has a positive rate term, unlike the sensing-minus-rate Eq. (48)
2. Page 13's prior statement omits the proper-complex factor two. Equations (94)–(95) retain it
3. Page 13 Eq. (93)'s displayed transform negates the imaginary coordinates. Literal Eq. (94) does not equal the real-coordinate likelihood information matrix
4. Page 17 Table II uses lowercase Pt. Equation (3) defines the expected covariance trace through per-antenna PT. The conversion remains unresolved
5. Equation (101)'s componentwise population-eigenvalue expression is kept as a diagnostic, not a validated general-covariance limit

Accordingly, the acceptable claim is an operational, independently derived linear-Gaussian reconstruction using the Eq. (95) trace and Eq. (48) objective. It is not literal implementation of every printed matrix expression. Both 24 dB power interpretations must remain labeled; figure resemblance cannot resolve the convention.

## Independent mathematical derivation

Write a sensing row as y = Xᵀh + z. For all Ns rows, let A = I_Ns ⊗ Xᵀ and B = [[Re A, −Im A], [Im A, Re A]]. The real-coordinate likelihood has noise covariance (σs²/2)I, and an iid CN(0,σp²) prior has real covariance (σp²/2)I. Therefore:

J = 2(BᵀB/σs² + I/σp²)

The posterior mean is the solution of this real linear system, equivalently YXᴴ(XXᴴ + σs²/σp² I)⁻¹. Its total Bayes error is tr(J⁻¹) = (σs²Ns/T) tr[(XXᴴ/T + σs²/(Tσp²)I)⁻¹]. The expectation over random known waveforms is outside the inverse. Target truth is neither an estimator argument nor an optimization input.

For dimensionless covariance W = Q/PT and δ = σs²/(Tσp²PT), the matrix-shaping objective is tr[(W+δI)⁻¹] − κ ln det(I+AWAᴴ), with A = Hc√(PT/σc²), W PSD and tr W = M. Its matrix gradient is:

G = −(W+δI)⁻² − κ Aᴴ(I+AWAᴴ)⁻¹A

Convexity gives the global supporting-plane certificate tr(GW) − M λmin(G). The scalar eigenbasis implementation was checked against this full complex-matrix certificate and arbitrary non-diagonal PSD competitors. The Eq. (48) weight conversion κ = αPT/[(1−α)Ns] follows from scaling; it is not fitted to a plot. The communication endpoint uses water filling; finite κ is not water filling.

For finite complex Wishart covariance, the independent oracle expands the Laguerre density into exact polynomial coefficients and evaluates its resolvent via J₀(b) = exp(b)E₁(b), Jₙ(b) = (n−1)! − bJₙ₋₁(b) at 90 decimal digits. This is independent of the implementation's adaptive floating-point polynomial quadrature. Missing rank directions contribute Nsσp² each under a proper prior. An improper prior requires full identifiable rank; finite Gaussian inverse means additionally require T > M.

For rank-one sphere signaling, an independent MI oracle integrates one shifted real Gaussian coordinate, a Gamma-distributed perpendicular squared radius and the first-coordinate sphere angle using Hermite, generalized Laguerre and Jacobi quadrature. It uses neither Bessel functions nor a noncentral-chi-square density. The input is uniform on the complex sphere of radius √(T·SNR); its MI is divided by T and ln 2. Gaussian-input capacity is only an upper comparison.

## Reproducible check results

`audit_oracles.py` checks full real likelihood, posterior, Hessian, full-matrix optimization, high-precision scalar integrals, independent finite-SNR MI and regression counterexamples.

- Full real dimensions: (M,Ns,T) = (1,1,1), (2,3,4), (3,2,2)
- Maximum posterior-coordinate error: 9.03×10⁻¹⁶
- Maximum inverse-information trace error: 1.78×10⁻¹⁵
- Maximum finite-difference Hessian entry error: 5.06×10⁻⁹
- Fifteen full-matrix KKT cases: M=2,3,4 and κ=0,.2,7,1000,∞; each met relative gap 10⁻⁸ and beat all sampled PSD competitors
- Nine 60-digit scalar-Gamma inverse integrals: maximum difference 1.12×10⁻¹⁶
- Nine independent sphere MI cases: T=1,2,4 and SNR=.1,1,10; maximum disagreement 6.35×10⁻¹⁰, maximum 32→64 order change 2.55×10⁻⁸
- Current structural-guard snapshot: 15/15 owner tests pass, with zero failures in independent oracles

Literal full-matrix source counterexample uses M=Ns=2, T=3, σs²=σp²=1 and X = [[1+i, 2i, 3], [.5i, 2, 1−2i]]. The printed matrix has imaginary entries as large as 6.3333 and differs from the direct real-likelihood matrix by Frobenius norm 25.3333. Their inverse traces nevertheless agree within 1.34×10⁻¹⁵. Thus a trace-only test cannot validate the printed coordinate matrix.

`audit_evidence.py` independently rechecks saved raw evidence without rerunning the owner's Monte Carlo experiment:

- Fig. 4: all 39 points (M=Ns=2,4,6; T=4M; prior precision .01–100) match the 90-digit recurrence within 1.34×10⁻¹⁵
- Every saved Monte Carlo mean and standard error is reproduced from the raw eigenvalues; 16,384 trials per M; maximum standardized discrepancy 1.7727
- Raw first and second covariance moments agree with E tr R=M and E tr R²=1.25M within 1.446 sample standard errors
- Maximum relative MP approximation discrepancy is 0.234538%, an approximation error rather than a numerical tolerance
- Proper-prior tests additionally cover T<M, T=M and T>M through the independent recurrence
- Raw paired estimator-minus-conditional-error checks use 8,192 draws per signaling law; Gaussian z=.03185 and semi-unitary z=1.36274. Gaussian energy fluctuates; Stiefel energy is fixed; expected block power is identical
- Across-grid errors are correlated because each M reuses the same random waveforms; the 39 pointwise intervals are not a simultaneous confidence band

## Defects found, owner fixes and independent rechecks

1. Small positive covariance eigenmodes were silently removed by Stiefel rank thresholding, allowing an impossible rank-2 covariance at T=1. Owner removed silent dropping; the exact counterexample now rejects
2. Improper-prior batch CRB converted a tiny identifiable mode into infinity. Owner switched to direct singular values; the diagonal counterexample now agrees with the independent direct formula
3. Integer-valued float dimensions passed validation but failed later in array constructors. Owner normalized Model and waveform-helper dimensions; final regressions pass
4. Removing the old threshold exposed structurally singular waveforms returning huge finite errors from eigensolver roundoff. Owner now uses SVD, explicitly includes missing null directions and rejects numerically ambiguous improper-prior rank. Thirty-six structural/dependent-waveform cases now return infinity or explicit rank-ambiguity errors

Initial failures and intermediate snapshots are retained. Numerical ambiguity is disclosed, not converted into false finite precision. Proper-prior selected experiments are unaffected by the improper-prior guard policy. Every numerical artifact was regenerated and independently replayed against the final code hash.

## Acceptance limits

- The implemented prior is isotropic, iid, proper-complex Gaussian. This does not verify arbitrary prior covariance, nonlinear nuisance parameters, or correlated sensing channels
- The Gaussian-input communication formula is conditional MI per complex use. No decoder, finite code, training overhead or instantaneous block-power constraint is verified
- Stiefel waveform covariance realization is physical only when its actual rank is at most T. Fixed covariance does not imply zero rate; a deterministic waveform does
- General-MIMO semi-unitary rate expressions remain high-SNR asymptotics. They must not be labeled certified finite-SNR achievable points or fed into a certified achievable hull
- A numerical radial integral evaluates an exact finite-SNR MI formula, but its quadrature error estimate is not a rigorous interval. Omitted tail probability alone does not bound omitted entropy
- The complete declared bounded Fig. 10 configuration sweep was replayed, but no Fig. 11 null-space completion, digitized plot match, exact distribution optimization, full-paper experiment set or runtime claim is approved here
- No source convention may be selected to force visual agreement

## Replay commands

Run from this review directory:

```sh
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 NUMEXPR_NUM_THREADS=1
python -m unittest discover -s final-snapshot -v
python audit_oracles.py --core final-snapshot/core.py --out final-oracle-results.json
python audit_evidence.py --evidence final-snapshot/evidence --output final-evidence-audit.json
python replay/run_reference.py --trials 16384
python replay/high_precision_checks.py
python replay/run_reference.py --region --channels 256 --blocks 256
python replay/verify_records.py
python audit_region.py --full-waveforms
```

## Final freeze and full replay: 12 October 2026 UTC

The owner completed the bounded run and released the compute slot. The reviewer copied the final numerical implementation and evidence into `final-snapshot/`, reran every numerical experiment independently in `replay/`, and then checked all full matrices and waveform statistics with a separate implementation.

- Core SHA-256: `b06e329b927cda7adb1e2d38b320a1f2ca1bee287ebe8dec50d6de86fe176bb2`
- Region JSON SHA-256: `1a039bb22f109b22b173f54b9f0a14c7a0ed22ad046a8130fb9d252a04eae0a4`
- Region raw NPZ SHA-256: `a3658902f508652ecbdcd94874618cbb409beae344bfa72da8899c8f909f69cf`
- 15/15 final tests pass; every independent oracle passes with no unresolved counterexample
- Four region runs: two independently seeded replicates for each of the two power interpretations; 256 channels/run, 9 weights and 256 waveform blocks/channel
- All 9,216 covariance solutions were recomputed; all 10 numerical JSON/NPZ artifacts were byte-identical, including Figure 4, posterior MSE, sphere integration, source diagnostics and the full region. Exact per-file hashes are in `replay-comparison.json`
- The owner raw-record verifier passed 27,803 checks on the independent replay
- Independent direct complex-matrix KKT audit of all 9,216 solutions: maximum relative global gap 8.371×10⁻¹⁴
- Independent direct-inverse replay of every Gaussian waveform pair, covering 2,359,296 waveform blocks: maximum per-channel normalized-CRB mean disagreement 1.122×10⁻¹⁴. All saved within-channel variances and all channel-cluster summary standard errors agree
- The Eq. (101) diagnostic retains all invalid/rank-deficient cases through explicit valid-subset counts. It is never used to certify optimizer or sensing performance
- No replay produced a traceback, warning or failed assertion; all logs are retained. Initial guard counterexamples remain preserved rather than erased
- Actual newly generated Figure 4 and bounded-region plots were visually inspected; labels preserve both power interpretations, independent replicates and asymptotic-rate limitations

At the communication endpoint, finite Rayleigh samples include rank-deficient water-filling allocations and retain the resulting proper-prior error, rather than dropping difficult channels. For the two seeds, communication rates are 19.7453 and 20.0097 bits/complex use under total-power interpretation, versus 27.0168 and 27.3055 under per-antenna interpretation. These are finite-sample estimates, not author tabulated values.

The inequality in literal Eq. (109) is also preserved in the source diagnostic: its plus-rate example attains the separable global minimum at powers approximately [0.946243, 0.0618034], using only 1.008046 of an available 2. The equality-budget slice is labeled separately. The Eq. (101) moment conflict is explicitly limited: it rules out a general componentwise scaled-MP spectral law, without asserting failure of every coordinated z→0 asymptotic path.

## Separate teaching-example audit

`audit_teaching.py` and `teaching-audit.json` verify one independently labeled instructional example, M=4, Nc=3, Ns=2, T=8, with 2,048 blocks per signaling law. Its original script/raw/results hashes are recorded in the audit. All observation, covariance, posterior and squared-error identities, six full-matrix shaping points, nine independent Wishart checks and six independent sphere-MI checks pass. Maximum posterior disagreement is 4.81×10⁻¹⁵; relative matrix KKT gap is at most 2.08×10⁻¹⁵. This adds no source-figure, full-paper, UI, or browser acceptance count. The final-core teaching regeneration and its hash-specific recheck are recorded below.

## Packaging and final teaching dependency

All 32 entries of the reference manifest were independently checked for exact size and SHA-256. The archive contains exactly those files plus its manifest: 33 regular files, no symbolic links or traversal paths, no paper PDF/HTML and no interpreter cache. Every archived file matches the frozen source-free directory. The final plot includes both Eq. (56) and Eq. (111) leading forms and was visually checked after that plotting-only update; numerical evidence hashes did not change.

Checked reference archive SHA-256: `235619c80cc0ebf8551138a1ef241adefacddb0f15a79ca973718fb5ccd5481c`

Checked reference manifest SHA-256: `716560ac0ecb32689ad187b6866f7ead4e07fe76d21e4490991bde5c4110ddad`

The teaching example was regenerated against final core `b06e329b…176bb2` and rechecked. Its raw arrays are byte-identical to the original reviewed instance, and every numerical check passes again. Final teaching results SHA-256 is `2f8f932fa3dedd862aff2243248ec3ce4c01486ffa169cdfaf600a2ceaf6c065`; raw NPZ SHA-256 is `1cf01b5f239eeb49481a6784d77ba66cdc216a3f9b9d889c065649245a0460cd`. The corresponding independent `teaching-audit.json` SHA-256 is `b8eae3c84c99a8491c6e0616e800527408974905468eacdce390102e89f5bf27`.
