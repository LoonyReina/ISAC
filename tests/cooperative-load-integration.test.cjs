'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=fs.existsSync(path.join(root,'content/pages/cooperative-clusters.html'));
const load=source?'labs/cooperative-clusters/load':'cooperative-load',support=source?load:'tests/cooperative-load';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('load mapped scientific ESM matches pinned originals and retained CJS references',t=>{
 const manifest=JSON.parse(read(support+'/SOURCE-IMPORT.json'));for(const [name,hash]of Object.entries(manifest.scientificFiles))a.equal(crypto.createHash('sha256').update(read(load+'/'+name)).digest('hex'),hash);
 for(const [name,hash]of Object.entries(manifest.referenceCjs))a.equal(crypto.createHash('sha256').update(read(support+'/reference/'+name)).digest('hex'),hash);
 const overlay=fs.mkdtempSync(path.join(os.tmpdir(),'isac-load-tests-'));t.after(()=>fs.rmSync(overlay,{recursive:true,force:true}));
 const copy=(from,to)=>{fs.mkdirSync(path.dirname(path.join(overlay,to)),{recursive:true});fs.copyFileSync(path.join(root,from),path.join(overlay,to));};
 for(const n of ['app.mjs','controller.mjs','load-adapter.mjs','subset-adapter.mjs','request-scheduler.mjs','presets.mjs'])copy(load+'/'+n,n);
 for(const n of Object.keys(manifest.referenceCjs))copy(support+'/reference/'+n,'reference/'+n);
 for(const n of ['test-ui-state.mjs','test-esm-parity.mjs']){copy(support+'/tests/'+n,'tests/'+n);const result=cp.spawnSync(process.execPath,['tests/'+n],{cwd:overlay,encoding:'utf8',timeout:30000});a.equal(result.status,0,result.stdout+result.stderr);t.diagnostic(result.stdout.trim());}
});
test('load section has isolated bindings, independent scope and retained canonical FIM controls',()=>{
 const page=read(source?'content/pages/cooperative-clusters.html':'cooperative-clusters.html'),app=read(load+'/app.mjs'),css=read(load+'/style.css');
 const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);a.equal(ids.length,new Set(ids).size);
 const section=page.slice(page.indexOf('<section id="cl-question"'),page.indexOf('<!-- SITE:NEXT:START -->'));
 for(const id of [...section.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]))a.ok(id.startsWith('cl-'));
 for(const id of ['cf-question','cf-run','cf-cancel','cf-reset','cf-download','cl-question','cl-run','cl-cancel','cl-reset','cl-download'])a.ok(ids.includes(id),id);
 a.match(app,/root\.querySelector\("#cl-"\+id\)/);a.match(app,/pagehide/);a.match(app,/state.phase!=='complete'/);a.match(app,/URL.revokeObjectURL/);
 a.ok(!/:root|(?:^|[{}])\s*(?:body|main)\s*\{/.test(css));
 for(const match of css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{/g))if(!match[1].trim().startsWith('@'))for(const selector of match[1].split(','))a.ok(selector.trim().startsWith('.cl-lesson'),selector);
 a.match(css,/button\.cl-secondary/);a.ok(!/button\.secondary/.test(css));a.match(section,/class="cl-secondary"/);
 a.match(css,/\.cl-lesson details\{background:#0f1a29;color:#e4edf6/);a.match(css,/\.cl-lesson details>summary\{background:transparent;color:#bdd3e7/);
 for(const phrase of ['独立固定负载教学扩展','不推定作者原意','不是定位误差或接收机 RMSE','有限 32 位','扩展无条件界','Eq.24'])a.ok(page.includes(phrase),phrase);
 const r=JSON.parse(read(source?'content/data/registry.json':'site/registry.json'));a.equal(r.lessonPlacement.find(x=>x.canonicalHref==='cooperative-clusters.html#cl-question').section,'reading');a.ok(r.lessonPlacement.some(x=>x.canonicalHref==='cooperative-clusters.html#cf-question'));
});
