'use strict';
// Derived navigation only. Scientific identity/content stays in existing data files.
const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const identity = url => { const a=String(url||'').match(/arxiv\.org\/(?:html|pdf|abs)\/(\d+\.\d+)/); return a ? `arxiv:${a[1]}` : String(url||'').replace(/\/$/,'').toLowerCase(); };
function buildResearchTree(registry, guides, directory, backlog) {
  if(!backlog?.papers) throw Error('Canonical PAPER-EXECUTION-BACKLOG.json is required');
  const dirs=registry.directions.map(d=>({id:d.id,title:d.title,question:d.question}));
  const papers=backlog.papers.map(record=>{
    const ref=record.canonicalReferences;
    const gs=guides.cards.filter(g=>ref.guideIds.includes(g.id));
    const cs=registry.cases.filter(c=>ref.caseIds.includes(c.id));
    const ds=directory.cards.filter(c=>ref.catalogIds.includes(c.id));
    const directionIds=new Set(gs.map(g=>g.directionId));
    cs.forEach(c=>{registry.directions.filter(d=>(d.primaryCaseIds||[]).includes(c.id)).forEach(d=>directionIds.add(d.id));const u=registry.units.find(u=>u.id===c.unit);if(u?.primaryDirectionId)directionIds.add(u.primaryDirectionId);});
    if(!directionIds.size)ds.forEach(d=>directionIds.add(d.groupId==='joint-design'?'spatial':d.groupId==='data-learning'?'learning':'networks'));
    if(!directionIds.size)throw Error(`Unclassified paper ${record.id}`);
    const adapted=/^live adapted /.test(record.implementation.classification);
    const bounded=['partial-core','validated'].includes(record.stages.liveExecution)&&!adapted;
    const impl=record.implementation, liveHref=impl.details?.receiverLesson||impl.details?.lesson||impl.details?.directRecovery?.lesson||impl.live?.href||(typeof impl.live==='string' ? impl.live.match(/^([a-z0-9-]+\.html#[a-zA-Z0-9-]+)/)?.[1] : null);
    const tutorials=[];const add=t=>{if(!tutorials.some(x=>x.href===t.href))tutorials.push(t);};
    const algorithmHref=record.id==='crb'?'crb-beamforming.html#multiuser':liveHref;
    if(bounded&&algorithmHref){const c=cs.find(c=>c.paper.split('#')[0]===algorithmHref.split('#')[0]);add({href:algorithmHref,label:gs[0]?.executable?.kind==='validated-paper-model'?'进入有界模型交互教程':'进入有界算法交互教程',kind:'algorithm',scope:c?.fields?.['结论边界']||gs[0]?.executable?.limitations||cs[0]?.paperComparison?.siteArtifactType||record.minimalFaithfulTarget.description});}
    if(record.id==='crb'){const prerequisite=registry.units.find(u=>u.id==='crb-beamforming');if(!prerequisite)throw Error('Missing CRB single-user prerequisite');add({href:prerequisite.href,label:'回看 K=1 单用户先修',kind:'prerequisite',scope:'单用户定理先修；多用户式(33)请使用主算法入口。'});}
    gs.filter(g=>g.executable).forEach(g=>add({href:g.executable.href,label:g.executable.label,kind:'algorithm',scope:g.executable.limitations}));
    cs.forEach(c=>add({href:c.paper,label:'阅读模型、算法与证据边界',kind:'case',scope:c.paperComparison.siteArtifactType}));
    gs.forEach(g=>add({href:`reading.html#guide-${g.id}`,label:'论文导读与原文定位',kind:'guide',scope:g.limits.join(' ')}));
    ds.forEach(c=>add({href:`reading.html#paper-${c.id}`,label:'论文身份与阅读证据',kind:'directory',scope:c.evidenceBoundary}));
    return {id:record.id,title:record.title,shortTitle:gs[0]?.title||ds[0]?.shortTitle||cs[0]?.title||record.title,question:gs[0]?.question||cs[0]?.title||ds[0]?.heading||record.title,source:record.source.url,directionIds:[...directionIds],caseIds:ref.caseIds,guideIds:ref.guideIds,catalogIds:ref.catalogIds,tutorials,boundary:tutorials[0]?.scope||record.minimalFaithfulTarget.description,status:bounded?'bounded-core':adapted?'adapted-mechanism':'reading-or-mechanism',sourceIdentity:record.source.paperIdentity};
  });
  const problems=papers.map(p=>({id:`question-${p.id}`,title:p.question,paperId:p.id,directionIds:p.directionIds}));
  const edges=problems.flatMap(q=>[...q.directionIds.map(id=>({from:id,to:q.id,type:'classification',provenance:'registry primaryCaseIds / unit primaryDirectionId / guide directionId; directory fallback group'})),{from:q.id,to:q.paperId,type:'classification',provenance:'PAPER-EXECUTION-BACKLOG canonicalReferences; editorial question'}]);
  return {schemaVersion:1,directions:dirs,problems,papers,edges,lineage:[],counts:{papers:papers.length,guides:guides.cards.length},note:'连线表示问题分类，不代表论文引用、先后继承或已验证研究谱系。'};
}
function renderResearchTree(data){return `<section class="research-tree" data-research-tree aria-labelledby="research-tree-title"><div class="rt-heading"><p class="rt-eyebrow">PAPER EXPLORER · 论文阅读</p><h2 id="research-tree-title">从一个问题，走进一篇论文</h2><p>${data.counts.papers} 篇独立论文 · ${data.counts.guides} 张专题导读 · 八个研究方向</p><p>${escape(data.note)} 有界算法、先修机制与未实现部分在每篇入口分别注明。</p></div><div data-tree-app></div><details class="rt-fallback" open><summary>全部论文：二维文字目录（无 JavaScript 也可用）</summary>${data.directions.map(d=>`<section><h3>${escape(d.title)}</h3><ul>${data.papers.filter(p=>p.directionIds.includes(d.id)).map(p=>`<li><a href="${escape(p.tutorials[0]?.href||p.source)}">${escape(p.title)}</a> · ${escape(p.status==='bounded-core'?'有界算法入口':'导读 / 机制入口')}<p>${escape(p.question)}</p></li>`).join('')}</ul></section>`).join('')}</details><script type="application/json" data-tree-data>${JSON.stringify(data).replace(/</g,'\\u003c')}</script></section>`;}
module.exports={buildResearchTree,renderResearchTree,identity};
