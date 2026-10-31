'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base=process.env.TARGET19_BASE||root;
const {reader,assertPage,stripSite,sha}=require('./helpers/target19-layout.cjs'),read=reader(root,base);
const manifest=JSON.parse(read('build/compatibility-manifest.json'));
const entry=p=>manifest.entries.find(e=>e.public===p);
const authored=p=>read(entry(p).source||p);
const {target19OtfsDependencies:check,requiredFiles}=require('../scripts/build/target19-otfs-dependencies.cjs');
const parent=authored('otfs-receiver.html').toString(),child=authored('otfs-receiver/source-objective-v1/index.html').toString();
const identities=Object.keys(requiredFiles).map(file=>({file,sha256:sha(authored(file))}));
const pages=[{file:'otfs-receiver.html',source:parent},{file:'otfs-receiver/source-objective-v1/index.html',source:child}];
test('exact presentation and additive markup reverse to observed original; 137 existing IDs retained',()=>{
 const presentation=[{"before": "从接收机知道什么出发，实际计算 OTFS 单目标有限网格感知与 perfect-CSI 通信 MP-G/LMMSE，检查复数据、真实消息、停止原因和可重算记录。", "after": "从单径入门到已知路径数的 OTFS 多径联合估计，区分原目标 residual-BCD 补充求解、原打印式21未确认和有界 MP-Ψ/MP-G/LMMSE 通信。", "expectedCount": 1}, {"before": "<span>有限网格单目标感知</span><span>MP-G / full LMMSE 通信</span>", "after": "<span>单径入门与多径联合估计</span><span>MP-Ψ / MP-G / full LMMSE 通信</span>", "expectedCount": 1}, {"before": "<p class=\"otfs-lead\">雷达知道自己发了什么，要从回波找路径；通信端拿到信道描述，要从接收数据找消息。OTFS 的延迟–多普勒表示，把两类问题放进相近的数学语言，但没有把它们变成同一个问题。</p>", "after": "<p class=\"otfs-lead\">雷达知道自己发了什么，要从回波找路径；通信端拿到信道描述，要从接收数据找消息。OTFS 的延迟–多普勒表示，把两类问题放进相近的数学语言，但没有把它们变成同一个问题。</p><p class=\"otfs-note\">本页先用下面两块单径与通信实验入门，再进入 8×8 统计、多径 joint-profile、原式 17 residual-BCD 补充求解及 MP-Ψ 模型失配对照。各分支的尺寸、观测与范围分别标注；新联合求解不是作者打印式 21 的来源确认实现。</p>", "expectedCount": 1}, {"before": "本页端点、搜索域、65² 默认与129² 上限都是实现选择；原文未给可直接复现的数值 Γ", "after": "单径入门分支的端点、搜索域、65² 默认与129² 上限都是实现选择；原文未给可直接复现的数值 Γ；多径分支另列各自网格与预算", "expectedCount": 1}, {"before": "局部求和精确；有环全局推断、浮点误差与停止规则仍有限制；未实现 MP-Psi", "after": "局部求和精确；有环全局推断、浮点误差与停止规则仍有限制。本行仅描述 MP-G；MP-Ψ 另见本页模型失配对照，其有界实现不等于原文全尺寸性能验证", "expectedCount": 1}, {"before": "感知 4×8，通信 3×4，既不是原尺寸复现，也不是无线硬件实测。", "after": "单径入门默认 4×8，统计及多径分支采用 8×8，基础通信默认 3×4；各分支单独给出模型与预算，既不是原尺寸完整复现，也不是无线硬件实测。", "expectedCount": 1}, {"before": "新增 8×8 统计分支提供开单元局部细化与局部 FIM/CRB，仍不支持多目标感知和未知路径数估计。", "after": "8×8 单径统计分支提供开单元局部细化与局部 FIM/CRB，该子模块不支持多目标感知。另列的多径分支以已知路径数为输入，也不估计未知路径数；原式 21 的来源确认仍未解决。", "expectedCount": 1}, {"before": "新增离线 1,400 次试验不等于实时多试验统计；仍未实现原文尺寸曲线、信道获取、FEC、MP-Psi、精确有限窗通信或 OFDM / FMCW 雷达比较。", "after": "历史离线 1,400 次试验不等于实时多试验统计；仍未实现原文尺寸曲线、信道获取、FEC、精确有限窗通信或 OFDM / FMCW 雷达比较。本页 MP-Ψ 是有界模型失配扩展，其未重放的历史汇总不作本轮新证据。", "expectedCount": 1}, {"before": "感知最多129×129个候选，通信最多100次迭代；内核预算", "after": "单径入门感知最多129×129个候选，基础通信最多100次迭代；新增分支的预算与导出协议另见各模块。内核预算", "expectedCount": 1}];
 let previous=parent;for(const edit of [...presentation].reverse()){assert.equal(previous.split(edit.after).length-1,edit.expectedCount);previous=previous.replace(edit.after,edit.before);}
 assert.equal(previous.includes('未实现 MP-Psi'),true);
 const restored=previous.replace(/<!-- TARGET19:OTFS:NAV:START -->[^]*?<!-- TARGET19:OTFS:NAV:END -->/,'').replace(/<!-- TARGET19:OTFS:SECTION:START -->[^]*?<!-- TARGET19:OTFS:SECTION:END -->\n\n/,'');
 assertPage(restored,{root,source:'content/pages/otfs-receiver.html',full:'3f2110b305373b217cc9c35609c1ae898c006b135d346b191222aa0ec9f946c2',body:'440b1d74608da6aa490d280bb3a1d39f99553652932d5f9bec31e822f51ba098'});
 const ids=[...stripSite(parent).matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,138);assert.equal(new Set(ids).size,138);
 for(const id of ['communication','mppsi-extension','statistics','joint-otfs','sensing','paper','limits','reproduce'])assert(ids.includes(id));
});
test('exact payload mapping and production dependency edges',()=>{
 const T=require('./helpers/target19-source-identity.cjs');T.assertCurrentClosure(root);
 const teaching=["manual.js", "guided-lesson.css", "integration.css", "lessons.js", "receiver-adapters.js", "receiver-views.js", "theory-adapters.js", "theory-views.js", "engine.js"].map(name=>'features/teaching19/'+name),nested='otfs-receiver/source-objective-v1/index.html';
 assert.equal(identities.length,12);const edges=check({identities,pages});
 const original=[{from:'otfs-receiver.html',url:nested,kind:'target19-iframe'},...['https://arxiv.org/abs/1910.01896v1','results/independent-check.json','results/new-study-30.json','runtime/ui.mjs'].map(url=>({from:nested,url,kind:'target19-nested-html'})),...['runtime/joint/waveform.json','runtime/joint/scenes.json'].map(url=>({from:nested,url,kind:'target19-document-fetch'}))];
 assert.equal(original.length,7);const added=[...teaching.map(url=>'../../'+url),'#main-content','../../otfs-receiver.html','https://github.com/LoonyReina/ISAC/pull/111'].map(url=>({from:nested,url,kind:'target19-nested-html'}));
 assert.deepEqual(edges,[original[0],...added,...original.slice(1)],'exact original seven edges plus ordered nine teaching assets, skip anchor, parent backlink and PR111 publication link');

 for(const edge of edges){if(/^https?:/.test(edge.url))continue;const dest=new URL(edge.url,'https://example.org/ISAC/'+edge.from).pathname.slice(6);assert(entry(dest)||teaching.includes(dest),'explicit original manifest or exact teaching target '+dest);assert(sha(teaching.includes(dest)?fs.readFileSync(T.regular(root,dest)):authored(dest)));}
});
test('missing, changed and unreviewed payloads fail closed',()=>{
 for(let i=0;i<identities.length;i++)assert.throws(()=>check({identities:identities.filter((_,j)=>i!==j),pages}),/missing\/changed/);
 assert.throws(()=>check({identities:identities.map((e,i)=>i?e:{...e,sha256:'0'.repeat(64)}),pages}),/missing\/changed/);
 assert.throws(()=>check({identities:[...identities,{file:'otfs-receiver/source-objective-v1/unreviewed.js',sha256:'0'.repeat(64)}],pages}),/unreviewed/);
 assert.throws(()=>check({identities,pages:pages.slice(1)}),/mount/);
});
test('iframe keeps navigation outside, own IDs isolated and runnable policy',()=>{
 assert(!/<nav\b|class="site-nav"/.test(child));assert(/title="OTFS[^>]+loading="lazy"[^>]+height:1900px/.test(parent));assert(!/<iframe[^>]+(?:sandbox|allow)=/.test(parent));
 assert(parent.includes('target="_blank" rel="noopener"'));assert(child.includes('new-study-30.json'));
});
test('new module contracts exactly match copied runtime bytes and explicit fetch/worker identities',()=>{
 const contract=JSON.parse(read('scripts/build/module-runtime-contracts.json'));
 const names=identities.filter(e=>e.file.endsWith('.mjs')).map(e=>e.file);assert.equal(names.length,7);
 for(const file of names){const c=contract.modules.filter(c=>c.public===file);assert.equal(c.length,1);assert.equal(c[0].sha256,sha(authored(file)));}
 const ui=contract.modules.find(e=>e.public.endsWith('source-objective-v1/runtime/ui.mjs'));
 assert.deepEqual(ui.runtimeEdges.map(e=>e.url),['./worker.mjs','./joint/waveform.json','./joint/scenes.json']);
 for(const e of ui.runtimeEdges)assert.equal(authored(ui.public).toString().split(e.literal).length,2);
});
