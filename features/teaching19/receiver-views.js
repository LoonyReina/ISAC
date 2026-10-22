/* View-only disclosure. Original result nodes, current text, hidden state and numerical listeners are never cloned or rewritten. */
(function(global){'use strict';
const AD_PRIMARY={range:'ad-secondary',moose:'ad-secondary',map:'ad-map',channel:'ad-line',observation:'ad-line',phase:'ad-line',acquisition:'ad-line',detection:'ad-line',frequency:'ad-line',boundary:'ad-line',alias:'ad-line',evaluate:'ad-line',record:null};
function stageFor(step){const s=step.stageSelector||step.revealSelector||step.focusSelector||'';const m=s.match(/\[data-stage=["']?([^"'\]]+)/);return m?m[1]:null;}
function installReceiverViews(doc,lesson){
 if(['ofdm-passive-atomic-errors-2017','channels-sensing-communication-mapping-2026','supplement-case-pilot','supplement-case-clock'].includes(lesson.id))return installCompactReceiverViews(doc,lesson);
 if(lesson.id!=='80211ad')return installGroupViews(doc,lesson);
 const query=s=>{const a=doc.querySelectorAll(s);if(a.length!==1)throw Error('AD view target must be unique: '+s);return a[0];};
 const stage=query('.ad-stage'),strip=query('.ad-result-strip'),figures={};for(const id of ['ad-line','ad-secondary','ad-map'])figures[id]=query('#'+id).closest('figure');
 const summary=query('#ad-stage-summary'),caveat=query('#ad-stage-caveat'),current=query('#ad-current-label'),gates=query('#ad-gates');
 const stageNodes=Array.from(stage.childNodes),stripNodes=Array.from(strip.childNodes);let active=false,markers=[],lastStage='range';
 const shortBoundary=doc.createElement('p');shortBoundary.className='ad-warning gl-read-boundary';shortBoundary.textContent=lesson.shortReadBoundary||'';
 const detail=(label,cls)=>{const d=doc.createElement('details');d.className=cls;const s=doc.createElement('summary');s.textContent=label;d.append(s);return d;};
 const more=detail('展开该步其他真实图、完整解释和数组','gl-receiver-more'),receipt=detail('查看本次观测身份、完整资源与配置','gl-receiver-receipt');
 function save(nodes){for(const node of nodes){const marker=doc.createComment('receiver-view-original');node.before(marker);markers.push({node,marker});}}
 function revealAnchor(){const hash=doc.defaultView?.location?.hash;if(!hash)return;let target;try{target=doc.querySelector(hash);}catch{return;}if(!target)return;for(let p=target.parentElement;p;p=p.parentElement){if(p===more||p===receipt)p.open=true;}if((more.contains?.(target)||receipt.contains?.(target))&&target.scrollIntoView)target.scrollIntoView({block:'nearest'});}
 function guide(){if(active)return;active=true;save(stageNodes);save(stripNodes);for(const node of stageNodes)more.append(node);for(const node of stripNodes)receipt.append(node);strip.append(current,gates,receipt);stage.append(more);layout(lastStage);doc.defaultView?.addEventListener('hashchange',revealAnchor);revealAnchor();}
 function layout(name){lastStage=name||lastStage;const primary=figures[AD_PRIMARY[lastStage]];
  // Move only, never set hidden=false: a missing/failed native plot remains missing.
  for(const f of Object.values(figures))more.append(f);
  if(primary)stage.insertBefore(primary,more);
  stage.insertBefore(summary,more);
  if(lastStage==='range'&&lesson.shortReadBoundary){more.append(caveat);stage.insertBefore(shortBoundary,more);}else{shortBoundary.remove();stage.insertBefore(caveat,more);}
  more.open=false;receipt.open=false;
 }
 function show(step){guide();const name=stageFor(step);layout(name||lastStage);}
 function restore(){if(!active)return;doc.defaultView?.removeEventListener('hashchange',revealAnchor);for(const {node,marker}of markers)marker.replaceWith(node);markers=[];shortBoundary.remove();more.remove();receipt.remove();active=false;}
 guide();return {show,restore,guide,get primaryStage(){return lastStage;}};
}
// Four source-bound layouts. All folds stay within original parent; markers restore exact order.
function installCompactReceiverViews(doc,lesson){
 const q=s=>doc.querySelector(s),all=s=>Array.from(doc.querySelectorAll(s));
 const records=[],styles=[],details=[];let active=false,lastStep=null;
 const contains=(a,b)=>a===b||!!a.contains?.(b);
 const findSelected=step=>[...(step.viewSelectors||[]),...(step.viewMetrics||[])].map(q).filter(Boolean);
 function createFold(parent,members,mode='selected',always=[]){
  if(!parent||!members.length)return;
  if(members.some(n=>n.parentElement!==parent))throw Error('Unsafe compact receiver parent');
  records.push({parent,members:[...members],mode,always,markers:[],more:null});
 }
 function children(parent,always=[]){if(parent)createFold(parent,Array.from(parent.children),'selected',always);}
 function receipt(node,keep=[]){if(node)createFold(node,Array.from(node.children),'receipt',keep);}
 function style(node,values){if(node)styles.push({node,old:node.getAttribute('style'),values});}
 const id=lesson.id;
 if(id==='ofdm-passive-atomic-errors-2017'){
  const timing=q('#ar-timing');if(timing)createFold(timing.parentElement,[timing],'receipt');
  const root=q('#ar-results'),sections=Array.from(root.children).filter(n=>n.tagName==='SECTION');
  createFold(root,sections,'primary');
  for(const s of sections)children(s,[...s.querySelectorAll('.ar-inspect-controls'),q('#ar-inspection-status'),q('#ar-dual-summary')].filter(Boolean));
  const charts=q('.ar-chart-grid');if(charts)createFold(charts,Array.from(charts.children));
  style(q('#ar-matrices'),{gridTemplateColumns:'repeat(4,minmax(0,1fr))'});
  for(const svg of all('#ar-matrices svg'))style(svg,{height:'160px',width:'100%'});
  const input=q('#ar-input-summary');if(input)createFold(input.parentElement,[input],'receipt');
 }else if(id==='channels-sensing-communication-mapping-2026'){
  const root=q('#results'),cards=Array.from(root.children);createFold(root,cards,'primary',[q('#branch-note'),q('#metric-footnote')].filter(Boolean));
  for(const card of cards)children(card,[...card.querySelectorAll('.display-options,.legend'),q('#branch-note'),q('#metric-footnote'),...card.querySelectorAll('label,select')].filter(Boolean));
  style(q('#map'),{height:'260px',width:'100%',minHeight:'0',maxHeight:'260px'});
 }else if(id==='supplement-case-pilot'){
  const panels=lesson.ui.readSelectors.map(q).filter(Boolean),parent=panels[0]?.parentElement;
  createFold(parent,panels,'primary',[q('#pp-calibration-status'),q('#pp-calibration-binding')].filter(Boolean));
  for(const panel of panels)children(panel,[...panel.querySelectorAll('label'),q('#pp-calibration-status'),q('#pp-calibration-binding')].filter(Boolean));
 }else if(id==='supplement-case-clock'){
  receipt(q('.ns-strip'),[q('#ns-current'),q('#ns-state-warning')].filter(Boolean));
  const stage=q('section[aria-labelledby="ns-stage-title"]');children(stage,[q('#ns-caveat')].filter(Boolean));
  const plots=q('.ns-plots');if(plots)createFold(plots,Array.from(plots.children));
 }
 function openHash(){const hash=doc.defaultView?.location?.hash;if(!hash)return;let target;try{target=q(hash);}catch{return;}if(!target)return;for(let p=target.parentElement;p;p=p.parentElement)if(details.includes(p))p.open=true;}
 function guide(){if(active)return;active=true;for(const r of records){const d=doc.createElement('details'),summary=doc.createElement('summary');d.className='gl-receiver-more';summary.textContent=r.mode==='receipt'?'本次完整身份与计算记录':'其他真实结果、原控件与完整说明';d.append(summary);r.more=d;details.push(d);r.markers=r.members.map(node=>{const m=doc.createComment('compact-receiver-original');node.before(m);return m;});r.parent.append(d);}for(const s of styles)Object.assign(s.node.style,s.values);doc.defaultView?.addEventListener('hashchange',openHash);if(lastStep)show(lastStep);}
 function show(step){
  // The normalizer may omit failure view fields; recover only authored result bindings.
  if(step.role==='failure'){const f=lesson.oneFailureCase||{};step={...step,viewSelectors:step.viewSelectors?.length?step.viewSelectors:f.viewSelectors||[],viewMetrics:step.viewMetrics?.length?step.viewMetrics:f.viewMetrics||f.readSelectors||[]};}
  const selected=findSelected(step);if(!selected.length)return; // Deliberately preserve prior layout, never fold every failure result.
  lastStep=step;if(!active){guide();return;}
  for(const r of records){const targets=selected;
   r.members.forEach((node,i)=>{const keep=r.always.some(x=>contains(node,x))||(r.mode!=='receipt'&&targets.some(x=>contains(node,x)||contains(x,node)));
    if(keep)r.markers[i].after(node);else r.more.append(node);
   });r.more.hidden=!r.members.some(node=>node.parentElement===r.more);r.more.open=false;
  }openHash();
 }
 function restore(){if(!active)return;doc.defaultView?.removeEventListener('hashchange',openHash);for(const r of records){r.members.forEach((n,i)=>r.markers[i].replaceWith(n));r.more.remove();r.markers=[];r.more=null;}for(const s of styles){if(s.old===null)s.node.removeAttribute('style');else s.node.setAttribute('style',s.old);}details.length=0;active=false;}
 guide();return {show,restore,guide};
}

// Other receiver pages use authored viewSelectors. Only whole original groups are relocated.
function installGroupViews(doc,lesson){
 const definitions=lesson.ui?.viewGroups;if(!definitions?.length)return {show(){},restore(){},guide(){}};
 const query=s=>{const a=doc.querySelectorAll(s);if(a.length!==1)throw Error('Receiver view group not unique: '+s);return a[0];};
 const groups=definitions.map(x=>({key:x.selector,node:query(x.selector)})),host=groups[0].node.parentElement;
 const more=doc.createElement('details');more.className='gl-receiver-more';const title=doc.createElement('summary');title.textContent='其他真实图与完整诊断';more.append(title);let active=false,marks=[],selection=null;
 function guide(){if(active)return;active=true;for(const g of groups){const marker=doc.createComment('receiver-group-original');g.node.before(marker);marks.push({node:g.node,marker});}host.append(more);}
 function show(step){guide();const wanted=step.viewSelectors||[];if(!wanted.length)return;selection=wanted;for(const g of groups){if(wanted.includes(g.key)){const m=marks.find(m=>m.node===g.node);m.marker.after(g.node);}else more.append(g.node);}more.open=false;}
 function restore(){if(!active)return;for(const m of marks)m.marker.replaceWith(m.node);marks=[];more.remove();active=false;}
 return {show,restore,guide};
}
const api={installReceiverViews,installCompactReceiverViews,stageFor,AD_PRIMARY};if(typeof module==='object'&&module.exports)module.exports=api;else global.ReceiverGuidedViews=api;
})(globalThis);
