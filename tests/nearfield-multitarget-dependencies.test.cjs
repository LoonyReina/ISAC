'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),D=require('../scripts/build/module-dependencies.cjs'),P=require('./helpers/nearfield-multitarget-build-preservation.cjs'),d=require('./helpers/nearfield-multitarget-runtime-delta.json'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(){const source=d.moduleProfiles.map(c=>({file:c.public,source:fs.readFileSync(path.join(root,c.public),'utf8')}));return {source,contract:{schemaVersion:1,modules:structuredClone(d.moduleProfiles)},identities:source.map(x=>({file:x.file,sha256:sha(x.source)}))};}
const run=f=>D.moduleDependencies(f.source,f.contract,f.identities);
test('multi-target exact 14 profiles preserve all prior parser and contract identities',()=>{
 a.equal(d.moduleProfiles.length,14);a.equal(d.priorModuleProfileCount,53);
 a.equal(sha(P.withoutMultitargetModuleParser(fs.readFileSync(path.join(root,'scripts/build/module-dependencies.cjs'),'utf8'))),d.priorModuleParserSha256);
 a.equal(sha(JSON.stringify(P.withoutMultitargetModuleContracts(require('../scripts/build/module-runtime-contracts.json')),null,2)+'\n'),d.priorModuleContractsSha256);
});
test('multi-target solver and derived Workers have exact closed endpoints and complete static closure',()=>{
 const f=fixture(),edges=run(f),dynamic=edges.filter(x=>x.kind!=='static-module');a.deepEqual(dynamic.map(x=>[x.from,x.url,x.kind]),[['labs/nearfield-multitarget/lesson/client.mjs','../runtime/worker.mjs','reviewed-worker'],['labs/nearfield-multitarget/lesson/client.mjs','./derived-worker.mjs','reviewed-worker']]);
 const publicFiles=new Set(d.publicFiles.map(x=>x[0]));for(const e of edges){a.ok(e.url.startsWith('.'));const target=path.posix.normalize(path.posix.join(path.posix.dirname(e.from),e.url));a.ok(publicFiles.has(target),e.from+' → '+e.url);a.doesNotMatch(target,/tests\/|\.zip|\.tar|\.pdf/);}a.ok(edges.length>20);
});
test('multi-target path source policy endpoint and jointly spoofed JSON mutations fail closed',()=>{
 for(const row of d.moduleProfiles)for(const mode of ['source','hash','path','policy','spoof']){const f=fixture(),i=f.source.findIndex(x=>x.file===row.public);if(mode==='source'||mode==='spoof')f.source[i].source+='\n/* unreviewed */';if(mode==='spoof'){f.contract.modules[i].sha256=sha(f.source[i].source);f.identities[i].sha256=sha(f.source[i].source);}if(mode==='hash')f.contract.modules[i].sha256='0'.repeat(64);if(mode==='path'){f.source[i].file='moved/'+row.public;f.contract.modules[i].public=f.source[i].file;f.identities[i].file=f.source[i].file;}if(mode==='policy'){f.contract.modules[i].runtimePolicy='command-line-inputs-unverified';f.contract.modules[i].runtimeEdges=[];f.contract.modules[i].unverifiedInputs=['unreviewed'];}a.throws(()=>run(f),mode+row.public);}
 for(const mutate of [c=>c.runtimeEdges=[],c=>c.runtimeEdges.pop(),c=>c.runtimeEdges.reverse(),c=>c.runtimeEdges.push({...c.runtimeEdges[0]}),c=>c.runtimeEdges[0].url='https://unreviewed.invalid/x',c=>c.runtimeEdges[0].kind='data',c=>c.runtimeEdges[0].literal='unreviewed',c=>c.runtimeEdges[0].extra=true]){const f=fixture();mutate(f.contract.modules.find(x=>x.public.endsWith('/client.mjs')));a.throws(()=>run(f));}
});
test('multi-target public namespace rejects every unreviewed extension and changed auxiliary byte',()=>{
 for(const file of ['extra.js','extra.JS','extra.cjs','extra.mjs','extra.txt','extensionless','nested/extra.dat']){const f=fixture();f.identities.push({file:'labs/nearfield-multitarget/'+file,sha256:sha('unreviewed')});a.throws(()=>run(f),/Unreviewed multi-target/);}
 for(const[file]of d.publicFiles){const f=fixture(),identity=f.identities.find(x=>x.file===file);if(identity)identity.sha256='0'.repeat(64);else f.identities.push({file,sha256:'0'.repeat(64)});a.throws(()=>run(f));}
 const good=fixture();for(const[file,sha256]of d.publicFiles)if(!good.identities.some(x=>x.file===file))good.identities.push({file,sha256});run(good);
});
test('multi-target mapping inverse preserves all accepted URLs and rejects path ownership changes',()=>{
 const m=require('../build/compatibility-manifest.json'),delta=require('../build/nearfield-multitarget-mappings.json'),prior=P.withoutMultitargetMappings(m);a.equal(sha(P.priorMappingSource(m)),delta.baselineManifestSha256);a.equal(delta.acceptedBaselineTree,'4ba6cb9ea8a568b1e4b21124b5e0d67648add8e2');const wanted=require('../labs/nearfield-multitarget/lesson/PUBLIC-ASSETS.json').proposed_compatibility_entries;a.equal(wanted.length,35);for(const rec of wanted){const e=m.entries.find(x=>x.source===rec.source);a.ok(e);a.equal(e.compatibility,rec.compatibility);a.equal(e.owner,rec.owner);a.equal(e.public,rec.source.includes('/lesson/tests/')?null:rec.public);}for(const key of ['source','compatibility','public','owner']){const bad=structuredClone(m);bad.entries.find(x=>x.source==='content/pages/nearfield-multitarget.html')[key]='unreviewed';a.throws(()=>P.withoutMultitargetMappings(bad));}
});
test('multi-target exact historical adapter overlay rejects extra changed truncated and already prior bytes',()=>{
 const table=require('./helpers/nearfield-multitarget-legacy-hooks.json');a.ok(table.files.length>=4);for(const rec of table.files){const b=fs.readFileSync(path.join(root,rec.path)),copy=Buffer.from(b),prior=P.withoutMultitargetFile(rec.path,b);a.equal(sha(prior),rec.before.sha256);a.deepEqual(b,copy);const changed=Buffer.from(b);changed[Math.floor(changed.length/2)]^=1;for(const bad of [Buffer.concat([b,Buffer.from('unreviewed')]),b.subarray(1),changed,prior])a.throws(()=>P.withoutMultitargetFile(rec.path,bad));a.deepEqual(P.withoutMultitargetFile('unlisted/'+rec.path,b),b);}
 a.ok(!table.files.some(x=>x.path==='tests/helpers/nearfield-multitarget-legacy-hooks.json'||x.path==='tests/helpers/nearfield-multitarget-build-preservation.cjs'),'no circular self-hash');
});
