'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(source,legacy)=>fs.readFileSync(path.join(root,fs.existsSync(path.join(root,source))?source:legacy),'utf8');
test('OFDM runtime sources resolve to an external S1 and retained local D1',()=>{
 const s=read('features/foundations/velocity-bridge.js','velocity-bridge.js');
 a.match(s,/href="https:\/\/arxiv.org\/pdf\/2108\.07165">\[S1\]/);
 a.match(s,/href="#ref-D1">\[D1\]/);a.doesNotMatch(s,/href="#ref-S1"/);
});
test('foundation chapter points directly to the named OAI source, not nonexistent chapter 15',()=>{
 const s=read('content/pages/foundations.html','foundations.html');
 a.doesNotMatch(s,/第\s*15\s*章的实测论文/);a.match(s,/href="https:\/\/arxiv.org\/html\/2608\.16705v1">OAI 基站实时 OFDM 雷达论文/);
});
test('published lesson copy separates release from scientific acceptance',()=>{
 const mapping=read('content/pages/channel-mapping.html','channel-mapping.html');
 const otfs=read('labs/otfs-receiver/source-objective-v1/index.html','otfs-receiver/source-objective-v1/index.html');
 for(const s of [mapping,otfs]){a.doesNotMatch(s,/未部署|没有发布到正式网站|本集成页待验/);a.match(s,/https:\/\/github.com\/LoonyReina\/ISAC\/pull\/111/);}
 a.match(mapping,/15 处微小浮点差异仍保留为 FAIL/);a.match(otfs,/补充算法/);
 a.equal((otfs.match(/<main\b/g)||[]).length,1);a.match(otfs,/href="#main-content"/);a.match(otfs,/id="main-content"/);
});
test('raw diagnostics remain available without entering the default learning view',()=>{
 for(const [file,id] of [['pilot-patterns','pp-calibration-binding'],['gaussian-tradeoff','gt-identity'],['networked-sync','ns-identity']]){
  const s=read('content/pages/'+file+'.html',file+'.html');
  a.equal((s.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
  a.match(s,new RegExp('<details><summary>[^<]+</summary><p id="'+id+'"'));
 }
});
test('research focus is labelled separately from global search',()=>{
 const s=read('features/research-reading/research-tree.js','research-tree.js');
 a.match(s,/'rt-direction-label','聚焦方向'/);a.match(s,/搜索默认覆盖全部论文/);
 const map=read('scripts/site/knowledge-map.cjs','scripts/knowledge-map.cjs');a.doesNotMatch(map,/沿四个阶段安排学习/);
});
