#!/usr/bin/env python3
"""Independent, stdlib-only analytic teaching model, not Liu et al. optimization.

Usage: python3 reference.py --fixtures fixtures.json
Physical N-element half-wave ULA; unnormalized steering a[m]=exp(j*pi*m*u),
u=sin(theta); one unit-variance communication symbol and (split only) one
independent unit-variance radar symbol. Returned powers are ensemble powers.
No source PDF/code is embedded. No optimizer, finite-block simulation or receiver.
"""
import argparse
import cmath
import json
import math
import sys
from dataclasses import dataclass, asdict


def inner(a, b):
    return sum((x.conjugate() * y for x, y in zip(a, b)), 0j)


def norm2(a):
    return math.fsum(abs(z) ** 2 for z in a)


def steering(indices, u):
    return [cmath.exp(1j * math.pi * m * u) for m in indices]


def scale(a, k):
    return [k * z for z in a]


def covariance(factors):
    n = len(factors[0])
    return [[sum((w[i] * w[j].conjugate() for w in factors), 0j)
             for j in range(n)] for i in range(n)]


def pattern(factors, u):
    a = steering(range(len(factors[0])), u)
    return math.fsum(abs(inner(a, w)) ** 2 for w in factors)


def dirichlet_power(n, delta_u):
    """Independent closed form of |a(u)^H a(v)/n|^2.
    Exact integer identities, NOT epsilon floors, recognize theoretical nulls.
    """
    d = math.remainder(delta_u, 2.0)
    if d == 0.0:
        return 1.0
    half_cycles = n * d / 2.0
    if half_cycles == round(half_cycles):
        return 0.0
    return (math.sin(n * math.pi * d / 2) /
            (n * math.sin(math.pi * d / 2))) ** 2


def wrapped_spatial_delta(target_u, user_u):
    """Difference modulo 2 without losing near-endfire residual before wrapping."""
    d = target_u - user_u
    if d > 1:
        return (target_u - 1) - (user_u + 1)
    if d < -1:
        return (target_u + 1) - (user_u - 1)
    return d


def stable_projection(nr, user_u, target_u, channel_gain=1.0):
    """Project unit target steering onto the user-channel nullspace.

    Pi=I-bu bu^H. Compute centered complex expm1 residuals rather than
    1-|rho|^2, so q remains accurate as delta_u -> 0. No epsilon floor.
    Returns Pi*bt, q=||Pi*bt||^2, nullity. nr=1 or equal/aliased steering
    gives exactly zero. Nonzero channel magnitude/phase does not change Pi.
    """
    bt = scale(steering(range(nr), target_u), 1 / math.sqrt(nr))
    if channel_gain == 0:
        return bt, 1.0, nr
    d = wrapped_spatial_delta(target_u, user_u)
    if nr == 1 or d == 0:
        return [0j] * nr, 0.0, nr - 1
    step = math.pi * d
    center = (nr - 1) / 2
    # exp(j*x)-1 = -2*sin(x/2)^2 + j*sin(x), accurate for tiny x.
    e = [complex(-2 * math.sin(step * (m-center) / 2) ** 2,
                 math.sin(step * (m-center))) for m in range(nr)]
    mean_e = complex(math.fsum(z.real for z in e) / nr,
                     math.fsum(z.imag for z in e) / nr)
    common = cmath.exp(1j * step * center) / math.sqrt(nr)
    bu_phases = steering(range(nr), user_u)
    projected = [bu_phases[m] * common * (e[m]-mean_e) for m in range(nr)]
    q = norm2(projected)
    if q == 0:
        raise ArithmeticError("positive geometric projection underflowed; do not label it infeasible")
    if q < sys.float_info.min:
        raise ArithmeticError("positive projection energy is subnormal; relative-accuracy range exceeded, not geometric infeasibility")
    return projected, q, nr-1


@dataclass(frozen=True)
class Config:
    n: int = 8
    nr: int = 4
    total_power: float = 1.0
    radar_fraction: float = 0.5
    noise_power: float = 0.05
    channel_gain: float = 1.0  # g=|global complex per-element gain|^2
    channel_phase: float = 0.37
    user_u: float = 0.0
    target_u: float = 0.25
    qos_linear: float = 20.0

    def validate(self):
        if not isinstance(self.n, int) or not isinstance(self.nr, int):
            raise ValueError('n and nr must be integers')
        if not 1 <= self.nr < self.n:
            raise ValueError('both physical subarrays must be nonempty')
        values = [self.total_power, self.radar_fraction, self.noise_power,
                  self.channel_gain, self.channel_phase, self.user_u,
                  self.target_u, self.qos_linear]
        if not all(math.isfinite(x) for x in values):
            raise ValueError('parameters must be finite')
        if self.total_power <= 0 or self.noise_power <= 0:
            raise ValueError('strictly positive power and noise required')
        if not 0 <= self.radar_fraction <= 1 or self.channel_gain < 0:
            raise ValueError('invalid power fraction or channel gain')
        if not -1 <= self.user_u <= 1 or not -1 <= self.target_u <= 1:
            raise ValueError('u must equal a physical sin(theta) in [-1,1]')
        if self.qos_linear < 0:
            raise ValueError('qos must be nonnegative')


