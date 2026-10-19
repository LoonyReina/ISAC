import fs from 'node:fs';
import {detectMPPsi,runPaired,replayPaired,decisionStep} from '../../../../labs/otfs-receiver/mppsi/mppsi-kernel.mjs';
import assert from 'node:assert/strict';
const z=(re,im=0)=>({re,im});
const constellation=[z(1),z(-1),z(0,1),z(0,-1)];
const cases=[];
for(let k=0;k<20;k++){
 const R=2+k%3,C=2+k%2;
 const H=Array.from({length:R},(_,d)=>Array.from({length:C},(_,c)=>k%4===0&&c===C-1?z(0):z(Math.sin(1+d*7+c*3+k),.5*Math.cos(d+c*5+k))));
 const input={H,y:Array.from({length:R},(_,d)=>z(Math.cos(k+d),Math.sin(k-d))),constellation,noiseVariance:.1+(k%5)*.4,settings:{maxIterations:6,damping:k%2?.7:1,gamma:.01,drop:.2}};
 cases.push({input,result:detectMPPsi(input)});
}
const diagonal={H:[[z(1),z(0)],[z(0),z(.5,.2)]],y:[z(.3,.2),z(-.4,.1)],noiseVariance:.7,constellation,settings:{maxIterations:4}};
cases.push({input:diagonal,result:detectMPPsi(diagonal),exactDiagonal:true});
const zero={H:[[z(0),z(0)]],y:[z(.2)],noiseVariance:1,constellation,settings:{maxIterations:3}};
cases.push({input:zero,result:detectMPPsi(zero)});
assert(cases.at(-1).result.fallback_used); assert.equal(cases.at(-1).result.status,'iteration_cap');
assert.equal(decisionStep({eta:.6,previousEta:.4,maximumEta:.9,iteration:3,maxIterations:8,drop:.2}).updated_decision,true);
assert.equal(decisionStep({eta:.6,previousEta:.4,maximumEta:.9,iteration:3,maxIterations:8,drop:.2}).status,'confidence_drop');
const paired=[];
for(const scenario of ['integer','fractional'])for(const snrDb of [0,10,30]){
 const p=runPaired({scenario,snrDb,seed:123,maxIterations:8});
 assert.deepEqual(replayPaired(p.record),p);
 const changed=replayPaired({...p.record,truth:p.record.truth.map(a=>(a+1)%4)});
 for(const key of Object.keys(p.results))assert.deepEqual(p.results[key].probabilities,changed.results[key].probabilities);
 if(scenario==='integer')for(const method of ['mppsi','mpg','lmmse'])for(let i=0;i<12;i++)for(let a=0;a<4;a++)assert(Math.abs(p.results[method+'_matched'].probabilities[i][a]-p.results[method+'_rounded'].probabilities[i][a])<1e-10);
 paired.push(p);
}
for(const bad of [{noiseVariance:0},{noiseVariance:NaN},{y:[]},{settings:{damping:0}},{settings:{maxIterations:201}},{H:[[z(Infinity)]]}])assert.throws(()=>detectMPPsi({...diagonal,...bad}));
assert.throws(()=>replayPaired({...paired[0].record,schema:'wrong'}));
assert.throws(()=>replayPaired({...paired[0].record,noiseVariance:99}));
fs.writeFileSync((process.env.ISAC_MPPSI_FIXTURES||new URL('./fixtures.json',import.meta.url)),JSON.stringify({cases,paired}));
console.log(JSON.stringify({cases:cases.length,paired:paired.length,replayDeterministic:true,truthWithheld:true,invalidInputsRejected:8,integerModelAgreement:true}));
