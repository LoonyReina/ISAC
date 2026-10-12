/* Original, dependency-free teaching calculations. Units: m, s, Hz, rad.
   Convention: v > 0 approaches a co-located Tx/Rx; DFT uses exp(-j*2*pi*q*n/N).
   The sampled OFDM model assumes CP coverage, coherent clocks, low intra-symbol
   Doppler and negligible range migration. It is not a full RF transceiver. */
(function(root){
 'use strict';
 const TAU=2*Math.PI, C=3e8;
 const cfg=Object.freeze({K:16,M:16,fc:5e9,df:1e6,Tr:0.0005,Tcp:1e-6});
 const cis=p=>({re:Math.cos(p),im:Math.sin(p)});
 const mul=(a,b)=>({re:a.re*b.re-a.im*b.im,im:a.re*b.im+a.im*b.re});
 const power=a=>a.re*a.re+a.im*a.im;
 const wrap=p=>Math.atan2(Math.sin(p),Math.cos(p));
 function dft(x,inverse=false){
  const N=x.length; if(!N)throw new RangeError('Nonempty samples required');
  return Array.from({length:N},(_,q)=>{let re=0,im=0;for(let n=0;n<N;n++){
   const z=mul(x[n],cis((inverse?1:-1)*TAU*q*n/N));re+=z.re;im+=z.im;
  } return {re:re/N,im:im/N};}); // Both normalized: amplitude display, not Parseval scaling.
 }
 function seeded(seed=7){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return(x+.5)/4294967296;};}
 function gaussian(r){return Math.sqrt(-2*Math.log(r()))*Math.cos(TAU*r());}
 function ofdm(R=37.5,v=7.5,remove=true,noise=0){
  const {K,M,fc,df,Tr}=cfg, lambda=C/fc,tau=2*R/C,fd=2*v/lambda,rnd=seeded(29);
  const X=[],Y=[],H=[];
  for(let m=0;m<M;m++){X[m]=[];Y[m]=[];H[m]=[];
   for(let k=0;k<K;k++){
    const x=cis((Math.floor(rnd()*4)+.5)*Math.PI/2),h=cis(TAU*(-k*df*tau+fd*m*Tr));
    const y=mul(x,h);y.re+=noise*gaussian(rnd);y.im+=noise*gaussian(rnd);
    X[m][k]=x;Y[m][k]=y;H[m][k]=remove?mul(y,{re:x.re,im:-x.im}):{...y};
   }
  }
  const A=H.map(row=>dft(row,true));
  const D=Array.from({length:M},()=>Array(K));
  for(let r=0;r<K;r++){const col=dft(A.map(row=>row[r]));for(let q=0;q<M;q++)D[q][r]=col[q];}
  let best={r:0,d:0,p:-1};const P=[];
  for(let i=0;i<M;i++){const d=M/2-1-i,q=(d+M)%M;P[i]=D[q].map((z,r)=>{const p=power(z);if(p>best.p)best={r,d,p};return p;});}
  const dR=C/(2*K*df),dv=lambda/(2*M*Tr);
  return {X,Y,H,A,D,P,best,tau,fd,lambda,dR,dv};
 }
 function compensation(R,trialR,N=cfg.K){const step=-TAU*cfg.df*2*(R-trialR)/C;
  const arrows=Array.from({length:N},(_,k)=>cis(step*k));const sum=arrows.reduce((s,z)=>({re:s.re+z.re/N,im:s.im+z.im/N}),{re:0,im:0});
  return {arrows,sum,p:power(sum)};
 }
 const barker=[1,1,1,1,1,-1,-1,1,1,-1,1,-1,1];
 function matched(kind='barker',wrong=false,noise=0,second=false){
  const s=kind==='barker'?barker.slice():Array(13).fill(1),template=wrong?Array(13).fill(1):s.slice(),rnd=seeded(11),delay=25;
  const y=Array.from({length:80},(_,n)=>(s[n-delay]||0)+(second?.45*(s[n-delay-8]||0):0)+noise*gaussian(rnd));
  const z=Array.from({length:65},(_,lag)=>template.reduce((a,x,j)=>a+x*y[lag+j],0)/13);
  return {s,template,y,z,delay};
 }
 function caFactor(N,p){if(!Number.isInteger(N)||N<1||!(p>0&&p<1))throw new RangeError('N positive integer, 0 < Pfa < 1');return N*Math.expm1(-Math.log(p)/N);}
 function ca(power,half=8,guard=2,p=.01){const a=caFactor(2*half,p);return power.map((_,i)=>{
  if(i<half+guard||i>=power.length-half-guard)return NaN;let s=0;
  for(let n=guard+1;n<=guard+half;n++)s+=power[i-n]+power[i+n];return a*s/(2*half);
 });}
 function cfarData(scenario='uniform',scale=1){const rnd=seeded(17);return Array.from({length:80},(_,i)=>{
  const mu=scale*(scenario==='edge'&&i>=40?6:1);let target=scenario==='noise'?0:Math.sqrt(18)*Math.exp(-.5*((i-40)/.7)**2);
  if(scenario==='neighbor')target+=Math.sqrt(100)*Math.exp(-.5*((i-46)/.7)**2);
  return (Math.sqrt(mu/2)*gaussian(rnd)+target)**2+(Math.sqrt(mu/2)*gaussian(rnd))**2;
 });}
 function trials(N,p,n=50000,mean=1,seed=31){const rnd=seeded(seed),a=caFactor(N,p);let count=0;
  for(let i=0;i<n;i++){const x=-mean*Math.log(rnd());let s=0;for(let j=0;j<N;j++)s-=mean*Math.log(rnd());if(x>a*s/N)count++;}
  const rate=count/n,z=1.959964,den=1+z*z/n,mid=(rate+z*z/(2*n))/den,w=z*Math.sqrt(rate*(1-rate)/n+z*z/(4*n*n))/den;
  return {count,n,rate,low:mid-w,high:mid+w};
 }
 function array(N,arrival,steer){const step=Math.PI*(Math.sin(arrival*Math.PI/180)-Math.sin(steer*Math.PI/180)),z=Array.from({length:N},(_,i)=>cis(i*step));
  const s=z.reduce((a,b)=>({re:a.re+b.re/N,im:a.im+b.im/N}),{re:0,im:0});return {z,sum:s,gain:power(s),step};
 }
 function geometry(x,y,vx=1,vy=0){const rt=Math.hypot(x,y),rr=Math.hypot(x-40,y);if(rt<1e-9||rr<1e-9)throw new RangeError('Target cannot coincide with Tx/Rx');
  const gx=x/rt+(x-40)/rr,gy=y/rt+y/rr,L=rt+rr;return {rt,rr,L,tau:L/C,fd:-(gx*vx+gy*vy)/.06,gx,gy};
 }
 function ellipse(a,t){if(a<=20)throw new RangeError('Semimajor axis must exceed 20m');const b=Math.sqrt(a*a-400);return {x:20+a*Math.cos(t),y:b*Math.sin(t),vx:-a*Math.sin(t),vy:b*Math.cos(t)};}
 function sinc(x){return Math.abs(x)<1e-12?1:Math.sin(Math.PI*x)/(Math.PI*x);}
 const api={TAU,C,cfg,cis,mul,power,wrap,dft,seeded,ofdm,compensation,matched,caFactor,ca,cfarData,trials,array,geometry,ellipse,sinc};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Course=api;
})(typeof globalThis!=='undefined'?globalThis:this);
