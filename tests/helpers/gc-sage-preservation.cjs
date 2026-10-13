'use strict';
// Exact inverse of this reviewed single-lesson registration and execution link.
// Existing historical digests remain unchanged; unrelated fields are never removed.
const a=require('node:assert/strict');
const additions={
  "unit": {
    "id": "nearfield-gc-sage",
    "title": "近场环境推断：点还是反射面？",
    "href": "nearfield-gc-sage.html#experiment",
    "question": "拟合得更好，环境就画对了吗？",
    "prerequisites": [
      "near-field.html#experiment",
      "multipath-channel.html#experiment",
      "foundations.html#ofdm"
    ],
    "group": "research",
    "primaryDirectionId": "spatial",
    "action": "固定同一复宽带观测与数据初始化，实际运行仅散射和混合几何搜索；回看逐路径残差更新，再揭示真值、错误机制与实际计算代价。"
  },
  "page": {
    "path": "nearfield-gc-sage.html",
    "title": "拟合得更好，环境就画对了吗？",
    "stage": "experiments",
    "role": "论文算法缩减实现 · 二维、单次交互、已知双路径的宽带几何约束估计",
    "prerequisites": [
      "near-field.html#experiment",
      "multipath-channel.html#experiment",
      "foundations.html#ofdm"
    ],
    "next": "reading.html#guide-nearfield-mechanism-aware-mapping-2026",
    "nextLabel": "回到原文：估计出了什么，仍未复现什么？"
  },
  "hooks": [
    {
      "directionId": "spatial",
      "levelId": "intuition",
      "item": {
        "label": "拟合得更好，环境就画对了吗？",
        "href": "nearfield-gc-sage.html#question",
        "kind": "lesson",
        "scope": "direction-specific",
        "status": "available",
        "note": "实际运行二维、单次交互、已知 L=2 的独立缩减估计器；不是完整 GC-SAGE、原文图5–9或场测复现。"
      }
    },
    {
      "directionId": "spatial",
      "levelId": "model",
      "item": {
        "label": "宽带未知几何与逐通道复增益",
        "href": "nearfield-gc-sage.html#model",
        "kind": "model",
        "scope": "direction-specific",
        "status": "available",
        "note": "实际运行二维、单次交互、已知 L=2 的独立缩减估计器；不是完整 GC-SAGE、原文图5–9或场测复现。"
      }
    },
    {
      "directionId": "spatial",
      "levelId": "experiment",
      "item": {
        "label": "同观测运行散射与反射几何搜索",
        "href": "nearfield-gc-sage.html#experiment",
        "kind": "interactive",
        "scope": "direction-specific",
        "status": "available",
        "note": "实际运行二维、单次交互、已知 L=2 的独立缩减估计器；不是完整 GC-SAGE、原文图5–9或场测复现。"
      }
    },
    {
      "directionId": "spatial",
      "levelId": "papers",
      "item": {
        "label": "2026 GC-SAGE：缩减算法与原文逐步对应",
        "href": "nearfield-gc-sage.html#paper",
        "kind": "paper-guide",
        "scope": "direction-specific",
        "status": "available",
        "note": "实际运行二维、单次交互、已知 L=2 的独立缩减估计器；不是完整 GC-SAGE、原文图5–9或场测复现。"
      }
    },
    {
      "directionId": "spatial",
      "levelId": "limits",
      "item": {
        "label": "错误机制、未定位与保守区域先验",
        "href": "nearfield-gc-sage.html#limits",
        "kind": "limits",
        "scope": "direction-specific",
        "status": "available",
        "note": "实际运行二维、单次交互、已知 L=2 的独立缩减估计器；不是完整 GC-SAGE、原文图5–9或场测复现。"
      }
    },
    {
      "directionId": "spatial",
      "levelId": "reproduction",
      "item": {
        "label": "下载实际双算法观测、结果与更新记录",
        "href": "nearfield-gc-sage.html#reproduce",
        "kind": "reproduction-plan",
        "scope": "direction-specific",
        "status": "available",
        "note": "实际运行二维、单次交互、已知 L=2 的独立缩减估计器；不是完整 GC-SAGE、原文图5–9或场测复现。"
      }
    }
  ],
  "guideId": "nearfield-mechanism-aware-mapping-2026",
  "questionBefore": "同一面墙对不同阵元的反射点并不相同，遮挡又只挡住部分孔径；此时把所有回波都当作全阵列可见的点散射体，会把环境画成什么？",
  "questionAfter": "同一面墙对不同阵元的反射点并不相同，遮挡又只挡住部分孔径；即使允许不同阵元具有不同复增益，把墙面仍解释成点散射体，会遗漏什么几何结构？",
  "executable": {
    "kind": "validated-paper-algorithm",
    "coverage": "algorithm",
    "href": "nearfield-gc-sage.html#experiment",
    "label": "运行缩减论文算法：从宽带观测推断点与反射面",
    "summary": "两种方法共享同一复观测与数据估计初始化，均拟合逐通道复增益；实际执行逐路径残差消除、参考时延椭圆搜索及散射/反射候选比较，并保留真实更新历史与失败。",
    "limitations": "仅二维、单次交互、已知 L=2 的合成逆问题；采用所有建模反射交互点在搜索区域内的保守先验。没有未知路径数选择、完整多跳/三维 GC-SAGE、实测数据或原文图5–9复现。",
    "sourceLocators": [
      "§II-B–D，式(1)–(13)、脚注6",
      "§III-A，式(14)–(18)、算法1",
      "§III-B，式(19)–(23)、算法2"
    ]
  },
  "statusBefore": "本卡按2026-05-01 v1投稿预印本阅读；未核实接收状态、公开作者代码或可下载原始数据。本站未实现 GC-SAGE、硬件测量或论文曲线复现。",
  "statusAfter": "本卡按2026-05-01 v1投稿预印本阅读；未核实接收状态、公开作者代码或可下载原始数据。本站已数值验证二维、单次交互、已知 L=2 的独立缩减 GC-SAGE 估计器；完整多跳算法、硬件测量和论文图5–9仍未复现。"
};
function removeLast(items,key,expected,label){
 const indices=items.flatMap((item,i)=>item[key]===expected[key]?[i]:[]);
 a.deepEqual(indices,[items.length-1],label+' is one appended record');
 a.deepEqual(items.at(-1),expected,label+' has only reviewed fields');items.pop();
}
function withoutGCSAGERegistry(registry){
 const prior=require('./waveform-live-preservation.cjs').withoutWaveformLiveRegistry(require('./atomic-receiver-preservation.cjs').withoutAtomicReceiverRegistry(registry));
 removeLast(prior.units,'id',additions.unit,'GC-SAGE unit');
 removeLast(prior.pages,'path',additions.page,'GC-SAGE page');
 for(const hook of additions.hooks){const d=prior.directions.find(d=>d.id===hook.directionId);a.ok(d);const level=d.levels.find(l=>l.id===hook.levelId);a.ok(level);removeLast(level.items,'href',hook.item,'GC-SAGE '+hook.levelId);}
 return prior;
}
function withoutGCSAGEGuide(data){
 const current=data.cards.some(c=>c.id==='otfs-joint-estimation-2020'&&c.executable)?require('./otfs-receiver-preservation.cjs').withoutOtfsGuides(data):data;
 const prior=require('./atomic-receiver-preservation.cjs').withoutAtomicReceiverGuide(current),matches=prior.cards.filter(c=>c.id===additions.guideId);
 if(!matches.length)return prior;
 a.equal(matches.length,1,'one GC-SAGE guide');const c=matches[0];
 a.equal(Object.keys(c).at(-1),'executable','appended GC-SAGE executable');
 a.deepEqual(c.executable,additions.executable,'exact GC-SAGE execution entry');
 a.equal(c.limits[5],additions.statusAfter,'exact reduced-coverage status');
 a.equal(c.question,additions.questionAfter,'exact per-channel-gain question clarification');
 delete c.executable;c.limits[5]=additions.statusBefore;c.question=additions.questionBefore;return prior;
}
function withoutGCSAGEHomeShell(html,count){
 const current=`<strong>${count}</strong> 个机制实验`,prior=`<strong>${count-1}</strong> 个机制实验`;
 a.equal(html.split(current).length,2,'one current hero count after exact map reversal');return html.replace(current,prior);
}
module.exports={additions,withoutGCSAGERegistry,withoutGCSAGEGuide,withoutGCSAGEHomeShell};
