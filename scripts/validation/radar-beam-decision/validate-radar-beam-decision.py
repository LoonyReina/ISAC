#!/usr/bin/env python3
"""Independent stdlib Python check of the synthetic browser model.

Implements the specified Mulberry32/Box–Muller stream and sampling independently;
this is NOT the original prototype's NumPy PCG64 stream or score reproduction.
Checks default + 40 seed/control configurations against actual Node core output.
No measured data, author code, package dependencies, browser, or network required.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = dict(seed=37, elements=16, beams=64, scenes=3, runsPerScene=12,
               framesPerRun=64, trainBudget=512, neighbors=7, sceneShift=.12,
               runShift=.04, contextWeight=.18, noiseSd=.006,
               lossThresholdDb=3, tieTolerance=1e-12)
MODES = ['interleaved_frames', 'held_trajectories', 'held_scene']
BUDGETS = [1, 3, 5, 8, 16, 64]
MASK = (1 << 32) - 1


class Rng:
    def __init__(self, seed):
        self.state, self.spare = seed & MASK, None

    def uniform(self):
        self.state = (self.state + 0x6d2b79f5) & MASK
        t = self.state
        t = ((t ^ (t >> 15)) * (t | 1)) & MASK
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & MASK)) & MASK
        return ((t ^ (t >> 14)) & MASK) / 4294967296

    def normal(self):
        if self.spare is not None:
            value, self.spare = self.spare, None
            return value
        radius = math.sqrt(-2 * math.log(1 - self.uniform()))
        phase = 2 * math.pi * self.uniform()
        self.spare = radius * math.sin(phase)
        return radius * math.cos(phase)


def sinc(x):
    return 1 if x == 0 else math.sin(math.pi * x) / (math.pi * x)


def powers(u, beam_u, elements):
    result = []
    for center in beam_u:
        delta = u - center
        d = delta - 2 * math.floor(delta / 2 + .5)
        result.append((sinc(elements * d / 2) / sinc(d / 2)) ** 2)
    return result


def rank(power, tolerance=1e-12):
    remaining = set(range(len(power)))
    output = []
    while remaining:
        anchor = max(power[i] for i in remaining)
        chosen = min(i for i in remaining if power[i] >= anchor - tolerance)
        output.append(chosen)
        remaining.remove(chosen)
    return output


def label(power, tolerance=1e-12):
    anchor = max(power)
    return next(i for i, value in enumerate(power) if value >= anchor - tolerance)


def generate(cfg):
    rng = Rng(cfg['seed'])
    beam_u = [-.95 + 1.9 * j / (cfg['beams'] - 1) for j in range(cfg['beams'])]
    rows = []
    for scene in range(cfg['scenes']):
        context = 2 * scene / (cfg['scenes'] - 1) - 1
        for run in range(cfg['runsPerScene']):
            run_context = 2 * rng.uniform() - 1
            run_offset = cfg['runShift'] * (2 * rng.uniform() - 1)
            jitter = .04 * rng.uniform() - .02
            direction, noise = (1 if run % 2 == 0 else -1), 0
            for frame in range(cfg['framesPerRun']):
                true_u = direction * (-.8 + 1.6 * frame / (cfg['framesPerRun'] - 1)) + jitter
                noise = .8 * noise + .6 * cfg['noiseSd'] * rng.normal()
                x = [true_u + cfg['sceneShift'] * context + run_offset + noise,
                     cfg['contextWeight'] * context, cfg['contextWeight'] * run_context]
                power = powers(true_u, beam_u, cfg['elements'])
                rows.append(dict(id=len(rows), scene=scene, run=run, frame=frame,
                                 trueU=true_u, x=x, power=power,
                                 label=label(power, cfg['tieTolerance'])))
    return rows, beam_u


def split(rows, cfg, mode):
    def target(row):
        return row['scene'] == cfg['scenes'] - 1 and row['run'] >= cfg['runsPerScene'] - 4
    anchors = [i for i, row in enumerate(rows) if target(row) and row['frame'] % 4 == 2]
    anchor_set = set(anchors)
    pool = [i for i, row in enumerate(rows) if i not in anchor_set
            and not (mode == 'held_trajectories' and target(row))
            and not (mode == 'held_scene' and row['scene'] == cfg['scenes'] - 1)]
    assert len(pool) >= cfg['trainBudget']
    rng = Rng(cfg['seed'] + 1009)
    for i in range(cfg['trainBudget']):
        j = i + math.floor(rng.uniform() * (len(pool) - i))
        pool[i], pool[j] = pool[j], pool[i]
    return sorted(pool[:cfg['trainBudget']]), anchors


def predict(training_x, training_labels, queries, beam_u, cfg):
    output = []
    for query in queries:
        distances = [sum((value - query[j]) ** 2 for j, value in enumerate(x))
                     for x in training_x]
        nearest = sorted(range(len(training_x)), key=lambda i: (distances[i], i))[:cfg['neighbors']]
        numerator, denominator = 0, 0
        for i in nearest:
            weight = 1 / (distances[i] + 1e-6)
            numerator += weight * beam_u[training_labels[i]]
            denominator += weight
        estimate = numerator / denominator
        output.append(dict(estimatedU=estimate,
                           ranking=rank(powers(estimate, beam_u, cfg['elements']), cfg['tieTolerance'])))
    return output


def loss(best, achieved):
    return math.inf if achieved == 0 else 10 * (math.log10(best) - math.log10(achieved))


def metrics(rows, anchors, predictions, cfg, k):
    hits, losses = [], []
    for i, prediction in zip(anchors, predictions):
        selected = prediction['ranking'][:k]
        hits.append(rows[i]['label'] in selected)
        power = rows[i]['power']
        losses.append(loss(max(power), max(power[j] for j in selected)))
    sorted_loss = sorted(losses)
    offset = (len(losses) - 1) * .95
    lo, hi = math.floor(offset), math.ceil(offset)
    p95 = sorted_loss[lo] + (offset - lo) * (sorted_loss[hi] - sorted_loss[lo])
    return dict(k=k, count=len(anchors), topKHitRate=sum(hits) / len(hits),
                beamMissRate=1 - sum(hits) / len(hits), meanLossDb=sum(losses) / len(losses),
                p95LossDb=p95, lossAboveThresholdRate=sum(x > cfg['lossThresholdDb'] for x in losses) / len(losses),
                lossThresholdDb=cfg['lossThresholdDb'], probeFraction=k / cfg['beams'],
                idealProbeCountSavedFraction=1 - k / cfg['beams'])


NODE_SNAPSHOT = r"""
const c = require('./radar-beam-decision-core.js');
const cfg = c.normalizeConfig(JSON.parse(process.argv[1]));
const dataset = c.generate(cfg);
const output = {beamU:dataset.beamU,
 rows:dataset.rows.map(({id,scene,run,frame,trueU,x,label})=>({id,scene,run,frame,trueU,x,label})),
 powerSamples:[0,17,511,1038,2047,2266,2303].map(i=>({i,power:dataset.rows[i].power})), modes:{}};
