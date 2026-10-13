# OTFS receiver: source and evidence boundaries

Date: 2026-10-12. This is local source integration, not deployment or actual-browser acceptance. The one canonical entry is [OTFS receiver](../otfs-receiver.html#intuition); the existing [fixed-version reading guide](../reading.html#guide-otfs-joint-estimation-2020) retains its ID. There is one case, unit and notebook topic, with six-depth direction links. The influence catalog keeps its existing nine papers and citation snapshots; no duplicate OTFS catalog entry or invented citation count is added.

## Source and two independent experiments

The inspected edition is [arXiv:1910.01896v1](https://arxiv.org/pdf/1910.01896v1), 2019-10-04, PDF SHA-256 `7787286d004ea1014fea059dea88ad4320536a8afcef44dc89a482b0feaaabdc`. Source locators use this version: §III equations (12)–(16), §IV-A/B parameter likelihood and unknown complex gain, §V-A Gram-factor MP-G, and §VI-B/C figures 4, 6–7 and equations (52)–(53). The 2020 publication has a different title and must not silently replace these locators. No paper PDF or privately extracted source text is redistributed.

- Sensing has known x, a separately generated complex y, P=1 and unknown delay/Doppler/complex gain. Actual candidates on a declared finite grid are evaluated; each candidate fits its own complex gain and records score, energy, likelihood and residual. A complete grid is globally exhausted only on that grid. Continuous refinement, a continuum certificate, derivatives/FIM/local CRB and multipath sensing are unavailable
- Communication has a different observation and perfect supplied CSI. Gram MP-G and full LMMSE use the same raw y/H/noise variance in a comparison. The first lesson fixes zero Gram pruning. Soft posterior changes and iteration histories come from actual calculations. It is not MP-Psi, low-complexity LMMSE26, a coded link, original-size statistics or a measured achievable rate
- Generation truth is separate evaluation data and never initializes the receiver. A fitted residual is the nominal declared-operator residual, not a validated physical cross-model discrepancy

## Operator and numerical conventions

The source-style operator explicitly declares cyclic prehistory, right-endpoint quadrature, negative carriers, one-sample shifted DD origins and an effective complex hprime. Vectors use d=k+N*l and row-major channel matrices. Noise variance is v=E|w|² and the likelihood is exp(−||y−Hx||²/v). The finite rectangular operator and literal equation (14) remain separately named numerical models. Their physical cross-model mapping is unproven. Agreement of two ports at fixed hashes does not prove physical waveform equivalence.

The accepted Python reference SHA-256 `92b997201493a3187b5ddb37026672ef44e163131e422bdf8618f11b17aa235f` remains unchanged. The JavaScript full-LMMSE port separately corrects the absolute variance floor, removes the common score analytically, stabilizes log normalization and rejects sparse input arrays. High-precision checks support that correction; exact equality to the old Python in the corrected corner is not falsely claimed. The Gram-pruning distribution bound is not a loopy-belief-propagation sensitivity guarantee.

## Immutable optional downloads

These archives are source-free offline evidence. They are byte-preserved downloads and never startup assets:

| Archive | Bytes | SHA-256 |
|---|---:|---|
| [Python reference v1](../data/otfs-effectiveness-reference-v1.zip) | 2,240,856 | `6ede124f88b9deceb1a16cc8b4f60978ae052c317f28d022840786e6a5be520c` |
| [Communication kernel v0.2.0](../data/otfs-mpg-kernel-v0.2.0.zip) | 5,582,712 | `140cc61c54373e2c2e8193d3fcdc5db02750e8982213cd59118607506870e663` |
| [Sensing kernel v0.1.0](../data/otfs-sensing-browser-prototype-v0.1.0.zip) | 5,097,595 | `ea9326449890efdaff94273731118d0772c65df2898d75cd7ab7f099a0c3d84c` |

The byte-preserved delivery manifests are [Python](../data/otfs-effectiveness-reference-v1-manifest.json), [communication](../data/otfs-mpg-kernel-v0.2.0-manifest.json) and [sensing](../data/otfs-sensing-browser-prototype-v0.1.0-manifest.json). [The evidence map](../data/otfs-receiver-evidence-map.json) records exact lesson/module hashes and narrow status. Kernel FREEZE files are published with the corresponding runtime subdirectories. Node-only Worker endpoints are staged for tests but not needed by the page.

## What was actually validated

Communication review covers 103 independently valid raw receivers, 58 operator cases, 31 100-digit LMMSE cases, 27 Worker checks and 14 pruning-bound checks. Sensing review covers 586 fresh operator cases, 12 fresh grid cases, 35,432 independently replayed candidate records and 398,571 numerical comparisons. The two operator ports agree on 72 declared cases, with maximum absolute error 4.440892098500626e−16; this remains a numerical interoperability result at the frozen hashes.

The owned lesson has 49 passing focused Node/simulated-DOM tests, including 17 independently authored checks; all 12 frozen numerical modules retain their bytes. These checks cover fresh inputs, same-y detector comparison, actual histories, truth separation, cancellation/reset and max-envelope numerical export replay. They are not real-browser or physical-device tests. Actual downloaded-file recovery and full painted-result timing remain open.

## Integration and preservation

Runtime source files are owned under `labs/otfs-receiver/` and published under `otfs-receiver/` with subdirectories and relative imports preserved. The explicit manifest maps every file; no copy glob or rewritten frozen URL is used. Node 24's public SourceTextModule API parses static imports/re-exports in one isolated parse-only child, without linking or evaluation. Runtime edges are explicitly reviewed and bound to the complete source SHA-256 of every published module; changed or unknown module bytes fail closed until reviewed. The two actual browser-worker constructors use literal module-relative URLs, so either missing mapping fails the dependency gate. There are 16 published modules: 14 OTFS modules and two unchanged historical command-line audit modules. The historical modules' caller-supplied adapter/core paths remain explicitly unverified runtime inputs; the site makes no generic computed-import or JavaScript call-discovery guarantee. Existing .js fetch/require checks retain their legacy scope.

Historical registry/guide hashes are retained through a narrow exact inverse of reviewed new fields, arrays and appended records. Existing source routes, resources and CRB implementation are preserved. Browser gates, original full-size detector/radar figures, continuous/multipath estimation, original OFDM/FMCW fair-resource comparisons and whole-paper reproduction stay open. No remote ref, PR, merge or deployment is part of this integration.
