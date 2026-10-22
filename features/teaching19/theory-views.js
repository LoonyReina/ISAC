/* Presentation only: original nodes, values, hidden gates and native solver untouched. */
(function(global){
'use strict';
function install(doc,lesson){
 const id=lesson.id, waveform=id==='optimal_waveform', joint=id==='joint_beamforming', crb=id==='crb'&&lesson.coreId!=='extended-target',gt=id==='supplement-case-crb',nf=id==='supplement-case-near-field',mpi=id==='supplement-case-multipath-channel',cf=id==='supplement-case-distributed-detection',mt=id==='nearfield-multitarget-correlation';
 if(!waveform&&!joint&&!crb&&!gt&&!nf&&!mpi&&!cf&&!mt)return {show(){},restore(){},guide(){}};
 const root=doc.querySelector(waveform?'#wfl-result':joint?'.jbo-output':crb?'.cm-answer':gt?'.gt-layout':nf?'.nfr-results':mpi?'#position-information':cf?'#cf-results':'#mt-results');
 if(!root)return {show(){},restore(){},guide(){}};
 let showMultitarget=()=>{};let showNearfield=()=>{};let extraRestore=()=>{};let active=false, moves=[], additions=[], rowClasses=new Map(), observer=null;
 const cls='theory-guided-secondary-row';
 function move(node,parent,before=null){if(!node)return;const marker=doc.createComment('theory-guided-original-position');node.parentNode.insertBefore(marker,node);moves.push({node,marker});parent.insertBefore(node,before);}
 function detail(label){const d=doc.createElement('details'),s=doc.createElement('summary');s.textContent=label;d.appendChild(s);additions.push(d);return d;}
 function restore(){showMultitarget=()=>{};showNearfield=()=>{};extraRestore();extraRestore=()=>{};if(observer)observer.disconnect();observer=null;for(const [r,had] of rowClasses)if(!had)r.classList.remove(cls);rowClasses.clear();for(const {node,marker} of moves.reverse())if(marker.parentNode)marker.parentNode.replaceChild(node,marker);moves=[];for(const n of additions)n.remove();additions=[];active=false;}
 function guide(){if(active)return;active=true;
  const style=doc.createElement('style');style.textContent='.theory-guided-compact svg{width:100%;height:260px;max-height:260px}.theory-guided-compact{margin:8px 0}.theory-guided-ledger-compact .theory-guided-secondary-row{display:none}.gt-layout:has(.theory-guided-gt){display:block}';root.appendChild(style);additions.push(style);
  if(mt){
   const stage=doc.querySelector('#mt-optimization'),summary=doc.querySelector('#mt-summary');
   if(!stage||!summary){restore();return;}
   const compact='theory-guided-mt-compact',had=root.classList.contains(compact);root.classList.add(compact);extraRestore=()=>{if(!had)root.classList.remove(compact);};
   style.textContent='.theory-guided-mt-compact #mt-summary tr > :not(:nth-child(1)):not(:nth-child(2)):not(:nth-child(3)):not(:nth-child(8)){display:none}.theory-guided-mt-compact #mt-constraints tbody tr:nth-child(n+4){display:none}.theory-guided-mt-compact #mt-summary th,.theory-guided-mt-compact #mt-summary td,.theory-guided-mt-compact #mt-constraints th,.theory-guided-mt-compact #mt-constraints td{padding:5px 7px;font-size:13px;line-height:1.4}';
   const expanded=detail('完整功率、速率、相关与约束表');summary.parentNode.insertBefore(expanded,summary.nextSibling);expanded.addEventListener('toggle',()=>{if(active)root.classList[expanded.open?'remove':'add'](compact);});
   const identity=detail('完整运行身份');root.appendChild(identity);move(doc.querySelector('#mt-identity'),identity);
   const illumination=doc.querySelector('#mt-illumination'),pair=illumination&&illumination.querySelector('.mt-plots');if(pair)move(pair,illumination,illumination.firstChild);if(illumination&&root.firstChild!==illumination)move(illumination,root,root.firstChild);
   const cert=detail('完整浮点证书与数值验收');stage.appendChild(cert);move(doc.querySelector('#mt-certificates'),cert);
   const matrices=doc.querySelector('.mt-matrix-panel');if(matrices){const full=detail('当前模式的完整矩阵');root.appendChild(full);move(matrices,full);}
   let lastRole=null;showMultitarget=step=>{const role=step?.role||'read';if(role!==lastRole){root.classList.add(compact);expanded.open=false;lastRole=role;}};
  }else if(cf){
   const stage=doc.querySelector('#cf-detection'),svg=doc.querySelector('#cf-histogram'),figure=svg&&svg.closest('figure'),statistics=doc.querySelector('#cf-statistics'),warnings=doc.querySelector('#cf-warnings');
   if(!stage||!figure||!statistics||!warnings){restore();return;}
   const note=doc.createElement('p');note.className='cf-warning';root.insertBefore(note,root.firstChild);additions.push(note);
   move(stage,root,note.nextSibling);
   const main=doc.createElement('div');main.className='theory-guided-compact theory-guided-cf-counts';stage.insertBefore(main,stage.firstChild);additions.push(main);move(figure,main);move(statistics,main);
   style.textContent+='.theory-guided-cf-counts #cf-statistics tbody tr:not(:nth-child(5)):not(:nth-child(6)){display:none}';
   const full=detail('完整失败警示、用能对照与运行身份');root.appendChild(full);
   move(warnings,full);move(doc.querySelector('#cf-identity'),full);move(doc.querySelector('#cf-summary'),full);
   const counts=detail('完整门限、区间与配对计数');stage.appendChild(counts);
   counts.addEventListener('toggle',()=>{if(!active)return;if(counts.open)counts.appendChild(statistics);else main.appendChild(statistics);});
   function updateWarning(){const lines=Array.from(warnings.children).map(n=>n.textContent);const crossed=lines.filter(t=>t.includes('独立holdout矩估计越过约束，不能称总体可行')).length;const reversed=lines.some(t=>t.includes('代理SINR与AP检出率排序相反'));const other=lines.some(t=>!t.includes('独立holdout矩估计越过约束，不能称总体可行')&&!t.includes('代理SINR与AP检出率排序相反'));note.textContent=(crossed?'本次'+crossed+'个方案holdout越界，不能称总体可行。':'本次是否越界请核对完整警示；不保证总体可行。')+(reversed?'代理SINR与AP检出率排序相反，实际用能不同。':'不同方案须同时核对实际用能。')+(other?'另有失败或限制说明，请展开完整警示。':'');}
   updateWarning();const MO=doc.defaultView&&doc.defaultView.MutationObserver;if(MO){observer=new MO(updateWarning);observer.observe(warnings,{childList:true,subtree:true,characterData:true});}
   // Entire detection section keeps its native hidden gate; no graph shown for other stages.
  }else if(mpi){
   style.textContent='#mpi-main-plot{width:100%;height:auto;max-height:none}#mpi-main-plot > svg{width:100%;height:260px;max-height:260px}';
  }else if(nf){
   style.textContent=`.theory-guided-nfr-primary svg{width:100%;height:260px;max-height:260px}
.theory-guided-trust-compact > dl > :nth-child(n+5),.theory-guided-trust-compact > details{display:none}
[data-nfr-view="status"].theory-guided-trust-compact > dl{display:grid!important;grid-template-columns:8em minmax(0,1fr)!important;gap:2px 6px!important;margin:3px 0!important;font-size:12px!important;line-height:1.35!important}
[data-nfr-view="status"].theory-guided-trust-compact > dl > dt,[data-nfr-view="status"].theory-guided-trust-compact > dl > dd{margin:0!important;padding:0!important;border:0!important;overflow-wrap:anywhere}
[data-nfr-view="status"].theory-guided-trust-compact > p{margin:3px 0!important;padding:3px 6px!important;line-height:1.4!important;font-size:13px!important}
.theory-guided-nfr-primary [data-nfr-view="spectrum"]:not([hidden]){display:flex;flex-direction:column}
.theory-guided-nfr-primary [data-nfr-view="spectrum"] > svg{order:-1;margin:0!important}
.theory-guided-nfr-primary [data-nfr-view="spectrum"] > p,.theory-guided-nfr-primary [data-nfr-view="spectrum"] > ul{margin:4px 0!important;padding-top:3px!important;padding-bottom:3px!important;font-size:13px!important;line-height:1.4!important}`;
   const cards=Array.from(root.children).filter(n=>n.classList.contains('nfr-result-card'));
   const primary=doc.createElement('div');primary.className='theory-guided-nfr-primary';root.insertBefore(primary,root.firstChild);additions.push(primary);
   const full=detail('其他计算阶段与完整因果链');root.appendChild(full);
   for(const card of cards){move(card,full);const view=card.querySelector('.nfr-view');if(view&&card.firstChild!==view)move(view,card,card.firstChild);}
   const status=doc.querySelector('[data-nfr-view="status"]');
   if(status){const had=status.classList.contains('theory-guided-trust-compact');status.classList.add('theory-guided-trust-compact');const more=detail('完整身份与实际进度');status.parentNode.insertBefore(more,status.nextSibling);more.addEventListener('toggle',()=>{if(!active)return;status.classList[more.open?'remove':'add']('theory-guided-trust-compact');});extraRestore=()=>{if(!had)status.classList.remove('theory-guided-trust-compact');};}
   let lastNearfieldSelection=null;
   showNearfield=step=>{
    const selectors=[...(step?.viewSelectors||[]),...(step?.viewMetrics||[])];
    if(!selectors.length)selectors.push('[data-nfr-view="spectrum"]','[data-nfr-view="evaluation"]');
    const selected=[];
    for(const selector of selectors){const node=doc.querySelector(selector),card=node&&node.closest('.nfr-result-card');if(cards.includes(card)&&!selected.includes(card))selected.push(card);}
    const selection=selected.map(card=>cards.indexOf(card)).join(',');
    if(selection!==lastNearfieldSelection)full.open=false;
    lastNearfieldSelection=selection;
    // A requested source/status view outside this result group remains accessible in its own original group.
    for(const card of cards)if(!selected.includes(card))full.appendChild(card);
    for(const card of selected)primary.appendChild(card);
    const statusCard=status&&status.closest('.nfr-result-card');if(cards.includes(statusCard)&&!selected.includes(statusCard))root.insertBefore(statusCard,full);
   };
   showNearfield();
  }else if(waveform){
   const svg=doc.querySelector('#wfl-symbols'),figure=svg&&svg.closest('figure'),tbody=doc.querySelector('#wfl-metrics'),table=tbody&&tbody.closest('.wf-table-wrap');
   if(!figure||!table){restore();return;}
   const main=doc.createElement('div');main.className='theory-guided-compact theory-guided-ledger-compact';root.insertBefore(main,root.firstChild);additions.push(main);
   move(figure,main);move(table,main);
   const more=detail('完整约束检查、秩解释与账本');root.insertBefore(more,main.nextSibling);
   for(const selector of ['#wfl-budget','#wfl-rank','#wfl-certificate'])move(doc.querySelector(selector),more);
   for(const group of Array.from(root.children).filter(n=>n.classList.contains('wf-figures')))move(group,more);
   function classify(){for(const r of tbody.children){if(!rowClasses.has(r))rowClasses.set(r,r.classList.contains(cls));const label=r.firstElementChild&&r.firstElementChild.textContent.trim();if(label!=='总符号误差 E'&&label!=='协方差相对残差')r.classList.add(cls);}}
   classify();const MO=doc.defaultView&&doc.defaultView.MutationObserver;if(MO){observer=new MO(classify);observer.observe(tbody,{childList:true});}
   more.addEventListener('toggle',()=>{if(!active)return;if(more.open){more.appendChild(table);main.classList.remove('theory-guided-ledger-compact');}else{main.appendChild(table);main.classList.add('theory-guided-ledger-compact');}});
   // Other original plots stay under their original result gate; no native hidden changed.
  }else if(gt){
   const svg=doc.querySelector('#gt-main-plot'),figure=svg&&svg.closest('figure'),title=doc.querySelector('#gt-stage-title'),section=title&&title.parentNode;
   if(!figure||!section){restore();return;}
   const main=doc.createElement('div');main.className='theory-guided-compact theory-guided-gt';section.insertBefore(main,section.firstChild);additions.push(main);move(figure,main);move(doc.querySelector('#gt-summary'),main);
   const more=detail('完整阶段选择、输入显示与数值证书');section.appendChild(more);
   move(doc.querySelector('.gt-stages'),more);move(title,more);move(doc.querySelector('#gt-explanation'),more);
   const law=doc.querySelector('#gt-law');move(law&&law.closest('.gt-controls'),more);move(doc.querySelector('#gt-table'),more);
   const second=doc.querySelector('#gt-second-plot');move(second&&second.closest('figure'),more);
   // gt-draft/fresh/error and caveat are never moved or unhidden. Summary remains live, not parsed.
  }else if(crb){
   const info=doc.querySelector('#cm-information-chart'),figure=info&&info.closest('figure');
   if(!figure){restore();return;}
   const main=doc.createElement('div');main.className='theory-guided-compact';root.insertBefore(main,root.firstChild);additions.push(main);move(figure,main);
   // Native main bound card and all current/recovery/error gates remain original live nodes.
   const bound=doc.querySelector('#cm-root-crb');move(bound&&bound.closest('.cm-metric'),main);
   const more=detail('完整资源与迭代诊断');root.appendChild(more);
   move(doc.querySelector('#cm-progress'),more);
  }else{
   const pattern=doc.querySelector('#jbo-pattern'),figure=pattern&&pattern.closest('figure'),cards=root.querySelector('.jbo-results');
   if(!figure||!cards){restore();return;}
   const main=doc.createElement('div');main.className='theory-guided-compact';root.insertBefore(main,cards);additions.push(main);move(figure,main);
   // Keep all three original per-mode summaries/evidence visible, including failed gates.
   const more=detail('完整迭代轨迹与输入指纹');root.appendChild(more);
   move(doc.querySelector('#jbo-input-hash'),more);const trace=doc.querySelector('#jbo-trace');move(trace&&trace.closest('figure'),more);
  }
 }
 function show(step){guide();if(mt)showMultitarget(step);if(nf)showNearfield(step);if(joint&&step&&step.role==='bridge'){const trace=doc.querySelector('#jbo-trace');const d=trace&&trace.closest('details');if(d)d.open=true;}}
 return {show,restore,guide};
}
const api={install};global.TheoryGuidedViews=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
