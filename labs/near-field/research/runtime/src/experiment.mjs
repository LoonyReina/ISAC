import {clone,validateDesign,validateScene,validateReceiver,validateSolverOptions,SOURCE} from './contract.mjs';
import {createSolverClient,createReceiverClient} from './worker-client.mjs';
import {realizeAcceptedCovariance,observe,receiverRequest,auditRawChain} from './adapter.mjs';
import {evaluateTruth} from './physics.mjs';
import {exportJson,exportDiagnosticJson,importJson,flattenHistorical} from './replay.mjs';
export class Experiment{
 constructor(spec){
  validateDesign(spec.designInput);validateScene(spec.scene);validateReceiver(spec.receiver);validateSolverOptions(spec.solverOptions??{});
  this.spec=clone({...spec,solverOptions:spec.solverOptions??{}});this.revision=0;this.receiverRevision=0;this.solverOperation=null;this.receiverOperation=null;
  this.solution=null;this.realization=null;this.observation=null;this.receiverOutput=null;this.evaluation=null;this.rawNoise=null;this.importedRaw=null;this.importedObservationValid=false;this.historicalOutputs=null;this.rawAudit=null;
  this.trust={optimizer:'absent',receiver:'absent'};this.solverClientPromise=createSolverClient();this.receiverClientPromise=createReceiverClient();
 }
 cancel(reason='cancelled'){
  if(this.solverOperation)this.solverOperation.stopReason=reason;if(this.receiverOperation)this.receiverOperation.stopReason=reason;
  this.revision++;this.receiverRevision++;this.solverJob?.cancel();this.receiverJob?.cancel();if(this.trust.optimizer==='running')this.trust.optimizer='cancelled_unaccepted';
  this.receiverOutput=this.evaluation=null;this.trust.receiver='cancelled_unaccepted';
 }
 updateDesign(designInput,solverOptions=this.spec.solverOptions){
  validateDesign(designInput);validateSolverOptions(solverOptions);this.cancel('superseded');this.rawAudit=null;this.spec.designInput=clone(designInput);this.spec.solverOptions=clone(solverOptions);
  this.solution=this.realization=this.observation=this.receiverOutput=this.evaluation=this.importedRaw=null;this.importedObservationValid=false;this.trust={optimizer:'invalidated_design_change',receiver:'invalidated_design_change'};
 }
 updateScene(scene){
  validateScene(scene);this.cancel('superseded');this.rawAudit=null;if(scene.seed!==this.spec.scene.seed||scene.noiseVariance!==this.spec.scene.noiseVariance)this.rawNoise=null;
  this.spec.scene=clone(scene);this.observation=this.receiverOutput=this.evaluation=null;this.importedObservationValid=false;this.trust.receiver='invalidated_scene_change';
 }
 updateReceiver(receiver){
  validateReceiver(receiver);if(this.receiverOperation)this.receiverOperation.stopReason='superseded';this.receiverRevision++;this.receiverJob?.cancel();this.spec.receiver=clone(receiver);
  this.receiverOutput=this.evaluation=null;this.trust.receiver='invalidated_receiver_change';
 }
 async solveAndObserve(onProgress){
  this.rawAudit=null;if(this.solverOperation)this.solverOperation.stopReason='superseded';if(this.receiverOperation)this.receiverOperation.stopReason='superseded';
  const operation={stopReason:null};this.solverOperation=operation;const revision=++this.revision;this.receiverRevision++;this.solverJob?.cancel();this.receiverJob?.cancel();
  this.solution=this.realization=this.observation=this.receiverOutput=this.evaluation=this.importedRaw=null;this.importedObservationValid=false;this.trust={optimizer:'running',receiver:'absent'};
  try{
   const client=await this.solverClientPromise;if(revision!==this.revision)return {status:operation.stopReason??'superseded'};
   const job=client.request('solve',{input:clone(this.spec.designInput),options:clone(this.spec.solverOptions)},p=>onProgress?.({stage:'solver',...p}));this.solverJob=job;
   const solution=await job.promise;if(revision!==this.revision)return {status:operation.stopReason??'superseded'};this.solution=solution;
   if(solution.acceptance!=='accepted_numerical_candidate'){this.trust.optimizer='unaccepted';return {status:'solver_not_accepted',solution};}
   this.realization=realizeAcceptedCovariance(this.spec.designInput,solution);this.trust.optimizer='fresh_recomputed_and_finite_X_checked';this.regenerateObservation();
   return {status:'observation_ready',solution,realization:this.realization.report,observation:this.observation.report};
  }catch(error){if(revision===this.revision){this.trust.optimizer='worker_or_physical_error_unaccepted';this.realization=this.observation=null;}throw error;}
 }
 regenerateObservation(){
  this.rawAudit=null;const X=this.realization?.X??this.importedRaw?.X;if(!X)throw Error('Fresh accepted realization or complete imported raw X required');
  if(this.receiverOperation)this.receiverOperation.stopReason='superseded';this.receiverRevision++;this.receiverJob?.cancel();this.receiverOutput=this.evaluation=null;
  try{
   const observation=observe(X,this.spec.designInput,this.spec.scene,this.rawNoise);
   if(!this.realization){const raw={...this.importedRaw,Y:observation.Y,Z:{data:observation.Z,rows:65,columns:256}},audit=auditRawChain(this.spec.designInput,this.spec.scene,raw);if(!audit.passed)throw Error('Imported raw beam fails independent physical audit');this.importedRaw=raw;this.importedObservationValid=true;this.rawAudit=audit;}else this.importedRaw=null;
   this.observation=observation;this.rawNoise=observation.Z.slice();this.trust.receiver='invalidated_new_observation';return this.observation;
  }catch(error){this.observation=null;this.importedObservationValid=false;this.trust.receiver='observation_error_unaccepted';throw error;}
 }
 async receive(onProgress){
  const Y=this.observation?.Y??(this.importedObservationValid?this.importedRaw?.Y:null);if(!Y)throw Error('Observation required');
  if(this.receiverOperation)this.receiverOperation.stopReason='superseded';const operation={stopReason:null};this.receiverOperation=operation;const revision=++this.receiverRevision;this.receiverJob?.cancel();
  this.receiverOutput=this.evaluation=null;this.trust.receiver='running';
  try{
   const request=receiverRequest(Y,this.spec.designInput,this.spec.receiver),client=await this.receiverClientPromise;if(revision!==this.receiverRevision)return {status:operation.stopReason??'superseded'};
   const job=client.request('receive',{request},p=>onProgress?.({stage:'receiver',...p}));this.receiverJob=job;const output=await job.promise;
   if(revision!==this.receiverRevision)return {status:operation.stopReason??'superseded'};this.receiverOutput=output;this.evaluation=evaluateTruth(output,this.spec.scene);
   if(this.historicalOutputs){delete this.historicalOutputs.receiver;delete this.historicalOutputs.evaluation;}
   this.trust.receiver=output.status==='ok'?'recomputed_from_authoritative_raw_Y':`recomputed_receiver_${output.status}`;return output;
  }catch(error){if(revision===this.receiverRevision)this.trust.receiver='worker_error_unaccepted';throw error;}
 }
 async run(onProgress){
  const first=await this.solveAndObserve(onProgress);if(first.status!=='observation_ready')return first;const receiver=await this.receive(onProgress);
  return {status:receiver.status==='ok'?'complete_numerical_chain':receiver.status,solver:first.solution,realization:first.realization,observation:first.observation,receiver,evaluation:this.evaluation,trust:{...this.trust}};
 }
 auditRaw(){
  if(!this.importedRaw&&(!this.realization||!this.observation)){this.rawAudit={passed:false,status:'incomplete_raw_stages',missing:['X','Z','Y'],optimizerAcceptance:'not_established_by_raw_audit'};return this.rawAudit;}
  const b=this.bundle();this.rawAudit=auditRawChain(this.spec.designInput,this.spec.scene,b.raw);return this.rawAudit;
 }
 bundle(){
  let raw;if(this.importedRaw){if(!this.importedObservationValid)throw Error('Imported observation invalidated; regenerate Y first');raw=clone(this.importedRaw);}
  else{if(!this.realization||!this.observation)throw Error('Full raw chain unavailable');const r=this.realization;raw={X:r.X,Z:{rows:65,columns:256,data:this.observation.Z},Y:this.observation.Y,communicationBeams:r.Wc,sensingFactor:r.Ws,targetCovariance:r.targetR};}
  return {schemaVersion:1,source:SOURCE,kind:'nearfield-live-chain',spec:clone(this.spec),raw,outputs:{solver:this.solution,realization:this.realization?.report??null,observation:this.observation?.report??null,receiver:this.receiverOutput,evaluation:this.evaluation,historical:this.historicalOutputs,rawAudit:this.rawAudit,trust:{...this.trust}},provenance:{sourceTheory:'Source Eq20 covariance design, Eq21 recovery, Appendix A/Eq23-24 known-one-target MUSIC',sourceOmissions:['T256','gain magnitude/phase','fixed user channel realization','DFT finite-X realization','noise seed'],receiverClaim:'Numerical completion is not accuracy, signal detection, uniqueness or range identification at endfire',fixedSearchPrior:'[0,40] m squared, independent of design prior and truth',rawArrayAuthority:'Imported X/Z/Y override any seeds or historical displays; receive replays raw Y, fresh solve explicitly rebuilds downstream stages.'}};
 }
 export(){return exportJson(this.bundle());}
 diagnostic(){return {schemaVersion:1,source:SOURCE,kind:'nearfield-live-chain-diagnostic',spec:clone(this.spec),raw:null,stages:{optimizer:this.solution?.status??this.trust.optimizer,finiteX:'not_included',observation:'not_included',receiver:'not_included'},outputs:{solver:clone(this.solution),historicalSolver:clone(this.historicalOutputs?.solver??null),trust:{...this.trust}},provenance:{purpose:'Inputs and genuine solver diagnostics for explicit fresh retry. No finite X, Z or Y is included; this is not a full raw replay.'}};}
 exportDiagnostic(){return exportDiagnosticJson(this.diagnostic());}
 static import(text){
  const {bundle:b}=importJson(text),e=new Experiment(b.spec);
  if(b.kind==='nearfield-live-chain'){e.importedRaw=clone(b.raw);e.importedObservationValid=true;e.rawNoise=b.raw.Z.data.slice();e.historicalOutputs=flattenHistorical(b.outputs);e.trust={optimizer:'historical_unverified',receiver:'historical_unverified'};}
  else{e.historicalOutputs={solver:clone(b.outputs.solver??b.outputs.historicalSolver??null)};e.trust={optimizer:'historical_unverified',receiver:'absent_diagnostic_only'};}
  return e;
 }
 async close(){this.cancel();const clients=await Promise.allSettled([this.solverClientPromise,this.receiverClientPromise]);await Promise.all(clients.filter(v=>v.status==='fulfilled').map(v=>v.value.terminate()));}
}
