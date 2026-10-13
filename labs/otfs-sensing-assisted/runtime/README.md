# Sensing-assisted OTFS: bounded browser-module prototype v3

A real JavaScript numerical port of the independently accepted interpreted coherent-effective-gain receiver from **arXiv:2105.03125v2**. This package computes fresh data, pilot, channel gains, complex noise and raw frames, estimates gains from pilot arrivals, and executes flooding Gaussian-moment SPA. It does not select cached BER records as live results.

**Status:** kernel/Python-oracle/actual Node module-Worker tests are included. Real-browser verification and website integration are separate, still-open gates. No website, repository or remote deployment was changed by this task. `index.html` is a standalone development harness, not an accepted production lesson.

## v3 numerical and export boundaries

v2 remains frozen under manifest SHA `48f70dd4e0a4b80853ce8a69d1351bf67fc9a1ba29b930d063e87b4738f9b283`. v3 fixes two independently reproduced boundary defects without changing the pinned reference:

- JSON normally loses negative-zero sign. Codec `sensing-otfs-finite-typed-json-v2` represents a negative zero as the strict one-property object `{"$number":"-0"}`, in both scalar and typed-array positions. Decode rejects other tokens, extra tag keys and lossy integer conversion. Raw Float64 evidence now round-trips signed zeros exactly, including legal all-zero channel populations
- A finite but extreme P1 case (y_data=1e12, a=1, Es=N0=1e−12) collapsed the two squared distances to equal floats and incorrectly reported p(+)=.5/converged, while its analytic scalar Gaussian LLR is4e18 and p(+)=1. v3 explicitly raises `NUMERICAL_CONDITIONING`, rather than returning a wrong converged result. For each nonpilot likelihood, it compares the pinned distance-based normalized probability to the algebraically equivalent equal-variance BPSK LLR only as a resolution guard. An absolute probability discrepancy above1e−9 is rejected. It does not replace returned probabilities, alter source formulas, or certify all possible conditioning issues. Simulation exceptions remain in denominators as conservative failure records; direct receive returns an explicit error

The original numeric counterexample and signed-zero failure are retained under `rejected-attempts/`; targeted kernel and actual-Worker tests accompany the repairs.

## v2 lifecycle correction

v1 remains frozen under manifest SHA `79c139b070143491597eb5bdc5c3186d6ae2b0a5567bc8b549b4002636697c82`. Independent review reproduced lost completed evidence when an older completion was deferred behind a newer submission and then cancelled or superseded. v2 retains the best per-request evidence across cancellation, supersession, release, disposal, transport failure and restart. Generation fences remain intact: an older result is never re-presented as the current result, and stale partial events cannot overwrite the current UI cache. Six additional actual-Worker regressions reproduce these ordering cases. The lifecycle repair does not change scientific formulas or the floating-point tie policy. v3 adds the separately documented numerical-resolution guard.

## Fixed source and interpretation

- Paper: https://arxiv.org/pdf/2105.03125v2 (11 May 2021)
- Accepted Python reference SHA-256: `c83ba035ee49d8011c2b3b8f5f0260b7e95fd2fb562781f03e63a1ea7407ddce`
- Accepted reference manifest SHA-256: `7108881a6de2402f519ca7e6ccb806b83196db9fdcb14fb330e023b21b5bdc1a`
- Lesson identity: `paperotfs-sensing-assisted-2021`
- The immutable reference is not modified. A pinned source copy and independent oracle source are included in `reference-copy/`. The complete prior 5,760-record experiment is not bundled into the live runtime. Its summary is retained in `reference-copy/RESULTS.md` as offline evidence only.

Read `reference-copy/CONTRACT.md` for the full mathematical contract. At index r=(k,l), y[r]=sum_p a_p x[r−s_p]+n[r]. The effective coherent gains retain phase, with no path-dependent global derotation. The one known pilot replaces a BPSK data symbol; there are no guard cells. Receiver support is externally declared integer circular support, not sensing-derived support. Duplicated modulo support is rejected rather than silently treating individual gains as identifiable.

The practical entry point accepts only raw y, predicted support, pilot location/value, Es/N0, declared prior gain powers and iteration settings. True symbols, physical support and gains stay in `evaluation.js`; only the clearly labeled supplied-CSI branch receives them. Under support mismatch, the wrong predicted support goes unchanged into estimation and the graph.

### Four modes

