"""Independent raw-observation simulation; thresholds are analytic, never fitted.

No hidden alpha is returned to the detector. Within each trial all processors
share exactly the same observations, template, noise and statistical prior.
"""
from dataclasses import asdict
import argparse
import json
import math
from pathlib import Path
import random
import detection_reference as ref


def binomial_record(count, n, analytic):
    interval = ref.wilson_interval(count, n)
    standard_error = math.sqrt(analytic * (1 - analytic) / n)
    return dict(count=count, trials=n, estimate=count / n, analytic=analytic, wilson_95=list(interval), analytic_inside_wilson_95=interval[0] <= analytic <= interval[1], within_6_standard_errors=abs(count / n - analytic) <= 6 * standard_error + 1 / n)


def run(n):
    rows = []
    s = ref.qpsk_waveform(4, 1)
    cases = ((3, 0), (3, 0.75), (3, 1), (0, 0.75))
    for case_index, (rho, kappa) in enumerate(cases):
        model = ref.Model(rho, kappa)
        cal = ref.calibrated_detector(model, 0.05)
        for target in (False, True):
            seed = 20261011 + 1000 * case_index + int(target)
            rng, tie_rng = random.Random(seed), random.Random(seed + 999999)
            joint_count = energy_count = disagreements = 0
            positive_diff = negative_diff = 0
            raw_checked = min(n, 1000)
            max_raw_match_error = 0.0
            for i in range(n):
                y = ref.generate_observations(rng, model, s, 1.0, target_present=target)
                z = ref.matched_pair(y, s, 1.0)
                joint = ref.decide_joint(z, cal, tie_uniform=tie_rng.random() if rho == 0 else None)
                energy = ref.decide_energy_sum(z, cal)
                joint_count += joint
                energy_count += energy
                disagreements += joint != energy
                positive_diff += joint and not energy
                negative_diff += energy and not joint
                if i < raw_checked:
                    error = abs(ref.raw_log_likelihood_ratio(y, s, 1.0, model) - ref.log_likelihood_ratio(z, model))
                    max_raw_match_error = max(max_raw_match_error, error)
            diff_mean = (positive_diff - negative_diff) / n
            diff_variance = max(0.0, (positive_diff + negative_diff - n * diff_mean ** 2) / (n - 1))
            half_width = 1.959963984540054 * math.sqrt(diff_variance / n)
            rows.append(dict(model=asdict(model), hypothesis="H1" if target else "H0", seed=seed, tie_seed=seed + 999999 if rho == 0 else None, trials=n, joint=binomial_record(joint_count, n, cal.joint_pd if target else cal.pfa), energy_sum=binomial_record(energy_count, n, cal.energy_sum_pd if target else cal.pfa), paired_difference=dict(estimate=diff_mean, normal_95=[diff_mean - half_width, diff_mean + half_width], positive=positive_diff, negative=negative_diff, caveat="Paired normal interval; no multiplicity adjustment. At kappa=0 positive rho the two decisions are algebraically identical."), disagreements=disagreements, raw_match_checks=raw_checked, max_raw_match_log_lr_error=max_raw_match_error))
            print(f"rho={rho:g} kappa={kappa:g} {'H1' if target else 'H0'}: joint={joint_count/n:.6f}, energy_sum={energy_count/n:.6f}", flush=True)
    report = dict(schema_version=1, n_per_hypothesis_per_case=n, total_raw_trials=len(rows) * n, waveform=dict(kind="fixed unit-energy QPSK", length=len(s), energy=ref.waveform_energy(s)), noise_power=1.0, target_false_alarm=0.05, thresholds="H0 analytic calibration, fixed before simulations; never tuned on sampled H1 or alpha", gaussian_generator="stdlib random.Random.gauss: CN(0,1)=(N(0,1)+iN(0,1))/sqrt(2)", alternative_generator="hidden alpha via station-basis Cholesky, independent of detector eigenbasis; one draw per observation block", intervals="Marginal two-sided 95% Wilson score; some misses are expected and do not imply a model error. 6-sigma plus 1/N is a broad deterministic regression sanity check, not a confidence claim.", results=rows)
    report["all_broad_regression_checks_pass"] = all(r[key]["within_6_standard_errors"] for r in rows for key in ("joint", "energy_sum"))
    path = Path(__file__).with_name("monte_carlo_report.json")
    path.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"Wrote {path.name}; broad checks={report['all_broad_regression_checks_pass']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=100000)
    args = parser.parse_args()
    if args.trials < 2:
        parser.error("--trials must be at least 2")
    run(args.trials)
