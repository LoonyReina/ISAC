'use strict';
// Reverse only the reviewed execution entry and three factual status clauses.
// Every prior guide field and generator byte still passes its old digest guard.
const a=require('node:assert/strict');
const executionGuideId='tradeoffs-feedback-capacity-distortion-2018';
const executable={
  "kind": "validated-paper-algorithm",
  "coverage": "algorithm-and-selected-figure",
  "href": "theory.html#capacity-distortion",
  "label": "运行论文算法：容量–失真边界",
  "summary": "本站已实现并数值验证有限字母修正Blahut–Arimoto算法；二元Y=SX、Z=Y、q=0.4配置重现图2的容量–失真边界，并与解析式独立对照。",
  "limitations": "覆盖有限字母算法与二元图2；高斯图3、有限块长通信编码与解码仍未实现，不代表整篇论文已复现。",
  "sourceLocators": [
    "§III，式(3)–(4)，PDF pp.2–3",
    "§IV-A/B，式(13)–(25)，PDF pp.3–4",
    "§V-A，式(26)–(28)、图2，PDF pp.4–5"
  ]
};
const statusClauses=[
  {
    "before": "容量–失真定理＋解析例子＋数值优化；本站仅原文导读",
    "after": "容量–失真定理＋解析例子＋数值优化；本站已数值验证有限字母算法与二元图2"
  },
  {
    "before": "状态在时间上独立同分布，失真按状态逐次平均；这不直接描述跨多个样本保持不变的目标距离或角度，也不能直接给出其CRB。§IV是求概率分布的优化算法；本站未实现该算法、通信码或原图复现。",
    "after": "状态在时间上独立同分布，失真按状态逐次平均；这不直接描述跨多个样本保持不变的目标距离或角度，也不能直接给出其CRB。§IV是求概率分布的优化算法；本站已实现并数值验证有限字母修正Blahut–Arimoto算法及二元图2；高斯图3与有限块长通信码仍未实现。"
  },
  {
    "before": "二元例令q=P(S=1)、p=P(X=0)，二者在[0,1/2]内，平均判错失真为qp，边界速率为qH₂(p) bit/次信道使用。图2分时基线特定地在通信阶段不利用反馈，不能当成所有基线。本站未运行数值优化或通信码。",
    "after": "二元例令q=P(S=1)、p=P(X=0)，二者在[0,1/2]内，平均判错失真为qp，边界速率为qH₂(p) bit/次信道使用。图2分时基线特定地在通信阶段不利用反馈，不能当成所有基线。本站已运行并数值验证有限字母修正Blahut–Arimoto算法及二元图2；高斯图3与有限块长通信码仍未实现。本阅读图仍只表示定性关系。"
  }
];
function withoutCapacityExecution(data){
 const prior=structuredClone(data),matches=prior.cards.filter(c=>c.id===executionGuideId);
 for(const card of prior.cards)if(Object.hasOwn(card,'executable')){if(card.id==='otfs-joint-estimation-2020')a.deepEqual(card.executable,require('./otfs-receiver-preservation.cjs').changes.guides.find(x=>x.path.at(-1)==='executable').after,'exact later OTFS executable');else if(card.id==='ofdm-ici-aware-receiver-2021')a.deepEqual(card.executable,require('./ofdm-ici-preservation.cjs').changes.guides.find(x=>x.path.at(-1)==='executable').after,'exact later ICI executable');else if(card.id==='ofdm-passive-atomic-errors-2017')a.deepEqual(card.executable,require('./atomic-receiver-preservation.cjs').additions.executable,'exact later atomic execution entry');else if(card.id!=='nearfield-mechanism-aware-mapping-2026')a.equal(card.id,executionGuideId,'execution field belongs only to the reviewed guide');}
 if(!matches.length)return prior;
 a.equal(matches.length,1,'one reviewed execution guide');
 const card=matches[0];
 a.equal(Object.keys(card).at(-1),'executable','execution entry is the appended field');
 a.deepEqual(card.executable,executable,'exact reviewed executable entry');
 a.equal(card.evidence.kind,statusClauses[0].after,'exact reviewed evidence status');
 a.equal(card.limits[3],statusClauses[1].after,'exact reviewed implementation limit');
 const evidence=card.visualTrace.steps.filter(s=>s.id==='evidence');
 a.equal(evidence.length,1,'one existing trace evidence stage');
 a.equal(evidence[0].explanation,statusClauses[2].after,'exact reviewed trace evidence status');
 card.evidence.kind=statusClauses[0].before;
 card.limits[3]=statusClauses[1].before;
 evidence[0].explanation=statusClauses[2].before;
 delete card.executable;
 return prior;
}
const executionRendererHooks=[
  {
    "before": "function buildResearchGuides(data,registry,validationContext){\n",
    "after": "const executionCoverageLabels=Object.freeze({algorithm:'已数值验证论文算法','algorithm-and-selected-figure':'已数值验证论文算法与选定图'});\nfunction validateExecutable(executable,local){\n if(!object(executable,['kind','coverage','href','label','summary','limitations','sourceLocators'])||executable.kind!=='validated-paper-algorithm'||typeof executable.coverage!=='string'||!Object.hasOwn(executionCoverageLabels,executable.coverage)||!['label','summary','limitations'].every(k=>prose(executable[k]))||!Array.isArray(executable.sourceLocators)||!executable.sourceLocators.length||executable.sourceLocators.length>8||!executable.sourceLocators.every(prose)||new Set(executable.sourceLocators).size!==executable.sourceLocators.length)throw new Error('Invalid research guide executable');\n local.unitEntry({href:executable.href});\n}\nfunction buildResearchGuides(data,registry,validationContext){\n"
  },
  {
    "before": "  if(card.visualTrace!==undefined)validateVisualTrace(card.visualTrace,card,local);\n",
    "after": "  if(Object.hasOwn(card,'executable'))validateExecutable(card.executable,local);\n  if(card.visualTrace!==undefined)validateVisualTrace(card.visualTrace,card,local);\n"
  },
  {
    "before": "function renderGuideDirectionLink(cards,directionId){\n",
    "after": "function renderExecutable(card){\n const e=card.executable;if(!e)return '';\n return `<div class=\"guide-executable\"><p class=\"site-primary\"><strong>${link(e.href,e.label,' class=\"guide-executable-link\"')}</strong></p><p><strong>${executionCoverageLabels[e.coverage]}：</strong>${escapeHtml(e.summary)}</p><p>${escapeHtml(e.limitations)}</p><p class=\"small\">核对算法与实验：${e.sourceLocators.map(locator=>link(card.source.url,locator)).join(' · ')}</p></div>\\n`;\n}\nfunction renderGuideDirectionLink(cards,directionId){\n"
  },
  {
    "before": " return count?`<p class=\"small\">阅读拓展：${link('#'+groupId(directionId),count+' 篇问题式原文导读')}（阅读资源，不增加实验覆盖）</p>`:'';\n",
    "after": " return count?`<p class=\"small\">阅读拓展：${link('#'+groupId(directionId),count+' 篇问题式原文导读')}（${cards.some(c=>c.directionId===directionId&&c.executable)?'算法覆盖以卡片标注为准':'阅读资源，不增加实验覆盖'}）</p>`:'';\n"
  },
  {
    "before": "${renderVisualTrace(c)}${renderContextTrail(c,byId)}${onward(c)}<details class=\"guide-depth\">",
    "after": "${renderExecutable(c)}${renderVisualTrace(c)}${renderContextTrail(c,byId)}${onward(c)}<details class=\"guide-depth\">"
  }
];
function withoutCapacityExecutionRenderer(source){
 let previous=-1;
 for(const [index,{after}]of executionRendererHooks.entries()){
  a.equal(source.split(after).length,2,'one exact capacity execution renderer hook '+(index+1));
  const offset=source.indexOf(after);a.ok(offset>previous,'reviewed capacity execution renderer hook order');previous=offset;
 }
 for(const {before,after}of executionRendererHooks)source=source.replace(after,()=>before);
 return source;
}
module.exports={executionGuideId,executable,statusClauses,executionRendererHooks,withoutCapacityExecution,withoutCapacityExecutionRenderer};
