/* Velocity matching of OBSERVED complex samples, not target ground truth.
   Monostatic, coherent, uniform slow-time sampling; approaching speed positive.
   Both this direct sum and course-core.dft use the 1/M normalization. */
(function(root){
 'use strict';
 const TAU=2*Math.PI;
 function check(z,Tr,lambda){
  if(!Array.isArray(z)||z.length<2||!z.every(a=>a&&Number.isFinite(a.re)&&Number.isFinite(a.im)))throw new TypeError('At least two finite complex samples required');
  if(!(Tr>0)||!Number.isFinite(Tr)||!(lambda>0)||!Number.isFinite(lambda))throw new RangeError('Positive finite Tr and wavelength required');
 }
 function match(z,v,Tr,lambda){
  check(z,Tr,lambda);if(!Number.isFinite(v))throw new RangeError('Finite candidate speed required');
  const M=z.length,fd=2*v/lambda,step=TAU*fd*Tr,rotated=[],partial=[];
  let re=0,im=0,energy=0;
  for(let m=0;m<M;m++){
   const c=Math.cos(-m*step),s=Math.sin(-m*step),a=z[m];
   const b={re:a.re*c-a.im*s,im:a.re*s+a.im*c};rotated.push(b);
   re+=b.re/M;im+=b.im/M;energy+=(a.re*a.re+a.im*a.im)/M;
   partial.push({re,im});
  }
  const power=re*re+im*im;
  return {fd,step,rotated,partial,sum:{re,im},power,energy,coherence:energy>1e-20?power/energy:null};
 }
 function grid(z,Tr,lambda){
  check(z,Tr,lambda);const M=z.length,first=-Math.floor(M/2);
  return Array.from({length:M},(_,i)=>{
   const d=first+i,q=(d+M)%M,fd=d/(M*Tr),v=lambda*fd/2;
   return {d,q,fd,v,...match(z,v,Tr,lambda)};
  });
 }
 function adjacent(z,Tr,lambda){
  check(z,Tr,lambda);const a=z[0],b=z[1];
  if(Math.hypot(a.re,a.im)<1e-10||Math.hypot(b.re,b.im)<1e-10)return null;
  const re=b.re*a.re+b.im*a.im,im=b.im*a.re-b.re*a.im;
  const phase=Math.atan2(im,re),fd=phase/(TAU*Tr);
  return {phase,fd,v:lambda*fd/2};
 }
 const api={match,grid,adjacent};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VelocityMatch=api;
})(typeof globalThis!=='undefined'?globalThis:this);
