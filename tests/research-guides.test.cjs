'use strict';
// Content, generator and simulated DOM regression. No browser or source refetch claim.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const registry=JSON.parse(read('site/registry.json')),data=JSON.parse(read(registry.researchGuidesFile));
const M=require('../scripts/research-guides.cjs'),build=(d=data,r=registry)=>M.buildResearchGuides(d,r),render=(d=data,r=registry)=>M.renderResearchGuides(build(d,r));
const source=read('research-guides.js');
const {remainingTraceIds,withoutRemainingTraces,priorGuideSource}=require('./helpers/research-guide-trace-preservation.cjs');
const {withoutNetworkContext,withoutNetworkProgression}=require('./helpers/network-context-preservation.cjs');
const {spatialGuideId,withoutSpatialFrontier}=require('./helpers/spatial-frontier-preservation.cjs');
const initialTraceIds=new Set(['otfs-joint-estimation-2020','nearfield-multitarget-correlation','bistatic-ofdm-clock-measurement-2023']);
const previousTraceIds=new Set(['otfs-joint-estimation-2020','nearfield-multitarget-correlation','networks-cooperative-clusters-2024','cellfree-vq-compression-2026','bistatic-ofdm-clock-measurement-2023','isac-net-model-driven-passive','multimodal-transformer-beam-generalization']);
// Only the sixteen reviewed optional trace fields are excluded. Every original
// guide field and the three original context guides retain exact guards; the
// network addition is separately checked before the earlier fingerprints run.
const reviewedTraceIds=new Set([...previousTraceIds,...remainingTraceIds]);
const guideCores=cards=>withoutNetworkContext({cards}).cards.map(card=>{if(!reviewedTraceIds.has(card.id))return card;const {visualTrace,...core}=card;return core;});
test('twenty guide-only resources extend all eight existing directions without inflating lessons or snapshots',()=>{
 a.deepEqual([registry.cases.length,registry.units.length,registry.directions.length,registry.knowledgeMap.nodes.length],[15,28,8,32]);
 a.equal(data.cards.length,20);a.deepEqual(data.cards.map(c=>c.directionId),['waveforms','waveforms','spatial','spatial','networks','networks','prototype','prototype','learning','learning','receiver','receiver','channels','channels','tradeoffs','tradeoffs','channels','waveforms','prototype','spatial']);
 const directory=JSON.parse(read(registry.researchDirectoryFile));a.equal(directory.cards.length,9);a.equal(directory.cards.filter(c=>c.caseId).length,8);
 for(const c of data.cards){a.ok(!registry.cases.some(x=>x.id===c.id));a.ok(!registry.units.some(x=>x.id===c.id));a.equal(c.caseId,undefined);}
 const html=read('reading.html');a.match(html,/20 篇问题式导读/);a.match(html,/15 个已有主题/);a.match(html,/深度交互已接入：8 \/ 9 篇/);
 a.ok(html.indexOf('id="directions"')<html.indexOf('id="research-guides"'));a.ok(html.indexOf('id="research-guides"')<html.indexOf('id="paper-comparisons"'));
 a.equal((html.match(/class="research-guide-card"/g)||[]).length,20);
});
test('beginner question, mechanism, innovation, evidence, limits and next question all survive without JS',()=>{
 const html=render();
 for(const c of data.cards){for(const value of [c.question,c.mechanism,c.innovation,c.evidence.summary,c.nextQuestion,...c.limits,c.source.edition,c.source.locator])a.ok(html.includes(M.escapeHtml(value)),c.id+': '+value);}
 for(const label of ['先问：','直觉机制：','作者推进了哪一步？','证据支持到哪里？','哪些条件不能略去？','带着什么问题继续？'])a.ok(html.includes(label));
 for(const tag of html.matchAll(/<(?:article|section|details)[^>]*>/g))a.doesNotMatch(tag[0],/\bhidden\b/);
 a.match(html,/data-guide-controls role="search" hidden/);a.match(html,/role="status" aria-live="polite"/);a.doesNotMatch(html,/<canvas|<svg|<iframe|<script|data-comparison-group/);
});
test('fixed editions travel with the inspected source and scientific limits remain explicit',()=>{
 const html=render();
 for(const pin of ['1910.01896v1','2105.03125v2','2311.07722v1','2506.07052v1'])a.ok(html.includes(pin));
 const gaudio=data.cards[0],yuan=data.cards[1];a.match(gaudio.source.url,/\/pdf\//);a.match(yuan.source.url,/\/pdf\//);
 a.match(yuan.source.edition,/2021-05-11/);a.match(yuan.source.edition,/PDF 编号/);a.match(yuan.source.locator,/式\(39\)–\(42\)/);
 for(const phrase of ['保护格','20 dB','不是统一的空间标签','完全自干扰消除','已知用户和目标位置','降低用户最低速率','归一化 Capon 空间谱','规定虚警率','本站没有实现'])a.ok(html.includes(phrase),phrase);
 a.doesNotMatch(html,/先看门限区/);a.match(html,/先分清误差与下界/);
});
test('network guides preserve the first batch and bound cooperation, compression and publication claims',()=>{
 a.equal(crypto.createHash('sha256').update(JSON.stringify(guideCores(data.cards.slice(0,4)))).digest('hex'),'2b258d793a0cf561885f7ef24508216946550188cedc923f56afb7d0fe0cab48');
 const [meng,wang]=data.cards.slice(4),html=render();
 a.equal(meng.id,'networks-cooperative-clusters-2024');a.equal(wang.id,'cellfree-vq-compression-2026');
 a.equal(meng.source.url,'https://arxiv.org/pdf/2403.20228v3');a.equal(wang.source.url,'https://arxiv.org/pdf/2602.20319v1');
 a.match(meng.source.edition,/2024-06-11/);a.match(meng.source.edition,/SPAWC 2024 会议版本/);a.match(wang.source.edition,/2026-02-23/);
 for(const phrase of ['Root CRLB','每站发射功率','省略 CSI 共享流量','非相干处理不等于无需时间同步','CPU 查码本','接入点（AP）','中央处理单元（CPU）','三维卷积网络（3D CNN）','潜特征向量数','Nc 是码本大小','先分清径向分量与完整速度','在线才只传索引','训练特征/梯度','输出维度按目标数 Q 设置','校准后残余时偏/频偏'])a.ok(html.includes(phrase),phrase);
 a.ok(html.includes(`href="${meng.source.publicationUrl}">正式发表记录</a>`));a.match(html,/不同版本不混用编号/);a.doesNotMatch(html,/>后续期刊记录<|未将期刊定稿/);
 a.ok([meng,wang].every(c=>c.notebookTopicId===undefined));
});
test('prototype guides preserve the prior six and distinguish measured hardware from untested service claims',()=>{
 a.equal(crypto.createHash('sha256').update(JSON.stringify(guideCores(data.cards.slice(0,6)))).digest('hex'),'4f1e87ac19393b4c1190345aac8dccd9213303c0b642c7f66d2445d563370076');
 const [bistatic,mimo]=data.cards.slice(6),html=render();
 a.equal(bistatic.id,'bistatic-ofdm-clock-measurement-2023');a.equal(mimo.id,'mimo-ofdm-realtime-testbed-2023');
 a.equal(bistatic.source.url,'https://arxiv.org/pdf/2305.15058v1');a.equal(mimo.source.url,'https://arxiv.org/pdf/2302.05812v1');
 a.match(bistatic.source.edition,/2023-05-24/);a.match(mimo.source.edition,/2023-02-11/);
 for(const phrase of ['同轴中频硬件验证','没有射频前端或空口传播验证','不是实测持续吞吐','不能套单站 cτ/2','24 GHz 室内空口原型实测','不同距离/角度下的雷达与通信 SNR 测量','联合实验采用125 MHz','不能据此写成200 MHz满负荷联合业务','每100 ms发送500字节','不代表给出了端到端最坏时延保证'])a.ok(html.includes(phrase),phrase);
 a.ok([bistatic,mimo].every(c=>c.notebookTopicId===undefined));a.doesNotMatch(mimo.evidence.summary,/给出距离\/角度及通信 SNR 测量/);
});
test('learning and receiver guides preserve the prior eight and keep metric, training and conditional-error boundaries',()=>{
 a.equal(crypto.createHash('sha256').update(JSON.stringify(guideCores(data.cards.slice(0,8)))).digest('hex'),'43655698eda60f21efad8e18e91741a744cea8c961454d0fe964da2c79eb731b');
 const cards=data.cards.slice(8,12),html=render();
 a.deepEqual(cards.map(c=>c.id),['isac-net-model-driven-passive','multimodal-transformer-beam-generalization','ofdm-ici-aware-receiver-2021','ofdm-passive-atomic-errors-2017']);
 a.deepEqual(cards.map(c=>c.source.url),['https://arxiv.org/pdf/2307.15074v1','https://www.itu.int/dms_pub/itu-s/opb/jnl/S-JNL-VOL4.ISSUE3-2023-A33-PDF-E.pdf','https://arxiv.org/pdf/2103.15694v1','https://arxiv.org/pdf/1610.04218v2']);
 for(const phrase of ['两图的 Perfect 含义不同','95%训练、5%测试','0.7844不是78.44%','不能称为零样本泛化','同一地点的日夜采集','MAC/参数数不等于实测时延或能耗','FDR不是单元虚警概率','只统计检测成功的事件','人为去掉ICI项','表I第5步','只计正确识别的目标','前向纠错（FEC）'])a.ok(html.includes(phrase),phrase);
 for(const card of cards){a.equal(card.notebookTopicId,undefined);a.ok(card.readingSteps.length>=3);a.equal(card.prerequisites.length,3);}
 a.match(cards[1].source.edition,/公开期刊PDF编号/);a.match(cards[3].source.edition,/算法在§IV、仿真在§V/);
});
test('channel and tradeoff guides preserve the prior twelve and separate measurement, state knowledge and inspected editions',()=>{
 a.equal(crypto.createHash('sha256').update(JSON.stringify(guideCores(data.cards.slice(0,12)))).digest('hex'),'168ce52facfc17311ee3b5ddbece81d58f37608c68a06e35d0d825f3ca3d9de1');
 const cards=data.cards.slice(12,16),html=render();
 a.deepEqual(cards.map(c=>c.id),['channels-shared-clusters-2024','channels-target-environment-coupling-2025','tradeoffs-feedback-capacity-distortion-2018','tradeoffs-causal-state-communication-2013']);
 a.deepEqual(cards.map(c=>c.source.url),['https://arxiv.org/pdf/2211.06615v2','https://arxiv.org/pdf/2506.00480v1','https://arxiv.org/pdf/1805.05713v1','https://web.eng.ucsd.edu/~yhk/pdfs/it2013jun.pdf']);
 a.deepEqual([...new Set(data.cards.map(c=>c.directionId))].sort(),registry.directions.map(d=>d.id).sort());
 for(const phrase of ['伪噪声（PN）','自动导引车（AGV）','相似度指标（SI）','1 GHz零到零带宽','不是复信道相关系数','非视距遮挡角域上下文有不一致','不能当作独立场景泛化证据','通信端完美状态知识','qH₂(p)','失真 qp','描述代价不随输入符号变化','没有从接收端返回Y的输出反馈','Appendix B，pp.3718–3719'])a.ok(html.includes(phrase),phrase);
 const vor=html.slice(html.indexOf('id="guide-tradeoffs-causal-state-communication-2013"')).split('</article>')[0];
 a.match(vor,/作者托管IEEE TIT期刊VoR/);a.match(vor,/>正式发表记录<\/a>/);a.match(vor,/按上面明确标注的本次阅读版本；不同版本不混用编号/);a.doesNotMatch(vor,/固定预印本|未将正式发表版本视为已逐式核对/);
 for(const card of cards){a.equal(card.notebookTopicId,undefined);a.equal(card.prerequisites.length,3);}
});
test('reading navigation and direction links resolve to the same generated guide data',()=>{
 const html=read('reading.html');a.match(html,/href="#research-guides">20 篇问题式导读/);
 for(const id of ['waveforms','spatial','networks','prototype','learning','receiver','channels','tradeoffs']){
  const card=html.match(new RegExp('<article class="direction-card" id="direction-'+id+'"[\\s\\S]*?</article>'))[0];
  a.ok(card.includes(`href="#research-guides-${id}"`));a.ok(card.includes(data.cards.filter(c=>c.directionId===id).length+' 篇问题式原文导读'));a.match(card,/不增加实验覆盖/);
 }
 a.equal(M.renderGuideDirectionLink([],registry.directions[0].id),'');
 a.match(registry.directions.find(d=>d.id==='waveforms').scope,/完整 OTFS 收发机实验仍待实现/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 for(const [,href]of render().matchAll(/href="([^"]+)"/g)){
  if(href.startsWith('#')){a.ok(ids.includes(href.slice(1)),href);continue;}
  if(href.startsWith('https:'))continue;
  const url=new URL(href,'https://example.test/ISAC/');a.equal(url.origin,'https://example.test');
  a.ok(read(path.basename(url.pathname)).includes(`id="${url.hash.slice(1)}"`),href);
  if(url.search)a.ok(['practice.html?topic=near-field#notebook','practice.html?topic=sbfd#notebook'].includes(href));
 }
 a.match(render(),/已有机制的空白实验本/);a.doesNotMatch(render(),/topic=otfs|topic=nearfield-double/);
 for(const c of build())if(c.notebook)a.ok(['near-field','sbfd'].includes(c.notebook.id));
});
test('invalid identities, missing evidence and nonexistent routes fail at build time',()=>{
 const mutations=[d=>d.cards.push(structuredClone(d.cards[0])),d=>{d.cards[0].id='../escape';},d=>{d.cards[0].directionId='absent';},d=>{delete d.cards[0].question;},d=>{d.cards[0].limits=[];},d=>{d.cards[0].evidence.summary='';},d=>{d.cards[0].source.locator='';},d=>{d.cards[0].source.edition='';},d=>{d.cards[0].source.url='javascript:alert(1)';},d=>{d.cards[0].source.url='https://user:secret@example.test/paper';},d=>{d.cards[0].source.url='https://example.test/paper#fake';},d=>{d.cards[0].prerequisites[0].href='foundations.html#absent';},d=>{d.cards[0].prerequisites[0].href='https://evil.test/';},d=>{d.cards[0].notebookTopicId='unimplemented';},d=>{d.cards[0].readingSteps=[{label:'empty'}];}];
 for(const mutate of mutations){const d=structuredClone(data);mutate(d);a.throws(()=>build(d),/Invalid|Missing/);}
});
test('plain-text serialization and data-only additions do not add HTML, cases or button stubs',()=>{
 const d=structuredClone(data),r=structuredClone(registry),attack='<img src=x onerror=bad()> & "text" </script>';
 const direction=structuredClone(r.directions[0]);direction.id='synthetic-direction';r.directions.push(direction);
 const card=structuredClone(d.cards[0]);card.id='new-reading';card.directionId=direction.id;card.title=attack;card.question=attack;card.source.edition=attack;d.cards.push(card);
 const html=render(d,r);a.ok(html.includes((data.cards.length+1)+' 篇问题式导读'));a.match(html,/id="research-guides-synthetic-direction"/);a.match(html,/id="guide-new-reading"/);a.ok(html.includes(M.escapeHtml(attack)));a.doesNotMatch(html,/<img|<script|case-new-reading|unit-new-reading/);
 a.match(M.renderGuideDirectionLink(build(d,r),direction.id),/1 篇问题式原文导读/);a.equal(M.renderResearchGuides([]),'');a.equal(build({...data,cards:[]}).length,0);
});
test('local assets are versioned and loaded only on the reading page; styles support narrow screens and print',()=>{
 for(const name of ['research-guides.css?v=research-guides-v3','research-guides.js?v=research-guides-v1'])a.ok(read('reading.html').includes(name));
 for(const page of registry.pages.filter(p=>p.path!=='reading.html'))a.doesNotMatch(read(page.path),/src="research-guides\.js|href="research-guides\.css/);
 for(const token of ['minmax(0,1fr)','min-width:0','overflow-wrap:anywhere','flex-wrap:wrap','min-height:44px',':focus-visible','@media(max-width:480px)','@media print','[hidden]','details::details-content'])a.ok(read('research-guides.css').includes(token),token);
 a.doesNotMatch(source,/innerHTML|outerHTML|insertAdjacentHTML|fetch\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie|history\.|scrollIntoView|\.focus\(|setInterval|requestAnimationFrame/);
});
test('seventeen optional traces preserve every original guide field and the old hash guards detect unrelated changes',()=>{
 a.deepEqual(new Set(data.cards.filter(c=>c.visualTrace).map(c=>c.id)),new Set([...reviewedTraceIds,spatialGuideId]));a.ok(data.cards.slice(0,16).every(c=>c.visualTrace));a.ok(data.cards.slice(16,19).every(c=>!c.visualTrace));
 const hash=cards=>crypto.createHash('sha256').update(JSON.stringify(guideCores(cards))).digest('hex');
 const original='32100afe8091bc850c4e7ba19ea614c04a226e9f3662491187d0101288dea8be';a.equal(hash(data.cards.slice(0,16)),original);
 const changed=structuredClone(data.cards.slice(0,16));changed[0].question+=' altered core';a.notEqual(hash(changed),original);
 const extra=structuredClone(data.cards.slice(0,16));extra[0].visualTraceExtra='unreviewed';a.notEqual(hash(extra),original);
 const allCores='7d8a2de4a2175b7b166902c0d8b50ddc6fdb327fa2d076fe582d5e4e96a0378c';a.equal(hash(data.cards),allCores);
 const unrelated=structuredClone(data.cards);unrelated[16].visualTrace=structuredClone(unrelated[0].visualTrace);a.notEqual(hash(unrelated),allCores);
 const onlyTrace=structuredClone(data.cards.slice(0,16));onlyTrace[0].visualTrace.title+=' optional';a.equal(hash(onlyTrace),original);
});
test('the nine bounded trace additions preserve all nineteen complete prior records and the seven earlier traces',()=>{
 const hash=d=>crypto.createHash('sha256').update(priorGuideSource(d)).digest('hex');
 const baseline='96ada0f0c6d048af19228c4a3f9e6e11855fc4d9a00930795d2af7953409a6cb';
 const before=JSON.stringify(data);a.equal(hash(data),baseline);a.equal(JSON.stringify(data),before);
 a.deepEqual(data.cards.filter(c=>remainingTraceIds.has(c.id)).map(c=>c.id),[...remainingTraceIds]);
 a.ok(data.cards.filter(c=>remainingTraceIds.has(c.id)).every(c=>Object.hasOwn(c,'visualTrace')));
 for(const mutate of [
  d=>{d.cards[1].question+=' changed';},d=>{d.cards[0].visualTrace.title+=' changed';},
  d=>{d.cards[16].contextTrail.oldQuestion+=' changed';},d=>{d.cards[16].source.checkedAt='2026-10-12';},
  d=>{d.cards[1].visualTraceExtra='unreviewed';},d=>{d.cards[16].visualTrace=structuredClone(d.cards[0].visualTrace);},
  d=>{d.cards.push(d.cards.shift());}
 ]){const changed=structuredClone(data);mutate(changed);a.notEqual(hash(changed),baseline);}
 const allowed=structuredClone(data);allowed.cards[1].visualTrace.title+=' optional';a.equal(hash(allowed),baseline);
});
test('trace-only reading additions preserve the four map routes and unchanged reference numerical core',()=>{
 const unchanged={
  'site/registry.json':'dcc2c29ec2bb53905902db24b3d5f87bc26a2d953a221c47d4d20497ec875396',
  'index.html':'4b4b189ef9029583d4f0f6935c77722da3f9853a4848fbd78594c7f806a7e011',
  'reference-uncertainty-core.js':'fffc85f8ea37b2cf365ce05464bcffcbe1337ba67150dd8bf1e690ce805c4551'
 };
 for(const [file,digest]of Object.entries(unchanged)){
  let prior=read(file);
  if(file==='site/registry.json')prior=JSON.stringify(withoutNetworkProgression(registry),null,2)+'\n';
  if(file==='index.html'){const map=require('../scripts/knowledge-map.cjs'),current=map(registry,build()),old=map(withoutNetworkProgression(registry),build(withoutNetworkContext(data)));a.equal(prior.split(current).length,2);prior=prior.replace(current,old);}
  a.equal(crypto.createHash('sha256').update(prior).digest('hex'),digest,file);
 }
});
test('optional traces validate exact structure, information statuses, evidence boundaries and approved local lessons',()=>{
 const mutations=[
  c=>{c.visualTrace=null;},c=>{c.visualTrace.kind='simulation';},c=>{c.visualTrace.image='https://example.test/plot';},c=>{c.visualTrace.title='';},c=>{c.visualTrace.steps.pop();},c=>{c.visualTrace.steps.reverse();},
  c=>{c.visualTrace.steps[0].id='new-route';},c=>{c.visualTrace.steps[0].blocks=[];},c=>{c.visualTrace.steps[0].blocks.push(structuredClone(c.visualTrace.steps[0].blocks[0]));},
  c=>{c.visualTrace.steps[0].blocks[0].status='known" onclick="bad';},c=>{c.visualTrace.steps[0].blocks[0].status='__proto__';},c=>{c.visualTrace.steps[0].blocks[0].status=['known'];},c=>{c.visualTrace.steps[0].blocks[0].text={html:'bad'};},c=>{c.visualTrace.steps[0].blocks[0].coordinates=[1,2];},
  c=>{c.visualTrace.steps[0].sourceLocator='';},c=>{c.visualTrace.steps[0].sourceUrl='https://example.test/unreviewed';},c=>{c.visualTrace.steps[0].explanation='x'.repeat(2001);},
  c=>{c.visualTrace.steps[1].blocks[1].status='known';},c=>{c.visualTrace.steps[2].blocks[0].status='observed';},c=>{c.visualTrace.steps[3].blocks[1].status='supported';},
  c=>{c.visualTrace.steps[0].lessonHref='foundations.html#array';},c=>{c.visualTrace.steps[0].lessonHref='https://example.test/lesson';},c=>{c.visualTrace.steps[0].lessonHref='foundations.html?x=1#ofdm';},
  c=>{c.visualTrace.checkpoint.answer='';},c=>{c.visualTrace.checkpoint.sourceLocator='';},c=>{c.visualTrace.checkpoint.html='<button>fake</button>';}
 ];
 for(const mutate of mutations){const d=structuredClone(data);mutate(d.cards[0]);a.throws(()=>build(d),/Invalid visual trace/);}
 const d=structuredClone(data);d.cards[0].prerequisites[0].href='foundations.html#missing';d.cards[0].visualTrace.steps[0].lessonHref='foundations.html#missing';a.throws(()=>build(d),/Missing/);
});
test('trace links use the fixed parent source and reviewed prerequisite routes without new hash targets or models',()=>{
 const html=render(),without=render({...data,cards:guideCores(data.cards)});
 a.equal(M.renderVisualTrace({}),'');a.equal(M.traceSearchText(undefined),'');a.doesNotMatch(without,/data-visual-trace|class="guide-trace-print"/);
 for(const c of build()){
  const article=h=>h.slice(h.indexOf('id="guide-'+c.id+'"')).split('</article>')[0];
  if(!c.visualTrace){a.equal(article(html),article(without));continue;}
  const trace=M.renderVisualTrace(c);a.doesNotMatch(trace,/\bid=|<svg|<canvas|<img|<script|<button/);
  for(const [,href]of trace.matchAll(/href="([^"]+)"/g))a.ok([c.source.url,'#direction-'+c.directionId,...c.prerequisites.map(p=>p.href)].includes(href),href);
  a.match(trace,/本图没有运行算法，也不是论文仿真曲线/);a.match(trace,/箭头表示阅读顺序/);a.match(trace,/框的大小不表示数值/);
 }
});
test('trace science keeps receiver knowledge, model observations and experimenter truth separate',()=>{
 const cards=Object.fromEntries(data.cards.filter(c=>c.visualTrace).map(c=>[c.id,c.visualTrace]));
 const otfs=cards['otfs-joint-estimation-2020'];a.equal(otfs.steps[1].blocks[0].status,'known');a.match(otfs.steps[1].blocks[0].text,/数据符号/);a.doesNotMatch(otfs.steps[1].blocks[0].text,/时延|多普勒|增益/);
 a.match(otfs.steps[1].explanation,/雷达端仍需估计回波时延、多普勒和增益/);a.match(otfs.steps[1].explanation,/完美信道状态信息（CSI）/);a.match(otfs.steps[1].explanation,/信道获取另计/);a.match(otfs.checkpoint.answer,/已知路径数/);
 const near=cards['nearfield-multitarget-correlation'];a.match(near.steps[0].blocks[0].label,/模型\/仿真/);a.match(near.steps[3].blocks[0].text,/数值配置/);a.match(near.checkpoint.answer,/仍使用目标位置/);a.match(near.steps[3].explanation,/远场基线放宽/);
 const prototype=cards['bistatic-ofdm-clock-measurement-2023'];a.equal(prototype.steps[0].blocks[1].label,'试验者设置');a.match(prototype.steps[0].explanation,/接收机仍要估计时延和多普勒/);a.match(prototype.steps[1].explanation,/残余时钟误差/);a.match(prototype.checkpoint.answer,/不能/);
});
test('four network and learning traces preserve the first three and separate resource, training and inference conditions',()=>{
 const originals=data.cards.filter(c=>initialTraceIds.has(c.id)).map(c=>[c.id,c.visualTrace]);
 a.equal(crypto.createHash('sha256').update(JSON.stringify(originals)).digest('hex'),'b5ce53bd2d967e1ee86c98453fb9bd8a298dcf34ab3b672e82ef1f97445671d0');
 const added=data.cards.filter(c=>previousTraceIds.has(c.id)&&!initialTraceIds.has(c.id));
 a.deepEqual(added.map(c=>c.id),['networks-cooperative-clusters-2024','cellfree-vq-compression-2026','isac-net-model-driven-passive','multimodal-transformer-beam-generalization']);
 a.equal(added.flatMap(c=>c.visualTrace.steps.filter(s=>s.lessonHref)).length,11);
 const [meng,wang,net,multi]=added.map(c=>c.visualTrace);
 a.match(meng.checkpoint.prompt,/固定参与协作簇的总发射功率预算/);a.doesNotMatch(meng.checkpoint.prompt,/固定全网/);a.match(meng.steps[3].explanation,/固定每站功率/);a.match(meng.steps[3].explanation,/不是实际定位 RMSE/);
 a.match(wang.steps[1].explanation,/训练标签不等于在线时已知目标答案/);a.match(wang.steps[2].blocks[0].text,/上传离散潜特征/);a.match(wang.steps[2].blocks[1].text,/上传码字索引/);a.match(wang.checkpoint.answer,/回传梯度/);
 a.match(net.steps[1].explanation,/初始估计变成真值/);a.match(net.steps[3].explanation,/图9的Perfect去掉CSI误差，图10的Perfect去掉解调误差/);a.match(net.checkpoint.answer,/低SNR/);
 a.match(multi.steps[0].explanation,/最佳波束标签用于训练或评分/);a.match(multi.steps[1].explanation,/带标签适配数据/);a.match(multi.steps[3].explanation,/不能读成命中百分比/);a.match(multi.checkpoint.answer,/人工GPS校准/);
});
test('nine completed traces retain model, measurement, receiver knowledge and conditional-evidence boundaries',()=>{
 const traces=Object.fromEntries(data.cards.filter(c=>remainingTraceIds.has(c.id)).map(c=>[c.id,c.visualTrace]));
 const terms={
  'otfs-sensing-assisted-2021':['保留导频格','原保护区域','接收端','20 dB','随机路径增益'],
  'nearfield-double-array-ispac':['主阵列近场','辅助阵列远场','完全自干扰消除','已知发射信号','数值结果'],
  'mimo-ofdm-realtime-testbed-2023':['125 MHz','200 MHz','低占空比','人工启停','不是测得的吞吐上限'],
  'ofdm-ici-aware-receiver-2021':['V/(V+S)','检测成功','不是无目标','合成观测'],
  'ofdm-passive-atomic-errors-2017':['表I第5步','仍搜索网格','只统计正确识别','不是额外物理路径'],
  'channels-shared-clusters-2024':['5°步进不是保证的角分辨率','图7忽略功率','图8忽略独有通信簇','不是复信道相关系数'],
  'channels-target-environment-coupling-2025':['空场背景','并非留出测试','归一化功率分布','固定位置水平扫描'],
  'tradeoffs-feedback-capacity-distortion-2018':['通信接收端完美知道S','实际状态对发射端未知','qH₂(p)','通信阶段不利用反馈'],
  'tradeoffs-causal-state-communication-2013':['并没有从接收端返回Y','前i−1次状态','确定性','唯一反推S','跨块描述需要等待']
 };
 for(const [id,phrases]of Object.entries(terms)){const text=JSON.stringify(traces[id]);for(const phrase of phrases)a.ok(text.includes(phrase),id+': '+phrase);}
 for(const id of ['otfs-sensing-assisted-2021','nearfield-double-array-ispac','ofdm-ici-aware-receiver-2021','ofdm-passive-atomic-errors-2017','tradeoffs-feedback-capacity-distortion-2018','tradeoffs-causal-state-communication-2013'])a.match(traces[id].steps[0].heading,/模型|定理/,id);
});
test('trace prose is escaped in visual blocks, explanations, search attributes and print transcripts',()=>{
 const d=structuredClone(data),t=d.cards[0].visualTrace,attack='<img src=x onerror=bad()> & "text" </script>';
 t.title=attack;t.steps[0].heading=attack;t.steps[0].blocks[0].label=attack;t.steps[0].blocks[0].text=attack;t.steps[0].explanation=attack;t.steps[0].sourceLocator=attack;t.checkpoint.prompt=attack;t.checkpoint.answer=attack;
 const html=render(d);a.ok(html.includes(M.escapeHtml(attack)));a.doesNotMatch(html,/<img|<script|onerror="bad/);a.ok(M.traceSearchText(t).includes(attack));
});
test('trace styles preserve native targets, information-state text and reliable same-data print expansion',()=>{
 const css=read('research-guides.css');
 for(const token of ['.guide-visual-trace>summary','min-height:44px','.trace-status-unknown{border-style:dashed','.trace-status-design{border-style:double','.guide-trace-print{display:none}','.guide-trace-print{display:block!important}','.guide-visual-trace{display:none!important}','[data-visual-trace-card]{break-inside:auto}','@container(min-width:400px)','@container(min-width:720px)'])a.ok(css.includes(token),token);
 a.doesNotMatch(css,/animation:|transition:|scroll-behavior:smooth/);a.doesNotMatch(source,/visual-trace|trace-checkpoint/);
});

const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
class Element{
 constructor(tag='div',attrs={}){this.tag=tag;this.attrs={...attrs};this.children=[];this.events={};this._text='';this.dataset={};for(const [k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;this.id=attrs.id;this.value=attrs.value||'';this.hidden=Object.hasOwn(attrs,'hidden');this.open=Object.hasOwn(attrs,'open');}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
 set textContent(v){this._text=String(v);this.children=[];}
 set innerHTML(_){throw new Error('Unsafe HTML sink');}
 getAttribute(k){return this.attrs[k]??null;}
 matches(s){const m=s.match(/^(\w+)?\[([^=\]]+)(?:="([^"]*)")?\]$/);return m?(!m[1]||this.tag===m[1])&&Object.hasOwn(this.attrs,m[2])&&(m[3]===undefined||this.attrs[m[2]]===m[3]):this.tag===s;}
 querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
 fire(type,event={}){const e={target:this,button:0,...event};for(const fn of this.events[type]||[])fn(e);}
}
function parse(html){
 const doc=new Element('document'),stack=[doc],voids=new Set(['input','br','meta','link','hr','img']);
 for(const token of html.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g)||[]){
  if(token.startsWith('<!--'))continue;if(token.startsWith('</')){stack.pop();continue;}
  if(token.startsWith('<')){const m=token.match(/^<([\w-]+)([\s\S]*?)>$/);if(!m)continue;const attrs={};for(const x of m[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[x[1]]=decode(x[2]||'');const e=new Element(m[1],attrs);stack.at(-1).children.push(e);if(!voids.has(e.tag))stack.push(e);}
  else{const e=new Element('#text');e._text=decode(token);stack.at(-1).children.push(e);}
 }
 return doc;
}
function setup({html,hash='',mutate}={}){
 const document=parse(html??[...new Set(data.cards.map(c=>c.directionId))].map(id=>M.renderGuideDirectionLink(build(),id)).join('')+render());
 const root=document.querySelector('[data-research-guides]'),window={location:{hash},events:{},addEventListener(t,fn){(this.events[t]??=[]).push(fn);}};
 const trap=()=>{throw new Error('Forbidden side effect');};const env={document,window,fetch:trap,XMLHttpRequest:trap,localStorage:new Proxy({}, {get:trap}),history:new Proxy({}, {get:trap})};
 if(mutate)mutate(root,document);
 const execute=()=>vm.runInNewContext(source,env);execute();
 const select=root?.querySelector('[data-guide-direction-select]'),query=root?.querySelector('[data-guide-query]'),form=root?.querySelector('[data-guide-controls]'),cards=root?.querySelectorAll('[data-research-guide]')||[],groups=root?.querySelectorAll('[data-guide-group]')||[];
 return {document,root,window,select,query,form,cards,groups,execute,count:root?.querySelector('[data-guide-count]'),empty:root?.querySelector('[data-guide-empty]'),search(value){query.value=value;query.fire('input');},choose(value){select.value=value;select.fire('change');},navigate(value){window.location.hash=value;for(const fn of window.events.hashchange||[])fn();},pageshow(){for(const fn of window.events.pageshow||[])fn();}};
}
test('filter starts with all cards and exposes native labelled controls only after validation',()=>{
 const h=setup();a.equal(h.root.dataset.guidesReady,'true');a.equal(h.form.hidden,false);a.ok(h.cards.every(c=>!c.hidden));a.ok(h.groups.every(g=>!g.hidden));a.match(h.count.textContent,/20 \/ 20 篇原文导读/);a.ok(h.empty.hidden);
 for(const node of [h.select,h.query])a.ok(h.form.querySelector('[for="'+node.id+'"]'));
 a.equal(h.form.querySelector('button').attrs.type,'reset');a.equal(h.query.events.keydown,undefined);
});
test('direction and multiword question filters intersect, ignore case and show bounded empty results',()=>{
 const h=setup();h.choose('waveforms');a.equal(h.cards.filter(c=>!c.hidden).length,3);a.equal(h.groups[1].hidden,true);
 h.search('  oTfS   下一帧  ');a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),['guide-otfs-sensing-assisted-2021']);
 h.choose('spatial');a.ok(h.cards.every(c=>c.hidden));a.ok(h.groups.every(g=>g.hidden));a.equal(h.empty.hidden,false);a.match(h.count.textContent,/0 \/ 20/);
 h.search('两');a.ok(h.cards.some(c=>!c.hidden));h.search('<script>');a.equal(h.empty.hidden,false);
});
test('repeated filtering and reset preserve disclosure state and unrelated content',()=>{
 const h=setup(),details=h.cards[0].querySelector('details');details.open=true;const untouched=new Element();untouched.textContent='retained';h.document.children.push(untouched);
 for(let i=0;i<4;i++){h.choose('spatial');h.search('does-not-exist');h.form.fire('reset');a.equal(h.query.value,'');a.equal(h.select.value,'');a.ok(h.cards.every(c=>!c.hidden));a.ok(h.empty.hidden);a.ok(details.open);a.equal(untouched.textContent,'retained');}
 let prevented=false;h.form.fire('submit',{preventDefault(){prevented=true;}});a.ok(prevented);
});
test('initial deep links and back/forward hash changes reveal filtered targets without writing history',()=>{
 const h=setup({hash:'#guide-nearfield-double-array-ispac'});a.equal(h.select.value,'spatial');a.equal(h.cards.find(c=>c.id==='guide-nearfield-double-array-ispac').hidden,false);a.equal(h.cards[0].hidden,true);
 h.search('no match');h.navigate('#guide-otfs-joint-estimation-2020');a.equal(h.select.value,'waveforms');a.equal(h.query.value,'');a.equal(h.cards[0].hidden,false);
 h.search('no match');h.navigate('#research-guides-spatial');a.equal(h.select.value,'spatial');a.ok(h.cards.filter(c=>c.dataset.guideDirection==='spatial').every(c=>!c.hidden));
 h.search('kept');for(const hash of ['#%ZZ','#other','#https://evil.test'])h.navigate(hash);a.equal(h.query.value,'kept');
});
test('same-hash direction clicks also reveal cards before native anchor navigation',()=>{
 const h=setup({hash:'#research-guides-waveforms'});h.choose('spatial');h.search('no match');
 h.document.querySelector('[href="#research-guides-waveforms"]').fire('click');a.equal(h.select.value,'waveforms');a.equal(h.query.value,'');a.ok(h.cards.filter(c=>c.dataset.guideDirection==='waveforms').every(c=>!c.hidden));a.equal(h.window.location.hash,'#research-guides-waveforms');
});
test('third direction is selectable, searchable and deep-linkable with the existing enhancement',()=>{
 const h=setup();a.equal(h.groups.length,8);a.deepEqual(h.select.querySelectorAll('option').map(o=>o.value),['','waveforms','spatial','networks','prototype','learning','receiver','channels','tradeoffs']);
 h.choose('networks');a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),['guide-networks-cooperative-clusters-2024','guide-cellfree-vq-compression-2026']);a.match(h.count.textContent,/2 \/ 20/);
 h.search('Root CRLB');a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),['guide-networks-cooperative-clusters-2024','guide-cellfree-vq-compression-2026']);
 h.search('cpu 码本');a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),['guide-cellfree-vq-compression-2026']);
 h.choose('waveforms');h.document.querySelector('[href="#research-guides-networks"]').fire('click');a.equal(h.select.value,'networks');a.equal(h.query.value,'');a.ok(h.cards.filter(c=>c.dataset.guideDirection==='networks').every(c=>!c.hidden));
 for(const card of data.cards.slice(4,6)){h.choose('spatial');h.search('no match');h.navigate('#guide-'+card.id);a.equal(h.select.value,'networks');a.ok(h.cards.find(c=>c.id==='guide-'+card.id&&!c.hidden));}
 h.form.fire('reset');a.ok(h.cards.every(c=>!c.hidden));a.ok(h.groups.every(g=>!g.hidden));a.match(h.count.textContent,/20 \/ 20/);
});
test('prototype group and both source cards reuse the existing filtering and native deep-link behavior',()=>{
 const h=setup();h.choose('prototype');a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),['guide-bistatic-ofdm-clock-measurement-2023','guide-mimo-ofdm-realtime-testbed-2023','guide-sbfd-resource-synchronization-2026']);a.match(h.count.textContent,/3 \/ 20/);
 h.search('同轴');a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),['guide-bistatic-ofdm-clock-measurement-2023']);
 h.search('125 MHz');a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),['guide-mimo-ofdm-realtime-testbed-2023']);
 h.choose('networks');h.document.querySelector('[href="#research-guides-prototype"]').fire('click');a.equal(h.select.value,'prototype');a.equal(h.query.value,'');a.ok(h.cards.filter(c=>c.dataset.guideDirection==='prototype').every(c=>!c.hidden));
 for(const card of data.cards.slice(6,8)){h.choose('waveforms');h.search('no match');h.navigate('#guide-'+card.id);a.equal(h.select.value,'prototype');a.ok(h.cards.find(c=>c.id==='guide-'+card.id&&!c.hidden));}
 h.form.fire('reset');a.ok(h.cards.every(c=>!c.hidden));a.ok(h.groups.every(g=>!g.hidden));
});
test('learning and receiver cards add two searchable direction groups without new runtime logic',()=>{
 const h=setup();
 for(const [direction,queries]of [['learning',[['ISAC-NET','isac-net-model-driven-passive'],['0.7844','multimodal-transformer-beam-generalization']]],['receiver',[['APES','ofdm-ici-aware-receiver-2021'],['原子范数','ofdm-passive-atomic-errors-2017']]]]){
  h.form.fire('reset');h.choose(direction);a.equal(h.cards.filter(c=>!c.hidden).length,2);a.match(h.count.textContent,/2 \/ 20/);
  for(const [query,id]of queries){h.search(query);a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),['guide-'+id]);}
  h.choose('prototype');h.document.querySelector('[href="#research-guides-'+direction+'"]').fire('click');a.equal(h.select.value,direction);a.equal(h.query.value,'');a.equal(h.cards.filter(c=>!c.hidden).length,data.cards.filter(c=>c.directionId===direction).length);
 }
 for(const card of data.cards.slice(8,12)){h.choose('waveforms');h.search('no match');h.navigate('#guide-'+card.id);a.equal(h.select.value,card.directionId);a.ok(h.cards.find(c=>c.id==='guide-'+card.id&&!c.hidden));}
 h.form.fire('reset');a.ok(h.cards.every(c=>!c.hidden));a.ok(h.groups.every(g=>!g.hidden));a.match(h.count.textContent,/20 \/ 20/);
});
test('all eight directions remain filterable with channel and tradeoff searches and native anchor recovery',()=>{
 const h=setup();
 for(const direction of registry.directions){h.form.fire('reset');h.choose(direction.id);const count=data.cards.filter(c=>c.directionId===direction.id).length;a.equal(h.cards.filter(c=>!c.hidden).length,count);a.match(h.count.textContent,new RegExp(count+' / 20'));}
 for(const [direction,queries]of [['channels',[['PN','channels-shared-clusters-2024'],['AGV','channels-target-environment-coupling-2025']]],['tradeoffs',[['Z=Y','tradeoffs-feedback-capacity-distortion-2018'],['Wyner–Ziv','tradeoffs-causal-state-communication-2013']]]]){
  h.form.fire('reset');h.choose(direction);
  for(const [query,id]of queries){h.search(query);a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),['guide-'+id]);}
  h.choose('prototype');h.document.querySelector('[href="#research-guides-'+direction+'"]').fire('click');a.equal(h.select.value,direction);a.equal(h.query.value,'');a.equal(h.cards.filter(c=>!c.hidden).length,data.cards.filter(c=>c.directionId===direction).length);
 }
 for(const card of data.cards.slice(12)){h.choose('waveforms');h.search('no match');h.navigate('#guide-'+card.id);a.equal(h.select.value,card.directionId);a.ok(h.cards.find(c=>c.id==='guide-'+card.id&&!c.hidden));}
 h.form.fire('reset');a.ok(h.cards.every(c=>!c.hidden));a.ok(h.groups.every(g=>!g.hidden));a.match(h.count.textContent,/20 \/ 20/);
});
test('pageshow reconciles browser-restored values; script reexecution attaches no duplicate listeners',()=>{
 const h=setup();h.select.value='spatial';h.query.value='Capon';h.pageshow();a.equal(h.cards.filter(c=>!c.hidden).length,1);a.equal(h.cards.find(c=>c.id==='guide-nearfield-multitarget-correlation').hidden,false);
 h.execute();a.equal(h.query.events.input.length,1);a.equal(h.form.events.reset.length,1);a.equal(h.window.events.hashchange.length,1);a.equal(h.cards.filter(c=>!c.hidden).length,1);
});
test('native trace and checkpoint details start closed; print contains all matching explanations without disclosures',()=>{
 const h=setup();a.equal(h.document.querySelectorAll('[data-visual-trace]').length,17);
 for(const card of h.cards.filter(c=>c.querySelector('[data-visual-trace]'))){
  const native=card.querySelector('[data-visual-trace]'),print=card.querySelector('[class="guide-trace-print"]'),t=data.cards.find(c=>'guide-'+c.id===card.id).visualTrace;
  a.equal(native.open,false);a.equal(native.querySelectorAll('details').length,4);a.ok(native.querySelectorAll('details').every(d=>!d.open));a.equal(native.querySelectorAll('[class="trace-step"]').length,4);a.equal(print.querySelectorAll('details').length,0);a.equal(print.querySelectorAll('[class="trace-step"]').length,4);
  for(const value of [t.title,t.checkpoint.prompt,t.checkpoint.answer,t.checkpoint.sourceLocator,...t.steps.flatMap(s=>[s.heading,s.explanation,s.sourceLocator,...s.blocks.flatMap(b=>[b.label,b.text])])]){a.ok(native.textContent.includes(value));a.ok(print.textContent.includes(value));}
  a.equal(native.querySelectorAll('[id]').length,0);a.equal(print.querySelectorAll('[id]').length,0);
 }
});
test('the fourth stage asks for a prediction before one native reveal exposes evidence and the answer',()=>{
 const h=setup();
 const visibleText=node=>node.tag==='details'&&!node.open?node.querySelector('summary').textContent:node._text+node.children.map(visibleText).join('');
 for(const card of h.cards.filter(c=>c.querySelector('[data-visual-trace]'))){
  const trace=card.querySelector('[data-visual-trace]'),fourth=trace.querySelectorAll('[class="trace-step"]')[3],answer=fourth.querySelector('[class="trace-answer"]'),t=data.cards.find(c=>'guide-'+c.id===card.id).visualTrace;
  a.equal(fourth.querySelectorAll('details').length,1);a.equal(answer.querySelector('summary').textContent,'展开证据与解释');a.equal(answer.open,false);
  a.ok(visibleText(fourth).includes(t.checkpoint.prompt));
  for(const value of [t.checkpoint.answer,t.steps[3].explanation,...t.steps[3].blocks.map(b=>b.text)])a.ok(!visibleText(fourth).includes(value));
  answer.open=true;for(const value of [t.checkpoint.answer,t.steps[3].explanation,...t.steps[3].blocks.map(b=>b.text)])a.ok(visibleText(fourth).includes(value));
 }
});
test('existing search finds new trace text and filtering, reset and native hash recovery retain open trace state',()=>{
 const h=setup();
 for(const [query,id]of [['完美信道状态信息','otfs-joint-estimation-2020'],['作为设计输入已知','nearfield-multitarget-correlation'],['试验者设置','bistatic-ofdm-clock-measurement-2023']]){h.form.fire('reset');h.search(query);a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),['guide-'+id]);}
 const card=h.cards.find(c=>c.id==='guide-bistatic-ofdm-clock-measurement-2023'),trace=card.querySelector('[data-visual-trace]'),answer=trace.querySelector('[class="trace-answer"]');trace.open=true;answer.open=true;
 h.choose('waveforms');a.ok(card.hidden);h.form.fire('reset');a.ok(!card.hidden&&trace.open&&answer.open);
 h.search('no match');h.navigate('#guide-bistatic-ofdm-clock-measurement-2023');a.ok(!card.hidden&&trace.open&&answer.open);a.equal(h.select.value,'prototype');
 h.search('残余时钟');a.ok(!card.hidden);a.match(h.count.textContent,/1 \/ 20/);a.equal(trace.events.toggle,undefined);a.equal(answer.events.click,undefined);
});
test('new network and learning trace text is searchable and all four disclosures survive filter and reset',()=>{
 const h=setup();
 for(const [query,id]of [['固定参与协作簇的总发射功率预算','networks-cooperative-clusters-2024'],['训练标签不等于在线时已知目标答案','cellfree-vq-compression-2026'],['两类误差会相互影响','isac-net-model-driven-passive'],['最佳波束标签用于训练或评分','multimodal-transformer-beam-generalization']]){
  h.form.fire('reset');h.search(query);a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),['guide-'+id]);
  const card=h.cards.find(c=>c.id==='guide-'+id),trace=card.querySelector('[data-visual-trace]'),answer=trace.querySelector('[class="trace-answer"]');trace.open=true;answer.open=true;
  h.choose('prototype');a.ok(card.hidden);h.form.fire('reset');a.ok(!card.hidden&&trace.open&&answer.open);
  h.search('no match');h.navigate('#guide-'+id);a.ok(!card.hidden&&trace.open&&answer.open);
 }
});
test('all nine added trace titles are searchable and keep native prediction disclosures across filtering and deep links',()=>{
 const h=setup();
 for(const c of data.cards.filter(c=>remainingTraceIds.has(c.id))){
  h.form.fire('reset');h.search(c.visualTrace.title);a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),['guide-'+c.id]);
  const card=h.cards.find(x=>x.id==='guide-'+c.id),trace=card.querySelector('[data-visual-trace]'),answer=trace.querySelector('[class="trace-answer"]');
  a.equal(trace.open,false);a.equal(answer.open,false);trace.open=true;answer.open=true;
  h.choose(c.directionId==='waveforms'?'channels':'waveforms');a.ok(card.hidden);
  h.form.fire('reset');a.ok(!card.hidden&&trace.open&&answer.open);
  h.search('no match');h.navigate('#guide-'+c.id);a.ok(!card.hidden&&trace.open&&answer.open);a.equal(h.select.value,c.directionId);
 }
});
test('malformed enhancement and missing roots preserve static reading instead of hiding content',()=>{
 for(const mutate of [r=>{r.querySelector('[data-guide-count]').attrs={};},r=>{r.querySelector('[data-research-guide]').dataset.guideDirection='missing';},r=>{r.querySelector('[data-research-guide]').dataset.guideSearch='';}]){
  const h=setup({mutate});a.equal(h.root.dataset.guidesReady,undefined);a.ok(h.form.hidden);a.ok(h.cards.every(c=>!c.hidden));a.ok(h.cards.every(c=>c.querySelector('details')));
 }
 setup({html:'<main><p>Other page</p></main>'});
});

