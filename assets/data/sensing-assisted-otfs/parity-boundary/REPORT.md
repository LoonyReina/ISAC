# 感知辅助 OTFS：一个保留失败状态的浮点一致性反例

日期：2026-10-13。本文是新增的离线证据说明；没有改动历史接受报告、科学运行核、参考实现、记录编码或比较容差。本文及数据为项目原创说明与计算结果，不包含论文全文或论文图片。

## 结论与使用范围

**种子1307130005的独立数值一致性门仍为 FAILED。** 原生浏览器已完成并保存16条接收输出；原始运行与同浏览器重跑的输入、科学载荷编码文本逐字节相同。两次原生的完整性、结构、自洽性、同实现重放检查通过（各检查26个执行边界），但未改动的独立Python核查器两次均以退出码1拒绝。

“运行完成”说明输出已保存；“同实现检查通过”说明能用相同实现复现，二者不能代替独立数值验证，也不能认证记录来源。完整诊断支持：这条未收敛的literal_operational轨迹会条件性放大Float64舍入差异；尚未发现可以据此认定的公式或索引移植错误。该分类不豁免失败，不证明物理后验正确，也不能保证所有种子稳定。

此前各自通过的记录及同文档导航验收保留其原范围。这里一并提供同次导航检查中已通过的种子1307130002作为独立对照。失败并不表示所有达到迭代上限的记录都敏感，也不是“修正后的整篇论文复现”。

页面显示的是预计算证据。输入控件、轮次选择器不会重新运行高精度或ULP敏感性分析。原生记录只保存每轮摘要和最终概率；不能把离线重算的中间边缘概率误称原生浏览器历史。

## 精确控制与来源

