# I/Q 与路径相位：本轮教学改进和验证

## 变更范围

针对读者“不能发送复数”“公式缺少直观对象”的反馈，只重点重写第 3、5 章，保留十八章路线、第 8 章七步 OFDM、旧版实验和全景页。新实现由当前 ChatGPT 工作流完成；未调用 Codex。

- 第 3 章从实数电压、两路系数、正交载波加法器、双路接收投影讲到复数记号；最后连接真实波形延迟与坐标旋转。
- 第 5 章用车辆位移、去回路径、波长尺、相位箭头和连续 I/Q 联动，再把毫秒观察间隔与微秒片段内部采样分开。
- 新增 `intuition-core.js` 纯数值模型、`intuition.js` 绘图与 `intuition.css`。仍复用 `course.js` 的统一播放/暂停、打印和输入分发，不增加外部运行依赖或网络上传。
- 文中明确：两路坐标不等于两种电磁场/极化；I/Q 分离可模拟或数字实现，并不强制两颗独立 ADC；复包络模平方与本文约定的实射频周期平均平方差系数 2。

## 数值验证：实际执行

`node --test tests/*.test.cjs`：50/50 通过，其中本轮新增 21 项；原讲义 18 项和旧实验 11 项也重新运行。

新增覆盖：Q-only 的真实负正弦、两个四分之一周期时刻的系数、笛卡尔/极坐标合成一致、零向量相位未定义、512 点数值正交投影恢复、有符号的本振相位旋转、参考偏差不改变发射波、实射频均方与复包络能量、QPSK 四点；默认位移/路径/相位/频移、半波长位移一整圈、远离/静止、路径与相位导数有限差分、与原 OFDM 慢时间相位一致、未知初相位消除、4 ms 混叠、半圈边界、快时间内积和参数合法性。

默认模型：c=3e8 m/s，fc=5 GHz，λ=60 mm，R0=37.5 m，接近 v=7.5 m/s。经过 0.5 ms，ΔR=-3.75 mm、ΔL=-7.50 mm、Δφ=+45°、fD=+250 Hz。接近 30 mm 时去回路径共少 60 mm，相位回到同一圈内方向。

## 浏览器验证：实际执行

Chromium + Playwright，1440×1000、768×1000、390×844，减少动态效果模式。环境阻止 file:// 导航，因此用完全相同的本地 HTML/CSS/JS 内联加载进行真实渲染与交互测试。这不是线上资源加载测试。

三个视口都验证：
- 初始动画暂停；QPSK 四个按钮正确更新；Q-only 的真实输出不为零但对准 I 支路均值为零；本振错开 45° 改变接收坐标但不改变发射波。
- 零向量标明相位未定义；不相关滑块改动不会把 I/Q 标签恢复为过长的小数。
- 载波与车辆动画真实前进，暂停后保持；接近、远离、停止、一圈预设和慢时间导入正确。
- 4 ms 一圈混叠展示与恢复、负速度、键盘方向键选择观察拍。
- 原 OFDM 七步每次只显一个面板；打印事件展开全部，结束后恢复先前步骤。
- 无 JavaScript pageerror，无页面级横向溢出。已查看桌面和手机的波形、复平面、车辆、相位、两把时间尺截图。

静态检查：仍有 18 个章节，无重复 id，无失效本页锚点。截图和本地测试驱动用于本轮验证，不作为网站运行依赖。

## 模型边界

正交投影实验先固定一个符号，数值平均两个整数载波周期；不把这个平均器说成任意数据流的完整滤波器。真实通信仍需脉冲成形、定时、载波同步及均衡。

车辆实验是相干、低速、窄带、固定反射系数模型；大场景连接图不按毫米比例，毫米尺才按标注刻度。累计圈数来自已知运动真值，不声称单个复数已消除整圈歧义。快时间演示是延迟对齐的无噪声 16 点复探针内积，不是完整时域 OFDM/RF 接收机；图画实部但内积使用完整 I/Q。

未声称真实设备验证、全部十八章公式逐一动画化、全浏览器或全量无障碍审计。合并后的 Pages 结果另在 PR 记录。

## 原文核对

- [Q1] Analog Devices，Design Note 1027，Theory of Operation of IQ Demodulation：实 RF = Icos−Qsin 与正交解调。https://www.analog.com/en/resources/design-notes/2023/11/21/07/11/optimizing-performance-wideband-direct-conversion-receivers.html
- [Q2] TU München LNTwww，Quadrature Amplitude Modulation：两路系数、正交载波、复低通等效、功率系数和 QAM 映射。https://en.lntwww.lnt.ei.tum.de/Modulation_Methods/Quadrature_Amplitude_Modulation
- [Q3] Analog Devices，Single-Supply IF-Strip Digitizes QAM Signals：模拟解调加 ADC 与先数字化中频再解调的不同架构。https://www.analog.com/en/resources/analog-dialogue/articles/if-strip-digitizes-qam-signals.html
- [D1] TI，Sandeep Rao，Introduction to mmWave Sensing: FMCW Radars，Module 2/3 的位移相位、逐拍测速与混叠；核对讲义 PDF 第 25、28、37 页的图。https://www.ti.com/video/5415528988001

TI 的混频/频移符号约定与本站可能不同，本站统一接近为正；仅借用相干路径相位原理，不把 FMCW 的中频测距公式直接套给 OFDM。所有新图均独立实现，没有复制第三方论文全文或图表。
