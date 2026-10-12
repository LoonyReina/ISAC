# Independent compact-history audit

12 October 2026. **PASS for observer-only post-run replay instrumentation.**

Current core SHA-256: `fe96407e6a09c71aa141d75fecaf26d23e15bbc1514f30ed121262dbdfc3ceda`.

Preserved audited predecessor SHA-256: `6baeea9ea710162ba91ad8919c33c6b0a5d8f6cf664b8bd2f3ac2442a68fcc68`, at `superseded/pre-history-v0.2.0/gc-sage.js`.

Numerical contract unchanged: `reduced-gc-sage-2d/0.2.0-all-channel-region`. Independent observer schema: `gc-sage-compact-history/1.0.0`.

## What was independently checked

`independent-history-inputs.py` exports only fresh observations, model priors, and numerical options from the separate Python simulator. `independent-history-audit.js` calls the actual preserved and instrumented cores. Its eight cases are default, zero sweeps, one sweep, low SNR, 5 cm aperture, 20 MHz bandwidth, reference-blind reflection, and absent second path. Both estimators are tested on every case.

- All 16 method/case combinations have bit-identical numerical results, trace arrays, states, gains, predictions, convergence, and compute counters across predecessor, new history-disabled, and new history-enabled runs, excluding timing and the optional history field
- All 180 actual attempted-update boundaries reconstruct their recorded global SSE from the compact snapshots; maximum absolute difference is **4.5474735089e-13**
- Independent recomputation of each incumbent gain-refit SSE differs by at most **1.1368683772e-13**
- Selected-source records agree with the actual candidate/incumbent objective comparisons
- Tested boundaries include 75 scattering selections, 20 reflection selections, and 85 incumbent updates; 27 mechanism changes are retained at their actual boundaries
- Initial and retained unknown geometry remains null; 48 unlocalized state snapshots are checked
- Snapshot objects, arrays, and typed-array backing buffers do not alias other snapshots or final states. Mutating returned history does not change final states, public initialization, or a subsequent fit using the private initializer
- Geometry-change flags, trace/sweep/path indices, cumulative counters, monotone measured elapsed times, zero-budget state, and final replay state are checked
- Histories carry only the approved compact state fields, without observations, predictions, simulator truth, evaluation associations, or visibility labels

No natural rejection occurred in these 180 boundaries. The port owner's isolated VM source-copy fixture forces rejection only inside the test, with no production rejection knob. The reviewer inspected and reran this test: rejected records preserve the previous path-state reference, carry no replacement state, and reproduce unchanged SSE. This is branch coverage, not a claimed naturally observed adverse event.

The reviewer reran the combined **65/65 focused tests** (52 core and 13 history tests). Evidence: `independent/history-focused-tests.tap`, `independent/history-audit.json`, and `independent/history-audit-console.txt`.

## Scope

The 55-case/110-fit numerical audit remains attached to the exact preserved predecessor hash. This addendum binds the instrumentation hash by direct bitwise comparison across the eight stated cases; it does not relabel the earlier 55-case run as a new-hash run. Source inspection shows only strict Boolean option validation, compact deep copies, schema/export additions, and passive recording around unchanged numerical choices.

The feature supports **reviewing already computed updates**. It does not provide live single-step execution or pause/resume. Copying adds real memory and timing overhead. Worker termination/replacement, stale-run rejection, bounded controls, rendered-browser behavior, and actual browser latency still require integration tests. All scientific scope and failure caveats in `INDEPENDENT-AUDIT.md` remain in force.

## Reproduce

```sh
python independent-history-inputs.py
node independent-history-audit.js
node --test test-core.js test-history.js
```
