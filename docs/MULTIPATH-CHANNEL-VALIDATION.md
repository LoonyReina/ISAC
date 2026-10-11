# 双路径传播机制：验证范围与复现入口

日期：2026-10-11 UTC。对象：`multipath-channel.html` 及其纯 JavaScript 核心和界面。本文记录本站独立教学模型，不是 Leitinger 原文算法、图像、测量数据或定位性能复现。

## 物理与接收机合同

- 单向主动无线链路，T=(0,2) m、P=(6,h) m、h∈[0.1,6] m、y=0 理想镜面墙；一条直达路和一条一次反射路。每条时延为 L/c，没有单站 2R。镜像点不是另一部电台
- 128 个带符号整数频点 k=−64…63，Δf=2 MHz，参考载波 6 GHz，同一固定 QPSK 导频，有用能量 1；未知共同相位 0.37 rad 只在生成器中
- 真实复数样本 Y 是两条路径的复贡献相加。接收机严格只接收 Y、X、f、固定候选 0…14 m / 0.01 m，不接收几何、路径标签、系数或真实时延
- 固定接收器逐样本计算复匹配和；所有曲线由同一纯核心输出，解释层分量也按同一处理器求和。纵轴统一 0…0.12，不逐场景归一化或自动缩放
- 单个固定网格最大点不是检测、路径数或二维位置。只有明确假设其来自直达路时，才称为表观直达距离。精确零响应返回空估计；若非零幅度在系数、样本或功率计算中实际下溢，则抛出带 BINARY64_RANGE_LIMIT 代码的数值范围错误，界面清空旧图与下载；不能解释为物理路径消失
- 真值分量、几何、给定真实时延的 Gram 诊断均为生成器解释层。无反射参考是另一条同发送预算的信道，不是主接收机额外得到的观测

## 可执行复现

从仓库根目录运行，无 Node 第三方构建依赖：

```sh
node scripts/generate-site.cjs --check
node --test tests/multipath-channel.test.cjs tests/multipath-channel-ui.test.cjs tests/multipath-channel-integration.test.cjs
node --test tests/*.test.cjs
(cd scripts/multipath-channel-reference && python3 -m unittest -v test_reference.py)
git diff --check
```

独立的标准库 Python 参考与九个物理场景夹具位于 [`scripts/multipath-channel-reference/`](../scripts/multipath-channel-reference/PORT.zh-CN.md)。Python 原始冻结版本的 SHA-256 为 `b6f457769d20ee437f7ed0e8011e12b5948e2077df889024d3964649720bbc50`。其自身 29 个测试通过；此前对这份冻结参考进行了 61 项独立数值检查。它们支持参考模型，不能替代对实际 JavaScript 的测试。

当前 JavaScript 核心另有 39 项测试，覆盖：九场景复样本/复响应/功率夹具对拍；几何与法线反射角；真实 RF 频率相位等价；固定 QPSK、分数时延 CP 和两个能量账本；相干交叉项；接收器隔离；零响应与精确并列；严格奇异、近别名、极小分离参数；稀疏 / 继承索引数组（含复数内部两分量）、未知参数键、派生溢出和实际极小信号下溢的拒绝。极小但仍可表示的量不按任意 epsilon 归零。

界面测试使用轻量 DOM 测试替身运行真实 renderer 和导出组件。它们检查数据绑定与 DOM 状态，不是完整浏览器布局、无障碍或网络加载认证。检查范围包括默认逐层展开、实际数据图点、固定轴、h=1 反例、真值/参考开关不改变主观测、零贡献路线、功率下溢措辞、非法输入清空、重置、尺寸变化、脚本缺失、限长预览与完整 JSON 下载。

## 实际 JavaScript 独立审计

便携的 [独立审计报告](MULTIPATH-CHANNEL-INDEPENDENT.md) 与 [`audit-js.py`](../scripts/multipath-channel-independent/audit-js.py) 直接运行本站 JavaScript 核心，比较 14 个场景的完整 128 点复数 Y 和全部 1401 点复响应 / 功率，并核对独立 RF 相位、分数时延波形与 DFT、连续 CP 积分、几何、Gram、输入守卫和接收机隔离。最终检查数、核心哈希及逐项结果见 [机器可读审计记录](../scripts/multipath-channel-independent/audit-js-results.json)。

从仓库根目录可无网络、只用 Python / Node 标准库重跑：

```sh
python3 scripts/multipath-channel-independent/audit-js.py --core multipath-channel-core.js --reference scripts/multipath-channel-reference/reference.py --fixtures scripts/multipath-channel-reference/fixtures.json --output scripts/multipath-channel-independent/audit-js-results.json
```

## 不可省略的数值区分

