#!/usr/bin/env python3
"""Version 3 diagnostic-retention wrapper; NOT parity acceptance.

The v1 evidence, original oracle and reference remain immutable. The same
original scalar comparator, eleven violated paths, receiver statuses, decisions,
metrics, input bits and accepted control are mandatory. Runtime floating-point
diagnostics are disclosed separately from the frozen historical observations.
See ../parity-boundary-v2/PORTABILITY.md and DIAGNOSTICS.md. No scientific tolerance or receiver algorithm is changed.
"""
import argparse
import base64
import hashlib
import importlib.util
import json
import math
import os
import platform
import re
from pathlib import Path
import subprocess
import sys

sys.dont_write_bytecode = True
# Pin thread count before NumPy initializes; do not override CPU dispatch.
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['OMP_NUM_THREADS'] = '1'
import numpy as np

ORACLE_SHA = 'c0315b3722073dddfede9ccdaecdae3629e40710983d4d88310313fa257ef321'
REFERENCE_SHA = 'c83ba035ee49d8011c2b3b8f5f0260b7e95fd2fb562781f03e63a1ea7407ddce'
NATIVE_SHA = {
    'native-original.json': 'da5942c27a0b7420501b73be6e2c1de369860933d405df2a333e790762b10e2e',
    'native-rerun.json': '34c3334b56543638ce26fb8befb0fef13cb1b410056a5f377da039f60561e4f4',
    'accepted-control.json': 'f51707c85e0b98f12a40a81091f35b9705670e6f639b501f35774b9abd6628d0',
}


def need(ok, message):
    if not ok:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text())


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def verify_files(bundle, oracle, reference):
    need(sha(oracle) == ORACLE_SHA, 'Unchanged checker identity required')
    need(sha(reference) == REFERENCE_SHA, 'Unchanged reference identity required')
    need(sha(bundle / 'MANIFEST.json') == 'e83a8d57a103130735c59b3f566751889ec177baad649dd1eefbf10dcfd37214', 'Frozen evidence manifest bytes changed')
    manifest = read(bundle / 'MANIFEST.json')
    entries = manifest['files']
    names = [x['file'] for x in entries]
    need(len(names) == len(set(names)), 'Duplicate manifest file')
    for row in entries:
        name = row['file']
        need(Path(name).name == name and name not in ('.', '..'), 'Unsafe manifest file')
        file = bundle / name
        need(file.is_file() and not file.is_symlink(), 'Missing/unsafe artifact: ' + name)
        need(file.stat().st_size == row['bytes'] and sha(file) == row['sha256'], 'Artifact bytes changed: ' + name)
    for name, identity in NATIVE_SHA.items():
        need(name in names and sha(bundle / name) == identity, 'Native record bytes changed: ' + name)
    return manifest


def check_report(report, expected, O, record):
    """Exact report semantics; float diagnostics use the unchanged comparator.

    The exception must be the same failed scalar, with its immutable browser
    value, recomputed delta and still-failing ORIGINAL tolerance. The reference
    value itself must remain within that original comparator of the historical
    reference. No unknown report field or changed count/status is permitted.
    """
    need(type(report) is dict and set(report) == set(expected), record + ': checker report fields changed')
    for key, wanted in expected.items():
        actual = report[key]
        if key == 'maximumAbsoluteError':
            need(type(actual) is float and math.isfinite(actual) and actual >= 0, record + ': invalid maximum error')
            O.close(actual, wanted, record + '.maximumAbsoluteError')
        elif key == 'error':
            pattern = r'ValueError: (frame\[\d+\]\.literal_operational\.(?:probabilities\[\d+\]|history\[\d+\]\.\w+)): np\.float64\(([^()]+)\) != ([^,]+), delta=(.+)'
            a, b = re.fullmatch(pattern, actual), re.fullmatch(pattern, wanted)
            need(a is not None and b is not None and a[1] == b[1], record + ': first rejection path/type changed')
            browser, reference, delta = map(float, a.groups()[1:])
            old_browser, old_reference, _ = map(float, b.groups()[1:])
            need(all(math.isfinite(x) for x in [browser, reference, delta]), record + ': nonfinite rejection')
            need(browser == old_browser, record + ': rejected browser value changed')
            O.close(reference, old_reference, record + '.rejectedReference')
            need(delta == abs(browser - reference), record + ': rejection delta inconsistent')
            need(delta > 3e-12 + 2e-11*abs(reference), record + ': scalar no longer strictly rejected')
        else:
            need(type(actual) is type(wanted) and actual == wanted, record + ': checker field changed: ' + key)


