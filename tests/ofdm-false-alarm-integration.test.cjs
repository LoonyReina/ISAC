'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),lesson=path.join(root,'labs/ofdm-ici/false-alarm'),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
test('OFDM production preserves source identity and shared frozen runtime without large smoke payload',()=>{
 const receipt=require('../labs/ofdm-ici/false-alarm/SOURCE-IMPORT.json');a.equal(receipt.baseCommit,'581c838cb73b8b5935358ebbf741a7f0f2d86198');a.equal(receipt.sourceManifestSha256,'8ba833108416383da424e883bd7a7873a60b95e71d69c97c25207af3f354f431');
 for(const f of require('../labs/ofdm-ici/runtime/SOURCE-FREEZE.json').runtime_files)a.equal(hash(path.join(root,'labs/ofdm-ici/runtime',f.path)),f.sha256);
 for(const file of ['style.css'])a.equal(hash(path.join(lesson,file)),receipt.inputs.find(x=>x.path===file).sha256);
 a.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(lesson,'presentation.js'),'utf8').replace("require('./adapter.js')","require('./adapter')")).digest('hex'),receipt.inputs.find(x=>x.path==='presentation.js').sha256);
 a.equal(fs.existsSync(path.join(lesson,'runtime')),false);a.equal(fs.existsSync(path.join(lesson,'SMOKE-EVIDENCE.json')),false);
});
test('nested teaching page has complete local links and document-relative Worker path',()=>{
 const html=fs.readFileSync(path.join(lesson,'index.html'),'utf8');
 for(const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){if(/^https?:/.test(m[1]))continue;const u=new URL(m[1],'https://test.invalid/ISAC/labs/ofdm-ici/false-alarm/index.html');a.ok(u.pathname.startsWith('/ISAC/'));const f=path.join(root,decodeURIComponent(u.pathname.slice('/ISAC/'.length)));a.ok(fs.existsSync(f),m[1]);if(u.hash)a.ok(fs.readFileSync(f,'utf8').includes('id="'+u.hash.slice(1)+'"'),m[1]);}
 a.match(fs.readFileSync(path.join(lesson,'app.js'),'utf8'),/new Worker\('\.\.\/runtime\/worker\/ici-worker\.js'\)/);
 a.match(html,/H0/);a.match(html,/2103\.15694v1/);a.match(html,/5% 只是目标/);
});
test('curated lesson passes all 20 source and lifecycle tests including actual Worker and writes evidence only outside source',{timeout:180000},()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'isac-ofdm-h0-'));
 try{const env={...process.env,ISAC_TEST_OUTPUT:temp};delete env.NODE_TEST_CONTEXT;const result=spawnSync(process.execPath,['--test','--test-reporter=tap','test.cjs','test-ui.cjs','test-presentation.cjs'],{cwd:lesson,env,encoding:'utf8',timeout:165000,maxBuffer:8*1024*1024});a.equal(result.status,0,result.stdout+'\n'+result.stderr);a.match(result.stdout,/# tests 20/);a.ok(fs.statSync(path.join(temp,'SMOKE-EVIDENCE.json')).size>0);a.equal(fs.existsSync(path.join(lesson,'SMOKE-EVIDENCE.json')),false);}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('nested HTML pages and anchors remain strictly validated, including duplicate IDs and escapes',()=>{
 const {createBuildLinkValidationContext}=require('../scripts/learning-entry.cjs');
 const root='<a href="labs/lesson/index.html#run">lesson</a>',nested='<div id="run"></div><a href="../../index.html">home</a>';
 createBuildLinkValidationContext().validateOutputs(new Map([['index.html',root],['labs/lesson/index.html',nested]]));
 for(const bad of ['<div id="other"></div>','<div id="run"></div><div id="run"></div>','<div id="run"></div><a href="../../../escape.html">bad</a>'])a.throws(()=>createBuildLinkValidationContext().validateOutputs(new Map([['index.html',root],['labs/lesson/index.html',bad]])));
 a.throws(()=>createBuildLinkValidationContext().validateOutputs(new Map([['../escape.html','<p>bad</p>']])));
});
