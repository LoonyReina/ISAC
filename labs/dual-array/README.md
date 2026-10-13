# Dual-array bounded downlink lesson

This lesson uses the exact independently accepted four-file JavaScript runtime for arXiv:2311.07722v1, paper identity `nearfield-double-array-ispac`. Numerical source files under `runtime/` are copied byte-for-byte. This is a bounded Algorithm 1 receiver and same-X/Y full supplied-grid profile comparator, not original Fig.4 or a whole-paper reproduction.

The page is `content/pages/dual-array-positioning.html`, with public resources `labs/dual-array/lesson.mjs`, `lesson.css`, `lesson/`, `runtime/`, and `assets/data/dual-array/historical-statistics.json`. Global navigation, build mappings, registry and publication are separate integration work.

## Functional architecture

- `lesson/model.mjs` builds bounded new scenes, projects actual immutable arrays, selects candidate diagnostics through the accepted kernel, and computes the named analytic alias witness
- `lesson/session.mjs` owns a page epoch and one real dedicated Worker. Draft edits, new runs, cancellation, reset, record selection and disposal invalidate old worker/file ownership. Observers may reenter reset/cancel/run without reviving old work
- `lesson/view.mjs` only projects accepted numerical arrays, unit conversions and display transforms. Heatmaps contain all supplied candidates. Profile plots include zero to avoid magnifying rank-one roundoff into a false peak. Tables expose actual values
- `lesson/mount.mjs` is the production DOM/Blob download path. Downloads bind the selected completed record, even with an invalid draft. File import first validates the complete record, then directly runs its saved actual X/Y; no generating truth survives the raw replay
- `lesson.mjs` closes ownership on pagehide; a bfcache pageshow mounts a clean idle page without generating a new observation

Default new scene: Na16 / Nb6 / NRF4 / q4 / T32, 28GHz, half-wavelength spacing, theta25deg/range0.83m, beta exp(0.37i), noise variance0.1, seed231107722, 61x61 grid. Both default truth coordinates are off grid. Controls allow q1/2/4 and31/61/121 grids; advanced raw import remains bounded by the accepted runtime. Source SNR and receive target SNR remain separate. Generator metadata is evaluation only.

The pinned offline statistics file is exactly accepted SHA256 `e54cc91dbc25f25b48584dedd98b885305eed33e4e7bc2c22eeb6a8bdb98018b`. Its Na32/Nb8/T64 study contains14,464 observations across29 cells and31 summary rows, not live browser Monte Carlo. Loading checks bytes without claiming to replay trials.

## Focused verification

From this repository root:

    node --test labs/dual-array/lesson/tests/*.test.mjs
    node labs/dual-array/lesson/tests/export-mounted.mjs /absolute/output/directory
    OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python3 labs/dual-array/lesson/tests/replay_downloads.py /absolute/output/directory

The lightweight DOM harness uses real Node module workers and production mounting / Blob download logic. It is not a layout engine, browser network test, device benchmark or accessibility certification. The independent formula replay reads downloaded actual X/Y and does not import JavaScript helpers. Source manifests and failed attempts are retained by the functional evidence producer.

## Remaining gates

Independent lesson review, actual hosted desktop/narrow-browser interaction and layout testing, complete integration/build gates, publication and deployed-commit verification remain separate. No actual-browser performance claim is made by Node timings. Original Fig.4 source settings, optimized communication, uplink, continuous global ML and whole-paper reproduction remain outside the scope.
