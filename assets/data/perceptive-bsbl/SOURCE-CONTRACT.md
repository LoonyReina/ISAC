# Perceptive: frozen bounded reference contract (v1)

This is an original mathematical implementation, not a transcription of an author simulator, not a Figure 4 reproduction, and not yet a browser implementation. Governing accepted manuscript: https://opus.lib.uts.edu.au/bitstream/10453/137860/4/Framework%20for%20a%20Perceptive%20Mobile%20Network.pdf, SHA256 a51c363bbb6b6a646a1de1ff20054722db60ad7ec2a303421d570ae5b8d82172. The source-links manifest records other immutable sources. Copyrighted sources remain outside this deliverable. No external source code is run, copied, or redistributed.

## 1. Observable forward model

Tone indices n=0,...,63; N=64, B=20 MHz, f0=B/N. Two transmitters k=0,1 with two elements a=0,1 each; receive elements m=0,...,3. Known symbols s[n,k,a] are independent QPSK with squared magnitude 1/4 (unit aggregate energy per tone). Define a_M(phi)[m]=exp(-j pi m sin(phi)), evaluating accepted Eq.(1)'s final Hermitian transpose literally. All products below are ordinary transposes, not Hermitian transposes.

At one t=0 snapshot, Y[n,m] = sum_l b_l exp(-j 2 pi n f0 tau_l) a_M(phi_l)[m] sum_a s[n,k_l,a] a_MT(theta_l)[a] + Z[n,m]. Noise is proper-complex, E|Z|²=sigma²; both I and Q have variance sigma²/2. Gain b is a complex amplitude, |b|² a power; steering is unnormalized.

Grid g=2, q=0,...,31, tau_q=q/(gB)=25q ns. Define column r=q*d+k*MT+a, d=K*MT=4. W[n,r]=exp(-j 2 pi n q/(gN)) s[n,k,a]. X[q*d+k*MT+a,m] is the sum of b_l a_MT(theta_l)[a] a_M(phi_l)[m] for paths sharing (q,k). Then Y=W X+Z exactly on-grid. W is 64x128, X is 128x4. Off-grid observations use their true continuous delays in the path sum; no fictitious exact on-grid X is asserted.

Solver inputs are ONLY W, Y, sigma², block size, algorithm options. W itself is built ONLY from known symbols, tones and grid. Truth is separately generated and evaluated; support, path count, user association and angles are never passed to practical solvers. The known-support LS diagnostic is explicitly privileged. Frequency delay grid is a numerical parameter, not doubled physical resolution. Total path length is c*tau, not c*tau/2. CP=0.8 microseconds covers the final 775 ns grid point; useful symbol=3.2 microseconds, total=4 microseconds.

## 2. Explicit Bayesian working model and derivation

Columns x_r are independently CN(0,Gamma) as a recovery regularizer, Gamma=blockdiag(gamma_q I_d); noise columns independently CN(0,sigma² I). Actual receive-array columns are deterministic linked observations, not independent physical path realizations. Integrating x yields C=sigma² I+W Gamma W^H and p(Y)=pi^(-NR) det(C)^(-R) exp(-tr(Y^H C^-1Y)). Thus J=R logdet(C)+tr(Y^H C^-1Y), omitting constants. R is Y's column count.

Completing the joint Gaussian square (or Gaussian conditioning) gives mu=Gamma W^H C^-1Y and Sigma=Gamma-Gamma W^H C^-1 W Gamma. Sigma is the row covariance for each working-model column. No inverse is formed for C; positive-definite Hermitian Cholesky solves/log diagonals are used. sigma² is fixed known variance, never learned or silently rescaled.

Leave out block q: C_-=C-gamma_q W_q W_q^H, s=W_q^H C_-^-1 W_q, Q=W_q^H C_-^-1Y. Matrix determinant lemma and Woodbury give
L_q(gamma)=R logdet(I+gamma s)-tr[Q^H gamma(I+gamma s)^-1 Q].
For candidate gamma', delta J=L_q(gamma')-L_q(gamma). With s=U diag(lambda_i) U^H and u_i=||(U^H Q)[i,:]||²,
L_q(gamma)=sum_i [R log(1+gamma lambda_i)-gamma u_i/(1+gamma lambda_i)]
and L'_q(gamma)=sum_i [R lambda_i/(1+gamma lambda_i)-u_i/(1+gamma lambda_i)^2].
The full-evidence gradient follows dJ/dgamma_q=R tr(W_q^H C^-1W_q)-||W_q^H C^-1Y||_F². This and the scalar derivative are checked by central finite differences.

