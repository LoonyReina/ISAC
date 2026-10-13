'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {staticModuleDependencies:parse,moduleDependencies:edges}=require('../scripts/build/module-dependencies.cjs');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex'),entry=(file,source,runtimeEdges=[])=>({public:file,sha256:sha(source),runtimeEdges,runtimePolicy:runtimeEdges.length?'literal-workers':'no-runtime-loads',unverifiedInputs:[]}),contract=modules=>({schemaVersion:1,modules});
test('Node parse-only API authoritatively recognizes static imports/reexports and does not execute source',()=>{
 const marker='/tmp/isac-module-parse-must-not-execute-'+process.pid;const source=`import fs from 'node:fs';import {'}' as x} from './a.mjs';export{x as '}'};export*from './b.mjs';fs.writeFileSync('${marker}','executed');throw Error('never execute');const t=\`x\${await import('./dynamic.mjs')}\`;`;
 const r=parse([{file:'example.mjs',source}]);a.deepEqual(r,[{file:'example.mjs',specifiers:['node:fs','./a.mjs','./b.mjs']}]);a.equal(fs.existsSync(marker),false);
});
test('parser handles ASI, regular expressions, strings and templates without fabricated static edges',()=>{
 const source=`import './real.mjs';'use strict'\n{} /import('ghost.mjs')/.test(x);const x=true?{}:{}/2;const y=\`\${(()=>{if(x)/}/.test(x);return 1})()}\`;const text="export * from './ghost.mjs'"; // import './fake.mjs'\n`;
 a.deepEqual(parse([{file:'example.mjs',source}])[0].specifiers,['./real.mjs']);a.throws(()=>parse([{file:'bad.mjs',source:"import './broken"}]),/Parse-only/);
});
test('runtime edge requires exact complete source, reviewed literal and explicit per-file contract',()=>{
 const literal="new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'})",source="import './core.mjs';const worker="+literal+';',modules=[{file:'lesson.mjs',source},{file:'worker.mjs',source:'export{};'},{file:'core.mjs',source:'export{};'}];
 const c=contract(modules.map(m=>entry(m.file,m.source,m.file==='lesson.mjs'?[{kind:'worker',url:'./worker.mjs',literal}]:[])));
 a.deepEqual(edges(modules,c),[{from:'lesson.mjs',url:'./worker.mjs',kind:'reviewed-worker'},{from:'lesson.mjs',url:'./core.mjs',kind:'static-module'}]);
 const changed=structuredClone(modules);changed[0].source+=' // source changed, literal still identical';a.throws(()=>edges(changed,c),/Unreviewed module source hash/);
 for(const mutate of [d=>d.modules.pop(),d=>d.modules.push(d.modules[0]),d=>d.modules[0].sha256='0'.repeat(64),d=>d.modules[0].runtimeEdges[0].literal='comment',d=>d.modules[0].runtimeEdges[0].url='./missing.mjs']){const d=structuredClone(c);mutate(d);a.throws(()=>edges(modules,d));}
 a.throws(()=>edges([...modules,{file:'new.mjs',source:'export{};'}],c),/Unreviewed or missing/);
 const comments=structuredClone(modules);comments[0].source='// '+literal;a.throws(()=>edges(comments,c),/Unreviewed module source hash/);
});
const originalModuleHashes={
 "otfs-receiver/communication/browser-worker.mjs": "ddc639f67253409104e101aaef7bad6c5ce7d8ae51290619237c0d6a921d4ee5",
 "otfs-receiver/communication/kernel.mjs": "80fad52c681d19eaa5d82a6b1d20dd329a6cf40d39c08cd92774f88118d8f1e7",
 "otfs-receiver/communication/protocol.mjs": "d7242dbe37ed8a060f2b14471538cd0920149aeb0a05aa16064996dfc572be9a",
 "otfs-receiver/communication/simulation.mjs": "17fa68083040da01023d976acb42cd7ab69a9ba490844a02013b6e00c86f3940",
 "otfs-receiver/lesson-controller.mjs": "4710f24cc74cf71fa25f7f96d01d73a7fe82f31eadc1b5ef2ae5dc3a956ebc54",
 "otfs-receiver/lesson-evidence.mjs": "d2343aca672d8b469dbe7f8f7fdc6c22cf82bdae1978fec66d40a33df52b7416",
 "otfs-receiver/lesson-model.mjs": "816b82848d6edc02cd694a3a00dc815a93f437bb502339eba2744cfcf291d185",
 "otfs-receiver/otfs-receiver.mjs": "f1ef504ae17caa7a43387e49039738a4a6dc4992fadf41a1e8e7121d3e26761e",
 "otfs-receiver/sensing/browser-worker.mjs": "ddc639f67253409104e101aaef7bad6c5ce7d8ae51290619237c0d6a921d4ee5",
 "otfs-receiver/sensing/evidence.mjs": "565a546db239af2fe2a077b54b068a980444c49e6610ad424738c3bfff1a76a6",
 "otfs-receiver/sensing/kernel.mjs": "dfb81ee33bb55f8f11cbfec234a058e9711ac8ce226f756b4d96cd6b435e880e",
 "otfs-receiver/sensing/operators.mjs": "1092109d0e5f28cfa5dbf0fca78f4474b72a19e80b98bac29b0151581f06ff19",
 "otfs-receiver/sensing/protocol.mjs": "02d335ff4c9659645631e22d27f5d178735056dd5653c0c9299020c8c63c3e67",
 "otfs-receiver/sensing/validation.mjs": "752935c5e77d4d898c51ce5105453c2d3b80742735642a5adb46ae51102e729b",
 "scripts/shared-array-independent-audit/actual_js_adapter.mjs": "88f15220ecfa1fea3d012c3e72a9a87d059fd8161d6c8d4730bf10f912fbe458",
 "scripts/shared-array-independent-audit/run_actual_js.mjs": "5856acdb0807aef8dfd550e36bae8ddab25978342983461feda008c5dc9361a3"
};
test('production original sixteen-module OTFS boundary retains its exact historical freeze',()=>{
 const c=require('../scripts/build/module-runtime-contracts.json');a.equal(c.schemaVersion,1);a.equal(new Set(c.modules.map(x=>x.public)).size,c.modules.length);
 const original=c.modules.filter(x=>Object.hasOwn(originalModuleHashes,x.public));
 a.equal(original.length,16);a.deepEqual(Object.fromEntries(original.map(x=>[x.public,x.sha256])),originalModuleHashes);
 a.equal(original.filter(x=>x.public.startsWith('otfs-receiver/')).length,14);a.ok(!original.some(x=>x.public.endsWith('node-worker.mjs')));
 const runtime=original.flatMap(x=>x.runtimeEdges.map(e=>({from:x.public,...e})));a.equal(runtime.length,2);a.ok(runtime.every(e=>e.from==='otfs-receiver/otfs-receiver.mjs'));a.deepEqual(runtime.map(x=>x.url),['./sensing/browser-worker.mjs','./communication/browser-worker.mjs']);
 for(const e of runtime)a.deepEqual(e,{from:'otfs-receiver/otfs-receiver.mjs',kind:'worker',url:e.url,literal:"new Worker(new URL('"+e.url+"',import.meta.url),{type:'module'})"});
 for(const m of original){const cli=m.public.startsWith('scripts/');a.equal(m.runtimePolicy,cli?'command-line-inputs-unverified':m.runtimeEdges.length?'literal-workers':'no-runtime-loads');a.deepEqual(m.unverifiedInputs,cli?['User-supplied command-line adapter/core filesystem paths; dynamic import or require is outside the website runtime dependency guarantee']:[]);}
 a.equal(original.filter(x=>x.runtimePolicy==='command-line-inputs-unverified').length,2);
});

