"use strict";
const {test}=require('node:test'),a=require('node:assert/strict'),{stripSite}=require('./helpers/target19-layout.cjs');
const block=k=>'<!-- SITE:'+k+':START --><nav>generated '+k+'</nav><!-- SITE:'+k+':END -->';
const s='<html><head></head><body>'+block('HEADER')+block('CONTEXT')+'<main id="science">untouched</main>'+block('NEXT')+'</body></html>';
test('only three exact SITE interiors normalize, preserving scientific body and other comments',()=>{a.equal(stripSite(s),s.replace(/<nav>[^]*?<\/nav>/g,''));a.match(stripSite(s.replace('untouched','<!-- science -->untouched')),/<!-- science -->untouched/);});
test('missing duplicate unmatched nested and cross-body SITE markers reject',()=>{
 const bad=[s.replace('<!-- SITE:NEXT:END -->',''),s.replace('</body>',block('NEXT')+'</body>'),s.replace('SITE:HEADER:END','SITE:HEADER:START'),s.replace('<nav>generated HEADER</nav>',block('CONTEXT')),s.replace('<nav>generated HEADER</nav>','</body><body>hidden')];
 for(const x of bad)a.throws(()=>stripSite(x));
 a.throws(()=>stripSite(s.replace('<!-- SITE:HEADER:START -->','').replace('<body>','<!-- SITE:HEADER:START --><body>')));
});
test('generator admits only exact supplementary OTFS page and link validator rejects missing or unknown nested HTML',()=>{
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),read=require('./helpers/target19-layout.cjs').reader(root);
 const source=read('scripts/site/generate-site.cjs').toString();a.ok(source.includes("validationOutputs.set('otfs-receiver/source-objective-v1/index.html',read('labs/otfs-receiver/source-objective-v1/index.html'))"));a.match(read('labs/otfs-receiver/source-objective-v1/index.html').toString(),/<html/);
 const modulePath=['scripts/site/learning-entry.cjs','scripts/learning-entry.cjs'].map(x=>path.join(root,x)).find(x=>fs.existsSync(x));const {createBuildLinkValidationContext}=require(modulePath);
 const target='otfs-receiver/source-objective-v1/index.html',parent='<iframe src="'+target+'"></iframe>',outputs=new Map([['otfs-receiver.html',parent],[target,'<main id="core">real</main>']]);
 createBuildLinkValidationContext().validateOutputs(outputs);
 a.throws(()=>createBuildLinkValidationContext().validateOutputs(new Map([['otfs-receiver.html',parent]])),/Missing rendered local link/);
 a.throws(()=>createBuildLinkValidationContext().validateOutputs(new Map([...outputs,['unreviewed.html','<a href="otfs-receiver/source-objective-v1/unknown.html">unknown</a>']])),/Missing rendered local link/);
});

test('candidate flags allow a valid local-ready transition but reject inconsistent claims',()=>{
 const {assertState}=require('./helpers/target19-layout.cjs'),c={releaseReady:false,deployed:false,modules:Array.from({length:19},()=>({enabled:true,coreReady:false,bindingComplete:true}))};assertState(c);
 c.releaseReady=true;a.throws(()=>assertState(c));for(const m of c.modules)m.coreReady=true;assertState(c);
 for(const key of ['enabled','coreReady','bindingComplete']){const d=structuredClone(c);d.modules[0][key]=false;a.throws(()=>assertState(d));delete d.modules[0][key];a.throws(()=>assertState(d));}
});

test('layout sidecar rejects changed mappings and inconsistent source self-manifest',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{reader}=require('./helpers/target19-layout.cjs'),root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'target19-layout-'));
 try{fs.mkdirSync(path.join(tmp,'tests/helpers'),{recursive:true});a.throws(()=>reader(tmp),/ENOENT/);const side=fs.readFileSync(path.join(root,'tests/helpers/target19-layout-manifest.json')),dest=path.join(tmp,'tests/helpers/target19-layout-manifest.json');
 fs.writeFileSync(dest,side);a.deepEqual(reader(tmp)('build/compatibility-manifest.json'),side);
 fs.writeFileSync(dest,Buffer.concat([side,Buffer.from(' ')]));a.throws(()=>reader(tmp),/sidecar hash/);
 fs.writeFileSync(dest,side);fs.mkdirSync(path.join(tmp,'build'));fs.writeFileSync(path.join(tmp,'build/compatibility-manifest.json'),'{}');a.throws(()=>reader(tmp),/source manifest/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('exact supplementary OTFS public entry resolves to real compatibility file without wildcard aliases',()=>{
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),{reader,sha}=require('./helpers/target19-layout.cjs'),read=reader(root),resolve=require('./helpers/otfs-staging-resources.cjs');
 const publicPath='otfs-receiver/source-objective-v1/index.html',compatibility='labs/otfs-receiver/source-objective-v1/index.html',manifest=JSON.parse(read('build/compatibility-manifest.json')),entries=manifest.entries.filter(e=>e.public===publicPath);
 a.equal(entries.length,1);a.equal(entries[0].compatibility,compatibility);a.equal(resolve(publicPath),compatibility);a.ok(fs.statSync(path.join(root,compatibility)).isFile());
 const frozen=require('../scripts/build/target19-otfs-dependencies.cjs').requiredFiles;a.equal(sha(read(entries[0].source)),frozen[publicPath]);
 for(const unknown of ['otfs-receiver/source-objective-v1/unknown.html','otfs-receiver/unreviewed/index.html','unknown/source-objective-v1/index.html'])a.equal(resolve(unknown),unknown);
});
