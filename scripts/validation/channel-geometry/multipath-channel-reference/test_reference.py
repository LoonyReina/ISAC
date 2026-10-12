"""Executable acceptance tests; no NumPy, no code or fixtures from the site."""
import inspect
import math
import random
import unittest
from dataclasses import replace
import reference as r

class ReferenceTests(unittest.TestCase):
    def assertComplexClose(self, a, b, tol=3e-13):
        self.assertLessEqual(abs(a-b), tol, (a, b, abs(a-b)))

    def test_geometry_length_angles_visibility_sweep(self):
        for i in range(591):
            g = r.geometry(0.1+i/100)
            self.assertAlmostEqual(g.reflected_length, g.broken_length, places=13)
            self.assertAlmostEqual(g.incidence_angle, g.reflection_angle, places=14)
            self.assertGreater(g.reflected_length, g.direct_length)
            self.assertTrue(g.visible)
            self.assertTrue(r.WALL[0] < g.reflection[0] < r.WALL[1])
            # Interior of both physical broken-ray segments lies above the wall.
            for p in (g.transmitter, g.terminal):
                for w in (0.01, 0.5, 0.99):
                    y = w*p[1] + (1-w)*g.reflection[1]
                    self.assertGreater(y, 0)

    def test_invalid_geometry_and_finite_wall(self):
        for h in (0, -1, 6.001, math.nan, math.inf, True):
            with self.assertRaises(ValueError): r.geometry(h)
        with self.assertRaises(ValueError): r.geometry(4, (3, 5))
        self.assertTrue(r.geometry(4, (2, 3)).visible)  # endpoint idealization allowed
        for kwargs in ({'rho':1.01}, {'b':-0.1}, {'psi':math.inf}, {'common_phase':1e20}):
            with self.assertRaises(ValueError): r.Scene(**kwargs)

    def test_one_way_units_and_cp_absolute_support(self):
        g = r.geometry(6)
        self.assertEqual(g.reflected_length, 10.0)
        self.assertAlmostEqual(g.reflected_delay*r.C, 10.0, places=14)
        self.assertLess(g.reflected_delay, r.CP)
        self.assertAlmostEqual(r.CP*1e9, 125)
        self.assertAlmostEqual(r.FIRST_NULL_LENGTH, 1.1710642890625, places=14)
        self.assertAlmostEqual(r.ALIAS_LENGTH, 149.896229, places=12)

    def test_fixed_pilots_equal_energy(self):
        X = r.pilots()
        self.assertEqual(len(X), 128)
        for x in X: self.assertAlmostEqual(abs(x)**2, 1/128, places=17)
        self.assertAlmostEqual(sum(abs(x)**2 for x in X), 1, places=14)
        self.assertEqual(r.FREQUENCIES[0], -128e6)
        self.assertEqual(r.FREQUENCIES[-1], 126e6)

    def test_idft_parseval_inverse_and_cp_copy(self):
        q = r.useful_samples()
        self.assertAlmostEqual(math.fsum(abs(z)**2 for z in q), 1, places=14)
        for k, expected in zip(r.BINS, r.pilots()):
            # Direct inverse, independent of the implementation's phasor helper.
            actual = sum(q[n]*complex(math.cos(-math.tau*k*n/r.N), math.sin(-math.tau*k*n/r.N))
                         for n in range(r.N))/math.sqrt(r.N)
            self.assertComplexClose(actual, expected, 3e-14)
        for j in range(-32, 0):
            continuous = r.normalized_waveform(j/r.N)/math.sqrt(r.N)
            self.assertComplexClose(continuous, q[j], 2e-14)

    def test_continuous_cp_energy_independent_quadrature(self):
        # Composite trapezoid with Richardson cancellation of h^2 error.
        def quadrature(count):
            lo, hi = -0.25, 0
            step = (hi-lo)/count
            values = [abs(r.normalized_waveform(lo+i*step))**2 for i in range(count+1)]
            return step*(math.fsum(values)-0.5*values[0]-0.5*values[-1])
        coarse, fine = quadrature(4096), quadrature(8192)
        richardson = (4*fine-coarse)/3
        analytic = r.interval_energy(-0.25, 0)
        self.assertAlmostEqual(analytic, richardson, places=9)
        self.assertAlmostEqual(r.interval_energy(0, 1), 1, places=14)
        ledger = r.resource_ledger()
        self.assertGreater(abs(ledger['continuous_cp_energy']-ledger['discrete_cp_sample_energy']), 1e-5)
        self.assertGreater(abs(ledger['continuous_cp_energy']-0.25), 1e-3)

    def test_half_integer_grid_is_antiperiodic_not_plain_cp(self):
        # Independent demonstration of the candidate correction.
        q = 0.117
        X = r.pilots()
        def half_wave(t):
            return sum(x*complex(math.cos(math.tau*(k-63.5)*t), math.sin(math.tau*(k-63.5)*t))
                       for k, x in enumerate(X))
        self.assertComplexClose(half_wave(q+1), -half_wave(q), 5e-13)
        self.assertComplexClose(r.normalized_waveform(q+1), r.normalized_waveform(q), 5e-13)

    def test_carrier_phase_present_once(self):
        s = r.Scene(h=3.17, b=0.81, rho=0.76, psi=-0.83, common_phase=0.24)
        inp, truth = r.generate_scene(s)
        g = truth['geometry']
        for k, f in enumerate(r.FREQUENCIES):
            # Independent RF total frequency computation, not split phase convention.
            A = complex(math.cos(s.common_phase), math.sin(s.common_phase))
            gamma = s.rho*complex(math.cos(s.psi), math.sin(s.psi))
            a = A*s.b/g.direct_length*complex(math.cos(-math.tau*(r.FC+f)*g.direct_delay), math.sin(-math.tau*(r.FC+f)*g.direct_delay))
            b = A*gamma/g.reflected_length*complex(math.cos(-math.tau*(r.FC+f)*g.reflected_delay), math.sin(-math.tau*(r.FC+f)*g.reflected_delay))
            self.assertComplexClose(inp['Y'][k], inp['X'][k]*(a+b), 5e-15)

    def test_receiver_uses_actual_sum_only(self):
        inp, truth = r.generate_scene()
        self.assertEqual(set(inp), {'Y','X','f','candidates'})
        self.assertEqual(set(inspect.signature(r.receive).parameters), set(inp))
        for y, a, b in zip(inp['Y'], *truth['contributions']): self.assertEqual(y, a+b)
        result = r.receive(**inp)
        altered = dict(inp, Y=tuple(0j for _ in inp['Y']))
        self.assertIsNone(r.receive(**altered)['estimate'])
        self.assertIsNotNone(result['estimate'])
        self.assertNotIn('geometry', inspect.getsource(r.matched_sum).split('def matched_sum')[1].split('"""')[-1])

    def test_analytic_dirichlet_vs_explicit_complex_sum(self):
        rng = random.Random(827)
        offsets = [0, r.FIRST_NULL_LENGTH, -r.FIRST_NULL_LENGTH, r.ALIAS_LENGTH,
                   2*r.ALIAS_LENGTH, r.ALIAS_LENGTH+1e-8, 1e-10]
        offsets += [rng.uniform(-100,100) for _ in range(100)]
        for u in offsets:
            actual = sum(complex(math.cos(math.tau*f*u/r.C), math.sin(math.tau*f*u/r.C))
                         for f in r.FREQUENCIES)/r.N
            self.assertComplexClose(actual, r.dirichlet(u), 6e-14)

    def test_response_samples_vs_analytic_all_candidates(self):
        for s in (r.Scene(), r.Scene(h=0.1, psi=1.4), r.Scene(h=6, b=0), r.Scene(h=1, rho=1, psi=-2.2)):
            inp, truth = r.generate_scene(s)
            z = r.receive(**inp)['z']
            g = truth['geometry']
            expected = r.analytic_response(inp['candidates'], (g.direct_length,g.reflected_length), truth['coefficients'])
            for a,b in zip(z,expected): self.assertComplexClose(a,b,4e-15)

    def test_frozen_fixture_consistency(self):
        import json
        from pathlib import Path
        fixtures=json.loads(Path(__file__).with_name('fixtures.json').read_text())
        self.assertEqual(fixtures['grid']['candidate_m'],list(r.CANDIDATES))
        self.assertEqual(fixtures['grid']['frequency_hz'],list(r.FREQUENCIES))
        for row in fixtures['scenes']:
            inp,t=r.generate_scene(r.Scene(**row['scene']))
            for y,pair in zip(inp['Y'],row['Y']):self.assertComplexClose(y,complex(*pair),1e-16)
            result=r.receive(**inp)
            self.assertEqual(result['status'],row['receiver_status'])
            self.assertEqual(result['estimate'],row['estimate'])
            for p in row['response_probes']:
                self.assertComplexClose(result['z'][p['index']],complex(*p['z']),1e-16)

    def test_balanced_physical_overlap_cancels_at_midpoint(self):
        g=r.geometry(.1)
        phase=math.remainder(math.tau*(r.FC-r.DF/2)*(g.reflected_delay-g.direct_delay)+math.pi,math.tau)
        scene=r.Scene(h=.1,b=g.direct_length/g.reflected_length,rho=1,psi=phase)
        inp,t=r.generate_scene(scene)
        d=(g.direct_length+g.reflected_length)/2
        z=r.matched_sum(**dict(inp,candidates=(d,)))[0]
        self.assertLess(abs(z),3e-14)
        diag=r.scene_diagnostics(scene,g,t['coefficients'],inp['Y'])
        self.assertLess(diag['received_useful_energy'],diag['incoherent_path_energy']/100)
        # Different finite delays cannot cancel the entire frequency vector.
        self.assertGreater(diag['received_useful_energy'],0)

    def test_subnormal_log_condition_preserves_precision(self):
        for q in (1e-155,1e-160,1e-200):
            g=r.gram_from_separation_cycles(q)
            expected=math.log(12/(math.pi**2*(r.N*r.N-1)))-2*math.log(q)
            self.assertAlmostEqual(g['log_condition'],expected,delta=2e-13)
            self.assertFalse(g['exactly_singular'])

    def test_no_reflection_recovers_direct_path(self):
        inp, truth = r.generate_scene(r.Scene(rho=0))
        g = truth['geometry']
        probe = r.matched_sum(**dict(inp,candidates=(g.direct_length,)))
        self.assertComplexClose(probe[0], truth['coefficients'][0], 1e-15)
        result = r.receive(**inp)
        self.assertLessEqual(abs(result['estimate']['apparent_distance_m']-g.direct_length),0.005)
        self.assertTrue(all(z==0 for z in truth['contributions'][1]))

    def test_reflection_only_stays_reflected(self):
        inp, truth = r.generate_scene(r.Scene(b=0))
        g = truth['geometry']
        result = r.receive(**inp)
        self.assertLessEqual(abs(result['estimate']['apparent_distance_m']-g.reflected_length),0.005)
        self.assertGreater(result['estimate']['apparent_distance_m'],g.direct_length)
        self.assertTrue(all(z==0 for z in truth['contributions'][0]))

    def test_null_scene_has_no_apparent_distance(self):
        inp, _ = r.generate_scene(r.Scene(b=0,rho=0))
        result = r.receive(**inp)
        self.assertEqual(result['power'],tuple(0.0 for _ in r.CANDIDATES))
        self.assertIsNone(result['estimate'])
        self.assertEqual(result['status'],'no_response')

    def test_common_phase_rotates_complex_not_power(self):
        inp0, _ = r.generate_scene(r.Scene(common_phase=0))
        inp1, _ = r.generate_scene(r.Scene(common_phase=0.71))
        z0,z1 = r.receive(**inp0)['z'],r.receive(**inp1)['z']
        rotation = complex(math.cos(.71),math.sin(.71))
        for a,b in zip(z0,z1):
            self.assertComplexClose(b,rotation*a,8e-16)
            self.assertAlmostEqual(abs(a)**2,abs(b)**2,places=15)

    def test_coherent_energy_cross_term_and_not_power_sum(self):
        results=[]
        for psi in (0,math.pi):
            s=r.Scene(h=.1,rho=1,psi=psi)
            inp,t=r.generate_scene(s)
            diag=r.scene_diagnostics(s,t['geometry'],t['coefficients'],inp['Y'])
            self.assertAlmostEqual(diag['received_useful_energy'],diag['analytic_received_useful_energy'],places=14)
            self.assertGreater(abs(diag['coherent_energy_cross_term']),.001)
            results.append(diag)
        self.assertAlmostEqual(results[0]['incoherent_path_energy'],results[1]['incoherent_path_energy'],places=14)
        self.assertAlmostEqual(results[0]['coherent_energy_cross_term'],-results[1]['coherent_energy_cross_term'],places=14)
        self.assertGreater(abs(results[0]['received_useful_energy']-results[1]['received_useful_energy']),.005)

    def test_coincident_taps_exact_cancel_or_combine(self):
        for gains in ((.2+.1j,-.2-.1j),(.2+.1j,.3-.4j)):
            Y,_=r.synthesize_taps((6,6),gains)
            combined,_=r.synthesize_taps((6,),(sum(gains),))
            for a,b in zip(Y,combined):self.assertComplexClose(a,b,3e-17)
            if sum(gains)==0:self.assertTrue(all(y==0 for y in Y))
        self.assertTrue(r.gram_from_separation_cycles(0)['exactly_singular'])

    def test_integer_alias_complex_and_power_periodicity(self):
        for u in (0,.72,4.8,13.6):
            self.assertComplexClose(r.dirichlet(u),r.dirichlet(u+r.ALIAS_LENGTH),8e-14)
        Y,_=r.synthesize_taps((6,),(1+.3j,))
        Ya,_=r.synthesize_taps((6+r.ALIAS_LENGTH,),(1+.3j,))
        for a,b in zip(Y,Ya):self.assertComplexClose(a,b,1e-14)
        for q in (-2,-1,0,1,2): self.assertTrue(r.gram_from_separation_cycles(q)['exactly_singular'])

    def test_half_grid_alias_phase_would_flip(self):
        for tau in (0,11e-9):
            for k in (0,17,127):
                f=(k-63.5)*r.DF
                a=complex(math.cos(-math.tau*f*tau),math.sin(-math.tau*f*tau))
                b=complex(math.cos(-math.tau*f*(tau+r.TU)),math.sin(-math.tau*f*(tau+r.TU)))
                self.assertComplexClose(a,-b,8e-14)

    def test_first_null_and_orthogonal_gram(self):
        self.assertLess(abs(r.dirichlet(r.FIRST_NULL_LENGTH)),1e-15)
        g=r.gram_from_separation_cycles(1/r.N)
        self.assertAlmostEqual(g['coherence'],0,places=14)
        self.assertAlmostEqual(g['condition'],1,places=14)

    def test_gram_independent_templates(self):
        for h in (.1,1,4,6):
            g=r.geometry(h)
            s0=[complex(math.cos(-math.tau*f*g.direct_delay),math.sin(-math.tau*f*g.direct_delay))/math.sqrt(r.N) for f in r.FREQUENCIES]
            s1=[complex(math.cos(-math.tau*f*g.reflected_delay),math.sin(-math.tau*f*g.reflected_delay))/math.sqrt(r.N) for f in r.FREQUENCIES]
            cross=sum(a.conjugate()*b for a,b in zip(s0,s1))
            gram=r.gram_at_delays(g.direct_delay,g.reflected_delay)
            self.assertComplexClose(cross,gram['off_diagonal'],2e-15)
            self.assertAlmostEqual(abs(cross),gram['coherence'],places=14)
            self.assertAlmostEqual(gram['condition'],(1+abs(cross))/(1-abs(cross)),delta=2e-10)

    def test_near_singular_is_not_exact_singularity(self):
        for q in (1e-8,1e-12,1e-16,math.nextafter(1,2)-1):
            g=r.gram_from_separation_cycles(q)
            self.assertFalse(g['exactly_singular'])
            self.assertGreater(g['lambda_min'],0)
            self.assertTrue(math.isfinite(g['condition']))
            asymptotic=12/(math.pi**2*(r.N**2-1)*q*q)
            self.assertLess(abs(g['condition']/asymptotic-1),1e-10)
        g=r.gram_from_separation_cycles(1e-200)
        self.assertFalse(g['exactly_singular'])
        self.assertIsNone(g['condition'])
        self.assertTrue(math.isfinite(g['log_condition']))
        self.assertEqual(g['numeric_status'],'binary64_range_limit')

    def test_fixed_bound_covers_all_allowed_controls(self):
        # Analytic triangle bound verified over heights and control extremes;
        # representative actual responses add an implementation check.
        for i in range(591):
            h=.1+i/100
            g=r.geometry(h)
            self.assertLessEqual((1/g.direct_length+1/g.reflected_length)**2,r.POWER_BOUND)
        for s in (r.Scene(h=.1,rho=1,psi=2.3),r.Scene(h=2,rho=1,psi=-1.7),r.Scene(h=6,rho=1)):
            inp,_=r.generate_scene(s)
            self.assertLessEqual(max(r.receive(**inp)['power']),r.POWER_BOUND)
        self.assertGreater(r.PLOT_POWER_MAX,r.POWER_BOUND)

    def test_resources_constant_no_truth_grid_insertion(self):
        ledger=dict(r.resource_ledger())
        for s in (r.Scene(),r.Scene(h=.1,b=.1,rho=1,psi=math.pi),r.Scene(h=6,b=0,rho=0)):
            inp,t=r.generate_scene(s)
            self.assertEqual(inp['candidates'],r.CANDIDATES)
            self.assertEqual(inp['X'],r.pilots())
            self.assertEqual(inp['f'],r.FREQUENCIES)
            self.assertEqual(r.resource_ledger(),ledger)
        inp,t=r.generate_scene()
        self.assertNotIn(t['geometry'].direct_length,r.CANDIDATES)
        with self.assertRaises(ValueError):r.receive(**dict(inp,candidates=(1,2,3)))

    def test_single_maximum_tie_and_null_rules(self):
        self.assertEqual(r.single_maximum((1,2,3),(1,1,0))['apparent_distance_m'],1)
        self.assertEqual(r.single_maximum((1,2,3),(1,1,0))['exact_tie_count'],2)
        self.assertIsNone(r.single_maximum((1,2),(0,0)))

    def test_fractional_delay_waveform_dft_reproduces_Y(self):
        inp,t=r.generate_scene(r.Scene(h=.1,psi=1.2))
        g=t['geometry']
        # Periodic continuous waveform, delayed by physical fractional delays.
        time_samples=[]
        for n in range(r.N):
            value=sum(a*r.normalized_waveform(n/r.N-tau/r.TU)
                      for a,tau in zip(t['coefficients'],(g.direct_delay,g.reflected_delay)))/math.sqrt(r.N)
            time_samples.append(value)
        for k,y in zip(r.BINS,inp['Y']):
            fft=sum(v*complex(math.cos(-math.tau*k*n/r.N),math.sin(-math.tau*k*n/r.N))
                    for n,v in enumerate(time_samples))/math.sqrt(r.N)
            self.assertComplexClose(fft,y,4e-15)

if __name__=='__main__': unittest.main(verbosity=2)
