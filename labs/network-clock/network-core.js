/* Independent scalar-delay lesson, not an implementation of SCPD.
 * Coordinates/path lengths in m; scalar observations/clock offsets in ns. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NetworkISAC=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const cfg=Object.freeze({c:299792458,metresPerNs:.299792458,min:-100,max:100});
const distance=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
const path=(p,t,r)=>distance(p,t)+distance(p,r);
const toPath=ns=>ns*cfg.metresPerNs;
const toNs=m=>m/cfg.metresPerNs;
function layout(kind='spread',count=3){if(!['spread','line'].includes(kind)||![1,2,3].includes(count))throw new RangeError('Invalid layout');return {t:{x:-70,y:0},receivers:(kind==='line'?[{x:70,y:0},{x:0,y:0},{x:95,y:0}]:[{x:70,y:0},{x:0,y:75},{x:65,y:-65}]).slice(0,count)};}
function random(seed){let s=seed>>>0;return ()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return (s+.5)/4294967296;};}
function normalSamples(seed,count){const u=random(seed),out=[];while(out.length<count){const r=Math.sqrt(-2*Math.log(u())),p=2*Math.PI*u();out.push(r*Math.cos(p));if(out.length<count)out.push(r*Math.sin(p));}return out;}
function validate(o={}){const s={x:20,y:35,kind:'spread',count:3,bias:[10,-15,20],sigma:0,seed:1,reverseExtra:0,step:1,...o};
if(!Number.isFinite(s.x)||!Number.isFinite(s.y)||Math.abs(s.x)>100||Math.abs(s.y)>100||!['spread','line'].includes(s.kind)||![1,2,3].includes(s.count)||!Array.isArray(s.bias)||s.bias.length!==3||s.bias.some(v=>!Number.isFinite(v)||Math.abs(v)>30)||!Number.isFinite(s.sigma)||s.sigma<0||s.sigma>5||!Number.isInteger(s.seed)||s.seed<0||s.seed>4294967295||!Number.isFinite(s.reverseExtra)||s.reverseExtra<0||s.reverseExtra>10||![.5,1,2].includes(s.step))throw new RangeError('Invalid network experiment parameters');return s;}
function observations(options={}){const s=validate(options),geometry=layout(s.kind,s.count),p={x:s.x,y:s.y},noise=normalSamples(s.seed,6);return {...s,...geometry,p,links:geometry.receivers.map((r,i)=>{const h=toNs(path(p,geometry.t,r)),extra=i===0?s.reverseExtra:0;return {r,bias:s.bias[i],h,plus:h+s.bias[i]+s.sigma*noise[2*i],minus:h+toNs(extra)-s.bias[i]+s.sigma*noise[2*i+1]};})};}
// This estimator only receives associated reciprocal readings, never truth or bias.
function reciprocal(plus,minus){return {bias:(plus-minus)/2,delay:(plus+minus)/2};}
function lengths(links,mode){if(!['ignore','oracle','reciprocal'].includes(mode))throw new RangeError('Invalid mode');return links.map(l=>toPath(mode==='ignore'?l.plus:mode==='oracle'?l.plus-l.bias:reciprocal(l.plus,l.minus).delay));}
function residual(p,t,receivers,values){return Math.sqrt(receivers.reduce((sum,r,i)=>sum+(path(p,t,r)-values[i])**2,0)/receivers.length);}
function ellipse(t,r,total){const baseline=distance(t,r);if(!Number.isFinite(total)||total<baseline)return null;return {cx:(t.x+r.x)/2,cy:(t.y+r.y)/2,a:total/2,b:Math.sqrt(Math.max(0,total*total-baseline*baseline))/2,angle:Math.atan2(r.y-t.y,r.x-t.x)};}
function grid(t,receivers,values,step=1){if(![.5,1,2].includes(step)||!receivers.length||values.length!==receivers.length||values.some(v=>!Number.isFinite(v)))throw new RangeError('Invalid grid inputs');const n=Math.round(200/step)+1,costs=new Float64Array(n*n);let best=Infinity;
for(let iy=0;iy<n;iy++)for(let ix=0;ix<n;ix++){const v=residual({x:-100+ix*step,y:-100+iy*step},t,receivers,values);costs[iy*n+ix]=v;if(v<best)best=v;}
const local=[];for(let iy=0;iy<n;iy++)for(let ix=0;ix<n;ix++){const k=iy*n+ix,v=costs[k];let minimum=true;for(let dy=-1;dy<=1&&minimum;dy++)for(let dx=-1;dx<=1;dx++){const xx=ix+dx,yy=iy+dy;if(xx>=0&&xx<n&&yy>=0&&yy<n&&costs[yy*n+xx]<v-1e-10){minimum=false;break;}}if(minimum)local.push({x:-100+ix*step,y:-100+iy*step,cost:v});}
local.sort((a,b)=>a.cost-b.cost||a.y-b.y||a.x-b.x);const minima=[];for(const p of local){if(minima.every(q=>distance(p,q)>=5))minima.push(p);if(minima.length===6)break;}
return {n,step,costs,best,minima,localCount:local.length,equalCount:local.filter(p=>Math.abs(p.cost-best)<1e-8).length,boundary:minima.some(p=>Math.abs(p.x)===100||Math.abs(p.y)===100)};}
function jacobian(p,t,receivers){if([t,...receivers].some(q=>distance(p,q)<1e-10))return null;return receivers.map(r=>{const dt=distance(p,t),dr=distance(p,r);return [(p.x-t.x)/dt+(p.x-r.x)/dr,(p.y-t.y)/dt+(p.y-r.y)/dr];});}
function singularValues(G){if(!G)return null;let a=0,b=0,d=0;for(const [x,y]of G){a+=x*x;b+=x*y;d+=y*y;}const disc=Math.hypot(a-d,2*b);return [Math.sqrt(Math.max(0,(a+d+disc)/2)),Math.sqrt(Math.max(0,(a+d-disc)/2))];}
function fitOneWayBias(p,t,receivers,plus){return receivers.map((r,i)=>plus[i]-toNs(path(p,t,r)));}
function experiment(options={}){const s=observations(options),modes={};for(const mode of ['ignore','oracle','reciprocal']){const values=lengths(s.links,mode),search=grid(s.t,s.receivers,values,s.step);modes[mode]={values,...search,inconsistent:values.map((v,i)=>v<distance(s.t,s.receivers[i]))};}return {...s,modes,singular:singularValues(jacobian(s.p,s.t,s.receivers))};}
return {cfg,distance,path,toPath,toNs,layout,normalSamples,validate,observations,reciprocal,lengths,residual,ellipse,grid,jacobian,singularValues,fitOneWayBias,experiment};
});
