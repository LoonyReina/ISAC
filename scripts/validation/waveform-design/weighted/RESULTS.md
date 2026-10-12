# Weighted waveform validation results

Date: 2026-10-12. Fixed source: arXiv:1711.05220v1 §IV Eq.(16)–(25), Algorithm 1.

Status: Python reference v3 independently accepted; JavaScript v0.2 independently accepted. No UI, browser, deployment, constant-modulus or whole-paper completion claim.

## Algorithm evidence

- 275 cases: 15 analytic/boundary and 260 fresh generated cases
- 3288 exact-energy random rival waveforms and 75/75 converged independent equality-SLSQP runs
- Maximum relative energy residual 1.380e-15; scaled KKT residual 4.843e-15; residual-certificate relative gap 1.948e-14
- SLSQP maximum relative objective disagreement 2.278e-12; all 7 malformed/out-of-contract inputs rejected
- Brent secular solve and a separate bisection search agree; hard/singular/flat/zero-energy cases are explicitly covered

## Requested radar-closest option

- 278 inputs preserve the primary weighted optimum within tolerance and never worsen the secondary radar distance; 432 random primary-optimal rivals checked
- Maximum relative primary difference vs canonical 8.657e-13, secondary analytic-oracle gap 1.190e-14
- 4 below-threshold projected-reference cases explicitly retain canonical fallback/nonuniqueness
- 903 scalar phase/energy edge cases pass, including E=10^12; maximum relative energy residual 4.883e-16
- Strict over-cap inputs still reject; both reviewer-discovered implementation issues are reproduced and fixed with prior bytes retained

## Important: original Fig.3 weighted curve is not numerically reproduced

Our source-exact ρ=.1 omnidirectional curve gives 12.882±0.026(SE) at10dB and14.831±0.038 at12dB. Independent visual reading of the fixed paper's blue dashed markers suggests approximately13.36 and15.59, respectively, with image-reading uncertainty. The shortfalls are approximately0.48 and0.76bps/Hz, larger than this experiment's Monte Carlo standard errors. The strict curve roughly matches the source (our10.531/11.626; visual source≈10.56/11.64). These are approximate visual comparisons, not calibrated curve digitization. The parameter slice is explicitly nonmatching and must not be called reproduction of the original weighted curve.

Possible explanations and evidence:

- Wrong implementation of Eq.(16): source derivation, analytic boundaries, equality-SLSQP, fresh independent lifted SDP and dual certificates all support the implemented equation. No numerical evidence of such an error remains
- Different strict-X0 nullspace completion: for isotropic covariance and full-row-rank H, the communication projection and nullspace energy are invariant. A128-solve fresh check varying all free strict completion directions confirms rate/MUI invariance to roundoff; this does not explain the discrepancy
- Different original trial count or aggregation: not disclosed. We cannot attribute the difference to random seeds; our Monte Carlo uncertainty is much smaller than the apparent difference
- Different effective weight, objective normalization, channel/symbol scaling, or rate treatment in original figure generation: plausible implementation conventions, but the fixed source gives Eq.(16), ρ=.1, CN(0,1), unit-power QPSK and Pt=1 and does not support a substitute. No parameters have been tuned to match the picture
- ZF convention: unresolved, but it only explains ambiguity in the ZF baseline, not this paired strict/weighted discrepancy

The unresolved mismatch must remain prominent in any eventual source-comparison UI. The source-exact algorithm's independent validation and full-figure reproduction are separate claims.

## Original-parameter omnidirectional experiment

256 paired trials, seed171105225, NumPy PCG64; N=16,K=4,L=20,Pt=1,E=20, iid CN(0,1) H, unit-power QPSK S, isotropic strict X0, rho=.1. Source Fig.3 visible SNR grid: −2:2:12 dB. Same H/S/X0 and block energy for each paired comparison.

At 10 dB, mean ± Monte Carlo standard error:

