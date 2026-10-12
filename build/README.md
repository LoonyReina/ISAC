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
source mappings, without generated-page seeds or a previous `dist/`. The site
generator renders the complete page set in memory, validates it, and only then
writes generated files. The original 956 regressions and added render/validation
regressions run in that workspace with the existing flat-layout imports. Do not
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

- `source`: the current authoritative input location, or null for generated output
- `compatibility`: the path required by existing generators, tests and imports
- `public`: the preserved public URL path, or null for build-only metadata
- `owner`: the responsible feature/domain
- `role`: `source`, `generated`, or `baseline-metadata`

The map remains schema version 2 with these five entry fields. Exactly eight HTML
pages and `legacy-routes.js` have `role: "generated"` and `source: null`; they
retain explicit compatibility and public paths. They are outputs, not copied
inputs. Source staging skips null sources and requires the complete mapped file
set after generation.

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

This opt-in historical migration gate compares the complete artifact with the
frozen `migration-baseline.json` inventory from commit
`2c9ef008c3e1d9d3f723ac54e8e55236ee7adb36`. Exact reviewed changes to the three
current maintainer documents (`README.md`, `AGENTS.md` and
`docs/SITE-ARCHITECTURE.md`) remain in `migration-maintainer-deltas.json`. Necessary
generator, helper and test-source changes are separately enumerated by exact
path and before/after fingerprints in `migration-build-deltas.json`. There are
no directory or glob exemptions, and the frozen baseline is not rebased.

This generator refactor preserves all 367 public paths and the bytes of all 27
HTML pages, runtime assets, numerical models and canonical data. Published
build-related source and test files necessarily reflect the reviewed
implementation changes. Historical scientific validation reports are unchanged.
An omitted evidence file or an unlisted byte change fails the audit.

The normal authoring build does not read this old snapshot or either delta list.
A routine content edit does not require rebasing the complete public inventory.
Permanent targeted numerical, source, export and route tests still apply.

## Clean-source rendering and validation

The eight generated HTML pages (`index`, `experiments`, `reading`, `practice`,
`resolution`, `learn`, `overview`, `research`) and `legacy-routes.js` have no
checked-in bootstrap copies. A clean checkout can build them without seeds or
prior output. The sole retained `build/compatibility-seeds/project.gitignore`
file preserves build-only historical metadata; it is neither a generated page
nor a page-generation input.

The generator renders all generated pages, updated handwritten-page shells and
legacy routes into memory before checking destinations. Mandatory validation
then checks local page links, target fragments and duplicate IDs
against the complete page set. Nothing is written until that validation passes.
The wrapper then checks asset/document dependencies before publishing the validated tree.
The rendering-only resolver does not provide a validation bypass to authors:
standalone teaching-entry resolution still rejects invalid syntax, missing
pages, missing fragments and invalid cross-canonical-page entries immediately.

To add a research guide, edit `content/data/research-guides.json` and any required
registry references. To add a generated-page anchor, edit its canonical fragment
or generating input. Run the normal commands above; newly rendered destinations
are checked in the same build. Never edit generated output, restore a removed
seed, copy a previous `dist/`, or change historical fingerprints to make an
ordinary content edit build. Tests, freshness, complete-output dependency checks
and reproducibility remain required independently of the historical audit.
