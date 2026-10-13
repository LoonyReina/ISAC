# Independent near-field multitarget lesson and record review

Date: 2026-10-13 UTC. Verdict: **bounded independent functional pass; no blocking defect found in the frozen teaching/record implementation**.

This accepts the audited isolated lesson under Node module Workers and the mounted first-party DOM harness. It does not accept browser layout, real-browser latency, a real browser's download delivery, full-site integration, online deployment, receiver localization, Fig.5, or a complete-paper reproduction.

## Exact source reviewed

- Source worktree: `/workspace/scratch/b60d384cd8e0/isac-nearfield-multitarget-lesson`
- Accepted base: `4ba6cb9ea8a568b1e4b21124b5e0d67648add8e2`
- Reviewed index tree: `a1b0a85d62abfaf50f818d18136d89133ba29eac`
- `LESSON-FREEZE.json` SHA-256: `3ea8557ab493cf2cb4806c9ed8d117a843c4626d3fbbc95818c5724da1bbacf0`
- All 34 listed file hashes and sizes match; 35 staged added paths, no existing-file edits, and no unstaged changes
- All five mathematical executable hashes and the v2 Worker hash independently match the accepted numerical-core receipt. The copied runtime manifest and final receipt are unchanged
- Frozen source was not edited. All additional review code and output are in this evidence directory

`SOURCE-BINDING.json` records this boundary. `FINAL-BINDING.json` binds the added evidence. An integrated source with changes must retain these exact functional files or undergo a targeted delta review; this verdict cannot silently accept later changes.

## Tests actually run

1. All six frozen focused suites rerun: **32/32 passed**, zero skipped. `focused-tests.log` records the output. Runtime: Node 24.19.0, Python 3.12.14, NumPy 2.3.5
2. New `audit-run.mjs` exercises real solver Workers through the production mount, the actual production download button, and its Blob bytes. It exports four new cases, their exact teaching projections, and an additional 41×41 off-axis slice
3. New `independent-teaching-oracle.py` uses only NumPy and the exported JSON. It does not import the runtime, JS checker, author Python oracles, or fixture matrices
4. New `independent-sample-oracle.py` independently implements the stated Mulberry32/Box–Muller sequence, reconstructs X/N in Python, and checks full sample covariance and energy on fresh, source, and maximum records
5. New `max-production.mjs` covers maximum offered source size, full production download, import, saved-number check, last sample-cell inspection, and exact historical re-download
6. New `phase-cancel.mjs` cancels after actual Worker progress is observed for solve, finalize, import, check, and slice, then performs a new complete solve for every case
7. New `edge-domain.mjs` checks minimum positive P, minimum positive r, wide physical bounds, and nearly coincident targets. All preserve exportable terminal evidence, including partial Newton failure and separately classified analytical/rank-transform failures

## Fresh production cases

| Case | Exact distinguishing inputs | Result |
|---|---|---|
| New off-fixture | side8, wavelength .0123 m, P .211 W, r2.73, epsilon .167, T73, seed39217; two target positions and one user position changed | Both modes accepted; 2,372,474-byte production JSON |
| New source sample | source side10/r17/noise1e-11, T47, seed101910 | Both modes accepted; 4,528,146-byte production JSON |
| New partial | r1e-6, epsilon .22 | Accepted proposed, NCCS `newton_factorization_failed`; full 76 raw reduced coordinates retained |
| New analytical failure | P1e-6, noise1e-6, r17 | Both `infeasible_single_user_bound`, exportable and independently checked |
| Maximum production | source side10/r17/noise1e-11, T1024, seed4294967294 | Both accepted; **22,168,111-byte** production JSON; full historical re-download byte-identical |

Byte sizes bind these actual records, including nondeterministic metadata; they are not a universal maximum. File admission remains 64 MiB plus structural limits. This is not a peak-memory guarantee. The maximum production preview is 12,024 characters: 12,000 data characters plus an explicit truncation notice. Its actual final sample X[99,1023] was displayed.

## Independent teaching arithmetic

For each available candidate, Python reconstructs the actual normalized/physical channels, canonical channel right inverse B, G=BᴴB, and all 18 primary teaching matrices. It computes Eq.18 in the complete physical space using Fh*/sqrt(hᵀFh*), independently of the stored reduced recovery. It verifies:

- Full Rₓ, original physical F₁/F₂/Rₛ, recovered beams and ffᴴ, both PSD differences, recovered residual, complete basis/metric/reduced views
- PSD of all original and recovered physical matrices, rank-one recovered beam outer products, and residual reassignment
- Recovery invariance of power, all three target gains, all three complex-modulus target correlations, both desired powers and rates
- H B≈I and P tr(GR)=tr(Rₓ), using the nonorthogonal metric
- All geometry channel entries, distances, and element positions
- Every normalized and raw-physical illumination value for the 25×25 grids, and every value in the independently recomputed off-axis 41×41 slice
- Shared maxima across the two modes, distinct W interpretations, exact target in-plane flags, and no localization interpretation
- All empirical transmit/receive covariance cells, eigenvalues, numeric ranks and thresholds, finite-power/energy relationships, zero clipping, and independently recomputed extension echo energy

Largest observed complete teaching-matrix absolute difference was 1.73e-11 in the tiny-rate partial case; source/off-fixture cases were at or below 2.21e-13. Maximum grid-cell absolute difference was 5.06e-15. Per-cell assertions use declared relative and absolute tolerances, rather than only checking an aggregate norm.

Python independently reproduces all actual X and N arrays from the seed and specified call order. The maximum production case has maximum X entry differences of 2.95e-15 (proposed) and 1.42e-13 (NCCS), and noise differences below 1.90e-21. Shared receiver noise is exactly equal between modes; X and finite energies remain different, with no hidden equal-energy normalization.

Strict Eq.12 gains/channels and echo are exactly zero; Y=N follows from explicit matrix arithmetic. All sampled transmit ranks are five, smaller than N, including source N100/T1024. Source T47 receive rank is 47, so no blanket receive-full-rank assertion is introduced. Strict Eq.19 stays undefined; neither pinv nor a regularized receive spectrum is introduced.

The accepted core's primal/dual math was not re-audited as a new optimizer. Its exact bytes were checked, the existing core acceptance was preserved, the author suites' independent saved-record oracles were rerun, and the new cases were checked by the independently implemented JS record checker and the new NumPy teaching/sample checks above.

## Codec and historical identity

Source inspection and rerun tests confirm exact-key schemas at every record layer, finite numeric validation, dimensional bounds, fixed model/version binding, failure normalization limited to explicitly unavailable diagnostics, and consistency among per-mode gates and pair statuses. Import preflight bounds bytes/depth/strings and rejects duplicate decoded keys, including escaped duplicates; structural walking rejects sparse/non-JSON/accessor objects, unsafe keys, excessive arrays/nodes and unknown fields. Oversize files are rejected before reading their contents. Malicious strings use textContent rather than HTML insertion.

Ten additional corruptions were independently exercised: seed mismatch, RX normal, an unknown nested certificate field, altered basis phase, altered original reduced F, sign-flipped N with unchanged energy, false pair status, fake lesson version, nonzero literal echo, and coordinated record/sample seed alteration. Every corruption was rejected structurally or by arithmetic. The latter tests matter because a dimensionally valid, finite record is not necessarily a valid numerical result.

A record with changed run ID and timestamp intentionally still passes saved-number arithmetic, but `sourceAuthenticated=false` and `freshSolve=false` remain explicit. This is expected: the checker establishes numerical self-consistency, not origin, freshness, or authenticity. Historical import never creates a current accepted result. Re-running historical settings sends a new real solve request, creates a new run identity, and reproduces the deterministic matrices for identical settings. Failure-only records remain failure evidence, without a fabricated numerical certificate.

## Ownership, interruption and mounted behavior

The frozen suites cover duplicate submit, constructor/post/message/transport failures, stale callbacks, immutable settings, edit/reset/navigation invalidation, late file reads and old view messages. Added mounted tests cover check→Reset, delayed file read→hidden page, return without auto-run, and history→new solve.

Added actual-Worker phase tests observe progress from solve/finalize/import/check/slice, invoke the production Cancel handler, establish no current/imported/source/download result, verify no live Worker slot, and then complete a new run. These establish Node thread termination and ownership fences at those public boundaries. They do not distinguish an exact CPU instruction in certification versus sampling versus final encoding, and do not establish browser cancellation latency.

The maximum production history import/check and full-data download pass. Static claims correctly separate numerical acceptance from sampling failure, source history from current work, analytical infeasibility from algorithmic/transform failure, physical and normalized illumination, finite and ensemble power, and localization/full-paper noncompletion.

## Remaining gates and limits

- The integration owner must run all required full-site checks and retain precise public/module dependency mapping. This review did not run the whole-site build
- A supported real browser must still establish module Worker loading, layout, keyboard/focus/accessibility, real downloads, responsive cancellation and memory behavior, and browser stage timings. The mounted harness is not a rendering engine
- Exact commit CI, authorized publication, Pages deployment and online resource verification remain distinct later gates
- No new receiver localization evidence, parameter sweep, stream-by-stream waveform synthesis or full-paper completion is established

No corrective change was requested for the frozen functional implementation. No browser, Codex task or publication was used in this review.
