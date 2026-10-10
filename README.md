# ISAC 交互讲义：从一束电波到一张感知图

面向学过信号与系统、通信原理的本科生。在线阅读：
https://loonyreina.github.io/ISAC/

## 阅读路线

首页由独立实验集合重整为 18 章连续讲义：问题与沿革 → 回波/延迟 → I/Q/相位 → 匹配滤波 → 多普勒 → 阵列 → OFDM 通信接收 → 七步感知处理 → CFAR → 性能指标 → 收发设计 → 真实信道/干扰 → 多站几何 → 研究分支 → 2026 原文案例 → 复现路线与参考资料。

OFDM 默认只显示一个复数样本，随后依次解释一行、距离匹配、一列、相位矩阵、距离–慢时间和距离–速度。每幅图注明输入、坐标、颜色含义；峰由复数计算产生，不按目标真值伪造。

- `index.html`：新的静态长篇讲义；无需 JavaScript 也可读正文。
- `course.css`：响应式目录、正文、图示与打印样式。
- `course-core.js`：浏览器/Node 共用的纯数值模型。
- `course.js`：Canvas、七步导航与交互；动画默认暂停。
- `tests/course.test.cjs`：18 项新模型测试。
- `docs/READING-MAP.md`：七篇综述及近期原文的阅读位置、证据与教学对应。
- `docs/COURSE-VALIDATION.md`：本次实际执行的检查和未验证范围。

`learn.html`、`learn.css`、`learn.js`、`lab-core.js` 与旧模型测试保留上一轮五实验版本；`overview.html` 保留最初全景介绍。它们不再与新首页同步。首页兼容 `#concept`、`#lab`、`#methods`、`#roadmap` 等旧锚点，导航中也提供旧版入口。

## 本地预览与数值测试

```sh
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
node --test tests/course.test.cjs
# 上一版的独立回归仍可运行：
node --test tests/lab-core.test.cjs
```

没有前端依赖、构建步骤、外部脚本或参数上传。浏览器绘图不代表完整射频收发仿真。

## 修改与发布

从最新 `main` 建分支，按 `AGENTS.md` 修改、测试和提交 PR。GitHub Pages 从 `main` 根目录发布，`.nojekyll` 与既有部署方式不变。新的模型参数统一放在 `course-core.js`，更改后同步检查正文、坐标、数值读数与测试。

## 阅读与证据边界

原文检索截至 2026-10-08。讲义基于七篇综述相关模型/方法章节重新组织，并连接 2026 年预印本的理论、仿真、原型与系统问题；不宣称穷尽全部最新文献或复现所有公式/实验。标准版本、研究报告和可部署产品分开表述。

不提交凭据、第三方论文全文或未经许可的图表。本仓库与此前 Sites 版本独立维护。

## I/Q 与路径相位的可视化补课

第 3 章从“天线只能发实数”开始：两路系数 → 正交实载波相加 → 同一条 RF → 接收投影 → 复数记号。第 5 章把车辆位移、两段路径、波长、I/Q 旋转与快/慢时间连起来。没有替换原第 8 章的七步 OFDM。

新增模型/视图：`intuition-core.js`、`intuition.js`、`intuition.css`；数值测试 `tests/intuition.test.cjs`。完整验证和阅读出处见 `docs/IQ-PATH-VALIDATION.md`。

运行全部数值测试：

```sh
node --test tests/*.test.cjs
```

本轮结果：50 项通过（新增 21 + 原讲义 18 + 旧实验 11）。动画默认暂停，浏览器本地运行，不发送实验参数。

## 网络时钟与双基地几何案例

`network-clock.html` 把论文七问与一个独立标量时延实验连接起来：忽略偏差、已知偏差校正（oracle）、互易标量估计；展示总路径与位置误差的区别、单向不可辨识、共线镜像和互易失效。纯核心 `network-core.js`，原生控件/SVG `network.js` 与 `network.css`。不是 SCPD 或原始 OFDM 复现。

全部测试仍使用 `node --test tests/*.test.cjs`。本次 118 项通过；真实浏览器待复核项目及数值边界见 `docs/NETWORK-VALIDATION.md`。
