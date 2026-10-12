"""Run the bounded numerical gate and save all results, including failures."""
from dataclasses import asdict, replace
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import platform
import unittest

import numpy as np
import scipy

from gc_sage import Options, fit, initialize, steering, ALGORITHM_VERSION
from experiments import Scene, run_comparison, simulate, write_json, json_value

HERE = Path(__file__).resolve().parent


def compact(result):
    return {
        "scene": result["scene"],
        "received_snr_db": result["received_snr_db"],
        "same_observations": result["same_observations"],
        "same_initialization": result["same_initialization"],
        "sampling_diagnostics": result["sampling_diagnostics"],
        **{mode: {k: result[mode][k] for k in ["sse", "relative_residual_db", "clean_nmse_db", "mechanisms_correct", "converged", "sweeps", "paths", "budget", "unmatched_estimate_indices"]}
           for mode in ["scattering", "hybrid"]},
    }


def holdout_check():
    y, model, _ = simulate(Scene())
    train = np.arange(y.shape[1]) % 4 != 3
    holdout = ~train
    train_model = replace(model, frequencies=model.frequencies[train])
    initialization = initialize(y[:, train], train_model)
    out = {"training_tones": int(np.sum(train)), "heldout_tones": int(np.sum(holdout)),
           "selection": "Every fourth frequency held out; gains and geometry fit only on the other tones", "methods": {}}
    for mode in ["scattering", "hybrid"]:
        result = fit(y[:, train], train_model, mode, initial=initialization)
        prediction = sum(state.gains[:, None]*steering(state.delays, model.frequencies[holdout]) for state in result.states)
        sse = float(np.sum(abs(y[:, holdout]-prediction)**2))
        out["methods"][mode] = {"heldout_sse": sse,
            "heldout_relative_residual_db": float(10*np.log10(sse/np.sum(abs(y[:, holdout])**2))),
            "kinds": [state.kind for state in result.states]}
    return out


def alias_guard_check():
    y, model, _ = simulate(Scene(tones=64, bandwidth=2e9))
    try:
        initialize(y, model)
    except ValueError as error:
        return {"tones": 64, "bandwidth_Hz": 2e9, "declared_max_delay_ns": 55.,
                "alias_period_ns": 31.5, "alias_path_length_m": 31.5e-9*299792458.,
                "refused": True, "reason": str(error)}
    raise AssertionError("Ambiguous acquisition should have been refused")


def main():
    output = HERE / "results"
    output.mkdir(exist_ok=True)
    suite = unittest.defaultTestLoader.discover(str(HERE), pattern="test_reference.py")
    text = io.StringIO()
    tests = unittest.TextTestRunner(stream=text, verbosity=2).run(suite)
    (output / "unit-tests.txt").write_text(text.getvalue())
    print(text.getvalue(), flush=True)
    if not tests.wasSuccessful():
        raise SystemExit("Numerical unit gate failed; experiments not promoted")
    default = run_comparison(Scene())
    write_json(output / "default.json", default)
    write_json(output / "noiseless.json", run_comparison(Scene(snr_db=float("inf"))))
    # These are all predeclared seeds 0..9 at each SNR, with no seed filtering.
    batch = []
    for snr in [5., 10., 15., 20.]:
        for seed in range(10):
            result = run_comparison(Scene(snr_db=snr, seed=seed))
            batch.append(compact(result))
        print(f"Finished all ten seeds at nominal SNR {snr:g} dB", flush=True)
    write_json(output / "snr-seeds.json", {"seed_policy": "All integers 0 through 9 at each SNR, no filtering", "runs": batch})
    failures = {}
    cases = {
        "narrow_band_20_MHz": Scene(bandwidth=20e6),
        "reference_blind": Scene(reference_blind=True),
        "absent_second_path_known_order_violated": Scene(reflection_visible=False),
    }
    for name, scene in cases.items():
        result = run_comparison(scene)
        failures[name] = compact(result)
        write_json(output / (name + ".json"), result)
    small_aperture = [compact(run_comparison(Scene(aperture=.05, seed=seed))) for seed in range(10)]
    write_json(output / "small-aperture-seeds.json", {"seed_policy": "All integers 0 through 9", "runs": small_aperture})
    heldout = holdout_check()
    write_json(output / "heldout-tones.json", heldout)
    alias_check = alias_guard_check()
    write_json(output / "alias-guard.json", alias_check)
    summaries = []
    for snr in [5., 10., 15., 20.]:
        group = [r for r in batch if r["scene"]["snr_db"] == snr]
        summaries.append({
            "nominal_snr_db": snr, "runs": len(group),
            "hybrid_both_mechanisms_correct": sum(r["hybrid"]["mechanisms_correct"] for r in group),
            "hybrid_lower_training_sse": sum(r["hybrid"]["sse"] < r["scattering"]["sse"] for r in group),
            "hybrid_lower_clean_nmse": sum(r["hybrid"]["clean_nmse_db"] < r["scattering"]["clean_nmse_db"] for r in group),
            "median_scattering_nmse_db": float(np.median([r["scattering"]["clean_nmse_db"] for r in group])),
            "median_hybrid_nmse_db": float(np.median([r["hybrid"]["clean_nmse_db"] for r in group])),
            "hybrid_converged": sum(r["hybrid"]["converged"] for r in group),
        })
    metadata = {
        "algorithm_version": ALGORITHM_VERSION,
        "geometry_contract": "Every modeled one-bounce interaction lies in the declared region within 1e-10 m, including channels with near-zero fitted gain; conservative interpretation of source Eqs. 19, 21, 23",
        "claim": "First offline numerical gate for an independent restricted one-bounce GC-SAGE model; not full-paper reproduction",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "python": platform.python_version(), "numpy": np.__version__, "scipy": scipy.__version__,
        "unit_tests": {"run": tests.testsRun, "failures": len(tests.failures), "errors": len(tests.errors)},
        "options": asdict(Options()), "snr_summary": summaries,
        "small_aperture": {"runs": len(small_aperture), "both_mechanisms_correct": sum(r["hybrid"]["mechanisms_correct"] for r in small_aperture)},
        "heldout": heldout, "alias_guard": alias_check, "failure_examples": failures,
        "source_sha256": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.glob("*.py")},
    }
    write_json(output / "verification-summary.json", metadata)
    print(json.dumps({"unit_tests": metadata["unit_tests"], "snr_summary": summaries, "small_aperture": metadata["small_aperture"], "heldout": heldout}, indent=2, default=json_value), flush=True)


if __name__ == "__main__":
    main()
