/* Genuine finite 2-D Toeplitz SDP, arXiv:1610.04218v2 Eq27.
 * Independently derived exact joint block Eq35; source inconsistencies documented.
 * No discretized frequency dictionary in optimization. Pre-review numerical port.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtomicReceiverCore=api;})(typeof self!=='undefined'?self:globalThis,function(){
'use strict';
const VERSION='atomic-eq27-js-v0.1-pre-review';
const EIG_TOL=1e-12;
const now=()=>typeof performance!=='undefined'?performance.now():Date.now();
const norm=x=>{let a=0;for(const v of x)a+=v*v;return Math.sqrt(a);};
function finiteNumber(x,name){if(typeof x!=='number'||!Number.isFinite(x))throw new Error(name+' must be finite');return x;}
function unpack(v,n,name){if(!v||!Array.isArray(v.re)||!Array.isArray(v.im)||v.re.length!==n||v.im.length!==n)throw new Error(name+' complex shape');const a=new Float64Array(2*n);for(let i=0;i<n;i++){a[2*i]=finiteNumber(v.re[i],name);a[2*i+1]=finiteNumber(v.im[i],name);}return a;}
function pack(a){const re=[],im=[];for(let i=0;i<a.length;i+=2){re.push(a[i]);im.push(a[i+1]);}return {re,im};}
function shrink(re,im,t){const m=Math.hypot(re,im),f=m>t?1-t/m:0;if(!Number.isFinite(m)||!Number.isFinite(t)||(t>0&&m>t&&f===1))throw new Error('Numerical scale prevents resolving the regularizer');return [re*f,im*f];}
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
function createSolver(input,options={}){
 const allowed=new Set(['M','N','r','s','lambda','mu']);for(const k of Object.keys(input||{}))if(!allowed.has(k))throw new Error('Unsupported receiver input '+k);
 const M=input.M,N=input.N;if(!Number.isInteger(M)||!Number.isInteger(N)||M<1||N<1||M*N>16)throw new Error('Bounded core requires positive integer M*N <=16');
 const D=M*N,P=D+1,L=(2*M-1)*(2*N-1),center=M-1+(2*M-1)*(N-1),lam=finiteNumber(input.lambda,'lambda'),mu=finiteNumber(input.mu,'mu');
 const r=unpack(input.r,D,'r'),s=unpack(input.s,D,'s');
 const opts=Object.assign({rho:.05,maxIter:30000,atol:1e-9,rtol:1e-8,recordEvery:50,eigTol:1e-12,eigMaxSweeps:80,fixedError:false},options);
 const okSettings=new Set(['rho','maxIter','atol','rtol','recordEvery','eigTol','eigMaxSweeps','fixedError']);for(const k of Object.keys(options))if(!okSettings.has(k))throw new Error('Unsupported setting '+k);
 for(const k of ['rho','atol','rtol','eigTol'])if(!(finiteNumber(opts[k],k)>0))throw new Error(k+' must be positive');
 if(opts.eigTol!==EIG_TOL)throw new Error('eigTol is fixed at the validated 1e-12');
 for(const k of ['maxIter','recordEvery','eigMaxSweeps'])if(!Number.isInteger(opts[k])||opts[k]<1)throw new Error(k+' must be a positive integer');
 if(opts.maxIter>100000||opts.eigMaxSweeps>200||typeof opts.fixedError!=='boolean'||lam<=0||mu<0||(!opts.fixedError&&mu===0))throw new Error('Invalid objective or bounded solver settings');
 const rho=opts.rho,beta=2*rho,index=new Int32Array(D*D),count=new Int32Array(L);
 for(let i=0;i<D;i++)for(let j=0;j<D;j++){const k=(i%M-j%M+M-1)+(2*M-1)*(Math.floor(i/M)-Math.floor(j/M)+N-1);index[i*D+j]=k;count[k]++;}
 let z=new Float64Array(2*D),e=new Float64Array(2*D),Theta=new Float64Array(2*P*P),G=new Float64Array(2*P*P),B=new Float64Array(2*P*P),nu=new Float64Array(2*D),t=0;
 let iterations=0,status='running',failureReason=null,trace=[],last=null,eigenMilliseconds=0,eigenSweeps=0;const started=now();
 function iterate(){
  const zn=new Float64Array(2*D),en=new Float64Array(2*D),u=new Float64Array(2*L);
  for(let i=0;i<D;i++){
   const j=2*i,k=2*(i*P+D),ar=Theta[k]+G[k]/rho,ai=Theta[k+1]+G[k+1]/rho,sr=s[j],si=s[j+1],q=sr*sr+si*si;
   if(!opts.fixedError){const rr=r[j]-(sr*ar-si*ai),ri=r[j+1]-(sr*ai+si*ar),shr=shrink(rr,ri,mu*(q+beta)/beta);en[j]=shr[0];en[j+1]=shr[1];}
   const rr=r[j]-en[j],ri=r[j+1]-en[j+1];zn[j]=(sr*rr+si*ri+beta*ar)/(q+beta);zn[j+1]=(sr*ri-si*rr+beta*ai)/(q+beta);
  }
  for(let i=0;i<D;i++)for(let j=0;j<D;j++){const k=2*(i*P+j),lag=2*index[i*D+j];u[lag]+=Theta[k]+G[k]/rho;u[lag+1]+=Theta[k+1]+G[k+1]/rho;}
  for(let k=0;k<L;k++){u[2*k]/=count[k];u[2*k+1]/=count[k];}u[2*center]-=lam/(2*D*rho);
  t=Theta[2*(P*P-1)]+G[2*(P*P-1)]/rho-lam/(2*rho);
  B=new Float64Array(2*P*P);
  for(let i=0;i<D;i++){
   for(let j=0;j<D;j++){const k=2*(i*P+j),lag=2*index[i*D+j];B[k]=u[lag];B[k+1]=u[lag+1];}
   const up=2*(i*P+D),dn=2*(D*P+i);B[up]=B[dn]=zn[2*i];B[up+1]=zn[2*i+1];B[dn+1]=-zn[2*i+1];
  }B[2*(P*P-1)]=t;
  const H=new Float64Array(B.length);for(let i=0;i<H.length;i++)H[i]=B[i]-G[i]/rho;
  const et=now(),projection=projectPSD(H,P,{tol:opts.eigTol,maxSweeps:opts.eigMaxSweeps});eigenMilliseconds+=now()-et;eigenSweeps+=projection.eigensweeps;const next=projection.matrix;
  let rp=0,rd=0;for(let i=0;i<G.length;i++){const diff=next[i]-B[i],ds=next[i]-Theta[i];rp+=diff*diff;rd+=ds*ds;G[i]+=rho*diff;}
  Theta=next;z=zn;e=en;iterations++;
  const primal=Math.sqrt(rp),dual=rho*Math.sqrt(rd),epsp=opts.atol*P+opts.rtol*Math.max(1,norm(B),norm(Theta)),epsd=opts.atol*P+opts.rtol*Math.max(1,norm(G));
  let objData=0,enorm=0,zstat=0,estat=0;
  for(let i=0;i<D;i++){
   const j=2*i,sr=s[j],si=s[j+1],zr=z[j],zi=z[j+1],rr=r[j]-e[j]-(sr*zr-si*zi),ri=r[j+1]-e[j+1]-(sr*zi+si*zr);
   nu[j]=sr*rr+si*ri;nu[j+1]=sr*ri-si*rr;objData+=(rr*rr+ri*ri)/2;enorm+=Math.hypot(e[j],e[j+1]);const k=2*(i*P+D);zstat+=(nu[j]+2*G[k])**2+(nu[j+1]+2*G[k+1])**2;
   if(!opts.fixedError){const shr=shrink(rr+e[j],ri+e[j+1],mu);estat+=(e[j]-shr[0])**2+(e[j+1]-shr[1])**2;}
  }
  zstat=Math.sqrt(zstat);estat=Math.sqrt(estat);
  const objective=objData+lam*(u[2*center]+t)/2+mu*enorm;
  if(![objective,primal,dual,epsp,epsd,zstat,estat,projection.eigenResidual].every(Number.isFinite))throw new Error('Nonfinite solver diagnostics');
  const projectionAccuracyLimit=.1*Math.min(epsp,epsd/rho),projectionAccurate=projection.eigenResidual<=projectionAccuracyLimit;
  if(primal<=epsp&&dual<=epsd&&Math.max(zstat,estat)<=Math.max(10*epsd,1e-8)&&projectionAccurate)status='converged';else if(iterations>=opts.maxIter)status='max_iter';
  last={iteration:iterations,objective,primal,dual,primalTolerance:epsp,dualTolerance:epsd,zStationarity:zstat,eStationarity:estat,rho,elapsedMs:now()-started,eigenResidual:projection.eigenResidual,eigenTolerance:projection.eigenTolerance,projectionAccuracyLimit,projectionAccurate};
  if(iterations===1||iterations%opts.recordEvery===0||status!=='running')trace.push({...last});
 }
 function step(countSteps=1){if(!Number.isInteger(countSteps)||countSteps<1||countSteps>10000)throw new Error('Invalid step count');try{for(let k=0;k<countSteps&&status==='running';k++)iterate();}catch(e){status='numerical_failure';failureReason=String(e.message);throw e;}return {version:VERSION,status,iterations,last:last?{...last}:null};}
 function cancel(){if(status==='running')status='cancelled';return {status,iterations};}
 function snapshot(includeMatrices=false){
  const out={version:VERSION,status,failureReason,iterations,M,N,PSDComplexDimension:P,settings:{...opts},z:pack(z),e:pack(e),nu:pack(nu),t,last:last?{...last}:null,trace:trace.map(v=>({...v})),runtimeMs:now()-started,eigenMilliseconds,eigenSweeps,objectiveInterpretation:'Affine-iterate objective; intermediate iterates may violate PSD and are not feasible objective bounds',continuousAtomicNormEquivalenceCertified:false};
  if(includeMatrices){const T=new Float64Array(2*D*D);for(let i=0;i<D;i++)for(let j=0;j<D;j++){T[2*(i*D+j)]=B[2*(i*P+j)];T[2*(i*D+j)+1]=B[2*(i*P+j)+1];}out.T=pack(T);out.Theta=pack(Theta);out.multiplier=pack(G);out.matrixOrder='row-major';out.minLiftedEigenvalue=projectPSD(B,P,{tol:opts.eigTol,maxSweeps:opts.eigMaxSweeps}).minInputEigenvalue;}
  return out;
 }
 return {step,snapshot,cancel,get status(){return status;},get iterations(){return iterations;}};
}
return {VERSION,createSolver,projectPSD,eigSymmetric,pack,unpack};
});
