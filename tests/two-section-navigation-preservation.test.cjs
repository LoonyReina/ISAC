'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('./helpers/two-section-navigation-preservation.cjs'),root=path.resolve(__dirname,'..');
const registry=JSON.parse(fs.readFileSync(path.join(root,fs.existsSync(path.join(root,'content/data/registry.json'))?'content/data/registry.json':'site/registry.json')));
test('two-section historical projection reverses only explicit navigation fields without mutating science',()=>{
 const before=JSON.stringify(registry),prior=P.withoutRegistry(registry);a.equal(JSON.stringify(registry),before);a.deepEqual(P.withoutRegistry(prior),prior);
 // Compare this historical navigation layer after the separately enumerated
 // multipath lesson addition is reversed; unrelated science stays live below.
 const beforeMultipath=require('./helpers/multipath-information-preservation.cjs').withoutRegistry(registry);
 for(const key of ['cases','units','directions','knowledgeMap','paperComparisonGroups'])a.deepEqual(prior[key],beforeMultipath[key],key+' science remains live');
 for(const c of P.delta.registryChanges){const bad=structuredClone(registry);let x=bad;for(const key of c.path.slice(0,-1))x=x[key];x[c.path.at(-1)]={unreviewed:true};a.throws(()=>P.withoutRegistry(bad),c.path.join('.'));}
 const bad=structuredClone(registry);bad.cases[0].title='unreviewed science';a.equal(P.withoutRegistry(bad).cases[0].title,'unreviewed science','never hide scientific mutations');
 a.throws(()=>P.withoutRegistry(registry,[...P.delta.registryChanges,P.delta.registryChanges[0]]));
});
test('two-section historical file inverses require exact complete bytes and reject edited records',()=>{
 a.ok(P.delta.files.length,'reviewed navigation source and rendered-file inventory');
 for(const row of P.delta.files){
  const local=path.join(root,row.compatibility||row.path);a.ok(fs.existsSync(local),'mapped historical input '+row.compatibility);
  const bytes=fs.readFileSync(local),copy=Buffer.from(bytes),prior=P.withoutFile(row.path,bytes);a.ok(P.identity(prior,row.before));a.deepEqual(bytes,copy);a.deepEqual(P.withoutFile(row.path,prior),prior);
  for(const bad of [bytes.subarray(1),Buffer.concat([bytes,Buffer.from('unreviewed')])])a.throws(()=>P.withoutFile(row.path,bad));
  for(const side of ['before','after'])for(const key of ['bytes','sha256']){const bad=structuredClone(row);bad[side][key]=key==='bytes'?0:'0'.repeat(64);a.throws(()=>P.reverseFile(row.path,bytes,[bad]));}
  const bad=structuredClone(row);bad.changes[0].beforeBase64=Buffer.from('unreviewed').toString('base64');a.throws(()=>P.reverseFile(row.path,bytes,[bad]));a.throws(()=>P.reverseFile(row.path,bytes,[row,row]));a.deepEqual(P.withoutFile('unlisted/'+row.path,bytes),bytes);
 }
});

test('two-section manifest inverse preserves the exact baseline and rejects missing, duplicate or mutated additions',()=>{
 const input=JSON.parse(Buffer.from(P.delta.priorManifestBase64,'base64'));input.entries.push(...structuredClone(P.delta.addedMappings));const prior=P.withoutMappings(input);a.equal(P.sha(JSON.stringify(prior,null,2)+'\n'),P.delta.priorManifestSha256);a.deepEqual(P.withoutMappings(prior),prior);
 for(const row of P.delta.addedMappings){for(const change of ['remove','duplicate','mutate']){const bad=structuredClone(input),i=bad.entries.findIndex(e=>e.source===row.source);if(change==='remove')bad.entries.splice(i,1);if(change==='duplicate')bad.entries.push(structuredClone(row));if(change==='mutate')bad.entries[i].owner='unreviewed';a.throws(()=>P.withoutMappings(bad));}}
});
test('enumerated narrow and CMC helper endpoints remain exact and reject altered historical bytes',()=>{
 for(const [file,name,key]of [['tests/helpers/dual-array-preservation.cjs','lesson-narrow-layout','changedFiles'],['tests/helpers/dual-array-browser-integration-preservation.cjs','waveform-cmc','files']]){
  const old=require('./helpers/'+name+'-integration-delta.json')[key].find(r=>r.path===file),record=P.delta.files.find(r=>r.path===file);
  a.deepEqual(record.historicalIntermediates.map(({provenance,...identity})=>identity),[old.before,old.after]);
  for(const historical of [Buffer.from(old.beforeBase64,'base64'),(name==='lesson-narrow-layout'?require('./helpers/desktop-layout-integration-preservation.cjs').maybeWithoutFile(file,fs.readFileSync(path.join(root,file))):P.withoutFile(file,fs.readFileSync(path.join(root,file))))]){
   a.ok([old.before,old.after].some(identity=>P.identity(historical,identity)),'enumerated original source identity');a.deepEqual(P.withoutFile(file,historical),historical);
   const changed=Buffer.from(historical);changed[0]^=1;
   for(const bad of [changed,historical.subarray(1),Buffer.concat([historical,Buffer.from('unreviewed')])])a.throws(()=>P.withoutFile(file,bad));
  }
 }
});
