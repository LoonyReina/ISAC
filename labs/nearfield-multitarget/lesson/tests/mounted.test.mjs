import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import lightDocument from './dom-harness.cjs';import {mount} from '../lesson.mjs';import {workerFactory} from './node-client.mjs';
const pageSource=new URL('../../../../content/pages/nearfield-multitarget.html',import.meta.url),page=fs.readFileSync(fs.existsSync(pageSource)?pageSource:new URL('../../../../nearfield-multitarget.html',import.meta.url),'utf8');
function mounted(t){const h=lightDocument(page),sent=[],urls=new Map(),revoked=[],workers=[],traffic=[],holds=[];const factory=url=>{const w=workerFactory(url),post=w.postMessage;w.postMessage=data=>{const dispatch=w.onmessage;w.onmessage=event=>{const item={request:data,data:event.data,deliver:()=>dispatch(event)};traffic.push(item);const hold=holds.find(h=>!h.used&&h.stage===data.type&&['result','error'].includes(event.data.type));if(hold){hold.used=true;hold.resolve(item);}else item.deliver();};sent.push(data);post(data);};workers.push(w);return w;};const app=mount(h.document,{workerFactory:factory,urlApi:{createObjectURL(blob){const u='blob:test-'+urls.size;urls.set(u,blob);return u;},revokeObjectURL:u=>revoked.push(u)}});t.after(()=>{app.destroy();workers.forEach(w=>w.terminate());});return {...h,app,sent,urls,revoked,traffic,hold(stage){return new Promise(resolve=>holds.push({stage,resolve,used:false}));}};}
async function change(h,id,value,event='input'){const e=h.get('mt-'+id);if(typeof value==='boolean')e.checked=value;else e.value=value;await e.fire(event);}
async function run(h){await h.get('mt-form').fire('submit');assert.equal(h.get('mt-error').hidden,true,h.get('mt-error').textContent);return h.app.source;}
async function download(h,id='download'){await h.get('mt-'+id).fire('click');const item=h.downloads.at(-1);assert.ok(item?.download.endsWith('.json'));return h.urls.get(item.href).text();}

test('mounted real Worker, complete matrices, all panes, finite-sample production download + independent NumPy',async t=>{const h=mounted(t);assert.equal(h.sent.length,0);await change(h,'epsilon',.073);await change(h,'rate',3.7);await change(h,'power',.181);await change(h,'targets-0-0',.003);await change(h,'sample',true,'change');await change(h,'snapshots',128);await change(h,'seed',92881);const v=await run(h);assert.equal(v.record.payload.status,'complete');assert.equal(h.get('mt-results').hidden,false);assert.equal(h.get('mt-download').disabled,false);const before=v.text,originalMatrices=JSON.stringify(v.record.payload.results.map(r=>r.matrices)),count=h.sent.length;for(const stage of ['geometry','optimization','recovery','illumination','receiver']){await h.document.querySelector(`[data-stage="${stage}"]`).fire('click');assert.equal(h.get('mt-'+stage).hidden,false);}for(const mode of ['proposed','nccs']){await change(h,'mode',mode,'change');for(const key of ['rx','F1','F2','rsOld','ff1','ff2','delta1','delta2','rs','beams','basis','reducedR','empirical','receiveEmpirical','sampleX','sampleNoise']){await change(h,'matrix',key);for(const component of ['magnitude','phase','re','im'])await change(h,'component',component);}await change(h,'sample-row',35);await change(h,'sample-col',127);}assert.equal(h.sent.length,count,'view changes must not rerun solver');assert.equal(h.app.source.text,before);assert.equal(JSON.stringify(h.app.source.record.payload.results.map(r=>r.matrices)),originalMatrices);assert.match(h.get('mt-sampling-state').textContent,/undefined_singular_rx/);assert.match(h.get('mt-slice-targets').textContent,/切片外/);const text=await download(h),record=JSON.parse(text);assert.deepEqual(record,v.record);const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mt-mounted-export-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const filename=path.join(dir,'production-download.json');fs.writeFileSync(filename,text);const oracle=spawnSync('python3',[new URL('./record-oracle.py',import.meta.url).pathname,filename],{encoding:'utf8'});assert.equal(oracle.status,0,oracle.stdout+'\n'+oracle.stderr);assert.equal(JSON.parse(oracle.stdout).selfConsistent,true);const teachingFile=path.join(dir,'teaching.json');fs.writeFileSync(teachingFile,JSON.stringify({recordId:v.record.runId,projection:v.view,slice:v.slice}));const projectionOracle=spawnSync('python3',[new URL('./adapter-oracle.py',import.meta.url).pathname,filename,teachingFile],{encoding:'utf8'});assert.equal(projectionOracle.status,0,projectionOracle.stdout+'\n'+projectionOracle.stderr);assert.equal(JSON.parse(projectionOracle.stdout).selfConsistent,true);assert.ok(h.canvasCalls.length>0);});

