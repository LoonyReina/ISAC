# Independent bounded atomic-receiver lesson/model/history review

Date: 2026-10-12. Reviewer scope: numeric lesson model and postprocessing plus the actual authored numerical history Worker. No implementation file was modified by the reviewer. Reviewed source base: `8cd2f4e`.

## Decision

PASS on the exact final model/core/Worker hashes below. Nineteen independent model suites and sixteen actual-Worker suites pass. A prototype-name unknown-parameter acceptance defect was reported, fixed by the author, and regression-tested. This is bounded numerical/API acceptance, not browser acceptance or physical/detector certification.

| Reviewed source | SHA-256 |
| --- | --- |
| atomic-receiver-core.js | 3d5656febab24737613e135946aada744d6083c93d5fe9d722b4f6ac2d568d14 |
| atomic-receiver-model.js | 69e4047b5c4cbe13663a881c7b34b460600c099f3ddea352e3eb4733b4086a96 |
| atomic-receiver-worker.js | 233a726566f920819c009bb16a9bcd4fbbe472faa8eecfd8504cda7a21551bef |

The numerical core hash is the already independently accepted core. Its historical `pre-review` version text was not changed or treated as a new rejection. Prior finite-SDP review and independently fixed-source/Python evidence were read as context; the checks in this directory were constructed afresh for this lesson and history wrapper. Worker wrapper version is `atomic-receiver-history-v1`.

## Independent checks and observations

1. Reconstructed Mulberry32 using unsigned BigInt arithmetic rather than the implementation's bitwise code; checked 21 distinct seed/separation scenes, including uint32 extremes. Independently rebuilt unit-energy QPSK, the three segregated RNG streams, column-major Eq6 phase atoms, complex Gaussian noise, the error-position shuffle, and one I/Q sign flip per selected symbol.
2. Verified `r = s_true*z + v = shat*z + (s_true-shat)*z + v`; no independent arbitrary corruption amplitudes are substituted. The complex identity residual is below 1e-15. Symbol errors and bit errors coincide only for this declared one-sign-flip protocol; this is not the source paper's random BER experiment.
3. All 324 combinations of error count, lambda/mu multiplier and iteration cap preserve r, noise, noiseless z, transmitted symbols and bits byte-exactly for fixed seed/separation/SNR. Error support is nested as count increases from 0 to 8. Penalties scale as declared.
4. On 65,536 normalized complex-noise samples across 4,096 seeds, real/imaginary means were -0.000818/-0.000109, component variances 0.500298/0.501583, cross moment -0.001175, and mean complex power 1.001882. Direct algebra confirms sigma/sqrt(2) per component. Nominal SNR uses sum of path powers 1.4225 divided by sigma^2, not realized coherent finite-grid power.
5. Checked 256 combinations of inclusive input bounds and 24 malformed/out-of-bounds/unknown-key cases. The receiver input contains only M,N,r,s,lambda,mu; adding truth, seed, path count or transmitted-symbol fields is rejected by the core. Postprocessing was run through guarded proxies exposing only its declared numeric inputs. Modified simulation truth leaves input and extraction unchanged.
6. Independently constructed atoms and evaluated a(phi,psi)^H nu at all 4,096 grid cells. Signs, conjugation, phi-major order, and division by lambda agree. A phased on-grid atom peaks at the correct signed coordinates with unit ratio. The transform is magnitude, not power. No continuous dual feasibility certificate is claimed.
7. Checked wrapped edges/corners, flat nonzero plateaus and zero spectra against an independently enumerated eight-neighbor periodic peak rule. Equality breaks toward the smaller flattened index among neighbors. Threshold is inclusive (>=), monotone across 0.8..1.01, and only filters the previously computed local maxima. No truth count limits candidate output.
8. Every complex residual cell independently equals r_i - shat_i*z_i - e_i; observed, modeled, estimated-error and residual fields map to m=i%4,n=floor(i/4). Residual energy and norm are actual sums, with no truth-noise substitution.
9. Eleven explicit association fixtures cover both positive and negative strict coordinate boundaries, inside/outside values, wrapping, close paths, a single candidate shared by two truths, duplicate entries and a global-assignment case where greedy association fails. Another 400 independently generated fixtures agree with recursive exhaustive one-to-one assignment: maximize cardinality, then minimize squared coordinate error. Strict tolerance is |dphi|<1/16 and |dpsi|<1/16; these are teaching evaluation counts, not detection probabilities.
10. Estimated error support is strictly |e_i|>0.1*mu, including a test exactly at the threshold. Its non-source teaching status is disclosed. Actual support uses |truth e_i|>1e-12; in these scenes every flipped symbol has nonzero e because the two path amplitudes cannot cancel exactly.
11. Ran both CS-ANL1 and fixed-e-zero CS-AN on every preset through the real frozen core. Both branches receive the same observation/reference/penalties; only fixedError differs. All returned state entries are finite, and fixed-error estimates remain identically zero.

## Actual preset outputs (threshold 0.995)

