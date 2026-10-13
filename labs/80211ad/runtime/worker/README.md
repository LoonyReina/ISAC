# 802.11ad Worker boundary

Standalone classic browser Worker and actual Node `worker_threads` entry point: `receiver-worker.js`. Browser dependencies load through `importScripts('./protocol.js', '../js/sha256.js', '../js/receiver.js')`. No DOM, UI, fetch, network, fixture replay, or target truth enters the receiver. `client.js` is an optional UMD wrapper (`AdWorkerClient` in a browser; CommonJS export in Node).

The scheduling and stale-output pattern was adapted from the first-party sibling `ofdm-ici-browser-prototype/worker/ici-worker.js` and `worker/ici-client.js`. Strict observation lifecycle, protocol validation, dual-hash import/export, processing-policy overrides, and replaceable client transport were written for this port.

## Requests

Every message is a plain object with a fresh `id` and one supported `type`. IDs are 1–128 ASCII letters, digits, underscores, dots, colons, or dashes, beginning with a letter or digit. All accepted request IDs, including controls, remain consumed until the Worker is terminated. A session accepts at most 10,000 requests. Unknown fields, unsupported objects, non-finite values, sparse arrays, shared storage, object cycles/aliases, and invalid dimensions are rejected before numerical work is allocated. The Worker must already receive the transport's structured clone before this preflight can run.

- `generate`: `{id,type:'generate',config,targets,noise?}`. Config uses the kernel's exact snake_case fields. `targets` contains 0–8 generation-only `{range_m,velocity_mps,gain?:{real,imag}}` records; an empty list supports a noise-only control. Noise defaults to true. Validation precedes generation allocation. Completion returns observation metadata and `observationId:id`, never raw samples or target truth.
- `process`: `{id,type:'process',observationId,options?}`. The required observation ID must match the held observation. Options: `nfft` integer from `frames` through 256, default `frames`; `max_wall_ms` integer 10–120000, default 30000; optional `stf_threshold`, `pfa_family`, and `fractional_phase` using the kernel's config bounds. The three policy overrides recompute from the same held sample bytes without changing held metadata or regenerating the scenario. Full fresh numerical result returns under `result`, including acquisition, estimates, channel, map/detection, and provenance.
- `import`: `{id,type:'import',observation,expected_hashes?}`. Observation is the strict raw object described below. Optional expected hashes must contain both `observation_sha256` and `observation_metadata_sha256`, each 64 lowercase hex characters. The Worker verifies them before committing held state. A digest mismatch returns `HASH_MISMATCH` and leaves no held observation. Omitting expected hashes accepts validated caller-provided numerical data without an integrity claim.
- `export`: `{id,type:'export',observationId}`. Explicit, idle-only portability action. Completion returns `{schema:'80211ad-raw-observation-v1',observationId,observation_sha256,observation_metadata_sha256,hash_codec,observation}`. Samples/filter are copied to JSON-safe ordinary arrays; held buffers are not transferred/detached. The raw sample codec is frame-major complex-interleaved finite Float64LE, with signed zero canonicalized to +0. The separate metadata digest binds original config, noise variance, start chip, filter, and provenance. Neither hash authenticates a sender.
- `cancel`: `{id,type:'cancel',targetId}`. Cancels only the current matching job. Completion acknowledges `{targetId,cancelled}`; the job itself separately settles as `cancelled`. A noncurrent ID produces `cancelled:false` without disturbing current work.
- `release`: `{id,type:'release'}`. Clears held state and cancels current work. Acknowledgement returns the released observation ID, or null. Large executing references disappear when the cancelled computation unwinds at a checkpoint.

Raw observations have exactly `config,samples,noise_variance,start_chip,pulse_noise_filter,provenance`. `samples` is an array of `{real,imag}` rows containing ordinary arrays or nonshared Float64Array values. The exact row length is `(3328 + max_delay_chips + 128 + 2*pulse_halfspan_chips)*oversample + 1`. Provenance is strict and declares `truth_in_receiver:false`; target/truth fields are forbidden. The kernel checks normalized finite RRC-filter coefficients and all remaining metadata/numerical bounds.

## State and event contract

Successful generate/import acceptance immediately invalidates the previous held observation. Cancelling or failing that replacement leaves none. Processing cancellation preserves an already-held observation. A new valid compute request supersedes selected work; execution remains serialized while the older job unwinds. Rejected malformed/invalid requests preserve accepted jobs and held data. Export during active work is rejected with `WORKER_BUSY`.

The Worker sends initial `ready`, then `accepted`/`progress` events and exactly one terminal `complete`, `cancelled`, `superseded`, or `error` for every accepted compute request. Events carry `id`; compute events also carry `operation`. Rejected requests send `error` with `rejected:true`, distinct from an accepted job's terminal. Controls complete immediately. Callers should keep errors tied to request ID rather than treating every error as the current computation's outcome.