1. `moment_repaired`: source-graph-derived Gaussian moment messages, with each interferer's mean, its own marginal gain-error variance, and candidate-target uncertainty. This is an explicit project interpretation
2. `ignored_uncertainty`: same y, estimates, graph, initialization, damping and stopping, with gain-error variance zero
3. `literal_operational`: preserves source Eq.42, target-mean Eq.52 and exact outer-Es Eq.57 defects. The self-referential Eq.59 normalizer is repaired only to make this diagnostic executable
4. `supplied_perfect_csi`: extra-information evaluation oracle receiving true physical support and effective gains, variance zero. Its Gaussian messages are still approximate

The receiver's v_p=[Es(sum_j λ_j−λ_p)+N0]/Ep is an exact prior-averaged second moment under the declared law, **not** proof of independent estimation noise or an exact posterior. Same-frame errors depend on data and y; full covariance, pseudo-covariance and cross-covariance are omitted by the diagonal proper-complex surrogate. The preserved tiny fixture converges but differs from the exact physical unknown-gain posterior by **0.4999130751997302**, in one marginal. Convergence and supplied CSI must not be called exact MAP inference.

No original figure, full sensing/prediction/combining chain, practical fractional-pulse model, guarded or OFDM comparison, coding, downlink, or whole-paper reproduction is claimed. No guarded baseline is implemented here; this cannot change the source's 524-versus-480 guard-count discrepancy or justify an overhead advantage.

## Files and API

- `js/receiver.js`: numerical kernel; no random source, truth dependency, fixture lookup, DOM or network
- `js/evaluation.js`: fresh simulation and explicit evaluator/oracle boundary
- `js/validation.js`: strict schemas, finite numerical envelopes and computation limits
- `js/codec.js`: finite typed JSON export/import with exact signed-zero preservation and SHA-256
- `worker/receiver-worker.js`: browser ES module Worker and actual `node:worker_threads` entry point
- `worker/client.js`: cancel, newer-request fencing, partial preservation, transport failure and restart
- `index.html`, `harness.js`: manual real-browser test harness
- `fixtures/`, `reference-copy/`, `tests/`, `reports/`: raw full-output fixtures, independently derived scalar oracle, tests and evidence

All complex arrays are interleaved Float64: `[re0,im0,re1,im1,...]`. Probability arrays are `[P(-sqrt(Es)),P(+sqrt(Es)),...]`, with Float64 precision. `Uint8Array` data/probability-valid masks explicitly exclude the pilot. Its probability row is a neutral .5/.5 placeholder; its decision is the actual known complex pilot.

`receive({shape,support,y,pilotIndex,pilot,Es,N0,priorPowers,mode,maxIterations,damping,tolerance})` performs practical gain estimation and detection. `sparseSpa(...)` is the lower-level core, replacing priorPowers with estimatedGains/gainVariance. Its three modes exclude the supplied-CSI label: only the evaluation layer maps that explicitly to ignored-uncertainty using true gains/support. No truth keys are accepted by either receiver entry point.

`runExperiment(config)` and `experimentSteps(config)` create fresh frame(s). Defaults follow the declared 16×16, P=3, λ=[.6,.3,.1], pilot ratio100, N0=10^(−11/10), damping.5, cap40, tolerance1e−7 model. The initial pilot index defaults to [7,7] for the 16×16 frame, matching the frozen offline experiment; other valid pilot locations remain configurable. This is a new seeded experiment, not replay of NumPy's archived random sequence.

Config fields: shape, physicalSupport, predictedSupport, priorPowers, pilotIndex, pilotPowerRatio, pilotPhase, dataEnergy, N0, normalizations, seed, frames, modes, maxIterations, damping, tolerance. Unknown fields, NaN/Inf, null config values, fractional dimensions/support, invalid pilot, repeats, and oversized jobs are rejected before numerical allocation.

- `source_per_data`: Es=dataEnergy, Ep=ratio×Es
- `equal_total_frame`: Es=L×dataEnergy/(L−1+ratio), Ep=ratio×Es
- Both use the same N0, same independent gain draw, signs and standard noise for a given frame
- Mulberry32 open-interval uniforms plus Box–Muller create fresh independent frames; gain draws use population λ, with no per-realization normalization
- All modes within a frame use the identical raw y. Energy normalizations share primitives, not identical y. The result includes raw x/y/noise, true gains labeled evaluation-only, estimated gains, priors, support, complete probabilities/decisions/history, energy ledger, errors/bits, status and paired frame BER difference
- Caps remain in all denominators. Nonfinite/exception receiver records count every payload bit as wrong, with the failure status retained. Cancelled/superseded outputs are explicitly partial, and only completed receiver records count; they are not final experiments
- No confidence interval is produced from one or two frames

## Supported boundaries

Being inside the scalar envelope is necessary, but no longer sufficient: the per-likelihood numerical-conditioning guard must also pass. These compute caps are taken from or below the accepted reference's main dimensions/path count/cap, not invented performance curves:

