import { evaluateCausalCapacity, THRESHOLD_BRACKET } from './causal-capacity-core.mjs';

export const fmt = (n, digits = 6) => Number.isFinite(n) ? n.toFixed(digits) : '—';
export const meaningful = n => Number.isFinite(n) && n !== 0 && Math.abs(n)<1e-6 ? n.toExponential(3) : fmt(n);
export const precise = n => Number.isFinite(n) ? String(n) : '—';
export const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const STATUS = {
  feasible: { label: '可行 · 留有消息速率', tone: 'feasible', explanation: '描述状态后仍有正的信息余额，可用于传递独立消息。' },
  plateau: { label: '可行 · 进入平台', tone: 'feasible', explanation: '预算已足够宽松：恒定重构 0 的失真为 0.25，不再需要状态描述速率。' },
  infeasible: { label: '不可行 · 预算过紧', tone: 'infeasible', explanation: '该失真预算低于可行门槛；即使消息速率为零也不能满足。负的信息余额不是负容量，也不能截成可达零速率。PMF 失真仅属于候选分布。' },
  boundary_within_numerical_resolution: { label: '未分辨 · 数值边界窗口', tone: 'boundary', explanation: '输入位于闭合的浮点门槛窗口，不能可靠归为可行或不可行。可达速率保持 null；数学精确门槛处的速率为零。' },
};

/** All curve samples are fresh theorem/16-atom evaluations, never stored fixtures. */
export function computeCurve() {
  const next = new Float64Array([THRESHOLD_BRACKET[1]]);
  const bits = new BigUint64Array(next.buffer); bits[0] += 1n;
  const Ds = [...new Set([...Array.from({length:201}, (_,i) => i / 400), ...THRESHOLD_BRACKET, next[0]])].sort((a,b)=>a-b);
  return Object.freeze(Ds.map(D => {
    const result = evaluateCausalCapacity(D);
    return Object.freeze({ D, rate: result.feasibility.feasibleRate, status: result.feasibility.status });
  }));
}

export function curvePath(points, {x = D => 58 + D * 1000, y = rate => 252 - rate * 1000} = {}) {
  let pen = false;
  return points.map(({D, rate}) => {
    if (rate === null) { pen = false; return ''; }
    const command = pen ? 'L' : 'M'; pen = true;
    return `${command}${x(D).toFixed(3)},${y(rate).toFixed(3)}`;
  }).filter(Boolean).join(' ');
}

