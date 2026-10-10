/* Independent teaching model: one static monostatic path, known pilot values,
 * unknown frequency-flat complex gain, no noise/ICI/ISI. SI units internally. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Pilot=api;})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const cfg=Object.freeze({c:3e8,N:64,deltaF:1e6,maxRange:150});
  function validate(o={}){const s={q:4,offset:0,range:40,phase:0,step:.25,candidate:2.5,...o};
    if(![2,4,8].includes(s.q)||!Number.isInteger(s.offset)||s.offset<0||s.offset>=s.q||!Number.isFinite(s.range)||s.range<0||s.range>=150||!Number.isFinite(s.phase)||![.1,.25,1,2.5].includes(s.step)||!Number.isFinite(s.candidate)||s.candidate<0||s.candidate>150)throw new RangeError('Invalid pilot experiment parameters');return s;}
  function patterns(q,offset=0){return {comb:Array.from({length:cfg.N/q},(_,i)=>i*q+offset),full:Array.from({length:cfg.N},(_,i)=>i),block:Array.from({length:cfg.N/q},(_,i)=>i)};}
  function observations(pilots,range,phase=0){return pilots.map(k=>{const angle=phase-2*Math.PI*k*cfg.deltaF*2*range/cfg.c;return {k,re:Math.cos(angle),im:Math.sin(angle)};});}
  function match(data,range){if(!data.length)throw new RangeError('No pilots');let re=0,im=0;for(const h of data){const p=2*Math.PI*h.k*cfg.deltaF*2*range/cfg.c;re+=h.re*Math.cos(p)-h.im*Math.sin(p);im+=h.re*Math.sin(p)+h.im*Math.cos(p);}re/=data.length;im/=data.length;return {re,im,score:re*re+im*im};}
  function aliases(range,period,max=cfg.maxRange){const out=[];for(let n=Math.ceil(-range/period);range+n*period<max-1e-8;n++)out.push(range+n*period);return out;}
  function experiment(options={}){const s=validate(options),sets=patterns(s.q,s.offset),grid=Array.from({length:Math.round(cfg.maxRange/s.step)+1},(_,i)=>i*s.step),rows={};
    for(const [key,p]of Object.entries(sets)){const data=observations(p,s.range,s.phase),spacing=key==='comb'?s.q:1;rows[key]={pilots:p,data,count:p.length,spanMHz:(p.at(-1)-p[0])*cfg.deltaF/1e6,period:cfg.c/(2*spacing*cfg.deltaF),firstNull:cfg.c/(2*p.length*spacing*cfg.deltaF),scores:grid.map(r=>match(data,r).score),selected:match(data,s.candidate)};}
    return {...s,grid,rows,aliases:aliases(s.range,rows.comb.period)};
  }
  return {cfg,validate,patterns,observations,match,aliases,experiment};
});
