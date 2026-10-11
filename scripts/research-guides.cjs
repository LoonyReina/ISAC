'use strict';
// Reading resources are independent of teaching cases, experiment units and
// influence snapshots. Only registered, existing lessons may be linked.
const {createLearningEntryResolver}=require('./learning-entry.cjs');
const {notebookHref}=require('./notebook-topics.cjs');
const escapeHtml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const text=value=>typeof value==='string'&&value.trim().length>0;
const id=value=>typeof value==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)&&value.length<=64&&!/\s/.test(value);
const traceStageIds=['observation','known-unknown','design','evidence'];
const traceStatuses=Object.freeze({observed:'观测',known:'已知',unknown:'仍未知',design:'可设计',supported:'支持','not-established':'未证明'});
function validateVisualTrace(trace,card,local){
 const object=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>keys.includes(k));
 const prose=value=>text(value)&&value.length<=2000;
 if(!object(trace,['kind','title','steps','checkpoint'])||trace.kind!=='qualitative-reading-trace'||!prose(trace.title)||!Array.isArray(trace.steps)||trace.steps.length!==4)throw new Error('Invalid visual trace');
 for(const [index,step]of trace.steps.entries()){
  if(!object(step,['id','heading','blocks','explanation','sourceLocator','lessonHref'])||step.id!==traceStageIds[index]||!['heading','explanation','sourceLocator'].every(k=>prose(step[k]))||!Array.isArray(step.blocks)||step.blocks.length<1||step.blocks.length>2)throw new Error('Invalid visual trace stage');
  for(const block of step.blocks)if(!object(block,['label','status','text'])||!prose(block.label)||!prose(block.text)||typeof block.status!=='string'||!Object.hasOwn(traceStatuses,block.status))throw new Error('Invalid visual trace information block');
  const statuses=step.blocks.map(b=>b.status);
  if(index===0&&!statuses.includes('observed')||index===1&&(!statuses.includes('known')||!statuses.includes('unknown'))||index===2&&!statuses.every(s=>s==='design')||index===3&&(!statuses.includes('supported')||!statuses.includes('not-established')))throw new Error('Invalid visual trace stage status or evidence boundary');
  if(step.lessonHref!==undefined){
   if(!card.prerequisites.some(p=>p.href===step.lessonHref))throw new Error('Invalid visual trace prerequisite reference');
   local.unitEntry({href:step.lessonHref});
  }
 }
 if(!object(trace.checkpoint,['prompt','answer','sourceLocator'])||!['prompt','answer','sourceLocator'].every(k=>prose(trace.checkpoint[k])))throw new Error('Invalid visual trace checkpoint');
}
function buildResearchGuides(data,registry){
 if(!data||data.schemaVersion!==1||!Array.isArray(data.cards))throw new Error('Invalid research guide data');
 const seen=new Set(),directions=new Map(registry.directions.map(d=>[d.id,d]));
 const local=createLearningEntryResolver({units:[],cases:[]});
 return data.cards.map(card=>{
  if(!id(card.id)||seen.has(card.id)||!directions.has(card.directionId))throw new Error('Invalid research guide identity');
  seen.add(card.id);
  for(const field of ['title','question','mechanism','innovation','nextQuestion'])if(!text(card[field]))throw new Error('Missing research guide '+field);
  if(!card.evidence||!text(card.evidence.kind)||!text(card.evidence.summary))throw new Error('Missing research guide evidence');
  if(!Array.isArray(card.limits)||!card.limits.length||!card.limits.every(text))throw new Error('Missing research guide limits');
  const source=card.source;
  if(!source||!['title','authors','edition','url','locator'].every(k=>text(source[k])))throw new Error('Missing research guide source');
  let url;try{url=new URL(source.url);}catch{throw new Error('Invalid research guide source URL');}
  if(url.protocol!=='https:'||url.username||url.password||url.hash||/\s/.test(source.url)||url.href!==source.url)throw new Error('Invalid research guide source URL');
  if(source.publicationUrl!==undefined){
   let publication;try{publication=new URL(source.publicationUrl);}catch{throw new Error('Invalid research guide publication URL');}
   if(publication.protocol!=='https:'||publication.username||publication.password||publication.hash||/\s/.test(source.publicationUrl)||publication.href!==source.publicationUrl)throw new Error('Invalid research guide publication URL');
   if(source.publicationTitle!==undefined&&!text(source.publicationTitle))throw new Error('Invalid research guide publication title');
  }
  if(!Array.isArray(card.prerequisites)||!card.prerequisites.length)throw new Error('Missing research guide prerequisites');
  for(const pre of card.prerequisites){if(!text(pre.label))throw new Error('Missing research guide prerequisite label');local.unitEntry({href:pre.href});}
  if(card.readingSteps!==undefined&&(!Array.isArray(card.readingSteps)||!card.readingSteps.length||!card.readingSteps.every(s=>['label','locator','purpose'].every(k=>text(s[k])))))throw new Error('Invalid research guide reading steps');
  const notebook=card.notebookTopicId&&registry.units.find(u=>u.id===card.notebookTopicId);
  if(card.notebookTopicId!==undefined&&!notebook)throw new Error('Invalid research guide notebook topic');
  if(card.visualTrace!==undefined)validateVisualTrace(card.visualTrace,card,local);
  return {...card,direction:directions.get(card.directionId),notebook};
 });
}
const link=(href,label,attrs='')=>`<a href="${escapeHtml(href)}"${attrs}>${escapeHtml(label)}</a>`;
const groupId=id=>'research-guides-'+id;
function traceSearchText(trace){
 if(!trace)return '';
 return [trace.title,...trace.steps.flatMap(s=>[s.heading,...s.blocks.flatMap(b=>[b.label,traceStatuses[b.status],b.text]),s.explanation,s.sourceLocator]),trace.checkpoint.prompt,trace.checkpoint.answer,trace.checkpoint.sourceLocator].join(' ');
}
function renderVisualTrace(card){
 const trace=card.visualTrace;if(!trace)return '';
 const source=locator=>`<p class="trace-source">${link(card.source.url,'核对原文：'+locator)}</p>`;
 const explanation=step=>`<p>${escapeHtml(step.explanation)}</p>${source(step.sourceLocator)}${step.lessonHref?`<p class="trace-lesson">${link(step.lessonHref,'需要时回看：'+card.prerequisites.find(p=>p.href===step.lessonHref).label)}</p>`:''}`;
 const blocks=step=>`<div class="trace-blocks">${step.blocks.map(b=>`<div class="trace-block trace-status-${b.status}"><p class="trace-state">${traceStatuses[b.status]}</p><p class="trace-block-label">${escapeHtml(b.label)}</p><p>${escapeHtml(b.text)}</p></div>`).join('')}</div>`;
 const checkpoint=(step,interactive)=>{
  const evidence=blocks(step)+explanation(step)+`<p class="trace-checkpoint-answer"><strong>对刚才判断的解释：</strong>${escapeHtml(trace.checkpoint.answer)}</p>`+source(trace.checkpoint.sourceLocator);
  return `<div class="trace-checkpoint"><p><strong>先判断：</strong>${escapeHtml(trace.checkpoint.prompt)}</p>${interactive?'<details class="trace-answer"><summary>展开证据与解释</summary><div>'+evidence+'</div></details>':'<div class="trace-answer-print">'+evidence+'</div>'}</div>`;
 };
 const stage=(step,i,interactive)=>`<li class="trace-step"><h6><span class="trace-step-number">${i+1}</span> ${escapeHtml(step.heading)}</h6>${i===3?checkpoint(step,interactive):blocks(step)+(interactive?'<details class="trace-explanation"><summary>为什么这样读？查看原文定位</summary><div>'+explanation(step)+'</div></details>':'<div class="trace-explanation-print">'+explanation(step)+'</div>')+'<p class="trace-connector" aria-hidden="true">↓ 继续核对</p>'}</li>`;
 // The print transcript uses the exact same data/rendering path and no details,
 // so a closed native disclosure cannot hide evidence in older print engines.
 const content=interactive=>`<div class="trace-body"><h5>${escapeHtml(trace.title)}</h5><figure class="trace-figure"><figcaption>原文关系示意；箭头表示阅读顺序，框的大小不表示数值。本图没有运行算法，也不是论文仿真曲线。</figcaption><ol class="trace-steps" role="list">${trace.steps.map((step,i)=>stage(step,i,interactive)).join('')}</ol></figure><p class="trace-next"><strong>带着下一问离开：</strong>${escapeHtml(card.nextQuestion)}</p><p class="trace-edition"><strong>本次阅读版本：</strong>${escapeHtml(card.source.edition)}</p><p>${link('#direction-'+card.directionId,'回到本方向的六层路线')} · ${link(card.source.url,'打开本次阅读的固定原文')}</p></div>`;
 return `<details class="guide-visual-trace" data-visual-trace><summary>用一张图拆解这篇论文</summary>${content(true)}</details><div class="guide-trace-print"><p><strong>用一张图拆解这篇论文 · 打印展开版</strong></p>${content(false)}</div>\n`;
}
function renderGuideDirectionLink(cards,directionId){
 const count=cards.filter(c=>c.directionId===directionId).length;
 return count?`<p class="small">阅读拓展：${link('#'+groupId(directionId),count+' 篇问题式原文导读')}（阅读资源，不增加实验覆盖）</p>`:'';
}
function renderResearchGuides(cards){
 if(!cards.length)return '';
 const directions=[...new Map(cards.map(c=>[c.directionId,c.direction])).values()];
 const card=c=>`<article class="research-guide-card" id="guide-${escapeHtml(c.id)}" data-research-guide data-guide-direction="${escapeHtml(c.directionId)}" data-guide-search="${escapeHtml([c.title,c.question,c.mechanism,c.innovation,c.evidence.summary,...c.limits,c.nextQuestion,c.source.title].join(' ')+(c.visualTrace?' '+traceSearchText(c.visualTrace):''))}" aria-labelledby="guide-${escapeHtml(c.id)}-title"${c.visualTrace?' data-visual-trace-card':''}>
<p class="eyebrow">原文导读 · ${escapeHtml(c.evidence.kind)}</p><h4 id="guide-${escapeHtml(c.id)}-title">${escapeHtml(c.title)}</h4>
<p class="guide-question"><strong>先问：</strong>${escapeHtml(c.question)}</p><p><strong>直觉机制：</strong>${escapeHtml(c.mechanism)}</p>
${renderVisualTrace(c)}<details class="guide-depth"><summary>继续读：创新 → 证据 → 边界 → 下一问</summary><div>
<dl><dt>作者推进了哪一步？</dt><dd>${escapeHtml(c.innovation)}</dd><dt>证据支持到哪里？</dt><dd>${escapeHtml(c.evidence.summary)}</dd><dt>哪些条件不能略去？</dt><dd><ul>${c.limits.map(t=>`<li>${escapeHtml(t)}</li>`).join('')}</ul></dd><dt>带着什么问题继续？</dt><dd>${escapeHtml(c.nextQuestion)}</dd></dl>
${c.readingSteps?`<ol class="guide-reading-steps">${c.readingSteps.map(s=>`<li><strong>${escapeHtml(s.label)}</strong> · ${escapeHtml(s.locator)}<br>${escapeHtml(s.purpose)}</li>`).join('')}</ol>`:''}
<p class="guide-connection"><strong>需要时回看已有机制：</strong>${c.prerequisites.map(p=>link(p.href,p.label)).join(' · ')}</p>
${c.notebook?`<p>${link(notebookHref(c.notebook.id),'记录已有机制：'+c.notebook.title)}<br><span class="small">打开的是已有机制的空白实验本，不是这篇论文的复现模板；请自己记录原文条件与差异。</span></p>`:''}
</div></details>
<details class="guide-source"><summary>固定原文与核对位置</summary><div><p>${link(c.source.url,c.source.title)}<br>${escapeHtml(c.source.authors)}</p><p><strong>本次阅读版本：</strong>${escapeHtml(c.source.edition)}</p><p><strong>原文位置：</strong>${escapeHtml(c.source.locator)}</p>${c.source.publicationUrl?`<p>${link(c.source.publicationUrl,'正式发表记录')}${c.source.publicationTitle?'<br>'+escapeHtml(c.source.publicationTitle):''}<br>导读的公式与图号按上面明确标注的本次阅读版本；不同版本不混用编号。</p>`:''}</div></details>
</article>`;
 return `<section class="site-section research-guides" id="research-guides" aria-labelledby="research-guides-title" data-research-guides>
<h2 id="research-guides-title">${cards.length} 篇问题式导读：从一个疑问读进原文</h2><p>先看问题和机制，再展开创新、证据与限制。这些是新增阅读资源；已有实验和教学案例的数量不变，导读不表示整篇论文已复现。</p>
<form class="guide-controls" data-guide-controls role="search" hidden><div><label for="guide-direction">按研究方向</label><select id="guide-direction" data-guide-direction-select><option value="">全部方向</option>${directions.map(d=>`<option value="${escapeHtml(d.id)}">${escapeHtml(d.title.split('：')[0])}</option>`).join('')}</select></div><div><label for="guide-question">找一个问题或机制</label><input id="guide-question" data-guide-query type="search" placeholder="例如：下一帧、双阵列、OTFS"></div><button type="reset">清除筛选</button><p data-guide-count role="status" aria-live="polite"></p></form>
<p data-guide-empty hidden>没有匹配的导读。换个问题关键词，或清除筛选查看全部原文。</p>
${directions.map(d=>`<section class="guide-direction-group" id="${groupId(d.id)}" data-guide-group="${escapeHtml(d.id)}" aria-labelledby="${groupId(d.id)}-title"><h3 id="${groupId(d.id)}-title">${escapeHtml(d.title.split('：')[0])} · ${cards.filter(c=>c.directionId===d.id).length} 篇导读</h3><p class="small">${link('#direction-'+d.id,'回到该方向的六层学习路线')}</p><div class="research-guide-grid">${cards.filter(c=>c.directionId===d.id).map(card).join('')}</div></section>`).join('')}
</section>`;
}
module.exports={buildResearchGuides,renderResearchGuides,renderGuideDirectionLink,escapeHtml,traceSearchText,renderVisualTrace};
