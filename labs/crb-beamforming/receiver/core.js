/* Actual raw-echo point receiver. No optimizer, stored estimates, DOM, or network. */
(function(root,factory){
  const api=typeof module==='object'&&module.exports
    ?factory(require('../crb-multiuser-model.js'),require('./runtime-manifest.js'))
    :factory(root.CrbMultiuserModel,root.CrbReceiverRuntime);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CrbReceiverCore=api;
})(typeof self!=='undefined'?self:globalThis,function(M,Runtime){
'use strict';
const VERSION='point-receiver-v1.0.0';
const GRID=Object.freeze({minDegrees:-90,maxDegrees:90,stepDegrees:.01});
const LIMITS=Object.freeze({trials:128,gridCount:18001,angleBlock:128,trialBlock:4,quantumMs:8,
  conditionMs:30000,jobMs:120000,progressMs:100,bootstrapReplicates:1000,profileVertices:721,
  maxExportBytes:8*1024*1024,maxTypedArrayBytes:16*1024*1024});
const NOISE=Object.freeze({id:'mulberry32-boxmuller-complex-v1',version:1,
  uniforms:'uint32 Mulberry32; (uint32_output + 0.5) / 2^32',
  normal:'sqrt(-log(u1)) * [cos(2*pi*u2), sin(2*pi*u2)] * sqrt(sigma2)',
  traversal:'trial, receive row, snapshot; real and imaginary pair together',
  pairedAcrossSnr:true,bootstrapSeedXor:0x9E3779B9,
  bootstrap:'1000 replicate means of 128 squared errors; floor(uniform*128); same reset seed each condition; percentile q*(999), linear interpolation, then sqrt'});
function fail(s){throw Error(s);}
function obj(x,name){if(!x||typeof x!=='object'||Array.isArray(x)||![Object.prototype,null].includes(Object.getPrototypeOf(x)))fail(name+' must be a plain object');}
function keys(x,allowed,required,name){obj(x,name);for(const k of Object.keys(x))if(!allowed.includes(k))fail(name+'.'+k+' unsupported');for(const k of required)if(!Object.hasOwn(x,k))fail(name+'.'+k+' required');}
function finite(x,name,lo=-Infinity,hi=Infinity){if(typeof x!=='number'||!Number.isFinite(x)||x<lo||x>hi)fail(name+' must be finite in bounds');return x;}
function integer(x,name,lo=0,hi=Number.MAX_SAFE_INTEGER){finite(x,name,lo,hi);if(!Number.isSafeInteger(x))fail(name+' must be integer');return x;}
function matrix(x,rows,cols,name){keys(x,['real','imag'],['real','imag'],name);for(const p of ['real','imag']){if(!Array.isArray(x[p])||x[p].length!==rows)fail(name+' row count');for(const row of x[p]){if(!Array.isArray(row)||row.length!==cols)fail(name+' column count');for(let i=0;i<cols;i++)finite(row[i],name+' sample');}}return x;}
function mat(rows,cols){return {real:Array.from({length:rows},()=>Array(cols).fill(0)),imag:Array.from({length:rows},()=>Array(cols).fill(0))};}
function clone(x){return JSON.parse(JSON.stringify(x));}
function same(a,b,name){if(M.canonical(a)!==M.canonical(b))fail(name+' mismatch');}
/* SHA-256 copied without alteration of the established input-identity algorithm. */
function sha256(text){const bytes=new TextEncoder().encode(text),length=bytes.length,buffer=new Uint8Array(Math.ceil((length+9)/64)*64);buffer.set(bytes);buffer[length]=128;const view=new DataView(buffer.buffer);view.setUint32(buffer.length-8,Math.floor(length*8/4294967296));view.setUint32(buffer.length-4,length*8>>>0);const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2],h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],rotr=(x,n)=>(x>>>n)|(x<<(32-n)),w=new Uint32Array(64);for(let at=0;at<buffer.length;at+=64){for(let i=0;i<16;i++)w[i]=view.getUint32(at+4*i);for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(rotr(a,7)^rotr(a,18)^(a>>>3))+w[i-7]+(rotr(b,17)^rotr(b,19)^(b>>>10)))>>>0;}let[a,b,c,d,e,f,g,z]=h;for(let i=0;i<64;i++){const t1=(z+(rotr(e,6)^rotr(e,11)^rotr(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0,t2=((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&c)^(b&c)))>>>0;z=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}[a,b,c,d,e,f,g,z].forEach((v,i)=>h[i]=(h[i]+v)>>>0);}return h.map(x=>x.toString(16).padStart(8,'0')).join('');}
function digest(x){return sha256(M.canonical(x));}
function createSource(args){
  keys(args,['sourceRunId','input','result','sourceSeed','sourceTimingMs'],['sourceRunId','input','result'],'source arguments');
  integer(args.sourceRunId,'sourceRunId');const input=M.validateInput(args.input),result=M.validateResult(args.result,input);
  if(!M.classify(result).accepted)fail('Receiver requires a current accepted recovered beam');
  const solverRecord=M.buildRecord({input,result,seed:args.sourceSeed??null,runId:args.sourceRunId,uiTimingMs:args.sourceTimingMs??null});
  const source={kind:'current-session-accepted',sourceRunId:args.sourceRunId,inputDigest:M.inputDigest(input),
    scenarioDigest:M.scenarioDigest(input),WcDigest:digest(result.Wc),solverRecord};
  return validateSource(source);
}
function validateSource(source){
  keys(source,['kind','sourceRunId','inputDigest','scenarioDigest','WcDigest','solverRecord'],['kind','sourceRunId','inputDigest','scenarioDigest','WcDigest','solverRecord'],'source');
  if(source.kind!=='current-session-accepted')fail('Historical or unaccepted source cannot start a receiver');
  integer(source.sourceRunId,'sourceRunId');
  // Full existing record validation preserves source solver schema and physical gates.
  const r=M.parseImport(M.exportRecord(source.solverRecord)).record;
  if(!M.classify(r.result).accepted||!r.result.Wc)fail('Receiver requires accepted Wc');
  if(source.sourceRunId!==r.run.id||source.inputDigest!==r.inputDigest||source.scenarioDigest!==r.scenarioDigest||source.WcDigest!==digest(r.result.Wc))fail('Source binding digest mismatch');
  const p=M.physicalMetrics(r.result.Wc,r.input);
  if(p.radar.status!=='regular')fail('Accepted source has singular information');
  return clone(source);
}
function createRequest(args){
  keys(args,['source','mode','snrDb','noiseSeed'],['source','mode','snrDb','noiseSeed'],'request arguments');
  const source=validateSource(args.source);if(!['singleSNR','fourSNRsweep'].includes(args.mode))fail('Unsupported receiver mode');
  integer(args.snrDb,'snrDb',-20,10);integer(args.noiseSeed,'noiseSeed',0,4294967295);
  const snrDbList=args.mode==='singleSNR'?[args.snrDb]:[-20,-10,0,10];
  if(!snrDbList.includes(args.snrDb))fail('Sweep selected profile SNR must be -20, -10, 0, or 10 dB');
  const request={version:VERSION,source,mode:args.mode,selectedSnrDb:args.snrDb,snrDbList,noiseSeed:args.noiseSeed,
    trials:LIMITS.trials,grid:clone(GRID),noiseProtocol:clone(NOISE)};
  request.jobDigest=digest(request);return request;
}
function validateRequest(r){
  keys(r,['version','source','mode','selectedSnrDb','snrDbList','noiseSeed','trials','grid','noiseProtocol','jobDigest'],['version','source','mode','selectedSnrDb','snrDbList','noiseSeed','trials','grid','noiseProtocol','jobDigest'],'request');
  const expected=createRequest({source:r.source,mode:r.mode,snrDb:r.selectedSnrDb,noiseSeed:r.noiseSeed});same(r,expected,'Request');return expected;
}
function createRng(seed){
  integer(seed,'seed',0,4294967295);let state=seed>>>0;
  return function uniform(){state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return (((t^(t>>>14))>>>0)+.5)/4294967296;};
}
function complexNoise(rng,sigma2=1){finite(sigma2,'sigma2',0);const radius=Math.sqrt(-Math.log(rng())),phase=2*Math.PI*rng(),scale=Math.sqrt(sigma2);return {real:radius*Math.cos(phase)*scale,imag:radius*Math.sin(phase)*scale};}
function steering(n,degrees){integer(n,'array size',1,32);finite(degrees,'angle',-90,90);const s=Math.sin(degrees*Math.PI/180);return Array.from({length:n},(_,m)=>{const p=Math.PI*(m-(n-1)/2)*s;return {real:Math.cos(p),imag:Math.sin(p)};});}
function exactStreams(K=2,L=30){integer(K,'K',1,2);integer(L,'L',K,30);const S=mat(K,L);for(let k=0;k<K;k++)for(let l=0;l<L;l++){const p=2*Math.PI*k*l/L;S.real[k][l]=Math.cos(p);S.imag[k][l]=Math.sin(p);}return S;}
function validateStreams(S){if(!S?.real?.[0])fail('S shape');const K=S.real.length,L=S.real[0].length;integer(K,'K',2,2);integer(L,'L',30,30);matrix(S,K,L,'S');
  for(let a=0;a<K;a++)for(let b=0;b<K;b++){let r=0,i=0;for(let l=0;l<L;l++){r+=S.real[a][l]*S.real[b][l]+S.imag[a][l]*S.imag[b][l];i+=S.imag[a][l]*S.real[b][l]-S.real[a][l]*S.imag[b][l];}if(Math.hypot(r/L-(a===b?1:0),i/L)>1e-12)fail('S must satisfy S S^H/L=I');}return {K,L};}
