# 802.11ad receiver lesson

A desktop-first continuation of the existing canonical Kumari et al. paper and
Golay prerequisite. The old Golay page differs by exactly one added link
paragraph in `#paper`; its existing content, IDs, controls and runtime remain
unchanged. No registry, guide, build manifest, shared dependency contract or
release artifact is authored here.

## Numerical ownership

`../runtime` contains the exact 22 manifest-listed files plus the manifest from
accepted runtime freeze `b84547a2bdad7da400238c267d2a6d089b33af8f2474d8f733f18c85d9a9b430`.
Its manifest-byte SHA-256 is
`6a7ceabfa149918d07fb6999fa1680edac77b98a32f08017b370968843d30260`;
receiver SHA-256 is
`fb44f41a9fce21f7bbcdf9558e2c87df5750dab4c5560d1b5c595ad0b4125090`.
No runtime byte was edited. Main-thread use is confined to frozen validation,
budget, source-sequence, serialization and ideal-bound helpers; all actual
waveform/receiver computation runs through the real Worker and its frozen
client. The truth evaluator is separate and never loaded into that Worker.

## Files and UI contract

- `controller.js`: lifecycle, immutable held observations, dual hashes,
  generation versus held-policy processing, bounded raw/history transport
- `stages.js`: thirteen progressive Chinese teaching stages, with actual inputs,
  axes/units, equations, assumptions, source-versus-implementation distinctions
- `lesson.js`: production mount, controls, display-only I/Q/power/phase transforms,
  actual-array plots, numeric inspector, full-candidate pagination and downloads
- `lesson.css`: desktop-first layouts, responsive fallbacks, keyboard focus,
  no autoplay, reduced-motion styling, keyboard-scrollable unshrunk SVG axes
- `PUBLIC-ASSETS.json`: exact page/asset/Worker layout for the shared integrator

Default M2, q8, full 3328-chip waveform. Source8 generation is not replaced by a
chip-rate or isolated-Golay surrogate. Scene/waveform/support/seed changes create
fresh observations. Receiver phase/STF/Pfa/nfft changes use the original held
samples, sample hash and metadata hash. View choices never regenerate or
process. Draft or interrupted results are explicitly previous, exports are
unavailable until a current computation completes, and no historical record is
accepted as fresh input. Raw imports carry no target truth. Anonymous bare raw
records are labeled structural-only; hashes are integrity checks, not identity.

The map retains all actual masks and candidates; pagination displays 50 entries
at a time and never deletes them from the full record. Linear plots use common
quantity scales with at most 1200 equally indexed display points, disclosed in
the legend. Heatmaps use fixed reference 1 and fixed -80 to +10 dB saturation.
The Moose complex plane uses equal x/y physical scaling and a visible origin.
Full original arrays remain inspectable/exportable. Canvas-unavailable fallback
keeps the numeric inspector and row plot; it is not an optional result source.

## Resource boundary

100 MiB UTF-8 raw import/export, 160 MiB historical export (checked after
serialization), frozen 2M complex samples / 262144 map cells, default 30-second
process deadline. These are admission limits, not heap guarantees. Synchronous
file parsing, JSON conversion and transport cloning can block; cooperative
Cancel and hard Worker termination are distinguished. No browser heap/latency
promise is made.

## Verification and portable wrapper

Run from the authoritative source tree:

`node --test labs/80211ad/lesson/tests/lesson.test.cjs`

The suite uses actual Node worker_threads, with a separately labeled lightweight
in-memory HTML/event harness running production mount handlers. It does not use
an installed browser, layout engine, network, screenshots, remote task or
publication. It never writes into the site tree and resolves either source or
staged public page paths. The shared integrator owns the root wrapper; require
or spawn this one suite and assert its exact test count with no skips.

Important assertions include:
- `production UI mount and all thirteen views consume actual Worker arrays without new computations`
- `UI downloads actual raw/history, reimports raw and separates imported observation from scene draft`
- `mounted actual Worker cancellation, repeated run and hard-stop reset never present stale output as current`
- `mounted asynchronous import cannot overwrite reset or newer import`

The runtime's own tests may write their historical report paths; a root wrapper
must execute them only in a temporary runtime copy. Do not mutate the frozen
runtime or revise its hashes after running its report generators.

Optional actual UI export evidence producer:

`node labs/80211ad/lesson/tests/export-ui-records.cjs /explicit/output/directory`

This executes production Run/Apply/Import/Download handlers through the
in-memory DOM and actual Node Worker, producing eight raw/history artifacts:
default source8, same-sample fixed-phase, off-fixture fresh and reimported raw
recomputed. `UI-EXPORT-MANIFEST.json` binds the actual UI source and file bytes.
It is not an aggregate test and must receive an explicit output directory.
Independent UI/numerical review is maintained outside this owner lesson; its
final exact-byte acceptance is a separate gate.

## Scientific limits retained

The source's perfect CFO compensation assumption and implemented combined
Doppler/oscillator estimation are distinct. STF acquisition, matched detection
and physical correctness remain separate; rejected diagnostics remain visible.
Global Moose needs a single target and becomes a mixture statistic otherwise.
Finite RC signal and finite-RRC noise are a declared mismatch. Same samples do
not mean equal STF/CEF integration or Moose time support. Principal aliases,
near-zero guards, fractional/noiseless bias, fixed-range CPI and missing range
migration correction remain visible. M1 has null multi-frame/map estimates.

Historical 28 candidates at nfft10000 and 29 at nfft256 refer to the same
historical raw record under different settings. Fresh UI runs use actual output
counts. Known-noise H0 bounds do not limit signal sidelobe candidates. No full
PHY, payload, communication throughput, road measurement, full-paper or
original-figure reproduction is claimed. Real-browser lifecycle, visual,
accessibility and performance validation remain open gates.
