# Bounded live OFDM ICI lesson

Canonical page: `ofdm-ici-receiver.html`, owned source `content/pages/ofdm-ici-receiver.html`.
Canonical existing guide: `ofdm-ici-aware-receiver-2021`; no second paper identity.

## Scope

Actual six-file frozen source-derived receiver runs in a classic Web Worker. The lesson performs no alternate numerical solver implementation. Its view-only CFAR stencil inspection reconstructs training-cell membership while reading the actual recorded threshold, count and detection.

The fixed numerical envelope is N64/M16/NR8/NT8/L12, known nonzero X, finite angle/CFO grids, no continuous refinement, Pmax1–4. The UI's simulation editor supports up to five enabled targets (the underlying contract permits eight). All receiver controls rerun the complete receiver from the accepted original observation. Receiver-only edits preserve bit-identical X/Y; simulation edits regenerate using explicit seeds. View selections and evaluation truth never enter inference. A new simulation differs from importing a held observation and recomputing it.

`runtime/` contains the exact frozen six numerical/transport files and documentary contracts. Their `SOURCE-FREEZE.json` hashes must remain intact. The browser UI exposes no Python, archives, oracle or cached-result startup dependency. Documentation inside this frozen directory describes the pre-integration runtime deliverable and remains historical; its no-UI statement is not a statement about this separate lesson.

## Files and explicit public dependencies

- Page: `content/pages/ofdm-ici-receiver.html` → `ofdm-ici-receiver.html`
- `lesson/ici-lesson.css`, `lesson/ici-controller.js`, `lesson/ici-lesson.js`: unchanged nested public paths under `labs/ofdm-ici/`
- Frozen scripts: `runtime/js/linalg.js`, `sha256.js`, `evaluate.js`, `ici-kernel.js` and `runtime/worker/ici-client.js`, `ici-worker.js`
- The page loads numerical definitions and the client in dependency order; the main thread uses only validation/record transport/evaluation. Numerical generation and receiver execution happen in the Worker.
- The controller creates `new Worker('labs/ofdm-ici/runtime/worker/ici-worker.js')` relative to the root public page
- The classic worker imports `../js/linalg.js`, `../js/sha256.js`, `../js/evaluate.js`, `../js/ici-kernel.js` relative to its own nested URL. Do not flatten or rewrite these frozen bytes.
- External evidence downloads linked by the page are listed in `lesson/PUBLIC-ASSETS.json`. They are optional, never fetched on page load.

Registration, shared registry, release assets and root test wrapper belong to the separate integrator. The wrapper runs `node --test labs/ofdm-ici/lesson/tests/ici-lesson.test.cjs` in the isolated staged layout. The test accepts the page source at `content/pages/` or the staged public root. Tests are evidence of Node/DOM behavior, not actual browser accessibility/performance.

## Lifecycle and records

The controller uses generation tokens in addition to the frozen client's stale-event defense. Editing, cancel, reset, a newer run and a newer file read invalidate in-flight work. A completed old plot remains visibly labeled as old; cancelled/superseded/error outputs cannot enter completed state. A failed Worker is replaced on an explicit retry. Pagehide disposes the worker; BFCache pageshow permits a new worker on the next explicit run. No autoplay, auto-run, network upload or local storage.

Raw file import is capped at 5 MiB before `File.text()`, then by actual UTF-8 bytes before parsing; fixed shapes, allowed keys, finite arrays, known-symbol magnitudes, configuration (including the lesson’s fixed −30° transmit beam) and checksum syntax are checked before Worker dispatch. The Worker repeats validation and actually recomputes SHA-256. Hashes establish sample integrity, not authenticity. Historical result/lesson objects, simulator truth or preapproved acceptance markers are not accepted as raw input. Imported counterfactual pairing is caller-declared and is labeled accordingly. Raw import has no trustworthy evaluation truth and disables simulation-only “new noise”; explicitly editing a simulation field starts a new simulation.

Raw exports preserve signed-zero numeric tokens so SHA-256 sample identity survives JSON round trips; string contents are escaped normally without replacement markers. They use the same 5 MiB cap and contain no truth; historical full-computation exports use an 80 MiB UTF-8 cap and include full arrays plus a separately identified evaluation. The serializer reads the immutable typed-array results directly without an additional K.toJSON deep clone. Nonfinite failure cells become null. Serialization occurs before the final export byte check; this is not a process-memory sandbox. Full numerical outputs themselves are capped by the frozen runtime. Nothing is automatically persisted.

## Scientific interpretation

- APES, operational known-X FFT and same observed MUSIC angles share exactly the same Y/X hashes
- The ICI-free path is a different synthetic Y; no hardware receiver or performance upper bound is claimed
- FFT receive steering sum has different gain normalization than the APES distortionless beam. Raw brightness does not rank estimation quality
- Plots use actual returned arrays. The power dB display uses a fixed reference 1 and fixed −40…80 dB display scale; numerical readouts preserve untruncated values. Linear display uses one maximum across all returned methods/maps
- CFAR only tests q in [0,12), truncates range windows, wraps/deduplicates slow-Doppler cells, and uses strict local maxima. Nominal Pfa is not achieved calibration
- All branch stops, caps, false detections and missed targets remain. Grid-only held evidence (4 hits/3 false/1 miss) differs from refined Python evidence (4/1/1). New generated samples are not that held fixture
- Source Eq.36 floor alias boundary failures are kept. Fractional delay and CP-valid out-of-L support are not repaired using truth
- Original figures, full-size converged OMP, continuously refined port, hardware/BER, calibrated false alarms and real browser timing are unclaimed

## Verification and release boundary

Run `node --test labs/ofdm-ici/lesson/tests/ici-lesson.test.cjs`. It pins six runtime hashes, runs actual production Node Workers, validates same-Y receiver changes, truth separation, errors/recovery, cancellation/reset/supersession, import races and CFAR view consistency. The parsed DOM harness runs the real mounting/event/rendering code and records Canvas/SVG calls. It does not supply browser layout, fonts, network semantics, assistive-technology behavior or browser performance evidence.

No local server, actual browser, remote commit, publication, or full compatibility aggregate was run by this lesson owner. The integrator owns the final aggregate/staging checks; actual browser gates remain explicitly pending.
