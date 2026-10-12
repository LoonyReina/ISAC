'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const runtime=name=>fs.existsSync(path.join(root,name))?path.join(root,name):path.join(root,'labs/near-field',name);
const O=require(runtime('nearfield-gc-sage-observations.js'));
const G=require(runtime('nearfield-gc-sage-core.js'));
const fixtureRoot=path.join(root,'scripts/validation/nearfield-gc-sage/observations/fixtures');
const clone=v=>structuredClone(v);
const near=(a,b,t=1e-12)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const energy=y=>Array.from(y.real,(x,i)=>x*x+y.imag[i]*y.imag[i]).reduce((a,b)=>a+b,0);
const fixture=()=>JSON.parse(fs.readFileSync(path.join(fixtureRoot,'analytical-noiseless.json'),'utf8'));

test('strict finite bounded acquisition inputs; no scene editor/no carrier/noiseless shortcut',()=>{
 const bad=[null,[],{snrDb:Infinity},{snrDb:NaN},{snrDb:0},{aperture:.3},{bandwidthHz:2e9},{seed:-1},{seed:2**32},{seed:1.5},{seed:'12'},{seed:null},{scene:'absent'},{point:[1,1]},{carrier:30e9},{noiseVariance:0}];
 for(const b of bad)assert.throws(()=>O.generate(b));
 for(const seed of [0,1,0xffffffff])assert.equal(O.generate({seed}).config.seed,seed);
 assert.ok(Object.isFrozen(O.DEFAULT_CONFIG)&&Object.isFrozen(O.OFFERED.aperture));
});
test('all offered 160 configurations have finite full model and same independent declared priors',()=>{
 let count=0;
 for(const snrDb of O.OFFERED.snrDb)for(const aperture of O.OFFERED.aperture)for(const bandwidthHz of O.OFFERED.bandwidthHz)for(const scene of O.OFFERED.scene){
  const input={snrDb,aperture,bandwidthHz,scene,seed:12},before=clone(input),s=O.generate(input);assert.deepEqual(input,before);
  assert.equal(s.observations.rows,48);assert.equal(s.observations.cols,64);assert.equal(s.observations.real.length,3072);assert.ok(Array.from(s.observations.real).every(Number.isFinite));assert.ok(Array.from(s.observations.imag).every(Number.isFinite));
  assert.deepEqual(Object.keys(s.model).sort(),['tx','rx','frequencies','region','reference_pair','path_count','max_delay_ns'].sort());
  assert.deepEqual(s.model.tx,[[1,0]]);assert.deepEqual(s.model.rx[0],[2,0]);near(s.model.rx[47][0],2+aperture);assert.equal(s.model.reference_pair,23);assert.equal(s.model.path_count,2);assert.equal(s.model.max_delay_ns,55);
  assert.equal(s.model.frequencies[0],-bandwidthHz/2);assert.equal(s.model.frequencies[63],bandwidthHz/2);assert.ok(G.delayAliasPeriodNs(s.model.frequencies)>55);
  const init=G.initialize(s.observations,s.model,{delay_grid:32,initializer_sweeps:0});assert.equal(init.states.length,2);assert.equal(init.observation_sha256,G.observationHash(s.observations));
  assert.equal(s.truth.visibility[1].filter(Boolean).length,scene==='reference-blind'?9:aperture>1?32:48);count++;
 }
 assert.equal(count,160);
});
test('same seed/config is stable with no shared RNG state; changed seed changes only noise',()=>{
 const a=O.generate({seed:0}),junk=O.generate({seed:32}),b=O.generate({seed:0}),c=O.generate({seed:1});
 assert.deepEqual(a,b);assert.notDeepEqual(a.observations,c.observations);assert.deepEqual(a.truth.clean,c.truth.clean);assert.deepEqual(a.model,c.model);assert.notDeepEqual(a.observations,junk.observations);
 for(let i=0;i<a.observations.real.length;i++){near(a.observations.real[i],a.truth.clean.real[i]+a.truth.noise.real[i]);near(a.observations.imag[i],a.truth.clean.imag[i]+a.truth.noise.imag[i]);}
});
test('noise scaling is from unblocked clean mean and blockage never rescales or redraws it',()=>{
 const a=O.generate({snrDb:5}),b=O.generate({snrDb:15}),c=O.generate({snrDb:5,scene:'reference-blind'});
 near(a.truth.noise_variance/b.truth.noise_variance,10);assert.deepEqual(a.truth.noise,c.truth.noise);assert.equal(a.truth.noise_variance,c.truth.noise_variance);assert.notDeepEqual(a.truth.clean,c.truth.clean);
 for(let i=0;i<a.truth.noise.real.length;i++){near(a.truth.noise.real[i]/Math.sqrt(10),b.truth.noise.real[i]);near(a.truth.noise.imag[i]/Math.sqrt(10),b.truth.noise.imag[i]);}
 assert.ok(c.ledger.evaluation_only.realized_received_snr_db<a.ledger.evaluation_only.realized_received_snr_db);
});
test('normalized resource and nominal-versus-realized SNR ledger recomputes',()=>{
 const s=O.generate(),l=s.ledger,e=l.evaluation_only,n=3072;
 assert.equal(l.complex_observations,n);assert.equal(l.real_scalar_observations,6144);assert.equal(l.free_complex_path_gains,96);assert.equal(l.nominal_snr_db,15);
 near(e.clean_energy,energy(s.truth.clean));near(e.noise_energy,energy(s.truth.noise));near(e.observed_energy,energy(s.observations));near(e.expected_noise_energy,n*s.truth.noise_variance);
 near(s.truth.noise_variance,e.unblocked_clean_mean_power*10**(-1.5));near(e.unblocked_clean_energy,n*e.unblocked_clean_mean_power);
 near(e.realized_received_snr_db,10*Math.log10(e.clean_energy/e.noise_energy));near(e.expected_received_snr_db,10*Math.log10(e.clean_energy/e.expected_noise_energy));
 assert.notEqual(e.realized_received_snr_db,l.nominal_snr_db);assert.notEqual(e.observed_energy,e.clean_energy+e.noise_energy);assert.match(l.energy_scope,/no calibrated transmit joules/);
});
test('reference-blind keeps first fifth within finite support and leaves ref23 unobserved',()=>{
 const a=O.generate(),b=O.generate({scene:'reference-blind'});
 assert.deepEqual(a.model,b.model);assert.deepEqual(a.truth.delays,b.truth.delays);assert.deepEqual(a.truth.bounce_points,b.truth.bounce_points);
 assert.deepEqual(b.truth.visibility[1],Array.from({length:48},(_,i)=>i<9));assert.equal(b.truth.visibility[1][23],false);assert.deepEqual(b.ledger.evaluation_only.reference_truth_visibility,[true,false]);
});
test('left-anchored aperture honestly moves reference/viewpoint and changes finite support',()=>{
 const a=O.generate({aperture:.05}),b=O.generate();assert.deepEqual(a.model.rx[0],b.model.rx[0]);assert.notDeepEqual(a.model.rx[23],b.model.rx[23]);assert.notEqual(a.truth.delays[0][23],b.truth.delays[0][23]);
 assert.equal(a.truth.visibility[1].filter(Boolean).length,48);assert.equal(b.truth.visibility[1].filter(Boolean).length,32);assert.match(a.ledger.aperture_convention,/not a pure fixed-viewpoint/);
});
test('independent analytical noiseless fixture gives zero SSE and geometry error',()=>{
 const f=fixture(),before=clone(f),r=O.evaluate(f.result,f.observations,f.model,f.truth,{visibilityHeuristic:true});
 assert.equal(r.sse,0);assert.equal(r.clean_error_energy,0);assert.equal(r.mechanisms_correct,true);assert.deepEqual(r.association,[0,1]);
 assert.equal(r.paths[0].point_error_m,0);assert.equal(r.paths[1].interaction_rmse_m,0);assert.equal(r.paths[1].normal_error_deg,0);assert.equal(r.paths[1].plane_distance_error_m,0);near(r.paths[1].visible_fraction_truth,2/3);assert.deepEqual(f,before);
});
test('fixed scene noiseless samples match independent scalar geometry at selected coordinates',()=>{
 const s=O.generate(),qValues=[0,23,31,32,47],pValues=[0,17,31,63];
 for(const q of qValues){const x=s.model.rx[q][0],pointDelay=(1+Math.sqrt((x-1)**2+1))/299792458,refDelay=Math.sqrt((x-1)**2+16)/299792458,visible=(x<=3+2e-10);near(s.truth.delays[0][q],pointDelay);near(s.truth.delays[1][q],refDelay);assert.equal(s.truth.visibility[1][q],visible);
  for(const p of pValues){const f=s.model.frequencies[p],a=-2*Math.PI*f*pointDelay,b=.7-2*Math.PI*f*refDelay,i=q*64+p;near(s.truth.clean.real[i],Math.cos(a)+(visible?.8*Math.cos(b):0),2e-13);near(s.truth.clean.imag[i],Math.sin(a)+(visible?.8*Math.sin(b):0),2e-13);}
 }
});
test('observed SSE is not clean-channel NMSE; evaluation is input nonmutating',()=>{
 const f=fixture();f.observations.real[0]+=.5;const before=clone(f),r=O.evaluate(f.result,f.observations,f.model,f.truth);assert.equal(r.sse,.25);assert.equal(r.clean_error_energy,0);assert.ok(r.clean_nmse_db<-1000);assert.deepEqual(f,before);
});
test('partial associations are label-independent; swapped labels do not rescue wrong geometry',()=>{
 const f=fixture();f.result.states[0].kind='reflection';f.result.states[1].kind='scattering';f.result.states[1].normal=null;
 const r=O.evaluate(f.result,f.observations,f.model,f.truth);assert.deepEqual(r.association,[0,1]);assert.equal(r.mechanisms_correct,false);assert.equal(r.paths[1].normal_error_deg,null);
});
test('unmatched estimates and absent targets remain unmatched with null errors',()=>{
 const f=fixture();f.result.states[0].reference_delay+=2e-9;f.truth.visibility[1].fill(false);const r=O.evaluate(f.result,f.observations,f.model,f.truth);
 assert.deepEqual(r.association,[null,null]);assert.deepEqual(r.unmatched_estimate_indices,[0,1]);assert.equal(r.paths[0].geometry_null_reason,'No delay-associated estimate');assert.equal(r.paths[1].geometry_null_reason,'Truth path absent');assert.equal(r.paths[1].target_present,false);
 for(const p of r.paths)for(const key of ['reference_delay_error_ns','interaction_rmse_m','point_error_m','normal_error_deg','plane_distance_error_m'])assert.equal(p[key],null);
});
test('exact threshold tie follows dummy-node minimum assignment, beyond threshold unmatched',()=>{
 assert.deepEqual(O.associateDelays([0,5e-9],[.5e-9,5e-9],[true,true]).association,[null,1]);
 assert.deepEqual(O.associateDelays([0,5e-9],[.499e-9,5e-9],[true,true]).association,[0,1]);
 assert.deepEqual(O.associateDelays([0,5e-9],[.501e-9,5e-9],[true,true]).association,[null,1]);
 assert.deepEqual(O.associateDelays([0,0],[0,0],[true,true]).association,[0,1]);
});
test('null/unlocalized paths never fabricate geometry and baseline labels are inapplicable',()=>{
 const f=fixture();f.result.mode='scattering';f.result.states[0].kind='unlocalized';for(const key of ['point','normal','bounce_points'])f.result.states[0][key]=null;f.result.states[1].kind='scattering';f.result.states[1].normal=null;
 const r=O.evaluate(f.result,f.observations,f.model,f.truth);assert.equal(r.paths[0].matched,true);assert.equal(r.paths[0].point_error_m,null);assert.equal(r.paths[0].interaction_rmse_m,null);assert.equal(r.paths[1].normal_error_deg,null);assert.equal(r.paths[1].plane_distance_error_m,null);assert.equal(r.mechanisms_correct,null);assert.equal(r.mechanism_score_applicable,false);
});
test('visible-only interaction RMS ignores unobserved bounces without claiming endpoints',()=>{
 const f=fixture();f.result.states[1].bounce_points[2]=[999,999];const r=O.evaluate(f.result,f.observations,f.model,f.truth);assert.equal(r.paths[1].interaction_rmse_m,0);assert.ok(!('endpoint_error' in r.paths[1]));
});
test('normal sign symmetry and perpendicular line-offset remain meaningful',()=>{
 const f=fixture();f.result.states[1].normal=[0,-1];let r=O.evaluate(f.result,f.observations,f.model,f.truth);assert.equal(r.paths[1].normal_error_deg,0);assert.equal(r.paths[1].plane_distance_error_m,0);
 f.result.states[1].normal=[1,0];f.result.states[1].point=[2.5,2];r=O.evaluate(f.result,f.observations,f.model,f.truth);near(r.paths[1].normal_error_deg,90);assert.equal(r.paths[1].plane_distance_error_m,1);
});
test('optional gain-power visibility heuristic never feeds fitting and is null by default',()=>{
 const f=fixture(),a=O.evaluate(f.result,f.observations,f.model,f.truth),b=O.evaluate(f.result,f.observations,f.model,f.truth,{visibilityHeuristic:true});
 assert.equal(a.visibility_heuristic.enabled,false);assert.equal(a.paths[1].visibility_accuracy,null);assert.equal(a.paths[1].visible_fraction_estimate,null);assert.equal(b.paths[1].visibility_accuracy,1);assert.equal(b.visibility_heuristic.effective_power_threshold,1e-12);
 assert.match(b.visibility_heuristic.scope,/not a paper detector/);assert.deepEqual(a.paths[1].gain_power,b.paths[1].gain_power);
});
test('conditional design rank, singular null, and clean/observed zero-energy null handling',()=>{
 const f=fixture();f.result.states[1].delays=f.result.states[0].delays.slice();f.truth.clean.real.fill(0);f.truth.clean.imag.fill(0);f.observations.real.fill(0);f.observations.imag.fill(0);
 const r=O.evaluate(f.result,f.observations,f.model,f.truth);assert.equal(r.conditional_gain_design.minimum_channel_rank,1);assert.equal(r.conditional_gain_design.max_condition_number,null);assert.equal(r.relative_residual_db,null);assert.equal(r.clean_nmse_db,null);assert.doesNotThrow(()=>JSON.stringify(G.serializable(r)));
});
test('evaluator refuses malformed/nonfinite dimensions, gains, truth, and model alias changes',()=>{
 const mutators=[f=>f.observations.real[0]=NaN,f=>f.result.prediction.cols++,f=>f.result.states[0].gains.real.pop(),f=>f.truth.delays[0][0]=Infinity,f=>f.truth.visibility[0][0]=1,f=>f.result.states[1].normal=[0,2],f=>f.model.frequencies=f.model.frequencies.map(v=>v*100),f=>f.model.path_count=1];
 for(const change of mutators){const f=fixture();change(f);assert.throws(()=>O.evaluate(f.result,f.observations,f.model,f.truth));}
 const f=fixture();assert.throws(()=>O.evaluate(f.result,f.observations,f.model,f.truth,{visibilityHeuristic:'yes'}));
});
test('matched-delay power follows complex inner-product/P normalization and common dB scale',()=>{
 const f=fixture(),before=clone(f),r=O.matchedDelay(f.observations,f.model,{points:5,minDelayNs:0,maxDelayNs:40,floorDb:-30});
 for(let q=0;q<3;q++)for(let d=0;d<5;d++){let re=0,im=0;for(let p=0;p<5;p++){const a=2*Math.PI*f.model.frequencies[p]*r.delays_ns[d]*1e-9,i=q*5+p;re+=f.observations.real[i]*Math.cos(a)-f.observations.imag[i]*Math.sin(a);im+=f.observations.real[i]*Math.sin(a)+f.observations.imag[i]*Math.cos(a);}near(r.power.values[q*5+d],(re*re+im*im)/25);}
 assert.equal(Math.max(...r.relative_power_db.values),0);assert.deepEqual(Array.from(r.reference_power),Array.from(r.power.values.slice(5,10)));assert.deepEqual(f,before);assert.match(r.scope,/not a detected target list/);
});
test('matched-delay zero response uses disclosed floor; invalid display budgets refused',()=>{
 const f=fixture();f.observations.real.fill(0);f.observations.imag.fill(0);const r=O.matchedDelay(f.observations,f.model,{points:4});assert.equal(r.peak_power,0);assert.ok(Array.from(r.relative_power_db.values).every(x=>x===-60));
 for(const options of [{points:1},{points:4096},{minDelayNs:-1},{maxDelayNs:56},{floorDb:1},{floorDb:NaN},{truth:f.truth}])assert.throws(()=>O.matchedDelay(f.observations,f.model,options));
});
test('pure browser UMD exposes same live generator without require or ambient random state',()=>{
 const source=fs.readFileSync(runtime('nearfield-gc-sage-observations.js'),'utf8');const sandbox={};vm.runInNewContext(source,sandbox);assert.equal(sandbox.GCSAGEObservations.VERSION,O.VERSION);
 const a=sandbox.GCSAGEObservations.generate({seed:27}),b=O.generate({seed:27});assert.deepEqual(Array.from(a.observations.real),Array.from(b.observations.real));assert.deepEqual(Array.from(a.observations.imag),Array.from(b.observations.imag));
 assert.ok(!/\b(?:require|fetch|XMLHttpRequest|localStorage|sessionStorage|Math\.random)\s*\(/.test(source));
});
test('actual two fits share one observation and initializer, never truth, then evaluate separately',()=>{
 const s=O.generate(),before=G.observationHash(s.observations),options={angle_grid:128,max_sweeps:6},i=G.initialize(s.observations,s.model,options),results={};
 for(const mode of ['scattering','hybrid']){results[mode]=G.fit(s.observations,s.model,mode,options,i);assert.equal(results[mode].observation_sha256,before);assert.ok(Number.isFinite(O.evaluate(results[mode],s.observations,s.model,s.truth).sse));}
 assert.equal(before,G.observationHash(s.observations));assert.deepEqual(results.scattering.initialization.reference_delays_ns,results.hybrid.initialization.reference_delays_ns);
 assert.throws(()=>G.initialize(s.observations,{...s.model,truth:s.truth},options));assert.notEqual(results.scattering.prediction.real[0],results.hybrid.prediction.real[0]);
});
test('finite but numerically overflowing inputs are refused rather than yielding invalid metrics',()=>{
 assert.throws(()=>O.associateDelays([1e308,-1e308],[0,1],[true,true]),/overflowed/);
 const f=fixture();f.observations.real.fill(1e308);assert.throws(()=>O.evaluate(f.result,f.observations,f.model,f.truth),/overflowed/);assert.throws(()=>O.matchedDelay(f.observations,f.model,{points:2}),/overflowed/);
 const g=fixture();g.result.states[0].delays.fill(1e308);assert.throws(()=>O.evaluate(g.result,g.observations,g.model,g.truth),/overflowed/);
});
