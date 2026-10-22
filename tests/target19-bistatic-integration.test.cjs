'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base=process.env.TARGET19_BASE||root;
const {reader,assertPage,stripSite,assertState,sha}=require('./helpers/target19-layout.cjs'),read=reader(root,base);
const manifest=JSON.parse(read('build/compatibility-manifest.json')),config=JSON.parse(read('build/publication-target19.json'));const get=p=>read(manifest.entries.find(e=>e.public===p).source).toString();
const {requiredFiles,target19BistaticDependencies:check}=require('../scripts/build/target19-bistatic-dependencies.cjs'),identities=Object.entries(requiredFiles).map(([file])=>({file,sha256:sha(get(file))})),page=get('network-clock.html'),pages=[{file:'network-clock.html',source:page}];
test('bistatic additive wrapper reverses exactly to original clock page',()=>{
 const restored=page.replace('<link rel="stylesheet" href="bistatic.css"><script defer src="bistatic-ui.js"></script>','').replace(/<section class="chapter" id="bistatic-core"[^]*?<\/section>\n\n/,'');
 assertPage(restored,{root,source:'content/pages/network-clock.html',full:'26b7f05b34c84536355c21fcfc448ceb86c878d80d64fadb704ca61467f0366d',body:'ad9b139558e5f90b837ade168804233e12d3d552e5a0075e8bce76d4c4a47910'});
 const ids=[...stripSite(page).matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,66);assert.equal(new Set(ids).size,66);
});
test('four frozen resources and classic Worker/importScripts edges checked',()=>{
 const edges=check({identities,pages,read:get});assert.equal(edges.length,4);
 for(const e of edges){const p=new URL(e.url,'https://example.org/ISAC/'+e.from).pathname.slice(6);assert(manifest.entries.some(x=>x.public===p));}
 for(let i=0;i<4;i++)assert.throws(()=>check({identities:identities.filter((_,j)=>i!==j),pages,read:get}),/missing\/changed/);
 assert.throws(()=>check({identities,pages,read:p=>get(p).replace('bistatic-worker.js','unreviewed-worker.js')}),/shape/);
});
test('bistatic stays one exact19 ID alongside unchanged clock supplement identity',()=>{
 const p=config.modules.find(x=>x.id==='bistatic-ofdm-clock-measurement-2023');assert.equal(p.href,'network-clock.html#bistatic-core');assert.equal(p.bindingComplete,true);assert.deepEqual(p.exactPublicHashes,requiredFiles);assert.deepEqual(p.sharedPageSections,['bistatic-core']);assert.equal(config.modules.length,19);assert(config.modules.some(x=>x.id==='supplement-case-clock'));assertState(config);
});
