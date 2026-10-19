# K4/K6 teaching: new uniform-policy recomputation

This dataset is a new 2026-10-18 uniform-policy finite study. It does not restore the lost historical mixed-policy dataset or reproduce the authors' 1,000-channel/full-paper experiment. K2 remains a separate recomputed teaching input with its own schema, archive identity and exact file hash.

## Provenance
- Study: `user-load-uniform-recomputation-20261018`
- Frozen source/protocol manifest SHA256: `4c5f5997361217053b234f2eb81c12f57a53eb431328698cff87f2cee403c688`
- Full independent final receipt: `evidence/user-load-final-review.json`, SHA256 `684a0cb8a3d46eb871e977588daa5e0b566697fdb4557ec42aec8740e1c2ba76`
- Teaching JSON SHA256: `99390536b5d9f711e0bed55d9f298cb6704febe4c1a53174a9ce660cb830a939`
- The receipt binds 3,651 files, including 3,616 raw outputs; 576 selected rows and 96 bootstrap comparisons were independently rederived. The output-only reviewer made no optimizer calls. All 464 approved pilot raw artifacts were preserved.

## Complete accounting and limits
There are 192 channel/threshold points, 576 selected method rows, and 1,153 new optimizer attempts/certificates: 384 primary convex, 159 explicit-real refinements, 576 SSP starts and 34 phase-I solves. No historical optimizer result was reused. All failures, unresolved selections and certificates remain in the teaching ledger/download; full trajectories and canonical arrays belong to the separate raw evidence archive.

SDR and ZF together have 316 accepted and 68 certified-infeasible rows. Floating-point, residual-corrected SDR certificates bind the same seeded problem; ZF uses only the same-problem subset implication. This is numerical certification, not exact symbolic proof.

SSP has 185 accepted stationary/power-valid selections and 7 unresolved selections. Of 576 SSP starts, 545 are stationary and 31 stop at the 30,000-iteration limit. Actual QoS is satisfied by 16/185 stationary selections, versus 17/192 selected finite outputs including one unresolved output. Stationarity is not hard-QoS feasibility; identical requested thresholds are not identical achieved QoS.

The common accepted subsets change across thresholds: K4 29/30/25; K6 32/32/3. Fixed-across-threshold subsets contain 21 K4 and 3 K6 channels. Do not connect changing subsets as one population or infer equal-achieved-QoS superiority. K6 Gamma20 rests on only 3 channels; the whole-32 resampling retains 202 undefined draws of 5,000, never filling them with zero. Percentiles condition on defined draws. The separately labeled within-eligible sensitivity does not remove selection uncertainty.

## Browser mechanics versus numerical evidence
The teaching transform only reads independently accepted JSON; it never imports or executes study solvers. It validates pinned receipt bytes, source hashes, row/attempt/certificate identities and counts. Browser imports are configuration-only and recompute; supplied result fields are not trusted. Imports bind both input file byte hashes, schemas, archive/summary and final acceptance identity. Cancellation, superseding imports, page exit and late workers/fetches are epoch/stop guarded.

All 45 representative SSP initial states reproduce the raw initial objectives within relative tolerance 1e-11 in the JavaScript Worker core. This validates seed/input transfer only. It does not demonstrate full-trajectory, stopping-status or bitwise parity. Browser runtime and final site visual acceptance are distinct gates and are not certified by the numerical receipt.

## Full raw archive identity
`user-load-uniform-recomputation-20261018-full.tar.gz` is 138,324,272 bytes with SHA256 `3a0a1b94ea727f8e8f9467246ea36a95d3db1b0865980104864b26c3c873a94e`. Gzip integrity and all 3,651 receipt-bound archive member hashes were checked. This exceeds a typical 100 MB repository-file limit. The original gzip is retained locally; the integrated candidate provides the compact xz download below. The teaching JSON is not a substitute for full raw replay evidence.

## Optional verified compact raw download

[Download the complete new raw evidence archive](../../assets/data/joint-beamforming/user-load-uniform-recomputation-20261018-full.tar.xz) (96,924,176 bytes; SHA256 `20185af2e4a58a24aa6bfd279f31bcad28fb2be60a8ec94bbe24da84dc21ddeb`). The xz and retained original gzip contain the same approved tar stream; all 3,651 receipt-bound member hashes were checked. This is an optional download and is never fetched at lesson startup. The gzip identity above remains a provenance record; the compact xz is the downloadable version. Teaching JSON alone is not the full replay evidence.

## Candidate display correction (2026-10-18)

Scoped real-browser review found that the method table combined finite QoS violations and unavailable solutions in one label. The candidate now displays `未达标` for finite false QoS and `不适用/无可用解` for unavailable metrics. Numeric state and all evidence bytes are unchanged. Candidate UI SHA256 is `06e6057492d51d3e5dd0214a8e60b27809adc43692b23042d331ba2cebd9404e`; the earlier teaching review records the pre-correction source identity. The new regression checks all 576 method rows, including 68 unavailable convex rows. Corrected-page browser recheck is separately recorded.
