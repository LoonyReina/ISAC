(function(){'use strict';
// Presentation-only labels; complete questions and paper titles remain in details, search and the semantic directory.
const SKY_LABELS=Object.freeze({
  "otfs-joint-estimation-2020": [
    "如何同帧通感？",
    "OTFS 联合估计"
  ],
  "otfs-sensing-assisted-2021": [
    "回波如何助通信？",
    "OTFS 感知辅助"
  ],
  "nearfield-double-array-ispac": [
    "收发如何兼顾定位？",
    "双阵列 ISPAC"
  ],
  "nearfield-multitarget-correlation": [
    "多目标怎样共同照亮？",
    "近场多目标波束"
  ],
  "networks-cooperative-clusters-2024": [
    "协作规模为何有限？",
    "协作感知与通信"
  ],
  "cellfree-vq-compression-2026": [
    "少传数据怎样测准？",
    "无小区定位与测速"
  ],
  "bistatic-ofdm-clock-measurement-2023": [
    "同步误差如何累积？",
    "双站 OFDM 原型"
  ],
  "mimo-ofdm-realtime-testbed-2023": [
    "实时处理卡在哪里？",
    "实时 MIMO 原型"
  ],
  "isac-net-model-driven-passive": [
    "感知能帮忙纠错吗？",
    "ISAC-NET"
  ],
  "multimodal-transformer-beam-generalization": [
    "换个场景还能预测？",
    "多模态波束预测"
  ],
  "ofdm-ici-aware-receiver-2021": [
    "载波干扰怎样测速？",
    "高速 OFDM 接收机"
  ],
  "ofdm-passive-atomic-errors-2017": [
    "错符号怎样不误检？",
    "被动 OFDM 离格估计"
  ],
  "channels-shared-clusters-2024": [
    "两类信道为何相关？",
    "共享散射簇"
  ],
  "channels-target-environment-coupling-2025": [
    "目标怎样改变背景？",
    "目标与环境耦合"
  ],
  "tradeoffs-feedback-capacity-distortion-2018": [
    "速率与失真如何权衡？",
    "反馈容量–失真"
  ],
  "tradeoffs-causal-state-communication-2013": [
    "状态信息如何传递？",
    "因果状态通信"
  ],
  "channels-sensing-communication-mapping-2026": [
    "环境怎样预测路径？",
    "感知到通信映射"
  ],
  "zak-otfs-semiblind-offgrid-2026": [
    "未知数据怎样找目标？",
    "半盲离格 OTFS"
  ],
  "sbfd-resource-synchronization-2026": [
    "频带分开就能测准？",
    "SBFD 多站同步"
  ],
  "nearfield-mechanism-aware-mapping-2026": [
    "孔径各处看见什么？",
    "近场环境映射"
  ],
  "optimal_waveform": [
    "方向图相同就够吗？",
    "最优联合波形"
  ],
  "joint_beamforming": [
    "为何加入独立雷达流？",
    "联合发射波束成形"
  ],
  "mu_mimo": [
    "阵列分开会失去什么？",
    "分离与共享阵列"
  ],
  "crb": [
    "通信门槛影响估计界？",
    "CRB 波束优化"
  ],
  "80211ad": [
    "训练序列如何测距？",
    "802.11ad 车载雷达"
  ],
  "ofdm_full_duplex": [
    "补格就是新观测吗？",
    "全双工 OFDM 雷达"
  ],
  "perceptive": [
    "去背景为何伤慢目标？",
    "感知移动网络"
  ],
  "deepsense": [
    "多模态数据怎样复用？",
    "DeepSense 6G"
  ],
  "radar_prediction": [
    "猜中波束就够了吗？",
    "雷达辅助波束预测"
  ],
  "supplement-case-crb": [
    "同功率就有同估计界？",
    "随机信号估计界"
  ],
  "supplement-case-pilot": [
    "少些样本何时有益？",
    "二维 OFDM 导频"
  ],
  "supplement-case-clock": [
    "时钟差会偏多少？",
    "联合时钟同步"
  ],
  "supplement-case-near-field": [
    "同方向怎样分远近？",
    "近场角距分辨"
  ],
  "supplement-case-multipath-channel": [
    "为何收到多条路径？",
    "多径与反射孔径"
  ],
  "supplement-case-distributed-detection": [
    "两个功率数够检测吗？",
    "多基地检测"
  ]
});
function mount(root,data){
const M=window.ISACResearchTreeModel;M.validate(data);const host=root.querySelector('[data-tree-app]'),fallback=root.querySelector('.rt-fallback');if(!host)return;
const scene=M.scene(data),papers=new Map(data.papers.map(p=>[p.id,p])),nodes=new Map(scene.nodes.map(n=>[n.id,n]));
const snapshot='papers-'+data.papers.map(p=>p.id+':'+p.source+':'+p.status+':'+p.tutorials.map(t=>t.href).join(',')).join('|').split('').reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261).toString(16);
const state={query:'',searchScope:'all',direction:'networks',expanded:new Set(scene.nodes.filter(n=>n.kind!=='paper').map(n=>n.id)),selected:null,selectedInstance:null,detailOpen:false,flat:window.matchMedia('(max-width: 700px)').matches,camera:M.defaultCamera(),cameraOwner:'preset',activeTree:'direction:networks',keyboardCamera:false,intentRevision:0,cameraRevision:0};
let frame=null,animation=null,drawCount=0,composing=false,destroyed=false,graphAvailable=true,projected=[],placed=[],hiddenLabels=[],lastPositions=new Map(),pointers=new Map(),gesture=null,doubleToken=null,lastPointer=null,lastPick=null,frameRevision=0,lastNavRevision=0,navigationFrame=null;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),metricCache=new Map();
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,fn,cls)=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
const controls=el('div','rt-controls'),searchLabel=el('label','rt-search','搜索论文'),input=el('input');input.type='search';input.placeholder='搜索问题、论文题名或 arXiv 编号';input.autocomplete='off';searchLabel.append(input);
const scopeLabel=el('label','rt-scope','搜索范围'),scope=el('select');for(const [value,text] of [['all','全站 '+data.papers.length+' 篇'],['direction','当前方向']]){const o=el('option','',text);o.value=value;scope.append(o);}scopeLabel.append(scope);
const mode=button('列表',()=>setMode(!state.flat),'rt-mode'),clear=button('清除筛选',()=>{interrupt();state.query='';input.value='';state.direction='';direction.value='';state.searchScope='all';scope.value='all';refresh();save();});controls.append(searchLabel,scopeLabel,mode,clear);
const toolbar=el('div','rt-toolbar'),directionLabel=el('label','rt-direction-label','研究方向'),direction=el('select');const all=el('option','','全部方向');all.value='';direction.append(all);for(const d of data.directions){const o=el('option','',d.title.split('：')[0]+' · '+data.papers.filter(p=>p.directionIds.includes(d.id)).length);o.value=d.id;direction.append(o);}direction.value=state.direction;directionLabel.append(direction);const stats=el('p','rt-stats',data.papers.length+' 篇论文 · '+data.directions.length+' 个方向');toolbar.append(directionLabel,stats);
const live=el('p','rt-status');live.setAttribute('role','status');live.setAttribute('aria-live','polite');const results=el('div','rt-results');results.hidden=true;
const board=el('div','rt-board'),viewport=el('div','rt-viewport'),canvas=el('canvas','rt-canvas');canvas.tabIndex=0;canvas.setAttribute('aria-label','可拖动的三维论文星图。每颗星对应研究方向、问题或论文；拖动旋转，滚轮缩放。完整题名和问题也可在下方键盘目录阅读。');canvas.setAttribute('aria-describedby','rt-camera-help');canvas.setAttribute('role','img');const skyStage=el('div','rt-sky-stage'),stargazer=el('div','rt-stargazer');stargazer.setAttribute('aria-hidden','true');
stargazer.innerHTML=`<svg viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
  <path d="M0 158 Q48 143 93 148 Q140 151 200 168 L200 170 H0Z" fill="#08131e"/>
  <path d="M14 157 Q53 147 86 150" fill="none" stroke="#4e7285" stroke-opacity=".3"/>
  <path d="M72 112 Q69 123 61 137 L54 143 Q52 146 57 147 L67 144 L83 121Z" fill="#142538"/>
  <path d="M78 107 Q91 105 98 114 L110 132 L129 142 Q133 147 126 150 L102 142 L87 128 L75 131Z" fill="#132337"/>
  <path d="M78 115 Q97 110 109 123 L117 145 L134 148 Q138 150 134 154 L113 154 Q106 152 105 146 L99 135 L79 139 Q68 133 71 123Z" fill="#0a1725"/>
  <path d="M80 85 Q69 91 66 109 L65 130 Q79 139 94 131 L94 110 Q92 97 88 92Z" fill="#193047"/>
  <path d="M81 87 Q72 91 69 103" fill="none" stroke="#6b91a5" stroke-opacity=".55" stroke-width="1.2"/>
  <path d="M86 90 L92 102 L99 117 L92 123 L83 106 L78 99Z" fill="#1e374d"/>
  <path d="M96 116 L103 122 Q106 125 101 127 L94 124 L92 122Z" fill="#738894"/>
  <path d="M81 85 L85 78 L93 80 L89 93Z" fill="#758b98"/>
  <path d="M76 65 Q82 52 94 57 Q102 60 100 70 L105 73 L100 77 Q100 84 93 86 Q83 86 77 77Z" fill="#8ba2ae" transform="rotate(-20 89 71)"/>
  <path d="M76 76 Q69 64 78 56 Q88 46 99 54 L104 61 Q96 60 91 66 L86 74 L80 80Z" fill="#111e2e" transform="rotate(-20 89 71)"/>
  <path d="M77 56 Q87 49 97 54" fill="none" stroke="#9ebac6" stroke-opacity=".65" stroke-width="1.2" transform="rotate(-20 89 71)"/>
  <path d="M79 86 Q84 90 92 88 L93 94 Q85 97 77 91Z" fill="#c9ac7d"/>
  <path d="M79 90 Q69 91 60 86 L64 94 Q71 98 79 95Z" fill="#b69a6f"/>
  <path d="M34 153 L32 145 M40 152 L43 141 M151 159 L155 148 M157 161 L163 154" stroke="#294353" stroke-width="1"/>
</svg>`;skyStage.append(stargazer,canvas);viewport.append(skyStage);
const graphFooter=el('div','rt-graph-footer'),hint=el('p','rt-hint','拖动旋转 · 滚轮缩放 · 点击选择');hint.id='rt-camera-help';
const reset=button('复位视角',()=>{interrupt();state.cameraOwner='preset';moveCamera(globalPose());save();});
const refocus=button('重新定位所选',()=>{const n=nodes.get(state.selectedInstance);if(n){interrupt();focusNode(n);}});refocus.disabled=true;
const overlap=button('重叠节点',()=>showOverlap());const cameraKey=button('键盘调视角',()=>{state.keyboardCamera=!state.keyboardCamera;cameraKey.textContent=state.keyboardCamera?'退出视角控制':'键盘调视角';hint.textContent=state.keyboardCamera?'方向键旋转 · + / − 缩放 · Esc 退出':'拖动旋转 · 滚轮缩放 · 点击选择';canvas.focus();});
const toList=button('返回列表',()=>setMode(true),'rt-mobile-return');graphFooter.append(hint,reset,refocus,overlap,cameraKey,toList);viewport.append(graphFooter);
const overlapPanel=el('div','rt-overlap');overlapPanel.hidden=true;viewport.append(overlapPanel);
const detail=el('aside','rt-detail');detail.setAttribute('aria-label','所选论文');board.append(viewport,detail);
const legend=el('p','rt-legend','亮星：研究方向　◇ 问题　· 论文　｜　星座连线仅表示主题归属；位置、亮度与大小不表示引用、继承或学术价值');
const treeDisclosure=el('details','rt-keyboard-directory'),treeSummary=el('summary','','用键盘浏览方向、问题与论文'),tree=el('div','rt-semantic-tree');tree.setAttribute('role','tree');tree.setAttribute('aria-label','论文研究方向目录');treeDisclosure.append(treeSummary,tree);
host.append(controls,toolbar,live,results,board,legend,treeDisclosure);
const ctx=canvas.getContext('2d');if(!ctx){graphAvailable=false;state.flat=true;}
function allowedPapers(){return M.search(data,state.query,state.searchScope==='direction'?state.direction:'');}
function viewportSize(){const r=canvas.getBoundingClientRect();return {width:Math.max(260,r.width||viewport.clientWidth||900),height:Math.max(260,r.height||620)};}
function globalPose(){const fallback=M.fit(scene.nodes,viewportSize(),-24,17);if(!ctx)return fallback;for(const yaw of [-24,6,-54,36,-84,66])for(const pitch of [17,0,30,-30]){const pose=M.fit(scene.nodes,viewportSize(),yaw,pitch),f=buildFrame(pose,new Map());if(data.directions.every(d=>f.labels.some(l=>l.id==='direction:'+d.id)))return pose;}return fallback;}
function interrupt(){state.intentRevision++;animation=null;doubleToken=null;if(frame!==null){cancelAnimationFrame(frame);frame=null;}}
function save(){if(destroyed)return;const u=new URL(window.location.href);for(const key of ['tree-paper','tree-direction'])u.searchParams.delete(key);const vals={rtv:'2',rtq:state.query,rtd:state.direction,rts:state.selected||'',rtm:state.flat?'list':'graph'};Object.entries(vals).forEach(([k,v])=>v?u.searchParams.set(k,v):u.searchParams.delete(k));const snapshotState={schemaVersion:2,dataSnapshotId:snapshot,layoutVersion:scene.layoutVersion,query:state.query,searchScope:state.searchScope,directionFilter:state.direction,expandedInstanceIds:[...state.expanded],selectedCanonicalPaperId:state.selected,selectedInstanceId:state.selectedInstance,selectedPath:state.selectedInstance?[nodes.get(state.selectedInstance)?.parentId,state.selectedInstance]:[],viewMode:state.flat?'list':'graph',detailOpen:state.detailOpen,camera:state.camera,cameraOwner:state.cameraOwner,focusInstanceId:state.activeTree,originAnchor:window.location.hash,pageScroll:[window.scrollX,window.scrollY]};try{window.history.replaceState({...window.history.state,isacResearchTreeV2:snapshotState},'',u);}catch{}}
function restore(useHistory=true){interrupt();const u=new URL(window.location.href),stored=useHistory?window.history.state?.isacResearchTreeV2:null,compatible=stored?.schemaVersion===2&&stored.dataSnapshotId===snapshot&&stored.layoutVersion===scene.layoutVersion;state.query=stored?.query??u.searchParams.get('rtq')??'';state.direction=stored?.directionFilter??u.searchParams.get('rtd')??u.searchParams.get('tree-direction')??'networks';if(!data.directions.some(d=>d.id===state.direction))state.direction='';state.searchScope=stored?.searchScope==='direction'?'direction':'all';state.selected=stored?.selectedCanonicalPaperId??u.searchParams.get('rts')??u.searchParams.get('tree-paper');if(!papers.has(state.selected))state.selected=null;state.selectedInstance=compatible&&nodes.has(stored.selectedInstanceId)?stored.selectedInstanceId:state.selected?instanceFor(state.selected).id:null;state.detailOpen=stored?Boolean(stored.detailOpen&&state.selected):Boolean(state.selected);state.flat=graphAvailable?(stored?stored.viewMode==='list':u.searchParams.has('rtm')?u.searchParams.get('rtm')==='list':state.flat):true;if(compatible){state.expanded=new Set(stored.expandedInstanceIds.filter(id=>nodes.has(id)));state.camera=M.sanitizeCamera(stored.camera);state.cameraOwner=stored.cameraOwner||'preset';state.activeTree=nodes.has(stored.focusInstanceId)?stored.focusInstanceId:'direction:networks';}else state.camera=globalPose();input.value=state.query;direction.value=state.direction;scope.value=state.searchScope;refresh();if(stored&&!compatible)live.textContent='内容或布局已更新，视角已重新定位';return compatible?stored:null;}
function instanceFor(id){const p=papers.get(id),d=p.directionIds.includes(state.direction)?state.direction:data.directions.find(d=>p.directionIds.includes(d.id)).id;return nodes.get('paper:'+d+':'+id);}
function measure(text,kind){const key=kind+':'+text;if(metricCache.has(key))return metricCache.get(key);const size=kind==='direction'?16:kind==='paper'?13:12,font=(kind==='question'?'400':'600')+' '+size+'px system-ui, "Noto Sans CJK SC", sans-serif';ctx.font=font;const max=kind==='paper'?174:kind==='question'?160:152,lines=[];let line='';for(const char of text){if(ctx.measureText(line+char).width>max&&line){lines.push(line);line=char;}else line+=char;}if(line)lines.push(line);const limit=kind==='direction'?2:1;if(lines.length>limit){lines.splice(limit);let last=lines[limit-1];while(ctx.measureText(last+'…').width>max)last=last.slice(0,-1);lines[limit-1]=last+'…';}const metric={lines,width:Math.max(...lines.map(l=>ctx.measureText(l).width)),height:lines.length*(size+6),font};metricCache.set(key,metric);return metric;}
function labelText(n){if(n.kind==='direction')return n.label||data.directions.find(d=>d.id===n.directionId).title.split('：')[0];const label=SKY_LABELS[n.paper.id];return n.kind==='question'?(label?.[0]||'这篇研究什么？'):(label?.[1]||n.paper.shortTitle.split('：')[0]);}
function buildFrame(camera=state.camera,previous=lastPositions){const size=viewportSize(),allowed=new Set(allowedPapers().map(p=>p.id));const ns=scene.nodes.filter(n=>n.kind==='direction'||allowed.has(n.canonicalPaperId)&&state.expanded.has('direction:'+n.directionId)&&(n.kind==='question'||state.expanded.has(n.parentId))).map(n=>{const p=M.project(n.xyz,camera,size);return {...n,...p,radius:n.kind==='direction'?5:n.kind==='question'?2.7:3.2};});const selected=nodes.get(state.selectedInstance),path=new Set(selected?[selected.id,selected.parentId,'direction:'+selected.directionId]:[]);const candidates=ns.filter(n=>n.kind==='direction'||n.directionId===state.direction||path.has(n.id)).sort((a,b)=>((path.has(a.id)?0:state.cameraOwner==='preset'&&a.kind==='direction'?1:a.directionId===state.direction?2:3)-(path.has(b.id)?0:state.cameraOwner==='preset'&&b.kind==='direction'?1:b.directionId===state.direction?2:3))||(a.id===state.selectedInstance?-1:b.id===state.selectedInstance?1:0)).map(n=>({...n,text:labelText(n)}));const lab=M.labels(ns,candidates,measure,size,previous);return {size,ns,...lab};}
function focusNode(n){if(state.flat||!graphAvailable){focusFallback();return;}state.cameraOwner='focus';const targetSets=M.focusTargetSets(scene,n.id),required=n.kind==='paper'?[n.id,n.parentId,'direction:'+n.directionId]:[n.id];let pose=null;const yaws=[0,30,-30,60,-60,90,-90,120,-120,180],pitches=[state.camera.pitch,17,0,30,-30,60,-60];outer:for(const targets of targetSets)for(const dy of yaws)for(const pitch of [...new Set(pitches)])for(const factor of [1,1.15,1.35]){const candidate=M.fit(targets,viewportSize(),state.camera.yaw+dy,pitch);candidate.distance*=factor;const f=buildFrame(candidate,new Map());if(required.every(id=>f.labels.some(l=>l.id===id))){pose=candidate;break outer;}}if(!pose){setMode(true);live.textContent='此角度无法清楚显示，已在列表定位';focusFallback();return;}moveCamera(pose);}
function moveCamera(pose){if(reduced.matches||state.flat){state.camera=pose;state.cameraRevision++;invalidate();save();return;}animation={from:{...state.camera,target:[...state.camera.target]},to:pose,start:performance.now(),revision:state.intentRevision};invalidate();}
function invalidate(){if(destroyed||state.flat||!graphAvailable||frame!==null)return;frame=requestAnimationFrame(renderFrame);}
function renderFrame(now){frame=null;if(destroyed||state.flat||!graphAvailable)return;if(animation){if(animation.revision!==state.intentRevision)animation=null;else{const a=animation,t=Math.min(1,(now-a.start)/420),e=1-(1-t)**3;state.camera={target:a.from.target.map((v,i)=>v+(a.to.target[i]-v)*e),yaw:a.from.yaw+(a.to.yaw-a.from.yaw)*e,pitch:a.from.pitch+(a.to.pitch-a.from.pitch)*e,distance:a.from.distance+(a.to.distance-a.from.distance)*e};state.cameraRevision++;if(t===1){animation=null;save();}}}
const f=buildFrame(),{width,height}=f.size,dpr=Math.min(window.devicePixelRatio||1,2);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);projected=f.ns;placed=f.labels;hiddenLabels=f.hidden;lastPositions=new Map(placed.map(l=>[l.id,l.pos]));
// Constellation segments connect unchanged xyz endpoints. All stars and lines share the real perspective camera.
const shapes=[],visibleIds=new Set(projected.map(n=>n.id));for(const e of scene.edges){if(e.a==='root'||!visibleIds.has(e.b)||!visibleIds.has(e.a))continue;const pts=[e.controlXYZ[0],e.controlXYZ[3]].map(p=>M.project(p,state.camera,f.size)),node=nodes.get(e.b),selected=node.canonicalPaperId===state.selected&&node.directionId===state.direction;if(pts.every(p=>p.visible))shapes.push({kind:'line',points:pts,depth:(pts[0].depth+pts[1].depth)/2,active:node.directionId===state.direction,selected});}
for(const n of projected)if(n.visible)shapes.push({kind:'node',node:n,depth:n.depth});shapes.sort((a,b)=>b.depth-a.depth||(a.kind==='node'?1:-1));
for(const s of shapes){if(s.kind==='line'){ctx.beginPath();ctx.moveTo(s.points[0].x,s.points[0].y);ctx.lineTo(s.points[1].x,s.points[1].y);ctx.strokeStyle=s.selected?'rgba(239,211,155,.8)':s.active?'rgba(190,202,219,.46)':'rgba(113,151,182,.25)';ctx.lineWidth=s.selected?1.2:.75;ctx.stroke();}else{const n=s.node,active=n.directionId===state.direction,selected=n.id===state.selectedInstance,color=selected?'#ffe0a7':active?'#ead5af':'#b4cede';ctx.lineWidth=.9;ctx.fillStyle=color;ctx.beginPath();if(n.kind==='question'){ctx.moveTo(n.x,n.y-n.radius);ctx.lineTo(n.x+n.radius,n.y);ctx.lineTo(n.x,n.y+n.radius);ctx.lineTo(n.x-n.radius,n.y);ctx.closePath();ctx.fillStyle='#101f30';ctx.strokeStyle=active?'#c8b991':'#8bafc5';ctx.fill();ctx.stroke();}else{ctx.shadowColor=color;ctx.shadowBlur=selected?18:n.kind==='direction'?15:9;ctx.arc(n.x,n.y,n.radius,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(n.kind==='direction'||selected){const reach=n.radius+4;ctx.beginPath();ctx.moveTo(n.x-reach,n.y);ctx.lineTo(n.x+reach,n.y);ctx.moveTo(n.x,n.y-reach);ctx.lineTo(n.x,n.y+reach);ctx.strokeStyle=selected?'rgba(255,224,167,.6)':'rgba(180,206,222,.4)';ctx.lineWidth=.7;ctx.stroke();}}if(selected){ctx.beginPath();ctx.arc(n.x,n.y,n.radius+9,0,Math.PI*2);ctx.strokeStyle='rgba(255,218,159,.7)';ctx.lineWidth=1;ctx.stroke();}}}
for(const l of placed){ctx.font=l.font;ctx.textBaseline='top';ctx.fillStyle=l.id===state.selectedInstance?'#ffe0a7':l.kind==='question'?'#b2c1ce':nodes.get(l.id).directionId===state.direction?'#ead5af':'#c2d6e4';ctx.shadowColor='#091421';ctx.shadowBlur=4;const lineHeight=l.height/l.lines.length;l.lines.forEach((line,i)=>ctx.fillText(line,l.x,l.y+i*lineHeight));ctx.shadowBlur=0;}drawCount++;frameRevision++;canvas.dataset.frameRevision=String(frameRevision);if(animation)invalidate();}
function fillDetail(){detail.replaceChildren();refocus.disabled=!state.selected;if(!state.detailOpen||!state.selected){const h=el('h3','','从一颗星开始'),p=el('p','','每个研究方向是一组星座。点击问题或论文，展开完整题名与实验入口；拖动星空，换个角度看。');detail.append(el('p','rt-eyebrow','论文阅读'),h,p,el('p','rt-detail-note','星图只作阅读导航。连线表示主题归属，明暗与远近不代表论文影响力。'));if(state.selected)detail.append(button('打开所选论文',()=>{state.detailOpen=true;fillDetail();save();}));return;}
const p=papers.get(state.selected),close=button('关闭',()=>{interrupt();state.detailOpen=false;fillDetail();save();focusTree(state.selectedInstance);invalidate();},'rt-close');close.setAttribute('aria-label','关闭论文详情');const current=nodes.get(state.selectedInstance),shortTitle=current?labelText(current):p.shortTitle;detail.append(close,el('p','rt-eyebrow','所选论文'),el('h3','rt-paper-title',shortTitle));const status=p.status==='bounded-core'?(p.id==='tradeoffs-causal-state-communication-2013'?'本课：当前状态已知（§IV，p=q=1/4）；下方问题来自严格因果导读':p.id==='networks-cooperative-clusters-2024'?'局部模型实验 · 理论下界，非定位接收机':'含局部模型实验 · 不等于整篇复现'):p.tutorials.some(t=>t.evidenceScope==='bounded-algorithm-lesson')?'有界算法课 · 范围见入口，不是整篇复现':p.status==='adapted-mechanism'?'改编机制 · 论文完整核心未实现':'导读 / 先修机制 · 论文核心未确认';detail.append(el('p','rt-paper-status',status));const primary=p.tutorials[0];if(primary){const a=el('a','rt-primary-entry',primary.evidenceScope==='bounded-algorithm-lesson'?'打开有界算法课':p.status==='bounded-core'?'打开交互实验':primary.kind==='guide'||primary.kind==='directory'?'阅读论文导读':'打开机制与导读');a.href=primary.href;a.title=primary.label;a.setAttribute('aria-label',primary.label);a.dataset.entryKind=primary.kind;detail.append(a);}detail.append(el('h4','','本篇问题'),el('p','rt-question-text',p.question));const evidence=el('details','rt-paper-evidence'),summary=el('summary','','原文与实验范围'),body=el('div');evidence.append(summary,body);body.append(el('p','rt-full-title',p.title));if(p.sourceRecord?.details?.authors)body.append(el('p','rt-source-version',p.sourceRecord.details.authors));const source=el('a','rt-source',p.sourceIdentity||'固定版本原文');source.href=p.source;body.append(source,el('p','rt-source-version',p.fixedVersion||''));const loc=p.sourceRecord?.locators;if(loc)body.append(el('p','rt-locator',typeof loc==='string'?loc:Object.values(loc).join(' · ')));if(!p.tutorials.some(t=>t.scope===p.boundary))body.append(el('h4','','本站实验范围'),el('p','rt-boundary',p.boundary));const links=el('div','rt-links');p.tutorials.forEach(t=>{const a=el('a','',t.label);a.href=t.href;a.dataset.entryKind=t.kind;const group=el('div','rt-entry');group.append(a,el('p','rt-entry-scope',t.scope));links.append(group);});body.append(links,el('p','rt-memberships','归属：'+p.directionIds.map(id=>data.directions.find(d=>d.id===id).title.split('：')[0]).join(' / ')));detail.append(evidence);}

