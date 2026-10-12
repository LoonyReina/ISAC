'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const M=require('../scripts/build/compatibility.cjs'),root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'build/compatibility-manifest.json'),'utf8'));
function temp(t){const p=fs.mkdtempSync(path.join(os.tmpdir(),'isac-build-test-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;}
function changed(fn){const m=structuredClone(manifest);fn(m);return m;}

test('explicit baseline covers all legacy files, 27 public HTML and the three directly linked test sources',()=>{
 a.equal(M.validateManifest(manifest,root),manifest);a.equal(manifest.entries.length,368);a.equal(manifest.entries.filter(e=>e.public!==null).length,367);a.deepEqual(manifest.entries.filter(e=>e.public===null).map(e=>e.compatibility),['.gitignore']);
 a.equal(manifest.entries.filter(e=>e.role==='generated-compatibility-seed').length,9);a.ok(manifest.entries.filter(e=>e.role==='generated-compatibility-seed').every(e=>e.plannedSource.startsWith('build/compatibility-seeds/')));
 for(const f of ['tests/crb-beamforming.test.cjs','tests/crb-beamforming-ui.test.cjs','tests/joint-beamforming.test.cjs','scripts/shared-array-reference/source-audit.md','scripts/generate-waveform.py','data/waveform-states.json'])a.ok(manifest.entries.some(e=>e.public===f),f);
 for(const f of ['scripts/build-compatibility.cjs','scripts/build/compatibility.cjs','tests/compatibility-build.test.cjs','build/compatibility-manifest.json'])a.ok(!manifest.entries.some(e=>e.public===f),'build machinery is not auto-published');
 a.deepEqual(new Set(manifest.owners.map(o=>o.id.split('/')[0])),new Set(['content','features','labs','shared','validators']));
});

test('manifest rejects malformed versions, fields, ownership and hashes',()=>{
 for(const fn of [m=>{m.schemaVersion=2;},m=>{m.baselineRevision='a'.repeat(40);},m=>{m.entries=null;},m=>{m.entries[0].extra=true;},m=>{m.entries[0].owner='unknown';},m=>{m.entries[0].role='inferred';},m=>{m.entries[0].sha256='0'.repeat(64);},m=>{m.owners.push({...m.owners[0]});}])a.throws(()=>M.validateManifest(changed(fn),root));
});

test('all mapped filesystem paths reject escape, absolute, hidden, encoded and platform-ambiguous paths',()=>{
 for(const value of ['../index.html','/tmp/index.html','C:/index.html','a\\index.html','a/../index.html','a//index.html','./index.html','a/./index.html','%2e%2e/index.html','index.html?token=x','index.html#fragment','a\0b','.env','.git/config','node_modules/x.js'])for(const key of ['source','compatibility','public','plannedSource'])a.throws(()=>M.validateManifest(changed(m=>{m.entries[0][key]=value;}),root),/Unsafe/);
});

test('duplicates and file-directory collisions cannot silently overwrite outputs',()=>{
 for(const key of ['source','compatibility','public','plannedSource']){
  a.throws(()=>M.validateManifest(changed(m=>{m.entries[2][key]=m.entries[3][key];}),root));
  if(key!=='source')a.throws(()=>M.validateManifest(changed(m=>{m.entries[2][key]='FILE';m.entries[3][key]='file/child';}),root),/collision/);
  if(key!=='source')a.throws(()=>M.validateManifest(changed(m=>{m.entries[2][key]='FILE';m.entries[3][key]='file';}),root),/Duplicate/);
 }
});

test('unlinked evidence, tests and fixtures cannot be pruned from the approved full baseline',()=>{
 for(const f of ['docs/GUIDED-NOTEBOOK-SHA256.txt','scripts/distributed-detection-independent/VALIDATION_REPORT.md','site/content-reading.html','tests/helpers/frontier-trace-preservation.cjs']){a.ok(manifest.entries.some(e=>e.compatibility===f));a.throws(()=>M.validateManifest(changed(m=>{m.entries=m.entries.filter(e=>e.compatibility!==f);}),root),/baseline coverage|Missing build/);}
 a.throws(()=>M.validateManifest(changed(m=>{m.entries.find(e=>e.public==='scripts/generate-waveform.py').public=null;}),root),/public baseline/);
});

test('missing and symlinked source files fail before any outside read or output creation',t=>{
 a.throws(()=>M.validateManifest(changed(m=>{m.entries[0].source='missing-source';}),root),/Missing source/);
 const fixture=temp(t);fs.symlinkSync(path.join(root,'.gitignore'),path.join(fixture,'linked-ignore'));a.throws(()=>M.validateManifest(changed(m=>{m.entries[0].source='linked-ignore';}),fixture),/Symlink source/);
 const second=temp(t);fs.symlinkSync(root,path.join(second,'linked'));a.throws(()=>M.validateManifest(changed(m=>{m.entries[0].source='linked/.gitignore';}),second),/Symlink source/);
});

test('output roots, inputs and symlink ancestors cannot become write destinations',t=>{
 const p=temp(t),other=temp(t);fs.symlinkSync(other,path.join(p,'linked'));
 for(const output of [root,path.dirname(root),path.join(root,'index.html'),path.join(p,'linked','dist')])a.throws(()=>M.build({root,manifest,output}),/Output/);
 a.deepEqual(fs.readdirSync(other),[]);
});

test('clean builds preserve every approved byte and dependency, are reproducible, and leave existing output untouched',t=>{
 const p=temp(t),out=path.join(p,'first'),second=path.join(p,'second');
 const first=M.build({root,manifest,output:out,reproducible:true});a.equal(first.compatibilityFiles,368);a.equal(first.publicFiles,367);a.equal(first.htmlPages,27);a.equal(first.publicTreeSha256,M.BASELINE.publicDigest);a.equal(first.compatibilityTreeSha256,M.BASELINE.compatibilityDigest);a.equal(first.reproducible,true);a.equal(first.tests,null);a.ok(first.dependencyEdges>2600);
 const next=M.build({root,manifest,output:second});a.equal(next.publicTreeSha256,first.publicTreeSha256);a.deepEqual(M.treeRecords(out),M.treeRecords(second));
 const edges=M.checkDependencies(out,manifest);for(const [from,to]of [['course.js','course-ui.js'],['course.js','velocity-core.js'],['course.js','velocity-bridge.js'],['waveform.js','data/waveform-states.json'],['reflection-aperture-core.js','multipath-channel-core.js']])a.ok(edges.some(e=>e.from===from&&e.to===to),from+' → '+to);a.ok(edges.some(e=>e.kind==='documentation'));
 const noRuntime=changed(m=>{m.entries=m.entries.filter(e=>e.public!=='velocity-core.js');});a.throws(()=>M.checkDependencies(out,noRuntime),/Unmapped public dependency/);
 fs.writeFileSync(path.join(out,'private.txt'),'do not overwrite');a.throws(()=>M.build({root,manifest,output:out,check:true}),/output changed/);a.equal(fs.readFileSync(path.join(out,'private.txt'),'utf8'),'do not overwrite');
 const missing=path.join(p,'missing');a.throws(()=>M.build({root,manifest,output:missing,check:true}),/does not exist/);a.equal(fs.existsSync(missing),false);
 // Input validation still succeeds after all builds: no generator touched source bytes.
 a.equal(M.validateManifest(manifest,root),manifest);
});
