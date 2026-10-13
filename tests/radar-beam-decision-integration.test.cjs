const {withoutGCSAGERegistry}=require('./helpers/gc-sage-preservation.cjs');
'use strict';
// Source/registry and static navigation contracts; these do not certify browser or RF performance.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const r=JSON.parse(read('site/registry.json')),data=JSON.parse(read(r.researchDirectoryFile));
const c=r.cases.find(c=>c.id==='case-radar-beam-decision'),u=r.units.find(u=>u.id==='radar-beam-decision'),p=r.pages.find(p=>p.path==='radar-beam-decision.html');
const source=JSON.parse(read('data/radar-beam-decision-sources.json'));
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function resolve(href){const [file,anchor]=href.split('#');a.ok(fs.existsSync(path.join(root,file)),href);if(anchor)a.ok(read(file).includes(`id="${anchor}"`),href);}
function article(html,id){const m=html.match(new RegExp(`<article[^>]* id="${id}"[^>]*>[\\s\\S]*?<\\/article>`));a.ok(m,id);return m[0];}

test('radar registry owns one independent sensing-assisted communication case with six learning layers',()=>{
 a.ok(c&&u&&p);a.equal(c.title,'猜中最优波束，与保住通信增益是一回事吗？');
 a.equal(r.cases.filter(x=>x.id===c.id).length,1);a.equal(r.units.filter(x=>x.id===u.id).length,1);a.equal(r.pages.filter(x=>x.path===p.path).length,1);
 a.equal(c.unit,u.id);a.equal(p.case,c.id);a.equal(p.stage,'experiments');a.equal(u.primaryDirectionId,'learning');
 a.equal(c.learningEntry,'radar-beam-decision.html#mechanism');a.equal(u.href,'radar-beam-decision.html#experiment');a.equal(c.paper,'radar-beam-decision.html#paper');a.equal(c.next,'radar-beam-decision.html#limits');a.equal(p.next,'practice.html#notebook');
 a.equal(withoutGCSAGERegistry(r).units.length,28);a.equal(require('./helpers/otfs-receiver-preservation.cjs').withoutOtfsRegistry(r).cases.length,15);a.equal(r.directions.length,8);a.equal(r.knowledgeMap.nodes.length,32);
 const d=r.directions.find(d=>d.id==='learning');a.deepEqual(d.primaryCaseIds,[c.id]);a.match(d.title,/感知辅助通信/);a.match(d.scope,/感知辅助通信/);
 a.equal(d.levels.find(l=>l.id==='intuition').items[0].href,'reading.html#branches');
 for(const [level,anchor]of [['intuition','mechanism'],['model','model'],['experiment','experiment'],['papers','paper'],['limits','limits'],['reproduction','reproduce']]){
  const items=d.levels.find(l=>l.id===level).items.filter(i=>i.href===`radar-beam-decision.html#${anchor}`);
  a.equal(items.length,1);a.equal(items[0].scope,'direction-specific');a.equal(items[0].status,'available');
 }
 const experiment=d.levels.find(l=>l.id==='experiment');a.equal(experiment.coverage,'direction-specific');
 const pending=experiment.items.filter(i=>i.status==='proposed');a.equal(pending.length,1);a.ok(!pending[0].href);a.match(pending[0].label,/真实数据/);
 a.match(d.coverage,/真实数据、CNN 和在线闭环复现尚未实现/);a.doesNotMatch(experiment.notice,/专属深度交互模块待建设/);
});

test('radar registry preserves every existing concept beginner route and adds only three relevant deep references',()=>{
 const expected=[['messages','shared',null],['iq','iq',null],['ofdm-basics',null,'foundations.html#ofdm-basics'],['communication-rate','rate',null],['echo','echo',null],['matched','matched',null],['geometry','geometry',null],['shared-model','shared',null],['sampling','ofdm',null],['phase','doppler',null],['known-pilots','pilot',null],['delay','ofdm',null],['doppler','doppler',null],['angle','array',null],['detection','cfar',null],['estimation','shared',null],['association',null,'reading.html#direction-networks'],['task-learning',null,'reading.html#direction-learning'],['resolution',null,'foundations.html#limits'],['ambiguity','pilot',null],['fisher-crb','crb',null],['budget',null,'foundations.html#codesign'],['waveform-design','pilot',null],['beam-design','array',null],['mutual-assistance',null,'theory.html#evolution'],['resource-design','sbfd',null],['joint-objectives','rate',null],['channels',null,'foundations.html#realworld'],['synchronization','clock',null],['near-field','near-field',null],['implementation',null,'reading.html#direction-prototype']];
 a.deepEqual(r.knowledgeMap.nodes.filter(n=>n.id!=='background-subtraction').map(n=>[n.id,n.entryUnitRef??null,n.href??null]),expected);
 a.deepEqual(r.knowledgeMap.nodes.filter(n=>n.unitRefs.includes(u.id)).map(n=>n.id),['task-learning','beam-design','mutual-assistance']);
 for(const n of r.knowledgeMap.nodes)a.ok(n.unitRefs.filter(id=>id===u.id).length<=1);
 a.doesNotMatch(r.knowledgeMap.nodes.find(n=>n.id==='mutual-assistance').boundary,/尚无感知辅助波束选择/);
});

