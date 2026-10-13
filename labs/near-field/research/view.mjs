/** Display only: source calculations remain in the frozen runtime. Imported prose is inert text. */
const SVG = 'http://www.w3.org/2000/svg';
const caches = new WeakMap();
export const MUSIC_FLOOR = 65e-12;
export const MUSIC_CLIP_DB = Object.freeze([-40, 0]);

export function formatNumber(value, digits = 6) {
  if (value === null || value === undefined) return '未提供';
  if (typeof value !== 'number') return String(value);
  if (!Number.isFinite(value)) return `非有限值 (${String(value)})`;
  if (Object.is(value, -0)) return '−0';
  if (value === 0) return '0';
  return Math.abs(value) < 1e-3 || Math.abs(value) >= 1e5
    ? value.toExponential(Math.max(1, digits - 1))
    : String(Number(value.toPrecision(digits)));
}
const number = formatNumber;
const degrees = v => Number.isFinite(v) ? v * 180 / Math.PI : null;
const xyText = v => Array.isArray(v) || ArrayBuffer.isView(v) ? `(${number(v[0])}, ${number(v[1])})` : '未提供';
const sequence = v => Array.isArray(v) || ArrayBuffer.isView(v) ? v : v?.data ?? [];
const list = v => Array.isArray(v) ? v : [];
const yesNo = v => v === true ? '是' : v === false ? '否' : '未提供';

/** Exact source q coordinate and stable spherical-minus-plane phase, not legacy broadside geometry. */
export function sourcePhaseCurvature(g) {
  if (!g || !(g.n >= 2) || !(g.targetRangeM > 0) || !(g.wavelengthM > 0)) return [];
  const r = g.targetRangeM, angle = g.targetAngleRad, k = 2 * Math.PI / g.wavelengthM;
  return Array.from({ length: g.n }, (_, i) => {
    const q = (i - (g.n - 1) / 2) * g.apertureM / (g.n - 1);
    const rn = Math.hypot(r - q * Math.cos(angle), q * Math.sin(angle));
    const delta = (q * q - 2 * r * q * Math.cos(angle)) / (rn + r);
    return { antenna: i, qM: q, pathM: rn, sphericalPhaseRad: -k * delta,
      planePhaseRad: k * q * Math.cos(angle), residualPhaseRad: -k * (delta + q * Math.cos(angle)) };
  });
}

export function finiteExtent(values) {
  let min = Infinity, max = -Infinity, count = 0;
  for (const value of values) if (Number.isFinite(value)) { min = Math.min(min, value); max = Math.max(max, value); count++; }
  return count ? { min, max, count } : { min: null, max: null, count: 0 };
}

/** No truth or design prior is an argument: the intensity depends only on the returned raw denominator. */
export function musicDisplay(denominator) {
  const raw = sequence(denominator), extent = finiteExtent(raw);
  if (!extent.count) return { raw, values: new Float64Array(0), reference: null, floor: MUSIC_FLOOR, extent };
  const reference = Math.max(MUSIC_FLOOR, extent.min), values = new Float64Array(raw.length);
  let belowClip = 0, invalid = 0;
  for (let i = 0; i < raw.length; i++) {
    values[i] = Number.isFinite(raw[i]) ? 10 * Math.log10(reference / Math.max(raw[i], MUSIC_FLOOR)) : NaN;
    if (!Number.isFinite(values[i])) invalid++;
    else if (values[i] < MUSIC_CLIP_DB[0]) belowClip++;
  }
  return { raw, values, reference, floor: MUSIC_FLOOR, extent, belowClip, invalid };
}

export function observationDisplay(Y, component = 0) {
  if (!Y || ![0, 1].includes(component)) return null;
  const raw = sequence(Y.data), values = new Float64Array(Y.rows * Y.columns);
  for (let i = 0; i < values.length; i++) values[i] = raw[2 * i + component];
  return { rows: Y.rows, columns: Y.columns, values, extent: finiteExtent(values), component };
}

function factorShape(f) { return f?.re ? [f.re.length, f.re[0]?.length ?? 0] : [f?.rows ?? 0, f?.columns ?? 0]; }
function factorValue(f, row, col) {
  if (f?.re) return [f.re[row][col], f.im[row][col]];
  const p = 2 * (row * f.columns + col), data = sequence(f.data);
  return [data[p], data[p + 1]];
}
/** Analytic h^T (ordinary transpose) source factor powers, without inventing decoded traffic. */
export function communicationPowerBreakdown(design, Wc, Ws) {
  if (!design?.channels || !Wc || !Ws) return [];
  const [n, k] = factorShape(Wc), [ns, m] = factorShape(Ws);
  if (n !== ns || n !== design.channels.re[0]?.length) return [];
  const productPower = (user, factor, column) => {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) {
      const hr = design.channels.re[user][i], hi = design.channels.im[user][i], [fr, fi] = factorValue(factor, i, column);
      re += hr * fr - hi * fi; im += hr * fi + hi * fr;
    }
    return re * re + im * im;
  };
  return design.ratesBpsHz.map((requestedRateBpsHz, user) => {
    let otherUserPowerW = 0, sensingPowerW = 0;
    const desiredPowerW = productPower(user, Wc, user);
    for (let c = 0; c < k; c++) if (c !== user) otherUserPowerW += productPower(user, Wc, c);
    for (let c = 0; c < m; c++) sensingPowerW += productPower(user, Ws, c);
    const noisePowerW = design.resources.commNoiseW, denominator = otherUserPowerW + sensingPowerW + noisePowerW;
    const sinr = desiredPowerW / denominator, rateBpsHz = Math.log2(1 + sinr);
    return { user, desiredPowerW, otherUserPowerW, sensingPowerW, noisePowerW, sinr, rateBpsHz, requestedRateBpsHz };
  });
}