- 教学页：[感知辅助 OTFS](../../../../otfs-sensing-assisted.html#numerical-boundary)
- 原始来源部署：[PR #90](https://github.com/LoonyReina/ISAC/pull/90)，合并提交14a6e1851630935e89c58de9ac200acf9b844738，树806bead153aafad6b43d00e52432abf3802283a5；记录采集日2026-10-13。此为输入记录来源，不表示新增说明已上线
- 原始runId：sensing-otfs-mv6jak56-5；重跑runId：sensing-otfs-mv6je779-10，parentRunId指向原始运行。原生自检观察原文：[第一次](native-original-self-check.json)、[重跑](native-rerun-self-check.json)
- 16×16网格；独立随机帧2；source_per_data及equal_total_frame两种能量；moment_repaired、ignored_uncertainty、literal_operational、supplied_perfect_csi四模式；共16接收输出
- seed=1307130005，maxIterations=40，damping=0.5，tolerance=0，dataEnergy=1，pilotPowerRatio=100，pilotPhase=0，pilotIndex=[7,7]
- 物理/预测支持均为[[0,0],[1,2],[14,4]]（16格循环下14等于−2），priorPowers=[0.6,0.3,0.1]，N0=0.07943282347242814（名义11 dB）
- 停止阈值0使运行到上限；不仅如此，frame[2]字面模式第40轮最大消息变化0.4931738437444198、最大边缘变化0.9999985990589068，仍有4个判决改变，尚非固定点附近
- 诊断环境：Python3.12.14、NumPy2.3.5；较早离线算术诊断另用Node24.19.0和mpmath1.3.0。浏览器记录来自实际云端Chrome，不能用Node重跑替代
- 源论文仍固定arXiv:2105.03125v2；本条证据不改变原模型解释与来源身份

输入原文与精确字节身份见[MANIFEST.json](MANIFEST.json)。原始记录SHA-256为da5942c27a0b7420501b73be6e2c1de369860933d405df2a333e790762b10e2e；重跑为34c3334b56543638ce26fb8befb0fef13cb1b410056a5f377da039f60561e4f4；二者科学载荷SHA-256均为e0f53d5963c1d298adadf8a8abbbf91195b1c26898983f2a1e31bbf64a6cb3d6。编码文本、负零和16条输出没有删改。

## 差异到底在哪里

原核查器遇到首个失败即停止：frame[2].literal_operational.probabilities[212]。原生值0.1531922429515374，Python期望0.15319224296154643，差1.000902138947879e−11；原容差是6.063844859230929e−12。它已检查的10条输出及maximumAbsoluteError只是通过前缀，不能当作16条完整验收或全局最大误差。

另做完整基础接收字段普查：28528个数值、24190个逐值相等、4338个不等、11个超原容差。其中frame[2]字面模式10项，frame[3]字面模式1项；其他14条输出的这些字段无超差。3项最终概率（索引212、504、505，涉及2个数据格）和8项历史摘要超差。

最终概率最大差7.468056728576755e−11；已保存历史最大差1.6861487761588023e−9，位于frame[2]第32轮pluginResidualMse。最大误差/容差比约119.697，来自同轮meanEntropyBits。完整11项的双方值、差、原阈值以及16条接收输出摘要见[PRECOMPUTED.json](PRECOMPUTED.json)。

所有16条输出的最终硬判决、状态iteration_cap、40轮计数、BER/FER、误码数及分母均一致，每轮decisionChanges计数也一致。原生文件不含每轮完整边缘概率，因此不声称逐轮所有原生判决标签一致。类别和误码指标相同仍不能把独立数值失败升级为通过。

## 已有诊断与其限制

以下也是已保存的离线诊断，不由本页现场执行：

1. 独立Python重建的原始x/y/noise、真增益及数据符号与原生记录逐字节相同，包括Float64负零。估计增益24个实/虚分量中13个相差1 ULP，最大2.220446049250313e−16；frame[2]只有路径1实部分量不同。精确代入已导出的接收输入后仍有差异，故估计器舍入不是唯一来源
2. 独立直接逐边排除实现检查全部16个接收输入：最终硬判决一致，只有frame[2]字面模式的3个最终概率超原阈值，最大差7.80204234551718e−11。它支持代数相符与算术敏感性的解释，不是精确物理后验的认证
3. frame[2]字面模式的60/80十进制位计算从精确导出的Float64输入出发，均采用同一40步代数和阻尼，舍入回Float64的最终概率及历史相同。原生最终概率与之最大差2.4507784690541712e−11，历史最大差3.3495273221717525e−10。这是数值诊断，不替换已接受参考核
4. 该接收输入6个估计增益实/虚分量各作±1 ULP共12个有限探针：第32轮最大概率变化4.542219889103194e−8，第40轮1.730056098381283e−10；抽查1/20/27/32/40轮硬判决一致。它不是最坏情形界，也不是所有种子的稳定性证明

本最小包重现原始失败、接受对照及全部基础字段差异范围；不重新执行高精度、逐边或扰动分析，也不提供新的在线敏感性算法。保留原容差3e−12+2e−11×|expected|，整数及要求精确的字段仍精确比较。没有放宽阈值、概率吸附、删除literal模式或以种子例外放行。

## 下载与复算

下载本目录[清单](MANIFEST.json)本身及其所列文件（包括[预期拒绝回归](check-boundary.py)）并保持同目录，另外下载两份已有且未改动的公开脚本：

- [独立核查器record-oracle.py](../../../../labs/otfs-sensing-assisted/lesson/tests/record-oracle.py)，SHA-256 c0315b3722073dddfede9ccdaecdae3629e40710983d4d88310313fa257ef321
- [固定reference.py](../../../../scripts/validation/sensing-assisted-otfs/prototype-v3/reference-copy/reference.py)，SHA-256 c83ba035ee49d8011c2b3b8f5f0260b7e95fd2fb562781f03e63a1ea7407ddce

在保存目录运行（Python3.12、NumPy2.3.5）：

```sh
python3 record-oracle.py native-original.json --reference reference.py
# 预期退出1；numericalParity为false。保留失败，不改容差。
python3 record-oracle.py native-rerun.json --reference reference.py
# 同样退出1；输入与科学载荷文本相同。
python3 record-oracle.py accepted-control.json --reference reference.py
# 此独立对照退出0；16条接收记录、36060个数值通过。
python3 check-boundary.py --oracle record-oracle.py --reference reference.py
# 预期退出0仅表示“失败被正确保留”的回归通过；科学门仍FAILED_UNCHANGED。
```

从项目源码根目录也可运行：

```sh
python3 assets/data/sensing-assisted-otfs/parity-boundary/check-boundary.py --oracle labs/otfs-sensing-assisted/lesson/tests/record-oracle.py --reference scripts/validation/sensing-assisted-otfs/prototype-v3/reference-copy/reference.py
```

回归先核验原始字节、未改动核查器/参考核身份，分别启动原核查器，要求原始及重跑的退出码1与已保存JSON输出字节完全匹配，对照保持退出0；再用未改动参考核重建16条输出，并逐个调用原比较器普查全部基础字段。要求恰为上述11项、相同数值及受影响模式，保留原始随机数据位级一致性及硬判决/状态/指标一致。回归不会修补比较器或把发现的超差转成独立接受。

不同算术环境若改变精确输出，本回归将失败并要求诊断，不会自动扩大容差。读取证据哈希只能检查完整性，不能单独证明作者或运行来源；这里也未执行新增浏览器、视觉或线上验证。
