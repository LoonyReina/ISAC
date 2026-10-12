"""Export observed samples separately from expected results for another-language port."""
from dataclasses import asdict
from pathlib import Path
import numpy as np
from experiments import Scene, simulate, evaluate, write_json
from gc_sage import Options, fit, initialize, observation_hash


def main():
    here = Path(__file__).resolve().parent / "fixtures"
    y, model, truth = simulate(Scene())
    options = Options()
    data = {
        "purpose": "Observed-data-only input fixture; the estimator receives no simulator truth",
        "array_layout": "Rows are Tx-major Rx pairs; columns are frequencies",
        "observations_real": y.real,
        "observations_imag": y.imag,
        "model": asdict(model),
        "options": asdict(options),
        "observation_sha256_complex128_little_endian": observation_hash(y),
    }
    write_json(here / "default-observations.json", data)
    initial = initialize(y, model, options)
    expected = {"reference_delays_ns": initial.reference_delays_ns,
                "initializer_trace_sse": initial.delay_trace_sse,
                "evaluation_only": "Expected outputs are not estimator inputs or UI display substitutes", "methods": {}}
    for mode in ["scattering", "hybrid"]:
        result = fit(y, model, mode, options, initial)
        expected["methods"][mode] = {
            "evaluation": evaluate(result, y, model, truth),
            "states": [{"kind": p.kind, "reference_delay": p.reference_delay,
                        "delays": p.delays, "gains_real": p.gains.real,
                        "gains_imag": p.gains.imag, "point": p.point,
                        "normal": p.normal, "bounce_points": p.bounce_points,
                        "theta": p.theta} for p in result.states],
        }
    write_json(here / "default-expected.json", expected)
    print("Wrote observed-data fixture and separate expected outputs")


if __name__ == "__main__":
    main()
