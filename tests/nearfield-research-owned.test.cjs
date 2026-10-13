'use strict';
// Runs the owned lesson tests inside the canonical isolated compatibility stage.
// Node Workers/VM and DOM doubles are not an actual browser certification.
const {test}=require('node:test'),a=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path'),fs=require('node:fs');
test('owned near-field controller, view, page, freeze, recovery and browser-branch author regressions',{timeout:240000},t=>{
 const dir=path.join(__dirname,'../labs/near-field/research/tests'),files=fs.readdirSync(dir).filter(f=>f.endsWith('.test.mjs')).sort();
 const required=['browser-branch.test.mjs','controller.test.mjs','freeze.test.mjs','page.test.mjs','recovery.test.mjs','view.test.mjs'];
 a.deepEqual(files,required,'all six independently accepted suites must execute; no omitted or silently unregistered test file');
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const result=cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...required.map(f=>path.join(dir,f))],{encoding:'utf8',timeout:230000,maxBuffer:16*1024*1024,env});if(result.error)throw result.error;a.equal(result.status,0,result.stdout+'\n'+result.stderr);
 const summary=name=>Number([...result.stdout.matchAll(new RegExp('^# '+name+' (\\d+)$','gm'))].at(-1)?.[1]);
 a.equal(summary('tests'),71,'reviewed owned test/subtest count');a.equal(summary('pass'),71);
 for(const key of ['fail','cancelled','skipped','todo'])a.equal(summary(key),0,'no lost owned coverage: '+key);
 a.match(result.stdout,/Node VM browser branch: UMD load order and browser-message wrappers solve\/receive; NOT browser validation/);
 t.diagnostic('Owned near-field child suite: 71/71 passed, no failures/cancellations/skips; exact six suites including actual Node Workers, recovery regression and Node VM browser-specific UMD/message branch');
});
