# Cell-free MAPRT reference handoff

Date: 2026-10-13 UTC. Status: selected reduced-model numerical reference validated; source-free package ready for independent archive readback. No website, browser port, UI, integration repository, remote computer or publication was modified.

## What is now complete

1. Fixed official arXiv:2305.12523v2 identity and PDF SHA-256 verified, including independent readback: `30b871e5bb3dd1a66fab1a4c2ab3974abb8a7e664e04e2dfa62f6e50679c0d10`
2. Source observation/prior/CSI/unit/threshold/power crosswalk, original numerical choices and unrecovered details
3. Actual multistatic Eq.11–33 MAPRT with unknown Gaussian RCS and target-free channel nuisance; the earlier two-station marginalized-LRT prerequisite was not renamed or reused as this algorithm
4. Source sensing-SINR CCP and communication-centric allocation, with fitted imperfect-CSI moments, per-AP constraints and complete solver/certificate history
5. A bounded 4-TX, 2-RX, M=2, 2-UE, 10-symbol conditional experiment, with 4 RCS values, 4 allocations, AP/SP and 2 nominal Pfa levels: 64 cells
6. All trial draws, observation witnesses, scores, decisions and summary counts retained; all 1,048,576 stored detector scores independently replayed
7. Source-free archive and hash manifest generation; final archive receipt is stored next to the package

## Validation actually run

- 26 deterministic unit/regression tests pass, including the status-8 retry policy and retained failed retry
- Owner 70-decimal MAPRT oracle error: 2.60×10^-16; integrated-LRT oracle error: 4.13×10^-16
- Separate independent 18-case matrix/density/80-decimal audit passed
- Closed owner record replay: 64 cells, 1,048,576 scores, maximum independent observation-covariance score error 9.09×10^-13
- Separate independent all-cell replay uses augmented least-squares minimum costs; maximum discrepancy 9.10×10^-13
- 14 adversarial mutation probes reject missing/empty/stale/corrupt records, incorrect trial/paired/miss counts, bad certificates, changed source identity, altered scores and invalid solver outcomes
- Six scientific CCP restarts converged; 66 accepted outer iterations contain 71 subproblem attempts, including five failed status-8 attempts and five successful bounded retries. Largest chosen convex-subproblem numerical gap: 3.91×10^-7
- Five of six separate direct-ratio SLSQP diagnostics report success. One reports failure despite returning a nearby solution; its failure is retained. These diagnostics provide no global optimality proof
- Full independent regeneration produced byte-identical four selected NPZ files (357 arrays), identical settings/solver/check JSON, and identical results after excluding only measured wall time
- Local selected generation took approximately 2.98 s, owner full replay approximately 1.59 s, with single-threaded BLAS. These are local execution timings, not browser or real-time network latency measurements
- Two newly generated numerical plots were visually inspected. They contain this experiment's data, not paper images or digitized paper curves

## Results that must remain visible

### 1. Fitted constraints do not establish population feasibility

The source constraints are expectations. Here those expectations were fit from 1,024 channel samples, then checked on 1,024 independent samples. Every allocation has at least one holdout-estimate crossing of a nominal limit:

| Allocation | Fitted total expected power | Holdout UE1 SINR | Largest holdout expected AP power |
|---|---:|---:|---:|
| Communication-centric | 0.00525546 W | 2.89906 dB | 0.00245878 W |
| ISAC | 1.18513454 W | 2.89305 dB | 1.01101315 W |
| ISAC+S | 1.18513454 W | 2.89305 dB | 1.01101315 W |
| Extra cap-saturated communication | 2.14319608 W | 8.91873 dB | 1.00269813 W |

The nominal limits are 3 dB per UE and 1 W per AP. The first three cross the UE1 threshold in the held-out estimate; ISAC/ISAC+S also exceed the AP4 expected-power cap by about 1.10% in that estimate. The cap-saturated baseline crosses an AP cap by about 0.27%. These finite-sample checks are not exact population parameters, but they forbid saying the fitted solutions have independently established out-of-fit feasibility. No safety margin, chance constraint or robust redesign was silently added to improve this result.

### 2. The accepted candidates allocate essentially no dedicated sensing power

All accepted ISAC+S restarts settle at essentially zero sensing amplitude. Its selected p0 is about 2.59×10^-16, and its power allocation and detection results coincide with ISAC to numerical precision. The plotted lines therefore overlap. This is the observed outcome of the accepted local candidates, not proof that no other positive-sensing allocation helps, evidence against the paper, or a reproduction of a source figure showing a benefit in another setup.

### 3. Optimizing the sensing-SINR surrogate is not a theorem about Pd ordering

