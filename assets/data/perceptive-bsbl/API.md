# Bounded prototype API (v1)

All imports are native ECMAScript modules. Numerical arrays are row-major interleaved complex Float64: `{rows, cols, data: Float64Array([real,imag,...])}`. Immutable records contain ordinary deeply frozen arrays with that same ordering. No npm dependencies or bundler are required. This is a numerical/lifecycle prototype, not a website.

## Main interface

`createBrowserClient()` in `src/client.mjs` requires native module Workers and Web Crypto in a secure browser origin. It constructs `new Worker(new URL('./worker.mjs', import.meta.url), {type:'module'})`. No browser was launched for this release. `await createNodeClient()` uses actual Node `worker_threads` module Workers and is covered by lifecycle tests.

`await client.run(request, onProgress)` returns `{runId,status,record,partial,lastEvidenceAvailable,reason?,error?}`. Every run has a UUID-session/monotone-sequence ID. A new run hard-terminates its predecessor. Rapid overlapping start calls cannot revive an older launch. Old-worker and wrong-ID messages are ignored. Progress records and final records are immutable. `client.cancel()` requests cooperative cancellation; `client.cancel({hard:true})` terminates the Worker and seals the most recently received evidence with `hard_cancelled`. It never invents an estimate that was not received. `await client.dispose()` closes pending work. There is no main-thread numerical fallback.

The `request` has exactly four optional keys:

- `acquisition`: `{config?, paths?, symbolSeed?, noiseSeed?, snrDb?, noiseVariance?}`
- `methods`: unique subset, in requested execution order, of `mmv_fm_projected`, `single_log_fm_projected`, `row_sbl_fm`, `block_omp`, `privileged_delay_support_ls`; default all five
- `solverOptions`: map from method to its options. FM accepts `maxActions`, `tolerance`, `rankRtol`; OMP accepts `maxBlocks`, `residualFactor`; LS accepts none
- `budget`: `{maxWorkUnits?, maxMilliseconds?}`, a shared whole-package budget, not a per-method reset

Acquisition defaults: N=64, K=2, MT=2, M=4, Np=32, g=2, bandwidth=20e6 Hz, c=299792458 m/s; three explicitly recorded paths at q={4,11,23}. Config accepts N integer 8..64, K 1..2, MT exactly2, M 2..4, Np 2..32, g1..4, Np<=g*N/2, bandwidth1e5..1e9. Changing dimensions may require compatible paths; invalid combinations fail rather than being silently clipped. Symbols/noise seeds are uint32. SNR is -20..40 dB and known noise variance is 1e-10..1e4. Empty scenes need explicit positive noiseVariance.

A path is `{q,user,aoa,aod,gain:[real,imag]}`. There are at most six paths; q is continuous in [0,Np-1]; user is zero-based; angles are degrees in [-89,89]; each complex gain component is in [-10,10]. Fractional delays are forward-generated exactly. No on-grid coefficient truth is fabricated for them. Nearest-grid privileged LS uses JavaScript Math.round (positive half ties upward), explicitly labelled mismatch. Practical solvers receive no paths or true count.

FM defaults: primary/diagnostic max120 accepted updates, row-SBL max300; these are also upper bounds. OMP max12 blocks. Defaults tolerance1e-7, rankRtol1e-11, residualFactor1.15. Global hard bounds are 750m charged work units, 20s cooperative deadline, plus a main-client hard Worker termination at budget+1s. Smaller budgets are accepted. Full package methods share the same budget and actual W/Y/noise variance. A bounded final posterior reserve is separately recorded (at most about3.3m units for all default FM methods). Matrix dimensions and loop iteration counts additionally bound work even when a wall-clock check is delayed. Progress/serialization/evaluation are dimension-bounded and included in observed wall time, but not represented as numerical work-unit FLOP counts. Work units are an algorithmic meter, not hardware FLOPs.

## Actual trace and posterior access

FM result: `X`, `gamma`, `history`, initial/final declared and proper-MMV objectives, `actions`, `stop`, `warnings`, seconds, effective caps/tolerances, block_size, terminal_error, final posterior_covariance_blocks and covariance status. Covariance entries are each block's posterior row covariance, not a full cross-block covariance and not physical path-angle uncertainty.

Each accepted action contains `iteration`, `kind` (add/delete/reestimate), `block`, `old_gamma`, `new_gamma`, `predicted_delta`, `dense_delta`, `objective`, `mmv_objective`. Start gamma at zero and apply these changes to replay exact gamma history. No per-candidate trajectory or per-step posterior covariance was saved. Progress snapshots contain the current posterior mean. The final record contains the complete accepted trace regardless of progress throttling. Never animate missing quantities as though measured.

