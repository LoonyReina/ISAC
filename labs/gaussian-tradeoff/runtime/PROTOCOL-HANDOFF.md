# Gaussian ISAC Worker and exact run-record handoff

## Outcome and reproduction

The owned Worker/runtime/codec files and their protocol tests pass **37/37 tests** in Node 24.19.0:

```sh
node --experimental-vm-modules --test tests/codec.test.mjs tests/protocol.test.mjs
```

Full log: `reports/protocol-tests.log`. Exact owned source hashes: `reports/protocol-source-sha256.txt`.

Coverage includes actual Node `worker_threads` with both a clearly labeled fixture kernel and the actual numerical kernel. Browser coverage includes the actual `self.onmessage` branch, browser-style client listeners, and a module VM loading the full unchanged numerical kernel and `vendor/linalg.js` without `process` or `module`; a fresh teaching result matches a fresh Node replay's exact canonical result hash. **These VM tests are not an actual browser run or a browser performance claim.** No UI, remote, repository integration, deployment, browser/device loading, CSP, or RF measurement was performed.

## Integration API

All implementation files are root-relative ES modules:

- `worker.mjs`: actual entry point, distinct browser and Node Worker branches; imports only production modules
- `runtime.mjs`: `createRuntime(send,{run,validateInput})`, `GaussianWorkerClient`, `createWorkerClient`, `protocol`, `runtimeLimits`
- `codec.mjs`: `snapshot`, `preflight`, `keys`, `isRecord`, `utf8Length`, `canonicalStringify`, `parseCanonical`, `hashCanonical`, `encodeRecord`, `decodeRecord`, `limits`, `schema`, `encoding`, `historicalLabel`

A typical consumer:

```js
import {createWorkerClient} from './runtime.mjs';
import {makePreset} from './presets.mjs';
import {canonicalStringify,encodeRecord,decodeRecord} from './codec.mjs';
const client=await createWorkerClient({onEvent:event=>{/* immutable event */}});
await client.ready;
const job=client.run(makePreset(),{id:'unique-run-1',onProgress:p=>{/* stage, done, total */}});
// job.cancel();                 // cooperative cancellation
const event=await job.result;
if(event.type==='complete'){
  const {input,result,inputHash,runRecord}=event.result;
  const historyText=canonicalStringify(runRecord);
  const rawText=canonicalStringify(await encodeRecord({input},'raw'));
  const imported=await decodeRecord(historyText);
  // imported is historical data, never proof of a new computation.
  // client.run(imported.input) performs a new semantically validated computation.
}
await client.dispose();
```

`client.run(input,{id?,onProgress?})` returns `{id,result,cancel}`. The promise resolves `complete`, `cancelled`, or `superseded`; protocol, numerical, and transport errors reject with `.code` and `.id`. Result objects are recursively frozen and detached from caller-owned data. `client.cancel(id?)` returns whether a pending run was targeted. `client.ready` resolves a `ready` record, including failure readiness. `client.restart(newWorker)` or `client.restart()` with a configured factory installs a fresh generation. `client.dispose(reason?)` cancels pending client promises and terminates its owned transport. Use a new id for every client submission.

`createWorkerClient` chooses a browser module Worker if global `Worker` exists, otherwise Node `worker_threads`. For explicit control, construct `new GaussianWorkerClient(existingWorker,{onEvent?,createWorker?})`.

## Wire protocol

Input:

```js
{type:'run',id:'safe-ascii-id',input:{/* numerical input */}}
{type:'cancel',id:'fresh-control-id',targetId:'run-id'}
```

Output:

- `ready`: `ok`, `protocol`, request/wall limits
- `accepted`: run candidate has passed structural and numerical validation
- `progress`: `{stage,done?,total?,iteration?,block?,kappaIndex?}`
- `complete` for a run: `{result:{input,result,inputHash,runRecord,freshExecution:true},elapsedMs}`
- `complete` for cancellation control: `{result:{targetId,cancelled}}`
- `cancelled` or `superseded`: one run terminal, with reason
- `error`: `{rejected:true|false,error:{code,message,diagnostics?}}`

Numerical error diagnostics are retained when supplied as a plain own data payload and passing strict immutable snapshot validation. They are also exposed as a read-only `.diagnostics` property on rejected managed-client Errors. Diagnostics have a smaller independent budget (64 KiB conservative bytes, 2,048 nodes, depth 12, 64 object keys, 512 array items); malformed, nonfinite, cyclic, accessor, inherited, or over-budget diagnostics are omitted without changing the primary code/message or stranding the request.

