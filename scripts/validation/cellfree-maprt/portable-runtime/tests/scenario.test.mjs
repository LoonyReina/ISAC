import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {makeScenario,observationDesign,sensingMatrices} from '../scenario.mjs';
import {adj,mul,chol} from '../linalg.mjs';
import {encode,decode} from '../codec.mjs';

const close=(actual,expected,tol=2e-11)=>assert.ok(Math.abs(actual-expected)<=tol*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);
const quadratic=(a,p)=>p.reduce((s,v,i)=>s+v*a[i].reduce((z,w,j)=>z+w*p[j],0),0);
function realInner(a,b){return a.re.reduce((s,v,i)=>s+v*b.re[i]+a.im[i]*b.im[i],0);}
const configurations=[{seed:2026101301,channel_samples:32},{seed:0,channel_samples:33},{seed:0xffffffff,channel_samples:512}];
const records=[];
for(const options of configurations){
  const s=makeScenario({...options,includeSamples:true});
  assert.equal(s.w.rows,8);assert.equal(s.w.cols,3);assert.equal(s.rAlpha.rows,8);assert.equal(s.rH.rows,32);
  assert.equal(s.symbols.rows,10);assert.equal(s.symbols.cols,3);
  assert.notEqual(s.seeds.fit,s.seeds.holdout);assert.notEqual(s.seeds.design,s.seeds.holdout);assert.notEqual(s.seeds.fit,s.seeds.design);
  assert.notDeepEqual(s.fit.raw.estimates[0],s.holdout.raw.estimates[0]);
  assert.notDeepEqual(s.fit.raw.estimates[0],s.designEstimatedChannels);
  assert.notDeepEqual(s.fit.b,s.holdout.b);
  for(const fit of [s.fit,s.holdout]){
    for(let j=0;j<3;j++)close(fit.powerCoeff.reduce((v,row)=>v+row[j],0),1);
    assert.ok(fit.b.every(v=>v>0&&Number.isFinite(v)));
    assert.ok(fit.a.flat().every(v=>v>=0&&Number.isFinite(v)));
    for(let n=0;n<fit.samples;n++){
      const w=fit.raw.precoders[n],h=fit.raw.estimates[n];
      const gram=mul(adj(w),w);for(let j=0;j<3;j++)close(gram.re[j*3+j],1);
      const hw=mul(adj(h),w);
      for(let u=0;u<2;u++){close(hw.re[u*3],0);close(hw.im[u*3],0);}
    }
  }
  for(const c of [...s.channelCovariances,...s.estimateCovariances,...s.errorCovariances,s.rH])chol(c);
  for(let i=0;i<30;i++)close(s.symbols.re[i]**2+s.symbols.im[i]**2,1);
  const checks=[];
  for(const [rcsDbsm,clutterScale] of [[-20,0],[0,.25],[10,1],[3,2]]){
    const amplitudes=[.7,.4,.5],d=observationDesign(s,amplitudes,rcsDbsm,clutterScale),q=sensingMatrices(s,rcsDbsm,clutterScale);
    assert.equal(d.g.rows,40);assert.equal(d.g.cols,8);assert.equal(d.x.cols,clutterScale===0?0:32);
    assert.equal(d.rH.rows,d.x.cols);assert.equal(d.transmit.rows,10);assert.equal(d.transmit.cols,8);
    const directA=realInner(d.g,mul(d.g,d.rAlpha)),directB=realInner(d.x,mul(d.x,d.rH));
    close(quadratic(q.A,amplitudes)/directA,1);
    if(clutterScale)close(quadratic(q.B,amplitudes)/directB,1);else assert.deepEqual(q.B,[[0,0,0],[0,0,0],[0,0,0]]);
    const altered=observationDesign(s,amplitudes,rcsDbsm+10,clutterScale);
    close(realInner(altered.g,altered.g)/realInner(d.g,d.g),10);
    for(let i=0;i<3;i++)for(let j=0;j<3;j++){close(q.A[i][j],q.A[j][i]);close(q.B[i][j],q.B[j][i]);}
    close(q.noiseEnergy/(40*s.noise),1);
    checks.push({amplitudes,rcsDbsm,clutterScale,design:d,sensing:q});
  }
  // Raw samples are deliberately optional in normal browser runs.
  const again=makeScenario(options);assert.deepEqual(again.b,s.b);assert.deepEqual(again.holdout.b,s.holdout.b);assert.deepEqual(again.w,s.w);
  assert.equal(again.fit.raw,undefined);
  // JSON canonically folds -0 into 0, which leaves every physical quantity unchanged.
  assert.equal(encode(decode(encode(again))),encode(again));
  records.push({scenario:s,checks});
}
for(const channel_samples of [2,31,513,32.5,Infinity,NaN])assert.throws(()=>makeScenario({channel_samples}));
for(const seed of [-1,2**32,1.5,Infinity,NaN])assert.throws(()=>makeScenario({seed}));
const s=records[0].scenario;
for(const p of [[-1,0,0],[1,2],[1,NaN,1],[1,Infinity,1]])assert.throws(()=>observationDesign(s,p,0));
for(const scale of [-1,NaN,Infinity])assert.throws(()=>observationDesign(s,[1,1,1],0,scale));
for(const rcs of [NaN,Infinity,1e100])assert.throws(()=>observationDesign(s,[1,1,1],rcs));
assert.notDeepEqual(makeScenario({seed:1,channel_samples:32}).b,s.b);
if(process.argv[2])await writeFile(process.argv[2],encode({schema:'scenario-formula-validation-v1',records}));
console.log(JSON.stringify({passed:true,scenarioCount:configurations.length,fitAndHoldoutSamples:configurations.reduce((s,c)=>s+2*c.channel_samples,0),observationCases:12,recordPath:process.argv[2]??null}));
