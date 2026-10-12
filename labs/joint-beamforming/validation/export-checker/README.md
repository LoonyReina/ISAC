# Independently recompute exported numerical evidence

`check_export.py` reads one or more raw optimizer results or local JSON lesson records containing unchanged raw results. It uses NumPy only, never imports the JavaScript optimizer and never reads a stored target optimum.

Usage: `python check_export.py downloaded-record.json --output checked-record.json`.

Tested environment: Python3.12.14, NumPy2.3.5. For predictable resource use, set `OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1`. Run in an isolated environment with the pinned NumPy requirement. The script does not use the network, upload the record, operate a browser, install anything or overwrite an input.

## What is checked

- Input/method/settings/shape bounds, same linear and dB threshold
- Exact full1801-angle pattern and optimizedalpha, three target correlation terms and original loss
- Covariances against final Hermitian coordinates; product-cone projection z=Pi_C(w)
- True affine/primal and stationarity residuals
- PSD dual signs, exact-length operator penalties, conservative objective and positive infeasibility-separation bounds
- Equal antenna power, covariance PSD, SDR auxiliary/residual covariance PSD and SINR inequalities, ZF covariance diagonalization/user-power constraints
- Recovered Wc/Wr covariance, actual desired/inter-user/radar/noise powers and SINRs
- Eq33 SDR rank-one recovery; Eq42 positive-phase diagonal communication channel and radar nullspace
- Radar-only empty communication factors/products and null absent-user metrics
- Missing/corrupt attempted-result slots; valid unattempted null slots remain unattempted

`passed:true` means the exported evidence is internally consistent with these independently recomputed equations. It does not mean that the optimizer converged. An honestly capped or certified-infeasible result may pass this audit while retaining its exact unsuccessful status. A cancelled direct-core result can be audited only when it includes full state. The frozen worker cancellation message uses result() without finalState, so that actual payload is intentionally reported as incomplete numerical evidence. Preserve it unchanged and label it partial; cancellation can still be a correct browser lifecycle outcome. Inspect each result’s status and physical acceptance gate. The checker does not turn a cap into infeasibility.

## Deliberate limits

This script does not establish actual browser execution, validate delivered JS bytes, authenticate a record, compare current UI values to an older export, or certify source/provenance fields in a wrapper. The browser/integration gate must separately verify those facts and same-input paired method identity. A fabricated but mathematically self-consistent record is not proof that a particular browser ran it.

The scalar gap is affine-iterate objective minus a conservative lower bound, not a rigorous feasible upper/lower gap. Floating-point tolerances and operator-norm corrections are not interval-arithmetic proof. The checker supports only the frozenv0.2/v0.3 covariance-model identities; it is not a general SDP auditor. Its Eq42 recovery cross-check has declared1e-5 relative diagonal and1e-8 scaled-nullspace tolerances, separate from source exact algebra.

`test_checker.py` is the owner’s67-fixture plus21-mutation regression script. It locates the original sibling `joint-beamforming-browser-prototype` archive, so the compact checker package alone cannot rerun that full suite. Independent review reports and mutation evidence are included separately. The one-file command above is portable and only needs a supplied result record and NumPy.
