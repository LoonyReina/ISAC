'use strict';
const {load}=require('./load-adapter.cjs');
function gcd(a,b){ a=a<0n?-a:a; while(b){let t=a%b;a=b;b=t;}return a; }
function rat(n,d=1n){n=BigInt(n);d=BigInt(d);if(d===0n)throw new RangeError('zero denominator');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return [n/g,d/g];}
const add=(a,b)=>rat(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const mul=(a,b)=>rat(a[0]*b[0],a[1]*b[1]);
const neg=a=>[-a[0],a[1]];
const div=(a,b)=>rat(a[0]*b[1],a[1]*b[0]);
const val=a=>Number(a[0])/Number(a[1]);
const str=a=>a[1]===1n?String(a[0]):`${a[0]}/${a[1]}`;
function input(x){if(!Array.isArray(x)||x.length!==2||!x.every(Number.isSafeInteger)||Math.abs(x[0])>1000||x[1]<1||x[1]>1000)throw new RangeError('bounded integer rational [n,d] required');return rat(...x);}
function geometry(raw){if(!Array.isArray(raw)||raw.length<1||raw.length>8)throw new RangeError('1..8 stations');return raw.map(s=>{if(!Array.isArray(s)||s.length!==3)throw new RangeError('station [ux,uy,w]');const [x,y,w]=s.map(input);const norm=add(mul(x,x),mul(y,y));if(norm[0]!==norm[1]||w[0]<=0n)throw new RangeError('unit bearing and positive weight');return [x,y,w];});}
function exactFim(stations,mask){let f=[rat(0),rat(0),rat(0)];for(let i=0;i<stations.length;i++)if(mask&(1<<i))for(let j=0;j<stations.length;j++)if(mask&(1<<j)){const a=stations[i],b=stations[j],w=mul(a[2],b[2]),x=add(a[0],b[0]),y=add(a[1],b[1]);f[0]=add(f[0],mul(w,mul(x,x)));f[1]=add(f[1],mul(w,mul(x,y)));f[2]=add(f[2],mul(w,mul(y,y)));}const det=add(mul(f[0],f[2]),neg(mul(f[1],f[1])));if(det[0]<0n)throw new Error('non PSD');const rank=det[0]>0n?2:f.some(v=>v[0]!==0n)?1:0;return {f,rank,inverse:rank===2?div(add(f[0],f[2]),det):null};}
function lse(a,b){if(a===-Infinity)return b;if(b===-Infinity)return a;const h=Math.max(a,b);return h+Math.log1p(Math.exp(Math.min(a,b)-h));}
function experiment(raw,m,psi){const g=geometry(raw),p=load(m,psi),n=g.length,la=Math.log(p.acceptance);let lo=-Infinity,ls=-Infinity,ln=-Infinity;const rows=[],mean=[0,0,0];
for(let mask=0;mask<(1<<n);mask++){let count=0;for(let j=0;j<n;j++)count+=(mask>>j)&1;const lp=(count?count*la:0)+(n-count?(n-count)*p.logRejection:0),prob=Math.exp(lp),f=exactFim(g,mask);if(f.rank<2)lo=lse(lo,lp);else{ls=lse(ls,lp);ln=lse(ln,lp+Math.log(val(f.inverse)));}for(let j=0;j<3;j++)mean[j]+=prob*val(f.f[j]);rows.push({mask,count,logProbability:lp,probability:prob,probabilityUnderflow:Number.isFinite(lp)&&prob===0,rank:f.rank,fim:f.f.map(str),inverseTrace:f.inverse?str(f.inverse):null});}
const full=exactFim(g,(1<<n)-1),positive=p.rejectionPositive||full.rank<2;
return {model:'independent-fixed-load-tagged-request-v1',scope:'q=1; bounded rational geometry; independent teaching model',load:p,subsets:rows,meanFim:mean,outageProbability:Math.exp(lo),logOutageProbability:lo,positiveOutage:positive,unconditionalStatus:positive?'infinite_unidentifiable':'finite',unconditionalInverseTrace:positive?null:val(full.inverse),conditionalStatus:ls===-Infinity?'unavailable':'finite',conditionalInverseTrace:ls===-Infinity?null:Math.exp(ln-ls),logSuccessProbability:ls};}
module.exports={experiment};
