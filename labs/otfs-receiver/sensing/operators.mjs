/** Two distinct operators; both multiply hprime=h exp(j 2π ν τ).
 * Eq14: cyclic/right-endpoint/negative-carrier/shifted-DD convention of frozen audit.
 * Finite: positive carrier rectangular pulses, zero outside frame, receive [0,NT).
 * Complex JSON pairs externally; column-stacked vectors d=k+N*l throughout.
 */
import {frame,knownSignal,parameters,model,numericFail} from './validation.mjs';
const TAU=2*Math.PI;
function dirichlet(n,arg){let re=0,im=0;for(let j=0;j<n;j++){const p=TAU*arg*j/n;re+=Math.cos(p)/n;im+=Math.sin(p)/n;}return [re,im];}
function unpack(x){return {re:Float64Array.from(x,z=>z.re),im:Float64Array.from(x,z=>z.im)};}
function pack(r,i){return Array.from(r,(re,d)=>{if(!Number.isFinite(re)||!Number.isFinite(i[d]))numericFail('Operator produced nonfinite samples');return {re,im:i[d]};});}
function unitaryMatrix(N,M){const D=N*M,re=new Float64Array(D*D),im=new Float64Array(D*D),scale=1/Math.sqrt(D);for(let row=0;row<D;row++)for(let col=0;col<D;col++){const n=row%N,m=Math.floor(row/N),k=col%N,l=Math.floor(col/N),p=TAU*(n*k/N-m*l/M),j=row*D+col;re[j]=scale*Math.cos(p);im[j]=scale*Math.sin(p);}return {re,im};}
function multiply(U,x,D,adjoint=false){const r=new Float64Array(D),i=new Float64Array(D);for(let row=0;row<D;row++)for(let col=0;col<D;col++){const j=adjoint?col*D+row:row*D+col,ur=U.re[j],ui=adjoint?-U.im[j]:U.im[j];r[row]+=ur*x.re[col]-ui*x.im[col];i[row]+=ur*x.im[col]+ui*x.re[col];}return {re:r,im:i};}
/** Exact algebraic factorization, not a 2-D circular-convolution substitute. */
function literalAction(N,M,x,q,a){
  const D=N*M,dr=new Float64Array(N*N),di=new Float64Array(N*N),er=new Float64Array(M*M),ei=new Float64Array(M*M);
  for(let k=0;k<N;k++)for(let kp=0;kp<N;kp++){const [r,i]=dirichlet(N,kp-k+a);dr[k*N+kp]=r;di[k*N+kp]=i;}
  for(let l=0;l<M;l++)for(let lp=0;lp<M;lp++){const [r,i]=dirichlet(M,lp-l+q);er[l*M+lp]=r;ei[l*M+lp]=i;}
  const pr=new Float64Array(D),pi=new Float64Array(D),zr=new Float64Array(D),zi=new Float64Array(D),sr=new Float64Array(D),si=new Float64Array(D);
  for(let lp=0;lp<M;lp++)for(let kp=0;kp<N;kp++){const j=kp+N*lp,p=TAU*a*lp/(N*M)-(lp>=M-Math.ceil(q)?TAU*(kp+a)/N:0),r=Math.cos(p),i=Math.sin(p);pr[j]=r*x.re[j]-i*x.im[j];pi[j]=r*x.im[j]+i*x.re[j];}
  for(let l=0;l<M;l++)for(let kp=0;kp<N;kp++)for(let lp=0;lp<M;lp++){const z=kp+N*l,j=kp+N*lp,t=l*M+lp;zr[z]+=er[t]*pr[j]-ei[t]*pi[j];zi[z]+=er[t]*pi[j]+ei[t]*pr[j];}
  for(let l=0;l<M;l++)for(let k=0;k<N;k++)for(let kp=0;kp<N;kp++){const z=k+N*l,j=kp+N*l,t=k*N+kp;sr[z]+=dr[t]*zr[j]-di[t]*zi[j];si[z]+=dr[t]*zi[j]+di[t]*zr[j];}
  return pack(sr,si);
}
function sinc(z){if(Math.abs(z)<1e-8){const p=Math.PI*z;return 1-p*p/6+p**4/120;}return Math.sin(Math.PI*z)/(Math.PI*z);}
function finiteAction(N,M,U,X,q,a){
  const D=N*M,d=q/M,v=a/N,r=new Float64Array(D),i=new Float64Array(D);
  // With 0<=d<1, only the current and preceding finite TF symbols overlap.
  for(let n=0;n<N;n++)for(let m=0;m<M;m++)for(let np=Math.max(0,n-1);np<=n;np++){
    const lo=Math.max(n,np+d),hi=Math.min(n+1,np+1+d),width=Math.max(hi-lo,0);if(width===0)continue;
    for(let mp=0;mp<M;mp++){const freq=v+mp-m,amp=width*sinc(freq*width),phase=TAU*(freq*(lo+hi)/2-mp*d-v*d),hr=amp*Math.cos(phase),hi2=amp*Math.sin(phase),row=n+N*m,col=np+N*mp;
      r[row]+=hr*X.re[col]-hi2*X.im[col];i[row]+=hr*X.im[col]+hi2*X.re[col];}
  }
  const out=multiply(U,{re:r,im:i},D,true);return pack(out.re,out.im);
}
export function createTemplateOperator(rawFrame,rawX,modelId){
  const f=frame(rawFrame),x=unpack(knownSignal(rawX,f.N*f.M)),m=model(modelId),U=m==='exact_rect_finite'?unitaryMatrix(f.N,f.M):null,X=U?multiply(U,x,f.N*f.M):null;
  return Object.freeze({model:m,apply(q,a){parameters(f,q,a);return m==='eq14_literal'?literalAction(f.N,f.M,x,q,a):finiteAction(f.N,f.M,U,X,q,a);}});
}
export function literalEq14(f,x,q,a){return createTemplateOperator(f,x,'eq14_literal').apply(q,a);}
export function exactRectFinite(f,x,q,a){return createTemplateOperator(f,x,'exact_rect_finite').apply(q,a);}
export function isfft(rawFrame,rawX){const f=frame(rawFrame),x=unpack(knownSignal(rawX,f.N*f.M)),U=unitaryMatrix(f.N,f.M),X=multiply(U,x,f.N*f.M);return pack(X.re,X.im);}
export function frameLedger(rawFrame){const f=frame(rawFrame);return {...f,deltaFHz:1/f.T,bandwidthHz:f.M/f.T,usefulDurationS:f.N*f.T,sampleCount:f.N*f.M,vectorOrder:'d=k+N*l',cMps:299792458,energyUnits:'normalized symbol energy; not calibrated joules'};}
export function physicalCoordinates(rawFrame,q,a){const f=frame(rawFrame);parameters(f,q,a);const delayS=q*f.T/f.M,dopplerHz=a/(f.N*f.T);return {delayS,dopplerHz,monostaticRangeM:299792458*delayS/2,monostaticVelocityMps:299792458*dopplerHz/(2*f.fc),velocitySign:'positive Doppler gives positive reported radial velocity'};}
