/* Fresh-input strict-covariance Procrustes, arXiv:1711.05220v1 Eqs.(8)-(15).
 * No runtime dependencies and no stored solutions. Complex scalars are [re,im].
 * This bounded numerical core is independent of any UI or Worker protocol.
 */
(function(root){'use strict';
const EPS=Number.EPSILON;
const LIMITS=Object.freeze({maxAntennas:32,maxUsers:32,maxSnapshots:128,maxJacobiSweeps:100,
  hermitianRelativeTolerance:1e-12,minimumCovarianceSingularRatio:1e-12,
  covarianceRelativeTolerance:2e-10,objectiveRelativeTolerance:2e-10});
class InputError extends Error{constructor(message){super(message);this.name='InputError';}}
class NumericalError extends Error{constructor(message){super(message);this.name='NumericalError';}}
const z=()=>[0,0],conj=a=>[a[0],-a[1]],add=(a,b)=>[a[0]+b[0],a[1]+b[1]],
 sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],
 scale=(a,c)=>[a[0]*c,a[1]*c],abs2=a=>a[0]*a[0]+a[1]*a[1];
const zeros=(m,n)=>Array.from({length:m},()=>Array.from({length:n},z));
const identity=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>[+(i===j),0]));
const clone=A=>A.map(row=>row.map(v=>v.slice()));
const adj=A=>A[0].map((_,j)=>A.map(row=>conj(row[j])));
function product(A,B){const m=A.length,n=B[0].length,p=B.length,out=zeros(m,n);
 for(let i=0;i<m;i++)for(let j=0;j<n;j++){let re=0,im=0;
  for(let k=0;k<p;k++){re+=A[i][k][0]*B[k][j][0]-A[i][k][1]*B[k][j][1];im+=A[i][k][0]*B[k][j][1]+A[i][k][1]*B[k][j][0];}
  out[i][j]=[re,im];}return out;}
function norm(A){let s=0;for(const row of A)for(const a of row)s=Math.hypot(s,a[0],a[1]);return s;}
function diff(A,B){return A.map((row,i)=>row.map((a,j)=>sub(a,B[i][j])));}
function finiteMatrix(A,label){for(const row of A)for(const a of row)if(!Number.isFinite(a[0])||!Number.isFinite(a[1]))throw new NumericalError(label+' overflowed or became nonfinite');}
function requireFiniteOutput(value){if(typeof value==='number'&&!Number.isFinite(value))throw new NumericalError('A returned metric or diagnostic is nonfinite');if(value&&typeof value==='object')for(const child of Object.values(value))requireFiniteOutput(child);}
function readMatrix(value,name,maxRows,maxCols){if(!Array.isArray(value)||!value.length||!Array.isArray(value[0])||!value[0].length)throw new InputError(name+' must be a nonempty complex matrix');
 const n=value[0].length;if(value.length>maxRows||n>maxCols)throw new InputError(name+' exceeds the bounded matrix dimensions');
 return value.map(row=>{if(!Array.isArray(row)||row.length!==n)throw new InputError(name+' must be rectangular');
  return row.map(a=>{if(!Array.isArray(a)||a.length!==2||typeof a[0]!=='number'||typeof a[1]!=='number'||!Number.isFinite(a[0])||!Number.isFinite(a[1]))throw new InputError(name+' entries must be finite [real,imaginary] pairs');return a.slice();});});}
function columnInner(B,p,q){let re=0,im=0,a=0,b=0;
 for(const row of B){const u=row[p],v=row[q];a+=abs2(u);b+=abs2(v);re+=u[0]*v[0]+u[1]*v[1];im+=u[0]*v[1]-u[1]*v[0];}
 return {a,b,re,im,c:Math.hypot(re,im)};}
function rotateColumns(M,p,q,cs,sn,phase){const pc=conj(phase);
 for(const row of M){const u=row[p],v=row[q];row[p]=sub(scale(u,cs),scale(mul(pc,v),sn));row[q]=add(scale(mul(phase,u),sn),scale(v,cs));}}