function selectNode(n,origin='explicit'){if(!n)return;const token=origin==='pointer'?doubleToken:null;interrupt();if(token)doubleToken=token;state.activeTree=n.id;state.direction=n.directionId;direction.value=state.direction;state.expanded.add('direction:'+n.directionId);if(n.kind!=='direction'){const paper=n.paper;state.selected=paper.id;state.selectedInstance=n.kind==='paper'?n.id:'paper:'+n.directionId+':'+paper.id;state.expanded.add('question:'+n.directionId+':'+paper.id);state.detailOpen=true;}else{state.selected=null;state.selectedInstance=null;state.detailOpen=false;}refresh();focusNode(nodes.get(state.selectedInstance)||n);save();}
function focusTree(id){const row=[...tree.querySelectorAll('[role="treeitem"]')].find(r=>r.dataset.instanceId===id)||[...tree.querySelectorAll('[role="treeitem"]')].find(r=>r.dataset.instanceId==='direction:'+nodes.get(id)?.directionId)||tree.querySelector('[role="treeitem"]');if(row){treeDisclosure.open=true;row.focus({preventScroll:true});row.scrollIntoView?.({block:'nearest',inline:'nearest'});}}
function focusFallback(){const row=[...fallback.querySelectorAll('[data-paper-id]')].find(r=>r.dataset.paperId===state.selected);(row||fallback.querySelector('summary'))?.focus({preventScroll:true});}
function renderTree(){const focused=document.activeElement?.dataset?.instanceId,allowed=new Set(allowedPapers().map(p=>p.id)),order=M.visibleOrder(scene,state.expanded,allowed);if(!order.some(n=>n.id===state.activeTree))state.activeTree=order.find(n=>n.id===nodes.get(state.activeTree)?.parentId)?.id||order[0]?.id;tree.replaceChildren();for(const n of order){const row=el('div','rt-tree-row');row.setAttribute('role','treeitem');row.setAttribute('aria-level',n.kind==='direction'?'1':n.kind==='question'?'2':'3');row.dataset.instanceId=n.id;row.tabIndex=n.id===state.activeTree?0:-1;if(n.kind!=='paper')row.setAttribute('aria-expanded',String(state.expanded.has(n.id)));else row.setAttribute('aria-selected',String(n.canonicalPaperId===state.selected));row.textContent=(n.kind==='direction'?(state.expanded.has(n.id)?'▾ ':'▸ '):'')+(n.kind==='direction'?data.directions.find(d=>d.id===n.directionId).title:n.kind==='question'?n.paper.question:n.paper.title);row.addEventListener('focus',()=>{state.activeTree=n.id;for(const other of tree.querySelectorAll('[role="treeitem"]'))other.tabIndex=other===row?0:-1;});row.addEventListener('click',()=>selectNode(n));tree.append(row);}if(focused)focusTree(focused);}
function refresh(){const found=allowedPapers();if(state.selected&&!found.some(p=>p.id===state.selected)){state.selected=null;state.selectedInstance=null;state.detailOpen=false;}live.textContent=(state.searchScope==='direction'&&state.direction?'当前方向':'全站')+' · '+found.length+' 篇论文'+(state.query?'匹配“'+state.query+'”':'');results.replaceChildren();results.hidden=!state.query;if(state.query){if(!found.length)results.append(el('p','','没有匹配的论文。请缩短关键词，或清除筛选。'));for(const p of found){const b=button(p.shortTitle,()=>selectNode(instanceFor(p.id)),'rt-search-result');b.title=p.title;b.dataset.paperId=p.id;results.append(b);}}mode.textContent=state.flat?'图谱':'列表';mode.setAttribute('aria-pressed',String(state.flat));mode.disabled=!graphAvailable;board.hidden=state.flat;legend.hidden=state.flat;treeDisclosure.hidden=state.flat;fallback.hidden=!state.flat;fallback.open=state.flat;for(const li of fallback.querySelectorAll('[data-paper-id]'))li.hidden=!found.some(p=>p.id===li.dataset.paperId);fillDetail();renderTree();invalidate();}
function setMode(flat){interrupt();state.flat=flat||!graphAvailable;refresh();save();if(state.flat)focusFallback();else{canvas.focus({preventScroll:true});invalidate();}}
function showOverlap(){interrupt();overlapPanel.replaceChildren();const near=lastPointer?projected.filter(n=>Math.hypot(n.x-lastPointer.x,n.y-lastPointer.y)<44):projected.filter(n=>n.directionId===state.direction&&n.kind==='paper');overlapPanel.append(el('p','','此处的节点'),button('关闭',()=>{overlapPanel.hidden=true;canvas.focus();}));for(const n of near.sort((a,b)=>a.depth-b.depth)){const b=button((n.kind==='direction'?labelText(n):n.paper.shortTitle)+(M.occluded(n,projected)?'（被遮挡，选择后重新定位）':''),()=>{overlapPanel.hidden=true;selectNode(n);});overlapPanel.append(b);}if(!near.length)overlapPanel.append(el('p','','此处没有节点。可使用搜索或键盘目录。'));overlapPanel.hidden=false;overlapPanel.querySelector('button')?.focus();invalidate();}
function queryChanged(){if(composing){state.query=input.value;save();return;}interrupt();state.query=input.value;refresh();save();}
input.addEventListener('compositionstart',()=>{composing=true;});input.addEventListener('compositionend',()=>{composing=false;queryChanged();});input.addEventListener('input',queryChanged);scope.addEventListener('change',()=>{interrupt();state.searchScope=scope.value;refresh();save();});direction.addEventListener('change',()=>{interrupt();state.direction=direction.value;refresh();if(state.direction)focusNode(nodes.get('direction:'+state.direction));save();});
const local=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const p=local(e);lastPointer=p;pointers.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);if(pointers.size===1){const hit=M.pick(projected,placed,p.x,p.y,e.pointerType==='touch');lastPick=hit?{layer:hit.layer,candidates:hit.candidates,winner:hit.node.id,frameRevision}:null;gesture={id:e.pointerId,start:p,last:p,hit:hit?.node?.id,frameRevision,moved:false,type:e.pointerType};}else{interrupt();gesture.moved=true;gesture.pinch=[...pointers.values()];}canvas.focus({preventScroll:true});});
canvas.addEventListener('pointermove',e=>{const p=local(e);lastPointer=p;if(!pointers.has(e.pointerId)||!gesture)return;const old=[...pointers.values()];pointers.set(e.pointerId,p);if(pointers.size>1){const next=[...pointers.values()],a=Math.hypot(old[0].x-old[1].x,old[0].y-old[1].y),b=Math.hypot(next[0].x-next[1].x,next[0].y-next[1].y);if(b>0)state.camera.distance=M.clamp(state.camera.distance*a/b,250,6000);gesture.moved=true;state.cameraOwner='manual';state.cameraRevision++;invalidate();return;}const threshold=gesture.type==='touch'?8:6;if(!gesture.moved&&Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>threshold){interrupt();gesture.moved=true;state.cameraOwner='manual';}if(gesture.moved){state.camera.yaw+=(p.x-gesture.last.x)*.28;state.camera.pitch=M.clamp(state.camera.pitch+(p.y-gesture.last.y)*.22,-65,65);state.cameraRevision++;invalidate();}gesture.last=p;});
function pointerEnd(e,cancelled=false){const g=gesture;pointers.delete(e.pointerId);if(!g)return;if(!cancelled&&!g.moved&&pointers.size===0){const p=local(e),now=performance.now(),existing=doubleToken;if(existing&&now-existing.time<=500&&existing.pointerId===e.pointerId&&Math.hypot(p.x-existing.x,p.y-existing.y)<=4){existing.second=true;}else{doubleToken=g.hit?{id:g.hit,time:now,pointerId:e.pointerId,x:p.x,y:p.y,second:false}:null;if(g.hit)selectNode(nodes.get(g.hit),'pointer');}}if(pointers.size===0){gesture=null;save();}else{const [id,remaining]=pointers.entries().next().value;gesture={...g,id,start:{...remaining},last:{...remaining},hit:null,moved:true};doubleToken=null;}}
canvas.addEventListener('pointerup',e=>pointerEnd(e));canvas.addEventListener('pointercancel',e=>{doubleToken=null;pointerEnd(e,true);});canvas.addEventListener('dblclick',e=>{const token=doubleToken,p=local(e);doubleToken=null;if(!token?.second||performance.now()-token.time>500||Math.hypot(p.x-token.x,p.y-token.y)>4)return;const n=nodes.get(token.id);if(n?.kind==='paper'&&n.paper.tutorials[0]){interrupt();save();window.location.assign(n.paper.tutorials[0].href);}});
canvas.addEventListener('wheel',e=>{e.preventDefault();interrupt();state.camera.distance=M.clamp(state.camera.distance*Math.exp(M.clamp(e.deltaY,-200,200)*.0015),250,6000);state.cameraOwner='manual';state.cameraRevision++;invalidate();save();},{passive:false});
canvas.addEventListener('keydown',e=>{if(!state.keyboardCamera)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_'].includes(e.key)){e.preventDefault();interrupt();if(e.key==='ArrowLeft')state.camera.yaw-=5;if(e.key==='ArrowRight')state.camera.yaw+=5;if(e.key==='ArrowUp')state.camera.pitch=M.clamp(state.camera.pitch-5,-65,65);if(e.key==='ArrowDown')state.camera.pitch=M.clamp(state.camera.pitch+5,-65,65);if(['+','='].includes(e.key))state.camera.distance=M.clamp(state.camera.distance*.9,250,6000);if(['-','_'].includes(e.key))state.camera.distance=M.clamp(state.camera.distance/ .9,250,6000);state.cameraOwner='manual';state.cameraRevision++;invalidate();save();}});
tree.addEventListener('keydown',e=>{const id=e.target.dataset.instanceId,n=nodes.get(id);if(!n)return;const order=M.visibleOrder(scene,state.expanded,new Set(allowedPapers().map(p=>p.id))),i=order.findIndex(x=>x.id===id);let target=id;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(e.key))e.preventDefault();else return;if(e.key==='ArrowUp')target=order[Math.max(0,i-1)].id;if(e.key==='ArrowDown')target=order[Math.min(order.length-1,i+1)].id;if(e.key==='Home')target=order[0].id;if(e.key==='End')target=order[order.length-1].id;if(e.key==='ArrowRight'&&n.kind!=='paper'){if(!state.expanded.has(id))state.expanded.add(id);else target=order[i+1]?.id||id;}if(e.key==='ArrowLeft'){if(state.expanded.has(id))state.expanded.delete(id);else if(n.parentId!=='root')target=n.parentId;}if(e.key==='Enter'||e.key===' '){selectNode(n);target=id;}state.activeTree=target;renderTree();focusTree(target);invalidate();save();});
const onRootKeydown=e=>{if(e.key!=='Escape')return;if(!overlapPanel.hidden){e.preventDefault();overlapPanel.hidden=true;canvas.focus();}else if(state.keyboardCamera){e.preventDefault();state.keyboardCamera=false;cameraKey.textContent='键盘调视角';hint.textContent='拖动旋转 · 滚轮缩放 · 点击选择';}else if(state.detailOpen){e.preventDefault();interrupt();state.detailOpen=false;fillDetail();focusTree(state.selectedInstance);save();invalidate();}};root.addEventListener('keydown',onRootKeydown);
const onRootClick=e=>{if(e.target.closest?.('a[href]')){interrupt();save();}};root.addEventListener('click',onRootClick);
function onResize(){if(!gesture){invalidate();}else invalidate();}window.addEventListener('resize',onResize);const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(onResize):null;resizeObserver?.observe(canvas);
function onPopState(){if(destroyed)return;const rev=++lastNavRevision;const saved=restore();if(navigationFrame!==null)cancelAnimationFrame(navigationFrame);navigationFrame=requestAnimationFrame(()=>{navigationFrame=null;if(destroyed||rev!==lastNavRevision)return;if(saved?.pageScroll)window.scrollTo(...saved.pageScroll);if(saved?.focusInstanceId&&treeDisclosure.open)focusTree(saved.focusInstanceId);});}window.addEventListener('popstate',onPopState);function onPageShow(e){if(!destroyed&&e.persisted)restore();}function onPageHide(){if(!destroyed){interrupt();save();}}window.addEventListener('pageshow',onPageShow);window.addEventListener('pagehide',onPageHide);
canvas.addEventListener('contextlost',e=>{e.preventDefault();interrupt();graphAvailable=false;state.flat=true;refresh();live.textContent='图形视图暂不可用，全部论文仍可从列表打开';focusFallback();save();});canvas.addEventListener('contextrestored',()=>{graphAvailable=true;mode.disabled=false;mode.textContent='重试图谱';});
restore();save();
const api={inspect:()=>({renderer:'canvas2d-perspective',intentRevision:state.intentRevision,cameraRevision:state.cameraRevision,frameRevision,drawCount,layoutVersion:scene.layoutVersion,worldCoordinateHash:scene.worldCoordinateHash,dataSnapshotId:snapshot,selectedCanonicalPaperId:state.selected,selectedInstanceId:state.selectedInstance,detailOpen:state.detailOpen,query:state.query,direction:state.direction,viewMode:state.flat?'list':'graph',camera:JSON.parse(JSON.stringify(state.camera)),cameraOwner:state.cameraOwner,visibleLabelIds:placed.map(l=>l.id),hiddenLabels,labels:placed.map(l=>({id:l.id,text:l.text,lines:[...l.lines],kind:l.kind,x:l.x,y:l.y,width:l.width,height:l.height,font:l.font})),nodes:projected.map(n=>({id:n.id,kind:n.kind,x:n.x,y:n.y,depth:n.depth,radius:n.radius,visible:n.visible})),lastPick,animationActive:Boolean(animation),counts:{papers:data.papers.length,memberships:data.papers.reduce((s,p)=>s+p.directionIds.length,0),renderInstances:scene.nodes.length,entryLinks:data.papers.reduce((s,p)=>s+p.tutorials.length,0)},viewport:viewportSize()}),select:id=>selectNode(nodes.get(id)||instanceFor(id)),reset:()=>reset.click(),destroy:()=>{if(destroyed)return;destroyed=true;interrupt();lastNavRevision++;if(navigationFrame!==null)cancelAnimationFrame(navigationFrame);resizeObserver?.disconnect();for(const [target,type,handler] of [[window,'resize',onResize],[window,'popstate',onPopState],[window,'pageshow',onPageShow],[window,'pagehide',onPageHide],[root,'keydown',onRootKeydown],[root,'click',onRootClick]])target.removeEventListener(type,handler);pointers.clear();gesture=null;metricCache.clear();host.replaceChildren();fallback.hidden=false;fallback.open=true;for(const row of fallback.querySelectorAll('[data-paper-id]'))row.hidden=false;if(root.__researchTree===api)delete root.__researchTree;}};root.__researchTree=api;return api;
}
window.ISACResearchTree={mount};document.querySelectorAll('[data-research-tree]').forEach(root=>{try{mount(root,JSON.parse(root.querySelector('[data-tree-data]').textContent));}catch(error){const fallback=root.querySelector('.rt-fallback');if(fallback){fallback.hidden=false;fallback.open=true;}console.error('Research graph unavailable; complete static directory remains available',error);}});
})();
/* Preserve native same-page guide anchors and legacy folded sections. */
(()=>{'use strict';function reveal(){let id;try{id=decodeURIComponent((window.location.hash||'').slice(1));}catch{return;}if(!id)return;const target=document.getElementById(id);if(!target)return;let parent=target.parentElement;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}if(target.tagName==='DETAILS')target.open=true;}
window.addEventListener('hashchange',reveal);window.addEventListener('popstate',reveal);document.addEventListener('click',event=>{const link=event.target.closest?.('a[href]');if(!link)return;try{const url=new URL(link.href,window.location.href);if(url.pathname===window.location.pathname&&url.hash===window.location.hash)reveal();}catch{}});reveal();})();
