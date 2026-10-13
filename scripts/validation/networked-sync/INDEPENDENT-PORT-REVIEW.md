# Independent fresh networked-ISAC JavaScript / Worker review

## Disposition

Final disposition: the declared bounded numerical kernel and actual Node Worker pass this independent implementation review, with no remaining identified implementation blocker in the tested scope. All final tests use the exact owner freeze listed below. Numerical stage identities and ordinary fresh cases pass. A deliberately severe near-collision case **does not pass tight individual-phase parity** with the accepted Python receiver; that mismatch is retained separately, alongside bad clock estimates and nonmonotone/local-minimum behavior. This review must not be summarized as universal parameter parity, physical accuracy, global convergence, or browser acceptance.

This is a targeted independent numerical and transport audit. It is not a generic security certification. The reviewer changed no owner runtime, UI, repository, browser, remote, or published site. All tests and snapshots are isolated in this review directory. Owner fixes are rechecked here, rather than applied by the reviewer. The owner also corrected the truth-only label-matching cost to the accepted phase-normalized reference; that correction is independently verified and does not change estimation or association.

## Provenance and source interpretation

- Accepted Python core `88a161d7d7d55ad4a2e703b0afb590c69644b0c61eaf370c2f6f519fc650f10e`
- Accepted Python freeze `94f0c92acb978981a0fe5d4891fe95acb5d8ce557f5b92ca6a84dc9d2637e3ab`
- Source: fixed arXiv:2607.18680v1, as recorded in the accepted reference's source audit and independent review

The operational model is genuinely reciprocal complex MIMO-OFDM: ordinary transmit steering transpose, known pilots, antenna/subcarrier/symbol tensor axes, complex gains and noise, opposite link offset/CFO signs, and real reciprocal parameter extraction. The review accepts declared radians/sample, C-order unfolding and standard `U Σ Vᴴ` conventions. It does not infer that operational interpretation of ambiguous paper notation identifies the unpublished author implementation.

The initial smoother is the declared three-axis 4×8×5 smoothed CP variant. A direct complex SVD solves each unconstrained factor LS problem, followed by continuous Vandermonde correlation projection over the same FFT local-maximum brackets. Golden-section refinement is an explicit difference from the Python bounded optimizer. Projection of a factor LS solution is not generally the exact constrained tensor-LS subproblem. No copied restricted CP-VDM implementation was inspected or used by this review.

## Independent numerical evidence

`audit_numerics.py` constructs fresh cases with independent NumPy random seed 847103915, independently indexed complex tensor sums, continuous unit-modulus pilots, arbitrary complex factors, and explicit degenerate/noisy/phase-wrap cases. It calls the JS DUT through `node_driver.cjs`. Owner regression fixtures are not read by these independent tests or by the runtime. `reference_core.py` is a byte-verified copy of the accepted Python core used only as a separately labeled parity comparator.

Final exact-byte independent findings:

- 15,539 structural and ordinary-case checks pass, with the severe collision phase mismatch retained outside the passing ordinary-case gate
- Baseline original dimensions 10×36×20 are independently exercised at known ranks 1, 2 and 3; compact 6×12×8 rank 1–3 cases add low SNR, phase wrapping, exact duplicate paths, zero data, near collision, and a 1e-9 signal scale
- All 246 structured and 312 unstructured actual A/B/C substeps are reconstructed from their recorded factors; untouched factors, exact LS inputs, scalar residuals, normalization and initializer reuse are independently verified
- All 504 actual projection columns and 116,736 saved grid points are checked against direct complex correlation sums; every refined candidate's power and bracket membership is checked. These curves are actual intermediate data, not displays reconstructed from the final answer
- Twenty initializer covariance/subspace/shift/contraction chains and twenty ESPRIT unfold/shift/LS/SVD chains are independently checked
- Three arbitrary-complex mode LS updates agree with a 70-digit independent linear-system oracle to maximum absolute error 1.42e-15
- Twenty-two finite nonflat projection columns agree with independently enumerated stationary-polynomial roots refined at 70 digits; maximum relative peak-power gap is 5.52e-16. An additional flat impulse case retains its nonunique optimum. Six actual original-size SCPD stage columns have stationary peak gap at most 1.05e-16
- Controlled-condition LS cases include condition numbers through 1e14 with declared rank truncation; exact rank-1/2/3 matrices test direct SVD reconstruction. Small numerical solution differences at high condition are preserved in metrics rather than conflated with parameter correctness
- Independent scalar antenna/path/transmit/subcarrier/symbol sums reproduce three fresh JS generator scenes, including source-SNR scaling, to relative error at most 3.81e-15
- The full 160×3248 complex smoothed Hankel materializer is independently indexed and compared by all-byte hash (8,314,880 bytes), not spot checked
- 100 conventions assertions include twelve reciprocal rank-three permutation/sign cases, complex gauges, exact half-period aliases, truth-only evaluation and typed-array snapshot behavior in `audit_conventions.cjs`
- 378 independent evaluation assertions cover 24 fresh rank-1/2/3 assignments and eight outcomes from actual generated compact/original-shape runs: phase-normalized delay/Doppler/both-angle cost, permutation direction, scalar errors, geometry margin and gross diagnostics

On the final frozen receiver, the largest ordinary-case Python phase difference is about 1.13e-7 rad. Full actual stage LS differences are at most 6.48e-11 relative, raw projection-grid power differences 2.41e-14 relative, and substep residual identity errors 1.39e-15 of the observation norm. Standard SVD's first `Vᴴ` row represents the temporal factor; no extra conjugation reverses its Doppler sign.

## Preserved adverse outcomes and limits

### Tight phase parity fails in a severe near collision

The independently generated rank-three stress case has angle separation 1e-6 rad, delay separation 1e-11 s, near-coincident Doppler, and noise amplitude 0.001. SCPD link 1 differs from the Python receiver by approximately 3.2003e-4 rad on nuisance components of approximately 1.5e-4 amplitude. The fixed tight criterion is 8e-5 rad. It remains **failed**, without changing the input, relaxing the criterion, selecting a better start, or using truth to repair the answer.

The initial comparison using pre-pilot latent data measured about 3.1255e-4 rad; a subsequent same-exact-pilot-divided-tensor comparison measures 3.2003e-4 rad. Both records are retained. Tiny pilot-division and eigenspace perturbations change weak-path parameters. Tensor reconstruction agreement remains about 3.59e-7 relative. This finite case supports a sensitivity boundary, not a theorem that all discrepancies are harmless. Small observation residual cannot certify individual paths or clocks.

`initial-near-collision-mismatch.json`, initial inputs/outputs, and revision report `parity_mismatches` preserve the discovery. Final replay retains this same failed criterion; `all_cases_phase_parity_passed` is explicitly false.

### Geometry and stopping do not certify clocks

On one fresh low-SNR case, SCPD passes the source range-versus-baseline criterion while CFO error is approximately −3,283 Hz; the smoothed and unstructured methods also pass geometry with errors approximately −13,763 Hz and −15,874 Hz. These are genuine retained results, not numerical exceptions. A separate deliberately wrong-clock evaluation has +10 µs timing error and +100 kHz CFO error while geometry still passes. With only timing wrong, even the separately labeled gross-error diagnostic remains false because that diagnostic checks CFO, delay and angle rather than offset. The explicit offset-error field must remain visible.

The phase-wrap case retains an approximately +275 ns clock error and fails geometry. Exact reciprocal half-period aliases are demonstrated by unchanged raw tensors despite different clock/CFO truth; no truth-assisted unwrapping is performed. Spatial principal-angle branching and clipping remain explicit.

Projected substeps are nonmonotone. On one same-observation random start, structured residual ends near 19.25 while the same-initialization unstructured run ends near 7.94; other structured starts end near 8.13. Every start and residual increase is retained. No best-iterate restoration, hidden restart, monotonicity or global-optimum claim is warranted.

