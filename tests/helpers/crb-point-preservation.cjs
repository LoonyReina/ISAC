'use strict';
// Exact inverse of reviewed point-CRB integration and dated weighted acceptance metadata.
// Each changed leaf must match; no broad exemptions or rebased historical fingerprints.
const a=require('node:assert/strict');
const changes={
  "registry": [
    {
      "collection": "units",
      "idKey": "id",
      "id": "crb-beamforming",
      "changes": [
        {
          "path": [
            "question"
          ],
          "before": "提高最低通信 SNR，角度标准差下界为什么先平坦、再变差？",
          "after": "固定同一多用户信道，提高最低 SINR 时，角度估计下界、可行性和数值证书怎样一起变化？"
        },
        {
          "path": [
            "action"
          ],
          "before": "先猜通信要求何时影响回波信息，再调 SNR 门槛与信道重合度，区分有余量、最优取舍与可证明不可行。",
          "after": "输入或生成同一复数信道，实际求解式(33)、检查逐用户 SINR 与恢复波束；再单独学习原单用户闭式定理。"
        }
      ]
    },
    {
      "collection": "pages",
      "idKey": "path",
      "id": "crb-beamforming.html",
      "changes": [
        {
          "path": [
            "role"
          ],
          "before": "研究主题 · 单用户点目标精确最优波束、未知反射系数与原文对照",
          "after": "研究主题 · 多用户点目标式(33)实际求解、未知反射系数与单用户定理先修"
        }
      ]
    },
    {
      "collection": "cases",
      "idKey": "id",
      "id": "case-waveform",
      "changes": [
        {
          "path": [
            "fields",
            "证据类型"
          ],
          "before": "<a href=\"https://arxiv.org/pdf/1711.05220v1\">2018 波形设计论文的固定预印本 v1</a>：理论与仿真；本站已独立数值验证 §III 严格协方差与 §IV 加权算法，保留27组离线历史状态。加权教学的真实浏览器验收仍开放。",
          "after": "<a href=\"https://arxiv.org/pdf/1711.05220v1\">2018 波形设计论文的固定预印本 v1</a>：理论与仿真；本站已独立数值验证 §III 严格协方差与 §IV 加权算法，保留27组离线历史状态。2026-10-12 加权托管桌面计算、默认刻度、完整记录重导入与新求解已验收；实际中途取消、窄屏和完整绘制延迟仍开放。"
        },
        {
          "path": [
            "paperComparison",
            "siteArtifactType"
          ],
          "before": "新输入 §III 严格协方差及 §IV 等能量加权核心、独立数值核验和同输入 Worker 教学；另保留27组离线历史状态。加权真实浏览器验收仍开放，原图3加权曲线非匹配，非整篇复现。",
          "after": "新输入 §III 严格协方差及 §IV 等能量加权核心、独立数值核验和同输入 Worker 教学；另保留27组离线历史状态。加权有界桌面计算及完整记录重导入已验收，中途取消/窄屏/绘制延迟仍开放，原图3加权曲线非匹配，非整篇复现。"
        },
        {
          "path": [
            "paperComparison",
            "unknowns",
            2
          ],
          "before": "加权教学的实际托管浏览器交互、下载、窄屏与延迟验收仍开放",
          "after": "加权实际中途取消、窄屏/其他浏览器与完整绘制延迟验收仍开放"
        }
      ]
    },
    {
      "collection": "cases",
      "idKey": "id",
      "id": "case-crb-beamforming",
      "changes": [
        {
          "path": [
            "fields",
            "问题"
          ],
          "before": "一组发射天线同时服务一个通信用户、照射一个点目标。总功率固定时，提高用户最低 SNR，最小可达的角度 CRB 为什么先不变、再上升，最后通信要求不可行？",
          "after": "固定同一复数多用户信道与总功率，提高各用户最低 SINR 后，角度 CRB、恢复波束和通信可行性如何一起变化？为什么下界不是实际估计误差？"
        },
        {
          "path": [
            "fields",
            "交互机制"
          ],
          "before": "调节最低通信 SNR 与合成信道空间重合度 ρ，观察单用户精确最优波束的平坦区、取舍区和可证明不可行区。另用同一波束分开已知反射系数信息、未知复反射系数造成的损失与有效信息。",
          "after": "主实验从新输入 H 实际运行式(33)的 PSD 锥迭代与波束恢复，支持 Nt4/6/8、K2、同 H 三点门槛比较、显式运行/取消和完整结果导出。只接受数值收敛且物理门槛通过的结果；旧 K1 精确闭式 SNR 定理另栏保留。"
        },
        {
          "path": [
            "fields",
            "证据类型"
          ],
          "before": "<a href=\"https://www.weizmann.ac.il/math/yonina/sites/math.yonina/files/Cramr-Rao_Bound_Optimization_for_Joint_Radar-Communication_Beamforming.pdf\">2022 CRB 波束优化论文，固定已发表期刊版</a>：单用户闭式定理、证明与一般模型仿真；本站：单用户点目标精确解的独立合成实例、实参数 Fisher 矩阵和数值复核，非整篇论文复现。",
          "after": "<a href=\"https://www.weizmann.ac.il/math/yonina/sites/math.yonina/files/Cramr-Rao_Bound_Optimization_for_Joint_Radar-Communication_Beamforming.pdf\">2022 CRB 波束优化论文，固定已发表期刊版</a>：理论与仿真；本站：多用户点目标式(33)有界核心已独立数值验证，教学 UI 已接入、真实托管浏览器验收仍开放。原尺寸、扩展目标和 ML 参考分别为离线证据，非整篇复现。"
        },
        {
          "path": [
            "fields",
            "结论边界"
          ],
          "before": "主实验是单通信流、总功率约束与未知复反射系数 α；不存在其他流干扰，使用 SNR。显示的是角度标准差下界，不是实际 RMSE。可选同方向图实验另换信道并增加独立探测流，属于本站独立构造，不是原文 SDR 或对主实验的性能胜出。",
          "after": "主实验为未知复反射系数 α 的点目标、总功率预算及多用户 SINR 约束；显示角度标准差下界，不是实际 RMSE。浮点残差与对偶间隙认证不是精确证明；iteration_limit 是未解决，不能推成不可行。原 K1 单流定理与另换信道的可选双流构造分别保留，不当作本多用户实验的基线。"
        },
        {
          "path": [
            "fields",
            "下一研究问题"
          ],
          "before": "增加用户、杂波或未知信道后，哪些变化会与角度混淆？怎样在相同资源下重新求解设计，并用实际估计器检验下界与失效概率？",
          "after": "保持同一 H、孔径、功率与噪声，扩展到原尺寸时求解器何时失效？加入实际盲角度 ML 估计器后，哪些 SNR 范围接近下界，哪些试验必须计作失败？"
        },
        {
          "path": [
            "paperComparison",
            "researchQuestion"
          ],
          "before": "原文在通信约束与总发射功率预算下最小化点目标或扩展目标估计 CRB；本站实现单用户点目标闭式最优特例，解释约束何时开始起作用。",
          "after": "在通信 SINR 与总发射功率预算下最小化点目标角度 CRB；先执行有界多用户式(33)，另保留单用户闭式定理和独立双流构造。"
        },
        {
          "path": [
            "paperComparison",
            "observationsAndUnknowns"
          ],
          "before": "雷达观测 Y=αb(θ)a(θ)ᴴX+Z，已知发射块 X、阵列与噪声方差；θ 与复反射系数 α 未知。用户观测 yₗ=hᴴwsₗ+zₗ，h 已知；设计单流波束 w。对 θ 求导时固定 X 和 w，不对优化策略求导。",
          "after": "雷达观测 Y=αb(θ)a(θ)ᴴX+Z，已知实际 X、阵列、噪声与用户信道 H；θ 和复 α 未知。H 的第 k 行是 h_kᴴ，用户有期望流与其他通信流干扰，使用 SINR。对 θ 求导时固定 X 和 w，不对优化策略求导。"
        },
        {
          "path": [
            "paperComparison",
            "locator",
            "summary"
          ],
          "before": "期刊 pp.241–242 §II-A/B 式(1)–(9)：观测、未知复系数与点目标 CRB；pp.243–244 §III-A/B 式(19)–(29)、引理1/定理1：单用户最优解；pp.248–249 附录 A/B：张成空间与约束证明。式(10)–(18)扩展目标、式(30)–(33)及定理2多用户 SDR 仅作未实现边界。",
          "after": "期刊 pp.241–242 §II-A/B 式(1)–(9)：观测、未知复系数与点目标 CRB；p.244 §III-C 式(30)–(33)、定理2：多用户 SDR 与恢复条件。原单用户 pp.243–244 §III-A/B 式(19)–(29)、引理1/定理1与 pp.248–249 附录 A/B 单独保留；扩展目标与 ML 只作离线参考，不属于当前浏览器核心。"
        },
        {
          "path": [
            "paperComparison",
            "locator",
            "section"
          ],
          "before": "§II-A/B、§III-A/B、附录 A/B",
          "after": "§II-A/B、§III-A/B/C、附录 A/B"
        },
        {
          "path": [
            "paperComparison",
            "locator",
            "figure"
          ],
          "before": "未复现原文图；本站曲线使用独立合成参数",
          "after": "原尺寸参数单例与离线实验切片分别记录；未复现完整原图"
        },
        {
          "path": [
            "paperComparison",
            "locator",
            "equation"
          ],
          "before": "主实现式(7)、(19)–(29)；背景式(1)–(9)；未实现式(10)–(18)、(30)–(33)",
          "after": "当前多用户式(7)、(30)–(33)；原单用户式(19)–(29)另栏；扩展目标式(10)–(18)、(46)–(49)仅离线参考"
        },
        {
          "path": [
            "paperComparison",
            "siteArtifactType"
          ],
          "before": "单用户点目标闭式最优特例的独立合成实现、完整实参数 Fisher/Schur 复核；另附明确分开的双流协方差构造，非原图或完整论文复现",
          "after": "新复信道输入的多用户点目标式(33)核心、PSD 锥迭代/秩恢复/逐用户 SINR/Fisher/残差对偶界；有界独立数值验收与 Worker 教学。旧单用户精确特例另栏，原尺寸/扩展目标/ML 离线参考另计；托管浏览器、完整原图和整篇复现仍开放。"
        },
        {
          "path": [
            "paperComparison",
            "retainedAssumptions"
          ],
          "before": [
            "窄带远场单点目标；中心化半波长均匀线阵，导数以弧度计，阵列向量不做单位范数归一化",
            "一个单天线用户、一条单位功率通信流；精确已知用户信道 h，以 SNR 要求和总平均功率约束设计 w",
            "雷达已知实际发射块 X，噪声为独立圆对称复 Gaussian；θ 和 α 的实、虚部均为未知参数",
            "通过 Schur 补消去未知复反射系数；只在常规可辨识模型下报告局部无偏方差下界"
          ],
          "after": [
            "窄带远场单点目标；中心化半波长 ULA，非单位范数阵列向量，角度导数以弧度计",
            "K2 个单天线用户、单位功率独立通信流；输入 H 的每行是 h_kᴴ，已知精确信道，约束逐用户 SINR 与总平均功率",
            "雷达已知实际发射块 X；独立圆对称复 Gaussian 噪声，θ 和复 α 实虚部未知",
            "Schur 补消去未知复 α；局部常规无偏 CRB 与实际估计 RMSE 分开",
            "定理2满列秩前提由 rank(H[a,ȧ])=2 的数值阈值检查；不把数值秩当精确符号证明"
          ]
        },
        {
          "path": [
            "paperComparison",
            "omittedMechanisms",
            0
          ],
          "before": "未运行多用户 SDR、秩一恢复、CVX 或扩展目标优化；定理2的秩一结论另有满列秩条件",
          "after": "扩展目标式(46)–(49)求解与恢复只有离线参考，没有浏览器实现"
        },
        {
          "path": [
            "paperComparison",
            "omittedMechanisms",
            1
          ],
          "before": "未复现论文图、随机信道平均、实际角度估计器、检测器或硬件精度",
          "after": "原文完整图、双基线与完整随机信道/噪声 Monte Carlo 未复现；实际盲角度 ML 只有分别披露的离线切片，不是当前点目标 UI"
        },
        {
          "path": [
            "paperComparison",
            "omittedMechanisms",
            2
          ],
          "before": "未施加每天线等平均功率或逐天线恒包络；总功率预算不同于上一页联合预编码案例",
          "after": "没有杂波、不完美 CSI、硬件精度、每天线等功率或恒包络约束"
        },
        {
          "path": [
            "paperComparison",
            "omittedMechanisms",
            3
          ],
          "before": "可选双流实验是本站独立构造：另设 h=u、增加独立探测流；不是原文单流定理的方案对比",
          "after": "旧单用户先修固定 Nt=8、Nr=12、L=64、P=1；可选双流另设 h=u，是本站独立构造，不与当前多用户核心做性能排名"
        },
        {
          "path": [
            "paperComparison",
            "metrics"
          ],
          "before": [
            "最低与实际用户 SNR 分开；总功率与可证明通信可行性",
            "角度 CRB（rad²）、角度标准差下界（度），不等于实际 RMSE",
            "已知 α 的假想 Fisher 信息、未知 α 的信息损失与有效角度信息（rad⁻²）",
            "相同固定尺度的角功率 |a(ψ)ᴴw|²；ρ 是合成信道幅度重合度，不是用户物理角度",
            "可选实验：全方向功率图与通信 SINR 相同，但未知 α 下的 CRB 不同；不作跨场景优越性比较"
          ],
          "after": [
            "逐用户实际与最低 SINR、总功率与接收干扰",
            "角度 CRB（rad²）和角度标准差下界（度），不是实际 RMSE",
            "消去未知复 α 后的有效 Fisher 信息；normalizedInformation 不是旧 K1 的 g",
            "PSD/仿射约束残差、秩一恢复残差、对偶上信息界与带符号间隙",
            "accepted / iteration_limit / certificate or bound infeasible 分开；失败不删除",
            "同 H、同资源三点实际求解；不同 H 的结果不连为取舍曲线"
          ]
        },
        {
          "path": [
            "paperComparison",
            "unknowns",
            0
          ],
          "before": "未复现原文完整优化器、原图或全部仿真参数；合成教学设置与论文仿真设置分开",
          "after": "真实托管浏览器的运行/取消/重置/下载重导入、窄屏和控件到结果延迟仍待验收"
        },
        {
          "path": [
            "paperComparison",
            "unknowns",
            1
          ],
          "before": "理论下界能否被实际非线性角度估计器达到、低 SNR 的失败概率仍需另行检验",
          "after": "原尺寸广泛稳定性、原文双基线与完整 Monte Carlo 仍开放"
        },
        {
          "path": [
            "paperComparison",
            "unknowns",
            2
          ],
          "before": "多用户、扩展目标、杂波与不完美信道下的最优取舍未实现",
          "after": "扩展目标与 ML 离线结果不等于已移植或完整原图复现"
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "summary"
          ],
          "before": "独立合成设置：Nt=8、Nr=12，中心化 λ/2 ULA，θ₀=0，L=64，P=1、块能量 LP=64，‖h‖=1，σC²=.01、σR²=100，α=1 仅为评估真值且对估计器未知。固定信道场景内只改通信要求；改变 ρ 会更换信道。可选构造另设 h=u、p=.5 并增加独立探测流，不能与主实验当作同模型排名。",
          "after": "当前多用户教学：Nt4/6/8、Nr=Nt+4、K2、L30、P1000mW、通信/雷达噪声各1mW、α=1仅作评估真值且对估计器未知，θ0或23度。H可编辑，固定H的Γ0–20dB比较；0dB=线性1。旧单用户Nt=8、Nr=12、L=64、P=1及h=u独立双流构造单独保留。"
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "bandwidth"
          ],
          "before": "窄带归一化模型；未指定 RF 载频或物理带宽",
          "after": "窄带归一化模型，未指定 RF 载频或物理带宽"
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "energy"
          ],
          "before": "总平均功率 P=1；L=64 块能量 LP=64；不要求每天线等功率",
          "after": "总平均功率1000mW、L30个快拍；没有物理采样周期，不能直接给出焦耳"
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "duration"
          ],
          "before": "64 个复快拍；未指定物理采样周期",
          "after": "30个复快拍；物理持续时间未指定"
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "aperture"
          ],
          "before": "发射 3.5λ，接收 5.5λ；均为 λ/2 阵元间距",
          "after": "中心化λ/2 ULA；发射(Nt−1)λ/2，接收(Nr−1)λ/2"
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "priorKnowledge"
          ],
          "before": "已知 h、X、阵列与噪声方差；θ、复 α 未知，无参数先验",
          "after": "已知H、X、阵列和噪声；θ、复α未知，无参数先验"
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "other",
            0
          ],
          "before": "默认 ρ=.5、最低 SNR=18 dB；通信 SNR 上限20 dB",
          "after": "Nt变化会改变孔径；不能声称跨Nt为同孔径优势"
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "other",
            1
          ],
          "before": "ρ=0 且要求达上限时通信可行但目标零陷，常规角度 CRB 不可用",
          "after": "原尺寸Nt16/Nr20/K4/Γ15dB只作独立离线单例"
        },
        {
          "path": [
            "paperComparison",
            "resourceBudget",
            "other",
            2
          ],
          "before": "原文仿真设置不作为本页合成参数来源",
          "after": "浮点容差验收不是精确全局最优证明；不保证任意输入都收敛"
        },
        {
          "path": [
            "paperComparison",
            "verificationNote"
          ],
          "before": "2026-10-10 独立下载并检查作者机构托管的已发表期刊版与单用户定理范围；该次 PDF 的 SHA-256 为 3bb9519855b92a8cca870caf603efe0d05dc1d9369cadad0fb7de20750a61e6d。独立数值实现与完整实参数 Fisher 复核见本页；未复现原图或整篇论文。",
          "after": "2026-10-10 独立下载并检查作者机构托管的已发表期刊版与单用户定理范围；该次 PDF 的 SHA-256 为 3bb9519855b92a8cca870caf603efe0d05dc1d9369cadad0fb7de20750a61e6d。独立数值实现与完整实参数 Fisher 复核见本页；未复现原图或整篇论文。 2026-10-12 新增点目标 v0.4 核心独立离线194项断言、32次执行、3组新CVXPY对照与同H五门槛检查；详见 docs/CRB-MULTIUSER-KERNEL-VALIDATION.md。Node运行时间不代表浏览器延迟。"
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
            1,
            "items",
            1,
            "label"
          ],
          "before": "一条通信流、点目标回波与未知复反射系数",
          "after": "从单流回波到多用户干扰与未知反射系数"
        },
        {
          "path": [
            "levels",
            2,
            "items",
            5,
            "label"
          ],
          "before": "单用户精确最优解：平坦区、取舍区与不可行区",
          "after": "先看单用户精确特例，再运行多用户式(33)"
        },
        {
          "path": [
            "levels",
            3,
            "items",
            4,
            "label"
          ],
          "before": "2022 CRB 波束优化：固定期刊版单用户定理",
          "after": "2022 CRB 波束优化：多用户式(33)与独立 K1 定理"
        },
        {
          "path": [
            "levels",
            4,
            "items",
            3,
            "label"
          ],
          "before": "标准差下界不是 RMSE，独立双流构造不能跨模型排名",
          "after": "标准差下界不是 RMSE，未收敛不是不可行"
        },
        {
          "path": [
            "levels",
            5,
            "items",
            1,
            "label"
          ],
          "before": "独立核验闭式最优解、Fisher 信息与奇异边界",
          "after": "核验新输入、物理约束、Fisher 与对偶间隙"
        },
        {
          "path": [
            "levels",
            5,
            "items",
            1,
            "note"
          ],
          "before": "合成特例与独立数值复核，不表示多用户 SDR、原图或整篇论文已复现",
          "after": "有界点目标核心已独立数值验收；真实托管浏览器仍待验收，原尺寸/扩展目标/ML 只属离线参考，非完整原图或整篇复现"
        },
        {
          "path": [
            "coverage"
          ],
          "before": "专题机制、原文导读与单用户点目标 CRB 闭式特例；尚非整篇论文复现；另有分离/共享资源账本与严格空间置零的独立机制",
          "after": "专题机制、原文导读与多用户点目标 CRB 式(33)有界核心；原单用户闭式特例另栏保留；尚非整篇论文复现；另有分离/共享资源账本与严格空间置零的独立机制"
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
            1,
            "items",
            2,
            "label"
          ],
          "before": "一条通信流、点目标回波与未知复反射系数",
          "after": "从单流回波到多用户干扰与未知反射系数"
        },
        {
          "path": [
            "levels",
            2,
            "items",
            3,
            "label"
          ],
          "before": "单用户精确最优解：平坦区、取舍区与不可行区",
          "after": "先看单用户精确特例，再运行多用户式(33)"
        },
        {
          "path": [
            "levels",
            3,
            "items",
            2,
            "label"
          ],
          "before": "2022 CRB 波束优化：固定期刊版单用户定理",
          "after": "2022 CRB 波束优化：多用户式(33)与独立 K1 定理"
        },
        {
          "path": [
            "levels",
            4,
            "items",
            3,
            "label"
          ],
          "before": "标准差下界不是 RMSE，独立双流构造不能跨模型排名",
          "after": "标准差下界不是 RMSE，未收敛不是不可行"
        },
        {
          "path": [
            "levels",
            5,
            "items",
            2,
            "label"
          ],
          "before": "独立核验闭式最优解、Fisher 信息与奇异边界",
          "after": "核验新输入、物理约束、Fisher 与对偶间隙"
        },
        {
          "path": [
            "levels",
            5,
            "items",
            2,
            "note"
          ],
          "before": "合成特例与独立数值复核，不表示多用户 SDR、原图或整篇论文已复现",
          "after": "有界点目标核心已独立数值验收；真实托管浏览器仍待验收，原尺寸/扩展目标/ML 只属离线参考，非完整原图或整篇复现"
        },
        {
          "path": [
            "coverage"
          ],
          "before": "专题机制、原文导读与单用户点目标 CRB 闭式特例；尚非整篇论文复现；另有分离/共享资源账本与严格空间置零的独立机制",
          "after": "专题机制、原文导读与多用户点目标 CRB 式(33)有界核心；原单用户闭式特例另栏保留；尚非整篇论文复现；另有分离/共享资源账本与严格空间置零的独立机制"
        }
      ]
    }
  ],
  "catalog": [
    {
      "collection": "cards",
      "idKey": "id",
      "id": "crb",
      "changes": [
        {
          "path": [
            "mechanism"
          ],
          "before": "原文以点目标和扩展目标估计的 CRB 为设计指标，在通信约束下优化通感波束；本站先实现单通信流、总功率预算的单用户 SNR 闭式特例。",
          "after": "原文在通信 SINR 与总功率预算下优化点目标和扩展目标 CRB；本站当前实际运行新 H 输入的有界多用户点目标式(33)，原单用户 SNR 闭式定理另栏。"
        },
        {
          "path": [
            "evidenceBoundary"
          ],
          "before": "CRB 是模型下的估计方差下界，开方显示角度标准差下界，不能当作实际 RMSE。本站实现单用户点目标闭式特例；可选双流实验是另换信道的独立构造，非多用户 SDR 或完整论文复现。与本站高斯信道 CRB–rate 案例不是同一篇论文。",
          "after": "CRB 是模型下的估计方差下界，开方为角度标准差下界，不能当实际 RMSE。有界点目标核心已独立数值验收，真实托管浏览器验收仍开放；原尺寸、扩展目标、ML 的离线切片分别记录，不是完整论文复现。与本站高斯信道 CRB–rate 案例不是同一篇论文。"
        },
        {
          "path": [
            "readingPlan"
          ],
          "before": "先用单用户闭式最优解观察平坦区、取舍区与可证明不可行区，再核对期刊版式(7)、(19)–(29)和未知复反射系数。可选同方向图双流实验为本站独立构造，不是原文 SDR 或原图复现。",
          "after": "先固定 H 与资源，实际运行式(33)并核对逐用户 SINR、恢复波束、Fisher 信息和对偶间隙；再看独立 K1 闭式定理。分开接受、未解决和有证据不可行，最后查原尺寸/扩展目标/ML 离线边界。"
        },
        {
          "path": [
            "executionStatus"
          ],
          "added": true,
          "after": {
            "status": "validated-algorithm-core",
            "scope": "有界多用户点目标式(33)：独立数值门槛已通过，托管浏览器验收开放"
          }
        }
      ]
    }
  ]
};
const collection=(data,key)=>key.split('.').reduce((v,k)=>v[k],data);
function reverse(data,entries){const prior=structuredClone(data);for(const entry of entries){const matches=collection(prior,entry.collection).filter(x=>x[entry.idKey]===entry.id);a.equal(matches.length,1,'one point-CRB metadata record');for(const ch of entry.changes){let parent=matches[0];for(const k of ch.path.slice(0,-1))parent=parent[k];const k=ch.path.at(-1);a.ok(Object.hasOwn(parent,k));a.deepEqual(parent[k],ch.after,'exact point-CRB metadata '+entry.id+'.'+ch.path.join('.'));if(ch.added)delete parent[k];else parent[k]=structuredClone(ch.before);}}return prior;}
const withoutCrbPointRegistry=r=>reverse(r.units.some(u=>u.id==='otfs-receiver')?require('./otfs-receiver-preservation.cjs').withoutOtfsRegistry(r):r,changes.registry),withoutCrbPointCatalog=d=>reverse(require('./80211ad-preservation.cjs').maybeWithoutAdCatalog(d),changes.catalog);
module.exports={changes,collection,withoutCrbPointRegistry,withoutCrbPointCatalog};
