#!/usr/bin/env python3
"""Independent invariants/closed forms for reference.py. Stdlib only."""
import cmath
import math
import random
import unittest
from dataclasses import replace
from reference import (Config, covariance, dirichlet_power, evaluate, inner,
                       norm2, pattern, scale, stable_projection, steering)


class ReferenceTests(unittest.TestCase):
    def near(self, a, b, atol=2e-11, rtol=2e-11):
        self.assertLessEqual(abs(a-b), atol+rtol*max(abs(a),abs(b)), (a,b))

    def test_default_exact_closed_forms(self):
        d=evaluate(); r=d['recipes']; rho2=(2+math.sqrt(2))/8; q=1-rho2
        self.near(d['projection']['q'],q)
        self.near(r['split_no_null']['radar_interference'],2*rho2)
        self.near(r['split_no_null']['sinr'],2/(2*rho2+.05))
        self.near(r['split_null_fixed_power']['target_power'],2)
        self.near(r['split_null_fixed_power']['target_independent_radar_power'],2*q)
        self.near(r['projection_raw_diagnostic']['radiated_power'],.5+.5*q)
        self.near(r['projection_raw_diagnostic']['target_independent_radar_power'],2*q*q)

    def test_shared_data_only_no_radar_interference(self):
        for name in ['shared_aim_user','shared_aim_target']:
            r=evaluate()['recipes'][name]
            self.assertEqual(r['radar_interference'],0)
            self.assertEqual(r['target_independent_radar_power'],0)
            self.assertEqual(norm2(r['wr']),0)

    def test_no_universal_recipe_ranking(self):
        d=evaluate(Config(target_u=.5)); r=d['recipes']
        self.assertTrue(r['split_null_fixed_power']['qos_met'])
        self.assertTrue(r['shared_aim_user']['qos_met'])
        self.assertGreater(r['split_null_fixed_power']['target_power'],r['shared_aim_user']['target_power'])
        self.assertGreater(r['shared_aim_target']['target_power'],r['split_null_fixed_power']['target_power'])
        self.assertFalse(r['shared_aim_target']['qos_met'])
        aligned=evaluate(Config(target_u=0))['recipes']
        self.assertGreater(aligned['shared_aim_user']['target_power'],aligned['split_no_null']['target_power'])
        self.assertGreater(aligned['shared_aim_user']['sinr'],aligned['split_no_null']['sinr'])

    def test_exact_alignment_not_epsilon_normalized(self):
        d=evaluate(Config(target_u=0))
        self.assertEqual(d['projection']['q'],0)
        self.assertIsNone(d['projection']['amplification'])
        self.assertFalse(d['recipes']['split_null_fixed_power']['feasible_recipe'])
        self.assertEqual(d['projection']['nullity'],3)
        w=d['boundary_nullspace_witness']
        self.near(w['radiated_power'],1)
        self.near(w['radar_interference'],0)
        self.near(w['target_independent_radar_power'],0)
        self.near(w['target_power'],2)

    def test_one_radar_element_genuine_positive_power_infeasibility(self):
        for u in [-.73,0,.5,1]:
            d=evaluate(Config(nr=1,target_u=u))
            self.assertEqual(d['projection']['nullity'],0)
            self.assertFalse(d['recipes']['split_null_fixed_power']['feasible_recipe'])
            self.assertEqual(d['recipes']['split_null_fixed_power']['reason'],
                             'positive_radar_power_nullspace_empty')
            self.assertIsNone(d['boundary_nullspace_witness'])

    def test_near_alignment_asymptotic_stable_relative_accuracy(self):
        for nr in [2,3,4,7]:
            for delta in [1e-6,1e-9,1e-12,-1e-12]:
                p,q,_=stable_projection(nr,0,delta)
                predicted=(math.pi*delta)**2*(nr*nr-1)/12
                self.assertGreater(q,0)
                self.assertLess(abs(q/predicted-1),2e-10)
                self.assertLessEqual(abs(inner(steering(range(nr),0),p)),
                                     5e-15*math.sqrt(nr*norm2(p)))

    def test_near_alignment_normalization_does_not_restore_steering(self):
        d=evaluate(Config(target_u=1e-12)); q=d['projection']['q']
        r=d['recipes']['split_null_fixed_power']
        self.near(norm2(r['wr']),.5)
        self.assertLess(abs(r['target_independent_radar_power']/(2*q)-1),2e-4)
        self.assertGreater(d['projection']['amplification'],1e11)
        self.near(r['max_per_antenna'],.225)

    def test_orthogonal_projection_retains_all_power(self):
        d=evaluate(Config(target_u=.5)); r=d['recipes']
        self.near(d['projection']['q'],1)
        self.near(r['projection_raw_diagnostic']['radiated_power'],1)
        self.near(r['split_no_null']['radar_interference'],0)
        self.near(r['split_null_fixed_power']['target_independent_radar_power'],2)

    def test_spatial_alias_is_exact_zero_projection(self):
        d=evaluate(Config(user_u=-1,target_u=1))
        self.assertEqual(d['projection']['q'],0)
        self.assertFalse(d['recipes']['split_null_fixed_power']['feasible_recipe'])
        self.near(d['boundary_nullspace_witness']['target_independent_radar_power'],0)

    def test_zero_radar_budget_needs_no_normalization(self):
        d=evaluate(Config(radar_fraction=0,target_u=0))
        self.assertTrue(d['recipes']['split_null_fixed_power']['feasible_recipe'])
        self.near(d['recipes']['split_null_fixed_power']['radiated_power'],1)
        self.assertEqual(d['projection']['status'],'radar_power_zero_no_normalization_needed')

    def test_zero_communication_budget_is_zero_sinr(self):
        d=evaluate(Config(radar_fraction=1,target_u=.5))
        for name in ['split_no_null','split_null_fixed_power']:
            self.assertEqual(d['recipes'][name]['sinr'],0)
            self.assertFalse(d['recipes'][name]['qos_met'])

    def test_zero_channel_does_not_impose_spurious_null(self):
        d=evaluate(Config(channel_gain=0))
        self.assertEqual(d['projection']['nullity'],4)
        self.assertEqual(d['projection']['q'],1)
        for r in d['recipes'].values():
            self.assertEqual(r['desired'],0)
            self.assertEqual(r['radar_interference'],0)

    def test_same_per_element_channel_no_array_renormalization(self):
        for n,nr in [(4,2),(8,4),(12,6)]:
            d=evaluate(Config(n=n,nr=nr))['recipes']
            self.near(d['shared_aim_user']['desired'],n)
            self.near(d['split_no_null']['desired'],.5*(n-nr))

    def test_actual_physical_positions_and_apertures(self):
        d=evaluate(Config(nr=6))['resources']
        self.assertEqual(d['positions_lambda'],[0,.5,1,1.5,2,2.5,3,3.5])
        self.assertEqual(d['aperture_lambda'],3.5)
        self.assertEqual(d['radar_subarray_aperture_lambda'],2.5)
        self.assertEqual(d['comm_subarray_aperture_lambda'],.5)
        self.assertEqual(d['rf_chains'],8)

    def test_global_complex_channel_phase_does_not_change_power(self):
        a=evaluate(Config(channel_phase=.37))['recipes']
        b=evaluate(Config(channel_phase=-2.4))['recipes']
        for key in a:
            for metric in ['desired','radar_interference','sinr']:
                self.near(a[key][metric],b[key][metric])

    def test_no_per_antenna_equality_claim(self):
        d=evaluate()['recipes']
        self.near(d['shared_aim_user']['equal_power_deviation'],0)
        self.assertGreater(d['split_null_fixed_power']['equal_power_deviation'],.07)
        self.near(d['split_null_fixed_power']['radiated_power'],1)

    def test_covariance_block_structure_and_psd(self):
        rng=random.Random(114)
        for name,r in evaluate()['recipes'].items():
            R=r['covariance']
            for i in range(8):
                for j in range(8):
                    self.near(R[i][j],R[j][i].conjugate())
                    if name.startswith('split') or name.startswith('projection'):
                        if (i<4) != (j<4): self.assertEqual(R[i][j],0)
            for _ in range(20):
                z=[complex(rng.gauss(0,1),rng.gauss(0,1)) for _ in range(8)]
                rz=[sum(R[i][j]*z[j] for j in range(8)) for i in range(8)]
                self.assertGreaterEqual(inner(z,rz).real,-1e-12)
                self.near(inner(z,rz).imag,0)

    def test_trace_and_fixed_common_plot_bound(self):
        for r in evaluate()['recipes'].values():
            self.near(r['radiated_power'],norm2(r['wc'])+norm2(r['wr']))
            for u in [-1,-.73,-.2,0,.17,.61,1]:
                p=pattern([r['wc'],r['wr']],u)
                self.assertGreaterEqual(p,0)
                self.assertLessEqual(p,8*r['radiated_power']+1e-12)

    def test_projection_matches_direct_complex_matrix_away_from_alignment(self):
        for nr in [2,4,7]:
            for uu,ut in [(.12,.25),(-.6,.43),(0,.5)]:
                p,q,_=stable_projection(nr,uu,ut)
                bu=scale(steering(range(nr),uu),1/math.sqrt(nr))
                bt=scale(steering(range(nr),ut),1/math.sqrt(nr))
                direct=[t-u*inner(bu,bt) for u,t in zip(bu,bt)]
                for x,y in zip(p,direct): self.near(x,y)
                self.near(q,norm2(direct))

    def test_600_seeded_states_against_independent_closed_forms(self):
        rng=random.Random(20261011)
        for _ in range(600):
            cfg=Config(nr=rng.randrange(2,8),target_u=rng.uniform(-1,1),
                       user_u=rng.uniform(-1,1),radar_fraction=rng.uniform(.01,.99),
                       channel_gain=rng.uniform(.1,4),noise_power=rng.uniform(.005,.2),
                       total_power=rng.uniform(.1,2))
            d=evaluate(cfg); r=d['recipes']; nc=cfg.n-cfg.nr
            pr=cfg.total_power*cfg.radar_fraction; pc=cfg.total_power-pr
            rr=dirichlet_power(cfg.nr,cfg.target_u-cfg.user_u)
            rc=dirichlet_power(nc,cfg.target_u-cfg.user_u)
            rn=dirichlet_power(cfg.n,cfg.target_u-cfg.user_u)
            q=1-rr
            self.near(d['projection']['q'],q)
            D=cfg.channel_gain*pc*nc
            self.near(r['split_no_null']['desired'],D)
            self.near(r['split_no_null']['radar_interference'],cfg.channel_gain*pr*cfg.nr*rr)
            self.near(r['split_no_null']['target_power'],pr*cfg.nr+pc*nc*rc)
            self.near(r['projection_raw_diagnostic']['radiated_power'],pc+pr*q)
            self.near(r['split_null_fixed_power']['radiated_power'],cfg.total_power)
            self.near(r['split_null_fixed_power']['target_power'],pr*cfg.nr*q+pc*nc*rc)
            self.near(r['split_null_fixed_power']['sinr'],D/cfg.noise_power)
            self.near(r['shared_aim_user']['target_power'],cfg.total_power*cfg.n*rn)
            self.near(r['shared_aim_target']['sinr'],cfg.channel_gain*cfg.total_power*cfg.n*rn/cfg.noise_power)

    def test_linear_power_scaling_and_noise(self):
        c=Config(); a=evaluate(c)['recipes']; b=evaluate(replace(c,total_power=2))['recipes']
        for name in a:
            self.near(b[name]['desired'],2*a[name]['desired'])
            self.near(b[name]['radar_interference'],2*a[name]['radar_interference'])
            self.near(b[name]['target_power'],2*a[name]['target_power'])
            # With radar interference the SINR itself need not double.
            if name!='split_no_null': self.near(b[name]['sinr'],2*a[name]['sinr'])

    def test_resource_normalization_arithmetic_is_conditional(self):
        # Literal printed PR/N, NOT a claim about what authors simulated.
        N,NR,PR,PC=20,14,.5,.5
        self.near(NR*PR/N,.35)
        self.near(NR*PR/N+PC,.85)
        self.near(NR*(PR/NR)+PC,1)

    def test_threshold_boundary_distinguished_from_clear_pass_fail(self):
        d=evaluate(Config(qos_linear=40,target_u=.5))['recipes']
        self.assertEqual(d['split_null_fixed_power']['qos_status'],'numerical_boundary')
        self.assertEqual(d['shared_aim_user']['qos_status'],'passes')
        self.assertEqual(d['shared_aim_target']['qos_status'],'fails')

    def test_positive_projection_underflow_is_numerical_error_not_infeasible(self):
        with self.assertRaises(ArithmeticError):
            stable_projection(4,0,1e-200)

    def test_near_opposite_endfire_is_not_exact_alias(self):
        u=math.nextafter(1,0)
        d=evaluate(Config(user_u=-1,target_u=u))
        q=d['projection']['q']
        expected=math.pi**2*(1-u)**2*15/12
        self.assertGreater(q,0)
        self.assertLess(abs(q/expected-1),1e-13)
        self.assertTrue(d['recipes']['split_null_fixed_power']['feasible_recipe'])

    def test_subnormal_q_is_explicit_numerical_range_error(self):
        for u in [1e-155,1e-160]:
            with self.assertRaises(ArithmeticError): evaluate(Config(target_u=u))
        d=evaluate(Config(target_u=1e-154))
        self.near(d['recipes']['split_null_fixed_power']['radiated_power'],1)

    def test_tiny_target_value_has_analytic_identity_and_direct_diagnostic(self):
        d=evaluate(Config(user_u=.37,target_u=.37+1e-16))
        r=d['recipes']['split_null_fixed_power'];q=d['projection']['q']
        self.assertEqual(r['target_independent_radar_power'],2*q)
        self.assertTrue(math.isfinite(r['target_independent_radar_power_direct']))

    def test_invalid_configuration_rejected(self):
        for args in [dict(nr=0),dict(nr=8),dict(noise_power=0),dict(total_power=0),
                     dict(radar_fraction=-.1),dict(target_u=1.01),dict(channel_gain=-1),
                     dict(qos_linear=-1),dict(channel_phase=float('nan'))]:
            with self.assertRaises(ValueError): evaluate(Config(**args))

if __name__=='__main__':
    unittest.main(verbosity=2)
