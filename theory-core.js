/* Shared observation lesson. Real, normalized baseband; Ts in ns.
   This finite, integer-delay experiment is not a continuous-time radar simulator. */
(function(root){
  'use strict';
  const BARKER=Object.freeze([1,1,1,1,1,-1,-1,1,1,-1,1,-1,1]);
  const cfg=Object.freeze({samples:32,maxDelay:12,TsNs:10,c:3e8,energy:13});
  function integer(v,min,max,name){if(!Number.isInteger(v)||v<min||v>max)throw new RangeError(name);}
  function template(delay,bit=1){
    integer(delay,0,cfg.maxDelay,'delay');if(bit!==1&&bit!==-1)throw new RangeError('bit');
    return Array.from({length:cfg.samples},(_,n)=>bit*(BARKER[n-delay]||0));
  }
  function noise(seed=7){
    integer(seed,0,4294967295,'seed'); let state=seed>>>0;
    const uniform=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return (state+.5)/4294967296;};
    return Array.from({length:cfg.samples},()=>Math.sqrt(-2*Math.log(uniform()))*Math.cos(2*Math.PI*uniform()));
  }
  const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
  function experiment({mode='sensing',delay=5,bit=1,sigma=0,seed=7}={}){
    if(mode!=='sensing'&&mode!=='communication')throw new RangeError('mode');
    if(!Number.isFinite(sigma)||sigma<0||sigma>2)throw new RangeError('sigma');
    const truth=template(delay,mode==='sensing'?1:bit),z=noise(seed),y=truth.map((v,i)=>v+sigma*z[i]);
    const candidates=mode==='sensing'?Array.from({length:cfg.maxDelay+1},(_,d)=>d):[-1,1];
    const scores=candidates.map(candidate=>{
      const s=template(mode==='sensing'?candidate:delay,mode==='sensing'?1:candidate);
      const corr=dot(y,s),gain=corr/cfg.energy;
      // Sensing: profile least squares over unknown real gain; divide by E again
      // only to show a unitless gain-squared score with a noiseless peak of one.
      const score=mode==='sensing'?corr*corr/(cfg.energy*cfg.energy):-y.reduce((e,v,i)=>e+(v-s[i])**2,0)/cfg.energy;
      return {candidate,score,gain,template:s};
    });
    const best=scores.reduce((a,b)=>b.score>a.score?b:a);
    return {mode,delay,bit:mode==='sensing'?1:bit,sigma,seed,truth,y,scores,best,
      tauNs:mode==='sensing'?best.candidate*cfg.TsNs:null,rangeM:mode==='sensing'?best.candidate*cfg.TsNs*1e-9*cfg.c/2:null};
  }
  function crbComparison(T=8,P=1,sigma2=1){
    integer(T,3,1000000,'T');
    if(!Number.isFinite(P)||P<=0||!Number.isFinite(sigma2)||sigma2<=0)throw new RangeError('positive power and noise variance required');
    return {fixed:sigma2/(T*P),gaussian:sigma2/(P*(T-2)),meanInformation:T*P/sigma2};
  }
  const api={BARKER,cfg,template,noise,experiment,crbComparison};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Theory=api;
})(typeof globalThis!=='undefined'?globalThis:this);
