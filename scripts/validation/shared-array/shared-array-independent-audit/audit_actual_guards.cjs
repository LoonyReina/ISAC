#!/usr/bin/env node
/** Small, bounded invalid inputs only. Never attempts a huge allocation. */
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const [corePath,outputPath]=process.argv.slice(2);if(!corePath||!outputPath)throw new Error('Usage: node audit_actual_guards.cjs CORE OUTPUT');
const C=require(path.resolve(corePath));const results=[];
function rejects(name,call,code){try{call();results.push({name,pass:false,reason:'accepted invalid input'});}catch(e){results.push({name,pass:code?e.code===code:true,error:String(e.message),code:e.code??null});}}
function accepts(name,call,test=()=>true){try{const x=call();results.push({name,pass:Boolean(test(x))});}catch(e){results.push({name,pass:false,error:String(e.message)});}}
for(const config of [null,[],{n:0},{n:129},{n:3.2},{n:true},{nr:0},{nr:8},{nr:1.5},{noise_power:0},{total_power:0},{target_u:1.01},{user_u:-1.01},{radar_fraction:-.1},{radar_fraction:1.1},{channel_gain:-1},{qos_linear:-1},{noise_power:NaN},{target_u:Infinity},{qos_linear:'20'},{unexpected:1}])rejects('evaluate invalid '+JSON.stringify(config),()=>C.evaluate(config));
accepts('largest supported N=128',()=>C.evaluate({n:128,nr:64}),x=>x.covariance===undefined&&x.recipes.shared_aim_user.covariance.length===128);
rejects('tiny positive q subnormal',()=>C.evaluate({target_u:1e-155}),'NUMERICAL_RANGE');
rejects('tiny positive q underflow',()=>C.evaluate({target_u:1e-200}),'NUMERICAL_RANGE');
rejects('finite inputs derived overflow',()=>C.evaluate({total_power:1e308}),'NUMERICAL_RANGE');
const z=[0,0],v=[[1,0],[0,1]],bad=[NaN,0];
for(const [name,call]of [
 ['covariance empty factors',()=>C.covariance([])],
 ['covariance empty vectors',()=>C.covariance([[]])],
 ['covariance ragged factors',()=>C.covariance([v,[[1,0]]])],
 ['covariance nonfinite pair',()=>C.covariance([[bad]])],
 ['covariance sparse vector',()=>C.covariance([new Array(2)])],
 ['covariance too many rows',()=>C.covariance([Array.from({length:129},()=>z)])],
 ['pattern empty factors',()=>C.pattern([],0)],
 ['pattern ragged factors',()=>C.pattern([v,[[1,0]]],0)],
 ['pattern nonfinite coordinate',()=>C.pattern([v],NaN)],
 ['pattern nonphysical coordinate',()=>C.pattern([v],1.1)],
 ['inner mismatched vectors',()=>C.inner(v,[z])],
 ['inner nonfinite input',()=>C.inner([bad],[z])],
 ['norm2 nonfinite input',()=>C.norm2([bad])],
 ['scale nonfinite scalar',()=>C.scale(v,Infinity)],
 ['scale malformed pair',()=>C.scale(v,[1])],
 ['steering invalid coordinate',()=>C.steering([0,1],NaN)],
 ['steering sparse indices',()=>C.steering(new Array(2),0)],
 ['steering nonfinite index',()=>C.steering([0,Infinity],0)],
 ['projection zero dimensions',()=>C.stable_projection(0,0,.25)],
 ['projection excessive dimensions',()=>C.stable_projection(129,0,.25)],
 ['projection invalid direction',()=>C.stable_projection(4,0,1.1)],
 ['projection negative channel gain',()=>C.stable_projection(4,0,.25,-1)],
 ['Dirichlet invalid dimensions',()=>C.dirichlet_power(0,.25)],
 ['Dirichlet nonfinite delta',()=>C.dirichlet_power(4,NaN)],
])rejects(name,call);
accepts('zero radar factor remains valid',()=>C.pattern([[z,z]],.2),x=>x===0);
accepts('zero channel one radar element',()=>C.evaluate({nr:1,channel_gain:0}),x=>x.projection.q===1&&x.projection.nullity===1);
accepts('exact alias correctly undefined',()=>C.evaluate({user_u:-1,target_u:1}),x=>x.projection.q===0&&x.recipes.split_null_fixed_power.feasible_recipe===false);
const report={core_sha256:crypto.createHash('sha256').update(fs.readFileSync(corePath)).digest('hex'),checks:results.length,failures:results.filter(x=>!x.pass),results};fs.writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks,failures:report.failures},null,2));process.exitCode=report.failures.length?1:0;
