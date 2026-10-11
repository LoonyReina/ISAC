'use strict';
// Exercise the real generator without rewriting shared static deployment files.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const registry=JSON.parse(read('site/registry.json'));
const {createLearningEntryResolver}=require('../scripts/learning-entry.cjs');
const esc=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
function generator(r=registry){
 const registryFile=path.join(root,'site/registry.json');
 const readonlyFs={...fs,readFileSync(file,...args){return file===registryFile?JSON.stringify(r):fs.readFileSync(file,...args);},writeFileSync(){throw new Error('Generator test must not write deployment files');}};
 const sandbox={__dirname:path.join(root,'scripts'),require:id=>id==='node:fs'?readonlyFs:require(id),process:{argv:['node','generate-site.cjs','--check']},console:{log(){}}};
 return vm.runInNewContext(read('scripts/generate-site.cjs')+'\n;({experimentCard,readingCard,context,prerequisiteLink});',sandbox,{filename:'generate-site.cjs'});
}
const headingHref=html=>html.match(/<h3(?: [^>]*)?><a href="([^"]+)"/)[1];
const hasLink=(html,href,label)=>a.ok(html.includes(`<a href="${esc(href)}">${label}</a>`),`${href}: ${label}`);

test('generic experiment and reading titles use canonical teaching entries while explicit routes stay specific',()=>{
 const render=generator(),entries=createLearningEntryResolver(registry);
 for(const unit of registry.units){
  const card=render.experimentCard(unit),topic=registry.cases.find(c=>c.unit===unit.id);
  a.equal(headingHref(card),entries.unitEntry(unit),unit.id);
  hasLink(card,unit.href,'进入实验 →');
  if(topic)hasLink(card,'reading.html#'+topic.id,'原文与证据');
 }
 for(const topic of registry.cases){
  const card=render.readingCard(topic),unit=registry.units.find(u=>u.id===topic.unit);
  a.equal(headingHref(card),entries.caseEntry(topic),topic.id);
  hasLink(card,unit.href,'先动手机制实验');
  hasLink(card,topic.paper,'逐项对照原文');
  hasLink(card,topic.next,'检查边界与下一问');
 }
});

test('generic titles preserve legacy unit fallbacks when a case has no learningEntry',()=>{
 const r=structuredClone(registry);for(const topic of r.cases)delete topic.learningEntry;
 const render=generator(r);
 for(const topic of r.cases){
  const unit=r.units.find(u=>u.id===topic.unit);
  a.equal(headingHref(render.experimentCard(unit)),unit.href,unit.id);
  a.equal(headingHref(render.readingCard(topic)),unit.href,topic.id);
  hasLink(render.readingCard(topic),topic.paper,'逐项对照原文');
 }
});

test('both catalogs follow a changed learningEntry instead of hard-coding a question or experiment anchor',()=>{
 const r=structuredClone(registry),topic=r.cases.find(c=>c.id==='case-waveform'),unit=r.units.find(u=>u.id===topic.unit);
 topic.learningEntry='waveform-design.html#model';
 const render=generator(r);
 a.equal(headingHref(render.experimentCard(unit)),topic.learningEntry);
 a.equal(headingHref(render.readingCard(topic)),topic.learningEntry);
 hasLink(render.experimentCard(unit),unit.href,'进入实验 →');
 hasLink(render.readingCard(topic),topic.paper,'逐项对照原文');
});

test('prerequisite links name their subjects consistently in cards and shared page context',()=>{
 const render=generator(),subjects={
  ...Object.fromEntries(registry.units.map(u=>[u.href,u.title])),
  'foundations.html#start':'基础讲义的起点与学习约定',
  'foundations.html#limits':'性能指标与边界',
  'foundations.html#ofdm-basics':'OFDM 通信基础',
  'foundations.html#codesign':'发射、接收与联合设计',
  'waveform-design.html#model':'发射块与波形设计约束'
 };
 for(const [items,renderItem]of [[registry.units,render.experimentCard],[registry.pages,render.context]])for(const item of items){
  const html=renderItem(item);
  for(const href of item.prerequisites){a.ok(subjects[href],href);hasLink(html,href,esc(subjects[href]));}
  a.doesNotMatch(html,/>回看相关观测与假设<|>相关基础</);
 }
 // New prerequisites must acquire a meaningful label instead of silently becoming generic links.
 a.throws(()=>render.prerequisiteLink('foundations.html#unlabeled-subject'),/Missing prerequisite subject/);
});
