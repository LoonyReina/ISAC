'use strict';
// Executable paper entry, exact historical normalization and static-link checks.
// Numerical validation lives with the capacity–distortion core, not in this test.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {buildResearchGuides,renderResearchGuides,renderGuideDirectionLink,escapeHtml}=require('../scripts/research-guides.cjs');
const {createBuildLinkValidationContext}=require('../scripts/learning-entry.cjs');
const {executionGuideId,executable,statusClauses,executionRendererHooks,withoutCapacityExecution,withoutCapacityExecutionRenderer}=require('./helpers/capacity-execution-preservation.cjs');
const {withoutFrontierTraces}=require('./helpers/frontier-trace-preservation.cjs');
const {withoutBuildLinkValidation}=require('./helpers/map-progression-preservation.cjs');
const root=path.resolve(__dirname,'..'),read=f=>{const bytes=fs.readFileSync(path.join(root,f));return (f==='scripts/research-guides.cjs'?require('./helpers/cooperative-clusters-integration-preservation.cjs').withoutFile(f,bytes):bytes).toString();};
const registry=JSON.parse(read('site/registry.json')),data=JSON.parse(read(registry.researchGuidesFile));
const card=d=>d.cards.find(c=>c.id===executionGuideId),build=(d=data,context)=>buildResearchGuides(d,registry,context),render=d=>renderResearchGuides(build(d));
const isolated=()=>({schemaVersion:data.schemaVersion,cards:[structuredClone(card(data))]});
const article=(html,id=executionGuideId)=>{const marker='id="guide-'+id+'"';a.equal(html.split(marker).length,2,'one selected guide article');return html.slice(html.indexOf(marker)).split('</article>')[0];};
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
// Existing historical constants, not replacement hashes of changed site files.
const oldGuides='a0882017952882b3240c014c3ff59c255f9c7eee60c5e504a5a1a9265daf10ae';
const oldRenderer='54f29acc3441f7cca0e97a5fb293d798bb3958576de190c004331cc8020a536a';
const guideGuard=d=>a.equal(hash(JSON.stringify(withoutFrontierTraces(d),null,2)+'\n'),oldGuides);
const rendererGuard=s=>a.equal(hash(withoutBuildLinkValidation('scripts/research-guides.cjs',s)),oldRenderer);

test('one existing guide exposes a validated paper algorithm without spurious registry or map registrations',()=>{
 a.ok(Object.hasOwn(card(data),'executable'));
 a.deepEqual(card(data).executable,executable);
 a.ok(!registry.units.some(c=>c.id===executionGuideId));a.ok(!registry.cases.some(c=>c.id===executionGuideId));
 a.ok(!registry.knowledgeMap.progressions.some(p=>p.guideId===executionGuideId||p.nextGuideId===executionGuideId));
 a.equal((read('theory.html').match(/id="capacity-distortion"/g)||[]).length,1);
 a.equal(build().find(c=>c.id===executionGuideId).executable.href,'theory.html#capacity-distortion');
});

test('the single primary execution link is visible outside closed reading disclosures without JavaScript',()=>{
 const html=render(),published=read('reading.html');
 for(const source of [html,published]){
  const selected=article(source);
  a.equal((selected.match(/class="guide-executable-link"/g)||[]).length,1);
  a.equal((selected.match(/href="theory\.html#capacity-distortion"/g)||[]).length,1);
  a.match(selected,/<strong><a href="theory\.html#capacity-distortion" class="guide-executable-link">运行论文算法：容量–失真边界<\/a><\/strong>/);
  a.ok(selected.indexOf('class="guide-executable"')<selected.indexOf('<details'),'CTA precedes every closed disclosure');
  const cta=selected.match(/<div class="guide-executable">[^]*?<\/div>/)[0];
  a.doesNotMatch(cta,/hidden|<details|<button|<script|onclick|<canvas|<svg/);a.match(cta,/class="site-primary"/);
  for(const locator of executable.sourceLocators)a.ok(cta.includes('href="'+card(data).source.url+'">'+escapeHtml(locator)));
 }
});

