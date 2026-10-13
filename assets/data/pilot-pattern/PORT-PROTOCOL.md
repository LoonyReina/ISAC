# Worker and raw record contract

All complex arrays are interleaved [real0,imag0,real1,imag1,...], row-major. Receiver cells have M×K complex shape; traces retained/derotated/short_fft have M×L; maps have Doppler rows ×delay columns. Exported JSON arrays are ordinary finite-number arrays. Runtime uses Float64Array internally. There is no source PDF, external service, or network request in the runtime.

## Requests

Run envelope has exactly: `{kind:'run', id, revision, operation, input, budgetMs}`. id is1..64 alphanumeric/underscore/hyphen characters. revision is a strictly increasing nonnegative safe integer for that Worker. The Worker owns a structured clone, including all nested arrays. Later edits to sender-owned controls cannot change a run.

Operations:

- `generate`: input `{config, processing}`. config fields exactly grid, scene, transmit_seed, payload, pilot_amplitudes (null or flattened M×K positive amplitudes), model, noise_variance, noise_seed. Grid is `{N,Ncp,S,J,delta_f,offsets}`. Scene is `{delays_samples,dopplers_hz,gains}` with interleaved complex gains. Returns complete generated raw-bearing record
- `import-raw`: input `{raw,processing,evaluation_scene}`. raw is `{grid,pilots,y,label}`. evaluation_scene is null or explicit evaluation-only scene. This makes an imported raw-only observation; it does not certify physical origin or invent a generator/noise variance
- `replay`: input is the complete exported record. Returns semantic verification status and its exact scope
- `reprocess`: input `{record,processing,evaluation_scene}`. Validates the input record first and applies new receiver/map settings to its identical raw observation. Changing evaluation truth can alter evaluation metrics only

processing is `{ells,axes}`. axes is null for defaults, or `{delay_samples,doppler_hz}`. At most3 distinct ell values. All branches use the same observation. Grid/model/scene/pilot/seed edits are generator operations, not reprocess controls.

Cancel envelope has exactly `{kind:'cancel',id,revision}`. Only the matching active request is cancelled. A newer accepted run cancels the previous one. Cancel and budget failures return no partial result masquerading as success. All numerical stages yield cooperatively at checkpoints; each inner unit is bounded by declared grid/path caps. Serialization/hash/structured clone are bounded synchronous sections, so the5ms scheduling target is not a hard wall-clock cancellation guarantee.

## Responses

Every accepted run receives started and exactly one terminal. Progress is stage-local `{kind:'progress',id,revision,stage,completed,total,elapsedMs}`; counts restart at each stage and are not an overall fraction. Total progress events are capped100. Terminal statuses are completed, cancelled, budget-exceeded or error. Only completed includes result. Malformed/stale envelopes receive `kind:'rejected'`, not an accepted-run terminal. Request identity/revision are present in every event.

The client fence drops old progress/completions after a newer run, cancellation invalidation, Close or disposal. A plain `cancel()` marks delivery cancelled immediately while retaining the identity until a terminal; a success already queued for that identity is discarded and delivered as cancelled without its result. This does not falsely assert that already-completed computation was interrupted. `invalidate()` clears it immediately for closed/replaced views. Startup/error/message-decoding failures become a client-side terminal error for the active identity.

The direct dispatcher is tested with injected clocks and actual Node worker_threads, while `worker.mjs` is the browser-only adapter. There is no claim that Node scheduling proves browser responsiveness. Worker wall budget is checked at numerical checkpoints and before success. Work can exceed the requested millisecond boundary inside one bounded numerical or serialization section; it will not be returned as completed after expiry.

## Record v1

Required top-level fields: schema, version, source, observation, processing, evaluation_scene, results, limitations, record_sha256. Unknown or missing fields fail replay. `source` carries the existing paper identity, source hash, accepted core/contract/archive hashes.

Observation has kind, grid, pilots, y, identity, input_descriptor, generator. Generated observations contain exact configuration, all generator frequencies, full CP-added x, transmit energy ledger, receive power/SNR ledger, clean signal and actual additive noise. The receive ledger exports mean clean power across all complete sensing blocks, sample count, actual time-noise variance and null-safe linear/dB SNR. Its plane is this live observation, explicitly different from the offline fixed-D paired-noise reference. Noiseless positive-clean and zero-clean cases have explicit status and null dB instead of Infinity/NaN. Imported observations have generator=null and a supplied provenance label. SHA-256 identity binds grid, known pilots and actual y, not scene labels or current UI controls.

Results contain exact-alias diagnostic and each receiver branch's ell, same observation identity, H, full trace, retained-sample/transmit-energy budget, actual per-cell noise variance when known, complex/raw/normalized map, candidates with tie multiplicity/tolerance and optional evaluation-only NMSE/common-gain alignment/assignment metrics. No receiver method accesses scene.

Semantic replay first checks shape/finite bounds/required keys and canonical record hash, then independently regenerates a generated observation from its declared JS configuration and verifies actual frequencies/x/pilots/clean/noise/y and ledger. Imported records cannot make this physical-generation claim. It then reruns the receiver/map/candidate/evaluation path from the exported raw observation and compares every required result field with numerical tolerance. Rehashed corrupt data/results, deleted metrics, stale branch identities and changed source/method metadata fail. Hashes alone are never treated as numerical validity. Counts/indexes are exact; near-tie tolerance and cell-noise variance use relative-only checks; other floating values allow1e−10 relative plus1e−12 absolute.

Canonical SHA-256 binds stored data integrity; regenerated float results are compared numerically, not required to reproduce a hash bit-for-bit across engines. Cross-engine validation still needs empirical browser testing. Imported raw records are replayable without Python or access to the original experiment, and the checker explicitly reports its narrower physical-origin scope.