export function curveSVG(points, result) {
  if (!result) return '<text x="308" y="150" text-anchor="middle" class="plot-empty">调整 D 或重新计算，生成当前曲线与读数</text>';
  const x = D => 58 + D * 1000, y = rate => 252 - rate * 1000;
  const selected = result.feasibility.feasibleRate;
  const status = STATUS[result.feasibility.status];
  const grid = [0,.05,.1,.15,.2].map(v => `<line x1="58" y1="${y(v)}" x2="558" y2="${y(v)}" class="grid-line"/><text x="47" y="${y(v)+4}" text-anchor="end" class="axis">${v.toFixed(2)}</text>`).join('');
  const ticks = [0,.1,.2,.3,.4,.5].map(v => `<text x="${x(v)}" y="276" text-anchor="middle" class="axis">${v.toFixed(1)}</text>`).join('');
  const marker = selected === null
    ? `<path d="M${x(result.requestedD)-5},246 l10,10 m-10,0 l10,-10" stroke="${status.tone==='boundary'?'#9d680e':'#ae573e'}" stroke-width="2.5"/><text x="${Math.min(505,Math.max(107,x(result.requestedD)))}" y="232" text-anchor="middle" class="selected-note">${status.tone==='boundary'?'未分辨 · null':'不可行 · null'}</text>`
    : `<circle cx="${x(result.requestedD)}" cy="${y(selected)}" r="6" fill="#087f78" stroke="white" stroke-width="3"/>`;
  return `<defs><pattern id="cc-hatch" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0,9 9,0" stroke="#bd7760" stroke-opacity=".15"/></pattern></defs>
  <rect x="58" y="30" width="${x(THRESHOLD_BRACKET[0])-58}" height="222" fill="#fff5ef"/><rect x="58" y="30" width="${x(THRESHOLD_BRACKET[0])-58}" height="222" fill="url(#cc-hatch)"/>
  ${grid}<path d="M58 30V252H558" fill="none" stroke="#9caeba"/>${ticks}
  <line x1="${x(THRESHOLD_BRACKET[0])}" y1="30" x2="${x(THRESHOLD_BRACKET[0])}" y2="252" stroke="#a16d1d" stroke-dasharray="4 4"/>
  <text x="133" y="56" text-anchor="middle" class="zone-label">不可行区域</text><text x="133" y="75" text-anchor="middle" class="axis">此处不绘制容量</text>
  <line x1="308" y1="30" x2="308" y2="252" stroke="#98b7b0" stroke-dasharray="3 5"/>
  <path data-curve="attainable" d="${curvePath(points)}" stroke="#087f78" stroke-width="3" fill="none" stroke-linejoin="round"/>
  <text x="420" y="49" class="plateau-label">平台：1 − h(1/4)</text>
  <line x1="${x(result.requestedD)}" y1="30" x2="${x(result.requestedD)}" y2="252" stroke="#152b40" stroke-opacity=".45" stroke-dasharray="3 4"/>${marker}
  <text x="58" y="17" class="axis">可达容量 C(D) · bits / channel use</text><text x="558" y="305" text-anchor="end" class="axis">失真预算 D →</text><text x="${x(THRESHOLD_BRACKET[0])+6}" y="302" class="boundary-label">D* ≈ 0.15514</text>`;
}

export function currentView(state) {
  if (state.phase !== 'ready' || !state.result) return null;
  const r = state.result, status = STATUS[r.feasibility.status];
  return { status, rate: r.feasibility.feasibleRate === null ? '未给出' : meaningful(r.feasibility.feasibleRate),
    rateNote: r.feasibility.feasibleRate === null ? 'feasibleRate = null' : 'bits / channel use',
    budget: precise(r.requestedD), actual: fmt(r.metrics.actualDistortion), effective: precise(r.effectiveD),
    channel: fmt(r.formula.unconstrainedCapacity), cost: fmt(r.formula.stateDescriptionCost),
    balance: meaningful(r.formula.rawInformationBalance), pmfObjective: fmt(r.metrics.pmfObjective,12),
    informationUVY: fmt(r.metrics.informationUVY,12), informationUVS: fmt(r.metrics.informationUVS,12),
    informationUS: fmt(r.metrics.informationUS,12), residual: r.checks.maximumRequiredResidual.toExponential(2),
    revision: state.revision, result:r };
}

export function pmfHTML(result, selectedIndex=0) {
  if (!result) return '<p class="empty-pmf">当前没有有效 PMF</p>';
  const max = Math.max(...result.atoms.map(atom=>atom.probability));
  return result.atoms.map((a,i) => `<button type="button" class="pmf-cell" data-atom="${i}" aria-pressed="${i===selectedIndex}" aria-label="U ${a.U}, E ${a.E}, V ${a.V}, Z ${a.Z}; S ${a.S}, X ${a.X}, Y ${a.Y}, 重构 ${a.Shat}; 概率 ${a.probability}" style="--mass:${max===0?0:a.probability/max}"><span>${a.probability === 0 ? '0' : fmt(a.probability,5)}</span></button>`).join('');
}

export function atomText(result, selectedIndex=0) {
  if (!result) return '选择一个概率格，核对确定性映射';
  const a=result.atoms[selectedIndex];
  return `U,E,V,Z = (${a.U},${a.E},${a.V},${a.Z}) → S=${a.S}，X=${a.X}，Y=${a.Y}，Ŝ=${a.Shat}；概率 ${a.probability}`;
}
