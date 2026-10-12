# Independent live Procrustes model, Worker, UI and teaching review

Date: 2026-10-12. Independent read-only review of the numerical adapter, actual Worker/UI behavior and teaching boundaries. This report is not real-browser acceptance.

## Current result

**Pass for this model/Worker/UI-VM and teaching-source review: both numerical adapter defects and the teaching wording issues were corrected and independently retested.** The frozen solver hash remains `a844089a501bec61002fe8562f54314c04bc4f27b622033c3995052770b050c6`. This report reviews the live adapter and teaching/UI boundary, not another full audit of that solver.

Reviewed the canonical lesson and runtime files at the hashes below, using the source-mapped algorithm specification and teaching plan. Tests load the actual source directly.

Repeatable evidence in this directory:
- `independent-live-review.cjs`: separately written read-only review runner
- `independent-live-review-results.json`: exact hashes, individual cases and reproduction data
- `independent-live-review.log`: captured run output

Run: `node independent-live-review.cjs [source-or-compatibility-root] [output-directory]`. Omitted root resolves the repository or public root relative to the runner; omitted output directory writes the JSON report and log beside the runner. `WAVEFORM_REVIEW_ROOT` and `WAVEFORM_REVIEW_OUTPUT` are also supported. Source and compatibility layouts are detected without changing checks. CLI portability was separately exercised against a copied old-layout bundle with all 16 cases passing; this is not an aggregate build claim.

Final recorded run: all 16 review cases pass, including additional scale-invariance and teaching-boundary checks. One case independently builds and checks 20 new problems. A VM executes the real Worker script, its real imported modules and the actual UI script, using controlled message delivery. These are **not real-browser or deployed-network checks**.

## Findings and retests

### 1. Nonfinite baseline falsely certified: fixed and independently retested

Original adapter hash: `e92506e4b2a14030e591ee70dd0a3c6196b664b3c04d3ef67193102d669963ef`.

Reproduce with one antenna, one user and one sample:
- H = [[[1, 0]]]
- S = [[[-(2**511), 0]]]
- R = [[[2**1022, 0]]]

The frozen core correctly produced certified objective 0. The original wrapper returned `status: certified` while reference error, MSE and bound residual were Infinity; its covariance relative residual was reported as 0. Naively squaring the R norm overflowed, and reference fields lacked a final finite check. A smaller-scale companion case, R=[[[1e-200,0]]], was incorrectly rejected by an underflowed 0/0 covariance normalization despite passing the core.

The implementation owner changed the wrapper, without touching the core, to use stable norms and recursive finite checks. At wrapper hash `deddcb6f9aa3df28c0b3bb54ded12b69f74bfc408a4c37b8c1b5a2763bb51102`, independent retesting confirms:
- The overflowing-reference problem is explicitly rejected
- The actual Worker/UI path has no displayed result or enabled export afterward
- The tiny positive-power example now succeeds

### 2. Rate denominator silently overflows: fixed and independently retested

Reproduce on the same `deddcb6…` adapter:
- H = [[[0, 0]]]
- S = [[[Math.sqrt(8e307), 0]]]
- R = [[[8e307, 0]]]
- Solve, then evaluate the rate diagnostic at −2 dB

All returned solve fields are finite. p=e=8e307 and N₀≈1.2679145539688908e308 are finite, but e+N₀ becomes Infinity inside the ratio. The displayed diagnostic is 0. The scale-invariant answer is `log2(1 + 1/(1 + 10**0.2)) = 0.4718254664698813`.

Suggested file: `labs/waveform-design/waveform-live-model.js`. Compute the positive ratio with common scaling (and use a stable logarithm), or explicitly reject an unrepresentable intermediate. Recursive checks on returned fields alone do not catch this case because the wrong final zero is finite. The independent runner includes this regression. The owner fixed the adapter using a scaled denominator and stable log-domain evaluation. At final model hash `168d9c4c9a234b8331b9a4dbfbe3f1be9b77f0428458f151776ce1029a1fa8da`, the independent rerun returns 0.4718254664698821 versus the scale-invariant expected 0.4718254664698813. The test passes.

### 3. Teaching precision corrections: corrected and source-checked

Suggested file: `content/pages/waveform-design.html`:
- `#model` states β=0 gives I/4 and power 1 even though N and Pₜ are editable. State `(Pₜ/N)I` and constant power Pₜ; identify 4 antennas, Pₜ=1 and LPₜ=8 as the default example only
- Explicitly state L counts snapshots, with no sample interval or bandwidth, so the plot cannot supply seconds, metres or delay/Doppler performance
- `#intuition` asks the reader to select an answer but has no answer choices. Supply the prediction interaction or ask the reader simply to make a prediction
- Advanced-input help should disclose positive-definite/Hermitian R, relative Hermitian tolerance 10⁻¹² and the implementation conditioning ceiling <10¹²
- Qualify the β=1 singularity statement with N>1; N=1 is a supported case with R=Pₜ for all β

