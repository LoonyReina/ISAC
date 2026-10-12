# 学习框架与兼容迁移

## 设计目的

网站只有一条四阶段路线：基础讲义 → 机制实验 → 论文阅读 → 研究实践。首页负责定位；机制目录负责找实验；阅读方向负责扩展知识；案例页面负责同题的讲解、互动与证据。不要在每个页面重复展示全部案例入口。

### 主要页面所有权

| 页面 | 负责什么 | 不负责什么 |
|---|---|---|
| index | 学习地图与阶段选择 | 整本讲义、全部论文卡片 |
| foundations | 原 00–13 章物理与处理链，全部原课程控件 | 第二套研究方向目录 |
| theory | 共同观测模型、CRB、实际 LS 估计与速率桥梁 | 重复列出所有主题 |
| experiments | 注册可用机制与按需补充沙盒 | 复制实验代码 |
| reading | 方向、层次、已有案例导读、研究进展、来源 | 把计划写成已完成复现 |
| practice | 六步工作流、最小设计、实验本、四周节奏 | 保存/上传用户输入 |
| 四个专题页面 | 导频、时钟、资源、近场的同题闭环 | 新的一级入口 |
| sandbox / resolution | 原版中独有的补充对照 | 另一套并行课程首页 |

CRB 是五个既有研究案例之一，留在 theory 中。随机能量 CRB → 实际 LS 估计器 → 速率桥梁依次展开，新增估计器机制不增加研究案例或一级入口。三者保持各自控件与证据边界：实际误差实验不替换速率平面的解析 CRB 工作点。

## 内容注册表

`content/data/registry.json` 是共享框架的唯一来源；其兼容/公开路径仍为 `site/registry.json`：

- `stages`：稳定的四阶段顺序、标签、入口与学习产出
- `pages`：页面角色、所属阶段、先修、同题内容与一个推荐下一步
- `units`：可访问的机制实验、问题、先修和主研究方向
- `cases`：已核对的主题、问题/证据/边界、机制、原文位置与下一问；每个既有主题的 `paperComparison` 保存部分核对记录，原文定位和资源预算保留 summary，并为后续逐字段整理留位
- `directions`：可横向扩展的研究领域；每方向六层资源有明确 `available` / `proposed` 状态
- `scenePositions`：阅读页场景引导的链路位置标签与现象提示；方向的可选 `scenePositions` 数组引用这些 ID，可跨多个位置，不是互斥科学分类。无标记的新方向仍完整生成并保留六层入口
- `levelDefinitions` / `statusSemantics`：六层意义与可用状态的边界
- `paperComparisonSchema`：原文对照需要填写的证据契约
- `legacy`：旧文件与旧锚点的明确目标；不能把所有旧链接粗略送回首页

每个方向只有一张简洁问题卡。六层材料默认收起，已有与尚缺项一起说明；没有实际资源时不生成实验按钮。原文链接仅是入口，完整对照需要版本、章节/图/式、观测/未知量、保留/省略条件、论文/本站证据类别、指标与资源预算。未知字段留空并标注待核对。前置实验不等于该方向专项实现，研究计划不等于已验证复现。

## 源码归属与公开路径

源码目录用于维护，`dist/` 才是静态站点根目录。页面和脚本在源码中搬迁，不改变线上 27 个 HTML 页面、已有资源、锚点、query/hash 行为或证据下载 URL。`build/compatibility-manifest.json` 是明确的逐文件映射，不按目录通配符发布：`source` 是当前输入，`compatibility` 是原生成器/测试使用的暂存路径，`public` 是公开路径（null 表示不发布），`owner` 表示归属。本次迁移落实了前一阶段清单中 `plannedSource` 的目录规划；当前版本 2 清单由 `source` 指示实际源码位置，不再包含 `plannedSource` 字段。迁移冻结信息只用于独立审计，不限制之后正常内容编辑。

