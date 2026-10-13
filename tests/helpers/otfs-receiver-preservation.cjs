'use strict';
// Exact inverse of the reviewed OTFS registration and evidence edits. No wildcard
// exclusions, mutable snapshots, skipped fields or replacement historical hashes.
const a=require('node:assert/strict');
const changes={
  "registry": [
    {
      "path": [
        "cases"
      ],
      "append": [
        {
          "id": "case-otfs-receiver",
          "title": "OTFS：已知符号估路径，未知符号怎样恢复？",
          "fields": {
            "先修": "<a href=\"foundations.html#ofdm\">七步 OFDM：调制与感知变换</a>；<a href=\"theory.html#estimator-crb\">估计误差与下界</a>；<a href=\"offgrid-range.html#experiment\">网格和真实参数</a>",
            "问题": "两端都拿到复数样本，为什么一个估路径，另一个猜消息？",
            "交互机制": "感知端把已知 x 和实际 y 交给 P=1 有限网格搜索，现场拟合复增益并保存候选分数；通信端对同一份 y、H、噪声方差运行 MP-G 和完整 LMMSE，回看真实边消息与软后验。真值只作事后评估。",
            "证据类型": "<a href=\"https://arxiv.org/pdf/1910.01896v1\">固定 arXiv:1910.01896v1</a>的理论与仿真；本站有独立 Python/高精度和 Node Worker 核验的有界算法。实际浏览器、完整原图和整篇复现仍开放。",
            "结论边界": "两个独立缩减实验、不同观测；感知仅 P=1 声明有限网格，没有连续细化、FIM/局部CRB或多径感知。通信只在给定完美CSI的式(14)声明算子上运行 MP-G 与完整 LMMSE；不含 MP-Psi、编码或原尺寸曲线。有限矩形算子与打印式(14)的物理跨模型对应仍未证明，不能将差异直接归因于物理模型失配。真实浏览器、下载和延迟门待验收，非完整论文复现。",
            "下一研究问题": "在核对保护间隔、采样约定、能量与资源后，如何扩展连续参数、多径感知及原尺寸检测，并独立验证物理模型之间的对应？"
          },
          "unit": "otfs-receiver",
          "paper": "otfs-receiver.html#paper",
          "next": "otfs-receiver.html#limits",
          "learningEntry": "otfs-receiver.html#intuition",
          "paperComparison": {
            "comparisonStatus": "partial",
            "sourceTitle": "On the Effectiveness of OTFS for Joint Radar and Communication",
            "sourceUrl": "https://arxiv.org/pdf/1910.01896v1",
            "version": "arXiv:1910.01896v1，2019-10-04，30页预印本；本卡按该 PDF 编号。后续 TWC 2020 期刊题名增加 Parameter Estimation，勿混用版本页码。",
            "paperEvidenceType": "理论推导与数值仿真",
            "siteArtifactType": "两个独立缩减实验中的真实有限网格感知与 MP-G/完整 LMMSE；独立数值和 Node 验证，浏览器待验收，非完整论文",
            "metrics": [
              "每个有限网格候选的复增益、归一化匹配分数和复残差",
              "声明网格内最大值、实际候选数与停止状态；无连续全局证书",
              "同一通信观测下的软后验、硬判决、真实迭代变化及事后 BER",
              "完整 LMMSE 估计与有效AWGN软转换；不是原文低复杂度LMMSE26",
              "实际输入、预算、运行历史；Node时间不等于浏览器延迟"
            ],
            "unknowns": [
              "两个独立缩减实验、不同观测；感知仅 P=1 声明有限网格，没有连续细化、FIM/局部CRB或多径感知。通信只在给定完美CSI的式(14)声明算子上运行 MP-G 与完整 LMMSE；不含 MP-Psi、编码或原尺寸曲线。有限矩形算子与打印式(14)的物理跨模型对应仍未证明，不能将差异直接归因于物理模型失配。真实浏览器、下载和延迟门待验收，非完整论文复现。",
              "循环前史、右端点求积、负载波、移位DD原点与有效hprime为明确数值约定，不冒充已证明的全物理等价"
            ],
            "comparisonLink": "otfs-receiver.html#paper",
            "sourceId": "case-otfs-receiver-paper",
            "locator": {
              "summary": "v1 §II–III 式(12)–(16)；§IV-A/B 式(17)–(25)；§V-A MP-G 因子图与 §VI 图4、6–7。本站仅声明缩减算子和算法范围",
              "section": "§II–V",
              "figure": "图4、6–7：未复现完整曲线",
              "equation": "式(12)–(25)及 §V-A MP-G"
            },
            "retainedAssumptions": [
              "已知发射数据的感知端与未知通信数据的接收端分开",
              "复数观测与 v=E|w|²，似然 exp(−||y−Hx||²/v)",
              "感知 P=1、未知复增益；通信给定完美CSI，信道获取另计",
              "通信第一课 edgeTolerance=0，不剪除 Gram 边；两检测器共享相同输入"
            ],
            "omittedMechanisms": [
              "连续細化、模型专属导数/FIM、局部CRB与多径感知",
              "原尺寸、原图Monte Carlo、OFDM/FMCW同资源雷达比较、MP-Psi与低复杂度LMMSE26",
              "物理跨算子等价、真实硬件和浏览器性能认证"
            ],
            "resourceBudget": {
              "summary": "感知与通信是两个独立缩减预算，不共享接收观测。感知核 N≤4、M≤8、D≤32、每轴≤129、最多16641候选；通信核 N≤3、M≤4、D≤12、QPSK/16QAM、最多100次迭代；第一课推荐30次、damping=1、零Gram剪枝。具体页面更小预算和实际输入随记录导出。",
              "bandwidth": null,
              "energy": null,
              "duration": null,
              "aperture": null,
              "priorKnowledge": "感知已知x/P=1；通信已知H与噪声方差，未知符号",
              "other": [
                "离线存档只供下载，不是启动依赖",
                "T/fc和q/a单位约定随输入记录，感知与通信各自计算资源账本"
              ]
            },
            "verificationNote": "源文件与算法冻结摘要、数值审查和公开映射见 docs/OTFS-RECEIVER-SOURCE-EVIDENCE.md；不发布论文PDF或私有提取文本"
          }
        }
      ],
      "lengthBefore": 15
    },
    {
      "path": [
        "units"
      ],
      "append": [
        {
          "id": "otfs-receiver",
          "title": "OTFS：已知符号估路径，未知符号怎样恢复？",
          "href": "otfs-receiver.html#experiment",
          "question": "两端都拿到复数样本，为什么一个估路径，另一个猜消息？",
          "prerequisites": [
            "foundations.html#ofdm",
            "theory.html#estimator-crb",
            "offgrid-range.html#experiment"
          ],
          "group": "research",
          "primaryDirectionId": "waveforms",
          "action": "先分清两个独立缩减实验的已知量，再实际搜索单路径有限网格，或在同一通信观测上运行零剪枝 MP-G 与完整 LMMSE，回看真实候选和迭代。"
        }
      ],
      "lengthBefore": 30
    },
    {
      "path": [
        "pages"
      ],
      "append": [
        {
          "path": "otfs-receiver.html",
          "title": "OTFS：已知符号估路径，未知符号怎样恢复？",
          "stage": "experiments",
          "role": "有界论文算法 · 单路径有限网格感知与完美CSI的MP-G/完整LMMSE通信",
          "prerequisites": [
            "foundations.html#ofdm",
            "theory.html#estimator-crb",
            "offgrid-range.html#experiment"
          ],
          "next": "reading.html#guide-otfs-joint-estimation-2020",
          "nextLabel": "回到固定 v1：哪些算法已实现，哪些原图和物理对应仍开放？"
        }
      ],
      "lengthBefore": 26
    },
    {
      "path": [
        "directions",
        0,
        "scope"
      ],
      "before": "发射信号、调制坐标、导频歧义、训练序列复用、严格协方差与等能量加权波形优化；新增 OTFS 原文导读；完整 OTFS 收发机实验仍待实现。",
      "after": "发射信号、调制坐标、导频歧义、训练序列复用、严格协方差与等能量加权波形优化；OTFS 已有有界单路径有限网格感知与 MP-G/完整 LMMSE；完整 OTFS 收发机实验仍待实现。"
    },
    {
      "path": [
        "directions",
        0,
        "primaryCaseIds"
      ],
      "append": [
        "case-otfs-receiver"
      ],
      "lengthBefore": 3
    },
    {
      "path": [
        "directions",
        0,
        "levels",
        0,
        "items"
      ],
      "append": [
        {
          "label": "已知符号与未知符号：两个接收任务",
          "href": "otfs-receiver.html#intuition",
          "kind": "lesson",
          "scope": "direction-specific",
          "status": "available",
          "note": "实际运行两个独立缩减实验；数值与Node核验不代表完整原图、物理跨模型等价或浏览器验收。"
        }
      ],
      "lengthBefore": 3
    },
    {
      "path": [
        "directions",
        0,
        "levels",
        1,
        "items"
      ],
      "append": [
        {
          "label": "DD/TF与复观测：明确算子约定和已知量",
          "href": "otfs-receiver.html#model",
          "kind": "model",
          "scope": "direction-specific",
          "status": "available",
          "note": "实际运行两个独立缩减实验；数值与Node核验不代表完整原图、物理跨模型等价或浏览器验收。"
        }
      ],
      "lengthBefore": 5
    },
    {
      "path": [
        "directions",
        0,
        "levels",
        2,
        "items"
      ],
      "append": [
        {
          "label": "实际有限网格感知与零剪枝MP-G/完整LMMSE",
          "href": "otfs-receiver.html#experiment",
          "kind": "interactive",
          "scope": "direction-specific",
          "status": "available",
          "note": "实际运行两个独立缩减实验；数值与Node核验不代表完整原图、物理跨模型等价或浏览器验收。"
        }
      ],
      "lengthBefore": 4
    },
    {
      "path": [
        "directions",
        0,
        "levels",
        3,
        "items"
      ],
      "append": [
        {
          "label": "固定v1：算子、估计器和因子图逐项对照",
          "href": "otfs-receiver.html#paper",
          "kind": "paper-guide",
          "scope": "direction-specific",
          "status": "available",
          "note": "实际运行两个独立缩减实验；数值与Node核验不代表完整原图、物理跨模型等价或浏览器验收。"
        }
      ],
      "lengthBefore": 6
    },
    {
      "path": [
        "directions",
        0,
        "levels",
        4,
        "items"
      ],
      "append": [
        {
          "label": "有限网格、物理对应和完整原图的边界",
          "href": "otfs-receiver.html#limits",
          "kind": "limits",
          "scope": "direction-specific",
          "status": "available",
          "note": "实际运行两个独立缩减实验；数值与Node核验不代表完整原图、物理跨模型等价或浏览器验收。"
        }
      ],
      "lengthBefore": 3
    },
    {
      "path": [
        "directions",
        0,
        "levels",
        5,
        "items"
      ],
      "append": [
        {
          "label": "保存真实输入与历史，下载独立数值证据",
          "href": "otfs-receiver.html#reproduce",
          "kind": "reproduction-plan",
          "scope": "direction-specific",
          "status": "available",
          "note": "实际运行两个独立缩减实验；数值与Node核验不代表完整原图、物理跨模型等价或浏览器验收。"
        }
      ],
      "lengthBefore": 4
    }
  ],
  "guides": [
    {
      "path": [
        "cards",
        0,
        "evidence",
        "kind"
      ],
      "before": "理论推导＋数值仿真；本站仅导读，未新增实验",
      "after": "理论推导＋原文数值仿真；本站有界真实算法及独立数值/Node核验，浏览器与原图仍开放"
    },
    {
      "path": [
        "cards",
        0,
        "limits"
      ],
      "append": [
        "两个独立缩减实验、不同观测；感知仅 P=1 声明有限网格，没有连续细化、FIM/局部CRB或多径感知。通信只在给定完美CSI的式(14)声明算子上运行 MP-G 与完整 LMMSE；不含 MP-Psi、编码或原尺寸曲线。有限矩形算子与打印式(14)的物理跨模型对应仍未证明，不能将差异直接归因于物理模型失配。真实浏览器、下载和延迟门待验收，非完整论文复现。"
      ],
      "lengthBefore": 3
    },
    {
      "path": [
        "cards",
        0,
        "visualTrace",
        "steps",
        3,
        "explanation"
      ],
      "before": "图4的参数误差与式(52)–(53)的速率回答不同问题；保护间隔开销和接收复杂度也要核对。本站没有运行本文接收机。",
      "after": "图4的参数误差与式(52)–(53)的速率回答不同问题；保护间隔开销和接收复杂度也要核对。本站已运行两个独立缩减接收实验：有限网格单路径感知与完美CSI通信检测；未复现上述完整原图。"
    },
    {
      "path": [
        "cards",
        0,
        "executable"
      ],
      "added": true,
      "after": {
        "kind": "validated-paper-algorithm",
        "coverage": "algorithm",
        "href": "otfs-receiver.html#experiment",
        "label": "实际运行：单路径网格感知与MP-G通信",
        "summary": "感知从已知x和实际y穷举声明有限网格并拟合复增益；通信对同一观测运行零Gram剪枝MP-G与完整LMMSE，保存真实迭代和软后验。两块是独立缩减实验，不是同一接收观测。",
        "limitations": "两个独立缩减实验、不同观测；感知仅 P=1 声明有限网格，没有连续细化、FIM/局部CRB或多径感知。通信只在给定完美CSI的式(14)声明算子上运行 MP-G 与完整 LMMSE；不含 MP-Psi、编码或原尺寸曲线。有限矩形算子与打印式(14)的物理跨模型对应仍未证明，不能将差异直接归因于物理模型失配。真实浏览器、下载和延迟门待验收，非完整论文复现。 原Python冻结不变；JS完整LMMSE修正绝对方差下限和软分数稳定性，差异有高精度审查。",
        "sourceLocators": [
          "v1 §III，式(12)–(16)：矩形脉冲与输入输出",
          "v1 §IV-A/B，式(17)–(25)：未知复增益与参数估计；本页仅有限网格",
          "v1 §V-A：Gram因子图MP-G；本页完整LMMSE为明确基线",
          "v1 §VI-B/C，图4、6–7和式(52)–(53)：原尺寸/统计/速率仍开放"
        ]
      }
    },
    {
      "path": [
        "cards",
        0,
        "notebookTopicId"
      ],
      "added": true,
      "after": "otfs-receiver"
    }
  ]
};
function reverse(data,entries){const prior=structuredClone(data);for(const ch of [...entries].reverse()){let p=prior;for(const k of ch.path.slice(0,-1))p=p[k];const k=ch.path.at(-1);if(ch.append){a.ok(p[k].length>=ch.lengthBefore+ch.append.length,'reviewed OTFS record positions present');a.deepEqual(p[k].slice(ch.lengthBefore,ch.lengthBefore+ch.append.length),ch.append,'exact appended OTFS records');for(const x of ch.append){const key=x&&typeof x==='object'?['id','path','href'].find(k=>Object.hasOwn(x,k)):null;if(key)a.equal(p[k].filter(v=>v&&v[key]===x[key]).length,1,'one reviewed OTFS identity');}p[k].splice(ch.lengthBefore,ch.append.length);}else{a.ok(Object.hasOwn(p,k),'OTFS reviewed field present');a.deepEqual(p[k],ch.after,'exact OTFS field '+ch.path.join('.'));if(ch.added)delete p[k];else p[k]=structuredClone(ch.before);}}return prior;}
const withoutOtfsRegistry=r=>reverse(r,changes.registry),withoutOtfsGuides=g=>{const indices=g.cards.flatMap((c,i)=>c.id==='otfs-joint-estimation-2020'?[i]:[]);if(!indices.length)return structuredClone(g);a.equal(indices.length,1,'one original OTFS guide');return reverse(g,changes.guides.map(ch=>({...ch,path:['cards',indices[0],...ch.path.slice(2)]})));};
function withoutOtfsHomeShell(html,count){const current=`<strong>${count}</strong> 个机制实验`,prior=`<strong>${count-1}</strong> 个机制实验`;a.equal(html.split(current).length,2,'one current OTFS lesson count');return html.replace(current,prior);}
const readingMapSuffix="\n## OTFS bounded receiver extension (2026-10-12)\n\n[On the Effectiveness of OTFS for Joint Radar and Communication, arXiv:1910.01896v1](https://arxiv.org/pdf/1910.01896v1), §III equations (12)–(16), §IV single-path likelihood/grid estimation and §V-A Gram MP-G. [The canonical receiver lesson](../otfs-receiver.html#intuition) executes two independent reduced experiments. [Source/evidence boundaries](OTFS-RECEIVER-SOURCE-EVIDENCE.md) distinguish finite-grid sensing, corrected full-LMMSE port, unchanged Python reference, zero Gram pruning, and pending browser/full-paper/physical-correspondence gates. The existing reading guide ID is retained.\n";
function withoutOtfsReadingMap(source){a.ok(source.endsWith(readingMapSuffix),'exact appended OTFS source map');a.equal(source.split(readingMapSuffix).length,2,'one OTFS source map addition');return source.slice(0,-readingMapSuffix.length);}
module.exports={changes,withoutOtfsRegistry,withoutOtfsGuides,withoutOtfsHomeShell,withoutOtfsReadingMap};
