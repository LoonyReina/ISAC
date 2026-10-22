'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function bytes(...files){for(const f of files){const p=path.join(root,f);if(fs.existsSync(p))return fs.readFileSync(p);}throw Error('Missing integration evidence '+files.join(' or '));}
function historicalBytes(...files){for(const f of files){const p=path.join(root,f);if(fs.existsSync(p))return require('./helpers/channel-mapping-preservation.cjs').readCurrentForHistory(f,fs.readFileSync(p),{root});}throw Error('Missing integration evidence '+files.join(' or '));}
const historicalJSON=(...f)=>JSON.parse(historicalBytes(...f));
function rawCurrent(...files){for(const file of files){const p=path.join(root,file);if(fs.existsSync(p))return {file,bytes:fs.readFileSync(p)};}throw Error('Missing actual current metadata '+files.join(' or '));}
const json=(...f)=>JSON.parse(bytes(...f)),r=json('content/data/registry.json','site/registry.json'),g=json('content/data/research-guides.json','site/research-guides.json'),backlog=json('docs/PAPER-EXECUTION-BACKLOG.json'),e=json('assets/data/otfs-receiver-evidence-map.json','data/otfs-receiver-evidence-map.json');
const historyR=historicalJSON('content/data/registry.json','site/registry.json'),historyG=historicalJSON('content/data/research-guides.json','site/research-guides.json');
const P=require('./helpers/otfs-receiver-preservation.cjs');
test('OTFS has one case/unit/page, existing source guide ID and six truthful depth links',()=>{
 const unit=r.units.filter(x=>x.id==='otfs-receiver'),c=r.cases.filter(x=>x.unit==='otfs-receiver'),page=r.pages.filter(x=>x.path==='otfs-receiver.html');a.equal(unit.length,1);a.equal(c.length,1);a.equal(page.length,1);a.equal(unit[0].href,'otfs-receiver.html#experiment');a.equal(c[0].learningEntry,'otfs-receiver.html#intuition');a.equal(page[0].next,'reading.html#guide-otfs-joint-estimation-2020');
 const guide=g.cards.filter(x=>x.id==='otfs-joint-estimation-2020');a.equal(guide.length,1);a.equal(guide[0].notebookTopicId,'otfs-receiver');a.equal(guide[0].executable.href,unit[0].href);a.equal(guide[0].source.url,e.source.url);a.equal(c[0].paperComparison.sourceId,'case-otfs-receiver-paper');
 const direction=r.directions.find(x=>x.id==='waveforms');a.equal(direction.primaryCaseIds.filter(x=>x===c[0].id).length,1);for(const l of direction.levels){const item=l.items.filter(x=>x.href.startsWith('otfs-receiver.html#'));a.equal(item.length,1,l.id);a.equal(item[0].status,'available');a.match(item[0].note,/两个独立缩减实验/);}
 const directory=json('content/data/research-directory.json','site/research-directory.json');a.equal(directory.cards.length,9);a.ok(!directory.cards.some(x=>x.id.includes('otfs')));
});
test('registry and guides reverse to exact base hashes and reject any altered reviewed leaf or addition',()=>{
 const r=historyR,g=historyG,json=historicalJSON; // Verified historical seed; direct current metadata is checked separately below.
 for(const [data,fn,hash,changes]of [[r,P.withoutOtfsRegistry,'6c45062e1ce8c5f88913b7a4b7bf5e45f045cd30e2f505afefd4e8e77342687b',P.changes.registry],[g,P.withoutOtfsGuides,'9338b48acacc68e9c774adda8e2421aea948a27329bc649ea2730369e96bc3c1',P.changes.guides]]){
  a.equal(sha(JSON.stringify(fn(data),null,2)+'\n'),hash);
  for(const change of changes){const bad=structuredClone(data);let p=bad;for(const k of change.path.slice(0,-1))p=p[k];const k=change.path.at(-1);if(change.append)p[k][change.lengthBefore]='unreviewed';else p[k]='unreviewed';a.throws(()=>fn(bad),change.path.join('.'));}
 }
 const unrelated=structuredClone(r);unrelated.legacy.unreviewed='retain';a.equal(P.withoutOtfsRegistry(unrelated).legacy.unreviewed,'retain');
});
test('all frozen numerical modules and optional archive bytes are preserved without PDF startup dependencies',()=>{
 for(const f of e.ownedFiles.filter(x=>x.source.endsWith('.mjs')&&/\/(?:communication|sensing)\//.test(x.source))){const b=bytes(f.source,...(f.public?[f.public]:[]));a.equal(b.length,f.bytes);a.equal(sha(b),f.sha256);}
 a.equal(e.ownedFiles.filter(x=>x.source.endsWith('.mjs')&&/\/(?:communication|sensing)\//.test(x.source)).length,12);
 for(const x of e.archives){const b=bytes('assets/'+x.public,x.public);a.equal(b.length,x.bytes);a.equal(sha(b),x.sha256);a.equal(x.pdfRedistributed,false);}
 const page=bytes('content/pages/otfs-receiver.html','otfs-receiver.html').toString();for(const m of page.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g))a.doesNotMatch(m[1],/\.zip|manifest\.json|evidence-map\.json/);
 for(const f of e.ownedFiles.filter(x=>x.source.endsWith('.mjs'))){const source=bytes(f.source).toString();a.doesNotMatch(source,/(?:fetch|importScripts)\s*\([^)]*(?:\.zip|manifest\.json|evidence-map\.json)/);}
 a.equal(e.source.pdfRedistributed,false);a.equal(e.localLessonTests.browserExecuted,false);
});
test('backlog consolidates the existing primary paper and keeps numerical, browser and whole-paper gates separate',()=>{
 const records=backlog.papers.filter(x=>x.id==='otfs-joint-estimation-2020');a.equal(records.length,1);const p=records[0];a.deepEqual(p.canonicalReferences.caseIds,['case-otfs-receiver']);a.deepEqual(p.canonicalReferences.sourceIds,['case-otfs-receiver-paper']);a.equal(p.stages.fullPaper,'not-reproduced');a.equal(p.stages.latency,'not-measured');a.equal(p.realtime.measuredLatencyMs,null);a.equal(p.implementation.details.browserAccepted,false);a.equal(p.implementation.details.pythonReferenceUnchanged,true);a.equal(p.implementation.details.lmmsePortCorrected,true);a.equal(p.experiment.details.boundedCurrentLesson.gramEdgeTolerance,0);a.equal(p.experiment.details.boundedCurrentLesson.physicalCrossModelClaim,false);a.match(p.stageEvidence.latency,/not actual browser/);
 a.equal(backlog.scope.fullPaperReproductionsEstablished,0);a.ok(backlog.sequence.activeStages.some(x=>x.paperId==='crb'&&x.stage==='browser-validation'&&x.status==='pending'));a.ok(backlog.sequence.activeStages.some(x=>x.paperId===p.id&&x.stage==='browser-validation'&&x.status==='pending'));
 const doc=bytes('docs/OTFS-RECEIVER-SOURCE-EVIDENCE.md').toString();a.match(doc,/unproven/);a.match(doc,/zero Gram pruning/);a.match(doc,/not deployment/);a.doesNotMatch(doc,/\/(?:workspace|tmp)\//);
});

test('reading map preserves its exact earlier bytes and rejects altered appended source evidence',()=>{const source=bytes('docs/READING-MAP.md').toString();a.equal(sha(P.withoutOtfsReadingMap(source)),'d5140f2a9fe408e2342ee3c44ad93ded2cd79a09dcce94f22fa8c21307a0932d');a.throws(()=>P.withoutOtfsReadingMap(source.replace('OTFS bounded receiver extension','OTFS unreviewed extension')));});

// Current-source assertions are separate from the unchanged historical checkpoints above.
test('raw-current otfs-receiver metadata preserves lesson links and the exact target19 guide delta and enumerated channel-mapping changes',()=>{
 const registryRead=rawCurrent('content/data/registry.json','site/registry.json'),guidesRead=rawCurrent('content/data/research-guides.json','site/research-guides.json');
 const registry=JSON.parse(registryRead.bytes),guides=JSON.parse(guidesRead.bytes),readCurrentForHistory=require('./helpers/channel-mapping-preservation.cjs').readCurrentForHistory;
 const priorRegistry=JSON.parse(readCurrentForHistory(registryRead.file,registryRead.bytes,{root})),priorGuides=JSON.parse(readCurrentForHistory(guidesRead.file,guidesRead.bytes,{root}));
 const registryOutsideMapping=structuredClone(registry);a.equal(registryOutsideMapping.pages.length,priorRegistry.pages.length+1);a.equal(registryOutsideMapping.pages.pop().path,'channel-mapping.html');a.equal(registryOutsideMapping.lessonPlacement.length,priorRegistry.lessonPlacement.length+1);a.equal(registryOutsideMapping.lessonPlacement.pop().canonicalHref,'channel-mapping.html#top');a.deepEqual(registryOutsideMapping,priorRegistry,'all registry fields outside the two mapping additions retain their actual current values');
 const guidesOutsideMapping=require('./helpers/target19-source-identity.cjs').currentGuidesBeforeTarget19(guidesRead.file,guidesRead.bytes,{root}),id='channels-sensing-communication-mapping-2026',currentCards=guidesOutsideMapping.cards.filter(x=>x.id===id),priorCards=priorGuides.cards.filter(x=>x.id===id);a.equal(currentCards.length,1);a.equal(priorCards.length,1);const mapped=currentCards[0],prior=priorCards[0];
 a.equal(Object.hasOwn(prior,'executable'),false);a.equal(mapped.executable.href,'channel-mapping.html#top');delete mapped.executable;a.equal(mapped.limits.length,prior.limits.length+1);mapped.limits.pop();a.notEqual(mapped.evidence.kind,prior.evidence.kind);mapped.evidence.kind=prior.evidence.kind;a.deepEqual(guidesOutsideMapping,priorGuides,'all guide fields outside exact target19 changes and enumerated mapping fields retain current values');
 const cases=registry.cases.filter(x=>x.id==='case-otfs-receiver'),units=registry.units.filter(x=>x.id==='otfs-receiver'),pages=registry.pages.filter(x=>x.path==='otfs-receiver.html');a.equal(cases.length,1);a.equal(units.length,1);a.equal(pages.length,1);a.equal(cases[0].unit,units[0].id);a.equal(cases[0].learningEntry,'otfs-receiver.html#intuition');a.equal(units[0].href,'otfs-receiver.html#experiment');a.equal(cases[0].paperComparison.sourceUrl,e.source.url);
 const direction=registry.directions.find(x=>x.id==='waveforms');a.equal(direction.primaryCaseIds.filter(x=>x===cases[0].id).length,1);a.equal(direction.levels.length,6);for(const level of direction.levels){const links=level.items.filter(x=>x.href.startsWith('otfs-receiver.html#'));a.equal(links.length,1);a.equal(links[0].status,'available');}
 const sourceGuides=guides.cards.filter(x=>x.id==='otfs-joint-estimation-2020');a.equal(sourceGuides.length,1);a.equal(sourceGuides[0].notebookTopicId,units[0].id);a.equal(sourceGuides[0].executable.href,units[0].href);a.equal(sourceGuides[0].source.url,e.source.url);
});
