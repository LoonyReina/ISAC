const colors = ['#245dc1', '#ba5d15'];
export const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function formatNumber(value, digits = 6) {
  if (value === 'infinity') return '∞';
  if (typeof value !== 'number' || !Number.isFinite(value)) return '未报告';
  if (value === 0) return '0';
  if (Math.abs(value) < 0.0001 || Math.abs(value) >= 100000) return value.toExponential(digits - 1);
  return Number(value.toPrecision(digits)).toString();
}
export const statusLabel = status => ({finite:'有限界限',singular:'已证奇异 · 无有限二维界限',unstable:'数值不稳定，暂不报告有限界限',singular_or_roundoff_unresolved:'秩亏或舍入影响未能分辨',invalid_input:'输入几何无效',arithmetic_failure:'计算失败',invalid_matrix:'矩阵无效',zero_information:'零信息',non_psd:'信息矩阵非半正定',nonsymmetric:'信息矩阵不对称',inverse_overflow:'逆矩阵溢出',eigenvalue_overflow:'特征值溢出',incomplete_run:'已取消 / 未完成，无完成态平均',incomplete_numerical_resolution:'存在未分辨尝试，平均暂不报告',contains_infinite_bound:'包含无限界限',all_finite_sample_not_expectation_proof:'本次样本全部有限'})[status] || status || '暂无结果';
export const stateLabel = s => s.preset === 'symmetric' ? `对称布局 · N=2 → ${s.n}` : s.preset === 'collinear' ? `几乎共线 · ε=10⁻³ → ${s.epsilon}` : `随机网络 · N=4 → 8 · ${s.view === 'average' ? `T=${s.trials} 个保留布局` : '保留布局 0'}`;
export const questions = {symmetric:'两站变四站，下界怎样变？资源增加了多少？',collinear:'几乎共线，为什么仍不能总给出有限界限？',network:'同一网络加入较远的站，平均的又是什么？'};

