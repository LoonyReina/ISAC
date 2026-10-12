/* Deterministic analytic teaching constructions; no SDR/ZF optimizer. */
(function(root){'use strict';
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],conj=a=>[a[0],-a[1]],scale=(a,s)=>a.map(x=>x*s),abs2=a=>a[0]**2+a[1]**2;
const adj=A=>A[0].map((_,j)=>A.map(r=>conj(r[j]))),product=(A,B)=>A.map(r=>B[0].map((_,j)=>r.reduce((s,z,k)=>add(s,mul(z,B[k][j])),[0,0]))),sum=(A,B)=>A.map((r,i)=>r.map((z,j)=>add(z,B[i][j]))),norm=A=>Math.sqrt(A.flat().reduce((s,z)=>s+abs2(z),0)),distance=(A,B)=>norm(A.map((r,i)=>r.map((z,j)=>add(z,scale(B[i][j],-1)))));
const columns=vs=>vs[0].map((_,i)=>vs.map(v=>v[i])),dft=j=>Array.from({length:8},(_,m)=>[Math.round(Math.cos(2*Math.PI*j*m/8)*1e15)/1e15/Math.sqrt(8),Math.round(Math.sin(2*Math.PI*j*m/8)*1e15)/1e15/Math.sqrt(8)]),steer=deg=>Array.from({length:8},(_,m)=>[Math.cos(Math.PI*m*Math.sin(deg*Math.PI/180)),Math.sin(Math.PI*m*Math.sin(deg*Math.PI/180))]);
function eigenvalues(R){ // Real symmetric embedding has every Hermitian eigenvalue twice.
 const n=R.length,N=2*n,B=Array.from({length:N},(_,i)=>Array.from({length:N},(_,j)=>i<n?(j<n?R[i][j][0]:-R[i][j-n][1]):(j<n?R[i-n][j][1]:R[i-n][j-n][0])));
 for(let iter=0;iter<100*N*N;iter++){let p=0,q=1,max=0;for(let i=0;i<N;i++)for(let j=i+1;j<N;j++)if(Math.abs(B[i][j])>max){max=Math.abs(B[i][j]);p=i;q=j;}if(max<1e-14)break;
 const phi=.5*Math.atan2(2*B[p][q],B[q][q]-B[p][p]),c=Math.cos(phi),s=Math.sin(phi),pp=B[p][p],qq=B[q][q],pq=B[p][q];
 for(let k=0;k<N;k++)if(k!==p&&k!==q){const x=B[k][p],y=B[k][q];B[k][p]=B[p][k]=c*x-s*y;B[k][q]=B[q][k]=s*x+c*y;}
 B[p][p]=c*c*pp-2*s*c*pq+s*s*qq;B[q][q]=s*s*pp+2*s*c*pq+c*c*qq;B[p][q]=B[q][p]=0;
 }
 const vals=B.map((r,i)=>r[i]).sort((a,b)=>b-a);return Array.from({length:n},(_,i)=>(vals[2*i]+vals[2*i+1])/2);
}
function power(R,a){return product([a.map(conj)],product(R,a.map(z=>[z])))[0][0][0];}
function evaluate(Wc,Wr,H,noise,threshold){const R=sum(product(Wc,adj(Wc)),product(Wr,adj(Wr))),Fc=product(H,Wc),Fr=product(H,Wr),eigen=eigenvalues(R),angles=Array.from({length:1801},(_,i)=>-90+i/10),pattern=angles.map(a=>power(R,steer(a))),target=columns([-30,0,30].map(steer)),corr=product(adj(target),product(R,target)),correlation=corr.map((r,i)=>r.map((z,j)=>Math.sqrt(abs2(z)/(corr[i][i][0]*corr[j][j][0]))));
 const users=Fc.map((r,k)=>{const desired=abs2(r[k]),interuser=r.reduce((s,z,j)=>s+(j===k?0:abs2(z)),0),radar=Fr[k].reduce((s,z)=>s+abs2(z),0),sinr=desired/(interuser+radar+noise);return {desired,interuser,radar,noise,sinr,db:sinr===0?-Infinity:10*Math.log10(sinr),pass:sinr+1e-12>=10**(threshold/10)};});
 return {Wc,Wr,R,Fc,Fr,eigen,rank:eigen.filter(x=>x>1e-10).length,angles,pattern,corr,correlation,users,trace:R.reduce((s,r,i)=>s+r[i][0],0),diagonal:R.map((r,i)=>r[i][0])};}
function compute(eta=.8,noise=.01,threshold=12){if(!Number.isFinite(eta)||eta<0||eta>1||!Number.isFinite(noise)||noise<=0||!Number.isFinite(threshold))throw Error('参数范围无效');const um=dft(-2),u0=dft(0),up=dft(2),a=Math.sqrt(eta),b=Math.sqrt(1-eta),h=um.map((z,i)=>add(scale(z,a),mul([0,-b],up[i]))),q=up.map((z,i)=>add(scale(z,a),mul([0,-b],um[i]))),H=[h.map(conj),u0.map(conj)],s=v=>v.map(z=>scale(z,1/Math.sqrt(3))),zero=um.map(()=>[0,0]);
 const specs=[['A',columns([s(um.map((z,i)=>add(z,mul([0,-1],up[i])))),s(u0)]),columns([zero])],['B',columns([s(um),s(u0)]),columns([s(up)])],['C',columns([s(h),s(u0)]),columns([s(q)])]];
 const recipes=specs.map(([id,Wc,Wr])=>({id,...evaluate(Wc,Wr,H,noise,threshold)}));return {eta,noise,threshold,H,h,q,um,u0,up,recipes,covarianceBC:distance(recipes[1].R,recipes[2].R),fixedRBound:1/(3*noise)};
}
const api={add,mul,conj,scale,abs2,adj,product,sum,norm,distance,columns,dft,steer,eigenvalues,power,evaluate,compute};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JointBeamformingCore=api;
})(typeof window!=='undefined'?window:globalThis);