function columnNorm(B,p){let s=0;for(const row of B)s=Math.hypot(s,row[p][0],row[p][1]);return s;}
function inner(u,v){let re=0,im=0;for(let i=0;i<u.length;i++){re+=u[i][0]*v[i][0]+u[i][1]*v[i][1];im+=u[i][0]*v[i][1]-u[i][1]*v[i][0];}return [re,im];}
function projectOut(v,basis){let out=v.map(a=>a.slice());for(let pass=0;pass<2;pass++)for(const q of basis){const c=inner(q,out);out=out.map((a,i)=>sub(a,mul(q[i],c)));}return out;}
function vectorNorm(v){let s=0;for(const a of v)s=Math.hypot(s,a[0],a[1]);return s;}
/* One-sided complex Jacobi on a tall m-by-n matrix, m>=n. Maintaining a
 * unitary right factor avoids squaring the singular-value condition number.
 * A small-column threshold prevents roundoff null columns from blocking
 * convergence. All missing left columns are completed, never zero-filled.
 */
function tallSVD(A,{complete=true}={}){
 const m=A.length,n=A[0].length;if(m<n)throw new NumericalError('Internal SVD expects a tall matrix');
 let inputScale=0;for(const row of A)for(const a of row)inputScale=Math.max(inputScale,Math.hypot(a[0],a[1]));
 if(!Number.isFinite(inputScale))throw new NumericalError('Nonfinite SVD input');
 if(inputScale>0&&!Number.isFinite(1/inputScale))throw new NumericalError('SVD input magnitude is below the supported floating-point scaling range');
 const B=inputScale?A.map(row=>row.map(a=>scale(a,1/inputScale))):zeros(m,n),V=identity(n);
 const relativeTolerance=8*EPS*Math.max(m,n),rankFloor=32*EPS*Math.max(m,n)*Math.max(1,norm(B));
 let sweeps=0,rotations=0,converged=inputScale===0;
 for(;sweeps<LIMITS.maxJacobiSweeps&&!converged;sweeps++){
  let changed=0;
  for(let p=0;p<n-1;p++)for(let q=p+1;q<n;q++){
   const d=columnInner(B,p,q),na=Math.sqrt(d.a),nb=Math.sqrt(d.b);
   if(Math.min(na,nb)<=rankFloor||d.c<=relativeTolerance*na*nb)continue;
   const tau=(d.b-d.a)/(2*d.c),t=(tau>=0?1:-1)/(Math.abs(tau)+Math.hypot(1,tau)),cs=1/Math.hypot(1,t),sn=t*cs;
   const phase=[d.re/d.c,d.im/d.c];rotateColumns(B,p,q,cs,sn,phase);rotateColumns(V,p,q,cs,sn,phase);changed++;rotations++;
  }
  if(changed===0)converged=true;
 }
 // Reassess after the final permitted sweep, rather than silently accepting it.
 let maxCorrelation=0;
 for(let p=0;p<n-1;p++)for(let q=p+1;q<n;q++){const d=columnInner(B,p,q),a=Math.sqrt(d.a),b=Math.sqrt(d.b);
  if(Math.min(a,b)>rankFloor)maxCorrelation=Math.max(maxCorrelation,d.c/(a*b));}
 converged=converged||maxCorrelation<=relativeTolerance*1.05;
 if(!converged)throw new NumericalError('Complex Jacobi SVD did not converge within the sweep limit');
 const order=Array.from({length:n},(_,i)=>({i,s:columnNorm(B,i)})).sort((a,b)=>b.s-a.s||a.i-b.i);
 const singularValues=order.map(o=>o.s*inputScale),right=V.map(row=>order.map(o=>row[o.i].slice()));
 const rank=order.filter(o=>o.s>rankFloor).length,leftColumns=[];
 if(complete){
  // Twice-reorthogonalized active columns make feasibility insensitive to the
  // chosen Jacobi stopping tolerance. Singular values retain raw column norms.
  for(let j=0;j<rank;j++){let u=B.map(row=>scale(row[order[j].i],1/order[j].s));u=projectOut(u,leftColumns);const length=vectorNorm(u);
   if(length<.5)throw new NumericalError('Active singular-vector reorthogonalization failed');leftColumns.push(u.map(a=>scale(a,1/length)));}
  while(leftColumns.length<n){let best=null,bestNorm=-1;
   for(let axis=0;axis<m;axis++){const e=Array.from({length:m},(_,i)=>[+(i===axis),0]);const candidate=projectOut(e,leftColumns),length=vectorNorm(candidate);
    if(length>bestNorm){bestNorm=length;best=candidate;}}
   if(bestNorm<1e-8)throw new NumericalError('Null-space orthonormal completion failed');leftColumns.push(best.map(a=>scale(a,1/bestNorm)));
  }
 }
 const left=complete?Array.from({length:m},(_,i)=>leftColumns.map(c=>c[i])):null;
 return {left,right,singularValues,rank,sweeps,rotations,maxCorrelation,relativeTolerance,
  rankTolerance:rankFloor*inputScale};
}
function cholesky(A){const n=A.length,L=zeros(n,n);
 for(let i=0;i<n;i++)for(let j=0;j<=i;j++){
  let v=A[i][j].slice();for(let k=0;k<j;k++)v=sub(v,mul(L[i][k],conj(L[j][k])));
  if(i===j){if(!(v[0]>0))throw new InputError('R must be strictly positive definite; no diagonal loading applied');L[i][j]=[Math.sqrt(v[0]),0];}
  else L[i][j]=scale(v,1/L[j][j][0]);
 }finiteMatrix(L,'Cholesky factor');return L;}
