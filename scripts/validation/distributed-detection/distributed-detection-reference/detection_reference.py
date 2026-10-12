"""Two calibrated receivers, marginalized proper-complex Gaussian LRT.

Independent teaching reference; NOT a reproduction of a paper's MAPRT.
Python standard library only. See TEACHING_HANDOFF.zh.md for assumptions.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
import cmath
import math
import random
from typing import Sequence

MIN_POSITIVE_RHO = 1e-10
MAX_RHO = 1e4
MIN_PFA = 1e-12
MAX_PFA = 1.0 - 1e-12
MAX_LENGTH = 4096
MIN_SCALE = 1e-8
MAX_SCALE = 1e8


def _finite(x: float, name: str) -> float:
    x = float(x)
    if not math.isfinite(x):
        raise ValueError(f"{name} must be finite")
    return x


def _probability(p: float) -> float:
    p = _finite(p, "pfa")
    if not MIN_PFA <= p <= MAX_PFA:
        raise ValueError(f"pfa must be in [{MIN_PFA}, {MAX_PFA}]")
    return p


@dataclass(frozen=True)
class Model:
    rho: float = 3.0
    kappa: float = 0.75

    def __post_init__(self) -> None:
        rho = _finite(self.rho, "rho")
        kappa = _finite(self.kappa, "kappa")
        if rho != 0.0 and not MIN_POSITIVE_RHO <= rho <= MAX_RHO:
            raise ValueError("rho must be exactly 0 or within [1e-10, 1e4]")
        if not 0.0 <= kappa <= 1.0:
            raise ValueError("kappa must be in [0, 1]")
        object.__setattr__(self, "rho", rho)
        object.__setattr__(self, "kappa", kappa)

    @property
    def signal_eigenvalues(self) -> tuple[float, float]:
        return self.rho * (1.0 + self.kappa), self.rho * (1.0 - self.kappa)

    @property
    def null_weights(self) -> tuple[float, float]:
        bp, bm = self.signal_eigenvalues
        return bp / (1.0 + bp), bm / (1.0 + bm)

    @property
    def log_determinant(self) -> float:
        bp, bm = self.signal_eigenvalues
        return math.log1p(bp) + math.log1p(bm)


def _pair(z: Sequence[complex]) -> tuple[complex, complex]:
    if len(z) != 2:
        raise ValueError("exactly two receiver outputs required")
    result = tuple(complex(x) for x in z)
    if any(not math.isfinite(v.real) or not math.isfinite(v.imag) for v in result):
        raise ValueError("observations must be finite")
    # Avoid overflow in quadratic forms without clipping observations.
    if any(abs(v.real) > 1e100 or abs(v.imag) > 1e100 for v in result):
        raise ValueError("observation components exceed supported magnitude 1e100")
    return result


def local_energies(z: Sequence[complex]) -> tuple[float, float]:
    z1, z2 = _pair(z)
    return abs(z1) ** 2, abs(z2) ** 2


def energy_sum(z: Sequence[complex]) -> float:
    return math.fsum(local_energies(z))


def quadratic_eigen(z: Sequence[complex], model: Model) -> float:
    """Q in the known, calibrated real-correlation coordinate system."""
    z1, z2 = _pair(z)
    ap, am = model.null_weights
    return ap * abs((z1 + z2) / math.sqrt(2.0)) ** 2 + am * abs((z1 - z2) / math.sqrt(2.0)) ** 2


def quadratic_matrix(z: Sequence[complex], model: Model, *, correlation_phase: float = 0.0) -> float:
    """Independent 2x2 formula. phase is for coordinate-covariance audits, not a UI control.

    C12=rho*kappa*exp(i*phase); cross term is +2 Re(C12*conj(z1)*z2)/det C.
    """
    z1, z2 = _pair(z)
    phase = _finite(correlation_phase, "correlation_phase")
    bp, bm = model.signal_eigenvalues
    determinant = (1.0 + bp) * (1.0 + bm)
    diagonal_numerator = model.rho + model.rho ** 2 * (1.0 - model.kappa) * (1.0 + model.kappa)
    offdiagonal = model.rho * model.kappa * cmath.exp(1j * phase)
    return (diagonal_numerator * (abs(z1) ** 2 + abs(z2) ** 2)
            + 2.0 * (offdiagonal * z1.conjugate() * z2).real) / determinant


def log_likelihood_ratio(z: Sequence[complex], model: Model) -> float:
    return quadratic_eigen(z, model) - model.log_determinant


def waveform_energy(s: Sequence[complex]) -> float:
    if not 1 <= len(s) <= MAX_LENGTH:
        raise ValueError(f"waveform length must be 1..{MAX_LENGTH}")
    values = tuple(complex(v) for v in s)
    if any(not math.isfinite(v.real) or not math.isfinite(v.imag) for v in values):
        raise ValueError("waveform must be finite")
    if any(abs(v) > math.sqrt(MAX_SCALE) for v in values):
        raise ValueError("waveform energy exceeds the supported domain")
    e = math.fsum(abs(v) ** 2 for v in values)
    if not MIN_SCALE <= e <= MAX_SCALE:
        raise ValueError("waveform energy must be in [1e-8,1e8]")
    return e


def qpsk_waveform(length: int = 16, energy: float = 1.0) -> tuple[complex, ...]:
    if isinstance(length, bool) or not isinstance(length, int) or not 1 <= length <= MAX_LENGTH:
        raise ValueError(f"length must be an integer 1..{MAX_LENGTH}")
    energy = _finite(energy, "energy")
    if not MIN_SCALE <= energy <= MAX_SCALE:
        raise ValueError("energy must be in [1e-8,1e8]")
    scale = math.sqrt(energy / length)
    symbols = (1.0 + 0j, 1j, -1.0 + 0j, -1j)
    return tuple(scale * symbols[i % 4] for i in range(length))


def matched_output(y: Sequence[complex], s: Sequence[complex], noise_power: float = 1.0) -> complex:
    """s^H y / (sigma sqrt(E)); noise_power=E|n_l|²=sigma², not per-real variance."""
    e = waveform_energy(s)
    noise_power = _finite(noise_power, "noise_power")
    if not MIN_SCALE <= noise_power <= MAX_SCALE:
        raise ValueError("noise_power must be in [1e-8,1e8]")
    if len(y) != len(s):
        raise ValueError("observation and waveform lengths differ")
    values = tuple(complex(v) for v in y)
    if any(not math.isfinite(v.real) or not math.isfinite(v.imag) or abs(v) > 1e100 for v in values):
        raise ValueError("observations must be finite with magnitude <=1e100")
    products = tuple(complex(a).conjugate() * b for a, b in zip(s, values))
    dot = complex(math.fsum(v.real for v in products), math.fsum(v.imag for v in products))
    return dot / (math.sqrt(noise_power) * math.sqrt(e))


def matched_pair(y: Sequence[Sequence[complex]], s: Sequence[complex], noise_power: float = 1.0) -> tuple[complex, complex]:
    if len(y) != 2:
        raise ValueError("exactly two stations required")
    return matched_output(y[0], s, noise_power), matched_output(y[1], s, noise_power)


def raw_log_likelihood_ratio(y: Sequence[Sequence[complex]], s: Sequence[complex], noise_power: float, model: Model) -> float:
    """Raw receiver interface; orthogonal residual factors analytically cancel.

    Tests separately form and solve the full 2L-by-2L raw Gaussian covariance;
    this efficient runtime path does not pretend to perform that dense solve.
    """
    return log_likelihood_ratio(matched_pair(y, s, noise_power), model)


def _log1pmx(x: float) -> float:
    """log(1+x)-x without cancellation. Branch only changes arithmetic, not model."""
    if x >= 0.125:
        return math.log1p(x) - x
    term = -0.5 * x * x
    terms = [term]
    for n in range(3, 80):
        term *= -x * (n - 1.0) / n
        terms.append(term)
        if abs(term) <= math.ulp(abs(math.fsum(terms))):
            break
    return math.fsum(terms)


def _phi_and_delta(h: float) -> tuple[float, float]:
    """phi=(1-exp(-h))/h and phi-1; exact limit at h=0."""
    if h == 0.0:
        return 1.0, 0.0
    if h >= 0.125:
        phi = -math.expm1(-h) / h
        return phi, phi - 1.0
    term = -0.5 * h
    terms = [term]
    for n in range(2, 80):
        term *= -h / (n + 1.0)
        terms.append(term)
        if abs(term) <= math.ulp(abs(math.fsum(terms))):
            break
    delta = math.fsum(terms)
    return 1.0 + delta, delta


def log_tail(t: float, u: float, v: float) -> float:
    """log P(uX+vY>t), independent unit-mean exponentials.

    Nonnegative finite weights. Exact equal/zero-weight cases; no near-equality
    snapping. t may be +inf, but NaN is rejected. Strict > convention at atoms.
    """
    t = float(t)
    u, v = _finite(u, "u"), _finite(v, "v")
    if math.isnan(t) or min(u, v) < 0.0:
        raise ValueError("nonnegative finite weights and non-NaN t required")
    if t < 0.0:
        return 0.0
    if t == math.inf or max(u, v) == 0.0:
        return -math.inf
    if t == 0.0:
        return 0.0
    if v > u:
        u, v = v, u
    x = t / u
    if math.isinf(x) or v == 0.0:
        return -x
    if u == v:
        return _log1pmx(x)
    # Factoring the slower exponential eliminates nearly equal exponential subtraction.
    h = x * ((u - v) / v)
    phi, delta = _phi_and_delta(h)
    a = x * phi
    # Both terms are nonpositive; this avoids log1p(a)-x cancellation near t=0.
    return _log1pmx(a) + x * delta


def tail(t: float, u: float, v: float) -> float:
    return math.exp(log_tail(t, u, v))


def lower_cdf(t: float, u: float, v: float) -> float:
    """Stable near zero: P(uX+vY<=t)."""
    return -math.expm1(log_tail(t, u, v))


def tail_quantile(pfa: float, u: float, v: float) -> float:
    """Continuous-tail quantile; use calibrated_detector for the all-zero atom.

    Bisection is in units of max(u,v), so tiny positive rho is not collapsed.
    Returns the upper adjacent-float bracket, favoring Pfa <= requested Pfa.
    """
    pfa = _probability(pfa)
    u, v = _finite(u, "u"), _finite(v, "v")
    if min(u, v) < 0.0 or max(u, v) == 0.0:
        raise ValueError("at least one positive weight required")
    scale = max(u, v)
    ratio = min(u, v) / scale
    target = math.log(pfa)
    lo, hi = 0.0, max(1.0, -target)
    while log_tail(hi, 1.0, ratio) > target:
        hi *= 2.0
    for _ in range(128):
        mid = lo + (hi - lo) / 2.0
        if mid == lo or mid == hi:
            break
        if log_tail(mid, 1.0, ratio) > target:
            lo = mid
        else:
            hi = mid
    result = scale * hi
    # One representational upward adjustment only if scaling rounded below the bracket.
    if log_tail(result, u, v) > target:
        result = math.nextafter(result, math.inf)
    return result


@dataclass(frozen=True)
class Calibration:
    model: Model
    pfa: float
    joint_threshold: float
    energy_threshold: float
    joint_pd: float
    energy_sum_pd: float
    joint_miss: float
    energy_sum_miss: float
    joint_tie_randomization: float = 0.0

    @property
    def log_lr_threshold(self) -> float:
        return self.joint_threshold - self.model.log_determinant


def calibrated_detector(model: Model, pfa: float = 0.05) -> Calibration:
    pfa = _probability(pfa)
    te = tail_quantile(pfa, 1.0, 1.0)
    bp, bm = model.signal_eigenvalues
    if model.rho == 0.0:
        return Calibration(model, pfa, 0.0, te, pfa, pfa, 1.0 - pfa, 1.0 - pfa, pfa)
    tq = tail_quantile(pfa, *model.null_weights)
    return Calibration(model, pfa, tq, te, tail(tq, bp, bm), tail(te, 1.0 + bp, 1.0 + bm), lower_cdf(tq, bp, bm), lower_cdf(te, 1.0 + bp, 1.0 + bm))


def decide_joint(z: Sequence[complex], calibration: Calibration, *, tie_uniform: float | None = None) -> bool:
    """Detector receives observations/model only, never true alpha or H label."""
    if calibration.model.rho == 0.0:
        _pair(z)
        if tie_uniform is None or not 0.0 <= tie_uniform < 1.0:
            raise ValueError("rho=0 requires an independent uniform in [0,1)")
        return tie_uniform < calibration.joint_tie_randomization
    return quadratic_eigen(z, calibration.model) > calibration.joint_threshold


def decide_energy_sum(z: Sequence[complex], calibration: Calibration) -> bool:
    return energy_sum(z) > calibration.energy_threshold


def complex_standard_normal(rng: random.Random) -> complex:
    return complex(rng.gauss(0.0, 1.0), rng.gauss(0.0, 1.0)) / math.sqrt(2.0)


def generate_observations(rng: random.Random, model: Model, s: Sequence[complex], noise_power: float, *, target_present: bool) -> tuple[tuple[complex, ...], tuple[complex, ...]]:
    """Simulation-only interface: hidden alpha is drawn and discarded internally.

    Cholesky generation (not the detector's eigenbasis) provides an independent
    path for simulation. The detector never receives target_present or alpha.
    """
    e = waveform_energy(s)
    noise_power = _finite(noise_power, "noise_power")
    if not MIN_SCALE <= noise_power <= MAX_SCALE:
        raise ValueError("noise_power must be in [1e-8,1e8]")
    alpha = (0j, 0j)
    if target_present:
        g1, g2 = complex_standard_normal(rng), complex_standard_normal(rng)
        scale = math.sqrt(model.rho * noise_power / e)
        alpha = (scale * g1, scale * (model.kappa * g1 + math.sqrt((1.0 - model.kappa) * (1.0 + model.kappa)) * g2))
    sigma = math.sqrt(noise_power)
    return tuple(tuple(a * w + sigma * complex_standard_normal(rng) for w in s) for a in alpha)


def wilson_interval(successes: int, trials: int, z_score: float = 1.959963984540054) -> tuple[float, float]:
    """Two-sided Wilson score interval; defaults to marginal 95% coverage."""
    if trials <= 0 or not 0 <= successes <= trials or z_score <= 0:
        raise ValueError("invalid binomial inputs")
    p = successes / trials
    denominator = 1.0 + z_score ** 2 / trials
    center = (p + z_score ** 2 / (2.0 * trials)) / denominator
    radius = z_score * math.sqrt(p * (1.0 - p) / trials + z_score ** 2 / (4.0 * trials ** 2)) / denominator
    return max(0.0, center - radius), min(1.0, center + radius)


def resource_ledger(length: int, *, blocks: int = 1, template_mode: str = "per_block", bits_per_real: int | None = None, model_down_reals_per_update: int = 0, model_updates: int = 0) -> dict:
    """Exact finite-run payload count for the stated star-unicast convention.

    Raw fusion has the waveform at the fusion center already, hence no receiver
    template downlink. Local schemes receive it per block, once in this run, or
    already cached. Model downlink is an explicitly supplied count across both
    receivers, shared between local schemes. Zero means omitted/not estimated,
    not a physical proof of no overhead. Does not estimate throughput or latency.
    """
    for name, value in (("length", length), ("blocks", blocks), ("model_down_reals_per_update", model_down_reals_per_update), ("model_updates", model_updates)):
        if isinstance(value, bool) or not isinstance(value, int) or value < (1 if name in ("length", "blocks") else 0):
            raise ValueError(f"invalid {name}")
    if length > MAX_LENGTH:
        raise ValueError("unsupported length")
    if template_mode not in ("per_block", "once", "cached"):
        raise ValueError("template_mode must be per_block, once, or cached")
    if bits_per_real is not None and (isinstance(bits_per_real, bool) or not isinstance(bits_per_real, int) or not 1 <= bits_per_real <= 128):
        raise ValueError("bits_per_real must be an integer 1..128")
    updates = blocks if template_mode == "per_block" else int(template_mode == "once")
    down = 4 * length * updates
    model_down = model_down_reals_per_update * model_updates
    schemes = {}
    for name, up, template_down, extra in (
        ("central_raw", 4 * length * blocks, 0, 0),
        ("local_complex_match", 4 * blocks, down, model_down),
        ("local_energy_sum", 2 * blocks, down, model_down),
    ):
        total = up + template_down + extra
        schemes[name] = dict(up_reals=up, template_down_reals=template_down, model_down_reals=extra, total_reals=total, average_reals_per_block=total / blocks, payload_bits=None if bits_per_real is None else total * bits_per_real)
    return dict(receivers=2, length=length, blocks=blocks, template_mode=template_mode, template_updates=updates, bits_per_real=bits_per_real, schemes=schemes, caveat="Payload only; finite-bit quantization is not simulated. Calibration, framing, timestamps, computation, RF chains, topology, latency and energy are excluded. Center model/waveform availability and unicast are assumptions; local model downlink is entered explicitly.")
