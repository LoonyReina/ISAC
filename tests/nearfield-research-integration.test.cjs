'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),os=require('node:os');
const root=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function bytes(...files){for(const f of files){const p=path.join(root,f);if(fs.existsSync(p))return fs.readFileSync(p);}throw Error('Missing near-field evidence '+files.join(' or '));}
const json=(...f)=>JSON.parse(bytes(...f)),r=json('content/data/registry.json','site/registry.json'),g=json('content/data/research-guides.json','site/research-guides.json'),b=json('docs/PAPER-EXECUTION-BACKLOG.json'),e=json('assets/data/nearfield-research-evidence-map.json','data/nearfield-research-evidence-map.json'),P=require('./helpers/nearfield-research-preservation.cjs'),base=require('./helpers/nearfield-research-baseline.json');
test('near-field keeps one canonical case/unit/page/source with separate legacy and six-level research links',()=>{
 const c=r.cases.filter(x=>x.id==='case-near-field'),u=r.units.filter(x=>x.id==='near-field'),p=r.pages.filter(x=>x.path==='near-field.html');a.equal(c.length,1);a.equal(u.length,1);a.equal(p.length,1);a.equal(c[0].unit,u[0].id);a.equal(c[0].learningEntry,'near-field.html#intuition');a.equal(c[0].paperComparison.sourceId,'case-near-field-paper');a.equal(c[0].paperComparison.sourceUrl,e.source.url);a.equal(u[0].href,'near-field.html#research-experiment');a.ok(u[0].prerequisites.includes('near-field.html#experiment'));
 const d=r.directions.find(x=>x.id==='spatial');a.equal(d.primaryCaseIds.filter(x=>x===c[0].id).length,1);const anchors=['intuition','model','research-experiment','paper','limits','reproduce'];for(let i=0;i<6;i++){const entries=d.levels[i].items.filter(x=>x.href.startsWith('near-field.html#'));a.equal(entries.length,1);a.equal(entries[0].href,'near-field.html#'+anchors[i]);a.match(entries[0].note,/不等于浏览器/);}
 a.equal(r.units.length,31);a.equal(r.cases.length,16);a.equal(g.cards.length,20);a.equal(g.cards.find(x=>x.id==='nearfield-double-array-ispac').executable,undefined,'other near-field paper not falsely upgraded');
});
test('enumerated near-field registry, guides and backlog changes reverse to independent historical hashes',()=>{
 for(const [key,data,fn]of [['registry',r,P.withoutNearfieldRegistry],['guides',g,P.withoutNearfieldGuides],['backlog',b,P.withoutNearfieldBacklog]]){
  const original=JSON.stringify(data);a.equal(sha(JSON.stringify(fn(data),null,2)+'\n'),base[key],key);a.equal(JSON.stringify(data),original,'inverse leaves current metadata immutable');
  for(const ch of P.changes[key]){const bad=structuredClone(data);let parent=bad;for(const k of ch.path.slice(0,-1))parent=parent[k];const k=ch.path.at(-1);if(ch.append)parent[k][ch.lengthBefore]='unreviewed';else parent[k]='unreviewed';a.throws(()=>fn(bad),key+'.'+ch.path.join('.'));}
 }
 const unrelated=structuredClone(r);unrelated.legacy.unreviewed='visible';a.equal(P.withoutNearfieldRegistry(unrelated).legacy.unreviewed,'visible');
 for(const [key,file,fn]of [['readingMap','docs/READING-MAP.md',P.withoutNearfieldReadingMap],['plan','docs/PAPER-EXECUTION-PLAN.md',P.withoutNearfieldPlan]]){const text=bytes(file).toString();a.equal(sha(fn(text)),base[key]);a.throws(()=>fn(text+'unreviewed'));}
});
test('all22 frozen runtime/metadata entries and legacy implementation bytes remain immutable',()=>{
 a.equal(Object.keys(e.runtimeFreeze.runtimeFiles).length,22);
 for(const [f,digest]of Object.entries(e.runtimeFreeze.runtimeFiles))a.equal(sha(bytes(e.runtimePublicRoot+f)),digest,f);
 for(const f of e.legacyFiles){const content=bytes(f.source,f.public);a.equal(content.length,f.bytes);a.equal(sha(content),f.sha256,f.source);}
 a.equal(e.legacyFiles.length,3);
 const html=bytes('content/pages/near-field.html','near-field.html').toString(),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);a.equal(ids.length,new Set(ids).size);
 for(const id of ['site-main','geometry','experiment','paper','limits','nf-n','nf-range','nf-range-out','nf-reset','nf-result','nf-response','nf-response-title','nf-response-desc','nf-response-caption','nf-phase','nf-phase-title','nf-phase-desc','nf-phase-caption','nf-metrics','nf-samples','nf-phases'])a.equal(ids.filter(x=>x===id).length,1,id);
 a.ok(html.indexOf('src="near-field-core.js')<html.indexOf('src="near-field.js'));
 a.ok(html.includes('id="research-experiment"'));
});
test('exact source-free archive parts preserve both original archives and every historical evidence entry',()=>{
 a.equal(e.archives.length,2);
 for(const archive of e.archives){a.equal(archive.publicWholeArchive,null);a.equal(archive.startupDependency,false);a.equal(archive.pdfRedistributed,false);a.equal(archive.failuresRetained,true);const m=json('assets/'+archive.manifest,archive.manifest);a.equal(m.archiveBytes,archive.bytes);a.equal(m.archiveSha256,archive.sha256);a.equal(m.parts.length,2);const parts=m.parts.map((p,i)=>{a.equal(p.order,i+1);a.ok(p.bytes<=9000000);const data=bytes('assets/data/'+p.file,'data/'+p.file);a.equal(data.length,p.bytes);a.equal(sha(data),p.sha256);return data;});const whole=Buffer.concat(parts);a.equal(whole.length,archive.bytes);a.equal(sha(whole),archive.sha256);}
 a.equal(e.archives[0].bytes,13411301);a.equal(e.archives[0].sha256,'d9c9a822d2e4ebf34b4914c6586f30e06e329046bd0b559c23f51ed30766b0f7');a.equal(e.archives[0].archiveMemberCount,107);a.equal(e.archives[1].archiveMemberCount,157);
});
test('portable reassembler is cwd-independent, preserves byte identity and refuses corruption or conflicting output',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'isac-nearfield-parts-test-'));
 try{
  const archive=e.archives[0],manifest=json('assets/'+archive.manifest,archive.manifest),script=bytes('assets/'+e.reassembler,e.reassembler);fs.writeFileSync(path.join(temp,'reassemble.py'),script);fs.writeFileSync(path.join(temp,'chain.parts.json'),JSON.stringify(manifest));for(const p of manifest.parts)fs.writeFileSync(path.join(temp,p.file),bytes('assets/data/'+p.file,'data/'+p.file));
  const run=()=>cp.spawnSync('python3',[path.join(temp,'reassemble.py'),path.join(temp,'chain.parts.json')],{cwd:os.tmpdir(),encoding:'utf8'});let result=run();a.equal(result.status,0,result.stderr);const out=path.join(temp,manifest.archiveFile);a.equal(sha(fs.readFileSync(out)),manifest.archiveSha256);a.equal(run().status,0,'already-valid output idempotent');fs.writeFileSync(out,'conflict');a.notEqual(run().status,0);a.equal(fs.readFileSync(out,'utf8'),'conflict');fs.unlinkSync(out);fs.writeFileSync(path.join(temp,manifest.parts[0].file),'corrupt');a.notEqual(run().status,0);a.equal(fs.existsSync(out),false);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('near-field numerical, failure, browser, original-figure and historical-import gates stay independent',()=>{
 const p=b.papers.filter(x=>x.id==='supplement-case-near-field');a.equal(p.length,1);a.equal(p[0].stages.independentValidation,'passed');a.equal(p[0].stages.fullPaper,'not-reproduced');a.equal(p[0].stages.latency,'not-measured');a.equal(p[0].realtime.measuredLatencyMs,null);a.equal(p[0].implementation.details.browserAccepted,false);a.deepEqual(p[0].experiment.details.boundedResearchChain.finiteXShape,[65,256]);a.equal(p[0].experiment.details.boundedResearchChain.spatialRankUpperBound,7);for(const k of ['solverCapIsInfeasible','numericalAcceptanceIsDetection','numericalAcceptanceIsAccuracy','importedClaimsVerified','singleRealizationIsRmse'])a.equal(p[0].details.failureGates[k],false);a.deepEqual(p[0].details.failureGates.independentObservedPositionErrorsM,[1.237,21.072,33.448]);a.equal(p[0].details.failureGates.endfireTiesRetained,100);
 for(const k of ['browserExecuted','browserLatencyMeasured','published','fullPaperReproduced','sourceFiguresReproduced','hybridImplemented','citedOptimizedFarFieldBaselineImplemented','importedOptimizerClaimsVerified','numericalCompletionIsDetection','numericalCompletionIsAccuracy'])a.equal(e.boundaries[k],false,k);
 a.equal(b.scope.fullPaperReproductionsEstablished,0);a.equal(b.sequence.current,'crb');a.ok(b.sequence.activeStages.some(x=>x.paperId===p[0].id&&x.stage==='browser-validation'&&x.status==='pending'));
 const doc=bytes('docs/NEARFIELD-RESEARCH-SOURCE-EVIDENCE.md').toString();a.match(doc,/not deployment/);a.match(doc,/optimal_inaccurate/);a.match(doc,/rate8\/rate10/);a.doesNotMatch(doc,/\/(?:workspace|tmp)\//);
});
test('runtime and page startup require no archive, source PDF, Python or network evidence payload',()=>{
 const html=bytes('content/pages/near-field.html','near-field.html').toString();for(const match of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g))a.doesNotMatch(match[1],/\.zip|parts\.json|evidence-map\.json|\.pdf|\.py/);
 a.ok(e.ownedFiles.filter(x=>x.source.endsWith('.mjs')&&x.public!==null).length>=16,'complete runtime/UI module inventory');for(const f of e.ownedFiles.filter(x=>x.source.endsWith('.mjs'))){a.equal(sha(bytes(f.source)),f.sha256);a.doesNotMatch(bytes(f.source).toString(),/(?:fetch|importScripts)\s*\([^)]*(?:\.zip|parts\.json|evidence-map\.json|\.pdf)/);}
});

test('old near-field prerequisite subject has one exact reversible generator label',()=>{const source=bytes('scripts/site/generate-site.cjs','scripts/generate-site.cjs').toString();a.equal(sha(P.withoutNearfieldPrerequisiteTitle(source)),base.generator);a.throws(()=>P.withoutNearfieldPrerequisiteTitle(source.replace('近场一程无噪声曲率先修','unreviewed subject')));});
