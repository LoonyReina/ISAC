/* Reduced 2-D one-bounce GC-SAGE inverse kernel, Float64, no dependencies.
 * Port of the separately verified gc_sage.py, NOT a full paper reproduction.
 * Runtime accepts observations and declared acquisition/search priors only.
 * No fixtures, simulator, true visibility, or known mechanism labels are used.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.NearfieldGCSAGE = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 'reduced-gc-sage-2d/0.2.0-all-channel-region';
  const REGION_TOLERANCE_M = 1e-10;
  const HISTORY_SCHEMA_VERSION = 'gc-sage-compact-history/1.0.0';
  const C = 299792458, TAU = 2 * Math.PI;
  const DEFAULT_OPTIONS = Object.freeze({delay_grid:1024, initializer_sweeps:20,
    angle_grid:256, refinement_rounds:2, refinement_points:17,
    max_sweeps:12, relative_tolerance:1e-6, stationary_sweeps:2, record_history:false});
  const MODEL_KEYS = ['tx','rx','frequencies','region','reference_pair','path_count','max_delay_ns'];
  const initialRecords = new WeakMap();
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const finite = x => typeof x === 'number' && Number.isFinite(x);
  const norm = (x,y) => Math.sqrt(x*x+y*y);
  function assert(test, message) { if (!test) throw new Error(message); }
  function strictKeys(obj, allowed, label) {
    assert(obj && typeof obj === 'object', label + ' must be an object');
    for (const key of Object.keys(obj)) assert(allowed.includes(key), 'Unknown '+label+' field: '+key);
  }
  function clone(value) {
    if (ArrayBuffer.isView(value)) return value.slice();
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clone(v)]));
    return value;
  }
  function matrix(rows, cols) { return {rows, cols, real:new Float64Array(rows*cols), imag:new Float64Array(rows*cols)}; }
  function asMatrix(y) {
    strictKeys(y, ['rows','cols','real','imag'], 'observations');
    if (Number.isInteger(y.rows) && Number.isInteger(y.cols)) {
      assert(y.rows>0 && y.cols>0 && y.real.length===y.rows*y.cols && y.imag.length===y.rows*y.cols, 'Invalid packed observation shape');
      const out=matrix(y.rows,y.cols);
      for(let i=0;i<out.real.length;i++) { assert(finite(y.real[i])&&finite(y.imag[i]),'Observations must be finite'); out.real[i]=y.real[i];out.imag[i]=y.imag[i]; }
      return out;
    }
    assert(Array.isArray(y.real)&&Array.isArray(y.imag)&&y.real.length>0&&y.real.length===y.imag.length, 'Observations need equal nonempty real/imag matrices');
    const rows=y.real.length,cols=y.real[0].length,out=matrix(rows,cols);
    assert(cols>0,'Observations need at least one tone');
    for(let q=0;q<rows;q++) {
      assert(y.real[q].length===cols&&y.imag[q].length===cols,'Observation rows must have equal lengths');
      for(let p=0;p<cols;p++) { const k=q*cols+p;assert(finite(y.real[q][p])&&finite(y.imag[q][p]),'Observations must be finite');out.real[k]=y.real[q][p];out.imag[k]=y.imag[q][p]; }
    }
    return out;
  }
  function optionsWithDefaults(input={}) {
    strictKeys(input,Object.keys(DEFAULT_OPTIONS),'options');
    const o={...DEFAULT_OPTIONS,...input};
    for(const k of ['delay_grid','initializer_sweeps','angle_grid','refinement_rounds','refinement_points','max_sweeps','stationary_sweeps']) assert(Number.isSafeInteger(o[k])&&o[k]>=0,k+' must be a nonnegative integer');
    assert(o.delay_grid>=3,'At least three delay-grid points are required');
    assert(o.angle_grid>=8&&o.refinement_points>=3,'Geometry search budget is too small');
    assert(o.stationary_sweeps>=1,'stationary_sweeps must be positive');
    assert(finite(o.relative_tolerance)&&o.relative_tolerance>=0,'relative_tolerance must be finite and nonnegative');
    assert(typeof o.record_history==='boolean','record_history must be a Boolean');
    return o;
  }
  function prepareModel(input) {
    strictKeys(input,MODEL_KEYS,'model');
    const m=clone(input);
    for(const key of ['tx','rx']) assert(Array.isArray(m[key])&&m[key].length>0&&m[key].every(x=>Array.isArray(x)&&x.length===2&&x.every(finite)), key+' must contain finite 2-D coordinates');
    assert((Array.isArray(m.frequencies)||ArrayBuffer.isView(m.frequencies))&&m.frequencies.length>0&&Array.from(m.frequencies).every(finite),'Frequencies must be finite');
    m.frequencies=Array.from(m.frequencies);
    m.region=m.region===undefined?[0,6.5,.05,6.5]:m.region;
    m.reference_pair=m.reference_pair===undefined?23:m.reference_pair;
    m.path_count=m.path_count===undefined?2:m.path_count;
    m.max_delay_ns=m.max_delay_ns===undefined?55:m.max_delay_ns;
    assert(Array.isArray(m.region)&&m.region.length===4&&m.region.every(finite)&&m.region[0]<m.region[1]&&m.region[2]<m.region[3], 'Invalid search region');
    const q=m.tx.length*m.rx.length;
    assert(Number.isInteger(m.reference_pair)&&m.reference_pair>=0&&m.reference_pair<q,'Reference pair is outside the array');
    assert(Number.isInteger(m.path_count)&&m.path_count>=1,'Known path count must be positive');
    assert(finite(m.max_delay_ns)&&m.max_delay_ns>0,'max_delay_ns must be finite and positive');
    return m;
  }
  function pairs(m) { const tx=[],rx=[];for(const t of m.tx) for(const r of m.rx){tx.push(t);rx.push(r);}return {tx,rx}; }
  function validateAcquisition(y,m) {
    assert(y.rows===m.tx.length*m.rx.length&&y.cols===m.frequencies.length,'Observation shape must equal (M*N, P)');
    assert(m.frequencies.length>=2&&Math.max(...m.frequencies)>Math.min(...m.frequencies),'A free per-channel gain makes single-tone geometry unidentifiable');
    assert(m.path_count<m.frequencies.length,'Known path count must be smaller than tone count');
    const alias=delayAliasPeriodNs(m.frequencies);
    assert(m.max_delay_ns<alias, 'Declared '+m.max_delay_ns+' ns delay prior exceeds the '+alias+' ns tone-grid alias period; increase tone count, reduce bandwidth, or supply an independently justified shorter prior');
    const pr=pairs(m),i=m.reference_pair,min=norm(pr.tx[i][0]-pr.rx[i][0],pr.tx[i][1]-pr.rx[i][1])/C*1e9+1e-5;
    assert(m.max_delay_ns>min,'No physical nonaliased reference-delay interval remains');
    return [min,m.max_delay_ns];
  }
  function delayAliasPeriodNs(frequencies) {
    const f=Array.from(frequencies).sort((a,b)=>a-b);
    assert(f.length>=2&&f.every(finite),'Distinct multiple finite frequencies are required for an alias period');
    const d=f.slice(1).map((v,i)=>v-f[i]),base=Math.min(...d);
    assert(base>0,'Frequencies must be distinct');
    assert(d.every(x=>Math.abs(x/base-Math.round(x/base))<=1e-8+1e-8*Math.abs(Math.round(x/base))), 'Unsupported tone lattice for alias guard; supply a uniform grid or a supported commensurate subset');
    return 1e9/base;
  }
  function linspace(lo,hi,n) { const a=new Array(n),step=(hi-lo)/(n-1);for(let i=0;i<n;i++)a[i]=lo+i*step;a[n-1]=hi;return a; }
  function steering(delays,frequencies) {
    const s=matrix(delays.length,frequencies.length);
    for(let q=0;q<s.rows;q++) for(let p=0;p<s.cols;p++) { const i=q*s.cols+p,a=(-TAU*delays[q])*frequencies[p];s.real[i]=Math.cos(a);s.imag[i]=Math.sin(a); }
    return s;
  }
  function residualSSE(a,b) { assert(a.rows===b.rows&&a.cols===b.cols,'Residual shapes differ');let v=0;for(let i=0;i<a.real.length;i++){const r=a.real[i]-b.real[i],im=a.imag[i]-b.imag[i];v+=r*r+im*im;}assert(finite(v),'Nonfinite computed residual objective');return v; }
  function energy(a) { let v=0;for(let i=0;i<a.real.length;i++)v+=a.real[i]*a.real[i]+a.imag[i]*a.imag[i];return v; }
  function sumPredictions(states) { const y=matrix(states[0].prediction.rows,states[0].prediction.cols);for(const s of states) for(let i=0;i<y.real.length;i++){y.real[i]+=s.prediction.real[i];y.imag[i]+=s.prediction.imag[i];}return y; }
  function hiddenData(y,total,active) { const h=matrix(y.rows,y.cols);for(let i=0;i<h.real.length;i++){h.real[i]=y.real[i]-(total.real[i]-active.real[i]);h.imag[i]=y.imag[i]-(total.imag[i]-active.imag[i]);}return h; }
  function gainPrediction(s,gains) { const z=matrix(s.rows,s.cols);for(let q=0;q<s.rows;q++)for(let p=0;p<s.cols;p++){const i=q*s.cols+p,gr=gains.real[q],gi=gains.imag[q];z.real[i]=gr*s.real[i]-gi*s.imag[i];z.imag[i]=gr*s.imag[i]+gi*s.real[i];}return z; }
  function profileRaw(hidden,delays,frequencies) {
    const s=steering(delays,frequencies),g={real:new Float64Array(hidden.rows),imag:new Float64Array(hidden.rows)};let score=0;
    for(let q=0;q<hidden.rows;q++) { let r=0,im=0;for(let p=0;p<hidden.cols;p++){const i=q*hidden.cols+p;r+=s.real[i]*hidden.real[i]+s.imag[i]*hidden.imag[i];im+=s.real[i]*hidden.imag[i]-s.imag[i]*hidden.real[i];}g.real[q]=r/hidden.cols;g.imag[q]=im/hidden.cols;score+=g.real[q]*g.real[q]+g.imag[q]*g.imag[q]; }
    assert(finite(score*hidden.cols),'Nonfinite computed projection score');
    return {gains:g,steering:s,score:hidden.cols*score};
  }
  function profileGeometry(hidden,delays,frequencies) {
    const h=asMatrix(hidden);assert(delays.length===h.rows&&frequencies.length===h.cols,'Geometry profile shape mismatch');assert(Array.from(delays).every(finite)&&Array.from(frequencies).every(finite),'Profile delays/frequencies must be finite');
    const r=profileRaw(h,delays,frequencies),prediction=gainPrediction(r.steering,r.gains);
    return {gains:r.gains,prediction,sse:residualSSE(h,prediction)};
  }
  function ellipseRaw(referenceDelay,angles,m) {
    const pr=pairs(m),t=pr.tx[m.reference_pair],r=pr.rx[m.reference_pair];
    const length=C*referenceDelay,focal=norm(r[0]-t[0],r[1]-t[1]);
    if(length<=focal+1e-10)return angles.map(()=>[NaN,NaN]);
    const ex=focal>1e-12?(r[0]-t[0])/focal:1,ey=focal>1e-12?(r[1]-t[1])/focal:0,a=length/2,b=Math.sqrt(a*a-(focal/2)**2);
    return angles.map(theta=>[(t[0]+r[0])/2+a*Math.cos(theta)*ex-b*Math.sin(theta)*ey,(t[1]+r[1])/2+a*Math.cos(theta)*ey+b*Math.sin(theta)*ex]);
  }
  function ellipsePoints(referenceDelay,angles,model) { return ellipseRaw(referenceDelay,Array.from(angles),prepareModel(model)); }
  function candidateRaw(referenceDelay,angles,kind,m) {
    assert(kind==='scattering'||kind==='reflection','Only one-bounce scattering/reflection candidates are implemented');
    const pr=pairs(m),t0=pr.tx[m.reference_pair],r0=pr.rx[m.reference_pair],points=ellipseRaw(referenceDelay,angles,m),out=[];
    for(let k=0;k<angles.length;k++) {
      const point=points[k],[x,y]=point,[xmin,xmax,ymin,ymax]=m.region;
      if(!finite(x)||!finite(y)||x<xmin||x>xmax||y<ymin||y>ymax)continue;
      let normal=null,valid=true;const bounces=[],delays=[];
      if(kind==='reflection') {
        const dt=norm(x-t0[0],y-t0[1]),dr=norm(x-r0[0],y-r0[1]);
        const nx=(x-t0[0])/dt+(x-r0[0])/dr,ny=(y-t0[1])/dt+(y-r0[1])/dr,n=norm(nx,ny);
        if(!(n>1e-10))continue;normal=[nx/n,ny/n];
      }
      for(let q=0;q<pr.tx.length;q++) {
        const t=pr.tx[q],r=pr.rx[q];let bounce=point,length;
        if(kind==='reflection') {
          const [nx,ny]=normal,dot=nx*(t[0]-x)+ny*(t[1]-y),ix=t[0]-2*nx*dot,iy=t[1]-2*ny*dot;
          const dx=r[0]-ix,dy=r[1]-iy,den=nx*dx+ny*dy,u=(nx*(x-ix)+ny*(y-iy))/den;
          if(!(Math.abs(den)>1e-10&&u>0&&u<1)){valid=false;break;}
          bounce=[ix+u*dx,iy+u*dy];length=norm(t[0]-bounce[0],t[1]-bounce[1])+norm(r[0]-bounce[0],r[1]-bounce[1]);
          if(!finite(length)||Math.abs(length-norm(dx,dy))>=1e-8){valid=false;break;}
        } else length=norm(x-t[0],y-t[1])+norm(x-r[0],y-r[1]);
        // Literal bounded-region contract: all modeled channel bounces, including
        // channels whose fitted gains later approach zero, lie inside V.
        const tol=REGION_TOLERANCE_M;
        if(!finite(length)||bounce[0]<xmin-tol||bounce[0]>xmax+tol||bounce[1]<ymin-tol||bounce[1]>ymax+tol){valid=false;break;}
        bounces.push(bounce.slice());delays.push(length/C);
      }
      if(valid&&Math.abs(delays[m.reference_pair]*C-C*referenceDelay)<1e-8)out.push({theta:angles[k],point,normal,bounce_points:bounces,delays:Float64Array.from(delays)});
    }
    return out;
  }
  function candidateGeometry(referenceDelay,angles,kind,model) { assert(finite(referenceDelay),'Reference delay must be finite');return candidateRaw(referenceDelay,Array.from(angles),kind,prepareModel(model)); }
  function newBudget() { return {delay_candidates:0,delay_tone_products:0,scattering_candidates:0,reflection_candidates:0,scattering_tone_products:0,reflection_tone_products:0,incumbent_tone_products:0,seconds:0}; }

  // Bounded Brent minimization, SciPy-compatible safeguards/tolerance convention.
  // This routine is adapted from SciPy's BSD-3-Clause implementation; see NOTICE.
  function boundedMinimum(fn,lo,hi) {
    const golden=.5*(3-Math.sqrt(5)),sqrtEps=Math.sqrt(2.2e-16),xatol=1e-8;
    let a=lo,b=hi,xf=a+golden*(b-a),nfc=xf,fulc=xf,rat=0,e=0,fx=fn(xf),fnfc=fx,ffulc=fx,count=1;
    let xm=.5*(a+b),tol1=sqrtEps*Math.abs(xf)+xatol/3,tol2=2*tol1;
    while(Math.abs(xf-xm)>tol2-.5*(b-a)) {
      let useGolden=true;
      if(Math.abs(e)>tol1) {
        let r=(xf-nfc)*(fx-ffulc),q=(xf-fulc)*(fx-fnfc),p=(xf-fulc)*q-(xf-nfc)*r;q=2*(q-r);if(q>0)p=-p;q=Math.abs(q);r=e;e=rat;
        if(Math.abs(p)<Math.abs(.5*q*r)&&p>q*(a-xf)&&p<q*(b-xf)){rat=p/q;const x=xf+rat;if(x-a<tol2||b-x<tol2)rat=tol1*(Math.sign(xm-xf)||1);useGolden=false;}
      }
      if(useGolden){e=xf>=xm?a-xf:b-xf;rat=golden*e;}
      const x=xf+(Math.sign(rat)||1)*Math.max(Math.abs(rat),tol1),fu=fn(x);count++;
      if(fu<=fx){if(x>=xf)a=xf;else b=xf;fulc=nfc;ffulc=fnfc;nfc=xf;fnfc=fx;xf=x;fx=fu;}
      else {if(x<xf)a=x;else b=x;if(fu<=fnfc||nfc===xf){fulc=nfc;ffulc=fnfc;nfc=x;fnfc=fu;}else if(fu<=ffulc||fulc===xf||fulc===nfc){fulc=x;ffulc=fu;}}
      xm=.5*(a+b);tol1=sqrtEps*Math.abs(xf)+xatol/3;tol2=2*tol1;if(count>=80)break;
    }
    return {x:xf,fun:fx};
  }
  function delaySearch(hidden,frequencies,grid,budget) {
    function projection(ns) {
      let re=0,im=0;for(let p=0;p<frequencies.length;p++){const a=(-TAU*(ns*1e-9))*frequencies[p],sr=Math.cos(a),si=Math.sin(a);re+=sr*hidden.real[p]+si*hidden.imag[p];im+=sr*hidden.imag[p]-si*hidden.real[p];}
      return {re,im,score:(re*re+im*im)/frequencies.length};
    }
    let index=0,best=-Infinity;
    for(let i=0;i<grid.length;i++){const score=projection(grid[i]).score;if(score>best){index=i;best=score;}}
    budget.delay_candidates+=grid.length;budget.delay_tone_products+=grid.length*frequencies.length;
    let ns=grid[index];const lo=grid[Math.max(0,index-1)],hi=grid[Math.min(grid.length-1,index+1)];
    if(hi>lo){const refined=boundedMinimum(x=>{budget.delay_candidates++;budget.delay_tone_products+=frequencies.length;return -projection(x).score;},lo,hi);if(-refined.fun>=best)ns=refined.x;}
    const p=projection(ns),gains={real:new Float64Array([p.re/frequencies.length]),imag:new Float64Array([p.im/frequencies.length])},delay=ns*1e-9;
    const prediction=gainPrediction(steering([delay],frequencies),gains);
    return {delay,gains,prediction,sse:residualSSE(hidden,prediction)};
  }

  // One-sided complex Jacobi SVD: B=A*V, then A^+Y=V*diag(1/sigma^2)*B^H*Y.
  // Works on design columns directly, avoiding squared conditioning of A^H A.
  function jointGains(design,observations) {
    const A=asMatrix(design),Y=asMatrix(observations),P=A.rows,L=A.cols;
    assert(Y.cols===P,'Joint LS observation/design shapes differ');
    const B=clone(A),V=matrix(L,L);for(let j=0;j<L;j++)V.real[j*L+j]=1;
    function rotate(M,p,q,c,s,pr,pi) {
      for(let i=0;i<M.rows;i++) {
        const ip=i*L+p,iq=i*L+q,ar=M.real[ip],ai=M.imag[ip],br=M.real[iq],bi=M.imag[iq];
        // p'=c*p-s*conj(phase)*q; q'=s*phase*p+c*q
        M.real[ip]=c*ar-s*(pr*br+pi*bi);M.imag[ip]=c*ai-s*(pr*bi-pi*br);
        M.real[iq]=s*(pr*ar-pi*ai)+c*br;M.imag[iq]=s*(pr*ai+pi*ar)+c*bi;
      }
    }
    let finished=false,sweeps=0;
    for(;sweeps<Math.max(30,12*L);sweeps++) {
      let changed=false;
      for(let p=0;p<L;p++)for(let q=p+1;q<L;q++){
        let a=0,b=0,gr=0,gi=0;
        for(let i=0;i<P;i++){const ip=i*L+p,iq=i*L+q,ar=B.real[ip],ai=B.imag[ip],br=B.real[iq],bi=B.imag[iq];a+=ar*ar+ai*ai;b+=br*br+bi*bi;gr+=ar*br+ai*bi;gi+=ar*bi-ai*br;}
        const mag=norm(gr,gi);if(mag<=4*Number.EPSILON*Math.sqrt(a*b)||mag===0)continue;
        const tau=(b-a)/(2*mag),t=(Math.sign(tau)||1)/(Math.abs(tau)+Math.sqrt(1+tau*tau)),c=1/Math.sqrt(1+t*t),s=c*t;
        rotate(B,p,q,c,s,gr/mag,gi/mag);rotate(V,p,q,c,s,gr/mag,gi/mag);changed=true;
      }
      if(!changed){finished=true;break;}
    }
    assert(finished,'Joint gain Jacobi SVD failed to converge');
    const sigma2=new Float64Array(L);for(let j=0;j<L;j++)for(let p=0;p<P;p++)sigma2[j]+=B.real[p*L+j]**2+B.imag[p*L+j]**2;
    const maxSigma=Math.sqrt(Math.max(...sigma2)),tol=Number.EPSILON*Math.max(P,L)*maxSigma,rank=Array.from(sigma2).filter(x=>Math.sqrt(x)>tol).length;
    const gains=matrix(Y.rows,L);
    for(let q=0;q<Y.rows;q++)for(let j=0;j<L;j++){
      if(Math.sqrt(sigma2[j])<=tol)continue;let zr=0,zi=0;
      for(let p=0;p<P;p++){const ib=p*L+j,iy=q*P+p;zr+=B.real[ib]*Y.real[iy]+B.imag[ib]*Y.imag[iy];zi+=B.real[ib]*Y.imag[iy]-B.imag[ib]*Y.real[iy];}
      zr/=sigma2[j];zi/=sigma2[j];
      for(let l=0;l<L;l++){const iv=l*L+j,ig=q*L+l;gains.real[ig]+=V.real[iv]*zr-V.imag[iv]*zi;gains.imag[ig]+=V.real[iv]*zi+V.imag[iv]*zr;}
    }
    return {gains,rank,singular_values:Array.from(sigma2,x=>Math.sqrt(x)).sort((a,b)=>b-a),relative_cutoff:Number.EPSILON*Math.max(P,L),sweeps};
  }
  function initialize(observations,model,options={}) {
    const start=now(),y=asMatrix(observations),m=prepareModel(model),o=optionsWithDefaults(options),bounds=validateAcquisition(y,m),budget=newBudget();
    const grid=linspace(bounds[0],bounds[1],o.delay_grid),y0=matrix(1,y.cols);
    y0.real.set(y.real.subarray(m.reference_pair*y.cols,(m.reference_pair+1)*y.cols));y0.imag.set(y.imag.subarray(m.reference_pair*y.cols,(m.reference_pair+1)*y.cols));
    let remaining=clone(y0);const components=[],delays=[],refG=[];
    for(let l=0;l<m.path_count;l++){const r=delaySearch(remaining,m.frequencies,grid,budget);delays.push(r.delay);refG.push([r.gains.real[0],r.gains.imag[0]]);components.push({prediction:r.prediction});for(let i=0;i<y.cols;i++){remaining.real[i]-=r.prediction.real[i];remaining.imag[i]-=r.prediction.imag[i];}}
    const trace=[energy(remaining)];
    for(let sweep=0;sweep<o.initializer_sweeps;sweep++){
      const before=trace[trace.length-1];
      for(let l=0;l<m.path_count;l++){
        const h=clone(y0);for(let k=0;k<m.path_count;k++)if(k!==l)for(let i=0;i<y.cols;i++){h.real[i]-=components[k].prediction.real[i];h.imag[i]-=components[k].prediction.imag[i];}
        const r=delaySearch(h,m.frequencies,grid,budget),old=residualSSE(h,components[l].prediction);
        if(r.sse<=old+1e-13*Math.max(1,old)){delays[l]=r.delay;refG[l]=[r.gains.real[0],r.gains.imag[0]];components[l].prediction=r.prediction;}
      }
      trace.push(residualSSE(y0,sumPredictions(components)));if(before-trace[trace.length-1]<=1e-10*Math.max(before,1e-12))break;
    }
    const order=delays.map((_,i)=>i).sort((a,b)=>delays[a]-delays[b]),sorted=order.map(i=>delays[i]),s=steering(sorted,m.frequencies),design=matrix(y.cols,m.path_count);
    for(let p=0;p<y.cols;p++)for(let l=0;l<m.path_count;l++){design.real[p*m.path_count+l]=s.real[l*y.cols+p];design.imag[p*m.path_count+l]=s.imag[l*y.cols+p];}
    const ls=jointGains(design,y),states=sorted.map((delay,l)=>{
      const d=new Float64Array(y.rows).fill(delay),g={real:new Float64Array(y.rows),imag:new Float64Array(y.rows)};
      for(let q=0;q<y.rows;q++){g.real[q]=ls.gains.real[q*m.path_count+l];g.imag[q]=ls.gains.imag[q*m.path_count+l];}
      return {kind:'unlocalized',reference_delay:delay,delays:d,gains:g,prediction:gainPrediction(steering(d,m.frequencies),g),point:null,normal:null,bounce_points:null,theta:null};
    });
    budget.seconds=now()-start;
    const result={algorithm_version:VERSION,observation_sha256:observationHash(y),model_sha256:modelHash(m),states,delay_trace_sse:trace,reference_delays_ns:sorted.map(x=>x*1e9),reference_gains:order.map(i=>refG[i]),search_delay_bounds_ns:bounds,budget,gain_design:{rank:ls.rank,singular_values:ls.singular_values,relative_cutoff:ls.relative_cutoff}};
    initialRecords.set(result,clone(result));return result;
  }
  function bestCandidate(hidden,referenceDelay,kind,m,o,budget) {
    let delta=TAU/o.angle_grid,angles=Array.from({length:o.angle_grid},(_,i)=>i*delta),best=null,bestSSE=Infinity;
    for(let stage=0;stage<=o.refinement_rounds;stage++){
      const geo=candidateRaw(referenceDelay,angles,kind,m);budget[kind+'_candidates']+=geo.length;budget[kind+'_tone_products']+=geo.length*hidden.rows*hidden.cols;
      let winner=null,winnerProfile=null,score=-Infinity;
      for(const candidate of geo){const p=profileRaw(hidden,candidate.delays,m.frequencies);if(p.score>score){score=p.score;winner=candidate;winnerProfile=p;}}
      if(winner){const prediction=gainPrediction(winnerProfile.steering,winnerProfile.gains),sse=residualSSE(hidden,prediction);if(sse<bestSSE){bestSSE=sse;best={kind,reference_delay:referenceDelay,...winner,gains:winnerProfile.gains,prediction};}}
      if(best===null||stage===o.refinement_rounds)break;
      angles=linspace(-delta,delta,o.refinement_points).map(x=>best.theta+x);delta*=2/(o.refinement_points-1);
    }
    return {state:best,sse:bestSSE};
  }
  // Observer-only compact copies. Never pass mutable optimizer state to callbacks.
  function compactState(state) {
    const out={};for(const key of ['kind','reference_delay','point','normal','bounce_points','theta','delays','gains'])out[key]=clone(state[key]);return out;
  }
  function sameValues(a,b) {
    if(a===b)return true;
    if(a===null||b===null||a===undefined||b===undefined)return false;
    if((Array.isArray(a)||ArrayBuffer.isView(a))&&(Array.isArray(b)||ArrayBuffer.isView(b)))return a.length===b.length&&Array.from(a).every((v,i)=>sameValues(v,b[i]));
    return false;
  }
  function sameGeometry(a,b) { return ['kind','reference_delay','point','normal','bounce_points','theta','delays'].every(k=>sameValues(a[k],b[k])); }
  function countSnapshot(budget) { const copy={};for(const key of Object.keys(budget))if(key!=='seconds')copy[key]=budget[key];return copy; }
  function fit(observations,model,mode,options={},initial=null) {
    const y=asMatrix(observations),m=prepareModel(model),o=optionsWithDefaults(options);validateAcquisition(y,m);
    assert(mode==='scattering'||mode==='hybrid','mode must be scattering or hybrid');
    if(initial===null)initial=initialize(y,m,o);
    const record=initialRecords.get(initial);assert(record,'Initialization must be returned by initialize in this runtime');
    const oh=observationHash(y);assert(record.observation_sha256===oh,'Initialization belongs to different observations');assert(record.model_sha256===modelHash(m),'Initialization belongs to different model priors');
    const start=now(),states=clone(record.states),budget=newBudget();let total=sumPredictions(states),stationary=0,converged=false;
    const trace=[{sweep:0,path:null,sse:residualSSE(y,total),accepted:false,kind:'initial'}];
    const history=o.record_history?{schema_version:HISTORY_SCHEMA_VERSION,initial:{trace_index:0,states:states.map(compactState),cumulative_budget:countSnapshot(budget),elapsed_seconds:now()-start},updates:[]}:null;
    const lastStateTrace=history?states.map(()=>0):null;
    for(let sweep=1;sweep<=o.max_sweeps;sweep++){
      const before=trace[trace.length-1].sse;
      for(let l=0;l<states.length;l++){
        const old=states[l],hidden=hiddenData(y,total,old.prediction),profile=profileRaw(hidden,old.delays,m.frequencies),prediction=gainPrediction(profile.steering,profile.gains);
        budget.incumbent_tone_products+=y.rows*y.cols;
        let chosen={...clone(old),gains:profile.gains,prediction},chosenSSE=residualSSE(hidden,prediction);
        const incumbentSSE=chosenSSE;let source='incumbent';
        const sc=bestCandidate(hidden,old.reference_delay,'scattering',m,o,budget);
        if(sc.state&&sc.sse<chosenSSE){chosen=sc.state;chosenSSE=sc.sse;source='scattering';}
        let reflectionSSE=null;
        if(mode==='hybrid'){const rf=bestCandidate(hidden,old.reference_delay,'reflection',m,o,budget);reflectionSSE=rf.state?rf.sse:null;if(rf.state&&rf.sse<sc.sse&&rf.sse<chosenSSE){chosen=rf.state;chosenSSE=rf.sse;source='reflection';}}
        const candidateTotal=matrix(y.rows,y.cols);for(let i=0;i<y.real.length;i++){candidateTotal.real[i]=total.real[i]-old.prediction.real[i]+chosen.prediction.real[i];candidateTotal.imag[i]=total.imag[i]-old.prediction.imag[i]+chosen.prediction.imag[i];}
        let sse=residualSSE(y,candidateTotal);const previous=trace[trace.length-1].sse,accepted=sse<=previous+1e-12*Math.max(previous,1);
        if(accepted){states[l]=chosen;total=candidateTotal;}else sse=previous;
        trace.push({sweep,path:l,sse,accepted,kind:states[l].kind,scattering_subproblem_sse:sc.state?sc.sse:null,reflection_subproblem_sse:reflectionSSE,scattering_search_status:sc.state?'available':'no valid candidate',reflection_search_status:mode==='scattering'?'not searched':reflectionSSE===null?'no valid candidate':'available'});
        if(history){const index=trace.length-1;history.updates.push({trace_index:index,sweep,path:l,accepted,chosen_source:accepted?source:'rejected',geometry_changed:accepted&&!sameGeometry(old,states[l]),incumbent_subproblem_sse:incumbentSSE,state:accepted?compactState(states[l]):null,unchanged_from_trace_index:accepted?null:lastStateTrace[l],cumulative_budget:countSnapshot(budget),elapsed_seconds:now()-start});if(accepted)lastStateTrace[l]=index;}
      }
      const improvement=(before-trace[trace.length-1].sse)/Math.max(before,1e-30);stationary=improvement<o.relative_tolerance?stationary+1:0;
      if(stationary>=o.stationary_sweeps){converged=true;break;}
    }
    budget.seconds=now()-start;
    const result={algorithm_version:VERSION,mode,states,trace,converged,stopping_reason:converged?'relative objective tolerance':'sweep budget reached',budget,initialization:clone(record),observation_sha256:oh,prediction:sumPredictions(states)};
    if(history)result.history=history;return result;
  }
  function predict(states,frequencies) { return sumPredictions(states.map(s=>({prediction:gainPrediction(steering(s.delays,frequencies),s.gains)}))); }
  function visibilityPowerThreshold(noiseVariance,tones,falseAlarmHeuristic=.01) { assert(finite(noiseVariance)&&noiseVariance>=0&&Number.isInteger(tones)&&tones>=1&&finite(falseAlarmHeuristic)&&falseAlarmHeuristic>0&&falseAlarmHeuristic<1,'Invalid visibility threshold arguments');return -Math.log(falseAlarmHeuristic)*noiseVariance/tones; }

  // SHA-256 on explicit bytes, so observation digest matches Python little-endian complex128.
  function sha256(bytes) {
    const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],len=bytes.length,padded=new Uint8Array(Math.ceil((len+9)/64)*64);padded.set(bytes);padded[len]=0x80;
    const view=new DataView(padded.buffer);view.setUint32(padded.length-8,Math.floor(len/0x20000000),false);view.setUint32(padded.length-4,(len*8)>>>0,false);
    const w=new Uint32Array(64),rotr=(x,n)=>(x>>>n)|(x<<(32-n));
    for(let at=0;at<padded.length;at+=64){for(let i=0;i<16;i++)w[i]=view.getUint32(at+4*i,false);for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2],s0=rotr(a,7)^rotr(a,18)^(a>>>3),s1=rotr(b,17)^rotr(b,19)^(b>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;}
      let [a,b,c,d,e,f,g,hh]=h;for(let i=0;i<64;i++){const s1=rotr(e,6)^rotr(e,11)^rotr(e,25),ch=(e&f)^(~e&g),t1=(hh+s1+ch+K[i]+w[i])>>>0,s0=rotr(a,2)^rotr(a,13)^rotr(a,22),maj=(a&b)^(a&c)^(b&c),t2=(s0+maj)>>>0;hh=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
      [a,b,c,d,e,f,g,hh].forEach((v,i)=>h[i]=(h[i]+v)>>>0);
    }
    return h.map(x=>x.toString(16).padStart(8,'0')).join('');
  }
  function observationHash(observations) { const y=asMatrix(observations),bytes=new Uint8Array(y.real.length*16),v=new DataView(bytes.buffer);for(let i=0;i<y.real.length;i++){v.setFloat64(i*16,y.real[i],true);v.setFloat64(i*16+8,y.imag[i],true);}return sha256(bytes); }
  function modelHash(model) { const m=prepareModel(model),text=JSON.stringify(MODEL_KEYS.map(k=>m[k]));return sha256(Uint8Array.from(text,c=>c.charCodeAt(0))); }
  function fromFixture(fixture) { strictKeys(fixture,['purpose','array_layout','observations_real','observations_imag','model','options','observation_sha256_complex128_little_endian'],'input fixture');return {observations:asMatrix({real:fixture.observations_real,imag:fixture.observations_imag}),model:prepareModel(fixture.model),options:optionsWithDefaults(fixture.options)}; }
  function serializable(value) { if(typeof value==='number')assert(Number.isFinite(value),'Cannot serialize unexpected nonfinite computed metric');if(ArrayBuffer.isView(value))return Array.from(value,serializable);if(Array.isArray(value))return value.map(serializable);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,serializable(v)]));return value; }
  return Object.freeze({VERSION,HISTORY_SCHEMA_VERSION,REGION_TOLERANCE_M,C,DEFAULT_OPTIONS,initialize,fit,steering,ellipsePoints,candidateGeometry,profileGeometry,jointGains,delayAliasPeriodNs,visibilityPowerThreshold,observationHash,modelHash,fromFixture,asMatrix,residualSSE,hiddenData,predict,serializable});
}));