| 职责 | 当前源码 | 保留的暂存/公开路径示例 |
|---|---|---|
| 手写科学页面 | `content/pages/` | `foundations.html`、`theory.html`、各专题 HTML |
| 手写门户片段 | `content/fragments/` | `site/content-*.html` |
| 注册表与阅读数据 | `content/data/` | `site/registry.json`、`site/research-guides.json`、`site/research-directory.json` |
| 课程与站点共享样式 | `shared/styles/` | `course.css`、`site.css` |
| 通用实验记录 | `shared/records/` | `experiment-record.js` |
| 基础讲义、地图、阅读、筛选、草稿功能 | `features/` 下各功能目录 | `course*.js`、`intuition*`、`velocity*`、`knowledge-map*`、`research-*`、`catalog.js`、`notebook*` 等原路径 |
| 专题模型、界面与局部样式 | `labs/` 下各领域目录 | 各核心/控制器/样式的原根目录路径 |
| 科学证据数据 | `assets/data/` | `data/` |
| 站点生成器与解析器 | `scripts/site/` | `scripts/generate-site.cjs`、`scripts/knowledge-map.cjs`、`scripts/learning-entry.cjs` 等 |
| 独立参考、审计和验证包 | `scripts/validation/` 下各领域目录 | 原 `scripts/` 文件与包路径 |
| 数值、结构、界面回归 | `tests/` | `tests/` |
| 科学文档与历史验证记录 | `docs/` | `docs/` |

多径与反射孔径共同归属 `labs/channel-geometry/`；离格测距与参考不确定性共同归属 `labs/ofdm-reference/`。独立验证材料也按领域归属。不要把所有 JavaScript 合并到大目录，或为搬迁改动模型、DOM ID、接口及相对发布链接。

迁移基线共有 368 个暂存文件，其中 367 个公开文件包含既有 `scripts/`、`tests/`、`site/`、`docs/` 和 `data/` 地址。未被页面链接的既有证据也不能悄悄丢失。兼容用的旧 `.gitignore` 不发布，工作区 `.gitignore` 继续排除 `dist/`。新增构建工具不会自动出现在发布产物中；后续增减公开文件须显式审核清单。

## 静态生成与手写边界

唯一日常入口是 `node scripts/build-compatibility.cjs --test --reproducible`。它将当前权威源码按清单放入临时旧布局，在那里运行 `scripts/site/` 中生成器的兼容副本、生成新鲜度检查、波形数值检查和原回归，再输出保留旧 URL 的 `dist/`。生成期间不访问网络、不加入时间戳、不回写源码。不要直接在源码根目录运行搬迁后的旧生成器或旧测试。

- index、experiments、reading、practice、resolution 与 learn、overview、research 三张兼容页整体生成，共八张页面
- 研究脉络、前沿、书目、实践和补充响应正文维护在 `content/fragments/content-*.html`
- `content/pages/` 下的 foundations、theory、各专题、sandbox 保留手写科学正文；生成器只覆盖 `SITE:HEADER`、`SITE:CONTEXT`、`SITE:NEXT` 三个成对区域
- 各模型核心与 UI 脚本不参加框架生成，不挪动其控件 ID、加载顺序或全局协作接口
- `legacy-routes.js` 由注册表的 `legacy` 生成，发布 URL 保持原根路径
- `dist/` 是产物，不是编辑入口；提交权威源码和显式映射，不手改或提交 `dist/`

### 临时生成种子

八张整体生成页面与 `legacy-routes.js` 临时保存在 `build/compatibility-seeds/`。当前生成器在重建目标页面之前先校验部分链接与锚点，需要这些启动文件。它们不是第二套正文来源；不能手工修改，也不能从此前的 `dist/` 回填。需要改变生成页面时编辑注册表、片段或生成器，遵循构建说明检查生成结果。若先校验的目标因变化而不再满足条件，不得靠手改种子绕过校验。

种子退出需要单独审核的“先渲染、再校验链接”生成器重构，或等价的权威源码/注册表目标解析。纯目录搬迁不同时实施该生成语义变化。

`features/foundations/course-ui.js` 同时初始化 OFDM、CFAR、阵列、几何、打印和进度。其余两个扩展依赖统一输入/播放循环与 `window.ISACCourseReady` / `window.ISACCourseUI`。因此保留原 00–13 章完整 DOM；没有绑定控件的原 14、15、17 章移到 reading，原 16 章内容融入 practice。理论页 research-method 内包含真实 CRB 与速率实验，不能连同七问文字整体删除。

## 旧 URL 映射

| 原入口 | 新内容 |
|---|---|
| index.html（无 hash） | 学习地图 |
| index.html#start 至 #geometry、相关控件 | foundations.html 对应 ID |
| index.html#branches / #frontiers / #reading / #ref-* | reading.html 对应 ID |
| index.html#practice / #roadmap | practice.html 对应 ID |
| index.html#velocity-matching | foundations 的运行时速度匹配模块 |
| research.html#case-* | reading.html#case-* |
| learn.html#各实验与控件 | sandbox.html 对应 ID |
| learn.html（无 hash） | experiments.html#supplements |
| overview.html#lab 及其控件 | resolution.html 对应 ID |
| overview.html#roadmap / #faq | practice 中已融合的节奏/自测 |
| overview.html#ref1…7 | reading 的七篇原文条目 |
| overview 其他章节 | 对应基础、共同模型、研究工作流 |

