import {mat,adj,mul,chol,solveChol,eye,add,scale,trace,eigenvalues,herm,pack,frobenius} from './linalg.mjs';
import {matrix,coords} from './solver.mjs';
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export function certify(s){
 const {p,m,x,t}=s,P=m.c.power,gamma=m.gamma,mu=x[75];
 const slacks=p.cs.map(({a,b})=>dot(a,x)+b),duals=slacks.map(v=>1/(t*v));let alpha=duals.slice(3,6),eta=duals.slice(1,3),lambda=duals[0],cross=[],rhos=[];
 for(const v of p.soc){const re=dot(v.ar,x),im=dot(v.ai,x),d=m.c.epsilon**2*mu**2-re**2-im**2;cross.push({i:v.i,j:v.j,re:2*re/(t*d),im:2*im/(t*d)});rhos.push(2*m.c.epsilon*mu/(t*d));}
 // Normalize target/SOC multipliers to make the illumination dual coefficient exactly one.
 const normalizer=alpha.reduce((a,b)=>a+b,0)-m.c.epsilon*rhos.reduce((a,b)=>a+b,0);if(!(normalizer>0))throw Error('invalid_dual_normalizer');
 alpha=alpha.map(v=>v/normalizer);eta=eta.map(v=>v/normalizer);lambda/=normalizer;rhos=rhos.map(v=>v/normalizer);cross=cross.map(v=>({...v,re:v.re/normalizer,im:v.im/normalizer}));
 let C=mat(5,5);for(let k=0;k<2;k++)C.re[k*5+k]+=eta[k]*gamma;for(let k=0;k<3;k++)C.re[(k+2)*5+k+2]-=alpha[k];
 for(const v of cross){C.re[v.i*5+v.j]+=v.re/2;C.re[v.j*5+v.i]+=v.re/2;C.im[v.i*5+v.j]+=v.im/2;C.im[v.j*5+v.i]-=v.im/2;}
 let blocks=[C,...eta.map((e,k)=>{let A=add(C,mat(5,5));A.re[k*5+k]-=e*(gamma+1);return A;})];
 let L=chol(m.G),invL=mul(adj(L),solveChol(L,eye(5))),needs=blocks.map(A=>-eigenvalues(herm(mul(mul(invL,A),adj(invL))))[0]);
 const before=lambda;lambda=Math.max(lambda,0,...needs)+1e-10;
 const dualPSD=blocks.map(A=>eigenvalues(herm(add(A,scale(m.G,lambda))))[0]),upper=P*(lambda-eta.reduce((v,e,k)=>v+e*gamma*m.noise[k],0));
 const F=[matrix(x,0),matrix(x,25)],rsOriginal=matrix(x,50),R=add(add(F[0],F[1]),rsOriginal),beams=mat(5,2),diff=[];
 for(let k=0;k<2;k++){const desired=F[k].re[k*5+k];if(!(desired>0))throw Error('rank_recovery_nonpositive_gain');for(let i=0;i<5;i++){beams.re[i*2+k]=F[k].re[i*5+k]/Math.sqrt(desired);beams.im[i*2+k]=F[k].im[i*5+k]/Math.sqrt(desired);}let f=mat(5,1,Array.from({length:5},(_,i)=>beams.re[i*2+k]),Array.from({length:5},(_,i)=>beams.im[i*2+k]));diff.push(herm(add(F[k],mul(f,adj(f)),-1)));}
 const Rs=herm(add(R,mul(beams,adj(beams)),-1)),physical=A=>scale(mul(mul(m.B,A),adj(m.B)),P),rx=physical(R),rs=physical(Rs),wf=scale(mul(m.B,beams),Math.sqrt(P)),rates=[],sinrs=[];
 const observedBeams=mul(m.H,wf),observedRs=mul(mul(m.H,rs),adj(m.H)),observedRx=mul(mul(m.H,rx),adj(m.H));let desiredErrors=[];
 for(let k=0;k<2;k++){let desired=observedBeams.re[k*2+k]**2+observedBeams.im[k*2+k]**2,other=observedBeams.re[k*2+(1-k)]**2+observedBeams.im[k*2+(1-k)]**2,interference=other+observedRs.re[k*5+k]+m.c.noise/(m.norms[k]**2);sinrs.push(desired/interference);rates.push(Math.log2(1+desired/interference));const observedF=mul(mul(m.H,physical(F[k])),adj(m.H));desiredErrors.push(Math.abs(desired-observedF.re[k*5+k])/Math.max(desired,1e-30));}
 let gains=[2,3,4].map(i=>observedRx.re[i*5+i]),correlation=[];for(let i=2;i<5;i++)for(let j=i+1;j<5;j++)correlation.push(Math.hypot(observedRx.re[i*5+j],observedRx.im[i*5+j]));
 const residual={basisIdentityError:frobenius(add(mul(m.H,m.B),eye(5),-1)),recoveryDesiredRelativeError:Math.max(...desiredErrors),minRxEigenvalue:eigenvalues(herm(rx))[0],minRsEigenvalue:eigenvalues(rs)[0],minRecoveryDifferenceEigenvalue:Math.min(...diff.map(A=>eigenvalues(physical(A))[0])),powerExcess:trace(rx)-P,illuminationMargin:Math.min(...gains)-P*mu,maxCrossExcess:p.mode==='proposed'?Math.max(...correlation)-m.c.epsilon*P*mu:null,rateMargin:Math.min(...rates)-m.c.rate,covarianceReconstructionError:frobenius(add(rx,add(mul(wf,adj(wf)),rs),-1)),dualMinEigenvalue:Math.min(...dualPSD),relativeGap:(upper-P*mu)/Math.max(P*mu,1e-30)};
 const gates={basis:residual.basisIdentityError<=1e-8,desiredPreservation:residual.recoveryDesiredRelativeError<=1e-7,psd:Math.min(residual.minRxEigenvalue,residual.minRsEigenvalue,residual.minRecoveryDifferenceEigenvalue)>=-1e-7*P,power:residual.powerExcess<=1e-7*P,illumination:residual.illuminationMargin>=-1e-7*P,sinr:residual.rateMargin>=-1e-3,correlation:p.mode==='nccs'||residual.maxCrossExcess<=1e-7*P,reconstruction:residual.covarianceReconstructionError<=1e-7*P,dual:residual.dualMinEigenvalue>=-1e-8&&rhos.every((v,i)=>v+1e-12>=Math.hypot(cross[i].re,cross[i].im)),gap:residual.relativeGap>=-1e-7&&residual.relativeGap<=1e-4};
 return {config:m.c,mode:p.mode,status:s.status,accepted:s.status==='candidate'&&Object.values(gates).every(Boolean),steps:s.steps,seconds:s.seconds,objective:P*mu,power:trace(rx),rates,sinrs,gains,correlation,residual,gates,certificate:{kind:'floating_point_weak_duality_not_interval_proof',lower:P*mu,upper,alpha,eta,lambda,lambdaShift:lambda-before,rhos,cross,dualPSD,normalizer},matrices:{R:pack(R),F:F.map(pack),Rs:pack(Rs),basis:pack(m.B),beams:pack(wf),rx:pack(rx),rs:pack(rs)},history:s.history};
}
