import {loadPrecomputed} from './precomputed-loader.mjs';
import {ResearchController,fieldsFromSpec,MAX_RECORD_BYTES} from './controller.mjs';
import {renderResearch} from './view.mjs';

export function revealLegacyAnchor(root,hash) {
 let id;try{id=decodeURIComponent(String(hash??'').replace(/^#/,''));}catch{return false;}
 if(id!=='geometry'&&id!=='experiment'&&!id.startsWith('nf-'))return false;
 const target=root.ownerDocument.getElementById(id);if(!target||!root.contains(target))return false;
 const disclosure=target.closest?.('.nfr-prerequisite');if(disclosure)disclosure.open=true;return !!disclosure;
}

export function mountResearch(root) {
 if(!root)throw Error('Missing research lesson root');
 const doc=root.ownerDocument,status=doc.getElementById('nfr-status'),picker=doc.getElementById('nfr-import-file');
 const controls=[...root.querySelectorAll('[data-nfr-field]')],buttons=[...root.querySelectorAll('[data-nfr-action]')];
 let current=null,renderQueued=false,disposed=false,lastAnnouncement='';const downloads=new Set();
 function updateButtons(s){
  const preset=root.querySelector('[data-nfr-preset]');if(preset)preset.disabled=!!s.busy||s.invalidGroups.length>0;
  for(const b of buttons){const action=b.dataset.nfrAction,invalid=s.invalidGroups.length>0;
   b.disabled=action==='cancel'?!s.busy:['receive','export-full'].includes(action)?invalid||!controller.hasRaw||!!s.busy:action==='regenerate'?invalid||!controller.hasWaveform||!!s.busy:action==='audit'?invalid||!controller.hasRaw||!!s.busy:action==='export-diagnostic'?invalid||!!s.busy:action==='solve'?invalid:false;
  }
 }
 function paint(){renderQueued=false;if(disposed)return;renderResearch(root,current);updateButtons(current);
  const announcement=current.error?`${current.status}（${current.error}）`:current.status;
  // Completed actions and changes are announced. Hundreds of Worker ticks are not.
  if(status&&announcement!==lastAnnouncement){status.textContent=announcement;lastAnnouncement=announcement;}
 }
 function change(s){current=s;if(!renderQueued){renderQueued=true;(globalThis.requestAnimationFrame??(fn=>setTimeout(fn,0)))(paint);}}
 const controller=new ResearchController({onChange:change});
 function syncControls(){const fields=fieldsFromSpec(controller.experiment.spec);for(const c of controls){const value=fields[c.dataset.nfrGroup]?.[c.dataset.nfrField];if(c.type==='checkbox')c.checked=!!value;else {if(c.tagName==='SELECT'&&![...c.options].some(o=>o.value===String(value))){const option=doc.createElement('option');option.value=String(value);option.textContent=`${value} m（导入值）`;option.dataset.nfrImported='true';c.append(option);}c.value=String(value??'');}c.removeAttribute('aria-invalid');}}
 function groupValues(group){const fields={};for(const c of controls)if(c.dataset.nfrGroup===group)fields[c.dataset.nfrField]=c.type==='checkbox'?c.checked:c.value;return fields;}
 function onInput(event){const c=event.target;if(!c?.dataset?.nfrField)return;const group=c.dataset.nfrGroup;
  const accepted=controller.edit(group,groupValues(group),[c.dataset.nfrField]);for(const control of controls)if(control.dataset.nfrGroup===group)control.setAttribute('aria-invalid',String(!accepted));
 }
 function error(error){controller.error=String(error.message??error);controller.status=`操作未执行：${controller.error}`;controller.notify();}
 function download(text,kind){
  const blob=new Blob([text],{type:'application/json;charset=utf-8'});if(blob.size>MAX_RECORD_BYTES)throw Error('记录超过 16 MiB UTF-8 上限');
  const url=URL.createObjectURL(blob);downloads.add(url);const a=doc.createElement('a');a.href=url;a.download=`nearfield-${kind}-${new Date().toISOString().replaceAll(':','-')}.json`;doc.body.append(a);a.click();a.remove();
  setTimeout(()=>{URL.revokeObjectURL(url);downloads.delete(url);},30000);
 }
 async function onClick(event){
  const preset=event.target.closest?.('[data-nfr-preset]');if(preset&&root.contains(preset)&&!preset.disabled){try{const result=await loadPrecomputed(controller);if(result.status==='precomputed_observation_ready'){syncControls();await controller.action('receive');}}catch(e){error(e);}return;}
  const button=event.target.closest?.('[data-nfr-action]');if(!button||!root.contains(button)||button.disabled)return;
  const action=button.dataset.nfrAction;try{
   if(action==='reset'){controller.reset();syncControls();}
   else if(action==='cancel')controller.cancel();
   else if(action==='import'){picker.value='';picker.click();}
   else if(action==='export-full'||action==='export-diagnostic')download(controller.export(action==='export-full'?'full':'diagnostic'),action==='export-full'?'raw-record':'input-diagnostic');
   else await controller.action(action);
  }catch(e){error(e);}
 }
 async function onFile(){const file=picker.files?.[0];if(!file)return;picker.value='';const result=await controller.importFile(file);if(result.status==='imported')syncControls();}
 const onHash=()=>revealLegacyAnchor(root,globalThis.location?.hash);
 const prerequisite=root.querySelector('.nfr-prerequisite');
 const onLegacyToggle=()=>{if(prerequisite?.open&&typeof globalThis.dispatchEvent==='function')globalThis.dispatchEvent(new Event('resize'));};
 root.addEventListener('input',onInput);root.addEventListener('click',onClick);picker?.addEventListener('change',onFile);prerequisite?.addEventListener('toggle',onLegacyToggle);globalThis.addEventListener?.('hashchange',onHash);onHash();
 async function dispose(){if(disposed)return;disposed=true;root.removeEventListener('input',onInput);root.removeEventListener('click',onClick);picker?.removeEventListener('change',onFile);prerequisite?.removeEventListener('toggle',onLegacyToggle);globalThis.removeEventListener?.('hashchange',onHash);for(const url of downloads)URL.revokeObjectURL(url);downloads.clear();await controller.close();}
 // A bfcache page is rebuilt on return; retained closed Workers are never reused.
 globalThis.addEventListener?.('pagehide',()=>{void dispose();},{once:true});
 globalThis.addEventListener?.('pageshow',event=>{if(event.persisted&&disposed)globalThis.location?.reload();});
 syncControls();change(controller.snapshot());return {controller,dispose,syncControls};
}
if(typeof document!=='undefined'){
 const root=document.getElementById('nfr-app');if(root){try{mountResearch(root);}catch(error){const status=document.getElementById('nfr-status');if(status)status.textContent=`研究模块未启动：${String(error.message??error)}。原有无噪声先修实验不受影响。`;}}
}