映射包含原静态 ID，而不只主章节。旧页面保留无 JS 的逐项对应链接。已知 hash 首次载入与同文档 hashchange 都用 location.replace，保留部署子目录与查询字符串；未知 hash 不执行任意跳转。没有目标 URL 查询参数，也没有 SPA 历史拦截。速度模块在运行时建立 ID；无 JS 时有同名 noscript 文本回到静态 OFDM 推导，七个静态面板全部可读。

旧 overview 的理想响应实验没有新加数值模型：沿用原 B/T 计算，仅改进边界说明。独立两条 sinc² 响应不是相干叠加双目标功率，不能直接宣称检测成功率。

## 新增一个主题的步骤

1. 先选既有方向；只有新的观测对象/研究问题确实跨出现有范围时才增加方向
2. 写一个初学者能预测的现象，声明输入、已知/未知、单位、几何与资源
3. 在相应 `labs/` 或 `features/` 归属中建立纯模型与数值测试，再把真实输出接到可访问的原生控件/图表/数字替代；手写页面放在 `content/pages/`
4. 在 `units` 注册机制；在 `pages` 指定阶段、先修、同题实验/原文/边界与下一步
5. 在 `cases` 填经核对的来源与对照字段；不确定部分明确留待核对
6. 在方向的相应层引用同一资源，不复制实现，不把通用计划标成已复现
7. 在兼容清单中显式登记新增源码、暂存和公开路径；运行构建器测试及 `node scripts/build-compatibility.cjs --test --reproducible`，再用 `--check` 核对产物；检查手机/桌面、键盘、禁用 JS、返回键与打印
8. 若改过旧 URL，补 `legacy` 映射，绝不悄悄删除他人书签

## 回归与发布

构建/科学验证的规范环境为 Node.js 24、Python 3.12、NumPy 2.3.5、SciPy 1.17.0；没有新增 JavaScript 包依赖。网页运行仍是独立 HTML/CSS/JS，不要求访问构建工具、服务或 SPA 路由。

```sh
node --test tests/compatibility-build.test.cjs
node scripts/build-compatibility.cjs --test --reproducible
node scripts/build-compatibility.cjs --check
python3 -m http.server 8000 --directory dist
```

构建器测试在源码根目录执行；既有 956 项数值、结构、集成与模拟 DOM 回归由 `--test` 在旧布局暂存区运行，不能以源码根目录的 `node --test tests/*.test.cjs` 替代。`--reproducible` 独立暂存、生成并比较完整产物。波形生成器使用检查模式重新计算约束，保留既有规范 JSON；不得因 BLAS/SVD 表示差异顺手重写科学数据。

导航检查针对发布布局的根 HTML 本地路径/fragment、唯一 ID、无 JS 链接、共享导航/当前位置、注册表引用、生成一致性与旧路由行为。`--check` 从当前源码重新生成并逐项核对现有 `dist/` 的文件集合和字节；它只判断产物是否新鲜，不要求内容与迁移前永远相同。PR 中明确区分实际运行的检查与待执行的浏览器/上线检查。

### 一次迁移审计与正常内容编辑分开

`node scripts/build-compatibility.cjs --audit-migration` 单独核对冻结的迁移前文件/散列清单和完整公开树，仅允许已审核的三份当前维护文档 `README.md`、`AGENTS.md`、`docs/SITE-ARCHITECTURE.md` 的精确差异。它不允许科学正文、脚本、模型、数据、测试或历史验证记录借整理目录发生变化。这是迁移证据，不是正常作者构建的前置条件；后续内容编辑由当前源码、显式映射和针对性回归约束，不靠更新冻结基线放行。

### Actions 发布

`.github/workflows/pages.yml` 对 PR 和 `main` 执行构建验证；PR 只运行只读构建任务，`main` 的 push 或手动工作流才上传已验证的 `dist/` 并部署。发布产物保留 `.nojekyll`。Pages 应使用 GitHub Actions，不再选择 `main` 分支根目录作为发布源。

删除旧根目录页面/资源入口的迁移发布之前，先核实仓库 Pages 的 Actions 设置和工作流部署成功。合并后确认对应提交的构建、上传与部署结果，并另做真实线上资源和交互检查；CI 成功不代表浏览器、键盘、打印、无 JavaScript 或辅助技术验收已完成。完整构建契约见源码 `build/README.md`。

