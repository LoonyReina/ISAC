#!/usr/bin/env node
'use strict';
// Run in dist/ (or the compatibility workspace) after the ordinary build.
// This script executes the real solver. Its entropy/logistic oracle is independent.
const assert=require('node:assert/strict');
const C=require('../../../capacity-distortion-core.js');
const entropy=p=>p===0||p===1?0:-p*Math.log2(p)-(1-p)*Math.log2(1-p);
const model=C.binaryModel({q:.4}),points=[];
let maximumRateError=0,maximumDistortionError=0,maximumIterationProbabilityError=0;
const start=performance.now();
for(let index=0;index<=48;index++){
 const mu=index/2,result=C.solve(model,{mu,tolerance:1e-10,maxIterations:10000,dualStrategy:'projected-gradient'});
 assert.ok(result.converged&&result.feasible,'Fig2 solve must be certified: mu='+mu);
 const p0=1/(1+Math.exp(mu)),expectedRate=.4*entropy(p0),expectedDistortion=.4*p0;
 const rateError=Math.abs(result.rateBits-expectedRate),distortionError=Math.abs(result.distortion-expectedDistortion);
 maximumRateError=Math.max(maximumRateError,rateError);maximumDistortionError=Math.max(maximumDistortionError,distortionError);
 for(const row of result.trace){
  const expectedP0=1/(1+Math.exp(mu*(1-Math.pow(.6,row.iteration))));
  maximumIterationProbabilityError=Math.max(maximumIterationProbabilityError,Math.abs(row.p[0]-expectedP0));
 }
 assert.ok(rateError<1e-7&&distortionError<1e-7,'independent binary oracle');
 points.push({muNats:mu,rateBits:result.rateBits,achievedDistortion:result.distortion,p:result.p,status:result.status,gapNats:result.gapNats,iterations:result.trace.length-1});
}
assert.ok(maximumIterationProbabilityError<1e-11,'every actual iterate agrees with independently derived recurrence');
const endpoint=C.metrics(model,[0,1],{mu:0});
assert.equal(endpoint.rateBits,0);assert.equal(endpoint.distortion,0);
const originalFigureBudgetAnchors=[0,.05,.1,.2,.4].map(D=>({allowedDistortion:D,jointRateBits:D===0?0:D>=.2?.4:.4*entropy(D/.4),paperSeparationRateBits:Math.min(D,.4)}));
assert.ok(Math.abs(originalFigureBudgetAnchors[2].jointRateBits-.32451124978365314)<1e-14);
const report={source:'https://arxiv.org/pdf/1805.05713v1',sourcePdfSha256:'4520ae9d50e55abb1d634f3396d07dfa96315266e4b40c07e46e6a8ed0d94ba2',algorithmVersion:C.VERSION,
 runtime:{node:process.version,elapsedMs:performance.now()-start,browserLatencyMeasured:false},
 scope:'General finite-alphabet BA executed on the fixed q=.4 binary Fig2 experiment. Fig3 Gaussian and finite-block codes remain uncovered.',
 method:'49 real BA solves; independent entropy/logistic and every-iteration recurrence checks. No lookup of stored optimized distributions.',
 maximumRateError,maximumDistortionError,maximumIterationProbabilityError,solverPoints:points,
 exactSensingEndpoint:{p:[0,1],rateBits:0,achievedDistortion:0,origin:'Direct evaluation of degenerate input; not a finite-mu BA output'},
 originalFigureBudgetAnchors,plateau:'For allowed D>=.2, mu=0 solver already achieves rate .4 at actual distortion .2; the larger budget is slack, not a new achieved optimum.',
 paperSeparationPolicy:'Communication-only phase does not use feedback for sensing. Published line joins (D,R)=(0,0) and (.4,.4).',
 completePaperReproduced:false};
console.log(JSON.stringify(report,null,2));
