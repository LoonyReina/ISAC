# Source layout and compatibility build

The repository groups authored sources by responsibility. The public artifact
still uses the existing flat HTML/JS/CSS URLs: that layout is the compatibility
contract, not the authoring layout. GitHub Actions verifies the build and deploys
`dist/`; never edit or commit `dist/`.

## Commands

Requires Node.js 24, Python 3.12, NumPy 2.3.5 and SciPy 1.17.0. No third-party
JavaScript build dependencies are required.

```sh
node --test tests/compatibility-build.test.cjs
node scripts/build-compatibility.cjs --test --reproducible
node scripts/build-compatibility.cjs --check
python3 -m http.server 8000 --directory dist
```

The wrapper reconstructs the URL-shaped compatibility workspace from explicit
source mappings. The unchanged site generator and original 956 regression tests
run there, with their existing imports and fingerprint assertions intact. Do not
run the old flat-layout tests or site generator directly from the source tree.
Waveform validation uses `--check`: it recomputes scientific invariants without
rewriting canonical JSON or depending on a particular BLAS SVD sign convention.

`--out PATH` selects another artifact directory. A normal build validates a fresh
complete tree before replacing an existing output directory. Only an existing
regular directory with exactly the expected public file paths can be replaced;
unexpected files or symlinks cause failure. Replacement uses a sibling staging
and backup directory with rollback, never file-by-file publication. `--check`
compares a fresh current-source build with existing output and writes nothing.
`--reproducible` compares two independent clean builds. Temporary directories
created by the wrapper are removed after completion.

## One source, explicit destinations

`compatibility-manifest.json` is the editable publication map. It has no content
hashes. Each entry identifies:

- `source`: the current authoritative input location
- `compatibility`: the path required by existing generators, tests and imports
- `public`: the preserved public URL path, or null for build-only metadata
- `owner`: the responsible feature/domain
- `role`: authored source, temporary generated seed, or baseline metadata

There are no publishing globs. New source files need an explicit entry if they
participate in the public build. Runtime links, assets, anchors, evidence packages
and path-shaped Markdown links are checked against the complete public map.
The existing 367 published paths, including provenance under `scripts/`, `tests/`,
`site/`, `data/` and `docs/`, remain available. Build tooling and new deployment
documentation are not automatically published.

| Source ownership | Location |
| --- | --- |
| Shared styles and record shell | `shared/styles/`, `shared/records/` |
| Foundations, map, reading, catalog, notebook | `features/<feature>/` |
| Numerical models, controllers, topic styles | `labs/<topic>/` |
| Handwritten scientific pages | `content/pages/` |
| Portal fragments | `content/fragments/` |
| Registry and research source records | `content/data/` |
| Canonical numerical/evidence JSON | `assets/data/` |
| Existing static renderer helpers | `scripts/site/` |
| Independent reference/audit packages | `scripts/validation/<topic>/` |
| Regression tests and historical records | `tests/`, `docs/` |

For example, edit `labs/channel-geometry/reflection-aperture-core.js`; its emitted
URL remains `reflection-aperture-core.js`. Edit
`content/data/research-guides.json`; its emitted path remains
`site/research-guides.json`. The manifest is the authoritative lookup for every
source/public pair. Model bytes and public imports are not rewritten or bundled.

## Migration audit is separate

```sh
node scripts/build-compatibility.cjs --audit-migration --test --reproducible
```

This release-only gate compares the complete artifact with the frozen
`migration-baseline.json` inventory from commit
`2c9ef008c3e1d9d3f723ac54e8e55236ee7adb36`. Only the exact reviewed changes to
`README.md`, `AGENTS.md` and `docs/SITE-ARCHITECTURE.md` are allowed, through their
before/after fingerprints in `migration-maintainer-deltas.json`. Historical
scientific validation reports are unchanged. An omitted evidence file or any
unapproved scientific byte change fails this gate.

The normal authoring build does not read this old snapshot or its exception list.
A routine content edit does not require rebasing the complete public inventory.
Permanent targeted numerical, source, export and route tests still apply.

## Temporary generated-page bootstrap

Eight generated HTML pages and `legacy-routes.js` currently reside in
`build/compatibility-seeds/`. They are temporary generator bootstrap inputs, not
authored pages: the old renderer validates some destination anchors before
rendering their new page. The separate `project.gitignore` seed preserves a
build-only historical input and is not a generated page.

Never hand-edit generated seeds or take them from an unverified old `dist`.
Adding/removing generated-page anchors still needs the next bounded generator
refactor: render the complete output first, then perform mandatory link and
anchor validation against that complete output before publication. That gate
will remove all nine generated seeds without weakening strict standalone link
validation. Source relocation does not by itself complete that refactor.
