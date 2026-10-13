# Bounded reference results

## Completed

- Original tensor dimensions: M=10, N=36, K=20; source R=20 and δ=1e−4
- L=1/2; SNR −25/−10/5 dB; 12 network scenes per rank, all six BS pairs
- 432 reciprocal pair trials, 864 link estimates per method, three same-data
  methods; sweep wall time 37.96 seconds on this execution environment
- 19 author tests pass; independent reviewer separately passed 11 more
- Persisted evidence checks pass: all 432 observation hashes regenerated;
  17,250 assertions including every structured substep reconstruction;
  maximum final residual relative discrepancy 1.08e−15
- Six observable-only initializations retained in stress probes, with both
  structured and unstructured ALS outcomes; no truth-selected winning restart
- One actual two-sweep link run exports all six update stages, full
  preprojection LS columns and evaluated correlation grids; each residual
  matches the original stored run
- Unknown-complex-gain Fisher diagnostic has full rank 18/18 in the selected
  two-target finite case; exact duplicate-path rank failure is retained

## Selected numerical outcomes

Each cell has 72 pair trials but only 12 independent network scenes. The
confidence intervals in diagnostic-summary.json resample whole scenes.

| L | SNR dB | Method | Source geometry successes | All-solved TO RMSE ns | Success-conditioned TO RMSE ns |
|---|---:|---|---:|---:|---:|
| 1 | −25 | SCPD | 37/72 | 588.829 | 219.756 |
| 1 | −25 | ESPRIT-LS | 21/72 | 693.564 | 473.948 |
| 1 | −25 | Smoothed CP variant | 39/72 | 580.588 | 221.709 |
| 1 | 5 | SCPD | 69/72 | 0.322 | 0.328 |
| 1 | 5 | ESPRIT-LS | 68/72 | 1.602 | 1.635 |
| 1 | 5 | Smoothed CP variant | 69/72 | 0.493 | 0.496 |
| 2 | −25 | SCPD | 9/72 | 461.424 | 245.763 |
| 2 | −25 | ESPRIT-LS | 4/72 | 393.790 | 260.836 |
| 2 | −25 | Smoothed CP variant | 10/72 | 444.503 | 293.115 |
| 2 | 5 | SCPD | 67/72 | 80.876 | 15.784 |
| 2 | 5 | ESPRIT-LS | 65/72 | 104.774 | 18.071 |
| 2 | 5 | Smoothed CP variant | 67/72 | 59.707 | 15.498 |

These outcomes do **not** reproduce the published low-SNR success rates. No
post-hoc beam normalization, favorable scene selection or initializer
retuning was used to move the results toward those rates. The source does
not specify beam normalization, path coefficient distributions or exact
CP-VDM settings. Our explicit settings define a different fully reproducible
instance of its model. Which missing choice explains a particular gap has
not been experimentally isolated and is not asserted here.

SCPD does not uniformly beat its initializer on every metric in this slice.
Its best-case accuracy and its occasional bad solutions are both present.
The source's “success” is only the absence of a too-short bistatic range;
large errors can still pass that filter. Full delay, Doppler, angle and clock
errors and both success-conditioned/all-solved aggregates are in summary.json.

## Convergence and stress evidence

All 864 SCPD link calls met the relative-residual stopping test before the
iteration cap, but 64 complete sweeps and 283 projected substeps increased
residual beyond the numerical tolerance. These increases were neither
suppressed nor replaced by a best iterate. Each of the five random-start
structured stress probes failed the source geometry criterion, while the
subspace start passed in that selected case. This demonstrates initialization
sensitivity; it is not a proof that any returned solution is globally optimal.

No numerical exceptions or sampling-interval violations occurred in the main
sweep. All sufficient rank checks passed for the generated model. Maximum
composite delay was 1.2721 μs, below the declared 1.75 μs principal/CP
boundary. Maximum composite Doppler/subcarrier-spacing ratio was 0.01741.
Minimum effective path gain magnitude was 0.03884; those weakly illuminated
paths were retained. Passing these checks does not validate neglected ICI or
other hardware effects.

## Remaining gates

Exact author CP-VDM and SOE-MP baselines, missing source simulation choices,
full 500-trial curves, full source CRB comparison, Algorithm 2 tracking and
adaptive beams, time-domain OFDM effects, hardware evidence, website
integration, independent full-evidence acceptance, and actual browser
latency remain separate gates. The available offline timings exclude
generation and reciprocal extraction and are not real-time evidence.
