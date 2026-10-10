const {test}=require('node:test');const a=require('node:assert/strict');const C=require('../theory-core.js');
const near=(x,y,t=1e-11)=>a.ok(Math.abs(x-y)<=t,`${x} != ${y}`);
// Independent expression: average binary posterior entropy, midpoint integration.
// This does not reuse the core's softplus/Simpson integrand or quadrature.
function posteriorInformation(gamma){
 const h=.005,L=12;let entropy=0;
 for(let z=-L+h/2;z<L;z+=h){const p=1/(1+Math.exp(-2*gamma-2*Math.sqrt(gamma)*z));const H=p===0||p===1?0:-(p*Math.log2(p)+(1-p)*Math.log2(1-p));entropy+=h*Math.exp(-z*z/2)/Math.sqrt(2*Math.PI)*H;}
 return 1-entropy;
}
test('rate bridge reference values and real dimension half-factor',()=>{
 near(C.bpskInformation(1),.485944154132935,1e-13);near(C.bpskInformation(10),.99675632799003,1e-13);
 near(C.rateCrbComparison().points[1].information,.5);near(C.rateCrbComparison({gamma:10}).points[1].information,1.7297158093186489);
});
test('zero SNR limit, high SNR binary ceiling, monotonicity and Gaussian upper bound',()=>{
 a.equal(C.bpskInformation(0),0);a.equal(C.rateCrbComparison({gamma:0}).points[1].information,0);
 near(C.bpskInformation(100),1,1e-12);a.ok(C.rateCrbComparison({gamma:100}).points[1].information>3);
 let previous=0;
 for(let db=-60;db<=20;db+=.5){const g=10**(db/10),[b,n]=C.rateCrbComparison({gamma:g}).points;a.ok(b.information>=-1e-13&&b.information<=1+1e-13);a.ok(b.information>=previous-1e-13);a.ok(b.information<=n.information+1e-13);previous=b.information;}
});
test('posterior-entropy midpoint integration independently agrees with softplus Simpson',()=>{
 for(const gamma of [.000001,.01,.1,1,2,10,30,100])near(C.bpskInformation(gamma),posteriorInformation(gamma),3e-12);
});
test('truncation and step convergence are varied independently throughout UI SNR range',()=>{
 for(let db=-20;db<=20;db++){
  const gamma=10**(db/10),base=C.bpskInformation(gamma);
  for(const limit of [8,10,12])near(C.bpskInformation(gamma,{limit,step:.01}),base,4e-13);
  for(const step of [.04,.02,.01])near(C.bpskInformation(gamma,{limit:12,step}),base,4e-13);
 }
 const tail=2*Math.exp(-72)/Math.sqrt(2*Math.PI)*(Math.LN2/12+20)/Math.LN2;a.ok(tail<1.3e-30);
});
test('communication noise changes I only; sensing T changes D but not per-use I',()=>{
 const base=C.rateCrbComparison(),snr=C.rateCrbComparison({gamma:10}),long=C.rateCrbComparison({T:64});
 a.equal(base.sensingNoiseVariance,snr.sensingNoiseVariance);a.equal(base.power,snr.power);a.equal(snr.communicationNoiseVariance,.1);
 for(let i=0;i<2;i++){a.equal(base.points[i].averageCrb,snr.points[i].averageCrb);a.ok(base.points[i].information<snr.points[i].information);a.equal(base.points[i].information,long.points[i].information);a.ok(long.points[i].averageCrb<base.points[i].averageCrb);}
 for(const T of [3,4,8,16,32,64]){const [b,g]=C.rateCrbComparison({T}).points;near(b.averageCrb,1/T);near(g.averageCrb,1/(T-2));}
});
test('invalid SNR, divergent sensing lengths, and unbounded quadrature requests are rejected',()=>{
 for(const gamma of [-1,NaN,Infinity,101])a.throws(()=>C.bpskInformation(gamma),RangeError);
 for(const T of [0,1,2,3.5,65])a.throws(()=>C.rateCrbComparison({T}),RangeError);
 for(const options of [{limit:5},{limit:15},{step:0},{step:.2},{step:NaN}])a.throws(()=>C.bpskInformation(1,options),RangeError);
});
