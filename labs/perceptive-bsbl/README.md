# Perceptive direct block-MMV lesson

Local functional implementation for the existing `perceptive` paper identity. Entry: `perceptive-bsbl.html#question`. This is a new lesson within the existing site. The original `perceptive-clutter.html` remains the narrower scalar-background prerequisite/branch, not an integrated matrix-clutter receiver.

## Runtime and provenance

All 12 files under `runtime/` are byte-identical to the separately accepted `perceptive-bsbl-browser-prototype-v2/src` freeze. Original source manifest SHA-256: `7efb99af1382fe39adc8348e168d66b29f9d1ca13d232f076827e2f1e6e3d6fc`. The unchanged module provenance uses original `src/*` logical names; the public asset map records the runtime relocation. The numerical model, solver, complex arithmetic and evaluation are unchanged. `assets/data/perceptive-bsbl/MANIFEST.json` is the original bundle manifest, not a claim that every original fixture is published here.

The site adapter adds a browser session, one-job acquisition preflight/check Worker, read-only matrix/trace projections, plots, accessible numerical alternatives and the Chinese lesson. It does not replace the mathematical algorithm. Current JS v2, historically executed JS v1 and current/historically executed Python reference identities stay separate. Hashes establish self-consistency, not source authenticity.

`session.mjs` validates the full acquisition in a separate Worker before replacing an active owner. Thus a schema-invalid or semantically invalid B request does not cancel A. Requests, file reads, execution evidence, check results and asynchronous downloads have ownership fences. Same-document fragment navigation only opens learning sections; pagehide stops Workers and playback. Returning from a pagehide retains available evidence as imported history and never silently restarts computation.

Full downloads are the native immutable `encodeRecord` JSON envelope, without a wrapper, UI truncation or numerical rounding. The 12,000-character preview is explicitly incomplete. `check()` uses the raw saved record; `replay()` regenerates the exact request under v2 and compares the acquisition hash before execution, retaining the original source across repeated replay. It is not a raw-Y-injection solver API. Interrupted, partial, work-limited and numerical-failure checking remains incomplete. No imported code is executed.

## Local test commands

From the repository root, Node 24 and Python 3.12 with NumPy/SciPy:

    node --test tests/perceptive-bsbl-session.test.cjs
    node --test labs/perceptive-bsbl/tests/view.test.mjs
    node --test labs/perceptive-bsbl/tests/mounted.test.mjs
    node labs/perceptive-bsbl/tests/export-records.mjs /tmp/perceptive-downloads
    python3 scripts/validation/perceptive-bsbl/check-download.py /tmp/perceptive-downloads

The final command intentionally reports `incomplete` with `availableEvidenceValid: true` for the aggregate suite containing genuine interrupted/failed runs; it never calls the missing evidence passed. Complete/capped individual records report passed when their numerical checks pass. Any mathematical mismatch exits nonzero. With files downloaded separately, use `--oracle /path/to/dense_oracle.py`; the expected oracle SHA is checked before import. `--help` works without reference data. The checker does not authenticate history or independently reimplement the runtime's closed JSON codec; the native codec is tested separately.

The mounted suite uses actual Node module Workers and the production lesson/controller/Blob download path, with a lightweight DOM/event/canvas-call harness. It is not a browser layout engine or browser-engine acceptance. It covers full/default and novel observations, five methods, real histories, imported partial/raw-only failure records, lifecycle races, same-document Back/hash navigation, pagehide/return, record import/check/new execution, and canvas-unavailable numeric alternatives.

`check-download.py` adapts the accepted independent numerical adapter to portable files and valid partial snapshots. Its covariance, proposal, dense evidence, posterior, baseline, physical path sum, extraction, association and count checks call the separately authored `oracle/dense_oracle.py`, not the JS numerical implementation. All accepted actions and all received X entries are checked. `AUDIT-ADAPTATION.md` records the precise adaptation scope.

## Publication gate

This functional freeze only adds new files. Registry, original-page scope links, directory/guide updates and compatibility build registration belong to the separate integration task. `PUBLIC-ASSETS.json` lists exact proposed public/build-only mappings for that task. Existing sources and historical hashes were not reset. Full-site aggregate, reproducibility, browser layout/interaction and deployed-byte verification remain separate acceptance gates. Do not label them passed from Node harness evidence.

No external scripts, copyrighted PDFs, page captures or unlicensed MATLAB are included. The offline 480-trial summary is explicitly precomputed and never used as a substitute for fresh live output. The Python reference and oracle are first-party original numerical/audit code.
