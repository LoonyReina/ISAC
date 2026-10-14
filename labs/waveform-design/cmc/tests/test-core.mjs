import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const output=name=>{if(!process.env.ISAC_TEST_OUTPUT)throw Error('ISAC_TEST_OUTPUT required');return path.join(process.env.ISAC_TEST_OUTPUT,name);};
import {support,projectHull,lowerCertificate,solve,solveEvents,validate,objective} from '../cmc-core.mjs';
let seed=20261014;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};const complex=()=>[2*rand()-1,2*rand()-1],unit=t=>[Math.cos(t),Math.sin(t)],dot=(a,b)=>a[0]*b[0]+a[1]*b[1];let checks=0;
const base={H:[[[1,.2],[.3,-.1]],[[.2,-.4],[1,.1]]],s:[[1,0],[0,1]],referencePhase:[.2,-.4],power:1,epsilon:1,tolerance:1e-6,maxNodes:255,relaxationIterations:500,upperIterations:100,branch:'ARS'};
for(const width of [0,1e-8,.1,Math.PI,1.5*Math.PI,2*Math.PI])for(let r=0;r<10;r++){
 const mid=(rand()*2-1)*Math.PI,lo=mid-width/2,hi=mid+width/2,g=complex(),z=complex().map(x=>3*x),best=support(g,lo,hi),p=projectHull(z,lo,hi);
 assert.ok(Math.hypot(...p)<=1+1e-12);assert.ok(dot(unit(mid),p)>=Math.cos(width/2)-1e-12);
 for(let i=0;i<=1000;i++){const a=unit(lo+(hi-lo)*i/1000);assert.ok(dot(g,best)<=dot(g,a)+1e-12);const normal=[z[0]-p[0],z[1]-p[1]];assert.ok(dot(normal,[a[0]-p[0],a[1]-p[1]])<=1e-10);checks+=2;}
}
const results=[];
for(let n=1;n<=4;n++)for(const epsilon of [0,.1,1,2]){
 const p={...base,H:Array.from({length:2},()=>Array.from({length:n},complex)),s:[complex(),complex()],referencePhase:Array.from({length:n},()=>Math.PI*(2*rand()-1)),epsilon,branch:n%2?'BRS':'ARS'};
 const result=solve(p);assert.ok(result.lower<=result.upper+1e-9);assert.ok(result.modulusResidual<1e-12);assert.ok(result.similarity<=epsilon+1e-12);assert.ok(Math.abs(result.energy-p.power)<1e-12);assert.equal(result.status==='gap_satisfied',result.gap<=p.tolerance);
 for(const node of result.ledger){const amp=Math.sqrt(p.power/n),A=p.H.map(row=>row.map(z=>z.map(x=>x*amp)));assert.equal(node.upper,objective(A,p.s,node.physical.x));for(let j=0;j<30;j++){const x=node.lo.map((lo,i)=>unit(lo+rand()*(node.hi[i]-lo)));assert.ok(node.lower<=objective(A,p.s,x)+1e-8);checks++;}}
 const second=solve(p);assert.deepEqual(second,result);results.push(result);checks+=6;
}
const capped=solve({...base,maxNodes:1,tolerance:1e-9,relaxationIterations:1,upperIterations:1});assert.equal(capped.nodes,1);assert.equal(capped.status,'budget_unresolved');assert.ok(capped.activeNodeIds.length>0);checks++;
const exact=solve({...base,H:[[[100,100]]],s:[[100,-100]],referencePhase:[0],power:100,epsilon:0,tolerance:1e-9});assert.equal(exact.status,'budget_unresolved');assert.ok(exact.activeNodeIds.length===1);checks++;
for(const [key,value] of [['power',NaN],['epsilon',2.1],['maxNodes',0],['maxNodes',2048],['relaxationIterations',Infinity],['upperIterations',501],['branch','bad'],['tolerance',0],['power',true]]){assert.throws(()=>validate({...base,[key]:value}));checks++;}
const frozen=JSON.stringify(base),g=solveEvents(base);g.next();g.return();assert.equal(JSON.stringify(base),frozen);checks++;
fs.writeFileSync(output('NODE-CASES.json'),JSON.stringify(results));
const summary={checks,passed:true,cases:results.length,statuses:Object.fromEntries(['gap_satisfied','budget_unresolved'].map(s=>[s,results.filter(x=>x.status===s).length])),nativeBrowser:false};fs.writeFileSync(output('TEST-RESULT.json'),JSON.stringify(summary,null,2));console.log(summary);
