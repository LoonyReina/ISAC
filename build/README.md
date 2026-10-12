# URL-preserving migration build — phase 1

This is a **migration baseline gate**, not the future everyday authoring build.
No scientific source has moved yet and Pages deployment is unchanged. The public
contract is the exact 27 HTML URLs, anchors, query/hash behavior, root JS/CSS URLs,
and existing documentation, data and downloadable evidence from commit
`2c9ef008c3e1d9d3f723ac54e8e55236ee7adb36`.

## Run and inspect

Requires Node.js 24 and Python 3 with NumPy and SciPy. The canonical waveform
record reports NumPy 2.3.5 and SciPy 1.17.0. There are no new JS dependencies.

```sh
node --test tests/compatibility-build.test.cjs
node scripts/build-compatibility.cjs --test --reproducible
node scripts/build-compatibility.cjs --check
python3 -m http.server 8000 --directory dist
```

`--out PATH` chooses another new output directory. Existing output is accepted
only if its complete paths and bytes already match; a different tree is refused,
never cleared or overwritten. `--check` requires output to exist and changes no
output files. A successful new build is renamed into place only after validation.
The wrapper creates and removes only its own temporary workspaces.

The wrapper copies explicit manifest inputs into a fresh legacy-layout workspace,
runs the **unchanged** site generator and its freshness check there, runs the
existing waveform generator's **check mode**, and optionally executes the original
956 tests there. Check mode recomputes the waveform invariants without replacing
canonical JSON: ordinary regeneration could change SVD choices across BLAS builds.
Every staged path and byte must remain identical after generators and tests.
`--reproducible` repeats the clean staging/generator process independently and
compares the complete trees. No generator writes into the source checkout.

## Explicit boundary and ownership

`compatibility-manifest.json` lists every file, with no publishing globs:

- `source`: current input path
- `compatibility`: old path expected by unchanged generators, tests and imports
- `public`: exact old URL path, or null for compatibility-only metadata
- `owner`: named feature/domain responsibility
- `plannedSource`: proposed next-phase location; it does not cause a move
- `role`: source, generated compatibility seed, or baseline metadata
- `sha256`: migration snapshot byte fingerprint

All 368 baseline files enter the compatibility workspace. All 367 except
`.gitignore` enter `dist`, including the existing `scripts/`, `tests/`, `site/`,
`docs/` and `data/` URLs. Some pages explicitly link tests and evidence scripts;
pruning public source files is a separate decision. New build tools and this
manifest are not automatically published. The baseline `.gitignore` is kept as
`compatibility-seeds/project.gitignore`; the working root `.gitignore` additionally
ignores generated `dist/`. This is the only phase-one alternate input location.

The planned tree groups responsibilities rather than collecting everything in a
large JavaScript directory:

| Ownership | Examples / planned locations |
| --- | --- |
| `shared` | `shared/styles/` for course/site styles; `shared/records/experiment-record.js` |
| `features` | foundations (course, intuition, velocity), learning map, reading, catalog, notebook, compatibility; site build helpers under `scripts/site/` |
| `labs` | `labs/channel-geometry/` keeps multipath and reflection aperture together; `labs/ofdm-reference/` keeps off-grid and reference uncertainty together; other labs own their core/controller/styles |
| `content` | handwritten `content/pages/`, six `content/fragments/`, registry/guide data under `content/data/`; existing evidence datasets under `assets/data/` |
| `validators` | topic reference and audit packages under `scripts/validation/`; original regression tests remain under `tests/` |

Eight fully generated HTML files and `legacy-routes.js` will temporarily use
`build/compatibility-seeds/` in the first source-layout move. They are bootstrap
artifacts, not new authored content: today's generator validates some anchors
before regenerating their destination pages. A stale seed must fail parity;
regenerate deliberately with the existing generator and review the resulting
changes. Do not hand-edit a generated seed or take it from a prior `dist` directory.

The dependency audit checks all root HTML href/src destinations and HTML IDs,
CSS URL/import references, literal runtime imports/fetches, the explicitly
verified dynamic course loader, and path-shaped Markdown links. It is not a full
Markdown/browser parser; mathematical bracket notation is not treated as a file
URL. JSON provenance uses several different path conventions, so all its original
files and evidence packages are retained byte-for-byte rather than guessing that
every code-like JSON string is a local URL.

## Migration gate and sunset

The independent frozen inventory (368/367 files, 27 HTML and whole-tree hashes)
prevents dropping unlinked evidence or changing science under an organization-only
change. It is temporary. After source moves and the Actions cutover preserve the
public artifact, separate this baseline verifier from the normal build: ordinary
content edits must derive output from current authoritative sources and mapping,
not require rebasing hundreds of frozen file hashes. Keep targeted scientific,
model, export and route regression guards. A later reviewed generator change can
render before validating anchors or resolve anchors from source/registry, then
remove the generated compatibility seeds. No such generator change is included
in phase 1.
