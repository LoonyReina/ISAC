# Lesson repair v2.1: rejected view drafts cannot index evidence

The independent reviewer accepted the behavior of the original four repairs but found another L01-related generic-view defect in the still-unaccepted v2 author freeze `b6190325c215b99397e22bb65519fb04f36e6dd0`: the row handler rejected a fractional value, yet rendering consumed that same rejected form draft. A 0.5 row combined cells from two real rows; 0.3 could index nonexistent probabilities.

The original v1 and v2 commits, freeze/public manifests, test inventories and evidence remain preserved. This separate v2.1 delta changes only `lesson.mjs` and its boundary regression test, and adds fresh evidence/documentation/manifests. No runtime or record codec changes occur.

Rendering now uses a dedicated last-valid integer row state. Input validation commits a row only if it is nonblank, finite, integral and within the selected frame; otherwise the previous valid row is restored without changing displayed evidence. The regression checks 0.5, 0.3, NaN, blank, −1, out-of-range2 and Infinity on a2×4 record; it compares the entire displayed table and original full record, then confirms recovery to row0.

The complete original47 + v2 boundary12 + new1 test set passes: **60/60, zero skipped**. Case names and all helper files are enumerated in `OWNED-TESTS-V2.1.json`. Fresh current-code production Blob downloads and independent Python checks again cover37 standard receivers,2 generic receivers and the genuine raw-only failure with0 invented receivers. Evidence lives in `evidence/repair-v2.1/`.

Freeze chain for integration:
1. Original new lesson commit3c25b52 and `LESSON-FREEZE.json`
2. Four-boundary repair commitb619032 and `LESSON-FREEZE-V2.json`
3. This additive selector repair and `LESSON-FREEZE-V2.1.json`

Apply each explicit before/after overlay; do not reset the original manifests. Active test inventory isV2.1. Browser/layout, full-site and deployment gates remain separate. Independent final supplement binding is pending at author freeze.
