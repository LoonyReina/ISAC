
(()=>{if(typeof document==='undefined')return;const bw=document.getElementById('bw'),tm=document.getElementById('tm');function update(){const b=Number(bw.value),t=Number(tm.value),dr=150/b,dv=(3e8/28e9)/(2*t/1000);document.getElementById('bwval').textContent=b+' MHz';document.getElementById('tmval').textContent=t+' ms';document.getElementById('dr').textContent=dr.toFixed(2)+' m';document.getElementById('dv').textContent=dv.toFixed(3)+' m/s';document.getElementById('ratio').textContent=(2/dr).toFixed(2);for(const [id,center]of [['lineA',99],['lineB',101]]){let d='';for(let i=0;i<=600;i++){const r=95+i/60,z=(r-center)/dr,s=Math.abs(z)<1e-9?1:Math.sin(Math.PI*z)/(Math.PI*z);d+=(i?'L':'M')+(55+45*(r-95)).toFixed(2)+' '+(235-215*s*s).toFixed(2)+' ';}document.getElementById(id).setAttribute('d',d);}document.getElementById('labnote').textContent=dr>2?'当前单目标响应较宽：2 m 间距小于理想距离分辨尺度；这不是双目标检测或分辨成功率。':'当前单目标响应较窄：2 m 间距达到或超过理想距离分辨尺度；实际双目标结果仍依赖相位、强弱、噪声与处理器。';}bw.addEventListener('input',update);tm.addEventListener('input',update);update();})();


