# OTFS reduced statistical teaching extension

## What is new

This extension stays inside the existing `otfs-receiver.html` lesson and the same paper entry. The existing 4×8 sensing and 3×4 communication cores are unchanged. The new live experiment is a separate fixed 8×8 known QPSK frame under the literal Eq.14 numerical convention. It is not physical waveform equivalence, original-size Fig.4 reproduction, or a communication performance study.

Source: [1910.01896v1](https://arxiv.org/abs/1910.01896v1), Eq.14 and §IV-A/B, radar portion of Fig.4. PDF SHA256: `7787286d004ea1014fea059dea88ad4320536a8afcef44dc89a482b0feaaabdc`. Derivatives are derived from the implemented Eq.14, not copied from inconsistent printed Eq.24/25 expressions; this is not an official erratum.

## Shared observation contract

N=M=8; T=6.4 μs; fc=5.89 GHz; range=20 m; velocity=80 km/h; c=299792458 m/s; h′=exp(0.3j). Known waveform is the exact fixed 64-symbol unit-energy QPSK frame from the reviewed offline study. Bandwidth is 1.25 MHz and useful duration 51.2 μs, versus source 10 MHz and 320 μs at 50×64. No guard-overhead efficiency claim.

q=τM/T and a=νNT. Search q∈[0,2], a∈[−1,1]. Unknown effective complex gain is fitted at every candidate: hhat=uᴴy/(uᴴu), score=|uᴴy|²/(uᴴu), u=Ψ(q,a)x. All three estimators use exactly the same generated complex y, known x, and search domain. Truth is used only for generation and evaluation, never as a solver start. Coarse grid: 11×11=121, 0.2-bin spacing. Fine grid: 81×81=6,561, 0.025-bin spacing, containing every coarse point.

Live noise is deterministic uint32-seeded Mulberry32 with Box–Muller circular complex Gaussian draws E|w|²=1, then scaled by 10^(−SNR/20). SNR=|h′|²Pavg/E|w|², Pavg=1. This PRNG is a teaching repeatability contract, not NumPy PCG64 replay or a cryptographic generator. For one seed, changing SNR scales the same standard noise. Seed/SNR edits terminate the active worker and hide all old outputs until a new completed run. No parameters are uploaded or persisted.

## Local refinement and local bound

Live extension: deterministic bounded eight-direction pattern search; initial step .025 bins, halve step when no score improvement greater than 1e−13(1+|score|), stop at step≤1e−7 or 160 iterations per start. Starts are the fine-grid maximum and the best strictly interior candidate in each of the two delay cells, deduplicated. Each attempt stays in its initial open delay cell with 1e−8 margin, Doppler bounds [−1,1]. Fine-grid candidate always remains eligible. Feasible higher-score candidates may be retained even when iteration limit is reached; display their failed status. No global continuous optimality or improvement in parameter error is promised.

Live pattern search is a new algorithmic diagnostic, not the paper's finite-grid estimator and not SciPy L-BFGS-B. The offline statistics remain those of the independently reviewed SciPy experiment, not of this new browser solver.

FIM uses J=[u,ju,h′u_q,h′u_a] and 2 Re(JᴴJ)/variance, retaining unknown real/imaginary gain. The q/a covariance block matches nuisance-orthogonal derivative projection. Reject ordinary derivatives at integer q and reject non-positive/ill-conditioned FIM; never substitute a pseudoinverse. Covariance ellipse is a one-standard-deviation local information scale at truth, not a confidence region, realized-error guarantee, or global MSE bound for biased constrained/grid estimates.

## Offline statistical evidence

Seven SNR values −25,−20,−15,−10,0,10,20 dB; 200 independent trials per SNR; fixed known frame and fixed target. Independent noise between SNR levels, paired across estimators. All 1,400 trials retained. Local offline solver: SciPy L-BFGS-B, max100 iterations, max30 line searches, ftol1e−13, gtol1e−9. Among 2,985 local attempts, 39 report failed status; 19 of the 1,400 selected estimates come from failed-status but feasible improving candidates; 122 retain a grid estimate. These are three different counts, not reasons to discard trials.

Plots use all seven SNR points. Error bars are pointwise whole-trial percentile bootstrap intervals, 1,000 resamples, conditional on this x and target; no simultaneous band or uncertainty across scenarios. Outlier criterion is |q error|>.5 OR |a error|>.5 bins; this is not false alarm or missed detection. Coarse delay RMSE at 0 dB is below fine delay RMSE; nested-grid score ordering does not imply error ordering. All summary values and original result/raw hashes are in `otfs-receiver/statistics/offline-summary.json`.

Original-size Fig.4, OFDM/FMCW, source waterfall predictor, communication rate, multipath, unknown path count, physical operator equivalence, and live Monte Carlo remain outside this extension.