Kernel checkpoints yield a macrotask, receive cancellation/supersession, and check wall time. Final fences suppress stale results. The client adds independent queued-output filtering: a cancelled job cannot publish a queued completion. When a newer request has not yet been accepted, an older queued completion is held until the newer request is accepted (older result suppressed) or rejected (older valid result restored). Processing progress for an older request is hidden while newer intent is pending.

## Optional client

Attach immediately after creating a Worker so its initial ready event is observed. `client.ready` resolves to the ready event (inspect `ok`). Do not wait for the Worker ready event before constructing this wrapper.

```js
const { Worker } = require('node:worker_threads');
const AdWorkerClient = require('./worker/client.js');
const makeWorker = () => new Worker(require.resolve('./worker/receiver-worker.js'));
const client = new AdWorkerClient(makeWorker(), { createWorker: makeWorker });
await client.ready;
const generated = client.generate({ frames: 2 }, [
  { range_m: 5, velocity_mps: 20, gain: { real: 1, imag: 0 } }
], { noise: true });
const observationId = (await generated.result).result.observationId;
const processing = client.process(observationId, { nfft: 16, pfa_family: 0.001 });
const result = await processing.result;
const exported = (await client.exportObservation(observationId).result).result;
const restored = client.importObservation(exported.observation, {
  expected_hashes: {
    observation_sha256: exported.observation_sha256,
    observation_metadata_sha256: exported.observation_metadata_sha256
  }
});
await restored.result;
await client.dispose();
```

Client actions return `{id,result,cancel}`. The result promise resolves a terminal event; Worker errors reject with `AdWorkerError` containing `code` and `id`. Generation client options are `{id?,onProgress?,noise?}`; import options are `{id?,onProgress?,expected_hashes?}`. Processing has separate numerical and client options: `process(observationId, processingOptions?, {id?,onProgress?})`. Export/release accept ordinary client options. Callback exceptions do not corrupt lifecycle.

`client.cancel(id?)` returns whether a pending compute cancellation was submitted. `client.release()` returns a control job. `await client.dispose()` detaches listeners, settles pending promises, and terminates the Worker. `await client.restart(newWorker)` or `await client.restart()` with a configured factory terminates the old transport, settles pending work, clears consumed IDs, and attaches a fresh Worker. No held observation survives restart. A distinct new Worker is required; explicit replacement listeners attach before awaiting old termination.

## Resource and cancellation limits

Bounds are 2,000,000 complex raw samples, 262,144 map cells, 100 MiB preflight accounting, 4,100,000 structural nodes, depth 12, and 30 seconds of Worker generation/import/export execution; processing can request 10–120000 ms. Kernel dimension bounds and wall deadlines also apply. These bounds are not a measurement or guarantee of total browser heap, transport-clone memory, garbage-collection pauses, or browser responsiveness.

Cancellation is cooperative, not preemptive. Numeric kernels and raw-sample hashing yield checkpoints. Input structured cloning, plain-array preflight/normalization, small metadata hashing, JSON parsing/stringification, snapshot array construction, and outgoing cloning are synchronous bounded work. Cancellation waits until those phases return; terminate the Worker to abandon an unresponsive worker-side operation. A Worker cannot prevent a main-thread `postMessage` clone or JSON parse from blocking the caller.

`BOUNDARY-BENCHMARK.json` records a reproducible actual-Node boundary measurement, tied to source hashes. On its recorded Node host, a 1,974,842-complex-sample zero/no-noise snapshot took about 1.55 s for export+hash+transport. A release queued after a plain-array import took about 0.95 s to acknowledge; the caller's own import postMessage took about 161 ms. Cancellation after the export's last hash progress took about 151 ms, demonstrating its remaining synchronous snapshot phase. These are observations for that host and zero fixture, not browser or general latency claims. Regenerate with `node worker/benchmark-boundary.cjs`.

## Verification

Run `node --test tests/test-worker.cjs`. The suite requires the actual local kernel for its integration tests when invoked as `node tests/test-worker.cjs --require-core`.

Coverage separates actual Node worker_threads from Node VM execution of the browser classic-loader and browser client branches. It includes real-core fresh generation/process, policy-only reruns with unchanged held hashes, JSON snapshot replay, sample and metadata corruption detection, malformed input, truth rejection, cancellation, burst supersession, raw release, invalid-newer-request causality, import failures, transport failures, queued completion fencing, termination and restart. VM smoke coverage is not evidence that a real browser was run. No real-browser performance or UI claim is made.
