import { createLessonController, loadRetainedFixture } from './cooperative-fim-controller.mjs';
import { normalizeState, DEFAULT_STATE } from './cooperative-fim-model.mjs';

import { esc, formatNumber, statusLabel, stateLabel, questions, geometrySVG, boundSVG } from './cooperative-fim-view.mjs';

const $ = id => document.getElementById(id);
function renderResult(result) {
  if(!result)return;
  $('cf-geometry').innerHTML=geometrySVG(result);$('cf-geometry').setAttribute('aria-label',`${stateLabel(result.state)}；归一化位置坐标，所有站点编号保持不变`);
  $('cf-bound').innerHTML=boundSVG(result);
  $('cf-geometry-caption').textContent=result.state.preset==='network'?'固定样本重算 · 布局 0':result.state.preset==='collinear'?'相同四站 · 改变 ε 与几何':'位置坐标 · 相同前缀，不换布局';
  $('cf-geometry-note').textContent=result.state.preset==='collinear'?'x、y 等比例；微小 ε 视觉上近乎重合，计算保留完整坐标':result.kind==='average'?'布局 0 示例，不代表平均布局；x、y 等比例':'x、y 等比例，均为归一化位置坐标';
  $('cf-bound-title').textContent=result.kind==='average'?'02 · 逐个布局求下界，再平均':'02 · 找出信息较弱的方向';
  $('cf-bound-caption').textContent=result.kind==='average'?'有限样本 mean B · 不是平均椭圆':'误差坐标 δ · A/B 共用比例尺';
  $('cf-bound-legend').innerHTML=result.kind==='average'?'<span class="cf-key-a">┄ A · N=4</span>　<span class="cf-key-b">━ B · N=8</span>　布局 → 求界限 → 平均':'<span class="cf-key-a">┄ A 基线</span>　<span class="cf-key-b">━ B 比较</span>　δᵀFδ = 1';
  $('cf-bound-note').textContent=result.kind==='average'?'包含全部尝试；任何未分辨尝试都会使有限平均被暂扣':'无概率覆盖率含义；不是误差散点或置信区域';
  $('cf-bound').setAttribute('aria-label',result.kind==='average'?'有限样本平均下界条形图，数字见下方比较':'同一比例尺的信息界限；半轴、状态与特征值见本次数值细节');
  $('cf-comparison').innerHTML=result.sides.map((side,i)=>{
    const a=side.result?.analysis, summary=side.summary,status=result.kind==='average'?summary?.aggregate_status:a?.status;
    const value=result.kind==='average'?summary?.mean_trace_inverse:a?.trace_inverse;
    const available=typeof value==='number'||value==='infinity';
    const r=side.resource;
    const count=summary?`尝试 ${summary.attempted} / ${summary.expected_attempts}；${Object.entries(summary.status_counts).map(([k,v])=>`${statusLabel(k)} ${v}`).join('，')}`:a?.eigenvalues?`λmin / λmax = ${formatNumber(a.min_max_eigenvalue_ratio,5)}`:'';
    return `<article class="cf-side" data-result-status="${esc(status)}"><h4>${i?'B':'A'} · ${esc(side.label)}</h4><p class="cf-value ${available?'':'cf-unavailable'}">${available?formatNumber(value,7):esc(statusLabel(status))}</p><p class="cf-state-summary">${available?esc(statusLabel(status))+' · ':''}${esc(count)}</p><div class="cf-resource"><span>站数 <b>${r.stations}</b></span><span>有序项 <b>${r.orderedTerms}</b></span><span>参与功率比 <b>${formatNumber(r.powerRatio,4)}</b></span></div></article>`;
  }).join('');
  $('cf-explanation').textContent=result.explanation;
  $('cf-sample-warning').hidden=result.state.preset!=='network';
  $('cf-population-note').hidden=result.state.preset!=='symmetric';
  if(result.kind==='average')$('cf-sample-warning').textContent='固定样本重算；本次有限样本，未证明总体期望 / 方差有限。没有构造平均椭圆';
  else $('cf-sample-warning').textContent='固定样本重算；布局 0 按编号选取，不代表总体平均增益';
  const sidesDetail=result.sides.map((side,i)=>{
    const a=side.result?.analysis,s=side.summary;
    let p=`<h4>${i?'B':'A'} · ${esc(side.label)}</h4>`;
    if(a?.eigenvalues)p+=`<p>布局${result.kind==='average'?' 0 示例':''}：λmin=${formatNumber(a.eigenvalues[0],10)}，λmax=${formatNumber(a.eigenvalues[1],10)}；比值=${formatNumber(a.min_max_eigenvalue_ratio,10)}</p>`;
    if(a?.bound_region_semiaxes)p+=`<p>布局${result.kind==='average'?' 0 示例':''}半轴：${a.bound_region_semiaxes.map(v=>formatNumber(v,10)).join(' / ')}；${a.eigenvector_orientation_defined?'长轴沿小特征值方向':'重复特征值，无唯一首选方向'}</p>`;
    if(side.result?.fim)p+=`<p>F = ${esc(JSON.stringify(side.result.fim.map(row=>row.map(v=>Number(v.toPrecision(10))))))}</p>`;
    if(s)p+=`<p>均值下界的平方根 √(mean B)：${formatNumber(s.sqrt_mean_trace_inverse,10)}<br>逐布局根界限的均值 mean(√B)：${formatNumber(s.mean_root_trace_inverse,10)}</p><p>全部尝试状态：${esc(Object.entries(s.status_counts).map(([k,v])=>`${k}: ${v}`).join('；'))}。尝试 ${s.attempted}/${s.expected_attempts}，完成：${s.complete?'是':'否'}</p>`;
    return `<div>${p}</div>`;
  }).join('');
  $('cf-numerical-detail').innerHTML=`<p>当前展示的运行条件：${esc(stateLabel(result.state))}</p><div class="cf-state-detail">${sidesDetail}</div>${result.statistics?`<p>配对 B₈−B₄ 的样本均值：${formatNumber(result.statistics.pairedMeanDelta,10)}；描述性配对标准误：${formatNumber(result.statistics.descriptivePairedSE,10)}。不作总体收敛或置信覆盖率证明。</p>`:''}`;
  const p=result.provenance;
  $('cf-provenance').textContent=`核心与坐标字节来源（完整字段保存在证据下载）：${JSON.stringify(p)}`;
}
function stateFromURL(){const p=new URLSearchParams(location.search),raw={};for(const key of Object.keys(DEFAULT_STATE)){if(p.has(key))raw[key]=['n','trials'].includes(key)?Number(p.get(key)):p.get(key);}try{return normalizeState(raw);}catch{return {...DEFAULT_STATE};}}
function writeURL(state,replace=false){const url=new URL(location.href);for(const [k,v]of Object.entries(state))url.searchParams.set(k,v);history[replace?'replaceState':'pushState'](null,'',url);}
let lastResult=null,runStarted=0;
const controller=createLessonController({initialState:stateFromURL(),loadFixture:()=>loadRetainedFixture({fixtureURL:new URL('./assets/data/cooperative-fim-retained-coordinates.json',import.meta.url)}),onChange:renderSnapshot});
function renderSnapshot(snapshot){
  const {state,phase,result,progress,error}=snapshot;
  for(const b of document.querySelectorAll('[data-preset]'))b.setAttribute('aria-pressed',String(b.dataset.preset===state.preset));
  for(const label of document.querySelectorAll('[data-control]'))label.hidden=label.dataset.control!==state.preset;
  $('cf-trials-control').hidden=!(state.preset==='network'&&state.view==='average');
  $('cf-n').value=state.n;$('cf-epsilon').value=state.epsilon;$('cf-view').value=state.view;$('cf-trials').value=state.trials;
  $('cf-question').textContent=state.preset==='symmetric'&&state.n===1?'一个站为什么不能约束二维位置？':state.preset==='symmetric'&&state.n===2?'保持两站不变，下界会变吗？':questions[state.preset];
  const busy=['running','cancelling','loading'].includes(phase);
  $('cf-run').disabled=phase==='loading'||phase==='cancelling';$('cf-cancel').hidden=!['running','cancelling'].includes(phase);$('cf-cancel').disabled=phase==='cancelling';
  $('cf-result-panel').setAttribute('aria-busy',String(busy));$('cf-result-panel').classList.toggle('cf-result-stale',phase==='stale'||phase==='running'||phase==='error');
  const text={loading:'正在载入保留坐标…',ready:result?`已完成 · ${stateLabel(result.state)} · 从坐标重新计算`:'坐标已载入，点击“运行比较”',stale:`上一条件，待重算 · 当前选择：${stateLabel(state)}；下方保留原运行标签`,running:`正在重算 · ${stateLabel(state)}${progress?` · ${progress.attempted} / ${progress.requested_attempts} 次前缀尝试`:''}；原结果仍属上一条件`,cancelling:'正在取消，等待保留已完成的尝试数…',cancelled:`已取消，运行未完成${progress?` · 已尝试 ${progress.attempted} / ${progress.requested_attempts}`:''}；不报告完成态平均`,error:`运行失败：${error?.message||error||'未取得可靠结果'}。原结果不代表本次条件`}[phase]||phase;
  $('cf-run-status').textContent=text;$('cf-run-status').dataset.phase=phase;
  $('cf-download').disabled=!result||busy||phase==='error'||phase==='stale';
  if(result&&result!==lastResult){renderResult(result);lastResult=result;if(runStarted){requestAnimationFrame(()=>requestAnimationFrame(()=>{document.documentElement.dataset.cfRunToPaintMs=String(performance.now()-runStarted);runStarted=0;}));}}
  if(phase==='error'){lastResult=null;$('cf-comparison').innerHTML='<p class="cf-empty">本次运行失败，未获得可报告的结果</p>';$('cf-geometry').innerHTML='';$('cf-bound').innerHTML='';$('cf-explanation').textContent='请重试运行。失败没有被替换成旧数值或参考答案。';$('cf-numerical-detail').textContent='本次运行失败，没有完成态数值证据';$('cf-provenance').textContent='本次未获得可验证的计算结果';$('cf-sample-warning').hidden=true;$('cf-population-note').hidden=true;}
  if(phase==='cancelled'&&result?.kind!=='average'){$('cf-comparison').innerHTML='<p class="cf-empty">本次已取消，无完成态平均；已知尝试数见上方状态</p>';$('cf-bound').innerHTML='<text class="cf-svg-note" x="250" y="140" text-anchor="middle">已取消 · 不报告完成态平均</text>';$('cf-explanation').textContent='本次计算未完成，不能把已完成部分当成完整样本。';$('cf-geometry').innerHTML='';$('cf-numerical-detail').textContent='Worker 未返回完整记录；仅保留上方最后报告的尝试数。没有可下载的本次计算证据，也没有完成态平均或配对统计。';$('cf-provenance').textContent='本次计算已取消，未返回可验证的记录';$('cf-sample-warning').hidden=true;$('cf-population-note').hidden=true;lastResult=null;}
}
function changed(patch){controller.setInputs({...controller.getSnapshot().state,...patch});writeURL(controller.getSnapshot().state);}
for(const b of document.querySelectorAll('[data-preset]'))b.addEventListener('click',()=>changed({preset:b.dataset.preset}));
for(const[id,key]of[['cf-n','n'],['cf-epsilon','epsilon'],['cf-view','view'],['cf-trials','trials']])$(id).addEventListener('change',e=>changed({[key]:['n','trials'].includes(key)?Number(e.target.value):e.target.value}));
$('cf-run').addEventListener('click',()=>{runStarted=performance.now();controller.run();});$('cf-cancel').addEventListener('click',()=>controller.cancel());
$('cf-reset').addEventListener('click',()=>{controller.reset();writeURL(controller.getSnapshot().state);});
$('cf-download').addEventListener('click',()=>{const bytes=controller.downloadJSON();if(!bytes)return;const blob=new Blob([bytes],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`cooperative-fim-${controller.getSnapshot().state.preset}-evidence.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
addEventListener('popstate',()=>controller.setInputs(stateFromURL()));addEventListener('pagehide',event=>{if(!event.persisted)controller.destroy();});
// Public diagnostics are limited to UI state and measured latency, not raw records in DOM.
await controller.load();if(controller.getSnapshot().phase!=='error'){writeURL(controller.getSnapshot().state,true);runStarted=performance.now();await controller.run();}
