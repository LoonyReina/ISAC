'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const corePath=path.resolve(__dirname,'../../offgrid-range-core.js'),core=require(corePath),root=__dirname;
const report={corePath:'offgrid-range-core.js',sha256:crypto.createHash('sha256').update(fs.readFileSync(corePath)).digest('hex'),checks:[],trialsCompared:0,estimatesCompared:0,maxObservationDifference:0,maxScoreDifference:0,maxGainDifference:0,maxResidualDifference:0,notes:[]};
function test(name,fn){fn();report.checks.push(name);}
const close=(a,b,tol=1e-12)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
let actuals={};
for(const name of Object.keys(core.PRESETS)){
 const expected=JSON.parse(fs.readFileSync(path.join(root,'fixtures',name+'.json'))),actual=core.experiment(core.PRESETS[name]);actuals[name]=actual;
 test(name+' model/schema/RNG/settings/ledger match independent fixture',()=>{
  for(const k of ['schema','modelVersion','rngVersion','name'])assert.equal(actual[k],expected[k]);
  assert.deepEqual(actual.settings,expected.settings);assert.deepEqual(actual.resources,JSON.parse(JSON.stringify(expected.resources)));assert.equal(actual.trials.length,expected.trials.length);
 });
 test(name+' every observation and both estimates match independent Python fixture',()=>{
  for(let i=0;i<expected.trials.length;i++){
   const a=actual.trials[i],e=expected.trials[i];report.trialsCompared++;
   for(const k of ['trialIndex','seedUint32','domain','domainHashUint32','initialStateUint32'])assert.deepEqual(a[k],e[k]);
   for(let k=0;k<16;k++)for(let q=0;q<2;q++){const d=Math.abs(a.observation[k][q]-e.observation[k][q]);close(d,0);report.maxObservationDifference=Math.max(report.maxObservationDifference,d);}
   for(const key of ['coarse','fine']){
    for(const k of ['status','index','estimateM','signedErrorM','squaredErrorM2','grossError','tieCount'])assert.equal(a[key][k],e[key][k]);
    for(const k of ['maxScore','selectedScore']){const d=Math.abs(a[key][k]-e[key][k]);close(d,0);report.maxScoreDifference=Math.max(report.maxScoreDifference,d);}
    for(let q=0;q<2;q++){const d=Math.abs(a[key].fittedGain[q]-e[key].fittedGain[q]);close(d,0);report.maxGainDifference=Math.max(report.maxGainDifference,d);}
    const d=Math.abs(a[key].residualEnergy-e[key].residualEnergy);close(d,0);report.maxResidualDifference=Math.max(report.maxResidualDifference,d);report.estimatesCompared++;
   }
  }
 });
 test(name+' all summary values match Python aggregates',()=>{
  for(const key of ['coarse','fine','paired'])for(const [field,value]of Object.entries(expected.summary[key])){
   if(typeof value==='number')close(actual.summary[key][field],value);else assert.equal(actual.summary[key][field],value);
  }
 });
}
test('RNG uint32 states/uniforms exact; Gaussian port bounded',()=>{
 for(const f of JSON.parse(fs.readFileSync(path.join(root,'fixtures/rng-port-fixtures.json'))).fixtures){
  let r=new core.RandomStream(f.seedUint32,f.domain);assert.equal(r.domainHashUint32,f.domainHashUint32);assert.deepEqual(r.initialStateUint32,f.initialStateUint32);for(const e of f.uniform)assert.equal(r.uniform(),e);
  r=new core.RandomStream(f.seedUint32,f.domain);for(const e of f.normal)close(r.normal(),e,2e-14);
 }
});
test('receiver source has no generator truth/noise/RNG dependency',()=>{
 const source=core.receive.toString();assert.ok(!/truth|cleanObservation|generateObservation|RandomStream|snrDb|sigma2|seedUint32/.test(source));assert.equal(core.receive.length,2);
});
test('all-zero and midpoint ties deterministic',()=>{
 const known=core.receiverTemplates(core.X,core.F,core.FINE);let r=core.receive(Array.from({length:16},()=>[0,0]),known);assert.equal(r.estimateM,0);assert.equal(r.tieCount,241);
 const[y]=core.generateObservation(42.5,.7,null,2026,0);r=core.receive(y,core.receiverTemplates(core.X,core.F,core.COARSE));assert.equal(r.estimateM,40);assert.equal(r.tieCount,2);
});
test('global phase rotation keeps same selected range/profile score',()=>{
 const[y]=core.generateObservation(25.1,.7,-5,7,1),co=Math.cos(2.17),si=Math.sin(2.17),rot=y.map(([re,im])=>[re*co-im*si,re*si+im*co]),known=core.receiverTemplates(core.X,core.F,core.FINE),a=core.receive(y,known),b=core.receive(rot,known);
 assert.equal(a.estimateM,b.estimateM);a.scores.forEach((s,i)=>close(s,b.scores[i]));
});
test('fixed endpoints, off-grid units and first-null values',()=>{
 for(const truth of [0,120]){const[y]=core.generateObservation(truth,.7,null,2026,0);for(const grid of [core.COARSE,core.FINE])assert.equal(core.receive(y,core.receiverTemplates(core.X,core.F,grid)).estimateM,truth);}
 const response=core.idealResponse(43.7,[43.7-9.375,43.7,43.7+9.375]);assert.ok(response[0]<1e-25);close(response[1],1);assert.ok(response[2]<1e-25);
});
test('selected row does not alter trial data; selection replays same observed Y',()=>{
 const before=actuals['low-snr-counterexample'],selected=core.selectTrial(before,11);assert.deepEqual(selected.trials,before.trials);assert.equal(selected.settings.plotTrialIndex,11);assert.equal(selected.plot.trialIndex,11);assert.equal(before.settings.plotTrialIndex,1);assert.equal(selected.trials[11].fine.estimateM,6);
});
test('chunking preserves trial order/prefix and completed output',()=>{
 const o={...core.PRESETS['low-snr-counterexample'],trials:20},session=core.createSession(o);session.runChunk(7);const snap=session.snapshot();assert.equal(snap.trials.length,7);assert.equal(snap.summary.coarse.rmseM,null);session.runChunk(6);const completed=session.finish();assert.deepEqual(completed,core.experiment(o));assert.deepEqual(completed.trials,actuals['low-snr-counterexample'].trials.slice(0,20));
});
test('cancel preserves every attempted row and suppresses full-run aggregates',()=>{
 const session=core.createSession({...core.PRESETS['low-snr-counterexample'],trials:100});session.runChunk(7);const cancelled=session.cancel();assert.equal(cancelled.trials.length,7);assert.equal(cancelled.settings.trials,100);assert.equal(cancelled.summary.coarse.rmseM,null);assert.match(cancelled.summary.coarse.status,/cancelled/);assert.deepEqual(session.finish(),cancelled);session.runChunk(50);assert.equal(session.attempted,7);
});
test('finite invalid generator settings preserve failure rows',()=>{
 for(const options of [{truthRangeM:121},{truthPhaseRad:4},{snrDb:21},{seedUint32:-1}]){
  const a=core.experiment({...options,trials:2});assert.equal(a.trials.length,2);assert.equal(a.summary.coarse.failedTrials,2);assert.equal(a.summary.fine.rmseM,null);assert.ok(a.trials.every(r=>r.coarse.reason&&r.fine.reason));
 }
});
test('nonfinite input, zero energy and non-increasing candidates reject',()=>{
 for(const x of [NaN,Infinity])assert.throws(()=>core.experiment({truthRangeM:x}));
 assert.throws(()=>core.receiverTemplates(Array.from({length:16},()=>[0,0]),core.F,core.FINE));assert.throws(()=>core.receiverTemplates(core.X,core.F,[0,2,1]));
 const y=Array.from({length:16},()=>[0,0]);y[3]=[NaN,0];assert.throws(()=>core.receive(y,core.receiverTemplates(core.X,core.F,core.FINE)));
});
test('low-SNR large and boundary errors remain in RMSE',()=>{
 const a=actuals['low-snr-counterexample'];assert.equal(a.summary.coarse.maximumAbsErrorM,94.9);assert.equal(a.summary.fine.maximumAbsErrorM,94.9);assert.equal(a.summary.coarse.boundaryEstimateCount,17);assert.equal(a.summary.fine.boundaryEstimateCount,7);assert.ok(a.summary.fine.rmseM>a.summary.coarse.rmseM);assert.equal(a.summary.coarse.grossErrorCount,229);assert.equal(a.summary.fine.grossErrorCount,234);
});
report.notes.push('Python emits negative zero for some QPSK real parts; JavaScript JSON canonicalizes to zero. Ledger comparison treats those exact mathematical zeros identically.');report.checkCount=report.checks.length;report.scope='Read-only actual production-core audit against independent fixtures and edge cases; not UI/browser verification';
fs.writeFileSync(path.join(root,'actual-core-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
