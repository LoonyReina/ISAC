'use strict';
// DOM behavior and static CSS contracts, not a browser/layout certification.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../course-core.js');
const read=name=>fs.readFileSync(require.resolve('../'+name),'utf8');
const html=read('foundations.html'),css=read('course.css'),source=read('course-ui.js');
function setup({hash='',core=C,run=true,reduced=false,deferFrames=false}={}){
 const events={},scrolls=[],focuses=[],frames=[];let document;
 class E{
  constructor(tag,attrs={}){this.tagName=tag;this.attrs=attrs;this.children=[];this.parent=null;this.dataset={};this.style={};this.listeners={};this.hidden='hidden'in attrs;this.open='open'in attrs;this.disabled='disabled'in attrs;this.checked='checked'in attrs;this.value=attrs.value||'';this.id=attrs.id||'';this.hash=(attrs.href||'').startsWith('#')?attrs.href:'';this.top=1000;for(const [k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;this.classList={add:n=>this.attrs.class=[this.attrs.class||'',n].join(' '),remove:n=>this.attrs.class=(this.attrs.class||'').split(/\s+/).filter(x=>x!==n).join(' '),contains:n=>(this.attrs.class||'').split(/\s+/).includes(n)};}
  append(e){this.children.push(e);if(typeof e!=='string')e.parent=this;}
  get textContent(){return this.children.map(e=>typeof e==='string'?e:e.textContent).join('');}
  set textContent(t){this.children=[String(t)];}
  set innerHTML(t){this.children=[String(t)];}
  get innerHTML(){return this.textContent;}
  setAttribute(k,v){this.attrs[k]=String(v);}
  removeAttribute(k){delete this.attrs[k];}
  getAttribute(k){return this.attrs[k]??null;}
  matches(s){
   const attr=[...s.matchAll(/\[([^=\]]+)(?:=["']?([^\]"']+)["']?)?\]/g)];s=s.replace(/\[[^\]]+\]/g,'');
   for(const [,key,val]of attr){if(key==='hidden'){if(!this.hidden)return false;}else if(!(key in this.attrs)||val!==undefined&&this.attrs[key]!==val)return false;}
   const id=s.match(/#([\w-]+)/);if(id&&this.id!==id[1])return false;
   for(const [,name]of s.matchAll(/\.([\w-]+)/g))if(!this.classList.contains(name))return false;
   const tag=s.match(/^[\w-]+/);return !tag||this.tagName===tag[0];
  }
  closest(selector){for(let e=this;e;e=e.parent)if(e.matches(selector))return e;return null;}
  querySelectorAll(selector){const all=[];const visit=e=>{for(const c of e.children)if(typeof c!=='string'){all.push(c);visit(c);}};visit(this);return all.filter(e=>selector.split(',').some(s=>{const parts=s.trim().split(/\s+/);if(!e.matches(parts.pop()))return false;let p=e.parent;while(parts.length){const sel=parts.pop();while(p&&!p.matches(sel))p=p.parent;if(!p)return false;p=p.parent;}return true;}));}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  addEventListener(t,fn){(this.listeners[t]??=[]).push(fn);}
  fire(t,extras={}){const event={target:this,currentTarget:this,detail:0,button:0,...extras};for(const fn of this.listeners[t]||[])fn(event);this['on'+t]?.(event);return event;}
  getClientRects(){return [];}
  getBoundingClientRect(){return {top:this.top,bottom:this.top+400,width:600};}
  scrollIntoView(options){scrolls.push({node:this,options});}
  focus(options){document.activeElement=this;focuses.push({node:this,options});}
 }
 const root=new E('document'),stack=[root],voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
 for(const token of html.match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/g)){
  if(token.startsWith('<!'))continue;
  if(token.startsWith('</')){const name=token.match(/^<\/([^\s>]+)/)[1];while(stack.length>1){if(stack.pop().tagName===name)break;}continue;}
  if(token.startsWith('<')){const name=token.match(/^<([^\s/>]+)/)[1],attrs={};for(const m of token.slice(name.length+1,-1).matchAll(/([^\s=/>]+)(?:="([^"]*)"|='([^']*)'|=([^\s>]+))?/g))attrs[m[1]]=m[2]??m[3]??m[4]??'';const e=new E(name,attrs);stack.at(-1).append(e);if(!voids.has(name))stack.push(e);}else stack.at(-1).append(token);
 }
 document=root;document.getElementById=id=>root.querySelectorAll('[id]').find(e=>e.id===id)||null;document.documentElement=root.querySelector('html');document.documentElement.scrollHeight=20000;document.hidden=false;document.activeElement=null;
 for(const el of root.querySelectorAll('select'))el.value=(el.querySelector('[selected]')||el.querySelector('option'))?.attrs.value||'';
 const window={Course:core,location:{hash},scrollY:0,innerHeight:800,matchMedia:()=>({matches:reduced}),addEventListener:(t,fn)=>(events[t]??=[]).push(fn),print(){}};
 const context={window,document,requestAnimationFrame:fn=>deferFrames?frames.push(fn):fn(0),cancelAnimationFrame(){},setTimeout:fn=>fn(),clearTimeout(){},performance:{now:()=>0},console};
 const s={document,window,events,scrolls,focuses,flushFrames:()=>frames.splice(0).forEach(fn=>fn(0)),els:Object.fromEntries(root.querySelectorAll('[id]').map(e=>[e.id,e])),fire:t=>(events[t]||[]).forEach(fn=>fn()),run:()=>vm.runInNewContext(source,context)};
 if(run)s.run();return s;
}
const panels=s=>s.document.querySelectorAll('[data-panel]');
const visible=s=>panels(s).filter(e=>!e.hidden).map(e=>Number(e.dataset.panel));
const currentLinks=s=>s.document.querySelectorAll('.toc nav a,.mobile-toc nav a').filter(e=>e.attrs['aria-current']);
test('all seven derivations are visible in static HTML; OFDM controls and blank canvases wait for enhancement',()=>{
 const s=setup({run:false});assert.deepEqual(visible(s),[0,1,2,3,4,5,6]);assert.equal(s.els['ofdm-guide'].classList.contains('is-enhanced'),false);
 assert.match(css,/#ofdm-guide:not\(\.is-enhanced\) :is\([^}]*\.step-nav[^}]*\.step-footer[^}]*label,button,input,select,canvas[^}]*display:none!important/);
 for(let i=1;i<=7;i++){assert.equal(s.els['o-step-'+i].attrs.tabindex,'-1');assert.equal(panels(s)[i-1].attrs['aria-labelledby'],'o-step-'+i);}
});
test('missing core or failed initial drawing never strands static derivations behind hidden panels',()=>{
 const missing=setup({core:null,run:false});assert.throws(missing.run);assert.deepEqual(visible(missing),[0,1,2,3,4,5,6]);
 let calls=0;const partial=setup({core:{...C,ofdm(...args){if(++calls===3)throw new Error('draw unavailable');return C.ofdm(...args);}},run:false});assert.throws(partial.run,/draw unavailable/);assert.deepEqual(visible(partial),[0,1,2,3,4,5,6]);assert.equal(partial.els['ofdm-guide'].classList.contains('is-enhanced'),false);
});
test('successful fresh visit starts at step one with correct controls and no focus theft',()=>{
 const s=setup();assert.deepEqual(visible(s),[0]);assert.equal(s.window.ISACCourseUI.getStage(),0);assert.equal(s.els['ofdm-guide'].classList.contains('is-enhanced'),true);assert.equal(s.els['o-prev'].disabled,true);assert.equal(s.els['o-next'].disabled,false);assert.equal(s.focuses.length,0);assert.equal(s.els['o-v-wrap'].hidden,true);
});
test('keyboard next, previous and direct step selection focus the new heading, including the last step',()=>{
 const s=setup();s.els['o-next'].fire('click');assert.deepEqual(visible(s),[1]);assert.equal(s.document.activeElement,s.els['o-step-2']);assert.equal(s.scrolls.at(-1).options.behavior,'instant');
 s.document.querySelector('[data-step="6"]').fire('click');assert.deepEqual(visible(s),[6]);assert.equal(s.document.activeElement,s.els['o-step-7']);assert.equal(s.els['o-next'].disabled,true);assert.equal(s.els['o-v-wrap'].hidden,false);
 s.els['o-prev'].fire('click');assert.deepEqual(visible(s),[5]);assert.equal(s.document.activeElement,s.els['o-step-6']);assert.equal(s.document.querySelector('[data-step="5"]').attrs['aria-pressed'],'true');
});
test('pointer and programmatic step changes do not move focus; reduced motion prevents smooth scrolling',()=>{
 const s=setup({reduced:true});s.els['o-next'].fire('click',{detail:1});assert.deepEqual(visible(s),[1]);assert.equal(s.focuses.length,0);assert.equal(s.scrolls.at(-1).options.behavior,'instant');s.window.ISACCourseUI.setStep(6);assert.deepEqual(visible(s),[6]);assert.equal(s.focuses.length,0);
});
test('printing exposes seven panels and restores selected step and detail state even with repeated print events',()=>{
 const s=setup();s.window.ISACCourseUI.setStep(4);const ds=s.document.querySelectorAll('main details');ds[0].open=true;s.els['o-step-5'].focus({preventScroll:true});const focusCount=s.focuses.length;s.fire('beforeprint');s.fire('beforeprint');assert.deepEqual(visible(s),[0,1,2,3,4,5,6]);assert.ok(ds.every(d=>d.open));s.fire('afterprint');s.fire('afterprint');assert.deepEqual(visible(s),[4]);assert.equal(ds[0].open,true);assert.ok(ds.slice(1).every(d=>!d.open));assert.equal(s.focuses.length,focusCount);
});
test('mobile chapter disclosure is outside the cover and repeats exactly the desktop native chapter links',()=>{
 const s=setup({run:false}),mobile=s.document.querySelector('.mobile-toc'),desktop=s.document.querySelector('.toc');assert.equal(mobile.parent.tagName,'body');assert.deepEqual(mobile.querySelectorAll('a').map(a=>[a.hash,a.textContent]),desktop.querySelectorAll('a').map(a=>[a.hash,a.textContent]));assert.equal(mobile.open,false);assert.equal(mobile.querySelector('summary').tagName,'summary');
 assert.match(css,/\.foundation-book>\.mobile-toc\{[^}]*position:sticky;top:0/);assert.match(css,/\.foundation-book \.site-header\{position:relative\}/);assert.match(css,/100dvh - 80px/);assert.match(css,/\.foundation-book \.step-panel,[^{]*\{scroll-margin-top:12px\}/);
});
test('deep links and Back-like hash changes synchronize both directories and the mobile current chapter',()=>{
 for(const hash of ['#iq','#ofdm','#cfar']){const s=setup({hash});assert.deepEqual(currentLinks(s).map(a=>a.hash),[hash,hash]);assert.match(s.els['mobile-chapter-current'].textContent,/^当前：/);assert.equal(s.focuses.length,0);assert.equal(s.scrolls.length,1);assert.equal(s.scrolls[0].node,s.els[hash.slice(1)]);assert.equal(s.scrolls[0].options.behavior,'instant');s.window.location.hash='#matched';s.fire('hashchange');assert.deepEqual(currentLinks(s).map(a=>a.hash),['#matched','#matched']);s.window.location.hash=hash;s.fire('hashchange');assert.deepEqual(currentLinks(s).map(a=>a.hash),[hash,hash]);}
});
test('mobile keyboard anchor closes disclosure and focuses chapter without overriding native navigation',()=>{
 const s=setup(),mobile=s.document.querySelector('.mobile-toc'),link=mobile.querySelectorAll('a').find(a=>a.hash==='#cfar');mobile.open=true;const before=s.window.location.hash;link.fire('click');assert.equal(mobile.open,false);assert.equal(s.document.activeElement,s.els.cfar.querySelector('h2'));assert.equal(s.window.location.hash,before);assert.deepEqual(currentLinks(s).map(a=>a.hash),['#cfar','#cfar']);
 mobile.open=true;const n=s.focuses.length;link.fire('click',{detail:1,ctrlKey:true});assert.equal(mobile.open,true);assert.equal(s.focuses.length,n);
});
test('scroll and history restoration update chapter state without announcing every scroll as a live status',()=>{
 const s=setup();s.els.iq.top=120;s.fire('scroll');assert.deepEqual(currentLinks(s).map(a=>a.hash),['#iq','#iq']);s.els.cfar.top=100;s.fire('pageshow');assert.deepEqual(currentLinks(s).map(a=>a.hash),['#cfar','#cfar']);assert.equal(s.els['mobile-chapter-current'].attrs['aria-live'],undefined);
});
test('legacy velocity hash still opens step seven through its existing programmatic bridge without focus theft',()=>{
 const s=setup({hash:'#velocity-matching'}),bridge=read('velocity-bridge.js');const go=bridge.match(/function go\(\)\{[\s\S]*?\n window\.addEventListener/)[0].split('\n window.addEventListener')[0];let renders=0;vm.runInNewContext(go+';go();',{window:s.window,location:s.window.location,requestAnimationFrame:fn=>fn(),render:()=>renders++,box:{scrollIntoView(){}}});assert.deepEqual(visible(s),[6]);assert.equal(renders,1);assert.equal(s.focuses.length,0);
});

test('sticky chapter bar clearance combines shared root scroll padding with the step margin',()=>{
 const shared=read('site.css');assert.match(shared,/html\{scroll-padding-top:110px\}/);assert.match(shared,/@media\(max-width:700px\)\{html\{scroll-padding-top:150px\}/);assert.match(css,/min-height:56px/);assert.ok(110+12>56);assert.ok(150+12>56);
});

test('cold-link realignment runs only once and yields to a newer hash without changing focus or history',()=>{
 const s=setup({hash:'#cfar',deferFrames:true});assert.equal(s.scrolls.length,0);s.window.location.hash='#iq';s.fire('hashchange');s.flushFrames();assert.equal(s.scrolls.length,0);assert.equal(s.window.location.hash,'#iq');assert.equal(s.focuses.length,0);assert.deepEqual(currentLinks(s).map(a=>a.hash),['#iq','#iq']);
 const stable=setup({hash:'#cfar',deferFrames:true});stable.flushFrames();stable.flushFrames();assert.equal(stable.scrolls.length,1);assert.equal(stable.window.location.hash,'#cfar');assert.equal(stable.focuses.length,0);
});
