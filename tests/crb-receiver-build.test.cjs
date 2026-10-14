'use strict';
// Source-layout CI gate. The compatibility builder test explicitly requires this.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const M=require('../scripts/build/compatibility.cjs'),D=require('../scripts/build/crb-receiver-dependencies.cjs'),root=path.resolve(__dirname,'..'),manifest=require('../build/compatibility-manifest.json');
let cachedFixture;
function fixture(){if(cachedFixture)return structuredClone(cachedFixture);const rows=manifest.entries.filter(x=>x.public!==null&&x.source!==null);cachedFixture={scripts:rows.filter(x=>x.public.startsWith('crb-receiver/')&&x.public.endsWith('.js')).map(x=>({file:x.public,source:fs.readFileSync(path.join(root,x.source),'utf8')})),contract:structuredClone(require('../scripts/build/crb-receiver-runtime-contracts.json')),identities:rows.map(x=>({file:x.public,sha256:M.sha(fs.readFileSync(path.join(root,x.source)))})),pages:[{file:'crb-beamforming.html',source:fs.readFileSync(path.join(root,'content/pages/crb-beamforming.html'),'utf8')}]};return structuredClone(cachedFixture);}
const run=f=>D.receiverDependencies(f.scripts,f.contract,f.identities,f.pages);
test('receiver current source gate binds complete exact inventory and every reviewed runtime edge',()=>{
 const f=fixture(),edges=run(f);a.equal(f.scripts.length,5);a.equal(f.contract.assets.length,1);a.equal(f.contract.boundExistingFiles.length,7);a.equal(edges.filter(x=>x.kind==='reviewed-crb-receiver-importScripts').length,4);a.ok(edges.some(x=>x.from==='crb-beamforming.html'&&x.url==='crb-receiver/worker.js'&&x.kind==='reviewed-crb-receiver-worker'));a.ok(edges.some(x=>x.from==='crb-receiver/core.js'&&x.url==='../crb-multiuser-model.js'));a.ok(edges.some(x=>x.from==='crb-receiver/core.js'&&x.url==='./runtime-manifest.js'));
});
test('receiver gate rejects changed source even with forged data-contract hash or dynamic hidden dependency',()=>{
 for(const suffix of ['\nnew Worker(location.hash.slice(1));','\nimportScripts(variable);','\nfetch("missing.bin");','\nimport("missing.mjs");','\n/* changed source */']){const f=fixture(),s=f.scripts.find(x=>x.file==='crb-receiver/worker.js');s.source+=suffix;const hash=M.sha(s.source);f.identities.find(x=>x.file===s.file).sha256=hash;a.throws(()=>run(f));f.contract.scripts.find(x=>x.public===s.file).sha256=hash;a.throws(()=>run(f),/Unreviewed CRB receiver contract/);}
});
test('receiver gate rejects missing changed copied and unlisted assets without widening old scanners',()=>{
 for(const name of ['extra.js','extra.JS','extra.mjs','extra.cjs','extra.dat','nested/extra.py']){const f=fixture();f.identities.push({file:'crb-receiver/'+name,sha256:M.sha('unreviewed')});a.throws(()=>run(f),/Unreviewed CRB receiver public path/);}
 for(const row of [...fixture().contract.scripts,...fixture().contract.assets,...fixture().contract.boundExistingFiles]){for(const missing of [true,false]){const f=fixture();if(missing)f.identities=f.identities.filter(x=>x.file!==row.public);else f.identities.find(x=>x.file===row.public).sha256='0'.repeat(64);a.throws(()=>run(f));}}
 for(const mutate of [f=>f.scripts.pop(),f=>f.scripts.push({...f.scripts[0]}),f=>f.identities.push({file:'elsewhere/copy.js',sha256:f.contract.scripts[0].sha256}),f=>f.identities.push({file:'CRB-RECEIVER/unknown.dat',sha256:M.sha('unreviewed')}),f=>f.identities.push({...f.identities[0]})]){const f=fixture();mutate(f);a.throws(()=>run(f));}
 for(const mutate of [f=>f.contract.scripts.pop(),f=>f.contract.assets=[],f=>f.contract.scripts[0].extra=true,f=>f.contract.scripts[2].runtimeEdges[0].url='wrong.js',f=>f.contract.boundExistingFiles.pop()]){const f=fixture();mutate(f);a.throws(()=>run(f),/Unreviewed CRB receiver contract/);}
});
test('receiver page binding rejects missing duplicate eager or reordered scripts and missing CSS',()=>{
 for(const mutate of [s=>s.replace('<script defer src="crb-receiver/core.js"></script>',''),s=>s.replace('<script defer src="crb-receiver/core.js"></script>','<script src="crb-receiver/core.js"></script>'),s=>s.replace('<script defer src="crb-receiver/core.js"></script>','<script defer src="crb-receiver/core.js"></script><script defer src="crb-receiver/core.js"></script>'),s=>s.replace('src="crb-receiver/core.js"','src="SWAP"').replace('src="crb-receiver/runtime-manifest.js"','src="crb-receiver/core.js"').replace('src="SWAP"','src="crb-receiver/runtime-manifest.js"'),s=>s.replace('<link rel="stylesheet" href="crb-receiver/ui.css">','')]){const f=fixture();f.pages[0].source=mutate(f.pages[0].source);a.throws(()=>run(f));}
});
test('actual builder calls receiver gate alongside old live gates against fresh artifact and rejects missing runtime map',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'crb-receiver-build-'));try{const output=path.join(temp,'dist');M.build({root,manifest,output});const edges=M.checkDependencies(output,manifest);a.ok(edges.some(x=>x.from==='crb-beamforming.html'&&x.to==='crb-receiver/worker.js'&&x.kind==='reviewed-crb-receiver-worker'));a.ok(edges.some(x=>x.from==='labs/waveform-design/cmc/lesson.mjs'&&x.kind==='reviewed-worker'));a.ok(edges.some(x=>x.from==='labs/ofdm-ici/runtime/worker/ici-worker.js'&&x.kind==='reviewed-classic-importScripts'));
 const missing=structuredClone(manifest);missing.entries=missing.entries.filter(x=>x.public!=='crb-receiver/worker.js');a.throws(()=>M.checkDependencies(output,missing));const p=path.join(output,'crb-receiver/worker.js');fs.appendFileSync(p,'\nnew Worker("dynamic-extra.js");');a.throws(()=>M.checkDependencies(output,manifest));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('receiver critical head rejects conflicting attributes, inert wrappers and stylesheet policy changes',()=>{
 const tag='<script defer src="crb-receiver/core.js"></script>',link='<link rel="stylesheet" href="crb-receiver/ui.css">';
 const changes=[
  s=>s.replace(tag,'<script async defer src="crb-receiver/core.js"></script>'),
  s=>s.replace(tag,'<script defer type="module" src="crb-receiver/core.js"></script>'),
  s=>s.replace(tag,'<script defer nomodule src="crb-receiver/core.js"></script>'),
  s=>s.replace(tag,'<script data-defer src="crb-receiver/core.js"></script>'),
  s=>s.replace(tag,'<script defer data-src="crb-receiver/core.js"></script>'),
  s=>s.replace(tag,'<script defer src="wrong.js" src="crb-receiver/core.js"></script>'),
  s=>s.replace(tag,'<script defer defer src="crb-receiver/core.js"></script>'),
  s=>s.replace(tag,'<!--'+tag+'-->'),
  ...['template','noscript','textarea','style','script'].map(t=>s=>s.replace(tag,'<'+t+'>'+tag+'</'+t+'>')),
  s=>s.replace('<head>','<head><base href="https://wrong.invalid/">'),
  s=>s.replace(link,'<link rel="preload" href="crb-receiver/ui.css">'),
  s=>s.replace(link,'<link rel="stylesheet" disabled href="crb-receiver/ui.css">'),
  s=>s.replace(link,'<link rel="stylesheet" media="print" href="crb-receiver/ui.css">'),
  s=>s.replace(link,'<link rel="stylesheet" data-href="crb-receiver/ui.css">'),
  s=>'<!--'+s.slice(0,s.indexOf('</head>')+7)+'-->'+s.slice(s.indexOf('</head>')+7)
 ];for(const mutate of changes){const f=fixture();f.pages[0].source=mutate(f.pages[0].source);a.throws(()=>run(f),/CRB receiver.*head/);}
 const f=fixture();f.pages[0].source=f.pages[0].source.replace(tag,'<!--'+tag+'-->');const head=f.pages[0].source.slice(0,f.pages[0].source.indexOf('</head>')+7);f.contract.entryHead={bytes:Buffer.byteLength(head),sha256:M.sha(head)};a.throws(()=>run(f),/Unreviewed CRB receiver contract/);
});
