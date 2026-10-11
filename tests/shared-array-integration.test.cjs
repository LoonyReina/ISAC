'use strict';
// Registry, frozen source and static navigation contracts; numerical and browser evidence are separate.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const r=JSON.parse(read('site/registry.json')),data=JSON.parse(read(r.researchDirectoryFile));
const c=r.cases.find(c=>c.id==='case-shared-array'),u=r.units.find(u=>u.id==='shared-array'),p=r.pages.find(p=>p.path==='shared-array.html');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const resolve=href=>{const [file,anchor]=href.split('#');a.ok(fs.existsSync(path.join(root,file)),href);if(anchor)a.ok(read(file).includes(`id="${anchor}"`),href);};
const article=(html,id)=>{const m=html.match(new RegExp(`<article[^>]* id="${id}"[^>]*>[\\s\\S]*?<\\/article>`));a.ok(m,id);return m[0];};

test('shared-array has one canonical mechanism in the existing eight-direction framework',()=>{
 a.ok(c&&u&&p);a.equal(c.title,'同样八根天线，分开使用会少掉什么？');
 for(const [items,key,value]of [[r.cases,'id',c.id],[r.units,'id',u.id],[r.pages,'path',p.path]])a.equal(items.filter(i=>i[key]===value).length,1);
 a.equal(c.unit,u.id);a.equal(p.case,c.id);a.equal(p.stage,'experiments');a.equal(u.primaryDirectionId,'spatial');
 a.equal(c.learningEntry,'shared-array.html#question');a.equal(u.href,'shared-array.html#experiment');a.equal(c.paper,'shared-array.html#paper');a.equal(c.next,'shared-array.html#boundaries');a.equal(p.next,'practice.html#notebook');
 a.equal(r.units.length,27);a.equal(r.cases.length,15);a.equal(r.knowledgeMap.nodes.length,32);a.equal(r.directions.length,8);
});

test('shared-array provides all six learning layers without replacing existing beginner entries',()=>{
 for(const id of ['spatial','tradeoffs']){
  const d=r.directions.find(d=>d.id===id);a.equal(d.primaryCaseIds.filter(id=>id===c.id).length,1);
  a.equal(d.levels[0].items[0].href,id==='spatial'?'foundations.html#array':'foundations.html#limits');
  for(const [level,anchor]of [['intuition','question'],['model','objects'],['experiment','experiment'],['papers','paper'],['limits','boundaries'],['reproduction','validation']]){
   const items=d.levels.find(l=>l.id===level).items.filter(i=>i.href==='shared-array.html#'+anchor);a.equal(items.length,1);a.equal(items[0].scope,'direction-specific');a.equal(items[0].status,'available');resolve(items[0].href);
  }
 }
 const nodes=r.knowledgeMap.nodes.filter(n=>n.unitRefs.includes(u.id));a.deepEqual(nodes.map(n=>n.id),['budget','beam-design','joint-objectives']);
 a.equal(nodes[0].href,'foundations.html#codesign');a.equal(nodes[1].entryUnitRef,'array');a.equal(nodes[2].entryUnitRef,'rate');
 for(const n of nodes)a.equal(n.unitRefs.filter(id=>id===u.id).length,1);
 a.match(nodes[0].boundary,/raw.*四个 P=1/);a.match(nodes[1].boundary,/2018.*2020/);a.match(nodes[2].boundary,/架构通用赢家/);
});

test('only existing mu_mimo case and reading plan change; every other directory field and all nine snapshots are frozen',()=>{
 const preserved=structuredClone(data),card=preserved.cards.find(c=>c.id==='mu_mimo');delete card.caseId;delete card.readingPlan;
 a.equal(hash(preserved),'0e73dff1af33f5fe55c2783d585c9dc9e1a10a11bcc7852b7d2665f569d564e5');
 a.equal(hash(data.cards.map(({id,metrics,endorsements,socialDiscussion})=>({id,metrics,endorsements,socialDiscussion}))),'a4f90b03030f9dac09fa48676410a366f37c32a880693d77fa2f88e107383878');
 const actual=data.cards.find(c=>c.id==='mu_mimo');a.equal(actual.caseId,c.id);a.match(actual.readingPlan,/raw.*四个同预算配方/);a.match(actual.readingPlan,/不复现作者优化算法/);
 a.equal(data.cards.length,9);a.equal(new Set(data.cards.map(c=>c.doi)).size,9);a.equal(data.cards.filter(c=>c.caseId).length,8);a.deepEqual(data.cards.filter(c=>!c.caseId).map(c=>c.id),['deepsense']);
 a.equal(actual.metrics.snapshotDate,'2026-10-10');a.deepEqual([actual.metrics.openAlex.count,actual.metrics.semanticScholar.count,actual.metrics.completedYear.count],[963,936,200]);a.equal(actual.socialDiscussion.status,'unavailable');
});

