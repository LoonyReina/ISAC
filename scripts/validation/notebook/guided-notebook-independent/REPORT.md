# Independent guided-notebook export audit

**Result: PASS within the stated scope. No blocking export-safety issue found.**

Audited on 2026-10-11 using Node v24.19.0. The working-tree snapshot is based on commit `611713f79100adf6d12d2a9cc411e9452eea7643`; `source-sha256.txt` identifies the actual changed source reviewed. This audit did not edit the implementation or publish anything.

## Verification performed

- **23/23 independent tests passed**, with zero skipped, failed, or cancelled tests
- `node scripts/generate-site.cjs --check` reported the generated site current
- `node --check notebook.js` and `node --check scripts/notebook-topics.cjs` passed
- Source review covered the notebook script, generated practice page, practice content, metadata generator, and generator wiring

## Findings

1. **Topic selection is bounded and allowlisted.** Exactly one decoded `topic` value must match a registered unit. Duplicate keys, unknown IDs, invalid percent/UTF-8 encodings in relevant data, whitespace and URL-shaped IDs fall back to generic context. The 64-character ID and 4,096-character complete-query limits were exercised at their boundaries. A deterministic 600-input fuzz pass returned only `null` or the exact registered object. Unrelated query data never entered artifacts or links.

2. **Generated reference metadata is safe.** The 26 registered units have locally resolving reference routes. Unsafe IDs, duplicate IDs, remote/traversal/query/missing routes are rejected. Options escape HTML delimiters; inert JSON escapes closing-script, comment, ampersand, and Unicode line-separator attacks while preserving decoded metadata. Runtime reference prose uses text sinks.

3. **Learner entries remain separate and literal.** All ten textareas begin blank. Empty and partial drafts export. JSON preserves exact strings, including whitespace, CR/LF, combining characters, emoji, raw HTML, backticks, NUL, and lone surrogates after actual UTF-8 Blob serialization. Markdown uses a fence longer than any contained backtick run; adversarial closers, raw HTML, image/link syntax, and multiline input remain literal. Over-limit entries are visibly rejected and retained, never silently shortened.

4. **Artifact meaning is explicit.** Reference metadata and learner entries are separate. JSON carries the fixed `https://loonyreina.github.io/ISAC/` base; Markdown reference links are absolute. Export time is expressly not experiment time. Presence checks count non-whitespace fields only and explicitly disclaim correctness, execution, and reproducibility certification.

5. **Changes and downloads are non-destructive.** Topic changes retain every field. Each export reads the latest draft, topic, and time. Fixed filenames and UTF-8 JSON/Markdown MIME types are used. Blob, object-URL, anchor creation, append, and click failures keep the draft and recover on retry. Repeated exports and failure-after-success sequences revoke URLs once, clear timers, and remove temporary anchors. Status says a download was requested, never that a file was saved.

6. **The notebook has no transmission or persistence path.** No network, storage, clipboard, import, full-location, or referrer capture was found. Form submission is prevented; controls are non-submit buttons. Runtime traps verified these APIs were not accessed during exercised flows.

## Hardening applied during review

The implementation originally bounded only the decoded topic ID. The builder added the 4,096-character whole-query cap after audit feedback; the final boundary tests pass. No unresolved blocking finding remains.

## Limits

These are source checks, pure-function tests, native Node Blob-byte checks, and actual-script execution in a minimal simulated DOM. **No browser, real download delivery, visual layout, accessibility, deployment, live external-link, or scientific/numerical verification is claimed.** Markdown checks exercise fence semantics, not every third-party renderer. Exact JSON preservation starts from current textarea values; native browser normalization before those values reach the script is outside this audit. The rest of the repository's regression suite is outside this report.

Reproduce the tests and fingerprint verification using `README.md`.
