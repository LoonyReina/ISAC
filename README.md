# ISAC 交互学习：从物理直觉到研究证据

面向有信号与系统/通信原理基础、但尚未学过雷达或估计理论的读者。
在线阅读：https://loonyreina.github.io/ISAC/

## 一条主路线，两大板块

1. `index.html` 是唯一学习地图：选择当前阶段，不堆叠所有案例
2. `foundations.html` 是连续基础讲义（原 00–13 章）：回波 → I/Q → 匹配 → 多普勒 → 阵列 → OFDM → 检测 → 系统与几何
3. `experiments.html` 按观测、处理、研究机制列出真实可用的互动实验；搜索只是渐进增强，无 JavaScript 时所有链接仍可用
4. `reading.html` 是研究方向与原文入口：八个可扩展方向、每方向六层学习深度、十五个已接入专题、研究进展与固定版本书目
5. `practice.html` 是研究工作流、待执行的导频实验设计、可复制记录单和四周节奏

`theory.html` 提供共同观测模型、标量 CRB 和速率桥梁。导频、网络时钟、SBFD、近场页面保留原模型与原文导读，并共享阶段导航、当前位置、先修、同主题路线与下一步。

所有实验遵循“先预测 → 改一个量 → 观察 → 解释/核对原文”。七步 OFDM 仍默认只显示第一步；动画默认暂停。图像由同一数值模型驱动，不手绘假峰、不上传参数。

## 可继续扩展的内容架构

源码按职责组织，发布地址保持不变。本文的 `index.html` 等页面名和页面链接均指发布 URL；本地预览以 `dist/` 为站点根目录，不以源码根目录为站点根目录。

- `content/data/registry.json`：阶段、页面、机制单元、研究方向、主题证据与旧链接映射的单一注册表；研究指南与影响证据目录也在 `content/data/`
- `content/pages/`：手写科学页面；`content/fragments/content-*.html`：研究脉络、参考文献、实践与补充模型正文
- `features/`：基础讲义、知识地图、研究阅读、实验筛选与研究草稿等功能；`labs/`：各专题的数值核心、界面和局部样式
- `shared/styles/`：跨页面课程与站点样式；`shared/records/`：可复用的本地实验记录/下载支持；`assets/data/`：既有科学证据数据
- `scripts/site/`：确定性站点生成器及共享解析器；`scripts/validation/`：按专题归属的独立参考、审计与验证材料；`tests/`：数值、结构和界面回归
- 科学页面中的 `SITE:HEADER`、`SITE:CONTEXT`、`SITE:NEXT` 标记区域由兼容构建中的生成器维护；其余科学正文和 JS 保持手写
- `build/compatibility-manifest.json` 显式映射源码、旧布局暂存路径和公开路径；`scripts/build-compatibility.cjs` 从当前源码生成 `dist/`，不会把整个源码树按通配符发布

八张整体生成页面与 `legacy-routes.js` 直接从权威源码生成，清单中标记为 `role: "generated"`、`source: null`，不再需要生成种子或既有 `dist/`。生成器先在内存中完成页面、共享壳与兼容路由，再对完整页面集执行本地页面链接、锚点和重复 ID 校验；全部通过后才写入暂存区。独立调用的教学入口解析器仍立即严格校验目标。新增研究指南或生成页面锚点时，编辑 `content/data/` 和 `content/fragments/` 中的权威输入并重新构建，不手改产物，也不重置历史散列。`build/compatibility-seeds/project.gitignore` 仅保留为不发布的历史元数据，与生成页面无关。

研究横向按波形/导频、检测/估计、通感权衡、空间感知、多站协作、真实信道、数据驱动感知、原型/标准组织。每个方向纵向按问题直觉、观测模型、互动实验、原文对照、创新边界、复现检验扩展。已有前置实验不标成专项实现，通用计划不标成论文复现；未实现层次不产生死链接。

详细迁移表、新主题接入步骤与证据字段契约见 [架构与迁移指南](docs/SITE-ARCHITECTURE.md)。

## 分离与共享阵列

