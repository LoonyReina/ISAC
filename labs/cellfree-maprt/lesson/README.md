# 多站MAPRT与有界CCP教学交互

## Scope and identity

The independent page `cellfree-maprt.html` deepens the same canonical `arxiv:2305.12523v2` paper identity. The older `distributed-detection.html` scalar/two-station marginalized LRT prerequisite is unchanged. The lesson is a reduced conditional implementation, not a full-paper reproduction or a global-performance claim.

The runtime's nine executable modules are vendored byte-for-byte from independently accepted executable manifest SHA256 `4614ef3d375be7185cf32759a4e00638ee0a2db091cce57b62bc7268ff07f9e5`. See `../runtime/RUNTIME-MANIFEST.json` and `../runtime/INDEPENDENT-REVIEW.md`. The Python reference manifest remains `30a8e28487ddce0542d767482e02b6eb6af9397a5b69187071f5507cd8e774a5`.

`adapter.mjs` projects the actual returned arrays into single-trial teaching views. It uses the vendored Cholesky/MAPRT factors to recover the two nuisance fits, prior/residual cost components, induced covariance, actual coherent components, and signed coordinate contributions of the true quadratic-form operator. It does not implement another power optimizer or generate demonstration curves. The signed coordinate contributions are explicitly not eigendecomposition.

## What the controls really do

Every numerical input is a new whole-pipeline run. Current bounded inputs are RCS, clutter covariance multiplier, UE SINR target, common AP cap, fitted/independent holdout sample count, calibration/evaluation count, target Pfa, and seed. Seed changes both the synthetic scenario and trial draws. The lesson does not claim a more granular calibration-only/evaluation-only cache. Uniform RCS scaling leaves the mathematical optimum allocation unchanged, but each requested run still executes the bounded numerical solver.

The runtime solves communication minimum power and three predeclared starts for each of ISAC/ISAC+S. It selects the highest source sensing-SINR only among accepted converged starts, retains every failure and iteration cap, and calculates detections only for available allocations. Both detectors see identical observations within an allocation; allocations share raw latent draws but have different observations. The supplementary cap-saturated communication baseline is explicitly not a source-paper baseline.

Current fitted and independent holdout constraints, actual finite-symbol energy, expected total power, zero selected sensing power, surrogate/Pd ordering reversal when observed, and all failed restarts are visible before the detailed panes. The earlier Python reference's zero dedicated sensing power, every-allocation holdout violations, unequal used power and reversed ordering remain in the main static narrative even when a new realization differs.

## Interaction and records

- Default is paused and uncomputed; no automatic worker or animation
- Changing a numerical draft terminates active work and clears the old record
- View controls select actual arrays without changing any detector input or aggregate statistic
- Cancel, reset, page hide, visibility hide and history navigation terminate the worker and fence late messages/files
- Duplicate Run/Replay actions do not create overlapping tasks
- Complete current JSON includes all runtime matrices/raw latent arrays, scores, decisions, counts, intervals, scenario and optimizer traces; failures can also be downloaded
- CSV is a counts/energy/holdout summary, not a replay replacement
- The selected teaching decomposition is a separate JSON with receiver outputs and generation-truth compartment
- Imported JSON is untrusted historical evidence and never becomes a current successful result; it can receive a bounded detector-only consistency check or explicitly launch a fresh whole-pipeline run from validated settings
- Detector replay is not cryptographic authenticity, scene-regeneration validation, or independent optimization-certificate validation
- Text is inserted with `textContent`, not interpreted as HTML; imported data is not executable
- 64 MiB JSON input cap is checked before file read; main-thread reading/decoding/encoding can still be expensive, and the cap is not a whole-device memory limit

`reference-summary.json` is an exact copy of the accepted design's read-only 64-cell/6-restart selected-reference summary. It is only fetched by an explicit history-summary button. The fresh runtime never reads it.

## Portable verification

From the authoritative source checkout:

    node --test labs/cellfree-maprt/lesson/tests/*.test.mjs

Tests use actual runtime numerical execution and an actual Node dedicated Worker through a minimal `self` adapter. A first-party lightweight DOM/event harness executes the production UI handlers. This harness is not a browser, layout engine, accessibility audit or proof of browser responsive cancellation.

Current coverage includes fractional fresh settings; all displayed posterior cost identities; signed Q contribution sum; AP/SP same-y and allocation-different-y invariants; complete codec replay; histogram and paired-count denominators; all six restart views; actual production download content; untrusted malformed/oversized/mutated/late import; repeated submits, cancellation, edit/reset and navigation fences; runtime hash identity and separate historical evidence.

## Explicit remaining release gates

This handoff has no global registration/compatibility-manifest edits and does not publish a site. Integration must add explicit public paths and register the separate experiment under the same paper identity, preserving all prerequisite URLs. Only then run the canonical isolated reproducible build with expanded tests.

Actual served-browser module loading, desktop/tablet/narrow layout, keyboard/screen-reader behavior, real native saved downloads, browser memory/latency, cancellation at each numerical phase, deployment commit and live URL verification remain unperformed here. Node/DOM checks do not satisfy those gates. No cloud-localhost tunnel or unsupported browser fallback is used.

The design's larger proposed 16384/8192 trial budget is historical Python evidence; the live runtime deliberately uses smaller independently accepted bounded budgets (128–2048 calibration, 64–1024 evaluation). Arbitrary geometry, source-size deployment, independent domain-resampling controls, full eigenmode decomposition and manual amplitudes are not implemented and have no fake action buttons.

To capture the actual production-handler download text and independently check the selected-trial teaching decomposition with NumPy:

    node labs/cellfree-maprt/lesson/tests/export-records.mjs /your/new/output-directory
    OPENBLAS_NUM_THREADS=1 python labs/cellfree-maprt/lesson/tests/adapter-oracle.py /your/new/output-directory

The oracle independently solves augmented complex least squares and direct covariance inverses for AP/SP × H0/H1; it does not use the JavaScript fit or score as its expected answer. This is separate-method evidence by the lesson author, not a substitute for independent reviewer acceptance. The complete current record also carries a descriptive lesson provenance section with runtime/reference/paper identities, dimensions/axes, units and score convention; those fields are not authentication.
