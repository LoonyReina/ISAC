'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('./helpers/channel-mapping-preservation.cjs'),root=path.resolve(__dirname,'..');
const resetUi=require('./helpers/reset-ui-preservation.cjs');
// Exact outer reset layer authenticates actual current bytes before old mapping
// endpoint assertions. Old mapping table and all old expected values stay frozen.
function mappingLayer(file,bytes){return resetUi.readCurrentForHistory(file,bytes,{root});}
function copyResetClosure(directory,sourceLayout){for(const row of resetUi.delta.files){if(!sourceLayout&&row.sourceOnly)continue;const dest=path.join(directory,row.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,row.path),dest);}require('./helpers/target19-source-identity.cjs').copyCurrentFixture(root,directory);resetUi.assertCurrentClosure(directory);}

test('new mapping inverse binds both complete endpoints and rejects every unknown scoped current version',()=>{
 for(const row of P.delta.files){let p=path.join(root,row.path);if(!fs.existsSync(p))p=path.join(root,row.compatibility);if(!fs.existsSync(p))continue;const actual=fs.readFileSync(p),current=mappingLayer(path.relative(root,p),actual);a.ok(P.same(current,row.after),row.path);const before=P.reverseFile(row.path,current);a.ok(P.same(before,row.before));a.deepEqual(P.forHistoricalChain(row.path,before),before);a.deepEqual(P.forHistoricalChain(row.path,current),before);a.throws(()=>P.reverseFile(row.path,before));for(const bad of [current.subarray(1),Buffer.concat([current,Buffer.from('unreviewed')]),Buffer.from('{}\n')])a.throws(()=>P.forHistoricalChain(row.path,bad));}
 const unknown=Buffer.from('untouched');a.deepEqual(P.forHistoricalChain('unscoped/file',unknown),unknown);
});

