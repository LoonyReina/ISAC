'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createLearningEntryResolver}=require('../scripts/learning-entry.cjs');
const {buildResearchGuides}=require('../scripts/research-guides.cjs');
const root=path.resolve(__dirname,'..'),registry=JSON.parse(fs.readFileSync(path.join(root,'site/registry.json'),'utf8'));
const renderMap=require('../scripts/knowledge-map.cjs'),{renderResearchDirectory}=require('../scripts/render-research-directory.cjs');
const data=JSON.parse(fs.readFileSync(path.join(root,registry.researchDirectoryFile),'utf8'));
const researchGuides=buildResearchGuides(JSON.parse(fs.readFileSync(path.join(root,registry.researchGuidesFile),'utf8')),registry);

test('shared build-time resolver gives learningEntry precedence and validates canonical case-free fallbacks',()=>{
 const resolver=createLearningEntryResolver(registry);
 for(const c of registry.cases){const u=registry.units.find(u=>u.id===c.unit);a.equal(resolver.caseEntry(c),c.learningEntry||u.href);a.equal(resolver.unitEntry(u),c.learningEntry||u.href);}
 for(const u of registry.units.filter(u=>!registry.cases.some(c=>c.unit===u.id)))a.equal(resolver.unitEntry(u),u.href);
 const r=structuredClone(registry),c=r.cases.find(c=>c.id==='case-waveform'),u=r.units.find(u=>u.id===c.unit);
 c.learningEntry='waveform-design.html#model';a.equal(createLearningEntryResolver(r).unitEntry(u),c.learningEntry);
 delete c.learningEntry;a.equal(createLearningEntryResolver(r).unitEntry(u),u.href);
 c.learningEntry='waveform-design.html#%69ntuition';a.equal(createLearningEntryResolver(r).caseEntry(c),c.learningEntry);
});

test('map and influence renderer both enforce the same case learning-entry validation',()=>{
 for(const href of [null,42,'','https://example.test/waveform-design.html#intuition','//example.test/waveform-design.html#intuition','javascript:alert(1)','../waveform-design.html#intuition','./waveform-design.html#intuition','sub/../waveform-design.html#intuition','%2e%2e/waveform-design.html#intuition','waveform-design.html?view=1#intuition','waveform-design.html','waveform-design.html#','waveform-design.html#missing-anchor','waveform-design.html#%ZZ','waveform-design.html#intuition#model','waveform-design.html#intuition\n','waveform-design.html\\#intuition','joint-beamforming.html#intuition']){
  const r=structuredClone(registry);r.cases.find(c=>c.id==='case-waveform').learningEntry=href;
  a.throws(()=>renderMap(r,researchGuides),/case learningEntry/,JSON.stringify(href));
  a.throws(()=>renderResearchDirectory(data,r,()=>true),/case learningEntry/,JSON.stringify(href));
 }
 const r=structuredClone(registry),c=r.cases.find(c=>c.id==='case-waveform');c.unit='missing-unit';a.throws(()=>createLearningEntryResolver(r).caseEntry(c),/Invalid case unit reference/);
});

test('invalid and missing unit fallbacks are rejected before a direct lesson entry is generated',()=>{
 for(const href of ['https://example.test/foundations.html#iq','../foundations.html#iq','foundations.html?view=1#iq','foundations.html#missing-anchor','foundations.html#%ZZ','foundations.html#iq\n','missing-page.html#iq']){
  const r=structuredClone(registry),u=r.units.find(u=>u.id==='iq');u.href=href;
  a.throws(()=>createLearningEntryResolver(r).unitEntry(u),/unit learning entry/);
  a.throws(()=>renderMap(r,researchGuides),/unit learning entry/);
 }
 const r=structuredClone(registry),c=r.cases.find(c=>c.id==='case-pilot'),unit=r.units.find(u=>u.id===c.unit);delete c.learningEntry;unit.href=unit.href.split('#')[0]+'#missing-anchor';a.throws(()=>renderMap(r,researchGuides),/case unit entry/);
});

const {createBuildLinkValidationContext}=require('../scripts/learning-entry.cjs');

