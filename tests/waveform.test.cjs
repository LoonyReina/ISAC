'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),C=require('../waveform-core.js'),D=require('../data/waveform-states.json');
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('27 canonical states have exact dimensions, feasible resources and globally optimal objectives',()=>{
 assert.equal(D.states.length,27);assert.equal(new Set(D.states.map(s=>s.id)).size,27);
 for(const s of D.states){const H=D.channels[s.channel],S=D.symbols;assert.equal(H.length,2);assert.equal(H[0].length,4);assert.equal(S.length,2);assert.equal(S[0].length,8);
  const values={};for(const method of ['reference','optimal']){assert.equal(s[method].length,4);assert.equal(s[method][0].length,8);const v=C.evaluate(H,S,s.R,s[method],s.lowerBound);values[method]=v;close(v.energy,8);assert.ok(v.covarianceResidual<1e-12);assert.equal(v.pattern.length,181);assert.equal(v.angles[0],-90);assert.equal(v.angles.at(-1),90);close(v.mse*16,v.error);assert.ok(v.pattern.every(p=>p>=-1e-12&&p<=4+1e-12));assert.ok(v.Y.flat().every(z=>z.every(x=>Number.isFinite(x)&&Math.abs(x)<3)));assert.ok(s[method][0].every(z=>Math.abs(z[0])<1.5));}
  close(values.optimal.error,s.lowerBound);assert.ok(values.reference.error>=values.optimal.error-1e-10);values.reference.pattern.forEach((v,i)=>close(v,values.optimal.pattern[i]));
  if(s.beta===0)values.optimal.pattern.forEach(v=>close(v,1));
  // Independent formula from singular-value certificate using trace of H R Hᴴ.
  const HRH=C.product(C.product(H,s.R),C.adj(H));const trace=HRH.reduce((v,r,i)=>v+r[i][0],0);close(s.lowerBound,8*trace+C.norm2(S)-2*Math.sqrt(8)*s.singularValues.reduce((a,b)=>a+b,0));
 }
});
test('complex conjugation and matrix orientation are explicit',()=>{
 assert.deepEqual(C.product([[[0,1]]],[[[0,1]]]),[[[-1,0]]]);
 assert.deepEqual(C.adj([[[1,2],[3,-4]]]),[[[1,-2]],[[3,4]]]);
 for(const H of Object.values(D.channels))for(const row of H)close(C.norm2([row]),1);
});
test('reference is the prescribed fixed DFT orientation and stored R matches formula',()=>{
 // No Cholesky needed: compare cross-time Gram for beta=0, where F=I/2.
 for(const s of D.states){for(let i=0;i<4;i++)for(let j=0;j<4;j++){const p=Math.PI*(i-j)*Math.sin(s.angle*Math.PI/180);close(s.R[i][j][0],((i===j?1-s.beta:0)+s.beta*Math.cos(p))/4);close(s.R[i][j][1],s.beta*Math.sin(p)/4);}
 if(s.beta===0)for(let i=0;i<4;i++)for(let m=0;m<8;m++){close(s.reference[i][m][0],.5*Math.cos(2*Math.PI*i*m/8));close(s.reference[i][m][1],.5*Math.sin(2*Math.PI*i*m/8));}}
});
test('case is registered through all six depth levels and immutable finite data is used',()=>{
 const r=require('../site/registry.json');assert.ok(r.cases.find(c=>c.id==='case-waveform'));assert.ok(r.units.find(u=>u.id==='waveform-design'));for(const level of r.directions.find(d=>d.id==='waveforms').levels)assert.ok(level.items.some(i=>i.href.startsWith('waveform-design.html#')));
 const html=fs.readFileSync(path.join(root,'waveform-design.html'),'utf8');for(const id of ['intuition','model','experiment','solution','paper','limits','reproduce','wf-channel','wf-beta','wf-angle','wf-user','wf-pattern','wf-symbols','wf-time','wf-metrics','wf-status'])assert.ok(html.includes(`id="${id}"`));
 for(const script of ['waveform-core.js','waveform.js'])assert.ok(html.includes(`src="${script}"`));assert.ok(html.includes('aria-live="polite"'));assert.ok(html.includes('<noscript>'));assert.ok(html.includes('1711.05220v1'));
 const js=fs.readFileSync(path.join(root,'waveform.js'),'utf8');assert.ok(js.includes("fetch('data/waveform-states.json')"));assert.ok(!js.includes('Math.random'));
});