// These are new raw-read guards. Existing leaf tests above and all old golds stay intact.
test('strict current reader binds source closure and canonical before independently of old helper chains',()=>{
 const c=P.assertCurrentReadClosure(root);let checked=0;
 for(const row of [...P.delta.files,...P.delta.hookFiles]){
  if(c.sourceLayout&&row.generated||!c.sourceLayout&&row.sourceOnly)continue;
  const file=c.sourceLayout?row.path:row.compatibility,current=fs.readFileSync(path.join(root,file)),before=P.readCurrentForHistory(file,current,{root});
  a.ok(P.same(before,row.before));a.ok(P.same(mappingLayer(file,fs.readFileSync(path.join(root,file))),row.after));
  for(const alias of new Set([row.path,row.compatibility]))a.deepEqual(P.readCurrentForHistory(alias,current,{root}),before);
  const mutation=Buffer.from(current);mutation[0]^=1;
  for(const bad of [before,mutation,current.subarray(1),Buffer.concat([current,Buffer.from('extra')])])a.throws(()=>P.readCurrentForHistory(file,bad,{root}),/Strict raw current after required/);
  checked++;
 }
 a.equal(checked,c.sourceLayout?73:55);a.throws(()=>P.readCurrentForHistory('index.html',Buffer.from('unknown')),/Explicit live source root/);
 // Unchanged real files keep their existing guard; nonexistent paths and forged raw input reject.
 const unscoped='tests/helpers/otfs-statistical-preservation.cjs',raw=fs.readFileSync(path.join(root,unscoped));
 a.deepEqual(P.readCurrentForHistory(unscoped,raw,{root}),raw);
 a.throws(()=>P.readCurrentForHistory(unscoped,Buffer.from('forged'),{root}),/Actual unscoped raw bytes/);
 for(const unknown of ['unscoped/file','../registry.json','/index.html'])a.throws(()=>P.readCurrentForHistory(unknown,Buffer.from('unknown'),{root}));
 const absent=P.delta.files.find(r=>c.sourceLayout?r.generated:r.sourceOnly);
 a.throws(()=>P.readCurrentForHistory(absent.path,Buffer.from(absent.beforeBase64,'base64'),{root}));
});
test('strict endpoint schema rejects missing extra duplicate unknown and cross-aliased entries',()=>{
 const changes=[s=>s.files.pop(),s=>s.files.push({...s.files[0],path:'unknown'}),s=>s.files.push(s.files[0]),s=>s.hookFiles.pop(),s=>s.hookFiles.push({...s.hookFiles[0],path:'tests/unknown.test.cjs'}),s=>s.hookFiles.push(s.hookFiles[0]),s=>s.files[4].path='unknown.html',s=>s.files[4].compatibility='reading.html',s=>s.files[0].compatibility='../registry.json',s=>s.files[0].beforeBase64=Buffer.from('unknown').toString('base64'),s=>s.files[0].before.sha256='0'.repeat(64),s=>s.files[0].after.sha256='invalid',s=>s.files[3].sourceOnly=false,s=>s.files[4].generated=false,s=>s.schemaVersion=1];
 for(const change of changes){const bad=structuredClone(P.delta);change(bad);a.throws(()=>P.validateCurrentTable(bad));}
 a.equal(P.validateCurrentTable().size,83);
});
test('strict current closure rejects current mutation deletion and symlink before historical bytes are returned',()=>{
 const os=require('node:os'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'mapping-current-closure-')),c=P.assertCurrentReadClosure(root);
 const rows=[...P.delta.files,...P.delta.hookFiles].filter(row=>!(c.sourceLayout&&row.generated||!c.sourceLayout&&row.sourceOnly));
 try{
  for(const row of rows){const file=c.sourceLayout?row.path:row.compatibility,p=path.join(dir,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(root,file),p);}
  copyResetClosure(dir,c.sourceLayout);
  a.equal(P.assertCurrentReadClosure(dir).sourceLayout,c.sourceLayout);
  const row=rows[0],file=c.sourceLayout?row.path:row.compatibility,p=path.join(dir,file),current=fs.readFileSync(p),bad=Buffer.from(current);bad[0]^=1;
  fs.writeFileSync(p,bad);a.throws(()=>P.readCurrentForHistory(file,current,{root:dir}),/Exact live current closure/);
  fs.writeFileSync(p,current);fs.renameSync(p,p+'.retained');a.throws(()=>P.readCurrentForHistory(file,current,{root:dir}));
  fs.symlinkSync(p+'.retained',p);a.throws(()=>P.readCurrentForHistory(file,current,{root:dir}),/symlink/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

// New CURRENT resource tests, separate from historical byte projection and old assertions.
test('current mapping layout resolves exactly ten frozen public resources without changing old aliases',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'build/local-candidate-allowlist.json'))),entries=JSON.parse(fs.readFileSync(path.join(root,'build/channel-mapping-integration-delta.json'))).addedEntries.filter(e=>(e.public||'').startsWith('channel-mapping/'));
 a.equal(P.currentMappingResources.length,10);a.equal(new Set(P.currentMappingResources.map(r=>r.public)).size,10);
 a.deepEqual(P.currentMappingResources.map(r=>({public:r.public,compatibility:r.compatibility})),entries.map(e=>({public:e.public,compatibility:e.compatibility})));
 for(const row of P.currentMappingResources){a.equal(cfg.newPublicFiles[row.public].source,row.compatibility);const raw=fs.readFileSync(path.join(root,row.compatibility));a.equal(P.sha(require('./helpers/target19-source-identity.cjs').teachingBefore(row.compatibility,raw)),cfg.newPublicFiles[row.public].sha256,'exact198 import provenance, not current runtime identity');a.equal(P.resolveCurrentStagingResource(row.public,{root}),row.compatibility);a.ok(P.same(fs.readFileSync(path.join(root,row.compatibility)),row));}
 const old=require('./helpers/otfs-staging-resources.cjs');for(const file of ['otfs-receiver/communication/kernel.mjs','otfs-receiver/joint/joint-core.mjs','tests/helpers/otfs-staging-resources.cjs'])a.equal(P.resolveCurrentStagingResource(file,{root}),old(file));
 for(const file of ['channel-mapping/unreviewed.mjs','channel-mapping/src/missing.mjs','labs/channel-mapping/src/app.mjs','unlisted/missing.mjs','../channel-mapping/styles.css','/channel-mapping/styles.css','channel-mapping/styles.css?spoof=1'])a.throws(()=>P.resolveCurrentStagingResource(file,{root}));
 a.throws(()=>P.resolveCurrentStagingResource('channel-mapping/styles.css',{root,sha256:'0'.repeat(64)}));
});
test('current mapping layout rejects missing forged changed and symlinked physical assets in each real layout',()=>{
 const os=require('node:os'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'mapping-current-resource-')),c=P.assertCurrentReadClosure(root);
 try{
  const rows=[...P.delta.files,...P.delta.hookFiles].filter(row=>!(c.sourceLayout&&row.generated||!c.sourceLayout&&row.sourceOnly));
  for(const row of rows){const file=c.sourceLayout?row.path:row.compatibility,p=path.join(dir,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(root,file),p);}
  copyResetClosure(dir,c.sourceLayout);
  for(const row of P.currentMappingResources){const p=path.join(dir,row.compatibility);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(root,row.compatibility),p);}
  const row=P.currentMappingResources[0],p=path.join(dir,row.compatibility),raw=fs.readFileSync(p);a.equal(P.resolveCurrentStagingResource(row.public,{root:dir}),row.compatibility);
  for(const bad of [Buffer.from('forged'),Buffer.concat([raw,Buffer.from('extra')]),Buffer.from(raw.map((v,i)=>i===0?v^1:v))]){fs.writeFileSync(p,bad);a.throws(()=>P.resolveCurrentStagingResource(row.public,{root:dir}),/Exact current mapping resource identity/);fs.writeFileSync(p,raw);}
  fs.renameSync(p,p+'.retained');a.throws(()=>P.resolveCurrentStagingResource(row.public,{root:dir}));fs.symlinkSync(p+'.retained',p);a.throws(()=>P.resolveCurrentStagingResource(row.public,{root:dir}),/symlink/);fs.unlinkSync(p);fs.renameSync(p+'.retained',p);
  const parent=path.dirname(p);fs.renameSync(parent,parent+'.retained');fs.symlinkSync(parent+'.retained',parent);a.throws(()=>P.resolveCurrentStagingResource(row.public,{root:dir}),/symlink/);fs.unlinkSync(parent);fs.renameSync(parent+'.retained',parent);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
