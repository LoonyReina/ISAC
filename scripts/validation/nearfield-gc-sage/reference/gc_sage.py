"""Reduced, one-bounce GC-SAGE reference. Not a full paper reproduction.

Source: https://arxiv.org/pdf/2605.01162v1, Eqs. 14--23.
The estimator accepts observations and declared model/search priors only.
Truth generation and evaluation are deliberately in a different module.
"""
from __future__ import annotations

from dataclasses import dataclass, field
import copy
import hashlib
import time
from typing import Literal

import numpy as np
from scipy.optimize import minimize_scalar

C = 299_792_458.0
ALGORITHM_VERSION = "reduced-gc-sage-2d/0.2.0-all-channel-region"
REGION_TOLERANCE_M = 1e-10


@dataclass(frozen=True)
class Model:
    tx: np.ndarray
    rx: np.ndarray
    frequencies: np.ndarray
    region: tuple[float, float, float, float] = (0.0, 6.5, 0.05, 6.5)
    reference_pair: int = 23
    path_count: int = 2
    max_delay_ns: float = 55.0

    def validate(self, observations: np.ndarray) -> None:
        if self.tx.ndim != 2 or self.tx.shape[1] != 2:
            raise ValueError("tx must contain 2-D coordinates")
        if self.rx.ndim != 2 or self.rx.shape[1] != 2:
            raise ValueError("rx must contain 2-D coordinates")
        q = len(self.tx) * len(self.rx)
        if observations.shape != (q, len(self.frequencies)):
            raise ValueError("Observation shape must equal (M*N, P)")
        if not np.all(np.isfinite(observations)):
            raise ValueError("Observations must be finite")
        if len(self.frequencies) < 2 or np.ptp(self.frequencies) <= 0:
            raise ValueError("A free per-channel gain makes single-tone geometry unidentifiable")
        if not 0 <= self.reference_pair < q:
            raise ValueError("Reference pair is outside the array")
        if self.path_count < 1 or self.path_count >= len(self.frequencies):
            raise ValueError("Known path count must be positive and smaller than tone count")
        if min(np.diff(np.sort(self.frequencies))) <= 0:
            raise ValueError("Frequencies must be distinct")
        if self.region[0] >= self.region[1] or self.region[2] >= self.region[3]:
            raise ValueError("Invalid search region")

    @property
    def pairs(self) -> tuple[np.ndarray, np.ndarray]:
        return np.repeat(self.tx, len(self.rx), axis=0), np.tile(self.rx, (len(self.tx), 1))


@dataclass(frozen=True)
class Options:
    delay_grid: int = 1024
    initializer_sweeps: int = 20
    angle_grid: int = 256
    refinement_rounds: int = 2
    refinement_points: int = 17
    max_sweeps: int = 12
    relative_tolerance: float = 1e-6
    stationary_sweeps: int = 2


@dataclass
class Budget:
    delay_candidates: int = 0
    delay_tone_products: int = 0
    scattering_candidates: int = 0
    reflection_candidates: int = 0
    scattering_tone_products: int = 0
    reflection_tone_products: int = 0
    incumbent_tone_products: int = 0
    seconds: float = 0.0


@dataclass
class PathState:
    kind: str
    reference_delay: float
    delays: np.ndarray
    gains: np.ndarray
    prediction: np.ndarray
    point: np.ndarray | None = None
    normal: np.ndarray | None = None
    bounce_points: np.ndarray | None = None
    theta: float | None = None


@dataclass
class Initialization:
    observation_sha256: str
    model_sha256: str
    states: list[PathState]
    delay_trace_sse: list[float]
    reference_delays_ns: list[float]
    reference_gains: np.ndarray
    search_delay_bounds_ns: tuple[float, float]
    budget: Budget


@dataclass
class FitResult:
    mode: str
    states: list[PathState]
    trace: list[dict]
    converged: bool
    stopping_reason: str
    budget: Budget
    initialization: Initialization
    observation_sha256: str

    @property
    def prediction(self) -> np.ndarray:
        return sum(state.prediction for state in self.states)


def observation_hash(y: np.ndarray) -> str:
    return hashlib.sha256(np.asarray(y, dtype=np.complex128).tobytes()).hexdigest()