test('explicit build context accepts a newly rendered canonical anchor without weakening standalone validation',()=>{
 const r={units:[{id:'new-build-unit',href:'new-build-page.html#fresh'}],cases:[{id:'new-build-case',unit:'new-build-unit',learningEntry:'new-build-page.html#%66resh'}]};
 a.equal(fs.existsSync(path.join(root,'new-build-page.html')),false);
 a.throws(()=>createLearningEntryResolver(r).caseEntry(r.cases[0]),/Missing case learningEntry page/);
 const context=createBuildLinkValidationContext(),resolver=createLearningEntryResolver(r,context);
 a.equal(resolver.caseEntry(r.cases[0]),'new-build-page.html#%66resh');
 a.equal(resolver.unitEntry(r.units[0]),'new-build-page.html#%66resh');
 context.validateOutputs(new Map([['new-build-page.html','<!doctype html><main id="fresh"><a href="#%66resh">Fresh</a></main>']]));
 a.equal(resolver.unitEntry(r.units[0]),'new-build-page.html#%66resh');
 a.throws(()=>resolver.unitEntry({href:'new-build-page.html#missing'}),/Missing unit learning entry fragment/);
 a.throws(()=>context.validateOutputs(new Map()),/already complete/);
});

test('deferred resolver still rejects malformed and noncanonical entries before rendering',()=>{
 const r={units:[{id:'new-build-unit',href:'new-build-page.html#fresh'}],cases:[{id:'new-build-case',unit:'new-build-unit',learningEntry:'new-build-page.html#fresh'}]};
 for(const href of [null,42,'','https://example.test/new-build-page.html#fresh','//example.test/new-build-page.html#fresh','javascript:alert(1)','../new-build-page.html#fresh','./new-build-page.html#fresh','sub/../new-build-page.html#fresh','%2e%2e/new-build-page.html#fresh','new-build-page.html?view=1#fresh','new-build-page.html','new-build-page.html#','new-build-page.html#%ZZ','new-build-page.html#fresh#other','new-build-page.html#fresh\n','new-build-page.html\\#fresh','other-build-page.html#fresh']){
  const changed=structuredClone(r);changed.cases[0].learningEntry=href;
  a.throws(()=>createLearningEntryResolver(changed,createBuildLinkValidationContext()).caseEntry(changed.cases[0]),/Invalid case learningEntry/,JSON.stringify(href));
 }
 const changed=structuredClone(r);changed.cases[0].unit='missing-unit';
 a.throws(()=>createLearningEntryResolver(changed,createBuildLinkValidationContext()).caseEntry(changed.cases[0]),/Invalid case unit reference/);
});

test('deferred targets must exist in the final outputs and cannot borrow stale on-disk anchors',()=>{
 a.equal(createLearningEntryResolver({units:[],cases:[]}).unitEntry({href:'foundations.html#iq'}),'foundations.html#iq');
 for(const [outputs,missing]of [[new Map(),/Missing unit learning entry page/],[new Map([['foundations.html','<main id="replacement"></main>']]),/Missing unit learning entry fragment/]]){
  const context=createBuildLinkValidationContext();
  a.equal(createLearningEntryResolver({units:[],cases:[]},context).unitEntry({href:'foundations.html#iq'}),'foundations.html#iq');
  a.throws(()=>context.validateOutputs(outputs),missing);
 }
});

