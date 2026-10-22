'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..'),F=require('./helpers/dual-array-browser-integration-preservation.cjs'),read=f=>fs.readFileSync(path.join(root,f));
function readForHistory(file){return require('./helpers/channel-mapping-preservation.cjs').readCurrentForHistory(file,fs.readFileSync(path.join(root,file)),{root});}
const records=require('./helpers/dual-array-record-portability-preservation.cjs'),priorRead=f=>records.maybeWithoutFile(f,require('./helpers/ofdm-false-alarm-integration-preservation.cjs').withoutFile(f,readForHistory(f)));
const names=s=>[...s.matchAll(/^(?:for \(const type of \['error', 'messageerror'\]\) )?(?:test|lifecycle)\((?:'([^']+)'|`([^`]+)`)/gm)].flatMap(m=>m[1]?[m[1]]:['error','messageerror'].map(type=>m[2].replace('${type}',type)));
test('Browser integration pins all three reviewed leaves and preserves every maintenance source endpoint',()=>{
 a.deepEqual(F.delta.acceptedCommits,['a73e62c0cef6b6a993957c6e9537569037015fb6','2d1b7a4bac8224a739ccbe6bda1cd8ca27662db4','33f0ad091da8c1cb163837dd10eec5b71e37e6bf']);
 for(const row of F.delta.acceptedFiles)a.ok(F.identity(priorRead(row.path),row),'reviewed source '+row.path);
 for(const row of F.delta.changedFiles){const current=priorRead(row.path),prior=F.withoutFile(row.path,current);a.ok(F.identity(prior,row.before));a.deepEqual(F.maybeWithoutFile(row.path,prior),prior);for(const bad of [prior,current.subarray(1),Buffer.concat([current,Buffer.from('unreviewed')])])a.throws(()=>F.withoutFile(row.path,bad));for(const key of ['before','after'])for(const field of ['bytes','sha256']){const bad=structuredClone(row);bad[key][field]=field==='bytes'?0:'0'.repeat(64);a.throws(()=>F.reverseFile(row.path,current,[bad]));}const bad=structuredClone(row);bad.beforeBase64='eA==';a.throws(()=>F.reverseFile(row.path,current,[bad]));a.throws(()=>F.reverseFile(row.path,current,[row,row]));}
 for(const row of F.delta.priorTests){const current=priorRead(row.path),old=F.maybeWithoutFile(row.path,current);a.ok(F.identity(old,row),'all prior test source identities '+row.path);}
});
test('Browser integration current profiles accept only repaired client and readable CSS with unchanged runtime edges',()=>{
 const P=require('../scripts/build/module-dependencies.cjs'),D=require('./helpers/dual-array-integration-delta.json');
 const profiles=F.currentDualArrayProfiles(D.moduleProfiles),source=profiles.map(x=>({file:x.public,source:read(x.public).toString()})),identities=source.map(x=>({file:x.file,sha256:F.sha(x.source)}));
 const contract={schemaVersion:1,modules:profiles},edges=P.moduleDependencies(source,contract,identities);a.deepEqual(edges,F.delta.currentEdges);
 for(const hash of [F.timer.correction.before.sha256,'0'.repeat(64)]){const bad=structuredClone(contract);bad.modules.find(x=>x.public===F.timer.correction.path).sha256=hash;a.throws(()=>P.moduleDependencies(source,bad,identities));}
 const css=F.display.corrections[0];P.moduleDependencies([],{schemaVersion:1,modules:[]},[{file:css.path,sha256:css.after.sha256}]);for(const hash of [css.before.sha256,'0'.repeat(64)])a.throws(()=>P.moduleDependencies([],{schemaVersion:1,modules:[]},[{file:css.path,sha256:hash}]));
 const before=JSON.stringify(F.delta.clientProfile),isolated=F.currentDualArrayProfiles(D.moduleProfiles);isolated.find(x=>x.public===F.timer.correction.path).runtimeEdges[0].extra=true;a.equal(JSON.stringify(F.delta.clientProfile),before,'caller mutations cannot alias the frozen profile record');
 a.deepEqual(F.maybeWithoutContracts(contract).modules,D.moduleProfiles);for(const mutate of [x=>x.modules.push(structuredClone(x.modules.find(r=>r.public===F.timer.correction.path))),x=>x.modules.find(r=>r.public===F.timer.correction.path).extra=true,x=>x.modules.find(r=>r.public===F.timer.correction.path).runtimeEdges=[]]){const bad=structuredClone(contract);mutate(bad);a.throws(()=>F.maybeWithoutContracts(bad));}
});
test('Browser integration build-only mappings and exact names make all current and historical gates mandatory',()=>{
 const manifest=require('./helpers/ofdm-false-alarm-integration-preservation.cjs').withoutMappings(JSON.parse(readForHistory('build/compatibility-manifest.json'))),old=F.withoutMappings(manifest);a.deepEqual(manifest.entries.filter(x=>x.public!==null),old.entries.filter(x=>x.public!==null));a.equal(old.entries.filter(x=>x.public!==null).length,1177);
 for(const row of F.mapping.addedEntries){a.equal(row.public,null);for(const mode of ['missing','duplicate','spoof']){const bad=structuredClone(manifest);if(mode==='missing')bad.entries=bad.entries.filter(x=>x.source!==row.source);if(mode==='duplicate')bad.entries.push(structuredClone(row));if(mode==='spoof')bad.entries.find(x=>x.source===row.source).public='unreviewed';a.throws(()=>F.withoutMappings(bad));}}
 const workflow=read('.github/workflows/pages.yml').toString(),builder=read('tests/compatibility-build.test.cjs').toString();a.ok(builder.includes('Object.entries(browserRepair.sourceOnlyGates)'));a.deepEqual(names(builder),F.delta.priorBuilderNames);
 for(const[file,wanted]of Object.entries(F.delta.sourceOnlyGates)){a.ok(workflow.includes(file));const origin=F.delta.gateOrigins[file]||file;a.deepEqual(names(read(origin).toString()),wanted);}
 a.equal(F.delta.sourceOnlyGates['tests/dual-array-browser-timers-current.test.cjs'].length,17);a.equal(F.delta.sourceOnlyGates['tests/dual-array-plot-readability-current.test.cjs'].length,5);a.equal(F.delta.sourceOnlyGates['tests/dual-array-current-runtime.test.cjs'].length,6);
 a.equal(F.mapping.addedEntries.find(x=>x.source==='tests/dual-array-browser-timers.test.cjs').compatibility,'tests/owned/dual-array-browser-timers.test.cjs');
});
test('Browser timer fixture keeps repaired execution and restores only display and provenance with exact owned cleanup',t=>{
 const Q=require('./helpers/dual-array-browser-timer-fixture.cjs'),snapshot=Q.prepare(root),fixture=Q.createFixture(root);t.after(fixture.cleanup);
 a.equal(F.sha(snapshot.get(F.timer.correction.path)),F.timer.correction.after.sha256);a.deepEqual(snapshot.get('tests/dual-array-browser-timers.test.cjs'),read('tests/dual-array-browser-timers.test.cjs'));
 const currentDisplay=Q.prepare(root,'display');a.deepEqual(currentDisplay.get(Q.spec.page),read(Q.spec.page));a.deepEqual(currentDisplay.get(F.display.corrections[0].path),read(F.display.corrections[0].path));
 a.equal(snapshot.size,27);for(const row of Q.spec.files){const file=path.join(fixture.directory,row.path);a.ok(F.identity(fs.readFileSync(file),row.output));a.equal(fs.lstatSync(file).nlink,1);}
 const neighbor=fs.mkdtempSync(path.join(os.tmpdir(),'isac-dual-array-timer-neighbor-'));t.after(()=>fs.rmSync(neighbor,{recursive:true,force:true}));fs.writeFileSync(path.join(neighbor,'sentinel'),'keep');fixture.cleanup();a.equal(fs.existsSync(fixture.directory),false);fixture.cleanup();a.equal(fs.readFileSync(path.join(neighbor,'sentinel'),'utf8'),'keep');
 for(const row of Q.spec.files){const current=read(row.path);if(row.path===Q.spec.page)a.equal(F.sha(F.display.normalizePage(current.toString())),row.currentNormalizedSha256);else a.ok(F.identity(current,row.input),'source remained unchanged '+row.path);}
});
test('Browser timer fixture rejects mutated current source and page content before allocating executable files',t=>{
 const Q=require('./helpers/dual-array-browser-timer-fixture.cjs'),home=fs.mkdtempSync(path.join(os.tmpdir(),'isac-dual-array-timer-mutations-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 for(const row of Q.spec.files){fs.mkdirSync(path.dirname(path.join(home,row.path)),{recursive:true});fs.copyFileSync(path.join(root,row.path),path.join(home,row.path));}
 for(const file of [F.timer.correction.path,F.display.corrections[0].path,Q.spec.page,'labs/dual-array/lesson/tests/lesson.test.mjs',Q.spec.suite]){const target=path.join(home,file),saved=fs.readFileSync(target);try{fs.appendFileSync(target,'unreviewed');a.throws(()=>Q.createFixture(home));}finally{fs.writeFileSync(target,saved);}}
 const page=path.join(home,Q.spec.page),saved=fs.readFileSync(page);fs.writeFileSync(page,saved.toString().replace('14,464','14,465'));a.throws(()=>Q.prepare(home));fs.writeFileSync(page,saved);
 const client=path.join(home,F.timer.correction.path);fs.writeFileSync(client,F.timer.withoutClient(fs.readFileSync(client)));a.throws(()=>Q.prepare(home));
});
