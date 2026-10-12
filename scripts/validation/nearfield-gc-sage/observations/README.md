# Repository packaging

The runtime is `nearfield-gc-sage-observations.js` at the public root (canonical source: `labs/near-field/`). The 24 regression tests are `tests/nearfield-gc-sage-observations.test.cjs`. From this evidence directory, `python3 oracle-reference.py` regenerates the large evaluation fixture and five actual JS fits before independently comparing them; the generated 19 MB fixture is deliberately not committed or loaded by the browser. `python3 oracle-generator.py` checks generator parity, and `node verify-regimes.cjs` reruns all offered acquisition/budget combinations. Numerical reference and port runner are in sibling `reference/` and `port/`. These three commands write only local evidence outputs.

# Deterministic reduced GC-SAGE observations and truth-only evaluation

Version: `reduced-gc-sage-observations/1.0.0`
Geometry contract: `reduced-gc-sage-2d/0.2.0-all-channel-region`
Generator: `mulberry32-midpoint-box-muller/1`

This dependency-free browser UMD/CommonJS module owns synthetic observation generation, an observed-data matched-delay display, and simulation-only evaluation. It contains **no inverse estimator** and imports no fixture, saved fit, expected answer, network service, or external package. The separate audited inverse core receives observations plus declared model/options only. This is a reduced synthetic 2-D, one-bounce, known-two-path lesson, not full GC-SAGE or a reproduction of paper Figures 5–9.

## API

Browser global: `GCSAGEObservations`. CommonJS: `require('./nearfield-gc-sage-observations.js')`.

- `generate(config = {})` returns `{simulator_version, config, observations, model, truth, ledger}`
- `evaluate(result, observations, model, truth, {visibilityHeuristic: false})` returns truth-only metrics; it does not modify any input or fit
- `matchedDelay(observations, model, {points:256, minDelayNs:0, maxDelayNs:55, floorDb:-60})` derives a power display from observations only
- `associateDelays(actualSeconds, estimatedSeconds, presentBooleans)` exposes the exact two-path partial-association rule for verification
- `configWithDefaults(config)` validates without simulating
- `VERSION`, `GEOMETRY_VERSION`, `GENERATOR_VERSION`, `C`, `DEFAULT_CONFIG`, `OFFERED` are exported

Noisy complex arrays use the inverse core's packed format: `{rows, cols, real:Float64Array, imag:Float64Array}`, row-major receiver then tone. Returned arrays are newly allocated on every generation. No RNG state persists between calls. No global `Math.random` is used.

Strict accepted generation keys and first-release values:

| Key | Values | Default |
| --- | --- | --- |
| `snrDb` | 5, 10, 15, 20 | 15 |
| `aperture` | 0.05, 0.35, 0.75, 1.49146747855 m | 1.49146747855 |
| `bandwidthHz` | 20e6, 100e6, 250e6, 500e6, 1e9 Hz | 1e9 |
| `seed` | integer 0 through 4294967295 | 260501162 |
| `scene` | `normal`, `reference-blind` | `normal` |

Unknown keys, nonfinite values, out-of-range seeds, or unsupported regimes fail rather than being silently rounded/coerced. There is no arbitrary scene editor, arbitrary noise variance, noiseless live mode, carrier control, path-count control, or true-delay-centered prior. Independent noiseless fixtures are test-only.

### Exact fixed scene and acquisition

- Propagation speed 299792458 m/s; Tx (1,0)
- Point (1,1), gain 1; finite horizontal reflector from (1.5,2) to (2,2), gain `0.8 exp(i0.7)` on visible receivers
- 48 Rx positions uniformly from (2,0) to `(2+aperture,0)`; 64 uniformly spaced centered tone offsets spanning the selected bandwidth, endpoints included
- Reference index 23, known L=2, region `[0,6.5] × [0.05,6.5]` m, absolute-delay upper prior 55 ns, all independent of truth
- Point delay `(1 + sqrt((rxX−1)^2+1))/C`
- Image Tx (1,4), bounce `((1+rxX)/2,2)`, reflected delay `sqrt((rxX−1)^2+16)/C`
- Finite-segment support includes 1e−10 m coordinate tolerance. Normal scene support is 48,48,48,32 receivers across the four aperture choices
- `reference-blind` additionally retains only indices `<floor(0.2×48)=9`. It leaves reference23 unchanged and therefore reflection-blind

