'use strict';
// Execute the actual dependency-free download/preview helper without claiming browser download success.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync(require.resolve('../experiment-record.js'),'utf8');
function setup(){
 const downloads=[],blobs=[],urls=[],revoked=[],timers=[],events={},writes=[],anchors=[],fault={};
 const element=()=>({textContent:'',disabled:false,open:false,events:{},addEventListener(t,f){this.events[t]=f;}});
 const disclosure=element(),output=element(),button=element(),status=element();
 let text='';Object.defineProperty(output,'textContent',{get:()=>text,set:value=>{text=value;writes.push(value);}});
 const context=vm.createContext({window:{addEventListener:(t,f)=>events[t]=f},document:{body:{append:el=>anchors.push(el)},createElement:()=>({click(){if(fault.click)throw new Error('download blocked');downloads.push({href:this.href,name:this.download});},remove(){this.removed=true;}})},Blob:class{constructor(parts,options){if(fault.blob)throw new Error('Blob unavailable');this.parts=parts;this.options=options;blobs.push(this);}},URL:{createObjectURL(){if(fault.url)throw new Error('URL unavailable');const url=`blob:test-${urls.length}`;urls.push(url);return url;},revokeObjectURL:url=>revoked.push(url)},setTimeout:fn=>timers.push(fn)});
 vm.runInContext(script,context);const api=context.window.ExperimentRecord,controller=api.create({disclosure,output,button,status});
 const click=()=>button.events.click(),toggle=open=>{disclosure.open=open;disclosure.events.toggle();};
 return {api,controller,disclosure,output,button,status,downloads,blobs,urls,revoked,timers,events,writes,anchors,fault,click,toggle};
}
const plain=x=>JSON.parse(JSON.stringify(x));
function walk(value,fn){if(value&&typeof value==='object'){fn(value);Object.values(value).forEach(v=>walk(v,fn));}}
test('preview is valid bounded JSON with explicit nested omission counts and unchanged short coordinates',()=>{
 const {api}=setup(),record={config:{seed:37},rows:Array.from({length:512},(_,id)=>({id,x:[id/512,.2,-.1],power:Array.from({length:64},(_,j)=>j/64)}))},before=JSON.stringify(record),text=api.preview(record),p=JSON.parse(text);
 a.equal(p.previewInfo.kind,'preview-only');a.equal(p.previewInfo.completeRecord,false);a.ok(text.length<=12000);a.equal(p.record.rows.totalItems,512);a.equal(p.record.rows.omittedItems,510);a.deepEqual(p.record.rows.firstItems[0].x,[0,.2,-.1]);a.equal(p.record.rows.firstItems[0].power.omittedItems,62);
 walk(p.record,x=>{if(x.previewType==='array'){a.equal(x.totalItems,x.shownItems+x.omittedItems);a.equal(x.shownItems,x.firstItems.length);a.ok(x.shownItems<=2);}});a.equal(JSON.stringify(record),before);
});
test('budget fallback omits scalar fields explicitly rather than slicing JSON syntax',()=>{
 const {api}=setup(),p=JSON.parse(api.preview({identity:'x'.repeat(15000),config:{seed:1},rows:[1,2]}));
 a.equal(p.recordOmitted,true);a.equal(p.omittedFieldCount,3);a.deepEqual(p.omittedTopLevelFields,['identity','config','rows']);a.equal(p.previewInfo.completeRecord,false);
 a.throws(()=>api.preview({['x'.repeat(15000)]:0}),/preview budget/);
});
test('Infinity, negative Infinity and NaN remain explicit strings in preview and complete download',()=>{
 const s=setup(),record={evaluationOnly:{lossDb:Infinity},negative:-Infinity,undefinedMetric:NaN};s.controller.update(record,'finite-policy.json');s.toggle(true);s.click();
 const p=JSON.parse(s.output.textContent),full=JSON.parse(s.blobs[0].parts[0]);a.equal(p.record.evaluationOnly.lossDb,'Infinity');a.equal(full.evaluationOnly.lossDb,'Infinity');a.equal(full.negative,'-Infinity');a.equal(full.undefinedMetric,'NaN');a.match(p.previewInfo.nonFiniteNumbers,/never null/);
});
test('complete immutable snapshot is downloadable while only preview ever enters DOM',()=>{
 const s=setup(),record={config:{seed:37},evaluationOnly:Array.from({length:64},(_,id)=>({id,power:Array(64).fill(id)})),frozenPredictions:Array.from({length:64},(_,id)=>({id,ranking:Array.from({length:64},(_,j)=>j)}))},expected=JSON.stringify(record);
 s.controller.update(record,'record37.json');a.equal(s.output.textContent,'');a.equal(s.button.disabled,false);s.toggle(true);const preview=s.output.textContent;a.notEqual(preview,expected);s.click();
 a.equal(JSON.stringify(JSON.parse(s.blobs[0].parts[0])),expected);a.equal(s.downloads[0].name,'record37.json');a.equal(s.blobs[0].options.type,'application/json;charset=utf-8');a.equal(s.anchors[0].hidden,true);a.equal(s.anchors[0].removed,true);a.match(s.status.textContent,/已请求浏览器/);
 record.config.seed=99;record.evaluationOnly.length=0;s.click();a.equal(s.blobs[1].parts[0],s.blobs[0].parts[0],'mutating source after render cannot silently change exported snapshot');
 s.controller.update({config:{seed:99},evaluationOnly:[]},'record99.json');a.equal(s.status.textContent,'');s.click();a.equal(JSON.parse(s.blobs[2].parts[0]).config.seed,99);a.equal(s.downloads[2].name,'record99.json');
 for(const value of s.writes){a.ok(value.length<=12000);if(value)a.equal(JSON.parse(value).previewInfo.completeRecord,false);}s.toggle(false);a.equal(s.output.textContent,'');s.toggle(true);a.equal(JSON.parse(s.output.textContent).record.config.seed,99);
});
test('repeated downloads revoke every URL once on timers, reset/clear, and page exit',()=>{
 const s=setup();s.controller.update({seed:37},'37.json');s.click();s.click();a.equal(s.revoked.length,0);s.timers[0]();a.deepEqual(s.revoked,['blob:test-0']);s.controller.clear();a.equal(s.button.disabled,true);a.equal(s.output.textContent,'');a.equal(s.status.textContent,'');a.deepEqual(s.revoked,s.urls);s.click();a.equal(s.downloads.length,2);s.timers.forEach(fn=>fn());a.equal(s.revoked.length,2);
 s.controller.update({seed:49},'49.json');s.click();s.events.pagehide();a.deepEqual(s.revoked,s.urls);s.timers.forEach(fn=>fn());a.equal(s.revoked.length,3);
});
test('download failures retain a clearly labeled preview, report no full-copy fallback, and recover on retry',()=>{
 for(const fault of ['blob','url','click']){
  const s=setup();s.controller.update({rows:Array.from({length:100},(_,i)=>i)},'retry.json');s.toggle(true);const preview=s.output.textContent;s.fault[fault]=true;s.click();a.equal(s.downloads.length,0);a.equal(s.output.textContent,preview);a.match(s.status.textContent,/下载未能启动/);a.match(s.status.textContent,/页面只有预览，不能代替完整记录/);a.deepEqual(s.revoked,s.urls);a.ok(s.anchors.every(x=>x.removed));delete s.fault[fault];s.click();a.equal(s.downloads.length,1);a.equal(JSON.parse(s.blobs.at(-1).parts[0]).rows.length,100);a.match(s.status.textContent,/已请求浏览器/);s.controller.clear();a.deepEqual(s.revoked,s.urls);
 }
});
test('shared helper does not use network requests, clipboard permissions or third-party dependencies',()=>{
 a.doesNotMatch(script,/fetch\s*\(|XMLHttpRequest|navigator\.clipboard|import\s|require\s*\(|innerHTML/);
});
