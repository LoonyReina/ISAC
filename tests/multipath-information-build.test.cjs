'use strict';
// Current runtime closure and exact historical inverses are independently tested.
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),G=require('../scripts/build/multipath-information-dependencies.cjs'),P=require('./helpers/multipath-information-preservation.cjs');
const {staticModuleDependencies}=require('../scripts/build/module-dependencies.cjs'),manifest=require('../build/compatibility-manifest.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const bytes=file=>fs.readFileSync(path.join(root,manifest.entries.find(e=>e.public===file).source));
function inputs(){return {modules:G.contract.modules.map(m=>({file:m.public,source:bytes(m.public).toString()})),identities:[...G.contract.modules,...G.contract.assets,{public:G.contract.entryPoint}].map(m=>({file:m.public,sha256:sha(bytes(m.public))})),pages:[{file:G.contract.entryPoint,source:bytes(G.contract.entryPoint).toString()}]};}
const run=x=>G.multipathDependencies(x.modules,x.identities,x.pages,staticModuleDependencies);
test('multipath runtime closure binds all eight assets, fixed scientific page and module Worker',()=>{const edges=run(inputs());a.ok(fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8').includes('node --test tests/multipath-information-build.test.cjs'),'current source closure is mandatory in Pages CI');a.equal(G.contract.modules.length,7);a.equal(G.contract.assets.length,1);a.ok(edges.some(e=>e.url==='./multipath-information-core/multipath-fisher-worker.mjs'));a.ok(edges.every(e=>!/^https?:/.test(e.url)));});
test('multipath closure fails closed for missing duplicate moved modified unlisted modules or active page edges',()=>{
 const mutate=fn=>{const x=inputs();fn(x);a.throws(()=>run(x));};
 for(const p of [...G.contract.modules,...G.contract.assets,{public:G.contract.entryPoint,sha256:sha(bytes(G.contract.entryPoint))}]){mutate(x=>x.identities=x.identities.filter(i=>i.file!==p.public));mutate(x=>x.identities.push({file:p.public,sha256:p.sha256}));mutate(x=>x.identities.find(i=>i.file===p.public).sha256='0'.repeat(64));mutate(x=>x.identities.find(i=>i.file===p.public).file='moved/'+p.public);}
 mutate(x=>x.identities.push({file:'multipath-information-unlisted.mjs',sha256:'1'.repeat(64)}));mutate(x=>x.modules.pop());mutate(x=>x.modules.push(x.modules[0]));mutate(x=>x.modules[0].source+='\nimport "https://unlisted.invalid/a.mjs";');
 for(const extra of ['<script src="https://unlisted.invalid/x.js"></script>','<base href="https://unlisted.invalid/">','<iframe src="https://unlisted.invalid/"></iframe>','<style>@import "https://unlisted.invalid/x.css";</style>'])mutate(x=>x.pages[0].source+=extra);
 mutate(x=>x.pages[0].source=x.pages[0].source.replace('<body','<body onload="alert(1)"'));
});
test('multipath compact inverses retain original complete hashes and reject altered endpoints',()=>{
 for(const row of P.delta.files){const file=path.join(root,row.path);if(!fs.existsSync(file))continue;const current=fs.readFileSync(file),prior=P.withoutFile(row.path,current);a.ok(P.identity(prior,row.before),row.path);a.deepEqual(P.withoutFile(row.path,prior),prior);a.throws(()=>P.withoutFile(row.path,Buffer.concat([current,Buffer.from('unreviewed')])));a.throws(()=>P.withoutFile(row.path,current,[row,row]));const bad=structuredClone(row);bad.changes[0].beforeBase64=Buffer.from('unreviewed').toString('base64');a.throws(()=>P.withoutFile(row.path,current,[bad]));}
});
test('multipath mappings preserve every deployed predecessor mapping and reject partial additions',()=>{
 const prior=P.withoutMappings(manifest);a.equal(sha(JSON.stringify(prior,null,2)+'\n'),P.delta.priorManifestSha256);a.deepEqual(P.withoutMappings(prior),prior);
 for(const row of P.delta.addedEntries)for(const mode of ['missing','duplicate','changed']){const bad=structuredClone(manifest),at=bad.entries.findIndex(e=>e.source===row.source);if(mode==='missing')bad.entries.splice(at,1);if(mode==='duplicate')bad.entries.push(structuredClone(row));if(mode==='changed')bad.entries[at].public='unreviewed';a.throws(()=>P.withoutMappings(bad));}
});
test('multipath addition preserves all previous numerical assets and historical JSONs unchanged',()=>{
 const records=P.withoutMappings(manifest).entries.filter(e=>e.source&&(e.source.startsWith('labs/')&&/\.(?:js|mjs|json)$/.test(e.source)||e.source.startsWith('assets/data/'))).map(e=>({path:e.source,sha256:sha(fs.readFileSync(path.join(root,e.source)))})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);a.equal(records.length,P.delta.protectedNumericalFileCount);a.equal(sha(JSON.stringify(records)),P.delta.protectedNumericalTreeSha256);
 for(const row of P.delta.preservedHistoricalJSONs)a.equal(sha(fs.readFileSync(path.join(root,row.path))),row.sha256,row.path);
});
test('multipath ancestors refer to exact same-path immutable predecessor records',()=>{
 for(const row of P.delta.files)for(const id of row.historicalIntermediates||[]){const [file,loc]=id.provenance.split('#');a.match(file,/^tests\/helpers\/[a-z0-9-]+\.json$/);a.ok(!file.includes('multipath-information'));const tokens=[...loc.matchAll(/\.([A-Za-z0-9_]+)|\[(\d+)\]/g)].map(m=>m[1]??Number(m[2]));let value=JSON.parse(fs.readFileSync(path.join(root,file)));for(const k of tokens.slice(0,-1))value=value[k];a.ok(value.path===row.path||value.compatibility===row.compatibility);a.deepEqual({bytes:id.bytes,sha256:id.sha256},value[tokens.at(-1)]);}
});
test('multipath structural metadata inverse is exact, retains unrelated fields and rejects partial or non-JSON endpoints',()=>{
 for(const [key,file,fn]of [['registry','content/data/registry.json',P.withoutRegistry],['backlog','docs/PAPER-EXECUTION-BACKLOG.json',P.withoutBacklog]]){const bytes=fs.readFileSync(path.join(root,file)),input=JSON.parse(bytes),expected=JSON.parse(P.withoutFile(file,bytes));a.deepEqual(fn(input),expected);a.deepEqual(fn(expected),expected);const other=structuredClone(input);other.unrelated='retain';a.equal(fn(other).unrelated,'retain');
 for(const record of P.delta.metadataChanges[key])for(const c of record.changes)for(const mode of ['changed','omitted','mixed']){const bad=structuredClone(input);let parent=bad[record.collection].find(r=>r.id===record.id);for(const p of c.path.slice(0,-1))parent=parent[p];const leaf=c.path.at(-1);if(mode==='omitted'||mode==='mixed'&&c.added)delete parent[leaf];else if(mode==='mixed')parent[leaf]=structuredClone(c.before);else parent[leaf]={unreviewed:undefined};a.throws(()=>fn(bad),key+' '+c.path.join('.')+' '+mode);}
 }
});
