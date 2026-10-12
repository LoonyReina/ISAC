# Weighted waveform equality-energy algorithm: numerical specification

Date: 2026-10-12. Fixed source: arXiv:1711.05220v1, §IV Eqs.(16)–(25), Algorithm 1; selected §VI-A Fig.3/4 experiment. PDF SHA-256 e79052feb8fd898002a71c9b1f20fd75cb757159b6e92071e97812e85b62d798. The PDF was reused from the separately verified strict-covariance package and page 5 was visually inspected. No source PDF is redistributed in this package or the website.

Status: Python reference implementation and independent optimization review complete; JavaScript numerical core independently accepted. The separately implemented JavaScript numerical core has passed independent review. UI/Worker integration, browser validation, publication and whole-paper completion are separate gates. Constant-modulus §V remains open.

## Exact source problem and reference provenance

Given H∈C^(K×N), S∈C^(K×L), X0∈C^(N×L), 0≤ρ≤1 and Pt≥0, solve

    f(X) = ρ ||HX−S||²_F + (1−ρ) ||X−X0||²_F
    ||X||²_F = E = L Pt.

This is a sphere equality, not a ball inequality, covariance constraint, or constant-modulus constraint. H is used as HX. S and X share the same L snapshots. Pt is average total array transmit power, and E is block energy in the normalized finite-frame model. A physical duration/bandwidth is not supplied.

The paper specifically defines X0 as an optimum from strict covariance Eq.(8) or (10), computed for the same H and S, with tr(R)=Pt. This package reuses the existing separate strict reference to generate that X0, rather than duplicating it. The low-level weighted function accepts arbitrary X0 to test the mathematical objective, but such cases are explicitly a generalized supplied-reference problem and must not be labeled the complete original construction. The general weighted optimization permits L<N; the paper's positive-definite strict reference requires L≥N.

Define Q=ρ HᴴH+(1−ρ)I, G=ρ HᴴS+(1−ρ)X0, and c=ρ||S||²+(1−ρ)||X0||². Then f=tr(XᴴQX)−2 Re tr(XᴴG)+c. The constant c is necessary when checking original objective values, though it does not affect the optimizer.

## Regular source algorithm

Diagonalize Q=V diag(q_i)Vᴴ, with q_1=q_min, Z=VᴴG. The global KKT conditions are

    (Q+λI)X=G,  ||X||²=E,  Q+λI ⪰ 0.

At λ>−q_min,

    X=V diag(1/(q_i+λ)) Z,
    P(λ)=Σ_i ||Z_i,:||²/(q_i+λ)² = E.

Use absolute squared complex entries. Eq.(25)'s printed scalar expansion lacks explicit modulus bars, while its Frobenius-norm definition and Eq.(24) unambiguously imply them.

P is strictly decreasing for G≠0 on the open positive-definite interval. It has a unique interior root if its left limit exceeds E. This reference uses Brent's bracketed root method, with bisection as an author-side crosscheck, on exactly this secular equation. It is the source eigendecomposition/one-dimensional-search algorithm, not an unconstrained optimizer substituted for the paper. The paper names Golden-section search as an example. Our method and hard-case extension are disclosed separately.

For implementation use t=λ+q_min>0, d_i=q_i−q_min. Evaluate ||Z/(d+t)||_F−sqrt(E) rather than squaring a large norm. A valid upper bracket is t_hi=||G||_F/sqrt(E), because d_i≥0; doubling is a rounding safeguard. Retain all projections in regular solves, even if tiny. Do not replace a tiny denominator by a fixed epsilon. Near the endpoint keep t and d separately rather than subtracting nearly equal λ and q_min.

## Boundary/hard-case completion: explicit extension

Let M be the minimum-eigenspace of Q. If Z_M≠0, P tends to infinity at the left boundary and the solution is regular. If Z_M=0, define

    Xp = V_nonmin diag(1/(q_i−q_min)) Z_nonmin,
    ep = ||Xp||².

- ep>E: an interior regular root still exists
- ep=E: λ=−q_min and X=Xp is the singular-boundary solution
- ep<E: λ=−q_min and X=Xp+V_min W, with ||W||²=E−ep, is globally optimal

Xp and V_min W are Frobenius-orthogonal. Our deterministic completion puts the nonnegative real sqrt(E−ep) into the first minimum-eigenvector and first time coordinate. Other valid completions can have different covariance/beampatterns and must not be judged by entrywise X agreement. Rescaling Xp generally changes its observed communication component and is not this completion.

The general solution of the stationarity equation contains the nullspace term. Eq.(23)/Algorithm 1 prints only the pseudoinverse term. At a hard case that term alone has insufficient energy, and Eq.(24) has no interior root. This identifies an omitted boundary treatment; it does not invalidate the source's regular algorithm.

