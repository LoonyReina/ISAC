/* Source Eq6 observation generation and declared teaching postprocessing.
 * Simulation truth is never an argument to the SDP solver or candidate extractor.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtomicReceiverLesson=api;})(typeof self!=='undefined'?self:globalThis,function(){
'use strict';
const VERSION='atomic-receiver-lesson-v1',SOURCE_HASH='f0441c1053085d83356e40d200fe83c442c33d5d403c39d2bc89745f8ac2a722',CORE_HASH='3d5656febab24737613e135946aada744d6083c93d5fe9d722b4f6ac2d568d14';
const DEFAULT_CONFIG=Object.freeze({seed:20261012,separation:.30,errorCount:2,snrDb:25,lambdaScale:1,muScale:1,maxIter:6000});
const PRESETS=Object.freeze({nominal:{...DEFAULT_CONFIG},errorFree:{...DEFAULT_CONFIG,errorCount:0},closePaths:{...DEFAULT_CONFIG,separation:.04},denseErrors:{...DEFAULT_CONFIG,errorCount:8},iterationLimit:{...DEFAULT_CONFIG,maxIter:500}});
const finite=(v,n)=>{if(typeof v!=='number'||!Number.isFinite(v))throw Error(n+' 必须是有限数');return v;};
function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function complexArray(n){return {re:Array(n).fill(0),im:Array(n).fill(0)};}
const wrap=x=>((x%1)+1)%1;
function checkComplex(x,n,label){if(!x||!Array.isArray(x.re)||!Array.isArray(x.im)||x.re.length!==n||x.im.length!==n)throw Error(label+' 复数数组维度不符');for(const v of [...x.re,...x.im])finite(v,label);}
function generate(raw={}){
 for(const k of Object.keys(raw))if(!Object.hasOwn(DEFAULT_CONFIG,k))throw Error('未知生成参数 '+k);
 const c={...DEFAULT_CONFIG,...raw};for(const k of Object.keys(c))finite(c[k],k);
 if(!Number.isInteger(c.seed)||c.seed<0||c.seed>4294967295||!Number.isInteger(c.errorCount)||c.errorCount<0||c.errorCount>8||c.separation<.04||c.separation>.34||c.snrDb<10||c.snrDb>40||c.lambdaScale<.5||c.lambdaScale>2||c.muScale<.5||c.muScale>2||![500,2000,6000,10000].includes(c.maxIter))throw Error('输入超出已声明的 4×4 教学范围');
 const M=4,N=4,D=16,paths=[{phi:.13,psi:.11,alpha:{re:1,im:0}},{phi:wrap(.13-c.separation),psi:.11+c.separation,alpha:{re:.65*Math.cos(.8),im:.65*Math.sin(.8)}}];
 const z=complexArray(D),sTrue=complexArray(D),shat=complexArray(D),r=complexArray(D),e=complexArray(D),noise=complexArray(D),bits=[];
 const symbolRng=rng(c.seed^0x16a3c01),noiseRng=rng(c.seed^0x8324dd19),errorRng=rng(c.seed^0x4e10af9);
 const power=1+.65**2,sigma=Math.sqrt(power/10**(c.snrDb/10));
 for(let i=0;i<D;i++){
  const m=i%M,n=Math.floor(i/M);
  for(const p of paths){const phase=2*Math.PI*(m*p.phi-n*p.psi),cr=Math.cos(phase),ci=Math.sin(phase);z.re[i]+=p.alpha.re*cr-p.alpha.im*ci;z.im[i]+=p.alpha.re*ci+p.alpha.im*cr;}
  const bi=symbolRng()<.5?0:1,bq=symbolRng()<.5?0:1;bits.push([bi,bq]);sTrue.re[i]=(1-2*bi)/Math.sqrt(2);sTrue.im[i]=(1-2*bq)/Math.sqrt(2);shat.re[i]=sTrue.re[i];shat.im[i]=sTrue.im[i];
  const radius=Math.sqrt(-2*Math.log(Math.max(noiseRng(),Number.MIN_VALUE))),angle=2*Math.PI*noiseRng();noise.re[i]=sigma/Math.sqrt(2)*radius*Math.cos(angle);noise.im[i]=sigma/Math.sqrt(2)*radius*Math.sin(angle);
  r.re[i]=sTrue.re[i]*z.re[i]-sTrue.im[i]*z.im[i]+noise.re[i];r.im[i]=sTrue.re[i]*z.im[i]+sTrue.im[i]*z.re[i]+noise.im[i];
 }
 const order=Array.from({length:D},(_,i)=>i);for(let j=D-1;j>0;j--){const k=Math.floor(errorRng()*(j+1));[order[j],order[k]]=[order[k],order[j]];}
 const flipAxes=order.map(()=>errorRng()<.5?'re':'im'),wrong=order.slice(0,c.errorCount);
 for(let j=0;j<c.errorCount;j++)shat[flipAxes[j]][order[j]]*=-1;
 for(let i=0;i<D;i++){const dr=sTrue.re[i]-shat.re[i],di=sTrue.im[i]-shat.im[i];e.re[i]=dr*z.re[i]-di*z.im[i];e.im[i]=dr*z.im[i]+di*z.re[i];}
 const lambda=c.lambdaScale*sigma*Math.sqrt(D*Math.log(D)),mu=c.muScale*sigma*Math.sqrt(Math.log(D));
 return {config:c,input:{M,N,r,s:shat,lambda,mu},truth:{z,e,paths,transmittedSymbols:sTrue,bits,errorIndices:wrong,noise},metadata:{version:VERSION,coreSha256:CORE_HASH,sourceSha256:SOURCE_HASH,sourceUrl:'https://arxiv.org/pdf/1610.04218v2',observationEquation:'Eq6/Eq11',vectorization:'column-major: m+M*n',sigma,noiseVariance:sigma*sigma,nominalPathPower:power,snrDefinition:'sum |alpha_k|^2 / sigma^2; not realized coherent grid power',modulation:'unit-energy QPSK',symbolErrorCount:c.errorCount,bitErrorCount:c.errorCount,bitCount:32,errorProtocol:'seeded symbol positions; flip exactly one I/Q sign per selected symbol; not an original-paper BER draw',dimensions:[M,N],PSDComplexDimension:17,units:'normalized phi=f_D*Tbar (mod 1), psi=Delta_f*tau (mod 1); dimensionless amplitudes',physicalMapping:{deltaFHz:5000,TbarSeconds:.0003,CPSeconds:.0001,carrierHz:2e9,cMetresPerSecond:3e8,nominalBandwidthHz:20000,collectionSeconds:.0012},omitted:['direct path','clutter','FEC','actual demodulator','intrablock Doppler/ICI'],paperFigure8Reproduction:false}};
}
function postprocess(input,snapshot,{threshold=.995}={}){
 finite(threshold,'候选门限');if(threshold<.8||threshold>1.01)throw Error('候选门限超出 .8–1.01');
 const {M,N}=input,D=M*N;if(M!==4||N!==4)throw Error('后处理仅用于已声明 4×4 教学实例');
 checkComplex(input.r,D,'r');checkComplex(input.s,D,'s');checkComplex(snapshot.z,D,'z');checkComplex(snapshot.e,D,'e');checkComplex(snapshot.nu,D,'nu');if(!(finite(input.lambda,'lambda')>0))throw Error('lambda 必须大于零');
 const cells=[];let residualEnergy=0;
 for(let i=0;i<D;i++){
  const zr=snapshot.z.re[i],zi=snapshot.z.im[i],sr=input.s.re[i],si=input.s.im[i],mr=sr*zr-si*zi,mi=sr*zi+si*zr,er=snapshot.e.re[i],ei=snapshot.e.im[i],rr=input.r.re[i]-mr-er,ri=input.r.im[i]-mi-ei;
  cells.push({index:i,m:i%M,n:Math.floor(i/M),observed:{re:input.r.re[i],im:input.r.im[i]},modeled:{re:mr,im:mi},error:{re:er,im:ei},residual:{re:rr,im:ri}});residualEnergy+=rr*rr+ri*ri;
 }
 const size=64,values=Array(size*size).fill(0);
 for(let p=0;p<size;p++)for(let q=0;q<size;q++){
  let qr=0,qi=0;for(let i=0;i<D;i++){const phase=-2*Math.PI*((i%M)*p/size-Math.floor(i/M)*q/size),cr=Math.cos(phase),ci=Math.sin(phase);qr+=cr*snapshot.nu.re[i]-ci*snapshot.nu.im[i];qi+=cr*snapshot.nu.im[i]+ci*snapshot.nu.re[i];}values[p*size+q]=Math.hypot(qr,qi)/input.lambda;
 }
 const localMaxima=[];
 for(let p=0;p<size;p++)for(let q=0;q<size;q++){
  const id=p*size+q,v=values[id];if(!(v>0))continue;let peak=true;
  for(let dp=-1;dp<=1&&peak;dp++)for(let dq=-1;dq<=1;dq++){if(!dp&&!dq)continue;const j=((p+dp+size)%size)*size+(q+dq+size)%size;if(values[j]>v||(values[j]===v&&j<id)){peak=false;break;}}
  if(peak)localMaxima.push({phi:p/size,psi:q/size,ratio:v});
 }
 localMaxima.sort((a,b)=>b.ratio-a.ratio||a.phi-b.phi||a.psi-b.psi);
 if(!Number.isFinite(residualEnergy)||!values.every(Number.isFinite))throw Error('后处理数值尺度溢出');
 return {cells,residualEnergy,residualNorm:Math.sqrt(residualEnergy),grid:{size,values,order:'phi-major: phiIndex*64+psiIndex',meaning:'|a(phi,psi)^H nu| / lambda; sampled magnitude, not power or probability'},localMaxima,candidates:localMaxima.filter(p=>p.ratio>=threshold),threshold,method:'64×64 periodic sampled local maxima; no continuous refinement; threshold teaching choice',globalDualCertificate:false};
}
function evaluate(candidates,truth){
 if(!Array.isArray(candidates)||!truth||!Array.isArray(truth.paths)||truth.paths.length!==2)throw Error('评分需本例的两条独立真路径');
 for(const p of [...candidates,...truth.paths]){if(!p||typeof p!=='object')throw Error('路径参数无效');finite(p.phi,'phi');finite(p.psi,'psi');}
 const tol=1/16,dist=(a,b)=>((a-b+.5)%1+1)%1-.5;
 const choices=truth.paths.map(p=>candidates.map((q,j)=>({j,dphi:dist(q.phi,p.phi),dpsi:dist(q.psi,p.psi)})).filter(x=>Math.abs(x.dphi)<tol&&Math.abs(x.dpsi)<tol));
 let best=[];let bestCost=Infinity;
 for(const a of [null,...choices[0]])for(const b of [null,...choices[1]]){if(a&&b&&a.j===b.j)continue;const matches=[];if(a)matches.push({truthIndex:0,candidateIndex:a.j,dphi:a.dphi,dpsi:a.dpsi});if(b)matches.push({truthIndex:1,candidateIndex:b.j,dphi:b.dphi,dpsi:b.dpsi});const cost=matches.reduce((s,x)=>s+x.dphi*x.dphi+x.dpsi*x.dpsi,0);if(matches.length>best.length||(matches.length===best.length&&cost<bestCost)){best=matches;bestCost=cost;}}
 return {matched:best.length,missed:2-best.length,falseCandidates:candidates.length-best.length,totalCandidates:candidates.length,matchTolerancePhi:tol,matchTolerancePsi:tol,matches:best,protocol:'one-to-one strict toroidal phi/psi errors <1/(4*4); declared teaching evaluation; not source detector or probability'};
}
function errorEvaluation(snapshot,truth,input){
 checkComplex(snapshot.e,16,'e');checkComplex(truth.e,16,'truth e');if(finite(input.mu,'mu')<0)throw Error('mu 不能小于零');const threshold=.1*input.mu;let truePositives=0,falsePositives=0,falseNegatives=0;const estimated=[],actual=[];
 for(let i=0;i<16;i++){const a=Math.hypot(snapshot.e.re[i],snapshot.e.im[i])>threshold,b=Math.hypot(truth.e.re[i],truth.e.im[i])>1e-12;if(a)estimated.push(i);if(b)actual.push(i);if(a&&b)truePositives++;if(a&&!b)falsePositives++;if(!a&&b)falseNegatives++;}
 return {threshold,thresholdRule:'|estimated e_i| > 0.1*mu; declared teaching threshold, not original paper',truePositives,falsePositives,falseNegatives,estimated,actual};
}
return {VERSION,SOURCE_HASH,CORE_HASH,DEFAULT_CONFIG,PRESETS,generate,postprocess,evaluate,errorEvaluation};
});