def checker_diagnostic(record, code, stdout, stderr):
    return json.dumps(dict(record=record, checkerExit=code, stdout=stdout.decode('utf-8', 'replace'), stderr=stderr.decode('utf-8', 'replace'), stdoutBase64=base64.b64encode(stdout).decode('ascii'), stderrBase64=base64.b64encode(stderr).decode('ascii')))


def check_cli(bundle, oracle, reference):
    reports = []
    O = load('boundary_v2_report_oracle', oracle)
    env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', 'OPENBLAS_NUM_THREADS': '1', 'OMP_NUM_THREADS': '1'}
    for record, expected, code in [
        ('native-original.json', 'original-checker-output.json', 1),
        ('native-rerun.json', 'rerun-checker-output.json', 1),
        ('accepted-control.json', 'accepted-checker-output.json', 0),
    ]:
        try:
            result = subprocess.run([sys.executable, str(oracle), str(bundle / record), '--reference', str(reference)], env=env, capture_output=True, timeout=120)
        except subprocess.TimeoutExpired as error:
            raise ValueError(record + ': checker timed out; ' + checker_diagnostic(record, None, error.stdout or b'', error.stderr or b'')) from error
        # Keep actual stdout/stderr in any failure, unlike the v1 byte-only error.
        diagnostic = checker_diagnostic(record, result.returncode, result.stdout, result.stderr)
        need(result.returncode == code, record + ': unexpected checker exit; ' + diagnostic)
        need(not result.stderr, record + ': unexpected checker stderr; ' + diagnostic)
        try:
            report = O.load_json(result.stdout.decode('utf-8'))
            check_report(report, read(bundle / expected), O, record)
        except Exception as error:
            raise ValueError(str(error) + '; ' + diagnostic) from error
        need(report['numericalParity'] is (code == 0), record + ': unexpected scientific gate')
        reports.append({'record': record, 'checkerExit': code, 'numericalParity': report['numericalParity'], 'receiverRecordsBeforeStop': report['receiverRecords'], 'historicalOutputByteIdentical': result.stdout == (bundle / expected).read_bytes(), 'runtimeReport': report})
    return reports


def check_census_contract(totals, receiver_rows, expected, O):
    prior = expected['baselineReceiverCensus']
    need(totals['numericValues'] == prior['numericValues'] == 28528, 'Full scalar census changed')
    need(type(totals['exactEqual']) is int and 0 <= totals['exactEqual'] <= totals['numericValues'], 'Invalid exact-equality diagnostic')
    live, saved = totals['violations'], prior['violations']
    need(len(live) == len(saved) == 11, 'Exactly eleven original violations required: ' + json.dumps(live))
    for actual, wanted in zip(live, saved):
        label = wanted['path']
        need(set(actual) == set(wanted), 'Violation fields changed: ' + label)
        need(actual['path'] == label and actual['browser'] == wanted['browser'], 'Violation path/browser changed: ' + label)
        O.close(actual['reference'], wanted['reference'], 'Runtime reference drift: ' + label)
        delta = abs(actual['browser'] - actual['reference'])
        tolerance = 3e-12 + 2e-11*abs(actual['reference'])
        need(actual['absDelta'] == delta and actual['tolerance'] == tolerance and actual['ratio'] == delta/tolerance, 'Violation diagnostic inconsistent: ' + label)
        need(delta > tolerance, 'Original strict violation disappeared: ' + label)
    need(len(receiver_rows) == len(expected['receivers']) == 16, 'Missing receiver outputs')
    for row, old in zip(receiver_rows, expected['receivers']):
        for key in ['frame', 'mode', 'strictViolations']:
            need(type(row[key]) is type(old[key]) and row[key] == old[key], 'Receiver failure scope changed: ' + key)
        for key in ['probabilityMaxDelta', 'historyMaxDelta']:
            need(type(row[key]) is float and math.isfinite(row[key]) and row[key] >= 0, 'Invalid runtime receiver diagnostic: ' + key)
    need(math.isfinite(totals['maximumAbsoluteError']) and totals['maximumAbsoluteError'] >= 0, 'Invalid runtime maximum')
    # The maxima and exact-equality count are freshly calculated diagnostic
    # observations, not scientific acceptance thresholds. Disclose both runs.
    return dict(runtime=totals, historical=prior, receivers=receiver_rows)


