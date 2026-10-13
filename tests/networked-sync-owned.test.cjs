'use strict';
// Portable fresh gates; controlled DOM and browser-loader VM are not real-browser
// acceptance. Tests write reports only in independent temporary runtime copies.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const G=require('./helpers/networked-sync-portable.cjs'),names=require('./helpers/networked-sync-owned-suites.json'),root=path.resolve(__dirname,'..');
test('owned networked-sync exact22 kernel and41 codec/Node-Worker tests execute portably',{timeout:240000},t=>{
 const source=path.join(root,'labs/networked-sync/runtime');G.assertInventory(path.join(source,'tests'),Object.keys(names.runtime));const dir=fs.mkdtempSync(path.join(os.tmpdir(),'isac-sync-owned-'));
 try{const frozen=JSON.parse(fs.readFileSync(path.join(source,'SOURCE-FREEZE.json')));for(const f of [...frozen.runtime.map(x=>x.path),...Object.keys(names.runtime).map(x=>'tests/'+x)]){const out=path.join(dir,f);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(path.join(source,f),out);}
 const kernel=G.run(['tests/test-kernel.cjs'],{cwd:dir});if(kernel.error)throw kernel.error;a.equal(kernel.status,0,kernel.stdout+'\n'+kernel.stderr);const report=JSON.parse(fs.readFileSync(path.join(dir,'reports/kernel-tests.json')));a.equal(report.passed,22);a.deepEqual(report.cases.map(x=>x.name),names.runtime['test-kernel.cjs']);a.ok(report.cases.every(x=>x.status==='PASS'));
 for(const suite of ['test-codec.cjs','test-worker.cjs'])G.assertTap(G.run(['--test','--test-reporter=tap','tests/'+suite],{cwd:dir}),names.runtime[suite]);
 t.diagnostic('22 exact kernel,20 codec,21 Worker tests pass; actual worker_threads and separately labelled UMD/browser-loader VM; not actual browser evidence');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('owned networked-sync exact49 mounted lesson tests execute with actual Workers',{timeout:240000},t=>{
 const dir=path.join(root,'labs/networked-sync/lesson/tests');G.assertInventory(dir,['dom-harness.cjs','export-ui-records.cjs','lesson.test.cjs']);a.ok(Array.isArray(names.lesson));a.equal(names.lesson.length,49);G.assertTap(G.run(['--test','--test-reporter=tap',path.join(dir,'lesson.test.cjs')],{cwd:os.tmpdir()}),names.lesson);t.diagnostic('49 exact lesson tests pass; real Node Workers, production UI in controlled DOM, no actual browser certification');
});
