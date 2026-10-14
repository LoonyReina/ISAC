# OFDM H0 教学分支：来源与接入边界

固定原文：arXiv:2103.15694v1，MIMO-OFDM Joint Radar-Communications: Is ICI Friend or Foe?。继续沿用既有论文身份。[原专题](../ofdm-ici-receiver.html#false-alarm)与[教学视图](../labs/ofdm-ici/false-alarm/index.html)分别保留有目标接收链与纯噪声问题。

本分支真实运行 N64/M16/NR8/NT8/L12、OMP最多一次的冻结接收机。校准19–64次、留出1–64次；两批种子独立。使用相同 X/Y 对比 APES 与已知 X 的 FFT，严格 score > gamma。没有地图的成功采集仍在分母内，失败是未知结果；全部留出采集均展示。5%是校准目标，不保证实际风险；H0不能评价检测能力，未复现原图7–10。

## 来源与适配

源教学包 manifest SHA-256：8ba833108416383da424e883bd7a7873a60b95e71d69c97c25207af3f354f431。六个数值运行时与本站既有版本逐字节一致并共享。输入散列与四项生产路径适配见 [导入清单](../labs/ofdm-ici/false-alarm/SOURCE-IMPORT.json)。presentation.js 仅补齐 require 的 .js 扩展名，style.css 保持源字节。原始48.6 MB smoke不属于网页加载输入；完整运行证据仍在本机生成并支持JSON导出，不上传参数。

## 验收的范围

源版独立审阅通过10项展示、数据绑定与受控生命周期测试；源版原生浏览器验证默认19+12次、全部12点共同尺度、校准判决、八条摘要展开/清除、MDL无地图、31条完整导出与重置。未做最大128次采集原生内存压测，也未在原生浏览器强制失败符号。

这些是源版证据，不等于本站生产路径已通过原生浏览器验收。本站适配必须重新验证 Worker路径、默认计算、判决切换、输入失效、取消后立即重跑、下载、返回导航、桌面与窄屏及键盘。当前接入尚未部署，不宣称线上验证完成。

## 复核

从权威源码运行 node scripts/build-compatibility.cjs --test --reproducible，再运行 --check。顶层 ofdm-false-alarm-integration.test.cjs 调用18项源版测试及2项新增页面恢复测试和生产契约检查；真实Worker生成的临时证据写到隔离临时目录并清理，不覆盖源包。实际运行结果以本批验证报告为准，不将此说明当作已通过断言。

## 页面返回恢复修正

生产预览发现返回专题后再用浏览器返回时，BFCache 恢复了已释放的 Worker client，导致新校准失败。接入层现在在 pagehide 递增任务代号、把旧批标成历史并释放 client；pageshow 或再次提交时重建单个 client。旧任务迟到结果不能覆盖新批；数值内核和统计规则没有变化。该修正仍需生产浏览器复测。
