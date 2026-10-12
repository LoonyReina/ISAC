/* arXiv:1711.05220v1 Section IV Eq16-25, fresh-input bounded numerical core.
 * Source eigensecular algorithm via an exact real representation of complex Q.
 * Explicit hard-case extension and optional radar-closest secondary tie break.
 * No external dependencies, stored solutions, UI state, or strict solver copy.
 */
(function(root){'use strict';
const VERSION='weighted-eq16-real-jacobi-secular-v0.2';
const EPS=Number.EPSILON, now=()=>typeof performance!=='undefined'?performance.now():Date.now();
const LIMITS=Object.freeze({maxAntennas:32,maxUsers:32,maxSnapshots:128,maxEntryMagnitude:1e6,
 minPositiveBlockEnergy:1e-12,maxBlockEnergy:1e12,maxJacobiSweeps:100,maxSecularIterations:1075,
 energyRelativeTolerance:2e-10,kktRelativeTolerance:2e-9,gapRelativeTolerance:2e-9});
class InputError extends Error{constructor(m){super(m);this.name='InputError';}}
class NumericalError extends Error{constructor(m){super(m);this.name='NumericalError';}}
function norm(a){let s=0;for(const v of a)s=Math.hypot(s,v);return s;}
function dot(a,b){let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s;}
function finiteOutput(v){if(typeof v==='number'&&!Number.isFinite(v))throw new NumericalError('Nonfinite output');if(v&&typeof v==='object')for(const x of Object.values(v))finiteOutput(x);}
function matrix(x,name,maxRows,maxCols,output=false){
 if(!Array.isArray(x)||!x.length||!Array.isArray(x[0])||!x[0].length)throw new InputError(name+' must be a nonempty complex matrix');
 const m=x.length,n=x[0].length;if(m>maxRows||n>maxCols)throw new InputError(name+' exceeds dimension limits');
 const cap=LIMITS.maxEntryMagnitude*(output?1+64*EPS*Math.max(m,n):1),re=new Float64Array(m*n),im=new Float64Array(m*n);
 for(let i=0;i<m;i++){if(!Array.isArray(x[i])||x[i].length!==n)throw new InputError(name+' must be rectangular');for(let j=0;j<n;j++){
  const z=x[i][j];if(!Array.isArray(z)||z.length!==2||typeof z[0]!=='number'||typeof z[1]!=='number'||!Number.isFinite(z[0])||!Number.isFinite(z[1]))throw new InputError(name+' needs finite [real,imaginary] entries');
  if(Math.hypot(z[0],z[1])>cap)throw new InputError(name+' exceeds input magnitude limit');re[i*n+j]=z[0];im[i*n+j]=z[1];
 }}return {re,im,m,n};
}
function pack(re,im,m,n){return Array.from({length:m},(_,i)=>Array.from({length:n},(_,j)=>[re[i*n+j],im[i*n+j]]));}
function prepare(Hin,Sin,Xin,rho,Pt){
 const H=matrix(Hin,'H',32,32),S=matrix(Sin,'S',32,128),X0=matrix(Xin,'X0',32,128),N=H.n,K=H.m,L=S.n;
 if(S.m!==K||X0.m!==N||X0.n!==L)throw new InputError('Incompatible H/S/X0 dimensions');
 if(typeof rho!=='number'||!Number.isFinite(rho)||rho<0||rho>1)throw new InputError('rho must be in [0,1]');
 if(typeof Pt!=='number'||!Number.isFinite(Pt)||Pt<0)throw new InputError('Pt must be nonnegative and finite');
 const E=L*Pt;if(!Number.isFinite(E)||E>1e12||(E>0&&E<1e-12))throw new InputError('Block energy outside numerical contract');
 return {H,S,X0,N,K,L,rho,Pt,E};
}
function parts(p){const {H,S,X0,N,K,L,rho}=p,Qre=new Float64Array(N*N),Qim=new Float64Array(N*N),Gre=new Float64Array(N*L),Gim=new Float64Array(N*L);
 for(let i=0;i<N;i++)for(let j=i;j<N;j++){let re=0,im=0;for(let k=0;k<K;k++){
  const a=k*N+i,b=k*N+j;re+=H.re[a]*H.re[b]+H.im[a]*H.im[b];im+=H.re[a]*H.im[b]-H.im[a]*H.re[b];
 }re=rho*re+(i===j?1-rho:0);im=i===j?0:rho*im;Qre[i*N+j]=Qre[j*N+i]=re;Qim[i*N+j]=im;Qim[j*N+i]=-im;}
 for(let i=0;i<N;i++)for(let j=0;j<L;j++){let re=0,im=0;for(let k=0;k<K;k++){
  const a=k*N+i,b=k*L+j;re+=H.re[a]*S.re[b]+H.im[a]*S.im[b];im+=H.re[a]*S.im[b]-H.im[a]*S.re[b];
 }Gre[i*L+j]=rho*re+(1-rho)*X0.re[i*L+j];Gim[i*L+j]=rho*im+(1-rho)*X0.im[i*L+j];}
 const c=rho*(dot(S.re,S.re)+dot(S.im,S.im))+(1-rho)*(dot(X0.re,X0.re)+dot(X0.im,X0.im));
 return {Qre,Qim,Gre,Gim,c};
}
function evaluatePrepared(p,re,im){const {H,S,X0,N,K,L,rho,E}=p,receivedRe=new Float64Array(K*L),receivedIm=new Float64Array(K*L),perUser=new Array(K).fill(0);let mui=0,distance=0,energy=0;
 for(let k=0;k<K;k++)for(let j=0;j<L;j++){let yr=0,yi=0;for(let i=0;i<N;i++){
  const a=k*N+i,b=i*L+j;yr+=H.re[a]*re[b]-H.im[a]*im[b];yi+=H.re[a]*im[b]+H.im[a]*re[b];
 }const a=k*L+j;receivedRe[a]=yr;receivedIm[a]=yi;const e=(yr-S.re[a])**2+(yi-S.im[a])**2;mui+=e;perUser[k]+=e/L;}
 for(let i=0;i<N*L;i++){distance+=(re[i]-X0.re[i])**2+(im[i]-X0.im[i])**2;energy+=re[i]**2+im[i]**2;}
 const cr=new Float64Array(N*N),ci=new Float64Array(N*N);
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){let a=0,b=0;for(let t=0;t<L;t++){const u=i*L+t,v=j*L+t;a+=re[u]*re[v]+im[u]*im[v];b+=im[u]*re[v]-re[u]*im[v];}cr[i*N+j]=a/L;ci[i*N+j]=b/L;}
 return {mui,radarWaveformDistance:distance,weightedObjective:rho*mui+(1-rho)*distance,energy,requiredEnergy:E,energyResidual:energy-E,
  energyResidualRelative:E?Math.abs(energy-E)/E:Math.abs(energy),muiPerUser:perUser,received:pack(receivedRe,receivedIm,K,L),covariance:pack(cr,ci,N,N)};
}
/* Cyclic real symmetric Jacobi; complex Hermitian embedding duplicates each
 * eigenvalue. Keeping all real eigenvectors preserves the full complex space. */
function eigensystem(input,d){const A=new Float64Array(input),V=new Float64Array(d*d);for(let i=0;i<d;i++)V[i*d+i]=1;
 const inputNorm=norm(input),tol=4*EPS*d*Math.max(1,inputNorm),skip=tol/(4*d);let sweeps=0,rotations=0;
 function offNorm(){let q=0;for(let i=0;i<d;i++)for(let j=i+1;j<d;j++)q=Math.hypot(q,Math.SQRT2*A[i*d+j]);return q;}
 let off=offNorm();
 while(off>tol&&sweeps<LIMITS.maxJacobiSweeps){for(let p=0;p<d-1;p++)for(let q=p+1;q<d;q++){
  const b=A[p*d+q];if(Math.abs(b)<=skip)continue;const delta=(A[q*d+q]-A[p*d+p])/2;
  const t=(delta>=0?b:-b)/(Math.abs(delta)+Math.hypot(delta,b));const c=1/Math.hypot(1,t),s=t*c,app=A[p*d+p],aqq=A[q*d+q];
  for(let k=0;k<d;k++)if(k!==p&&k!==q){const ap=A[k*d+p],aq=A[k*d+q],vp=c*ap-s*aq,vq=s*ap+c*aq;A[k*d+p]=A[p*d+k]=vp;A[k*d+q]=A[q*d+k]=vq;}
  A[p*d+p]=app-t*b;A[q*d+q]=aqq+t*b;A[p*d+q]=A[q*d+p]=0;
  for(let k=0;k<d;k++){const vp=V[k*d+p],vq=V[k*d+q];V[k*d+p]=c*vp-s*vq;V[k*d+q]=s*vp+c*vq;}rotations++;
 }sweeps++;off=offNorm();}
 if(off>tol)throw new NumericalError('Jacobi eigensolver did not converge');
 const order=Array.from({length:d},(_,i)=>i).sort((a,b)=>A[a*d+a]-A[b*d+b]||a-b),values=new Float64Array(d),vectors=new Float64Array(d*d);
 for(let j=0;j<d;j++){values[j]=A[order[j]*d+order[j]];for(let i=0;i<d;i++)vectors[i*d+j]=V[i*d+order[j]];}
 let reconstruction=0,orthogonality=0;
 for(let i=0;i<d;i++)for(let j=0;j<d;j++){let a=0,b=0;for(let k=0;k<d;k++){a+=vectors[i*d+k]*values[k]*vectors[j*d+k];b+=vectors[i*d+k]*vectors[j*d+k];}reconstruction=Math.hypot(reconstruction,input[i*d+j]-a);orthogonality=Math.hypot(orthogonality,b-(i===j?1:0));}
 if(reconstruction>2e-10*Math.max(1,inputNorm)||orthogonality>2e-10)throw new NumericalError('Eigensystem reconstruction/orthogonality failed');
 return {values,vectors,sweeps,rotations,offDiagonalNorm:off,tolerance:tol,reconstruction,orthogonality};
}
function solve(Hin,Sin,Xin,rho,Pt,options={}){const started=now();if(!options||typeof options!=='object'||Array.isArray(options))throw new InputError('Options must be an object');
 for(const k of Object.keys(options))if(k!=='tieBreak')throw new InputError('Unsupported option '+k);
 const tie=options.tieBreak===undefined?'canonical':options.tieBreak;if(tie!=='canonical'&&tie!=='radar-closest')throw new InputError('Unknown hard-case tie break');
 const p=prepare(Hin,Sin,Xin,rho,Pt),{N,K,L,E,X0}=p,{Qre,Qim,Gre,Gim,c}=parts(p),d=2*N;
 if(E===0){const re=new Float64Array(N*L),im=new Float64Array(N*L),result={schemaVersion:1,solver:VERSION,status:'certified-singleton',branch:'zero-energy-singleton',tieBreak:{requested:tie,applied:false,reason:'Singleton feasible set'},X:pack(re,im,N,L),metrics:evaluatePrepared(p,re,im),certificate:{lowerBound:c,signedGap:0,note:'Feasible set {0}; finite-multiplier KKT not required'},elapsedComputeMs:now()-started};finiteOutput(result);return result;}
 const radius=Math.sqrt(E),qnorm=Math.hypot(norm(Qre),norm(Qim)),gnorm=Math.hypot(norm(Gre),norm(Gim));let scaling=Math.max(qnorm*E,gnorm*radius,Number.MIN_VALUE);if(qnorm===0&&gnorm===0)scaling=1;
 if(!Number.isFinite(scaling))throw new NumericalError('Objective scaling overflow');
 const A=new Float64Array(d*d),B=new Float64Array(d*L),ref=new Float64Array(d*L);
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){const k=i*N+j,re=(Qre[k]*E)/scaling,im=(Qim[k]*E)/scaling;A[i*d+j]=A[(i+N)*d+j+N]=re;A[i*d+j+N]=-im;A[(i+N)*d+j]=im;}
 for(let i=0;i<N;i++)for(let j=0;j<L;j++){const k=i*L+j;B[k]=(Gre[k]*radius)/scaling;B[(i+N)*L+j]=(Gim[k]*radius)/scaling;ref[k]=X0.re[k]/radius;ref[(i+N)*L+j]=X0.im[k]/radius;}
 const eig=eigensystem(A,d),q=eig.values,V=eig.vectors,Z=new Float64Array(d*L),gaps=new Float64Array(d),rownorm=new Float64Array(d);
 for(let i=0;i<d;i++){gaps[i]=q[i]-q[0];for(let j=0;j<L;j++){let v=0;for(let k=0;k<d;k++)v+=V[k*d+i]*B[k*L+j];Z[i*L+j]=v;rownorm[i]=Math.hypot(rownorm[i],v);}}
 const eigTol=64*EPS*d*Math.max(1,...Array.from(q,x=>Math.abs(x))),gTol=64*EPS*Math.max(d,L)*Math.max(1,norm(B));
 const minMask=Array.from(gaps,x=>x<=eigTol),pseudo=new Float64Array(d*L);let minG=0,endpointEnergy=0;
 for(let i=0;i<d;i++)if(minMask[i])minG=Math.hypot(minG,rownorm[i]);else for(let j=0;j<L;j++){const k=i*L+j;pseudo[k]=Z[k]/gaps[i];endpointEnergy+=pseudo[k]**2;}
 const hard=minG<=gTol&&endpointEnergy<=1+8*EPS*Math.max(d,L),Ycoord=new Float64Array(d*L);
 const tieInfo={requested:tie,applied:false,primaryObjective:'weighted Eq16 objective',secondaryObjective:'Frobenius distance squared to X0',selectionSpace:'declared-numerical-minimum-eigenvalue-cluster',exactSolutionSetRequiresExactClusterAndRange:true};
 let t=0,iterations=0,evaluations=0,completion=0,branch;
 if(hard){Ycoord.set(pseudo);completion=Math.max(0,1-endpointEnergy);const first=minMask.indexOf(true);
  if(tie==='radar-closest'&&completion>0){const projected=new Float64Array(d*L);let projNorm=0;
   for(let i=0;i<d;i++)if(minMask[i])for(let j=0;j<L;j++){let v=0;for(let k=0;k<d;k++)v+=V[k*d+i]*ref[k*L+j];projected[i*L+j]=v;projNorm=Math.hypot(projNorm,v);}
   const projTol=64*EPS*Math.max(d,L)*Math.max(1,norm(ref));Object.assign(tieInfo,{applied:true,projectedReferenceNormScaled:projNorm,projectedReferenceZeroTolerance:projTol,uniqueAtNumericalProjectionThreshold:projNorm>projTol});
   if(projNorm>projTol){for(let i=0;i<d;i++)if(minMask[i])for(let j=0;j<L;j++)Ycoord[i*L+j]=Math.sqrt(completion)*projected[i*L+j]/projNorm;tieInfo.selection='reference-aligned-minimum-eigenspace-completion';}
   else{Ycoord[first*L]=Math.sqrt(completion);tieInfo.selection='canonical-fallback-reference-projection-numerically-zero';tieInfo.secondaryOptimalityToleranceBound=4*Math.sqrt(completion)*projNorm*E;}
  }else{Ycoord[first*L]=Math.sqrt(completion);tieInfo.selection='canonical-minimum-eigenvector-first-time-coordinate';}
  branch=completion>8*EPS*Math.max(d,L)?'hard-case-completion':'singular-boundary-no-completion';
 }else{
  function residual(x){evaluations++;let a=0;for(let i=0;i<d;i++){const den=gaps[i]+x;if(den===0&&rownorm[i]>0)return Infinity;const r=den>0?rownorm[i]/den:0;a=Math.hypot(a,r);}return a-1;}
  let lo=0,hi=Math.max(norm(B),Number.MIN_VALUE);while(residual(hi)>0){hi*=2;if(!Number.isFinite(hi))throw new NumericalError('Secular upper bracket overflow');}
  let converged=false;for(iterations=1;iterations<=LIMITS.maxSecularIterations;iterations++){t=lo+(hi-lo)/2;const value=residual(t);if(Math.abs(value)<=8*EPS*Math.max(d,L)){converged=true;break;}if(t===lo||t===hi){converged=true;break;}if(value>0)lo=t;else hi=t;}
  if(!converged||!(t>0))throw new NumericalError('Secular bisection did not resolve a positive root');
  for(let i=0;i<d;i++)for(let j=0;j<L;j++)Ycoord[i*L+j]=Z[i*L+j]/(gaps[i]+t);branch='regular-secular';
 }
 const Y=new Float64Array(d*L);for(let i=0;i<d;i++)for(let j=0;j<L;j++){let v=0;for(let k=0;k<d;k++)v+=V[i*d+k]*Ycoord[k*L+j];Y[i*L+j]=v;}
 const re=new Float64Array(N*L),im=new Float64Array(N*L);for(let i=0;i<N;i++)for(let j=0;j<L;j++){re[i*L+j]=radius*Y[i*L+j];im[i*L+j]=radius*Y[(i+N)*L+j];}
 const metrics=evaluatePrepared(p,re,im),nu=t-q[0],lambda=nu*scaling/E;let kkt=0;
 for(let i=0;i<d;i++)for(let j=0;j<L;j++){let v=nu*Y[i*L+j]-B[i*L+j];for(let k=0;k<d;k++)v+=A[i*d+k]*Y[k*L+j];kkt=Math.hypot(kkt,v);}
 const ynorm=norm(Y),rad=1+ynorm,psdDefect=eig.reconstruction+Math.abs(nu)*eig.orthogonality;
 // A + nu I differs from a PSD V diag(q+nu) V^T by at most this
 // reconstruction/orthogonality bound; no second copy of the eigenvalue list
 // is silently used as an independent certificate.
 const residualGap=(psdDefect*rad*rad+2*rad*kkt+Math.abs(nu)*Math.abs(1-ynorm*ynorm))*scaling;
 let dualInner=0;if(hard)dualInner=dot(Z,pseudo);else for(let i=0;i<d;i++)for(let j=0;j<L;j++)dualInner+=Z[i*L+j]**2/(gaps[i]+t);
 const dual=c+scaling*(-nu-dualInner),certScale=Math.max(1,c,scaling,metrics.weightedObjective);
 const passed=metrics.energyResidualRelative<=2e-10&&kkt<=2e-9&&residualGap<=2e-9*certScale;
 if(!passed)throw new NumericalError('Output failed energy, stationarity or global residual certificate');
 const result={schemaVersion:1,solver:VERSION,status:'certified',branch,tieBreak:tieInfo,dimensions:{N,K,L},rho,Pt,X:pack(re,im,N,L),metrics,
  certificate:{sourceDualValue:dual,signedSourceDualGap:metrics.weightedObjective-dual,residualLowerBound:metrics.weightedObjective-residualGap,residualBoundGap:residualGap,objectiveCertificateScale:certScale,lambda,scaledLambda:nu,scaledShiftFromPSDLimit:t,stationarityNormScaled:kkt,shiftedPSDViolationBoundScaled:psdDefect,hardCaseRangeResidualScaled:hard?minG:0},
  diagnostics:{objectiveScaling:scaling,objectiveScaleConvention:'max(E||Q||F,sqrt(E)||G||F,tiny)',eigensolver:'real-symmetric-cyclic-Jacobi of complex Hermitian representation',realEigenDimension:d,scaledEigenvaluesRealEmbedding:Array.from(q),scaledEigenvalueGapsRealEmbedding:Array.from(gaps),minimumEigenvalueClusterRealDimension:minMask.filter(Boolean).length,minimumEigenvalueClusterTolerance:eigTol,minimumClusterProjectionNorm:minG,rangeZeroTolerance:gTol,endpointPseudoinverseEnergyRelative:endpointEnergy,completionEnergy:completion*E,hardCaseNumericalClassification:hard,strictlyStructuralHardCaseNotInferredFromTolerance:true,rootMethod:'bisection',rootIterations:iterations,secularEvaluations:evaluations,jacobiSweeps:eig.sweeps,jacobiRotations:eig.rotations,eigenReconstructionResidual:eig.reconstruction,eigenOrthogonalityResidual:eig.orthogonality,eigenOffDiagonalNorm:eig.offDiagonalNorm,eigenTolerance:eig.tolerance},
  elapsedComputeMs:now()-started,scope:'Section IV weighted energy-equality objective; regular source algorithm and explicitly labeled hard-case/tie-break extensions. No full-figure or sum-rate-optimum claim'};
 finiteOutput(result);return result;
}
function evaluate(H,S,X0,rho,Pt,X){const p=prepare(H,S,X0,rho,Pt),a=matrix(X,'X',32,128,true);if(a.m!==p.N||a.n!==p.L)throw new InputError('X shape mismatch');const r=evaluatePrepared(p,a.re,a.im);finiteOutput(r);return r;}
const api=Object.freeze({solve,evaluate,LIMITS,VERSION,InputError,NumericalError});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WeightedWaveformCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
