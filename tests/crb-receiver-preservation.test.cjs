'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('./helpers/crb-receiver-integration-preservation.cjs'),root=path.resolve(__dirname,'..');
function readForHistory(file){return require('./helpers/channel-mapping-preservation.cjs').readCurrentForHistory(file,fs.readFileSync(path.join(root,file)),{root});}
test('receiver exact read-boundary inverse preserves prior files and rejects changed endpoints',()=>{
 for(const row of P.delta.files){const bytes=readForHistory(row.path),copy=Buffer.from(bytes),prior=P.withoutFile(row.path,bytes);a.ok(P.identity(prior,row.before));a.deepEqual(bytes,copy);a.deepEqual(P.withoutFile(row.path,prior),prior);for(const bad of [bytes.subarray(1),Buffer.concat([bytes,Buffer.from('unreviewed')])])a.throws(()=>P.withoutFile(row.path,bad));for(const side of ['before','after'])for(const key of ['bytes','sha256']){const bad=structuredClone(row);bad[side][key]=key==='bytes'?0:'0'.repeat(64);a.throws(()=>P.reverseFile(row.path,bytes,[bad]));}const bad=structuredClone(row);bad.beforeBase64=Buffer.from('wrong').toString('base64');a.throws(()=>P.reverseFile(row.path,bytes,[bad]));a.throws(()=>P.reverseFile(row.path,bytes,[row,row]));a.deepEqual(P.withoutFile('unlisted/'+row.path,bytes),bytes);}
});
test('receiver mappings restore exact CMC manifest and reject omissions duplicates moved entries and ownership changes',()=>{
 const m=JSON.parse(readForHistory('build/compatibility-manifest.json')),copy=structuredClone(m),old=P.withoutMappings(m);a.deepEqual(m,copy);a.equal(P.sha(JSON.stringify(old,null,2)+'\n'),P.delta.baselineManifestSha256);a.deepEqual(P.withoutMappings(old),old);
 for(const row of P.delta.addedEntries)for(const key of ['source','compatibility','public','owner','role']){const bad=structuredClone(m);bad.entries.find(x=>x.source===row.source)[key]='unreviewed';a.throws(()=>P.withoutMappings(bad));}
 for(const mutate of [m=>m.entries.pop(),m=>m.entries.push(structuredClone(m.entries.at(-1))),m=>m.entries.push({...m.entries.at(-1),source:'unlisted/file'}),m=>m.entries.find(x=>x.source==='labs/crb-beamforming/crb-beamforming-core.js').public='changed.js']){const bad=structuredClone(m);mutate(bad);a.throws(()=>P.withoutMappings(bad));}
 a.deepEqual(m.entries.filter(x=>old.entries.some(y=>y.source===x.source)),old.entries);
});
test('CMC history still observes its exact own endpoints after receiver inverse, never rebased hashes',()=>{
 const C=require('./helpers/waveform-cmc-integration-preservation.cjs');for(const row of C.delta.files){const bytes=readForHistory(row.path);a.ok(C.identity(C.withoutFile(row.path,bytes),row.before),row.path);}const m=JSON.parse(readForHistory('build/compatibility-manifest.json'));a.equal(C.sha(JSON.stringify(C.withoutMappings(m),null,2)+'\n'),C.delta.baselineManifestSha256);
});

test('receiver no-addition branch permits only enumerated exact prior manifests, never relocated or modified inventories',()=>{
 const m=JSON.parse(readForHistory('build/compatibility-manifest.json')),old=P.withoutMappings(m);a.deepEqual(P.withoutMappings(old),old);
 for(const mutate of [x=>x.entries[0].owner='changed',x=>x.entries.pop(),x=>x.entries=[]]){const bad=structuredClone(old);mutate(bad);a.throws(()=>P.withoutMappings(bad),/Unrecognized pre-receiver manifest/);}
 const moved=structuredClone(m);for(const row of P.delta.addedEntries)moved.entries.find(x=>x.source===row.source).source='elsewhere/'+row.source;a.throws(()=>P.withoutMappings(moved),/Unrecognized pre-receiver manifest/);
});

test('receiver absent-addition branch rejects changed old manifests and relocation of every new source',()=>{
 const current=JSON.parse(readForHistory('build/compatibility-manifest.json')),old=P.withoutMappings(current),badOld=structuredClone(old);badOld.entries[0].owner='changed-owner';a.throws(()=>P.withoutMappings(badOld),/Unrecognized pre-receiver manifest identity/);
 const moved=structuredClone(current),newSources=new Set(P.delta.addedEntries.map(x=>x.source));for(const row of moved.entries)if(newSources.has(row.source))row.source='elsewhere/'+row.source;a.throws(()=>P.withoutMappings(moved),/Unrecognized pre-receiver manifest identity/);
 for(const row of P.delta.files)for(const old of row.historicalIntermediates||[]){a.ok(old.provenance.length);a.ok(Number.isInteger(old.bytes));a.match(old.sha256,/^[a-f0-9]{64}$/);}
});