The relative covariance-rank gate correctly solves the tested 1e-9-scaled rank-one signal. Exact duplicate paths and zero observations retain explicit method failures. Absolute small-factor safeguards still mean arbitrary floating-point scale invariance is not established.

## Truth, comparisons and timing

Inspection and tests establish that raw observations, pilots, known rank and solver configuration feed the receiver. Truth only appears in generation/evaluation output; held runs have no truth/error metrics. Smoothed, SCPD, ESPRIT and unstructured ALS consume the same actual pilot-divided tensors. SCPD and ALS reuse the exact same actual initializer. Both report initialization-inclusive time; residual/stopping diagnostics do not choose starts using truth.

Generated scenes use the port's own geometric sampler and PRNG, not the paper's Monte Carlo rejection sampler. Changed SNR and offsets resynthesize observations while retaining the tested common latent scene, pilots and unit noise. Held metadata prevents silently relabeling the same observation under new physical/generation settings.

## Worker, codec and defects corrected by the owner

See `worker-review/WORKER-REVIEW.md` for exact hashes, actual transport traces, raw-hash vectors, limits, race repros and rechecks.

Confirmed initial defects, all reported to the owner rather than patched here:

1. Direct held Float64Array inputs validated but JSON cloning converted them to objects, causing subsequent rejection. Explicit copies fix the demonstrated mismatch and snapshot before the first await
2. An older async Worker restart could overwrite a newer Worker or undo disposal, stranding pending numerical work. Lifecycle epochs and unused-worker termination fix the demonstrated races
3. Mutable object decode could return samples/config changed after their digest was computed. Synchronous snapshots before the first await fix the demonstrated integrity failure
4. `Symbol.toStringTag` getters could run before direct-codec rejection. Descriptor/native-brand hardening addresses the demonstrated getter case
5. Inherited array iterators could replace preflight-validated values during canonical serialization, including replacing a finite value by NaN. Indexed canonical emission addresses the demonstrated content/budget discrepancy
6. Direct receiver snapshots/validators and the public codec observation validator invoked inherited array operations. Finite repros substituted held samples or shape during copying and accepted empty tensors for a nonempty shape by overriding `reduce`. Bounded indexed copies, indexed shape/magnitude checks and explicit shape products address those demonstrated bypasses

Actual Node `worker_threads` testing includes accepted-only supersession, invalid request preservation, cooperative cancellation, terminal fencing, history import/export/recompute/release, worker death and explicit recovery. Direct-protocol tests cover dense/sparse and nonfinite arrays, metadata, well-formed Unicode/UTF-8 budgets, signed-zero normalization, raw binary SHA-256 framing, input tampering, and structural budgets. These are finite tests of the declared contract, not proof against every hostile JavaScript object.

All 41 owner codec/Worker tests, 28 independent Worker/race/boundary/direct-array groups, the actual 10,000-request session-cap check and five cap probes pass on final bytes. Request 10,001 is rejected by both client and Worker with no pending promises.

Maximum original-shape/rank-three/full-20-sweep Node Worker probes retain approximately 13.4–14.6 MB result-event JSON and 20–22 MB conservative preflight size at oversampling 16, with finite outputs. An oversampling-32 high-SNR case produces approximately 20.33 MB JSON / 29.94 MB conservative size and successfully exports history; an oversampling-32 low-SNR case preserves a numerical SCPD link failure. Those are measured local Node executions, not browser/device timing or universal maximum memory guarantees. The cooperative 120-second checkpoint limit was inspected but not run to expiration; it is not hard preemption. Fresh Worker results are not explicitly preflighted before hold/send; the five production cap probes found no output-budget violation. These limitations remain disclosed. Full histories use materially more memory than the raw tensor arrays.

## Excluded claims

No actual browser was operated. VM execution of the browser UMD/loader branch is explicitly not actual browser evidence. UI integration, CSP/MIME loading in a browser, navigation lifecycle, accessibility, handset latency and RF measurements remain untested. No exact source curve, Pfa/ROC, complete-paper, author-code, CRB-attainment, network-cycle synchronization, time-domain ICI/ISI or tracking claim is accepted.

