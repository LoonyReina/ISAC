# 交互讲义：阅读与重构映射

检索截止 2026-10-08。正文为独立教学叙述；按原文模型/相关章节核对，不是逐句翻译或全量论文复现。

## S1 · Integrated Sensing and Communications: Toward Dual-Functional Wireless Networks for 6G and Beyond

https://arxiv.org/pdf/2108.07165

2021 预印本 / 2022 期刊

问题：系统全景：通信中心、雷达中心、联合设计；从链路走到感知网络。

阅读：先读历史与系统分类，再看 §IV.B.2 的 OFDM 式 (46)–(52) 与图 10；接着回看收发设计和网络约束。

范围：本书第 1、5、6、8、11 章。图 10 所在 PDF 第 19 页已核对；本站图是教学重绘，不是原图复制。

## S2 · An Overview of Signal Processing Techniques for Joint Communication and Radar Sensing

https://arxiv.org/pdf/2102.12780

2021

问题：共同信号模型：为什么“估计信道”还不等于“理解目标”。

阅读：从 §II 的通信/雷达模型开始；§III.C 读数据处理、间接/直接感知与参数估计，再读雷达中心和联合设计。

范围：本书第 2–8、11、13–14 章；数学细节按共同观测模型重新推导。

## S3 · A Survey on Fundamental Limits of Integrated Sensing and Communication

https://arxiv.org/pdf/2104.09954

2021 起的综述版本

问题：性能语言：检测、估计、定位、信息极限各自衡量什么。

阅读：先读系统分类和性能指标，带着单目标例子理解 MSE/CRB，再进多参数信息矩阵与容量–失真框架。

范围：本书第 10–11 章。先理解“界”和“算法实测误差”的区别，再读高级推导。

## S4 · Integrated Sensing and Communication Channel Modeling: A Survey

https://arxiv.org/html/2404.17462v1

2024 · 本轮读取 v1

问题：模拟什么世界：目标 RCS、杂波与传播模型。

阅读：先读 §II 框架，区分一程通信和反射链路；再看 §III/IV 目标与杂波散射建模。

范围：本书第 12–13 章。文中的 active/passive 用法应按作者定义读，不凭词面套入别的领域。

## S5 · Interference Management for Integrated Sensing and Communication Systems: A Survey

https://arxiv.org/html/2403.16189v1

2024 · 本轮读取 v1

问题：分清干扰来源，再选抑制、规避或利用。

阅读：按自干扰、相互干扰、杂波、跨链路干扰的组织顺序读；先对照本书第 12 章找出你系统的那一项。

范围：本书第 9、12 章。不同干扰的可知性、硬件位置与统计分布不同。

## S6 · Orthogonal Time Frequency Space for Integrated Sensing and Communication: A Survey

https://arxiv.org/html/2402.09637v1

2024 · 本轮读取 v1

问题：高速与双选信道下，为何重新组织调制坐标。

阅读：先读 §II 的 OTFS 映射/收发结构，再选一种感知方案；对照 CP、导频、分数参数与复杂度。

范围：本书第 14 章。解释机制和边界；本轮没有实现一个完整 OTFS 收发机。

## S7 · A Comprehensive Survey of 3GPP Release 19 ISAC Channel Modeling: From Empirical Features to Unified Methodology and Standardized Simulator

https://arxiv.org/html/2512.03506v1

2025-12 · 本轮读取 v1

问题：从测量特征走到目标/背景联合模型与标准化评估。

阅读：先读定义与新信道特征，再读目标信道、背景信道和校准流程；区分论文扩展与规范内容。

范围：本书第 12–13、15 章。不是标准正文的替代品，也不等于现场性能承诺。

## CF · Constant False Alarm Rate (CFAR) Detection

https://www.mathworks.com/help/phased/ug/constant-false-alarm-rate-cfar-detection.html

MathWorks 官方技术说明

问题：CA-CFAR 参考单元、门限和统计条件。

阅读：核对平方律、独立样本、无非相干积累的前提及倍率推导。

范围：本书第 9 章。数值代码为本站实现，不依赖 MATLAB。

## R1 · Ambiguity Function Analysis of OFDM Signals With Pilots and Data Payloads

https://arxiv.org/html/2609.16691v1

2026-09 · 波形/理论

问题：作者针对两种离散模糊函数研究统计量，并分析导频位置与序列的影响。

阅读：读 §II–V 时，先找波形的哪些格子固定、哪些随机，再看比较的指标与多普勒假设。

范围：理论分析与数值结果的预印本；不是对所有系统宣布某一种导频全局最优。

## R2 · Real-Time Symbol-Domain OFDM Radar in an OpenAirInterface 5G Base Station With O-RAN Sensing Services

https://arxiv.org/html/2608.16705v1

2026-08 · 实时原型

问题：作者在 OAI 基站中实现正则化符号消除、距离–多普勒处理与 OS-CFAR，并连接感知结果的网络报告。

阅读：沿 §II/IV 的输入输出追到 §VI 实验，尤其看相位校正、处理时限和通信共存。

范围：有硬件测量和端到端演示的预印本；结论受其平台、载频设置与测试场景约束，不等于商业互操作认证。

## R3 · Clutter-Aware Integrated Sensing and Communication: Models, Methods, and Future Directions

https://arxiv.org/html/2602.10537v1

2026-02 · 环境鲁棒性

问题：该综述统一组织宽带空时频杂波模型、协方差结构、接收抑制与杂波感知的收发联合设计。

阅读：先读模型中的目标、背景反射和外部干扰如何分项，再选一种实际可验证的抑制方式。

范围：综述/方法框架预印本；要顺着引用到具体算法和实验，不把综述中的全部路线当成一个已实现系统。

## R4 · Multi-TRP Assisted UAV Detection in 3GPP 5G-Advanced ISAC Network

https://arxiv.org/html/2604.26113v1

2026-04 · 多站系统

问题：作者研究多站辅助单站感知，结合检测关联与结果融合，并把感知资源开销纳入评估。

阅读：看 §II–IV：各站先测什么、怎样认为两个检测属于同一目标、增加站数如何影响开销。

范围：基于所述标准化信道/参数的系统级评估预印本；不是把每个仿真位置都实地飞行测过。

## R5 · OFDM Waveform Optimization for Bistatic Integrated Sensing and Communications

https://arxiv.org/html/2603.08442v1

2026-03 · 双站收发设计

问题：作者结合路径参数估计与子载波/功率分配，在通信速率与感知约束之间组织优化。

阅读：沿系统模型读到优化变量，分清其贡献在波形选择、参数估计还是二者共同作用。

范围：模型推导和仿真预印本；应核对未知参数、先验、功率预算及所用接收估计器。

## R6 · Human Walking Sensing and Pose Estimation in the 6 GHz Band Using Amplitude and Phase CSI

https://arxiv.org/html/2606.10048v1

2026-06 · CSI 与学习

问题：作者在公开的多站 OFDM CSI 数据上比较若干姿态网络及幅度/相位组合。

阅读：读数据集与消融章节，检查“相位有帮助”在哪种输入和场景下成立；不要直接外推为任意房间的高精度 BEV。

范围：数据集评估预印本；室内采集几何、训练/测试划分与姿态误差指标必须一起看。

## R7 · ISAC in 3GPP: Evolution Toward 6G

https://arxiv.org/html/2608.15283v1

2026-08 · 综述预印本 v1

问题：把服务、无线、协议、架构研究连起来。

阅读：分开已确立需求、研究假设和未来方向；不要把 Release 标签当成一项统一完成的能力。

范围：本书第 1、15 章。对具体标准版本应继续核查官方原文。

## STD · ITU-R Recommendation M.2160-0

https://www.itu.int/rec/R-REC-M.2160-0-202311-I/en

2023-11 · 官方愿景框架

问题：IMT-2030 总体框架。

阅读：用于核对 ISAC 的愿景位置，不当作具体波形规范。

范围：本书第 1、15 章。

## REQ · 3GPP TS 22.137 / ETSI TS 122 137 V19.1.0

https://www.etsi.org/deliver/etsi_ts/122100_122199/122137/19.01.00_60/ts_122137v190100p.pdf

Release 19 · 官方服务需求

问题：ISAC 服务需求入口。

阅读：与信道模型、无线实现、研究文章分别阅读。

范围：提供明确版本入口，不声称它是所有后续版本的最新全文。

## 2026-10-10 · 理论主线配套页（theory.html）

保持首页 18 章与旧页不变；新页把两条基础线、共同似然、设计演进、七问论文读法和当前证据地图连接起来。

新增共享模型是本站独立教学推导：32 样本实基带、Barker13、Ts=10 ns、整数延迟 0–12、独立实 Gaussian 噪声。通信条件于已知增益 1、相位参考与延迟，未知符号 ±1；感知已知发射实现，未知整数延迟与实增益。未知复增益仅作公式推广，不宣称交互已经模拟复数多径。

直接阅读范围与边界：
- Zhang 等，https://arxiv.org/html/2102.12780v1 ：§II 模型与 §III 接收处理；匹配/估计角色用于教学重构
- Liu 等，https://arxiv.org/html/2108.07165v1 ：§I.C、IV.B、V、VII；演进按并存设计路线而非技术淘汰史组织
- Xiong 等教程，https://arxiv.org/html/2310.09749v2 ：§I–II、IV.A–D；随机发射实现可为感知端已知，以及 CRB–rate 权衡
- 原始研究 https://arxiv.org/abs/2204.06938v8 ：本次核对摘要及版本历史；具体端点解释参考上列教程。未逐节审核全部原始证明
- 基本界综述 https://arxiv.org/html/2104.09954v2 ：§III 指标；标量 CRB 例子由本站独立推导，不声称整篇研究复现

2026 小范围证据地图：
- ITU 官方 https://www.itu.int/en/ITU-R/study-groups/rsg5/rwp5d/IMT-2030/Pages/default.aspx ：2026 最低性能要求/评估指南为拟于 12 月批准的草案
- 3GPP 官方 https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=4446 ：TR 38.765 20.0.0 / Release 20 / 2026-06-23 上传
- https://www.3gpp.org/news-events/3gpp-news/ran113-reports ：推进中工作项，不等于完整标准已经完成
- https://arxiv.org/abs/2602.00054 ：分布式 SIMO 子带全双工室内原型；页面信息和摘要支持特定配置，不外推普遍收益
- https://arxiv.org/abs/2607.18680v1 ：2026-07-21 预印本、理论与仿真；不称实网验证

当前主线是代表性证据图，不是文献计量热度排名，亦未完成旧站全部来源的重新审计。

## 2026-10-10 · 标量 CRB 机制实验增量

本轮直接阅读原研究 https://arxiv.org/html/2204.06938v8 的 §I 贡献概述、§II-A 模型及 §II-B 式(6)–(7)和其后的条件界平均解释；教程 https://arxiv.org/html/2310.09749v2 的 §IV-A–C，特别是 §IV-B 式(19)–(22)。没有逐式复核完整区域、全部附录或重现原图。

新增实验仅独立推导实标量 y_i=θx_i+n_i：固定无先验增益、已知输入实现、独立实高斯噪声。原研究的复向量、Bayesian 信息与通信速率目标不被此标量模型替代。对 Gaussian 输入 Q=Σx_i²/P~χ²_T，E[1/Q]=1/(T−2)（T>2）；Var(1/Q)=2/[(T−2)²(T−4)]（T>4）。T≤2 均值发散；T=3、4 均值有限但方差发散。所有这些标量公式由本站教学推导得出，不归为原论文完整结果复现。

