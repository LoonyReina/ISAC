#!/usr/bin/env node
'use strict';
// Static HTML is the deployment artifact. Only marked shell regions in scientific
// pages are generated; handwritten bodies and numerical bundles are never rebuilt.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),registry=JSON.parse(fs.readFileSync(path.join(root,'site/registry.json'),'utf8'));
const check=process.argv.includes('--check'), changed=[],outputs=new Map();
const {renderResearchDirectory}=require(path.join(__dirname,'render-research-directory.cjs'));
const {buildResearchGuides,renderResearchGuides,renderGuideDirectionLink}=require(path.join(__dirname,'research-guides.cjs'));
const {renderComparisonGroups}=require(path.join(__dirname,'paper-comparison-groups.cjs'));
const {createLearningEntryResolver,createBuildLinkValidationContext}=require(path.join(__dirname,'learning-entry.cjs'));
const linkValidation=createBuildLinkValidationContext();
const learningEntries=createLearningEntryResolver(registry,linkValidation);
const {buildNotebookTopics,notebookHref,renderNotebookOptions,renderNotebookData}=require(path.join(__dirname,'notebook-topics.cjs'));
const notebookTopics=buildNotebookTopics(registry,linkValidation);
const siteStylesheet='site.css?v=knowledge-map-v1';
const sentence=text=>{const clean=String(text).trim().replace(/。+$/u,'。');return /[。.!?！？]$/u.test(clean)?clean:clean+'。';};
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const link=(href,label,extra='')=>`<a href="${esc(href)}"${extra}>${label}</a>`;
const pageFor=file=>registry.pages.find(p=>p.path===file);
const caseFor=id=>registry.cases.find(c=>c.id===id);
const unitFor=id=>registry.units.find(u=>u.id===id);
const prerequisiteTitles={
 'perceptive-clutter.html#question':'递归背景的复数相减先修',
 'network-clock.html#model':'标量互易时延与时钟先修',
 'near-field.html#experiment':'近场一程无噪声曲率先修',
 'near-field.html#geometry':'近场曲率与双孔径几何先修',
 'offgrid-range.html#model':'离格测距的观测与模型',
 'foundations.html#start':'基础讲义的起点与学习约定',
 'foundations.html#limits':'性能指标与边界',
 'foundations.html#ofdm-basics':'OFDM 通信基础',
 'foundations.html#codesign':'发射、接收与联合设计',
 'waveform-design.html#model':'发射块与波形设计约束'
};
function prerequisiteLink(href){const title=registry.units.find(u=>u.href===href)?.title||prerequisiteTitles[href];if(!title)throw new Error('Missing prerequisite subject: '+href);return link(href,esc(title));}
// Rendering stages bytes from handwritten sources. Generated-only outputs are
// never inputs; no output is written before complete link/duplicate-ID validation.
function emit(file,text){if(outputs.has(file))throw new Error('Duplicate generated output: '+file);outputs.set(file,text.trimEnd()+'\n');}
function header(page){return `${['pilot-patterns.html','dual-array-positioning.html'].includes(page.path)?'<link rel="stylesheet" href="'+siteStylesheet+'">':''}<a class="site-skip" href="#site-main">跳到正文</a>
<header class="site-header"><a class="site-brand" href="index.html"${page.path==='index.html'?' aria-current="page"':''}>ISAC <span>交互学习</span></a><nav class="site-nav" aria-label="四阶段学习导航">${registry.stages.map(s=>link(s.href,`<span>${s.step}</span> ${s.label}`,page.stage===s.id?` aria-current="${page.path===s.href?'page':'location'}"`:'')).join('')}</nav>${page.path==='foundations.html'?'<button id="print-book" type="button" title="打印或另存为 PDF">打印讲义</button><div id="progress" aria-hidden="true"></div>':''}</header>`;}
function context(page){const stage=registry.stages.find(s=>s.id===page.stage);let text=`<div class="site-context"${['pilot-patterns.html','dual-array-positioning.html'].includes(page.path)?'':' id="site-main" tabindex="-1"'}><nav class="site-breadcrumb" aria-label="当前位置">${link('index.html','学习地图')}${stage?' <span aria-hidden="true">/</span> '+(stage.href===page.path?`<span aria-current="page">${stage.label}</span>`:link(stage.href,stage.label)+' <span aria-hidden="true">/</span> <span aria-current="page">'+page.title+'</span>'):''}</nav><p class="site-role">${page.role}</p>`;
if(page.prerequisites.length)text+=`<p class="site-prereq">需要时回看：${page.prerequisites.map(prerequisiteLink).join(' · ')}</p>`;
if(page.case){const c=page.path==='pilot-design.html'?{...caseFor(page.case),unit:'pilot',paper:'pilot-design.html#case',next:'pilot-design.html#reproduce'}:caseFor(page.case);text+=`<nav class="site-topic-nav" aria-label="本主题学习路线">${link(unitFor(c.unit).href,'① 预测与实验')}${link(c.paper,'② 原文与证据')}${link(c.next,'③ 边界与下一问')}${link(notebookHref(c.unit),'④ 记录一次研究')}</nav>`;}
if(page.path==='dual-array-positioning.html')text+='<p class="small">既有论文身份：nearfield-double-array-ispac。'+link('assets/data/dual-array/lesson-review/ACCEPTANCE.md','2026-10-13 独立功能/数值接受')+'：33 组实际 Node Worker 检查、15 份生产 Blob 导出与 37,495 项公式比较；真实浏览器、90,000 格 SVG 绘制/内存、布局和原生网络仍待单独验收。14,464 次冻结试验不是本次运行。</p>';
if(page.path==='pilot-patterns.html')text+='<p class="small">既有论文身份：supplement-case-pilot。当前范围：'+link('assets/data/pilot-pattern/lesson-review/ACCEPTANCE.md','2026-10-13 独立功能/来源接受')+'；473 项 Node 断言与 1511 项 NumPy 核查支持有界课件，真实浏览器、布局、原生下载与完整绘制时延仍待验收。早期合同保留其历史阶段。</p>';
if(page.path==='theory.html')text+='<nav class="site-topic-nav" aria-label="理论桥梁目录"><a href="#pathway">任务与先修</a><a href="#shared-model">共同观测</a><a href="#crb-mechanism">标量 CRB</a><a href="#estimator-crb">实际估计器</a><a href="#rate-crb-bridge">速率桥梁</a><a href="reading.html#case-crb">原文与证据</a></nav>';
return text+'</div>';}
function pilotReadingContinuation(page){
 if(page.path!=='pilot-design.html')return '';
 const one=(items,label)=>{if(items.length!==1)throw new Error('Invalid pilot reading continuation: '+label);return items[0];};
 const selection=one(registry.knowledgeMap.progressions.filter(p=>p.nodeId==='known-pilots'),'selection');
 if(selection.unitId!=='pilot')throw new Error('Invalid pilot reading continuation: unit');
 const node=one(registry.knowledgeMap.nodes.filter(n=>n.id===selection.nodeId),'node'),unit=one(registry.units.filter(u=>u.id===selection.unitId),'unit');
 const guide=one(researchGuides.filter(g=>g.id===selection.guideId),'guide'),newer=one(researchGuides.filter(g=>g.id===selection.nextGuideId),'next guide');
 if(!node.unitRefs.includes(unit.id)||unit.href!==page.path+'#experiment'||!guide.prerequisites.some(p=>p.href===unit.href))throw new Error('Invalid pilot reading continuation: existing prerequisite');
 const relation=one((newer.contextTrail?.links||[]).filter(e=>e.guideId===guide.id),'source relationship');
 if(relation.relationType!=='problem-link')throw new Error('Invalid pilot reading continuation: problem link');
 const guideHref=learningEntries.unitEntry({href:'reading.html#guide-'+guide.id}),newerHref=learningEntries.unitEntry({href:'reading.html#guide-'+newer.id});
 return `<p>沿刚才的问题继续</p><h3>刚才的导频值是已知的；如果参考符号本身出错呢？</h3>${link(guideHref,esc(guide.title)+' →')}<div class="small">本页把所选导频值视为可靠已知；接下来的导读改问：解调得到的参考符号若有误，怎样避免把错误残差解释成目标？这是前置机制与原文的阅读关联，不表示本页实现了论文算法。</div><p>继续对读：${link(newerHref,esc(newer.title))}</p><div class="small"><strong>本站按问题关联（非引用关系）：</strong>${esc(relation.verificationNote)}</div><div class="small"><strong>尚待检验的下一问：</strong>${esc(newer.nextQuestion)}</div>`;
}
function next(page){const c=page.case&&caseFor(page.case),href=page.next==='practice.html#notebook'&&c?notebookHref(page.path==='pilot-design.html'?'pilot':c.unit):page.next;const continuation=pilotReadingContinuation(page);return `<aside class="site-next" aria-label="下一步">${continuation||'<p>完成当前问题之后</p>'}${continuation?'<p>也可先记录这次观察：'+link(href,esc(page.nextLabel)+' →')+'</p>':link(href,page.nextLabel+' →')}</aside><footer class="site-footer">ISAC 交互学习 · 独立教学模型不等于完整论文复现 · ${link('index.html','学习地图')} · ${link('reading.html#reading','原文与证据')}</footer>`;}
function region(key,html){return `<!-- SITE:${key}:START -->\n${html}\n<!-- SITE:${key}:END -->`;}
function updateRegion(html,key,value){const re=new RegExp(`<!-- SITE:${key}:START -->[\\s\\S]*?<!-- SITE:${key}:END -->`);if(!re.test(html))throw new Error(`Missing ${key} marker`);return html.replace(re,region(key,value));}
function document(page,body,{scripts='',styles='',legacy=false}={}){return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${esc(page.title+'；从物理直觉、互动实验到原文证据与研究实践。')}"><title>${esc(page.title)} | ISAC 交互学习</title><link rel="stylesheet" href="course.css"><link rel="stylesheet" href="theory.css"><link rel="stylesheet" href="research.css"><link rel="stylesheet" href="${siteStylesheet}">${styles}${legacy?'<script defer src="legacy-routes.js"></script>':''}${scripts}</head><body data-route="${page.path}">
${region('HEADER',header(page))}<main class="site-main">${region('CONTEXT',context(page))}
${body}
${region('NEXT',next(page))}</main></body></html>`;}
function cover(eyebrow,title,description){return `<div class="cover"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${description}</p></div>`;}
function fallback(file){const routes=registry.legacy[file];return `<section class="site-legacy" aria-label="旧书签兼容"><details><summary>从旧书签来到这里？查看对应内容</summary><p>启用 JavaScript 时，已知旧锚点会直接转到新位置；不用 JavaScript 也可使用下面的链接。</p><ul>${Object.entries(routes).filter(([id])=>id).map(([id,target])=>`<li>${link(target,esc(id)+' → 对应内容',` id="${esc(id)}"`)}</li>`).join('')}</ul></details></section>`;}
const researchGuides=buildResearchGuides(JSON.parse(read(registry.researchGuidesFile)),registry,linkValidation);
const home=pageFor('index.html');
let homeBody=`<div class="home-hero"><p class="eyebrow">INTEGRATED SENSING &amp; COMMUNICATION</p><h1>先看全局，<br>再沿一个问题深入。</h1><p>从通信与雷达基础，到共同观测、联合设计与研究证据。把抽象概念接到一个可操作、可检验的问题上。</p><div class="hero-actions">${link('foundations.html#start','从第一束回波开始 →',' class="hero-primary"')}${link('#knowledge-map','探索知识地图 ↓',' class="hero-secondary"')}</div><p class="hero-index"><span><strong>${registry.knowledgeMap.nodes.length}</strong> 个核心概念</span><span><strong>${registry.directions.length}</strong> 个研究方向</span><span><strong>${registry.units.length}</strong> 个机制实验</span></p></div>`;
homeBody+=require(path.join(__dirname,'knowledge-map.cjs'))(registry,researchGuides,linkValidation);
homeBody+=`<section class="site-section" id="curriculum"><h2>四个阶段，一条清楚的路线</h2><div class="stage-grid">${registry.stages.map(s=>`<article class="stage-card"><p class="eyebrow">${s.step} / ${s.label}</p><h3>${s.outcome}</h3><p>${s.description}</p>${link(s.href,s.next+' →')}</article>`).join('')}</div></section><section class="site-section" id="choose-start"><h2>已有基础？从当前问题接上</h2><div class="site-paths"><p>不确定通信与感知的已知、未知？<br>${link('theory.html','看共同观测的理论桥梁 →')}</p><p>已经有一篇论文或一个疑问？<br>${link('reading.html#directions','按研究方向找到已有讲解 →')}</p></div><p class="small">每个实验都先预测，再改变一个量，最后解释图与模型。研究材料保留原核对日期与固定版本；目录重构不代表新检索或新增复现。</p></section>`+fallback('index.html');
emit('index.html',document(home,homeBody,{legacy:true,styles:'<link rel="stylesheet" href="knowledge-map.css?v=map-progression-v1">',scripts:'<script defer src="knowledge-map.js?v=knowledge-map-v3"></script>'}));
function experimentCard(u){const topic=registry.cases.find(c=>c.unit===u.id);return `<article class="experiment-card" id="unit-${u.id}" data-search="${esc(u.title+' '+u.question)}"><p class="eyebrow">${u.group==='research'?'研究机制':'基础机制'}</p><h3>${link(learningEntries.unitEntry(u),u.title)}</h3><p>${u.question}</p><p class="small"><strong>动手：</strong>${u.action}</p><p class="small">先修：${u.prerequisites.map(prerequisiteLink).join(' · ')}</p><p class="small">研究方向：${link('reading.html#direction-'+u.primaryDirectionId,registry.directions.find(d=>d.id===u.primaryDirectionId).title.split('：')[0])}</p><p class="experiment-action">先预测 → 改一个量 → 观察与解释</p>${link(u.href,'进入实验 →')}${topic?' · '+link('reading.html#'+topic.id,'原文与证据'):''}</article>`;}
let exp=cover('02 / 机制实验','先预测，再动手。','不同时改五个参数。选择一个机制，先说明输入和坐标，再预测一个变化；图像负责检验，不替你下结论。');
exp+='<form class="experiment-search" role="search" hidden><label for="experiment-query">找一个问题或机制</label><input id="experiment-query" type="search" placeholder="例如：相位、导频、时钟"><button type="reset">清除筛选</button><p id="experiment-count" role="status" aria-live="polite"></p></form><p id="experiment-empty" hidden>没有匹配的实验。试试“相位”“距离”，或清除筛选。</p>';
for(const [id,title,desc]of [['observation','01 · 电波如何变成数据','先从路径与复数观测建立直觉。'],['processing','02 · 数据如何变成判断','沿采样、匹配、检测与几何理解输出。'],['research','03 · 理想假设被改变之后','在同一主题里往返实验、原文与结论边界。']])exp+=`<section class="site-section experiment-group" id="${id}"><h2>${title}</h2><p>${desc}</p><div class="experiment-grid-catalog">${registry.units.filter(u=>u.group===id).map(experimentCard).join('')}</div></section>`;
exp+='<section class="site-section" id="supplements"><h2>需要更多对照时，再用补充沙盒</h2><p>这些是独立教学模型，参数和归一化不一定与主线相同。先明确当前要检验的机制，不把不同预算的曲线直接横比。</p><ul class="supplement-links"><li><a href="sandbox.html#doppler">声学多普勒：数波前与到达间隔</a>，保留声学精确式与电磁近似的区别</li><li><a href="sandbox.html#matched">匹配滤波：噪声、模板失配与弱目标</a></li><li><a href="sandbox.html#ofdm">32×32 OFDM：噪声与非整格目标</a></li><li><a href="sandbox.html#cfar">CFAR：固定门限、变化背景与随机试验</a></li><li><a href="sandbox.html#beam">阵列：目标方向与通信用户方向的对照</a></li><li><a href="resolution.html#lab">带宽与时长：理想响应尺度的对照</a></li></ul></section>';
emit('experiments.html',document(pageFor('experiments.html'),exp,{scripts:'<script defer src="catalog.js"></script>'}));
function paperComparison(c){
 const p=c.paperComparison;if(!p)return '<p class="small">逐项原文对照尚待整理。</p>';
 const list=items=>'<ul>'+items.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul>';
 return `<section class="paper-comparison" aria-label="逐项原文对照"><h4>逐项原文对照 · 部分核对</h4><p class="small">${esc(p.verificationNote)}。以下明确分开论文结果与本站模型；尚未核对项不会视为已完成。</p><dl><dt>固定原文</dt><dd>${link(p.sourceUrl,esc(p.sourceTitle))}<br>${esc(p.version)}</dd><dt>章节 / 图 / 公式</dt><dd>${esc(p.locator.summary)}</dd><dt>本站保留</dt><dd>${list(p.retainedAssumptions)}</dd><dt>本站省略</dt><dd>${list(p.omittedMechanisms)}</dd><dt>两类证据</dt><dd>论文：${esc(p.paperEvidenceType)}。<br>本站：${esc(p.siteArtifactType)}。</dd><dt>指标</dt><dd>${list(p.metrics)}</dd><dt>资源预算</dt><dd>${esc(p.resourceBudget.summary)}</dd><dt>待核对 / 未复现</dt><dd>${list(p.unknowns)}</dd></dl>${link(p.comparisonLink,'回到本主题的模型与原文解释 →')}</section>`;
}
function readingCard(c){return `<article class="research-case" id="${c.id}" aria-labelledby="${c.id.replace('case-','')}-title"><p class="eyebrow">机制 → 原文 → 可检验的下一问</p><h3 id="${c.id.replace('case-','')}-title">${link(learningEntries.caseEntry(c),c.title)}</h3><details class="case-evidence"><summary>展开问题、实验与原文证据</summary><div><dl>${Object.entries(c.fields).map(([key,val])=>`<dt>${key}</dt><dd>${val}</dd>`).join('')}</dl>${paperComparison(c)}<nav class="site-topic-nav" aria-label="${esc(c.title)}学习路线">${link(unitFor(c.unit).href,'先动手机制实验')}${link(c.paper,'逐项对照原文')}${link(c.next,'检查边界与下一问')}${link(notebookHref(c.unit),'记录这个问题')}</nav></div></details></article>`;}
function directionCard(d){
 const first=d.levels[0].items.find(i=>i.status==='available');
 return `<article class="direction-card" id="direction-${d.id}" data-scene-positions="${esc((d.scenePositions||[]).join(' '))}"><p class="scene-match" hidden>对应所选瓶颈</p><h3>${d.title}</h3><p>${d.question}</p><p class="small">当前覆盖：${d.coverage}</p><p class="small">链路入口：${(d.scenePositions||[]).map(id=>esc(registry.scenePositions.find(p=>p.id===id)?.label||id)).join(' · ')||'尚未标注；仍可沿六层阅读'}</p>${link(first.href,'从这个问题开始 →')}${renderGuideDirectionLink(researchGuides,d.id)}<details class="direction-depth"><summary>沿六层深入 · 查看已有材料与缺口</summary><div><p class="small">${d.scope}</p><ol>${d.levels.map(level=>`<li><strong>${level.label}</strong>${level.note?`<p class="small">${level.note}</p>`:''}${level.notice?`<p class="small">${level.notice}</p>`:''}<ul>${level.items.map(item=>`<li>${item.status==='available'?link(item.href,item.label):esc(item.label)+'（尚未实现）'}${item.scope==='foundation-only'?' <span class="scope-note">仅前置实验</span>':''}${item.scope==='shared-template'?' <span class="scope-note">通用计划</span>':''}${item.note?`<p class="small">${item.note}</p>`:''}</li>`).join('')}</ul></li>`).join('')}</ol>${d.primaryCaseIds.length?'<p>已有专题：'+d.primaryCaseIds.map(id=>link('#'+id,caseFor(id).title)).join(' · ')+'</p>':''}<p class="small">后续可扩展：${esc(sentence(typeof d.nextExtension==='string'?d.nextExtension:JSON.stringify(d.nextExtension)))}这里只标出缺口，不表示已经实现。</p></div></details></article>`;
}
function sceneGuide(){return read('site/content-scene-guide.html').replace('<!-- SCENE:POSITIONS -->',registry.scenePositions.map(p=>`<button type="button" data-scene-position="${esc(p.id)}" data-scene-label="${esc(p.label)}" aria-pressed="false">${esc(p.label)}<span>${esc(p.hint)}</span></button>`).join(''));}
const researchDirectory=JSON.parse(read(registry.researchDirectoryFile));
let reading=cover('03 / 论文阅读','沿一个方向，<br>把理解一层层做深。','用问题组织研究，用模型、实验和原文校验理解。先找到自己想弄清的机制，再读作者究竟证明了什么。');
reading+=`<nav class="study-links" aria-label="论文阅读目录"><a href="#directions">按研究方向找问题</a>${researchGuides.length?`<a href="#research-guides">${researchGuides.length} 篇问题式导读</a>`:''}${registry.paperComparisonGroups?.length?'<a href="#paper-comparisons">同方向论文对读</a>':''}<a href="#influential-papers">${researchDirectory.cards.length} 篇论文与影响证据</a><a href="#cases">已有教学案例</a><a href="#reading-2026">2026 阅读补充</a><a href="#reading">基础书目与来源</a></nav>`;
reading+=`<section class="site-section" id="foundations"><h2 id="foundations-title">先接上必需的基础</h2><p>${link('foundations.html#start','连续基础讲义')} · ${link('theory.html#pathway','通信与感知的已知、未知')} · ${link('practice.html#research-method','把问题写成可复核计划')}</p><p>不必先读完所有内容；每个主题会指出当前需要的基础。</p></section>`;
reading+=`<section class="site-section" id="directions"><h2>研究方向地图</h2><p>方向可以横向增加；每个方向沿“直觉问题 → 观测模型 → 互动实验 → 原文对照 → 边界与复现”逐层深入。下面只列已有内容，未实现的层次明确标出。</p>${sceneGuide()}<div class="direction-grid">${registry.directions.map(directionCard).join('')}</div></section>`;
reading+=renderResearchGuides(researchGuides);
reading+=renderComparisonGroups(registry,linkValidation);
reading+=renderResearchDirectory(researchDirectory,registry,file=>registry.pages.some(page=>page.path===file),linkValidation);
reading+=`<section class="site-section" id="cases"><h2 id="cases-title">${registry.cases.length} 个已有主题：从机制走回原文</h2><p>这些案例是可独立选择的主题，不是难度排名或技术演进顺序。下一问是待检验的问题，不是本站已经得到的结论。</p><nav class="research-jumps" aria-label="已有主题">${registry.cases.map(c=>link('#'+c.id,c.title)).join('')}</nav><div class="research-cases">${registry.cases.map(readingCard).join('')}</div></section>`;
reading+='<section class="site-section" id="evidence"><h2 id="evidence-title">从证据看结论能走多远</h2><ol><li>保留论文版本、章节、图号/公式和资源预算，先核对作者研究的对象。</li><li>明确本站实验保留和省略了什么；独立机制演示不能替代论文完整算法与原型。</li><li>理论界、仿真、硬件实测、标准愿景各自回答不同问题；同时记录失败条件。</li></ol><p><a href="docs/READING-MAP.md">查看逐项来源与核对范围</a> · <a href="theory.html#evidence-map">查看理论页的证据示例</a></p></section>';
reading+=read('site/content-branches.html')+read('site/content-frontiers.html')+read('site/content-reading.html');
emit('reading.html',document(pageFor('reading.html'),reading,{styles:'<link rel="stylesheet" href="scene-guide.css?v=scene-guide-v1"><link rel="stylesheet" href="research-directory.css?v=influence-v1"><link rel="stylesheet" href="paper-comparison.css?v=paper-comparison-v1"><link rel="stylesheet" href="research-guides.css?v=research-guides-v3">',scripts:'<script type="module" src="scene-guide.js?v=scene-guide-v2"></script><script defer src="paper-comparison.js?v=paper-comparison-v1"></script><script defer src="research-guides.js?v=research-guides-v1"></script>'}));
function practiceContent(){
 let body=read('site/content-practice.html');
 for(const [marker,html]of [['<!-- NOTEBOOK:OPTIONS -->',renderNotebookOptions(notebookTopics)],['<!-- NOTEBOOK:TOPICS -->',renderNotebookData(notebookTopics)]]){
  if(body.split(marker).length!==2)throw new Error('Expected one '+marker+' marker');
  body=body.replace(marker,()=>html);
 }
 return body;
}
emit('practice.html',document(pageFor('practice.html'),practiceContent(),{styles:'<link rel="stylesheet" href="notebook.css?v=guided-notebook-v1">',scripts:'<script defer src="notebook.js?v=guided-notebook-v1"></script>'}));
emit('resolution.html',document(pageFor('resolution.html'),cover('补充实验 / 固定物理条件下的尺度','带宽与时长，各改变什么？','这里只比较两个目标各自的理想响应形状，不把两条曲线当成相干叠加的接收功率。')+read('site/content-resolution.html'),{scripts:'<script defer src="resolution.js"></script>'}));
for(const page of registry.pages.filter(p=>!['index.html','experiments.html','reading.html','practice.html','resolution.html'].includes(p.path))){let html=read(page.path).replace(/<link rel="stylesheet" href="site\.css(?:\?[^"]*)?">/,`<link rel="stylesheet" href="${siteStylesheet}">`);for(const [key,val]of [['HEADER',header(page)],['CONTEXT',context(page)],['NEXT',next(page)]])html=updateRegion(html,key,val);emit(page.path,html);}
for(const file of ['research.html','learn.html','overview.html']){const target=registry.legacy[file][''];const page={path:file,title:'内容已整合到新学习路线',stage:'',role:'旧书签兼容入口',prerequisites:[],next:target,nextLabel:'前往对应内容'};emit(file,document(page,cover('旧链接仍然可用','内容已有新的位置','原有讲解与实验已按基础、机制、阅读和实践整合。使用下面的链接继续；已知旧锚点会保留对应位置。')+`<p class="site-primary">${link(target,'继续到新位置 →')}</p>`+fallback(file),{legacy:true}));}
const routesJSON=JSON.stringify(registry.legacy,null,2);
emit('legacy-routes.js',`/* Generated by scripts/generate-site.cjs. Known routes only; no user-controlled redirect. */\n(()=>{'use strict';const routes=${routesJSON};function redirect(){const file=location.pathname.split('/').pop()||'index.html';const table=routes[file];if(!table)return;let hash;try{hash=decodeURIComponent(location.hash.slice(1));}catch{return;}const target=table[hash];if(!target)return;const url=new URL(target,location.href);url.search=location.search;if(url.href!==location.href)location.replace(url.href);}window.addEventListener('hashchange',redirect);redirect();})();`);
// Explicit supplementary lesson: validate its links/IDs without generating or changing it.
const validationOutputs=new Map(outputs);
const supplementaryPage='labs/ofdm-ici/false-alarm/index.html';
validationOutputs.set(supplementaryPage,read(supplementaryPage));
linkValidation.validateOutputs(validationOutputs);
for(const [file,text]of outputs)if(!fs.existsSync(path.join(root,file))||read(file)!==text){changed.push(file);if(!check)fs.writeFileSync(path.join(root,file),text);}
if(changed.length){console.log((check?'Out of date: ':'Generated: ')+changed.join(', '));if(check)process.exitCode=1;}else console.log('Generated site is current.');
