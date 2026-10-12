// Local progressive filtering only; native links/disclosures remain the source.
(()=>{
'use strict';
const root=document.querySelector('[data-research-guides]');
if(!root||root.dataset.guidesReady==='true')return;
const form=root.querySelector('[data-guide-controls]'),direction=root.querySelector('[data-guide-direction-select]'),query=root.querySelector('[data-guide-query]'),count=root.querySelector('[data-guide-count]'),empty=root.querySelector('[data-guide-empty]');
const cards=[...root.querySelectorAll('[data-research-guide]')],groups=[...root.querySelectorAll('[data-guide-group]')];
if(!form||!direction||!query||!count||!empty||!cards.length||!groups.length||cards.some(c=>!c.dataset.guideSearch||!groups.some(g=>g.dataset.guideGroup===c.dataset.guideDirection)))return;
function filter(){
 const words=query.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 let visible=0;
 for(const card of cards){const match=(!direction.value||card.dataset.guideDirection===direction.value)&&words.every(w=>card.dataset.guideSearch.toLocaleLowerCase().includes(w));card.hidden=!match;if(match)visible++;}
 for(const group of groups)group.hidden=!cards.some(c=>c.dataset.guideDirection===group.dataset.guideGroup&&!c.hidden);
 count.textContent=`显示 ${visible} / ${cards.length} 篇原文导读（不计入实验或案例）`;
 empty.hidden=visible!==0;
}
// Native deep links must never land on a card hidden by a previous filter.
// Read only the hash; do not replace history, force focus or scroll the page.
const targets=new Map(groups.map(g=>[g.id,g.dataset.guideGroup]));
cards.forEach(c=>targets.set(c.id,c.dataset.guideDirection));
function reveal(hash){
 let target;try{target=decodeURIComponent(hash.slice(1));}catch{return;}
 if(!targets.has(target))return;
 direction.value=targets.get(target);query.value='';filter();
}
form.addEventListener('submit',event=>event.preventDefault());
direction.addEventListener('change',filter);query.addEventListener('input',filter);
form.addEventListener('reset',()=>{direction.value='';query.value='';filter();});
for(const anchor of document.querySelectorAll('a[href]')){
 const href=anchor.getAttribute('href');
 if(href&&href.startsWith('#')&&targets.has(href.slice(1)))anchor.addEventListener('click',event=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;reveal(href);});
}
window.addEventListener('hashchange',()=>reveal(window.location.hash));
window.addEventListener('pageshow',filter);
root.dataset.guidesReady='true';form.hidden=false;filter();reveal(window.location.hash);
})();
