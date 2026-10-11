"""Rebuild deterministic implementation fixtures; not an independent oracle."""
from dataclasses import asdict
import json
import math
from pathlib import Path
import detection_reference as ref


def main():
    rows = []
    for rho in (0.0, 1e-10, 0.1, 3.0, 1e4):
        for kappa in (0.0, 1e-12, 0.75, math.nextafter(1.0, 0.0), 1.0):
            for pfa in (1e-12, 0.001, 0.05, 0.5, 1 - 1e-12):
                model = ref.Model(rho, kappa)
                cal = ref.calibrated_detector(model, pfa)
                row = asdict(cal)
                row.update(null_weights=model.null_weights, alternative_weights=model.signal_eigenvalues, logdet=model.log_determinant, log_lr_threshold=cal.log_lr_threshold)
                rows.append(row)
    model = ref.Model(3, 0.75)
    observations = []
    for label, z in (("same_phase", (math.sqrt(2), math.sqrt(2))), ("opposite_phase", (math.sqrt(2), -math.sqrt(2))), ("complex_phase", (1 + 2j, -0.5 + 0.75j))):
        observations.append(dict(label=label, z=[[complex(w).real, complex(w).imag] for w in z], local_energies=ref.local_energies(z), quadratic=ref.quadratic_eigen(z, model), matrix_quadratic=ref.quadratic_matrix(z, model), log_lr=ref.log_likelihood_ratio(z, model)))
    pfas = (1e-5, 1e-4, 0.001, 0.01, 0.05, 0.1, 0.2, 0.5, 0.9)
    data = dict(schema_version=1, provenance="Computed from detection_reference.py; checked by tests and independent parent oracle, not a paper reproduction. JSON decimal numbers encode binary64 fixtures.", domain=dict(rho="0 or [1e-10,1e4]", kappa="[0,1]", pfa="[1e-12,1-1e-12]", receivers=2), calibration=rows, sample_model=asdict(model), samples=observations, roc=[asdict(ref.calibrated_detector(model, p)) for p in pfas], resource_ledgers=[ref.resource_ledger(16, blocks=10, template_mode=mode, bits_per_real=16) for mode in ("per_block", "once", "cached")])
    path = Path(__file__).with_name("fixtures.json")
    path.write_text(json.dumps(data, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"Wrote {path.name}: {len(rows)} calibration fixtures")


if __name__ == "__main__":
    main()
