# Capacity–distortion desktop validation

Date: 2026-10-12 UTC. Checked deployed source commit `958e54d94928bd51378619587b4706dc9f371a40`, [PR 71](https://github.com/LoonyReina/ISAC/pull/71), [Pages deployment run 38240404641](https://github.com/LoonyReina/ISAC/actions/runs/38240404641).

Page: [actual finite-alphabet optimizer](https://loonyreina.github.io/ISAC/theory.html#capacity-distortion). Environment: Chrome desktop browser, 1180 CSS-pixel viewport width. Browser version, operating system and CPU were not recorded. These observations do not establish performance on other devices or arbitrary finite channels.

## Live functionality checked

- Initial results were hidden; prediction and Run revealed an actual solve
- Default binary model: 36 outer iterations, certificate gap about 9.836e-10 nat; all 19 frontier points certified
- μ=0 returned I=0.4 bit/use and D=0.2; q=0 returned zero information and distortion
- Inspecting iteration 0 replayed the computed initialization; the analytic-overlay toggle worked
- An outer-iteration cap of 1 was visibly unconverged; a negative input-cost budget was visibly infeasible
- The binary b=[0,1], B=0 configuration restricted feasible support as expected
- The independent ternary extension returned 50 iterations, I=0.5993048765 bit/use, D=0.24855346, cost=0.7, and a gap about 9.489e-10 nat. The inapplicable binary analytic overlay was excluded
- An actual downloaded ternary JSON was parsed and re-solved with the Node core. Its input probabilities, rate and distortion matched exactly. The downloaded file is not part of this public report
- Cancelling a longer q=0.01 solve and resetting during computation cleared visible results and export availability
- Keyboard Run and guide → experiment → browser Back worked; desktop content was readable without overflow
- No site-origin console error was observed; unrelated browser-extension errors were distinguished

## Individual timing observations, not a percentile benchmark

| Configuration | Observed control-to-result time | Worker time | Conditions |
|---|---:|---:|---|
| First default binary solve | 373.5 ms | not recorded | Cold worker resource loading included |
| Later default binary solve | 39.1 ms | not recorded | Same model, warm resources |
| Ternary extension | 392.9 ms | 132.5 ms | Includes roughly 250 ms input-debounce interval |

These are three labelled smoke samples with different cache/model/input conditions. They must not be pooled into a median, p95, speedup or universal latency guarantee. A repeated fixed-configuration benchmark with recorded hardware, browser version and sample distribution remains open.

## Wording defect and bounded correction

The deployed neutral cost vector b=[0,0], B=0 correctly set the numerical `exactCostBoundary` flag, but the UI incorrectly inferred that feasible support had shrunk. All input symbols actually have minimum cost. The correction checks the actual returned support length: neutral all-symbol support is labelled unchanged; a true restriction such as b=[0,1], B=0 is labelled 1/2 symbols. The numerical core is unchanged. A targeted regression covers both conditions, and the controller asset version is advanced to prevent stale cached wording.

This document records the deployed version above. The subsequent wording patch's local regression is separate from its post-deployment verification.

## Coverage remaining open

Live functionality is verified for the bounded finite-alphabet lesson and checked presets. This does not complete Gaussian Fig. 3, finite-length communication coding, the whole paper, all supported parameter combinations, or the repeated desktop-performance benchmark. [Numerical validation](CAPACITY-DISTORTION-NUMERICAL-AUDIT.md) and [source/algorithm mapping](CAPACITY-DISTORTION-SOURCE-AUDIT.md) retain their distinct scope.
