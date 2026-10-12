# JavaScript 移植说明

日期：2026-10-11 UTC。此目录中的 reference.py、test_reference.py、generate_fixtures.py、README.zh-CN.md、fixtures.json 和 resource-ledger.json 是冻结独立参考的逐字拷贝；不含论文全文。README.zh-CN.md 描述的是原始独立参考及其当时的验收边界。本站移植的实际入口为根目录 multipath-channel-core.js，浏览器导出 window.MultipathChannelCore，同时支持 CommonJS require。

## 本地重跑

在仓库根目录运行：

    node --test tests/multipath-channel.test.cjs
    cd scripts/multipath-channel-reference
    python3 -B -m unittest -v test_reference.py

重新生成本目录的参考夹具：

    python3 -B generate_fixtures.py

重新生成不会修改 JavaScript 核心。不要为了匹配实现错误而更改参考夹具。JavaScript 检查只依赖 Node 标准库；Python 参考检查只依赖 Python 标准库。

## 数据合同

全部复杂数使用 [实部, 虚部]。SI 单位、固定整数频率网格、固定 QPSK、固定候选网格和无噪声假设不变。JavaScript 函数和对象字段使用 camelCase，例如 common_phase → commonPhase、direct_length → directLength、apparent_distance_m → apparentDistanceM、numeric_status → numericStatus。

- normalize(scene)：有限域场景，默认 h=4、b=1、rho=0.7、psi=0、commonPhase=0.37
- generateScene(scene)：返回 receiverInput 与 generatorOnly 两个分离对象
- receiverInput 仅有 Y、X、f、candidates
- receive(receiverInput)：返回 z、power、estimate、status
- estimate 为 null 或 {index, apparentDistanceM, power, exactTieCount}
- generatorOnly 包含 scene、geometry、coefficients、contributions，不是接收机输入
- simulate(scene)：返回 schema、config、receiverInput、receiver、generatorOnly、resources
- simulate 的 generatorOnly 另外含 componentResponses 和 diagnostics；两条 componentResponses 都由各自生成的实际复数子载波贡献通过 matchedSum 计算，不是手画曲线
- synthesizeTaps(lengths,coefficients,X)：返回 {Y,contributions}；仅为频域代数夹具，不保证几何或 CP 有效
- resourceLedger()：从固定样点和有限 Fourier 级数解析积分计算数字/连续 CP 能量，使用 camelCase 字段

JavaScript 对实际发生的双精度下溢额外提供显式防护：正的路径控制生成零复增益、非零路径贡献生成全零样点、或非零接收样点/响应的全部功率下溢为零时，抛出 RangeError，code 为 BINARY64_RANGE_LIMIT，消息以 Numerical range limit 开头。它不设置物理 epsilon 门槛，不把数值范围限制解释为无信号。b=rho=0 的真实零场景及相同时延系数精确相消的代数夹具仍可返回 no_response。

resourceLedger、固定网格、固定导频均冻结，不能通过调用方修改缓存。接收机未调用几何、通道增益、解析核、分量、Gram 或资源账本辅助函数。receive 的额外对象属性不会成为可观测量。

## 实际已运行检查

2026-10-11 本地执行：39 个 JavaScript 测试全部通过，29 个 Python 参考测试全部通过。

JavaScript 检查包括九个场景的完整 128 点 Y/分量与固定响应探针对拍、纯代数相同/别名时延、严格与近奇异状态、最小非零 binary64 分离的 logCondition、连续/数字 CP 能量、独立时域分数延迟合成再 DFT、固定资源、固定上界、直接 RF 载波相位检查、无响应与精确并列规则、输入拒绝（包含稀疏数组、继承索引、未知场景键、非有限派生增益以及极小导频能量）及替换生成器函数为抛错函数后的接收机隔离。

九个序列化场景对拍的实测最大绝对误差：

- 完整 Y：2.223507656709435e-15
- 固定探针复响应 z：2.47453482844677e-14
- 固定探针线性功率：3.1086244689504383e-15

这些结果是移植者执行的回归记录，不替代独立 JavaScript 审核、网页内容审核、全仓库回归、浏览器交互/可访问性/响应式验收或部署验证。

冻结哈希：

- reference.py SHA-256：b6f457769d20ee437f7ed0e8011e12b5948e2077df889024d3964649720bbc50
- multipath-channel-core.js SHA-256：414f00f2bcad736281881edd643308fa622887ccf4227aa2e227fe24119816a8

若核心发生任何改动，须重跑相关测试、更新哈希并重新核对独立审核的适用版本。
