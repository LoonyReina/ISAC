# Independent protocol, codec, and lifecycle audit

## Verdict

**Pass for the archive-derived final pinned code in this review's stated scope.** Two concrete defects in snapshot-01 were reproduced and reported immediately. Both are independently verified fixed in the final pin. This is a protocol/codec/lifecycle audit, not a numerical-validity or browser/UI certification.

- Broad independent adversarial suite: **16/16 pass** on final pin
- Preserved defect regressions: original **0/3 pass**, final **3/3 pass**
- Simulated ordered-duplex transport scheduling stress: **25/25 schedules pass; 1,222 run promises settle exactly once**, with no stranded pending/current state
- Additional factory and resource-cap probes pass
- Error-diagnostics and direct-kernel strict-preflight suite: **5/5 pass**
- Actual production `worker.mjs` ran in real Node `worker_threads`
- Browser module branch ran only in Node `vm.SourceTextModule`, without a `process` global and with dynamic imports forbidden. **No actual browser execution occurred**

## Pinned evidence

Original immutable copy: `pinned/`; original manifest: `SNAPSHOT-SHA256.txt`.
Final archive-derived immutable copy: `archive-pin/`; final manifests: `ARCHIVE-PIN-SHA256.txt` and `ARCHIVE-SNAPSHOT-SHA256.txt`.
Earlier fixed copy `final-pin/` and preliminary diagnostics copy `diagnostic-pin/` are retained unchanged as intermediate evidence.
Original supplied snapshot: `/workspace/shared/isac-paper-execution/gaussian-tradeoff-port-review/snapshot-01`.
Final reviewed source: `/workspace/shared/isac-paper-execution/gaussian-tradeoff-port-review/final-snapshot`, extracted from the owner archive and supplied by the lead reviewer. All seven copied runtime/source files were hashed and match that exact snapshot.

- Archive SHA256, supplied by the lead reviewer: `b5ec92cbb3745e418b08d3a13888bb528235a265a4e6cba5f697b74f5524e5bd`
- `SOURCE-FREEZE.json` SHA256, independently recomputed here: `ea5c2ad520d33962b4d33e9f6e9f89e9ddaa3e1ee41e4d249250c54da91cb113`

Archive packaging/member verification belongs to the lead reviewer; this report certifies the protocol replay on the exact extracted source hashes below.

Final critical source hashes:

- codec.mjs: `cd210349a1755aba09af3c8bcf0ebb046a935ca8acd3f1839a56b8a9c4f033aa`
- runtime.mjs: `94352d73c3921f7a83b6313ccdf31d2f0aa3e311c5de342f9cf18f002e1b6758`
- worker.mjs: `acd716f63099a6e3e773c29e51b23d5ff8f8babbfb442830bdcf55559bb9727c`
- kernel.mjs: `0f2dc07dc891593cfe2190d09d395a6be4b7343a43c52f45dd6b1b9a6d176310`
- math.mjs: `930bedc07777ea6c078bc742dbc4b64938cf963b8f44c35902f80967f47fd79d`
- presets.mjs: `9a9633235b4a86aa8c084c915394d9ef004c1ca5062a8507c44ff016e22851ae`

## Defects found and resolution

### 1. Production progress counts were discarded — fixed

Original `runtime.mjs:30–37` recognizes `stage/phase` and forwards `done`, but the numerical kernel emits `{phase, completed, total}`. In a real 128-block Node Worker run every progress event omitted a completed count, for example `{stage:'waveforms',total:128}`. This prevents a consumer from computing real progress and also bypasses the terminal-count throttle exception.

Original runtime SHA256: `9196c672994c138f8438ad7703fc868aaa80e35deae623fe7ebe82c677df1c3f`.
Original reproduction: `audit.log`, `results.json`, `known-regressions.log`.
Final runtime maps a finite `completed` into `done`. The same actual-worker regression now passes, with progress such as `{stage:'waveforms',total:128,done:8}`. See `audit-archive.log` and `known-regressions-archive.log`.

### 2. Factory preflight occurred after allocation and accessor invocation — fixed

Original `createWorkerClient` (`runtime.mjs:196–202`) allocated a transport before validating options and spread options before descriptor checks. Two effects were independently reproduced:

1. Unknown options produced `INVALID_OPTIONS` but leaked the newly created, unreachable Worker
2. An enumerable `onEvent` getter executed once and was accepted, bypassing the constructor's accessor rejection

The independent constructor probe recorded two allocations, only one termination, and one getter invocation. See `init-adversarial.mjs/.log`; both assertions are preserved as red tests in `known-regressions.mjs/.log`.

Final code preflights own descriptors and option types before allocation, owns the option references before the async factory boundary, and terminates a newly allocated transport if managed-client construction fails. All original regressions pass. Further independent probes mutate caller options while factory resolution is paused, supply a transport lacking listener removal, and use inherited option getters. Option ownership, cleanup, and non-invocation all pass; see `factory-archive-extra.mjs/.log`.

## Verified contract coverage

### Codec and history

