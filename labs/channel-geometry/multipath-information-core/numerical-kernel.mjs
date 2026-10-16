/* Internal numerical kernel. Public consumers must use multipath-fisher-core.mjs,
 * whose finite-preset validator establishes the accepted domain. No dependencies,
 * fixture lookup, finite-difference pulse derivative, inverse, jitter, or floor. */
export const METHOD_VERSION = 'rrc-sinc-projection-f64-v1';
export const TOLERANCES = Object.freeze({
  symmetryRelative: 1e-12, choleskyRelative: 1e-11,
  nuisanceSingularValueRatio: 1e-5, positionRelativeToKnown: 1e-10,
  schurRelativeToA: 1e-8, schurPebRelative: 1e-5,
  approximationRefinementRelative: 1e-7,
});
export const LIGHT_SPEED_M_PER_NS = 0.299792458;
const PI = Math.PI;
const tiny = Number.MIN_VALUE;
const matrix = (r, c) => Array.from({length:r}, () => Array(c).fill(0));
export const norm = a => Math.sqrt(a.flat().reduce((sum,x)=>sum+x*x,0));
export function dot(a, b) {
  let sum=0, correction=0;
  for(let i=0;i<a.length;i++) {
    const y=a[i]*b[i]-correction, next=sum+y;
    correction=(next-sum)-y; sum=next;
  }
  return sum;
}
export function sinc(x) {
  if(Math.abs(x)<1e-3) {
    const z=PI*x, z2=z*z;
    return 1+z2*(-1/6+z2*(1/120+z2*(-1/5040+z2/362880)));
  }
  return Math.sin(PI*x)/(PI*x);
}
export function sincPrime(x) {
  if(Math.abs(x)<1e-3) {
    const z=x*x;
    return x*(-(PI**2)/3+z*(PI**4/30+z*(-(PI**6)/840+z*PI**8/45360)));
  }
  return (PI*x*Math.cos(PI*x)-Math.sin(PI*x))/(PI*x*x);
}
export function pulseAndPrime(u, rolloff=0.6) {
  const c=Math.cos(PI*u), s=Math.sin(PI*u), r=rolloff;
  const a=r*u-0.25,b=r*u+0.25, sa=sinc(a),sb=sinc(b);
  const q=(1-r)*sinc((1-r)*u)+r/Math.SQRT2*((c+s)*sa+(c-s)*sb);
  const dq=u===0?0:(1-r)**2*sincPrime((1-r)*u)+r/Math.SQRT2*(
    PI*(c-s)*sa+r*(c+s)*sincPrime(a)-PI*(s+c)*sb+r*(c-s)*sincPrime(b));
  return [q,dq];
}
export function geometry(position, anchors, speed=LIGHT_SPEED_M_PER_NS) {
  const tau=[],H=[];
  for(const a of anchors) {
    const x=position[0]-a[0],y=position[1]-a[1],d=Math.hypot(x,y);
    if(!(d>0)) throw new ModelError('invalid-input','zero-anchor-distance');
    tau.push(d/speed); H.push([x/(speed*d), y/(speed*d)]);
  }
  return {tau,H};
}
export class ModelError extends Error {
  constructor(status,reason,diagnostics=null) { super(reason);this.status=status;this.reason=reason;this.diagnostics=diagnostics; }
}
export function eig2(m) {
  const a=m[0][0],b=(m[0][1]+m[1][0])/2,d=m[1][1];
  const mid=(a+d)/2,rad=Math.hypot((a-d)/2,b), hi=mid+rad;
  const lo=hi!==0?(a*d-b*b)/hi:mid-rad;
  let v;
  if(b===0) v=a<=d?[1,0]:[0,1];
  else {
    const c1=[-b,a-lo],c2=[d-lo,-b];
    v=Math.hypot(...c1)>Math.hypot(...c2)?c1:c2;
    const n=Math.hypot(...v);v=v.map(x=>x/n);
    if(v[0]<0 || (v[0]===0 && v[1]<0)) v=v.map(x=>-x);
  }
  return {values:[lo,hi],vectors:[v,[-v[1],v[0]]]};
}
function transpose(a) { return a[0].map((_,j)=>a.map(r=>r[j])); }
function multiply(a,b) { const bt=transpose(b);return a.map(r=>bt.map(c=>dot(r,c))); }
function subtract(a,b) { return a.map((r,i)=>r.map((v,j)=>v-b[i][j])); }
function symmetrize(a) { return a.map((r,i)=>r.map((v,j)=>(v+a[j][i])/2)); }
function symmetryResidual(a) { return norm(subtract(a,transpose(a)))/Math.max(norm(a),tiny); }
function positionMap(lam,H) { return multiply(multiply(transpose(H),lam),H); }
function choleskySmall(a) {
  const n=a.length,L=matrix(n,n);
  for(let i=0;i<n;i++)for(let j=0;j<=i;j++) {
    let sum=a[i][j];for(let k=0;k<j;k++)sum-=L[i][k]*L[j][k];
    if(i===j) { if(!(sum>0) || !Number.isFinite(sum)) return null;L[i][j]=Math.sqrt(sum); }
    else L[i][j]=sum/L[j][j];
  }
  return L;
}
function forward(L,b) {
  const x=Array(b.length).fill(0);
  for(let i=0;i<b.length;i++){let s=b[i];for(let j=0;j<i;j++)s-=L[i][j]*x[j];x[i]=s/L[i][i];}
  return x;
}
function solveFromCholesky(L,b) {
  const y=forward(L,b),x=Array(b.length).fill(0);
  for(let i=b.length-1;i>=0;i--){let s=y[i];for(let j=i+1;j<b.length;j++)s-=L[j][i]*x[j];x[i]=s/L[i][i];}
  return x;
}
function physicalRankLoss(model,H) {
  if(model.gains.every(a=>a[0]===0&&a[1]===0))return 'all-zero-gain-information';
  if(H.length<2)return 'only-one-path-for-two-unknown-coordinates';
  if(model.gains.some(a=>a[0]===0&&a[1]===0))return 'vanishing-path-gain';
  const dx0=model.position[0]-model.anchors[0][0],dy0=model.position[1]-model.anchors[0][1];
  const dx1=model.position[0]-model.anchors[1][0],dy1=model.position[1]-model.anchors[1][1];
  // Exact algebraic determinant only: tiny numerical determinants do not prove rank loss.
  if(dx0*dy1-dy0*dx1===0)return 'collinear-delay-geometry';
  return null;
}
export function positionResult(E,known,structuralReason=null) {
  const symmetryRelative=symmetryResidual(E), matrixSym=symmetrize(E);
  const {values,vectors}=eig2(matrixSym), knownValues=eig2(symmetrize(known)).values;
  const scale=Math.max(...knownValues.map(Math.abs),tiny);
  const threshold=TOLERANCES.positionRelativeToKnown*scale;
  let status='finite',reason=null;
  if(!E.flat().every(Number.isFinite)||!values.every(Number.isFinite)||symmetryRelative>TOLERANCES.symmetryRelative) {
    status='numerical-failure';reason='nonfinite-or-asymmetric-position-information';
  } else if(values[0]<-threshold) {
    status='numerical-failure';reason='materially-negative-position-eigenvalue';
  } else if(structuralReason) {
    status='unidentifiable-position';reason=structuralReason;
  } else if(values[0]<=threshold) {
    status='numerically-unresolved-position';reason='minimum-eigenvalue-below-known-information-threshold';
  }
  const finite=status==='finite';
  const axes=finite?values.map(v=>1/Math.sqrt(v)):null;
  return {status,reason,efim:matrixSym,rawEigenvalues:values,rankThreshold:threshold,
    thresholdScale:'1e-10 * spectral norm of known-gain information',symmetryRelative,
    conditionNumber:values[0]>0?values[1]/values[0]:null,
    pebM:finite?Math.hypot(...axes):null,
    ellipse:finite?{kind:'unit-Mahalanobis-CRLB',semiaxesM:axes,
      unitVectors:vectors,majorAxisAngleRad:Math.atan2(vectors[0][1],vectors[0][0]),
      hypotheticalGaussianProbability:1-Math.exp(-0.5),
      nominal95GaussianScale:Math.sqrt(5.991464547),
      interpretation:'Local conditional bound; not observed errors or guaranteed estimator coverage'}:null};
}
export function missingBranch(status,reason) {
  return {status,reason,efim:null,rawEigenvalues:null,rankThreshold:null,conditionNumber:null,pebM:null,ellipse:null};
}
export function validateModel(m) {
  const finiteVector=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(Number.isFinite);
  if(!m||!Array.isArray(m.times)||m.times.length<2||m.times.length>385)throw new ModelError('invalid-input','invalid-grid-length');
  if(!Number.isFinite(m.dt)||!(m.dt>0)||!m.times.every(Number.isFinite))throw new ModelError('invalid-input','invalid-time-grid');
  for(let i=1;i<m.times.length;i++)if(Math.abs((m.times[i]-m.times[i-1])-m.dt)>1e-12*m.dt)throw new ModelError('invalid-input','nonuniform-time-grid');
  if(!Number.isFinite(m.n0)||!(m.n0>0))throw new ModelError('invalid-input','N0-must-be-finite-and-positive');
  if(!Array.isArray(m.pdp)||m.pdp.length!==m.times.length||m.pdp.some(q=>!Number.isFinite(q)||q<0))throw new ModelError('invalid-input','invalid-sampled-PDP');
  if(!finiteVector(m.position,2)||!Array.isArray(m.anchors)||m.anchors.length<1||m.anchors.length>2||!m.anchors.every(a=>finiteVector(a,2)))throw new ModelError('invalid-input','invalid-geometry');
  if(!Array.isArray(m.gains)||m.gains.length!==m.anchors.length||!m.gains.every(a=>finiteVector(a,2)))throw new ModelError('invalid-input','invalid-complex-gains');
  if(m.rolloff!==0.6||m.tp!==1)throw new ModelError('invalid-input','unsupported-internal-pulse');
  geometry(m.position,m.anchors);
}
function interpolate(m,tau) {
  const n=m.times.length,z=(tau-m.times[0])/m.dt;
  if(z<=0)return m.pdp[0];if(z>=n-1)return m.pdp[n-1];
  const i=Math.floor(z),u=z-i;return (1-u)*m.pdp[i]+u*m.pdp[i+1];
}
function spectrum(f) { return f<=0.2?1:(f<0.8?Math.cos(PI*(f-0.2)/1.2):0); }
function simpson(f,a,b,n) {
  const h=(b-a)/n;let s=f(a)+f(b);
  for(let i=1;i<n;i++)s+=(i%2===0?2:4)*f(a+i*h);
  return s*h/3;
}
function approxInformation(m,tau,H,structural) {
  const values=[],qAt=[],errors=[];
  for(let k=0;k<tau.length;k++) {
    const q=interpolate(m,tau[k]),power=dot(m.gains[k],m.gains[k]);qAt.push(q);
    const integrand=f=>{const ss=spectrum(f)**2;return f*f*ss/(m.n0+q*ss);};
    const integral=n=>simpson(integrand,0,0.2,n)+simpson(integrand,0.2,0.8,n);
    const coarse=integral(256),fine=integral(512);
    errors.push(Math.abs(fine-coarse)/Math.max(Math.abs(fine),tiny));
    values.push(16*PI*PI*power*fine);
  }
  const diagonal=values.map((v,i)=>values.map((_,j)=>i===j?v:0));
  const E=positionMap(diagonal,H),result=positionResult(E,E,structural);
  if(errors.some(x=>x>TOLERANCES.approximationRefinementRelative))Object.assign(result,missingBranch('numerical-failure','approximation-quadrature-not-converged'));
  return {...result,delayInformation:values,pdpAtDelays:qAt,
    label:'source nonoverlap/local-PDP approximation',
    assumptions:['Neglects coherent path overlap','Treats sampled PDP locally as constant','Infinite-time pulse spectrum idealizes the finite receive window'],
    quadrature:{method:'composite-Simpson-with-transition-breakpoints',breakpointsInvNs:[0,0.2,0.8],intervalsPerSegment:[256,512],relativeChanges:errors,tolerance:TOLERANCES.approximationRefinementRelative},
    outsideNonoverlapAssumption:tau.length===2&&tau[0]===tau[1]};
}
/** Internal generator; each yield is a cancellation/event-loop checkpoint. */
export function* evaluateModel(m,{debug=false}={}) {
  validateModel(m);
  const n=m.times.length,k=m.anchors.length,{tau,H}=geometry(m.position,m.anchors);
  const structure=physicalRankLoss(m,H);
  const S=matrix(n,k),delayDerivatives=matrix(n,k),mean=matrix(n,2);
  for(let i=0;i<n;i++)for(let j=0;j<k;j++) {
    const [s,du]=pulseAndPrime(m.times[i]-tau[j]);S[i][j]=s;delayDerivatives[i][j]=-du;
    mean[i][0]+=s*m.gains[j][0];mean[i][1]+=s*m.gains[j][1];
  }
  const sampledPulseEnergies=transpose(S).map(s=>m.dt*dot(s,s));
  const T=matrix(n,n),C=matrix(n,n),whiteFloor=m.n0/m.dt;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)T[i][j]=pulseAndPrime(m.times[i]-m.times[j])[0];
  yield {stage:'pulse-and-geometry'};
  for(let i=0;i<n;i++) {
    for(let j=0;j<=i;j++) {
      let sum=i===j?whiteFloor:0;
      for(let l=0;l<n;l++)sum+=m.dt*m.pdp[l]*T[i][l]*T[j][l];
      C[i][j]=C[j][i]=sum;
    }
    if(i%16===15)yield {stage:'covariance',rows:i+1,total:n};
  }
  const covarianceSymmetryRelative=symmetryResidual(C),L=matrix(n,n),pivots=[];
  for(let i=0;i<n;i++) {
    for(let j=0;j<=i;j++) {
      let value=C[i][j];for(let a=0;a<j;a++)value-=L[i][a]*L[j][a];
      if(i===j) {
        if(!(value>0)||!Number.isFinite(value))throw new ModelError('covariance-factorization-failed','nonpositive-Cholesky-pivot',{index:i,pivot:value,whiteFloor});
        L[i][j]=Math.sqrt(value);pivots.push(value);
      } else L[i][j]=value/L[j][j];
    }
    if(i%16===15)yield {stage:'cholesky',rows:i+1,total:n};
  }
  let residualSquared=0,covarianceSquared=0;
  for(let i=0;i<n;i++) {
    for(let j=0;j<=i;j++) {
      let value=0;for(let a=0;a<=j;a++)value+=L[i][a]*L[j][a];
      const mult=i===j?1:2;residualSquared+=mult*(value-C[i][j])**2;covarianceSquared+=mult*C[i][j]**2;
    }
    if(i%16===15)yield {stage:'factorization-check',rows:i+1,total:n};
  }
  const choleskyRelativeResidual=Math.sqrt(residualSquared/covarianceSquared);
  if(covarianceSymmetryRelative>TOLERANCES.symmetryRelative||choleskyRelativeResidual>TOLERANCES.choleskyRelative)throw new ModelError('numerical-failure','covariance-symmetry-or-Cholesky-residual',{covarianceSymmetryRelative,choleskyRelativeResidual});
  const WS=transpose(S).map(c=>forward(L,c)),WD=transpose(delayDerivatives).map(c=>forward(L,c));
  const real=[],imag=[];
  for(let j=0;j<k;j++){real.push(WD[j].map(v=>v*m.gains[j][0]));imag.push(WD[j].map(v=>v*m.gains[j][1]));}
  for(let j=0;j<k;j++){real.push(WS[j]);imag.push(Array(n).fill(0));}
  for(let j=0;j<k;j++){real.push(Array(n).fill(0));imag.push(WS[j]);}
  const F=matrix(3*k,3*k);
  for(let i=0;i<3*k;i++)for(let j=0;j<=i;j++)F[i][j]=F[j][i]=2*(dot(real[i],real[j])+dot(imag[i],imag[j]));
  const A=F.slice(0,k).map(r=>r.slice(0,k)),B=F.slice(0,k).map(r=>r.slice(k)),G=F.slice(k).map(r=>r.slice(k));
  const gainEigenvalues=k===2?eig2(G.slice(0,k).map(r=>r.slice(0,k))).values:[G[0][0],G[0][0]];
  const gainRatio=gainEigenvalues[0]>0?Math.sqrt(gainEigenvalues[0]/gainEigenvalues[1]):null;
  const knownE=positionMap(A,H),known=positionResult(knownE,knownE,structure);
  const approx=approxInformation(m,tau,H,structure);
  const output={geometry:{positionM:m.position,anchorsM:m.anchors,tauNs:tau,HNsPerM:H,delaySeparationNs:k===2?Math.abs(tau[1]-tau[0]):null,bothCoordinatesUnknown:true},
    samples:{timeNs:m.times,pdp:m.pdp,pulseTemplates:S,delayDerivativesPerNs:delayDerivatives,complexMean:mean,sampledPulseEnergies,perShiftRenormalization:false},
    covariance:{definition:'C[n,m] = N0/Ts delta[n,m] + Ts sum_i q[i] s(t[n]-t[i]) s(t[m]-t[i])',frozenInParameterDerivatives:true,
      whiteFloor,symmetryRelative:covarianceSymmetryRelative,choleskyRelativeResidual,minimumCholeskyPivot:Math.min(...pivots),
      method:'real-Cholesky-triangular-solves',dimension:n,reused:false,
      probes:[[0,0],[n-1,n-1],[Math.floor(n/2),Math.floor(n/2)],[Math.floor(n/2),Math.floor(n/2)+1],[0,n-1]].map(([i,j])=>({i,j,value:C[i][j]}))},
    fisher:{parameterOrder:[...Array.from({length:k},(_,i)=>`tau_${i+1}`),...Array.from({length:k},(_,i)=>`Re_alpha_${i+1}`),...Array.from({length:k},(_,i)=>`Im_alpha_${i+1}`)],full:F,A,B,G,
      properComplexFactor:2,nuisanceRawEigenvalues:[...gainEigenvalues,...gainEigenvalues].sort((a,b)=>a-b),nuisanceSingularValueRatio:gainRatio,
      nuisanceCondition:gainEigenvalues[0]>0?gainEigenvalues[1]/gainEigenvalues[0]:null,nuisanceRatioThreshold:TOLERANCES.nuisanceSingularValueRatio,
      delayEfim:null,directSchur:null,informationSubtraction:null,schurProjectionRelativeToA:null,schurPebRelativeDifference:null},
    exact:missingBranch('pending',null),approximate:approx,knownGain:known,unknownClock:missingBranch('not-computed','gain-elimination-not-available')};
  if(debug)output.debug={C,L,T,WS,WD};
  yield {stage:'full-FIM'};
  if(k===2&&tau[0]===tau[1]) {
    output.exact=missingBranch('singular-nuisance-block','coincident-independent-complex-gain-columns');
    output.exact.interpretation='The separate-gain parameterization is singular; this does not assert zero information in every reduced physical parameterization';
    return output;
  }
  if(gainRatio===null||gainRatio<=TOLERANCES.nuisanceSingularValueRatio) {
    output.exact=missingBranch('numerically-unresolved-nuisance','gain-singular-value-ratio-not-resolvably-above-1e-5');return output;
  }
  const LG=choleskySmall(G);
  if(!LG) {output.exact=missingBranch('numerically-unresolved-nuisance','ordinary-nuisance-solve-failed');return output;}
  const schurSub=multiply(B,transpose(B.map(row=>solveFromCholesky(LG,row))));
  const schur=symmetrize(subtract(A,schurSub));
  const basis=[];
  for(const col of WS) {
    const v=col.slice();
    for(let pass=0;pass<2;pass++)for(const q of basis){const c=dot(q,v);for(let i=0;i<n;i++)v[i]-=c*q[i];}
    const length=Math.sqrt(dot(v,v));
    if(!(length>0)||!Number.isFinite(length)){output.exact=missingBranch('numerically-unresolved-nuisance','whitened-gain-orthogonalization-failed');return output;}
    basis.push(v.map(x=>x/length));
  }
  const residuals=WD.map(col=>{
    const v=col.slice();
    for(let pass=0;pass<2;pass++)for(const q of basis){const c=dot(q,v);for(let i=0;i<n;i++)v[i]-=c*q[i];}
    return v;
  });
  const lam=matrix(k,k);
  for(let i=0;i<k;i++)for(let j=0;j<k;j++)lam[i][j]=2*dot(m.gains[i],m.gains[j])*dot(residuals[i],residuals[j]);
  const disagreement=norm(subtract(schur,lam))/Math.max(norm(A),tiny);
  const E=positionMap(lam,H),exact=positionResult(E,knownE,structure),schurResult=positionResult(positionMap(schur,H),knownE,structure);
  const pebDisagreement=exact.status==='finite'&&schurResult.status==='finite'?Math.abs(exact.pebM-schurResult.pebM)/exact.pebM:null;
  if(disagreement>TOLERANCES.schurRelativeToA||(exact.status==='finite'&&(schurResult.status!=='finite'||pebDisagreement>TOLERANCES.schurPebRelative))) {
    exact.status='numerical-failure';exact.reason='Schur-and-projection-disagree';exact.pebM=null;exact.ellipse=null;
  }
  const subtraction=positionMap(schurSub,H),knowledgeDifference=subtract(knownE,E),knowledgeEigenvalues=eig2(symmetrize(knowledgeDifference)).values;
  if(knowledgeEigenvalues[0]<-TOLERANCES.positionRelativeToKnown*Math.max(...eig2(knownE).values.map(Math.abs),tiny)) {
    exact.status='numerical-failure';exact.reason='known-minus-unknown-information-not-PSD';exact.pebM=null;exact.ellipse=null;
  }
  Object.assign(output.fisher,{delayEfim:lam,directSchur:schur,informationSubtraction:schurSub,positionInformationSubtraction:subtraction,
    knownMinusUnknownEigenvalues:knowledgeEigenvalues,schurProjectionRelativeToA:disagreement,schurPebRelativeDifference:pebDisagreement,
    directSchurPosition:schurResult});
  output.exact=exact;
  const ones=Array(k).fill(1),lOne=lam.map(r=>dot(r,ones)),d=dot(ones,lOne);
  const clockThreshold=TOLERANCES.positionRelativeToKnown*Math.max(norm(lam),tiny);
  if(!(d>clockThreshold))output.unknownClock={...missingBranch('singular-clock-nuisance','common-clock-information-not-resolvably-positive'),denominator:d,denominatorThreshold:clockThreshold};
  else {
    const g=multiply(transpose(H),lOne.map(x=>[x])).map(r=>r[0]);
    const clockE=exact.efim.map((r,i)=>r.map((v,j)=>v-g[i]*g[j]/d));
    output.unknownClock={...positionResult(clockE,knownE,'two-delays-for-two-coordinates-and-common-clock'),denominator:d,denominatorThreshold:clockThreshold,
      rankUpperBound:1,assumption:'Same frozen observed-domain covariance as synchronized model'};
    // A rank theorem, not a floating-point decision. Never report a finite clock PEB.
    output.unknownClock.pebM=null;output.unknownClock.ellipse=null;
  }
  return output;
}
