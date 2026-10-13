'use strict';
// Source-local portable gates. Controlled DOM and actual Node Workers are not
// actual-browser certification. Frozen self-tests write only in a temporary copy.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os');
const root=path.resolve(__dirname,'..');
const cleanEnv=()=>{const env={...process.env};delete env.NODE_TEST_CONTEXT;return env;};
function tapSummary(stdout,name){return Number([...stdout.matchAll(new RegExp('^# '+name+' (\\d+)$','gm'))].at(-1)?.[1]);}
function requireTap(result,count){if(result.error)throw result.error;a.equal(result.status,0,result.stdout+'\n'+result.stderr);a.equal(tapSummary(result.stdout,'tests'),count,'exact owned test/subtest count');a.equal(tapSummary(result.stdout,'pass'),count);for(const name of ['fail','cancelled','skipped','todo'])a.equal(tapSummary(result.stdout,name),0,'no lost coverage: '+name);}
test('frozen80211ad runtime11 kernel and18 actual-Worker tests execute from an independent temporary copy',{timeout:240000},t=>{
 const source=path.join(root,'labs/80211ad/runtime'),manifest=JSON.parse(fs.readFileSync(path.join(source,'RUNTIME-MANIFEST.json'))),dir=fs.mkdtempSync(path.join(os.tmpdir(),'isac-ad-owned-runtime-'));
 try{for(const file of [...manifest.files.map(x=>x.path),'RUNTIME-MANIFEST.json']){const dest=path.join(dir,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(source,file),dest);}const run=(args)=>cp.spawnSync(process.execPath,args,{cwd:dir,encoding:'utf8',timeout:110000,maxBuffer:24*1024*1024,env:cleanEnv()});
 const kernel=run(['tests/test-kernel.cjs']);if(kernel.error)throw kernel.error;a.equal(kernel.status,0,kernel.stdout+'\n'+kernel.stderr);const report=JSON.parse(kernel.stdout);a.equal(report.passed,11);a.equal(report.failed,0);a.equal(report.tests.length,11);a.ok(report.tests.every(x=>x.passed===true));a.equal(new Set(report.tests.map(x=>x.name)).size,11);
 const worker=run(['--test','--test-reporter=tap','tests/test-worker.cjs']);requireTap(worker,18);a.match(worker.stdout,/browser/);a.match(worker.stdout,/cancel|supersed|release/);
 const verify=cp.spawnSync('python3',[path.join(dir,'tests/verify_manifest.py'),'--runtime'],{cwd:os.tmpdir(),encoding:'utf8'});a.equal(verify.status,0,verify.stdout+verify.stderr);a.equal(JSON.parse(verify.stdout).files,22);t.diagnostic('Frozen runtime:11 kernel checks and18 Worker tests, all pass; temporary reports only, actual Node Workers plus separately named classic-loader VM coverage');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
// Accepted lesson suite and exact mounted Worker labels are appended after the
// independent UI freeze is accepted; missing suites must fail, never skip.
test('owned80211ad production mount thirteen stages actual Workers and export/import lifecycle',{timeout:240000},t=>{
 const dir=path.join(root,'labs/80211ad/lesson/tests');
 function files(relative=''){return fs.readdirSync(path.join(dir,relative),{withFileTypes:true}).flatMap(e=>{const name=path.join(relative,e.name);if(e.isDirectory())return files(name);a.ok(e.isFile(),'owned suite inventory rejects nonregular files');return [name];}).sort();}
 const inventory=files();a.deepEqual(inventory,['dom-harness.cjs','export-ui-records.cjs','lesson.test.cjs'],'exact reviewed lesson test-directory inventory; every extension and nested extra fails');
 const required=['lesson.test.cjs'];a.deepEqual(inventory.filter(x=>/\.test\.(?:cjs|mjs|js)$/.test(x)),required,'exact named portable UI suite; missing or unregistered tests fail');
 const result=cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...required.map(x=>path.join(dir,x))],{encoding:'utf8',timeout:230000,maxBuffer:24*1024*1024,env:cleanEnv()});requireTap(result,30);
 for(const label of ['production UI mount and all thirteen views consume actual Worker arrays without new computations','UI downloads actual raw/history, reimports raw and separates imported observation from scene draft','mounted asynchronous import cannot overwrite reset or newer import','mounted failed current file read clears selection for same-file retry without clearing a newer selection','record notice expires after imported recompute and lifecycle reset'])a.ok(result.stdout.includes(label),'required mounted lifecycle assertion: '+label);
 t.diagnostic('Owned lesson30/30 pass, no lost coverage: actual Node worker_threads, production UI mounted in an in-memory DOM harness; not real-browser certification');
});
