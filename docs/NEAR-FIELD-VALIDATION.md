# Near-field spatial matching case: validation

## Scope and implementation

The fifth bounded case, `near-field.html`, follows the existing broadside array chapter. It uses an independent, deterministic, equal-amplitude **one-way** spatial model with unknown common complex gain. It does not implement the paper's optimizer, CRB or MUSIC estimator, a two-way radar channel, noise trials, pathloss, or multiple-target resolution.

- Fixed main-paper reading: [2302.01153v5](https://arxiv.org/html/2302.01153v5), first submitted 2023-02-02, fixed revision 2025-09-23. Not a 2026 new paper. No revision diff claim.
- Foundation: [2110.06661v2](https://arxiv.org/html/2110.06661v2), fixed 2021-12-08. Its square-array finite-depth threshold is not imported into this ULA.
- λ=0.01 m, d=0.005 m, N=33/65/129, broadside angle zero, truth r₀=4…40 m, candidate r=2…80 m. N changes physical aperture D=(N−1)d.
- Exact stable relative path: Δℓ=(x²−2rx sinθ)/(ℓ+r). No quadratic approximation drives the plotted curves.
- All displayed correlations use the same vector inner-product normalization, which equals N² for these unit-amplitude vectors. No curve is normalized by its own displayed peak.
- Three computed responses: spherical/spherical, spherical/plane (candidate-range independent), plane/plane (one). Candidate grid step 0.1 m with the exact literal truth included.
- Residual phase is geometry-derived, referenced to the central element, and unwrapped by construction. Its vertical scale adapts and the caption says so.
- κ uses the exact derivative with common-phase projection. The stable broadside derivative is kΔℓ/ℓ. κ is local geometric sensitivity in m⁻², not CRB or MSE.
- No finite 3 dB width is computed or claimed. A plot window is not a finite beam-depth measurement.

## Independent numerical reference values

These toy-model numbers are independent exact spherical-distance checkpoints, not paper results. N=129, D=0.64 m and 2D²/λ=81.92 m:

| True r₀ (m) | Spherical/plane C | Spherical/spherical at 2r₀ | κ (m⁻²) |
|---|---|---|---|
| 4 | 0.1323007291 | 0.2027350052 | 0.3675160662 |
| 8 | 0.2015995712 | 0.6839095186 | 0.02311367785 |
| 20 | 0.7857007749 | 0.9422027254 | 0.0005927485214 |
| 40 | 0.9421933416 | 0.9852708803 | 0.00003705606884 |

Separate numerical-only far-field check r₀=400 m: spherical/plane C=0.9994072041. It is outside the UI truth controls.

## Automated checks

`node --test tests/*.test.cjs` runs both new and retained tests. The new numerical suite checks independent reference values, exact truth and bounds, common-phase/complex-gain invariance, the two candidate-range-independent plane responses, far-field convergence, exact path evaluation versus direct distances, local curvature finite differences, symmetry, supported controls, and input validation. The DOM suite executes the actual UI script in a dependency-free DOM harness, covering defaults, all N values, distance endpoints and interior values, repeated reset, resize, computed table values, responsive SVG viewBoxes and finite bounded paths at widths 240–950 px, chart labels, dash patterns, native controls, no autoplay and static fallbacks. Navigation tests cover all five cards, retained IDs, routes and fragments.

This harness is **not a browser**. It does not establish actual CSS layout, clipping, keyboard behavior, screen-reader output, or deployed network loading. No browser, online publication, PR, push or deployment was performed as part of this implementation task. Those checks belong to the parent's subsequent review and publication workflow.

## Verification result

On 2026-10-10, `node --test tests/*.test.cjs` passed **173/173** tests, zero failures (12 new numerical + 3 new DOM + 1 added navigation test, versus 157 at base main `0df32b751e94b0a02f026275d8173bad6dff95dc`). The numerical sweep covers all 219 supported N / half-metre truth combinations. `node --check near-field-core.js`, `node --check near-field.js` and `git diff --check` passed. Local link/fragment checks passed. Browser and deployed checks remain unrun in this task.
