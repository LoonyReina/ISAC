# CS-ANL1 independent source and numerical gate

Date: 2026-10-12. Scope: research reference only, no website/repository/publication changes.

## Fixed sources

1. Le Zheng and Xiaodong Wang, *Super-Resolution Delay-Doppler Estimation for OFDM Passive Radar*, arXiv:1610.04218v2, 2017-02-15, 26 PDF pages. https://arxiv.org/pdf/1610.04218v2. Downloaded 2026-10-12; 871620 bytes; SHA-256 `f0441c1053085d83356e40d200fe83c442c33d5d403c39d2bc89745f8ac2a722`. Source PDF pp. 14–15 visually checked, not just OCR. Journal DOI: https://doi.org/10.1109/TSP.2017.2659650. All equation/page numbering below belongs to v2.
2. Its reference [44], Zai Yang, Lihua Xie and Petre Stoica, *Vandermonde Decomposition of Multilevel Toeplitz Matrices with Application to Multidimensional Super-Resolution*, arXiv:1505.02510v3. https://arxiv.org/pdf/1505.02510v3. Downloaded 2026-10-12; SHA-256 `cfc38d913f1a1f5af1f4d193a725441090ffaf4d4ba52b121cc7b17ff391d3ca`. Theorem 1 and section IV-C, pp. 9–10, are important qualifications to source 1's equation (21).

The PDFs and extracted text are private research inputs in source/, excluded from any redistributable code bundle. No verified author code/data repository or author seed was found in the bounded title/author/GitHub-link search; this is not proof none exists. Original authors' software versions, licenses and exact generated scenes remain unavailable. The inspected repository checkout was `958e54d94928bd51378619587b4706dc9f371a40`; its AGENTS.md and 35-paper acceptance/backlog were read without modification.

## Claim boundary: actual paper SDP, not a grid proxy

The implementation minimizes equation (27), including a continuous two-level Toeplitz moment matrix and a full (MN+1)-dimensional complex PSD cone. There is no frequency dictionary in either ADMM or its independent CVXPY reference. The optional later dual-polynomial search grid is parameter extraction, not the optimizer.

There is a mathematical qualification missing from an unconditional reading of equation (21). For dimensions greater than one, the finite PSD Toeplitz trace construction is generally a lower bound on the continuous atomic norm. Reference [44], section IV-C, explicitly discusses this and the need to check that an optimum admits a Vandermonde decomposition. Its Theorem 1 gives rank(T) < min(M,N) as a sufficient condition for decomposition. A valid higher-rank decomposition can also suffice; rank above that sufficient threshold does not prove failure, but cannot certify equality by that theorem. Close-frequency separation pertains to recovery guarantees and is not a license to assert exactness of every finite SDP. Report numerical rank tolerance and decomposition evidence separately. An approximately low-rank matrix is numerical evidence, not a theorem-level certificate. In particular the 80-clutter scenario must not be given an unconditional exact-atomic-norm badge.

## Observation and information contract

Use m=0,…,M−1 for OFDM block and n=0,…,N−1 for subcarrier; D=MN. Column-major vectorization has index i=m+Mn. Equation (6):

r_mn = s_mn sum_k alpha_k exp(2πi[m phi_k − n psi_k]) + v_mn

phi_k=f_k Tbar mod 1; psi_k=Delta_f tau_k mod 1; alpha_k=A_k T. Delta_f=1/T, Tbar=T+Tcp. Atoms have unit-magnitude entries and Euclidean norm sqrt(D), despite the source calling the sinusoids normalized. Do not unit-normalize the atom without changing every penalty and gain convention.

The receiver observes r and the demodulated symbol estimates shat, represented by S=diag(vec(shat)). It does not observe transmitted symbols s, bit errors, path count, path parameters, noiseless z, simulation seed or simulation RNG state. Unknown z=sum_k alpha_k a(phi_k,psi_k), and e=(s−shat) elementwise z. Thus r=S z+e+v. Error support is sparse when demodulation errors are rare; its amplitudes are signal-dependent, not independent Gaussian or arbitrary fixed-amplitude corruption. If z=0, a wrong symbol need not cause nonzero e, qualifying the source's assertion after equation (9). The receiver performs demodulation but no FEC decoding. Reference channel quality, synchronization and symbol-decision generation are assumed inputs to this formulation, not algorithms implemented by it.

Noise v is circular complex Gaussian CN(0,sigma²), meaning E|v|²=sigma²; use real/imaginary standard deviations sigma/sqrt(2). The model requires delay within CP and negligible phase change inside a block. It excludes ICI from appreciable intrablock Doppler, range migration, missing samples and decoding dynamics. Muted-symbol testing is an extra algebraic stress test, not a paper experiment.

