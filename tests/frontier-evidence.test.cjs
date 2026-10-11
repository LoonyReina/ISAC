// Evidence/status and link contracts only. No network, browser, or paper-reproduction claim.
'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),r=JSON.parse(read('site/registry.json'));
const source=read('site/content-reading.html'),frontiers=read('site/content-frontiers.html'),html=read('reading.html'),map=read('index.html');
const article=(s,id)=>{const m=s.match(new RegExp(`<article[^>]* id="${id}"[^>]*>[\\s\\S]*?<\\/article>`));a.ok(m,`missing ${id}`);return m[0];};
const official={itu:'https://www.itu.int/en/ITU-R/study-groups/rsg5/rwp5d/IMT-2030/Pages/default.aspx',architecture:'https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=5516',report:'https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=4446',work:'https://portal.3gpp.org/desktopmodules/WorkItem/WorkItemDetails.aspx?workitemId=1121123'};

test('official status separates ITU drafts, Stage 2 TS metadata, NR study TR and ongoing RAN work',()=>{
 for(const s of [frontiers,article(read('theory.html'),'standards-status')]){
  for(const url of Object.values(official))a.ok(s.includes(`href="${url}"`),url);
  for(const text of ['2026-10-11 UTC','5/116','5/119','拟于 2026 年 12 月审批','Stage 2 架构规范','TS 23.137','Rel-20 v20.0.0（2026-09-24 上传）','Under Change Control','未读取该版本全文','TR 38.765 v20.0.0','2026-06-23 上传','NR ISAC 研究报告','已进入变更控制','NR_Sensing_bis-Core','仍在推进','商用互操作能力完成'])a.ok(s.includes(text),text);
  a.match(s,/仍不是已批准报告|不能写成已批准报告/);
  a.match(s,/不能合并成|不等于完整 6G/);
  a.ok(!s.includes('无线、协议和架构研究还需决定'));
  a.doesNotMatch(s,/首个架构标准|Rel-19 v20\.0\.0|已于 2026 年 12 月/);
 }
 a.match(article(read('theory.html'),'standards-status'),/2026 年 9 月报告完成度 25%/);
 a.ok(html.includes(frontiers.trim()));
});

test('service requirements keep fixed Rel-19 text separate from later version metadata',()=>{
 const req=article(source,'ref-REQ');
 a.ok(req.includes('href="https://www.etsi.org/deliver/etsi_ts/122100_122199/122137/19.01.00_60/ts_122137v190100p.pdf"'));
 a.ok(req.includes('href="https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=4198"'));
 for(const text of ['Release 19','固定 v19.1.0','2024-04-04','2026-01','两者不是同一日期','2026-10-11 UTC','Rel-20 v20.0.0、Rel-21 v21.0.0','2026-10-02 上传','未据此声称新增功能','未逐条比较版本差异'])a.ok(req.includes(text),text);
 a.equal(article(html,'ref-REQ'),req);
});

test('three 2026 readings keep fixed author versions, dates, questions and evidence boundaries',()=>{
 a.match(source,/id="reading-2026" aria-labelledby="reading-2026-title"/);
 a.match(html,/href="#reading-2026">2026 阅读补充/);
 a.match(source,/不是影响力排名，本站尚未完成这些论文的复现/);
 for(const [id,version,date]of [['F1','2504.19091v2','2025-12-31'],['F2','2504.13363v3','2026-02-13'],['F3','2607.14938v1','2026-07-16']]){
  const c=article(source,'ref-'+id);a.equal(article(html,'ref-'+id),c);
  for(const type of ['html','abs'])a.ok(c.includes(`href="https://arxiv.org/${type}/${version}"`));
  a.ok(c.includes(date));a.equal((c.match(/<b>学习问题：<\/b>/g)||[]).length,1);a.equal((c.match(/<b>证据边界：<\/b>/g)||[]).length,1);
  a.match(c,/<b>它接上：<\/b>/);a.doesNotMatch(c,/高被引|主流排名|已完成复现|<button|<input|<canvas|<script/);
 }
 const f1=article(source,'ref-F1'),f2=article(source,'ref-F2'),f3=article(source,'ref-F3');
 for(const text of ['2026 期刊出版 / 2025-12-31 作者 v2','§III-D 的原型来自引用文献','不能据此把所有教程算法都标为实测验证','2026 出版不表示 2026 首次提出'])a.ok(f1.includes(text));
 for(const text of ['To appear','作者出版记录','2026 年 2 月','保留两处出版状态表述的差异','§VI-B 先用纯通信混合预编码','不能把该小节全部曲线标成通感联合实验'])a.ok(f2.includes(text));
 for(const text of ['综述预印本 v1','submitted to IEEE Communications Surveys','本次未确认接受或出版','对象主要是无线定位','不能直接等同人体姿态','不把投稿预印本标成已接收'])a.ok(f3.includes(text));
});

test('existing paper layers point to actual readings within the current canonical inventory',()=>{
 a.equal(r.units.length,27);a.equal(r.cases.length,15);a.equal(r.knowledgeMap.nodes.length,32);a.equal(r.directions.length,8);
 const expected={receiver:['F1'],spatial:['F1'],learning:['F2','F3']};let count=0;
 for(const d of r.directions){
  a.equal(d.levels.length,6);
  for(const level of d.levels)for(const item of level.items){
   if(!/^reading\.html#ref-F[123]$/.test(item.href||''))continue;
   count++;a.equal(level.id,'papers');a.equal(item.kind,'paper-guide');a.equal(item.scope,'direction-specific');a.equal(item.status,'available');
   a.ok(expected[d.id]?.includes(item.href.slice(-2)));a.match(item.note,/尚未完成该论文复现/);
   for(const s of [html,map])a.ok(s.includes(`href="${item.href}"`));
  }
 }
 a.equal(count,4);
 const directory=JSON.parse(read(r.researchDirectoryFile));a.equal(directory.cards.length,9);a.equal((html.match(/class="influence-card"/g)||[]).length,9);
 a.doesNotMatch(JSON.stringify(directory),/2504\.19091|2504\.13363|2607\.14938/);
});

test('all HTML hrefs/resources resolve locally or use valid external URLs; new sources are documented',()=>{
 const ids=s=>new Set([...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 const pages=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
 for(const f of [...pages,'site/content-frontiers.html','site/content-reading.html'])for(const [,raw]of read(f).matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const href=raw.replace(/&amp;/g,'&');
  if(/^https?:/.test(href)){const u=new URL(href);a.ok(u.hostname);continue;}
  if(/^(?:data:|mailto:)/.test(href))continue;
  const [file,hash]=href.split('#'),owner=f.startsWith('site/')?'reading.html':f,target=path.resolve(root,(file||owner).split('?')[0]);
  a.ok(target.startsWith(root+path.sep));a.ok(fs.existsSync(target),`${f}: ${href}`);
  if(hash)a.ok(ids(fs.readFileSync(target,'utf8')).has(decodeURIComponent(hash)),`${f}: ${href}`);
 }
 const doc=read('docs/READING-MAP.md');
 for(const s of [frontiers.slice(frontiers.indexOf('id="standards-2026"')),article(source,'ref-REQ'),...['F1','F2','F3'].map(id=>article(source,'ref-'+id))]){
  for(const [,url]of s.matchAll(/href="(https:[^"]+)"/g))a.ok(doc.includes(url),`undocumented ${url}`);
 }
});
