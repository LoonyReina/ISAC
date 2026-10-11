'use strict';
// Content, generator and simulated DOM regression. No browser or source refetch claim.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const registry=JSON.parse(read('site/registry.json')),data=JSON.parse(read(registry.researchGuidesFile));
const M=require('../scripts/research-guides.cjs'),build=(d=data,r=registry)=>M.buildResearchGuides(d,r),render=(d=data,r=registry)=>M.renderResearchGuides(build(d,r));
const source=read('research-guides.js');
test('four guide-only resources extend two existing directions without inflating lessons or snapshots',()=>{
 a.deepEqual([registry.cases.length,registry.units.length,registry.directions.length,registry.knowledgeMap.nodes.length],[15,27,8,32]);
 a.equal(data.cards.length,4);a.deepEqual(data.cards.map(c=>c.directionId),['waveforms','waveforms','spatial','spatial']);
 const directory=JSON.parse(read(registry.researchDirectoryFile));a.equal(directory.cards.length,9);a.equal(directory.cards.filter(c=>c.caseId).length,8);
 for(const c of data.cards){a.ok(!registry.cases.some(x=>x.id===c.id));a.ok(!registry.units.some(x=>x.id===c.id));a.equal(c.caseId,undefined);}
 const html=read('reading.html');a.match(html,/4 篇问题式导读/);a.match(html,/15 个已有主题/);a.match(html,/深度交互已接入：8 \/ 9 篇/);
 a.ok(html.indexOf('id="directions"')<html.indexOf('id="research-guides"'));a.ok(html.indexOf('id="research-guides"')<html.indexOf('id="paper-comparisons"'));
 a.equal((html.match(/class="research-guide-card"/g)||[]).length,4);
});
test('beginner question, mechanism, innovation, evidence, limits and next question all survive without JS',()=>{
 const html=render();
 for(const c of data.cards){for(const value of [c.question,c.mechanism,c.innovation,c.evidence.summary,c.nextQuestion,...c.limits,c.source.edition,c.source.locator])a.ok(html.includes(M.escapeHtml(value)),c.id+': '+value);}
 for(const label of ['先问：','直觉机制：','作者推进了哪一步？','证据支持到哪里？','哪些条件不能略去？','带着什么问题继续？'])a.ok(html.includes(label));
 for(const tag of html.matchAll(/<(?:article|section|details)[^>]*>/g))a.doesNotMatch(tag[0],/\bhidden\b/);
 a.match(html,/data-guide-controls role="search" hidden/);a.match(html,/role="status" aria-live="polite"/);a.doesNotMatch(html,/<canvas|<svg|<iframe|<script|data-comparison-group/);
});
test('fixed editions travel with the inspected source and scientific limits remain explicit',()=>{
 const html=render();
 for(const pin of ['1910.01896v1','2105.03125v2','2311.07722v1','2506.07052v1'])a.ok(html.includes(pin));
 const gaudio=data.cards[0],yuan=data.cards[1];a.match(gaudio.source.url,/\/pdf\//);a.match(yuan.source.url,/\/pdf\//);
 a.match(yuan.source.edition,/2021-05-11/);a.match(yuan.source.edition,/PDF 编号/);a.match(yuan.source.locator,/式\(39\)–\(42\)/);
 for(const phrase of ['保护格','20 dB','不是统一的空间标签','完全自干扰消除','已知用户和目标位置','降低用户最低速率','归一化 Capon 空间谱','规定虚警率','本站没有实现'])a.ok(html.includes(phrase),phrase);
 a.doesNotMatch(html,/先看门限区/);a.match(html,/先分清误差与下界/);
});
test('reading navigation and direction links resolve to the same generated guide data',()=>{
 const html=read('reading.html');a.match(html,/href="#research-guides">4 篇问题式导读/);
 for(const id of ['waveforms','spatial']){
  const card=html.match(new RegExp('<article class="direction-card" id="direction-'+id+'"[\\s\\S]*?</article>'))[0];
  a.ok(card.includes(`href="#research-guides-${id}"`));a.match(card,/2 篇问题式原文导读/);a.match(card,/不增加实验覆盖/);
 }
 a.equal(M.renderGuideDirectionLink(build(),'networks'),'');
 a.match(registry.directions.find(d=>d.id==='waveforms').scope,/完整 OTFS 收发机实验仍待实现/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 for(const [,href]of render().matchAll(/href="([^"]+)"/g)){
  if(href.startsWith('#')){a.ok(ids.includes(href.slice(1)),href);continue;}
  if(href.startsWith('https:'))continue;
  const url=new URL(href,'https://example.test/ISAC/');a.equal(url.origin,'https://example.test');
  a.ok(read(path.basename(url.pathname)).includes(`id="${url.hash.slice(1)}"`),href);
  if(url.search)a.equal(href,'practice.html?topic=near-field#notebook');
 }
 a.match(render(),/已有机制的空白实验本/);a.doesNotMatch(render(),/topic=otfs|topic=nearfield-double/);
 for(const c of build())if(c.notebook)a.equal(c.notebook.id,'near-field');
});
test('invalid identities, missing evidence and nonexistent routes fail at build time',()=>{
 const mutations=[d=>d.cards.push(structuredClone(d.cards[0])),d=>{d.cards[0].id='../escape';},d=>{d.cards[0].directionId='absent';},d=>{delete d.cards[0].question;},d=>{d.cards[0].limits=[];},d=>{d.cards[0].evidence.summary='';},d=>{d.cards[0].source.locator='';},d=>{d.cards[0].source.edition='';},d=>{d.cards[0].source.url='javascript:alert(1)';},d=>{d.cards[0].source.url='https://user:secret@example.test/paper';},d=>{d.cards[0].source.url='https://example.test/paper#fake';},d=>{d.cards[0].prerequisites[0].href='foundations.html#absent';},d=>{d.cards[0].prerequisites[0].href='https://evil.test/';},d=>{d.cards[0].notebookTopicId='unimplemented';},d=>{d.cards[0].readingSteps=[{label:'empty'}];}];
 for(const mutate of mutations){const d=structuredClone(data);mutate(d);a.throws(()=>build(d),/Invalid|Missing/);}
});
test('plain-text serialization and data-only additions do not add HTML, cases or button stubs',()=>{
 const d=structuredClone(data),attack='<img src=x onerror=bad()> & "text" </script>';
 const card=structuredClone(d.cards[0]);card.id='new-reading';card.directionId='networks';card.title=attack;card.question=attack;card.source.edition=attack;d.cards.push(card);
 const html=render(d);a.match(html,/5 篇问题式导读/);a.match(html,/id="research-guides-networks"/);a.match(html,/id="guide-new-reading"/);a.ok(html.includes(M.escapeHtml(attack)));a.doesNotMatch(html,/<img|<script|case-new-reading|unit-new-reading/);
 a.match(M.renderGuideDirectionLink(build(d),'networks'),/1 篇问题式原文导读/);a.equal(M.renderResearchGuides([]),'');a.equal(build({...data,cards:[]}).length,0);
});
test('local assets are versioned and loaded only on the reading page; styles support narrow screens and print',()=>{
 for(const name of ['research-guides.css?v=research-guides-v1','research-guides.js?v=research-guides-v1'])a.ok(read('reading.html').includes(name));
 for(const page of registry.pages.filter(p=>p.path!=='reading.html'))a.doesNotMatch(read(page.path),/src="research-guides\.js|href="research-guides\.css/);
 for(const token of ['minmax(0,1fr)','min-width:0','overflow-wrap:anywhere','flex-wrap:wrap','min-height:44px',':focus-visible','@media(max-width:480px)','@media print','[hidden]','details::details-content'])a.ok(read('research-guides.css').includes(token),token);
 a.doesNotMatch(source,/innerHTML|outerHTML|insertAdjacentHTML|fetch\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie|history\.|scrollIntoView|\.focus\(|setInterval|requestAnimationFrame/);
});

const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
class Element{
 constructor(tag='div',attrs={}){this.tag=tag;this.attrs={...attrs};this.children=[];this.events={};this._text='';this.dataset={};for(const [k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;this.id=attrs.id;this.value=attrs.value||'';this.hidden=Object.hasOwn(attrs,'hidden');this.open=Object.hasOwn(attrs,'open');}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
 set textContent(v){this._text=String(v);this.children=[];}
 set innerHTML(_){throw new Error('Unsafe HTML sink');}
 getAttribute(k){return this.attrs[k]??null;}
 matches(s){const m=s.match(/^(\w+)?\[([^=\]]+)(?:="([^"]*)")?\]$/);return m?(!m[1]||this.tag===m[1])&&Object.hasOwn(this.attrs,m[2])&&(m[3]===undefined||this.attrs[m[2]]===m[3]):this.tag===s;}
 querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
 fire(type,event={}){const e={target:this,button:0,...event};for(const fn of this.events[type]||[])fn(e);}
}
function parse(html){
 const doc=new Element('document'),stack=[doc],voids=new Set(['input','br','meta','link','hr','img']);
 for(const token of html.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g)||[]){
  if(token.startsWith('<!--'))continue;if(token.startsWith('</')){stack.pop();continue;}
  if(token.startsWith('<')){const m=token.match(/^<([\w-]+)([\s\S]*?)>$/);if(!m)continue;const attrs={};for(const x of m[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[x[1]]=decode(x[2]||'');const e=new Element(m[1],attrs);stack.at(-1).children.push(e);if(!voids.has(e.tag))stack.push(e);}
  else{const e=new Element('#text');e._text=decode(token);stack.at(-1).children.push(e);}
 }
 return doc;
}
function setup({html,hash='',mutate}={}){
 const document=parse(html??M.renderGuideDirectionLink(build(),'waveforms')+M.renderGuideDirectionLink(build(),'spatial')+render());
 const root=document.querySelector('[data-research-guides]'),window={location:{hash},events:{},addEventListener(t,fn){(this.events[t]??=[]).push(fn);}};
 const trap=()=>{throw new Error('Forbidden side effect');};const env={document,window,fetch:trap,XMLHttpRequest:trap,localStorage:new Proxy({}, {get:trap}),history:new Proxy({}, {get:trap})};
 if(mutate)mutate(root,document);
 const execute=()=>vm.runInNewContext(source,env);execute();
 const select=root?.querySelector('[data-guide-direction-select]'),query=root?.querySelector('[data-guide-query]'),form=root?.querySelector('[data-guide-controls]'),cards=root?.querySelectorAll('[data-research-guide]')||[],groups=root?.querySelectorAll('[data-guide-group]')||[];
 return {document,root,window,select,query,form,cards,groups,execute,count:root?.querySelector('[data-guide-count]'),empty:root?.querySelector('[data-guide-empty]'),search(value){query.value=value;query.fire('input');},choose(value){select.value=value;select.fire('change');},navigate(value){window.location.hash=value;for(const fn of window.events.hashchange||[])fn();},pageshow(){for(const fn of window.events.pageshow||[])fn();}};
}
test('filter starts with all cards and exposes native labelled controls only after validation',()=>{
 const h=setup();a.equal(h.root.dataset.guidesReady,'true');a.equal(h.form.hidden,false);a.ok(h.cards.every(c=>!c.hidden));a.ok(h.groups.every(g=>!g.hidden));a.match(h.count.textContent,/4 \/ 4 篇原文导读/);a.ok(h.empty.hidden);
 for(const node of [h.select,h.query])a.ok(h.form.querySelector('[for="'+node.id+'"]'));
 a.equal(h.form.querySelector('button').attrs.type,'reset');a.equal(h.query.events.keydown,undefined);
});
test('direction and multiword question filters intersect, ignore case and show bounded empty results',()=>{
 const h=setup();h.choose('waveforms');a.equal(h.cards.filter(c=>!c.hidden).length,2);a.equal(h.groups[1].hidden,true);
 h.search('  oTfS   下一帧  ');a.deepEqual(h.cards.filter(c=>!c.hidden).map(c=>c.id),['guide-otfs-sensing-assisted-2021']);
 h.choose('spatial');a.ok(h.cards.every(c=>c.hidden));a.ok(h.groups.every(g=>g.hidden));a.equal(h.empty.hidden,false);a.match(h.count.textContent,/0 \/ 4/);
 h.search('两');a.ok(h.cards.some(c=>!c.hidden));h.search('<script>');a.equal(h.empty.hidden,false);
});
test('repeated filtering and reset preserve disclosure state and unrelated content',()=>{
 const h=setup(),details=h.cards[0].querySelector('details');details.open=true;const untouched=new Element();untouched.textContent='retained';h.document.children.push(untouched);
 for(let i=0;i<4;i++){h.choose('spatial');h.search('does-not-exist');h.form.fire('reset');a.equal(h.query.value,'');a.equal(h.select.value,'');a.ok(h.cards.every(c=>!c.hidden));a.ok(h.empty.hidden);a.ok(details.open);a.equal(untouched.textContent,'retained');}
 let prevented=false;h.form.fire('submit',{preventDefault(){prevented=true;}});a.ok(prevented);
});
test('initial deep links and back/forward hash changes reveal filtered targets without writing history',()=>{
 const h=setup({hash:'#guide-nearfield-double-array-ispac'});a.equal(h.select.value,'spatial');a.equal(h.cards[2].hidden,false);a.equal(h.cards[0].hidden,true);
 h.search('no match');h.navigate('#guide-otfs-joint-estimation-2020');a.equal(h.select.value,'waveforms');a.equal(h.query.value,'');a.equal(h.cards[0].hidden,false);
 h.search('no match');h.navigate('#research-guides-spatial');a.equal(h.select.value,'spatial');a.ok(h.cards.slice(2).every(c=>!c.hidden));
 h.search('kept');for(const hash of ['#%ZZ','#other','#https://evil.test'])h.navigate(hash);a.equal(h.query.value,'kept');
});
test('same-hash direction clicks also reveal cards before native anchor navigation',()=>{
 const h=setup({hash:'#research-guides-waveforms'});h.choose('spatial');h.search('no match');
 h.document.querySelector('[href="#research-guides-waveforms"]').fire('click');a.equal(h.select.value,'waveforms');a.equal(h.query.value,'');a.ok(h.cards.slice(0,2).every(c=>!c.hidden));a.equal(h.window.location.hash,'#research-guides-waveforms');
});
test('pageshow reconciles browser-restored values; script reexecution attaches no duplicate listeners',()=>{
 const h=setup();h.select.value='spatial';h.query.value='Capon';h.pageshow();a.equal(h.cards.filter(c=>!c.hidden).length,1);a.equal(h.cards[3].hidden,false);
 h.execute();a.equal(h.query.events.input.length,1);a.equal(h.form.events.reset.length,1);a.equal(h.window.events.hashchange.length,1);a.equal(h.cards.filter(c=>!c.hidden).length,1);
});
test('malformed enhancement and missing roots preserve static reading instead of hiding content',()=>{
 for(const mutate of [r=>{r.querySelector('[data-guide-count]').attrs={};},r=>{r.querySelector('[data-research-guide]').dataset.guideDirection='missing';},r=>{r.querySelector('[data-research-guide]').dataset.guideSearch='';}]){
  const h=setup({mutate});a.equal(h.root.dataset.guidesReady,undefined);a.ok(h.form.hidden);a.ok(h.cards.every(c=>!c.hidden));a.ok(h.cards.every(c=>c.querySelector('details')));
 }
 setup({html:'<main><p>Other page</p></main>'});
});
