# Independent actual-code validation

These checks were written by a separate numerical reviewer, not by the JavaScript implementation author. They exercise the actual CommonJS core with independent impulse-propagation matrices, complex phasors, explicit input fixtures, and noise-moment coefficient sums. They do not import the core's covariance functions as the statistical oracle.

## Reproduce

Keep `validate_perceptive_clutter.py`, `js_bridge.cjs` and `explicit-clutter-fixture.json` together. Run from the website repository root:

```sh
python3 path/to/validate_perceptive_clutter.py --core ./perceptive-clutter-core.js --output ./independent-js-results.json
node path/to/validate_perceptive_clutter_noise.cjs ./perceptive-clutter-core.js ./independent-js-noise-results.json
```

The Python check needs Python 3, NumPy and Node; the noise check needs Node only. No package is installed by these scripts. Paths can be changed via the shown arguments. The first script records the tested SHA-256 and whether the core changed during the run; a temporary source snapshot makes each run internally consistent. Assertions cause nonzero exit on failure. The results include exact tested hash and runtime version, avoiding a blanket claim about future edits.

The explicit fixture was generated independently from the research reference's declared scalar model, with Python's random.gauss seed 20261011 and its input parameters. It is original synthetic teaching data, not paper data or a paper figure. Passing explicit I/Q input between languages avoids assuming Python and JavaScript generators have identical same-seed streams.

## Result on 2026-10-11

Tested core SHA-256:
`298a998abbdc1aface1916cdc74ee2abef1213977337d5c2b41a82b907f02924`.

- 22 filter/operator cases, 176 exact finite covariance comparisons, 198 complex steady gain cases
- 18 full 512-sample simulations across endpoint/nominal alpha, both subtraction orders and continuous/stop/departure scenarios
- Explicit cross-language fixture, common noise/resource checks, aliasing, count-one boundaries, invalid guards, tiny-alpha residual preservation, true zero/tiny power, memory endpoints
- Independent actual-JS noise diagnostic: 160,000 trials, seed 18373491, alpha .82, sigma2 .37, N7, p3/q6. Twelve moment checks; maximum |z|=1.313, within the declared 5-standard-error diagnostic threshold

Maximum errors: filter 4.97e-16; covariance 2.23e-16; complex gain 2.45e-16; full simulation matrix comparison 3.59e-15. Machine-readable results and logs are included. Monte Carlo is a stochastic diagnostic, not proof of a probability guarantee, whiteness, detector calibration or system-level sensing performance.

Scope: the bounded complex scalar teaching model at update instants. These tests are not browser, accessibility, integration, network deployment, full-paper reproduction or third-party-paper correctness certification. Source-manuscript phase findings must retain the fixed-edition boundaries documented by the lesson. No source PDFs, article text or rendered manuscript pages are included.
