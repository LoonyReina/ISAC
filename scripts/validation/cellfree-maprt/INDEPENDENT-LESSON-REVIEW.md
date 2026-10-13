# Independent Cell-Free MAPRT/CCP lesson review

## Verdict

**Accepted for source integration, with hosted-browser, aggregate-build, and deployment gates still open.** No unresolved blocker was found in the reviewed portable lesson after one independently discovered lifecycle defect was repaired. This verdict is neither a browser acceptance nor a full-paper reproduction claim.

Final candidate LESSON-FREEZE.json SHA256: `d87233daa4e5d122ce3192e4260be127241777ef2746b2219d58311e5125a8d7`.

- Frozen inventory: 28 listed payload files plus the freeze document, 29 owned files total
- Accepted cumulative base tree: `173455c39472327b17cb8459e749ea244d5baa4a`
- Runtime manifest: `4614ef3d375be7185cf32759a4e00638ee0a2db091cce57b62bc7268ff07f9e5`
- Python reference manifest: `30a8e28487ddce0542d767482e02b6eb6af9397a5b69187071f5507cd8e774a5`
- Candidate source: `/workspace/scratch/b60d384cd8e0/isac-cellfree-maprt-lesson`
- No author-source edits, remote writes, Codex tasks, or browser launches by this reviewer

Every final owned-file digest and byte count was checked against the freeze. Runtime was unchanged. Tracked candidate files have no differences against the accepted cumulative base; new work remains the new page and labs/cellfree-maprt subtree. `ACCEPTED-FREEZE.json` is the review's retained inventory.

## Defect found and closed

Original freeze `dc6f17946b156040c38d20f13fc991eab60352e6c3900d8fefc93c649a5cd9a8` had a stale asynchronous file-read rejection race. Pending import A → Reset → Run B → reject A caused the old import catch to invalidate B, terminating the new run and replacing its state/error. Independent evidence: `race-report.json` (running generation 4 became import-rejected generation 5).

Author added generation ownership to import success, catch and finally, plus regressions against a newer actual Worker run and newer pending import. Reviewer reran its original sequence against the final frozen source: `race-fixed-report.json` retains running generation 4 and no stale error. All 23 author tests pass in the reviewer-owned public-layout copy, including the two added interleaving cases. No mutation of numerical runtime accompanied the fix.

## Actual execution and independent numerical checks

`mounted-probe.mjs` imports the production lesson and mounts the actual page in a lightweight DOM/event harness. Actual Node worker_threads run the unchanged production module Worker through its self adapter. Numerical expectations are not produced by the UI model. Downloads are the exact strings produced by the actual current JSON, CSV, and teaching-decomposition handlers; they are not native browser save receipts.

Final frozen candidate was rerun across 13 cases: custom fractional baseline; one-at-a-time variation of all nine numerical inputs; both domain corners; and maximum sample budgets of 512 channel fit/holdout, 2048 calibration and 1024 evaluation. Each numerical rerun sent exactly one fresh job, returned the requested settings, repeated three starts for each ISAC family, and retained outcomes. Default page remains uncomputed. Reference-summary fetch is disallowed by the reviewer harness during fresh calculations.

Results:

- 13 completed runs, 46 available allocations, 92 AP/SP detector cells
- 54,806 independently rebuilt calibration/H0/H1 scores; maximum absolute difference 5.821e-11
- Independent G/X reconstruction maximum absolute difference 3.619e-21
- Beta calibration-tail and Clopper–Pearson interval maximum difference 8.785e-15
- 2,394 independently recomputed convex-subproblem certificates; maximum objective/lower-bound/gap difference 2.274e-13
- Independent fitted/holdout metric maximum difference 1.777e-15; source-tangent improvement maximum difference 2.843e-14
- 47 accepted and 31 failed CCP restarts across these cases; all failed and nonselected restarts retained
- 41 of 46 allocations have nominal holdout crossings, retained rather than relabeled population-feasible
- 60 selected-trial handler exports across allocation × AP/SP × H0/H1 and four fresh settings
- 1,440 separate-method teaching comparisons via independently written **real-augmented least squares**, direct covariance solves, and raw latent reconstruction; largest comparison difference 2.297e-11
- 30 exact AP/SP same-observation pairs verified. Differently powered allocations have different observations despite common latent draws

The reviewer-written teaching oracle checks posterior estimates, both residuals/fits, prior-penalized J0/J1, Q, MAP normalizer, integrated-LRT offset, covariance matrices, Hermitian/PSD quadratic form and signed sample contributions. Raw alpha/h/noise are independently reconstructed and kept in the truth compartment. Runtime-wide score and convex-certificate oracles reuse this independent review lineage's Python methods, applied to **new handler-exported records**, not owner fixtures. Reused oracle lineage is recorded in their filenames/source and is not misrepresented as a wholly new derivation.