The aperture is **left anchored**, so changing span changes viewpoint, reference coordinate and finite-segment support, as well as sample spacing. It is not a fixed-viewpoint aperture-only experiment. It uses 48 virtual, sparse/decimated samples, not an assertion of the paper's 0.75-wavelength receiver pitch. Per-channel free complex gains absorb a frequency-independent carrier phase; centered tones express the broadband phase slope that remains informative.

The frequency lattice's delay alias period is checked. Every exposed bandwidth supports the independently declared 55 ns prior. Every modeled reflection intersection in the inverse core must lie in the full search region, including weak/zero-gain channels. Truth masks are never supplied to or used to relax that conservative prior.

### Noise and determinism

`noise_variance = mean(|H_unblocked|²) × 10^(−snrDb/10)`, where the unblocked scene has both paths at every receiver, even beyond finite-segment support. Then `W = sqrt(noise_variance/2) × (Greal + i Gimag)`, with independent standard normals. Finite support and the reference-blind blockage change the clean channel but **never rescale or redraw noise** at fixed acquisition/seed.

The PRNG is Mulberry32 with a fresh uint32 state initialized directly from `seed` and the fixed increment `0x6D2B79F5`. Its uint32 output `r` becomes the strict-interior midpoint uniform `(r+0.5)/2^32`. Box–Muller consumes two uniforms and yields cosine then sine, caching the second normal locally. Normal draws fill all 3072 row-major real samples, followed by all 3072 imaginary samples. This exact ordering and arithmetic are versioned. It is a simulation generator, not cryptographic randomness.

The same configuration/seed/generator version in the same JavaScript math implementation reproduces the same arrays bit-for-bit. Independent Python reconstruction agrees at Float64 tolerance; transcendental last bits are not promised across all engines. **The same integer seed does not reproduce NumPy PCG64.** Solver cross-language parity must use common observed arrays, not independently seeded language generators.

### Separation at the worker boundary

Send only `{observations, model, options, runId}` to the estimator worker. Do not import this module into that worker, send the complete `generate()` result, or pass `truth`, seed, scenario labels, true delays, clean samples, noise, visibility, or evaluation metadata. Generate the full observation once and share those same bytes with both fits. Use one shared data-derived initializer in the same runtime.

`truth` has `evaluation_only:true` and stores clean/noise arrays, variance, point/surface, mechanisms, delays, gains, visibility and bounces. `ledger.evaluation_only` holds clean/unblocked/noise/observed energy, expected noise energy, nominal-versus-realized received SNR and true support. These are simulation accounting, not estimator inputs.

### Resource ledger

Always-readable declared fields include sample/real-scalar counts, 96 free complex nuisance gains, aperture/endpoints/spacing/reference coordinate, bandwidth/tone spacing, inverse bandwidth, alias period and prior. `inverse_bandwidth_ns` is a scale, not achieved estimation accuracy. The ledger distinguishes nominal SNR from realized received SNR after support and the actual noise draw. Energy quantities are sums/means of normalized channel-observation squared magnitudes. No calibrated transmit joules, physical pilot energy, throughput, energy efficiency, or hardware-time claim is made.

## Evaluation contract

`result` is the inverse core's returned fit object (two states and a packed summed prediction); `truth` is provided separately only after fitting. Inputs and nested arrays are never mutated.