Unknown fields, unsafe ids, reused accepted ids, invalid input, and exhausted budgets are rejected. Malformed input retains its safe own data id when available. A duplicate raw rejection cannot settle an already accepted managed-client request with the same id.

The runtime fully validates a candidate synchronously before superseding current work. A valid newer run cancels current or queued work; invalid candidates leave it intact. Every awaited checkpoint yields a real timer macrotask, then checks cancellation/selection/wall budget. A managed client holds an older queued completion while a newer candidate is unvalidated: rejection restores it, acceptance suppresses it. Input changes only become accepted supersession after validation. Cancellation suppresses even an already queued completion. Transport errors/death reject outstanding promises; lifecycle epochs discard late restart factories and stale-generation callbacks.

The default 120-second wall bound is **cooperative**, observed at checkpoints, not hard preemption. Default session budget is 10,000 accepted Worker operations; the managed client separately caps 10,000 submissions. Restart resets both with a fresh transport. Pure codec operations are not Worker commands; exported raw inputs can be replayed with a new `run`.

## Exact codec and trust boundary

The canonical format is tagged JSON (`tagged-json-f64be-v1`):

- null: `["null"]`
- Boolean: `["bool",true]`
- string: `["string","value"]`
- number: `["number","8000000000000000"]` for negative zero
- array: `["array",[taggedElement,...]]`
- object: `["object",[["key",taggedValue],...]]`, keys sorted by JavaScript UTF-16 order

Every finite number uses exactly 16 lowercase hexadecimal digits for its big-endian IEEE-754 binary64 representation. Canonical text uses the exact `JSON.stringify` string spelling, no whitespace, no alternative escapes, and sorted unique keys. Both numeric values and signed zero survive text roundtrips exactly. **Ordinary `JSON.stringify(record)` is not the record text format.** Use `canonicalStringify` and `parseCanonical`/`decodeRecord`.

`hashCanonical` is SHA-256 of canonical UTF-8 bytes via platform WebCrypto, independently checked against Node crypto in tests. Hashes establish content identity/integrity, not authenticity, trustworthiness, numerical validity, or proof of execution. `decodeRecord` verifies schema, fields, flags, and hashes; semantic numerical validation happens when replaying with the kernel. All input/object-import/export snapshots are owned and frozen before the first asynchronous hash operation.

Raw records contain schema/encoding/mode/input/inputHash and no result. History additionally contains `{label:'historical-import-not-fresh-execution',freshExecution:false,result,resultHash}`. A newly returned completion is marked fresh outside that export record; imported history always remains explicitly historical.

The strict codec rejects sparse arrays, nonfinite values, undefined/bigint/functions/symbol values, typed arrays, custom prototypes/array subclasses, attached array properties, accessors, symbols, nonenumerable data properties, cycles, dangerous keys (`__proto__`, `prototype`, `constructor`), malformed UTF-16, malformed tags, duplicate or unsorted encoded keys, and budget overages. Plain and null-prototype object data are copied to plain frozen objects; repeated acyclic references become independent value copies.

Budgets: 64 MiB conservative canonical bytes, 2,000,000 nodes, depth 48, array length 1,000,000, object keys 128, individual string 65,536 UTF-8 bytes, key 128 UTF-8 bytes. Final events are bounded too; an oversized success envelope becomes a terminal resource error rather than stranding a promise. These limits do not bound the platform's initial structured clone or JSON parser allocation. The managed client preflights before `postMessage`. JavaScript cannot generically detect hostile proxies; direct APIs are not a sandbox against proxy traps or tampered platform globals. Raw Worker structured clones are mutable on arrival; use the managed client or `snapshot` to retain the immutable consumer contract.

## Attribution and regression findings

Descriptor-first preflight and UTF-8 checks adapt first-party `networked-sync-browser-prototype/js/codec.js`; lifecycle patterns adapt that prototype's `worker/client.js` and `worker/receiver-worker.js`. Those sources were independently reviewed in sibling `networked-sync-port-review/worker-review/WORKER-REVIEW.md`. This ES-module adaptation and its exact numeric tagged scheme are new and tested separately; the previous review is not a certification of these new bytes.

Author-side regressions addressed while implementing: terminal flags must be committed after event resource validation; structurally invalid candidates must retain safe request ids; browser and Node listener branches need separate coverage; deferred completion restoration and late restart factories require explicit race tests. The final log reflects the current owned bytes.
