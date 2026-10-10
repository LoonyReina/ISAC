# Learning-path refinement: prepublication validation

Date: 2026-10-10. Base: `bd0ad6ce3d9891c2e8ab9426c865aa24159c8591`.

## Scope and canonical content

This iteration improves the route through existing teaching material. It adds no solver, numerical model, scientific control, or claim of complete paper reproduction.

- `cases[].learningEntry` is optional. Waveform design and joint beamforming point to their existing `#intuition` anchors. Other cases fall back to the canonical case unit's `href`. The map renderer validates supplied entries before generating output: a root-local HTML page must equal the case unit's canonical page and contain the named fragment. External URLs, traversal paths, queries, malformed or absent fragments, missing pages, and unrelated pages are rejected.
- Concept beginner reading and action links use `entryUnitRef` when present, regardless of `unitRefs` ordering. Deep-case choices derive from matching canonical case units. Direction case choices derive from `primaryCaseIds`; no parallel case URL list or proposed experiment button is introduced.
- Every direction initially shows one available intuition route. All six levels and their extension notice remain in a closed native disclosure. Source-evidence disclosures, versions, retained and omitted conditions, metrics, budgets, unknowns, and caveats remain available separately.
- Estimation now begins with common observations and candidate comparison. The existing real-scalar LS/CRB unit remains advanced, keeps its CRB prerequisite, and is linked from the receiver direction with an explicit real-gain scope. This is not a new nonlinear ranging or tracking experiment.
- One `通信与感知互助` concept links to the existing `theory.html#evolution` explanation, distinguishing integration/resource sharing from task assistance. Its only added editorial relation leads to the existing networks direction for synchronization and fusion conditions. It has no experiment button and explicitly states that sensing-assisted beam selection and online mutual-assistance loops are not implemented. Map counts derive from the registry: 31 concepts, 8 directions, 18 units, and 7 cases.
- Joint beamforming introduces the physical signal flow and reading instructions before its first model equation. A closed native glossary covers streams, precoding, covariance, expectation/conjugate transpose, rank, and SINR. Its formulas, scientific controls, scripts, existing IDs, computed-output targets, and numerical core are unchanged.

## Executed checks

The following completed successfully in the working tree on 2026-10-10:

- `node scripts/generate-site.cjs`: regenerated `index.html` and `reading.html`; subsequent generation was current
- `node --test tests/knowledge-map.test.cjs`: 33/33 passed
- `node --test tests/joint-beamforming-ui.test.cjs`: 8/8 passed
- `node --test tests/*.test.cjs`: 283/283 passed, no skipped tests
- `node scripts/generate-site.cjs --check`: generated site is current
- `git diff --check`: passed
- `python3 scripts/validate-joint-beamforming.py --check`: passed; the existing report still matches actual JavaScript output and independent NumPy calculations for 42 recipes, including exact zero and small-positive endpoint precision

Focused regression fixtures cover canonical case title/entry changes, absent-entry fallbacks, rejected invalid URLs/fragments, stable explicit beginner actions after reversing unit references, empty/proposed case suppression, available-intuition selection, all six levels and evidence fields, closed disclosures, bounded estimator and mutual-assistance routes, glossary source order, and preservation of equations and controls.

The custom DOM simulation covers selection, titles/groups/hashes, native-link pass-through, disclosure toggles without added application history, Back/Forward-style restoration, and reset/Escape focus behavior. Restoring a selected node uses a fresh template, so its research disclosure starts closed. Disclosure state persistence is not implemented or promised. `knowledge-map.js` itself is unchanged.

Changed stylesheets have new cache keys: `knowledge-map.css?v=learning-path-v1` and `joint-beamforming.css?v=signal-flow-v1`.

## Remaining verification boundary

These are source, numerical, generator, and custom-DOM checks. No browser, actual keyboard, screen-reader, narrow-screen layout, network loading, deployment, or postpublication verification was performed for this refinement. The earlier live verification in `JOINT-BEAMFORMING-VALIDATION.md` describes the previous release and was preserved unchanged.

Before publication, inspect concept-to-beginner and concept-to-case navigation, the direction disclosure and glossary with Enter/Space and Tab, search and repeated selection, Back/Forward, Escape/reset, and no-JavaScript links in a real browser. Check desktop and 375/390 CSS-pixel widths for overflow and visible focus. Verify final deployed assets separately after publication.
