# Synthetic sensing-assisted communication: validation and boundaries

Date: 2026-10-11. Case: `case-radar-beam-decision`. Page: `radar-beam-decision.html`.

## Scope and learning order

This is an original Chinese teaching model asking whether finding the exact best communication-beam label is the same as preserving communication power. It uses no DeepSense measurements, copied author code, trained paper CNN, source PDF, real-world imagery, or published performance arrays.

The first path is one synthetic observation, one trained recommendation, and one decision: probe the first K candidates of a fixed ranking. The learner sees the feature values and frozen recommendation before the evaluation-only 64-beam power plot. Three outputs remain separate: exact-label membership, loss after perfectly probing all K candidates, and K/64 equal-cost probe count. Selecting an observation does not retrain a model or change aggregate results. The example finder explicitly uses evaluation truth to select the lowest-loss K=1 label miss in the existing evaluation set. It never changes rankings or manufactures an example; if no miss exists, it says so.

Closed disclosures add aggregate statistics, the array/kNN equations, and a split experiment. The split experiment has fixed test anchors and matched training counts. It is interactive exploration of a toy evaluation set, not an untouched final benchmark. Seven neighbors and other hyperparameters are prescribed for the lesson; inspecting the results to choose a research model would require separate validation data and a protected final test set.

## Data, training and resource model

The generator creates 2,304 observations: three synthetic scenes, twelve passes per scene, sixty-four frames per pass. Each pass has a linearly increasing or decreasing true direction cosine with a small fixed origin jitter. This does not model an unseen spatial route or a future-frame forecast.

- M=16 half-wavelength ULA elements, aperture 7.5 wavelengths
- N=64 unit-norm beam vectors, equally spaced in direction cosine u between −0.95 and 0.95, not equally spaced in degrees
- Unit-gain, single-path narrowband channel; P[j]=|a(u)^H a(u[j])|², a(u)[m]=exp(jπmu)/√M
- True direction and powers are simulator/evaluation values; the predictor sees only three feature coordinates
- Features: `(u + scene_offset + run_offset + correlated_noise, w*scene_context, w*run_context)`
- Scene context is −1/0/1; run context is independently drawn once per pass and held constant
- Default scene offset scale 0.12, run offset uniform in [−0.04,0.04], w=0.18, noise marginal scale approximately 0.006 with AR(1) update ε[t]=0.8ε[t−1]+0.6σz[t]
- The zero-shift control removes both offsets but retains context; the neutral control removes offsets and both context coordinates while retaining correlated noise

The stable context coordinates deliberately carry group-identifying information. Excluding scene/run/frame IDs from the predictor is an interface property, not proof that the features contain no group fingerprints. None of this is evidence of real DeepSense leakage or a causal diagnosis of its results.

Every protocol uses exactly 512 training observations and the same 64 test anchors from scene 2, passes 8–11, frames 2,6,…,62. Interleaved-frame eligibility includes non-anchor frames from those passes, potentially earlier and later than the test frame; held-pass eligibility excludes all frames from those four passes; held-scene eligibility excludes scene 2 entirely. The held-scene construction deliberately extrapolates from the first two scene contexts to the last. These are different generalization questions, with no guaranteed score ordering.

`fitPredictor` captures only training feature vectors, training beam labels and fixed codebook/settings. It converts each training label to its codebook coordinate and stores the labeled examples. Prediction computes Euclidean feature distances, selects seven nearest training examples with stable index tie resolution, and averages their coordinates using weights 1/(distance²+10⁻⁶). It ranks the ideal array response at that estimated coordinate. There is no CNN, probability calibration or test-driven fit. Prediction results and their ranking arrays are frozen before evaluating test labels or powers.

The public core enforces physical direction cosines in [−1,1] and 1–256 integer array elements; a biased observed feature can be outside that interval because it is a proxy, not the true geometry. Scene/run/context scales are bounded to [0,2], noise scale to [0,1], and tie tolerance to [0,10⁻⁶]. Predictor vectors must be nonempty, dense and finite; malformed vectors and overflowing distance/weight computations are rejected. The UI offers the much narrower three documented presets, a fixed array/codebook, and seeds 0–99999.

