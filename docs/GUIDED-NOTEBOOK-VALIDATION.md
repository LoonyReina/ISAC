# 引导式学习者研究草稿：验证记录

核对日期：2026-10-11。实现基线：`611713f79100adf6d12d2a9cc411e9452eea7643`；已部署合并提交：`7b876421b003e843517d5b3301020636991f3e9d`（PR #44）。本记录分开列出本地检查、线上发布核对与云端 Chromium 实测；任何检查都不认证学习者的科研结果或可复现性。

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

## 合并、部署与线上资源核对

- PR #44 已合并；上述合并提交对应的 Pages run `38129409961` 成功。
- 发布核对逐一验证了本次实现改动的 40 个远端文件字节与预期内容一致；本节针对已部署实现，不表示后续文档更新也已发布。
- 发布验收另行确认完整回归 717/717 通过，生成新鲜度、差异空白检查和冻结清单均通过。
- 部署完成前已打开的标签页最初仍显示旧页面；部署成功后，带发布核对查询的页面加载了 `guided-notebook-v1` 脚本。随后从案例点击规范上下文链接，也实际加载了新表单。这是所测页面的更新观察，不是所有缓存或浏览器的通用保证。

## 云端 Chromium 实测（2026-10-11）

- **上下文入口与初始状态：**从两站检测案例点击记录入口，实际进入 `practice.html?topic=distributed-detection#notebook`，所选主题正确。十栏为空，只有第一组默认展开；原生“直接进入四步填写”链接将焦点移到表单，桌面滚动稳定后表单顶部约为 109.7 CSS px。
- **阅读案例覆盖：**线上阅读页 DOM 包含全部 15 个“记录这个问题”上下文链接，包括 CRB。展开 CRB 的原生详情后实际点击记录链接，进入 `practice.html?topic=crb#notebook`，选中 `crb`，参考标题为“随机能量与标量 CRB”；教学入口和机制实验入口均为 `theory.html#crb-mechanism`。这里区分全部链接的 DOM 核对与实际点击的抽样，不声称逐一点击了 15 个入口。
- **学习者输入与切换：**在两栏输入合成 QA 文字，包含 Unicode、表情符号、多行、HTML 和反引号，保持为文字。检查显示 2/10，并列出其余八个空栏；切换到多径主题后两栏内容精确保留，URL 未改变。修改已请求下载后的草稿时，页面明确提醒旧下载不包含新改动。
- **参考链接：**实际 DOM 中链接带 `_blank` 和 `noopener noreferrer`，并标注新标签页。点击两站检测的教学入口，实际另开标签页到 `distributed-detection.html#question`；没有把属性检查写成所有链接均已逐一点击。
- **下载事件：**部分填写的 JSON、编辑后的 Markdown、通用主题的空白 JSON，三次操作均产生浏览器下载事件与输出路径。未读取下载文件字节，不能据此声称文件内容正确、完整送达或已由外部阅读器打开；文本保真与序列化由上文独立 Node 检查另行覆盖。
- **通用降级：**未知、重复、损坏的 `topic` 分别回到通用记录；空白草稿检查为 0/10，并列出空栏。
- **布局与原生键盘：**桌面文档宽度为 1173 CSS px；300% 浏览器缩放时为 391 CSS px，两者均未见水平页面溢出。窄屏文本框约 323.4 CSS px，按钮约 351 CSS px，均在页面内；截图中输入文字可读。原生 Enter 实际展开、收起第二组并展开第三组，焦点位于对应 summary。该窄屏是桌面缩放，并非实体手机或平板。
- **错误抽样：**抽样查看 20 条错误日志，均为浏览器扩展来源；该样本中未观察到网站来源错误，不据此保证整个会话或其他环境没有错误。

## 文档收尾复核

在已合并实现上，仅更新本说明和冻结清单中本说明的 SHA-256 条目，未改代码；本节复核为本地检查。再次运行 `node --test scripts/guided-notebook-independent/*.test.cjs`（23/23）和 `node --test tests/notebook*.test.cjs`（19/19），均通过；`node scripts/generate-site.cjs --check`、`git diff --check` 与更新后的冻结清单核验均通过。

## 尚未由本记录验证

- 真实浏览器禁用 JavaScript、打印、屏幕阅读器及辅助技术播报
- 实体手机、平板、其他浏览器，以及重载、关闭、返回后的草稿行为
- 下载文件字节、实际文件内容、权限提示，以及由外部 Markdown/JSON 阅读器打开或完整送达
- 所有生产入口、缓存状态与全部交互组合的穷尽回归

这些限制仍保留；Node DOM 夹具、静态字符串、下载事件和 Pages 成功不能相互替代，也不能替代尚未执行的检查。
