'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=fs.existsSync(path.join(root,'content/pages/cooperative-rate.html')),runtime=source?'labs/cooperative-clusters/rate':'cooperative-rate',support=source?runtime:'tests/cooperative-rate';
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
test('rate scientific and browser-corrected runtime bytes retain accepted identity',()=>{
 const provenance=JSON.parse(read(support+'/SOURCE-IMPORT.json'));a.equal(provenance.prototypeManifestSha256,'1924c4ede7a751dbd1384f24366acd12f33b3d4cd80067336f4ba5b53c57b841');
 for(const [f,h] of Object.entries(provenance.runtime))a.equal(sha(read(runtime+'/'+f)),h,f);
 a.match(read(runtime+'/controller.mjs'),/globalThis.setTimeout/);
 for(const [f,h] of Object.entries(provenance.reference))a.equal(sha(read(support+'/reference/'+f)),h,f);
});
test('accepted UI suite and all 35 independent reference points run against integrated runtime',t=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'isac-rate-tests-'));t.after(()=>fs.rmSync(out,{recursive:true,force:true}));
 for(const f of ['app.mjs','controller.mjs','transport.mjs','worker.mjs','kernel.mjs'])fs.copyFileSync(path.join(root,runtime,f),path.join(out,f));
 for(const f of ['test.mjs','test-worker-adapter.mjs'])fs.copyFileSync(path.join(root,support,'tests',f),path.join(out,f));
 let run=cp.spawnSync(process.execPath,['--test','test.mjs'],{cwd:out,encoding:'utf8',timeout:90000});a.equal(run.status,0,run.stdout+run.stderr);t.diagnostic(run.stdout);
 for(const f of ['test.mjs','python-parity-reference.json'])fs.copyFileSync(path.join(root,support,'reference',f),path.join(out,f));
 run=cp.spawnSync(process.execPath,['test.mjs'],{cwd:out,encoding:'utf8',timeout:90000});a.equal(run.status,0,run.stdout+run.stderr);t.diagnostic(run.stdout);
});
test('separate rate lesson keeps canonical paper and explicit scientific boundary',()=>{
 const p=read(source?'content/pages/cooperative-rate.html':'cooperative-rate.html'),r=JSON.parse(read(source?'content/data/registry.json':'site/registry.json')),g=JSON.parse(read(source?'content/data/research-guides.json':'site/research-guides.json'));
 a.equal(r.pages.filter(p=>p.path==='cooperative-rate.html').length,1);a.equal(r.pages.find(p=>p.path==='cooperative-rate.html').stage,'reading');a.equal(r.lessonPlacement.find(p=>p.canonicalHref==='cooperative-rate.html#cr-question').section,'reading');
 const cards=g.cards.filter(c=>c.id==='networks-cooperative-clusters-2024');a.equal(cards.length,1);a.equal(cards[0].executable.href,'cooperative-clusters.html#cf-question');a.ok(cards[0].sublessons.some(s=>s.href==='cooperative-rate.html#cr-question'&&s.kind==='independent-model'));
 for(const phrase of ['非论文复现','κ 由你指定，不由负载课计算','Theorem 2','两者不能相加','60 秒','site-main','cr-question','cr-source','cooperative-clusters.html#cl-question'])a.ok(p.includes(phrase),phrase);
 const ids=[...p.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);a.equal(ids.length,new Set(ids).size);
 const css=read(runtime+'/style.css');for(const m of css.matchAll(/([^{}]+)\{/g))if(!m[1].trim().startsWith('@'))for(const s of m[1].split(','))a.ok(s.trim().startsWith('.cr-lesson'),s);
 const tree=require(source?'../scripts/site/research-tree.cjs':'../scripts/research-tree.cjs').buildResearchTree(r,g,JSON.parse(read(source?'content/data/research-directory.json':'site/research-directory.json')),JSON.parse(read('docs/PAPER-EXECUTION-BACKLOG.json')));
 a.equal(tree.papers.length,35);a.equal(tree.papers.filter(p=>p.id==='networks-cooperative-clusters-2024').length,1);a.ok(tree.papers.find(p=>p.id==='networks-cooperative-clusters-2024').tutorials.some(t=>t.href==='cooperative-rate.html#cr-question'&&t.kind==='independent-model'));
});
test('rate historical inverse preserves exact predecessors and rejects altered endpoints',()=>{
 const P=require('./helpers/cooperative-rate-preservation.cjs');
 for(const row of P.delta.files.filter(r=>!source||r.path!=='reading.html')){const current=read(source?row.path:row.compatibility);a.ok(P.identity(P.withoutFile(source?row.path:row.compatibility,Buffer.from(current)),row.before));a.throws(()=>P.withoutFile(row.path,Buffer.from(current+'unreviewed')));}
 const c=JSON.parse(read('scripts/build/module-runtime-contracts.json'));a.equal(P.withoutContracts(c).modules.length,P.delta.priorModuleCount);const bad=structuredClone(c);bad.modules.at(-1).sha256='0'.repeat(64);a.throws(()=>P.withoutContracts(bad));
 const r=JSON.parse(read(source?'content/data/registry.json':'site/registry.json'));const prior=P.withoutRegistry(r);for(const row of P.delta.registryAdditions)a.equal(prior[row.key].length,row.priorLength);r.pages.at(-1).stage='foundations';a.throws(()=>P.withoutRegistry(r));
 const g=JSON.parse(read(source?'content/data/research-guides.json':'site/research-guides.json'));a.deepEqual(P.withoutGuides({cards:[]}),{cards:[]});const duplicate=structuredClone(g);duplicate.cards.push(structuredClone(duplicate.cards.find(c=>c.id==='networks-cooperative-clusters-2024')));a.throws(()=>P.withoutGuides(duplicate));a.ok(!P.withoutGuides(g).cards.find(c=>c.id==='networks-cooperative-clusters-2024').sublessons);g.cards.find(c=>c.id==='networks-cooperative-clusters-2024').sublessons[1].scope='unreviewed';a.throws(()=>P.withoutGuides(g));
 if(source){const m=JSON.parse(read('build/compatibility-manifest.json'));a.equal(P.sha(JSON.stringify(P.withoutMappings(m),null,2)+'\n'),P.delta.priorManifestSha256);for(const row of P.delta.addedEntries){const bad=structuredClone(m);bad.entries.find(e=>e.source===row.source).public='unreviewed';a.throws(()=>P.withoutMappings(bad));}}
});