export function evaluationSummary(receiver, evaluation) {
  if (!evaluation || !receiver?.estimate) return null;
  const estimate = receiver.estimate;
  const rangeErrorM = Number.isFinite(estimate.rangeM) && Number.isFinite(evaluation.truthRangeM) ? estimate.rangeM - evaluation.truthRangeM : null;
  let angleErrorDegrees = null;
  if (Number.isFinite(estimate.angleRad) && Number.isFinite(evaluation.truthAngleRad)) {
    angleErrorDegrees = degrees(Math.atan2(Math.sin(estimate.angleRad - evaluation.truthAngleRad), Math.cos(estimate.angleRad - evaluation.truthAngleRad)));
  }
  return { positionErrorM: evaluation.positionErrorM, rangeErrorM, angleErrorDegrees,
    boundaryHit: evaluation.boundaryHit, ambiguity: receiver.estimateAmbiguity, status: evaluation.status };
}

function node(parent, tag, text, attrs = {}) {
  const el = parent.ownerDocument.createElement(tag);
  if (text !== undefined && text !== null) el.textContent = String(text);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  parent.appendChild(el); return el;
}
function svgNode(parent, tag, attrs = {}, text) {
  const el = parent.ownerDocument.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  if (text !== undefined) el.textContent = String(text);
  parent.appendChild(el); return el;
}
function paragraph(parent, text, cls) { return node(parent, 'p', text, cls ? { class: cls } : {}); }
function empty(parent, text) { paragraph(parent, text, 'nfr-empty'); }
function warning(parent, text) { paragraph(parent, text, 'nfr-warning'); }
function keyValues(parent, pairs) {
  const dl = node(parent, 'dl');
  for (const [key, value] of pairs) { node(dl, 'dt', key); node(dl, 'dd', value === undefined || value === null ? '未提供' : value); }
  return dl;
}
function table(parent, caption, headings, rows) {
  const wrap = node(parent, 'div', null, { class: 'nfr-table-wrap', tabindex: '0', role: 'region', 'aria-label': caption });
  const el = node(wrap, 'table'); node(el, 'caption', caption);
  const header = node(node(el, 'thead'), 'tr');
  headings.forEach(h => node(header, 'th', h, { scope: 'col' }));
  const body = node(el, 'tbody');
  rows.forEach(row => { const tr = node(body, 'tr'); row.forEach(value => node(tr, 'td', value)); });
  return el;
}
function details(parent, title, value) {
  const el = node(parent, 'details'); node(el, 'summary', title);
  node(el, 'pre', JSON.stringify(value, (_key, v) => ArrayBuffer.isView(v) ? Array.from(v) : v, 2)); return el;
}
function showWarnings(parent, warnings) {
  if (!warnings?.length) return;
  const ul = node(parent, 'ul', null, { class: 'nfr-warning' });
  for (const value of warnings) node(ul, 'li', value);
}
function chart(parent, title, { width = 680, height = 340, xMin = 0, xMax = 1, yMin = 0, yMax = 1, xLabel = '', yLabel = '', xTicks, yTicks } = {}) {
  const svg = svgNode(parent, 'svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': title });
  svgNode(svg, 'title', {}, title);
  const box = { left: 90, top: 22, width: width - 122, height: height - 92 };
  const x = v => box.left + (v - xMin) / (xMax - xMin || 1) * box.width;
  const y = v => box.top + box.height - (v - yMin) / (yMax - yMin || 1) * box.height;
  // Raster/curves precede axes so the axes and labels are never covered.
  const plot = svgNode(svg, 'g');
  const axes = svgNode(svg, 'g', { fill: 'currentColor', 'font-size': 12 });
  svgNode(axes, 'rect', { x: box.left, y: box.top, width: box.width, height: box.height, fill: 'none', stroke: 'currentColor', 'stroke-opacity': .45 });
  const xt = xTicks ?? [xMin, (xMin + xMax) / 2, xMax];
  const yt = yTicks ?? [yMin, (yMin + yMax) / 2, yMax];
  for (const value of xt) {
    svgNode(axes, 'line', { x1: x(value), x2: x(value), y1: y(yMin), y2: y(yMin) + 5, stroke: 'currentColor' });
    svgNode(axes, 'text', { x: x(value), y: y(yMin) + 22, 'text-anchor': 'middle' }, number(value, 4));
  }
  for (const value of yt) {
    svgNode(axes, 'line', { x1: box.left - 5, x2: box.left, y1: y(value), y2: y(value), stroke: 'currentColor' });
    svgNode(axes, 'text', { x: box.left - 9, y: y(value) + 4, 'text-anchor': 'end' }, number(value, 4));
  }
  svgNode(axes, 'text', { x: box.left + box.width / 2, y: height - 18, 'text-anchor': 'middle' }, xLabel);
  svgNode(axes, 'text', { transform: `translate(18 ${box.top + box.height / 2}) rotate(-90)`, 'text-anchor': 'middle' }, yLabel);
  return { svg, plot, axes, box, x, y };
}
function points(chart, rows, xKey, yKey, color = '#167c80', connect = true) {
  const finite = rows.filter(r => Number.isFinite(r[xKey]) && Number.isFinite(r[yKey]));
  // Every point is an actual recorded row; no fabricated intermediate frames or dual histories.
  if (connect) svgNode(chart.plot, 'polyline', { points: finite.map(r => `${chart.x(r[xKey])},${chart.y(r[yKey])}`).join(' '), fill: 'none', stroke: color, 'stroke-width': 2 });
  for (const row of finite) svgNode(chart.plot, 'circle', { cx: chart.x(row[xKey]), cy: chart.y(row[yKey]), r: 2, fill: color });
}
function nonzeroExtent(extent) {
  if (!extent.count) return [0, 1];
  if (extent.min === extent.max) { const pad = Math.max(Math.abs(extent.min) * .05, 1e-12); return [extent.min - pad, extent.max + pad]; }
  const pad = (extent.max - extent.min) * .06;
  return [extent.min - pad, extent.max + pad];
}
function palette(t) { return [Math.round(20 + 235 * t * t), Math.round(30 + 205 * t), Math.round(65 + 95 * (1 - Math.abs(2 * t - 1)))]; }
function colorLegend(parent, min, max, label) {
  const svg = svgNode(parent, 'svg', { viewBox: '0 0 680 64', role: 'img', 'aria-label': `${label} 色标 ${number(min)} 至 ${number(max)}` });
  svgNode(svg, 'title', {}, `${label}，线性显示色标`);
  for (let i = 0; i < 64; i++) svgNode(svg, 'rect', { x: 90 + i * 8, y: 2, width: 8.2, height: 14, fill: `rgb(${palette(i / 63).join(',')})` });
  for (const [t, value] of [[0, min], [.5, (min + max) / 2], [1, max]]) svgNode(svg, 'text', { x: 90 + t * 512, y: 35, 'text-anchor': 'middle', 'font-size': 12, fill: 'currentColor' }, number(value));
  svgNode(svg, 'text', { x: 346, y: 56, 'text-anchor': 'middle', 'font-size': 12, fill: 'currentColor' }, label);
}
function raster(chart, values, columns, rows, min, max, flipY = false) {
  const canvas = chart.svg.ownerDocument.createElement('canvas'); canvas.width = columns; canvas.height = rows;
  let context; try { context = canvas.getContext?.('2d'); } catch { return false; }
  if (!context?.createImageData) return false;
  const image = context.createImageData(columns, rows), scale = max - min || 1;
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const value = values[row * columns + col], target = ((flipY ? rows - 1 - row : row) * columns + col) * 4;
    const t = Number.isFinite(value) ? Math.max(0, Math.min(1, (value - min) / scale)) : 0;
    // Sequential blue→cyan→yellow palette; numerical labels carry the quantitative meaning.
    const color = palette(t); image.data[target] = color[0]; image.data[target + 1] = color[1]; image.data[target + 2] = color[2];
    image.data[target + 3] = Number.isFinite(value) ? 255 : 0;
  }
  context.putImageData(image, 0, 0);
  svgNode(chart.plot, 'image', { x: chart.box.left, y: chart.box.top, width: chart.box.width, height: chart.box.height,
    href: canvas.toDataURL(), preserveAspectRatio: 'none', 'image-rendering': 'pixelated' });
  return true;
}
function marker(c, xy, shape, color, label) {
  if (!xy || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) return;
  const x = c.x(xy[0]), y = c.y(xy[1]), r = 6;
  const g = svgNode(c.plot, 'g', { stroke: color, 'stroke-width': 2.4, fill: 'none' });
  svgNode(g, 'title', {}, `${label} ${xyText(xy)} m`);
  if (shape === 'square') svgNode(g, 'rect', { x: x - r, y: y - r, width: 2 * r, height: 2 * r });
  else if (shape === 'diamond') svgNode(g, 'polygon', { points: `${x},${y - r - 2} ${x + r + 2},${y} ${x},${y + r + 2} ${x - r - 2},${y}` });
  else if (shape === 'triangle') svgNode(g, 'polygon', { points: `${x},${y - r - 2} ${x + r + 1},${y + r} ${x - r - 1},${y + r}` });
  else if (shape === 'cross') {
    svgNode(g, 'line', { x1: x - r, x2: x + r, y1: y - r, y2: y + r });
    svgNode(g, 'line', { x1: x - r, x2: x + r, y1: y + r, y2: y - r });
  } else svgNode(g, 'circle', { cx: x, cy: y, r: r + 3 });
}

