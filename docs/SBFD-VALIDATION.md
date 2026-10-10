# SBFD resource case validation

Date: 2026-10-10. Base: main `0ea02492b12bc7ba20b13074487d8a7ba8cc7d3c` (includes network contrast fix). No browser, publishing or deployment performed by this implementation worker.

## Added

- `sbfd-resource.html`: Chinese seven-question paper case, concise measured-evidence panel, independent model derivation, exact resource ledger, three linked SVGs, two native range controls, numeric alternatives and limits
- `sbfd-core.js`: pure finite coherent-sum/Dirichlet model; `sbfd.js`/`sbfd.css`: dependency-free accessible text, controls and responsive SVGs
- `tests/sbfd.test.cjs`: 18 numerical tests; `tests/sbfd-ui.test.cjs`: 6 dependency-free DOM tests
- Minimal entry links in index/theory and source/teaching mapping in READING-MAP
- Requested small network view-only adjustment: opaque heatmap legend moved above plot (y=0, h=22; baseline 17; plot top=24), preserving candidate labels/halos and numerical model

## Actually executed

- Numerical tests exhaust all 753 valid K values and 2,305 valid M values: exact counts, disjoint complete allocation, default published index ranges, resource trade-off, first nulls, aperture scaling, normalized zero response, periodic singularities, finite plots, independent complex-sum agreement and invalid-input rejection
- DOM tests check initial/changed outputs, exact rows, both control extremes, M doubling, K-invariant velocity curve, M-invariant allocation/range curve, repeated reset, resize, accessible names/captions/values, no-script content and local links/resources
- SVG DOM widths: 240, 270, 323, 388, 720 and 950 pixels; every extreme combination K={128,598,880}, M={128,1216,2432} finite. These are DOM attribute tests, not a browser layout engine
- Network legend regression checks opaque background ends above plot top, narrow-width containment and contrasting candidate text halos
- Aggregate command: `node --test tests/*.test.cjs` (final result recorded below)

## Scientific checks and limitations

Default: 598+598+598+254=2048; active ranges 65–662, 726–1323, 1387–1984; KΔf=5.83984375 MHz; δR=25.66784925 m; CPI=0.155648 s; δv≈0.1416244545 m/s. Full-grid reference is hypothetical, not paper multiband waveform. Width KΔf and outer-center span (K−1)Δf are separately labeled. K=880 leaves only 34 communication bins. M=128 puts the velocity first null outside the ±1 m/s plot; this is explicitly stated.

No energy/impairment model, self-interference suppression, hardware RMSE curve, BER/SNR curve or throughput result is fabricated. The paper's author-reported 0.145 m/s remains separately labeled. Communication endpoint and per-mode run counts remain unresolved. Source facts were taken from the full research handoff; no hardware reproduction or independent proof of paper results.

## Parent real-browser QA checkpoints (not yet performed here)

1. Desktop, tablet, 390px phone and narrow 323px chart: no horizontal page overflow; Chinese labels/captions and native sliders readable; table region scrolls if needed
2. Keyboard Tab/arrow/Home/End on K and M; focus outline visible; outputs and polite status reflect values; repeated reset restores defaults
3. Compare all three plots while changing K only, then M only; zero guides and first-null captions consistent; resource rectangles align and global nulls remain 254
4. Screen-reader name/description and details/table alternatives readable; SVG title/desc survives redraw
5. At M=128 the velocity caption explains outside-domain first null; at K=880 the communication strip and table both show 34
6. Existing network heatmap: legend at top margin, y-axis label still readable, candidate labels in plot unobscured; test a top-left candidate and narrow viewport
7. Existing pages, cross-page anchors, Back/Forward and no-JS content preserved; browser console/network checks and screenshots are still pending
8. Parent must verify exact published commit and Pages deployment separately if publishing

## Final automated result

2026-10-10: `node --test tests/*.test.cjs` passed **143/143**, with zero failed/skipped tests and no package installation or NODE_PATH required. `node --check sbfd-core.js`, `node --check sbfd.js`, and `git diff --check` passed. Baseline 119 tests remain passing, plus 24 SBFD tests. No browser claim is implied.

## 2026-10-10 · 合并后部署与真实浏览器复核（父任务执行）

本节为父任务提供的已执行结果，与上面的本地测试分开记录。

- PR #12 合并到 `main` 的提交为 `85a49587aae76594dbe9b065398a072abc10622c`；GitHub Pages 运行 `38043506764` 成功。线上七个资源（`sbfd-resource.html`、`sbfd-core.js`、`sbfd.js`、`sbfd.css`、`network.js`、`index.html`、`theory.html`）与该提交逐字节一致。
- 实际云端 Chrome 在 323 / 388 / 1166 CSS px 下检查（窗口缩放，不是设备模拟器）：整页无水平溢出，三张图均可读。原生 K/M 控件的 Home、End、ArrowRight、可见焦点、重复恢复默认、数字披露区均已检查。
- K=128 时 Kc=1538、距离首零点 119.9169832 m，速度值保持 0.141624454 m/s；K=880 时 Kc=34。M=2432 时速度值 0.070812227 m/s；M=128 时首零点 1.345432317 m/s，位于 ±1 m/s 图域之外，说明文字正确。
- 网络案例回归：388 CSS px，目标 (−90,90) m；图例底板 y=0、h=22，位于绘图区 T=24 上方。角落标签可见且无重叠。
- 通过 Enter 激活 SBFD → 时钟案例链接并返回，导航正常。捕获日志只有扩展元数据错误，未见站点来源错误。
- 未执行完整屏幕阅读器审计或跨浏览器矩阵；以上结果不代表这些范围通过。