def recipe_metrics(cfg, name, wc, wr, shared=False):
    factors = [wc] if shared else [wc, wr]
    h = scale(steering(range(cfg.n), cfg.user_u),
              math.sqrt(cfg.channel_gain) * cmath.exp(1j * cfg.channel_phase))
    desired = abs(inner(h, wc)) ** 2
    radar_interference = 0.0 if shared else abs(inner(h, wr)) ** 2
    gamma = desired / (radar_interference + cfg.noise_power)
    r = covariance(factors)
    diagonal = [r[m][m].real for m in range(cfg.n)]
    return dict(name=name, feasible_recipe=True, wc=wc, wr=wr, covariance=r,
                radiated_power=math.fsum(diagonal), per_antenna_power=diagonal,
                desired=desired, multiuser_interference=0.0,
                radar_interference=radar_interference, noise=cfg.noise_power,
                sinr=gamma, qos_met=gamma >= cfg.qos_linear,
                qos_margin=gamma-cfg.qos_linear,
                qos_roundoff_band=64*math.ulp(max(1.0,gamma,cfg.qos_linear)),
                qos_status=('numerical_boundary' if abs(gamma-cfg.qos_linear) <=
                    64*math.ulp(max(1.0,gamma,cfg.qos_linear)) else
                    ('passes' if gamma>cfg.qos_linear else 'fails')),
                target_power=pattern(factors, cfg.target_u),
                target_comm_power=pattern([wc], cfg.target_u),
                target_independent_radar_power=(0.0 if shared else
                    pattern([wr], cfg.target_u)),
                # Diagnostics only; not an enforced constraint or source result.
                max_per_antenna=max(diagonal),
                equal_power_deviation=max(abs(x-cfg.total_power/cfg.n)
                                          for x in diagonal))