The native JavaScript generator uses Mulberry32 uint32 uniforms, cached Box–Muller normal pairs, and partial Fisher–Yates sampling without replacement. A second seed `(seed+1009) mod 2³²` selects training members. The independent Python validator reimplements these rules. Seeds reproduce this implementation; they do not identify the same samples as the earlier NumPy PCG64 prototype or the paper.

## Numerical metric semantics

Labels use the lowest index within 10⁻¹² absolute relative-linear-power tolerance of the maximum. Each position in a ranked list repeats this anchored rule against the remaining maximum. A pairwise tolerance sort comparator is not used because its comparisons can be nontransitive.

Loss uses the actual global maximum power, not the near-tie label's possibly slightly smaller power:

`lossDb = 10 * (log10(bestPower) - log10(bestCandidatePower))`

This log-difference avoids overflow in a ratio. An exactly zero candidate power with positive reference power gives positive infinity. All-zero reference power is undefined and rejected. Metrics have no floor or cap. Tiny positive floating-point sinc residuals at analytic nulls remain positive; an enormous finite numerical loss is not presented as a verified physical null measurement. The linear 0–1 plot has no dB display floor. The selected candidate marker is the lowest-index exact achiever of maximum candidate power; label/ranking near-ties follow the separately documented tolerance rule.

Top-K label hit, beam miss, mean loss, type-7 interpolated 95th-percentile loss, strictly-greater-than-3-dB loss fraction, and K/64 probe count are computed dynamically. The threshold event is not a communication outage definition. Infinity is shown as `+∞ dB` and serialized to JSON as the string `"Infinity"`, never silently converted to `null`.

For fixed predictions, candidate lists are nested. Hit rate cannot decrease and best-candidate loss cannot increase as K grows. K=64 gives exact-label hit 1, loss 0 and probe fraction 1. Perfectly probing candidates assumes a constant channel, exact candidate measurements and equal probe costs. No sensing acquisition, training, preprocessing, inference, switching or fallback cost is included. The ideal count reduction 1−5/64=92.1875% is not a reproduced measured end-to-end saving. Power is normalized array response, not watts, SINR, throughput, energy or latency.

Only four correlated evaluation passes exist per toy dataset. No naive per-frame binomial confidence interval is supplied.

## Source correspondence

