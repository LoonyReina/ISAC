# CRB 最优联合波束：模型、实现与验证记录

记录日期：2026-10-10。此文件只记录实际完成的检查。主案例是 2022 论文的**单用户、单数据流、点目标角度 CRB 特例**；可选双流案例是本站独立构造。两者都不是原论文多用户 SDR、整篇算法/图表复现、估计器 Monte Carlo 或实测。

## 1. 固定原文与证据范围

Fan Liu, Ya-Feng Liu, Ang Li, Christos Masouros, Yonina C. Eldar, *Cramér-Rao Bound Optimization for Joint Radar-Communication Beamforming*, IEEE Transactions on Signal Processing 70, 240–253 (2022).

- DOI：<https://doi.org/10.1109/TSP.2021.3135692>
- 作者托管的已发表期刊 PDF：<https://www.weizmann.ac.il/math/yonina/sites/math.yonina/files/Cramr-Rao_Bound_Optimization_for_Joint_Radar-Communication_Beamforming.pdf>
- 期刊首页：首次发表 2021-12-15；当前版本 2022-01-11
- 2026-10-10 独立审计下载、读文本并核对印刷页后的 PDF SHA-256：`3bb9519855b92a8cca870caf603efe0d05dc1d9369cadad0fb7de20750a61e6d`
- §II-A/B，pp.241–242，式 (1)–(9)：观测、未知复反射系数、CRB 与通信质量
- §III-B，pp.243–244，式 (20)–(29)，引理1/定理1；附录 A/B：秩一化简、最优子空间、活跃约束与单用户闭式解

期刊式号不与标题末尾为 *Design* 的 2021 arXiv 稿混用。网络 PDF 地址不是不可变存档，哈希属于上述核验日期；本仓库不再分发论文全文。来源及已有影响力快照见 `data/crb-beamforming-sources.json`，没有把不同索引的引用数相加、平均或替代社交讨论量。

## 2. 实验模型与公平预算

- Nt=8、Nr=12，居中半波长 ULA；孔径分别为 3.5λ、5.5λ
- 正前方 θ₀=0 rad；窄带、远场、单站、单点目标；只有角度与一个整块共享的复反射系数未知
- L=64；总平均发射功率 P=1；总块能量 LP=64
- 信道范数为1；通信噪声功率 σC²=.01；雷达每个复数样本噪声功率 σR²=100
- 真值 α=1+0i 用于评估下界，估计器并不知道 α
- 所有参数是合成归一化教学值，不是原论文数值设置或真实链路预算
- 这里是总功率预算，不是上一联合预编码案例的每天线等功率约束，也不是逐天线常包络

观测为 Y=α b(θ)a(θ)ᴴX+Z，R=XXᴴ/L。a、b 不作单位范数归一化；aₘ=exp(iπm sinθ)。导数以弧度为单位，求导时固定已设计好的 X 与 w，不对设计策略求导。复噪声的两个实分量各有方差 σR²/2。

F=(2/σR²)Re(DᴴD)，三个参数为 θ、Reα、Imα；消去两个反射参数得到 Schur 补。只用 Fθθ 会把已知 α 的假想信息错误地当成实际信息。显示的是 √CRB×180/π，即正则、局部无偏模型下的**角度标准差理论下界**，不是实际 RMSE、保证误差、分辨率或检测概率。

主案例采用单位模的已知64样本，精确满足 XXᴴ/L=wwᴴ；双流核验采用两条64样本正交时间行，精确满足 SSᴴ/L=I₂。不是断言任意有限随机数据块自动有这项等式。

## 3. 主案例与端点合同

u=1/√8、v=m/√42，h=ρu+√(1−ρ²)v，0≤ρ≤1。ρ是**幅度重合度**，不是用户的物理角度或距离；改变ρ改变了信道场景。

γmax=P‖h‖²/σC²=100=20 dB；q=Γ/γmax。

