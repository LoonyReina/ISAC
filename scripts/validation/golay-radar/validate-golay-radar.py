#!/usr/bin/env python3
"""Independent educational Golay radar experiment. Python 3 standard library only.
Not IEEE 802.11ad compliance code, not a reproduction of the cited paper's plots.
Run from any directory: python3 scripts/validate-golay-radar.py [--check]
The default fixture destination is resolved relative to this script, not cwd.
Adapted from the independently audited Python teaching model supplied on 2026-10-11.
Reference-only slow-time assertions are retained as source-audit checks; the lesson
and JavaScript numerical API do not implement a slow-time layer.
All generated data are synthetic. No paper or external dataset is embedded.
"""
import argparse
import cmath
import json
import math
import random
from pathlib import Path

C = 299792458.0
FC = 60e9
FS = 1.76e9
TAU = 2 * math.pi


def golay(n):
    """Canonical independent recursion, NOT verified standard Ga/Gb bit order."""
    if n < 1 or n & (n - 1):
        raise ValueError('Length must be a positive power of two')
    a, b = [1], [1]
    while len(a) < n:
        a, b = a + b, a + [-v for v in b]
    return a, b


def cef_shaped_blocks(a, b):
    """Paper Fig. 2 block signs applied to our independent base pair."""
    neg = lambda s: [-v for v in s]
    return neg(b) + neg(a) + b + neg(a), neg(b) + a + neg(b) + neg(a)


def acorr(s, lag, omega=0.0):
    """C_s(k;omega) = sum conj(s[n])*s[n+k]*exp(j*omega*n), zero extension."""
    return sum(complex(s[n]).conjugate() * s[n + lag] * cmath.exp(1j * omega * n)
               for n in range(max(0, -lag), min(len(s), len(s) - lag)))


def cn_noise(length, variance, rng):
    sigma = math.sqrt(variance / 2)
    return [complex(rng.gauss(0, sigma), rng.gauss(0, sigma)) for _ in range(length)]


def physical(velocity_mps, fs=FS, fc=FC):
    wavelength = C / fc
    fd = 2 * velocity_mps / wavelength
    return dict(wavelength_m=wavelength, doppler_hz=fd,
                radians_per_chip=TAU * fd / fs, range_grid_m=C / (2 * fs))


def isolated_echo(seq, start_chip, targets, lmax, omega, noise):
    """Absolute receive-time phase. Targets are (integer delay, complex amplitude)."""
    y = list(noise)
    for delay, alpha in targets:
        for chip, value in enumerate(seq):
            n = delay + chip
            y[n] += alpha * value * cmath.exp(1j * omega * (start_chip + n))
    return y


def observe(n=128, guard=128, lmax=127, targets=((12, 1.0),), omega=0.0,
            mode='AB', noise_variance=0.0, seed=8088, compensation_omega=0.0):
    """Two isolated records; direct O(N*L) reference implementation.
    Known: sequences, starts, fs, timing origin. Unknown: integer delay(s), complex
    amplitude(s), Doppler. A user can set truth; receiver correlates all candidate lags.
    Each comparison mode gets exactly the same noise samples for the same seed.
    """
    if guard < lmax:
        raise ValueError('guard >= lmax required for isolated-record model')
    if mode not in ('AB', 'AA'):
        raise ValueError('mode must be AB or AA')
    if any(int(d) != d or d < 0 or d > lmax for d, _ in targets):
        raise ValueError('Every target delay must be an integer inside 0..lmax')
    a, b = golay(n)
    if mode == 'AA':
        b = a
    dstart = n + guard
    rng = random.Random(seed)
    count = n + lmax
    ya = isolated_echo(a, 0, targets, lmax, omega, cn_noise(count, noise_variance, rng))
    yb = isolated_echo(b, dstart, targets, lmax, omega, cn_noise(count, noise_variance, rng))
    if compensation_omega:
        ya = [y * cmath.exp(-1j * compensation_omega * k) for k, y in enumerate(ya)]
        yb = [y * cmath.exp(-1j * compensation_omega * (dstart + k)) for k, y in enumerate(yb)]
    za = [sum(complex(a[k]).conjugate() * ya[k + lag] for k in range(n)) / n
          for lag in range(lmax + 1)]
    zb = [sum(complex(b[k]).conjugate() * yb[k + lag] for k in range(n)) / n
          for lag in range(lmax + 1)]
    return dict(a=a, b=b, ya=ya, yb=yb, za=za, zb=zb,
                z=[(x + y) / 2 for x, y in zip(za, zb)],
                n=n, guard=guard, lmax=lmax, separation_chips=dstart,
                active_chips=2 * n, observation_chips=dstart + n + lmax)


