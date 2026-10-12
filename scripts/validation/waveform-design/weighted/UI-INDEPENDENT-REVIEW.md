# Independent review: weighted waveform shared-input integration

Date: 2026-10-12

## Verdict

**Accept the frozen model, classic Worker pipeline and controller integration for the reviewed weighted-waveform scope. No blocking finding remains.** This accepts the non-browser numerical/dataflow/state gate only. It does not certify rendered browser behavior, accessibility, network delivery, combined site build, deployment, or reproduction of the original Fig. 3.

The weighted numerical core is byte-identical to the separately accepted implementation. The strict numerical core is unchanged. No owner source file was modified by this review, and no browser, headless browser, GitHub write, or publication action was used.

## Tested runtime identity

- `weighted-core.js`: `70f720a7f67f95b139f31171370d86e9e348bf9a91b4a0d0c38717a66cf5a6a3`
- `procrustes-core.js`: `a844089a501bec61002fe8562f54314c04bc4f27b622033c3995052770b050c6`
- `waveform-live-model.js`: `b282e2cd303f1a49e7bdf51b184e68b5f65e05177f599f990b570bc743bd04eb`
- `waveform-live-worker.js`: `24f909ddac2a9bc719d4fbac59544c981ae9b5a571eec205781fe1ed9885a597`
- `waveform-live.js`: `4721fd15d7ff66621706c3146b71fbaad16568cc582128bfea5b8728dbc9bd7f`
- `waveform-design.html`: `1b6ba87efb7029b42ee8b85b03ec24324455fe102260456e2d090cd7089f923b`
- `waveform.css`: `07d222924fb87c21765365ec4aa8db279e5de069d7eef5015c74a9a8a0f4fc61`

Tests used Node v24.19.0, NumPy 2.3.5 and SciPy 1.17.0. Hashes identify the files reviewed; displayed algorithm hashes remain identity metadata, not runtime cryptographic attestation of every loaded asset.

## Independent Worker and numerical evidence

The exact classic Worker source ran in real Node worker threads, with a small `self`/`importScripts` host adapter. PostMessage used actual structured cloning and the cryptographic digest used Node WebCrypto. The adapter instrumented solver entry points without modifying their files. This tests genuine asynchronous Worker execution and termination, but is not an actual browser Worker or network-loading test.

- **33 independent Worker checks**
- **26 fresh arbitrary-complex H/S/R problems and 107 actual weighted solves**, generated with a new deterministic xorshift32 seed `56c937a1`
- Dimensions include source-sized N=16, K=4, L=20 problems, varying smaller shapes, arbitrary positive-definite correlated R, zero H, zero S, both endpoints, near-one rho and both tie conventions
- The first strict solve consumes exactly the submitted H/S/R; the additional zero-objective strict call constructs the existing DFT teaching reference
- Every weighted call receives the same H/S and the exact object returned as that request's fresh strict X0. One strict anchor is reused across the sweep. A selected rho already on the grid is solved once, while an off-grid selection produces exactly eleven points
- Exact input/request signature and SHA-256 values checked; input-only deterministic replay reproduces strict and weighted matrices
- Weighted magnitude rejection, tiny-energy rejection, missing weighted asset and injected fourth-point failure all preserve the newly computed strict result. No incomplete selected/sweep arrays survive. Missing crypto is explicitly marked unavailable
- Invalid rho yields a Worker error before weighted computation

An independent NumPy/SciPy pass recomputed the actual strict covariance and SVD objective bound, weighted energy, MUI, waveform distance, objective, received symbols and covariance. Original complex KKT and shifted-PSD conditions were independently checked, without reusing the JavaScript real-embedding eigenvalues. Every weighted point was also compared with the frozen independent Python eigensecular reference using the same actual X0.

Maximum observed quantities across 107 points:

- Coefficient-scale-normalized objective difference from Python: **7.998e-15**
- Relative weighted energy residual: **1.141e-13**
- Relative strict covariance residual: **2.395e-15**
- Independently scaled complex stationarity residual: **2.898e-15**

