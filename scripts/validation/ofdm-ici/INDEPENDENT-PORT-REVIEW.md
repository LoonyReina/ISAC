# Independent review of the bounded OFDM ICI JavaScript/Worker port

## Decision

**The frozen bounded numerical port and the checked Node Worker/client behavior pass this independent review.** Two concrete defects found during review were fixed by the implementation owner and rechecked on the frozen runtime: queued completion after cancellation, and inconsistent CFO alias-zone metadata.

This accepts the checked **N=64, M=16, NR=NT=8, L=12 finite-grid implementation** as a source-derived mathematical demonstration. It does **not** establish actual-browser execution, UI correctness, original-paper figure reproduction, original-size performance, or calibrated achieved false-alarm probability. The browser importScripts branch was exercised in Node VM only. No browser, UI repository, remote, or deployment was used or changed.

Source is fixed arXiv:2103.15694v1. The accepted Python core is `fee9e4a55707fe251f73bf343d0ac0142607d6c827cfd4e8bd0c974bba439cdb`; the preceding independent Python review remains separate evidence. This review did not substitute its acceptance for JavaScript testing.

Reviewed JavaScript kernel: `3c9e13e8bbd478802c4292999c7633b4e35dba7f2b7a861e7413dce43ac5ddbe`.

## Evidence and reproducibility

All review writes were confined to this directory. A complete candidate copy was made under `frozen-candidate`; its six runtime hashes matched SOURCE-FREEZE.json before and after the full test sequence. The owner files were only read. Python runs used single-thread OpenBLAS/OMP/MKL and disabled bytecode writes for owner-reference imports. A sibling symlink gives copied author scripts read-only access to the pinned reference.

Independent tests use fresh seed 731941867 and do not import the owner's fixture generator or reuse its numerical test inputs:

- 4 grouped fresh operator suites: dense observation/counterfactual, pilot subspaces, original-Y joint fits, and high-precision/clustered algebra
- 8 fresh complete receiver runs: **356 of 356 emitted shape-tagged array objects independently checked, zero unchecked arrays**, plus 2,219 scalar checks
- 20 independent support-aware CFAR window/edge/wrap/tie tests
- 28 rectangular assignment objective tests against SciPy
- 18 fresh evaluation tests retaining duplicate detections, missed targets, null conditional RMSE and physical FFT alias errors
- 11 SHA-256 block/padding-boundary comparisons against Python hashlib
- 9 literal ambiguity-rule/metadata consistency cases
- Actual Node cancellation at CFO-search, joint-refit and recovery checkpoints; supersession; distinct time-cap error; exactly one terminal per accepted run; no output after terminal
- Separately labelled deterministic queued-delivery fixture for the cancel/reset race

The full author suite was then independently rerun on the copied frozen candidate. This is regression replay, **not a claim that author-authored tests become independent oracles**:

- 265 NumPy/SciPy algebra cases and 55 algebra API/error contracts
- 17 numerical input fixtures, including the held mechanism, pass; 985 real/imaginary component-array comparisons in that script
- 17 kernel tests, 2 native-JavaScript generated-input re-executions against Python, and 15 Worker/client tests pass, no skips
- Fixture integrity: 697 stored arrays, 34 dense observations, 58 dense RD maps and 24 joint invariant checks
- 58 source evaluation comparisons and 500 brute-force assignment cases
- Full maximum exposed resource benchmark completes with all 3,164 CFO evaluations and all seven P=4 caps retained

Commands from this directory:

    bash run_review.sh

Or independently:

    export ICI_PORT_ROOT="$PWD/frozen-candidate"
    export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 PYTHONDONTWRITEBYTECODE=1
    python independent_port_numerics.py
    python verify_fresh_stage_arrays.py
    python verify_boundaries_and_evaluation.py
    node verify_worker_causality.cjs
    (cd frozen-candidate && bash run_all.sh)

`final-review-run.log` records the complete exit-success run. Later final operator/stage rechecks add high-precision error records and apply the exact source association gates outside inference; their logs are `final-operators-recheck.log` and `final-stage-recheck.log`. Node was v24.19.0; Python numerical package versions are in independent-numerics.json. These timing observations concern this cloud executor only.

## Independent mathematical checks

### Observation and complex conventions

An explicitly formed unitary dense DFT reproduces the actual simulator, including complex reflection/transmit gains, positive and negative CFO, fractional delay, the CP endpoint, receive steering and identical noise. ICI-free reconstruction removes only the intra-symbol Doppler while retaining X, noise and slow-time phase. Worst observed relative error was 1.11e-14.

