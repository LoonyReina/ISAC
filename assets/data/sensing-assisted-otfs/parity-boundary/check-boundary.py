#!/usr/bin/env python3
"""Expected-rejection regression, NOT a numerical-parity acceptance checker.

Run with Python 3.12 and NumPy 2.3.5. Supply unchanged public checker/reference.
Exit 0 means the preserved failure, its exact scope and accepted control persist.
The failed native record's scientific parity gate remains FAILED_UNCHANGED.
No high-precision or perturbation algorithm is executed by this script.
"""
import argparse
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import subprocess
import sys

sys.dont_write_bytecode = True
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


def check_cli(bundle, oracle, reference):
    reports = []
    env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', 'OPENBLAS_NUM_THREADS': '1', 'OMP_NUM_THREADS': '1'}
    for record, expected, code in [
        ('native-original.json', 'original-checker-output.json', 1),
        ('native-rerun.json', 'rerun-checker-output.json', 1),
        ('accepted-control.json', 'accepted-checker-output.json', 0),
    ]:
        result = subprocess.run([sys.executable, str(oracle), str(bundle / record), '--reference', str(reference)], env=env, capture_output=True, timeout=120)
        need(result.returncode == code, record + ': unexpected checker exit (never treated as acceptance)')
        need(result.stdout == (bundle / expected).read_bytes(), record + ': checker output bytes changed')
        need(not result.stderr, record + ': unexpected checker stderr')
        report = json.loads(result.stdout)
        need(report['numericalParity'] is (code == 0), record + ': unexpected scientific gate')
        reports.append({'record': record, 'checkerExit': code, 'numericalParity': report['numericalParity'], 'receiverRecordsBeforeStop': report['receiverRecords']})
    return reports


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
    prior = expected['baselineReceiverCensus']
    for key in totals:
        need(totals[key] == prior[key], 'Exact precomputed census changed: ' + key)
    need(len(receiver_rows) == 16, 'Missing receiver outputs')
    for row, saved in zip(receiver_rows, expected['receivers']):
        need(all(row[k] == saved[k] for k in row), 'Receiver failure scope changed')
    affected = [dict(frame=x['frame'], mode=x['mode'], strictViolations=x['strictViolations']) for x in receiver_rows if x['strictViolations']]
    need(affected == [dict(frame=2, mode='literal_operational', strictViolations=10), dict(frame=3, mode='literal_operational', strictViolations=1)], 'Unexpected affected receivers')
    return dict(receiverRecords=16, numericValues=totals['numericValues'], strictViolations=len(totals['violations']), affectedReceivers=affected, nativeCodecTextByteIdentical=True, rawBitsIncludingSignedZeroExact=all(all(row.values()) for row in raw_bits), hardDecisionsStatusesMetricsUnchanged=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--oracle', type=Path, required=True)
    parser.add_argument('--reference', type=Path, required=True)
    parser.add_argument('--bundle', type=Path, default=Path(__file__).resolve().parent)
    options = parser.parse_args()
    try:
        bundle, oracle, reference = options.bundle.resolve(), options.oracle.resolve(), options.reference.resolve()
        verify_files(bundle, oracle, reference)
        cli = check_cli(bundle, oracle, reference)
        diagnostic = census(bundle, oracle, reference)
        print(json.dumps(dict(expectedRejectionRegression='passed', scientificParityGate='FAILED_UNCHANGED', acceptedControlParity=True, checkerRuns=cli, census=diagnostic, scope='Preserved-failure regression only; no new native-browser or high-precision computation.'), indent=2))
        return 0
    except Exception as error:
        print(json.dumps(dict(expectedRejectionRegression='failed', scientificParityGate='NOT_UPGRADED', error=f'{type(error).__name__}: {error}'), indent=2))
        return 1


if __name__ == '__main__':
    sys.exit(main())
