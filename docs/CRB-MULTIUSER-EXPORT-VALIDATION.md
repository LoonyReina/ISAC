# Independent CRB export checker: validation scope

The additive checker independently reconstructs point-target Eq. (33) model/constraints and Eq. (7) CRB from exported H, resources, Wc, Wks, relaxedR, primal/projection/dual states. It does not call a solver or claim that a browser produced the file.

Validated paths:

- Three fresh Nt4/Nt6/Nt8 Node records: actual full Fisher/Schur, all-user SINR/power, theorem rank, rank-one recovery, cone/proximal residuals and trace-bounded objective certificate pass
- One-iteration cap, full cancellation, analytical infeasibility, duplicate-channel infeasibility, rank-condition rejection and invalid-CRB rejection retain their unsuccessful statuses
- Partial Worker cancellation lacks finalState and is rejected as incomplete numerical evidence
- Ten actual Node Worker/controller records from separate UI review: five accepted designs (including Nt6/Nt8, reimport rerun and sweep endpoint) pass; rank/bound/cap remain unsuccessful and pass evidence audit; two partial Worker cancellations remain incomplete
- Six poisoned historical-import records: reject corrupted/missing primal state, dual, rank matrix, singular values and recovery eigenvalue
- All 22 final conditioned and held-channel records from the frozen kernel archive replay consistently

Owner portable suite: 78 checks. Independent portable review: 320 assertions (295 schema/state/status, 9 malformed-JSON and 16 extreme-scale/math controls), plus 30 explicitly unscored descriptive-metadata observations. An optional 13 legacy-archive assertions also pass. Suite counts overlap and should not be added into a count of independent experiments. The full review reports and failing pre-fix controls are retained in the optional archive.

The audit returns two distinct decisions: `passed` checks the evidence; `result.physicalAccepted` requires an actually converged, fully verified candidate. A truthful cap can pass the first and fail the second. The checker never turns a cap into infeasibility.

The broader raw-kernel validator admits extreme binary64 scales outside the accepted source/lesson experiments. Review found subnormal alpha/noise and tiny-CRB comparison hazards. The checker now requires positive relative-checked reported CRB values, normal alpha-squared/noise scales for physical acceptance, and finite independently replayed full Fisher information. Alpha1/noise1 live lesson inputs are unaffected. Frozen numerical, Worker and Python reference hashes are unchanged.

This is floating-point numerical replay, not interval proof, record authentication, actual browser acceptance, an extended-target checker or full-paper reproduction. Descriptive provenance fields remain declarations. No PDF is included.
