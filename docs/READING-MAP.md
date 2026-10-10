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
