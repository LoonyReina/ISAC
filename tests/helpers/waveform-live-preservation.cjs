'use strict';
// Exact inverse of the reviewed waveform live-status metadata and renderer hooks.
// Scientific source/version, source metrics and all unrelated bytes retain their historical guards.
const a=require('node:assert/strict');
const additions={
  "caseId": "case-waveform",
  "catalogId": "optimal_waveform",
  "registryChanges": [
    {
      "path": [
        "fields",
        "交互机制"
      ],
      "before": "选择通道与正定参考协方差，在相同功率、样本数和方向图下比较固定 DFT 与严格全局最优波形。",
      "after": "从当前 H、S、R 和维度现场求解严格协方差 Procrustes；与共享同一协方差和块能量的 DFT 参考比较。输入改变立即使旧结果失效，可取消并导出实际矩阵和约束账本。"
    },
    {
      "path": [
        "fields",
        "结论边界"
      ],
      "before": "只优化确定性 ||HX−S||²；相同空间协方差不等于相同延迟–多普勒性能。无噪声、BER、容量、CRB 或常模结论。",
      "after": "全局最优仅指确定性总 MUI ||HX−S||²；高斯对数速率只是二级诊断，不是 QPSK 互信息、BER 或实测吞吐。相同空间协方差不等于相同延迟–多普勒性能；完整原图与其余算法分支仍开放。"
    },
    {
      "path": [
        "fields",
        "证据类型"
      ],
      "before": "<a href=\"https://arxiv.org/pdf/1711.05220v1\">2018 波形设计论文的固定预印本 v1</a>：理论与仿真；本站：有限状态精确线性代数与全局下界。",
      "after": "<a href=\"https://arxiv.org/pdf/1711.05220v1\">2018 波形设计论文的固定预印本 v1</a>：理论与仿真；本站已独立数值验证新输入严格协方差算法核心，另保留27组离线历史状态。"
    },
    {
      "path": [
        "paperComparison",
        "metrics"
      ],
      "before": [
        "确定性符号误差 E/(KL)",
        "原始空间功率 aᴴRₓa",
        "块能量 ||X||² 与协方差残差",
        "目标值与全局下界之差"
      ],
      "after": [
        "实际总 MUI 与 E/(KL)",
        "原始空间功率 aᴴRₓa",
        "块能量 ||X||² 与完整协方差相对残差",
        "带符号全局下界差与认证容差",
        "附阈值的数值秩与结构性零方向数",
        "逐用户有限块高斯对数速率诊断；不代表速率最优或真实互信息"
      ]
    },
    {
      "path": [
        "paperComparison",
        "omittedMechanisms"
      ],
      "before": [
        "原文 N=16、L=20、K=4 与三方向协方差设计",
        "噪声、速率、BER、延迟–多普勒性能",
        "加权信赖域和常模约束"
      ],
      "after": [
        "原文三方向雷达协方差设计器与完整图3–4平均/基线设置",
        "原文 ZF 归一化及接收约定；BER、物理信道/噪声样本和延迟–多普勒性能",
        "加权信赖域和常模分支限界算法"
      ]
    },
    {
      "path": [
        "paperComparison",
        "resourceBudget",
        "aperture"
      ],
      "before": "四阵元、间距 λ/2，孔径 3λ/2",
      "after": "N 阵元、间距 λ/2，孔径 (N−1)λ/2"
    },
    {
      "path": [
        "paperComparison",
        "resourceBudget",
        "duration"
      ],
      "before": "L=8；不指定物理采样周期",
      "after": "L∈[N,64]；仅快拍个数，不指定物理采样周期"
    },
    {
      "path": [
        "paperComparison",
        "resourceBudget",
        "energy"
      ],
      "before": "LPₜ=8，归一化块能量",
      "after": "L tr(R)，归一化块能量；默认8，原文全向参数20"
    },
    {
      "path": [
        "paperComparison",
        "resourceBudget",
        "other"
      ],
      "before": [],
      "after": [
        "两方案共享当前矩阵与总能量；DFT 行正交参考是独立教学基线，不冒充原文全部比较方法"
      ]
    },
    {
      "path": [
        "paperComparison",
        "resourceBudget",
        "priorKnowledge"
      ],
      "before": "精确已知 H、S、目标 R_d",
      "after": "精确已知 H、S、正定目标 R；L≥N"
    },
    {
      "path": [
        "paperComparison",
        "resourceBudget",
        "summary"
      ],
      "before": "本站 N=4、K=2、L=8、Pₜ=1，半波长 ULA、单位 QPSK。每个状态的参考与最优共享 H、S、R_d 和总能量8；只改变时间方向。未定义物理带宽、样本周期或 RF 载频，归一化复基带单位。",
      "after": "现场教学 N≤16、K≤8、N≤L≤64；默认 N=4、K=2、L=8、Pₜ=1；原文全向参数 N=16、K=4、L=20、Pₜ=1。生成器 H 为未行归一化 iid CN(0,1)，S 为单位功率 QPSK，R=(Pₜ/N)[(1−β)I+βaaᴴ]、0≤β≤0.95。参考与严格解共享实际 H、S、R、N、K、L 与 LPₜ；手工输入按 tr(R) 与实际账本核对。半波长 ULA、归一化复基带，未指定物理带宽/周期/RF载频。"
    },
    {
      "path": [
        "paperComparison",
        "siteArtifactType"
      ],
      "before": "严格协方差 Procrustes 的独立合成机制实现；27 个有限状态与全局下界核验，非原图复现",
      "after": "新输入严格协方差核心及独立数值核验；Worker 教学入口与约束/误差账本；另保留27组明确标注的离线历史状态。不是完整原图或整篇论文复现。"
    },
    {
      "path": [
        "paperComparison",
        "verificationNote"
      ],
      "before": "2026-10-10 核对固定 v1 严格设计机制；独立复数推导、双实现数值检查与小规模约束求解交叉验证，不代表完整论文复现",
      "after": "2026-10-10 核对固定 v1 严格设计机制；独立复数推导、双实现数值检查与小规模约束求解交叉验证，不代表完整论文复现；2026-10-12另完成严格分支新输入 JavaScript 核心和独立参考核验；原文全向参数切片有披露的自定种子/试验数，不视为完整图3–4复现。"
    }
  ],
  "catalogChanges": [
    {
      "path": [
        "evidenceBoundary"
      ],
      "before": "理论与数值仿真；独立教学简化不等于原论文完整优化器复现。",
      "after": "理论与数值仿真；本站已数值验证固定 v1 §III 式(8)–(15)的严格协方差分支。全局最优仅针对确定性总 MUI；高斯对数速率为二级诊断，不等于 QPSK 互信息、BER 或吞吐。其余分支与完整原图仍待复现。"
    },
    {
      "path": [
        "executionStatus"
      ],
      "added": true,
      "after": {
        "status": "validated-algorithm-core",
        "scope": "严格协方差分支"
      }
    },
    {
      "path": [
        "readingPlan"
      ],
      "before": "阅读时先明确通信误差与雷达协方差各自的作用，再对照原文的目标函数与约束；教学案例的具体保留范围以案例原文对照为准。",
      "after": "先用当前 H、S、R 运行严格分支，检查协方差、全局下界与逐用户误差，再回原文区分方向性协方差设计、加权权衡和常模分支；现场全向参数切片不等于完整图3–4。"
    }
  ],
  "rendererHooks": [
    {
      "before": "function renderResearchDirectory(data, registry, exists, validationContext){\n",
      "after": "// Optional algorithm status is local teaching coverage, never a citation or whole-paper claim.\nfunction executionStatus(card){\n if(!Object.hasOwn(card,'executionStatus'))return '独立机制模型，非完整论文复现';\n const e=card.executionStatus;\n if(!e||typeof e!=='object'||Array.isArray(e)||Object.keys(e).sort().join(',')!=='scope,status'||e.status!=='validated-algorithm-core'||typeof e.scope!=='string'||!e.scope.trim()||e.scope.length>100)throw new Error('Invalid catalog execution status');\n return esc(e.scope)+'：算法核心已数值验证；非完整论文复现';\n}\nfunction renderResearchDirectory(data, registry, exists, validationContext){\n"
    },
    {
      "before": " const learningEntries=createLearningEntryResolver(registry,validationContext);\n",
      "after": " const learningEntries=createLearningEntryResolver(registry,validationContext);\n for(const card of data.cards)executionStatus(card);\n"
    },
    {
      "before": "'进入教学案例 →')}<span>独立机制模型，非完整论文复现</span></p>`;",
      "after": "'进入教学案例 →')}<span>${executionStatus(card)}</span></p>`;"
    }
  ]
};
function reverse(target,changes){for(const item of changes){let parent=target;for(const key of item.path.slice(0,-1)){a.ok(parent&&typeof parent==='object');parent=parent[key];}const key=item.path.at(-1);a.ok(Object.hasOwn(parent,key),'reviewed waveform field present');a.deepEqual(parent[key],item.after,'exact reviewed waveform '+item.path.join('.'));if(item.added)delete parent[key];else parent[key]=structuredClone(item.before);}}
function withoutWaveformLiveRegistry(registry){const prior=require('./combined-paper-solvers-preservation.cjs').withoutCombinedRegistry(registry),matches=prior.cases.filter(c=>c.id===additions.caseId);a.equal(matches.length,1,'one waveform case');reverse(matches[0],additions.registryChanges);return prior;}
function withoutWaveformLiveCatalog(data){const prior=require('./combined-paper-solvers-preservation.cjs').withoutCombinedCatalog(data),matches=prior.cards.filter(c=>c.id===additions.catalogId);a.equal(matches.length,1,'one waveform catalog card');reverse(matches[0],additions.catalogChanges);return prior;}
function withoutWaveformLiveRenderer(source){let last=-1;for(const h of additions.rendererHooks){a.equal(source.split(h.after).length,2,'exact waveform execution renderer hook');const at=source.indexOf(h.after);a.ok(at>last,'waveform renderer hook order');last=at;}for(const h of additions.rendererHooks)source=source.replace(h.after,()=>h.before);return source;}
const priorCatalogSource=data=>JSON.stringify(withoutWaveformLiveCatalog(data),null,2)+'\n';
module.exports={additions,withoutWaveformLiveRegistry,withoutWaveformLiveCatalog,withoutWaveformLiveRenderer,priorCatalogSource};