连续 CP 积分为 0.21922241148558474；复制 32 点的数字 CP 能量为 0.21901243898695386。两者分别计算、分别固定；CP 时长比例不能代替能量。完整持续时间为 0.625 μs，最大绝对时延约 33.3564 ns 小于 125 ns CP。整数频点改变了早期半格提案的实际 RF 频率集合，不能声称双路径相干响应不变。

默认 h=4 m 时真实路长约 6.32456 / 8.48528 m，固定网格最大点为 6.32 m。h=1 m 时真实路长约 6.08276 / 6.70820 m，最大点为 5.77 m；这是带限匹配曲线的相干干涉，不是更短路径提前到达。

Gram 条件数只描述在指定两个时延处分离未知复幅度的条件性，不是 CRB、PEB、RMSE、分辨概率或检测性能。精确别名与浮点范围限制分别保留状态；不能因为显示的相关系数舍入为 1 就宣称严格奇异。

## 来源与上线验收边界

固定来源为 [arXiv:1409.1467v2 官方 HTML](https://arxiv.org/html/1409.1467v2)，上传日期 2018-12-10；期刊为 IEEE JSAC 2015。来源清单与取回 HTML 字节的哈希见 [`data/multipath-channel-sources.json`](../data/multipath-channel-sources.json)。没有将 HTML 哈希标成 PDF，也不分发论文全文、论文图或私人研究笔记。

本次本地测试不替代部署后的真实浏览器验收。桌面、平板、323 CSS px 窄屏、图形可读性、键盘展开/收起、焦点、下载、哈希入口、脚本网络加载、发布提交与 Pages 部署都需要分别核对。没有以本地 DOM 替身或 CI 成功宣称这些阶段通过。

## 2026-10-11 本地冻结结果

- 实际 JS 核心 SHA-256：`414f00f2bcad736281881edd643308fa622887ccf4227aa2e227fe24119816a8`
- 完整仓库回归：621 / 621 通过；其中本主题科学核心 39、UI 数据 / DOM 14、注册 / 来源 / 冻结审计身份 10
- 独立实际 JS 审计：109 / 109 通过，14 个完整场景；便携命令已在仓库内实际重跑
- 标准库 Python 参考：29 / 29 通过；冻结参考身份未变
- 静态生成新鲜度、两个新 JS 语法检查、`git diff --check`：通过
- 注册规模为 25 个机制单元、14 个案例、32 个地图概念；九张影响证据卡、八张已接入卡的原始文件字节保持不变
- 真实浏览器、键盘 / 响应式 / 下载与部署验收：本记录未执行，不计入上述通过数量

## 2026-10-11 发布后的实际浏览器验收

上述冻结阶段没有执行浏览器验收；随后完成以下独立检查：

- [PR #38](https://github.com/LoonyReina/ISAC/pull/38) 合并为 `3ffb31b174fc34ddb63b901a2eef5aaf8cc6f665`；对应 Pages 运行 `38123692821` 成功。发布文件与冻结本地字节逐项相同
- 云端 Chromium 在桌面 1165 CSS px 与窄屏 323 CSS px（150% 缩放）实际操作默认、h=1 重叠、h=0.1、反射相位、仅直达、仅反射、零响应、非法高度、数值下溢报错和恢复默认值；生成器真值与无反射参考均实际切换
- 实际查看几何、I/Q 与固定纵轴匹配图，核对 CP 两种能量、进阶展开、限长有效 JSON 预览（9294 字符）、键盘滚动、关闭清空和完整记录下载事件。没有读取下载文件字节，因此不将下载事件说成线上逐字节内容验证
- 窄屏发现几何图 `x / m` 与末刻度 `10` 重叠。[PR #39](https://github.com/LoonyReina/ISAC/pull/39) 将单位移到图顶，保持物理比例、刻度位置与数值核心不变；新增回归后完整测试为 622 / 622。回归覆盖 220–1000 每个整数宽度，旧位置的变异测试会失败；这些宽度扫描属于模型化布局检查，不是逐宽度真实浏览器截图
- PR #39 合并为 `327c574c3105b490d7ddf6257c307808446feebc`，对应 Pages 运行 `38124419045` 成功；三份远端改动文件与本地冻结字节相同。随后实际浏览器加载 `v2-axis-label`，重新目视及 DOM 测量检查 323 CSS px 下完整几何图，单位与末刻度不再相交；1173 CSS px、100% 缩放桌面复查也通过。两种最终宽度均无页面横向溢出
- 知识导图搜索“两条路径”得到直接课程入口，实际点击进入 `#question`；传播方向的介绍、模型、实验、原文、边界与推导链接指向对应课程章节
- 抽样错误日志仅见浏览器扩展自身的元数据错误；不代表全站穷尽式错误审计。旧标签页的操作工具超时通过同一云浏览器的新标签页恢复，未将其归因于网站

以上是指定云浏览器与宽度的验收，不是物理手机、所有浏览器或所有视口的认证。独立教学模型、单向主动链路和来源适用边界保持不变。
