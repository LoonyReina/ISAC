const {withoutGCSAGERegistry}=require('./helpers/gc-sage-preservation.cjs');
'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {buildNotebookTopics,notebookHref,renderNotebookOptions,renderNotebookData}=require('../scripts/notebook-topics.cjs');
const {createLearningEntryResolver}=require('../scripts/learning-entry.cjs');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const registry=JSON.parse(read('site/registry.json'));
const esc=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const hasLink=(html,href,label)=>a.ok(html.includes(`<a href="${esc(href)}">${label}</a>`),`${href}: ${label}`);

// Run the real generator into memory. Never regenerate shared deployment files.
function generator(r=registry,template=read('site/content-practice.html')){
 const outputs=new Map(),registryFile=path.join(root,'site/registry.json'),templateFile=path.join(root,'site/content-practice.html');
 const memoryFs={...fs,readFileSync(file,...args){return file===registryFile?JSON.stringify(r):file===templateFile?template:fs.readFileSync(file,...args);},writeFileSync(file,value){outputs.set(path.relative(root,file),value);}};
 const sandbox={__dirname:path.join(root,'scripts'),require:id=>id==='node:fs'?memoryFs:require(id),process:{argv:['node','generate-site.cjs']},console:{log(){}}};
 const render=vm.runInNewContext(read('scripts/generate-site.cjs')+'\n;({context,next,readingCard,notebookTopics});',sandbox,{filename:'generate-site.cjs'});
 return {...render,output:file=>outputs.get(file)||read(file)};
}

test('all notebook topics are canonical projections of the single registry',()=>{
 const before=JSON.stringify(registry),topics=buildNotebookTopics(registry),entries=createLearningEntryResolver(registry);
 a.equal(withoutGCSAGERegistry(registry).units.length,28);a.equal(topics.length,registry.units.length);a.equal(require('./helpers/otfs-receiver-preservation.cjs').withoutOtfsRegistry(registry).cases.length,15);
 a.deepEqual(topics.map(topic=>topic.id),registry.units.map(unit=>unit.id));
 for(const [index,unit]of registry.units.entries()){
  const topic=topics[index],source=registry.cases.find(c=>c.unit===unit.id);
  a.deepEqual(topic,{id:unit.id,title:unit.title,question:unit.question,action:unit.action,
   teachingHref:entries.unitEntry(unit),experimentHref:unit.href,
   ...(source?{evidenceHref:source.paper,boundaryHref:source.next}:{})});
 }
 a.equal(JSON.stringify(registry),before);
 const r=structuredClone(registry),unit=r.units.find(u=>u.id==='waveform-design'),source=r.cases.find(c=>c.unit===unit.id);
 unit.title='改变后的注册标题';unit.question='新的注册问题？';unit.action='新的注册动作。';
 source.learningEntry='waveform-design.html#model';source.paper='waveform-design.html#limits';source.next='waveform-design.html#paper';
 const updated=buildNotebookTopics(r).find(topic=>topic.id===unit.id);
 a.equal(updated.title,unit.title);a.equal(updated.question,unit.question);a.equal(updated.action,unit.action);
 a.equal(updated.teachingHref,source.learningEntry);a.equal(updated.experimentHref,unit.href);
 a.equal(updated.evidenceHref,source.paper);a.equal(updated.boundaryHref,source.next);
 delete source.learningEntry;
 a.equal(buildNotebookTopics(r).find(topic=>topic.id===unit.id).teachingHref,unit.href);
});

test('topic IDs use the bounded lowercase unit grammar rather than arbitrary query strings',()=>{
 for(const id of ['echo','waveform-design','a1-b2','a'.repeat(64)])a.equal(notebookHref(id),'practice.html?topic='+id+'#notebook');
 for(const id of ['',null,42,'Echo','x_y','-echo','echo-','echo--one','echo\n','echo\r','echo?x=1','echo#notebook','%65cho','回波','a'.repeat(65)]){
  a.throws(()=>notebookHref(id),/Invalid notebook unit ID/,String(id));
  const r=structuredClone(registry);r.units[0].id=id;
  a.throws(()=>buildNotebookTopics(r),/Invalid notebook unit ID/,String(id));
 }
 const duplicate=structuredClone(registry);duplicate.units.push({...duplicate.units[0]});
 a.throws(()=>buildNotebookTopics(duplicate),/Duplicate notebook unit ID/);
 const unknown=structuredClone(registry);unknown.cases[0].unit='missing-unit';
 a.throws(()=>buildNotebookTopics(unknown),/Invalid notebook case unit reference/);
 const doubleCase=structuredClone(registry);doubleCase.cases.push({...doubleCase.cases[0]});
 a.throws(()=>buildNotebookTopics(doubleCase),/Duplicate notebook case unit reference/);
});

test('all notebook reference fields reject queries, nonlocal URLs and missing targets',()=>{
 for(const invalid of ['javascript:alert(1)','https://example.test/theory.html#research-method','../theory.html#research-method','theory.html?topic=crb#research-method','theory.html#missing-topic-anchor','theory.html#research-method\n']){
  for(const field of ['paper','next','learningEntry']){
   const r=structuredClone(registry);r.cases.find(c=>c.id==='case-crb')[field]=invalid;
   a.throws(()=>buildNotebookTopics(r),/entry|Entry/,field+': '+invalid);
  }
  const r=structuredClone(registry);r.units.find(u=>u.id==='echo').href=invalid;
  a.throws(()=>buildNotebookTopics(r),/entry/,invalid);
 }
 // A valid case learning entry must not hide a corrupt explicit experiment href.
 const badExperiment=structuredClone(registry);badExperiment.units.find(u=>u.id==='waveform-design').href='waveform-design.html#missing-experiment-anchor';
 a.throws(()=>buildNotebookTopics(badExperiment),/unit learning entry/);
 const r=structuredClone(registry);r.cases.find(c=>c.id==='case-crb').learningEntry='theory.html?topic=crb#research-method';
 a.throws(()=>createLearningEntryResolver(r).caseEntry(r.cases.find(c=>c.id==='case-crb')),/Invalid case learningEntry/);
});

