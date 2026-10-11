'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../distributed-detection-core.js');
const F=require('../scripts/distributed-detection-reference/fixtures.json');
const O=require('../scripts/distributed-detection-independent/high-precision-fixtures.json');
const near=(a,b,tol=3e-13)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} vs ${b}`);
const relative=(a,b,tol=3e-13)=>assert.ok(a===b||Math.abs(a-b)<=tol*Math.max(Number.MIN_VALUE,Math.abs(b)),`${a} vs ${b}, relative error ${Math.abs(a-b)/Math.abs(b)}`);
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],scale=(a,t)=>[a[0]*t,a[1]*t];
const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],conj=a=>[a[0],-a[1]],power=a=>a[0]**2+a[1]**2;
const dot=(a,b)=>a.reduce((total,z,i)=>add(total,mul(conj(z),b[i])),[0,0]);
const rotate=(z,theta)=>mul(z,[Math.cos(theta),Math.sin(theta)]);
const calKeys={jointThreshold:'joint_threshold',energyThreshold:'energy_threshold',jointPd:'joint_pd',energySumPd:'energy_sum_pd',jointMiss:'joint_miss',energySumMiss:'energy_sum_miss',jointTieRandomization:'joint_tie_randomization'};

// This dense complex Cholesky code does not call a core likelihood, matrix,
// matching, covariance, or energy routine. It evaluates the raw Gaussian PDFs.
function denseLogDensity(y,covariance){
  const n=y.length,L=Array.from({length:n},()=>Array.from({length:n},()=>[0,0]));
  for(let i=0;i<n;i++)for(let j=0;j<=i;j++){
    let value=covariance[i][j].slice();for(let k=0;k<j;k++)value=sub(value,mul(L[i][k],conj(L[j][k])));
    if(i===j){near(value[1],0,1e-11);assert.ok(value[0]>0,'positive-definite observation covariance');L[i][j]=[Math.sqrt(value[0]),0];}
    else L[i][j]=scale(value,1/L[j][j][0]);
  }
  const w=[];for(let i=0;i<n;i++){let value=y[i].slice();for(let j=0;j<i;j++)value=sub(value,mul(L[i][j],w[j]));w.push(scale(value,1/L[i][i][0]));}
  return -2*L.reduce((total,row,i)=>total+Math.log(row[i][0]),0)-w.reduce((total,z)=>total+power(z),0);
}
function rawCovariances(s,noisePower,q,kappa){
  const length=s.length,n=2*length,c0=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>[i===j?noisePower:0,0]));
  const c1=c0.map((row,i)=>row.map((v,j)=>add(v,scale(mul(s[i%length],conj(s[j%length])),q*(Math.floor(i/length)===Math.floor(j/length)?1:kappa)))));
  return [c0,c1];
}
function rawDenseLr(y,s,noisePower,model){const E=s.reduce((sum,z)=>sum+power(z),0),[c0,c1]=rawCovariances(s,noisePower,model.rho*noisePower/E,model.kappa),flat=y.flat();return denseLogDensity(flat,c1)-denseLogDensity(flat,c0);}

test('125 binary64 reference calibration snapshots plus ROC: values and stable misses',()=>{
  assert.equal(F.calibration.length,125);
  for(const row of [...F.calibration,...F.roc]){
    const model=new C.Model(row.model.rho,row.model.kappa),c=C.calibratedDetector(model,row.pfa);
    for(const [key,source] of Object.entries(calKeys))relative(c[key],row[source],5e-14);
    if(row.logdet!==undefined){relative(model.logDeterminant,row.logdet);near(c.logLrThreshold,row.log_lr_threshold);model.nullWeights.forEach((x,i)=>relative(x,row.null_weights[i]));}
  }
});

test('336 independent 100-digit oracle cases, with explicit decimal-to-binary endpoint allowance',()=>{
  assert.equal(O.precision_decimal_digits,100);assert.equal(O.cases.length,336);
  for(const row of O.cases){
    const rho=Number(row.rho),kappa=Number(row.kappa),pfa=Number(row.pfa),c=C.calibratedDetector(new C.Model(rho,kappa),pfa);
    // The oracle fixture encodes exact intended decimals. Number('0.999999999999')
    // is different by 2.21e-17, making 1-p differ by 2.21e-5 relatively. This
    // tolerance applies only to this input-rounding effect, never to Pd or to
    // tests below that calibrate at the exact binary64 probability actually used.
    // The analogous conversion at .999999 needs a 4e-11 relative allowance.
    // Tiny 1-kappa has the same subtraction sensitivity for its minor eigenvalue.
    const endpointAllowance=pfa>1-1e-10||(kappa>1-1e-10&&kappa<1)?3e-5:kappa===.99999999?3e-9:pfa>.99999?4e-11:3e-12;
    relative(c.jointThreshold,Number(row.joint_threshold),endpointAllowance);
    relative(c.energyThreshold,Number(row.energy_threshold),pfa>1-1e-10?3e-5:pfa>.99999?4e-11:3e-12);
    near(c.jointPd,Number(row.joint_pd),4e-14);near(c.energySumPd,Number(row.energy_pd),4e-14);
    assert.equal(c.jointTieRandomization>0,row.requires_randomization);
  }
});

test('same local energies, different joint decisions: the deterministic phase counterexample',()=>{
  const model=new C.Model(),cal=C.calibratedDetector(model),plus=[[Math.SQRT2,0],[Math.SQRT2,0]],minus=[[Math.SQRT2,0],[-Math.SQRT2,0]];
  assert.deepEqual(C.localEnergies(plus),C.localEnergies(minus));near(C.quadraticEigen(plus,model),3.36,1e-15);near(C.quadraticEigen(minus,model),12/7,1e-15);
  assert.equal(C.decideJoint(plus,cal),true);assert.equal(C.decideJoint(minus,cal),false);assert.equal(C.decideEnergySum(plus,cal),false);assert.equal(C.decideEnergySum(minus,cal),false);
  for(const row of F.samples){near(C.quadraticEigen(row.z,model),row.quadratic);near(C.quadraticMatrix(row.z,model),row.matrix_quadratic);near(C.logLikelihoodRatio(row.z,model),row.log_lr);row.local_energies.forEach((x,i)=>near(C.localEnergies(row.z)[i],x));}
});

test('kappa=0 is an exact likelihood sufficiency condition for energy sum at every positive rho',()=>{
  const rng=C.createRng(271828);
  for(const rho of [1e-10,1e-6,.1,3,1e4]){
    const model=new C.Model(rho,0),cal=C.calibratedDetector(model),a=rho/(1+rho);relative(cal.jointThreshold/a,cal.energyThreshold);near(cal.jointPd,cal.energySumPd,1e-14);
    for(let i=0;i<200;i++){const z=[C.complexStandardNormal(rng),C.complexStandardNormal(rng)].map(v=>scale(v,3));relative(C.quadraticEigen(z,model),a*C.energySum(z));assert.equal(C.decideJoint(z,cal),C.decideEnergySum(z,cal));}
  }
});

test('kappa=1 has finite covariance, exact runtime nullspace and single-exponential detection law',()=>{
  for(const rho of [1e-10,.1,3,1e4])for(const pfa of [1e-12,.05,.5,1-1e-12]){
    const model=new C.Model(rho,1),cal=C.calibratedDetector(model,pfa);assert.equal(model.signalEigenvalues[1],0);assert.ok(Number.isFinite(model.logDeterminant));
    relative(cal.jointThreshold,-model.nullWeights[0]*Math.log(pfa));relative(cal.jointPd,Math.exp(Math.log(pfa)/(1+2*rho)));
    relative(cal.jointMiss,-Math.expm1(Math.log(pfa)/(1+2*rho)));
    assert.equal(C.quadraticEigen([[2,3],[-2,-3]],model),0);
  }
});

test('rho=0 explicitly requires independent randomized joint decisions',()=>{
  for(const kappa of [0,.75,1]){
    const model=new C.Model(0,kappa),cal=C.calibratedDetector(model,.17),z=[[3,2],[-8,0]];
    assert.equal(C.logLikelihoodRatio(z,model),0);assert.equal(cal.jointPd,.17);assert.equal(cal.energySumPd,.17);assert.equal(cal.jointMiss,.83);
    assert.throws(()=>C.decideJoint(z,cal),/independent uniform/);for(const tieUniform of [null,undefined,NaN,Infinity,-.1,1,'0.1'])assert.throws(()=>C.decideJoint(z,cal,{tieUniform}));
    assert.equal(C.decideJoint(z,cal,{tieUniform:.169}),true);assert.equal(C.decideJoint(z,cal,{tieUniform:.17}),false);
  }
  assert.equal(C.tail(0,0,0),0);assert.equal(C.tail(-1,0,0),1);assert.equal(C.lowerCdf(0,0,0),1);assert.throws(()=>C.tailQuantile(.1,0,0));
});

test('direct exponential/gamma tails, strict atom convention and stable near-zero CDF',()=>{
  for(const u of [1e-10,.3,1,1e4])for(const x of [0,1e-7,.1,1,10,100]){near(C.tail(x*u,u,0),Math.exp(-x),3e-15);near(C.tail(x*u,u,u),Math.exp(-x)*(1+x),3e-15);}
  assert.equal(C.tail(Infinity,1,1),0);assert.equal(C.tail(-Infinity,1,1),1);assert.equal(C.lowerCdf(0,1,1),0);relative(C.lowerCdf(1e-10,1,1),.5e-20,1e-9);
  for(const ratio of [1-Number.EPSILON/2,1-1e-8,1e-12,Number.MIN_VALUE])for(const t of [1e-12,1e-6,.1,1,30]){const p=C.tail(t,1,ratio);assert.ok(p>=0&&p<=1);assert.ok(C.tail(t+.01,1,ratio)<=p);assert.equal(p,C.tail(t,ratio,1));}
  assert.notEqual(C.tail(2,1,1-1e-8),C.tail(2,1,1));
  for(const t of [.1,1,30])relative(C.tail(t,2,.3),(2*Math.exp(-t/2)-.3*Math.exp(-t/.3))/1.7);
});

test('normalized quantiles retain tiny rho and calibrate at actual binary64 Pfa without fixed absolute stopping',()=>{
  for(const rho of [1e-10,1e-6,.1,3,1e4])for(const kappa of [0,1e-12,.1,.75,1-1e-12,1]){
    let previous=-1;const model=new C.Model(rho,kappa);
    for(const pfa of [1e-12,1e-6,.001,.05,.5,.99,1-1e-12]){
      const c=C.calibratedDetector(model,pfa),actual=C.logTail(c.jointThreshold,...model.nullWeights),expected=Math.log(pfa);
      assert.ok(c.jointThreshold>0);relative(actual,expected,3e-14);assert.ok(actual<=expected+8*Number.EPSILON*Math.abs(expected));
      assert.ok(c.jointPd>=0&&c.jointPd<=1);assert.ok(c.energySumPd>=0&&c.energySumPd<=1);assert.ok(c.jointPd+2e-13>=c.energySumPd);assert.ok(c.jointPd+2e-13>=pfa);assert.ok(c.jointPd>=previous);previous=c.jointPd;
    }
  }
});

test('stable high-SNR miss survives Pd rounding to one',()=>{
  const cal=C.calibratedDetector(new C.Model(1e4,0),1-1e-12);
  assert.equal(cal.jointPd,1);assert.ok(cal.jointMiss>0&&cal.jointMiss<1e-18);assert.ok(cal.energySumMiss>0);
  const x=cal.jointThreshold/1e4,independentMiss=x*x/2-x*x*x/3+x**4/8;
  relative(cal.jointMiss,independentMiss,2e-14);relative(cal.energySumMiss,cal.jointMiss,2e-14);
});

test('eigen runtime agrees with independent two-station matrix audit, including near-null absolute roundoff',()=>{
  const rng=C.createRng(314159);
  for(const rho of [1e-10,1e-6,.1,3,1e4])for(const kappa of [0,1e-14,.25,.75,1-Number.EPSILON/2,1])for(let i=0;i<30;i++){
    const model=new C.Model(rho,kappa),z=[C.complexStandardNormal(rng),C.complexStandardNormal(rng)].map(v=>scale(v,2)),a=C.quadraticEigen(z,model),b=C.quadraticMatrix(z,model),scaleBound=model.nullWeights.reduce((x,y)=>x+y)*C.energySum(z);
    assert.ok(a>=0);assert.ok(Math.abs(a-b)<=2e-14*scaleBound);
  }
  near(C.quadraticMatrix([[2,3],[-2,-3]],new C.Model(3,1)),0,5e-15);
});

test('actual raw interface agrees with independent full 2L covariance likelihood',()=>{
  const rng=C.createRng(123456);
  for(const s of [[[1,2]],[[.3,.7],[-.4,.2],[.6,-.1]],C.qpskWaveform(5,2)])for(const kappa of [0,.3,1])for(const rho of [.01,2.3,30]){
    const model=new C.Model(rho,kappa),noisePower=.7,y=Array.from({length:2},()=>s.map(()=>C.complexStandardNormal(rng)));
    near(C.rawLogLikelihoodRatio(y,s,noisePower,model),rawDenseLr(y,s,noisePower,model),2e-12);
  }
});

test('orthogonal raw residuals cancel with known noise; explicit unknown-noise counterexample does not',()=>{
  const s=[[.3,.7],[-.4,.2],[.6,-.1]],E=s.reduce((t,z)=>t+power(z),0),arbitrary=[[.2,-.1],[.3,.8],[-.4,.2]],projection=scale(dot(s,arbitrary),1/E),residual=arbitrary.map((v,i)=>sub(v,mul(projection,s[i]))),rng=C.createRng(9);
  near(power(dot(s,residual)),0,1e-25);
  for(const kappa of [0,.3,1]){const model=new C.Model(2.3,kappa),y=Array.from({length:2},()=>s.map(()=>C.complexStandardNormal(rng))),changed=[y[0].map((v,i)=>add(v,residual[i])),y[1].map((v,i)=>add(v,mul([0,-2],residual[i])))];near(C.rawLogLikelihoodRatio(y,s,.7,model),C.rawLogLikelihoodRatio(changed,s,.7,model));near(rawDenseLr(y,s,.7,model),rawDenseLr(changed,s,.7,model),2e-12);}
  const template=[[1,0],[0,0]],ya=[[[1,0],[0,0]],[[1,0],[0,0]]],yb=[[[1,0],[4,0]],[[1,0],[0,-3]]];assert.deepEqual(C.matchedPair(ya,template),C.matchedPair(yb,template));
  function noiseMixtureLr(y){const terms=[[],[]];for(const sigma2 of [.5,2]){const covariances=rawCovariances(template,sigma2,3,.5);for(let h=0;h<2;h++)terms[h].push(denseLogDensity(y.flat(),covariances[h]));}const logMean=xs=>{const m=Math.max(...xs);return m+Math.log(xs.reduce((sum,x)=>sum+Math.exp(x-m),0))-Math.log(2);};return logMean(terms[1])-logMean(terms[0]);}
  assert.ok(Math.abs(noiseMixtureLr(ya)-noiseMixtureLr(yb))>.1);
});

test('matching conjugates the waveform and uses complex noise power, including cancellation-resistant sums',()=>{
  const s=[[1,2],[3,-4]],y=[[2,-3],[-1,5]],expected=scale(dot(s,y),1/Math.sqrt(30)),actual=C.matchedOutput(y,s);actual.forEach((v,i)=>near(v,expected[i],1e-15));
  C.matchedOutput(y,s,4).forEach((v,i)=>near(v,expected[i]/2,1e-15));
  near(C.matchedOutput([[1e16,0],[1,0],[-1e16,0]],[[1,0],[1,0],[1,0]])[0],1/Math.sqrt(3),1e-15);
});

test('common template phase and correctly transformed receiver covariance preserve likelihood',()=>{
  const s=C.qpskWaveform(4,2),y=[[[1,2],[3,-1],[-2,.2],[0,-.3]],[[2,-1],[.5,.3],[-.1,2],[0,.9]]],model=new C.Model(),z=C.matchedPair(y,s),rotatedTemplate=s.map(w=>rotate(w,.731));
  near(C.logLikelihoodRatio(z,model),C.rawLogLikelihoodRatio(y,rotatedTemplate,1,model));
  const theta1=.25,theta2=-1.03,rotated=[rotate(z[0],theta1),rotate(z[1],theta2)],correct=C.quadraticMatrix(rotated,model,{correlationPhase:theta1-theta2});
  near(correct,C.quadraticMatrix(z,model));assert.ok(Math.abs(correct-C.quadraticMatrix(rotated,model))>.01);
});

test('energy sum is a baseline, not the optimal fusion rule for two energy messages',()=>{
  // Independent phase integral of Lambda, not a runtime detector implementation.
  function logEnergyLikelihood(e1,e2){const rho=3,k=.75,D=(1+rho*(1+k))*(1+rho*(1-k)),diagonal=(rho+rho*rho*(1-k*k))/D,x=2*rho*k*Math.sqrt(e1*e2)/D;let I0=0;const n=8192;for(let i=0;i<n;i++)I0+=Math.exp(x*Math.cos(2*Math.PI*i/n));return -Math.log(D)+diagonal*(e1+e2)+Math.log(I0/n);}
  near(logEnergyLikelihood(2,2),.30755159,1e-8);near(logEnergyLikelihood(4,0),.14494561,1e-8);assert.ok(Math.abs(logEnergyLikelihood(2,2)-logEnergyLikelihood(4,0))>.1);
});

test('simulator is deterministic but never supplies alpha or truth to detector interfaces',()=>{
  const model=new C.Model(),s=C.qpskWaveform(4),a=C.generateObservations(C.createRng(7),model,s,1,{targetPresent:true}),b=C.generateObservations(C.createRng(7),model,s,1,{targetPresent:true});
  assert.deepEqual(a,b);assert.equal(a.length,2);assert.ok(a.every(station=>station.length===4&&station.every(z=>Array.isArray(z)&&z.length===2)));assert.deepEqual(Object.keys(model),['rho','kappa']);assert.match(C.RNG_DESCRIPTION,/not Python/);
  for(const fn of [C.matchedOutput,C.matchedPair,C.rawLogLikelihoodRatio,C.quadraticEigen,C.quadraticMatrix,C.logLikelihoodRatio,C.decideJoint,C.decideEnergySum])assert.doesNotMatch(fn.toString().split('{')[0],/alpha|truth|targetPresent|hypothesis|label/);
  assert.throws(()=>C.quadraticMatrix([[1,0],[1,0]],model,{alpha:[1,1]}));assert.throws(()=>C.decideJoint([[1,0],[1,0]],C.calibratedDetector(model),{truth:true}));
});

test('raw simulation empirically preserves covariance, complex noise normalization and shared-observation decisions',()=>{
  const model=new C.Model(),s=C.qpskWaveform(4),cal=C.calibratedDetector(model),trials=24000,results=[];
  for(const targetPresent of [false,true]){
    const rng=C.createRng(targetPresent?1843287:843287),moments={re:0,im:0,p0:0,p1:0,crossRe:0,crossIm:0,re2:0,im2:0};let joint=0,energy=0;
    for(let i=0;i<trials;i++){
      const y=C.generateObservations(rng,model,s,1,{targetPresent}),z=C.matchedPair(y,s),cross=mul(z[0],conj(z[1]));moments.re+=z[0][0];moments.im+=z[0][1];moments.re2+=z[0][0]**2;moments.im2+=z[0][1]**2;moments.p0+=power(z[0]);moments.p1+=power(z[1]);moments.crossRe+=cross[0];moments.crossIm+=cross[1];joint+=C.decideJoint(z,cal);energy+=C.decideEnergySum(z,cal);
      if(i<20)near(C.rawLogLikelihoodRatio(y,s,1,model),C.logLikelihoodRatio(z,model),0);
    }
    for(const key of Object.keys(moments))moments[key]/=trials;
    const variance=targetPresent?1+model.rho:1,cross=targetPresent?model.rho*model.kappa:0;
    near(moments.p0,variance,.025);near(moments.p1,variance,.025);near(moments.re2,variance/2,.025);near(moments.im2,variance/2,.025);near(moments.crossRe,cross,.07);near(moments.crossIm,0,.07);near(moments.re,0,.04);near(moments.im,0,.04);
    const expectedJoint=targetPresent?cal.jointPd:cal.pfa,expectedEnergy=targetPresent?cal.energySumPd:cal.pfa;
    for(const [count,p] of [[joint,expectedJoint],[energy,expectedEnergy]])assert.ok(Math.abs(count/trials-p)<6*Math.sqrt(p*(1-p)/trials)+1/trials);
    results.push({joint,energy});
  }
  assert.ok(results[1].joint>results[1].energy);
});

test('same rho and normalized waveform energy maintain the same experiment across physical scales',()=>{
  const model=new C.Model(),base=C.matchedPair(C.generateObservations(C.createRng(12),model,C.qpskWaveform(4,1),1,{targetPresent:true}),C.qpskWaveform(4,1),1);
  for(const energy of [1e-8,1,1e8])for(const noisePower of [1e-8,1,1e8]){const s=C.qpskWaveform(4,energy),z=C.matchedPair(C.generateObservations(C.createRng(12),model,s,noisePower,{targetPresent:true}),s,noisePower);for(let r=0;r<2;r++)for(let j=0;j<2;j++)near(z[r][j],base[r][j],2e-14);}
  for(const length of [1,3,10,11,15,16,49,4096])for(const energy of [1e-8,.3,1,1e8]){const s=C.qpskWaveform(length,energy);assert.equal(s.length,length);relative(C.waveformEnergy(s),energy,1e-15);}
});

test('finite-run star-unicast ledger counts exact uplink, template policy and explicit model downlink',()=>{
  const schemeKeys={centralRaw:'central_raw',localComplexMatch:'local_complex_match',localEnergySum:'local_energy_sum'},fieldKeys={upReals:'up_reals',templateDownReals:'template_down_reals',modelDownReals:'model_down_reals',totalReals:'total_reals',averageRealsPerBlock:'average_reals_per_block',payloadBits:'payload_bits'};
  for(const row of F.resource_ledgers){const ledger=C.resourceLedger(row.length,{blocks:row.blocks,templateMode:row.template_mode,bitsPerReal:row.bits_per_real});assert.equal(ledger.templateUpdates,row.template_updates);for(const [key,source] of Object.entries(schemeKeys))for(const [field,sourceField] of Object.entries(fieldKeys))assert.equal(ledger.schemes[key][field],row.schemes[source][sourceField]);}
  const once=C.resourceLedger(16,{blocks:10,templateMode:'once',modelDownRealsPerUpdate:3,modelUpdates:2});assert.equal(once.schemes.localComplexMatch.totalReals,110);assert.equal(once.schemes.localEnergySum.totalReals,90);assert.equal(once.schemes.centralRaw.modelDownReals,0);assert.equal(once.schemes.localComplexMatch.modelDownReals,6);
  const cached=C.resourceLedger(16,{blocks:10,templateMode:'cached'});assert.equal(cached.schemes.localComplexMatch.totalReals,40);assert.equal(cached.schemes.localEnergySum.totalReals,20);assert.equal(cached.schemes.centralRaw.totalReals,640);assert.equal(cached.schemes.centralRaw.payloadBits,null);assert.match(cached.caveat,/zero means omitted, not free/);assert.match(cached.caveat,/quantization is not simulated/);
});

test('Wilson uncertainty is finite and valid at zero/all successes',()=>{
  for(const k of [0,1,50,100]){const [lo,hi]=C.wilsonInterval(k,100);assert.ok(lo>=0&&hi<=1&&lo<=k/100&&hi>=k/100);}const interval=C.wilsonInterval(50,100);near(interval[0],.4038315303659956);near(interval[1],.5961684696340044);
});

test('unsupported and nonfinite values are rejected instead of clipped or coerced',()=>{
  for(const rho of [-1,1e-11,1e5,Infinity,NaN,'3',null,true])assert.throws(()=>new C.Model(rho,.5));for(const k of [-1e-15,1.00000001,NaN,'0'])assert.throws(()=>new C.Model(1,k));
  for(const p of [0,1,1e-13,NaN,null,'0.1'])assert.throws(()=>C.calibratedDetector(new C.Model(),p));for(const params of [[NaN,1,1],[0,-1,1],[1,Infinity,1],['1',1,1]])assert.throws(()=>C.tail(...params));
  for(const z of [[],[[1,0]],[[1],[1,0]],[[1,NaN],[1,0]],[[1e101,0],[0,0]],Array(2),[[1,0],Array(2)]])assert.throws(()=>C.quadraticEigen(z,new C.Model()));
  assert.throws(()=>C.matchedOutput([[1,0]],[[0,0]]));assert.throws(()=>C.matchedOutput([[1,0]],[[1,0]],0));assert.throws(()=>C.matchedOutput([[1,0]],[[1,0],[1,0]]));assert.throws(()=>C.matchedOutput([[1e100,1e100]],[[1,0]]));
  for(const [length,energy] of [[0,1],[1.5,1],[true,1],[4097,1],[1,0],[1,1e9]])assert.throws(()=>C.qpskWaveform(length,energy));
  for(const opts of [null,[],{templateMode:'magic'},{blocks:0},{blocks:true},{bitsPerReal:129},{modelUpdates:-1},{modelDownRealsPerUpdate:.5},{blocks:Number.MAX_SAFE_INTEGER},{unused:0}])assert.throws(()=>C.resourceLedger(16,opts));
  for(const params of [[-1,10],[11,10],[1,0],[1.2,10],[1,10,Infinity]])assert.throws(()=>C.wilsonInterval(...params));
  const s=C.qpskWaveform(2),model=new C.Model(),rng=C.createRng(1);for(const o of [undefined,{},null,{targetPresent:1},{targetPresent:true,alpha:1}])assert.throws(()=>C.generateObservations(rng,model,s,1,o));
});

test('sparse/inherited arrays, forged models, inherited options and mutable calibrations cannot bypass guards',()=>{
  const inherited=Object.create(Array.prototype);inherited[0]=[1,0];inherited[1]=[1,0];const z=Array(2);Object.setPrototypeOf(z,inherited);assert.throws(()=>C.energySum(z));
  const inheritedOptions=Object.create({blocks:10});assert.throws(()=>C.resourceLedger(16,inheritedOptions));
  const forged=Object.freeze(Object.assign(Object.create(C.Model.prototype),{rho:NaN,kappa:1}));assert.throws(()=>C.quadraticEigen([[1,0],[1,0]],forged));
  const model=new C.Model(),cal=C.calibratedDetector(model);assert.throws(()=>{model.rho=0;});assert.throws(()=>{cal.jointThreshold=0;});assert.throws(()=>C.decideJoint([[1,0],[1,0]],{...cal}));
});
