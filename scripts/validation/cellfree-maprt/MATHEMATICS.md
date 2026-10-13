# Mathematical and numerical contract

## Observation model and units

With K transmit APs, R receive APs, M antennas per AP and T known symbol times, the source's stacked complex observation is

- H0: y = X h + n
- H1: y = G alpha + X h + n

The stack order is time → receive AP → antenna. Alpha has RK elements ordered receive AP → transmit AP. Each h block is column-major vec(H_rk), giving RKM² nuisance elements. G is TM R × RK and X is TM R × RKM². Alpha and h are independent proper complex Gaussian with positive-definite known covariance; noise is independent CN(0, sigma_n² I). Each alpha/h draw is constant over the whole sensing block, so the received clutter is generally correlated across both samples and antennas. No independent-clutter-per-symbol simplification is made.

Precoders are normalized over all KM transmit antennas; a per-AP block is not separately normalized. The optimization variable p_i is a nonnegative amplitude sqrt(rho_i), measured in sqrt(W). The coefficient rho_i is a stream power in W. Unit-power symbols and dimensionless precoders give x in sqrt(W). Noise variance −94 dBm is 10^((-94−30)/10) W, not 10^(-94/10) W. Distances are meters; the physical RCS variance is 10^(dBsm/10) m². It is included exactly once in beta. Array response squared norm is M, with half-wavelength element spacing. Source a_txᵀ x is a transpose, not an adjoint.

The SINR moment implementation divides communication channels by sigma_n, and thus its SOC noise term is one. This is an algebraic rescaling of the source Eq.43. The chosen RZF regularizer is explicitly one in these normalized coordinates; it is not recovered from the paper. The actual design uses one fresh estimated communication channel realization; power/SINR moments use a separate training ensemble. A second independent ensemble is retained for holdout checks. These expectation estimates can yield holdout violations even when all fitted SOCs are satisfied.

The empirical mean power is sum_i p_i² E||w_i,k||². The realized block energy proxy sum_m,k ||x_k[m]||² can differ because symbols/beam cross terms and the selected precoder realization fluctuate. Its unit is W·symbol; without a symbol duration it must not be called joules. Bandwidth is recorded as 20 MHz but this narrowband block model does not derive a physical sample period or range resolution from it.

## MAP nuisance maximization

Let L_a L_aᴴ = R_alpha, L_h L_hᴴ = R_h, V = G L_a / sigma_n, U = X L_h / sigma_n and y_n=y/sigma_n. Whitened nuisance variables are z_a and z_h. Their negative joint log densities, up to common constants, are

J0 = ||y_n − U z_h||² + ||z_h||²

J1 = ||y_n − V z_a − U z_h||² + ||z_a||² + ||z_h||²

Set D_w=I+UᴴU, V_r=V−U D_w^-1 UᴴV and S=I+VᴴV_r. Then

z_a_hat = S^-1 V_rᴴ y_n

z_h_hat,H1 = D_w^-1 Uᴴ(y_n−V z_a_hat)

z_h_hat,H0 = D_w^-1 Uᴴ y_n

The source Eq.32 statistic is

T_MAP = (V_rᴴy_n)ᴴ S^-1 (V_rᴴy_n) − RK log(pi) − log det R_alpha.

This is min J0 − min J1 plus the RCS prior-density constant. Cholesky solves avoid explicit inversion in production. The direct-density validation oracle separately constructs the unwhitened Eq.28–30 joint precision and evaluates the optimized residual/prior costs; an additional test uses independent real-valued augmented least squares. High-precision validation uses 70 decimal digits. Receiver APIs contain no realized alpha/h arguments.

The target-free prior density appears under both hypotheses, so its normalization cancels. The RCS prior density appears only in H1. A change in the RCS parameterization changes the MAP density constant; this is covered by a regression test. Zero or singular priors are not silently jittered. Positive-definite priors are required; a clutter-free case uses a zero-width X/h support. A zero G gives a constant statistic, and the deterministic threshold calibrator refuses it rather than claiming arbitrary Pfa. Randomized degenerate decisions would need a separate explicit protocol.

## Integrated LRT distinction

Integrating out nuisance gives Sigma0=sigma_n²I+X R_h Xᴴ and Sigma1=Sigma0+G R_alpha Gᴴ. The integrated log likelihood ratio is

yᴴ(Sigma0^-1−Sigma1^-1)y + log det Sigma0 − log det Sigma1.

For the same fixed linear-Gaussian design, its quadratic equals the MAP quadratic above, and its constant is −log det S. Thus the two decision rankings coincide after the threshold is shifted by the known difference in constants. This is verified, not assumed. It does not equate maximization with integration as operations, confer distribution-free calibration, or establish equivalence of a simpler observation model. The independent full-record verifier uses this observation-covariance quadratic and restores the source MAP constant, rather than calling the production Schur detector.

SP-real deliberately sets modeled clutter to zero while keeping actual y unchanged. Its threshold is calibrated on independent samples from the actual cluttered H0. Therefore its reported Pfa is checked fairly; using a noise-only threshold would create a different mismatched-Pfa experiment. AP and SP cannot use the true realized h to remove clutter.

