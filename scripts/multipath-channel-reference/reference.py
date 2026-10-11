"""Independent two-path active-radio teaching reference; Python standard library only.

No repository dependency, no noise, no detector, no truth-fed receiver, no localization.
All frequencies are Hz, times seconds, lengths metres, phases radians, energies normalized.
"""
from dataclasses import dataclass
import cmath
import math
import sys
from functools import lru_cache

C = 299792458.0
N = 128
DF = 2_000_000.0
FC = 6_000_000_000.0
TU = 1.0 / DF
FS = N * DF
TS = 1.0 / FS
CP_SAMPLES = 32
CP = CP_SAMPLES * TS
LREF = 1.0
BINS = tuple(range(-N // 2, N // 2))
FREQUENCIES = tuple(k * DF for k in BINS)
CANDIDATES = tuple(i / 100.0 for i in range(1401))  # 0..14 m, never add truth
WALL = (-2.0, 10.0)
H_DOMAIN = (0.1, 6.0)
ALIAS_LENGTH = C / DF
FIRST_NULL_LENGTH = C / (N * DF)
POWER_BOUND = 1.0 / 9.0  # |z| <= |a0|+|a1| <= 1/6+1/6
PLOT_POWER_MAX = 0.12
PILOT_SEED = 0x5EED1234


def finite(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f'{name} must be a finite real number')
    return float(value)


def phasor_cycles(cycles):
    """Unit phasor, reducing cycles before trig; no approximate alias snapping."""
    r = math.remainder(finite(cycles, 'cycles'), 1.0)
    return complex(math.cos(math.tau * r), math.sin(math.tau * r))


def csum(values):
    values = tuple(values)
    return complex(math.fsum(z.real for z in values), math.fsum(z.imag for z in values))


@lru_cache(maxsize=1)
def pilots():
    """Fixed QPSK, |X|²=1/N. LCG uint32, quadrant=top two bits after update."""
    state = PILOT_SEED
    qpsk = (1 + 0j, 1j, -1 + 0j, -1j)
    out = []
    for _ in range(N):
        state = (1664525 * state + 1013904223) & 0xffffffff
        out.append(qpsk[state >> 30] / math.sqrt(N))
    return tuple(out)


@dataclass(frozen=True)
class Scene:
    h: float = 4.0
    b: float = 1.0
    rho: float = 0.7
    psi: float = 0.0
    common_phase: float = 0.37

    def __post_init__(self):
        for name in ('h', 'b', 'rho', 'psi', 'common_phase'):
            finite(getattr(self, name), name)
        if not H_DOMAIN[0] <= self.h <= H_DOMAIN[1]:
            raise ValueError('h outside [0.1,6] metres')
        if not 0 <= self.b <= 1 or not 0 <= self.rho <= 1:
            raise ValueError('b and rho must be in [0,1]')
        # Bounded phase input avoids pretending huge binary64 phases retain precision.
        if abs(self.psi) > math.tau or abs(self.common_phase) > math.tau:
            raise ValueError('phase controls must lie in [-2*pi,2*pi] radians')


@dataclass(frozen=True)
class Geometry:
    transmitter: tuple
    terminal: tuple
    image_transmitter: tuple
    reflection: tuple
    direct_length: float
    reflected_length: float
    broken_length: float
    direct_delay: float
    reflected_delay: float
    incidence_angle: float  # measured from wall normal
    reflection_angle: float
    visible: bool


def geometry(h=4.0, wall=WALL):
    finite(h, 'h')
    if not H_DOMAIN[0] <= h <= H_DOMAIN[1]:
        raise ValueError('h outside teaching domain')
    if len(wall) != 2 or not all(math.isfinite(v) for v in wall) or wall[0] >= wall[1]:
        raise ValueError('wall must be a nonempty finite x interval')
    qx = 12.0 / (h + 2.0)
    l0 = math.hypot(6.0, h - 2.0)
    l1 = math.hypot(6.0, h + 2.0)
    broken = math.hypot(qx, 2.0) + math.hypot(6.0 - qx, h)
    # For this obstacle-free upper half-plane, open segments T-Q and Q-P
    # have positive y. Only Q touches y=0, so no additional wall intersection.
    visible = wall[0] <= qx <= wall[1] and 0 < qx < 6 and h > 0
    if not visible:
        raise ValueError('specular point outside finite wall or path not visible')
    return Geometry((0.0, 2.0), (6.0, h), (0.0, -2.0), (qx, 0.0),
                    l0, l1, broken, l0 / C, l1 / C,
                    math.atan2(qx, 2.0), math.atan2(6.0 - qx, h), visible)


def gains(scene, g):
    """Unknown-to-receiver complex gains. Fixed generator normalization |A|=1."""
    a = phasor_cycles(scene.common_phase / math.tau)
    gamma = scene.rho * phasor_cycles(scene.psi / math.tau)
    a0 = a * scene.b * (LREF / g.direct_length) * phasor_cycles(-FC * g.direct_delay)
    a1 = a * gamma * (LREF / g.reflected_length) * phasor_cycles(-FC * g.reflected_delay)
    return a0, a1


def _complex_vector(values, name, length=N):
    out = tuple(complex(z) for z in values)
    if len(out) != length or any(not math.isfinite(z.real) or not math.isfinite(z.imag)
                                 or abs(z) > 1e100 for z in out):
        raise ValueError(f'{name} must contain {length} bounded finite complex values')
    return out


def synthesize_taps(lengths, coefficients, X=None):
    """Frequency-domain algebra fixture API, NOT necessarily a valid CP scene.

    Includes arbitrary coincident/aliased taps for rank tests; lengths <=100 alias
    periods. Geometric scene validity and CP support belong to generate_scene.
    """
    lengths = tuple(finite(v, 'length') for v in lengths)
    if not lengths or len(lengths) != len(coefficients):
        raise ValueError('one coefficient required per nonempty path list')
    if any(v < 0 or v > 100 * ALIAS_LENGTH for v in lengths):
        raise ValueError('algebra length outside bounded reference domain')
    coefficients = _complex_vector(coefficients, 'coefficients', len(lengths))
    X = pilots() if X is None else _complex_vector(X, 'X')
    pieces = tuple(tuple(x * a * phasor_cycles(-f * length / C)
                         for x, f in zip(X, FREQUENCIES))
                   for length, a in zip(lengths, coefficients))
    Y = tuple(csum(part[k] for part in pieces) for k in range(N))
    return Y, pieces


def generate_scene(scene=Scene()):
    g = geometry(scene.h)
    if g.reflected_delay >= CP:
        raise ValueError('absolute channel support exceeds copied CP')
    a0, a1 = gains(scene, g)
    Y, contributions = synthesize_taps((g.direct_length, g.reflected_length), (a0, a1))
    # This is an access boundary, not merely a UI label: receiver gets this dict only.
    receiver_input = dict(Y=Y, X=pilots(), f=FREQUENCIES, candidates=CANDIDATES)
    generator_only = dict(scene=scene, geometry=g, coefficients=(a0, a1),
                          contributions=contributions)
    return receiver_input, generator_only


def matched_sum(*, Y, X, f, candidates):
    """Only sample data, known pilots/frequencies, and a supplied candidate grid.

    General mathematical probe used by tests. Main lesson uses receive(), which
    enforces the frozen candidate grid. No per-scene received-energy normalization.
    """
    Y, X = _complex_vector(Y, 'Y'), _complex_vector(X, 'X')
    f = tuple(finite(v, 'frequency') for v in f)
    candidates = tuple(finite(v, 'candidate') for v in candidates)
    if f != FREQUENCIES:
        raise ValueError('full fixed signed-integer frequency grid is required')
    if not candidates or len(candidates) > 10000 or any(abs(d) > 100 * ALIAS_LENGTH for d in candidates):
        raise ValueError('nonempty bounded candidate grid required')
    energy = math.fsum(abs(x) ** 2 for x in X)
    if not energy > 0:
        raise ValueError('positive known transmitted useful energy required')
    products = tuple(x.conjugate() * y for x, y in zip(X, Y))
    z = tuple(csum(p * phasor_cycles(freq * d / C) for p, freq in zip(products, f)) / energy
              for d in candidates)
    return z


def single_maximum(candidates, powers):
    """One grid maximum, not object counting. Exact binary64 ties choose first index.

    Main candidates strictly increase, so first means lowest d. All-zero response
    returns None rather than fabricating an apparent distance. No threshold/CFAR.
    """
    if len(candidates) != len(powers) or not powers:
        raise ValueError('matching nonempty candidate/power vectors required')
    if any(not math.isfinite(p) or p < 0 for p in powers):
        raise ValueError('finite nonnegative powers required')
    maximum = max(powers)
    if maximum == 0:
        return None
    i = powers.index(maximum)
    return dict(index=i, apparent_distance_m=candidates[i], power=maximum,
                exact_tie_count=sum(p == maximum for p in powers))


def receive(*, Y, X, f, candidates):
    """Frozen-grid receiver. No geometry, h, path labels or gains in its API."""
    candidates = tuple(candidates)
    if candidates != CANDIDATES:
        raise ValueError('main receiver requires fixed 0..14 m, 0.01 m candidate grid')
    if tuple(X) != pilots():
        raise ValueError('main receiver requires the same fixed known QPSK burst')
    z = matched_sum(Y=Y, X=X, f=f, candidates=candidates)
    power = tuple(abs(v) ** 2 for v in z)
    estimate = single_maximum(candidates, power)
    return dict(z=z, power=power, estimate=estimate,
                status='no_response' if estimate is None else 'single_grid_maximum')


def sincpi(x):
    if x == 0:
        return 1.0
    if x == round(x):
        return 0.0
    t = math.pi * x
    if abs(t) < 1e-4:
        return 1 + t*t*(-1/6 + t*t*(1/120 - t*t/5040))
    return math.sin(t) / t


def dirichlet(length_offset):
    """Independent analytic kernel for bins -64..63 (complex period c/df).

    D(u)=exp(-i*pi*r)*sinc(N*r)/sinc(r), r=(df*u/c) mod 1.
    No explicit frequency sum; no epsilon-defined singular region.
    """
    u = finite(length_offset, 'length_offset')
    if abs(u) > 100 * ALIAS_LENGTH:
        raise ValueError('offset outside bounded reference domain')
    r = math.remainder(DF * u / C, 1.0)
    return phasor_cycles(-r / 2) * sincpi(N * r) / sincpi(r)


def analytic_response(candidates, lengths, coefficients):
    """Generator-only verification/overlay, never called by receive()."""
    return tuple(csum(a * dirichlet(d - length) for length, a in zip(lengths, coefficients))
                 for d in candidates)


def gram_from_separation_cycles(q):
    """Normalized two-column gain-template Gram at SPECIFIED delay separation.

    q=df*(tau1-tau0). This is NOT delay CRB or resolution probability. Exactly
    integral q is singular; near-integral q is kept finite without tolerance
    snapping, even when displayed chi rounds to 1. log_condition remains useful
    if binary64 condition/lambda_min overflow/underflow.
    """
    q = finite(q, 'separation cycles')
    if abs(q) > 100:
        raise ValueError('separation outside bounded numerical domain')
    r = math.remainder(q, 1.0)
    kernel = phasor_cycles(-r / 2) * sincpi(N * r) / sincpi(r)
    if r == 0:
        return dict(coherence=1.0, off_diagonal=kernel.conjugate(), lambda_min=0.0,
                    lambda_max=2.0, condition=None, log_condition=None,
                    exactly_singular=True, numeric_status='exact_singularity')
    if abs(r) < 0.5 / N:
        # Centered cosine average is positive here. 1-chi via sin² avoids cancellation.
        half = (N - 1) / 2
        lam_min = (2 / N) * math.fsum(math.sin(math.pi * (k - half) * r) ** 2 for k in range(N))
        if lam_min < sys.float_info.min:
            # Avoid logging rounded subnormals. sin(x)/x differs from 1 far
            # below any representable correction anywhere in this branch.
            log_min = math.log(math.pi**2 * (N*N - 1) / 6) + 2 * math.log(abs(r))
        else:
            log_min = math.log(lam_min)
        lam_max = 2 - lam_min
        chi = 1 - lam_min
    else:
        chi = min(1.0, abs(kernel))
        lam_min, lam_max = 1 - chi, 1 + chi
        log_min = math.log(lam_min)
    log_cond = math.log(lam_max) - log_min
    condition = math.exp(log_cond) if log_cond <= math.log(sys.float_info.max) else None
    return dict(coherence=chi, off_diagonal=kernel.conjugate(), lambda_min=lam_min,
                lambda_max=lam_max, condition=condition, log_condition=log_cond,
                exactly_singular=False,
                numeric_status='finite' if condition is not None and lam_min > 0 else 'binary64_range_limit')


def gram_at_delays(tau0, tau1):
    return gram_from_separation_cycles(DF * (finite(tau1, 'tau1') - finite(tau0, 'tau0')))


def useful_samples(X=None):
    """q[n]=sqrt(Ts)*s(nTs)=unitary IDFT of X in signed-bin order."""
    X = pilots() if X is None else _complex_vector(X, 'X')
    return tuple(csum(x * phasor_cycles(k*n/N) for k, x in zip(BINS, X)) / math.sqrt(N)
                 for n in range(N))


def normalized_waveform(q, X=None):
    """sqrt(Tu)*s(t), q=t/Tu. Periodically extended on [-CP/Tu,1)."""
    X = pilots() if X is None else _complex_vector(X, 'X')
    return csum(x * phasor_cycles(k*q) for k, x in zip(BINS, X))


def interval_energy(q0, q1, X=None):
    """Exact finite Fourier-series integral int_q0^q1 |sqrt(Tu)*s|² dq.

    The outer finite burst is zero outside [-CP,Tu); this formula concerns its
    trigonometric interior and CP. Analytic cross terms, not sample quadrature.
    """
    X = pilots() if X is None else _complex_vector(X, 'X')
    width, mid = q1-q0, (q1+q0)/2
    if not 0 <= width <= 2:
        raise ValueError('bounded nonnegative interval width required')
    diagonal = width * math.fsum(abs(x)**2 for x in X)
    cross = []
    for i, (k, x) in enumerate(zip(BINS, X)):
        for j in range(i):
            delta = k - BINS[j]
            cross.append(2 * (x * X[j].conjugate() * phasor_cycles(delta*mid)).real
                         * width * sincpi(delta*width))
    return diagonal + math.fsum(cross)


@lru_cache(maxsize=1)
def resource_ledger():
    samples = useful_samples()
    useful = math.fsum(abs(x)**2 for x in pilots())
    cp_discrete = math.fsum(abs(x)**2 for x in samples[-CP_SAMPLES:])
    cp_continuous = interval_energy(-CP/TU, 0)
    return dict(n=N, bins=list(BINS), delta_f_hz=DF, reference_carrier_hz=FC,
                minimum_offset_hz=FREQUENCIES[0], maximum_offset_hz=FREQUENCIES[-1],
                mean_offset_hz=-DF/2, endpoint_span_hz=(N-1)*DF, dft_bandwidth_hz=N*DF,
                sample_rate_hz=FS, sample_interval_s=TS, useful_duration_s=TU,
                cp_duration_s=CP, total_burst_duration_s=TU+CP, cp_samples=CP_SAMPLES,
                useful_energy=useful, continuous_cp_energy=cp_continuous,
                continuous_total_burst_energy=useful+cp_continuous,
                discrete_useful_sample_energy=math.fsum(abs(v)**2 for v in samples),
                discrete_cp_sample_energy=cp_discrete,
                discrete_total_sample_energy=useful+cp_discrete,
                receiver_window_start_s=0.0, receiver_window_stop_s=TU,
                candidate_min_m=CANDIDATES[0], candidate_max_m=CANDIDATES[-1],
                candidate_step_m=0.01, candidate_count=len(CANDIDATES),
                noise_variance=0.0, receiver_elements=1,
                one_way_first_null_m=FIRST_NULL_LENGTH, delay_period_s=TU,
                path_length_period_m=ALIAS_LENGTH, maximum_path_length_m=10.0,
                maximum_absolute_delay_s=10/C, fixed_plot_power_max=PLOT_POWER_MAX,
                scene_power_bound=POWER_BOUND, pilot_seed_uint32=PILOT_SEED,
                pilot_algorithm='LCG: state=(1664525*state+1013904223) mod 2^32; quadrant=state>>30')


def scene_diagnostics(scene, g, coefficients, Y):
    """Generator-only teaching diagnostics; not receiver inference."""
    a0, a1 = coefficients
    individual = abs(a0)**2 + abs(a1)**2
    # Sum |Y|² / E = |a0|²+|a1|²+2 Re[a0 conj(a1) D(L1-L0)].
    cross = 2 * (a0 * a1.conjugate() * dirichlet(g.reflected_length-g.direct_length)).real
    return dict(received_useful_energy=math.fsum(abs(y)**2 for y in Y),
                incoherent_path_energy=individual, coherent_energy_cross_term=cross,
                analytic_received_useful_energy=individual+cross,
                gram=gram_at_delays(g.direct_delay, g.reflected_delay))
