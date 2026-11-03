'use strict';
// Source/staged adapter contract checks; not a browser or numerical-solver claim.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'..'),runtime=path.join(base,'features/teaching19');
const box={};vm.runInNewContext(fs.readFileSync(path.join(runtime,'lessons.js'),'utf8'),box);
const lesson=JSON.parse(JSON.stringify(box.Guided19Data.lessons.find(l=>l.id==='crb')));
const {installTheoryAdapter}=require(path.join(runtime,'theory-adapters.js'));
function fixture(){
 const nodes=new Map();
 function node(selector){if(!nodes.has(selector)){const listeners={};nodes.set(selector,{id:selector.replace(/^#/,''),type:'number',value:'1',disabled:true,hidden:false,textContent:'',dataset:{},addEventListener(t,f){(listeners[t]??=[]).push(f)},removeEventListener(t,f){listeners[t]=(listeners[t]||[]).filter(x=>x!==f)},getAttribute(){return null},setAttribute(){},removeAttribute(){},fire(t,target=this){for(const f of listeners[t]||[])f({target,type:t})},click(){this.fire('click')}});}return nodes.get(selector);}
 let matrix=[node('#cm-h-real-0-0'),node('#cm-h-imag-0-0')];
 const doc={querySelector:node,querySelectorAll:s=>s==='#cm-channel-editor input'?matrix:lesson.ui.recordInputSelectors.includes(s)?[node(s)]:[]};
 const adapter=installTheoryAdapter(doc,lesson),host=node(lesson.ui.rootSelector);
 function complete(){node('#cm-run').click();node('#cm-current-label').textContent='运行 1 · 数值接受';node('#cm-cancel').disabled=true;assert(adapter.ready());}
 return {adapter,node,host,complete,get matrix(){return matrix},replaceMatrix(){matrix=[{...node('#cm-h-real-1-0'),value:'7'},{...node('#cm-h-imag-1-0'),value:'-3'}]},edit(field,value){field.value=value;host.fire('input',field)}};
}
test('point CRB records raw dynamic complex H, not just a displayed seed',()=>{
 assert(lesson.ui.recordInputSelectors.includes('#cm-channel-editor input'));
 const f=fixture();f.matrix[0].value='0.7123';f.matrix[1].value='-0.25';f.complete();
 const values=f.adapter.getState().parameters;assert.equal(values.find(p=>p.id==='cm-h-real-0-0').value,'0.7123');assert.equal(values.find(p=>p.id==='cm-h-imag-0-0').value,'-0.25');
});
test('H edits invalidate on A to B to A, and a replaced H editor is captured dynamically',()=>{
 const f=fixture();f.complete();f.edit(f.matrix[0],'2');f.edit(f.matrix[0],'1');assert(!f.adapter.ready(),'same visible H cannot revive an old run');
 f.complete();f.replaceMatrix();assert(!f.adapter.ready(),'different raw H snapshot invalidates');f.complete();f.edit(f.matrix[0],'8');assert(!f.adapter.ready());
 assert.equal(f.adapter.getState().parameters.find(p=>p.id==='cm-h-real-1-0').value,'8');
});
test('reset, raw-input import and native channel/sweep actions invalidate old CRB feedback',()=>{
 for(const action of ['#cm-reset','#cm-fresh','#cm-sweep','#cm-cancel']){const f=fixture();f.complete();f.node(action).click();assert(!f.adapter.ready(),action);f.complete();}
 const f=fixture();f.complete();f.host.fire('change',{type:'file'});assert(!f.adapter.ready(),'import selection invalidates before asynchronous reading');f.complete();
 f.adapter.dispose();assert(!f.adapter.ready());
});

test('result-alignment contracts expose weighted metrics, truth controls and extended-response semantics',()=>{
 const data=box.Guided19Data,w=data.lessons.find(l=>l.id==='optimal_waveform'),j=data.lessons.find(l=>l.id==='joint_beamforming'),c=data.lessons.find(l=>l.id==='crb'),n=data.lessons.find(l=>l.id==='supplement-case-clock'),e=data.variants.find(l=>l.coreId==='extended-target');
 assert(w.ui.readSelectors.includes('#wfl-weighted-result'));
 assert(w.ui.liveSelectors.includes('#wfl-weighted-status'));
 assert(w.feedbackMetricSelectors.includes('#wfl-weighted-metrics'));
 assert(n.ui.readSelectors.includes('#ns-truth-controls'));
 assert(n.feedbackMetricSelectors.includes('#ns-comparison'));
 assert.match(e.knownUnknown.observation,/完整响应复MSE/);
 assert.match(e.knownUnknown.unknown.join(' '),/不估计目标角度/);
 assert.match(e.plainScope,/不是角度CRB/);
 assert.match(w.steps.find(s=>s.role==='bridge').body,/D=‖X₁−X₀‖²=8/);
 assert.match(j.steps.find(s=>s.role==='bridge').body,/Q=diag\(2,1\)/);
 assert.match(c.steps.find(s=>s.role==='bridge').body,/Schur补信息为4−1×1⁻¹×1=3/);
 assert.match(e.steps[2].body,/tr\(R⁻¹\)=5\/6/);
});

test('joint guided views reparent both real physical tables with their captions',()=>{
 const source=fs.readFileSync(path.join(runtime,'theory-views.js'),'utf8');
 assert.match(source,/for\(const selector of \['#jbo-users','#jbo-checks'\]\)/);
 assert.match(source,/body&&body\.closest\('\.jbo-table-wrap'\)/);
 assert.match(source,/\.gl-shell\[data-role="compare"\] #wfl-result\{display:none\}/);
});

test('extended target Chinese status lifecycle retains cancellation and imported-history gates',()=>{
 const source=fs.readFileSync(path.join(runtime,'theory-adapters.js'),'utf8');
 assert.match(source,/\^已完成：/);assert.match(source,/\^已请求取消/);assert.match(source,/\^导入历史记录/);
 const appPath=fs.existsSync(path.join(base,'labs/crb-beamforming/extended-lab/prototype/app.js'))?path.join(base,'labs/crb-beamforming/extended-lab/prototype/app.js'):null;
 if(appPath){const app=fs.readFileSync(appPath,'utf8');assert.match(app,/完整响应复MSE下界（不是角度CRB）/);assert.match(app,/构造恢复/);assert.match(app,/主特征对基线/);}
});

test('main CRB workbench distinguishes implemented extended response from historical offline evidence',()=>{
 const source=path.join(base,'content/pages/crb-beamforming.html');
 const html=fs.readFileSync(fs.existsSync(source)?source:path.join(base,'crb-beamforming.html'),'utf8');
 const evidence=JSON.parse(fs.readFileSync(path.join(base,'labs/crb-beamforming/extended-lab/current-browser-evidence/SUMMARY.json'),'utf8'));
 assert.equal(evidence.dateUtc,'2026-10-21');
 assert.equal(evidence.status,'CURRENT_DESKTOP_BROWSER_REPLAY_PASSED_WITH_DECLARED_LIMITS');
 for(const stale of ['扩展目标优化与原文比较基线仍未加入','扩展目标浏览器实现仍待完成','扩展目标仍为离线参考','浏览器和性能验证仍待完成'])assert(!html.includes(stale),stale);
 const note=html.match(/<aside class="cm-evidence-note"[\s\S]*?<\/aside>/)[0];
 assert.match(note,/式 \(46\)–\(49\).*已.*接入浏览器/);
 assert.match(note,/完整响应复 MSE 下界，不是角度误差/);
 for(const limit of ['导入','移动端','首屏与内存','奇异/不可行基线','完整比较基线'])assert(note.includes(limit),limit);
 const extension=html.match(/<section class="chapter" id="extended-target">[\s\S]*?<\/section>/)[0];
 assert.match(extension,/href="labs\/crb-beamforming\/extended-lab\/prototype\/index.html"/);
 assert.match(extension,/同一个松弛解的构造恢复与主特征对基线/);
 assert.match(extension,/奇异 R 没有有限逆迹界，预算耗尽不代表不可行/);
 assert.match(extension,/optimal_inaccurate/);assert.match(extension,/不是性能基准/);
 assert.equal(evidence.knownLimits.some(x=>x.includes('Mobile')&&x.includes('memory')),true);
 assert.equal(evidence.knownLimits.some(x=>x.includes('import')),true);
});
