#!/usr/bin/env python3
"""Build reproducible JS port fixtures and independently check runtime exports.

Two distinct evidence layers are retained:
  1. full-output comparisons to the immutable accepted Python implementation;
  2. probabilities from the separately authored scalar message oracle, plus
     exact mathematical checks from the source auditor. Layer 1 alone is not
     independent scientific validation or a claim of exact posterior inference.

Usage:
  python3 tests/generate_oracles.py
  python3 tests/generate_oracles.py --verify-runtime reports/oracle-runtime-nonfixture.json
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import importlib.util
import json
import platform
from pathlib import Path
import sys

import numpy as np

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
PINNED_SHA = "c83ba035ee49d8011c2b3b8f5f0260b7e95fd2fb562781f03e63a1ea7407ddce"
SCALAR_SHA = "b29781d5d2a644c0c08069278f1a7bf34ffccc19061aaf30165abfc6af0ce1ed"
AUDIT_SHA = "f611e447b08f700e6572a7f1c32284fa7204286396e1e4d02d4c70fb1223b995"
SOURCE_SHA = "435bb73f5237389f12b47b26f622804daad03be805c05b5493739b837a3a1ace"
REF_PATH = ROOT / "reference-copy/reference.py"
SCALAR_PATH = ROOT / "reference-copy/independent-audit/review_reference.py"
SOURCE_PATH = ROOT / "fixtures/independent-source-fixtures.json"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def pinned_modules():
    assert sha(REF_PATH) == PINNED_SHA, "Accepted reference hash changed"
    assert sha(SCALAR_PATH) == SCALAR_SHA, "Independent scalar source hash changed"
    assert sha(ROOT / "reference-copy/independent-audit/audit_oracle.py") == AUDIT_SHA, "Independent mathematical oracle source hash changed"
    assert sha(SOURCE_PATH) == SOURCE_SHA, "Independent frozen fixture hash changed"
    reference = load_module("pinned_reference", REF_PATH)
    audit = load_module("independent_audit", ROOT / "reference-copy/independent-audit/audit_oracle.py")
    # Extract the accepted independent scalar function verbatim. Importing its
    # review harness would import the implementation under test via a historical
    # path. No reference function is present in this oracle's global namespace.
    tree = ast.parse(SCALAR_PATH.read_text())
    node = next(x for x in tree.body if isinstance(x, ast.FunctionDef) and x.name == "scalar_messages")
    namespace = {"np": np, "cells": audit.cells, "add": audit.add,
                 "sub": audit.sub, "normalize_log": audit.normalize_log}
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(SCALAR_PATH), "exec"), namespace)
    return reference, audit, namespace["scalar_messages"]


def packed(value):
    value = np.asarray(value, complex).ravel()
    return np.column_stack((value.real, value.imag)).ravel().tolist()


def unpacked(value):
    value = np.asarray(value, float).reshape(-1, 2)
    return value[:, 0] + 1j * value[:, 1]


def nested_complex(value):
    value = np.asarray(value)
    return value[..., 0] + 1j * value[..., 1]


def encode_output(result):
    names = {
        "iteration": "iteration", "max_message_change": "maxMessageChange",
        "max_marginal_change": "maxMarginalChange", "decision_changes": "decisionChanges",
        "mean_entropy_bits": "meanEntropyBits", "plugin_residual_mse": "pluginResidualMse",
    }
    return {
        "probabilities": result["probabilities"].ravel().tolist(),
        "probabilitiesValidMask": result["probabilities_valid_mask"].astype(int).tolist(),
        "knownPilotFlatIndex": result["known_pilot_flat_index"],
        "knownPilotValue": packed([result["known_pilot_value"]]),
        "decisions": packed(result["decisions"]), "status": result["status"],
        "iterations": result["iterations"],
        "history": [{names[k]: v for k, v in row.items()} for row in result["history"]],
        "dataMask": result["data_mask"].astype(int).tolist(),
        "gainVariance": result["gain_variance"].tolist(),
    }


def python_input(value):
    return dict(y=unpacked(value["y"]).reshape(value["shape"]), support=value["support"],
                estimated_gains=unpacked(value["estimatedGains"]),
                pilot_index=tuple(value["pilotIndex"]), pilot=complex(*value["pilot"]),
                Es=value["Es"], N0=value["N0"], gain_variance=np.asarray(value["gainVariance"]),
                mode=value["mode"], max_iterations=value["maxIterations"],
                damping=value["damping"], tolerance=value["tolerance"])


def independent_probabilities(scalar, value, iterations):
    args = python_input(value)
    return scalar(args["y"], [tuple(s) for s in args["support"]], args["estimated_gains"],
                  args["pilot_index"], args["pilot"], args["Es"], args["N0"],
                  args["gain_variance"], args["mode"], iterations, args["damping"])


def check_numbers(actual, expected, path="result", errors=None):
    """Full recursive comparison: no sampled probabilities or shortened history."""
    if errors is None:
        errors = {"maximum_absolute_error": 0., "numeric_values_compared": 0}
    if isinstance(expected, dict):
        assert isinstance(actual, dict), path
        for key in expected:
            assert key in actual, f"{path}: missing {key}"
            check_numbers(actual[key], expected[key], f"{path}.{key}", errors)
    elif isinstance(expected, list):
        assert isinstance(actual, list) and len(actual) == len(expected), f"{path}: wrong array length"
        for index, item in enumerate(expected):
            check_numbers(actual[index], item, f"{path}[{index}]", errors)
    elif isinstance(expected, str) or isinstance(expected, bool):
        assert actual == expected, f"{path}: {actual!r} != {expected!r}"
    elif isinstance(expected, int):
        assert actual == expected, f"{path}: {actual!r} != {expected!r}"
        errors["numeric_values_compared"] += 1
    else:
        assert isinstance(actual, (int, float)) and np.isfinite(actual), f"{path}: nonfinite/nonnumeric"
        difference = abs(actual - expected)
        tolerance = 3e-12 + 2e-11 * abs(expected)
        assert difference <= tolerance, f"{path}: {actual} != {expected}, error={difference}"
        errors["maximum_absolute_error"] = max(errors["maximum_absolute_error"], difference)
        errors["numeric_values_compared"] += 1
    return errors


def fresh_frame(audit, name, seed, shape, support, *, Es=.7, pilot=3+4j, N0=.13,
                prior=(.6, .3, .1), pilot_index=None, predicted=None,
                gain_override=None, damping=.37):
    rng = np.random.default_rng(seed)
    shape = tuple(shape)
    pilot_index = tuple(pilot_index or (shape[0] - 1, shape[1] - 1))
    gains = np.sqrt(np.asarray(prior)/2) * (rng.normal(size=len(prior)) + 1j*rng.normal(size=len(prior)))
    x = np.sqrt(Es) * rng.choice([-1., 1.], size=shape).astype(complex)
    x[pilot_index] = pilot
    noise = np.sqrt(N0/2) * (rng.normal(size=shape) + 1j*rng.normal(size=shape))
    y = audit.direct_frame(x, support, gains) + noise
    predicted = predicted if predicted is not None else support
    estimated = np.array([y[audit.add(pilot_index, s, shape)] / pilot for s in predicted])
    statistical_v = (Es*(np.sum(prior) - np.array(prior)) + N0) / abs(pilot)**2
    if gain_override is not None:
        estimated = np.asarray(gain_override, complex)
    return dict(name=name, seed=seed, shape=list(shape), support=predicted, y=packed(y),
                estimatedGains=packed(estimated), pilotIndex=list(pilot_index), pilot=packed([pilot]),
                Es=Es, N0=N0, gainVariance=statistical_v.tolist(), damping=damping,
                evaluatorOnly=dict(physicalSupport=support, trueGains=packed(gains),
                                   transmittedSymbols=packed(x), noise=packed(noise),
                                   priorPowers=list(prior),
                                   receiverGainInput="explicit zero/weak parameter probe" if gain_override is not None else "raw pilot arrivals divided by known pilot",
                                   predictedSupportMismatch=predicted != support))


def receiver_input(frame, variant, steps, tolerance=None):
    output = {k: frame[k] for k in ("shape", "support", "y", "estimatedGains", "pilotIndex",
                                  "pilot", "Es", "N0", "gainVariance", "damping")}
    output.update(mode=variant, maxIterations=steps, tolerance=(1e-7 if steps == 40 else 0.) if tolerance is None else tolerance)
    if variant == "supplied_perfect_csi":
        output.update(mode="ignored_uncertainty", support=frame["evaluatorOnly"]["physicalSupport"],
                      estimatedGains=frame["evaluatorOnly"]["trueGains"],
                      gainVariance=[0.]*len(frame["evaluatorOnly"]["physicalSupport"]))
    return output


def source_fixture(audit):
    frozen = json.loads(SOURCE_PATH.read_text())
    c = frozen["configuration"]
    y = nested_complex(frozen["posterior"]["observation"])
    xp = complex(*c["pilot_symbol"])
    s, q, Es, N0 = c["support"], tuple(c["pilot"]), c["Es"], c["N0"]
    gains = nested_complex(c["effective_gains"])
    unknown, bits, data, words = audit.all_words(tuple(c["shape"]), q, xp, Es)
    known_words, known = audit.posterior_known(y, words, s, gains, N0, bits)
    lam = frozen["posterior"]["gain_prior_variances"]
    unknown_words, integrated = audit.posterior_integrated(y, words, s, lam, N0, bits)
    ah = np.array([y[audit.add(q, shift, y.shape)]/xp for shift in s])
    v = (Es*(sum(lam) - np.array(lam))+N0)/abs(xp)**2
    frame = dict(name="retained_exact_posterior_discrepancy", seed=None, shape=c["shape"], support=s,
                 y=packed(y), estimatedGains=packed(ah), pilotIndex=list(q), pilot=packed([xp]), Es=Es,
                 N0=N0, gainVariance=v.tolist(), damping=.5,
                 evaluatorOnly=dict(physicalSupport=s, trueGains=packed(gains),
                                    transmittedSymbols=packed(words[frozen["posterior"]["word_index"]]),
                                    noise=packed(nested_complex(frozen["posterior"]["noise"])),
                                    priorPowers=lam, predictedSupportMismatch=False,
                                    receiverGainInput="raw pilot arrivals divided by known pilot"))
    oracle = dict(dataFlatIndices=[t[0]*c["shape"][1]+t[1] for t in unknown],
                  knownGainMarginals=known.tolist(), integratedGainMarginals=integrated.tolist(),
                  knownGainWordProbabilities=known_words.tolist(), integratedGainWordProbabilities=unknown_words.tolist())
    checks = {}
    def compare(name, actual, expected, tolerance=2e-12):
        error = float(np.max(abs(np.asarray(actual)-np.asarray(expected))))
        assert error < tolerance, (name,error)
        checks[name] = dict(maximum_absolute_error=error, pass_=True)
    compare("known_gain_exact_posterior", known, frozen["posterior"]["known_gain_marginals"])
    compare("integrated_gain_exact_posterior", integrated, frozen["posterior"]["integrated_gain_marginals"])
    _, B, _, Q = audit.linear_contamination(tuple(c["shape"]), q, xp, s, gains)
    cov = Es*B@B.conj().T + N0/abs(xp)**2*Q
    compare("conditional_covariance", cov, nested_complex(frozen["moments"]["covariance_with_noise"]))
    compare("conditional_pseudocovariance", Es*B@B.T, nested_complex(frozen["moments"]["pseudo_covariance"]))
    compare("error_data_cross_covariance", Es*B, nested_complex(frozen["moments"]["error_data_covariance"]))
    f = frozen["factor"]
    exact = audit.exact_factor_message(complex(*f["y"]), nested_complex(f["gains"]), np.array(f["alphabet"]),
                                       np.array(f["incoming_pmfs"]), N0, f["target"])
    compare("exact_local_factor_mixture", exact, f["exact_mixture"])
    oracle["exactLocalFactorMixture"] = exact.tolist()
    oracle["gaussianLocalFactorApproximation"] = f["moment_gaussian"]
    oracle["localMixtureVersusGaussianMaximumGap"] = float(np.max(abs(exact-f["moment_gaussian"])))
    return frame, oracle, checks


def generate():
    reference, audit, scalar = pinned_modules()
    frames = [
        fresh_frame(audit, "small_complex_nonunit", 9133701, (3,4), [(0,0),(1,-1),(-1,1)], pilot_index=(1,3)),
        fresh_frame(audit, "main16_equal_frame_energy", 9133702, (16,16), [(0,0),(1,2),(-2,4)],
                    Es=256/355, pilot=np.sqrt(25600/355), N0=10**-1.1, pilot_index=(7,10), damping=.5),
        fresh_frame(audit, "signed_one_bin_mismatch", 9133703, (4,5), [(0,0),(1,2),(-1,3)],
                    predicted=[(0,0),(1,2),(-1,4)], Es=1.3, pilot=-2+3j, N0=.21, pilot_index=(3,0)),
        fresh_frame(audit, "single_path_one_row", 9133704, (1,5), [(0,-2)], Es=2.4,
                    pilot=.8-1.6j, prior=(.7,), N0=.09, pilot_index=(0,4), damping=.91),
        fresh_frame(audit, "zero_and_weak_estimated_gains", 9133705, (3,4), [(0,0),(-2,3),(2,-2)],
                    Es=.31, pilot=-.9+2.1j, gain_override=[0, 1e-14+2e-14j, -.13+.21j]),
        fresh_frame(audit, "all_zero_estimated_gains", 9133706, (2,3), [(0,0),(1,1),(-1,2)],
                    Es=1.7, pilot=2-3j, gain_override=[0,0,0]),
    ]
    source, exact, source_checks = source_fixture(audit)
    frames.append(source)
    p1 = next(frame for frame in frames if frame["name"] == "single_path_one_row")
    p1_input = receiver_input(p1, "supplied_perfect_csi", 40)
    p1_args = python_input(p1_input)
    unknown, bits, _, words = audit.all_words(tuple(p1["shape"]), tuple(p1["pilotIndex"]), complex(*p1["pilot"]), p1["Es"])
    _, p1_exact = audit.posterior_known(p1_args["y"], words, p1["support"], p1_args["estimated_gains"], p1["N0"], bits)
    p1_spa = reference.sparse_spa(**p1_args)
    p1_indices = [k*p1["shape"][1]+l for k,l in unknown]
    p1_error = float(np.max(abs(p1_exact-p1_spa["probabilities"][p1_indices])))
    assert p1_error < 3e-12
    source_checks["single_path_supplied_csi_matches_exhaustive_physical_posterior"] = dict(maximum_absolute_error=p1_error, pass_=True)
    cases, scalar_records, probability_traces = [], [], {}
    for frame in frames:
        for variant in ("moment_repaired", "ignored_uncertainty", "literal_operational", "supplied_perfect_csi"):
            # Preserve complete per-iteration marginals for diagnosing categorical
            # differences at floating-point half ties. No output is snapped.
            trace_key = f"{frame['name']}__{variant}"
            probability_traces[trace_key] = [
                reference.sparse_spa(**python_input(receiver_input(frame, variant, k, tolerance=0.)))["probabilities"].ravel().tolist()
                for k in range(1, 41)
            ]
            for steps in (1,2,5,40):
                case_id = f"{frame['name']}__{variant}__{steps}"
                value = receiver_input(frame, variant, steps)
                result = reference.sparse_spa(**python_input(value))
                independent = independent_probabilities(scalar, value, result["iterations"])
                error = float(np.max(abs(independent-result["probabilities"])))
                assert error < 3e-12, (case_id, error)
                cases.append(dict(id=case_id, frameId=frame["name"], receiverVariant=variant,
                                  input=value, expected=encode_output(result),
                                  independentScalarProbabilities=independent.ravel().tolist()))
                scalar_records.append(dict(id=case_id, max_absolute_probability_error=error,
                                           iterations=result["iterations"], status=result["status"], pass_=True))
    discrepancy_input = receiver_input(source, "moment_repaired", 40, tolerance=1e-7)
    discrepancy = reference.sparse_spa(**python_input(discrepancy_input))
    independent = independent_probabilities(scalar, discrepancy_input, discrepancy["iterations"])
    assert np.max(abs(independent-discrepancy["probabilities"])) < 3e-12
    data_indices = exact["dataFlatIndices"]
    approx = discrepancy["probabilities"][data_indices,1]
    true = np.array(exact["integratedGainMarginals"])[:,1]
    gap = float(np.max(abs(approx-true)))
    assert round(gap,6) == .499913 and discrepancy["status"] == "converged", (gap,discrepancy["status"])
    clipped_a, clipped_t = np.clip(approx,1e-15,1-1e-15), np.clip(true,1e-15,1-1e-15)
    kl = float(np.mean(clipped_t*np.log(clipped_t/clipped_a)+(1-clipped_t)*np.log((1-clipped_t)/(1-clipped_a))))
    exact.update(estimatedGainSurrogateMaximumGap=gap, meanBernoulliKLExactToApprox=kl,
                 surrogateConverged=True, interpretation="Convergence is not exact posterior correctness; proper-complex marginal variance is only a surrogate.")
    discrepancy_case = dict(id="retained_discrepancy_converged", frameId=source["name"],
                            receiverVariant="moment_repaired", input=discrepancy_input,
                            expected=encode_output(discrepancy),
                            independentScalarProbabilities=independent.ravel().tolist())
    cases.append(discrepancy_case)
    output = dict(schema="sensing-assisted-otfs-full-output-fixtures-v1", complexEncoding="flat interleaved real,imaginary; row-major cells",
                  referenceSha256=PINNED_SHA, independentScalarSha256=SCALAR_SHA,
                  independentMathematicalOracleSha256=AUDIT_SHA, independentSourceFixtureSha256=SOURCE_SHA,
                  pythonVersion=platform.python_version(), numpyVersion=np.__version__,
                  evidenceLayers=dict(portParity="All sparse_spa fields from pinned accepted Python reference",
                                      independentMessages="Separately authored scalar-loop oracle extracted verbatim from accepted independent review",
                                      exactMathematics="Separate source auditor exhaustive posterior/covariance/local mixture calculations",
                                      limitations="No browser claim, full-paper reproduction, BER benefit, or exactness of large-graph Gaussian SPA is implied"),
                  frames=frames, cases=cases, retainedDiscrepancy=exact,
                  probabilityTraces=probability_traces,
                  categoricalRoundoffPolicy=dict(halfTieTolerance=3e-12,
                      rule="Different data argmax decisions are allowed only when both reference and JS positive marginals lie within 3e-12 of 0.5. Decision-change differences require complete per-iteration trace verification and must be wholly explained by such ties. Raw decisions/probabilities are preserved. All other categorical fields match exactly."))
    target = ROOT / "fixtures/full-output-oracles.json"
    target.write_text(json.dumps(output, indent=2, allow_nan=False)+"\n")
    report = dict(all_passed=True, fixture_count=len(cases), frame_count=len(frames),
                  reference_sha256=PINNED_SHA, fixture_sha256=sha(target),
                  independent_scalar_maximum_probability_error=max(x["max_absolute_probability_error"] for x in scalar_records),
                  independent_scalar_comparisons=scalar_records, independent_source_checks=source_checks,
                  retained_discrepancy=dict(maximum_marginal_gap=gap, mean_bernoulli_kl=kl,
                                            status=discrepancy["status"], iterations=discrepancy["iterations"]),
                  separation="Full-output port parity is distinct from independent scalar and exact mathematical checks.")
    (ROOT / "reports/oracle-generation.json").write_text(json.dumps(report, indent=2)+"\n")
    print(json.dumps({k:v for k,v in report.items() if k not in ("independent_scalar_comparisons", "independent_source_checks")}, indent=2))


def verify_runtime(path):
    reference, audit, scalar = pinned_modules()
    payload = json.loads(path.read_text())
    if "referenceSha256" in payload:
        assert payload["referenceSha256"] == PINNED_SHA, "Runtime export reference hash differs"
    if "receiverSha256" in payload:
        assert payload["receiverSha256"] == sha(ROOT / "js/receiver.js"), "Runtime export predates current JS receiver"
    runs = payload.get("runs", [payload] if "input" in payload and "result" in payload else [])
    assert runs, "Runtime export must contain runs:[{input,result}], or input/result"
    existing = json.loads((ROOT / "fixtures/full-output-oracles.json").read_text())
    frozen_inputs = {json.dumps(c["input"]["y"], separators=(",", ":")) for c in existing["cases"]}
    records = []
    for index, run in enumerate(runs):
        value = run["input"]
        assert json.dumps(value["y"], separators=(",", ":")) not in frozen_inputs, "Runtime observation is a fixture replay"
        expected = encode_output(reference.sparse_spa(**python_input(value)))
        errors = check_numbers(run["result"], expected)
        independent = independent_probabilities(scalar, value, expected["iterations"])
        actual = np.array(run["result"]["probabilities"]).reshape(-1,2)
        scalar_error = float(np.max(abs(independent-actual)))
        assert scalar_error < 3e-12
        frame_check = None
        estimate_check = None
        variance_check = None
        frame = run.get("evaluatorOnly", payload.get("evaluatorOnly"))
        if frame is not None:
            x = unpacked(frame["transmittedSymbols"]).reshape(value["shape"])
            noise = unpacked(frame["noise"]).reshape(value["shape"])
            gains = unpacked(frame["trueGains"])
            y = audit.direct_frame(x, frame["physicalSupport"], gains)+noise
            frame_check = float(np.max(abs(y-unpacked(value["y"]).reshape(value["shape"]))))
            assert frame_check < 3e-12
            variant = run.get("receiverVariant")
            if variant == "supplied_perfect_csi":
                assert value["support"] == frame["physicalSupport"], "Supplied-CSI oracle must use explicitly supplied physical support"
                estimate_check = float(np.max(abs(gains-unpacked(value["estimatedGains"]))))
                variance_check = float(np.max(abs(np.asarray(value["gainVariance"]))))
            elif variant in ("moment_repaired", "ignored_uncertainty", "literal_operational") and "priorPowers" in frame:
                xp = complex(*value["pilot"])
                ah = np.array([y[audit.add(tuple(value["pilotIndex"]), s, tuple(value["shape"]))]/xp for s in value["support"]])
                lam = np.asarray(frame["priorPowers"])
                variance = (value["Es"]*(lam.sum()-lam)+value["N0"])/abs(xp)**2
                estimate_check = float(np.max(abs(ah-unpacked(value["estimatedGains"]))))
                variance_check = float(np.max(abs(variance-np.asarray(value["gainVariance"]))))
            if estimate_check is not None:
                assert estimate_check < 3e-12
                assert variance_check < 3e-12
        records.append(dict(id=run.get("id",str(index)), full_output_parity=errors,
                            independent_scalar_maximum_probability_error=scalar_error,
                            independent_raw_frame_maximum_error=frame_check,
                            independent_gain_estimate_maximum_error=estimate_check,
                            independent_gain_variance_maximum_error=variance_check,
                            status=expected["status"], iterations=expected["iterations"], pass_=True))
    report = dict(all_passed=True, schema="sensing-assisted-otfs-runtime-independent-check-v1",
                  input_file=path.name, input_sha256=sha(path), reference_sha256=PINNED_SHA,
                  receiver_sha256=payload.get("receiverSha256"),
                  nonfixture_observation_verified=True, seed=payload.get("seed"),
                  runs=records, limitations="The full-output reference comparison and separate scalar probabilities validate the port, not exact posterior inference.")
    (ROOT / "reports/oracle-runtime-verification.json").write_text(json.dumps(report, indent=2)+"\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify-runtime", type=Path)
    args = parser.parse_args()
    if args.verify_runtime:
        verify_runtime(args.verify_runtime)
    else:
        generate()
