'use strict';
const {experiment}=require('./subset-adapter.cjs');
const MAX_TOTAL=1000000;
// Reproducible teaching PRNG, not cryptographic and not Python-compatible.
function seededRandom(seed){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('uint32 seed required');
 let state=seed>>>0;
 return ()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function rationalNumber(text){const [n,d='1']=text.split('/');return Number(n)/Number(d);}
function createScheduler(raw,m,psi,seed){
 const random=seededRandom(seed);
 // Validates and copies all public inputs through the accepted exact model.
 // The subset oracle is computed fresh once per configuration, not loaded data.
 const oracle=experiment(raw,m,psi),n=raw.length,threshold=Math.exp(-m);
 const geometryCopy=raw.map(station=>station.map(pair=>[...pair]));
 const histogram=Array(1<<n).fill(0);let total=0,outages=0,successes=0,conditionalSum=0,correction=0,cancelled=false,last=null;
 function draw(){
  if(cancelled)throw new Error('scheduler cancelled; create a new configuration to resume');
  if(total>=MAX_TOTAL)throw new RangeError('request budget exhausted');
  const otherCounts=[],uniformRanks=[];let mask=0;
  for(let i=0;i<n;i++){
   let k=0,product=1;
   if(m>0){while(true){product*=random();if(product<=threshold)break;k++;if(k>10000)throw new Error('Poisson sampler safety limit');}}
   // Rejection removes modulo/grid bias for a uniform uint32 source word.
   const size=k+1,limit=Math.floor(4294967296/size)*size;let word,rankAttempts=0;
   do{if(++rankAttempts>1024)throw new Error('Uniform rank sampler safety limit');word=Math.floor(random()*4294967296);}while(word>=limit);
   const rank=1+word%size;
   otherCounts.push(k);uniformRanks.push(rank);if(rank<=psi)mask|=1<<i;
  }
  const row=oracle.subsets[mask],inverseTrace=row.inverseTrace===null?null:rationalNumber(row.inverseTrace);
  total++;histogram[mask]++;
  if(row.rank<2)outages++;else{successes++;const y=inverseTrace-correction,t=conditionalSum+y;correction=(t-conditionalSum)-y;conditionalSum=t;}
  last={requestIndex:total,otherCounts,uniformRanks,acceptedMask:mask,acceptedCount:row.count,
        txMask:mask,rxMask:mask,rank:row.rank,inverseTrace,
        outcome:row.rank<2?'unidentifiable':'finite'};
  return {...last,otherCounts:[...otherCounts],uniformRanks:[...uniformRanks]};
 }
 function snapshot(){return {model:oracle.model,schedulerVersion:'tagged-request-scheduler-v1',prngVersion:'mulberry32-uint32-v1',geometry:geometryCopy.map(station=>station.map(pair=>[...pair])),
   numericalResolutionWarning:'Finite 32-bit PRNG and floating Poisson threshold cannot represent arbitrarily rare events (exp(-m) may round to 1). Exact probabilities remain authoritative; zero observed outages does not prove zero outage probability.',scientificLabel:'Independent tagged-request teaching extension; not a faithful source-formula repair or spatial-network reproduction',
   sampler:'mulberry32 / Knuth Poisson / rejection-sampled uniform tagged rank; numerical simulation, not cryptographic',
   seed,m,psi,stationCount:n,cancelled,total,outages,successes,histogram:[...histogram],
   empiricalOutage:total?outages/total:null,conditionalStatus:successes?'finite':'unavailable',
   conditionalInverseMean:successes?conditionalSum/successes:null,
   exactOutage:oracle.outageProbability,exactLogOutage:oracle.logOutageProbability,
   exactPositiveOutage:oracle.positiveOutage,exactConditionalStatus:oracle.conditionalStatus,
   exactConditionalInverseMean:oracle.conditionalInverseTrace,
   unconditionalStatus:oracle.unconditionalStatus,unconditionalInverseTrace:oracle.unconditionalInverseTrace,
   requestBudget:MAX_TOTAL,remaining:MAX_TOTAL-total,
   last:last?{...last,otherCounts:[...last.otherCounts],uniformRanks:[...last.uniformRanks]}:null};}
 function chunk(count=1){
  if(!Number.isInteger(count)||count<1||count>256)throw new RangeError('chunk count in 1..256 required');
  if(cancelled)throw new Error('scheduler cancelled');
  if(total+count>MAX_TOTAL)throw new RangeError('chunk exceeds remaining request budget');
  // Synchronous bounded chunk; caller yields between chunks to process UI cancel.
  for(let j=0;j<count;j++)draw();return snapshot();
 }
 return {step:draw,chunk,snapshot,cancel:()=>{cancelled=true;return snapshot();}};
}
module.exports={createScheduler,seededRandom};