def analytic_response(a, b, lag, delay, alpha, omega, separation):
    k = lag - delay
    return alpha * cmath.exp(1j * omega * lag) * (
        acorr(a, k, omega) + cmath.exp(1j * omega * separation) * acorr(b, k, omega)) / (2 * len(a))


def wrapped_phase(x):
    return (x + math.pi) % TAU - math.pi


def slow_time(m, tr, velocity, alpha=complex(0.6, 0.8), noise_variance=0.0, seed=803):
    """One already-extracted range coefficient per repetition, zero-Doppler kernel approximation.
    Distinct independent layer: this is not a full chip-level IEEE receiver.
    """
    if m < 1 or tr <= 0:
        raise ValueError('M >= 1 and Tr > 0 required')
    fd = physical(velocity)['doppler_hz']
    rng = random.Random(seed)
    noise = cn_noise(m, noise_variance, rng)
    h = [alpha * cmath.exp(1j * TAU * fd * i * tr) + noise[i] for i in range(m)]
    cross = sum(h[i + 1] * h[i].conjugate() for i in range(m - 1))
    # No estimate with one sample, zero amplitude, or vanishing cross product.
    estimate = None if m < 2 or abs(cross) < 1e-14 else wrapped_phase(cmath.phase(cross)) / (TAU * tr)
    return dict(h=h, fd_hz=fd, estimate_hz=estimate,
                estimate_velocity_mps=None if estimate is None else estimate * C / FC / 2,
                principal_fd_low_hz=-1 / (2 * tr), principal_fd_high_exclusive_hz=1 / (2 * tr),
                principal_velocity_abs_mps=C / FC / (4 * tr),
                dft_bin_hz=1 / (m * tr),
                dft_velocity_bin_mps=C / FC / (2 * m * tr),
                cpi_bin_convention_s=m * tr, actual_first_last_sample_span_s=(m - 1) * tr)


def carray(values):
    return [[float(complex(x).real), float(complex(x).imag)] for x in values]


def pack(result):
    return dict(n=result['n'], guard=result['guard'], lmax=result['lmax'],
                separation_chips=result['separation_chips'], active_chips=result['active_chips'],
                observation_chips=result['observation_chips'],
                a=result['a'], b=result['b'], ya=carray(result['ya']), yb=carray(result['yb']),
                za=carray(result['za']), zb=carray(result['zb']), z=carray(result['z']))


