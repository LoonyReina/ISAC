(function(root){'use strict';
/** Install after original initialization, before guided DOM moves. No Worker or numerical calls. */
function installReceiverAdapter(doc,lesson){
 const cache=new Map(),events=[],formRestore=[];let revision=0,submittedRevision=null,submittedSnapshot=null,disposed=false;
 const host=doc.querySelector(lesson.ui.rootSelector);if(!host)throw Error('Missing lesson root');
 const query=selector=>{if(cache.has(selector))return cache.get(selector);const list=host.querySelectorAll(selector);if(list.length!==1)throw Error('Receiver binding is not unique: '+selector+' ('+list.length+')');cache.set(selector,list[0]);return list[0];};
 const listen=(node,type,fn,capture=false)=>{node.addEventListener(type,fn,capture);events.push([node,type,fn,capture]);};
 // Capture references before relocation: selectors with form ancestry stop matching afterwards.
 const comparison=lesson.singleControlChange?.runtimeAction;
 const selectors=[...(comparison?.controls||[]).map(c=>c.selector),...(comparison?.runSelector?[comparison.runSelector]:[]),lesson.firstRun.runSelector,lesson.ui.resetSelector,lesson.ui.readySelector,...lesson.ui.liveSelectors,...lesson.ui.actionSelectors,...lesson.ui.readSelectors,...lesson.firstRun.controls.map(c=>c.selector),...(lesson.oneFailureCase?.controls||[]).map(c=>c.selector)];
 selectors.forEach(query);
 for(const b of lesson.ui.formBindings||[]){const el=query(b.selector),old=el.getAttribute('form');if(!doc.getElementById(b.form))throw Error('Missing owner form '+b.form);formRestore.push([el,old]);el.setAttribute('form',b.form);}
 const inputSelectors=lesson.ui.inputSelectors||lesson.firstRun.controls.map(c=>c.selector);
 const numericalControls=()=>[...new Set(inputSelectors.flatMap(s=>Array.from(host.querySelectorAll(s))))];
 const snapshot=()=>JSON.stringify(numericalControls().map(e=>[e.id,e.type==='checkbox'?e.checked:e.value]));
 const markEdited=()=>{revision++;};
 // Display-only inspection controls are deliberately excluded; only numerical input controls invalidate.
 const onEdit=e=>{if(numericalControls().includes(e.target))markEdited();};
 listen(host,'input',onEdit,true);listen(host,'change',onEdit,true);
 const begin=()=>{submittedRevision=revision;submittedSnapshot=snapshot();};
 for(const selector of new Set([lesson.firstRun.runSelector,...(comparison?.runSelector?[comparison.runSelector]:[])]))listen(query(selector),'click',begin,true);
 // Enter-to-submit remains a real execution, including when the original button was moved.
 const formIds=new Set((lesson.ui.formBindings||[]).map(b=>b.form));for(const id of formIds)listen(doc.getElementById(id),'submit',begin,true);
 listen(query(lesson.ui.resetSelector),'click',()=>{markEdited();submittedRevision=null;submittedSnapshot=null;},true);
 const setControls=items=>{if(disposed)throw Error('Disposed receiver adapter');for(const c of items){const e=query(c.selector);if(e.type==='checkbox')e.checked=Boolean(c.value);else e.value=String(c.value);e.dispatchEvent(new doc.defaultView.Event(c.event||'change',{bubbles:true}));}};
 const predicate=p=>{if(!p?.selector)return false;const e=query(p.selector);if(p.textIncludes!==undefined)return e.textContent.includes(p.textIncludes);if(p.attribute)return e.getAttribute(p.attribute)===String(p.equals);if(p.property)return e[p.property]===p.equals;if(p.classIncludes)return e.classList.contains(p.classIncludes);return false;};
 const fresh=()=>submittedRevision!==null&&submittedRevision===revision&&submittedSnapshot===snapshot()&&!predicate(lesson.ui.lifecycle?.stale);
 const busy=()=>predicate(lesson.ui.lifecycle?.busy);
 const ready=()=>{
  if(!fresh()||busy())return false;
  // A failed acquisition can be a current, completed experiment. Do not hide a failure behind Next.
  if(lesson.id==='bistatic-ofdm-clock-measurement-2023')return /三分支已在同一份 IQ 上完成|保留失败：/.test(query('#bi-status').textContent);
  return predicate(lesson.ui.lifecycle?.ready)||query(lesson.ui.readySelector).textContent.includes(lesson.ui.readyText||lesson.firstRun.completionText);
 };
 const prepare=()=>{query(lesson.ui.resetSelector).click();setControls(lesson.firstRun.controls);submittedRevision=null;submittedSnapshot=null;};
 return {query,setControls,prepare,ready,busy,fresh,begin,get revision(){return revision;},getState(){return {revision,submittedRevision,fresh:fresh(),busy:busy(),ready:ready(),scientificSuccess:'not inferred'};},dispose(){disposed=true;for(const [e,t,f,c]of events)e.removeEventListener(t,f,c);for(const [e,old]of formRestore){if(old===null)e.removeAttribute('form');else e.setAttribute('form',old);}cache.clear();}};
}
const active=new WeakMap();
function beforeMount(doc,route){if(active.has(doc))throw Error('Receiver adapter already mounted');const a=installReceiverAdapter(doc,route);active.set(doc,a);return a;}
function applyControls(doc,controls){const a=active.get(doc);if(!a)throw Error('Call beforeMount first');return a.setControls(controls);}
function isCurrent(doc){return active.get(doc)?.ready()||false;}
function dispose(doc){active.get(doc)?.dispose();active.delete(doc);}
const api={installReceiverAdapter,beforeMount,applyControls,isCurrent,dispose};
if(typeof module==='object'&&module.exports)module.exports=api;else {root.ReceiverGuidedAdapters=api;root.installReceiverAdapter=installReceiverAdapter;}
})(globalThis);