def model_hash(model: Model) -> str:
    digest = hashlib.sha256()
    for array in [model.tx, model.rx, model.frequencies]:
        digest.update(np.asarray(array, dtype=np.float64).tobytes())
        digest.update(str(array.shape).encode())
    digest.update(repr((model.region, model.reference_pair, model.path_count, model.max_delay_ns)).encode())
    return digest.hexdigest()


def steering(delays: np.ndarray, frequencies: np.ndarray) -> np.ndarray:
    return np.exp(-2j * np.pi * np.asarray(delays)[..., None] * frequencies)


def delay_alias_period_ns(frequencies: np.ndarray) -> float:
    """Supported uniform grids and commensurate subsets, including held-out tones.

    This intentionally refuses unrecognized grids rather than treating arbitrary
    nonuniform input as infinitely unambiguous. The minimum observed separation
    must be a base grid step for this bounded reference implementation.
    """
    differences = np.diff(np.sort(frequencies))
    if len(differences) == 0 or np.min(differences) <= 0:
        raise ValueError("Distinct multiple frequencies are required for an alias period")
    base = float(np.min(differences))
    ratios = differences / base
    if not np.allclose(ratios, np.rint(ratios), rtol=1e-8, atol=1e-8):
        raise ValueError("Unsupported tone lattice for alias guard; supply a uniform grid or a supported commensurate subset")
    return 1e9 / base


def profile_geometry(hidden: np.ndarray, delays: np.ndarray,
                     frequencies: np.ndarray) -> tuple[np.ndarray, np.ndarray, float]:
    """Complex gain LS and direct SSE for one geometry, channel by channel."""
    s = steering(delays, frequencies)
    gains = np.sum(s.conj() * hidden, axis=-1) / len(frequencies)
    prediction = gains[:, None] * s
    sse = float(np.vdot(hidden - prediction, hidden - prediction).real)
    return gains, prediction, sse


def ellipse_points(reference_delay: float, angles: np.ndarray,
                   model: Model) -> np.ndarray:
    tx, rx = model.pairs
    t0, r0 = tx[model.reference_pair], rx[model.reference_pair]
    length = C * reference_delay
    focal = np.linalg.norm(r0 - t0)
    if length <= focal + 1e-10:
        return np.full((len(angles), 2), np.nan)
    e1 = (r0 - t0) / focal if focal > 1e-12 else np.array([1.0, 0.0])
    e2 = np.array([-e1[1], e1[0]])
    a, b = length / 2, np.sqrt((length / 2) ** 2 - (focal / 2) ** 2)
    return (t0 + r0)[None, :] / 2 + a * np.cos(angles)[:, None] * e1 + b * np.sin(angles)[:, None] * e2


