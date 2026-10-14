'use strict';
// Source-layout build test, run explicitly like compatibility-build.test.cjs.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const M=require('../scripts/build/compatibility.cjs'),root=path.resolve(__dirname,'..'),manifest=require('../build/compatibility-manifest.json');
test('unified dependency gate rejects missing nested CSS, broken nested anchors and undeclared Worker changes',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ofdm-nested-gate-')),dist=path.join(temp,'dist');
 try{
  M.build({root,manifest,output:dist});const edges=M.checkDependencies(dist,manifest);
  a.ok(edges.some(e=>e.from==='labs/ofdm-ici/false-alarm/index.html'&&e.to==='labs/ofdm-ici/false-alarm/style.css'));
  a.ok(edges.some(e=>e.from==='labs/ofdm-ici/false-alarm/index.html'&&e.to==='labs/ofdm-ici/runtime/worker/ici-worker.js'&&e.kind==='reviewed-classic-worker'));
  const missing=structuredClone(manifest);missing.entries=missing.entries.filter(e=>e.public!=='labs/ofdm-ici/false-alarm/style.css');
  a.throws(()=>M.checkDependencies(dist,missing),/Unmapped public dependency: labs\/ofdm-ici\/false-alarm\/index.html → style.css/);
  const page=path.join(dist,'labs/ofdm-ici/false-alarm/index.html'),html=fs.readFileSync(page,'utf8');fs.writeFileSync(page,html.replace('../../../ofdm-ici-receiver.html#paper','../../../ofdm-ici-receiver.html#nonexistent'));
  a.throws(()=>M.checkDependencies(dist,manifest),/Missing public fragment/);fs.writeFileSync(page,html);
  const app=path.join(dist,'labs/ofdm-ici/false-alarm/app.js');fs.appendFileSync(app,'\nnew Worker("undeclared.js");');a.throws(()=>M.checkDependencies(dist,manifest),/Unreviewed frozen classic source hash/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
