# ISAC: executable-paper acceptance contract

Decision draft · 2026-10-12 · inspected main `405cd4abf535cd2bc77e7dc73d397052f26b3509`

## Decision

Treat every paper as an executable research task, not as a reading-card task. Finish the source/model/algorithm audit and independent numerical validation before designing its interactive lesson. Start with the 2018 capacity–distortion optimizer: implement the general finite-alphabet algorithm, use its binary example as an independent oracle, and then expand to the paper-scale numerical experiment. A closed-form curve alone is not the promised algorithm implementation.

This is the first delivery in a continuing per-paper queue. Neither one working example nor twenty guides completes the programme. The inventory must deduplicate the research-guide and influence-catalog papers, assigning one owner and one acceptance record per fixed paper version.

## What the current repository actually provides

The current twenty guide cards explicitly describe their contribution and remaining implementation limits. Inspection confirms several distinct forms of existing support:

- `labs/theory/theory-core.js` identifies its CRB experiment as an independent scalar teaching model, not the original vector/Bayesian region
- `labs/joint-beamforming/joint-beamforming-core.js` explicitly uses analytic teaching constructions and has no SDR/ZF optimizer
- `labs/waveform-design/waveform-core.js` evaluates committed complex arrays; the UI fetches `data/waveform-states.json`. The corresponding Python validator contains the SVD-based solver. Live metric evaluation is different from solving the optimization live
- `labs/ofdm-reference/reference-uncertainty-core.js` is a thin teaching wrapper around the single-target off-grid core. It is not the 2017 atomic-norm ADMM or the 2026 semi-blind Zak-OTFS algorithm

Do not discard these useful prerequisites. Reuse their plotting, observations, exports and controls only where the paper’s actual model permits; do not relabel them as reproduced algorithms.

