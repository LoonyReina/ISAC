'use strict';
// Additive registry/navigation contracts, separate from numerical and browser validation.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {unit,page,hooks,withoutReferenceUncertainty,withoutReferencePrerequisite,prerequisiteHook}=require('./helpers/reference-uncertainty-registry.cjs');
const {withoutMapProgressions,withoutMapProgressionGenerator,withoutBuildLinkValidation}=require('./helpers/map-progression-preservation.cjs');
const {priorGuideSource}=require('./helpers/research-guide-trace-preservation.cjs');
const {createLearningEntryResolver}=require('../scripts/learning-entry.cjs');
const {buildNotebookTopics,notebookHref}=require('../scripts/notebook-topics.cjs');
const renderMap=require('../scripts/knowledge-map.cjs');
const {buildResearchGuides}=require('../scripts/research-guides.cjs');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const registry=JSON.parse(read('site/registry.json'));
const researchGuides=buildResearchGuides(JSON.parse(read(registry.researchGuidesFile)),registry);
const hash=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const baseline='c759bdb61a8ae539569b5ed526bf169793dace46510a381a998ffbd9264b56ae';
function resolve(href){
 const url=new URL(href,'https://isac.example/');a.equal(url.origin,'https://isac.example');
 const file=url.pathname.slice(1);a.ok(fs.existsSync(path.join(root,file)),href);
 if(url.hash)a.ok(read(file).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),href);
}
function region(html,key){
 for(const side of ['START','END'])a.equal(html.split(`<!-- SITE:${key}:${side} -->`).length,2,key+'/'+side);
 return html.split(`<!-- SITE:${key}:START -->`)[1].split(`<!-- SITE:${key}:END -->`)[0];
}

test('reference uncertainty adds one case-free mechanism and one page without inflating source evidence',()=>{
 a.deepEqual([registry.units.length,registry.cases.length,registry.pages.length,registry.directions.length,registry.knowledgeMap.nodes.length],[28,15,24,8,32]);
 a.deepEqual(registry.units.find(u=>u.id===unit.id),unit);a.deepEqual(registry.pages.find(p=>p.path===page.path),page);
 a.ok(!registry.cases.some(c=>c.unit===unit.id));a.ok(!Object.hasOwn(page,'case'));
 a.ok(!registry.knowledgeMap.nodes.some(n=>n.id===unit.id||n.unitRefs.includes(unit.id)));
 const guides=JSON.parse(read(registry.researchGuidesFile));a.equal(guides.cards.length,20);a.equal(guides.cards.filter(c=>c.visualTrace).length,20);
 a.equal(hash(priorGuideSource(guides)),'96ada0f0c6d048af19228c4a3f9e6e11855fc4d9a00930795d2af7953409a6cb');
 a.equal(hash(read(registry.researchDirectoryFile)),'95b0038bc1e110bd64efba999015f85eeeea2f63dceaea30cedc79fd1059f1b9');
});

test('exact additive normalization preserves the complete pre-experiment registry and does not mutate its input',()=>{
 const before=JSON.stringify(registry),preserved=withoutReferenceUncertainty(withoutMapProgressions(registry));
 a.equal(hash(preserved),baseline);a.equal(JSON.stringify(registry),before);
 a.deepEqual([preserved.units.length,preserved.cases.length,preserved.pages.length],[27,15,23]);
});

test('additive normalization rejects modified units, page contracts and exact direction hooks',()=>{
 const mutations=[
  r=>r.units.find(u=>u.id===unit.id).action+=' changed',
  r=>r.units.find(u=>u.id===unit.id).prerequisites.pop(),
  r=>r.pages.find(p=>p.path===page.path).next='practice.html#notebook',
  r=>r.pages.find(p=>p.path===page.path).case='case-pilot',
  r=>r.directions.find(d=>d.id==='receiver').levels.find(l=>l.id==='experiment').items.at(-1).note='论文复现',
  r=>r.directions.find(d=>d.id==='waveforms').levels.find(l=>l.id==='experiment').items.at(-1).scope='direction-specific',
  r=>r.directions.find(d=>d.id==='receiver').levels.find(l=>l.id==='experiment').items.push(structuredClone(hooks[0].item)),
  r=>r.units.unshift(r.units.pop())
 ];
 for(const mutate of mutations){const changed=structuredClone(registry);mutate(changed);a.throws(()=>withoutReferenceUncertainty(withoutMapProgressions(changed)));}
});

test('normalization cannot hide edits to old prose, sources, fields, links or same-href hooks elsewhere',()=>{
 const mutations=[
  r=>r.units[0].title+=' changed',r=>r.pages[0].role+=' changed',r=>r.cases[0].title+=' changed',
  r=>r.directions.find(d=>d.id==='receiver').coverage+=' changed',
  r=>r.directions.find(d=>d.id==='receiver').levels.find(l=>l.id==='papers').items[0].label+=' changed',
  r=>r.directions.find(d=>d.id==='receiver').levels.find(l=>l.id==='model').items.push(structuredClone(hooks[0].item)),
  r=>r.directions.find(d=>d.id==='channels').levels.find(l=>l.id==='experiment').items.push(structuredClone(hooks[0].item)),
  r=>r.knowledgeMap.nodes[0].unitRefs.push(unit.id),r=>r.legacy['index.html']['new-hook']=unit.href
 ];
 for(const mutate of mutations){const changed=structuredClone(registry);mutate(changed);a.notEqual(hash(withoutReferenceUncertainty(withoutMapProgressions(changed))),baseline);}
});

