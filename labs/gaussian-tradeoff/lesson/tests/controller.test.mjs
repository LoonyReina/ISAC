import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {actual,freshInput,freshQ,runtime,fileOf,gate,onProgress,transport} from './test-support.mjs';
import {audit,canonical,sha256,assertFrozen,frozenRuntimeHashes} from './record-audit.mjs';
const timing={timeout:30000};
function covarianceOf(x){const m=x.re.length,t=x.re[0].length,re=Array.from({length:m},()=>Array(m).fill(0)),im=Array.from({length:m},()=>Array(m).fill(0));for(let i=0;i<m;i++)for(let j=0;j<m;j++)for(let k=0;k<t;k++){re[i][j]+=(x.re[i][k]*x.re[j][k]+x.im[i][k]*x.im[j][k])/t;im[i][j]+=(x.im[i][k]*x.re[j][k]-x.re[i][k]*x.im[j][k])/t;}return {re,im};}
function nearMatrix(a,b,tol=1e-10){for(const part of ['re','im'])for(let i=0;i<a[part].length;i++)for(let j=0;j<a[part][i].length;j++)assert.ok(Math.abs(a[part][i][j]-b[part][i][j])<tol,`${part}[${i},${j}]`);}

test('lesson numerical runtime remains byte-identical to the seven reviewed source files',()=>{for(const [name,hash] of Object.entries(frozenRuntimeHashes))assert.equal(sha256(fs.readFileSync(path.join(runtime,name))),hash,name);});
test('actual Worker computes arbitrary continuous weights and fresh complex H/Q with immutable records',timing,async t=>{
 const h=await actual(t),input=freshInput({covariance:freshQ(),selectedIndex:6});
 const event=await h.c.run(input);assert.equal(event.type,'complete');const r=h.c.result;assert.equal(r.freshExecution,true);assert.equal(r.inputHash,sha256(canonical(input)));assertFrozen(r);
 assert.deepEqual(r.result.input,input);assert.equal(r.result.shapes.length,7);assert.deepEqual(r.result.shapes[6].covariance,input.covariance);assert.equal(r.result.shapes[6].certificateClassification,'user covariance, no optimizer claim');
 assert.equal(r.result.firstBlock.gaussian.X.re.length,2);assert.equal(r.result.firstBlock.gaussian.X.re[0].length,4);assert.ok(r.result.firstBlock.stiefel.covarianceDeviationFromQ<1e-10);assert.ok(r.result.firstBlock.gaussian.covarianceDeviationFromQ>1e-5);
 for(const law of ['gaussian','stiefel'])nearMatrix(covarianceOf(r.result.firstBlock[law].X),r.result.firstBlock[law].sampleCovariance);nearMatrix(covarianceOf(r.result.firstBlock.stiefel.X),r.input.covariance);
 assert.equal(h.sent.filter(m=>m.type==='run').length,1);const saved=canonical(r);
 input.H.re[0][0]=9;input.covariance.im[0][1]=9;assert.equal(canonical(h.c.result),saved);
 const raw=audit((await h.c.exportRecord('raw')).text),history=audit((await h.c.exportRecord('history')).text);assert.deepEqual(raw.input,r.input);assert.deepEqual(history.historical.result,r.result);assert.equal(canonical(h.c.result),saved);
});
test('held posterior inputs contain exactly X/Y/noise/prior and preserve selected sample identity',timing,async t=>{
 const h=await actual(t);await h.c.run(freshInput());const held=h.c.held,gaussianHash=await h.c.sampleHash('gaussian'),stiefelHash=await h.c.sampleHash('stiefel');assert.notEqual(gaussianHash,stiefelHash);
 for(const law of ['gaussian','stiefel']){const selected=held.firstBlock[law];await h.c.processHeld(law,.42,2.2);assert.equal(h.c.result.freshExecution,true);assert.equal(h.c.result.input.operation,'posterior');assert.deepEqual(h.c.result.input.X,selected.X);assert.deepEqual(h.c.result.input.Y,selected.Y);assert.deepEqual(Object.keys(h.c.result.input).sort(),['X','Y','operation','priorVariance','sensingNoise']);assert.equal(h.c.held,held);assert.equal(await h.c.sampleHash('gaussian'),gaussianHash);assert.equal(await h.c.sampleHash('stiefel'),stiefelHash);assert.equal('evaluationOnly' in h.c.result.input,false);assert.notDeepEqual(h.c.result.result.posterior.estimate,selected.posterior.estimate);}
 assert.deepEqual(h.sent.filter(m=>m.type==='run').map(m=>m.input.operation),['tradeoff','posterior','posterior']);
});
test('raw/history imports preserve provenance and require actual Worker fresh replay',timing,async t=>{
 const h=await actual(t);await h.c.run(freshInput());const original=h.c.result.result,raw=(await h.c.exportRecord('raw')).text,history=(await h.c.exportRecord('history')).text;
 for(const text of [raw,history]){const before=h.sent.length;await h.c.importFile(fileOf(text));assert.equal(h.c.state,'imported');assert.equal(h.c.result,null);assert.equal(h.sent.length,before,'import does not execute');assert.equal(h.c.historical.mode,audit(text).mode);if(h.c.historical.mode==='history')assert.equal(h.c.historical.historical.freshExecution,false);await h.c.replay();assert.equal(h.c.state,'complete');assert.equal(h.c.result.freshExecution,true);assert.deepEqual(h.c.result.result,original);}
});
test('invalid model and corrupt record preserve current result and in-flight accepted work',timing,async t=>{
 const h=await actual(t);await h.c.run(freshInput());const prior=h.c.result,raw=audit((await h.c.exportRecord('raw')).text);raw.input.H.re[0][0]+=.1;
 await assert.rejects(h.c.run(freshInput({blocks:1})));assert.equal(h.c.result,prior);assert.equal(h.c.state,'complete');
 await assert.rejects(h.c.importRecord(canonical(raw)),{code:'HASH_MISMATCH'});assert.equal(h.c.result,prior);
 const pending=h.c.run(freshInput({blocks:128,seed:913}));await h.when(c=>c.state==='running'&&c.progress?.stage==='waveforms');await assert.rejects(h.c.run(freshInput({blocks:0})));await assert.rejects(h.c.importRecord(canonical(raw)));assert.equal((await pending).type,'complete');assert.equal(h.c.result.input.seed,913);
});
test('accepted replacement supersedes active actual work and presents only newest input',timing,async t=>{
 const h=await actual(t);const first=h.c.run(freshInput({blocks:256,seed:101}));await h.when(c=>c.progress?.stage==='waveforms');const boundary=h.changes.length;const second=h.c.run(freshInput({blocks:2,seed:102}));assert.equal((await first).type,'superseded');assert.equal((await second).type,'complete');assert.equal(h.c.result.input.seed,102);assert.ok(h.changes.slice(boundary).filter(s=>s.result).every(s=>s.result.input.seed===102));
});
for(const action of ['cancel','stop','reset'])test(`actual computation ${action} clears current exports and restarts safely`,timing,async t=>{
 const h=await actual(t);const run=h.c.run(freshInput({blocks:256}));await h.when(c=>c.progress?.stage==='waveforms');await h.c[action]();await run;assert.equal(h.c.result,null);assert.equal(h.c.held,null);assert.equal(h.c.canExport,false);await h.c.restart();await h.c.run(freshInput({blocks:2}));assert.equal(h.c.state,'complete');
});
test('actual Worker death rejects work and explicit restart permits fresh output',timing,async t=>{
 const h=await actual(t);const pending=h.c.run(freshInput({blocks:256}));const rejection=assert.rejects(pending,/exited|Worker|worker/i);await h.when(c=>c.progress?.stage==='waveforms');await h.workers[0].terminate();await rejection;assert.equal(h.c.state,'dead');assert.equal(h.c.result,null);assert.equal(h.c.canExport,false);await h.c.restart();await h.c.run(freshInput({blocks:2}));assert.equal(h.c.result.freshExecution,true);
});
test('stale asynchronous file read is fenced by fresh run, newer import, and reset',timing,async t=>{
 const h=await actual(t);await h.c.run(freshInput());const text=(await h.c.exportRecord('raw')).text;
 for(const action of ['run','import','reset']){const delayed=gate(),old=h.c.importFile({size:Buffer.byteLength(text),text:()=>delayed.promise});if(action==='run')await h.c.run(freshInput({blocks:2,seed:111}));if(action==='import')await h.c.importFile(fileOf(text));if(action==='reset')await h.c.reset();const state=h.c.state,result=h.c.result,historical=h.c.historical;delayed.resolve(text);assert.equal((await old).type,'cancelled');assert.equal(h.c.state,state);assert.equal(h.c.result,result);assert.equal(h.c.historical,historical);}
});
test('suspension invalidates actual work until explicit restart',timing,async t=>{
 const h=await actual(t);const pending=h.c.run(freshInput({blocks:256}));await h.when(c=>c.progress?.stage==='waveforms');await h.c.suspend();await pending;assert.equal(h.c.state,'suspended');assert.equal(h.c.result,null);await assert.rejects(h.c.run(freshInput()),/暂停|重启/);await h.c.restart();await h.c.run(freshInput({blocks:2}));assert.equal(h.c.state,'complete');
});
test('finite Wishart and sphere cases run actual integrals with explicit model boundaries',timing,async t=>{
 const h=await actual(t);
 await h.c.run({operation:'wishart',m:4,t:2,q:.9,ns:2,sensingNoise:.7,priorVariance:1.6});const wishart=h.c.result.result.wishart;assert.ok(Number.isFinite(wishart.value));assert.equal(wishart.structuralZeroDirections,2);assert.ok(wishart.structuralZeroContribution>0);assert.ok(wishart.densityMassResidual<1e-5);assert.match(wishart.classification,/not rigorous/);
 await h.c.run({operation:'sphere',snr:3.14159,t:3});const sphere=h.c.result.result.sphere;assert.ok(sphere.rate>0&&sphere.rate<sphere.gaussianUpperComparison);assert.ok(Math.abs(sphere.outputRadialMass-1)<1e-7);assert.match(sphere.classification,/not a general MIMO/);assert.match(sphere.tailWarning,/does not bound/);
});
test('every positive covariance mode is retained: short T reports unrealizable Stiefel',timing,async t=>{
 const h=await actual(t),input=freshInput();input.model.t=1;input.kappas=[0,.37];input.selectedIndex=0;await h.c.run(input);const r=h.c.result.result;assert.equal(r.shapes[0].stiefel.status,'unrealizable');assert.equal(r.firstBlock.stiefel,undefined);assert.ok(r.firstBlock.gaussian);const previous=h.c.result;assert.throws(()=>h.c.processHeld('stiefel',1,1),/不可实现/);assert.equal(h.c.result,previous);
});

test('run snapshots caller input before awaiting delayed actual Worker factory/readiness',timing,async t=>{
 const {Controller}=await import('../controller.mjs'),tr=transport(),entered=gate(),release=gate();const c=new Controller({async createWorker(){entered.resolve();await release.promise;return tr.createWorker();}});t.after(async()=>{release.resolve();await c.dispose();await Promise.all(tr.workers.map(w=>w.terminate()));});
 const input=freshInput({blocks:2}),expected=structuredClone(input),pending=c.run(input);await entered.promise;input.seed=9999;input.H.re[0][0]=33;input.model.t=7;input.kappas[1]=.987;release.resolve();assert.equal((await pending).type,'complete');assert.deepEqual(c.result.input,expected);assert.equal(c.result.inputHash,sha256(canonical(expected)));assert.deepEqual(tr.sent.find(m=>m.type==='run').input,expected);
});
test('invalid initial input rejects before allocating an actual Worker',timing,async t=>{const h=await actual(t);await assert.rejects(h.c.run(freshInput({blocks:0})));assert.equal(h.workers.length,0);assert.equal(h.c.result,null);assert.equal(h.c.state,'idle');});
