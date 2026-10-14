'use strict';
// Source-only tests: run the actual six scenario callbacks with tiny independent
// copied inputs and an instrumented build boundary. Full scientific gates remain mandatory.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),builderPath='tests/compatibility-build.test.cjs',read=f=>require('./helpers/dual-array-browser-integration-preservation.cjs').maybeWithoutFile(f,require('./helpers/ofdm-false-alarm-integration-preservation.cjs').withoutFile(f,fs.readFileSync(path.join(root,f)))),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const current=read(builderPath),delta=require('../build/fixture-lifetime-source-delta.json'),T=require('./helpers/desktop-layout-integration-preservation.cjs');
const groups=['missing classic dependencies, changed source plus spoofed JSON, and undeclared alternate-extension files fail before output','80211ad missing dependencies changed frozen source and namespace bypasses fail before output'];
function inverse(file,bytes,rows=delta.changedFiles){
 const matches=rows.filter(r=>r.path===file);a.equal(matches.length,1,'one exact source identity');const r=matches[0];a.equal(bytes.length,r.after.bytes);a.equal(sha(bytes),r.after.sha256);let prior=bytes;
 for(const ch of [...r.changes].reverse()){const before=Buffer.from(ch.beforeBase64,'base64'),after=Buffer.from(ch.afterBase64,'base64');a.deepEqual(prior.subarray(ch.offsetAfter,ch.offsetAfter+after.length),after);prior=Buffer.concat([prior.subarray(0,ch.offsetAfter),before,prior.subarray(ch.offsetAfter+after.length)]);}
 a.equal(prior.length,r.before.bytes);a.equal(sha(prior),r.before.sha256);return prior;
}
function records(dir){return fs.readdirSync(dir,{recursive:true}).filter(f=>fs.lstatSync(path.join(dir,f)).isFile()).sort().map(f=>({path:f,bytes:fs.statSync(path.join(dir,f)).size,sha256:sha(fs.readFileSync(path.join(dir,f)))}));}
function harness(t,bytes=current,{checkPrevious=true,inject=null}={}){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'isac-fixture-lifetime-unit-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const source=path.join(home,'source'),unowned=path.join(home,'unowned');fs.mkdirSync(source);fs.mkdirSync(unowned);fs.writeFileSync(path.join(unowned,'sentinel'),'must survive every owned cleanup');
 const paths=['labs/ofdm-ici/runtime/js/linalg.js','labs/ofdm-ici/runtime/worker/ici-worker.js','labs/80211ad/runtime/worker/receiver-worker.js','labs/80211ad/runtime/worker/protocol.js'];
 const contents=new Map(paths.map((file,i)=>[file,Buffer.from('/* independent synthetic input '+i+' */\n'+'x'.repeat(127+i))]));
 contents.set('scripts/build/classic-runtime-contracts.json',Buffer.from(JSON.stringify({scripts:paths.map(file=>({public:file,sha256:sha(contents.get(file))}))})+'\n'));
 for(const[file,data]of contents){fs.mkdirSync(path.dirname(path.join(source,file)),{recursive:true});fs.writeFileSync(path.join(source,file),data);}
 const originalRecords=records(source),sentinel=records(unowned),fixtureBytes=originalRecords.reduce((sum,r)=>sum+r.bytes,0),manifest={entries:[...contents.keys()].map(file=>({source:file,compatibility:file,public:file,owner:'synthetic',role:'source'}))};
 const owned=[],fallbacks=[],removed=[],builds=[],checks=[],registrations=new Map();let group=null,seenOutput=null,finalAssertions=0,peakLiveFixtures=0,peakLiveSourceBytes=0;
 const ownedNow=()=>owned.filter(p=>fs.existsSync(p));
 const wrappedFs=Object.create(fs);
 wrappedFs.readFileSync=(file,...args)=>path.resolve(file)===path.join(root,'build/compatibility-manifest.json')?JSON.stringify(manifest):fs.readFileSync(file,...args);
 wrappedFs.mkdtempSync=prefix=>{
  a.equal(prefix,path.join(os.tmpdir(),'isac-build-test-'),'only original temp helper allocates scenario roots');
  if(owned.length%2===0){
   if(checkPrevious)for(const prior of owned)a.equal(fs.existsSync(prior),false,'previous scenario absent before next allocation');
   a.deepEqual(records(source),originalRecords,'synthetic root bytes unchanged before every scenario');
  }
  const p=fs.mkdtempSync(path.join(home,'owned-'));owned.push(p);return p;
 };
 wrappedFs.copyFileSync=(from,to,...args)=>{
  const relative=path.relative(root,from);a.ok(contents.has(relative),'copy only an exact mapped synthetic source');a.ok(owned.includes(path.resolve(to).slice(0,-relative.length-1)),'copy only into allocated fixture root');
  const input=path.join(source,relative);fs.copyFileSync(input,to,...args);a.notEqual(fs.statSync(input).ino,fs.statSync(to).ino,'fresh copy is not a source hardlink');
 };
 wrappedFs.rmSync=(file,options)=>{a.ok(owned.includes(file),'no deletion outside exact allocated roots');a.deepEqual(JSON.parse(JSON.stringify(options)),{recursive:true,force:true});removed.push(file);fs.rmSync(file,options);a.deepEqual(records(unowned),sentinel,'neighbor sentinel survives cleanup');};
 wrappedFs.existsSync=file=>{const exists=fs.existsSync(file);if(builds.length&&file===builds.at(-1).output){seenOutput={file,exists};a.ok(fs.existsSync(builds.at(-1).root),'fixture remains until no-output assertion');a.ok(fs.existsSync(path.dirname(file)),'output parent remains until no-output assertion');}return exists;};
 const wrappedAssert=Object.create(a);
 wrappedAssert.equal=(actual,expected,...args)=>{if(seenOutput){a.equal(expected,false,'original final no-output assertion remains');a.equal(actual,seenOutput.exists);checks.push({...seenOutput});seenOutput=null;if(inject==='assertion')throw Error('injected final assertion failure');a.equal(actual,expected,...args);finalAssertions++;}else a.equal(actual,expected,...args);};
 const build=options=>{
  const {root:p,manifest:m,output}=options,scenario=path.basename(output),isAd=group===groups[1],worker=isAd?paths[2]:paths[1],missing=isAd?paths[3]:paths[0],changed=new Set();
  a.equal(owned.at(-2),p);a.equal(owned.at(-1),path.dirname(output));a.equal(fs.existsSync(output),false,'scenario starts without output');
  if(scenario==='missing'){a.equal(fs.existsSync(path.join(p,missing)),false);changed.add(missing);}
  if(scenario==='spoof'){const suffix=isAd?'\n/* unreviewed */':'\n/* unreviewed source */\n';a.deepEqual(fs.readFileSync(path.join(p,worker)),Buffer.concat([contents.get(worker),Buffer.from(suffix)]));const contracts=JSON.parse(fs.readFileSync(path.join(p,'scripts/build/classic-runtime-contracts.json')));a.equal(contracts.scripts.find(x=>x.public===worker).sha256,sha(fs.readFileSync(path.join(p,worker))));changed.add(worker);changed.add('scripts/build/classic-runtime-contracts.json');}
  if(scenario==='unknown'||scenario==='extension'){const file=isAd?'labs/80211ad/unknown.dat':'labs/ofdm-ici/unreviewed.dat';a.equal(fs.readFileSync(path.join(p,file),'utf8'),isAd?'unreviewed':'unreviewed namespace member');a.deepEqual(JSON.parse(JSON.stringify(m.entries.at(-1))),{source:file,compatibility:file,public:file,owner:isAd?'labs/80211ad':'labs/ofdm-ici',role:'source'});a.equal(m.entries.length,manifest.entries.length+1);}
  for(const[file,data]of contents)if(!changed.has(file))a.deepEqual(fs.readFileSync(path.join(p,file)),data,'no mutation leaked from another scenario');
  a.deepEqual(records(source),originalRecords,'source root unchanged after mutation');
  const live=owned.filter((_,i)=>i%2===0).filter(p=>fs.existsSync(p));peakLiveFixtures=Math.max(peakLiveFixtures,live.length);peakLiveSourceBytes=Math.max(peakLiveSourceBytes,live.reduce((sum,p)=>sum+records(p).reduce((n,r)=>n+r.bytes,0),0));
  builds.push({group,scenario,root:p,output});
  if(inject==='build')throw Error('injected unexpected build failure');
  if(inject==='published-output'){fs.mkdirSync(output);fs.writeFileSync(path.join(output,'wrong'),'incorrect publication must be observed');}
  throw Error(scenario==='missing'?'Missing source':scenario==='spoof'?'Unreviewed classic runtime contract':'Unreviewed classic source path');
 };
 const realRequire=createRequire(path.join(root,builderPath));
 const localRequire=id=>id==='node:test'?{test(name,options,fn){registrations.set(name,typeof options==='function'?options:fn);}}:id==='node:fs'?wrappedFs:id==='node:assert/strict'?wrappedAssert:id==='../scripts/build/compatibility.cjs'?{...realRequire(id),build}:realRequire(id);
 vm.runInNewContext(bytes.toString(),{require:localRequire,__dirname:path.join(root,'tests'),Buffer,structuredClone,console},{filename:builderPath});
 return {run(name){group=name;registrations.get(name)({after:fn=>fallbacks.push(fn)});},fallback(){for(const cleanup of fallbacks)cleanup();},owned,removed,builds,checks,ownedNow,registrations,fixtureBytes,get peakLiveFixtures(){return peakLiveFixtures;},get peakLiveSourceBytes(){return peakLiveSourceBytes;},get finalAssertions(){return finalAssertions;},verifyRoots(){a.deepEqual(records(source),originalRecords);a.deepEqual(records(unowned),sentinel);},source,unowned};
}
test('Fixture scopes retain all 37 builder names and the exact six original mutation rejection and output assertions',()=>{
 const old=inverse(builderPath,current),names=s=>[...s.toString().matchAll(/test\('([^']+)'/g)].map(x=>x[1]);a.equal(names(old).length,37);a.deepEqual(names(current),names(old));
 const strip=s=>s.replace(/fixtureScope\(t,t=>\{const p=fixture\(t\)/g,'{const p=fixture(t)').replace(/a\.equal\(fs\.existsSync\(out\),false\);\}\);/g,'a.equal(fs.existsSync(out),false);}');
 for(const name of groups){const block=s=>{const start=s.toString().indexOf("test("+"'"+name+"'");return s.toString().slice(start,s.toString().indexOf('\n\n',start));};a.equal(strip(block(current)),block(old));}
});
test('Fixture scopes remove previous roots before every fresh scenario and leave source hashes and unrelated roots unchanged',t=>{
 const h=harness(t);for(const name of groups)h.run(name);a.equal(h.builds.length,6);a.equal(h.finalAssertions,6);a.equal(h.peakLiveFixtures,1);a.equal(h.owned.length,12);a.equal(new Set(h.owned).size,12);a.equal(h.removed.length,12);a.deepEqual(h.ownedNow(),[]);h.verifyRoots();h.fallback();a.equal(h.removed.length,24);a.deepEqual(h.ownedNow(),[]);h.verifyRoots();
});
test('Fixture scopes clean exact owned roots after injected assertion and unexpected build failures',t=>{
 for(const inject of ['assertion','build'])for(const name of groups){const h=harness(t,current,{inject});a.throws(()=>h.run(name),inject==='assertion'?/injected final assertion failure/:/injected unexpected build failure/);a.equal(h.builds.length,1);a.equal(h.owned.length,2);a.deepEqual(h.ownedNow(),[]);a.equal(h.removed.length,2);h.fallback();a.equal(h.removed.length,4);h.verifyRoots();}
});
test('Fixture scopes cannot hide incorrectly published output before the original no-output assertion',t=>{
 for(const name of groups){const h=harness(t,current,{inject:'published-output'});a.throws(()=>h.run(name),{code:'ERR_ASSERTION'});a.equal(h.checks.length,1);a.equal(h.checks[0].exists,true);a.equal(h.finalAssertions,0);a.deepEqual(h.ownedNow(),[]);h.fallback();h.verifyRoots();}
});
test('Fixture scope cleanup never follows links into unrelated roots and fallback remains idempotent',t=>{
 const h=harness(t);const code=current.toString().match(/function fixtureScope\(t,run\)\{[\s\S]*?\n\}/)[0];
 const context={};vm.runInNewContext(code+'\nthis.scope=fixtureScope;',context);const owned=fs.mkdtempSync(path.join(h.source,'scope-'));const cleanups=[];context.scope({after:fn=>cleanups.push(fn)},t=>{t.after(()=>fs.rmSync(owned,{recursive:true,force:true}));fs.symlinkSync(h.unowned,path.join(owned,'neighbor-link'));a.ok(fs.existsSync(path.join(owned,'neighbor-link','sentinel')));});a.equal(fs.existsSync(owned),false);h.verifyRoots();for(const cleanup of cleanups)cleanup();h.verifyRoots();
});
test('Fixture lifetime exact outer inverse restores all reviewed source bytes and rejects forged identities edits and paths',()=>{
 a.equal(delta.acceptedCommit,'d0fa024b352089e10e4f885e1fa2b5d77a1e5104');a.equal(delta.acceptedTree,'a0b0a15e7d212ac2334cb5e94f5553de0869c0e8');a.deepEqual(delta.changedFiles.map(x=>x.path),[builderPath,'tests/helpers/desktop-layout-integration-preservation.cjs']);a.deepEqual(T.fixtureLifetimeBuilder,delta.changedFiles[0]);
 for(const row of delta.changedFiles){const bytes=read(row.path),copy=Buffer.from(bytes),before=inverse(row.path,bytes);a.deepEqual(bytes,copy);for(const bad of [before,bytes.subarray(1),Buffer.concat([bytes,Buffer.from('x')])])a.throws(()=>inverse(row.path,bad));a.throws(()=>inverse('unlisted/'+row.path,bytes));a.throws(()=>inverse(row.path,bytes,[row,row]));for(const key of ['before','after'])for(const field of ['bytes','sha256']){const bad=structuredClone(row);bad[key][field]=field==='bytes'?0:'0'.repeat(64);a.throws(()=>inverse(row.path,bytes,[bad]));}for(const field of ['offsetAfter','beforeBase64','afterBase64']){const bad=structuredClone(row);bad.changes[0][field]=field==='offsetAfter'?0:Buffer.from('forged edit').toString('base64');a.throws(()=>inverse(row.path,bytes,[bad]));}}
 const prior=inverse(builderPath,current);a.deepEqual(T.withoutFixtureLifetimeBuilder(builderPath,current),prior);a.deepEqual(T.withoutFixtureLifetimeBuilder(builderPath,prior),prior);a.deepEqual(T.withoutFixtureLifetimeBuilder('unlisted/'+builderPath,current),current);for(const bad of [current.subarray(1),Buffer.concat([current,Buffer.from('x')])])a.throws(()=>T.withoutFixtureLifetimeBuilder(builderPath,bad));
 const historical=require('./helpers/gaussian-tradeoff-legacy-hooks.json').files.find(x=>x.source===builderPath);let old=require('./helpers/cellfree-maprt-build-preservation.cjs').withoutCellfreeLegacyHook(builderPath,current);a.equal(sha(old),historical.afterSha256);for(const ch of [...historical.changes].reverse()){const before=Buffer.from(ch.beforeBase64,'base64'),after=Buffer.from(ch.afterBase64,'base64');a.deepEqual(old.subarray(ch.offsetAfter,ch.offsetAfter+after.length),after);old=Buffer.concat([old.subarray(0,ch.offsetAfter),before,old.subarray(ch.offsetAfter+after.length)]);}a.equal(sha(old),historical.beforeSha256);
});
test('Fixture lifecycle source checks are mandatory in the unchanged named builder gate and measured tiny live bytes remain distinct from estimates',t=>{
 const names=[...read('tests/build-fixture-lifetime.test.cjs').toString().matchAll(/test\('([^']+)'/g)].map(x=>x[1]);a.equal(names.length,7);a.deepEqual(delta.sourceOnlyGates,{'tests/build-fixture-lifetime.test.cjs':names});a.ok(current.toString().includes('Object.entries(fixtureLifetime.sourceOnlyGates)'));a.ok(!require('../build/compatibility-manifest.json').entries.some(x=>x.source==='tests/build-fixture-lifetime.test.cjs'));
 const before=harness(t,inverse(builderPath,current),{checkPrevious:false}),after=harness(t);for(const name of groups){before.run(name);before.fallback();after.run(name);after.fallback();}a.equal(before.builds.length,6);a.equal(after.builds.length,6);a.equal(before.finalAssertions,6);a.equal(after.finalAssertions,6);a.equal(before.peakLiveFixtures,3);a.equal(after.peakLiveFixtures,1);a.ok(before.peakLiveSourceBytes>after.peakLiveSourceBytes);before.verifyRoots();after.verifyRoots();t.diagnostic(JSON.stringify({measurement:'tiny synthetic copied-file logical bytes at instrumented build boundaries; not RSS or whole-suite peaks',fixtureBytes:after.fixtureBytes,beforePeakLiveFixtures:before.peakLiveFixtures,afterPeakLiveFixtures:after.peakLiveFixtures,beforePeakLiveSourceBytes:before.peakLiveSourceBytes,afterPeakLiveSourceBytes:after.peakLiveSourceBytes}));
});