## 历史架构与验收记录

以下带日期的章节按原文保留，记录当时的设计、源码路径、命令、计数、提交与验证范围。旧 `site/`、根脚本和 `scripts/` 路径继续作为兼容/公开路径存在；当前源码归属见上表。历史命令及通过数量不能当作源码搬迁后的运行指南，也不代表本次迁移或新部署已经通过。`docs/*-VALIDATION.md` 等历史报告同样保持原文与原日期。

## 阅读页场景引导（2026-10-10）

`site/content-scene-guide.html` 是 `reading.html#directions` 内的手写科学文案源；生成器插入 registry 的位置按钮，并在原方向卡上生成位置属性、可见链路标签与选择提示。没有第二份方向目录、独立页面或实验模型。`scene-guide.js` 是仅在阅读页加载的原生模块，`scene-guide.css` 同样局部加载；两者 URL 带缓存版本。改变资源内容时同步更新版本。

角色按钮切换一组已知/未知说明；首次进入与重置时两组均可读。重复点击保持选中，重置取消选择。链路按钮只给既有卡加边框和文字标记，不隐藏、重排卡片，不自动滚动；可选的原生链接定位首张对应卡。其余细节保持原生 details，预测无评分、门禁、自动播放或存储。无 JS 时控件隐藏，两个角色、路径边界、预测披露、链路标签和全部方向资源仍可读。引导不读取或改写 URL/history，历史恢复依赖浏览器原生行为。

为新方向添加可选的链路 ID 即可加入定位；未标记的方向仍正常显示。位置标签和现象提示只在 registry 维护；方向实验链接和 available/proposed、foundation-only 语义仍使用原六层数据。新增资源应按原文对照契约填写，不能把前置教学模型升级宣传为专项实验或已完成复现。

## 首页知识地图（2026-10）

`index.html#knowledge-map` 是唯一全局知识地图，原 `#curriculum` 四阶段路线与旧锚点仍保留。`site/registry.json` 的 `knowledgeMap` 只维护教学分组、概念文字、类型化关系与引用；这是一种可扩展的教学组织，不是穷尽研究分类。关系是编辑导航，不是新增因果或性能结论。

- `scripts/knowledge-map.cjs` 由主生成器调用，解析 `entryUnitRef` / `unitRefs`、方向引用、原文对照与六层覆盖；不得复制实验动作、方向证据或论文元数据作为第二份来源。
- `knowledge-map.js` 仅增强静态 `<details>`、链接与生成的 `<template>`：搜索、局部关系筛选、选择、返回全景、Escape 和地图锚点历史。没有网络请求、参数上传或新的科学计算。
- `knowledge-map.css` 限定地图和首页视觉；共享 `site.css` 的增补只涉及站点导航和门户目录，不改变实验控件。
- 地图概念入口使用 `map-node-*`，分组使用 `map-group-*`。不占用旧基础章锚点。无 JavaScript 时通过原生展开与普通链接直接阅读。
- 新增机制时注册 `units` 并在相关概念的 `unitRefs` 引用它；新增方向时注册 `directions` 并添加 reference-only `directionNodes`。概念数、实验数、案例数由记录派生。`available` / `proposed`、前置实验 / 专项机制、部分原文核对 / 完整复现继续分别展示。
- 地图测试区分静态契约、模拟 DOM 与真实浏览器检查；前两者不代表已经验证屏幕阅读器或线上布局。

## 研究论文影响证据目录

`registry.researchDirectoryFile` 指向 `site/research-directory.json`，它是候选论文的唯一书目与影响证据来源。书目身份、发表时间、机制、引用快照、服务访问时间、学会推荐 / 奖项 / 官方资源和证据边界均在此维护。`scripts/render-research-directory.cjs` 将其生成到 `reading.html#influential-papers`，不增加平行门户，也不在线请求计量服务。标题与导航中的篇数从 `cards.length` 生成，增删论文无需同步修改计数文案。`research-directory.css` 仅为该目录提供窄屏样式。

书目卡片只保存可选 `caseId`，不复制教学案例的路径、模型或完成状态。生成器从 `registry.cases → units → pages` 解析入口，且对应本地文件存在才生成教学案例链接；否则保留不可点击的“准备中 / 尚未实现”。新增论文交互必须先注册并验证相应案例，不能单靠有论文 DOI 就成为 available。

