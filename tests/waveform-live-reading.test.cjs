'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const r=JSON.parse(read('site/registry.json')),data=JSON.parse(read(r.researchDirectoryFile));
const {renderResearchDirectory}=require('../scripts/render-research-directory.cjs');
const render=(d=data,registry=r,exists=file=>fs.existsSync(path.join(root,file)))=>renderResearchDirectory(d,registry,exists);
const selected=d=>d.cards.find(c=>c.id==='optimal_waveform');
const article=(html,id='optimal_waveform')=>{const m=html.match(new RegExp('<article class="influence-card" id="paper-'+id+'"[^]*?</article>'));a.ok(m,id);return m[0];};

test('the canonical waveform catalog route visibly identifies its bounded live algorithm before disclosures',()=>{
 const before=JSON.stringify(data),registryBefore=JSON.stringify(r),html=render(),part=article(html);
 a.deepEqual(selected(data).executionStatus,{status:'validated-algorithm-core',scope:'严格协方差与§IV等能量加权分支'});
 const source=r.cases.find(c=>c.id==='case-waveform'),unit=r.units.find(u=>u.id===source.unit);
 a.equal(source.unit,'waveform-design');a.equal(unit.href,'waveform-design.html#experiment');
 a.ok(part.includes('href="'+(source.learningEntry||unit.href)+'">进入教学案例 →</a>'));
 a.match(part,/严格协方差与§IV等能量加权分支：算法核心已数值验证；非完整论文复现/);
 a.ok(part.indexOf('算法核心已数值验证')<part.indexOf('<details'));
 a.match(article(read('reading.html')),/严格协方差与§IV等能量加权分支：算法核心已数值验证/);
 a.equal(JSON.stringify(data),before);a.equal(JSON.stringify(r),registryBefore);
});

test('optional catalog status remains reusable, supports omission and preserves default labels elsewhere',()=>{
 const d=structuredClone(data);delete selected(d).executionStatus;const old=render(d);a.match(article(old),/独立机制模型，非完整论文复现/);
 for(const c of data.cards.filter(c=>c.caseId&&!Object.hasOwn(c,'executionStatus')))a.match(article(render(),c.id),/独立机制模型，非完整论文复现/);
 const another=d.cards.find(c=>c.id!=='optimal_waveform'&&c.caseId);another.executionStatus={status:'validated-algorithm-core',scope:'另一个已核验核心'};
 a.match(article(render(d),another.id),/另一个已核验核心：算法核心已数值验证；非完整论文复现/);
 const withoutCase={...r,cases:r.cases.filter(c=>c.id!=='case-waveform')};a.match(article(render(data,withoutCase)),/教学案例准备中/);a.doesNotMatch(article(render(data,withoutCase)),/算法核心已数值验证/);
 a.doesNotMatch(article(render(data,r,()=>false)),/算法核心已数值验证|进入教学案例/);
});

test('catalog execution status rejects malformed or unsupported claims without hard-coded paper identities',()=>{
 for(const e of [undefined,null,[],{},false,'validated',1,{status:['validated-algorithm-core'],scope:'核心'},{status:'whole-paper-reproduced',scope:'核心'},{status:'validated-algorithm-core'},{status:'validated-algorithm-core',scope:3},{status:'validated-algorithm-core',scope:''},{status:'validated-algorithm-core',scope:'  '},{status:'validated-algorithm-core',scope:'x'.repeat(101)},{status:'validated-algorithm-core',scope:'核心',href:'https://example.test'}]){
  const d=structuredClone(data);selected(d).executionStatus=e;a.throws(()=>render(d),/Invalid catalog execution status/);
 }
 const d=structuredClone(data);selected(d).executionStatus.scope='<img src=x onerror="bad"> & core';const html=article(render(d));a.ok(html.includes('&lt;img'));a.ok(html.includes('&amp; core'));a.doesNotMatch(html,/<img|onerror="bad"/);
 const invalid=structuredClone(r);invalid.cases.find(c=>c.id==='case-waveform').learningEntry='waveform-design.html#missing-actual-entry';a.throws(()=>render(data,invalid),/Missing/);
});

