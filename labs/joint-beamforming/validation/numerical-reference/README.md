# Joint beamforming: independent executable reference

This package solves the actual radar-only covariance problem, paper Algorithm 1 (tight SDR plus rank-one/factor recovery), and paper Algorithm 2 (optimized ZF QSDP plus covariance/row-QR recovery) from arXiv:1912.03420v2. It does not modify or publish the website. The existing analytic A/B/C teaching recipes are not used as an optimizer or a numerical baseline.

Start with `SOURCE-MODEL-ALGORITHM-AUDIT.md`, then the final `NUMERICAL-GATE-REPORT.md` and `results/summary.json` when present. The independent source/solver review is supplied separately. `BROWSER-PORT-PROPOSAL.md` describes actual possible live solvers; no UI or live latency is claimed.

## Run

Python 3.12.14 was used. Create an isolated virtual environment and install `requirements.txt` from official PyPI, or use a compatible existing isolated scientific environment.

```
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 .venv/bin/python validate_reference.py
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 .venv/bin/python experiment.py
```

`experiment.py` uses the frozen validation plan: 32 paired channels, M=10/K=2, Γ4:2:24 dB, original 1801-angle grid and complete paper objective. It intentionally writes every solve result, including failures and infeasible outcomes. Run fresh experiments in a separate copied directory to preserve frozen evidence. The `--trials` flag supports a smaller local smoke; that changes the Monte Carlo budget and must be labeled.

## Files

- `reference.py`: source-aligned QSDPs, exact objective compression, recovery, direct metrics, and diagnostics
- `experiment.py`: primary seeded paired sweep and frozen acceptance gates
- `validate_reference.py`: algebra, recovery, zero-threshold and provably infeasible boundary tests
- `refinement.py`: equivalent explicit-real-cone formulation for independent numerical refinement; full-block PSD dual adjoint avoids fragile native complex-dual extraction
- `VALIDATION-PLAN.json`: primary settings and predeclared numerical gates
- `SOURCE-MANIFEST.json`: version identity, exact PDF hash, provenance and source locators
- `results/trial-*.json`: complete original attempted solutions, raw duals, recovered factors, original H, source settings, residuals and status
- `results/radar.json`: solved radar-only reference
- `results/sweep-index.json`: compact full-sweep index
- `results/boundary-tests.json`: boundary test evidence

Complex matrices are encoded as equal-shape real and imaginary arrays. The H fingerprint is SHA-256 over row-major little-endian complex128 bytes. All powers are normalized; dB thresholds convert by 10^(dB/10). No RF carrier, physical bandwidth, physical sampling time, receiver observation duration, or physical watts are invented.

## Limits

This is an original-dimensional selected core experiment with reduced Monte Carlo count, not full-paper reproduction. Open work includes 1000-channel curves, K=4/6, the SSP baseline, finite N=1024 QPSK blocks, all receiver-side curves, actual browser solver/interaction validation, and measured browser latency. Software outputs are not measured radio or radar hardware results. Source PDFs are private research inputs and are not redistributed by this package.

## Complete the supplementary certification and report

After the primary run, use `run_refinement.py`, then `run_certificates.py`, then `build_report.py`. Use the same one-thread environment prefix. The report build uses `MPLCONFIGDIR` and `XDG_CACHE_HOME` in writable temporary directories when the home folder is read-only. Do not overwrite the included frozen evidence when running experiments.

The independent final review is in `independent-review/REVIEW.md`. Primary implementation bytes are preserved in `historical/`; `PRIMARY-FREEZE.json` binds the original 704 solves to those exact bytes. The current reference only adds a solver-settings override used by the later declared refinement. `REFERENCE-FREEZE.json` hashes all deliverable files.
