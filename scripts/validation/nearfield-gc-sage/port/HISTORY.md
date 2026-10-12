# Optional compact history

Enable with `fit(observations, model, mode, {...options, record_history: true}, initial)`.

Default is false: the result has no history property. Numerical contract remains `reduced-gc-sage-2d/0.2.0-all-channel-region`; history schema is independently named `gc-sage-compact-history/1.0.0` and exposed as `HISTORY_SCHEMA_VERSION`.

## Output

`result.history` contains:

- `schema_version`
- `initial`: trace index 0; copied compact states; zero fit-only compute counters; measured elapsed seconds
- `updates`: one record for every attempted path update, in trace order

Each update contains:

- `trace_index`, `sweep`, `path`, `accepted`: exact corresponding objective-trace boundary
- `chosen_source`: the adopted source, one of `incumbent`, `scattering`, `reflection`, or `rejected`
- `geometry_changed`: whether the adopted geometry/kind/delay fields differ from the previous active state; gain changes alone are excluded
- `incumbent_subproblem_sse`: the actual incumbent loss after its gain refit and before family comparison
- `state`: copied compact adopted active-path state when accepted, otherwise null
- `unchanged_from_trace_index`: when rejected, the last accepted state boundary for this path (or 0); otherwise null
- `cumulative_budget`: fit-only projection/candidate counters at that boundary, excluding seconds; initialization has its separate budget
- `elapsed_seconds`: actual elapsed fit time at that boundary, including history-copy overhead to that point

A compact state contains `kind`, `reference_delay`, `point`, `normal`, `bounce_points`, `theta`, `delays`, and channel-wise complex `gains`. It contains no observation, prediction matrix, truth, known visibility, or matching label. All arrays are independent copies; none alias the optimizer, returned final states, or other history snapshots. `unlocalized` and null geometry remain explicit.

An accepted incumbent refit is a real computed update even if geometry is unchanged. Do not call every accepted record a new physical location. Rejected records leave the current state untouched.

## Replay

```js
const states = structuredClone(result.history.initial.states);
for (const update of result.history.updates) {
  if (update.trace_index > selectedTraceIndex) break;
  if (update.accepted) states[update.path] = structuredClone(update.state);
}
const prediction = G.predict(states, model.frequencies);
const reconstructedSSE = G.residualSSE(observations, prediction);
// Compare to result.trace[selectedTraceIndex].sse within Float64 summation error.
```

This reconstructs the real selected state and objective; it does not interpolate final geometry backward. Existing trace records retain the scattering/reflection family losses and search availability statuses.

Label UI controls “Review computed updates.” History is collected during a synchronous solve and returned afterward. It does not support live stepping, ordinary-message cancellation, a complete candidate landscape, or animated optimization between actual boundaries. Worker termination and stale-run protection remain mandatory for a future UI.

The 13 focused history tests cover default methods, the adverse unlocalized narrowband result, incumbent-only refits, exhausted/zero budgets, counters, every trace reconstruction, enabled/disabled exact numerical equality, and deep-copy isolation. A clearly labeled source-copy test fixture forces the rejection branch to exercise unchanged references; this is not a claimed naturally rejected scientific case and does not alter the production kernel.
