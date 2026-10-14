'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),lab=path.join(root,'labs/waveform-design/cmc'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
test('CMC keeps accepted numerical and diagram sources and original sections III/IV byte-identical',()=>{
 const receipt=require('../labs/waveform-design/cmc/SOURCE-IMPORT.json');
 for(const f of ['cmc-core.mjs','cmc-worker.mjs','phase-diagram.mjs'])a.equal(sha(fs.readFileSync(path.join(lab,f))),receipt.sourceFreeze[f]);
 const page=fs.readFileSync(path.join(root,'waveform-design.html'),'utf8');
 for(const [id,hash] of Object.entries(receipt.preservedSections)){const section=page.match(new RegExp('<section\\b[^>]*id="'+id+'".*?</section>','s'));a.ok(section,id);a.equal(sha(section[0]),hash,id);}
 a.match(page,/id="constant-modulus"/);a.doesNotMatch(page,/§V 常模设计尚未实现/);
});
test('CMC teaching production links stay within project prefix and preserve anchors',()=>{
 const html=fs.readFileSync(path.join(lab,'index.html'),'utf8');
 for(const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){if(/^https?:/.test(m[1]))continue;const u=new URL(m[1],'https://test.invalid/ISAC/labs/waveform-design/cmc/index.html');a.ok(u.pathname.startsWith('/ISAC/'));const f=path.join(root,decodeURIComponent(u.pathname.slice(6)));a.ok(fs.existsSync(f),m[1]);if(u.hash)a.ok(fs.readFileSync(f,'utf8').includes('id="'+u.hash.slice(1)+'"'),m[1]);}
 a.match(html,/1711\.05220v1/);a.match(html,/非区间算术严格证书/);a.match(fs.readFileSync(path.join(lab,'lesson.mjs'),'utf8'),/JSON.stringify\(record/);
});
test('CMC numerical, actual worker, diagrams and lifecycle tests run without writing staged sources',{timeout:180000},()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'isac-cmc-'));
 try{for(const name of ['test-core.mjs','test-worker.mjs','test-diagrams.mjs']){const env={...process.env,ISAC_TEST_OUTPUT:temp};delete env.NODE_TEST_CONTEXT;const run=spawnSync(process.execPath,[path.join(lab,'tests',name)],{env,encoding:'utf8',timeout:55000,maxBuffer:4*1024*1024});a.equal(run.status,0,run.stdout+'\n'+run.stderr);}for(const name of ['TEST-RESULT.json','WORKER-RESULT.json','DIAGRAM-TEST-RESULT.json'])a.ok(fs.statSync(path.join(temp,name)).size>0);}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
