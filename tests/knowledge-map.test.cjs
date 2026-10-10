// Static contracts and a custom DOM simulation only: not browser, visual, or screen-reader QA.
'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),registry=JSON.parse(read('site/registry.json')),render=require('../scripts/knowledge-map.cjs');
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
 setAttribute(k,v){this.attrs[k]=String(v);}hasAttribute(k){return k in this.attrs||(k.startsWith('data-')&&k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()) in this.dataset);}
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
 a.ok(read('index.html').includes('knowledge-map.js?v=knowledge-map-v2'));
});

test('detail reveal adds a small gap to root header scroll-padding at desktop and narrow widths',()=>{
 const css=read('knowledge-map.css'),shell=read('site.css');
 const detailRules=[...css.matchAll(/(?:^|})\s*\.map-detail\{([^}]*)\}/gm)].map(m=>m[1]);
 const offsets=detailRules.flatMap(rule=>[...rule.matchAll(/scroll-margin-top:([^;}]*)/g)].map(m=>m[1]));
 a.deepEqual(offsets,['16px','16px']);
 a.match(shell,/html\{scroll-padding-top:110px/);
 a.match(shell,/@media\(max-width:700px\)\{html\{scroll-padding-top:150px/);
 a.match(css,/@media\(max-width:600px\)[\s\S]*?\.map-detail\{padding:22px 20px;scroll-margin-top:16px\}/);
 const html=read('index.html');a.ok(html.includes('knowledge-map.css?v=knowledge-map-v2'));
 a.ok(html.includes('knowledge-map.js?v=knowledge-map-v2'));
});
