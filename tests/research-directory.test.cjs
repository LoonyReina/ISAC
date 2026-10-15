const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const registry=JSON.parse(read('site/registry.json')),data=JSON.parse(read(registry.researchDirectoryFile));
const {renderResearchDirectory}=require('../scripts/render-research-directory.cjs');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const html=read('reading.html'),render=(r=registry,exists=p=>fs.existsSync(path.join(root,p)))=>renderResearchDirectory(data,r,exists);
function getCard(id,source=html){return source.match(new RegExp(`<article class="influence-card" id="paper-${id}"[\\s\\S]*?<\\/article>`))[0];}
test('nine unique DOI-identified papers are sourced from one registry-owned bibliography file',()=>{
 a.equal(data.cards.length,9);a.equal(new Set(data.cards.map(c=>c.id)).size,9);a.equal(new Set(data.cards.map(c=>c.doi)).size,9);
 a.equal([...html.matchAll(/class="influence-card"/g)].length,9);
 for(const c of data.cards){a.ok(data.groups.some(g=>g.id===c.groupId));a.ok(c.authors&&c.title&&c.publicationLabel&&c.identitySource);a.ok(!('deepCase' in c));a.ok(!('paperComparison' in c));a.ok(!('plannedPath' in c));}
 a.ok(html.includes(render()));
});
test('every paper retains source-labelled links, access timestamps, and separate citation services',()=>{
 for(const c of data.cards){const card=getCard(c.id),m=c.metrics;
  for(const url of [c.identitySource,c.doi,m.openAlex.source,m.semanticScholar.source,m.semanticScholar.recordUrl,...c.endorsements.map(e=>e.url),...c.links.map(l=>l.url)]){a.equal(new URL(url).protocol,'https:');a.ok(card.includes(`href="${esc(url)}"`),`${c.id}: ${url}`);}
  for(const date of [m.snapshotDate,m.openAlex.retrievedAt,m.openAlex.recordUpdatedAt,m.semanticScholar.retrievedAt])a.ok(card.includes(date));
  a.match(card,/OpenAlex：<a href=/);a.match(card,/Semantic Scholar：<a href=/);a.match(card,/两套服务独立显示，不相加/);
  a.ok(card.includes(`${m.semanticScholar.count} 次`));a.ok(card.includes(`${m.openAlex.count} 次`));
  if(m.completedYear.comparable)a.ok(card.includes(`${m.completedYear.count} 篇（OpenAlex）`));
  a.ok(card.includes(esc(m.completedYear.definition)));a.ok(card.includes(esc(c.evidenceBoundary)));a.ok(card.includes(esc(c.socialDiscussion.text)));
 }
});
test('verified count snapshots and award dates are preserved without combining sources',()=>{
 const expected={optimal_waveform:[980,972,206],joint_beamforming:[994,1008,270],mu_mimo:[963,936,200],crb:[773,855,245],'80211ad':[711,659,92],ofdm_full_duplex:[368,368,76],perceptive:[1,295,null],deepsense:[289,377,104],radar_prediction:[141,161,37]};
 for(const c of data.cards)a.deepEqual([c.metrics.openAlex.count,c.metrics.semanticScholar.count,c.metrics.completedYear.count],expected[c.id]);
 a.match(getCard('optimal_waveform'),/2021 IEEE SPS青年作者最佳论文奖（2022年颁发）/);
 a.match(getCard('joint_beamforming'),/2024 IEEE SPS青年作者最佳论文奖（2025年颁发）/);
 a.match(getCard('crb'),/2024 IEEE SPS最佳论文奖（2025年颁发）/);
});
test('split Perceptive records cannot silently become a comparable total or annual count',()=>{
 const c=data.cards.find(c=>c.id==='perceptive'),card=getCard(c.id);
 a.equal(c.metrics.openAlex.comparable,false);a.equal(c.metrics.completedYear.comparable,false);a.equal(c.metrics.completedYear.count,null);
 a.match(card,/DOI 拆分记录，不可比/);a.match(card,/仓储记录 295 次/);a.match(card,/未逐条去重，不能相加/);a.match(card,/排除OpenAlex引用排名/);a.match(card,/记录拆分，未给出可比计数/);a.ok(!card.includes('null'));
});
test('bibliometrics, editorial overlap, social limits and paper identity are explicit',()=>{
 const h=render();for(const note of data.methodNotes)a.ok(h.includes(esc(note)));
 a.match(h,/不是全领域排名/);a.match(h,/社交讨论量未验证/);a.match(h,/不是2025年的索引增长量/);a.match(h,/推荐不是完全独立于作者的投票/);
 a.match(getCard('crb'),/不是同一篇论文/);a.match(getCard('deepsense'),/数据下载量不是论文引用数/);
});
test('unimplemented papers render no local action, and each mechanism requires an integrated canonical case',()=>{
 const absent={...registry,cases:registry.cases.filter(c=>!data.cards.some(card=>card.caseId===c.id))};const pending=render(absent);
 a.match(getCard('optimal_waveform',pending),/教学案例准备中/);
 for(const c of data.cards){const card=getCard(c.id,pending);a.ok(!/href="(?!https:)/.test(card),c.id);}
 for(const [caseId,paperId,file]of [['case-waveform','optimal_waveform','waveform-design.html'],['case-joint-beamforming','joint_beamforming','joint-beamforming.html'],['case-crb-beamforming','crb','crb-beamforming.html'],['case-golay-radar','80211ad','golay-radar.html'],['case-ofdm-interpolation','ofdm_full_duplex','ofdm-interpolation.html'],['case-radar-beam-decision','radar_prediction','radar-beam-decision.html'],['case-perceptive-bsbl','perceptive','perceptive-bsbl.html'],['case-shared-array','mu_mimo','shared-array.html']]){
  a.match(getCard(paperId,pending),/教学案例准备中/);
  const integrated={...absent,cases:[...absent.cases,{id:caseId,unit:'test-unit'}],units:[...registry.units,{id:'test-unit',href:`${file}#${paperId==='perceptive'?'run':'experiment'}`}],pages:[...registry.pages,{path:file}]};
  a.ok(getCard(paperId,render(integrated,()=>true)).includes(`href="${file}#${paperId==='perceptive'?'run':'experiment'}"`));
  a.ok(!getCard(paperId,render(integrated,()=>false)).includes(`href="${file}`));
  a.ok(!getCard(paperId,render({...integrated,pages:[]},()=>true)).includes(`href="${file}`));
 }
 for(const c of data.cards.filter(c=>!c.caseId))a.match(getCard(c.id),/深度交互尚未实现/);
});
test('reading directory uses native closed disclosures, labelled groups, working anchor navigation and narrow layouts',()=>{
 const h=render();a.equal([...h.matchAll(/class="paper-evidence"/g)].length,9);a.ok(!/<details[^>]*\bopen\b/.test(h));a.ok(!/<(?:script|button|input)\b/.test(h));
 for(const [,hash]of h.matchAll(/href="#([^"]+)"/g))a.ok(h.includes(`id="${hash}"`));
 for(const [,id]of h.matchAll(/aria-labelledby="([^"]+)"/g))a.ok(h.includes(`id="${id}"`));
 a.match(html,/<details class="reading-legacy-evidence" id="reading-legacy-evidence">/);a.match(html,/id="influential-papers"/);a.doesNotMatch(html,/aria-label="论文阅读目录"/);
 const css=read('research-directory.css');a.match(css,/align-items:start/);a.match(css,/overflow-wrap:anywhere/);a.match(css,/@media\(max-width:700px\)\{\.influence-grid\{grid-template-columns:1fr\}/);a.match(css,/focus-visible/);a.match(css,/min-height:44px/);
});
test('adding or removing evidence cards updates the collapsed heading and card count without a parallel catalogue menu',()=>{
 const vm=require('node:vm');
 for(const cards of [data.cards.slice(0,-1),[...data.cards,{...data.cards[0],id:'additional-paper'}]]){
  const changed={...data,cards},outputs={};
  vm.runInNewContext(read('scripts/generate-site.cjs'),{__dirname:path.join(root,'scripts'),process:{argv:[]},console:{log(){}},require:id=>id==='node:fs'?{...fs,readFileSync:(file,...args)=>String(file)===path.join(root,registry.researchDirectoryFile)?JSON.stringify(changed):fs.readFileSync(file,...args),writeFileSync:(file,text)=>outputs[path.basename(file)]=text}:require(id)});
  const h=outputs['reading.html'];a.ok(h.includes(`>${cards.length} 篇研究论文：先选机制，再核对影响证据</h2>`));a.match(h,/<details class="reading-legacy-evidence" id="reading-legacy-evidence">/);a.equal([...h.matchAll(/class="influence-card"/g)].length,cards.length);a.doesNotMatch(h.match(/<h2 id="influential-papers-title">[^<]*<\/h2>/)[0],/九篇/);a.doesNotMatch(h,/aria-label="论文阅读目录"/);
 }
});

test('exactly eight bibliography cases are active and DeepSense remains resource-only',()=>{
 const active=data.cards.filter(c=>c.caseId),pending=data.cards.filter(c=>!c.caseId);a.equal(active.length,8);a.equal(pending.length,1);
 for(const c of active){const card=getCard(c.id);a.ok(/href="(?!https:)/.test(card));a.ok(!/教学案例准备中|深度交互尚未实现/.test(card));a.ok(!/尚未实现|准备中/.test(c.readingPlan));}
 for(const c of pending){const card=getCard(c.id);a.match(card,/深度交互尚未实现/);a.ok(!/href="(?!https:)/.test(card));}
});

test('implemented-paper totals follow valid canonical cases and page availability rather than a fixed count',()=>{
 const active=data.cards.filter(c=>c.caseId&&registry.cases.some(k=>k.id===c.caseId));
 a.match(render(),new RegExp(`深度交互已接入：${active.length} / ${data.cards.length} 篇`));
 const withoutCases={...registry,cases:registry.cases.filter(c=>!active.some(card=>card.caseId===c.id))};
 a.match(render(withoutCases),new RegExp(`深度交互已接入：0 / ${data.cards.length} 篇`));
 a.match(render(registry,()=>false),new RegExp(`深度交互已接入：0 / ${data.cards.length} 篇`));
 const missingNewPage=render(registry,file=>file!=='crb-beamforming.html');
 a.match(missingNewPage,new RegExp(`深度交互已接入：${active.length-1} / ${data.cards.length} 篇`));
 a.match(getCard('crb',missingNewPage),/教学案例准备中/);
});

test('generic teaching links honor all eight canonical learning entries, with seven introductory changes and intentional Golay experiment-first',()=>{
 let changes=0;
 for(const card of data.cards.filter(card=>card.caseId)){
  const c=registry.cases.find(c=>c.id===card.caseId),u=registry.units.find(u=>u.id===c.unit),href=c.learningEntry||u.href;
  a.ok(getCard(card.id).includes(`href="${href}">进入教学案例 →</a>`),card.id);
  if(href!==u.href){changes++;a.ok(!getCard(card.id).includes(`href="${u.href}">进入教学案例 →</a>`));}
  const noEntry=structuredClone(registry);delete noEntry.cases.find(k=>k.id===c.id).learningEntry;
  a.ok(getCard(card.id,render(noEntry)).includes(`href="${u.href}">进入教学案例 →</a>`));
 }
 a.equal(changes,7);a.ok(getCard('80211ad').includes('href="golay-radar.html#experiment">进入教学案例 →</a>'));
 a.ok(!/href="(?!https:)/.test(getCard('deepsense')));
});

test('entry-route rendering preserves the complete nine-paper source and metrics snapshot',()=>{
 const crypto=require('node:crypto'),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
 // Deliberate source/metrics updates require a separately reviewed snapshot refresh.
 a.equal(hash(require('./helpers/waveform-live-preservation.cjs').priorCatalogSource(JSON.parse(read(registry.researchDirectoryFile)))),'95b0038bc1e110bd64efba999015f85eeeea2f63dceaea30cedc79fd1059f1b9');
 const before=JSON.stringify(data);render();a.equal(JSON.stringify(data),before);
 for(const card of data.cards){const h=getCard(card.id);a.ok(h.includes(esc(card.title)));a.ok(h.includes(esc(card.authors)));a.ok(h.includes(esc(card.readingPlan)));for(const {url,text,kind}of card.endorsements){a.ok(h.includes(esc(url)));a.ok(h.includes(esc(text)));a.ok(h.includes(esc(kind)));}}
});
