# Timing disclosure addendum

Date: 2026-10-12. PASS: narrow text-only/source-boundary inspection. This addendum supplements, without rewriting, FINAL-REVIEW-MANIFEST.json (SHA-256 8a419a1a086e643834540e22eb10143c5ad6120a952a5c8d31a07240bbb3cd99).

Final changed files:
- content/pages/atomic-ofdm-receiver.html: 5b73c3b6714907239c5e57f0cb335c8312cc48187af353eb82d388747aec7a7e
- tests/atomic-receiver-ui.test.cjs: 970d0c8a78e915087ce4a84f98e67759824e9db12ff278c1578d51c7ac008236

The page diff adds only the timing paragraph. The test diff appends its static wording check. Core, model, Worker, controller and CSS retain their previously reviewed hashes. The original manifest and all 20 allowlisted evidence files were verified byte-identical.

## Independently inspected timer boundary

In the frozen core, started=now() occurs after parameter/input preparation, lag indexing and state-array allocation (line 70). The final snapshot reads now()-started while constructing its runtimeMs field (line 108), after packing z/e/nu and copying scalar diagnostics/trace. The subsequent includeMatrices block copies/packs T, Theta and the multiplier and performs the extra lifted-matrix eigendiagnostic; those operations are after the stored timing sample.

The Worker creates the solver before its task pump and uses setTimeout between batches. Therefore runtimeMs is elapsed core lifetime including intervening scheduling waits, prior history snapshots and started/progress posting overhead. It is not isolated kernel CPU time. The final result is posted only after snapshot(true) returns.

The corrected paragraph therefore accurately excludes input generation, Worker loading, subsequent final-snapshot matrix work/extra eigendiagnostic, final-result transport, DOM/SVG rendering and download. It explicitly excludes a click-to-render/end-to-end interpretation and desktop-latency certification. “Final-result transport” is deliberately narrower than all messaging because earlier progress posting can occur inside the measured interval.

No numerical audit or full UI suite was rerun for this text-only change. The parent/author reports that the two targeted static timing/science tests pass; that report is not presented as an independently rerun suite. This addendum's independent evidence is exact diff/hash verification and inspection of the unchanged timer/Worker source. All previous browser, layout, accessibility, deployment, detector and physical-model limitations remain open.
