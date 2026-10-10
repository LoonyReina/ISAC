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

`site/registry.json` 是共享框架的唯一来源：

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

## 静态生成与手写边界

运行 `node scripts/generate-site.cjs`，提交生成产物；运行 `--check` 在内存重算并比较，发现漂移即失败。无第三方包、无网络、无时间戳、无线上构建。

- index、experiments、reading、practice、resolution 与三张兼容页整体生成
- 研究脉络、前沿、书目、实践和补充响应正文维护在 `site/content-*.html`
- foundations、theory、四个专题、sandbox 保留手写科学正文；生成器只覆盖 `SITE:HEADER`、`SITE:CONTEXT`、`SITE:NEXT` 三个成对区域
- 各模型核心与 UI 脚本不参加框架生成，不挪动其控件 ID、加载顺序或全局协作接口
- 不直接编辑生成的 legacy-routes.js，它由 `legacy` 生成

`course-ui.js` 同时初始化 OFDM、CFAR、阵列、几何、打印和进度。其余两个扩展依赖统一输入/播放循环与 `window.ISACCourseReady` / `window.ISACCourseUI`。因此保留原 00–13 章完整 DOM；没有绑定控件的原 14、15、17 章移到 reading，原 16 章内容融入 practice。理论页 research-method 内包含真实 CRB 与速率实验，不能连同七问文字整体删除。

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
3. 建立纯模型与数值测试，再把真实输出接到可访问的原生控件/图表/数字替代
4. 在 `units` 注册机制；在 `pages` 指定阶段、先修、同题实验/原文/边界与下一步
5. 在 `cases` 填经核对的来源与对照字段；不确定部分明确留待核对
6. 在方向的相应层引用同一资源，不复制实现，不把通用计划标成已复现
7. 生成并运行全量测试；检查手机/桌面、键盘、禁用 JS、返回键与打印
8. 若改过旧 URL，补 `legacy` 映射，绝不悄悄删除他人书签

## 回归与发布

导航测试检查所有根 HTML 本地路径/fragment、唯一 ID、无 JS 链接、共享导航/当前位置、注册表引用、生成一致性与旧路由行为。数值测试保留，静态断言从旧入口迁移到当前语义归属。PR 中区分真正执行过的测试与待执行浏览器/上线检查。部署仍是 GitHub Pages 的 main 根目录与 .nojekyll。

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