for (const mode of c.MODES) {
 const split=c.splitIndices(dataset,cfg,mode);
 const predictions=c.predictRankings(dataset,split.train,split.test,cfg);
 const result={config:cfg,mode,dataset,train:split.train,test:split.test,predictions};
 output.modes[mode]={train:split.train,test:split.test,predictions,
 splitSummary:c.describeSplit(dataset,split),
 metrics:[1,3,5,8,16,64].map(k=>{const m=c.metrics(result,k);delete m.perSample;return m;})};
}
console.log(JSON.stringify(output));
"""


def compare_numbers(a, b, tolerance=2e-12):
    assert abs(a - b) <= tolerance, (a, b, abs(a - b))
    return abs(a - b)


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, separators=(',', ':')).encode()).hexdigest()


def validate_setting(cfg):
    actual = json.loads(subprocess.check_output(['node', '-e', NODE_SNAPSHOT, json.dumps(cfg)], cwd=ROOT, text=True))
    rows, beam_u = generate(cfg)
    max_feature_error, max_power_error, max_estimate_error, max_metric_error = 0, 0, 0, 0
    assert actual['beamU'] == beam_u
    assert len(rows) == len(actual['rows'])
    for expected, received in zip(rows, actual['rows']):
        for key in ['id', 'scene', 'run', 'frame', 'label']:
            assert expected[key] == received[key], (key, expected['id'])
        max_feature_error = max(max_feature_error, compare_numbers(expected['trueU'], received['trueU']))
        for a, b in zip(expected['x'], received['x']):
            max_feature_error = max(max_feature_error, compare_numbers(a, b))
        assert all(0 <= p <= 1 + 1e-12 for p in expected['power'])
    for sample in actual['powerSamples']:
        for a, b in zip(rows[sample['i']]['power'], sample['power']):
            max_power_error = max(max_power_error, compare_numbers(a, b))
    summaries, first_test = {}, None
    for mode in MODES:
        train, anchors = split(rows, cfg, mode)
        assert len(train) == cfg['trainBudget'] and len(set(train)) == cfg['trainBudget']
        assert not set(train) & set(anchors)
        if first_test is None:
            first_test = anchors
        assert anchors == first_test
        received = actual['modes'][mode]
        assert received['train'] == train and received['test'] == anchors
        expected_predictions = predict([rows[i]['x'] for i in train], [rows[i]['label'] for i in train],
                                       [rows[i]['x'] for i in anchors], beam_u, cfg)
        for expected, prediction in zip(expected_predictions, received['predictions']):
            assert expected['ranking'] == prediction['ranking'], (cfg['seed'], mode, 'rank mismatch')
            max_estimate_error = max(max_estimate_error, compare_numbers(expected['estimatedU'], prediction['estimatedU']))
        evaluated = []
        for k, browser_metric in zip(BUDGETS, received['metrics']):
            expected = metrics(rows, anchors, expected_predictions, cfg, k)
            for key in expected:
                max_metric_error = max(max_metric_error, compare_numbers(expected[key], browser_metric[key], 2e-9))
            evaluated.append(browser_metric)
        for a, b in zip(evaluated, evaluated[1:]):
            assert a['topKHitRate'] <= b['topKHitRate']
            assert a['meanLossDb'] + 1e-12 >= b['meanLossDb']
            assert a['p95LossDb'] + 1e-12 >= b['p95LossDb']
        endpoint = evaluated[-1]
        assert endpoint['topKHitRate'] == 1 and endpoint['meanLossDb'] == 0 and endpoint['probeFraction'] == 1
        summaries[mode] = dict(trainCount=len(train), testCount=len(anchors),
                               trainIndicesSha256=fingerprint(train), testIndicesSha256=fingerprint(anchors),
                               rankingSha256=fingerprint([p['ranking'] for p in expected_predictions]),
                               splitSummary=received['splitSummary'], metrics=evaluated)
    return dict(seed=cfg['seed'], sceneShift=cfg['sceneShift'], runShift=cfg['runShift'],
                contextWeight=cfg['contextWeight'],
                maximumAbsoluteDifferences=dict(feature=max_feature_error, sampledPower=max_power_error,
                                                estimatedU=max_estimate_error, metrics=max_metric_error),
                results=summaries)


def formula_checks():
    codebook = [-.95 + 1.9 * j / 63 for j in range(64)]
    for j in range(63):
        power = powers((codebook[j] + codebook[j + 1]) / 2, codebook, 16)
        assert label(power) == j and rank(power)[0] == j
    assert rank([0, .75, 1.5], 1) == [1, 2, 0]
    # Check the scalar sinc formula independently against the complex ULA sum.
    max_sum_error = 0
    for u in [-.817, -.31, 0, .28, .816]:
        for center, received in zip(codebook, powers(u, codebook, 16)):
            terms = [complex(math.cos(math.pi * m * (center - u)), math.sin(math.pi * m * (center - u))) for m in range(16)]
            direct = abs(sum(terms) / 16) ** 2
            max_sum_error = max(max_sum_error, compare_numbers(received, direct, 3e-14))
    assert math.isinf(loss(1, 0))
    best, achieved = .9960103361670658, 3.1550589621386463e-13
    seed49_loss = loss(best, achieved)
    compare_numbers(seed49_loss, 124.99256365562623, 1e-10)
    return dict(all63MidpointTies=True, nontransitiveTieFixture=True,
                complexSumMaximumAbsoluteError=max_sum_error, exactZeroLoss='Infinity',
                seed49PrototypeFixture=dict(source='Original NumPy PCG64 prototype: held_scene row 2266, chosen beam 40; fixed metric fixture only, not JS-generated sample membership',
                                            bestPower=best, achievedPower=achieved, uncappedLossDb=seed49_loss))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'data/radar-beam-decision-validation.json')
    args = parser.parse_args()
    formula = formula_checks()
    default = validate_setting(DEFAULT)
    sweep = []
    for seed in range(20):
        for control in ['shifted', 'zero_shifts']:
            cfg = {**DEFAULT, 'seed': seed}
            if control == 'zero_shifts':
                cfg.update(sceneShift=0, runShift=0)
            result = validate_setting(cfg)
            result['control'] = control
            # Preserve each dynamically calculated result, without ordering assertions.
            sweep.append(result)
            print(f"passed seed {seed:2} / {control}", flush=True)
    record = dict(identity='Independent synthetic teaching-model validation, not a real-data or paper reproduction',
                  schemaVersion=1, validatedDate='2026-10-11', status='passed',
                  commands=['node --test tests/radar-beam-decision.test.cjs',
                            'python3 scripts/validate-radar-beam-decision.py'],
                  numericUnitTests=17, settingsCompared=41, sweepSettings=40,
                  sourceSha256={name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in
                                ['radar-beam-decision-core.js', 'tests/radar-beam-decision.test.cjs',
                                 'scripts/validate-radar-beam-decision.py']},
                  rng='Mulberry32 uint32 + cached Box–Muller + partial Fisher–Yates; independently reimplemented in Python stdlib; not bit-identical to original NumPy PCG64 prototype',
                  comparison='Every row metadata, feature, true direction and label; all train/test indices, estimated coordinates and complete rankings; seven full power vectors per setting; aggregate metrics at K=1,3,5,8,16,64',
                  tolerances=dict(featuresPowersAndEstimatesAbsolute=2e-12, aggregateMetricsAbsolute=2e-9),
                  formulaChecks=formula, defaultConfig=DEFAULT, default=default, seedControlSweep=sweep,
                  qualifications=['No score ordering imposed between split protocols.',
                                  'Only four correlated held-out passes; no iid frame confidence intervals.',
                                  'Metadata invariance is an interface check; fabricated stable context remains group-informative.',
                                  'Metric powers are uncapped; any visualization dB floor is display-only.',
                                  'Supported ULA geometry uses true/beam direction cosines in [-1,1]; biased sensor features may exceed that interval.',
                                  'Supported config: scene/run shifts and context weight 0..2, noise SD 0..1, power-tie tolerance 0..1e-6; invalid sparse inputs and numeric overflow are rejected.',
                                  'This report contains numerical checks only, not browser, accessibility, deployment or measured-radio validation.'])
    args.output.write_text(json.dumps(record, ensure_ascii=False, indent=2, allow_nan=False) + '\n')
    print(f"Passed default + 40 seed/control comparisons; wrote {args.output}")


if __name__ == '__main__':
    main()
