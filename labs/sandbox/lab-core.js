/* ISAC teaching models. No dependencies. All arrays use linear units.
 * Model assumptions and primary sources are documented in learn.html.
 */
(function (root) {
  'use strict';
  const TAU = 2 * Math.PI;
  const barker = [1,1,1,1,1,-1,-1,1,1,-1,1,-1,1];
  function rng(seed=7) { let x=seed>>>0; return () => { x=(Math.imul(1664525,x)+1013904223)>>>0; return (x+0.5)/4294967296; }; }
  function normal(random) { return Math.sqrt(-2*Math.log(random()))*Math.cos(TAU*random()); }
  function caFactor(n,p) { if (!Number.isInteger(n)||n<1||!(p>0&&p<1)) throw new RangeError('N >= 1; 0 < Pfa < 1'); return n*Math.expm1(-Math.log(p)/n); }
  function caThresholds(power,half,guard,p) {
    const n=2*half, a=caFactor(n,p), t=Array(power.length).fill(NaN);
    for(let i=half+guard;i<power.length-half-guard;i++) {
      let sum=0; for(let j=guard+1;j<=guard+half;j++) sum+=power[i-j]+power[i+j];
      t[i]=a*sum/n;
    } return t;
  }
  function wilson(k,n) { const z=1.95996398454, p=k/n, den=1+z*z/n;
    const mid=(p+z*z/(2*n))/den, w=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den; return [mid-w,mid+w]; }
  function falseAlarmTrials(n,p,trials,mean=1,seed=7) {
    const random=rng(seed), a=caFactor(n,p); let count=0;
    for(let i=0;i<trials;i++) { const cut=-mean*Math.log(random()); let sum=0;
      for(let j=0;j<n;j++) sum-=mean*Math.log(random()); if(cut>a*sum/n) count++; }
    return {count,trials,rate:count/trials,interval:wilson(count,trials)};
  }
  function cfarData(noise=1,scenario='uniform',seed=19) {
    const random=rng(seed); return Array.from({length:96},(_,i)=> {
      const mean=noise*(scenario==='edge'&&i>=48?8:1);
      let target=scenario==='noise'?0:Math.sqrt(18)*Math.exp(-0.5*((i-48)/0.75)**2);
      if(scenario==='neighbor') target+=Math.sqrt(120)*Math.exp(-0.5*((i-54)/0.75)**2);
      const re=Math.sqrt(mean/2)*normal(random)+target;
      const im=Math.sqrt(mean/2)*normal(random); return re*re+im*im;
    });
  }
  function matched(kind='barker',wrong=false,noise=0,second=false,seed=11) {
    const s=kind==='barker'?barker.slice():Array(13).fill(1);
    const template=wrong?Array(13).fill(1):s.slice(), random=rng(seed), delay=25;
    const y=Array.from({length:96},(_,n)=> (s[n-delay]||0)+(second?0.45*(s[n-delay-8]||0):0)+noise*normal(random));
    const z=Array.from({length:70},(_,lag)=>template.reduce((v,x,j)=>v+x*y[lag+j],0)/13);
    let peak=0; for(let i=1;i<z.length;i++) if(Math.abs(z[i])>Math.abs(z[peak])) peak=i;
    return {s,template,y,z,peak,delay};
  }
  function arrayGain(n,steer,angle) {
    const step=Math.PI*(Math.sin(angle*Math.PI/180)-Math.sin(steer*Math.PI/180));
    let re=0,im=0; for(let i=0;i<n;i++){re+=Math.cos(i*step);im+=Math.sin(i*step);} return (re*re+im*im)/(n*n);
  }
  function ofdm(rangeBin=10,dopplerBin=3,remove=true,noise=0.08) {
    const N=32, M=32, random=rng(71), re=[],im=[];
    for(let m=0;m<M;m++) { re[m]=[]; im[m]=[];
      for(let k=0;k<N;k++) {
        const symbol=(Math.floor(random()*4)+0.5)*Math.PI/2;
        const phase=TAU*(-k*rangeBin/N+m*dopplerBin/M);
        let r=Math.cos(phase+symbol)+noise*normal(random), q=Math.sin(phase+symbol)+noise*normal(random);
        if(remove) { const c=Math.cos(symbol),s=Math.sin(symbol); [r,q]=[r*c+q*s,q*c-r*s]; }
        re[m][k]=r; im[m][k]=q;
      }
    }
    // IFFT over subcarrier index k; FFT over slow-time index m. Both normalized.
    const cos=[],sin=[]; for(let p=0;p<N;p++){cos[p]=[];sin[p]=[];for(let k=0;k<N;k++){cos[p][k]=Math.cos(TAU*p*k/N);sin[p][k]=Math.sin(TAU*p*k/N);}}
    const rr=[],ri=[]; for(let m=0;m<M;m++){rr[m]=[];ri[m]=[];for(let r=0;r<N;r++){
      let a=0,b=0;for(let k=0;k<N;k++){a+=re[m][k]*cos[r][k]-im[m][k]*sin[r][k];b+=re[m][k]*sin[r][k]+im[m][k]*cos[r][k];} rr[m][r]=a/N;ri[m][r]=b/N;
    }}
    const power=[];let peak={r:0,d:0,p:-1};
    for(let row=0;row<M;row++){const d=15-row,di=(d+M)%M;power[row]=[];
      for(let r=0;r<N;r++){let a=0,b=0;for(let m=0;m<M;m++){a+=rr[m][r]*cos[di][m]+ri[m][r]*sin[di][m];b+=ri[m][r]*cos[di][m]-rr[m][r]*sin[di][m];}
        const p=(a*a+b*b)/(M*M);power[row][r]=p;if(p>peak.p)peak={r,d,p};
      }
    }
    return {re,im,power,peak,rangeResolution:3e8/(2*32*1e6),velocityResolution:0.06/(2*32*0.001)};
  }
  const api={TAU,barker,rng,normal,caFactor,caThresholds,falseAlarmTrials,cfarData,matched,arrayGain,ofdm};
  if(typeof module!=='undefined'&&module.exports)module.exports=api; else root.ISAC=api;
})(typeof globalThis!=='undefined'?globalThis:this);
