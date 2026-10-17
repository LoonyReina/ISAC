'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=fs.existsSync(path.join(root,'content/pages/full-duplex-cancellation.html')),runtime=source?'labs/full-duplex':'full-duplex',support=source?runtime:'tests/full-duplex';
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
test('full-duplex integrated runtime and independent reference retain accepted bytes',()=>{
 const p=JSON.parse(read(support+'/SOURCE-IMPORT.json'));a.equal(p.baselineCommit,'ed77780b2d392503fcfe22b876f5328717a0b538');
 a.equal(p.runtime['kernel.mjs'],'441bf5a359dba43b3abcad1bc8289708da34680928901104463714f146a2fbe0');
 a.equal(p.runtime['controller.mjs'],'0df645720137d7ccf60168c675bfab4279bd4cdb72ad2dd7fb754b6a5d33ab41');
 for(const[f,h]of Object.entries(p.runtime))a.equal(sha(read(runtime+'/'+f)),h,f);
 for(const[f,h]of Object.entries(p.reference))a.equal(sha(read(support+'/reference/'+f)),h,f);
});
test('full-duplex accepted UI lifecycle and 614 independent scalar checks execute against integrated kernel',t=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'isac-fd-numerical-'));t.after(()=>fs.rmSync(out,{recursive:true,force:true}));
 for(const f of ['app.mjs','controller.mjs','worker.mjs','kernel.mjs'])fs.copyFileSync(path.join(root,runtime,f),path.join(out,f));
 for(const f of ['test.mjs','test-worker-bridge.mjs'])fs.copyFileSync(path.join(root,support,'tests',f),path.join(out,f));
 const run=f=>{const x=cp.spawnSync(process.execPath,[f],{cwd:out,encoding:'utf8',timeout:120000});a.equal(x.status,0,x.stdout+x.stderr);return x.stdout;};
 const ui=run('test.mjs');a.equal(JSON.parse(ui).checks,43);a.equal(JSON.parse(ui).status,'PASS');t.diagnostic(ui);
 for(const f of ['test_kernel.mjs','fixtures.json'])fs.copyFileSync(path.join(root,support,'reference',f),path.join(out,f));
 const numerical=run('test_kernel.mjs');a.match(numerical,/PASS 614 scalar parity checks/);t.diagnostic(numerical);
});
test('full-duplex is one bounded lesson on the existing canonical paper and retains resource caveats',()=>{
 const r=JSON.parse(read(source?'content/data/registry.json':'site/registry.json')),g=JSON.parse(read(source?'content/data/research-guides.json':'site/research-guides.json')),d=JSON.parse(read(source?'content/data/research-directory.json':'site/research-directory.json'));
 const c=r.cases.filter(c=>c.id==='case-ofdm-interpolation');a.equal(c.length,1);a.equal(c[0].paper,'ofdm-interpolation.html#paper');a.equal(c[0].algorithmLessons.length,1);
 const tree=require(source?'../scripts/site/research-tree.cjs':'../scripts/research-tree.cjs').buildResearchTree(r,g,d,JSON.parse(read('docs/PAPER-EXECUTION-BACKLOG.json')));
 a.equal(tree.papers.length,35);const papers=tree.papers.filter(p=>p.catalogIds.includes('ofdm_full_duplex'));a.equal(papers.length,1);const lesson=papers[0].tutorials.filter(t=>t.href==='full-duplex-cancellation.html#fd-question');a.equal(lesson.length,1);a.equal(lesson[0].kind,'algorithm');a.equal(lesson[0].evidenceScope,'bounded-algorithm-lesson');a.equal(papers[0].status,'adapted-mechanism');a.equal(tree.papers.filter(p=>p.status==='bounded-core').length,21);const rendered=require(source?'../scripts/site/research-tree.cjs':'../scripts/research-tree.cjs').renderResearchTree(tree);a.match(rendered,/有界算法课，范围见入口；不是整篇复现/);const graph=read(source?'features/research-reading/research-tree.js':'research-tree.js');a.ok(graph.includes("primary.evidenceScope==='bounded-algorithm-lesson'?'打开有界算法课'"));a.ok(graph.includes('有界算法课 · 范围见入口，不是整篇复现'));a.ok(papers[0].tutorials.some(t=>t.href==='ofdm-interpolation.html#paper'));
 a.equal(r.pages.filter(p=>p.path==='full-duplex-cancellation.html').length,1);a.equal(r.pages.find(p=>p.path==='full-duplex-cancellation.html').stage,'reading');a.equal(r.lessonPlacement.find(p=>p.canonicalHref==='full-duplex-cancellation.html#fd-question').section,'reading');
 const p=read(source?'content/pages/full-duplex-cancellation.html':'full-duplex-cancellation.html');for(const word of ['fd-question','fd-source','fd-experiment','资源公平','目标擦除','4 / 12','4096','60 秒','Eq. (12)','0.15 + 0.05j','零多普勒','不是检测概率','ofdm-interpolation.html#mechanism','reading.html#paper-ofdm_full_duplex','site-main'])a.ok(p.includes(word),word);
 const ids=[...p.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);a.equal(ids.length,new Set(ids).size);
 const css=read(runtime+'/style.css');for(const m of css.matchAll(/([^{}]+)\{/g))if(!m[1].trim().startsWith('@'))for(const s of m[1].split(','))a.ok(s.trim().startsWith('.fd-lesson'),s);
});
test('full-duplex current dependency gate rejects missing, changed, duplicate and unlisted runtime and page assets',()=>{
 const C=require('../scripts/build/full-duplex-dependencies.cjs'),parse=require('../scripts/build/module-dependencies.cjs').staticModuleDependencies;
 const modules=C.contract.modules.map(m=>({file:m.public,source:read(runtime+'/'+path.basename(m.public))})),page={file:C.contract.entryPoint,source:read(source?'content/pages/'+C.contract.entryPoint:C.contract.entryPoint)},ids=[...C.contract.modules,...C.contract.assets].map(f=>({file:f.public,sha256:sha(read(runtime+'/'+path.basename(f.public)))}));ids.push({file:page.file,sha256:sha(page.source)});
 const gate=(ms=modules,is=ids,ps=[page])=>C.fullDuplexDependencies(ms,is,ps,parse);a.ok(gate().some(e=>e.url==='./worker.mjs'));
 a.throws(()=>gate(modules.slice(1)));a.throws(()=>gate([...modules,modules[0]]));a.throws(()=>gate(modules,ids.slice(1)));a.throws(()=>gate(modules,[...ids,ids[0]]));a.throws(()=>gate(modules,[...ids,{file:'full-duplex/unreviewed.css',sha256:'0'.repeat(64)}]));
 const changed=structuredClone(modules);changed[0].source+='\n';a.throws(()=>gate(changed));const moved=structuredClone(ids);moved[0].file='full-duplex/moved.mjs';a.throws(()=>gate(modules,moved));const changedCss=structuredClone(ids);changedCss.find(i=>i.file.endsWith('.css')).sha256='0'.repeat(64);a.throws(()=>gate(modules,changedCss));
 for(const suffix of ['<script src="extra.js"></script>','<iframe src="https://example.com"></iframe>','<p>changed scientific claim</p>']){const p={...page,source:page.source+suffix},i=ids.map(x=>x.file===p.file?{...x,sha256:sha(p.source)}:x);a.throws(()=>gate(modules,i,[p]));}
});
