'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const G=require('./helpers/networked-sync-portable.cjs'),root=path.resolve(__dirname,'..');
function python(args){const env={...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1',MKL_NUM_THREADS:'1',PYTHONDONTWRITEBYTECODE:'1'};delete env.NODE_TEST_CONTEXT;const r=cp.spawnSync('python3',args,{env,encoding:'utf8',timeout:230000,maxBuffer:24*1024*1024});if(r.error)throw r.error;a.equal(r.status,0,r.stdout+'\n'+r.stderr);return r.stdout;}
test('multi-target all six exact owned suites preserve 32 named cases with no skipped coverage',{timeout:240000},()=>{
 const names=require('./helpers/nearfield-multitarget-owned-suites.json'),source=path.join(root,'labs/nearfield-multitarget/lesson/tests');G.assertInventory(source,names.lessonInventory);a.equal(Object.keys(names.lesson).length,6);a.equal(Object.values(names.lesson).flat().length,32);
 for(const [suite,labels]of Object.entries(names.lesson))G.assertTap(G.run(['--test','--test-reporter=tap',path.join(source,suite)],{cwd:os.tmpdir()}),labels);
});
test('multi-target actual production downloads receive independent NumPy record and teaching-grid checks',{timeout:240000},()=>{
 const source=path.join(root,'labs/nearfield-multitarget/lesson/tests'),out=fs.mkdtempSync(path.join(os.tmpdir(),'isac-multitarget-export-'));
 try{const r=G.run([path.join(source,'export-records.mjs'),out],{cwd:os.tmpdir()});if(r.error)throw r.error;a.equal(r.status,0,r.stdout+'\n'+r.stderr);G.assertInventory(out,['MANIFEST.json',...['fresh','source','partial','capped'].flatMap(x=>[x+'.json',x+'-teaching.json'])]);for(const name of ['fresh','source','partial','capped']){python([path.join(source,'record-oracle.py'),path.join(out,name+'.json')]);python([path.join(source,'adapter-oracle.py'),path.join(out,name+'.json'),path.join(out,name+'-teaching.json')]);}}
 finally{fs.rmSync(out,{recursive:true,force:true});}
});
