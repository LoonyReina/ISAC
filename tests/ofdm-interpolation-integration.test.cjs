'use strict';
// Registry, source and static navigation contracts; no browser or hardware claim.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const r=JSON.parse(read('site/registry.json')),data=JSON.parse(read(r.researchDirectoryFile));
const c=r.cases.find(c=>c.id==='case-ofdm-interpolation'),u=r.units.find(u=>u.id==='ofdm-interpolation'),p=r.pages.find(p=>p.path==='ofdm-interpolation.html');
function resolve(href){const [file,hash]=href.split('#');a.ok(fs.existsSync(path.join(root,file)),href);if(hash)a.ok(read(file).includes(`id="${hash}"`),href);}
const article=(html,id)=>{const result=html.match(new RegExp(`<article[^>]* id="${id}"[^>]*>[\\s\\S]*?<\\/article>`));a.ok(result,id);return result[0];};

test('OFDM interpolation has one canonical case, unit and page in the existing prototype direction',()=>{
 a.equal(r.cases.filter(k=>k.id===c.id).length,1);a.equal(r.units.filter(k=>k.id===u.id).length,1);a.equal(r.pages.filter(k=>k.path===p.path).length,1);
 a.equal(c.unit,u.id);a.equal(p.case,c.id);a.equal(p.stage,'experiments');a.equal(u.primaryDirectionId,'prototype');
 a.equal(u.href,'ofdm-interpolation.html#experiment');a.equal(c.learningEntry,'ofdm-interpolation.html#mechanism');
 a.equal(c.paper,'ofdm-interpolation.html#paper');a.equal(c.next,'ofdm-interpolation.html#limits');
 a.equal(r.units.length,21);a.equal(r.cases.length,10);a.equal(r.directions.length,8);a.equal(r.knowledgeMap.nodes.length,31);
 for(const href of [u.href,c.learningEntry,c.paper,c.next,p.next])resolve(href);
});

test('OFDM prerequisites and shared navigation retain a usable first learning entry',()=>{
 const expected=['foundations.html#iq','foundations.html#ofdm-basics','foundations.html#ofdm','foundations.html#doppler'];
 a.deepEqual(u.prerequisites,expected);a.deepEqual(p.prerequisites,expected);
 const html=read(p.path);
 for(const href of expected){resolve(href);a.ok(c.fields['先修'].includes(`href="${href}"`));a.ok(html.includes(`href="${href}"`));}
 for(const href of [u.href,c.paper,c.next,'practice.html#notebook'])a.ok(html.includes(`href="${href}"`),href);
 for(const key of ['HEADER','CONTEXT','NEXT'])a.equal((html.match(new RegExp(`<!-- SITE:${key}:START -->`,'g'))||[]).length,1);
 a.ok(html.includes('href="experiments.html" aria-current="location"'));
 for(const file of ['index.html','experiments.html','reading.html'])a.ok(read(file).includes(`href="${u.href}"`),file);
 a.ok(read('index.html').includes(`href="${c.learningEntry}"`));
});

test('all six prototype depth layers gain actual sections while keeping their beginner route and unimplemented hardware work',()=>{
 const d=r.directions.find(d=>d.id==='prototype');a.deepEqual(d.primaryCaseIds,[c.id]);
 a.equal(d.levels.find(l=>l.id==='intuition').items[0].href,'foundations.html#realworld');
 for(const [level,anchor]of [['intuition','mechanism'],['model','model'],['experiment','experiment'],['papers','paper'],['limits','limits'],['reproduction','reproduce']]){
  const items=d.levels.find(l=>l.id===level).items.filter(i=>i.href===`ofdm-interpolation.html#${anchor}`);
  a.equal(items.length,1);a.equal(items[0].status,'available');a.equal(items[0].scope,'direction-specific');resolve(items[0].href);
 }
 a.match(d.coverage,/OFDM 时间插值专项机制/);a.match(d.coverage,/硬件复现尚未实现/);
 const pending=d.levels.find(l=>l.id==='experiment').items.filter(i=>i.status==='proposed');a.equal(pending.length,1);a.ok(!pending[0].href);a.match(pending[0].label,/处理时限/);
});

test('all 31 beginner routes are preserved and only relevant existing concepts gain the deep mechanism',()=>{
 const expected=[['messages','shared'],['iq','iq'],['ofdm-basics',null,'foundations.html#ofdm-basics'],['communication-rate','rate'],['echo','echo'],['matched','matched'],['geometry','geometry'],['shared-model','shared'],['sampling','ofdm'],['phase','doppler'],['known-pilots','pilot'],['delay','ofdm'],['doppler','doppler'],['angle','array'],['detection','cfar'],['estimation','shared'],['association',null,'reading.html#direction-networks'],['task-learning',null,'reading.html#direction-learning'],['resolution',null,'foundations.html#limits'],['ambiguity','pilot'],['fisher-crb','crb'],['budget',null,'foundations.html#codesign'],['waveform-design','pilot'],['beam-design','array'],['mutual-assistance',null,'theory.html#evolution'],['resource-design','sbfd'],['joint-objectives','rate'],['channels',null,'foundations.html#realworld'],['synchronization','clock'],['near-field','near-field'],['implementation',null,'reading.html#direction-prototype']];
 a.deepEqual(r.knowledgeMap.nodes.map(n=>[n.id,n.entryUnitRef??null,n.href??null]),expected.map(([id,entry,href])=>[id,entry,href??null]));
 a.deepEqual(r.knowledgeMap.nodes.filter(n=>n.unitRefs.includes(u.id)).map(n=>n.id),['sampling','known-pilots','delay','doppler']);
 for(const n of r.knowledgeMap.nodes)a.ok(n.unitRefs.filter(id=>id===u.id).length<=1);
 a.deepEqual(r.knowledgeMap.nodes.find(n=>n.id==='waveform-design').unitRefs,['pilot','waveform-design','golay-radar']);
});

