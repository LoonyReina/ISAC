'use strict';
const fs=require('fs'),crypto=require('crypto'),corePath=require('path').resolve(process.argv[2]||'perceptive-clutter-core.js'),C=require(corePath);
const trials=160000,seed=18373491,N=7,a=.82,sigma2=.37,p=3,q=6,rng=C.createRng(seed),sd=Math.sqrt(sigma2/2),sums={},squares={};
for(const k of ['inputReal','inputImag','inputRealVariance','inputImagVariance','inputIQCov','background','post','pre','crossRe','crossIm','pseudoRe','pseudoIm'])sums[k]=squares[k]=0;
for(let i=0;i<trials;i++){
 const n=Array.from({length:N},()=>[sd*rng.normal(),sd*rng.normal()]),f=C.filter(n,a),r=f.updated[p-1],rq=f.updated[q-1],u=f.previous[p-1],b=f.background[q-1];
 const vals={inputReal:n[0][0],inputImag:n[0][1],inputRealVariance:n[0][0]**2,inputImagVariance:n[0][1]**2,inputIQCov:n[0][0]*n[0][1],background:b[0]**2+b[1]**2,post:r[0]**2+r[1]**2,pre:u[0]**2+u[1]**2,crossRe:r[0]*rq[0]+r[1]*rq[1],crossIm:r[1]*rq[0]-r[0]*rq[1],pseudoRe:r[0]*rq[0]-r[1]*rq[1],pseudoIm:r[0]*rq[1]+r[1]*rq[0]};
 for(const [k,v]of Object.entries(vals)){sums[k]+=v;squares[k]+=v*v;}
}
// Independent finite sums of impulse coefficients, not core covariance functions.
const coeff=(p,order)=>Array.from({length:N},(_,k)=>k>=p?0:k===p-1?(order==='post'?a:1):-(1-a)*a**(p-k-(order==='post'?1:2)));
const dot=(x,y)=>sigma2*x.reduce((s,v,k)=>s+v*y[k],0),post=coeff(p,'post'),postq=coeff(q,'post'),pre=coeff(p,'pre'),bg=Array.from({length:N},(_,k)=>k<q?(1-a)*a**(q-k-1):0);
const theory={inputReal:0,inputImag:0,inputRealVariance:sigma2/2,inputImagVariance:sigma2/2,inputIQCov:0,background:dot(bg,bg),post:dot(post,post),pre:dot(pre,pre),crossRe:dot(post,postq),crossIm:0,pseudoRe:0,pseudoIm:0};
const moments={};let maxZ=0;
for(const k of Object.keys(sums)){const mean=sums[k]/trials,se=Math.sqrt((squares[k]-trials*mean*mean)/(trials-1)/trials),z=(mean-theory[k])/se;maxZ=Math.max(maxZ,Math.abs(z));if(Math.abs(z)>5)throw new Error(`${k}: z=${z}`);moments[k]={mean,theory:theory[k],standardError:se,z};}
const out={status:'PASS',coreSha256:crypto.createHash('sha256').update(fs.readFileSync(corePath)).digest('hex'),trials,seed,N,alpha:a,sigma2,p,q,maxAbsoluteZ:maxZ,moments,qualification:'Across-trial standard errors. Independent coefficient sums supply theory. Stochastic diagnostic; no browser or detector calibration claim.'};
if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
