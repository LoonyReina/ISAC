# New rebuilt channel-mapping core teaching acceptance

Date: 2026-10-20 UTC

Paper: Experimental Characterization of ISAC Channel Mapping and Environment Awareness

Paper ID: `channels-sensing-communication-mapping-2026`

Candidate: `recovery-20261020-1930/rebuilt-channel-mapping-v1`, scientific CORE-FREEZE-v2 and UI-BUILD-FREEZE-v3.

## Decision

**A — PAPER_CORE_TEACHING_COMPLETE, for the newly rebuilt local implementation. Confidence: medium-high.**

The calibrated-power-scan → inferred scatterer groups → bistatic-delay prediction/communication association main task has a source-mapped implementation, a representative fair task experiment, and meaningful actual adjustable teaching. Local core teaching has therefore been rebuilt and newly accepted. This is not exact recovery of the lost source, observations, experiment results, or screenshots. None of those old numerical/browser artifacts are inherited as evidence for this decision.

This decision concerns this paper only. It does not change the historical project count of 19/35, recalculate that count, add a twentieth paper, or establish restoration of the other eighteen accepted papers. Main-site integration, whole-site regression, GitHub Pages publication and deployed-page verification remain separate and pending.

**An important failed check remains failed:** the independent study audit's complete strict browser/Node parsed-value equality check is FAIL. The new final verdict does not rewrite that result. Its scientific relevance is assessed explicitly below using the retained files, the pre-existing numerical tolerance, and exact decision/output comparisons.

## Standard applied without shrinking or expanding it

The user's established standard requires the main central-task algorithm chain, a representative task-level experiment with fair comparison, and genuinely adjustable teaching that actually runs. Equations alone, a prerequisite component, reading notes, unit-test totals, or a clickable page are insufficient. Scaled synthetic experiments can qualify when they preserve the research problem and honestly disclose their limitations. The standard does not newly require all figures, author hardware, measured data merely because the paper used measurements, or cross-engine bit-exact floating-point equality. Local teaching completion and publication are distinct dimensions.

The earlier acceptance report is scope/history only. It is not evidence that the rebuilt implementation works. The evidence below was produced for the new portable-v2 generator and frozen new JavaScript core.

## 1. Centrality and mathematical fidelity

