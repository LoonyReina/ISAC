# Independently audit a CRB lesson export

This small NumPy-only checker recomputes the point-target Eq. (33) evidence in one downloaded lesson record or one raw terminal kernel result. It never imports or executes the JavaScript solver, calls CVXPY, reads a stored optimum, opens a browser, uploads a record or uses the network.

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python check_export.py downloaded-record.json --output audited-record.json
python test_checker.py
```

Tested with Python 3.12 and NumPy 2.3.5. The checker accepts the frozen `crb-point-drs-v0.4-feasibility` model and lesson envelope `isac-crb-multiuser-run`, schema 1. Raw records support the bounded kernel domain; lesson envelopes support the smaller K2/Nt4,6,8 domain. The command exits 0 when the mathematical evidence audit passes, 1 otherwise. It refuses to overwrite its input. The input cap is 16 MiB; the live lesson's own import cap remains 2 MiB.

## Meaning of the result

`passed` means numerical evidence is internally consistent with the independently reconstructed model and stated tolerances. Inspect `result.status` and `result.physicalAccepted` separately. An honestly capped, cancelled, rank-rejected, invalid-CRB-rejected or certified-infeasible output can pass this evidence audit while remaining physically unaccepted. A cap is never classified as infeasibility.

Full numerical outcomes need `finalState.x,w,z,rho`, Wks, relaxedR, epigraph t and residual/certificate evidence. The unchanged worker's cancel reply omits finalState; that payload is correctly reported as incomplete numerical evidence. Preserve the partial record and lifecycle outcome rather than manufacturing state. Analytical individual-power infeasibility is the only state-free mathematical exception, and its bound is recomputed from H.

## Independent calculations

- Centered, unnormalized half-wavelength transmit/receive steering, angular derivatives in radians, A and dA/dtheta
- Full real 3-by-3 Fisher matrix for `(theta, Re alpha, Im alpha)`, nuisance-amplitude Schur complement, Eq. (7) CRB and angular root-CRB
- Every actual user's desired/interference/noise power and SINR; total recovered beam power
- SVD of H[a,a_dot], relative rank threshold 1e-8; principal-eigenvector and rank-one recovery residuals, allowing arbitrary beam phases
- Wks against final Hermitian coordinates, covariance sum, relaxed SINRs, covariance/Schur eigenvalues and normalized information `eff/(P ||dA/dtheta||_F^2)`
- Independent cone projection z=Pi_C(w), linear proximal equation, primal and objective stationarity residuals
- Dual cone signs, epigraph stationarity, support, conservative minimum-eigenvalue trace correction, objective information bound and positive infeasibility separator
- Recomputed final acceptance failures rather than trusting the exported green/red flag
- Envelope/raw-input agreement, input and fixed-scenario digests, declared source/runtime identities, settings and tolerance consistency

The Hermitian/array/Fisher/operator mathematics is adapted from the separately accepted independent review implementation, using NumPy's LAPACK eigensolvers. The frozen JS and Python reference bytes are neither edited nor imported. Gate tolerances match the frozen point kernel. Bounds are floating-point checks, not interval-arithmetic proof.

## Evidence and limitations

`fixtures/` contains ten freshly generated Node outputs: three accepted Nt4/6/8 records, a one-iteration cap, full and partial cancellations, zero-channel analytical rejection, duplicate-channel separation, rank-condition rejection and invalid-CRB rejection. They are test fixtures, not live browser records. `generate_fixtures.cjs` optionally regenerates them using separately supplied frozen core and lesson-adapter paths; it is not needed to run the checker or portable tests. The fixture index retains every unsuccessful outcome.

The result always says `browserProvenanceEstablished: false`. Matching declared hashes do not verify delivered runtime files. A mathematically self-consistent fabricated record does not authenticate who ran it, when, in which browser, whether its timing is genuine, or whether the current UI shows that input. Generator labels, seeds, timestamps, browser labels and other descriptive metadata are declarations; the raw H is authoritative. Browser provenance and actual byte delivery need separate integration evidence.

The digest serializer is independently tested against JavaScript numeric JSON on 20,011 bounded/random/edge values. The full 22 frozen kernel/held-channel records also pass, but are not duplicated in this small bundle; their recorded replay paths refer to the separate frozen kernel archive. No full-paper or extended-target acceptance is implied.

## Fail-closed raw-scale guard

The broader kernel input validator admits extreme positive binary64 values that were never part of the accepted numerical test domain. A review found that subnormal alpha-squared and radar noise can round or overflow intermediate Fisher scales and make a superficially finite CRB unreliable. The checker rejects claimed physical acceptance when either scale is subnormal, or when the independent full Fisher matrix/CRB cannot be represented and verified. An honestly invalid-CRB-rejected state remains auditable. The fixed live lesson (alpha=1, radar noise=1 mW) is unaffected; no frozen kernel bytes were changed.

The optional ZIP includes the portable ten-fixture regression suite and independent review evidence, including historical failing controls. Run `python verify_bundle.py --test` to verify every manifest-listed file and rerun the owner's tests. Historical review snapshots are evidence only; the supported checker entry point is the root `check_export.py`.

Independent review accepted checker SHA-256 `06a73ea4825613dfe6af32ffe5a8e6dac12b9d22ef0556c7e8de49f541a4c66f`: 320 portable assertions pass, with 13 additional optional legacy-archive assertions. In a working copy, rerun `OPENBLAS_NUM_THREADS=1 PYTHON=python3 sh independent-review/run-independent-review.sh`; the scripts write their review reports locally. Owner portable suite: 78 checks. Detailed defect/fix history remains in the review folder.
