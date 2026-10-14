# Multiuser point-target CRB: bounded Worker/UI and scoped hosted-browser validation

Current status, 2026-10-14: scoped acceptance of the hosted desktop lesson has passed. The dated Node report below retains its original evidence and counts; the [later browser review](#2026-10-14-scoped-hosted-desktop-browser-review) closes only the specific browser checks it records.

## Historical review: 2026-10-12

Verified 2026-10-12 against the original twelve frozen lesson files based on main `872ac32f4b0340307b23c731d3e8cfff289c915b`. This is a Node Worker/controlled-DOM review, not real-browser or full-paper acceptance. A later page-only optional-download link addition does not change the numerical/Worker/controller bytes.

### Independently executed

- Owner focused suite:62/62tests passed
- Separately authored review:16/16groups,427explicit checks passed
- Actual Node Worker/controller exports:5accepted solves;3complete unaccepted rank/bound/cap records;2partial cancelled records that remain audit-incomplete because finalState is absent
- Independent Python checker accepts the5accepted and3honest unsuccessful records, rejects all6poisoned diagnostic records, and does not fabricate missing cancellation state
- Four immutable runtime files,three old K1 files,56original IDs and11equation blocks preserved

The frozen [derived review summary](../data/crb-multiuser-live-review.json) and [hash-linked actual-export replay](../data/crb-export-checker-node-integration-replay.json) retain the evidence boundaries. Counts from overlapping suites are not added as distinct scientific experiments.

### What was checked

Actual new-input solves, same-H three-point comparison, fixed-domain enforcement, full-record export and input-only file reimport, current-state clearing, rank/bound/cap statuses, cancel/reset/replacement/pagehide and asynchronous file races were exercised. A controlled scheduler tested the30second watchdog and250ms termination fallback; this is not a30second browser timing experiment. Independent full real3×3 Fisher/Schur calculations and complex SINR/power reconstruction agree for the actual default beams.

The default Node-produced root-CRB is0.005766416207936559degrees, with power999.9999997659675mW. These are numerical values, not latency or browser observations.

### Import and certificate trust boundary

The JavaScript adapter replays physical beams,rank ratio,recovery and covariance consistency, but does not independently reconstruct the complete dual-cone map or every raw diagnostic. Historical imported output never becomes a current accepted solve or fabricated actual-run export. Use the separate [NumPy export checker](../data/crb-beamforming-export-checker-v1.zip) for independent raw-state/certificate replay; see its [validation scope](CRB-MULTIUSER-EXPORT-VALIDATION.md), [independent review](CRB-EXPORT-CHECKER-REVIEW.md), [script](../validation/crb-export-checker/check_export.py), and [requirements](../validation/crb-export-checker/requirements.txt).

The checker command is `OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python check_export.py downloaded-record.json --output audited-record.json`. It does not invoke the JavaScript solver,upload data or establish browser provenance. A truthful iteration cap can pass evidence consistency while physicalAccepted remains false. Partial cancellations remain incomplete,never accepted.

### Numeric-scale limit

The broader frozen raw-kernel validator admits extreme binary64 scales outside its accepted source/lesson experiments. Subnormal alpha-squared/noise and overflow of full Fisher information can invalidate an apparently finite bound. The independent checker fails closed on these scales. The fixed lesson accepts only alpha1 and noise1mW and rejects these expanded raw/full-record inputs before Worker launch. Frozen kernel/reference bytes remain unchanged; no unrestricted arbitrary-scale guarantee follows.

### Gates recorded as open on 2026-10-12

Actual hosted-browser resource loading,Worker startup,desktop/narrow layout,keyboard behavior,file download/upload,cancel/direct rerun/reset,page lifecycle and perceived response time require real-browser verification. Recorded UI elapsed time stops at terminal Worker message before validation/paint. It does not establish control-to-painted-result latency. Extended-target and ML references remain offline; full source baselines,figures and full-paper reproduction remain open.

## 2026-10-14 scoped hosted desktop-browser review

Reviewed [the public multiuser lesson](https://loonyreina.github.io/ISAC/crb-beamforming.html#multiuser) in native cloud Chrome on 2026-10-14, with main recorded as `8b3741df790ea6c067b290843e169acbf66ea518`. The desktop viewport was 1180×757; the measured page width was 1165 pixels, without horizontal overflow. This is a scoped hosted-browser observation, separate from the historical Node/controlled-DOM tests above.

### Runtime and visible input lifecycle

- Fresh default solve accepted; changing Γ to 20 dB cleared the old answer and produced a new accepted solve. The same-H comparison at Γ=0/10/20 dB visibly accepted all three runs, showing root-CRB values 0.00574438° / 0.00576642° / 0.00584695°.
- An actual in-flight cancellation at Nₜ=8, θ₀=23°, Γ=20 dB was followed by an immediate rerun. The rerun reported an iteration limit and displayed no accepted CRB; this did not establish infeasibility.
- Reset followed by Nₜ=6 recomputation accepted. A fresh channel generated with seed 290103 also accepted. A blank H entry was rejected and cleared the current CRB.
- Native file export and input-only reimport were exercised. Reimport cleared the accepted answer; a fresh solve was required and succeeded. Navigation through the home link and browser Back likewise required a fresh solve, which succeeded.
- The focused keyboard check confirmed that Tab moved from the Γ number input to its slider. This is not a complete keyboard or accessibility audit.
- Seven hosted runtime resources returned HTTP 200 and matched the frozen release-candidate bytes exactly: `crb-multiuser.js`, `crb-multiuser-model.js`, `crb-multiuser-data.js`, and `crb-multiuser/{core,worker,linalg,hermitian}.js`. This HTTP byte check complements the observed page/Worker execution; it does not replace interaction testing.

### Independent replay of seven native downloads

The separate Python/NumPy checker replayed the seven actual native downloads. Its numerical result does not establish browser provenance; provenance comes from the hosted-browser collection above. These seven records are not added to the historical Node exports or counted as all of the visible browser runs.

- Four complete records passed consistency checks and physical acceptance: default Nₜ=4/Γ=10 dB, default H at Γ=20 dB, Nₜ=6/Γ=10 dB, and the newly generated channel at Nₜ=4/Γ=10 dB.
- One complete Nₜ=8/θ₀=23°/Γ=20 dB record consistently reported `iteration_limit`, with `physicalAccepted=false`. A valid cap record is not a valid beam solution or an infeasibility certificate.
- One complete identical-two-user-channel record at Γ=10 dB had an independently replayed numerical infeasibility certificate, with `physicalAccepted=false`. The trace-bounded separator lower bound was approximately 0.00066803382267, positive after the recorded residual correction; this is a floating-point certificate under the checker's declared tolerances, not an exact-arithmetic proof.
- One cancellation record lacked `finalState` and remained audit-incomplete (`passed=false`); missing numerical state was not invented. No accepted CRB was attributed to it.

Thus six records were numerically consistent, of which four were physically accepted; the seventh was incomplete cancellation evidence. The independently replayed default root-CRB was 0.005766416207936558° and total power was 999.9999997659675 mW. These values are not timing measurements. The three-point display observations above are not a claim that three separate comparison exports were independently replayed.

### Remaining limits after the desktop review

Narrow-view layout, a comprehensive keyboard/accessibility review, and control-to-painted-result response time remain unverified. Recorded UI elapsed time still ends at the terminal Worker message before validation/paint. The desktop cancellation/back/reimport observations do not replace the controlled scheduler's separate race/watchdog tests or establish every browser lifecycle path.

A minor usability issue remains: a blank H entry fails safely, but its message is technical English (`JSON number must be finite in [-Infinity, Infinity]`). The scope still excludes browser ML receiver/extended-target implementations, full source baselines, original Monte Carlo figures, and full-paper reproduction. The historical data manifests and offline reference claims are unchanged.
