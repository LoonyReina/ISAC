/** Independent Python/NumPy-SVD fixtures; finite grids only, never continuous parity. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {LiteralOTFS,jointProfile,evaluate,fitGrid,VERSION,GRID} from '../../../../labs/otfs-receiver/joint/joint-core.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const fixture=JSON.parse(fs.readFileSync(path.join(here,'independent-oracles.json'),'utf8'));
const checks=[],metrics={};
function check(name,condition){assert.ok(condition,name);checks.push(name);}
function close(name,a,b,atol=2e-10,rtol=2e-11){check(name,Math.abs(a-b)<=atol+rtol*Math.abs(b));}
function flat(a){return Array.from(a).flat(Infinity);}
function maxError(a,b){a=flat(a);b=flat(b);assert.equal(a.length,b.length);return Math.max(0,...a.map((v,i)=>Math.abs(v-b[i])));}
function update(name,value){metrics[name]=Math.max(metrics[name]||0,value);}
function compare(name,actual,expected){
  check(name+': status',actual.ok===expected.ok&&actual.status===expected.status);
  if(expected.rank!==undefined)check(name+': rank',actual.rank===expected.rank);
  if(expected.condition!==undefined){const rel=Math.abs(actual.condition/expected.condition-1);update('max_condition_relative_error',rel);check(name+': condition',rel<2e-6);}
  if(!expected.ok)return;
  const gainError=maxError(actual.h,expected.h),residualVectorError=maxError(actual.r,expected.r),residualError=Math.abs(actual.residual-expected.residual);
  update('max_gain_component_error',gainError);update('max_residual_vector_component_error',residualVectorError);update('max_residual_absolute_error',residualError);
  check(name+': gains',gainError<5e-9);
  check(name+': residual vector',residualVectorError<5e-9);
  close(name+': objective',actual.residual,expected.residual);
  check(name+': scaled normal defect',actual.scaled_normal_defect<=1e-10);
}
const began=performance.now();
for(const c of fixture.profiles)compare(c.name,jointProfile(c.y,c.columns),c.expected);
const tiny=fixture.tiny, tinyModel=new LiteralOTFS(tiny.x,{N:tiny.N,M:tiny.M});
const tinyColumns=tiny.grid.map(t=>tinyModel.action(...t));
for(let j=0;j<tinyColumns.length;j++){const e=maxError(tinyColumns[j],tiny.columns[j]);update('max_literal_action_component_error',e);check('tiny dense action '+j,e<1e-12);}
for(const c of tiny.supports)compare('tiny pair '+c.ids.join(','),jointProfile(tiny.y,c.ids.map(i=>tinyColumns[i])),c);
check('tiny exhaustive support count',tiny.supports.length===66);
const tinySelected=tiny.supports[0], permutation=[...tinySelected.ids].reverse();
const perm=jointProfile(tiny.y,permutation.map(i=>tinyColumns[i]));
check('support permutation gains',maxError(perm.h,[...tinySelected.h].reverse())<1e-10);
close('support permutation residual',perm.residual,tinySelected.residual);
const independentGains=tinySelected.ids.map(i=>jointProfile(tiny.y,[tinyColumns[i]]).h[0]);
check('joint gains differ from separate single-path gains',maxError(independentGains,tinySelected.h)>1e-3);
for(const c of fixture.gradients){
  const model=new LiteralOTFS(c.x,{N:c.N,M:c.M});const out=evaluate(model,c.y,c.theta,true);compare(c.name,out,c.expected);
  const e=maxError(out.gradient,c.gradient);update('max_profile_gradient_component_error',e);check(c.name+': analytical reference gradient',e<1e-9);
  const fdError=Math.min(...c.independent_central_differences.map(d=>maxError(out.gradient,d.gradient)));
  update('max_independent_finite_difference_error',fdError);check(c.name+': independent dense/SVD finite difference',fdError<1e-6);
}
const model8=new LiteralOTFS(fixture.x8);
for(const c of fixture.dense_spot_checks){const e=maxError(model8.action(...GRID[c.id]),c.u);update('max_literal_action_component_error',e);check('8x8 independent dense action '+c.id,e<1e-12);}
const fits=[];let sequentialNotRefitted=0;
for(const c of fixture.fits){
  const U=c.grid.map(t=>model8.action(...t));
  for(const row of c.all_supports){
    const out=jointProfile(c.y,row.ids.map(i=>U[i]));
    check(c.name+': identifiable support '+row.ids.join(','),out.ok);
    const e=Math.abs(out.residual-row.residual);update('max_exhaustive_objective_error',e);
    close(c.name+': exhaustive objective '+row.ids.join(','),out.residual,row.residual);
    const condError=Math.abs(out.condition/row.condition-1);update('max_grid_condition_relative_error',condError);check(c.name+': exhaustive condition '+row.ids.join(','),condError<1e-10);
  }
  const progress=[];const begin=performance.now();const result=await fitGrid({x:fixture.x8,y:c.y,P:c.P,grid:c.grid},n=>progress.push(n));
  const expectedBaselines=c.baselines,bs=result.baselines;
  check(c.name+': single baseline support',bs.single.id===expectedBaselines.single.id);
  check(c.name+': single baseline gain',maxError(bs.single.h,expectedBaselines.single.h)<1e-11);
  close(c.name+': single baseline residual',bs.single.residual,expectedBaselines.single.residual);
  check(c.name+': sequential baseline support',JSON.stringify(bs.sequential.stages.map(t=>t.id))===JSON.stringify(expectedBaselines.sequential.ids));
  check(c.name+': sequential baseline gains',maxError(bs.sequential.h,expectedBaselines.sequential.h)<1e-11);
  close(c.name+': sequential baseline residual',bs.sequential.residual,expectedBaselines.sequential.residual);
  for(let j=0;j<c.P;j++){
    const actual=bs.sequential.stages[j],expected=expectedBaselines.sequential.stages[j];
    check(c.name+': sequential stage gain '+j,maxError(actual.h,expected.h)<1e-11);
    check(c.name+': sequential stage residual vector '+j,maxError(actual.r,expected.r)<1e-11);
    close(c.name+': sequential stage objective '+j,actual.residual,expected.residual);
  }
  const replay=Float64Array.from(c.y);
  for(let j=0;j<c.P;j++)for(let k=0;k<replay.length;k+=2){
    const u=U[bs.sequential.stages[j].id],h=bs.sequential.h[j];
    replay[k]-=u[k]*h[0]-u[k+1]*h[1];replay[k+1]-=u[k]*h[1]+u[k+1]*h[0];
  }
  check(c.name+': sequential gain replay',maxError(replay,expectedBaselines.sequential.r)<1e-11);
  close(c.name+': sequential replay objective',Array.from(replay).reduce((s,v)=>s+v*v,0),bs.sequential.residual);
  const refit=jointProfile(c.y,bs.sequential.stages.map(t=>U[t.id]));
  if(refit.ok){
    check(c.name+': joint refit cannot worsen sequential',refit.residual<=bs.sequential.residual+1e-10);
    if(maxError(refit.h,bs.sequential.h)>1e-5&&bs.sequential.residual-refit.residual>1e-5)sequentialNotRefitted++;
  }
  check(c.name+': total supports',result.supportCount===c.support_count);
  check(c.name+': finite-grid status',result.status==='finite_grid_estimate'&&result.optimizerStatus==='not_run');
  check(c.name+': no failures',Object.keys(result.failures).length===0);
  check(c.name+': correct selected support',JSON.stringify(result.best.ids)===JSON.stringify(c.top4[0].ids));
  compare(c.name+': best joint fit',result.best,c.top4[0]);
  check(c.name+': four starts',result.starts.length===4);
  for(let i=0;i<4;i++){
    check(c.name+': top-four support '+i,JSON.stringify(result.starts[i].theta)===JSON.stringify(c.top4[i].ids.map(id=>c.grid[id])));
    close(c.name+': top-four objective '+i,result.starts[i].residual,c.top4[i].residual);
  }
  check(c.name+': progress increments',progress.every((n,i)=>n===(i+1)*32)&&progress.length===Math.floor(c.support_count/32));
  fits.push({name:c.name,P:c.P,support_count:result.supportCount,best_ids:result.best.ids,best_residual:result.best.residual,maximum_condition:Math.max(...c.all_supports.map(r=>r.condition)),milliseconds:performance.now()-begin});
}
check('sequential uses stage gains without a final joint refit',sequentialNotRefitted===fixture.fits.length);
const duplicateGrid=Array.from({length:4},()=>[.25,.25]);
const failed=await fitGrid({x:fixture.x8,y:fixture.fits[0].y,P:2,grid:duplicateGrid});
check('all duplicate supports rejected',failed.status==='no_identifiable_support'&&failed.best===null&&failed.supportCount===6&&failed.failures.rank_deficient===6&&failed.starts.length===0);
const zero=await fitGrid({x:fixture.x8,y:Array(128).fill(0),P:3});
check('zero observation exact objective',zero.best.residual===0&&zero.best.scaled_normal_defect===0&&zero.best.h.flat().every(v=>v===0));
check('lexicographic exact-tie selection',JSON.stringify(zero.best.ids)==='[0,1,2]');
check('lexicographic exact-tie top four',JSON.stringify(zero.starts.map(v=>v.theta))===JSON.stringify([[0,1,2],[0,1,3],[0,1,4],[0,1,5]].map(ids=>ids.map(i=>GRID[i]))));
const mixedGrid=[[.2,-.8],[.2,-.8],[.6,.4],[1.8,.8]];
const mixed=await fitGrid({x:fixture.x8,y:fixture.fits[0].y,P:2,grid:mixedGrid});
check('partial rank failures retained',mixed.supportCount===6&&mixed.failures.rank_deficient===1&&mixed.best!==null);
let throws=0;
for(const [y,U] of [ [[1],[ [1] ]],[[1,2],[[1,2],[1,2,3,4]]],[[1,Infinity],[[1,2]]],[[1,2],[[1,NaN]]],[[1,2],[]],[[1,2],Array.from({length:4},()=>[1,2])] ]){
  assert.throws(()=>jointProfile(y,U),RangeError);throws++;
}
for(const config of [{P:1},{P:4},{P:2,grid:[]},{P:2,grid:Array.from({length:26},()=>[.1,0])},{P:2,grid:[[.1,0],[2.1,0]]},{P:2,grid:[[.1,0],[.2,1.1]]},{P:2,grid:[[.1,0],[NaN,0]]},{P:2,y:[1,2]},{P:2,x:Array(128).fill(0)}]){
  await assert.rejects(fitGrid({x:fixture.x8,y:fixture.fits[0].y,...config}),RangeError);throws++;
}
assert.throws(()=>evaluate(model8,fixture.fits[0].y,[[1,.2],[.4,-.2]],true),RangeError);throws++;
check('invalid inputs and boundary derivatives rejected',throws===16);
const result={status:'PASS',scope:fixture.scope,version:VERSION,checks:checks.length,profile_fixtures:fixture.profiles.length,tiny_supports:tiny.supports.length,grid_supports_checked:fixture.fits.reduce((s,c)=>s+c.support_count,0),gradient_cases:fixture.gradients.length,independent_baseline_cases:fixture.fits.length,sequential_no_final_refit_cases:sequentialNotRefitted,rejection_cases:throws,metrics,fits,seconds:(performance.now()-began)/1000,core_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(here,'../../../../labs/otfs-receiver/joint/joint-core.mjs'))).digest('hex'),oracle_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(here,'independent-oracles.json'))).digest('hex')};
fs.writeFileSync((process.env.ISAC_TEST_OUTPUT || path.join(process.env.TMPDIR || '/tmp','isac-joint-independent-results.json')),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
