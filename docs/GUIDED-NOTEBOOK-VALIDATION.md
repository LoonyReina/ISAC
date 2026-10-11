# 引导式学习者研究草稿：验证记录

核对日期：2026-10-11。基线提交：`611713f79100adf6d12d2a9cc411e9452eea7643`。本记录描述本地实现与实际运行的检查，不代表线上部署、真实浏览器下载、科研结果或可复现性认证。

## 范围

- 在 `practice.html#notebook` 保留原九行 `PRE` 模板，字节不变；所有原有实践正文和未执行的导频计划仍在。
- 新增四个原生 `details`，只默认展开第一组；十个学习者文本栏初始为空。主题、当前日期、模型输出及示例计划都不填入学习者条目。
- 可选参考主题来自 `site/registry.json` 的全部 26 个单元。参考问题、动作、教学入口、机制实验入口和适用的案例证据/边界链接与学习者文本分开。
- `scripts/notebook-topics.cjs` 复用既有 teaching-entry resolver，不放松其查询参数拒绝和本地页面/锚点校验。
- 14 个独立案例页的第四步和指向记录本的下一步带 `topic`；15 个阅读案例都增加记录链接，包含位于 theory 的 CRB。registry 中的 canonical next、theory 的下一步、通用实践和多主题学习地图链接均未修改。
- 仅实践页加载版本化 `notebook.js` / `notebook.css`。原始模板在无 JavaScript 时可读可复制；增强表单和快速跳转在成功初始化之前保持隐藏。

## 草稿与导出契约

- 不使用存储、上传、网络请求、剪贴板、导入、账户或自动证据收集。刷新、关闭、离开可能丢失草稿，页面在填写前后重复提示先下载。
- 每栏上限 12,000 个 UTF-16 code units；不解析数字，不修剪或截短文本。原生输入限长，超限程序值导出明确失败且保留草稿。
- 仅接受一个 `topic` 参数：严格解码、最多 64 个字符、单元 ID 语法且命中生成的 allowlist。整个 search 上限 4,096 code units；缺失、重复、未知、损坏或超限都回到通用记录，不回显输入。
- 查询只设置首次参考选择，不改变 URL 或 history；切换参考主题不会写入任何学习者字段，并明确提示草稿未变。
- 填写检查只数非空白栏，并指出可保留的空栏。即使 10/10 也不声称内容正确、实验完成或可复现。
- JSON 的 `kind` 为 `learner-authored-notebook`，`schemaVersion` 为 1。`exportedAt` 明确为文件导出时间。`referenceTopic`、`learnerEntries` 和 `fieldPresenceCheck` 分开；通用记录的 `referenceTopic` 为 null。
- 固定 `referenceSiteBase` 为 `https://loonyreina.github.io/ISAC/`；Markdown 参考链接使用该固定站点加注册表路径，绝不取当前完整地址、query 或 referrer。
- 学习者 Markdown 内容全部置于动态长反引号围栏内，HTML、反引号和换行保持为文字；JSON 保留所有输入字符串。参考链接单独标注。
- 每次点击读取最新字段和所选参考，创建新的 Blob。固定文件名为 `isac-learner-notebook.md` / `.json`；对应 MIME 为 `text/markdown;charset=utf-8` / `application/json;charset=utf-8`。
- 只报告“已请求浏览器下载”，不声称文件已落盘。Blob、object URL、挂载链接或 click 失败均不清除草稿，可重试。URL 在请求后的计时清理或 pagehide 时只释放一次。
- 参考链接原生打开新标签页并注明用途，使用 `noopener noreferrer`；无自动弹窗或自定义跳转。
- 学习者笔记不包含也不能代替实验页的计算 JSON；完整模型证据需另行下载，笔记只记录其位置。导频计划保持未执行示例身份。

## 实际运行的检查

1. 修改前 `node scripts/generate-site.cjs --check`：通过；原基线全套 698/698 测试通过。
2. `node scripts/generate-site.cjs` 后 `node scripts/generate-site.cjs --check`：通过，静态产物与源一致。
3. `node --check notebook.js`、`node --check scripts/notebook-topics.cjs`：通过。
4. 新增 `tests/notebook.test.cjs` 和 `tests/notebook-topics.test.cjs` 共 19 项：通过。
5. 最终 `node --test tests/*.test.cjs`：717/717 通过，无失败、跳过或取消。
6. `git diff --check`：通过。
7. 独立源代码/Node 检查 23/23 通过，七个来源文件指纹与最终实现一致。可复跑命令为 `node --test scripts/guided-notebook-independent/*.test.cjs`；[独立报告与限制](../scripts/guided-notebook-independent/REPORT.md)。检查额外覆盖 JSON 特殊 Unicode、围栏突破尝试、超长查询、当前地址隔离、各下载失败与重试、URL 生命周期和生成元数据的 HTML/script 转义；未发现阻断问题。此项不代表浏览器检查。

覆盖包含：26 个主题/所有案例入口、严格 canonical 链接、通用/理论路由保留、九行模板原样、四组十空栏、原生标签与按键类型、增强区成功初始化后显示、空白与部分导出、切换主题保留所有文本、只计字段存在、修改后重复导出快照更新、固定安全文件名、Unicode/HTML/围栏文字、超限失败保留文本、Blob/URL/append/click 失败及恢复、timer/pagehide 幂等清理、无存储/网络/剪贴板行为。

八处既有集成测试仅更新了“实践记录入口”的预期 URL。注册表中 canonical next 的断言保留；数值和实验断言没有削弱。

## 保留范围核对

与基线逐字节比较：

- 54 个受保护文件未改，包括所有 `*-core.js`、`experiment-record.js`、注册表、teaching-entry resolver、研究数据、其他实践外正文源、既有 OFDM 和共享移动端样式/脚本。
- 14 个独立案例 HTML 在剔除允许生成的 `SITE:HEADER/CONTEXT/NEXT` 区域之后，科学正文逐字节相同。
- 实践正文源移除新追加的增强区和快速跳转后，所有原始文字逐字节相同；原九行模板独立断言。
- reading HTML 移除 15 个新记录链接后，与基线逐字节相同。
- 仍为 26 单元、15 案例、32 概念、8 方向；9 张影响卡中 8 张已接入。未改 citation 数据，未新增科研结果。

冻结文件的 SHA-256 清单见 `GUIDED-NOTEBOOK-SHA256.txt`。修改清单中任一文件后应重新生成并重跑相关检查。

## 尚未由本记录验证

- 实际桌面/窄屏浏览器布局、真实键盘焦点与辅助技术播报
- 浏览器实际无 JavaScript 模式、重载/关闭/返回后的行为
- 浏览器下载权限提示、文件实际落盘和由外部 Markdown/JSON 阅读器打开
- 线上 HTTP 资源、缓存、Pages 构建、部署和生产地址回归

这些步骤必须单独实测记录；Node DOM 夹具、静态字符串和本地生成器通过不能代替它们。本次实现没有提交、推送、创建 PR 或发布。
