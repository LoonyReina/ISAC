/* Independent noise-free, one-way, broadside ULA spatial matching.
 * Equal element amplitudes, unknown common complex gain; SI units.
 * No paper optimizer, MUSIC, CRB, estimator or pathloss simulation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NearField=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const cfg=Object.freeze({lambda:.01,d:.005,counts:Object.freeze([33,65,129]),minTruth:4,maxTruth:40,minCandidate:2,maxCandidate:80,step:.1});
function positive(r){if(!Number.isFinite(r)||r<=0)throw new RangeError('Range must be finite and positive');}
function positions(N){if(!cfg.counts.includes(N))throw new RangeError('Unsupported array size');return Array.from({length:N},(_,n)=>(n-(N-1)/2)*cfg.d);}
function pathDifference(x,r,theta=0){positive(r);if(!Number.isFinite(x)||!Number.isFinite(theta))throw new RangeError('Invalid geometry');const s=Math.sin(theta),ell=Math.hypot(x-r*s,r*Math.cos(theta));return (x*x-2*r*x*s)/(ell+r);}
function steering(N,r,{plane=false,phase=0}={}){positive(r);if(!Number.isFinite(phase))throw new RangeError('Invalid phase');return positions(N).map(x=>{const angle=phase-(plane?0:2*Math.PI/cfg.lambda*pathDifference(x,r));return {x,phase:angle,re:Math.cos(angle),im:Math.sin(angle)};});}
function coherence(a,b){if(!a.length||a.length!==b.length)throw new RangeError('Array lengths must match');let re=0,im=0,ea=0,eb=0;for(let i=0;i<a.length;i++){re+=a[i].re*b[i].re+a[i].im*b[i].im;im+=a[i].re*b[i].im-a[i].im*b[i].re;ea+=a[i].re**2+a[i].im**2;eb+=b[i].re**2+b[i].im**2;}if(!(ea>0&&eb>0))throw new RangeError('Zero array energy');const value=(re*re+im*im)/(ea*eb);return Math.min(1,Math.max(0,value));}
function metrics(N,r){positive(r);const xs=positions(N),D=(N-1)*cfg.d,k=2*Math.PI/cfg.lambda;
// Broadside q = k(1-r/ell) = k Delta-ell/ell avoids subtracting near-equal values.
const q=xs.map(x=>k*pathDifference(x,r)/Math.hypot(r,x)),mean=q.reduce((a,b)=>a+b,0)/N,kappa=q.reduce((a,b)=>a+(b-mean)**2,0)/N;
return {D,rayleigh:2*D*D/cfg.lambda,rangeToAperture:r/D,kappa,planeMatch:coherence(steering(N,r),steering(N,r,{plane:true}))};}
function experiment(options={}){const s={N:129,range:4,...options};if(!cfg.counts.includes(s.N)||!Number.isFinite(s.range)||s.range<cfg.minTruth||s.range>cfg.maxTruth)throw new RangeError('Invalid experiment parameters');const truth=steering(s.N,s.range),plane=steering(s.N,s.range,{plane:true}),m=metrics(s.N,s.range),grid=Array.from({length:781},(_,i)=>cfg.minCandidate+i*cfg.step);
// Include exact truth in addition to uniform grid so the displayed peak is never a grid artifact.
const truthIndex=grid.findIndex(r=>Math.abs(r-s.range)<1e-10);if(truthIndex>=0)grid[truthIndex]=s.range;else grid.push(s.range);grid.sort((a,b)=>a-b);
const curves=grid.map(r=>({r,nn:coherence(steering(s.N,r),truth),nf:coherence(plane,truth),ff:coherence(plane,plane)}));
return {...s,...m,truth,curves};}
return {cfg,positions,pathDifference,steering,coherence,metrics,experiment};
});
