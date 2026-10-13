# Gaussian matrix tradeoff lesson

Canonical source: `content/pages/gaussian-tradeoff.html`; public route: `gaussian-tradeoff.html`.

This is a bounded source-derived matrix mechanism lesson for arXiv:2204.06938v8, continuing the existing real-scalar `case-crb` and `theory.html#estimator-crb` prerequisites. It is not the separate CRB beamforming paper, source-figure digitization, full-paper reproduction or RF/PHY validation.

## Implementation

- `lesson.mjs` mounts the Chinese lesson and binds actual DOM events to the controller. It exports `mountLesson({document,createWorker,download})` for portable mounted testing, and auto-mounts in a real document. No computation runs on load
- `controller.mjs` owns current/fresh versus imported/historical states, accepted-only replacement, held first-block X/Y, import races, lifecycle and exact-codec download requests
- `view.mjs` renders actual arrays into labeled SVGs and numeric tables. Array inspection is paginated; redraws retain references rather than deep-cloning whole numerical histories
- `lesson.css` provides desktop-first layout, scrollable matrices/tables, explicit keyboard focus and responsive breakpoints. CSS and labels do not establish browser accessibility acceptance
- `../runtime/` contains the seven byte-identical accepted production runtime files plus original handoff/freeze documents. There is no lesson fork of the numerical algorithms or codec

Fresh inputs include continuous κ, a separate communication endpoint, actual complex H, optional Hermitian PSD Q, T, Nₛ, power, noise, isotropic proper prior, B and seed. A custom Q is explicitly uncertified and never given the optimizer's gradient or optimum badge. Invalid or ill-conditioned combinations retain failures rather than resizing, loading, regularizing, discarding positive modes or using cached results.

Gaussian and Stiefel views share expected resources and the serialized random bank. All individual block statistics remain in history. The first actual X/Y/posterior matrices can be inspected; there is no fake arbitrary-block selector. A new seed regenerates waveform, response and noise while leaving the configured communication channel fixed. Held-X/Y processing changes estimator assumptions only and does not invent fresh Bayes truth scores. General MIMO finite-SNR Stiefel MI is unavailable and is not plotted at the Gaussian rate.

Finite Wishart and rank-one sphere operations perform fresh numerical integration, replacing the current operation. MP remains an approximation. Real/complex coordinates, proper-prior factor two, Eq.93/94 and Eq.109 source conflicts, Table-II two-power conventions, structural-null and deep-fade endpoints remain explicit.

## Records and lifecycle

Use the unchanged `tagged-json-f64be-v1` codec. `raw` contains current operation input, including actual X/Y for posterior operations. `history` contains independently hashed input and historical output. Import does not execute or authenticate numerical claims. Imported result bodies are not trusted for visualization; an explicit replay creates fresh Worker output. Raw replay is the bounded lower-memory alternative to full history.

All records preserve exact finite binary64, signed zero and Unicode. SHA-256 is identity, not source authenticity or proof of execution. Codec limits, structured-clone allocation caveats, 120-second cooperative Worker timeout and 10,000-submission session limits are displayed in the page.

Cancel, hard stop, reset, hide and leave clear current/held data. Failed replacements do not clobber accepted work. Old file reads, delayed transport termination and superseded callbacks cannot restore stale state or clear a newer import selection. Imports clear a completed selection so a browser can retry the same file; cancelled old reads do not clear a newer choice.

## Tests and handoff

Run only the focused portable lesson gate directly:

```
node --test labs/gaussian-tradeoff/lesson/tests/*.test.mjs
```

The aggregate site gate must use the repository compatibility builder after integration, as specified in AGENTS.md. The lesson author does not edit shared registry, publication manifests, generated pages or inherited source.

The focused tests use actual Node `worker_threads`, a first-party lightweight mounted DOM and the production download callback. They do not run a browser, render CSS, verify actual focus/screen-reader behavior, or measure browser/device latency and memory. No remote execution, browser session, Codex task or publication occurred in this task.

`tests/export-ui-records.mjs` captures actual raw/history button downloads. `tests/replay-ui-records.mjs` independently verifies tagged encoding and hashes, then reruns through a fresh actual Worker. Records are suitable for an additional independent Python numerical replay; that separate review must report its own executed results. See final freeze and test receipts for the precise delivered bytes and observed counts.
