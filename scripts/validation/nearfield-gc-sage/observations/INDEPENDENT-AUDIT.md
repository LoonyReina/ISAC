# Independent simulator/evaluator release gate

12 October 2026. PASS for the declared reduced synthetic GC-SAGE input/evaluation module. No numerical blocker found. Read-only review: no shared package or release repository files were edited.

Runtime SHA-256: `598f7eeb3c7a02a6a3b95c198a9c48d9b88f6f276eab422a6fb8d406600b496d`.
Integrated inverse core SHA-256: `fe96407e6a09c71aa141d75fecaf26d23e15bbc1514f30ed121262dbdfc3ceda`.
Both integrated runtime files are byte-exact to the shared audited artifacts in checkout commit `8f2af8460a57bf3faabd08e93fae94c8a33e8080`.

## Reviewer-run evidence

- 24/24 focused tests rerun successfully, including all 160 offered acquisition regimes, truth isolation, fixed reference 23, visibility/noise conventions, malformed/overflowing input, and actual shared-observation fits
- 5,000 additional reference-delay assignment cases agree exactly with SciPy minimum-cost padded assignment. Cases include arbitrary delay order/sign, absent targets, quarter-nanosecond ties, and continuous perturbations. Assignment never uses estimated mechanisms
- Six fresh generator configurations with additional seeds were checked against independently written scalar/vector geometry. Maximum clean complex-sample error 9.455e-15; unblocked-calibration noise-variance error 3.109e-15. All support masks and bounce coordinates matched
- Eight fresh actual fits (both methods on four configurations) were independently checked. Maximum measured-data SSE difference 2.729e-12; clean-channel NMSE difference 2.843e-14 dB; conditional minimum singular-value difference from NumPy SVD 4.788e-16. Both methods used the same observed bytes and initializer
- A 147,456-normal-draw sanity sample across 24 additional seeds had mean 0.0008325, variance 0.996163, fourth moment 2.98826, and real/imaginary cross moment −0.001828. This is a distribution sanity check, not proof of cryptographic randomness or perfect independence
- Fixed-acquisition normal/reference-blind cases retain exactly equal noise arrays. Blocking changes only the clean signal/support

Evidence is in `results/independent-audit.json`; the reproducible reviewer script is `independent-audit.py` (the original focused test run is recorded above).

## Source review

The analytic point and mirrored-transmitter reflection geometry, finite-segment support, circular-complex noise scaling and draw order are consistent with the declared model. The browser generator is separately versioned and does not claim NumPy PCG64 seed equivalence.

Reference receiver index 23 remains fixed, including the reference-blind failure scene. The left-anchored aperture changes reference position/viewpoint and finite support as well as aperture. Normal-scene support is 48/48 for the first three spans and 32/48 for the longest; blind support is the first nine receivers. This confound is disclosed in README, ledger and release lesson text. It must not be interpreted as an isolated aperture effect.

Nominal SNR uses unblocked two-path channel mean power. Finite support/blockage does not rescale or redraw noise. Realized received SNR is separately truth-labeled. Declared 55 ns prior, region, acquisition and fixed known L=2 are not selected using hidden truth.

The integrated worker imports only the inverse core and accepts only runId, observations, model and options. It creates one data-derived initializer and fits both methods against the same Y. Main-side evaluation happens after fitting; simulation truth and scenario labels are not transmitted into the worker. Display matched-delay power is calculated from Y with the correct conjugate steering sign and 1/P amplitude normalization.

Partial assignment uses padded unmatched nodes, including exact-threshold tie behavior; it does not force a label-compatible match. Undefined geometry stays null. Scattering-only mechanism scoring is correctly marked inapplicable rather than graded as a failed reflector classifier. Optional gain-power visibility threshold is off by default and explicitly simulator-known-noise/heuristic. SSE is measured-data fit error; clean NMSE and mapping errors are distinct truth-only metrics. Visible-interaction RMS does not pretend to estimate finite-segment endpoints.

The perpendicular-normal line-offset correction is geometrically justified: absolute distance uses the original unit normal. Multiplication by sign(0) in the old reference evaluator would erase the normal and incorrectly produce zero distance. The change is explicit, tested, and does not alter estimation.

## Author evidence inspected, not relabeled as reviewer runs

Final-hash retained reports show 480 Python generator-oracle cases, 11 common-input evaluator cases (171 comparisons, maximum difference 5.684e-13), 1,296 SciPy assignment fixtures, and 640 actual fits over all 160 acquisition regimes and two budgets. No execution/monotonicity failure is recorded. Adverse scientific outcomes remain: only 29/80 normal/reference-budget cases have all hybrid labels correct, and all 80 reference-blind cases have unmatched estimates despite convergence. These heterogeneous single-seed counts are not statistical accuracy estimates.

## Boundary

This closes the numerical input/evaluator gate for known-L2, 2-D, one-bounce synthetic observations with the declared reduced inverse core. It does not establish full-paper experiment reproduction, field-data accuracy, independent-aperture causality, unknown-order/clock recovery, browser latency, cancellation or rendered UI correctness. Existing browser QA remains a separate gate.
