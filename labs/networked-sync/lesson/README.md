# Reciprocal tensor teaching lesson

Canonical authored page: `content/pages/networked-sync.html` → public `networked-sync.html`.
The prerequisite `network-clock.html` receives only one continuation paragraph; its
scalar measurement model, IDs, numerical core, and control behavior remain unchanged.

## Execution and scientific boundary

The lesson loads seven exact runtime files from the independently reviewed
`networked-sync-js-v0.1` source freeze SHA-256
`2e74d10363e2d2feac9a06ec0c061c9d8059345023a3274c530a30f02728018b`.
The controller calls the actual classic Worker. It does not implement a second
estimator or load stored estimates. The view uses actual tensors, factors,
least-squares columns, projection grids, substep traces, association candidates,
and separate evaluation. Reconstructing tensors, rank-one components, and a
scale/permutation display copy uses the frozen `reconstruct` API and does not
modify exported receiver results.

There are eight teaching stages, selected without new computation. The only
runtime dependencies are local first-party scripts. No network fetch, package,
external service, animation, auto-run, ADC waveform, source curve reproduction,
unknown-rank detector, or full-network tracking is implied.

Fresh generated runs may reveal simulation truth after the learner opts in.
A held run has no truth. History imports are explicitly historical and untrusted;
no historical factor, association, output, or evaluation initializes the receiver.
Source geometry success and clock/CFO accuracy are separate. The existing gross
error diagnostic omits clock error; the comparison shows clock error separately.
The near-collision weak-column phase parity exception remains disclosed. The
positive generator velocity-to-Doppler mapping is explicit: paper Eq53 uses
+ dL_src/dt / wavelength and Eq2 retains the positive slow-time exponent. Saved
velocities preserve source vectors; v_phys=−v_src is only an explicitly declared
conversion to the conventional negative path-derivative convention, not a claim
that the source vectors originally denote closing velocities. Numeric Doppler
outputs remain source-convention values unchanged.

## State and resource ownership

The frozen client supplies accepted-only supersession and protocol IDs. The lesson
snapshots caller configuration/record objects through the exact bounded codec,
uses only whitelisted held-processing controls, and never forges a record digest.
Rejected replacement leaves prior accepted computation/input intact. Exports
require an idle, live Worker and valid held state. Export snapshots are fenced
against reset/cancel/suspension before download. File reads have independent
selection and lifecycle fences, including failures arriving after a new request.

Cancel, hard stop, reset, pagehide, or hidden-page suspension immediately clear
presented/held/export state and terminate the Worker. Returning from a suspended
page never resumes a stale result; explicit restart is required. Idle and active
transport death are observed. A later reset invalidates an unfinished restart.
A new Worker uses a new client/ID namespace. All event listeners are removed on
disposal. There is no ongoing background calculation after leaving the page.

An earlier direct-kernel source-size rank3 / oversampling16 case observed about
13 MB history and about300 MiB Node peak. The independent mounted-UI + actual
Worker rank3/20-sweep/oversampling32/tolerance1e-10 case observed25,071,627–25,071,628-byte
history,568,186-byte raw export and roughly680–791 MiB Node process RSS highwater
across two runs. These
are individual observations, not general budgets or browser bounds; cloning, UI
retention and export add memory. The codec limit is64 MiB
UTF-8 and is not a memory limit. Raw export and summary tracing provide smaller
alternatives. JSON serialization and transport clone can block temporarily.
The covariance picture displays one actual value per four rows/columns at source
size, without interpolation; the inspector/export retains the full matrix.

## Portable checks

From the source repository root (does not require the legacy staged layout):

    node --test labs/networked-sync/lesson/tests/lesson.test.cjs
    node labs/networked-sync/lesson/tests/export-ui-records.cjs --out /absolute/output

The first command uses actual Node Workers and a lightweight mounted DOM harness,
not a browser layout engine. The second creates raw/history records by clicking
production mounted UI controls and exports through production download handlers.
It requires an explicit output directory and does not write evidence into the site.

## Required browser handoff (not executed here)

After integration, verify the final built artifact in an actual browser without
changing runtime bytes. Confirm Worker URL and all importScripts requests, MIME,
CSP and offline/local operation. Measure original rank3 full and compact settings,
including UI-to-result latency, peak working set, serialization/clone stalls and
raw/history roundtrips. Record browser, version, device, cases and settings; do
not substitute Node/VM results.

At desktop, tablet and narrow widths, inspect every stage, charts/legends, bounds,
keyboard focus, horizontal scrolling, labels, text contrast and screen-reader
terminal announcements. Exercise run/run, invalid replacement, file/file,
file/run, import/cancel, active/idle death, cancel/reset/restart, pagehide/pageshow,
hidden tab, Back/Forward, export/reset, raw/history import, and no-truth held
recomputation. Check console errors, stale presentation and active Worker leaks.
Inspect zero/degenerate, phasewrap, near-collision and source-size rank3 cases;
retain failures. No browser, remote, Codex, publication or deployment was run by
this lesson implementation task.