Repository evidence: [fixed guide inventory](https://github.com/LoonyReina/ISAC/blob/405cd4abf535cd2bc77e7dc73d397052f26b3509/content/data/research-guides.json), [waveform solver](https://github.com/LoonyReina/ISAC/blob/405cd4abf535cd2bc77e7dc73d397052f26b3509/scripts/validation/waveform-design/generate-waveform.py), [current waveform runtime](https://github.com/LoonyReina/ISAC/blob/405cd4abf535cd2bc77e7dc73d397052f26b3509/labs/waveform-design/waveform-core.js).

## Per-paper release gates

### 1. Fix the research claim and source

Record paper/version, primary PDF or official publication URL, retrieval date and file hash; exact equations, algorithm steps, tables and target figures; author-code/data revisions and licences if available. Separate verified statements, transcription ambiguities, implementation choices and unresolved gaps. A newer abstract, a citation, or a code link alone is insufficient.

Define what will be reproduced: the central estimator/optimizer/detector, every essential coupled stage, and an explicitly named experiment. For theory papers, the executable contribution may be a distribution optimizer or an analytic result. For measurement papers, distinguish a reproducible processing chain from unavailable hardware/data replication. Never invent an algorithm where the paper provides only empirical characterization.

### 2. Specify the observation and information contract

List transmitted variables, channel/state model, observed arrays and dimensions, units, geometry, normalization, noise distribution, nuisance parameters and unknowns. Give the receiver only the quantities the paper permits. For simulated inference experiments, keep ground truth and simulation-only random state outside the receiver API; prove this with negative tests. Deterministic distribution optimization does not need an artificial seed. Declare target-count knowledge, synchronization/CSI assumptions, training information, pilot/guard structure and any oracle baseline explicitly.

### 3. Implement the real core before the interface

Map each meaningful equation or pseudocode step to a pure numerical function. Preserve the paper’s objective, constraints, updates and information flow. A different optimizer or reduced dimension can be acceptable only with a stated equivalence or a clearly labelled deviation. Store all solver tolerances, initializations, iteration limits, feasibility/convergence diagnostics and failure reasons.

Require a reduced but genuine instance that exercises the distinguishing mechanism. Do not replace atomic-norm optimization by a dense search, a trained network by a hand-tuned rule, or an iterative receiver by its oracle solution while retaining the paper’s name.

### 4. Validate independently

Before UI integration, compare to an independently implemented reference or different solver, plus analytic small cases where possible. The reference must not import the browser implementation or reproduce its intermediate outputs as truth. Predeclare absolute/relative tolerances and why they are appropriate; test dimensions, normalization, complex conjugation, constraint residuals and objective values.

Run nominal, boundary and adversarial cases, with recorded seeds when stochastic simulation applies. Include low SNR, model mismatch, ill conditioning, closely spaced targets, wrong initialization, infeasible budgets, interrupted/max-iteration solves and missing observations where relevant. Count failures and unmatched targets; never report only successful fits. Separate Monte Carlo uncertainty from deterministic solver/discretization error. For learned methods, freeze training/test splits and prevent target/scene leakage.

### 5. Reproduce and interpret the experiment

Provide two clearly separated comparisons when necessary: the paper’s stated baseline/settings, and an additional equal-resource comparison. Match observations and random draws within paired comparisons. Account for total energy, bandwidth, observation time, guards/CP/pilots, aperture, receiver knowledge, training data and compute budget. Record every intentionally unmatched resource.

Reproduce numeric checkpoints and then the selected sweep/figure, with applicable seeds, trial counts, uncertainty estimates, failures and executable commands. Deterministic experiments instead report numerical residuals and convergence error. A qualitative curve resemblance is insufficient. Do not relabel a bound as estimator RMSE, a normalized spectrum as detection probability, or an asymptotic rate as finite-code throughput.

### 6. Separate live execution from large benchmarks

Every released lesson must run the actual validated core on fresh user-selected inputs. Precomputed optimization outputs are not a live solver. Permit cached large Monte Carlo curves, training runs and paper-scale benchmarks only when visibly labelled with dataset, parameter grid, seed range where applicable, code revision and generation command.

Use a bounded live configuration and a Worker/cancellable computation for expensive cores. Measure end-to-end control-to-result latency on the available named desktop configuration and publish measured median/p95 and limits. Desktop usability is the initial acceptance priority; retain accessible narrow layouts, while unavailable mobile hardware measurements are a recorded follow-up rather than a release blocker. Choose a usable interaction budget from measurement, without claiming arbitrary timing guarantees. If the core cannot meet the chosen budget, reduce a disclosed problem dimension or offer an explicit Run/step action; do not silently substitute an approximation. Old results must be marked stale while a new request runs, and superseded results must never overwrite newer ones.

### 7. Build an actual learning interaction

For each control, name the assumption/design variable it changes and the prediction it lets the learner test. Display the same numerical core’s observation, current estimate/design, residual or objective, constraints and final metric. Include a meaningful baseline/ablation toggle, one reproducible failure preset, one paper-matched preset, reset and, for stochastic experiments, seed controls. Explain axes, units and how to read each plot before presenting it.

Expose algorithm progress where it teaches the mechanism, rather than animating a fixed narrative. Tie the explanation to the current computed state. Maintain keyboard operation, readable numerical alternatives, paused-by-default animation and a useful no-JS explanation. Export inputs, model/algorithm version, source locators, seed where applicable, resource ledger, solver status, runtime and outputs; do not label learner text as computed evidence.

### 8. Accept the whole vertical slice

Each record needs separate fields for: model fidelity; algorithm implemented; independent checks; paper experiment reproduced; live execution; UI learning acceptance; and explicit remaining work. “Core verified at reduced scale” does not mean “all paper experiments reproduced.” Hardware/data-dependent claims remain open if their evidence is unavailable.

Release only after focused scientific tests, full repository tests, deterministic generation, broken-link/no-JS checks, browser interaction/latency checks, and exact-commit deployment verification. Preserve existing URLs and canonical source ownership. Keep historical migration audits separate from normal content development; add scoped scientific tests, not new whole-site freezes. New feature tests must not pin unrelated global counts or whole-site hashes. Derive inventory coverage from canonical sources, assert the relevant model/route contract, and use one-time full-artifact comparisons as review evidence rather than permanent authoring locks.

## First candidate and stopping condition

**Paper:** Kobayashi, Caire and Kramer, *Joint State Sensing and Communication: Optimal Tradeoff for a Memoryless Case*, [fixed v1](https://arxiv.org/pdf/1805.05713v1).

Implement the finite-alphabet modified Blahut–Arimoto core (§IV, equations 22–25), rather than only plotting the binary closed form. Use the binary experiment (§V-A, equation 26/Fig. 2) as the first numerical and visual reproduction. Audit the printed min/max inconsistency in equation 18 and inactive-cost handling explicitly. Keep finite-alphabet reproduction separate from the quantized-Gaussian experiment and from implementing a finite-length communication code. Fig. 3 remains a separate open gate: its discretization settings are unspecified, and independent evaluation of the literal Gaussian model differs from the printed capacity endpoint. Preserve both results and investigate the discrepancy; do not tune undocumented parameters to fit the printed curve.

**First core gate:** independently verified optimizer and estimator, analytic and constrained-optimization cross-checks, explicit infeasible/unconverged cases, deterministic exported traces, and measured live recomputation. Then implement the lesson around what those calculations reveal. Do not start with polished UI while the numerical gate is open.

**Next research gates:** complete this paper’s numerical-experiment contract, then prioritize reusable existing-paper optimizers and the 2017 error-robust off-grid receiver. Large SDP/ADMM, OTFS, learned methods and hardware/data papers remain explicit work items; difficulty changes execution order, not whether they count as complete. Run source/data acquisition and independent-reference work for the next item while the current UI is being completed.

## Implementation sequence and artifacts

For each paper, prepare a short source audit, model/algorithm specification, independent reference, validation fixtures/report and an interaction design derived from the verified core. Keep canonical source under `labs/<paper-or-mechanism>/`, primary-source metadata under the current content/evidence structure, and independent numerical checks under `scripts/validation/<topic>/`. Extend existing public routes where appropriate; add a distinct route only for a genuinely distinct executable experiment.

After each deployment, record the exact completed gate and immediately advance the next authorized core/experiment/UI task. Monitoring a deployed page alone is not progress on an unfinished paper.
