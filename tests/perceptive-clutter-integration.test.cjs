const {withoutGCSAGERegistry}=require('./helpers/gc-sage-preservation.cjs');
'use strict';
// Registry, evidence preservation and static navigation only; no browser, RF or complete-paper certification.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const r=JSON.parse(read('site/registry.json')),data=JSON.parse(read(r.researchDirectoryFile));
const c=r.cases.find(c=>c.id==='case-perceptive-clutter'),u=r.units.find(u=>u.id==='perceptive-clutter'),p=r.pages.find(p=>p.path==='perceptive-clutter.html');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function resolve(href){const [file,anchor]=href.split('#');a.ok(fs.existsSync(path.join(root,file)),href);if(anchor)a.ok(read(file).includes('id="'+anchor+'"'),href);}
function article(html,id){const m=html.match(new RegExp('<article[^>]* id="'+id+'"[^>]*>[\\s\\S]*?<\\/article>'));a.ok(m,id);return m[0];}
// Exact 2026-10-10 snapshot objects taken before this lesson. Do not refresh influence data as part of mechanism integration.
const expectedEvidence=[
  {
    "id": "optimal_waveform",
    "metrics": {
      "snapshotDate": "2026-10-10",
      "openAlex": {
        "count": 980,
        "source": "https://api.openalex.org/works/https://doi.org/10.1109/TSP.2018.2847648",
        "retrievedAt": "2026-10-10T13:59:59.223032+00:00",
        "recordUpdatedAt": "2026-10-09T09:14:12.587421",
        "comparable": true
      },
      "semanticScholar": {
        "count": 972,
        "source": "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1109/tsp.2018.2847648?fields=title,year,citationCount,influentialCitationCount,url,externalIds",
        "recordUrl": "https://www.semanticscholar.org/paper/abaf9a91f636542a230d32dec71206bfeba703e1",
        "retrievedAt": "2026-10-10T14:00:47.020912+00:00"
      },
      "completedYear": {
        "year": 2025,
        "count": 206,
        "sourceService": "OpenAlex",
        "definition": "发表年份为2025年的施引文献数；不是2025年新增入库引用量，也不是实时增长率。",
        "comparable": true
      }
    },
    "endorsements": [
      {
        "kind": "学会编辑阅读推荐",
        "text": "入选IEEE ComSoc ISAC Best Readings（2022年2月）",
        "url": "https://www.comsoc.org/publications/best-readings/integrated-sensing-and-communication-isac"
      },
      {
        "kind": "学术奖项",
        "text": "2021 IEEE SPS青年作者最佳论文奖（2022年颁发）",
        "url": "https://signalprocessingsociety.org/community-involvement/award-recipients"
      }
    ],
    "socialDiscussion": {
      "status": "unavailable",
      "text": "未取得可靠的社交讨论量；不以引用、奖项或下载量替代。"
    }
  },
  {
    "id": "joint_beamforming",
    "metrics": {
      "snapshotDate": "2026-10-10",
      "openAlex": {
        "count": 994,
        "source": "https://api.openalex.org/works/https://doi.org/10.1109/TSP.2020.3004739",
        "retrievedAt": "2026-10-10T13:59:59.127077+00:00",
        "recordUpdatedAt": "2026-10-09T09:14:12.587421",
        "comparable": true
      },
      "semanticScholar": {
        "count": 1008,
        "source": "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1109/tsp.2020.3004739?fields=title,year,citationCount,influentialCitationCount,url,externalIds",
        "recordUrl": "https://www.semanticscholar.org/paper/821e4c255f237f8b881dfdb5f1bf7cc4ee26dae2",
        "retrievedAt": "2026-10-10T14:00:51.667520+00:00"
      },
      "completedYear": {
        "year": 2025,
        "count": 270,
        "sourceService": "OpenAlex",
        "definition": "发表年份为2025年的施引文献数；不是2025年新增入库引用量，也不是实时增长率。",
        "comparable": true
      }
    },
    "endorsements": [
      {
        "kind": "学会编辑阅读推荐",
        "text": "入选IEEE ComSoc ISAC Best Readings（2022年2月）",
        "url": "https://www.comsoc.org/publications/best-readings/integrated-sensing-and-communication-isac"
      },
      {
        "kind": "学术奖项",
        "text": "2024 IEEE SPS青年作者最佳论文奖（2025年颁发）",
        "url": "https://signalprocessingsociety.org/community-involvement/award-recipients"
      }
    ],
    "socialDiscussion": {
      "status": "unavailable",
      "text": "未取得可靠的社交讨论量；不以引用、奖项或下载量替代。"
    }
  },
  {
    "id": "mu_mimo",
    "metrics": {
      "snapshotDate": "2026-10-10",
      "openAlex": {
        "count": 963,
        "source": "https://api.openalex.org/works/https://doi.org/10.1109/TWC.2018.2803045",
        "retrievedAt": "2026-10-10T13:59:59.283870+00:00",
        "recordUpdatedAt": "2026-10-09T09:14:12.587421",
        "comparable": true
      },
      "semanticScholar": {
        "count": 936,
        "source": "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1109/twc.2018.2803045?fields=title,year,citationCount,influentialCitationCount,url,externalIds",
        "recordUrl": "https://www.semanticscholar.org/paper/520fe5dfff2add7370ddf78f2584947c6c69d241",
        "retrievedAt": "2026-10-10T14:00:40.861823+00:00"
      },
      "completedYear": {
        "year": 2025,
        "count": 200,
        "sourceService": "OpenAlex",
        "definition": "发表年份为2025年的施引文献数；不是2025年新增入库引用量，也不是实时增长率。",
        "comparable": true
      }
    },
    "endorsements": [
      {
        "kind": "学会编辑阅读推荐",
        "text": "入选IEEE ComSoc ISAC Best Readings（2022年2月）",
        "url": "https://www.comsoc.org/publications/best-readings/integrated-sensing-and-communication-isac"
      }
    ],
    "socialDiscussion": {
      "status": "unavailable",
      "text": "未取得可靠的社交讨论量；不以引用、奖项或下载量替代。"
    }
  },
  {
    "id": "crb",
    "metrics": {
      "snapshotDate": "2026-10-10",
      "openAlex": {
        "count": 773,
        "source": "https://api.openalex.org/works/https://doi.org/10.1109/TSP.2021.3135692",
        "retrievedAt": "2026-10-10T14:00:05.530805+00:00",
        "recordUpdatedAt": "2026-10-09T09:14:12.587421",
        "comparable": true
      },
      "semanticScholar": {
        "count": 855,
        "source": "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1109/tsp.2021.3135692?fields=title,year,citationCount,influentialCitationCount,url,externalIds",
        "recordUrl": "https://www.semanticscholar.org/paper/8037d10541d538d97c4b1e6503f3d233593e2fdb",
        "retrievedAt": "2026-10-10T14:01:19.294151+00:00"
      },
      "completedYear": {
        "year": 2025,
        "count": 245,
        "sourceService": "OpenAlex",
        "definition": "发表年份为2025年的施引文献数；不是2025年新增入库引用量，也不是实时增长率。",
        "comparable": true
      }
    },
    "endorsements": [
      {
        "kind": "学会编辑阅读推荐",
        "text": "入选IEEE ComSoc ISAC Best Readings（2022年2月）",
        "url": "https://www.comsoc.org/publications/best-readings/integrated-sensing-and-communication-isac"
      },
      {
        "kind": "学术奖项",
        "text": "2024 IEEE SPS最佳论文奖（2025年颁发）",
        "url": "https://signalprocessingsociety.org/community-involvement/award-recipients"
      }
    ],
    "socialDiscussion": {
      "status": "unavailable",
      "text": "未取得可靠的社交讨论量；不以引用、奖项或下载量替代。"
    }
  },
  {
    "id": "80211ad",
    "metrics": {
      "snapshotDate": "2026-10-10",
      "openAlex": {
        "count": 711,
        "source": "https://api.openalex.org/works/https://doi.org/10.1109/TVT.2017.2774762",
        "retrievedAt": "2026-10-10T13:59:59.287726+00:00",
        "recordUpdatedAt": "2026-10-09T09:14:12.587421",
        "comparable": true
      },
      "semanticScholar": {
        "count": 659,
        "source": "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1109/tvt.2017.2774762?fields=title,year,citationCount,influentialCitationCount,url,externalIds",
        "recordUrl": "https://www.semanticscholar.org/paper/27d4794f03ff8d0652c0fda3b60b04a59903f372",
        "retrievedAt": "2026-10-10T14:00:59.104440+00:00"
      },
      "completedYear": {
        "year": 2025,
        "count": 92,
        "sourceService": "OpenAlex",
        "definition": "发表年份为2025年的施引文献数；不是2025年新增入库引用量，也不是实时增长率。",
        "comparable": true
      }
    },
    "endorsements": [
      {
        "kind": "学会编辑阅读推荐",
        "text": "入选IEEE ComSoc ISAC Best Readings（2022年2月）",
        "url": "https://www.comsoc.org/publications/best-readings/integrated-sensing-and-communication-isac"
      }
    ],
    "socialDiscussion": {
      "status": "unavailable",
      "text": "未取得可靠的社交讨论量；不以引用、奖项或下载量替代。"
    }
  },
  {
    "id": "ofdm_full_duplex",
    "metrics": {
      "snapshotDate": "2026-10-10",
      "openAlex": {
        "count": 368,
        "source": "https://api.openalex.org/works?search=Full-Duplex%20OFDM%20Radar%20With%20LTE%20and%205G%20NR%20Waveforms%3A%20Challenges%2C%20Solutions%2C%20and%20Measurements&per-page=2",
        "retrievedAt": "2026-10-10T14:00:05.929236+00:00",
        "recordUpdatedAt": "2026-10-08T09:06:37.294493",
        "comparable": true
      },
      "semanticScholar": {
        "count": 368,
        "source": "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1109/tmtt.2019.2930510?fields=title,year,citationCount,influentialCitationCount,url,externalIds",
        "recordUrl": "https://www.semanticscholar.org/paper/1c1fd06ab8bd2b137b76155e5453cfde62d251ec",
        "retrievedAt": "2026-10-10T14:01:23.879122+00:00"
      },
      "completedYear": {
        "year": 2025,
        "count": 76,
        "sourceService": "OpenAlex",
        "definition": "发表年份为2025年的施引文献数；不是2025年新增入库引用量，也不是实时增长率。",
        "comparable": true
      }
    },
    "endorsements": [
      {
        "kind": "学会编辑阅读推荐",
        "text": "入选IEEE ComSoc ISAC Best Readings（2022年2月）",
        "url": "https://www.comsoc.org/publications/best-readings/integrated-sensing-and-communication-isac"
      }
    ],
    "socialDiscussion": {
      "status": "unavailable",
      "text": "未取得可靠的社交讨论量；不以引用、奖项或下载量替代。"
    }
  },
  {
    "id": "perceptive",
    "metrics": {
      "snapshotDate": "2026-10-10",
      "openAlex": {
        "count": 1,
        "source": "https://api.openalex.org/works/https://doi.org/10.1109/TAES.2019.2939611",
        "retrievedAt": "2026-10-10T14:00:05.590093+00:00",
        "recordUpdatedAt": "2026-09-29T14:09:16.559479",
        "comparable": false,
        "warning": "记录拆分：DOI记录1次，匹配题名的UTS仓储记录295次。未逐条去重，不能相加；排除OpenAlex引用排名。",
        "alternateRecord": {
          "count": 295,
          "url": "https://api.openalex.org/works/W2972579901"
        }
      },
      "semanticScholar": {
        "count": 295,
        "source": "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1109/taes.2019.2939611?fields=title,year,citationCount,influentialCitationCount,url,externalIds",
        "recordUrl": "https://www.semanticscholar.org/paper/fe5f9399d5d08c9631b111f113144ae7f6ea9fb5",
        "retrievedAt": "2026-10-10T14:01:09.591869+00:00"
      },
      "completedYear": {
        "year": 2025,
        "count": null,
        "sourceService": "OpenAlex",
        "definition": "发表年份为2025年的施引文献数；不是2025年新增入库引用量，也不是实时增长率。",
        "comparable": false
      }
    },
    "endorsements": [
      {
        "kind": "学会编辑阅读推荐",
        "text": "入选IEEE ComSoc ISAC Best Readings（2022年2月）",
        "url": "https://www.comsoc.org/publications/best-readings/integrated-sensing-and-communication-isac"
      }
    ],
    "socialDiscussion": {
      "status": "unavailable",
      "text": "未取得可靠的社交讨论量；不以引用、奖项或下载量替代。"
    }
  },
  {
    "id": "deepsense",
    "metrics": {
      "snapshotDate": "2026-10-10",
      "openAlex": {
        "count": 289,
        "source": "https://api.openalex.org/works/https://doi.org/10.1109/MCOM.006.2200730",
        "retrievedAt": "2026-10-10T13:59:59.192158+00:00",
        "recordUpdatedAt": "2026-10-10T09:11:00.788812",
        "comparable": true
      },
      "semanticScholar": {
        "count": 377,
        "source": "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1109/mcom.006.2200730?fields=title,year,citationCount,influentialCitationCount,url,externalIds",
        "recordUrl": "https://www.semanticscholar.org/paper/7446a7a37cca491169f1956d1cbf0e599388786e",
        "retrievedAt": "2026-10-10T14:01:04.130996+00:00"
      },
      "completedYear": {
        "year": 2025,
        "count": 104,
        "sourceService": "OpenAlex",
        "definition": "发表年份为2025年的施引文献数；不是2025年新增入库引用量，也不是实时增长率。",
        "comparable": true
      }
    },
    "endorsements": [
      {
        "kind": "官方研究资源",
        "text": "官方站提供数据、复现任务、工作坊录像与教学材料；这是资源和传播证据，不是讨论量统计。",
        "url": "https://deepsense6g.net/"
      }
    ],
    "socialDiscussion": {
      "status": "unavailable",
      "text": "未取得可靠的社交讨论量；不以引用、奖项或下载量替代。"
    }
  },
  {
    "id": "radar_prediction",
    "metrics": {
      "snapshotDate": "2026-10-10",
      "openAlex": {
        "count": 141,
        "source": "https://api.openalex.org/works?search=Radar%20Aided%206G%20Beam%20Prediction%3A%20Deep%20Learning%20Algorithms%20and%20Real-World%20Demonstration&per-page=2",
        "retrievedAt": "2026-10-10T14:00:05.695247+00:00",
        "recordUpdatedAt": "2026-10-08T09:06:37.294493",
        "comparable": true
      },
      "semanticScholar": {
        "count": 161,
        "source": "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1109/wcnc51071.2022.9771564?fields=title,year,citationCount,influentialCitationCount,url,externalIds",
        "recordUrl": "https://www.semanticscholar.org/paper/a898ac64f5a7af2133185f62417b18ce156e06be",
        "retrievedAt": "2026-10-10T14:01:14.424166+00:00"
      },
      "completedYear": {
        "year": 2025,
        "count": 37,
        "sourceService": "OpenAlex",
        "definition": "发表年份为2025年的施引文献数；不是2025年新增入库引用量，也不是实时增长率。",
        "comparable": true
      }
    },
    "endorsements": [
      {
        "kind": "作者实验与材料",
        "text": "作者实验室提供论文身份、演示及研究资源；不作为独立第三方认可。",
        "url": "https://www.wi-lab.net/research/radar-aided-beam-prediction-paper/"
      }
    ],
    "socialDiscussion": {
      "status": "unavailable",
      "text": "未取得可靠的社交讨论量；不以引用、奖项或下载量替代。"
    }
  }
];
const originalBeginnerRoutes=[["messages","shared",null],["iq","iq",null],["ofdm-basics",null,"foundations.html#ofdm-basics"],["communication-rate","rate",null],["echo","echo",null],["matched","matched",null],["geometry","geometry",null],["shared-model","shared",null],["sampling","ofdm",null],["phase","doppler",null],["known-pilots","pilot",null],["delay","ofdm",null],["doppler","doppler",null],["angle","array",null],["detection","cfar",null],["estimation","shared",null],["association",null,"reading.html#direction-networks"],["task-learning",null,"reading.html#direction-learning"],["resolution",null,"foundations.html#limits"],["ambiguity","pilot",null],["fisher-crb","crb",null],["budget",null,"foundations.html#codesign"],["waveform-design","pilot",null],["beam-design","array",null],["mutual-assistance",null,"theory.html#evolution"],["resource-design","sbfd",null],["joint-objectives","rate",null],["channels",null,"foundations.html#realworld"],["synchronization","clock",null],["near-field","near-field",null],["implementation",null,"reading.html#direction-prototype"]];
const originalProposedWork=[{"direction":"channels","level":"experiment","item":{"label":"目标—杂波—干扰分量可视化","kind":"interactive","scope":"direction-specific","status":"proposed","note":"待扩展：保留相干复数叠加并分别切换各分量"}},{"direction":"learning","level":"experiment","item":{"label":"真实数据的划分审计与跨场景泛化","kind":"interactive","scope":"direction-specific","status":"proposed","note":"待扩展：确认获准数据、时间戳、标签与分组；合成协议对照不替代真实数据审计"}},{"direction":"prototype","level":"experiment","item":{"label":"处理时限与系统误差预算实验","kind":"interactive","scope":"direction-specific","status":"proposed","note":"待扩展：把采集、处理、报告延迟及校准误差显式列入预算"}}];

