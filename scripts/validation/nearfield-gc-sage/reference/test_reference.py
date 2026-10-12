"""Executable numerical gate. Run: python -m unittest -v test_reference.py"""
from dataclasses import replace
import inspect
import json
from pathlib import Path
import unittest

import numpy as np

from gc_sage import (C, Model, Options, candidate_geometry, ellipse_points, fit,
                     initialize, observation_hash, profile_geometry, steering,
                     visibility_power_threshold, delay_alias_period_ns)
from experiments import Scene, simulate, run_comparison


def complex_array(value):
    value = np.asarray(value)
    return value[..., 0] + 1j * value[..., 1]


class GeometryAndLinearAlgebra(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = json.loads((Path(__file__).parent / "fixtures" / "geometry-and-gains.json").read_text())

    def test_supplied_noiseless_complex_gain_fixture(self):
        f = self.fixture["noiseless_signal"]
        y = complex_array(f["Z_point"])
        delays = np.array(self.fixture["geometry"]["point_delays"])
        gains, prediction, sse = profile_geometry(y, delays, np.array(f["frequencies"]))
        np.testing.assert_allclose(gains, complex_array(f["point_gains"]), atol=1e-12)
        np.testing.assert_allclose(prediction, y, atol=1e-12)
        self.assertLess(sse, 1e-25)

    def test_supplied_wrong_geometry_profile_fixture(self):
        f = self.fixture["noiseless_signal"]
        y = complex_array(f["Z_point"])
        gains, _, sse = profile_geometry(y, np.array(f["wrong_point_distances"]) / C, np.array(f["frequencies"]))
        np.testing.assert_allclose(gains, complex_array(f["isolated_point_fit_wrong_geometry_gains"]), atol=1e-12)
        self.assertAlmostEqual(sse, f["isolated_point_fit_wrong_geometry_SSE"], places=12)

    def test_supplied_residual_cancellation_fixture(self):
        f = self.fixture["residual_cancellation"]
        y, z1, z2 = map(complex_array, (f["Y"], f["estimated_Z1"], f["estimated_Z2"]))
        np.testing.assert_allclose(z1 + y - z1 - z2, complex_array(f["expected_hidden_data_for_path1"]), atol=1e-14)

    def test_reflection_normal_mirror_and_ray_consistency(self):
        model = Model(np.array([[0., 0.]]), np.array([[0., 0.], [1., 0.], [2., 0.]]), np.array([0., 1e8]),
                      region=(-3., 3., 0.01, 3.), reference_pair=2)
        geo = candidate_geometry(2 * np.sqrt(2) / C, np.array([np.pi / 2]), "reflection", model)
        np.testing.assert_allclose(geo["points"], [[1., 1.]], atol=1e-12)
        np.testing.assert_allclose(geo["normals"], [[0., 1.]], atol=1e-12)
        np.testing.assert_allclose(geo["bounces"], [[[0., 1.], [.5, 1.], [1., 1.]]], atol=1e-12)
        np.testing.assert_allclose(geo["delays"][0] * C, [2., np.sqrt(5), np.sqrt(8)], atol=1e-12)

    def test_scattering_uses_shared_point(self):
        model = Model(np.array([[0., 0.]]), np.array([[0., 0.], [1., 0.], [2., 0.]]), np.array([0., 1e8]),
                      region=(-3., 3., 0.01, 3.), reference_pair=2)
        geo = candidate_geometry(2 * np.sqrt(2) / C, np.array([np.pi / 2]), "scattering", model)
        np.testing.assert_allclose(geo["bounces"], [[[1., 1.], [1., 1.], [1., 1.]]], atol=1e-12)
        np.testing.assert_allclose(geo["delays"][0] * C, [np.sqrt(8), 1 + np.sqrt(2), np.sqrt(8)], atol=1e-12)

    def test_single_tone_profile_is_flat(self):
        y = np.array([[1 + 2j], [3 - 1j]])
        losses = [profile_geometry(y, np.array([d, 2*d]), np.array([30e9]))[2] for d in [1e-9, 5e-9, 31e-9]]
        self.assertLess(max(losses), 1e-27)

    def test_same_data_carrier_origin_invariance(self):
        rng = np.random.default_rng(9)
        y = rng.normal(size=(3, 16)) + 1j * rng.normal(size=(3, 16))
        frequencies = np.linspace(-.5e9, .5e9, 16)
        delays = np.array([5., 9., 14.]) * 1e-9
        self.assertAlmostEqual(profile_geometry(y, delays, frequencies)[2],
                               profile_geometry(y, delays, frequencies + 30e9)[2], places=10)

    def test_uniform_tone_delay_alias_has_identical_profiled_signal(self):
        frequencies = np.linspace(-1e9, 1e9, 64)
        alias = 1 / (frequencies[1]-frequencies[0])
        a = steering(np.array([10e-9]), frequencies)
        _, predicted, sse = profile_geometry(a, np.array([10e-9+alias]), frequencies)
        np.testing.assert_allclose(predicted, a, atol=1e-12)
        self.assertLess(sse, 1e-22)

    def test_heldout_tone_subset_retains_original_alias_period(self):
        frequencies = np.linspace(-.5e9, .5e9, 64)
        train = np.arange(64) % 4 != 3
        self.assertAlmostEqual(delay_alias_period_ns(frequencies[train]), 63., places=8)

    def test_unrecognized_tone_grid_does_not_silently_ignore_aliasing(self):
        with self.assertRaisesRegex(ValueError, "Unsupported tone lattice"):
            delay_alias_period_ns(np.array([0., 1e6, 2.3e6]))

    def test_visibility_threshold_has_expected_isolated_noise_scale(self):
        sigma2, p, trials = .2, 64, 100_000
        rng = np.random.default_rng(7)
        gains = np.sqrt(sigma2/(2*p))*(rng.standard_normal(trials)+1j*rng.standard_normal(trials))
        observed_rate = np.mean(abs(gains)**2 > visibility_power_threshold(sigma2, p))
        self.assertLess(abs(observed_rate-.01), .001)

    def test_finite_surface_visibility_is_partial(self):
        _, _, truth = simulate(Scene())
        self.assertAlmostEqual(np.mean(truth["visibility"][1]), 2/3)
        self.assertTrue(np.all(truth["gains"][1, ~truth["visibility"][1]] == 0))

    def test_degenerate_reference_ellipse_rejected(self):
        y, model, _ = simulate(Scene())
        tx, rx = model.pairs
        direct = np.linalg.norm(tx[model.reference_pair]-rx[model.reference_pair])/C
        for kind in ["scattering", "reflection"]:
            self.assertEqual(len(candidate_geometry(direct, np.arange(64)*2*np.pi/64, kind, model)["angles"]), 0)

    def test_every_modeled_reflection_bounce_is_in_declared_region(self):
        _, model, _ = simulate(Scene())
        xmin, xmax, ymin, ymax = model.region
        for delay_ns in [8., 15., 30., 40., 50., 53.]:
            geo = candidate_geometry(delay_ns*1e-9, np.arange(1024)*2*np.pi/1024, "reflection", model)
            b = geo["bounces"]
            self.assertTrue(np.all(b[...,0] >= xmin-1e-10))
            self.assertTrue(np.all(b[...,0] <= xmax+1e-10))
            self.assertTrue(np.all(b[...,1] >= ymin-1e-10))
            self.assertTrue(np.all(b[...,1] <= ymax+1e-10))

    def test_reference_inside_does_not_admit_other_bounces_outside(self):
        _, model, _ = simulate(Scene())
        # This exact index was accepted by the old reference-point-only guard.
        theta = 112*2*np.pi/1024
        point = ellipse_points(40e-9, np.array([theta]), model)[0]
        self.assertTrue(model.region[0] <= point[0] <= model.region[1])
        self.assertTrue(model.region[2] <= point[1] <= model.region[3])
        self.assertEqual(len(candidate_geometry(40e-9, np.array([theta]), "reflection", model)["angles"]), 0)

    def test_sample_count_preserves_aperture(self):
        _, small, _ = simulate(Scene(samples=24))
        _, large, _ = simulate(Scene(samples=96))
        np.testing.assert_allclose(small.rx[[0,-1]], large.rx[[0,-1]])


class InverseEstimation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.y, cls.model, cls.truth = simulate(Scene())
        cls.options = Options()
        cls.initial = initialize(cls.y, cls.model, cls.options)
        cls.base = fit(cls.y, cls.model, "scattering", cls.options, cls.initial)
        cls.hybrid = fit(cls.y, cls.model, "hybrid", cls.options, cls.initial)

    def test_estimator_api_has_no_truth_argument(self):
        self.assertEqual(list(inspect.signature(fit).parameters), ["observations", "model", "mode", "options", "initial"])
        self.assertNotIn("truth", inspect.getsource(fit).replace("true geometry", ""))
        self.assertEqual(self.model.path_count, 2)

    def test_same_observations_and_initializer_for_both(self):
        self.assertEqual(self.base.observation_sha256, self.hybrid.observation_sha256)
        self.assertIs(self.base.initialization, self.hybrid.initialization)
        self.assertEqual(self.base.trace[0]["sse"], self.hybrid.trace[0]["sse"])

    def test_port_observation_fixture_matches_actual_inputs(self):
        fixture = json.loads((Path(__file__).parent / "fixtures" / "default-observations.json").read_text())
        observed = np.asarray(fixture["observations_real"]) + 1j*np.asarray(fixture["observations_imag"])
        np.testing.assert_array_equal(observed, self.y)
        self.assertNotIn("truth", fixture)
        self.assertEqual(set(fixture["model"]), set(Model.__dataclass_fields__))
        self.assertNotIn("point", fixture["model"])
        self.assertNotIn("surface", fixture["model"])

    def test_reference_delays_estimated_from_data(self):
        true_delays = self.truth["delays"][:, self.model.reference_pair]*1e9
        error = np.abs(np.array(self.initial.reference_delays_ns)-true_delays)
        self.assertLess(float(np.max(error)), .06)
        self.assertGreater(float(np.max(error)), 1e-5)  # not copied from truth

    def test_every_accepted_global_update_nonincreasing(self):
        for result in [self.base, self.hybrid]:
            values = np.array([item["sse"] for item in result.trace])
            self.assertLess(float(np.max(np.diff(values))), 1e-8)
            self.assertTrue(result.converged)

    def test_reference_initializer_nonincreasing(self):
        self.assertLess(float(np.max(np.diff(self.initial.delay_trace_sse))), 1e-8)

    def test_default_hybrid_identifies_both_mechanisms(self):
        self.assertEqual([p.kind for p in self.hybrid.states], ["scattering", "reflection"])
        self.assertLess(np.linalg.norm(self.hybrid.states[0].point-self.truth["point"]), .02)
        normal = self.hybrid.states[1].normal
        error_deg = np.degrees(np.arccos(abs(np.dot(normal, self.truth["surface_normal"]))))
        self.assertLess(error_deg, 2.)

    def test_default_hybrid_improves_fit_and_clean_prediction(self):
        self.assertLess(self.hybrid.trace[-1]["sse"], self.base.trace[-1]["sse"])
        hybrid_error = np.linalg.norm(self.hybrid.prediction-self.truth["clean"])
        base_error = np.linalg.norm(self.base.prediction-self.truth["clean"])
        self.assertLess(hybrid_error, base_error)

    def test_both_baselines_fit_partial_visibility(self):
        threshold = visibility_power_threshold(self.truth["noise_variance"], len(self.model.frequencies))
        visible = self.truth["visibility"][1]
        for result in [self.base, self.hybrid]:
            prediction = abs(result.states[1].gains)**2 > threshold
            self.assertGreater(float(np.mean(prediction == visible)), .9)

    def test_actual_residual_matches_recorded_objective(self):
        for result in [self.base, self.hybrid]:
            actual = np.sum(abs(self.y-result.prediction)**2)
            self.assertAlmostEqual(actual, result.trace[-1]["sse"], places=9)

    def test_more_compute_is_accounted_for_hybrid(self):
        self.assertEqual(self.base.budget.reflection_candidates, 0)
        self.assertGreater(self.hybrid.budget.reflection_candidates, 0)
        self.assertGreater(self.hybrid.budget.reflection_tone_products, 0)
        self.assertGreater(self.initial.budget.delay_tone_products, 0)

    def test_same_seed_reproduces_observations_and_estimates(self):
        duplicate, model, _ = simulate(Scene())
        np.testing.assert_array_equal(duplicate, self.y)
        repeated = fit(duplicate, model, "hybrid", self.options, self.initial)
        np.testing.assert_array_equal(repeated.prediction, self.hybrid.prediction)

    def test_new_seed_changes_data_and_fit(self):
        different, model, _ = simulate(Scene(seed=2))
        self.assertNotEqual(observation_hash(different), observation_hash(self.y))
        alternate = fit(different, model, "hybrid", self.options)
        self.assertNotEqual(alternate.trace[-1]["sse"], self.hybrid.trace[-1]["sse"])

    def test_initialization_cannot_be_reused_on_different_data(self):
        with self.assertRaises(ValueError):
            fit(self.y+1e-4, self.model, "hybrid", self.options, self.initial)

    def test_initialization_cannot_be_reused_with_changed_priors(self):
        with self.assertRaisesRegex(ValueError, "model priors"):
            fit(self.y, replace(self.model, reference_pair=0), "hybrid", self.options, self.initial)

    def test_nominal_fitted_linear_gain_model_is_full_rank(self):
        delays = np.stack([state.delays for state in self.hybrid.states], axis=1)
        design = steering(delays, self.model.frequencies).transpose(0, 2, 1) / np.sqrt(len(self.model.frequencies))
        singular_values = np.linalg.svd(design, compute_uv=False)
        self.assertGreater(float(np.min(singular_values[:, -1])), .8)
        self.assertLess(float(np.max(singular_values[:, 0] / singular_values[:, -1])), 1.3)

    def test_single_tone_inverse_problem_is_refused(self):
        model = replace(self.model, frequencies=np.array([0.]))
        with self.assertRaisesRegex(ValueError, "unidentifiable"):
            fit(self.y[:, :1], model, "hybrid")

    def test_too_short_budget_is_not_reported_as_converged(self):
        short = fit(self.y, self.model, "hybrid", replace(self.options, max_sweeps=1), self.initial)
        self.assertFalse(short.converged)
        self.assertEqual(short.stopping_reason, "sweep budget reached")

    def test_delay_search_refuses_unjustified_alias_class(self):
        y, model, _ = simulate(Scene(tones=32, bandwidth=2e9))
        with self.assertRaisesRegex(ValueError, "alias period"):
            initialize(y, model, self.options)
        # Explicitly declared 15 ns prior is a different, bounded acquisition model.
        initial = initialize(y, replace(model, max_delay_ns=15.0), self.options)
        self.assertEqual(initial.search_delay_bounds_ns[1], 15.0)

    def test_small_aperture_failure_is_not_forced_to_correct_label(self):
        result = run_comparison(Scene(aperture=.05, seed=0))
        # With near-zero aperture the mechanism loss separation collapses.
        # This seeded counterexample remains part of the regression suite.
        self.assertFalse(result["hybrid"]["mechanisms_correct"])

    def test_absent_path_does_not_receive_forced_true_match(self):
        result = run_comparison(Scene(reflection_visible=False))
        self.assertFalse(result["hybrid"]["mechanisms_correct"])
        self.assertFalse(result["hybrid"]["paths"][1]["target_present"])
        self.assertFalse(result["hybrid"]["paths"][1]["matched"])
        self.assertEqual(len(result["hybrid"]["unmatched_estimate_indices"]), 1)

    def test_reference_blind_path_is_reported_unmatched(self):
        result = run_comparison(Scene(reference_blind=True))
        self.assertTrue(result["hybrid"]["paths"][1]["target_present"])
        self.assertFalse(result["hybrid"]["paths"][1]["matched"])
        self.assertFalse(result["hybrid"]["mechanisms_correct"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
