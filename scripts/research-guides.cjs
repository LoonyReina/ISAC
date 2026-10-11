'use strict';
// Reading resources are independent of teaching cases, experiment units and
// influence snapshots. Only registered, existing lessons may be linked.
const {createLearningEntryResolver}=require('./learning-entry.cjs');
const {notebookHref}=require('./notebook-topics.cjs');
const escapeHtml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const text=value=>typeof value==='string'&&value.trim().length>0;
const id=value=>typeof value==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)&&value.length<=64&&!/\s/.test(value);
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
  return {...card,direction:directions.get(card.directionId),notebook};
 });
}
const link=(href,label,attrs='')=>`<a href="${escapeHtml(href)}"${attrs}>${escapeHtml(label)}</a>`;
const groupId=id=>'research-guides-'+id;
function renderGuideDirectionLink(cards,directionId){
 const count=cards.filter(c=>c.directionId===directionId).length;
 return count?`<p class="small">阅读拓展：${link('#'+groupId(directionId),count+' 篇问题式原文导读')}（阅读资源，不增加实验覆盖）</p>`:'';
}
function renderResearchGuides(cards){
 if(!cards.length)return '';
 const directions=[...new Map(cards.map(c=>[c.directionId,c.direction])).values()];
 const card=c=>`<article class="research-guide-card" id="guide-${escapeHtml(c.id)}" data-research-guide data-guide-direction="${escapeHtml(c.directionId)}" data-guide-search="${escapeHtml([c.title,c.question,c.mechanism,c.innovation,c.evidence.summary,...c.limits,c.nextQuestion,c.source.title].join(' '))}" aria-labelledby="guide-${escapeHtml(c.id)}-title">
<p class="eyebrow">原文导读 · ${escapeHtml(c.evidence.kind)}</p><h4 id="guide-${escapeHtml(c.id)}-title">${escapeHtml(c.title)}</h4>
<p class="guide-question"><strong>先问：</strong>${escapeHtml(c.question)}</p><p><strong>直觉机制：</strong>${escapeHtml(c.mechanism)}</p>
<details class="guide-depth"><summary>继续读：创新 → 证据 → 边界 → 下一问</summary><div>
<dl><dt>作者推进了哪一步？</dt><dd>${escapeHtml(c.innovation)}</dd><dt>证据支持到哪里？</dt><dd>${escapeHtml(c.evidence.summary)}</dd><dt>哪些条件不能略去？</dt><dd><ul>${c.limits.map(t=>`<li>${escapeHtml(t)}</li>`).join('')}</ul></dd><dt>带着什么问题继续？</dt><dd>${escapeHtml(c.nextQuestion)}</dd></dl>
${c.readingSteps?`<ol class="guide-reading-steps">${c.readingSteps.map(s=>`<li><strong>${escapeHtml(s.label)}</strong> · ${escapeHtml(s.locator)}<br>${escapeHtml(s.purpose)}</li>`).join('')}</ol>`:''}
<p class="guide-connection"><strong>需要时回看已有机制：</strong>${c.prerequisites.map(p=>link(p.href,p.label)).join(' · ')}</p>
${c.notebook?`<p>${link(notebookHref(c.notebook.id),'记录已有机制：'+c.notebook.title)}<br><span class="small">打开的是已有机制的空白实验本，不是这篇论文的复现模板；请自己记录原文条件与差异。</span></p>`:''}
</div></details>
<details class="guide-source"><summary>固定原文与核对位置</summary><div><p>${link(c.source.url,c.source.title)}<br>${escapeHtml(c.source.authors)}</p><p><strong>本次阅读版本：</strong>${escapeHtml(c.source.edition)}</p><p><strong>原文位置：</strong>${escapeHtml(c.source.locator)}</p>${c.source.publicationUrl?`<p>${link(c.source.publicationUrl,'后续发表记录')}${c.source.publicationTitle?'<br>'+escapeHtml(c.source.publicationTitle):''}<br>导读的公式与图号仍按上面的固定预印本；未将正式发表版本视为已逐式核对。</p>`:''}</div></details>
</article>`;
 return `<section class="site-section research-guides" id="research-guides" aria-labelledby="research-guides-title" data-research-guides>
<h2 id="research-guides-title">${cards.length} 篇问题式导读：从一个疑问读进原文</h2><p>先看问题和机制，再展开创新、证据与限制。这些是新增阅读资源；已有实验和教学案例的数量不变，导读不表示整篇论文已复现。</p>
<form class="guide-controls" data-guide-controls role="search" hidden><div><label for="guide-direction">按研究方向</label><select id="guide-direction" data-guide-direction-select><option value="">全部方向</option>${directions.map(d=>`<option value="${escapeHtml(d.id)}">${escapeHtml(d.title.split('：')[0])}</option>`).join('')}</select></div><div><label for="guide-question">找一个问题或机制</label><input id="guide-question" data-guide-query type="search" placeholder="例如：下一帧、双阵列、OTFS"></div><button type="reset">清除筛选</button><p data-guide-count role="status" aria-live="polite"></p></form>
<p data-guide-empty hidden>没有匹配的导读。换个问题关键词，或清除筛选查看全部原文。</p>
${directions.map(d=>`<section class="guide-direction-group" id="${groupId(d.id)}" data-guide-group="${escapeHtml(d.id)}" aria-labelledby="${groupId(d.id)}-title"><h3 id="${groupId(d.id)}-title">${escapeHtml(d.title.split('：')[0])} · ${cards.filter(c=>c.directionId===d.id).length} 篇导读</h3><p class="small">${link('#direction-'+d.id,'回到该方向的六层学习路线')}</p><div class="research-guide-grid">${cards.filter(c=>c.directionId===d.id).map(card).join('')}</div></section>`).join('')}
</section>`;
}
module.exports={buildResearchGuides,renderResearchGuides,renderGuideDirectionLink,escapeHtml};