A valid terminal method stop can be `no_improving_projected_candidate`, `no_valid_candidate`, `max_actions`, `max_blocks`, `noise_discrepancy`, `no_positive_remaining_block`, `residual_stagnation`, `rank_limit`, privileged-support labels, `numerical_failure`, `dense_candidate_rejected`, `cancelled`, `work_budget`, or `wall_budget`. No-improving-proposal is not stationarity. Caps do not imply convergence. Aggregate `complete` means all requested methods returned without explicit cap/failure; `capped` preserves update/block caps; budget/cancellation outcomes list notRunMethods. Numerical failure can coexist with completed other methods. Hard termination retains the last received partial snapshot or explicitly reports no evidence.

## Full record / import / check

`encodeRecord(record)` and `decodeRecord(text)` in `src/record.mjs` perform full immutable JSON round trips, closed envelope validation, shape/finite/model/hash/history checks, 8MB byte cap, and SHA-256 integrity. Unknown schemas, inconsistent gamma transitions, invalid shapes, nonfinite data, model mismatch and tampered hashes are rejected. Hashes prove byte/data integrity, not authorship or mathematical truth. An intentionally rehashed false estimate can pass the codec and must fail a numerical checker.

The payload keeps request, effective config, seeds/RNG identity, tones, symbols, raw Y, W, unit noise and scaled noise, known variance, budgets, objective histories, complete X/gamma/final posterior blocks, every extracted estimate, method failures and full evaluator metrics. Evaluator paths/clean Y/exact Xtruth are a separate subtree. Code hashes bind every executable source module except generated build-info (bound by the file manifest). Model and raw acquisition have distinct hashes. Current versus historically executed Python core/runner hashes remain separate.

`await checkRecord(recordOrText,{budget?,isCancelled?})` in `src/check-record.mjs` recomputes generated raw observations, accepted dense objectives, posterior and extraction/evaluation, and same-Y baseline outputs. It is bounded and cancellable; a budget Halt throws explicitly rather than claiming a pass. It returns checks, failed labels, accepted action count, diagnostic proper-MMV increases and whether imported executed-code hashes match current code. It never overwrites imported execution provenance or runs imported code. This is a port-side replay checker. The original, separately authored Python dense oracle in `oracle/` independently checks new JS outputs via `tests/compare_oracle.py`. Neither checker proves global optimality.

## UI semantics and boundaries

Always distinguish live fresh execution, imported-record replay, and the frozen offline480-trial sweep. This bundle does not contain that sweep and never substitutes it for live outputs. Known-symbol QPSK uses a named xorshift32/Box-Muller generator; matching numerical seed values do not equal NumPy's PCG64 draws. Raw arrays make comparison independent of RNG choice.

Keep the exact algorithm interpretation, single-log normalization warning, known-support privilege, transferred heuristic thresholds, OMP weak-path threshold caveat, miss/spurious denominators, unambiguous-only angle/association metrics, same-delay/same-user unsupported multiplicity, off-grid splits, and total-path-length c*tau (not monostatic range c*tau/2). Final rank residual is not proof that only one physical path exists. Array covariances are regularizer-model outputs, not physical uncertainty guarantees.

## v2 stricter verification contract

The full schema is implemented in `src/schema.mjs`, including unused live method options. Unknown nested fields are rejected. Scientific result fields cannot be omitted to bypass numerical checking. Terminal package status must agree with requested/result/completed/notRun methods and method caps/failures. Running snapshots have an explicitly narrower schema; they never masquerade as full results.

`checkRecord` now returns status `passed`, `failed`, or `incomplete`, separately retaining `executionStatus`. An interrupted original run can have mathematically valid available evidence but unavailable quantities; its report is `incomplete` with an `unavailable` list. Cancellation, deadline or work exhaustion of the checker itself throws Halt in every branch, including zero-action OMP and empty/unexecuted LS. A caller must never convert an exception or incomplete report into a pass or reuse another run's verification badge.

Replay covers full raw acquisition/request consistency and separate truth; diagnostics; every FM action's projected proposal/best candidate, initial/final/accepted objectives and delta/kind/descent; posterior/covariance; full extraction/evaluation; baseline histories and applicable terminal stops. Timing and source authorship remain reported metadata, not authenticated historical facts. Old valid v1 records retain their original hashes and executed provenance; they are not rewritten as v2 executions.

Invalid live requests now fail before any acquisition exists. The new job's receipt may honestly have no record. The previous job's immutable evidence remains separate. A synchronous launch postMessage throw cleans up Worker/timer/active state before rejecting; a terminal packet carrying running status is a protocol failure. Received final/partial packets are decoded before a following clean/error exit is finalized.