These are finite floating-point checks, not a proof of waveform element accuracy in near-hard problems. The prior numerical-core approval and its mathematical qualifications remain in force.

## Independent controller and export evidence

**40 independent checks** executed the unchanged controller with a purpose-built non-rendering DOM and controlled delivery of results computed by the exact Worker source in Node worker threads. The DOM adapter respects disabled-button clicks and replacement/text clearing. It does not perform layout, keyboard, screen-reader, CSS, screen capture, navigation-history or browser security checks.

Passing flows include:

- Fresh source-size off-grid sweeps; exactly ten grid rows plus the separately selected actual solution; finite SVG geometry under simulated 240, 390 and 1100 pixel widths
- Queued completed results rejected after rho/tie/H/S/R/seed edits, Reset, small/paper presets, zero-channel action, either Cancel button and pagehide
- Double-run strict/weighted races: old results cannot replace a newer request, including after the new request finishes
- Mismatched rho, sweep mode, H, signature and failed status rejected
- Actual worker-thread termination before result delivery
- Weighted range, asset and mid-sweep errors preserve visible strict output, keep both downloads disabled for that failed combined request, and allow a new strict-only solve/download
- Invalid/blank controls and unavailable Worker construction produce no successful result
- SNR, matrix, user, antenna and resize changes do not launch a new solve
- Eventless changes to rho, tie or manual matrix content are caught before download
- Downloaded JSON retains full-precision top-level H/S/R, actual fresh strict X0, selected and all sweep matrices, HX, covariance, metrics, certificates, diagnostics, tie conventions, full request identity and current SNR diagnostic
- A new UI instance reimports that complete downloaded record, ignores forged X/X0/old-result fields, uses explicitly chosen current controls and recomputes identical strict/selected waveforms

The same generated source-size input was independently run through both endpoint selections. At energy 20, canonical and radar-closest MUI were approximately 3.93e-27 and 3.74e-27, while waveform distances were **27.0776194** and **0.6647170**. This confirms the displayed distinction between equal primary communication optimality and different secondary waveforms. It is not evidence that rho=1 always gives zero MUI. A near-one canonical run also retained the explicit numerical-branch and waveform-accuracy qualifications.

## Scientific and teaching checks

The controller and page explicitly distinguish:

1. Current strict X0 from the DFT teaching reference and from imported old X
2. Strict covariance equality from the wider weighted total-energy equality set
3. Raw objective terms from display normalizations; rho from a communication-power allocation
4. Waveform distance from pattern MSE or detection loss
5. Objective/energy certification from exact branch classification or near-hard waveform accuracy
6. Source regular eigensecular steps from explicit hard completion and the added radar-closest secondary convention
7. Deterministic finite-block Gaussian-log-rate diagnostics from optimized sum rate, QPSK information, BER or measured throughput
8. A source-parameter slice from the unresolved original weighted Fig. 3 mismatch, including sampling and digitization uncertainty

The mismatch remains prominently visible: disclosed 10/12 dB means 12.882/14.831 versus approximate original readings 13.36/15.59. This review does not close it or support tuning rho to make the plots match. Constant-modulus design and unimplemented full-paper branches remain outside scope.

## Existing regression rerun and remaining gates

The five relevant author suites were independently staged into their required legacy layout and rerun: **94/94 pass** (29 strict, 37 weighted-core, 12 composition/Worker and 16 UI tests). This is a focused rerun, not the site's full aggregate build.

Required later gates:

- Combined manifest/catalog/link consistency and full reproducible site build
- Supported hosted-browser desktop/narrow-screen layout, keyboard and actual browser Worker/resource loading
- Browser download usability, published resource identity and post-deploy fresh-input checks

The independent scripts, new inputs, actual outputs, downloaded record, endpoint records, logs and exact source snapshot are retained in the review evidence bundle. Reproduction uses `review-worker.cjs` with the runtime directory, `review-ui.cjs` with the authoritative source root, and `check_fresh_worker.py --reference <frozen reference.py>`. The Node Worker host is `worker-host.cjs`. The reviewed source files must match the hashes above.
