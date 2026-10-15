'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('./helpers/teaching-heading-maintenance-preservation.cjs');
const root=path.resolve(__dirname,'..');
const locate=row=>[row.path,row.compatibility].map(p=>path.join(root,p)).find(p=>fs.existsSync(p));
function priorFor(file){const row=P.delta.files.find(r=>r.path===file),p=locate(row);a.ok(p,file);return P.withoutFile(row.path,fs.readFileSync(p));}
test('presentation maintenance reverses exact listed endpoints and rejects changed bytes or edit boundaries',()=>{
 let count=0;
 for(const row of P.delta.files){const p=locate(row);if(!p)continue;count++;const bytes=fs.readFileSync(p),before=P.withoutFile(row.path,bytes);a.ok(P.identity(before,row.before),row.path);a.deepEqual(P.withoutFile(row.path,before),before);a.throws(()=>P.withoutFile(row.path,Buffer.concat([bytes,Buffer.from('unreviewed')])));a.throws(()=>P.withoutFile(row.path,bytes,[row,row]));const bad=structuredClone(row);bad.changes[0].beforeBase64=Buffer.from('unreviewed').toString('base64');a.throws(()=>P.withoutFile(row.path,bytes,[bad]));}
 a.ok(count>=16,'source or compatibility view covers the reviewed changed files');
});
test('accepted historical manifests and every numerical core remain byte-identical',()=>{
 for(const row of [...P.delta.protectedScientificFiles,...P.delta.protectedAcceptedManifests]){if(row.sourceOnly&&!fs.existsSync(path.join(root,'content/pages/foundations.html')))continue;const p=locate(row);a.ok(p,row.path);a.ok(P.identity(fs.readFileSync(p),row),row.path);}
});
test('cooperative UI and view changes contain only display string replacements',()=>{
 const quoted=/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g;
 for(const file of ['labs/cooperative-clusters/cooperative-fim-ui.mjs','labs/cooperative-clusters/cooperative-fim-view.mjs']){const row=P.delta.files.find(r=>r.path===file),now=fs.readFileSync(locate(row),'utf8'),before=priorFor(file).toString();a.equal(now.replace(quoted,'STRING'),before.replace(quoted,'STRING'),file);}
});
test('cooperative current contract changes only presentation identities and the display breadcrumb',()=>{
 const file='scripts/build/cooperative-clusters-runtime-contracts.json',row=P.delta.files.find(r=>r.path===file),now=JSON.parse(fs.readFileSync(locate(row))),before=JSON.parse(priorFor(file));
 const normalized=structuredClone(now);normalized.entryPageSha256=before.entryPageSha256;normalized.entryHeadSha256=before.entryHeadSha256;normalized.pageRegions.CONTEXT=normalized.pageRegions.CONTEXT.replace(P.delta.registryTitle.after,P.delta.registryTitle.before);
 for(const p of ['cooperative-fim-ui.mjs','cooperative-fim-view.mjs'])normalized.modules.find(m=>m.public===p).sha256=before.modules.find(m=>m.public===p).sha256;
 normalized.assets.find(m=>m.public==='cooperative-fim.css').sha256=before.assets.find(m=>m.public==='cooperative-fim.css').sha256;
 a.deepEqual(normalized,before,'all numerical identities, source literals, imports, Worker and data edges unchanged');
});
test('page copy changes retain all IDs, controls, links and resource loading attributes',()=>{
 const structural=s=>[...s.matchAll(/<(?:input|button|select|option|canvas|svg|script|link|a)\b[^>]*>|\bid=(?:"[^"]*"|'[^']*')/g)].map(m=>m[0]);
 for(const file of ['content/pages/foundations.html','content/pages/cooperative-clusters.html','foundations.html','cooperative-clusters.html']){const row=P.delta.files.find(r=>r.path===file),p=locate(row);if(!p)continue;a.deepEqual(structural(fs.readFileSync(p,'utf8')),structural(P.withoutFile(row.path,fs.readFileSync(p)).toString()),file);}
});
test('presentation metadata inverses change only exact declared title and module identities',()=>{
 const registryFile=P.delta.files.find(r=>r.path==='content/data/registry.json'),registry=JSON.parse(fs.readFileSync(locate(registryFile))),oldRegistry=JSON.parse(priorFor(registryFile.path));a.deepEqual(P.withoutRegistry(registry),oldRegistry);
 const moduleFile=P.delta.files.find(r=>r.path==='scripts/build/module-runtime-contracts.json'),modules=JSON.parse(fs.readFileSync(locate(moduleFile))),oldModules=JSON.parse(priorFor(moduleFile.path));a.deepEqual(P.withoutContracts(modules),oldModules);
 const registryBad=structuredClone(registry);registryBad.pages.find(p=>p.path===P.delta.registryTitle.path).title='unreviewed';a.throws(()=>P.withoutRegistry(registryBad));
 const modulesBad=structuredClone(modules);modulesBad.modules.find(m=>m.public===P.delta.moduleShaChanges[0].public).sha256='0'.repeat(64);a.throws(()=>P.withoutContracts(modulesBad));
 const manifestPath=path.join(root,'build/compatibility-manifest.json');if(fs.existsSync(manifestPath)){const manifest=JSON.parse(fs.readFileSync(manifestPath));a.equal(P.sha(JSON.stringify(P.withoutMappings(manifest),null,2)+'\n'),P.delta.priorManifestSha256);for(const row of P.delta.addedEntries){const bad=structuredClone(manifest);bad.entries.find(e=>e.source===row.source).public=row.source;a.throws(()=>P.withoutMappings(bad));}}
});
