/* UI-only bridge to unchanged numerical controls. No result or core state is fabricated. */
(function(root){
'use strict';
function installTheoryAdapter(doc,lesson){
 if(lesson.coreId==='extended-target')return installExtendedAdapter(doc,lesson);
 const id=lesson.id, cache=new Map(),restore=[],listeners=[];let disposed=false,requested=false,serial=0,revision=0,submittedRevision=null,submittedSnapshot=null,presetPending=false;
 const query=s=>{if(!s)throw Error('Missing selector');if(!cache.has(s)){const e=doc.querySelector(s);if(!e)throw Error('Missing original control '+s);cache.set(s,e);}return cache.get(s);};
 const text=s=>query(s).textContent||'', on=s=>!query(s).disabled, visible=s=>!query(s).hidden;
 // Cache before a shell reparents controls. Maintain original form submission ownership.
 for(const s of [lesson.firstRun.runSelector,...lesson.firstRun.outputSelectors,...(lesson.ui.liveSelectors||[]),...(lesson.ui.actionSelectors||[])])query(s);
 for(const [button,form] of id==='nearfield-multitarget-correlation'?[['#mt-run','mt-form']]:id==='supplement-case-distributed-detection'?[['#cf-run','cf-form']]:[]){const e=query(button),old=e.getAttribute('form');restore.push(()=>old===null?e.removeAttribute('form'):e.setAttribute('form',old));e.setAttribute('form',form);}
 const listen=(e,t,f)=>{e.addEventListener(t,f,true);listeners.push(()=>e.removeEventListener(t,f,true));};
 const recordNodes=()=>[...new Set((lesson.ui.recordInputSelectors||[]).flatMap(s=>Array.from(doc.querySelectorAll(s))))];
 const parameters=()=>recordNodes().map(e=>({id:e.id||e.name,type:e.type,value:['checkbox','radio'].includes(e.type)?e.checked:e.value,option:e.type==='radio'?e.value:undefined}));
 const snapshot=()=>JSON.stringify(parameters());
 const start=()=>{requested=true;serial++;submittedRevision=revision;submittedSnapshot=snapshot();presetPending=id==='supplement-case-near-field';};
 const autoEdit=['tradeoffs-feedback-capacity-distortion-2018','tradeoffs-causal-state-communication-2013','supplement-case-multipath-channel'].includes(id);
 const edited=e=>{if(recordNodes().includes(e.target)){revision++;requested=false;presetPending=false;if(autoEdit)start();}else if(e.target.type==='file'){revision++;requested=false;presetPending=false;}};
 const rootHost=query(lesson.ui.rootSelector);listen(rootHost,'input',edited);listen(rootHost,'change',edited);
 listen(query(lesson.firstRun.runSelector),'click',start);
 for(const selector of [lesson.singleControlChange?.runSelector,lesson.singleControlChange?.followupRunSelector,'#wfl-weighted-run','[data-nfr-action="receive"]','[data-nfr-action="regenerate"]']){const el=selector&&doc.querySelector(selector);if(el)listen(el,'click',start);}
 // Fresh-channel and sweep actions change H / the submitted scenario without an input event.
 // They must not revive a prior guided record, even if the visible values later match.
 for(const selector of [lesson.ui.resetSelector,...lesson.ui.actionSelectors.filter(s=>/cancel/.test(s)),...(id==='crb'?['#cm-fresh','#cm-sweep']:[])]){const el=selector&&doc.querySelector(selector);if(el)listen(el,'click',()=>{revision++;requested=false;presetPending=false;});}

 function setControls(cs){for(const c of cs||[]){const e=query(c.selector);if(e.disabled)throw Error('Original control disabled: '+c.selector);if(e.type==='checkbox')e.checked=Boolean(c.value);else if(e.type==='radio')e.checked=true;else e.value=String(c.value);e.dispatchEvent(new doc.defaultView.Event(c.event||'input',{bubbles:true}));}}
 const click=s=>{const e=query(s);if(e.disabled)throw Error('Original action disabled: '+s);e.click();};
 function busy(){switch(id){
 case 'nearfield-multitarget-correlation':return query('#mt-run').disabled&&on('#mt-cancel');
 case 'tradeoffs-feedback-capacity-distortion-2018':return on('#cd-cancel')||/即将按当前模型重新计算/.test(text('#cd-status'));
 case 'tradeoffs-causal-state-communication-2013':return query('#cc-status').dataset.phase==='pending';
 case 'optimal_waveform':return on('#wfl-cancel');
 case 'joint_beamforming':return on('#jbo-cancel');
 case 'crb':return on('#cm-cancel');
 case 'supplement-case-crb':return on('#gt-cancel');
 case 'supplement-case-near-field':return on('[data-nfr-action="cancel"]');
 case 'supplement-case-multipath-channel':return query('#position-information').dataset.mpiState==='pending';
 case 'supplement-case-distributed-detection':return query('#cf-run').disabled&&on('#cf-cancel');
 default:return false;}}
 function terminal(){switch(id){
 case 'nearfield-multitarget-correlation':return visible('#mt-results')&&!/历史记录/.test(text('#mt-record-state')) || visible('#mt-error')&&!!text('#mt-error');
 case 'tradeoffs-feedback-capacity-distortion-2018':return visible('#cd-results')||/本次计算失败/.test(text('#cd-status'));
 case 'tradeoffs-causal-state-communication-2013':return ['ready','invalid','error'].includes(query('#cc-status').dataset.phase);
 case 'optimal_waveform':return visible('#wfl-result')||visible('#wfl-error')&&!!text('#wfl-error');
 case 'joint_beamforming':return ['#jbo-summary-sdr','#jbo-summary-zf'].some(s=>!['not_attempted','running',undefined].includes(query(s).dataset.state))&&!/尚未运行|已清空|等待重新求解/.test(text('#jbo-status'));
 case 'crb':return /^运行 \d+/.test(text('#cm-current-label'))||visible('#cm-error')&&!!text('#cm-error');
 case 'supplement-case-crb':return text('#gt-status')==='新鲜计算完成'&&query('#gt-draft').hidden||visible('#gt-error')&&!!text('#gt-error');
 case 'supplement-case-near-field':return /接收机结束：|本次操作失败：|Worker 启动失败/.test(text('#nfr-status'));
 case 'supplement-case-multipath-channel':return !!query('#position-information').dataset.mpiRecordId||['error','failed'].includes(query('#position-information').dataset.mpiState);
 case 'supplement-case-distributed-detection':return visible('#cf-results')||visible('#cf-error')&&!!text('#cf-error');
 default:return false;}}
 function fresh(){if(!requested||submittedRevision!==revision||busy()||!terminal())return false;if(presetPending){submittedSnapshot=snapshot();presetPending=false;}return submittedSnapshot===snapshot();}
 function ready(){return !disposed&&fresh();} // terminal is deliberately not a numerical acceptance assertion
 async function waitFor(test,ms=180000){const ticket=serial,end=Date.now()+ms;while(!test()){if(disposed||ticket!==serial)throw Error('Guided action superseded or disposed');if(Date.now()>end)throw Error('Waiting limit reached; original result remains pending, not success');await new Promise(r=>setTimeout(r,50));}}
 function prepare(){/* Do not silently overwrite a custom matrix or stop an existing original task. */return {idle:!busy(),autostartGated:['tradeoffs-causal-state-communication-2013','supplement-case-multipath-channel'].includes(id),ready:ready()};}
 function originalRun(){click(lesson.firstRun.runSelector);}
 async function run(kind='first'){
  if(disposed)throw Error('Disposed theory adapter');if(busy())throw Error('Original computation is still running; use its cancel control first');
  start();
  if(kind==='first'){
   // Clicking the guided initial-preset action explicitly selects the documented initial inputs.
   if(!['tradeoffs-causal-state-communication-2013','supplement-case-multipath-channel'].includes(id)&&lesson.ui.resetSelector)click(lesson.ui.resetSelector);
   setControls(lesson.firstRun.controls);
   if(!['tradeoffs-causal-state-communication-2013','supplement-case-multipath-channel'].includes(id))originalRun();
   else if(!lesson.firstRun.controls.length)originalRun();
  } else if(kind==='compare'){
   const c=lesson.singleControlChange;
   if(id==='optimal_waveform'){
    setControls([{selector:'#wfl-rho',value:0,event:'input'}]);click('#wfl-weighted-run');await waitFor(()=>!busy()&&terminal());
    setControls([{selector:'#wfl-rho',value:c.to,event:'input'}]);click('#wfl-weighted-run');
   } else if(id==='supplement-case-near-field'){
    setControls([{selector:c.selector,value:c.to,event:c.event}]);click(c.runSelector);
    await waitFor(()=>!busy()&&/新的 Y 已生成|本次操作失败/.test(text('#nfr-status')));
    if(/本次操作失败/.test(text('#nfr-status')))return;
    click(c.followupRunSelector);
   } else {
    setControls([{selector:c.selector,value:c.to,event:c.event}]);
    if(c.runSelector&&!['tradeoffs-causal-state-communication-2013','supplement-case-multipath-channel'].includes(id))click(c.runSelector);
   }
  } else if(kind==='failure'){
   switch(id){
   case 'nearfield-multitarget-correlation':setControls([{selector:'#mt-preset',value:'degenerate',event:'change'}]);click('#mt-apply-preset');originalRun();break;
   case 'tradeoffs-feedback-capacity-distortion-2018':setControls([{selector:'#cd-q',value:0,event:'input'}]);originalRun();break;
   case 'tradeoffs-causal-state-communication-2013':setControls([{selector:'#cc-budget',value:.15,event:'input'}]);break;
   case 'optimal_waveform':click('#wfl-zero');originalRun();break;
   case 'joint_beamforming':setControls([{selector:'#jbo-preset',value:'budget',event:'change'}]);originalRun();break;
   case 'crb':setControls([{selector:'#cm-gamma-number',value:20,event:'input'}]);originalRun();break;
   case 'supplement-case-crb':setControls([{selector:'#gt-t',value:2,event:'input'}]);originalRun();break;
   case 'supplement-case-near-field':setControls([{selector:'#nfr-stepM',value:'1',event:'input'}]);click('[data-nfr-action="receive"]');break;
   case 'supplement-case-multipath-channel':click('#mpi-coincident');break;
   case 'supplement-case-distributed-detection':click('#cf-preset-capped');originalRun();break;
   }
  } else throw Error('Unknown guided action '+kind);
 }
 function reveal(step){
  // Explicit authored stage wins. Do not let a focus node from another native stage override it.
  if(step?.revealSelector){click(step.revealSelector);return;}
  const selectors=step?.focusSelector?[step.focusSelector]:(lesson.readActions||[]).map(a=>a.selector);
  // Explicit stage buttons only. Never synthesize a chart click or new scientific calculation.
  if(!step?.focusSelector)for(const s of selectors)click(s);
  if(step?.focusSelector){const e=query(step.focusSelector);if(e.tagName==='BUTTON'&&(e.hasAttribute?.('data-stage')||e.hasAttribute?.('data-mpi-view'))&&!e.disabled)e.click();for(let p=e.parentElement;p;p=p.parentElement){if(p.tagName==='DETAILS')p.open=true;if(p.id&&/^(mt|cf)-(geometry|optimization|recovery|illumination|receiver|observation|matrices|detection|power)$/.test(p.id)){const name=p.id.replace(/^(mt|cf)-/,'');const b=doc.querySelector('[data-stage="'+name+'"]');if(b&&!b.disabled)b.click();}}e.scrollIntoView?.({block:'nearest'});}
 }
 return {query,prepare,setControls,ready,busy,fresh,run,reveal,actions:{compare:true,failure:true},getState:()=>({requested,revision,submittedRevision,serial,parameters:parameters(),ready:ready(),busy:busy(),fresh:fresh(),scientificSuccess:'not inferred'}),dispose(){disposed=true;for(const f of listeners)f();for(const f of restore)f();cache.clear();}};
}
function installExtendedAdapter(doc,lesson){
 const cache=new Map(),offs=[];let requested=false,disposed=false,revision=0,submittedRevision=null,submittedSnapshot=null,serial=0;
 const query=s=>{if(!cache.has(s)){const e=doc.querySelector(s);if(!e)throw Error('Missing extended CRB control '+s);cache.set(s,e);}return cache.get(s);};
 const status=()=>query('#status').textContent||'',origin=()=>query('#origin').textContent||'';
 const btn=query('#form button[type="submit"]'),form=query('#form'),prior=btn.getAttribute('form');btn.setAttribute('form','form');
 const listen=(e,t,f)=>{e.addEventListener(t,f,true);offs.push(()=>e.removeEventListener(t,f,true));};
 const nodes=()=>Array.from(doc.querySelectorAll('#form input,#form select,#form textarea')).filter(e=>e.type!=='file');
 const parameters=()=>nodes().map(e=>({id:e.id||e.name,value:['checkbox','radio'].includes(e.type)?e.checked:e.value}));
 const snapshot=()=>JSON.stringify(parameters());
 const begin=()=>{requested=true;serial++;submittedRevision=revision;submittedSnapshot=snapshot();};listen(btn,'click',begin);listen(form,'submit',begin);
 const edit=()=>{revision++;requested=false;};listen(form,'input',edit);listen(form,'change',edit);
 const busy=()=>/^Starting |^Running |^Cancellation requested/.test(status());
 const terminal=()=>/^Finished:|^Worker error:|^Worker could not run:|^Result validation failed:|^Input error:/.test(status());
 const fresh=()=>requested&&submittedRevision===revision&&submittedSnapshot===snapshot()&&!busy()&&terminal()&&!/^IMPORTED/.test(origin());
 const ready=()=>!disposed&&fresh();
 const setControls=cs=>{for(const c of cs||[]){const e=query(c.selector);if(e.disabled)throw Error('Original control disabled '+c.selector);e.value=String(c.value);e.dispatchEvent(new doc.defaultView.Event(c.event||'input',{bubbles:true}));}};
 const run=async(kind='first')=>{if(disposed||busy())throw Error('Extended CRB unavailable or busy');if(kind!=='first')throw Error('Extended recovery comparison is already in the same real run; no extra comparison/failure action is authored');requested=true;setControls(lesson.firstRun?.controls||[]);btn.click();};
 const reveal=step=>{if(step?.focusSelector){const e=query(step.focusSelector);for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;e.scrollIntoView?.({block:'nearest'});}};
 return {query,setControls,prepare:()=>({idle:!busy(),ready:ready()}),busy,fresh,ready,run,reveal,actions:{compare:false,failure:false},getState:()=>({revision,submittedRevision,serial,parameters:parameters(),ready:ready(),busy:busy(),fresh:fresh(),scientificSuccess:'not inferred'}),dispose(){disposed=true;offs.forEach(f=>f());if(prior===null)btn.removeAttribute('form');else btn.setAttribute('form',prior);cache.clear();}};
}
const api={installTheoryAdapter};if(typeof module==='object'&&module.exports)module.exports=api;else root.TheoryGuidedAdapters=api;
})(globalThis);
