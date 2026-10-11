# Off-grid range mechanism: implementation validation

## Scope and release state

This record covers the bounded, independent mechanism `offgrid-range-model-v1`,
implemented on `feat/offgrid-range-error` from base
`3e4212195a5ee8b7256d42ef9d50cd29ca5af29d`.

It adds one case-free foundational mechanism and one page: 27 units, 15 cases,
32 concepts, 8 research directions, and 23 registered pages. No paper/case,
influential-paper card, external citation, source snapshot, map concept/edge,
or receiver paper-level item was added. The historical notebook manifests and
validation records remain historical and unchanged.

Implementation and command-line checks completed on 2026-10-11 UTC. This
record makes no browser, accessibility-technology, actual saved-download-file,
commit, push, CI, deployment, or live-site claim. Those release stages are not
part of this implementation worker's execution.

## Scientific contract

- One static, present monostatic target; rounded teaching c=300,000,000 m/s
- Same 16 complex OFDM observations for both estimators on each trial
- Equal-energy QPSK tones sum to useful normalized energy 1; CP is a complete
  repeated useful block with energy 1; total burst energy 2 and duration 2 μs
- Unknown complex gain is profiled independently at every candidate; the
  receiver receives Y and known design, never generator truth, true gain,
  noise variance, SNR, or random seed
- Closed shared [0,120] m search, 25 candidates at 5 m and 241 at 0.5 m
- 9.375 m is the finite-tone response first-null offset, not a measured
  two-target resolution or distance accuracy; ordinary errors are not wrapped
- Frozen RNG/domain, lowest-candidate numerical tie rule, directly evaluated
  complex residual, raw maximum versus selected score, every attempted row
- Strict predeclared gross-error criterion |error|>9.375 m; all finite outputs
  enter RMSE/bias, including distant and boundary estimates
- Incomplete/cancelled or numerically failed aggregates remain null, with an
  explicit status; partial success is never presented as the whole batch

## Fixed examples

| Preset | Truth / SNR / seed / B | Coarse RMSE (m) | Fine RMSE (m) | Gross counts |
|---|---|---:|---:|---|
| Noiseless | 43.7 m / null / 2026 / 1 | 1.3 | 0.2 | 0 / 0 |
| High SNR | 43.7 m / 10 dB / 2026 / 1000 | 1.3 | 0.3187475490101845 | 0 / 0 |
| Selected counterexample | 25.1 m / −5 dB / 7 / 1000 | 23.87647377650226 | 24.568995705970565 | 229 / 234 |

The low-SNR example was selected after exploration; both original sweeps are
retained. It changes truth, SNR, and seed, and is not an SNR-only sweep, unbiased
benchmark, population-ordering result, or significance claim. Its explanatory
trial index 1 (user trial 2) is explicitly selected. All 1000 trials remain
available, including the largest 94.9 m absolute errors.

## Checks executed

- Complete repository suite: **774/774 passed**, up from the 717-test baseline;
  no skipped, cancelled, or todo tests. Raw log:
  [full-tests.txt](../scripts/offgrid-range-validation/full-tests.txt)
- Generator freshness, JavaScript syntax checks, and `git diff --check`: passed
- Pure core: 26 Node test groups passed, comparing every one of the 2001 frozen
  observation rows and 4002 estimates, all summaries, RNG fixtures, waveform
  normalization, phase invariance, ties, boundary handling, failures, prefixes,
  cancellation, isolated receiver inputs, and export replay
- UI simulated-DOM suite: 22 tests passed for default/noisy/counterexample
  flows, asynchronous chunks, cancellation before/after trials, repeated run
  clicks, stale/invalid input, explicit seed change, trial selection,
  resize/pagination invariance, retained failures, full versus preview export,
  and native labeled controls
- Integration: 9 new tests plus existing focused integration checks passed;
  exact counts, original content preservation, map/receiver links, generated
  notebook metadata and strict route resolver were checked
- Existing independent notebook safety suite: 23/23 passed;
  [raw log](../scripts/offgrid-range-validation/notebook-tests.txt)
- Independent production-core audit: 20 groups passed. All 2001 observations
  and 4002 estimates matched Python fixtures; maximum observation discrepancy
  2.23e−16 and score discrepancy 2.67e−15. Audited core SHA-256 is
  `ae47307d87ea1295aba99f9bf4d284332d26a6454d9a0b37520c252eae9b17ab`.
  [Audit report](../scripts/offgrid-range-reference/actual-core-audit.json)
- Shared `experiment-record.js` unchanged, SHA-256
  `cb9f4bc1c330db98d013922287ae4625f5b9d788b74860d86fe22eec40f6bb8f`

Node VM tests exercise data bindings and simulated click/timer behavior. They
are not real browser geometry, keyboard traversal, screen-reader, history,
network-loading, or downloaded-file inspection. Source review confirms
responsive coordinates and semantic labels but cannot certify rendering.

## Reproduction and evidence

From the repository root:

```sh
node scripts/generate-site.cjs --check
node --test tests/*.test.cjs
node --test scripts/guided-notebook-independent/*.test.cjs
node scripts/offgrid-range-reference/audit_actual_core.cjs
node --check offgrid-range-core.js
node --check offgrid-range.js
```

Independent reference provenance and complete exploratory sweeps are described
in [the reference README](../scripts/offgrid-range-reference/README.md).
The production-core audit reads frozen independent fixtures, never a browser
plot or a UI summary. Python verification additionally uses real 2N-by-2 SVD
least squares and the analytic geometric-sum response.

## Frozen changed-file manifest

[SHA-256 manifest](OFFGRID-RANGE-CHANGED-FILES.sha256) covers every added or
modified deliverable in this worktree relative to the base, excluding the
manifest itself to avoid self-reference. No source file may change after this
freeze without regenerating the manifest and re-running affected checks. The
manifest is release evidence, not a commit or deployment identity.

Verify from the repository root:

```sh
sha256sum -c docs/OFFGRID-RANGE-CHANGED-FILES.sha256
```

## Remaining release checks

Real desktop/narrow-screen rendering; mouse/keyboard interactions; direct
anchors and Back/Forward restoration; JS-disabled reading; download event plus
actual saved JSON content; final commit / remote identity; CI / Pages and live
resources. These have not been performed by this implementation worker.