The paper plots R=c tau and v=c f_D/f_c. These are its propagation-coordinate conventions; a general passive bistatic geometry does not yield a unique target position or physical radial speed from this pair. No factor of two is inserted. Negative Doppler is represented modulo one and unwrapped around zero only for reporting.

## Objective and Toeplitz operator

For Hermitian two-level Toeplitz T(U), solve

min 0.5 ||r−e−S z||² + lambda/(2D) trace(T(U)) + lambda t/2 + mu sum_i |e_i|
subject to B=[[T(U),z],[zᴴ,t]] PSD.

The coefficient U_(k,j) represents lag k in block index m and lag j in subcarrier index n:

T(U)_(m+Mn, p+Mq) = U_(m−p,n−q).

Hermitian symmetry is U_(−k,−j)=conj(U_(k,j)); U_(0,0) is real. Each lag occurs w_(k,j)=(M−|k|)(N−|j|) times. Let A* be the true Frobenius adjoint (sum over each lag), and P=(A*A)^−1 A* the lag average. P is a left inverse/least-squares map, not the unnormalized adjoint. The source's T* in (45) intends this average. Subtract the trace penalty at the central zero lag, not at the first element of the explicitly centered U array.

## Complete derived ADMM updates

Use source sign convention: multiplier G for Theta−B, penalty rho/2 ||Theta−B||F². Partition Theta and G into top-left D×D blocks, last columns theta and g, and bottom-right real scalars theta_t and g_t. Initialize all variables to zero.

The source's equation (35) requires a *joint* (z,e,U,t) minimization. Its z/e part is separable by sample, so it has an exact closed-form update, not an expensive inner optimization:

- A = theta + g/rho; beta=2 rho; q_i=|shat_i|²; w_i=beta/(q_i+beta)
- e_new = complex_soft(r−S A, mu/w), with soft(x,k)=x max(1−k/|x|,0), soft(0,k)=0
- z_new = [conj(shat) elementwise (r−e_new) + beta A]/(q+beta)
- U_new = P(Theta_0+G_0/rho) − lambda/(2D rho) delta_zero_lag
- t_new = theta_t+(g_t−lambda/2)/rho
- Form Hermitian B_new from T(U_new), z_new, t_new
- Theta_new = PSD_projection(B_new−G/rho), by Hermitian eigendecomposition and clipping negative eigenvalues
- G_new = G + rho(Theta_new−B_new)

For CS-AN fix e=0 throughout; use z_new=[conj(shat) r+beta A]/(q+beta). Merely setting mu=0 while leaving e free makes the optimization degenerate: e=r, z=0 has zero objective. The implementation rejects this accidental mode.

Also implemented: `paper_jacobi` retains old e in the corrected z formula and old z in the printed e formula, to inspect Table I's lagged updates rather than quietly pretending they solve (35). `sequential` uses new z for e. `literal_s_rhs` intentionally preserves equation (43)'s unconjugated RHS as a negative-control experiment. Exact-block ADMM is the main objective-authoritative implementation; it is disclosed as a corrected realization of (35), not a byte-for-byte transcription of Table I.

The inverse in the z step is diagonal elementwise division. One iteration costs O(D³) for a full complex Hermitian eigendecomposition plus O(D²) storage/operator work. At M=N=16, the PSD matrix is 257×257 (one complex128 matrix: 1,056,784 bytes). At M=16,N=64 it is 1025×1025 (16,810,000 bytes); eigenwork and temporaries add substantial cost. These are matrix-storage figures, not measured process peak RAM or browser latency.

## Dual, extraction and final gains

Let delta=r−e−S z. Direct differentiation of the objective gives nu=Sᴴ delta. With the above equality-constraint multiplier sign, stationarity gives nu=−2 g. Error KKT: delta_i=mu e_i/|e_i| on nonzero errors, and |delta_i|≤mu elsewhere. Thus nu_i=conj(shat_i) mu e_i/|e_i| on nonzero error samples. This distinction matters for QAM and complex phase conventions.

Compute Q(phi,psi)=a(phi,psi)ᴴ nu. Support candidates have |Q|=lambda under appropriate primal/dual atomic-norm conditions. This is |Q|²=lambda², not |Q|²=lambda. A sampled grid maximum alone does not certify the continuous inequality. The numerical extractor uses a declared 16× oversampling grid, bounded local refinement, candidates above 0.8 lambda and refined acceptance at 0.995 lambda; these are added implementation choices, not recoverable author thresholds. It never receives true frequencies or true target count. No threshold is tuned to figure pixels.

