// Author-side Node module-Worker coverage. This is not a browser, visual, or
// hard-latency certification. Every accepted current result below is computed
// during this test run; the fixture is used for source INPUTS only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Worker} from 'node:worker_threads';
import {ResearchController,fieldsFromSpec,applyFields,MAX_RECORD_BYTES} from '../controller.mjs';
import {defaultSpec} from '../defaults.mjs';
import {receiverRequest} from '../runtime/src/adapter.mjs';
import {LIMITS} from '../runtime/src/contract.mjs';

const fixture=JSON.parse(await readFile(new URL('../runtime/fixtures/source-input.json',import.meta.url),'utf8'));
const contract=JSON.parse(await readFile(new URL('../runtime/CONTRACT.json',import.meta.url),'utf8'));
const bytes=value=>Buffer.from(value.buffer,value.byteOffset,value.byteLength);
const sameBytes=(a,b,message)=>assert.deepEqual(bytes(a),bytes(b),message);
const copyBytes=value=>Buffer.from(bytes(value));
const edit=(controller,group,patch)=>controller.edit(group,{...fieldsFromSpec(controller.experiment.spec)[group],...patch},Object.keys(patch));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function finiteMatrix(matrix,rows,columns){assert.equal(matrix.rows,rows);assert.equal(matrix.columns,columns);assert(matrix.data instanceof Float64Array);assert.equal(matrix.data.length,rows*columns*2);assert(matrix.data.every(Number.isFinite));}
function noCurrentOutput(e){assert.equal(e.solution,null);assert.equal(e.realization,null);assert.equal(e.observation,null);assert.equal(e.receiverOutput,null);assert.equal(e.evaluation,null);}
function assertDiagnostic(record,status){assert.equal(record.kind,'nearfield-live-chain-diagnostic');assert.equal(record.raw,null);assert.equal(record.stages.optimizer,status);for(const stage of ['finiteX','observation','receiver'])assert.equal(record.stages[stage],'not_included');}

// Deliberately limited fake: makes otherwise nondeterministic late failures and
// completions controllable. Physics, payload, replay, and Worker replacement
// acceptance use the actual Experiment and actual Node Workers below.
class DeferredExperiment {
 constructor(spec){this.spec=structuredClone(spec);this.calls=[];this.closed=false;this.cancelReasons=[];this.solverClientPromise=Promise.resolve({closed:false});this.receiverClientPromise=Promise.resolve({closed:false});}
 cancel(reason){this.cancelReasons.push(reason);}
 solveAndObserve(progress){const pending=deferred();this.calls.push({...pending,progress});return pending.promise;}
 async close(){this.closed=true;}
}
async function waitForCall(experiment,count=1){for(let i=0;i<100&&experiment.calls.length<count;i++)await new Promise(resolve=>setTimeout(resolve,1));assert.equal(experiment.calls.length,count,'deferred action reached the Experiment');}

