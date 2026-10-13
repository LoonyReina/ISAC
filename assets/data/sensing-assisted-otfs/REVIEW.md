# Independent sensing-assisted OTFS JavaScript port review

Audit date: 2026-10-13 UTC

## Decision

**Accept frozen v3 for the bounded numerical / actual Node module-Worker gate.** The original v1 is not accepted unchanged: this review independently reproduced three defects, and the separately frozen v3 resolves them. Real-browser interaction, production lesson integration, deployment, source-sized figures, and whole-paper reproduction remain open gates.

Accepted manifest: `352370b7ba1046e748b6d4e0ec6cde296ccf37d060da56a2ca079249ef491de6` (56 files)

Accepted runtime manifest: `5a51d315a6f33b352149cc388bcb72edda1a22876cacd89a375b5b1337127a7e` (9 files)

`SOURCE-BINDING.json` independently verifies all final files, all nine final runtime files against the actual tested candidate copy, the unchanged original v1 (46 files), and the unchanged reference (62 files). Neither the frozen source/reference nor the frozen original was edited. Every test suite that refreshes reports ran on a copy.

## Scientific contract and source inspection

This is an **audited moment-repaired diagonal proper-complex Gaussian surrogate** for coherent effective-gain, integer circular-support uplink reception. It is not an exact physical unknown-gain posterior or a claim that the printed source equations are mutually consistent.

The fixed primary source is arXiv:2105.03125v2, PDF SHA `57e8c349ee32452bd53d42625da4295c6e4014ca1c2e52bb17584fea40ce1f98`. This review read the source equation text and independently inspected the retained original Eq.57 image. The outer Es, repeated target uncertainty, and source target-mean indexing agree with the earlier equation crosswalk. The runtime's three practical modes preserve the intended distinctions:

- `moment_repaired`: each interferer's own mean and gain-error marginal, plus target-candidate uncertainty
- `ignored_uncertainty`: identical available data, estimates, support, initialization, damping and stopping, with zero uncertainty
- `literal_operational`: source Eq.42/52/57 diagnostic, with normalization repaired only to make the diagnostic operational

`supplied_perfect_csi` is an explicitly extra-information evaluation branch supplied physical gains/support. Its message approximation is still not exact MAP. No physical-truth keys pass the practical receiver allow-list. The numerical kernel imports no fixture, cached curve, random generator, DOM or network source. The simulation creates new PRNG primitives and raw observations; archived 5,760-record reference experiments are not substituted for live results.

Practical uncertainty uses declared population powers, not realized current gains. Its second moment does not establish independent errors, properness of BPSK contamination, independent likelihood factors, or absence of double-use of the same observation. Source/model limitations, support mismatch, zero guards, pilot replacement, absence of guarded/OFDM baselines, and missing full sensing/prediction chain are explicitly retained in runtime notices and documentation.

## Independent evidence beyond rerunning supplied tests

### 1. Fresh real Worker frames and independent scalar receiver

`independent-fresh.mjs` creates seven previously unused configurations through actual `node:worker_threads`: complex single path, unequal-prior mismatched support, three-path shared contamination, signed one-dimensional support, all-zero population gains, maximum 16×16 grid with a cap, and minimum two-cell grid. Each has two independent draws, both energy normalizations, and all four modes: **112 fresh complete receiver records**. Seven additional modified raw-y cases use the public practical receiver API.

`independent-numerics.py` contains a separately written scalar dictionary-edge oracle using direct excluded-neighbor sums. It does not call the reference implementation to construct the scalar result. It independently regenerates the PRNG, signs, gains, noise and source-to-destination circular frame; extracts pilot-arrival estimates; checks statistical uncertainty, actual and reported frame energy, masks, raw inputs, all probabilities, hard decisions, every history field, statuses, caps, bits/errors/FER/BER, and paired differences. A separate pinned Python reference check is a second evidence layer.

All v3 fresh checks pass. Maximum absolute probability differences:

- Independent scalar oracle: **3.1086244689504383e-15**
- Pinned Python reference: **2.3592239273284576e-15**

`candidate-v3-evidence/fresh-worker-evidence.json` retains exact Worker export text and hashes. `fresh-per-iteration-traces.json` retains independent JS capped reruns for each iteration. Thirty-two trace-level categorical tie observations occur in the new one-dimensional cases; these are localized observations, not 32 distinct failed records. Every label disagreement has both actual probabilities within 3e-12 of 0.5, and every decision-change count is reconstructed from current and previous labels. Other history, status, masks, errors and tolerances receive no exception. The initial strict scalar tie failure is retained under `rejected-attempts/`.

### 2. Existing 113 fixtures and adversarial checks on their exception policy

The supplied v3 full suite was rerun independently on a copy. All 113 fixtures pass with the same unmodified arithmetic, including the retained two half-tie cases/four categorical differences. It compares 37,559 numerical values; maximum full-output absolute error is 3.941291737419306e-15. The independently supplied scalar probability layer has maximum error 6.328271240363392e-15.

Seven deliberate fixture corruptions were independently inserted only into an isolated copy: unrelated status, history count, residual, mask, iteration count, out-of-tolerance probability, and non-tie decision. All are rejected, including corruptions on a half-tie fixture. Thus a probability tie does not excuse unrelated metadata/count/error changes. `fixture-mutation-results.json` and individual rejection logs retain the evidence. The unchanged fixture verifier is the same one run for v3.

### 3. Physical posterior counterexample remains visible

`independent-exact-posterior.py` enumerates all 256 BPSK words and integrates the Gaussian physical gains through independent full 9×9 covariance solves. It does not add pilot estimates as another factor. Its exact marginals differ from the stored oracle by at most 2.22e-16. The converged surrogate's maximum marginal gap remains **0.4999130751997302**. Convergence is not accepted as posterior correctness.

