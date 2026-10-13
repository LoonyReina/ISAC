import {mat,eye,chol,solveChol,mul,adj,add,scale,trace} from './linalg.mjs';
import {model} from './model.mjs';
const N=5,D=25,V=76,SQ=Math.SQRT2;
export function matrix(x,offset=0){let A=mat(N,N),p=offset;for(let i=0;i<N;i++)A.re[i*N+i]=x[p++];for(let i=0;i<N;i++)for(let j=i+1;j<N;j++)A.re[i*N+j]=A.re[j*N+i]=x[p++]/SQ;for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){A.im[i*N+j]=x[p++]/SQ;A.im[j*N+i]=-A.im[i*N+j];}return A;}
export function coords(A){let x=new Float64Array(D),p=0;for(let i=0;i<N;i++)x[p++]=A.re[i*N+i];for(let i=0;i<N;i++)for(let j=i+1;j<N;j++)x[p++]=SQ*A.re[i*N+j];for(let i=0;i<N;i++)for(let j=i+1;j<N;j++)x[p++]=SQ*A.im[i*N+j];return x;}
const E=Array.from({length:D},(_,i)=>{let x=new Float64Array(D);x[i]=1;return matrix(x)});
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
function linear(a,b,name){return {a,b,name};}
export function problem(m,mode){
 if(!['proposed','nccs'].includes(mode))throw Error('invalid mode');
 let cs=[],a=new Float64Array(V),g=coords(m.G);for(let b=0;b<3;b++)for(let i=0;i<D;i++)a[b*D+i]=-g[i];cs.push(linear(a,1,'power'));
 for(let k=0;k<2;k++){a=new Float64Array(V);for(let b=0;b<3;b++)a[b*D+k]=b===k?1:-m.gamma;cs.push(linear(a,-m.gamma*m.noise[k],'sinr'+k));}
 for(let k=2;k<5;k++){a=new Float64Array(V);for(let b=0;b<3;b++)a[b*D+k]=1;a[75]=-1;cs.push(linear(a,0,'target'+k));}
 a=new Float64Array(V);a[75]=1;cs.push(linear(a,0,'mu'));
 let soc=[];if(mode==='proposed')for(let i=2;i<5;i++)for(let j=i+1;j<5;j++){
 let ar=new Float64Array(V),ai=new Float64Array(V),q=5;for(let k=0;k<i;k++)q+=4-k;q+=j-i-1;
 for(let b=0;b<3;b++){ar[b*D+q]=1/SQ;ai[b*D+q+10]=1/SQ;}soc.push({ar,ai,i,j});
 }
 return {m,mode,cs,soc};
}
function evaluate(p,x,t,derivatives=true){
 let value=-t*x[75],grad=new Float64Array(V),hess=new Float64Array(V*V);grad[75]=-t;
 try{
 for(let b=0;b<3;b++){
 const A=matrix(x,b*D),L=chol(A);for(let i=0;i<N;i++)value-=2*Math.log(L.re[i*N+i]);
 if(derivatives){const inv=solveChol(L,eye(N)),v=coords(inv);for(let i=0;i<D;i++)grad[b*D+i]-=v[i];
 for(let j=0;j<D;j++){const v=coords(mul(mul(inv,E[j]),inv));for(let i=0;i<D;i++)hess[(b*D+i)*V+b*D+j]+=v[i];}
 }
 }
 for(const {a,b} of p.cs){const s=dot(a,x)+b;if(!(s>0))return null;value-=Math.log(s);if(derivatives)for(let i=0;i<V;i++)if(a[i]){grad[i]-=a[i]/s;for(let j=0;j<V;j++)if(a[j])hess[i*V+j]+=a[i]*a[j]/(s*s);}}
 for(const {ar,ai} of p.soc){let r=dot(ar,x),im=dot(ai,x),e=p.m.c.epsilon,u=x[75],s=e*e*u*u-r*r-im*im;if(!(s>0))return null;value-=Math.log(s);if(derivatives){let ds=new Float64Array(V);for(let i=0;i<V;i++)ds[i]=-2*(r*ar[i]+im*ai[i]);ds[75]=2*e*e*u;for(let i=0;i<V;i++){grad[i]-=ds[i]/s;for(let j=0;j<V;j++)hess[i*V+j]+=ds[i]*ds[j]/(s*s)+2*(ar[i]*ar[j]+ai[i]*ai[j]-(i===75&&j===75?e*e:0))/s;}}}
 return {value,grad,hess};
 }catch{return null;}
}
function newton(H,g){let d=Array.from({length:V},(_,i)=>Math.sqrt(H[i*V+i])),A=new Float64Array(V*V),b=new Float64Array(V);for(let i=0;i<V;i++){b[i]=-g[i]/d[i];for(let j=0;j<V;j++)A[i*V+j]=H[i*V+j]/(d[i]*d[j]);}
 // Equilibrated SPD Cholesky. No regularization conceals a failed Newton system.
 let L=new Float64Array(V*V);for(let i=0;i<V;i++)for(let j=0;j<=i;j++){let s=(A[i*V+j]+A[j*V+i])/2;for(let k=0;k<j;k++)s-=L[i*V+k]*L[j*V+k];if(i===j){if(!(s>0))throw Error('newton_factorization_failed');L[i*V+j]=Math.sqrt(s);}else L[i*V+j]=s/L[j*V+j];}
 for(let i=0;i<V;i++){for(let j=0;j<i;j++)b[i]-=L[i*V+j]*b[j];b[i]/=L[i*V+i];}for(let i=V-1;i>=0;i--){for(let j=i+1;j<V;j++)b[i]-=L[j*V+i]*b[j];b[i]/=L[i*V+i];}return b.map((v,i)=>v/d[i]);
}
export function initial(p){let x=new Float64Array(V),m=p.m;let userCost=m.gamma*m.noise.reduce((s,n,k)=>s+n*m.G.re[k*5+k],0);if(userCost>=.95)throw Error('strict_diagonal_start_unavailable_not_infeasibility');let small=(1-userCost)/(100*(1+m.gamma)*trace(m.G));for(let b=0;b<3;b++)for(let k=0;k<5;k++)x[b*D+k]=small;for(let k=0;k<2;k++)x[k*D+k]=m.gamma*(m.noise[k]+2*small)+small;let used=-dot(p.cs[0].a,x);let target=(1-used)/(2*(m.G.re[12]+m.G.re[18]+m.G.re[24]));for(let k=2;k<5;k++)x[50+k]+=target;x[75]=target/2;if(!evaluate(p,x,1,false))throw Error('initial_not_strictly_feasible');return x;}
export async function solve(input={},mode='proposed',options={}){
 const start=performance.now(),maxSteps=options.maxSteps??500,maxMs=options.maxMs??10000,relativeGap=options.relativeGap??1e-5;
 if(!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>600||!Number.isFinite(maxMs)||maxMs<1||maxMs>10000||!Number.isFinite(relativeGap)||relativeGap<1e-7||relativeGap>1e-4)throw Error('invalid finite solver caps');
 const m=model(input),p=problem(m,mode),rateUpperBounds=m.norms.slice(0,2).map(n=>Math.log2(1+m.c.power*n*n/m.c.noise));
 if(Math.min(...rateUpperBounds)<m.c.rate)return {status:'infeasible_single_user_bound',rateUpperBounds};
 let x=initial(p),steps=0,history=[],status='iteration_cap',lastT=1;
 for(let t=1;steps<maxSteps;t*=5){let centered=false;for(let k=0;k<70&&steps<maxSteps;k++){
 if(options.cancelled?.())return {status:'cancelled',steps};if(performance.now()-start>maxMs)return {status:'runtime_cap',steps,history};
 let f=evaluate(p,x,t),dx;try{dx=newton(f.hess,f.grad)}catch(e){status=e.message;break;}
 let slope=dot(f.grad,dx);steps++;if(-slope/2<1e-8){centered=true;break;}
 let alpha=1,trial,fn;for(let ls=0;ls<60;ls++){trial=x.map((v,i)=>v+alpha*dx[i]);fn=evaluate(p,trial,t,false);if(fn&&fn.value<=f.value+.01*alpha*slope)break;alpha*=.5;fn=null;}
 if(!fn){status='line_search_failed';break;}x=trial;
 if(steps%8===0){options.progress?.({steps,mu:x[75]*m.c.power,t});await new Promise(r=>setTimeout(r,0));}
 }
 lastT=t;history.push({t,steps,mu:x[75]*m.c.power,centered});if(!centered){if(status==='iteration_cap')status='centering_cap';break;}
 const nu=15+p.cs.length+2*p.soc.length;if(nu/t<=relativeGap*x[75]){status='candidate';break;}
 }
 return {status,steps,seconds:(performance.now()-start)/1000,history,x:Array.from(x),t:lastT,m,p};
}
export {evaluate};
