# 802.11ad actual receiver: source and evidence boundaries

Date: 2026-10-12. Local source integration only, not deployment or actual-browser acceptance. The existing `80211ad` paper identity remains unique. [The original isolated Golay exercise](../golay-radar.html#experiment) is an unchanged prerequisite; [the actual receiver lesson](../80211ad-receiver.html#question) executes a separate source-derived chain. Neither establishes full-paper reproduction.

## Source and exact freezes

Kumari, Choi, González-Prelcic and Heath, [IEEE802.11ad-Based Radar, fixed arXiv:1702.05833v1](https://arxiv.org/abs/1702.05833v1), 2017-02-20, 35 pages. Source PDF SHA256: `c16755b358bfe4152fea3bba5bc54c05370a0d8491aa481a73816bb12447e8b8`. The PDF and extracted text are not distributed. Numbering is fixed v1, never silently substituted with the journal edition.

- [Source audit](../scripts/validation/80211ad/SOURCE-AUDIT.md): equations, absent settings, source/implementation choices and printed sign/unit discrepancies
- [Sequence audit](../scripts/validation/80211ad/SEQUENCE-AUDIT.md): primary-source-backed Ga/Gb recurrence, ordering/reversal and π/2 modulation; no normative standard edition was independently opened and no complete PHY compliance is claimed
- Python reference freeze `70191a5acbb6ab90d1da3791aaee86d557b8605884cac8251fb834acda4a3024`; 58 manifest-bound files, manifest SHA256 `133586b0a85f3d2324b75bbb70ef71f0e1c3404dbf70904e581022c72ec8bd6a`
- JavaScript runtime freeze `b84547a2bdad7da400238c267d2a6d089b33af8f2474d8f733f18c85d9a9b430`; all22 manifest-bound files plus the [runtime manifest](../labs/80211ad/runtime/RUNTIME-MANIFEST.json), manifest SHA256 `6a7ceabfa149918d07fb6999fa1680edac77b98a32f08017b370968843d30260`

The immutable original reports remain dated evidence. Integration and later review must not rewrite their historical tests, failed runs or hashes.

## What is actually computed

The source-backed sequence is the full3328-chip SC preamble: 2176-chip STF, then1152-chip CEF with its sign and surrounding inverted-block context. Physical8× and π/2-modulated generation run from new scene inputs. The finite-support ideal post-matched-filter RC signal and independently normalized finite RRC-colored noise are an explicit modeling mismatch; they are not claimed to be two finite RRC filters with an identical cascade.

Generated or imported actual complex samples are held separately from scene truth. The receiver runs normalized STF acquisition, finite-grid fractional phase selection, repeat-based coarse CFO, STF/CEF correlations, centered channel extraction, within-frame/pooled/across-frame Moose, and slow-time complex DFT. Target parameters enter generation and post-receiver evaluation only. Same-held-record policy branches do not regenerate samples; each record has sample and metadata hashes. A hash identifies supplied bytes and metadata, not physical authenticity.

Source locators: §II-A Figs.1–2; §IV-A Eqs.(14)–(19); §IV-B Eqs.(21)–(28); §IV-C, Remark3 and Figs.13–14. Unknown oscillator offset is inseparable from Doppler. Positive velocity is toward the monostatic radar, with fD=2v/λ and R=cτ/2; the source's inconsistent printed phase sign is explicitly documented.

## Independent numerical evidence

[Independent Python review](../scripts/validation/80211ad/INDEPENDENT-NUMERICAL-REVIEW.md) verifies the58-file freeze, 18 owner tests, 19 complementary checks and23 separate independent checks. It independently replays11 fixtures,1216 trial rows,26 summary objects and34 regenerated artifacts. Main points use128 trials, stress points64; the source's10000 trials per point and original digitized curves are not reproduced.

[Independent port review](../scripts/validation/80211ad/INDEPENDENT-PORT-REVIEW.md) accepts the exact22-file runtime. Its fresh13 scenes and four same-held-record policy branches make7,105,533 numeric comparisons, separately from the owner's26 oracle checks and4,596,654 values. Fresh96 noise-only records check variance, covariance and matched-cell units; these small samples cannot certify tiny false-alarm probabilities. All stage arrays, accepted/rejected choices, map masks and candidates are checked, not just peaks. The owner's11 kernel and18 Worker tests include actual Node Workers; classic-loader VM coverage is labeled separately.

## Lesson boundary review

[Independent lesson review](../scripts/validation/80211ad/INDEPENDENT-LESSON-REVIEW.md) accepts the exact13-file lesson freeze `77b4347b33a549b57d6e7283efb579bbaaa00b41e2bae792049d4059952e98dd`:20 independent checks and29 owner tests pass, alongside11 kernel and18 Worker tests in isolated copies. Four raw/history export pairs produced by the actual mounted UI handlers were replayed independently with1,668,006 numeric and116,624 exact comparisons. The production UI was mounted in an in-memory DOM with actual Node Workers. It was not executed in a real browser. Historical import-staleness and same-file retry failures and their repairs remain documented in the original lesson report.

## Unfavorable results stay visible

- All three low-SCNR stress groups, −30/−20/−10dB, retain0/64 accepted acquisitions. Their conditional accepted-only RMSE is null, with denominator0; failed acquisitions are not assigned zero error or silently removed
- The retained Fig10-like512 main trials give coincident STF/CEF range estimates. They do not demonstrate a measured CEF accuracy advantage
- Accepted aliases can still have wrong timing or apparent velocity; the7MHz oscillator stress is retained. Coarse CFO, single-frame and across-frame principal intervals differ
- Global Moose on mixed targets is a mixture diagnostic, never a target-velocity list. First-frame destructive cancellation can reject a record with later strong echoes; it is not repaired using truth
- Fractional phase, π/2 boundary transients, single-frame bias and finite pulse support remain observable. Perfect-synchronization/iid-noise CRLBs are ideal comparators, not demonstrated attainable bounds for this front end or selected accepted trials
- Historical source-like two-target evidence has10000 Doppler bins and28 candidates. The same raw record replayed under the bounded256-bin setting has29 candidates. Both are explicit, different processing budgets; the runtime does not reproduce the full10000-bin map
- Noise-only H0 familywise thresholding does not control signal-induced sidelobe candidates. Every candidate remains in the record; candidate count is not confirmed object count

## Resource and lifecycle limits

The chip rate is1.76Gchip/s;2.16GHz is channel width, not that sample rate. The actual runtime admits q=2/4/8, up to64 frames,2,000,000 complex received samples,256 Doppler bins and262144 map cells, subject to joint support constraints. Finite receive windows include channel-extraction context and may not overlap subsequent frames. Fixed delay through the CPI is a stop-and-hop assumption; range migration is not corrected. Zero-padding refines grid spacing, not finite-CPI resolution.

STF2048-chip and CEF1024-chip processing use different integration lengths. Single-frame, pooled and adjacent-frame estimates can use the same records while differing in valid-pair count and temporal spacing; there is no unconditional equal-resource superiority claim.

The runtime's Node resource reports and synchronous export/import boundary benchmarks are not browser timings. Initial structured clone, bounded JSON parsing, plain-array normalization and outgoing clone have non-preemptible intervals. Cooperative cancellation applies at numerical macrotask checkpoints; Worker termination is the hard-stop path. Node VM is not an actual browser.

## Optional source-free offline evidence

The [evidence map](../data/80211ad-evidence-map.json) records every archive byte count/SHA256, complete member inventory and part hashes. Small runtime ZIP and optional Python/reference and full JavaScript evidence archives contain first-party code, fixtures, reports and retained failures. Source PDFs, extracted full text and third-party implementation code are excluded. No archive, Python file or evidence map is a startup dependency.

Archives larger than9,000,000 bytes are distributed as ordered raw binary parts with a SHA256 manifest. [The portable reassembler](../data/reassemble-80211ad-evidence.py) verifies all parts and the whole unchanged ZIP, works from a foreign working directory, and refuses conflicting output. Download all named parts beside their manifest before invoking it. Raw part files are not separately extractable ZIPs; there is no fake missing whole-ZIP link.

## Gates that remain open

Actual browser rendering and Worker lifecycle, narrow-screen/keyboard/accessibility checks, interruption/import/download flows, cross-engine arithmetic, memory and painted-result latency require a later exact-build review. No browser was used for this source integration. Original10000-trial source curves, full PHY/payload/MAC/arrays/self-interference, measured hardware/road performance, communication throughput and full-paper coverage remain open. The site retains35 primary paper identities and zero full-paper reproductions.

## Narrow dependency contract

[Independent runtime-contract review](../scripts/validation/80211ad/INDEPENDENT-RUNTIME-CONTRACT-REVIEW.md) records361 focused checks,22 grouped regressions, one clean build and25 negative/preservation builds. Its [receipt](../scripts/validation/80211ad/INDEPENDENT-RUNTIME-CONTRACT-RECEIPT.json) binds exact checker, contract and frozen script hashes. The17 classic whole-source profiles retain all earlier ICI profiles; all32 ESM profiles remain unchanged. Document-to-Worker and Worker-to-import bases differ explicitly. Unknown paths/extensions, relocated known hashes and source-plus-JSON hash spoofing fail closed. This is a narrow code-owned inventory, not a generic JavaScript dependency parser or actual-browser validation. Its dated873-public-file clean-build hash predates adding this review/receipt and does not masquerade as the final release hash.
