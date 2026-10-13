# 感知辅助 OTFS：有界条件上行接收课

唯一论文身份 `otfs-sensing-assisted-2021`，唯一教学页 `otfs-sensing-assisted.html`。原2021导读及2020 OTFS接收课由站点接入负责人保留；本目录不注册第二篇论文。

## 实际执行范围

外部声明预测支持 → 新生成BPSK数据/复导频/有效复增益/噪声/原始y → 同帧导频增益估计 → 同y四种SPA → 最终概率、错误位置、真实迭代汇总与循环局部图 → 完整记录下载/不可信历史导入/分层自洽核对/新运行。

这是固定 arXiv:2105.03125v2 的声明解释，不是回波、车辆预测器、原尺寸图9/11/12、保护格基线或整篇复现。moment_repaired 是独立对角proper-complex高斯误差替代模型；literal_operational保留式42/52/57问题并仅修归一化；supplied_perfect_csi额外读取真支持/真增益，也不是精确MAP。

生产核位于 `../runtime/`；七个计算/Worker文件与已独立接受v3逐字节相同。完整原型（包括九文件runtime manifest所指开发harness）作为原封科学验证包保存在 `scripts/validation/sensing-assisted-otfs/prototype-v3/`，不是新的课程入口。

- v3 artifact manifest SHA-256: `352370b7ba1046e748b6d4e0ec6cde296ccf37d060da56a2ca079249ef491de6`
- v3 runtime manifest SHA-256: `5a51d315a6f33b352149cc388bcb72edda1a22876cacd89a375b5b1337127a7e`
- Python reference SHA-256: `c83ba035ee49d8011c2b3b8f5f0260b7e95fd2fb562781f03e63a1ea7407ddce`

原型 `paperotfs-sensing-assisted-2021` 原始provenance保留在完整记录；外层明确canonicalPaperId，未改写原始runtime编码。

## 记录与所有权

每次提交先验证，再捕获归一化输入、runId与所有权。无效新输入不取消有效旧作业；新版Worker接受后才替换前作业。取消、重启、页面离开保留已完成raw frame/receiver。旧回调只能补自己的历史，不能替换当前所选记录。表单编辑是未提交草稿，正在运行的仍使用提交快照。

完整记录嵌入未经改写的v3 typed finite JSON文本、SHA-256与UTF-8字节数，保留负零、全概率/掩码/判决/历史和失败分母。下载绑定所选快照而非Worker“最后结果”。界面只说已请求浏览器下载，不声称已存入用户磁盘。

导入预检≤8 MiB，拒绝重复/危险key、深度/节点超界、非有限/损失型typed转换、未知字段和不自洽掩码等。导入不会执行检测器；历史始终标不可信来源。显式“核对”重放全结果/真实partial前缀，只证明同实现自洽，来源真实性与独立Python/浏览器仍分层。按同输入“新运行”才新启Worker并生成新runId。会话预算32份/约32MiB，预留下一份8MiB，满额停止新增而不删旧历史；刷新不持久化。

最终概率格不冒充逐轮概率/边消息；实际核只输出每轮摘要。已知导频不画成未知 .5/.5；0/n不写成零误码系统；cap与数值失败保留。1–2帧只有配对计数，无性能CI。固定tiny精确后验来自离线独立枚举，页面只重新执行同一固定y的近似接收；KL计算对离线浮点概率的[0,1]裁剪只作用于KL，表格和完整源证据保留原值。

## 执行过的本地验证

- 47个教学层Node测试：10 adapter、5 contract、11 mounted、11 record、10 session；无skip
- 七个真实Node module Worker → 生产mount → 实际下载按钮 → Blob文本 → 独立Python检查：default、非fixture矩形/复导频、tiny固定y、错一格、2独立帧×2能量、cap1、零增益
- 共37条完整receiver记录，独立重建随机原语、raw x/y/noise、增益/方差/能量/分母及全概率/状态/历史；最大误差约2.38e−14，类别完全一致
- 默认/错支持严格同y，supplied-CSI全输出不变；两能量原语/N0相同、y不同，355对256
- 完整v3在另一个副本重跑：20 kernel/codec、113全输出fixtures、fresh nonfixture独立scalar/Python、10 actual-thread生命周期、6延迟完成证据、3负零Worker、8数值条件回归及实际Worker导出Python重建，全部通过
- 原封验证包manifest 56散列和runtime manifest 9散列均通过；生产7文件也逐一核验

命令：`node --test labs/otfs-sensing-assisted/lesson/tests/*.test.mjs`。
生产导出：`node labs/otfs-sensing-assisted/lesson/tests/export-records.mjs OUTPUT_DIRECTORY`。
独立复算：`python3 labs/otfs-sensing-assisted/lesson/tests/record-oracle.py FILE.json`，独立下载脚本需同时下载固定reference并传 `--reference reference.py`。
全v3回归先复制整个冻结包，再执行副本 `sh run_all.sh`，不原地改写冻结报告。

以上是实际Node Worker和轻量DOM事件测试，**不是浏览器引擎、视觉布局、真实辅助技术或线上验证**。功能冻结后由独立负责人进行页面审查、全站注册/依赖/构建与真实浏览器门；页面宽屏/窄屏表现和冷暖启动分位延迟目前not-measured。不要用上述Node时间冒充浏览器性能。

## 接入责任边界

此交付仅新增文件，不改任何既有源/测试/历史散列。`PUBLIC-ASSETS.json`逐个列明建议源码→公开路径。站点接入需修改原2021 guide、单一registry unit/case/source、阅读方向六层、backlog、显式compatibility/module清单；保留2020课及其它课程，执行权威隔离构建 `node scripts/build-compatibility.cjs --test --reproducible` 与 `--check`。这些接入门本交付未冒称完成。
