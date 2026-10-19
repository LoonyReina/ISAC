'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),M=require('../scripts/build/compatibility.cjs'),G=require('../scripts/build/causal-capacity-dependencies.cjs'),P=require('./helpers/causal-capacity-integration-preservation.cjs');
const {staticModuleDependencies}=require('../scripts/build/module-dependencies.cjs');
const manifest=require('../build/compatibility-manifest.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const bytes=file=>fs.readFileSync(path.join(root,manifest.entries.find(e=>e.public===file).source));
function inputs(){
 const contract=structuredClone(G.contract),modules=contract.modules.map(m=>({file:m.public,source:bytes(m.public).toString()}));
 const identities=[...contract.modules,...contract.assets].map(m=>({file:m.public,sha256:sha(bytes(m.public))}));
 for(const file of ['course.css','site.css'])identities.push({file,sha256:sha(bytes(file))});
 const raw=bytes(contract.entryPoint).toString();let source=raw.replace(/<link rel="stylesheet" href="site\.css(?:\?[^"]*)?">/,contract.pageStyles.find(s=>s.includes('href="site.css')));
 for(const [key,region] of Object.entries(contract.pageRegions))source=source.replace(new RegExp('<!-- SITE:'+key+':START -->[\\s\\S]*?<!-- SITE:'+key+':END -->'),region);
 identities.push({file:contract.entryPoint,sha256:sha(source)});
 return {contract,modules,identities,pages:[{file:contract.entryPoint,source}]};
}
function run(x){return G.causalDependencies(x.modules,x.contract,x.identities,x.pages,staticModuleDependencies);}
test('causal current runtime has exact complete local static-module closure without Worker or fetch',()=>{const edges=run(inputs());for(const to of ['causal-capacity-controller.mjs','causal-capacity-runtime.mjs','causal-capacity-core.mjs','causal-capacity-view.mjs'])a.ok(edges.some(e=>e.url==='./'+to));a.ok(edges.every(e=>!/^https?:/.test(e.url)));});
test('causal closure rejects missing, duplicate, moved, changed and unlisted dependencies',()=>{
 const mutate=fn=>{const x=inputs();fn(x);a.throws(()=>run(x));};
 for(const p of [...G.contract.modules,...G.contract.assets,{public:G.contract.entryPoint,sha256:G.contract.entryPageSha256}]){mutate(x=>x.identities=x.identities.filter(i=>i.file!==p.public));mutate(x=>x.identities.push({file:p.public,sha256:p.sha256}));mutate(x=>x.identities.find(i=>i.file===p.public).sha256='0'.repeat(64));mutate(x=>x.identities.find(i=>i.file===p.public).file='moved/'+p.public);}
 mutate(x=>x.identities.push({file:'causal-capacity-unlisted.mjs',sha256:'1'.repeat(64)}));
 mutate(x=>x.identities.push({file:'causal-state-capacity-extra.json',sha256:'1'.repeat(64)}));
 mutate(x=>x.identities=x.identities.filter(i=>i.file!==G.contract.entryPoint));
 mutate(x=>x.modules.pop());mutate(x=>x.modules.push(x.modules[0]));
 mutate(x=>{x.modules[0].source+='\nimport "https://unlisted.invalid/a.mjs";';x.identities.find(i=>i.file===x.modules[0].file).sha256=sha(x.modules[0].source);x.contract.modules[0].sha256=sha(x.modules[0].source);});
 mutate(x=>x.contract.modules[0].runtimeEdges.push({kind:'data',url:'https://unlisted.invalid/data',literal:'fetch(url)'}));
 for(const script of ['<script type="module" src="causal-capacity-ui.mjs"></script>','<script src="https://unlisted.invalid/x.js"></script>','<script>fetch("unlisted.json")</script>'])mutate(x=>x.pages[0].source+=script);
 mutate(x=>x.pages[0].source=x.pages[0].source.replace('</head>','<base href="https://unlisted.invalid/">\n</head>'));
 mutate(x=>x.pages[0].source+='<link rel="stylesheet" href="https://unlisted.invalid/x.css">');
 for(const extra of ['<base href="https://unlisted.invalid/">','<iframe src="https://unlisted.invalid/"></iframe>','<link rel=stylesheet href="https://unlisted.invalid/x.css">','<style>@import "https://unlisted.invalid/x.css";</style>'])mutate(x=>x.pages[0].source+=extra);
 mutate(x=>x.pages[0].source=x.pages[0].source.replace('<body','<body onload="fetch(\'https://unlisted.invalid/data\')"'));
 for(const region of ['HEADER','CONTEXT','NEXT'])mutate(x=>x.pages[0].source=x.pages[0].source.replace('<!-- SITE:'+region+':END -->','<!-- SITE:'+region+':END --><img src="https://unlisted.invalid/x.png">'));
});
test('causal mappings preserve the exact deployed pre-integration manifest',()=>{const prior=P.withoutMappings(manifest);a.equal(P.sha(JSON.stringify(prior,null,2)+'\n'),P.delta.priorManifestSha256);a.deepEqual(P.withoutMappings(prior),prior);for(const row of P.delta.addedEntries){for(const kind of ['missing','duplicate','mutated']){const bad=structuredClone(manifest),at=bad.entries.findIndex(e=>e.source===row.source);if(kind==='missing')bad.entries.splice(at,1);if(kind==='duplicate')bad.entries.push(structuredClone(row));if(kind==='mutated')bad.entries[at].public='unreviewed';a.throws(()=>P.withoutMappings(bad));}}});
test('causal compact inverses retain exact byte identities and reject altered endpoints',()=>{
 for(const row of P.delta.files){const candidate=path.join(root,row.path);if(!fs.existsSync(candidate))continue;const current=fs.readFileSync(candidate),prior=P.withoutFile(row.path,current);a.ok(P.identity(prior,row.before));a.deepEqual(P.withoutFile(row.path,prior),prior);a.throws(()=>P.withoutFile(row.path,Buffer.concat([current,Buffer.from('unreviewed')])));a.throws(()=>P.withoutFile(row.path,current,[row,row]));const bad=structuredClone(row);bad.changes[0].beforeBase64=Buffer.from('unreviewed').toString('base64');a.throws(()=>P.withoutFile(row.path,current,[bad]));}
});
test('causal addition never changes existing numerical source assets',()=>{const old=P.withoutMappings(manifest);const records=old.entries.filter(e=>e.source&&(e.source.startsWith('labs/')&&/\.(?:js|mjs|json)$/.test(e.source)||e.source.startsWith('assets/data/'))).map(e=>({path:e.source,sha256:sha(require('./helpers/recovery-published-baseline-projection.cjs').projectFile(e.source,fs.readFileSync(path.join(root,e.source))))})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);a.equal(sha(JSON.stringify(records)),P.delta.protectedNumericalTreeSha256);});
test('causal historical ancestors have exact path-specific frozen provenance, never a wildcard exception',()=>{
 for(const row of P.delta.files)for(const identity of row.historicalIntermediates||[]){
  a.ok(identity.provenance?.includes('#$'));{
   const [file,locator]=identity.provenance.split('#');a.match(file,/^tests\/helpers\/[a-z0-9-]+\.json$/);a.ok(!file.includes('causal'));
   const tokens=[...locator.matchAll(/\.([A-Za-z0-9_]+)|\[(\d+)\]/g)].map(m=>m[1]??Number(m[2]));a.ok(['before','after'].includes(tokens.at(-1)));
   let source=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));for(const k of tokens.slice(0,-1))source=source[k];a.ok(source.path===row.path||source.compatibility===row.compatibility,'same path ancestor');
   a.deepEqual({bytes:identity.bytes,sha256:identity.sha256},source[tokens.at(-1)],'exact frozen endpoint');
   if(tokens.at(-1)==='before'&&source.beforeBase64){const b=Buffer.from(source.beforeBase64,'base64');a.ok(P.identity(b,identity));a.deepEqual(P.withoutFile(row.path,b),b);a.throws(()=>P.withoutFile(row.path,Buffer.concat([b,Buffer.from('unreviewed')])));}
  }
 }
});

