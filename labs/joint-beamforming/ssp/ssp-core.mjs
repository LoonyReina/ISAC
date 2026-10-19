// Objective-derived real gradient; fixed preprint corrections described in SOURCE-AUDIT.md.
export const add=(a,b)=>[a[0]+b[0],a[1]+b[1]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1]], mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]], scale=(a,s)=>[a[0]*s,a[1]*s], conj=a=>[a[0],-a[1]], abs2=a=>a[0]*a[0]+a[1]*a[1];
export const unpack=a=>a.real.map((r,i)=>r.map((x,j)=>[x,a.imag[i][j]]));
export const pack=a=>({real:a.map(r=>r.map(x=>x[0])),imag:a.map(r=>r.map(x=>x[1]))});
const zeros=(m,n)=>Array.from({length:m},()=>Array.from({length:n},()=>[0,0]));
export function mm(a,b){let out=zeros(a.length,b[0].length);for(let i=0;i<a.length;i++)for(let k=0;k<b.length;k++)for(let j=0;j<b[0].length;j++)out[i][j]=add(out[i][j],mul(a[i][k],b[k][j]));return out;}
export const adj=a=>a[0].map((_,j)=>a.map(r=>conj(r[j])));
export const norm2=a=>a.reduce((s,r)=>s+r.reduce((t,z)=>t+abs2(z),0),0);
const dot=(a,b)=>a.reduce((s,r,i)=>s+r.reduce((t,z,j)=>t+z[0]*b[i][j][0]+z[1]*b[i][j][1],0),0);
const matSub=(a,b)=>a.map((r,i)=>r.map((z,j)=>sub(z,b[i][j])));
function matrix(a,m,n){return Array.isArray(a)&&a.length===m&&a.every(r=>Array.isArray(r)&&r.length===n&&r.every(z=>Array.isArray(z)&&z.length===2&&z.every(Number.isFinite)));}
export function validate(W,H,R0,gamma,noise){let m=W?.length,k=W?.[0]?.length;if(!m||!k||k>=m||m>32||!matrix(W,m,k)||!matrix(H,k,m)||!matrix(R0,m,m))throw Error('Invalid matrix dimensions or values');if(!Number.isFinite(gamma)||gamma<0||!Number.isFinite(noise)||noise<=0)throw Error('Invalid physical parameters');for(let i=0;i<m;i++)for(let j=0;j<m;j++)if(Math.sqrt(abs2(sub(R0[i][j],conj(R0[j][i]))))>1e-10)throw Error('R0 must be Hermitian');}
export function objectiveGradient(W,H,R0,gamma,noise=.01){validate(W,H,R0,gamma,noise);let F=mm(H,W),D=matSub(mm(W,adj(W)),R0);let residual=F.map((r,i)=>abs2(r[i])-gamma*(r.reduce((s,z,j)=>s+(j===i?0:abs2(z)),noise)));let U=F.map((r,i)=>r.map((z,j)=>scale(z,residual[i]*(i===j?1:-gamma))));let A=mm(D,W),B=mm(adj(H),U);let gradient=A.map((r,i)=>r.map((z,j)=>add(scale(z,4),scale(B[i][j],8))));let covariance_loss=norm2(D),penalty=residual.reduce((s,x)=>s+x*x,0);return {objective:covariance_loss+2*penalty,gradient,covariance_loss,penalty,residual};}
export function projectRows(W,power=1){if(!Number.isFinite(power)||power<=0||!W?.length)throw Error('Invalid power');let q=power/W.length;return W.map(r=>{let n=r.reduce((s,z)=>s+abs2(z),0);if(!Number.isFinite(n)||n<=Number.MIN_VALUE)throw Error('Zero/nonfinite row');return r.map(z=>scale(z,Math.sqrt(q/n)));});}
export function tangent(W,G,power=1){if(!Number.isFinite(power)||power<=0)throw Error('Invalid power');return W.map((r,i)=>{let v=r.reduce((s,z,j)=>s+z[0]*G[i][j][0]+z[1]*G[i][j][1],0)/(power/W.length);return r.map((z,j)=>sub(G[i][j],scale(z,v)));});}
export function* solveSteps({H,R0,W0,gammaDb=12,power=1,noise=.01,maxIterations=1000,tolerance=1e-5,recordEvery=20}){
 if(!Number.isFinite(gammaDb)||gammaDb < -30||gammaDb>40||!Number.isInteger(maxIterations)||maxIterations<1||maxIterations>30000||!Number.isFinite(tolerance)||tolerance<1e-10||tolerance>1e-2||!Number.isInteger(recordEvery)||recordEvery<1)throw Error('Invalid solver settings');
 let gamma=10**(gammaDb/10),W=projectRows(W0,power),v=objectiveGradient(W,H,R0,gamma,noise),step=.01,history=[],status='iteration_limit',backtracks=0,iteration=0,norm;
 for(;iteration<=maxIterations;iteration++){
 let T=tangent(W,v.gradient,power);norm=Math.sqrt(norm2(T));if(iteration%recordEvery===0||norm<=tolerance||iteration===maxIterations)history.push({iteration,objective:v.objective,tangent_gradient_fro:norm,step,covariance_loss:v.covariance_loss,penalty:v.penalty});
 if(norm<=tolerance){status='stationary';break;}if(iteration===maxIterations)break;
 let trialStep=step,candidate,nv,accepted=false;
 for(let ls=0;ls<80;ls++){candidate=projectRows(W.map((r,i)=>r.map((z,j)=>sub(z,scale(T[i][j],trialStep)))),power);nv=objectiveGradient(candidate,H,R0,gamma,noise);if(Number.isFinite(nv.objective)&&nv.objective<=v.objective-1e-4*trialStep*norm**2){accepted=true;break;}trialStep*=.5;backtracks++;}
 if(!accepted){status='line_search_stalled';break;}
 let S=matSub(candidate,W),Y=matSub(nv.gradient,v.gradient),sy=dot(S,Y),ss=norm2(S),yy=norm2(Y);step=sy>1e-20&&yy>1e-20?Math.min(10,Math.max(1e-10,iteration%2===0?ss/sy:sy/yy)):Math.min(10,Math.max(1e-10,trialStep*2));W=candidate;v=nv;
 if(iteration%20===19)yield {iteration:iteration+1,objective:v.objective};
 }
 if(history.at(-1)?.iteration!==iteration)history.push({iteration,objective:v.objective,tangent_gradient_fro:norm,step,covariance_loss:v.covariance_loss,penalty:v.penalty});
 return {W,status,iterations:iteration,objective:v.objective,covariance_loss:v.covariance_loss,penalty:v.penalty,residual:v.residual,tangent_gradient_fro:norm,backtracks,history,gammaDb,power,noise};
}
export function solve(options){let g=solveSteps(options),n;do{n=g.next();}while(!n.done);return n.value;}
export function physical(W,H,R0,gammaDb,Wr=null,noise=.01,power=1){validate(W,H,R0,10**(gammaDb/10),noise);if(Wr&&!matrix(Wr,W.length,Wr[0]?.length))throw Error('Invalid radar factor');let R=mm(W,adj(W));if(Wr){let rr=mm(Wr,adj(Wr));R=R.map((r,i)=>r.map((z,j)=>add(z,rr[i][j])));}let F=mm(H,W),Fr=Wr?mm(H,Wr):null;let sinr=F.map((r,i)=>abs2(r[i])/(r.reduce((s,z,j)=>s+(i===j?0:abs2(z)),noise)+(Fr?Fr[i].reduce((s,z)=>s+abs2(z),0):0)));let angles=Array.from({length:1801},(_,i)=>i/10-90);
 const pattern=Q=>angles.map(theta=>{let a=Array.from({length:W.length},(_,i)=>[Math.cos(Math.PI*i*Math.sin(theta*Math.PI/180)),Math.sin(Math.PI*i*Math.sin(theta*Math.PI/180))]);let s=[0,0];for(let i=0;i<a.length;i++)for(let j=0;j<a.length;j++)s=add(s,mul(mul(conj(a[i]),Q[i][j]),a[j]));return s[0];});
 let p=pattern(R),p0=pattern(R0),min=Math.min(...sinr);return {sinr_linear:sinr,min_sinr_db:10*Math.log10(min),sinr_target_pass:min>=10**(gammaDb/10)*(1-2e-5),relative_sinr_shortfall:Math.max(0,1-min/10**(gammaDb/10)),sum_rate:sinr.reduce((s,x)=>s+Math.log2(1+x),0),power:R.reduce((s,r,i)=>s+r[i][0],0),per_antenna_max_error:Math.max(...R.map((r,i)=>Math.abs(r[i][0]-power/W.length))),covariance_loss:norm2(matSub(R,R0)),eq46_mse:p.reduce((s,x,i)=>s+(x-p0[i])**2,0)/p.length,angles,pattern:p,target_pattern:p0};}
