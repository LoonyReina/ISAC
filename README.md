# ISAC 交互学习：从物理直觉到研究证据

面向有信号与系统/通信原理基础、但尚未学过雷达或估计理论的读者。
在线阅读：https://loonyreina.github.io/ISAC/

## 一条主路线，四个阶段

1. `index.html` 是唯一学习地图：选择当前阶段，不堆叠所有案例
2. `foundations.html` 是连续基础讲义（原 00–13 章）：回波 → I/Q → 匹配 → 多普勒 → 阵列 → OFDM → 检测 → 系统与几何
3. `experiments.html` 按观测、处理、研究机制列出真实可用的互动实验；搜索只是渐进增强，无 JavaScript 时所有链接仍可用
4. `reading.html` 是研究方向与原文入口：八个可扩展方向、每方向六层学习深度、五个已实现专题、研究进展与固定版本书目
5. `practice.html` 是研究工作流、待执行的导频实验设计、可复制记录单和四周节奏

`theory.html` 提供共同观测模型、标量 CRB 和速率桥梁。导频、网络时钟、SBFD、近场页面保留原模型与原文导读，并共享阶段导航、当前位置、先修、同主题路线与下一步。

所有实验遵循“先预测 → 改一个量 → 观察 → 解释/核对原文”。七步 OFDM 仍默认只显示第一步；动画默认暂停。图像由同一数值模型驱动，不手绘假峰、不上传参数。

## 可继续扩展的内容架构

- `site/registry.json`：阶段、页面、机制单元、研究方向、主题证据与旧链接映射的单一注册表
- `scripts/generate-site.cjs`：无第三方依赖的确定性静态生成器
- `site/content-*.html`：手写的研究脉络、参考文献、实践与补充模型正文
- `site.css`：共享外壳、响应式目录与可访问状态
- `catalog.js`：可选实验筛选；`legacy-routes.js`：生成的已知旧链接转接
- 科学页面中的 `SITE:HEADER`、`SITE:CONTEXT`、`SITE:NEXT` 标记区域由生成器维护；其余科学正文和 JS 保持手写

研究横向按波形/导频、检测/估计、通感权衡、空间感知、多站协作、真实信道、数据驱动感知、原型/标准组织。每个方向纵向按问题直觉、观测模型、互动实验、原文对照、创新边界、复现检验扩展。已有前置实验不标成专项实现，通用计划不标成论文复现；未实现层次不产生死链接。

详细迁移表、新主题接入步骤与证据字段契约见 [架构与迁移指南](docs/SITE-ARCHITECTURE.md)。

## 本地维护与验证

```sh
node scripts/generate-site.cjs
node scripts/generate-site.cjs --check
node --test tests/*.test.cjs
python3 -m http.server 8000
```

生成的 HTML/JS 一并提交。GitHub Pages 仍从 `main` 根目录发布，保留 `.nojekyll`；线上无构建步骤、无依赖、无 SPA 路由。编辑器构建与线上运行分离。

当前框架迁移的实际测试记录见 [验证记录](docs/FRAMEWORK-VALIDATION.md)。历史各实验的科学假设、已做/未做验证仍见 `docs/*-VALIDATION.md`。静态检查不能替代浏览器交互、键盘、打印或上线回归。

## 旧书签与补充材料

- 原 `index.html#…` 转到该内容的真实新位置：基础、阅读或实践，保留所有原静态 ID 与运行时速度匹配入口
- `research.html` 转到 `reading.html`，保留五案例锚点
- `learn.html` 的实验转到 `sandbox.html`；`overview.html` 的独有响应模型整合到 `resolution.html`，四周路线/FAQ 整合进实践
- 兼容页提供不用 JavaScript 的对应链接；已知 hash 用 `location.replace` 转接，避免返回键重定向循环
- 补充沙盒不是第二套学习首页，只从机制目录按需进入；其独立参数、声学/电磁区别、噪声/归一化条件保留

## 科学与出处边界

本次重构不新增论文检索，不把教学机制称作原论文完整复现。原文核对日期/版本、理论/仿真/实测/原型证据层级分别保留。近期材料主要截至原记录的 2026-10-08 / 2026-10-10；版本和逐项核对范围见 [来源地图](docs/READING-MAP.md)。

`course-core.js`、`intuition-core.js`、`velocity-core.js`、`theory-core.js` 及各专题核心负责纯计算；对应 UI 模块消费同一输出。所有数值回归独立保留。不要把分辨尺度、精度、不模糊范围、CRB、检出率混成一个“性能”。

修改从最新 `main` 建分支，通过 PR 审核与测试再合并；部署之后另做真实线上交互检查。不提交凭据、第三方论文全文或未经许可的图表。