test('final validation rejects duplicate real anchors and missing generated local link targets',()=>{
 for(const html of ['<main id="duplicate"></main><aside id="duplicate"></aside>',"<main id='duplicate'></main><aside id='duplicate'></aside>"]){
  a.throws(()=>createBuildLinkValidationContext().validateOutputs(new Map([['new-build-page.html',html]])),/Duplicate.*(?:id|ID)/);
 }
 for(const href of ['missing-build-page.html#fresh','new-build-page.html#missing']){
  const outputs=new Map([['new-build-page.html',`<main id="fresh"><a href="${href}">Broken</a></main>`]]);
  a.throws(()=>createBuildLinkValidationContext().validateOutputs(outputs),/Missing/);
 }
 for(const attribute of ['href','src'])for(const href of ['/new-build-page.html#fresh','/course.css',' /course.css','assets\\plot.png','course.css\n','../new-build-page.html#fresh','%2e%2e/new-build-page.html#fresh','../course.css','%2e%2e/course.css']){
  const outputs=new Map([['new-build-page.html',`<main id="fresh"><a ${attribute}="${href}">Invalid local reference</a></main>`]]);
  a.throws(()=>createBuildLinkValidationContext().validateOutputs(outputs),/Invalid rendered local link/);
 }
 const context=createBuildLinkValidationContext();
 context.validateOutputs(new Map([
  ['new-build-page.html','<main id="fresh"><a href="second-build-page.html#%6Eew">Next</a><link href="course.css"><link href="//example.test/course.css"></main>'],
  ['second-build-page.html',"<main id='new'><a href='new-build-page.html#fresh'>Back</a></main>"],
  ['legacy-routes.js','const example="<a href=\\"missing-build-page.html#fake\\">";']
 ]));
});

test('final HTML index reads actual attributes while ignoring comments and raw text examples',()=>{
 const context=createBuildLinkValidationContext(),resolver=createLearningEntryResolver({units:[],cases:[]},context);
 resolver.unitEntry({href:'new-build-page.html#fresh'});
 context.validateOutputs(new Map([['new-build-page.html',`<!doctype html>
<!-- <i id="fresh"></i><a href="missing-comment.html#ghost">example</a> -->
<script>const example='<i id="fresh"></i><a href="missing-script.html#ghost">';</script>
<style>.example::after{content:'<i id="fresh"></i>'}</style>
<textarea><i id="fresh"></i><a href="missing-textarea.html#ghost">example</a></textarea>
<main ID='fr&#101;sh' data-example='id="fresh"'><a HREF="#fr&#101;sh">Current</a><a href="?view=1&amp;mode=2#fresh">Query</a></main>`]]));
 for(const fake of ['<!-- <i id="ghost"></i> -->','<script>const fake=\'<i id="ghost"></i>\';</script>','<textarea><i id="ghost"></i></textarea>']){
  const absent=createBuildLinkValidationContext();createLearningEntryResolver({units:[],cases:[]},absent).unitEntry({href:'new-build-page.html#ghost'});
  a.throws(()=>absent.validateOutputs(new Map([['new-build-page.html',fake]])),/Missing unit learning entry fragment/);
 }
});

test('only genuine frozen build contexts may defer link validation',()=>{
 const r={units:[],cases:[]},context=createBuildLinkValidationContext();
 a.ok(Object.isFrozen(context));a.ok(Object.isFrozen(Object.getPrototypeOf(context)));
 const forgeries=[null,{},false,{queueTarget(){},validateOutputs(){}},Object.create(Object.getPrototypeOf(context)),{...context}];
 for(const forged of forgeries)a.throws(()=>createLearningEntryResolver(r,forged),/Invalid build link validation context/);
 a.throws(()=>{context.queueTarget=()=>{};},TypeError);
 const resolver=createLearningEntryResolver(r,context);a.equal(resolver.unitEntry({href:'new-build-page.html#fresh'}),'new-build-page.html#fresh');
 a.throws(()=>context.validateOutputs(new Map([['new-build-page.html','<main id="different"></main>']])),/Missing unit learning entry fragment/);
});


test('the real generator rejects a missing final anchor before writing any output',()=>{
 const writes=[],fragment=path.join(root,'site/content-reading.html');
 const memoryFs={...fs,
  readFileSync(file,...args){const source=fs.readFileSync(file,...args);return String(file)===fragment?source+'\n<a href="reading.html#unrendered-build-anchor">Missing final target</a>\n':source;},
  writeFileSync(...args){writes.push(args);}
 };
 const sandbox={__dirname:path.join(root,'scripts'),require:id=>id==='node:fs'?memoryFs:require(id),process:{argv:['node','generate-site.cjs']},console:{log(){}}};
 a.throws(()=>vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/generate-site.cjs'),'utf8'),sandbox,{filename:'generate-site.cjs'}),/Missing rendered local link.*fragment/);
 a.equal(writes.length,0,'all final-output validation completes before the first write');
});
