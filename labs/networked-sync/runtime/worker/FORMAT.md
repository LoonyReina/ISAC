# Deterministic bounded record format v1

`js/codec.js` exports CommonJS or browser-global `NetworkedSyncCodec`:

- `encodeRecord({config, observation, result?}, mode="raw", hooks?)` (async)
- `decodeRecord(recordOrJSONString, hooks?)` (async)
- `identity(config, observation, hooks?)` (async)
- `canonicalStringify(value)`, `preflight(value)`, `validateObservation(value)`
- `schema`, `historicalLabel`, and immutable `limits`

Hooks optionally expose async `checkpoint(stage, {done,total})`. Hashing visits
at most 4,096 numbers between checkpoints. Public identity, import and export
functions snapshot every caller-owned input (including historical result data)
synchronously before their first asynchronous checkpoint. Later caller mutations
cannot alter a pending record or make its contents disagree with its digests. When a caller supplies no hooks,
validation/hash checks are completed without yielding a Worker event macrotask.

## Envelope

Required fields:

    schema: "networked-sync-record-v1"
    mode: "raw" or "history"
    config: normalized receiver configuration
    observation: raw receiver-input record below
    identity: {config_sha256, sample_sha256}

History additionally requires:

    historical: {
      label: "historical-import-not-fresh-execution",
      freshExecution: false,
      result: previously stored result
    }

Raw mode forbids `historical`. Unknown envelope, identity and observation fields
are rejected. History export strips the redundant raw `result.observation` copy.
A historical nested result may retain its original `status:"fresh-execution"`
from when it was calculated; the enclosing `historical.freshExecution:false` and
label always govern its status on import. No history field is used to initialize,
select, or evaluate a subsequent held-input receiver computation.

The two digests do not cover historical results. They identify config and input
samples, not an authenticated result. Editing historical results does not turn
those results into verified or fresh execution. Changing any covered config,
metadata, sample or pilot is detected unless both content and digests are
intentionally reissued; plain hashes are not signatures.

## Observation

Required fields:

    shape: [M,N,K]
    observations: [link0, link1]
    pilots: [pilot0, pilot1]

Each link is a flat interleaved real/imaginary vector of length `2*M*N*K`, in
C-order `(m,n,k)` with `k` varying fastest. Each pilot is a flat interleaved vector
of length `2*N*K`, in `(n,k)` C-order. Exactly two reciprocal links are required.
Array inputs and non-shared Float64Array inputs are accepted; exported records
contain ordinary dense arrays. All numbers must be finite.

Optional metadata:

- `configPhysics`: exactly `bandwidthHz`, `carrierHz`, `spacingWavelengths`
- `generationConfig`: fields from `seed`, `snrDb`, `offsetS`, `cfoHz`, `scenario`

Codec checks physical metadata is positive and pilots are nonzero (magnitude
at least 1e-12). The Worker additionally invokes the receiver's stricter config,
unit-modulus pilot, sample-scale, and immutable metadata validation before
acceptance. Direct codec calls are serialization checks, not substitutes for the
receiver's numerical admissibility checks.

Source-derived model convention: pilot multiplication is retained in the saved
raw observation; division by known pilots belongs to the receiver. Spatial phase
is positive, delay phase negative, slow-time phase positive. Complex tensor
ordering follows the Python reference's C-order model, not an 802.11ad framing
convention.

## Config digest

Create a metadata object containing `shape` and the optional `configPhysics` and
`generationConfig` only when present. Hash UTF-8 bytes of canonical JSON:

    {config, observation_metadata: metadata}

Canonical JSON recursively sorts object keys by ECMAScript UTF-16 lexical order,
retains array order, uses ECMAScript JSON number/string formatting, and normalizes
negative zero to positive zero. Nonfinite values, undefined, functions, bigints,
symbols, cycles, getters, hidden fields, sparse arrays and unsupported objects are
rejected. Inspection uses native typed-array accessors and indexed serialization,
so custom `Symbol.toStringTag` and array iterators are not evaluated. This is a
data-record API, not a sandbox for arbitrary JavaScript Proxy traps or mutated
global built-ins. Shared acyclic references are serialized by value. Unicode strings
must contain valid paired surrogates; unpaired surrogates are rejected rather
than replaced. UTF-8 byte counts, not code-unit counts, enforce string limits.

## Sample digest

SHA-256 input, in this exact sequence:

1. UTF-8 domain prefix `networked-sync-samples-f64le-zero-normalized-v1` followed
   by one zero byte
2. M, N and K as three unsigned 32-bit little-endian integers
3. `observations[0]`, then `observations[1]`
4. `pilots[0]`, then `pilots[1]`

Each numeric vector is encoded as IEEE-754 binary64 little-endian. Every signed
zero becomes positive zero before encoding. Shapes determine vector lengths, so
no additional vector separators are necessary. Both digests are 64-character
lowercase hexadecimal strings. No randomness/timestamps enter either identity.

## Bounds

- Tensor dimensions: `4 <= M <= 10`, `8 <= N <= 36`, `5 <= K <= 20`
- Two raw tensors: at most 14,400 complex samples combined (28,800 scalars)
- Each raw link: at most 14,400 scalars; each pilot: at most 1,440 scalars
- Codec rank: 1–3; remaining solver config bounds are checked by receiver
- Input/encoded record: 64 MiB UTF-8 maximum
- Preflight conservative JSON budget: 64 MiB (it can reject a record whose actual
  encoding is smaller; this is intentional early-allocation protection)
- Tree nodes: 4,000,000; depth: 24; array length: 1,000,000
- Object fields: 128; key bytes: 128; individual string bytes: 16,384

A serialized import JSON string gets the overall 64 MiB bound, then its parsed
fields receive the smaller individual-string bound. Huge sparse arrays are
rejected from their length before scanning. Extra array properties, including
non-enumerable or symbol properties, are rejected. Only non-shared Float64Array
views are accepted; other typed arrays, DataView and shared buffers are rejected.
Finite extremely small/large binary64 values are hashable without arithmetic
rescaling, but the receiver rejects unsupported observation scales. The codec's
limits are serialization bounds, not claims that every accepted serialization is
an identifiable numerical experiment.
