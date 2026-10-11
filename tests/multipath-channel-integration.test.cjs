'use strict';
// Registry, source boundaries and generated navigation; scientific and browser validation are separate.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createLearningEntryResolver}=require('../scripts/learning-entry.cjs');
const renderMap=require('../scripts/knowledge-map.cjs');
const {buildResearchGuides}=require('../scripts/research-guides.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const r=JSON.parse(read('site/registry.json')),data=JSON.parse(read(r.researchDirectoryFile));
const c=r.cases.find(c=>c.id==='case-multipath-channel'),u=r.units.find(u=>u.id==='multipath-channel'),p=r.pages.find(p=>p.path==='multipath-channel.html');
const researchGuides=buildResearchGuides(JSON.parse(read(r.researchGuidesFile)),r);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const article=(html,id)=>{const m=html.match(new RegExp(`<article[^>]* id="${id}"[^>]*>[\\s\\S]*?<\\/article>`));a.ok(m,id);return m[0];};
const resolve=href=>{const [file,anchor]=href.split('#');a.ok(fs.existsSync(path.join(root,file)),href);if(anchor)a.ok(read(file).includes(`id="${anchor}"`),href);};
const template=(html,id)=>{const m=html.match(new RegExp(`<template[^>]+id="map-template-${id}"[^>]*>([\\s\\S]*?)<\\/template>`));a.ok(m,id);return m[1];};

test('one bounded active-link lesson is canonical within the existing eight directions',()=>{
 a.ok(c&&u&&p);a.equal(c.title,'同一个终端，为什么收到两条路径？');a.equal(u.title,c.title);a.equal(p.title,c.title);
 for(const [items,key,value]of [[r.cases,'id',c.id],[r.units,'id',u.id],[r.pages,'path',p.path]])a.equal(items.filter(x=>x[key]===value).length,1);
 a.equal(c.unit,u.id);a.equal(p.case,c.id);a.equal(p.stage,'experiments');a.equal(u.primaryDirectionId,'channels');
 a.equal(c.learningEntry,'multipath-channel.html#question');a.equal(u.href,'multipath-channel.html#experiment');a.equal(c.paper,'multipath-channel.html#source');a.equal(c.next,'multipath-channel.html#boundary');a.equal(p.next,'practice.html#notebook');
 a.equal(r.units.length,28);a.equal(r.cases.length,15);a.equal(r.knowledgeMap.nodes.length,32);a.equal(r.directions.length,8);
});

test('channels has six bounded available layers and keeps broader proposed work unavailable',()=>{
 const d=r.directions.find(d=>d.id==='channels');a.deepEqual(d.primaryCaseIds,[c.id]);a.equal(d.levels[0].items[0].href,'foundations.html#realworld');
 for(const [level,anchor]of [['intuition','question'],['model','model'],['experiment','experiment'],['papers','source'],['limits','boundary'],['reproduction','derivation']]){
  const items=d.levels.find(l=>l.id===level).items.filter(i=>i.href==='multipath-channel.html#'+anchor);a.equal(items.length,1);a.equal(items[0].scope,'direction-specific');a.equal(items[0].status,'available');resolve(items[0].href);
 }
 const exp=d.levels.find(l=>l.id==='experiment');a.equal(exp.coverage,'direction-specific');a.match(exp.notice,/单向静态双路径/);a.match(exp.notice,/完整目标—杂波—干扰分量、漫散射与实测校准仍待建设/);
 const pending=exp.items.find(i=>i.label==='目标—杂波—干扰分量可视化');a.equal(pending.status,'proposed');a.ok(!pending.href);
 a.match(d.coverage,/完整真实信道、漫散射与杂波抑制系统尚未实现/);a.doesNotMatch(d.coverage,/专项实验尚未实现|专属深度交互模块待建设/);
 a.equal(exp.items.find(i=>i.href==='foundations.html#cfar').scope,'foundation-only');
});

test('existing phase, delay and channels nodes gain the lesson without altering beginner routes or map edges',()=>{
 const nodes=r.knowledgeMap.nodes.filter(n=>n.unitRefs.includes(u.id));a.deepEqual(nodes.map(n=>n.id),['phase','delay','channels']);
 for(const n of nodes)a.equal(n.unitRefs.filter(id=>id===u.id).length,1);
 a.equal(nodes[0].entryUnitRef,'doppler');a.equal(nodes[1].entryUnitRef,'ofdm');a.equal(nodes[2].href,'foundations.html#realworld');
 a.equal(hash(JSON.stringify(r.knowledgeMap.nodes.map(({id,entryUnitRef,href})=>({id,entryUnitRef,href})))),'99e8da7877af455b1943b0be1e56113a218f0c00f59d85f13d32ec07923279d2');
 a.equal(hash(JSON.stringify(r.knowledgeMap.edges)),'3fea85e3d66a240d1680ecb1dff3d4028f49a7530d9ceab71308941111f8d83f');
 a.match(nodes[0].boundary,/未知复增益/);a.match(nodes[1].boundary,/τ=L\/c/);a.match(nodes[2].boundary,/不等于完整真实信道/);
});

test('learning-entry resolver still routes generic lesson links to the question and explicit controls to the experiment',()=>{
 const resolver=createLearningEntryResolver(r);a.equal(resolver.caseEntry(c),c.learningEntry);a.equal(resolver.unitEntry(u),c.learningEntry);
 const html=renderMap(r,researchGuides);for(const id of ['phase','delay','channels','direction:channels']){
  const body=template(html,id);a.ok(body.includes(`href="${c.learningEntry}">${c.title} →</a>`),id);a.ok(body.includes(`href="${u.href}"`),id);
 }
 const without=structuredClone(r);delete without.cases.find(x=>x.id===c.id).learningEntry;a.equal(createLearningEntryResolver(without).unitEntry(without.units.find(x=>x.id===u.id)),u.href);
 // PR #37 resolver remains the canonical validation implementation, unchanged by integration.
 a.equal(hash(read('scripts/learning-entry.cjs')),'f7c2fcdeb49f2759f7de3537bfcdddfd3bb9a60abf4c58f27e31e6194b66d287');
});

test('fixed source metadata separates the 2015 paper, 2018 v2 upload and independent teaching design',()=>{
 const pc=c.paperComparison,meta=JSON.stringify(pc);a.equal(pc.comparisonStatus,'partial');a.equal(pc.sourceUrl,'https://arxiv.org/html/1409.1467v2');a.equal(pc.comparisonLink,c.paper);
 for(const s of ['IEEE JSAC 2015','1409.1467v2','2018-12-10','不是期刊发表年份'])a.ok(pc.version.includes(s),s);
 for(const s of ['Figure 1','式(1)','式(7)','式(18)–(24)','式(36)–(38)','Figures 3–5'])a.ok(pc.locator.summary.includes(s),s);
 a.match(pc.siteArtifactType,/非论文数值复现/);a.match(pc.researchQuestion,/不求二维位置/);
 for(const s of ['τ=L/c','未知复增益','路径个数','生成器','N=128','2 MHz','6 GHz','QPSK/CP','1/L','漫散射','CRB/EFIM','不是时延 CRB','近重叠≠所有位置信息消失'])a.ok(meta.includes(s),s);
 for(const key of ['retainedAssumptions','omittedMechanisms','metrics','unknowns'])a.ok(pc[key].length,key);
 a.doesNotMatch(meta,/\/workspace\/|\/tmp\//);
});

test('resource metadata preserves fixed transmit resources and receiver versus truth separation',()=>{
 const pc=c.paperComparison,b=pc.resourceBudget,meta=JSON.stringify(pc);
 for(const s of ['Y','X','固定','候选网格','不接收 h','墙面坐标','真实时延','路径系数','路径个数','分量标签'])a.ok(pc.observationsAndUnknowns.includes(s),s);
 for(const s of ['整数 k=−64…63','Σ|X|²=1','256 MHz','254 MHz','0.5 μs','0.125 μs','0.625 μs','[0,Tu)','33.35640952 ns<125 ns','.21922241148558474','.21901243898695386','1401','噪声方差 0','不补偿成固定接收 SNR'])a.ok(b.summary.includes(s),s);
 for(const s of ['理想直达路衰减干预','不同静态快照','0:0.01:14 m','不加入真值','0…0.12','|z|²≤1/9','no_response/estimate=null','single_grid_maximum','不增加带宽或独立信息'])a.ok(meta.includes(s),s);
 a.match(b.energy,/时间比例 1\/4 不推出固定波形 CP 能量为 1\/4/);
});

test('all nine influence cards, eight active entries and all their original evidence stay byte-identical',()=>{
 a.equal(hash(read(r.researchDirectoryFile)),'95b0038bc1e110bd64efba999015f85eeeea2f63dceaea30cedc79fd1059f1b9');
 a.equal(data.cards.length,9);a.equal(data.cards.filter(x=>x.caseId).length,8);a.deepEqual(data.cards.filter(x=>!x.caseId).map(x=>x.id),['deepsense']);a.ok(data.cards.every(x=>x.caseId!==c.id));
 const h=read('reading.html');a.equal((h.match(/class="influence-card"/g)||[]).length,9);a.match(h,/深度交互已接入：8 \/ 9 篇/);
 const pending=article(h,'paper-deepsense');a.match(pending,/深度交互尚未实现/);a.ok(!/href="(?!https:)/.test(pending));
});

test('source guide, six anchors and generated portals use the shared shell and verified local destinations',()=>{
 const expected=['foundations.html#echo','foundations.html#iq','foundations.html#matched','foundations.html#ofdm'];a.deepEqual(u.prerequisites,expected);a.deepEqual(p.prerequisites,expected);
 const page=read(p.path);for(const href of expected){resolve(href);a.ok(c.fields['先修'].includes(`href="${href}"`));a.ok(page.includes(`href="${href}"`));}
 for(const anchor of ['question','model','experiment','source','boundary','derivation'])resolve(p.path+'#'+anchor);
 for(const key of ['HEADER','CONTEXT','NEXT'])a.equal((page.match(new RegExp('<!-- SITE:'+key+':START -->','g'))||[]).length,1);
 a.ok(page.includes('href="experiments.html" aria-current="location"'));a.ok(page.includes('href="practice.html?topic=multipath-channel#notebook"'));
 const guide=article(read('site/content-reading.html'),'ref-MULTIPATH'),doc=read('docs/READING-MAP.md');
 for(const href of [c.learningEntry,u.href,c.paper,c.next,p.path+'#model',p.path+'#derivation'])a.ok(guide.includes(`href="${href}"`),href);
 for(const [,href]of guide.matchAll(/href="(https:[^"]+)"/g))a.ok(doc.includes(href),href);
 a.doesNotMatch(guide,/class="influence-card"|<button|<input|<canvas/);a.equal(article(read('reading.html'),'ref-MULTIPATH'),guide);
 for(const file of ['index.html','experiments.html','reading.html'])a.ok(read(file).includes(`href="${u.href}"`),file);a.ok(read('index.html').includes(`href="${c.learningEntry}"`));
 a.ok(read('index.html').includes('<strong>28</strong> 个机制实验'));a.ok(read('reading.html').includes('15 个已有主题'));
});

test('source manifest identifies fetched official HTML bytes without distributing paper text or mixing evidence',()=>{
 const m=JSON.parse(read('data/multipath-channel-sources.json'));a.equal(m.verified_on,'2026-10-11');a.equal(m.DOI,'10.1109/JSAC.2015.2430520');a.equal(m.primary_edition,'arxiv-1409.1467v2-html');
 const s=m.sources.find(s=>s.id===m.primary_edition);a.equal(s.url,c.paperComparison.sourceUrl);a.equal(s.format,'official arXiv HTML');a.equal(s.uploaded,'2018-12-10');a.equal(s.sha256,'3fdf1f2eb476888236286ddf0cf8cd27628c0d4740760af91464323cc4725e01');a.match(s.hash_scope,/not PDF bytes/);a.equal(s.locators.length,7);a.ok(s.locators.some(x=>x.id==='S6.SS1'));a.ok(s.locators.some(x=>x.id==='S5.SS1'));
 a.match(m.adaptation.evidence_type,/Independent synthetic mechanism adaptation/);a.match(m.adaptation.original_resources,/RRC/);a.match(m.adaptation.metric_boundary,/not original PEB/);a.doesNotMatch(JSON.stringify(m),/\/workspace\/|\/tmp\/|"file"\s*:/);a.ok(m.sources.every(x=>!x.file));
 for(const name of fs.readdirSync(path.join(root,'data')).filter(x=>/multipath/.test(x)))a.doesNotMatch(name,/\.(pdf|html|png|jpe?g)$/i);
});

test('portable independent audit result matches the exact published core and frozen numerical reference',()=>{
 const audit=JSON.parse(read('scripts/multipath-channel-independent/audit-js-results.json'));a.equal(audit.status,'PASS');a.deepEqual(audit.failed_checks,[]);a.ok(audit.check_count>=103);a.equal(audit.checks.length,audit.check_count);a.ok(audit.checks.every(x=>x.passed));
 a.equal(audit.core_sha256,hash(read('multipath-channel-core.js')));a.equal(audit.reference_sha256,hash(read('scripts/multipath-channel-reference/reference.py')));a.equal(audit.fixtures_sha256,hash(read('scripts/multipath-channel-reference/fixtures.json')));a.doesNotMatch(JSON.stringify(audit),/\/workspace\/|\/tmp\//);
 a.ok(read('docs/MULTIPATH-CHANNEL-INDEPENDENT.md').includes(audit.core_sha256));a.match(read('scripts/multipath-channel-independent/audit-js.py'),/standard libraries only/);
});
