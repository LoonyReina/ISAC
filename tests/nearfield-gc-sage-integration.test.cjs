'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const readForHistory=file=>require('./helpers/channel-mapping-preservation.cjs').readCurrentForHistory(file,fs.readFileSync(path.join(root,file)),{root}).toString('utf8');
const {additions,withoutGCSAGERegistry,withoutGCSAGEGuide,withoutGCSAGEHomeShell}=require('./helpers/gc-sage-preservation.cjs');
const {buildResearchGuides,renderResearchGuides}=require('../scripts/research-guides.cjs');
const {buildNotebookTopics}=require('../scripts/notebook-topics.cjs');
const {createLearningEntryResolver}=require('../scripts/learning-entry.cjs');
const r=JSON.parse(read('site/registry.json')),data=JSON.parse(read(r.researchGuidesFile)),page=read(additions.page.path);
const card=d=>d.cards.find(c=>c.id===additions.guideId),unit=x=>x.units.find(u=>u.id===additions.unit.id);
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');

test('one actual inverse-problem lesson uses canonical sources without creating a paper case or graph edge',()=>{
 const historyR=JSON.parse(readForHistory('site/registry.json'));
 const before=JSON.stringify(r),sourceBefore=JSON.stringify(data);
 a.deepEqual(unit(r),additions.unit);a.deepEqual(require('./helpers/two-section-navigation-preservation.cjs').withoutRegistry(historyR).pages.find(p=>p.path===additions.page.path),additions.page);
 a.equal(r.units.filter(u=>u.id===additions.unit.id).length,1);
 a.ok(!r.cases.some(c=>c.unit===additions.unit.id));a.ok(!r.knowledgeMap.nodes.some(n=>n.unitRefs.includes(additions.unit.id)));
 a.ok(!r.knowledgeMap.progressions.some(p=>p.unitId===additions.unit.id));
 const local=createLearningEntryResolver(r);a.equal(local.unitEntry(unit(r)),additions.unit.href);
 for(const hook of additions.hooks){a.deepEqual(require('./helpers/nearfield-research-preservation.cjs').withoutNearfieldRegistry(historyR).directions.find(d=>d.id===hook.directionId).levels.find(l=>l.id===hook.levelId).items.at(-1),hook.item);a.equal(local.unitEntry({href:hook.item.href}),hook.item.href);}
 const topic=buildNotebookTopics(r).find(t=>t.id===additions.unit.id);a.equal(topic.teachingHref,additions.unit.href);a.ok(!Object.hasOwn(topic,'evidenceHref'));
 for(const p of ['index.html','experiments.html','reading.html'])a.ok(read(p).includes(additions.unit.href),p);
 a.ok(read('practice.html').includes('"id":"nearfield-gc-sage"'));
 const nav=page.match(/<nav class="site-topic-nav" aria-label="本主题学习路线">[^]*?<\/nav>/g);a.equal(nav.length,1);a.ok(page.indexOf(nav[0])>page.indexOf('<!-- SITE:CONTEXT:END -->'));
 for(const id of ['question','model','experiment','paper','limits','reproduce'])a.ok(nav[0].includes('href="#'+id+'"'),'generated lesson navigation retains '+id);
 buildResearchGuides(data,r);a.equal(JSON.stringify(r),before);a.equal(JSON.stringify(data),sourceBefore);
});

test('the existing fixed-v1 guide exposes the bounded estimator as its one primary executable route',()=>{
 a.deepEqual(card(data).executable,additions.executable);a.equal(card(data).limits[5],additions.statusAfter);
 a.equal(card(data).source.url,'https://arxiv.org/pdf/2605.01162v1');a.match(card(data).source.publicationStatus,/未核实接收/);
 const html=renderResearchGuides(buildResearchGuides(data,r));const selected=html.split('id="guide-'+additions.guideId+'"')[1].split('</article>')[0];
 a.equal((selected.match(/class="guide-executable-link"/g)||[]).length,1);
 a.ok(selected.indexOf('guide-executable-link')<selected.indexOf('<details'));
 a.match(selected,/二维、单次交互、已知 L=2/);a.match(selected,/没有未知路径数选择/);a.match(selected,/原文图5–9/);
 a.match(page,/不是完整 GC-SAGE/);a.match(page,/每个建模通道/);a.match(page,/左端固定|左端锚定|左端/);
 a.match(page,/不是论文图 9 的路径数横轴/);a.match(page,/参考接收位置/);
});

