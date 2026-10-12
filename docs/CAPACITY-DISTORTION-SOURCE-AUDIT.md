# Audit: memoryless joint state sensing and communication

## Decision and scope

Implement a general finite-alphabet modified Blahut–Arimoto (BA) solver, then reproduce the binary experiment in Figure 2. This is a substantive reproduction of the paper's numerical method and one complete experiment. It is **not** a complete-paper reproduction: the Gaussian experiment in Figure 3 has a separate unresolved coverage gate below.

A plot obtained only from binary entropy reproduces the binary analytical proposition; it does not reproduce the proposed numerical algorithm. A Monte Carlo binary channel demo without input-distribution optimization also does not satisfy the algorithm gate.

Pinned primary source: [arXiv 1805.05713v1, 15 May 2018](https://arxiv.org/pdf/1805.05713v1). This audit used that PDF, including visual inspection of pages 4–5. Authors: Mari Kobayashi, Giuseppe Caire, Gerhard Kramer. Page numbers below are one-based PDF pages.

## Source map

- Page 1, Eq. 1: memoryless state-dependent channel, i.i.d. states, strictly causal generalized feedback
- Page 2, Eqs. 3–4: capacity objective and symbolwise Bayes estimator; receiver knows the state
- Page 3, Eqs. 13–16: cost/distortion constraints, mutual information, induced sensing cost
- Page 4, Eqs. 17–25: penalized optimization, posterior/softmax/dual iterations, output pair
- Pages 4–5, Eqs. 26–28, Fig. 2: binary multiplicative channel, Hamming loss, q=0.4
- Page 5, Eq. 29, Fig. 3: real Gaussian channel, Gaussian state/noise, P=10 dB, quadratic loss

Direct links: [algorithm, page 4](https://arxiv.org/pdf/1805.05713v1#page=4), [experiments, page 5](https://arxiv.org/pdf/1805.05713v1#page=5).

The implementation choices, certificates, independent derivations, and numerical tests below are this audit's work. They must not be attributed to unspecified author code.

## General finite-alphabet contract

Inputs:

- `stateProb[s]`, normalized nonnegative probabilities
- `channel[s][x][y][z] = Pr(Y=y,Z=z | X=x,S=s)`, each `(s,x)` row normalized
- `loss[s][h]`, finite nonnegative distortion for reconstruction symbol h
- `inputCost[x] = b_x`, finite nonnegative cost; `budgetB`
- `muNats >= 0`, penalty on expected distortion in a natural-log objective
- declared numerical tolerances, iteration limits, and dual-update strategy

Derived marginals: `wy[s][x][y] = sum_z channel[s][x][y][z]`; `vz[s][x][z] = sum_y channel[s][x][y][z]`. Separate marginals are sufficient for this optimization, but accepting the joint tensor keeps the system model explicit. Correlation between Y and Z need not be fabricated or assumed independent. The supplied non-paper test fixture explicitly uses conditional independence only to construct a valid joint tensor.

The input X is independent of current S. The encoder's feedback does not mean it knows the current state. The receiver's perfect state knowledge is essential: calculate I(X;Y|S), not I(X;Y). No finite blocklength encoder, decoder, BER, radar range, angle, waveform, or CRB is provided by this model.

### Bayes preprocessing, robust derivation

For each `(x,z,h)`, compute

`risk[x,z,h] = sum_s stateProb[s] * vz[s,x,z] * loss[s,h]`.

Then

`estimator[x,z] = argmin_h risk[x,z,h]`,

`c[x] = sum_z min_h risk[x,z,h]`.

This is algebraically equivalent to the posterior form in Eqs. 4 and 16. It avoids dividing by zero for impossible feedback outputs, and shows why c is independent of the candidate input distribution. Break estimator ties deterministically; all tied choices have the same risk. For an impossible `(x,z)`, any reconstruction is harmless.

### Objective and outputs

For p on the input simplex, let `r[s,y]=sum_x p[x] wy[s,x,y]` and

`I_nats(p) = sum_s,x,y ps[s] p[x] wy[s,x,y] ln(wy[s,x,y]/r[s,y])`.

Solve `max_p F_mu(p)=I_nats(p)-muNats*c·p` subject to `b·p <= B`.

Return at least:

- p, estimator, c
- rate `I_nats/ln(2)` in bits/channel use
- achieved distortion `c·p`, achieved cost `b·p`
- mu, lambda, objective, lower and upper bound, bound gap, feasibility/complementarity residuals
- complete outer-iteration trace and inner-iteration counts
- status: converged, infeasible, iteration limit, numerical failure, or exact boundary solution

Distinguish an achieved distortion from a requested upper bound. The efficient parametric curve has output D(mu); it is not valid to relabel mu as D.

### Log units

Use natural logarithms with the exponential update. Convert only the displayed mutual information to bits. To expose penalties for an objective measured in bits, use

`muNats=ln(2)*muBits`, `lambdaNats=ln(2)*lambdaBits`.

Mixing log2 inside g with exp outside g changes the algorithm. An equivalent all-bits implementation would use a base-2 exponential with consistent dual scaling.

## Canonical numerical algorithm

Initialize p uniformly over the allowed input alphabet, as the paper does. For each outer iteration k:

1. Posterior update, Eq. 22:
   `Q_k[x|y,s] = p_prev[x]*wy[s,x,y]/r_prev[s,y]`.
2. Cache `a[x] = sum_s,y ps[s]*wy[s,x,y]*ln(Q_k[x|y,s]) - mu*c[x]`.
3. Solve the cost-constrained input update with projected dual iterations:
   - `p_lambda[x] = softmax_x(a[x]-lambda*b[x])` (Eq. 23)
   - `lambda_next=max(0,lambda+alpha*(b·p_lambda-B))` (Eq. 24)
   - continue until the inner solve is sufficiently accurate; return p and lambda evaluated at the same final dual value
4. Evaluate all metrics and the independent global certificate below. Stop only when its gap and primal feasibility pass declared tolerances.

This is alternating maximization in p and Q. For fixed Q, the convex dual is

`h(lambda)=logsumexp(a-lambda*b)+lambda*B`.

Its derivative is `B-b·p_lambda`; therefore the plus sign in Eq. 24 is correct for dual minimization. Its second derivative is `Var_p(b) >= 0`.

### Inactive costs, feasibility, and numerical boundaries

- If the unconstrained `softmax(a)` already has cost at most B, return lambda=0. Do not force equality
- `B < min_x b[x]` is infeasible. Reject before iterating
- Normalize cost units or use scale-aware residuals; never mistake a merely small positive budget gap for an exact boundary (e.g. b=[0,1e-12], B=1e-13 still permits Pr(X=1)=.1). Test invariance under common positive scaling of b and B
- If `B = min_x b[x]`, all probability must lie on the minimum-cost inputs. Reduce to this exact support and solve there; an infinite lambda should not be simulated by an arbitrary large number
- A constant b with an admissible B has no active dual search. This includes Figure 2's neutral cost representation
- For a general simultaneous `(B,D)` request, first check feasibility of the two linear constraints. Sweeping mu gives supporting points; it does not eliminate the possibility of an infeasible request
- The paper does not supply a step-size schedule, stopping tolerances, maximum iterations, or a mu grid. These are implementation choices and must be labeled
- A mathematically safe constant inner step choice is `alpha=1/max(1,(max(b)-min(b))^2)`, because the dual derivative has Lipschitz constant at most `(range b)^2/4`. This is a proposed default, not a quoted paper parameter
- Bracketed bisection on lambda solves the same fixed-Q subproblem and is a useful cross-check/fallback. If used, disclose that it replaces the printed projected-gradient inner loop; retain and test the canonical Eq. 24 path if claiming a literal algorithm reproduction
- Possible initial defaults: probability/cost feasibility tolerance 1e-10, outer certified objective gap 1e-9 nats, max outer iterations 10000, max inner iterations 10000. Measure runtime before selecting UI budgets. A cap produces an unconverged result, not success

### Support and zeros

Use `0*ln(0)=0` only when the corresponding probability weight is zero. Skip zero-state-probability rows and zero channel probabilities. For globally unreachable `(s,y)` outputs, the posterior can be arbitrary because its objective weight is zero.

Maintain log probabilities and use logsumexp where practical. A finite-mu optimum can have very small probabilities. Clipping to an arbitrary positive epsilon changes cost feasibility and the optimum; dropping an underflowed symbol can irreversibly remove useful support. If an implementation cannot retain enough numerical dynamic range, return a warning/failure rather than a falsely certified solution. For cost-forced exact support reductions, record the reduced alphabet and compute certificates on that feasible alphabet.

The outer objective should be nondecreasing after complete feasible inner solves (up to numerical tolerance). Uniform initialization can itself violate the cost constraint, so do not apply that feasibility-based assertion to the initial point before the first constrained update.

## Independent global certificate (derived here)

At current p, define

`d_x = sum_s ps[s] KL(wy[s,x,:] || r[s,:])`.

For any feasible candidate v,

`I(v) = sum_x v[x] d_x - sum_s ps[s] KL(r_v[s,:] || r_p[s,:]) <= sum_x v[x] d_x`.

Consequently, for any lambda >= 0,

`U = lambda*B + max_x(d_x - mu*c[x] - lambda*b[x])`

is an upper bound on the optimal penalized objective. A feasible current p provides

`L = I_nats(p)-mu*c·p`.

Thus `U-L` is a valid optimality gap. Check primal feasibility separately: an infeasible current p is not a lower bound. A small change in p or F alone does not certify optimality. Use the final inner lambda or minimize this piecewise-linear U over lambda for a tighter certificate. If unreachable outputs make a divergence infinite, that honestly gives an infinite bound; do not suppress it.

Roundoff can give a negative gap of order 1e-15; report it as numerical zero only under a declared roundoff tolerance. A material negative gap means the implementation or feasibility check is wrong.

## Exact binary Figure 2 reproduction

Paper fixture:

- X,S,Y,Z in {0,1}, `Pr(S=1)=q=0.4`
- `Y=S*X`, `Z=Y`
- Hamming loss, receiver observes S
- No additional energy/cost constraint is specified for this binary experiment. A solver may represent this with `b=[0,0], B=0`
- Use `p=Pr(X=0)` consistently

Joint tensor: for every s,x, assign probability one to `y=z=s*x`. Then preprocessing must produce `c=[q,0]` and the posterior estimator must return the revealed state when x=1; when x=0 it chooses state zero for q<=1/2.

### Derived analytical oracles

Only the fraction q of state-one uses can convey input entropy. State uncertainty remains only on input-zero uses. Hence

`C(p)=q*H2(p)`, `D(p)=q*p`.

For a distortion budget D:

`C(D)=q*H2(D/q)` for `0<=D<=q/2`,

`C(D)=q` for `D>=q/2`.

Use the limiting definition at q=0: all rates and distortions are zero, with a nonunique optimizer. The efficient branch has p<=1/2; arbitrary p>1/2 points are feasible but dominated in the unconstrained experiment.

The paper's separation convention forbids using communication-phase feedback for sensing. If a fraction t is used for data, its point is `(D,C)=(t*q,t*q)`. Thus Figure 2's baseline is `C_sep(D)=min(D,q)` over the displayed nonnegative budgets, and the line joins `(0,0)` to `(q,q)`. A line from `(0,0)` to `(q/2,q)` would be a different scheme.

Required anchor points for q=.4:

- D=0: joint C=0, separation C=0
- D=.05: joint C=.21742577727983858, separation C=.05
- D=.1: joint C=.32451124978365314, separation C=.1
- D=.2: joint C=.4, separation C=.2
- D=.4: joint C=.4, separation C=.4

The horizontal joint segment is a capacity-versus-allowed-distortion plateau: the achieved distortion can stay at .2 while the budget grows. Do not imply the optimized input is changing across that plateau.

### Every-iteration BA oracle, independently derived

With natural-log penalty mu and no active cost,

`p_star(0)=1/(1+exp(mu))` for q>0.

Let `r_k=ln(p_k(0)/p_k(1))`, with uniform initialization r_0=0. The actual BA updates reduce to

`r_k=(1-q)*r_(k-1)-mu*q`,

`r_k=-mu*(1-(1-q)^k)`.

This is a powerful test of the implemented posterior and softmax update on **every iteration**, not merely a check against the final binary curve. Use q in {.1,.4,.5}, mu in {0,.25,1,2,8,20}; slower convergence at small q is expected.

An optional active-cost validation extension, not a paper Figure 2 default, takes `b=[0,1]`, i.e. `Pr(X=1)<=B`. Then, for q>0 and 0<=B<=1,

`p_star(0)=max(1-B, logistic(-mu))`.

When active and 0<B<1,

`lambda_star=q*(logit(1-B)+mu)`.

When inactive lambda=0. At B=0, only X=0 is allowed; at B=1, the upper bound is vacuous. This test is important because the neutral-cost binary plot never exercises Eq. 24.

### Proposed Figure 2 numerical procedure

Run the general solver across declared mu values (for example 0 to 24 with adaptive densification), record achieved (D,C), and compare with the analytical oracle. Include the exact sensing endpoint separately, since no finite mu achieves p=0 exactly. Plot the capacity-budget plateau explicitly and label it. Reproduce the q=.4 source fixture before allowing adjustable q. Parameter variations outside q∈[0,.5] require their own estimator derivation and are extensions.

## Independent reference artifact and tests

Versioned independent reference artifacts:

- [Independent reference](../scripts/validation/capacity-distortion/independent_reference.py)
- [Independent fixtures](../scripts/validation/capacity-distortion/independent-reference-fixtures.json)

The script deliberately contains **no BA implementation**. It computes mutual information directly from the channel tensor, derives Bayes costs by risk minimization, uses SciPy SLSQP with multiple starting distributions, an independent KKT-root refinement for generic positive channels, and scalar bounded optimization, and evaluates Gaussian integrals independently.

Generated coverage:

1. Binary q×mu grid, compared with logistic oracle
2. Figure 2 distortion-budget points via a directly constrained optimizer
3. Active/inactive binary cost constraint cases
4. Asymmetric three-input/two-output channel, with an exactly zero probability at optimum
5. Three-input/three-output channel with varied mu and B, including nonuniform interior optima
6. Literal Gaussian-model endpoint integrals and quadrature refinement

Observed independent-reference errors: binary scalar p error below 7.6e-9; Figure 2 rate error below 6.4e-10. SLSQP is not the ground truth at extremely tiny probabilities: for mu=20, use the exact logistic oracle and scalar optimizer, not a near-boundary SLSQP p value. The JSON explicitly includes both estimates.

Acceptance tests for the production solver should compare rate/distortion/objective within 1e-7 (or a justified tighter tolerance), probabilities within 1e-6 for unique well-conditioned optima, and require its own certificate gap <=1e-8 nats plus feasibility. Do not compare unique probabilities for degenerate q=0 or tied optima; compare achieved objective and valid constraints.

Additional nonnumerical tests: malformed probability tensors; impossible feedback; zero channel entries; state probability zero; infeasible B; exact minimum-cost support; q=0; q=.5 estimator tie; mu=0; cost equality inactive; iteration-limit status; no NaN/infinite result silently plotted; rate measured in bits; trace count matches actual iterations.

## Corrections and ambiguities in the fixed source

1. **Eq. 18 min over Q is inconsistent.** From the definition, `J(p,Q)=I(p)-E_{S,Y} KL(P_{X|Y,S}||Q)`, so the posterior maximizes J and the correct operation is max over Q. The following theorem statement and Eq. 19 already use maximization. Implementing the printed min would be wrong
2. **The binary proof's conditional probability is mislabeled.** Because p=Pr(X=0), `Pr(Y=1|S=1)=1-p`, not p. Entropy symmetry preserves the reported final binary curve
3. **Eq. 21's always-equality wording is overstrong.** KKT requires feasibility and complementary slackness, with lambda=0 if the cost bound is inactive
4. **No Fig. 2/Fig. 3 caption mismatch was found in the visually inspected fixed PDF.** Figure 2 is binary q=.4; Figure 3 is fading AWGN P=10dB. Do not repeat an unverified cross-reference-error claim
5. The source does not specify numerical step sizes, mu grid, iteration tolerances, or the Gaussian discretization parameters

## Separate Gaussian/Figure 3 coverage gate

Do not mark this gate complete because the finite-alphabet solver runs. The continuous experiment requires discretization, integration, refinement studies, and an unresolved endpoint discrepancy.

Literal model: real `Y=S*X+N`, independent standard-normal real S and N, perfect Z=Y, `E[X^2]<=P=10`, squared-error loss. Although the subsection title says Rayleigh fading, do not silently replace the explicitly stated real normal S by a nonnegative Rayleigh or complex fading variable.

Independently derived posterior under unquantized feedback:

`E[S|x,y]=x*y/(1+x^2)`,

`Var(S|x,y)=1/(1+x^2)`,

so `c(x)=1/(1+x^2)` and `b(x)=x^2`.

Minimum distortion follows from Jensen: `E[1/(1+X^2)] >= 1/(1+E[X^2]) >= 1/(1+P)`. Constant amplitude ±sqrt(P) attains it. The receiver can still decode the sign, so minimum distortion does not force zero communication rate for this channel.

### Faithful numerical route for later implementation

1. Fix and disclose a symmetric M-PAM input grid and its amplitude span; include ±sqrt(P) exactly if testing the sensing endpoint
2. Approximate the standard-normal state expectation with explicit Gauss–Hermite nodes/weights, using the convention appropriate to N(0,1)
3. Construct output bins including infinite tail bins. For bin edges a,b, use exact Gaussian CDF differences `Phi(b-s*x)-Phi(a-s*x)` to get each channel probability row
4. Use the general BA solver on this finite conditional channel, with b=x². If sensing uses the original continuous feedback, use the analytical c above and explicitly describe communication-output quantization only. If sensing feedback is also quantized, recompute its Bayes MSE from bin posterior moments; the analytic continuous-feedback c is no longer exact
5. Refine input alphabet size/span, output bins/span, and state quadrature separately until reported curve points stabilize. Report changes and computation times, not just one chosen discretization
6. Compare with independent continuous-channel quadrature for each candidate optimized input distribution. Quantizing Y cannot increase I at fixed finite input; finite input optimization is also restricted relative to the continuous capacity. State quadrature error has no such one-sided guarantee and must be studied
7. Preserve the same power budget in all comparisons. For the paper's separation convention, the line connects `(Dmin,0)` to `(1,Cmax)`; that convention does not credit the communication phase's usable sensing feedback

### Unresolved numerical discrepancy, not an assumed explanation

Independent adaptive quadrature of the paper's literal Gaussian-input formula gives

`Cmax = 0.5 E_S log2(1+10*S^2) = 1.252699474402693 bits/use`.

The fixed PDF prints **1.213** and its Figure 3 plateau is consistent with that printed value. The audit does not know why these differ. Do not quietly force the implementation to match 1.213 or claim the discrepancy is resolved.

Other independent references:

- Gaussian-input distortion `sqrt(pi/(2P))*exp(1/(2P))*erfc(1/sqrt(2P)) = .31325218028522156`
- Minimum distortion `1/11 = .09090909090909091`
- Equal-probability 2-PAM rate `1-E_{S,N} log2(1+exp(-2*a*(a+N)))`, with `a=sqrt(P)*S`
- Gauss–Hermite node counts 40,80,160,320,640,1280 per dimension give 2-PAM rates .7362807217, .7322840954, .7318398530, .7317990528, .7317964865, .7317963908, respectively
- Independent nested adaptive quadrature gives .7317963889329944; its outer reported error is 8.54e-12 with inner tolerance 2e-11 and standard-normal integrals truncated at 12 sigma. This agrees with the high-order Gauss–Hermite calculation
- The source prints .733 for 2-PAM. This is close but is not the converged literal-model value

The full Figure 3 curve cannot be exactly reconstructed from source parameters alone: M, grids, quantizer, state integration, and tolerances are missing. A scientifically transparent reproduction should identify these choices, show convergence, and report the printed-versus-literal-model endpoint discrepancy rather than claim exact numerical agreement.

## Runtime and teaching-interface boundary

Finite BA per outer iteration costs approximately O(|S||X||Y|) for posterior/score updates plus O(inner_iterations*|X|) for the dual subproblem. Bayes preprocessing costs O(|S||X||Z||S_hat|). The binary fixture is tiny; the Gaussian refinement is a different computational scale.

Benchmark actual runtimes rather than asserting a universal frame rate. A future UI can display iterations, rate/distortion, input PMF, estimator risk, constraints, and certified gap. It should launch the real solver when physical/model parameters change, expose cancellation/stale-result handling, and distinguish partial traces from converged results. Complete the solver/reference tests and fixed Figure 2 reproduction before making the adjustable interface the main deliverable.

## Audit provenance

- Fixed PDF SHA-256: `4520ae9d50e55abb1d634f3396d07dfa96315266e4b40c07e46e6a8ed0d94ba2`
- Independent numerical environment: NumPy 2.3.5, SciPy 1.17.0
- Audit run: 2026-10-12 UTC
- After KKT refinement, the generic three-output reference has maximum certificate gap below 5.8e-9 nats; the support-zero two-output fixture has roundoff-level gaps