def run_tests():
    tests = []
    def check(name, cond, details=None):
        if not cond:
            raise AssertionError(name + ': ' + repr(details))
        tests.append(dict(name=name, passed=True, details=details))
    for n in (1, 2, 4, 8, 16, 32, 64, 128, 256, 512):
        a, b = golay(n)
        errors = [abs(acorr(a, k) + acorr(b, k) - (2 * n if k == 0 else 0)) for k in range(1 - n, n)]
        check('complementarity_' + str(n), max(errors) < 1e-12, max(errors))
    a, b = golay(128)
    u, v = cef_shaped_blocks(a, b)
    cef_ap = max(abs(acorr(u, k) + acorr(v, k)) for k in range(1, 512))
    check('cef_blocks_not_aperiodic_complementary', cef_ap > 0, cef_ap)
    check('cef_extreme_lag_counterexample', abs(acorr(u, 511)+acorr(v, 511)) == 2)
    periodic = lambda s,k: sum(s[i] * s[(i+k) % len(s)] for i in range(len(s)))
    check('cef_blocks_periodic_complementarity', all(periodic(u,k)+periodic(v,k)==0 for k in range(1,512)))
    for label, block in [('u',u),('v',v)]:
        left, right = block[:256], block[256:]
        check('cef_internal_256_pair_' + label, all(abs(acorr(left,k)+acorr(right,k))<1e-12 for k in range(1,256)))
    for delay in (0, 12, 127):
        alpha = complex(-0.3, 0.7)
        r = observe(targets=((delay, alpha),))
        err = max(abs(z - (alpha if lag == delay else 0)) for lag, z in enumerate(r['z']))
        check('complex_amplitude_and_endpoint_' + str(delay), err < 1e-12, err)
    aa = observe(mode='AA')
    ab = observe(mode='AB')
    check('fair_energy_and_time', aa['active_chips'] == ab['active_chips'] == 256 and
          aa['observation_chips'] == ab['observation_chips'] and
          sum(abs(x) ** 2 for x in aa['a'] + aa['b']) == sum(abs(x) ** 2 for x in ab['a'] + ab['b']))
    weak_ab = observe(targets=((12, 1), (33, .1)))
    weak_aa = observe(targets=((12, 1), (33, .1)), mode='AA')
    check('constructed_weak_echo_complementary', abs(weak_ab['z'][33] - .1) < 1e-12)
    check('constructed_weak_echo_repeated', abs(weak_aa['z'][33] - (.1 - 13 / 128)) < 1e-12,
          dict(AB_abs=abs(weak_ab['z'][33]), AA_abs=abs(weak_aa['z'][33])))
    for omega in (0, 1e-5, -0.003, math.pi / 256, .07):
        r = observe(omega=omega, targets=((12, complex(.4, -.9)),))
        direct = [analytic_response(a, b, l, 12, complex(.4, -.9), omega, 256) for l in range(128)]
        err = max(abs(x - y) for x, y in zip(r['z'], direct))
        check('exact_doppler_' + str(omega), err < 5e-12, err)
    r = observe(omega=math.pi / 256)
    check('interburst_pi_peak_null', abs(r['z'][12]) < 1e-12, abs(r['z'][12]))
    r = observe(omega=.013, compensation_omega=.013)
    check('oracle_full_doppler_compensation', max(abs(z - (1 if i == 12 else 0)) for i, z in enumerate(r['z'])) < 1e-12)
    wrong = [(abs(acorr(a, k)) + abs(acorr(b, k))) / 256 for k in range(1, 128)]
    check('magnitude_before_sum_fails', max(wrong) > .1, max(wrong))
    concat = a + b
    check('concatenated_full_filter_not_complementary', max(abs(acorr(concat, k)) for k in range(1, 256)) > 0)
    try:
        observe(guard=126)
        raise AssertionError('invalid guard accepted')
    except ValueError:
        check('guard_validation', True)
    # Exact noise power: 2N independent CN samples with coefficients magnitude 1/(2N).
    var = sum(abs(complex(x) / 256) ** 2 for x in a + b)
    check('exact_noise_variance_gain', abs(var - 1 / 256) < 1e-15, var)
    check('ideal_AB_white_output_noise_covariance', all(abs(acorr(a,k)+acorr(b,k))<1e-12 for k in range(1,128)))
    # The actual Fig2 guards cyclically extend both U and V inside a local +/-128 window.
    train = [-x for x in a] + u + v + [-x for x in b]
    local = [sum(u[k]*train[128+lag+k]+v[k]*train[640+lag+k] for k in range(512))/1024
             for lag in range(-128,129)]
    check('cef_actual_context_local_guard_window', max(abs(x-(1 if i==128 else 0)) for i,x in enumerate(local))<1e-12)
    rng = random.Random(8191)
    powers = []
    for _ in range(4096):
        noise = cn_noise(256, 1.0, rng)
        z = sum(x * w for x, w in zip(noise, a + b)) / 256
        powers.append(abs(z) ** 2)
    ratio = sum(powers) / len(powers) / var
    check('seeded_noise_variance_monte_carlo', .90 < ratio < 1.10, ratio)
    check('range_units', abs(C / (2 * FS) - 0.08516831193181819) < 1e-14)
    for velocity in (-40, -20, 0, 20, 40):
        s = slow_time(16, 25e-6, velocity)
        check('slow_time_sign_' + str(velocity), abs(s['estimate_velocity_mps'] - velocity) < 1e-10)
    vmax = C / FC / (4 * 25e-6)
    endpoint = slow_time(16, 25e-6, vmax)
    check('nyquist_endpoint_half_open', abs(endpoint['estimate_velocity_mps'] + vmax) < 1e-8)
    s1 = slow_time(16, 25e-6, 20)
    s2 = slow_time(16, 25e-6, 20 + C / FC / (2 * 25e-6))
    check('slow_time_alias_period', max(abs(x-y) for x,y in zip(s1['h'],s2['h'])) < 1e-12)
    check('single_slow_time_sample_no_velocity_estimate', slow_time(1, 25e-6, 20)['estimate_hz'] is None)
    # All comparisons use identical physical received noise for matched changes.
    noisy_ab = observe(noise_variance=.1, seed=909)
    noisy_aa = observe(mode='AA', noise_variance=.1, seed=909)
    check('paired_noise_same_first_record', noisy_ab['ya'] == noisy_aa['ya'])
    # Shorter capture deliberately truncates target at maximum delay, no zero sidelobe claim.
    crop = observe(targets=((127, 1),))
    ya, yb = crop['ya'][:128], crop['yb'][:128]
    peak = sum(a[k] * (ya[k + 127] if k + 127 < len(ya) else 0) +
               b[k] * (yb[k + 127] if k + 127 < len(yb) else 0) for k in range(128)) / 256
    check('truncated_capture_breaks_unit_peak', abs(peak - 1) > .9, abs(peak))
    return tests


