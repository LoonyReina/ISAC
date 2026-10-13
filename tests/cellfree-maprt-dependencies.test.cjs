'use strict';
const{test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),D=require('../scripts/build/module-dependencies.cjs'),delta=require('./helpers/cellfree-maprt-runtime-delta.json'),P=require('./helpers/cellfree-maprt-build-preservation.cjs'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
// Source-only provenance for files which themselves contain historical inverses.
// The separate data table avoids a self-referential hash and never enters runtime
// or compatibility mapping. Every current byte and reconstructed identity is exact.
const teachingEntrySourceOnly=require('./helpers/cellfree-entry-source-only-inverses.json');
function withoutTeachingEntrySourceOnly(file,bytes){const rec=teachingEntrySourceOnly.files.find(x=>x.path===file);if(!rec)return bytes;bytes=require('./helpers/nearfield-multitarget-build-preservation.cjs').withoutMultitargetFile(file,bytes);a.equal(bytes.length,rec.after.bytes);a.equal(sha(bytes),rec.after.sha256);let value=Buffer.from(bytes);for(const ch of [...rec.changes].reverse()){const before=Buffer.from(ch.beforeBase64,'base64'),after=Buffer.from(ch.afterBase64,'base64');a.deepEqual(value.subarray(ch.offsetAfter,ch.offsetAfter+after.length),after);value=Buffer.concat([value.subarray(0,ch.offsetAfter),before,value.subarray(ch.offsetAfter+after.length)]);}a.equal(sha(value),rec.before.sha256);a.equal(value.length,rec.before.bytes);return value;}
const hostedUiSourceOnly=require('./helpers/hosted-ui-source-only-inverses.json');
function withoutHostedUiSourceOnlyFile(file,bytes){
 bytes=withoutTeachingEntrySourceOnly(file,bytes);
 const rec=hostedUiSourceOnly.files.find(x=>x.path===file);
 if(!rec)return P.withoutHostedUiAdapter(file,bytes);
 a.equal(bytes.length,rec.after.bytes,'exact source-only UI adapter size '+file);
 a.equal(sha(bytes),rec.after.sha256,'exact source-only UI adapter identity '+file);
 let value=Buffer.from(bytes);
 for(const ch of [...rec.changes].reverse()){
  const before=Buffer.from(ch.beforeBase64,'base64'),after=Buffer.from(ch.afterBase64,'base64');
  a.deepEqual(value.subarray(ch.offsetAfter,ch.offsetAfter+after.length),after);
  value=Buffer.concat([value.subarray(0,ch.offsetAfter),before,value.subarray(ch.offsetAfter+after.length)]);
 }
 a.equal(value.length,rec.before.bytes);a.equal(sha(value),rec.before.sha256);
 return value;
}
function beforeHostedUi(file,bytes){
 const MT=require('./helpers/nearfield-multitarget-build-preservation.cjs');if(file==='build/compatibility-manifest.json')return Buffer.from(MT.priorMappingSource(JSON.parse(bytes)));if(file==='scripts/build/module-runtime-contracts.json')bytes=Buffer.from(JSON.stringify(MT.withoutMultitargetModuleContracts(JSON.parse(bytes)),null,2)+'\n');
 if(file==='scripts/build/module-runtime-contracts.json')return Buffer.from(JSON.stringify(P.withoutHostedUiContracts(JSON.parse(bytes),'module'),null,2)+'\n');
 return withoutHostedUiSourceOnlyFile(file,bytes);
}

function fixture(){const source=P.withTeachingEntryProfiles(delta.moduleProfiles).map(c=>({file:c.public,source:fs.readFileSync(path.join(root,c.public),'utf8')}));return{source,contract:{schemaVersion:1,modules:P.withTeachingEntryProfiles(delta.moduleProfiles)},identities:source.map(x=>({file:x.file,sha256:sha(x.source)}))};}
const run=f=>D.moduleDependencies(f.source,f.contract,f.identities);
test('Cell-Free exact profiles preserve all41 previous ESM profiles and parser bytes',()=>{
 a.equal(teachingEntrySourceOnly.schemaVersion,1);
 a.equal(teachingEntrySourceOnly.baselineTree,'f79bd34c8bedb0344ec8e72c9b19b981f277746b');
 a.deepEqual(teachingEntrySourceOnly.files.map(x=>x.path),['tests/cellfree-maprt-dependencies.test.cjs','tests/cellfree-maprt-integration.test.cjs','tests/helpers/cellfree-maprt-build-preservation.cjs']);
 const entryManifest=require('../build/compatibility-manifest.json');a.ok(!entryManifest.entries.some(x=>x.source==='tests/helpers/cellfree-entry-source-only-inverses.json'),'new inverse table is source-only');
 for(const rec of teachingEntrySourceOnly.files){const current=fs.readFileSync(path.join(root,rec.path)),copy=Buffer.from(current),prior=withoutTeachingEntrySourceOnly(rec.path,current);a.equal(prior.length,rec.before.bytes);a.equal(sha(prior),rec.before.sha256);a.deepEqual(current,copy);const altered=Buffer.from(current);altered[Math.floor(altered.length/2)]^=1;for(const bad of [Buffer.concat([current,Buffer.from('unreviewed')]),current.subarray(1),altered,prior])a.throws(()=>withoutTeachingEntrySourceOnly(rec.path,bad));a.deepEqual(withoutTeachingEntrySourceOnly('unlisted/'+rec.path,current),current);}
 a.equal(hostedUiSourceOnly.schemaVersion,1);
 a.equal(hostedUiSourceOnly.baselineTree,'dedfc7e126faab52e9f5a4d8c14db1e24abf34ef');
 a.deepEqual(hostedUiSourceOnly.files.map(x=>x.path),['tests/cellfree-maprt-dependencies.test.cjs','tests/cellfree-maprt-integration.test.cjs','tests/helpers/cellfree-maprt-build-preservation.cjs']);
 const manifest=require('../build/compatibility-manifest.json');
 for(const file of ['tests/cellfree-maprt-dependencies.test.cjs','tests/helpers/hosted-ui-source-only-inverses.json'])a.ok(!manifest.entries.some(x=>x.source===file),'explicit source-only inverse input '+file);
 for(const rec of hostedUiSourceOnly.files){
  const current=fs.readFileSync(path.join(root,rec.path)),copy=Buffer.from(current);
  a.equal(sha(withoutHostedUiSourceOnlyFile(rec.path,current)),rec.before.sha256);a.deepEqual(current,copy);
  const altered=Buffer.from(current);altered[Math.floor(altered.length/2)]^=1;
  for(const bad of [Buffer.concat([current,Buffer.from('/* unreviewed */')]),current.subarray(1),altered])a.throws(()=>withoutHostedUiSourceOnlyFile(rec.path,bad));
  a.deepEqual(withoutHostedUiSourceOnlyFile('unlisted/'+rec.path,current),current);
 }
const c=require('../scripts/build/module-runtime-contracts.json');a.equal(delta.priorModuleProfileCount,41);a.equal(delta.moduleProfiles.length,12);a.equal(sha(JSON.stringify(require('./helpers/gaussian-tradeoff-preservation.cjs').withoutNearfieldExportContracts(P.withoutCellfreeModuleContracts(P.withoutHostedUiContracts(c,'module'))),null,2)+'\n'),delta.priorModuleContractsSha256);a.equal(sha(P.withoutCellfreeModuleParser(P.withoutHostedUiParser(fs.readFileSync(path.join(root,'scripts/build/module-dependencies.cjs'),'utf8'),'module'))),delta.priorModuleParserSha256);});
test('Cell-Free exact default Worker and opt-in summary fetch are closed declared edges',()=>{const edges=run(fixture()),dynamic=edges.filter(x=>x.kind!=='static-module');a.deepEqual(dynamic.map(x=>[x.from,x.url,x.kind]),[['labs/cellfree-maprt/lesson/lesson.mjs','./reference-summary.json','reviewed-cellfree-module'],['labs/cellfree-maprt/runtime/client.mjs','./worker.mjs','reviewed-worker']]);a.ok(edges.some(x=>x.from.endsWith('/worker.mjs')&&x.url==='./runtime.mjs'));a.ok(!edges.some(x=>/\.zip|\.tar|\.pdf/.test(x.url)));});
test('Cell-Free profile mutations reject moved paths altered source hash policy omitted invented reordered edges',()=>{for(const row of delta.moduleProfiles){for(const mode of ['source','hash','path','policy']){const f=fixture(),i=f.source.findIndex(x=>x.file===row.public);if(mode==='source')f.source[i].source+='\n';if(mode==='hash')f.contract.modules[i].sha256='0'.repeat(64);if(mode==='path'){f.source[i].file='wrong/'+row.public;f.contract.modules[i].public=f.source[i].file;f.identities[i].file=f.source[i].file;}if(mode==='policy'){f.contract.modules[i].runtimePolicy='command-line-inputs-unverified';f.contract.modules[i].runtimeEdges=[];f.contract.modules[i].unverifiedInputs=['unreviewed'];}a.throws(()=>run(f),mode+row.public);}}
 for(const row of delta.moduleProfiles.filter(x=>x.runtimeEdges.length)){for(const change of [c=>c.runtimeEdges=[],c=>c.runtimeEdges.push({...c.runtimeEdges[0]}),c=>c.runtimeEdges[0].url='https://unreviewed.invalid/x',c=>c.runtimeEdges[0].kind='unreviewed',c=>c.runtimeEdges[0].literal='unreviewed',c=>c.runtimeEdges[0].extra=true]){const f=fixture();change(f.contract.modules.find(x=>x.public===row.public));a.throws(()=>run(f));}}
 const f=fixture();f.source.push({file:'labs/cellfree-maprt/extra.mjs',source:'export const x=1;'});f.identities.push({file:f.source.at(-1).file,sha256:sha(f.source.at(-1).source)});a.throws(()=>run(f));});
test('Cell-Free public namespace rejects every unmapped extension and changed auxiliary bytes',()=>{for(const suffix of ['extra.js','extra.JS','extra.cjs','extra.txt','extensionless','nested/extra.mjs']){const f=fixture();f.identities.push({file:'labs/cellfree-maprt/'+suffix,sha256:sha('unreviewed')});a.throws(()=>run(f),/Unreviewed Cell-Free public/);}for(const[file,hash]of P.withTeachingEntryPublicFiles(delta.cellfreePublicFiles)){const f=fixture();if(f.identities.some(x=>x.file===file))f.identities.find(x=>x.file===file).sha256='0'.repeat(64);else f.identities.push({file,sha256:'0'.repeat(64)});a.throws(()=>run(f));}const f=fixture();for(const[file,hash]of P.withTeachingEntryPublicFiles(delta.cellfreePublicFiles))if(!f.identities.some(x=>x.file===file))f.identities.push({file,sha256:hash});run(f);});

test('near-field export overlay retains exact pre-fix Cell-Free bytes and accepted repaired cumulative profiles',()=>{const L=require('./helpers/cellfree-maprt-nearfield-layer.cjs'),d=require('./helpers/cellfree-maprt-nearfield-layer.json');a.equal(d.preFixCheckpoint,'52f57777c9419ab9be7f43dc365a98d01a1e1ea6');for(const f of d.files){const raw=fs.readFileSync(path.join(root,f.path)),current=beforeHostedUi(f.path,raw);a.equal(sha(current),f.afterSha256);a.equal(sha(L.withoutLayerFile(f.path,current)),f.beforeSha256);a.throws(()=>L.withoutLayerFile(f.path,Buffer.concat([current,Buffer.from('unreviewed')])));}for(const f of d.copiedRepairFiles)a.equal(sha(fs.readFileSync(path.join(root,f.path))),f.sha256);const modules=require('../scripts/build/module-runtime-contracts.json');a.equal(sha(JSON.stringify({schemaVersion:1,modules:P.withoutHostedUiContracts(modules,'module').modules.slice(0,41)},null,2)+'\n'),d.acceptedPatchedModuleContractsSha256);const helper=beforeHostedUi('tests/helpers/gaussian-tradeoff-preservation.cjs',fs.readFileSync(path.join(root,'tests/helpers/gaussian-tradeoff-preservation.cjs'))).toString();a.ok(helper.endsWith(d.exactAcceptedContractAdapterSuffix));});
