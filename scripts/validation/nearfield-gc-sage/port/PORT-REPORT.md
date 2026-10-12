# JavaScript inverse-core port gate

12 October 2026. Isolated numerical implementation; no UI, repository integration, publication, training, or new Python estimator.

Contract: `reduced-gc-sage-2d/0.2.0-all-channel-region`

Core SHA-256: `fe96407e6a09c71aa141d75fecaf26d23e15bbc1514f30ed121262dbdfc3ceda`

## Verified result

- **52 core tests and 13 history tests passed**: independent complex gain/geometry fixtures, rank-deficient and near-collinear joint LS, acquisition guards, physical aperture, nonmutation, initializer provenance, unknown/failure states, bounded-region regression, and UMD loading without Node globals
- **All eight actual-JavaScript/common-observation comparisons passed** against the corrected, independently maintained Python reference: default, noiseless, 5 cm aperture seed 0, 20 MHz bandwidth, blind reference, absent second path, 5 dB seed 1, and held-out tones
- Observation SHA-256, algorithm version, fitted labels, convergence/budget states, every trace decision, and geometry-search compute ledgers match; full gains, delays, geometry, predictions, global/subproblem objectives, and held-out predictions were numerically compared
- Default estimated reference delays: 10.0081906111183 and 14.5616642690008 ns
- Default SSE: scattering **160.563569998603**; hybrid **156.207002218577**; both converge in four sweeps
- Default candidates: 1188 scattering for both, plus **1108** reflection for hybrid
- Default SSE trace error from Python is below 2.3e-9; largest global SSE trace error among the eight cases is below 8.1e-7

The 5 cm and low-SNR wrong-label cases remain wrong. The 20 MHz case retains an unlocalized state; its hybrid and scattering solutions coincide under the corrected feasible set. Blind-reference and absent-path cases reach their sweep budgets. No truth-selected delay, mechanism, or visibility mask repairs them. Truth-only association/accuracy is separate evaluation evidence, never an estimator input.

Machine-readable evidence: `results/cross-language-summary.json`, `results/node-tests.tap`, and the complete `results/*-python.json`/`*-javascript.json`. `results/compact-expected.json` retains all cases without redundant prediction matrices. `compare-reference.py` regenerates the full arrays and comparisons rather than replaying scalar targets.

## Source-model correction, explicitly versioned

Independent review found that the original reference constrained only the reference interaction point to the region. A 40 ns, angle `112*2π/1024` candidate kept that point inside the box while an off-reference bounce lay outside it.

The approved conservative reading of the bounded plane and line sets in source Eqs. 19, 21, and 23b now requires **every modeled channel bounce** to lie in the region, including tiny/zero-gain channels. The common bounds tolerance is 1e-10 m; the reference-point bounds are unchanged. This change was made to both Python and JavaScript and revalidated. A visible-channel-only reading is a different, unimplemented feasible-set choice.

The original core, tests, reports, expected fixture, and complete results are preserved as superseded under `superseded/reference-point-region-v1/`. Its previous 1128-reflection-candidate result must not be attributed to the new version. The default optimum is unchanged, but the 20 MHz adverse-case hybrid solution changed. This is a scientific model correction, not tuning to match a fixture.

## Deliberate port choices

Float64 direct trigonometry and a one-sided complex Jacobi SVD replace NumPy array operations/LAPACK LS. No normal equations are formed. The rank cutoff is `eps * max(P,L) * max(sigma)`. Small fixtures use about 1e-12 absolute tolerance. Cross-language limits are 2e-5 ns for reference delays, 2e-14 s for per-channel delays, 2e-5 absolute for geometry/gain/prediction values, and 2e-4 + 2e-8 relative for SSE; observed errors are much smaller.

Bounded delay refinement preserves SciPy safeguards and carries its BSD notice. Both methods retain identical complex channel gains, scattering budgets, initial data, and incumbent acceptance; hybrid pays the additional reflection cost.

Optional `record_history` (default false) adds compact observer-only initial states and attempted-update records under independent schema `gc-sage-compact-history/1.0.0`. Actual historical gains/delays reconstruct each selected trace SSE; adopted source, incumbent-refit loss, geometry-change flags, cumulative counts and elapsed time are recorded without prediction matrices or truth. Enabled/disabled numerical equality and deep-copy isolation are tested. See `HISTORY.md`.

The API is stricter than Python: finite/unknown-field validation and private runtime-issued initializer provenance prevent fabricated states and truth injection. A public initializer cannot be mutated to change the private fit seed. Model hashes use this port's canonical representation; observation hashes match Python byte-for-byte.

Missing candidate costs are null with explicit availability status, rather than serialized Infinity. Unexpected NaN/Infinity metrics throw. Unlocalized state has null geometry, and reaching a sweep budget is not convergence. Conditional gain rank and convergence do not prove physical mapping accuracy.

## Integration boundary

The scope is known-L=2, one-bounce, 2-D synthetic estimation. No complete GC-SAGE or Figures 5–9 reproduction claim is supported. The acquisition is 48 sparse virtual samples spanning 1.49146747855 m; sample count must not silently shrink that physical aperture. Carrier phase alone does not identify geometry when each channel has a free complex gain.

Compute ledgers count candidate-tone projections and incumbent refits, not all FLOPs. Timings are measured Node numerical-phase time; there is no actual-browser latency claim. Browser-compatible UMD loading was tested in a Node VM, not a rendered browser.

A future UI must use a dedicated worker, cancel by terminating/replacing that worker, and ignore stale run IDs. An ordinary cancel message cannot interrupt this synchronous kernel. No worker wrapper or UI is delivered here. `DELIVERY-MANIFEST.md` lists the concise file set for later authorized integration.

The pre-history numerical kernel passed independent audit on hash `6baeea9ea710162ba91ad8919c33c6b0a5d8f6cf664b8bd2f3ac2442a68fcc68`: 55 fresh cases (110 fits) plus six arbitrary complex-LS stress cases. Maximum final SSE difference was 3.56483e-5 and maximum complex-prediction difference 7.78815e-7. `INDEPENDENT-AUDIT.md` and `independent/fresh-comparison.json` preserve that evidence. The exact predecessor is retained under `superseded/pre-history-v0.2.0/`.

The added observer history keeps the numerical version unchanged and passed the final-byte eight-case comparison. Its narrow independent audit also **passed** against the hash at the top of this report: exact predecessor/history-off/history-on equality across all eight cases and both methods; all 180 actual boundaries reconstruct SSE within 4.55e-13 and incumbent-refit SSE within 1.14e-13. No snapshot aliasing or provenance change was found. See `HISTORY-INDEPENDENT-AUDIT.md` and `independent/history-audit.json`. The full final focused suite is 65/65. Natural fixtures contained no rejected updates; the separately labeled forced-rejection source-copy test covers that recorder branch without changing production behavior.
