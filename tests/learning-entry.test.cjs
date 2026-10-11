'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
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
 const r=structuredClone(registry);r.units.find(u=>u.id==='pilot').href='pilot-design.html#missing-anchor';a.throws(()=>renderMap(r,researchGuides),/case unit entry/);
});