test('three context cards preserve the original sixteen complete records and seven traces without increasing case or paper coverage claims',()=>{
 const hash=cards=>crypto.createHash('sha256').update(JSON.stringify(withoutRemainingTraces({cards}).cards)).digest('hex');
 const baseline='611526c264adb9c6623f77aead79b9beaf5ba93e0b4713e387d7a19a043b43a1';
 a.equal(hash(data.cards.slice(0,16)),baseline);
 for(const mutate of [c=>{c[0].question+=' changed';},c=>{c[0].visualTrace.title+=' changed';},c=>{c[0].contextTrail={};}]){const old=structuredClone(data.cards.slice(0,16));mutate(old);a.notEqual(hash(old),baseline);}
 const added=build().slice(16,19);a.equal(added.length,3);a.ok(added.every(c=>c.contextTrail&&!c.visualTrace));
 a.deepEqual(added.map(c=>c.id),['channels-sensing-communication-mapping-2026','zak-otfs-semiblind-offgrid-2026','sbfd-resource-synchronization-2026']);
 a.deepEqual(added.map(c=>c.source.url),['https://arxiv.org/html/2601.18558v1','https://arxiv.org/html/2601.03639v2','https://arxiv.org/html/2602.00054v1']);
 a.equal(added.filter(c=>c.existingSourceCase).length,1);a.equal(added.filter(c=>!c.existingSourceCase).length,2);
 a.equal(added[2].existingSourceCase.id,'case-sbfd');a.equal(added[2].notebook.id,'sbfd');a.match(added[2].limits.join(' '),/已有|已经用于本站case-sbfd/);
 const html=render();a.match(html,/导读按阅读入口计数，不等于独立论文数/);a.match(html,/已有案例原文的新对读：<a href="#case-sbfd"/);a.match(html,/不计作新增论文或实验/);
 const before=JSON.stringify(data);build();render();a.equal(JSON.stringify(data),before,'derived reverse links never mutate source cards');
});
test('context trails keep relation direction, fixed-source locators and four ordered questions in native disclosures',()=>{
 const h=setup(),all=build();a.equal(h.document.querySelectorAll('[data-context-trail]').length,5);
 for(const c of all.filter(c=>c.contextTrail)){
  const card=h.cards.find(x=>x.id==='guide-'+c.id),trail=card.querySelector('[data-context-trail]');a.equal(trail.open,false);a.equal(trail.querySelectorAll('details').length,0);
  a.deepEqual(trail.querySelectorAll('h5').map(x=>x.textContent),['旧问题从哪里来？','这次改变了什么条件？','证据目前支持到哪里？','尚待检验的下一问']);
  for(const value of [c.contextTrail.oldQuestion,c.contextTrail.changedCondition,c.evidence.summary,...c.limits,c.nextQuestion])a.ok(trail.textContent.includes(value));
  for(const entry of c.contextTrail.links){
   const label=entry.relationType==='direct-citation'?'新文直接引用此文':'本站按问题关联（非引用关系）';
   a.ok(trail.textContent.includes(label));a.ok(trail.textContent.includes(entry.verificationNote));a.ok(trail.textContent.includes(entry.sourceLocator));
   a.ok(trail.querySelector('[href="#guide-'+entry.guideId+'"]'));a.ok(trail.querySelector('[href="'+c.source.url+'"]'));
   const old=h.cards.find(x=>x.id==='guide-'+entry.guideId),next=old.querySelector('[class="guide-onward"]');
   a.ok(next.querySelector('[href="#guide-'+c.id+'"]'));a.ok(next.textContent.includes(entry.relationType==='direct-citation'?'新文直接引用本卡原文':'本站按问题关联'));
  }
 }
 a.equal(h.document.querySelectorAll('[class="guide-onward"]').length,9);
 a.doesNotMatch(source,/context-trail|contextTrail|publicationStatus/);
});
test('first submission, exact version and checked dates remain distinct with author-reported publication status',()=>{
 const [channel,otfs,sbfd]=data.cards.slice(16),h=setup();
 a.equal(channel.source.firstSubmittedAt,'2026-01-26T15:06:55Z');a.equal(otfs.source.firstSubmittedAt,'2026-01-07T06:33:13Z');a.equal(otfs.source.versionAt,'2026-08-04T02:17:35Z');a.equal(sbfd.source.firstSubmittedAt,'2026-01-19T19:03:37Z');
 a.match(channel.source.publicationStatus,/submitted.*未确认录用或出版/);a.match(otfs.source.publicationStatus,/Accepted.*不按期刊排版/);a.match(sbfd.source.publicationStatus,/Accepted.*不混用会议成稿/);
 for(const c of data.cards.slice(16)){
  const card=h.cards.find(x=>x.id==='guide-'+c.id),brief=card.querySelector('[class="guide-currentness"]'),details=card.querySelector('[class="guide-source"]');
  a.ok(brief.textContent.includes(c.source.versionAt.slice(0,10)));a.ok(brief.textContent.includes(c.source.checkedAt));a.ok(brief.textContent.includes('非最新保证'));
  for(const label of ['首次提交','本次固定版本时间','本站核查日期','作者记录的投稿／接受状态'])a.ok(details.textContent.includes(label));
  for(const date of [c.source.firstSubmittedAt,c.source.versionAt,c.source.checkedAt])a.ok(details.querySelector('[datetime="'+date+'"]'));
  a.ok(details.textContent.includes(c.source.publicationStatus));a.ok(details.textContent.includes('不保证这是最新版本或最新发表状态'));
 }
});
test('context and source metadata reject unsafe links, coerced relation enums, invalid calendar dates and reversed chronology',()=>{
 const mutations=[
  c=>{c.contextTrail=null;},c=>{c.contextTrail=[];},c=>{c.contextTrail.oldQuestion='';},c=>{c.contextTrail.changedCondition={text:'no'};},c=>{c.contextTrail.links=[];},c=>{c.contextTrail.html='<button>fake</button>';},
  c=>{c.contextTrail.links[0].guideId='missing';},c=>{c.contextTrail.links[0].guideId=c.id;},c=>{c.contextTrail.links[0].guideId='../../bad';},c=>{c.contextTrail.links[0].guideId=['otfs-joint-estimation-2020'];},c=>{c.contextTrail.links.push(structuredClone(c.contextTrail.links[0]));},
  c=>{c.contextTrail.links[0].relationType='cites';},c=>{c.contextTrail.links[0].relationType=['direct-citation'];},c=>{c.contextTrail.links[0].relationType='__proto__';},c=>{c.contextTrail.links[0].sourceLocator='';},c=>{c.contextTrail.links[0].verificationNote='x'.repeat(2001);},c=>{c.contextTrail.links[0].href='https://evil.test/';},
  c=>{delete c.source.firstSubmittedAt;},c=>{c.source.firstSubmittedAt='2026-02-30T00:00:00Z';},c=>{c.source.firstSubmittedAt='2026-01-26';},c=>{c.source.versionAt='2026-01-26T15:06:55+00:00';},c=>{c.source.versionAt='2025-01-01T00:00:00Z';},c=>{c.source.versionAt='2026-01-26T25:00:00Z';},
  c=>{c.source.checkedAt='2026-02-29';},c=>{c.source.checkedAt='2026-01-01';},c=>{c.source.checkedAt=['2026-10-11'];},c=>{c.source.checkedAt='2026-10-11Z';},c=>{c.source.publicationStatus='';},c=>{c.source.publicationStatus=['Accepted'];}
 ];
 for(const mutate of mutations){const d=structuredClone(data);mutate(d.cards[16]);a.throws(()=>build(d),/Invalid context trail|Invalid research guide source dates or publication status/);}
 const partial=structuredClone(data);partial.cards[0].source.checkedAt='2026-10-11';a.throws(()=>build(partial),/Invalid research guide source dates/);
 const leap=structuredClone(data);leap.cards[16].source.firstSubmittedAt='2024-02-29T00:00:00Z';a.doesNotThrow(()=>build(leap));
});
test('context prose and publication status are safely escaped in text, source details, reverse labels and search attributes',()=>{
 const d=structuredClone(data),c=d.cards[16],attack='<img src=x onerror=bad()> & "text" </script>';
 c.title=attack;c.contextTrail.oldQuestion=attack;c.contextTrail.changedCondition=attack;c.contextTrail.links[0].verificationNote=attack;c.contextTrail.links[0].sourceLocator=attack;c.source.publicationStatus=attack;
 const html=render(d);a.ok(html.includes(M.escapeHtml(attack)));a.doesNotMatch(html,/<img|<script|onerror="bad/);
 const dom=parse(html),trail=dom.querySelector('[id="guide-'+c.id+'"]').querySelector('[data-context-trail]');a.ok(trail.textContent.includes(attack));
 a.ok(trail.querySelectorAll('a').every(x=>x.getAttribute('href').startsWith('#guide-')||x.getAttribute('href')===c.source.url));
});
test('context searches and bidirectional guide anchors reuse filtering without collapsing native reading state',()=>{
 const h=setup();h.search('2026脉络');a.deepEqual(new Set(h.cards.filter(c=>!c.hidden).map(c=>c.id)),new Set(data.cards.filter(c=>c.contextTrail).map(c=>'guide-'+c.id)));a.match(h.count.textContent,/5 \/ 20/);
 const old=h.cards.find(c=>c.id==='guide-ofdm-passive-atomic-errors-2017'),next=h.cards.find(c=>c.id==='guide-zak-otfs-semiblind-offgrid-2026'),trail=next.querySelector('[data-context-trail]');trail.open=true;
 h.choose('receiver');h.search('no match');old.querySelector('[class="guide-onward"]').querySelector('[href="#'+next.id+'"]').fire('click');a.equal(h.select.value,'waveforms');a.equal(h.query.value,'');a.equal(next.hidden,false);a.equal(trail.open,true);
 h.search('no match');trail.querySelector('[href="#'+old.id+'"]').fire('click');a.equal(h.select.value,'receiver');a.equal(old.hidden,false);a.equal(trail.open,true);
 h.form.fire('reset');h.search('新文直接引用此文');a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),['guide-channels-sensing-communication-mapping-2026']);
 h.form.fire('reset');h.search('Gaudio等2022');a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),[next.id]);
 h.form.fire('reset');a.ok(h.cards.every(c=>!c.hidden));a.equal(trail.open,true);
 // A later check does not reclassify an older version as that year's work.
 const d=structuredClone(data);d.cards[16].source.checkedAt='2027-01-01';const future=setup({html:render(d)});future.search('2027脉络');a.ok(future.cards.every(c=>c.hidden));future.search('2026脉络');a.equal(future.cards.filter(c=>!c.hidden).length,5);
});

