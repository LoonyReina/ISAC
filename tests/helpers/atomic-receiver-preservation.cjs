'use strict';
// Exact inverse of the reviewed bounded receiver registration and factual coverage changes.
const a=require('node:assert/strict');
const additions={
  "unit": {
    "id": "atomic-ofdm-receiver",
    "title": "参考符号错了，还能分开两条路径吗？",
    "href": "atomic-ofdm-receiver.html#experiment",
    "question": "优化停止了，路径就找全了吗？",
    "prerequisites": [
      "offgrid-range.html#model",
      "reference-uncertainty.html#experiment",
      "foundations.html#ofdm"
    ],
    "group": "research",
    "primaryDirectionId": "receiver",
    "action": "固定同一份新生成的4×4复观测，实际运行式(27)有限Toeplitz SDP的CS-ANL1与e=0对照；回看真实迭代、复误差分离与残差，再独立探索候选阈值和失败计数。"
  },
  "page": {
    "path": "atomic-ofdm-receiver.html",
    "title": "参考符号错了，还能分开两条路径吗？",
    "stage": "experiments",
    "role": "论文算法有界实现 · 4×4连续矩Toeplitz SDP/ADMM与稀疏参考错误估计",
    "prerequisites": [
      "offgrid-range.html#model",
      "reference-uncertainty.html#experiment",
      "foundations.html#ofdm"
    ],
    "next": "reading.html#guide-ofdm-passive-atomic-errors-2017",
    "nextLabel": "回到原文：有限SDP、候选提取与完整BER实验各验证了什么？"
  },
  "hooks": [
    {
      "directionId": "receiver",
      "levelId": "intuition",
      "item": {
        "label": "参考符号错了，误差会被当成路径吗？",
        "href": "atomic-ofdm-receiver.html#question",
        "kind": "lesson",
        "scope": "direction-specific",
        "status": "available",
        "note": "实际求解4×4有限二维Toeplitz SDP并估计稀疏错误；原尺寸16×16证据仅离线，不表示完整图8、原作者检测器或无条件二维原子范数等价已复现。"
      }
    },
    {
      "directionId": "receiver",
      "levelId": "model",
      "item": {
        "label": "复观测、结构化回波与稀疏错误分别是什么？",
        "href": "atomic-ofdm-receiver.html#model",
        "kind": "model",
        "scope": "direction-specific",
        "status": "available",
        "note": "实际求解4×4有限二维Toeplitz SDP并估计稀疏错误；原尺寸16×16证据仅离线，不表示完整图8、原作者检测器或无条件二维原子范数等价已复现。"
      }
    },
    {
      "directionId": "receiver",
      "levelId": "experiment",
      "item": {
        "label": "同观测实际求解两种接收机并回看迭代",
        "href": "atomic-ofdm-receiver.html#experiment",
        "kind": "interactive",
        "scope": "direction-specific",
        "status": "available",
        "note": "实际求解4×4有限二维Toeplitz SDP并估计稀疏错误；原尺寸16×16证据仅离线，不表示完整图8、原作者检测器或无条件二维原子范数等价已复现。"
      }
    },
    {
      "directionId": "receiver",
      "levelId": "papers",
      "item": {
        "label": "2017被动OFDM：式(27)与独立推导更新对照",
        "href": "atomic-ofdm-receiver.html#paper",
        "kind": "paper-guide",
        "scope": "direction-specific",
        "status": "available",
        "note": "实际求解4×4有限二维Toeplitz SDP并估计稀疏错误；原尺寸16×16证据仅离线，不表示完整图8、原作者检测器或无条件二维原子范数等价已复现。"
      }
    },
    {
      "directionId": "receiver",
      "levelId": "limits",
      "item": {
        "label": "收敛、候选数与稀疏错误恢复各有什么边界？",
        "href": "atomic-ofdm-receiver.html#limits",
        "kind": "limits",
        "scope": "direction-specific",
        "status": "available",
        "note": "实际求解4×4有限二维Toeplitz SDP并估计稀疏错误；原尺寸16×16证据仅离线，不表示完整图8、原作者检测器或无条件二维原子范数等价已复现。"
      }
    },
    {
      "directionId": "receiver",
      "levelId": "reproduction",
      "item": {
        "label": "下载新观测、真实双算法结果与迭代记录",
        "href": "atomic-ofdm-receiver.html#reproduce",
        "kind": "reproduction-plan",
        "scope": "direction-specific",
        "status": "available",
        "note": "实际求解4×4有限二维Toeplitz SDP并估计稀疏错误；原尺寸16×16证据仅离线，不表示完整图8、原作者检测器或无条件二维原子范数等价已复现。"
      }
    }
  ],
  "directionCoverage": {"directionId": "receiver", "before": "已有匹配、CFAR、实标量 LS/CRB、递归背景与离格单目标有限网格测距；连续优化、真实信道校准和多目标跟踪尚未实现。", "after": "已有匹配、CFAR、实标量 LS/CRB、递归背景、离格单目标测距与4×4有限二维Toeplitz SDP/ADMM；完整检测、真实信道校准和多目标跟踪尚未实现。"},
  "guideId": "ofdm-passive-atomic-errors-2017",
  "guideChanges": [
    {
      "path": [
        "evidence",
        "kind"
      ],
      "before": "模型与优化算法推导＋数值仿真；本站仅导读，未新增实验",
      "after": "模型与优化算法推导＋原文数值仿真；本站有界真实SDP实现、独立凸求解器对照与原尺寸单例离线数值证据"
    },
    {
      "path": [
        "limits",
        3
      ],
      "before": "这是被动多径参数估计；换成位置和运动速度需要传播几何，不能直接套用单站往返公式。符号内载波间干扰（ICI）、密集错误或未建模路径需另验；本站没有实现该SDP、ADMM或论文曲线。",
      "after": "这是被动多径参数估计；换成位置和运动速度需要传播几何，不能直接套用单站往返公式。符号内载波间干扰（ICI）、密集错误或未建模路径需另验；本站已实现并独立核验式(27)的4×4有限SDP；完整检测、论文曲线及原尺寸实时性仍未验证，二维原子范数等价另需分解条件。"
    },
    {
      "path": [
        "visualTrace",
        "steps",
        3,
        "explanation"
      ],
      "before": "图8减少子载波数并改变路径功率，不能与前面谱图混作同预算实验。未正确识别的目标不进入该 RMSE；错误变密、近邻杂波都会限制方法。被动传播参数转位置与速度还需几何；本站未实现该优化器。",
      "after": "图8减少子载波数并改变路径功率，不能与前面谱图混作同预算实验。未正确识别的目标不进入该 RMSE；错误变密、近邻杂波都会限制方法。被动传播参数转位置与速度还需几何；本站已实现4×4有限SDP的独立有界求解；上述论文统计曲线与完整读出流程仍未复现。"
    }
  ],
  "executable": {
    "kind": "validated-paper-algorithm",
    "coverage": "algorithm",
    "href": "atomic-ofdm-receiver.html#experiment",
    "label": "实际运行：4×4连续矩SDP接收机",
    "summary": "本站已实现并独立核验式(27)的4×4有限二维Toeplitz SDP/ADMM，使用同一新观测比较CS-ANL1和e=0的CS-AN；可回看真实状态、停止残差与阈值候选。另保存16×16原图尺寸的离线同问题求解一致性及首次超时；不是完整图8 BER扫描或原作者检测器复现。",
    "limitations": "网页仅4×4两路径Eq6合成观测，不生成原文直达波和80杂波，也没有实际参考解调、FEC或显著符号内多普勒/ICI。真值不输入优化器或候选提取。 有限二维Toeplitz SDP不被无条件等同于连续原子范数；需另外的分解条件。原16×16数值解未满足容易检验的rank(T)<16充分条件，不据此断言不等价。 公开推导修正原文共轭、维度、零时滞索引、联合块更新与双变量归一化的表观不一致；以独立式(27)凸解为准，不声称知道原作者代码如何实现。 64×64采样双谱与0.995阈值是声明的教学后处理，不是优化字典网格、连续双可行性证书或原作者检测器；阈值及匹配计数和SDP收敛分开。 16×16单例首次300秒超时后，同状态续算总596.449秒达到数值停止条件；e=0原尺寸对照450秒仍超时。离线数值一致性不等于完整图8 BER曲线、统计检出/虚警性能或桌面实时性。 原文未给齐随机种子、误比特机制、检测与MUSIC阶数阈值、归一化和ADMM停止设置。完整图6–8仍开放，不能由已有先修匹配器代替。",
    "sourceLocators": [
      "v2 §II-A，式(6)–(11)：观测算子",
      "v2 §III-A，式(27)：有限二维Toeplitz SDP",
      "v2 §IV，式(35)、(40)–(50)与表I：打印式及独立联合块推导",
      "v2 §V-A/B，图6–8、第19页统计设置；非完整统计复现"
    ]
  }
};
function removeLast(items,key,expected,label){const indices=items.flatMap((v,i)=>v[key]===expected[key]?[i]:[]);a.deepEqual(indices,[items.length-1],label+' is one appended record');a.deepEqual(items.at(-1),expected,label+' exact fields');items.pop();}
function withoutAtomicReceiverRegistry(registry){const prior=registry.units.some(u=>u.id==='otfs-receiver')?require('./otfs-receiver-preservation.cjs').withoutOtfsRegistry(registry):structuredClone(registry);removeLast(prior.units,'id',additions.unit,'atomic unit');removeLast(prior.pages,'path',additions.page,'atomic page');for(const h of additions.hooks){const d=prior.directions.find(d=>d.id===h.directionId);a.ok(d);const l=d.levels.find(l=>l.id===h.levelId);a.ok(l);removeLast(l.items,'href',h.item,'atomic '+h.levelId);}const d=prior.directions.find(d=>d.id===additions.directionCoverage.directionId);a.equal(d.coverage,additions.directionCoverage.after,'exact finite-SDP direction scope');d.coverage=additions.directionCoverage.before;return prior;}
function withoutAtomicReceiverGuide(data){const prior=structuredClone(data),matches=prior.cards.filter(c=>c.id===additions.guideId);if(!matches.length)return prior;a.equal(matches.length,1,'one atomic guide');const c=matches[0];a.equal(Object.keys(c).at(-1),'executable','appended atomic executable');a.deepEqual(c.executable,additions.executable);delete c.executable;for(const change of additions.guideChanges){let parent=c;for(const k of change.path.slice(0,-1))parent=parent[k];const k=change.path.at(-1);a.equal(parent[k],change.after,'exact atomic status '+change.path.join('.'));parent[k]=change.before;}return prior;}
function withoutAtomicReceiverHomeShell(html,count){const current=`<strong>${count}</strong> 个机制实验`,prior=`<strong>${count-1}</strong> 个机制实验`;a.equal(html.split(current).length,2,'one exact current lesson count');return html.replace(current,prior);}
module.exports={additions,withoutAtomicReceiverRegistry,withoutAtomicReceiverGuide,withoutAtomicReceiverHomeShell};
