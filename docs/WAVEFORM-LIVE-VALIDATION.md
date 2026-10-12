# 严格协方差波形：新输入求解与教学接入

日期：2026-10-12。覆盖固定 [arXiv:1711.05220v1](https://arxiv.org/pdf/1711.05220v1)，§II 式(1)–(7)、§III 式(8)–(15)。仅为严格协方差分支，不是整篇论文或完整图3–4复现。

## 算法与输入

输入 H∈ℂ^(K×N)、S∈ℂ^(K×L)、Hermitian 正定 R，L≥N。真正求解 min‖HX−S‖²_F，约束 XXᴴ/L=R。

以 R=FFᴴ、X=√L FQ 代换后，QQᴴ=I；C=FᴴHᴴS。全局最优值为 L tr(HRHᴴ)+‖S‖²_F−2√L‖C‖_*。JavaScript 对 Cᴴ 作单边复数 Jacobi SVD，保留完整右酉因子，并明确补齐左零空间，得到 Q 与 X。没有查表、预存最优数组或外部数值运行库。

固定审核核心 SHA-256：a844089a501bec61002fe8562f54314c04bc4f27b622033c3995052770b050c6。

固定原文 PDF SHA-256：e79052feb8fd898002a71c9b1f20fd75cb757159b6e92071e97812e85b62d798。源 PDF 不随站点分发。

核心支持 N≤32、K≤32、N≤L≤128，R 的数值条件数小于10¹²；教学界面进一步限定 N≤16、K≤8、N≤L≤64。所有返回量必须有限。极小尺度使缩放倒数溢出、要求块能量无法表示或分解/证书失败时明确拒绝；不把这些数值范围限制解释为原数学问题无解，不自动对角加载。

“数值秩”始终附显示阈值。数值上很小不等于数学上严格为零；不能只凭该数宣称非唯一。原文 N=16、K=4 时的 rank(C)≤4 则是严格结构事实，至少12个方向必须补齐才能保住满秩 R。不同正确实现的秩亏最优 X 可以不同，验收比较实际目标值、协方差与能量。

## 独立数值证据

- 19个确定性 Python 夹具、328个追加新输入均由 JavaScript 从 H/S/R 重新求解；独立 Python 重算候选矩阵的目标与约束
- 追加独立审核450项：240组数值解比较、3项预期数值范围拒绝、168组协方差条件数分类、39项 API 检查
- 独立审核最大协方差相对残差9.825×10⁻¹⁵；相对证书尺度的最大目标差7.450×10⁻¹³；最大18次 Jacobi 扫描
- 源码实现方另运行259组与旧 Cholesky/SVD 解的比较、2331个同协方差竞争波形、16次独立 SLSQP 初始化，并重新求解全部27组历史输入
- 初次审核发现巨大 R 与 H=S=0 可使能量溢出但仍报告成功，已加入块能量前置检查、全返回值有限性检查与准确回归；修正后重新验证
- 独立 Python 基准本身在极端 IEEE-754 尺度也有范数范围限制；审核用另一套缩放后的 SciPy/eigh/gesvd 与 Hermitian dilation 检查。未将超出基准范围的结果伪称为基准通过

数值核心通过不等于界面、浏览器或线上通过。Node 中最大679.5 ms 属于特定云端运行环境的求解测量，不能当成浏览器端到端时延。

## 同预算参考与诊断

DFT 参考与严格解共享实际 H、S、R、N、K、L 与 LPₜ。参考先取得忽略 H/S 的协方差可行因子，再右乘 L 点酉 DFT；实际参考协方差和能量会重新检查。它是教学基线，不是原文全部基线或最佳通信基线。

对包装层的独立检查还发现：严格解的目标可有限，而极端尺度下参考误差可溢出。现在参考/绘图指标使用缩放范数，并对完整数据包及速率诊断再次检查有限性；无法表示时显示失败，不能把 Infinity/NaN 序列化成 null 后仍宣称成功。

每用户速率诊断使用 pₖ=mean|Sₖ|²、eₖ=mean|(HX−S)ₖ|² 与 log₂(1+pₖ/(eₖ+N₀))。分母先按比例缩放，再以稳定对数形式计算；避免 eₖ+N₀ 溢出却得到错误有限值。SNR只改变诊断，不重新优化 X。此高斯对数表达式不等于 QPSK 真实互信息、BER 或实测吞吐。

[完整离线反例矩阵](../scripts/validation/waveform-design/waveform-rate-counterexample.json)展示：同一可行问题的 MUI 从4.25769705增加到4.25773578，而诊断和速率从2.77599882增加到2.77697681。因此总 MUI 最小并不一般等价于非线性和速率最大。该反例属于独立诊断证据，不是当前网页输入的输出。

## 原文实验覆盖

已运行256组披露种子与预算的 N=16、K=4、L=20、Pₜ=1、iid CN(0,1) H、单位功率 QPSK 的全向配对实验。它是原文参数切片，不是完整图3–4。页面“原文全向参数”按钮也只生成一个新问题。

原文方向性 R 的三目标设计细节、ZF 归一化/接收约定、原始平均设置，以及加权权衡、常模分支限界和剩余原图实验仍未完成。改变空间协方差不能自动证明延迟–多普勒、脉冲压缩、检测或估计性能。

## 教学状态与检查

新主实验使用独立 Worker；输入变更立即清空旧图、证书和导出资格。每次请求有代号，取消会终止 Worker；迟到回复不能恢复旧结果。H/S/R 导入忽略任何旧 X。输入、实际 X/HX/协方差、奇异值、阈值和误差账本可逐项查看；导出保留实际输入、算法身份、输入散列与本次耗时。

界面“Worker响应耗时”从输入已完成生成/解析、边界检查和规范化之后开始，至主线程收到并核对 Worker 结果结束，包含 Worker 启动、计算和消息传递；不含输入准备、结果渲染/绘制或下载。导出保留兼容字段 endToEndMs，并用 endToEndScope 明写上述范围；该字段不是点击 Run 到画面完成的时延。

原有27个状态、数据文件、旧数值核心与历史验证记录保持原样，放在明确标注的“离线历史”面板；不会把其年份改为此次重新验证日期。

当前完成的聚焦测试为29项，运行真实模型/Worker脚本及可控制回复顺序的 DOM/Worker 测试环境。覆盖手工 H/S/R、重复运行、编辑后迟到结果、取消/重置、非法 JSON、Worker失败、导出守卫、逐用户诊断、全部矩阵视图与有限绘图坐标。它们不是渲染浏览器、键盘或辅助技术认证。

独立教学/包装层审核16项通过，包括20组独立构造的 Cholesky×DFT 参考、新 H/S/R、真实 Worker 脚本及受控 UI 消息竞态、超大/极小尺度与教学边界。两项发现均先复现后修正并复测：参考误差非有限但误报成功，以及速率分母溢出后错误地得到有限零值。[独立审核报告](../scripts/validation/waveform-design/INDEPENDENT_LIVE_REVIEW.md)与[可执行审核程序](../scripts/validation/waveform-design/independent-live-review.cjs)保留。另有19组夹具与32组新生成输入重新执行独立 Python 的[本次核对结果](../scripts/validation/waveform-design/teaching-python-crosscheck.json)。

真实浏览器交互、端到端时延、响应式布局和最终部署后的资源/输入验收须另行记录；本文件尚不声明这些通过。集成门禁也须在发布映射接入后单独运行。

## 可复算文件

- [独立 Python 参考](../scripts/validation/waveform-design/independent_procrustes_reference.py)，NumPy/SciPy，源码与已审独立参考一致
- [19组确定性夹具](../scripts/validation/waveform-design/waveform-live-fixtures.json)，测试数据不进入主实验计算路径
- [重新执行 Python 与 JavaScript 的核对程序](../scripts/validation/waveform-design/validate-waveform-live.cjs)
- [数值核验摘要](../scripts/validation/waveform-design/waveform-live-validation.json)

从仓库权威源码运行 node scripts/build-compatibility.cjs --test --reproducible，再运行 node dist/scripts/validation/waveform-design/validate-waveform-live.cjs。不要将旧布局测试直接在迁移后的源码根目录运行，也不要手改 dist。

独立教学审核可在构建后运行 node dist/scripts/validation/waveform-design/independent-live-review.cjs dist /tmp/waveform-live-review；输出目录单独指定，避免覆盖已存历史报告。
