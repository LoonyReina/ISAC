# Networked synchronization: source and evidence boundaries

This document records local integration of a bounded, source-derived reciprocal MIMO-OFDM receiver. The existing [scalar clock lesson](../network-clock.html) remains a separate prerequisite. The same fixed paper identity is reused: 35 primary-paper identities, zero full-paper reproductions. Historical numerical reviews, newly checked archive identity, lesson integration and actual-browser acceptance are separate evidence scopes.

## Fixed source and operational reconstruction

Lin Chen, Yifan Liang and Hongbin Li, [Joint Synchronization and Sensing in Networked ISAC via Structured Canonical Polyadic Decomposition, arXiv:2607.18680v1](https://arxiv.org/html/2607.18680v1), 21 July 2026. The audited PDF SHA-256 is `e8da91552c32d61dd40cbc3c0224c7b654df04e9a4c3e85c0781d58f66853f02`. No private PDF, extracted full paper text, source figure or copied restricted CP-VDM implementation is redistributed.

The [source audit](../scripts/validation/networked-sync/SOURCE-AUDIT.md) distinguishes verified formulas from missing simulation choices and notation ambiguities. The receiver follows Eqs. 1–5 and 16–27, Algorithm 1, the source-derived smoothing equations 29–35 and Appendix-B ESPRIT-LS. It consumes two actual noisy complex observation tensors, known pilots, known rank and declared configuration. The antenna/subcarrier/symbol axes, ordinary transmit steering transpose, opposite reciprocal delay/CFO signs, complex gains and noise are retained.

Radians/sample, C-order unfolding and standard `U Σ Vᴴ` conventions are declared operational choices. The first `Vᴴ` row represents the ESPRIT temporal factor; an extra conjugation would reverse its Doppler sign. The fixed source convention uses ν_src=+dL_src/dt/λ with a positive slow-time exponential. Saved source velocity vectors are retained; v_phys=−v_src is the explicit conversion to the conventional negative-path-derivative convention. Displayed/exported ν_src is not silently flipped. This source-defined Doppler sign is not a universal RF convention. These interpretations do not identify the unpublished author implementation.

The initializer is a three-axis 4×8×5 smoothed CP variant, not the exact author CP-VDM benchmark. Each structured mode update solves unconstrained complex LS by direct SVD and then projects its columns onto continuous Vandermonde factors. The fresh JavaScript projection uses golden-section refinement within the FFT local-maximum brackets; that is an explicit adaptation from the Python bounded optimizer. Euclidean projection of the unconstrained solution need not solve the exact constrained tensor-LS subproblem. No monotonicity or global-optimum guarantee follows.

Vandermonde single-tone equations describe the structured model, not every baseline's actual noisy estimated columns. ESPRIT builds B from the subcarrier phase but obtains A/C from rank-one SVD vectors of the reshaped A×C product; those vectors need not be exact single tones. Ordinary ALS columns are likewise unconstrained. The lesson shows those actual estimated arrays rather than forcing all baselines into the structured formula.

## Frozen identities and independent evidence

The [machine-readable evidence map](../data/networked-sync-evidence-map.json) contains every archive member's exact path, byte count, SHA-256 and CRC-32, all seven runtime hashes, copied-report hashes, scoped numerical counts and retained failures.

- Accepted Python core: `88a161d7d7d55ad4a2e703b0afb590c69644b0c61eaf370c2f6f519fc650f10e`; reference freeze: `94f0c92acb978981a0fe5d4891fe95acb5d8ce557f5b92ca6a84dc9d2637e3ab`
- Seven-file JavaScript/Worker source freeze: `2e74d10363e2d2feac9a06ec0c061c9d8059345023a3274c530a30f02728018b`; full artifact manifest: `6cfb8514a1787ef6f007be39258870c423cc2887776ada7ec25b5b97f116af25`
- Final [independent port review](../scripts/validation/networked-sync/INDEPENDENT-PORT-REVIEW.md): SHA-256 `70ae8839b1a60ba0112091bf2bccf53c561c113e18ed63eb0091378506222fc1`

Copied reviews retain their original bytes and dates. Copying is not a new numerical replay. Packaging-time metadata that says the port review was pending remains unchanged; the separately linked final review supplies the later bounded acceptance.

The [independent Python review](../scripts/validation/networked-sync/INDEPENDENT-NUMERICAL-REVIEW.md) checked 19 owner and 11 independent tests, all 432 pair trials, 1,296 method evaluations, 4,722 structured substeps, 864 shared-initialization checks and 18 selected method/pair reruns. The [full-trial receipt](../scripts/validation/networked-sync/independent-reference-full-evidence.json) preserves the exact counts and errors. Direct observation reconstruction is independently indexed; exact hash regeneration separately reuses the frozen deterministic generator. One actual six-stage, twelve-column exemplar additionally verifies complete LS/correlation data.

The independent JavaScript review checked 15,539 structural and ordinary-case assertions. Original dimensions 10×36×20 are exercised at known ranks 1–3; compact 6×12×8 cases add noise, wrapping, duplicate paths, zero data, tiny scale and near collision. It reconstructs all 246 structured and 312 unstructured A/B/C substeps, all 504 actual projection columns and 116,736 saved grid points, twenty initializer chains and twenty ESPRIT chains. Independent evidence also covers 100 convention assertions, 378 evaluation assertions and the full 160×3248 complex Hankel materializer (8,314,880 bytes). These arrays arise from actual intermediate computation, not a display inferred from the final answer.

The owner's separately replayed 11,121 fixture checks, 22 kernel tests, 25 algebra contracts, 500 rank-deficient cases, 145 NumPy comparisons and 90 evaluator cases are additional owner regression evidence. Passing them does not erase the independent adverse case below.

## Failures and denominators remain visible

The independently generated severe rank-three near-collision case fails tight individual-phase parity: about **3.2003e-4 rad versus a fixed 8e-5 rad criterion**, on weak nuisance components around 1.5e-4 amplitude. The [numerical receipt](../scripts/validation/networked-sync/independent-port-numerical.json) explicitly retains `all_cases_phase_parity_passed: false`. The input and threshold were not changed to pass, and truth was not used to repair the result. Ordinary-case maximum phase difference is about 1.13e-7 rad; near-collision tensor agreement around 3.59e-7 relative does not certify individual paths or clocks.

The [bounded reference outcomes](../scripts/validation/networked-sync/REFERENCE-RESULTS.md) use original dimensions, ranks 1/2, SNR −25/−10/+5 dB, twelve scenes per rank and six pairs per scene/SNR. The 432 pair trials are 24 independent scene clusters, not 432 independent geometries. Each rank/SNR cell has 72 pair trials from twelve scenes. Source-defined SNR is pre-beam reflection-coefficient energy/noise; received SNR is distinct.

At −25 dB, SCPD passes the source geometry filter in **37/72 rank-one trials and 9/72 rank-two trials**. These are source-derived experiment results, not reproduced paper curves. All 72 rank-two low-SNR trials have the separately defined gross-error flag, including the nine geometry passes. Missing reflection-gain, beam and initialization details remain unresolved; no single choice has been shown to explain the source-curve gap.

All 864 source-reference SCPD links meet the relative-residual stopping test, while 64 complete sweeps and 283 projected substeps increase residual. Fresh port probes likewise retain nonmonotone updates and local minima: one structured random start ends near residual 19.25, versus 7.94 for same-start unstructured ALS and about 8.13 for other structured starts. No hidden restart, best-iterate restoration or truth-selected start is claimed.

Geometry success only tests estimated bistatic range against baseline. A fresh low-SNR SCPD case passes it with CFO error about −3,283 Hz; smoothed and unstructured estimates also pass with errors about −13,763 and −15,874 Hz. A deliberately wrong-clock evaluation passes geometry with +10 µs timing error and +100 kHz CFO error. The extra gross-error diagnostic checks CFO, delay and angles, not clock offset: timing-only error can escape it. Explicit offset errors, all-solved errors, success-conditioned errors, denominators and numerical failures remain separate. Exact half-period clock/CFO aliases, phase-wrap errors and degenerate failures are retained without truth-assisted unwrapping.

## Truth, comparisons, traces and resources

Truth is confined to generation and post-hoc evaluation. It never feeds estimation, cross-link association, stopping or branch selection. Held observations without truth have no truth/error metrics. Smoothed CP, SCPD, ESPRIT-LS and unstructured ALS use the same actual pilot-divided tensors; SCPD and ALS share the exact initializer. Estimator timings include initialization, with its component time separate, and exclude generation and reciprocal extraction.

Full traces contain actual preprojection LS columns, sampled correlation grids, refined candidates, factors and residuals. Summary peaks cannot supply a projection landscape. The reference exemplar's normalized correlation is `rho=|vᴴz|/(sqrt(Q)||z||)`; raw peak power is `|vᴴz|²=Q||z||²rho²`. They have different scales. Importing a saved record is historical replay; explicitly processing its verified observations is fresh computation. Neither label certifies numerical success.

The [independent Worker review](../scripts/validation/networked-sync/INDEPENDENT-WORKER-REVIEW.md) includes 41 owner codec/Worker tests, 28 independent groups, 10,000 actual session controls with request 10,001 rejected, and five production cap probes. It retains corrected snapshot, async lifecycle and direct-object validation defects. Actual Node Workers exercise cancellation, accepted-only supersession, terminal fencing, history import/export/recompute/release and recovery; browser-loader execution in a Node VM is not browser acceptance.

Original-shape rank-three, full-20-sweep local Node probes reach 20,333,528 bytes of result-event JSON and 29,943,857 conservative preflight bytes. These are measured cases, not peak-heap bounds or browser timing. Full histories can consume substantially more memory than raw tensors. The 64 MiB codec record budget is separate from dimension/vector bounds. Fresh results are not explicitly preflighted before hold/send; tested cap probes found no violation. The 120-second limit is cooperative at checkpoints, was not run to expiration and is not hard preemption.

## Optional exact offline archives

All three archives are optional downloads, never startup data. Their bytes are copied unchanged, without recompression:

- [Python source-free reference](../data/networked-sync-kernel-v0.1-sourcefree.zip): 8,368,985 bytes, 35 members; SHA-256 `0d801fd2dfa7da281772da48c33c5bd6f1e8c781a4004bbef4eac1f4c538f25a`
- [JavaScript runtime](../data/networked-sync-js-v0.1-runtime.zip): 49,243 bytes, 13 members; SHA-256 `466520c86dfd7c45e0a14f82f4048267ca20e0fbaddf14de9e4ccd6eb9ac2e13`
- [JavaScript full evidence](../data/networked-sync-js-v0.1-full-evidence.zip): 4,267,688 bytes, 73 members; SHA-256 `75d8ed0e34c3b9f3a1d0881ce09ce012988fd56f342d5a25f7d3e42ed3cdbe91`

Local integration rechecked exact member sets against accepted manifests, every member's bytes/hash/CRC, ZIP CRC, safe paths, absence of symlinks/encrypted members and final copied-archive identity. All 121 members match. The allowlist contains original implementation/test code, factual audits and generated evidence, with no paper PDF/HTML/extracted-text or source-figure members. The bundled Python comparator is the byte-pinned accepted original reference, not copied restricted CP-VDM software. The map describes this finite provenance check, not generic security certification.

## Remaining gates

Actual browser loading/CSP/MIME, rendering, responsive layout, keyboard/screen-reader behavior, real Worker lifecycle, export/reimport, browser latency/heap and painted-result timing require separate acceptance. This source/evidence task performed no browser, remote or publication action. Exact author CP-VDM and SOE-MP, full paper curves, global network-cycle synchronization, Algorithm 2 tracking/adaptive beams, time-domain ICI/ISI, CRB attainment, RF measurements and full-paper reproduction remain unclaimed. Publication is separately gated.

## Exact local lesson acceptance

The [independent lesson review](../scripts/validation/networked-sync/INDEPENDENT-LESSON-REVIEW.md) accepts lesson freeze `02fd81f54deb5c8a0ef03856565d5f042558a5d8913cc392a2c389275251f807` in its bounded Node/controlled-DOM scope: 49 owner tests, 31 independent lifecycle/codec groups, 1,960 UI/data assertions and 2,245 Python replay checks. It verifies 22 actual UI downloads. The severe-collision strict phase failure remains: about 2.8721e-4 rad with independent raw/pilot division and 3.2003e-4 rad on the identical saved divided tensor, both above 8e-5 rad. Fresh low-SNR geometry-passing wrong clocks remain visible; no universal phase parity is claimed.

The final exact-freeze original-shape rank-three, full-20-sweep, oversampling-32 Node UI/Worker/export probe produced 568,186 raw bytes, 25,071,659 history bytes and approximately 769.85 MiB process RSS highwater. These are individual host observations, not browser measurements or universal memory limits. Actual browser layout, accessibility, CSP/MIME/Worker loading, navigation, device latency and publication remain open.
