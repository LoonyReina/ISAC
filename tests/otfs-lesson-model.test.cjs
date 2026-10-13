'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {webcrypto}=require('node:crypto');
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const moduleAt=filename=>import(pathToFileURL(path.resolve(__dirname,'../labs/otfs-receiver',filename)));
let model,sensing,communication,sensingProtocol,communicationProtocol,evidence;
test.before(async()=>{[model,sensing,communication,sensingProtocol,communicationProtocol,evidence]=await Promise.all(['lesson-model.mjs','sensing/kernel.mjs','communication/kernel.mjs','sensing/protocol.mjs','communication/protocol.mjs','lesson-evidence.mjs'].map(moduleAt));});
const clone=value=>structuredClone(value);
const typed=code=>error=>typeof error.code==='string'&&(!code||error.code===code);
async function run(task,receiver,id='adapter-test'){
  const protocol=task==='sensing'?sensingProtocol:communicationProtocol;
  return new Promise(resolve=>{const controller=protocol.createController(record=>{if(record.type==='terminal')resolve(record);},task==='sensing'?{yieldControl:()=>Promise.resolve()}:{yieldTask:()=>Promise.resolve()});controller.receive({type:'run',requestId:id,receiver});});
}
const smallSensing=()=>model.generateSensing({gridShape:[5,5]});
const close=(a,b,tol=1e-13)=>assert.ok(Math.abs(a-b)<=tol*(1+Math.abs(a)+Math.abs(b)),`${a} != ${b}`);

