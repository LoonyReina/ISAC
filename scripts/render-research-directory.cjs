'use strict';
// Bibliographic evidence lives in one data file. Teaching cases remain registry-owned.
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const link=(href,label)=>`<a href="${esc(href)}">${esc(label)}</a>`;
function renderResearchDirectory(data, registry, exists){
 function caseRoute(card){
  const c=registry.cases.find(c=>c.id===card.caseId);
  const unit=c&&registry.units.find(u=>u.id===c.unit);
  const file=unit?.href?.split('#')[0];
  if(c&&unit&&file&&registry.pages.some(p=>p.path===file)&&exists(file))return `<p class="paper-status">${link(unit.href,'进入教学案例 →')}<span>独立机制模型，非完整论文复现</span></p>`;
  return `<p class="paper-status">${card.caseId?'教学案例准备中':'深度交互尚未实现'}<span>可先阅读已核实的原文</span></p>`;
 }
 function card(c){
  const m=c.metrics,oa=m.openAlex,ss=m.semanticScholar,year=m.completedYear;
  const oaText=oa.comparable?`${oa.count} 次`: `${oa.count} 次（DOI 拆分记录，不可比）`;
  return `<article class="influence-card" id="paper-${esc(c.id)}" aria-labelledby="paper-${esc(c.id)}-title">
<p class="eyebrow">${esc(c.publicationLabel)}</p><h4 id="paper-${esc(c.id)}-title">${esc(c.heading)}</h4><p class="paper-short-title">${esc(c.shortTitle)}</p><p>${esc(c.mechanism)}</p>
<p class="paper-source-links">${c.links.map(l=>link(l.url,l.label)).join(' · ')}</p>${caseRoute(c)}
<details class="paper-evidence"><summary>核对论文身份、引用与证据边界<span class="paper-sr-only">：${esc(c.shortTitle)}</span></summary><div>
<dl><dt>完整题名与作者</dt><dd lang="en">${esc(c.title)}</dd><dd>${esc(c.authors)}</dd><dt>发表时间</dt><dd>${esc(c.publicationLabel)}</dd>
<dt>引用快照 · ${esc(m.snapshotDate)}</dt><dd>OpenAlex：${link(oa.source,oaText)}${oa.alternateRecord?`；${link(oa.alternateRecord.url,`题名匹配的仓储记录 ${oa.alternateRecord.count} 次`)}`:''}<br>Semantic Scholar：${link(ss.source,`${ss.count} 次`)} · ${link(ss.recordUrl,'论文记录')}<br>两套服务独立显示，不相加。</dd>
<dt>${esc(year.year)} 年施引文献</dt><dd>${year.comparable?`${link(oa.source,String(year.count)+' 篇（OpenAlex）')}。`:'记录拆分，未给出可比计数。'}${esc(year.definition)}</dd>
${oa.warning?`<dt>记录拆分警告</dt><dd>${esc(oa.warning)}</dd>`:''}
<dt>来源与访问时间</dt><dd>论文身份：${link(c.identitySource,'原文 / 作者机构来源')}；DOI：${link(c.doi,'出版标识')}<br>OpenAlex 查询：${esc(oa.retrievedAt)}<br>OpenAlex 记录更新：${esc(oa.recordUpdatedAt)}<br>Semantic Scholar 查询：${esc(ss.retrievedAt)}</dd>
<dt>学术认可与研究资源</dt><dd><ul>${c.endorsements.map(e=>`<li>${esc(e.kind)}：${link(e.url,e.text)}</li>`).join('')}</ul></dd>
<dt>证据边界</dt><dd>${esc(c.evidenceBoundary)}</dd><dt>社交讨论量</dt><dd>${esc(c.socialDiscussion.text)}</dd><dt>接下来怎样读</dt><dd>${esc(c.readingPlan)}</dd></dl>
</div></details></article>`;
 }
 return `<section class="site-section influence-directory" id="influential-papers" aria-labelledby="influential-papers-title"><h2 id="influential-papers-title">${data.cards.length} 篇研究论文：先选机制，再核对影响证据</h2><p>${esc(data.subtitle)}</p><p>${esc(data.selectionSummary)}</p>
<p class="small">身份、两套引用服务与学会 / 官方来源的交叉核验日期：<time datetime="${esc(data.verifiedOn)}">${esc(data.verifiedOn)}</time>。引用是带日期的快照，非实时排行榜；下面的原文入口不代表本站已实现交互。</p>
<details class="paper-method"><summary>这份目录怎样选择，哪些结论不能推出？</summary><ul>${data.methodNotes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></details>
<nav class="study-links" aria-label="研究论文按机制分组">${data.groups.map(g=>link('#papers-'+g.id,g.title)).join('')}</nav>
${data.groups.map(g=>`<section class="paper-group" id="papers-${esc(g.id)}" aria-labelledby="papers-${esc(g.id)}-title"><h3 id="papers-${esc(g.id)}-title">${esc(g.title)}</h3><p>${esc(g.description)}</p><div class="influence-grid">${data.cards.filter(c=>c.groupId===g.id).map(card).join('')}</div></section>`).join('')}</section>`;
}
module.exports={renderResearchDirectory};