test('the original OFDM influence metadata is unchanged while its existing card becomes the fifth available paper',()=>{
 const card=data.cards.find(k=>k.id==='ofdm_full_duplex'),preserved={...card};delete preserved.readingPlan;delete preserved.caseId;
 // Lock every pre-existing identity, influence, timestamp, source, endorsement and boundary field.
 a.equal(crypto.createHash('sha256').update(JSON.stringify(preserved)).digest('hex'),'61cb7ecd942fce2733d411adaea2a434b64ffcd40d0223cf1292fb71d504ce80');
 a.equal(card.caseId,c.id);a.equal(card.groupId,'signals-networks');a.equal(data.cards.length,9);a.equal(new Set(data.cards.map(k=>k.doi)).size,9);
 a.equal(data.cards.filter(k=>k.caseId).length,5);a.equal(data.cards.filter(k=>!k.caseId).length,4);
 a.equal(card.metrics.snapshotDate,'2026-10-10');a.deepEqual([card.metrics.openAlex.count,card.metrics.semanticScholar.count,card.metrics.completedYear.count],[368,368,76]);
 a.doesNotMatch(card.readingPlan,/尚未实现|准备中/);
});

test('the fifth rendered paper follows canonical availability and keeps four genuinely pending entries',()=>{
 const html=read('reading.html'),card=article(html,'paper-ofdm_full_duplex');
 a.ok(card.includes(`href="${u.href}"`));a.match(card,/独立机制模型，非完整论文复现/);a.doesNotMatch(card,/教学案例准备中|深度交互尚未实现|本站交互尚未实现/);
 a.match(html,/深度交互已接入：5 \/ 9 篇/);a.equal((html.match(/class="influence-card"/g)||[]).length,9);
 for(const pending of data.cards.filter(k=>!k.caseId)){const h=article(html,'paper-'+pending.id);a.match(h,/深度交互尚未实现/);a.ok(!/href="(?!https:)/.test(h));}
});

test('fixed author-version evidence bounds temporal interpolation separately from simulations and RF measurements',()=>{
 const paper=c.paperComparison,metadata=JSON.stringify(c);
 a.equal(paper.sourceId,'ofdm_full_duplex');a.equal(paper.sourceUrl,'https://arxiv.org/abs/1908.03418v1');a.equal(paper.comparisonStatus,'partial');
 for(const text of ['1908.03418v1','2019-08-09','10.1109/TMTT.2019.2930510','13 页作者稿'])a.ok(paper.version.includes(text),text);
 for(const text of ['第 3 页 §II-B 式(4)','固定子载波','沿时间','图2/Table I','图3是自干扰仿真','图6–9才是射频测量'])a.ok(paper.locator.summary.includes(text),text);
 for(const text of ['不增加独立观测','未知','空格不等于测得信道为零','噪声相关','不是完整论文、LTE/NR 波形或硬件复现','永久空子载波','不做边界外推','补值周期图不等于原观测似然','972 次观测','84 个计算补值','不进入补值权重','不声明 LTE/NR 兼容'])a.ok(metadata.includes(text),text);
 a.match(paper.resourceBudget.summary,/相同实际观测/);a.match(paper.resourceBudget.summary,/改变 G 会改变实际观测数与总能量/);
 a.ok(paper.verificationNote.includes('fe694b1caabd7f2f79ca9e0e06e674ba1a48d60e598b514fcd7a248c5ca05af3'));
});

test('the source reading is an original-version guide rather than another influence card or hardware claim',()=>{
 const source=article(read('site/content-reading.html'),'ref-OFDM');
 for(const text of ['https://arxiv.org/abs/1908.03418v1','https://doi.org/10.1109/TMTT.2019.2930510','2019-08-09','第 3 页','式(4)','沿时间','并非沿频率','不实现 LTE/NR 帧','噪声相关','图6–9才是射频测量'])a.ok(source.includes(text),text);
 a.ok(source.includes(`href="${c.learningEntry}"`));a.ok(source.includes(`href="${u.href}"`));
 a.equal(article(read('reading.html'),'ref-OFDM'),source);a.doesNotMatch(source,/class="influence-card"|<button|<input|<canvas/);
 const doc=read('docs/READING-MAP.md');for(const [,url]of source.matchAll(/href="(https:[^"]+)"/g))a.ok(doc.includes(url),`undocumented ${url}`);
});