For s=lambda I_d, the constrained optimum is max(0,(sum_i u_i/(R*d)-lambda)/lambda²). For general s the scalar objective need not be unimodal. No single root or projected covariance is advertised as its global minimizer.

## 3. Named algorithms and limits

Primary `mmv_fm_projected`: a mathematically model-consistent, correlation-off, fast-marginal *proposal* interpretation. Each candidate has A=s^-1(Q Q^H/R-s)s^-1 and gamma'=max(0,real(tr(A))/d). This is the trace projection of an unrestricted stationary covariance to gamma I; it is NOT guaranteed to minimize the scalar constrained objective. Preserve add/re-estimate/delete bookkeeping, select the deepest negative predicted delta J, independently recompute dense J before accepting, and reject any inconsistent/uphill step. Stop when no candidate improves by tolerance, at cap, or on an explicitly logged numerical failure. `no_improving_projected_candidate` means no proposal improves, NOT stationarity or global convergence. Rank-deficient candidate blocks are skipped with a recorded warning instead of an undocumented inverse repair.

Diagnostic `single_log_fm_projected`: identical original proposal framework but uses R_eff=1 for both the covariance proposal and objective. This isolates the pinned author's omitted-MMV-normalization behavior. It is literal-source-inspired; it does not reproduce the author's initialization, data normalization, stopping schedule or every line of code. Its accepted actions minimize its declared single-logdet objective and can increase the proper MMV objective. Both objectives are logged. The scalar four-column counterexample is mandatory.

An independent bounded scalar minimization checker is diagnostic, not a silent replacement of either FM iteration. A row-SBL baseline uses the same MMV objective with block size one. Block OMP uses the same raw W,Y and known noise variance; no true path count. Known-support LS is an information-privileged diagnostic, not a performance bound or a practical competing receiver. Post-recovery common LS refitting is not included in the primary estimator.

## 4. Parameter extraction and detection

For each recovered transmitter sub-block B (MT x M), calculate c_rx=sum conj(B[a,m])*B[a,m+1], c_tx=sum conj(B[a,m])*B[a+1,m]. With the literal negative steering convention, sin(phi)=-arg(c_rx)/pi and sin(theta)=-arg(c_tx)/pi. The accepted Eq.(16)'s positive sign instead returns the negative angle for an isolated known path. Both signs are retained in unit evidence. Arcsin returns the declared unambiguous half-plane [-90,90] degrees. Endfire wrapping remains intrinsically ambiguous.

For a single path, ||B||_F²/(MT*M)=|b|², and |c_rx|/[MT*(M-1)]=|b|². Accepted Eq.(18)'s unnormalized adjacent sum scales by MT*(M-1). A rank-one outer-product fit gives the complex amplitude after angle estimation. A rank-residual diagnostic is reported but cannot certify absence of same-delay/same-transmitter multipath. Such a sum is unsupported for separate angle recovery; it produces one block-level estimate, never truth-fed multiple points.

Detection thresholds are practical heuristics selected using separately seeded validation/noise-only observations; no calibrated false-alarm claim. Support and transmitter association are not confused: a delay block can contain two user sub-blocks. Every selected (q,k) estimate is retained, matched with a fixed delay gate and Hungarian rule; unmatched truth is a miss, unmatched estimate spurious. Errors on matches always accompany miss/spurious denominators.

## 5. Source ambiguity / missing settings ledger

- Accepted Eqs.(2)-(4) use positive temporal Doppler phase, Eqs.(12),(14),(15) negative. t=0 avoids claiming resolution; later Doppler work must choose and test signs.
- Eq.(1) Hermitian notation and Eq.(16) angle sign disagree under literal evaluation. This release explicitly uses the former and the derived extraction correction.
- Eq.(18)'s stated power needs array normalization. We state amplitude/power and steering normalization separately.
- Direct source cites primarily SMV BSBL-FM; neither the paper nor pinned code resolves independent-column MMV normalization. MMV paper also has dimension/normalization ambiguities. This reference is a justified interpretation plus diagnostic.
- Frobenius and trace block relevance conventions differ across lineage versions; we choose trace/d explicitly.
- Pinned code has no established redistribution license. Read-only inspection only; source code and PDFs are outside the bundle.
- No paper-specific official simulator or fixed random scene located by prior bounded search. Original Np window, seeds, gain/precoder law, detailed pathloss normalization, solver variant, noise plane, pruning, stopping and association settings prevent literal Fig.4 reproduction.
- Bounded configuration and normalized gains are teaching choices, not source RCS/pathloss fidelity. Off-grid and paired SNR sweep are extensions. No claim of universal baseline superiority.
- Indirect estimated-channel branch, Doppler, clutter, same-delay/same-transmitter separation, full source-size reproduction and browser/site integration are out of this release.
