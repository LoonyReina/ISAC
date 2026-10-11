'use strict';
// Actual client script exercised in a small parsed-HTML DOM. This is not a browser.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {renderComparisonGroups}=require('../scripts/paper-comparison-groups.cjs');
const registry=JSON.parse(read('site/registry.json')),source=read('paper-comparison.js');
const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
class Element{
 constructor(tag='div',attrs={}){this.tag=tag;this.attrs={...attrs};this.children=[];this.events={};this._text='';this.dataset={};for(const [k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;this.id=attrs.id;this.value=attrs.value||'';this.hidden=Object.hasOwn(attrs,'hidden');this.open=Object.hasOwn(attrs,'open');this.checked=Object.hasOwn(attrs,'checked');}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
 set textContent(value){this._text=String(value);this.children=[];}
 set innerHTML(_){throw new Error('Unsafe HTML sink');}
 set outerHTML(_){throw new Error('Unsafe HTML sink');}
 matches(selector){const m=selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);return m?Object.hasOwn(this.attrs,m[1])&&(m[2]===undefined||this.attrs[m[1]]===m[2]):this.tag===selector;}
 querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
 fire(type){for(const fn of this.events[type]||[])fn({target:this});}
 replaceChildren(...children){this._text='';this.children=children;}
 cloneNode(deep){const e=new Element(this.tag,this.attrs);e._text=this._text;if(deep)e.children=this.children.map(c=>c.cloneNode(true));return e;}
 focus(){throw new Error('Unexpected focus move');}
 scrollIntoView(){throw new Error('Unexpected scroll');}
}
function parse(html){
 const doc=new Element('document'),stack=[doc],voids=new Set(['input','br','meta','link','hr','img']);
 for(const token of html.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g)||[]){
  if(token.startsWith('<!--'))continue;
  if(token.startsWith('</')){stack.pop();continue;}
  if(token.startsWith('<')){const match=token.match(/^<([\w-]+)([\s\S]*?)>$/);if(!match)continue;const attrs={};for(const m of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[m[1]]=decode(m[2]||'');const e=new Element(match[1],attrs);stack.at(-1).children.push(e);if(!voids.has(e.tag))stack.push(e);}
  else{const e=new Element('#text');e._text=decode(token);stack.at(-1).children.push(e);}
 }
 return doc;
}
function setup({two=false,mutate,html}={}){
 const r=structuredClone(registry);if(two){const g=structuredClone(r.paperComparisonGroups[0]);g.id='synthetic';r.paperComparisonGroups.push(g);}
 const document=parse(html??renderComparisonGroups(r));
 const trap=name=>()=>{throw new Error('Forbidden side effect: '+name);};
 const environment={document,fetch:trap('fetch'),XMLHttpRequest:trap('xhr'),localStorage:new Proxy({}, {get:trap('storage')}),sessionStorage:new Proxy({}, {get:trap('storage')}),location:new Proxy({}, {get:trap('location')}),history:new Proxy({}, {get:trap('history')}),navigator:new Proxy({}, {get:trap('navigator')})};
 Object.defineProperty(document,'cookie',{get:trap('cookie'),set:trap('cookie')});Object.defineProperty(document,'referrer',{get:trap('referrer')});
 document.activeElement={id:'retained-focus'};
 const groups=document.querySelectorAll('[data-comparison-group]');if(mutate)mutate(groups,document);
 const execute=()=>vm.runInNewContext(source,environment);execute();
 const select=input=>{for(const other of document.querySelectorAll('[name="'+input.attrs.name+'"]'))other.checked=false;input.checked=true;input.fire('change');};
 return {document,groups,select,execute,r};
}
function lens(g,kind){return {choices:g.querySelectorAll('[data-comparison-choice]').filter(n=>n.dataset.comparisonChoice===kind),panels:g.querySelectorAll('[data-comparison-panel]').filter(n=>n.dataset.comparisonPanel===kind),status:g.querySelector('[data-comparison-status="'+kind+'"]')};}
function check(g){const node=g.querySelector('[data-comparison-check]');return {node,answers:node.querySelectorAll('[data-comparison-answer]'),button:node.querySelector('[data-comparison-explain]'),status:node.querySelector('[data-comparison-check-status]'),feedback:node.querySelector('[data-comparison-feedback]'),references:node.querySelectorAll('[data-comparison-explanation]')};}
test('initialization validates then reveals controls, opens first lenses and preserves all three cards',()=>{
 const h=setup(),g=h.groups[0];a.equal(g.dataset.comparisonReady,'true');a.ok(g.querySelectorAll('[data-comparison-controls]').every(n=>!n.hidden));
 for(const kind of ['question','premise']){const l=lens(g,kind);a.equal(l.choices.length,3);a.deepEqual(l.choices.map(n=>n.checked),[true,false,false]);a.deepEqual(l.panels.map(n=>n.hidden),[false,true,true]);a.ok(l.panels[0].open);a.equal(l.status.textContent,'');}
 a.equal(g.querySelectorAll('[aria-labelledby]').filter(n=>n.attrs['aria-labelledby'].includes('-case-')).length,3);a.equal(check(g).feedback.hidden,true);
});
test('all questions and premises select their own substantial source-grounded panels without focus changes',()=>{
 const h=setup(),g=h.groups[0],focus=h.document.activeElement;
 for(const kind of ['question','premise']){const l=lens(g,kind);for(let round=0;round<3;round++)for(const choice of l.choices){h.select(choice);for(const panel of l.panels){a.equal(panel.hidden,panel.dataset.comparisonValue!==choice.value);if(!panel.hidden){a.ok(panel.open);a.ok(panel.querySelector('a'));a.ok(panel.textContent.length>100);}}a.match(l.status.textContent,/这只是阅读提示/);a.equal(h.document.activeElement,focus);}}
 a.ok(g.querySelectorAll('[aria-labelledby]').filter(n=>n.attrs['aria-labelledby'].includes('-case-')).every(n=>!n.hidden));
});
test('no selection gives a bounded prompt; each answer gives its own complete explanation and links',()=>{
 const h=setup(),c=check(h.groups[0]);c.button.fire('click');a.match(c.status.textContent,/先选一个判断/);a.ok(c.feedback.hidden);a.equal(c.feedback.children.length,0);
 for(const [i,answer]of c.answers.entries()){h.select(answer);c.button.fire('click');a.equal(c.feedback.hidden,false);a.equal(c.feedback.children.length,1);a.equal(c.feedback.textContent,c.references[i].textContent);a.ok(c.feedback.querySelectorAll('a').length>=4);a.notEqual(c.feedback.children[0],c.references[i]);a.match(c.status.textContent,/不是比较完成的认证/);}
});
test('changed answers clear stale feedback before explaining; repeated explains never accumulate clones',()=>{
 const h=setup(),c=check(h.groups[0]);h.select(c.answers[0]);for(let i=0;i<4;i++){c.button.fire('click');a.equal(c.feedback.children.length,1);}h.select(c.answers[1]);a.ok(c.feedback.hidden);a.equal(c.feedback.children.length,0);a.equal(c.status.textContent,'');c.button.fire('click');a.equal(c.feedback.textContent,c.references[1].textContent);
 h.select(c.answers[2]);a.equal(c.feedback.textContent,'');c.button.fire('click');a.match(c.feedback.textContent,/未充分说明/);a.match(c.feedback.textContent,/SSP/);
});
test('reset isolates each group, retains native details state and preserves unrelated page state',()=>{
 const h=setup({two:true}),[one,two]=h.groups,c1=check(one),c2=check(two);const outside=new Element();outside.textContent='untouched';h.document.children.push(outside);
 for(const g of h.groups){h.select(lens(g,'question').choices[2]);h.select(lens(g,'premise').choices[2]);const c=check(g);h.select(c.answers[2]);c.button.fire('click');g.querySelector('[id="comparison-'+(g===one?'beamforming':'synthetic')+'-next"]').open=true;}
 const twoText=c2.feedback.textContent;one.querySelector('[data-comparison-reset]').fire('click');
 for(const kind of ['question','premise']){a.deepEqual(lens(one,kind).choices.map(n=>n.checked),[true,false,false]);a.deepEqual(lens(one,kind).panels.map(n=>n.hidden),[false,true,true]);a.ok(lens(two,kind).choices[2].checked);}
 a.ok(c1.answers.every(n=>!n.checked));a.ok(c1.feedback.hidden);a.equal(c1.status.textContent,'');a.equal(c2.feedback.textContent,twoText);a.ok(!c2.feedback.hidden);a.ok(one.querySelector('[id="comparison-beamforming-next"]').open);a.equal(outside.textContent,'untouched');a.match(one.querySelector('[data-comparison-reset-status]').textContent,/已恢复默认/);h.select(lens(one,'question').choices[1]);a.equal(one.querySelector('[data-comparison-reset-status]').textContent,'');
});
test('native controls have unique names, explicit labels, fieldsets, non-submit buttons and no custom keyboard handlers',()=>{
 const h=setup({two:true});
 for(const g of h.groups){for(const input of g.querySelectorAll('input')){a.equal(input.attrs.type,'radio');a.ok(g.querySelector('[for="'+input.id+'"]'));a.ok(input.attrs.name.startsWith(g.id+'-'));a.equal(input.events.keydown,undefined);}for(const button of g.querySelectorAll('button'))a.equal(button.attrs.type,'button');for(const fieldset of g.querySelectorAll('fieldset'))a.ok(fieldset.querySelector('legend'));}
});
test('missing or malformed enhancement data leaves all static panels, sources and reference feedback readable',()=>{
 const mutations=[g=>{g.querySelector('[data-comparison-config]').textContent='{bad';},g=>{const n=g.querySelector('[data-comparison-config]'),c=JSON.parse(n.textContent);c.questions=['injected"selector'];n.textContent=JSON.stringify(c);},g=>{g.querySelector('[data-comparison-status="premise"]').attrs={};},g=>{g.querySelector('[data-comparison-explain]').attrs={};},g=>{g.querySelector('[data-comparison-answer]').value='unknown';},g=>{g.querySelector('[data-comparison-panel]').dataset.comparisonValue='missing';}];
 for(const mutate of mutations){const h=setup({mutate:groups=>mutate(groups[0])}),g=h.groups[0];a.equal(g.dataset.comparisonReady,undefined);a.ok(g.querySelectorAll('[data-comparison-controls]').every(n=>n.hidden));a.ok(g.querySelectorAll('[data-comparison-panel]').every(n=>!n.hidden));a.ok(g.querySelector('[data-comparison-reference]').textContent.includes('查看全部参考解释'));a.ok(g.querySelectorAll('a').length>20);}
});
test('malformed first group does not block a separate valid group and absent groups are a no-op',()=>{
 const h=setup({two:true,mutate:groups=>{groups[0].querySelector('[data-comparison-config]').textContent='null';}});a.equal(h.groups[0].dataset.comparisonReady,undefined);a.equal(h.groups[1].dataset.comparisonReady,'true');setup({html:'<main><p>Other page</p></main>'});
});
test('script reexecution is idempotent and invalid multiple answer state never yields false feedback',()=>{
 const h=setup(),g=h.groups[0],c=check(g);h.select(c.answers[0]);c.button.fire('click');const text=c.feedback.textContent;h.execute();a.equal(c.button.events.click.length,1);a.equal(c.feedback.textContent,text);c.answers[1].checked=true;c.button.fire('click');a.ok(c.feedback.hidden);a.equal(c.feedback.children.length,0);a.match(c.status.textContent,/先选一个判断/);
});
test('literal hostile prose never becomes DOM nodes and the client never touches forbidden browser APIs',()=>{
 const r=structuredClone(registry),attack='<img src=x onerror=bad()> & "text" </script>';
 r.paperComparisonGroups[0].checks[0].options[0].feedback=attack;
 const h=setup({html:renderComparisonGroups(r)}),c=check(h.groups[0]);h.select(c.answers[0]);c.button.fire('click');a.ok(c.feedback.textContent.includes(attack));a.equal(c.feedback.querySelectorAll('img').length,0);a.equal(c.feedback.querySelectorAll('script').length,0);
 h.groups[0].querySelector('[data-comparison-reset]').fire('click');a.equal(c.feedback.textContent,'');
});
