# Source audit and implementation boundaries

Freshly read on 2026-10-20: https://arxiv.org/html/2601.18558v1, especially §§3.1–3.2, Eqs. 1–3. Historical review/disposition were read only as scope evidence. Independent oracle reference code and tests were not read or copied.

## Source-backed main task

1. §3.1 uses scans from −60° to +60° at 5° steps. Per-angle local maxima must meet −55 dB minimum height and 2.2 ns separation; peaks with range below 0.5 m are removed and at most four dominant peaks per angle retained.
2. Range is `R = c τ / 2`, with c = 299792458 m/s. This candidate requires **absolute calibrated round-trip delay** in the scan input. The source's displayed PADP is strongest-path-normalized, so arbitrarily treating an uncalibrated excess delay as an absolute round trip would be wrong. Real measured input requires its calibration origin to be restored first.
3. Eq. 1: station 1 point = `(x1 + R cos θ, y1 − R sin θ)`.
4. Eq. 2: station 2 point = `(x2 − R cos θ, y2 − R sin θ)`. The two stations are oppositely facing, not identical-angle coordinate frames.
5. Eq. 3: excess delay = `(distance(m,p1) + distance(m,p2) − distance(p1,p2)) / c`. Communication observations use excess delay relative to LoS, not round-trip delay.
6. §3.2 compares such predicted delays against communication MPC delays. Its reported metal-plate/wall identification is not claimed for our anonymous synthetic objects.

## Declared site reconstruction, not author algorithms

The paper does not prescribe a complete automatic clustering, tie-breaking, object representative or unique-assignment implementation. For repeatability this candidate defines:

- Interior local maxima only. A flat plateau is one peak at its lowest bin index if both exterior neighbors are lower; endpoints are excluded.
- Height is inclusive. Resolve separation strongest-first, equal heights favoring the lower bin; equality at the separation threshold is retained. Then apply the inclusive range gate and retain top K by power. This follows the source's order, and means rejected near-field peaks can already suppress neighboring peaks during separation. Output retained peaks is sorted by delay.
- Connect all backprojected detections whose Euclidean distance is at most 0.45 m, including same-station neighbors. Connected components are transitive, so chaining can merge distinct objects; this is a visible method limitation, not semantic object recognition.
- Within each group retain the strongest detection per station, resolving equal-power ties by row then bin. Average the available station representatives equally, not by detection count or dB power. Groups have stable IDs by first input detection.
- Candidate membership uses inclusive absolute delay error ≤ 0.75 ns by default. One candidate → unique, more than one → ambiguous abstention, none → unmatched abstention. Each MPC is considered independently; no global one-to-one data association is claimed.
- Coordinate branch uses the group centroid in Eq. 3. One-station groups can yield a geometric prediction, without implying demonstrated empirical advantage.
- The fair paired-range baseline uses the **same observations, groups and strongest station representatives**, predicting `(R1 + R2 − station separation)/c`; if one station is absent it reports unavailable. It inherits angle information through grouping and is not an autonomous unpaired range-only algorithm. Negative delay estimates are retained, not clamped.
- The destructive zero-angle ablation uses those same representatives but sets their bearings to zero before equal averaging and Eq. 3. It is not a fair baseline. This is a new, explicit local ablation definition, not a claim to recover the missing historical branch code.
- Separate evaluator truth matching is maximum-cardinality, then minimum-squared-distance bipartite matching with a 0.6 m gate. This is evaluation-only, never inference. The threshold is a new declared evaluator choice because the historical evaluator source is unavailable.

## New synthetic generator

Implements the recovered public `PORTABLE-GENERATOR-SPEC.md` byte-for-byte in its seed string and integer arithmetic, with binary64 numerical output tolerance 1e−10. The fixture uses 25 angles, 161 delay bins, fixed stations (0,0)/(4,0), 3 anonymous physical objects, 3 physical communication paths and one 18 ns clutter path. Noise perturbs the floor and sensing/communication delays using independent named FNV-1a/LCG32 uniform streams.

The observed powers are scalar dB samples. The angular envelope and MAX collision handling are phenomenological, **not** waveform/CIR superposition, a physical antenna, calibration hardware or RCS model. Noise zero still consumes prescribed draws. Missing B remains in physical truth, communications and the recall denominator but is omitted from both sensing scans. The equal-delay pair remains truth-nonidentifiable.

## Truth boundary and nonclaims

`inference.mjs` imports no generator, scene or truth module. Its interface contains no physical object identity, coordinates, visibility or identifiable labels. The UI can reveal truth for interpretation only after inference. The evaluator reads truth afterwards and labels wrong/ambiguous/missing outcomes without repairing predictions.

This candidate does not reproduce the author's measured PADPs, complex CIR, measured S1/S2, semantic wall/plate recognition, 3 mm wall result, RCS (§3.3/Eq.4), hardware or full paper. Historical 36-case results, old RNG conclusions and 21 screenshots are not new evidence. Representative experiments, independent audit and actual browser tests must be rerun on these files before claiming rebuilt core teaching completeness. Export initiation is not confirmation of a saved file. Pure-static structure is not verified GitHub Pages deployment or whole-site integration.
