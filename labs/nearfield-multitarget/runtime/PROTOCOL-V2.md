# Protocol v2: orchestration repair only

## Why a separate version

The independent audit found the v1 numerical core valid, but a real scene `{rate:1e-6,epsilon:.22}` produced an accepted proposed solve followed by NCCS `newton_factorization_failed`. The old Worker emitted only the failure, losing the successful evidence. It also accepted `input:[]` as default settings and accepted an empty ID. The original audit evidence is retained in `tests/original-rejected-protocol-evidence.json`; the original artifact bundle is unchanged.

No solver, model, linalg, sampler or certificate code was changed. New tests confirm the actual failing candidate and deterministic raw-coordinate replay. Numerical optimizer failures remain failures.

## Strict requests

Messages, input and options must be non-null plain records, not arrays, dates, numbers or strings. Omitted input/options mean `{}`; explicitly null/undefined values are invalid. Known input fields are exactly side, wavelength, power, noise, rate, epsilon, snapshots, users, targets; known option fields are maxSteps, maxMs, relativeGap. Unknown fields are rejected. Every provided numerical field must be a finite number in the same bounds as the unchanged kernel; integer fields are checked. User/target lists must have exactly 2/3 positions, each with exactly three finite numeric coordinates, including no sparse missing entries. Optional sample must be boolean, optional seed must be an integer 0..2^32−1. Seed validation is strict even if sampling is false.

Solve IDs are strings with at least one non-whitespace character and length ≤100. Every solve ID, including rejected/busy attempts, is unique for that Worker's lifetime. A duplicate receives an explicit `duplicate_id` error. An upper bound of 4096 recorded IDs prevents unbounded memory growth; create a new Worker thereafter. Cancellation reuses the currently active solve ID and is not a new solve. Wrong cancellation IDs produce `unknown_active_id` without altering the active job. Unknown fields in cancellation requests are rejected.

## Results

A completed solve request emits exactly one terminal `type:'result'`, even when one or both numerical modes fail. It contains:

- `id`: exact request ID
- `status`: `complete`, `partial_failure`, or `failed`
- `accepted`: both numerical modes accepted and no requested sampler failure
- `numericalAccepted`: both numerical modes accepted independently of sampling
- `results`: exactly two ordered entries, proposed then nccs

Successful entries are unchanged full certificate reports: mode, status (`candidate`), accepted, objective, rates, matrices, gates, certificate and history. Failed entries retain mode, exact failure status, accepted:false, optional error, and available raw coordinates/history/steps/rate bounds. If certification throws, solver status and coordinates are retained under a `certificate_failure` entry. An exception before a solver candidate becomes `explicit_failure` with accepted:false. Failure of one mode does not prevent the other mode being attempted. A sampler failure is retained separately under that successful numerical report's `sampler`, with status failed and error, rather than erasing the solved numerical evidence.

Actual regression result:

- Proposed: accepted, objective 0.001389055292640199 W, full report retained
- NCCS: `newton_factorization_failed`, accepted:false, all 76 raw coordinates and history retained
- Pair: `type:'result'`, `status:'partial_failure'`, accepted:false

Input/protocol errors emit `type:'error'`, accepted:false, explicit status and error. They do not masquerade as mathematical infeasibility.

## Cancellation and UI responsibilities

A cooperative cancellation emits `type:'cancelled'`, accepted:false, and both per-mode entries. Already finished evidence remains intact; interrupted modes are `cancelled`, and untouched modes are `not_run_cancelled`. The Worker does not emit a later successful result for a cancelled job. New jobs require fresh IDs. Progress contains the corresponding ID and mode.

The UI should display each mode's own accepted/failed state, preserve successful partial evidence, distinguish iteration/runtime/numerical failure from infeasibility, and show a comparator failure rather than hide the proposed result. It must reject stale IDs, terminate Workers on navigation/destruction, and use `terminate()` for hard cancellation during synchronous certification/sampling. One active solve per Worker; busy requests are rejected explicitly. No browser execution or UI validation is claimed here.

## Verification

`node tests/core.test.mjs` reran 10 tests on byte-identical numerical modules. `node tests/worker-node.test.mjs` verifies both modes, actual partial failure twice, raw-coordinate reproducibility, retained cap evidence, exceptions, 22 malformed requests, cancellation/restart, unique IDs, busy rejection and stale-result suppression. The adapter is a separate Node worker thread, not a browser. The real browser harness was updated for the new event shape without executing it. No additional CLI browser, Codex or publication action occurred.