- Observed SSE is `sum |Y−prediction|²`, with `relative_residual_db = 10log10(SSE/sum|Y|²)`
- Clean-channel NMSE is independently `10log10(sum|Hclean−prediction|²/sum|Hclean|²)`; zero numerator uses the reference's 1e−300 log floor; zero denominator yields null and an explicit reason
- Truth-present paths are associated solely by reference delay using a padded minimum-cost assignment. Real-to-real costs are absolute delay differences in ns; either unmatched endpoint costs 0.25 ns, dummy-to-dummy costs zero. After solving, only real-real costs ≤0.5 ns are accepted. Absent paths and extra estimates remain unmatched
- The small shortest-augmenting-path algorithm reproduces SciPy 1.17's reverse remaining-column order and free-column tie preference. **At an exact 0.5 ns tie, the minimum-cost assignment may prefer unmatched nodes**. A naive inclusive pairwise gate is not equivalent
- Association never sees an estimated mechanism label. Wrong labels cannot select a different truth target
- Undefined/unmatched geometry remains null; an unlocalized path has no fabricated coordinate. Point error compares its estimated reference interaction point with the true point. Reflection interaction RMS uses only the truth-visible sampled bounces. Unilluminated segment endpoints are not estimated or scored
- Reflection normal/line-offset errors require an actual fitted line. Normal sign is irrelevant; angle is `acos(abs(n_est·n_true))`, line offset is distance from the fixed true surface point to the estimated infinite line
- Scattering-only `mechanisms_correct` is null, with `mechanism_score_applicable:false`: that comparator deliberately has no reflection label. Hybrid labels are scored only after partial association
- Conditional gain-design diagnostics use the analytic two-column singular values with a stable direct-difference calculation. They describe linear gain rank conditional on fitted geometry, not global geometry or mechanism identifiability. An infinite condition number is null with a reason

Deliberate correction to a corner of reference evaluation: for an estimated normal perpendicular to the true one, the reference's `sign(dot)` normal alignment becomes the zero vector and incorrectly makes line-offset error zero. This module uses the original unit normal inside an absolute dot product, preserving the physically meaningful distance. The exact perpendicular case has an independent test; ordinary reference cases agree to numerical tolerance.

### Optional support heuristic

Continuous matched gain power is returned. Binary support is **off by default**. If explicitly requested with `visibilityHeuristic:true`, display `|gain|² > max(−ln(0.01) × simulatorNoiseVariance / tones, 1e−12)`. The nominal threshold and effective floor are both disclosed. This is a simulator-known-noise matched-filter display heuristic, not the paper's detector, a calibrated global false-alarm guarantee, or an optimizer input.

### Observed-data matched-delay display

`matchedDelay` computes `|sum_p Y[q,p] exp(+i2πν[p]τ)/P|²` on a stated uniform delay grid. Its `power` and `relative_power_db` objects hold `{rows,cols,values:Float64Array}`. `delays_ns`, the reference row's power/dB slices, global `peak_power`, floor, and normalization text are returned. The power-dB display uses one global response maximum across receivers per run; values below the declared floor are clipped only for display. A zero-input run stays at the disclosed visual floor. This is not a spatial image or a detected target list.

## Run verification

No package installation is needed. The sibling audited inverse core and Python NumPy/SciPy environment are used only by verification scripts, never by the runtime module.

```sh
node --test test-observations.cjs
python oracle-reference.py
python oracle-generator.py
node verify-regimes.cjs
```

- `fixtures/analytical-noiseless.json`: standalone scalar math/cmath derivation, not an optimized or hard-coded live result
- `fixtures/oracle-evaluation.json`: offline pure JSON truth/observation/fit inputs and independent reference expectations
- `fixtures/oracle-association.json`: 1296 exact SciPy assignment cases, including threshold/dummy/tie/absent cases
- `results/node-tests.tap`, `results/oracle-comparison.json`, `results/generator-comparison.json`, `results/regime-comparison.json`: numerical evidence
- `VERIFICATION.md`: concise scope and verification report

The module never imports these files. All runtime arrays, estimates (in the separate core), display responses, and metrics are computed live.

## Source boundaries

The simulator and metrics follow the corrected sibling `nearfield-gc-sage-reference/experiments.py`, `gc_sage.py`, README, VERIFICATION and the `nearfield-gc-sage-browser/LESSON-DESIGN.md` contract. The one-bounce mechanism context is [arXiv:2605.01162v1](https://arxiv.org/pdf/2605.01162v1), with normalized normals, physical ray intersections, and conservative all-channel V explicitly declared numerical/modeling choices. Original-paper ray tracing, field data, multi-bounce/3-D localization, unknown timing/model order, held-out live execution, and physical energy/rate outcomes are outside this module.
