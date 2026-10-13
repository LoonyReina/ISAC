# 二维导频 teaching module

Existing paper: `supplement-case-pilot`. Proposed public route: `pilot-patterns.html`; prerequisite remains `pilot-design.html`. This adds only the owned page, `labs/pilot-pattern/`, and `assets/data/pilot-pattern/`. Shared registry, generated portals, compatibility mappings, historical evidence and the old lesson are deliberately untouched. A separate strict integration must register the route and explicit public files, build and test the full site, then perform hosted-browser QA.

## What runs

The actual module Worker generates synthetic multi-symbol noncircular CP-OFDM I/Q and runs the independently accepted receiver. Controls regenerate transmitter/scene/noise inputs; same-y reprocessing preserves the observation exactly. The UI projects real retained samples, phase rotation, all short-FFT bins, selected/remapped complex cells, 192×121 physical-coordinate coherent maps, ambiguity witnesses, tied candidates and noise/energy ledgers. The unchanged runtime only receives grid/raw y/known pilots for recovery; truth remains generator/evaluation data.

The 600-frame NumPy study is explicitly stored offline evidence. `offline-summary.json` retains 200 frame-level NMSE triples per SNR, source experiment SHA, seed/hash provenance and paired intervals. It is a compact summary, not the full raw study archive and not a live batch. Live noise uses the accepted JS PRNG; no NumPy seed parity is claimed.

## Scope adjustment from the design

The natural 192×192 FFT is explained as a separately verified numerical relationship, but is not an additional live page plot. The page displays only the accepted physical map and computes its actual axes. There is no unsupported FFT button or relabeled FFT image. Skipped-derotation ablation and per-path/predecessor decomposition are not supplied by the accepted runtime; the page states this locally rather than inventing traces. Optional live Monte Carlo remains out of scope. All other main chain controls, same-y pairing, failure presets and records are active.

## Immutable numerical dependency

All five `runtime/*.mjs` files are byte-identical to accepted prototype manifest `08c3947e6e3d49b34b47035231d307c34a0a373bc5beb2532695ed426e7dbd80`. The original manifest and its independent acceptance are in the owned data directory. The port review archive SHA is `30a201fbc8087e08d8f69ccb3355e641533e99a8cbb317e8968f07d436dffcc3`. No source paper/PDF, extracted full text or third-party figure is included.

## Run author checks

From a repository-shaped source tree, with Node 24 and Python/NumPy:

    PILOT_TEST_OUTPUT=/tmp/pilot-pattern-lesson-tests node --max-old-space-size=256 --test labs/pilot-pattern/tests/lesson.test.mjs
    python labs/pilot-pattern/tests/replay_downloads.py /tmp/pilot-pattern-lesson-tests

Tests mount the real production HTML/controller in a first-party event/DOM harness and execute the unchanged browser Worker entry through a Node worker_threads browser-API bridge. Downloads are actual production-created JSON Blobs. The Python script reads those downloaded files and reconstructs the raw receiver/maps/candidates with independent NumPy formulas, importing no JS or reference numerical helpers. This is author QA using independent formulas, not separate external reviewer acceptance.

The event/DOM harness is not a layout engine, browser, accessibility tool, mobile test or screen screenshot. Node timings do not measure control-to-paint. A complete maximum-domain record is tested, but browser memory/latency limits are not asserted. Browser graphics, module fetch/CSP, responsive layout, keyboard/accessibility and downloaded-file handoff require separate real hosted QA.

## Record and lifecycle behavior

Only a completed current record can be checked/exported. Semantic replay compares all required fields after raw reprocessing and generated-observation regeneration; an attacker re-signing forged numeric results does not pass. Import selection only shows an untrusted summary. Duplicate keys, malformed JSON, depth >64 and files >16,000,000 bytes are rejected. “Raw only” creates a separately labeled record and never certifies the rejected source record or physical origin.

Input edits, cancel, preset changes, reset and navigation during a request dispose/terminate the worker immediately and revoke output ownership. Completed plots retain their committed labels when draft controls differ. A submission owns its promise before validation callbacks; reentrant reset, destroy and reset→new-run cannot restart or reclaim the older request. A newer run cannot be overwritten by an older result; repeated Run while active is ignored. Reset also clears imported context, all advanced views and file-read ownership, and restores every declared default without starting a run. Fatal worker errors are recoverable through a newly created worker. No main-thread scientific fallback is used.

Source-free here means the third-party publication is excluded; this package intentionally includes our own original source code, contracts and test evidence. Publication and full site integration are not performed by this module task.
