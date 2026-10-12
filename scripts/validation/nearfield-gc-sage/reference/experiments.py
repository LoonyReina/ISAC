"""Truth generation and external evaluation, kept out of the estimator API."""
from __future__ import annotations

from dataclasses import asdict, dataclass
import argparse
import json
from pathlib import Path

import numpy as np
from scipy.optimize import linear_sum_assignment

from gc_sage import C, Model, Options, fit, initialize, steering, visibility_power_threshold


@dataclass(frozen=True)
class Scene:
    samples: int = 48
    tones: int = 64
    aperture: float = 1.49146747855
    bandwidth: float = 1e9
    snr_db: float = 15.0
    seed: int = 260501162
    point: tuple[float, float] = (1.0, 1.0)
    surface_start: tuple[float, float] = (1.5, 2.0)
    surface_end: tuple[float, float] = (2.0, 2.0)
    reflection_amplitude: float = 0.8
    reflection_phase: float = 0.7
    reflection_visible: bool = True
    reference_blind: bool = False
    relative_point_phase: float = 0.0


def simulate(scene: Scene) -> tuple[np.ndarray, Model, dict]:
    tx = np.array([[1.0, 0.0]])
    rx = np.column_stack((np.linspace(2.0, 2.0 + scene.aperture, scene.samples), np.zeros(scene.samples)))
    frequencies = np.linspace(-scene.bandwidth / 2, scene.bandwidth / 2, scene.tones)
    model = Model(tx, rx, frequencies, reference_pair=(scene.samples - 1) // 2, path_count=2)
    point = np.asarray(scene.point)
    point_delays = (np.linalg.norm(point - tx[0]) + np.linalg.norm(point - rx, axis=1)) / C
    start, end = np.asarray(scene.surface_start), np.asarray(scene.surface_end)
    tangent = (end - start) / np.linalg.norm(end - start)
    normal = np.array([-tangent[1], tangent[0]])
    image = tx[0] - 2 * normal * np.dot(normal, tx[0] - start)
    rays = rx - image
    parameter = np.dot(start - image, normal) / (rays @ normal)
    bounces = image + parameter[:, None] * rays
    positions = (bounces - start) @ tangent
    visibility = (positions >= -1e-10) & (positions <= np.linalg.norm(end - start) + 1e-10)
    visibility &= (parameter > 0) & (parameter < 1)
    if not scene.reflection_visible:
        visibility[:] = False
    if scene.reference_blind:
        # Explicit blockage leaves the first fifth, still within the finite segment.
        visibility &= np.arange(scene.samples) < max(1, int(0.2 * scene.samples))
    reflection_delays = np.linalg.norm(rays, axis=1) / C
    point_gain = np.full(scene.samples, np.exp(1j * scene.relative_point_phase), dtype=complex)
    reflection_unblocked_gain = np.full(scene.samples, scene.reflection_amplitude * np.exp(1j * scene.reflection_phase))
    reflection_gain = reflection_unblocked_gain * visibility
    point_signal = point_gain[:, None] * steering(point_delays, frequencies)
    reflection_signal = reflection_gain[:, None] * steering(reflection_delays, frequencies)
    unblocked = point_signal + reflection_unblocked_gain[:, None] * steering(reflection_delays, frequencies)
    clean = point_signal + reflection_signal
    sigma2 = 0.0 if np.isinf(scene.snr_db) else float(np.mean(np.abs(unblocked) ** 2) * 10 ** (-scene.snr_db / 10))
    rng = np.random.default_rng(scene.seed)
    noise = np.sqrt(sigma2 / 2) * (rng.standard_normal(clean.shape) + 1j * rng.standard_normal(clean.shape))
    observed = clean + noise
    truth = {
        "scene": asdict(scene), "clean": clean, "noise": noise, "noise_variance": sigma2,
        "point": point, "surface_point": start, "surface_normal": normal,
        "kinds": ["scattering", "reflection"],
        "delays": np.stack([point_delays, reflection_delays]),
        "gains": np.stack([point_gain, reflection_gain]),
        "visibility": np.stack([np.ones(scene.samples, dtype=bool), visibility]),
        "bounce_points": np.stack([np.broadcast_to(point, (scene.samples, 2)), bounces]),
    }
    return observed, model, truth


def evaluate(result, observed: np.ndarray, model: Model, truth: dict) -> dict:
    """Simulation-only metrics; this function never influences parameter fitting."""
    actual = truth["delays"][:, model.reference_pair]
    estimated = np.array([p.reference_delay for p in result.states])
    present = np.flatnonzero(np.any(truth["visibility"], axis=1))
    # Evaluation-only partial matching. Dummy nodes prevent forced false matches
    # when the reference misses a path or the fixed path count overfits noise.
    association_tolerance_ns = 0.5
    k, l = len(present), len(estimated)
    cost = np.zeros((k+l, k+l))
    cost[:k, :l] = np.abs(actual[present, None] - estimated[None, :]) * 1e9
    cost[:k, l:] = association_tolerance_ns / 2
    cost[k:, :l] = association_tolerance_ns / 2
    rows, cols = linear_sum_assignment(cost)
    association = {int(present[row]): int(col) for row, col in zip(rows, cols)
                   if row < k and col < l and cost[row, col] <= association_tolerance_ns}
    sse = float(np.sum(np.abs(observed - result.prediction) ** 2))
    clean_error = float(np.sum(np.abs(truth["clean"] - result.prediction) ** 2))
    clean_energy = float(np.sum(np.abs(truth["clean"]) ** 2))
    fitted_delays = np.stack([state.delays for state in result.states], axis=1)
    design = steering(fitted_delays, model.frequencies).transpose(0, 2, 1) / np.sqrt(len(model.frequencies))
    singular_values = np.linalg.svd(design, compute_uv=False)
    output = {
        "mode": result.mode, "sse": sse,
        "relative_residual_db": 10 * np.log10(max(sse, 1e-300) / np.sum(np.abs(observed) ** 2)),
        "clean_nmse_db": 10 * np.log10(max(clean_error, 1e-300) / clean_energy),
        "converged": result.converged, "stopping_reason": result.stopping_reason,
        "sweeps": result.trace[-1]["sweep"],
        "trace": result.trace, "budget": asdict(result.budget),
        "initialization_budget": asdict(result.initialization.budget),
        "initialization_reference_delays_ns": result.initialization.reference_delays_ns,
        "true_reference_delays_ns": (actual * 1e9).tolist(),
        "observation_sha256": result.observation_sha256,
        "evaluation_association_tolerance_ns": association_tolerance_ns,
        "unmatched_estimate_indices": sorted(set(range(l))-set(association.values())),
        "conditional_gain_design": {
            "scope": "Linear gain identifiability conditional on fitted geometry; not a proof of geometric or mechanism identifiability",
            "min_normalized_singular_value": float(np.min(singular_values[:, -1])),
            "max_condition_number": float(np.max(singular_values[:, 0] / singular_values[:, -1])),
            "minimum_channel_rank": int(np.min(np.sum(singular_values > 1e-10, axis=1))),
        },
        "paths": [],
    }
    threshold = visibility_power_threshold(truth["noise_variance"], len(model.frequencies))
    for target in range(len(actual)):
        mask = truth["visibility"][target]
        if target not in association:
            output["paths"].append({
                "truth_kind": truth["kinds"][target], "target_present": bool(np.any(mask)),
                "estimated_kind": None, "matched": False,
                "reference_delay_error_ns": None, "interaction_rmse_m": None,
                "visible_fraction_truth": float(np.mean(mask)),
            })
            continue
        estimate = association[target]
        state = result.states[estimate]
        visibility_hat = np.abs(state.gains) ** 2 > max(threshold, 1e-12)
        entry = {
            "truth_kind": truth["kinds"][target], "estimated_kind": state.kind,
            "target_present": True, "matched": True,
            "reference_delay_error_ns": float((state.reference_delay - actual[target]) * 1e9),
            "estimated_point": state.point, "estimated_normal": state.normal,
            "visible_fraction_truth": float(np.mean(mask)),
            "visible_fraction_estimate": float(np.mean(visibility_hat)),
            "visibility_accuracy": float(np.mean(visibility_hat == mask)),
            "gain_power": np.abs(state.gains) ** 2,
            "visibility_threshold_power": threshold,
            "interaction_rmse_m": None,
        }
        if state.bounce_points is not None and np.any(mask):
            entry["interaction_rmse_m"] = float(np.sqrt(np.mean(np.sum((state.bounce_points[mask] - truth["bounce_points"][target, mask]) ** 2, axis=1))))
        if target == 0 and state.point is not None:
            entry["point_error_m"] = float(np.linalg.norm(state.point - truth["point"]))
        if target == 1 and state.normal is not None:
            aligned = state.normal * np.sign(np.dot(state.normal, truth["surface_normal"]))
            entry["normal_error_deg"] = float(np.degrees(np.arccos(np.clip(np.dot(aligned, truth["surface_normal"]), -1, 1))))
            # Distance from a fixed true point to the estimated infinite line.
            entry["plane_distance_error_m"] = float(abs(np.dot(aligned, state.point - truth["surface_point"])))
        output["paths"].append(entry)
    output["mechanisms_correct"] = not output["unmatched_estimate_indices"] and all(
        not p["target_present"] or (p["matched"] and p["truth_kind"] == p["estimated_kind"])
        for p in output["paths"])
    return output


def run_comparison(scene: Scene, options: Options = Options()) -> dict:
    observed, model, truth = simulate(scene)
    # Exactly one data-derived initialization; deep-copied by each estimator.
    initial = initialize(observed, model, options)
    scattering = fit(observed, model, "scattering", options, initial)
    hybrid = fit(observed, model, "hybrid", options, initial)
    noise_energy = float(np.sum(np.abs(truth["noise"]) ** 2))
    true_reference_design = steering(truth["delays"][:, model.reference_pair], model.frequencies).T
    truth_singular_values = np.linalg.svd(true_reference_design / np.sqrt(len(model.frequencies)), compute_uv=False)
    return {
        "scene": asdict(scene), "options": asdict(options),
        "claim": "Independent reduced two-path one-bounce synthetic estimator; not a reproduction of full GC-SAGE or paper Figures 5-9",
        "received_snr_db": float(10 * np.log10(np.sum(np.abs(truth["clean"]) ** 2) / noise_energy)) if noise_energy > 0 else None,
        "noise_variance": truth["noise_variance"],
        "reference_pair": model.reference_pair,
        "reference_truth_visibility_evaluation_only": truth["visibility"][:, model.reference_pair],
        "reference_delay_search_bounds_ns": initial.search_delay_bounds_ns,
        "sampling_diagnostics": {
            "frequency_spacing_Hz": float(model.frequencies[1]-model.frequencies[0]),
            "delay_alias_period_ns": float(1e9/(model.frequencies[1]-model.frequencies[0])),
            "inverse_bandwidth_ns": float(1e9/np.ptp(model.frequencies)),
            "rx_aperture_m": float(np.linalg.norm(model.rx[-1]-model.rx[0])),
            "virtual_rx_spacing_m": float(np.linalg.norm(model.rx[1]-model.rx[0])),
            "virtual_rx_spacing_at_30GHz_wavelengths": float(np.linalg.norm(model.rx[1]-model.rx[0])/(C/30e9)),
            "samples": int(observed.size), "real_observations": int(2*observed.size),
            "free_complex_path_gains": int(len(model.tx)*len(model.rx)*model.path_count),
            "true_reference_design_condition_evaluation_only": float(truth_singular_values[0]/truth_singular_values[-1]),
        },
        "same_observations": scattering.observation_sha256 == hybrid.observation_sha256,
        "same_initialization": scattering.initialization is hybrid.initialization,
        "scattering": evaluate(scattering, observed, model, truth),
        "hybrid": evaluate(hybrid, observed, model, truth),
    }


def json_value(value):
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, complex):
        return [value.real, value.imag]
    raise TypeError(type(value).__name__)


def write_json(path: Path, data: dict) -> None:
    def safe(value):
        if isinstance(value, dict):
            return {k: safe(v) for k, v in value.items()}
        if isinstance(value, (tuple, list, np.ndarray)):
            return [safe(v) for v in value]
        if isinstance(value, (float, np.floating)) and not np.isfinite(value):
            return None
        if isinstance(value, np.generic):
            return value.item()
        return value
    path.write_text(json.dumps(safe(data), default=json_value, indent=2, allow_nan=False) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("default-result.json"))
    parser.add_argument("--snr", type=float, default=15.0)
    parser.add_argument("--seed", type=int, default=260501162)
    parser.add_argument("--aperture", type=float, default=1.49146747855)
    parser.add_argument("--bandwidth", type=float, default=1e9)
    args = parser.parse_args()
    result = run_comparison(Scene(snr_db=args.snr, seed=args.seed, aperture=args.aperture, bandwidth=args.bandwidth))
    write_json(args.output, result)
    print(json.dumps({key: {metric: result[key][metric] for metric in ["sse", "clean_nmse_db", "mechanisms_correct", "converged", "sweeps", "budget"]} for key in ["scattering", "hybrid"]}, indent=2))


if __name__ == "__main__":
    main()