// This suite is sequential so the in-memory replay seed comes only from this
// run's accepted solve; there is no cached report or accepted-output fixture.
test('fresh controller chain, causal invalidation, payload, and bounded replay',{timeout:180000},async t=>{
 const c=new ResearchController();let sourceText,sourceRaw,sourceEstimate;
 try{
  await t.test('explicit defaults match frozen source inputs and reviewed independent scene',async()=>{
   const spec=defaultSpec(),again=defaultSpec();assert.deepEqual(spec.designInput,fixture);assert.deepEqual(spec.designInput.channels,fixture.channels);
   assert.deepEqual(spec.scene,{truthXY:[14.2,14],beta:[1e-5*Math.cos(.37),1e-5*Math.sin(.37)],noiseVariance:1e-9,seed:230201153});
   assert.deepEqual(spec.receiver,{domain:{xMin:0,xMax:40,yMin:0,yMax:40,stepM:.2},options:{refine:true,maxRefineIterations:80,maxEigenSweeps:60,maximaLimit:8,maxWallMs:30000,returnSpectrum:true}});
   assert.deepEqual(spec.solverOptions,{maxIterations:240,maxWallMs:30000});assert.notEqual(Math.hypot(...spec.scene.truthXY),spec.designInput.geometry.targetRangeM);
   spec.designInput.channels.re[0][0]=123;assert.deepEqual(again.designInput,fixture);noCurrentOutput(c.experiment);assert.equal(c.snapshot().busy,null);assert.equal(c.hasRaw,false);assert.equal(c.hasWaveform,false);
   const clients=await Promise.all([c.experiment.solverClientPromise,c.experiment.receiverClientPromise]);for(const client of clients)assert(client.worker instanceof Worker);
   await assert.rejects(c.action('receive'),/原始 Y/);await assert.rejects(c.action('regenerate'),/波束记录/);assert.throws(()=>c.export('full'),/unavailable/);
  });
  await t.test('fresh actual solver produces accepted finite 65×256 X and explicit noisy Y before receiver',async()=>{
   const result=await c.action('solve'),e=c.experiment;assert.equal(result.status,'observation_ready');assert.equal(e.solution.status,'central_path_finished');assert.equal(e.solution.acceptance,'accepted_numerical_candidate');assert.equal(e.solution.physicalGate.passed,true);
   assert.equal(e.trust.optimizer,'fresh_recomputed_and_finite_X_checked');assert(e.solution.trace.length>0);assert(c.snapshot().progress.some(p=>p.stage==='solver'&&p.phase==='optimization'));
   finiteMatrix(e.realization.X,65,256);finiteMatrix(e.observation.Y,65,256);assert.equal(e.realization.F.columns,18);assert.equal(e.realization.report.passed,true);assert.equal(e.realization.report.rankToleranceApplied,null);
   assert(e.realization.report.sampleToFactor<2e-11);assert(e.realization.report.fisherDirectToTrace<2e-10);assert.equal(e.receiverOutput,null);assert.equal(e.evaluation,null);assert.equal(e.observation.report.rawNoiseReused,false);
   assert(c.hasRaw);assert(c.snapshot().identity.design>0);assert(c.snapshot().identity.observation>c.snapshot().identity.design);assert.equal(c.snapshot().identity.receiver,0);
  });
  await t.test('actual production receiver request is copied, owned, truth-blind and sent to a real Worker',async()=>{
   const e=c.experiment,client=await e.receiverClientPromise,original=client.request.bind(client);let observed;
   client.request=(type,payload,progress)=>{observed={type,payload};return original(type,payload,progress);};
   const y=copyBytes(e.observation.Y.data);try{const result=await c.action('receive');assert.equal(result.status,'ok');sourceEstimate=structuredClone(result.estimate);}finally{client.request=original;}
   assert.equal(observed.type,'receive');assert.deepEqual(Object.keys(observed.payload),['request']);const request=observed.payload.request;
   assert.deepEqual(Object.keys(request),contract.receiverInputKeys);assert.deepEqual(Object.keys(request.array),['n','apertureM','wavelengthM']);assert.deepEqual(request.array,{n:65,apertureM:.5,wavelengthM:.0107});assert.equal(request.knownM,1);
   assert.deepEqual(request.domain,{xMin:0,xMax:40,yMin:0,yMax:40,stepM:.2});finiteMatrix(request.Y,65,256);assert.notEqual(request.Y.data,e.observation.Y.data);assert.equal(request.Y.data.byteOffset,0);assert.equal(request.Y.data.byteLength,request.Y.data.buffer.byteLength);assert(request.Y.data.buffer instanceof ArrayBuffer);assert.deepEqual(bytes(request.Y.data),y);
   assert.deepEqual(request,receiverRequest(e.observation.Y,e.spec.designInput,e.spec.receiver));for(const forbidden of [...contract.receiverForbiddenInputs,'channels','truthXY','seed','covariance'])assert(!Object.hasOwn(request,forbidden));
   assert.equal(e.trust.receiver,'recomputed_from_authoritative_raw_Y');assert(e.evaluation);assert(c.snapshot().identity.receiver>c.snapshot().identity.observation);
   sourceText=c.export('full');sourceRaw=structuredClone(e.bundle().raw);assert.equal(JSON.parse(sourceText).kind,'nearfield-live-chain');
  });
  await t.test('grid/refinement edits hold byte-identical Y/X/Z and invalidate only receiver/evaluation',async()=>{
   const e=c.experiment,solution=e.solution,realization=e.realization,observation=e.observation,identity=c.snapshot().identity;
   assert(edit(c,'receiver',{stepM:.4,refine:false}));assert.equal(e.solution,solution);assert.equal(e.realization,realization);assert.equal(e.observation,observation);assert.equal(e.receiverOutput,null);assert.equal(e.evaluation,null);
   assert.equal(c.snapshot().identity.design,identity.design);assert.equal(c.snapshot().identity.observation,identity.observation);assert.equal(c.snapshot().identity.receiver,0);
   assert.equal((await c.action('receive')).status,'ok');assert.equal(e.receiverOutput.domain.stepM,.4);for(const [a,b]of [[e.realization.X.data,sourceRaw.X.data],[e.observation.Y.data,sourceRaw.Y.data],[e.observation.Z,sourceRaw.Z.data]])sameBytes(a,b);
  });
  await t.test('truth/beta changes preserve X and raw Z, require explicit observation generation',async()=>{
   const e=c.experiment,x=e.realization.X,oldY=copyBytes(e.observation.Y.data),oldZ=e.rawNoise.slice();assert(edit(c,'scene',{truthX:16.1,truthY:15.8,betaPhase:.5}));
   assert.equal(e.realization.X,x);assert.equal(e.observation,null);assert.equal(e.receiverOutput,null);assert.equal(e.evaluation,null);sameBytes(e.rawNoise,oldZ);assert(!c.hasRaw);assert(c.hasWaveform);await assert.rejects(c.action('receive'),/原始 Y/);assert.throws(()=>c.export('full'),/unavailable/);
   await c.action('regenerate');assert.equal(e.realization.X,x);sameBytes(e.observation.Z,oldZ);assert.notDeepEqual(bytes(e.observation.Y.data),oldY);assert.equal(e.observation.report.rawNoiseReused,true);assert.equal(e.observation.report.seedUsedForGeneration,null);
  });
  await t.test('seed and variance edits regenerate Z while preserving accepted finite X',async()=>{
   const e=c.experiment,x=e.realization.X;for(const patch of [{seed:8921},{noiseVariance:2e-9}]){const previous=e.observation.Z.slice();assert(edit(c,'scene',patch));assert.equal(e.rawNoise,null);assert.equal(e.observation,null);await c.action('regenerate');assert.equal(e.realization.X,x);assert.notDeepEqual(e.observation.Z,previous);assert.equal(e.observation.report.rawNoiseReused,false);}
  });
  await t.test('raw channel override and new nominal design run fresh optimization and retain matched noise',async()=>{
   const e=c.experiment,x=copyBytes(e.realization.X.data),z=e.observation.Z.slice(),scene=structuredClone(e.spec.scene),channels=structuredClone(e.spec.designInput.channels);
   for(const part of ['re','im'])channels[part][0]=channels[part][0].map(value=>value*.92);
   assert(edit(c,'design',{range:22,rate0:6,rate1:6,rate2:6,rate3:6,channels:JSON.stringify(channels)}));noCurrentOutput(e);sameBytes(e.rawNoise,z);assert.deepEqual(e.spec.scene,scene);assert.deepEqual(e.spec.designInput.channels,channels);
   assert.equal(e.spec.designInput.caseId,'interactive_raw_channel_override');assert(!Object.hasOwn(e.spec.designInput.provenance,'userLocationsRangeAngle'));assert.match(e.spec.designInput.provenance.channelSource,/raw-channel override/);
   const result=await c.action('solve');assert.equal(result.status,'observation_ready');assert.deepEqual(e.solution.input.channels,channels);assert.equal(e.solution.input.geometry.targetRangeM,22);assert.notDeepEqual(bytes(e.realization.X.data),x);sameBytes(e.observation.Z,z);assert.equal(e.observation.report.rawNoiseReused,true);assert.equal(e.receiverOutput,null);
  });
  await t.test('full import trusts raw arrays but never historical acceptance; audit and receive have separate trust',async()=>{
   const forged=JSON.parse(sourceText);forged.outputs.solver.acceptance='accepted_numerical_candidate';forged.outputs.trust={optimizer:'fresh_recomputed_and_finite_X_checked',receiver:'recomputed_from_authoritative_raw_Y'};forged.spec.scene.seed=999;
   assert.deepEqual(c.importText(JSON.stringify(forged)),{status:'imported',complete:true});const e=c.experiment;assert.equal(e.solution,null);assert.equal(e.realization,null);assert.equal(e.receiverOutput,null);assert.equal(e.trust.optimizer,'historical_unverified');assert.equal(e.trust.receiver,'historical_unverified');
   for(const key of ['X','Y','Z'])sameBytes(e.importedRaw[key].data,sourceRaw[key].data);const audit=await c.action('audit');assert.equal(audit.passed,true);assert.equal(e.trust.optimizer,'historical_unverified');assert.equal(e.trust.receiver,'historical_unverified');assert.equal(audit.optimizerAcceptance,'historical_unverified_requires_fresh_solve');
   const output=await c.action('receive');assert.equal(output.status,'ok');assert.deepEqual(output.estimate,sourceEstimate);assert.equal(e.trust.optimizer,'historical_unverified');assert.equal(e.trust.receiver,'recomputed_from_authoritative_raw_Y');sameBytes(e.importedRaw.Y.data,sourceRaw.Y.data);
  });
  await t.test('finest admitted .08 grid really runs, and repeated full replays never nest or accumulate spectra',async()=>{
   assert.deepEqual(c.importText(sourceText),{status:'imported',complete:true});assert(edit(c,'receiver',{stepM:.08}));assert.equal((await c.action('receive')).status,'ok');
   let text=c.export('full');const sizes=[Buffer.byteLength(text)];for(let i=0;i<3;i++){
    assert.deepEqual(c.importText(text),{status:'imported',complete:true});const e=c.experiment;assert(!e.historicalOutputs?.historical);assert.equal(e.trust.optimizer,'historical_unverified');sameBytes(e.importedRaw.Y.data,sourceRaw.Y.data);
    assert.equal((await c.action('receive')).status,'ok');assert.equal(e.receiverOutput.domain.stepM,.08);assert.equal(e.receiverOutput.denominator.length,251001);assert(e.receiverOutput.denominator.every(Number.isFinite));assert(!Object.hasOwn(e.historicalOutputs,'receiver'));assert(!Object.hasOwn(e.historicalOutputs,'evaluation'));
    text=c.export('full');sizes.push(Buffer.byteLength(text));const record=JSON.parse(text);assert(!record.outputs.historical?.historical);assert(!record.outputs.historical?.receiver);assert(sizes.at(-1)<MAX_RECORD_BYTES);
   }
   assert(sizes.every(n=>n>6_000_000&&n<9_000_000),`real .08 spectrum export sizes: ${sizes}`);assert(Math.max(...sizes)-Math.min(...sizes)<10000);t.diagnostic(`Actual .08 full replay bytes: ${sizes.join(', ')}`);
  });
  await t.test('dead solver and receiver Workers are replaced, never reused',async()=>{
   const e=c.experiment,oldSolver=await e.solverClientPromise,oldReceiver=await e.receiverClientPromise;await oldSolver.terminate();await oldReceiver.terminate();assert(oldSolver.closed&&oldReceiver.closed);
   assert(edit(c,'receiver',{stepM:2,refine:false}));assert.equal((await c.action('receive')).status,'ok');const solver=await e.solverClientPromise,receiver=await e.receiverClientPromise;assert.notEqual(solver,oldSolver);assert.notEqual(receiver,oldReceiver);assert(solver.worker instanceof Worker);assert(receiver.worker instanceof Worker);assert(!solver.closed&&!receiver.closed);
   assert(edit(c,'design',{maxIterations:240}));assert.equal((await c.action('solve')).status,'observation_ready');assert.equal(e.trust.optimizer,'fresh_recomputed_and_finite_X_checked');
  });
  await t.test('export/import enforce the identical exact 16 MiB UTF-8 boundary, including multibyte text',async()=>{
   assert.equal(MAX_RECORD_BYTES,16*1024*1024);assert.equal(MAX_RECORD_BYTES,LIMITS.maxJsonBytes);assert.equal(MAX_RECORD_BYTES,contract.replay.maxUtf8Bytes);
   for(const kind of ['full','diagnostic']){
    assert.equal(c.importText(sourceText).status,'imported');const e=c.experiment;e.historicalOutputs={solver:{padding:''}};const base=Buffer.byteLength(c.export(kind)),remaining=MAX_RECORD_BYTES-base;
    e.historicalOutputs.solver.padding='界'.repeat(Math.floor(remaining/3))+'x'.repeat(remaining%3);const exact=c.export(kind);assert.equal(Buffer.byteLength(exact),MAX_RECORD_BYTES);assert(exact.length<MAX_RECORD_BYTES);
    e.historicalOutputs.solver.padding+='x';assert.throws(()=>c.export(kind),/16 MiB UTF-8 cap/);const previous=c.experiment;assert.equal(c.importText(exact+' ').status,'error');assert.equal(c.experiment,previous);assert.equal(c.importText(exact).status,'imported');assert.equal(c.experiment.trust.optimizer,'historical_unverified');
   }
  });
 }finally{await c.close();assert.equal(c.disposed,true);}
});

