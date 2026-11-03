'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),local=(legacy,source)=>path.join(root,fs.existsSync(path.join(root,legacy))?legacy:source);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('64 complex template bridge obeys exact projection energy and returned core first update',async()=>{
 const base=local('otfs-receiver/source-objective-v1/runtime','labs/otfs-receiver/source-objective-v1/runtime');
 const {projectionWitness,runCompletion}=await import(path.join(base,'source-objective.mjs'));
 const {simulate}=await import(path.join(base,'joint/simulation.mjs'));
 const x=JSON.parse(fs.readFileSync(path.join(base,'joint/waveform.json'))),scenes=JSON.parse(fs.readFileSync(path.join(base,'joint/scenes.json')));
 for(const scene of scenes){const input=simulate(x,scene,20,191018).receiver,core=runCompletion({...input,maxRounds:1}),first=core.history[0].steps[0],w=projectionWitness(input,first.id);close(w.score,first.score);close(w.h[0],first.h[0]);close(w.h[1],first.h[1]);close(w.before-w.after,w.score);assert.equal(w.cells.length,64);close(w.cells.reduce((a,c)=>a+c.r[0]**2+c.r[1]**2,0),w.after);}
});
test('BA starting lesson is nondegenerate; q zero has honest zero-update optimum',()=>{
 const C=require(local('capacity-distortion-core.js','labs/capacity-distortion/capacity-distortion-core.js'));
 const r=C.solve(C.binaryModel({q:.4}),{mu:.5});assert(r.iterations>1);assert(r.trace[1].p[1]>.5);close(r.trace[1].distortion,.4*r.trace[1].p[0]);const d=C.solve(C.binaryModel({q:0}),{mu:.5});assert.equal(d.iterations,0);close(d.rateBits,0);close(d.distortion,0);
});
test('first atomic update bridge matches original complex shrink and z equations',()=>{
 const C=require(local('atomic-receiver-core.js','labs/ofdm-reference/atomic-receiver-core.js')),L=require(local('atomic-receiver-model.js','labs/ofdm-reference/atomic-receiver-model.js')),g=L.generate();
 for(const fixedError of [false,true]){const solver=C.createSolver(g.input,{fixedError}),before=solver.snapshot();solver.step(1);const a=solver.snapshot(),beta=2*a.settings.rho;
 for(let i=0;i<16;i++){const sr=g.input.s.re[i],si=g.input.s.im[i],rr=g.input.r.re[i],ri=g.input.r.im[i],q=sr*sr+si*si,t=g.input.mu*(q+beta)/beta,sh=fixedError?0:Math.max(0,1-t/Math.hypot(rr,ri));close(a.e.re[i],rr*sh);close(a.e.im[i],ri*sh);const er=rr-a.e.re[i],ei=ri-a.e.im[i];close(a.z.re[i],(sr*er+si*ei)/(q+beta));close(a.z.im[i],(sr*ei-si*er)/(q+beta));}assert.equal(before.iterations,0);}
});
test('first-nine read steps expose native bridges and align prediction with changed variable',()=>{
 const b={};vm.runInNewContext(fs.readFileSync(path.join(root,'features/teaching19/lessons.js'),'utf8'),b);const ls=b.Guided19Data.lessons,bi=ls[2],ici=ls[3],cd=ls[5];assert.match(bi.predictionQuestion.prompt,/残余主径/);assert(bi.steps.find(s=>s.role==='read').viewSelectors.includes('#bi-phase'));for(const stage of ['cfar','unwrap'])assert(ici.steps.some(s=>s.role==='read'&&s.openReadDetails&&s.viewRevealSelector===`[data-stage="${stage}"]`));assert.equal(cd.firstRun.controls.find(c=>c.selector==='#cd-mu').value,.5);assert(cd.steps.some(s=>s.focusSelector==='#cd-step'));assert(ls[4].steps.find(s=>s.role==='read').viewSelectors.includes('#ar-history'));
});