## UI and lifecycle coverage

All four panes were rendered for every accepted run; all six restart views remained selectable, including failed/all-failed families. Numeric SVG attributes remained finite. View-only changes did not send numerical jobs or mutate the saved encoded record. These are DOM/data assertions, not pixel-layout checks.

Independent `lifecycle-probe.mjs` passed 15 cases:

- Actual Worker cancellation in scenario phase; edit and reset during power phase; visibility and back-navigation during detector phase
- All export controls remain unavailable after invalidation; direct stale handler clicks produce no download
- Worker transport-error handling clears current success and exports
- Failed-communication UI fixture preserves a downloadable failed record and disables CSV/decomposition. This one failure fixture is deliberately synthetic: no naturally failed communication baseline occurred in the 13 fresh numerical cases
- Malformed JSON, nonfinite JSON numeric overflow, invalid/oversized matrix dimensions, malicious string settings, unknown settings, deeply nested JSON
- >64 MiB input rejected before file reading
- Double replay and reset cancellation never promote history to current results

Additional final portable suite cases cover repeated Run, imports that resolve late, old reads rejecting after newer actions, reset/pagehide, malformed/mutated historical raw replay, all matrix/phase views, separate historical reference summary, actual decoded current records, and download identities. Final result: **23/23**.

Main-thread JSON reading/decoding/encoding and 64 MiB input admission are expressly not a device-memory or responsiveness guarantee. Actual Worker termination bounds a synchronous numerical phase from the client, while per-run numerical domains and iteration caps are explicit. Recorded Node durations are not browser-performance claims.

## Teaching/data semantics and source bindings

- MAPRT remains maximized joint Gaussian prior-density score, with the prior normalizer retained. The integrated Gaussian LRT is shown as a different definition with a fixed offset and translated threshold, only under the declared model
- Target ordinary transpose, column-major channel vectorization, row axes, proper-complex noise, RCS appearing once, and dimensions are consistent with the accepted source audit/runtime
- AP and SP share observations; SP ignores background in its assumed model but calibrates against generated clutter-bearing H0. Current-allocation thresholds and finite uncertainty remain separate
- All methods share the same AP cap, not equal used power. Expected network power, actual ten-symbol energy and holdout constraint crossings are separately displayed. W-symbol is not called joules
- Selection uses the largest sensing-SINR among accepted converged predeclared restarts, not Pd or latent truth. Failed families, solver limits and local-convergence limitations are visible
- Full current JSON includes arrays, raw calibration/evaluation draws, solver attempts/certificates and failures. CSV is only a summary; selected teaching JSON explicitly separates receiver derivations and generation truth. Imported historical replay is detector-chain consistency only, not optimizer validation or authentication
- Observation plot indexes stacked samples; phase is radians with undefined zero-amplitude cells; matrix axes and current detector's assumed covariance are identified. Histogram uses common real bins and counts; trajectory index is zero-based while saved source iteration is one-based. Scientific display data originate in the checked record/adapter
- Explicit PDF/version/reference/runtime identities, source equation crosswalk, reduced/synthetic assumptions, lack of full-paper/global-optimum/population-feasibility claims, and preserved two-station marginalized-LRT prerequisite are present
- No claim that Node/VM/mounted DOM established actual-browser acceptance. PUBLIC-ASSETS actual_browser_tested and actual_browser_performance_tested remain false

## Pending release gates

Integration must preserve explicit public asset mappings and prerequisite routes, then pass canonical isolated reproducible aggregate build. Actual hosted browser must still test module-network loading, rendered desktop/tablet/narrow layout, keyboard/screen-reader behavior, native saved downloads, phase cancellation/responsiveness, and memory/performance. Publication then needs exact commit/deployment/live checks. The cloud browser was unavailable for this local workspace route; no alternative shell/headless browser route was used.

## Evidence

- `final-portable-tests.tap`: source-free production suite, 23/23
- `mounted-report.json`, `final-mounted-probe.log`, `run-*.json`: final fresh runs and complete handler records
- `case*-cellfree-maprt-current.json`, `case*-cellfree-maprt-counts.csv`, `case*-cellfree-maprt-teaching-decomposition.json`: real handler outputs
- `independent-lesson-oracle-report.json`: 60 exports and 1,440 comparisons
- `independent-runtime-oracle-report.json`: fresh all-score/design/interval rebuild
- `runtime-power-oracle-report.json`: 2,394 certificate/tangent/constraint checks
- `lifecycle-report.json`, `race-report.json`, `race-fixed-report.json`: adversarial lifecycle and fixed defect
- `REVIEW-MANIFEST.json`: review artifact SHA256 bindings
