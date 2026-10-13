# Integration handoff (not already applied)

Base: `0e4cc192bf330cfbfb63cfdce2a94f553f4ed370`, same authoritative tree as the parent-supplied main identity at handoff. This change adds owned files only. It does not change global registry, paper counts, guide status, compatibility manifest, scripts, remote branches, PRs or deployment.

## Public mappings to add explicitly

- `content/pages/dual-array-positioning.html` -> public `dual-array-positioning.html`
- `labs/dual-array/lesson.css`, `lesson.mjs`, `README.md`, `lesson/{model,session,view,mount}.mjs`, `runtime/{kernel,records,client,worker}.mjs` -> unchanged relative public paths
- `assets/data/dual-array/{historical-statistics.json,RUNTIME-ACCEPTANCE.json,RUNTIME-ACCEPTANCE.md}` -> unchanged relative public paths

Build-only owned inputs: this document, `FUNCTIONAL-FREEZE.json`, `lesson/tests/*`. Explicit per-file mapping, including imports and Worker paths, is needed; no broad source-tree copy or missing-directory exemption. The new functional freeze lists every owned path and byte/hash. Verify it before registration and again after staging.

The page's SITE markers support normal site header/context/next generation. Existing near-field lesson remains intact. Retain the same `nearfield-double-array-ispac` identity and 35-paper total; do not mint a 36th paper. Whole-paper reproduction remains unfulfilled. After numerical and lesson acceptance, guide wording may say a bounded downlink Algorithm1 receiver is implemented, while original Fig4 / optimized HB-FD / uplink / hardware remain open. No registration may promote Node worker evidence into hosted-browser acceptance.

## Verification order

1. Check exact runtime hashes against assets/data/dual-array/RUNTIME-ACCEPTANCE.json
2. Run owned tests serially from repository root: `node --test labs/dual-array/lesson/tests/lesson.test.mjs`
3. Optionally regenerate six production mounted Blob downloads and independent formula replay using README commands; output goes to an absolute directory outside source
4. Independently review lifecycle, plots/fields and teaching source boundaries
5. Add exact compatibility mappings and targeted owned-test orchestration using existing repository conventions; run required full build/reproducibility gates against the final authoritative source
6. Hosted real browser: desktop1280/1440, tablet,320/375,200% zoom; actual charts/data, invalid drafts, row/range selectors, truth toggles, rank1/noise/null, cancellation, file races, sameY regrid, selected download/reimport, offline source loading and Back/Forward/pagehide remount
7. Publish only within parent authorization and verify exact deployed commit/network resources; no browser claim until this separate gate passes

The production UI does not require external packages, a backend or a network numerical solver. Only the pinned offline JSON is fetched on request. Records stay local and are never uploaded.
