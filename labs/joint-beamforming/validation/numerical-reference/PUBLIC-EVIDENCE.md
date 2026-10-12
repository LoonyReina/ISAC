# Selected numerical reference evidence

This primary readable bundle covers the independently audited selected original-size M10/K2 experiment:32 paired channels,11 thresholds, the actual tight-SDR and optimized-ZF programs and radar-only reference. It is not the paper’s full1000-channel/K4/K6/SSP/receiver reproduction.

Start with `NUMERICAL-GATE-REPORT.md` and `SOURCE-MODEL-ALGORITHM-AUDIT.md`. `results/summary.json` preserves all704 final method/trial/threshold selections, declared acceptance counts and statistics. `results/sweep-index.json` preserves every704 original attempt status, including failures; `results/refinement/index.json` preserves all135 refinement attempts. The source/real-cone diagnostic correction and failed attempts are explicit. All five independent phase-I infeasibility certificates and selected exact covariance/factor fixtures are included.

Every selected original file is copied without changing bytes. `PUBLIC-EVIDENCE-MANIFEST.json` binds the included files to the complete original917-file `REFERENCE-FREEZE.json`. Run `python validate_public_evidence.py` for read-only subset/hash/accounting checks. The original `validate_artifact.py` deliberately requires the full archive; it is not a subset validator.

The original25,845,796-byte `joint-beamforming-reference-v1.zip` is reconstructed from three optional raw-binary downloads (`../joint-beamforming-reference-v1.zip.part01`, `.part02`, `.part03`) using `../reassemble-reference.py` and `../joint-beamforming-reference-v1.parts.json`, SHA256 `3baff9d3e29cec528442fc2c4b9ab8dc34aceb7076803ca4e0c1f6783b4a59b2`. It contains every frozen historical output and was not recompressed or rewritten for this package. It is never fetched by the live page at startup. A hash index cannot substitute for omitted historical matrix/dual data: use the reconstructed archive for a complete direct audit.

## Reproduce in a new directory

Copy the source scripts, plans and pinned requirements/dependency metadata into a fresh work directory. With the declared Python scientific dependencies installed in an isolated environment, run `python validate_reference.py`, `python experiment.py --trials 32`, `python run_refinement.py`, `python run_certificates.py`, then `python build_report.py`. Use `OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1`. The original README details solver settings, seed identities and limits. Do not rerun into this frozen subset or overwrite historical evidence. Solver outcomes/timings can vary with environment; compare gates and constraints, not bitwise optima.

The seed plan is NumPy PCG64(2026101201+trial), independent CN(0,1) entries, with one H shared across both methods and all thresholds. Source PDF and extracted text are not redistributed; fetch the linked fixed official version and check its recorded hash if needed.

This offline bundle is separate from the live dependency-free JavaScript optimizer and its browser evidence. No stored optimum from this bundle is an input to that optimizer.
