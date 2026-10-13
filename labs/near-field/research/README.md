# Near-field research interaction

Canonical page: `near-field.html#research-experiment`. This is a local, additive implementation on the accepted Git tree recorded in `BASELINE.json`. The anchor commit is not a replacement for that accepted tree. No existing worktree/ref was changed, no commit or publication was made by this implementation task.

## Scientific scope

Fixed source: [arXiv:2302.01153v5](https://arxiv.org/html/2302.01153v5). N=65, D=.5 m, wavelength=.0107 m, K=4, T=256. Actual source covariance optimization and Eq.21 factor recovery feed an independently checked finite X, proper-complex noisy Y, and a truth-blind Y-only covariance MUSIC receiver. The objective is the source's unnormalized `CRB_r [m²] + CRB_theta [rad²]`; its small angular term is not relatively certified by the total-objective gap. Known-X nominal-point Fisher/CRB and covariance-only MUSIC use different information.

The original `#geometry` / `#experiment` retain their byte-identical one-way noiseless material, 21 IDs, N/spacing/wavelength/broadside convention and controls. The new controls never write to the old model. Fragment navigation reveals the optional prerequisite without rebinding its controls.

Default input: nominal 20 m/45°, actual truth (14.2,14) m, actual beta=1e-5 exp(.37j), noise variance1e-9, seed230201153, .2 m grid and refinement. The truth is on the .2 m grid and off the .08 m grid. All four source rates are5 bit/s/Hz. Explicit receiver caps are refinement80, eigen60, listed maxima8, wall30000ms; solver caps are240 iterations/30000ms. These caps are visible/applied values, not a performance guarantee. No batch or plane-wave button is supplied because the accepted experiment controller has no such operation.

## Ownership and runtime authority

- `entry.mjs`: scoped DOM binding, import/download, controls, legacy fragment reveal and teardown
- `controller.mjs`: frontend invalidation/draft/lifecycle/import-race gates; delegates scientific work to the original `Experiment`
- `defaults.mjs`: reviewed raw input channel specimen; returns a fresh input copy, never a saved optimizer result
- `view.mjs`: actual-data-only plots and numeric alternatives; inert historical text, no historical-current promotion
- `research.css`: scoped desktop-first layout and narrow-screen fallbacks
- `runtime/`: all22 reviewed source/runtime/freeze hashes remain byte-identical; `runtime/CHAIN-FREEZE.json` is the authority

The frozen `src/worker-client.mjs` deliberately retains its reviewed two-endpoint module-worker factory; the original `Experiment` constructor and import path are not reimplemented. Build integration must use a narrowly hash-bound policy for the exact solver/receiver endpoints and seven fixed browser UMD imports in `solver-loader.mjs`, rather than pretending to infer arbitrary dynamic URLs. There is no remote service/PDF/Python/archive startup dependency.

Optional complete evidence archives are provided by shared integration as exact reassemblable parts. The live-chain archive SHA256 is in `BASELINE.json`; it has106 manifest-listed files and107 archive members including its manifest. No evidence fixture is used as a fresh result.

## Operations and trust

- Solve runs the actual combined solve → finite-X check → observation operation
- Scene edits preserve the beam but invalidate Y; seed/variance changes replace noise, while truth/gain changes retain raw Z
- Receiver edits hold Y byte-for-byte and invalidate only receiver/evaluation results
- Cancel/replacement/reset/import invalidate late operation responses and late errors
- Failed Workers are replaced through the original accepted factories before retry
- Invalid field drafts block run/export and remain invalid across edits to another field in the same group
- Import checks file size before reading, then enforces the same16MiB UTF-8 codec cap used for export
- Full records retain raw X/Z/Y; diagnostic records have raw=null and not_included downstream stages
- Imported optimizer claims remain historical_unverified until a fresh solve; raw audit and raw-Y rerun have their own trust states
- Repeated full exports flatten replaced history, without recursively accumulating old spectra

Plots use actual geometry, trace rows, beam powers, Re/Im(Y), eigenvalues, raw MUSIC denominators and refinement endpoints. Truth appears only after inference for evaluation. Failure, boundary, capped, weak-separation, ambiguity and poor-error states remain visible. No manufactured refinement path, animation, repeated-trial history or figure-reproduction claim is made.

## Verification commands

From the canonical repository root:

```sh
node --test labs/near-field/research/tests/*.test.mjs
node labs/near-field/research/tests/measure-node-cost.mjs
```

Shared integration owns the root aggregate wrapper, exact compatibility mappings and canonical build. Its final gate is `node scripts/build-compatibility.cjs --test --reproducible`, followed by `--check`. Tests in this directory are local verification tools, not browser startup dependencies.

The separate VM test runs Node with process/module/require absent, exercises the browser-specific UMD load order, and invokes the actual postMessage/onmessage worker branches. It is explicitly not an actual browser test. Actual Node Worker tests exercise the separate Node/CommonJS branch.

`reports/node-cost.json` records a single observed Node run: about36ms finite-X check,77ms raw audit,110ms export at251001 points, and7.21MB complete JSON. These are observations, not percentiles, guarantees or browser timings. Finite-X construction, auditing, import/export and rendering remain synchronous in the caller. The source Worker setup/step/assessment are cooperatively bounded, not hard-interruptible. Actual browser/CSP/layout/keyboard/desktop/narrow-screen latency acceptance and publication remain unperformed here.

## Record-boundary patch v1 (2026-10-13)

The original CHAIN-FREEZE, MUSIC-FREEZE, SOLVER-FREEZE and CONTRACT identities
remain historical evidence. They do not assert that the current replay codec is
byte-identical. IMPLEMENTATION-FREEZE.runtimeBoundaryPatch records the exact
reversible old-to-current replay delta and both identities. All scientific
solver/receiver/generator, adapter and Experiment bytes remain unchanged.

An allowed noiseless covariance can yield a nonpositive/tiny numerical median
eigenvalue. The frozen optional principal/max(median, Number.MIN_VALUE) ratio can
therefore overflow binary64 to positive Infinity. Full record export now encodes
only outputs.receiver.noiseMedianEigenvalueRatio (also beneath repeated historical
wrappers) as {diagnosticEncoding: "nearfield-positive-overflow-v1", value:
"+Infinity", reason: "principal_over_clamped_median_overflows_f64"}. Both encoder
and importer require 65 finite ascending normalized eigenvalues and independently
check the same overflow formula. This is a transport representation, not a
physical infinite SNR claim. No raw arrays, spectra, estimates or statuses change.
All other nonfinite values and misplaced/malformed tags remain rejected. The
importer restores this optional diagnostic to Infinity for display/re-export;
all imported conclusions remain historical_unverified until their respective
explicit recomputation. Older unpatched importers cannot interpret this new tag;
use this version for overflow-bearing records. Ordinary finite records retain
the original byte encoding. Historical archives and browser evidence are not
rewritten or upgraded by this patch.