test('invalid grouped drafts remain invalid until every edited invalid field is repaired',{timeout:15000},async()=>{
 const c=new ResearchController();try{
  for(const [group,bad,other,repair]of [
   ['design',{range:''},{power:.09},{range:20}],
   ['scene',{truthX:'bad'},{seed:89},{truthX:14.2}],
   ['receiver',{stepM:.3},{maxEigenSweeps:59},{stepM:.2}],
  ]){
   const fields={...fieldsFromSpec(c.experiment.spec)[group],...bad};assert.equal(c.edit(group,fields,Object.keys(bad)),false);assert(c.snapshot().invalidGroups.includes(group));
   Object.assign(fields,other);assert.equal(c.edit(group,fields,Object.keys(other)),false);assert(c.snapshot().invalidGroups.includes(group));await assert.rejects(c.action('solve'),/修正/);assert.throws(()=>c.export('diagnostic'),/修正/);
   Object.assign(fields,repair);assert.equal(c.edit(group,fields,Object.keys(repair)),true);assert(!c.snapshot().invalidGroups.includes(group));
   for(const [key,value]of Object.entries(other))assert.equal(fieldsFromSpec(c.experiment.spec)[group][key],value);
  }
  const spec=defaultSpec(),gain=structuredClone(spec.designInput.resources.targetGain),channels=structuredClone(spec.designInput.channels);const next=applyFields(spec,'design',{...fieldsFromSpec(spec).design,power:.09},['power']);assert.deepEqual(next.designInput.resources.targetGain,gain);assert.deepEqual(next.designInput.channels,channels);
  assert.throws(()=>applyFields(spec,'design',{wat:3},['wat']),/Unknown/);assert.throws(()=>applyFields(spec,'receiver',{refine:'true'},['refine']),/Boolean/);assert.throws(()=>applyFields(spec,'design',{channels:'x'.repeat(65537)},['channels']),/65536/);
 }finally{await c.close();}
});

