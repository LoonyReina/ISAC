'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),registry=JSON.parse(read('site/registry.json'));
test('waveform map concept preserves separate pilot and strict-covariance models through canonical references',()=>{
 const node=registry.knowledgeMap.nodes.find(n=>n.id==='waveform-design');
 assert.deepEqual(node.unitRefs,['pilot','waveform-design']);assert.equal(node.entryUnitRef,'pilot');
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
 assert.ok(article.includes(`href="${unit.href}"`));assert.ok(!article.includes('教学案例准备中'));
 assert.match(article,/独立机制模型，非完整论文复现/);assert.ok(!('paperComparison' in card));
 for(const page of ['index.html','reading.html','experiments.html','waveform-design.html'])assert.ok(read(page).includes('site.css?v=knowledge-map-v1'));
 assert.ok(read('index.html').includes('knowledge-map.js?v=knowledge-map-v2'));
});

test('joint beamforming canonical case is integrated as its own mechanism and precise source comparison',()=>{
 const data=JSON.parse(read(registry.researchDirectoryFile)),card=data.cards.find(c=>c.id==='joint_beamforming'),c=registry.cases.find(c=>c.id===card.caseId),unit=registry.units.find(u=>u.id===c.unit);
 assert.equal(c.id,'case-joint-beamforming');assert.equal(unit.id,'joint-beamforming');assert.equal(unit.href,'joint-beamforming.html#experiment');
 const article=read('reading.html').match(/<article class="influence-card" id="paper-joint_beamforming"[\s\S]*?<\/article>/)[0];
 assert.ok(article.includes(`href="${unit.href}"`));assert.ok(!article.includes('教学案例准备中'));assert.equal(c.paperComparison.sourceUrl,'https://arxiv.org/abs/1912.03420v2');assert.equal(c.paperComparison.comparisonStatus,'partial');
 assert.ok(registry.pages.some(p=>p.path==='joint-beamforming.html'));assert.ok(registry.directions.some(d=>d.primaryCaseIds.includes(c.id)));
 for(const page of ['index.html','experiments.html','reading.html'])assert.ok(read(page).includes('joint-beamforming.html#experiment'),page);
});