test('causal structural guide and backlog inverses preserve unrelated fields and reject partial endpoints',()=>{
 for(const [key,file,fn]of [['guides','content/data/research-guides.json',P.withoutGuides],['backlog','docs/PAPER-EXECUTION-BACKLOG.json',P.withoutBacklog]]){
  const bytes=fs.readFileSync(path.join(root,file)),input=JSON.parse(bytes),expected=JSON.parse(P.withoutFile(file,bytes)),record=P.delta.metadataChanges[key];
  a.deepEqual(fn(input),expected);a.deepEqual(fn(expected),expected);a.deepEqual(input,JSON.parse(bytes));
  const item=x=>x[record.collection].find(r=>r.id===record.id);
  const other=structuredClone(input);other.unrelated='retain';a.equal(fn(other).unrelated,'retain');
  for(const c of record.changes)for(const mode of ['changed','omitted','mixed']){
   const bad=structuredClone(input);let parent=item(bad);for(const p of c.path.slice(0,-1))parent=parent[p];const leaf=c.path.at(-1);
   if(mode==='omitted')delete parent[leaf];else if(mode==='mixed'){if(c.added)delete parent[leaf];else parent[leaf]=structuredClone(c.before);}else parent[leaf]={unreviewed:true};
   a.throws(()=>fn(bad),key+' exact '+c.path.join('.')+' '+mode);
  }
  for(const c of record.changes){
   for(const [which,value]of [['current',c.after],['prior',c.before]]){
    if(c.added&&which==='prior')continue;
    if(value!==null&&!(value&&typeof value==='object'))continue;
    const bad=structuredClone(which==='current'?input:expected);let parent=item(bad);for(const p of c.path.slice(0,-1))parent=parent[p];const leaf=c.path.at(-1);
    if(value===null)parent[leaf]=NaN;else parent[leaf].unreviewed=undefined;
    a.throws(()=>fn(bad),key+' rejects non-JSON JS mutation '+which+' '+c.path.join('.'));
   }
  }
  for(const mode of ['missing','duplicate']){const bad=structuredClone(input);if(mode==='missing')bad[record.collection]=bad[record.collection].filter(x=>x.id!==record.id);else bad[record.collection].push(structuredClone(item(bad)));a.throws(()=>fn(bad));}
 }
});
