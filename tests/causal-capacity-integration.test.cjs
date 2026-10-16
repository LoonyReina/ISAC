'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),sourceLayout=fs.existsSync(path.join(root,'content/pages/causal-state-capacity.html'));
const read=f=>fs.readFileSync(path.join(root,sourceLayout?f:f.replace('content/data/','site/').replace('content/pages/','')),'utf8');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
test('same paper retains strictly causal reading and routes separately to fixed-quarter causal theorem',()=>{
 const r=JSON.parse(read('content/data/registry.json')),g=JSON.parse(read('content/data/research-guides.json')),b=JSON.parse(read('docs/PAPER-EXECUTION-BACKLOG.json')),d=JSON.parse(read('content/data/research-directory.json'));
 const B=require(sourceLayout?'../scripts/site/research-tree.cjs':'../scripts/research-tree.cjs'),tree=B.buildResearchTree(r,g,d,b),p=tree.papers.find(p=>p.id==='tradeoffs-causal-state-communication-2013');
 a.equal(tree.papers.length,35);a.equal(tree.counts.guides,21);a.equal(p.tutorials[0].href,'causal-state-capacity.html#cc-question');a.match(p.tutorials[0].label,/模型/);a.equal(p.status,'bounded-core');
 const c=g.cards.find(c=>c.id===p.id);a.equal(c.executable.kind,'validated-paper-model');a.equal(c.executable.coverage,'bounded-model');
 const texts=JSON.stringify(c);for(const phrase of ['严格因果','Proposition 4','1/4'])a.ok(texts.includes(phrase),phrase);a.match(texts,/Fig\.\s*2/);
 const row=b.papers.find(x=>x.id===p.id);a.equal(row.stages.fullPaper,'not-reproduced');a.equal(row.stages.latency,'not-measured');a.equal(row.realtime.measuredLatencyMs,null);a.equal(row.stages.liveExecution,'partial-core');
 a.equal(row.implementation.details.browserAccepted,false);
 a.equal(r.pages.filter(p=>p.path==='causal-state-capacity.html').length,1);a.ok(r.lessonPlacement.some(p=>p.canonicalHref==='causal-state-capacity.html#cc-question'&&p.section==='reading'));
 const page=read('content/pages/causal-state-capacity.html');for(const phrase of ['cc-question','site-main','single-letter asymptotic theorem evaluation','E 独立于 U','前向独立误差','未执行有限长度通信码','严格因果 Fig. 2'])a.ok(page.includes(phrase),phrase);
 a.ok(page.includes('reading.html#guide-tradeoffs-causal-state-communication-2013'));
});
test('unchanged accepted lesson suite runs against mapped current production sources',t=>{
 const overlay=fs.mkdtempSync(path.join(os.tmpdir(),'isac-causal-tests-'));t.after(()=>fs.rmSync(overlay,{recursive:true,force:true}));
 const receipt=JSON.parse(read(sourceLayout?'labs/causal-state-capacity/SOURCE-IMPORT.json':'labs/causal-state-capacity/SOURCE-IMPORT.json'));
 const copy=(from,to)=>{const dest=path.join(overlay,to);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,from),dest);};
 for(const file of receipt.files){const from=sourceLayout?file.source:file.public;const bytes=fs.readFileSync(path.join(root,from));
  // Handwritten page markup is generated in the staged suite; immutable science and UI retain exact bytes.
  if(sourceLayout||!file.public.endsWith('.html'))a.equal(sha(bytes),file.sha256,'accepted lesson '+file.public);
  copy(from,'public/'+file.public);
 }
 const tests=sourceLayout?'labs/causal-state-capacity/tests':'tests/causal-state-capacity';
 for(const file of receipt.unchangedTests){const source=tests+'/'+path.basename(file.target);a.equal(sha(fs.readFileSync(path.join(root,source))),file.sha256);copy(source,'tests/'+path.basename(file.target));}
 const result=cp.spawnSync(process.execPath,['--test','--test-reporter=tap','--test-concurrency=1','tests/lesson.test.mjs'],{cwd:overlay,encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024,env:{...process.env,NODE_TEST_CONTEXT:undefined}});
 a.equal(result.status,0,result.stdout+'\n'+result.stderr);a.match(result.stdout,/# tests 12\n/);a.match(result.stdout,/# fail 0/);t.diagnostic(result.stdout.slice(result.stdout.lastIndexOf('1..')));
});

test('refresh preserves the accepted causal history, graph runtime and all77 predecessor tutorial routes',()=>{
 const delta=JSON.parse(read('tests/helpers/causal-capacity-refresh-delta.json')),refresh=delta.refreshMaintenance;
 a.equal(sha(read('tests/helpers/causal-capacity-integration-delta.json')),refresh.acceptedCausalDeltaSha256);
 a.equal(sha(read('tests/helpers/teaching-heading-maintenance-delta.json')),refresh.acceptedHeadingDeltaSha256);
 for(const row of refresh.preservedGraphSources){if(!sourceLayout&&row.path.startsWith('content/pages/'))continue;const f=sourceLayout?row.path:row.compatibility;a.equal(sha(read(f)),row.sha256,row.path);}
 const display=refresh.graphDisplayOnlyChange,runtime=read(sourceLayout?display.path:display.compatibility);
 a.equal(sha(runtime),display.afterSha256);a.equal(runtime.split(display.afterText).length,2);a.equal(sha(runtime.replace(display.afterText,display.beforeText)),display.beforeSha256,'only the exact causal status branch changes');
 const generator=read(sourceLayout?'scripts/site/generate-site.cjs':'scripts/generate-site.cjs');a.ok(generator.includes('research-tree.js?v=constellation-sky-20261015'),'new runtime URL prevents stale cached status');a.ok(!generator.includes('two-section-tree-v1'));for(const file of ['research-tree.css','research-tree-model.js'])a.ok(generator.includes(file+'?v=constellation-sky-20261015'));
 a.equal(sha(read(sourceLayout?'features/research-reading/research-tree.css':'research-tree.css')),refresh.acceptedConstellationPatch.source_files.find(f=>f.path.endsWith('.css')).patch_sha256);
 const B=require(sourceLayout?'../scripts/site/research-tree.cjs':'../scripts/research-tree.cjs');
 const tree=B.buildResearchTree(...['content/data/registry.json','content/data/research-guides.json','content/data/research-directory.json','docs/PAPER-EXECUTION-BACKLOG.json'].map(f=>JSON.parse(read(f))));
 // Only the historical route-count comparison is projected; causal runtime,
 // source and current display assertions above remain on current production.
 const routes=require('./helpers/multipath-information-preservation.cjs').withoutTutorials(tree.papers.flatMap(p=>p.tutorials.map(t=>({id:p.id,href:t.href,kind:t.kind}))));
 a.equal(refresh.preservedTutorialRoutes.length,77);a.equal(routes.length,78);
 for(const route of refresh.preservedTutorialRoutes)a.ok(routes.some(r=>JSON.stringify(r)===JSON.stringify(route)),route.id+': '+route.href);
 a.deepEqual(routes.filter(r=>!refresh.preservedTutorialRoutes.some(x=>JSON.stringify(x)===JSON.stringify(r))),[{id:'tradeoffs-causal-state-communication-2013',href:'causal-state-capacity.html#cc-question',kind:'algorithm'}]);
 const paper=tree.papers.find(p=>p.id==='tradeoffs-causal-state-communication-2013');a.match(paper.tutorials[0].label,/§IV.*1\/4/);
});