test('historical import is untrusted, strict numeric check and fresh re-solve use production file',async t=>{const h=mounted(t);const first=await run(h),text=await download(h);await h.get('mt-reset').fire('click');h.get('mt-file').files=[{size:Buffer.byteLength(text),text:async()=>text}];await h.get('mt-file').fire('change');assert.equal(h.app.session.state,'historical');assert.equal(h.app.session.current,null);assert.equal(h.get('mt-download').disabled,true);assert.equal(h.get('mt-download-history').disabled,false);assert.match(h.get('mt-record-state').textContent,/不可信来源/);await h.get('mt-check').fire('click');assert.equal(h.app.session.state,'historical-checked');assert.match(h.get('mt-history-state').textContent,/来源未认证/);assert.equal(await download(h,'download-history'),text);await h.get('mt-rerun').fire('click');assert.equal(h.app.session.state,'complete');assert.notEqual(h.app.source.record.runId,first.record.runId);assert.deepEqual(h.app.source.record.payload.results[0].matrices,first.record.payload.results[0].matrices);assert.equal(h.app.session.history.length,2);await change(h,'history','1','change');assert.equal(h.app.session.state,'historical');assert.equal(h.app.source.record.runId,first.record.runId);});

test('actual partial failure and failed records keep export, diagnostics and separate statuses',async t=>{const h=mounted(t);for(const [p,status]of [['partial','partial'],['capped','failed'],['degenerate','failed']]){await change(h,'preset',p,'change');await h.get('mt-apply-preset').fire('click');assert.equal(h.app.source,null);const v=await run(h);assert.equal(h.app.session.state,status);assert.equal(h.get('mt-download').disabled,false);const text=await download(h);assert.equal(JSON.parse(text).payload.results.length,2);await change(h,'mode','nccs','change');assert.ok(h.get('mt-diagnostics').textContent.length>50);if(p==='partial'){assert.match(h.get('mt-record-state').textContent,/部分失败/);assert.equal(v.record.payload.results[0].accepted,true);assert.equal(v.record.payload.results[1].accepted,false);}}});

test('double submit, cancel/edit/reset/hidden/Back ownership never show stale result',async t=>{const h=mounted(t);const one=h.get('mt-form').fire('submit'),two=h.get('mt-form').fire('submit');assert.equal(h.sent.filter(m=>m.type==='solve').length,1);await h.get('mt-cancel').fire('click');await Promise.all([one,two]);assert.equal(h.app.source,null);assert.equal(h.app.session.current,null);assert.equal(h.get('mt-download').disabled,true);await run(h);await change(h,'power',.18);assert.equal(h.app.source,null);await run(h);await h.visibility('hidden');assert.equal(h.app.source,null);await h.visibility('visible');assert.equal(h.app.source,null);await run(h);await h.fireWindow('popstate');assert.equal(h.app.source,null);await run(h);await h.fireWindow('pagehide');assert.equal(h.app.source,null);await h.get('mt-reset').fire('click');assert.equal(h.get('mt-power').value,String(10**(-.7)));assert.equal(h.get('mt-status').textContent,'尚未运行');assert.ok(h.revoked.length>=0);});

test('malformed/oversize/late files remain fenced and same file can be reselected',async t=>{const h=mounted(t);for(const text of ['{','{"schema":"wrong"}','{"__proto__":{}}']){h.get('mt-file').files=[{size:text.length,text:async()=>text}];await h.get('mt-file').fire('change');assert.equal(h.app.session.state,'historical-rejected');assert.equal(h.get('mt-file').value,'');assert.equal(h.app.source,null);}let read=false;h.get('mt-file').files=[{size:67108865,text:async()=>{read=true;return '';}}];await h.get('mt-file').fire('change');assert.equal(read,false);let release;h.get('mt-file').files=[{size:100,text:()=>new Promise(r=>release=r)}];const pending=h.get('mt-file').fire('change');await h.get('mt-reset').fire('click');release('{}');await pending;assert.equal(h.app.source,null);assert.equal(h.app.session.imported,null);assert.equal(h.get('mt-error').hidden,true);await run(h);assert.equal(h.app.session.state,'complete');});

