import {mat,adj,mul,chol,solveChol,eye} from './linalg.mjs';
export const DEFAULT={side:6,wavelength:.01,power:10**(-.7),noise:1e-8,rate:4,epsilon:.1,snapshots:1000,users:[[0,.1,.1],[0,.5,.5]],targets:[[0,-.1,.1],[0,-.25,.25],[0,0,.4]]};
export function model(input={}){
 const c={...DEFAULT,...input};
 for(const k of ['wavelength','power','noise','rate','epsilon'])if(!Number.isFinite(c[k]))throw Error('invalid '+k);
 if(!Number.isInteger(c.side)||c.side<4||c.side>10||c.wavelength<.005||c.wavelength>.02||c.power<=0||c.power>1||c.noise<1e-12||c.noise>1e-6||c.rate<=0||c.rate>17||c.epsilon<.01||c.epsilon>.5)throw Error('outside bounded input');
 if(!Array.isArray(c.users)||!Array.isArray(c.targets)||c.users.length!==2||c.targets.length!==3)throw Error('two users and three targets required');
 if(!Number.isInteger(c.snapshots)||c.snapshots<32||c.snapshots>1024)throw Error('snapshots must be 32..1024');
 const n=c.side**2, H=mat(5,n),norms=[];
 for(const [k,p] of [...c.users,...c.targets].entries()){
 if(!Array.isArray(p)||p.length!==3||p.some(x=>!Number.isFinite(x)||Math.abs(x)>2)||p[2]<.05)throw Error('invalid position');
 let norm=0;
 for(let i=0;i<c.side;i++)for(let j=0;j<c.side;j++){
 const x=(i-(c.side-1)/2)*c.wavelength/2,y=(j-(c.side-1)/2)*c.wavelength/2,r=Math.hypot(p[0]-x,p[1]-y,p[2]),a=Math.sqrt(6)*p[2]/r*c.wavelength/(4*Math.PI*r),ph=-2*Math.PI*r/c.wavelength,q=k*n+i*c.side+j;
 H.re[q]=a*Math.cos(ph);H.im[q]=a*Math.sin(ph);norm+=a*a;
 }norms.push(Math.sqrt(norm));for(let j=0;j<n;j++){H.re[k*n+j]/=norms[k];H.im[k*n+j]/=norms[k];}
 }
 const gram=mul(H,adj(H)),G=solveChol(chol(gram),eye(5)),B=mul(adj(H),G);
 // B = H^H (H H^H)^-1 equals Q(HQ)^-1; power metric G = B^H B.
 return {c,H,G,B,norms,gamma:2**c.rate-1,noise:norms.slice(0,2).map(x=>c.noise/(c.power*x*x))};
}
