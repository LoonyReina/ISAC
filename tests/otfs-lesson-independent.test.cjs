'use strict';
/** Independent adapter audit. Node only: fake DOM is a wiring harness, not browser QA. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {Worker}=require('node:worker_threads');
const root=path.resolve(__dirname,'../labs/otfs-receiver');
const mod=file=>import(pathToFileURL(path.join(root,file)).href);
let model,evidence,controller,sensing;
test.before(async()=>{[model,evidence,controller,sensing]=await Promise.all(['lesson-model.mjs','lesson-evidence.mjs','lesson-controller.mjs','sensing/kernel.mjs'].map(mod));});
const clone=x=>structuredClone(x);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check,ms=12000){const start=Date.now();while(!check()){if(Date.now()-start>ms)throw Error('Timed out in independent Node harness');await sleep(5);}}
const close=(a,b,tol=2e-11)=>assert.ok(Math.abs(a-b)<=tol*(1+Math.abs(a)+Math.abs(b)),`${a} differs from ${b}`);
const cmul=(a,b)=>({re:a.re*b.re-a.im*b.im,im:a.re*b.im+a.im*b.re});
const cexp=t=>({re:Math.cos(t),im:Math.sin(t)});
const cadd=(a,b)=>({re:a.re+b.re,im:a.im+b.im});
function dftMean(n,alpha){let z={re:0,im:0};for(let t=0;t<n;t++)z=cadd(z,cexp(2*Math.PI*t*alpha/n));return {re:z.re/n,im:z.im/n};}
function directLiteral(f,x,q,a){
  // Full matrix entry construction, independent of the factorized production action.
  return x.map((_,row)=>{const k=row%f.N,l=Math.floor(row/f.N);let sum={re:0,im:0};for(let col=0;col<x.length;col++){
    const kp=col%f.N,lp=Math.floor(col/f.N),wrap=lp>=f.M-Math.ceil(q)?1:0;
    const phase=cexp(2*Math.PI*(a*lp/(f.N*f.M)-wrap*(kp+a)/f.N));
    sum=cadd(sum,cmul(cmul(cmul(dftMean(f.N,kp-k+a),dftMean(f.M,lp-l+q)),phase),x[col]));
  }return sum;});
}
function directFiniteQuadrature(f,x,q,a){
  // Independent waveform midpoint integration, split exactly at pulse boundaries.
  const {N,M}=f,D=N*M,delay=q/M,nu=a/N,X=Array.from({length:D},(_,row)=>{const n=row%N,m=Math.floor(row/N);let sum={re:0,im:0};for(let col=0;col<D;col++){const k=col%N,l=Math.floor(col/N);sum=cadd(sum,cmul(x[col],cexp(2*Math.PI*(n*k/N-m*l/M))));}return {re:sum.re/Math.sqrt(D),im:sum.im/Math.sqrt(D)};});
  const Y=Array.from({length:D},()=>({re:0,im:0}));
  for(let n=0;n<N;n++)for(const [lo,hi]of [[n,n+delay],[n+delay,n+1]]){const count=4096,dt=(hi-lo)/count;if(dt===0)continue;for(let s=0;s<count;s++){
    const t=lo+(s+.5)*dt,tx=t-delay,np=Math.floor(tx);if(np<0||np>=N)continue;
    let wave={re:0,im:0};for(let mp=0;mp<M;mp++)wave=cadd(wave,cmul(X[np+N*mp],cexp(2*Math.PI*mp*tx)));
    wave=cmul(wave,cexp(2*Math.PI*nu*(t-delay)));
    for(let m=0;m<M;m++){const value=cmul(wave,cexp(-2*Math.PI*m*t)),d=n+N*m;Y[d].re+=dt*value.re;Y[d].im+=dt*value.im;}
  }}
  return x.map((_,row)=>{const k=row%N,l=Math.floor(row/N);let sum={re:0,im:0};for(let col=0;col<D;col++){const n=col%N,m=Math.floor(col/N);sum=cadd(sum,cmul(Y[col],cexp(-2*Math.PI*(n*k/N-m*l/M))));}return {re:sum.re/Math.sqrt(D),im:sum.im/Math.sqrt(D)};});
}
async function realTerminal(task,receiver,endpoint='node-worker.mjs'){
  const worker=endpoint==='node-worker.mjs'?new Worker(path.join(root,task,endpoint)):shimWorker(pathToFileURL(path.join(root,task,endpoint)));
  try{return await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Worker timed out')),12000);worker.on('error',reject);worker.on('message',value=>{if(value.type==='terminal'){clearTimeout(timeout);resolve(value);}});worker.postMessage({type:'run',requestId:'independent-evidence',receiver});});}finally{await worker.terminate();}
}
function shimWorker(url){const source=`const{parentPort}=require('node:worker_threads');globalThis.self={postMessage:x=>parentPort.postMessage(x)};const pending=[];parentPort.on('message',x=>self.onmessage?self.onmessage({data:x}):pending.push(x));import(${JSON.stringify(String(url))}).then(()=>{for(const x of pending)self.onmessage({data:x});});`;return new Worker(source,{eval:true});}
const smallSense=()=>model.generateSensing({gridShape:[3,4],settings:{maxEvaluations:12,maxElapsedMs:30000,chunkCandidates:3}});
const smallComm=(settings={})=>model.generateCommunication({settings:{...model.DEFAULT_COMMUNICATION_CONFIG.settings,maxIterations:2,...settings}});

test('independent frozen-source comparison covers every accepted module byte',t=>{
  for(const [task,accepted]of [['sensing','otfs-sensing-browser-prototype'],['communication','otfs-mpg-browser-prototype']]){
    const source=`/workspace/shared/isac-paper-execution/${accepted}/src`;
    // The source bundle is an optional independent audit input, not a build dependency.
    if(!fs.existsSync(source)){t.skip('Original accepted source bundle absent here; portable FREEZE hash checks remain mandatory in page tests');return;}
    const files=fs.readdirSync(source).filter(x=>x.endsWith('.mjs'));
    assert.ok(files.length>=5);for(const file of files)assert.deepEqual(fs.readFileSync(path.join(root,task,file)),fs.readFileSync(path.join(source,file)),`${task}/${file} differs from accepted source`);
  }
});
test('independent dense Eq14 and finite waveform quadrature verify effective gain phase',()=>{
  const frame={N:2,M:3,T:12.5e-6,fc:24e9},gain={re:-.63,im:.48};
  for(const generationModel of ['eq14_literal','exact_rect_finite']){
    const o=model.generateSensing({frame,generationModel,fittedModel:generationModel,delayBin:1.11,dopplerBin:-.37,gain,dataSeed:7189,noiseSeed:9324,bounds:[[.02,2.8],[-1.1,1.1]],gridShape:[3,4]});
    const expected=(generationModel==='eq14_literal'?directLiteral:directFiniteQuadrature)(frame,o.receiver.x,1.11,-.37).map(z=>cmul(gain,z));
    expected.forEach((z,i)=>{close(o.evaluation.noiseless[i].re,z.re,generationModel==='eq14_literal'?2e-12:2e-6);close(o.evaluation.noiseless[i].im,z.im,generationModel==='eq14_literal'?2e-12:2e-6);close(o.receiver.y[i].re,o.evaluation.noiseless[i].re+o.evaluation.noiseSamples[i].re);close(o.receiver.y[i].im,o.evaluation.noiseless[i].im+o.evaluation.noiseSamples[i].im);});
  }
});
test('physical errors obey seconds/hertz and monostatic scales for arbitrary frame',()=>{
  const observation=model.generateSensing({frame:{N:3,M:4,T:9e-6,fc:9.75e9},gridShape:[3,3]}),result={receiver:observation.receiver,selected:{delayBin:1.77,dopplerBin:-.44,gain:{re:-.2,im:.6}}};
  const e=model.evaluateSensing(result,observation.evaluation),{T,M,N,fc}=observation.receiver.frame;
  close(e.monostaticRangeErrorM,299792458*(1.77-1.2)*T/(2*M));
  close(e.monostaticVelocityErrorMps,299792458*(-.44-.6)/(2*fc*N*T));
  close(e.gainError,Math.hypot(-.2-.8,.6-.3));
});
test('independent seed crossings, 9x noise variance and shifted truth retain declared search',()=>{
  const a=model.generateSensing({dataSeed:193,noiseSeed:491,noiseVariance:.021}),b=model.generateSensing({dataSeed:718,noiseSeed:491,noiseVariance:.189}),c=model.generateSensing({dataSeed:193,noiseSeed:719,noiseVariance:.021}),shifted=model.generateSensing({delayBin:7.3,dopplerBin:3.3});
  assert.notDeepEqual(a.receiver.x,b.receiver.x);assert.deepEqual(a.receiver.x,c.receiver.x);assert.notDeepEqual(a.evaluation.noiseSamples,c.evaluation.noiseSamples);
  a.evaluation.noiseSamples.forEach((z,i)=>{close(b.evaluation.noiseSamples[i].re,3*z.re);close(b.evaluation.noiseSamples[i].im,3*z.im);});
  assert.deepEqual(shifted.receiver.bounds,a.receiver.bounds);assert.equal(shifted.receiver.bounds[0][1]<shifted.evaluation.trueDelayBin,true);
});
test('both adapters isolate mutation, same observation setting changes and generator truth',()=>{
  for(const task of ['sensing','communication']){
    const o=task==='sensing'?smallSense():smallComm();const raw=clone(o),r=task==='sensing'?model.sensingReceiver(raw,{gridShape:[7,8],settings:{maxEvaluations:5}}):model.communicationReceiver(raw,{damping:.43,maxIterations:3});
    raw.receiver.y[0].re=100;raw.evaluation=null;raw.generator=null;
    assert.deepEqual(r.y,o.receiver.y);assert.ok(Object.isFrozen(r.y[0]));assert.throws(()=>{r.y[0].re=123;},TypeError);
    assert.deepEqual(Object.keys(r).filter(k=>/truth|eval|seed|generat|initial/i.test(k)),[]);
  }
});
test('model mismatch withholds every physical/gain truth error; communication stays zero pruning',async()=>{
  const o=smallSense(),receiver=model.sensingReceiver(o,{model:'exact_rect_finite'}),r=sensing.solveSync(receiver,{now:()=>0}),e=model.evaluateSensing(r,o.evaluation);
  assert.equal(e.status,'unavailable-model-mismatch');for(const [key,value]of Object.entries(e))if(/error/i.test(key))assert.equal(value,null);
  const c=smallComm(),t=await realTerminal('communication',c.receiver);
  assert.equal(c.receiver.settings.edgeTolerance,0);assert.equal(t.methods.mpg.graph.cutoff,0);assert.equal(t.methods.mpg.graph.removedGramFrobenius,0);
});
for(const task of ['sensing','communication'])test(`${task} exact-array import discards claimed outputs and truth; fresh real Worker recomputes`,async()=>{
  const o=task==='sensing'?smallSense():smallComm({captureHistory:false}),terminal=await realTerminal(task,o.receiver),record=await model.exportRecord(task,terminal,o);
  assert.equal(Buffer.byteLength(record.text,'utf8'),record.utf8Bytes);
  const parsed=JSON.parse(record.text);if(task==='sensing')parsed.terminal.result.selected.gain.re+=.123;else parsed.terminal.methods.mpg.posteriorInterpretation='Untrusted forged claim';
  const imported=await model.importInputs(JSON.stringify(parsed));assert.deepEqual(imported.receiver,o.receiver);assert.equal(imported.observation.evaluation,null);assert.equal(imported.status,'unverified-import');
  assert.equal('terminal' in imported,false);assert.equal('methods' in imported,false);assert.equal('result' in imported,false);
  const rerun=await realTerminal(task,imported.receiver,'browser-worker.mjs');assert.equal(rerun.status,'completed');
  if(task==='sensing')assert.deepEqual(rerun.result.selected,terminal.result.selected);else{assert.deepEqual(rerun.methods.mpg.probabilities,terminal.methods.mpg.probabilities);assert.deepEqual(rerun.methods.mpg.history,[]);}
  parsed.terminal.unrecognized=true;await assert.rejects(model.importInputs(JSON.stringify(parsed)),/unexpected/);
});
test('shared 16 MiB exact UTF-8 boundary accepts equality and rejects one byte over',async()=>{
  assert.equal(evidence.MAX_RECORD_UTF8_BYTES,16*1024*1024);
  const overhead=Buffer.byteLength(JSON.stringify({unicode:''}));const ascii=evidence.MAX_RECORD_UTF8_BYTES-overhead-3;
  const exact={unicode:'a'.repeat(ascii)+'界'};const encoded=evidence.encodeBoundedRecord(exact);
  assert.equal(encoded.utf8Bytes,evidence.MAX_RECORD_UTF8_BYTES);assert.equal(evidence.decodeBoundedRecord(encoded.text).utf8Bytes,evidence.MAX_RECORD_UTF8_BYTES);
  const over={unicode:exact.unicode+'a'};assert.throws(()=>evidence.encodeBoundedRecord(over),e=>e.code==='evidence-too-large');
  const overText=JSON.stringify(over);assert.throws(()=>evidence.decodeBoundedRecord(overText),e=>e.code==='evidence-too-large');
  await assert.rejects(model.importInputs(overText),e=>e.code==='evidence-too-large');
});
test('controller digest race, invalid replacement and cancellation gate independently constructed packets',async()=>{
  let listener;const sent=[],states=[];const fake={postMessage:x=>sent.push(clone(x)),addEventListener:(event,fn)=>{if(event==='message')listener=fn;},terminate(){}};
  const session=controller.createLessonSession({task:'sensing',workerFactory:()=>fake,onState:s=>states.push(s)}),r=smallSense().receiver;
  try{
    const pending=session.run(r);session.invalidate('edited before SHA-256 finishes');await pending;assert.equal(sent.length,0);assert.equal(session.getState().status,'stale');
    await session.run(r);const first=sent.at(-1),identity=session.getState().inputDigest;
    await session.run({...r,settings:{...r.settings,maxEvaluations:1}});const second=sent.at(-1);
    listener({data:{type:'terminal',requestId:first.requestId,inputDigest:identity,status:'completed',result:'stale forged'}});assert.equal(session.getState().status,'running');
    session.cancel();listener({data:{type:'terminal',requestId:second.requestId,inputDigest:session.getState().inputDigest,status:'completed',result:'racing completion'}});assert.equal(session.getState().status,'cancelled');assert.equal(session.getState().terminal,null);
    await session.run(r);const third=sent.at(-1);await session.run({unknown:'truth'});assert.equal(session.getState().status,'invalid-input');assert.ok(sent.some(x=>x.type==='cancel'&&x.requestId===third.requestId));
    listener({data:{type:'terminal',requestId:third.requestId,inputDigest:identity,status:'completed'}});assert.equal(session.getState().status,'invalid-input');
    const before=session.run(r);session.cancel();await before;assert.equal(session.getState().status,'cancelled');
  }finally{session.dispose();}
});

// Small, intentionally non-browser DOM/event harness. Canvas is not executed.
class Element{
  constructor(name='DIV',value=''){this.tagName=name;this.value=value;this.initial=this.value;this.children=[];this.textContent='';this.listeners={};this.disabled=false;this.checked=false;this.hidden=false;this.options=[];}
  set value(value){this._value=String(value);}
  get value(){return this._value;}
  set textContent(value){this._text=String(value);this.children=[];}
  get textContent(){return this._text+this.children.map(node=>node.textContent??'').join('');}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  dispatch(type,event={}){for(const fn of this.listeners[type]??[])fn({target:this,preventDefault(){},...event});}
  append(...nodes){this.children.push(...nodes);if(this.tagName==='SELECT')this.options.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;this._text='';}
  setAttribute(name,value){this[name]=value;}
  getContext(){return null;}
  focus(){}
  matches(){return true;}
  remove(){}
  click(){this.dispatch('click');}
}
function fakeDOM(){
  const canonical=path.resolve(__dirname,'../content/pages/otfs-receiver.html'),html=fs.readFileSync(fs.existsSync(canonical)?canonical:path.resolve(__dirname,'../otfs-receiver.html'),'utf8');
  const ids=new Map(),get=id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id);};
  for(const match of html.matchAll(/<(input|select|button|canvas|svg)\b([^>]*)>/g)){
    const id=match[2].match(/\bid="([^"]+)"/)?.[1];if(!id)continue;
    const el=new Element(match[1].toUpperCase(),match[2].match(/\bvalue="([^"]*)"/)?.[1]??'');el.disabled=/\bdisabled\b/.test(match[2]);ids.set(id,el);
  }
  for(const task of ['sensing','communication']){
    const form=get(task+'-form'),source=html.match(new RegExp(`<form[^>]*id="${task}-form"[^>]*>([\\s\\S]*?)</form>`))?.[1];assert.ok(source,`Missing ${task} form`);
    const fields=new Map();
    for(const match of source.matchAll(/<(input|select)\b([^>]*)>/g)){
      const attrs=match[2],name=attrs.match(/\bname="([^"]+)"/)?.[1],id=attrs.match(/\bid="([^"]+)"/)?.[1];if(!name||!id)continue;
      const el=get(id);el.name=name;el.generation=/\bdata-generation\b/.test(attrs);
      if(match[1]==='select'){
        const rest=source.slice(match.index+match[0].indexOf('>')+1).split('</select>')[0];
        el.options=Array.from(rest.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g),m=>{const o=new Element('OPTION',m[1].match(/value="([^"]*)"/)[1]);o.textContent=m[2];o.selected=/\bselected\b/.test(m[1]);return o;});
        el.value=(el.options.find(o=>o.selected)??el.options[0]).value;
      }
      el.initial=el.value;fields.set(name,el);
    }
    form.elements={namedItem:name=>fields.get(name)};form.querySelectorAll=()=>Array.from(fields.values()).filter(el=>el.generation);form.reset=()=>{for(const el of fields.values())el.value=el.initial;};
  }
  const window=new Element('WINDOW');
  return {ids,get,document:{getElementById:get,createElement:name=>new Element(name.toUpperCase()),createElementNS:(_ns,name)=>new Element(name),body:new Element('BODY')},window};
}
async function withUI(body){
  // Import before injecting document so automatic initialization cannot run twice.
  const ui=await mod('otfs-receiver.mjs'),dom=fakeDOM(),saved={document:global.document,window:global.window,Worker:global.Worker};
  global.document=dom.document;global.window=dom.window;global.Worker=class{constructor(url){return shimWorker(url);}};
  const tasks=ui.startLesson();try{return await body({...dom,tasks});}finally{for(const data of Object.values(tasks))data.session.dispose();for(const [key,value]of Object.entries(saved)){if(value===undefined)delete global[key];else global[key]=value;}}
}
async function commRecord(){const o=smallComm({captureHistory:false}),t=await realTerminal('communication',o.receiver);return model.exportRecord('communication',t,o);}
test('Node DOM wiring: imported captureHistory false renders final posterior without fabricated history',async()=>{
  const record=await commRecord();await withUI(async({get,tasks})=>{
    get('otfs-import').files=[{size:record.utf8Bytes,text:async()=>record.text}];get('otfs-import').dispatch('change');await until(()=>tasks.communication.session.getState().status==='completed');
    assert.equal(tasks.communication.session.getState().terminal.methods.mpg.history.length,0);
    assert.doesNotMatch(get('communication-history-summary').textContent,/视图输入无效/);
    assert.ok(get('communication-marginals').children.length>0,'final marginals should render without history');
    assert.equal(get('communication-history').disabled,true);
    get('communication-form').dispatch('submit');await until(()=>tasks.communication.session.getState().status==='completed');
    assert.equal(tasks.communication.session.getState().receiver.settings.captureHistory,false,'subsequent Run must preserve imported history setting');
  });
});
test('Node DOM wiring: Reset during pending import prevents that import taking over',async()=>{
  const record=await commRecord();await withUI(async({get,tasks})=>{
    let release;get('otfs-import').files=[{size:record.utf8Bytes,text:()=>new Promise(resolve=>{release=resolve;})}];get('otfs-import').dispatch('change');
    assert.equal(typeof release,'function');get('communication-reset').dispatch('click');release(record.text);await sleep(250);
    assert.equal(tasks.communication.session.getState().status,'idle');assert.equal(tasks.communication.imported,false);
  });
});
test('Node DOM wiring: edit during pending import preserves the edited inputs',async()=>{
  const record=await commRecord();await withUI(async({get,tasks})=>{
    let release;get('otfs-import').files=[{size:record.utf8Bytes,text:()=>new Promise(resolve=>{release=resolve;})}];get('otfs-import').dispatch('change');
    const field=get('communication-form').elements.namedItem('damping');field.value='.57';get('communication-form').dispatch('input',{target:field});release(record.text);await sleep(250);
    assert.equal(tasks.communication.session.getState().status,'stale');assert.equal(field.value,'.57');assert.equal(tasks.communication.imported,false);
  });
});
test('replacement cancelled/reset/edited during digest also stops older posted Worker work',async()=>{
  for(const action of ['cancel','reset','invalidate']){
    const sent=[],worker={postMessage:x=>sent.push(x),addEventListener(){},terminate(){}},session=controller.createLessonSession({task:'sensing',workerFactory:()=>worker});
    try{const r=smallSense().receiver;await session.run(r);const old=sent.at(-1).requestId,pending=session.run(r);session[action]();await pending;
      assert.ok(sent.some(x=>x.type==='cancel'&&x.requestId===old),`${action} must stop older posted work when replacement never posts`);
    }finally{session.dispose();}
  }
});
test('actual Node Worker failure is recoverable on the next Run',async()=>{
  let count=0;const session=controller.createLessonSession({task:'sensing',workerFactory:()=>++count===1?new Worker("throw Error('independent injected endpoint failure')",{eval:true}):new Worker(path.join(root,'sensing/node-worker.mjs'))});
  try{const r=smallSense().receiver;await session.run(r);await until(()=>session.getState().status==='error');assert.match(session.getState().error.message,/injected endpoint failure/);await session.run(r);await until(()=>session.getState().status==='completed');assert.equal(count,2);assert.equal(session.getState().terminal.result.operatorEvaluations,12);}finally{session.dispose();}
});
test('Node DOM real default submissions, manual views, same-y comparisons and reset lifecycle',async()=>{
  await withUI(async({get,tasks})=>{
    for(const task of ['sensing','communication'])get(task+'-form').dispatch('submit');
    await until(()=>Object.values(tasks).every(t=>t.session.getState().status==='completed'));
    const sense=tasks.sensing.session.getState(),comm=tasks.communication.session.getState(),originalY=clone(sense.receiver.y);
    assert.equal(sense.terminal.result.operatorEvaluations,4225);assert.equal(comm.receiver.settings.maxIterations,30);assert.equal(comm.receiver.settings.edgeTolerance,0);
    assert.equal(get('sensing-inspect').disabled,false);assert.ok(get('sensing-samples').children.length>0);assert.ok(get('communication-marginals').children.length>0);
    for(const task of ['sensing','communication']){const before=tasks[task].session.getState();get(task+'-truth').checked=true;get(task+'-truth').dispatch('change');assert.equal(tasks[task].session.getState().requestId,before.requestId);assert.equal(tasks[task].session.getState().inputDigest,before.inputDigest);assert.equal(get(task+'-evaluation').hidden,false);}
    assert.equal(JSON.parse(get('sensing-evaluation').textContent).generationTruth.q,sense.observation.evaluation.trueDelayBin);assert.match(get('communication-evaluation').textContent,/实际符号/);
    get('sensing-q').value=1.333;get('sensing-a').value=-.27;get('sensing-inspect').dispatch('click');assert.match(get('sensing-candidate').textContent,/1.333/);assert.equal(tasks.sensing.session.getState().inputDigest,sense.inputDigest);
    get('communication-next').dispatch('click');assert.equal(get('communication-history').value,'1');assert.match(get('communication-history-summary').textContent,/第 1 轮/);assert.equal(tasks.communication.session.getState().inputDigest,comm.inputDigest);
    const diagnostics=JSON.parse(get('communication-values').textContent).lmmseDiagnostics;assert.equal(diagnostics.solveRelativeResidual,comm.terminal.methods.lmmse.solveRelativeResidual);
    const commForm=get('communication-form'),damping=commForm.elements.namedItem('damping');damping.value=.7;commForm.dispatch('input',{target:damping});commForm.dispatch('submit');await until(()=>tasks.communication.session.getState().status==='completed');assert.deepEqual(tasks.communication.session.getState().receiver.y,comm.receiver.y);assert.deepEqual(tasks.communication.session.getState().receiver.H,comm.receiver.H);assert.notEqual(tasks.communication.session.getState().inputDigest,comm.inputDigest);
    get('sensing-baseline').dispatch('click');assert.ok(get('sensing-comparison').children.length>0);
    const form=get('sensing-form'),budget=form.elements.namedItem('maxEvaluations');budget.value=7;form.dispatch('input',{target:budget});assert.equal(get('sensing-inspect').disabled,true);form.dispatch('submit');await until(()=>tasks.sensing.session.getState().status==='completed');assert.deepEqual(tasks.sensing.session.getState().receiver.y,originalY);assert.ok(get('sensing-comparison').children.length>0);
    const delay=form.elements.namedItem('delayBin');delay.value=2.2;form.dispatch('input',{target:delay});form.dispatch('submit');await until(()=>tasks.sensing.session.getState().status==='completed');assert.notDeepEqual(tasks.sensing.session.getState().receiver.y,originalY);assert.match(get('sensing-comparison').textContent,/不能公平比较/);
    form.elements.namedItem('gridSize').value=129;budget.value=16641;form.dispatch('input',{target:budget});form.dispatch('submit');await until(()=>tasks.sensing.session.getState().status==='running');get('sensing-reset').dispatch('click');await sleep(150);assert.equal(tasks.sensing.session.getState().status,'idle');assert.equal(get('sensing-export').disabled,true);assert.equal(get('sensing-inspect').disabled,true);assert.equal(tasks.sensing.baseline,null);
    // BR-1: imported generation metadata remains untrusted. The default-model
    // choice means original receiver model, and its visible label must say so.
    const mismatch=model.generateSensing({generationModel:'eq14_literal',fittedModel:'exact_rect_finite',gridShape:[3,4]}),terminal=await realTerminal('sensing',mismatch.receiver),record=await model.exportRecord('sensing',terminal,mismatch);
    get('otfs-import').files=[{size:record.utf8Bytes,text:async()=>record.text}];get('otfs-import').dispatch('change');await until(()=>tasks.sensing.session.getState().status==='completed');
    const choice=form.elements.namedItem('fittedModel'),originalOption=choice.options.find(option=>option.value==='matched');assert.equal(originalOption.textContent,'original · 原始导入接收机模型（exact_rect_finite）');assert.doesNotMatch(originalOption.textContent,/与生成模型匹配/);
    choice.value='matched';form.dispatch('input',{target:choice});form.dispatch('submit');await until(()=>tasks.sensing.session.getState().status==='completed');assert.equal(tasks.sensing.session.getState().receiver.model,'exact_rect_finite');assert.equal(tasks.sensing.session.getState().observation.evaluation,null);
    get('sensing-reset').dispatch('click');assert.equal(originalOption.textContent,'matched · 与生成模型匹配');assert.equal(tasks.sensing.imported,false);
  });
});
test('Node DOM pagehide persisted invalidates but can rerun; ordinary pagehide disposes',async()=>{
  await withUI(async({get,tasks,window})=>{
    const form=get('sensing-form');form.elements.namedItem('maxEvaluations').value=3;form.dispatch('submit');await until(()=>tasks.sensing.session.getState().status==='running');window.dispatch('pagehide',{persisted:true});assert.equal(tasks.sensing.session.getState().status,'stale');form.dispatch('submit');await until(()=>tasks.sensing.session.getState().status==='completed');window.dispatch('pagehide',{persisted:false});await assert.rejects(tasks.sensing.session.run(smallSense().receiver),/disposed/);
  });
});
