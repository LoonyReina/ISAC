# Independent ICI lesson boundary review

## Decision and exact scope

**PASS for the enumerated Node/parsed-DOM/serialization/numerical-evidence boundaries on the final frozen lesson. No unresolved defect in this reviewed scope. Actual-browser and integration/release gates remain separate.**

Final lesson freeze: `f06ed60ac5d084a3f841c99563f8bcfae55d1f74b2744cd89acbd3973578c171`. All 17 owned source/record files and the manifest itself match the implementation owner's final bytes. The six numerical/Worker runtime files exactly match the independently accepted prior port, before and after this review. This review did not modify owner files, use a browser, contact a remote, publish, or run the whole-site aggregate.

- Page: `261da9521ffacdd71e212cac83894f9188ebf2d1a895f528cc70f9569fd90924`
- Controller: `e4b41da1fc612e1c3f9cccdc3998384cf8349762c27b856d911444d0746e7cfb`
- View: `1b51814832d69dcbce235594cf6812d8766f9017cbf90ebaf6f609cf9343fd0b`
- Python core: `fee9e4a55707fe251f73bf343d0ac0142607d6c827cfd4e8bd0c974bba439cdb`
- Full 17-file and six-runtime byte inventories: `FINAL-HASHES.json`

The source envelope stays N64/M16/NR8/NT8/L12, Pmax1–4, finite angle/CFO grids, no continuous refinement, known nonzero X. Lesson transmit beam is explicitly fixed to −30°. The separately accepted mathematical port review remains its own evidence, not inherited UI acceptance.

## Exact final test census

- **39/39 owner-authored regressions** independently rerun; zero failures/skips. These are regression replay, not newly independent numerical oracles
- **16/16 independent grouped boundary/UI tests**; zero failures/skips. These include 24 distinct invalid-input mutations, actual Node cancellation at input-ready/joint-refit/recovery, a fresh mounted default run, and signed-zero Node/Python roundtrip checks
- **Four fresh Controller/native-Worker exports independently replayed in Python:** 202/202 emitted shape-tagged arrays, 781,312 real array components, 855,396 total compared numeric components including scalar/list checks; zero unverified emitted arrays
- Replay retained 12 attempted traces, 8 accepted joint refits, 588 actual CFO evaluations, all detections and threshold stops. Three deliberately corrupted records (including a foreign trace with relabeled revision) were rejected
- **One maximal-workload Controller simulation/export**: 7 returned angles, all 28 accepted supports, all 3,164 CFO evaluations and all seven iteration caps
- **One actual maximal raw-import rerun**: 495 arrays / 1,778,240 numeric components match the prior result exactly in numeric value; ±0 compare equal for this numerical assertion, while input X/Y hashes separately establish byte identity

Node v24.19.0; Python 3.12.14, NumPy 2.3.5 and SciPy 1.17.0. Python uses single-thread BLAS. Logs are `owner-suite-final.log`, `independent-boundaries-final.log`, `maximal-export-final.log`, `maximal-raw-rerun.log`, and `python-replay/verification.log`.

## Actual output/evidence separation

The mounted production UI → actual native Worker path was exercised, not a synthetic complete object. Every displayed I/Q line vertex was checked against independently calculated coordinates for all 64 samples of both actual complex components. All seven view stages were rendered; selecting stages/truth does not dispatch another solve or mutate serialized receiver output. Canvas/DOM tests use the owner's lightweight in-memory adapter with independent assertions; they do not provide layout, browser rendering, keyboard/assistive-technology or real-browser file-download evidence.

A fresh default mounted run retains **4 hits / 3 false detections / 1 miss**, an iteration-cap branch and all raw rows. All methods' detection-row and branch-stop counts remain visible across view/truth toggles. The actual CFAR map reads computed channel/power/threshold/count arrays; view-only stencil construction does not become a second detector. Outside q<L is labeled untested. Empty/no-angle outcomes are not zero-error success.

Every result is supplied by the real Worker, with no precomputed startup fixture, fetch, storage, animation replacement or hidden truth-assisted inference. Receiver changes perform a genuine full rerun on held X/Y; simulation changes invalidate the observation. Imported historical records never become fresh inputs. The Python checker verifies full original-Y joint refits and every emitted stage array from the exact exported observations/config, so matching labels alone cannot conceal mixed old/new arrays.

APES and known-X FFT share operational X/Y and the observed MUSIC candidates. ICI-free is separately hashed, synthetic and a different Y; raw pairing remains caller-declared. Printed Eq.63's omitted known-X removal and the unnormalized FFT receive gain are disclosed. Source-style/conventional FDR and conditional RMSE remain distinguished. Literal source alias failures, finite-support/grid limitations, nominal-versus-achieved Pfa and full-paper/figure limitations are not replaced by success claims.

Independent Python maximum array discrepancy: 3.25962901115e-09 absolute and 5.86196929065e-13 scale-normalized. Acceptance is elementwise absolute error ≤2e−8+2e−8×reference magnitude; shapes, counts and provenance are exact. Full per-array inventory and detailed case scope are in `python-replay/REPORT.md` and `verification-results.json`.

## Lifecycle, raw input and export boundaries