For Y with sample rows and antenna columns, MUSIC uses YᴴY and the conjugated steering convention. Covariance, certified eigensystem, noise projector, all grid spectrum values, MDL arithmetic, selected angles and included endpoints were checked. A separate QAM two-signal case leaves music_order null: order and angles are inferred from observed Y. Other declared-order operator cases remain explicitly conditional; none passes truth into inference. The operational FFT uses the identical X/Y and observed MUSIC candidates, including known-X division. Its receive sum is unnormalized; raw FFT/APES gain scales must not be treated as identical.

### Pilot projection, equality constraints and joint refits

Fresh pilot profiles included random unit phases, nonconstant amplitudes and log-uniform amplitudes spanning exp[-7,5]. Dense pilot matrices and SciPy SVD least squares independently reproduce coefficient recovery, the projection and its orthogonal residual. Worst relative coefficient/projection errors were about 1.35e-14.

The independent joint oracle does not call the production covariance profiler or constrained solve. It forms each multi-CFO pilot matrix, residualizes with SVD left singular vectors, eliminates the equality aᵀv=1 with a nullspace basis, and solves the free coordinates by least squares. Supports of sizes 1, 2, 3 and 4 agree in covariance, beamformer, all channels, scalar and full-cube models, residuals and objective. Duplicate and nearly duplicate CFO blocks fail explicitly under the source rank threshold. Worst joint-channel relative error was 2.04e-14.

Every accepted support in the fresh full runs was reconstructed against ORIGINAL Y, rather than the current residual. The complete reported intermediate array inventory was compared to independent definitions: OMP input residual/R/Capon beam, every CFO grid cost, selected Q/beam, all joint arrays, frequency channels, RD power and support-aware CFAR threshold/count maps. Distortionless, normal-equation and objective invariants were also recomputed.

### Conditioning and algebra

Fresh clustered/repeated/indefinite complex-Hermitian matrices and near-cutoff singular spectra were checked against SciPy LAPACK. Singular-value oracles do not form AᴴA. Both sides of the source 1e-11 rank cutoff were tested; exactly-on-cutoff classification is not asserted.

An 80-decimal-digit solve on independently constructed double-precision Q/a entries checked constrained costs and beamformers. For eigenvalue ratios 1e-3, 1e-7 and 2e-11, respective relative cost errors were 5.83e-15, 1.17e-10 and 5.71e-7. At the most ill-conditioned accepted case (condition approximately 5e10), beamformer relative error was 1.78e-8. This is explicit conditioning degradation, not a guarantee of uniform 1e-12 forward accuracy. The 0.5e-11 case is rejected. High precision applies to matrix algebra on double inputs, not an 80-digit waveform simulation.

All 356 fresh emitted array objects passed; their largest recorded norm error scaled by max(1, reference norm) was 3.70e-13. Including scalar/vector diagnostics, the largest recorded scaled discrepancy was the well-conditioned MDL score at 2.17e-12. Primary tests use explicit relative/absolute tolerances; they do not silently relabel a nonfinite or shape mismatch as a pass.

### CFAR, ambiguity and evaluation

The CFAR oracle enumerates the entire valid L×M cell domain using independent range/wrapped-distance predicates. It checks boundary truncation, unique wrapped cells, narrow/wide guards, structural-zero exclusion, ties and zero maps. A very large value outside retained delay support does not enter training or detection.

Dense Fourier RD scores check complex gains, signed Doppler bins and source CFO unwrapping. Both final alias metadata fields now use the exact same floating-point division/floor expression as the estimate. No nearest-alias repair was introduced.

One-to-one source association is performed only after estimation. Independent assignment tests compare optimum cost, allowing different equally optimal pairs. Duplicate detections count as false; misses stay explicit; no-hit conditional RMSE is null. FFT association uses ambiguous Doppler but reported physical velocity errors preserve the alias penalty. Source-style and conventional FDR denominators remain distinct and neither means achieved per-cell Pfa.

## Retained outcomes

These are review cases, not performance curves or a tuned favorable benchmark. Association uses the accepted source gates: 1 sample, 1.5 Doppler bins, 2 degrees, one-to-one minimum-cost matching outside inference.

| Fresh case | APES hits / false / misses | Important retained outcome |
|---|---:|---|
| Mixed-sign CFO | 2 / 0 / 0 | Both signs recovered |
| Same CFO, different angles | 2 / 1 / 0 | Cross-angle false detection retained |
| Fractional delay and CP-valid delay outside L | 1 / 0 / 1 | Unsupported-delay miss retained |
| Four same-angle CFO components | 4 / 0 / 0 | P=4 iteration cap explicitly retained |
| Observed-MDL signal case | 2 / 0 / 0 | Model order inferred from Y; estimated angles −31° and 12° |
| Noise only | 0 / 0 / 0 | MDL=0, not Pfa calibration |
| Zero Y | 0 / 0 / 0 | MDL=0 |
| Rank-deficient Y | 0 / 0 / 0 | Both branches stop for rank-deficient covariance |