## Power optimization and certificates

The source sensing objective is pᵀA p / (c+pᵀB p), where c=TMR sigma_n². A and B are real parts of Hermitian PSD covariance contractions. Normalize A and B by c, so the denominator is 1+pᵀB_n p. Common stream powers preserve the centralized precoder directions.

At previous (p_old,t_old), Eq.49 maximizes a linear tangent in p,t. Its t coefficient is negative when target energy is positive; consequently the optimum obeys t=1+pᵀB_n p. Substitution gives an equivalent convex quadratic minimization

f(p) = (p_oldᵀA_n p_old / t_old²) pᵀB_n p − 2 pᵀA_n p_old / t_old.

Omitted additive constants do not change the optimizer. Constraints are source UE SOCs and per-AP power quadratics, with p≥0. A sensing-free strategy fixes p0=0. SLSQP receives analytic derivatives; the independent direct-ratio check uses finite differences and optimizes the original ratio. Direct-ratio agreement is a local check, not global optimality.

For each convex subproblem, write the concave constraint slacks as c_j(p)≥0. At candidate p, choose nonnegative multipliers lambda. The Lagrangian L=f−lambdaᵀc is convex. A provable per-stream box is 0≤p_i≤min_k sqrt(Ptx/F_ki), with zero coefficients excluded from that minimum. With r=grad L(p), a global subproblem lower bound is

L(p) + sum_i min(−r_i p_i, r_i(upper_i−p_i)).

This follows by minimizing a supporting affine plane over a box containing the feasible set. The difference from f(p) is a global convex-subproblem gap bound in exact arithmetic. Records preserve all multipliers, residuals and slacks so it can be recomputed. Computation is float64 without directed rounding; it is labeled a numerical certificate. Acceptance requires optimizer success, primal violation ≤2e−7 and gap ≤2e−6 max(1, |objective|). Loose certificates or failed solves are retained and rejected. For status-8 line-search failure only, when the candidate already passes primal/gap checks, one new SLSQP attempt uses that candidate multiplied by (1−1e−7) as its initialization. Objective, constraints and tolerances are unchanged, and actual solver success is still required. This contracts toward the amplitude-box origin; it is not guaranteed to enter the feasible set because an active communication SINR can worsen. Both attempts remain in `solver_attempts`. All other statuses receive no retry.

Algorithm 1's tangent-improvement stop is used with tolerance 1e−8 and cap 100. All starts and complete iterate histories are retained; iteration/subproblem caps, infeasible inputs, numerical nonmonotonicity and local outcomes are not silently removed. Selection among accepted restarts is explicitly by highest sensing SINR. No global certificate is claimed for the original nonconvex ratio. The original source's convergence statement needs its regularity/feasibility conditions; finite tolerance evidence is narrower.

A uniform physical RCS variance multiplier scales A but not B or the constraints, so the mathematical optimal power set is unchanged across this particular RCS sweep. The power problem is solved once at 0 dBsm, with every RCS's actual detection covariance and sensing SINR then recomputed. This invariance would not apply to nonuniform link-RCS changes or modified priors that change A's shape.

## Calibration, uncertainty and paired trials

A calibration split contains N_cal iid H0 blocks. Sort a detector's scores and take ascending order k=ceil((N_cal+1)(1−Pfa_target)). The threshold is score[k−1], with decisions T≥threshold. Ties/constant scores are rejected. For a continuous iid score law, the random future exceedance probability of this calibrated threshold has a Beta(N_cal+1−k,k) sampling distribution. Its central 95% interval records calibration uncertainty, and its expectation is (N_cal+1−k)/(N_cal+1). Neither is a statement that each frozen threshold has exactly the requested Pfa.

A separate evaluation split supplies N_eval new H0 and H1 blocks. False-alarm and detection counts have pointwise Clopper–Pearson intervals conditional on the fitted threshold. The evaluation H0 and H1 share the same nuisance/noise draw for a paired coupling, while independent trials remain iid; each H1 additionally has an independent RCS draw. AP/SP share identical observations. Allocations share latent standard-normal draws and symbol/precoder priors, but their transmitted and received signals differ. This is common-random-number pairing, not same-observation evidence across different powers.

AP-minus-SP detection differences use the paired trial differences and a labeled normal-approximation interval. Intervals are pointwise, not simultaneous over the grid. No all-location, all-RCS, rare-event or universal CFAR claim is made. In particular, N_eval=8192 at nominal 0.01 yields roughly 82 null exceedances on average, so the uncertainty cannot be hidden by reporting many decimal places.

All standard-normal trial arrays, IDs, exact design and score/decision arrays are retained; stored first-32 raw observation witnesses independently anchor the stack convention. The verifier reconstructs every full observation from the saved draws. This is lossless raw-input replay, not a summary-only evidence file. Truth arrays live in generation/evidence records; detector and optimizer APIs receive no nuisance truth.
