'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../estimator-core.js');
const families=['gaussian','bpsk'];
const near=(actual,expected,tolerance=2e-12)=>assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} differs from ${expected} (relative/absolute tolerance ${tolerance})`);
const sum=xs=>xs.reduce((a,b)=>a+b,0);

test('hand-computed observation/LS fixtures include errors both below and above CRB',()=>{
  assert.equal(C.estimate.length,2,'estimator only receives x and y');
  const x=[1,-1,1],n=[1,0,-1];
  assert.deepEqual(C.observation(x,n),[2,-1,0]);
  const r=C.trial(x,n);
  assert.equal(r.energy,3);assert.equal(r.thetaHat,1);assert.equal(r.error,0);assert.equal(r.squaredError,0);assert.equal(r.crb,1/3);
  const s=C.trial(x,x);
  assert.equal(s.thetaHat,2);assert.equal(s.squaredError,1);assert.ok(s.squaredError>s.crb);
  const q=C.trial([1,2,-1],[2,-1,3]);
  assert.equal(q.energy,6);assert.equal(q.thetaHat,.5);assert.equal(q.crb,1/6);assert.equal(q.score,-3);assert.equal(q.squaredError,.25);
});

test('noise-free recovery, score identity, normal-equation orthogonality and input scaling',()=>{
  for(const theta of [-3,0,1,.125,7.75])for(const x of [[1,2,-1],[.125,-2.25,3.5,1],[-4]]){
    near(C.estimate(x,C.observation(x,x.map(()=>0),theta)),theta);
    const n=x.map((_,i)=>(i-1.25)/3),r=C.trial(x,n,theta);
    near(r.score,r.energy*r.error);near(r.residualDot,0,1e-11);
    for(const scale of [-3,.25,2,8]){
      const scaled=C.trial(x.map(v=>v*scale),n,theta);
      near(scaled.crb,r.crb/(scale*scale));near(scaled.error,r.error/scale);
      near(scaled.standardizedSquared,r.standardizedSquared);
    }
  }
});

test('analytic expectations distinguish conditional, unconditional and squared-error variance',()=>{
  const b=C.analytic(8,'bpsk'),g=C.analytic(8,'gaussian');
  assert.deepEqual(b,{mse:1/8,squaredErrorVariance:1/32,crbVariance:0});
  near(g.mse,1/6);near(g.squaredErrorVariance,7/72);near(g.crbVariance,1/72);
  for(const T of C.LENGTHS){
    near(C.analytic(T,'bpsk').mse,1/T);near(C.analytic(T,'gaussian').mse,1/(T-2));
    for(const family of families)assert.deepEqual(C.analytic(T,family,4),{mse:.25,squaredErrorVariance:.125,crbVariance:0});
  }
  for(const T of [3,4]){
    assert.equal(C.analytic(T,'gaussian').squaredErrorVariance,Infinity);
    assert.equal(C.analytic(T,'gaussian').crbVariance,Infinity);
    assert.ok(Number.isFinite(C.analytic(T,'gaussian',3).squaredErrorVariance));
  }
});

test('invalid controls, vectors, zero energy and numerical overflow fail visibly',()=>{
  for(const seed of [-1,4294967296,1.5,NaN,Infinity,'',null,'2026']){
    assert.throws(()=>C.seedValue(seed),RangeError);
    assert.throws(()=>C.experiment({seed}),RangeError);
  }
  for(const settings of [{mode:'unknown'},{T:2},{T:5},{T:8.5},{T:Infinity},{B:0},{B:101},{B:10001},{B:NaN}])assert.throws(()=>C.experiment(settings),RangeError);
  for(const args of [[[],[]],[[1],[]],[[1],[1,2]],[[0],[1]],[[NaN],[1]],[[1],[Infinity]],[[1e308],[1]],[[1e-200],[1]],[[1e-160],[0]]])assert.throws(()=>C.trial(...args),RangeError);
  assert.throws(()=>C.estimate([1e154],[1e308]),RangeError);
  assert.throws(()=>C.observation([1e308],[1e308],2),RangeError);
  assert.throws(()=>C.observation([1],[0],NaN),RangeError);
  for(const E of [0,-1,NaN,Infinity])assert.throws(()=>C.analytic(8,'gaussian',E),RangeError);
  assert.throws(()=>C.analytic(2,'gaussian'),RangeError);assert.throws(()=>C.analytic(8,'other'),RangeError);
  for(const domain of ['',null,17])assert.throws(()=>C.randomStream(1,domain),RangeError);
  assert.equal(C.seedValue(0),0);assert.equal(C.seedValue(4294967295),4294967295);
});

test('versioned PRNG golden uniform vector and open-interval/log-safe draws',()=>{
  assert.equal(C.VERSION,'xoshiro128ss-splitmix32-boxmuller-v1');
  const r=C.randomStream(2026,'fresh/gaussian/input');
  assert.deepEqual(Array.from({length:8},()=>r.uniform()),[.980916676693596,.3745626580202952,.9426438502268866,.08820367965381593,.726851542131044,.9782821723492816,.776158012333326,.4260677049169317]);
  for(const seed of [0,1,2026,4294967295]){
    const rng=C.randomStream(seed,'uniform-boundary-test');
    for(let i=0;i<10000;i++){const u=rng.uniform();assert.ok(u>0&&u<1);assert.ok(Number.isFinite(rng.normal()));}
  }
});

test('same-seed reruns and B=100 → 1000 → 10000 preserve exact trial and running prefixes',()=>{
  for(const mode of ['fixed','fresh'])for(const T of [3,8,64]){
    const opts={mode,T,seed:4294967295},small=C.experiment({...opts,B:100}),medium=C.experiment({...opts,B:1000}),large=C.experiment({...opts,B:10000});
    assert.deepEqual(small,C.experiment({...opts,B:100}));
    for(const family of families){
      assert.deepEqual(small[family].rows,medium[family].rows.slice(0,100));
      assert.deepEqual(medium[family].rows,large[family].rows.slice(0,1000));
      assert.deepEqual(small[family].running,medium[family].running.slice(0,100));
      assert.deepEqual(medium[family].running,large[family].running.slice(0,1000));
    }
  }
  assert.notDeepEqual(C.experiment({B:100,seed:1}).gaussian.rows,C.experiment({B:100,seed:2}).gaussian.rows);
});

test('input and noise domains are separate, traversal-independent and match literal x,n,y observations',()=>{
  for(const mode of ['fixed','fresh']){
    const seed=123,T=8,run=C.experiment({mode,T,seed,B:100});
    const sequences=[];
    for(const family of families){
      const input=C.randomStream(seed,`${mode}/${family}/input`),noise=C.randomStream(seed,`${mode}/${family}/noise`);
      const xdraw=()=>Array.from({length:T},()=>family==='gaussian'?input.normal():(input.uniform()<.5?-1:1));
      const fixed=mode==='fixed'?xdraw():null;
      for(const row of run[family].rows.slice(0,16)){
        const x=fixed||xdraw(),n=Array.from({length:T},()=>noise.normal());
        assert.deepEqual(row.x,x);assert.deepEqual(row.n,n);assert.deepEqual(row.y,x.map((v,i)=>v+n[i]));
        near(row.thetaHat,sum(x.map((v,i)=>v*row.y[i]))/sum(x.map(v=>v*v)));
      }
      for(const type of ['input','noise'])sequences.push(Array.from({length:12},C.randomStream(seed,`${mode}/${family}/${type}`).uniform));
    }
    for(let i=0;i<sequences.length;i++)for(let j=0;j<i;j++)assert.notDeepEqual(sequences[i],sequences[j]);
    const clean=C.randomStream(seed,`${mode}/bpsk/noise`),isolated=C.randomStream(seed,`${mode}/bpsk/noise`),other=C.randomStream(seed,`${mode}/gaussian/input`);
    for(let i=0;i<100;i++){for(let j=0;j<i;j++)other.normal();assert.equal(isolated.normal(),clean.normal());}
  }
});

test('all trials, including extremes, determine summaries, exact endpoint data and unclipped axes',()=>{
  for(const mode of ['fixed','fresh'])for(const T of C.LENGTHS){
    const result=C.experiment({mode,T,B:1000,seed:2026});
    assert.equal(result.theta,1);assert.equal(result.noiseVariance,1);assert.equal(result.version,C.VERSION);
    for(const family of families){
      const out=result[family],rows=out.rows,s=out.summary;
      assert.equal(rows.length,1000);assert.equal(out.running.length,1000);assert.equal(s.trials,1000);
      let totalSquared=0,totalCrb=0;
      rows.forEach((r,i)=>{
        assert.equal(r.b,i+1);assert.ok(r.energy>0);
        for(const key of ['energy','thetaHat','error','squaredError','crb','score','residualDot','standardizedSquared'])assert.ok(Number.isFinite(r[key]),`${mode}/${T}/${family}/${key}`);
        near(r.crb,1/r.energy);near(r.squaredError,r.error*r.error);near(r.standardizedSquared,r.energy*r.squaredError);near(r.score,r.energy*r.error,1e-10);near(r.residualDot,0,1e-10);
        if(family==='bpsk')assert.equal(r.energy,T);
        if(mode==='fixed'){assert.equal(r.energy,rows[0].energy);assert.equal(r.crb,rows[0].crb);if(i<16)assert.deepEqual(r.x,rows[0].x);}
        totalSquared+=r.squaredError;totalCrb+=r.crb;
        assert.deepEqual(out.running[i],{b:i+1,mse:totalSquared/(i+1),meanCrb:totalCrb/(i+1)});
      });
      assert.equal(s.mse,totalSquared/1000);assert.equal(s.meanCrb,totalCrb/1000);
      assert.equal(s.bias,sum(rows.map(r=>r.error))/1000);assert.equal(s.meanEnergy,sum(rows.map(r=>r.energy))/1000);
      assert.equal(s.meanStandardizedSquared,sum(rows.map(r=>r.standardizedSquared))/1000);
      assert.equal(s.minEnergy,Math.min(...rows.map(r=>r.energy)));assert.equal(s.maxSquaredError,Math.max(...rows.map(r=>r.squaredError)));
      assert.equal(s.analyticMse,out.reference.mse);assert.equal(out.running.at(-1).mse,s.mse);assert.equal(out.running.at(-1).meanCrb,s.meanCrb);
      assert.equal(out.axisMax,1.08*Math.max(out.reference.mse,...out.running.flatMap(p=>[p.mse,p.meanCrb])));
      assert.ok(out.checkpoints.length<=160);assert.deepEqual(out.checkpoints[0],out.running[0]);assert.deepEqual(out.checkpoints.at(-1),out.running.at(-1));
      assert.equal(new Set(out.checkpoints.map(p=>p.b)).size,out.checkpoints.length);
      for(let i=1;i<out.checkpoints.length;i++)assert.ok(out.checkpoints[i].b>out.checkpoints[i-1].b);
      for(const p of out.checkpoints)assert.deepEqual(p,out.running[p.b-1]);
      for(const key of ['mse','meanCrb']){
        assert.equal(Math.min(...out.checkpoints.map(p=>p[key])),Math.min(...out.running.map(p=>p[key])));
        assert.equal(Math.max(...out.checkpoints.map(p=>p[key])),Math.max(...out.running.map(p=>p[key])));
      }
      assert.equal(rows.filter(r=>Object.hasOwn(r,'x')).length,16);
    }
    if(mode==='fresh')assert.ok(new Set(result.gaussian.rows.map(r=>r.energy)).size>990,'Gaussian blocks must not be normalized');
  }
});

test('checkpoint thinning retains deliberately off-grid extrema and never changes original data',()=>{
  const points=Array.from({length:10000},(_,i)=>({b:i+1,mse:1,meanCrb:2}));
  points[2345].mse=999;points[3456].mse=.001;points[4567].meanCrb=888;points[5678].meanCrb=.002;
  const before=JSON.stringify(points),chosen=C.checkpoints(points);
  assert.ok(chosen.length<=160);for(const i of [0,2345,3456,4567,5678,9999])assert.ok(chosen.includes(points[i]));assert.equal(JSON.stringify(points),before);
});

// Predetermined seed bank and loose, predeclared diagnostic tolerances. These
// sampling checks are regression alarms, not proofs or guaranteed confidence
// intervals. No raw-MSE convergence assertion is made for Gaussian T=3 or 4.
const diagnosticSeeds=[0,1,2026,314159,4294967295];
test('fixed seed-bank standardized errors follow N(0,1), including fresh T=3,4',()=>{
  for(const mode of ['fixed','fresh'])for(const T of [3,4,8,16,32]){
    const aggregate=Object.fromEntries(families.map(f=>[f,{n:0,u:0,u2:0,within1:0,within196:0,mse:0,reference:0}]));
    for(const seed of diagnosticSeeds){
      const run=C.experiment({mode,T,B:10000,seed});
      for(const family of families){
        const a=aggregate[family];
        for(const row of run[family].rows){const u=Math.sqrt(row.energy)*row.error;a.n++;a.u+=u;a.u2+=u*u;a.within1+=Math.abs(u)<1;a.within196+=Math.abs(u)<1.96;a.mse+=row.squaredError;}
        a.reference+=run[family].reference.mse/diagnosticSeeds.length;
      }
    }
    for(const family of families){
      const a=aggregate[family],label=`${mode}/${T}/${family}`,mean=a.u/a.n,variance=a.u2/a.n-mean*mean;
      assert.ok(Math.abs(mean)<.03,`${label}: standardized mean ${mean}`);
      assert.ok(Math.abs(variance-1)<.045,`${label}: standardized variance ${variance}`);
      assert.ok(Math.abs(a.within1/a.n-.682689492137)<.015,`${label}: normal central mass at 1`);
      assert.ok(Math.abs(a.within196/a.n-.950004209704)<.008,`${label}: normal central mass at 1.96`);
      if(mode==='fresh'&&(family==='bpsk'||T>4)){
        const se=Math.sqrt(C.analytic(T,family).squaredErrorVariance/a.n);
        assert.ok(Math.abs(a.mse/a.n-a.reference)<7*se,`${label}: aggregate MSE exceeds predeclared seven-SE tolerance`);
      }
    }
  }
});