[同样八根天线，分开使用会少掉什么？](https://loonyreina.github.io/ISAC/shared-array.html#question) 从物理阵列、信号流和实际功率开始，解释严格空间置零的目标照射代价。四个主配方使用同一总功率；raw 投影单列诊断。2018 共享仅复用通信数据，与 2020 额外独立雷达流案例分开；不宣称架构通用赢家或作者算法复现。原文版本与边界见[来源地图](docs/READING-MAP.md)。九篇研究目录现有八篇机制入口，DeepSense仍为资源入口；影响数据保留2026-10-10快照。

## 两站检测与双向回传

[两个功率数，够不够判断有目标？](https://loonyreina.github.io/ISAC/distributed-detection.html#question) 从同相/反相的复观测开始，比较原始样本、两个复匹配输出和局部匹配能量和。在已校准、已知白噪声与已知先验的固定候选模型中，复匹配是充分压缩；独立反射时能量和也足够，相关时相对相位一般仍是证据。实验对齐虚警率，并把模板下行与观测上行分开记账。

本站使用独立边缘化 LRT，不复现 Behdad2024 的最大化 MAPRT；Zou2024 仅作研究动机，官方/作者全文来源尚未闭合。现有 27 个机制、15 个专题、32 个概念与 8 个研究方向共用原导航；9 篇影响目录仍为 8 篇已接入，不新增影响力卡。

## 从参考问题到自己的研究记录

[实践页的研究草稿](https://loonyreina.github.io/ISAC/practice.html#notebook) 保留原九行可复制模板，并提供四步、十个初始空白栏。可选的 27 个参考主题来自共享注册表；切换主题只改参考背景，不覆盖学习者文字。记录区只检查是否填写，不认证正确性、实验执行或可复现性。

草稿仅在当前页面中，不自动保存或上传。刷新、关闭或离开前请下载 Markdown 或 JSON，并检查实际文件。空白和部分填写都能导出；导出时间不是实验执行时间。学习者笔记与实验页计算生成的完整 JSON 证据分开保存。

## 本地维护与验证

构建/验证环境为 Node.js 24、Python 3.12、NumPy 2.3.5、SciPy 1.17.0；没有新增 JavaScript 包依赖。发布后的 HTML/CSS/JS 仍可独立静态运行，不需要 Node、Python、构建服务或 SPA 路由。

```sh
node --test tests/compatibility-build.test.cjs
node scripts/build-compatibility.cjs --test --reproducible
node scripts/build-compatibility.cjs --check
python3 -m http.server 8000 --directory dist
```

第一条检查构建器；`--test` 在临时旧路径布局中运行原有 956 项回归及新增的生成顺序与完整页面校验回归；`--reproducible` 独立重建并比较完整产物。`--check` 将现有 `dist/` 与当前源码的一次全新构建比较，发现缺失、多余或过期内容即失败，不把迁移前的冻结字节当成日常内容限制。源码搬迁后不要在仓库根目录直接运行旧的 `node --test tests/*.test.cjs`，也不要绕过兼容构建直接调用旧路径生成器。

提交权威源码和显式映射；`dist/` 是生成的发布产物，不手改、不作为正文来源。GitHub Pages 由 `.github/workflows/pages.yml` 在 Actions 中验证、构建并上传 `dist/`（含 `.nojekyll`），不再发布 `main` 源码根目录。PR 只执行验证；`main` 的 push 或手动工作流才进入部署。删除旧根目录入口的迁移发布前，必须先确认仓库 Pages 已使用 GitHub Actions，且对应工作流能成功发布兼容产物。

仅在核验历史迁移兼容性时另外运行 `node scripts/build-compatibility.cjs --audit-migration`：它对照冻结的迁移前清单，分别核对 `migration-maintainer-deltas.json` 中三份当前维护文档（`README.md`、`AGENTS.md`、`docs/SITE-ARCHITECTURE.md`）的精确差异，以及 `migration-build-deltas.json` 中逐文件列明的必要生成器、辅助程序和测试源码差异；这两份审计清单位于 `build/`，没有通配符豁免。此次移除生成种子保留全部 367 个公开路径，27 张 HTML、运行时资源、模型与数据字节不变；公开的构建相关源码和测试则如实反映实现变化。审计不是日常构建的前置条件，不应通过重写冻结散列来放行后续内容编辑。构建细节见源码中的 `build/README.md`。

[框架验证记录](docs/FRAMEWORK-VALIDATION.md) 与 `docs/*-VALIDATION.md` 保留原日期、当时的路径、命令和实际验证范围；它们不是本次源码迁移的新验收声明。静态检查不能替代浏览器交互、键盘、打印或上线回归。

## 旧书签与补充材料

- 原 `index.html#…` 转到该内容的真实新位置：基础、阅读或实践，保留所有原静态 ID 与运行时速度匹配入口
- `research.html` 转到 `reading.html`，保留五案例锚点
- `learn.html` 的实验转到 `sandbox.html`；`overview.html` 的独有响应模型整合到 `resolution.html`，四周路线/FAQ 整合进实践
- 兼容页提供不用 JavaScript 的对应链接；已知 hash 用 `location.replace` 转接，避免返回键重定向循环
- 补充沙盒不是第二套学习首页，只从机制目录按需进入；其独立参数、声学/电磁区别、噪声/归一化条件保留

## 科学与出处边界

本次重构不新增论文检索，不把教学机制称作原论文完整复现。原文核对日期/版本、理论/仿真/实测/原型证据层级分别保留。近期材料主要截至原记录的 2026-10-08 / 2026-10-10；版本和逐项核对范围见 [来源地图](docs/READING-MAP.md)。

`features/foundations/` 下的 `course-core.js`、`intuition-core.js`、`velocity-core.js`，以及 `labs/theory/theory-core.js` 和各专题核心负责纯计算；对应 UI 模块消费同一输出。所有数值回归独立保留。不要把分辨尺度、精度、不模糊范围、CRB、检出率混成一个“性能”。

修改从最新 `main` 建分支，通过 PR 审核与测试再合并；部署之后另做真实线上交互检查。不提交凭据、第三方论文全文或未经许可的图表。

## 离格目标与有限网格测距

[同一个目标，网格更密就一定测得更准吗？](https://loonyreina.github.io/ISAC/offgrid-range.html#experiment) 是新增的基础机制，不是第 16 个论文案例。固定同一份 16 子载波复数观测、物理预算与闭区间，比较 5 m / 0.5 m 候选；未知复增益逐候选拟合，真值只进入生成器与评价。先预测无噪声误差，再查看全部配对试验的 RMSE 与预先声明的大误差次数。

低 SNR 固定反例明确标为经探索选取，全部错误峰和数值失败行保留；取消的部分运行不报告整批指标。原始 JSON 使用既有本地下载组件，研究草稿仍由学习者自己填写。独立参考与完整探索见 [数值说明](https://loonyreina.github.io/ISAC/scripts/offgrid-range-reference/README.md)（源码归属 `scripts/validation/ofdm-reference/offgrid-range-reference/`，公开地址保持原路径），实际检查范围见 [本次验证](docs/OFFGRID-RANGE-VALIDATION.md)。

## 当前导航结构

基础知识围绕概念整合机制子课；论文阅读以研究分支连接固定原文、实际算法课与证据。原 experiments/practice URL 仅作兼容入口，研究方法与记录位于 reading 页面内部。完整旧链接和科学核心保持可用。