- q≤ρ²：w*=√P u，g=1；实际 SNR=100ρ²，可高于要求
- ρ²<q≤1：g=[ρ√q+√(1−ρ²)√(1−q)]²；实际 SNR=Γ
- q>1：Cauchy–Schwarz 给出通信不可行证明；w、当前 CRB、当前信息均为 null，当前方向图撤除，参考线仍保留
- ρ=0、q=1：通信可行，但目标零陷、未知 α Fisher 块奇异；普通 CRB 为 null，原因是 target_null。从可辨识内部趋近时发散，不能用有限夹断或伪逆替代
- Γ=0：“无最低要求”，requiredDb=null；它不等于0 dB，当前点不放在有限dB横轴上
- ρ=1：全部通信可行门槛均在平台内

g=|aᴴw*|²/(NtP)，CRB=CRB₀/g。主图纵轴为有界的g，不是把发散CRB剪到某个天花板。页面另给当前精确的开方下界。横轴0–22 dB、纵轴0–1；高于20 dB没有伪造的最优线。方向图共用固定原始功率0–8，无逐曲线峰值归一化，无虚构用户角度。

默认ρ=.5、18 dB：

- 平台转折13.9794000867 dB
- g=.852418002124539
- √CRB=.516212428064278°；仅雷达基准=.476600795242684°
- Jknown=13259.0321100，Jlost=939.6662677，Jeff=12319.3658424 rad⁻²
- 实际 SNR=18 dB，总功率=1

## 4. 稳定计算与可复算表示

`crb-beamforming-core.js` 无第三方依赖。复数用 `[real, imaginary]`，从实际因子计算协方差与观测导数。通用 `information()` 通过复数 Jacobian 计算三参数实 Fisher 矩阵，投影掉复 α 的扰动方向；残差范数避免普通规模下的相减精度损失。零反射、端射与单接收器单非零流的精确结构奇异情况另行处理，不设置全局任意信息量底线。

主案例以**实偶/奇模态系数**作为规范发射表示。对应 `modalFactors`、`channelModalFactors`，以及 coefficientU/V。为了使極小正ρ仍被如实处理：

1. 主角度信息使用已证明的秩一恒等式 Jeff=J₀cᵤ²，不把密集向量求和时损失的微小分量认作物理零陷
2. `modalPattern()` 对称配对天线位置，使偶模态场为实数、奇模态场为纯虚数；主图、参考图、双流图均使用该规范表示
3. 展开的密集 w、h、协方差是浮点近似；`denseTargetPower` 和 `denseFactorInformation` 是诊断，不是覆盖模态精确值的权威结果
4. 例如ρ=10⁻¹⁷、q=1仍为regular；模式方向图在0°的功率与8g一致。密集天线权重此时可能丢失微小偶模态
5. 当正信息量的倒数超出双精度可表示范围（如ρ=10⁻²⁰⁰、q=1），明确抛出数值范围错误，不输出Infinity，也不谎称物理零陷。UI的ρ步长.01不会到达这个数值表示限制

角度图采用721个真实计算角度样本（−90°至90°、.25°间隔），主曲线采用221个门槛点（0至22 dB、.1 dB间隔）。图、数值表与当前参数源一致，没有手绘峰或请求网络数据。

## 5. 可选双流构造的边界

这部分切换到**另一个信道 h=u**，并扩大为数据+辅助探测两流家族；不是主案例的额外优化方案，也不是论文点目标多用户 SDR 或扩展目标结果。

p=.5固定；κ∈[0,1]。规范实模态因子为 [√p, κ√(1−p)] 和 [0,√((1−p)(1−κ²))]。数据功率 .5+.5κ²，探测功率 .5(1−κ²)，总功率为1。κ表示空间模态输出相关系数；两个源时间行仍正交。

整条功率方向图与κ无关，用户 SINR=50=16.98970004 dB。这个特选信道使探测干扰为零；一般信道不能直接照搬。接收模型中未知 α 的损失随κ变化：

- κ=1：√CRB=.674015308470007°
- κ=0：√CRB=.561570349168443°
- 方差比143/206=.6941747573，即方差下界低30.58%；开方下界只低约16.68%