test('perceptive clutter registers one digital-preprocessing lesson in the existing eight-direction architecture',()=>{
 a.ok(c&&u&&p);a.equal(c.title,'递归去背景：为什么慢目标也会变弱？');
 a.equal(r.cases.filter(x=>x.id===c.id).length,1);a.equal(r.units.filter(x=>x.id===u.id).length,1);a.equal(r.pages.filter(x=>x.path===p.path).length,1);
 a.equal(c.unit,u.id);a.equal(p.case,c.id);a.equal(p.stage,'experiments');a.equal(u.primaryDirectionId,'receiver');
 a.equal(c.learningEntry,'perceptive-clutter.html#question');a.equal(u.href,'perceptive-clutter.html#experiment');a.equal(c.paper,'perceptive-clutter.html#source');a.equal(c.next,'perceptive-clutter.html#boundary');a.equal(p.next,'practice.html#notebook');
 a.equal(withoutGCSAGERegistry(r).units.length,28);a.equal(r.cases.length,15);a.equal(r.knowledgeMap.nodes.length,32);a.equal(r.directions.length,8);
 const d=r.directions.find(d=>d.id==='receiver');a.deepEqual(d.primaryCaseIds,[c.id]);a.equal(d.levels.find(l=>l.id==='intuition').items[0].href,'foundations.html#matched');
 for(const [level,anchor]of [['intuition','question'],['model','model'],['experiment','experiment'],['papers','source'],['limits','boundary'],['reproduction','validation']]){
  const items=d.levels.find(l=>l.id===level).items.filter(i=>i.href==='perceptive-clutter.html#'+anchor);
  a.equal(items.length,1);a.equal(items[0].status,'available');a.equal(items[0].scope,'direction-specific');resolve(items[0].href);
 }
 a.match(require('./helpers/atomic-receiver-preservation.cjs').withoutAtomicReceiverRegistry(r).directions.find(x=>x.id===d.id).coverage,/递归背景与离格单目标有限网格测距/);a.match(require('./helpers/atomic-receiver-preservation.cjs').withoutAtomicReceiverRegistry(r).directions.find(x=>x.id===d.id).coverage,/连续优化、真实信道校准和多目标跟踪尚未实现/);
});

