# Independent reference and experiment acceptance

Date: 2026-10-13 UTC.

## Decision

Accepted for the bounded, offline, direct known-symbol block-MMV reference and its declared quantitative experiments. The primary is a justified proper-complex-MMV, correlation-off, trace-projected fast-marginal proposal interpretation with independently verified evidence acceptance. It is not an exact source simulator or a guarantee of coordinate/global optimality. The single-log variant is a separately named source-inspired diagnostic. The evidence is sufficient to freeze this numerical reference; no browser implementation, public deployment, full-framework implementation or literal Figure 4 reproduction is accepted by this report.

This audit independently derived the physical scalar path sum, dictionary ordering, signs, amplitude/power units, Gaussian evidence/posterior and marginal block objective before calling the authored reference. Its dense oracle imports no authored reference functions. Separate adapter code invokes the reference only to compare outputs against that oracle. Downloaded MATLAB was inspected read-only and never executed, translated or redistributed.

## Frozen bindings

- Governing accepted manuscript SHA-256: a51c363bbb6b6a646a1de1ff20054722db60ad7ec2a303421d570ae5b8d82172
- Current reference.py: 2a78defdf9f01ad7af14e7cd16b48d20b89137292abf471d12eaeacf604c5c70
- Executed reference-executed-v1.py: c650d3c2fccae4a5138fbbc710261a8aafda9b8d8aabb90d917395422841aed7
- Executed experiments-executed-v1.py: d10e1c40bec52e94f2ec851289271e4017f89d3da45170cc34317edcf5e09a7d
- Current experiments.py with run-start provenance: 5b077b957d3f690cb02bf5d464e530dc3026d36bbbf70d351b76edbb6246ad48
- Frozen experiment plan: 08b71d148def86b195a75fee41b1fb7089ee8ab964bb678c18909d0cd7dab679
- Independent dense oracle: 2745e67d3c2f064fea819cabe20673180713f74139c0101a2a18973a7e7cb4ac

The current reference differs from the executed version only by argument validation and input-array conversion for OMP. The diff was inspected; default numerical paths are unchanged. Both versions remain available, and the deterministic supplement reproduced saved noise-validation outputs. Invalid options now fail clearly rather than weakening the descent guard.

Final replay review also caught hardcoded historical source attribution in the original supplement. The exact executed experiment runner and original numerical/runtime outputs are preserved. The current runner adds only pre-calibration execution-hash bookkeeping; the current supplement consumes that record and compares actual current/executed hashes. This completed historical run has an explicitly retrospective execution-provenance record bound to the already audited versions. A fresh-run probe independently verified that new provenance is written before calibration and binds the current imported core/runner rather than legacy archive files. These changes do not alter experiment estimates or thresholds.

## Independent verification completed

1. 67 equations-first checks: scalar forward path sums and independently assembled W/X, every transmit-stream impulse, ordinary versus Hermitian steering products, literal and corrected angle signs, Doppler-sign counterexample, array power normalization, physical units, proper-complex noise, dense evidence and derivatives, two posterior routes plus vectorized Gaussian conditioning, analytic orthogonal optima, missing-MMV-factor counterexample, non-unimodal scalar objective, non-optimal trace projection, EM-only diagnostic, unitary/scaling/replication invariance, zero/noise/duplicate/rank-deficient cases
2. 905 authored-reference adapter checks: independently recomputed best projected candidates and every action on small random cases, true declared-objective descent, current/proper objectives, final posterior, add/reestimate/delete labels, cap handling, singular/near-collinear behavior, option guards, amplitude scales from 1e-5 to 1e5, unitary/column mixing, source forward model and off-grid phases, block/user indexing, angle/gain extraction
3. 4,960 independent numerical support-union rank checks for one explicitly fixed known-symbol dictionary. No failures, minimum relative singular value 0.0462399440. This is a sufficient uniqueness check relative to one true three-delay support for this dictionary, not a general sparse-recovery/noisy-resolution theorem
4. 18,179 complete experiment checks across 480 trial fixtures and 2,400 method records. Reconstructed every physical clean/noisy observation, SNR and aggregate symbol budget; verified shared symbols/unit-noise across SNR; independently recomputed extraction and all support/miss/spurious denominators, NMSE, summaries, Wilson intervals, precision stopping and paired trial bootstrap
5. Every one of 83,793 accepted actions in 1,440 experimental FM histories was independently recomputed using dense Cholesky from the saved gamma changes. Maximum objective discrepancy was 8.42e-10. Every final experimental FM posterior matched the independent oracle
6. 1,221 provenance-supplement checks: all 522 fixture symbol/noise seed replays and separate generator truth metadata, complete 120 noise-validation status records, ambiguity-aware count/error summaries, current/executed source hashes, and absence of copyrighted paper/code payloads in the reference bundle