2026-10-10 的核验把 OpenAlex 与 Semantic Scholar 数量分别保存；2025 项是施引文献发表年份，不是当年新增索引数。Perceptive Mobile Network 的 OpenAlex DOI 与仓储记录拆分，不能相加，且不参加该服务的数量比较。目录不是穷尽排名，也没有经过验证的社交讨论量。所有计量访问时间和记录更新时间保留在可展开详情中。

验证：`tests/research-directory.test.cjs` 检查论文唯一身份、来源与快照值、奖项年份、记录拆分、未实现链接门禁和无 JavaScript 披露；全站原有结构测试继续核对本地资源、锚点与生成新鲜度。测试不声称重新访问远程来源或通过浏览器视觉回归。

## 波形案例与书目集成核验（2026-10-10）

在知识地图版本之上，波形案例、九篇论文目录和六层研究方向共享同一注册表。地图的波形概念保留导频入口，并通过 `unitRefs` 增加严格协方差实验；静止单径时延估计与已知 H、S、R_d 的波形设计分别说明。书目中的 `case-waveform` 通过规范案例解析为实际机制链接，不重复存储论文对照或实验完成状态。共享样式与地图脚本的缓存版本保持一致。

集成后实际运行：`node --test tests/*.test.cjs` 为256项通过、0失败；包括全站本地路径、资源、锚点、唯一ID与兼容路由检查，以及两项专门的跨功能集成回归。`node scripts/generate-site.cjs --check`、`python3 scripts/generate-waveform.py --check`、`git diff --check` 均通过。波形数值核心、界面脚本、样式、状态数据、生成器与原有波形测试均未改动；波形页面只由站点生成器同步共享样式缓存版本。此轮未执行真实浏览器或线上部署检查，不能将静态和模拟DOM回归视为这两类验证。

### 窄屏详情定位修正

真实云端浏览器初查在323 CSS像素宽度发现：选择概念后，原生 `focus()` 可把较长详情面板滚到中部，标题与问题不在视口。现仅在主动选择概念时先用 `focus({preventScroll:true})` 保持键盘焦点，再用 `scrollIntoView({block:'start',behavior:'auto'})` 配合既有 `scroll-margin-top` 展示面板顶部。Back/Forward与hash恢复不触发该显式滚动，返回全景焦点逻辑不变。地图脚本缓存更新为 `knowledge-map-v2`，样式无需修改。新增DOM回归验证焦点/滚动调用顺序、参数和历史恢复行为；修正后全量257项通过、0失败，门户新鲜度、脚本语法与diff检查通过。实际浏览器修正后复验仍需单独完成。

## 分离/共享阵列机制接入（2026-10-11）

`case-shared-array`、`shared-array` unit 和 `shared-array.html` page 是同一规范路线，首读 `#question`，实验 `#experiment`，原文 `#paper`，边界 `#boundaries`。页面另有 `#objects`、`#mechanism`、`#validation`，共享壳只由生成器维护。

- 复用现有空间与通感权衡方向的六层结构，新增先修、资源账本、可用实验、固定版本原文和实际检验入口；不新建方向或改变旧入口
- 知识地图复用 `budget`、`beam-design`、`joint-objectives`，保留原基础入口及32个概念；规范实验增至24个、专题增至13个
- 既有9篇影响目录只激活 `mu_mimo`，已接入深度案例8/9；所有引用、来源、日期、学会推荐、社交快照保持不变。DeepSense继续保持资源入口，没有虚构交互按钮
- 2018共享只发通信数据，2020联合波束模型另有独立雷达流；raw投影单列诊断，四个主配方对齐实际总功率；不把配方比较标成架构通用赢家或完整论文复现
- `tests/shared-array-integration.test.cjs` 检查规范注册、六层、三处地图引用、原文定位、资源与边界、书目证据不变及静态链接。数值、界面与实际浏览器验证另行记录；此架构说明本身不声明其通过

## 通用教学入口与实验名称搜索（2026-10-11）

`scripts/learning-entry.cjs` 是生成时共享的入口解析器：通用“进入教学案例”、地图深入案例与新增课程搜索结果优先使用 `case.learningEntry`，未设置时使用对应 `unit.href`；没有案例的已注册 unit 也使用 `unit.href`。入口必须是存在的本地页面与锚点，案例自定义入口限定在 unit 的同一页面。Golay 的首读本来就在 `#experiment`，保持原意。明确标成“进入实验 / 进入机制实验 / 先动手机制实验”的路线继续使用 `unit.href`。

