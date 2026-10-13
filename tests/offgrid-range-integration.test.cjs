const {withoutGCSAGERegistry}=require('./helpers/gc-sage-preservation.cjs');
'use strict';
// Registry, navigation and preservation checks; these are not browser or scientific validation.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {withoutMapProgressions,withoutMapProgressionGenerator,withoutBuildLinkValidation}=require('./helpers/map-progression-preservation.cjs');
const {createLearningEntryResolver}=require('../scripts/learning-entry.cjs');
const {buildNotebookTopics,notebookHref}=require('../scripts/notebook-topics.cjs');
const renderMap=require('../scripts/knowledge-map.cjs');
const {buildResearchGuides}=require('../scripts/research-guides.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const r=JSON.parse(read('site/registry.json')),u=r.units.find(u=>u.id==='offgrid-range'),p=r.pages.find(p=>p.path==='offgrid-range.html');
const {withoutReferenceUncertainty,withoutReferencePrerequisite}=require('./helpers/reference-uncertainty-registry.cjs');
const beforeReferenceUncertainty=withoutReferenceUncertainty(r);
const researchGuides=buildResearchGuides(JSON.parse(read(r.researchGuidesFile)),r);
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const template=(html,id)=>{const m=html.match(new RegExp(`<template[^>]+id="map-template-${id}"[^>]*>([\\s\\S]*?)<\\/template>`));a.ok(m,id);return m[1];};
function resolve(href){
 const url=new URL(href,'https://isac.example/');a.equal(url.origin,'https://isac.example');
 const file=url.pathname.slice(1);a.ok(fs.existsSync(path.join(root,file)),href);
 if(url.hash)a.ok(read(file).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),href);
}

test('off-grid range adds one case-free processing mechanism with honest fixed totals',()=>{
 a.ok(u&&p);a.equal(r.units.filter(x=>x.id===u.id).length,1);a.equal(r.pages.filter(x=>x.path===p.path).length,1);
 a.deepEqual([withoutGCSAGERegistry(r).units.length,require('./helpers/otfs-receiver-preservation.cjs').withoutOtfsRegistry(r).cases.length,r.knowledgeMap.nodes.length,r.directions.length,withoutGCSAGERegistry(r).pages.length],[28,15,32,8,24]);
 a.equal(u.title,'离格目标与测距网格');a.equal(u.question,'同一个目标，网格更密就一定测得更准吗？');a.equal(p.title,u.question);
 a.equal(u.group,'processing');a.equal(u.primaryDirectionId,'receiver');a.equal(p.stage,'experiments');
 a.equal(u.href,'offgrid-range.html#experiment');a.equal(p.next,'practice.html?topic=offgrid-range#notebook');a.equal(p.nextLabel,'记录一次同观测的测距检验');
 a.equal(p.role,'基础机制 · 离格单目标测距与同观测误差比较');
 a.ok(!Object.hasOwn(p,'case'));a.ok(!r.cases.some(c=>c.unit===u.id));
 a.ok(!r.knowledgeMap.nodes.some(n=>n.id===u.id));a.ok(!r.directions.some(d=>d.id===u.id));
 a.match(u.action,/同一复数观测与物理预算/);a.match(u.action,/全部重复试验/);a.match(u.action,/RMSE 与大误差/);
 const pre=['foundations.html#matched','foundations.html#ofdm','foundations.html#limits'];a.deepEqual(u.prerequisites,pre);a.deepEqual(p.prerequisites,pre);
 for(const href of [...pre,u.href,p.next])resolve(href);
});

test('every earlier unit, case, page, unrelated direction and legacy route is preserved',()=>{
 a.equal(hash(beforeReferenceUncertainty.units.filter(x=>x.id!==u.id)),'8fc37c5693efdcd718fa3824c7136f763857ba1d762d5904157261e63fb340a2');
 a.equal(hash(require('./helpers/waveform-live-preservation.cjs').withoutWaveformLiveRegistry(r).cases),'8bad502395d9fad13770b4afab9ed26575eca9545599f5c82abbe55ff6187362');
 a.equal(hash(beforeReferenceUncertainty.pages.filter(x=>x.path!==p.path)),'10ef3d09ee0bdfc391203f8911e3746999630f7dcfeb5448fb394875f1d3939b');
 // Normalize the exact new mechanism hooks first; retain the older reading-only scope normalization.
 const historicalDirections=structuredClone(beforeReferenceUncertainty.directions.filter(d=>d.id!=='receiver'));
 const waveforms=historicalDirections.find(d=>d.id==='waveforms');
 a.equal(waveforms.scope,'发射信号、调制坐标、导频歧义、训练序列复用与严格协方差波形优化；新增 OTFS 原文导读；完整 OTFS 收发机实验仍待实现。');
 waveforms.scope='发射信号、调制坐标、导频歧义、训练序列复用与严格协方差波形优化；OTFS 为后续专题。';
 a.equal(hash(historicalDirections),'3ee503aa4655bba2a42d975d611a5140bedfabe66e5d8c5c48c27b425197fb5d');
 a.equal(hash(r.legacy),'1fb9c986a8111d4c4b8a16f7762fb5f4c3c6c470c1f6bc95d2c3caf99dd6ffed');
});