def candidate_geometry(reference_delay: float, angles: np.ndarray, kind: str,
                       model: Model) -> dict:
    """Return valid geometric candidates without any truth or visibility data.

    Corrections made explicit: Eq. 9 normal is normalized before mirroring;
    Eq. 21 is implemented as a parametric line, with a physical-segment check.
    """
    tx, rx = model.pairs
    t0, r0 = tx[model.reference_pair], rx[model.reference_pair]
    points = ellipse_points(reference_delay, np.asarray(angles), model)
    xmin, xmax, ymin, ymax = model.region
    valid = np.all(np.isfinite(points), axis=1)
    valid &= (points[:, 0] >= xmin) & (points[:, 0] <= xmax)
    valid &= (points[:, 1] >= ymin) & (points[:, 1] <= ymax)
    normals, bounces = None, None
    if kind == "scattering":
        lengths = np.linalg.norm(points[:, None, :] - tx[None, :, :], axis=-1)
        lengths += np.linalg.norm(points[:, None, :] - rx[None, :, :], axis=-1)
        bounces = np.broadcast_to(points[:, None, :], (len(points), len(tx), 2)).copy()
    elif kind == "reflection":
        with np.errstate(invalid="ignore", divide="ignore"):
            vt, vr = points - t0, points - r0
            raw = vt / np.linalg.norm(vt, axis=1)[:, None] + vr / np.linalg.norm(vr, axis=1)[:, None]
            norm = np.linalg.norm(raw, axis=1)
            normals = raw / norm[:, None]
            valid &= norm > 1e-10
            dot = np.sum(normals[:, None, :] * (tx[None, :, :] - points[:, None, :]), axis=-1)
            images = tx[None, :, :] - 2 * normals[:, None, :] * dot[:, :, None]
            rays = rx[None, :, :] - images
            denominator = np.sum(normals[:, None, :] * rays, axis=-1)
            parameter = np.sum(normals[:, None, :] * (points[:, None, :] - images), axis=-1) / denominator
            bounces = images + parameter[:, :, None] * rays
            lengths = np.linalg.norm(tx[None, :, :] - bounces, axis=-1)
            lengths += np.linalg.norm(rx[None, :, :] - bounces, axis=-1)
            image_lengths = np.linalg.norm(rays, axis=-1)
            valid &= np.all(np.abs(denominator) > 1e-10, axis=1)
            valid &= np.all((parameter > 0) & (parameter < 1), axis=1)
            valid &= np.all(np.isfinite(lengths), axis=1)
            valid &= np.all(np.abs(lengths - image_lengths) < 1e-8, axis=1)
    else:
        raise ValueError("Only one-bounce scattering/reflection candidates are implemented")
    # Conservative reading of Eqs. 19, 21, 23: each modeled intersection is
    # in V, even for channels whose gain later fits near zero. The source does
    # not spell out whether invisible-channel coordinates may be exempted.
    # This check uses only declared region and candidate geometry, never truth.
    in_region = ((bounces[:, :, 0] >= xmin - REGION_TOLERANCE_M)
                 & (bounces[:, :, 0] <= xmax + REGION_TOLERANCE_M)
                 & (bounces[:, :, 1] >= ymin - REGION_TOLERANCE_M)
                 & (bounces[:, :, 1] <= ymax + REGION_TOLERANCE_M))
    valid &= np.all(in_region, axis=1)
    valid &= np.all(np.isfinite(lengths), axis=1)
    valid &= np.abs(lengths[:, model.reference_pair] - C * reference_delay) < 1e-8
    return {
        "angles": np.asarray(angles)[valid], "points": points[valid],
        "normals": normals[valid] if normals is not None else None,
        "bounces": bounces[valid], "delays": lengths[valid] / C,
    }


def _delay_search(hidden: np.ndarray, frequencies: np.ndarray, grid_ns: np.ndarray,
                  budget: Budget) -> tuple[float, complex, float]:
    s = steering(grid_ns * 1e-9, frequencies)
    correlations = s.conj() @ hidden
    scores = np.abs(correlations) ** 2 / len(frequencies)
    budget.delay_candidates += len(grid_ns)
    budget.delay_tone_products += len(grid_ns) * len(frequencies)
    index = int(np.argmax(scores))
    lo = grid_ns[max(0, index - 1)]
    hi = grid_ns[min(len(grid_ns) - 1, index + 1)]

    def negative_score(delay_ns: float) -> float:
        budget.delay_candidates += 1
        budget.delay_tone_products += len(frequencies)
        column = steering(np.array(delay_ns * 1e-9), frequencies)
        return -float(abs(np.vdot(column, hidden)) ** 2 / len(frequencies))

    delay_ns = float(grid_ns[index])
    if hi > lo:
        refined = minimize_scalar(negative_score, bounds=(lo, hi), method="bounded",
                                  options={"xatol": 1e-8, "maxiter": 80})
        if -float(refined.fun) >= float(scores[index]):
            delay_ns = float(refined.x)
    column = steering(np.array(delay_ns * 1e-9), frequencies)
    gain = np.vdot(column, hidden) / len(frequencies)
    residual = hidden - gain * column
    return delay_ns * 1e-9, complex(gain), float(np.vdot(residual, residual).real)