Once frequencies are found, equation (32) is ordinary complex least squares against r−e with dictionary S C. The final gain estimation is part of the receiver, not the shrinkage coefficient returned by an atomic penalty. Report residuals and conditioning. Downstream range/velocity association occurs only after the receiver returns paths. One-to-one matching is an additional evaluation choice; paper (p.19) only specifies existence of a sufficiently close path.

## Printed-vs-derived discrepancies and checks

These are apparent inconsistencies in the fixed source, not claims about what unavailable author code actually ran.

1. Eq (43): source S(r−e) versus Sᴴ(r−e) required by eq (40). An explicit complex-QPSK negative control is retained; literal RHS does not solve (27).
2. Eq (43): identity is printed E_N while the unknown has dimension MN. Required size is D×D.
3. Eq (42): central derivative has N rho U00 rather than MN rho U00, contradicting trace multiplicity and (45).
4. Eq (44): full multiplier symbol appears where its bottom-right scalar is needed.
5. Eqs (45)–(46): printed centered-lag indexing and I1=[1,0,…] are inconsistent; penalty belongs at U00. Negative lag multiplicities need absolute values and valid bounds. For M=3,N=4, lag (−1,−1) has 6 entries, not 20.
6. Eq (46): normalized averaging is called an adjoint. The independent inner-product and left-inverse tests distinguish these operations.
7. Eq (35) versus (43)/(47): simultaneous old-z/old-e updates are not the claimed exact joint minimizer. Exact block update derived above, and a paper-Jacobi variant both tested against an independent SDP.
8. Eq (50): future G^(l+1) appears in a step preceding the multiplier update; eq (36) requires G^l. PSD, rather than strictly positive definite, is required.
9. Lemma 2/Table I/appendix sentence: nu=−g/2 contradicts equations (56) and (58), which imply −2g. Analytic single-atom and SDP cross-checks discriminate the factor of four.
10. Eq (30): inverse conjugated symbol conflicts with (56) and error KKT. For scalar shat=2, r=1, lambda=1, mu=.2, optimum e=.8,z=0 gives nu=.4; the printed inverse gives .1.
11. Table I step 5: lambda−|Q|²=0 conflicts with eq (29)'s magnitude lambda. A lambda=.3 single-atom case has |Q|=.3, so the printed expression equals .21 rather than zero.
12. Eq (16): with noise eigenvectors as columns, the conformable projector is F_n F_nᴴ, not F_nᴴ F_n. Baseline implementation uses the conformable orthogonal projector.
13. The CS-L1 dictionary's Khatri–Rao shorthand cannot directly combine different Mtilde/Ntilde column counts. The intended complete Cartesian grid has Mtilde*Ntilde atoms; implemented explicitly/through a verified Fourier operator.
14. Spectrum-generation paragraph p.16 writes z(mM+n), inconsistent with column-stacked M×N data in (11). We retain index m+Mn and test rectangular M≠N.
15. Eq (21) unconditional norm equality needs the multidimensional certificate qualification above. Same finite SDP solving is independently verified even when that certificate is not established.

## Original figure settings and unresolved reproduction choices

Figures 5–7: fc=2 GHz, Delta_f=5 kHz, T=200 us, CP=100 us, Tbar=300 us, M=16,N=64, nominal N Delta_f bandwidth 320 kHz, observation time 4.8 ms. Strong target −40 dB/sample; two weak targets −50 dB/sample; direct path 0 dB; each clutter −10 dB; noise −40 dB. Scenario 1 has five clutter + three targets + direct path, K=9; scenario 2 has eighty clutter + three targets + direct path, K=84. Clutter gains are complex Gaussian with the stated power. Clutter equivalent velocity is uniform [−3,3] m/s; target velocity uniform [−156,156]; non-direct ranges uniform [1,30] km. QPSK is used, no FEC. BER=.02 in Figs 6–7.

Figure 8 changes N to 16 (therefore nominal bandwidth to 80 kHz), keeps M=16, and changes all three target powers to −40 dB, both direct and each clutter power to −10 dB. Noise remains −40 dB. BER=0:.01:.1; 100 random realizations for each case. Detection gate is strict range error <c/(4N Delta_f)=937.5 m and velocity error <c/(4M Tbar fc)=7.8125 m/s using c=3e8. RMSE is conditional on identified targets. A missing-target count and its denominator are essential; conditional RMSE alone cannot quantify detection.

All atomic methods use lambda=sigma sqrt(D log D), mu=lambda/sqrt(D), rho=.05. For Fig8: lambda≈.3767712 and mu≈.0235482. CS-AN fixes e=0. CS-L1 uses Mtilde=4M,Ntilde=4N and gamma=2 sigma sqrt(2 log(Mtilde*Ntilde)), same unnormalized atoms. MUSIC uses M'=M/2,N'=N/2 and (M/2+1)(N/2+1) overlapping snapshots, with r/shat.

