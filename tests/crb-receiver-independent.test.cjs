'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.CRB_RECEIVER_ROOT||path.resolve(__dirname,'..');
const file=fs.existsSync(path.join(root,'crb-receiver/core.js'))?path.join(root,'crb-receiver/core.js'):path.join(root,'labs/crb-beamforming/receiver/core.js');
const C=require(file),F=require(fs.existsSync(path.join(__dirname,'fixtures/crb-receiver-oracle.json'))?'./fixtures/crb-receiver-oracle.json':'./crb-receiver-oracle.json');
const close=(a,b,label)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-10+1e-10*Math.abs(b),`${label}: ${a} vs independent ${b}`);
const copy=x=>JSON.parse(JSON.stringify(x));
function makeSource(name){const r=F.sources[name];return C.createSource({sourceRunId:r.run.id,input:r.input,result:r.result});}
function makeRequest(name,mode='fourSNRsweep',snrDb=10){return C.createRequest({source:makeSource(name),mode,snrDb,noiseSeed:948211});}
function run(request,environment={}){const job=C.createExperiment(request,environment);while(job.status==='running')job.step();assert.equal(job.status,'completed');return job;}

test('independent exact PRNG vectors including uint32 extremes',()=>{
  for(const v of F.seedVectors){const rng=C.createRng(v.seed);assert.deepEqual(v.uniform.map(()=>rng()),v.uniform);const g=C.createRng(v.seed);for(let j=0;j<6;j++){const z=C.complexNoise(g);close(z.real,v.noise.real[0][j],'noise real');close(z.imag,v.noise.imag[0][j],'noise imag');}}
});

test('independent raw-Y global peaks and complex nuisance estimates, including a strong far-away return',()=>{
  for(const f of F.estimatorFixtures){const r=C.profileML(f.args);assert.equal(r.status,'valid',f.name);assert.equal(r.bestIndex,f.expected.bestIndex,f.name);close(r.bestScore,f.expected.bestScore,f.name+' raw residual profile');close(r.alphaHat.real,f.expected.alphaHat.real,f.name+' alpha real');close(r.alphaHat.imag,f.expected.alphaHat.imag,f.name+' alpha imag');assert.equal(r.scores.length,18001);assert.throws(()=>C.profileML({...f.args,thetaDegrees:0}),/unsupported/);assert.throws(()=>C.profileML({...f.args,alpha:{real:1,imag:0}}),/unsupported/);}
});

test('independent full 128-trial answers, failure denominators, raw echoes, CRB and CIs for all three accepted array sizes',()=>{
  for(const name of Object.keys(F.sources)){
    const job=run(makeRequest(name)),record=job.fullRecord();
    for(const c of record.conditions){const f=F.references.find(x=>x.source===name&&x.snrDb===c.snrDb);assert.deepEqual(c.trials.map(t=>t.bestIndex),f.indices);assert.deepEqual(c.denominators,{planned:128,started:128,completed:128,valid:128,numericalFailures:0,unstarted:0,incomplete:0});assert.equal(c.largeErrorCount,f.summary.largeErrorCount);assert.equal(c.boundaryHits,f.summary.boundaryCount);close(c.rmseDegrees,f.summary.rmseDegrees,'all-trial RMSE');close(c.rootCrbDegrees,f.rootCrbDegrees,'raw 3x3 nuisance Fisher');c.ci95Degrees.forEach((x,i)=>close(x,f.bootstrap95[i],'independent squared-error bootstrap'));
      if(c.snrDb===10){for(const [i,x] of f.profileSamples)close(record.trial0.scores[i],x,'raw-space profile sample '+i);for(const key of ['real','imag'])for(let i=0;i<f.rawY0[key].length;i++)for(let j=0;j<30;j++)close(record.trial0.Y[key][i][j],f.rawY0[key][i][j],'actual raw Y');}
    }
    close(record.conditions[0].rootCrbDegrees/record.conditions[1].rootCrbDegrees,Math.sqrt(10),'10dB CRB scaling');
    assert.ok(record.conditions[0].largeErrorCount>100,'low-SNR outliers must not be excluded');
    assert.doesNotThrow(()=>C.validateRecord(record));assert.ok(Buffer.byteLength(job.exportText())<8*1024*1024);
  }
});