test('only delay, estimation and resolution gain unit references; original concept entries and edges remain intact',()=>{
 const nodes=r.knowledgeMap.nodes.filter(n=>n.unitRefs.includes(u.id));a.deepEqual(nodes.map(n=>n.id),['delay','estimation','resolution']);
 for(const n of nodes)a.equal(n.unitRefs.filter(id=>id===u.id).length,1);
 const estimation=nodes.find(n=>n.id==='estimation'),resolution=nodes.find(n=>n.id==='resolution');
 a.equal(estimation.entryUnitRef,'shared');a.match(estimation.knownUnknown,/非线性测距/);a.match(estimation.knownUnknown,/每个距离候选拟合未知复增益/);a.match(estimation.knownUnknown,/真值只供生成与评价，不提供给估计器/);
 a.equal(estimation.boundary,'实标量 LS 等号不能直接搬到非线性距离或角度');a.equal(resolution.href,'foundations.html#limits');a.ok(!resolution.entryUnitRef);
 const preserved=withoutMapProgressions(r).knowledgeMap;
 for(const n of preserved.nodes)n.unitRefs=n.unitRefs.filter(id=>id!==u.id);
 preserved.nodes.find(n=>n.id==='estimation').knownUnknown='先固定样本比较未知参数的候选；深入实标量 LS 时，估计器接收 x、y，θ 只作评估真值';
 a.equal(hash(preserved),'ac34027eec50100720f9216c7304cc1b89a2949ed1798accef56c24cbb82afa1');
 const html=renderMap(r,researchGuides),body=template(html,'resolution');
 a.ok(body.indexOf('href="foundations.html#limits"')<body.indexOf(`href="${u.href}"`));a.ok(body.includes(`href="${u.href}">进入机制实验 →</a>`));
 a.doesNotMatch(body,/此概念尚无独立专项实验/);
 for(const id of ['delay','estimation','resolution','direction:receiver'])a.ok(template(html,id).includes(`href="${u.href}"`),id);
});

test('receiver gains five independent mechanism depths and two repeatable checks without fabricated paper evidence',()=>{
 const d=r.directions.find(d=>d.id==='receiver');a.equal(d.levels.length,6);a.deepEqual(d.primaryCaseIds,['case-perceptive-clutter']);
 a.equal(d.levels[0].items[0].href,'foundations.html#matched');
 const expected=[['intuition','experiment'],['model','model'],['experiment','experiment'],['limits','limits'],['reproduction','trials'],['reproduction','record']];
 const added=d.levels.flatMap(l=>l.items.filter(i=>i.href?.startsWith(p.path+'#')).map(i=>[l.id,i.href.split('#')[1]]));a.deepEqual(added,expected);
 for(const [level,anchor]of expected){
  const item=d.levels.find(l=>l.id===level).items.find(i=>i.href===p.path+'#'+anchor);a.equal(item.status,'available');a.equal(item.scope,'direction-specific');
  a.match(item.note,/独立离格单目标有限网格机制/);a.match(item.note,/不是连续优化、检测或论文复现/);resolve(item.href);
  if(level==='reproduction')a.equal(item.kind,'reproduction-plan');
 }
 a.equal(hash(require('./helpers/atomic-receiver-preservation.cjs').withoutAtomicReceiverRegistry(r).directions.find(x=>x.id===d.id).levels.find(l=>l.id==='papers')),'a6d7c5bdfa684a4e1fb64256a5c3ae432cbf3f1e01484ab4d1079f0776a21ce3');
 const preserved=structuredClone(beforeReferenceUncertainty.directions.find(x=>x.id===d.id));delete preserved.coverage;delete preserved.nextExtension;
 for(const l of preserved.levels)l.items=l.items.filter(i=>!i.href?.startsWith(p.path+'#'));
 a.equal(hash(preserved),'bc767b44c732476150458bb4f86ed74df350595d78be85e1f45c1b62285bcb11');
 a.equal(require('./helpers/atomic-receiver-preservation.cjs').withoutAtomicReceiverRegistry(r).directions.find(x=>x.id===d.id).coverage,'已有匹配、CFAR、实标量 LS/CRB、递归背景与离格单目标有限网格测距；连续优化、真实信道校准和多目标跟踪尚未实现。');
 for(const term of ['连续参数估计','模型失配','低 SNR','有限反例','普遍排序'])a.ok(d.nextExtension.includes(term),term);
});

