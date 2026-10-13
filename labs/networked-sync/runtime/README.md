# Fresh reciprocal networked-ISAC JS kernel and Worker

Version 0.1 is a dependency-free, source-derived numerical port of the accepted
`networked-sync-reference` receiver for arXiv:2607.18680v1. It actually generates
or accepts two complex MIMO-OFDM tensors, removes known pilots, obtains a
three-axis-smoothed algebraic initializer, executes A/B/C least-squares and
Vandermonde projection steps, associates reciprocal paths, and estimates
clock offset, CFO, delay, Doppler and receive angles. No stored factor or
estimate is substituted for fresh computation.

This directory contains no UI and changes no application repository, remote,
Codex task, published site, or source-paper file. The browser-specific loader
is exercised in a VM and actual Node worker_threads are exercised. An actual
browser/device, site integration, accessibility, and live RF data are **not**
validated here.

## What is and is not equivalent

- Fixed source: https://arxiv.org/html/2607.18680v1
- Accepted independent Python core SHA-256:
  `88a161d7d7d55ad4a2e703b0afb590c69644b0c61eaf370c2f6f519fc650f10e`
- Parent reference freeze:
  `94f0c92acb978981a0fe5d4891fe95acb5d8ce557f5b92ca6a84dc9d2637e3ab`
- Final independent reference review freeze:
  `5a67ab96fb867c6a1412c7d4cb7a6982184d880fa328572b13621318ba32ddd1`
- The JavaScript uses the same rad/sample, receive-ULA and ordinary transmitter
  transpose conventions; the same C-order Khatri-Rao/unfolding; the same
  4×8×5 smoothing window; and the same principal-phase reciprocal formulas.
- The scalar projector uses the **same oversampled FFT, every sampled local
  maximum, and continuous complex-correlation objective**. An original
  bounded golden-section optimizer replaces SciPy's bounded scalar optimizer.
  This is an explicit numerical engineering change, not exact implementation
  identity, a grid-only projection, or a polynomial/global-optimality proof.
- Numerical safety rejects an observed retained covariance eigenvalue at or
  below 1e-13 of its leading value, rank-deficient gain or mode designs,
  defective/ill-conditioned shift mixing, or failed convergence certificates.
  The accepted Python can return arbitrary null-space factors in some such
  cases. These are explicit retained numerical failures, never hidden success.
- The initializer is the accepted three-axis-smoothed CP **variant**, not a
  certified reconstruction of the unspecified authors' CP-VDM baseline.
  Appendix-B ESPRIT-LS retains the declared right-singular-vector conjugation.
- Unit-modulus nonzero known pilots are required. Python's more general pilot
  divider is intentionally narrowed, avoiding a falsely iid post-division
  noise claim for nonunit pilots.

This is not exact Figure 2/3 reproduction, complete-paper reproduction,
authors' code equivalence, a global optimum, CRB attainment, tracking,
real-time performance, or a hardware experiment. The accepted 432-pair
reference sweep is separate historical evidence. Its 64 increased sweeps and
283 increased substeps are not discarded or converted to a monotonicity claim.

## Bounded configuration

- Default shape 6×12×8, known rank 2, 8 sweeps
- Integral dimensions M=4…10, N=8…36, K=5…20; rank 1…3; sweeps 1…20
- Original 10×36×20 dimensions independently oracle-tested for ranks 1/2/3
- Tolerance 1e-10…0.1; default 1e-4; oversampling 8,16,32; default16
- Bandwidth 0.1…100 MHz; carrier 1…100 GHz; spacing 0.25…1 wavelength
- Seed uint32; source-defined SNR -25…40dB; offset ±1µs; CFO ±20kHz
- Observation real/imag entries ≤1e6 absolute; reject nonzero arrays whose
  largest entry is below1e-12. Zero data are accepted and produce explicit
  numerical failure. Reject sparse, nonfinite, mismatched and missing data
- Full arrays may be retained on demand with `trace:'full'`; summary does not
  provide projection curves. Max history JSON64MiB; see worker/FORMAT.md

These numerical bounds are input/resource limits, not physical guarantees.
For example some allowed clocks and sampling settings alias. Generated data
reports composite phases and principal-interval validity; estimators never
unwrap using truth. Close/degenerate/zero/phasewrap scenarios are deliberate
stress cases, not source-distribution experiments. Source dimensions at the
rank/sweep cap are measured below; not every Cartesian combination is an
accuracy claim.

## Data path, fairness and truth boundary

`generate` synthesizes a fresh scene, ordinary-transpose beam gains, QPSK
pilots, complex Gaussian noise, and reciprocal offset signs. A documented
Mulberry32+Box-Muller PRNG gives deterministic platform-local regeneration.
Changing SNR reuses unit noise; changing clock/CFO resynthesizes the physical
observation with other scene inputs and unit noise unchanged. The geometric
sampler is original engineering scope (not the paper's uniform/rejection
sampler); coordinates scale with (N-1)/35 for compact ordinary defaults.

`held` reruns the receiver on exact supplied data. Generation settings in
observation metadata are immutable: changing SNR, seed, clock/CFO or scenario
requires `generate`. Physical sampling metadata must match. Solver settings,
known rank, trace mode and iteration settings may change. A held result has
no truth or evaluation attached, even if its data came from this generator.

All four methods see exactly the same pilot-divided tensors and rank:

1. Smoothed algebraic CP variant
2. SCPD Algorithm1, using that computed initializer
3. Appendix-B ESPRIT-LS
4. Unstructured ALS diagnostic, using the identical initializer, iteration
   cap and tolerance (actual stop counts can differ)

Initialization cost is included in both SCPD and ALS reported costs, even
though the shared initial solution is computed once. No ground-truth gains,
angles, offsets, labels or restart selection enter a receiver. Truth exists
only in generator output and the separate evaluation function. Each method's
numerical failure is retained. Geometry success is the source path-length
filter, separate from clock/CFO errors and the explicitly non-source gross
error diagnostic. A numeric completion need not be geometrically successful
or accurate. No-output errors are null rather than fabricated zeros.

Every projected substep and normalization residual is retained. There is no
monotone rollback, best-truth iterate, hidden restart, or local-minimum claim
from stopping alone. CP column scaling/permutation, phase periods,
half-period reciprocal aliases, array sin-angle branching, and ambiguous
association remain explicit. Spatial angle clipping is reported.

## Use and reproducibility

Runtime entry points are `js/receiver.js`, `worker/receiver-worker.js` and
`worker/client.js`. CommonJS is supported directly; browser scripts expose
UMD globals with only local relative dependencies. See HANDOFF.md and
worker/README.md for contracts. No npm dependencies, installation, network
fetch, evaluation service or Python subprocess is used by the runtime.

Run all checks from this directory:

    bash run_all.sh

Python regeneration requires NumPy and SciPy. The portable evidence includes
the accepted original Python receiver under tests/reference, SHA-256 checked
before oracle use; it includes no paper PDF/text/figures or third-party
CP-VDM code. Numerical fresh fixtures use different seeds from the accepted
432-pair sweep. Test fixtures are oracle evidence, never runtime inputs unless
an explicit held request supplies them.

Reports and exact freeze hashes define what was tested. Development changes
and caveats are in DEVELOPMENT-FIXES.json. Source-free runtime and full-evidence
archives are independently integrity-checked by tests/package_artifact.py.