All these checks passed. No failed solver or capped trial was removed. The main/illustration/stress runs retain 18 cap records, all from the single-log diagnostic. No practical primary or row-SBL run capped in this experiment. No recorded exception was hidden by the validation replay.

## Findings that must accompany the results

The single-log diagnostic accepted 17,535 steps that increased the proper-MMV objective. Those steps decrease its own declared surrogate and are not evidence that the proper likelihood optimizer is broken. Keeping the variants and objectives separate is essential.

The primary is not universally better than the baselines. Across the fixed scene, its block NMSE is better than OMP at -5, 0 and 5 dB, while OMP has lower raw block NMSE at 10-20 dB. Row-SBL has lower block NMSE than the primary at 0-20 dB. The source-inspired single-log diagnostic is poorer in this tested setting. These are bounded empirical findings, not a universal ranking.

OMP's separately validated relative power threshold is 0.20, close to the weakest default true path power 0.2025 relative to the strongest. Its worse thresholded exact-support scores at high SNR coexist with competitive raw coefficient NMSE. Support success must not be used by itself to claim superior coefficient recovery. The threshold was selected on separate validation data using the frozen tie rule and was not retuned after seeing test results.

At -5 dB the primary exact-support result is 2/40. At 0 dB it is 33/80, and at 5, 10, 15 and 20 dB it is 80/80 at each SNR. The displayed Wilson intervals are descriptive under the preregistered precision-based stopping rule; they are not time-uniform intervals, and the fixed scene does not represent a scene-population experiment.

Weak-path stress misses the weak path in all five trials for the primary, row-SBL and OMP. Same-delay/same-user stress can report exact delay-user block support while missing one of three physical paths in every primary trial. That case is explicitly unsupported for separate rank-one angle extraction. Off-grid stress preserves continuous delays and reports split/spurious estimates; it does not fabricate an exact grid-domain truth NMSE.

Delay-only association is deliberately independent of true user and angles. Same-delay assignments are ambiguous; the original metrics are retained, and an additional unambiguous-only supplement excludes these arbitrary assignments from physical angle/user claims. Exact (delay,user) support metrics do not replace physical path multiplicity or association metrics.

Known-support LS receives true occupied delay blocks and is explicitly privileged. It is a diagnostic, not an achievable estimator for unknown support or a guaranteed lower bound against a biased posterior mean on every sample. Practical methods receive no true support, count, association or angle.

## Remaining limits

- The primary proposal can stop with a nonzero objective gradient; no-improving-proposal is not a fixed-point or convergence certificate
- Rank-deficient trace-inverse proposals are skipped and reported, rather than solved by an unannounced regularizer
- Fixed positive known noise, independent-column working prior, correlation-off block model and unnormalized steering are explicit choices
- The original angle-sign and amplitude-normalization ambiguities are corrected openly; Doppler conflicts remain out of the t=0 release
- No indirect signal stripping/DDCE, time-separated Doppler, matrix clutter, same-delay/same-user separation, original RCS/pathloss fidelity or source-scale reproduction is claimed
- Current evidence is offline. Browser port parity, live controls/replay, lifecycle and deployment need separate future review

## Reproducible audit files

Run test_dense_oracle.py, review_reference.py, check_support_rank.py, review_experiment.py, review_supplement.py and check_run_provenance.py with single-thread BLAS. The adapter scripts support either this sibling audit layout or an independent-audit subdirectory inside the reference bundle. JSON result files record counts, failures, hashes and numerical discrepancies. AUDIT.md explains the derivations and source issues; CROSSWALK.json maps source equations to chosen conventions and executable checks. Source PDFs, source page renders and unlicensed MATLAB are excluded.
