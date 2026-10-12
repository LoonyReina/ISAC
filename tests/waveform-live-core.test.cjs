'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const Core=require('../procrustes-core.js'),M=require('../waveform-live-model.js'),Matrix=require('../waveform-core.js');
const fixtures=require('../scripts/validation/waveform-design/waveform-live-fixtures.json').fixtures;
const base={N:4,K:2,L:8,seed:171105220,Pt:1,beta:.8,angle:0};
const close=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);

test('live core is byte-identical to the independently reviewed implementation',()=>{
 const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../procrustes-core.js'))).digest('hex');assert.equal(hash,M.CORE_SHA256);assert.equal(hash,'a844089a501bec61002fe8562f54314c04bc4f27b622033c3995052770b050c6');
});
test('all19 Python fixtures are independently checked through actual JavaScript outputs',()=>{
 for(const f of fixtures){const {H,S,R}=f.input,out=Core.solve(H,S,R),expected=f.expected,actual=Matrix.evaluate(H,S,R,out.X,expected.globalObjectiveBound);
  assert.equal(out.status,'certified');assert.ok(actual.covarianceResidual/Math.sqrt(Matrix.norm2(R))<2e-10,f.id);
  assert.ok(Math.abs(actual.error-expected.metrics.objective)<=expected.diagnostics.objectiveCertificateTolerance,f.id);
  assert.ok(Math.abs(out.globalObjectiveBound-expected.globalObjectiveBound)<=expected.diagnostics.objectiveCertificateTolerance,f.id);
 }
});
test('seed generation is repeatable, has unit QPSK and changes genuine H/S inputs',()=>{
 const a=M.generated(base),b=M.generated(base),c=M.generated({...base,seed:base.seed+1});assert.deepEqual(a,b);assert.notDeepEqual(a.H,c.H);assert.notDeepEqual(a.S,c.S);
 for(const row of a.S)for(const z of row)close(Matrix.abs2(z),1,1e-14);
 const d=M.generated({...base,beta:0,angle:35});assert.deepEqual(a.H,d.H);assert.deepEqual(a.S,d.S);assert.notDeepEqual(a.R,d.R);
});
test('actual same-covariance DFT baseline shares energy and cannot beat MUI bound',()=>{
 for(const settings of [base,{...base,beta:0},{...base,N:16,K:4,L:20,beta:0},{...base,N:8,K:8,L:8,beta:.95}]){
  const result=M.solve(M.generated(settings));close(result.reference.energy,result.optimal.metrics.energy);assert.ok(result.reference.covarianceResidualRelative<2e-10);assert.ok(result.reference.error>=result.optimal.metrics.objective-1e-9);
  result.reference.pattern.forEach((value,i)=>close(value,result.evaluated.pattern[i]));
  if(settings.beta===0)result.evaluated.pattern.forEach(value=>close(value,settings.Pt));
 }
});
test('paper dimensions preserve12 structural null directions and full energy',()=>{
 const r=M.solve(M.generated({...base,N:16,K:4,L:20,beta:0}));assert.equal(r.rank.guaranteedNullDirections,12);assert.equal(r.rank.numerical,4);close(r.optimal.metrics.energy,20);assert.ok(r.optimal.diagnostics.whitenedRowIsometryResidual<2e-10);
});
test('zero channel returns nonzero feasible transmit waveform and zero received samples',()=>{
 const input=M.generated(base);input.H=input.H.map(row=>row.map(()=>[0,0]));const r=M.solve(input);close(r.optimal.metrics.objective,Matrix.norm2(input.S));close(r.optimal.metrics.energy,8);assert.equal(r.rank.numerical,0);assert.ok(r.evaluated.Y.flat().every(z=>z[0]===0&&z[1]===0));
});
test('live model enforces its narrower UI domain and finite generator parameters',()=>{
 for(const mutation of [{N:17},{K:9},{L:65},{L:3},{seed:-1},{seed:1.5},{beta:1},{Pt:0},{angle:91}])assert.throws(()=>M.generated({...base,...mutation}));
 const input=M.generated(base);input.H=Array.from({length:9},()=>input.H[0]);assert.throws(()=>M.solve(input));
});
test('paper rate formula averages each user separately and never re-solves X',()=>{
 const input=M.generated(base),r=M.solve(input),before=JSON.stringify(r.optimal.X),view=M.rateMetric(input,r.optimal.X,10);let expected=0;
 for(let i=0;i<input.S.length;i++){const p=input.S[i].reduce((sum,z)=>sum+Matrix.abs2(z),0)/base.L,e=r.evaluated.errors[i].reduce((sum,z)=>sum+Matrix.abs2(z),0)/base.L;close(view.users[i].signalPower,p);close(view.users[i].mui,e);expected+=Math.log2(1+p/(e+.1));}
 close(view.sumLogRate,expected);M.rateMetric(input,r.optimal.X,-2);assert.equal(JSON.stringify(r.optimal.X),before);
});
test('verified offline counterexample really separates MUI and nonlinear rate objectives',()=>{
 const f=require('../scripts/validation/waveform-design/waveform-rate-counterexample.json'),a=f.muiOptimum,b=f.feasibleAlternative;
 const av=Matrix.evaluate(f.input.H,f.input.S,f.input.R,a.X,0),bv=Matrix.evaluate(f.input.H,f.input.S,f.input.R,b.X,0);
 assert.ok(bv.error>av.error);assert.ok(bv.covarianceResidual<1e-12);assert.ok(M.rateMetric(f.input,b.X,10).sumLogRate>M.rateMetric(f.input,a.X,10).sumLogRate);
});
test('core rejects malformed, infeasible and extreme floating-point inputs',()=>{
 const input=M.generated(base);for(const R of [[],[[[0,0]]],Array.from({length:4},()=>Array.from({length:4},()=>[0,0]))])assert.throws(()=>Core.solve(input.H,input.S,R));
 const R=Array.from({length:32},(_,i)=>Array.from({length:32},(_,j)=>[i===j?1e306:0,0]));assert.throws(()=>Core.solve([Array.from({length:32},()=>[0,0])],[Array.from({length:128},()=>[0,0])],R),/block energy/);
 for(const rho of [1e-310,1e-320])assert.throws(()=>Core.solve([[[0,0],[0,0]]],[[[0,0],[0,0]]],[[[rho,0],[0,0]],[[0,0],[rho,0]]]),/scaling range/);
});
test('actual Worker computes fresh inputs, hashes them and returns bounded errors',async()=>{
 const replies=[],root=path.resolve(__dirname,'..'),context={TextEncoder,Uint8Array,performance,crypto:crypto.webcrypto};context.self=context;context.postMessage=x=>replies.push(x);vm.createContext(context);
 context.importScripts=(...names)=>names.forEach(name=>vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context));
 vm.runInContext(fs.readFileSync(path.join(root,'waveform-live-worker.js'),'utf8'),context);
 await context.onmessage({data:{type:'solve',id:7,mode:'generated',settings:base}});assert.equal(replies.length,1);assert.equal(replies[0].type,'result');assert.equal(replies[0].id,7);assert.equal(replies[0].result.status,'certified');
 const r=replies[0].result;assert.equal(r.inputHashStatus,'verified');assert.equal(r.inputSha256,crypto.createHash('sha256').update(M.canonicalInputs(r.inputs)).digest('hex'));close(r.optimal.metrics.energy,8);
 await context.onmessage({data:{type:'solve',id:8,mode:'manual',inputs:{H:[],S:[],R:[]}}});assert.equal(replies.at(-1).type,'error');assert.equal(replies.at(-1).id,8);
 await context.onmessage({data:{type:'unknown',id:9}});assert.equal(replies.length,2);
});

