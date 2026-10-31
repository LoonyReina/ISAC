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
