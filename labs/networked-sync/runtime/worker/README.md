# Networked reciprocal ISAC Worker and record contract

This is a standalone computational runtime, not a website or an attached browser
integration. It runs the new `NetworkedSync` receiver in a classic browser Worker
or in Node `worker_threads`. There are no fetches, fixture lookups, UI changes,
repository changes, or source-paper assets in this runtime.

## Provenance and verification boundary

`client.js` and scheduling/fencing portions of `receiver-worker.js` adapt the
first-party `80211ad-browser-prototype/worker/` lifecycle implementation. No
802.11ad numerical receiver model is reused. `js/sha256.js` adapts that sibling's
portable SHA-256 implementation (itself derived from the first-party OFDM-ICI
helper), adding finalized-state and input-type checks. `protocol.js` and
`js/codec.js` are new for reciprocal tensor observations and this record format.
The source-derived receiver is implemented separately in `js/receiver.js`.

`tests/test-worker.cjs` tests actual Node Workers with both the real numerical core
and a clearly marked deterministic slow fixture for lifecycle race cases. It also
contains separate VM tests for classic-browser script-loading/global branches.
A VM is not a browser. Neither the Node measurements nor the VM tests establish
browser/device latency, a live-browser integration, or a real-time guarantee.

## Load and call

Node: create a `Worker` from `worker/receiver-worker.js`, then immediately pass it
to the constructor exported by `worker/client.js`. Browser: create a classic
`Worker` from that same entry URL and pass it to global
`NetworkedSyncWorkerClient`. This is not an ES module Worker. The browser entry
uses relative `importScripts` for SHA-256, codec, protocol, linalg and receiver;
serve those files in the same relative layout, from a permitted origin. No
third-party dependencies are loaded at runtime.

`await client.ready` resolves to a ready event with `ok` and load-error details.
Every operation returns `{id, result, cancel}`; `result` is a Promise of its
terminal event. Operational errors reject with `code`, `message`, and `id`.
Cancellation and supersession resolve with `type: "cancelled"` or `"superseded"`.

- `client.run(request, options)` calls the real receiver. Request is
  `{operation:"generate", config}` or `{operation:"held", config, observation}`.
  A completed receiver invocation has `freshExecution:true`, whether or not the
  numerical methods succeeded. Method success is separately reported by the core.
- `client.process(observationId, configOverrides, options)` recomputes from held
  raw samples with merged validated config. Physical and generation metadata are
  immutable when present. Changing iterations/rank/trace is a new computation;
  changing the scene, noise, clock or seed requires explicit generation.
- `client.importRecord(recordOrJSONString, options)` verifies raw/config identity
  and receiver-input validity before acceptance, then holds the observation.
  Import never counts as fresh numerical execution. Imported history is returned
  under `historical`, labeled `historical-import-not-fresh-execution`.
- `client.exportRecord(observationId, "raw"|"history", options)` returns a codec
  envelope. Export requires an idle Worker. History requires a held result.
- `client.cancel(id)` requests cancellation of the matching pending computation.
  Omitting `id` targets the current request. `action.cancel()` is equivalent.
- `client.release(options)` cancels the selected work and clears held state.
- `await client.dispose()` settles pending work as cancelled, removes listeners,
  and terminates its transport. It also invalidates any pending asynchronous
  restart factory, even if the client was already disposed.
- `await client.restart(newWorker)` attaches a distinct replacement; alternatively
  supply `createWorker` in constructor options and call `restart()`. Overlapping
  restarts are fenced by a lifecycle epoch: only the latest can attach, and an
  unused Worker returned by an obsolete factory is terminated.

Operation `options` accepts only `id` and `onProgress`. Constructor options accept
only `onEvent` and `createWorker`. IDs must be 1–128 safe ASCII characters,
starting with a letter/digit. Use a fresh ID for each request, including controls;
restart after 10,000 accepted Worker requests / submitted client requests.

The successful `run`/`process` terminal event wraps
`{observationId, identity, origin, freshExecution:true, result}`. `result` is the
actual core output, including raw observation, methods and timing. The held
observation ID changes on a successful direct run/import and stays the same on
`process`. A process can change its config identity but preserves sample identity.

## Lifecycle guarantees and limits

Validation occurs before accepted work can supersede current work. This includes
both imported SHA-256 checks, not just JSON syntax. Rejected requests do not cancel
a valid accepted computation or alter its held raw state. Valid newer accepted
computations supersede older work. At most one numerical kernel executes at a
time, even during bursts. Accepted requests receive exactly one non-rejection
terminal event. A duplicate-ID rejection is separate from the original request's
terminal event.

Previously held state is retained until a replacement completes. A replacement cancelled by the Worker before commit, or one that fails,
therefore leaves the prior observation available under its prior ID. `release` explicitly clears it. Output/held-state commits occur only
after final cancellation and selection fences.

Checkpoint waits use a macrotask timer so real Worker message events can deliver
cancel/supersede commands. A synchronous numerical block cannot be interrupted
mid-instruction. The 120-second wall budget is checked at checkpoints, not an OS
hard preemption deadline. Import parsing/preflight/hash verification must finish
before acceptance; this bounded validation can also occupy the Worker briefly.

Progress reports actual named stages and finite provided `done/total`,
`link/iteration/axis`, method and success fields. It does not fabricate a percentage
or claim convergence. Observer exceptions cannot break lifecycle. Terminal
receiver success is distinct from successful transport completion.

The client fences old transport generations and accepted supersession. If an
older completion is queued while a newer request awaits validation, it is held
until the new request is accepted or rejected. An invalid newer request restores
the valid older completion; an accepted newer request suppresses it. Explicit
cancellation also suppresses an already queued completion. If the Worker already
committed that completion before receiving cancellation, the client suppresses
its presentation but cannot undo that held-state commit; use `release` to clear
held state when needed. Late unknown/settled
IDs are ignored. Transport death rejects pending work and requires a new Worker.

These boundaries protect work after receipt. A browser/Node structured clone
happens before the Worker can validate the message, so the runtime does not claim
to prevent memory allocated by that first transport clone.

## Raw observation and deterministic identity

See `FORMAT.md` in this directory for the exact codec and limits. Hash equality
identifies config and raw/pilot data, not author trust, a source-paper match, or
numerical correctness. Historical estimates are preserved for inspection only;
import does not authenticate or execute them. Only `run`/`process` recomputes the
receiver from observation tensors.

## Tests

From the artifact root:

    node --test tests/test-codec.cjs tests/test-worker.cjs

Retained logs are in `reports/codec-tests.log` and `reports/worker-tests.log`.
`reports/worker-codec-verification.json` states exactly which environments and
cases were exercised. End-to-end numerical/source agreement remains the
responsibility of the separate receiver/oracle tests and is not implied by these
transport/serialization checks.
