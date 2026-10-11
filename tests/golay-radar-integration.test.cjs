'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const r=JSON.parse(read('site/registry.json')),data=JSON.parse(read(r.researchDirectoryFile));
const c=r.cases.find(c=>c.id==='case-golay-radar'),u=r.units.find(u=>u.id==='golay-radar'),p=r.pages.find(p=>p.path==='golay-radar.html');
function resolve(href){const [file,hash]=href.split('#');a.ok(fs.existsSync(path.join(root,file)),href);if(hash)a.ok(read(file).includes(`id="${hash}"`),href);}

test('Golay reuse is one canonical case, mechanism and page within the existing direction framework',()=>{
 a.equal(r.cases.filter(k=>k.id===c.id).length,1);a.equal(r.units.filter(k=>k.id===u.id).length,1);a.equal(r.pages.filter(k=>k.path===p.path).length,1);
 a.equal(c.unit,u.id);a.equal(p.case,c.id);a.equal(u.href,'golay-radar.html#experiment');a.equal(c.learningEntry,u.href);
 a.equal(u.primaryDirectionId,'waveforms');a.equal(r.directions.length,8);a.equal(r.knowledgeMap.nodes.length,32);
 a.equal(p.stage,'experiments');a.equal(c.paper,'golay-radar.html#paper');a.equal(c.next,'golay-radar.html#limits');
 for(const href of [u.href,c.learningEntry,c.paper,c.next,p.next])resolve(href);
});

test('prerequisites use real I/Q, matching and Doppler anchors in the foundations',()=>{
 const expected=['foundations.html#iq','foundations.html#matched','foundations.html#doppler'];
 a.deepEqual(u.prerequisites,expected);a.deepEqual(p.prerequisites,expected);
 for(const href of expected){resolve(href);a.ok(c.fields['先修'].includes(`href="${href}"`));a.ok(read('golay-radar.html').includes(`href="${href}"`));}
 a.doesNotMatch(JSON.stringify(c)+JSON.stringify(u)+JSON.stringify(p),/foundations\.html#velocity(?:["\\]|$)/);
});

test('six depth levels expose actual Golay sections without claiming a complete paper reproduction',()=>{
 const d=r.directions.find(d=>d.id===u.primaryDirectionId);a.ok(d.primaryCaseIds.includes(c.id));
 for(const [level,anchor]of [['intuition','mechanism'],['model','model'],['experiment','experiment'],['papers','paper'],['limits','limits'],['reproduction','reproduce']]){
  const items=d.levels.find(l=>l.id===level).items.filter(i=>i.href===`golay-radar.html#${anchor}`);a.equal(items.length,1);a.equal(items[0].status,'available');a.equal(items[0].scope,'direction-specific');resolve(items[0].href);
 }
 for(const anchor of ['weak-echo','doppler','long-gap'])resolve(`golay-radar.html#${anchor}`);
 a.equal(c.paperComparison.comparisonStatus,'partial');a.match(c.paperComparison.siteArtifactType,/独立构造/);a.match(c.paperComparison.siteArtifactType,/不是标准帧或原图复现/);
});

test('relevant concepts gain the deep case while keeping their beginner routes',()=>{
 for(const [id,entry]of [['matched','matched'],['known-pilots','pilot'],['delay','ofdm'],['doppler','doppler'],['waveform-design','pilot']]){
  const n=r.knowledgeMap.nodes.find(n=>n.id===id);a.equal(n.unitRefs.filter(ref=>ref===u.id).length,1);a.equal(n.entryUnitRef,entry);
 }
 const map=read('index.html');a.ok(map.includes(`href="${c.learningEntry}"`));a.ok(map.includes('通信训练序列，为什么也能测距？'));
 a.deepEqual(r.knowledgeMap.nodes.find(n=>n.id==='waveform-design').unitRefs,['pilot','waveform-design','golay-radar']);
});

test('the existing 80211ad influence card remains available after the eighth case without duplicating the bibliography',()=>{
 const card=data.cards.find(k=>k.id==='80211ad'),html=read('reading.html');
 a.equal(card.caseId,c.id);a.equal(card.groupId,'signals-networks');a.equal(data.cards.length,9);a.equal(new Set(data.cards.map(k=>k.doi)).size,9);
 a.equal(data.cards.filter(k=>k.caseId).length,8);a.equal(data.cards.filter(k=>!k.caseId).length,1);
 a.equal(card.metrics.snapshotDate,'2026-10-10');a.deepEqual([card.metrics.openAlex.count,card.metrics.semanticScholar.count,card.metrics.completedYear.count],[711,659,92]);
 a.equal(card.identitySource,'https://arxiv.org/abs/1702.05833');a.equal(card.doi,'https://doi.org/10.1109/tvt.2017.2774762');
 const article=html.match(/<article class="influence-card" id="paper-80211ad"[\s\S]*?<\/article>/)[0];
 a.ok(article.includes(`href="${u.href}"`));a.match(article,/独立机制模型，非完整论文复现/);a.doesNotMatch(article,/教学案例准备中|深度交互尚未实现|本站交互尚未实现/);
 a.match(html,/深度交互已接入：8 \/ 9 篇/);a.equal((html.match(/class="influence-card"/g)||[]).length,9);
});

test('fixed author-version evidence distinguishes independent Golay construction from standard CEF processing',()=>{
 const paper=c.paperComparison,metadata=JSON.stringify(c);
 a.equal(paper.sourceId,'80211ad');a.equal(paper.sourceUrl,'https://arxiv.org/abs/1702.05833v1');
 for(const value of ['1702.05833v1','2017-02-20','10.1109/TVT.2017.2774762'])a.ok(paper.version.includes(value),value);
 for(const value of ['STF/CEF','§IV-A','式(13)–(19)','Remark 3'])a.ok(paper.locator.summary.includes(value),value);
 for(const value of ['独立递归构造','不是完整 IEEE 帧实现或论文性能复现','相关峰不是通过检测的目标','固定接收窗口','真值仅用于合成回波和标线','两次之间的相位变化','不声明标准兼容'])a.ok(metadata.includes(value),value);
 a.match(paper.resourceBudget.summary,/相同/);a.match(paper.resourceBudget.summary,/增加观测时长/);
 a.ok(read('docs/READING-MAP.md').includes('https://arxiv.org/abs/1702.05833v1'));
});

test('generated portals and native topic navigation reach the canonical experiment and paper',()=>{
 for(const file of ['index.html','experiments.html','reading.html'])a.ok(read(file).includes(`href="${u.href}"`),file);
 const html=read('golay-radar.html');for(const href of [u.href,c.paper,c.next,'practice.html#notebook'])a.ok(html.includes(`href="${href}"`),href);
 for(const key of ['HEADER','CONTEXT','NEXT'])a.equal((html.match(new RegExp(`<!-- SITE:${key}:START -->`,'g'))||[]).length,1);
 a.ok(html.includes('href="experiments.html" aria-current="location"'));
});