test('actual Worker infeasibility/caps produce diagnostics only and diagnostic imports need a fresh retry',{timeout:120000},async t=>{
 const c=new ResearchController();try{
  for(const [name,patch,status]of [
   ['high rates',{rate0:40,rate1:40,rate2:40,rate3:40},'infeasible_bound'],
   ['iteration cap',{rate0:5,rate1:5,rate2:5,rate3:5,maxIterations:1},'iteration_limit'],
   ['wall cap',{maxIterations:240,solverWallMs:1e-9},'time_limit'],
  ])await t.test(name,async()=>{
   assert(edit(c,'design',patch));assert.equal((await c.action('solve')).status,'solver_not_accepted');const e=c.experiment;assert.equal(e.solution.status,status);assert.notEqual(e.solution.acceptance,'accepted_numerical_candidate');assert.equal(e.realization,null);assert.equal(e.observation,null);assert.equal(e.receiverOutput,null);assert.throws(()=>c.export('full'),/unavailable/);
   const text=c.export('diagnostic'),record=JSON.parse(text);assertDiagnostic(record,status);assert.deepEqual(record.outputs.solver.trace,e.solution.trace);assert.equal(c.importText(text).complete,false);assert.equal(c.experiment.solution,null);assert.equal(c.experiment.importedRaw,null);assert.equal(c.experiment.trust.optimizer,'historical_unverified');assert.equal(c.experiment.trust.receiver,'absent_diagnostic_only');assert.equal((await c.action('audit')).status,'incomplete_raw_stages');await assert.rejects(c.action('receive'),/原始 Y/);
  });
  await t.test('forged diagnostic acceptance stays historical and a repaired fresh solve is required',async()=>{
   const record=JSON.parse(c.export('diagnostic'));record.outputs.solver={status:'central_path_finished',acceptance:'accepted_numerical_candidate'};record.outputs.trust={optimizer:'fresh_recomputed_and_finite_X_checked',receiver:'recomputed_from_authoritative_raw_Y'};assert.equal(c.importText(JSON.stringify(record)).status,'imported');assert.equal(c.experiment.solution,null);assert.equal(c.experiment.trust.optimizer,'historical_unverified');assert(!c.hasRaw);assert.throws(()=>c.export('full'),/unavailable/);
   assert(edit(c,'design',{maxIterations:240,solverWallMs:30000}));assert.equal((await c.action('solve')).status,'observation_ready');assert.equal(c.experiment.trust.optimizer,'fresh_recomputed_and_finite_X_checked');assert(c.hasRaw);
  });
 }finally{await c.close();}
});

