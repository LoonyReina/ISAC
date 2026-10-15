'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const sourceLayout=fs.existsSync(path.join(root,'content/pages/cooperative-clusters.html'));
const read=f=>fs.readFileSync(path.join(root,sourceLayout?f:f.replace('content/data/','site/').replace('content/pages/','')),'utf8');
test('same canonical cooperative paper routes first to its bounded model without identity inflation',()=>{
 const r=JSON.parse(read('content/data/registry.json')),g=JSON.parse(read('content/data/research-guides.json')),b=JSON.parse(read('docs/PAPER-EXECUTION-BACKLOG.json')),d=JSON.parse(read('content/data/research-directory.json'));
 const B=require(sourceLayout?'../scripts/site/research-tree.cjs':'../scripts/research-tree.cjs'),tree=B.buildResearchTree(r,g,d,b),p=tree.papers.find(p=>p.id==='networks-cooperative-clusters-2024');
 a.equal(tree.papers.length,35);a.equal(tree.counts.guides,21);a.equal(p.tutorials[0].href,'cooperative-clusters.html#cf-question');a.match(p.tutorials[0].label,/模型/);a.match(p.boundary,/N=2/);a.equal(p.status,'bounded-core');
 const c=g.cards.find(c=>c.id===p.id);a.equal(c.executable.kind,'validated-paper-model');a.equal(c.executable.coverage,'bounded-model');a.equal(c.source.url,'https://arxiv.org/pdf/2403.20228v3');
 const row=b.papers.find(x=>x.id===p.id);a.equal(row.stages.fullPaper,'not-reproduced');a.equal(row.stages.latency,'not-measured');a.equal(row.realtime.measuredLatencyMs,null);a.equal(row.stages.liveExecution,'partial-core');
 a.equal(r.pages.filter(p=>p.path==='cooperative-clusters.html').length,1);a.ok(r.lessonPlacement.some(p=>p.canonicalHref==='cooperative-clusters.html#cf-question'&&p.section==='reading'));
 const page=read('content/pages/cooperative-clusters.html');for(const phrase of ['cf-question','prerequisites','N=2','N≥3','非定位接收机','归一化','site-main'])a.ok(page.includes(phrase),phrase);a.ok(page.includes('reading.html#guide-networks-cooperative-clusters-2024'));
});
test('unchanged lesson-owned model/controller/Worker/view/UI tests run against current mapped production bytes',t=>{
 const overlay=fs.mkdtempSync(path.join(os.tmpdir(),'isac-cooperative-tests-'));t.after(()=>fs.rmSync(overlay,{recursive:true,force:true}));
 const runtime=['core','model','controller','worker','view','ui'].map(n=>'cooperative-fim-'+n+'.mjs').concat('cooperative-fim.css');
 const copy=(from,to)=>{const dest=path.join(overlay,to);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,from),dest);};
 for(const file of runtime)copy(sourceLayout?'labs/cooperative-clusters/'+file:file,'labs/cooperative-clusters/'+file);
 copy(sourceLayout?'content/pages/cooperative-clusters.html':'cooperative-clusters.html','content/pages/cooperative-clusters.html');copy('assets/data/cooperative-fim-retained-coordinates.json','assets/data/cooperative-fim-retained-coordinates.json');
 const testDir=sourceLayout?'labs/cooperative-clusters/tests':'tests/cooperative-clusters';const names=fs.readdirSync(path.join(root,testDir)).filter(f=>f.endsWith('.test.mjs')).sort();a.ok(names.length>=4);
 for(const file of names)copy(testDir+'/'+file,'tests/'+file);
 const result=cp.spawnSync(process.execPath,['--test','--test-reporter=tap','--test-concurrency=1',...names.map(n=>'tests/'+n)],{cwd:overlay,encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024,env:{...process.env,NODE_TEST_CONTEXT:undefined}});
 a.equal(result.status,0,result.stdout+'\n'+result.stderr);a.match(result.stdout,/# fail 0/);t.diagnostic(result.stdout.slice(result.stdout.lastIndexOf('1..')));
});
