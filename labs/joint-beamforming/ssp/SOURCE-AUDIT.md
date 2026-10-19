# SSP source-objective audit

Date: 2026-10-17. This is a bounded offline numerical branch, with no exact-author-code, original-figure, journal-equation-equivalence, browser, or full-paper claim.

## Fixed sources

- Target: [arXiv:1912.03420v2](https://arxiv.org/pdf/1912.03420v2), 2020-02-02. Exact downloaded bytes: 956,383; SHA-256 `efab9278425f628e33296624fa656b782b84f11c0447bd98487828c04b4094e2`. Its §V calls for per-antenna gradient-projection SSP with weights 1 and 2, referencing [42]. The source's covariance/radar objective and resource definitions remain unchanged.
- Cited SSP mathematical source: [arXiv:1707.00519v1](https://arxiv.org/pdf/1707.00519v1), 2017-07-03, *MU-MIMO Communications with MIMO Radar: From Co-existence to Joint Transmission*. Exact downloaded bytes: 1,561,956; SHA-256 `b9cbff1ab26b63926e1de87393121ec3ba6ca5de10a7bec99b95ddec91fb42ac`. The objective is Eqs.23,24,53,56; the derivative/projection audit concerns Eqs.35,58,61. PDF pp.6–9.
- Journal identity: [IEEE TWC 17(4), 2755–2770 (2018), DOI 10.1109/TWC.2018.2803045](https://doi.org/10.1109/TWC.2018.2803045). Author institutional repository copies were checked; full-file retrieval returned 401/403 or timed out. Journal equation bytes were not verified. The cited fixed preprint is the explicit mathematical source here; the result must not imply the journal retained or corrected the identified formulas.

Third-party PDFs and extracted text remain local research inputs and are excluded from the distributable archive.

## Explicit optimization contract

Use W ∈ C^(M×K), H ∈ C^(K×M), F=HW, Q=WWᴴ. Source X=Wᴴ; its channel-column notation is converted consistently to the target paper's channel rows. No dedicated radar streams are added to SSP.

For each user define e_k = |F_kk|² − Γ(Σ_{j≠k}|F_kj|² + σ²). Minimize

f(W)=||Q−R0||_F² + 2 Σ_k e_k²

subject to Σ_j |W_mj|² = Pt/M for every m. Γ is a linear power ratio; the input dB value is converted once. R0 is the same accepted optimized Eq.15 radar covariance used by SDR/ZF, not an analytic target recipe.

This follows the residual penalty in Eq.23. The earlier literal SINR-error expression Eq.21 is a different objective away from zero: e_k=(interference_k+σ²)(SINR_k−Γ). Their zero sets agree, but their squared losses generally do not. We do not replace Eq.23 with the ratio loss or a one-sided hinge.

A stationary SSP solution can violate Γ. Numerical stationarity, exact power satisfaction, and actual SINR-threshold passage are therefore separate fields. The penalized optimization remains feasible when the constrained communication problem does not.

## Derived gradient and source discrepancies

Let C_kj=1 for j=k and −Γ otherwise. Under the real inner product Re tr(Gᴴ ΔW), direct differentiation gives

G = 4(Q−R0)W + 8 Hᴴ[diag(e) (C ⊙ F)].

The fixed preprint's Eqs.35/58 use α_k where the derivative of Eq.23 requires α_k−Γσ². This is not a harmless constant in the derivative because α_k depends on W. The implementation follows the explicit objective. The correction is recorded rather than silently reproducing the incompatible expression.

For q=Pt/M, row-sphere tangent projection is T_m=G_m−W_m Re(W_mᴴG_m)/q. Eq.61's printed projection omits the division by q. At this experiment's q=.1 it is not tangent unless the missing scale is restored. Normalizing each updated row to √q preserves power without a covariance-relaxation/rank-recovery step.

The source's RCG algorithm and the target's generic gradient-projection description do not specify a reproducible initialization, step policy, cap, or stopping tolerance for the target figure. This implementation uses a disclosed monotone projected-gradient method with alternating spectral steps and Armijo backtracking. It does not claim the author's exact iterates or exact figure values.

## Validation and scope

The pre-sweep derivative audit uses 48 independent random directions across M4/K2, M10/K2, M10/K4, and M10/K6, including Pt=3, and verifies the non-unit tangent radius. Those K4/K6 checks are algebra tests, not statistical experiments. A separate checker imports neither numerical core nor experiment metrics; it reconstructs the objective from vector products, all recovered physical powers and full 1801-angle metrics, and derives gradients by five-point finite differences. The objective is quartic in each real coordinate, so that stencil has no polynomial truncation error in exact arithmetic.

The statistical branch retains M10/K2, Pt=1, σ²=.01, half-wave ULA, target angles −40/0/40°, 10° inclusive beam width, and −90:.1:90° grid. It uses the same 32 frozen channels and Γ4/12/20 dB as the accepted reference. SSP has three deterministic starts per point; every cap or failure is retained. SDR/ZF are unchanged historical accepted records, not newly solved or assigned new runtimes. Common radar metrics are Eq.14 and Eq.46 evaluated after recovery; SSP's own objective is not compared numerically to the different SDR/ZF objective.

No rank claim is turned into a universal assertion that rank-K covariance cannot form more than K angular peaks. The verified limitation is rank(Q)≤K and the inability to match a higher-rank covariance exactly. Statistical intervals are exploratory small-sample conditional summaries, not the original 1000-channel study. Actual achieved SINR is displayed alongside requested Γ; no same-achieved-QoS dominance claim follows from equal requested thresholds.

The accepted channel subsets differ across Γ (32/29/31). Each within-Γ method comparison is paired, but connected cross-Γ mean curves also change sample composition and do not isolate the effect of tightening Γ. In particular, a declining conditional ZF mean SINR does not establish a negative per-channel threshold effect.