test('slice actual recompute is view-owned and separate from exact optimization record',async t=>{const h=mounted(t),v=await run(h),before=v.text,count=h.sent.filter(m=>m.type==='solve').length;await change(h,'slice-x',.003);await change(h,'grid-size',17);await h.get('mt-slice-run').fire('click');assert.equal(h.app.slice.x,.003);assert.equal(h.app.slice.size,17);assert.equal(h.app.source.text,before);assert.equal(h.sent.filter(m=>m.type==='solve').length,count);const pending=h.get('mt-slice-run').fire('click');await h.get('mt-reset').fire('click');await pending;assert.equal(h.app.source,null);assert.equal(h.app.slice,null);});


// Hold only delivery of real module-Worker messages, never substitute numerical results.
// Replaying the saved dispatch also exercises the production client's stale-slot guard.
test('progress clears when the matching real slice completes or fails without hiding its error',{timeout:60000},async t=>{
 const h=mounted(t),v=await run(h),original=h.app.slice,solves=h.sent.filter(m=>m.type==='solve').length;
 await change(h,'slice-x',.0031);await change(h,'grid-size',41);
 const terminal=h.hold('slice'),pending=h.get('mt-slice-run').fire('click'),message=await terminal;
 assert.equal(h.get('mt-progress').textContent,'正在计算当前记录的照射切片');
 message.deliver();await pending;
 assert.equal(h.app.slice.x,.0031);assert.equal(h.app.slice.size,41);assert.notEqual(h.app.slice,original);
 assert.equal(h.get('mt-progress').textContent,'');assert.match(h.get('mt-slice-status').textContent,/切片计算完成/);
 await h.document.querySelector('[data-stage="recovery"]').fire('click');assert.equal(h.get('mt-progress').textContent,'');
 const complete=h.app.slice;await change(h,'slice-x',3);await h.get('mt-slice-run').fire('click');
 assert.equal(h.get('mt-progress').textContent,'');assert.equal(h.get('mt-error').hidden,false);
 assert.match(h.get('mt-error').textContent,/derived_failure: 切片输入范围错误/);
 assert.match(h.get('mt-slice-status').textContent,/切片未完成/);assert.equal(h.app.slice,complete);
 assert.equal(h.app.source.text,v.text);assert.equal(h.sent.filter(m=>m.type==='solve').length,solves);
 await change(h,'slice-x',.001);await h.get('mt-slice-run').fire('click');
 assert.equal(h.get('mt-error').hidden,true);assert.equal(h.get('mt-progress').textContent,'');assert.equal(h.app.slice.x,.001);
});

test('matching real import and historical check settle progress, including malformed import error',{timeout:60000},async t=>{
 const h=mounted(t),v=await run(h),text=v.text;
 h.get('mt-file').files=[{size:text.length,text:async()=>text}];
 let terminal=h.hold('import'),pending=h.get('mt-file').fire('change'),message=await terminal;
 assert.match(h.get('mt-progress').textContent,/正在校验历史/);message.deliver();await pending;
 assert.equal(h.get('mt-progress').textContent,'');assert.equal(h.app.session.state,'historical');
 terminal=h.hold('check');pending=h.get('mt-check').fire('click');message=await terminal;
 assert.equal(h.get('mt-progress').textContent,'正在独立复算保存数值');message.deliver();await pending;
 assert.equal(h.get('mt-progress').textContent,'');assert.equal(h.app.session.state,'historical-checked');
 assert.match(h.get('mt-history-state').textContent,/来源未认证/);assert.equal(h.app.session.current,null);
 h.get('mt-file').files=[{size:1,text:async()=>'{'}];await h.get('mt-file').fire('change');
 assert.equal(h.get('mt-progress').textContent,'');assert.equal(h.get('mt-error').hidden,false);
 assert.match(h.get('mt-error').textContent,/derived_failure/);assert.equal(h.app.session.state,'historical-rejected');
});

