// Eq28/Algorithm2 teaching prototype, explicitly interpreted unit-arc hull.
// Floating support/tangent bounds; not interval-certified or a literal Eq40 port.
const abs2=z=>z[0]*z[0]+z[1]*z[1];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
const inner=(a,b)=>a[0]*b[0]+a[1]*b[1];
const unit=t=>[Math.cos(t),Math.sin(t)];
const clip=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=t=>Math.atan2(Math.sin(t),Math.cos(t));
export function support(g,lo,hi){
 const m=(lo+hi)/2,t=m+wrap(Math.atan2(-g[1],-g[0])-m);
 const choices=[lo,hi];if(t>=lo&&t<=hi)choices.push(t);
 let best=unit(choices[0]),value=inner(g,best);
 for(const a of choices.slice(1)){const z=unit(a),v=inner(g,z);if(v<value){best=z;value=v;}}
 return best;
}
export function projectArc(z,lo,hi){return support([-z[0],-z[1]],lo,hi);}
export function projectHull(z,lo,hi){
 const m=(lo+hi)/2,h=(hi-lo)/2,cm=Math.cos(m),sm=Math.sin(m),c=Math.cos(h),d=Math.sin(h);
 const x=z[0]*cm+z[1]*sm,y=-z[0]*sm+z[1]*cm,r=Math.hypot(x,y);
 let u=x,v=y;
 if(r<=1&&x>=c)return [...z];
 if(r>1&&x/r>=c){u=x/r;v=y/r;}else{u=c;v=clip(y,-d,d);}
 return [u*cm-v*sm,u*sm+v*cm];
}
export function objective(A,s,x){let f=0;for(let k=0;k<A.length;k++){let z=[0,0];for(let i=0;i<x.length;i++)z=add(z,mul(A[k][i],x[i]));f+=abs2(sub(z,s[k]));}return f;}
function gradient(A,s,x){const g=x.map(()=>[0,0]);for(let k=0;k<A.length;k++){let r=[-s[k][0],-s[k][1]];for(let i=0;i<x.length;i++)r=add(r,mul(A[k][i],x[i]));for(let i=0;i<x.length;i++){const a=A[k][i];g[i][0]+=2*(a[0]*r[0]+a[1]*r[1]);g[i][1]+=2*(a[0]*r[1]-a[1]*r[0]);}}return g;}
export function lowerCertificate(A,s,z,lo,hi){
 const f=objective(A,s,z),g=gradient(A,s,z),points=g.map((v,i)=>support(v,lo[i],hi[i]));let linear=0;
 for(let i=0;i<z.length;i++)linear+=inner(g[i],sub(points[i],z[i]));
 const normA=A.flat().reduce((v,a)=>v+abs2(a),0),normS=s.reduce((v,a)=>v+abs2(a),0),scale=Math.max(1,f,normA*z.length,normS,g.reduce((v,a)=>v+Math.hypot(...a),0)*(1+Math.max(...z.map(a=>Math.hypot(...a)))));
 const allowance=1e-11*scale,raw=f+linear;
 return {lower:Math.max(0,raw-allowance),raw,allowance,tangentObjective:f,linearSupport:linear};
}
function relaxation(A,s,lo,hi,iters,start){
 let z=start?start.map((a,i)=>projectHull(a,lo[i],hi[i])):lo.map((v,i)=>unit((v+hi[i])/2));
 const L=2*A.flat().reduce((v,a)=>v+abs2(a),0);let used=0;
 if(L>0)for(let t=0;t<iters;t++){const g=gradient(A,s,z),next=z.map((a,i)=>projectHull([a[0]-g[i][0]/L,a[1]-g[i][1]/L],lo[i],hi[i]));const movement=next.reduce((v,a,i)=>v+abs2(sub(a,z[i])),0);z=next;used++;if(movement<1e-26)break;}
 return {z,iterations:used};
}
function physicalUpper(A,s,lo,hi,z,iters){
 let theta=z.map((a,i)=>{const p=projectArc(a,lo[i],hi[i]),m=(lo[i]+hi[i])/2;return clip(m+wrap(Math.atan2(p[1],p[0])-m),lo[i],hi[i]);});
 let x=theta.map(unit),f=objective(A,s,x),used=0;
 for(let t=0;t<iters;t++){
  const g=gradient(A,s,x),d=g.map((a,i)=>-a[0]*x[i][1]+a[1]*x[i][0]);let step=1,accepted=false;
  for(let line=0;line<30;line++,step*=.5){const th=theta.map((v,i)=>clip(v-step*d[i],lo[i],hi[i])),xx=th.map(unit),ff=objective(A,s,xx);const displacement=th.reduce((v,a,i)=>v+Math.abs(a-theta[i]),0);
   if(ff<f){theta=th;x=xx;f=ff;accepted=true;break;}if(displacement<1e-15)break;
  }used++;if(!accepted)break;
 }
 return {x,objective:f,iterations:used};
}
export function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('input object required');
 const r=structuredClone(input),n=r.referencePhase?.length,k=r.H?.length;
 if(!Number.isInteger(n)||n<1||n>4||!Number.isInteger(k)||k<1||k>2)throw Error('bounded domain N1..4 K1..2');
 const pair=a=>Array.isArray(a)&&a.length===2&&a.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=100);
 if(!r.H.every(row=>Array.isArray(row)&&row.length===n&&row.every(pair))||!Array.isArray(r.s)||r.s.length!==k||!r.s.every(pair))throw Error('complex matrix/vector shape or magnitude');
 if(!r.referencePhase.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=Math.PI))throw Error('reference phases outside [-pi,pi]');
 for(const [key,min,max] of [['power',1e-4,100],['epsilon',0,2],['tolerance',1e-9,1e-2]])if(typeof r[key]!=='number'||!Number.isFinite(r[key])||r[key]<min||r[key]>max)throw Error('invalid '+key);
 for(const [key,max] of [['maxNodes',2047],['relaxationIterations',2000],['upperIterations',500]])if(!Number.isInteger(r[key])||r[key]<1||r[key]>max)throw Error('invalid budget '+key);
 if(!['BRS','ARS'].includes(r.branch))throw Error('branch must be BRS or ARS');return r;
}
export function* solveEvents(input){
 const p=validate(input),n=p.referencePhase.length,amp=Math.sqrt(p.power/n),A=p.H.map(row=>row.map(z=>z.map(v=>v*amp))),half=2*Math.asin(p.epsilon/2),lo=p.referencePhase.map(t=>t-half),hi=p.referencePhase.map(t=>t+half);
 let best=p.referencePhase.map(unit),ub=objective(A,p.s,best),nextId=0;const ledger=[],history=[];
 const evaluate=(l,h,parent,start)=>{
  const r=relaxation(A,p.s,l,h,p.relaxationIterations,start),bound=lowerCertificate(A,p.s,r.z,l,h),u=physicalUpper(A,p.s,l,h,r.z,p.upperIterations),node={id:nextId++,parent,lo:[...l],hi:[...h],lower:bound.lower,upper:u.objective,bound,relaxation:r,physical:u};
  if(bound.lower>u.objective+1e-8*Math.max(1,u.objective))throw Error('invalid lower/upper ordering');
  if(u.objective<ub){ub=u.objective;best=u.x.map(z=>[...z]);}ledger.push(node);return node;
 };
 let active=[evaluate(lo,hi,null,null)];
 const checkpoint=()=>{active=active.filter(a=>a.lower<ub).sort((a,b)=>a.lower-b.lower||a.id-b.id);const lb=active.length?Math.min(ub,active[0].lower):ub;const c={nodes:nextId,lower:lb,upper:ub,gap:ub-lb,active:active.length};history.push(c);return c;};
 let state=checkpoint();yield {type:'checkpoint',...state};
 while(active.length&&state.gap>p.tolerance&&nextId+2<=p.maxNodes){
  const parent=active.shift();let index=-1,score=-Infinity;
  for(let i=0;i<n;i++){const width=parent.hi[i]-parent.lo[i],s=p.branch==='BRS'?width:Math.hypot(...sub(parent.physical.x[i],parent.relaxation.z[i]));if(width>1e-14&&s>score){score=s;index=i;}}
  if(index<0){active.unshift(parent);break;}const middle=(parent.lo[index]+parent.hi[index])/2;
  // Only yield a new global bound after BOTH children replace their parent.
  for(let side=0;side<2;side++){const l=[...parent.lo],h=[...parent.hi];if(side===0)h[index]=middle;else l[index]=middle;active.push(evaluate(l,h,parent.id,parent.relaxation.z));}
  state=checkpoint();yield {type:'checkpoint',...state};
 }
 const physical=best.map(z=>z.map(v=>v*amp));
 return {schema:'isac-cmc-prototype-v1',input:p,status:state.gap<=p.tolerance?'gap_satisfied':'budget_unresolved',...state,x:best,physicalX:physical,modulusResidual:Math.max(...best.map(z=>Math.abs(Math.hypot(...z)-1))),similarity:Math.max(...best.map((z,i)=>Math.hypot(...sub(z,unit(p.referencePhase[i]))))),energy:physical.reduce((v,z)=>v+abs2(z),0),ledger,history,activeNodeIds:active.map(a=>a.id),rigorousIntervalCertificate:false,literalEquation40:false,sourceFiguresReproduced:false};
}
export function solve(input){const g=solveEvents(input);let step;do{step=g.next();}while(!step.done);return step.value;}