test('radar directory changes only its existing caseId and readingPlan while all nine paper records stay preserved',()=>{
 const preserved=require('./helpers/waveform-live-preservation.cjs').withoutWaveformLiveCatalog(data),card=preserved.cards.find(c=>c.id==='radar_prediction');delete card.caseId;delete card.readingPlan;
 // Normalize only the later authorized mu_mimo activation before checking this earlier complete-directory snapshot.
 const shared=preserved.cards.find(c=>c.id==='mu_mimo');shared.caseId=null;shared.readingPlan='计划深读：同一阵列预算下的分离与共享；本站交互尚未实现。';
 // Locks every unrelated card, all metadata, snapshots, links, timestamps, endorsements and socialDiscussion.
 a.equal(hash(preserved),'eb6167bcfa54f017705fb7371a9ab585be116f2fad7d09d3cc7f3fd9f2027fb7');
 const radar=data.cards.find(c=>c.id==='radar_prediction'),deep=data.cards.find(c=>c.id==='deepsense');
 a.equal(radar.caseId,c.id);a.equal(radar.groupId,'data-learning');a.match(radar.readingPlan,/独立合成机制/);a.match(radar.readingPlan,/未使用 DeepSense 测量、训练论文 CNN/);
 a.equal(data.cards.length,9);a.equal(new Set(data.cards.map(c=>c.doi)).size,9);a.equal(data.cards.filter(c=>c.caseId).length,8);a.equal(data.cards.filter(c=>!c.caseId).length,1);
 a.equal(deep.caseId,null);a.equal(hash(deep),'9a14492c0b9bd213f26096975627bb6c7c6382335995b89bb4e7a492c87b2ffb');
 a.equal(radar.metrics.snapshotDate,'2026-10-10');a.deepEqual([radar.metrics.openAlex.count,radar.metrics.semanticScholar.count],[141,161]);
 a.deepEqual([deep.metrics.openAlex.count,deep.metrics.semanticScholar.count],[289,377]);a.equal(radar.socialDiscussion.status,'unavailable');
});

test('radar source manifest separates six-page accepted manuscript from the older nine-page arXiv split',()=>{
 const primary=source.primary_edition,old=source.other_editions_and_resources.find(s=>s.id==='radar-arxiv-v1');
 a.equal(source.bibliography_id,'radar_prediction');a.equal(source.doi,'10.1109/WCNC51071.2022.9771564');
 a.equal(primary.pdf_url,'https://par.nsf.gov/servlets/purl/10404321');a.equal(primary.pdf_pages,6);a.equal(primary.sample_count,6319);
 a.equal(primary.pdf_sha256,'34cc5b1602b185bdcf256848ee88b26f778a4fa1ee9f49a63fcfd0d9fca61d21');
 a.equal(primary.split_sentence_pdf_page,5);a.deepEqual(primary.split_fractions,{train:.7,validation:.2,test:.1});
 a.equal(old.version,'arXiv:2111.09676v1');a.equal(old.date,'2021-11-18');a.equal(old.pdf_pages,9);a.deepEqual(old.split_fractions,{train:.7,test:.3});a.equal(old.locators.find(l=>l.locator==='§V-B').page,6);
 for(const locator of ['§II Eqs.(4)–(6)','§III','Table II','Fig.3','§IV-A','§IV-B','§IV-B split sentence','§V Figs.5–7'])a.ok(primary.locators.some(l=>l.locator===locator),locator);
 a.equal(source.real_data_status.downloaded_measurements,false);a.equal(source.real_data_status.verified_redistributable_subset,false);a.equal(source.real_data_status.current_documented_scenario9_count,5964);
 const code=source.other_editions_and_resources.find(s=>s.id==='author-code');a.equal(code.commit,'8a23f440b65fdc090b8161e4bfe4c1e0310ca67a');a.match(code.execution,/never executed or imported/);
 a.equal(source.other_editions_and_resources.find(s=>s.id==='deepsense-v2').version,'arXiv:2211.09769v2');
});

