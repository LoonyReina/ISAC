# Recovered MP-Ψ bounded revalidation

Fresh execution against exact recovered source, 2026-10-18. Source files were not modified.

## Result

- Accepted comparator is byte-identical to public baseline communication/kernel.mjs (SHA256 in recovery-report.json).
- 22 small generic complex, sparse/zero-column and diagonal cases independently checked against Python direct OTHER-symbol summation, centered symbol variance and residual-square Gaussian likelihood. 3,382 scalar comparisons; maximum absolute error 8.881784197001252e-16. Includes every iteration posterior and displayed edge mean/variance/extrinsic/damped message. Diagonal channel output also agrees with exact isolated-symbol AWGN posterior.
- Six actual paired demo executions (integer/fractional; 0/10/30 dB) replay exactly, preserve receiver probabilities under changed evaluation truth, and integer matched/rounded probabilities agree within 1e-10. Invalid input/replay cases reject.
- Eleven executed Node VM mocked DOM/Worker lifecycle scenarios pass. This is NOT real-browser proof, layout/accessibility testing, actual module-Worker loading or file download proof.
- Historical offline-summary arithmetic and status totals are internally consistent across all 60 method/scenario/SNR cells. That does not validate its underlying Monte Carlo results or intervals.

## Unresolved evidence gap and release boundary

Original raw.npz, RESULTS.json, SOURCE-HASHES.json, Python study/oracle/tests and original claimed archive are not present in the recovered MP-Ψ source set. No MP-Ψ-named archive exists in the available public-baseline file listing. This bounded revalidation cannot recover the original 1,000-frame proof. The original summary remains historical/unreplayed. Preserve the recovered branch rather than silently dropping it; any visible original aggregate table requires a prominent recovery caveat (or withhold comparative study claims).

The source contract describes its own probability normalization, first-iteration fallback, literal previous-iteration decision rule, historical-maximum confidence stop, fixed channel scope, conditional bootstrap intervals, and zero-error limitations. Revalidation follows that declared finite algorithm, not a claim of literal author-runtime replication or physical-pulse validation. Source contract references missing replay scripts and hashes; those references must not be presented as currently runnable proof.

## Reproduce locally

From this directory:

    node produce-fixtures.mjs
    python independent-check.py
    node lifecycle-check.mjs

Files reference ../consolidated-source/labs/otfs-receiver/mppsi. fixtures.json retains generated inputs/outputs for independent replay. No network, upload, push, PR, user-computer or browser operation was performed.