test('defaults are explicit bounded finite grid and zero-pruning communication',()=>{
  assert.deepEqual(model.DEFAULT_SENSING_CONFIG.frame,{N:4,M:8,T:6.4e-6,fc:5.89e9});
  assert.deepEqual(model.DEFAULT_SENSING_CONFIG.bounds,[[.05,3.8],[-1.4,1.4]]);
  assert.deepEqual(model.DEFAULT_SENSING_CONFIG.gridShape,[65,65]);
  assert.equal(model.DEFAULT_COMMUNICATION_CONFIG.settings.edgeTolerance,0);
  assert.equal(model.DEFAULT_COMMUNICATION_CONFIG.settings.damping,1);
  assert.equal(model.DEFAULT_COMMUNICATION_CONFIG.settings.maxIterations,30);
  assert.equal(model.DEFAULT_COMMUNICATION_CONFIG.settings.captureHistory,true);
  assert.deepEqual(model.DEFAULT_COMMUNICATION_CONFIG.frame,{N:3,M:4});
});
test('sensing two-seed generator is reproducible and proper-complex variance scaling preserves draw',()=>{
  const a=model.generateSensing(),b=model.generateSensing(),c=model.generateSensing({noiseVariance:.12});
  assert.deepEqual(a,b);assert.deepEqual(a.receiver.x,c.receiver.x);assert.deepEqual(a.evaluation.noiseless,c.evaluation.noiseless);
  a.evaluation.noiseSamples.forEach((w,i)=>{close(c.evaluation.noiseSamples[i].re,2*w.re);close(c.evaluation.noiseSamples[i].im,2*w.im);});
  const data=model.generateSensing({dataSeed:2026}),noise=model.generateSensing({noiseSeed:2026});
  assert.notDeepEqual(a.receiver.x,data.receiver.x);assert.deepEqual(a.evaluation.noiseSamples,data.evaluation.noiseSamples);
  assert.deepEqual(a.receiver.x,noise.receiver.x);assert.notDeepEqual(a.evaluation.noiseSamples,noise.evaluation.noiseSamples);
});
test('known x, actual nominal operator, effective complex gain and unmodified noise make radar y',async()=>{
  const {createTemplateOperator}=await moduleAt('sensing/operators.mjs');
  for(const generationModel of ['eq14_literal','exact_rect_finite']){
    const o=model.generateSensing({generationModel,fittedModel:generationModel});
    const s=createTemplateOperator(o.receiver.frame,o.receiver.x,generationModel).apply(o.evaluation.trueDelayBin,o.evaluation.trueDopplerBin),h=o.evaluation.trueGain;
    s.forEach((z,i)=>{const w=o.evaluation.noiseSamples[i];close(o.receiver.y[i].re,h.re*z.re-h.im*z.im+w.re);close(o.receiver.y[i].im,h.re*z.im+h.im*z.re+w.im);});
  }
});
test('generator records and immutable raw observations never add truth to receivers',()=>{
  const a=model.generateSensing(),b=model.generateCommunication();
  assert.deepEqual(Object.keys(a.receiver).sort(),['bounds','frame','gridShape','model','noiseVariance','settings','x','y'].sort());
  assert.deepEqual(Object.keys(b.receiver).sort(),['frame','model','csi','H','y','noiseVariance','constellation','settings'].sort());
  for(const value of [a,a.receiver,a.receiver.x,a.receiver.x[0],a.receiver.y,b.receiver.H,b.receiver.H[0],b.receiver.H[0][0]])assert.ok(Object.isFrozen(value));
  assert.throws(()=>{a.receiver.y[0].re=123;},TypeError);assert.throws(()=>{b.receiver.H[0].push({re:0,im:0});},TypeError);
  assert.throws(()=>sensing.validateReceiver({...a.receiver,truth:a.evaluation}),typed('invalid-input'));
  assert.throws(()=>communication.validateReceiver({...b.receiver,seed:1}),typed('invalid-input'));
});
test('settings and fitted model changes retain exact y/x or H and change digest',async()=>{
  const a=smallSensing(),original=await sensing.inputDigest(a.receiver);
  const r=model.sensingReceiver(a,{model:'exact_rect_finite',gridShape:[7,9],settings:{maxEvaluations:11}});
  assert.deepEqual(r.y,a.receiver.y);assert.deepEqual(r.x,a.receiver.x);assert.deepEqual(r.bounds,model.DEFAULT_SENSING_CONFIG.bounds);assert.notEqual(await sensing.inputDigest(r),original);
  const b=model.generateCommunication(),c=model.communicationReceiver(b,{maxIterations:5,damping:.5});
  assert.deepEqual(c.y,b.receiver.y);assert.deepEqual(c.H,b.receiver.H);assert.notEqual(await communication.inputDigest(c),await communication.inputDigest(b.receiver));
  const shifted=model.generateSensing({delayBin:3.3,dopplerBin:-1});assert.deepEqual(shifted.receiver.bounds,a.receiver.bounds);
});
test('sensing generationModel/fittedModel have no implicit mapping and mismatch withholds truth errors',()=>{
  const o=model.generateSensing({generationModel:'exact_rect_finite',fittedModel:'eq14_literal',gridShape:[5,5]});
  const result=sensing.solveSync(o.receiver,{now:()=>0}),evaluation=model.evaluateSensing(result,o.evaluation);
  assert.equal(evaluation.status,'unavailable-model-mismatch');assert.equal(evaluation.delayBinError,null);assert.equal(evaluation.dopplerBinError,null);assert.equal(evaluation.gainError,null);
  assert.equal(result.globalOnContinuum,false);assert.equal(result.localCRB.status,'unavailable');assert.equal(result.continuousRefinement.status,'unavailable');
  const matched=smallSensing(),fit=sensing.solveSync(matched.receiver,{now:()=>0});assert.equal(model.evaluateSensing(fit,matched.evaluation).status,'evaluated-matched-model');
  assert.equal(model.evaluateSensing(fit,null).status,'unavailable');
});
test('manual candidate inspection genuinely recomputes the requested off-grid candidate',()=>{
  const o=smallSensing(),c=model.inspectSensing(o.receiver,1.234,.567);
  const {frame,x,y,model:operator,noiseVariance}=o.receiver;
  assert.deepEqual(c,sensing.evaluateCandidate({frame,x,y,model:operator,noiseVariance},1.234,.567));assert.equal(c.template.length,32);assert.equal(c.fitted.length,32);assert.equal(c.residualVector.length,32);
});
test('communication simulator keeps original accepted stream, one/two paths, QPSK/16-QAM and same noise scaling',async()=>{
  const {generateObservation}=await moduleAt('communication/simulation.mjs');
  for(const order of [4,16])for(const count of [1,2]){
    const config={...clone(model.DEFAULT_COMMUNICATION_CONFIG),order,paths:clone(model.DEFAULT_COMMUNICATION_CONFIG.paths.slice(0,count))};
    const a=model.generateCommunication(config),original=generateObservation(config),b=model.generateCommunication({...config,noiseVariance:.4});
    assert.deepEqual(a.receiver,original.receiver);assert.deepEqual(a.evaluation,original.evaluation);assert.deepEqual(a.evaluation.truthIndices,b.evaluation.truthIndices);assert.deepEqual(a.receiver.H,b.receiver.H);
    a.evaluation.noiseSamples.forEach((w,i)=>{close(b.evaluation.noiseSamples[i].re,2*w.re);close(b.evaluation.noiseSamples[i].im,2*w.im);});
  }
});
test('typed validation rejects extra keys, NaN, bad seeds, limits and unsupported dimensions without clamp',()=>{
  for(const config of [{extra:1},{noiseVariance:NaN},{dataSeed:-1},{noiseSeed:0x100000000},{gridShape:[130,2]},{gain:{re:5,im:0}},{frame:{N:4,M:8,T:6.4e-6,fc:5.89e9,truth:1}}])assert.throws(()=>model.generateSensing(config),typed());
  for(const config of [{extra:1},{noiseVariance:Infinity},{seed:-1},{frame:{N:4,M:4}},{order:64}])assert.throws(()=>model.generateCommunication(config),typed());
  const sensingObservation=smallSensing(),communicationObservation=model.generateCommunication();
  assert.throws(()=>model.sensingReceiver(sensingObservation,{seed:3}),typed());assert.throws(()=>model.communicationReceiver(communicationObservation,{truth:3}),typed());
  assert.throws(()=>model.inspectSensing(sensingObservation.receiver,8,0),typed());
  // Fixed seed and extreme admitted variance can generate an out-of-range draw;
  // it must fail rather than resample or clamp a requested realization.
  assert.throws(()=>model.generateSensing({noiseVariance:10000}),typed('invalid-input'));
});
for(const task of ['sensing','communication']){
  test(`${task} one-run export preserves exact inputs, actual terminal/history and imports only inputs`,async()=>{
    const o=task==='sensing'?smallSensing():model.generateCommunication(),r=task==='sensing'?model.sensingReceiver(o,{settings:{maxEvaluations:7}}):model.communicationReceiver(o,{maxIterations:3});
    const terminal=await run(task,r),saved=await model.exportRecord(task,terminal,o),json=JSON.parse(saved.text);
    assert.equal(saved.utf8Bytes,Buffer.byteLength(saved.text,'utf8'));assert.deepEqual(json.receiver,r);assert.deepEqual(json.terminal,terminal);
    if(task==='communication'){assert.ok(json.terminal.methods.mpg.history.length>1);assert.equal(json.receiver.settings.edgeTolerance,0);}
    else {assert.equal(json.terminal.result.operatorEvaluations,7);assert.equal(json.terminal.result.status,'evaluation-cap');}
    const imported=await model.importInputs(saved.text);
    assert.equal(imported.status,'unverified-import');assert.equal(imported.task,task);assert.deepEqual(imported.receiver,r);assert.equal(imported.observation.evaluation,null);assert.ok(Object.isFrozen(imported.receiver));
    assert.equal(imported.terminal,undefined);assert.equal(imported.result,undefined);assert.equal(imported.methods,undefined);
    const rerun=await run(task,imported.receiver,'fresh-import');assert.equal(rerun.status,'completed');
  });
  test(`${task} corrupted output claims never become current, while nonfinite/extra keys/digest corruption reject`,async()=>{
    const o=task==='sensing'?smallSensing():model.generateCommunication(),terminal=await run(task,o.receiver),saved=await model.exportRecord(task,terminal,o),record=JSON.parse(saved.text);
    if(task==='sensing')record.terminal.result.selected.score+=1;
    else record.terminal.methods.mpg.graph.removedGramFrobenius+=1;
    const input=await model.importInputs(JSON.stringify(record));assert.deepEqual(input.receiver,o.receiver);assert.equal(input.result,undefined);assert.equal(input.methods,undefined);
    let corrupt=JSON.parse(saved.text);corrupt.receiver.y[0].re+=1;await assert.rejects(model.importInputs(JSON.stringify(corrupt)),typed('invalid-evidence'));
    corrupt=JSON.parse(saved.text);corrupt.terminal.injected=1;await assert.rejects(model.importInputs(JSON.stringify(corrupt)),typed('invalid-evidence'));
    corrupt=JSON.parse(saved.text);corrupt.terminal.inputDigest='sha256:'+('0'.repeat(64));await assert.rejects(model.importInputs(JSON.stringify(corrupt)),typed('invalid-evidence'));
    const bad=clone(terminal);if(task==='sensing')bad.result.selected.score=Infinity;else bad.methods.mpg.probabilities[0][0]=NaN;
    await assert.rejects(model.exportRecord(task,bad,o),typed('invalid-evidence'));
  });
}
test('symmetric UTF-8 16 MiB byte boundary is exact and independent of JavaScript string length',async()=>{
  const cap=evidence.MAX_RECORD_UTF8_BYTES;assert.equal(cap,16*1024*1024);
  const boundary={s:'a'.repeat(cap-8)};const exact=evidence.encodeBoundedRecord(boundary);assert.equal(exact.utf8Bytes,cap);assert.equal(evidence.decodeBoundedRecord(exact.text).utf8Bytes,cap);
  assert.throws(()=>evidence.encodeBoundedRecord({s:boundary.s+'a'}),typed('evidence-too-large'));
  assert.throws(()=>evidence.decodeBoundedRecord(exact.text+' '),typed('evidence-too-large'));
  const multibyte={s:'雷'.repeat(Math.floor(cap/3))};assert.ok(JSON.stringify(multibyte).length<cap);assert.throws(()=>evidence.encodeBoundedRecord(multibyte),typed('evidence-too-large'));
  for(const task of ['sensing','communication']){
    const o=task==='sensing'?smallSensing():model.generateCommunication(),terminal=await run(task,o.receiver);terminal.oversized='雷'.repeat(Math.floor(cap/3));
    await assert.rejects(model.exportRecord(task,terminal,o),typed('evidence-too-large'));
    await assert.rejects(model.importInputs(JSON.stringify(multibyte)),typed('evidence-too-large'));
  }
});
test('communication parser independently validates trace/history/graph dimensions and receiver knowledge',async()=>{
  const o=model.generateCommunication(),terminal=await run('communication',o.receiver),saved=await model.exportRecord('communication',terminal,o);
  const mutations=[r=>r.terminal.methods.mpg.history.push(r.terminal.methods.mpg.history[0]),r=>r.terminal.methods.mpg.graph.edges[0].i=99,r=>r.terminal.methods.mpg.history[0].incomingLogMessages[0].push(0),r=>r.observation.generator.extra=1,r=>r.receiver.frame.T=6.4e-6,r=>r.terminal.methods.lmmse.solveRelativeResidual=.1];
  for(const mutate of mutations){const r=JSON.parse(saved.text);mutate(r);await assert.rejects(model.importInputs(JSON.stringify(r)),typed('invalid-evidence'));}
});
test('malformed JSON, prototype keys, sparse input and wrong task stay typed',async()=>{
  await assert.rejects(model.importInputs('{'),typed('invalid-evidence'));await assert.rejects(model.importInputs('{"__proto__":{}}'),typed('invalid-evidence'));
  assert.throws(()=>evidence.encodeBoundedRecord([,]),typed('invalid-evidence'));
  await assert.rejects(model.exportRecord('unknown',{},{}),typed('invalid-evidence'));
});
for(const task of ['sensing','communication'])test(`${task} cancellation preserves partial numerical work but imports no partial output`,async()=>{
  const observation=task==='sensing'?smallSensing():model.generateCommunication();
  const r=task==='sensing'?model.sensingReceiver(observation,{settings:{chunkCandidates:2}}):model.communicationReceiver(observation,{maxIterations:3});
  const submitted={...observation,receiver:r};let controller;
  const terminal=await new Promise(resolve=>{
    controller=(task==='sensing'?sensingProtocol:communicationProtocol).createController(record=>{
      if(record.type==='progress'&&(record.phase==='grid'||record.phase==='mp-g'))controller.receive({type:'cancel',requestId:'partial-case'});
      if(record.type==='terminal')resolve(record);
    });controller.receive({type:'run',requestId:'partial-case',receiver:r});
  });
  assert.equal(terminal.status,'cancelled');
  const encoded=await model.exportRecord(task,terminal,submitted),record=JSON.parse(encoded.text),imported=await model.importInputs(encoded.text);
  if(task==='sensing'){assert.equal(record.terminal.result.operatorEvaluations,2);assert.equal(record.terminal.result.status,'cancelled');}
  else {assert.equal(record.terminal.partialResult,true);assert.equal(record.terminal.partial.mpg.iterations,1);assert.equal(record.terminal.partial.mpg.history.length,2);}
  assert.equal(imported.status,'unverified-import');assert.deepEqual(imported.receiver,r);assert.equal(imported.terminal,undefined);assert.equal(imported.observation.evaluation,null);
});
test('maximum 129² finite grid round-trips its complete actual candidate history',async()=>{
  const observation=model.generateSensing({gridShape:[129,129]});
  const terminal=await run('sensing',observation.receiver,'maximum-grid');assert.equal(terminal.status,'completed');assert.equal(terminal.result.status,'grid-exhausted');assert.equal(terminal.result.candidates.length,16641);
  const exported=await model.exportRecord('sensing',terminal,observation);assert.ok(exported.utf8Bytes<evidence.MAX_RECORD_UTF8_BYTES);
  const imported=await model.importInputs(exported.text);assert.deepEqual(imported.receiver,observation.receiver);
});
