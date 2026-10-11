/* Progressive enhancement only: lessons and native disclosures work without this file. */
(() => {
'use strict';
const map=document.getElementById('knowledge-map');
if(!map)return;
const panel=document.getElementById('map-detail'),form=map.querySelector('.map-tools'),query=document.getElementById('map-search'),status=document.getElementById('map-status'),results=document.getElementById('map-search-results');
const groups=[...map.querySelectorAll('.map-group')],entries=[...map.querySelectorAll('[data-map-entry]')];
const lessons=[...(document.getElementById('map-lesson-search')?.content?.querySelectorAll('[data-map-unit]')||[])];
let selected='',origin=null,changing=false;
const normalize=value=>value.trim().toLocaleLowerCase();
const entryFor=id=>entries.find(e=>e.dataset.mapEntry===id);
function activateButtons(root){root.querySelectorAll('[data-map-node],[data-map-filter]').forEach(b=>{b.hidden=false;});}
function render(id,focus=false){
 const entry=entryFor(id),template=document.getElementById(entry?'map-template-'+id:'map-overview');
 selected=entry?id:'';panel.replaceChildren(template.content.cloneNode(true));
 panel.querySelector('h3').id='map-detail-title';activateButtons(panel);
 changing=true;
 for(const g of groups){const match=Boolean(entry)&&g.dataset.mapGroup===entry.dataset.mapGroup;g.open=match;g.dataset.selected=String(match);}
 changing=false;
 if(focus){panel.focus({preventScroll:true});panel.scrollIntoView({block:'start',behavior:'auto'});}
}
function route(hash){let value;try{value=decodeURIComponent(hash.slice(1));}catch{return {invalid:true};}
 const entry=entries.find(e=>e.id===value);if(entry)return {entry};
 const group=groups.find(g=>g.id===value);if(group)return {group};
 return {invalid:value.startsWith('map-')};
}
function push(hash){if(location.hash!==hash)history.pushState(null,'',hash);}
function choose(id,control){const e=entryFor(id);if(!e){status.textContent='这个概念暂未收录，请返回全景选择主题。';return;}
 origin=control||origin;render(id,true);push('#'+e.id);status.textContent='已选择：'+e.querySelector('a').textContent;
}
function reset(focus=true){const back=origin,backGroup=back?.closest('.map-group');query.value='';results.replaceChildren();results.hidden=true;status.textContent='';render('');push('#knowledge-map');origin=null;if(focus)(backGroup?backGroup.querySelector('summary'):back&&back.isConnected?back:query).focus();}
function search(){const q=normalize(query.value);results.replaceChildren();results.hidden=!q;if(!q){status.textContent='';return;}
 const direct=lessons.filter(e=>normalize(e.textContent).includes(q));
 // Exact lesson names lead partial names; the permanent map and relation order stay put.
 direct.sort((a,b)=>Number(normalize(b.textContent)===q)-Number(normalize(a.textContent)===q));
 const matches=entries.filter(e=>normalize(e.dataset.mapSearch).includes(q));
 function result(control,title,type){const li=document.createElement('li'),label=document.createElement('span'),kind=document.createElement('small');label.textContent=title;kind.textContent=type;control.append(label,kind);li.append(control);results.append(li);}
 for(const e of direct){const link=document.createElement('a');link.setAttribute('href',e.getAttribute('href'));link.dataset.mapUnit=e.dataset.mapUnit;result(link,e.textContent,'课程入口 · 直接打开');}
 for(const e of matches){const button=document.createElement('button'),g=groups.find(g=>g.dataset.mapGroup===e.dataset.mapGroup);button.type='button';button.dataset.mapNode=e.dataset.mapEntry;button.setAttribute('aria-controls','map-detail');result(button,e.querySelector('a').textContent,(e.dataset.mapKind==='direction'||e.dataset.mapEntry.startsWith('direction:')?'研究方向':'概念关系')+' · '+g.querySelector('.map-group-name').textContent+' · 查看关系');}
 const count=direct.length+matches.length;
 status.textContent=count?`找到 ${count} 个入口（${direct.length} 个课程入口，${matches.length} 个概念或方向）；四阶段路线仍在下方。`:'没有匹配的概念、课程或方向。试试“相位”“导频”，或清除搜索。';
}
map.addEventListener('click',event=>{const target=event.target.closest('button');if(!target)return;
 if(target.hasAttribute('data-map-node'))choose(target.dataset.mapNode,target);
 if(target.hasAttribute('data-map-reset'))reset();
 if(target.hasAttribute('data-map-filter')){const type=target.dataset.mapFilter;let count=0;panel.querySelectorAll('[data-map-relation]').forEach(row=>{row.hidden=type!=='all'&&row.dataset.mapRelation!==type;if(!row.hidden)count++;});panel.querySelectorAll('[data-map-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===target)));panel.querySelector('[data-map-relation-status]').textContent=`显示 ${count} 条${target.textContent}；这是教学导航关系。`;}
});
map.addEventListener('keydown',event=>{if(event.key==='Escape'&&(selected||query.value||groups.some(g=>g.open))){event.preventDefault();reset();}});
// Use the native toggle event; Enter/Space and pointer share the same behavior.
groups.forEach(group=>group.addEventListener('toggle',()=>{
 if(changing||!group.open)return;
 const e=entryFor(selected);if(e&&e.dataset.mapGroup===group.dataset.mapGroup)return;
 changing=true;groups.forEach(g=>{if(g!==group){g.open=false;g.dataset.selected='false';}});changing=false;
 origin=group.querySelector('summary');selected='';panel.replaceChildren(document.getElementById('map-overview').content.cloneNode(true));panel.querySelector('h3').id='map-detail-title';group.dataset.selected='true';
 push('#'+group.id);
}));
query.addEventListener('input',search);
form.addEventListener('submit',event=>{event.preventDefault();search();});
form.addEventListener('reset',event=>{event.preventDefault();query.value='';search();query.focus();});
function restore(){const state=route(location.hash);if(state.entry){render(state.entry.dataset.mapEntry);status.textContent='已恢复：'+state.entry.querySelector('a').textContent;}else{render('');if(state.group){state.group.open=true;state.group.dataset.selected='true';}status.textContent=state.invalid?'这个地图位置暂未收录，已返回全景。':'';}}
window.addEventListener('hashchange',restore);window.addEventListener('popstate',restore);
activateButtons(map);form.hidden=false;restore();
})();
