'use strict';
// Fresh portable gates run only from independent temporary copies. Production
// Node Workers and browser-module VM are distinct from actual browser evidence.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const G=require('./helpers/networked-sync-portable.cjs'),names=require('./helpers/gaussian-tradeoff-owned-suites.json'),root=path.resolve(__dirname,'..'),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function successful(result){if(result.error)throw result.error;a.equal(result.status,0,result.stdout+'\n'+result.stderr);return result;}
test('owned Gaussian exact frozen numerical, quadrature, stress, export and37 codec/Worker gates execute portably',{timeout:240000},t=>{
 const source=path.join(root,'labs/gaussian-tradeoff/runtime');G.assertInventory(path.join(source,'tests'),names.runtimeInventory);const dir=fs.mkdtempSync(path.join(os.tmpdir(),'isac-gaussian-owned-'));
 try{
  // All42 source members are explicit in the archive manifest, including tests,
  // local first-party Python oracle and immutable original report evidence.
  const manifestBytes=fs.readFileSync(path.join(source,'ARTIFACT-MANIFEST.json'));a.equal(hash(manifestBytes),'5c936503bb32472514199ed9da64e173bcfb71dfef9cb8195945387db9a573bf');const manifest=JSON.parse(manifestBytes),entries=manifest.files;a.equal(entries.length,41);G.assertInventory(source,['ARTIFACT-MANIFEST.json',...entries.map(x=>x.path)]);
  for(const entry of entries){const file=entry.path,data=fs.readFileSync(path.join(source,file));a.equal(data.length,entry.bytes,file);a.equal(hash(data),entry.sha256,file);const out=path.join(dir,file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,data);}
  for(const name of ['test-numerics.mjs','test-integrals.mjs','test-stress.mjs','export-live-evidence.mjs'])successful(G.run(['tests/'+name],{cwd:dir}));
  const read=f=>JSON.parse(fs.readFileSync(path.join(dir,'reports',f)));const numeric=read('numerics.json');a.equal(numeric.checks,2382);a.deepEqual(numeric.cases,names.numericCases);a.ok(numeric.maxScaledError<2e-9);
  const integrals=read('integrals.json');a.equal(integrals.cases,61);a.deepEqual(integrals.rows.map(x=>x.case),names.integralCases);a.ok(integrals.maxFigure4Error<2e-9);a.ok(integrals.maxSphereError<3e-8);
  const stress=read('stress.json');a.equal(stress.cases,366);a.equal(stress.results.length,72);a.ok(stress.maxRelativeGap<1e-8);
  const exported=read('live-evidence.json');a.deepEqual(exported.map(x=>x.name),names.exportCases);for(const row of exported){a.ok(row.result.shapes.length>=6);for(const shape of row.result.shapes){a.equal(shape.stiefel.rate,null);a.ok(shape.relativeGap<1e-8);}}
  const env={...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1',MKL_NUM_THREADS:'1',NUMEXPR_NUM_THREADS:'1'};delete env.NODE_TEST_CONTEXT;successful(cp.spawnSync('python3',['tests/verify-live-evidence.py'],{cwd:dir,env,encoding:'utf8',timeout:230000,maxBuffer:24*1024*1024}));const oracle=read('live-direct-oracle.json');a.equal(oracle.checks,1986);a.deepEqual(oracle.cases,names.exportCases);
  for(const suite of ['codec.test.mjs','protocol.test.mjs'])G.assertTap(G.run(['--experimental-vm-modules','--test','--test-reporter=tap','tests/'+suite],{cwd:dir}),names.runtime[suite]);
  t.diagnostic('2382 numeric comparisons,61 finite integral/preset cases,366 stress cases,1986 direct NumPy comparisons,9 codec and28 protocol tests; actual Node Workers and separately labelled browser-module VM, not actual browser acceptance');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('owned Gaussian exact mounted lesson tests execute with real Node Workers',{timeout:240000},t=>{
 const dir=path.join(root,'labs/gaussian-tradeoff/lesson/tests');G.assertInventory(dir,names.lessonInventory);a.deepEqual(Object.keys(names.lesson),['controller.test.mjs','mounted-ui.test.mjs']);for(const [suite,labels]of Object.entries(names.lesson)){a.ok(labels.length>0);G.assertTap(G.run(['--experimental-vm-modules','--test','--test-reporter=tap',path.join(dir,suite)],{cwd:os.tmpdir()}),labels);}
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'isac-gaussian-ui-exports-'));try{successful(G.run([path.join(dir,'export-ui-records.mjs'),'--out',out],{cwd:os.tmpdir()}));const manifestPath=path.join(out,'UI-EXPORT-MANIFEST.json'),manifest=JSON.parse(fs.readFileSync(manifestPath));a.deepEqual(manifest.cases.map(x=>x.name),names.exportUiCases);a.ok(manifest.cases.every(x=>x.status==='complete'&&x.mountedImportReplayBitwiseEqual===true));a.equal(manifest.sourceFilesUnchangedAfterModuleLoad,true);const expected=names.exportUiCases.flatMap(name=>['raw','history'].map(mode=>({case:name,mode,path:name+'-'+mode+'.json'})));a.deepEqual(manifest.files.map(({case:label,mode,path:file})=>({case:label,mode,path:file})),expected);for(const record of manifest.files){const data=fs.readFileSync(path.join(out,record.path));a.equal(data.length,record.bytes);a.equal(hash(data),record.sha256);}
 successful(G.run([path.join(dir,'replay-ui-records.mjs'),'--manifest',manifestPath],{cwd:os.tmpdir()}));const replay=JSON.parse(fs.readFileSync(path.join(out,'UI-REPLAY-REPORT.json')));a.deepEqual(replay.files.map(x=>x.path),expected.map(x=>x.path));a.ok(replay.files.every(x=>x.freshExecution===true&&(x.mode==='raw'?x.historyBitwiseEqual===null:x.historyBitwiseEqual===true)));a.equal(replay.manifestSha256,hash(fs.readFileSync(manifestPath)));
 }finally{fs.rmSync(out,{recursive:true,force:true});}
 t.diagnostic('Exact controller/mounted DOM test names plus actual UI raw/history downloads and fresh Node Worker replay; browser rendering/device/paint-time acceptance remains separate');
});