- N,M integer 1–16; 2≤NM≤256; 1–3 distinct paths; 1–40 iterations
- 1–2 independent fresh frames; 1–2 energy normalizations; 1–4 modes
- At most 16 receiver records and 640 iterations per request; 30-second Worker wall limit; 10,000 accepted IDs per Worker lifetime
- Input preflight: 2 MiB logical bytes, 20,000 nodes, depth12, at most4096 numeric elements per input array. This is after transport structured cloning, so cannot prevent the first clone allocation
- Independent safety envelopes (not a scientific validity claim): receiver Es/N0/Ep ∈[1e−12,1e12], received components ±1e12, estimated-gain components ±1e24, variance[0,1e36], prior powers[0,1e6], support components integer ±1e6, damping in[Number.EPSILON,1], tolerance[0,1]
- Simulation dataEnergy/pilotPowerRatio[1e−6,1e6], N0[1e−12,1e12], pilotPhase[−π,π], uint32 seed; derived Es/Ep must satisfy receiver bounds

Single-measurement timing and full export sizes are in `reports/benchmark.json`. The maximum request measured below one second in the initial Node environment. These are Node-cloud measurements with scheduling yields, not browser or mobile latency guarantees.

## Worker lifecycle

Use a module Worker: `new Worker(new URL('./worker/receiver-worker.js', import.meta.url), {type:'module'})` and pass it to `SensingOtfsClient`. No build step or dependency package is required for runtime.

Requests are `run {config}`, `receive {input}`, `cancel {targetId}`, `export {resultId}`, `release`. Every request/control has a unique ASCII id. Events are ready, accepted, progress and one terminal complete/cancelled/superseded/error. Invalid requests and duplicate IDs do not cancel a valid existing run. A newer *validated* run supersedes the old one. Cooperative macrotask checkpoints occur at every SPA iteration and stage boundary; Promise-only microtask yielding is not used.

A cancellation preserves finished receiver records and raw frames. `export` works while idle for the last held completed/partial result. It returns the exact finite JSON text and SHA-256. `release` cancels and clears held state. The client suppresses a queued stale/after-cancel completion, retaining its result as partial; restart settles the prior requests and fences old Worker events. Transport failure rejects pending work with the last partial result attached.

For manual browser validation, serve this directory as static files through the authorized browser workflow, open index.html, and test fresh runs, mismatch, pairing, cancellation after a mode, export, repeated clicks, invalid input and Worker restart. Do not mark this browser gate passed solely from Node tests.

## Validation and reproducibility

Requirements for tests: Node24 (ES modules/worker_threads) and Python3 with NumPy. Runtime has no NPM dependencies. `sh run_all.sh` runs kernel, 113 complete reference fixture checks, independent scalar checks, fresh nonfixture runtime verification, actual Worker lifecycle tests, a freshly seeded actual Worker export, independent Python regeneration/full-output replay, and boundary profiling. It updates reports; **copy the frozen package before running** to preserve the release evidence hashes.

The 113 fixtures cover small rectangular and maximum grids, complex pilot, non-unit Es, zero/weak gains, P=1, signed support, mismatch, modes, caps1/2/5/40 and the converged tiny counterexample. Continuous fields use `3e−12+2e−11×abs(expected)` tolerances for different libm and reduction orders; measured errors are around1e−14 or less. Every status, mask and non-tie categorical field must match exactly.

**Retained floating-point boundary:** two tiny ignored-uncertainty cases have probabilities within a few ulps of0.5. The unmodified argmax can flip across Python/JavaScript; four categorical differences (decision and history) are retained. Tests allow a decision discrepancy only if **both** probability vectors are within3e−12 of the half tie; full per-iteration reruns must prove every decision-change difference is solely tie-dependent. No snapping, threshold change, hidden tolerance on arbitrary counts, or discarded record is used. Raw traces and discrepancies: `reports/oracle-tie-diagnostic.json`.

The fresh actual Worker export is separately rebuilt in Python, including the exact documented PRNG stream, raw symbols/noise/gains/y, pilot estimate, uncertainty inputs, energy budget, denominators and all receiver probabilities/status/history. Dynamic seeds/parameters are not fixture lookup. Kernel parity and independently derived mathematical validation are reported as separate layers.

`MANIFEST.json` and `RUNTIME-MANIFEST.json` freeze artifact and runtime hashes; `tests/verify_manifest.py` verifies them without rewriting the frozen release. `DEVELOPMENT-FIXES.json` retains meaningful construction fixes and the interim failed run. Further edits require a new freeze and rerun of affected tests.
