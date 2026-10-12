const {withoutGCSAGERegistry}=require('./helpers/gc-sage-preservation.cjs');
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),registry=JSON.parse(read('site/registry.json'));
test('waveform map concept preserves separate pilot and strict-covariance models through canonical references',()=>{
 const node=registry.knowledgeMap.nodes.find(n=>n.id==='waveform-design');
 assert.deepEqual(node.unitRefs,['pilot','waveform-design','golay-radar']);assert.equal(node.entryUnitRef,'pilot');
 assert.match(node.knownUnknown,/静止单径时延/);assert.match(node.knownUnknown,/H、目标符号 S 与协方差 R_d 已知/);
 assert.match(node.boundary,/无噪声确定性符号误差/);assert.match(node.boundary,/不保证相同延迟–多普勒性能/);
 const html=read('index.html');for(const id of node.unitRefs){const unit=registry.units.find(u=>u.id===id);assert.ok(unit);assert.ok(html.includes(`href="${unit.href}"`));}
 const direction=registry.directions.find(d=>d.id==='waveforms');assert.ok(direction.primaryCaseIds.includes('case-pilot'));assert.ok(direction.primaryCaseIds.includes('case-waveform'));
 assert.equal(registry.cases.filter(c=>c.id==='case-waveform').length,1);
});
test('actual bibliography case is active and resolves only to the registered waveform mechanism',()=>{
 const data=JSON.parse(read(registry.researchDirectoryFile)),card=data.cards.find(c=>c.id==='optimal_waveform'),c=registry.cases.find(c=>c.id===card.caseId),unit=registry.units.find(u=>u.id===c.unit);
 assert.equal(c.id,'case-waveform');assert.equal(unit.id,'waveform-design');
 const article=read('reading.html').match(/<article class="influence-card" id="paper-optimal_waveform"[\s\S]*?<\/article>/)[0];
 assert.ok(article.includes(`href="${c.learningEntry||unit.href}"`));assert.ok(!article.includes('教学案例准备中'));
 assert.match(article,/独立机制模型，非完整论文复现/);assert.ok(!('paperComparison' in card));
 for(const page of ['index.html','reading.html','experiments.html','waveform-design.html'])assert.ok(read(page).includes('site.css?v=knowledge-map-v1'));
 assert.ok(read('index.html').includes('knowledge-map.js?v=knowledge-map-v3'));
});

test('joint beamforming canonical case is integrated as its own mechanism and precise source comparison',()=>{
 const data=JSON.parse(read(registry.researchDirectoryFile)),card=data.cards.find(c=>c.id==='joint_beamforming'),c=registry.cases.find(c=>c.id===card.caseId),unit=registry.units.find(u=>u.id===c.unit);
 assert.equal(c.id,'case-joint-beamforming');assert.equal(unit.id,'joint-beamforming');assert.equal(unit.href,'joint-beamforming.html#experiment');
 const article=read('reading.html').match(/<article class="influence-card" id="paper-joint_beamforming"[\s\S]*?<\/article>/)[0];
 assert.ok(article.includes(`href="${c.learningEntry||unit.href}"`));assert.ok(!article.includes('教学案例准备中'));assert.equal(c.paperComparison.sourceUrl,'https://arxiv.org/abs/1912.03420v2');assert.equal(c.paperComparison.comparisonStatus,'partial');
 assert.ok(registry.pages.some(p=>p.path==='joint-beamforming.html'));assert.ok(registry.directions.some(d=>d.primaryCaseIds.includes(c.id)));
 for(const page of ['index.html','experiments.html','reading.html'])assert.ok(read(page).includes('joint-beamforming.html#experiment'),page);
});

