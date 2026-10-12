'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../..'),runtime=name=>fs.existsSync(path.join(root,name))?path.join(root,name):path.join(root,'labs/near-field',name);
const O=require(runtime('nearfield-gc-sage-observations.js')),G=require(runtime('nearfield-gc-sage-core.js'));
const sourceHash=crypto.createHash('sha256').update(fs.readFileSync(runtime('nearfield-gc-sage-observations.js'))).digest('hex'),coreHash=crypto.createHash('sha256').update(fs.readFileSync(runtime('nearfield-gc-sage-core.js'))).digest('hex');
const budgets={reference:{},reduced:{angle_grid:128,max_sweeps:6}},records=[],failures=[];
const start=performance.now();
for(const snrDb of O.OFFERED.snrDb)for(const aperture of O.OFFERED.aperture)for(const bandwidthHz of O.OFFERED.bandwidthHz)for(const scene of O.OFFERED.scene){
 const s=O.generate({snrDb,aperture,bandwidthHz,scene}),hash=G.observationHash(s.observations);
 for(const [budget,options]of Object.entries(budgets)){
  const record={config:s.config,budget,observation_sha256:hash,methods:{}};
  try{
   const initial=G.initialize(s.observations,s.model,options);
   for(const mode of ['scattering','hybrid']){
    const result=G.fit(s.observations,s.model,mode,options,initial),evaluation=O.evaluate(result,s.observations,s.model,s.truth);
    if(result.observation_sha256!==hash)throw Error('Observation hash changed');
    const direct=G.residualSSE(s.observations,result.prediction);
    if(Math.abs(direct-result.trace.at(-1).sse)>1e-8*Math.max(1,direct))throw Error('Stored SSE mismatch');
    for(let i=1;i<result.trace.length;i++)if(result.trace[i].sse>result.trace[i-1].sse+1e-10*Math.max(1,result.trace[i-1].sse))throw Error('Objective increased');
    record.methods[mode]={sse:evaluation.sse,clean_nmse_db:evaluation.clean_nmse_db,converged:result.converged,stopping_reason:result.stopping_reason,sweeps:evaluation.sweeps,
      estimated_kinds:result.states.map(v=>v.kind),association:evaluation.association,unmatched_estimate_indices:evaluation.unmatched_estimate_indices,mechanisms_correct:evaluation.mechanisms_correct,
      point_error_m:evaluation.paths[0].point_error_m,reflection_interaction_rmse_m:evaluation.paths[1].interaction_rmse_m,budget:result.budget};
   }
   record.pass=true;
  }catch(error){record.pass=false;record.error=String(error.stack||error);failures.push({config:s.config,budget,error:record.error});}
  records.push(record);
 }
 if(records.length%40===0)console.log('Completed',records.length,'same-data budget comparisons,',((performance.now()-start)/1000).toFixed(1),'seconds');
}
const summary={version:O.VERSION,node:process.version,scope:'Node execution, not a browser latency or field-data validation; successful finite execution does not establish geometric correctness',
  source_sha256:sourceHash,core_sha256:coreHash,
  acquisition_configurations:160,budget_comparisons:records.length,actual_fits:records.reduce((n,r)=>n+Object.keys(r.methods).length,0),seconds:(performance.now()-start)/1000,
  all_executed_without_error:!failures.length,failures,records};
fs.writeFileSync(path.join(__dirname,'results/regime-comparison.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({...summary,records:undefined},null,2));
if(failures.length)process.exitCode=1;