For the source's positive-definite strict X0, interior 0≤ρ<1 is regular: write X0=√L F U, UUᴴ=I, F invertible, and FᴴHᴴS=P U with P⪰0, from the strict Procrustes optimum. Then FᴴG=[ρP+(1−ρ)√L FᴴF]U has full row rank for ρ<1. Consequently every nonempty eigenspace of Q has a nonzero G projection. At ρ=0, X=X0 and λ=0 if X0 has the correct energy.

At ρ=1, Q=HᴴH and G=HᴴS. If H is rank-deficient, G is orthogonal to null(H). When ||H†S||²<E, a null(H) completion is needed. This is common for the source's N=16,K=4 parameter regime and is tested directly. The completed waveform can achieve zero MUI when H has full row rank and the minimum-norm solution uses no more than E. It need not preserve the radar covariance. At exactly ρ=1 the radar term has zero weight, so the deterministic completion is just one of many possible radar behaviors; do not visually imply a unique radar endpoint.

If G=0, every radius-√E waveform in the minimum-eigenspace is optimal. Q may be zero or may be full rank. λ may be negative; restricting λ≥0 would silently solve a different problem. Repeated minimum eigenvalues are handled as an eigenspace.

## Feasibility and numerical contract

For positive N,L and E≥0 the energy sphere is nonempty, whatever H,S,X0. Rank-deficient H, singular Q, zero symbols, or zero weights do not imply infeasibility. At E=0 the feasible set is the singleton X=0 and f=c; the equality-gradient constraint qualification fails and a finite multiplier need not exist, so this case is solved directly. Negative Pt is invalid/infeasible. Shape errors, nonfinite data and limits below are rejected without diagonal loading.

Current bounded reference/API contract: N,K≤32, L≤128, complex input magnitude≤10^6, E=0 or 10^−12≤E≤10^12. These are declared engineering limits, not mathematical solvability conditions. A future teaching UI may choose a smaller domain. Generated-output evaluation alone allows 64 eps max(N,L) relative roundoff above the input magnitude cap; the input cap itself remains exact. This prevents a correctly normalized radius-10^6 scalar from being rejected because its computed magnitude is one ulp high. The function normalizes X=√E Y, ||Y||=1, and divides quadratic and linear terms by max(E||Q||₂,√E||G||_F,tiny).

Numerical eigenvalue clustering and near-zero range thresholds are explicit in every output: 64 eps N max(1,max|q|), and 64 eps max(N,L) max(1,||B||). Only hard-case candidates use this cluster; regular roots retain actual gaps. A numerically classified hard case is not proof of an exactly zero mathematical projection. The returned range residual, original objective, stationarity and energy residuals must pass. The optional radar-closest selection is then a secondary minimizer within the selected numerical candidate subspace; an exact-primary-minimizer statement requires an exact eigenvalue cluster and exact range consistency. Tiny nonzero projections may produce a tolerance-certified approximate endpoint rather than an exact branch-identification claim.

Success requires relative energy error≤2×10^−10, normalized stationarity≤2×10^−9 and residual lower-bound gap≤2×10^−9 times max(1,c,scale,f). All returned floating values must be finite. Failures are `numerical-check-failed` or explicit exceptions, never silently successful outputs.

## Global objective certificates and comparison rules

For an exact regular solution the dual value is

    c−λE−tr(Gᴴ(Q+λI)^−1 G).

At a singular boundary replace inverse by pseudoinverse and require range consistency. This source dual diagnostic and its signed objective gap are returned. Do not claim its exact validity from a numerical rank decision alone.

A separate residual-based bound covers approximate stationarity and approximate PSD without throwing away a tiny G component. In normalized variables let Rk=(A+νI)Y−B, a=max(0,−λ_min(A+νI)), dmax=1+||Y||. Every unit-sphere W satisfies

    f(W) ≥ f(Y) − scale [a dmax² + 2 dmax ||Rk|| + |ν| |1−||Y||²|].

This follows by expanding f(W)−f(Y) and applying Cauchy–Schwarz. It is a numerical global certificate, not interval-arithmetic proof. The floating eigensolver residual is still a limitation; independent solver agreement and small backward residuals supplement it.

Independent comparison must recompute f, energy and KKT from the submitted X. Compare invariants and objective/bound gaps, not X entries, at nonunique endpoints. The author validation includes analytical cases, a second bracketed root method, fresh randomized same-input rivals, and real-variable SLSQP with the exact energy equality; a separate reviewer is still required before live integration.

## Experiment and interpretation contract