test('exact registry inverse retains all old fields and rejects missing, moved or changed additions',()=>{
 const r=JSON.parse(readForHistory('site/registry.json'));
 const before=JSON.stringify(r),prior=withoutGCSAGERegistry(r);a.equal(JSON.stringify(r),before);
 const beforeGC=require('./helpers/atomic-receiver-preservation.cjs').withoutAtomicReceiverRegistry(r),beforeCoverage=require('./helpers/combined-paper-solvers-preservation.cjs').withoutCombinedRegistry(beforeGC);a.deepEqual(prior.units,beforeCoverage.units.slice(0,-1));a.deepEqual(prior.pages,beforeCoverage.pages.slice(0,-1));
 for(const key of Object.keys(r).filter(k=>!['units','pages','directions'].includes(k)))a.deepEqual(prior[key],require('./helpers/waveform-live-preservation.cjs').withoutWaveformLiveRegistry(beforeGC)[key]);
 for(const change of [x=>x.units.splice(-2,1),x=>x.pages.splice(-2,1),x=>x.units.push({...additions.unit}),x=>{unit(x).action+=' changed';},x=>x.units.unshift(x.units.splice(-2,1)[0]),x=>{x.pages.at(-2).role+=' changed';},x=>{x.directions.find(d=>d.id==='spatial').levels[0].items.at(-1).note+=' changed';}]){const x=structuredClone(r);change(x);a.throws(()=>withoutGCSAGERegistry(x));}
 const changed=require('./helpers/recovery-published-baseline-projection.cjs').projectJSON('content/data/registry.json',r);changed.units[0].question+=' unrelated';a.equal(withoutGCSAGERegistry(changed).units[0].question,changed.units[0].question,'unrelated changes are not hidden');
});

test('exact guide inverse removes only one executable, factual coverage sentence and exact gain-aware question',()=>{
 const data=JSON.parse(readForHistory(r.researchGuidesFile));
 const before=JSON.stringify(data),prior=withoutGCSAGEGuide(data);a.equal(JSON.stringify(data),before);
 for(const c of require('./helpers/atomic-receiver-preservation.cjs').withoutAtomicReceiverGuide(require('./helpers/otfs-receiver-preservation.cjs').withoutOtfsGuides(data)).cards){if(c.id!==additions.guideId)a.deepEqual(prior.cards.find(x=>x.id===c.id),c);}
 const expected=structuredClone(card(data));delete expected.executable;expected.limits[5]=additions.statusBefore;expected.question=additions.questionBefore;a.deepEqual(card(prior),expected);
 for(const change of [d=>delete card(d).executable,d=>{card(d).executable.coverage='algorithm-and-selected-figure';},d=>{card(d).executable.href='near-field.html#experiment';},d=>{card(d).limits[5]+=' complete';},d=>{card(d).question+=' changed';},d=>d.cards.push(structuredClone(card(d)))]){const d=structuredClone(data);change(d);a.throws(()=>withoutGCSAGEGuide(d));}
 const changed=structuredClone(data);card(changed).mechanism+=' unrelated';a.equal(card(withoutGCSAGEGuide(changed)).mechanism,card(changed).mechanism);
});

test('historical homepage count adapter removes exactly one registered lesson after map reversal',()=>{
 const count=r.units.length,html=`before<strong>${count}</strong> 个机制实验after`,prior=withoutGCSAGEHomeShell(html,count);
 a.equal(prior,`before<strong>${count-1}</strong> 个机制实验after`);
 a.throws(()=>withoutGCSAGEHomeShell(html+html,count));a.throws(()=>withoutGCSAGEHomeShell('missing',count));
});

test('the runtime boundary is independently audited numerical bytes with no cached fixture dependency',()=>{
 a.equal(hash(read('nearfield-gc-sage-core.js')),'fe96407e6a09c71aa141d75fecaf26d23e15bbc1514f30ed121262dbdfc3ceda');
 a.equal(hash(read('nearfield-gc-sage-observations.js')),'598f7eeb3c7a02a6a3b95c198a9c48d9b88f6f276eab422a6fb8d406600b496d');
 const worker=read('nearfield-gc-sage-worker.js');a.doesNotMatch(worker,/GCSAGEObservations|evaluation_only|fixtures\/|default-expected|fetch\(/);
 a.match(worker,/nearfield-gc-sage-core\.js/);a.match(worker,/initialize/);a.match(worker,/fit/);
 for(const p of ['scripts/validation/nearfield-gc-sage/port/INDEPENDENT-AUDIT.md','scripts/validation/nearfield-gc-sage/port/HISTORY-INDEPENDENT-AUDIT.md','scripts/validation/nearfield-gc-sage/observations/VERIFICATION.md'])a.ok(page.includes(p)&&fs.existsSync(path.join(root,p)));
});


test('the mapping guide identifies a geometry difference while both estimators retain per-channel gains',()=>{
 a.equal(card(data).question,additions.questionAfter);a.match(card(data).question,/不同阵元具有不同复增益/);a.doesNotMatch(card(data).question,/全阵列可见/);
 const html=renderResearchGuides(buildResearchGuides(data,r)),selected=html.split('id="guide-'+additions.guideId+'"')[1].split('</article>')[0];a.ok(selected.includes(additions.questionAfter));
 a.match(page,/两种方法都|两种|两方法/);a.match(card(data).executable.summary,/均拟合逐通道复增益/);
});
