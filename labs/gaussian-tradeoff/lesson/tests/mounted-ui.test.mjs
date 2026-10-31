/** Production mounted DOM/event handlers + genuine Node Workers.
 * Does not exercise actual browser module loading, layout or accessibility.
 */
import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {mounted,freshRun,configureFresh,setFields,freshQ,fileOf,gate,onProgress,page,pauseDigest} from './test-support.mjs';
import {audit,canonical,sha256,assertFrozen} from './record-audit.mjs';
const timing={timeout:40000};
async function download(h,mode){const n=h.downloads.length;await h.get('gt-export-'+mode).fire('click');assert.equal(h.downloads.length,n+1,'production export handler must deliver one actual download');const item=h.downloads.at(-1);assert.equal(audit(item.text).mode,mode);return item;}

test('mounted controls execute continuous κ and a fresh complex H, with exact actual UI downloads',timing,async t=>{
 const h=await mounted(t);assert.equal(h.workers.length,0,'default page must not start a Worker');assert.equal(h.get('gt-export-raw').disabled,true);const r=await freshRun(h);
 assert.equal(r.input.H.re.length,2);assert.equal(r.input.model.m,2);assert.equal(r.input.model.t,4);assert.ok(r.input.kappas.includes(3.14159));assert.equal(r.result.shapes[r.input.selectedIndex].kappa,3.14159);assert.match(h.get('gt-main-plot').innerHTML,/<rect/);assertFrozen(r);
 const saved=canonical(r),plot=h.get('gt-main-plot').innerHTML,raw=audit((await download(h,'raw')).text),history=audit((await download(h,'history')).text);
 assert.deepEqual(raw.input,r.input);assert.deepEqual(history.historical.result,r.result);assert.equal(history.historical.freshExecution,false);assert.equal(canonical(h.app.controller.result),saved);assert.equal(h.get('gt-main-plot').innerHTML,plot);
});
test('display-only Gaussian/Stiefel, matrix, components, truth and stages never regenerate observations',timing,async t=>{
 const h=await mounted(t);await freshRun(h);const before=h.sent.length,record=canonical(h.app.controller.result),hashes=await Promise.all(['gaussian','stiefel'].map(l=>h.app.controller.sampleHash(l)));
 for(const law of ['gaussian','stiefel'])for(const matrix of ['H','Q','X','R','Y','estimate','column','row','bfim','fullbfim','gradient'])for(const component of ['re','im']){await setFields(h,{law,matrix,component});assert.doesNotMatch(h.get('gt-main-plot').innerHTML,/NaN|Infinity|undefined/);}
 for(const stage of ['matrices','shaping','randomness','posterior','integral']){await h.document.querySelector(`[data-stage="${stage}"]`).fire('click');assert.equal(h.app.stage,stage);assert.ok(h.get('gt-explanation').textContent.length>10);assert.doesNotMatch(h.get('gt-main-plot').innerHTML+h.get('gt-second-plot').innerHTML,/NaN|Infinity|undefined/);}
 await setFields(h,{truth:true});assert.equal(h.get('gt-truth-values').hidden,false);assert.equal(h.sent.length,before);assert.equal(canonical(h.app.controller.result),record);assert.deepEqual(await Promise.all(['gaussian','stiefel'].map(l=>h.app.controller.sampleHash(l))),hashes);
});
test('mounted arbitrary Q is a true input with exact power budget and retained complex orientation',timing,async t=>{
 const h=await mounted(t);await configureFresh(h,{'custom-q':true,covariance:JSON.stringify(freshQ())});await h.get('gt-run').fire('click');assert.equal(h.app.controller.state,'complete',h.app.controller.error);const r=h.app.controller.result;assert.deepEqual(r.input.covariance,freshQ());assert.equal(r.input.selectedIndex,r.input.kappas.length);assert.deepEqual(r.result.shapes.at(-1).covariance,freshQ());assert.match(r.result.shapes.at(-1).certificateClassification,/no optimizer claim/);await h.document.querySelector('[data-stage="shaping"]').fire('click');assert.doesNotMatch(h.get('gt-table').textContent,/undefined|NaN/);
 const current=r;await setFields(h,{covariance:JSON.stringify({re:[[1,0],[0,2]],im:[[0,0],[0,0]]})});await h.get('gt-run').fire('click');assert.equal(h.app.controller.result,current,'power-invalid Q must not clear current numerical result');assert.equal(h.app.controller.state,'complete');
});
test('shape/model edits change actual arrays, κ stays continuous, and short blocks do not fabricate Stiefel',timing,async t=>{
 const h=await mounted(t);await freshRun(h);const before=h.app.controller.result;
 const H={re:[[.7,.2,-.1]],im:[[.1,-.3,.4]]};await setFields(h,{channel:JSON.stringify(H),t:5,ns:1,power:1.7,snoise:.5,cnoise:.8,prior:2.3,kappa:.0037,landmarks:false});await h.get('gt-run').fire('click');const r=h.app.controller.result;assert.notEqual(r,before);assert.deepEqual(r.input.H,H);assert.equal(r.input.model.m,3);assert.equal(r.input.model.ns,1);assert.equal(r.result.firstBlock.gaussian.X.re.length,3);assert.equal(r.result.firstBlock.gaussian.X.re[0].length,5);assert.equal(r.result.firstBlock.gaussian.Y.re.length,1);assert.equal(r.result.shapes[r.input.selectedIndex].kappa,.0037);
 await setFields(h,{t:1,kappa:0});await h.get('gt-run').fire('click');assert.equal(h.app.controller.result.result.shapes[0].stiefel.status,'unrealizable');await setFields(h,{law:'stiefel',matrix:'X'});assert.equal(h.app.controller.result.result.firstBlock.stiefel,undefined);assert.match(h.get('gt-summary').textContent+h.get('gt-main-caption').textContent+h.get('gt-caveat').textContent,/不可实现|unrealizable|没有|无/);
});
test('held X/Y processing uses selected law and only changes posterior assumptions',timing,async t=>{
 const h=await mounted(t);await freshRun(h);const held=h.app.controller.held,hash=await h.app.controller.sampleHash('gaussian');
 for(const law of ['gaussian','stiefel']){await setFields(h,{law,'held-noise':.42,'held-prior':2.2});await h.get('gt-held').fire('click');const r=h.app.controller.result;assert.equal(r.input.operation,'posterior');assert.deepEqual(r.input.X,held.firstBlock[law].X);assert.deepEqual(r.input.Y,held.firstBlock[law].Y);assert.deepEqual(Object.keys(r.input).sort(),['X','Y','operation','priorVariance','sensingNoise']);assert.equal(h.app.controller.held,held);assert.equal(await h.app.controller.sampleHash('gaussian'),hash);assert.match(h.get('gt-held-hash').textContent,new RegExp(await h.app.controller.sampleHash(law)));assert.equal(r.input.priorVariance,2.2);}
 assert.deepEqual(h.sent.filter(m=>m.type==='run').map(m=>m.input.operation),['tradeoff','posterior','posterior']);
});
test('mounted finite Wishart/sphere controls run integrals, display diagnostics and export the actual operation',timing,async t=>{
 const h=await mounted(t);await setFields(h,{wm:4,wt:2,wns:2,wq:.9,wn:.7,wp:1.6});await h.get('gt-wishart').fire('click');assert.equal(h.app.controller.state,'complete',h.app.controller.error);const w=h.app.controller.result;assert.equal(w.input.operation,'wishart');assert.equal(w.result.wishart.structuralZeroDirections,2);assert.ok(w.result.wishart.evaluations>0);assert.match(h.get('gt-table').textContent,/quadrature|积分|refinement|误差|value/);assert.equal(audit((await download(h,'history')).text).input.operation,'wishart');
 await setFields(h,{st:3,ssnr:3.14159});await h.get('gt-sphere').fire('click');const s=h.app.controller.result;assert.equal(s.input.operation,'sphere');assert.ok(s.result.sphere.rate>0);assert.ok(s.result.sphere.rate<s.result.sphere.gaussianUpperComparison);assert.equal(audit((await download(h,'raw')).text).input.operation,'sphere');
});
test('downloaded raw/history imports do not execute until explicit fresh replay',timing,async t=>{
 const h=await mounted(t);await freshRun(h);const original=h.app.controller.result.result,raw=await download(h,'raw'),history=await download(h,'history');
 for(const item of [raw,history]){const n=h.sent.length;h.get('gt-import').files=[fileOf(item.text)];await h.get('gt-import').fire('change');assert.equal(h.app.controller.state,'imported');assert.equal(h.app.controller.result,null);assert.equal(h.sent.length,n);assert.match(h.get('gt-fresh').textContent,/历史|historical|导入|未执行/);assert.equal(h.get('gt-replay').disabled,false);await h.get('gt-replay').fire('click');assert.equal(h.app.controller.result.freshExecution,true);assert.deepEqual(h.app.controller.result.result,original);}
});
test('invalid input or hash-corrupt import preserves previous result, plot, and export identity',timing,async t=>{
 const h=await mounted(t);await freshRun(h);const r=h.app.controller.result,plot=h.get('gt-main-plot').innerHTML,raw=audit((await download(h,'raw')).text);
 for(const change of [{kappa:-1},{kappa:1,blocks:1},{blocks:8,channel:'{"re":['}]){await setFields(h,change);await h.get('gt-run').fire('click');assert.equal(h.app.controller.result,r);assert.equal(h.app.controller.state,'complete');assert.equal(h.get('gt-main-plot').innerHTML,plot);}
 raw.input.seed++;h.get('gt-import').files=[fileOf(canonical(raw))];await h.get('gt-import').fire('change');assert.equal(h.app.controller.result,r);assert.equal(h.get('gt-main-plot').innerHTML,plot);assert.equal(audit((await download(h,'raw')).text).inputHash,r.inputHash);
});
for(const action of ['cancel','stop','reset'])test(`mounted ${action} during actual Worker work cannot restore stale results`,timing,async t=>{
 const h=await mounted(t);await configureFresh(h,{blocks:256});const trigger=onProgress(h,c=>c.state==='running'&&c.progress?.stage==='waveforms',()=>h.get('gt-'+action).fire('click'));await h.get('gt-run').fire('click');await trigger.done();assert.equal(h.app.controller.result,null);assert.equal(h.app.controller.held,null);assert.equal(h.get('gt-export-raw').disabled,true);await h.get('gt-restart').fire('click');await freshRun(h,{blocks:2});
});
test('mounted actual Worker death clears exports; restart supports fresh work',timing,async t=>{
 const h=await mounted(t);await configureFresh(h,{blocks:256});const trigger=onProgress(h,c=>c.state==='running'&&c.progress?.stage==='waveforms',()=>h.workers[0].terminate());await h.get('gt-run').fire('click');await trigger.done();assert.equal(h.app.controller.state,'dead');assert.equal(h.app.controller.result,null);assert.equal(h.get('gt-export-history').disabled,true);await h.get('gt-restart').fire('click');await freshRun(h,{blocks:2});
});
test('mounted valid newer click supersedes an actual run and no old input is presented',timing,async t=>{
 const h=await mounted(t);await configureFresh(h,{blocks:256,seed:401});const trigger=onProgress(h,c=>c.state==='running'&&c.progress?.stage==='waveforms',async()=>{await setFields(h,{blocks:2,seed:402});await h.get('gt-run').fire('click');});await h.get('gt-run').fire('click');await trigger.done();assert.equal(h.app.controller.state,'complete');assert.equal(h.app.controller.result.input.seed,402);
});
test('stale file reads cannot overwrite newer run, reset, import, draft or file selection',timing,async t=>{
 const h=await mounted(t);await freshRun(h);const text=(await download(h,'raw')).text;
 for(const action of ['run','reset','import']){const read=gate();h.get('gt-import').files=[{size:Buffer.byteLength(text),text:()=>read.promise}];const old=h.get('gt-import').fire('change');if(action==='run')await freshRun(h,{seed:411,blocks:2});if(action==='reset')await h.get('gt-reset').fire('click');if(action==='import'){h.get('gt-import').files=[fileOf(text)];await h.get('gt-import').fire('change');}const current=h.app.controller.result,historical=h.app.controller.historical,status=h.get('gt-record-status').textContent;h.get('gt-import').value='new-choice.json';h.get('gt-kappa').value='7.123';read.resolve(text);await old;assert.equal(h.app.controller.result,current);assert.equal(h.app.controller.historical,historical);assert.equal(h.get('gt-import').value,'new-choice.json');assert.equal(h.get('gt-kappa').value,'7.123');assert.equal(h.get('gt-record-status').textContent,status);}
});
test('late old import termination cannot overwrite a newer Run or its draft',timing,async t=>{
 const h=await mounted(t);await freshRun(h);const text=(await download(h,'raw')).text,oldWorker=h.workers[0],terminate=oldWorker.terminate.bind(oldWorker),closing=gate(),entered=gate();oldWorker.terminate=async()=>{entered.resolve();await closing.promise;return terminate();};t.after(()=>closing.resolve());
 h.get('gt-import').files=[fileOf(text)];const importing=h.get('gt-import').fire('change');await entered.promise;await freshRun(h,{seed:501,blocks:2,kappa:7.19});closing.resolve();await importing;assert.equal(h.app.controller.state,'complete');assert.equal(h.app.controller.result.input.seed,501);assert.equal(h.get('gt-seed').value,'501');assert.equal(h.get('gt-kappa').value,'7.19');
});
test('mounted pagehide suspends computation and does not replay stale results on pageshow',timing,async t=>{
 const h=await mounted(t);await configureFresh(h,{blocks:256});const trigger=onProgress(h,c=>c.state==='running'&&c.progress?.stage==='waveforms',()=>h.fireWindow('pagehide',{persisted:true}));await h.get('gt-run').fire('click');await trigger.done();assert.equal(h.app.controller.state,'suspended');assert.equal(h.app.controller.result,null);await h.fireWindow('pageshow',{persisted:true});assert.equal(h.app.controller.result,null);await h.get('gt-restart').fire('click');await freshRun(h,{blocks:2});
});
test('static page has unique IDs, labeled inputs, progressive stages and explicit scope',()=>{
 const html=page(),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);assert.equal((html.match(/data-stage=/g)||[]).length,5);assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);for(const match of html.matchAll(/<(input|select|textarea)\b[^>]*id="([^"]+)"[^>]*>/g)){const before=html.slice(0,match.index);assert.ok(/aria-label=/.test(match[0])||before.lastIndexOf('<label')>before.lastIndexOf('</label>'),match[2]);}
 for(const text of ['64MiB','rank(Q)','一般 MIMO Stiefel','Node Worker','不是','2204.06938v8'])assert.ok(html.includes(text),text);assert.match(html,/id="gt-progress"[^>]*aria-live="off"/);assert.match(html,/id="gt-announcement"[^>]*aria-live="polite"/);
});
test('late reset termination cannot overwrite controls or output from a newer Run',timing,async t=>{
 const h=await mounted(t);await freshRun(h);const oldWorker=h.workers[0],terminate=oldWorker.terminate.bind(oldWorker),closing=gate(),entered=gate();oldWorker.terminate=async()=>{entered.resolve();await closing.promise;return terminate();};t.after(()=>closing.resolve());
 const reset=h.get('gt-reset').fire('click');await entered.promise;await freshRun(h,{seed:601,blocks:2,kappa:9.123});closing.resolve();await reset;assert.equal(h.app.controller.state,'complete');assert.equal(h.app.controller.result.input.seed,601);assert.equal(h.get('gt-seed').value,'601');assert.equal(h.get('gt-kappa').value,'9.123');
});
test('failed current file read supports same-file retry and obsolete read failures stay silent',timing,async t=>{
 const h=await mounted(t);await freshRun(h);const text=(await download(h,'raw')).text;let fail=true;const file={size:Buffer.byteLength(text),async text(){if(fail)throw Error('temporary read failure');return text;}};
 h.get('gt-import').files=[file];h.get('gt-import').value='retry.json';await h.get('gt-import').fire('change');assert.equal(h.get('gt-import').value,'');assert.match(h.get('gt-error').textContent,/temporary read failure/);fail=false;h.get('gt-import').files=[file];h.get('gt-import').value='retry.json';await h.get('gt-import').fire('change');assert.equal(h.app.controller.state,'imported');assert.equal(h.get('gt-import').value,'');
 const read=gate();h.get('gt-import').files=[{size:Buffer.byteLength(text),text:()=>read.promise}];const old=h.get('gt-import').fire('change');h.get('gt-import').files=[fileOf(text)];await h.get('gt-import').fire('change');const status=h.get('gt-record-status').textContent;h.get('gt-import').value='new-choice.json';read.reject(Error('obsolete read failure'));await old;assert.equal(h.get('gt-record-status').textContent,status);assert.equal(h.get('gt-import').value,'new-choice.json');assert.doesNotMatch(h.get('gt-error').textContent,/obsolete/);
});
test('invalid newer mounted run and corrupt import cannot cancel accepted actual work',timing,async t=>{
 const h=await mounted(t);await freshRun(h);const bad=audit((await download(h,'raw')).text);bad.input.seed++;
 await configureFresh(h,{blocks:256,seed:701});const trigger=onProgress(h,c=>c.state==='running'&&c.progress?.stage==='waveforms',async()=>{await setFields(h,{blocks:0});await h.get('gt-run').fire('click');h.get('gt-import').files=[fileOf(canonical(bad))];await h.get('gt-import').fire('change');});await h.get('gt-run').fire('click');await trigger.done();assert.equal(h.app.controller.state,'complete');assert.equal(h.app.controller.result.input.seed,701);assert.equal(h.app.controller.result.input.blocks,256);
});
test('raw import and reset remove previously revealed truth rather than leaving stale scores',timing,async t=>{
 const h=await mounted(t);await freshRun(h);await setFields(h,{truth:true});assert.match(h.get('gt-truth-values').textContent,/firstBlockTruthOnly/);const raw=await download(h,'raw');h.get('gt-import').files=[fileOf(raw.text)];await h.get('gt-import').fire('change');assert.equal(h.app.controller.result,null);assert.doesNotMatch(h.get('gt-truth-values').textContent,/firstBlockTruthOnly|squaredError/);await h.get('gt-replay').fire('click');await setFields(h,{truth:true});await h.get('gt-reset').fire('click');assert.equal(h.get('gt-truth-values').hidden,true);assert.doesNotMatch(h.get('gt-truth-values').textContent,/firstBlockTruthOnly|squaredError/);
});

