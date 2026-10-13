#!/usr/bin/env python3
"""Adversarial tests of the additive v2 contract and immutable v1 evidence."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[4]
BUNDLE = ROOT / 'assets/data/sensing-assisted-otfs/parity-boundary'
ORACLE = ROOT / 'labs/otfs-sensing-assisted/lesson/tests/record-oracle.py'
REFERENCE = ROOT / 'scripts/validation/sensing-assisted-otfs/prototype-v3/reference-copy/reference.py'
SCRIPT = Path(__file__).with_name('check-boundary-v2.py')
spec = importlib.util.spec_from_file_location('portable_boundary', SCRIPT)
V = importlib.util.module_from_spec(spec)
spec.loader.exec_module(V)
O = V.load('unchanged_test_oracle', ORACLE)


def invoke(extra=None, bundle=BUNDLE, oracle=ORACLE, reference=REFERENCE):
    env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', 'OPENBLAS_NUM_THREADS': '1', 'OMP_NUM_THREADS': '1', **(extra or {})}
    result = subprocess.run([sys.executable, str(SCRIPT), '--bundle', str(bundle), '--oracle', str(oracle), '--reference', str(reference)], env=env, capture_output=True, timeout=120)
    return result.returncode, json.loads(result.stdout), result.stderr


class PortableBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        V.verify_files(BUNDLE, ORACLE, REFERENCE)
        cls.frozen = V.read(BUNDLE / 'PRECOMPUTED.json')
        cls.expected = V.read(BUNDLE / 'original-checker-output.json')
        cls.rows = [{k: row[k] for k in ['frame', 'mode', 'strictViolations', 'probabilityMaxDelta', 'historyMaxDelta']} for row in cls.frozen['receivers']]

    def test_unchanged_oracle_rejects_twice_and_accepts_independent_control(self):
        status, report, stderr = invoke()
        self.assertEqual((status, stderr), (0, b''), report)
        self.assertEqual(report['contractVersion'], 'sensing-otfs-expected-rejection-v2')
        self.assertEqual(report['scientificParityGate'], 'FAILED_UNCHANGED')
        self.assertEqual([(r['checkerExit'], r['numericalParity']) for r in report['checkerRuns']], [(1, False), (1, False), (0, True)])
        self.assertEqual(report['census']['strictViolations'], 11)
        self.assertEqual(report['census']['numericValues'], 28528)
        self.assertEqual(report['census']['affectedReceivers'], [{'frame': 2, 'mode': 'literal_operational', 'strictViolations': 10}, {'frame': 3, 'mode': 'literal_operational', 'strictViolations': 1}])
        self.assertTrue(report['census']['rawBitsIncludingSignedZeroExact'])
        self.assertTrue(report['census']['hardDecisionsStatusesMetricsUnchanged'])
        self.assertIn('numpyEnabledFeatures', report['runtimeProfile'])
        self.assertEqual(report['census']['diagnostics']['historical'], self.frozen['baselineReceiverCensus'])

    def test_documented_no_avx512_report_is_semantic_rejection_not_acceptance(self):
        # Exact observed alternate dispatch diagnostic, not a widened tolerance.
        report = copy.deepcopy(self.expected)
        report['error'] = 'ValueError: frame[2].literal_operational.probabilities[212]: np.float64(0.1531922429515374) != 0.15319224296134318, delta=9.805767309245539e-12'
        V.check_report(report, self.expected, O, 'documented alternate dispatch')
        self.assertIs(report['numericalParity'], False)

    def test_report_rejects_changes_to_semantic_fields_and_numerical_claims(self):
        mutations = [
            ('parity', lambda r: r.update(numericalParity=True)),
            ('count', lambda r: r.update(numericValuesCompared=24701)),
            ('count type', lambda r: r.update(receiverRecords=10.0)),
            ('digest', lambda r: r.update(recordSha256='0'*64)),
            ('source', lambda r: r.update(sourceAuthenticity='verified')),
            ('field', lambda r: r.update(extra='unreviewed')),
            ('maximum', lambda r: r.update(maximumAbsoluteError=1e-3)),
            ('path', lambda r: r.update(error=r['error'].replace('probabilities[212]', 'probabilities[213]'))),
            ('browser', lambda r: r.update(error=r['error'].replace('np.float64(0.1531922429515374)', 'np.float64(0.1531922429515375)'))),
            ('reference', lambda r: r.update(error='ValueError: frame[2].literal_operational.probabilities[212]: np.float64(0.1531922429515374) != 0.5, delta=0.34680775704846256')),
            ('delta', lambda r: r.update(error=r['error'].replace('delta=1.000902138947879e-11', 'delta=9e-11'))),
            ('no strict failure', lambda r: r.update(error='ValueError: frame[2].literal_operational.probabilities[212]: np.float64(0.1531922429515374) != 0.153192242957, delta=' + str(abs(0.1531922429515374-0.153192242957)))),
        ]
        for label, mutate in mutations:
            with self.subTest(label=label):
                report = copy.deepcopy(self.expected)
                mutate(report)
                with self.assertRaises(ValueError):
                    V.check_report(report, self.expected, O, label)

    def test_exact_equality_is_disclosed_but_eleven_paths_remain_mandatory(self):
        totals = copy.deepcopy(self.frozen['baselineReceiverCensus'])
        totals['exactEqual'] = 24310
        output = V.check_census_contract(totals, self.rows, self.frozen, O)
        self.assertEqual(output['runtime']['exactEqual'], 24310)
        self.assertEqual(output['historical']['exactEqual'], 24190)
        totals['violations'].pop()
        with self.assertRaisesRegex(ValueError, 'Exactly eleven original violations'):
            V.check_census_contract(totals, self.rows, self.frozen, O)

    def test_census_rejects_added_moved_or_changed_violations_and_changed_receivers(self):
        for kind in ['count', 'added', 'moved', 'browser', 'reference', 'absDelta', 'tolerance', 'ratio', 'receiver']:
            with self.subTest(kind=kind):
                totals, rows = copy.deepcopy(self.frozen['baselineReceiverCensus']), copy.deepcopy(self.rows)
                if kind == 'count': totals['numericValues'] -= 1
                elif kind == 'added': totals['violations'].append(copy.deepcopy(totals['violations'][0]))
                elif kind == 'moved': totals['violations'][0]['path'] += 'changed'
                elif kind == 'receiver': rows[0]['strictViolations'] = 1
                else: totals['violations'][0][kind] += 0.01
                with self.assertRaises(ValueError):
                    V.check_census_contract(totals, rows, self.frozen, O)

    def test_changed_and_missing_evidence_manifest_or_scientific_source_fail_closed(self):
        with tempfile.TemporaryDirectory(prefix='isac-otfs-v2-evidence-') as directory:
            directory = Path(directory)
            bundle = directory / 'evidence'
            shutil.copytree(BUNDLE, bundle)
            for name in ['native-original.json', 'native-rerun.json', 'accepted-control.json', 'PRECOMPUTED.json', 'original-checker-output.json', 'check-boundary.py', 'MANIFEST.json']:
                with self.subTest(file=name):
                    file = bundle / name
                    original = file.read_bytes()
                    file.write_bytes(original+b'\n')
                    with self.assertRaises(ValueError): V.verify_files(bundle, ORACLE, REFERENCE)
                    file.write_bytes(original)
            (bundle / 'native-rerun.json').unlink()
            with self.assertRaisesRegex(ValueError, 'Missing/unsafe artifact'): V.verify_files(bundle, ORACLE, REFERENCE)
            for name, source in [('oracle', ORACLE), ('reference', REFERENCE)]:
                changed = directory / (name+'.py')
                changed.write_bytes(source.read_bytes()+b'\n# changed\n')
                with self.assertRaisesRegex(ValueError, 'Unchanged (checker|reference) identity required'):
                    V.verify_files(BUNDLE, changed if name == 'oracle' else ORACLE, changed if name == 'reference' else REFERENCE)

    def test_changed_metrics_fail_even_in_direct_census_bypassing_identity_guard(self):
        with tempfile.TemporaryDirectory(prefix='isac-otfs-v2-metric-') as directory:
            bundle = Path(directory)
            shutil.copy(BUNDLE/'PRECOMPUTED.json', bundle/'PRECOMPUTED.json')
            for name in ['native-original.json', 'native-rerun.json']:
                record = V.read(BUNDLE/name)
                payload = json.loads(record['payload']['text'])
                payload['value']['frames'][0]['records'][0]['metrics']['errors'] = 1
                text = json.dumps(payload, separators=(',', ':'))
                record['payload'] = {'text': text, 'bytes': len(text.encode()), 'sha256': hashlib.sha256(text.encode()).hexdigest()}
                (bundle/name).write_text(json.dumps(record))
            with self.assertRaisesRegex(ValueError, 'metrics.errors'):
                V.census(bundle, ORACLE, REFERENCE)


if __name__ == '__main__':
    unittest.main(verbosity=2)
