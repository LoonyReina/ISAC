# Independent acceptance: bounded JavaScript pilot-pattern numerical port

Date: 2026-10-13. Existing paper identity: `supplement-case-pilot`. Governing source: arXiv:2401.09643v3. This gate accepts the bounded interpreted standard-resolution numerical port, strict raw-bearing records, and Node-tested Worker lifecycle only.

## Outcome and immutable target

**ACCEPTED for a separate teaching integration and browser-validation stage.** All independent final suites pass after the implementation owner repaired the record-integer and Worker-client defects below. This is not browser, UI, deployment, original-figure numerical reproduction, IAA/MUSIC, measured-RF, or whole-paper acceptance. No browser, repository, Codex, upload, merge, or publication action was performed in this review.

Accepted prototype manifest: `08c3947e6e3d49b34b47035231d307c34a0a373bc5beb2532695ed426e7dbd80` (26 manifested files; 2,072,864 bytes). The owner explicitly froze this candidate before the final rerun. Every final suite's runtime hashes match:

- core.mjs: `53591126e91fe7f1c838bc7cd58e57a1a50035de9b5a811206d3ce3c47c1c87f`
- processing.mjs: `48427712f64f00de71e5c3e44af9557ee577343159b50b47179a22c4e10fc7e7`
- records.mjs: `1982bfa3c17a479c8fb9e26cd5fd270a792c677b4a2e2f301ae89b6ca78a7c28`
- protocol.mjs: `0d3fcc205699d7d36ad9d35556d9c8f105d0124d03dad27f29995dbbffa474d1`
- worker.mjs: `b157c3560b5126417150bd5d7237389ed6c1b9c8c1867bdf7cbab942c705a2c2`

The frozen Python source, scientific contract, and accepted experiment hashes match the earlier source gate. The separately required source-free reference archive SHA-256 is `d91f9e98ee965aae9d591923e3f9538eb9291fc43ed131e3ed4ad265e25eae96`. No scientific reference file was modified. Runtime or contract changes invalidate this exact-target acceptance until affected checks are rerun.

## Independent numerical evidence

`audit_raw_replay.py` imports neither the author's Python implementation nor their fixture-export/test helpers. It reads the actual frozen NPZ raw records, verifies 296 constituent array hashes, and drives the JS device through a small JSON-lines adapter. NumPy independently evaluates retained Fourier rows, physical-coordinate sums, near-tie candidate grouping, and evaluation-only matching.

- All 20 Fig.10 structural fixtures, three Fig.23 comparator records, and six stress records pass
- All 600 paired noise frames are replayed through 1,800 actual JavaScript receiver, candidate, and evaluation paths; the independent Fourier/map/candidate oracle and frozen results agree
- All six D guard settings use identical y and pilots; A and D have different y with equal whole-frame transmit energy
- 390 arbitrary-raw tiny cases cover N=12/24, all supported S=2/3/4/6 offsets and ell values, J=1/2/3, unequal complex pilots, and negative/noninteger physical map coordinates
- Total: 2,225 raw receiver/candidate/evaluation checks, 425 complete-map comparisons, and 393 physical IFFT/FFT comparisons, including non-power-of-two padding and odd Doppler length
- Largest independent cell residual: 6.80e−14; largest complete coherent/FFT residual: 9.49e−12, within the frozen scale-aware tolerance

`audit_physics.py` independently builds dense finite-symbol waveforms and verifies 90 transmit configurations, 1,860 integer/fractional physical forward cases, 1,470 within-guard ideal-model boundaries, 390 truly beyond-extraction-guard mismatches, 1,170 unequal-pilot covariance matrices, 1,170 same-y cross-guard correlations, and 390 retained transmit-energy cases. Actual CP/frame energy normalization and noncircular predecessor/gap-symbol effects are retained. Guard failures were tested beyond Ncp+ell*K; the contract's min(...,N) limit is a sufficient claimed domain, not a claim that every point beyond that conservative limit must fail.

`audit_schema.mjs` passes 336 schema/firewall/domain tests, including rehashed omissions, shortened/replaced arrays, forged objective/map/evaluation/metadata/raw/energy/noise fields, exact integer counts/indices/alias witnesses, and no partial-record success. It exhausts 6,724 offset patterns in the live supported domain and 313,560 residue candidates against independently constructed physical steering ratios. S=5/7 are not live-supported because no allowed N is divisible by them. M=1/2 remain uncertifiable; invalid rectangles fail, and the immediate next float beyond a universal alias period cannot gain a false certificate.

`audit_contract.mjs` passes 48 further checks: receive-SNR reference plane, CP/retained energy, unequal-pilot noise variance, zero/noiseless SNR handling, a 200,000-sample proper-complex PRNG moment diagnostic, raw/generator/map bounds, stable near-tie selection, fixed rather than per-map normalization, and forged SNR-ledger rejection.

