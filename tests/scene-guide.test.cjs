// Static contracts and simulated DOM only; this is not browser or screen-reader QA.
const {test}=require('node:test'), a=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.resolve(__dirname,'..'), read=f=>fs.readFileSync(path.join(root,f),'utf8');
const registry=JSON.parse(read('site/registry.json'));
class Element {
  constructor(attrs='',text='') {
    this.attrs={}; for(const [,k,v] of attrs.matchAll(/([\w-]+)="([^"]*)"/g))this.attrs[k]=v;
    this.id=this.attrs.id;this.dataset={};for(const [k,v]of Object.entries(this.attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;
    this.hidden=/\bhidden\b/.test(attrs);this.textContent=text.replace(/<[^>]*>/g,'');this.events={};this.open=false;this.classes=new Set();
    this.classList={toggle:(key,value)=>value?this.classes.add(key):this.classes.delete(key)};
  }
  setAttribute(k,v){this.attrs[k]=String(v);}
  removeAttribute(k){delete this.attrs[k];}
  addEventListener(k,f){this.events[k]=f;}
  click(){this.events.click();}
  querySelector(s){return s==='.scene-match'?this.badge:null;}
}
function setup({future=false,unmatched=false,html=read('reading.html')}={}) {
  const buttons=[...html.matchAll(/<button ([^>]*data-scene-(?:role|position)="[^>]+)>([\s\S]*?)<\/button>/g)].map(m=>new Element(m[1],m[2]));
  const roles=buttons.filter(b=>b.dataset.sceneRole),positions=buttons.filter(b=>b.dataset.scenePosition);
  const panels=[...html.matchAll(/<p ([^>]*data-scene-panel="[^>]+)>([\s\S]*?)<\/p>/g)].map(m=>new Element(m[1],m[2]));
  const cards=[...html.matchAll(/<article (class="direction-card"[^>]*)>([\s\S]*?)<\/article>/g)].map(m=>{const card=new Element(m[1],m[2]);card.badge=new Element('hidden');return card;});
  if(future)cards.push(new Element('id="direction-future"'));
  if(unmatched)positions.push(new Element('data-scene-position="future-position"','未来环节'));
  const status=new Element(),jump=new Element('hidden'),reset=new Element('hidden'),prediction=new Element();
  const controls=[new Element('hidden'),new Element('hidden'),reset];
  const guide={querySelectorAll:s=>({'[data-scene-role]':roles,'[data-scene-panel]':panels,'[data-scene-position]':positions,'[data-scene-controls]':controls}[s]),querySelector:()=>prediction};
  const document={getElementById:id=>({'scene-guide':guide,'scene-status':status,'scene-jump':jump,'scene-reset':reset}[id]),querySelectorAll:()=>cards};
  const location=Object.freeze({hash:'#direction-channels',search:'?view=1',href:'https://example.test/ISAC/reading.html?view=1#direction-channels'});
  vm.runInNewContext(read('scene-guide.js'),{document,location});
  return {roles,positions,panels,cards,status,jump,reset,prediction,controls,location};
}
function generateWith(r) {
  const outputs={};
  vm.runInNewContext(read('scripts/generate-site.cjs'),{__dirname:path.join(root,'scripts'),process:{argv:[]},console:{log(){}},require:id=>id==='node:fs'?{...fs,readFileSync:(file,...args)=>String(file)===path.join(root,'site/registry.json')?JSON.stringify(r):fs.readFileSync(file,...args),writeFileSync:(file,text)=>outputs[path.basename(file)]=text}:require(id)});
  return outputs['reading.html'];
}
test('scene guide enhances existing reading cards, with native optional no-JS answers and cache-versioned assets',()=>{
  const html=read('reading.html'),source=read('site/content-scene-guide.html');
  a.equal((html.match(/class="direction-card"/g)||[]).length,registry.directions.length);
  a.ok(html.indexOf('id="directions"')<html.indexOf('id="scene-guide"'));a.ok(html.indexOf('id="scene-guide"')<html.indexOf('class="direction-grid"'));
  a.match(html,/type="module" src="scene-guide.js\?v=scene-guide-v2"/);a.match(html,/href="scene-guide.css\?v=scene-guide-v1"/);
  a.match(source,/data-scene-prediction><summary>/);a.match(source,/共享发射不等于同一个 Y/);a.match(source,/本例本地已知发射信号/);a.match(source,/未知的是待恢复的消息符号/);
  for(const m of source.matchAll(/<p[^>]+data-scene-panel[^>]*>/g))a.ok(!m[0].includes('hidden'));
  a.match(source,/data-scene-controls hidden/);a.match(source,/role="status" aria-live="polite"/);
  for(const m of source.matchAll(/aria-controls="([^"]+)"/g))a.ok(html.includes(`id="${m[1]}"`));
  a.ok(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|setInterval|requestAnimationFrame|location\.|history\.|scrollIntoView/.test(read('scene-guide.js')));
});
test('registry positions drive all existing cards and do not claim unfinished dedicated modules',()=>{
  const html=read('reading.html');
  for(const d of registry.directions){a.ok(d.scenePositions.length);for(const pos of d.scenePositions)a.ok(registry.scenePositions.some(p=>p.id===pos));a.ok(html.includes(`id="direction-${d.id}" data-scene-positions="${d.scenePositions.join(' ')}"`));}
  for(const id of ['channels','learning','prototype']){const card=html.match(new RegExp(`<article[^>]+id="direction-${id}"[^>]*>([\\s\\S]*?)</article>`))[1];a.match(card,/仅前置实验/);a.match(card,/专项实验尚未实现/);a.match(card,/专属深度交互模块待建设/);a.match(card,/（尚未实现）/);}
});
test('DOM both roles start readable, toggle known/unknown panels and retain native button state',()=>{
  const h=setup();a.ok(h.panels.every(p=>!p.hidden));a.ok(h.controls.every(c=>!c.hidden));a.ok(h.jump.hidden);
  for(let i=0;i<3;i++)for(let k=0;k<2;k++){h.roles[k].click();h.panels.forEach((p,j)=>a.equal(p.hidden,j!==k));h.roles.forEach((b,j)=>a.equal(b.attrs['aria-pressed'],String(j===k)));}
});
test('DOM each chain choice marks registry matches without hiding any card or changing query/hash',()=>{
  const h=setup();for(const button of h.positions){button.click();const ids=registry.directions.filter(d=>d.scenePositions.includes(button.dataset.scenePosition)).map(d=>'direction-'+d.id);for(const c of h.cards){a.equal(c.classes.has('scene-selected'),ids.includes(c.id));a.equal(c.badge.hidden,!ids.includes(c.id));a.equal(c.hidden,false);}a.equal(h.jump.attrs.href,'#'+ids[0]);a.match(h.status.textContent,new RegExp(`已标出 ${ids.length} 个`));a.equal(button.attrs['aria-pressed'],'true');}
  a.equal(h.location.hash,'#direction-channels');a.equal(h.location.search,'?view=1');
});
test('DOM repeated complete flow and reset restore roles, marks, feedback and jump target',()=>{
  const h=setup();for(let i=0;i<4;i++){h.roles[i%2].click();h.prediction.open=true;h.positions[i%h.positions.length].click();h.reset.click();a.ok(h.panels.every(p=>!p.hidden));a.ok(h.cards.every(c=>!c.classes.has('scene-selected')&&c.badge.hidden));a.ok([...h.roles,...h.positions].every(b=>b.attrs['aria-pressed']==='false'));a.equal(h.prediction.open,false);a.equal(h.status.textContent,'');a.equal(h.jump.hidden,true);a.equal(h.jump.attrs.href,undefined);}
});
test('DOM unknown position and unmarked future direction stay readable with explicit no-match feedback',()=>{
  const h=setup({future:true,unmatched:true});h.positions[0].click();a.equal(h.cards.at(-1).hidden,false);a.equal(h.cards.at(-1).classes.has('scene-selected'),false);h.positions.at(-1).click();a.match(h.status.textContent,/暂未标注/);a.equal(h.jump.hidden,true);a.ok(h.cards.every(c=>!c.hidden&&!c.classes.has('scene-selected')));h.reset.click();a.equal(h.status.textContent,'');
});
test('generator accepts unmarked future directions and changed position mapping without a second JS list',()=>{
  const r=structuredClone(registry),future=structuredClone(r.directions[0]);future.id='future';future.title='未来问题';delete future.scenePositions;r.directions.push(future);
  r.directions[0].scenePositions=['interpret','resources'];r.scenePositions[0].label='新的发射入口';
  const html=generateWith(r);a.match(html,/id="direction-future" data-scene-positions=""/);a.match(html,/尚未标注；仍可沿六层阅读/);a.match(html,/id="direction-waveforms" data-scene-positions="interpret resources"/);a.match(html,/新的发射入口/);
  const h=setup({html});h.positions.find(p=>p.dataset.scenePosition==='interpret').click();a.ok(h.cards.find(c=>c.id==='direction-waveforms').classes.has('scene-selected'));a.equal(h.cards.find(c=>c.id==='direction-future').hidden,false);
});
test('UI is a no-op on other pages; visual states have text cues, wrapping controls and visible focus',()=>{
  vm.runInNewContext(read('scene-guide.js'),{document:{getElementById:()=>null}});const css=read('scene-guide.css');for(const text of ['flex-wrap:wrap','min-height:44px',':focus-visible','[hidden]','@media(max-width:480px)','@media print'])a.ok(css.includes(text));a.ok(!/animation:|transition:|scroll-behavior:smooth/.test(css));a.match(read('reading.html'),/对应所选瓶颈/);
});

test('DOM status uses the dedicated registry label while buttons retain their visible hints',()=>{
  const h=setup();
  for(const position of registry.scenePositions){
    const button=h.positions.find(b=>b.dataset.scenePosition===position.id);
    a.equal(button.dataset.sceneLabel,position.label);
    a.ok(button.textContent.includes(position.hint));
    button.click();
    const count=registry.directions.filter(d=>d.scenePositions.includes(position.id)).length;
    a.equal(h.status.textContent,`${position.label}：已标出 ${count} 个主要入口，全部方向仍可阅读。`);
    a.ok(!h.status.textContent.includes(position.hint));
  }
});
