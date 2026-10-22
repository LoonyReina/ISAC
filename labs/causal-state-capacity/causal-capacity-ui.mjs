import { createLessonController, DEFAULT_D } from './causal-capacity-controller.mjs';
import { computeCurve, curveSVG, currentView, pmfHTML, atomText, fmt, precise } from './causal-capacity-view.mjs';

export function downloadJSON(json, filename) {
  const url=URL.createObjectURL(new Blob([json], {type:'application/json;charset=utf-8'}));
  const anchor=document.createElement('a');
  anchor.href=url; anchor.download=filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

/** Mounts only this lesson; dependency injection is for DOM/export tests, not the science. */
export function mountCausalCapacityLesson(root=document, {saveFile=downloadJSON, autoStart=true}={}) {
  const byId=id => { const el=root.querySelector(`#${id}`); if (!el) throw new Error(`Missing lesson element: ${id}`); return el; };
  const el=Object.fromEntries(['budget','budget-slider','run','reset','export','status','results','input-error',
    'curve','feasibility','revision','rate','rate-unit','requested','actual','channel','cost','balance','result-explanation',
    'pmf','pmf-total','pmf-parameters','atom-detail','information-y','information-s','information-us','pmf-objective','residual','source-link']
    .map(name=>[name,byId(`cc-${name}`)]));
  const presets=[...root.querySelectorAll('[data-budget]')];
  const listeners=[];
  const listen=(target,event,handler)=>{target.addEventListener(event,handler);listeners.push(()=>target.removeEventListener(event,handler));};
  const curve=computeCurve();
  let selectedAtom=0;
  let disposed=false;
  let controller;
  function render(state) {
    if (disposed) return;
    const ready=state.phase==='ready' && state.result!==null;
    const invalid=state.phase==='invalid' || state.phase==='error';
    el.export.disabled=!ready;
    el.results.setAttribute('aria-busy',String(state.phase==='pending'));
    el.budget.setAttribute('aria-invalid',String(state.phase==='invalid'));
    el['input-error'].hidden=!invalid;
    el['input-error'].textContent=invalid ? (state.phase==='invalid' ? '请输入 0–0.5 之间的有限数字；空值和非数字不参与计算。旧结果已清除。' : `计算失败：${state.error}。未接受本次结果。`) : '';
    el.status.dataset.phase=state.phase;
    el.status.dataset.tone='';
    const v=currentView(state);
    el.curve.innerHTML=curveSVG(curve,ready?state.result:null);
    if (!v) {
      for (const name of ['rate','requested','actual','channel','cost','balance','information-y','information-s','information-us','pmf-objective','residual','revision']) el[name].textContent='—';
      el['rate-unit'].textContent='无当前有效结果';
      el.feasibility.textContent=state.phase==='pending'?'计算中':'无当前结果';
      el.feasibility.dataset.tone='';
      el['result-explanation'].textContent='当前结果已清除；可行性、容量与 PMF 以新的有效计算为准。';
      el.pmf.innerHTML=pmfHTML(null);
      el['pmf-total'].textContent='Σ P = —';
      el['pmf-parameters'].textContent='当前没有有效 PMF';
      el['atom-detail'].textContent=atomText(null);
      el.curve.setAttribute('aria-label','当前没有有效容量—失真结果');
      el.status.textContent=state.phase==='pending'?'正在重算 16 个概率原子；旧结果与导出已清除…':
        state.phase==='invalid'?'输入无效 · 旧结果已清除，无法导出':
        state.phase==='error'?'计算失败 · 本次结果未接受，无法导出':'已重置 · 旧结果已清除。调整 D 或点“重新计算”。';
      presets.forEach(button=>button.setAttribute('aria-pressed','false'));
      return;
    }
    const r=v.result;
    el.status.dataset.tone=v.status.tone;
    el.status.textContent=`${v.status.label} · D = ${v.budget} · 16 原子校验通过 · 修订 ${v.revision}`;
    el.feasibility.textContent=v.status.label; el.feasibility.dataset.tone=v.status.tone;
    el.revision.textContent=`rev ${v.revision}`;
    for (const [name,key] of Object.entries({rate:'rate','rate-unit':'rateNote',requested:'budget',actual:'actual',channel:'channel',cost:'cost',balance:'balance','information-y':'informationUVY','information-s':'informationUVS','information-us':'informationUS','pmf-objective':'pmfObjective',residual:'residual'})) el[name].textContent=v[key];
    el['result-explanation'].textContent=v.status.explanation;
    el.curve.setAttribute('aria-label',`固定 p=q=1/4 的可达容量—失真曲线；D=${v.budget}，${v.status.label}，可达容量${r.feasibility.feasibleRate===null?'未给出（null）':v.rate+' bits/use'}。不可行区与未分辨区不绘制容量。`);
    selectedAtom=0;
    el.pmf.innerHTML=pmfHTML(r,selectedAtom);
    el['pmf-total'].textContent=`Σ P = ${fmt(r.atoms.reduce((sum,a)=>sum+a.probability,0),6)}`;
    el['pmf-parameters'].textContent=`Pr(U=1) = ${fmt(r.distribution.UProbabilityOne)}；Pr(E=1) = ${precise(r.distribution.EProbabilityOne)}；Pr(V=1) = 0.5；Pr(Z=1) = 0.25`;
    el['atom-detail'].textContent=atomText(r,selectedAtom);
    el['source-link'].href=r.source.url;
    presets.forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.budget)===r.requestedD)));
  }
  controller=createLessonController({onState:render});
  function updateSlider(D) {
    if (Number.isFinite(D) && D>=0 && D<=.5) {
      el['budget-slider'].value=String(D);
      el['budget-slider'].setAttribute('aria-valuetext',`粗调位置 ${el['budget-slider'].value}；精确预算以数字框为准`);
    } else el['budget-slider'].setAttribute('aria-valuetext','当前数字框输入无效；移动滑块可设置新的预算');
  }
  function submitNumber() { const D=el.budget.valueAsNumber; updateSlider(D); return controller.change(D); }
  listen(el.budget,'input',submitNumber);
  listen(el['budget-slider'],'input',()=>{el.budget.value=String(el['budget-slider'].valueAsNumber);return submitNumber();});
  listen(el.run,'click',submitNumber);
  listen(el.reset,'click',()=>{el.budget.value=String(DEFAULT_D);updateSlider(DEFAULT_D);controller.reset();});
  for (const button of presets) listen(button,'click',()=>{el.budget.value=button.dataset.budget;return submitNumber();});
  listen(el.pmf,'click',event=>{
    const button=event.target.closest('[data-atom]');
    if (!button || !el.pmf.contains(button)) return;
    const state=controller.getState(); if(state.phase!=='ready')return;
    selectedAtom=Number(button.dataset.atom);
    if (!Number.isInteger(selectedAtom) || selectedAtom<0 || selectedAtom>=16)return;
    for(const cell of el.pmf.querySelectorAll('[data-atom]'))cell.setAttribute('aria-pressed',String(Number(cell.dataset.atom)===selectedAtom));
    el['atom-detail'].textContent=atomText(state.result,selectedAtom);
    // No DOM replacement: the keyboard focus stays on the selected cell.
  });
  listen(el.export,'click',()=>{
    try {
      const json=controller.exportCurrentJSON();
      const state=controller.getState();
      saveFile(json,`causal-capacity-D-${state.requestedD}-rev-${state.revision}.json`);
      el.status.textContent=`已导出当前修订 ${state.revision} · D = ${state.requestedD} · 完整 PMF 与来源已包含`;
    } catch(error) {el.status.textContent=`无法导出：${error.message}`;}
  });
  render(controller.getState());
  const ready=autoStart?submitNumber():Promise.resolve(null);
  return Object.freeze({controller,ready,curve,dispose(){disposed=true;listeners.forEach(remove=>remove());controller.dispose();}});
}

if (typeof document!=='undefined' && document.querySelector('#cc-budget')) {
  try { mountCausalCapacityLesson(document, {autoStart:globalThis.ISACGuidedManual !== true}); }
  catch (error) {
    const status=document.querySelector('#cc-status');
    if(status){status.dataset.phase='error';status.textContent=`初始化失败：${error.message}。未生成或接受计算结果。`;}
    const output=document.querySelector('#cc-export'); if(output)output.disabled=true;
  }
}
