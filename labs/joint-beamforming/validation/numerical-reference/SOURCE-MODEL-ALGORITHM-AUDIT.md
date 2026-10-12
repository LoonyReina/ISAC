# Source and numerical scope audit

Date: 2026-10-12. Fixed source: [arXiv:1912.03420v2](https://arxiv.org/pdf/1912.03420v2), 2 February 2020, 16 pages. Preprint title: *Joint Transmit Beamforming for Multiuser MIMO Communications and Radar*. Journal identity: IEEE TSP 68, 3929–3944, 2020, DOI [10.1109/TSP.2020.3004739](https://doi.org/10.1109/TSP.2020.3004739). The journal title includes a second “MIMO”; all equation/figure locators below refer to the frozen v2 PDF.

The exact local PDF SHA-256 is `efab9278425f628e33296624fa656b782b84f11c0447bd98487828c04b4094e2` (956,383 bytes). Its first-page version banner and source contents were checked, including against the official PDF opened on 2026-10-12. The bytes were copied from the earlier local source cache, not redownloaded during this pass. The earlier cache's exact retrieval date is unverified. Source PDFs/text remain local research inputs and are excluded from deliverable archives and repository integration.

## Observations, unknowns, normalization

- Paper §II, Eqs. (1)–(7): `x = Wc c + Wr s`, with K communication streams, M radar streams, unit source covariance, and zero cross-covariance. `R=Wc Wcᴴ+Wr Wrᴴ`; every antenna has average power Pt/M. This is an ensemble covariance model, not instantaneous constant-envelope or peak-power enforcement.
- Paper §III, Eqs. (8)–(11): radar uses the entire transmitted waveform, including known communication symbols. For steering vector a(θ), power is `aᴴRa`; target correlation is `a(θq)ᴴ R a(θp)`. In this implementation, `a_m(θ)=exp(+j π m sinθ)`, m=0,…,M−1, with unit entries (not unit-norm steering). The source specifies a half-wavelength ULA but does not explicitly fix this exponential sign. Conjugating the convention consistently mirrors the symmetric beampattern setup; it does not change the iid circular-Rayleigh distribution. The actual chosen convention and complete H are exported.
- The known instantaneous channel H is K×M and row k is `h_kᴴ`. Receivers do not know/cancel dedicated radar symbols. Noise `.01` is a power/variance, not a standard deviation.
- Wc (M×K), Wr (M×M), covariance R, and free real scale α are optimization unknowns. The receiver/noise waveforms are not simulated in this covariance experiment.

## Exact radar objective, not an analytic recipe

Paper §III-A, Eqs. (12)–(15), PDF pp. 4–5:

`L1 = (1/L) Σ_l |α d(θ_l) − a_lᴴ R a_l|²`

`L2 = [2/(P²−P)] Σ_{p<q} |a_qᴴ R a_p|²`

`Lr = L1 + wc L2`

For three targets, there are three unordered pairs and the weight is 1/3, not 1/9 or 1/6. α is optimized, and is not fixed to one or the peak of the desired pattern. With covariance R fixed, α is the least-squares scale `(dᵀ P)/(dᵀd)`. The radar-only reference solves Eq. (15) with R PSD and diagonal Pt/M. This differs fundamentally from the existing site's analytic Rstar recipe.

The original 1801-point grid and all 303 inclusive on-beam samples are retained. An orthonormal real basis for M×M Hermitian matrices represents R with M² real coordinates. Stacking all pattern and real/imaginary cross-correlation residuals yields a real 1807×101 least-squares matrix at M=10. Thin QR reduces this to a 101×101 objective factor. No samples, terms, eigenmodes, or eigenvalues are discarded. Independent direct full-grid evaluation and solver encoding verify this algebraic compression.

## Algorithm 1: tight SDR and constructive recovery

Paper §IV-B, Eq. (32), Algorithm 1, PDF pp. 6–7:

Minimize Lr over R, R1,…,RK, α, subject to:

- `R ⪰ 0`, `Rk ⪰ 0`, and `R − Σ Rk ⪰ 0`
- `diag R = Pt/M`
- `(1+1/Γ) h_kᴴ Rk h_k ≥ h_kᴴ R h_k + σ²` for Γ>0

The implementation uses the equivalent bounded-coefficient inequality `a s_k − b t_k ≥ b σ²`, where `a=(1+Γ)/max(1,Γ)` and `b=Γ/max(1,Γ)`. This avoids division by Γ at the boundary Γ=0 while preserving exactly the positive-Γ feasible set.

Eq. (33) sets `w_k=Rk h_k/sqrt(h_kᴴ Rk h_k)`, then `Rk_tilde=w_k w_kᴴ`. Cauchy–Schwarz establishes `Rk−Rk_tilde ⪰0`, each user's desired covariance power is preserved, and `R−ΣRk_tilde ⪰0`. Eq. (34) factors this remaining covariance into Wr. A Hermitian eigensquare-root is used instead of unpivoted Cholesky because optimum covariances can be singular. It is mathematically an allowed covariance factor; all clipped negative numerical eigenvalues and resulting factor residuals are recorded. Materially non-PSD residual covariance fails recovery instead of being silently projected.

Final SINR is recomputed from actual factors: desired `|[HWc]kk|²` divided by other communication streams plus `||[HWr]k,:||²+σ²`. A relaxed covariance's good SINR does not excuse a failed recovered-factor SINR gate. Rank-one communication columns and the full residual radar factor are exported. Optimality is judged through primal residuals, dual/KKT diagnostics, objective recomputation, and an independent formulation, rather than solver status alone.

## Algorithm 2: optimized ZF QSDP and row QR

Paper §IV-C, Eq. (40), Algorithm 2, PDF pp. 7–8:

Minimize the same Lr over R, p, α, subject to `R⪰0`, `diag R=Pt/M`, `H R Hᴴ=diag(p)` and `p_k≥Γσ²`. This optimizes R and p; it is not an inverse/pseudoinverse communications beamformer followed by arbitrary radar filling.

Take any square root `R=Lr Lrᴴ`. Row QR of `H Lr` gives `[Lh,0] Qh`. The QR implementation factors `(H Lr)ᴴ`, then phase-corrects the columns so the triangular diagonal is positive real. Because `H R Hᴴ=diag(p)`, Lh equals diag(sqrt(p)) up to solver residual. Eq. (42) constructs `W=[Lr Qhᴴ, 0_(M×K)]`; the first K columns are Wc and the remaining M columns are Wr. This preserves R and produces diagonal HWc and zero HWr up to residuals. Tests include singular covariance, complex phases, and nontrivial channels.

At Γ=0, SDR can achieve radar-only performance, but ZF still imposes diagonal H R Hᴴ and generally has a nonzero loss. The implementation and boundary tests explicitly preserve this distinction. Tightening Γ nests feasible sets, so the minimum radar objective cannot decrease beyond numerical error; the contrary isolated sentence on v2 PDF p. 8 is inconsistent with its constraints and the following discussion.

## Selected original-dimensional experiment

Paper §V, PDF p. 9, §V-A Fig. 3 and §V-B Figs. 5–8 / Eq. (46):

- Preserved: M=10, K=2, half-wavelength ULA, aperture 4.5 wavelengths, Pt=1, equal per-antenna .1, σ²=.01, beams −40/0/40°, width10°, grid −90:.1:90°, wc=1, iid standard complex Gaussian H
- Chosen explicitly: Γ=4:2:24 dB and 32 paired channels, NumPy PCG64 seeds 2026101201 through 2026101232. A channel is reused by both methods and across thresholds, improving paired comparison without altering its marginal distribution
- Recomputed: radar-only optimum; all SDR/ZF optimization and recovered factors; Eq. (46) mean-square difference from radar-only power; achieved user SINRs, sum rate, radar-interference/noise; feasibility and numerical-failure counts; runtimes
- Deviations: 32 instead of 1000 trials; only K=2, not 4/6; SCS/CVXPY instead of MATLAB CVX; no SSP; no N=1024 QPSK realization or receive-side experiment; seeds/tolerances of the source unavailable
- No author numerical data was digitized or used as solver inputs; no claim of exact original plotted values or random realization matching
- SDR minimizers need not be unique. Different solvers may return virtually identical radar objectives/covariances but different decompositions, achieved SINRs and sum rates. The source's Fig. 6 is not uniquely determined by the convex objective at every channel and Γ without a tie-breaker; this reference adds no undisclosed tie-breaker

Results are a selected core reproduction with declared deviations, not full-paper reproduction. Full1000-trial curves, K=4/6, SSP, receiver estimation/detection, and actual browser execution remain open.

## Numerical dual representation caveat

The initial native complex-CVXPY implementation is preserved with all primary results. An independent review found that CVXPY 1.9.3 can unpack a real-cone PSD dual using a half-block expression that assumes block symmetry. The full adjoint is D11+D22+j(D21−D12). `refinement.py` uses explicit real cones and this full-block map; it solves the identical QSDP. All failed primary gates remain visible, and later accepted outcomes are selected only after the unchanged factor/residual gates pass. See the final numerical report and independent dual-mapping audit.
