'use strict';
// Integration and provenance contracts only; no numerical, browser or deployment claim.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createLearningEntryResolver}=require('../scripts/learning-entry.cjs');
const renderMap=require('../scripts/knowledge-map.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const r=JSON.parse(read('site/registry.json')),data=JSON.parse(read(r.researchDirectoryFile));
const c=r.cases.find(c=>c.id==='case-distributed-detection'),u=r.units.find(u=>u.id==='distributed-detection'),p=r.pages.find(p=>p.path==='distributed-detection.html');
const {withoutReferenceUncertainty}=require('./helpers/reference-uncertainty-registry.cjs');
const beforeReferenceUncertainty=withoutReferenceUncertainty(r);
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const resolve=href=>{const [file,anchor]=href.split('#');a.ok(fs.existsSync(path.join(root,file)),href);if(anchor)a.ok(read(file).includes(`id="${anchor}"`),href);};
const article=(html,id)=>{const m=html.match(new RegExp(`<article[^>]* id="${id}"[^>]*>[\\s\\S]*?<\\/article>`));a.ok(m,id);return m[0];};
const template=(html,id)=>{const m=html.match(new RegExp(`<template[^>]+id="map-template-${id}"[^>]*>([\\s\\S]*?)<\\/template>`));a.ok(m,id);return m[1];};

test('two-station detection adds one canonical lesson within the existing eight directions',()=>{
 a.ok(c&&u&&p);a.equal(c.title,'两个功率数，够不够判断有目标？');a.equal(u.title,c.title);a.equal(p.title,c.title);
 for(const [items,key,value]of [[r.cases,'id',c.id],[r.units,'id',u.id],[r.pages,'path',p.path]])a.equal(items.filter(x=>x[key]===value).length,1);
 a.equal(c.unit,u.id);a.equal(p.case,c.id);a.equal(p.stage,'experiments');a.equal(u.primaryDirectionId,'networks');
 a.equal(c.learningEntry,p.path+'#question');a.equal(u.href,p.path+'#experiment');a.equal(c.paper,p.path+'#paper');a.equal(c.next,p.path+'#practice');a.equal(p.next,'practice.html#notebook');
 a.equal(r.units.length,28);a.equal(r.cases.length,15);a.equal(r.knowledgeMap.nodes.length,32);a.equal(r.directions.length,8);
});

test('existing lessons, cases, pages, unrelated directions and legacy links match the current integration snapshot',()=>{
 // The case-free off-grid mechanism changes only its own unit/page and receiver depth;
 // offgrid-range-integration.test.cjs also locks every earlier unit/page and all case evidence.
 a.equal(hash(beforeReferenceUncertainty.units.filter(x=>x.id!==u.id)),'ca4c7f1707ae80034abacea14e95cbfa93c7bd3619c0c8cc9af8a4f5e6609b6b');
 a.equal(hash(r.cases.filter(x=>x.id!==c.id)),'35c3df650a13990aaa0217f488aedf239904d3c581cd00218258662736db2a99');
 a.equal(hash(beforeReferenceUncertainty.pages.filter(x=>x.path!==p.path)),'04732f472b3881947c54187d6890aa997aa4cc8065b62e1a8551943c91de51e7');
 // Normalize the exact new mechanism hooks first; retain the older reading-only scope normalization.
 const historicalDirections=structuredClone(beforeReferenceUncertainty.directions.filter(x=>x.id!=='networks'));
 const waveforms=historicalDirections.find(d=>d.id==='waveforms');
 a.equal(waveforms.scope,'发射信号、调制坐标、导频歧义、训练序列复用与严格协方差波形优化；新增 OTFS 原文导读；完整 OTFS 收发机实验仍待实现。');
 waveforms.scope='发射信号、调制坐标、导频歧义、训练序列复用与严格协方差波形优化；OTFS 为后续专题。';
 a.equal(hash(historicalDirections),'8cbd0865146fb27cfdceab1f7297c6182f5ea771378f5e6cbef02f54c6d370d4');
 a.equal(hash(r.legacy),'1fb9c986a8111d4c4b8a16f7762fb5f4c3c6c470c1f6bc95d2c3caf99dd6ffed');
});

test('networks preserves its clock beginner route while adding six honest detection depths',()=>{
 const d=r.directions.find(d=>d.id==='networks');a.deepEqual(d.primaryCaseIds,['case-clock',c.id]);a.equal(d.levels.length,6);a.equal(d.levels[0].items[0].href,'foundations.html#geometry');
 a.match(d.title,/融合证据/);a.match(d.question,/位置估计与存在性判决/);a.match(d.coverage,/未实现完整 cell-free 网络或整篇论文复现/);
 for(const [level,anchor]of [['intuition','question'],['model','observation'],['model','model'],['experiment','experiment'],['papers','paper'],['limits','paper'],['reproduction','practice']]){
  const items=d.levels.find(l=>l.id===level).items.filter(i=>i.href===p.path+'#'+anchor);a.equal(items.length,1);a.equal(items[0].scope,'direction-specific');a.equal(items[0].status,'available');resolve(items[0].href);
 }
 for(const l of d.levels)for(const item of l.items)if(item.status==='proposed')a.ok(!item.href);
});

test('matched, detection and budget gain a lesson while all concept entries and edges stay intact',()=>{
 const nodes=r.knowledgeMap.nodes.filter(n=>n.unitRefs.includes(u.id));a.deepEqual(nodes.map(n=>n.id),['matched','detection','budget']);
 for(const n of nodes)a.equal(n.unitRefs.filter(id=>id===u.id).length,1);
 a.equal(nodes[0].entryUnitRef,'matched');a.equal(nodes[1].entryUnitRef,'cfar');a.equal(nodes[2].href,'foundations.html#codesign');
 a.equal(hash(r.knowledgeMap.nodes.map(({id,entryUnitRef,href})=>({id,entryUnitRef,href}))),'99e8da7877af455b1943b0be1e56113a218f0c00f59d85f13d32ec07923279d2');
 a.equal(hash(r.knowledgeMap.edges),'3fea85e3d66a240d1680ecb1dff3d4028f49a7530d9ceab71308941111f8d83f');
 a.deepEqual(r.knowledgeMap.nodes.find(n=>n.id==='synchronization').unitRefs,['clock']);
});

test('the unchanged central resolver chooses the question for generic entries and experiment for explicit actions',()=>{
 const resolver=createLearningEntryResolver(r);a.equal(resolver.caseEntry(c),c.learningEntry);a.equal(resolver.unitEntry(u),c.learningEntry);
 const html=renderMap(r);for(const id of ['matched','detection','budget','direction:networks']){
  const body=template(html,id);a.ok(body.includes(`href="${c.learningEntry}">${c.title} →</a>`),id);a.ok(body.includes(`href="${u.href}"`),id);
 }
 const without=structuredClone(r);delete without.cases.find(x=>x.id===c.id).learningEntry;a.equal(createLearningEntryResolver(without).unitEntry(without.units.find(x=>x.id===u.id)),u.href);
 a.equal(hash(read('scripts/learning-entry.cjs')),'f7c2fcdeb49f2759f7de3537bfcdddfd3bb9a60abf4c58f27e31e6194b66d287');
 a.ok(html.includes(`data-map-unit="${u.id}"`));
});

test('fixed Behdad v2 background and unresolved Zou full text cannot become a MAPRT reproduction claim',()=>{
 const pc=c.paperComparison,meta=JSON.stringify(pc);a.equal(pc.comparisonStatus,'partial');a.equal(pc.sourceId,'Behdad2024');a.equal(pc.sourceUrl,'https://arxiv.org/abs/2305.12523v2');a.equal(pc.comparisonLink,c.paper);
 for(const s of ['2024-03-27','IEEE TWC 23(9)','11580–11596','10.1109/TWC.2024.3383209'])a.ok(pc.version.includes(s),s);
 for(const s of ['§VII','式(20)–(33)','最大化','§IX/Table III','独立、等方差 Swerling-I','不复现论文原图'])a.ok(pc.locator.summary.includes(s),s);
 a.equal(pc.locator.figure,null);a.match(pc.siteArtifactType,/边缘化 LRT/);a.match(pc.siteArtifactType,/非原论文 MAPRT/);
 for(const s of ['Zou2024','10.1109/LWC.2024.3462710','稳定官方/作者全文尚未取得','未核对','fully/partly-informed','独立推导','30b871e5bb3dd1a66fab1a4c2ab3974abb8a7e664e04e2dfa62f6e50679c0d10'])a.ok(meta.includes(s),s);
 for(const key of ['retainedAssumptions','omittedMechanisms','metrics','unknowns'])a.ok(pc[key].length,key);
 a.doesNotMatch(meta,/\/workspace\/|\/tmp\//);
});

test('resource and metric metadata bound sufficiency, fixed Pfa and two-way scalar accounting',()=>{
 const pc=c.paperComparison,b=pc.resourceBudget,meta=JSON.stringify(pc);
 for(const s of ['同一固定候选','已知白噪声','真实 α','固定候选','同一原始观测','能量和','最优能量域检验','ρ=0','随机化','Pd=Pfa','有限比特无损'])a.ok(meta.includes(s),s);
 for(const s of ['4LB','4B','2B','4L','本次 0','历史免费','原始上传不需要','默认 0 表示未估计','星型单播'])a.ok(b.summary.includes(s),s);
 for(const s of ['640/680/660','640/104/84','640/40/20','bits_per_real','没有模拟量化','端到端时延','κ/q','tr(qRκ)=2q'])a.ok(meta.includes(s),s);
 a.match(pc.observationsAndUnknowns,/H 标签和目标真值只在模拟器内部/);a.match(pc.observationsAndUnknowns,/只读取观测、模型和门限/);
 a.match(b.duration,/没有设定采样周期或真实链路时延/);a.match(b.aperture,/不增加站数/);
});

test('nine influence cards and eight active entries retain their exact evidence bytes',()=>{
 a.equal(hash(read(r.researchDirectoryFile)),'95b0038bc1e110bd64efba999015f85eeeea2f63dceaea30cedc79fd1059f1b9');
 a.equal(data.cards.length,9);a.equal(data.cards.filter(x=>x.caseId).length,8);a.deepEqual(data.cards.filter(x=>!x.caseId).map(x=>x.id),['deepsense']);a.ok(data.cards.every(x=>x.caseId!==c.id));
});

test('source guide and real page anchors preserve prerequisites without fabricated source or math destinations',()=>{
 const pre=['foundations.html#iq','foundations.html#matched','foundations.html#cfar','foundations.html#geometry'];a.deepEqual(u.prerequisites,pre);a.deepEqual(p.prerequisites,pre);
 for(const href of pre){resolve(href);a.ok(c.fields['先修'].includes(`href="${href}"`));}
 for(const anchor of ['question','observation','model','experiment','paper','practice'])resolve(p.path+'#'+anchor);
 const page=read(p.path);for(const key of ['HEADER','CONTEXT','NEXT'])for(const side of ['START','END'])a.equal((page.match(new RegExp('<!-- SITE:'+key+':'+side+' -->','g'))||[]).length,1);
 const guide=article(read('site/content-reading.html'),'ref-DISTRIBUTED'),doc=read('docs/READING-MAP.md');
 for(const anchor of ['question','observation','model','experiment','paper','practice'])a.ok(guide.includes(`href="${p.path}#${anchor}"`),anchor);
 for(const [,href]of guide.matchAll(/href="(https:[^"]+)"/g))a.ok(doc.includes(href),href);
 a.match(guide,/没有取得稳定官方\/作者全文/);a.match(guide,/不归属未核对的公式/);a.doesNotMatch(guide,/class="influence-card"|<button|<input|<canvas/);
});

test('generated portals expose real learning and experiment links, accurate counts and the unchanged influence directory',()=>{
 for(const file of ['index.html','experiments.html','reading.html'])a.ok(read(file).includes(`href="${u.href}"`),file);
 const home=read('index.html'),reading=read('reading.html'),page=read(p.path);
 a.ok(home.includes(`href="${c.learningEntry}"`));a.ok(home.includes('<strong>28</strong> 个机制实验'));a.ok(home.includes('<strong>32</strong> 个核心概念'));a.ok(reading.includes('15 个已有主题'));
 a.equal(article(reading,'ref-DISTRIBUTED'),article(read('site/content-reading.html'),'ref-DISTRIBUTED'));
 a.equal((reading.match(/class="influence-card"/g)||[]).length,9);a.match(reading,/深度交互已接入：8 \/ 9 篇/);
 a.ok(page.includes('href="experiments.html" aria-current="location"'));a.ok(page.includes('href="practice.html?topic=distributed-detection#notebook"'));
 for(const href of p.prerequisites)a.ok(page.includes(`href="${href}"`));
});