const nearfieldPrefix='labs/near-field/research/runtime/src/';
const frozenWorkerHash='ebd7e69157c05099e89c576e6959364b915f950f365f1c22a76847f41d7dea4d';
const frozenLoaderHash='7e734d0e81d4988bfcabf517673b1d6d12f7b9fb07a0c7b2ac70f32ee4fbd250';
const workerEndpoints=[
 {kind:'worker',url:'./solver-worker.mjs',factory:'createModuleWorker',endpoint:'createSolverClient',literal:"export async function createSolverClient(){return new JobWorker(await createModuleWorker('./solver-worker.mjs'));}"},
 {kind:'worker',url:'./receiver-worker.mjs',factory:'createModuleWorker',endpoint:'createReceiverClient',literal:"export async function createReceiverClient(){return new JobWorker(await createModuleWorker('./receiver-worker.mjs'));}"}
];
const enumeratedSolverLoop="for(const name of ['linalg','hermitian','numerics','model','optimizer','metrics','core'])await import(`../vendor/solver/${name}.js`)";
const solverImports=['linalg','hermitian','numerics','model','optimizer','metrics','core'].map(name=>({kind:'module',url:'../vendor/solver/'+name+'.js',literal:enumeratedSolverLoop}));
function reviewedFixture(name){
 const file=nearfieldPrefix+name+'.mjs',source=fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'),worker=name==='worker-client';
 return {modules:[{file,source}],c:contract([{public:file,sha256:worker?frozenWorkerHash:frozenLoaderHash,runtimeEdges:structuredClone(worker?workerEndpoints:solverImports),runtimePolicy:worker?'reviewed-factory-endpoints':'reviewed-enumerated-imports',unverifiedInputs:[]}])};
}
function rejectedContractMutations(fixture,mutations){for(const mutate of mutations){const d=structuredClone(fixture.c);mutate(d);a.throws(()=>edges(fixture.modules,d));}}