p固定避免另一个零照射边界。不能把 p→0 的某个有限极限赋给 p=0 的普通 CRB。已知α参照是同一个设计的假想模型，没有重新优化已知α的设计。

## 6. 实际运行的检查

运行命令：

```sh
node --test tests/crb-beamforming*.test.cjs
python3 scripts/validate-crb-beamforming.py --check
python3 scripts/validate-crb-beamforming-independent.py --check
python3 scripts/validate-crb-beamforming-actual.py --check
python3 scripts/validate-crb-beamforming-highprecision.py --check
node scripts/generate-site.cjs --check
node --test tests/*.test.cjs
```

本文件初次写入时已完成：

- 新数值核心13项测试通过：默认、555个独立Python记录、功率/约束、全部端点、全3×3 Fisher固定X有限差分、缩放、复相位网格最优性、721角度功率、双流功率/正交有限块、无效参数、微小正重合度与规范模态一致性
- DOM执行7项：实际/要求SNR分开、无最低要求、奇异/不可行清除、预设/重复重置/resize/原生details重绘、220–950px SVG渲染宽度、无效值/缺失核心清除、标签/静态回退/初学顺序
- 生产者独立Python脚本通过，并通过保存快照核对：555个主案例、44个双流记录、60个通用复数协方差Fisher比对、固定X有限差分、复相位候选网格、资源缩放
- 第二份独立NumPy脚本无生产者或站点代码导入，431项断言通过，包括任意复协方差、一般未居中导向向量、120组实Fisher/trace公式、100组秩一投影、全空间随机波束、零照射/端射/单接收器、全角度双流不变性
- 保存快照：`data/crb-beamforming-validation.json` 与 `data/crb-beamforming-independent.json`；生成脚本的 `--check` 不改文件，重算并核对数值；两份脚本需NumPy，但静态网站和Node测试不依赖它

这两份Python快照是独立数学基准，**不是声称自动验证某个JavaScript哈希**。Node测试显式将实际核心与快照逐项比较。当前主核心SHA-256：`d5105b56c4a45ce9ed69443ee519dd9d8594db30c5488134f2926c1d6041fce8`。

集成后 `node scripts/generate-site.cjs --check` 通过，`node --test tests/*.test.cjs` **306/306通过**，`git diff --check` 通过。保留31个概念、原标量CRB案例与旧科学核心；新增为19个学习单元、8个案例；已实现重点论文案例数由有效注册关系计算为3/9。

### 实际 JavaScript 的第二层独立审计

以下两份便携核验脚本执行实际Node模块，再独立计算期望值；不导入生产者Python公式：

- [实际核心 NumPy 审计](../scripts/validate-crb-beamforming-actual.py)：**3,848项通过**；[保存结果](../data/crb-beamforming-actual-validation.json)
- [230位十进制直接阵列/实Fisher审计](../scripts/validate-crb-beamforming-highprecision.py)：**376项通过**；[保存结果](../data/crb-beamforming-highprecision-validation.json)

两次运行前后核心哈希均为上方d5105b56…完整值。普通随机复数Fisher最大相对差9.164×10⁻¹⁶，有效信息最大相对差1.713×10⁻¹⁵。高精度审计从完整发射权重、观测导数、三参数实Fisher矩阵出发，再消去未知α，覆盖ρ=10⁻¹⁰⁰以及0、±10⁻¹⁶度方向图值；没有只重复调用本站标量恒等式。

NumPy审计需要Node+NumPy；230位审计另需mpmath，均仅为开发核验。它们在系统临时目录生成中间输入/Node输出，默认重算并保存结果；`--check` 不修改保存结果，重新完成全部断言并核对核心哈希、状态和检查数。失败以非零状态退出。验证脚本不是浏览器运行时依赖。

真实浏览器布局、键盘/焦点、无脚本网络加载、Pages构建和线上资源**尚不由上述DOM测试认证**；需在最终集成版本上独立核验。此文不把浏览器未运行或未发布写成通过。