test('all original beginner entries and proposed work survive the narrowly scoped new concept',()=>{
 const originalIds=originalBeginnerRoutes.map(([id])=>id);
 a.deepEqual(r.knowledgeMap.nodes.filter(n=>originalIds.includes(n.id)).map(n=>[n.id,n.entryUnitRef??null,n.href??null]),originalBeginnerRoutes);
 const added=r.knowledgeMap.nodes.filter(n=>!originalIds.includes(n.id));a.equal(added.length,1);a.equal(added[0].id,'background-subtraction');a.equal(added[0].groupId,'inference');a.equal(added[0].href,c.learningEntry);
 a.deepEqual(r.knowledgeMap.nodes.filter(n=>n.unitRefs.includes(u.id)).map(n=>n.id),['doppler','channels','background-subtraction']);
 for(const n of r.knowledgeMap.nodes)a.ok(n.unitRefs.filter(ref=>ref===u.id).length<=1);
 const pending=r.directions.flatMap(d=>d.levels.flatMap(l=>l.items.filter(i=>i.status==='proposed').map(item=>({direction:d.id,level:l.id,item}))));a.deepEqual(pending,originalProposedWork);
 for(const {item}of pending)a.ok(!item.href);
 a.deepEqual(r.directions.find(d=>d.id==='networks').primaryCaseIds,['case-clock','case-distributed-detection']);a.deepEqual(r.directions.find(d=>d.id==='channels').primaryCaseIds,['case-multipath-channel']);
 for(const edge of r.knowledgeMap.edges.filter(e=>e.source==='background-subtraction'||e.target==='background-subtraction')){a.equal(edge.provenance,'editorial-pedagogic');a.equal(edge.scientificClaim,false);}
});