test('wrapper rejects nonfinite baseline metrics even when the optimum itself is finite',()=>{
 const input={H:[[[1,0]]],S:[[[-(2**511),0]]],R:[[[2**1022,0]]]};
 assert.equal(Core.solve(input.H,input.S,input.R).status,'certified');assert.throws(()=>M.solve(input),/浮点范围/);
});
test('derived packet and rate diagnostics contain no nonfinite numeric fields',()=>{
 const r=M.solve(M.generated(base));function walk(x){if(typeof x==='number')assert.ok(Number.isFinite(x));if(x&&typeof x==='object')Object.values(x).forEach(walk);}walk(r);walk(M.rateMetric(r.inputs,r.optimal.X,10));
 assert.throws(()=>M.rateMetric({H:[[[0,0]]],S:[[[1e308,0]]],R:[[[1,0]]]},[[[0,0]]],10));
});


test('rate diagnostic avoids a silently overflowing interference-plus-noise denominator',()=>{
 const input={H:[[[0,0]]],S:[[[Math.sqrt(8e307),0]]],R:[[[8e307,0]]]};
 const r=M.solve(input),view=M.rateMetric(input,r.optimal.X,-2);
 close(view.sumLogRate,Math.log2(1+1/(1+10**.2)),1e-13);
 assert.ok(Number.isFinite(view.noisePower));assert.ok(Number.isFinite(view.users[0].mui));
});