function axes(extent, xLabel, yLabel) {
  const scale = 103 / extent, cx = 250, cy = 135;
  const tick = v => formatNumber(v, 3);
  let body = '<path d="M44 135H456M250 20V250" fill="none" stroke="#c8d4dc"/>';
  for (const v of [-extent, -extent / 2, extent / 2, extent]) {
    const x = cx + v * scale, y = cy - v * scale;
    body += `<path d="M${x} 131v8M246 ${y}h8" stroke="#aebdc7"/><text class="cf-axis-label" x="${x}" y="153" text-anchor="middle">${tick(v)}</text><text class="cf-axis-label" x="241" y="${y + 4}" text-anchor="end">${tick(v)}</text>`;
  }
  body += `<text class="cf-axis-label" x="460" y="139">${xLabel}</text><text class="cf-axis-label" x="258" y="22">${yLabel}</text>`;
  return {body, scale, cx, cy};
}
export function geometrySVG(result) {
  const sides = result.sides;
  const shownCount = result.state.preset === 'network' ? 8 : 4;
  const all = result.geometry?.flatMap(g => ((g.input || g).stations || []).slice(0, shownCount)) || sides.flatMap(s => s.result?.stations || []);
  const target = sides[0]?.result?.target || [0, 0];
  const extent = Math.max(0.1, ...all.flatMap(s => [Math.abs(s[0] - target[0]), Math.abs(s[1] - target[1])])) * 1.25;
  const a = axes(extent, 'x', 'y');
  const point = s => [a.cx + (s[0] - target[0]) * a.scale, a.cy - (s[1] - target[1]) * a.scale];
  const first = sides[0].result?.stations || [], second = sides[1].result?.stations || [];
  let body = a.body;
  const raw = result.geometry?.[1]?.input || result.geometry?.[1];
  const shown = (raw?.stations || second).slice(0, result.state.preset === 'network' ? 8 : 4);
  const candidates = shown.length ? shown : first;
  candidates.forEach((s, i) => {
    const [x,y] = point(s), inA = i < first.length, inB = i < second.length;
    const stroke = inB ? colors[1] : '#82929d';
    body += `<path d="M${a.cx} ${a.cy}L${x} ${y}" stroke="${stroke}" stroke-opacity=".2" ${!inB?'stroke-dasharray="4 4"':''}/>`;
    if (inA && result.state.preset !== 'collinear') body += `<circle cx="${x}" cy="${y}" r="8" fill="white" stroke="${colors[0]}" stroke-width="1.8"/>`;
    if (inB && inA) body += `<circle cx="${x}" cy="${y}" r="3.5" fill="${colors[1]}"/>`;
    else if (inB) body += `<path d="M${x-6} ${y}h12M${x} ${y-6}v12" stroke="${colors[1]}" stroke-width="2.5"/>`;
    else body += `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#82929d" stroke-dasharray="2 2"/>`;
    body += `<text class="cf-svg-label" x="${x+11}" y="${y-9}">${i+1}</text>`;
  });
  if (result.state.preset === 'collinear') first.forEach(s => { const [x,y] = point(s); body += `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${colors[0]}" stroke-width="1.5" stroke-dasharray="3 2"/>`; });
  body += `<path d="m${a.cx} ${a.cy-6} 6 6-6 6-6-6z" fill="#087f78" stroke="white" stroke-width="1.4"/><text class="cf-svg-label" x="${a.cx+10}" y="${a.cy-10}">目标</text>`;
  return `<title>${esc(stateLabel(result.state))}，位置坐标 x 与 y 等比例</title>${body}`;
}
export function boundSVG(result) {
  if (result.kind === 'average') {
    const values = result.sides.map(s => s.summary?.mean_trace_inverse);
    const finite = values.filter(v => typeof v === 'number' && Number.isFinite(v));
    const max = Math.max(...finite, 0.01) * 1.18;
    let body = '<title>各布局先求逆，再平均的有限样本下界；没有平均椭圆</title><path d="M75 225H450M75 30V225" fill="none" stroke="#c8d4dc"/>';
    for(let i=0;i<=4;i++){const v=max*i/4,y=225-185*i/4; body+=`<path d="M72 ${y}H450" stroke="#e5ebee"/><text x="67" y="${y+4}" text-anchor="end" class="cf-axis-label">${formatNumber(v,3)}</text>`;}
    values.forEach((v,i)=>{const x=160+i*165;if(typeof v === 'number' && Number.isFinite(v)){const h=185*v/max;body+=`<rect data-mean="${v}" x="${x-34}" y="${225-h}" width="68" height="${h}" fill="${colors[i]}" fill-opacity="${i?'.85':'.13'}" stroke="${colors[i]}" stroke-width="2" ${i?'':'stroke-dasharray="5 3"'}/><text class="cf-svg-label" x="${x}" y="${215-h}" text-anchor="middle">${formatNumber(v)}</text>`;}else{body+=`<text class="cf-svg-note" x="${x}" y="130" text-anchor="middle">${v==='infinity'?'∞':'未报告'}</text>`;}body+=`<text class="cf-svg-label" x="${x}" y="248" text-anchor="middle">${i?'B · N=8':'A · N=4'}</text>`;});
    return body+'<text class="cf-axis-label" x="80" y="20">mean B（归一化）</text>';
  }
  const finite = result.sides.filter(s=>s.result?.analysis?.status==='finite');
  const extent = Math.max(.6,...finite.map(s=>s.result.analysis.bound_region_semiaxes[0]*1.15));
  const a=axes(extent,'δx','δy'); let body=`<title>信息界限 δᵀFδ=1。A/B 共用等比例误差坐标，不表示置信覆盖率</title><defs><clipPath id="cf-bound-clip"><rect x="42" y="28" width="416" height="213"/></clipPath></defs>${a.body}`;
  result.sides.forEach((side,i)=>{
    const analysis=side.result?.analysis, color=colors[i];if(!analysis)return;
    const style=`fill="none" stroke="${color}" stroke-width="${i?'2.6':'2'}" ${i?'':'stroke-dasharray="6 4"'}`;
    if(analysis.status==='finite'){
      const [long,short]=analysis.bound_region_semiaxes,[v,w]=analysis.eigenvectors;
      const path=Array.from({length:161},(_,k)=>{const t=k*2*Math.PI/160,dx=long*Math.cos(t)*v[0]+short*Math.sin(t)*w[0],dy=long*Math.cos(t)*v[1]+short*Math.sin(t)*w[1];return `${k?'L':'M'}${a.cx+dx*a.scale},${a.cy-dy*a.scale}`;}).join(' ')+'Z';
      body+=`<path data-side="${i}" data-status="finite" data-semimajor="${long}" data-semiminor="${short}" data-shared-scale="${a.scale}" d="${path}" ${style}/>`;
      body+=`<text class="cf-axis-label" x="${i?270:18}" y="270" fill="${color}">${i?'B':'A'} 半轴 ${formatNumber(long,5)} / ${formatNumber(short,5)}</text>`;
    }else if(analysis.status==='singular'){
      // Certified one-station case: unbounded weak axis, finite half-width.
      const [weak,strong]=analysis.eigenvectors,half=1/Math.sqrt(analysis.eigenvalues[1]),reach=extent*5;
      const vertices=[[-1,-1],[-1,1],[1,1],[1,-1]].map(([u,v])=>[a.cx+(u*half*strong[0]+v*reach*weak[0])*a.scale,a.cy-(u*half*strong[1]+v*reach*weak[1])*a.scale]);
      body+=`<polygon data-side="${i}" data-status="singular" points="${vertices.map(p=>p.join(',')).join(' ')}" fill="${color}" fill-opacity=".08" stroke="${color}" stroke-width="2" clip-path="url(#cf-bound-clip)"/>`;
      body+=`<path d="M${a.cx-6} 38l6-8 6 8M${a.cx-6} 231l6 8 6-8" fill="none" stroke="${color}" stroke-width="2"/><text class="cf-svg-label" x="${a.cx+15}" y="45">B：沿 y 无界 ↑↓</text><text class="cf-axis-label" x="270" y="270">B 条带半宽 ${formatNumber(half)}；无有限椭圆</text>`;
    }else{
      const weak=analysis.eigenvectors?.[0];
      if(weak)body+=`<path data-status="${esc(analysis.status)}" d="M${a.cx-36*weak[0]} ${a.cy+36*weak[1]}L${a.cx+36*weak[0]} ${a.cy-36*weak[1]}" stroke="#657681" stroke-width="3" stroke-dasharray="2 4"/>`;
      body+=`<text class="cf-axis-label" x="270" y="270">B 仅标弱方向；无可信有限椭圆</text>`;
    }
  });
  return body;
}