test('independent edge gates: no partial-grid answer, zero template failure and finite tie accounting',()=>{
  const f=F.estimatorFixtures[0].args,zero=m=>({real:m.real.map(r=>r.map(()=>0)),imag:m.imag.map(r=>r.map(()=>0))});
  const bad=C.profileML({...f,W:zero(f.W)});assert.equal(bad.status,'numerical_failure');assert.equal(bad.estimateDegrees,null);assert.equal(bad.maskedCount,18001);
  const tied=C.profileML({...f,Y:zero(f.Y)});assert.equal(tied.bestIndex,0);assert.equal(tied.tieCount,18001);assert.equal(tied.boundaryHit,true);
  const huge={Y:{real:[Array(30).fill(1e154),Array(30).fill(1e154)],imag:[Array(30).fill(0),Array(30).fill(0)]},W:{real:[[1,0]],imag:[[0,0]]},Nr:2,S:C.exactStreams()};
  const overflow=C.profileML(huge);assert.equal(overflow.status,'numerical_failure','finite endpoint scores must not hide overflow elsewhere');assert.equal(overflow.estimateDegrees,null);
  const s=C.createSearch({W:f.W,Nr:f.Nr,S:f.S});while(!s.buildBlock()){}const a=s.accumulator(C.compress({Y:f.Y,S:f.S}));s.scoreBlock([a],0);assert.throws(()=>s.finish(a));assert.throws(()=>s.scoreBlock([a],0));
});

test('independent cancellation denominator checks at every numerical stage',()=>{
  for(const stage of ['noise','templates','observations','scoring','bootstrap']){let ticks=0;const j=C.createExperiment(makeRequest('default-native.json','singleSNR',10),{now:()=>ticks++});let steps=0;while(j.status==='running'&&j.progress().stage!==stage&&steps++<20000)j.step();assert.equal(j.progress().stage,stage);j.cancel();const r=j.fullRecord(),c=r.conditions[0],d=c.denominators;assert.equal(r.summary.status,'cancelled');assert.equal(d.planned,128);assert.equal(d.completed,d.valid+d.numericalFailures);assert.equal(d.unstarted,128-d.started);assert.equal(d.incomplete,d.started-d.completed);assert.equal(c.rmseDegrees,null);assert.equal(c.ci95Degrees,null);assert.doesNotThrow(()=>j.exportText());}
});

test('independent strict evidence mutations reject invalid numerical and counting metadata',()=>{
  const r=run(makeRequest('default-native.json','singleSNR',10)).fullRecord();
  const mutations=[x=>x.conditions[0].trials.pop(),x=>x.request.noiseSeed++,x=>x.conditions[0].rootCrbDegrees/=Math.sqrt(30),x=>x.conditions[0].trials[0].bestScore=-1,x=>x.conditions[0].trials[0].alphaHat.real=null,x=>x.conditions[0].trials[0].tieCount=-1,x=>{x.conditions[0].trials[0].boundaryHit=true;x.conditions[0].boundaryHits++;x.summary.conditions[0].boundaryHits++;},x=>x.conditions[0].trials[0].notInSchema=true];
  mutations.forEach((fn,i)=>{const bad=copy(r);fn(bad);assert.throws(()=>C.validateRecord(bad),`mutation ${i}`);});
});

test('independent failure-record accounting keeps all128 and suppresses valid-only headline metrics',()=>{
  // A schema stress fixture, not a claim that this finite raw observation failed.
  const r=run(makeRequest('default-native.json','singleSNR',10)).fullRecord(),c=r.conditions[0],old=c.trials[5],savedRmse=c.rmseDegrees,savedCi=c.ci95Degrees;
  if(Math.abs(old.errorDegrees)>5)c.largeErrorCount--;if(old.boundaryHit)c.boundaryHits--;if(old.tieCount>1)c.tieTrials--;
  c.trials[5]={trial:5,status:'numerical_failure',estimateDegrees:null,errorDegrees:null,bestIndex:null,bestScore:null,alphaHat:null,tieCount:0,boundaryHit:false};
  c.denominators.valid=127;c.denominators.numericalFailures=1;c.rmseDegrees=null;c.ci95Degrees=null;
  const sync=()=>{const {trials,bound,...compact}=c;r.summary.conditions[0]=copy(compact);};sync();
  assert.equal(c.denominators.planned,128);assert.equal(c.trials.length,128);assert.doesNotThrow(()=>C.validateRecord(r));
  c.rmseDegrees=savedRmse;c.ci95Degrees=savedCi;sync();assert.throws(()=>C.validateRecord(r),/Partial\/invalid/);
});