test('generated options and JSON cannot cross HTML or script boundaries',()=>{
 const r=structuredClone(registry),payload='</option><script>"&\'<!--</script>\u2028\u2029';
 r.units[0].title=payload;r.units[0].question=payload;r.units[0].action=payload;
 const topics=buildNotebookTopics(r),options=renderNotebookOptions(topics),script=renderNotebookData(topics);
 a.equal([...options.matchAll(/<option value=/g)].length,registry.units.length);
 a.doesNotMatch(options,/<script|<!--/);
 a.match(options,/&lt;\/option&gt;&lt;script&gt;&quot;&amp;&#39;&lt;!--&lt;\/script&gt;/);
 a.equal([...script.matchAll(/<\/script>/g)].length,1);
 const json=script.match(/^<script type="application\/json" id="notebook-topics">([\s\S]*)<\/script>$/)[1];
 a.doesNotMatch(json,/[<>&\u2028\u2029]/);
 a.deepEqual(JSON.parse(json),topics);
});

test('practice generation fills both placeholders and includes notebook assets only there',()=>{
 const render=generator(),practice=render.output('practice.html'),topics=buildNotebookTopics(registry);
 a.doesNotMatch(practice,/<!-- NOTEBOOK:(?:OPTIONS|TOPICS) -->/);
 const json=practice.match(/<script type="application\/json" id="notebook-topics">([\s\S]*?)<\/script>/)[1];
 a.deepEqual(JSON.parse(json),topics);
 const select=practice.match(/<select[^>]+id="notebook-topic"[^>]*>([\s\S]*?)<\/select>/)[1];
 a.equal([...select.matchAll(/<option value="[^"]+"/g)].length,registry.units.length);
 for(const topic of topics)a.ok(select.includes(`<option value="${topic.id}">`),topic.id);
 for(const page of registry.pages){
  const html=render.output(page.path);
  for(const asset of ['notebook.js?v=guided-notebook-v1','notebook.css?v=guided-notebook-v1'])a.equal(html.includes(asset),page.path==='practice.html',page.path+': '+asset);
 }
 const template=read('site/content-practice.html');
 for(const marker of ['<!-- NOTEBOOK:OPTIONS -->','<!-- NOTEBOOK:TOPICS -->']){
  a.throws(()=>generator(registry,template.replace(marker,'')),/Expected one/);
  a.throws(()=>generator(registry,template+marker),/Expected one/);
 }
});

test('each case page receives its unit query in context and only eligible next links',()=>{
 const before=JSON.stringify(registry),render=generator();
 for(const page of registry.pages.filter(page=>page.case)){
  const source=page.path==='pilot-design.html'?{unit:'pilot',paper:'pilot-design.html#case',next:'pilot-design.html#reproduce'}:registry.cases.find(c=>c.id===page.case),href=notebookHref(source.unit),html=render.output(page.path);
  const context=html.match(/<!-- SITE:CONTEXT:START -->([\s\S]*?)<!-- SITE:CONTEXT:END -->/)[1];
  hasLink(context,href,'④ 记录一次研究');
  hasLink(context,source.paper,'② 原文与证据');hasLink(context,source.next,'③ 边界与下一问');
  const next=html.match(/<!-- SITE:NEXT:START -->([\s\S]*?)<!-- SITE:NEXT:END -->/)[1];
  hasLink(next,page.next==='practice.html#notebook'?href:page.next,page.nextLabel+' →');
 }
 a.equal(JSON.stringify(registry),before);
 const eligible={case:'case-pilot',next:'practice.html#notebook',nextLabel:'记录'};
 hasLink(render.next(eligible),notebookHref('pilot-pattern'),'记录 →');
 for(const page of [{...eligible,case:undefined},{...eligible,case:'unknown-case'},{...eligible,next:'practice.html'},{...eligible,next:'practice.html#research-method'},{...eligible,next:'practice.html?view=1#notebook'},{...eligible,next:'reading.html#case-pilot'}])hasLink(render.next(page),page.next,'记录 →');
 const theory=registry.pages.find(page=>page.path==='theory.html');
 hasLink(render.next(theory),theory.next,theory.nextLabel+' →');
 a.doesNotMatch(render.output('theory.html'),/practice\.html\?topic=crb#notebook/);
});

test('all reading cards, including CRB on theory, offer contextual recording without changing generic routes',()=>{
 const render=generator(),reading=render.output('reading.html');
 for(const source of registry.cases){
  const card=render.readingCard(source);
  hasLink(card,notebookHref(source.unit),'记录这个问题');
  hasLink(card,source.paper,'逐项对照原文');hasLink(card,source.next,'检查边界与下一问');
  a.ok(reading.includes(card),source.id);
 }
 const crb=registry.cases.find(c=>c.id==='case-crb');
 hasLink(render.readingCard(crb),'practice.html?topic=crb#notebook','记录这个问题');
 for(const page of ['index.html','experiments.html'])a.doesNotMatch(render.output(page),/practice\.html\?topic=/,page);
 const readingPage=registry.pages.find(page=>page.path==='reading.html');
 hasLink(render.next(readingPage),'practice.html',readingPage.nextLabel+' →');
 for(const direction of registry.directions)for(const level of direction.levels)for(const item of level.items)if(item.status==='available'&&item.href.startsWith('practice.html'))hasLink(reading,item.href,item.label);
});