- Explicitly gated WebCrypto digest completion at both input and history-result hashes; mutations between gates cannot alter encoded or decoded records
- Hashes match independently computed SHA-256 over canonical bytes
- Binary64 signed zero, smallest subnormal, finite extremes, and adjacent finite values survive exact canonical round trips
- Canonical Unicode distinguishes composed/decomposed strings; paired supplementary characters survive, malformed surrogate sequences fail
- Sparse/attached/non-enumerable array properties, getters, symbol properties, and `toJSON` accessors are rejected without invocation
- Nonfinite binary64 wire encodings, duplicate keys, malformed tag values, and noncanonical spellings fail
- Raw export carries no historical result; history requires explicit non-fresh labels and verifies input/result hashes; changing -0 to +0 invalidates the hash
- Deeply frozen, alias-free owned records remain stable after async boundaries
- Exact string/key/depth/object-key boundaries, oversized arrays, expanded alias-count node cap, conservative byte budget, and 64 MiB text preflight were exercised

### Runtime and client

- Semantic rejection, structural/accessor rejection, and reused IDs preserve an accepted active run
- Accepted-only supersession skips obsolete queued computations and emits one terminal outcome per old run
- Cancelling an unrelated target preserves the selected job; cancelling the selected job yields cancellation, and a subsequent run completes
- Held older completions are restored after one or several newer rejected candidates
- Cancelling held completions suppresses their results; delayed factory restart cannot resurrect a disposed client and terminates orphan replacements
- Real Node Worker death rejects pending work; replacement restart becomes ready and completes a real numerical run
- Cooperative wall cap produces one `TIME_LIMIT`; runtime accepted-request cap and client 10,000-submission cap are enforced without replacing the active/current request on rejection
- 25 seeded ordered request/event schedules use an in-process EventEmitter transport and the real runtime/client with a tiny independent injected kernel. They exercise valid runs, invalid runs, cancellations, and queued completions; all 1,222 run promises settle once. These schedules are simulated transport tests, not actual Worker runs
- Final actual-worker progress carries numeric completion counts

### Final diagnostic serialization and kernel preflight

The archive adds bounded own-data error diagnostics and makes direct kernel validation invoke the strict codec snapshot. `diagnostic-audit.mjs archive-pin` adds five independent cases, all passing:

- Twenty malformed or resource-heavy metadata variants are dropped while primary error code/message/request identity remain deliverable, with zero accessor invocation. Cases include inherited and own diagnostics getters, nested accessors, cycles, sparse/typed arrays, symbols, dangerous keys, nonfinite values, malformed Unicode, and byte/node/depth/key/array caps
- Accepted execution errors preserve an immutable, alias-free finite diagnostic object, including signed zero, subnormal/maximum finite values, and valid Unicode; a later run succeeds
- Managed-client rejection exposes immutable copied `Error.diagnostics`, unaffected by subsequent source mutation
- An actual production Node Worker posterior request triggers the inverse-condition cap, retains finite eigenvalue/condition diagnostics through client rejection, and successfully executes the next valid request
- Direct kernel validation now rejects accessors, array subclasses, attached non-enumerable array properties, and non-enumerable required fields without invoking getters

The added diagnostics are optional. Invalid metadata does not block the primary failure or strand the lifecycle. These checks do not expand the codec into a hostile-proxy sandbox.

### Actual versus simulated execution

Actual production Node Worker tests cover readiness, an invalid candidate while a real numerical job remains active, accepted supersession, cancellation and a successful next run, production progress counts, real run-record decoding, and numerical-degeneracy diagnostics followed by successful recovery. Transport death uses an actual short-lived Node Worker that exits with code 17; restart replaces it with the production Worker and completes a numerical run.

Held-completion restoration, multi-rejection chains, deferred cancellation, asynchronous factory/disposal races, constructor probes, and the 25 seeded duplex schedules use controlled in-process transport probes. Runtime cap/supersession tests use the production runtime with an independent minimal injected kernel. The browser-module test uses Node VM only. Actual browser execution is unrun.

## Reproduction

From this report's directory, Node v24.19.0:

```sh
node --experimental-vm-modules audit-archive.mjs
node --test known-regressions-archive.mjs
node queue-fuzz-archive.mjs
node factory-archive-extra.mjs
node resource-cap-archive.mjs
node diagnostic-audit.mjs archive-pin
```

Original regressions remain intentionally failing:

```sh
node --test known-regressions.mjs
```

All test artifacts are independent reviewer-authored scripts under this directory. No owner implementation was edited, and no existing owner fixtures were reused.

## Limits

No browser, UI, remote computer, or browser automation was used. VM branch success does not establish browser compatibility, browser scheduling, or cross-browser behavior. Numerical outputs were used only to exercise real protocol traffic; this review does not certify the mathematics. The runtime wall limit is cooperative at checkpoints, not hard preemption. Initial platform structured-clone allocation occurs outside the codec's own traversal limits. In-process hostile proxies are not a sandbox boundary, as the codec explicitly documents. This is substantial adversarial coverage, not an exhaustive proof over every possible interleaving or transport implementation.