test('only two bounded direction experiment links are added without fabricated paper or reproduction layers',()=>{
 const actual=registry.directions.flatMap(d=>d.levels.flatMap(l=>l.items.filter(i=>i.href===unit.href).map(item=>({directionId:d.id,levelId:l.id,item}))));
 a.deepEqual(actual,[hooks[1],hooks[0]]);
 a.match(hooks[0].item.note,/同一复回波.*参考信息与处理样本数不同/);a.match(hooks[0].item.note,/不是半盲联合算法或论文复现/);
 a.equal(hooks[1].item.scope,'foundation-only');a.match(hooks[1].item.note,/没有 OTFS\/Zak-OTFS 波形或半盲联合恢复/);
});

test('canonical entry, shared shell and next reading destination resolve without a new case route',()=>{
 const entry=createLearningEntryResolver(registry);a.equal(entry.unitEntry(unit),unit.href);
 for(const href of [...unit.prerequisites,unit.href,page.next,...['experiment','model','limits','sources'].map(id=>page.path+'#'+id)])resolve(href);
 const html=read(page.path),header=region(html,'HEADER'),context=region(html,'CONTEXT'),next=region(html,'NEXT');
 a.ok(header.includes('href="experiments.html" aria-current="location"'));
 for(const href of unit.prerequisites)a.ok(context.includes(`href="${href}"`),href);
 a.doesNotMatch(context,/class="site-topic-nav"|reading\.html#case-reference/);
 a.ok(next.includes(`href="${page.next}">${page.nextLabel} →</a>`));
 for(const href of ['reference-uncertainty.html?view=1#experiment','reference-uncertainty.html#missing','https://example.test/reference-uncertainty.html#experiment','../reference-uncertainty.html#experiment']){
  a.throws(()=>entry.unitEntry({...unit,href}));
 }
});

test('native notebook projection and generated portals expose the mechanism without new export semantics',()=>{
 const topics=buildNotebookTopics(registry),topic=topics.find(t=>t.id===unit.id);a.equal(topics.length,28);
 a.deepEqual(topic,{id:unit.id,title:unit.title,question:unit.question,action:unit.action,teachingHref:unit.href,experimentHref:unit.href});
 a.equal(notebookHref(unit.id),'practice.html?topic=reference-uncertainty#notebook');
 const practice=read('practice.html'),embedded=JSON.parse(practice.match(/<script type="application\/json" id="notebook-topics">([\s\S]*?)<\/script>/)[1]);
 a.deepEqual(embedded,topics);a.ok(practice.includes('<option value="reference-uncertainty">参考不确定性与距离匹配</option>'));
 const home=read('index.html'),reading=read('reading.html');
 for(const file of ['index.html','experiments.html','reading.html'])a.ok(read(file).includes(`href="${unit.href}"`),file);
 a.ok(home.includes('<strong>28</strong> 个机制实验'));a.ok(home.includes(`data-map-unit="${unit.id}" href="${unit.href}"`));
 a.match(reading,/15 个已有主题/);a.match(reading,/20 篇问题式导读/);a.doesNotMatch(reading,/id="case-reference-uncertainty"/);
 const mapped=renderMap(registry,researchGuides);a.ok(mapped.includes(`data-map-unit="${unit.id}" href="${unit.href}"`));
 a.equal(hash(withoutBuildLinkValidation('scripts/learning-entry.cjs',read('scripts/learning-entry.cjs'))),'f7c2fcdeb49f2759f7de3537bfcdddfd3bb9a60abf4c58f27e31e6194b66d287');
 a.equal(hash(withoutBuildLinkValidation('scripts/notebook-topics.cjs',read('scripts/notebook-topics.cjs'))),'d542ae472a8ce50c3b1b8f7b4ee919f7dce1463777f7e27fe138c04269b29477');
 a.equal(hash(read('notebook.js')),'ea8698c44028c67c1cd9cd49a7d975a584d5f529f0768b272da2b457e507d4e9');
});

test('the reused off-grid numerical core and its existing UI remain byte-identical',()=>{
 a.equal(hash(read('offgrid-range-core.js')),'ae47307d87ea1295aba99f9bf4d284332d26a6454d9a0b37520c252eae9b17ab');
 a.equal(hash(read('offgrid-range.js')),'5499c80ebe0a638a7e5935a2022baf0800c55b13b506ebe4f0bc9dc27d6bd286');
});


test('generator changes only by the exact new prerequisite title, with old behavior still guarded',()=>{
 const generator=withoutBuildLinkValidation('scripts/generate-site.cjs',read('scripts/generate-site.cjs')),preserved=withoutReferencePrerequisite(withoutMapProgressionGenerator(generator));
 const expected='613b820c80dcac00fe18c4ae5b6a63c1eb044105245e69be5628767fa9c53479';
 a.equal(hash(preserved),expected);
 a.throws(()=>withoutReferencePrerequisite(generator.replace('离格测距的观测与模型','changed title')));
 a.throws(()=>withoutReferencePrerequisite(generator+prerequisiteHook));
 a.throws(()=>withoutReferencePrerequisite(generator.replace(prerequisiteHook,'')+prerequisiteHook));
 const unrelated=generator.replace('const notebookTopics=buildNotebookTopics(registry);','const notebookTopics=[];');
 a.notEqual(unrelated,generator);a.notEqual(hash(withoutReferencePrerequisite(withoutMapProgressionGenerator(unrelated))),expected);
});
