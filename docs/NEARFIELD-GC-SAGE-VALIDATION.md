# Reduced GC-SAGE inverse-estimation lesson

12 October 2026. Integration base: `8f2af8460a57bf3faabd08e93fae94c8a33e8080`.

## Delivered scope

The lesson at [nearfield-gc-sage.html#experiment](https://loonyreina.github.io/ISAC/nearfield-gc-sage.html#experiment) computes a reduced inverse problem from fresh noisy wideband observations. It implements data-derived initialization, pathwise SAGE residual extraction, reference-delay ellipse search, per-channel complex-gain least squares for both estimators, scattering/reflection candidate comparison, incumbent refits and explicit stopping/resource records. It is a 2-D, one-bounce, known-L=2 synthetic restriction of [arXiv:2605.01162v1](https://arxiv.org/pdf/2605.01162v1), not the full multi-bounce algorithm or paper Figures5–9/TablesI–III reproduction.

The original near-field, known-geometry reflection, and capacity lessons remain separate. The existing near-field mapping guide links this actual estimator through the shared validated execution-entry schema. One registered unit/page is added; no research case, map progression, paper or source date is invented.

## Numerical evidence

- Core version `reduced-gc-sage-2d/0.2.0-all-channel-region`; history schema `gc-sage-compact-history/1.0.0`
- Runtime core SHA-256 `fe96407e6a09c71aa141d75fecaf26d23e15bbc1514f30ed121262dbdfc3ceda`
- Simulator version `reduced-gc-sage-observations/1.0.0`, SHA-256 `598f7eeb3c7a02a6a3b95c198a9c48d9b88f6f276eab422a6fb8d406600b496d`
- Independent Python/JS comparison:55 common-observation cases/110 fits plus6 complex-LS stress fixtures. Passive history separately matches the audited predecessor bit-for-bit on8 cases excluding timing/history, reconstructing180 actual update boundaries within4.55e-13 SSE
- Simulator/evaluator owner checks:24 tests,480 independent generator comparisons,11 common-input evaluator fixtures,1296 exact assignment cases,640 actual fits over160 acquisitions×2 budgets
- Independent input/evaluation review:5000 fresh SciPy assignments,6 additional analytic configurations and8 actual fits; maximum SSE difference2.73e-12 and NMSE difference2.84e-14dB
- Repository-packaged history, generator, evaluator and independent input checks were rerun after path-only packaging changes

Detailed evidence is published under `scripts/validation/nearfield-gc-sage/reference/`, `port/` and `observations/`. The historical pre-history core under `port/superseded/` is an audit comparator only, never a browser dependency. Raw paper PDFs are not redistributed. The large evaluator fixture and full saved fit dumps are regenerated locally by the supplied scripts, not loaded by the lesson.

## Boundaries needed to read the experiment

Both methods receive the same Y, model priors and data-derived initializer. Truth, source mechanisms, support masks and random seeds are absent from the estimation worker. Both fit independent complex gains per path and Tx/Rx pair, so the scattering-only baseline already permits partial visibility. The phase slope across frequency supplies the delay geometry; a free per-channel complex gain absorbs carrier phase.

The48 sparse virtual receivers preserve a1.49146747855m default physical aperture. Aperture is left anchored, so changing it also moves the reference viewpoint and finite-wall support. Nominal SNR is calibrated to unblocked channel energy; blocking leaves noise unchanged, and realized received SNR is shown only during evaluation. Reference index23 and declared55ns prior never move to rescue a hidden path. The conservative region constraint requires every modeled reflection bounce in V, including low/zero-gain channels; the original visible-only interpretation remains ambiguous.

The two implementations use distinct declared noise RNGs. Equal seed numbers do not imply equal Python/browser observations. With the browser default observation, SSE is approximately158.18249 for scattering and155.09227 for hybrid, yet point error is slightly worse for hybrid (1.845mm versus1.395mm). Reference-blind observations can converge while missing the reflection association. Across the declared normal-scene acquisition grid at the reference budget,60/80 hybrid fits converged and29/80 matched both labels; these bounded grid results are not population success probabilities. No failed seed or wrong label is omitted.

Held-out-frequency evidence fits all geometry/gains on training tones only and evaluates withheld tones. It is not held-out-receiver generalization because gains at unseen receivers are free unknowns. Figure9's original horizontal axis is fitted path count, not the lesson's update number.

## Teaching and state contracts

The learner predicts, inspects measured Y, compares equal-scale maps, reviews genuinely computed update history, then optionally reveals truth-only metrics. Replay never pretends to execute a new iteration. Reflection display endpoints are plot clipping, not recovered wall endpoints. Unmatched/unlocalized geometry remains null.

A dedicated worker is terminated on cancellation or supersession. Edited/silently changed inputs, incomplete comparisons, failures and reset invalidate the completed record before any download listener can create a Blob. Both algorithms must finish on the same observation/model/options/version before an atomic JSON snapshot is offered. Inspection and truth toggles do not rerun fitting; resize does not mutate the completed record. Download means a browser download request, not proof of a saved file. No network upload or persistent browser storage is used.

Focused tests cover numerical core/history, observation generation/evaluation, registered source links and actual core/Worker/DOM state. VM and Node checks do not certify rendered layout, network loading, device responsiveness or actual downloaded bytes.

## Reproduce and open gates

From canonical source, run `node scripts/build-compatibility.cjs --test --reproducible --out /tmp/isac-gc-sage-dist` and `node scripts/build-compatibility.cjs --check --out /tmp/isac-gc-sage-dist`. The separate builder suite is `node --test tests/compatibility-build.test.cjs`. Normal authoring does not invoke or rebaseline the frozen migration audit.

In the built artifact, numerical evidence scripts are ordinary local Node/Python programs; Python uses the declared NumPy/SciPy environment. See each package README for commands. The local full regression result is recorded by the release gate rather than hard-coded as a permanent whole-site content count.

Pending: actual deployed desktop interactions/download, measured browser latency and repeated fixed-configuration performance; unknown path count, robust reference-blind initialization, multi-bounce/3-D, raw VNA data and complete paper experiment coverage. No whole-paper completion is claimed.
