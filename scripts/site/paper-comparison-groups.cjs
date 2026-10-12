'use strict';
// Build-time reading organization only. No optimizer, ranking, or source retrieval.
const {createLearningEntryResolver}=require('./learning-entry.cjs');
const {notebookHref}=require('./notebook-topics.cjs');
const idPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const escapeHtml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function jsonForHtml(value){
 const escapes={'<':'\\u003c','>':'\\u003e','&':'\\u0026','\u2028':'\\u2028','\u2029':'\\u2029'};
 return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,char=>escapes[char]);
}
function fail(label){throw new Error('Invalid paper comparison '+label);}
function text(value,label){if(typeof value!=='string'||!value.trim())fail(label);return value;}
function id(value,label){if(typeof value!=='string'||value.length>64||!idPattern.test(value)||value.match(idPattern)[0]!==value)fail(label+' ID');return value;}
function list(value,label,min=1){if(!Array.isArray(value)||value.length<min)fail(label);return value;}
function unique(items,label){if(new Set(items).size!==items.length)fail('duplicate '+label);}
function https(value,label){text(value,label);let u;try{u=new URL(value);}catch{fail(label+' URL');}if(u.protocol!=='https:'||u.username||u.password||u.hash||u.href!==value)fail(label+' URL');}
function buildComparisonGroups(registry,validationContext){
 const entries=createLearningEntryResolver(registry,validationContext),canonical=createLearningEntryResolver({units:[],cases:[]},validationContext);
 const cases=new Map(registry.cases.map(c=>[c.id,c])),units=new Map(registry.units.map(u=>[u.id,u]));
 const groups=registry.paperComparisonGroups===undefined?[]:list(registry.paperComparisonGroups,'groups',0);
 unique(groups.map(g=>id(g.id,'group')),'group');
 return groups.map(g=>{
  for(const key of ['title','intro','scopeNote'])text(g[key],key);
  list(g.members,'members',2);unique(g.members.map(m=>id(m.caseId,'case')),'member');
  const memberIds=new Set(g.members.map(m=>m.caseId));
  const members=g.members.map(m=>{
   const c=cases.get(m.caseId),u=c&&units.get(c.unit);if(!c||!u||!c.paperComparison)fail('member reference '+m.caseId);
   for(const key of ['label','branch','question','change','boundary','observation','constraints','methods'])text(m[key],key);
   list(m.flows,'flows');for(const flow of m.flows)for(const key of ['label','signal','array','objective'])text(flow[key],'flow '+key);
   const modelHref=canonical.unitEntry({href:m.modelHref});if(modelHref.split('#')[0]!==u.href.split('#')[0])fail('model page membership');
   const s=m.inspectedSource;if(!s||s.caseId!==m.caseId)fail('source membership');
   for(const key of ['edition','checkedOn','paperEvidence','resources'])text(s[key],'source '+key);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(s.checkedOn))fail('checked date');
   https(s.url,'inspected source');
   list(s.unknowns,'source unknowns').forEach(v=>text(v,'source unknown'));
   list(s.locators,'source locators');unique(s.locators.map(l=>id(l.id,'locator')),'locator');
   s.locators.forEach(l=>{text(l.label,'locator label');text(l.text,'locator text');});
   return {...m,sourceTitle:text(c.paperComparison.sourceTitle,'source title'),siteArtifact:text(c.paperComparison.siteArtifactType,'site artifact'),
    links:{model:modelHref,teaching:entries.caseEntry(c),experiment:canonical.unitEntry({href:u.href}),evidence:canonical.unitEntry({href:c.paper}),boundary:canonical.unitEntry({href:c.next}),notebook:notebookHref(u.id)}};
  });
  const memberMap=new Map(members.map(m=>[m.caseId,m]));
  const refs=(value,label)=>{list(value,label);value.forEach(ref=>{if(!memberIds.has(ref.caseId)||!memberMap.get(ref.caseId).inspectedSource.locators.some(l=>l.id===ref.locatorId))fail(label+' source reference');});};
  const caseRefs=(value,label)=>{list(value,label);unique(value,label);value.forEach(c=>{if(!memberIds.has(c))fail(label+' case reference');});};
  list(g.questions,'questions',2);unique(g.questions.map(q=>id(q.id,'question')),'question');
  for(const q of g.questions){for(const key of ['label','answer','limit'])text(q[key],'question '+key);list(q.readings,'readings');unique(q.readings.map(r=>r.caseId),'reading');if(q.readings.length!==members.length||q.readings.some(r=>!memberIds.has(r.caseId)))fail('question coverage');q.readings.forEach(r=>{text(r.text,'reading text');refs(r.refs,'reading');if(r.refs.some(ref=>ref.caseId!==r.caseId))fail('reading source membership');});}
  list(g.premises,'premises',2);unique(g.premises.map(p=>id(p.id,'premise')),'premise');
  for(const p of g.premises){for(const key of ['label','explanation','action'])text(p[key],'premise '+key);refs(p.refs,'premise');caseRefs(p.caseIds,'premise links');}
  list(g.checks,'checks');unique(g.checks.map(c=>id(c.id,'check')),'check');
  for(const c of g.checks){text(c.prompt,'check prompt');list(c.options,'check options',2);unique(c.options.map(o=>id(o.id,'option')),'option');for(const o of c.options){text(o.label,'option label');text(o.feedback,'option feedback');refs(o.refs,'option');caseRefs(o.caseIds,'option links');}}
  list(g.notes,'notes');unique(g.notes.map(n=>id(n.id,'note')),'note');for(const n of g.notes){text(n.title,'note title');text(n.text,'note text');refs(n.refs,'note');}
  list(g.nextQuestions,'next questions');unique(g.nextQuestions.map(n=>n.caseId),'next question');for(const n of g.nextQuestions){if(!memberIds.has(n.caseId))fail('next question reference');for(const key of ['question','fixed','change','evidence','status'])text(n[key],'next '+key);}
  return {...g,members};
 });
}
function renderComparisonGroups(registry,validationContext){
 const groups=buildComparisonGroups(registry,validationContext);if(!groups.length)return '';
 const esc=escapeHtml,link=(href,label)=>`<a href="${esc(href)}">${esc(label)}</a>`;
 function renderGroup(g){
  const base='comparison-'+g.id,members=new Map(g.members.map(m=>[m.caseId,m]));
  const sourceId=(caseId,locatorId)=>base+'-source-'+caseId+'-'+locatorId;
  const sourceRefs=refs=>`<p class="comparison-citations">原文定位：${refs.map(ref=>{const m=members.get(ref.caseId),l=m.inspectedSource.locators.find(l=>l.id===ref.locatorId);return link('#'+sourceId(ref.caseId,ref.locatorId),m.label+' · '+l.label);}).join('；')}</p>`;
  const lessonRefs=ids=>`<p class="comparison-links">核对本站模型：${ids.map(id=>{const m=members.get(id);return link(m.links.model,m.label);}).join(' · ')}</p>`;
  const controls=(kind,items,legend)=>`<fieldset data-comparison-controls hidden><legend>${esc(legend)}</legend><div class="comparison-options">${items.map((x,i)=>`<label for="${base}-${kind}-${x.id}"><input type="radio" id="${base}-${kind}-${x.id}" name="${base}-${kind}" value="${x.id}" data-comparison-choice="${kind}"${i===0?' checked':''}>${esc(x.label)}</label>`).join('')}</div></fieldset>`;
  const config={id:g.id,questions:g.questions.map(q=>q.id),premises:g.premises.map(p=>p.id),checks:g.checks.map(c=>({id:c.id,options:c.options.map(o=>o.id)}))};
  return `<article class="comparison-group" id="${base}" data-comparison-group aria-labelledby="${base}-title">
<h3 id="${base}-title">${esc(g.title)}</h3><p>${esc(g.intro)}</p><p class="comparison-scope">${esc(g.scopeNote)}</p>
<p class="small">下方信号路线是独立绘制的概念示意：按“信号由谁发 → 哪些阵元可用 → 优化什么”阅读；箭头只是阅读顺序，不是接收处理链或性能图，也不表示时间上的优胜顺序。</p>
<div class="comparison-cards">${g.members.map(m=>`<section class="comparison-card" aria-labelledby="${base}-${m.caseId}-title"><p class="eyebrow">${esc(m.label)}</p><h4 id="${base}-${m.caseId}-title">${esc(m.branch)}</h4><p><strong>问题：</strong>${esc(m.question)}</p><p><strong>改动：</strong>${esc(m.change)}</p><div class="comparison-flows">${m.flows.map(f=>`<div class="comparison-flow"><strong>${esc(f.label)}</strong><ol aria-label="${esc(f.label)}信号路线"><li><span>信号</span>${esc(f.signal)}</li><li><span>阵元</span>${esc(f.array)}</li><li><span>目标</span>${esc(f.objective)}</li></ol></div>`).join('')}</div><p class="comparison-boundary"><strong>不能推出：</strong>${esc(m.boundary)}</p>
<details><summary>查看证据与本站范围</summary><p>${esc(m.sourceTitle)}</p><p><strong>本组检查的版本：</strong>${link(m.inspectedSource.url,m.inspectedSource.edition)}；核对日期 ${esc(m.inspectedSource.checkedOn)}</p><p><strong>观测与未知量：</strong>${esc(m.observation)}</p><p><strong>约束：</strong>${esc(m.constraints)}</p><p><strong>方法：</strong>${esc(m.methods)}</p><p><strong>论文证据：</strong>${esc(m.inspectedSource.paperEvidence)}</p><p><strong>本站证据：</strong>${esc(m.siteArtifact)}</p><ul class="comparison-source-list">${m.inspectedSource.locators.map(l=>`<li id="${sourceId(m.caseId,l.id)}">${link(m.inspectedSource.url,l.label)}：${esc(l.text)}</li>`).join('')}</ul><p><strong>原文资源：</strong>${esc(m.inspectedSource.resources)}</p><p><strong>未知与遗漏：</strong></p><ul>${m.inspectedSource.unknowns.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><nav class="comparison-links" aria-label="${esc(m.label)}学习入口">${link(m.links.teaching,'先理解机制')} · ${link(m.links.experiment,'进入已有实验')} · ${link(m.links.evidence,'本站逐项对照')} · ${link(m.links.boundary,'核对本站边界')}</nav></details></section>`).join('')}</div>
<section class="comparison-lenses" aria-labelledby="${base}-questions-title"><h4 id="${base}-questions-title">按一个问题对读</h4>${controls('question',g.questions,'这次先想弄清什么？')}<p class="comparison-status" data-comparison-status="question" role="status" aria-live="polite"></p>${g.questions.map((q,i)=>`<details data-comparison-panel="question" data-comparison-value="${q.id}"${i===0?' open':''}><summary>${esc(q.label)}</summary><ul>${q.readings.map(r=>`<li><strong>${esc(members.get(r.caseId).label)}：</strong>${esc(r.text)}${sourceRefs(r.refs)}</li>`).join('')}</ul><p><strong>这一步可以回答：</strong>${esc(q.answer)}</p><p><strong>还不能推出：</strong>${esc(q.limit)}</p></details>`).join('')}</section>
<details id="${base}-resources"><summary>如果我想比较数值，还缺哪些条件？</summary><p>选择只是拟采用的比较前提，不会改写原文条件或核验资源已经一致。平均功率也不是有限样本块能量。</p>${controls('premise',g.premises,'尝试一条比较前提')}<p class="comparison-status" data-comparison-status="premise" role="status" aria-live="polite"></p>${g.premises.map(p=>`<details data-comparison-panel="premise" data-comparison-value="${p.id}"><summary>${esc(p.label)}</summary><p>${esc(p.explanation)}</p><p><strong>下一步：</strong>${esc(p.action)}</p>${sourceRefs(p.refs)}${lessonRefs(p.caseIds)}</details>`).join('')}<p>完整账本还需：收发阵列与导向归一化、信道与用户数、实际迹和逐天线功率、快拍与样本协方差、收发噪声、目标强度与角度先验、带宽/接收机、目标函数与权重、求解和恢复容差、随机种子、可行率、未检出率，以及统计分母是否只含成功样本。未指定和未核对项必须留在计划中。</p></details>
${g.notes.map(n=>`<details id="${base}-note-${n.id}"><summary>${esc(n.title)}</summary><p>${esc(n.text)}</p>${sourceRefs(n.refs)}</details>`).join('')}
<details id="${base}-checks"><summary>试作一个判断，再看具体理由</summary><p>这是有来源的阅读反馈，不计分，也不认证比较已完成。</p>${g.checks.map(c=>`<section data-comparison-check="${c.id}" aria-labelledby="${base}-check-${c.id}-title"><h4 id="${base}-check-${c.id}-title">${esc(c.prompt)}</h4><fieldset data-comparison-controls hidden><legend>你的判断</legend><div class="comparison-options">${c.options.map(o=>`<label for="${base}-check-${c.id}-${o.id}"><input type="radio" id="${base}-check-${c.id}-${o.id}" name="${base}-check-${c.id}" value="${o.id}" data-comparison-answer>${esc(o.label)}</label>`).join('')}</div><button type="button" data-comparison-explain>看解释</button></fieldset><p class="comparison-status" data-comparison-check-status role="status" aria-live="polite"></p><div data-comparison-feedback hidden></div><details data-comparison-reference><summary>查看全部参考解释（无需 JavaScript）</summary>${c.options.map(o=>`<section data-comparison-explanation="${o.id}"><h5>${esc(o.label)}</h5><p>${esc(o.feedback)}</p>${sourceRefs(o.refs)}${lessonRefs(o.caseIds)}</section>`).join('')}</details></section>`).join('')}</details>
<details id="${base}-next"><summary>把边界变成一个最小下一问</summary><p>以下是待执行计划。进入对应主题笔记后，十栏仍由你填写：第1栏记录所读版本，第5栏记录固定资源和唯一改动，第7/8栏分开拟用指标与已经得到的证据。</p>${g.nextQuestions.map(n=>{const m=members.get(n.caseId);return `<section><h4>${esc(m.label)}：${esc(n.question)}</h4><p><strong>固定：</strong>${esc(n.fixed)}</p><p><strong>唯一改动：</strong>${esc(n.change)}</p><p><strong>证据：</strong>${esc(n.evidence)}</p><p><strong>状态：</strong>${esc(n.status)}</p><p>${link(m.links.experiment,'回到已有实验')} · ${link(m.links.notebook,'打开此主题的空白研究笔记')}</p></section>`;}).join('')}</details>
<button type="button" data-comparison-reset data-comparison-controls hidden>重置本组选择</button><p class="comparison-status" data-comparison-reset-status role="status" aria-live="polite"></p><script type="application/json" data-comparison-config>${jsonForHtml(config)}</script></article>`;
 }
 return `<section class="site-section paper-comparisons" id="paper-comparisons" aria-labelledby="paper-comparisons-title"><h2 id="paper-comparisons-title">同方向论文对读</h2><p>先问“问题和条件改变了什么”，再看证据支持到哪里。本组只组织已接入案例，不增加模型，也不代表整个研究方向已经完成。</p>${groups.map(renderGroup).join('\n')}</section>`;
}
module.exports={buildComparisonGroups,renderComparisonGroups,escapeHtml,jsonForHtml};