def generate():
    tests = run_tests()
    a, b = golay(128)
    lags = list(range(-127, 128))
    scenarios = {}
    definitions = [
        ('single_zero_AB', dict()), ('single_zero_AA', dict(mode='AA')),
        ('weak_zero_AB', dict(targets=((12, 1), (33, .1)))),
        ('weak_zero_AA', dict(targets=((12, 1), (33, .1)), mode='AA')),
        ('vehicle_50mps_AB', dict(omega=physical(50)['radians_per_chip'])),
        ('vehicle_minus50mps_AB', dict(omega=physical(-50)['radians_per_chip'])),
        ('complex_endpoint_0_AB', dict(targets=((0, complex(.6, .8)),))),
        ('complex_endpoint_127_AB', dict(targets=((127, complex(-.3, .7)),))),
        ('complex_negative_doppler_AA', dict(targets=((33, complex(.4, -.9)),), omega=-.003, mode='AA')),
        # 50m/s with an integer extended gap creates nearly pi interburst phase.
        ('synthetic_longgap_pi_AB', dict(guard=round(FS/(2*physical(50)['doppler_hz']))-128,
                                         omega=physical(50)['radians_per_chip'])),
        ('synthetic_large_doppler_pi_AB', dict(omega=math.pi/256)),
        ('oracle_compensated_stress_AB', dict(omega=math.pi/256, compensation_omega=math.pi/256)),
    ]
    for name, kw in definitions:
        scenarios[name] = pack(observe(**kw))
        targets = kw.get('targets', ((12, 1),))
        scenarios[name]['options'] = dict(
            n=kw.get('n', 128), guard=kw.get('guard', 128), lmax=kw.get('lmax', 127),
            targets=[dict(delay=d, alpha=[complex(a).real, complex(a).imag]) for d, a in targets],
            mode=kw.get('mode', 'AB'), omega=kw.get('omega', 0),
            noiseVariance=0, seed=8088, compensationOmega=kw.get('compensation_omega', 0))
    doppler = physical(50)
    stats = dict(chip_period_s=1/FS, range_grid_m=C/(2*FS), wavelength_m=C/FC,
        vehicle50_doppler_hz=doppler['doppler_hz'],
        vehicle50_phase_over_128chips_rad=doppler['radians_per_chip']*128,
        vehicle50_phase_over_default_separation_rad=doppler['radians_per_chip']*256,
        vehicle50_phase_over_paper512_start_separation_rad=doppler['radians_per_chip']*512,
        vehicle50_phase_over_paper1024chips_rad=doppler['radians_per_chip']*1024,
        default_peak_noise_variance_for_unit_input_variance=1/256,
        synthetic_large_doppler_velocity_mps=FS/(2*256)*C/FC/2)
    for name, scenario in scenarios.items():
        zz = [complex(*x) for x in scenario['z']]
        truth_delays = {t['delay'] for t in scenario['options']['targets']}
        scenario['amplitude_at_true_delays'] = {str(i): abs(zz[i]) for i in truth_delays}
        scenario['maximum_off_target_amplitude'] = max(abs(x) for i, x in enumerate(zz) if i not in truth_delays)
        scenario['normalization'] = 'z=(CA+CB)/(2N); never per-plot renormalized'
    return dict(schemaVersion=2, generatedBy='scripts/validate-golay-radar.py, Python standard library independent reference',
        sourceVersion='arXiv:1702.05833v1, fixed 2017-02-20; equation pointers in separate source manifest',
        standardCompliance=False, reproductionOfPaperResults=False,
        fs_hz=FS, fc_hz=FC, speed_of_light_mps=C, base_sequences=dict(a=a,b=b),
        kernel=dict(lags=lags, ra=[acorr(a,k).real/128 for k in lags],
                    rb=[acorr(b,k).real/128 for k in lags],
                    combined=[(acorr(a,k)+acorr(b,k)).real/256 for k in lags]),
        scenarios=scenarios, constants=stats,
        scope='Noiseless full-record fixtures. Python RNG is independently tested, not matched to the JavaScript PRNG. Slow-time source-audit checks do not imply an implemented UI layer.',
        tests=dict(total=len(tests), passed=len(tests), checks=tests))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    default = Path(__file__).resolve().parents[1] / 'data' / 'golay-radar-validation.json'
    parser.add_argument('--output', type=Path, default=default)
    parser.add_argument('--check', action='store_true', help='Verify the committed fixture without writing')
    args = parser.parse_args()
    data = generate()
    rendered = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    if args.check:
        if not args.output.is_file():
            parser.exit(1, 'Missing fixture: ' + str(args.output) + '\n')
        # Exact structure; normal floating tolerance handles libm/platform variation.
        def equivalent(x, y):
            if type(x) is not type(y):
                return False
            if isinstance(x, float):
                return math.isclose(x, y, rel_tol=1e-12, abs_tol=1e-13)
            if isinstance(x, dict):
                return x.keys() == y.keys() and all(equivalent(x[k], y[k]) for k in x)
            if isinstance(x, list):
                return len(x) == len(y) and all(equivalent(a, b) for a, b in zip(x, y))
            return x == y
        if not equivalent(data, json.loads(args.output.read_text(encoding='utf-8'))):
            parser.exit(1, 'Stale fixture; regenerate with this script: ' + str(args.output) + '\n')
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding='utf-8')
    print(json.dumps(dict(output=str(args.output), checked=args.check,
                         reference_tests=data['tests']['passed'],
                         noiseless_scenarios=len(data['scenarios'])), indent=2))