- strictOmni: Gaussian-log rate 10.530542 ± 0.047521; MUI 7.96764; radar waveform distance 0
- weightedRho0p1: Gaussian-log rate 12.882087 ± 0.026059; MUI 1.71085; radar waveform distance 0.191574
- communicationEnergyOptimum: Gaussian-log rate 13.837726 ± 0.000000; MUI 8.54514e-29; radar waveform distance 29.2885
- communicationEnergyRadarClosest: Gaussian-log rate 13.837726 ± 0.000000; MUI 7.34789e-29; radar waveform distance 0.877166
- declaredEqualPowerZF: Gaussian-log rate 5.476979 ± 0.075610; MUI 46.3843; radar waveform distance 21.0831

Paired weighted-minus-strict rate improvement: 2.351545 ± 0.034900. Weighted MUI and rate diagnostic improve in all256 pairs. This is empirical for these inputs, not proof that MUI minimization generally maximizes sum rate.
At rho=1 all256 trials require extra nullspace energy beyond H†S (mean minimum-norm energy 6.686154 ± 0.072667, budget20). The canonical and closest-reference endpoints have equal primary optima; only the latter explicitly minimizes secondary distance.
Mean raw-pattern squared error from isotropy at rho=.1 is 0.00237057 ± 8.31965e-05. This pattern diagnostic is not the optimization objective or a detection-performance result.
Maximum energy relative residual 1.954e-15; maximum weighted certificate relative gap 2.406e-15.

## Why endpoint tie choice must be visible

- First original-parameter input, canonicalCompletion: MUI 9.375e-29, energy 20, radar waveform distance 34.0496192457
- First original-parameter input, radarClosestTieBreak: MUI 7.907e-29, energy 20, radar waveform distance 0.526147224195
- First original-parameter input, rhoJustBelowOne: MUI 7.229e-18, energy 20, radar waveform distance 0.526147222754

Thus the canonical endpoint radar-distance jump is an arbitrary optimum selection, not a necessary radar penalty. The near-one regular solution approaches the radar-closest endpoint. The previous canonical sweep and example are preserved.

## Reduced tradeoff sweep

1,920 fresh solves: 64 paired trials for each K=4,6,8; rho={0,.001,.003,.01,.03,.1,.3,.6,.9,1}; N=16,L=20,Pt=1. All192 paired curves have nonincreasing MUI and nondecreasing waveform distance. The rho=1 point uses the explicitly labeled radar-closest tie break. This is not Fig.5 detection probability or Fig.6 directional pattern-MSE reproduction.

## Unresolved original settings and limitations

- The original trial count, random seeds, and averaging convention are unavailable; ours are disclosed
- Exact original ZF normalization and coherent-gain receiver handling remain unknown; the normalized pseudoinverse baseline is expressly our convention
- Original directional least-squares R target widths, grid, weights and constraints remain missing. No synthetic directional covariance is represented as that original design
- Whether the original Fig.4 curves are a single realization or averaged remains unspecified
- Fig.5 detection probability requires the separate cited detection model; Fig.6 directional MSE metric needs its angular weighting
- Sum-rate values are per-user residual Gaussian-log diagnostics, not QPSK mutual information, BER, measured throughput, or the globally optimized objective
- Output certificate evidence does not certify UI responsiveness, actual browser execution, numerical core porting, or deployment
- The strict branch was already separately implemented; the constant-modulus/similarity branch remains open

## Independent Python gate (completed)

The separate review in `../waveform-weighted-review/REVIEW.md` accepts Python v3 SHA2565871d0a8ae481a723f662c120e87e24f8ef8534ebc5d88c8a63ce9bea987e880 for the weighted optimization and secondary option. It independently tested146 fresh primary cases,36 full lifted primal SDP comparisons,10 high-precision near-hard cases,56 new secondary cases,78 secondary SLSQP runs and2,160 nullspace rivals. It rechecked275 stored author outputs and independently reconstructed1,280 original-parameter metric blocks. The original Fig.3 mismatch remains explicitly open. The Python gate does not cover JavaScript, UI or publication.