The rerun held finite-grid mechanism retains **4 hits, 3 false detections and 1 miss**, with a capped branch. It must not be relabelled as the earlier continuously refined Python mechanism (4/1/1). The prior unfavorable 96-trial Python results are not superseded by these port tests.

## Defects found and corrected

1. **Queued completion could escape cancellation in the client.** cancel() set cancelRequested and suppressed progress, but a previously queued complete event still resolved and reached onEvent as a result. The owner now suppresses complete when cancellation/reset was requested and resolves a cancelled envelope with queuedResultSuppressed. The payload is removed. The deterministic race regression and real Node cancellation paths pass. A queued result may already have finished computation; suppression is not misrepresented as interrupting a completed solve.
2. **Alias-zone metadata disagreed with the actual source unwrap at a floating boundary.** At CFO=2 and ambiguous estimate 0, floor((2+.4)/.8)=2 gives epsilon=1.6, while the former algebraically rearranged floor((2+.4)*1.25)=3 produced inconsistent metadata. A shared helper now supplies the identical division/floor operation to unwrap and both metadata fields. The literal source estimate is unchanged. `boundary-before-alias-fix.json` preserves the failure and the final boundary suite passes.

## Numerical and operational limits

- An exact rank-deficient fresh Y produced drastically different raw MDL scores between valid JS and LAPACK eigensystems because roundoff changes the sign of near-zero eigenvalues before the logarithmic tiny-value clamp. It was not accepted as score parity. The review separately verifies the score formula from the residual-certified reported eigenvalues; the declared-order downstream rank stops agree. The final runtime flags mdl_numerical_sensitivity. `fresh-stage-before-mdl-conditioning.json` preserves the initial discrepancy. Stable default-MDL behavior on arbitrary nearly singular inputs is not established.
- All-one symbols have a numerically flat CFO profile and arbitrary tied minimizers. Author fixture replay checks the profile and warning, not downstream minimizer parity. No CFO identifiability claim is made for this case.
- Fractional-delay mismatch, finite L beyond the CP condition, literal alias-boundary errors, rank failures, caps, false detections and misses remain substantive limitations.
- Grids are finite; there is no continuous refinement or global-optimum guarantee. Strong numerical-kernel tests do not turn this into a paper-figure reproduction.
- Default MDL/noise-only zero detections do not calibrate adaptive recovery-stage CA-CFAR or target-present false discoveries. No field-data, BER, communication or universal ICI-benefit result follows.
- The Worker does real event-loop cancellation and serializes runs. Its preflight cannot prevent the transport's initial clone. Export limits are not peak-memory guarantees. The client is a transport helper, not a tested UI busy-state implementation.
- Node benchmark rerun: held input 2.41–2.66 s; maximum forced 7-angle × 4-OMP case 10.08 s, 3,164 CFO records, 1,813,276 numeric scalars and 14,506,208 Float64 payload bytes. The largest observed checkpoint gap was about 203 ms. These are observations, not an SLA, browser measurement, heap peak or meaningful p95 estimate.
- Raw-import counterfactual pairing is caller-declared. Checksums verify input bytes, not their physical truth or authenticity.

## Pinned runtime and archives

| File | SHA-256 |
|---|---|
| js/ici-kernel.js | 3c9e13e8bbd478802c4292999c7633b4e35dba7f2b7a861e7413dce43ac5ddbe |
| js/linalg.js | c7e21dadbac282314c504c5f1b73a4de18964c18ee1d06cc34eedcce1d81509a |
| js/evaluate.js | bcf9be4cb478928e4744d3dea357e20b38f53b793f67a7a5f9e43c64255c51ac |
| js/sha256.js | 11ed1580ff4e1f5c627389c242079fc72595fd69bbf101c43c662aa61c01d657 |
| worker/ici-client.js | 1397e1f04bb674973fdebc29213c2531e8383b3aa3f959504761f65dcdf20b75 |
| worker/ici-worker.js | 864131d8d1d91658397a3ca7cd2f1e8cb55ab847a90c7d6c6ef6271d6e66f9fc |

The six runtime members were independently checked inside both final owner archives:

- Runtime ZIP: 39,075 bytes, `18ab507c0ce1157fb8e101bd6ad36805541a5262b9db03f1aa533a99e15acd68`
- Full-evidence ZIP: 29,312,807 bytes, `04fa174b39fc4e04d396910ac75d77e3a42298abcf12b10172b183e723098412`

`review-manifest.json` pins review scripts, reports, complete fresh outputs, logs, the source freeze and rerun evidence. `archive-runtime-verification.json` records the independently checked archive identities. No source PDF, paper text or private screenshots are included in the review deliverable.
