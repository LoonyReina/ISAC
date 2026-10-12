'use strict';
// Exact inverse of bounded solver coverage edits; no migration/hash exemptions.
const a=require('node:assert/strict');
const changes={
  "registry": [
    {
      "collection": "cases",
      "idKey": "id",
      "id": "case-waveform",
      "changes": [
        {
          "path": [
            "fields",
            "交互机制"
          ],
          "before": "从当前 H、S、R 和维度现场求解严格协方差 Procrustes；与共享同一协方差和块能量的 DFT 参考比较。输入改变立即使旧结果失效，可取消并导出实际矩阵和约束账本。",
          "after": "用同一份新 H、S、R 先求严格协方差解 X₀，再求 §IV 加权权衡或扫描 ρ；后一步保留总能量等式，但放松协方差等式。DFT 只作严格分支基线，不是加权距离中的 X₀。可取消、重算并导出实际矩阵与证书。"
        },
        {
          "path": [
            "fields",
            "证据类型"
          ],
          "before": "<a href=\"https://arxiv.org/pdf/1711.05220v1\">2018 波形设计论文的固定预印本 v1</a>：理论与仿真；本站已独立数值验证新输入严格协方差算法核心，另保留27组离线历史状态。",
          "after": "<a href=\"https://arxiv.org/pdf/1711.05220v1\">2018 波形设计论文的固定预印本 v1</a>：理论与仿真；本站已独立数值验证 §III 严格协方差与 §IV 加权算法，保留27组离线历史状态。加权教学的真实浏览器验收仍开放。"
        },
        {
          "path": [
            "fields",
            "结论边界"
          ],
          "before": "全局最优仅指确定性总 MUI ||HX−S||²；高斯对数速率只是二级诊断，不是 QPSK 互信息、BER 或实测吞吐。相同空间协方差不等于相同延迟–多普勒性能；完整原图与其余算法分支仍开放。",
          "after": "严格分支最小化固定协方差下的总 MUI；加权分支优化 ρ||HX−S||²+(1−ρ)||X−X₀||²，使用更宽的等能量可行集合。高斯对数速率仅为诊断，不是 QPSK 互信息、BER 或吞吐；原图3加权曲线仍未吻合，常模与完整论文仍开放。"
        },
        {
          "path": [
            "paperComparison",
            "siteArtifactType"
          ],
          "before": "新输入严格协方差核心及独立数值核验；Worker 教学入口与约束/误差账本；另保留27组明确标注的离线历史状态。不是完整原图或整篇论文复现。",
          "after": "新输入 §III 严格协方差及 §IV 等能量加权核心、独立数值核验和同输入 Worker 教学；另保留27组离线历史状态。加权真实浏览器验收仍开放，原图3加权曲线非匹配，非整篇复现。"
        },
        {
          "path": [
            "paperComparison",
            "metrics"
          ],
          "before": [
            "实际总 MUI 与 E/(KL)",
            "原始空间功率 aᴴRₓa",
            "块能量 ||X||² 与完整协方差相对残差",
            "带符号全局下界差与认证容差",
            "附阈值的数值秩与结构性零方向数",
            "逐用户有限块高斯对数速率诊断；不代表速率最优或真实互信息"
          ],
          "after": [
            "实际总 MUI 与 E/(KL)",
            "原始空间功率 aᴴRₓa",
            "块能量 ||X||² 与完整协方差相对残差",
            "带符号全局下界差与认证容差",
            "附阈值的数值秩与结构性零方向数",
            "逐用户有限块高斯对数速率诊断；不代表速率最优或真实互信息",
            "§IV 原始加权目标、总 MUI、到实际严格解 X₀ 的波形距离",
            "§IV 总能量等式残差、KKT 残差和浮点全局差距证书；协方差变化不是本分支约束违例"
          ]
        },
        {
          "path": [
            "paperComparison",
            "unknowns"
          ],
          "before": [
            "未复现原文图3–4的通信性能或多方向雷达设计",
            "未实现加权权衡、常模分支定界或硬件模型"
          ],
          "after": [
            "原图3加权曲线未数值吻合；完整图3–6、原文平均与ZF约定仍待复现",
            "常模/相似性分支定界、方向性参考设计与硬件模型未实现",
            "加权教学的实际托管浏览器交互、下载、窄屏与延迟验收仍开放"
          ]
        },
        {
          "path": [
            "paperComparison",
            "locator",
            "summary"
          ],
          "before": "v1 §II 式(1)–(7)；§III 式(8)–(15)；§VI 图3–4。§IV–V 仅作为未实现边界",
          "after": "v1 §II 式(1)–(7)；§III 式(8)–(15)；§IV 式(16)–(25)、算法1；§VI 图3–6。§V 常模仅作为未实现边界"
        },
        {
          "path": [
            "paperComparison",
            "locator",
            "section"
          ],
          "before": "§II–III、§VI",
          "after": "§II–IV、§VI"
        },
        {
          "path": [
            "paperComparison",
            "locator",
            "figure"
          ],
          "before": "图3–4",
          "after": "图3–6；图3加权曲线非匹配"
        },
        {
          "path": [
            "paperComparison",
            "locator",
            "equation"
          ],
          "before": "式(8)–(15)",
          "after": "式(8)–(25)"
        },
        {
          "path": [
            "paperComparison",
            "retainedAssumptions"
          ],
          "before": [
            "H、S 已知的窄带下行复基带模型",
            "固定发射协方差与总功率",
            "L≥N、正定 R_d 的 Procrustes 闭式解"
          ],
          "after": [
            "H、S 已知的窄带下行复基带模型",
            "固定发射协方差与总功率",
            "L≥N、正定 R_d 的 Procrustes 闭式解",
            "§IV 共享当前 H、S 与严格解 X₀；保持 ||X||²=L tr(R)，不再要求 XXᴴ/L=R",
            "ρ=1 的 radar-closest 是明确声明的二级选择规则；canonical 端点也保留，不归于原文唯一解"
          ]
        },
        {
          "path": [
            "paperComparison",
            "omittedMechanisms"
          ],
          "before": [
            "原文三方向雷达协方差设计器与完整图3–4平均/基线设置",
            "原文 ZF 归一化及接收约定；BER、物理信道/噪声样本和延迟–多普勒性能",
            "加权信赖域和常模分支限界算法"
          ],
          "after": [
            "原文三方向雷达协方差设计器与完整图3–6平均/基线设置",
            "原文 ZF 归一化及接收约定；BER、物理信道/噪声样本和延迟–多普勒性能",
            "常模与相似性分支限界算法；完整论文复现"
          ]
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "summary"
          ],
          "before": "现场教学 N≤16、K≤8、N≤L≤64；默认 N=4、K=2、L=8、Pₜ=1；原文全向参数 N=16、K=4、L=20、Pₜ=1。生成器 H 为未行归一化 iid CN(0,1)，S 为单位功率 QPSK，R=(Pₜ/N)[(1−β)I+βaaᴴ]、0≤β≤0.95。参考与严格解共享实际 H、S、R、N、K、L 与 LPₜ；手工输入按 tr(R) 与实际账本核对。半波长 ULA、归一化复基带，未指定物理带宽/周期/RF载频。",
          "after": "现场教学 N≤16、K≤8、N≤L≤64；默认 N=4、K=2、L=8、Pₜ=1；原文全向参数 N=16、K=4、L=20、Pₜ=1。生成器 H 为未行归一化 iid CN(0,1)，S 为单位功率 QPSK，R=(Pₜ/N)[(1−β)I+βaaᴴ]、0≤β≤0.95。参考与严格解共享实际 H、S、R、N、K、L 与 LPₜ；手工输入按 tr(R) 与实际账本核对。半波长 ULA、归一化复基带，未指定物理带宽/周期/RF载频。 §IV 复用严格解 X₀ 与同一实际 H/S/块能量；仅放松协方差等式，ρ 不是功率分配比例。加权数值范围另作有界检查，不缩窄既有严格分支。"
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "other"
          ],
          "before": [
            "两方案共享当前矩阵与总能量；DFT 行正交参考是独立教学基线，不冒充原文全部比较方法"
          ],
          "after": [
            "两方案共享当前矩阵与总能量；DFT 行正交参考是独立教学基线，不冒充原文全部比较方法",
            "加权与严格解有不同约束集合；不能声称同协方差条件下加权优于严格全局解",
            "原尺寸离线加权切片256对试验、ρ=.1，原图3曲线仍未吻合；不加载为现场计算"
          ]
        },
        {
          "path": [
            "paperComparison",
            "verificationNote"
          ],
          "before": "2026-10-10 核对固定 v1 严格设计机制；独立复数推导、双实现数值检查与小规模约束求解交叉验证，不代表完整论文复现；2026-10-12另完成严格分支新输入 JavaScript 核心和独立参考核验；原文全向参数切片有披露的自定种子/试验数，不视为完整图3–4复现。",
          "after": "2026-10-10 核对固定 v1 严格设计机制；独立复数推导、双实现数值检查与小规模约束求解交叉验证，不代表完整论文复现；2026-10-12另完成严格分支新输入 JavaScript 核心和独立参考核验；原文全向参数切片有披露的自定种子/试验数，不视为完整图3–4复现。 2026-10-12 §IV Python与JavaScript独立数值门通过；Fig.3加权非匹配和两种端点约定保留。新增Worker/DOM检查不等于真实浏览器验收。"
        }
      ]
    },
    {
      "collection": "cases",
      "idKey": "id",
      "id": "case-joint-beamforming",
      "changes": [
        {
          "path": [
            "fields",
            "交互机制"
          ],
          "before": "在相同八阵元、孔径、总功率、每天线平均功率与用户信道下，比较通信流、独立雷达流与解析零干扰构造。改变信道混合比例 η；门槛 Γ 仅检查当前构造是否满足。",
          "after": "对当前 M=10、K=2 的复信道 H 与硬 SINR 门槛 Γ，实际运行雷达独立式(15)、SDR式(32)与优化型ZF式(40)，核对恢复因子、约束残差和真实迭代；原八阵元解析构造另留作先修。"
        },
        {
          "path": [
            "fields",
            "证据类型"
          ],
          "before": "<a href=\"https://arxiv.org/abs/1912.03420v2\">2020 联合发射波束论文，固定预印本 v2</a>：理论与仿真；本站：确定性复数矩阵与解析合成机制，不运行 SDR 或原文优化型 ZF。",
          "after": "<a href=\"https://arxiv.org/abs/1912.03420v2\">2020 联合发射波束论文，固定预印本 v2</a>：理论与仿真；本站有界协方差优化器和独立数值参考，另有32个配对信道的离线选定实验。真实浏览器验收仍开放。"
        },
        {
          "path": [
            "fields",
            "结论边界"
          ],
          "before": "协方差秩不等于波束峰数；同一发射协方差不决定用户的期望信号与雷达干扰分配。构造未通过门槛不证明一般优化问题无解；本站没有复现原文曲线或雷达接收机。",
          "after": "有界数值求解或32信道离线切片不等于完整原图。达到迭代上限只表示未解决，不能推断不可行；协方差秩不等于波束峰数。1000信道、K=4/6、SSP与雷达接收机仍开放。"
        },
        {
          "path": [
            "fields",
            "下一研究问题"
          ],
          "before": "换成一般信道后，保持同一雷达协方差的零干扰分解还存在吗？如何在硬 SINR 约束下优化雷达损失？",
          "after": "固定相同 H 和每天线功率，提高 Γ 时哪些约束变紧？ZF 附加零干扰条件何时有代价，未收敛时又能得出什么？"
        },
        {
          "path": [
            "paperComparison",
            "researchQuestion"
          ],
          "before": "论文优化通信与独立雷达流的预编码，在每天线平均功率与各用户硬 SINR 约束下最小化雷达损失；本站用三个解析构造解释协方差自由度、方向互相关与用户干扰之间的关系。",
          "after": "在每天线平均功率与各用户硬 SINR 约束下最小化原文雷达损失；比较同模型雷达独立最优、SDR及额外零干扰约束的优化型ZF，并区分求解状态与可行性证据。"
        },
        {
          "path": [
            "paperComparison",
            "siteArtifactType"
          ],
          "before": "确定性解析合成机制；三个预编码构造与固定资源比较，非 SDR/ZF 优化器、非原图复现",
          "after": "新输入 M=10/K=2 的实际雷达独立/SDR/优化型ZF协方差求解与因子恢复；独立数值核验和32信道离线配对切片。旧M=8解析构造保留为先修；非完整原图或整篇复现，真实浏览器门仍开放。"
        },
        {
          "path": [
            "paperComparison",
            "omittedMechanisms"
          ],
          "before": [
            "没有求解原文式(26)/(40)，未运行 SDR、秩一恢复、CVX 或优化型 ZF",
            "没有复现 SSP 基线、随机 Rayleigh 信道 Monte Carlo、速率或可行率曲线",
            "没有实现有限 QPSK 样本块、目标回波、Capon 估计、检测、CRB 或硬件",
            "本站 Rstar 是解析参考协方差，不是原文雷达独立优化得到的 R0；方向图误差不是原文式(46)数值"
          ],
          "after": [
            "原文1000信道统计、K=4/6和SSP对照未完成",
            "有限QPSK样本、目标回波、Capon估计、检测、CRB或硬件未实现",
            "现场有界迭代可能未收敛；不把iteration_limit或ZF失败解释为SDR不可行",
            "真实托管浏览器交互、下载回放、窄屏与控制到结果延迟仍待验收"
          ]
        },
        {
          "path": [
            "paperComparison",
            "metrics"
          ],
          "before": [
            "原始角功率 aᴴRa 与相对解析 Rstar 的网格 MSE",
            "协方差特征值、数值秩与到 Rstar 的 Frobenius 残差",
            "三个目标方向间归一化互相关幅度；不把秩等同于波束峰数",
            "每用户 D / Iu / Ir / σ²、SINR 与最差用户 SINR",
            "总平均功率、逐天线平均功率与零干扰残差"
          ],
          "after": [
            "原文式(14)雷达损失：方向图拟合与目标方向互相关",
            "相对同模型优化雷达独立解的式(46)方向图MSE；与式(14)区分",
            "恢复因子的每用户期望信号/通信干扰/雷达干扰/噪声与SINR",
            "PSD、每天线功率、恢复因子、ZF零干扰、原始/对偶与停止残差",
            "真实迭代、取消或未解决状态与每个方案的数值预算"
          ]
        },
        {
          "path": [
            "paperComparison",
            "unknowns"
          ],
          "before": [
            "未复现原文优化数值结果、1000 信道试验或 SDR–ZF 性能差距",
            "一般信道与目标协方差下能否保持雷达性能并满足 ZF/SINR，需另行求解",
            "没有实际雷达接收机的估计精度、检出率或实测证据"
          ],
          "after": [
            "32信道×11门槛切片与原文1000信道、K=4/6及SSP并不等价",
            "无实际雷达接收机估计精度、检出率或实测证据",
            "新优化器的托管浏览器执行与延迟未验证；Node耗时不是浏览器时延"
          ]
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "summary"
          ],
          "before": "本站 M=8、K=2、Pt=1、σ²=.01，半波长 ULA，孔径 7λ/2，每天线平均功率1/8；−30°/0°/30°解析空间模式，角网格−90°:0.1°:90°。η 默认 .8，改变时三构造共享当前 H；A/B 固定预编码，C 按精确 CSI 解析调整。原文 M=10、Pt=1、σ²=.01、K=2/4/6、Γ=4–24 dB、1000 随机信道、QPSK N=1024、CVX；两者不作原图等价比较。",
          "after": "现场主实验 M=10、K=2、Pt=1、σ²=.01、半波长ULA、每天线功率.1；目标−40°/0°/40°、含端点10°波束、角网格−90°:0.1°:90°共1801点，303个目标点。Γ=4–24dB；同次三方案共享阵列/功率/目标模型，SDR与ZF共享H/Γ。雷达独立式(15)不依赖H/Γ，仅可明确复用已验收同模型结果。原文1000信道、K=4/6、SSP和QPSK N=1024未完成。旧M=8解析先修独立标注，不能混作同预算优化结果。"
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "energy"
          ],
          "before": "归一化总平均功率 Pt=1，每天线1/8；未定义有限样本块能量",
          "after": "归一化总平均功率Pt=1，每天线.1；无有限样本块能量"
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "aperture"
          ],
          "before": "本站八阵元 λ/2 ULA，7λ/2；原文十阵元，9λ/2",
          "after": "十阵元λ/2 ULA，9λ/2；旧解析先修八阵元7λ/2单列"
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "priorKnowledge"
          ],
          "before": "精确已知即时 H、阵列响应与源流二阶矩；用户不能消除未知雷达符号",
          "after": "精确已知即时H、阵列响应与源流二阶矩；用户不能消除未知雷达符号"
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "other"
          ],
          "before": [
            "默认 Γ=12 dB；改变 Γ 只检查构造，不重新优化",
            "未指定物理 RF 载频或带宽；以波长和归一化功率为单位"
          ],
          "after": [
            "改变H/Γ重新求解SDR/ZF；同模型雷达独立缓存须标明来源，不能当成新算",
            "离线32配对信道使用声明的PCG64种子；各门槛成功对数、失败与后续精炼均保留",
            "未指定物理RF载频或带宽；以波长和归一化平均功率为单位"
          ]
        },
        {
          "path": [
            "paperComparison",
            "verificationNote"
          ],
          "before": "2026-10-10 原文研究交接核对固定 v2 §II–VI 与附录；解析机制经独立复数线性代数核查。本文原理对照与合成数值不是论文优化器或完整仿真复现。",
          "after": "2026-10-10 原文研究交接核对固定 v2 §II–VI 与附录；解析机制经独立复数线性代数核查。本文原理对照与合成数值不是论文优化器或完整仿真复现。 2026-10-12独立原网格参考与有界JavaScript核心验证通过，式(15)/(32)/(40)及恢复实际执行；选定离线切片32信道×11门槛，保留全部704首次尝试和135精炼。真实浏览器验收尚未建立。"
        }
      ]
    },
    {
      "collection": "units",
      "idKey": "id",
      "id": "waveform-design",
      "changes": [
        {
          "path": [
            "action"
          ],
          "before": "固定资源改变 H、β 或方向，比较实际复数波形、HX 与全局下界。",
          "after": "先从新H/S/R求严格解X₀，再固定同输入和总能量改变ρ求加权权衡；比较误差、波形距离、约束变化和数值证书。"
        }
      ]
    },
    {
      "collection": "units",
      "idKey": "id",
      "id": "joint-beamforming",
      "changes": [
        {
          "path": [
            "question"
          ],
          "before": "方向图相同，为什么用户 SINR 仍会不同？",
          "after": "提高用户SINR门槛，雷达损失和求解状态怎样变化？"
        },
        {
          "path": [
            "action"
          ],
          "before": "比较三个同资源解析构造；改变信道混合比例，核对协方差、方向互相关和每用户信号/干扰功率。",
          "after": "固定新H与硬SINR门槛Γ，实际求解雷达独立、SDR与优化型ZF；比较原始损失、恢复因子、真实残差和未收敛状态。"
        }
      ]
    },
    {
      "collection": "pages",
      "idKey": "path",
      "id": "waveform-design.html",
      "changes": [
        {
          "path": [
            "role"
          ],
          "before": "研究主题 · 严格协方差最优波形与原文对照",
          "after": "研究主题 · 严格协方差到等能量加权波形"
        }
      ]
    },
    {
      "collection": "pages",
      "idKey": "path",
      "id": "joint-beamforming.html",
      "changes": [
        {
          "path": [
            "role"
          ],
          "before": "研究主题 · 联合预编码解析机制与原文对照",
          "after": "研究主题 · 实际SDR/优化型ZF与因子验收"
        }
      ]
    },
    {
      "collection": "directions",
      "idKey": "id",
      "id": "waveforms",
      "changes": [
        {
          "path": [
            "scope"
          ],
          "before": "发射信号、调制坐标、导频歧义、训练序列复用与严格协方差波形优化；新增 OTFS 原文导读；完整 OTFS 收发机实验仍待实现。",
          "after": "发射信号、调制坐标、导频歧义、训练序列复用、严格协方差与等能量加权波形优化；新增 OTFS 原文导读；完整 OTFS 收发机实验仍待实现。"
        },
        {
          "path": [
            "levels",
            2,
            "items",
            1,
            "label"
          ],
          "before": "严格协方差的最优波形实验",
          "after": "先求严格解，再固定能量求加权权衡"
        }
      ]
    },
    {
      "collection": "directions",
      "idKey": "id",
      "id": "tradeoffs",
      "changes": [
        {
          "path": [
            "levels",
            2,
            "items",
            4,
            "label"
          ],
          "before": "相同协方差下拆开用户信号与雷达干扰",
          "after": "实际求解同模型雷达独立、SDR与优化型ZF"
        },
        {
          "path": [
            "levels",
            4,
            "items",
            2,
            "label"
          ],
          "before": "构造未过 SINR 门槛不等于问题无解",
          "after": "未收敛不是不可行；局部数值门不等于整篇复现"
        }
      ]
    },
    {
      "collection": "directions",
      "idKey": "id",
      "id": "spatial",
      "changes": [
        {
          "path": [
            "levels",
            2,
            "items",
            2,
            "label"
          ],
          "before": "同资源比较通信、雷达与联合预编码",
          "after": "实际求解同模型雷达独立、SDR与优化型ZF"
        },
        {
          "path": [
            "levels",
            4,
            "items",
            2,
            "label"
          ],
          "before": "秩不是波束数，解析零干扰不是优化器",
          "after": "未收敛不是不可行；局部数值门不等于整篇复现"
        },
        {
          "path": [
            "levels",
            5,
            "items",
            1,
            "label"
          ],
          "before": "复核协方差恒等式与信号/干扰分解",
          "after": "导出实际求解、约束残差与因子并独立复核"
        },
        {
          "path": [
            "levels",
            5,
            "items",
            1,
            "note"
          ],
          "before": "确定性合成机制的复核步骤，不表示整篇论文已复现",
          "after": "有界真实协方差优化与32信道离线切片；1000信道、完整雷达接收机和浏览器门仍开放"
        }
      ]
    }
  ],
  "catalog": [
    {
      "collection": "cards",
      "idKey": "id",
      "id": "optimal_waveform",
      "changes": [
        {
          "path": [
            "evidenceBoundary"
          ],
          "before": "理论与数值仿真；本站已数值验证固定 v1 §III 式(8)–(15)的严格协方差分支。全局最优仅针对确定性总 MUI；高斯对数速率为二级诊断，不等于 QPSK 互信息、BER 或吞吐。其余分支与完整原图仍待复现。",
          "after": "理论与数值仿真；本站已独立数值验证固定v1 §III严格协方差及§IV等能量加权算法。两阶段约束不同，高斯对数速率只是诊断；原图3加权曲线仍非匹配，常模与完整原图仍开放。新增加权托管浏览器验收待完成。"
        },
        {
          "path": [
            "readingPlan"
          ],
          "before": "先用当前 H、S、R 运行严格分支，检查协方差、全局下界与逐用户误差，再回原文区分方向性协方差设计、加权权衡和常模分支；现场全向参数切片不等于完整图3–4。",
          "after": "先用新H/S/R求严格解X₀，再在同输入和总能量下改变ρ，明确协方差等式已放松；核对能量和目标证书后比较MUI与波形距离。读原图3非匹配、端点多解和常模缺口，不能把离线曲线当现场计算。"
        },
        {
          "path": [
            "executionStatus",
            "scope"
          ],
          "before": "严格协方差分支",
          "after": "严格协方差与§IV等能量加权分支"
        }
      ]
    },
    {
      "collection": "cards",
      "idKey": "id",
      "id": "joint_beamforming",
      "changes": [
        {
          "path": [
            "evidenceBoundary"
          ],
          "before": "理论与仿真；更大自由度不代表任意约束下都能同时提升两种性能。",
          "after": "理论与仿真；本站实际求解有界M=10/K=2雷达独立、SDR与优化型ZF并恢复因子，已有独立数值核验及32配对信道离线切片。1000信道、K=4/6、SSP、雷达接收机与真实浏览器门仍开放。"
        },
        {
          "path": [
            "readingPlan"
          ],
          "before": "先比较三个同资源解析构造，再对照固定 v2 的流协方差、SINR 约束、紧 SDR 和优化型 ZF；本站未运行原文优化器或复现原图。",
          "after": "先辨认H、Γ、每天线功率与三类流，再实际运行同模型雷达独立、SDR和优化型ZF，查看恢复因子与残差。原八阵元解析构造另作先修；iteration_limit只表示未解决，不是不可行证明。"
        },
        {
          "path": [
            "executionStatus"
          ],
          "added": true,
          "after": {
            "status": "validated-algorithm-core",
            "scope": "有界雷达独立/SDR/优化型ZF协方差核心"
          }
        }
      ]
    }
  ]
};
const collection=(data,key)=>key.split('.').reduce((v,k)=>v[k],data);
function reverse(data,entries){const prior=structuredClone(data);for(const entry of entries){const matches=collection(prior,entry.collection).filter(x=>x[entry.idKey]===entry.id);a.equal(matches.length,1,'one exact solver metadata record');for(const ch of entry.changes){let parent=matches[0];for(const k of ch.path.slice(0,-1))parent=parent[k];const k=ch.path.at(-1);a.ok(Object.hasOwn(parent,k),'reviewed solver metadata present');a.deepEqual(parent[k],ch.after,'exact solver metadata '+entry.id+'.'+ch.path.join('.'));if(ch.added)delete parent[k];else parent[k]=structuredClone(ch.before);}}return prior;}
const withoutCombinedRegistry=r=>reverse(r,changes.registry),withoutCombinedCatalog=d=>reverse(d,changes.catalog);
module.exports={changes,collection,withoutCombinedRegistry,withoutCombinedCatalog};
