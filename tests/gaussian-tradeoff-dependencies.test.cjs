'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {moduleDependencies,staticModuleDependencies}=require('../scripts/build/module-dependencies.cjs');
const {classicDependencies}=require('../scripts/build/classic-dependencies.cjs');
const {checkDependencies}=require('../scripts/build/compatibility.cjs');
const root=path.resolve(__dirname,'..'),prefix='labs/gaussian-tradeoff/',runtime=prefix+'runtime/';
const classic=require('../scripts/build/classic-runtime-contracts.json'),modules=require('../scripts/build/module-runtime-contracts.json');
const delta=require('./helpers/gaussian-tradeoff-runtime-delta.json'),baseline=require('./helpers/gaussian-tradeoff-baseline.json');
const manifest=require('../build/compatibility-manifest.json');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function read(file){const direct=path.join(root,file);if(fs.existsSync(direct))return fs.readFileSync(direct,'utf8');const entry=manifest.entries.find(e=>e.public===file);a.ok(entry?.source,'mapped input '+file);return fs.readFileSync(path.join(root,entry.source),'utf8');}
const identities=sources=>sources.map(({file,source})=>({file,sha256:sha(source)}));
function esmFixture(){const source=delta.moduleProfiles.map(c=>({file:c.public,source:read(c.public)}));return {source,contract:{schemaVersion:1,modules:structuredClone(delta.moduleProfiles)},identities:identities(source)};}
function esm(f){return moduleDependencies(f.source,f.contract,f.identities);}
function classicFixture(){const source=classic.scripts.map(c=>({file:c.public,source:read(c.public)}));return {source,contract:structuredClone(classic),identities:identities(source)};}
function classicEdges(f){return classicDependencies(f.source,f.contract,f.identities);}
function inverse(source,changes){for(const change of [...changes].reverse()){a.equal(source.split(change.after).length,2,'exact reversible source fragment');source=source.replace(change.after,change.before);}return source;}

test('Gaussian extension preserves every prior 27 classic and 32 ESM row and exact gate source',()=>{
 a.equal(delta.priorClassicProfileCount,27);a.equal(delta.priorModuleProfileCount,32);a.equal(classic.scripts.length,28);a.equal(modules.modules.length,41);
 a.deepEqual(classic.scripts.slice(27),delta.classicProfiles);a.deepEqual(modules.modules.slice(32),delta.moduleProfiles);
 a.equal(sha(JSON.stringify({schemaVersion:1,scripts:classic.scripts.slice(0,27)},null,2)+'\n'),baseline.classicContracts);
 a.equal(sha(JSON.stringify({schemaVersion:1,modules:require('./helpers/gaussian-tradeoff-preservation.cjs').withoutNearfieldExportContracts(modules).modules.slice(0,32)},null,2)+'\n'),baseline.esmContracts);
 for(const [file,key,hash]of [['classic-dependencies.cjs','classicParserChanges','classicParser'],['module-dependencies.cjs','moduleParserChanges','esmParser'],['compatibility.cjs','builderChanges','builder']]){
  const source=read('scripts/build/'+file);a.equal(sha(inverse(source,delta[key])),baseline[hash]);
  const damaged=source.replace(delta[key][0].after,delta[key][0].after+'\n/* unreviewed */');a.notEqual(sha(inverse(damaged,delta[key])),baseline[hash]);
 }
});

test('Gaussian runtime profile hashes match the independently accepted seven-file source freeze',()=>{
 const text=read(runtime+'SOURCE-FREEZE.json');a.equal(sha(text),'ea5c2ad520d33962b4d33e9f6e9f89e9ddaa3e1ee41e4d249250c54da91cb113');
 const frozen=JSON.parse(text).runtime_files;a.equal(Object.keys(frozen).length,7);
 for(const [relative,hash]of Object.entries(frozen)){
  const file=runtime+relative,record=[...delta.classicProfiles,...delta.moduleProfiles].find(x=>x.public===file);
  a.ok(record,'profile '+file);a.equal(record.sha256,hash);a.equal(sha(read(file)),hash);
 }
});

