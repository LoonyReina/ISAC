'use strict';
// Source-layout gate: mandatory through compatibility-build.test.cjs, outside legacy-layout regression.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const M=require('../scripts/build/compatibility.cjs'),root=path.resolve(__dirname,'..'),manifest=require('../build/compatibility-manifest.json');
test('CMC production dependency graph binds modules, Worker, prefix and return anchors',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cmc-dependency-gate-'));
 try{
  M.build({root,manifest,output:path.join(dir,'dist')});const output=path.join(dir,'dist'),edges=M.checkDependencies(output,manifest),prefix='labs/waveform-design/cmc/';
  a.ok(edges.some(e=>e.from===prefix+'index.html'&&e.to===prefix+'lesson.mjs'));
  a.ok(edges.some(e=>e.from===prefix+'lesson.mjs'&&e.to===prefix+'cmc-worker.mjs'&&e.kind==='reviewed-worker'));
  a.ok(edges.some(e=>e.from===prefix+'cmc-worker.mjs'&&e.to===prefix+'cmc-core.mjs'&&e.kind==='static-module'));
  const missing=structuredClone(manifest);missing.entries=missing.entries.filter(e=>e.public!==prefix+'phase-diagram.mjs');a.throws(()=>M.checkDependencies(output,missing),/Unreviewed or missing module source in runtime contract/);
  const page=path.join(output,prefix+'index.html'),html=fs.readFileSync(page,'utf8');fs.writeFileSync(page,html.replace('#constant-modulus','#missing-cmc-anchor'));a.throws(()=>M.checkDependencies(output,manifest),/Missing public fragment/);fs.writeFileSync(page,html);
  const lesson=path.join(output,prefix+'lesson.mjs');fs.appendFileSync(lesson,'\nnew Worker("unreviewed.js");');a.throws(()=>M.checkDependencies(output,manifest),/Unreviewed module source hash/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
