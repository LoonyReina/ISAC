'use strict';
// Current execution and historical provenance are asserted separately; neither replaces the other.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),R=require('./helpers/dual-array-record-portability-preservation.cjs');
const Q=require('./helpers/dual-array-record-runtime-preservation.cjs'),B=require('./helpers/dual-array-browser-integration-preservation.cjs');
const read=file=>fs.readFileSync(path.join(root,file));
const names=text=>[...text.matchAll(/^test\('([^']+)'/gm)].map(x=>x[1]);
const endpoint=file=>[...R.delta.changedFiles,...R.leaf.delta.files].find(row=>row.path===file);
const previous=file=>Buffer.from(endpoint(file).beforeBase64,'base64');

test('Record portability exact leaf rejects old corrupted duplicate and forged inverse endpoints',()=>{
 a.equal(R.sha(read('tests/helpers/dual-array-record-leaf-delta.json')),'7f116003386b02d6f97ce4fcc3c3c6038f9b86927a1cf4d39cba54da5ccef71e');
 a.equal(R.sha(read('tests/helpers/dual-array-record-portability-delta.json')),'d914636c16992bfb5c42c8913bb7f2923ef9f8a393bf2ef2afb5250f63715d10');
 a.deepEqual(R.leaf.delta.files.map(row=>row.path),['labs/dual-array/runtime/records.mjs','tests/dual-array-browser-timers.test.cjs']);
 a.equal(R.leaf.delta.files[0].before.sha256,'7340f93036f1d2abbf833e88e73341820c14e5432d39a7ea7e4844e99b642158');
 a.equal(R.leaf.delta.files[0].after.sha256,'0c9fda6852ef58b3dd942b5bc8bb911be0ecccbffc36605b9a2f73a7ec043854');
 for(const row of [...R.leaf.delta.files,...R.delta.changedFiles]){
  const bytes=require('./helpers/ofdm-false-alarm-integration-preservation.cjs').withoutFile(row.path,read(row.path)),prior=R.withoutFile(row.path,bytes);a.ok(R.identity(prior,row.before));a.deepEqual(R.maybeWithoutFile(row.path,prior),prior);
  for(const bad of [prior,bytes.subarray(1),Buffer.concat([bytes,Buffer.from('unreviewed')])])a.throws(()=>R.withoutFile(row.path,bad));
  const inverse=R.leaf.delta.files.includes(row)?R.leaf.withoutFile:R.withoutFile;
  for(const key of ['before','after'])for(const field of ['bytes','sha256']){const bad=structuredClone(row);bad[key][field]=field==='bytes'?0:'0'.repeat(64);a.throws(()=>inverse(row.path,bytes,[bad]));}
  const bad=structuredClone(row);bad.beforeBase64='eA==';a.throws(()=>inverse(row.path,bytes,[bad]));a.throws(()=>inverse(row.path,bytes,[row,row]));
 }
});

test('Record adapter changes only declared provenance reads and retains all old behavioral assertions and names',()=>{
 const changes={
  'labs/dual-array/lesson/tests/lesson.test.mjs':[["import repair from '../../../../tests/helpers/dual-array-current-runtime-preservation.cjs';","import repair from '../../../../tests/helpers/dual-array-record-runtime-preservation.cjs';"]],
  'tests/dual-array-owned.test.cjs':[["const repair = require('./helpers/dual-array-current-runtime-preservation.cjs');","const repair = require('./helpers/dual-array-record-runtime-preservation.cjs');"],["const adapterFreeze = require('./helpers/dual-array-current-runtime-freeze.json');","const adapterFreeze = require('./helpers/dual-array-record-runtime-freeze.json');"]],
  'tests/dual-array-browser-timers.test.cjs':[["const root = path.join(__dirname, '..'), read = file => fs.readFileSync(path.join(root, file));","const provenance = require('./helpers/dual-array-record-leaf-preservation.cjs');\n  const root = path.join(__dirname, '..'), read = file => provenance.maybeWithoutFile(file, fs.readFileSync(path.join(root, file)));"]],
  'tests/dual-array-current-runtime.test.cjs':[["return fs.readFileSync(path.join(root, name));","return require('./helpers/dual-array-record-portability-preservation.cjs').maybeWithoutFile(file, fs.readFileSync(path.join(root, name)));"]],
 };
 for(const[file,replacements]of Object.entries(changes)){let text=previous(file).toString();for(const[from,to]of replacements){a.equal(text.split(from).length,2);text=text.replace(from,to);}a.equal(read(file).toString(),text,'only declared provenance adaptation '+file);a.deepEqual(names(text),names(previous(file).toString()),'every prior case remains named '+file);}
 const lesson=read('labs/dual-array/lesson/tests/lesson.test.mjs').toString(),marker="test('default controls build exact accepted default request'";
 const oldLesson=previous('labs/dual-array/lesson/tests/lesson.test.mjs').toString();a.equal(lesson.slice(lesson.indexOf(marker)),oldLesson.slice(oldLesson.indexOf(marker)));
 a.equal(names(lesson).length,42);a.deepEqual(names(lesson),require('./helpers/dual-array-owned-suites.json').names);
 for(const file of ['labs/dual-array/runtime/kernel.mjs','labs/dual-array/runtime/worker.mjs'])a.deepEqual(R.maybeWithoutFile(file,read(file)),R.withoutFile(file,read(file)));
});

test('Record current-execution adapter freezes its entire support tree and preserves the old timer adapter intact',()=>{
 const freeze=require('./helpers/dual-array-record-runtime-freeze.json');a.equal(R.sha(read('tests/helpers/dual-array-record-runtime-freeze.json')),'6b56a1a4f89650be21f25cdef1290df9b4e7a5100892aba425246d0c04685eb1');
 a.deepEqual(freeze.files.map(row=>row.path),[...Q.adaptedPaths,...Q.supportPaths]);
 for(const row of freeze.files)a.ok(R.identity(read(row.path),row),'current adapter support '+row.path);
 const old=require('./helpers/dual-array-current-runtime-freeze.json');for(const row of old.files)a.ok(R.identity(R.maybeWithoutFile(row.path,require('./helpers/ofdm-false-alarm-integration-preservation.cjs').withoutFile(row.path,read(row.path))),row),'unchanged old adapter endpoint '+row.path);
 const code=read('tests/dual-array-owned.test.cjs').toString();a.match(code,/fs\.writeFileSync\(target, bytes\)/);a.doesNotMatch(code,/fs\.writeFileSync\([^\n]*accepted/);
 a.throws(()=>Q.historicalBytes('labs/dual-array/runtime/records.mjs',previous('labs/dual-array/runtime/records.mjs')),'old records cannot execute through the current owned adapter');
 const frozen=require('../labs/dual-array/FUNCTIONAL-FREEZE.json');for(const row of frozen.files){const prior=Q.historicalBytes(row.path,read(row.path));if(row.path!=='content/pages/dual-array-positioning.html')a.ok(R.identity(prior,row),'exact original functional provenance '+row.path);}
 a.equal(R.sha(read('labs/dual-array/runtime/client.mjs')),B.timer.correction.after.sha256);
});

test('Record module identity overlay retains exact edges and rejects old source hash policy and joint spoofing',()=>{
 const P=require('../scripts/build/module-dependencies.cjs'),D=require('./helpers/dual-array-integration-delta.json');
 const profiles=B.currentDualArrayProfiles(D.moduleProfiles),source=profiles.map(x=>({file:x.public,source:read(x.public).toString()})),identities=source.map(x=>({file:x.file,sha256:R.sha(x.source)}));
 const current={schemaVersion:1,modules:profiles};a.deepEqual(P.moduleDependencies(source,current,identities),B.delta.currentEdges);a.deepEqual(B.maybeWithoutContracts(current).modules,D.moduleProfiles);
 const file=R.delta.profile.before.public;for(const mode of ['old-source','old-hash','spoof','edges','duplicate','extra']){const s=structuredClone(source),c=structuredClone(current),ids=structuredClone(identities),i=s.findIndex(x=>x.file===file);if(mode==='old-source'){s[i].source=previous(file).toString();ids[i].sha256=R.sha(s[i].source);}if(mode==='old-hash')c.modules[i].sha256=R.delta.profile.before.sha256;if(mode==='spoof'){s[i].source+='\n// unreviewed';c.modules[i].sha256=ids[i].sha256=R.sha(s[i].source);}if(mode==='edges')c.modules[i].runtimeEdges=[];if(mode==='duplicate')c.modules.push(structuredClone(c.modules[i]));if(mode==='extra')c.modules[i].extra=true;a.throws(()=>P.moduleDependencies(s,c,ids),mode);}
 for(const mutate of [x=>x.modules.push(structuredClone(x.modules.find(r=>r.public===file))),x=>x.modules.find(r=>r.public===file).extra=true,x=>x.modules.find(r=>r.public===file).runtimeEdges=[]]){const bad=structuredClone(current);mutate(bad);a.throws(()=>R.maybeWithoutContracts(bad));}
});

test('Record portability mappings add only explicit build-only evidence and recover the whole prior manifest',()=>{
 const manifest=require('./helpers/ofdm-false-alarm-integration-preservation.cjs').withoutMappings(require('../build/compatibility-manifest.json')),prior=R.withoutMappings(manifest);a.deepEqual(manifest.entries.filter(x=>x.public!==null),prior.entries.filter(x=>x.public!==null));a.equal(prior.entries.filter(x=>x.public!==null).length,1177);
 for(const row of R.mapping.addedEntries){a.equal(row.public,null);a.ok(fs.statSync(path.join(root,row.source)).isFile());for(const mode of ['missing','duplicate','spoof']){const bad=structuredClone(manifest);if(mode==='missing')bad.entries=bad.entries.filter(x=>x.source!==row.source);if(mode==='duplicate')bad.entries.push(structuredClone(row));if(mode==='spoof')bad.entries.find(x=>x.source===row.source).public='unreviewed';a.throws(()=>R.withoutMappings(bad));}}
 const fixtures=R.mapping.addedEntries.filter(x=>x.source.startsWith('tests/fixtures/dual-array-browser-records/')).map(x=>path.basename(x.source)).sort();a.deepEqual(fixtures,fs.readdirSync(path.join(root,'tests/fixtures/dual-array-browser-records')).sort());
});

test('Record portability source gates are mandatory and every prior source and builder name is retained',()=>{
 const workflow=read('.github/workflows/pages.yml').toString(),builder=read('tests/compatibility-build.test.cjs').toString();
 for(const[file,wanted]of Object.entries(R.delta.sourceOnlyGates)){a.ok(workflow.includes(file));a.deepEqual(names(read(file).toString()),wanted);}
 a.equal(R.delta.sourceOnlyGates['tests/dual-array-record-portability.test.cjs'].length,11);a.equal(R.delta.sourceOnlyGates['tests/dual-array-record-portability-integration.test.cjs'].length,8);
 a.ok(builder.includes('Object.entries(recordPortability.delta.sourceOnlyGates)'));a.deepEqual(names(builder),names(previous('tests/compatibility-build.test.cjs').toString()));a.equal(names(builder).length,37);
 for(const row of R.delta.changedFiles.filter(row=>row.path.startsWith('tests/')&&row.path.endsWith('.test.cjs')))a.deepEqual(names(read(row.path).toString()),names(previous(row.path).toString()),'preserved named gate '+row.path);
 a.equal(R.mapping.addedEntries.find(x=>x.source==='tests/dual-array-record-portability.test.cjs').compatibility,'tests/dual-array-record-portability.test.cjs');
});

test('Record timer fixture executes current records while old hashes are used only by provenance reads',t=>{
 const F=require('./helpers/dual-array-browser-timer-fixture.cjs'),snapshot=F.prepare(root),fixture=F.createFixture(root);t.after(fixture.cleanup);
 const file='labs/dual-array/runtime/records.mjs';a.deepEqual(snapshot.get(file),read(file));a.deepEqual(fs.readFileSync(path.join(fixture.directory,file)),read(file));a.notEqual(R.sha(snapshot.get(file)),R.delta.profile.before.sha256);
 a.equal(R.sha(snapshot.get(B.timer.correction.path)),B.timer.correction.after.sha256);a.deepEqual(snapshot.get('tests/dual-array-browser-timers.test.cjs'),read('tests/dual-array-browser-timers.test.cjs'));
 a.equal(snapshot.size,27);a.equal(snapshot.has('tests/fixtures/dual-array-browser-records/original-records.mjs'),false);
 const timer=snapshot.get('tests/dual-array-browser-timers.test.cjs').toString();a.match(timer,/import\('\.\.\/labs\/dual-array\/runtime\/client\.mjs'\)/);a.match(timer,/provenance\.maybeWithoutFile\(file, fs\.readFileSync/);
 for(const row of F.spec.files)a.ok(R.identity(fs.readFileSync(path.join(fixture.directory,row.path)),row.output));
});

test('Record integration preserves historical evidence bytes and restricts the public change to one runtime leaf',()=>{
 const manifest=require('../build/compatibility-manifest.json');
 const publicChanged=[...R.leaf.delta.files,...R.delta.changedFiles].flatMap(row=>manifest.entries.filter(entry=>entry.source===row.path&&entry.public!==null).map(entry=>entry.public));
 a.deepEqual(publicChanged,['labs/dual-array/runtime/records.mjs','scripts/build/module-dependencies.cjs','scripts/build/module-runtime-contracts.json']);
 for(const file of ['tests/helpers/dual-array-current-runtime-delta.json','tests/helpers/dual-array-current-runtime-freeze.json','tests/helpers/dual-array-browser-integration-delta.json','tests/helpers/dual-array-browser-timer-repair.json','labs/dual-array/FUNCTIONAL-FREEZE.json'])a.equal(endpoint(file),undefined,'historical evidence never rebased '+file);
 for(const row of B.delta.acceptedFiles)a.ok(R.identity(R.maybeWithoutFile(row.path,require('./helpers/ofdm-false-alarm-integration-preservation.cjs').withoutFile(row.path,read(row.path))),row),'every previous reviewed endpoint '+row.path);
});
