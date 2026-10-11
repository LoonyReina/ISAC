"""Standard-library regression tests; dense raw covariance is independent of core LRT."""
import cmath
import inspect
import math
import random
import unittest

import detection_reference as ref


def dense_complex_gaussian_log_density(y, covariance):
    """Independent dense Hermitian Cholesky; normalizing -n log(pi) omitted."""
    n = len(y)
    lower = [[0j] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            value = covariance[i][j] - sum(lower[i][k] * lower[j][k].conjugate() for k in range(j))
            if i == j:
                if abs(value.imag) > 1e-10 or value.real <= 0.0:
                    raise AssertionError("not Hermitian positive definite")
                lower[i][j] = complex(math.sqrt(value.real))
            else:
                lower[i][j] = value / lower[j][j]
    solved = [0j] * n
    for i in range(n):
        solved[i] = (y[i] - sum(lower[i][j] * solved[j] for j in range(i))) / lower[i][i]
    logdet = 2.0 * sum(math.log(lower[i][i].real) for i in range(n))
    return -logdet - sum(abs(x) ** 2 for x in solved)


def raw_dense_lr(observations, s, noise_power, model):
    length = len(s)
    n = 2 * length
    q = model.rho * noise_power / sum(abs(w) ** 2 for w in s)
    c0 = [[complex(noise_power if i == j else 0.0) for j in range(n)] for i in range(n)]
    c1 = [[c0[i][j] + q * (1.0 if i // length == j // length else model.kappa) * s[i % length] * s[j % length].conjugate() for j in range(n)] for i in range(n)]
    y = list(observations[0]) + list(observations[1])
    return dense_complex_gaussian_log_density(y, c1) - dense_complex_gaussian_log_density(y, c0)


class TestLRT(unittest.TestCase):
    def test_known_counterexample_and_threshold(self):
        model = ref.Model(3, 0.75)
        zplus = (math.sqrt(2), math.sqrt(2))
        zminus = (math.sqrt(2), -math.sqrt(2))
        self.assertEqual(ref.local_energies(zplus), ref.local_energies(zminus))
        self.assertAlmostEqual(ref.quadratic_eigen(zplus, model), 3.36, places=14)
        self.assertAlmostEqual(ref.quadratic_eigen(zminus, model), 12 / 7, places=14)
        cal = ref.calibrated_detector(model, 0.05)
        self.assertAlmostEqual(cal.joint_threshold, 3.1035385065084915, places=13)
        self.assertAlmostEqual(cal.joint_pd, 0.6433127617254235, places=13)
        self.assertAlmostEqual(cal.energy_threshold, 4.743864518390579, places=13)
        self.assertAlmostEqual(cal.energy_sum_pd, 0.6243193955523237, places=13)
        self.assertTrue(ref.decide_joint(zplus, cal))
        self.assertFalse(ref.decide_joint(zminus, cal))
        self.assertFalse(ref.decide_energy_sum(zplus, cal))
        self.assertFalse(ref.decide_energy_sum(zminus, cal))

    def test_matrix_and_eigen_grid(self):
        rng = random.Random(314159)
        for rho in (1e-10, 1e-6, 0.1, 3.0, 1e4):
            for k in (0.0, 1e-14, 0.25, 0.75, math.nextafter(1.0, 0.0), 1.0):
                model = ref.Model(rho, k)
                for _ in range(30):
                    z = [complex(rng.gauss(0, 2), rng.gauss(0, 2)) for _ in range(2)]
                    a, b = ref.quadratic_eigen(z, model), ref.quadratic_matrix(z, model)
                    self.assertLessEqual(abs(a - b), 2e-14 * sum(model.null_weights) * ref.energy_sum(z))

    def test_independent_energy_equivalence(self):
        rng = random.Random(271828)
        for rho in (1e-10, 0.1, 3, 1e4):
            model = ref.Model(rho, 0)
            cal = ref.calibrated_detector(model, 0.05)
            a = rho / (1 + rho)
            self.assertAlmostEqual(cal.joint_threshold / a, cal.energy_threshold, places=12)
            self.assertAlmostEqual(cal.joint_pd, cal.energy_sum_pd, places=14)
            for _ in range(200):
                z = [complex(rng.gauss(0, 3), rng.gauss(0, 3)) for _ in range(2)]
                self.assertAlmostEqual(ref.quadratic_eigen(z, model), a * ref.energy_sum(z), delta=1e-13 * max(1, a * ref.energy_sum(z)))
                self.assertEqual(ref.decide_joint(z, cal), ref.decide_energy_sum(z, cal))

    def test_full_dense_raw_likelihood_and_residual(self):
        rng = random.Random(123456)
        s = (0.3 + 0.7j, -0.4 + 0.2j, 0.6 - 0.1j)
        sigma2 = 0.7
        e = sum(abs(w) ** 2 for w in s)
        arbitrary = (0.2 - 0.1j, 0.3 + 0.8j, -0.4 + 0.2j)
        proj = sum(w.conjugate() * x for w, x in zip(s, arbitrary)) / e
        residual = tuple(x - proj * w for x, w in zip(arbitrary, s))
        self.assertLess(abs(sum(w.conjugate() * x for w, x in zip(s, residual))), 1e-15)
        for k in (0, 0.3, 1):
            model = ref.Model(2.3, k)
            y = tuple(tuple(complex(rng.gauss(0, 1), rng.gauss(0, 1)) for _ in s) for _ in range(2))
            expected = raw_dense_lr(y, s, sigma2, model)
            actual = ref.raw_log_likelihood_ratio(y, s, sigma2, model)
            self.assertAlmostEqual(actual, expected, places=12)
            changed = (tuple(a + b for a, b in zip(y[0], residual)), tuple(a - 2j * b for a, b in zip(y[1], residual)))
            self.assertAlmostEqual(raw_dense_lr(changed, s, sigma2, model), expected, places=12)
            self.assertAlmostEqual(ref.raw_log_likelihood_ratio(changed, s, sigma2, model), actual, places=12)

    def test_unknown_noise_mixture_residual_counterexample(self):
        # An audit-only counterexample: sigma² has an unknown two-point prior.
        # Identical matched components need not imply identical marginal LRs.
        s = (1 + 0j, 0j)
        q, kappa = 3.0, 0.5
        y_a = ((1 + 0j, 0j), (1 + 0j, 0j))
        y_b = ((1 + 0j, 4 + 0j), (1 + 0j, -3j))
        self.assertEqual(ref.matched_pair(y_a, s, 1), ref.matched_pair(y_b, s, 1))

        def marginalized_noise_lr(y):
            terms = [[], []]
            flat = list(y[0]) + list(y[1])
            for sigma2 in (0.5, 2.0):
                c0 = [[complex(sigma2 if i == j else 0.0) for j in range(4)] for i in range(4)]
                c1 = [[c0[i][j] + q * (1 if i // 2 == j // 2 else kappa) * s[i % 2] * s[j % 2].conjugate() for j in range(4)] for i in range(4)]
                for hypothesis, covariance in enumerate((c0, c1)):
                    terms[hypothesis].append(dense_complex_gaussian_log_density(flat, covariance))
            def logmeanexp(values):
                m = max(values)
                return m + math.log(sum(math.exp(v - m) for v in values)) - math.log(2)
            return logmeanexp(terms[1]) - logmeanexp(terms[0])

        self.assertGreater(abs(marginalized_noise_lr(y_a) - marginalized_noise_lr(y_b)), 0.1)

    def test_exact_conjugation_of_match(self):
        s = (1 + 2j, 3 - 4j)
        y = (2 - 3j, -1 + 5j)
        dot = (1 - 2j) * (2 - 3j) + (3 + 4j) * (-1 + 5j)
        expected = dot / math.sqrt(30)
        self.assertAlmostEqual(ref.matched_output(y, s), expected)

    def test_global_template_phase_and_station_covariance(self):
        s = ref.qpsk_waveform(4, 2)
        y = ((1 + 2j, 3 - 1j, -2 + 0.2j, -0.3j), (2 - 1j, 0.5 + 0.3j, -0.1 + 2j, 0.9j))
        model = ref.Model(3, 0.75)
        z = ref.matched_pair(y, s)
        rotated_s = tuple(cmath.exp(0.731j) * w for w in s)
        rotated_z = ref.matched_pair(y, rotated_s)
        self.assertAlmostEqual(ref.log_likelihood_ratio(z, model), ref.log_likelihood_ratio(rotated_z, model), places=12)
        theta1, theta2 = 0.25, -1.03
        rotated_station = (cmath.exp(1j * theta1) * z[0], cmath.exp(1j * theta2) * z[1])
        correct = ref.quadratic_matrix(rotated_station, model, correlation_phase=theta1 - theta2)
        self.assertAlmostEqual(correct, ref.quadratic_matrix(z, model), places=12)
        incorrect = ref.quadratic_matrix(rotated_station, model)
        self.assertGreater(abs(correct - incorrect), 0.01)

    def test_hidden_truth_not_a_detector_input(self):
        forbidden = {"alpha", "target_present", "truth", "label", "hypothesis"}
        for fn in (ref.matched_output, ref.matched_pair, ref.quadratic_eigen, ref.quadratic_matrix, ref.log_likelihood_ratio, ref.decide_joint, ref.decide_energy_sum):
            self.assertFalse(forbidden.intersection(inspect.signature(fn).parameters))
        fields = set(ref.Model.__dataclass_fields__)
        self.assertEqual(fields, {"rho", "kappa"})
        observations = ref.generate_observations(random.Random(7), ref.Model(), ref.qpsk_waveform(4), 1.0, target_present=True)
        self.assertEqual(len(observations), 2)
        self.assertTrue(all(isinstance(v, complex) for station in observations for v in station))

    def test_zero_rho_exact_same_observation_law(self):
        for k in (0, 0.75, 1):
            model = ref.Model(0, k)
            cal = ref.calibrated_detector(model, 0.17)
            self.assertEqual(cal.joint_pd, 0.17)
            self.assertEqual(cal.energy_sum_pd, 0.17)
            self.assertEqual(ref.log_likelihood_ratio((5 + 3j, -8j), model), 0.0)
            self.assertRaises(ValueError, ref.decide_joint, (0, 0), cal)
            self.assertTrue(ref.decide_joint((3, 4j), cal, tie_uniform=0.169))
            self.assertFalse(ref.decide_joint((3, 4j), cal, tie_uniform=0.17))
        self.assertEqual(ref.tail(0, 0, 0), 0.0)
        self.assertEqual(ref.tail(-1, 0, 0), 1.0)


class TestProbabilities(unittest.TestCase):
    def test_exact_equal_and_zero_weights(self):
        for u in (1e-10, 0.3, 1, 1e4):
            for x in (0, 1e-7, 0.1, 1, 10, 100):
                self.assertAlmostEqual(ref.tail(x * u, u, 0), math.exp(-x), delta=2e-15)
                self.assertAlmostEqual(ref.tail(x * u, u, u), math.exp(-x) * (1 + x), delta=2e-15)
        self.assertEqual(ref.tail(math.inf, 1, 1), 0)
        self.assertEqual(ref.lower_cdf(0, 1, 1), 0)
        self.assertAlmostEqual(ref.lower_cdf(1e-7, 1, 1) / (0.5e-14), 1.0, places=6)

    def test_near_equal_and_near_zero_no_snapping(self):
        for ratio in (math.nextafter(1, 0), 1 - 1e-8, 1e-12, math.nextafter(0, 1)):
            for t in (1e-12, 1e-6, 0.1, 1, 30):
                p = ref.tail(t, 1, ratio)
                self.assertTrue(0 <= p <= 1)
                self.assertLessEqual(ref.tail(t + 0.01, 1, ratio), p)
                self.assertEqual(p, ref.tail(t, ratio, 1))
        # 1e-8 unequal weights still produce a distinct mathematical tail.
        self.assertNotEqual(ref.tail(2, 1, 1 - 1e-8), ref.tail(2, 1, 1))

    def test_grid_pfa_pd_and_np_order(self):
        for rho in (1e-10, 1e-6, 0.1, 3, 1e4):
            for k in (0, 1e-12, 0.1, 0.75, 1 - 1e-12, 1):
                last_pd = -1
                for pfa in (1e-12, 1e-6, 0.001, 0.05, 0.5, 0.99, 1 - 1e-12):
                    model = ref.Model(rho, k)
                    cal = ref.calibrated_detector(model, pfa)
                    self.assertGreater(cal.joint_threshold, 0)
                    actual_log = ref.log_tail(cal.joint_threshold, *model.null_weights)
                    self.assertAlmostEqual(actual_log, math.log(pfa), delta=2e-13 * max(abs(math.log(pfa)), 1e-20))
                    self.assertTrue(0 <= cal.joint_pd <= 1)
                    self.assertTrue(0 <= cal.energy_sum_pd <= 1)
                    self.assertGreaterEqual(cal.joint_pd + 2e-13, cal.energy_sum_pd)
                    self.assertGreaterEqual(cal.joint_pd + 2e-13, pfa)
                    self.assertGreaterEqual(cal.joint_pd, last_pd)
                    last_pd = cal.joint_pd

    def test_invalid_inputs_rejected_not_clipped(self):
        for rho in (-1, 1e-11, 1e5, math.inf, math.nan):
            self.assertRaises(ValueError, ref.Model, rho, 0.5)
        for k in (-1e-15, 1.00000001, math.nan):
            self.assertRaises(ValueError, ref.Model, 1, k)
        for p in (0, 1, 1e-13, math.nan):
            self.assertRaises(ValueError, ref.calibrated_detector, ref.Model(), p)
        self.assertRaises(ValueError, ref.tail_quantile, 0.1, 0, 0)
        self.assertRaises(ValueError, ref.tail, math.nan, 1, 1)
        self.assertRaises(ValueError, ref.matched_output, (1,), (0,))


class TestResources(unittest.TestCase):
    def test_per_block_downlink_can_dominate(self):
        ledger = ref.resource_ledger(16, blocks=10, bits_per_real=16)
        schemes = ledger["schemes"]
        self.assertEqual(schemes["central_raw"]["total_reals"], 640)
        self.assertEqual(schemes["local_complex_match"]["total_reals"], 680)
        self.assertEqual(schemes["local_energy_sum"]["total_reals"], 660)
        self.assertEqual(schemes["local_complex_match"]["payload_bits"], 10880)

    def test_exact_finite_cache_updates(self):
        once = ref.resource_ledger(16, blocks=10, template_mode="once", model_down_reals_per_update=3, model_updates=2)
        self.assertEqual(once["template_updates"], 1)
        self.assertEqual(once["schemes"]["local_complex_match"]["total_reals"], 110)
        cached = ref.resource_ledger(16, blocks=10, template_mode="cached")
        self.assertEqual(cached["schemes"]["local_complex_match"]["total_reals"], 40)
        self.assertEqual(cached["schemes"]["local_energy_sum"]["total_reals"], 20)
        self.assertEqual(cached["schemes"]["central_raw"]["total_reals"], 640)
        self.assertRaises(ValueError, ref.resource_ledger, 16, template_mode="magic")


if __name__ == "__main__":
    unittest.main(verbosity=2)
