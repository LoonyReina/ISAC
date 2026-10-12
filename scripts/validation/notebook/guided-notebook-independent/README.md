# Guided notebook export safety audit

This is an independent, dependency-free Node audit of the guided learner notebook in `practice.html#notebook`. It evaluates source, generated metadata, pure export functions, and a minimal simulated DOM. It does not certify a real browser, downloaded-file delivery, layout, accessibility, scientific correctness, or numerical experiments.

The notebook is a local learner-written draft: empty and partial drafts must export; reference context must be separate from learner entries; presence checks must not imply correctness.

## Scope

- Topic selection: one bounded allowlisted unit ID; malformed, unknown, duplicate, and hostile query data never become links
- Generation: metadata and inline JSON are safely escaped
- Markdown: learner text is literal, including Unicode, multiple lines, raw HTML, and arbitrarily long backtick runs
- JSON: exact string preservation, ten learner fields, separate reference metadata, explicit export-time semantics
- Downloads: fresh repeated exports, fixed safe filenames and MIME types, recoverable Blob/object-URL/click failures, cleanup on timer and page exit
- Privacy: no submission, network, storage, clipboard, import, full-URL capture, or referrer capture
- References: fixed site provenance and useful destinations outside the website

## Running

From the repository root, run:

    node --test scripts/guided-notebook-independent/*.test.cjs

Or set `NOTEBOOK_REPO` to the repository root before invoking the test. Tests read the implementation; they do not edit the checkout. Only standard Node modules are required. All hostile fixtures are test data.

The final report records the exact run and its limits.

## Artifacts

- `REPORT.md`: findings and verification limits
- `export-safety.test.cjs`: 18 export, UI-binding, privacy, and malformed-input checks
- `metadata-safety.test.cjs`: 5 generation and route-validation checks
- `test-results.txt`: recorded 23-test run
- `source-sha256.txt`: audited source fingerprints, using repository-relative names

To verify the audited snapshot, run `sha256sum -c scripts/guided-notebook-independent/source-sha256.txt` from the repository root. A changed fingerprint requires rerunning the audit.
