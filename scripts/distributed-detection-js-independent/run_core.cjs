#!/usr/bin/env node
'use strict';
/* Portable read-only execution harness. Independent expectations live in audit_js.py. */
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const corePath=path.resolve(process.argv[2]);
const C=require(corePath), input=JSON.parse(fs.readFileSync(0,'utf8'));
const sha=()=>crypto.createHash('sha256').update(fs.readFileSync(corePath)).digest('hex');
const before=sha(), model=(r,k)=>new C.Model(r,k);
const serial=x=>JSON.parse(JSON.stringify(x,(_k,v)=>typeof v==='number'&&!Number.isFinite(v)?String(v):v));
const output={core_file:path.basename(corePath),core_sha256:before,exports:Object.keys(C).sort()};
output.calibration=input.calibration.map(x=>C.calibratedDetector(model(x.rho,x.kappa),x.pfa));
output.tails=input.tails.map(x=>({logTail:C.logTail(x.t,x.u,x.v),tail:C.tail(x.t,x.u,x.v),cdf:C.lowerCdf(x.t,x.u,x.v),swapped:C.tail(x.t,x.v,x.u)}));
output.quadratics=input.quadratics.map(x=>{const m=model(x.rho,x.kappa);return {q:C.quadraticEigen(x.z,m),matrix:C.quadraticMatrix(x.z,m),logLr:C.logLikelihoodRatio(x.z,m),rotated:C.quadraticMatrix(x.rotated,m,{correlationPhase:x.phase}),common:C.quadraticEigen(x.common,m),changedDataOnly:C.quadraticEigen(x.rotated,m),energies:C.localEnergies(x.z),sum:C.energySum(x.z)};});
output.raw=input.raw.map(x=>{const m=model(x.rho,x.kappa);return {z:C.matchedPair(x.y,x.s,x.noise),llr:C.rawLogLikelihoodRatio(x.y,x.s,x.noise,m),residualZ:C.matchedPair(x.residualY,x.s,x.noise),residualLlr:C.rawLogLikelihoodRatio(x.residualY,x.s,x.noise,m),phaseLlr:C.rawLogLikelihoodRatio(x.y,x.phaseS,x.noise,m)};});
output.wilson=input.wilson.map(x=>C.wilsonInterval(x.successes,x.trials,x.z));
output.ledgers=input.ledgers.map(x=>C.resourceLedger(x.length,x.options));
const m=model(3,.75),cal=C.calibratedDetector(m,.05),r=Math.SQRT2;
output.counterexample=[[ [r,0],[r,0] ],[ [r,0],[-r,0] ]].map(z=>({q:C.quadraticEigen(z,m),e:C.localEnergies(z),llr:C.logLikelihoodRatio(z,m),joint:C.decideJoint(z,cal),energy:C.decideEnergySum(z,cal)}));
output.phaseIntegration=input.phaseIntegration.map(x=>({e:x,values:Array.from({length:4096},(_,i)=>C.logLikelihoodRatio([[Math.sqrt(x[0]),0],[Math.sqrt(x[1])*Math.cos(2*Math.PI*i/4096),Math.sqrt(x[1])*Math.sin(2*Math.PI*i/4096)]],m))}));
const guards=[];
function reject(name,fn){try{const value=fn();guards.push({name,passed:false,accepted:serial(value)});}catch(e){guards.push({name,passed:true,error_type:e.constructor.name});}}
function ensure(name,fn){try{guards.push({name,passed:!!fn()});}catch(e){guards.push({name,passed:false,error_type:e.constructor.name});}}
const z=[[1,0],[0,1]],s=[[1,0],[0,1]],y=[z,z];
const sparse=(n)=>new Array(n);
function inheritedArray(values){const a=new Array(values.length),proto=Object.create(Array.prototype);values.forEach((v,i)=>Object.defineProperty(proto,i,{value:v}));Object.setPrototypeOf(a,proto);return a;}
for(const rho of [-1,1e-12,Number.MIN_VALUE,10001,NaN,Infinity,-Infinity,true,'3',null])reject('rho_'+String(rho)+'_'+typeof rho,()=>model(rho,.75));
for(const k of [-1e-12,1.000001,NaN,Infinity,false,'0.75',null])reject('kappa_'+String(k)+'_'+typeof k,()=>model(3,k));
for(const p of [0,1,1e-13,1-1e-13,NaN,Infinity,true,'0.05',null])reject('pfa_'+String(p)+'_'+typeof p,()=>C.calibratedDetector(m,p));
const badPairs=[null,{},[],[z[0]],sparse(2),[sparse(2),z[1]],inheritedArray(z),[inheritedArray([1,0]),z[1]],[[1],z[1]],[[1,0,2],z[1]],[[NaN,0],z[1]],[[Infinity,0],z[1]],[[1e101,0],z[1]],[[true,0],z[1]],[['1',0],z[1]],Object.assign({length:2},{0:z[0],1:z[1]})];
badPairs.forEach((x,i)=>{reject('quadratic_pair_'+i,()=>C.quadraticEigen(x,m));reject('energy_pair_'+i,()=>C.energySum(x));reject('decision_pair_'+i,()=>C.decideJoint(x,cal));});
const badWaveforms=[null,[],sparse(2),inheritedArray(s),[[0,0]],[[1e-5,0]],[[1e5,0]],[[NaN,0]],[[Infinity,0]],[[1,0,3]],[[true,0]],[[1]],Array.from({length:4097},()=>[1,0])];
badWaveforms.forEach((x,i)=>reject('waveform_'+i,()=>C.waveformEnergy(x)));
for(const noise of [0,1e-9,1e9,NaN,Infinity,true,'1',null])reject('noise_'+String(noise)+'_'+typeof noise,()=>C.matchedOutput(z,s,noise));
for(const length of [0,4097,1.5,NaN,true,'16',null])reject('qpsk_length_'+String(length)+'_'+typeof length,()=>C.qpskWaveform(length));
for(const e of [0,1e-9,1e9,NaN,Infinity,true,'1',null])reject('qpsk_energy_'+String(e)+'_'+typeof e,()=>C.qpskWaveform(16,e));
for(const x of [sparse(2),inheritedArray(z),[[1,0]],[[Infinity,0],[0,1]],[[1e101,0],[0,1]]])reject('matched_observation_'+guards.length,()=>C.matchedOutput(x,s,1));
for(const x of [null,[],sparse(2),inheritedArray(y),[sparse(2),z]])reject('raw_observation_'+guards.length,()=>C.rawLogLikelihoodRatio(x,s,1,m));
for(const val of [NaN,Infinity,-1,true,'1',null])reject('tail_weight_'+String(val)+'_'+typeof val,()=>C.tail(1,val,1));
reject('tail_threshold_NaN',()=>C.tail(NaN,1,1));
reject('tail_zero_quantile',()=>C.tailQuantile(.05,0,0));
for(const val of [true,'1',null])reject('tail_threshold_'+String(val)+'_'+typeof val,()=>C.tail(val,1,1));
ensure('lower_cdf_positive_zero',()=>Object.is(C.lowerCdf(-1,1,1),0)&&Object.is(C.lowerCdf(0,1,1),0));
ensure('tail_atom_and_infinity',()=>C.tail(0,0,0)===0&&C.tail(-1,0,0)===1&&C.tail(0,1,0)===1&&C.tail(Infinity,1,1)===0&&C.tail(-Infinity,1,1)===1);
const cal0=C.calibratedDetector(model(0,.75),.05);
for(const tie of [undefined,-1,1,NaN,Infinity,true,'0.01',null])reject('zero_tie_'+String(tie)+'_'+typeof tie,()=>C.decideJoint(z,cal0,{tieUniform:tie}));
ensure('zero_tie_strict_boundary',()=>C.decideJoint([[9,0],[9,0]],cal0,{tieUniform:0})&&C.decideJoint(z,cal0,{tieUniform:.049999})&&!C.decideJoint([[0,0],[0,0]],cal0,{tieUniform:.05})&&!C.decideJoint(z,cal0,{tieUniform:.999999}));
for(const [key,vals] of Object.entries({blocks:[0,1.5,NaN,true,'10',Number.MAX_SAFE_INTEGER],bitsPerReal:[0,129,1.5,NaN,true,'32'],modelUpdates:[-1,.5,NaN,true,Number.MAX_SAFE_INTEGER],modelDownRealsPerUpdate:[-1,.5,NaN,true,Number.MAX_SAFE_INTEGER],templateMode:['invalid',null,true]}))for(const value of vals)reject('ledger_'+key+'_'+String(value)+'_'+typeof value,()=>C.resourceLedger(16,{blocks:10,modelUpdates:2,modelDownRealsPerUpdate:6,[key]:value}));
for(const length of [0,4097,1.5,true,NaN,'16'])reject('ledger_length_'+String(length)+'_'+typeof length,()=>C.resourceLedger(length));
// Inherited optional fields may be rejected or ignored, but must not be used.
for(const [name,fn,expected] of [
 ['inherited_ledger_options',()=>C.resourceLedger(16,Object.create({blocks:97,templateMode:'cached'})),()=>C.resourceLedger(16,{})],
 ['inherited_phase_options',()=>C.quadraticMatrix(z,m,Object.create({correlationPhase:Math.PI/2})),()=>C.quadraticMatrix(z,m,{})]
]){try{guards.push({name,passed:JSON.stringify(fn())===JSON.stringify(expected())});}catch(e){guards.push({name,passed:true,error_type:e.constructor.name});}}
// Detection must not inspect hidden simulation truth attached to observations.
const poisoned=z.map(a=>a.slice());for(const field of ['alpha','targetPresent','truth','target_present'])Object.defineProperty(poisoned,field,{get(){throw new Error('truth accessed');}});
ensure('poisoned_truth_unread',()=>C.quadraticEigen(poisoned,m)===C.quadraticEigen(z,m)&&C.logLikelihoodRatio(poisoned,m)===C.logLikelihoodRatio(z,m)&&C.decideJoint(poisoned,cal)===C.decideJoint(z,cal)&&C.decideEnergySum(poisoned,cal)===C.decideEnergySum(z,cal));
const rawPoison=y.map(v=>v.map(a=>a.slice()));for(const field of ['alpha','targetPresent','truth','target_present'])Object.defineProperty(rawPoison,field,{get(){throw new Error('truth accessed');}});
ensure('raw_poisoned_truth_unread',()=>C.rawLogLikelihoodRatio(rawPoison,s,1,m)===C.rawLogLikelihoodRatio(y,s,1,m));
ensure('detector_no_truth_parameter',()=>['quadraticEigen','logLikelihoodRatio','rawLogLikelihoodRatio','decideJoint','decideEnergySum'].every(name=>!/targetPresent|target_present|\balpha\b/.test(String(C[name]))));
// Branded model/calibration objects prevent malformed or inherited thresholds.
const forgedModel=Object.freeze(Object.assign(Object.create(C.Model.prototype),{rho:3,kappa:.75}));
for(const [i,value] of [null,{},Object.create(m),forgedModel,{...m},Object.freeze({...m})].entries()){
  reject('forged_model_quadratic_'+i,()=>C.quadraticEigen(z,value));
  reject('forged_model_calibration_'+i,()=>C.calibratedDetector(value,.05));
  reject('forged_model_raw_'+i,()=>C.rawLogLikelihoodRatio(y,s,1,value));
}
for(const [i,value] of [null,{},Object.create(cal),{...cal},Object.freeze({...cal})].entries()){
  reject('forged_calibration_joint_'+i,()=>C.decideJoint(z,value));
  reject('forged_calibration_energy_'+i,()=>C.decideEnergySum(z,value));
}
for(const [i,value] of [undefined,null,{},Object.create({targetPresent:true}),{targetPresent:1},{targetPresent:'true'},{targetPresent:true,alpha:[1,2]}].entries())reject('generator_truth_contract_'+i,()=>C.generateObservations(C.createRng(1),m,s,1,value));
for(const seed of [-1,4294967296,NaN,Infinity,true,'1',null])reject('rng_seed_'+String(seed)+'_'+typeof seed,()=>C.createRng(seed));
for(const [i,value] of [null,{normal:()=>NaN},{normal:()=>Infinity},{normal:()=>true},{normal:()=>undefined}].entries())reject('rng_normal_'+i,()=>C.complexStandardNormal(value));
ensure('branded_objects_frozen',()=>Object.isFrozen(m)&&Object.isFrozen(cal)&&Object.isFrozen(C));
let endpointMax=0,endpointCount=0;
for(const E of [1e-8,1e8])for(let L=1;L<=4096;L++){
  const wave=C.qpskWaveform(L,E),measured=C.waveformEnergy(wave),err=Math.abs(measured/E-1);
  endpointMax=Math.max(endpointMax,err);endpointCount++;
  if(!(measured>=1e-8&&measured<=1e8&&err<8e-16))throw new Error('QPSK endpoint domain failure');
}
output.waveformEndpoints={cases:endpointCount,maxRelativeEnergyError:endpointMax};
output.matchedScaleEndpoints=[];
for(const L of [1,2,3,7,11,16,4096])for(const E of [1e-8,1,1e8])for(const noise of [1e-8,1,1e8]){
  const wave=C.qpskWaveform(L,E);output.matchedScaleEndpoints.push({length:L,requestedEnergy:E,measuredEnergy:C.waveformEnergy(wave),noise,matched:C.matchedOutput(wave,wave,noise)});
}
output.guards=guards;
// Independent PRNG and Box-Muller/Cholesky generation, calling actual JS detectors.
let state=843287;function uniform(){state^=state<<13;state^=state>>>17;state^=state<<5;return ((state>>>0)+.5)/4294967296;}
function cn(){const a=Math.sqrt(-Math.log(uniform())),theta=2*Math.PI*uniform();return [a*Math.cos(theta),a*Math.sin(theta)];}
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],scale=(a,b)=>[a[0]*b,a[1]*b];
const N=input.trials||300000;output.monteCarlo={seed:843287,trialsPerHypothesis:N,rows:[]};
for(const target of [false,true]){let joint=0,energy=0;for(let i=0;i<N;i++){let obs=[cn(),cn()];if(target){const a=cn(),b=cn(),a2=add(scale(a,.75),scale(b,Math.sqrt(1-.75*.75)));obs=[add(obs[0],scale(a,Math.sqrt(3))),add(obs[1],scale(a2,Math.sqrt(3)))];}joint+=C.decideJoint(obs,cal);energy+=C.decideEnergySum(obs,cal);}output.monteCarlo.rows.push({hypothesis:target?'H1':'H0',jointCount:joint,energyCount:energy});}
// Actual raw generator checked against independent analytical moments.
output.rawGenerator={seed:453893,trialsPerHypothesis:20000,rows:[]};
const rng=C.createRng(453893),wave=C.qpskWaveform(4,2.7),nRaw=20000;
for(const target of [false,true]){let sum=[0,0,0,0],mom=[0,0,0,0],pseudo=[0,0,0,0,0,0],leaks=0;for(let i=0;i<nRaw;i++){const raw=C.generateObservations(rng,m,wave,.8,{targetPresent:target});if(['alpha','truth','targetPresent','target_present'].some(k=>Object.hasOwn(raw,k)))leaks++;const o=C.matchedPair(raw,wave,.8);sum[0]+=o[0][0];sum[1]+=o[0][1];sum[2]+=o[1][0];sum[3]+=o[1][1];mom[0]+=o[0][0]**2+o[0][1]**2;mom[1]+=o[1][0]**2+o[1][1]**2;mom[2]+=o[0][0]*o[1][0]+o[0][1]*o[1][1];mom[3]+=o[0][1]*o[1][0]-o[0][0]*o[1][1];pseudo[0]+=o[0][0]**2-o[0][1]**2;pseudo[1]+=2*o[0][0]*o[0][1];pseudo[2]+=o[1][0]**2-o[1][1]**2;pseudo[3]+=2*o[1][0]*o[1][1];pseudo[4]+=o[0][0]*o[1][0]-o[0][1]*o[1][1];pseudo[5]+=o[0][0]*o[1][1]+o[0][1]*o[1][0];}output.rawGenerator.rows.push({hypothesis:target?'H1':'H0',means:sum.map(v=>v/nRaw),covariance:[mom[0]/nRaw,mom[1]/nRaw,mom[2]/nRaw,mom[3]/nRaw],pseudoCovariance:pseudo.map(v=>v/nRaw),truthLeaks:leaks});}
output.unchanged=before===sha();
process.stdout.write(JSON.stringify(serial(output))+'\n');
