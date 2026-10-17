'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),P=require('./helpers/cooperative-load-preservation.cjs'),manifest=require('../build/compatibility-manifest.json'),G=require('../scripts/build/cooperative-clusters-dependencies.cjs');
test('load addition restores exact main manifest and preserves every prior numerical asset',()=>{
 a.equal(P.sha(JSON.stringify(P.withoutMappings(manifest),null,2)+'\n'),P.delta.priorManifestSha256);
 for(const row of P.delta.protectedAssets)a.equal(P.sha(fs.readFileSync(path.join(root,row.path))),row.sha256,row.path);
 for(const row of P.delta.addedEntries){const bad=structuredClone(manifest);bad.entries.find(x=>x.source===row.source).public='unreviewed';a.throws(()=>P.withoutMappings(bad));}
});
test('load exact byte layer preserves prior endpoints and rejects unexplained mutations',()=>{
 for(const row of P.delta.files){const current=row.path==='cooperative-clusters.html'?renderedPage():fs.readFileSync(path.join(root,row.path));a.ok(P.identity(P.withoutFile(row.path,current),row.before));a.throws(()=>P.withoutFile(row.path,Buffer.concat([current,Buffer.from('unreviewed')])));}
 const c=require('../scripts/build/module-runtime-contracts.json'),prior=P.withoutContracts(c);a.equal(prior.modules.length,P.delta.priorModuleCount);const bad=structuredClone(c);bad.modules.at(-1).sha256='0'.repeat(64);a.throws(()=>P.withoutContracts(bad));
 const r=require('../content/data/registry.json');a.equal(P.withoutRegistry(r).lessonPlacement.length,P.delta.registryAddition.priorLength);const rb=structuredClone(r);rb.lessonPlacement.at(-1).section='foundations';a.throws(()=>P.withoutRegistry(rb));
});
test('load runtime files are covered by complete cooperative current closure',()=>{
 const wanted=['app.mjs','controller.mjs','load-adapter.mjs','subset-adapter.mjs','request-scheduler.mjs','presets.mjs'];a.deepEqual(G.contract.modules.filter(x=>x.public.startsWith('cooperative-load/')).map(x=>x.public.slice(17)),wanted);
 for(const n of wanted){const entry=manifest.entries.find(e=>e.public==='cooperative-load/'+n),module=G.contract.modules.find(e=>e.public===entry.public);a.equal(P.sha(fs.readFileSync(path.join(root,entry.source))),module.sha256);a.equal(module.runtimePolicy,'no-runtime-loads');}
 a.ok(G.contract.assets.some(x=>x.public==='cooperative-load/style.css'));a.ok(G.contract.pageScripts.includes('<script type="module" src="cooperative-load/app.mjs"></script>'));
});

function renderedPage(){let s=fs.readFileSync(path.join(root,'content/pages/cooperative-clusters.html'),'utf8');s=s.replace(/<link rel="stylesheet" href="site\.css(?:\?[^"]*)?">/,G.contract.pageStyles.find(x=>x.includes('href="site.css')));for(const [key,value]of Object.entries(G.contract.pageRegions))s=s.replace(new RegExp('<!-- SITE:'+key+':START -->[\\s\\S]*?<!-- SITE:'+key+':END -->'),value);return Buffer.from(s);}

test('load historical intermediate identities have exact same-path frozen evidence',()=>{
 const files=fs.readdirSync(path.join(root,'tests/helpers')).filter(n=>n.endsWith('.json')&&n!=='cooperative-load-delta.json');
 const records=files.flatMap(name=>{const doc=JSON.parse(fs.readFileSync(path.join(root,'tests/helpers',name),'utf8'));return Array.isArray(doc.files)?doc.files:[];});
 for(const row of P.delta.files)for(const historical of row.historicalIntermediates||[]){
  a.ok(records.some(prior=>(prior.path===row.path||prior.compatibility===row.compatibility)&&[prior.before,prior.after,...prior.historicalIntermediates||[]].some(x=>x&&x.bytes===historical.bytes&&x.sha256===historical.sha256)),'same-path frozen evidence: '+row.path+' '+historical.sha256);
 }
});
