'use strict';
const fs=require('fs');
const core=require(process.argv[2]);
const jobs=JSON.parse(fs.readFileSync(0,'utf8'));
const result=jobs.map(job=>{
 try {
  if(job.op==='simulate'){const s=core.simulate(job.args[0]);return {ok:true,value:{config:s.config,input:s.input,background:s.background,updated:s.updated,previous:s.previous,output:s.output,noiseTheory:s.noiseTheory,metrics:s.metrics,generatorOnly:s.generatorOnly,noiseCovarianceFirst4:s.noiseCovarianceFirst4}};}
  return {ok:true,value:core[job.op](...job.args)};
 } catch(e){return {ok:false,name:e.name,message:e.message};}
});
process.stdout.write(JSON.stringify(result,(k,v)=>typeof v==='number'&&!Number.isFinite(v)?String(v):v));