test('delayed raw export digest never downloads an obsolete result after a newer Run',timing,async t=>{
 const h=await mounted(t);await freshRun(h,{seed:801,blocks:2});const hold=pauseDigest();try{const exporting=h.get('gt-export-raw').fire('click');await hold.entered.promise;await freshRun(h,{seed:802,blocks:2});hold.release();await exporting;assert.equal(h.downloads.length,0);assert.equal(h.app.controller.result.input.seed,802);assert.equal(h.app.controller.lastExport,null);}finally{hold.restore();}
});
for(const valid of [false,true])test(`delayed ${valid?'valid':'corrupt'} import digest cannot replace or contaminate a newer Run`,timing,async t=>{
 const h=await mounted(t);await freshRun(h,{seed:811,blocks:2});let text=(await h.app.controller.exportRecord('raw')).text;if(!valid){const record=audit(text);record.inputHash='0'.repeat(64);text=canonical(record);}const hold=pauseDigest();try{h.get('gt-import').files=[fileOf(text)];const importing=h.get('gt-import').fire('change');await hold.entered.promise;await freshRun(h,{seed:812,blocks:2});hold.release();await importing;assert.equal(h.app.controller.state,'complete');assert.equal(h.app.controller.result.input.seed,812);assert.equal(h.app.controller.error,null);assert.equal(h.get('gt-error').hidden,true);assert.equal(h.app.controller.historical,null);}finally{hold.restore();}
});
test('custom covariance KKT display never labels user Q as a pure-communication optimum',timing,async t=>{
 const h=await mounted(t);await freshRun(h,{'custom-q':true,covariance:JSON.stringify(freshQ()),blocks:2});await h.document.querySelector('[data-stage="shaping"]').fire('click');assert.doesNotMatch(h.get('gt-table').textContent,/纯通信端点/);assert.match(h.get('gt-summary').textContent,/自定义协方差，不作最优性判断/);assert.match(h.get('gt-table').textContent,/no optimizer claim/);
});
test('invalid newer candidate preserves a delayed valid raw export owned by the current result',timing,async t=>{
 const h=await mounted(t);await freshRun(h,{seed:851,blocks:2});const current=h.app.controller.result,hold=pauseDigest();try{const exporting=h.get('gt-export-raw').fire('click');await hold.entered.promise;await setFields(h,{blocks:0});await h.get('gt-run').fire('click');assert.equal(h.app.controller.result,current);assert.equal(h.app.controller.state,'complete');hold.release();await exporting;assert.equal(h.downloads.length,1,'rejected candidate must not cancel the current result export');assert.equal(audit(h.downloads[0].text).inputHash,current.inputHash);assert.equal(h.app.controller.result,current);}finally{hold.restore();}
});
test('late restart termination cannot relabel a newer completed Run as idle',timing,async t=>{
 const h=await mounted(t);await freshRun(h,{seed:861,blocks:2});const worker=h.workers[0],terminate=worker.terminate.bind(worker),closing=gate(),entered=gate();worker.terminate=async()=>{entered.resolve();await closing.promise;return terminate();};try{const restarting=h.get('gt-restart').fire('click');await entered.promise;await freshRun(h,{seed:862,blocks:2});closing.resolve();await restarting;assert.equal(h.app.controller.result.input.seed,862);assert.equal(h.app.controller.state,'complete');}finally{closing.resolve();}
});
test('late restart termination cannot revive or relabel a hidden suspended page',timing,async t=>{
 const h=await mounted(t);await freshRun(h,{seed:871,blocks:2});const worker=h.workers[0],terminate=worker.terminate.bind(worker),closing=gate(),entered=gate();worker.terminate=async()=>{entered.resolve();await closing.promise;return terminate();};try{const restarting=h.get('gt-restart').fire('click');await entered.promise;await h.fireWindow('pagehide',{persisted:true});closing.resolve();await restarting;assert.equal(h.app.controller.state,'suspended');assert.equal(h.app.controller.result,null);assert.equal(h.workers.length,1,'obsolete restart must not allocate a replacement Worker');}finally{closing.resolve();}
});
test('cold-start pending actual Worker factory keeps Cancel available and cancellation wins',timing,async t=>{
 const entered=gate(),release=gate(),h=await mounted(t,{async beforeCreateWorker(){entered.resolve();await release.promise;}});t.after(()=>release.resolve());await configureFresh(h,{blocks:2});const running=h.get('gt-run').fire('click');await entered.promise;assert.equal(h.app.controller.busy,true);assert.equal(h.get('gt-cancel').disabled,false,'Cancel must remain available before Worker readiness');await h.get('gt-cancel').fire('click');assert.equal(h.app.controller.busy,false);assert.equal(h.get('gt-cancel').disabled,true);release.resolve();await running;assert.equal(h.app.controller.state,'cancelled');assert.equal(h.app.controller.result,null);assert.equal(h.get('gt-export-raw').disabled,true);await h.get('gt-restart').fire('click');await freshRun(h,{blocks:2,seed:901});assert.equal(h.app.controller.result.input.seed,901);
});

