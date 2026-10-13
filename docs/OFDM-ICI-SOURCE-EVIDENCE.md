# OFDM ICI bounded receiver: source and evidence boundaries

This is local integration, not deployment or full-paper reproduction. [The lesson](../ofdm-ici-receiver.html#intuition) recomputes an actual bounded source-derived receiver from accepted complex X/Y/config through a classic Worker. A saved replay is historical evidence; a simulation is newly generated data; fresh computation means recomputation from the accepted inputs. None establishes actual-browser acceptance by itself.

## Fixed source and numerical scope

[MIMO-OFDM Joint Radar-Communications: Is ICI Friend or Foe?, arXiv:2103.15694v1](https://arxiv.org/pdf/2103.15694v1), 29 March 2021. PDF SHA256 ec454aa4e6e270f780ee28772b37ebc8f213203f9bf121bbf82a53cdc97dd5b5. The source PDF, extracted text and original figures are not redistributed. The existing guide ID remains ofdm-ici-aware-receiver-2021 and source identity remains arxiv:2103.15694v1.

The implementation follows the actual complex observation model, MUSIC angle candidates, constrained APES CFO/channel estimation, normalized Eq65 GLRT, OMP supports with joint ORIGINAL-Y refits, valid-delay-support CA-CFAR and literal source Eq36 alias-zone correction. Truth is used only for generation and post-hoc evaluation. The live structural envelope remains N64/M16/NT8/NR8/L12, Pmax1–4, with finite angle/CFO grids. No continuous refinement or global-optimum guarantee is claimed.

The original paper uses N2048/M64. Finite L is an additional restriction beyond CP-valid delay: off-grid and unretained delays remain mismatches or misses, never snapped or clamped. Search endpoints, CFO search-bound hits, flat all-one-X CFO profiles, MDL numerical sensitivity, rank failures, budget caps and source alias-rule failures stay visible.

## Independent evidence has separate scopes

- Python core fee9e4a55707fe251f73bf343d0ac0142607d6c827cfd4e8bd0c974bba439cdb: [independent numerical reference review](../scripts/validation/ofdm-ici/INDEPENDENT-NUMERICAL-REVIEW.md). This review accepts the bounded operational reconstruction, not original favorable performance curves
- JavaScript core 3c9e13e8bbd478802c4292999c7633b4e35dba7f2b7a861e7413dce43ac5ddbe: [independent port review](../scripts/validation/ofdm-ici/INDEPENDENT-PORT-REVIEW.md). All six runtime hashes are pinned in [SOURCE-FREEZE](../labs/ofdm-ici/runtime/SOURCE-FREEZE.json)
- The final independent port pass checked 356/356 shape-tagged arrays across 8 fresh complete runs, zero unchecked arrays, plus 2219 scalar checks; it also checked independent operators, 20 CFAR cases, 28 assignment cases, 18 fresh evaluations, 11 SHA boundary cases and 9 literal ambiguity cases. These final counts supersede interim 291/1871 counts
- The author's separate full rerun checked 17 oracle inputs, 985 component-array comparisons and 34341 numeric scalars, 265 NumPy/SciPy algebra cases, 55 algebra API/error contracts, 17 kernel and 15 Worker/client regressions, plus two native-JavaScript-generated cases re-executed in Python. Author replay is not renamed an independent oracle
- Actual Node Workers completed and handled cancellation, supersession, reset, stale/queued results, time caps and import errors. Browser importScripts/client branches were exercised in Node VM only. Node VM is not an actual browser

The immutable runtime HANDOFF/SOURCE-FREEZE metadata preserve their packaging-time label that port review was pending; the separately linked final independent report establishes the later bounded acceptance without rewriting that history.

The separately scoped [final lesson boundary review](../scripts/validation/ofdm-ici/INDEPENDENT-LESSON-BOUNDARY-REVIEW.md) accepts the exact lesson freeze f06ed60ac5d084a3f841c99563f8bcfae55d1f74b2744cd89acbd3973578c171: 39 owner tests, 16 independent checks, 202 Python-replayed full arrays, and a maximal 7-angle × 4-OMP export/raw rerun covering 495 arrays. It retains the discovered lifecycle, fixed-beam import and signed-zero transport corrections; the numerical runtime is unchanged. Serialization reads typed arrays without an unnecessary numerical deep clone, but the 80 MiB export cap is checked after allocation and is not a heap guarantee. These are Node/controlled-DOM boundaries, not browser certification.

All-one-X comparison stops at the full CFO profile because the flat profile has arbitrary numerical minimizers; downstream parity is unclaimed. Near-singular eigensystem MDL scores can be sensitive to roundoff: the formula and warning are checked, not universal stable model-order selection.

## Outcomes, baselines and denominators

The held finite-grid JavaScript case retains4 hits,3 false detections,1 miss and a capped branch. Do not replace it with the earlier continuously refined Python mechanism4/1/1.

The reduced Python 96-trial reference keeps 198 false detections despite 96/96 reference-target hits; source-style FDR=198/(198+96)=0.67347 and conventional FDR=198/(198+192)=0.50769. It also retains the original-dimension single capped capture with 2 hits and 33 false detections. These are adverse evidence, not source-curve agreement.

The ordinary FFT removes the identical known X and uses the same actual Y and observed angle candidates. Synthetic ICI-free comparison changes the observation and is labelled separately. Source FFT receive summation is unnormalized; raw gain/map scales must not be treated as identical. APES and FFT also differ in spatial filtering and channel modeling, so their difference is not a pure causal ICI-compensation effect.

Every detection, false detection and miss is reported. Source-style V/(V+reference hits), conventional V/(V+all hits) and nominal cell Pfa are distinct. Conditional errors exclude misses and must include the matching count; no hits produce null errors. Neither noise-only zero events nor nominal CFAR Pfa establishes calibrated achieved Pfa. Same-CFO/off-grid paired controls have mixed outcomes; distinct CFO is not a universal false-positive fix. Original Figures7–10 remain unreproduced.

## Optional exact offline archives

These downloads are not page startup assets and require no network during local numerical execution:

- [Runtime ZIP](../data/ofdm-ici-kernel-v0.1-runtime.zip):39075bytes, SHA25618ab507c0ce1157fb8e101bd6ad36805541a5262b9db03f1aa533a99e15acd68
- [Python reference ZIP](../data/ofdm-ici-reference-v1.zip):8557623bytes, SHA2568862595eb704705a1bf4b2f65bb514e1a3fc83956f199fc503094d2522f4ebd0
- Full JavaScript evidence archive: 29,312,807 bytes, SHA25604fa174b39fc4e04d396910ac75d77e3a42298abcf12b10172b183e723098412. It is supplied as exact raw chunks, each at most 9,000,000 bytes, with [manifest](../data/ofdm-ici-kernel-v0.1-full-evidence.parts.json), [part1](../data/ofdm-ici-kernel-v0.1-full-evidence.zip.part01), [part2](../data/ofdm-ici-kernel-v0.1-full-evidence.zip.part02), [part3](../data/ofdm-ici-kernel-v0.1-full-evidence.zip.part03), [part4](../data/ofdm-ici-kernel-v0.1-full-evidence.zip.part04) and [no-overwrite reassembler](../data/reassemble-ofdm-ici-evidence.py). No fictitious whole-ZIP public download is provided

Download all parts beside the manifest, then run the supplied Python reassembler with the manifest path. It validates part sizes/hashes, exact byte sum and final archive hash, refuses conflicting existing output, and never recompresses. Reassembly is cwd-independent. Existing valid output is accepted idempotently. Historical unfavorable outputs and development failures remain in the original archives. Python regeneration of the full JavaScript evidence expects the separately downloaded frozen Python reference beside the extracted package; JavaScript saved-fixture checks require neither Python nor that reference.

## Build dependency and preservation contract

All existing 32 public ESM modules retain their unchanged parse-only static import/reexport parser and exact whole-source runtime contracts. The new lesson uses classic UMD scripts, so eight separate code-owned whole-source profiles pin the six numerical/transport scripts and two lesson scripts. The controller’s fixed Worker URL resolves from the public document; all four importScripts URLs resolve from the Worker directory. This is a narrow frozen-profile guarantee, not generic dynamic JavaScript inference. Known source hashes remain bound to their exact paths even after relocation to another extension, and hash/JSON/policy/endpoint changes fail closed. The owned namespace separately enumerates allowed documentation/style/metadata files; undeclared members of any extension are rejected without pretending those files are executable. Legacy literal-JavaScript checks remain unchanged.

The explicit compatibility manifest adds one canonical page and only named public files. Exact metadata/mapping inverses preserve the preceding accepted near-field source, all prior routes and the same 35 primary-paper identities. The root wrapper runs the exact named owned test suite inside the isolated compatibility layout, checks the reviewed test count and zero failures/cancellations/skips/todos, and has no external-workspace or Git-object dependency. Node/controlled-DOM acceptance remains separate from actual browser behavior.

## Remaining gates

Actual browser rendering, responsive layout, keyboard/screen-reader behavior, real Worker latency/heap/cancellation, download/reimport and painted-result timings remain unperformed. Node-only held timing observations around 2.4–2.8 seconds and the forced maximum workload around 10–11 seconds are neither browser measurements nor meaningful p95 estimates. The 14.5 MB numerical payload is not a peak browser-memory guarantee. Original-size converged OMP, original curves, achieved-Pfa calibration, communication/field claims and whole-paper reproduction remain open. Publication is separately gated.
