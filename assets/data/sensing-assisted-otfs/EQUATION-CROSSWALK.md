# Independent source audit: sensing-assisted OTFS uplink

Audit date: 2026-10-13 UTC. Scope: fixed-source mathematical audit and tiny independent numerical oracles. No website changes, receiver acceptance, source-sized experiment, original figure reproduction, or author-code equivalence is claimed.

## 1. Primary sources and provenance

- Selected paper: Yuan et al., *Integrated Sensing and Communication-assisted Orthogonal Time Frequency Space Transmission for Vehicular Networks*, [arXiv:2105.03125v2](https://arxiv.org/pdf/2105.03125v2), 11 May 2021, 13 PDF pages. SHA-256 `57e8c349ee32452bd53d42625da4295c6e4014ca1c2e52bb17584fea40ce1f98`. All equation numbers below are printed PDF numbers, not HTML numbering. PDF pages 5, 8, 9, and 12 carry the relevant formulas. Local source is `source/2105.03125v2.pdf` with extracted text. Eq.57 parentheses were inspected in the rendered original page, not inferred from text extraction.
- Guarded-estimation primary preprint: Raviteja, Phan, and Hong, *Embedded Pilot-Aided Channel Estimation for OTFS in Delay-Doppler Channels*, [arXiv:1808.08360v1](https://arxiv.org/pdf/1808.08360v1), 25 August 2018. SHA-256 `ba04c7eaef1f5faff4eb91bd6307ed609b21a1def2f1182607c2ab456f841c43`, 10 PDF pages. The unversioned and fixed-v1 downloads matched byte-for-byte. The 2019 journal identity is DOI 10.1109/TVT.2019.2906357. This audit pins the primary preprint, not an asserted byte-identical accepted/journal version.
- The originally suggested author-hosted URL `https://www.ecse.monash.edu.au/staff/eviterbo/papers/tvt19RavitejaChannelEst.pdf` redirected to a Monash department page. The `ecse.monash.edu` alternative also returned non-PDF content. The response is retained as `source/raviteja-author-redirect.html`; it is not cited as mathematical evidence.

## 2. Minimal coherent model and units

Use N Doppler bins, M delay bins, row-major coordinates r=(k,l), k in 0..N-1 and l in 0..M-1. Let T have units seconds and Delta_f have units Hz. Therefore

- Doppler resolution is 1/(NT), and integer Doppler index is k_p = nu_p NT
- Delay resolution is 1/(M Delta_f), and integer delay index is l_p = tau_p M Delta_f
- Define s_p=(k_p,l_p), with modulo N on the first coordinate and modulo M on the second

The effective scalar coefficient is a_p = sqrt(Nr) kappa_p h_p exp(-j 2 pi nu_p tau_p), where kappa_p = g_p^H b(theta_p), if Eq.19 is the starting normalization. The bounded model is

    y[r] = sum_p a_p x[r-s_p] + n[r], n[r] iid CN(0,N0)

Here N0 is the complex sample variance after the explicitly declared effective receive combining and unitary DD transforms. The paper sometimes calls N0 a PSD; identifying that PSD numerically with this sample variance requires pulse/receiver normalization. This audit does not infer the missing normalization.

This choice absorbs, rather than physically removes, the individual path phases and combining factors. It estimates effective a_p, not the unscaled physical h_p. Predicted integer support is receiver input; truth support, physical gains, transmitted unknown bits, and realized gain errors are evaluation-only. A support mismatch must remain a mismatch. Repeated modulo supports must be aggregated coherently or rejected; they do not provide separately identifiable coefficients.

### Independent shift/transform check

The source ISFFT/SFFT signs give X[n,m] proportional to sum x[k,l] exp(j2pi(nk/N-ml/M)). Multiplication by an integer-tap TF response a_p exp(j2pi(nk_p/N-ml_p/M)), followed by the source SFFT, yields x[(k-k_p)_N,(l-l_p)_M]. The independent test uses explicit source-to-destination scattering and separate double transform sums. An impulse at (3,4) in a 4x5 frame through s=(2,3) arrives at (1,2).

## 3. Equation-by-equation decisions

| Source | Printed expression / assumption | Audit decision |
|---|---|---|
| Eq.19 | Second symbol coordinate is (k-l_p)_M; text states k_p=nu_p/(NT), l_p=tau_p/(M Delta_f) | Literal expressions conflict with coordinate roles and dimensions. Adopt (l-l_p)_M and products nu_p NT, tau_p M Delta_f, explicitly as audited corrections |
| Eqs.19-22 | Eq.19 includes sqrt(Nr) and beam gains; Eq.21 omits these in its stated effective channel | Declare a single effective-gain normalization; do not claim all printed coefficients are identical |
| Eq.22 | Both Dirichlet exponents are negative | For integer support these give the same Kronecker support. Do not silently extend the integer audited model to fractional delay/Doppler; transform phase conventions then need a new derivation |
| Eq.39 | One pilot occupies (k_pl,l_pl); other cells carry data | Pilot replaces one data cell. Zero guards does not mean zero pilot energy or MN unknown information symbols. Data count is MN-1 |
| Eqs.40-41 | y at pilot arrival divided by x_pl is called h_hat | This estimates effective a_p under our model and distinct exact support. Physical h_p would need known, nonzero combining/phase scaling. No current-frame true h enters the receiver |
| Eq.42 | sigma_p^2=(P Es+N0)/Ep, approximately P Es/Ep | Not exact conditional contamination variance: it lacks path powers and counts P rather than the P-1 other symbols for distinct support. P=1 disproves the noiseless contamination term. Retain as a literal-source diagnostic |
| Eq.43 | Symbol-wise MAP is argmax of a marginal | Valid definition; exhaustive marginal MAP differs from maximum-probability joint word. Approximate SPA must not be called exact ML/MAP |
| Eq.44 | Marginalize all other symbols | Valid finite-sum definition with explicit pilot constraint |
| Eq.45 | p(x|y)=p(x)p(y|x) | Missing evidence normalizer. Use proportionality followed by normalization |
| Eqs.46-47 | Independent noise permits product likelihood with channel coefficients fixed | Exact for independent sample noise conditional on fixed known gains. Not a product of independent scalar factors after marginalizing the same uncertain gains shared across observations. Eq.47 also drops sqrt(Nr); effective-gain declaration resolves the implementation scaling, not the literal text |
| Eq.47 phase statement | exp(-j2pi nu_p tau_p) is assumed compensated | A single scalar rotation of an already mixed y cannot remove unequal path phases. Separate path-isolated beam outputs could permit pathwise correction, but isolation, residual leakage, and noise covariance would require their own model. Retaining phase in a_p avoids granting unavailable operations |
| Eq.48 | Independent symbol priors | Valid chosen prior before observation. Pilot is a delta prior, not random BPSK |
| Eq.49 | Variable-to-factor product excludes destination factor | Correct extrinsic rule for uniform priors, up to normalization. For nonuniform priors include p(x). A full belief cannot be reused as an extrinsic message without removing the destination contribution |
| Eq.50 | Sum over the other symbols times incoming messages | Exact factor-to-variable finite mixture given the assumed conditional factor. Generally not a single Gaussian |
| Eq.51 | Incoming discrete mass with probabilities p_q | Normalize probabilities on every edge; probabilities are edge-specific. Pilot/guards must be clamped |
| Eq.52 | Under sum over p' != p, mean uses X[p] | Literal index repeats the target mean. Interference cancellation requires the corresponding interferer mean X[p']. Record this as an index correction |
| Eq.53 | Noise plus sum |a_hat_p'|^2 Var X_p', divided by |a_hat_p|^2 | A circular-Gaussian moment approximation. With BPSK even the exact interference is generally improper; a scalar variance loses pseudocovariance. Implementing likelihoods in residual units avoids dividing by a zero/weak a_hat_p |
| Eqs.54-55 | Discrete first/second moments | Correct when each probability vector is normalized; known pilot second moment is Ep, not Es |
| Eq.56 | Variance of a product of independent complex scalars | Correct for covariance variance E|z-Ez|^2. It does not establish independence of a same-frame gain error and data, or of posterior gain/data beliefs |
| Eq.57 | Outer Es multiplies all of sigma_p^2 + (|kappa_p' h_hat_p'|^2+sigma_p^2) Var X_p' inside the sum p' != p | Verified visually. Literal formula uses target uncertainty for each interferer, scales the known-channel variance by Es, and adds a redundant uncertainty*symbol-variance term compared with constant-modulus Eq.56. It omits target-candidate uncertainty entirely. Keep literal parentheses/indices in a diagnostic; do not silently call a repaired formula Eq.57 |
| Eq.58 | Full belief is product of all incoming factor messages | Include prior if nonuniform and normalize; all neighbors belong here, unlike Eq.49 |
| Eq.59 | Numerator is product of edge p_q[p], denominator is sum of already named p_q | Self-referential as printed. Define unnormalized w_q=prior_q product_p p_q[p], then p_q=w_q/sum_q' w_q'. A normalized existing p summing to 1 cannot normalize a new product |

## 4. Exact gain-error moments, including correlations

Let q be the pilot cell, x_pl be its known nonzero complex amplitude, Ep=|x_pl|^2. Let all other data cells d_t be independent real BPSK +/-sqrt(Es). Condition on actual effective coefficients a and exact, distinct modulo supports.

At r_p=q+s_p,

    a_hat_p = a_p + e_p
    e_p = sum_{j != p} (a_j/x_pl) d_{q+s_p-s_j} + n[r_p]/x_pl

Define B[p,t] as the sum of a_j/x_pl for every interfering path whose shifted data cell equals t. Then e=B d+eta. Reusing the same d cell in two rows must reuse the same random variable, not independent synthetic contaminants.

    E[e | a] = 0
    C_e = E[e e^H | a] = Es B B^H + (N0/Ep) Q
    P_e = E[e e^T | a] = Es B B^T
    Cov(e,d) = Es B

Q[p,q] is 1 exactly when r_p=r_q, otherwise zero. Distinct support gives Q=I. Noise is proper complex so contributes zero pseudocovariance. For distinct support, each row has distinct interfering data cells and

    C_e[p,p] = (Es sum_{j != p}|a_j|^2 + N0)/Ep

The P=1 variance is N0/Ep. Unequal complex gains yield unequal variances. Shared contamination yields nonzero off-diagonal covariance; BPSK generally yields nonzero pseudocovariance; gain errors are correlated with contaminating data. There is also shared raw-observation noise: Cov(e_p,n[r])=(N0/x_pl) 1_{r=r_p}. All of these are conditional physical-model facts, not optional Monte Carlo assumptions.

If supports coincide, the known pilot contribution in a_hat_p is the coherent sum over all paths sharing s_p. The estimator is biased as an estimate of an individual a_p by the other colliding coefficients. The same arrival noise is reused exactly. Aggregate equal-modulo supports first if an identifiable effective channel is desired. Two independent per-path estimates from the same cell would be invented information.

### Frozen nontrivial fixture

N=M=3; q=(0,1); x_pl=3+4j; Es=.7; N0=.13; s=[(0,0),(1,0),(2,0)]; a=[1+.2j,-.45+.7j,.15-.35j]. Unknown data cells are row-major with the pilot removed. Enumerate all 256 words using 0->-sqrt(Es), 1->+sqrt(Es).

The conditional variance diagonal is [0.02865, 0.03838, 0.05371]. Literal Eq.42 returns 0.0892 for every path. An example off-diagonal C_e[0,1]=-0.00651-0.01211j. P_e[0,0]=-0.0167188+0.0161784j. All full matrices and exact posterior inputs/results are in `independent-fixtures.json`.

## 5. What a repaired SPA may and may not claim

For an explicitly chosen independent-error surrogate, suppose effective a_p is approximated by mean a_hat_p and scalar variance v_p, independent across p and independent of each incoming symbol. Let m_j, V_j, S_j=V_j+|m_j|^2 denote its first, variance, and second moments. Then Eq.56 implies

    Var(a_j X_j) = |a_hat_j|^2 V_j + v_j S_j

For BPSK unknown data S_j=Es. For the known pilot, V_j=0 and S_j=Ep. A candidate-aware scalar likelihood for target p and candidate c can use

    mu = sum_{j != p} a_hat_j m_j
    R(c) = N0 + sum_{j != p} (|a_hat_j|^2 V_j + v_j S_j) + v_p |c|^2
    log psi(c) = -|y-mu-a_hat_p c|^2/R(c) - log R(c) + constant

The log-variance term matters for nonconstant-modulus candidates. With BPSK constant magnitude it cancels within the two candidates, but the target variance still influences confidence and P=1 behavior. At v=0, this returns Eq.53's moment numerator without an outer Es. Use residual-domain expressions so a_hat=0 remains a finite uninformative message where appropriate.

This is an **audited moment-repaired independent-error diagonal circular-Gaussian surrogate**, not an exact derivation of the fixed paper or of the same-frame channel-estimation posterior. In the actual experiment h_hat is computed from y; e and data, errors across paths, and effective residuals across observations are dependent. Even P=1 yields residual n[r]-(n[r_p]/x_pl)x[r-s_p] after gain substitution; pilot-arrival residual is identically zero. Marginalizing shared gain uncertainty does not restore Eq.46's independent observation factors.

Receiver-usable v_p may be based on explicitly supplied population path powers lambda_j:

    v_p = (Es sum_{j != p} lambda_j + N0)/Ep

This is a declared statistical approximation. Exact conditional v_p using realized true gains is evaluation-only and must not be supplied to the practical detector. If an integrated oracle assumes a~CN(0,diag(lambda)), do not subsequently normalize each drawn gain vector to unit norm: that changes the prior and invalidates that Gaussian integration.

### Three distinct verification targets

1. Arithmetic: exact finite Eq.50 summation under a fixed known-gain factor; edge normalization, extrinsic exclusions, indexing, zero-gain stability
2. Approximation: circular Gaussian moment messages need not equal finite mixtures or exact full-graph posterior; quantify rather than hide discrepancy
3. Physical uncertainty: exact tiny Bayesian posterior integrates physical gains for each whole candidate word, p(y|x)=CN(y;0,A_x diag(lambda) A_x^H+N0 I). It conditions on y once. a_hat is a deterministic function of y and contributes no additional independent evidence

The independent factor fixture returns probability of negative BPSK 7.1248921558e-9 under the exact finite mixture, versus .01159116938 under its circular moment approximation. This difference is expected approximation error, not a numerical parity tolerance.

## 6. Guarded baseline: exact preprint mask and energy ledger

Use the pinned Raviteja primary preprint's integer-Doppler ideal-pulse model only. Its Eq.1 gives the same physical bin dimensions, and Eq.2 gives the same circular integer shifts with effective phase h_bar=h exp(-j2pi nu tau). Thus the guarded mask may be compared on our explicitly declared effective scalar channel; rectangular-pulse or fractional-Doppler variants require separate derivations.

Let support limits be k in [-K,K], l in [0,L]. Put pilot at (k_pl,l_pl), with no wrapping of the source's centered guard rectangle: k_pl +/-2K in range and l_pl +/-L in range.

- Transmit Eq.4: pilot at its cell; zero elsewhere in the inclusive rectangle k_pl-2K <= k <= k_pl+2K and l_pl-L <= l <= l_pl+L; data outside
- Guard count G=(4K+1)(2L+1)-1; pilot count 1; data count D=MN-(4K+1)(2L+1)
- Channel-estimation observations: inclusive k_pl-K..k_pl+K and l_pl..l_pl+L, count (2K+1)(L+1)
- Eq.5: each such observation is its shifted pilot coefficient plus noise, with no data contamination under the stated support limits
- Threshold: for every candidate cell in the complete estimation rectangle, if |y[k,l]| >= T, declare a path and estimate effective gain y[k,l]/x_pl; otherwise set indicator and gain to zero. No truth-support filtering, fixed true path count, or oracle strongest-P pruning is permitted
- T is a tunable threshold; the preprint's integer-Doppler simulation uses T=3 sigma, where noise is CN(0,sigma^2). This is not claimed to be universally optimal. For our noise N0, this choice is 3 sqrt(N0); a pure-noise cell's false-alarm probability is exp(-9)
- Remove the estimation rectangle from data-detection observations as the preprint specifies; guards remain known zeros. Pilot contribution has no support outside that rectangle for the exact integer support bounds

For N=30,M=128,K=6,L=10, the inclusive primary mask yields 524 guards, 1 pilot, 3315 data, and 143 CE observations. The selected 2021 paper Table II instead states 480=8KL guards, 12.5%. These are different counts. Its approximation omits boundary terms; do not relabel the exact mask as 480 guards. Guard-free Eq.39 has 3839 data and one pilot, despite prose describing all grids as data/zero overhead.

For data power Es and pilot ratio rho=Ep/Es:

    E_guard_free = (MN-1+rho) Es
    E_guarded = (MN-G-1+rho) Es

At rho=100, these are 3939 Es and 3415 Es, respectively, for the exact source-sized mask. Per-data-symbol SNR Es/N0 and equal-total-frame energy are different comparisons. An equal-energy experiment must scale pilot and data amplitudes together separately for each mask while preserving rho, duration, bandwidth, channel, and noise. Compare BER with explicit bit counts and correctly received useful bits per frame. Different masks produce different transmitted x and received y; only channel/noise draws can be shared. Do not label a guard-free versus guarded comparison 'same y'.

## 7. Verification files and open gates

`audit_oracle.py` is independent of the reference worker's implementation. It imports NumPy only. `python3 audit_oracle.py` runs 28 assertions and writes `independent-fixtures.json`. Coverage includes exhaustive BPSK covariance/pseudocovariance/crosscovariance; independent random contamination/noise moments; transform/impulse shifts; P=1; duplicate support/noise; impossible global phase removal; exact factor and exact whole-frame marginal oracles; literal Eq.57 zero-uncertainty discrepancy at Es!=1; zero-gain residual likelihood; extrinsic versus full messages; Eq.59 normalizer; exact guard mask and threshold inclusion.

All 28 checks passed in the recorded run. Fixtures preserve discrepancies and do not assert the approximation equals exact posterior. The audit must still be compared with the separately implemented reference. It does not certify receiver code not inspected here. Independent numerical review, paired quantitative experiment, source-sized settings reconciliation, predictor validity, UI/browser behavior, and deployment remain separate gates.
