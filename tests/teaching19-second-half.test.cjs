'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../features/teaching19/lessons.js');
const get=id=>globalThis.Guided19Data.lessons.find(l=>l.id===id);
const close=(a,b)=>assert(Math.abs(a-b)<1e-12,`${a} != ${b}`);
test('802.11ad phase example preserves CFO and alias conditions',()=>{close(Math.atan2(1,1)/(2*Math.PI*.001),125);close(.005*125/2,.3125);const s=get('80211ad').steps.find(s=>s.title==='距离读懂后，才看两段相位差');assert.match(s.body,/未知CFO/);assert.match(s.body,/纸笔例/);});
test('Gaussian two-mode KKT example is stationary and beats equal power',()=>{const k=32/45,s=(w,a)=>1/(w+1)**2+k*a/(1+a*w),objective=w=>1/(w+1)+1/(3-w)-k*Math.log(1+w);close(s(1.5,1),4/9);close(s(.5,0),4/9);close(s(1,1),109/180);assert(objective(1.5)<objective(1));assert.match(get('supplement-case-crb').steps.find(s=>s.title==='求根与KKT证书').body,/32\/45/);});
test('pilot follow-on comparison holds y and display inspection does not run core',()=>{const l=get('supplement-case-pilot'),s=l.steps.find(s=>s.title.includes('ell=3'));assert.equal(s.action.runSelector,'#pp-reprocess');assert.equal(s.action.controls[0].value,3);const r=l.steps.find(s=>s.title==='去掉已知错列旋转');assert.equal(r.action.runSelector,null);assert.deepEqual(r.action.controls.map(c=>c.value),[1,1]);assert.deepEqual([5,4,3].map(e=>96/(96-16*e)),[6,3,2]);assert.deepEqual([5,4,3].map(e=>12+16*e),[92,76,60]);});
test('clock phase alias arithmetic is explicitly separate from pairing',()=>{close((.9*Math.PI-.7*Math.PI)/2,.1*Math.PI);close((.9*Math.PI+1.3*Math.PI)/2,1.1*Math.PI);assert.match(get('supplement-case-clock').steps.find(s=>s.title==='双向关联并分离公共偏差').body,/禁止按真值补圈/);});
