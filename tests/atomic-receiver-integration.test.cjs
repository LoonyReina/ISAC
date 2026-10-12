'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {createLearningEntryResolver}=require('../scripts/learning-entry.cjs');
const {buildResearchGuides,renderResearchGuides}=require('../scripts/research-guides.cjs');
const {buildNotebookTopics}=require('../scripts/notebook-topics.cjs');
const {additions,withoutAtomicReceiverRegistry,withoutAtomicReceiverGuide,withoutAtomicReceiverHomeShell}=require('./helpers/atomic-receiver-preservation.cjs');
const r=JSON.parse(read('site/registry.json')),data=JSON.parse(read(r.researchGuidesFile)),page=read(additions.page.path);
const card=d=>d.cards.find(c=>c.id===additions.guideId),unit=x=>x.units.find(u=>u.id===additions.unit.id);

test('the actual finite-SDP lesson is a single canonical registered unit without invented cases or map associations',()=>{
 const before=JSON.stringify(r),guideBefore=JSON.stringify(data);a.deepEqual(unit(r),additions.unit);a.deepEqual(r.pages.find(p=>p.path===additions.page.path),additions.page);a.equal(r.units.filter(u=>u.id===additions.unit.id).length,1);a.equal(r.directions.find(d=>d.id==='receiver').coverage,additions.directionCoverage.after);
 a.ok(!r.cases.some(c=>c.unit===additions.unit.id));a.ok(!r.knowledgeMap.nodes.some(n=>n.unitRefs.includes(additions.unit.id)));a.ok(!r.knowledgeMap.progressions.some(p=>p.unitId===additions.unit.id));
 const local=createLearningEntryResolver(r);a.equal(local.unitEntry(unit(r)),additions.unit.href);
 for(const h of additions.hooks){a.deepEqual(r.directions.find(d=>d.id===h.directionId).levels.find(l=>l.id===h.levelId).items.at(-1),h.item);a.equal(local.unitEntry({href:h.item.href}),h.item.href);}
 const topic=buildNotebookTopics(r).find(t=>t.id===additions.unit.id);a.equal(topic.teachingHref,additions.unit.href);a.ok(!Object.hasOwn(topic,'evidenceHref'));
 for(const p of ['index.html','experiments.html','reading.html'])a.ok(read(p).includes(additions.unit.href),p);a.ok(read('practice.html').includes('"id":"atomic-ofdm-receiver"'));
 buildResearchGuides(data,r);a.equal(JSON.stringify(r),before);a.equal(JSON.stringify(data),guideBefore);
});

test('the fixed-v2 guide links the bounded live algorithm while retaining source-size and conditional-equivalence limits',()=>{
 const c=card(data);a.deepEqual(c.executable,additions.executable);a.equal(c.source.url,'https://arxiv.org/pdf/1610.04218v2');
 const html=renderResearchGuides(buildResearchGuides(data,r)),selected=html.split('id="guide-'+additions.guideId+'"')[1].split('</article>')[0];a.equal((selected.match(/class="guide-executable-link"/g)||[]).length,1);a.ok(selected.indexOf('guide-executable-link')<selected.indexOf('<details'));
 a.match(selected,/4×4有限二维Toeplitz SDP/);a.match(selected,/16×16/);a.match(selected,/596\.449/);a.match(selected,/450秒/);a.match(selected,/0\.995/);a.match(selected,/需另外的分解条件/);a.doesNotMatch(selected,/本站仅导读，未新增实验|本站没有实现该SDP|本站未实现该优化器/);
 a.equal(c.executable.coverage,'algorithm');a.ok(c.executable.sourceLocators.every(s=>s.startsWith('v2 ')));a.doesNotMatch(c.executable.sourceLocators.join(' '),/1505\.02510/);a.ok(page.includes('href="https://arxiv.org/pdf/1505.02510v3"'));a.match(page,/不是优化|没有频率字典网格/);a.match(page,/不能无条件断言/);a.match(page,/不是 BER/);a.match(page,/本站|本页/);
});

test('generated local navigation and notebook exit survive shell replacement with all six lesson anchors',()=>{
 const nav=page.match(/<nav class="site-topic-nav" aria-label="本主题学习路线">[^]*?<\/nav>/g);a.equal(nav.length,1);a.ok(page.indexOf(nav[0])>page.indexOf('<!-- SITE:CONTEXT:END -->'));
 for(const id of ['question','model','experiment','paper','limits','reproduce']){a.ok(nav[0].includes('href="#'+id+'"'));a.ok(page.includes('id="'+id+'"'));}
 a.ok(page.includes('practice.html?topic=atomic-ofdm-receiver#notebook'));a.ok(page.includes('reading.html#guide-'+additions.guideId));
});

test('the exact registration inverse preserves unrelated data and rejects malformed or moved additions',()=>{
 const before=JSON.stringify(r),prior=withoutAtomicReceiverRegistry(r);a.equal(JSON.stringify(r),before);a.deepEqual(prior.units,r.units.slice(0,-1));a.deepEqual(prior.pages,r.pages.slice(0,-1));
 for(const k of Object.keys(r).filter(k=>!['units','pages','directions'].includes(k)))a.deepEqual(prior[k],r[k]);
 for(const mutate of [x=>x.units.pop(),x=>x.pages.pop(),x=>x.units.push({...additions.unit}),x=>{unit(x).action+=' changed';},x=>{x.directions.find(d=>d.id==='receiver').coverage+=' changed';},x=>x.units.unshift(x.units.pop()),x=>{x.pages.at(-1).role+=' changed';},x=>{x.directions.find(d=>d.id==='receiver').levels[0].items.at(-1).note+=' changed';}]){const x=structuredClone(r);mutate(x);a.throws(()=>withoutAtomicReceiverRegistry(x));}
 const future=structuredClone(r);future.units[0].question+=' unrelated';a.equal(withoutAtomicReceiverRegistry(future).units[0].question,future.units[0].question);
});

test('the exact guide inverse strips only the executable and three factual coverage clauses',()=>{
 const before=JSON.stringify(data),prior=withoutAtomicReceiverGuide(data);a.equal(JSON.stringify(data),before);for(const c of data.cards)if(c.id!==additions.guideId)a.deepEqual(prior.cards.find(x=>x.id===c.id),c);
 const expected=structuredClone(card(data));delete expected.executable;for(const change of additions.guideChanges){let parent=expected;for(const k of change.path.slice(0,-1))parent=parent[k];parent[change.path.at(-1)]=change.before;}a.deepEqual(card(prior),expected);
 for(const mutate of [d=>delete card(d).executable,d=>{card(d).executable.coverage='algorithm-and-selected-figure';},d=>{card(d).evidence.kind+=' changed';},d=>{card(d).limits[3]+=' changed';},d=>{card(d).visualTrace.steps[3].explanation+=' changed';},d=>d.cards.push(structuredClone(card(d)))]){const d=structuredClone(data);mutate(d);a.throws(()=>withoutAtomicReceiverGuide(d));}
 const future=structuredClone(data);card(future).question+=' unrelated';a.equal(card(withoutAtomicReceiverGuide(future)).question,card(future).question);
});

test('the homepage count inverse is one exact additive lesson rather than a broad historical exemption',()=>{
 const count=r.units.length,html=`before<strong>${count}</strong> 个机制实验after`;a.equal(withoutAtomicReceiverHomeShell(html,count),`before<strong>${count-1}</strong> 个机制实验after`);a.throws(()=>withoutAtomicReceiverHomeShell(html+html,count));a.throws(()=>withoutAtomicReceiverHomeShell('missing',count));
});