function renderStatus(parent, s) {
  const e = s.experiment;
  paragraph(parent, s.status || '尚未计算', 'nfr-badge');
  if (s.busy) paragraph(parent, `正在执行：${s.busy}。此处的进度来自实际任务消息`);
  if (s.error) paragraph(parent, s.error, 'nfr-error');
  if (s.invalidGroups?.length) warning(parent, `这些输入已改变，关联结果已失效：${s.invalidGroups.join('、')}。修改输入不会自动求解`);
  keyValues(parent, [['优化器信任状态', e.trust?.optimizer ?? 'absent'], ['接收机信任状态', e.trust?.receiver ?? 'absent'],
    ['设计身份', s.identity?.design ?? '尚未建立'], ['观测身份', s.identity?.observation ?? '尚未建立'], ['接收机身份', s.identity?.receiver ?? '尚未建立']]);
  const progress = list(s.progress);
  if (progress.length) details(parent, `最近 ${Math.min(8, progress.length)} 条实际进度消息`, progress.slice(-8));
}
function renderGeometry(parent, e) {
  const g = e.spec.designInput.geometry, rows = sourcePhaseCurvature(g), prior = [g.targetRangeM * Math.cos(g.targetAngleRad), g.targetRangeM * Math.sin(g.targetAngleRad)];
  paragraph(parent, `原文阵列 qₙ∈[−${number(g.apertureM / 2)}, ${number(g.apertureM / 2)}] m；N=${g.n}，D=${number(g.apertureM)} m，λ=${number(g.wavelengthM)} m。θ=${number(degrees(g.targetAngleRad))}° 从 +x 轴起算；点为设计先验`);
  const grid = node(parent, 'div', null, { class: 'nfr-grid' });
  const physical = chart(grid, '源模型阵列与设计先验，真实米制坐标', { width: 520, height: 490, xMin: -.5, xMax: 31, yMin: -.5, yMax: 31, xTicks: [0, 10, 20, 30], yTicks: [0, 10, 20, 30], xLabel: 'x (m)', yLabel: 'y (m)' });
  for (const row of [rows[0], rows[Math.floor(rows.length / 2)], rows.at(-1)]) if (row) svgNode(physical.plot, 'line', { x1: physical.x(row.qM), y1: physical.y(0), x2: physical.x(prior[0]), y2: physical.y(prior[1]), stroke: '#778899', 'stroke-width': 1 });
  for (const row of rows) svgNode(physical.plot, 'circle', { cx: physical.x(row.qM), cy: physical.y(0), r: 1.5, fill: '#167c80' });
  marker(physical, prior, 'diamond', '#a05216', '设计先验');
  svgNode(physical.axes, 'text', { x: physical.x(.7), y: physical.y(.8), fill: 'currentColor', 'font-size': 11 }, '阵列中心 (0, 0)');
  const [yMin, yMax] = nonzeroExtent(finiteExtent(rows.map(r => r.residualPhaseRad)));
  const phase = chart(grid, '球面相位减平面相位，按实际阵元位置计算', { xMin: -.25, xMax: .25, yMin, yMax, height: 430, xLabel: '阵元位置 qₙ (m)，单独横向尺度', yLabel: '球面 − 平面相位 (rad)' });
  points(phase, rows, 'qM', 'residualPhaseRad');
  paragraph(parent, '相位差 = −(2π/λ)[√(r²+qₙ²−2rqₙcosθ)−r+qₙcosθ]。这是已知几何的模型残差相位，既不是接收功率图，也不是接收机恢复的相位', 'nfr-plot-caption');
  table(parent, '几何数值摘录（全图使用全部 65 个源阵元）', ['阵元索引', 'qₙ (m)', '球面路径 (m)', '残差相位 (rad)'], [rows[0], rows[16], rows[32], rows[48], rows[64]].filter(Boolean).map(r => [r.antenna, number(r.qM), number(r.pathM, 9), number(r.residualPhaseRad, 9)]));
}
function renderSolver(parent, e) {
  const s = e.solution;
  if (!s) { empty(parent, '尚无本次求解结果。请显式重新求解发射设计；导入记录不授予本次优化接受状态'); return; }
  paragraph(parent, `本次求解：${s.status}；接受状态：${s.acceptance ?? '未提供'}`, s.acceptance === 'accepted_numerical_candidate' ? 'nfr-badge' : 'nfr-warning');
  keyValues(parent, [['物理 gate', s.physicalGate ? yesNo(s.physicalGate.passed) : '未提供'], ['已完成 Newton 迭代', number(s.iterations)], ['实际核计算耗时 (ms)', number(s.totalKernelWithAssessmentMs ?? s.kernelWallMs)],
    ['实际迭代 / 时间上限', `${number(s.options?.maxIterations)} / ${number(s.options?.maxWallMs)} ms`], ['失败原因', typeof s.failureReason === 'string' ? s.failureReason : s.failureReason ? JSON.stringify(s.failureReason) : '无报告']]);
  showWarnings(parent, s.physicalGate?.failures);
  if (s.status === 'initialization_failed') warning(parent, '初始化未成功不等于已证明不可行');
  if (s.status === 'infeasible_bound') details(parent, '实际计算的不可行上界证据', s.failureReason);
  const c = s.crb;
  if (c) keyValues(parent, [['Fisher / CRB 状态', c.status], ['名义设计点范围 CRB (m²)', number(c.rangeCrbM2, 9)], ['名义设计点角度 CRB (rad²)', number(c.angleCrbRad2, 9)],
    ['原目标和 (m² + rad²)', number(c.traceCrbM2PlusRad2, 9)], ['范围 RCRB (m)', number(c.rangeRootCrbM)], ['角度 RCRB (°)', number(c.angleRootCrbDegrees)]]);
  else empty(parent, '此终止状态没有可展示的 CRB；不补造有限下界');
  if (s.certificate) {
    const c = s.certificate;
    keyValues(parent, [['最终可行原始目标（缩放值）', number(c.feasibleObjectiveScaled, 10)], ['最终修复对偶下界（缩放值）', number(c.lowerBoundScaled, 10)], ['最终绝对 gap（缩放值）', number(c.absoluteGap)], ['最终相对 gap', number(c.relativeGap)],
      ['对偶证书类型', c.type], ['对偶功率修复量', number(c.powerDualShift)], ['对偶锥最小特征值', number(c.coneMinimumEigenvalue)], ['对偶驻点最小特征值', number(c.stationarityMinimumEigenvalue)]]);
    details(parent, '实际原始残差与修复对偶证书', { primalResiduals: s.primalResiduals, certificate: s.certificate });
  } else empty(parent, '本次结果未包含最终对偶证书');
  warning(parent, 'CRB 是名义点、给定 X 的局部条件下界。原目标为 m² + rad² 的原样和；总目标 gap 不相对认证很小的角度项，也不承诺这一次定位误差');
}
function renderHistory(parent, e) {
  const rows = list(e.solution?.trace);
  if (!rows.length) { empty(parent, '没有保留的本次迭代记录；不会生成示意下降曲线或取消前的虚构轨迹'); return; }
  const [yMin, yMax] = nonzeroExtent(finiteExtent(rows.map(r => r.objectiveScaled))), xs = finiteExtent(rows.map(r => r.iteration));
  const c = chart(parent, '实际 Newton 记录：迭代号与缩放目标', { xMin: xs.min, xMax: xs.max === xs.min ? xs.min + 1 : xs.max, yMin, yMax, xLabel: '实际迭代号', yLabel: '缩放目标 objectiveScaled' });
  points(c, rows, 'iteration', 'objectiveScaled', '#167c80', false);
  paragraph(parent, `仅绘制 ${rows.length} 个实际记录点，缺失迭代不连线插值。物理目标 = objectiveScaled × ${number(e.solution.conditioning?.physicalCrbObjectiveMultiplier, 10)}；没有逐次对偶下界记录`);
  const detail = node(parent, 'details'); node(detail, 'summary', '查看每次实际记录，包括 barrier 改变');
  table(detail, '未经插值的求解 trace', ['迭代', 'barrier', '缩放目标', '功率比例', 'Newton decrement²', '最小仿射 slack', '耗时 ms'], rows.map(r => [r.iteration, number(r.barrier), number(r.objectiveScaled, 9), number(r.powerFraction), number(r.newtonDecrementSquared), number(r.minimumAffineSlack), number(r.elapsedMs)]));
}
function renderRates(parent, e) {
  const r = e.realization, s = e.solution, audit = e.rawAudit;
  const metrics = r?.report?.metrics ?? audit?.metrics ?? s?.factoredBeams ?? s?.beams;
  const Wc = r?.Wc ?? (audit?.metrics ? e.importedRaw?.communicationBeams : null) ?? s?.raw?.communicationBeams;
  const Ws = r?.Ws ?? (audit?.metrics ? e.importedRaw?.sensingFactor : null) ?? s?.raw?.sensingFactor;
  if (!metrics) { empty(parent, '尚无本次发射功率与速率核验。需重新求解，或对导入原始矩阵执行 raw audit'); return; }
  paragraph(parent, r ? '来自本次有限 X 的独立指标核验' : audit?.metrics ? '来自本次 raw audit；这不确认历史优化器的最优性或接受状态' : '来自本次求解器候选评估；候选的接受状态见上方');
  keyValues(parent, [['总发射功率 (W)', number(metrics.powerW, 9)], ['功率预算 (W)', number(e.spec.designInput.resources.powerW)], ['有限 X 对目标协方差相对残差', number(r?.report?.sampleToTarget ?? audit?.sampleToTarget ?? s?.recovery?.covarianceRelativeResidual)]]);
  const powers = communicationPowerBreakdown(e.spec.designInput, Wc, Ws);
  table(parent, '四用户源 hᵀ 通信功率与解析速率', ['用户', '期望功率 W', '其他用户 W', '感知干扰 W', '噪声 W', 'SINR', 'log₂(1+SINR) bit/s/Hz', '要求 bit/s/Hz', '余量 bit/s/Hz'], list(metrics.users).map((u, i) => {
    const p = powers[i]; return [i + 1, number(u.desiredPowerW ?? p?.desiredPowerW), number(p?.otherUserPowerW), number(p?.sensingPowerW), number(p?.noisePowerW ?? e.spec.designInput.resources.commNoiseW), number(u.sinr), number(u.rateBpsHz, 9), number(e.spec.designInput.ratesBpsHz[i]), number(u.rateMarginBpsHz)];
  }));
  const rows = list(metrics.users), max = Math.max(1, ...rows.map(u => u.rateBpsHz).filter(Number.isFinite), ...e.spec.designInput.ratesBpsHz);
  const c = chart(parent, '实际解析速率与要求阈值', { xMin: .5, xMax: 4.5, yMin: 0, yMax: max * 1.1, xTicks: [1, 2, 3, 4], xLabel: '用户', yLabel: '解析速率 (bit/s/Hz)' });
  rows.forEach((u, i) => {
    if (Number.isFinite(u.rateBpsHz)) svgNode(c.plot, 'rect', { x: c.x(i + .78), y: c.y(u.rateBpsHz), width: c.x(1.22) - c.x(.78), height: c.y(0) - c.y(u.rateBpsHz), fill: '#167c80' });
    const y = c.y(e.spec.designInput.ratesBpsHz[i]); svgNode(c.plot, 'line', { x1: c.x(i + .7), x2: c.x(i + 1.3), y1: y, y2: y, stroke: '#b44c20', 'stroke-width': 3 });
  });
  paragraph(parent, '柱：本次解析速率；横线：用户要求。期望信号为 hₖᵀpₖ，普通转置；其他用户与感知流均计入干扰。不是实际编码解调吞吐或 BER', 'nfr-legend');
}
function renderWaveform(parent, e) {
  const r = e.realization?.report;
  if (!r) { empty(parent, e.importedRaw ? '持有导入的原始 X；历史有限波形 gate 未重新授信。使用 raw audit 检查当前原始矩阵' : '尚未构造有限 X。只有本次求解器接受与物理 gate 通过，才进入 DFT 波形构造'); return; }
  keyValues(parent, [['有限 X gate', yesNo(r.passed)], ['实现方法', r.method], ['X 维度', `${e.realization.X.rows} × ${e.realization.X.columns}`], ['保留全部因子列数', number(r.orthogonalComponentCount)], ['源基维数 / 秩上界', number(r.rankUpperBound)], ['应用的秩截断阈值', r.rankToleranceApplied === null ? '无；不截断' : number(r.rankToleranceApplied)],
    ['因子 → 目标协方差相对差', number(r.factorToTarget)], ['XXᴴ/T → 因子协方差相对差', number(r.sampleToFactor)], ['XXᴴ/T → 目标协方差相对差', number(r.sampleToTarget)], ['直接 X Fisher → 协方差 Fisher 误差', number(r.fisherDirectToTrace)], ['直接 X Fisher → 源求解器 Fisher 误差', number(r.fisherDirectToSolver)],
    ['直接 X Fisher 状态', r.directFisher?.status], ['源恢复裁剪的负特征值质量', number(r.sourceClipping?.negativeEigenMassClipped)]]);
  showWarnings(parent, r.failures);
  paragraph(parent, 'X=FS，SSᴴ/T=I；所有因子列保留。秩上界不是实际测得秩。256 个快拍没有指定物理时长，不能换算为焦耳或吞吐时延');
  details(parent, '有限波形全部 gate、容差与名义设计点 Fisher', r);
}
function renderObservation(parent, e) {
  const Y = e.observation?.Y ?? (e.importedObservationValid ? e.importedRaw?.Y : null);
  if (!Y) { empty(parent, '尚无当前有效的原始 Y。先显式生成观测；不会使用旧图填充'); return; }
  paragraph(parent, `${e.observation ? '本次生成的' : '导入的权威原始'} Y：${Y.rows} × ${Y.columns} 复数矩阵。横轴是快拍索引，纵轴是接收阵元索引；每格是复基带振幅（模型单位）`);
  const grid = node(parent, 'div', null, { class: 'nfr-grid' });
  for (let component = 0; component < 2; component++) {
    const display = observationDisplay(Y, component), block = node(grid, 'div'), label = component ? 'Im(Y)' : 'Re(Y)';
    const { min, max } = display.extent;
    const c = chart(block, `${label} 实际复基带振幅矩阵`, { xMin: 0, xMax: Y.columns - 1, yMin: 0, yMax: Y.rows - 1, xTicks: [0, Math.floor((Y.columns - 1) / 2), Y.columns - 1], yTicks: [0, Math.floor((Y.rows - 1) / 2), Y.rows - 1], xLabel: '快拍索引', yLabel: '接收阵元索引', height: 320 });
    // Array rows are antenna 0 upward; canvas image flips its vertical order to match labeled axes.
    if (!raster(c, display.values, Y.columns, Y.rows, min, max, true)) paragraph(block, '当前绘图上下文不可用；下方保留实际数据摘录', 'nfr-warning');
    colorLegend(block, min, max, `${label} 复基带振幅（模型单位）`);
    paragraph(block, `${label} 色标（深蓝→黄）：${number(min)} → ${number((min + max) / 2)} → ${number(max)}，复基带振幅（模型单位）。上下限由本矩阵实际数据决定，不跨图归一化比较`, 'nfr-legend');
  }
  const rows = [], data = sequence(Y.data);
  for (const antenna of [0, Math.floor((Y.rows - 1) / 2), Y.rows - 1]) for (const snapshot of [0, Math.floor((Y.columns - 1) / 2), Y.columns - 1]) {
    const i = 2 * (antenna * Y.columns + snapshot); rows.push([antenna, snapshot, number(data[i], 9), number(data[i + 1], 9)]);
  }
  table(parent, '实际 Y 数值摘录；完整矩阵保留在导出记录中', ['阵元索引', '快拍索引', 'Re(Y) 模型单位', 'Im(Y) 模型单位'], rows);
  const r = e.observation?.report;
  if (r) keyValues(parent, [['生成式', r.equation], ['本次是否复用原始噪声 Z', yesNo(r.rawNoiseReused)], ['新生成所用种子', number(r.seedUsedForGeneration)], ['有限样本噪声均值 (Re, Im)', xyText(r.noiseMean)], ['Re / Im 二阶矩', xyText(r.componentSecondMoments)], ['复二阶矩 Ê|Z|²', number(r.complexSecondMoment)], ['伪二阶矩 (Re, Im)', xyText(r.pseudoSecondMoment)]]);
  else paragraph(parent, '导入后按原始 Z/Y 保留，不根据种子替换样本；历史噪声统计未当作本次重新计算');
  paragraph(parent, 'Y=βaaᵀX+Z，使用普通转置。噪声的实部、虚部各有总体方差 σ²/2；有限样本均值或伪二阶矩偏离零不自动表示生成失败');
}
function renderSpectrum(parent, e) {
  const r = e.receiverOutput;
  if (!r) { empty(parent, '尚未对当前原始 Y 运行接收机。固定搜索域为 [0,40]² m；此处不显示导入的历史谱图'); return; }
  paragraph(parent, `本次接收机状态：${r.status}；歧义：${r.estimateAmbiguity ?? '未报告'}。完成数值运算不等于目标检测或唯一定位`, r.status === 'ok' ? 'nfr-badge' : 'nfr-warning');
  showWarnings(parent, r.warnings);
  const raw = sequence(r.denominator), domain = r.domain;
  if (!raw.length || !domain) { empty(parent, '此结果没有返回可绘制的原始 MUSIC 分母。失败、取消或关闭谱返回时不补造图'); return; }
  const d = musicDisplay(raw);
  if (!d.extent.count) { warning(parent, '返回谱没有有限数值，无法绘制'); return; }
  const c = chart(parent, '本次原始 Y 的 MUSIC 谱，固定候选空间 [0,40]² m', { width: 650, height: 620, xMin: 0, xMax: 40, yMin: 0, yMax: 40, xTicks: [0, 10, 20, 30, 40], yTicks: [0, 10, 20, 30, 40], xLabel: '候选 x (m)', yLabel: '候选 y (m)' });
  if (!raster(c, d.values, domain.nx, domain.ny, -40, 0, true)) warning(parent, '当前绘图上下文不可用；仍可读取下方实际网格数值');
  const g = e.spec.designInput.geometry, prior = [g.targetRangeM * Math.cos(g.targetAngleRad), g.targetRangeM * Math.sin(g.targetAngleRad)];
  const markers = [['设计先验 ◇（非接收机输入）', prior, null]];
  marker(c, prior, 'diamond', '#f6a446', '设计先验');
  for (const [i, attempt] of list(r.refinement?.attempts).entries()) { marker(c, attempt.seedXY, 'triangle', '#f9e85f', `数据选取起点 ${i + 1}`); markers.push([`数据选取起点 △ ${i + 1}`, attempt.seedXY, null]); }
  marker(c, r.gridEstimate?.xyM, 'square', '#fff', '网格获胜点');
  if (r.gridEstimate) markers.push(['网格获胜点 □', r.gridEstimate.xyM, r.gridEstimate.minimumDenominator]);
  marker(c, r.estimate?.xyM, 'circle', '#ef739d', '最终代表估计');
  if (r.estimate) markers.push(['最终代表估计 ○', r.estimate.xyM, r.estimate.minimumDenominator]);
  if (e.evaluation) { marker(c, e.spec.scene.truthXY, 'cross', '#fff', '推断后评估真值'); markers.push(['推断后评估真值 ×', e.spec.scene.truthXY, null]); }
  colorLegend(parent, -40, 0, 'MUSIC 相对本次最强网格响应 (dB)');
  paragraph(parent, `色标（深蓝→黄）：−40、−20、0 dB。显示变换 10log₁₀[p_ref/max(p,p_floor)]；p=‖Eₙᴴa‖²，p_floor=${number(MUSIC_FLOOR)}，本次 p_ref=max(p_floor,min finite p)=${number(d.reference, 9)}。仅显示裁剪 [−40,0] dB（${d.belowClip} 格低于下限），原始 p 未裁剪`, 'nfr-legend');
  paragraph(parent, `0 dB 是这份 Y 的最强网格响应，不是跨观测绝对分数。网格 ${domain.nx} × ${domain.ny}=${domain.count}，步长 ${number(domain.stepM)} m；原始 p 范围 [${number(d.extent.min, 9)}, ${number(d.extent.max, 9)}]`);
  paragraph(parent, '形状图例：◇ 设计先验；□ 网格获胜点；△ 数据选取的细化起点；○ 最终代表估计；× 只在推断后显示的评估真值。颜色与标记不参与谱的计算', 'nfr-legend');
  table(parent, '谱图标记的实际坐标', ['标记与含义', '(x, y) m', '原始分母 p'], markers.map(([label, xy, value]) => [label, xyText(xy), number(value, 9)]));
  const samples = [];
  for (const iy of [0, Math.floor((domain.ny - 1) / 2), domain.ny - 1]) for (const ix of [0, Math.floor((domain.nx - 1) / 2), domain.nx - 1]) {
    const i = iy * domain.nx + ix; samples.push([number(domain.xMin + ix * domain.stepM), number(domain.yMin + iy * domain.stepM), number(raw[i], 9), number(d.values[i], 8)]);
  }
  table(parent, '固定候选位置的实际谱值摘录；完整 raw p 可导出', ['x (m)', 'y (m)', '原始 p', '未裁剪显示值 (dB)'], samples);
  if (r.gridMaxima) details(parent, '全部已报告的并列网格峰（含截断与容差说明）', r.gridMaxima);
}
function renderEigen(parent, e) {
  const r = e.receiverOutput, d = r?.diagnostics;
  if (!d) { empty(parent, r ? `接收机终止状态 ${r.status} 没有保留特征分解诊断` : '尚无当前 Y 的样本特征分解'); return; }
  keyValues(parent, [['分解方法', d.method], ['是否达到残差条件', yesNo(d.converged)], ['唯一主特征空间（数值判据）', yesNo(d.uniquePrincipal)], ['相对特征残差', number(d.residualRelative)], ['正交性 Frobenius 残差', number(d.orthogonalityFrobenius)], ['相对主特征间隙', number(d.gapRelative)], ['主值 / 中位噪声特征值比', number(r.noiseMedianEigenvalueRatio)], ['实际扫掠数', number(d.sweeps)], ['特征值还原尺度', number(d.eigenvalueScale)]]);
  if (r.noiseMedianEigenvalueRatio === Infinity) paragraph(parent, '此可选比值超出浮点数范围：主特征值 / max(中位特征值, Number.MIN_VALUE)。无噪声、近秩一协方差可出现此情况；完整记录以带原因的 +Infinity 标签保存，原始矩阵、并列峰和定位误差不变。这不是检测成功或定位正确的证明');
  showWarnings(parent, r.warnings);
  const normalized = sequence(d.eigenvaluesNormalized), rows = Array.from(normalized, (v, i) => ({ index: i, normalized: v, actual: v * d.eigenvalueScale }));
  if (rows.length) {
    const [yMin, yMax] = nonzeroExtent(finiteExtent(rows.map(r => r.actual)));
    const c = chart(parent, '实际样本协方差特征值', { xMin: 0, xMax: rows.length - 1 || 1, yMin, yMax, xLabel: '特征值索引（按实际返回顺序）', yLabel: '样本协方差特征值（模型单位²）' }); points(c, rows, 'index', 'actual');
    const detail = node(parent, 'details'); node(detail, 'summary', `全部 ${rows.length} 个实际特征值`);
    table(detail, '归一化值及还原值', ['索引', '归一化特征值', '实际特征值（模型单位²）'], rows.map(row => [row.index, number(row.normalized, 9), number(row.actual, 9)]));
  }
  paragraph(parent, '间隙和弱分离警告是数值证据，不是已校准的目标检测检验。已知目标数固定为 M=1');
}
function renderRefinement(parent, e) {
  const r = e.receiverOutput;
  if (!r) { empty(parent, '尚无本次细化结果；不展示预制迭代路径'); return; }
  const refinement = r.refinement;
  if (!refinement) { empty(parent, `接收机状态 ${r.status} 没有保留细化记录`); return; }
  keyValues(parent, [['是否启用', yesNo(refinement.enabled)], ['方法', refinement.method], ['起点策略', refinement.seedPolicy], ['存在同样好的已收敛起点', yesNo(refinement.hasConvergedEquallyGood)]]);
  const attempts = list(refinement.attempts);
  if (!attempts.length) { empty(parent, '本次没有细化尝试；保留实际网格结果'); return; }
  table(parent, '数据选取的实际起点与返回终点（不连接未记录路径）', ['尝试', '起点 (x,y) m', '返回点 (x,y) m', '原始 p', '状态', '成功', '实际迭代', '函数评估', '投影梯度范数'], attempts.map((a, i) => [i + 1, xyText(a.seedXY), xyText(a.xy), number(a.value, 10), a.status, yesNo(a.success), a.iterations, a.evaluations, number(a.projectedGradientNorm)]));
  const failed = attempts.filter(a => !a.success);
  if (failed.length) warning(parent, `${failed.length} 个起点未收敛，状态完整保留。一个失败起点可能返回最终最低值；“存在同样好的已收敛起点”不能改写该起点的失败状态`);
  paragraph(parent, '这里只保留实际起终点和诊断。运行时没有记录逐次坐标，因此没有动画或连线式迭代路径');
}
function renderEvaluation(parent, e) {
  if (!e.evaluation) { empty(parent, '先用当前 Y 完成接收机推断，再单独对照仿真真值；没有完成的试验就没有误差曲线'); return; }
  const summary = evaluationSummary(e.receiverOutput, e.evaluation);
  paragraph(parent, `单次实现评估状态：${e.evaluation.status}`);
  if (!summary) { warning(parent, `没有可评估的代表估计，接收机状态：${e.evaluation.receiverStatus ?? e.receiverOutput?.status}`); return; }
  keyValues(parent, [['估计 (x, y) m', xyText(e.receiverOutput.estimate.xyM)], ['仿真真值 (x, y) m', xyText(e.spec.scene.truthXY)], ['单次欧氏位置误差 (m)', number(summary.positionErrorM, 9)], ['单次有符号范围误差 (m)', number(summary.rangeErrorM, 9)], ['单次有符号角度误差 (°)', number(summary.angleErrorDegrees, 9)],
    ['估计范围 (m)', number(e.receiverOutput.estimate.rangeM, 9)], ['估计角度 (°)', number(degrees(e.receiverOutput.estimate.angleRad), 9)], ['真值范围 (m)', number(e.evaluation.truthRangeM, 9)], ['真值角度 (°)', number(degrees(e.evaluation.truthAngleRad), 9)], ['搜索边界命中', yesNo(summary.boundaryHit)], ['原点角度未定义', yesNo(e.receiverOutput.estimate.originAngleUndefined)], ['歧义', summary.ambiguity], ['同样好的已收敛起点', yesNo(e.receiverOutput.refinement?.hasConvergedEquallyGood)]]);
  showWarnings(parent, e.evaluation.warnings);
  if (summary.boundaryHit || summary.ambiguity !== 'none_detected_on_grid') warning(parent, '边界或并列峰会限制这一代表点的解释；保留这些警告，不视为唯一定位成功');
  paragraph(parent, '这是一份实际 Y 的一次结果，不是 RMSE、重复噪声平均、CRB 或定位准确率。误差评估在推断后进行，不反馈给搜索网格、起点或谱强度');
}
function fisherRows(f) { return [['Fisher 状态', f?.status], ['范围 CRB (m²)', number(f?.rangeCrbM2, 9)], ['角度 CRB (rad²)', number(f?.angleCrbRad2, 9)], ['原目标和 (m² + rad²)', number(f?.traceCrbM2PlusRad2, 9)]]; }
function renderAudit(parent, e) {
  const a = e.rawAudit;
  if (!a) { empty(parent, '尚未执行本次 raw audit。原始矩阵校验与重新优化、重新定位是三个不同操作'); return; }
  keyValues(parent, [['原始矩阵审计通过', yesNo(a.passed)], ['状态', a.status ?? (a.passed ? 'passed' : 'failed')], ['优化器接受状态（审计不能授予）', a.optimizerAcceptance], ['XXᴴ/T → 因子协方差相对差', number(a.sampleToFactor)], ['XXᴴ/T → 目标协方差相对差', number(a.sampleToTarget)], ['直接 X / 协方差 Fisher 误差', number(a.fisherDirectToTrace)], ['Y − (βaaᵀX+Z) 相对误差', number(a.observationRelative)]]);
  showWarnings(parent, a.failures); showWarnings(parent, a.missing);
  if (a.designFisher) { paragraph(parent, '名义设计点 Fisher：使用设计器名义增益与噪声'); keyValues(parent, fisherRows(a.designFisher)); }
  if (a.truthFisher) { paragraph(parent, '仿真真值点 Fisher：使用实际 β 与噪声；仅为审计后评估'); keyValues(parent, fisherRows(a.truthFisher)); }
  details(parent, '本次全部 raw audit 证据', a);
}
function historicalSummary(h) {
  if (!h) return null;
  return { solver: h.solver ? { status: h.solver.status, acceptance: h.solver.acceptance, failureReason: h.solver.failureReason, physicalGate: h.solver.physicalGate, crb: h.solver.crb, certificate: h.solver.certificate, actualTraceRowsRetained: h.solver.trace?.length ?? 0 } : null,
    receiver: h.receiver ? { status: h.receiver.status, estimate: h.receiver.estimate, estimateAmbiguity: h.receiver.estimateAmbiguity, refinement: h.receiver.refinement, warnings: h.receiver.warnings } : null,
    evaluation: h.evaluation ?? null };
}
function renderProvenance(parent, e, s) {
  keyValues(parent, [['模型来源', e.spec.designInput.source], ['输入 caseId（描述性）', e.spec.designInput.caseId ?? '未提供'], ['当前设计身份', s.identity?.design], ['当前观测身份', s.identity?.observation], ['当前接收机身份', s.identity?.receiver], ['优化器信任', e.trust?.optimizer], ['接收机信任', e.trust?.receiver]]);
  paragraph(parent, '权威输入是原始四用户复信道；用户位置、采样种子和 pathloss 文字仅描述来源。覆盖信道后不能把这些旧说明当作矩阵生成证明');
  details(parent, '当前显式输入、预算与来源（原始信道不在这里展开）', { geometry: e.spec.designInput.geometry, resources: e.spec.designInput.resources, ratesBpsHz: e.spec.designInput.ratesBpsHz, provenance: e.spec.designInput.provenance, scene: e.spec.scene, receiver: e.spec.receiver, solverOptions: e.spec.solverOptions });
  if (e.historicalOutputs) {
    warning(parent, '导入的历史结果，尚未重新验证。下列状态、接受字符串与证书是文件中的历史声明，不能授予当前接受状态，也不会画成本次谱图');
    details(parent, '导入的历史结果，尚未重新验证（仅文本）', historicalSummary(e.historicalOutputs));
  }
  if (e.importedRaw) paragraph(parent, '当前持有导入原始数组。raw Y 的重新推断与原始矩阵审计各自获得结果；优化器仍需显式新求解。种子不会替代导入的 Z/Y');
  paragraph(parent, '完整记录含权威 X/Z/Y，诊断记录则 raw=null、下游 not_included。每种导出都保留实际状态，未计算的数据不补造');
}