// Optional finite-OFDM exercise. Separate from the original single-target curves.
(function (root) {
  'use strict';
  const N = 64, B = 100e6, C = 3e8, DF = B / N;
  function rng(seed) {
    let state = seed >>> 0;
    return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return (state + 0.5) / 4294967296; };
  }
  function observe(options = {}) {
    const p = Object.assign({ separation: 4, phaseDeg: 0, strengthDb: 0, noiseRms: 0, seed: 20261023 }, options);
    for (const key of ['separation', 'phaseDeg', 'strengthDb', 'noiseRms', 'seed']) {
      if (!Number.isFinite(p[key])) throw new RangeError('Non-finite observation parameter: ' + key);
    }
    if (p.separation < 0 || p.separation > 16 || p.noiseRms < 0 || p.strengthDb < -30 || p.strengthDb > 0) throw new RangeError('Observation parameter out of range');
    const random = rng(p.seed), symbols = [], received = [], channel = [];
    const amplitude = Math.pow(10, p.strengthDb / 20), phase = p.phaseDeg * Math.PI / 180;
    for (let k = 0; k < N; k++) {
      const angle = Math.floor(random() * 4) * Math.PI / 2;
      symbols.push({ re: Math.cos(angle), im: Math.sin(angle) });
    }
    for (let k = 0; k < N; k++) {
      const a = -2 * Math.PI * k * DF * 2 * 10 / C;
      const b = -2 * Math.PI * k * DF * 2 * (10 + p.separation) / C + phase;
      const h = { re: Math.cos(a) + amplitude * Math.cos(b), im: Math.sin(a) + amplitude * Math.sin(b) };
      const z = Math.sqrt(-2 * Math.log(random())), theta = 2 * Math.PI * random();
      const s = symbols[k], sigma = p.noiseRms / Math.sqrt(2);
      channel.push(h);
      received.push({ re: s.re * h.re - s.im * h.im + sigma * z * Math.cos(theta), im: s.re * h.im + s.im * h.re + sigma * z * Math.sin(theta) });
    }
    return { parameters: p, symbols, received, channel };
  }
  function process(observation, padding = 1, wrongReference = false) {
    if (![1, 4, 8].includes(padding)) throw new RangeError('Padding must be 1, 4 or 8');
    const samples = observation.received.map((y, k) => {
      // Unit-modulus QPSK: division by s equals multiplication by conjugate(s).
      const s = observation.symbols[(k + (wrongReference ? 1 : 0)) % N];
      return { re: y.re * s.re + y.im * s.im, im: y.im * s.re - y.re * s.im };
    });
    const grid = Array.from({ length: N * padding }, (_, j) => {
      let re = 0, im = 0;
      for (let k = 0; k < N; k++) {
        const angle = 2 * Math.PI * k * j / (N * padding), co = Math.cos(angle), si = Math.sin(angle);
        re += samples[k].re * co - samples[k].im * si;
        im += samples[k].re * si + samples[k].im * co;
      }
      re /= N; im /= N;
      return { range: j * C / (2 * B * padding), re, im, power: re * re + im * im };
    });
    const maximum = grid.reduce((best, point) => point.power > best.power ? point : best, grid[0]);
    const energy = samples.reduce((sum, z) => sum + z.re * z.re + z.im * z.im, 0) / N;
    return { samples, grid, maximum: energy < 1e-24 ? null : maximum, energy, padding, wrongReference };
  }
  const api = { observe, process, N, B, DF, C };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ResolutionTwoTarget = api;
  if (typeof document === 'undefined' || !document.getElementById('two-target-exercise')) return;
  const el = id => document.getElementById(id);
  let observation;
  function render() {
    const result = process(observation, Number(el('tt-padding').value), el('tt-wrong').checked);
    const p = observation.parameters;
    el('tt-separation-value').textContent = p.separation.toFixed(2) + ' m';
    el('tt-phase-value').textContent = p.phaseDeg + '°';
    el('tt-strength-value').textContent = p.strengthDb + ' dB';
    el('tt-noise-value').textContent = p.noiseRms.toFixed(2);
    el('tt-truth').textContent = '真值：R₁ = 10.00 m，R₂ = ' + (10 + p.separation).toFixed(2) + ' m。';
    const peak = result.maximum;
    el('tt-result').textContent = '原始复观测：64 格；补零 ×' + result.padding + '，格距 ' + (1.5 / result.padding).toFixed(4) + ' m；固定分辨尺度 1.50 m。平均观测功率 ' + result.energy.toPrecision(4) + '。' + (peak ? '全不模糊区间的最大匹配候选：' + peak.range.toFixed(4) + ' m，功率 ' + peak.power.toPrecision(4) + '。' : '观测近零，不能报告距离候选。');
    el('tt-warning').textContent = result.wrongReference ? '本次只破坏“已知数据正确消除”一个假设：使用错位一格的 QPSK 符号相除；原始接收数组不变。残留调制破坏距离相位斜坡，最大候选不能解释为正确目标。' : '正确消除已知 QPSK 数据。没有 CFAR、阈值或目标数估计；最大匹配候选不是检测结果，也不保证两个目标可分。';
    const visible = result.grid.filter(point => point.range <= 32);
    // Fixed scale: never normalize a cancelled/noisy response to a unit-height fake peak.
    const ceiling = Math.max(4, ...visible.map(point => point.power));
    el('tt-scale').textContent = ceiling.toFixed(2);
    el('tt-curve').setAttribute('d', visible.map((point, i) => (i ? 'L' : 'M') + (55 + point.range / 32 * 450).toFixed(3) + ' ' + (235 - point.power / ceiling * 215).toFixed(3)).join(' '));
    for (const [id, range] of [['tt-truth-a', 10], ['tt-truth-b', 10 + p.separation]]) {
      const x = 55 + range / 32 * 450;
      el(id).setAttribute('d', 'M' + x + ' 20V235');
    }
    el('tt-sample').textContent = result.samples.slice(0, 4).map((z, k) => 'k=' + k + ': ' + z.re.toFixed(4) + (z.im < 0 ? ' − ' : ' + ') + Math.abs(z.im).toFixed(4) + 'i').join('；');
  }
  function regenerate() {
    observation = observe({ separation: Number(el('tt-separation').value), phaseDeg: Number(el('tt-phase').value), strengthDb: Number(el('tt-strength').value), noiseRms: Number(el('tt-noise').value) });
    render();
  }
  ['tt-separation', 'tt-phase', 'tt-strength', 'tt-noise'].forEach(id => el(id).addEventListener('input', regenerate));
  ['tt-padding', 'tt-wrong'].forEach(id => el(id).addEventListener('change', render));
  el('tt-cancel').addEventListener('click', () => {
    el('tt-separation').value = '0'; el('tt-phase').value = '180'; el('tt-strength').value = '0'; el('tt-noise').value = '0'; el('tt-wrong').checked = false; regenerate();
  });
  el('tt-reset').addEventListener('click', () => {
    el('tt-separation').value = '4'; el('tt-phase').value = '0'; el('tt-strength').value = '0'; el('tt-noise').value = '0'; el('tt-padding').value = '1'; el('tt-wrong').checked = false; regenerate();
  });
  regenerate();
})(typeof globalThis !== 'undefined' ? globalThis : this);
