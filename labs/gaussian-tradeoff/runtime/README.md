# Gaussian ISAC live numerical Worker

A dependency-free ES-module numerical implementation of the bounded operational model derived from arXiv:2204.06938v8. It executes fresh complex-matrix calculations from serialized inputs. It does not load result tables to answer inputs and contains no UI implementation.

## What runs

- Source (48) covariance shaping for an isotropic proper-complex sensing prior: arbitrary bounded complex H, continuous finite κ in [0, 10⁶], and the separate communication-only endpoint
- Actual complex covariance/eigenvectors, full matrix gradient, power feasibility, and convex supporting-plane global gap certificate
- Exact Gaussian-input log-determinant MI expression, evaluated with signal-eigenvalue log1p to retain very small SNR
- Unnormalized iid complex Gaussian blocks and random complex Stiefel blocks sharing the same Q and expected power; seeded common draws across weights
- Actual X, R=XXᴴ/T, Y and posterior estimate; full complex row/column covariance and direct real-coordinate BFIM; truth is isolated in evaluation records
- Proper-prior finite-T null-direction error, explicit infeasible Stiefel ranks, improper-prior posterior identifiability checks, and conditioning/certificate failure states
- Finite-dimensional isotropic Wishart spectral integration, its refinement/mass diagnostics, and a separately labeled MP approximation
- Rank-one complex-sphere finite-SNR MI quadrature, with refinement, radial mass and tail-probability diagnostics
- Real browser-module/Node Worker entry point, cooperative cancellation, valid-only supersession, rejection-preserves-current, death/restart and strict immutable SHA-256-bound records

## Quick use

```js
import {makePreset} from './presets.mjs';
import {createWorkerClient} from './runtime.mjs';
const client = await createWorkerClient();
await client.ready;
const input = makePreset('teaching');
input.kappas = [0, 0.37, 3.14159, 100, 'communication-only'];
input.selectedIndex = 2;
const request = client.run(input);
const terminal = await request.result;
if (terminal.type === 'complete') {
  console.log(terminal.result.result.shapes);
}
await client.dispose();
```

Serve these ES modules from an ordinary same-origin HTTPS application or localhost with a JavaScript MIME type; instantiate a module Worker. `createWorkerClient` uses the actual browser `Worker` when available and `worker_threads` only in Node. WebCrypto is required for canonical SHA-256. The browser import route was executed in a JavaScript module VM without Node globals; no actual-browser rendering, browser performance, or UI acceptance is claimed.

For raw input replay use `encodeRecord({input}, 'raw')`. For historical results use `encodeRecord({input,result}, 'history')`. Serialize using `canonicalStringify`, never ordinary JSON.stringify, to retain signed zero and exact hashes. History is explicitly not fresh execution. Read `PROTOCOL-HANDOFF.md` before integrating.

## Available presets

`makePreset` returns a new editable ordinary input:

- `teaching`: exact reviewed complex 3×4 DFT-basis H; M=4, Ns=2, T=8, PT=1, noise variances .7/1 and prior variance 1.3. This is an instructional example, not Fig.10 or Fig.11
- `figure10-total` and `figure10-per-antenna`: the same frozen first channel from seed 91021 in the accepted reference, M=Nc=Ns=4, T=16. The unresolved 24 dB convention is exposed as PT=10²·⁴/4 or 10²·⁴. These are single-channel computations, not fading expectations
- `figure4-M2`, `figure4-M4`, `figure4-M6`: fresh Wishart computations at T=4M. `makeFigure4Inputs()` returns the 39 finite-integral input points; it contains no output ordinates
- `sphere-rank-one`: separate rank-one T=4, SNR=1 MI integral

The accepted offline two-seed fading experiment is linked by source/core/archive hashes, not presented as a live fade average.

## Input and numerical budgets

Tradeoff: M,Nc,Ns ∈ [1,6], T ∈ [1,32], B ∈ [2,512], 1–16 weights, finite κ ∈ [0,10⁶]; |each H component|≤64; PT∈[10⁻⁴,10³]; each prior/noise variance∈[10⁻⁵,10⁵]. B·(weights + optional custom Q)·M·T≤1,600,000. Optional custom Hermitian PSD Q must have the requested trace within a representational tolerance. Hermitian relative error must be ≤10⁻¹¹. PSD eigenvalues below −10⁻¹¹·max(1,λmax) reject; tiny negative roundoff is clipped to zero in spectral factors, never a positive mode. Custom trace error must be ≤10⁻⁹·max(1,trQ). Exported feasibilityResidual is consistently relative, |trQ−MPT|/(MPT), and actual waveform covariance deviation is visible. The selected custom covariance index is `kappas.length`. A custom Q has no optimizer certificate.

Wishart: M,Ns≤6, T≤32, q/noise∈[.01,100], prior variance∈[.001,1000]. Sphere: T≤16 and SNR∈[0,100]. These are implementation limits, not paper parameters. All dimensions and parameters remain in exports.

Inversions reject nonpositive matrices or condition numbers above 10¹²; covariance shaping rejects a relative supporting gap above 10⁻⁸ or relative power error above 10⁻¹⁰. Such failures remain terminal errors. Input bounds do not promise every combination is well-conditioned. No loading, channel resizing, Gaussian power normalization, positive-mode deletion or weaker certificate fallback is applied.

Every positive covariance eigenmode is retained. If rank(Q)>T, the Gaussian law still runs under a proper prior while Stiefel is explicitly `unrealizable`. Standalone improper-prior posterior inputs require full identifiable row rank and reject ambiguity. Tradeoff/Wishart operations require proper finite priors.

## Scientific labels and nonclaims

Gaussian MI is an exact model expression for Gaussian signaling. The covariance outer pair combines Jensen sensing and Gaussian-entropy rate and is not generally jointly achieved. Gaussian mean error and truth-only MSE are finite Monte Carlo estimates with sample count, raw per-block statistics, seed, mean and SE. Gaussian block power genuinely fluctuates; Stiefel sample covariance is fixed.

The finite Wishart and rank-one sphere formulas are exact model expressions evaluated numerically. Reported quadrature/refinement errors are diagnostics, not interval proofs. The omitted radial probability bound does not bound omitted entropy. MP is an approximation. No full-rank MIMO finite-SNR Stiefel MI, certified achieved hull, p(X)-optimized region, finite-length code or full-paper reproduction is implemented. A known deterministic waveform has zero data MI; random fixed-covariance signaling need not have zero MI.

The prior is isotropic iid proper-complex Gaussian, not an arbitrary prior covariance. Source Eq.109's sign, Eq.93–94's coordinate/prior conflicts and the Pt/PT convention remain documented in every result. The direct real likelihood and Eq.95 trace are the operational reference.

## Tests

Run `bash run_all.sh`. Node 24 and Python 3.12 with NumPy/SciPy are used for the recorded gate; runtime has no npm or Python dependency. `oracle/reference/core.py` is the unchanged independently implemented reference, not author source code. The portable oracle generator imports that copy by exact SHA-256.

See `NUMERICAL-VERIFICATION.md`, `DEVELOPMENT-FIXES.json`, `SOURCE-FREEZE.json`, `ARTIFACT-MANIFEST.json`, and reports. All benchmark values are actual Node Worker observations, not browser timings.
