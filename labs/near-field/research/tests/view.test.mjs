import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  sourcePhaseCurvature, finiteExtent, musicDisplay, MUSIC_FLOOR,
  observationDisplay, communicationPowerBreakdown, evaluationSummary, formatNumber, renderResearch,
} from '../view.mjs';

// Tiny DOM double: tests rendering semantics, escaping and cache behavior, not browser layout/accessibility.
class Element {
  constructor(tag, document) { this.tagName = tag; this.ownerDocument = document; this.children = []; this.attributes = {}; this._text = ''; this.replacements = 0; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(' '); }
  set innerHTML(_) { throw Error('HTML injection is prohibited'); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = children; this._text = ''; this.replacements++; }
  querySelector(selector) { const name = /data-nfr-view="([^"]+)"/.exec(selector)?.[1]; return descendants(this).find(e => e.attributes['data-nfr-view'] === name) ?? null; }
}
function descendants(root) { return root.children.flatMap(child => [child, ...descendants(child)]); }
function dom() {
  const document = { images: [], created: 0, createElement(tag) {
    const e = new Element(tag, this); this.created++;
    if (tag === 'canvas') {
      e.getContext = () => ({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(4 * w * h) }), putImageData: image => { this.images.push(image); } });
      e.toDataURL = () => 'data:image/png;base64,TEST';
    }
    return e;
  }, createElementNS(_namespace, tag) { return this.createElement(tag); } };
  const root = document.createElement('main');
  for (const name of ['status', 'geometry', 'solver', 'history', 'rates', 'waveform', 'observation', 'spectrum', 'eigen', 'refinement', 'evaluation', 'audit', 'provenance']) {
    const e = document.createElement('div'); e.setAttribute('data-nfr-view', name); root.appendChild(e);
  }
  return { root, document, get: name => root.querySelector(`[data-nfr-view="${name}"]`) };
}
const design = JSON.parse(readFileSync(new URL('../runtime/fixtures/source-input.json', import.meta.url), 'utf8'));
function experiment() { return { spec: { designInput: structuredClone(design), scene: { truthXY: [14.2, 14], beta: [1e-5, 0], noiseVariance: 1e-9, seed: 23 }, receiver: { domain: { xMin: 0, xMax: 40, yMin: 0, yMax: 40, stepM: .2 }, options: { refine: true } }, solverOptions: {} }, solution: null, realization: null, observation: null, receiverOutput: null, evaluation: null, historicalOutputs: null, rawAudit: null, trust: { optimizer: 'absent', receiver: 'absent' }, importedRaw: null, importedObservationValid: false }; }
function snapshot(e, extra = {}) { return { experiment: e, status: '尚未计算', busy: null, error: null, progress: [], identity: { design: 'd1', observation: null, receiver: null }, invalidGroups: [], ...extra }; }
function receiver() {
  return { status: 'ok', domain: { xMin: 0, xMax: 40, yMin: 0, yMax: 40, stepM: 20, nx: 3, ny: 3, count: 9 }, denominator: new Float64Array([65, 60, 55, 50, 1, 40, 35, 30, 25]),
    gridEstimate: { xyM: [20, 20], minimumDenominator: 1 }, estimate: { xyM: [19, 19], rangeM: Math.hypot(19, 19), angleRad: Math.PI / 4, minimumDenominator: .9, boundaryHit: false },
    estimateAmbiguity: 'none_detected_on_grid', gridMaxima: { tieCount: 1, tolerance: 1e-10, listed: [{ xyM: [20, 20], denominator: 1 }], truncated: false },
    refinement: { enabled: true, method: 'bounded_two_variable_BFGS_Armijo', seedPolicy: 'data-selected', hasConvergedEquallyGood: true, attempts: [{ seedXY: [20, 20], xy: [19, 19], value: .9, status: 'line_search_failed', success: false, iterations: 12, evaluations: 87, projectedGradientNorm: 2e-7 }, { seedXY: [22, 22], xy: [19, 19], value: .9, status: 'converged_projected_gradient', success: true, iterations: 10, evaluations: 20, projectedGradientNorm: 1e-9 }] },
    diagnostics: { method: 'Jacobi', sweeps: 8, residualRelative: 1e-15, orthogonalityFrobenius: 1e-14, gapRelative: .8, converged: true, uniquePrincipal: true, eigenvalueScale: 1e-8, eigenvaluesNormalized: new Float64Array([.1, .2, 1]) }, warnings: ['weak_sample_eigen_separation_not_a_signal_detection_test'] };
}