test('all nine metrics, endorsements and social snapshots are deeply equal and only the existing perceptive entry changes',()=>{
 a.deepEqual(data.cards.map(({id,metrics,endorsements,socialDiscussion})=>({id,metrics,endorsements,socialDiscussion})),expectedEvidence);
 const preserved=require('./helpers/waveform-live-preservation.cjs').withoutWaveformLiveCatalog(data),card=preserved.cards.find(c=>c.id==='perceptive');delete card.caseId;delete card.readingPlan;
 // Normalize only the later authorized mu_mimo activation before checking this earlier complete-directory snapshot.
 const shared=preserved.cards.find(c=>c.id==='mu_mimo');shared.caseId=null;shared.readingPlan='计划深读：同一阵列预算下的分离与共享；本站交互尚未实现。';
 // Every other card field, directory field, timestamp, title, source URL and influence claim stays byte-equivalent after JSON parsing.
 a.equal(hash(preserved),'1a98b4a214b9be08e69a0a8087d6117018887e34bee20a04657bf10d656398ca');
 const actual=data.cards.find(c=>c.id==='perceptive');a.equal(actual.caseId,c.id);a.equal(actual.groupId,'signals-networks');
 a.match(actual.readingPlan,/独立单系数机制/);a.match(actual.readingPlan,/没有实现完整网络组织、稀疏多径恢复或论文图11\/12/);
 a.equal(data.cards.length,9);a.equal(new Set(data.cards.map(c=>c.doi)).size,9);a.equal(data.cards.filter(c=>c.caseId).length,8);a.equal(data.cards.filter(c=>!c.caseId).length,1);
 a.equal(actual.metrics.snapshotDate,'2026-10-10');a.equal(actual.metrics.openAlex.comparable,false);a.equal(actual.metrics.openAlex.count,1);a.equal(actual.metrics.openAlex.alternateRecord.count,295);a.equal(actual.metrics.semanticScholar.count,295);
 a.equal(actual.metrics.completedYear.comparable,false);a.equal(actual.metrics.completedYear.count,null);a.equal(actual.socialDiscussion.status,'unavailable');a.match(actual.metrics.openAlex.warning,/未逐条去重，不能相加；排除OpenAlex引用排名/);
});

