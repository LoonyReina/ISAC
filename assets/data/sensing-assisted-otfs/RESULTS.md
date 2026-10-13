# Bounded interpreted OTFS receiver: results

Independent numerical acceptance: PASS for the declared model and finite experiment. Source-figure, sensing-prediction, guarded-baseline, browser and full-paper gates remain open.

## Main finding

At correct declared support, source-style symbol energy and 11 dB nominal SNR, the moment-repaired receiver produces 179/30,600 bit errors (BER 0.005850), versus 246/30,600 (0.008039) for the same-y uncertainty-ignored ablation. The paired frame BER difference is −0.002190 with a 95% bootstrap interval [−0.002941,−0.001471]. This is a result for this configuration, not a general guarantee or a reproduction of a printed curve.

A one-bin predicted-support error at that setting increases repaired errors to 863/30,600 (BER 0.028203). The wrong support is left wrong in the receiver. The oracle additionally receives true effective gains and physical support.

The repaired algorithm remains an approximation: on the independent eight-bit physical-model fixture it converges but differs from the exact Bayesian posterior by 0.499913 in one marginal probability (mean Bernoulli KL 0.144596 nats). That counterexample is retained. The literal operational diagnostic preserves source Eq.42/52/57 defects and repairs only normalization; its poorer BER is not a claim about unpublished author code.

## Design and denominators

- 120 independent fresh channel/data/noise frames reused across 12 conditions; not 1,440 independent channel draws
- M=N=16, P=3, known pilot replacing one data cell, 255 data bits, no guards
- Independent proper-complex Gaussian effective gains with population powers [0.6,0.3,0.1]; no realization normalization
- Pilot/data power ratio 100 (20 dB); nominal SNR 7/11/15 dB
- Source-style: Es=1, Ep=100, total frame energy355; equal-frame: Es=256/355, Ep=100Es, total256; noise reference unchanged
- Four receiver modes share each raw y. The two practical ablations also share estimates, support, masks, initialization, schedule, damping and stopping
- Fixed 40-iteration cap, damping0.5, tolerance1e-7; all capped frames remain in bit/frame denominators
- 2,000 paired frame bootstrap resamples; per-condition 95% intervals are descriptive and are not corrected for multiple comparisons

## All 12 frozen conditions

BER entries are numerator/30,600. Δ is repaired minus ignored. Negative favors repaired. Caps are repaired-frame caps out of120.

| Energy | Support | SNR dB | Repaired errors | Ignored errors | Literal diagnostic errors | Supplied-CSI errors | Paired Δ 95% CI | Repaired caps |
|---|---|---:|---:|---:|---:|---:|---|---:|
| source-style | correct | 7 | 816 | 855 | 2044 | 592 | [-0.001961, -0.000621] | 104 |
| source-style | correct | 11 | 179 | 246 | 1526 | 109 | [-0.002941, -0.001471] | 84 |
| source-style | correct | 15 | 57 | 105 | 1327 | 11 | [-0.002288, -0.000915] | 59 |
| source-style | one-bin mismatch | 7 | 1609 | 1628 | 2278 | 592 | [-0.001307, 0.000065] | 94 |
| source-style | one-bin mismatch | 11 | 863 | 920 | 1725 | 109 | [-0.002876, -0.000915] | 97 |
| source-style | one-bin mismatch | 15 | 562 | 638 | 1438 | 11 | [-0.003497, -0.001536] | 93 |
| equal-total | correct | 7 | 1200 | 1229 | 2387 | 980 | [-0.001536, -0.000391] | 99 |
| equal-total | correct | 11 | 321 | 373 | 1627 | 211 | [-0.002386, -0.001046] | 91 |
| equal-total | correct | 15 | 84 | 139 | 1319 | 24 | [-0.002484, -0.001209] | 66 |
| equal-total | one-bin mismatch | 7 | 2059 | 2078 | 2634 | 980 | [-0.001340, 0.000033] | 83 |
| equal-total | one-bin mismatch | 11 | 1052 | 1100 | 1840 | 211 | [-0.002353, -0.000784] | 95 |
| equal-total | one-bin mismatch | 15 | 654 | 707 | 1479 | 24 | [-0.002746, -0.000686] | 93 |

All 5,760 receiver records retained: iteration_cap=4228, converged=1532. No nonfinite/exception failures occurred in the finite sweep. Capped frames are decoded and counted; a cap is not silently marked convergence.

Final full sweep wall time: 101.17s in the recorded Python environment. This is offline reference runtime, not browser latency.

## Validation

- 12 unit tests pass, including exact covariance enumeration, independent random draws, transform/shift signs, zero uncertainty, duplicates, zero/weak gains, complex pilot, P=1, literal non-unit-Es scaling and invalid inputs
- 8 frozen independent fixture comparisons pass; physical unknown-gain posterior agreement within7e-15
- 18 independently coded scalar-loop message comparisons pass within5.55e-16; all four previously failing API rejection checks now pass
- Independent archive review reconstructs every one of the1,440 condition/frame observations within8.88e-16 and checks all5,760 receiver records
- Own archive replay checks all5,760 records, masks, budgets, estimates and error counts;48 full decoder probability/history replays match exactly
- Initial validation defects, initial finite-input source/results, and transient archive-read failure are preserved. The hardened rerun has exactly the same scientific results

## Evidence

- `CONTRACT.md`: equations, source crosswalk and limitations
- `results/paired-summary.json`: complete BER/FER/correct-payload/CI/NMSE/status/runtime statistics
- `results/receiver-records.jsonl.gz`: one record per condition/frame/mode, full iteration histories
- `results/*db.npz`: raw x/y, estimated gains, evaluator-only true gains, supports, variances, probabilities and error numerators
- `results/fresh-frame-primitives.npz`: independently drawn bits, gains and standard complex noise
- `independent-audit/REVIEW.md`: separate mathematical, implementation and archive acceptance
- `MANIFEST.json`: exact source/code/result file hashes

No guarded or OFDM comparison, no source-size figure trace, no sensing-derived predictor, no downlink, and no website changes are included.
