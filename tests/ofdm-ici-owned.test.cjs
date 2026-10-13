'use strict';
// Portable canonical gate: production Node Workers and controlled DOM are not
// actual-browser certification. No external workspace or Git object is needed.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
test('owned OFDM ICI lifecycle, mounted UI, actual Node Workers and portable page regressions',{timeout:240000},t=>{
 const dir=path.join(__dirname,'../labs/ofdm-ici/lesson/tests');
 function suites(relative=''){return fs.readdirSync(path.join(dir,relative),{withFileTypes:true}).flatMap(e=>e.isDirectory()?suites(path.join(relative,e.name)):e.name.endsWith('.test.cjs')?[path.join(relative,e.name)]:[]).sort();}
 const required=['ici-lesson.test.cjs'];a.deepEqual(suites(),required,'exact named owned test suite; no missing or silently unregistered test files');
 const env={...process.env};delete env.NODE_TEST_CONTEXT;const result=cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...required.map(f=>path.join(dir,f))],{encoding:'utf8',timeout:230000,maxBuffer:24*1024*1024,env});if(result.error)throw result.error;a.equal(result.status,0,result.stdout+'\n'+result.stderr);
 const summary=name=>Number([...result.stdout.matchAll(new RegExp('^# '+name+' (\\d+)$','gm'))].at(-1)?.[1]);a.equal(summary('tests'),39,'exact final owned test/subtest count');a.equal(summary('pass'),39);for(const key of ['fail','cancelled','skipped','todo'])a.equal(summary(key),0,'no lost owned coverage: '+key);
 a.match(result.stdout,/production mounted UI completes an actual Node Worker round-trip from imported X\/Y to rendered CFAR/);a.match(result.stdout,/actual Node Worker supersession and cancellation during CFO work never complete stale jobs/);
 t.diagnostic('Owned OFDM ICI child suite: 39/39 passed, no failures/cancellations/skips; actual Node Workers and production mount/CFAR render in controlled DOM, not an actual browser');
});
