'use strict';
// Static route, source-derived rendering and exact preservation; not browser QA.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {buildResearchGuides,escapeHtml}=require('../scripts/research-guides.cjs');
const {createLearningEntryResolver}=require('../scripts/learning-entry.cjs');
const {withoutPilotContinuation,newNext,oldNext}=require('./helpers/pilot-continuation-preservation.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const registry=JSON.parse(read('site/registry.json')),data=JSON.parse(read(registry.researchGuidesFile)),generator=read('scripts/generate-site.cjs'),page=registry.pages.find(p=>p.path==='pilot-design.html');
const helper=generator.slice(generator.indexOf('function pilotReadingContinuation(page){'),generator.indexOf('function next(page){'));
function render(r=registry,d=data,p=page){const env={registry:r,researchGuides:buildResearchGuides(d,r),learningEntries:createLearningEntryResolver(r),page:p};vm.runInNewContext(generator.match(/^const esc=.*$/m)[0]+'\n'+generator.match(/^const link=.*$/m)[0]+'\n'+helper+'\noutput=pilotReadingContinuation(page);',env);return env.output;}
const next=read('pilot-design.html').split('<!-- SITE:NEXT:START -->')[1].split('<!-- SITE:NEXT:END -->')[0];
const route=r=>r.knowledgeMap.progressions.find(p=>p.nodeId==='known-pilots'),guide=d=>d.cards.find(c=>c.id===route(registry).guideId),newer=d=>d.cards.find(c=>c.id===route(registry).nextGuideId);

test('pilot NEXT closes the existing question-to-paper route and keeps the notebook secondary',()=>{
 const before=JSON.stringify({registry,data}),output=render(),g=guide(data),n=newer(data),relation=n.contextTrail.links.find(e=>e.guideId===g.id);
 a.ok(next.includes(output));a.match(output,/刚才的导频值是已知的；如果参考符号本身出错呢？/);a.match(output,/所选导频值视为可靠已知.*解调得到的参考符号若有误/);a.match(output,/不表示本页实现了论文算法/);
 for(const [id,title]of [[g.id,g.title],[n.id,n.title]])a.ok(output.includes(`href="reading.html#guide-${id}">${escapeHtml(title)}`));
 a.ok(output.includes(escapeHtml(n.nextQuestion)));a.ok(output.includes(escapeHtml(relation.verificationNote)));a.match(output,/本站按问题关联（非引用关系）/);a.match(output,/尚待检验的下一问/);a.doesNotMatch(output,/作者把本页|继承了.*算法|reference-uncertainty/);
 const first=next.indexOf('reading.html#guide-'+g.id),second=next.indexOf('reading.html#guide-'+n.id),notebook=next.indexOf('reading.html?topic=pilot#notebook');a.ok(first>=0&&first<second&&second<notebook);a.match(next,/也可先记录这次观察/);a.ok(next.includes(page.nextLabel));
 for(const [,href]of next.matchAll(/href="([^"]+)"/g)){const u=new URL(href,'https://site.invalid/');a.equal(u.origin,'https://site.invalid');const f=u.pathname.slice(1);a.ok(fs.existsSync(path.join(root,f)));if(u.hash)a.ok(read(f).includes(`id="${u.hash.slice(1)}"`),href);}
 for(const p of registry.pages.filter(p=>p.path!==page.path))a.equal(render(registry,data,p),'');
 a.equal(JSON.stringify({registry,data}),before,'rendering does not mutate source records');
});

test('continuation rejects broken or ambiguous existing memberships, guide targets and problem-link relations',()=>{
 const rm=[r=>{r.knowledgeMap.progressions=r.knowledgeMap.progressions.filter(p=>p.nodeId!=='known-pilots');},r=>r.knowledgeMap.progressions.push({...route(r)}),r=>{route(r).unitId='array';},r=>{route(r).guideId='missing-guide';},r=>{route(r).nextGuideId='missing-guide';},r=>{r.knowledgeMap.nodes.find(n=>n.id==='known-pilots').unitRefs=[];},r=>{r.units.find(u=>u.id==='pilot').href='pilot-design.html#model';}];
 for(const mutate of rm){const r=structuredClone(registry);mutate(r);a.throws(()=>render(r),/Invalid|Missing/);}
 for(const mutate of [d=>{guide(d).prerequisites=guide(d).prerequisites.filter(p=>p.href!=='pilot-design.html#experiment');},d=>{newer(d).contextTrail.links=newer(d).contextTrail.links.filter(e=>e.guideId!==guide(d).id);},d=>{newer(d).contextTrail.links.find(e=>e.guideId===guide(d).id).relationType='direct-citation';},d=>{d.cards.push(structuredClone(guide(d)));},d=>{newer(d).contextTrail.links.push({...newer(d).contextTrail.links.at(-1)});},d=>{guide(d).source.url='javascript:bad()';}]){const d=structuredClone(data);mutate(d);a.throws(()=>render(registry,d),/Invalid|Duplicate/);}
});

test('titles, proposed next question and relationship note are source-derived and safely escaped',()=>{
 const d=structuredClone(data),attack='<img src=x onerror=bad()> & "quoted"';guide(d).title=attack;newer(d).title='new '+attack;newer(d).nextQuestion='question '+attack;newer(d).contextTrail.links.find(e=>e.guideId===guide(d).id).verificationNote='relation '+attack;
 const output=render(registry,d);a.doesNotMatch(output,/<img|onerror="bad|<script/);for(const prefix of ['','new ','question ','relation '])a.ok(output.includes(prefix+'&lt;img src=x onerror=bad()> &amp; &quot;quoted&quot;'));
 a.ok(output.includes('reading.html#guide-'+guide(d).id));a.ok(output.includes('reading.html#guide-'+newer(d).id));a.equal(JSON.stringify(data).includes(attack),false);
});

test('exact next-only generator normalization retains prior hash and rejects unrelated or relocated edits',()=>{
 const source=require('./helpers/nearfield-research-preservation.cjs').maybeWithoutNearfieldPrerequisiteTitle(require('./helpers/two-section-navigation-preservation.cjs').withoutFile('scripts/generate-site.cjs',Buffer.from(generator)).toString());
 // Current publication baseline 6dffedc includes the approved deferred validation.
 const original='2e93164c68fc94dc605db5c51a647fee4011ef48e06fa9fa4ca11b0308f15f27';a.equal(hash(withoutPilotContinuation(source)),original);
 for(const mutate of [s=>s.replace('本页把所选导频值视为可靠已知','changed scientific boundary'),s=>s.replace("page.path!=='pilot-design.html'","page.path!=='shared-array.html'"),s=>s.replace(helper,''),s=>s+helper,s=>s.replace(newNext,''),s=>s+newNext,s=>s.replace(newNext,'')+newNext,s=>s.replace(helper,'')+helper,s=>s.replace("page.nextLabel+' →'","'changed generic next label'"),s=>s.replace("link('reading.html#reading','原文与证据')","link('reading.html#reading','changed footer')")]){const changed=mutate(source);a.notEqual(changed,source);a.throws(()=>withoutPilotContinuation(changed));}
 const unrelated=source.replace('const notebookTopics=buildNotebookTopics(registry,linkValidation);','const notebookTopics=[];');a.notEqual(hash(withoutPilotContinuation(unrelated)),original);
});

test('pilot scientific body and source prose are unchanged outside its generated NEXT',()=>{
 // Fingerprints were obtained from HEAD 6dffedc source bytes via git show and
 // the compatibility manifest, then one clean seedless generator invocation.
 const strip=s=>{a.equal(s.split('<!-- SITE:NEXT:START -->').length,2);a.equal(s.split('<!-- SITE:NEXT:END -->').length,2);return s.replace(/<!-- SITE:NEXT:START -->[\s\S]*?<!-- SITE:NEXT:END -->/,'<!-- NEXT omitted -->');};
 const historical=require('./helpers/pilot-pattern-preservation.cjs').withoutPage(require('./helpers/two-section-navigation-preservation.cjs').withoutFile('pilot-design.html',Buffer.from(read('pilot-design.html'))).toString()),body=strip(historical);a.equal(hash(body),'e8f6ce86d1bd1c6d9836bace62b94e4fad7ff90f2c72d903a47440b4517ccb5d');a.notEqual(hash(strip(historical.replace('已知非零导频 X[k]','changed assumption'))),'e8f6ce86d1bd1c6d9836bace62b94e4fad7ff90f2c72d903a47440b4517ccb5d');
});

test('the continuation leaves the generic NEXT rendering unchanged on every other current page',()=>{
 const {notebookHref}=require('../scripts/notebook-topics.cjs');
 const definitions=generator.match(/^const esc=.*$/m)[0]+'\n'+generator.match(/^const link=.*$/m)[0];
 const evaluate=(definition,p)=>{const env={page:p,caseFor:id=>registry.cases.find(c=>c.id===id),notebookHref};vm.runInNewContext(definitions+'\n'+helper+'\n'+definition+'\noutput=next(page);',env);return env.output;};
 for(const p of registry.pages.filter(p=>p.path!==page.path))a.equal(evaluate(newNext,p),evaluate(oldNext,p),p.path);
});