test('execution coverage states actual finite-alphabet validation and explicitly excludes the remaining work',()=>{
 const c=card(data),e=c.executable;
 a.equal(e.kind,'validated-paper-algorithm');a.equal(e.coverage,'algorithm-and-selected-figure');
 a.match(e.summary,/有限字母修正Blahut–Arimoto算法/);a.match(e.summary,/Y=SX、Z=Y、q=0\.4/);a.match(e.summary,/图2/);a.match(e.summary,/解析式独立对照/);
 a.match(e.limitations,/高斯图3、有限块长通信编码与解码仍未实现/);a.match(e.limitations,/不代表整篇论文已复现/);
 a.match(c.evidence.kind,/本站已数值验证有限字母算法与二元图2/);
 for(const s of [c.limits[3],c.visualTrace.steps[3].explanation])a.match(s,/高斯图3与有限块长通信码仍未实现/);
 a.match(c.visualTrace.steps[3].explanation,/本阅读图仍只表示定性关系/);
 a.match(article(render()),/本图没有运行算法，也不是论文仿真曲线/);
 a.match(c.source.edition,/2026-10-11读取全文并核对PDF/);
 a.equal(c.source.url,'https://arxiv.org/pdf/1805.05713v1');
});

test('the optional reusable execution schema accepts omission and both bounded coverage types',()=>{
 const omitted=isolated();delete card(omitted).executable;
 a.doesNotThrow(()=>build(omitted));a.doesNotMatch(article(render(omitted)),/guide-executable-link/);
 for(const coverage of ['algorithm','algorithm-and-selected-figure']){
  const d=isolated();card(d).executable.coverage=coverage;a.doesNotThrow(()=>build(d));
 }
 const other=isolated(),copy={...executable,coverage:'algorithm',label:'运行另一项已验证算法'},otherId='other-validated-algorithm';
 const additional={...structuredClone(card(other)),id:otherId,directionId:'waveforms',executable:copy};
 delete card(other).executable;other.cards.push(additional);
 a.equal((article(render(other),otherId).match(/class="guide-executable-link"/g)||[]).length,1,'schema is reusable without hard-coded paper IDs');
 a.doesNotMatch(article(render(other)),/guide-executable-link/);
 a.match(renderGuideDirectionLink(build(other),'waveforms'),/算法覆盖以卡片标注为准/);
 a.match(renderGuideDirectionLink(build(other),'tradeoffs'),/阅读资源，不增加实验覆盖/);
 a.match(renderGuideDirectionLink(build(isolated()),'tradeoffs'),/算法覆盖以卡片标注为准/);
});

test('execution schema rejects null, arrays, missing fields, wrong types, unknown kinds and extra properties',()=>{
 const invalid=[null,[],{},'algorithm',true,1,
  {...executable,kind:'whole-paper-reproduction'}, {...executable,kind:['validated-paper-algorithm']},
  {...executable,coverage:'whole-paper'}, {...executable,coverage:'__proto__'}, {...executable,coverage:['algorithm']},
  {...executable,label:''}, {...executable,label:null}, {...executable,summary:3}, {...executable,summary:'x'.repeat(2001)},
  {...executable,limitations:{}}, {...executable,sourceLocators:[]}, {...executable,sourceLocators:'§IV'},
  {...executable,sourceLocators:[null]}, {...executable,sourceLocators:['']}, {...executable,sourceLocators:Array.from({length:9},(_,i)=>'§'+i)},
  {...executable,sourceLocators:['§IV','§IV']}, {...executable,sourceLocators:[{text:'§IV'}]}, {...executable,unreviewed:true}, {...executable,sourceUrl:'https://example.test/unreviewed'}
 ];
 for(const key of Object.keys(executable)){const e=structuredClone(executable);delete e[key];invalid.push(e);}
 for(const value of invalid){const d=isolated();card(d).executable=value;a.throws(()=>build(d),/Invalid|Missing/);}
 const undefinedField=isolated();card(undefinedField).executable=undefined;a.throws(()=>build(undefinedField),/Invalid research guide executable/);
 const duplicated=isolated();duplicated.cards.push(structuredClone(card(duplicated)));a.throws(()=>build(duplicated),/Invalid research guide identity/);
});

