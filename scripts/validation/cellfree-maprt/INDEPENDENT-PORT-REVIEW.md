# Independent review: live reduced cell-free MAPRT / bounded CCP port

## Verdict

**ACCEPT the frozen numerical runtime for the disclosed reduced conditional model.** This acceptance covers genuine fresh MAPRT simulation and bounded three-start CCP, its retained numerical outcomes, finite-count statistics, JSON detector replay, and dedicated Worker lifecycle under the Node adapter. It is not acceptance of a deployed website, actual browser/device performance, full-paper reproduction, population feasibility, distribution-free CFAR, or global nonconvex optimality. Actual browser integration remains a separate release gate.

Reviewed source: arXiv:2305.12523v2; accepted Python reference manifest SHA256 `30a8e28487ddce0542d767482e02b6eb6af9397a5b69187071f5507cd8e774a5`.

Frozen executable manifest: `RUNTIME-MANIFEST.json`, SHA256 `4614ef3d375be7185cf32759a4e00638ee0a2db091cce57b62bc7268ff07f9e5`. All nine listed source hashes were independently verified after final tests. This review is invalidated by changes to those executables until affected tests are rerun.

## Independent evidence

- 48 fresh dense complex MAPRT cases, varying dimensions and physical scale down to approximately 1e-14: 672 joint-density MAPRT / marginalized LRT score comparisons against augmented complex least-squares and covariance-determinant oracles; maximum absolute discrepancy 2.72e-12. No implementation score was used as its own expected answer.
- 30 separate fresh randomized convex power problems with 2–8 streams: 208 certificates reconstructed independently from primal constraints, gradients, nonnegative multipliers and the proven amplitude box. Maximum certificate discrepancy 1.78e-14. Independent SciPy SLSQP objective comparisons respected the lower bounds; maximum objective discrepancy 3.16e-9. All failures remain failures, including six communication candidates that were not accepted.
- 20 final fresh runtime executions spanning both joint domain endpoints and 18 interior/bounded settings. All 20 returned completed runs, but only 18 completed both requested CCP families. 152 AP/SP cells and 89,892 scores independently reconstructed from raw draws and freshly generated designs. Maximum score discrepancy 5.83e-11; maximum design discrepancy 3.55e-21. These are direct algorithm executions, not frozen-trace substitution.
- 1,599 runtime convex certificates, including every accepted and failed restart iteration, independently checked. Maximum certificate discrepancy 2.49e-14; source tangent discrepancy 6.22e-15; fitted/holdout metric discrepancy 3.56e-15. Predeclared three-start formulas, selected-best-accepted restart, monotonicity, termination tolerances, zero sensing power in prohibited-sensing families and every failure listing were checked. Of 120 CCP restart candidates, 107 accepted and 13 reached the iteration cap. Two runs had all three starts fail in both CCP families; their baseline-only outputs and failures are preserved.
- Nine independent raw scenario reconstructions checked RZF precoders, orthogonal sensing projection, fitted and holdout moments, AP power coefficients and sensing quadratic matrices. Maximum moment/precoder discrepancy 6.14e-13.
- Calibration order statistics, all finite-count decisions, false-alarm/detection counts, calibration beta intervals and pointwise exact Clopper–Pearson intervals independently matched SciPy beta inversion. Maximum interval discrepancy 5.93e-15. Calibration and evaluation draws are distinct. AP/SP use the same actual observations; different allocations use common latent draws and different observations.
- 57 of 76 fitted allocations crossed at least one nominal holdout constraint. Every fitted allocation includes independent holdout metrics and explicit nominal crossing flags. Fitted feasibility is not population feasibility.
- Actual dedicated Worker code executed through a minimal Node worker_threads/self adapter: cancellation and rejected promise, termination at the power phase, restart to completion, overlap/busy guards, invalid settings/command/JSON recovery, stale-worker error/result/progress isolation, wrong-generation rejection, synchronous postMessage failure cleanup, codec roundtrip/replay, and permanent destroy all passed. This is Worker-thread evidence, not an actual-browser execution claim.
- 43 independent contract adversaries rejected: immutable bounds, invalid setting keys and values, nonfinite/malformed/UTF8-oversized JSON, corrupted or incomplete raw dimensions, scores, thresholds, decisions, counts, rates, intervals, constants and detector/allocation sets.

## Scientific and implementation boundaries

The fresh synthetic realization and PRNG differ from the accepted Python archive. The browser-native convex barrier Newton solver is not SciPy SLSQP. Its retained statuses and attempts cannot be represented as a reproduction of Python status-8/retry history. Each accepted convex subproblem has a float64 supporting-plane numerical gap certificate, not directed-rounding proof; the original CCP problem remains nonconvex and locally solved.

The accepted Python reference's essentially zero selected sensing power, held-out crossings and surrogate/Pd ordering reversal at unequal used expected power remain explicitly disclosed in the runtime README. Fresh designs may legitimately differ. There is no forced outcome and no dominance claim based only on a common cap. Runtime expected-block quantities are W-symbol sums, not joules without symbol duration. Detector replay checks consistency only: it is not authentication, independent scenario validation or independent power-certificate verification.

The runtime is bounded to its declared controls and 50 outer / 400 inner iterations per each of three predeclared starts per family. Resource limits do not guarantee any browser latency or device-wide memory budget. Cancellation during a synchronous numerical phase relies on terminating the Worker.

## Reproduction

Place this review directory beside the unmodified `cellfree-maprt-browser-prototype` directory. Requires Node.js, Python, NumPy and SciPy. Execute:

1. `OPENBLAS_NUM_THREADS=1 python oracles.py`
2. `OPENBLAS_NUM_THREADS=1 python power-oracle.py`
3. `node runtime-driver.mjs && node fresh-random-driver.mjs`
4. `OPENBLAS_NUM_THREADS=1 python runtime-oracle.py`
5. `OPENBLAS_NUM_THREADS=1 python runtime-power-oracle.py`
6. `node lifecycle-probe.mjs && node contract-probe.mjs`

The raw JSON, driver/oracle sources and machine-readable reports are retained. The review manifest records all evidence files; the separately stored archive hash avoids a self-referential manifest.