The [fixed primary paper](https://arxiv.org/html/2601.18558v1), §3.1/Eqs.1–2 and §3.2/Eq.3, establishes the scan-derived scatterer-map to communication-MPC geometric-delay linkage. The implementation starts with calibrated scalar-power scans rather than supplied object coordinates, extracts peaks, maps the two opposite-facing stations, infers anonymous groups, predicts bistatic excess delays and compares them with communication observations. This closes the selected central task, not merely a convenient equation or scan-filter component. The paper's further physical/RCS characterization in §3.3 is not claimed.

Reviewed `src/config.mjs`, `geometry.mjs`, `inference.mjs`, `generator.mjs`, `evaluation.mjs` and `experiment.mjs`, plus `SOURCE-AND-BOUNDARIES.md` and `INTERFACES.md`:

- Source default gates are −55 dB, 2.2 ns separation, 0.5 m range and four peaks per angle. Round-trip range is cτ/2; station-2 x direction is reversed while both y components use negative sine. Eq.3 subtracts station separation from the two-leg distance, with consistent ns conversion.
- Absolute calibrated monostatic delay and LoS-relative communication excess delay are distinct input declarations. An uncalibrated strongest-path-normalized PADP is not silently interpreted as absolute range.
- Plateau choice, tie ordering, connected-component grouping at 0.45 m, strongest representative per station, equal station averaging, and unique-candidate-only association are openly declared reconstruction choices. They fill operational details not specified by the source, rather than substitute for a specified author clustering algorithm. They must not be advertised as author code.
- This rebuild is not byte-identical or convention-identical to the old implementation: its public portable FNV-1a/LCG32 generator, plateau/group conventions and 0.6 m evaluation gate are newly declared and tested. Equal seeds do not mean equal old and new observations.
- Inference consumes only validated observations and the inference-configuration whitelist. It imports neither generator nor evaluator. Evaluation receives physical identities/coordinates afterwards, cannot repair inference, and counts a unique choice for an intrinsically nonidentifiable path as unjustified even when the hidden label coincides.
- Shared grouping can transitively join different objects; anonymous groups are not semantic wall/plate recognition. One-station paired-range predictions are unavailable rather than fabricated.

The observed source chain and declared reduced task remain central under the established standard. Presence of explicitly disclosed operational choices alone is not a reason to demote a completed task to a mere component.

## 2. New independent correctness evidence, with its limits

These are supporting correctness checks, not the sole acceptance basis:

1. `channel-oracle/outputs/validation-result.json`: eight new independent-reference tests passed. The ninth historical captured-fixture identity check remains BLOCKED because the old three raw fixtures are unavailable. It is neither passed nor silently discarded. This blocks a historical byte-parity claim, not evaluation of a separately identified new implementation.
2. `channel-oracle-differential-v2/FINAL-RECEIPT.json`: separate Python-reference versus JavaScript-generator comparison passed 216 integer states, 379,845 numeric values, 643 grid/midpoint checks and 45 configurations. Maximum numeric difference was 2.842170943040401e−14 under the predeclared 1e−10 comparison convention. The prior schema-metadata failure is preserved. These establish specification consistency, not independent physical measurement truth.
3. `mapping-science-review-v1/SCIENCE-REVIEW.md`: source review found a captured-truth validation defect in v1. Frozen v2 resolves it. Independent literal evaluator fixtures then passed 32 value/consistency assertions and rejected all eleven malformed-truth probes. The fixtures cover nonidentifiable/clutter safety, conditional coverage, null denominators and truth ordering. They are not described as a complete inference batch.
4. `mapping-study-independent-v1/independent-audit-result.json`: the independent Python audit re-extracts peaks from every retained scan row, reconstructs groups by full adjacency/BFS rather than the author's spatial-grid union-find, recomputes representatives/predictions/candidates, enumerates truth matching independently and recomputes metrics. All 36 raw study cases passed 1,308 top-level mathematical checks with exact discrete decisions and absolute-plus-relative 1e−10 finite-number tolerance. The overall combined status remains FAIL because of the separate strict browser comparison discussed below.

No independent reference, evaluator fixture, or audit count is relabeled as actual browser teaching evidence.

## 3. Representative new task experiment and honest negative result

The preregistered `mapping-study-v1/PLAN.md` and `PLAN.json` fix three scenes × seeds 101–112, noise 1, default gates and three branches before the single execution. The scenes cover separable objects, exact-delay ambiguity and a communication path whose physical object is absent from both sensing scans. This is a new experiment, not the lost historical run.

All 36 cases now retain full raw observations, truth, detections, groups/representatives, branch predictions, full candidate decisions and evaluation, with byte hashes. The old three-raw-plus-summary limitation does not apply to this new retention; the old evidence remains unavailable.

The coordinate and paired-range branches use identical observations, inferred groups and station representatives. The paired-range method still inherits angular information through grouping, so it is not an autonomous unpaired range-only competitor. Zero-angle collapse is explicitly destructive, not the fair baseline. Fair delay comparison uses the same matched group IDs with available predictions in both branches; smaller conditional RMSE is not used to hide unavailable predictions.

New results, independently supported by retained raw evidence:

- Both fair branches: 96 matched objects, 12 missed and no extras among 108 physical objects. They produce 72 correct unique assignments, zero false unique assignments, 24 ambiguous abstentions and 48 unmatched abstentions across 144 observations. Recall is 72/108 = 2/3, not 100%.
- Prediction coverage is 96/96 among matched objects, but only 96/108 among all physical objects. The twelve missing-sensing paths remain in the recall denominator.
- On the common 96-object support, pooled coordinate delay RMSE is 0.21370681514108475 ns; paired-range is 0.08529039893373835 ns. Paired-range is lower in all 36 cases; fair-branch candidate sets and association decisions tie in all 36. No coordinate-method superiority is established.
- The destructive branch has no unique assignments and an undefined/null false-association rate, not zero. Shared-group localization does not make its counterfactual coordinates accurate.
- All matched default-study groups have both stations. Single-station unavailability is covered by source/focused tests, not a new empirical performance-advantage claim. The experiment is not a broad robustness or all-geometry guarantee.

These task-specific outcomes, failures, fair support and full retention provide a representative experiment. Acceptance does not require arranging a favorable performance result.

## 4. Strict browser/Node FAIL: preserved and interpreted, not converted to PASS

The saved real browser download `mapping-browser-v1/export-v3-seed111.json` is 300,573 bytes, SHA-256 `ce2752b9bf1b9e1239b43adc786aa7a711f163ef78af321e7d9f0954d42235d1`. Its same-config Node pair is the retained separated/seed111 raw case, SHA-256 `1d199f5f8bca871030a7afea5f99919eacadd3467acbef3fda28fc71c577a392`.

The predeclared comparison demanded exact parsed numeric values. It found fifteen unequal numeric leaves. The original result remains FAIL, SHA-256 `76c2b28575ecf5e9876f014ac00419782e1766dc949d40d1fba3421bc34485e0`. The post-hoc appendix is a description of that same pair, not a replacement pass or rerun.

This acceptance reviewer recursively compared the original two files, not only the appendix summary, and confirmed:

- Nine observed scalar power values differ; five detection powers repeat affected observations; one non-representative detection x coordinate differs.
- Maximum absolute difference is 2.842170943040401e−14; maximum distance relative to the Node value is 3 ULP. Every difference is below even the absolute 1e−10 tolerance already documented in `INTERFACES.md`, without using its relative allowance.
- Configuration, physical/path truth, peak IDs/rows/bins/angles/delays/ranges, every row-stage count, the entire group records including representative values and centroids, all three full branch predictions and candidate signed residuals/statuses/assignments, and the entire evaluation object are exactly equal in this pair.
- No threshold, gate, seed, output value or failed artifact was changed to obtain these conclusions.

Therefore the strict failure is real but does not show a material scientific or teaching error in this checked pair. Numerical closeness plus verified exact downstream decisions supports this local teaching acceptance under the existing standard, which does not require bit-exact cross-engine math. This does not establish universal cross-runtime equivalence, nor identify a concrete browser/math-library/hardware cause. No blanket statement that all validation passed is permitted.

Evidence: `mapping-study-independent-v1/AUDIT-PLAN.md`, `independent-audit-result.json`, `BROWSER-NODE-POSTHOC-DIFFERENCES.{json,md}`, and this review's `RETAINED-EVIDENCE-CHECK.json`.

## 5. Actual adjustable teaching and current UI evidence

The current numerical modules run in a browser module Worker, using the same frozen core as Node. There is no Python `/solve` computation dependency in this rebuild. A local HTTP origin is used only to serve the static assets and modules. Main-site/GitHub Pages integration still requires its own work.

Source inspection of `src/app.mjs`, `worker.mjs` and the HTML confirms that scene, seed, noise, peak gates, cluster radius and association gate reach generation or inference. Edits invalidate old results and terminate pending Workers; request/revision/Worker identity guards reject stale responses. Group/branch/truth display controls do not regenerate observations. Reset and Stop clear stale results; export serializes the actual current complete result. These are not decorative controls.

Actual browser observations:

- `UI-v2-observations.json` records real default, ambiguous, missing, invalid-seed and empty-threshold runs and a saved empty-case JSON. It also preserves a genuine sticky-sidebar defect: mouse Reset was unreachable while keyboard Reset worked.
- UI v3 changes only CSS. Seven scientific files, event handlers, Worker and HTML remain byte-identical. `UI-v3-observations.json` records a fresh mouse Reset restoring −55/default computation, reachable inner-scrolling controls, Stop clearing and remaining stopped, explicit seed111 recomputation, display-only group/branch/truth inspection and the saved seed111 export.
- The same final record documents physical narrow innerWidth 536, clientWidth = scrollWidth 521, static narrow sidebar, actual mouse Reset and Worker output of 30 peaks/3 groups. No horizontal overflow is reported. These are not an emulated viewport or a claim of exhaustive race coverage.
- A separate new supplemental capture session persisted three unique actual JPEG image states: desktop scans, narrow scans and narrow controls. The acceptance reviewer viewed their actual pixels and verified their hashes, dimensions and JPEG decoding. Both scan panels/legend and narrow action buttons are legible. The fourth JPEG file is an explicitly preserved duplicate narrow capture, not another independent screenshot state.
- Desktop supplemental dimensions are 1166×747; narrow images are 521×736. The wide image shows an already-loaded result after static-server expiry, not a fresh wide-viewport recomputation. Root's earlier screenshots were tool-visible only; the new images do not manufacture persisted files for those earlier observations.

The real export, verified computation records, source-to-control routing, failure displays, linked selections and scoped desktop/narrow evidence together establish actual main-chain teaching. No new browser was launched by this acceptance reviewer. Exact mid-computation cancellation races, all browser engines, exhaustive accessibility, prolonged latency or every device size are not claimed.

## 6. Current remaining scope and delivery gaps

Not reproduced: original measured PADP/CIR, measured antenna or hardware calibration, real S1/S2 associations, semantic wall/metal-plate identification, source 3 mm wall result, RCS/Eq.4, physical waveform superposition or full paper. The MAX scalar-power envelope is a transparent phenomenological input model.

Not recovered: the old Python implementation, old random observations, old raw study and old screenshot bytes. The blocked historical fixture test remains blocked.

Not passed: complete browser/Node strict numeric equality. Its fifteen differences and failed result remain retained.

Not completed: unified site integration, whole-site tests, remote publication, deployed-page verification and recovery/acceptance of the other eighteen historically completed papers. Pure-static architecture alone is not proof of GitHub Pages deployment readiness.

No remaining material gap was found in the first three core-teaching dimensions within this declared synthetic central-task scope. Ordinary integration, regression and broader scientific extensions must not be mislabeled as already done, but they are not retrospective new scientific acceptance requirements.

## 7. Acceptance-review actions and exact artifact binding

This reviewer inspected the current core, live UI code, source boundaries, new protocol, independent correctness/audit methods and results, failed exact comparison and explanatory appendix, parent native interaction records, and three new screenshot pixel states. Historical evidence was used only to preserve scope and provenance separation.

A new small standard-library retained-evidence verification performed 2,566 assertions in 0.36431096499973137 seconds, peak RSS 12,128 KiB under a 128 MiB/30 s bound. It verified seven core files, 25 UI-freeze file entries, all 26 candidate checksum entries, all 49 study checksum entries, all 36 raw-case hashes, formulas/candidate gates/metric arithmetic and the exact browser/Node differences. It did not import or execute candidate modules, regenerate observations, rerun the numerical study, rerun the full independent extraction/group audit, alter evidence, launch a server/browser, upload, or invoke the user's Codex. Its PASS applies only to its stated checks and does not erase the original strict FAIL.

Bindings:

- CORE-FREEZE-v2.json: `227556e11219853dceb056afae47781ccb799db823193959b3e2489200ed4e49`
- UI-BUILD-FREEZE-v3.json: `3253b9576c3fd9384899c322a2b852128f0142669257845ef8c9a6e38b8bf1e9`
- Candidate SHA256SUMS: `87c4593dd057753aa87423a205ba1c67db2a19234d13d3eaa24e337e7a41d0bf`
- New study FILES.sha256: `5d167443e5a7a8f619ccfd4abccd09dc8e1708a079ca13a3c0b6908ead225e60`
- Strict independent audit result: `76c2b28575ecf5e9876f014ac00419782e1766dc949d40d1fba3421bc34485e0`
- Post-hoc JSON difference appendix: `b841149edd8ebfe662ab0eafe0ea9048a7ba4b14c3e795095524e3996974443b`
- Supplemental screenshot manifest: `20134ad9ce7d47c18710bc344f792316c0365bef6ba224429387ecb7aba302d7`

Paths above are relative to `recovery-20261020-1930/` or, for named validation directories, its `new-validation/` directory. This review writes only within `new-validation/mapping-final-acceptance-v1/`. `EVIDENCE-BINDINGS.json` supplies the full acceptance-time source list and hashes; `RETAINED-EVIDENCE-CHECK.json` and `UI-EVIDENCE-CHECK.json` preserve the reviewer-level verification outputs.