function transmit(W,S){const {K,L}=validateStreams(S);matrix(W,W.real?.length,K,'W');const X=mat(W.real.length,L);for(let m=0;m<W.real.length;m++)for(let l=0;l<L;l++)for(let k=0;k<K;k++){X.real[m][l]+=W.real[m][k]*S.real[k][l]-W.imag[m][k]*S.imag[k][l];X.imag[m][l]+=W.real[m][k]*S.imag[k][l]+W.imag[m][k]*S.real[k][l];}return X;}
function observe(args){
  keys(args,['X','Nr','thetaDegrees','alpha','noise'],['X','Nr','thetaDegrees','alpha','noise'],'generator');const {X,Nr,thetaDegrees,alpha,noise}=args;
  const Nt=X?.real?.length,L=X?.real?.[0]?.length;integer(Nt,'Nt',1,32);integer(Nr,'Nr',1,32);integer(L,'L',1,30);matrix(X,Nt,L,'X');matrix(noise,Nr,L,'noise');keys(alpha,['real','imag'],['real','imag'],'alpha');finite(alpha.real,'alpha.real');finite(alpha.imag,'alpha.imag');
  const a=steering(Nt,thetaDegrees),b=steering(Nr,thetaDegrees),Y=mat(Nr,L);
  for(let l=0;l<L;l++){let vr=0,vi=0;for(let m=0;m<Nt;m++){vr+=a[m].real*X.real[m][l]+a[m].imag*X.imag[m][l];vi+=a[m].real*X.imag[m][l]-a[m].imag*X.real[m][l];}
    for(let n=0;n<Nr;n++){const tr=b[n].real*vr-b[n].imag*vi,ti=b[n].real*vi+b[n].imag*vr;Y.real[n][l]=alpha.real*tr-alpha.imag*ti+noise.real[n][l];Y.imag[n][l]=alpha.real*ti+alpha.imag*tr+noise.imag[n][l];}}
  return Y;
}
function compress(args){keys(args,['Y','S'],['Y','S'],'compression');const {Y,S}=args,{K,L}=validateStreams(S),Nr=Y?.real?.length;integer(Nr,'Nr',1,32);matrix(Y,Nr,L,'Y');const Z=mat(Nr,K);for(let n=0;n<Nr;n++)for(let k=0;k<K;k++){let r=0,i=0;for(let l=0;l<L;l++){r+=Y.real[n][l]*S.real[k][l]+Y.imag[n][l]*S.imag[k][l];i+=Y.imag[n][l]*S.real[k][l]-Y.real[n][l]*S.imag[k][l];}Z.real[n][k]=r/L;Z.imag[n][k]=i/L;}return Z;}
function gridSpec(g=GRID){keys(g,['minDegrees','maxDegrees','stepDegrees'],['minDegrees','maxDegrees','stepDegrees'],'grid');finite(g.minDegrees,'grid min',-90,90);finite(g.maxDegrees,'grid max',-90,90);finite(g.stepDegrees,'grid step',.0025,180);const count=Math.round((g.maxDegrees-g.minDegrees)/g.stepDegrees)+1;if(count<1||count>72001||Math.abs(g.minDegrees+(count-1)*g.stepDegrees-g.maxDegrees)>1e-10)fail('Grid must contain both endpoints');return {...g,count};}
function gridAngle(g,index){return g.minDegrees+index*g.stepDegrees;}
function flatten(A,rows,cols){matrix(A,rows,cols,'complex matrix');const out=new Float64Array(2*rows*cols);for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const j=2*(r*cols+c);out[j]=A.real[r][c];out[j+1]=A.imag[r][c];}return out;}
function unflatten(A,rows,cols,offset=0){const out=mat(rows,cols);for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const j=offset+2*(r*cols+c);out.real[r][c]=A[j];out.imag[r][c]=A[j+1];}return out;}
/* Estimator state holds W/geometry/grid only: truth and alpha never enter here. */
function createSearch(args){
  keys(args,['W','Nr','S','grid'],['W','Nr','S'],'search');const {W,Nr,S}=args,{K,L}=validateStreams(S),Nt=W?.real?.length;
  integer(Nt,'Nt',1,8);integer(Nr,'Nr',1,12);matrix(W,Nt,K,'W');const g=gridSpec(args.grid),width=2*Nr*K;
  const bank=new Float64Array(g.count*width),energy=new Float64Array(g.count);let built=0,maxEnergy=0,maskedCount=0,ready=false;
  function buildBlock(count=LIMITS.angleBlock){integer(count,'template block',1,LIMITS.angleBlock);if(ready)return true;const end=Math.min(built+count,g.count);
    for(let q=built;q<end;q++){const a=steering(Nt,gridAngle(g,q)),b=steering(Nr,gridAngle(g,q));let e=0;
      for(let k=0;k<K;k++){let vr=0,vi=0;for(let m=0;m<Nt;m++){vr+=a[m].real*W.real[m][k]+a[m].imag*W.imag[m][k];vi+=a[m].real*W.imag[m][k]-a[m].imag*W.real[m][k];}
        for(let n=0;n<Nr;n++){const at=q*width+2*(n*K+k),r=b[n].real*vr-b[n].imag*vi,i=b[n].real*vi+b[n].imag*vr;bank[at]=r;bank[at+1]=i;e+=r*r+i*i;}}
      energy[q]=e;maxEnergy=Math.max(maxEnergy,e);}
    built=end;if(built===g.count){for(let q=0;q<g.count;q++)if(!(energy[q]>1e-12*maxEnergy))maskedCount++;ready=true;}return ready;
  }
  function accumulator(Z,captureProfile=false){const data=Z instanceof Float64Array?Z:flatten(Z,Nr,K);if(data.length!==width)fail('Z shape');for(const x of data)finite(x,'Z');return {data,bestIndex:-1,bestScore:-Infinity,bestReal:0,bestImag:0,tieCount:0,numericalFailed:false,nextAngle:0,scores:captureProfile?new Float64Array(g.count):null};}
  function scoreBlock(accumulators,start,count=LIMITS.angleBlock){if(!ready)fail('Templates not ready');integer(start,'angle start',0,g.count);integer(count,'angle block',1,LIMITS.angleBlock);if(!Array.isArray(accumulators)||accumulators.length>LIMITS.trialBlock||accumulators.length<1)fail('At most four active trials');const end=Math.min(start+count,g.count);
    for(const ac of accumulators)if(ac.nextAngle!==start)fail('Incomplete/repeated angle traversal');
    for(let q=start;q<end;q++){const d=energy[q],usable=d>1e-12*maxEnergy;
      for(const ac of accumulators){let r=0,i=0,score=-Infinity;if(usable){const at=q*width;for(let j=0;j<width;j+=2){const tr=bank[at+j],ti=bank[at+j+1],zr=ac.data[j],zi=ac.data[j+1];r+=tr*zr+ti*zi;i+=tr*zi-ti*zr;}score=L*(r*r+i*i)/d;if(!Number.isFinite(score)){ac.numericalFailed=true;score=-Infinity;}}
        if(ac.scores)ac.scores[q]=score;if(score>ac.bestScore){ac.bestScore=score;ac.bestIndex=q;ac.bestReal=r;ac.bestImag=i;ac.tieCount=1;}else if(Number.isFinite(score)&&score===ac.bestScore)ac.tieCount++;}
    }for(const ac of accumulators)ac.nextAngle=end;return end;
  }
  function finish(ac){if(ac.nextAngle!==g.count)fail('Partial grid is not an estimate');if(ac.bestIndex<0||ac.numericalFailed)return {status:'numerical_failure',estimateDegrees:null,bestIndex:null,bestScore:null,alphaHat:null,tieCount:0,boundaryHit:false,maskedCount,scores:ac.scores};const e=energy[ac.bestIndex];return {status:'valid',estimateDegrees:gridAngle(g,ac.bestIndex),bestIndex:ac.bestIndex,bestScore:ac.bestScore,alphaHat:{real:ac.bestReal/e,imag:ac.bestImag/e},tieCount:ac.tieCount,boundaryHit:ac.bestIndex===0||ac.bestIndex===g.count-1,maskedCount,scores:ac.scores};}
  return {buildBlock,accumulator,scoreBlock,finish,get ready(){return ready;},get built(){return built;},get maskedCount(){return maskedCount;},grid:g,width,typedArrayBytes:bank.byteLength+energy.byteLength};
}
function profileML(args){keys(args,['Y','W','Nr','S','grid'],['Y','W','Nr','S'],'profileML');const s=createSearch({W:args.W,Nr:args.Nr,S:args.S,grid:args.grid??GRID});while(!s.buildBlock()){}const ac=s.accumulator(compress({Y:args.Y,S:args.S}),true);for(let at=0;at<s.grid.count;at+=LIMITS.angleBlock)s.scoreBlock([ac],at);return s.finish(ac);}
function rootCrb(source,snrDb){const input=source.solverRecord.input,W=source.solverRecord.result.Wc,p=M.physicalMetrics(W,input),alpha2=10**(snrDb/10)*input.radarNoiseMw/(input.L*input.powerMw),info=p.radar.effectiveInformationWithoutScale;return {alphaSquared:alpha2,effectiveInformationWithoutScale:info,fisherScale:2*input.L*alpha2/input.radarNoiseMw,crbRad2:info>0?input.radarNoiseMw/(2*input.L*alpha2*info):null,rootCrbDegrees:info>0?Math.sqrt(input.radarNoiseMw/(2*input.L*alpha2*info))*180/Math.PI:null};}
function percentile(sorted,q){const at=q*(sorted.length-1),lo=Math.floor(at),f=at-lo;return sorted[lo]*(1-f)+sorted[Math.min(lo+1,sorted.length-1)]*f;}
function bootstrapCI(errors,seed){if(!Array.isArray(errors)||errors.length!==128||errors.some(x=>!Number.isFinite(x)))fail('Bootstrap requires all 128 finite errors');const rng=createRng((seed^NOISE.bootstrapSeedXor)>>>0),means=[];for(let b=0;b<LIMITS.bootstrapReplicates;b++){let sum=0;for(let j=0;j<128;j++){const e=errors[Math.floor(rng()*128)];sum+=e*e;}means.push(sum/128);}means.sort((a,b)=>a-b);return [Math.sqrt(percentile(means,.025)),Math.sqrt(percentile(means,.975))];}
function displayProfile(scores,g,bestIndex){
  if(!scores||bestIndex===null||!(scores[bestIndex]>0))return [];const selected=new Set([0,scores.length-1,bestIndex]),bins=Math.floor((LIMITS.profileVertices-3)/2);
  for(let b=0;b<bins;b++){const from=Math.floor(b*scores.length/bins),to=Math.floor((b+1)*scores.length/bins);let low=-1,high=-1;for(let j=from;j<to;j++)if(Number.isFinite(scores[j])){if(low<0||scores[j]<scores[low])low=j;if(high<0||scores[j]>scores[high])high=j;}if(low>=0)selected.add(low);if(high>=0)selected.add(high);}
  return [...selected].sort((a,b)=>a-b).map(j=>({angleDegrees:gridAngle(g,j),normalizedScore:Number.isFinite(scores[j])?scores[j]/scores[bestIndex]:null}));
}
function blankCondition(snrDb,bound){return {snrDb,status:'pending',denominators:{planned:128,started:0,completed:0,valid:0,numericalFailures:0,unstarted:128,incomplete:0},rmseDegrees:null,ci95Degrees:null,rootCrbDegrees:bound.rootCrbDegrees,largeErrorCount:0,boundaryHits:0,tieTrials:0,bound,trials:[]};}
function createExperiment(request,environment={}){
  request=validateRequest(request);keys(environment,['now'],[],'environment');const now=environment.now||(()=>performance.now());if(typeof now!=='function')fail('now must be a function');
  const input=request.source.solverRecord.input,W=request.source.solverRecord.result.Wc,Nr=input.Nr,L=input.L,K=input.K,rawWidth=2*Nr*L,zWidth=2*Nr*K;
  const S=exactStreams(),X=transmit(W,S),search=createSearch({W,Nr,S}),noiseBank=new Float64Array(128*rawWidth),observations=new Float64Array(128*zWidth),rawY=new Float64Array(rawWidth),signal=new Float64Array(rawWidth);
  const rng=createRng(request.noiseSeed),began=now(),conditions=request.snrDbList.map(s=>blankCondition(s,rootCrb(request.source,s))),physical=M.physicalMetrics(W,input);
  const timings={noiseMs:0,templateMs:0,observationMs:0,scoringMs:0,bootstrapMs:0,elapsedMs:0,maxBlockMs:0,maxSliceMs:0,blocks:0};
  let stage='noise',status='running',noiseTrial=0,conditionIndex=0,conditionBegan=began,observationTrial=0,trialStart=0,angleStart=0,active=[],profile=null,trace=null,cancelReason=null;
  let bootstrapRng=null,bootstrapMeans=null,bootstrapAt=0,signalReady=false;
  const resources={trialsPerCondition:128,gridCount:18001,gridStepDegrees:.01,angleBlock:128,trialBlock:4,quantumTargetMs:8,conditionBudgetMs:30000,jobBudgetMs:120000,scoreCubeAllocated:false,
    typedArrayBytes:noiseBank.byteLength+observations.byteLength+rawY.byteLength+signal.byteLength+search.typedArrayBytes+18001*8+1000*8,
    memoryInterpretation:'explicit persistent numerical typed arrays; excludes JS objects, source record, temporary/export/structured-clone overhead'};
  if(resources.typedArrayBytes>LIMITS.maxTypedArrayBytes)fail('Typed-array working set exceeds bound');
  function updateCounts(c){const d=c.denominators;d.unstarted=d.planned-d.started;d.incomplete=d.started-d.completed;}
  function stop(why){if(status!=='running')return summary();status=why;cancelReason=why;const c=conditions[conditionIndex];if(c&&c.status!=='completed'){c.status=why;c.rmseDegrees=null;c.ci95Degrees=null;updateCounts(c);}active=[];timings.elapsedMs=Math.max(0,now()-began);return summary();}
  function expired(){const at=now();if(at-began>=LIMITS.jobMs||at-conditionBegan>=LIMITS.conditionMs){stop('budget_exhausted');return true;}return false;}
  function makeSignal(){const zero=mat(Nr,L),a=Math.sqrt(conditions[conditionIndex].bound.alphaSquared),Y=observe({X,Nr,thetaDegrees:input.thetaDegrees,alpha:{real:a,imag:0},noise:zero});signal.set(flatten(Y,Nr,L));signalReady=true;}
  function observationBlock(){const c=conditions[conditionIndex];c.status='running';if(!signalReady)makeSignal();const end=Math.min(observationTrial+4,128);
    for(let t=observationTrial;t<end;t++){
      // Form the actual Nr × L complex Y first, then project the known waveform.
      for(let j=0;j<rawWidth;j++)rawY[j]=signal[j]+noiseBank[t*rawWidth+j];
      for(let n=0;n<Nr;n++)for(let k=0;k<K;k++){let r=0,i=0;for(let l=0;l<L;l++){const at=2*(n*L+l),yr=rawY[at],yi=rawY[at+1];r+=yr*S.real[k][l]+yi*S.imag[k][l];i+=yi*S.real[k][l]-yr*S.imag[k][l];}const at=t*zWidth+2*(n*K+k);observations[at]=r/L;observations[at+1]=i/L;}
      if(t===0&&c.snrDb===request.selectedSnrDb)trace={snrDb:c.snrDb,trial:0,noise:unflatten(noiseBank,Nr,L),Y:unflatten(rawY,Nr,L),scores:null};
      c.denominators.started++;updateCounts(c);
    }observationTrial=end;if(end===128)stage='scoring';
  }
  function scoreOneBlock(){const c=conditions[conditionIndex];if(!active.length){active=[];for(let t=trialStart;t<Math.min(trialStart+4,128);t++)active.push(search.accumulator(observations.subarray(t*zWidth,(t+1)*zWidth),t===0&&c.snrDb===request.selectedSnrDb));angleStart=0;}
    angleStart=search.scoreBlock(active,angleStart);
    if(angleStart===search.grid.count){for(let j=0;j<active.length;j++){const trial=trialStart+j,r=search.finish(active[j]),error=r.estimateDegrees===null?null:r.estimateDegrees-input.thetaDegrees;
        c.trials.push({trial,status:r.status,estimateDegrees:r.estimateDegrees,errorDegrees:error,bestIndex:r.bestIndex,bestScore:r.bestScore,alphaHat:r.alphaHat,tieCount:r.tieCount,boundaryHit:r.boundaryHit});
        c.denominators.completed++;if(r.status==='valid'){c.denominators.valid++;if(Math.abs(error)>5)c.largeErrorCount++;if(r.boundaryHit)c.boundaryHits++;if(r.tieCount>1)c.tieTrials++;}else c.denominators.numericalFailures++;
        if(r.scores){trace.scores=Array.from(r.scores,x=>Number.isFinite(x)?x:null);profile=r.status==='valid'?{snrDb:c.snrDb,trial:0,estimateDegrees:r.estimateDegrees,truthDegrees:input.thetaDegrees,points:displayProfile(r.scores,search.grid,r.bestIndex),maskedCount:r.maskedCount}:null;}
      }updateCounts(c);trialStart+=active.length;active=[];if(trialStart===128){if(c.denominators.valid===128){c.rmseDegrees=Math.sqrt(c.trials.reduce((s,t)=>s+t.errorDegrees*t.errorDegrees,0)/128);bootstrapRng=createRng((request.noiseSeed^NOISE.bootstrapSeedXor)>>>0);bootstrapMeans=new Float64Array(1000);bootstrapAt=0;stage='bootstrap';}else finishCondition();}}
  }
  function finishCondition(){const c=conditions[conditionIndex];c.status='completed';conditionIndex++;if(conditionIndex===conditions.length){status='completed';stage='done';timings.elapsedMs=Math.max(0,now()-began);}else{conditionBegan=now();stage='observations';observationTrial=0;trialStart=0;angleStart=0;signalReady=false;bootstrapMeans=null;}}
  function bootstrapBlock(){const c=conditions[conditionIndex],end=Math.min(bootstrapAt+32,1000);for(let b=bootstrapAt;b<end;b++){let sum=0;for(let j=0;j<128;j++){const e=c.trials[Math.floor(bootstrapRng()*128)].errorDegrees;sum+=e*e;}bootstrapMeans[b]=sum/128;}bootstrapAt=end;if(end===1000){bootstrapMeans.sort();c.ci95Degrees=[Math.sqrt(percentile(bootstrapMeans,.025)),Math.sqrt(percentile(bootstrapMeans,.975))];finishCondition();}}
  function step(){if(status!=='running')return progress();const slice=now();let blocks=0;do{if(expired())break;const before=now(),which=stage;
      if(stage==='noise'){const end=Math.min(noiseTrial+4,128);for(let t=noiseTrial;t<end;t++)for(let j=0;j<rawWidth;j+=2){const n=complexNoise(rng,input.radarNoiseMw);noiseBank[t*rawWidth+j]=n.real;noiseBank[t*rawWidth+j+1]=n.imag;}noiseTrial=end;if(end===128)stage='templates';}
      else if(stage==='templates'){if(search.buildBlock()){resources.maskedTemplateCount=search.maskedCount;stage='observations';}}
      else if(stage==='observations')observationBlock();else if(stage==='scoring')scoreOneBlock();else if(stage==='bootstrap')bootstrapBlock();
      const ms=Math.max(0,now()-before);const key={noise:'noiseMs',templates:'templateMs',observations:'observationMs',scoring:'scoringMs',bootstrap:'bootstrapMs'}[which];if(key)timings[key]+=ms;timings.maxBlockMs=Math.max(timings.maxBlockMs,ms);timings.blocks++;blocks++;
    }while(status==='running'&&now()-slice<LIMITS.quantumMs&&blocks<64);timings.maxSliceMs=Math.max(timings.maxSliceMs,now()-slice);return progress();}
  function progress(){return {stage,status,conditionIndex,conditionsPlanned:conditions.length,conditionsCompleted:conditions.filter(c=>c.status==='completed').length,trialsCompleted:conditions.reduce((s,c)=>s+c.denominators.completed,0),totalTrialsPlanned:128*conditions.length,conditionTrialsCompleted:conditions[conditionIndex]?.denominators.completed||0,elapsedMs:Math.max(0,now()-began)};}
  function summary(){return {version:VERSION,jobDigest:request.jobDigest,status,source:{sourceRunId:request.source.sourceRunId,inputDigest:request.source.inputDigest,scenarioDigest:request.source.scenarioDigest,WcDigest:request.source.WcDigest,Nt:input.Nt,Nr,K,L,powerMw:input.powerMw,usedPowerMw:physical.powerMw,gammaDb:input.gammaDb,truthDegrees:input.thetaDegrees},mode:request.mode,noiseSeed:request.noiseSeed,selectedSnrDb:request.selectedSnrDb,conditions:conditions.map(c=>{const {trials,bound,...compact}=c;return clone(compact);}),profile:clone(profile),timings:{...timings,elapsedMs:Math.max(0,now()-began)},resources:{...resources}};}
  function fullRecord(){if(status==='running')fail('Cannot export a running experiment');return {format:'isac-crb-point-receiver-run',schemaVersion:1,receiverVersion:VERSION,runtime:clone(Runtime),jobDigest:request.jobDigest,request:clone(request),summary:summary(),assumptions:{generatorTruthDegrees:input.thetaDegrees,alphaPhaseRadians:0,radarSnrDefinition:'|alpha|^2 L P_budget / sigma_R^2',knownWaveform:'X=W S; exact finite DFT rows S S^H/L=I',receiverUnknowns:['theta','complex alpha'],score:'L |<A(theta) W,Z>|^2 / ||A(theta) W||^2; Z=Y S^H/L',tieRule:'lowest grid index on exact finite score tie',templateMaskRelative:1e-12,largeErrorThresholdDegrees:5,fullGridRequired:true,rawYGeneratedBeforeCompression:true,allFiniteErrorsIncluded:true,scope:'fixed channel and accepted beam, finite simulation; not exact paper Fig.4 reproduction'},conditions:clone(conditions),trial0:clone(trace),cancelReason};}
  function exportText(){const record=fullRecord();validateRecord(record);const text=JSON.stringify(record);if(new TextEncoder().encode(text).byteLength>LIMITS.maxExportBytes)fail('Full replay exceeds 8 MiB; export refused without truncation');return text;}
  return {step,progress,summary,fullRecord,exportText,cancel:()=>stop('cancelled'),get status(){return status;}};
}
function close(a,b,name,tolerance=1e-10){finite(a,name);finite(b,name);if(Math.abs(a-b)>tolerance*Math.max(1,Math.abs(a),Math.abs(b)))fail(name+' replay mismatch');}
function validateRecord(record){
  keys(record,['format','schemaVersion','receiverVersion','runtime','jobDigest','request','summary','assumptions','conditions','trial0','cancelReason'],['format','schemaVersion','receiverVersion','runtime','jobDigest','request','summary','assumptions','conditions','trial0','cancelReason'],'receiver record');
  if(record.format!=='isac-crb-point-receiver-run'||record.schemaVersion!==1||record.receiverVersion!==VERSION)fail('Unsupported receiver schema');same(record.runtime,Runtime,'Receiver runtime');const r=validateRequest(record.request),input=r.source.solverRecord.input;
  const summaryKeys=['version','jobDigest','status','source','mode','noiseSeed','selectedSnrDb','conditions','profile','timings','resources'];keys(record.summary,summaryKeys,summaryKeys,'summary');const summary=record.summary;
  if(record.jobDigest!==r.jobDigest||summary.jobDigest!==r.jobDigest||summary.version!==VERSION||summary.mode!==r.mode||summary.noiseSeed!==r.noiseSeed||summary.selectedSnrDb!==r.selectedSnrDb)fail('Receiver digest/settings mismatch');
  if(!['completed','cancelled','budget_exhausted','numerical_failure'].includes(summary.status))fail('Receiver is not terminal');
  if(record.cancelReason!==(summary.status==='completed'?null:summary.status))fail('Terminal reason mismatch');
  const physical=M.physicalMetrics(r.source.solverRecord.result.Wc,input);
  same(summary.source,{sourceRunId:r.source.sourceRunId,inputDigest:r.source.inputDigest,scenarioDigest:r.source.scenarioDigest,WcDigest:r.source.WcDigest,Nt:input.Nt,Nr:input.Nr,K:input.K,L:input.L,powerMw:input.powerMw,usedPowerMw:physical.powerMw,gammaDb:input.gammaDb,truthDegrees:input.thetaDegrees},'Summary source');
  const timingKeys=['noiseMs','templateMs','observationMs','scoringMs','bootstrapMs','elapsedMs','maxBlockMs','maxSliceMs','blocks'];keys(summary.timings,timingKeys,timingKeys,'timings');for(const x of Object.values(summary.timings))finite(x,'timing',0);integer(summary.timings.blocks,'block count');
  const resourceKeys=['trialsPerCondition','gridCount','gridStepDegrees','angleBlock','trialBlock','quantumTargetMs','conditionBudgetMs','jobBudgetMs','scoreCubeAllocated','typedArrayBytes','memoryInterpretation','maskedTemplateCount'];keys(summary.resources,resourceKeys,resourceKeys.filter(k=>k!=='maskedTemplateCount'),'resources');
  const fixedResources={trialsPerCondition:128,gridCount:18001,gridStepDegrees:.01,angleBlock:128,trialBlock:4,quantumTargetMs:8,conditionBudgetMs:30000,jobBudgetMs:120000,scoreCubeAllocated:false};for(const [k,v] of Object.entries(fixedResources))if(summary.resources[k]!==v)fail('Resource contract mismatch');integer(summary.resources.typedArrayBytes,'typed array bytes',0,LIMITS.maxTypedArrayBytes);if(Object.hasOwn(summary.resources,'maskedTemplateCount'))integer(summary.resources.maskedTemplateCount,'masked templates',0,18001);
  if(typeof summary.resources.memoryInterpretation!=='string'||summary.resources.memoryInterpretation.length>256)fail('Memory interpretation');
  const expectedAssumptions={generatorTruthDegrees:input.thetaDegrees,alphaPhaseRadians:0,radarSnrDefinition:'|alpha|^2 L P_budget / sigma_R^2',knownWaveform:'X=W S; exact finite DFT rows S S^H/L=I',receiverUnknowns:['theta','complex alpha'],score:'L |<A(theta) W,Z>|^2 / ||A(theta) W||^2; Z=Y S^H/L',tieRule:'lowest grid index on exact finite score tie',templateMaskRelative:1e-12,largeErrorThresholdDegrees:5,fullGridRequired:true,rawYGeneratedBeforeCompression:true,allFiniteErrorsIncluded:true,scope:'fixed channel and accepted beam, finite simulation; not exact paper Fig.4 reproduction'};
  same(record.assumptions,expectedAssumptions,'Scientific assumptions');
  if(!Array.isArray(record.conditions)||record.conditions.length!==r.snrDbList.length||!Array.isArray(summary.conditions)||summary.conditions.length!==record.conditions.length)fail('Condition count');
  record.conditions.forEach((c,index)=>{
    const ck=['snrDb','status','denominators','rmseDegrees','ci95Degrees','rootCrbDegrees','largeErrorCount','boundaryHits','tieTrials','bound','trials'];keys(c,ck,ck,'condition');
    if(c.snrDb!==r.snrDbList[index]||!['pending','completed','cancelled','budget_exhausted','numerical_failure'].includes(c.status))fail('Condition order/state');
    const dk=['planned','started','completed','valid','numericalFailures','unstarted','incomplete'];keys(c.denominators,dk,dk,'denominators');const d=c.denominators;for(const x of Object.values(d))integer(x,'denominator',0,128);
    if(!Array.isArray(c.trials)||d.planned!==128||d.started<d.completed||d.completed!==d.valid+d.numericalFailures||d.unstarted!==128-d.started||d.incomplete!==d.started-d.completed||c.trials.length!==d.completed)fail('Incomplete denominator accounting');
    if(c.status==='pending'&&(d.started||d.completed))fail('Pending condition contains trials');if(c.status==='completed'&&d.completed!==128)fail('Completed condition lost trials');
    let valid=0,large=0,boundary=0,ties=0,sum=0;
    for(let j=0;j<c.trials.length;j++){
      const t=c.trials[j],tk=['trial','status','estimateDegrees','errorDegrees','bestIndex','bestScore','alphaHat','tieCount','boundaryHit'];keys(t,tk,tk,'trial');
      if(t.trial!==j)fail('Dropped/reordered trial');integer(t.tieCount,'tie count',0,18001);if(typeof t.boundaryHit!=='boolean')fail('Boundary flag must be boolean');
      if(t.status==='valid'){
        valid++;finite(t.estimateDegrees,'estimate',-90,90);finite(t.errorDegrees,'error',-180,180);integer(t.bestIndex,'best index',0,18000);finite(t.bestScore,'best score',0);if(t.tieCount<1)fail('Valid estimate requires finite best score tie count');
        keys(t.alphaHat,['real','imag'],['real','imag'],'alphaHat');finite(t.alphaHat.real,'alphaHat.real');finite(t.alphaHat.imag,'alphaHat.imag');
        if(t.errorDegrees!==t.estimateDegrees-input.thetaDegrees)fail('Error truth mismatch');if(t.estimateDegrees!==gridAngle(r.grid,t.bestIndex))fail('Estimate grid mismatch');if(t.boundaryHit!==(t.bestIndex===0||t.bestIndex===18000))fail('Boundary index mismatch');
        sum+=t.errorDegrees**2;if(Math.abs(t.errorDegrees)>5)large++;if(t.boundaryHit)boundary++;if(t.tieCount>1)ties++;
      }else if(t.status!=='numerical_failure'||t.estimateDegrees!==null||t.errorDegrees!==null||t.bestIndex!==null||t.bestScore!==null||t.alphaHat!==null||t.tieCount!==0||t.boundaryHit!==false)fail('Invalid failure trial');
    }
    for(const k of ['largeErrorCount','boundaryHits','tieTrials'])integer(c[k],k,0,128);
    if(valid!==d.valid||large!==c.largeErrorCount||boundary!==c.boundaryHits||ties!==c.tieTrials)fail('Trial counts mismatch');same(c.bound,rootCrb(r.source,c.snrDb),'Receiver CRB scaling');if(c.rootCrbDegrees!==c.bound.rootCrbDegrees)fail('Root CRB mismatch');
    if(c.status==='completed'&&d.valid===128){if(c.rmseDegrees!==Math.sqrt(sum/128))fail('RMSE mismatch');same(c.ci95Degrees,bootstrapCI(c.trials.map(t=>t.errorDegrees),r.noiseSeed),'Bootstrap');}else if(c.rmseDegrees!==null||c.ci95Degrees!==null)fail('Partial/invalid condition cannot have final metrics');
    const {trials,bound,...compact}=c;same(compact,summary.conditions[index],'Compact condition');
  });
  if(summary.status==='completed'&&record.conditions.some(c=>c.status!=='completed'))fail('Incomplete job claims completion');
  if(record.trial0!==null){
    const t=record.trial0;keys(t,['snrDb','trial','noise','Y','scores'],['snrDb','trial','noise','Y','scores'],'trial0');if(t.trial!==0||t.snrDb!==r.selectedSnrDb)fail('Profile selection mismatch');matrix(t.noise,input.Nr,input.L,'trial0.noise');matrix(t.Y,input.Nr,input.L,'trial0.Y');
    const rng=createRng(r.noiseSeed),noise=mat(input.Nr,input.L);for(let n=0;n<input.Nr;n++)for(let l=0;l<input.L;l++){const z=complexNoise(rng,input.radarNoiseMw);noise.real[n][l]=z.real;noise.imag[n][l]=z.imag;}same(t.noise,noise,'Seeded first noise');
    const S=exactStreams(),W=r.source.solverRecord.result.Wc,X=transmit(W,S),alpha={real:Math.sqrt(rootCrb(r.source,t.snrDb).alphaSquared),imag:0},Y=observe({X,Nr:input.Nr,thetaDegrees:input.thetaDegrees,alpha,noise});same(t.Y,Y,'Actual raw first Y');
    const c=record.conditions.find(c=>c.snrDb===t.snrDb),first=c.trials[0];
    if(t.scores!==null){
      if(!Array.isArray(t.scores)||t.scores.length!==18001||!first)fail('Profile length/completion');for(const x of t.scores)if(x!==null)finite(x,'Profile score',0);
      // One bounded profile replay validates saved evidence; never allocate a trial × angle cube.
      const replay=profileML({Y,W,Nr:input.Nr,S});for(let q=0;q<18001;q++){if(Number.isFinite(replay.scores[q]))close(t.scores[q],replay.scores[q],'Profile score');else if(t.scores[q]!==null)fail('Masked profile score');}
      if(first.status!==replay.status||first.bestIndex!==replay.bestIndex||first.tieCount!==replay.tieCount)fail('First estimate replay mismatch');
      if(first.status==='valid'){close(first.bestScore,replay.bestScore,'First best score');close(first.alphaHat.real,replay.alphaHat.real,'First alpha real');close(first.alphaHat.imag,replay.alphaHat.imag,'First alpha imaginary');
        same(summary.profile,{snrDb:c.snrDb,trial:0,estimateDegrees:first.estimateDegrees,truthDegrees:input.thetaDegrees,points:displayProfile(replay.scores,gridSpec(r.grid),first.bestIndex),maskedCount:replay.maskedCount},'Display profile');
      }else if(summary.profile!==null)fail('Invalid estimate cannot have profile');
    }else if(first||summary.profile!==null)fail('Missing completed first profile');
  }else if(summary.profile!==null)fail('Profile has no raw-Y evidence');
  return record;
}
return Object.freeze({VERSION,GRID,LIMITS,NOISE,createSource,validateSource,createRequest,validateRequest,createRng,complexNoise,steering,exactStreams,transmit,observe,compress,createSearch,profileML,rootCrb,bootstrapCI,displayProfile,createExperiment,validateRecord,digest});
});