test('reviewed frozen factory enumerates only its two actual module-relative Worker endpoints',()=>{
 const f=reviewedFixture('worker-client');a.equal(sha(f.modules[0].source),frozenWorkerHash);
 a.deepEqual(parse(f.modules),[{file:f.modules[0].file,specifiers:[]}]);
 a.deepEqual(edges(f.modules,f.c),workerEndpoints.map(e=>({from:nearfieldPrefix+'worker-client.mjs',url:e.url,kind:'reviewed-worker'})));
 a.ok(f.modules[0].source.includes("const url=new URL(relative,import.meta.url);if(typeof Worker!=='undefined')return new Worker(url,{type:'module'});"));
});

test('reviewed factory rejects changed source even if the endpoint literals remain and JSON hash is refreshed',()=>{
 const f=reviewedFixture('worker-client');
 for(const change of [s=>s+'\n// unreviewed change',s=>s.replace("new URL(relative,import.meta.url)","new URL(relative,'https://unreviewed.invalid/')"),s=>s.replace("new Worker(url,{type:'module'})","new Worker(url,{type:'classic'})"),s=>s.replace("new Worker(url,{type:'module'})","({postMessage(){}})"),s=>s.replace('createModuleWorker(relative)','createModuleWorker(relative,unreviewed)'),s=>s.replace(workerEndpoints[1].literal,''),s=>s+'\n'+workerEndpoints[0].literal]){
  const modules=structuredClone(f.modules);modules[0].source=change(modules[0].source);a.throws(()=>edges(modules,f.c),/Unreviewed module source hash/);
  const c=structuredClone(f.c);c.modules[0].sha256=sha(modules[0].source);a.throws(()=>edges(modules,c),/Unreviewed frozen runtime source hash/);
 }
});

test('reviewed factory rejects altered, duplicate, omitted and arbitrary endpoint targets',()=>{
 const f=reviewedFixture('worker-client');
 rejectedContractMutations(f,[d=>d.modules[0].runtimeEdges.pop(),d=>d.modules[0].runtimeEdges.shift(),d=>d.modules[0].runtimeEdges=[],d=>d.modules[0].runtimeEdges.push({...workerEndpoints[0]}),d=>d.modules[0].runtimeEdges.reverse(),d=>d.modules[0].runtimeEdges[1]={...workerEndpoints[0]},d=>d.modules[0].runtimeEdges[0].kind='module',d=>d.modules[0].runtimeEdges[0].factory='otherFactory',d=>d.modules[0].runtimeEdges[0].endpoint='createOtherClient',d=>d.modules[0].runtimeEdges[0].literal='// '+workerEndpoints[0].literal]);
 for(const url of ['./other.mjs','./receiver-worker.mjs','../solver-worker.mjs','/solver-worker.mjs','https://example.invalid/worker.mjs','//example.invalid/worker.mjs','data:text/javascript,export{}','node:worker_threads','./%2e%2e/worker.mjs','./solver-worker.mjs?other','./solver-worker.mjs#other','./solver-worker.mjs\\other','./solver-worker.mjs\n']){
  rejectedContractMutations(f,[d=>{d.modules[0].runtimeEdges[0].url=url;},d=>{const e=d.modules[0].runtimeEdges[0];e.url=url;e.literal="export async function createSolverClient(){return new JobWorker(await createModuleWorker('"+url+"'));}";}]);
 }
});

test('reviewed loader freezes seven browser imports including the shared Node core target',()=>{
 const f=reviewedFixture('solver-loader');a.equal(sha(f.modules[0].source),frozenLoaderHash);
 a.deepEqual(parse(f.modules),[{file:f.modules[0].file,specifiers:[]}]);
 a.deepEqual(edges(f.modules,f.c),solverImports.map(e=>({from:nearfieldPrefix+'solver-loader.mjs',url:e.url,kind:'reviewed-module'})));
 a.ok(f.modules[0].source.includes("await import('../vendor/solver/core.js')"));
 a.equal(edges(f.modules,f.c).filter(e=>e.url==='../vendor/solver/core.js').length,1);
});

