/* All plotted values are recomputed from the committed complex arrays. */
(function(root){'use strict';
 const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],conj=a=>[a[0],-a[1]],abs2=a=>a[0]*a[0]+a[1]*a[1];
 const adj=A=>A[0].map((_,j)=>A.map(r=>conj(r[j])));
 const product=(A,B)=>A.map(row=>B[0].map((_,j)=>row.reduce((v,a,k)=>add(v,mul(a,B[k][j])),[0,0])));
 const norm2=A=>A.reduce((v,r)=>v+r.reduce((w,z)=>w+abs2(z),0),0);
 const diff=(A,B)=>A.map((r,i)=>r.map((z,j)=>[z[0]-B[i][j][0],z[1]-B[i][j][1]]));
 function evaluate(H,S,R,X,lowerBound){
  const L=X[0].length,Y=product(H,X),errors=diff(Y,S),cov=product(X,adj(X)).map(r=>r.map(z=>z.map(v=>v/L))),error=norm2(errors);
  const angles=Array.from({length:181},(_,i)=>i-90);
  const pattern=angles.map(deg=>{const a=X.map((_,n)=>{const p=Math.PI*n*Math.sin(deg*Math.PI/180);return [Math.cos(p),Math.sin(p)];});return product([a.map(conj)],product(cov,a.map(z=>[z])))[0][0][0];});
  return {Y,errors,cov,angles,pattern,error,mse:error/(S.length*L),energy:norm2(X),covarianceResidual:Math.sqrt(norm2(diff(cov,R))),boundResidual:error-lowerBound};
 }
 const api={add,mul,conj,abs2,adj,product,norm2,diff,evaluate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WaveformCore=api;
})(typeof window!=='undefined'?window:globalThis);
