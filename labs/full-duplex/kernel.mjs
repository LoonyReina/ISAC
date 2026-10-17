/** Synthetic Eq.11 block-LS only. Browser-native ES module; no dependencies. */
export const PRESETS = Object.freeze({iid: Object.freeze({count:4096,rho:0}), correlated:Object.freeze({count:4096,rho:.95}), quick:Object.freeze({count:1024,rho:0})});
export const TRUTH = new Float64Array([.03,.02,.8,.2,.15,-.08,-.04,.01,0,0,.12,-.04,-.025,.01,0,0,0,0,.012,.004,0,0,0,0]);
const finite = a => a && Array.from(a).every(Number.isFinite);
export function basis(x,indices,orders=[1,3,5],m1=1,m2=2) {
 if (!finite(x)||x.length%2||!indices?.length||!Array.from(indices).every(Number.isInteger)||![m1,m2].every(v=>Number.isInteger(v)&&v>=0)||!orders?.length||!orders.every(p=>Number.isInteger(p)&&p>0&&p%2===1)||new Set(orders).size!==orders.length) throw Error('invalid basis input');
 if (Math.min(...indices)-m2<0||Math.max(...indices)+m1>=x.length/2) throw Error('insufficient sample guards');
 const rows=indices.length, cols=orders.length*(m1+m2+1), data=new Float64Array(rows*cols*2);
 for(let i=0;i<rows;i++){let j=0;for(const p of orders)for(let k=-m1;k<=m2;k++,j++){const t=2*(indices[i]-k), mag=x[t]*x[t]+x[t+1]*x[t+1], f=mag**((p-1)/2);data[2*(i*cols+j)]=x[t]*f;data[2*(i*cols+j)+1]=x[t+1]*f;}}
 if(!finite(data))throw Error('nonfinite basis');return {rows,cols,data};
}
export function multiply(a,h) {const out=new Float64Array(a.rows*2);for(let i=0;i<a.rows;i++)for(let j=0;j<a.cols;j++){const z=2*(i*a.cols+j);out[2*i]+=a.data[z]*h[2*j]-a.data[z+1]*h[2*j+1];out[2*i+1]+=a.data[z]*h[2*j+1]+a.data[z+1]*h[2*j];}return out;}
export function power(v){let s=0;for(const x of v)s+=x*x;return s/(v.length/2);}
const sub=(a,b)=>Float64Array.from(a,(x,i)=>x-b[i]);
const add=(a,b)=>Float64Array.from(a,(x,i)=>x+b[i]);
// One-sided Jacobi SVD of the small R factor. No A^T A or normal-equation solve.
function singularValues(r,n){const a=r.slice();const tiny=Number.EPSILON**2*r.reduce((s,x)=>s+x*x,0);let converged=false;for(let sweep=0;sweep<100;sweep++){let changed=false;for(let p=0;p<n;p++)for(let q=p+1;q<n;q++){let aa=0,bb=0,ab=0;for(let i=0;i<n;i++){const x=a[i*n+p],y=a[i*n+q];aa+=x*x;bb+=y*y;ab+=x*y;}if(aa<=tiny||bb<=tiny||Math.abs(ab)<=8*Number.EPSILON*Math.sqrt(aa*bb))continue;const tau=(bb-aa)/(2*ab),t=(tau>=0?1:-1)/(Math.abs(tau)+Math.hypot(1,tau)),c=1/Math.hypot(1,t),s=c*t;for(let i=0;i<n;i++){const x=a[i*n+p],y=a[i*n+q];a[i*n+p]=c*x-s*y;a[i*n+q]=s*x+c*y;}changed=true;}if(!changed){converged=true;break;}}if(!converged)throw Error('singular-value iteration did not converge');return Array.from({length:n},(_,j)=>{let norm=0;for(let i=0;i<n;i++)norm=Math.hypot(norm,a[i*n+j]);return norm;}).sort((a,b)=>b-a);}
/** Generator yields between QR columns, never mutates caller arrays. */
export function* fitSteps(a,y) {
 const {rows:n,cols:k,data}=a??{};
 if(!Number.isInteger(n)||!Number.isInteger(k)||k<1||k>12||n<k||n>4096||data?.length!==n*k*2||y?.length!==n*2||!finite(data)||!finite(y))throw Error('finite bounded overdetermined matrix and vector required');
 const scales=new Float64Array(k);for(let j=0;j<k;j++){let norm=0;for(let i=0;i<n;i++){const z=2*(i*k+j);norm=Math.hypot(norm,data[z],data[z+1]);}scales[j]=norm/Math.sqrt(n);if(!Number.isFinite(scales[j])||!scales[j])throw Error('zero/invalid excitation');}
 const m=2*n,d=2*k,b=new Float64Array(m*d),rhs=new Float64Array(m),perm=Array.from({length:d},(_,i)=>i);
 for(let i=0;i<n;i++){rhs[i]=y[2*i];rhs[i+n]=y[2*i+1];for(let j=0;j<k;j++){const z=2*(i*k+j),re=data[z]/scales[j],im=data[z+1]/scales[j];b[i*d+j]=re;b[i*d+j+k]=-im;b[(i+n)*d+j]=im;b[(i+n)*d+j+k]=re;}}
 yield {phase:'scaled',columns:d};
 // Column-pivoted Householder real-augmented complex LS, recomputed tail norms.
 for(let j=0;j<d;j++){
  let best=j,bestNorm=-1;for(let q=j;q<d;q++){let norm=0;for(let i=j;i<m;i++)norm=Math.hypot(norm,b[i*d+q]);if(norm>bestNorm){best=q;bestNorm=norm;}}
  if(best!==j){for(let i=0;i<m;i++){const t=b[i*d+j];b[i*d+j]=b[i*d+best];b[i*d+best]=t;}[perm[j],perm[best]]=[perm[best],perm[j]];}
  if(bestNorm){const alpha=b[j*d+j]>=0?-bestNorm:bestNorm,v=new Float64Array(m-j);v[0]=b[j*d+j]-alpha;for(let i=j+1;i<m;i++)v[i-j]=b[i*d+j];let vn=0;for(const x of v)vn=Math.hypot(vn,x);for(let i=0;i<v.length;i++)v[i]/=vn;
   for(let q=j+1;q<d;q++){let dot=0;for(let i=j;i<m;i++)dot+=v[i-j]*b[i*d+q];for(let i=j;i<m;i++)b[i*d+q]-=2*v[i-j]*dot;}
   let dot=0;for(let i=j;i<m;i++)dot+=v[i-j]*rhs[i];for(let i=j;i<m;i++)rhs[i]-=2*v[i-j]*dot;b[j*d+j]=alpha;for(let i=j+1;i<m;i++)b[i*d+j]=0;
  }
  yield {phase:'qr',column:j+1,columns:d};
 }
 const r=new Float64Array(d*d);for(let i=0;i<d;i++)for(let j=i;j<d;j++)r[i*d+j]=b[i*d+j];const sv=singularValues(r,d),threshold=Number.EPSILON*Math.max(n,k)*sv[0];
 if(sv.at(-1)<=threshold)throw Error('rank-deficient excitation');
 const c=new Float64Array(d),z=new Float64Array(d),h=new Float64Array(2*k);for(let i=d-1;i>=0;i--){let v=rhs[i];for(let j=i+1;j<d;j++)v-=r[i*d+j]*c[j];c[i]=v/r[i*d+i];}for(let i=0;i<d;i++)z[perm[i]]=c[i];for(let j=0;j<k;j++){h[2*j]=z[j]/scales[j];h[2*j+1]=z[j+k]/scales[j];}
 if(!finite(h))throw Error('nonfinite fit');return {h,diagnostics:{rank:k,parameters:k,scaled_condition:sv[0]/sv.at(-1),train_residual_power:power(sub(y,multiply(a,h)))}};
}
export function drain(steps){let x;do{x=steps.next();}while(!x.done);return x.value;}
export const fit=(a,y)=>drain(fitSteps(a,y));
function target(x,indices,delay){return Float64Array.from({length:indices.length*2},(_,i)=>{const j=2*(indices[i>>1]-delay);return i%2?.15*x[j+1]+.05*x[j]:.15*x[j]-.05*x[j+1];});}
export function* experimentSteps({seed,count,rho,blocks}){
 if(!Number.isInteger(count)||count<12||count>4096||!Number.isFinite(rho)||Math.abs(rho)>=1||blocks?.length!==2)throw Error('invalid bounded experiment');
 const indices=Array.from({length:count},(_,i)=>16+i), b=[];
 for(const block of blocks){if(block.x?.length!==2*(count+32)||block.noise?.length!==2*count||!finite(block.noise))throw Error('invalid block');const a=basis(block.x,indices);b.push({...block,s:multiply(a,TRUTH)});yield {phase:'basis'};}
 const out={seed,count_per_block:count,rho,noise_expected_power:1e-4,models:{},targets:{}};
 for(const orders of [[1],[1,3,5]]){const label=orders.length===1?'linear':'nonlinear',a0=basis(b[0].x,indices,orders),a1=basis(b[1].x,indices,orders),y0=add(b[0].s,b[0].noise),y1=add(b[1].s,b[1].noise);const {h,diagnostics:diag}=yield* fitSteps(a0,y0),pred=multiply(a1,h);
 Object.assign(diag,{holdout_residual_power:power(sub(y1,pred)),holdout_oracle_si_error_power:power(sub(b[1].s,pred)),holdout_si_power:power(b[1].s),holdout_noise_power:power(b[1].noise)});diag.holdout_suppression_db=10*Math.log10(power(y1)/diag.holdout_residual_power);out.models[label]=diag;
 for(const delay of [1,8]){const t0=target(b[0].x,indices,delay),t1=target(b[1].x,indices,delay),ht=(yield* fitSteps(a0,add(y0,t0))).h,delta=sub(ht,h),diff=sub(t1,multiply(a1,delta));let ar=0,ai=0,den=0,err=0;for(let i=0;i<t1.length;i+=2){ar+=t1[i]*diff[i]+t1[i+1]*diff[i+1];ai+=t1[i]*diff[i+1]-t1[i+1]*diff[i];den+=t1[i]**2+t1[i+1]**2;err=Math.max(err,Math.hypot(((y1[i]+t1[i]-pred[i])-(y1[i]-pred[i]))-t1[i],((y1[i+1]+t1[i+1]-pred[i+1])-(y1[i+1]-pred[i+1]))-t1[i+1]));}const amp=Math.hypot(ar,ai)/den;
 out.targets[`${label}_delay_${delay}`]={matched_amplitude_retention_abs:amp,matched_amplitude_retention_db:20*Math.log10(Math.max(amp,1e-15)),differential_energy_ratio:power(diff)/power(t1),paired_fit_difference_coefficient_norm:Math.hypot(...delta),frozen_coefficient_target_error:err};}
 }
 return out;
}
// Mulberry32 + Box-Muller; distinct from NumPy PCG64, reproducible within this port.
export function makeData(preset='iid',seed=20261017){if(!Object.hasOwn(PRESETS,preset)||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('invalid preset or uint32 seed');const {count,rho}=PRESETS[preset];let state=seed>>>0;const uniform=()=>{let t=state+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};const normal=()=>Math.sqrt(-2*Math.log(1-uniform()))*Math.cos(2*Math.PI*uniform());const iq=(n,r)=>{const z=new Float64Array(n*2);for(let i=0;i<n;i++){z[2*i]=normal()/Math.SQRT2;z[2*i+1]=normal()/Math.SQRT2;if(i&&r)for(let j=0;j<2;j++)z[2*i+j]=r*z[2*(i-1)+j]+Math.sqrt(1-r*r)*z[2*i+j];}return z;};const blocks=Array.from({length:2},()=>({x:iq(count+32,rho),noise:Float64Array.from(iq(count,0),x=>.01*x)}));return {seed,count,rho,blocks};}
/** Cooperative runner: abort checked before every generator step and after yields. */
export async function runAsync(data,{signal,onProgress=()=>{},budgetMs=8,schedule=()=>new Promise(r=>setTimeout(r,0))}={}){if(!Number.isFinite(budgetMs)||budgetMs<=0||budgetMs>50)throw Error('invalid chunk budget');const steps=experimentSteps(data);try{for(;;){const start=performance.now();do{if(signal?.aborted)throw Object.assign(Error('Cancelled'),{name:'AbortError'});const next=steps.next();if(next.done)return next.value;onProgress(next.value);}while(performance.now()-start<budgetMs);await schedule();}}finally{steps.return();}}
