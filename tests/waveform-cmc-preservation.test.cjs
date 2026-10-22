'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('./helpers/waveform-cmc-integration-preservation.cjs'),root=path.resolve(__dirname,'..');
function readForHistory(file){return require('./helpers/channel-mapping-preservation.cjs').readCurrentForHistory(file,fs.readFileSync(path.join(root,file)),{root});}
const read=r=>readForHistory(fs.existsSync(path.join(root,r.path))?r.path:r.compatibility);
test('CMC read-boundary inverses restore exact OFDM baseline without rebasing historical identities',()=>{
 for(const r of C.delta.files){const bytes=read(r),copy=Buffer.from(bytes),prior=C.withoutFile(r.path,bytes);a.ok(C.identity(prior,r.before));a.deepEqual(bytes,copy);a.deepEqual(C.withoutFile(r.path,prior),prior);if(r.compatibility)a.deepEqual(C.withoutFile(r.compatibility,bytes),prior);for(const bad of [bytes.subarray(1),Buffer.concat([bytes,Buffer.from('unreviewed')])])a.throws(()=>C.withoutFile(r.path,bad));a.deepEqual(C.withoutFile('unlisted/'+r.path,bytes),bytes);}
});
test('CMC mappings reject missing partial mutated or unlisted additions and preserve every old public route',()=>{
 const m=JSON.parse(readForHistory('build/compatibility-manifest.json')),copy=structuredClone(m),old=C.withoutMappings(m);a.deepEqual(m,copy);a.equal(C.sha(JSON.stringify(old,null,2)+'\n'),C.delta.baselineManifestSha256);a.deepEqual(C.withoutMappings(old),old);const earlier={...old,entries:old.entries.slice(0,10)};a.deepEqual(C.withoutMappings(earlier),earlier);
 for(const row of C.delta.addedEntries)for(const key of ['source','compatibility','public','owner','role']){const bad=structuredClone(m);bad.entries.find(e=>e.source===row.source)[key]='unreviewed';a.throws(()=>C.withoutMappings(bad));}
 const missing=structuredClone(m);missing.entries=missing.entries.filter(e=>e.source!==C.delta.addedEntries[0].source);a.throws(()=>C.withoutMappings(missing));const extra=structuredClone(m);extra.entries.push({...C.delta.addedEntries[0],source:'unlisted/file'});a.throws(()=>C.withoutMappings(extra));
 a.deepEqual(m.entries.filter(e=>old.entries.some(p=>p.source===e.source)),old.entries);
});
test('CMC module inverse requires the exact four additive profiles and never changes active contracts',()=>{
 const current=require('../scripts/build/module-runtime-contracts.json'),copy=structuredClone(current),history=JSON.parse(readForHistory('scripts/build/module-runtime-contracts.json')),historyCopy=structuredClone(history),old=C.withoutContracts(history);a.deepEqual(current,copy);a.deepEqual(history,historyCopy);a.equal(C.delta.addedModuleProfiles.length,4);a.equal(old.modules.length,C.delta.priorModuleCount);a.deepEqual(C.withoutContracts(old),old);
 for(const row of C.delta.addedModuleProfiles)for(const key of ['public','sha256','runtimePolicy','runtimeEdges','unverifiedInputs']){const bad=structuredClone(history);bad.modules.find(p=>p.public===row.public)[key]='unreviewed';a.throws(()=>C.withoutContracts(bad));}
 const partial=structuredClone(history);partial.modules.pop();a.throws(()=>C.withoutContracts(partial));const extra=structuredClone(history);extra.modules.push({...history.modules.at(-1),public:'unlisted.mjs'});a.throws(()=>C.withoutContracts(extra));
 const classic=require('../scripts/build/classic-runtime-contracts.json');a.ok(classic.scripts.some(p=>p.public==='labs/ofdm-ici/false-alarm/app.js'));a.ok(current.modules.some(p=>p.public==='labs/waveform-design/cmc/lesson.mjs'&&p.runtimePolicy==='literal-workers'));
});