test('formatting preserves tiny physical values, zero and missing distinctions', () => {
  assert.equal(formatNumber(0), '0'); assert.equal(formatNumber(null), '未提供'); assert.equal(formatNumber(-0), '−0');
  assert.match(formatNumber(3.45e-8), /e-8/); assert.match(formatNumber(NaN), /非有限值/);
});
test('source geometry has actual 0.5 m aperture and exact spherical-minus-plane residual', () => {
  const g = design.geometry, rows = sourcePhaseCurvature(g);
  assert.equal(rows.length, 65); assert.equal(rows[0].qM, -.25); assert.equal(rows[64].qM, .25); assert.ok(rows[32].residualPhaseRad === 0);
  for (const row of rows) {
    const exact = -(2 * Math.PI / g.wavelengthM) * (Math.hypot(g.targetRangeM * Math.cos(g.targetAngleRad) - row.qM, g.targetRangeM * Math.sin(g.targetAngleRad)) - g.targetRangeM + row.qM * Math.cos(g.targetAngleRad));
    assert.ok(Math.abs(row.residualPhaseRad - exact) < 5e-12);
  }
  const farther = sourcePhaseCurvature({ ...g, targetRangeM: 30 });
  assert.ok(Math.abs(farther[0].residualPhaseRad) < Math.abs(rows[0].residualPhaseRad));
});
test('large MUSIC transform scans 251001 points without spread and retains unclipped raw values', () => {
  const raw = new Float64Array(251001).fill(65); raw[55] = 0;
  const display = musicDisplay(raw);
  assert.equal(display.floor, 65e-12); assert.equal(display.reference, MUSIC_FLOOR); assert.equal(display.values[55], 0);
  assert.ok(display.values[0] < -40); assert.equal(display.belowClip, 251000); assert.equal(raw[0], 65); assert.equal(raw[55], 0);
});
test('MUSIC reference is derived only from finite denominator and invalid values stay invalid', () => {
  const display = musicDisplay([4, 2, 20, NaN, Infinity]);
  assert.equal(display.reference, 2); assert.equal(display.values[1], 0);
  assert.ok(Math.abs(display.values[2] + 10) < 1e-12); assert.equal(display.invalid, 2);
  assert.deepEqual(finiteExtent([NaN, Infinity]), { min: null, max: null, count: 0 });
});
test('Y display splits actual interleaved real/imaginary data with independent data-derived limits', () => {
  const Y = { rows: 2, columns: 2, data: new Float64Array([1, 5, -2, 0, 4, -7, 3, 2]) };
  assert.deepEqual(Array.from(observationDisplay(Y, 0).values), [1, -2, 4, 3]);
  assert.deepEqual(observationDisplay(Y, 0).extent, { min: -2, max: 4, count: 4 });
  assert.deepEqual(observationDisplay(Y, 1).extent, { min: -7, max: 5, count: 4 });
});
test('communication breakdown uses h transpose, not h adjoint, and separates all interference powers', () => {
  const d = { channels: { re: [[1, 0], [0, 1]], im: [[0, 1], [1, 0]] }, resources: { commNoiseW: .5 }, ratesBpsHz: [1, 1] };
  const Wc = { re: [[1, 2], [0, 1]], im: [[0, 0], [1, 0]] }, Ws = { rows: 2, columns: 1, data: new Float64Array([1, 0, 0, 1]) };
  const rows = communicationPowerBreakdown(d, Wc, Ws);
  assert.equal(rows[0].desiredPowerW, 0); // (1,i)^T (1,i) = 0; Hermitian convention would incorrectly give 4.
  assert.equal(rows[0].otherUserPowerW, 5); assert.equal(rows[0].sensingPowerW, 0); assert.equal(rows[0].sinr, 0);
  assert.equal(rows[1].desiredPowerW, 5); assert.equal(rows[1].otherUserPowerW, 4); assert.equal(rows[1].sensingPowerW, 4);
  assert.equal(rows[1].sinr, 5 / 8.5);
});
test('single-realization range/angle errors are signed and require a completed separate evaluation', () => {
  assert.equal(evaluationSummary(receiver(), null), null);
  const r = { estimate: { rangeM: 19, angleRad: .7 } }, v = { truthRangeM: 20, truthAngleRad: .8, positionErrorM: 1.2, status: 'evaluated', boundaryHit: false };
  const summary = evaluationSummary(r, v); assert.equal(summary.rangeErrorM, -1); assert.ok(Math.abs(summary.angleErrorDegrees + .1 * 180 / Math.PI) < 1e-12);
  assert.equal(evaluationSummary({ estimate: { rangeM: 0, angleRad: null } }, v).angleErrorDegrees, null);
});
test('initial renderer has honest uncomputed states and geometry independently available', () => {
  const d = dom(); renderResearch(d.root, snapshot(experiment()));
  assert.match(d.get('solver').textContent, /尚无本次求解结果/); assert.match(d.get('spectrum').textContent, /尚未对当前原始 Y/);
  assert.match(d.get('geometry').textContent, /λ=0.0107 m/); assert.match(d.get('geometry').textContent, /从 \+x 轴/);
  assert.equal(d.document.images.length, 0);
});
test('imported historical solver/receiver remain inert labeled text, never current plots', () => {
  const e = experiment(), attack = '<img src=x onerror=alert(1)>';
  e.historicalOutputs = { solver: { status: attack, acceptance: 'accepted_numerical_candidate', trace: [{ iteration: 1 }] }, receiver: receiver() };
  e.trust = { optimizer: 'historical_unverified', receiver: 'historical_unverified' };
  const d = dom(); renderResearch(d.root, snapshot(e));
  assert.match(d.get('provenance').textContent, /导入的历史结果，尚未重新验证/); assert.ok(d.get('provenance').textContent.includes(attack));
  assert.equal(descendants(d.root).filter(x => x.tagName === 'img').length, 0);
  assert.match(d.get('solver').textContent, /尚无本次求解结果/); assert.equal(descendants(d.get('spectrum')).filter(x => x.tagName === 'svg').length, 0);
});
test('actual raw Y renders both real and imaginary maps, numerical legend and antenna/snapshot axes', () => {
  const e = experiment(); e.importedRaw = { Y: { rows: 2, columns: 2, data: new Float64Array([1, 5, -2, 0, 4, -7, 3, 2]) } }; e.importedObservationValid = true;
  const d = dom(); renderResearch(d.root, snapshot(e));
  const text = d.get('observation').textContent;
  assert.match(text, /导入的权威原始/); assert.match(text, /Re\(Y\)/); assert.match(text, /Im\(Y\)/); assert.match(text, /快拍索引/); assert.match(text, /接收阵元索引/);
  assert.match(text, /−?7|-7/); assert.equal(d.document.images.length, 2);
  // First output pixel is antenna 1, snapshot 0 because antenna 0 is the labeled bottom row.
  assert.ok(d.document.images[0].data[0] > d.document.images[0].data[8]);
});
test('truth overlay appears only after evaluation; spectrum intensities are invariant to truth overlay', () => {
  const e = experiment(); e.receiverOutput = receiver(); const d = dom(); renderResearch(d.root, snapshot(e));
  const before = Uint8ClampedArray.from(d.document.images[0].data);
  assert.ok(!descendants(d.get('spectrum')).some(n => n.tagName === 'title' && n.textContent.startsWith('推断后评估真值')));
  e.evaluation = { status: 'evaluated', positionErrorM: 2, truthRangeM: 20, truthAngleRad: Math.PI / 4, boundaryHit: false };
  renderResearch(d.root, snapshot(e));
  assert.ok(descendants(d.get('spectrum')).some(n => n.tagName === 'title' && n.textContent.startsWith('推断后评估真值')));
  assert.deepEqual(d.document.images.at(-1).data, before);
  assert.match(d.get('spectrum').textContent, /\[−40,0\] dB/); assert.match(d.get('spectrum').textContent, /6.50000e-11/);
});
test('failed refinement starts stay failed even with an equally good converged start', () => {
  const e = experiment(); e.receiverOutput = receiver(); const d = dom(); renderResearch(d.root, snapshot(e));
  const text = d.get('refinement').textContent;
  assert.match(text, /line_search_failed/); assert.match(text, /converged_projected_gradient/); assert.match(text, /1 个起点未收敛/);
  assert.match(text, /没有动画或连线式迭代路径/); assert.equal(descendants(d.get('refinement')).filter(n => n.tagName === 'polyline').length, 0);
  assert.match(d.get('eigen').textContent, /weak_sample_eigen_separation/); assert.match(d.get('eigen').textContent, /1\.0+e-9/);
});
test('capped solver and genuine irregular trace rows retain status, units and final certificate', () => {
  const e = experiment(); e.solution = { status: 'iteration_limit', acceptance: 'rejected_or_uncertified_candidate', iterations: 3, physicalGate: { passed: false, failures: ['solver_not_finished'] },
    options: { maxIterations: 3, maxWallMs: 100 }, conditioning: { physicalCrbObjectiveMultiplier: .4 },
    trace: [{ iteration: 1, objectiveScaled: 7, barrier: .1 }, { iteration: 3, objectiveScaled: 5, barrier: .02 }],
    crb: { status: 'regular', rangeCrbM2: .7, angleCrbRad2: 3e-8, traceCrbM2PlusRad2: .70000003 },
    certificate: { type: 'floating_point_repaired_dual_weak_duality_not_interval_proof', lowerBoundScaled: 4, feasibleObjectiveScaled: 5, relativeGap: .2, absoluteGap: 1 } };
  const d = dom(); renderResearch(d.root, snapshot(e));
  assert.match(d.get('solver').textContent, /iteration_limit/); assert.match(d.get('solver').textContent, /solver_not_finished/);
  assert.match(d.get('solver').textContent, /m²/); assert.match(d.get('solver').textContent, /rad²/); assert.match(d.get('solver').textContent, /最终修复对偶下界/);
  const circles = descendants(d.get('history')).filter(n => n.tagName === 'circle'); assert.equal(circles.length, 2); assert.equal(descendants(d.get('history')).filter(n => n.tagName === 'polyline').length, 0);
  assert.match(d.get('history').textContent, /仅绘制 2 个实际记录点/);
});
test('progress does not recreate unchanged large maps or geometry; causally invalidated Y clears maps', () => {
  const e = experiment(); e.receiverOutput = receiver(); e.observation = { Y: { rows: 2, columns: 2, data: new Float64Array(8) } };
  const d = dom(); renderResearch(d.root, snapshot(e)); const images = d.document.images.length;
  renderResearch(d.root, snapshot(e, { status: 'running', busy: 'receiver', progress: [{ stage: 'receiver', completed: 2 }] }));
  assert.equal(d.document.images.length, images); assert.equal(d.get('geometry').replacements, 1); assert.equal(d.get('spectrum').replacements, 1); assert.equal(d.get('status').replacements, 2);
  e.observation = null; e.receiverOutput = null; e.evaluation = null;
  renderResearch(d.root, snapshot(e, { invalidGroups: ['scene'] }));
  assert.match(d.get('observation').textContent, /尚无当前有效/); assert.match(d.get('spectrum').textContent, /尚未对当前原始 Y/);
});
test('receiver failure is visible without fabricated spectrum and audit singularities remain explicit', () => {
  const e = experiment(); e.receiverOutput = { status: 'time_cap', phase: 'grid', estimate: null }; e.evaluation = { status: 'no_estimate', receiverStatus: 'time_cap' };
  e.rawAudit = { passed: false, failures: ['Fisher'], optimizerAcceptance: 'historical_unverified_requires_fresh_solve', designFisher: { status: 'regular', rangeCrbM2: .9 }, truthFisher: { status: 'singular_interest' } };
  const d = dom(); renderResearch(d.root, snapshot(e));
  assert.match(d.get('spectrum').textContent, /time_cap/); assert.equal(d.document.images.length, 0);
  assert.match(d.get('evaluation').textContent, /没有可评估/); assert.match(d.get('audit').textContent, /singular_interest/);
  assert.match(d.get('audit').textContent, /名义设计点/); assert.match(d.get('audit').textContent, /仿真真值点/);
});
test('overflow ratio explanation keeps Infinity, multiple maxima and localization uncertainty visible',()=>{
 const e=experiment();e.receiverOutput=receiver();e.receiverOutput.noiseMedianEigenvalueRatio=Infinity;
 const d=dom();renderResearch(d.root,snapshot(e));assert.match(d.get('eigen').textContent,/Infinity/);assert.match(d.get('eigen').textContent,/带原因/);assert.match(d.get('eigen').textContent,/不是检测成功或定位正确/);
});
