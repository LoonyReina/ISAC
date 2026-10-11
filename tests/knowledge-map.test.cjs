// Static contracts and a custom DOM simulation only: not browser, visual, or screen-reader QA.
'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),registry=JSON.parse(read('site/registry.json')),renderMap=require('../scripts/knowledge-map.cjs');
const {buildResearchGuides}=require('../scripts/research-guides.cjs'),guideData=JSON.parse(read(registry.researchGuidesFile));
const render=(r=registry,data=guideData)=>renderMap(r,buildResearchGuides(data,r));
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const decode=s=>s.replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const ids=h=>[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
function resolve(href){if(/^https?:/.test(href))return;const [file,hash]=href.split('#'),target=path.join(root,file||'index.html');a.ok(fs.existsSync(target),href);if(hash)a.ok(ids(fs.readFileSync(target,'utf8')).includes(decodeURIComponent(hash)),href);}
// Small selector/tree/event model. Native layout, focus visibility, actual event timing,
// accessibility APIs, and browser history integration require separate browser QA.
class Element{
 constructor(tag='div',attrs={}){this.tagName=tag;this.attrs={...attrs};this.dataset={};for(const [k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;this.id=attrs.id||'';this.hidden='hidden'in attrs;this.open='open'in attrs;this.children=[];this.parent=null;this.events={};this.value='';this._text='';}
 get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}set textContent(v){this.children=[];this._text=String(v);}
 append(...xs){for(const x of xs){x.parent=this;this.children.push(x);}}
 replaceChildren(...xs){for(const c of this.children)c.parent=null;this.children=[];this._text='';for(const x of xs)this.append(...(x.tagName==='#fragment'?x.children.slice():[x]));}
 get isConnected(){return this.connected||Boolean(this.parent&&this.parent.isConnected);}
 focus(options){this.focusOptions=options;this.revealCalls??=[];this.revealCalls.push('focus');if(!this.isConnected)return;for(let e=this;e;e=e.parent){if(e.hidden)return;if(e.parent?.tagName==='details'&&!e.parent.open&&e.tagName!=='summary')return;}this.focused=true;}
 scrollIntoView(options){this.scrollOptions=options;this.revealCalls??=[];this.revealCalls.push('scroll');}
 getAttribute(k){return this.attrs[k]??null;}setAttribute(k,v){this.attrs[k]=String(v);}hasAttribute(k){return k in this.attrs||(k.startsWith('data-')&&k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()) in this.dataset);}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 fire(k,extra={}){const event={target:this,preventDefault(){this.defaultPrevented=true;},...extra};for(const fn of this.events[k]||[])fn(event);return event;}
 matches(s){if(s.startsWith('.'))return (this.attrs.class||'').split(/\s+/).includes(s.slice(1));if(s.startsWith('[')){const m=s.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);return this.hasAttribute(m[1])&&(m[2]===undefined||this.attrs[m[1]]===m[2]);}return this.tagName===s;}
 querySelectorAll(s){const selectors=s.split(','),out=[];const visit=p=>{for(const c of p.children){if(selectors.some(s=>c.matches(s)))out.push(c);visit(c);}};visit(this);return out;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 closest(s){return this.matches(s)?this:this.parent?.closest(s)||null;}
 cloneNode(){const copy=new Element(this.tagName,this.attrs);copy._text=this._text;copy.hidden=this.hidden;copy.append(...this.children.map(c=>c.cloneNode(true)));return copy;}
}
function parse(html){const root=new Element('#fragment'),stack=[root];for(const token of html.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g)||[]){if(token.startsWith('<!--'))continue;if(token.startsWith('</')){stack.pop();continue;}if(token.startsWith('<')){const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;const attrs={};for(const m of token.slice(tag.length+1,-1).matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[m[1]]=decode(m[2]||'');const e=new Element(tag,attrs);stack.at(-1).append(e);if(tag==='template'){e.content=new Element('#fragment');stack.push(e.content);}else if(!['input','br','hr','img','meta','link'].includes(tag))stack.push(e);}else{const text=new Element('#text');text._text=decode(token);stack.at(-1).append(text);}}return root;}
function setup({hash='',html=render(registry)}={}){const tree=parse(html);tree.connected=true;const byId=id=>tree.querySelectorAll('[id]').find(e=>e.id===id)||null,window=new Element(),location={hash,search:'?view=1',pathname:'/ISAC/index.html'},pushes=[];
 const document={getElementById:byId,createElement:tag=>new Element(tag)},history={pushState(_s,_t,h){pushes.push(h);location.hash=h;}};vm.runInNewContext(read('knowledge-map.js'),{document,window,location,history});
 const map=byId('knowledge-map'),panel=byId('map-detail'),query=byId('map-search'),status=byId('map-status'),results=byId('map-search-results'),groups=map.querySelectorAll('.map-group');
 return {tree,map,panel,query,status,results,groups,location,pushes,byId,click:b=>map.fire('click',{target:b}),search:q=>{query.value=q;query.fire('input');},navigate:(hash,event='popstate')=>{location.hash=hash;window.fire(event);}};
}
const template=(html,id)=>html.match(new RegExp(`<template id="map-template-${id}">([\\s\\S]*?)</template>`))[1];
test('map registry references, node identities, bands, edges and editorial provenance are coherent',()=>{
 const k=registry.knowledgeMap,nodes=[...k.nodes,...k.directionNodes],set=new Set(nodes.map(n=>n.id));a.equal(set.size,nodes.length);a.equal(new Set(k.groups.map(g=>g.id)).size,k.groups.length);a.deepEqual(k.bands.flatMap(b=>b.groupIds).sort(),k.groups.map(g=>g.id).sort());
 for(const n of nodes)a.ok(k.groups.some(g=>g.id===n.groupId),n.id);
 for(const n of k.nodes){for(const ref of n.unitRefs)a.ok(registry.units.some(u=>u.id===ref),ref);if(n.entryUnitRef)a.ok(registry.units.some(u=>u.id===n.entryUnitRef));else resolve(n.href);for(const f of ['question','knownUnknown','boundary'])a.ok(n[f],n.id+': '+f);}
 a.deepEqual(k.directionNodes.map(n=>n.registryRef.id).sort(),registry.directions.map(d=>d.id).sort());for(const n of k.directionNodes){a.equal(n.registryRef.collection,'directions');a.equal(n.label,undefined);a.equal(n.question,undefined);}
 for(const e of k.edges){a.ok(set.has(e.source)&&set.has(e.target));a.notEqual(e.source,e.target);a.ok(k.edgeTypes.some(t=>t.id===e.type));a.equal(e.provenance,'editorial-pedagogic');a.equal(e.scientificClaim,false);a.ok(e.label);}
});
test('generated map has unique stable anchors, canonical links, truthful counts and no-JS routes',()=>{
 const html=render(registry),tree=parse(html),k=registry.knowledgeMap;const all=ids(html);a.equal(new Set(all).size,all.length);for(const [,href]of html.matchAll(/href="([^"]+)"/g))resolve(decode(href));
 a.equal(tree.querySelectorAll('.map-group').length,k.groups.length);a.equal(tree.querySelectorAll('[data-map-entry]').length,k.nodes.length+k.directionNodes.length);a.ok(tree.querySelectorAll('.map-group').every(g=>!g.open));a.ok(tree.querySelector('.map-tools').hidden);
 for(const n of [...k.nodes,...k.directionNodes]){const e=tree.querySelectorAll('[data-map-entry]').find(e=>e.dataset.mapEntry===n.id);a.equal(e.id,'map-node-'+n.id.replace(':','-'));a.ok(e.querySelector('a'));a.ok(e.querySelector('button').hidden);a.ok(all.includes('map-template-'+n.id));}
 for(const g of k.groups){const count=[...k.nodes,...k.directionNodes].filter(n=>n.groupId===g.id).length;const el=tree.querySelectorAll('.map-group').find(el=>el.dataset.mapGroup===g.id);a.ok(el.textContent.includes(count?`${count} 个`:`${registry.units.length} 个实验 · ${registry.cases.length} 个专题`));}
 a.match(html,/不是公认的穷尽研究分类/);a.match(html,/不表示技术因果或历史演进/);a.match(html,/aria-live="polite"/);a.match(html,/href="#curriculum"/);
});
test('concept templates resolve canonical units and bound every local relation',()=>{
 const html=render(registry),k=registry.knowledgeMap;for(const n of k.nodes){const h=template(html,n.id);a.ok(h.includes(escape(n.knownUnknown)));a.ok(h.includes(escape(n.boundary)));for(const ref of n.unitRefs){const u=registry.units.find(u=>u.id===ref);a.ok(h.includes(escape(u.title)));a.ok(h.includes(escape(u.action)));a.ok(h.includes(`href="${escape(u.href)}"`));}const rows=k.edges.filter(e=>e.source===n.id||e.target===n.id).length+n.unitRefs.length;a.equal((h.match(/data-map-relation="/g)||[]).length,rows);a.ok(h.includes(`局部关系 · ${rows} 条`));a.match(h,/所有关系均为教学导航/);if(n.unitRefs.length)a.match(h,/本站机制演示，不等于整篇论文复现/);else a.match(h,/尚无独立专项实验/);}
});
test('direction templates preserve six layers, proposed gaps, source versions, limits and unknowns',()=>{
 const html=render(registry);for(const n of registry.knowledgeMap.directionNodes){const d=registry.directions.find(d=>d.id===n.registryRef.id),h=template(html,n.id);for(const field of ['title','question','scope','coverage','nextExtension'])a.ok(h.includes(escape(d[field])),d.id+': '+field);for(const l of d.levels){a.ok(h.includes(escape(l.label)));for(const i of l.items){if(i.status==='available')a.ok(h.includes(`href="${escape(i.href)}">${escape(i.label)}</a>`));else{a.ok(h.includes(escape(i.label)+'（尚未实现）'));a.ok(!h.includes(`>${escape(i.label)}</a>`));}if(i.scope==='foundation-only')a.match(h,/仅前置实验/);if(i.scope==='shared-template')a.match(h,/通用计划/);}}
 for(const id of d.primaryCaseIds){const p=registry.cases.find(c=>c.id===id).paperComparison;for(const f of ['version','sourceTitle','sourceUrl','verificationNote','paperEvidenceType','siteArtifactType'])a.ok(h.includes(escape(p[f])),id+': '+f);for(const f of ['retainedAssumptions','omittedMechanisms','metrics','unknowns'])for(const value of p[f])a.ok(h.includes(escape(value)));a.ok(h.includes(escape(p.locator.summary)));a.ok(h.includes(escape(p.resourceBudget.summary)));a.match(h,/部分核对/);a.match(h,/待核对 \/ 未复现/);}}
});
test('canonical registry mutations flow through templates, entry URLs, search labels and counts',()=>{
 const r=structuredClone(registry),n=r.knowledgeMap.nodes.find(n=>n.entryUnitRef),u=r.units.find(u=>u.id===n.entryUnitRef),d=r.directions[0],c=r.cases.find(c=>d.primaryCaseIds.includes(c.id));u.title='UNIQUE UNIT LABEL';u.action='UNIQUE ACTION';u.href='foundations.html#echo';d.title='UNIQUE DIRECTION LABEL';d.question='UNIQUE DIRECTION QUESTION';if(c){c.title='UNIQUE CASE';c.paperComparison.version='UNIQUE VERSION';c.paperComparison.unknowns=['UNIQUE UNKNOWN'];}r.units.push({...u,id:'future-unit'});r.cases.push({...r.cases[0],id:'future-case'});
 const html=render(r);for(const s of ['UNIQUE UNIT LABEL','UNIQUE ACTION','UNIQUE DIRECTION LABEL','UNIQUE DIRECTION QUESTION',`${r.units.length} 个实验 · ${r.cases.length} 个专题`])a.ok(html.includes(s),s);if(c)for(const s of ['UNIQUE CASE','UNIQUE VERSION','UNIQUE UNKNOWN'])a.ok(template(html,'direction:'+d.id).includes(s));const h=setup({html});h.search('unique unit');a.ok(h.results.children.length>0);h.click(h.results.querySelector('button'));a.ok(h.panel.textContent.includes('UNIQUE ACTION'));
});
test('committed generator output is fresh and homepage retains four-stage/legacy routes',()=>{
 cp.execFileSync(process.execPath,['scripts/generate-site.cjs','--check'],{cwd:root,stdio:'pipe'});const html=read('index.html');a.ok(html.includes(render(registry)));a.equal((html.match(/class="stage-card"/g)||[]).length,4);a.match(html,/knowledge-map\.js\?v=/);a.match(html,/knowledge-map\.css\?v=/);for(const id of Object.keys(registry.legacy['index.html']))if(id)a.ok(ids(html).includes(id),id);a.ok(html.indexOf('id="knowledge-map"')<html.indexOf('id="curriculum"'));
});
test('DOM simulation enables controls while retaining all native concept links',()=>{const h=setup();a.equal(h.map.querySelector('.map-tools').hidden,false);a.ok(h.groups.every(g=>!g.open));a.ok(h.map.querySelectorAll('[data-map-node]').every(b=>!b.hidden));a.equal(h.panel.querySelector('h3').id,'map-detail-title');a.equal(h.pushes.length,0);});
test('DOM simulation searches normalized text, reports empty matches and clears without leaving selection',()=>{const h=setup();h.search('  crb  ');a.ok(h.results.children.length>0);a.match(h.status.textContent,/找到 \d+ 个入口/);const button=h.results.querySelector('button');h.click(button);const selectedHash=h.location.hash;a.ok(h.panel.focused);h.map.querySelector('.map-tools').fire('reset');a.equal(h.query.value,'');a.ok(h.results.hidden);a.equal(h.results.children.length,0);a.equal(h.location.hash,selectedHash);a.ok(h.query.focused);h.search('no-such-concept-42');a.equal(h.results.children.length,0);a.match(h.status.textContent,/没有匹配/);h.search('   ');a.ok(h.results.hidden);a.equal(h.status.textContent,'');});
test('DOM simulation selects every node from canonical templates and exposes its group only',()=>{const h=setup();for(const entry of h.map.querySelectorAll('[data-map-entry]')){h.click(entry.querySelector('button'));a.equal(h.location.hash,'#'+entry.id);a.equal(h.panel.querySelector('h3').textContent,entry.querySelector('a').textContent);a.equal(h.panel.querySelector('h3').id,'map-detail-title');for(const g of h.groups)a.equal(g.open,g.dataset.mapGroup===entry.dataset.mapGroup);a.match(h.status.textContent,/已选择/);}a.equal(h.location.search,'?view=1');});
test('DOM simulation relationship filters set row visibility, count and pressed state',()=>{const h=setup({hash:'#map-node-iq'}),filters=h.panel.querySelectorAll('[data-map-filter]'),rows=h.panel.querySelectorAll('[data-map-relation]');a.ok(filters.length>1);for(const button of filters){h.click(button);const type=button.dataset.mapFilter;for(const row of rows)a.equal(row.hidden,type!=='all'&&row.dataset.mapRelation!==type);for(const b of filters)a.equal(b.attrs['aria-pressed'],String(b===button));a.ok(h.panel.querySelector('[data-map-relation-status]').textContent.includes(`显示 ${rows.filter(r=>!r.hidden).length} 条`));}const relation=h.panel.querySelector('[data-map-node]');a.ok(relation);h.click(relation);a.ok(h.location.hash.startsWith('#map-node-'));});
test('DOM simulation reset and Escape restore overview, clear search and return focus',()=>{for(const escapeKey of [false,true]){const h=setup(),button=h.map.querySelector('[data-map-node]');h.click(button);h.search('相位');if(escapeKey)a.ok(h.map.fire('keydown',{key:'Escape'}).defaultPrevented);else h.click(h.map.querySelector('[data-map-reset]'));a.equal(h.location.hash,'#knowledge-map');a.equal(h.query.value,'');a.ok(h.results.hidden);a.ok(h.groups.every(g=>!g.open));a.equal(h.status.textContent,'');a.ok(button.closest('.map-group').querySelector('summary').focused);a.equal(button.focused,undefined);}const h=setup();a.equal(h.map.fire('keydown',{key:'Escape'}).defaultPrevented,undefined);});
test('DOM simulation disconnected search origin falls back to search focus on Escape',()=>{const h=setup();h.search('CRB');const button=h.results.querySelector('button');h.click(button);h.search('相位');a.equal(button.isConnected,false);h.map.fire('keydown',{key:'Escape'});a.ok(h.query.focused);});
test('DOM simulation hash/back restoration handles nodes, groups, malformed and unknown routes without new history',()=>{const h=setup({hash:'#map-node-direction-waveforms'});a.equal(h.panel.querySelector('h3').textContent,registry.directions[0].title);for(const event of ['hashchange','popstate']){h.navigate('#map-node-iq',event);a.match(h.status.textContent,/已恢复/);h.navigate('#map-group-radar',event);a.ok(h.groups.find(g=>g.dataset.mapGroup==='radar').open);a.equal(h.status.textContent,'');for(const hash of ['#map-node-does-not-exist','#map-%ZZ']){h.navigate(hash,event);a.match(h.status.textContent,/暂未收录/);a.ok(h.groups.every(g=>!g.open));}h.navigate('#curriculum',event);a.equal(h.status.textContent,'');}a.equal(h.pushes.length,0);});
test('DOM simulation native group toggle closes peers and retains native lesson navigation',()=>{const h=setup({hash:'#map-node-iq'}),group=h.groups.find(g=>g.dataset.mapGroup==='radar');group.open=true;group.fire('toggle');a.equal(h.location.hash,'#map-group-radar');a.ok(h.groups.filter(g=>g!==group).every(g=>!g.open));const count=h.pushes.length,link=group.querySelector('a');h.map.fire('click',{target:link});a.equal(h.pushes.length,count);h.map.fire('keydown',{key:'Escape'});a.equal(h.location.hash,'#knowledge-map');a.ok(group.querySelector('summary').focused);});
test('DOM simulation invalid node feedback is safe; runtime is a no-op on other pages',()=>{const h=setup(),button=new Element('button',{'data-map-node':'missing'});h.click(button);a.match(h.status.textContent,/暂未收录/);a.equal(h.pushes.length,0);vm.runInNewContext(read('knowledge-map.js'),{document:{getElementById:()=>null}});a.ok(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|setInterval|requestAnimationFrame/.test(read('knowledge-map.js')));});
test('responsive, print, reduced-motion and focus styles remain explicit contracts',()=>{const css=read('knowledge-map.css');for(const s of [':focus-visible','[hidden]','@media(max-width:900px)','@media(max-width:600px)','@media print','prefers-reduced-motion','min-height:44px'])a.ok(css.includes(s),s);});

test('DOM simulation search form submit prevents page reload and refreshes matches',()=>{const h=setup();h.query.value='CRB';const event=h.map.querySelector('.map-tools').fire('submit');a.ok(event.defaultPrevented);a.ok(h.results.children.length>0);a.equal(h.pushes.length,0);});
test('new canonical direction references extend map counts, searches and six-layer detail without a runtime list',()=>{const r=structuredClone(registry),future=structuredClone(r.directions[0]);future.id='future-direction';future.title='Future direction label';future.question='Future direction question';r.directions.push(future);r.knowledgeMap.directionNodes.push({id:'direction:future-direction',kind:'direction',groupId:'research',registryRef:{collection:'directions',id:future.id}});const html=render(r),h=setup({html});a.ok(html.includes(`${r.directions.length} 个方向`));h.search('future direction');a.equal(h.results.children.length,1);h.click(h.results.querySelector('button'));a.equal(h.location.hash,'#map-node-direction-future-direction');a.equal(h.panel.querySelector('h3').textContent,future.title);for(const l of future.levels)a.ok(h.panel.textContent.includes(l.label));});
test('direction relations support returning to concept nodes and preserve typed-edge semantics',()=>{const html=render(registry),h=setup({hash:'#map-node-direction-waveforms'});for(const n of registry.knowledgeMap.directionNodes){const content=template(html,n.id),edges=registry.knowledgeMap.edges.filter(e=>e.source===n.id||e.target===n.id);a.equal((content.match(/data-map-relation="/g)||[]).length,edges.length);for(const e of edges){const type=registry.knowledgeMap.edgeTypes.find(t=>t.id===e.type);a.ok(content.includes(escape(type.meaning)));}}const button=h.panel.querySelector('[data-map-node]');a.ok(button);h.click(button);a.ok(!h.location.hash.startsWith('#map-node-direction-'));});
test('generated text escapes canonical labels and preserves readable literal input',()=>{const r=structuredClone(registry),d=r.directions[0];d.title='A < B & "C"';d.question='Do not render <script>alert(1)</script>';const html=render(r),content=template(html,'direction:'+d.id);a.ok(content.includes(escape(d.title)));a.ok(content.includes(escape(d.question)));a.ok(!content.includes('<script>'));const h=setup({html,hash:'#map-node-direction-'+d.id});a.equal(h.panel.querySelector('h3').textContent,d.title);});
test('generator rejects duplicate node IDs and invalid canonical or editorial references',()=>{
 const mutations=[
 ['duplicate node',r=>r.knowledgeMap.nodes.push({...r.knowledgeMap.nodes[0]})],
 ['missing unit',r=>r.knowledgeMap.nodes[0].unitRefs.push('absent-unit')],
 ['missing entry unit',r=>r.knowledgeMap.nodes[0].entryUnitRef='absent-entry'],
 ['missing concept destination',r=>{delete r.knowledgeMap.nodes[0].entryUnitRef;delete r.knowledgeMap.nodes[0].href;}],
 ['missing group',r=>r.knowledgeMap.nodes[0].groupId='absent-group'],
 ['missing direction',r=>r.knowledgeMap.directionNodes[0].registryRef.id='absent-direction'],
 ['wrong reference collection',r=>r.knowledgeMap.directionNodes[0].registryRef.collection='units'],
 ['missing direction group',r=>r.knowledgeMap.directionNodes[0].groupId='absent-group'],
 ['missing band group',r=>r.knowledgeMap.bands[0].groupIds.push('absent-group')],
 ['missing edge source',r=>r.knowledgeMap.edges[0].source='absent-node'],
 ['missing edge target',r=>r.knowledgeMap.edges[0].target='absent-node'],
 ['invalid edge type',r=>r.knowledgeMap.edges[0].type='scientific-causation'],
 ['invalid provenance',r=>r.knowledgeMap.edges[0].provenance='unverified-paper-claim'],
 ['scientific claim',r=>r.knowledgeMap.edges[0].scientificClaim=true]
 ];for(const [label,mutate]of mutations){const r=structuredClone(registry);mutate(r);a.throws(()=>render(r),/knowledge-map/,label);}
});

test('DOM focus model rejects closed-disclosure descendants but accepts its visible summary',()=>{const h=setup(),group=h.groups[0],button=group.querySelector('button'),summary=group.querySelector('summary');a.equal(group.open,false);button.focus();a.equal(button.focused,undefined);summary.focus();a.ok(summary.focused);group.open=true;button.focus();a.ok(button.focused);});

test('DOM selection focuses without native scrolling then reveals panel start; history restoration does neither',()=>{
 const h=setup({hash:'#map-node-iq'});a.equal(h.panel.revealCalls,undefined);
 h.click(h.byId('map-node-iq').querySelector('button'));
 a.ok(h.panel.focused);a.equal(h.panel.focusOptions.preventScroll,true);
 a.equal(h.panel.scrollOptions.block,'start');a.equal(h.panel.scrollOptions.behavior,'auto');
 a.deepEqual(h.panel.revealCalls,['focus','scroll']);
 for(const event of ['popstate','hashchange'])h.navigate('#map-node-waveform-design',event);
 a.deepEqual(h.panel.revealCalls,['focus','scroll']);
 a.match(read('knowledge-map.css'),/\.map-detail\{[^}]*scroll-margin-top:/);
 a.ok(read('index.html').includes('knowledge-map.js?v=knowledge-map-v3'));
});

test('detail reveal adds a small gap to root header scroll-padding at desktop and narrow widths',()=>{
 const css=read('knowledge-map.css'),shell=read('site.css');
 const detailRules=[...css.matchAll(/(?:^|})\s*\.map-detail\{([^}]*)\}/gm)].map(m=>m[1]);
 const offsets=detailRules.flatMap(rule=>[...rule.matchAll(/scroll-margin-top:([^;}]*)/g)].map(m=>m[1]));
 a.deepEqual(offsets,['16px','16px']);
 a.match(shell,/html\{scroll-padding-top:110px/);
 a.match(shell,/@media\(max-width:700px\)\{html\{scroll-padding-top:150px/);
 a.match(css,/@media\(max-width:600px\)[\s\S]*?\.map-detail\{padding:22px 20px;scroll-margin-top:16px\}/);
 const html=read('index.html');a.ok(html.includes('knowledge-map.css?v=map-progression-v1'));
 a.ok(html.includes('knowledge-map.js?v=knowledge-map-v3'));
});

test('optional case learning entries resolve real same-page anchors and fall back to canonical units',()=>{
 const r=structuredClone(registry),html=render(r);
 for(const c of r.cases){
  const u=r.units.find(u=>u.id===c.unit),href=c.learningEntry||u.href;
  resolve(href);
  for(const n of r.knowledgeMap.nodes.filter(n=>n.unitRefs.includes(c.unit))){
   const links=parse(template(html,n.id)).querySelector('.map-case-paths').querySelectorAll('a');
   a.ok(links.some(l=>l.attrs.href===href&&l.textContent===c.title+' →'),c.id);
  }
 }
 for(const c of r.cases)delete c.learningEntry;
 const fallback=render(r);
 for(const d of r.directions)for(const id of d.primaryCaseIds){
  const c=r.cases.find(c=>c.id===id),u=r.units.find(u=>u.id===c.unit);
  a.ok(parse(template(fallback,'direction:'+d.id)).querySelector('.map-case-paths').querySelectorAll('a').some(l=>l.attrs.href===u.href&&l.textContent===c.title+' →'));
 }
 const c=r.cases.find(c=>c.id==='case-waveform');c.learningEntry='waveform-design.html#%69ntuition';
 a.doesNotThrow(()=>render(r));
});

test('learning-entry validation rejects external, traversal, missing and unrelated references',()=>{
 for(const bad of [null,42,'','https://example.test/waveform-design.html#intuition','//example.test/waveform-design.html#intuition','javascript:alert(1)','../waveform-design.html#intuition','./waveform-design.html#intuition','sub/../waveform-design.html#intuition','%2e%2e/waveform-design.html#intuition','waveform-design.html?view=1#intuition','waveform-design.html','waveform-design.html#','waveform-design.html#missing-anchor','waveform-design.html#%ZZ','waveform-design.html#intuition#model','waveform-design.html#intuition\n','waveform-design.html\\#intuition','joint-beamforming.html#intuition']){
  const r=structuredClone(registry);r.cases.find(c=>c.id==='case-waveform').learningEntry=bad;
  a.throws(()=>render(r),/case learningEntry/,JSON.stringify(bad));
 }
 const r=structuredClone(registry),c=r.cases.find(c=>c.id==='case-waveform');
 r.units.find(u=>u.id===c.unit).href='missing-case-page.html#experiment';c.learningEntry='missing-case-page.html#intuition';
 a.throws(()=>render(r),/Missing case learningEntry page/);
});

test('case choices derive from canonical titles and entries in concept and direction panels',()=>{
 const r=structuredClone(registry),c=r.cases.find(c=>c.id==='case-waveform');
 c.title='CANONICAL DEEP CASE <renamed>';c.learningEntry='waveform-design.html#model';
 const html=render(r);
 for(const id of ['waveform-design','direction:waveforms']){
  const h=template(html,id),tree=parse(h),block=tree.querySelector('.map-case-paths');
  a.ok(block.querySelectorAll('a').some(l=>l.attrs.href===c.learningEntry&&l.textContent===c.title+' →'));
  a.ok(h.indexOf('class="map-case-paths"')<h.indexOf('class="map-local-map"'));
  a.ok(!block.closest('details'));a.match(h,/CANONICAL DEEP CASE &lt;renamed>/);
 }
 for(const [id,expected]of [['beam-design',['case-near-field','case-joint-beamforming','case-crb-beamforming','case-radar-beam-decision','case-shared-array']],['waveform-design',['case-pilot','case-waveform','case-golay-radar']]]){
  const links=parse(template(html,id)).querySelector('.map-case-paths').querySelectorAll('a');
  a.deepEqual(links.map(l=>l.textContent),expected.map(id=>r.cases.find(c=>c.id===id).title+' →'));
 }
});

test('explicit beginner routes and actions survive reversed unitRefs',()=>{
 const r=structuredClone(registry),before=render(r);
 for(const n of r.knowledgeMap.nodes)n.unitRefs.reverse();
 const after=render(r);
 for(const n of r.knowledgeMap.nodes.filter(n=>n.entryUnitRef)){
  const u=r.units.find(u=>u.id===n.entryUnitRef),b=parse(template(before,n.id)).querySelector('.map-beginner'),c=parse(template(after,n.id)).querySelector('.map-beginner');
  if(r.knowledgeMap.progressions.some(p=>p.nodeId===n.id)){a.equal(b,null);a.equal(c,null);const ladder=parse(template(after,n.id)).querySelector('.map-progression');a.ok(ladder.textContent.includes(u.action));a.equal(ladder.querySelectorAll('a').filter(l=>l.attrs.href===u.href).length,1);continue;}
  a.equal(c.textContent,b.textContent,n.id);a.deepEqual(c.querySelectorAll('a').map(l=>l.attrs.href),[u.href,u.href],n.id);a.ok(c.textContent.includes(u.action));
 }
 const linkOnly=r.knowledgeMap.nodes.find(n=>!n.entryUnitRef&&n.unitRefs.length),u=r.units.find(u=>u.id===linkOnly.unitRefs[0]);
 a.deepEqual(parse(template(after,linkOnly.id)).querySelector('.map-beginner').querySelectorAll('a').map(l=>l.attrs.href),[linkOnly.href,u.href]);
});

test('case-free concepts and directions have no empty or proposed case choices',()=>{
 const html=render(registry);
 for(const n of registry.knowledgeMap.nodes.filter(n=>!registry.cases.some(c=>n.unitRefs.includes(c.unit))))a.equal(parse(template(html,n.id)).querySelector('.map-case-paths'),null,n.id);
 for(const d of registry.directions.filter(d=>!d.primaryCaseIds.length))a.equal(parse(template(html,'direction:'+d.id)).querySelector('.map-case-paths'),null,d.id);
 const r=structuredClone(registry),d=r.directions.find(d=>d.id==='learning');
 d.primaryCaseIds=[]; // Explicitly exercise a case-free direction even after a real learning case is added.
 d.levels.find(l=>l.id==='intuition').items.unshift({label:'PROPOSED NEW CASE',status:'proposed',href:'unimplemented.html#case'});
 a.equal(parse(template(render(r),'direction:learning')).querySelector('.map-case-paths'),null);
});

test('direction panels keep one available intuition CTA and all six levels in a closed native disclosure',()=>{
 const html=render(registry);
 for(const d of registry.directions){
  const tree=parse(template(html,'direction:'+d.id)),depth=tree.querySelector('.map-direction-depth'),cta=tree.querySelector('.map-beginner'),first=d.levels.find(l=>l.id==='intuition').items.find(i=>i.status==='available');
  a.equal(depth.tagName,'details');a.equal(depth.open,false);a.equal(depth.hasAttribute('open'),false);a.equal(depth.children.find(c=>c.tagName!=='#text').tagName,'summary');
  a.equal(cta.querySelectorAll('a').length,1);a.equal(cta.querySelector('a').attrs.href,first.href);a.equal(cta.closest('details'),null);
  a.equal(depth.querySelector('.map-direction-list').children.filter(c=>c.tagName==='li').length,6);
  for(const l of d.levels){a.ok(depth.textContent.includes(l.label));for(const field of ['note','notice'])if(l[field])a.ok(depth.textContent.includes(l[field]));for(const i of l.items){a.ok(depth.textContent.includes(i.label));if(i.note)a.ok(depth.textContent.includes(i.note));}}
  a.ok(depth.textContent.includes(d.nextExtension));
  for(const evidence of tree.querySelectorAll('.map-deep')){a.equal(evidence.open,false);a.equal(evidence.parent,tree);}
 }
 const r=structuredClone(registry),d=r.directions[0],l=d.levels.find(l=>l.id==='intuition');
 l.items.unshift({label:'UNAVAILABLE FIRST',status:'proposed'},{label:'NEW AVAILABLE INTUITION',href:'foundations.html#iq',status:'available'});d.levels.reverse();
 const cta=parse(template(render(r),'direction:'+d.id)).querySelector('.map-beginner');
 a.equal(cta.querySelectorAll('a').length,1);a.equal(cta.querySelector('a').attrs.href,'foundations.html#iq');a.match(cta.textContent,/NEW AVAILABLE INTUITION/);a.ok(!cta.textContent.includes('UNAVAILABLE'));
});

test('DOM disclosure toggles and native links add no history; restored templates start closed',()=>{
 for(const resetWithEscape of [false,true]){
  const h=setup(),direction=h.byId('map-node-direction-waveforms'),concept=h.byId('map-node-beam-design');h.click(direction.querySelector('button'));
  const depth=h.panel.querySelector('.map-direction-depth'),start=h.pushes.length,hash=h.location.hash;
  h.click(depth.querySelector('summary'));depth.open=true;depth.fire('toggle');h.click(depth.querySelector('a'));
  a.equal(h.pushes.length,start);a.equal(h.location.hash,hash);a.equal(h.panel.querySelector('h3').id,'map-detail-title');
  h.click(concept.querySelector('button'));const count=h.pushes.length;
  for(const event of ['popstate','hashchange']){
   h.navigate(hash,event);a.equal(h.panel.querySelector('.map-direction-depth').open,false);a.equal(h.panel.querySelector('h3').textContent,registry.directions[0].title);a.ok(h.groups.find(g=>g.dataset.mapGroup==='research').open);
   h.panel.querySelector('.map-direction-depth').open=true;
   h.navigate('#map-node-beam-design',event);a.equal(h.panel.querySelector('h3').textContent,registry.knowledgeMap.nodes.find(n=>n.id==='beam-design').label);a.ok(h.groups.find(g=>g.dataset.mapGroup==='codesign').open);
  }
  a.equal(h.pushes.length,count);h.navigate(hash);h.panel.querySelector('.map-direction-depth').open=true;
  if(resetWithEscape)h.map.fire('keydown',{key:'Escape'});else h.click(h.map.querySelector('[data-map-reset]'));
  a.equal(h.location.hash,'#knowledge-map');a.equal(h.panel.querySelector('.map-direction-depth'),null);a.equal(h.panel.querySelector('h3').id,'map-detail-title');a.ok(h.groups.every(g=>!g.open));a.ok(concept.closest('.map-group').querySelector('summary').focused);
 }
});

test('estimation starts with common observations and retains the scoped advanced LS route',()=>{
 const n=registry.knowledgeMap.nodes.find(n=>n.id==='estimation'),advanced=registry.units.find(u=>u.id==='estimator-crb');
 a.equal(n.entryUnitRef,'shared');a.deepEqual(n.unitRefs,['shared','estimator-crb','offgrid-range']);a.equal(advanced.group,'research');a.deepEqual(advanced.prerequisites,['theory.html#crb-mechanism']);
 const h=template(render(registry),n.id),beginner=parse(h).querySelector('.map-beginner');a.equal(beginner.querySelector('a').attrs.href,'theory.html#shared-model');a.ok(h.includes('href="'+advanced.href+'"'));
 const d=registry.directions.find(d=>d.id==='receiver'),item=d.levels.find(l=>l.id==='experiment').items.find(i=>i.href===advanced.href);
 a.equal(item.status,'available');a.match(item.label,/实标量 LS/);a.match(item.note,/无量纲实增益/);a.match(item.note,/不是非线性测距/);a.match(d.coverage,/离格单目标有限网格测距/);a.match(d.coverage,/连续优化、真实信道校准和多目标跟踪尚未实现/);
 resolve(item.href);a.ok(read('reading.html').includes(escape(item.note)));
});

test('mutual assistance preserves its native theory entry and links only the bounded synthetic mechanism',()=>{
 const k=registry.knowledgeMap,n=k.nodes.find(n=>n.id==='mutual-assistance');a.equal(n.groupId,'codesign');a.equal(n.href,'theory.html#evolution');a.deepEqual(n.unitRefs,['radar-beam-decision']);a.equal(n.entryUnitRef,undefined);resolve(n.href);
 const h=template(render(registry),n.id),tree=parse(h);a.match(h,/集成收益/);a.match(h,/任务互助收益/);a.match(h,/已有独立合成感知辅助波束候选机制/);a.match(h,/未实现在线闭环或端到端收益验证/);a.doesNotMatch(h,/尚无独立专项实验/);
 const beginner=tree.querySelector('.map-beginner');a.deepEqual(beginner.querySelectorAll('a').map(l=>l.attrs.href),['theory.html#evolution','radar-beam-decision.html#experiment']);
 const choices=tree.querySelector('.map-case-paths').querySelectorAll('a');a.equal(choices.length,1);a.equal(choices[0].attrs.href,'radar-beam-decision.html#mechanism');resolve(choices[0].attrs.href);
 const edges=k.edges.filter(e=>e.source===n.id||e.target===n.id);a.equal(edges.length,1);a.equal(edges[0].target,'direction:networks');a.equal(edges[0].type,'research_entry');a.equal(edges[0].scientificClaim,false);
 const runtime=setup();runtime.search('互助');a.equal(runtime.results.children.length,1);runtime.click(runtime.results.querySelector('button'));a.equal(runtime.location.hash,'#map-node-mutual-assistance');
 a.ok(read('index.html').includes(`<strong>${k.nodes.length}</strong> 个核心概念`));
});

test('generated lesson index has exactly one canonical native link per registered unit, including case-free units',()=>{
 const html=render(registry),h=setup({html}),index=h.byId('map-lesson-search').content.querySelectorAll('a');
 a.equal(index.length,registry.units.length);a.equal(new Set(index.map(e=>e.dataset.mapUnit)).size,index.length);
 for(const u of registry.units){const c=registry.cases.find(c=>c.unit===u.id),entry=index.find(e=>e.dataset.mapUnit===u.id);a.equal(entry.textContent,u.title);a.equal(entry.attrs.href,c?.learningEntry||u.href);resolve(entry.attrs.href);a.equal(entry.hasAttribute('data-map-node'),false);}
 a.ok(registry.units.some(u=>!registry.cases.some(c=>c.unit===u.id)));
 a.equal(h.map.querySelectorAll('[data-map-unit]').length,0,'inert template is not a second visible directory');
 a.equal(h.map.querySelectorAll('[data-map-entry]').length,40);
});

test('exact and partial Chinese and English unit titles expose direct learning entries before relationship results',()=>{
 const h=setup();
 for(const u of registry.units){h.search(u.title);const links=h.results.querySelectorAll('a');a.ok(links.some(e=>e.dataset.mapUnit===u.id),u.title);a.equal(links[0].dataset.mapUnit,u.id);a.equal(h.results.children[0].querySelector('a'),links[0]);}
 for(const [term,id,href]of [
  ['共享阵列','shared-array','shared-array.html#question'],['置零','shared-array','shared-array.html#question'],
  ['插值','ofdm-interpolation','ofdm-interpolation.html#mechanism'],['  oFdM  ','ofdm-interpolation','ofdm-interpolation.html#mechanism'],
  [' GoLaY ','golay-radar','golay-radar.html#experiment'],['通信门槛','crb-beamforming','crb-beamforming.html#intuition'],
  ['递归','perceptive-clutter','perceptive-clutter.html#question'],['稀疏导频','pilot','pilot-design.html#experiment'],
  [' I/Q ','iq','foundations.html#iq']
 ]){h.search(term);const links=h.results.querySelectorAll('a'),entry=links.find(e=>e.dataset.mapUnit===id);a.ok(entry,term);a.equal(entry.attrs.href,href,term);a.match(entry.textContent,/课程入口 · 直接打开/);a.equal(links.filter(e=>e.dataset.mapUnit===id).length,1);a.ok(h.results.querySelector('button'),term+' retains relationships');}
});

test('search keeps concept and direction matches, types and ordering, without introducing fake lesson relevance',()=>{
 const h=setup();
 for(const q of ['I/Q','相位','CRB',...registry.directions.map(d=>d.title)]){
  h.search(q);const expected=h.map.querySelectorAll('[data-map-entry]').filter(e=>e.dataset.mapSearch.toLocaleLowerCase().includes(q.toLocaleLowerCase()));
  a.deepEqual(h.results.querySelectorAll('button').map(e=>e.dataset.mapNode),expected.map(e=>e.dataset.mapEntry));
  for(const b of h.results.querySelectorAll('button')){a.equal(b.attrs['aria-controls'],'map-detail');a.match(b.textContent,/查看关系/);a.match(b.textContent,b.dataset.mapNode.startsWith('direction:')?/研究方向/:/概念关系/);}
 }
 // A physical-question word may select concepts, but does not imply a title match.
 h.search('旁瓣');a.equal(h.results.querySelectorAll('a').length,0);
 for(const q of ['DeepSense','MU-MIMO','目标—杂波—干扰分量可视化','no-such-lesson-42']){h.search(q);a.equal(h.results.children.length,0);a.match(h.status.textContent,/没有匹配的概念、课程或方向/);}
});

test('search count includes all typed matches without a hidden cap or repeated unit attachments',()=>{
 const r=structuredClone(registry),word='MATCH ALL';
 for(const u of r.units)u.title=word+' '+u.title;
 for(const n of r.knowledgeMap.nodes)n.label=word+' '+n.label;
 for(const d of r.directions)d.title=word+' '+d.title;
 const h=setup({html:render(r)});h.search(word);
 const lessons=h.results.querySelectorAll('a'),relations=h.results.querySelectorAll('button');
 const lessonCount=r.units.length,relationCount=r.knowledgeMap.nodes.length+r.directions.length;
 a.equal(lessonCount,28);a.equal(relationCount,40);a.equal(lessons.length,lessonCount);a.equal(relations.length,relationCount);a.equal(h.results.children.length,lessonCount+relationCount);
 a.equal(new Set(lessons.map(l=>l.dataset.mapUnit)).size,lessonCount);a.equal(h.status.textContent,`找到 ${lessonCount+relationCount} 个入口（${lessonCount} 个课程入口，${relationCount} 个概念或方向）；四阶段路线仍在下方。`);
 a.deepEqual(h.results.children.slice(0,lessonCount).map(li=>li.querySelector('a').dataset.mapUnit),r.units.map(u=>u.id));
 a.ok(h.groups.some(g=>g.textContent.includes(`${lessonCount} 个实验 · ${r.cases.length} 个专题`)));
});

test('native lesson results preserve keyboard defaults, map selection and history; clear, reset, Escape and repeated search remain coherent',()=>{
 const h=setup({hash:'#map-node-beam-design'});h.search('置零');
 const link=h.results.querySelector('a'),button=h.results.querySelector('button'),hash=h.location.hash;
 a.equal(link.attrs.href,'shared-array.html#question');a.equal(link.hasAttribute('data-map-node'),false);a.equal(link.hasAttribute('tabindex'),false);a.equal(link.hasAttribute('role'),false);
 link.focus();a.ok(link.focused);a.equal(h.click(link).defaultPrevented,undefined);
 a.equal(h.map.fire('keydown',{target:link,key:'Enter'}).defaultPrevented,undefined);
 a.equal(h.pushes.length,0);a.equal(h.location.hash,hash);
 a.ok(h.map.querySelector('.map-tools').fire('submit').defaultPrevented);a.equal(h.results.querySelectorAll('a').length,1);
 h.click(button);a.match(h.panel.textContent,/局部关系/);const selected=h.location.hash;
 for(const event of ['popstate','hashchange']){h.navigate(hash,event);a.equal(h.query.value,'置零');a.equal(h.results.querySelector('a').attrs.href,'shared-array.html#question');h.navigate(selected,event);}
 h.map.querySelector('.map-tools').fire('reset');a.equal(h.location.hash,selected);a.ok(h.results.hidden);a.ok(h.query.focused);
 h.search('Golay');h.map.fire('keydown',{key:'Escape'});a.equal(h.location.hash,'#knowledge-map');a.ok(h.results.hidden);a.equal(h.query.value,'');a.ok(h.query.focused);
 h.search('插值');h.click(h.map.querySelector('[data-map-reset]'));a.equal(h.results.children.length,0);a.ok(h.groups.every(g=>!g.open));
});

test('search accessibility exposes controls, polite totals, native links and visible focus/touch styles',()=>{
 const h=setup();a.equal(h.query.attrs['aria-controls'],'map-search-results');a.equal(h.query.attrs['aria-describedby'],'map-status');a.equal(h.status.attrs.role,'status');a.equal(h.status.attrs['aria-live'],'polite');a.equal(h.results.attrs['aria-label'],'搜索结果');
 h.search('CRB');a.ok(h.results.querySelectorAll('a').every(a=>a.attrs.href));a.ok(h.results.querySelectorAll('button').every(b=>b.type==='button'));
 const css=read('knowledge-map.css');a.match(css,/\.map-search-results a\{min-height:44px/);a.match(css,/\.map-search-results button,\.map-search-results a\{[^}]*overflow-wrap:anywhere/);a.match(css,/:is\(a,button,input,summary\):focus-visible/);
 a.doesNotMatch(read('knowledge-map.js'),/require\(|node:fs|learning-entry\.cjs|fetch\(/);
});

test('mixed cached HTML without the lesson template retains original concept and direction search',()=>{
 const html=render(registry).replace(/<template id="map-lesson-search">[\s\S]*?<\/template>/,'').replace(/ data-map-kind="(?:concept|direction)"/g,'');
 const h=setup({html});h.search('CRB');a.ok(h.results.querySelector('button'));a.equal(h.results.querySelectorAll('a').length,0);h.click(h.results.querySelector('button'));a.match(h.panel.textContent,/局部关系/);
 h.search(registry.directions[0].title);a.match(h.results.querySelector('button').textContent,/研究方向/);h.click(h.results.querySelector('button'));a.equal(h.location.hash,'#map-node-direction-'+registry.directions[0].id);
 h.map.fire('keydown',{key:'Escape'});a.ok(h.results.hidden);a.equal(h.location.hash,'#knowledge-map');
});

test('one four-ID selection reuses existing concept, unit, prerequisite and typed paper relations without adding edges or counts',()=>{
 const selection={nodeId:'known-pilots',unitId:'pilot',guideId:'ofdm-passive-atomic-errors-2017',nextGuideId:'zak-otfs-semiblind-offgrid-2026'};
 a.deepEqual(registry.knowledgeMap.progressions,[selection]);
 a.deepEqual([registry.knowledgeMap.nodes.length,registry.directions.length,registry.units.length,registry.cases.length,guideData.cards.length,guideData.cards.filter(c=>c.visualTrace).length],[32,8,28,15,19,7]);
 const n=registry.knowledgeMap.nodes.find(n=>n.id===selection.nodeId),u=registry.units.find(u=>u.id===selection.unitId),g=guideData.cards.find(g=>g.id===selection.guideId),next=guideData.cards.find(g=>g.id===selection.nextGuideId);
 a.ok(n.unitRefs.includes(u.id));a.ok(g.prerequisites.some(p=>p.href===u.href));a.equal(next.contextTrail.links.find(e=>e.guideId===g.id).relationType,'problem-link');
 const h=template(render(),'known-pilots'),ladder=parse(h).querySelector('.map-progression');
 a.ok(h.indexOf('class="map-progression"')<h.indexOf('class="map-local-map"'));
 a.deepEqual(ladder.querySelector('.map-progression-steps').querySelectorAll('a').map(e=>e.attrs.href),['index.html#map-node-known-pilots','pilot-design.html#experiment','reading.html#guide-ofdm-passive-atomic-errors-2017','reading.html#guide-zak-otfs-semiblind-offgrid-2026']);
 a.equal(parse(h).querySelector('.map-beginner'),null);a.equal(ladder.querySelectorAll('button').length,0);a.equal(ladder.querySelectorAll('[id]').length,0);a.doesNotMatch(ladder.textContent,/reference-uncertainty|因果继承|最新论文/);
 a.match(ladder.textContent,/前置机制；不是论文算法复现/);a.match(ladder.textContent,/本站按问题关联（非引用关系）/);a.match(ladder.textContent,/固定版本：2026-08-04.*核查：2026-10-11/);a.match(ladder.textContent,/不是最新保证/);
 a.ok(ladder.textContent.includes(next.nextQuestion));a.ok(ladder.textContent.includes(next.source.edition));a.ok(ladder.textContent.includes(next.contextTrail.links.find(e=>e.guideId===g.id).sourceLocator));
 for(const id of ['messages','iq','direction:waveforms'])a.doesNotMatch(template(render(),id),/class="map-progression"/);
});
test('the relevant native group contains the identical no-JS ladder while enhanced controls retain existing templates',()=>{
 const h=render(),body=template(h,'known-pilots'),ladder=body.match(/<section class="map-progression"[\s\S]*?<\/section>/)[0];
 a.equal((h.match(/<noscript>/g)||[]).length,1);a.ok(h.includes('<noscript><div class="map-progression-fallback">'+ladder+'</div></noscript>'));
 const nojs=parse(h),fallback=nojs.querySelector('noscript');a.equal(fallback.closest('.map-group').dataset.mapGroup,'observation');a.equal(fallback.querySelectorAll('a').filter(e=>e.attrs.href.startsWith('reading.html#guide-')).length,2);
 a.ok(fallback.querySelectorAll('a').every(e=>!e.hidden));a.equal(fallback.querySelector('details').open,false);a.equal(new Set(ids(h)).size,ids(h).length);
 const runtime=setup({hash:'#map-node-known-pilots'});a.ok(runtime.panel.querySelector('.map-progression'));a.equal(runtime.map.querySelectorAll('[data-map-entry]').length,40);
});
test('ladder text derives from source records, escapes arbitrary prose and keeps fixed link identities',()=>{
 const r=structuredClone(registry),d=structuredClone(guideData),attack='A <img src=x onerror=bad()> & "B" </script>';
 const n=r.knowledgeMap.nodes.find(n=>n.id==='known-pilots'),u=r.units.find(u=>u.id==='pilot'),g=d.cards.find(g=>g.id==='ofdm-passive-atomic-errors-2017'),next=d.cards.find(g=>g.id==='zak-otfs-semiblind-offgrid-2026');
 n.label=attack;n.question=attack;u.title=attack;u.action=attack;g.title=attack;g.question=attack;next.title=attack;next.question=attack;next.nextQuestion=attack;next.source.edition=attack;next.source.checkedAt='2026-10-12';next.contextTrail.links.find(e=>e.guideId===g.id).verificationNote=attack;
 const h=template(render(r,d),'known-pilots'),ladder=parse(h).querySelector('.map-progression');a.ok(h.includes(escape(attack)));a.doesNotMatch(h,/<img|<script|onerror="bad/);a.ok(ladder.textContent.includes(attack));a.match(ladder.textContent,/核查：2026-10-12/);
 a.ok(ladder.querySelectorAll('a').every(e=>!e.attrs.href.includes('img')));
 next.contextTrail.links.find(e=>e.guideId===g.id).relationType='direct-citation';const changed=parse(template(render(r,d),'known-pilots')).querySelector('.map-progression');a.match(changed.textContent,/新文直接引用此文/);a.doesNotMatch(changed.textContent,/本站按问题关联（非引用关系）/);
});
test('progression selection rejects missing, duplicate, mismatched and unsafe references rather than inventing navigation edges',()=>{
 const mutations=[
  r=>{r.knowledgeMap.progressions=null;},r=>{r.knowledgeMap.progressions={};},r=>{r.knowledgeMap.progressions=[null];},r=>{r.knowledgeMap.progressions[0].nodeId=['known-pilots'];},
  r=>{r.knowledgeMap.progressions[0].unitId='../pilot';},r=>{r.knowledgeMap.progressions[0].title='unreviewed';},r=>{delete r.knowledgeMap.progressions[0].guideId;},r=>{r.knowledgeMap.progressions.push({...r.knowledgeMap.progressions[0]});},
  r=>{r.knowledgeMap.progressions[0].nodeId='missing';},r=>{r.knowledgeMap.progressions[0].unitId='reference-uncertainty';},r=>{r.knowledgeMap.progressions[0].guideId='missing';},r=>{r.knowledgeMap.progressions[0].nextGuideId='missing';},
  r=>{r.knowledgeMap.progressions[0].nextGuideId=r.knowledgeMap.progressions[0].guideId;},r=>{r.knowledgeMap.nodes.find(n=>n.id==='known-pilots').unitRefs=['golay-radar'];},r=>{r.knowledgeMap.progressions[0].unitId='golay-radar';}
 ];
 for(const mutate of mutations){const r=structuredClone(registry);mutate(r);a.throws(()=>render(r),/Invalid knowledge-map progression/);}
 for(const mutate of [d=>{d.cards.find(g=>g.id==='ofdm-passive-atomic-errors-2017').prerequisites=d.cards[0].prerequisites;},d=>{d.cards.find(g=>g.id==='zak-otfs-semiblind-offgrid-2026').contextTrail.links=[];},d=>{d.cards.find(g=>g.id==='zak-otfs-semiblind-offgrid-2026').contextTrail.links[1].relationType=['problem-link'];}]){const d=structuredClone(guideData);mutate(d);a.throws(()=>render(registry,d),/Invalid/);}
 a.throws(()=>renderMap(registry),/progression guide data/);
 const without=structuredClone(registry);delete without.knowledgeMap.progressions;a.doesNotThrow(()=>renderMap(without));a.doesNotMatch(renderMap(without),/class="map-progression"/);
});
test('progressions verify generated anchor targets and prevent unregistered source IDs from becoming URLs',()=>{
 const r=structuredClone(registry),d=structuredClone(guideData);r.knowledgeMap.progressions[0].guideId='unpublished-guide';d.cards.find(g=>g.id==='ofdm-passive-atomic-errors-2017').id='unpublished-guide';d.cards.find(g=>g.id==='zak-otfs-semiblind-offgrid-2026').contextTrail.links[1].guideId='unpublished-guide';a.throws(()=>render(r,d),/Missing unit learning entry fragment/);
 const other=structuredClone(registry),n=other.knowledgeMap.nodes.find(n=>n.id==='known-pilots');n.id='unpublished-node';other.knowledgeMap.progressions[0].nodeId=n.id;other.knowledgeMap.edges=other.knowledgeMap.edges.filter(e=>e.source!=='known-pilots'&&e.target!=='known-pilots');a.throws(()=>render(other),/Missing unit learning entry fragment/);
});
test('native ladder links and explanation work with unchanged selection, search, Back/Forward and Escape handling',()=>{
 const h=setup({hash:'#map-node-known-pilots'}),ladder=h.panel.querySelector('.map-progression'),why=ladder.querySelector('details');a.equal(why.open,false);why.open=true;
 for(const link of ladder.querySelectorAll('a')){a.equal(h.click(link).defaultPrevented,undefined);a.equal(h.map.fire('keydown',{target:link,key:'Enter'}).defaultPrevented,undefined);}
 a.equal(h.pushes.length,0);a.equal(h.location.hash,'#map-node-known-pilots');
 h.search('导频');h.map.querySelector('.map-tools').fire('reset');a.equal(h.panel.querySelector('.map-progression-why'),why);a.equal(why.open,true);a.ok(h.panel.querySelector('.map-progression'));
 for(const event of ['hashchange','popstate']){h.navigate('#map-node-iq',event);a.equal(h.panel.querySelector('.map-progression'),null);h.navigate('#map-node-known-pilots',event);a.ok(h.panel.querySelector('.map-progression'));}
 a.equal(h.pushes.length,0);h.map.fire('keydown',{key:'Escape'});a.equal(h.location.hash,'#knowledge-map');a.equal(h.panel.querySelector('.map-progression'),null);a.ok(h.groups.every(g=>!g.open));
});
test('ladder remains a vertical native disclosure with versioned styles and no runtime or source-data changes',()=>{
 const css=read('knowledge-map.css');a.match(css,/\.map-progression-steps\{[^}]*border-left:/);a.match(css,/\.map-progression-why>summary\{[^}]*min-height:44px/);a.match(css,/\.map-progression\{[^}]*overflow-wrap:anywhere/);a.ok(read('index.html').includes('knowledge-map.css?v=map-progression-v1'));
 a.doesNotMatch(read('knowledge-map.js'),/progression|researchGuides|contextTrail/);
 const digest=file=>require('node:crypto').createHash('sha256').update(read(file)).digest('hex');
 a.equal(digest('site/research-guides.json'),'96ada0f0c6d048af19228c4a3f9e6e11855fc4d9a00930795d2af7953409a6cb');
 const generator=read('scripts/generate-site.cjs');a.ok(generator.indexOf('const researchGuides=')<generator.indexOf("const home=pageFor('index.html');"));a.match(generator,/'knowledge-map\.cjs'\)\)\(registry,researchGuides\)/);
});

test('selected guides must remain unique and their relationship and source metadata must pass existing guide validation',()=>{
 const nextId='zak-otfs-semiblind-offgrid-2026',mutations=[
  d=>d.cards.push(structuredClone(d.cards.find(g=>g.id===nextId))),
  d=>{const t=d.cards.find(g=>g.id===nextId).contextTrail;t.links.push(structuredClone(t.links[1]));},
  d=>{d.cards.find(g=>g.id===nextId).contextTrail.links.pop();},
  d=>{d.cards.find(g=>g.id===nextId).source.url='javascript:alert(1)';},
  d=>{d.cards.find(g=>g.id===nextId).source.url='https://user:password@example.test/paper';},
  d=>{d.cards.find(g=>g.id===nextId).source.url='https://example.test/paper#unverified';},
  d=>{d.cards.find(g=>g.id===nextId).source.checkedAt='2026-02-30';},
  d=>{d.cards.find(g=>g.id===nextId).contextTrail.links[1].sourceLocator='';}
 ];
 for(const mutate of mutations){const d=structuredClone(guideData);mutate(d);a.throws(()=>render(registry,d),/Invalid/);}
 const validated=buildResearchGuides(guideData,registry);a.throws(()=>renderMap(registry,[...validated,validated.at(-1)]),/progression guide data/);
 const before=JSON.stringify(registry),papers=JSON.stringify(guideData);render();a.equal(JSON.stringify(registry),before);a.equal(JSON.stringify(guideData),papers);
});