test('fixed PDF source slots preserve physical pages, phase discrepancy and paper-versus-lesson evidence',()=>{
 const pc=c.paperComparison,metadata=JSON.stringify(pc);a.equal(pc.comparisonStatus,'partial');a.equal(pc.sourceId,'perceptive');
 a.equal(pc.sourceUrl,'https://opus.lib.uts.edu.au/bitstream/10453/137860/4/Framework%20for%20a%20Perceptive%20Mobile%20Network.pdf');a.equal(pc.comparisonLink,c.paper);
 for(const text of ['15 个物理 PDF 页','1 页版权封面','1901.05558v1','2019-01-16','14 页','2020 卷56期3','2019 在线发表/预印本','10.1109/TAES.2019.2939611'])a.ok(pc.version.includes(text),text);
 for(const text of ['§VI p.10','p.11 式(32)','§VI pp.9–10','式(30)','自动 HTML 式号不同'])a.ok(pc.locator.summary.includes(text),text);
 for(const text of ['式(31)','复相位','幅度相同','不是作者发布的勘误','RCS=1 m²','2.8 ms','3.84 ms'])a.ok(metadata.includes(text),text);
 a.match(pc.locator.figure,/图11为背景重建误差/);a.match(pc.locator.figure,/不是检出率/);a.match(pc.siteArtifactType,/不是整篇论文或图11\/12复现/);
 for(const sha of ['a51c363bbb6b6a646a1de1ff20054722db60ad7ec2a303421d570ae5b8d82172','e947f001746f33fb91be4c2b5781c9df29a67ce0023bd7975092db241f75f8ec'])a.ok(pc.verificationNote.includes(sha));
 for(const key of ['retainedAssumptions','omittedMechanisms','metrics','unknowns'])a.ok(pc[key].length,key);
 a.doesNotMatch(metadata,/\/workspace\/|\/tmp\//);
});

test('registered model distinguishes shared finite records, truth diagnostics, noise covariance and unavailable detection',()=>{
 const pc=c.paperComparison,metadata=JSON.stringify(pc);
 for(const text of ['b_0=0','先更新再相减','不归一化冷启动权重','I/Q 各有 σ²/2 方差','不进入接收机递归','P=512','T_h=2 ms','1.024 s','1.022 s','0.9765625 Hz','不是原文 N=512 子载波','同一条输入数字重处理','没有免费训练历史','919 次/1.838 s'])a.ok(metadata.includes(text),text);
 for(const text of ['|1−H_b|²','1−|H_b|²','有限窗口','K_pp','相邻时刻协方差','α>0','可逆','不能仅凭幅度下降宣称 Fisher 信息必然下降','输出在慢时间上相关','未校准的 Pd/Pfa'])a.ok(metadata.includes(text),text);
 a.match(pc.observationsAndUnknowns,/已除去已知调制、参考相位可比/);a.match(pc.resourceBudget.priorKnowledge,/不进入递归/);
 a.match(pc.resourceBudget.summary,/未建模通信吞吐量、RF 功耗、RCS 或检测性能/);
 a.match(metadata,/f_D=500 Hz 采样后与 DC 等价/);a.match(metadata,/停住后相位连续/);a.match(metadata,/记忆尾迹/);
});

test('new lesson prerequisites, six sections and generated portals resolve through the shared shell',()=>{
 const expected=['foundations.html#iq','foundations.html#ofdm','foundations.html#doppler','theory.html#shared-model'];a.deepEqual(u.prerequisites,expected);a.deepEqual(p.prerequisites,expected);
 const html=read(p.path);for(const href of expected){resolve(href);a.ok(c.fields['先修'].includes('href="'+href+'"'));a.ok(html.includes('href="'+href+'"'));}
 for(const anchor of ['question','model','experiment','source','boundary','validation'])resolve(p.path+'#'+anchor);
 for(const href of [c.learningEntry,u.href,c.paper,c.next,p.next])resolve(href);
 for(const key of ['HEADER','CONTEXT','NEXT'])a.equal((html.match(new RegExp('<!-- SITE:'+key+':START -->','g'))||[]).length,1);
 a.ok(html.includes('href="experiments.html" aria-current="location"'));a.ok(html.includes('href="practice.html?topic=perceptive-clutter#notebook"'));
 for(const file of ['index.html','experiments.html','reading.html'])a.ok(read(file).includes('href="'+u.href+'"'),file);a.ok(read('index.html').includes('href="'+c.learningEntry+'"'));
 const home=read('index.html');a.ok(home.includes('<strong>32</strong> 个核心概念'));a.ok(home.includes(`<strong>${r.units.length}</strong> 个机制实验`));a.ok(home.includes('<strong>8</strong> 个研究方向'));
});

test('the perceptive paper card is usable while the unavailable DeepSense card and the split-record warning remain honest',()=>{
 const html=read('reading.html'),card=article(html,'paper-perceptive');a.ok(card.includes('href="'+c.learningEntry+'"'));a.match(card,/独立机制模型，非完整论文复现/);a.doesNotMatch(card,/教学案例准备中|深度交互尚未实现/);
 a.match(html,/深度交互已接入：8 \/ 9 篇/);a.equal((html.match(/class="influence-card"/g)||[]).length,9);
 a.match(card,/DOI 拆分记录，不可比/);a.match(card,/仓储记录 295 次/);a.match(card,/未逐条去重，不能相加/);a.match(card,/排除OpenAlex引用排名/);a.match(card,/记录拆分，未给出可比计数/);
 const pending=data.cards.filter(c=>!c.caseId);a.deepEqual(pending.map(c=>c.id),['deepsense']);
 for(const item of pending){const h=article(html,'paper-'+item.id);a.match(h,/深度交互尚未实现/);a.ok(!/href="(?!https:)/.test(h));}
});

test('public source manifest identifies the two fixed PDFs without distributing source files or merging versions',()=>{
 const manifest=JSON.parse(read('data/perceptive-clutter-sources.json'));
 a.equal(manifest.primary_edition,'uts-accepted');a.equal(manifest.DOI,'10.1109/TAES.2019.2939611');a.equal(manifest.verified_on,'2026-10-11');
 const primary=manifest.sources.find(s=>s.id==='uts-accepted'),arxiv=manifest.sources.find(s=>s.id==='arxiv-v1');
 a.equal(primary.url,c.paperComparison.sourceUrl);a.equal(primary.pdf_pages,15);a.equal(primary.cover_pages,1);a.equal(primary.bytes,1579230);a.equal(primary.sha256,'a51c363bbb6b6a646a1de1ff20054722db60ad7ec2a303421d570ae5b8d82172');
 a.equal(arxiv.url,'https://arxiv.org/pdf/1901.05558v1');a.equal(arxiv.pdf_pages,14);a.equal(arxiv.bytes,915430);a.equal(arxiv.sha256,'e947f001746f33fb91be4c2b5781c9df29a67ce0023bd7975092db241f75f8ec');a.equal(arxiv.submitted,'2019-01-16 23:22:26 UTC');
 for(const s of manifest.sources){a.equal(new URL(s.url).protocol,'https:');a.ok(!s.file);}
 const differences=manifest.important_differences.join(' ');a.match(differences,/equation numbering/);a.match(differences,/RCS/);a.match(differences,/phase/);a.match(differences,/not author-issued erratum/);a.match(differences,/2\.8ms/);a.match(differences,/3\.84ms/);
 a.doesNotMatch(JSON.stringify(manifest),/\/workspace\/|\/tmp\/|"file"\s*:/);
 const localFiles=fs.readdirSync(path.join(root,'data')).filter(name=>/perceptive/.test(name));a.ok(localFiles.every(name=>!/^.*\.(pdf|png|jpe?g|txt)$/i.test(name)));
});
