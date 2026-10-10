/* Independent real-scalar, no-prior teaching model. No old lab numerics are changed. */
(function(root){
  'use strict';
  const VERSION='xoshiro128ss-splitmix32-boxmuller-v1';
  const LENGTHS=Object.freeze([3,4,8,16,32,64]), COUNTS=Object.freeze([100,1000,10000]);
  function finite(v,name){if(!Number.isFinite(v))throw new RangeError(`${name}: nonfinite numerical result`);return v;}
  function seedValue(v){if(!Number.isInteger(v)||v<0||v>4294967295)throw new RangeError('seed must be an unsigned 32-bit integer');return v;}
  function randomStream(seed,domain){
    seedValue(seed);if(typeof domain!=='string'||!domain)throw new RangeError('domain required');
    let h=2166136261;for(const c of domain)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
    let z=(seed^h)>>>0;
    const mix=()=>{z=(z+0x9e3779b9)>>>0;let v=z;v=Math.imul(v^(v>>>16),0x21f0aaad);v=Math.imul(v^(v>>>15),0x735a2d97);return (v^(v>>>15))>>>0;};
    let a=mix(),b=mix(),c=mix(),d=mix();if(!(a|b|c|d))throw new RangeError('zero PRNG state');
    const rot=(v,k)=>(v<<k)|(v>>>(32-k));
    function uniform(){const result=Math.imul(rot(Math.imul(b,5),7),9)>>>0,t=b<<9;c^=a;d^=b;b^=c;a^=d;c^=t;d=rot(d,11);return (result+.5)/4294967296;}
    let spare=null;
    function normal(){if(spare!==null){const v=spare;spare=null;return v;}const r=Math.sqrt(-2*Math.log(uniform())),p=2*Math.PI*uniform();spare=r*Math.sin(p);return r*Math.cos(p);}
    return {uniform,normal};
  }
  function vectors(x,y){if(!Array.isArray(x)||!Array.isArray(y)||!x.length||x.length!==y.length)throw new RangeError('equal nonempty vectors required');x.forEach(v=>finite(v,'x'));y.forEach(v=>finite(v,'y'));}
  function energy(x){if(!Array.isArray(x)||!x.length)throw new RangeError('nonempty x required');let E=0;for(const v of x){finite(v,'x');E=finite(E+v*v,'energy');}if(E<=0)throw new RangeError('zero energy: failed run');return E;}
  // Deliberately only x and y: no truth or noise argument reaches the estimator.
  function estimate(x,y){vectors(x,y);const E=energy(x);let xy=0;for(let i=0;i<x.length;i++)xy=finite(xy+x[i]*y[i],'dot product');return finite(xy/E,'estimate');}
  function observation(x,n,theta=1){vectors(x,n);finite(theta,'truth');return x.map((v,i)=>finite(theta*v+n[i],'observation'));}
  function trial(x,n,theta=1){const y=observation(x,n,theta),E=energy(x),thetaHat=estimate(x,y),error=finite(thetaHat-theta,'error'),squaredError=finite(error*error,'squared error'),crb=finite(1/E,'CRB');let score=0,residualDot=0;for(let i=0;i<x.length;i++){score+=x[i]*(y[i]-theta*x[i]);residualDot+=x[i]*(y[i]-thetaHat*x[i]);}return {energy:E,thetaHat,error,squaredError,crb,score:finite(score,'score'),residualDot:finite(residualDot,'residual'),standardizedSquared:finite(E*squaredError,'standardized squared error')};}
  function analytic(T,family,E){if(!LENGTHS.includes(T)||!['gaussian','bpsk'].includes(family))throw new RangeError('analytic settings');if(E!==undefined){if(!Number.isFinite(E)||E<=0)throw new RangeError('energy');return {mse:finite(1/E,'mse'),squaredErrorVariance:finite(2/(E*E),'variance'),crbVariance:0};}if(family==='bpsk')return {mse:1/T,squaredErrorVariance:2/T**2,crbVariance:0};return {mse:1/(T-2),squaredErrorVariance:T>4?2*(T-1)/((T-2)**2*(T-4)):Infinity,crbVariance:T>4?2/((T-2)**2*(T-4)):Infinity};}
  function checkpoints(running){const chosen=new Set([0,running.length-1]);for(let k=0;k<154;k++)chosen.add(Math.round(k*(running.length-1)/153));for(const key of ['mse','meanCrb']){let lo=0,hi=0;for(let i=1;i<running.length;i++){if(running[i][key]<running[lo][key])lo=i;if(running[i][key]>running[hi][key])hi=i;}chosen.add(lo);chosen.add(hi);}return [...chosen].sort((a,b)=>a-b).map(i=>running[i]);}
  function experiment({mode='fixed',T=8,B=1000,seed=2026}={}){
    if(!['fixed','fresh'].includes(mode)||!LENGTHS.includes(T)||!COUNTS.includes(B))throw new RangeError('unsupported mode, T or B');seedValue(seed);
    const result={mode,T,B,seed,theta:1,noiseVariance:1,version:VERSION};
    for(const family of ['gaussian','bpsk']){
      const input=randomStream(seed,`${mode}/${family}/input`),noise=randomStream(seed,`${mode}/${family}/noise`);
      const drawX=()=>Array.from({length:T},()=>family==='gaussian'?input.normal():(input.uniform()<.5?-1:1));
      const fixedX=mode==='fixed'?drawX():null,rows=[],running=[];
      let se=0,err=0,ce=0,energies=0,std=0,minEnergy=Infinity,maxSquaredError=0,maxCumulative=0;
      for(let j=0;j<B;j++){
        const x=fixedX||drawX(),n=Array.from({length:T},()=>noise.normal()),r=trial(x,n);
        r.b=j+1;if(j<16){r.x=x.slice();r.n=n;r.y=observation(x,n);}
        rows.push(r);se=finite(se+r.squaredError,'sum squared error');err=finite(err+r.error,'sum error');ce=finite(ce+r.crb,'sum CRB');energies=finite(energies+r.energy,'sum energy');std=finite(std+r.standardizedSquared,'sum standardized');minEnergy=Math.min(minEnergy,r.energy);maxSquaredError=Math.max(maxSquaredError,r.squaredError);
        const point={b:j+1,mse:se/(j+1),meanCrb:ce/(j+1)};running.push(point);maxCumulative=Math.max(maxCumulative,point.mse,point.meanCrb);
      }
      const reference=analytic(T,family,fixedX?energy(fixedX):undefined);
      result[family]={rows,running,checkpoints:checkpoints(running),reference,axisMax:finite(Math.max(maxCumulative,reference.mse)*1.08,'axis maximum'),summary:{trials:B,meanEnergy:energies/B,bias:err/B,mse:se/B,meanCrb:ce/B,analyticMse:reference.mse,minEnergy,maxSquaredError,meanStandardizedSquared:std/B}};
    }
    return result;
  }
  const api=Object.freeze({VERSION,LENGTHS,COUNTS,seedValue,randomStream,energy,estimate,observation,trial,analytic,checkpoints,experiment});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Estimator=api;
})(typeof window!=='undefined'?window:globalThis);
