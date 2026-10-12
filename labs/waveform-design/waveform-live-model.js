/* Input generation and equal-covariance experiment around the independently
 * reviewed core. No saved waveform or historical state is read here. */
(function(root){'use strict';
 const Core=typeof module!=='undefined'&&module.exports?require('./procrustes-core.js'):root.ProcrustesCore;
 const Matrix=typeof module!=='undefined'&&module.exports?require('./waveform-core.js'):root.WaveformCore;
 const VERSION='strict-covariance-live-v1';
 const CORE_SHA256='a844089a501bec61002fe8562f54314c04bc4f27b622033c3995052770b050c6';
 const SOURCE={url:'https://arxiv.org/pdf/1711.05220v1',version:'2017-11-14 v1',equations:'Section III Eqs.(8)-(15)',pdfSha256:'e79052feb8fd898002a71c9b1f20fd75cb757159b6e92071e97812e85b62d798'};
 const LIMITS={N:16,K:8,L:64};
 function integer(v,name,min,max){if(!Number.isInteger(v)||v<min||v>max)throw new Error(`${name} 必须是 ${min}–${max} 之间的整数`);return v;}
 function number(v,name,min,max){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(`${name} 必须在 ${min}–${max} 之间`);return v;}
 function rng(seed){let state=seed>>>0;return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return (state+.5)/4294967296;};}
 function generated(settings){const N=integer(settings.N,'天线数 N',1,LIMITS.N),K=integer(settings.K,'用户数 K',1,LIMITS.K),L=integer(settings.L,'快拍数 L',N,LIMITS.L),seed=integer(settings.seed,'种子',0,4294967295),beta=number(settings.beta,'方向性 β',0,.95),angle=number(settings.angle,'方向 θ₀',-90,90),Pt=number(settings.Pt,'总平均功率 Pₜ',.01,10),random=rng(seed);
  const H=Array.from({length:K},()=>Array.from({length:N},()=>{const amp=Math.sqrt(-Math.log(random())),phase=2*Math.PI*random();return [amp*Math.cos(phase),amp*Math.sin(phase)];}));
  const S=Array.from({length:K},()=>Array.from({length:L},()=>{const q=Math.floor(4*random());return [(q&1?1:-1)/Math.sqrt(2),(q&2?1:-1)/Math.sqrt(2)];}));
  const R=Array.from({length:N},(_,i)=>Array.from({length:N},(_,j)=>{const phase=Math.PI*(i-j)*Math.sin(angle*Math.PI/180);return [Pt/N*((i===j?1-beta:0)+beta*Math.cos(phase)),Pt/N*beta*Math.sin(phase)];}));
  return {H,S,R,origin:{kind:'generated',settings:{N,K,L,seed,beta,angle,Pt},generator:'LCG32(1664525,1013904223), open uniform; complex Gaussian polar transform; unit QPSK',modelVersion:VERSION}};
 }
 function inputBounds(input){if(!input||typeof input!=='object')throw new Error('请输入含 H、S、R 的 JSON 对象');
  for(const name of ['H','S','R'])if(!Array.isArray(input[name])||!input[name].length||!Array.isArray(input[name][0])||!input[name][0].length)throw new Error(`${name} 必须是非空复数矩阵`);
  integer(input.H.length,'用户数 K',1,LIMITS.K);integer(input.H[0].length,'天线数 N',1,LIMITS.N);integer(input.S[0].length,'快拍数 L',input.H[0].length,LIMITS.L);
  return input;
 }
 function canonicalInputs(input){return JSON.stringify({H:input.H,S:input.S,R:input.R});}
 function finiteTree(value){if(typeof value==='number'&&!Number.isFinite(value))throw new Error('参考或诊断指标超出浮点范围，未返回成功结果');if(value&&typeof value==='object')for(const child of Object.values(value))finiteTree(child);}
 function stableNorm(A){let sum=0;for(const row of A)for(const z of row)sum=Math.hypot(sum,z[0],z[1]);return sum;}
 function evaluate(H,S,R,X,bound){const value=Matrix.evaluate(H,S,R,X,bound);value.error=stableNorm(value.errors)**2;value.mse=value.error/(S.length*S[0].length);value.energy=stableNorm(X)**2;value.covarianceResidual=stableNorm(Matrix.diff(value.cov,R));value.covarianceResidualRelative=value.covarianceResidual/stableNorm(R);value.boundResidual=value.error-bound;finiteTree(value);return value;}

 function solve(input){inputBounds(input);const start=typeof performance!=='undefined'?performance.now():Date.now();
  const {H,S,R}=input,N=H[0].length,L=S[0].length,K=H.length;
  const optimal=Core.solve(H,S,R);
  // A zero-objective solve supplies an H/S-independent covariance-feasible
  // square-root frame; right multiplication by a unitary L-point DFT preserves R.
  const frame=Core.solve([Array.from({length:N},()=>[0,0])],[Array.from({length:L},()=>[0,0])],R).X;
  const D=Array.from({length:L},(_,i)=>Array.from({length:L},(_,j)=>{const phase=2*Math.PI*i*j/L;return [Math.cos(phase)/Math.sqrt(L),Math.sin(phase)/Math.sqrt(L)];}));
  const Xref=Matrix.product(frame,D),reference=evaluate(H,S,R,Xref,optimal.globalObjectiveBound),evaluated=evaluate(H,S,R,optimal.X,optimal.globalObjectiveBound);
  const refRelative=reference.covarianceResidualRelative;
  if(!Number.isFinite(refRelative)||refRelative>2e-10||reference.error<evaluated.error-optimal.diagnostics.objectiveCertificateTolerance)throw new Error('同协方差参考的独立约束检查失败');
  const result={schemaVersion:1,modelVersion:VERSION,source:SOURCE,coreSha256:CORE_SHA256,status:'certified',inputs:{H,S,R},origin:input.origin||{kind:'manual',generator:null,modelVersion:VERSION},
   dimensions:{N,K,L},optimal,reference:{X:Xref,...reference,covarianceResidualRelative:refRelative},evaluated,
   rank:{numerical:optimal.diagnostics.procrustesNumericalRank,tolerance:optimal.diagnostics.rankTolerance,structuralUpperBound:Math.min(N,K),guaranteedNullDirections:Math.max(0,N-K)},
   totalComputeMs:(typeof performance!=='undefined'?performance.now():Date.now())-start,
   scope:'Strict-covariance MUI optimum only; DFT reference is a matched teaching baseline; not whole-paper reproduction'};finiteTree(result);return result;
 }
 function rateMetric(input,X,snrDb){number(snrDb,'SNR',-10,30);const {H,S,R}=input,Pt=R.reduce((s,row,i)=>s+row[i][0],0),N0=Pt/10**(snrDb/10),Y=Matrix.product(H,X);
  // Scale the denominator, then evaluate log1p(exp(logRatio)) without
  // materializing either e+N0 or an overflowing signal-to-noise ratio.
  function logRate(p,e){if(p===0)return 0;const scale=Math.max(e,N0),logRatio=Math.log(p)-Math.log(scale)-Math.log(e/scale+N0/scale);return (logRatio>0?logRatio+Math.log1p(Math.exp(-logRatio)):Math.log1p(Math.exp(logRatio)))/Math.LN2;}
  const rows=S.map((row,i)=>{const signalPower=row.reduce((s,z)=>s+Matrix.abs2(z),0)/row.length,mui=row.reduce((s,z,j)=>s+Matrix.abs2([Y[i][j][0]-z[0],Y[i][j][1]-z[1]]),0)/row.length;return {user:i+1,signalPower,mui,logRate:logRate(signalPower,mui)};});
  if(!Number.isFinite(N0)||!(N0>0)||rows.some(r=>!Number.isFinite(r.logRate)))throw new Error('噪声诊断超出本页可表示的数值范围');
  const result={snrDb,noisePower:N0,users:rows,sumLogRate:rows.reduce((s,r)=>s+r.logRate,0),label:'论文式(4)–(5)的有限块高斯对数诊断，不是 QPSK 互信息或实测吞吐'};finiteTree(result);return result;
 }
 function friendlyError(error){const message=error&&error.message?error.message:String(error);const translations=[
  [/L >= N/,'满秩目标协方差要求 L≥N，请增加快拍数或减少天线数'],[/not Hermitian/,'R 必须是 Hermitian 矩阵：对角线为实数，Rᵢⱼ=共轭(Rⱼᵢ)'],[/positive definite/,'R 必须严格正定；奇异或不定协方差不属于本页分支'],[/ill-conditioned/,'R 的条件数超出本实现范围；没有自动加对角加载'],[/floating-point|nonfinite|overflowed/,'输入或结果超出浮点表示范围，请调整尺度'],[/same K rows/,'H 与 S 的用户数 K 必须相同'],[/N by N/,'R 的形状必须为 N×N，与 H 的列数一致'],[/finite \[real,imaginary\]/,'每个复数必须写成有限数值对 [实部, 虚部]'],[/rectangular/,'矩阵每一行的长度必须相同'],[/did not converge|certificate checks/,'数值分解或约束证书未通过；本次结果不显示为成功']];
  for(const [pattern,label]of translations)if(pattern.test(message))return label;return message;
 }
 const api=Object.freeze({VERSION,CORE_SHA256,SOURCE,LIMITS,generated,inputBounds,canonicalInputs,solve,rateMetric,friendlyError});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WaveformLiveModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