def census(bundle, oracle, reference):
    """Read-only full census; each scalar uses the ORIGINAL oracle comparator.

    Catch a comparison failure only to count it; never patch the comparator,
    return acceptance, or replace the separate unmodified checker invocation.
    """
    O, R = load('boundary_original_oracle', oracle), load('boundary_original_reference', reference)
    original, rerun = read(bundle / 'native-original.json'), read(bundle / 'native-rerun.json')
    expected = read(bundle / 'PRECOMPUTED.json')
    need(original['input']['text'] == rerun['input']['text'], 'Native input codec text changed')
    need(original['payload']['text'] == rerun['payload']['text'], 'Native payload codec text changed')
    need(original['counts'] == rerun['counts'], 'Native receiver counts changed')
    need(rerun['parentRunId'] == original['runId'], 'Rerun parent changed')
    c, out = O.unpack(original['input'], 'input'), O.unpack(original['payload'], 'payload')
    need(c == expected['configuration'], 'Exact controls changed')
    L, P = O.config(c, 'run')
    rng, primitives = O.RNG(c['seed']), []
    for _ in range(c['frames']):
        signs = np.array([-1 if rng.uniform() < .5 else 1 for _ in range(L)], np.int8)
        gains, noise = np.empty(2 * P), np.empty(2 * L)
        for p in range(P):
            scale = math.sqrt(c['priorPowers'][p] / 2)
            gains[2*p], gains[2*p+1] = rng.normal()*scale, rng.normal()*scale
        for t in range(L):
            noise[2*t], noise[2*t+1] = rng.normal()/math.sqrt(2), rng.normal()/math.sqrt(2)
        primitives.append((signs, gains, noise))
    totals = {'numericValues': 0, 'exactEqual': 0, 'maximumAbsoluteError': 0., 'violations': []}
    receiver_rows, raw_bits = [], []

    def compare(actual, wanted, label, stats):
        if isinstance(wanted, dict):
            need(type(actual) is dict and set(actual) == set(wanted), label + ': fields differ')
            for key, val in wanted.items():
                compare(actual[key], val, label + '.' + key, stats)
        elif isinstance(wanted, (list, tuple, np.ndarray)):
            need(isinstance(actual, (list, np.ndarray)) and len(actual) == len(wanted), label + ': shape differs')
            for k, val in enumerate(wanted):
                compare(actual[k], val.item() if isinstance(val, np.generic) else val, f'{label}[{k}]', stats)
        else:
            numeric = isinstance(wanted, (int, float, np.number)) and not isinstance(wanted, (bool, np.bool_))
            if not numeric:
                O.close(actual, wanted, label)
                return
            difference = abs(float(actual) - float(wanted))
            stats['numericValues'] += 1
            stats['exactEqual'] += int(difference == 0)
            stats['maximumAbsoluteError'] = max(stats['maximumAbsoluteError'], difference)
            try:
                O.close(actual, wanted, label)
            except ValueError:
                # This is diagnosis of failure, not a widened comparison rule.
                tolerance = 0. if type(wanted) is int else 3e-12 + 2e-11*abs(float(wanted))
                need(math.isfinite(difference) and difference > tolerance, label + ': non-tolerance failure')
                stats['violations'].append({'path': label, 'browser': float(actual), 'reference': float(wanted), 'absDelta': difference, 'tolerance': tolerance, 'ratio': difference/tolerance if tolerance else None})

    for j, frame in enumerate(out['frames']):
        signs, gains, standard_noise = primitives[j // len(c['normalizations'])]
        Es = c['dataEnergy'] if frame['normalization'] == 'source_per_data' else L*c['dataEnergy']/(L-1+c['pilotPowerRatio'])
        Ep = Es*c['pilotPowerRatio']
        pilot = complex(math.sqrt(Ep)*math.cos(c['pilotPhase']), math.sqrt(Ep)*math.sin(c['pilotPhase']))
        q = c['pilotIndex'][0]*c['shape'][1]+c['pilotIndex'][1]
        rawx = np.zeros(2*L)
        rawx[::2], rawx[2*q:2*q+2] = signs*math.sqrt(Es), [pilot.real, pilot.imag]
        noise = standard_noise*math.sqrt(c['N0'])
        x = O.complex_array(rawx).reshape(c['shape'])
        y = R.raw_circular_frame(x, c['physicalSupport'], O.complex_array(gains), O.complex_array(noise).reshape(c['shape']))
        bits = {}
        for key, wanted in dict(x=rawx, y=O.packed(y), noise=noise, trueGainsEvaluationOnly=gains, dataSignsEvaluationOnly=signs).items():
            bits[key] = frame[key].dtype == wanted.dtype and frame[key].tobytes() == wanted.tobytes()
            need(bits[key], f'frame[{j}].{key}: raw bits including signed zero changed')
        raw_bits.append(bits)
        ah = R.estimate_effective_gains(y, c['predictedSupport'], c['pilotIndex'], pilot)
        v = R.prior_gain_error_variance(c['priorPowers'], Es, pilot.real**2+pilot.imag**2, c['N0'])
        for record in frame['records']:
            mode = record['mode']
            supplied = mode == 'supplied_perfect_csi'
            args = O.args_for(c, y, pilot, Es, O.complex_array(gains) if supplied else ah, np.zeros(P) if supplied else v, c['physicalSupport'] if supplied else c['predictedSupport'], 'ignored_uncertainty' if supplied else mode)
            r = R.sparse_spa(**args)
            wanted = dict(probabilities=r['probabilities'].ravel(), probabilitiesValidMask=r['probabilities_valid_mask'].astype(np.uint8), knownPilotFlatIndex=r['known_pilot_flat_index'], knownPilotValue=[r['known_pilot_value'].real, r['known_pilot_value'].imag], decisions=O.packed(r['decisions']), status=r['status'], iterations=r['iterations'], history=[{O.HISTORY[k]: val for k, val in row.items()} for row in r['history']], dataMask=r['data_mask'].astype(np.uint8), gainVariance=r['gain_variance'])
            maxima, start = {}, len(totals['violations'])
            for field in O.BASE_RESULT:
                stats = {'numericValues': 0, 'exactEqual': 0, 'maximumAbsoluteError': 0., 'violations': []}
                compare(record[field], wanted[field], f'frame[{j}].{mode}.{field}', stats)
                for key in ['numericValues', 'exactEqual']:
                    totals[key] += stats[key]
                totals['maximumAbsoluteError'] = max(totals['maximumAbsoluteError'], stats['maximumAbsoluteError'])
                totals['violations'].extend(stats['violations'])
                maxima[field] = stats['maximumAbsoluteError']
            need(np.array_equal(record['decisions'], wanted['decisions']), 'Hard decisions changed')
            need(record['status'] == r['status'] == 'iteration_cap' and record['iterations'] == r['iterations'] == 40, 'Status/iteration scope changed')
            need([h['decisionChanges'] for h in record['history']] == [h['decisionChanges'] for h in wanted['history']], 'History decision-change counts changed')
            mask = np.arange(L) != q
            errors = int(np.count_nonzero(r['decisions'][mask] != x.ravel()[mask]))
            metrics = dict(errors=errors, bits=L-1, BER=errors/(L-1), frameErrors=int(errors>0), frames=1, FER=int(errors>0), correctPayloadBits=L-1-errors, capped=True, failureCountedConservatively=False)
            O.close(record['metrics'], metrics, 'metrics', True)
            receiver_rows.append(dict(frame=j, mode=mode, strictViolations=len(totals['violations'])-start, probabilityMaxDelta=maxima['probabilities'], historyMaxDelta=maxima['history']))
    diagnostics = check_census_contract(totals, receiver_rows, expected, O)
    affected = [dict(frame=x['frame'], mode=x['mode'], strictViolations=x['strictViolations']) for x in receiver_rows if x['strictViolations']]
    need(affected == [dict(frame=2, mode='literal_operational', strictViolations=10), dict(frame=3, mode='literal_operational', strictViolations=1)], 'Unexpected affected receivers')
    return dict(receiverRecords=16, numericValues=totals['numericValues'], strictViolations=len(totals['violations']), affectedReceivers=affected, nativeCodecTextByteIdentical=True, rawBitsIncludingSignedZeroExact=all(all(row.values()) for row in raw_bits), hardDecisionsStatusesMetricsUnchanged=True, diagnostics=diagnostics)


def runtime_profile():
    # Runtime diagnostics only. No feature override or replacement arithmetic.
    feature_module = getattr(getattr(np, '_core', None), '_multiarray_umath', None)
    features = getattr(feature_module, '__cpu_features__', {})
    try:
        cpu = next(line.split(':', 1)[1].strip() for line in Path('/proc/cpuinfo').read_text().splitlines() if line.startswith('model name'))
    except (OSError, StopIteration):
        cpu = platform.processor() or 'unavailable'
    return dict(python=sys.version, numpy=np.__version__, machine=platform.machine(), cpu=cpu, numpyEnabledFeatures=sorted(k for k, enabled in features.items() if enabled), numpyDisabledFeatures=os.environ.get('NPY_DISABLE_CPU_FEATURES', ''), openblasCoreType=os.environ.get('OPENBLAS_CORETYPE', 'automatic'), openblasThreads=os.environ['OPENBLAS_NUM_THREADS'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--oracle', type=Path, required=True)
    parser.add_argument('--reference', type=Path, required=True)
    parser.add_argument('--bundle', type=Path, required=True)
    options = parser.parse_args()
    cli = []
    try:
        need(sys.version_info[:2] == (3, 12) and np.__version__ == '2.3.5', 'Supported runtime requires Python 3.12 and NumPy 2.3.5')
        bundle, oracle, reference = options.bundle.resolve(), options.oracle.resolve(), options.reference.resolve()
        verify_files(bundle, oracle, reference)
        cli = check_cli(bundle, oracle, reference)
        diagnostic = census(bundle, oracle, reference)
        print(json.dumps(dict(contractVersion='sensing-otfs-expected-rejection-v3', runtimeProfile=runtime_profile(), expectedRejectionRegression='passed', scientificParityGate='FAILED_UNCHANGED', acceptedControlParity=True, checkerRuns=cli, census=diagnostic, scope='Preserved-failure regression only; no new native-browser or high-precision computation.'), indent=2))
        return 0
    except Exception as error:
        print(json.dumps(dict(contractVersion='sensing-otfs-expected-rejection-v3', runtimeProfile=runtime_profile(), expectedRejectionRegression='failed', scientificParityGate='NOT_UPGRADED', checkerRuns=cli, error=f'{type(error).__name__}: {error}'), indent=2))
        return 1


if __name__ == '__main__':
    sys.exit(main())