test('Gaussian static imports are parsed without executing source and browser/Node fallback edges are exact',()=>{
 const f=esmFixture(),out=esm(f),parsed=staticModuleDependencies(f.source),byFile=new Map(parsed.map(x=>[x.file,x.specifiers]));
 a.equal(sha(read(prefix+'lesson/LESSON-FREEZE.json')),'c4d52b780e100daaed3fe7ba5259eb57135af076e40cdd00da3ae4e850d2e41f');
 const assets=JSON.parse(read(prefix+'lesson/PUBLIC-ASSETS.json'));
 a.deepEqual(Object.keys(assets.static_module_edges).sort(),delta.moduleProfiles.filter(x=>x.public.startsWith(prefix+'lesson/')).map(x=>x.public).sort());
 for(const [file,imports]of Object.entries(assets.static_module_edges)){
  a.deepEqual([...byFile.get(file)].sort(),[...imports].sort(),'exact parsed lesson imports '+file);
  const profile=delta.moduleProfiles.find(x=>x.public===file);a.equal(profile.runtimePolicy,'no-runtime-loads');a.deepEqual(profile.runtimeEdges,[]);
 }
 a.deepEqual(byFile.get(runtime+'math.mjs'),['./vendor/linalg.js']);
 a.deepEqual(byFile.get(runtime+'kernel.mjs'),['./codec.mjs','./math.mjs','./presets.mjs']);
 a.deepEqual(byFile.get(runtime+'worker.mjs'),['./kernel.mjs','./runtime.mjs']);
 a.deepEqual(out.filter(e=>e.kind==='reviewed-worker'),[{from:runtime+'runtime.mjs',url:'./worker.mjs',kind:'reviewed-worker'}]);
 a.deepEqual(out.filter(e=>e.kind==='reviewed-node-builtin'),[
  {from:runtime+'codec.mjs',url:'node:crypto',kind:'reviewed-node-builtin'},
  {from:runtime+'runtime.mjs',url:'node:worker_threads',kind:'reviewed-node-builtin'},
  {from:runtime+'worker.mjs',url:'node:worker_threads',kind:'reviewed-node-builtin'}
 ]);
 // The runtime accepts injected transports, but only its frozen default factory
 // is a reviewed public endpoint. No dependency is fabricated for that callback.
 a.ok(read(runtime+'runtime.mjs').includes('const factory=ownedOptions.createWorker??(async()=>{'));
 a.equal(out.filter(e=>e.kind==='reviewed-worker').length,1);
});

test('every Gaussian module rejects changed bytes even with matching JSON and public identity hashes',()=>{
 for(const original of delta.moduleProfiles){
  const f=esmFixture(),m=f.source.find(x=>x.file===original.public),c=f.contract.modules.find(x=>x.public===original.public);
  m.source+='\n/* unreviewed Gaussian source */';f.identities.find(x=>x.file===m.file).sha256=sha(m.source);
  a.throws(()=>esm(f),/Unreviewed module source hash/);
  c.sha256=sha(m.source);a.throws(()=>esm(f),/Unreviewed frozen runtime source hash/);
 }
});

test('Gaussian runtime endpoint omission, additions, reordering, fallback changes and policy downgrade fail closed',()=>{
 for(const record of delta.moduleProfiles.filter(x=>x.runtimeEdges.length)){
  for(const mutate of [c=>c.runtimeEdges.pop(),c=>c.runtimeEdges.push({...c.runtimeEdges[0]}),c=>c.runtimeEdges[0].url='https://unreviewed.invalid/worker.mjs',c=>c.runtimeEdges[0].url='../outside.mjs',c=>c.runtimeEdges[0].kind='unreviewed',c=>c.runtimeEdges[0].literal='await import("unreviewed")',c=>c.runtimeEdges[0].extra=true,c=>{c.runtimePolicy='no-runtime-loads';c.runtimeEdges=[];},c=>{c.runtimePolicy='command-line-inputs-unverified';c.runtimeEdges=[];c.unverifiedInputs=['unreviewed downgrade'];}]){
   const f=esmFixture();mutate(f.contract.modules.find(x=>x.public===record.public));a.throws(()=>esm(f));
  }
 }
 const f=esmFixture();f.contract.modules.find(x=>x.public===runtime+'runtime.mjs').runtimeEdges.reverse();a.throws(()=>esm(f),/endpoint mismatch/);
 for(const [file,before,after]of [
  ['runtime.mjs',"new URL('./worker.mjs',import.meta.url)","new URL('./worker.mjs','https://unreviewed.invalid/')"],
  ['runtime.mjs',"import('node:worker_threads')","import('./unreviewed.mjs')"],
  ['worker.mjs',"import('node:worker_threads')","import('node:fs')"],
  ['codec.mjs',"import('node:crypto')","import('node:fs')"]
 ]){
  const f=esmFixture(),m=f.source.find(x=>x.file===runtime+file);a.ok(m.source.includes(before));m.source=m.source.replace(before,after);
  f.contract.modules.find(x=>x.public===m.file).sha256=sha(m.source);f.identities.find(x=>x.file===m.file).sha256=sha(m.source);a.throws(()=>esm(f),/Unreviewed frozen runtime source hash/);
 }
});