test('execution destinations must resolve to existing canonical local pages and fragments',()=>{
 for(const href of [null,1,{},[], '', 'theory.html','theory.html#','theory.html#missing-capacity-fragment','missing-capacity-page.html#capacity-distortion','https://example.test/theory.html#capacity-distortion','javascript:alert(1)','//example.test/theory.html#capacity-distortion','/theory.html#capacity-distortion','../theory.html#capacity-distortion','theory.html?x=1#capacity-distortion','theory.html#capacity-distortion\n','theory.html#%ZZ','theory.html#capacity-distortion" onclick="bad']){
  const d=isolated();card(d).executable.href=href;a.throws(()=>build(d),/Invalid|Missing/);
 }
});

test('deferred generation still rejects a missing execution target at the mandatory final link gate',()=>{
 const single=()=>{const c=structuredClone(card(data));delete c.visualTrace;c.prerequisites=[{href:'theory.html#shared-model',label:'模型'}];return {schemaVersion:1,cards:[c]};};
 for(const body of ['<h1 id="shared-model">模型</h1>','<h1 id="shared-model">模型</h1><div id="capacity-distortion"></div><p id="capacity-distortion"></p>']){
  const context=createBuildLinkValidationContext();a.doesNotThrow(()=>build(single(),context));
  a.throws(()=>context.validateOutputs(new Map([['theory.html',body]])),/Missing.*capacity-distortion|Duplicate rendered HTML ID/);
 }
 const context=createBuildLinkValidationContext();build(single(),context);
 a.doesNotThrow(()=>context.validateOutputs(new Map([['theory.html','<h1 id="shared-model">模型</h1><section id="capacity-distortion"></section>']])));
 const changed=single();card(changed).executable.href='theory.html#unrendered';a.throws(()=>build(changed,context),/Missing.*unrendered/);
 a.throws(()=>build(single(),{queueTarget(){},validateOutputs(){}}),/Invalid build link validation context/);
});

