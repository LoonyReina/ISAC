'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const G=require('./helpers/networked-sync-portable.cjs'),root=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=f=>fs.readFileSync(path.join(root,f)),e=JSON.parse(read(fs.existsSync(path.join(root,'assets/data/cellfree-maprt-evidence-map.json'))?'assets/data/cellfree-maprt-evidence-map.json':'data/cellfree-maprt-evidence-map.json'));
function ok(r){if(r.error)throw r.error;a.equal(r.status,0,r.stdout+'\n'+r.stderr);return r.stdout;}
function python(args,cwd){const env={...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1',MKL_NUM_THREADS:'1',PYTHONDONTWRITEBYTECODE:'1'};delete env.NODE_TEST_CONTEXT;return ok(cp.spawnSync('python3',args,{cwd,env,encoding:'utf8',timeout:230000,maxBuffer:24*1024*1024}));}
function copyFrozen(source,dest,records){G.assertInventory(source,records.map(x=>x.path));for(const f of records){const b=fs.readFileSync(path.join(source,f.path));a.equal(b.length,f.bytes);a.equal(sha(b),f.sha256);const p=path.join(dest,f.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b);}}
test('Cell-Free required portable runtime regenerates fresh MAPRT, scenario, CCP, records and independent-method comparisons',{timeout:240000},t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'isac-cellfree-numerics-')),runtime=path.join(dir,'portable-runtime'),ref=path.join(dir,'cellfree-maprt-reference'),source=path.join(root,'scripts/validation/cellfree-maprt/portable-runtime');
 try{
  const archive=e.archives.find(x=>x.name==='cellfree-maprt-validation-source-free.zip');copyFrozen(source,runtime,archive.members);
  copyFrozen(path.join(root,'scripts/validation/cellfree-maprt/cellfree-maprt-reference'),ref,e.portableReferenceFiles.map(({path,bytes,sha256})=>({path,bytes,sha256})));
  // Regenerate independent Python/SciPy results before comparing live JS CCP.
  python(['tests/power_oracle.py'],runtime);const powerFixture=JSON.parse(fs.readFileSync(path.join(runtime,'tests/power_oracle_cases.json')));a.equal(powerFixture.cases.length,4);
  ok(G.run(['tests/power.test.mjs'],{cwd:runtime}));const power=JSON.parse(fs.readFileSync(path.join(runtime,'tests/power_validation.json'))).summary;a.equal(power.passed,true);a.equal(power.continuous_problem_cases,4);a.equal(power.ccp_runs,24);a.ok(power.accepted_convex_subproblems>200);a.ok(power.maximum_source_vs_browser_sensing_sinr_difference<1e-7);a.ok(power.maximum_independent_certificate_recompute_difference<1e-9);
  ok(G.run(['tests/maprt.test.mjs'],{cwd:runtime}));python(['tests/maprt-python-validation.py'],runtime);const matrix=JSON.parse(fs.readFileSync(path.join(runtime,'tests/maprt-validation.json')));a.equal(matrix.cases,12);a.equal(matrix.scores,72);a.equal(matrix.passed,true);
  ok(G.run(['tests/scenario.test.mjs','scenario-fresh.json'],{cwd:runtime}));const scenario=JSON.parse(python(['tests/scenario-python-validation.py','scenario-fresh.json'],runtime));a.equal(scenario.scenarios,3);a.equal(scenario.passed,true);a.ok(scenario.maximum_relative_error<1e-9);
  for(const f of ['runtime.test.mjs','contracts.test.mjs','client.test.mjs','worker.test.mjs'])ok(G.run(['tests/'+f],{cwd:runtime}));const run=JSON.parse(fs.readFileSync(path.join(runtime,'tests/runtime-validation.json')));a.equal(run.passed,true);a.equal(run.allocations,4);a.equal(run.cells,8);a.equal(run.deterministicIdentical,true);a.equal(run.replay.accepted,true);
  t.diagnostic('Fresh Python/SciPy CCP references, JS numerical certificates, NumPy covariance MAPRT and scenario formulas, actual Node Worker controls; no actual browser acceptance');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Cell-Free exact lesson suites and production downloads run source-only with independent augmented least-squares oracle',{timeout:240000},t=>{
 const names=require('./helpers/cellfree-maprt-owned-suites.json'),source=path.join(root,'labs/cellfree-maprt/lesson/tests');G.assertInventory(source,names.lessonInventory);
 for(const [suite,labels] of Object.entries(names.lesson)){a.ok(labels.length>0);G.assertTap(G.run(['--test','--test-reporter=tap',path.join(source,suite)],{cwd:os.tmpdir()}),labels);}
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'isac-cellfree-exports-'));
 try{ok(G.run([path.join(source,'export-records.mjs'),out],{cwd:os.tmpdir()}));const expected=['AP-H0-cellfree-maprt-teaching-decomposition.json','AP-H1-cellfree-maprt-teaching-decomposition.json','SP-H0-cellfree-maprt-teaching-decomposition.json','SP-H1-cellfree-maprt-teaching-decomposition.json','cellfree-maprt-counts.csv','cellfree-maprt-current.json'];G.assertInventory(out,expected);const oracle=JSON.parse(python([path.join(source,'adapter-oracle.py'),out],os.tmpdir()));a.equal(oracle.accepted,true);a.equal(oracle.cases,4);a.ok(oracle.comparisons>=40);a.ok(oracle.max_normalized_or_absolute_error<1e-8);a.equal(oracle.actual_browser,false);}finally{fs.rmSync(out,{recursive:true,force:true});}
 t.diagnostic('Exact named TAP cases with no skip/todo/cancel; production UI exports and independent least-squares reconstruction; actual served browser remains separate');
});
