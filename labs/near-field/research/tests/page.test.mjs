// Static author checks of the hand-written source and bindings only.
// These tests do not run or certify a browser, layout, keyboard use, or graphics.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {defaultSpec} from '../defaults.mjs';
import {fieldsFromSpec} from '../controller.mjs';
import {mountResearch,revealLegacyAnchor} from '../entry.mjs';
import {validateReceiver} from '../runtime/src/contract.mjs';

// Exact fixture/hash anchors from accepted baseline tree
// ecb8bf58e45d487d30e07e7bdb24758ddb6c5acc. No Git dependency at test time:
// the compatibility builder runs this file in an isolated old-layout staging tree.
const root=new URL('../../../../',import.meta.url);
const read=(canonical,legacy=canonical)=>{const source=new URL(canonical,root);return readFileSync(existsSync(source)?source:new URL(legacy,root),'utf8');};
const sha256=text=>createHash('sha256').update(text).digest('hex');
const baselineHashes={
 'near-field.html':'426b626ee4af76b7ef6de6024831e8d97de5c5366de6ad428691a4d0d72c55a8',
 'near-field-core.js':'cb4424211d1c3649915c5e65c22d88b6cfa73e9a7e55d16f23111e8eedc85f69',
 'near-field.js':'194dc5066cc86867144c437131c007844af5afdc7e894e03bc5bdee12e1d3ca5',
 'near-field.css':'04935d9c7882f19ad3721cf66f6294fc274db315851029f47217c668ae9ac01e',
};
const html=read('content/pages/near-field.html','near-field.html'),previous=readFileSync(new URL('./fixtures/near-field-legacy.html',import.meta.url),'utf8');
const entry=read('labs/near-field/research/entry.mjs'),view=read('labs/near-field/research/view.mjs');
const tags=text=>[...text.matchAll(/<[a-z][^>]*>/gi)].map(m=>m[0]);
const attributes=tag=>Object.fromEntries([...tag.matchAll(/\b([\w:-]+)="([^"]*)"/g)].map(([,key,value])=>[key,value]));
const opening=(text,id)=>{const found=tags(text).filter(tag=>attributes(tag).id===id);assert.equal(found.length,1,`unique opening tag for ${id}`);return found[0];};
const ids=text=>[...text.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const section=(text,id)=>{const start=text.indexOf(opening(text,id));const end=text.indexOf('</section>',start);assert(end>start,`${id} section closes`);return text.slice(start,end+'</section>'.length);};
const selectedText=(text,id,tag)=>{const start=text.indexOf(opening(text,id));return text.slice(start,text.indexOf(`</${tag}>`,start)+tag.length+3);};
const fields=tags(html).map(tag=>({tag,...attributes(tag)})).filter(tag=>tag['data-nfr-field']);
const fieldMap=new Map(fields.map(field=>[`${field['data-nfr-group']}.${field['data-nfr-field']}`,field]));

test('all 21 legacy IDs remain unique and original curve lesson sections remain byte-identical',()=>{
 assert.equal(sha256(previous),baselineHashes['near-field.html'],'frozen baseline page bytes');
 const expected=['site-main','geometry','experiment','nf-n','nf-range-out','nf-range','nf-reset','nf-result','nf-response','nf-response-title','nf-response-desc','nf-response-caption','nf-phase','nf-phase-title','nf-phase-desc','nf-phase-caption','nf-metrics','nf-samples','nf-phases','paper','limits'];
 assert.deepEqual(ids(previous),expected);for(const id of expected)assert.equal(ids(html).filter(value=>value===id).length,1,id);
 assert.equal(new Set(ids(html)).size,ids(html).length,'no duplicate static IDs');
 for(const id of ['geometry','experiment'])assert.equal(section(html,id),section(previous,id),`${id}: unchanged legacy section`);
 for(const id of ['nf-n','nf-range','nf-reset'])assert.equal(opening(html,id),opening(previous,id));
 assert.equal(selectedText(html,'nf-n','select'),selectedText(previous,'nf-n','select'));assert.equal(selectedText(html,'nf-reset','button'),selectedText(previous,'nf-reset','button'));
});

test('legacy core, script, style bytes and existing script/style order are unchanged against accepted tree',()=>{
 for(const file of ['near-field-core.js','near-field.js','near-field.css'])assert.equal(sha256(read(`labs/near-field/${file}`,file)),baselineHashes[file],file);
 const scripts=text=>[...text.matchAll(/<script\b[^>]*src="[^"]+"[^>]*><\/script>/g)].map(m=>m[0]);
 const priorScripts=scripts(previous),currentScripts=scripts(html);assert.deepEqual(currentScripts.filter(tag=>!tag.includes('labs/near-field/research/entry.mjs')),priorScripts);assert.deepEqual(priorScripts,['<script defer src="near-field-core.js"></script>','<script defer src="near-field.js"></script>']);
 assert.equal(currentScripts.at(-1),'<script type="module" src="labs/near-field/research/entry.mjs"></script>');
 const styles=text=>tags(text).filter(tag=>attributes(tag).rel==='stylesheet');assert.deepEqual(styles(html).filter(tag=>!tag.includes('labs/near-field/research/research.css')),styles(previous));assert(styles(html).some(tag=>attributes(tag).href==='labs/near-field/research/research.css'));
});

test('every research control is uniquely labeled and matches a real controller field',()=>{
 const defaults=fieldsFromSpec(defaultSpec());const expected=Object.entries(defaults).flatMap(([group,values])=>Object.keys(values).map(key=>`${group}.${key}`));
 assert.equal(fields.length,expected.length);assert.equal(fieldMap.size,expected.length);assert.deepEqual([...fieldMap.keys()].sort(),expected.sort());
 for(const field of fields){assert.equal(field.id,`nfr-${field['data-nfr-field']}`);assert(html.includes(`for="${field.id}"`),`label for ${field.id}`);assert.equal(ids(html).filter(id=>id===field.id).length,1);}
 assert.equal(fieldMap.get('design.channels').tag.startsWith('<textarea'),true);assert.equal(fieldMap.get('design.channels').spellcheck,'false');assert(html.includes('id="nfr-channels-help"'));
 assert.match(entry,/fieldsFromSpec\(controller\.experiment\.spec\)/);assert.match(entry,/c\.value=String\(value\?\?''\)/);assert.match(entry,/controller\.edit\(group,groupValues\(group\),\[c\.dataset\.nfrField\]\)/);
});

test('numeric defaults and declared ranges agree with the explicit source, scene and receiver contract',()=>{
 // Expected HTML bounds are intentional teaching choices. Runtime additionally
 // admits smaller positive wall budgets and checks complex component constraints.
 const expected={
  'design.range':[15,30,'any',20],'design.angle':[30,60,'any',45],
  'design.rate0':[0,40,'any',5],'design.rate1':[0,40,'any',5],'design.rate2':[0,40,'any',5],'design.rate3':[0,40,'any',5],
  'design.power':[.06,.12,'any',.1],'design.commNoise':[5e-10,2e-9,'any',1e-9],'design.sensingNoise':[5e-10,2e-9,'any',1e-9],
  'design.gainMagnitude':[1e-8,.01,'any',1e-5],'design.gainPhase':[-Math.PI,Math.PI,'any',.37],
  'design.maxIterations':[1,240,1,240],'design.solverWallMs':[1,30000,1,30000],
  'scene.truthX':[0,40,'any',14.2],'scene.truthY':[0,40,'any',14],
  'scene.betaMagnitude':[0,.01,'any',1e-5],'scene.betaPhase':[-Math.PI,Math.PI,'any',.37],
  'scene.noiseVariance':[0,1e-5,'any',1e-9],'scene.seed':[0,4294967295,1,230201153],
  'receiver.maxRefineIterations':[1,200,1,80],'receiver.maxEigenSweeps':[1,60,1,60],
  'receiver.maximaLimit':[1,64,1,8],'receiver.receiverWallMs':[1,30000,1,30000],
 };
 const applied=fieldsFromSpec(defaultSpec());assert.equal(Object.keys(expected).length,23);
 for(const [key,[min,max,step,value]]of Object.entries(expected)){
  const field=fieldMap.get(key);assert(field,key);assert.equal(field.type,'number',key);assert.equal(Number(field.min),min,`${key} min`);assert.equal(Number(field.max),max,`${key} max`);assert.equal(field.step,String(step),`${key} step`);assert.equal(Number(field.value),value,`${key} static value`);
  const [group,name]=key.split('.');assert(Math.abs(Number(field.value)-applied[group][name])<=Math.max(1e-20,Math.abs(value)*1e-14),`${key} applied value`);
 }
 const refine=fieldMap.get('receiver.refine');assert.equal(refine.type,'checkbox');assert.match(refine.tag,/\schecked(?:\s|>)/);assert.equal(applied.receiver.refine,true);
 const select=selectedText(html,'nfr-stepM','select'),options=[...select.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)];
 assert.equal(options.length,5);assert.deepEqual(options.map(m=>Number(attributes(`<option${m[1]}>`).value)),[.2,.08,.4,1,2]);
 const selected=options.filter(m=>/\bselected\b/.test(m[1]));assert.equal(selected.length,1);assert.equal(Number(attributes(`<option${selected[0][1]}>`).value),applied.receiver.stepM);
 for(const option of options){const stepM=Number(attributes(`<option${option[1]}>`).value),receiver=defaultSpec().receiver;receiver.domain.stepM=stepM;assert.doesNotThrow(()=>validateReceiver(receiver));const points=(Math.round(40/stepM)+1)**2;assert(option[2].includes(points.toLocaleString('en-US')),`${stepM} displayed grid count`);}
});

test('all action buttons and all actual render targets have one matching bound container',()=>{
 const expectedActions=['solve','regenerate','receive','cancel','reset','export-full','export-diagnostic','import','audit'];
 const actions=tags(html).map(tag=>({tag,...attributes(tag)})).filter(tag=>tag['data-nfr-action']);assert.deepEqual(actions.map(tag=>tag['data-nfr-action']).sort(),expectedActions.sort());
 for(const action of actions){assert(action.tag.startsWith('<button'));assert.equal(action.type,'button');assert(!/onclick\s*=/.test(action.tag));}
 for(const name of ['regenerate','receive','cancel','export-full','audit'])assert.match(actions.find(action=>action['data-nfr-action']===name).tag,/\sdisabled(?:\s|>)/);
 const containers=tags(html).map(attributes).filter(tag=>tag['data-nfr-view']).map(tag=>tag['data-nfr-view']);
 const expectedViews=['geometry','status','solver','history','rates','waveform','observation','spectrum','eigen','refinement','evaluation','audit','provenance'];assert.deepEqual([...containers].sort(),expectedViews.sort());assert.equal(new Set(containers).size,containers.length);
 const rendered=[...view.matchAll(/\brender\('([^']+)'/g)].map(m=>m[1]);assert.deepEqual([...rendered].sort(),[...containers].sort());
 assert.match(entry,/querySelectorAll\('\[data-nfr-field\]'\)/);assert.match(entry,/querySelectorAll\('\[data-nfr-action\]'\)/);assert.match(entry,/getElementById\('nfr-app'\)/);assert.match(entry,/getElementById\('nfr-import-file'\)/);
 const picker=attributes(opening(html,'nfr-import-file'));assert.equal(picker.type,'file');assert.equal(picker.accept,'application/json');assert.match(opening(html,'nfr-import-file'),/\shidden(?:\s|>)/);
 const status=attributes(opening(html,'nfr-status'));assert.equal(status.role,'status');assert.equal(status['aria-live'],'polite');assert.equal(status['aria-atomic'],'true');
});

test('source retains static fallback and makes research and replay limits explicit',()=>{
 assert.match(html,/<noscript>/);assert.match(html,/首次打开不会自动求解/);assert.match(html,/Y=βaaᵀX\+Z|Y = βaaᵀX \+ Z/);assert.match(html,/16,777,216 UTF-8 字节/);assert.match(html,/尚未重新验证/);assert.match(html,/同步|不可中断/);assert.match(html,/RMSE/);
 assert(!/setInterval\s*\(|autoplay\s*[:=]/.test(entry));assert.match(entry,/syncControls\(\);change\(controller\.snapshot\(\)\)/);assert(!/innerHTML\s*=|insertAdjacentHTML\s*\(/.test(view),'imported prose cannot become executable HTML through the renderer');
});


test('legacy hash helper opens only the matching in-lesson disclosure, including encoded legacy IDs',()=>{
 const disclosure={open:false},targets=new Map();
 for(const id of ['geometry','experiment','nf-range','paper','nfr-range'])targets.set(id,{inside:true,closest:selector=>selector==='.nfr-prerequisite'?disclosure:null});
 targets.set('nf-outside',{inside:false,closest:()=>disclosure});targets.set('nf-unwrapped',{inside:true,closest:()=>null});
 const root={ownerDocument:{getElementById:id=>targets.get(id)},contains:target=>target.inside};
 for(const hash of ['#geometry','#experiment','#nf-range','#nf%2Drange']){disclosure.open=false;assert.equal(revealLegacyAnchor(root,hash),true);assert.equal(disclosure.open,true);}
 for(const hash of ['#paper','#nfr-range','#nf-missing','#nf-outside','#nf-unwrapped','#%E0%A4%A','',null]){disclosure.open=false;assert.equal(revealLegacyAnchor(root,hash),false);assert.equal(disclosure.open,false);}
 assert.match(entry,/addEventListener\?\.\('hashchange',onHash\)/);assert.match(entry,/removeEventListener\?\.\('hashchange',onHash\)/);
});

test('minimal DOM harness shows admitted imported grid values without blank or duplicate options',{timeout:10000},async()=>{
 // This harness exercises entry binding only; it makes no browser or layout claim.
 const noop=()=>{},select={tagName:'SELECT',type:'select-one',dataset:{nfrGroup:'receiver',nfrField:'stepM'},options:[.2,.08,.4,1,2].map(value=>({value:String(value)})),value:'',removeAttribute:noop,append(option){this.options.push(option);}};
 const picker={value:'',files:[],addEventListener:noop,removeEventListener:noop},status={textContent:''};
 const doc={getElementById:id=>id==='nfr-status'?status:id==='nfr-import-file'?picker:null,createElement:tag=>({tagName:tag.toUpperCase(),dataset:{},value:'',textContent:''})};
 const root={ownerDocument:doc,querySelectorAll:selector=>selector==='[data-nfr-field]'?[select]:[],querySelector:()=>null,contains:()=>false,addEventListener:noop,removeEventListener:noop};
 const mounted=mountResearch(root);
 try{
  assert.equal(select.value,'0.2');assert.equal(select.options.length,5);
  const record=mounted.controller.experiment.diagnostic();record.spec.receiver.domain.stepM=.5;assert.equal(mounted.controller.importText(JSON.stringify(record)).status,'imported');mounted.syncControls();
  assert.equal(select.value,'0.5');const option=select.options.find(item=>item.value==='0.5');assert(option);assert.equal(option.dataset.nfrImported,'true');assert.match(option.textContent,/导入值/);assert.equal(select.options.length,6);
  mounted.syncControls();assert.equal(select.options.length,6);assert.equal(select.value,'0.5');
  mounted.controller.reset();mounted.syncControls();assert.equal(select.value,'0.2');assert.equal(select.options.filter(item=>item.value==='0.5').length,1);
 }finally{await mounted.dispose();assert.equal(mounted.controller.disposed,true);}
});
