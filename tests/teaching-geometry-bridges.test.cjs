'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const local=(legacy,source)=>path.join(root,fs.existsSync(path.join(root,legacy))?legacy:source);
const G=require(local('nearfield-gc-sage-core.js','labs/near-field/nearfield-gc-sage-core.js'));
const L=require(local('nearfield-gc-sage.js','labs/near-field/nearfield-gc-sage.js'));
const input=G.fromFixture(JSON.parse(fs.readFileSync(path.join(root,'scripts/validation/nearfield-gc-sage/reference/fixtures/default-observations.json'))));
const options={...input.options,delay_grid:64,initializer_sweeps:2,angle_grid:16,refinement_rounds:0,max_sweeps:1,record_history:true};
const result=G.fit(input.observations,input.model,'hybrid',options);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('geometry bridge reconstructs actual sample phasor and every update SSE without truth',()=>{
 for(let i=0;i<result.trace.length;i++)for(const p of [0,32,63]){
  const b=L.sampleBridge(G,input.observations,input.model,result,i,0,23,p);
  close(b.steering[0]**2+b.steering[1]**2,1);
  close(b.component[0],b.gain[0]*b.steering[0]-b.gain[1]*b.steering[1]);
  close(b.component[1],b.gain[0]*b.steering[1]+b.gain[1]*b.steering[0]);
  if(b.lengths)close(b.lengths[0]+b.lengths[1],G.C*b.delay);
  if(i){close(b.update.afterSSE,result.trace[i].sse);close(b.update.beforeSSE,result.trace[i-1].sse);for(let j=0;j<2;j++){close(b.update.hidden[j],b.update.observed[j]-b.update.other[j]);close(b.update.residual[j],b.update.hidden[j]-b.update.after[j]);}}
  assert.match(L.bridgeText(b),/载频相位由自由复增益吸收/);
 }
 assert.match(L.bridgeText(L.sampleBridge(G,input.observations,input.model,result,0,0,23,32)),/尚未定位/);
 assert.throws(()=>L.sampleBridge(G,input.observations,input.model,result,0,0,-1,0),/index/);
});
test('mapping teaching chain uses original opposing-station convention and excess delay',async()=>{
 const base=local('channel-mapping/src/geometry.mjs','labs/channel-mapping/src/geometry.mjs');
 const {backproject,rangeFromNs,excessDelayNs,distance}=await import(base);
 const R=rangeFromNs(20),p1=[0,0],p2=[4,0],a=backproject(1,p1,-30,R),b=backproject(2,p2,-30,R);
 close(a[0],R*Math.cos(Math.PI/6));close(b[0],4-R*Math.cos(Math.PI/6));close(a[1],R/2);close(b[1],R/2);
 const p=[(a[0]+b[0])/2,(a[1]+b[1])/2];close(excessDelayNs(p,p1,p2),(distance(p,p1)+distance(p,p2)-4)*1e9/299792458);
 const source=fs.readFileSync(local('channel-mapping/src/app.mjs','labs/channel-mapping/src/app.mjs'),'utf8');assert.match(source,/不能把扫描 τ 直接拿去匹配/);assert.match(source,/range_m/);assert.match(source,/backproject\(rep.station_id/);
});