test('actual Worker cancellation and replacement never accept stale current output',{timeout:90000},async t=>{
 const c=new ResearchController();try{
  await t.test('cancel on real optimization progress; explicit retry succeeds',async()=>{
   let cancelled=false;c.onChange=s=>{if(!cancelled&&s.progress.some(p=>p.stage==='solver'&&p.phase==='optimization')){cancelled=true;c.cancel();}};
   const result=await c.action('solve');assert(cancelled);assert.equal(result.status,'superseded');assert.equal(c.experiment.realization,null);assert.equal(c.experiment.observation,null);assert.equal(c.snapshot().busy,null);assert.equal(c.experiment.trust.optimizer,'cancelled_unaccepted');assert.throws(()=>c.export('full'),/unavailable/);
   c.onChange=()=>{};assert.equal((await c.action('solve')).status,'observation_ready');
  });
  await t.test('receiver-only edit during actual source solve preserves that solve and applies the new receive controls',async()=>{
   let edited=false;
   c.onChange=s=>{if(!edited&&s.busy==='solve'&&s.progress.some(p=>p.stage==='solver'&&p.phase==='optimization')){edited=true;assert(edit(c,'receiver',{stepM:.4,refine:false}));assert.equal(c.snapshot().busy,'solve');}};
   assert.equal((await c.action('solve')).status,'observation_ready');assert(edited);assert.equal(c.experiment.spec.receiver.domain.stepM,.4);assert.equal(c.experiment.spec.receiver.options.refine,false);assert.equal(c.experiment.trust.optimizer,'fresh_recomputed_and_finite_X_checked');assert(c.hasRaw);c.onChange=()=>{};
   const y=copyBytes(c.experiment.observation.Y.data),output=await c.action('receive');assert.equal(output.status,'ok');assert.equal(output.domain.stepM,.4);assert.equal(output.refinement.enabled,false);assert.deepEqual(bytes(c.experiment.observation.Y.data),y);
  });
  await t.test('new solve on real progress supersedes only old solve',async()=>{
   let replacement;c.onChange=s=>{if(!replacement&&s.busy==='solve'&&s.progress.some(p=>p.stage==='solver'&&p.phase==='optimization')){replacement=Promise.resolve();replacement=c.action('solve');}};
   const first=await c.action('solve');assert(replacement);assert.equal(first.status,'superseded');assert.equal((await replacement).status,'observation_ready');assert.equal(c.experiment.trust.optimizer,'fresh_recomputed_and_finite_X_checked');assert(c.hasRaw);c.onChange=()=>{};
  });
  await t.test('cancel actual receiver on grid progress keeps raw Y available for retry',async()=>{
   const e=c.experiment,y=copyBytes(e.observation.Y.data);let cancelled=false;
   c.onChange=s=>{if(!cancelled&&s.busy==='receive'&&s.progress.some(p=>p.stage==='receiver'&&p.phase==='grid')){cancelled=true;c.cancel();}};
   assert.equal((await c.action('receive')).status,'superseded');assert(cancelled);assert.equal(e.receiverOutput,null);assert.equal(e.evaluation,null);assert.deepEqual(bytes(e.observation.Y.data),y);assert(c.hasRaw);assert.equal(c.snapshot().identity.receiver,0);
   c.onChange=()=>{};assert.equal((await c.action('receive')).status,'ok');assert.deepEqual(bytes(e.observation.Y.data),y);
  });
  await t.test('import during actual receiver work retires old Worker without promoting historical output',async()=>{
   const text=c.export('full'),old=c.experiment,y=copyBytes(old.observation.Y.data);let imported=false;
   c.onChange=s=>{if(!imported&&s.busy==='receive'&&s.progress.some(p=>p.stage==='receiver'&&p.phase==='grid')){imported=true;assert.equal(c.importText(text).status,'imported');}};
   assert.equal((await c.action('receive')).status,'superseded');assert(imported);assert.notEqual(c.experiment,old);assert.equal(c.experiment.receiverOutput,null);assert.equal(c.experiment.trust.optimizer,'historical_unverified');assert.equal(c.experiment.trust.receiver,'historical_unverified');assert.deepEqual(bytes(c.experiment.importedRaw.Y.data),y);assert.equal(c.snapshot().error,null);
   await Promise.allSettled(c.closing);assert.equal((await old.receiverClientPromise).closed,true);c.onChange=()=>{};
  });
  await t.test('reset on real progress retires Worker and keeps fresh defaults empty',async()=>{
   let reset=false;const old=c.experiment;c.onChange=s=>{if(!reset&&s.busy==='solve'&&s.progress.some(p=>p.stage==='solver'&&p.phase==='optimization')){reset=true;c.reset();}};
   assert.equal((await c.action('solve')).status,'superseded');assert(reset);assert.notEqual(c.experiment,old);assert.deepEqual(c.experiment.spec,defaultSpec());noCurrentOutput(c.experiment);assert.deepEqual(c.snapshot().identity,{design:0,observation:0,receiver:0});await Promise.allSettled(c.closing);assert.equal((await old.solverClientPromise).closed,true);assert.equal((await old.receiverClientPromise).closed,true);c.onChange=()=>{};
  });
  await t.test('actual Worker death during solve leaves only diagnostic evidence and fresh retry replaces it',async()=>{
   const e=c.experiment,dead=await e.solverClientPromise;let death;
   c.onChange=s=>{if(!death&&s.busy==='solve'&&s.progress.some(p=>p.stage==='solver'&&p.phase==='optimization')){death=Promise.resolve();death=dead.terminate();}};
   assert.equal((await c.action('solve')).status,'error');assert(death);await death;assert.equal(e.realization,null);assert.equal(e.observation,null);assert.equal(e.trust.optimizer,'worker_or_physical_error_unaccepted');assert.match(c.snapshot().error,/terminated/);assert.throws(()=>c.export('full'),/unavailable/);
   const record=JSON.parse(c.export('diagnostic'));assertDiagnostic(record,'worker_or_physical_error_unaccepted');assert.equal(record.outputs.solver,null);c.onChange=()=>{};
   assert.equal((await c.action('solve')).status,'observation_ready');assert.notEqual(await e.solverClientPromise,dead);assert.equal(c.snapshot().error,null);assert.equal(e.trust.optimizer,'fresh_recomputed_and_finite_X_checked');
  });
 }finally{await c.close();}
});