The receiver's accepted input remains exactly grid, y, and known pilots. Extra truth/target-count/ideal/predecessor inputs fail. Changing evaluation target count, gain, or location cannot alter H, maps, candidates, or trace. Exact-zero observations remain on the known pilot mask. Imported records correctly say they certify raw receiver replay, not physical origin, and do not invent transmit energy or noise variance.

## Required scientific results and labels

All accepted frozen candidate coordinates, tie multiplicities, counts, and conditional errors agree. In the noiseless finite-grid policy, A/extended has 2/4 matches and six false candidates; D/extended has 4/4 and three false candidates; identical-y D/conventional has 3/4 and four false candidates. These are policy-selected candidates, not unique detections. Linear D retains tilted aliases. Exact single-steering uniqueness is not multi-target resolution.

The extended guard keeps 16/96 useful samples, producing a sixfold restored-noise variance penalty. Independent conventional-minus-extended mean NMSE differences and approximate paired intervals are:

- 0 dB: −0.791279971, [−0.799082648, −0.783477294]
- 10 dB: −0.014234706, [−0.015056118, −0.013413294]
- 20 dB: +0.063474421, [+0.063331516, +0.063617326]

Extended guard is worse at 0/10 dB and better at 20 dB in this declared scene. No universal accuracy benefit is supported. These 600 NumPy-seeded trials are offline evidence. Live JavaScript Mulberry32/Box-Muller observations are separately labeled and do not claim NumPy seed parity. Live SNR uses that observation's clean mean power over full sensing blocks, explicitly distinct from the offline paired study's fixed-D plane.

Stress failures remain visible: source-scene continuous Doppler NMSE 0.0244593; continuous +6000 Hz 3.71346; off-mask payload 5.04762; beyond-guard delay93 0.0126980. Fractional delay passes only the declared half-open rectangular-symbol pulse model. Zero signal has no candidates and null reference-normalized NMSE. Common-gain-aligned metrics remain evaluation-only and do not silently correct the receiver.

## Worker defects repaired and independently retested

The real-worker audit runs the actual browser entry module under a Node worker_threads browser-API bridge. Nineteen tests now pass, covering all four operations, repeated replacement, cancellation, reset/invalidation, disposal, stale/old failures, terminal-only complete results, fatal worker events, re-entrant callbacks, and one shared cooperative time budget across stages, branches, and replay-plus-reprocess phases.

The initial review found four client root causes (five failing assertions): clearing a newly started identity after a terminal/rejection callback; rendering a completion already queued when cancel was requested; allowing run after disposal; and retaining a phantom request after postMessage failure. These were repaired by the owner and rechecked. Two schema false passes allowed tiny noninteger changes to alias witnesses and retained-count metadata; these and related integer quantities are now exact. Historical failure records and the owner's rejected source/manifest evidence are preserved.

Six independent Node benchmark samples pass. Default two-guard runs take 165–248 ms wall time, producing 4,539,885-byte JSON records. Maximum tested J=3/Ncp=96/four fractional paths/three guards take 559–616 ms and produce 7,957,808-byte records. These are single-host Node measurements, not browser or mobile latency/memory guarantees. The time budget is checked cooperatively, including before successful completion; synchronous bounded serialization/clone sections are not hard real-time cancellation points.

## Historical evidence and next gate

`SCHEMA-FAILED-*.json` and `worker/pre-repair-results.json` are rejected implementation evidence. Two reviewer-harness failures are preserved separately: the first raw replay attempted to JSON-serialize a NumPy int64; the first physics test incorrectly expected failure beyond the conservative min(...,N) bound even when the actual CP-plus-discard window still protected it. The worker's intermediate post-repair identity assertion was adjusted to compare public id/revision rather than an added internal cancellation flag. These are explicitly corrected test assumptions, not residual product failures.

The next integration must independently test real-browser Worker loading and lifecycle, rendering/export binding to the current completed record, physical 2D delay/Doppler axes, ambiguity/tie and low-SNR disclosures, all stress labels, imported-record scope, and mobile/browser resource behavior. Node success must not be presented as browser verification. The existing paper identity and source discrepancy ledger must survive integration.

## Reproduce

Keep this directory beside `pilot-pattern-browser-prototype` and the immutable `pilot-pattern-reference`, with Python/NumPy and modern Node available. Run `bash run-review.sh`. The small review bundle does not duplicate the 53 MB reference archive; its identity and each used raw array are verified. `AUDIT-MANIFEST.json` binds all review code, results, logs, historical evidence, and this acceptance. The separately supplied bundle receipt binds the compressed review archive itself.