test('late real slice messages cannot restore progress after input, reset, cancel, import or a newer run',{timeout:60000},async t=>{
 const h=mounted(t),text=(await run(h)).text;
 for(const action of ['input','reset','cancel','import','run']){
  if(!h.app.source){h.get('mt-file').files=[{size:text.length,text:async()=>text}];await h.get('mt-file').fire('change');}
  const terminal=h.hold('slice'),pending=h.get('mt-slice-run').fire('click'),old=await terminal;
  const progress=h.traffic.find(m=>m.request.id===old.request.id&&m.data.type==='progress');
  assert.match(h.get('mt-progress').textContent,/正在计算当前记录/);
  let replacement,replacementTerminal;
  if(action==='input')await change(h,'power',.183);
  else if(['reset','cancel'].includes(action))await h.get('mt-'+action).fire('click');
  else {
   const stage=action==='import'?'import':'finalize';replacementTerminal=h.hold(stage);
   if(action==='import'){h.get('mt-file').files=[{size:text.length,text:async()=>text}];replacement=h.get('mt-file').fire('change');}
   else replacement=h.get('mt-form').fire('submit');
   replacementTerminal=await replacementTerminal;
  }
  const expected=h.get('mt-progress').textContent,status=h.get('mt-status').textContent;
  if(replacement)assert.ok(expected.length>0,'new operation owns a live progress notice');else assert.equal(expected,'');
  progress.deliver();old.deliver();await pending;
  assert.equal(h.get('mt-progress').textContent,expected,action);assert.equal(h.get('mt-status').textContent,status,action);
  assert.equal(h.get('mt-error').hidden,true,action);assert.equal(h.app.source,null,action);
  if(replacement){replacementTerminal.deliver();await replacement;assert.ok(h.app.source);assert.equal(h.get('mt-progress').textContent,'');}
 }
});

test('superseded real slices cannot erase newer progress or a legitimate newer error',{timeout:60000},async t=>{
 const h=mounted(t);await run(h);
 for(const newerFails of [false,true]){
  const oldTerminal=h.hold('slice'),oldPending=h.get('mt-slice-run').fire('click'),old=await oldTerminal;
  const oldProgress=h.traffic.find(m=>m.request.id===old.request.id&&m.data.type==='progress');
  await change(h,'slice-x',newerFails?3:.002);
  const newTerminal=h.hold('slice'),newPending=h.get('mt-slice-run').fire('click'),fresh=await newTerminal;
  oldProgress.deliver();old.deliver();await oldPending;
  assert.equal(h.get('mt-progress').textContent,'正在计算当前记录的照射切片');
  fresh.deliver();await newPending;
  const error=h.get('mt-error').textContent,status=h.get('mt-slice-status').textContent;
  oldProgress.deliver();old.deliver();
  assert.equal(h.get('mt-progress').textContent,'');assert.equal(h.get('mt-error').textContent,error);
  assert.equal(h.get('mt-slice-status').textContent,status);
  assert.equal(h.get('mt-error').hidden,!newerFails);
  if(newerFails)assert.match(error,/切片输入范围错误/);else assert.equal(h.app.slice.x,.002);
 }
});

test('real derived Worker transport failures clear owned progress while preserving terminal errors',{timeout:60000},async t=>{
 const h=mounted(t);
 let terminal=h.hold('finalize'),pending=h.get('mt-form').fire('submit'),message=await terminal;
 assert.match(h.get('mt-progress').textContent,/正在计算完整矩阵/);
 h.app.client.slots.get('derive').worker.onerror({message:'intentional finalize worker interruption'});await pending;
 assert.equal(h.get('mt-progress').textContent,'');assert.equal(h.get('mt-error').hidden,false);
 assert.match(h.get('mt-error').textContent,/intentional finalize worker interruption/);assert.equal(h.app.source,null);
 message.deliver();assert.equal(h.app.source,null);assert.equal(h.get('mt-progress').textContent,'');
 const text=(await run(h)).text;h.get('mt-file').files=[{size:text.length,text:async()=>text}];await h.get('mt-file').fire('change');
 terminal=h.hold('check');pending=h.get('mt-check').fire('click');message=await terminal;
 assert.equal(h.get('mt-progress').textContent,'正在独立复算保存数值');
 h.app.client.slots.get('derive').worker.onmessageerror();await pending;
 assert.equal(h.get('mt-progress').textContent,'');assert.equal(h.get('mt-error').hidden,false);
 assert.match(h.get('mt-error').textContent,/Worker消息无法解码/);assert.match(h.get('mt-check-result').textContent,/历史核对失败/);
 message.deliver();assert.equal(h.get('mt-progress').textContent,'');assert.match(h.get('mt-error').textContent,/Worker消息无法解码/);
});
