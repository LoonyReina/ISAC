// Optional, local reading aid. The complete comparison remains in static HTML.
(() => {
'use strict';
const idPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const validId=value=>typeof value==='string'&&value.length<=64&&idPattern.test(value)&&value.match(idPattern)[0]===value;
function initialize(group){
 if(group.dataset.comparisonReady==='true')return;
 const config=JSON.parse(group.querySelector('[data-comparison-config]').textContent);
 const validIds=ids=>Array.isArray(ids)&&ids.length>0&&ids.every(validId)&&new Set(ids).size===ids.length;
 if(!config||!validId(config.id)||group.id!=='comparison-'+config.id||!validIds(config.questions)||!validIds(config.premises)||!Array.isArray(config.checks)||!config.checks.length)throw new Error('Invalid comparison configuration');
 const controls=[...group.querySelectorAll('[data-comparison-controls]')];
 const reset=group.querySelector('[data-comparison-reset]');
 const resetStatus=group.querySelector('[data-comparison-reset-status]');
 const allChoices=[...group.querySelectorAll('[data-comparison-choice]')];
 const allPanels=[...group.querySelectorAll('[data-comparison-panel]')];
 const lenses=['question','premise'].map(kind=>{
  const ids=config[kind+'s'],choices=allChoices.filter(n=>n.dataset.comparisonChoice===kind),panels=allPanels.filter(n=>n.dataset.comparisonPanel===kind);
  const status=group.querySelector('[data-comparison-status="'+kind+'"]');
  if(!status||choices.length!==ids.length||panels.length!==ids.length||ids.some(id=>choices.filter(n=>n.value===id).length!==1||panels.filter(n=>n.dataset.comparisonValue===id).length!==1))throw new Error('Incomplete comparison lens');
  const summaries=panels.map(p=>p.querySelector('summary'));
  if(summaries.some(s=>!s))throw new Error('Missing comparison summary');
  return {kind,ids,choices,panels,summaries,status};
 });
 const checkNodes=[...group.querySelectorAll('[data-comparison-check]')];
 if(checkNodes.length!==config.checks.length||!validIds(config.checks.map(c=>c.id)))throw new Error('Invalid comparison checks');
 const checks=config.checks.map(c=>{
  if(!validIds(c.options))throw new Error('Invalid comparison options');
  const matches=checkNodes.filter(n=>n.dataset.comparisonCheck===c.id);if(matches.length!==1)throw new Error('Missing comparison check');
  const node=matches[0],answers=[...node.querySelectorAll('[data-comparison-answer]')],explanations=[...node.querySelectorAll('[data-comparison-explanation]')];
  const button=node.querySelector('[data-comparison-explain]'),status=node.querySelector('[data-comparison-check-status]'),feedback=node.querySelector('[data-comparison-feedback]');
  if(!button||!status||!feedback||answers.length!==c.options.length||explanations.length!==c.options.length||c.options.some(id=>answers.filter(n=>n.value===id).length!==1||explanations.filter(n=>n.dataset.comparisonExplanation===id).length!==1))throw new Error('Incomplete comparison judgment');
  return {...c,node,answers,explanations,button,status,feedback};
 });
 if(!reset||!resetStatus||!controls.length)throw new Error('Missing comparison controls');
 // Check every required node before changing visibility. Malformed enhancement
 // data leaves the original details, sources and reference answers available.
 function select(lens,value,announce){
  const chosen=lens.ids.includes(value)?value:lens.ids[0];
  lens.choices.forEach(input=>{input.checked=input.value===chosen;});
  lens.panels.forEach(panel=>{panel.hidden=panel.dataset.comparisonValue!==chosen;if(!panel.hidden)panel.open=true;});
  const label=lens.summaries[lens.panels.findIndex(p=>p.dataset.comparisonValue===chosen)].textContent;
  lens.status.textContent=announce?(lens.kind==='question'?'阅读视角：':'拟比较前提：')+label+'。这只是阅读提示。':'';
 }
 function clear(check){check.feedback.replaceChildren();check.feedback.hidden=true;check.status.textContent='';}
 lenses.forEach(lens=>lens.choices.forEach(input=>input.addEventListener('change',()=>{if(input.checked){resetStatus.textContent='';select(lens,input.value,true);}})));
 checks.forEach(check=>{
  check.answers.forEach(input=>input.addEventListener('change',()=>{resetStatus.textContent='';clear(check);}));
  check.button.addEventListener('click',()=>{
   resetStatus.textContent='';
   const chosen=check.answers.filter(input=>input.checked&&check.options.includes(input.value));
   clear(check);
   if(chosen.length!==1){check.status.textContent='先选一个判断，再看对应解释。';return;}
   const explanation=check.explanations.find(n=>n.dataset.comparisonExplanation===chosen[0].value);
   check.feedback.replaceChildren(explanation.cloneNode(true));
   check.feedback.hidden=false;
   check.status.textContent='已展开对应理由与原文定位；这不是比较完成的认证。';
  });
 });
 reset.addEventListener('click',()=>{
  lenses.forEach(lens=>select(lens,lens.ids[0],false));
  checks.forEach(check=>{check.answers.forEach(input=>{input.checked=false;});clear(check);});
  resetStatus.textContent='本组选择已恢复默认，判断解释已清除。';
 });
 lenses.forEach(lens=>select(lens,lens.ids[0],false));
 checks.forEach(clear);
 group.dataset.comparisonReady='true';
 controls.forEach(node=>{node.hidden=false;});
}
for(const group of document.querySelectorAll('[data-comparison-group]')){
 try{initialize(group);}catch{/* Fail closed for controls; static reading still works. */}
}
})();
