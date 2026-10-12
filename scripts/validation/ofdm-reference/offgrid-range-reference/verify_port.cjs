/* Cross-language fixture reader only; independent scalar math, no site imports. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=__dirname; const report={rngCases:0,observationRows:0,estimatorComparisons:0,maxNormalDifference:0,maxScoreDifference:0,maxResidualDifference:0};
function assert(ok,label){if(!ok)throw new Error(label);}
function randomStream(seed,domain){
 let h=2166136261;for(const c of domain)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 let z=(seed^h)>>>0;
 const mix=()=>{z=(z+0x9e3779b9)>>>0;let v=z;v=Math.imul(v^(v>>>16),0x21f0aaad);v=Math.imul(v^(v>>>15),0x735a2d97);return(v^(v>>>15))>>>0;};
 let a=mix(),b=mix(),c=mix(),d=mix();const initial=[a,b,c,d],rot=(v,k)=>(v<<k)|(v>>>(32-k));let spare=null;
 function uniform(){const result=Math.imul(rot(Math.imul(b,5),7),9)>>>0,t=b<<9;c^=a;d^=b;b^=c;a^=d;c^=t;d=rot(d,11);return(result+.5)/4294967296;}
 function normal(){if(spare!==null){const v=spare;spare=null;return v;}const r=Math.sqrt(-2*Math.log(uniform())),p=2*Math.PI*uniform();spare=r*Math.sin(p);return r*Math.cos(p);}
 return{hash:h,initial,uniform,normal};
}
for(const f of JSON.parse(fs.readFileSync(path.join(root,'fixtures/rng-port-fixtures.json'))).fixtures){
 let r=randomStream(f.seedUint32,f.domain);assert(r.hash===f.domainHashUint32,'hash');assert(JSON.stringify(r.initial)===JSON.stringify(f.initialStateUint32),'initial state');
 for(const expected of f.uniform)assert(r.uniform()===expected,'exact uniform');
 r=randomStream(f.seedUint32,f.domain);for(const expected of f.normal){const difference=Math.abs(r.normal()-expected);assert(difference<2e-14,'normal port tolerance');report.maxNormalDifference=Math.max(report.maxNormalDifference,difference);}report.rngCases++;
}
function prepare(X,f,candidates,c){
 return candidates.map(r=>X.map(([re,im],k)=>{const p=-4*Math.PI*f[k]*r/c,co=Math.cos(p),si=Math.sin(p);return[re*co-im*si,re*si+im*co];}));
}
function receive(y,templates,candidates){
 const gains=templates.map(a=>{let re=0,im=0,E=0;for(let k=0;k<y.length;k++){re+=a[k][0]*y[k][0]+a[k][1]*y[k][1];im+=a[k][0]*y[k][1]-a[k][1]*y[k][0];E+=a[k][0]**2+a[k][1]**2;}return[re/E,im/E];});
 const scores=gains.map(([re,im])=>re*re+im*im),maxScore=Math.max(...scores),tol=64*Number.EPSILON*Math.max(1,maxScore),index=scores.findIndex(s=>s>=maxScore-tol),[ar,ai]=gains[index];let residual=0;
 for(let k=0;k<y.length;k++){const[re,im]=templates[index][k],er=y[k][0]-(ar*re-ai*im),ei=y[k][1]-(ar*im+ai*re);residual+=er*er+ei*ei;}
 return{estimate:candidates[index],maxScore,residual};
}
for(const name of ['noise-free-offgrid','high-snr-offgrid','low-snr-counterexample']){
 const f=JSON.parse(fs.readFileSync(path.join(root,'fixtures',name+'.json'))),l=f.resources;
 const known={};for(const key of ['coarse','fine'])known[key]=prepare(l.knownWaveform,l.frequencyOffsetsHz,l[key+'GridM'],l.cMps);
 for(const row of f.trials){
  report.observationRows++;
  for(const key of ['coarse','fine']){
   const actual=receive(row.observation,known[key],l[key+'GridM']),expected=row[key];
   assert(actual.estimate===expected.estimateM,`${name}/${row.trialIndex}/${key} estimate`);
   report.maxScoreDifference=Math.max(report.maxScoreDifference,Math.abs(actual.maxScore-expected.maxScore));
   report.maxResidualDifference=Math.max(report.maxResidualDifference,Math.abs(actual.residual-expected.residualEnergy));
   assert(Math.abs(actual.maxScore-expected.maxScore)<1e-12,'score tolerance');assert(Math.abs(actual.residual-expected.residualEnergy)<1e-12,'residual tolerance');report.estimatorComparisons++;
  }
 }
}
report.scope='Cross-language RNG and scalar rescoring of independent Python fixtures, not production/browser verification';
fs.writeFileSync(path.join(root,'port-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