test('shared-array source identifies VoR and submitted v1 with exact independent page locators',()=>{
 const pc=c.paperComparison,meta=JSON.stringify(pc);a.equal(pc.sourceId,'mu_mimo');a.equal(pc.comparisonStatus,'partial');a.equal(pc.comparisonLink,c.paper);
 a.equal(pc.sourceUrl,'https://discovery.ucl.ac.uk/id/eprint/1563386/7/Masouros%20VoR%2008288677.pdf');
 for(const s of ['Fan Liu','17(4)','2755–2770','10.1109/TWC.2018.2803045','16 页','1707.00519v1','2017-07-03','15 页投稿稿','未确认为接受稿'])a.ok(pc.version.includes(s),s);
 for(const s of ['式(5)–(8) p.2758','式(11) p.2759','式(14)–(18) p.2759','式(20) p.2760','v1 p.6'])a.ok(pc.locator.summary.includes(s),s);
 for(const s of ['4d8f2135a6014338d82dee21da2ba2e05e3c4567bc55c8cb2f4f5525c10855a2','b9cbff1ab26b63926e1de87393121ec3ba6ca5de10a7bec99b95ddec91fb42ac'])a.ok(pc.verificationNote.includes(s),s);
 a.match(meta,/≤0.85P₀/);a.match(meta,/不证明作者仿真实际用了不等功率/);a.match(meta,/不能声称恰好等于/);a.match(meta,/7 vs 15 dB PSLR.*不是普遍/);
 a.doesNotMatch(meta,/\/workspace\/|\/tmp\//);
});

test('resource accounting separates raw diagnostics, equal-power recipes, and data-only sharing from 2020 radar streams',()=>{
 const pc=c.paperComparison,meta=JSON.stringify(pc);
 for(const s of ['P=1','8 条理想发射 RF 链','3.5λ','1.5λ','0独立雷达流','.7866116524','仅总功率约束','相同功放额定能力','2020','不另计雷达干扰','目标仅计算发射侧 aᴴRa','β','P_r N_r q²','P_r N_r q','每天线相等约束','不以 epsilon','窄子问题','最优性或通用赢家'])a.ok(meta.includes(s),s);
 a.match(pc.resourceBudget.priorKnowledge,/同一每阵元信道直接截取子向量/);a.match(meta,/h=conj\(h_paper\)/);a.match(meta,/有限随机符号块精确正交/);
 a.match(meta,/q=0.*N_r>1.*零空间仍可非空/);a.match(meta,/N_r=1.*P_r>0.*不可行/);
 for(const key of ['retainedAssumptions','omittedMechanisms','metrics','unknowns'])a.ok(pc[key].length,key);
 a.match(c.fields['下一研究问题'],/每天线功率上限或 CSI 误差/);
});

test('shared-array reading guide is one source guide, not an extra influence card or algorithm reproduction',()=>{
 const h=article(read('site/content-reading.html'),'ref-SHARED-ARRAY'),doc=read('docs/READING-MAP.md');
 for(const href of [c.learningEntry,u.href,c.paper,c.next,'shared-array.html#objects','shared-array.html#mechanism','shared-array.html#validation'])a.ok(h.includes(`href="${href}"`),href);
 for(const [,url]of h.matchAll(/href="(https:[^"]+)"/g))a.ok(doc.includes(url),url);
 for(const s of ['2018','2020','raw','≤0.85P₀','p.2760','不保留原文每天线相等约束','不能据此判断作者实际仿真功率'])a.ok(h.includes(s),s);
 a.doesNotMatch(h,/class="influence-card"|<button|<input|<canvas/);a.equal(article(read('reading.html'),'ref-SHARED-ARRAY'),h);
});

test('shared-array prerequisites, section anchors and generated portals resolve through the shared shell',()=>{
 const expected=['foundations.html#iq','foundations.html#array','foundations.html#codesign'];a.deepEqual(u.prerequisites,expected);a.deepEqual(p.prerequisites,expected);
 const h=read(p.path);for(const href of expected){resolve(href);a.ok(c.fields['先修'].includes(`href="${href}"`));a.ok(h.includes(`href="${href}"`));}
 for(const anchor of ['question','objects','experiment','mechanism','boundaries','paper','validation'])resolve(p.path+'#'+anchor);
 for(const key of ['HEADER','CONTEXT','NEXT'])a.equal((h.match(new RegExp('<!-- SITE:'+key+':START -->','g'))||[]).length,1);
 for(const href of [u.href,c.paper,c.next,'practice.html?topic=shared-array#notebook'])a.ok(h.includes(`href="${href}"`),href);
 for(const file of ['index.html','experiments.html','reading.html'])a.ok(read(file).includes(`href="${u.href}"`),file);a.ok(read('index.html').includes(`href="${c.learningEntry}"`));
 a.ok(h.includes('href="experiments.html" aria-current="location"'));a.ok(read('index.html').includes('<strong>27</strong> 个机制实验'));
});

test('eighth existing card is live only through its canonical learning entry while DeepSense stays resource-only',()=>{
 const html=read('reading.html'),card=article(html,'paper-mu_mimo'),deep=article(html,'paper-deepsense');
 a.ok(card.includes(`href="${c.learningEntry}"`));a.match(card,/独立机制模型，非完整论文复现/);a.doesNotMatch(card,/教学案例准备中|深度交互尚未实现/);
 a.match(html,/深度交互已接入：8 \/ 9 篇/);a.equal((html.match(/class="influence-card"/g)||[]).length,9);a.match(deep,/深度交互尚未实现/);a.ok(!/href="(?!https:)/.test(deep));
 const {renderResearchDirectory}=require('../scripts/render-research-directory.cjs');
 for(const registry of [r,{...r,cases:r.cases.filter(x=>x.id!==c.id)}]){
  const absent=renderResearchDirectory(data,registry,file=>file!=='shared-array.html');a.match(article(absent,'paper-mu_mimo'),/教学案例准备中/);a.ok(!article(absent,'paper-mu_mimo').includes(`href="${u.href}"`));
 }
});

test('published research bundle retains frozen fixtures and reference implementations with verified source identity',()=>{
 const s=JSON.parse(read('data/shared-array-sources.json')),pc=c.paperComparison;
 a.equal(s.canonical.doi,'10.1109/TWC.2018.2803045');a.equal(s.canonical.authors[0],'Fan Liu');a.equal(s.canonical.volume,17);a.equal(s.canonical.issue,4);a.equal(s.canonical.pages,'2755-2770');
 const vor=s.editions.find(e=>e.type==='version of record hosted by UCL'),v1=s.editions.find(e=>e.type==='arxiv preprint v1 not accepted manuscript');
 a.equal(vor.url,pc.sourceUrl);a.equal(vor.pdf_pages,16);a.equal(vor.sha256,'4d8f2135a6014338d82dee21da2ba2e05e3c4567bc55c8cb2f4f5525c10855a2');
 a.equal(v1.url,'https://arxiv.org/pdf/1707.00519v1');a.equal(v1.pdf_pages,15);a.equal(v1.date,'2017-07-03');a.equal(v1.sha256,'b9cbff1ab26b63926e1de87393121ec3ba6ca5de10a7bec99b95ddec91fb42ac');
 a.match(s.institutional_accepted_manuscript,/Not located/);a.match(s.printed_normalization_ambiguity.author_simulation_implementation,/unverified; no inference/);a.equal(s.retained_bibliography_snapshot.refreshed,false);
 for(const [file,expected]of [
  ['data/shared-array-fixtures.json','721c18adb6b491000b9641d460d1e945eddf3d9c1a6601bad82705e0420d0130'],
  ['scripts/shared-array-reference/reference.py','e0262cd4bad47c58752c34f63978fbc70fec02ef5c6a23a83d8c75cdeac9ea2b'],
  ['scripts/shared-array-reference/test_reference.py','8fa40e5d75a9b346d4c85fc34d9884daeb3bd1e22d21e82dd3e0f537f7650c79']
 ])a.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),expected,file);
 for(const file of ['data/shared-array-sources.json','scripts/shared-array-reference/source-audit.md'])a.doesNotMatch(read(file),/\/workspace\/|\/tmp\//);
});
