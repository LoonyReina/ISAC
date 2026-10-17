'use strict';
// Independent teaching model scalar adapter only, not paper-faithful network code.
function logadd(a,b) { if(a === -Infinity) return b; if(b === -Infinity) return a; const hi=Math.max(a,b); return hi+Math.log1p(Math.exp(Math.min(a,b)-hi)); }
function load(m,psi) {
 if(typeof m!=='number'||!Number.isFinite(m)||m<0||m>100||!Number.isInteger(psi)||psi<1||psi>32) throw new RangeError('m in [0,100], integer capacity in [1,32] required');
 if(m===0) return {acceptance:1,rejection:0,logRejection:-Infinity,rejectionPositive:false,rejectionUnderflow:false,iterations:0};
 let lf=0; for(let j=2;j<=psi;j++) lf+=Math.log(j);
 const lm=Math.log(m); let k=psi, lp=-m+psi*lm-lf, lr=-Infinity, lb;
 for(;;) {
  lr=logadd(lr,lp+Math.log(k+1-psi)-Math.log(k+1));
  const ln=lp+lm-Math.log(k+1), ratio=m/(k+2);
  lb=ratio<1?ln-Math.log1p(-ratio):Infinity;
  if(lb<=lr+Math.log(1e-15)) break;
  lp=ln; if(++k>10000) throw new Error('Poisson tail convergence failed');
 }
 if(lr>0) throw new Error('Invalid rejection probability');
 const rejection=Math.exp(lr);
 return {acceptance:-Math.expm1(lr),rejection,logRejection:lr,rejectionPositive:true,rejectionUnderflow:rejection===0,iterations:k-psi+1,logTailEstimate:lb};
}
module.exports={load};
