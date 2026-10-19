# Numerical-first extended-target CRB port

Recovery note, 2026-10-18: recreated from the implementation thread's available tool-call text. No prior hash for this document is available. The recovered numerical core itself matches its original final SHA256 exactly; current reruns are documented separately.

Source: Fan Liu et al., IEEE TSP 70 (2022), DOI 10.1109/TSP.2021.3135692, published Eqs.46–49. This port does not replace or relabel historical offline results. No source PDF is distributed.

## Primal coordinates and cones

Every m×m complex Hermitian variable uses m real diagonals, sqrt(2) times real strict upper triangle, then sqrt(2) times imaginary strict upper triangle. Thus the coordinate dot product is Re tr(XY). Let V_j=W_j/P, j=0..K (final block is original auxiliary probing); R=sum(V_j). T is the epigraph variable. The objective c'x=tr(T)/m and constraints are V_j>=0, S=[mR,I;I,T]>=0, -tr(R)>=-1, and q_j·(V_j/gamma-sum(other V))>=eta_j, with q_j=h_j* h_j/||h_j||² and eta_j=noise/(P||h_j||²).

The optimizer implements this epigraph SDP, not an eigenvector or other surrogate objective. S is a 2m complex-Hermitian block, represented internally by a 4m real symmetric eigendecomposition; this is within the reused eigensolver dimension cap for m4/6. T's Schur complement yields tr(T)/m>=tr(R^-1)/m². Physical inverse trace is tr((P R)^-1), and the complex full-response Frobenius MSE bound is Nr * radarNoise/L times that trace. No pseudoinverse is used for singular R.

Write affine cone constraints as Ax+b in C, with b containing just the two identity off-diagonal blocks. The independent block covariances are copied by A, followed by the Schur coordinates and positively rescaled scalar inequalities. Dense A is constructed by applying the Schur map to each coordinate basis vector; AT is its explicit row transpose. This avoids concealed factors of two in complex adjoints.

## Splitting and acceptance

Douglas–Rachford splits the affine graph of x into z=Ax and the shifted product cone C-b. Projection is PSD(w+b)-b for the Schur block, ordinary PSD projections for covariance blocks, and max(w,lower) for scalars. The affine/objective proximal step solves rho A' A x = rho A'(2z-w)-c. Relaxation is1.6. Safeguarded Anderson acceleration is reused from the established point solver; failed acceleration falls back to ordinary DRS. A small fixed-point residual alone never accepts a result.

For a cone-normal iterate y=rho(w-z), y_cone<=0 and y_scalars<=0. Set Z=-y_S. Project Z to PSD, then congruence-transform its lower-right block B by C=(mB)^(-1/2), so Z22=I/m. This enforces T coefficient stationarity. Scalar negatives provide nonnegative power/SINR multipliers. The covariance stationarity blocks are mu I - m Z11 + sum(lambda_i q_i) - lambda_j(1+1/gamma_j)q_j (the last term is absent for probing). Increase mu by the maximum negative minimum eigenvalue plus a safety allowance. The reported lower bound is lambda·eta-mu-2 Re tr(Z12), equivalently -y_scalar·lower+y·b. The coefficient residual, repaired dual data, conservative post-repair cone/stationarity eigenvalue diagnostics, and bound/objective gap are exported for independent reconstruction. This is floating-point weak-duality evidence, not interval certification or exact certified global optimality.

Acceptance requires recovered power and SINR within relative2e-5, relaxed PSD minima>=-2e-5 P, positive-definite recovered R, covariance preservation within2e-5, and relative repaired gap<=1e-4. A negative gap beyond roundoff is rejected. Explicit post-repair cone/stationarity checks use relative1e-10; coefficient residual must not exceed1e-8. Nonfinite objective/gap/certificate values fail. Solver status and physicalGate are both exposed. Iteration cap, elapsed wall-time cap, cancellation, invalid input, numerical failure, numerical rejection and an individual-power necessary infeasibility bound remain distinct. Optional diagnostic extraction failure cannot overwrite cancelled/capped status; it is separately recorded. An iteration cap never establishes infeasibility. Duplicate-channel infeasibility need not be established by the prototype; such runs can cap.

## Constructive recovery and comparison

For each data block Q_j, compute w_j=Q_j conj(h_j)/sqrt(h_j Q_j conj(h_j)). Desired power is preserved, and Q_j-w_j w_j^H is PSD in exact arithmetic. Factor R-sum(w_j w_j^H) into dedicated probing beams using its Hermitian PSD square root. This is Eq48–49 constructive recovery, not point-target principal-eigenvector extraction. Reject materially negative remainders; export raw eigenvalues, clipped negative mass, and factor/covariance defects. Recalculate desired, other-data, and probing powers from the actual beams.

The comparison independently uses each original data block's principal eigenpair and preserves the original auxiliary covariance. It never rescales beam power. It reports used power and its own SINRs and objective, retains infeasible or singular outcomes, and does not claim equal used energy or superiority. No physical receiver or MSE samples are generated.

## Scope and gates

Public numerical input is Nt4/6,K2,Nr=Nt+4,L30,P1000mW,both noise variances1mW,Gamma0..20dB and bounded finite complex H (entry magnitude<=10). Generic algebra helpers can be tested privately outside the public solver domain. Numerical checks on a declared seed grid are not exhaustive proof over every editable H. No K1 or Nt8 optimization support is implied.

Historical Oct17 supported non-upload desktop browser QA was reported passed on exact app/HTML/core hashes, but its screenshots and native browser artifacts were not recovered. That historical report is not a fresh browser run after recovery. Browser import/mobile/source-document access, first-paint latency and memory remain unverified. Node timing does not establish real-time behavior.