/** Re-render only small live status/provenance on progress; maps are keyed by causal object references. */
export function renderResearch(root, snapshot) {
  if (!root || !snapshot?.experiment) return;
  const e = snapshot.experiment;
  let cache = caches.get(root); if (!cache) { cache = new Map(); caches.set(root, cache); }
  const render = (name, deps, draw) => {
    const parent = root.querySelector(`[data-nfr-view="${name}"]`); if (!parent) return;
    const prior = cache.get(name);
    if (prior?.parent === parent && deps.length === prior.deps.length && deps.every((v, i) => Object.is(v, prior.deps[i]))) return;
    parent.replaceChildren(); draw(parent); cache.set(name, { parent, deps });
  };
  render('status', [snapshot], p => renderStatus(p, snapshot));
  render('geometry', [e.spec.designInput.geometry], p => renderGeometry(p, e));
  render('solver', [e.solution], p => renderSolver(p, e));
  render('history', [e.solution], p => renderHistory(p, e));
  render('rates', [e.spec.designInput, e.solution, e.realization, e.rawAudit, e.importedRaw], p => renderRates(p, e));
  render('waveform', [e.realization, e.importedRaw], p => renderWaveform(p, e));
  render('observation', [e.observation, e.importedRaw?.Y, e.importedObservationValid], p => renderObservation(p, e));
  render('spectrum', [e.receiverOutput, e.evaluation, e.spec.designInput.geometry, e.spec.scene], p => renderSpectrum(p, e));
  render('eigen', [e.receiverOutput], p => renderEigen(p, e));
  render('refinement', [e.receiverOutput], p => renderRefinement(p, e));
  render('evaluation', [e.receiverOutput, e.evaluation, e.spec.scene], p => renderEvaluation(p, e));
  render('audit', [e.rawAudit], p => renderAudit(p, e));
  render('provenance', [e.spec, e.spec.designInput, e.spec.scene, e.spec.receiver, e.trust?.optimizer, e.trust?.receiver, e.historicalOutputs, e.receiverOutput, snapshot.identity?.design, snapshot.identity?.observation, snapshot.identity?.receiver], p => renderProvenance(p, e, snapshot));
}
