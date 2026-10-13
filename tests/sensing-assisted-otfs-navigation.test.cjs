'use strict';
// Mounted production UI + actual Node module Workers. Navigation events are a
// deterministic DOM model, not browser/layout/BFCache certification.
const {test,before}=require('node:test'),a=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {Worker}=require('node:worker_threads');
const root=path.resolve(__dirname,'..'),lesson=path.join(root,'labs/otfs-sensing-assisted/lesson');
const light=require(path.join(lesson,'tests/dom-harness.cjs'));
const page=['content/pages/otfs-sensing-assisted.html','otfs-sensing-assisted.html'].map(p=>path.join(root,p)).find(fs.existsSync);
const html=fs.readFileSync(page,'utf8'),initial='https://loonyreina.github.io/ISAC/otfs-sensing-assisted.html#gain-estimation';
let mount,defaults;
before(async()=>{({mount}=await import(pathToFileURL(path.join(lesson,'lesson.mjs'))));({defaults}=await import(pathToFileURL(path.join(lesson,'adapter.mjs'))));});
const timing={timeout:30000},quick=()=>({...defaults(),maxIterations:1});
const batch=()=>({...defaults(),frames:2,normalizations:['source_per_data','equal_total_frame']});
function gate(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function mounted(t,{location={href:initial},wrapWorker=w=>w}={}){
 const h=light(html),win=h.document.defaultView,workers=[],sent=[],messages=[],blobs=new Map(),revoked=[];
 win.location=location;
 const app=mount(h.document,{workerFactory:url=>{
  const w=new Worker(url,{type:'module',execArgv:[]}),post=w.postMessage.bind(w);
  w.postMessage=x=>{sent.push(x);return post(x);};w.on('message',x=>messages.push(x));workers.push(w);return wrapWorker(w,workers.length);
 },urlApi:{createObjectURL(blob){const id='blob:navigation-'+blobs.size;blobs.set(id,blob);return id;},revokeObjectURL(id){revoked.push(id);}}});
 t.after(async()=>{await app.destroy();await Promise.all(workers.map(w=>w.terminate()));});
 // Match native fragment traversal ordering: location first, then popstate,
 // then hashchange. Use the actual six-step link hrefs from the lesson markup.
 const history=[initial];let index=0;
 async function arrive(url){const oldURL=win.location.href;win.location.href=url;await h.fireWindow('popstate',{state:null});await h.fireWindow('hashchange',{oldURL,newURL:url});}
 const anchors=h.document.querySelectorAll('nav').find(n=>n.getAttribute('aria-label')==='六步学习').querySelectorAll('a');
 return {...h,app,win,workers,sent,messages,blobs,revoked,anchors,
  async anchor(hash){const link=anchors.find(n=>n.getAttribute('href')===hash);a.ok(link,'existing six-step link '+hash);const url=new URL(link.getAttribute('href'),win.location.href).href;history.splice(++index);history.push(url);await arrive(url);},
  async back(){a.ok(index>0);await arrive(history[--index]);},async forward(){a.ok(index<history.length-1);await arrive(history[++index]);},arrive};
}
function onProgress(h,stage,action){
 const done=gate(),session=h.app.session,render=session.onChange;let seen=false;
 session.onChange=s=>{render(s);if(!seen&&s.active?.entry.progress?.stage===stage){seen=true;session.onChange=render;try{Promise.resolve(action(s.active)).then(done.resolve,done.reject);}catch(e){done.reject(e);}}};
 return done.promise;
}
function sameOwner(h,owner,client,epoch,notice){a.equal(h.app.session.active,owner,'same running owner');a.equal(h.app.session.client,client,'same live Worker client');a.equal(h.app.session.epoch,epoch,'no lifecycle/file epoch change');a.equal(h.app.session.notice,notice,'no false departure notice');a.equal(h.get('so-cancel').disabled,false);}
async function download(h){await h.get('so-download').fire('click');return h.blobs.get(h.downloads.at(-1).href).text();}
function importLater(h,text){const read=gate();h.get('so-file').files=[{size:Buffer.byteLength(text),text:()=>read.promise}];return {pending:h.get('so-file').fire('change'),release:()=>read.resolve(text)};}

test('navigation: six-step anchors preserve an active real 16-receiver run',timing,async t=>{
 const h=mounted(t),reached=onProgress(h,'receiver_complete',async owner=>{
  const {client,epoch,notice}=h.app.session;a.ok(owner.accepted);a.equal(owner.entry.result.frames[0].records.length,1);
  for(const hash of ['#iterations','#message-graph','#intuition','#model','#gain-estimation','#experiment']){await h.anchor(hash);sameOwner(h,owner,client,epoch,notice);}
 });
 const running=h.app.run(batch());await reached;const result=await running;
 a.equal(result.status,'complete');a.equal(result.record.counts.completedReceiverRecords,16);a.equal(result.record.reason,null);a.equal(h.workers.length,1);a.equal(h.sent.filter(x=>x.type==='run').length,1);
});

test('navigation: fragment Back and Forward preserve the submitted owner and complete normally',timing,async t=>{
 const h=mounted(t);await h.anchor('#iterations');await h.anchor('#message-graph');
 const reached=onProgress(h,'raw_frame_ready',async owner=>{
  const {client,epoch,notice}=h.app.session;
  for(const [move,hash]of [['back','#iterations'],['back','#gain-estimation'],['forward','#iterations'],['forward','#message-graph']]){await h[move]();a.equal(new URL(h.win.location.href).hash,hash);sameOwner(h,owner,client,epoch,notice);}
 });
 const running=h.app.run(quick());await reached;a.equal((await running).status,'complete');a.equal(h.workers.length,1);
});

test('navigation: completed selection, notice, verification and download survive anchors',timing,async t=>{
 const h=mounted(t),entry=await h.app.run(quick());await h.get('so-check').fire('click');const text=await download(h),{client,epoch,notice,checks}=h.app.session;
 await h.anchor('#iterations');await h.back();await h.forward();
 a.equal(h.app.source,entry);a.equal(h.app.source.text,text);a.equal(h.app.session.client,client);a.equal(h.app.session.epoch,epoch);a.equal(h.app.session.notice,notice);a.equal(h.app.session.checks,checks);a.deepEqual(h.revoked,[]);a.equal(await download(h),text);a.equal(h.sent.filter(x=>x.type==='run').length,1);
});

for(const persisted of [true,false])test('navigation: pagehide persisted='+persisted+' cancels at unchanged URL and return needs explicit run',timing,async t=>{
 const h=mounted(t),reached=onProgress(h,'receiver_complete',async()=>{
  a.equal(h.win.location.href,initial);await h.fireWindow('pagehide',{persisted});a.equal(h.app.session.active,null);a.equal(h.app.session.client,null);
 });
 const running=h.app.run(batch());await reached;const cancelled=await running;
 a.equal(cancelled.status,'cancelled');a.equal(cancelled.record.reason,'pagehide');a.equal(cancelled.record.counts.completedReceiverRecords,1);a.equal(cancelled.record.counts.requestedReceiverRecords,16);
 const retained=cancelled.text,notice=h.app.session.notice,posts=h.sent.length;
 // The external page owns a different Document. Restore this existing mount
 // as BFCache would: pageshow followed by popstate/hashchange at its own URL.
 await h.fireWindow('pageshow',{persisted});await h.arrive(initial);
 a.equal(h.app.session.active,null);a.equal(h.app.session.client,null);a.equal(h.app.source.text,retained);a.equal(h.app.session.notice,notice);a.match(notice,/显式重新运行/);a.equal(h.sent.length,posts);a.equal(await download(h),retained);
 const fresh=await h.app.run(quick());a.equal(fresh.status,'complete');a.notEqual(fresh.id,cancelled.id);a.equal(h.workers.length,2);a.equal(h.app.session.history[0].text,retained);
});

for(const target of ['https://loonyreina.github.io/ISAC/reading.html#guide-otfs-sensing-assisted-2021','https://loonyreina.github.io/ISAC/otfs-sensing-assisted.html?other=1#iterations'])test('navigation: non-fragment history departure cancels '+new URL(target).pathname+new URL(target).search,timing,async t=>{
 const h=mounted(t),reached=onProgress(h,'raw_frame_ready',()=>h.arrive(target)),running=h.app.run(batch());await reached;const cancelled=await running;
 a.equal(cancelled.status,'cancelled');a.equal(cancelled.record.reason,'popstate');a.equal(h.app.session.client,null);a.ok(cancelled.text);await h.fireWindow('pageshow',{persisted:true});await h.arrive(initial);a.equal(h.app.session.active,null);a.equal(h.app.session.client,null);a.equal(h.app.source,cancelled);
});

test('navigation: missing, malformed or unreadable location fails closed on popstate',timing,async t=>{
 for(const [label,location,damage]of [
  ['missing at mount',null,()=>{}],['invalid at mount',{href:'not a URL'},()=>{}],
  ['missing after mount',{href:initial},h=>{h.win.location=null;}],['invalid after mount',{href:initial},h=>{h.win.location.href='not a URL';}],
  ['getter throws',{href:initial},h=>{Object.defineProperty(h.win,'location',{get(){throw Error('unavailable location');}});}]
 ]){
  const h=mounted(t,{location}),reached=onProgress(h,'raw_frame_ready',async()=>{damage(h);await h.fireWindow('popstate');}),running=h.app.run(quick());await reached;const cancelled=await running;
  a.equal(cancelled.status,'cancelled',label);a.equal(cancelled.record.reason,'popstate',label);a.equal(h.app.session.client,null,label);
 }
});

test('navigation: anchor traversal keeps a pending import valid without taking background run ownership',timing,async t=>{
 const h=mounted(t),prior=await h.app.run(quick());let imported;
 const reached=onProgress(h,'raw_frame_ready',async owner=>{
  const file=importLater(h,prior.text),epoch=h.app.session.epoch,client=h.app.session.client,notice=h.app.session.notice;
  await h.anchor('#iterations');await h.back();sameOwner(h,owner,client,epoch,notice);file.release();await file.pending;
  imported=h.app.source;a.equal(imported.trusted,false);a.equal(imported.text,prior.text);a.equal(h.app.session.active,owner);
 });
 const running=h.app.run(batch());await reached;const completed=await running;
 a.equal(completed.status,'complete');a.equal(h.app.source,imported);a.equal(await download(h),prior.text);a.equal(h.app.session.history.length,3);
});

test('navigation: reset still fences pending import and old Worker callbacks after hash traversal',timing,async t=>{
 const h=mounted(t),prior=await h.app.run(quick());let file,oldCallback,oldMessage;
 const reached=onProgress(h,'raw_frame_ready',async()=>{
  file=importLater(h,prior.text);const client=h.app.session.client;oldCallback=client._nodeMessage;oldMessage=h.messages.find(x=>x.type==='complete');a.ok(oldMessage);
  await h.anchor('#iterations');await h.get('so-reset').fire('click');a.equal(h.app.source,null);a.equal(h.app.session.client,null);file.release();await file.pending;a.equal(h.app.source,null);
 });
 const running=h.app.run(batch());await reached;a.equal((await running).status,'cancelled');
 const newRun=h.app.run(quick()),owner=h.app.session.active;oldCallback(oldMessage);await h.back();a.equal(h.app.session.active,owner);
 const fresh=await newRun;a.equal(fresh.status,'complete');a.equal(h.app.source,fresh);a.equal(h.app.session.history.length,3);a.equal(h.app.session.error,null);
});

test('navigation: delayed old departure cannot overwrite explicit restart or accept a stale import',timing,async t=>{
 const termination=gate(),entered=gate();let originalTerminate;
 const h=mounted(t,{wrapWorker(w,n){if(n===1){originalTerminate=w.terminate.bind(w);w.terminate=()=>{const ended=originalTerminate();entered.resolve();return termination.promise.then(()=>ended);};}return w;}});
 t.after(()=>termination.resolve());const prior=await h.app.run(quick());let leaving,file,oldCallback,oldMessage;
 const reached=onProgress(h,'raw_frame_ready',async()=>{
  file=importLater(h,prior.text);oldCallback=h.app.session.client._nodeMessage;oldMessage=h.messages.find(x=>x.type==='complete');
  leaving=h.fireWindow('pagehide',{persisted:true});await entered.promise;await h.fireWindow('pageshow',{persisted:true});await h.arrive(initial);a.equal(h.app.session.active,null);a.equal(h.app.session.client,null);
 });
 const running=h.app.run(batch());await reached;const cancelled=await running;a.equal(cancelled.status,'cancelled');
 const freshRun=h.app.run(quick()),owner=h.app.session.active,notice=h.app.session.notice;file.release();await file.pending;oldCallback(oldMessage);await h.anchor('#iterations');termination.resolve();await leaving;
 a.equal(h.app.session.active,owner);a.equal(h.app.session.notice,notice);a.equal(h.app.source.id,owner.id);const fresh=await freshRun;a.equal(fresh.status,'complete');a.equal(h.app.source,fresh);a.equal(h.app.session.history.length,3);a.equal(prior.status,'complete');a.equal(h.app.session.renderError,null);
});