Checked cancellation, queued results, supersession, edits, resets, late successful/failed file reads, dead Worker replacement, repeated close, pagehide/BFCache-style restoration, errors, import-while-running and export-during-replacement. Superseded/cancelled/time-capped/rejected work does not become a fresh completed result. In-flight export remains the prior complete historical snapshot; it is never a mixture of current draft and old arrays.

Raw imports are bounded by 5 MiB both before File.text and by actual UTF-8 encoded bytes before parse; malformed/oversized/sparse/nonfinite arrays, forbidden keys, wrong dimensions, bad pilots, unsupported configs and historical success objects are rejected. Optional SHA values are syntax-checked before dispatch and recomputed by the Worker. Size limits are boundary tests, not a generic security/memory-sandbox certification.

Full-history exports use a separate 80 MiB cap and are explicitly historical, not accepted by the raw importer. No record is silently truncated. An intentionally oversized synthetic history causes a clear export error while completed state and smaller raw export remain available. The fixed maximum exercised real workload is below that cap. The final serializer reads typed arrays directly without the earlier full numeric clone; serialization and UTF-8 allocation still occur before the cap check; therefore the cap is not a peak-allocation guarantee.

Signed-zero JSON now uses the numeric token **−0.0** (ASCII `-0.0`), preserving IEEE sample identities in JavaScript and Python; no string-marker replacement is used. Independent tests verify ordinary escaping, marker-like strings, literal __proto__ keys, omitted undefined object values, array null semantics, valid raw negative-zero import, exact exported sample SHA, fresh reimport and independent Python hashlib.

## Defects and review-oracle correction

1. **Independent finding: invalid replacement orphaned an active job.** Before the fix, Controller.run advanced its epoch and failed new config validation, clearing the only job handle without cancelling the prior Worker. Observed state was error/job=null with one pending uncancelled job. The owner now cancels the previous owned job before validation; independent final replay verifies cancellation delivery, queued-success suppression and pending=0 after acknowledgement
2. **Independent finding: raw signed zero lost its hash identity.** An accepted JSON −0 sample computed successfully, but native JSON.stringify exported +0 while retaining the original Y SHA. Reimport then failed checksum. `negative-zero-before-fix.log` preserves this failure. The owner changed only lesson serialization; final raw Node/Python roundtrip passes with unchanged runtime hashes
3. The owner additionally self-identified and fixed imported non−30° transmit-beam leakage past fixed lesson copy, and an unused invalid simulation draft blocking an otherwise valid imported-held run. Both are covered by final regressions; the tx boundary is independently adversarially tested
4. The first maximal numerical comparison used strict JavaScript signed-zero identity against ordinary JSON-normalized historical outputs and rejected −0/+0. That was a review-oracle mismatch, not a numerical receiver error. The corrected numeric comparison explicitly treats ±0 equal, with input SHA identity tested separately. It led to the distinct actual raw-export defect above. The initial comparison log remains labeled `maximal-raw-rerun-initial-signed-zero-oracle.log`

## Maximum exercised export cost and retained limitations

The resource stress uses independently chosen QAM/noise seeds 938411/329878 with declared order7 and normalized threshold1e−9 solely to exercise the maximum branch envelope. The seed was selected for seven observed grid peaks; it is not an untuned scientific performance or Pfa trial. All seven caps remain explicit; zero detections in this stress is not false-alarm calibration.

- Actual history: **36,372,531 UTF-8 bytes**; raw input: **689,885 bytes**
- Actual history export: **628.7 ms**; JSON parse: **71.4 ms**; numerical computation: **10.250 s**
- Whole-process OS maximum RSS: **510,144 KiB** (~498.2 MiB), including Worker, serialization, encoded-byte allocations and parsing
- This single observed stress run is neither a browser measurement, peak JavaScript heap bound, guaranteed latency, p95 nor SLA. The direct serializer avoids the earlier numeric deep clone but still allocates intermediate strings and an encoded byte buffer; the earlier signed-zero-safe revision measured 543,652 KiB whole-process peak RSS. That earlier measurement is retained under revision-233d60c7 and is not relabeled as the final revision. The lesson now visibly discloses record sizes, post-allocation cap, raw-input alternative and pending browser memory/responsiveness. Actual desktop/narrow/browser memory, download responsiveness, cancellation, layout and accessibility gates remain **unpassed**
- Maximal reimport remains fresh computation with null trusted truth, unchanged X/Y hashes, all seven caps and 36,044,788-byte historical output

No original paper figure, full-size converged OMP, continuously refined solution, achieved Pfa calibration, BER, field data or universal superiority is claimed. No generic security certification is implied. Whole-site navigation/dependency/aggregate preservation, final integration snapshot and publication remain the integrator/release review's separate gates.

## Reproduction and artifacts

Run `bash run_review.sh` from this directory. It checks all final hashes, reruns both Node suites, exercises maximal export and actual raw rerun, replays the preserved four full exports in Python and reruns deliberate corruption checks, then rechecks exact owner/candidate hashes. Regenerating numerical exports changes IDs/timing bytes and requires refreshing the artifact inventory; preserving their bytes and only running Python gives exact saved-record verification.

`REVIEW-MANIFEST.json` inventories review scripts, logs, reports, signed-zero input and the final freeze/hash evidence. Larger numerical evidence files have exact hashes in their generation/export reports. All work products remain isolated under this review directory.