test('execution label, status text and source locators are escaped through the existing text-only path',()=>{
 const d=isolated(),e=card(d).executable,payload='<img src=x onerror="bad"> & \'quoted\'';
 for(const key of ['label','summary','limitations'])e[key]=key+payload;
 e.sourceLocators=['locator'+payload];const html=render(d),cta=article(html).match(/<div class="guide-executable">[^]*?<\/div>/)[0];
 for(const key of ['label','summary','limitations','locator'])a.ok(cta.includes(escapeHtml(key+payload)));
 a.doesNotMatch(cta,/<img|onerror="bad"|<script/);a.match(cta,/&lt;img/);a.match(cta,/&amp;/);a.match(cta,/&#39;/);
});

test('exact execution reversal restores historical guide and renderer hashes without mutating inputs',()=>{
 const before=JSON.stringify(data),prior=withoutCapacityExecution(data),c=card(prior);
 a.equal(JSON.stringify(data),before);a.ok(!Object.hasOwn(c,'executable'));
 a.equal(c.evidence.kind,statusClauses[0].before);a.equal(c.limits[3],statusClauses[1].before);a.equal(c.visualTrace.steps[3].explanation,statusClauses[2].before);
 guideGuard(data);rendererGuard(read('scripts/research-guides.cjs'));
 const unrelated=require('./helpers/nearfield-multitarget-preservation.cjs').maybeWithoutMultitargetGuides(data).cards.filter(c=>c.id!==executionGuideId);a.deepEqual(prior.cards.filter(c=>c.id!==executionGuideId),unrelated);
 const expected=structuredClone(card(data));delete expected.executable;expected.evidence.kind=statusClauses[0].before;expected.limits[3]=statusClauses[1].before;expected.visualTrace.steps[3].explanation=statusClauses[2].before;a.deepEqual(c,expected);
});

test('the exact data adapter rejects missing, duplicate, moved, malformed or changed execution additions',()=>{
 const mutations=[
  d=>{delete card(d).executable;},d=>{card(d).executable=null;},d=>{card(d).executable={};},
  d=>{d.cards.push(structuredClone(card(d)));},d=>{d.cards[0].executable=structuredClone(executable);},
  d=>{const c=card(d),{executable:e,...rest}=c;d.cards[d.cards.indexOf(c)]={executable:e,...rest};},
  d=>{card(d).nested={executable:card(d).executable};delete card(d).executable;},
  ...Object.keys(executable).map(k=>d=>{card(d).executable[k]=k==='sourceLocators'?['changed']:card(d).executable[k]+' changed';}),
  d=>{card(d).executable.unreviewed=true;},
  d=>{card(d).evidence.kind+=' changed';},d=>{card(d).limits[3]+=' changed';},d=>{card(d).visualTrace.steps[3].explanation+=' changed';},
  d=>{card(d).evidence.kind=statusClauses[0].before;},d=>{card(d).limits[3]=statusClauses[1].before;},d=>{card(d).visualTrace.steps[3].explanation=statusClauses[2].before;}
 ];
 for(const mutate of mutations){const d=structuredClone(data);mutate(d);a.throws(()=>withoutCapacityExecution(d));}
});

test('existing guide protection still catches unrelated scientific, source, trace, ordering and other-card changes',()=>{
 const mutations=[
  d=>{card(d).mechanism+=' changed';},d=>{card(d).innovation+=' changed';},d=>{card(d).evidence.summary+=' changed';},
  d=>{card(d).limits[0]+=' changed';},d=>{card(d).source.edition+=' changed';},d=>{card(d).source.url+='-changed';},
  d=>{card(d).source.checkedAt='2026-10-12';},d=>{card(d).prerequisites[0].label+=' changed';},
  d=>{card(d).visualTrace.steps[0].explanation+=' changed';},d=>{card(d).visualTrace.checkpoint.answer+=' changed';},
  d=>{d.cards[0].question+=' changed';},d=>{d.cards[0].visualTrace.title+=' changed';},d=>{d.cards[5].contextTrail.oldQuestion+=' changed';},
  d=>{d.cards[16].visualTrace.title+=' changed';},d=>{d.cards.push(d.cards.shift());},d=>{d.cards=d.cards.filter(c=>c.id!==executionGuideId);}
 ];
 for(const mutate of mutations){const d=structuredClone(data);mutate(d);a.throws(()=>guideGuard(d));}
});

test('exact renderer injections reject missing, changed, duplicate, reordered and relocated hooks',()=>{
 const source=read('scripts/research-guides.cjs'),prior=withoutCapacityExecutionRenderer(source);let injected=prior;
 for(const {before,after}of executionRendererHooks){a.equal(injected.split(before).length,2);injected=injected.replace(before,()=>after);}
 a.equal(injected,source);a.equal(executionRendererHooks.length,5);
 for(const {after}of executionRendererHooks){
  for(const mutated of [source.replace(after,''),source.replace(after,()=>after+' /* changed */'),source+after,after+source.replace(after,''),source.replace(after,'')+after])a.throws(()=>rendererGuard(mutated));
 }
 for(const [before,after]of [
  ["url.protocol!=='https:'","url.protocol!=='http:'"],
  ["trace.kind!=='qualitative-reading-trace'","trace.kind!=='simulation'"],
  ['本图没有运行算法，也不是论文仿真曲线。','本图已完成整篇论文复现。'],
  ['${escapeHtml(c.mechanism)}','${c.mechanism}'],
  ['class="guide-onward"','class="unreviewed"']
 ]){
  a.ok(source.includes(before),'targeted existing renderer byte');
  a.throws(()=>rendererGuard(source.replace(before,()=>after)));
 }
});
