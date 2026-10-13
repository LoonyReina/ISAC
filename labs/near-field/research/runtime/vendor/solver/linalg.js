/* Unchanged utility functions extracted from the reviewed joint kernel; provenance recorded. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CrbLinearAlgebra=api;})(typeof self!=='undefined'?self:globalThis,function(){'use strict';const SQRT2=Math.SQRT2;
function norm(v){let s=0;for(const a of v)s+=a*a;return Math.sqrt(s);}
function inf(v){let s=0;for(const a of v)s=Math.max(s,Math.abs(a));return s;}
function dot(a,b){let v=0;for(let i=0;i<a.length;i++)v+=a[i]*b[i];return v;}
function finite(v,name){if(typeof v!=='number'||!Number.isFinite(v))throw Error(name+' must be finite');return v;}
function coordinates(R,m){const x=new Float64Array(m*m);let p=0;for(let i=0;i<m;i++)x[p++]=R[2*(i*m+i)];for(let i=0;i<m;i++)for(let j=i+1;j<m;j++)x[p++]=SQRT2*R[2*(i*m+j)];for(let i=0;i<m;i++)for(let j=i+1;j<m;j++)x[p++]=SQRT2*R[2*(i*m+j)+1];return x;}
function matrix(x,m,start=0){const R=new Float64Array(2*m*m);let p=start;for(let i=0;i<m;i++)R[2*(i*m+i)]=x[p++];for(let i=0;i<m;i++)for(let j=i+1;j<m;j++)R[2*(i*m+j)]=R[2*(j*m+i)]=x[p++]/SQRT2;for(let i=0;i<m;i++)for(let j=i+1;j<m;j++){const v=x[p++]/SQRT2;R[2*(i*m+j)+1]=v;R[2*(j*m+i)+1]=-v;}return R;}
function pack(A,r,c){const real=[],imag=[];for(let i=0;i<r;i++){real[i]=[];imag[i]=[];for(let j=0;j<c;j++){real[i][j]=A[2*(i*c+j)];imag[i][j]=A[2*(i*c+j)+1];}}return {real,imag};}
function unpack(H,k,m){if(!H||!Array.isArray(H.real)||!Array.isArray(H.imag)||H.real.length!==k||H.imag.length!==k)throw Error('H shape');const out=new Float64Array(2*k*m);for(let i=0;i<k;i++){if(H.real[i].length!==m||H.imag[i].length!==m)throw Error('H shape');for(let j=0;j<m;j++){out[2*(i*m+j)]=finite(H.real[i][j],'H real');out[2*(i*m+j)+1]=finite(H.imag[i][j],'H imaginary');if(Math.hypot(out[2*(i*m+j)],out[2*(i*m+j)+1])>10)throw Error('Bounded channel entries require magnitude <=10');}}return out;}
function mul(A,B,r,n,c){const C=new Float64Array(2*r*c);for(let i=0;i<r;i++)for(let k=0;k<n;k++){const ar=A[2*(i*n+k)],ai=A[2*(i*n+k)+1];for(let j=0;j<c;j++){const br=B[2*(k*c+j)],bi=B[2*(k*c+j)+1];C[2*(i*c+j)]+=ar*br-ai*bi;C[2*(i*c+j)+1]+=ar*bi+ai*br;}}return C;}
function adj(A,r,c){const B=new Float64Array(A.length);for(let i=0;i<r;i++)for(let j=0;j<c;j++){B[2*(j*r+i)]=A[2*(i*c+j)];B[2*(j*r+i)+1]=-A[2*(i*c+j)+1];}return B;}
function covariance(W,m,c){return mul(W,adj(W,m,c),m,c,m);}
function functional(left,right,m){ // left row * R * conjugate(right row), as complex Hermitian-coordinate coefficients
 const re=new Float64Array(m*m),im=new Float64Array(m*m);let p=0;
 function z(i,j){const a=left[2*i],b=left[2*i+1],c=right[2*j],d=right[2*j+1];return [a*c+b*d,b*c-a*d];}
 for(let i=0;i<m;i++){const t=z(i,i);re[p]=t[0];im[p++]=t[1];}
 for(let i=0;i<m;i++)for(let j=i+1;j<m;j++){const a=z(i,j),b=z(j,i);re[p]=(a[0]+b[0])/SQRT2;im[p++]=(a[1]+b[1])/SQRT2;}
 for(let i=0;i<m;i++)for(let j=i+1;j<m;j++){const a=z(i,j),b=z(j,i);re[p]=-(a[1]-b[1])/SQRT2;im[p++]=(a[0]-b[0])/SQRT2;}
 return {re,im};
}
function chol(A,n,pivotFloor=1e-14){const L=new Float64Array(n*n);for(let i=0;i<n;i++)for(let j=0;j<=i;j++){let s=A[i*n+j];for(let k=0;k<j;k++)s-=L[i*n+k]*L[j*n+k];if(i===j){if(!(s>pivotFloor)||!Number.isFinite(s))throw Error('Quadratic factorization failed');L[i*n+j]=Math.sqrt(s);}else L[i*n+j]=s/L[j*n+j];}return L;}
function cholSolve(L,b,n){const x=new Float64Array(b);for(let i=0;i<n;i++){let s=x[i];for(let j=0;j<i;j++)s-=L[i*n+j]*x[j];x[i]=s/L[i*n+i];}for(let i=n-1;i>=0;i--){let s=x[i];for(let j=i+1;j<n;j++)s-=L[j*n+i]*x[j];x[i]=s/L[i*n+i];}return x;}
return {norm,inf,dot,finite,coordinates,matrix,pack,unpack,mul,adj,covariance,functional,chol,cholSolve};});
