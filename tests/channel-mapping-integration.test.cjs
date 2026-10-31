'use strict';
// New integration guards. Prepared only; not run during overlay construction.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=fs.existsSync(path.join(root,'content/pages/channel-mapping.html'));
const read=(author,staged=author)=>fs.readFileSync(path.join(root,source?author:staged));
const json=(...p)=>JSON.parse(read(...p)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const delta=json('build/channel-mapping-integration-delta.json'),cfg=json('build/local-candidate-allowlist.json');
const id='channels-sensing-communication-mapping-2026';
const T=require('./helpers/target19-source-identity.cjs'),currentResources=require('./helpers/channel-mapping-preservation.cjs').currentMappingResources;
test('mapping keeps all seven scientific bytes and frozen app Worker and styles',()=>{
 for(const [name,digest] of Object.entries(cfg.freeze.core))a.equal(sha(read('labs/channel-mapping/'+name)),digest,name);
 T.assertCurrentClosure(root);for(const [name,digest] of Object.entries(cfg.freeze.ui)){const file='labs/channel-mapping/'+name,raw=read(file);a.equal(sha(T.teachingBefore(file,raw)),digest,'exact198 imported UI provenance '+name);}
 a.equal(sha(read('labs/channel-mapping/evidence/acceptance/DISPOSITION.json')),cfg.freeze.dispositionSha256);
 const accepted=json('labs/channel-mapping/evidence/acceptance/DISPOSITION.json');a.equal(accepted.verdict_name,'PAPER_CORE_TEACHING_COMPLETE');a.equal(accepted.strict_browser_node_comparison.status,'FAIL_RETAINED');a.equal(accepted.dimensions.integration_publication.whole_site_integration_verified,false);
});
test('mapping mounts one canonical reading route without creating a third section or paper identity',()=>{
 const r=json('content/data/registry.json','site/registry.json'),g=json('content/data/research-guides.json','site/research-guides.json');
 a.deepEqual(r.stages.map(x=>x.id),['foundations','reading']);a.equal(r.pages.filter(x=>x.path==='channel-mapping.html').length,1);a.equal(r.pages.find(x=>x.path==='channel-mapping.html').stage,'reading');
 a.equal(r.lessonPlacement.filter(x=>x.canonicalHref==='channel-mapping.html#top'&&x.section==='reading').length,1);
 a.equal(g.cards.filter(x=>x.id===id).length,1);a.equal(g.cards.find(x=>x.id===id).executable.href,'channel-mapping.html#top');a.equal(g.cards.find(x=>x.id===id).executable.kind,'validated-paper-model');
 const backlog=json('docs/PAPER-EXECUTION-BACKLOG.json');a.equal(backlog.papers.filter(x=>x.id===id).length,1);a.equal(backlog.papers.length,35);
 const h=read('content/pages/channel-mapping.html','channel-mapping.html').toString();for(const key of ['HEADER','CONTEXT','NEXT'])a.ok(h.includes('<!-- SITE:'+key+':START -->'));
 const nav=h.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)[0];a.deepEqual([...nav.matchAll(/href="([^"]+)"/g)].map(m=>m[1]),['foundations.html','reading.html']);
 const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);a.equal(new Set(ids).size,ids.length);for(const id of ['top','scope','site-main','parameters','results','export'])a.ok(ids.includes(id));
 a.match(h,/本课公开入口随 PR111 上线/);a.match(h,/历史|旧回执/);a.match(h,/15 处微小浮点差异仍保留为 FAIL/);a.doesNotMatch(h,/本候选的独立数值与实际浏览器验收尚待完成/);
});
test('mapping same-origin module Worker CSP and JSON protocol stay source-bound',()=>{
 const h=read('content/pages/channel-mapping.html','channel-mapping.html').toString(),app=read('labs/channel-mapping/src/app.mjs').toString();
 a.match(h,/src="channel-mapping\/src\/app.mjs"/);a.match(h,/href="channel-mapping\/styles.css"/);a.match(h,/worker-src 'self'/);a.match(h,/connect-src 'none'/);a.doesNotMatch(h,/(?:script|worker)-src[^;]*blob:/);
 a.ok(app.includes("new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'})"));a.ok(app.includes("type:'application/json;charset=utf-8'"));a.ok(app.includes('URL.createObjectURL(blob)'));a.ok(app.includes('channel-mapping-portable-v2-${current.config.scene}-seed${current.config.seed}.json'));
 a.doesNotMatch(app,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/);a.ok(app.includes("window.addEventListener('pagehide'"));a.ok(app.includes("window.addEventListener('pageshow'"));
 T.assertCurrentClosure(root);const c=json('scripts/build/module-runtime-contracts.json');for(const row of delta.addedModuleContracts){const hits=c.modules.filter(x=>x.public===row.public);a.equal(hits.length,1);const expected=structuredClone(row);if(row.public==='channel-mapping/src/app.mjs'){const current=currentResources.find(r=>r.public===row.public);a.ok(current);a.equal(sha(read(current.compatibility)),current.sha256,'actual current UI matches reviewed current resource');expected.sha256=current.sha256;}a.deepEqual(hits[0],expected);}
});
test('local visibility carries forward exactly 17 deployed identities and adds only mapping locally',()=>{
 a.equal(cfg.carriedForwardDeployedIds.length,17);a.equal(new Set(cfg.carriedForwardDeployedIds).size,17);a.ok(!cfg.carriedForwardDeployedIds.includes(id));
 a.equal(cfg.candidate.id,id);a.equal(cfg.candidate.acceptance,'local-core-accepted');a.equal(cfg.candidate.publication,'not-deployed');a.equal(cfg.candidate.integration,'not-verified');
 a.deepEqual(cfg.allowedChangedExistingPreviewFiles,['reading.html','research-tree-model.js','research-tree.js']);a.equal(Object.keys(cfg.newPublicFiles).length,12);
 if(source){a.equal(sha(read('build/publication-allowlist.json')),cfg.officialAllowlistSha256);a.equal(sha(read('scripts/publish-accepted.py')),cfg.officialProjectorSha256);const m=json('build/compatibility-manifest.json');for(const row of delta.addedEntries)a.deepEqual(m.entries.filter(x=>x.source===row.source),[row]);a.equal(JSON.parse(require('./helpers/feedback-current-epoch.cjs').before('build/compatibility-manifest.json',read('build/compatibility-manifest.json'))).entries.filter(x=>x.public!==null).length,1347);}
});
