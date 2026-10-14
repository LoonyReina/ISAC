# 常模相似性教学分支

来源固定为 arXiv:1711.05220v1 §V Eq.(28)、Algorithm 2。入口为原 `waveform-design.html#constant-modulus`，教学视图为 `labs/waveform-design/cmc/index.html`。仍属于 optimal_waveform / case-waveform；不增加论文或机制数量。§III、§IV 原交互与求解代码保留。

## 科学范围

N=1–4、K=1–2、ε=0–2 的有界常模问题，实算 BRS/ARS、逐节点上下界及允许相位。圆弧凸包采用几何解释，不宣称逐字复现 Eq.(38)/(40)。下界来自独立 tangent/support 与浮点余量，不是近似松弛目标值；余量不是严格区间证书。预算不足仍为 unresolved。参考波形同功率。未复现原文 N16/K4、SQR-BS、完整原图或硬件效果。

## 来源与生产适配

`SOURCE-IMPORT.json` 保留导入散列与原页面六个核心段落的精确 SHA256。cmc-core、cmc-worker、phase-diagram 与已验收图版完全同字节。HTML 仅新增站内返回链接、更新原型状态文字；lesson 新增 BFCache pageshow 恢复，pagehide 清空过期结果后可重新运行。完整记录仍由导出按钮提供，不把全量账本渲染成巨大 DOM。

导入测试移入 tests/，相对 import 对应上移一级；测试输出必须指定外部临时目录 ISAC_TEST_OUTPUT。图版测试以原始冻结哈希验证 core/worker，新增运行中及完成后的 pagehide/pageshow、过期结果拒绝和再次运行断言。原科学断言不降低。

既有独立核心审阅含 183 个问题、2,319 个节点与 94,170 项断言；这是历史有限验收，不是生产浏览器验收，也不构成区间证明。接入数值与生命周期测试通过顶层 `tests/waveform-cmc-integration.test.cjs` 在兼容构建中运行。生产原生浏览器、响应式/键盘/下载与线上部署独立验收；未运行部分不算通过。

## 复核

- `node --test tests/compatibility-build.test.cjs`
- `node scripts/build-compatibility.cjs --test --reproducible`
- `node scripts/build-compatibility.cjs --check`

构建工具 Node24、Python3.12、NumPy2.3.5、SciPy1.17.0。浏览器页面为独立静态教学视图。无新增依赖、上传参数、外部脚本或第二套论文身份。