| Preset | CS-ANL1 status / iterations | Candidates / matched / false | CS-AN status / iterations | Candidates / matched / false |
| --- | --- | --- | --- | --- |
| nominal | converged / 504 | 9 / 2 / 7 | converged / 950 | 15 / 1 / 14 |
| errorFree | converged / 368 | 3 / 2 / 1 | converged / 366 | 3 / 2 / 1 |
| closePaths | converged / 590 | 8 / 2 / 6 | converged / 1238 | 11 / 1 / 10 |
| denseErrors | converged / 558 | 13 / 2 / 11 | converged / 730 | 14 / 2 / 12 |
| iterationLimit | max_iter / 500 | 9 / 2 / 7 | max_iter / 500 | 15 / 1 / 14 |

The nominal CS-ANL1 estimated error support has TP=2, FP=1, FN=0. The dense-error case has TP=1, FP=1, FN=7. These failures are genuine results and must not be beautified, trimmed to two candidates, or replaced by truth. Close-path matching of two candidates under the declared relatively broad tolerance does not certify that the true paths were accurately resolved.

## Actual Worker and history checks

The Node adapter loads the exact authored Worker and core unchanged in an isolated VM inside a real `worker_threads.Worker`. Only the exact local core import is permitted. There is no browser, headless browser, Playwright, CDP, DOM or network in these Worker tests.

For all ten preset/method combinations, every stored z/e/nu/t value and every non-timing diagnostic agrees **exactly** with a separate core instance advanced one iteration at a time. Final matrices, final diagnostics and trace also agree. Runtime/elapsed timing is deliberately excluded from equality because it is environment-dependent.

Additional checks:

- recordEvery=7 with cap 123 preserves [0,7,14,...,119,123]
- recordEvery=1 and very strict stopping tolerances with cap 650 generates 651 sampled states; decimation retains 139 actual states, including 0 and 650, strictly increasing and without interpolation
- initialization has null diagnostics; ordinary full history samples iteration 0, recordEvery multiples and the terminal state; scalar diagnostic trace separately includes iteration 1
- stale/duplicate/negative/noninteger/unsafe request IDs are rejected; invalid requests do not consume the accepted-ID sequence
- wrong core version and forbidden truth input do not start a solve
- stale cancel is ignored; valid cancellation and supersession generate the right terminal reason and suppress stale final results
- invalid superseding input and wrong-version requests leave the current valid solve intact
- iteration exhaustion remains max_iter
- insufficient eigensolver sweeps and numeric overflow emit errors, never success; a subsequent valid solve succeeds
- every message carries the history wrapper version; ready/started/progress/result/cancelled messages carry the expected core version
- reviewed source files did not change during each Worker test run

Cancellation acknowledgement in Node is recorded only as a diagnostic, not as a browser responsiveness or desktop-latency claim.

## Findings and resolutions

F1, fixed: `generate` used `k in DEFAULT_CONFIG`, accepting inherited prototype names such as `{constructor:1}`, `{toString:1}`, `{valueOf:1}` and JSON `__proto__`. The author changed the check to own-property membership. All examples now reject on the reviewed model hash, while all numerical outputs stay unchanged.

A separate authored-page text issue was reported: it initially implied that full state history included iteration 1; only the diagnostic trace does. The page author is correcting that description. Page/controller/style acceptance is a separate scope and is not included in this freeze.

## Scope and limits

- The bounded 4x4 Eq6 synthetic scene and finite Eq27 SDP are covered; the existing independent finite-SDP core review remains authoritative for optimization correctness
- Original 16x16 runs remain offline evidence, not a browser alternative
- No original author random seed, BER experiment, full Figure8 sweep, full detector, gain re-estimation workflow, model-order selection, probability calibration or global continuous dual certificate is reproduced here
- Multidimensional continuous atomic-norm equality is not certified merely by solving this finite SDP
- Physical waveform accuracy, significant intrablock Doppler/ICI, geometry, synchronization/FEC and real receiver robustness remain open; no Eq6-only test establishes them
- Browser resource delivery, worker loading in hosted browsers, visuals, narrow-screen layout, accessibility interaction and browser timings remain separate acceptance work

## Re-run

Node v24.19.0 was used, without additional packages.

    node check_model.cjs /path/to/worktree
    node check_worker.cjs /path/to/worktree

Scripts default to the source or compatibility/publication root containing this evidence directory; an explicit source or flat-artifact root may be supplied as the first CLI argument. For UI checks use `node ui/check_ui.cjs [root]`; to stage and run the authored UI regressions use `node ui/run_authored_tests.cjs [root]`. Runtime lookup supports canonical `labs/ofdm-reference` / `content/pages` sources and the flat published layout. Run a writable copy of this evidence directory when preserving historical result files. The portability-only packaging changes affect evidence runners and this report, not any numerical or UI implementation. Historical freeze files retain the original review-runner identities; the separate packaging replacement manifest identifies the portable runner bytes. `model-results.json` and `worker-results.json` contain detailed observed values and pass/fail records. `MODEL-HISTORY-FREEZE.json` records source and evidence hashes. This directory's separate UI review files, if later added, are excluded from the model/history evidence freeze.
