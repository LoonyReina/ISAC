# Gaussian tradeoff lesson gates

These tests mount the production lesson and use actual Node `worker_threads`. The small first-party DOM harness models element values, events and SVG markup. It is not a browser, CSS/layout engine, screen reader, mobile device, or browser performance audit. No numerical Worker is mocked.

From the source root (or the compatibility staging root):

```sh
node --test labs/gaussian-tradeoff/lesson/tests/*.test.mjs
node labs/gaussian-tradeoff/lesson/tests/export-ui-records.mjs --out /absolute/new/evidence-directory
node labs/gaussian-tradeoff/lesson/tests/replay-ui-records.mjs --manifest /absolute/new/evidence-directory/UI-EXPORT-MANIFEST.json
```

The export command drives production mounted controls and captures only the text delivered by the production download buttons. It never synthesizes substitute records. It refuses an output directory containing a prior manifest. The resulting raw/history artifacts retain the frozen runtime's canonical tagged binary64 wire format and SHA-256 digests.

`record-audit.mjs` independently implements tagged decoding, binary64 canonical serialization and SHA-256 checking using Node Buffer/crypto, without importing the runtime codec. `replay-ui-records.mjs` audits all files and launches a fresh actual Worker for each input. Historical labels remain non-fresh; fresh computed replay hashes must equal the downloaded historical output hashes exactly. Matching raw/history inputs must reproduce the same result. The replay report explicitly labels the transport as Node rather than browser execution.

The tests cover arbitrary continuous weights, fresh complex channel/covariance input, dimensional/model changes, Gaussian/Stiefel sample views and realizability, held-X/Y posterior processing, finite Wishart and rank-one sphere computation, record immutability/provenance, invalid replacement preservation, cancellation/supersession/death/restart/reset, suspension and stale asynchronous import handling. Exact executed counts and outcomes belong in the run reports, not this capability description.
