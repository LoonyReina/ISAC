'use strict';
// New current-byte boundary checks, separate from historical preservation tables.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const {moduleDependencies}=require('../scripts/build/module-dependencies.cjs');
const {recoveryDependencies,requiredFiles,requiredModules}=require('../scripts/build/recovery-dependencies.cjs');
const contract=require('../scripts/build/module-runtime-contracts.json');
const files=[['labs/near-field/research/view.mjs','labs/near-field/research/view.mjs'],['labs/gaussian-tradeoff/lesson/lesson.mjs','labs/gaussian-tradeoff/lesson/lesson.mjs'],['labs/pilot-pattern/lesson.mjs','labs/pilot-pattern/lesson.mjs'],['joint-beamforming/ssp/ssp-ui.mjs','labs/joint-beamforming/ssp/ssp-ui.mjs'],['otfs-receiver/source-objective-v1/runtime/ui.mjs','labs/otfs-receiver/source-objective-v1/runtime/ui.mjs']];
function read(file,source){return fs.readFileSync(path.join(root,fs.existsSync(path.join(root,source))?source:file),'utf8');}
for(const [file,sourcePath] of files)test('current feedback module is exact and rejects altered bytes: '+file,()=>{
 const source=read(file,sourcePath),c=contract.modules.find(x=>x.public===file);assert(c);assert.equal(c.sha256,sha(source));
 const call=(s,entry=c)=>moduleDependencies([{file,source:s}],{schemaVersion:1,modules:[entry]},[{file,sha256:sha(s)}]);
 const edges=call(source);for(const edge of c.runtimeEdges)assert(edges.some(x=>x.url===edge.url),'retained runtime endpoint '+edge.url);
 assert.throws(()=>call(source+'\n// unreviewed mutation'),/hash|identity/i);
 // A changed contract cannot self-authorize changed frozen-profile bytes.
 if(file!=='labs/near-field/research/view.mjs')assert.throws(()=>call(source+'\n// unreviewed mutation',{...c,sha256:sha(source+'\n// unreviewed mutation')}),/hash|identity/i);
 if(c.runtimeEdges.length){const altered=structuredClone(c);altered.runtimeEdges[0].url='./unreviewed.mjs';assert.throws(()=>call(source,altered),/endpoint/i);}
});
test('recovery required assets pin only current pilot/SSP UI and still reject unknown hashes',()=>{
 for(const file of ['labs/pilot-pattern/lesson.mjs','joint-beamforming/ssp/ssp-ui.mjs']){
  const c=contract.modules.find(x=>x.public===file);assert.equal(requiredFiles[file],c.sha256);assert.equal(requiredModules[file].sha256,c.sha256);
  const identities=Object.entries(requiredFiles).map(([file,sha256])=>({file,sha256}));identities.find(x=>x.file===file).sha256='0'.repeat(64);
  assert.throws(()=>recoveryDependencies({identities,modules:[],contract:{schemaVersion:1,modules:[]},pages:[]}),new RegExp('missing or changed required asset '+file.replaceAll('.','\\.')));
 }
});
for(const [name,method,changed] of [['target19-otfs','target19OtfsDependencies',['otfs-receiver/source-objective-v1/index.html','otfs-receiver/source-objective-v1/runtime/ui.mjs']],['target19-nearfield','target19NearfieldDependencies',['labs/near-field/research/view.mjs']]])test('target19 current presentation identity remains closed: '+name,()=>{
 const api=require('../scripts/build/'+name+'-dependencies.cjs');
 for(const file of changed){const source=read(file,'labs/'+file);assert.equal(api.requiredFiles[file],sha(source));const identities=Object.entries(api.requiredFiles).map(([file,sha256])=>({file,sha256}));identities.find(x=>x.file===file).sha256='f'.repeat(64);assert.throws(()=>api[method]({identities,pages:[]}),/missing\/changed/);}
});
test('classic feedback progress display keeps exact current bytes and runtime endpoints',()=>{
 const {classicDependencies}=require('../scripts/build/classic-dependencies.cjs'),c=require('../scripts/build/classic-runtime-contracts.json');
 const scripts=c.scripts.map(e=>({file:e.public,source:read(e.public,e.public)})),identities=scripts.map(e=>({file:e.file,sha256:sha(e.source)}));
 assert.doesNotThrow(()=>classicDependencies(scripts,c,identities));const file='labs/networked-sync/lesson/lesson.js',entry=scripts.find(e=>e.file===file);entry.source+='\n// unreviewed mutation';assert.throws(()=>classicDependencies(scripts,c,identities),/hash/);
 const altered=structuredClone(c);altered.scripts.find(e=>e.public===file).sha256=sha(entry.source);assert.throws(()=>classicDependencies(scripts,altered,identities),/Unreviewed classic runtime contract/);
});
