# 近场多目标完整单点教学层

固定身份：`nearfield-multitarget-correlation`，`arxiv:2506.07052v1`。实现版本：`nearfield-multitarget-lesson-v1`。

## 已实现的链路

- 显式按钮调用精确获审v2 module Worker，顺序重做proposed/NCCS两个实际优化。连续非fixture参数、源10×10参数、预算/部分失败/退化/解析上界失败预设只填参，不查表或自动运行
- 精确逐阵元通道、完整物理/内部协方差、实际Eq.18波束与残余、所有目标与目标对/用户/功率读数、浮点对偶证书；失败模式仍可导出
- 独立派生Worker从当前实际矩阵计算两模式共色标照射切片、恢复不变量、可选经验协方差与数值秩；图有数字行与任意行列检视。切片外目标不标成平面内目标
- 可选保存完整X/N。等价Gaussian协方差样本不是逐通信流合成；期望与有限块功率、W·symbol能量分开。保留严格Eq.12零回波和Eq.19秩≤5导致普通逆未定义，不加载Capon、不伪造位置估计
- 严格完整科学JSON、失败/部分失败记录、≤64MiB历史导入（另有限维/嵌套/数组/字符串/节点预算）、12000字符预览、保存数值独立自洽检查和历史设置新求解。自洽不认证来源，也不是重新优化
- session同时管理generation、fileEpoch、viewGeneration；编辑/预设/重置/取消/隐藏/pagehide/Back终止Worker，晚到结果不能回填。Worker构造/post/error/messageerror终止pending并允许重试

## 文件与冻结边界

`../runtime/`的六个可执行模块、原README/PROTOCOL/MANIFEST逐字节来自已接受v2包。原MANIFEST是完整审查包的来源清单，不声称本目录包含其大型fixture或审查生成器。此页启动和运行不导入任何fixture。`FINAL-BINDING.json`是独立审查的精确绑定，和原包MANIFEST均保留原文，不能改写原审查阶段字段冒充网页验收。

教学文件通过`LESSON-FREEZE.json`的逐文件SHA-256冻结，公开路径候选由`PUBLIC-ASSETS.json`显式列出。source PDF/全文没有加入发布树。论文来源/数学修正/接收局限也完整写在页面和每份JSON中。

## 运行针对性验证

在权威源码根运行（本专题测试没有旧布局依赖）：

```sh
node --test labs/nearfield-multitarget/lesson/tests/*.test.mjs
```

`mounted.test.mjs`用第一方轻量DOM事件/Canvas调用桩与真正Node module Worker执行生产页面入口。它点击真实下载按钮，读取其Blob，交给独立NumPy全物理空间oracle验证，再覆盖历史导入、检查、新求解、取消/重复/导航。这是DOM/Worker契约验证，不是布局引擎、真实浏览器、屏幕阅读器或线上网络认证。

`codec.test.mjs`包括默认T1000和原文优化参数side10/T1024的实际采样、完整记录往返、自洽复算；最大测试记录约22.17MB。64MiB文件预算并非总内存保证：编码、解析、结构化克隆、图形投影与历史都会同时占用空间。页面只保留最多3份历史，并按文本约48MiB预算淘汰较旧项（单份可单独保留）。刷新不持久保存。

`record-oracle.py`可直接核对生产下载文件：

```sh
python3 labs/nearfield-multitarget/lesson/tests/record-oracle.py downloaded.json
```

JS历史检查器使用独立复算代码，无solver/certificate依赖，不运行新的优化；NumPy检查器独立重建物理通道、协方差/PSD、Eq.18、SINR/g/c/功率、全空间对偶界和实际样本。所有检查都不认证历史来源。

## 尚须由接入/浏览器/发布负责人完成

本冻结是完整隔离教学实现，不是假称全站或线上完成。仍需注册同一论文的六层路线、精确兼容映射与模块依赖闭包、旧身份保持回归、全站可复现构建，再对确切构建/提交运行受支持真实桌面浏览器测试和授权发布验证。

实际浏览器必须分别测量Worker启动、两模式求解+证书+采样、矩阵/切片、T1000完整编码、取消恢复、下载/导入，以及source10×10和失败病例；Node耗时不能转述为网页延迟保证。无CLI/headless浏览器启动用于本冻结。

自动小扫描、逐流发射、正则化接收空间谱、定位/检测评价都未实现，不显示相关假按钮或完成声明。旧论文、先修、模型和既有站点文件未改动。
