# Atomic passive-OFDM receiver: bounded teaching validation

Validation date: 2026-10-12. Canonical lesson: `atomic-ofdm-receiver.html`. This record covers the owned lesson, model, numerical core, history worker and tests. Navigation/manifest integration, aggregate build and hosted-browser acceptance are separate release gates.

## Accepted numerical scope

The exact independently reviewed core is `labs/ofdm-reference/atomic-receiver-core.js`, SHA-256 `3d5656febab24737613e135946aada744d6083c93d5fe9d722b4f6ac2d568d14`. It is byte-identical to the frozen numerical review and has no added package dependency. It solves the complex two-level-Toeplitz Eq. (27) SDP with exact joint error/signal block minimization and Hermitian PSD projection. No grid dictionary replaces the optimizer.

Fixed source: [arXiv:1610.04218v2](https://arxiv.org/pdf/1610.04218v2), 2017-02-15, SHA-256 `f0441c1053085d83356e40d200fe83c442c33d5d403c39d2bc89745f8ac2a722`. The historical core version string remains `atomic-eq27-js-v0.1-pre-review`; the accepted file hash identifies the reviewed bytes.

Evidence is under `scripts/validation/ofdm-reference/atomic-receiver/`. The two downloadable frozen packages contain code, observations, fixtures, reports and numeric results, but no third-party paper PDFs/images or virtual environment. The source audit records exact printed-versus-derived update differences without speculating about author code. The independent convex solution, not visual agreement with paper figures, is the numerical authority.

## Live model and fair comparison

- M=N=4, D=16, 17×17 complex PSD matrix, 34×34 real embedding
- Fresh deterministic Eq. (6) post-FFT observations; two off-grid paths, dimensionless amplitudes 1 and 0.65, QPSK, complex Gaussian noise
- Declared SNR is sum of path powers divided by noise variance; it is not realized coherent-grid power
- A seeded selection flips one QPSK bit in each chosen reference symbol. Error count is not an original BER draw. The actual error is `(sTrue-shat)*z`
- Receiver input is only M, N, complex r, complex shat, lambda and mu. Truth, seed, frequencies and path count are rejected by the solver API
- Both methods receive the same input. CS-AN fixes e=0; it does not set a free-error penalty to zero
- Fixed rho=0.05, absolute/relative residual tolerances 10⁻⁹ and 10⁻⁸, fixed validated eigensolver accuracy 10⁻¹², common iteration budget
- Convergence checks primal/dual residuals, stationarity and projection accuracy. max_iter, numerical failure and cancellation retain their distinct meanings
- Changing only reference error count or penalty/budget controls preserves the exact received observation r

## Solved SDP and detected paths remain separate

The solver works on continuous moments. General 2-D atomic-norm equality requires extra decomposition/model conditions and is not claimed. The sufficient rank certificate `rank(T)<min(M,N)` is not silently assumed.

Candidate exploration samples the actual dual polynomial magnitude `|aᴴnu|/lambda` on a periodic 64×64 inspection grid, finds local maxima and applies an exposed threshold. It never receives truth or true K. It is not the source extraction procedure or a continuous dual-feasibility certificate. Truth is only revealed and evaluated separately: one-to-one strict toroidal errors below 1/16 in both coordinates. Error support uses declared `|e_i|>0.1*mu`. All results are counts for this observation, not probabilities.

Independent checks at seed 20261012 and threshold 0.995:

| Preset / CS-ANL1 | Status | Iterations | Candidates | Matched / missed / unmatched | Error TP / FP / FN |
|---|---|---:|---:|---|---|
| nominal | converged | 504 | 9 | 2 / 0 / 7 | 2 / 1 / 0 |
| errorFree | converged | 368 | 3 | 2 / 0 / 1 | 0 / 0 / 0 |
| closePaths | converged | 590 | 8 | 2 / 0 / 6 | 2 / 1 / 0 |
| denseErrors | converged | 558 | 13 | 2 / 0 / 11 | 1 / 1 / 7 |
| iterationLimit | max_iter | 500 | 9 | 2 / 0 / 7 | 2 / 1 / 0 |

The close-path matching count is under the stated broad coordinate gate and does not prove two resolved physical peaks. The dense-error failure and nominal extra candidates are deliberately retained. Max-iteration outputs cannot be relabeled converged even when their candidate counts resemble a converged output.

## Worker and interaction contract

The lesson history wrapper is separate from the frozen numerical-only worker. It runs at most four ADMM steps per task and yields at real recording boundaries. It records actual z/e/nu/t/diagnostics at initialization, every 50 steps and the terminal step; no interpolated solution state is invented. Scalar diagnostics also include iteration 1. Optional recordEvery stress tests verify decimation preserves actual states.

The displayed runtimeMs starts after core initialization and is sampled when the final snapshot writes that field. It includes task scheduling waits, but excludes input generation, Worker loading, the final snapshot’s later matrix/eigenvalue diagnostic, final-result message transport, DOM/SVG rendering and download. It is not end-to-end latency.

Two independent workers solve the paired methods. The UI starts only on explicit Run. Cancel, rerun, input changes, reset and errors terminate old work; stale IDs/results cannot re-enable export. Settings/versions/dimensions/finiteness/history consistency are checked before accepting a result. A current comparison can be exported only when both methods finish against the same committed input. Export includes declared truth separately and retains max_iter as unfinished. Missing modules or Worker support produce visible blockers with no precomputed fallback. Threshold/history/truth controls only inspect or postprocess existing computations.

## Executed gates and evidence

Focused repository commands (Node 24.19.0):

```sh
node --test tests/atomic-receiver-core.test.cjs tests/atomic-receiver-model.test.cjs
node --test tests/atomic-receiver-worker.test.cjs
node --test tests/atomic-receiver-ui.test.cjs
```

The combined run before the final timing-caption-only clarification passed **85/85 tests**: 43 numerical/model tests, 6 actual Node-worker-thread tests and 36 UI/real-worker VM tests (44.433 s measured test-run wall time, not a browser latency benchmark). They include independent SCS fixtures, NumPy PSD references, both false-convergence regressions, exact history replay, decimation, cancellation, supersession and invalid requests. The UI suite uses a controlled DOM and actual numerical worker code in VM. Its range-input mock applies value clamping, and negative tests retain nonzero fake-initialization and false-convergence payloads. Independent review additionally passed 17 separate UI suites, including actual concurrent Node Workers, every retained default state and 512 complex cells. The final timing-caption clarification added one static test; both affected static tests pass, with runtime bytes unchanged. The integrated suite now contains 86 tests. Exact source and evidence hashes, including the timing-only addendum, are recorded in the lesson review reports. Tests support both source and builder-staged flat layouts.

Independent model/history review additionally reconstructs the random streams without reusing the generator, checks 65,536 noise samples, 324 observation-reuse combinations, all 4,096 dual-grid cells, periodic maxima, 411 association fixtures and all five real-core presets. Sixteen independent actual-worker suites compare every retained state to one-step replay, including non-divisor recording and decimation.

Independent UI review found and resolved real range-input value clamping, malformed nonzero initialization and late completed-worker version-event defects; all negative regressions remain. No headless/browser tool was used. VM tests cannot certify CSS layout, actual browser module/network loading, accessibility-tree behavior, a physical device, browser scheduling or desktop latency. Hosted-browser interaction acceptance remains required after authorized integration/deployment.

## Offline source-size evidence and open paper work

Original M=N=16, rho=0.05: the first 300 s ADMM timeout remains, followed by same-state continuation to 20,170 iterations / 596.449 s total. Independent SCS took 149.153 s / 1,150 iterations. Objective agreement 1.304×10⁻⁷ is separate from the conservative finite-SDP numerical bound gap 0.00216709. The paired original-size CS-AN run timed out at 450 s. These are cloud offline measurements, not browser controls or a complete performance comparison.

The source's full Fig. 8 BER sweep, detector/model-order thresholds, seeds and Figs. 6–7 remain open. The teaching observation excludes direct path, clutter, actual demodulation/FEC and time-domain intrablock Doppler/ICI. The source endpoint `fD*Tbar=0.312`, `fD/Delta_f=0.208` makes this approximation boundary material. A future time-domain stress test is a separate extension.