test('point-target CRB beamforming has a separate canonical identity and preserves the beginner concept map',()=>{
 const data=JSON.parse(read(registry.researchDirectoryFile)),card=data.cards.find(c=>c.id==='crb'),c=registry.cases.find(c=>c.id===card.caseId),unit=registry.units.find(u=>u.id===c.unit);
 assert.equal(c.id,'case-crb-beamforming');assert.equal(c.learningEntry,'crb-beamforming.html#intuition');assert.equal(unit.id,'crb-beamforming');assert.equal(unit.href,'crb-beamforming.html#experiment');
 assert.equal(withoutGCSAGERegistry(registry).units.length,28);assert.equal(registry.cases.length,15);assert.equal(registry.knowledgeMap.nodes.length,32);
 assert.equal(registry.cases.find(c=>c.id==='case-crb').unit,'crb');assert.equal(registry.units.find(u=>u.id==='crb').href,'theory.html#crb-mechanism');
 assert.ok(registry.pages.some(p=>p.path==='crb-beamforming.html'&&p.case===c.id));
 const page=read('crb-beamforming.html');for(const id of ['intuition','model','experiment','solution','nuisance','companion','paper','limits','reproduce'])assert.ok(page.includes(`id="${id}"`),id);
 assert.deepEqual(unit.prerequisites,['foundations.html#array','foundations.html#matched','foundations.html#limits']);
 for(const [id,entry]of [['beam-design','array'],['fisher-crb','crb']]){const n=registry.knowledgeMap.nodes.find(n=>n.id===id);assert.ok(n.unitRefs.includes(unit.id));assert.equal(n.entryUnitRef,entry);}
 for(const id of ['spatial','tradeoffs']){const d=registry.directions.find(d=>d.id===id);assert.ok(d.primaryCaseIds.includes(c.id));for(const [level,anchor]of [['intuition','intuition'],['model','model'],['experiment','experiment'],['papers','paper'],['limits','limits'],['reproduction','reproduce']])assert.ok(d.levels.find(l=>l.id===level).items.some(i=>i.status==='available'&&i.href===`crb-beamforming.html#${anchor}`));}
 for(const page of ['index.html','experiments.html','reading.html'])assert.ok(read(page).includes(unit.href),page);
 const article=read('reading.html').match(/<article class="influence-card" id="paper-crb"[\s\S]*?<\/article>/)[0];assert.ok(article.includes(c.learningEntry||unit.href));assert.ok(!/教学案例准备中|深度交互尚未实现/.test(article));
});

test('CRB paper metadata fixes one journal edition and separates the exact special case from independent extensions',()=>{
 const c=registry.cases.find(c=>c.id==='case-crb-beamforming'),p=c.paperComparison,card=JSON.parse(read(registry.researchDirectoryFile)).cards.find(c=>c.id==='crb');
 assert.equal(p.sourceId,'crb');assert.equal(p.comparisonStatus,'partial');assert.equal(p.sourceUrl,'https://www.weizmann.ac.il/math/yonina/sites/math.yonina/files/Cramr-Rao_Bound_Optimization_for_Joint_Radar-Communication_Beamforming.pdf');
 for(const text of ['10.1109/TSP.2021.3135692','2021-12-15','2022-01-11'])assert.ok(p.version.includes(text));
 for(const text of ['未知','α','固定 X 和 w'])assert.ok(p.observationsAndUnknowns.includes(text));
 const metadata=JSON.stringify(c);for(const text of ['SNR','角度标准差下界','不是实际 RMSE','总功率','Nt=8','Nr=12','L=64','P=1','h=u','本站独立构造','满列秩'])assert.ok(metadata.includes(text),text);
 assert.match(p.verificationNote,/2026-10-10/);assert.match(p.locator.summary,/引理1\/定理1/);assert.match(p.locator.summary,/附录 A\/B/);
 assert.equal(card.metrics.snapshotDate,'2026-10-10');assert.deepEqual([card.metrics.openAlex.count,card.metrics.semanticScholar.count,card.metrics.completedYear.count],[773,855,245]);assert.match(card.evidenceBoundary,/不是同一篇论文/);
});