test('record notice expires after imported recompute and lifecycle reset', {timeout:30000}, async t=>{
 const h=await mounted(t); await freshRun(h);
 await h.get('gt-export-raw').fire('click');
 const exported=h.get('gt-record-status').textContent;
 await freshRun(h); const exportAfterRun=h.get('gt-record-status').textContent;
 h.get('gt-import').files=[fileOf(h.downloads[0].text)];await h.get('gt-import').fire('change');
 const imported=h.get('gt-record-status').textContent;
 await h.get('gt-replay').fire('click');
 assert.equal(h.app.controller.state,'complete');
 const after=h.get('gt-record-status').textContent;
 assert.match(exported,/已生成|已导出|已下载/);assert.doesNotMatch(exportAfterRun,/已导出|已下载/);assert.match(imported,/请应用|只导入|仍为历史/);
 assert.doesNotMatch(after,/请应用|只导入|仍为历史/);
 await h.get('gt-reset').fire('click');assert.doesNotMatch(h.get('gt-record-status').textContent,/已导出|已下载|请应用|只导入|仍为历史/);
});

test('selected stage explicitly retains a high-contrast palette on hover',()=>{
 const css=fs.readFileSync(new URL('../lesson.css',import.meta.url),'utf8');
 // Explicit selected + hover specificity (0,3,1) beats generic hover (0,2,1).
 // Static palette/cascade contract only; this does not claim browser or full accessibility QA.
 const selected=css.match(/\.gt-stages button\[aria-pressed=true\],\.gt-stages button\[aria-pressed=true\]:hover\{([^}]+)\}/);
 assert.ok(selected,'selected hover must explicitly own its background and foreground');
 assert.match(selected[1],/background:#174d68/);assert.match(selected[1],/color:#fff/);
 const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
 const luminance=.2126*linear(0x17)+.7152*linear(0x4d)+.0722*linear(0x68);
 assert.ok(1.05/(luminance+.05)>=4.5,'normal-size white text meets 4.5:1 against selected background');
 assert.match(css,/:focus-visible\{outline:3px solid #d55e22;outline-offset:3px\}/);
});