def evaluate(cfg=Config()):
    cfg.validate()
    n, nr, nc = cfg.n, cfg.nr, cfg.n-cfg.nr
    pr, pc = cfg.total_power*cfg.radar_fraction, cfg.total_power*(1-cfg.radar_fraction)
    wc = [0j]*nr + scale(steering(range(nr,n), cfg.user_u), math.sqrt(pc/nc))
    wr0 = scale(steering(range(nr), cfg.target_u), math.sqrt(pr/nr)) + [0j]*nc
    projected, q, nullity = stable_projection(nr, cfg.user_u, cfg.target_u,
                                             cfg.channel_gain)
    raw = scale(projected, math.sqrt(pr)) + [0j]*nc
    recipes = {
        'split_no_null': recipe_metrics(cfg,'split_no_null',wc,wr0),
        # Not fixed-resource competitor: this diagnostic discards power.
        'projection_raw_diagnostic': recipe_metrics(cfg,'projection_raw_diagnostic',wc,raw),
    }
    if pr == 0:
        recipes['split_null_fixed_power'] = recipe_metrics(cfg,'split_null_fixed_power',wc,[0j]*n)
        status = 'radar_power_zero_no_normalization_needed'
    elif q > 0:
        # Normalize the vector first. sqrt(pr/q) can overflow for positive
        # subnormal q, even though the final physical beam has finite power.
        pn = math.hypot(*(v for z in projected for v in (z.real,z.imag)))
        wr = [math.sqrt(pr)*(z/pn) for z in projected] + [0j]*nc
        recipes['split_null_fixed_power'] = recipe_metrics(cfg,'split_null_fixed_power',wc,wr)
        status = 'defined'
    else:
        recipes['split_null_fixed_power'] = dict(
            name='split_null_fixed_power', feasible_recipe=False,
            reason=('positive_radar_power_nullspace_empty' if nullity==0 else
                    'target_steering_projection_zero_not_architecture_infeasibility'))
        status = 'undefined_zero_projection'
    for aim, u in [('user',cfg.user_u),('target',cfg.target_u)]:
        w = scale(steering(range(n),u), math.sqrt(cfg.total_power/n))
        name = 'shared_aim_'+aim
        recipes[name] = recipe_metrics(cfg,name,w,[0j]*n,shared=True)
    # Analytic target identities remain meaningful below cancellation limits.
    # Preserve the directly summed complex-vector values as diagnostics.
    delta = wrapped_spatial_delta(cfg.target_u,cfg.user_u)
    rc = dirichlet_power(nc,delta)
    rn = dirichlet_power(n,delta)
    target_components = {
        'split_no_null': (pc*nc*rc,pr*nr),
        'projection_raw_diagnostic': (pc*nc*rc,pr*nr*q*q),
        'split_null_fixed_power': (pc*nc*rc,pr*nr*q),
        'shared_aim_user': (cfg.total_power*n*rn,0.0),
        'shared_aim_target': (cfg.total_power*n,0.0),
    }
    for name,r in recipes.items():
        if not r['feasible_recipe']: continue
        for key in ['target_power','target_comm_power','target_independent_radar_power']:
            r[key+'_direct'] = r[key]
        tc,tr = target_components[name]
        r.update(target_power=tc+tr,target_comm_power=tc,
                 target_independent_radar_power=tr,
                 target_value_method='analytic factor identity; direct complex-sum diagnostics retained')
    # Separate feasibility witness only at projection-zero and nonempty nullspace.
    # This is an explicitly different beam, never normalized projected zero.
    witness = None
    if q == 0 and nullity > 0 and pr > 0:
        local = [0j]*nr
        local[0] = math.sqrt(pr/2)
        local[1] = -math.sqrt(pr/2)*cmath.exp(1j*math.pi*cfg.user_u)
        witness = recipe_metrics(cfg,'boundary_nullspace_witness',wc,local+[0j]*nc)
    return dict(config=asdict(cfg), resources=dict(
        positions_lambda=[m/2 for m in range(n)], rf_chains=n,
        comm_streams=1, split_radar_streams=(1 if pr>0 else 0),
        shared_independent_radar_streams=0, aperture_lambda=(n-1)/2,
        radar_subarray_aperture_lambda=(nr-1)/2,
        comm_subarray_aperture_lambda=(nc-1)/2,
        radar_power_budget=pr, comm_power_budget=pc,
        enforced_power_constraint='total trace only; no equal-diagonal constraint'),
        projection=dict(q=q, status=status, nullity=nullity,
            amplification=(1/math.sqrt(q) if q>0 else None),
            raw_radar_power=pr*q,
            raw_total_power=pc+pr*q,
            intended_fixed_total=cfg.total_power),
        recipes=recipes, boundary_nullspace_witness=witness)


def jsonify(x):
    if isinstance(x,complex):
        return [x.real,x.imag]
    if isinstance(x,dict):
        return {k:jsonify(v) for k,v in x.items()}
    if isinstance(x,(list,tuple)):
        return [jsonify(v) for v in x]
    return x


def fixtures():
    cases = {
        'default_spatial_u_quarter': Config(),
        'aligned_zero_projection': Config(target_u=0),
        'orthogonal_four_element_subarrays': Config(target_u=.5),
        'near_aligned_positive': Config(target_u=1e-12),
        'near_aligned_negative': Config(target_u=-1e-12),
        'one_radar_element_no_nullspace': Config(nr=1,target_u=.5),
        'unequal_partition_six_two': Config(nr=6,target_u=.25),
        'no_independent_radar_power': Config(radar_fraction=0,target_u=0),
        'no_communication_power': Config(radar_fraction=1,target_u=.5),
        'zero_user_channel': Config(channel_gain=0),
        'opposite_endfire_alias': Config(user_u=-1,target_u=1),
        'qos_exact_boundary': Config(qos_linear=40,target_u=.5),
        'near_opposite_endfire_not_exact_alias': Config(user_u=-1,target_u=math.nextafter(1,0)),
        'near_aligned_nonzero_user': Config(user_u=.37,target_u=.37+1e-16),
    }
    return {'description':'Independent analytic teaching fixtures; not paper curves',
            'complex_encoding':'[real, imaginary]',
            'equality_tolerance_note':'Floating output may differ around exact QoS equality; compare with documented relative tolerance for UI only.',
            'cases':{name:jsonify(evaluate(cfg)) for name,cfg in cases.items()},
            'numerical_error_cases':[
                {'target_u':1e-155,'expected':'ArithmeticError: positive subnormal projection energy; not geometric infeasibility'},
                {'target_u':1e-200,'expected':'ArithmeticError: positive projection energy underflow; not geometric infeasibility'}]}


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--fixtures')
    args=parser.parse_args()
    text=json.dumps(fixtures(),ensure_ascii=False,indent=2,allow_nan=False)+'\n'
    if args.fixtures:
        with open(args.fixtures,'w') as f: f.write(text)
    else:
        print(text,end='')
