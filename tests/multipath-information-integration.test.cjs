'use strict';
// Current production model assertions; prior route inventory uses the exact rate-addition inverse below.
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),sourceLayout=fs.existsSync(path.join(root,'content/pages/multipath-channel.html'));
const read=f=>fs.readFileSync(path.join(root,sourceLayout?f:f.replace('content/data/','site/').replace('content/pages/','').replace('scripts/site/','scripts/')),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const data=()=>['content/data/registry.json','content/data/research-guides.json','content/data/research-directory.json','docs/PAPER-EXECUTION-BACKLOG.json'].map(f=>JSON.parse(read(f)));
const B=require(sourceLayout?'../scripts/site/research-tree.cjs':'../scripts/research-tree.cjs');
test('same multipath paper gains bounded information primary route while all78 prior routes remain',()=>{
 const [r,g,d,b]=data(),tree=B.buildResearchTree(r,g,d,b),paper=tree.papers.find(p=>p.id==='supplement-case-multipath-channel'),delta=JSON.parse(read('tests/helpers/multipath-information-integration-delta.json'));
 a.equal(tree.papers.length,35);a.equal(tree.papers.filter(p=>p.status==='bounded-core').length,21);a.equal(paper.status,'bounded-core');a.equal(paper.tutorials[0].href,'multipath-channel.html#position-information');a.equal(paper.tutorials[0].kind,'algorithm');a.match(paper.tutorials[0].label,/有界信息模型/);
 const currentRoutes=tree.papers.flatMap(p=>p.tutorials.map(t=>({id:p.id,href:t.href,kind:t.kind})));a.equal(currentRoutes.length,82);const routes=require('./helpers/cooperative-rate-preservation.cjs').withoutTutorials(currentRoutes);a.equal(routes.length,80);a.equal(delta.tutorialChanges.preserved.length,78);for(const prior of delta.tutorialChanges.preserved)a.ok(routes.some(r=>JSON.stringify(r)===JSON.stringify(prior)),prior.href);
 a.deepEqual(routes.filter(r=>!delta.tutorialChanges.preserved.some(p=>JSON.stringify(p)===JSON.stringify(r))),[{id:paper.id,href:'multipath-channel.html#position-information',kind:'algorithm'},{id:paper.id,href:'multipath-channel.html#question',kind:'prerequisite'}]);
 const c=r.cases.find(c=>c.id==='case-multipath-channel'),u=r.units.find(u=>u.id==='multipath-channel');a.equal(c.learningEntry,'multipath-channel.html#question');a.equal(u.href,'multipath-channel.html#experiment');a.equal(c.paper,'multipath-channel.html#position-information');a.ok(r.lessonPlacement.some(p=>p.canonicalHref===c.paper&&p.section==='reading'));
 if(!sourceLayout){const L=require('../scripts/learning-entry.cjs').createLearningEntryResolver(r);a.equal(L.caseEntry(c),c.learningEntry);a.equal(L.unitEntry(u),c.learningEntry);}
});
test('fixed PDF provenance augments rather than replaces prior HTML and bounded-model disclosures remain explicit',()=>{
 const [r,,,b]=data(),row=b.papers.find(p=>p.id==='supplement-case-multipath-channel'),source=row.source.details.boundedInformationSource;
 a.equal(source.url,'https://arxiv.org/pdf/1409.1467v2');a.equal(source.sha256,'9fbf11a7043424d15bbcc030532ac196e29b3a9ea1c5a738fc59b497c734195f');a.match(source.locators,/\(28\)\/\(29\)/);a.match(source.locators,/\(36\)\/\(37\)/);a.equal(row.source.url,'https://arxiv.org/html/1409.1467v2');
 a.equal(row.stages.fullPaper,'not-reproduced');a.equal(row.stages.latency,'not-measured');a.equal(row.implementation.details.browserAccepted,false);a.equal(row.implementation.details.lessonKind,'information-bound');a.equal(row.implementation.details.coreRuntimeBundleSha256,'9d2ca2b6c82e894f5425d1a415833ac0a207d8042611e5a421d19f013936d942');a.equal(row.realtime.measuredLatencyMs,null);
 const page=read('content/pages/multipath-channel.html');for(const text of ['position-information','未知复增益','0.25','193','不是','HTML 的 EFIM 编号是 (36)/(37)'])a.ok(page.includes(text),text);a.ok(page.includes('id="question"'));a.ok(page.includes('id="source"'));a.ok(page.includes('id="mc-height"'));a.ok(page.includes('id="ra-'));
 const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);a.equal(ids.length,new Set(ids).size);
});