Named source target: §VI-A Figs.3–4 strict versus ρ=.1 tradeoff, with N=16,K=4,L=20,Pt=1, iid CN(0,1) H, unit-power QPSK S and half-wavelength ULA. Pair identical H,S,X0,energy across strict/tradeoff comparisons. Use N0=Pt/10^(SNR/10). Source Fig.3 visibly uses −2,0,2,4,6,8,10,12 dB, confirmed by the page-9 image. A ρ sweep tests the communication/radar objective tradeoff; fixed-ρ SNR changes only evaluate a diagnostic and do not re-solve an unchanged optimization problem.

Communication metric: sum_k log2(1+mean|S_k|²/(mean|(HX−S)_k|²+N0)); keep per-user residuals. It is the paper-style Gaussian-log diagnostic, not QPSK mutual information, BER, throughput, or a quantity globally optimized by Eq.(16). The prior strict-covariance counterexample already disproves a universal total-MUI/sum-rate equivalence.

Radar objective is waveform distance ||X−X0||². Spatial covariance and raw aᴴ(XXᴴ/L)a are output diagnostics. A weighted waveform-distance minimum is not a beampattern-MSE minimum, detection-optimal design, ambiguity-function guarantee, or temporal radar experiment. Do not normalize each pattern independently when comparing same-budget curves.

Matched baseline X0 is feasible. A disclosed normalized pseudoinverse baseline X=√(E/||H†S||²)H†S shares energy but may distort coherent gain and radar covariance. Original ZF normalization and receiver convention remain unresolved, so no unconditional superiority claim is made. The ρ=1 optimized waveform is also an equal-energy communication-objective baseline, explicitly including nullspace completion.

Unresolved full-figure details: original trial count/seeds/averaging, ZF gain convention, original directional least-squares target profile/grid/weights/constraints, Fig.5 detection model from cited Eq.(69), and Fig.6 pattern-MSE angular weighting. Our additional synthetic directional covariance is labeled synthetic and cannot replace the three-target original radar design. Full Figs.3–6 and the constant-modulus branch remain open.

## Endpoint teaching safeguard

`endpoint-tie-example.json` holds the first original-parameter input, the default canonical hard-case output, an explicitly radar-closest communication-optimum tie break, and a ρ=1−10^−8 regular solution. For underdetermined full-row-rank H with e0=||H†S||²<E, define Z=(I−H†H)X0. If Z≠0, the minimum-radar-distance tie is H†S+√((E−e0)/||Z||²)Z. This follows by maximizing Re⟨null completion,Z⟩ at fixed norm. It is a separate lexicographic convention and must be labeled as such; the default `tie_break='canonical'` retains the documented first-eigenvector completion. The separately requested `tie_break='radar-closest'` option aligns the completion with the projected reference. The two ρ=1 outputs have equal optimal MUI and energy but different radar distance. Do not plot the default endpoint as a necessary jump in radar cost, or claim all global minimizers have the same beampattern.

## Independent-review correction log

The first candidate formed Q*(E/scale). An independent reviewer exposed overflow when Q=G=0 and E>approximately4, although the sphere is feasible and all other inputs are in range. Version2 multiplies Q*E and G*sqrt(E) before division and uses scale=1 for exactly zero quadratic/linear terms. E=4,10,10^12 analytic regressions were added and the complete author validation and parameter slice were rerun. Original candidate bytes/report are retained under revisions/v1-before-independent-review. No mathematical infeasibility claim was made for the failed implementation.

## Optional radar-closest hard-case tie break (version 3)

The default canonical option is retained, with original endpoint evidence saved. For positive completion energy e=E−||Xp||² and an exact minimum-eigenspace basis Vmin, let Zref=VminᴴX0. If ||Zref||>0, the unique nearest completion in that eigenspace is W=√e Zref/||Zref||. Its secondary optimum equals ||Xp−(I−VminVminᴴ)X0||²+(√e−||Zref||)². This minimizes waveform distance among the exact primary minimizers; the primary objective remains Eq.(16), or MUI at ρ=1. If e=0 there is no completion choice. If e>0 and Zref=0, all completions are equally near and nonuniqueness remains.

The numerical option applies the formula inside the declared minimum-eigenvalue cluster. It exposes the projection norm and threshold. A below-threshold projection uses the canonical fallback, reports nonuniqueness at that threshold, and gives the conservative secondary discrepancy bound 4√e ||Zref||. This is not a claim that a tiny nonzero mathematical projection equals zero. In near-hard cases the global primary certificate still applies; the secondary optimum statement concerns the numerical candidate subspace unless exact cluster/range conditions are established.

Version3 also fixes an independently detected output-only cap issue at E=10^12: some valid complex scalar solutions rounded just above magnitude10^6 and were rejected by the input cap reused for output. A machine-roundoff-only output allowance fixes it while preserving input rejection. Regression now covers 903 scalar phase/energy points, all 301 phases at each of E=10^−12,1,10^12, plus strict over-cap input rejection. The old bytes and failure explanation are retained.
