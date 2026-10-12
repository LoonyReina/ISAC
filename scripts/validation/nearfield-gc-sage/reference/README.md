# Reduced one-bounce GC-SAGE numerical reference

An independently implemented, executable inverse-problem prototype based on the one-bounce geometry and mechanism-comparison branches of [arXiv:2605.01162v1](https://arxiv.org/pdf/2605.01162v1). This package estimates unknown geometry from complex noisy samples. It is not a reproduction of the full algorithm, ray-tracing scenes, or Figures 5–9 of the paper.

Current algorithm version: reduced-gc-sage-2d/0.2.0-all-channel-region. The prior reference-point-only region model and its original passing evidence are retained separately as superseded results; their numerical agreement did not validate this corrected geometry contract.

## Run

Python 3.12 with NumPy and SciPy is sufficient. Exact tested dependency versions are in requirements.txt.

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python -m unittest -v test_reference.py
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python experiments.py --output default-result.json
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python verify.py
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python export_port_fixture.py
```

The verify.py command runs all unit checks, the default and noiseless cases, all seeds 0–9 at each of four SNRs, all seeds 0–9 at 5 cm aperture, three explicit failure examples, and a held-out-frequency check. It writes complete numerical evidence to results/. No network access is required. BLAS thread limits make these small jobs more predictable; they do not change the estimator.

## What is genuinely estimated

- Both path delays are initialized from the observed reference channel using matched filtering and single-channel SAGE sweeps
- A declared count of two paths is the model-order prior; the estimator is not told that one path is a point and the other a reflector
- Each spatial update cancels the other path, searches an ellipse of candidate geometry, and profiles out one complex gain per path and receiver
- The hybrid searches both scattering and reflection families; the comparator searches scattering only
- Both methods already support unknown partial visibility through these independently fitted gains
- The hybrid uses normalized common normals and per-receiver ray/line intersections, then chooses by the actual residual objective
- Previous estimates are retained when a proposed update does not improve the objective

Estimator entry point: fit(observations, model, mode, options, initial=None) in gc_sage.py. Model contains only transceiver coordinates, tone frequencies, search region, reference index, known path count, and delay-search bound. The separate experiments.py owns truth generation and simulation-only evaluation. A shared data-derived initializer is deep-copied for the two comparisons and checked against observation and model hashes.

## Defaults and disclosed restrictions

One Tx; 48 virtual Rx positions spanning 1.4915 m; 64 tones over 1 GHz; known L=2; one-bounce, 2-D geometry; bounded search region; no unknown timing offset. Physical sampling is intentionally sparse/decimated, not 48 receivers at the paper's 0.75-wavelength pitch. The geometry is a simple finite horizontal segment plus a rough point. It is synthetic and noisily observed, not the paper's ray-tracing output.

Every modeled interaction point is required to be in the declared region (inclusive coordinate tolerance 1e-10 m), including the channel-dependent reflection bounces. This conservatively applies even to channels whose fitted gain is zero or very weak. Eqs. 19 and 21 explicitly define their point sets inside V, and Eq. 23 intersects those sets for each channel. Whether invisible channels can be exempted is not explicit in the paper. This all-channel restriction is a declared modeling assumption; it can exclude a physically plausible plane whose unobserved continuation leaves the region. The bounds use candidate geometry and the declared region, never truth visibility.

Reference delays remain fixed during spatial sweeps. Failure to see or separate a path at the reference channel can therefore invalidate the spatial result. The implementation does not silently use another reference or borrow true delays to fix that failure.

Noise is seeded independent circular complex Gaussian, calibrated to the unblocked scene's mean power. Blocking a path leaves noise variance unchanged. Both nominal and realized received SNR are recorded. A constant gain per observed path is used in the generator, with hard finite-segment visibility; the estimator fits complex gains independently at all receivers.

Per-channel complex gains absorb any frequency-independent carrier phase. Geometry discrimination therefore comes from broadband phase slopes and their variation across the aperture. A single-tone inverse problem is explicitly refused. Tone spacing determines delay aliasing: configurations whose declared delay-search bound reaches another alias class are refused. Use more tones, less bandwidth, or an independently justified shorter absolute-delay prior. The code never centers this prior on the simulated true delay.

The acquisition guard supports a uniform tone grid and commensurate subsets whose smallest observed separation is the base grid step, including the supplied held-out-tone pattern. Other frequency patterns are refused rather than silently treated as unaliased.

No two-bounce search, high-bounce fallback, automatic path-count selection, electromagnetic diffraction law, unknown clock synchronization, frequency-dependent gain, or real measured-channel ingestion is implemented. An unlocalized initializer state may be retained if no searched geometry improves its fit. This is explicitly recorded rather than mislabeled as a physical location.

## Validation and honesty

The verification report separates noisy-data fitting residual from truth-only clean-channel NMSE and geometry error. Evaluation matches paths by reference delay using a partial assignment with dummy unmatched nodes and a fixed 0.5 ns evaluation tolerance. Estimated mechanism labels never determine association. Absent paths and extra noise-fitting estimates remain unmatched.

All seeds are retained. The narrow-band and reference-blind examples are expected failures. Small-aperture examples expose incorrect mechanism labels despite good channel fits. A lower training residual alone does not establish correct mapping.

The optional visibility threshold is a matched-filter noise heuristic, not a detector specified by the paper. It does not feed truth or a known mask into fitting. The conditioning diagnostics describe linear gain rank conditional on geometry; they do not prove geometry or mechanism identifiability.

Held-out validation fits geometry and gains on 48 frequencies and predicts 16 unseen frequencies. Held-out receivers are not claimed: their unconstrained gains have not been learned, and predicting them would require a new prior.

## Implementation choices versus source

DESIGN-AUDIT.md documents the source-to-kernel mapping and apparent formula ambiguities. This implementation explicitly normalizes the normal direction before mirroring and uses a parametric ray for physical intersections. The two-bounce Eq. 17 ambiguity is documented but does not enter this one-bounce code. The active-path beta=1 residual allocation, gain profiling, initializer details, angular refinement, and convergence tolerances are declared numerical choices where the source does not supply a complete executable recipe.

## Files

- gc_sage.py: estimator and geometry/least-squares primitives
- experiments.py: independent simulator, evaluation, single-run CLI
- test_reference.py: deterministic numerical and failure checks
- verify.py: complete bounded experiment runner
- fixtures/geometry-and-gains.json: small independent mathematical fixtures
- fixtures/default-observations.json: actual noisy observations and declared priors, without truth
- fixtures/default-expected.json: separate expected numerical outputs for port verification
- results/: full run evidence, including all failures
- VERIFICATION.md: readable results and scope boundary
- DESIGN-AUDIT.md: technical design and paper audit

For a browser port, use the Python results as an oracle for the declared numerical kernel, not as hard-coded display values. Execute the inverse algorithm in the browser and preserve its failure states, same-data comparison, explicit extra reflection-search cost, and truthful convergence status.

Use the exported observed-data fixture for cross-language matching. A different browser random generator will not reproduce NumPy's PCG64 samples merely by receiving the same integer seed. Either implement the same generator or document a different generator and validate the solver against the common observed-data fixture.