The primary reading edition is the six-page WCNC 2022 accepted manuscript in [NSF PAR](https://par.nsf.gov/biblio/10404321), DOI [10.1109/WCNC51071.2022.9771564](https://doi.org/10.1109/WCNC51071.2022.9771564). Page references mean PDF pages, not proceedings pagination.

- §II pp.1–2, Eqs.(4)–(6): communication model, codebook and strongest measured beam
- §III pp.2–4, Table II p.4: radar preprocessing/CNN, not implemented here
- Fig.3 p.4: separate 77 GHz radar and 60 GHz communication array
- §IV-A/B pp.4–5: collection and label construction; the 6,319-sample, 70/20/10 train/validation/test sentence is on p.5
- §V pp.5–6, Figs.5–7: study-specific accuracy/cost/training-size results, not reproduced

The nine-page [arXiv v1](https://arxiv.org/abs/2111.09676v1), dated 2021-11-18, uses 70/30 train/test in §V-B p.6; its top-K definition is §III-C Eq.(10). This older split is not silently attributed to the conference manuscript. [DeepSense v2](https://arxiv.org/abs/2211.09769v2) remains a resource reading; synchronization does not establish zero time skew, and its vision/position cross-scenario example is not radar-only evidence for this case. Exact URLs, editions, source hashes and unimplemented mechanisms are in `data/radar-beam-decision-sources.json`. No private research notes or source copies are distributed.

Only the existing `radar_prediction` bibliography card's `caseId` and `readingPlan` changed. The other eight cards and every citation/social snapshot remain unchanged; `deepsense.caseId` remains null. Counts become 22 units, 11 cases and six available teaching cases among nine paper cards, with the same eight directions and 31 concept entry routes. The learning direction now explicitly includes sensing-assisted communications. New deep references do not replace any beginner entry.

## Original implementation verification layers

1. Pure-core tests cover normalization and invalid data, deterministic generation, all 63 midpoint ties, a nontransitive tie counterexample, direct array response, actual-max reference, exact-zero and tiny-positive losses, matched train/test membership, train-label dependence, frozen nested rankings, metadata renaming, and throwing getters preventing oracle access.
2. Default plus 40 seed/control settings are cross-checked with a separately written Python stdlib implementation. It compares every generated feature and label, full training/test memberships, estimated coordinates, complete 64-beam rankings, selected full power vectors and aggregate metrics. Validation data is an audit artifact, never loaded as a leaderboard by the UI.
3. A separate auditor recomputes actual exported JavaScript states using direct complex-array sums and independently written kNN/metrics. It does not import the producer's reference implementation or assume NumPy seed parity.
4. Mock-DOM UI tests execute the actual controller. They check K=1/5/64, all 64 plotted powers, unchanged predictions during sample selection, evaluation-only example selection, lazy split comparison, controls, seed reproducibility, reset, missing/throwing core, invalid-state clearing, explicit infinite-loss rendering/export and downloadable JSON. Geometry is checked at SVG widths including 220,259,291,323,375,600 and 1000 pixels. Native labels, focus styling, closed disclosures and keyboard-focusable export/table regions are statically checked.
5. Integration tests check all real local routes, six research-depth layers, generated portals, preservation hashes for the original directory/DeepSense card, exact source editions and all 31 beginner routes.

These implementation checks alone do not certify rendered text bounds, real browser download behavior, actual keyboard/screen-reader interaction, online assets or deployment. The later deployment and cloud Chrome checks are recorded separately below; their scope must not be inferred from the local tests.

## Rerun

```sh
node --test tests/radar-beam-decision*.test.cjs
python3 scripts/validate-radar-beam-decision.py
node scripts/generate-site.cjs
node scripts/generate-site.cjs --check
node --test tests/*.test.cjs
git diff --check
```

The fixed seed49 regression is a NumPy-prototype **power fixture**, not a claim that JavaScript seed49 generates that same row. Reference power 0.9960103361670658 and candidate power 3.1550589621386463×10⁻¹³ give 124.99256365562623 dB; a 10⁻¹² floor would incorrectly change the result to approximately 119.9826 dB.

## Executed original implementation local checks

On 2026-10-11, the final numerical core SHA-256 is `e563509a99a5ed93a6dd0dd9df81a9366e4c7d3d7ec895ddc3bc9d98927eb358`.

- Full repository Node suite: **432/432 passed**, including 17 new numeric, 13 UI and 8 integration tests
- Site generator freshness and `git diff --check`: passed
- Producer-independent Python reference: default plus 40 seed/control settings passed, including complete memberships and rankings; maximum metric difference 7.11×10⁻¹⁵
- The Python validator also ran successfully with an output path outside the repository; generated source hashes were checked against actual files
- Separate actual-core numerical audit: **24 configurations, 72 protocol fits, every K=1…64** passed; independently recomputed complex-array power differs by at most 2.55×10⁻¹⁵; complete ranking and estimate checks passed
- Separate input-robustness audit: **71/71 checks passed**, including sparse full rankings outside the selected prefix, invalid geometry, nonfinite/overflow inputs and uncapped zero/tiny-positive power losses
- Separate actual-controller mock-DOM learning/UI review: **7 grouped checks passed**; all **32** local page links/resources resolved

At the end of the original implementation stage, no browser had been opened and no commit or publication had been made in that stage. The subsequent release and live checks below close the deployment and browser checks only to the extent explicitly recorded. Neither stage is a measured-radio certification.

## PR #33 deployment and live QA closeout

The following checks were completed later on 2026-10-11 UTC, after the implementation checks above.

### Release identity and repository verification

- PR #33 head: `51cfa5de00c43e32e20d90b18a0e8de5c29fea5f`; merge commit: `b9cf4a6ad5e7dfed82f549122375570b58fc2ddc`
- GitHub Pages deployment run `38114363989` completed successfully for that exact merge commit
- All 26 remote release files matched the frozen release manifest, whose SHA-256 was `16e36d672ad4516e8fde733945a87a3f2c53412f5e03443c08c7aba6c81af8ac`
- An independent release rerun passed all 432 repository tests, generator freshness and `git diff --check`; the audited numerical-core SHA-256 remained `e563509a99a5ed93a6dd0dd9df81a9366e4c7d3d7ec895ddc3bc9d98927eb358`

The remote-file comparison verifies repository contents. A separate live HTTP byte-comparison attempt did not complete, and a bounded retry timed out. No live-served SHA-256 equality is claimed. Successful deployment of the exact merge and actual live rendering/interactions were verified separately from that incomplete byte check.

### Actual cloud Chrome checks

The deployed lesson was tested in cloud Chrome at a 1,165 CSS-pixel viewport with 100% desktop zoom and at a 323 CSS-pixel viewport with 150% desktop zoom. These were actual browser sessions, not mock-DOM tests or a physical-phone test.

- The page initialized real model predictions. With seed 37 and the held-pass protocol, sample 2050 at K=1 missed label 6, selected beam 7 and showed approximately 0.639 dB loss. K=5 contained label 6 and gave zero loss. K=64 gave a label hit, zero loss and 64 probes
- The example finder selected sample 2054, with recommendation 9 versus label 10 and approximately 0.019 dB loss. Its explanation visibly disclosed that evaluation truth was used to choose the example
- Keyboard Home/End reached K=1/64. Repeated reset restored the full default state. Native Enter opened disclosures. Neutral-control and held-scene selections recalculated model scores
- Native keyboard entry of seed 49 followed by Tab updated the calculation; ArrowUp then updated it to seed 50. An automation-only fill-plus-Tab attempt changed the input without delivering the change event, so native typing was used to verify actual keyboard behavior
- At the narrow viewport, controls and the legend wrapped, and the linear 64-beam chart remained readable with distinct label-square and probed-circle markers. Measured SVG text bounds fit the 276 CSS-pixel chart; document width and scroll width both measured 323 CSS pixels
- Keyboard ArrowRight scrolled the table within its container. ArrowDown/ArrowRight scrolled the raw JSON within its container; observed container-scroll changes included 26.67 CSS pixels
- The complete 618,865-character record parsed as JSON with seed 37, 512 training observations, 64 test anchors, frozen predictions separated from `evaluationOnly`, and protocol comparisons. A real browser download event completed
- The bibliography's `radar_prediction` action opened the initialized lesson. The knowledge-map task-learning relation and its deep action opened the initialized `#mechanism` section. The original nine influence-card snapshots were preserved; integration counts were 22 units, 11 cases, 31 concepts, eight directions and six active teaching cases among nine paper cards

The browser was restored to the 1,165 CSS-pixel / 100% zoom state after the checks.

### Observed limitation and remaining coverage

With the full raw-JSON disclosure expanded, automated retrieval of the full accessibility tree timed out. DOM focus and container scrolling remained functional, and closing the disclosure restored accessibility-tree retrieval. This is an observed automation limitation with the large expanded record; it does not establish a real screen-reader failure or a page crash. Screen-reader behavior was not certified.

The sampled error log contained extension-origin metadata errors only; it is not an all-time or full-browser-console guarantee. No physical phone, other browser engine, screen reader, print flow, no-JavaScript browser session or radio hardware was tested. The closeout records the deployed PR #33 behavior, including its full raw-JSON disclosure, and does not certify later changes to record previews.

## Bounded record preview follow-up — local verification, 2026-10-11 UTC

The PR #33 live observation above led to a presentation-only follow-up shared with the OFDM lesson. The record disclosure now says “查看当前记录预览与下载完整 JSON”; its keyboard-focusable JSON region is explicitly labeled as a preview. The inline record is valid JSON capped at 12,000 JavaScript string characters, with `previewInfo.completeRecord: false` and explicit collection counts (`totalItems`, `shownItems`, `omittedItems`, `firstItems`). Short scalar coordinates remain intact. A budget fallback lists omitted top-level fields instead of cutting JSON syntax.

The full current record is built from the same successful render and stays out of the DOM. A native button requests a locally generated JSON Blob containing all 512 training rows, all 64 prediction inputs and frozen 64-beam rankings, all 64 evaluation-only power vectors, memberships, definitions and metrics. When the split extension is open, the complete record retains all three protocol comparisons. `evaluationOnly` remains separate from prediction inputs; infinite losses remain the explicit string `"Infinity"`. There is no scientific-core change, network upload, extra dependency or new truth input to prediction.

Closing the disclosure clears its preview text without rerunning training. Reset and computation failures clear the export snapshot and revoke pending object URLs; successful rendering enables the current download again. Download-start failures retain only the bounded preview and explicitly say it is not a substitute for the full record. Each download request gets its own temporary URL, revoked after the request or on page exit. The status reports a request to the browser rather than claiming the file was saved.

The final local repository suite passed **443/443 tests**, including **34/34** shared-helper and two-lesson UI tests. New coverage checks bounded JSON, omission accounting, original complete-download contents, repeated controls/disclosures/downloads/reset, stale-export clearing, missing helpers, Blob/URL/click failures, URL lifecycle and Infinity semantics. The independent Python radar validator again passed its default plus 40 seed/control comparisons and regenerated its reference file byte-for-byte; the OFDM validator also regenerated its unchanged artifact after 15 checks. Site generation, freshness and whitespace checks passed.

A separate independent review found no correctness defects and compared 23 representative actual-controller snapshots across both lessons; every previous full record matched its new complete-download record byte-for-byte. This included all three radar protocols, all control presets, K=1/5/64, sample selection, extension states and seeds 0/49/99999, plus OFDM map/noise/gap/focus states. Default radar preview/full lengths were 7,123/300,220 characters with the extension closed and 8,098/618,863 with it open. The largest tested preview was 8,358 characters. Every observed preview-DOM write was empty or valid preview-only JSON within the 12,000-character bound.

These follow-up checks are numerical/controller/mock-DOM verification. No new browser interaction, publication, screen-reader result or resolution of the previous accessibility-tree timeout is claimed here; the prior PR #33 live checks apply only to that deployed version.


## Published bounded-record follow-up — 2026-10-11 UTC

PR #34 merged as `c159fdbddac0a60cc46c0667c9db4545dbdf973d`; Pages run `38115398555` succeeded for that exact commit. All ten changed remote files matched the frozen reviewed artifact. The parent independently reran 443 passing repository tests, generator freshness and whitespace checks. Both scientific cores were unchanged. The separate 23-snapshot old/full versus new/download comparison was byte-identical.

Actual cloud Chrome review covered 1165 CSS-pixel desktop and 323 CSS-pixel narrow views at 150% desktop-browser zoom. Expanded preview accessibility-tree retrieval completed successfully on both lessons, where the previous full records had timed out. Previews parsed as valid JSON with `completeRecord:false`, exact collection counts and explicit omissions. Full local downloads completed through the browser's download events; this does not independently certify downloaded bytes, which were covered by the separate snapshot audit. Native keyboard opening, focus and internal scrolling, control-dependent preview updates, closing and reset clearing were checked. The document did not overflow horizontally at 323 pixels; the browser was restored to 1165 pixels at 100% zoom. This was not a physical-phone, real screen-reader or multi-engine certification.

The actual three-protocol preview contained 8,098 characters (main protocol alone: 7,123). Its 512 training IDs were represented by one shown ID plus 511 explicitly omitted. Closing and reset cleared the preview DOM; reset restored K=1.