test('frozen Gaussian ESM bytes cannot relocate under any extension or policy downgrade',()=>{
 for(const record of delta.moduleProfiles)for(const extension of ['.mjs','.js','.JS','.cjs','.txt','.dat','']){
  const f=esmFixture(),wrong='wrong-prefix/renamed'+extension;
  f.identities.push({file:wrong,sha256:record.sha256});a.throws(()=>esm(f),/Reviewed frozen runtime path mismatch/);
 }
 for(const record of delta.moduleProfiles)for(const policy of ['no-runtime-loads','command-line-inputs-unverified']){
  const source=read(record.public),file='wrong-prefix/'+record.public,c={...structuredClone(record),public:file,runtimePolicy:policy,runtimeEdges:[],unverifiedInputs:policy==='command-line-inputs-unverified'?['not reviewed']:[]};
  a.throws(()=>moduleDependencies([{file,source}],{schemaVersion:1,modules:[c]},[{file,sha256:sha(source)}]),/Reviewed frozen runtime path mismatch/);
 }
});

test('ESM public identities are mandatory complete unique and bound to supplied source',()=>{
 for(const mutate of [f=>f.identities=undefined,f=>f.identities=[],f=>f.identities.pop(),f=>f.identities.push(f.identities[0]),f=>f.identities[0].sha256='0'.repeat(64),f=>f.identities[0].extra=true,f=>f.identities[0].sha256='not-a-hash',f=>f.source.push(f.source[0]),f=>f.source.pop(),f=>f.contract.modules.push(f.contract.modules[0])]){const f=esmFixture();mutate(f);a.throws(()=>esm(f));}
});

test('shared linalg hash allows precisely both reviewed classic paths without a relocation exemption',()=>{
 const f=classicFixture(),approved=['labs/networked-sync/runtime/js/linalg.js',runtime+'vendor/linalg.js'];
 a.equal(new Set(approved.map(file=>f.identities.find(x=>x.file===file).sha256)).size,1);a.doesNotThrow(()=>classicEdges(f));
 for(const file of ['labs/networked-sync/runtime/js/renamed.js',runtime+'vendor/renamed.js',runtime+'linalg.js','wrong-prefix/linalg.js','wrong-prefix/linalg.txt',runtime+'vendor/linalg.JS']){
  const changed=classicFixture();changed.identities.push({file,sha256:f.identities.find(x=>x.file===approved[0]).sha256});a.throws(()=>classicEdges(changed),/Frozen classic source path mismatch/);
 }
 const altered=classicFixture(),m=altered.source.find(x=>x.file===approved[1]);m.source+='\n/* not reviewed */';altered.identities.find(x=>x.file===m.file).sha256=sha(m.source);altered.contract.scripts.find(x=>x.public===m.file).sha256=sha(m.source);a.throws(()=>classicEdges(altered),/Unreviewed classic runtime contract/);
});

