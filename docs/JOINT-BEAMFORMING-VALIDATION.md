# Joint beamforming mechanism validation

Date: 2026-10-10. Fixed source: https://arxiv.org/abs/1912.03420v2 (2020-02-02), DOI https://doi.org/10.1109/TSP.2020.3004739.

## Scope

This is an independent deterministic teaching construction, not a reproduction of SDR, optimized ZF, SSP, original Monte Carlo figures, radar receiver metrics, or hardware. All existing scientific modules and their data remain unchanged.

The UI compares A/B/C at the same eight antennas, two users, half-wavelength spacing, aperture 3.5 wavelengths, total average power 1, per-antenna average power 1/8, selected H, and selected noise. A/B factors are fixed; C adapts both factors analytically to the current known H. Changing eta does not change any of these three preset covariance matrices or their spatial patterns/correlations.

## Numerical implementation

`joint-beamforming-core.js` computes complex factors, R, H times both factors, 1801 raw power samples, target Gram matrix, normalized correlation magnitudes, and per-user desired/inter-user/radar/noise powers. Eigenvalues are computed using a real symmetric embedding of the actual Hermitian matrix and Jacobi rotations; each doubled eigenvalue pair is averaged. Rank tolerance is 1e-10. The display rounds eigenvalues below 1e-12 to zero, while raw values remain in the model.

The fixed DFT vectors use rounding of known trigonometric constants at 15 digits to remove floating sin(pi) residue. Eta is never rounded or floored by the core. Eta=0 gives exact B desired power and SINR zero, displayed as minus infinity dB; small positive eta remains positive.

The regression tests compare the direct factor pattern to aᴴRa over the full grid, verify Hermitian PSD/rank/trace/per-antenna power and orthonormality, compare B/C complete covariances, and check analytical SINR and leakage. They also test control-only QoS changes, invalid parameters, endpoints, and the separate changed-covariance construction demonstrating why failure of three recipes is not a general infeasibility certificate.

An independently written NumPy audit of the actual JavaScript output checked 42 recipes across 14 eta values including endpoints, 1e-30, 1e-20 and 1e-12. Maximum absolute errors: angular power 2.665e-15; eigenvalues 3.331e-16; SINR 2.843e-14. Tiny positive B SINR was checked with relative tolerance 1e-12, not merely absolute tolerance.

## UI and integration

Native select/range/button controls support standard keyboard semantics; reset returns to A, eta=.8, noise=.01, threshold=12. SVG viewBox widths match rendered CSS widths, with a 240-pixel minimum used only as a fallback. No animation or external dependency is introduced. All raw-power axes use common fixed limits; the correlation matrix is normalized magnitude, not squared magnitude. Matrix details show complete double-precision complex entries.

The fail path clears old charts and numerical tables and leaves readable source/model/limits content. A noscript summary provides default results. The registry uses one new canonical case, all six spatial learning depths, and bridges to waveforms/tradeoffs. Bibliography availability changes from one to two teaching cases while all nine bibliography papers and their prior influence snapshots remain.

DOM harness execution and static responsive markup checks do not certify browser rendering, assistive technology, actual keyboard use, or online deployment. Those checks are separate from these local tests.

## Commands

- `node --test tests/joint-beamforming*.test.cjs`
- `node --test tests/*.test.cjs`
- `node scripts/generate-site.cjs --check`
- `git diff --check`
- `python3 scripts/validate-joint-beamforming.py --check`

Local verification on 2026-10-10 passed 271/271 Node tests, generator freshness, independent Python --check, and git diff --check. The independent Python validator and JSON report are linked from the lesson. NumPy is only required for that independent developer check; the browser uses no Python dependency.