test('canonical case-free entry and notebook projection need no invented source or relaxed query rule',()=>{
 const entries=createLearningEntryResolver(r);a.equal(entries.unitEntry(u),u.href);
 const topics=buildNotebookTopics(r),topic=topics.find(t=>t.id===u.id);a.equal(topics.length,r.units.length);
 a.deepEqual(topic,{id:u.id,title:u.title,question:u.question,action:u.action,teachingHref:u.href,experimentHref:u.href});
 a.ok(!Object.hasOwn(topic,'evidenceHref'));a.ok(!Object.hasOwn(topic,'boundaryHref'));a.equal(notebookHref(u.id),p.next);
 for(const href of ['offgrid-range.html?view=1#experiment','offgrid-range.html#missing-anchor','https://example.test/offgrid-range.html#experiment','../offgrid-range.html#experiment']){
  const invalid=structuredClone(r);invalid.units.find(x=>x.id===u.id).href=href;
  a.throws(()=>buildNotebookTopics(invalid),/entry|Entry/,href);
 }
});

test('generated page shell keeps the fixed notebook query and real prerequisites without source buttons',()=>{
 const page=read(p.path);
 for(const key of ['HEADER','CONTEXT','NEXT'])for(const side of ['START','END'])a.equal((page.match(new RegExp('<!-- SITE:'+key+':'+side+' -->','g'))||[]).length,1);
 const context=page.match(/<!-- SITE:CONTEXT:START -->([\s\S]*?)<!-- SITE:CONTEXT:END -->/)[1];
 const next=page.match(/<!-- SITE:NEXT:START -->([\s\S]*?)<!-- SITE:NEXT:END -->/)[1];
 a.ok(page.includes('href="experiments.html" aria-current="location"'));for(const href of p.prerequisites)a.ok(context.includes(`href="${href}"`),href);
 a.doesNotMatch(context,/原文与证据|边界与下一问|reading\.html#case-offgrid/);a.ok(next.includes(`href="${p.next}">${p.nextLabel} →</a>`));
 for(const anchor of ['experiment','model','trials','limits','record'])resolve(p.path+'#'+anchor);
});

test('generated portals expose the mechanism and accurate totals without adding research cases or bibliography cards',()=>{
 for(const file of ['index.html','experiments.html','reading.html'])a.ok(read(file).includes(`href="${u.href}"`),file);
 const home=read('index.html'),reading=read('reading.html');
 for(const [count,label]of [[r.units.length,'机制实验'],[32,'核心概念'],[8,'研究方向']])a.ok(home.includes(`<strong>${count}</strong> 个${label}`));
 a.ok(home.includes(`data-map-unit="${u.id}" href="${u.href}"`));a.match(reading,/16 个已有主题/);
 a.equal((reading.match(/class="influence-card"/g)||[]).length,9);a.match(reading,/深度交互已接入：8 \/ 9 篇/);a.doesNotMatch(reading,/id="case-offgrid-range"/);
 const practice=read('practice.html'),topics=JSON.parse(practice.match(/<script type="application\/json" id="notebook-topics">([\s\S]*?)<\/script>/)[1]);
 a.deepEqual(topics,buildNotebookTopics(r));a.ok(practice.includes('<option value="offgrid-range">离格目标与测距网格</option>'));
});

test('foundations bridge follows the original response lab and theory preserves the nonlinear LS caveat',()=>{
 const foundation=read('foundations.html'),limits=foundation.slice(foundation.indexOf('<section class="chapter" id="limits"'),foundation.indexOf('<section class="chapter" id="codesign"'));
 for(const id of ['res-b','res-pad','res-c','res-read'])a.ok(limits.includes(`id="${id}"`));
 a.ok(limits.indexOf('id="offgrid-range-bridge"')>limits.indexOf('id="res-read"'));a.ok(limits.indexOf('id="offgrid-range-bridge"')<limits.indexOf('<h3>CRB 到底界住了什么？</h3>'));
 a.match(limits,/刚才只看响应形状。下一步用同一份带噪观测实际估计一个离格目标，比较粗细网格的误差。/);a.ok(limits.includes(`href="${u.href}"`));a.match(limits,/sinc² 包络/);
 const theory=read('theory.html'),caveat=theory.indexOf('未知时延/角度、多径、干扰参数、先验或失配，都需要重新建模。'),bridge=theory.indexOf('id="offgrid-range-next"');
 a.ok(caveat>=0&&bridge>caveat);a.ok(theory.slice(bridge,bridge+350).includes(`href="${u.href}"`));a.match(theory,/这里的实标量 LS=CRB 等号不转移到该估计器/);
});

test('source bytes, citation snapshots, strict resolvers and learner notebook behavior remain unchanged',()=>{
 const expected={
  'site/research-directory.json':'95b0038bc1e110bd64efba999015f85eeeea2f63dceaea30cedc79fd1059f1b9',
  'site/content-reading.html':'600364787f83622748bbba70a4fc2fdb69e55f5c14a18acc962e5acdf65934b9',
  'docs/READING-MAP.md':'d5140f2a9fe408e2342ee3c44ad93ded2cd79a09dcce94f22fa8c21307a0932d',
  'scripts/learning-entry.cjs':'f7c2fcdeb49f2759f7de3537bfcdddfd3bb9a60abf4c58f27e31e6194b66d287',
  'scripts/notebook-topics.cjs':'d542ae472a8ce50c3b1b8f7b4ee919f7dce1463777f7e27fe138c04269b29477',
  'notebook.js':'ea8698c44028c67c1cd9cd49a7d975a584d5f529f0768b272da2b457e507d4e9'
 };
 for(const [file,digest]of Object.entries(expected))a.equal(hash(withoutBuildLinkValidation(file,file==='site/research-directory.json'?require('./helpers/waveform-live-preservation.cjs').priorCatalogSource(JSON.parse(read(file))):file==='docs/READING-MAP.md'?require('./helpers/otfs-receiver-preservation.cjs').withoutOtfsReadingMap(read(file)):read(file))),digest,file);
 // Later reading-only features add these exact hooks. Preserve
 // the byte-level guard for all other generator behavior rather than silently
 // rebasing its original fingerprint or weakening scientific/notebook checks.
 let generator=withoutReferencePrerequisite(withoutMapProgressionGenerator(withoutBuildLinkValidation('scripts/generate-site.cjs',read('scripts/generate-site.cjs'))));
 for(const hook of [
  "const {renderComparisonGroups}=require(path.join(__dirname,'paper-comparison-groups.cjs'));\n",
  "const {buildResearchGuides,renderResearchGuides,renderGuideDirectionLink}=require(path.join(__dirname,'research-guides.cjs'));\n",
  'const researchGuides=buildResearchGuides(JSON.parse(read(registry.researchGuidesFile)),registry);\n',
  '${renderGuideDirectionLink(researchGuides,d.id)}',
  '${researchGuides.length?`<a href="#research-guides">${researchGuides.length} 篇问题式导读</a>`:\'\'}',
  'reading+=renderResearchGuides(researchGuides);\n',
  '<link rel="stylesheet" href="research-guides.css?v=research-guides-v3">',
  '<script defer src="research-guides.js?v=research-guides-v1"></script>',

  '${registry.paperComparisonGroups?.length?\'<a href="#paper-comparisons">同方向论文对读</a>\':\'\'}',
  'reading+=renderComparisonGroups(registry);\n',
  '<link rel="stylesheet" href="paper-comparison.css?v=paper-comparison-v1">',
  '<script defer src="paper-comparison.js?v=paper-comparison-v1"></script>'
 ]){a.equal(generator.split(hook).length,2,'exactly one reading-only hook');generator=generator.replace(hook,'');}
 a.equal(hash(generator),'97793677fbea4ead386121de1f6e62dfac9ec1a01cdad88576bf3de0281c5cb9','generator outside reading-only hooks');
 // A mutation outside those hooks must still trip the preserved-byte guard.
 const unrelated=generator.replace('const notebookTopics=buildNotebookTopics(registry);','const notebookTopics=[];');
 a.notEqual(unrelated,generator);
 a.throws(()=>a.equal(hash(unrelated),'97793677fbea4ead386121de1f6e62dfac9ec1a01cdad88576bf3de0281c5cb9'),{code:'ERR_ASSERTION'});
 const directory=JSON.parse(read(r.researchDirectoryFile));a.equal(directory.cards.length,9);a.equal(directory.cards.filter(c=>c.caseId).length,8);a.deepEqual(directory.cards.filter(c=>!c.caseId).map(c=>c.id),['deepsense']);
});
