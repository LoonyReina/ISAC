'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./helpers/feedback-current-epoch.cjs');
const root=path.resolve(__dirname,'..'),T=require('./helpers/target19-source-identity.cjs'),source=T.sourceLayout(root),file='tests/helpers/teaching-current-epoch.json',raw=fs.readFileSync(path.join(root,file)),epoch=JSON.parse(raw);
test('teaching current epoch preserves the complete immutable198 identity table and scientific evidence',()=>{
 a.equal(T.sha(fs.readFileSync(path.join(root,'tests/helpers/target19-source-delta.json'))),'b3886f1d89b7b20e86933979f5f1623f023031cd49712c133fba62cf78597d70');a.equal(epoch.predecessorTableSha256,'b3886f1d89b7b20e86933979f5f1623f023031cd49712c133fba62cf78597d70');a.equal(T.assertCurrentClosure(root),true);
 for(const row of epoch.files)if(row.predecessor)a.ok(T.same(Buffer.from(row.predecessorBase64,'base64'),row.predecessor),'Full exact retained predecessor '+row.path);
});
test('teaching epoch binds actual layout bytes including all nine shipped assets without introducing fake history',()=>{
 for(const row of epoch.files){if(source&&row.stagedOnly||!source&&row.sourceOnly)continue;const f=source?row.path:row.compatibility;a.ok(T.same(F.before(f,fs.readFileSync(path.join(root,f))),row.current),f);}
 const added=epoch.files.filter(r=>r.path.startsWith('features/teaching19/'));a.equal(added.length,9);for(const row of added){a.equal(row.predecessor,null);const b=fs.readFileSync(path.join(root,source?row.path:row.compatibility));a.ok(T.forHistoricalChain(row.path,b).equals(F.before(row.path,b)),'New assets have no fabricated predecessor');}
});
test('teaching current raw reader rejects stale caller input before history projection',()=>{
 for(const row of epoch.files.filter(r=>!r.stagedOnly&&!r.sourceOnly&&r.predecessor).slice(0,3)){const f=source?row.path:row.compatibility,b=fs.readFileSync(path.join(root,f));a.throws(()=>T.readCurrentForHistory(f,Buffer.concat([b,Buffer.from('unreviewed')]),{root}));}
});
function loadWithEpoch(bytes){const filename=path.join(root,'tests/helpers/target19-source-identity.cjs');const virtualFs=Object.create(fs);virtualFs.readFileSync=(p,...args)=>path.resolve(String(p))===path.join(root,file)?bytes:fs.readFileSync(p,...args);const sandbox={module:{exports:{}},exports:{},Buffer,__dirname:path.dirname(filename),require:n=>n==='node:fs'?virtualFs:require('node:module').createRequire(filename)(n)};vm.runInNewContext(fs.readFileSync(filename,'utf8'),sandbox,{filename});return sandbox.module.exports;}
for(const [name,mutate]of [
 ['changed current digest',e=>e.files[0].current.sha256='0'.repeat(64)],
 ['missing endpoint',e=>e.files.pop()],
 ['duplicate alias',e=>e.files.push(e.files[0])],
 ['forged predecessor',e=>e.files.find(r=>r.predecessor).predecessorBase64='Zm9yZ2Vk'],
 ['unrelated extra wildcard',e=>e.files.push({...e.files[0],path:'features/*'})]
])test('teaching epoch rejects '+name,()=>{const bad=JSON.parse(raw);mutate(bad);a.throws(()=>loadWithEpoch(Buffer.from(JSON.stringify(bad))),/Exact teaching current epoch/);});
test('historical tutorial inventories use exact198 builder without replacing current production module',()=>{
 a.equal(typeof loadWithEpoch(raw).assertCurrentClosure,'function');
 const B=T.historicalResearchTree(root),read=f=>JSON.parse(fs.readFileSync(path.join(root,source?f:f.replace('content/data/','site/')),'utf8'));
 const tree=B.buildResearchTree(...['content/data/registry.json','content/data/research-guides.json','content/data/research-directory.json','docs/PAPER-EXECUTION-BACKLOG.json'].map(read));
 const p=tree.papers.find(p=>p.id==='otfs-joint-estimation-2020');a.equal(p.tutorials[0].href,'otfs-receiver.html#experiment');a.ok(!p.tutorials.some(t=>t.href==='otfs-receiver/source-objective-v1/index.html'));
 const actual=fs.readFileSync(path.join(root,source?'scripts/site/research-tree.cjs':'scripts/research-tree.cjs'),'utf8');a.ok(actual.includes('otfs-receiver/source-objective-v1/index.html'));a.ok(actual.includes('NEW residual-BCD'));
});
