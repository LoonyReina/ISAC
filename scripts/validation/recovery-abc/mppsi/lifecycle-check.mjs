import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const base='../../../../labs/otfs-receiver/mppsi/';
const {paired}=JSON.parse(fs.readFileSync(new URL('./fixtures.json',import.meta.url)));
class El{constructor(){this.events={};this.children=[];this.value='';this.textContent='';this.disabled=false;} addEventListener(k,f){this.events[k]=f;} append(...e){this.children.push(...e);}replaceChildren(...e){this.children=e;}reportValidity(){return true;}click(){} }
const els={};const el=id=>els[id]??=new El();const window=new El();const workers=[];let fail=false;
class Worker{constructor(){if(fail)throw Error('mock startup failure');workers.push(this);this.terminated=false;}terminate(){this.terminated=true;}postMessage(x){this.sent=x;} }
const ctx=vm.createContext({document:{getElementById:el,createElement:()=>new El()},window,Worker,URL,Blob,performance:{now:()=>0},fetch:()=>new Promise(()=>{}),setTimeout,console});
vm.runInContext(fs.readFileSync(new URL(base+'mppsi-ui.mjs',import.meta.url),'utf8').replaceAll('import.meta.url',JSON.stringify(new URL(base+'mppsi-ui.mjs',import.meta.url).href)),ctx);
el('mppsi-scenario').value='integer';el('mppsi-snr').value='10';el('mppsi-seed').value='123';el('mppsi-inspect-model').value='matched';
const run=()=>el('mppsi-run-form').events.submit({preventDefault(){}});let checks=[];
run();const old=workers.at(-1);assert.equal(el('mppsi-cancel').disabled,false);
run();const fresh=workers.at(-1);assert(old.terminated);old.onmessage({data:{result:paired[0]}});assert.equal(el('mppsi-export').disabled,true);assert(!fresh.terminated);checks.push('restart terminates prior worker; stale completion ignored');
fresh.onmessage({data:{result:paired[0]}});assert(fresh.terminated);assert.equal(el('mppsi-export').disabled,false);assert(el('mppsi-results').children.length>0);checks.push('successful result renders and enables export');
el('mppsi-iteration').value=50;el('mppsi-iteration').max=50;el('mppsi-iteration-value').textContent='第 50 / 50 轮';el('mppsi-seed').events.input();assert.equal(el('mppsi-iteration-value').textContent,'尚未运行');assert.equal(el('mppsi-iteration').value,1);assert.equal(el('mppsi-iteration').max,1);assert.equal(el('mppsi-iteration').disabled,true);checks.push('input invalidation clears stale iteration position and label');assert.equal(el('mppsi-export').disabled,true);assert.equal(el('mppsi-results').children.length,0);checks.push('changed inputs invalidate old results');
run();const cancel=workers.at(-1);el('mppsi-cancel').events.click();assert(cancel.terminated);cancel.onmessage({data:{result:paired[0]}});assert.equal(el('mppsi-export').disabled,true);checks.push('cancel invalidates stale worker reply');
run();workers.at(-1).onerror({message:'mock runtime failure'});assert(el('mppsi-status').textContent.includes('mock runtime failure'));assert.equal(el('mppsi-export').disabled,true);checks.push('runtime error clears state');
fail=true;run();assert(el('mppsi-status').textContent.includes('mock startup failure'));fail=false;checks.push('worker startup error clears state');
run();const hidden=workers.at(-1);window.events.pagehide();assert(hidden.terminated);checks.push('pagehide terminates worker');
let resolveText;const target={files:[{size:40,text:()=>new Promise(resolve=>resolveText=resolve)}],value:'file'};const pending=el('mppsi-import').events.change({target});run();const count=workers.length;resolveText(JSON.stringify(paired[0].record));await pending;assert.equal(workers.length,count);checks.push('stale asynchronous import cannot replace new run');
const oversized={files:[{size:100001}],value:'file'};await el('mppsi-import').events.change({target:oversized});assert(el('mppsi-status').textContent.includes('100 KB'));checks.push('oversized import rejected');
const malformed={files:[{size:2,text:async()=>'{'}],value:'file'};await el('mppsi-import').events.change({target:malformed});assert(el('mppsi-status').textContent.includes('导入失败'));checks.push('malformed JSON import rejected');
const workerContext={self:{postMessage(x){workerContext.last=x;}},runPaired:()=>paired[0],replayPaired:()=>{throw Error('mock invalid replay');}};
vm.runInNewContext(fs.readFileSync(new URL(base+'mppsi-worker.mjs',import.meta.url),'utf8').replace(/^import[^\n]*\n/,''),workerContext);
workerContext.self.onmessage({data:{id:23,config:{}}});assert.equal(workerContext.last.id,23);assert(workerContext.last.result);
workerContext.self.onmessage({data:{id:24,record:{}}});assert.equal(workerContext.last.id,24);assert.equal(workerContext.last.error,'mock invalid replay');checks.push('worker response IDs and error path');
const report={all_passed:true,checks,scope:'Executed Node VM DOM/Worker mocks; not real browser, layout, module loading, download, or accessibility proof'};
fs.writeFileSync((process.env.ISAC_MPPSI_REPORT||new URL('./lifecycle-report.json',import.meta.url)),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
