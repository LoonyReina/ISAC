// Teaching projections only: all detector/solver numerics come from the accepted runtime.
import {mat,eye,adj,mul,add,scale,chol,solveChol,frobenius} from '../runtime/linalg.mjs';
import {MAPRT} from '../runtime/maprt.mjs';
export const LABELS={communication:'通信最小期望功率',isac:'ISAC（p₀=0）',isacS:'ISAC+S（允许p₀≥0）',cap_saturated_communication:'通信放大至AP上限（本站补充）'};
export function column(a,c){if(!Number.isInteger(c)||c<0||c>=a.cols)throw Error('试验编号越界');return mat(a.rows,1,Array.from({length:a.rows},(_,i)=>a.re[i*a.cols+c]),Array.from({length:a.rows},(_,i)=>a.im[i*a.cols+c]));}
const norm2=a=>frobenius(a)**2;
export function selectedObservation(record,allocation,index=0,present=true){
 const d=allocation.design,z=record.raw.evaluation;
 const alpha=mul(chol(d.rAlpha),column(z.alpha,index)),h=mul(chol(d.rH),column(z.h,index)),noise=scale(column(z.noise,index),Math.sqrt(d.noise));
 const target=present?mul(d.g,alpha):mat(40,1),clutter=mul(d.x,h),y=add(add(target,clutter),noise);
 return {y,target,clutter,noise,alpha,h};
}
export function inspect(record,allocation,index=0,present=true,detectorName='AP'){
 const d=allocation.design,parts=selectedObservation(record,allocation,index,present),x=detectorName==='AP'?d.x:mat(40,0),rh=detectorName==='AP'?d.rH:mat(0,0),det=new MAPRT(d.g,x,d.rAlpha,rh,d.noise),yn=scale(parts.y,1/Math.sqrt(d.noise));
 const za=solveChol(det.cs,mul(adj(det.vr),yn)),zh0=solveChol(det.c0,mul(adj(det.u),yn)),zh1=solveChol(det.c0,mul(adj(det.u),add(yn,mul(det.v,za),-1)));
 const fit0=scale(mul(det.u,zh0),Math.sqrt(d.noise)),fit1=scale(add(mul(det.u,zh1),mul(det.v,za)),Math.sqrt(d.noise)),residual0=add(parts.y,fit0,-1),residual1=add(parts.y,fit1,-1);
 const costs={residual0:norm2(residual0)/d.noise,priorH0:norm2(zh0),residual1:norm2(residual1)/d.noise,priorH1:norm2(zh1),priorAlpha:norm2(za)};
 costs.J0=costs.residual0+costs.priorH0;costs.J1=costs.residual1+costs.priorH1+costs.priorAlpha;
 const Q=det.quadratic(parts.y)[0],score=Q+det.logC3,integrated=Q+det.logDetRatio,offset=det.logDetRatio-det.logC3;
 const qMatrix=mul(det.vr,solveChol(det.cs,adj(det.vr))),qy=mul(qMatrix,yn),contributions=Array.from({length:40},(_,i)=>yn.re[i]*qy.re[i]+yn.im[i]*qy.im[i]);
 const sigma0=add(mul(mul(x,rh),adj(x)),scale(eye(40),d.noise)),sigma1=add(sigma0,mul(mul(d.g,d.rAlpha),adj(d.g)));
 return {...parts,fit0,fit1,residual0,residual1,costs,Q,score,integrated,offset,logC3:det.logC3,logDetRatio:det.logDetRatio,qMatrix,contributions,sigma0,sigma1,estimatedAlpha:mul(det.la,za),estimatedH0:mul(det.lh,zh0),estimatedH1:mul(det.lh,zh1),costIdentityError:Math.abs(costs.J0-costs.J1-Q),contributionError:Math.abs(contributions.reduce((a,b)=>a+b,0)-Q)};
}
export function pairedCounts(a,b,key='decision1'){let both=0,aOnly=0,bOnly=0,neither=0;for(let i=0;i<a[key].length;i++){if(a[key][i]&&b[key][i])both++;else if(a[key][i])aOnly++;else if(b[key][i])bOnly++;else neither++;}return {both,aOnly,bOnly,neither,n:a[key].length};}
export function energyTerms(matrix,p){let diagonal=0,cross=0;for(let i=0;i<p.length;i++){diagonal+=matrix[i][i]*p[i]**2;for(let j=i+1;j<p.length;j++)cross+=2*matrix[i][j]*p[i]*p[j];}return {diagonal,cross,total:diagonal+cross};}
export function histogram(arrays,bins=24){const values=arrays.flatMap(a=>Array.from(a));if(!values.length||!values.every(Number.isFinite))throw Error('无有效分数');let min=Math.min(...values),max=Math.max(...values);if(min===max){min-=.5;max+=.5;}return {min,max,bins,counts:arrays.map(a=>{let counts=Array(bins).fill(0);for(let x of a)counts[Math.min(bins-1,Math.floor((x-min)/(max-min)*bins))]++;return counts;})};}
export function solverTraces(solver){return ['isac','isacS'].flatMap(name=>{const family=solver[name];if(!family)return [];const runs=family.restarts??[family];return runs.map((r,i)=>({name,index:i,selected:family.selectedRestart===undefined?i===0:family.selectedRestart===i,run:r}));});}
export function currentWarnings(record){if(!record.accepted)return ['通信基线求解失败；没有检测性能结果。'];const lines=[];for(const r of record.results){const h=r.holdout.nominalCrossings;if(h.communication.some(Boolean)||h.perAP.some(Boolean))lines.push(`${LABELS[r.name]}：独立holdout矩估计越过约束，不能称总体可行。`);}if(record.results.find(r=>r.name==='isacS')?.p[0]**2<1e-12)lines.push('本次ISAC+S专用感知流功率接近零；允许该流不等于必须使用它。');const s=record.results.find(r=>r.name==='isacS'),b=record.results.find(r=>r.name==='cap_saturated_communication');if(s&&b&&(s.fitted.sensing_sinr-b.fitted.sensing_sinr)*(s.detectors.AP.pd-b.detectors.AP.pd)<0)lines.push('本次代理SINR与AP检出率排序相反；两方案实际用能不同。');for(const f of record.failures??[])lines.push(`${LABELS[f.name]??f.name}${f.restart===undefined?'':' · 重启'+f.restart}：${f.termination}，该尝试未通过；其他已接受重启仍单独保留。`);return lines;}
