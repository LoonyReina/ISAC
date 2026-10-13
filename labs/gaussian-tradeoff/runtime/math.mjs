/* Original Gaussian ISAC operations. Uses the unchanged independently reviewed
 * project SyncLinalg helper; see ATTRIBUTION.md. No author code or dependencies. */
import * as legacy from './vendor/linalg.js';
export const LA = legacy.default || globalThis.SyncLinalg;
export const EPS = Number.EPSILON;
export function fail(message, code='INVALID_INPUT', diagnostics) { const e=new Error(message); e.code=code; if(diagnostics)e.diagnostics=diagnostics; throw e; }
export function fromJSON(a,name='matrix') {
  if(!a || typeof a!=='object' || !Array.isArray(a.re) || !Array.isArray(a.im) || !a.re.length || a.re.length!==a.im.length)fail(`${name} requires equally sized re/im arrays`);
  const rows=a.re.length, cols=a.re[0]?.length;
  if(!Number.isInteger(cols)||cols<1||rows>64||cols>64)fail(`${name} dimensions exceed 64`);
  const out=LA.mat(rows,cols);
  for(let i=0;i<rows;i++) {
    if(!Array.isArray(a.re[i])||!Array.isArray(a.im[i])||a.re[i].length!==cols||a.im[i].length!==cols)fail(`${name} must be rectangular`);
    for(let j=0;j<cols;j++) {const r=a.re[i][j],im=a.im[i][j]; if(typeof r!=='number'||typeof im!=='number'||!Number.isFinite(r)||!Number.isFinite(im))fail(`${name} must be finite`);out.data[2*(i*cols+j)]=r;out.data[2*(i*cols+j)+1]=im;}
  }
  return out;
}
export function toJSON(a) { return {re:Array.from({length:a.rows},(_,i)=>Array.from({length:a.cols},(_,j)=>a.data[2*(i*a.cols+j)])),im:Array.from({length:a.rows},(_,i)=>Array.from({length:a.cols},(_,j)=>a.data[2*(i*a.cols+j)+1]))}; }
export function scale(a,s){return LA.mat(a.rows,a.cols,Float64Array.from(a.data,x=>x*s));}
export function add(a,b,s=1){if(a.rows!==b.rows||a.cols!==b.cols)fail('Matrix addition dimension mismatch');return LA.mat(a.rows,a.cols,Float64Array.from(a.data,(x,i)=>x+s*b.data[i]));}
export function eye(n,d=1){const a=LA.mat(n,n);for(let i=0;i<n;i++)a.data[2*(i*n+i)]=d;return a;}
export function trace(a){let t=0;for(let i=0;i<Math.min(a.rows,a.cols);i++)t+=a.data[2*(i*a.cols+i)];return t;}
export function hermitize(a){return scale(add(a,LA.adjoint(a)),.5);}
export function transpose(a){const b=LA.adjoint(a);for(let i=1;i<b.data.length;i+=2)b.data[i]*=-1;return b;}
export function covariance(x){return hermitize(scale(LA.multiply(x,LA.adjoint(x)),1/x.cols));}
export function spectrum(a,{positive=false}={}) {
  if(a.rows!==a.cols)fail('Covariance must be square');
  const residual=LA.norm(add(a,LA.adjoint(a),-1))/Math.max(1,LA.norm(a));
  if(residual>1e-11)fail('Covariance must be Hermitian');
  const d=LA.hermitianEigen(hermitize(a)),v=Array.from(d.values),tol=1e-11*Math.max(1,Math.abs(v[0]));
  if(positive && v[v.length-1]<-tol)fail('Covariance must be positive semidefinite');
  return {...d,values:positive?v.map(x=>Math.max(0,x)):v,inputHermitianResidual:residual};
}
export function spectral(v,values){const n=v.rows,b=LA.mat(n,v.cols);for(let i=0;i<n;i++)for(let j=0;j<v.cols;j++){const p=2*(i*v.cols+j);b.data[p]=v.data[p]*values[j];b.data[p+1]=v.data[p+1]*values[j];}return hermitize(LA.multiply(b,LA.adjoint(v)));}
export function inverseHPD(a){const d=spectrum(a),lo=d.values.at(-1),hi=d.values[0];if(!(lo>0)||hi/lo>1e12)fail('Positive inverse is singular or exceeds condition cap 1e12','NUMERICAL_DEGENERACY',{minimumEigenvalue:lo,maximumEigenvalue:hi,condition:lo>0?hi/lo:'infinite'});const inv=spectral(d.vectors,d.values.map(x=>1/x));const residual=LA.norm(add(LA.multiply(a,inv),eye(a.rows),-1))/Math.sqrt(a.rows);if(residual>2e-4)fail('Inverse residual failed','NUMERICAL_DEGENERACY',{residual});return {matrix:inv,condition:hi/lo,residual};}
export function logdetHPD(a){const d=spectrum(a);if(d.values.at(-1)<=0)fail('Log determinant requires positive matrix','NUMERICAL_DEGENERACY');return d.values.reduce((s,x)=>s+Math.log(x),0);}
export function gaussianRate(h,q,noise){const signal=hermitize(scale(LA.multiply(LA.multiply(h,q),LA.adjoint(h)),1/noise));return spectrum(signal,{positive:true}).values.reduce((s,x)=>s+Math.log1p(x),0)/Math.LN2;}
export function conditionalError(x,model){
 const d=LA.svd(x,{rcond:0}),z=model.sensingNoise/(model.t*model.priorVariance),sv=Array.from(d.values);
 const vals=sv.map(s=>s*s/model.t);while(vals.length<model.m)vals.push(0);
 return {value:model.sensingNoise*model.ns/model.t*vals.reduce((s,q)=>s+1/(q+z),0),sampleEigenvalues:vals,svdDiagnostics:d.diagnostics};
}
export function covarianceError(q,model){const vals=spectrum(q,{positive:true}).values,z=model.sensingNoise/(model.t*model.priorVariance);return model.sensingNoise*model.ns/model.t*vals.reduce((s,x)=>s+1/(x+z),0);}
export function posterior(y,x,noise,prior){
 if(y.cols!==x.cols)fail('Y and X block lengths differ');
 const m=x.rows,xx=hermitize(LA.multiply(x,LA.adjoint(x))),precision=add(scale(xx,1/noise),eye(m,1/prior)),inv=inverseHPD(precision),row=inv.matrix,col=transpose(row);
 const estimate=scale(LA.multiply(LA.multiply(y,LA.adjoint(x)),row),1/noise);
 // Direct real likelihood with h-column coordinate: B=[Re X^T,-Im X^T;Im X^T,Re X^T].
 const B=Array.from({length:2*x.cols},()=>Array(2*m).fill(0));
 for(let t=0;t<x.cols;t++)for(let i=0;i<m;i++){const p=2*(i*x.cols+t),r=x.data[p],s=x.data[p+1];B[t][i]=r;B[t][i+m]=-s;B[t+x.cols][i]=s;B[t+x.cols][i+m]=r;}
 const J=Array.from({length:2*m},(_,i)=>Array.from({length:2*m},(_,j)=>2*(B.reduce((s,b)=>s+b[i]*b[j],0)/noise+(i===j?1/prior:0))));
 return {estimate,posteriorCovarianceRow:row,posteriorCovarianceColumn:col,realBFIM:J,conditionalTrace:y.rows*trace(row),inverseCondition:inv.condition,inverseResidual:inv.residual};
}
export function rng(seed){let state=seed>>>0,spare=null;return {uniform(){state=(state+0x6D2B79F5)>>>0;let t=Math.imul(state^(state>>>15),1|state);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;},normal(){if(spare!==null){const x=spare;spare=null;return x;}const u=(this.uniform()*4294967296+.5)/4294967296,v=this.uniform(),r=Math.sqrt(-2*Math.log(u));spare=r*Math.sin(2*Math.PI*v);return r*Math.cos(2*Math.PI*v);},complex(rows,cols){const a=LA.mat(rows,cols);for(let i=0;i<a.data.length;i++)a.data[i]=this.normal()/Math.SQRT2;return a;}};}
export function stiefelRows(base,rank){
 // Two-pass modified Gram-Schmidt of iid CN columns is thin complex QR with positive diagonal.
 const t=base.rows;if(rank>t||base.cols!==rank)fail('Stiefel rank exceeds block length');const q=LA.mat(t,rank);
 for(let j=0;j<rank;j++){const z=Float64Array.from({length:2*t},(_,p)=>base.data[2*(Math.floor(p/2)*rank+j)+p%2]);for(let pass=0;pass<2;pass++)for(let k=0;k<j;k++){let r=0,im=0;for(let i=0;i<t;i++){let a=2*(i*rank+k);r+=q.data[a]*z[2*i]+q.data[a+1]*z[2*i+1];im+=q.data[a]*z[2*i+1]-q.data[a+1]*z[2*i];}for(let i=0;i<t;i++){const a=2*(i*rank+k);z[2*i]-=q.data[a]*r-q.data[a+1]*im;z[2*i+1]-=q.data[a]*im+q.data[a+1]*r;}}
 const norm=LA.norm(z);if(norm<1e-12)fail('Random Stiefel QR is numerically degenerate','NUMERICAL_DEGENERACY');for(let i=0;i<t;i++){q.data[2*(i*rank+j)]=z[2*i]/norm;q.data[2*(i*rank+j)+1]=z[2*i+1]/norm;}}
 const orth=LA.norm(add(LA.multiply(LA.adjoint(q),q),eye(rank),-1));if(orth>1e-11)fail('Stiefel orthogonality failed','NUMERICAL_DEGENERACY');return LA.adjoint(q);
}
export function summarize(a){if(a.length<2||a.some(x=>!Number.isFinite(x)))fail('Statistics need at least two finite samples');const mean=a.reduce((s,x)=>s+x,0)/a.length,se=Math.sqrt(a.reduce((s,x)=>s+(x-mean)**2,0)/(a.length-1)/a.length);return {count:a.length,mean,standardError:se,interval:[mean-1.96*se,mean+1.96*se],intervalType:'normal approximation, not a rigorous confidence guarantee'};}
export async function adaptiveSimpson(fn,a,b,tolerance=1e-10,checkpoint=async()=>{},maxDepth=24){
 let evaluations=0,segments=0,error=0;const f=x=>{const v=fn(x);evaluations++;if(!Number.isFinite(v))fail('Nonfinite quadrature integrand','QUADRATURE_FAILED');return v;};
 const fa=f(a),fb=f(b),c=(a+b)/2,fc=f(c),stack=[{a,b,fa,fb,fc,s:(b-a)*(fa+4*fc+fb)/6,tol:tolerance,depth:0}],sum=[];
 while(stack.length){const p=stack.pop(),mid=(p.a+p.b)/2,l=(p.a+mid)/2,r=(mid+p.b)/2,fl=f(l),fr=f(r),s1=(mid-p.a)*(p.fa+4*fl+p.fc)/6,s2=(p.b-mid)*(p.fc+4*fr+p.fb)/6,d=s1+s2-p.s;
 if(Math.abs(d)<=15*p.tol){sum.push(s1+s2+d/15);error+=Math.abs(d)/15;segments++;}else{if(p.depth>=maxDepth||evaluations>200000)fail('Quadrature refinement limit','QUADRATURE_FAILED',{evaluations,depth:p.depth});stack.push({a:mid,b:p.b,fa:p.fc,fb:p.fb,fc:fr,s:s2,tol:p.tol/2,depth:p.depth+1},{a:p.a,b:mid,fa:p.fa,fb:p.fc,fc:fl,s:s1,tol:p.tol/2,depth:p.depth+1});}
 if(evaluations%128===1)await checkpoint();
 }
 return {value:sum.reduce((s,x)=>s+x,0),estimatedError:error,evaluations,segments};
}
export function logFactorial(n){let s=0;for(let k=2;k<=n;k++)s+=Math.log(k);return s;}
export function laguerre(k,alpha,x){if(k===0)return 1;let a=1,b=1+alpha-x;for(let n=1;n<k;n++){let c=((2*n+1+alpha-x)*b-(n+alpha)*a)/(n+1);a=b;b=c;}return b;}
export function mpResolvent(beta,z){const root=Math.sqrt((z+beta-1)**2+4*z);return z+1-beta>=0?2/(root+z+1-beta):(root-(z+1-beta))/(2*beta*z);}
export async function wishart({m,t,q,ns,sensingNoise,priorVariance},checkpoint=async()=>{}) {
 const r=Math.min(m,t),alpha=Math.abs(t-m),z=sensingNoise/(t*priorVariance),scale=sensingNoise*ns/t;
 const density=x=>Math.exp(alpha*Math.log(x)-x)*Array.from({length:r},(_,k)=>Math.exp(logFactorial(k)-logFactorial(k+alpha))*laguerre(k,alpha,x)**2).reduce((s,x)=>s+x,0);
 // Log-domain integration resolves the near-zero resolvent without dropping T<M zero modes.
 const lo=Math.min(-36,Math.log(z*t/q)-32),hi=Math.log(Math.max(160,4*Math.max(m,t)+80));
 const integrate=async(tol,mass=false)=>{let value=0,estimatedError=0,evaluations=0;for(let a=lo;a<hi;a+=2){const part=await adaptiveSimpson(u=>{const x=Math.exp(u),d=density(x)*x;return mass?d:d/(q*x/t+z);},a,Math.min(a+2,hi),tol/(1+(hi-lo)/2),checkpoint);value+=part.value;estimatedError+=part.estimatedError;evaluations+=part.evaluations;await checkpoint();}return {value,estimatedError,evaluations};};
 const coarse=await integrate(1e-8),fine=await integrate(2e-10),mass=await integrate(2e-10,true),zeroContribution=(m-r)*priorVariance*ns;
 return {value:scale*fine.value+zeroContribution,estimatedQuadratureError:scale*fine.estimatedError,refinementDifference:scale*Math.abs(fine.value-coarse.value),densityMass:mass.value,expectedDensityMass:r,densityMassResidual:Math.abs(mass.value-r),integrationLogDomain:[lo,hi],evaluations:coarse.evaluations+fine.evaluations+mass.evaluations,structuralZeroDirections:m-r,structuralZeroContribution:zeroContribution,mpApproximation:scale*m/q*mpResolvent(m/t,z/q),fixedCovarianceLowerBound:scale*m/(q+z),classification:'finite-dimensional exact expression evaluated by numerical quadrature; error diagnostics are not rigorous bounds'};
}
function logAdd(a,b){const m=Math.max(a,b);return m+Math.log(Math.exp(a-m)+Math.exp(b-m));}
export function logBesselIScaled(nu,z){if(z===0)return nu===0?0:-Infinity;let term=nu*Math.log(z/2)-logFactorial(nu),sum=term;for(let k=1;k<=10000;k++){term+=2*Math.log(z/2)-Math.log(k)-Math.log(nu+k);sum=logAdd(sum,term);if(k>z/2&&term<sum-42)return sum-z;}fail('Bessel series limit','QUADRATURE_FAILED');}
export async function sphere(snr,t,checkpoint=async()=>{}){
 if(snr===0)return {rate:0,gaussianUpperComparison:0,estimatedQuadratureError:0,refinementDifference:0,omittedTailProbabilityUpperBound:0,outputRadialMass:1,classification:'rank-one finite-SNR sphere MI numerical integral'};
 const a=Math.sqrt(t*snr),L=Math.sqrt(t)+12,upper=a+L;
 function values(r){if(r===0)return [0,0];const ar=a*r,ang=ar<1e-10?-2*ar:logFactorial(t-1)+(1-t)*Math.log(ar)+logBesselIScaled(t-1,2*ar),logp=Math.log(2)-logFactorial(t-1)+(2*t-1)*Math.log(r)-(r-a)**2+ang,p=Math.exp(logp);return [p*((r-a)**2-ang-t),p];}
 async function integrate(tol,index){let value=0,error=0,evals=0;const points=[0,...[a-8,a-4,a,a+4,a+8].filter(x=>x>0&&x<upper),upper].sort((a,b)=>a-b);for(let j=0;j<points.length-1;j++){const z=await adaptiveSimpson(r=>values(r)[index],points[j],points[j+1],tol/(points.length-1),checkpoint);value+=z.value;error+=z.estimatedError;evals+=z.evaluations;await checkpoint();}return {value,error,evals};}
 const coarse=await integrate(2e-8,0),fine=await integrate(2e-10,0),mass=await integrate(2e-10,1),tail=Math.exp(-L*L)*Array.from({length:t},(_,k)=>Math.exp(k*Math.log(L*L)-logFactorial(k))).reduce((s,x)=>s+x,0);
 return {rate:fine.value/(t*Math.LN2),gaussianUpperComparison:Math.log2(1+snr),estimatedQuadratureError:fine.error/(t*Math.LN2),refinementDifference:Math.abs(fine.value-coarse.value)/(t*Math.LN2),omittedTailProbabilityUpperBound:tail,tailWarning:'Probability bound alone does not bound omitted entropy',outputRadialMass:mass.value,radialUpper:upper,evaluations:coarse.evals+fine.evals+mass.evals,classification:'rank-one finite-SNR exact MI expression evaluated by numerical quadrature; not a general MIMO Stiefel rate'};
}
