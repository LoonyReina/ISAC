'use strict';
// Current feedback copy, deliberately separate from frozen historical evidence.
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=path.join(root,'content/pages/channel-mapping.html');
const html=fs.readFileSync(fs.existsSync(source)?source:path.join(root,'channel-mapping.html'),'utf8');
test('mapping publication fact is separate from dated acceptance and later revisions',()=>{
 a.match(html,/公开入口随 PR111 上线/);
 a.match(html,/https:\/\/github\.com\/LoonyReina\/ISAC\/pull\/111/);
 a.match(html,/2026-10-20 的独立版本通过本地核心教学验收/);
 a.match(html,/历史验收，不自动覆盖后续界面修订/);
 a.match(html,/15 处微小浮点差异仍保留为 FAIL/);
 a.doesNotMatch(html,/集成页待验|界面、整站回归与部署仍待验证|本页尚未部署/);
});
test('mapping claims remain synthetic teaching rather than author measurements or whole-paper replication',()=>{
 a.match(html,/这是新的合成实验，不是原作者测量/);
 a.match(html,/portable-v2 生成器、聚类与匹配规则均公开说明/);
 a.match(html,/<h2>合成任务的核心教学验收，不等于完整论文复现。<\/h2>/);
 a.match(html,/原始测量 PADP\/CIR、真实硬件校准、实测 S1\/S2、墙体 3 mm 精度、RCS 与语义识别/);
 a.match(html,/不构成原作者实测或完整论文验收/);
 a.match(html,/本页完全本地计算/);
});

test('mapping lower status section identifies retained receipt fields as history, not current publication',()=>{
 const status=html.match(/<section class="card mapping-integration-status"[\s\S]*?<\/section>/)?.[0];
 a.ok(status,'scope-adjacent status section exists');
 a.match(status,/历史摘要保留 integration-not-verified \/ not-deployed/);
 a.match(status,/不代表当前公开入口状态/);
 a.match(status,/https:\/\/github\.com\/LoonyReina\/ISAC\/pull\/111/);
 a.match(status,/assets\/data\/channel-mapping\/acceptance-summary\.json/);
 a.doesNotMatch(html,/此统一站点连接候选：integration-not-verified/);
});

test('mapping generated site context uses the current registry publication boundary',()=>{
 const registrySource=path.join(root,'content/data/registry.json');
 const registry=JSON.parse(fs.readFileSync(fs.existsSync(registrySource)?registrySource:path.join(root,'site/registry.json'),'utf8'));
 const pages=registry.pages.filter(p=>p.path==='channel-mapping.html');
 a.equal(pages.length,1);
 a.match(pages[0].role,/合成扫描到通信时延关联/);
 a.match(pages[0].role,/公开入口随 PR111 上线/);
 a.match(pages[0].role,/发布不等于原作者实测或完整论文验收/);
 a.doesNotMatch(pages[0].role,/集成页待验|未部署|本次修订已上线/);
});