function prepare(Hin,Sin,Rin){const H=readMatrix(Hin,'H',LIMITS.maxUsers,LIMITS.maxAntennas),S=readMatrix(Sin,'S',LIMITS.maxUsers,LIMITS.maxSnapshots),R=readMatrix(Rin,'R',LIMITS.maxAntennas,LIMITS.maxAntennas);
 const k=H.length,n=H[0].length,l=S[0].length;
 if(n>LIMITS.maxAntennas||k>LIMITS.maxUsers||l>LIMITS.maxSnapshots)throw new InputError('Dimensions exceed the bounded N<=32, K<=32, L<=128 contract');
 if(S.length!==k)throw new InputError('H and S must have the same K rows');
 if(R.length!==n||R[0].length!==n)throw new InputError('R must be N by N');
 if(l<n)throw new InputError('Positive definite covariance requires L >= N');
 const rnorm=norm(R);if(!(rnorm>0)||!Number.isFinite(rnorm))throw new InputError('R must have finite nonzero norm');
 const Rh=R.map((row,i)=>row.map((a,j)=>scale(add(a,conj(R[j][i])),.5))),cleanup=norm(diff(Rh,R));
 const hermitianRelative=2*cleanup/rnorm;
 if(hermitianRelative>LIMITS.hermitianRelativeTolerance)throw new InputError('R is not Hermitian to the declared relative tolerance');
 const requiredEnergy=l*Rh.reduce((sum,row,i)=>sum+row[i][0],0);if(!Number.isFinite(requiredEnergy))throw new InputError('Requested block energy L trace(R) exceeds finite floating-point range');
 let rs=0;for(let i=0;i<n;i++)rs=Math.max(rs,Math.abs(Rh[i][i][0]));
 if(!(rs>0))throw new InputError('R must be strictly positive definite');
 if(!Number.isFinite(1/rs))throw new InputError('R magnitude is below the supported floating-point scaling range');
 const scaledR=Rh.map(row=>row.map(a=>scale(a,1/rs))),Ls=cholesky(scaledR);
 const rsv=tallSVD(scaledR,{complete:false}).singularValues;
 const ratio=rsv[n-1]/rsv[0];if(!(ratio>LIMITS.minimumCovarianceSingularRatio))throw new InputError('R is too ill-conditioned for the floating-point contract; no regularization applied');
 const F=Ls.map(row=>row.map(a=>scale(a,Math.sqrt(rs))));
 return {H,S,R,Rh,F,n,k,l,diagnostics:{hermitianInputResidualRelative:hermitianRelative,hermitianCleanupNorm:cleanup,
  covarianceConditionNumber:rsv[0]/rsv[n-1],covarianceFactorizationResidual: norm(diff(product(F,adj(F)),Rh))}};
}
function evaluate(H,S,R,X){const l=S[0].length,Y=product(H,X),E=diff(Y,S),cov=product(X,adj(X)).map(row=>row.map(a=>scale(a,1/l)));
 const objective=norm(E)**2,energy=norm(X)**2,requiredEnergy=l*R.reduce((a,row,i)=>a+row[i][0],0);
 const muiPerUser=E.map(row=>row.reduce((v,a)=>v+abs2(a),0)/l),covarianceResidual=norm(diff(cov,R));
 return {objective,mse:objective/(S.length*l),energy,requiredEnergy,energyResidual:energy-requiredEnergy,muiPerUser,
  covarianceResidual,covarianceResidualRelative:covarianceResidual/norm(R),received:Y,sampleCovariance:cov};}
