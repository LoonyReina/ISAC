# Cell-Free MAPRT / CCP: source and evidence boundaries

Fixed source: [arXiv:2305.12523v2](https://arxiv.org/abs/2305.12523v2). PDF identity SHA-256 is `30b871e5bb3dd1a66fab1a4c2ab3974abb8a7e664e04e2dfa62f6e50679c0d10`; no PDF, extracted source text or source imagery is redistributed. The canonical paper remains `supplement-case-distributed-detection`. The [older two-station scalar detector](../distributed-detection.html#derivation) remains a prerequisite; the [new MAPRT lesson](../cellfree-maprt.html#question) implements different, source-derived algorithms.

## What executes

The bounded 4-TX / 2-RX / M=2 / 2-UE / 10-symbol model recomputes fresh imperfect-CSI samples, RZF communication beams, projected dedicated sensing beam, complex multistatic observations, Eq.11–33 Gaussian-prior MAPRT maximization, separately calibrated AP/SP detectors, communication-centric power and genuine three-start sensing-SINR CCP. The live native barrier Newton convex solver has numerical supporting-plane subproblem gap certificates. They establish no global nonconvex optimality. Fresh synthetic controls are not an original source figure or full-paper reproduction. Live data, selected Python reference, and older scalar prerequisite are separately labelled.

## Exact accepted numerical evidence

The [source audit](../scripts/validation/cellfree-maprt/SOURCE-AUDIT.md), [mathematics](../scripts/validation/cellfree-maprt/MATHEMATICS.md), [reference handoff](../scripts/validation/cellfree-maprt/REFERENCE-HANDOFF.md), [independent numerical review](../scripts/validation/cellfree-maprt/INDEPENDENT-NUMERICAL-REVIEW.md), and [independent runtime review](../scripts/validation/cellfree-maprt/INDEPENDENT-PORT-REVIEW.md) retain their original statements and exact bytes. The [evidence inventory](../data/cellfree-maprt-evidence-map.json) binds complete archive members and every part.

Reference manifest `30a8e28487ddce0542d767482e02b6eb6af9397a5b69187071f5507cd8e774a5`; runtime manifest `4614ef3d375be7185cf32759a4e00638ee0a2db091cce57b62bc7268ff07f9e5`. The source-free reference archive has 64 regular safe members and 46,222,011 bytes, SHA-256 `52356ca01b77482a1c3a42d70f7fe4dc0914a20c5b29695d5e5e8f8a6df7981b`. It is split into six individually hashed parts, each at most 9,000,000 bytes. Use the [reassembler](../scripts/validation/cellfree-maprt/reassemble-reference.py) only when the optional archive is wanted. Neither it nor the archive is a startup dependency.

The [runtime ZIP](../data/cellfree-maprt-runtime-source-free.zip) has 26,504 bytes, SHA-256 `9658d9d2c8a150b5288f14f4d77660b97148aae3e7885e3a103ce71fd26b8293`; the [validation ZIP](../data/cellfree-maprt-validation-source-free.zip) has 1,252,851 bytes, SHA-256 `48582ecfd82c4a808049495446772e00ffb8b281eb9be53d5326be69ac5dca87`. They contain original project implementation and numerical evidence, not the source paper.

## Findings that must not disappear

- Selected Python reference: 64 detector/allocation/RCS/Pfa cells and 1,048,576 independently replayed scores. Six scientific CCP restarts, 66 accepted outer iterations, 71 subproblem attempts, five failed status-8 attempts and five bounded successful retries remain visible. Earlier failed smoke and same-start retry evidence is retained in the optional archive
- All four selected allocations cross at least one independently fitted holdout limit. ISAC/ISAC+S holdout UE1 is 2.89305 dB against 3 dB, and AP4 is 1.01101315 W against 1 W. Fitted feasibility does not establish population feasibility
- Selected dedicated sensing amplitude is approximately 2.59e-16: ISAC+S overlaps ISAC. This is a local selected outcome, not proof of globally useless sensing power or an original-figure match
- At 0 dBsm and nominal Pfa=0.01, ISAC AP has 6465/8192 detections; extra cap-saturated AP has 7339/8192. Used expected powers are 1.18513454 W and 2.14319608 W; surrogate sensing-SINRs are 2.04150 and 1.76858. Common AP caps are not equal used energy, and the surrogate does not guarantee Pd ordering
- Every detector uses 16,384 reference H0 calibration blocks, with distinct 8,192 H0/H1 evaluation blocks. At nominal 0.1, eight of 32 correlated pointwise intervals exclude nominal; this is not 32 independent hypothesis tests, an exact-Pfa guarantee or CFAR. Weak-signal misses and false alarms stay in the records
- Fresh runtime review: 20 runs, 152 cells, 89,892 scores; 107/120 accepted restarts, 13 retained iteration-cap failures, and 57/76 allocations with at least one holdout crossing. Runtime solver statuses differ from SciPy SLSQP; no Python retry history is attributed to the browser solver
- MAP maximization includes prior-density normalization; marginalized LRT instead has a covariance log-determinant shift. Agreement after the appropriate fixed-model threshold shift does not identify the two procedures generally

## Verification and remaining gates

Required source-only portable tests execute in temporary copies, with fresh MAPRT/scenario/CCP runs, standalone independent NumPy formula checks, exact lesson TAP names, real Node module Workers, mounted DOM flows and production-handler export reconstruction via independent augmented least squares. Staged source bytes must not change. These are not actual-browser layout, paint-time, download or device-memory measurements. Actual served-browser lifecycle/layout/keyboard/download/performance acceptance, deployment and exact commit/live checks remain separate. Full source-scale geometry, random deployment averaging, orthogonal-sharing/sensing-SE region and missing author simulation choices remain open.