Monte Carlo 对发射块抽样，不模拟估计器误差。固定幅度符号不改变块能量，BPSK 一侧直接用精确值；Gaussian 一侧不做逐块能量归一化。比较使用相同 T、P、σ²；改变 T 会同时改变单块时长/样本预算，不能被当成无额外资源收益。

## 2026-10-10 · 导频设计研究案例

新增 `pilot-design.html`，从首页阅读路线和 `theory.html#research-method` 链入，保留 18 章和理论页两个实验。

直接打开并阅读的原始文献：
- Rui Zhang 等，*OFDM Reference Signal Pattern Design Criteria for Integrated Communication and Sensing*，arXiv:2401.09643v3，2024-11-13，https://arxiv.org/pdf/2401.09643v3 。核对全文 PDF 中 §II 的 q/符号间隔/偏移图样、§III 的 Delay-and-Sum 模糊分析和 Schemes A–D、§V 的 2D FFT 式(14)–(19)与图10文字说明。仅据这些部分介绍研究设计逻辑；未逐式审核全部证明、§VI–VIII 超分辨推导或重做原始数值图。
- Martin Braun、Manuel Fuhr、Friedrich K. Jondral，*Spectral Estimation-based OFDM Radar Algorithms for IEEE 802.11a Signals*，2012，KIT 作者全文 PDF：https://www.cel.kit.edu/download/VTC2012_BraunFuhrJondral.pdf 。核对 §II.C 周期图式(6)–(7)、格点/坐标与窗口说明，及 §II.D 式(8)–(9)缺失 DC 分析。没有把缺一个 DC 点当作周期梳状采样，也没有复现其 Hamming 窗旁瓣数值。

本站独立教学模型：单站静止单径 H[k]=a exp(−j2πkΔfτ)，未知频率平坦复增益，τ=2R/c，c=3e8 m/s，64 个频率格，Δf=1 MHz。采用直接复数求和，不借用原论文图。计算图样为 q∈{2,4,8} 梳状、64 连续、同数量连续块；所有精确别名、首零点和归一化由该模型推导。单符号偏移造成的共同相位由拟合复增益吸收，不演示多符号相干拼接。

资源与证据边界：每个导频单位能量固定，因此不同导频数量不是等总能量；K² 归一化只对齐无噪声真峰。格距改变搜索采样，不改变物理信息。首零点是矩形权重单径图样尺度，不是通用分辨率或估计精度。没有噪声、检测阈值、吞吐量、CP/ISI/ICI、二维多普勒或硬件验证。验证见 `PILOT-VALIDATION.md`。

## 2026-10-10 · 网络时钟与双基地几何研究案例

新增 `network-clock.html`，首页与理论研究框架最小增量链入，保留已有案例与实验。

来源与核对范围：
- *Joint Synchronization and Sensing in Networked ISAC via Structured Canonical Polyadic Decomposition*，https://arxiv.org/html/2607.18680v1 ，固定 2026-07-21 v1。核对 §I–VII 与附录 A–B 的模型/算法结构、图注、表 I 和数值结果说明；没有独立重证所有定理或重画原始图。七问关联 §II 式(1)–(5)、§III-A 式(7)–(11)、§IV-A 式(16)–(27)与算法1、§IV-B/C 和 §VI。特别注明图2–6 的 RMSE 排除失败试验；表 I 仅给出图2–3 对应试验成功率，应配对阅读，不代表图4–6 的每组扫描都有对应成功率；SCPD 不是在每个 SNR 都有最高成功率，不能由条件 RMSE 推出无条件鲁棒性
- 综述 https://arxiv.org/html/2006.07559v4#S6.SS6 ，固定 v4 的 §VI-F 与图13，传播延迟/时钟偏差、消偏交叉项与相对参数背景
- 理论页原型证据卡增补：https://arxiv.org/html/2602.00054v1 ，§III–IV。已演示感知为单站速度处理，多基地感知是未来工作；通信只评估 SBFD 模式，不能把其他模式当作资源匹配的完整通信–感知 Pareto 比较

本站独立模型：一个静止二维目标；一个 T，1–3 个 R；各链路时延已估计并正确关联。观测单位 ns、空间/总路径单位 m，c=299792458 m/s。bᵢ 为 Rᵢ 相对 T 的时钟偏移，正向 +bᵢ、反向 −bᵢ。10 ns 对应 2.99792458 m 总路径偏差，不是普遍位置误差；只在收发同址并求单程径向距离时除以 2。

三模式：忽略偏差只用正向；oracle 读取真值 b 校正正向；互易标量估计只用成对读数。独立等方差的双向噪声使平均/半差方差各为 σ²/2，但使用了两次观测，不能当作相同资源下的无条件优势。R1 反向额外路径展示互易假设失效；不是 SCPD、CFO、张量或多目标关联复现。

有限搜索为 [−100,100]² m，格距 2/1/0.5 m，所有点直接计算等权总路径 RMS。显示最多六个相隔至少 5 m 的网格局部极小值；不精修、不声称连续空间全局唯一。热图以 2 m 格点抽样显示、固定 0–30 m 色标，保留搜索与显示分辨率区别。数字表同时报告一次试验的位置误差、残差、全部同最小值格点数、站位、观测、偏差和固定空间探针。

可辨识边界：单向且每条链路独立未知偏差时，任意候选都能用不同偏差精确拟合；共线站位有全局镜像，即使局部 Jacobian 满秩。三角不等式不一致、边界候选与站点重合导数未定义均给出提示。详见 `NETWORK-VALIDATION.md`。

## 第四研究案例：SBFD 资源划分与双孔径（2026-10-10）

