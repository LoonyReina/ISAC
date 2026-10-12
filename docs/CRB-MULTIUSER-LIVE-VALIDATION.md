# Multiuser point-target CRB: bounded Worker/UI validation

Verified 2026-10-12 against the original twelve frozen lesson files based on main `872ac32f4b0340307b23c731d3e8cfff289c915b`. This is a Node Worker/controlled-DOM review, not real-browser or full-paper acceptance. A later page-only optional-download link addition does not change the numerical/Worker/controller bytes.

## Independently executed

- Owner focused suite:62/62tests passed
- Separately authored review:16/16groups,427explicit checks passed
- Actual Node Worker/controller exports:5accepted solves;3complete unaccepted rank/bound/cap records;2partial cancelled records that remain audit-incomplete because finalState is absent
- Independent Python checker accepts the5accepted and3honest unsuccessful records, rejects all6poisoned diagnostic records, and does not fabricate missing cancellation state
- Four immutable runtime files,three old K1 files,56original IDs and11equation blocks preserved

The frozen [derived review summary](../data/crb-multiuser-live-review.json) and [hash-linked actual-export replay](../data/crb-export-checker-node-integration-replay.json) retain the evidence boundaries. Counts from overlapping suites are not added as distinct scientific experiments.

## What was checked

Actual new-input solves, same-H three-point comparison, fixed-domain enforcement, full-record export and input-only file reimport, current-state clearing, rank/bound/cap statuses, cancel/reset/replacement/pagehide and asynchronous file races were exercised. A controlled scheduler tested the30second watchdog and250ms termination fallback; this is not a30second browser timing experiment. Independent full real3×3 Fisher/Schur calculations and complex SINR/power reconstruction agree for the actual default beams.

The default Node-produced root-CRB is0.005766416207936559degrees, with power999.9999997659675mW. These are numerical values, not latency or browser observations.

## Import and certificate trust boundary

The JavaScript adapter replays physical beams,rank ratio,recovery and covariance consistency, but does not independently reconstruct the complete dual-cone map or every raw diagnostic. Historical imported output never becomes a current accepted solve or fabricated actual-run export. Use the separate [NumPy export checker](../data/crb-beamforming-export-checker-v1.zip) for independent raw-state/certificate replay; see its [validation scope](CRB-MULTIUSER-EXPORT-VALIDATION.md), [independent review](CRB-EXPORT-CHECKER-REVIEW.md), [script](../validation/crb-export-checker/check_export.py), and [requirements](../validation/crb-export-checker/requirements.txt).

The checker command is `OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python check_export.py downloaded-record.json --output audited-record.json`. It does not invoke the JavaScript solver,upload data or establish browser provenance. A truthful iteration cap can pass evidence consistency while physicalAccepted remains false. Partial cancellations remain incomplete,never accepted.

## Numeric-scale limit

The broader frozen raw-kernel validator admits extreme binary64 scales outside its accepted source/lesson experiments. Subnormal alpha-squared/noise and overflow of full Fisher information can invalidate an apparently finite bound. The independent checker fails closed on these scales. The fixed lesson accepts only alpha1 and noise1mW and rejects these expanded raw/full-record inputs before Worker launch. Frozen kernel/reference bytes remain unchanged; no unrestricted arbitrary-scale guarantee follows.

## Gates still open

Actual hosted-browser resource loading,Worker startup,desktop/narrow layout,keyboard behavior,file download/upload,cancel/direct rerun/reset,page lifecycle and perceived response time require real-browser verification. Recorded UI elapsed time stops at terminal Worker message before validation/paint. It does not establish control-to-painted-result latency. Extended-target and ML references remain offline; full source baselines,figures and full-paper reproduction remain open.