test('one network context and five source fields preserve all nineteen prior cards and sixteen traces exactly',()=>{
 const hash=d=>crypto.createHash('sha256').update(JSON.stringify(withoutNetworkContext(d),null,2)+'\n').digest('hex'),before=JSON.stringify(data);
 const baseline='39a643d26a4ffad9e5e8e3071b273947f4769a40e5d1ae02f5526400d9a70e09';a.equal(hash(data),baseline);a.equal(JSON.stringify(data),before);
 const network=d=>d.cards.find(c=>c.id==='cellfree-vq-compression-2026');
 for(const mutate of [d=>{network(d).question+=' changed';},d=>{network(d).visualTrace.title+=' changed';},d=>{d.cards[16].contextTrail.changedCondition+=' changed';},d=>{network(d).source.edition+=' changed';},d=>{network(d).source.unreviewed='extra';}]){const d=structuredClone(data);mutate(d);a.notEqual(hash(d),baseline);}
 for(const mutate of [d=>{network(d).contextTrail.links[0].relationType='direct-citation';},d=>{network(d).contextTrail.changedCondition+=' changed';},d=>{network(d).source.publicationUrl='https://example.test/wrong';},d=>{delete network(d).source.checkedAt;},d=>{network(d).source.checkedAt='2026-10-12';}]){const d=structuredClone(data);mutate(d);a.throws(()=>hash(d),/exact reviewed/);}
 a.deepEqual([data.cards.length,data.cards.filter(c=>c.visualTrace).length,data.cards.filter(c=>c.contextTrail).length,registry.units.length,registry.cases.length],[20,17,5,28,15]);
 const immutable={
  'reference-uncertainty-record.js':'43f70469c54f55be0f6b8e38344df41b8115d33ff4205e34f13b23ec34730eee',
  'reference-uncertainty.js':'fd2c838f3b75a825db4536756977d2cbc4b0a588833e6d6bfbd70c57dcc5067a',
  'reference-uncertainty.html':'13984179f9ea76c7150a25de72d598550125776e26a21e0226f8f99d04d09ef2',
  'reference-uncertainty.css':'63e05e77ca87c67dcb90c3a2e351ac6c5788af8747fe02f2724dad3953cf3f8c'
 };
 for(const [file,digest]of Object.entries(immutable))a.equal(crypto.createHash('sha256').update(read(file)).digest('hex'),digest,file);
});
test('network question bridge distinguishes metric and payload units while keeping publication timing qualified',()=>{
 const c=data.cards.find(c=>c.id==='cellfree-vq-compression-2026'),h=setup(),card=h.cards.find(x=>x.id==='guide-'+c.id),trail=card.querySelector('[data-context-trail]');
 a.equal(c.contextTrail.links.length,1);a.equal(c.contextTrail.links[0].guideId,'networks-cooperative-clusters-2024');a.equal(c.contextTrail.links[0].relationType,'problem-link');
 for(const phrase of ['Root CRLB','RMSE','每 AP 每次在线更新的比特数','更新频率、带宽及速率单位','不声称引用、算法继承或性能优越','训练/码本同步'])a.ok(trail.textContent.includes(phrase),phrase);
 a.equal(c.source.firstSubmittedAt,'2026-02-23T20:07:58Z');a.equal(c.source.versionAt,c.source.firstSubmittedAt);a.equal(c.source.checkedAt,'2026-10-11');
 a.ok(card.querySelector('[href="https://doi.org/10.1109/JSAC.2025.3613283"]'));
 a.match(card.querySelector('[class="guide-source"]').textContent,/不把它当作期刊首次发表日/);
 a.match(card.querySelector('[class="guide-currentness"]').textContent,/2026脉络.*固定版本：2026-02-23.*非最新保证/);
 const old=h.cards.find(x=>x.id==='guide-networks-cooperative-clusters-2024');a.ok(old.querySelector('[class="guide-onward"]').querySelector('[href="#'+card.id+'"]'));
 trail.open=true;card.querySelector('[data-visual-trace]').open=true;
 h.choose('receiver');h.search('no match');old.querySelector('[href="#'+card.id+'"]').fire('click');a.equal(card.hidden,false);a.equal(h.select.value,'networks');a.equal(trail.open,true);
 h.search('no match');trail.querySelector('[href="#'+old.id+'"]').fire('click');a.equal(old.hidden,false);a.equal(h.select.value,'networks');a.equal(trail.open,true);
 h.form.fire('reset');h.search('协作预算 观测表示');a.deepEqual(h.cards.filter(x=>!x.hidden).map(x=>x.id),[card.id]);a.equal(card.querySelector('[data-visual-trace]').open,true);
});

