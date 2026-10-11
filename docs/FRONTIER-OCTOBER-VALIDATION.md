# 2026-10-11 前沿与标准状态更新验证

日期：2026-10-11 UTC。基线：`b0f8c001239dcf6cb8e28e9b3fe8ec362c78b3c4`，工作分支：`docs/isac-frontier-october`。

## 范围与证据

本次依据同日官方标准记录、作者/机构出版记录和三篇资料相关章节的核查快照，将有界更新落实到现有教学站点。来源与阅读定位见 [阅读映射](READING-MAP.md) 的 2026-10-11 补充。

- `site/content-frontiers.html` 修正架构层一概“仍在研究”的表述；`theory.html#standards-status` 同步区分 ITU 草案、服务需求、Stage 2 架构 TS、无线研究 TR 与推进中的 RAN 工作项
- TS 23.137 Rel-20 v20.0.0 的 2026-09-24 上传日期与 Under Change Control 状态来自官方元数据。未读取该版本全文；不声称核对具体功能实体、程序或完整规范栈，也不称首个架构标准
- ITU 5/116、5/119 仍是拟于 2026 年 12 月审批的草案；TR 38.765 v20.0.0 仍按研究报告标注；NR_Sensing_bis-Core 的 25% 是 2026 年 9 月官方进度快照
- TS 22.137 保留 Rel-19 v19.1.0 固定全文，分别写明 3GPP 上传日期与 ETSI 文本封面日期；另列 Rel-20/21 的 2026-10-02 上传版本，不从版本号推断新增功能，未比较版本差分
- 新增 F1/F2/F3 三篇固定作者版本，分别标注“2026 期刊 / 2025 作者 v2”、“作者出版记录与 arXiv To appear 差异”、“已投稿的综述预印本，未确认接受/出版”。每篇有一个学习问题、阅读定位和证据边界
- F1 的被引原型、F2 的纯通信预编码演示、F3 的无线定位范围分别标明；没有新增教程算法实测、通感联合曲线、全场景泛化或论文复现结论

三篇资料相关章节已在资料核查中阅读；页面实现阶段按快照转写，没有重新逐式证明或重跑论文实验。标准元数据核查与标准全文核查不能混称。

## 修改文件清单

手写内容与注册表：
- `site/content-frontiers.html`
- `site/content-reading.html`
- `site/registry.json`
- `theory.html`

生成器与生成产物：
- `scripts/generate-site.cjs`：仅增加阅读目录的“2026 阅读补充”锚点
- `index.html`：由生成器更新三方向的原文入口
- `reading.html`：由生成器更新入口与正文，未手改生成门户

文档与回归：
- `docs/READING-MAP.md`
- `docs/FRONTIER-OCTOBER-VALIDATION.md`
- `tests/frontier-evidence.test.cjs`

## 实际运行结果

- `node scripts/generate-site.cjs`：只生成 `index.html` 与 `reading.html`
- `node scripts/generate-site.cjs --check`：通过，静态生成产物为最新
- `node --test tests/frontier-evidence.test.cjs`：5 / 5 通过
- `node --test tests/*.test.cjs`：311 / 311 通过，0 失败、0 跳过
- `git diff --check`：通过
- 基线差异核查：注册表除 receiver、spatial、learning 的原文层共四个链接外，其余字段保持一致；19 个机制单元、8 个案例、31 个概念、8 个方向均保留
- `site/research-directory.json` 与基线逐字节一致，SHA-256：`8d6b117a04a5a4eefb3a56a55bbaf656aa1b4f41d4e4779a4728eba1909d4890`。九篇论文身份、引用计数、快照日期均未刷新
- 无科学 JS、公式、实验控件、CSS 或科学数据文件变化；沿用现有书目布局

新增回归覆盖官方来源链接、TS/TR/草案/工作项身份分离、上传与审批的日期语义、TS 22.137 固定版本与新版本注记、三篇固定作者版本及出版边界、方向原文入口、所有根 HTML 和新增正文源的本地链接/片段，以及外链 URL 语法。既有回归同时覆盖生成器、旧书签、静态 ID、导航、数值模型和模拟 DOM。

## 未做与剩余验证

- 没有执行真实浏览器、视觉、窄屏、键盘、屏幕阅读器、打印或真实历史导航回归；模拟 DOM 与静态链接检查不能替代这些验证
- 没有进行本次实现的外链逐个网络加载测试；来源状态依据资料核查快照，URL 语法/本地目标测试不代表远端持续可用
- 没有读取 TS 23.137 v20.0.0 全文、逐条版本比较、论文算法复现或综述所引实验的二次验真
- 没有提交、推送、合并、部署或验证线上页面；本记录仅覆盖本地工作树