def initialize(observations: np.ndarray, model: Model, options: Options = Options()) -> Initialization:
    """Reference-channel matched-filter initialization followed by SAGE sweeps."""
    start = time.perf_counter()
    model.validate(observations)
    if options.delay_grid < 3:
        raise ValueError("At least three delay-grid points are required")
    frequencies = model.frequencies
    alias_bound_ns = delay_alias_period_ns(frequencies)
    if model.max_delay_ns >= alias_bound_ns:
        raise ValueError(
            f"Declared {model.max_delay_ns:g} ns delay prior exceeds the {alias_bound_ns:g} ns tone-grid alias period; "
            "increase the tone count, reduce bandwidth, or explicitly supply an independently justified shorter delay prior")
    tx, rx = model.pairs
    minimum_ns = np.linalg.norm(tx[model.reference_pair] - rx[model.reference_pair]) / C * 1e9 + 1e-5
    maximum_ns = model.max_delay_ns
    if maximum_ns <= minimum_ns:
        raise ValueError("No physical nonaliased reference-delay interval remains")
    grid_ns = np.linspace(minimum_ns, maximum_ns, options.delay_grid)
    y0 = observations[model.reference_pair]
    remaining = y0.copy()
    delays, gains, components = [], [], []
    budget = Budget()
    for _ in range(model.path_count):
        delay, gain, _ = _delay_search(remaining, frequencies, grid_ns, budget)
        component = gain * steering(np.array(delay), frequencies)
        delays.append(delay); gains.append(gain); components.append(component)
        remaining -= component
    trace = [float(np.vdot(remaining, remaining).real)]
    for _ in range(options.initializer_sweeps):
        previous = trace[-1]
        for l in range(model.path_count):
            hidden = y0 - sum(components[k] for k in range(model.path_count) if k != l)
            delay, gain, sse = _delay_search(hidden, frequencies, grid_ns, budget)
            old_residual = hidden - components[l]
            old_sse = float(np.vdot(old_residual, old_residual).real)
            if sse <= old_sse + 1e-13 * max(1.0, old_sse):
                delays[l], gains[l] = delay, gain
                components[l] = gain * steering(np.array(delay), frequencies)
        residual = y0 - sum(components)
        trace.append(float(np.vdot(residual, residual).real))
        if previous - trace[-1] <= 1e-10 * max(previous, 1e-12):
            break
    order = np.argsort(delays)
    delays = np.asarray(delays)[order]
    gains = np.asarray(gains)[order]
    # Same initial delay at every array channel, as stated in the source.
    # Joint linear LS here only initializes nuisance gains for these fixed delays.
    design = steering(delays, frequencies).T
    initial_gains = np.linalg.lstsq(design, observations.T, rcond=None)[0].T
    states = []
    for l, delay in enumerate(delays):
        path_delays = np.full(len(tx), delay)
        prediction = initial_gains[:, l, None] * steering(path_delays, frequencies)
        states.append(PathState("unlocalized", float(delay), path_delays,
                                initial_gains[:, l].copy(), prediction))
    budget.seconds = time.perf_counter() - start
    return Initialization(observation_hash(observations), model_hash(model), states, trace,
                          (delays * 1e9).tolist(), gains,
                          (minimum_ns, maximum_ns), budget)


def _best_candidate(hidden: np.ndarray, reference_delay: float, kind: str,
                    model: Model, options: Options, budget: Budget) -> tuple[PathState | None, float]:
    delta = 2 * np.pi / options.angle_grid
    angles = np.arange(options.angle_grid) * delta
    best, best_sse = None, np.inf
    for stage in range(options.refinement_rounds + 1):
        geo = candidate_geometry(reference_delay, angles, kind, model)
        count = len(geo["angles"])
        setattr(budget, kind + "_candidates", getattr(budget, kind + "_candidates") + count)
        operations = count * hidden.shape[0] * hidden.shape[1]
        setattr(budget, kind + "_tone_products", getattr(budget, kind + "_tone_products") + operations)
        if count:
            s = steering(geo["delays"], model.frequencies)
            amplitudes = np.einsum("kqp,qp->kq", s.conj(), hidden, optimize=False) / hidden.shape[1]
            score = hidden.shape[1] * np.sum(np.abs(amplitudes) ** 2, axis=1)
            k = int(np.argmax(score))
            prediction = amplitudes[k, :, None] * s[k]
            residual = hidden - prediction
            sse = float(np.vdot(residual, residual).real)
            if sse < best_sse:
                best_sse = sse
                best = PathState(kind, reference_delay, geo["delays"][k],
                                 amplitudes[k], prediction, geo["points"][k],
                                 geo["normals"][k] if geo["normals"] is not None else None,
                                 geo["bounces"][k], float(geo["angles"][k]))
        if best is None or stage == options.refinement_rounds:
            break
        angles = best.theta + np.linspace(-delta, delta, options.refinement_points)
        delta *= 2 / (options.refinement_points - 1)
    return best, best_sse


