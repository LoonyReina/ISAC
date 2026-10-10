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
