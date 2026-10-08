# ISAC 推导实验室 / 入门图谱

通感一体（Integrated Sensing and Communications）的中文交互教程。

**在线阅读：https://loonyreina.github.io/ISAC/**

## 第一轮深化

首页改为“操作 → 预测 → 推导 → 回到综述”的五个实验：

1. 移动声源多普勒；单站与双站电磁频移的推导。
2. 匹配滤波、波形切换、错误模板与弱目标。
3. 已知 QPSK 符号消除、OFDM 相位矩阵与距离–多普勒变换。
4. CA-CFAR 训练/保护/待测滑窗、背景台阶、目标污染与纯噪声 Monte Carlo。
5. 均匀线阵的相位补偿、相干叠加与波束方向图。

原版历史、应用、带宽分辨率实验、方法地图、七篇综述书架和四周路线，完整保存在 `overview.html`。新版补充了综述章节定位、模型前提、收发设计接口与研究评价脉络。

## 文件结构

- `index.html`：交互教程首页。
- `learn.html`：与首页内容一致的明确入口；修改正文时同步维护。
- `learn.css`：响应式样式。
- `lab-core.js`：无依赖数值模型，可由浏览器与 Node 共用。
- `learn.js`：Canvas 绘图与交互控制。
- `overview.html`：保留的第一版完整页面。
- `tests/lab-core.test.cjs`：11 项核心模型测试。
- `docs/VALIDATION.md`：本轮已执行测试与边界。

## 本地预览与测试

无需安装前端依赖或构建：

```sh
python3 -m http.server 8000
```

打开 http://localhost:8000 。动画和数值全部在浏览器本地运行。

安装 Node.js 后运行模型测试：

```sh
node --test tests/lab-core.test.cjs
```

## 修改与发布

从最新 `main` 新建分支，按 `AGENTS.md` 修改并提交 PR。先核验数学、单位、滑块边界与桌面/手机交互，再合并。GitHub Pages 从 **main → / (root)** 自动发布；`.nojekyll` 保持静态文件发布。原有外链 `#history`、`#lab`、`#methods`、`#reading`、`#roadmap` 由新版转至原版对应章节。

本仓库的 GitHub Pages 与此前 Sites 版本独立维护，不自动同步。

## 资料与适用范围

文献来源、章节及简化条件随正文列出。图示与数值是独立实现的教学模型，不是论文实测结果、完整射频仿真或标准符合性认证。不提交访问令牌、凭据、第三方论文全文或未经许可的图表。
