# Public comparison and reuse interfaces

All JavaScript files use standard ES modules; Node and browser Workers consume the same numerical source. No bundler or dependency install is required.

## Portable generator comparison

`node cli.mjs generate '{"scene":"separated","seed":101,"noise":1}'`

Output includes:
- `provenance.generator_version`: exact public-spec version.
- `observations.stations`: ordered station IDs 1 then 2; each has `position_m`, 25-entry `angles_deg`, 161-entry `delays_ns`, and 25 × 161 `power_db` in row-major order.
- `observations.communication`: ordered IDs mpc0 … mpc3 with `excess_ns`.
- `truth.objects`: ordered A/B/C, `x`, `y`, `sensing_visible`, `identifiable`, `true_excess_ns`.
- `truth.communication`: ordered observation IDs with `object_id` and `identifiable`.

`node cli.mjs stream '{"seed":101,"scene":"separated","name":"floor/station-1","count":8}'` returns the first advanced uint32 values. The source exports `fnv1a32`, `createNamedStream`, `nearestDelayBin`, `generateCase`; no independent oracle implementation is imported.

The generator comparison must compare numerical values at absolute/relative 1e−10 and exact integer streams, not hash independently formatted JSON. Save and hash original output bytes separately when preserving evidence.

## Inference input boundary

`infer(observations, overrides)` accepts the observations object above. It uses only explicitly validated observation fields and six inference configuration fields: `minPowerDb`, `minSeparationNs`, `minRangeM`, `maxPeaksPerAngle`, `clusterRadiusM`, `associationGateNs`. The input must declare `delay_origin: absolute-calibrated-round-trip-ns` and `communication_origin: excess-relative-to-los-ns`.

All positions are metres, angles degrees, power dB, times ns. `detectPeaks`, `localMaxima`, `groupDetections`, `associate`, `validateObservations` are exported for focused audit. Peak identity encodes station, row and bin; groups link to these identities and full chosen representatives. Grouping never uses object IDs, coordinates or truth labels.

`infer` returns detections, groups, per-row stage counts and three branches. Each prediction has `group_id`, `point_m` (null for paired range), `excess_ns` (null if unavailable) and reason. Associations expose the full candidate set and signed residuals. Null is never replaced with zero.

`node cli.mjs captured '{"path":"captured.json","config":{}}'` consumes a captured observation object or a full `{observations,truth?}` file. It does not invoke a generator. No historical raw observations are present in this rebuilt directory, and this interface does not imply their recovery.

## Worker lifecycle

Request `{requestId, revision, config}`; response `{type: result|error, requestId, revision, result? ,elapsed_ms?, message?}`. The UI terminates the current Worker on every computational edit, invalidates displayed and exportable results immediately, and rejects every response unless both IDs and the current Worker identity match. Display-only branch/group/truth edits do not regenerate input. Reset invalidates the old run first. Closing/navigating the page terminates the Worker.

## Truth and metrics

Evaluator truth matching is maximum-cardinality then minimum squared position error at 0.6 m. Assignment correctness requires the unique assigned group's matched truth ID to equal the physical path ID **and** that path be identifiable. Any unique assignment to an intrinsically nonidentifiable path is counted false/unjustified, even if the hidden ID happens to match. Recall includes all three physical communication paths, including missing and ambiguous objects. Clutter is excluded from the recall denominator but included in assignment safety metrics. False-association rate is null when no unique decisions exist. Delay RMSE uses only geometrically matched groups with available predictions; it must be reported alongside missed counts and prediction coverage.