### 4. Strict input, full records and lifecycle

Sixty-one independently written malformed schema/boundary cases are rejected, including truth injection, fractional/duplicate modulo support, bad dimensions/pilots, nonfinite/invalid powers, wrong dtype, shared buffers, sparse vectors, getters before execution, extra array properties, bad request fields/IDs, dangerous codec keys and lossy integer conversions.

Additional actual Worker checks prove that caller mutation cannot change held exports; busy export rejection preserves an active computation; all 25 observed progress snapshots remain unchanged after later processing; a later run does not mutate a saved full result; and a captured old-generation event cannot settle a replacement request.

The copied supplied suite additionally passes 20 kernel/codec tests, 10 original lifecycle checks plus six deferred-result checks, three signed-zero actual Worker round trips, eight conditioning checks, and a separate fresh 16-record actual Worker/Python replay.

Failures and caps remain in denominators. A separate copied evaluation module with deliberate dependency failure injection retains all 16 failure records, every payload bit counted wrong, and all masks/statuses. This is explicitly fault-injection evidence, not a claimed naturally observed failure. A 108-configuration bounded simulation search found no naturally occurring failure in that search; its negative result is retained.

## Three independently discovered defects and dispositions

### A. Deferred completion evidence lost on cancel/supersede

In v1, an older real Worker completion deferred behind an unacknowledged newer submission resolved as cancelled/superseded without any partial payload. Four already-completed receiver records were lost. The same issue affected analogous release/dispose/failure/restart paths. This violated the documented per-request evidence-preservation contract; it was not an objection to intentional UI reset.

v3 preserves the best per-request terminal/deferred/partial payload. Our original delayed-transport reproductions now both return all four records. Terminal identity remains cancelled/superseded, and the preserved nested record remains the old completed numerical evidence. Current request notifications and generation fences are not weakened. Stale partial events no longer overwrite the current partial cache. Original failing and repaired results are retained as `adversary-client-results.json` and its v3 counterpart.

### B. Signed-zero loss in finite typed JSON

A legitimate zero-population actual Worker run produces signed-zero gain components. v1 JSON stringification changed -0 to +0, violating the claimed exact Float64 round trip. This had no observed BER effect, but was a raw-evidence fidelity defect.

v3 codec `sensing-otfs-finite-typed-json-v2` uses strict `{$number:'-0'}` tags. Independent exact round trips now pass for complete zero-gain Worker records, signed scalar/array zero, minimum subnormals and maximum finite values. Malformed tags and signed-zero conversion into integer arrays are rejected. The original failed exact comparator and its 14k error log are preserved.

### C. Extreme finite likelihood cancellation falsely reported converged

The original public receiver accepted P=1, y=[1,0,1e12,0], unit pilot, Es=N0=1e-12. It returned P(+)=0.5, the negative decision, and converged in one iteration. The exact one-path Gaussian log-likelihood ratio is 4e18, giving P(+)=1. This is numerical cancellation within the stated input safety envelope, not a legitimate half-probability tie or physical surrogate discrepancy.

v3 retains the pinned distance arithmetic for returned probabilities and adds an explicit resolution guard: the algebraically equivalent BPSK LLR is only a diagnostic; discrepancies exceeding 1e-9 cause `NUMERICAL_CONDITIONING`. No snapping, decoder probability substitution, or hidden change to the reference is used. Twelve independently tested sign/real/imag/mode variants reject. Zero/weak and ordinary well-resolved cases still run. Actual Worker rejection and subsequent valid-run recovery pass. The original wrong result and analytic oracle remain in `adversary-numeric-results.json`.

This guard addresses the demonstrated candidate-distance cancellation. It does not prove universal accuracy over every extreme combination in the finite safety envelope, and it does not make the surrogate an exact posterior.

## Remaining gates and use constraints

- No browser engine, CLI browser or headless browser was used; no browser/UI claim is made
- No user Codex, repository, website, deployment, account, or network permission was changed
- Worker evidence is actual Node module-Worker execution, not merely a synchronous mock
- The 30-second wall guard and 10,000 accepted-ID ceiling were inspected in source; full-duration/full-count exhaustion was not independently stress-tested
- Lesson integration must use the exact reviewed v3 runtime and codec, retain visible surrogate/literal/oracle distinctions and partial/error/cap labels, and complete a separate real-browser gate
- Do not cite this review as original-figure, whole-paper, fractional-pulse, sensing-derived-support, guarded-baseline, OFDM, coding, downlink or exact-MAP validation

## Main reproduction commands

Run only inside this review directory/copies:

- `node independent-fresh.mjs && node independent-traces.mjs && python3 independent-numerics.py` reproduces original-runtime fresh evidence, retaining its separately reported signed-zero defect
- In `candidate-v3-evidence/`, the same commands reproduce reviewed v3 exact exports and independent mathematics
- `node adversary-client.mjs` demonstrates v1 data loss; the v3 counterpart verifies repair
- `node adversary-numeric.mjs` demonstrates original numeric cancellation; `candidate-v3-evidence/guard-codec-adversaries.mjs` verifies guarded behavior
- `python3 audit-fixture-mutations.py`, `node independent-boundary-schema.mjs`, `node independent-worker-boundaries.mjs`, `python3 independent-exact-posterior.py`
- `python3 bind-review.py` rechecks original/final/reference binding without changing those artifacts

All research/runtime evidence remains in this folder. Frozen source artifacts and rejected outcomes were preserved; no failed point was silently removed from the evidence.
