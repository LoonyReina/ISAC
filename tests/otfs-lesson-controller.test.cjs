const test=require('node:test');
const assert=require('node:assert/strict');
const {Worker}=require('node:worker_threads');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const root=path.resolve(__dirname,'../labs/otfs-receiver');
const moduleOf=name=>import(pathToFileURL(path.join(root,name)).href);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fixture(task,{large=false}={}){
  if(task==='communication'){
    const {generateObservation}=await moduleOf('communication/simulation.mjs');
    return generateObservation({frame:{N:3,M:4},paths:[{delayBin:.7,dopplerBin:.35,gain:{re:1,im:0}},{delayBin:2.2,dopplerBin:-.65,gain:{re:.45,im:.25}}],order:16,noiseVariance:.1,seed:2019,settings:{maxIterations:100,tolerance:1e-14,damping:.5,edgeTolerance:0,captureHistory:true}}).receiver;
  }
  const {createTemplateOperator}=await moduleOf('sensing/operators.mjs');
  const frame={N:4,M:8,T:6.4e-6,fc:5.89e9},x=Array.from({length:32},(_,i)=>({re:i%2?-.707:.707,im:i%3?-.707:.707}));
  const y=createTemplateOperator(frame,x,'eq14_literal').apply(1.2,.6);
  return {frame,x,y,model:'eq14_literal',noiseVariance:.03,bounds:[[.05,3.8],[-1.4,1.4]],gridShape:large?[129,129]:[9,9],settings:{maxEvaluations:16641,maxElapsedMs:30000,chunkCandidates:large?1:8}};
}
async function until(predicate,timeout=15000){const start=Date.now();while(!predicate()){if(Date.now()-start>timeout)throw new Error('Timed out awaiting actual Worker state');await wait(5);}}
for(const task of ['sensing','communication']){
  test(`${task}: actual Node Worker completion, identity, settings and current-result lifecycle`,async()=>{
    const {createLessonSession}=await moduleOf('lesson-controller.mjs');let state;const states=[];
    const session=createLessonSession({task,workerFactory:()=>new Worker(path.join(root,task,'node-worker.mjs')),onState:s=>{state=s;states.push(s.status);}});
    try{const receiver=await fixture(task);await session.run(receiver,{evaluation:{DO_NOT_SEND:true}});
      await until(()=>state.status==='completed');assert.match(state.inputDigest,/^sha256:/);assert.equal(state.terminal.inputDigest,state.inputDigest);
      const actual=task==='sensing'?state.terminal.result.receiver:state.terminal.receiver;
      assert.deepEqual(actual,receiver);assert.equal('evaluation' in actual,false);
      session.invalidate();assert.equal(state.status,'stale');assert.equal(state.terminal,null);
      session.reset();assert.equal(state.status,'idle');assert.equal(state.receiver,null);
      assert.ok(states.includes('running'));
    }finally{session.dispose();}
  });
  test(`${task}: actual cancellation and superseding Run cannot commit old result`,async()=>{
    const {createLessonSession}=await moduleOf('lesson-controller.mjs');let state;
    const session=createLessonSession({task,workerFactory:()=>new Worker(path.join(root,task,'node-worker.mjs')),onState:s=>{state=s;}});
    try{const receiver=await fixture(task,{large:true});await session.run(receiver);
      await until(()=>!!state.progress);assert.equal(session.cancel(),true);await until(()=>state.status==='cancelled');
      const first=await session.run(receiver),second=await session.run({...receiver,settings:{...receiver.settings,...(task==='sensing'?{maxEvaluations:7}:{maxIterations:1})}});
      assert.notEqual(first,second);await until(()=>state.status==='completed');assert.equal(state.terminal.requestId,second);
      assert.equal(task==='sensing'?state.terminal.result.status:state.terminal.methods.mpg.status,task==='sensing'?'evaluation-cap':'max-iterations');
    }finally{session.dispose();}
  });
  test(`${task}: malformed newer request clears older successful output`,async()=>{
    const {createLessonSession}=await moduleOf('lesson-controller.mjs');let state;
    const session=createLessonSession({task,workerFactory:()=>new Worker(path.join(root,task,'node-worker.mjs')),onState:s=>{state=s;}});
    try{await session.run(await fixture(task,{large:true}));await session.run({truth:17});assert.equal(state.status,'invalid-input');await wait(80);assert.equal(state.status,'invalid-input');assert.equal(state.terminal,null);}finally{session.dispose();}
  });
  test(`${task}: frozen browser endpoint runs through real Node Worker self shim`,async()=>{
    // Adapter wiring only. This is deliberately not a browser or UI execution claim.
    const {createLessonSession}=await moduleOf('lesson-controller.mjs');let state;
    const endpoint=pathToFileURL(path.join(root,task,'browser-worker.mjs')).href;
    const source=`const{parentPort}=require('node:worker_threads');globalThis.self={postMessage:x=>parentPort.postMessage(x)};const q=[];parentPort.on('message',data=>self.onmessage?self.onmessage({data}):q.push(data));import(${JSON.stringify(endpoint)}).then(()=>{for(const data of q)self.onmessage({data});});`;
    const session=createLessonSession({task,workerFactory:()=>new Worker(source,{eval:true}),onState:s=>{state=s;}});
    try{await session.run(await fixture(task));await until(()=>state.status==='completed');assert.equal(state.terminal.status,'completed');}finally{session.dispose();}
  });
}
test('late packets, wrong digests, edit during digest, cancel-before-post and reset are gated',async()=>{
  const {createLessonSession}=await moduleOf('lesson-controller.mjs');let state,listener;const posted=[];
  const fake={postMessage:m=>posted.push(m),addEventListener:(name,fn)=>{if(name==='message')listener=fn;},terminate(){}};
  const session=createLessonSession({task:'communication',workerFactory:()=>fake,onState:s=>state=s});
  const receiver=await fixture('communication');
  const pending=session.run(receiver);session.invalidate();await pending;assert.equal(posted.length,0);assert.equal(state.status,'stale');
  await session.run(receiver);const old=posted.at(-1);session.invalidate();listener({data:{type:'terminal',status:'completed',requestId:old.requestId,inputDigest:'bad'}});assert.equal(state.status,'stale');
  await session.run(receiver);listener({data:{type:'terminal',status:'completed',requestId:state.requestId,inputDigest:'sha256:wrong'}});assert.equal(state.status,'error');assert.equal(state.terminal,null);
  const cancelling=session.run(receiver);session.cancel();await cancelling;assert.equal(state.status,'cancelled');
  await session.run(receiver);const lastId=state.requestId;session.reset();listener({data:{type:'terminal',status:'completed',requestId:lastId,inputDigest:'bad'}});assert.equal(state.status,'idle');session.dispose();
});