At 0 dBsm and nominal Pfa=0.01:

| Allocation/detector | Detections / 8192 | Estimated Pd | Pointwise 95% binomial interval |
|---|---:|---:|---:|
| Communication-centric AP | 261 | 0.03186 | [0.02816, 0.03589] |
| ISAC AP | 6465 | 0.78918 | [0.78019, 0.79797] |
| ISAC SP | 6365 | 0.77698 | [0.76780, 0.78595] |
| Extra cap-saturated AP | 7339 | 0.89587 | [0.88906, 0.90241] |
| Extra cap-saturated SP | 7047 | 0.86023 | [0.85253, 0.86767] |

ISAC's source sensing-SINR is 2.04150, while the cap-saturated baseline's is lower at 1.76858. Nevertheless, the latter has higher conditional Pd and uses substantially more total power. Per-AP budget is common, actual used energy is not equal, and covariance shape matters beyond a trace ratio. This result must not be relabeled a universally superior algorithm. AP versus SP uses exactly the same observations; comparisons across allocations use common latent draws but different transmitted/received observations.

### 4. False-alarm calibration is finite, with separately measured uncertainty

Every detector/setting uses 16,384 H0 calibration blocks and 8,192 independent H0/H1 evaluation blocks. Calibration and evaluation do not reuse null trials.

- Nominal Pfa=0.1: evaluation counts range from 802 to 894 / 8192, estimated Pfa 0.0979004–0.109131. Eight of 32 pointwise evaluation intervals exclude nominal 0.1; these cells are correlated through shared draws and are not 32 independent hypothesis tests
- Nominal Pfa=0.01: counts range from 69 to 97 / 8192, estimated Pfa 0.00842285–0.0118408. All 32 pointwise evaluation intervals include 0.01
- Calibration-order tail intervals are stored separately: approximately [0.0954232, 0.1046083] for nominal 0.1 and [0.00848603, 0.01152348] for nominal 0.01

These are conditional, pointwise finite-Monte-Carlo results. No exact target-Pfa, full-calibration, distribution-free CFAR, simultaneous grid coverage or rare-event extrapolation claim is licensed by them.

### 5. MAP maximization and integration remain distinct

The source MAP statistic has its prior-density normalization constant. The integrated Gaussian LRT has an observation-covariance log determinant ratio instead. They share the data-dependent quadratic only for the fixed linear-Gaussian model here; all recorded decisions agree after the proper threshold shift. This does not make the old teaching toy a paper reproduction.

## Retained failure evidence

`evidence/smoke_status8_retained` contains the original incomplete 48-cell smoke run in which every ISAC restart was rejected. `evidence/smoke_retry_same_start_retained` contains the unsuccessful same-start-retry variant. Their historical core hashes differ and they are explicitly not accepted selected evidence. The final `evidence/smoke` and `evidence/selected` use the bounded 1e−7 origin-contracted retry. Constraints, objective and tolerances are unchanged, and actual solver success plus primal/gap gates are still required. The contraction is an initialization choice, not a guaranteed feasible projection. All final attempted solves are independently rechecked.

Deliberate negative probes retain impossible communication requirements with a simple bounding witness, an infeasible initial point, an outer-iteration cap and a subproblem-iteration cap. They do not enter successful performance summaries. No missed target, false alarm, heldout violation or solver failure is removed to improve a curve.

## Remaining scope and exact-curve blockers

The source's 16-TX/2-RX/8-UE deployment, 500 m square, random UE locations, hotspot averaging, full 3GPP/local-scattering choices, orthogonal sharing and sensing-SE region are not reproduced. In fixed v2, the audit did not recover numerical M, RZF regularizer, exact AP coordinates/seed, covariance spreads, symbol law, pilot reuse or exact threshold-estimation protocol. Synthetic covariances and explicit reduced geometry are disclosed, not guessed as author settings. No verified primary code release was found by the bounded search.

SP's kernel ignores clutter, but its threshold here is learned from actual cluttered null samples. The source does not pin that calibration protocol sufficiently for an exact SP-curve match. This package supplies the real source algorithms in a meaningful, fully specified bounded setting, with independently testable numerical evidence. It does not close full-paper reproduction or browser-release gates.

## Downstream handoff

Use `SOURCE-AUDIT.md` and `MATHEMATICS.md` for scientific labels and the raw records for any teaching adapter. Preserve the old two-station prerequisite. A future port must recompute fresh observations/detectors/CCP or explicitly identify itself as a frozen-record viewer; matching precomputed JSON is not a live numerical port. Revalidate every changed source byte and re-run record checks before claiming exact parity. The existing design-only teaching plan is separate and does not imply an implemented browser artifact.