test('late controlled action success/error cannot overwrite cancel, reset, replacement, or import',{timeout:15000},async t=>{
 for(const transition of ['cancel','reset','replacement','import'])for(const outcome of ['resolve','reject'])await t.test(`${transition}, late ${outcome}`,async()=>{
  const made=[],factory=spec=>{const e=new DeferredExperiment(spec);made.push(e);return e;};const c=new ResearchController({factory,importer:()=>factory(defaultSpec())});
  try{
   const original=c.experiment,pending=c.action('solve');await waitForCall(original);let replacement;
   if(transition==='cancel')c.cancel();if(transition==='reset')c.reset();if(transition==='import')assert.equal(c.importText('{}').status,'imported');
   if(transition==='replacement'){replacement=c.action('solve');await waitForCall(original,2);original.calls[1].resolve({status:'solver_not_accepted'});assert.equal((await replacement).status,'solver_not_accepted');}
   const before=c.snapshot(),progress=structuredClone(before.progress);original.calls[0].progress({stage:'solver',phase:'late_forged_progress'});
   if(outcome==='resolve')original.calls[0].resolve({status:'observation_ready'});else original.calls[0].reject(Error('late failure must stay stale'));
   assert.equal((await pending).status,'superseded');assert.equal(c.snapshot().status,before.status);assert.equal(c.snapshot().error,before.error);assert.equal(c.snapshot().busy,before.busy);assert.deepEqual(c.snapshot().identity,before.identity);assert.deepEqual(c.snapshot().progress,progress);assert.equal(c.experiment,before.experiment);
  }finally{await c.close();assert(made.every(e=>e.closed));}
 });
});

