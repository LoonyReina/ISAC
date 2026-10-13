# Owner verification scope

The machine reports and final freeze, rather than this prose, pin exact bytes.
Independent port review is a separate gate. The port never inherits acceptance
merely because its Python reference was accepted.

## Numerical evidence

- 11,121 fresh Python↔JavaScript checks across ten complete parity cases and
  one explicit rank-degenerate failure case
- Original10×36×20 and compact6×12×8, known ranks1–3, low SNR, near-collision,
  and principal-phase wrapping
- 132 structured and354 unstructured A/B/C substeps; every actual LS column,
  CP scale/permutation-equivalent factor, residual, normalization and stop
  decision;288 actual projection grids
- 36 projection primitive cases cover every supported8/16/32 oversampling
  setting; arbitrary complex/ill-conditioned/underdetermined LS tests
- Six freshly generated JavaScript reciprocal pairs independently recomputed
  by explicit scalar antenna/path/subcarrier/symbol/transmit sums and accepted
  Python observation equations; raw max absolute error1.417e-14
- 145 NumPy linear-algebra oracle cases,25 numerical contract cases and500
  rank-deficiency stress cases; direct complex SVD/QR/eigen operations,
  no normal-equation inversion or stored eigenvectors
-22 owner kernel contracts covering truth separation, same initialization,
  generation/held policies, source sign/alias conventions, actual projection
  grids, tensor mode order, cancellation and invalid/missing/degenerate data

The largest observed final phase difference is8.634e-8rad, normalized factor
relative difference1.053e-6, final residual relative difference3.539e-9 and
substep residual relative difference1.933e-6. These comparisons include a
changed bounded scalar optimizer and ill-conditioned cases. Tolerances and
all observed maxima are in reports/oracle-parity.json. A small parity error
says the two implementations agree, not that a noisy physical estimate is
accurate or globally optimal.

-90 independent NumPy evaluation-only matching/error/geometry/gross-error cases

## Resources and Worker evidence

reports/resource-benchmark.json measures six independent Node processes,
including actual source-size rank3 full-trace20-sweep-cap and low-SNR cases.
It reports complete solver costs, initialization-inclusive method costs,
actual iterations, synchronous checkpoint gaps, hashing/export time, history
JSON bytes and process high-water RSS. These are host measurements, not a
browser, handset, hardware target or a promised bound on wall time.

Full traces deliberately consume more memory than raw tensor arrays. The
source-size measured full histories are about13MB, and peak process RSS is
hundreds of MiB including Node, JSON serialization and records. Summary mode
is substantially smaller. Do not present array-size estimates as measured
peak memory or omit the full-record export cost.

Real Node worker_threads tests and separate browser-loader VM tests appear
in reports/worker-codec-verification.json. Race fixes and exact rejection,
supersession, cancellation, import/export and restart tests are covered by
those reports. Actual browser loading and latency remain untested.

## Safety and claim gates

All fresh attempts retain numerical errors and unsupported identifiability
rather than fabricated estimates. All phase branches, array-angle clipping,
association scores/ties, residual increases and stopping decisions remain
visible. Source geometry success is a separate evaluation filter. Held data
without truth have no error metric. Raw/history codec import has strong size,
shape, numeric, UTF8 and dual-hash checks; historical status is explicit and
never inferred to be a newly executed result.

The source model is separable post-demodulation OFDM: no time-domain ICI/ISI,
sampling-frequency offset, beam squint, RF calibration, inter-BWP interference,
tracking or network cycle-consistent clock solver. No separate PUMA, SOE-MP,
exact authors' CP-VDM, nuisance-FIM port or CRB-attainment claim is made.

## Independent adverse-case boundary (retained)

The independent port reviewer found a fresh, more severe rank3 near-collision
stress case (angle separation1e-6rad, delay separation1e-11s, noise0.001) whose
link1 SCPD phases differ from Python by up to3.2003e-4rad on nuisance columns
of amplitude about1.5e-4. The reconstructed tensors differ by at most3.6e-7
relative and residual norms by at most6.2e-10 of ||Y||. This is outside the
owner parity suite's1e-6rad phase tolerance. It is preserved as a real
ill-conditioned parameter-boundary mismatch, not hidden, relabeled as a
successful all-case phase match, or corrected with truth. It shows why a
small tensor residual is not a reliable individual-path accuracy certificate.
The independent report/evidence (networked-sync-port-review) owns the exact
fresh inputs and measurements; it is a separate acceptance gate.
