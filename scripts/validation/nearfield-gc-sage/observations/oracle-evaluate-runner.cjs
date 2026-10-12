'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../..'),runtime=name=>fs.existsSync(path.join(root,name))?path.join(root,name):path.join(root,'labs/near-field',name);
const O=require(runtime('nearfield-gc-sage-observations.js')),dir=__dirname;
const fixture=JSON.parse(fs.readFileSync(path.join(dir,'fixtures/oracle-evaluation.json'),'utf8'));
let comparisons=0,maxRelative=0,maxAbsolute=0;
function near(a,b,label,atol=2e-10,rtol=2e-11){if(a===null||b===null){assert.equal(a,b,label);return;}assert.equal(typeof a,'number',label);assert.equal(typeof b,'number',label);const d=Math.abs(a-b);maxAbsolute=Math.max(maxAbsolute,d);maxRelative=Math.max(maxRelative,d/Math.max(1,Math.abs(b)));assert.ok(d<=atol+rtol*Math.abs(b),`${label}: ${a} vs ${b}`);comparisons++;}
const cases=[];
for(const f of fixture.cases){
 const a=O.evaluate(f.result,f.observations,f.model,f.truth,{visibilityHeuristic:true}),b=f.expected;
 for(const key of ['sse','relative_residual_db','clean_nmse_db'])near(a[key],b[key],f.name+'/'+key);
 assert.deepEqual(a.unmatched_estimate_indices,b.unmatched_estimate_indices,f.name+'/unmatched');
 for(const key of ['min_normalized_singular_value','max_condition_number','minimum_channel_rank'])near(a.conditional_gain_design[key],b.conditional_gain_design[key],f.name+'/'+key,5e-9,2e-9);
 for(let i=0;i<2;i++){
  for(const key of ['matched','target_present','estimated_kind'])assert.equal(a.paths[i][key],b.paths[i][key],f.name+'/'+i+'/'+key);
  for(const key of ['reference_delay_error_ns','interaction_rmse_m','visible_fraction_truth','visible_fraction_estimate','visibility_accuracy','point_error_m','normal_error_deg','plane_distance_error_m','visibility_threshold_power']) {
   if(b.paths[i][key]!==undefined)near(a.paths[i][key],b.paths[i][key],f.name+'/'+i+'/'+key);
  }
 }
 if(a.mode==='hybrid')assert.equal(a.mechanisms_correct,b.mechanisms_correct);else assert.equal(a.mechanisms_correct,null);
 cases.push({name:f.name,pass:true,sse:a.sse,clean_nmse_db:a.clean_nmse_db,association:a.association});
}
const assignments=JSON.parse(fs.readFileSync(path.join(dir,'fixtures/oracle-association.json'),'utf8'));
for(const f of assignments.cases)assert.deepEqual(O.associateDelays(f.actual,f.estimated,f.present).association,f.association,JSON.stringify(f));
const report={simulator_version:O.VERSION,node:process.version,source_sha256:crypto.createHash('sha256').update(fs.readFileSync(runtime('nearfield-gc-sage-observations.js'))).digest('hex'),reference_evaluation_cases:cases,numeric_comparisons:comparisons,max_absolute_difference:maxAbsolute,max_scaled_difference:maxRelative,assignment_cases:assignments.cases.length,all_passed:true,
 deliberate_presentation_changes:['Scattering-only mechanism score is null/unavailable','Undefined geometry entries consistently null','Visibility threshold opt-in and explicitly heuristic','Infinite conditional condition number serialized as null with reason','Perpendicular-normal line-offset uses original unit normal instead of reference sign(0) degeneration (independently tested)']};
fs.writeFileSync(path.join(dir,'results/oracle-comparison.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