test('reviewed loader rejects altered imports, omissions, new names, and changes disguised by a new hash',()=>{
 const f=reviewedFixture('solver-loader');
 for(let i=0;i<solverImports.length;i++)rejectedContractMutations(f,[d=>d.modules[0].runtimeEdges.splice(i,1),d=>d.modules[0].runtimeEdges[i].url='../vendor/solver/unreviewed.js']);
 rejectedContractMutations(f,[d=>d.modules[0].runtimeEdges.reverse(),d=>d.modules[0].runtimeEdges[1]={...solverImports[0]},d=>d.modules[0].runtimeEdges.push({...solverImports[0]}),d=>d.modules[0].runtimeEdges[0].literal="await import(name)",d=>d.modules[0].runtimeEdges[0].kind='worker',d=>d.modules[0].runtimeEdges[0].url='https://example.invalid/linalg.js',d=>d.modules[0].runtimeEdges[0].url='../../outside.js']);
 for(const change of [s=>s+'\n// unreviewed change',s=>s.replace("'linalg','hermitian'","'unreviewed','hermitian'"),s=>s.replace('../vendor/solver/${name}.js','https://example.invalid/${name}.js'),s=>s.replace("import('../vendor/solver/core.js')","import('../vendor/other/core.js')")]){
  const modules=structuredClone(f.modules);modules[0].source=change(modules[0].source);a.throws(()=>edges(modules,f.c),/Unreviewed module source hash/);
  const c=structuredClone(f.c);c.modules[0].sha256=sha(modules[0].source);a.throws(()=>edges(modules,c),/Unreviewed frozen runtime source hash/);
 }
});

test('reviewed profiles reject unknown fields, policies, fallback declarations, and unreviewed or duplicate modules',()=>{
 for(const name of ['worker-client','solver-loader']){
  const f=reviewedFixture(name);
  rejectedContractMutations(f,[d=>d.unknown=true,d=>d.schemaVersion=2,d=>d.modules[0].unknown=true,d=>d.modules[0].runtimeEdges[0].unknown=true,d=>delete d.modules[0].runtimeEdges[0].literal,d=>d.modules[0].runtimeEdges[0]=null,d=>d.modules[0].runtimePolicy='generic-dynamic-inference',d=>d.modules[0].runtimePolicy='literal-workers',d=>d.modules[0].runtimePolicy=name==='worker-client'?'reviewed-enumerated-imports':'reviewed-factory-endpoints',d=>{d.modules[0].runtimePolicy='no-runtime-loads';d.modules[0].runtimeEdges=[];},d=>{d.modules[0].runtimePolicy='command-line-inputs-unverified';d.modules[0].runtimeEdges=[];d.modules[0].unverifiedInputs=['not reviewed'];},d=>d.modules[0].unverifiedInputs=['arbitrary targets'],d=>d.modules.push(structuredClone(d.modules[0])),d=>d.modules=[],d=>d.modules[0].sha256='0'.repeat(64)]);
  a.throws(()=>edges([...f.modules,f.modules[0]],f.c),/duplicate module input/);
  a.throws(()=>edges([...f.modules,{file:'unreviewed.mjs',source:'export{};'}],f.c),/Unreviewed or missing/);
  a.throws(()=>edges([],f.c),/Unreviewed or missing/);
  const copy=structuredClone(f);copy.modules[0].file='unreviewed/'+name+'.mjs';copy.c.modules[0].public=copy.modules[0].file;a.throws(()=>edges(copy.modules,copy.c),/Unreviewed module runtime policy|Reviewed frozen runtime path mismatch/);
  const extra=structuredClone(f.modules);extra[0].unknown=true;a.throws(()=>edges(extra,f.c),/module input fields/);
 }
});

test('production near-field contracts exactly declare both frozen reviewed runtime profiles',()=>{
 const c=require('../scripts/build/module-runtime-contracts.json');
 for(const name of ['worker-client','solver-loader']){
  const f=reviewedFixture(name);a.deepEqual(c.modules.find(m=>m.public===f.modules[0].file),f.c.modules[0]);
  a.deepEqual(edges(f.modules,f.c).map(e=>e.url),f.c.modules[0].runtimeEdges.map(e=>e.url));
 }
});

// A known frozen dynamic loader cannot evade its reviewed profile by relocation.
test('frozen runtime source hashes remain tied to exact approved paths under policy downgrades',()=>{
 const c=require('../scripts/build/module-runtime-contracts.json');
 for(const original of c.modules.filter(x=>['reviewed-factory-endpoints','reviewed-enumerated-imports'].includes(x.runtimePolicy))){
  const source=fs.readFileSync(require('node:path').resolve(__dirname,'..',original.public),'utf8');
  for(const policy of ['no-runtime-loads','command-line-inputs-unverified']){
   const file='wrong-prefix/'+original.public,record={...structuredClone(original),public:file,runtimePolicy:policy,runtimeEdges:[],unverifiedInputs:policy==='command-line-inputs-unverified'?['not a supported reviewed relocation']:[]};
   a.throws(()=>edges([{file,source}],contract([record])),/Reviewed frozen runtime path mismatch/);
  }
 }
});