function solve(Hin,Sin,Rin){const t0=typeof performance!=='undefined'?performance.now():Date.now();
 const {H,S,R,Rh,F,n,k,l,diagnostics}=prepare(Hin,Sin,Rin);
 const C=product(adj(F),product(adj(H),S));finiteMatrix(C,'Procrustes matrix');
 // SVD of C^H = U_b Sigma V_b^H, so C = V_b Sigma U_b^H.
 const svd=tallSVD(adj(C));const Q=product(svd.right,adj(svd.left)),X=product(F,Q).map(row=>row.map(a=>scale(a,Math.sqrt(l))));
 finiteMatrix(X,'Waveform');const metrics=evaluate(H,S,R,X);
 const HF=product(H,F),constant=l*norm(HF)**2+norm(S)**2,nuclear=svd.singularValues.reduce((a,b)=>a+b,0);
 const bound=constant-2*Math.sqrt(l)*nuclear,certificateScale=Math.max(1,Math.abs(constant),2*Math.sqrt(l)*nuclear),objectiveTolerance=LIMITS.objectiveRelativeTolerance*certificateScale;
 metrics.signedObjectiveGap=metrics.objective-bound;
 const qResidual=norm(diff(product(Q,adj(Q)),identity(n))),leftResidual=norm(diff(product(adj(svd.left),svd.left),identity(n))),rightResidual=norm(diff(product(adj(svd.right),svd.right),identity(n)));
 const US=svd.left.map(row=>row.map((a,j)=>scale(a,svd.singularValues[j]))),reconstructed=product(US,adj(svd.right)),cNorm=norm(C);
 const reconstructionRelative=cNorm?norm(diff(reconstructed,adj(C)))/cNorm:0;
 Object.assign(diagnostics,{procrustesNumericalRank:svd.rank,rankTolerance:svd.rankTolerance,jacobiSweeps:svd.sweeps,jacobiRotations:svd.rotations,
  maximumActiveColumnCorrelation:svd.maxCorrelation,jacobiRelativeTolerance:svd.relativeTolerance,
  whitenedRowIsometryResidual:qResidual,svdLeftOrthogonalityResidual:leftResidual,svdRightOrthogonalityResidual:rightResidual,
  svdReconstructionResidualRelative:reconstructionRelative,objectiveCertificateScale:certificateScale,objectiveCertificateTolerance:objectiveTolerance});
 const passed=Number.isFinite(bound)&&Number.isFinite(metrics.objective)&&metrics.covarianceResidualRelative<=LIMITS.covarianceRelativeTolerance&&Math.abs(metrics.signedObjectiveGap)<=objectiveTolerance&&qResidual<=2e-10&&reconstructionRelative<=2e-10;
 if(!passed)throw new NumericalError('Output failed covariance, objective, or SVD certificate checks');
 const result={schemaVersion:1,solver:'complex-one-sided-jacobi+cholesky',status:'certified',dimensions:{N:n,K:k,L:l},X,
  singularValues:svd.singularValues,globalObjectiveBound:bound,metrics,diagnostics,
  elapsedComputeMs:(typeof performance!=='undefined'?performance.now():Date.now())-t0,
  scope:'Strict covariance only; no weighted tradeoff, constant modulus, receiver simulation, or full-paper reproduction'};
 requireFiniteOutput(result);return result;
}
const api=Object.freeze({solve,LIMITS,InputError,NumericalError});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProcrustesCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
