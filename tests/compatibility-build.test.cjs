'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const M=require('../scripts/build/compatibility.cjs'),A=require('../scripts/build/migration-audit.cjs');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'build/compatibility-manifest.json'),'utf8'));
const baseline=JSON.parse(fs.readFileSync(path.join(root,'build/migration-baseline.json'),'utf8'));
function temp(t){const p=fs.mkdtempSync(path.join(os.tmpdir(),'isac-build-test-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;}
function changed(fn){const m=structuredClone(manifest);fn(m);return m;}
function fixture(t){const p=temp(t);for(const e of manifest.entries.filter(e=>e.source!==null)){const dest=path.join(p,e.source);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,e.source),dest);}return p;}
function source(p,compatibility){return path.join(p,manifest.entries.find(e=>e.compatibility===compatibility).source);}
function sourceRecords(p){return manifest.entries.filter(e=>e.source!==null).map(e=>({path:e.source,sha256:M.sha(fs.readFileSync(path.join(p,e.source)))})).sort((a,b)=>a.path.localeCompare(b.path));}
function auditFixture(){
 // Model the historical migration independently of today's editable content.
 const deltas={schemaVersion:1,entries:A.MAINTAINER_DOCUMENTS.map(compatibility=>({compatibility,beforeSha256:baseline.entries.find(e=>e.compatibility===compatibility).sha256,afterSha256:M.sha('approved migration doc: '+compatibility)}))};
 const buildDeltas={schemaVersion:1,entries:A.BUILD_FILES.map(compatibility=>({compatibility,beforeSha256:baseline.entries.find(e=>e.compatibility===compatibility).sha256,afterSha256:M.sha('approved build refactor: '+compatibility)}))};
 const docs=new Map([...deltas.entries,...buildDeltas.entries].map(e=>[e.compatibility,e.afterSha256]));
 const records=key=>baseline.entries.filter(e=>e[key]!==null).map(e=>({path:e[key],sha256:docs.get(e.compatibility)||e.sha256}));
 return {manifest:{entries:baseline.entries.map(e=>({compatibility:e.compatibility,public:e.public}))},baseline:structuredClone(baseline),deltas,buildDeltas,inputs:records('compatibility'),generated:records('compatibility'),publicRecords:records('public')};
}

test('editable map explicitly owns legacy paths, declared generated outputs and directly linked evidence',()=>{
 a.equal(M.validateManifest(manifest,root),manifest);a.equal(manifest.schemaVersion,2);
 a.deepEqual(manifest.entries.filter(e=>e.public===null).map(e=>e.compatibility),['.gitignore','labs/otfs-receiver/communication/node-worker.mjs','labs/otfs-receiver/sensing/node-worker.mjs','tests/otfs-lesson-controller.test.cjs','tests/otfs-lesson-independent.test.cjs','tests/otfs-lesson-model.test.cjs','tests/otfs-lesson-page.test.cjs']);
 a.equal(manifest.entries.filter(e=>e.role==='generated').length,9);a.ok(manifest.entries.filter(e=>e.role==='generated').every(e=>e.source===null));
 a.deepEqual(fs.readdirSync(path.join(root,'build/compatibility-seeds')),['project.gitignore']);
 for(const f of ['tests/crb-beamforming.test.cjs','tests/crb-beamforming-ui.test.cjs','tests/joint-beamforming.test.cjs','scripts/shared-array-reference/source-audit.md','scripts/generate-waveform.py','data/waveform-states.json'])a.ok(manifest.entries.some(e=>e.public===f),f);
 for(const f of ['scripts/build-compatibility.cjs','scripts/build/compatibility.cjs','scripts/build/migration-audit.cjs','tests/compatibility-build.test.cjs','build/compatibility-manifest.json','build/migration-baseline.json','build/migration-maintainer-deltas.json','build/migration-build-deltas.json'])a.ok(!manifest.entries.some(e=>e.public===f),'build machinery is not auto-published');
 a.deepEqual(new Set(manifest.owners.map(o=>o.id.split('/')[0])),new Set(['content','features','labs','shared','validators']));
 a.ok(manifest.entries.some(e=>e.source!==null&&e.source!==e.compatibility&&e.source.startsWith('labs/')));
 a.deepEqual(fs.readdirSync(root).filter(f=>f!=='.git'&&fs.lstatSync(path.join(root,f)).isFile()).sort(),['.gitignore','.nojekyll','AGENTS.md','README.md']);
 const pages=manifest.entries.filter(e=>/^[^/]+\.html$/.test(e.compatibility));a.ok(pages.length>0);a.ok(pages.every(e=>e.role==='generated'&&e.source===null||e.source!==null&&e.source.startsWith('content/pages/')));
 a.ok(!fs.readdirSync(root).some(f=>/\.(?:html|js|css)$/.test(f)));
});

test('map rejects malformed versions, obsolete hashes, extra fields and ownership',()=>{
 for(const fn of [m=>{m.schemaVersion=1;},m=>{m.baselineRevision='a'.repeat(40);},m=>{m.entries=null;},m=>{m.entries[0].extra=true;},m=>{m.entries[0].sha256='0'.repeat(64);},m=>{m.entries[0].plannedSource='old';},m=>{m.entries[0].owner='unknown';},m=>{m.entries[0].role='inferred';},m=>{m.owners.push({...m.owners[0]});},m=>{m.owners[0].plannedDirectory='old';},m=>{m.owners[0].description=' ';}])a.throws(()=>M.validateManifest(changed(fn),root));
});

test('all mapped paths reject escape, absolute, hidden, encoded and platform-ambiguous paths',()=>{
 const invalid=['../index.html','/tmp/index.html','C:/index.html','a\\index.html','a/../index.html','a//index.html','./index.html','a/./index.html','%2e%2e/index.html','index.html?token=x','index.html#fragment','a\0b','.env','.git/config','node_modules/x.js','NODE_MODULES/x.js','CON','nul.txt','trailing./file'];
 for(const value of invalid){for(const key of ['source','compatibility','public'])a.throws(()=>M.validateManifest(changed(m=>{m.entries[0][key]=value;}),root),/Unsafe/);a.throws(()=>M.validateManifest(changed(m=>{m.owners[0].directory=value;}),root),/Unsafe/);}
});

test('duplicate and file-directory collisions cannot silently overwrite mapped files',()=>{
 for(const key of ['source','compatibility','public']){
  a.throws(()=>M.validateManifest(changed(m=>{m.entries[2][key]=m.entries[3][key];}),root),/Duplicate/);
  a.throws(()=>M.validateManifest(changed(m=>{m.entries[2][key]='FILE';m.entries[3][key]='file/child';}),root),/collision/);
  a.throws(()=>M.validateManifest(changed(m=>{m.entries[2][key]='FILE';m.entries[3][key]='file';}),root),/Duplicate/);
 }
});

test('build dependencies must be explicit and missing or symlinked sources fail closed',t=>{
 for(const f of ['scripts/generate-site.cjs','scripts/generate-waveform.py','scripts/knowledge-map.cjs','scripts/research-guides.cjs','site/registry.json','.nojekyll'])a.throws(()=>M.validateManifest(changed(m=>{m.entries=m.entries.filter(e=>e.compatibility!==f);}),root),/Missing build input/);
 a.throws(()=>M.validateManifest(changed(m=>{m.entries[0].source='missing-source';}),root),/Missing source/);
 const p=temp(t);fs.symlinkSync(source(root,'.gitignore'),path.join(p,'linked-ignore'));a.throws(()=>M.validateManifest(changed(m=>{m.entries[0].source='linked-ignore';}),p),/Symlink source/);
 fs.symlinkSync(root,path.join(p,'linked'));a.throws(()=>M.validateManifest(changed(m=>{m.entries[0].source='linked/README.md';}),p),/Symlink source/);
 fs.symlinkSync(path.join(p,'missing'),path.join(p,'dangling'));a.throws(()=>M.validateManifest(changed(m=>{m.entries[0].source='dangling';}),p),/Symlink source/);
 fs.mkdirSync(path.join(p,'directory'));a.throws(()=>M.validateManifest(changed(m=>{m.entries[0].source='directory';}),p),/regular file/);
});

test('output roots, inputs and symlink ancestors cannot become write destinations',t=>{
 const p=temp(t),other=temp(t);fs.symlinkSync(other,path.join(p,'linked'));fs.symlinkSync(path.join(p,'missing'),path.join(p,'dangling'));
 for(const output of [root,path.dirname(root),source(root,'foundations.html'),path.dirname(source(root,'foundations.html')),path.join(p,'linked','dist'),path.join(p,'dangling')])a.throws(()=>M.build({root,manifest,output}),/Output/);
 a.deepEqual(fs.readdirSync(other),[]);
});

test('clean builds use current sources, preserve dependencies, reproduce independently and do not edit sources',t=>{
 const p=temp(t),out=path.join(p,'first'),second=path.join(p,'second'),before=sourceRecords(root);
 const first=M.build({root,manifest,output:out,reproducible:true});a.equal(first.compatibilityFiles,manifest.entries.length);a.equal(first.publicFiles,manifest.entries.filter(e=>e.public!==null).length);a.equal(first.htmlPages,manifest.entries.filter(e=>/^[^/]+\.html$/.test(e.public||'')).length);a.equal(first.reproducible,true);a.equal(first.tests,null);a.equal(first.migrationAudit,null);a.ok(first.dependencyEdges>2600);
 const next=M.build({root,manifest,output:second});a.equal(next.publicTreeSha256,first.publicTreeSha256);a.deepEqual(M.treeRecords(out),M.treeRecords(second));
 const edges=M.checkDependencies(out,manifest);for(const [from,to]of [['course.js','course-ui.js'],['course.js','velocity-core.js'],['course.js','velocity-bridge.js'],['waveform.js','data/waveform-states.json'],['reflection-aperture-core.js','multipath-channel-core.js']])a.ok(edges.some(e=>e.from===from&&e.to===to),from+' → '+to);a.ok(edges.some(e=>e.kind==='documentation'));
 const noRuntime=changed(m=>{m.entries=m.entries.filter(e=>e.public!=='velocity-core.js');});a.throws(()=>M.checkDependencies(out,noRuntime),/Unmapped public dependency/);
 a.deepEqual(sourceRecords(root),before);
});

test('ordinary CSS, fragment and handwritten edits need no fingerprint or seed rebaseline',t=>{
 const p=fixture(t),out=path.join(temp(t),'dist');
 fs.appendFileSync(source(p,'course.css'),'\n/* ordinary editable source */\n');fs.appendFileSync(source(p,'site/content-reading.html'),'\n<p id="editable-build-proof">Editable fragment proof</p>\n');
 fs.appendFileSync(source(p,'foundations.html'),'\n<!-- handwritten edit survives -->\n');
 const before=sourceRecords(p),result=M.build({root:p,manifest,output:out,reproducible:true});
 a.match(fs.readFileSync(path.join(out,'course.css'),'utf8'),/ordinary editable source/);a.match(fs.readFileSync(path.join(out,'reading.html'),'utf8'),/editable-build-proof/);a.match(fs.readFileSync(path.join(out,'foundations.html'),'utf8'),/handwritten edit survives/);a.match(fs.readFileSync(path.join(out,'index.html'),'utf8'),/<!doctype html>/i);
 a.equal(result.migrationAudit,null);a.deepEqual(sourceRecords(p),before);
 // The ordinary build did not need either historical audit file in this fixture.
 a.equal(fs.existsSync(path.join(p,'build/migration-baseline.json')),false);
 for(const name of ['migration-baseline.json','migration-maintainer-deltas.json','migration-build-deltas.json'])fs.copyFileSync(path.join(root,'build',name),path.join(p,'build',name));
 a.throws(()=>M.build({root:p,manifest,output:path.join(temp(t),'audit-dist'),auditMigration:true}),/Migration/);
 const historical=auditFixture();historical.inputs.find(e=>e.path==='course.css').sha256=M.sha(fs.readFileSync(source(p,'course.css')));a.throws(()=>A.auditMigration(historical),/Migration audit source bytes/);
});

test('--check is read-only and stale outputs can be replaced only as a complete validated tree',t=>{
 const p=fixture(t),out=path.join(temp(t),'dist');M.build({root:p,manifest,output:out});const initial=M.treeRecords(out),stamp=fs.statSync(path.join(out,'course.css')).mtimeMs;
 M.build({root:p,manifest,output:out,check:true});a.deepEqual(M.treeRecords(out),initial);a.equal(fs.statSync(path.join(out,'course.css')).mtimeMs,stamp);
 fs.appendFileSync(source(p,'course.css'),'\n/* new editable version */\n');a.throws(()=>M.build({root:p,manifest,output:out,check:true}),/output changed/);a.deepEqual(M.treeRecords(out),initial);a.equal(fs.statSync(path.join(out,'course.css')).mtimeMs,stamp);
 M.build({root:p,manifest,output:out});a.match(fs.readFileSync(path.join(out,'course.css'),'utf8'),/new editable version/);M.build({root:p,manifest,output:out,check:true});
 const next=M.treeRecords(out);M.build({root:p,manifest,output:out});a.deepEqual(M.treeRecords(out),next);a.deepEqual(fs.readdirSync(path.dirname(out)),['dist']);
 const missing=path.join(path.dirname(out),'not-created','dist');a.throws(()=>M.build({root:p,manifest,output:missing,check:true}),/does not exist/);a.equal(fs.existsSync(path.dirname(missing)),false);
});

test('replacement refuses unknown, missing, symlinked and non-directory output contents without deleting them',t=>{
 const p=temp(t),out=path.join(p,'dist');M.build({root,manifest,output:out});
 fs.writeFileSync(path.join(out,'private.txt'),'do not overwrite');for(const check of [false,true])a.throws(()=>M.build({root,manifest,output:out,check}),/Output file set/);a.equal(fs.readFileSync(path.join(out,'private.txt'),'utf8'),'do not overwrite');fs.rmSync(path.join(out,'private.txt'));
 fs.mkdirSync(path.join(out,'private-directory'));a.throws(()=>M.build({root,manifest,output:out}),/Unexpected output directory/);fs.rmdirSync(path.join(out,'private-directory'));
 const css=fs.readFileSync(path.join(out,'course.css'));fs.unlinkSync(path.join(out,'course.css'));a.throws(()=>M.build({root,manifest,output:out}),/Output file set/);fs.symlinkSync(source(root,'course.css'),path.join(out,'course.css'));a.throws(()=>M.build({root,manifest,output:out}),/symlink/);fs.unlinkSync(path.join(out,'course.css'));fs.writeFileSync(path.join(out,'course.css'),css);
 const file=path.join(p,'file');fs.writeFileSync(file,'retain');a.throws(()=>M.build({root,manifest,output:file}),/Output must be a directory/);a.equal(fs.readFileSync(file,'utf8'),'retain');
});

test('failed complete-tree publication restores the prior output and removes pending files',t=>{
 const p=fixture(t),out=path.join(temp(t),'dist');M.build({root:p,manifest,output:out});const prior=M.treeRecords(out);fs.appendFileSync(source(p,'course.css'),'\n/* replacement */\n');
 const rename=fs.renameSync;let injected=false;
 fs.renameSync=function(from,to){if(to===out&&path.basename(from).startsWith('.isac-dist-')){injected=true;throw Error('simulated publication failure');}return rename.apply(this,arguments);};
 try{a.throws(()=>M.build({root:p,manifest,output:out}),/simulated publication failure/);}finally{fs.renameSync=rename;}
 a.equal(injected,true);a.deepEqual(M.treeRecords(out),prior);a.deepEqual(fs.readdirSync(path.dirname(out)),['dist']);
});

test('generators may alter mapped root HTML and routes but cannot change protected files or add paths',t=>{
 const p=fixture(t),generator=source(p,'scripts/generate-site.cjs'),original=fs.readFileSync(generator,'utf8'),out=path.join(temp(t),'dist');
 for(const [mutation,error]of [["fs.appendFileSync(path.join(root,'course.css'),'/* forbidden */');",/protected source/],["fs.appendFileSync(path.join(root,'site/content-reading.html'),'<!-- forbidden -->');",/protected source/],["fs.writeFileSync(path.join(root,'unmapped.txt'),'unexpected');",/Output file set/],["fs.symlinkSync('course.css',path.join(root,'unmapped-link'));",/symlink/],["if(check)fs.appendFileSync(path.join(root,'index.html'),'<!-- check must not write -->');",/output changed/]]){
  fs.writeFileSync(generator,original+'\n'+mutation+'\n');a.throws(()=>M.build({root:p,manifest,output:out}),error);a.equal(fs.existsSync(out),false);
 }
});

test('legacy tests are rejected if they mutate even an otherwise generated staged page',t=>{
 const p=fixture(t),m=changed(m=>{m.entries=m.entries.filter(e=>!e.compatibility.startsWith('tests/'));});
 const file='tests/mutation.test.cjs';fs.mkdirSync(path.join(p,'tests'),{recursive:true});fs.writeFileSync(path.join(p,file),"require('node:test')('mutating test',()=>require('node:fs').appendFileSync(require('node:path').join(__dirname,'../index.html'),'<!-- forbidden test write -->'));\n");
 m.entries.push({source:file,compatibility:file,public:file,owner:manifest.owners[0].id,role:'source'});
 a.throws(()=>M.build({root:p,manifest:m,output:path.join(temp(t),'dist'),runTests:true}),/output changed/);
});

test('independent-build reproducibility rejects nondeterministic generated bytes',t=>{
 const p=fixture(t),generator=source(p,'scripts/generate-site.cjs');
 fs.writeFileSync(generator,"if(!process.argv.includes('--check')){\n"+fs.readFileSync(generator,'utf8').replace(/^#![^\n]*\n/,'')+"\nfs.appendFileSync('index.html','<!-- '+require('node:crypto').randomBytes(16).toString('hex')+' -->');\n}\n");
 a.throws(()=>M.build({root:p,manifest,output:path.join(temp(t),'dist'),reproducible:true}),/Independent clean builds differ/);
});

test('frozen audit independently retains full path/hash coverage including unlinked historical evidence',()=>{
 a.equal(A.validateBaseline(baseline),baseline);a.equal(baseline.entries.length,368);a.equal(baseline.entries.filter(e=>e.public!==null).length,367);
 for(const fn of [b=>{b.schemaVersion=2;},b=>{b.baselineRevision='a'.repeat(40);},b=>{b.entries[0].sha256='0'.repeat(64);},b=>{b.entries[0].extra=true;}]){const b=structuredClone(baseline);fn(b);a.throws(()=>A.validateBaseline(b));}
 for(const f of ['docs/GUIDED-NOTEBOOK-SHA256.txt','scripts/distributed-detection-independent/VALIDATION_REPORT.md','site/content-reading.html','tests/helpers/frontier-trace-preservation.cjs']){const b=structuredClone(baseline);a.ok(b.entries.some(e=>e.compatibility===f));b.entries=b.entries.filter(e=>e.compatibility!==f);a.throws(()=>A.validateBaseline(b),/baseline coverage/);const modeled=auditFixture();modeled.manifest.entries=modeled.manifest.entries.filter(e=>e.compatibility!==f);a.throws(()=>A.auditMigration(modeled),/full baseline coverage/);}
 const b=structuredClone(baseline);b.entries.find(e=>e.public==='scripts/generate-waveform.py').public=null;a.throws(()=>A.validateBaseline(b),/public baseline/);
});

test('migration exceptions are exactly three named documents with exact before/after hashes',()=>{
 const good=auditFixture();a.equal(A.auditMigration(good).baselineRevision,A.BASELINE.revision);
 for(const fn of [x=>{x.deltas.entries.pop();},x=>{x.deltas.entries.push({...x.deltas.entries[0]});},x=>{x.deltas.entries[0].compatibility='course.css';},x=>{x.deltas.entries[0].compatibility='docs/READING-MAP.md';},x=>{x.deltas.entries[0].beforeSha256='0'.repeat(64);},x=>{x.deltas.entries[0].afterSha256='0'.repeat(64);},x=>{x.deltas.entries[0].extra=true;}]){const x=auditFixture();fn(x);a.throws(()=>A.auditMigration(x));}
 for(const key of ['inputs','generated','publicRecords'])for(const file of ['README.md','docs/SITE-ARCHITECTURE.md','course.css','reading.html','scripts/generate-site.cjs']){const x=auditFixture();x[key].find(e=>e.path===file).sha256=M.sha('unapproved edit');a.throws(()=>A.auditMigration(x),/Migration audit/);}
});


test('editing a research-guide question updates reading.html without changing frozen audit data or seeds',t=>{
 const p=fixture(t),out=path.join(temp(t),'dist'),guide=source(p,'site/research-guides.json');
 const seeds=()=>fs.readdirSync(path.join(p,'build/compatibility-seeds'));
 const beforeSeeds=seeds();M.build({root:p,manifest,output:out});const before=M.treeRecords(out);
 const content=JSON.parse(fs.readFileSync(guide,'utf8'));content.cards[0].question+=' Editable research question proof';fs.writeFileSync(guide,JSON.stringify(content,null,2)+'\n');
 a.throws(()=>M.build({root:p,manifest,output:out,check:true}),/output changed/);a.deepEqual(M.treeRecords(out),before);
 M.build({root:p,manifest,output:out});a.match(fs.readFileSync(path.join(out,'reading.html'),'utf8'),/Editable research question proof/);a.deepEqual(seeds(),beforeSeeds);
 a.equal(fs.existsSync(path.join(p,'build/migration-baseline.json')),false);a.equal(fs.existsSync(path.join(p,'build/migration-maintainer-deltas.json')),false);
});


test('the migration allowance file retains only the reviewed maintainer-document hashes',()=>{
 const deltas=JSON.parse(fs.readFileSync(path.join(root,'build/migration-maintainer-deltas.json'),'utf8'));A.validateDeltas(deltas,baseline);
 a.deepEqual(Object.fromEntries(deltas.entries.map(e=>[e.compatibility,e.afterSha256])),{
  'README.md':'221611ac55fc968a0d86c32f0af1c06ce8d88f6878657eef57a6c067419b9efd',
  'AGENTS.md':'5a3a7779577eded6989db8e6d651f750f767f9c5434609efcc825aacce9f4f52',
  'docs/SITE-ARCHITECTURE.md':'35478597def2bf1c9bf17b344dd23c0e784389e0d9c4b847bc964e10758b4ded'
 });
});

test('a clean checkout generates all nine declared outputs without a prior dist or generated input',t=>{
 const p=fixture(t),out=path.join(temp(t),'fresh-dist');
 for(const e of manifest.entries.filter(e=>e.role==='generated')){
  a.equal(e.source,null);a.equal(fs.existsSync(path.join(p,e.compatibility)),false);a.equal(fs.existsSync(path.join(p,'build/compatibility-seeds',e.compatibility)),false);
 }
 a.equal(fs.existsSync(out),false);const result=M.build({root:p,manifest,output:out,reproducible:true});
 a.equal(result.htmlPages,manifest.entries.filter(e=>/^[^/]+\.html$/.test(e.public||'')).length);for(const e of manifest.entries.filter(e=>e.role==='generated'))a.ok(fs.statSync(path.join(out,e.public)).isFile());
 a.throws(()=>M.validateManifest(changed(m=>{m.entries.find(e=>e.role==='generated').source='build/compatibility-seeds/obsolete.html';}),root),/null source/);
 a.throws(()=>M.validateManifest(changed(m=>{const e=m.entries.find(e=>e.compatibility==='course.css');e.source=null;e.role='generated';}),root),/supported output/);
});

test('new guide and generated-page anchor resolve together; missing, removed and duplicate targets preserve old output',t=>{
 const p=fixture(t),out=path.join(temp(t),'dist'),guidePath=source(p,'site/research-guides.json'),fragment=source(p,'site/content-reading.html');
 const data=JSON.parse(fs.readFileSync(guidePath,'utf8')),card=structuredClone(data.cards[0]);
 card.id='fixture-new-guide';card.title='Build fixture: newly authored guide';card.prerequisites=[{label:'New generated-page target',href:'reading.html#fixture-new-target'}];delete card.visualTrace;delete card.contextTrail;
 data.cards.push(card);data.cards[0].prerequisites.push({label:'New guide target',href:'reading.html#guide-fixture-new-guide'});
 fs.writeFileSync(guidePath,JSON.stringify(data,null,2)+'\n');fs.appendFileSync(fragment,'\n<section id="fixture-new-target"><a href="#guide-fixture-new-guide">New fixture link</a></section>\n');
 const before=sourceRecords(p);M.build({root:p,manifest,output:out,reproducible:true});
 const html=fs.readFileSync(path.join(out,'reading.html'),'utf8');a.match(html,/id="guide-fixture-new-guide"/);a.match(html,/id="fixture-new-target"/);a.deepEqual(sourceRecords(p),before);
 a.deepEqual(fs.readdirSync(path.join(p,'build/compatibility-seeds')),['project.gitignore']);a.equal(fs.existsSync(path.join(p,'build/migration-baseline.json')),false);
 const current=M.treeRecords(out),valid=fs.readFileSync(fragment,'utf8');
 for(const invalid of [valid.replace('id="fixture-new-target"','id="removed-fixture-target"'),valid+'<div id="fixture-new-target"></div>',valid+'<a href="reading.html#missing-unregistered-target">broken</a>',valid+'<a href="/reading.html#reading">escaped project</a>',valid+'<img src="/course.css">',valid+'<a href="../reading.html#reading">escaped parent</a>',valid+'<a href="%2e%2e/reading.html#reading">escaped encoded parent</a>',valid+'<img src="../course.css">']){
  fs.writeFileSync(fragment,invalid);a.throws(()=>M.build({root:p,manifest,output:out}),/Missing|Duplicate|Invalid|prefix/);a.deepEqual(M.treeRecords(out),current);
 }
 fs.writeFileSync(fragment,valid);M.build({root:p,manifest,output:out,check:true});
});

test('generated declarations cannot conceal missing outputs or unmap files the generator emits',t=>{
 const p=fixture(t);
 const missing=changed(m=>{m.entries.push({source:null,compatibility:'unimplemented-output.html',public:'unimplemented-output.html',owner:'features/site-generation',role:'generated'});});
 a.throws(()=>M.build({root:p,manifest:missing,output:path.join(temp(t),'dist')}),/Output file set/);
 for(const file of ['index.html','legacy-routes.js']){
  const removed=changed(m=>{m.entries=m.entries.filter(e=>e.compatibility!==file);});
  a.throws(()=>M.build({root:p,manifest:removed,output:path.join(temp(t),'dist')}),/Output file set/);
 }
});

test('build-source migration exceptions are enumerated individually and reject scientific or missing entries',()=>{
 const good=auditFixture();a.equal(A.auditMigration(good).buildSources.length,A.BUILD_FILES.length);
 for(const mutate of [x=>x.buildDeltas.entries.pop(),x=>x.buildDeltas.entries.push({...x.buildDeltas.entries[0]}),x=>{x.buildDeltas.entries[0].compatibility='course-core.js';},x=>{x.buildDeltas.entries[0].beforeSha256='0'.repeat(64);},x=>{x.buildDeltas.entries[0].afterSha256='0'.repeat(64);}]){const changed=auditFixture();mutate(changed);a.throws(()=>A.auditMigration(changed));}
 const generated=auditFixture(),outputs=new Set(manifest.entries.filter(e=>e.role==='generated').map(e=>e.compatibility));
 for(const e of generated.manifest.entries)if(outputs.has(e.compatibility))e.source=null;
 generated.inputs=generated.inputs.filter(e=>!outputs.has(e.path));a.doesNotThrow(()=>A.auditMigration(generated));
 generated.generated.find(e=>e.path==='reading.html').sha256=M.sha('changed scientific output');a.throws(()=>A.auditMigration(generated),/generated bytes/);
});

test('the reviewed build-source exception record has exact independent bytes',()=>{
 const bytes=fs.readFileSync(path.join(root,'build/migration-build-deltas.json'));
 a.equal(M.sha(bytes),'66d7f5b6a11aa339b584c6a035a1d391c32ce6095e529df3099d5f9ad36ed56b');
 a.doesNotThrow(()=>A.validateDeltas(JSON.parse(bytes),baseline,A.BUILD_FILES));
});

// Source-hash contracts are intentionally reviewed separately from legacy .js scans.
test('every published ESM source has one exact reviewed contract and both Worker endpoints remain mapped',()=>{
 const c=JSON.parse(fs.readFileSync(path.join(root,'scripts/build/module-runtime-contracts.json'),'utf8')),modules=manifest.entries.filter(e=>e.public?.endsWith('.mjs'));
 a.deepEqual(c.modules.map(x=>x.public).sort(),modules.map(x=>x.public).sort());
 for(const record of c.modules){const mapping=modules.find(e=>e.public===record.public);a.equal(M.sha(fs.readFileSync(path.join(root,mapping.source))),record.sha256);}
 const ui=c.modules.find(x=>x.public==='otfs-receiver/otfs-receiver.mjs');a.equal(ui.runtimePolicy,'literal-workers');a.deepEqual(ui.runtimeEdges.map(e=>e.url),['./sensing/browser-worker.mjs','./communication/browser-worker.mjs']);
 for(const edge of ui.runtimeEdges)a.ok(modules.some(e=>e.public==='otfs-receiver/'+edge.url.slice(2)));
 a.equal(c.modules.filter(x=>x.runtimePolicy==='command-line-inputs-unverified').length,2);
});
