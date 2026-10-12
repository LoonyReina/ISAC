/* Real RF / quadrature / moving-path teaching models.
 * Physical convention: s(t)=I*cos(theta)-Q*sin(theta), z=I+jQ.
 * Rx multiplies by 2*cos(theta+delta), -2*sin(theta+delta).
 * Doppler uses a coherent, monostatic, narrowband, low-speed model.
 * No DOM, randomness, network requests or external dependencies. */
(function (root) {
  'use strict';
  const TAU = 2 * Math.PI, C = 3e8;
  const finite = (...values) => {
    if (!values.every(Number.isFinite)) throw new TypeError('Finite numeric inputs required');
  };
  const cis = p => ({re: Math.cos(p), im: Math.sin(p)});
  const multiply = (a, b) => ({re: a.re*b.re-a.im*b.im, im: a.re*b.im+a.im*b.re});
  const wrap = p => ((p + Math.PI) % TAU + TAU) % TAU - Math.PI;
  function rf(i, q, theta) { finite(i,q,theta); return i*Math.cos(theta)-q*Math.sin(theta); }
  function polar(i,q) {
    finite(i,q); const amplitude=Math.hypot(i,q);
    return {amplitude, phase: amplitude<1e-12 ? null : Math.atan2(q,i), envelopePower:i*i+q*q};
  }
  function quadrature(i, q, loPhase=0, count=512) {
    finite(i,q,loPhase);
    if (!Number.isInteger(count)||count<16) throw new RangeError('At least 16 samples required');
    const samples=[]; let recoveredI=0,recoveredQ=0,meanRFPower=0;
    // Two complete carrier periods; constant I,Q and synchronous reference.
    // The numerical average illustrates ideal LPF DC output, not a designed FIR.
    for(let n=0;n<count;n++) {
      const theta=2*TAU*n/count, first=i*Math.cos(theta), second=-q*Math.sin(theta);
      const s=first+second, mixedI=2*s*Math.cos(theta+loPhase), mixedQ=-2*s*Math.sin(theta+loPhase);
      samples.push({theta,first,second,s,mixedI,mixedQ});
      recoveredI+=mixedI/count; recoveredQ+=mixedQ/count; meanRFPower+=s*s/count;
    }
    return {samples,recoveredI,recoveredQ,meanRFPower,...polar(i,q)};
  }
  const symbols=Object.freeze({
    '00':Object.freeze({i:Math.SQRT1_2,q:Math.SQRT1_2}),
    '01':Object.freeze({i:-Math.SQRT1_2,q:Math.SQRT1_2}),
    '11':Object.freeze({i:-Math.SQRT1_2,q:-Math.SQRT1_2}),
    '10':Object.freeze({i:Math.SQRT1_2,q:-Math.SQRT1_2})
  });
  function pathState(v,t,fc=5e9,R0=37.5,initialPhase=0) {
    finite(v,t,fc,R0,initialPhase);
    if(fc<=0||t<0||R0-v*t<=0) throw new RangeError('Positive carrier, nonnegative time, positive target distance required');
    const lambda=C/fc,deltaR=-v*t,deltaL=2*deltaR,phaseChange=-TAU*deltaL/lambda;
    const phase=initialPhase+phaseChange;
    return {v,t,fc,lambda,R:R0+deltaR,L:2*(R0+deltaR),deltaR,deltaL,
      phaseChange,phase,turns:phaseChange/TAU,fd:2*v/lambda,z:cis(phase)};
  }
  function slowTime(v,Tr=0.0005,count=16,initialPhase=0) {
    finite(v,Tr,initialPhase);
    if(Tr<=0||!Number.isInteger(count)||count<2) throw new RangeError('Tr>0 and at least two observations required');
    const samples=Array.from({length:count},(_,m)=>({...pathState(v,m*Tr,5e9,37.5,initialPhase),m}));
    const phaseStep=TAU*samples[0].fd*Tr,shortStep=wrap(phaseStep);
    const apparentFd=shortStep/(TAU*Tr),apparentV=apparentFd*samples[0].lambda/2;
    return {samples,Tr,phaseStep,shortStep,apparentFd,apparentV,
      ambiguous: Math.abs(phaseStep)>=Math.PI-1e-10,
      speedBound:samples[0].lambda/(4*Tr)};
  }
  function probeSnapshot(v,Tr,m,count=16) {
    if(!Number.isInteger(m)||m<0||!Number.isInteger(count)||count<8) throw new RangeError('Valid observation and sample indices required');
    const state=pathState(v,m*Tr),x=[],y=[],products=[];
    let re=0,im=0;
    // Isolated, delay-aligned toy complex probe; not a full OFDM/RF receiver.
    for(let n=0;n<count;n++) {
      const a=cis(TAU*3*n/count),b=multiply(a,state.z),p=multiply(b,{re:a.re,im:-a.im});
      x.push(a);y.push(b);products.push(p);re+=p.re/count;im+=p.im/count;
    }
    return {x,y,products,z:{re,im},state};
  }
  const api={TAU,C,rf,polar,quadrature,symbols,pathState,slowTime,probeSnapshot,wrap};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.IntuitionModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