def fit(observations: np.ndarray, model: Model, mode: Literal["scattering", "hybrid"],
        options: Options = Options(), initial: Initialization | None = None) -> FitResult:
    """Fit the reduced one-bounce problem; no true geometry is accepted here."""
    model.validate(observations)
    if mode not in ("scattering", "hybrid"):
        raise ValueError("mode must be scattering or hybrid")
    if options.angle_grid < 8 or options.refinement_points < 3:
        raise ValueError("Geometry search budget is too small")
    if initial is None:
        initial = initialize(observations, model, options)
    if initial.observation_sha256 != observation_hash(observations):
        raise ValueError("Initialization belongs to different observations")
    if initial.model_sha256 != model_hash(model):
        raise ValueError("Initialization belongs to different model priors")
    start = time.perf_counter()
    states = copy.deepcopy(initial.states)
    budget = Budget()
    total = sum(state.prediction for state in states)
    initial_sse = float(np.vdot(observations - total, observations - total).real)
    trace = [{"sweep": 0, "path": None, "sse": initial_sse, "accepted": False, "kind": "initial"}]
    stationary = 0
    converged = False
    for sweep in range(1, options.max_sweeps + 1):
        before_sweep = trace[-1]["sse"]
        for l, old in enumerate(states):
            hidden = observations - (total - old.prediction)
            old_gains, old_prediction, old_profile_sse = profile_geometry(hidden, old.delays, model.frequencies)
            budget.incumbent_tone_products += observations.size
            incumbent = copy.deepcopy(old)
            incumbent.gains, incumbent.prediction = old_gains, old_prediction
            chosen, chosen_sse = incumbent, old_profile_sse
            scattering, scattering_sse = _best_candidate(hidden, old.reference_delay, "scattering", model, options, budget)
            if scattering is not None and scattering_sse < chosen_sse:
                chosen, chosen_sse = scattering, scattering_sse
            reflection_sse = None
            if mode == "hybrid":
                reflection, reflection_sse = _best_candidate(hidden, old.reference_delay, "reflection", model, options, budget)
                if reflection is not None and reflection_sse < scattering_sse and reflection_sse < chosen_sse:
                    chosen, chosen_sse = reflection, reflection_sse
            candidate_total = total - old.prediction + chosen.prediction
            residual = observations - candidate_total
            new_sse = float(np.vdot(residual, residual).real)
            previous = trace[-1]["sse"]
            accepted = new_sse <= previous + 1e-12 * max(previous, 1.0)
            if accepted:
                states[l] = chosen
                total = candidate_total
            else:
                new_sse = previous
            trace.append({"sweep": sweep, "path": l, "sse": new_sse,
                          "accepted": accepted, "kind": states[l].kind,
                          "scattering_subproblem_sse": scattering_sse,
                          "reflection_subproblem_sse": reflection_sse})
        improvement = (before_sweep - trace[-1]["sse"]) / max(before_sweep, 1e-30)
        stationary = stationary + 1 if improvement < options.relative_tolerance else 0
        if stationary >= options.stationary_sweeps:
            converged = True
            break
    budget.seconds = time.perf_counter() - start
    return FitResult(mode, states, trace, converged,
                     "relative objective tolerance" if converged else "sweep budget reached",
                     budget, initial, observation_hash(observations))


def visibility_power_threshold(noise_variance: float, tones: int,
                               false_alarm_heuristic: float = 0.01) -> float:
    if noise_variance < 0 or tones < 1 or not 0 < false_alarm_heuristic < 1:
        raise ValueError("Invalid visibility threshold arguments")
    return -np.log(false_alarm_heuristic) * noise_variance / tones