入口 `sbfd-resource.html`，从首页和理论研究框架最小增量链接。主读 [arXiv:2602.00054v1](https://arxiv.org/html/2602.00054v1)，版本记录 [abs](https://arxiv.org/abs/2602.00054)，v1 提交日期 2026-01-19。核对源为 §II–VI、表 I–II、图4–10。

- 七问依次为共存问题、三种资源对照、干扰/泄漏/动态范围瓶颈、实验集成改动、原型证据、外推限制、复核计划。
- 作者证据：三台 X410、6.8 GHz/20 MHz、2048 频格、128 μs/1216 符号；两感知子带与一通信子带。测速证据为单站；多基地留待未来。
- 作者报告 0.145 m/s 与按所列常数独立算得 0.1416244545 m/s 分开，差异尚不能解释；不替换原报告。RMSE 区间只是描述性摘要，不是置信区间、严格极值或自制曲线。
- 多频带合计 60 MHz，只有 SBFD 承载通信，感知节点数也不同；不能宣称匹配通信对照。通信端点描述、每模式试验次数均待澄清。
- 原创理想实验：固定 254 全局空格，K/K/(1794−2K) 三子带；默认严格复核 65–662、726–1323、1387–1984。全带接收不等于任意干扰下无失真。
- 频率和时间上的有限复指数和生成全部图线：距离首零点 c/(2KΔf)，速度首零点 c/(2f꜀MTₒ)。Fₛ=B=20 MHz 是本页独立建模选择，不是已知硬件采样率。归一化不建模能量、噪声、自干扰或 BER，不能复制硬件曲线。
- 对照下一步：固定总带宽、能量、时长与通信有效载荷，再逐项增加 CFO/多径/非线性。严格复现需要原始 IQ、真值、估计器/同步/滤波参数和校准记录。

## 2026-10-10 · 从符号判决到通信互信息与平均条件 CRB

新增理论页 `theory.html#rate-crb-bridge`，放在原 CRB 机制实验之后；只补同一输入设计的通信指标，不新增研究案例。

本轮直接打开并核对教程 https://arxiv.org/html/2310.09749v2#S4 ：v2（2023-10-17），§IV-A 式(18)及图6后的接收角色、§IV-B 式(19)–(22)先条件于已知输入实现再平均、§IV-C 式(23)的输入分布优化和区域说明。§III 的衰落/MMSE 算例仅用于辨认其与本站模型不同，不使用其数值。没有重现该文完整复向量/Bayesian 区域、最优输入分布或原图。

本站独立推导实 AWGN `Yc=X+Nc` 的软互信息：BPSK 由两个高斯似然的比值推出一维期望；Gaussian 由实高斯熵差推出 `0.5 log2(1+gamma)`。同时复用本站实标量无先验 `Ys=theta X+Ns` 的平均条件 CRB。两端噪声独立、平均输入功率与感知噪声方差均为 1。输入随机实现对通信端未知、对感知端已知，不把已知条件混用。

横轴 bit / 实信道使用，纵轴增益平方；只绘制 BPSK 与 Gaussian 两点，无 Pareto 连线或区域。不是实测速率、实际 MSE、硬判决 `1-H2(BER)`、有限码长保证、峰值约束系统或论文复现。完整数值、截断误差及独立验证方法见 `RATE-BRIDGE-VALIDATION.md`。

## 第五研究案例：近场波前曲率与距离（2026-10-10）

入口 `near-field.html`，题目“同一个方向，为什么还可能分出远近？”。从 `research.html` 的第五张六字段卡片、首页研究入口与第 06 章阵列、理论页研究入口链接。保留已有章节、案例和内容 ID；新案例回访第 06 章的平面波假设，不把近场称为另一种无条件更优的测距系统。

固定原始来源与阅读范围：
- Zhaolin Wang、Xidong Mu、Yuanwei Liu，*Near-Field Integrated Sensing and Communications*，全文 https://arxiv.org/html/2302.01153v5 ，版本记录 https://arxiv.org/abs/2302.01153v5 ，相关期刊 DOI https://doi.org/10.1109/LCOMM.2023.3280132 。首稿 2023-02-02；固定读取 v5，2025-09-23（v4 为 2025-09-22）。标注“2023 年研究，读取固定 2025 v5”，不是 2026 新论文；未做版本差分，不推断 2025 修订改动了什么。本轮阅读范围为完整主文，含 §II–IV 与附录 A–B；核对模型、推导结构、优化方法和图注，不代表独立重证全部证明或复现原图。
- Emil Björnson、Özlem Tuğfe Demir、Luca Sanguinetti，*A Primer on Near-Field Beamforming for Arrays and Reconfigurable Intelligent Surfaces*，全文 https://arxiv.org/html/2110.06661v2 ，版本记录 https://arxiv.org/abs/2110.06661v2 。2021-10-13 首稿，固定 v2 为 2021-12-08。核对 §II、§III、§III-A 与定理 1：§II-A 式(3)–(4) 的 Fraunhofer 相位误差准则，孔径曲率与单阵元远场的区别，以及式(20)–(23) 的有限 3 dB 波束深度条件。该文方形阵列 Fresnel 模型的十分之一阈值不移植到本站 ULA。

七问与原文证据：
1. 问题：在通信速率约束下，联合设计窄带距离/角度感知（§II–III-A）
2. 基线：平面波空间响应，以及全数字和混合收发架构（§II-A、II-C、IV）
3. 瓶颈：平面波响应缺少距离依赖；联合波形优化非凸（§II-A、III-B）
4. 创新：球面波模型、处理未知目标复增益的 CRB、全数字 SDR 最优恢复，以及模拟侧启发式设计加数字侧优化的混合方案（式(1)–(7)、(13)、(16)–(22)，附录 B）
5. 证据：图2 的速率–RCRB 权衡，图3 的近场 MUSIC 位置峰与远场角度脊，图4 排除路径损耗后的距离相关 RCRB，均为理论/数值仿真证据（§IV-A–C），不是硬件测量
6. 边界：单目标、窄带 ULA，设计时固定目标位置、通信信道已估计；混合接收噪声白化涉及大阵列近似（§II、III-A）。CRB 不等于实现 MSE
7. 复现：§IV 给出 65 阵元、28 GHz、0.5 m 孔径、四用户、目标 (20 m,45°)、20 dBm 发射功率、−60 dBm 噪声和五 RF 链；精确复画还需明确快拍数、复增益、随机几何与求解器设置，不能只据这些参数声称复现

本站独立教学模型：奇数 N 的中心 ULA，阵元 xₙ=(n−(N−1)/2)d，前半平面目标 (r sinθ,r cosθ)，θ 从阵列法线量起。主论文角度从阵列轴量起，在所选朝向下 θ_paper=π/2−θ_tutorial；不混用 sin/cos。使用精确球面距离 ℓₙ=√(r²+xₙ²−2rxₙ sinθ) 和一程相对相位 aₙ=exp[−j(2π/λ)(ℓₙ−r)]，公共相位与幅度放入未知复增益 α。单频公共相位不被当作已知绝对时延。二阶展开中的 xₙ² cos²θ/(2r) 只用于解释曲率，数值图使用精确距离。

一个有界实验：λ=0.01 m，d=λ/2，N∈{33,65,129}，已知 θ=0，真距离 4–40 m（默认 N=129、r₀=4 m），候选扫描 2–80 m。改变 N 同时改变 D=(N−1)d。三个响应统一除以 N²：球面真值/球面候选随候选距离变化；球面真值/平面候选是常数失配线；平面真值/平面候选恒为 1。不逐曲线归一化峰值，不用路径损耗提供额外距离信息，不模拟噪声、MUSIC、通信速率或论文优化器。残余相位与局部几何敏感度 κᵣ 解释同一机制，不构成第二个实验。

解释与验证边界：未知复增益拟合后的归一化相干度，刻画空间向量是否只差一个公共复标量；不证明两目标分辨概率、检出率、实际测距 MSE 或多用户吞吐量。局部曲率 κᵣ（m⁻²）、全局主瓣/3 dB 宽度、统计 CRB 与实际 MSE 分开；角度也未知时，不能忽略信息矩阵的角度–距离耦合。2D²/λ 是平面波近似的尺度提示，既不是可辨识开关，也不保证窄距离峰；两侧 3 dB 交点若不在扫描窗内，不报告有限宽度。

一程空间实验不冒充单站双程雷达。共址发射/接收阵列的点散射通道为 G=βaaᵀ，单个通道对应两条传播腿的相位和；不是 βaaᴴ，也不能把整个阵列通道替换成逐阵元相位加倍。固定一次发射向量后，未知增益可吸收其发射标量；多次探测的信息增益依赖完整探测设计与资源预算，不宣称普遍两倍分辨率或四倍 CRB 优势。


## 2026-10-10 · 实际估计器与条件 CRB 的有界教学扩展

新增 `theory.html#estimator-crb`，位于原随机能量 CRB 实验之后、速率桥梁之前；仍归入既有 CRB 案例和通感权衡方向，不增加论文案例。

独立经典推导：实标量 yᵢ=θxᵢ+nᵢ，固定未知 θ、无先验、感知端知道 x，nᵢ 独立 N(0,1)。令 E=Σxᵢ²>0，LS=ML 为 θ̂=Σxᵢyᵢ/E，误差为 Σxᵢnᵢ/E，故条件无偏且条件 MSE=1/E=条件 CRB，有限样本即成立。θ=1 只作评估真值。仿真从实际 x、n、y 计算 θ̂；代数证明等号，仿真展示和检验实现。单次平方误差或有限试验经验 MSE 低于 CRB 不违背期望下界。

固定块模式只重抽噪声；联合模式重抽输入与噪声。BPSK 每块 E=T、联合 MSE=1/T；Gaussian E~χ²_T，联合 MSE=1/(T−2)，T>2，不做逐块归一化。Gaussian T=3、4 时平均 MSE 有限而单次平方误差方差无穷；不能用普通有限方差标准误声称稳定。固定非零块仍有有限条件平方误差方差 2/E²。T 是每次估计的观测资源，B 是独立评估试验数，不合并成 TB 样本估计；固定块实现能量不同，不可据此宣称某一输入全面更优。

原文定位沿用已核对资料：https://arxiv.org/html/2204.06938v8#S2 的 §II-A–B；https://arxiv.org/html/2310.09749v2#S4.SS2 的 §IV-B 式(19)–(22)。保留感知端已知输入实现、先求条件界再平均的组织方式；原研究为更一般的复向量/Bayesian 框架，其高 SNR 可达性讨论不能替代本站特定实标量 LS 的有限样本证明。没有新外部核查、原图或完整权衡区域复现，也没有把该经典结论称为 2026 年研究贡献。

旧随机能量实验“只抽发射块、不模拟估计器误差”的局部说明继续有效。速率平面继续比较解析互信息与平均条件 CRB，不改为带噪声的经验 MSE 工作点。非线性距离/角度、未知输入或干扰参数、偏置估计器、先验或模型失配均需重推界，不能直接搬用这里的等号。

## 2018 · 严格协方差波形设计（2026-10-10 增补）

- 固定预印本：https://arxiv.org/pdf/1711.05220v1 ，版本 2017-11-14，标题 Towards Dual-functional Radar-Communication Systems: Optimal Waveform Design
- 期刊：https://doi.org/10.1109/TSP.2018.2847648 ，IEEE TSP 66(16), 4264–4279, 2018-08，题名使用 Toward
- 本站：`waveform-design.html`，`case-waveform`，方向 `waveforms`
- 核对：§II 式(1)–(7) 通信与空间协方差；§III 式(8)–(15) 全向与方向性严格 Procrustes；§VI 图3–4 的通信/雷达数值比较；§IV 加权权衡、§V 常模仅标出未实现边界
- 原图参数：N=16、L=20、K=4、Pt=1、单位 QPSK、半波长 ULA、复高斯信道、方向参考 −π/3、0、π/3；本站 N=4、L=8、K=2，用确定 H、S 及单方向混合正定协方差，不声称原图复现
- 独立证据：27 个已序列化复数状态；浏览器从 H、S、X 重算方向图和符号误差；全局下界、协方差及能量检查；540 个随机可行候选、零通道等边缘条件、3 个复数小问题的 SciPy SLSQP 交叉校验
- 影响力检索快照 2026-10-10：OpenAlex 980、Semantic Scholar 972，两个索引分开；OpenAlex 2025 引用出版年桶206。不是社交讨论量或全局排名
- 来源：https://api.openalex.org/works/https://doi.org/10.1109/TSP.2018.2847648 ；https://www.semanticscholar.org/paper/abaf9a91f636542a230d32dec71206bfeba703e1 ；https://www.comsoc.org/publications/best-readings/integrated-sensing-and-communication-isac ；https://signalprocessingsociety.org/community-involvement/award-recipients
- 限制：同协方差不保证相同延迟–多普勒模糊函数；确定性匹配误差不是 BER、容量或 CRB；未实现噪声、信道不确定性、加权信赖域、常模、硬件或测量

## 2020 · 独立雷达流与联合发射预编码（2026-10-10 增补）

- 期刊：Xiang Liu 等，Joint Transmit Beamforming for Multiuser MIMO Communications and MIMO Radar，IEEE TSP 68，3929–3944，DOI https://doi.org/10.1109/TSP.2020.3004739
- 固定版本：https://arxiv.org/abs/1912.03420v2 ，2020-02-02；PDF https://arxiv.org/pdf/1912.03420v2 。预印本题名为 Joint Transmit Beamforming for Multiuser MIMO Communications and Radar；本页式号采用 v2，未混用期刊式号。
- 本站：joint-beamforming.html，case-joint-beamforming，主方向 spatial；与 waveforms、tradeoffs 互链。保留八方向与六深度框架。
- 原文：§II 式(1)–(7) 集合平均协方差/等每天线功率；§III 式(8)–(25) 空间功率、方向对相关性、用户 SINR；§IV 式(26) 联合优化，§IV-B 式(27)–(34) 与定理1/附录A 的 SDR 和恢复；§IV-C 式(35)–(44) 与定理2/附录B 的 ZF；§V 图3–12 的仿真比较。本站不运行 SDR、优化型 ZF、SSP 或接收机。
- 独立构造：M=8、K=2、Pt=1、每天线平均功率1/8、半波长 ULA、孔径3.5λ、确定正交模态 −30°/0°/30°。信道混合 η∈[0,1]，默认.8；噪声功率默认.01，Γ默认12dB。同一状态内三构造共享 H/噪声/功率；A/B预编码固定，C随当前已知H解析旋转。不是原文M=10/随机复高斯H/1000信道试验。
- 机制：A秩2但照亮三个目标方向，两侧完全相关；B秩3，独立雷达流消除方向间相关但可能干扰用户；C与B整个R相同，空间功率/相关性相同，雷达用户干扰归零。只针对这一特别构造，不能推广成一般ZF无代价。
- 证据：复数因子产生实际 R、1801角度功率、数值特征值与逐用户 D/Iu/Ir/噪声/SINR；独立 NumPy 检验含η端点与极小正值。全站结构和 DOM 回归另测，不代表真实浏览器或部署验证。
- 限制：集合 R≠任意有限块 XXᴴ/N；秩不限制功率峰数量；三构造失败不代表一般问题不可行。固定R★的SINR上界只在本例模型下成立。不复现原文优化曲线、检测/角度估计或硬件。
- 基线识别：原文 SSP 引用 TWC 2018 DOI10.1109/TWC.2018.2803045；与本站 TSP 2018 严格协方差 waveform-design 案例不同。本站A不是SSP。引用/奖项快照沿用原研究目录，没有重新估计或宣称新的影响排名。

## 2022 · 单用户点目标 CRB 最优波束（2026-10-10 增补）

- 期刊：Fan Liu、Ya-Feng Liu、Ang Li、Christos Masouros、Yonina C. Eldar，*Cramér-Rao Bound Optimization for Joint Radar-Communication Beamforming*，IEEE TSP 70，240–253，DOI https://doi.org/10.1109/TSP.2021.3135692
- 固定已发表版：作者机构托管 PDF https://www.weizmann.ac.il/math/yonina/sites/math.yonina/files/Cramr-Rao_Bound_Optimization_for_Joint_Radar-Communication_Beamforming.pdf 。2021-12-15 在线发表、2022-01-11 当前版本；正文定位采用此期刊版。2026-10-10 独立下载并检查前述无 `_0` 的期刊 PDF，该次文件 SHA-256 为 `3bb9519855b92a8cca870caf603efe0d05dc1d9369cadad0fb7de20750a61e6d`。原有影响目录身份来源 https://www.weizmann.ac.il/math/yonina/sites/math.yonina/files/Cramr-Rao_Bound_Optimization_for_Joint_Radar-Communication_Beamforming_0.pdf 保留；两个入口不视为两篇论文或两份引用记录。arXiv https://arxiv.org/abs/2101.12530v1 的题名为 *…Joint Radar-Communication Design*，不混用其式号。
- 身份与入口：`case-crb-beamforming`、`crb-beamforming.html#intuition`。它是独立的空间波束与点目标角度案例；既有 `case-crb` 仍为高斯信道标量 CRB–rate 及 LS 机制，不合并论文身份。
- 六层入口：`#intuition` 先看发射天线、用户和反射目标；`#model` 分清已知发射块与未知 θ、复 α；`#experiment` 调通信门槛；`#paper` 对照原文；`#limits` 检查预算与奇异条件；`#reproduce` 独立复核。它们接入空间感知和通感权衡两个既有方向，知识地图仍保留 31 个概念及原有入门入口。
- 原文定位：pp.241–242 §II-A/B 式(1)–(9) 的流模型、未知复系数与点目标 CRB；pp.243–244 §III-A/B 式(19)–(29)、引理1/定理1的单用户闭式最优解；pp.248–249 附录 A/B 的张成空间和活动约束证明。扩展目标式(10)–(18)、多用户式(30)–(33)/定理2仅作范围边界，定理2的秩一结论有满列秩条件。
- 本站主实验：独立合成 Nt=8、Nr=12、中心化 λ/2 ULA、θ₀=0、L=64、P=1、块能量64、‖h‖=1、σC²=.01、σR²=100；α=1 仅用于评估下界，对估计器仍未知。单通信流无其他流干扰，通信指标为 SNR。ρ 为合成信道幅度重合度，不是用户物理角度；改变 ρ 更换信道场景。按相同总功率求精确最优 w，不要求每天线等功率。
- 下界与边界：完整实参数 (θ, Re α, Im α) Fisher 矩阵经 Schur 补给出有效角度信息。主图纵轴是归一化有效角度信息 g（无量纲）；角度标准差下界（度）由旁边数值单独显示，不是实际 RMSE。最低 SNR 低于转折时有余量，超过转折后发生最优取舍，超过20 dB通信上限可证明不可行；ρ=0且门槛恰达上限时通信可行，但目标零陷使常规角度 CRB 不可用。
- 可选 `#companion`：本站另设 h=u、p=.5 并增加独立探测流的构造。保持整条角功率图、通信 SINR 与总功率一致，改变两空间模式输出的相关性，说明未知复 α 下的角度信息还取决于完整协方差。它不是原文多用户 SDR、主实验候选对比、原图复现或跨场景优越性证据。
- 影响证据沿用2026-10-10快照：OpenAlex 773、Semantic Scholar 855分别显示；2025年施引文献245篇是出版年桶，不是当年索引增长。2024 IEEE SPS最佳论文奖于2025年颁发，非青年作者奖；ComSoc 2022年2月阅读推荐是编辑推荐，不能替代社交讨论量。没有重新刷新或合并引用计数。

## 2026-10-11 UTC · 前沿阅读与官方标准状态补充

这是有界的证据更新，不把初始 2026-10-08 检索截止日期改成全书重新核查。网页新增三个固定版本阅读入口，接入已有 receiver、spatial、learning 方向的原文层；没有新增机制、论文复现案例或知识概念。原九篇影响目录与引用计数保持原快照。

### 标准：分别记录需求、架构、研究报告和待完成工作

- ITU 官方页面：https://www.itu.int/en/ITU-R/study-groups/rsg5/rwp5d/IMT-2030/Pages/default.aspx 。最低性能要求草案 5/116 与评估指南草案 5/119 已提交 SG5，拟于 2026 年 12 月审批；截至本次核对仍称 draft new Report，不写成已批准报告。
- TS 23.137 官方版本记录：https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=5516 。标题 Integrated Sensing and Communication; Stage 2，类型 TS；Rel-20 v20.0.0 于 2026-09-24 上传，官方状态 Under Change Control。只核对元数据，未成功读取该版本全文，因此不描述未经核对的功能实体或程序，不称首个架构标准，也不推断完整 6G 空口、所有 ISAC 能力或商用互操作完成。
- TR 38.765 官方版本记录：https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=4446 。NR ISAC 研究报告，Rel-20 v20.0.0 于 2026-06-23 上传，已进入变更控制。TR 的研究报告身份与 TS 的规范身份分别标注；上传日不改写成会议通过日。
- NR_Sensing_bis-Core 官方工作项：https://portal.3gpp.org/desktopmodules/WorkItem/WorkItemDetails.aspx?workitemId=1121123 。2026 年 9 月记录完成度 25%，截至本次核对仍在推进；立项/工作进度不等于全部技术完成，不以计划结束日期宣称实际结果。
- TS 22.137 官方目录：https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=4198 。继续固定阅读 ETSI V19.1.0：https://www.etsi.org/deliver/etsi_ts/122100_122199/122137/19.01.00_60/ts_122137v190100p.pdf 。3GPP v19.1.0 上传日为 2024-04-04，所链 ETSI 转置文本封面日期为 2026-01。官方目录另列 Rel-20 v20.0.0、Rel-21 v21.0.0，均在 2026-10-02 上传。没有逐条比较这些版本，不从版本晋升推断新增功能。

### F1 · A Tutorial on MIMO-OFDM ISAC: From Far-Field to Near-Field

- 作者：Qianglong Dai 等
- 固定全文：https://arxiv.org/html/2504.19091v2 ；版本记录：https://arxiv.org/abs/2504.19091v2 ，v2 为 2025-12-31
- 2026 期刊记录：https://cris.technion.ac.il/en/publications/a-tutorial-on-mimo-ofdm-isac-from-far-field-to-near-field/ ；DOI https://doi.org/10.1109/COMST.2025.3650568 。2026 出版与 2025 作者版本分开，不称 2026 首次提出
- 核查导读：§III 的观测模型；§IV-B–E 的估计方法与复杂度；§V-B–C 的远场失配与近场扩展
- 学习问题：相同观测、孔径和样本量下，联合估计改善了什么，又付出多少计算量？
- 边界：教程、推导与数值对比；§III-D 的原型来自引用文献，不能作为教程全部算法的实测证据。作者对 OFDM 的预期不是已确定的 6G 波形。本站没有复现算法或原图

### F2 · A Tutorial on AI-Empowered Integrated Sensing and Communications

- 作者：Mojtaba Vaezi、Gayan Aruma Baduge、Esa Ollila、Sergiy A. Vorobyov
- 固定全文：https://arxiv.org/html/2504.13363v3 ；版本记录：https://arxiv.org/abs/2504.13363v3 ，v3 为 2026-02-13
- 作者出版记录：https://www.ece.villanova.edu/~mvaezi/publications.html 列 IEEE Communications Surveys & Tutorials 28，4980–5013，2026 年 2 月；arXiv 注记仍为 To appear。网页保留这一差异，阅读对象标为固定作者版本
- 核查导读：§V-C 的模型辅助学习/算法展开；§VI-A 的波形案例与泛化限制；§VII 的边界
- 学习问题：固定功率与通信约束后，学习省掉哪些优化步骤；换信道或用户数时，目标值与约束是否仍成立？
- 边界：§VI-B 先用纯通信混合预编码演示 learned optimizer，ISAC 扩展另引文献，不把整节曲线标成通感联合实验；仿真不等于实时部署认证。本站没有实现新的学习模型或复现教程曲线

### F3 · Learning-Driven Channel Representation for Wireless Localization: From Channel Observations to Location Inference

- 作者：Hongyu Xie 等
- 固定全文：https://arxiv.org/html/2607.14938v1 ；版本与投稿记录：https://arxiv.org/abs/2607.14938v1 ，v1 为 2026-07-16
- 状态：综述预印本，作者标明 submitted to IEEE Communications Surveys & Tutorials；本次未确认接受或出版，不标已接收
- 核查导读：§IV-C–E 的表示与迁移；§V-D–F 的分布漂移、评估协议和部署成本
- 学习问题：场景内随机划分与跨房间/设备划分分别测出了什么，适配标注量、计算量与定位误差应怎样一起报告？
- 边界：主要对象是无线定位，不能直接等同人体姿态、全场景泛化或新的硬件实测结论；这里只借鉴评估框架，不作跨论文性能排名

资料核查涉及以上三篇的相关全文章节与版本记录；没有逐式复现或对综述引用的全部实验二次验真。TS 23.137 的全文下载未成功解析，只使用官方元数据。页面实现依据这一证据快照转写；结构、生成器与回归验证范围另见 [本次验证记录](FRONTIER-OCTOBER-VALIDATION.md)。

## 2018 · 通信训练复用与 Golay 互补相关（2026-10-11 增补）

- 本站：`golay-radar.html#experiment`、`case-golay-radar`，归入既有波形与导频方向；原研究目录 `signals-networks` 组内的 `80211ad` 卡片接入本案例，不新增论文或影响力计数
- 固定原文：Kumari 等，*IEEE 802.11ad-Based Radar: An Approach to Joint Vehicular Communication-Radar System*，https://arxiv.org/abs/1702.05833v1 ，2017-02-20；期刊身份 https://doi.org/10.1109/TVT.2017.2774762 ，IEEE TVT 67(4)，3012–3027，2018-04。式号只对应 v1，不混用未检查的期刊 PDF
- 定位：§II-A 图1–2 的 STF/CEF 训练复用；§III-A 式(1)与 §III-C 式(10)–(11) 的回波；§IV-A 式(13)–(19) 的相关处理；§IV-B.3 式(24)、(27)及 §IV-C Remark 3 的相位与有限观测边界。§V 提供分析与仿真，不是道路实测
- 独立机制：递归构造孤立非周期 Golay 对，等资源比较 A+A 与 A+B；固定完整接收记录，不依赖未知时延移动窗口；复数相关先相加再取幅度。弱回波、运动与合成长间隔只检验简化模型条件，不输出检测或论文性能结论
- 原文区别：CEF 块的符号、循环延拓、保护间隔和提取窗口必须连同帧上下文处理，不能把原文块直接当作本站孤立非周期互补对。本站不声明标准芯片顺序、调制或帧兼容
- 六层入口：`#mechanism` → `#model` → `#experiment` → `#paper` → `#limits` → `#reproduce`；先修使用已存在的 `foundations.html#iq`、`#matched` 与 `#doppler`。保留原入门概念路径，只增补相关专题链接
- 证据边界：不复现原图、原文接收机、分数时延、脉冲成形、通信吞吐量或实测精度；芯片率、占用带宽、时延格距、分辨能力与检测决策分开。九篇影响目录沿用原 2026-10-10 快照

## 2019 · OFDM 空格与时间插值（2026-10-11 增补）

- 固定原文：Carlos Baquero Barneto 等，*Full-Duplex OFDM Radar With LTE and 5G NR Waveforms: Challenges, Solutions, and Measurements*。作者 v1：https://arxiv.org/abs/1908.03418v1 ，2019-08-09；固定 PDF：https://arxiv.org/pdf/1908.03418v1 。期刊 DOI：https://doi.org/10.1109/TMTT.2019.2930510 ，IEEE TMTT 67(10)，4042–4054，2019-10。机构身份来源：https://research.aalto.fi/en/publications/full-duplex-ofdm-radar-with-lte-and-5g-nr-waveforms-challenges-so/
- 版本边界：核对对象为 13 页作者稿，未与期刊最终排版逐项比对。PDF SHA-256 为 `fe694b1caabd7f2f79ca9e0e06e674ba1a48d60e598b514fcd7a248c5ca05af3`；元数据创建日 2019-08-11 与 arXiv 提交日 2019-08-09 分开，不据此编造另一次修订。以下页码、图号与式号均指固定 v1
- 身份与学习入口：`case-ofdm-interpolation`、`ofdm-interpolation.html#mechanism`；机制实验在 `#experiment`，其余层为 `#model`、`#paper`、`#limits`、`#reproduce`。接入既有 `prototype` 方向，保留八方向、31 概念和全部原有入门路线。既有 `ofdm_full_duplex` 影响卡成为第五篇可进入深度机制的论文，九篇书目不增删
- 原文定位：第 2 页图1分开 RF/DSP 抵消与雷达域处理。第 3 页 §II-A 式(1)为频率/时间相位模型，式(2)–(3)区分匹配和活动格子除法；§II-B 式(4)在固定子载波上沿时间连接真实活动端点，保留原活动值。它不是频率插值，不支持边界外推或永久空子载波恢复。第 3–4 页式(5)另外包含窗函数，本站采用矩形权重
- 证据层级：第 4–5 页 §II-C、图2/Table I 为数值参考，其中 RMSE 以成功检测为条件；第 5–6 页 §III-A、图3是自干扰仿真；第 6–7 页图4及式(9)–(12)说明抵消设计。第 8 页图6、§IV-A/B是射频测量，第 9–10 页图7–8、§IV-C为无人机测量及局部 ROC，第 10–11 页图9、§IV-D为车辆实例。局部 3×3 邻域 ROC 的 100 张无无人机/100 张有无人机图不构成任意全场景虚警保证
- 本站独立模型：N=32、M=33、Δf=1 MHz、载频5 GHz、Tu=1 μs、CP=1 μs、Tr=0.5 ms。Tr 是稀疏探测的起点间隔，不是连续 LTE/NR 符号长度；频率端点跨度31 MHz、名义 DFT 带宽32 MHz，真实起点跨度16 ms、DFT时长16.5 ms。未知时延、多普勒与公共复增益；单站、单目标、相干时钟、窄带、可忽略 ICI 与距离迁移。真值只作生成及明确标出的评估，不参与插值权重或候选模板
- 掩模与资源：20 条子载波完整观测，k=10…21 有内部时间缺口；两端真实活动格子相隔 G∈{2,4,8,16} 次起点间隔。总格数 J=1056，实际观测 K=1068−12G，补值数12(G−1)。只有默认 G=8 时是972次观测、84个补值；改变 G 会改变 K 和单位活动格子能量下的总能量。相同设置内两种处理始终共享实际观测、噪声实现、频率、时长、能量和候选网格
- 观测模型：只在 X≠0 的活动格子求 d=Y/X。已知单位模 QPSK 保持商噪声独立同方差；X=0 的空格不表示已测信道为零，不能用除零或任意小数替换制造观测。空格零占位的掩模求和与只遍历真实观测的求和等价，是计算形式而非零信道假设
- 机制：式(4)的线性补值连的是复平面弦线，而运动真相位沿圆弧变化。中点无噪声比值为 cos(πf_DGTr)。默认 G=8 时，125 Hz 中点相消、250 Hz 中点反向；500 Hz 只是中点重新碰巧正确，其他缺失格子仍可错误。此式是单格复数重建误差，不等于整幅目标消失、距离估计偏差或实际检测结果
- 同观测比较：真实观测的匹配和与普通补值周期图分别按 K 与 J 标定，图像使用共同单位幅度参考，不逐图把最大值归一到0 dB。静止无噪声补值恢复此构造的完整矩形孔径，可消除原格点零陷处的掩模泄漏；矩形孔径本身的旁瓣仍存在，不能声称所有旁瓣消失
- 噪声与信息：补值算子 L 使噪声协方差成为 σ²LLᴴ；中点噪声方差较小，但与端点相关。正确输出噪声方差通过 Lᴴ 的端点权重计算，不能把1056个显示值视作1056次独立测量。保留原活动值的确定性补值不创造信息；后续普通补值统计量仍可能降低统计效率。噪声标准化的补值周期图不是原观测似然；单点指数噪声分布不能直接给出相关搜索图的全图虚警保证
- 适用边界：不实现 LTE/NR 标准资源映射、编解码、吞吐量、变幅 QAM、模拟/数字自干扰抵消、ADC 削顶/量化、时钟失配、杂波、多目标、加速度或硬件测量；不声称标准兼容、完整论文复现、检测性能或实际 RMSE。下一问应在实际掩模、符号幅度与杂波模型下重新检查权重、预算和门限
- 影响证据保留2026-10-10快照：OpenAlex 368、Semantic Scholar 368分开显示；2025年施引文献76篇是出版年桶。ComSoc 2022年2月 ISAC Best Readings 为编辑推荐。保留既有所有身份、来源链接、抓取时间、背书与社交讨论量边界，不刷新或合并引用数

## 2022 · 雷达辅助波束候选决策（2026-10-11 增补）

- 本站问题：“猜中最优波束，与保住通信增益是一回事吗？”独立 `case-radar-beam-decision` / `radar-beam-decision.html` 归入既有 `learning` 方向；方向范围明确包括感知辅助通信，同时保留 CSI/姿态学习入口。六层为 `#mechanism` → `#model` → `#experiment` → `#paper` → `#limits` → `#reproduce`，分组协议是可选研究扩展。先修为已有 `foundations.html#iq` 和 `#array`，下一步为 `practice.html#notebook`。31 个概念的入门入口不变，只向任务学习、波束设计和通信感知互助增添专题链接。
- 固定主文献：Umut Demirhan、Ahmed Alkhateeb，*Radar Aided 6G Beam Prediction: Deep Learning Algorithms and Real-World Demonstration*，WCNC 2022，2655–2660；DOI https://doi.org/10.1109/WCNC51071.2022.9771564 。作者身份 https://www.wi-lab.net/research/radar-aided-beam-prediction-paper/ ，NSF PAR 记录 https://par.nsf.gov/biblio/10404321 ，六页接受稿 https://par.nsf.gov/servlets/purl/10404321 。核对文件 SHA-256 `34cc5b1602b185bdcf256848ee88b26f778a4fa1ee9f49a63fcfd0d9fca61d21`；下列页码是 PDF 页码，不与会议印刷页码混用。
- 主文献定位：pp.1–2 §II 式(4)–(6)为通信信道和码本标签；pp.2–4 §III 是映射、预处理和 CNN，p.4 Table II 是输入大小；p.4 图3分开 77 GHz FMCW 雷达和 60 GHz 通信阵列；p.4 §IV-A、pp.4–5 §IV-B 为采集和标签；pp.5–6 §V、图5–7 是准确率、处理代价与训练量研究。当前雷达帧是输入；4 RX × 256 samples/chirp × 128 chirps，经 range-angle、range-velocity 或 radar-cube 幅度特征分类。标签是 64 个实测通信波束中最强者，RGB 用于筛选，不是雷达单模态预测器的输入。
- 版本区别：六页接受稿的 6,319 个过滤样本与 70/20/10 训练/验证/测试划分句位于 p.5；按验证结果选检查点，并运行五次训练。它未建立轨迹或场景留出的证据。旧九页 https://arxiv.org/abs/2111.09676v1 / https://arxiv.org/pdf/2111.09676v1 ，2021-11-18，SHA-256 `ef61a4147b09d8beb720d58b262559454b1810df44543cbadd511119318598db`，在 §V-B p.6 使用 70/30；其 §III-C 式(10)定义 top-K。不能把旧版划分或式号悄悄放入标为 WCNC 2022 的对照。
- DeepSense 只作资源文献：固定 https://arxiv.org/abs/2211.09769v2 / https://arxiv.org/pdf/2211.09769v2 ，2023-03-20，SHA-256 `1dced2fe12b13a07c9269873dac90cce7a0a89916be20f7bfa6c6ce3ada01f59`。§III 的 scenario 是采集会话，data group 是对齐多模态样本；§V-A/B 的采样率协调、UTC 时间戳和后处理对齐不等于曝光时刻完全相同或已证实零偏移。§VII 的跨场景例子使用场景1/5的视觉和位置，不是雷达单模态 Scenario 9，不能借其分数声称本案例泛化。
- 作者代码单独固定：https://github.com/umut-demirhan/Radar-aided-beam-prediction/tree/8a23f440b65fdc090b8161e4bfe4c1e0310ca67a ，提交日 2025-04-21，仅阅读，未运行或导入。`dataset.py` L19–27 为 MAT `data`、`unit1_radar_1`、`beam_index_1`；`train.py` L24–25、44–46 读取预制 train/val/test CSV，成员未核对，L103–109 按最小验证 loss 选择，与接受稿最大验证 top-1 的措辞不同；推断脚本 L59–61 的 `65 - y` 注释称 [1,64]，实际 CSV 基准未核实，不推测修正。README L26–27 提醒新训练未必精确复现。
- 权限与真实复现边界：未取得符合范围的小规模可再分发数值子集，没有打开归档或绕过登录。旧 arXiv 论文为 CC BY 4.0，作者代码为 CC BY-NC-SA 4.0，当前任务/场景许可链接为 CC BY-NC-ND 4.0，登录后的附加条款未知，三种许可不能互代。当前 Scenario 9 文档的 5,964 样本和 `seq_index` 不等于接受稿 6,319 样本任务集；尚未检查实际行、时间戳、分组成员和标签方向。真实复现仍需确认档案版本、许可和评估协议。
- 本站独立合成模型：单位范数、半波长 M=16 ULA，N=64 波束，单路径窄带；固定七近邻监督回归使用合成传感器特征与训练标签坐标，测试 ID、真方向、标签和完整功率不进入预测。候选排名先冻结再评估，显示真值只是教学揭示。3 场景 × 12 轨迹 × 64 帧，各划分 512 个训练样本、同四条轨迹上的 64 个测试锚点，七近邻等模型超参数事先固定，未运行自动模型选择；交互反复查看同一评估锚点，不是未触碰的最终基准。若根据结果调参，应另设验证集并保护最终测试集。浏览器独立 JavaScript 使用 Mulberry32/Box–Muller；不与早期 Python/NumPy default_rng 的样本或性能数字混同。
- 三项指标分开：top-K 标签命中与波束漏选；`10 log10(max_j P_j / max_{j∈S_K} P_j)` 的候选探测后功率损失；K/64 探测比例。候选内选择假定信道不变、K 个波束可被完美测量，不是盲用排名第一项的功率。均值、p95 与指定 dB 阈值超限是功率损失描述，不是通信 outage。波束索引不是角度，线性相对功率与图形 dB 分开。
- 数值约定：对剩余最大功率的绝对容差 1e-12 内，选择最小波束索引，标签/排序采用同一锚定规则。损失使用实际最大功率，不使用近并列标签功率替代；不裁剪损失，候选最大功率严格为零时为正无穷。图形 dB 下限只是显示；解析 ULA 零陷可能保留极小正浮点余量，不把它暗改为零。嵌套排名下 K 增大，标签命中不下降、最佳候选损失不增加；K=64 时命中=1、损失=0、探测节省=0。
- 开销边界：1−5/64=92.1875% 只是理想探测计数减少，不能复述为复现了“93% 端到端节省”。本站没有测量传感器、训练、预处理、推断、探测、切换、回退、通信编解码或硬件成本，不能由 K 增大推断净速率增加或时延下降。
- 可选分组研究：同轨迹其他帧、未见轨迹、未见场景的训练池问的是不同问题；随机帧划分并非自动无效，不能把轨迹内插值当作未见轨迹/场景证据。相关噪声、场景偏移与稳定上下文均为合成构造，上下文数值按构造携带组指纹，不是 DeepSense 泄漏指控。元数据重命名只检查预测接口，不证明没有组信息。检查零偏移和不同种子，不预设协议得分的普遍排序。四条相关轨迹不是 64 次独立试验，不附天真的逐帧二项置信区间。
- 目录与证据：仅连接已有 `radar_prediction` 卡的 caseId/readingPlan，九篇论文不增删；保留 2026-10-10 OpenAlex 141 / Semantic Scholar 161 及全部时间戳、年度桶和 socialDiscussion。`deepsense` 卡保持无案例、资源阅读状态，其 289 / 377 快照不变。本文来源核对不等于本站浏览器验证或论文实验复现；源版本与边界另见 `data/radar-beam-decision-sources.json`。

## 2020 · 递归复背景与慢目标（2026-10-11 增补）

- 独立课程 `perceptive-clutter.html` / `case-perceptive-clutter` 只研究同一复信道系数的逐时递归，不复现完整感知移动网络。六层为 `#question` → `#model` → `#experiment` → `#source` → `#boundary` → `#validation`；接入既有 receiver 方向，不新增研究方向。32概念中的新项是递归背景；原31概念的入门入口保持不变
- 固定主版：UTS Accepted Manuscript，https://opus.lib.uts.edu.au/handle/10453/137860 ，PDF https://opus.lib.uts.edu.au/bitstream/10453/137860/4/Framework%20for%20a%20Perceptive%20Mobile%20Network.pdf ，15物理页（含版权封面），SHA256 `a51c363bbb6b6a646a1de1ff20054722db60ad7ec2a303421d570ae5b8d82172`。对读 https://arxiv.org/abs/1901.05558v1 / https://arxiv.org/pdf/1901.05558v1 ，2019-01-16，14页，SHA256 `e947f001746f33fb91be4c2b5781c9df29a67ce0023bd7975092db241f75f8ec`。出版身份保持2020卷56期3 pp.1926–1941；2019在线发表/预印本，DOI https://doi.org/10.1109/TAES.2019.2939611
- 原文定位：§III-A式(2)–(3)的复路径与未知相位；§V-A式(22)–(23)的信号剥离；固定PDF §VI式(30)，UTS p.10 / arXiv p.9为背景更新；式(32)，UTS p.11 / arXiv p.10为背景估计噪声方差。自动HTML把后三式编号为(31)/(32)/(33)，不能直接沿用
- 条件性复数核验：按固定两PDF的正频率/正向递归约定，alpha=.5、omega=pi/2、p2时，式(30)得到−.5+.25j，打印式(31)得到−.25+.5j。两者幅度相等，复相位不同。本站采用因果递归；这不是作者勘误，不否定只比较幅度的图2，不证明另一最终排版版也有同一问题，也不替代整篇论文审计
- 图2是背景正弦响应幅度，图3是背景估计内杂波/动态干扰功率比；§VII-C图11是背景重建误差，图12是角度/路径距离。本站均未复现。两版本RCS假设与图2时长设置差异明确保留，不拼出虚构的论文实验设置
- 模型固定P512个慢时间观测（不是512子载波）、间隔2ms、b0zero、默认alpha.95/f_D2Hz。接收滤波器只有x/alpha；C/A/phase/f_D仅供生成，分量拆分仅供解释。alpha与时序对照复用相同观测和噪声，停止/离开保留相位连续或负背景记忆尾迹。稳态目标功率传递、包含启动的整段目标能量比、静态幅度残留、背景/输出噪声协方差分开，不报告准确率、Pd/Pfa或完整系统收益
- 有限alpha>0复数处理可逆；幅度变弱不是自动证明Fisher信息永久损失。Alpha0更新后输出全零，alpha1永不学习；零增益与无穷记忆诚实导出。复数先平方会丢掉多普勒相位，500Hz在2ms采样上与DC混叠
- 仅激活既有 `perceptive` 影响卡，九卡metrics/endorsements/socialDiscussion全部沿用2026-10-10快照。OpenAlex DOI记录1与题名匹配记录295保持不可比警告，不能相加或刷新；Semantic Scholar295单独显示。真实信道漂移、多径分离、完整网络和硬件验证仍为研究计划。数值核心、独立参考与实际验证范围见 `docs/PERCEPTIVE-CLUTTER-VALIDATION.md`

## 2026-10-11：分离与共享阵列的资源账本与空间置零

入口：`shared-array.html#question`；实验 `#experiment`；物理对象 `#objects`；投影机制 `#mechanism`；边界 `#boundaries`；原文 `#paper`；检验 `#validation`。使用既有 `mu_mimo` 书目卡，不新增第十篇论文。

- 固定身份：Fan Liu、Christos Masouros、Ang Li、Huafei Sun、Lajos Hanzo，*MU-MIMO Communications With MIMO Radar: From Co-Existence to Joint Transmission*，IEEE TWC 17(4)，2755–2770，April 2018，https://doi.org/10.1109/TWC.2018.2803045 。不是 TSP 2018 波形论文，也不是 2020 独立雷达流论文
- 已发表 VoR： https://discovery.ucl.ac.uk/id/eprint/1563386/7/Masouros%20VoR%2008288677.pdf ，16 个 PDF 页，印刷 pp.2755–2770；SHA-256 `4d8f2135a6014338d82dee21da2ba2e05e3c4567bc55c8cb2f4f5525c10855a2`。机构记录 https://discovery.ucl.ac.uk/id/eprint/1563386/ 的 volume14 是元数据差异，采用 PDF 的 volume17。https://eprints.soton.ac.uk/419970/ 也将其标为 VoR
- 固定投稿稿： https://arxiv.org/abs/1707.00519v1 ，PDF https://arxiv.org/pdf/1707.00519v1 ，2017-07-03 13:02:38 UTC，15 页；SHA-256 `b9cbff1ab26b63926e1de87393121ec3ba6ca5de10a7bec99b95ddec91fb42ac`。没有确认独立机构接受稿，不将有接收日期等同于接受稿
- 定位分别标版本：VoR §II/Fig.1 p.2757 / v1 p.3 为物理分组；式(1)–(4) VoR pp.2757–2758 / v1 pp.3–4 为分离接收、协方差及 SINR；式(5)–(8) VoR p.2758 / v1 p.4 为共享数据模型；式(11) VoR p.2759 / v1 p.4 为严格零干扰；式(14)–(18) VoR p.2759 / v1 p.5 为总体块对角方向图；式(19) VoR p.2759 / v1 p.5、式(20) VoR p.2760 / v1 p.6 为原优化；§VI VoR pp.2764–2766 / v1 pp.10–11 为特定仿真。7 vs 15 dB PSLR 不能外推成普遍收益
- 两版式(12)/(13)均印刷为 `diag(R₁)=P_R·1/N`，而 R₁ 是 N_R×N_R，全篇 N 指总阵元，未找到局部重定义。按 N=20、N_R=14、P_R=P_C=P₀/2 逐字条件计算，雷达迹 .35P₀，结合式(19)通信预算 ≤.5P₀，总迹只能推出 ≤.85P₀。不是作者实际使用不等功率的证据；没有检查作者代码或勘误，不能声称等号成立或“修复后复现”。本站自行约定实际雷达迹 P_R 并验证
- 本站独立模型固定同一八元半波长 ULA、位置 mλ/2、孔径3.5λ、8条理想发射 RF 链；默认4+4连续分组，各子孔径1.5λ。分离1通信流+1独立雷达流，共享1通信流+0独立雷达流。带宽、符号时间、观察时段相同但未赋予 Hz/秒数；噪声功率.05、每阵元增益g=1、φ=.37、Γ=20。原文 Rayleigh 改为显式单路径 LOS，子阵从同一 h 截取不重新归一化。本站 h=conj(h_paper)，使 hᴴx 与原文 h_paperᵀx 等价
- 分离 c/s 为零均值单位方差独立符号，集合协方差块对角；有限随机块不自动有精确零交叉项。2018 共享只发通信数据，不把数据的雷达用途再次计为用户干扰。2020 joint-beamforming 页另有独立雷达流，两种教学模型不混合
- A/B/C/D 实际总功率均为1，分离 P_R=P_C=.5；raw 是未花满预算的诊断，默认总迹 .7866116524。令 q=||Πb_r||²，raw 雷达迹 P_Rq，目标雷达照射 P_RN_Rq²；恢复雷达功率后目标雷达照射 P_RN_Rq。只有固定雷达子阵、精确 CSI、单目标、总功率与严格零干扰的窄子问题有此闭式最优性；四个整体配方不构成架构最优包络
- 默认 u_user=0、u_target=.25 是刻意选择的全阵正交方向。B 的总目标照射恰好2是4+4等预算的特殊抵消，应分解雷达/通信贡献；改成6+2便不再恒定。B默认最高单天线平均功率约.2021，大于1/8；未保留原文每天线相等约束，不宣称相同功放额定能力
- 精确重合使目标导向归一化投影未定义，N_R>1 时非零零空间仍可存在；独立见证波束可花满预算但该目标雷达贡献为零。N_R=1且非零用户信道、正雷达预算才是固定严格置零子问题不可行。近重合用稳定残差、scale-safe归一化、解析指标和保留的直接求和诊断，不以epsilon伪造波束；极端数值范围错误不是物理不可行
- T=aᴴRa 仅是发射方向功率，包含两类信号全部照射；不估计或假设β=1，不建模雷达接收机、CRB、检测、BER或硬件。四个配方不复现 SDR、流形法、随机秩一恢复、原图或整篇论文
- `mu_mimo` 仅更新 `caseId` 与阅读计划；九卡引用、日期、来源、学会推荐与社交快照原样保留。DeepSense仍仅为资源/原文入口。研究模型冻结核验、本站JavaScript、DOM、真实浏览器和线上部署是不同证据层，分别记录，不能由Python测试通过推断后者

## 2015 · 单向主动链路的直达与镜面反射（2026-10-11 增补）

- 本站问题：“同一个终端，为什么收到两条路径？”独立 `case-multipath-channel` / `multipath-channel.html` 是既有 `channels` 方向的首个主要案例。通用学习入口 `#question`；显式实验 `#experiment`；其余层为 `#model`、`#source`、`#boundary`、`#derivation`，实际验收记录另列于 `#validation`。复用原有 `phase`、`delay`、`channels` 概念，保留全部入门入口，不增加第33个概念或研究方向
- 固定来源：Leitinger 等，*Evaluation of Position-related Information in Multipath Components for Indoor Positioning*，IEEE JSAC 2015。阅读版本 https://arxiv.org/html/1409.1467v2 ，身份与版本记录 https://arxiv.org/abs/1409.1467v2 ，固定 PDF https://arxiv.org/pdf/1409.1467v2 。v2 上传于2018-12-10；2018不是期刊发表年份。不复制第三方论文全文、原图或测量数据
- 原文定位：§I/Figure 1 的平面图与镜像锚点；§II 式(1)的复数延迟信号之和；§III-A 式(7)中的未知复幅度干扰参数；§IV 式(18)–(24)的几何与时延；§V-A 式(36)–(38)的非重叠/正交假设；§VI-B1 Figures 3–5 的路径重叠数值研究。这里只沿指定章节组织几何、观测与边界，未重做论文的 CRLB/EFIM 或图中数值
- 场景是单向主动链路 T→P 或 T→墙→P，不是雷达往返：每条路径 τ=L/c，候选 d=cτ 是总路径长度，不能套用单站 cτ/2。T=(0,2) m、P=(6,h) m，h∈[.1,6]；墙为 y=0、x∈[−2,10]，一次反射点 Q=(12/(h+2),0) 位于有限墙内。镜像点不是另一部电台；墙面反射不是另一个终端
- 生成器给出两路实际复数贡献并相加为 Y；接收机只读取 Y、已知 X、基带频率和固定候选网格，不读取几何、墙面、真实时延、路径系数、路径数或分量标签。未知公共复因子 A 与两路复增益保留；载波传播相位只进入系数一次，不能借绝对相位恢复距离整圈。几何图、分量和给定真值时延的 Gram 单独作为解释层
- 独立教学资源：N=128、整数 k=−64…63、Δf=2 MHz、参考载波6 GHz，固定确定性QPSK，Σ|X|²=1。254 MHz是频点端点跨度，256 MHz是名义DFT带宽，均不等于硬件零带外泄漏承诺。Tu=.5 μs、CP=.125 μs、完整突发.625 μs；接收窗固定[0,Tu)，全域最大绝对时延10/c≈33.35640952 ns小于125 ns。整数频率保证有用包络周期性，普通复制32样点的CP成立；不是LTE/NR标准兼容声明
- 固定波形的连续有用能量为1，连续CP能量.21922241148558474，总能量1.2192224114855845；数字有用样点能量约1，数字CP能量.21901243898695386，总能量约1.2190124389869537。部分区间的连续积分和样点求和分开，CP时间比例1/4不推出能量为1/4；归一化能量不声明瓦特或焦耳。不同场景保持完整X、网格、时长、CP、单天线与处理器不变；接收能量随几何和相干干涉自然变化，不补偿成固定接收SNR
- 主匹配固定d=0:.01:14 m，不把真值加入候选。z(d)=ΣX*Y exp(j2πf d/c)/E保留复数，只按已知发射能量E归一化；功率为|z|²。固定纵轴0….12由|z|²≤1/9支撑，不能逐图峰值归一。整数子载波的解析核带有exp(−jπq)复相位，不能只保留sinc模。网格加密不增加带宽或独立信息
- 全零响应返回no_response与空估计；非零最大值只是single_grid_maximum，不是检测、路径数或二维坐标。h=1 m默认场景的单最大值5.77 m比两条真实路都短，这是相干匹配峰位移，不是更早物理到达。给定两时延的Gram仅描述分离两个未知复幅度的条件性；严格同延迟/整数周期别名、有限但病态的近重叠和binary64范围限制分别标记，不用epsilon把它们合并成严格奇异
- 改变h同时改变路长、1/L幅度和载波相位，是不同静态快照，不是只改变时延或连续运动/Doppler。b仅为理想直达路衰减干预，不虚构障碍物；b=0后最早可见反射仍不是LOS。当前没有噪声、漫散射、Doppler、材料/极化、穿透/绕射、真实天线方向图、路径关联、检测、二维定位或完整信道校准
- 已知地图、时钟同步、角度、多锚点和路径关联都是额外条件；画出墙面不表示接收机知道墙面，一条标量时延不给出二维点。近重叠不表示所有位置信息消失，单峰不表示只有一条路径；不把独立教学核、Gram诊断或解析对拍称为论文数值复现，也不据此声称多径普遍有益
- 本次新增的是有边界的教学案例与来源导读；九篇影响目录、其中八篇已接入状态以及全部metrics/endorsements/socialDiscussion沿用2026-10-10快照，没有新增影响力论文卡、计数或评价。来源核对、独立参考、本站数值、静态/DOM测试、真实浏览器和线上部署分别报告


## 2024 · 两站检测、充分压缩与双向回传（2026-10-11 增补）

- 入口 `distributed-detection.html#question`；随后 `#observation`、`#model`、`#experiment`、`#paper`、`#practice`。`case-distributed-detection` 接入既有 `networks` 方向；新增的是独立教学模型与来源背景，不是原论文复现。复用 `matched`、`detection`、`budget` 概念，保留全部原基础入口与32个概念
- 主来源为 Behdad、Demir、Sung、Björnson、Cavdar，*Multi-Static Target Detection and Power Allocation for Integrated Sensing and Communication in Cell-Free Massive MIMO*，IEEE TWC 23(9)，11580–11596，2024，https://doi.org/10.1109/TWC.2024.3383209 。固定版本 https://arxiv.org/abs/2305.12523v2 ，PDF https://arxiv.org/pdf/2305.12523v2 ，2024-03-27。冻结研究交接已复查本地PDF SHA-256 `30b871e5bb3dd1a66fab1a4c2ab3974abb8a7e664e04e2dfa62f6e50679c0d10` 及相关提取文本；本次网站接入不宣称重新下载或独立重读整篇全文，不复制第三方全文或原图
- 固定 v2 §VII 式(20)–(33) 是对未知 RCS 和目标无关信道作最大化的 MAPRT；先验允许一般 RCS 协方差。§IX/Table III 数值设置明确使用独立、等方差 Swerling-I RCS。本站先把随机 α 积分掉，得到边缘化 LRT；“未知 α 有先验”不意味着与论文 MAPRT 相同。本站 κ 控制的相关例子不是论文仿真设置；两站似然、解析 ROC、相位反例和标量账本均为独立推导
- 直接问题动机：Zou、Behdad、Demir、Cavdar，*Distributed Versus Centralized Sensing in Cell-Free Massive MIMO*，IEEE WCL 13(12)，3345–3349，2024，https://doi.org/10.1109/LWC.2024.3462710 。已有交接核对出版元数据并阅读公开转录，但稳定官方/作者全文及可散列PDF尚未取得。因此只用来提出计算位置与双向回传问题，不对其公式、fully/partly-informed 算法、资源公式或性能曲线作已验证归属；后续忠实对照须先取得稳定且获准访问的全文
- 本站固定两个已校准接收站和一个目标候选，H₀:yᵣ=nᵣ、H₁:yᵣ=αᵣs+nᵣ；s∈ℂᴸ、E=sᴴs>0，已知白噪声 nᵣ∼CN(0,σ²I)。σ²是一个复样本噪声功率，实虚部方差各为σ²/2。α∼proper CN(0,qRκ)，Rκ=[[1,κ],[κ,1]]，ρ=qE/σ²。κ改变相关性而保持tr(qRκ)=2q；当次α和H标签只在模拟器内部，不作为检测器输入
- zᵣ=sᴴyᵣ/(σ√E)，H₀:z∼CN(0,I₂)，H₁:z∼CN(0,C)，C=I₂+ρRκ。只有固定候选、已知波形和已知高斯白噪声等条件下，原始样本中的正交噪声残差才在似然比中相消。原始处理和两个复匹配输出是相同检测信息，可以分布式计算而无损；未知σ²时残差可能含估噪信息，不能沿用结论
- logΛ=Q−logdetC；Q用非负特征式 a₊|(z₁+z₂)/√2|²+a₋|(z₁−z₂)/√2|²，其中b±=ρ(1±κ)、a±=b±/(1+b±)。α被边缘化，不由真实实现提供。κ=1虽使反射先验秩一，含独立噪声的观测协方差仍正定；不求逆奇异先验，也不用epsilon伪造可逆性
- ρ>0、κ=0时Q与S=|z₁|²+|z₂|²成正比，能量和也实现同一检验。ρ=3、κ=.75时z=(√2,√2)和(√2,−√2)的两站功率均为(2,2)，但Q分别为3.36和12/7。规定Pfa=.05的Q门限约3.103538506508492，一组通过、一组不通过；这证明局部功率一般不能恢复完整复LRT。能量和是明确基线；更一般最优能量域似然还可依赖能量乘积，不在本课曲线中
- 门限由H₀解析分布固定Pfa，再代入H₁求Pd；Pd同时对随机反射与噪声平均，不是单次判决“准确率”。κ=1时Pd=Pfa^(1/(1+2ρ))。ρ=0为H₀/H₁相同的明示端点；恒零Q要达到任意中间Pfa需与观测独立的随机化，Pd=Pfa。跨κ改变H₁，不能用同模型Neyman–Pearson最优性推出“相关越大越好”
- 改变站端相位坐标时数据与先验协方差必须一起变；只旋转一个站的数据是在改变统计问题。未知随机相位漂移不自动等同κ=0独立高斯先验；本课已校准，不解决校准过程或从当次α学习先验
- 三个处理器共享同一参数点的原始观测、波形、发射能量、时长、噪声和先验。两站星型单播、B块、每站每块L复样本：原始上行4LB、复匹配4B、能量2B个实标量；本地模板下行分别按每块4LB、本次一次4L、运行前有效缓存为本次0记账。缓存不表示历史免费；原始站为上传y无需另收完整s。L=16、B=10时，每块下发的双向总量为640/680/660，只更新一次为640/104/84，已缓存为640/40/20
- 站端本地匹配需要s、E、σ²与尺度/相位约定；κ/q只需融合中心持有，不虚构不必要的先验广播。模型下行另外列每次标量与更新次数，默认0表示未估计。同步、包头、时间戳、可靠传输、计算、RF链、组播及链路并行另列；bits_per_real只是编码宽度换算，没有量化模拟，实数充分性不等于有限比特无损，也不是实际吞吐或时延证据
- 不实现未知目标无关信道、完整阵列/多用户波束与功率优化、多目标关联、搜索图Pfa、定位、未知杂波、相位校准或硬件。纸面背景、冻结独立参考、本站JavaScript、静态/DOM、真实浏览器和线上部署是不同证据层，不互相冒充。九篇影响目录、八篇已接入状态与全部2026-10-10计量/学会/社交快照保持不变；不新增影响力论文卡

## OTFS bounded receiver extension (2026-10-12)

[On the Effectiveness of OTFS for Joint Radar and Communication, arXiv:1910.01896v1](https://arxiv.org/pdf/1910.01896v1), §III equations (12)–(16), §IV single-path likelihood/grid estimation and §V-A Gram MP-G. [The canonical receiver lesson](../otfs-receiver.html#intuition) executes two independent reduced experiments. [Source/evidence boundaries](OTFS-RECEIVER-SOURCE-EVIDENCE.md) distinguish finite-grid sensing, corrected full-LMMSE port, unchanged Python reference, zero Gram pruning, and pending browser/full-paper/physical-correspondence gates. The existing reading guide ID is retained.

## Near-field bounded research extension (2026-10-12)

[Near-Field Integrated Sensing and Communications, exact v5](https://arxiv.org/html/2302.01153v5), Eqs(20)–(21), Appendix A MUSIC and Appendix B Fisher. The [same canonical page](../near-field.html#research-experiment) adds actual bounded SDR → finite 65×256 X → noisy Y → truth-blind MUSIC. Its old one-way noiseless #experiment remains a prerequisite. [Source/evidence boundaries](NEARFIELD-RESEARCH-SOURCE-EVIDENCE.md) preserve declared assumptions, historical failures, exact source-free archive parts, and separate numerical, browser and full-paper gates.

## OFDM ICI bounded receiver extension (2026-10-12)

[MIMO-OFDM Joint Radar-Communications: Is ICI Friend or Foe?, arXiv:2103.15694v1](https://arxiv.org/pdf/2103.15694v1), §II–IV equations (5)–(13), (16)–(19), (34)–(36), Algorithms1–3, and §V equations (65)–(66). [The canonical ICI receiver lesson](../ofdm-ici-receiver.html#intuition) executes actual finite-grid MUSIC/APES/GLRT-OMP/CFAR from X/Y/config. [Source and evidence boundaries](OFDM-ICI-SOURCE-EVIDENCE.md) retain the held4-hit/3-false/1-miss cap and distinguish independently checked Python, frozen JavaScript/Node, unmeasured browser latency, uncalibrated nominal Pfa, and unreproduced original curves. The unique existing guide and paper identity remain unchanged.

## 802.11ad bounded receiver extension (2026-10-12)

[IEEE802.11ad-Based Radar, fixed arXiv:1702.05833v1](https://arxiv.org/abs/1702.05833v1), §II-A Figs.1–2, §IV-A Eqs.(14)–(19), §IV-B Eqs.(21)–(28), §IV-C and Remark3. [The actual receiver lesson](../80211ad-receiver.html#question) follows the unchanged [isolated Golay prerequisite](../golay-radar.html#experiment). It executes the full3328-chip source-supported preamble, actual8× waveform, held-observation STF/CEF, Moose and channel/DFT. [Source and evidence boundaries](80211AD-SOURCE-EVIDENCE.md) retain failed acquisition, accepted aliases, mixed-target global Moose, first-frame cancellation, fractional/phase bias, conditional RMSE and every map candidate. Historical10000-bin/28-candidate evidence and the bounded256-bin/29-candidate same-record map are separate. No original curve, complete PHY, real-browser or full-paper claim; one existing paper identity.

## Networked synchronization bounded receiver extension (2026-10-12)

[Fixed arXiv:2607.18680v1](https://arxiv.org/html/2607.18680v1), §II–IV equations (1)–(27), Algorithm1, §VI figures2–10 and TableI. [The receiver lesson](../networked-sync.html#question) works from two actual complex tensors through smoothed CP, structured CP, ESPRIT and same-initializer ALS. [The source/evidence boundaries](NETWORKED-SYNC-SOURCE-EVIDENCE.md) retain operational unit/unfolding ambiguities, golden-section adaptation, geometry-passing wrong clocks, nonmonotone/local-minimum outcomes and a failed severe-collision phase criterion. The old [scalar clock prerequisite](../network-clock.html#model) and canonical supplement-case-clock paper identity remain; no new paper or full-paper reproduction is counted. Optional archives never load on startup; actual browser and publication gates remain open.

## Gaussian-channel Bayesian matrix extension (2026-10-12)

[Fixed arXiv:2204.06938v8](https://arxiv.org/html/2204.06938v8), §II/IV/V-B equations(2)–(7),(41)–(57),(92)–(112), is now connected to the [complex-matrix lesson](../gaussian-tradeoff.html#question). The [scalar CRB prerequisite](../theory.html#crb-mechanism) remains distinct, as does the separate CRB beamforming paper. [Source/evidence boundaries](GAUSSIAN-TRADEOFF-SOURCE-EVIDENCE.md) record actual source48 covariance shaping, full-matrix certificates, posterior/Fisher checks, Gaussian versus Stiefel waveforms, finite Wishart/MP and a separate rank-one sphere MI integral. The39 Fig.4 integrals and offline9216 covariance solves/2359296 waveform evaluations are bounded evidence, with shared-draw denominators and both Pt/PT interpretations retained. Printed93–94 coordinate/prior and109 sign conflicts remain explicit. No general-MIMO finite-SNR Stiefel MI, exact full region, actual-browser acceptance or full-paper reproduction is implied. The35 canonical paper IDs are unchanged; archives are optional downloads.


## Cell-free MAPRT 与功率分配：有界源算法接入（2026-10-13）

固定 [arXiv:2305.12523v2](https://arxiv.org/abs/2305.12523v2) 仍归属同一主论文身份 `supplement-case-distributed-detection`。新增 [真实 MAPRT/CCP 教学入口](../cellfree-maprt.html#question) 接到 networks 的六层；[原两站独立积分 LRT](../distributed-detection.html#question) 继续作为先修。新入口并不把旧积分检测器改名成论文算法，也不增加第 36 篇论文。

- 式(11)–(18)保留实际多站复数 y、已知 G/X 与未知 α/h；式(20)–(33)最大化两种带先验联合密度，保留 log C₃。积分 Gaussian LRT 的行列式常数另列，固定模型下可在正确门限平移后同判决，但定义不同
- 式(35)–(49)/算法 1 的真实 CCP 以感知 SINR 为代理，在通信与每 AP 期望功率约束下优化；式(50)是通信最小功率基线。4 TX、2 RX、M=2、2 UE、10 符号、合成几何/协方差是明确缩小条件，不是原 16 TX/8 UE 场景或图 3–7
- 独立参考的 64 格、1,048,576 个存储分数已重放；6 条接受重启、66 次接受外迭代、71 次子问题尝试保留 5 次 status-8 失败及 5 次有界重试。JavaScript 的原生 barrier-Newton 与 Python SLSQP 分别记录，不能宣称重现 SLSQP 状态史
- 已接受参考的感知流功率近零、每个分配至少一项独立 holdout 越界、实际总期望功率不相等，以及感知 SINR 与条件 Pd 排序不同，全部保留。新输入可产生不同结果；共同每站上限不等于相同用能，W-symbol 不能在无符号时长时写成 J
- AP/SP 使用同一 y；跨分配只共用潜在抽样。校准与评估分离，点态二项区间与校准次序统计区间分开；不建立精确目标 Pfa、同时覆盖或 CFAR。九文件 JavaScript/实际 Node Worker 与教学分解检查不替代真实浏览器、键盘、下载和绘制时延验收

[来源与数值证据边界](CELLFREE-MAPRT-SOURCE-EVIDENCE.md) 保留固定 PDF/参考/运行冻结、未恢复源参数、历史失败及可选源文件包。原文全文和私有代码不随站点分发，证据压缩包不是启动依赖。35 个主论文 ID、零整篇复现和 current/next CRB 顺序不变。


## 近场多目标协方差：优化接受与接收失败分开（2026-10-13）

固定 [arXiv:2506.07052v1](https://arxiv.org/html/2506.07052v1) 仍使用原身份 `nearfield-multitarget-correlation`。新增 [真实多目标协方差教学入口](../nearfield-multitarget.html#question) 接入 spatial 的六层与机制实验；[原近场曲率先修](../near-field.html#experiment) 保留。35 个主论文 ID 与零整篇复现不变，没有把旧先修改名为本文优化器。

- 已接受的是 intended Eq.17 的实际 PSD 协方差优化和 Eq.18 秩一恢复，含 6×6 与源 10×10 优化参数；新输入重做 proposed/NCCS 两种求解，NCCS 只删除三对相关约束，保留同一通信和功率条件
- 源权重用单位范数通道吸收，g、c、μ 单位 W，约束 c≤εμ；Eq.18 保留所有 PSD 残余、总协方差与用户 SINR。浮点原始/对偶界、失败和求解预算均保留；退化或未收敛不等于原物理 SDP 不可行
- Eq.9 的共轭按 Eq.8/Eq.16 明确修正。literal Eq.12 接收半球朝向产生零回波、Y=N；本构造 rank(R̂X)≤5<N，使 Eq.19 所需普通逆未定义，另有未定义索引。增加快拍或接收噪声不能补发射秩；不暗加伪逆、加载、改分子或替代空间谱
- 由当前 Rₓ 实算的照射切片、等价 Gaussian 协方差抽样、历史自洽核对与朝向目标的接收总能量属于明确教学扩展。它们不构成逐通信流合成、原 Capon 处理或位置估计；共同期望功率上限不等于相同有限块能量，W·symbol 无符号时长不能称 J
- 原 FFBF 降低最低速率并移除同方向目标对约束，不能当等 QoS 第三方案。Fig.5、检测/定位统计、完整论文与真实浏览器 Worker/下载/取消/布局/完整绘制延迟验收仍开放

[最新独立接受绑定](../labs/nearfield-multitarget/runtime/FINAL-BINDING.json) 只更新其明确数值范围；历史 runtime README 与审查阶段原文不重写。[教学层说明](../labs/nearfield-multitarget/lesson/README.md) 和 [教学冻结](../labs/nearfield-multitarget/lesson/LESSON-FREEZE.json) 分开约束页面派生与源算法。PDF/论文全文不随站点分发，预设不查表，运行不依赖数值 fixture。


## 感知辅助 OTFS：声明支持下的条件上行接收（2026-10-13）

固定 [arXiv:2105.03125v2](https://arxiv.org/pdf/2105.03125v2)（2021-05-11）继续使用 `otfs-sensing-assisted-2021`。原 [2021 导读](../reading.html#guide-otfs-sensing-assisted-2021) 接到唯一 [条件上行接收课](../otfs-sensing-assisted.html#intuition)，并接入 waveforms 六层、机制实验和既有导频/互助概念节点。35 个主论文身份与零整篇复现不变。[2020 完美 CSI OTFS 课](../otfs-receiver.html#experiment) 保留独立，不能把两篇声明算子或两种消息传递自动视为等价。

- §II 式(19)、§III-D1 式(39)–(42)和 §III-D2 式(45)–(59) 对应整数双循环格、有效复增益、污染导频估计与四模式 SPA。支持由外部声明，未运行回波、车辆状态预测或真实合并；导频替代一格数据，默认 16×16 为 255 数据位、1 导频、0 保护格
- 原式19的维度/坐标、42的干扰功率、52的目标均值索引、57的外层 Es/重复目标方差和58/59归一化问题逐项保留。literal_operational 只修可执行归一化，不能说是作者代码；moment_repaired 是独立、对角、proper-complex 高斯误差替代模型，忽略跨路径协方差、伪协方差和同帧依赖。固定tiny离线精确后验反例保留约0.499913概率差，收敛不等于正确后验
- 每帧每能量条件的四模式完全同 y；repaired/ignored 仅改变是否计入 v，supplied-CSI 明示额外真支持/增益仍非精确 MAP。错一格支持原样进入实用估计与图，不从真值修正
- source_per_data 的 Es=1、Ep=100、帧能量355；equal_total_frame 的 Es=256/355、Ep=100Es、帧能量256。两者固定同 N0，共用随机原语但 x/y 不同。无保护格接收基线，不主张吞吐优势；源尺寸精确 inclusive 矩形525格=524保护+1导频，表II的480=8KL须另列
- 现场仅1–2独立帧，无性能置信区间。离线120独立帧复用12条件、5760接收记录、每条件30600位、2000次配对帧bootstrap独立标记；保留4228个cap和1532个converged，不把1440条件/帧当独立信道抽样
- 冻结v3七生产核/Worker文件与独立数值接受保持不变；当前教学v2.1经独立Node功能复核接受，60/60回归（原47+新增13）、18项独立边界与9种非法行草稿通过。5份新生产下载含41条独立标量复算输出、21161个数值，最大误差9.72e−15；另3份边界下载核查2条接收输出及1份真实仅原始帧。原v1的47项测试和7份下载/37条输出、约2.38e−14只作历史证据，原v1及中间v2拒绝记录保留。最终概率、真实摘要与局部邻接分开；真实浏览器、全站构建、部署与完整绘制延迟另验

[源式合同](../assets/data/sensing-assisted-otfs/CONTRACT.md)、[逐式对照](../assets/data/sensing-assisted-otfs/EQUATION-CROSSWALK.md) 与 [核独立绑定](../assets/data/sensing-assisted-otfs/SOURCE-BINDING.json) 保留原科学版本。[当前教学v2.1独立复核](../assets/data/sensing-assisted-otfs/lesson-review/PUBLIC-REVIEW.md)、[结构化结论](../assets/data/sensing-assisted-otfs/lesson-review/PUBLIC-REVIEW.json) 和 [复核绑定](../assets/data/sensing-assisted-otfs/lesson-review/PUBLIC-BINDING.json) 接受提交 `14665b68a1333e9d6c7f914143567a676edf0421`，活动 [v2.1冻结](../labs/otfs-sensing-assisted/lesson/LESSON-FREEZE-V2.1.json) SHA-256 为 `f7ab9392d1767cf8a6367b72874312e2624153e167f587b96b4eed3b5f13b8e9`。四项原缺陷与中间版非法行索引已逐项修复复测；原ACCEPTANCE、v1/v2冻结及其待验收/拒绝阶段原文不重写，不能作为当前独立接受结论。固定PDF SHA-256 为 `57e8c349ee32452bd53d42625da4295c6e4014ca1c2e52bb17584fea40ce1f98`；不发布论文全文。图9/11/12、感知预测链、保护格/OFDM基线、实际脉冲/分数参数、下行和整篇复现继续开放。
