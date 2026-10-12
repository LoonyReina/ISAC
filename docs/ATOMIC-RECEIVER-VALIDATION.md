# Atomic passive-OFDM receiver: bounded teaching validation

Validation date: 2026-10-12. Canonical lesson: `atomic-ofdm-receiver.html`. This record covers the owned lesson, model, numerical core, history worker and tests. Navigation/manifest integration and the final 1285-test aggregate passed for PR75. The dated deployed-desktop acceptance below is a separate gate from the numerical/VM checks.

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

Independent UI review found and resolved real range-input value clamping, malformed nonzero initialization and late completed-worker version-event defects; all negative regressions remain. No headless/browser tool was used. VM tests cannot certify CSS layout, actual browser module/network loading, accessibility-tree behavior, a physical device, browser scheduling or desktop latency. The later deployed-desktop gate below supplies bounded browser evidence; these VM checks remain distinct from that evidence.

## Offline source-size evidence and open paper work

Original M=N=16, rho=0.05: the first 300 s ADMM timeout remains, followed by same-state continuation to 20,170 iterations / 596.449 s total. Independent SCS took 149.153 s / 1,150 iterations. Objective agreement 1.304×10⁻⁷ is separate from the conservative finite-SDP numerical bound gap 0.00216709. The paired original-size CS-AN run timed out at 450 s. These are cloud offline measurements, not browser controls or a complete performance comparison.

The source's full Fig. 8 BER sweep, detector/model-order thresholds, seeds and Figs. 6–7 remain open. The teaching observation excludes direct path, clutter, actual demodulation/FEC and time-domain intrablock Doppler/ICI. The source endpoint `fD*Tbar=0.312`, `fD/Delta_f=0.208` makes this approximation boundary material. A future time-domain stress test is a separate extension.

## Deployed desktop acceptance, 2026-10-12

Verified 13:09:56–13:15:08 UTC at the canonical [live lesson](https://loonyreina.github.io/ISAC/atomic-ofdm-receiver.html#experiment), deployed from [PR75](https://github.com/LoonyReina/ISAC/pull/75), main `3e9263a70c6f067520a6c0b1b0cd93dc96b6b007`, tree `00774b68517ee12a03b25b4b276e4b36d9d5e6d5`. PR verification `38252664344` and main build/deployment `38253153897` succeeded. Cloud Chrome desktop viewport was 1180 CSS px, document scrollWidth 1165; browser version and CPU were not recorded.

### Served resources and actual downloaded computation

All five served resources matched the reviewed source bytes:

| Resource | SHA-256 |
|---|---|
| atomic-receiver-core.js | 3d5656febab24737613e135946aada744d6083c93d5fe9d722b4f6ac2d568d14 |
| atomic-receiver-model.js | 69e4047b5c4cbe13663a881c7b34b460600c099f3ddea352e3eb4733b4086a96 |
| atomic-receiver-worker.js | 233a726566f920819c009bb16a9bcd4fbbe472faa8eecfd8504cda7a21551bef |
| atomic-receiver.js | b01de3d5ec1668469630a0b013b7ce1328fcb102504e4213db3bb1c6d93ae3ef |
| atomic-receiver.css | f19f6679205699ebd6a0276e3cfbacc6a7e5afc56cc5d31bf4fa387edac83421 |

The actual default JSON download was parsed and re-solved with the Node core. Both methods reproduced z and e with maximum entry difference 0, identical objectives and identical iteration counts:

| Method | Iterations | Objective | Candidates | Matched / missed / extra | Error TP / FP / FN |
|---|---:|---:|---:|---|---|
| CS-ANL1 | 504 | 1.0116013539948374 | 9 | 2 / 0 / 7 | 2 / 1 / 0 |
| CS-AN, e=0 | 950 | 1.0622598968223653 | 15 | 1 / 1 / 14 | 0 / 0 / 2 |

These are single-observation outcomes under the stated sampled-grid threshold and matching gate, not detection probabilities or a physical resolution certificate. No browser downloads or private machine paths are included in this report.

### Observed teaching and interrupted flows

- Actual history slider ends at 12/12, iteration 504. Home returns to initialization 0, Next shows actual iteration 50, switching method ends at 20/20, iteration 950. Cell 15 corresponds to m=3, n=3
- Threshold 1.010 produces zero candidates and two misses; restoring 0.995 restores nine candidates under the same run 1. Blank threshold disables export. Parameter edits invalidate prior results and disable export
- Changing reference-error count from 2 to 0 preserves exactly the same received r and changes the reference symbols. The two methods finish in 368/366 iterations with three candidates and two matches each. New seed 20261013 changes r; keyboard Enter starts a fresh run
- The iteration-limit preset leaves both methods at 500 iterations, explicitly unconverged. The dense-error preset retains its 558-iteration CS-ANL1 result, 13 candidates, two matches, 11 extras, and error TP/FP/FN=1/1/7
- Actual in-flight Cancel was observed after 124 iterations, with export disabled. Actual in-flight Reset was observed after 108 iterations. Editing inputs during computation and starting the new configuration produced the current result without stale overwrite. Invalid mu=0 neither solves nor exports
- All four magnitude panels and dual plots were visually readable at this desktop width, without global horizontal overflow. The visible guide execution link, canonical lesson, notebook topic `atomic-ofdm-receiver`, and browser Back worked. No site-origin console errors were observed

### Timing boundary and remaining gates

The displayed default core intervals were approximately **1.06 s / 1.96 s** for CS-ANL1 / CS-AN. Their implementation boundary is the `runtimeMs` boundary described above: after core initialization through the early part of final snapshot construction, including task waits. They exclude Worker loading, final-result transport, rendering and download. They are neither Run-to-display measurements nor a repeated desktop performance benchmark; no percentiles or cross-configuration aggregate are reported.

This closes the bounded deployed-desktop interaction and downloaded-record replay gate. A repeated, named-device Run-to-painted-result benchmark and narrow-viewport certification remain open. Full Fig.8/BER studies, the original detector, time-domain ICI/model stress tests, and applicable 2-D decomposition/equivalence certificates also remain open. This check does not establish full-paper reproduction.
