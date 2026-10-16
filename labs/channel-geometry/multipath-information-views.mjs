/** Pure presentation of accepted records. No Fisher, pulse, covariance or rank calculation. */
export const escapeHTML = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const number = (value, digits = 4) => Number.isFinite(value) ? (Math.abs(value) >= 1e4 || (value !== 0 && Math.abs(value) < .001) ? value.toExponential(2) : Number(value.toPrecision(digits)).toString()) : '—';
export function statusText(branch) {
  const status = typeof branch === 'string' ? branch : branch?.status;
  return ({finite:'当前有限采样场景的条件下界', pending:'正在重算；旧结果已清空', idle:'等待计算',
    'invalid-input':'输入不在已核验范围内；未给出误差界',
    'covariance-factorization-failed':'协方差或数值求解未通过检查；未给出误差界',
    'numerical-failure':'协方差或数值求解未通过检查；未给出误差界',
    'singular-nuisance-block':'两条独立复增益参数化在此处奇异；不能按本式报告有限 PEB',
    'numerically-unresolved-nuisance':'接近秩亏，当前精度不足以可靠报告 PEB',
    'numerically-unresolved-position':'接近秩亏，当前精度不足以可靠报告 PEB',
    'unidentifiable-position':'当前模型不能约束两个位置方向；无有限二维 PEB',
    'singular-clock-nuisance':'公共时钟的干扰参数消除未通过检查；无有限二维 PEB',
    'not-computed':'本分支未计算；详见原因', cancelled:'已取消；当前输入保留，可重新计算',
    error:'计算未完成；请重试或查看核验信息'})[status] || '结果尚未通过检查';
}
const text = (x,y,value,attrs='') => `<text x="${x}" y="${y}" ${attrs}>${escapeHTML(value)}</text>`;
const line = (x1,y1,x2,y2,cls='mpi-grid') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
const svg = (content, width, height, label, extra='') => `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHTML(label)}" ${extra}>${content}</svg>`;
export function emptyPlot(message, width = 620, height = 275) {
  return svg(text(width/2,height/2,message,'text-anchor="middle" class="mpi-empty"'),width,height,message);
}
function segments(records, branch, x, y) {
  const groups=[]; let points=[];
  for (const r of records) {
    if (r && r[branch]?.status === 'finite' && r[branch].pebM > 0) points.push(`${x(r.input.heightM)},${y(r[branch].pebM)}`);
    else {if(points.length) groups.push(points); points=[];}
  }
  if(points.length) groups.push(points);
  return groups.map(g=>`<polyline points="${g.join(' ')}" class="mpi-${branch}" fill="none"/>`).join('');
}
export function sweepPlot(records, {heightM, near = true, pending = false, width = 620} = {}) {
  const maxX = near ? 1 : 6, shown = records.filter(r=>r && r.input.heightM <= maxX);
  const valid = shown.flatMap(r=>['exact','approximate'].map(k=>r[k]?.status==='finite'?r[k].pebM:null)).filter(v=>v>0);
  if(!valid.length) return emptyPlot(pending?'正在计算 10 个指定场景':'没有可绘制的有限点',width);
  const low = Math.floor(Math.log10(Math.min(...valid))), high = Math.max(low+1,Math.ceil(Math.log10(Math.max(...valid))));
  const x=h=>64+h/maxX*(width-90), y=p=>226-(Math.log10(p)-low)/(high-low)*176;
  let out=text(64,22,'PEB / m · 对数轴');
  for(let p=low;p<=high;p++){const yy=y(10**p);out+=line(64,yy,width-26,yy)+text(54,yy+4,number(10**p),'text-anchor="end"');}
  for(const h of (near?[0,.25,.5,.75,1]:[0,2,4,6]))out+=line(x(h),50,x(h),226)+text(x(h),247,h,'text-anchor="middle"');
  out+=text(width-26,270,'高度 h / m','text-anchor="end"');
  if(heightM!==null && heightM<=maxX)out+=line(x(heightM),44,x(heightM),226,'mpi-cursor');
  for(const key of ['approximate','exact']) {
    out+=segments(shown,key,x,y);
    for(const r of shown)if(r[key]?.status==='finite'&&r[key].pebM>0) {
      const label=`h=${r.input.heightM} m${r.input.heightM===0?'（重合边界）':''}；${key==='exact'?'完整采样模型':'非重叠近似'} PEB ${number(r[key].pebM)} m，选择此指定场景`;
      out+=`<circle cx="${x(r.input.heightM)}" cy="${y(r[key].pebM)}" r="4" class="mpi-point mpi-${key}" data-mpi-height="${r.input.heightM}" tabindex="0" role="button" aria-label="${escapeHTML(label)}"><title>${escapeHTML(label)}</title></circle>`;
    }
  }
  return svg(out,width,278,'10 个指定高度的完整与近似 PEB；横轴高度，纵轴 PEB 对数刻度。折线只连接已计算的有限相邻点。',`data-mpi-domain="0,${maxX}" data-mpi-log="true"`);
}
export function sweepGaps(records) {
  if(!records.some(Boolean)) return '<p>尚无已计算点。</p>';
  const gaps=[];
  for(const r of records.filter(Boolean)) for(const key of ['exact','approximate']) if(r[key]?.status!=='finite')
    gaps.push(`<li data-mpi-gap="${r.input.heightM}:${key}">h=${number(r.input.heightM)} m · ${key==='exact'?'完整':'近似'}：${escapeHTML(statusText(r[key]))}</li>`);
  return gaps.length?`<ul>${gaps.join('')}</ul>`:'<p>已计算点的两分支均为有限值。</p>';
}
export function pulsePlot(record, iq = false, width = 620) {
  if(!record?.samples) return emptyPlot('当前场景尚无采样结果');
  const tau=record.geometry.tauNs, t=record.samples.timeNs;
  const lo=Math.max(0,Math.floor(Math.min(...tau)-3)), hi=Math.min(48,Math.ceil(Math.max(...tau)+3));
  const x=v=>60+(v-lo)/(hi-lo)*(width-85);
  const columns=iq?record.samples.complexMean:record.samples.pulseTemplates;
  const vals=columns.filter((_,i)=>t[i]>=lo&&t[i]<=hi).flat();
  const extent=Math.max(.5,...vals.map(Math.abs))*1.1, y=v=>147-v/extent*84;
  let out=text(60,22,iq?'复均值 μ=Sα · I / Q':'RRC 实模板 · 未乘复增益');
  for(const v of [-extent,0,extent])out+=line(60,y(v),width-25,y(v))+text(50,y(v)+4,number(v,2),'text-anchor="end"');
  const step=Math.max(1,Math.ceil((hi-lo)/6));
  for(let v=lo;v<=hi;v+=step)out+=text(x(v),254,v,'text-anchor="middle"');
  for(let j=0;j<2;j++) {
    const points=t.flatMap((v,i)=>v>=lo&&v<=hi?[`${x(v)},${y(columns[i][j])}`]:[]);
    out+=`<polyline points="${points.join(' ')}" class="mpi-template-${j}" fill="none"/>`;
    if(!iq)out+=line(x(tau[j]),53,x(tau[j]),235,'mpi-delay')+text(x(tau[j]),j?48:34,`τ${j}=${number(tau[j],5)} ns`,'text-anchor="middle"');
  }
  if(!iq)out+=line(x(tau[0]),72,x(tau[1]),72,'mpi-bracket')+line(x(tau[0]),67,x(tau[0]),77,'mpi-bracket')+line(x(tau[1]),67,x(tau[1]),77,'mpi-bracket');
  out+=text(width-25,274,`接收时间 / ns · 图示 [${lo}, ${hi}]`,'text-anchor="end"');
  return svg(out,width,285,iq?'同一当前记录的复数均值。蓝色 I 实部，橙色 Q 虚部；不是噪声样本或功率。':'同一当前记录中两个实际采样的 RRC 实模板；没有乘增益，不是观测功率。',`data-mpi-record-id="${escapeHTML(record.recordId)}"`);
}
export function ellipsePlot(record) {
  if(!record) return {html:emptyPlot('等待当前场景',280,280),extent:null};
  const branches=['exact','approximate'].filter(k=>record[k]?.status==='finite'&&record[k].ellipse);
  if(!branches.length)return {html:emptyPlot('无有限二维椭圆',280,280),extent:null};
  const maximum=Math.max(...branches.flatMap(k=>record[k].ellipse.semiaxesM));
  const extent=Number((maximum*1.15).toPrecision(2)), center=144, scale=97/extent;
  let out='';
  for(const t of [-extent,0,extent]) {
    out+=line(center+t*scale,47,center+t*scale,241)+line(47,center-t*scale,241,center-t*scale);
    out+=text(center+t*scale,258,number(t,3),'text-anchor="middle"')+text(40,center-t*scale+4,number(t,3),'text-anchor="end"');
  }
  out+=text(143,18,'CRB 单位椭圆','text-anchor="middle"')+text(241,279,'Δx / m','text-anchor="end"')+text(5,35,'Δy / m');
  for(const k of branches) {
    const e=record[k].ellipse, points=[];
    for(let i=0;i<=96;i++) {
      const a=2*Math.PI*i/96;
      const dx=e.semiaxesM[0]*Math.cos(a)*e.unitVectors[0][0]+e.semiaxesM[1]*Math.sin(a)*e.unitVectors[1][0];
      const dy=e.semiaxesM[0]*Math.cos(a)*e.unitVectors[0][1]+e.semiaxesM[1]*Math.sin(a)*e.unitVectors[1][1];
      points.push(`${center+scale*dx},${center-scale*dy}`);
    }
    out+=`<polyline points="${points.join(' ')}" class="mpi-${k}" fill="none" data-mpi-ellipse="${k}"/>`;
  }
  out+=`<circle cx="${center}" cy="${center}" r="2" class="mpi-origin"/>`;
  return {html:svg(out,280,286,'当前记录的 CRB 单位椭圆，完整与近似共用相同米刻度和等比例横纵轴；中心为零误差。',`data-mpi-record-id="${escapeHTML(record.recordId)}" data-mpi-equal-scale="true" data-mpi-extent="${extent}"`),extent};
}
export function conclusion(record) {
  if(!record) return '改变高度或相位，比较同一资源下的两个模型。';
  if(record.exact.status!=='finite')return statusText(record.exact)+(record.input.heightM===0?'。这是独立复增益参数化的重合边界，不意味着所有物理位置信息为零。':'。');
  if(record.approximate.status!=='finite')return `完整模型 PEB 为 ${number(record.exact.pebM)} m；近似分支没有有限结果。`;
  const ratio=record.exact.pebM/record.approximate.pebM;
  const difference=ratio<1?'略低于':'高于';
  return `本场景完整模型 PEB ${number(record.exact.pebM)} m，${difference}近似的 ${number(record.approximate.pebM)} m（${number(ratio,3)} 倍）。近似不是通用上界或下界。`;
}
export function gainBars(record) {
  if(!record?.fisher?.positionInformationSubtraction || record.exact.status!=='finite')return `<p>${escapeHTML(statusText(record?.exact))}；此处不画有限的信息扣除条。</p>`;
  const values=[record.knownGain.efim[1][1],record.fisher.positionInformationSubtraction[1][1],record.exact.efim[1][1]];
  const labels=['增益已知：额外先验','可由增益解释的部分','增益未知：剩余信息'];
  const max=Math.max(...values);
  return `<div class="mpi-gain-bars">${values.map((v,i)=>`<div><span>${labels[i]}</span><span class="mpi-gain-track"><i style="width:${100*Math.max(0,v)/max}%"></i></span><strong>${number(v)} m⁻²</strong></div>`).join('')}</div>`;
}
export function diagnosticText(record) {
  if(!record)return '当前没有可核验的计算记录。';
  const lines=[`记录：${record.recordId}`,`输入：${JSON.stringify(record.input)}`,`核心：${record.coreVersion}；方法：${record.methodVersion}`];
  for(const key of ['exact','approximate','knownGain','unknownClock']) {
    const b=record[key]; lines.push(`${key}：${b.status}；原因 ${b.reason??'无'}；原始特征值 ${JSON.stringify(b.rawEigenvalues)}；PEB ${b.pebM===null?'null':b.pebM} m`);
  }
  lines.push(`采样：${record.samples?.timeNs.length??'未生成'}；协方差重用：${record.covariance?.reused??'未生成'}`,
    `完整矩阵、来源哈希、单位、PDP、阈值与求解残差见完整 JSON。浏览器绘制时延不写入科学记录。`);
  return lines.join('\n');
}
