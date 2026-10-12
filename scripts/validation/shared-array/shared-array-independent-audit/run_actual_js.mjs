#!/usr/bin/env node
/** Neutral runner: adapter must call actual exports, never recreate the model. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const argv=Object.fromEntries(process.argv.slice(2).reduce((a,x,i,arr)=>i%2?a:(a.push([x.replace(/^--/,''),arr[i+1]]),a),[]));
if(!argv.adapter||!argv.core||!argv.inputs||!argv.output) throw new Error('Required: --adapter FILE --core FILE --inputs FILE --output FILE');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const requests=JSON.parse(fs.readFileSync(argv.inputs,'utf8'));
const mod=await import(pathToFileURL(path.resolve(argv.adapter)).href);
const api=await mod.bindCore(path.resolve(argv.core));
if(typeof api.evaluate!=='function')throw new Error('Adapter must expose evaluate(config) backed by the actual core');
const summary={schema:requests.schema,engine:api.engine??'actual-js',node:process.version,core:path.resolve(argv.core),core_sha256:hash(argv.core),adapter_sha256:hash(argv.adapter),input_sha256:hash(argv.inputs),capabilities:{evaluate:true,recipePattern:typeof api.recipePattern==='function',covariancePattern:typeof api.covariancePattern==='function',matrixFactorAPI:typeof api.factorCovariance==='function'&&typeof api.factorPattern==='function',sourceConditional:typeof api.sourceConditional==='function'},cases:[],matrix_cases:[]};
function errorObject(e){return {name:e?.name??'Error',message:String(e?.message??e),code:e?.code??null};}
function assertFiniteDeep(value,loc='root'){
 if(typeof value==='number'&&!Number.isFinite(value))throw new Error(`Nonfinite numeric output at ${loc}`);
 if(Array.isArray(value))value.forEach((x,i)=>assertFiniteDeep(x,`${loc}[${i}]`));
 else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))assertFiniteDeep(v,`${loc}.${k}`);
}
for(const req of requests.cases){
 const item={id:req.id};
 try{
  const snapshot=await api.evaluate(req.config);
  assertFiniteDeep(snapshot);item.status='ok';item.evaluation=snapshot;item.pattern_probes={};
  if(api.recipePattern)for(const [key,recipe] of Object.entries(snapshot.recipes)){
   if(!recipe.feasible_recipe)continue;
   item.pattern_probes[key]=[];
   for(const u of [...requests.directions,req.config.user_u,req.config.target_u]){
    const value=await api.recipePattern(snapshot,key,u);
    assertFiniteDeep(value);item.pattern_probes[key].push({u,value});
   }
  }
 }catch(e){item.status='error';item.error=errorObject(e);}
 summary.cases.push(item);
}
if(api.covariancePattern||(api.factorCovariance&&api.factorPattern))for(const req of requests.matrix_cases){
 const item={id:req.id};
 try{
  item.status='ok';item.probes=[];
  if(api.factorCovariance)item.covariance=await api.factorCovariance(req.factors);
  for(const u of req.directions){const value=api.covariancePattern?await api.covariancePattern(req.covariance,u):await api.factorPattern(req.factors,u);assertFiniteDeep(value);item.probes.push({u,value});}
 }catch(e){item.status='error';item.error=errorObject(e);}
 summary.matrix_cases.push(item);
}
if(api.sourceConditional){
 try{summary.source_conditional=await api.sourceConditional(requests.source_conditional);assertFiniteDeep(summary.source_conditional);}
 catch(e){summary.source_conditional_error=errorObject(e);}
}
fs.writeFileSync(argv.output,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({cases:summary.cases.length,errors:summary.cases.filter(x=>x.status==='error').length,matrix_cases:summary.matrix_cases.length,capabilities:summary.capabilities,core_sha256:summary.core_sha256},null,2));
