# Accepted-lesson publication modules

The public website is a deterministic projection, not the full private source tree.
`build/publication-allowlist.json` is the single module manifest. Each paper has one
canonical identity, an `enabled` switch, explicit acceptance/publication states,
a teaching entry, runtime owners, and (where applicable) shared-page sections and
shared asset prefixes. No server or private registry is sent to visitors.

## Pipeline

1. Keep all 35 research records and implementation sources in the repository.
2. Run the existing full compatibility build, scientific tests and reproducibility
   gates unchanged. Their full intermediate output remains `dist`.
3. Run `python scripts/publish-accepted.py --input dist --output published`.
4. Run `python scripts/test-publication.py --input dist --output published`.
5. Upload **only `published`** to Pages.

The projection drives the paper directory, constellation, fallback list, search
data, navigation, compatibility redirects, pages and exclusively owned assets.
Runtime files retain their validated bytes; only discovery/redirect presentation
is rewritten. Basic mechanism tools remain available and are never counted as
paper reproductions. Their source citations may name papers that have no public
paper lesson. All 17 enabled modules are bounded teaching implementations; zero
are represented as full-original-paper reproductions.

## Plug out

Set a module's `enabled` to `false`. Its discovery record, dedicated lesson page
and exclusive runtime owner are removed. If a lesson shares a basic page, list its
section IDs under `sharedPageSections`; those sections are removed while the basic
page survives. A shared runtime owner needs `sharedAssetPrefixes` to identify its
exclusive files. Retained links and redirects are revalidated against the final
artifact. The automated test exercises a dedicated OTFS module, a shared runtime
near-field module, and a capacity-distortion section on a basic page.

## Plug in

Add one canonical module record only after its bounded implementation is accepted
and those exact implementation bytes are deployed/approved for this release.
`acceptance: bounded-accepted` and `publication: deployed` are required when
`enabled: true`; local-only or unaccepted modules fail closed. Add explicit runtime
ownership in the compatibility manifest and publication manifest. Preserve source
interpretation and failure limits in the lesson and its discovery boundary. Review
shared owners and direct/generated resource dependencies; do not solve missing
ownership by copying the entire private registry, scripts, docs or evidence tree.
Update the release-specific expected identity/count assertions only after review.

Tests cover exact identity sets, omitted routes/assets, static links and anchors,
runtime dependencies, unchanged computational modules and basic controls,
reproducible projection, module disabling, and rejection of local-only enablement.
The existing whole-site scientific tests remain prerequisites, not replaced by
these publication tests. Browser rendering is an additional release gate.

## Release boundary

This release starts from main `33faf04211f4d95a2a9daa04d820d5fb61aa8af7`.
It includes 17 previously deployed and now accepted paper identities. The other
accepted local implementations remain excluded. In particular, only the original
basic near-field curvature experiment is extracted from its mixed page; the
local-only research chain and its runtime do not ship. New import successors,
solver repairs and unpublished research experiments are outside this delta.