test('Gaussian namespace admits only exact reviewed script module and auxiliary paths',()=>{
 for(const suffix of ['.js','.mjs','.JS','.cjs','.md','.json','.dat','']){
  const f=classicFixture();f.identities.push({file:prefix+'unreviewed'+suffix,sha256:sha('unreviewed namespace member')});a.throws(()=>classicEdges(f),/Unreviewed classic source path/);
 }
 const f=classicFixture();for(const file of [...delta.moduleProfiles.map(x=>x.public),...delta.auxiliaryFiles])f.identities.push({file,sha256:sha(read(file))});a.doesNotThrow(()=>classicEdges(f));
 for(const file of [runtime+'tests/protocol.test.mjs',runtime+'oracle/finite-integrals.json',runtime+'reports/numerics.json',runtime+'run_all.sh',runtime+'ARTIFACT-MANIFEST.json']){
  const f=classicFixture();f.identities.push({file,sha256:sha(read(file))});a.throws(()=>classicEdges(f),/Unreviewed classic source path/);
 }
});

// Exercise the production unified dependency gate with all reviewed classic and
// ESM sources but no site generation, numerical benchmark or browser execution.
function publicFixture(t){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'isac-gaussian-dependencies-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const entries=[],seen=new Set();
 function put(file,source=read(file),published=true){fs.mkdirSync(path.dirname(path.join(directory,file)),{recursive:true});fs.writeFileSync(path.join(directory,file),source);if(published&&!seen.has(file)){seen.add(file);entries.push({public:file});}}
 for(const row of [...classic.scripts,...modules.modules])put(row.public);
 for(const name of ['linalg','hermitian','numerics','model','optimizer','metrics','core'])put('labs/near-field/research/runtime/vendor/solver/'+name+'.js');
 put('scripts/build/classic-runtime-contracts.json',JSON.stringify(classic),false);put('scripts/build/module-runtime-contracts.json',JSON.stringify(modules),false);
 put('course.js',"document.currentScript.src;const files=['course-ui.js','velocity-core.js','velocity-bridge.js'];");for(const name of ['course-ui.js','velocity-core.js','velocity-bridge.js'])put(name,'/* fixture */');
 put('gaussian-tradeoff.html','<script type="module" src="'+(modules.modules.some(x=>x.public===prefix+'lesson/lesson.mjs')?prefix+'lesson/lesson.mjs':runtime+'runtime.mjs')+'"></script>');
 return {directory,manifest:{entries},put};
}

test('unified gate resolves Gaussian ESM, classic helper and default Worker edges without a parallel checker',t=>{
 const f=publicFixture(t),out=checkDependencies(f.directory,f.manifest);
 for(const [from,to,kind]of [[runtime+'math.mjs',runtime+'vendor/linalg.js','static-module'],[runtime+'runtime.mjs',runtime+'worker.mjs','reviewed-worker'],[runtime+'worker.mjs',runtime+'kernel.mjs','static-module']])a.ok(out.some(e=>e.from===from&&e.to===to&&e.kind===kind),from+' → '+to);
 a.ok(!out.some(e=>e.to.startsWith('node:')),'Node builtins are reviewed fallbacks, not published browser resources');
});

test('unified gate rejects missing Gaussian local imports and omitted default Worker mapping',t=>{
 const f=publicFixture(t);
 for(const file of [runtime+'vendor/linalg.js',...delta.moduleProfiles.map(x=>x.public)]){
  const missing={entries:f.manifest.entries.filter(x=>x.public!==file)};a.throws(()=>checkDependencies(f.directory,missing),/Unmapped public dependency|Unreviewed or missing/);
  const full=path.join(f.directory,file),source=fs.readFileSync(full);fs.unlinkSync(full);a.throws(()=>checkDependencies(f.directory,f.manifest),/ENOENT|Missing public dependency/);fs.writeFileSync(full,source);
 }
});

test('unified gate rejects renamed frozen bytes and alternate-extension namespace files',t=>{
 const f=publicFixture(t),base=structuredClone(f.manifest);
 for(const [file,source]of [['wrong-prefix/codec.txt',read(runtime+'codec.mjs')],['wrong-prefix/linalg.txt',read(runtime+'vendor/linalg.js')],[prefix+'unreviewed.dat','unreviewed']]){
  f.put(file,source);a.throws(()=>checkDependencies(f.directory,f.manifest),/runtime path mismatch|classic source path mismatch|Unreviewed classic source path/);f.manifest.entries.splice(0,f.manifest.entries.length,...structuredClone(base.entries));fs.unlinkSync(path.join(f.directory,file));
 }
});