Unspecified and **not** silently inferred from printed curves:

- Exact random seeds, PRNG, scene/noise reuse across BER/methods, target/direct gain phases and direct-path position details
- QPSK Gray-bit labeling, independent-versus-burst bit flips, relationship of BER to symbol errors, reference demodulation algorithm; our declared independent I/Q-bit flips imply SER=2 BER−BER²
- ADMM iteration limit L, stopping tolerances, complex numerical precision, parameter-extraction search grid, support/root threshold, local refinement and duplicate-peak policy
- MUSIC signal-subspace dimension/rank selection and detection threshold. In Fig8 dense clutter K=84 exceeds its 8×8=64-dimensional smoothed aperture; true K is not a valid rank choice. Effective rank selection must be specified
- CS-L1 exact numerical solver/tolerances, post-solve nonzero support tolerance, peak grouping and amplitude threshold
- Near-zero clutter removal width, precise false-alarm definition, target association/reuse, treatment of failed optimizations or zero identified targets
- Figure spectrum dB normalization/reference and whether displayed panels use identical peak thresholds
- Numerical rank/decomposition check for the finite 2-D SDP; the paper reports none

Our simulation uses seed 161004218, NumPy PCG64, unit-energy QPSK with independent bit flips, common scene/noise/bit uniforms across BER, direct path at zero delay/Doppler with real positive amplitude, independent uniform target phases, c=3e8. These are marked choices. Fresh random seeds are not advertised as the original figure's scene.

## Fair baseline and experiment contract

- Paired CS-ANL1 and CS-AN receive exactly the same r/shat, penalty normalization, source geometry and stopping policy. Only e fixed/free changes
- CS-L1 solves the original discrete objective, not a surrogate called atomic norm. Its FFT operator is checked against the explicit complex matrix and FISTA objective against a separate Clarabel solve
- MUSIC forms the source spatial smoothing exactly, but its rank is a required explicit parameter. No experiment silently passes true path count, especially the impossible rank 84 case
- Any oracle-symbol/oracle-support/oracle-rank method must be separately named and must not replace these baselines
- Match total energy, observations, bandwidth and acquisition time. Report algorithm compute separately. All target/scene truth is outside receiver APIs
- Retain failed solves and all misses. Count false alarms against all physical paths, not merely against three moving targets; unmatched clutter is not automatically a false alarm
- This gate's original-size checkpoint is not a 100-realization, 11-BER, two-scenario Figure8 reproduction. The full sweep and Figs6–7 remain separate open gates

## Bounded convergence diagnosis

The 16×16, Scenario1, BER=.02 reference first stopped at its declared 300-second cap. Its raw output remains unchanged. A subsequent continuation restores z,e,Theta and the unscaled multiplier G, and preserves rho=.05 and the original stopping thresholds. This reaches the same solver trajectory that an uninterrupted larger-budget run would follow; elapsed-time totals include serialization and concurrent-job effects only as recorded.

A separately labelled adaptive diagnostic tests the usual raw-residual balancing rule every 25 iterations: double rho when primal >10 dual, halve it when dual >10 primal, bounds [1e−5,10]. G is unscaled and is not rescaled when rho changes. In this particular resumed robust solve the trigger never fires; it produces exactly the fixed-rho iterate and no speedup is claimed. A separate fresh CS-AN ablation may change rho and must be labelled accordingly. All variants use the same objective and the same convergence thresholds; the source-default failure is never erased.

## Physical approximation stress at source endpoints

The source's own maximum equivalent speed 156 m/s at 2 GHz implies |fD|=1040 Hz. With Tbar=300 us, |fD Tbar|=.312 cycles; during useful T=200 us the value is .208 cycles, also fD/Delta_f=.208. These are not very small compared with one. The reproduction directly simulates the paper's post-FFT equation (6), as its stated model does; it does **not** establish that the constant-phase-within-block approximation in equation (3) is accurate at those endpoints. A separate waveform-level OFDM/ICI stress test is required before any physical receiver robustness claim. This mismatch is retained, not fixed by silently lowering target speeds.

## Numerical certificate versus solver agreement

The original-size ADMM and SCS objectives agree much more tightly than a conservative feasible-bound certificate necessarily does. `certify_sdp.py` repairs the tiny negative primal eigenvalue by a uniform diagonal shift and repairs dual moment equalities followed by mixing with a strictly feasible diagonal dual matrix. It reports explicit feasible upper/lower values, moment/PSD residuals and the remaining gap. These are floating-point finite-SDP checks, not exact interval arithmetic, and do not certify equality of the multidimensional atomic norm. Do not equate a 1.3e−7 cross-solver objective difference with a 1.3e−7 rigorous error bound to the exact optimum.