test('one frozen spatial frontier card preserves all nineteen existing complete guide records',()=>{
 const hash=d=>crypto.createHash('sha256').update(JSON.stringify(withoutSpatialFrontier(d),null,2)+'\n').digest('hex');
 const baseline='e73c1a092072100b345f1df53c566c45db590aee6c63bac2713479d2ffdb1515',before=JSON.stringify(data);
 a.equal(data.cards.length,20);a.equal(data.cards.at(-1).id,spatialGuideId);a.equal(hash(data),baseline);a.equal(JSON.stringify(data),before);
 for(const mutate of [d=>{d.cards[0].question+=' changed';},d=>{d.cards[0].visualTrace.title+=' changed';},d=>{d.cards[5].contextTrail.changedCondition+=' changed';},d=>{d.cards[5].source.publicationStatus+=' changed';},d=>{d.cards[16].contextTrail.links[0].verificationNote+=' changed';},d=>{d.cards[0].extra='unreviewed';}]){const d=structuredClone(data);mutate(d);a.notEqual(hash(d),baseline);}
 for(const mutate of [d=>{d.cards.at(-1).source.publicationStatus='Accepted';},d=>{d.cards.at(-1).visualTrace.steps[0].blocks[0].text='unreviewed';},d=>{d.cards.at(-1).contextTrail.links[0].relationType='direct-citation';},d=>{d.cards.push(structuredClone(d.cards.at(-1)));}]){const d=structuredClone(data);mutate(d);a.throws(()=>hash(d),/exact reviewed spatial|only one reviewed/);}
 a.deepEqual([data.cards.filter(c=>c.visualTrace).length,data.cards.filter(c=>c.contextTrail).length,registry.units.length,registry.cases.length,registry.knowledgeMap.progressions.length],[17,5,28,15,5]);
 a.ok(registry.knowledgeMap.progressions.every(p=>p.guideId!==spatialGuideId&&p.nextGuideId!==spatialGuideId));
});
test('spatial mapping guide keeps measured sampling, limited inference, baseline conditions and submission status explicit',()=>{
 const c=data.cards.at(-1),text=JSON.stringify(c);a.equal(c.source.url,'https://arxiv.org/pdf/2605.01162v1');a.equal(c.source.firstSubmittedAt,'2026-05-01T23:42:58Z');a.equal(c.source.versionAt,c.source.firstSubmittedAt);a.equal(c.source.checkedAt,'2026-10-11');a.match(c.source.publicationStatus,/投稿.*未核实接收或正式出版/);
 for(const phrase of ['28–30 GHz','750 个频点','720位置','不是720路同时接收','2019年的测量方法文献','基线已包含多跳和部分遮挡','约两倍','1.18 m','Table II','未给跨场景定位误差分布','不是通信收益证明','不唯一拆出二值可见性和衰减量','脚注6','式(15)、脚注8'])a.ok(text.includes(phrase),phrase);
 a.deepEqual(c.contextTrail.links.map(x=>[x.guideId,x.relationType]),[['nearfield-double-array-ispac','problem-link'],['nearfield-multitarget-correlation','problem-link']]);
 a.deepEqual(c.prerequisites.map(x=>x.href),['near-field.html#geometry','theory.html#shared-model','shared-array.html#objects']);
 const built=build().find(x=>x.id===spatialGuideId);a.equal(built.existingSourceCase,undefined);a.equal(built.notebook.id,'near-field');a.equal(c.visualTrace.steps[0].blocks[0].status,'observed');a.match(c.visualTrace.steps[0].blocks[0].label,/VNA\/虚拟阵列实测/);
 a.match(c.visualTrace.steps[2].explanation,/基线已处理多跳和部分遮挡/);a.match(c.visualTrace.steps[3].explanation,/Table II 的误差来自仿真，不能挪给场测/);
});
test('new spatial question, both backlinks and native disclosures use existing search and route recovery',()=>{
 const h=setup(),id='guide-'+spatialGuideId,card=h.cards.find(c=>c.id===id),trail=card.querySelector('[data-context-trail]'),trace=card.querySelector('[data-visual-trace]');a.equal(trail.open,false);a.equal(trace.open,false);
 h.choose('spatial');a.equal(h.cards.filter(c=>!c.hidden).length,3);h.search('GC-SAGE');a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),[id]);
 trail.open=true;trace.open=true;const answer=trace.querySelector('[class="trace-answer"]');a.equal(answer.open,false);answer.open=true;
 for(const oldId of ['nearfield-double-array-ispac','nearfield-multitarget-correlation']){
  const old=h.cards.find(c=>c.id==='guide-'+oldId),next=old.querySelector('[class="guide-onward"]');a.ok(next);a.ok(next.querySelector('[href="#'+id+'"]'));
  h.choose('networks');h.search('no match');next.querySelector('[href="#'+id+'"]').fire('click');
  a.equal(card.hidden,false);a.equal(h.select.value,'spatial');a.ok(trail.open&&trace.open&&answer.open);
  h.search('no match');trail.querySelector('[href="#'+old.id+'"]').fire('click');a.equal(old.hidden,false);a.equal(h.select.value,'spatial');
 }
 h.form.fire('reset');h.search('2026脉络');a.equal(h.cards.filter(c=>!c.hidden).length,5);a.equal(card.hidden,false);a.ok(trace.open&&answer.open);
 a.match(card.querySelector('[class="guide-currentness"]').textContent,/固定版本：2026-05-01.*非最新保证/);
 a.ok(card.querySelector('[href="practice.html?topic=near-field#notebook"]'));a.match(card.textContent,/已有机制的空白实验本/);
});
