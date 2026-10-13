# Near-field research lesson: source and evidence boundaries

Local integration, 2026-10-12. The [canonical lesson](../near-field.html#research-experiment) adds a bounded research chain to the existing page. The [one-way noiseless curvature prerequisite](../near-field.html#experiment) and its old array budgets remain separate. No actual browser or publication result is established by this document.

## Fixed source and assumptions

[Near-Field Integrated Sensing and Communications, arXiv:2302.01153v5](https://arxiv.org/html/2302.01153v5), dated 2025-09-23, is the source edition. [Equations (20)–(21)](https://arxiv.org/html/2302.01153v5#S3.E20) supply digital SDR and recovery; [Appendix A](https://arxiv.org/html/2302.01153v5#Sx1) describes MUSIC and [Appendix B](https://arxiv.org/html/2302.01153v5#Sx2) the four-parameter Fisher calculation. The exact inspected PDF SHA256 is c4dea3caec6495d08a1c0fba56d13ca9f9c9372173ccac053fbff46b8f2fa4b1; HTML SHA256 is c58b64619745d4b1dca72de9c07aca1869553adfa78ace577f02ef1cc532fdd1. Neither source PDF nor private extracted full text is redistributed.

Research array: N=65, D=.5 m, wavelength .0107 m, K=4, fixed T=256. Source nominal range/angle is 20 m/45°, with angle from positive array x, derivative units in radians. T, beta=1e−5 exp(.37j), random-user realization, proper-complex noise seed, DFT component sequences, Cartesian search domain and refinement are explicitly added assumptions. The legacy N65 array instead has .32 m aperture and .01 m wavelength.

Communication retains hᵀp. The literal-v5 pathloss convention sqrt(rho0)/r with rho0=lambda/(4pi) is disclosed rather than silently corrected to Friis. Radar retains Y=beta a aᵀX+Z and an unknown complex gain. The source objective remains range variance in m² plus angle variance in rad²; converting display to degrees does not alter that objective. Total numerical dual gap does not relatively certify the small angular term. Known-X CRB and covariance-only MUSIC do not have the same information.

## Frozen computation and independent evidence

The actual chain solves the bounded source SDR, recovers communication/sensing factors, realizes finite X, constructs actual noisy Y, and runs truth-blind MUSIC through actual module Workers. In the source case X is 65×256, F is 65×18, and S is 18×256; the spatial rank upper bound is 7. Eighteen factor columns are not spatial rank. The adapter neither truncates rank nor clips eigenvalues. Source factor clipping remains disclosed and must pass covariance reconstruction.

The accepted isolated chain records 35 author groups, 235 independent NumPy physics checks across nine complete raw datasets, and 101 independent actual Node Worker/lifecycle/codec groups. Its 22 frozen runtime/metadata hashes are in the [evidence map](../data/nearfield-research-evidence-map.json). All ten upstream solver/MUSIC modules remain unchanged. These counts are prior independent chain evidence, not browser tests or a new claim that every input in the supported envelope is validated.

Numerical acceptance is tolerance-qualified. Solver caps, initialization failures and timeouts are not physical infeasibility. Retained realized position errors include 1.237 m, 21.072 m and 33.448 m, plus boundary cases. One failed refinement start, weak separation under noise-only data and 100 endfire ties remain visible. These are individual errors, not RMSE. Completion is not target detection, accuracy, range identification or global uniqueness.

A full replay contains actual X/Z/Y and factors. Imported solver claims remain historical until a fresh solve; raw audit and Y-only receiver rerun have separate acceptance. A diagnostic record has raw=null and downstream stages marked not_included, restores only retry inputs, and never fabricates missing samples. Grid/refinement comparison retains identical raw Y. Truth and beta are excluded from the receiver request. There is no fake plane-wave or repeated-trial operation in the controller.

## Optional source-free downloads

These are raw parts of the original archives, with no recompression or discarded failure cases. Download each archive's two parts and its manifest to the same folder, then run the [reassembler](../data/reassemble-nearfield-evidence.py) with the manifest filename. It verifies every part, reconstructs and verifies the original SHA256, and never overwrites a conflicting file.

- Chain: [manifest](../data/nearfield-live-chain-v1.parts.json), [part 1](../data/nearfield-live-chain-v1.zip.part01), [part 2](../data/nearfield-live-chain-v1.zip.part02). Original 13,411,301 bytes; SHA256 d9c9a822d2e4ebf34b4914c6586f30e06e329046bd0b559c23f51ed30766b0f7. 107 ZIP members: 106 manifest-listed files plus ARTIFACT-MANIFEST.json, preserving all failures, raw results, proofs and independent verifier
- Python reference: [manifest](../data/nearfield-crb-reference-v1.parts.json), [part 1](../data/nearfield-crb-reference-v1.zip.part01), [part 2](../data/nearfield-crb-reference-v1.zip.part02). Original 14,229,564 bytes; SHA256 565595aa32712f16676d8a1f36bb7bb5724050b4adfdc96723e6839113ccddce. 157 ZIP members: 156 manifest-listed files plus ARTIFACT-MANIFEST.json. The exact original portable archive is retained, including historical optimal_inaccurate and rate8/rate10 failures; this is not a count of the larger development/reference working directory

The whole ZIP is intentionally not a public route: reconstruct it from the verified raw parts. No archive, PDF, Python environment, remote service or network request is needed to start the lesson. The runtime has its own exact frozen modules; archive evidence does not replace fresh computation. Source archive manifests and scripts remain historical provenance and may include original local execution paths; they are not startup or deployment instructions.

## Open gates

Actual desktop/narrow-browser rendering, keyboard/accessibility, CSP, downloads/reimport and painted-result latency remain separate gates. Synchronous finite-X construction and auditing are bounded but do not establish UI responsiveness. This local source integration is not deployment. Original source figures2–4, hybrid Eq(22), the cited separately optimized far-field baseline, multi-target detection, coded QAM/BER, hardware, physical snapshot duration/energy and full-paper reproduction remain unestablished.