Final source reread and the added teaching test confirm all these corrections at page hash `a62c13253e3d0485d1dcd7a90f3c9aa3bc896deb13618d5942e76faa148ef309`. The general N/Pₜ/LPₜ ledger identifies the beginner values as an example, and the sampling-period/bandwidth boundary appears before Run. The page also cache-versions the changed waveform CSS.

## Independent checks that passed

- Direct, independently written complex Cholesky × first-N-row DFT construction matches the displayed reference on 20 new generated problems and an imported complex off-diagonal R with K>N. It shares H/S/R, dimensions, covariance and block energy; it does not use the optimal X
- Actual Worker code produces fresh solutions and distinct verified input hashes after separately editing H, S and R. Stored top-level X and nested previous records do not become optimization inputs
- Per-user powers and errors are individually averaged before the nonlinear rate sum. An unequal-user fixture distinguishes this result from pooled MSE
- Delayed old results and errors cannot overwrite newer edited inputs or a completed newer request
- Cancel, reset, paper-preset selection and pagehide terminate/reject pending work
- Repeated Run only counts the accepted current result; SNR and view changes do not create a Worker or rerun the optimizer
- Export uses the current input/result snapshot, round-trips H/S/R, and rejects unannounced edited text rather than exporting an old result
- Invalid JSON, singular R and nonfinite inputs produce errors, and valid input can recover without reload
- Core, source and Worker identity are recorded; the fixed-core digest is unchanged

## Source and interpretation check

Reviewed the locally retrieved fixed arXiv:1711.05220v1 source text against its PDF identity (`e79052feb8fd898002a71c9b1f20fd75cb757159b6e92071e97812e85b62d798`). Relevant source: §II Eqs.(1)–(7), §III Eqs.(8)–(15), §VI-A Figs.3–4.

The implementation correctly treats H as the direct linear map HX. Its polar Gaussian generator is unnormalized CN(0,1) and its QPSK samples have unit power. The paper preset supplies N=16, K=4, L=20 and R=I/16. The reference is a site-defined DFT teaching baseline, not the original source's ZF or directional radar optimizer. The page clearly separates a single fresh block from a whole Fig.3/4 reproduction, discloses the single-beam covariance as synthetic, and leaves weighted tradeoff/constant modulus open.

The source's finite-frame Gaussian-log expression is used with separate user averages. The page appropriately does not equate minimizing summed MUI with maximizing that nonlinear sum and labels the stored rate counterexample as offline evidence. It also separates spatial covariance from temporal ambiguity/estimation/detection performance and does not call the plot BER, QPSK mutual information or measured throughput. Historical 27-state evidence remains visibly separate from live results.

Historical citation-count/award claims were not re-researched in this narrow implementation review.

## Disclosed scope differences from the proposed teaching plan

These are acceptance decisions, not hidden solver errors:
- The UI and manual import share N≤16, K≤8, L≤64, rather than exposing the full frozen-core N/K≤32, L≤128 contract
- Both presets use unnormalized Gaussian H; the plan proposed a unit-row-norm beginner preset. The implementation visibly discloses its actual convention
- Import is JSON paste, not a file picker; “apply” also solves immediately
- Many generator parameters are directly editable instead of the plan's smaller preset-oriented control set
- The record carries a core SHA-256 and model version but not a separate SHA-256 for every UI/adapter asset

Do not describe the entire proposed plan as implemented without accepting or closing these differences.

## Reviewed identities before the timing-label follow-up

- Page: `a62c13253e3d0485d1dcd7a90f3c9aa3bc896deb13618d5942e76faa148ef309`
- `procrustes-core.js`: `a844089a501bec61002fe8562f54314c04bc4f27b622033c3995052770b050c6`
- `waveform-core.js`: `55abf9bda20cbe84bb63ae833b65b25e91137dac10832e31850f97f6fa6258a8`
- `waveform-live-model.js`: `168d9c4c9a234b8331b9a4dbfbe3f1be9b77f0428458f151776ce1029a1fa8da`
- `waveform-live-worker.js`: `f8f329dadd715c7f30a7eb8d33739d122258a3d1e652c68853093779e4b2bfe1`
- `waveform-live.js`: `d5752b5f520fcda875d7c1e30a4e2989a63e47ba46e6cfa60c6df9ae08fd1264`

## Remaining gates

This review does not replace a build from the eventual complete compatibility manifest, all repository regression gates, supported real-browser desktop/tablet/narrow-screen and keyboard checks, or verification of a particular deployed commit and its public Worker/resource bytes. No claim of those stages passing is made here.


## Integration timing-label clarification

The prepared-input timestamp ends after Worker response/input checks and before rendering. The controller now labels it Worker-response elapsed and exports that explicit scope alongside the unchanged compatibility field `endToEndMs`. It excludes input generation/parsing, plotting and download; it is not Run-to-displayed-result latency. No numerical core, Worker or model byte changed. The reviewed predecessor controller hash above remains historical evidence. Current controller SHA-256: `409c1c44769cf67470330da8d5229bc74aa9e7de1a374a627e8ea46fd29082d3`. The aggregate review and focused UI/export assertions cover this two-line clarification; actual browser timing remains a separate gate.