## Replay

Use single-threaded numerical libraries:

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python audit_numerics.py ./final-snapshot final
node audit_conventions.cjs ./final-snapshot final
OPENBLAS_NUM_THREADS=1 python audit_materializer.py ./final-snapshot final
OPENBLAS_NUM_THREADS=1 python audit_evaluation.py ./final-snapshot final
python verify_freeze.py ./final-snapshot ..
```

Worker scripts and exact commands are in the Worker review. Final source hashes and artifact/archive verification are recorded below; `REVIEW-FREEZE.json` hashes the report, scripts, isolated final runtime, and review evidence.

## Final identity and artifact verification

- Owner source freeze: `2e74d10363e2d2feac9a06ec0c061c9d8059345023a3274c530a30f02728018b`
- Owner full manifest: `6cfb8514a1787ef6f007be39258870c423cc2887776ada7ec25b5b97f116af25`
- All seven runtime files and all 72 manifest files match the isolated snapshot. The archive checks independently verify complete member sets, exact disk/member bytes, CRC, safe paths, and no symlinks or bundled paper/image/HTML source; all 361 checks pass

| Runtime file | SHA-256 |
| --- | --- |
| js/codec.js | `ea32aa145a59794a21421ee7d900bc8d59566ddd734416aeb2d570bae333c1a5` |
| js/linalg.js | `7d5983a18f3bf1b54db5076944bc12e84c9489059dc66481fcba277f65bdaafc` |
| js/receiver.js | `473e7739d35a7dcde7807edb0627a9f0058a4d193518a6c8cfa6745a6218de98` |
| js/sha256.js | `9f1dfd6b3c81f5647db4a2f8259e8e4cc756d27183b1e0a9c43b586f361952e6` |
| worker/client.js | `2ec4be85c09f9abfa6a86da8995ed1b6c6c67bbd28518ca299f67db19dca19eb` |
| worker/protocol.js | `7a2eebeed3e169bf9339a75d87b317190d84ddf9ee9cedb07737039f64422a38` |
| worker/receiver-worker.js | `e2f50711ef502d8ec6cb185a7e5d9f3cb00444512fe57c8d4de8bbfa12a5d534` |

Verified source-free owner archives in the parent execution directory:

- `networked-sync-js-v0.1-runtime.zip`: 49,243 bytes, SHA-256 `466520c86dfd7c45e0a14f82f4048267ca20e0fbaddf14de9e4ccd6eb9ac2e13`
- `networked-sync-js-v0.1-full-evidence.zip`: 4,267,688 bytes, SHA-256 `75d8ed0e34c3b9f3a1d0881ce09ce012988fd56f342d5a25f7d3e42ed3cdbe91`

Owner numerical regressions were independently rerun on a separate copy with identical runtime bytes: 22 kernel tests, 25 linear-algebra contracts, 500 rank-deficient cases, 145 NumPy comparisons, 90 evaluator cases, and 11,121 owner fixture parity checks all pass. The owner fixture suite is separately scoped from the more severe independent collision mismatch; its pass does not erase that mismatch. Receipts: `evidence/final-owner-numerical-regressions.log`, `final-owner-replay/reports/oracle-parity.json`, and the reports beside the copied tests.

Execution environment: Node v24.19.0; Python 3.12.14; NumPy 2.3.5; SciPy 1.17.0; mpmath 1.3.0. Numerical libraries were constrained to one thread. No package installation or outside reference-code download was performed.

Final independent receipts: `evidence/final-numerical-report.json`, `final-conventions.json`, `final-evaluation-report.json`, `final-materializer-report.json`, `final-freeze-review.json`, and `worker-review/final-summary.json`. Full independent raw requests/results are `evidence/final-inputs.json` and `evidence/final-outputs.json`; they are evidence, never hidden runtime lookup tables. Earlier snapshots, raw mismatches and regression failures remain available in this directory.