地图搜索从已注册 `units.title` 生成惰性的课程索引，以大小写无关的完整或部分名称匹配。课程结果是标明“课程入口 · 直接打开”的原生链接；原有概念与方向结果仍是标明类型的“查看关系”按钮。直接课程结果置前，完整名称优先；每个 unit 只收录一次，全部匹配均显示，总数区分课程入口与概念或方向。不扩大到论文标题、来源元数据、泛化关键词或未实现计划；DeepSense 继续只在论文目录保留资源入口。索引不新增永久地图节点，不改变局部关系条数、四阶段路线或无 JS 目录。

浏览器只使用生成的模板和链接，不加载 Node 文件系统解析器，也不请求新资源服务。课程链接保留原生 Tab/Enter 与浏览器返回行为；搜索清除、Escape、返回全景和关系历史继续由已有地图交互处理。静态与模拟 DOM 回归不能替代实际桌面、窄屏与辅助技术检查。

### 教学入口统一：线上验收（2026-10-11）

PR #37 合并提交 `840d7fe24b08c59a3385117ba6e9936496fe974f`，对应 Pages `38121379307` 成功；18 个远端文件逐一匹配冻结清单，558 项完整回归、生成新鲜度与空白检查通过。

云端 Chrome 实测：共享阵列搜索得到 1 个直接课程入口和 3 个概念关系；插值得到 1+4，Golay 得到 1+5，I/Q 得到 1 个基础课链接和 1 个概念关系。直接链接以键盘 Enter 打开正确的入门锚点；浏览器返回保留搜索，前进仍到对应课程。概念按钮继续选择关系面板，Escape、无结果提示和清除搜索恢复正常。读取全部九张论文卡的实际链接，七张转入既有入门讲解、Golay 保留实验入口、DeepSense 保持无教学链接；实际跟随共享阵列论文卡验证标题与 #question。其余锚点由结构测试核验，未声称逐个浏览点击。

桌面 1165 CSS 像素与窄屏 323 CSS 像素（桌面浏览器 150% 缩放，非实体手机）均已检查。窄屏结果项约 258×61 CSS 像素，课程／概念类型清楚，键盘可操作，无横向页面溢出。最终恢复桌面大小与 100% 缩放；抽样错误仅见浏览器扩展元数据错误，无网站来源错误。混合缓存旧 HTML 的降级由独立运行的模拟 DOM 测试覆盖，不冒充实际缓存实验。未验证其他浏览器、真实读屏、打印或无 JavaScript 网络场景，也未进行线上 HTTP 逐字节散列比较。


## 两站检测机制接入（2026-10-11）

`case-distributed-detection`、`distributed-detection` unit 与 `distributed-detection.html` page 使用同一规范注册，所属研究方向为既有 `networks`。通用课程入口是 `#question`，显式实验入口是 `#experiment`；`scripts/learning-entry.cjs` 保持唯一解析器，不增加页面专用跳转或浏览器路由。

- 同页教学顺序为 `#question` → `#observation` → `#model` → `#experiment` → `#paper` → `#practice`；既有六层方向结构不改 schema。观测与数学都列在 model 层，paper 层与 limits 层分别链接同一个包含来源和边界的 `#paper`，reproduction 层链接可复核的 `#practice`。不为凑层数制造不存在的锚点
- 复用 `matched`、`detection`、`budget` 三个概念的 `unitRefs`，保留全部32个概念、原始入门入口和关系边。总数更新为26个机制、15个案例、8个方向；原25个机制与14个案例完整保留
- 网络时钟仍是 networks 的原有案例和首个直觉入口；新机制追加，不把已关联标量时延定位和固定候选存在性检测混为一个模型。旧四阶段导航、锚点、兼容映射与其他七个方向保持不变
- `site/content-reading.html#ref-DISTRIBUTED` 是普通来源导读，不是影响力卡。Behdad2024固定v2只作为研究背景，本站边缘化LRT不是其最大化MAPRT；Zou2024保留稳定官方/作者全文缺口，不生成未核对公式/算法的复现宣传
- `site/research-directory.json` 完全保持字节一致，9篇影响目录与8篇已接入状态不变；不增删论文、不刷新引用/学会/社交快照。来源导读与新增教学案例可以独立于影响目录扩展
- `tests/distributed-detection-integration.test.cjs` 检查规范注册、六个实际锚点、中央入口解析、旧记录/关系/来源快照不变，以及来源与资源边界；旧集成测试只同步全局机制/案例计数和网络方向新增项。正文完成后统一运行既有生成器；本节不是数值、浏览器或上线通过声明
