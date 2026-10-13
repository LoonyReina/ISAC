# Gate-zero independent review result

The fixed paper supports a useful bounded effective-gain uplink experiment, but its printed formulas do not define a mutually consistent implementation without explicit interpretation.

## Required contract

1. Correct Eq.19's coordinate/units; declare integer circular support and effective post-combining complex gains, retaining path phase
2. Preserve literal Eq.42/52/57 discrepancies as diagnostics; visibly label any moment-repaired receiver as a project interpretation
3. Treat full gain-error covariance, pseudocovariance, and gain-error/data dependence as physical-model facts; diagonal uncertainty SPA is a declared surrogate
4. Use only receiver-available statistical powers for practical uncertainty; current truth gains/data/support are evaluation-only, except explicitly labeled oracle modes
5. Aggregate or reject equal-modulo supports; no separately identifiable gains exist there
6. Distinguish exact finite Gaussian-mixture Eq.50, moment-Gaussian messages, and exact whole-frame symbol-wise posterior
7. If adding guarded baseline, use its exact inclusive mask and threshold scan; retain the 524-versus-480 source discrepancy and full pilot/guard/data energy ledger

## Independent evidence

28 mathematical/oracle checks pass. Full crosswalk and derivation: `EQUATION-CROSSWALK.md`. Replay: `python3 audit_oracle.py`. Frozen configurations, full complex covariance/pseudocovariance, exact posterior marginals, literal-source discrepancies, and test statuses: `independent-fixtures.json`.

This is gate-zero evidence only. No browser implementation, accepted reference detector, source-sized curve, whole-paper reproduction, or deployment is claimed.

## Subsequent independent reference implementation review

The separately authored receiver at SHA-256 `c83ba035ee49d8011c2b3b8f5f0260b7e95fd2fb562781f03e63a1ea7407ddce` was reviewed after the independent fixtures were frozen.

- Eighteen independently written scalar-loop message comparisons pass: three modes (repaired, ignored, literal), 1/2/5 iterations, unequal estimated or zero gains, complex pilot, Es=.7, damping=.37; maximum probability difference 5.55e-16
- The finite declared practical detector consumes only y, predicted support, pilot/noise/symbol settings, and externally declared statistical gain powers. No current truth gain/data/support leakage was found outside the explicitly labeled supplied-CSI/evaluation branches
- Four input-validation defects were reproduced on the original hash: fractional supports silently truncated and NaN symbol/noise powers or zero pilot accepted. They were fixed, and all four independent rejection checks now pass. Original failing review/code are preserved under `rejected-attempts/`
- Known pilot decision is now returned correctly with an explicit mask marking the two-point probability rows as data-only
- Exact covariance/oracle fixture agreement is arithmetic validation, not posterior optimality. The large retained estimated-gain SPA versus physical Bayesian posterior discrepancy remains a counterexample to equating convergence with correctness

`review_reference.py` and `reference-implementation-review.json` record this review. This accepts the finite bounded **interpreted** receiver core, with the source corrections and independent-error/circular-Gaussian approximation limitations stated in the crosswalk. It does not accept the literal printed equations as consistent or close the whole-paper/browser gates. Final experiment archive verification is recorded separately once the finite sweep has finished.

## Final-hash experiment archive review

The final finite sweep completed on the reviewed SHA `c83ba035ee49d8011c2b3b8f5f0260b7e95fd2fb562781f03e63a1ea7407ddce`. `review_experiment.py` independently rebuilt all 1,440 condition/frame input observations and checked all 5,760 receiver records across 12 conditions.

All archive checks passed: raw x, raw y (maximum absolute difference 8.88e-16), effective pilot estimates, statistical receiver variances, predicted one-bin mismatch retained, exact frame energy and pilot/data counts, BER/FER/correct-payload counts, cap/failure denominators, and same-observation pairing across support conditions. Supplied-perfect-CSI output is unchanged between the correct/mismatched predicted-support conditions, as required because that separate oracle is supplied physical support.

Results and exact file hashes: `experiment-archive-review.json`. The initial attempt to read this archive while its gzip writer was still running ended with expected premature EOF; the completed final archive subsequently passed. No partial archive was accepted.

Conclusion: the declared bounded numerical implementation and its archived experiment pass this independent review. Source-sized original figures, paper-wide algorithms, guarded comparative performance, and browser/deployment work remain unverified/open.
