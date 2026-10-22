'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base=process.env.TARGET19_BASE||root;
const {reader,assertPage,assertState,sha}=require('./helpers/target19-layout.cjs'),read=reader(root,base);
const manifest=JSON.parse(read('build/compatibility-manifest.json')),config=JSON.parse(read('build/publication-target19.json'));
const {requiredFiles,target19NearfieldDependencies:check}=require('../scripts/build/target19-nearfield-dependencies.cjs');
const ids=Object.entries(requiredFiles).map(([file,h])=>({file,sha256:sha(read(manifest.entries.find(e=>e.public===file).source))}));
const page=read('content/pages/near-field.html').toString(),pages=[{file:'near-field.html',source:page}];
test('all41 NF assets exact, body canonical and basic controls retained',()=>{assert.equal(ids.length,41);check({identities:ids,pages});assertPage(page,{root,source:'content/pages/near-field.html',full:'677c52ae195abc7175a634ae03c104aac947e6ec656d038c2b386085e7615660',body:'571d49d5627eac49489dd6d118284249d3c74e691798c34384359341eacddafc'});assert(page.includes('NFR:LEGACY-PREREQUISITE:START'));assert(page.includes('nf-'));});
test('deleted or modified preset cannot silently pass',()=>{for(let i=0;i<ids.length;i++)assert.throws(()=>check({identities:ids.filter((_,j)=>i!==j),pages}),/missing\/changed/);assert.throws(()=>check({identities:ids.map((e,i)=>i?e:{...e,sha256:'0'.repeat(64)}),pages}),/missing\/changed/);assert.throws(()=>check({identities:ids,pages:[]}),/mount/);});
test('NF and mapping are exact source-bound but no readiness/deployment inflation',()=>{
 const nf=config.modules.find(p=>p.id==='supplement-case-near-field'),mapping=config.modules.find(p=>p.id==='channels-sensing-communication-mapping-2026');
 assert.equal(nf.bindingComplete,true);assert.equal(mapping.bindingComplete,true);assert.deepEqual(nf.exactPublicHashes,requiredFiles);assert.equal(mapping.exactPublicFiles.length,11);
 for(const m of [nf,mapping])for(const p of m.exactPublicFiles){const e=manifest.entries.find(e=>e.public===p);assert(e);assert.equal(sha(read(e.source)),m.exactPublicHashes[p]);}
 assertState(config);
});
test('existing numerical NF modules unchanged and only exact preset loader added',()=>{
 const contracts=JSON.parse(read('scripts/build/module-runtime-contracts.json')).modules;
 for(const file of ['labs/near-field/research/entry.mjs','labs/near-field/research/precomputed-loader.mjs'])assert.equal(contracts.find(e=>e.public===file).sha256,sha(read(file)));
 const loader=contracts.find(e=>e.public==='labs/near-field/research/precomputed-loader.mjs');assert.equal(loader.runtimeEdges.length,1);assert.equal(loader.runtimeEdges[0].url,'./precomputed/source-chain.json');
});
