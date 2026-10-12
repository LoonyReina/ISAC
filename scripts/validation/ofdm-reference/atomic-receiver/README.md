# Passive OFDM atomic receiver: bounded execution evidence

## Scope and reading order

The live lesson `atomic-ofdm-receiver.html` generates new **4×4 complex post-FFT observations** and solves the genuine finite two-level-Toeplitz semidefinite problem in Eq. (27). There is no frequency dictionary grid in the optimizer. The 64×64 sampled dual spectrum is a separately declared, truth-free candidate exploration after solving, not the source detector or a continuous dual-feasibility certificate.

1. [SOURCE-AUDIT.md](SOURCE-AUDIT.md): source version/hash, observation, exact operators, printed-versus-derived updates, missing figure settings and model boundaries
2. [NUMERICAL-GATE-REPORT.md](NUMERICAL-GATE-REPORT.md): frozen Python/SDP gate, including original 16×16 costs and retained timeouts. Its “next step” reflects that earlier historical stage, not the later JavaScript review
3. [CORE-INDEPENDENT-REVIEW.md](CORE-INDEPENDENT-REVIEW.md): subsequent independent JavaScript numerical gate, including direct PSD checks and false-convergence fixes
4. [CORE-REVIEW-FINDINGS.json](CORE-REVIEW-FINDINGS.json): both pre-fix negative examples retained
5. [lesson-review/INDEPENDENT-MODEL-HISTORY-REVIEW.md](lesson-review/INDEPENDENT-MODEL-HISTORY-REVIEW.md) and [lesson-review/ui/INDEPENDENT-UI-REVIEW.md](lesson-review/ui/INDEPENDENT-UI-REVIEW.md): separate model/history and controller/state review, with the separately frozen [timing-caption addendum](lesson-review/TIMING-DISCLOSURE-ADDENDUM.md). Node/VM checks do not certify a browser or desktop latency

The public lesson provides a local JSON export of the actual committed observation, settings, both full results, scalar trajectories and real sampled iteration states. Truth is stored in a separately identified evaluation section and is never passed to the receiver or candidate extraction.

## Immutable numerical packages

| File | SHA-256 |
|---|---|
| [atomic-receiver-reference-v1.zip](atomic-receiver-reference-v1.zip) | `d95375059d049e64520c8675e868b66fbf4ba3428b7960b8653828b4d47089ac` |
| [atomic-receiver-js-v1.zip](atomic-receiver-js-v1.zip) | `b81afe31901c7fd40e25cbca25ecd5d245efb081a9cad48bdf48811454da90ce` |

The Python archive contains reproducible source/solver/baseline code, numerical results and precise checkpoints; it excludes the downloaded paper PDFs and environment. The JavaScript archive freezes the separately reviewed core and original numerical-only worker, fixtures and checks. The lesson's additional history wrapper is reviewed separately and does not alter the solver bytes.

Source: Zheng and Wang, [arXiv:1610.04218v2](https://arxiv.org/pdf/1610.04218v2), 2017-02-15. PDF SHA-256 `f0441c1053085d83356e40d200fe83c442c33d5d403c39d2bc89745f8ac2a722`.

Reviewed browser-compatible core SHA-256: `3d5656febab24737613e135946aada744d6083c93d5fe9d722b4f6ac2d568d14`. Its historical internal string remains `atomic-eq27-js-v0.1-pre-review`; exact bytes, rather than a renamed string, are the reviewed identity.

## What the numerical agreement establishes

- Independent Python CVXPY/SCS uses a full Hermitian variable plus separately imposed equal-lag constraints, rather than sharing the ADMM lag map
- Nine fresh common observations validate the JavaScript core against Python and that independent convex solution; direct PSD fixtures use a separate NumPy eigensolver
- The finite SDP is a genuine continuous-moment formulation. **Unconditional equality to the 2-D continuous atomic norm is not established**. A valid Vandermonde decomposition is sufficient; the `rank(T)<min(M,N)` theorem is one sufficient route. Failure of that easy rank condition is not proof of inequality
- The fixes derive the exact joint block minimizer from Eq. (27), including complex conjugation, dimensions, zero-lag indexing and dual scaling. This is an independently derived implementation, not a claim about unavailable author code
- Exposed eigensolver tolerance is fixed to the reviewed accuracy. Finite inputs that overflow intermediate arithmetic terminate with numerical failure, not convergence

## Original-size calculation remains offline

At M=N=16, source rho=0.05, declared seed 161004218, scenario 1 and BER=0.02, exact-block ADMM first timed out at its 300 s budget after 10,613 iterations. Continuation of that same state/rho/tolerances converged at 20,170 total iterations and 596.449 s total. SCS took 1,150 iterations and 149.153 s. Their objective difference was 1.304×10⁻⁷; the separate conservative finite-SDP numerical primal/dual bound gap was 0.00216709. Neither number is an unconditional atomic-norm certificate.

The original-size fixed-error CS-AN ablation remained unfinished after its separate 450 s budget. Do not use that pair to claim a solved performance advantage. The first timeouts, continuation, exploratory extraction false candidates and error-support false positives remain in the reference archive.

Reduced Python cloud timings on three fresh solves were 0.158124 s median at 4×4 / 1,129 iterations, and 7.621702 s median at 8×8 / 6,179 iterations. These used a different stated fixture from the lesson. They are neither JavaScript nor desktop/browser latency measurements. The live cap stays 4×4.

## Teaching protocol, deliberately distinct from Fig. 8

Two off-grid paths have dimensionless amplitudes 1 and 0.65, and unit-energy QPSK symbols. Noise is complex Gaussian with variance `sum(|alpha|²)/10^(SNR/10)`. The observed r is generated using true symbols; selected reference symbols have one I/Q-bit sign flipped. The count is a specified number of symbol errors, not a Monte Carlo BER. Changing only that count or regularizers preserves exactly the same r. No direct path, clutter population, reference-channel demodulator or FEC is simulated.

Both methods receive the same r, estimated symbols and lambda; CS-AN fixes e=0. CS-ANL1 estimates e with positive mu. Source rho=0.05 and declared absolute/relative tolerances 10⁻⁹ / 10⁻⁸ are shared. A max-iteration result is retained as unfinished.

Candidates are periodic 8-neighbor local maxima of sampled `|aᴴnu|/lambda` above a declared threshold (default 0.995). The evaluator alone sees truth and uses one-to-one matching, strict toroidal coordinate errors below 1/16. Error support uses declared `|e_i|>0.1*mu`. These are single-observation counts, not detection or false-alarm probabilities.

At the default seed, the nominal robust solve converges in 504 iterations yet has 9 candidates, only 2 matched paths and 7 unmatched candidates. The dense-error preset has 13 candidates, 11 unmatched, and recovers only 1 of 8 true error cells under the declared support threshold. These failures are preserved; the lesson is not selected to promise perfect detection.

## Still open

The original detector/model-order thresholds, source seeds, full Fig. 8 two-scenario/11-BER/100-realization comparison, M=16/N=64 Figs. 6–7, unconditional atomic-norm equality, actual hosted-browser interaction and target-desktop latency are separate gates. The post-FFT Eq. (6) approximation is explicit: the source velocity endpoint implies `fD*Tbar=0.312` and `fD/Delta_f=0.208`; time-domain ICI accuracy is unvalidated. A future ICI stress test is a modeling extension, not a replacement for this convex-program agreement.