test('async file reads are size-checked first and late resolution/rejection cannot replace new state',{timeout:15000},async t=>{
 for(const transition of ['reset','import'])for(const outcome of ['resolve','reject'])await t.test(`${transition} while file.text is pending, late ${outcome}`,async()=>{
  const c=new ResearchController();try{
   const input=c.export('diagnostic'),pending=deferred();let reads=0;const result=c.importFile({size:input.length,text(){reads++;return pending.promise;}});assert.equal(reads,1);assert.equal(c.snapshot().busy,'import');
   if(transition==='reset')c.reset();else assert.equal(c.importText(input).status,'imported');const before=c.snapshot();
   if(outcome==='resolve')pending.resolve(input);else pending.reject(Error('late file failure'));assert.equal((await result).status,'superseded');assert.equal(c.experiment,before.experiment);assert.equal(c.snapshot().status,before.status);assert.equal(c.snapshot().error,before.error);assert.equal(c.snapshot().busy,null);
  }finally{await c.close();}
 });
 await t.test('oversize metadata prevents text read; text UTF-8 cap is rechecked after load',async()=>{
  const c=new ResearchController();try{
   let read=false;assert.equal((await c.importFile({size:MAX_RECORD_BYTES+1,text(){read=true;return '{}';}})).status,'error');assert.equal(read,false);
   const prior=c.experiment;assert.equal((await c.importFile({size:2,text:async()=>'界'.repeat(Math.ceil(MAX_RECORD_BYTES/3))})).status,'error');assert.equal(c.experiment,prior);assert.match(c.snapshot().error,/16 MiB/);
  }finally{await c.close();}
 });
});
