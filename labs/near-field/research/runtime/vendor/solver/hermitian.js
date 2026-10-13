/* Reused validated real symmetric Jacobi/complex PSD projection; source provenance in LINALG-PROVENANCE.json. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.JointHermitian=api;})(typeof self!=='undefined'?self:globalThis,function(){'use strict';
const EIG_TOL=1e-12;const norm=x=>{let s=0;for(const v of x)s+=v*v;return Math.sqrt(s);};
function eigSymmetric(input,n,tol=1e-12,maxSweeps=80){
 if(tol!==EIG_TOL)throw new Error('Eigensolver tolerance is fixed at the validated 1e-12');
 if(!Number.isInteger(n)||n<1||n>34||input.length!==n*n||!Number.isFinite(tol)||tol<=0||!Number.isInteger(maxSweeps)||maxSweeps<1||maxSweeps>200)throw new Error('Invalid eigensolver dimensions/settings');
 for(const v of input)if(!Number.isFinite(v))throw new Error('Nonfinite eigensolver matrix');
 for(let i=0;i<n;i++)for(let j=0;j<i;j++)if(Math.abs(input[i*n+j]-input[j*n+i])>1e-12*Math.max(1,Math.abs(input[i*n+j]),Math.abs(input[j*n+i])))throw new Error('Eigensolver requires symmetric matrix');
 const A=new Float64Array(input),V=new Float64Array(n*n);for(let i=0;i<n;i++)V[i*n+i]=1;
 const matrixNorm=norm(A);if(!Number.isFinite(matrixNorm))throw new Error('Eigensolver matrix scale overflow');
 const target=tol*Math.max(1,matrixNorm),skip=target/(2*n);let off=Infinity,sweep=0;
 function offnorm(){let q=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)q+=2*A[i*n+j]**2;return Math.sqrt(q);}
 off=offnorm();
 while(off>target&&sweep<maxSweeps){
  for(let p=0;p<n-1;p++)for(let q=p+1;q<n;q++){
   const b=A[p*n+q];if(Math.abs(b)<=skip)continue;
   const delta=(A[q*n+q]-A[p*n+p])/2;
   const t=(delta>=0?b:-b)/(Math.abs(delta)+Math.hypot(delta,b));
   const c=1/Math.sqrt(1+t*t),s=t*c;
   const app=A[p*n+p],aqq=A[q*n+q];
   for(let k=0;k<n;k++)if(k!==p&&k!==q){const ap=A[k*n+p],aq=A[k*n+q],vp=c*ap-s*aq,vq=s*ap+c*aq;A[k*n+p]=A[p*n+k]=vp;A[k*n+q]=A[q*n+k]=vq;}
   A[p*n+p]=app-t*b;A[q*n+q]=aqq+t*b;A[p*n+q]=A[q*n+p]=0;
   for(let k=0;k<n;k++){const vp=V[k*n+p],vq=V[k*n+q];V[k*n+p]=c*vp-s*vq;V[k*n+q]=s*vp+c*vq;}
  }
  sweep++;off=offnorm();
 }
 const values=new Float64Array(n);for(let i=0;i<n;i++){values[i]=A[i*n+i];if(!Number.isFinite(values[i]))throw new Error('Eigensolver numerical overflow');}
 return {values,vectors:V,sweeps:sweep,offDiagonalNorm:off,tolerance:target,converged:off<=target};
}
function projectPSD(matrix,size,{tol=1e-12,maxSweeps=80}={}){
 if(!Number.isInteger(size)||size<1||size>17||matrix.length!==2*size*size)throw new Error('PSD shape');
 for(const v of matrix)if(!Number.isFinite(v))throw new Error('Nonfinite PSD matrix');
 const n=2*size,A=new Float64Array(n*n);
 for(let i=0;i<size;i++)for(let j=0;j<size;j++){
  const ij=2*(i*size+j),ji=2*(j*size+i),re=(matrix[ij]+matrix[ji])/2,im=(matrix[ij+1]-matrix[ji+1])/2;
  A[i*n+j]=re;A[(i+size)*n+j+size]=re;A[i*n+j+size]=-im;A[(i+size)*n+j]=im;
 }
 const eig=eigSymmetric(A,n,tol,maxSweeps);if(!eig.converged)throw new Error('PSD eigensolver did not converge');
 const R=new Float64Array(n*n),V=eig.vectors;
 for(let k=0;k<n;k++){const d=Math.max(0,eig.values[k]);if(d===0)continue;for(let i=0;i<n;i++){const f=d*V[i*n+k];for(let j=0;j<=i;j++)R[i*n+j]+=f*V[j*n+k];}}
 for(let i=0;i<n;i++)for(let j=0;j<i;j++)R[j*n+i]=R[i*n+j];
 const out=new Float64Array(2*size*size);for(let i=0;i<size;i++)for(let j=0;j<size;j++){const ij=2*(i*size+j);out[ij]=(R[i*n+j]+R[(i+size)*n+j+size])/2;out[ij+1]=(R[(i+size)*n+j]-R[i*n+j+size])/2;}
 return {matrix:out,minInputEigenvalue:Math.min(...eig.values),eigensweeps:eig.sweeps,eigenResidual:eig.offDiagonalNorm,eigenTolerance:eig.tolerance};
}

return {eigSymmetric,projectPSD};});