test('radar source and comparison bound predictors, numerical metrics, splits and ideal probe budget',()=>{
 const pc=c.paperComparison,m=source.teaching_model,metadata=JSON.stringify(pc);
 a.equal(pc.comparisonStatus,'partial');a.equal(pc.sourceId,'radar_prediction');a.equal(pc.sourceUrl,source.primary_edition.pdf_url);
 a.equal(m.array_elements,16);a.equal(m.codebook_beams,64);a.equal(m.knn_neighbors,7);a.equal(m.training_samples_per_protocol,512);a.equal(m.test_anchor_count,64);a.equal(m.test_pass_count,4);
 a.match(m.random_generator,/Mulberry32.*Box–Muller/);a.match(m.random_generator,/not NumPy default_rng/);a.match(m.feature_boundary,/group fingerprints/);
 a.match(m.oracle_separation,/IDs, true direction, test labels and evaluation powers do not enter prediction/);a.match(m.gain_loss,/never clip/i);a.match(m.gain_loss,/Infinity/);a.match(m.near_tie_rule,/1e-12/);
 for(const text of ['70/20/10','70/30','p.5','M=16','N=64','512','64 个测试锚点','K/64','正无穷','组指纹','未给出带宽、能量、时延或端到端增益','不是论文 CNN、DeepSense 数据或实测复现'])a.ok(metadata.includes(text),text);
 a.match(pc.observationsAndUnknowns,/先冻结排名，再评估/);a.match(metadata,/元数据.*接口|接口.*元数据/);a.match(metadata,/无自动模型选择/);a.match(metadata,/不是未触碰的最终基准/);a.match(m.hyperparameters,/not an untouched final benchmark/);a.match(metadata,/不是 64 次独立试验/);
 for(const key of ['retainedAssumptions','omittedMechanisms','metrics','unknowns'])a.ok(pc[key].length,key);
});

test('radar original-version reading guide is bounded, linked and documented without a tenth influence card',()=>{
 const h=article(read('site/content-reading.html'),'ref-RADAR'),doc=read('docs/READING-MAP.md');
 for(const text of ['六页接受稿','70/20/10','位于 p.5','70/30','77 GHz','60 GHz','CNN','没有下载测量','K/64','完整通信功率只在评估时揭示'])a.ok(h.includes(text),text);
 for(const href of [c.learningEntry,u.href,c.paper,c.next])a.ok(h.includes(`href="${href}"`),href);
 for(const [,url]of h.matchAll(/href="(https:[^"]+)"/g))a.ok(doc.includes(url),url);
 a.doesNotMatch(h,/class="influence-card"|<button|<input|<canvas/);a.match(doc,/Mulberry32\/Box–Muller/);a.match(doc,/92\.1875%/);
 a.doesNotMatch(JSON.stringify(source),/\/workspace\/|\/tmp\//);
});

test('radar page and generated portals expose real sections, shared navigation and the canonical next action',()=>{
 const expected=['foundations.html#iq','foundations.html#array'];a.deepEqual(u.prerequisites,expected);a.deepEqual(p.prerequisites,expected);
 const html=read(p.path);
 for(const href of expected){resolve(href);a.ok(c.fields['先修'].includes(`href="${href}"`));a.ok(html.includes(`href="${href}"`));}
 for(const anchor of ['mechanism','experiment','model','paper','limits','reproduce'])resolve(`${p.path}#${anchor}`);
 for(const href of [c.learningEntry,u.href,c.paper,c.next,p.next])resolve(href);
 for(const key of ['HEADER','CONTEXT','NEXT'])a.equal((html.match(new RegExp(`<!-- SITE:${key}:START -->`,'g'))||[]).length,1);
 a.ok(html.includes('href="experiments.html" aria-current="location"'));a.ok(html.includes('href="practice.html?topic=radar-beam-decision#notebook"'));
 for(const file of ['index.html','experiments.html','reading.html'])a.ok(read(file).includes(`href="${u.href}"`),file);
 a.ok(read('index.html').includes(`href="${c.learningEntry}"`));a.equal(article(read('reading.html'),'ref-RADAR'),article(read('site/content-reading.html'),'ref-RADAR'));
});

test('radar rendered card remains usable and DeepSense remains an unavailable resource entry',()=>{
 const html=read('reading.html'),radar=article(html,'paper-radar_prediction'),deep=article(html,'paper-deepsense');
 a.ok(radar.includes(`href="${c.learningEntry}"`));a.match(radar,/独立机制模型，非完整论文复现/);a.doesNotMatch(radar,/教学案例准备中|深度交互尚未实现/);
 a.match(html,/深度交互已接入：8 \/ 9 篇/);a.equal((html.match(/class="influence-card"/g)||[]).length,9);
 a.match(deep,/深度交互尚未实现/);a.ok(!/href="(?!https:)/.test(deep));
 for(const pending of data.cards.filter(c=>!c.caseId)){const h=article(html,'paper-'+pending.id);a.match(h,/深度交互尚未实现/);a.ok(!/href="(?!https:)/.test(h));}
});