const P=require('./helpers/waveform-live-preservation.cjs');
test('historical adapters remove exactly the reviewed local algorithm status changes',()=>{
 const rb=JSON.stringify(r),db=JSON.stringify(data),priorR=P.withoutWaveformLiveRegistry(r),priorD=P.withoutWaveformLiveCatalog(data);
 const target=priorR.cases.find(c=>c.id===P.additions.caseId),card=selected(priorD);
 for(const item of P.additions.registryChanges){let v=target;for(const k of item.path)v=v[k];a.deepEqual(v,item.before);}
 for(const item of P.additions.catalogChanges){let parent=card;for(const k of item.path.slice(0,-1))parent=parent[k];if(item.added)a.equal(Object.hasOwn(parent,item.path.at(-1)),false);else a.deepEqual(parent[item.path.at(-1)],item.before);}
 a.equal(JSON.stringify(r),rb);a.equal(JSON.stringify(data),db);
 const unrelated=structuredClone(r);unrelated.cases.find(c=>c.id===P.additions.caseId).title='future case title';unrelated.units.push({id:'future-independent-unit'});
 const normalized=P.withoutWaveformLiveRegistry(unrelated);a.equal(normalized.cases.find(c=>c.id===P.additions.caseId).title,'future case title');a.deepEqual(normalized.units.at(-1),{id:'future-independent-unit'});
 const catalog=structuredClone(data);selected(catalog).metrics.futureAudit='must survive';catalog.cards.push({id:'future-independent-paper'});const nd=P.withoutWaveformLiveCatalog(catalog);a.equal(selected(nd).metrics.futureAudit,'must survive');a.deepEqual(nd.cards.at(-1),{id:'future-independent-paper'});
});

test('historical adapters reject tampered reviewed fields and missing or duplicate selected records',()=>{
 for(const item of P.additions.registryChanges){const v=structuredClone(r);let parent=v.cases.find(c=>c.id===P.additions.caseId);for(const key of item.path.slice(0,-1))parent=parent[key];parent[item.path.at(-1)]='unreviewed mutation';a.throws(()=>P.withoutWaveformLiveRegistry(v));}
 for(const item of P.additions.catalogChanges){const v=structuredClone(data);let parent=selected(v);for(const key of item.path.slice(0,-1))parent=parent[key];delete parent[item.path.at(-1)];a.throws(()=>P.withoutWaveformLiveCatalog(v));}
 for(const mode of ['missing','duplicate']){const v=structuredClone(r),d=structuredClone(data);if(mode==='missing'){v.cases=v.cases.filter(c=>c.id!==P.additions.caseId);d.cards=d.cards.filter(c=>c.id!==P.additions.catalogId);}else{v.cases.push(structuredClone(v.cases.find(c=>c.id===P.additions.caseId)));d.cards.push(structuredClone(selected(d)));}a.throws(()=>P.withoutWaveformLiveRegistry(v));a.throws(()=>P.withoutWaveformLiveCatalog(d));}
});

test('renderer normalization requires each exact ordered hook and retains unrelated source edits',()=>{
 const source=read('scripts/render-research-directory.cjs'),prior=P.withoutWaveformLiveRenderer(source);let restored=prior;for(const h of P.additions.rendererHooks){a.equal(restored.split(h.before).length,2);restored=restored.replace(h.before,()=>h.after);}a.equal(restored,source);
 for(const h of P.additions.rendererHooks){a.throws(()=>P.withoutWaveformLiveRenderer(source.replace(h.after,'')));a.throws(()=>P.withoutWaveformLiveRenderer(source+h.after));a.throws(()=>P.withoutWaveformLiveRenderer(source.replace(h.after,h.after+' ').replace(h.after,'mutated reviewed hook')));}
 a.equal(P.withoutWaveformLiveRenderer(source+'\n// unrelated future change\n'),prior+'\n// unrelated future change\n');
 const changed=source.replace("const esc=s=>String(s)","const esc=s=>String(s).replace(/unsafe/g,'')");a.notEqual(changed,source);a.notEqual(P.withoutWaveformLiveRenderer(changed),prior);
});
