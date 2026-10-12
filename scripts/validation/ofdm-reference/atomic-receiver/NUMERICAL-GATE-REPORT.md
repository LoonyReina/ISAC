# Bounded numerical gate report

## Established

- Fixed source and complete observation/operator/update audit; all files stay in this independent reference directory
- Genuine continuous two-level-Toeplitz Eq27 solver; independent full-Hermitian-matrix CVXPY/SCS reference, with no frequency grid in either optimization
- 62 reduced analytic/operator/SDP/negative-control checks: PASS, plus independent block-update, simulation and baseline checks
- Original Fig8 dimensions M=N=16, PSD dimension 257, one declared Scenario1/BER=.02 seed: source-rho .05 exact-block ADMM converges after 20170 iterations and 596.449 s total measured wall time
- Original-size ADMM objective 0.941229992276; independent SCS 0.941230122687, absolute difference 1.3e-07; SCS 1150 iterations and 149.153 s
- Original ADMM primal residual 3.16e-07, dual residual 2.67e-06, minimum lifted eigenvalue -1.2e-07. The first 300 s timeout remains unchanged in its own checkpoint
- Separate conservative numerical finite-SDP bound interval [0.939062943210, 0.941230037444], gap 0.00216709. Cross-solver agreement is not that gap and is not exact arithmetic certification

## Reduced-size measured costs

Same source objective, rho=.05, atol=1e-9, rtol=1e-8; two off-grid paths, two signal-dependent QPSK errors, sigma=.02; three fresh solves each. Cloud Python on reported AMD EPYC 9V74, single BLAS thread, concurrent cloud work possible. These are not browser measurements.

| M×N | complex PSD | iterations | median s | max s | independent objective difference |
|---|---:|---:|---:|---:|---:|
| 4×4 | 17 | 1129 | 0.158124 | 0.158588 | 9.11e-10 |
| 8×8 | 65 | 6179 | 7.621702 | 7.883530 | 1.58e-10 |

## Baselines and limitations retained

- CS-AN is exactly e=0, not mu=0 with a free error vector. The original-size paired ablation stopped at its declared 450 s budget after 19720 iterations (status time_limit); do not use it to claim a validated performance advantage
- Discrete CS-L1 solves the original Cartesian-grid objective, checked by independent Clarabel. Original 16×16 paired solve converged; its objective is a different penalty problem and is not directly comparable as a performance score to atomic objectives
- MUSIC source smoothing/projector is implemented, but the paper omits model-order and detection rules. No true K is injected. K=84 in the dense scenario exceeds the 64-dimensional smoothed aperture, so oracle K is not even admissible there
- Declared dual extraction of the converged robust checkpoint returns 39 candidates and identifies 3/3 moving targets in this seed. This is an exploratory candidate protocol with extra paths and error-support false positives, not the original detector or reproduced conditional-RMSE curve
- No unconditional 2-D atomic-norm equivalence is asserted. The finite moment optimum's numerical rank exceeds the rank<16 sufficient decomposition condition
- The experiment simulates Eq6's post-FFT observations. At the source velocity endpoint, fD Tbar=.312 and fD/Delta_f=.208; time-domain intrablock Doppler/ICI accuracy is not established

## Still open

1. Validated complete detection/extraction rule, support threshold, root grid/refinement, false-alarm scoring and MUSIC rank selection, with all declared implementation choices separated from unavailable author settings
2. The complete Fig8 100-realization ×11-BER ×2-scenario comparison and all methods, including retained failures and denominators
3. Original M=16,N=64 Figs6–7; time-domain OFDM/ICI extension is separate
4. Unconditional atomic-norm/decomposition certification beyond this finite SDP is not established
5. Browser core independent cross-check, actual desktop latency, Worker cancellation/stale handling, UI learning gates and all deployment checks

## Recommended next bounded step

Port only the genuine 4×4 solver into an isolated Worker-ready numerical module, validate fresh common observations against the unchanged Python/SDP reference, and obtain independent review before any lesson UI. Keep 8×8/16×16 as labelled offline evidence until actual target-platform measurements support a larger live cap. See BROWSER-PORT-PROPOSAL.md.
