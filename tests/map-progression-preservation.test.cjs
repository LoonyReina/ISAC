'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {withoutMapProgressions,withoutMapProgressionGenerator,withoutBuildLinkValidation,buildLinkValidationHooks,progression,guideDeclaration,homeDeclaration,directionDeclaration,mapCall,homeEmit}=require('./helpers/map-progression-preservation.cjs');
const {withoutReferenceUncertainty,withoutReferencePrerequisite}=require('./helpers/reference-uncertainty-registry.cjs');
const {withoutPilotContinuation}=require('./helpers/pilot-continuation-preservation.cjs');
const {withoutCapacityExecutionRenderer}=require('./helpers/capacity-execution-preservation.cjs');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const registry=JSON.parse(read('site/registry.json')),generator=withoutBuildLinkValidation('scripts/generate-site.cjs',read('scripts/generate-site.cjs'));
const hash=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
// Reuse the earlier fingerprints, including their earlier exact normalization.
const registryBaseline='c759bdb61a8ae539569b5ed526bf169793dace46510a381a998ffbd9264b56ae';
const generatorBaseline='613b820c80dcac00fe18c4ae5b6a63c1eb044105245e69be5628767fa9c53479';
const registryGuard=value=>a.equal(hash(withoutReferenceUncertainty(withoutMapProgressions(value))),registryBaseline);
const generatorGuard=value=>a.equal(hash(withoutReferencePrerequisite(withoutMapProgressionGenerator(value))),generatorBaseline);

test('exact progression adapters preserve the old fingerprints without mutating input',()=>{
 const before=JSON.stringify(registry);
 registryGuard(registry);generatorGuard(generator);
 a.equal(JSON.stringify(registry),before);
 a.ok(!Object.hasOwn(withoutMapProgressions(registry).knowledgeMap,'progressions'));
});

test('registry guard rejects missing, mutated, duplicate and relocated progression selections',()=>{
 const mutations=[
  r=>delete r.knowledgeMap.progressions,
  r=>r.knowledgeMap.progressions=[],
  ...Object.keys(progression).map(key=>r=>{r.knowledgeMap.progressions[0][key]+='-changed';}),
  r=>r.knowledgeMap.progressions[0].unreviewed=true,
  r=>r.knowledgeMap.progressions.push(structuredClone(progression)),
  r=>{const {progressions,...old}=r.knowledgeMap;r.knowledgeMap={progressions,...old};},
  r=>{r.progressions=r.knowledgeMap.progressions;delete r.knowledgeMap.progressions;}
 ];
 for(const mutate of mutations){const changed=structuredClone(registry);mutate(changed);a.throws(()=>registryGuard(changed));}
});

test('registry normalization cannot hide unrelated data edits or extra hooks elsewhere',()=>{
 const mutations=[
  r=>r.knowledgeMap.nodes[0].title+=' changed',
  r=>r.knowledgeMap.edges.pop(),
  r=>r.knowledgeMap.nodes[0].progressions=[structuredClone(progression)],
  r=>r.units[0].title+=' changed',r=>r.cases[0].title+=' changed',
  r=>r.directions[0].scope+=' changed',r=>r.pages[0].role+=' changed',
  r=>r.legacy['index.html'].unreviewed='reading.html#research-guides',
  r=>r.researchGuidesFile='site/unreviewed-guides.json',
  r=>r.unreviewed=[structuredClone(progression)]
 ];
 for(const mutate of mutations){const changed=structuredClone(registry);mutate(changed);a.throws(()=>registryGuard(changed));}
});

test('generator guard rejects missing, mutated, duplicate and relocated exact hooks',()=>{
 const hooks=[guideDeclaration,mapCall,homeEmit];
 for(const hook of hooks)for(const changed of [generator.replace(hook,''),generator+hook,generator.replace(hook,'')+hook])a.throws(()=>generatorGuard(changed));
 const mutations=[
  s=>s.replace(guideDeclaration,guideDeclaration.replace('registry.researchGuidesFile',"'site/other-guides.json'")),
  s=>s.replace(mapCall,mapCall.replace('(registry,researchGuides)','(registry,[])')),
  s=>s.replace(homeEmit,homeEmit.replace('map-progression-v1','unreviewed-v1')),
  s=>s.replace(guideDeclaration+homeDeclaration,homeDeclaration+guideDeclaration),
  s=>s.replace(guideDeclaration,'').replace(directionDeclaration,guideDeclaration+directionDeclaration),
  s=>s.replace('const notebookTopics=buildNotebookTopics(registry);','const notebookTopics=[];'),
  s=>s.replace('knowledge-map.js?v=knowledge-map-v3','knowledge-map.js?v=unreviewed-v1')
 ];
 for(const mutate of mutations){const changed=mutate(generator);a.notEqual(changed,generator);a.throws(()=>generatorGuard(changed));}
});

test('the additional route selections stay exact rather than broadening the historical normalization',()=>{
 for(let i=1;i<5;i++)for(const field of ['nodeId','unitId','guideId','nextGuideId']){
  const r=structuredClone(registry);r.knowledgeMap.progressions[i][field]+='-changed';a.throws(()=>registryGuard(r));
 }
 for(const mutate of [r=>r.knowledgeMap.progressions.pop(),r=>r.knowledgeMap.progressions.reverse(),r=>r.knowledgeMap.progressions.push({...r.knowledgeMap.progressions[1]}),r=>r.knowledgeMap.progressions[1].relationType='direct-citation']){const r=structuredClone(registry);mutate(r);a.throws(()=>registryGuard(r));}
});

// These are the pre-refactor source digests, including every old validator byte.
const buildScriptBaselines={
 "scripts/generate-site.cjs": "9d36cef2452143e58eba8a7b0586c5971856cda8c6c82676c248fe2753e5c310",
 "scripts/knowledge-map.cjs": "8b6439699aa3c1daa2cb96295005f18f7c62758ca5f13970d7885535018a2b7f",
 "scripts/learning-entry.cjs": "f7c2fcdeb49f2759f7de3537bfcdddfd3bb9a60abf4c58f27e31e6194b66d287",
 "scripts/notebook-topics.cjs": "d542ae472a8ce50c3b1b8f7b4ee919f7dce1463777f7e27fe138c04269b29477",
 "scripts/paper-comparison-groups.cjs": "4daf7dbda44577d3ac007214874ec579eccfe95dc10bcf666baf7fdddbde76ed",
 "scripts/render-research-directory.cjs": "8d1f7f2925e88430def0c9159c7ec06f818f35cb6ea9c089ff5a1f877a1219c9",
 "scripts/research-guides.cjs": "54f29acc3441f7cca0e97a5fb293d798bb3958576de190c004331cc8020a536a"
};
const buildScriptGuard=(file,source)=>a.equal(hash(withoutBuildLinkValidation(file,source)),buildScriptBaselines[file],file);

test('exact deferred-build injections normalize to all seven original source byte fingerprints',()=>{
 a.deepEqual(Object.keys(buildLinkValidationHooks),Object.keys(buildScriptBaselines));
 for(const [file,digest]of Object.entries(buildScriptBaselines)){
  const source=read(file),prior=withoutBuildLinkValidation(file,source);a.equal(hash(prior),digest,file);
  let injected=prior;
  for(const {before,after}of buildLinkValidationHooks[file]){
   a.equal(injected.split(before).length,2,file+' exact original hook');injected=injected.replace(before,()=>after);
  }
  const normalized=file==='scripts/generate-site.cjs'?withoutPilotContinuation(source):file==='scripts/research-guides.cjs'?withoutCapacityExecutionRenderer(source):source;
  a.equal(injected,normalized,file+' only the reviewed deferred hooks differ after exact scoped additions are removed');
 }
});

test('deferred-build normalization rejects missing, altered, duplicate and relocated exact hooks',()=>{
 for(const [file,hooks]of Object.entries(buildLinkValidationHooks)){
  const source=read(file);
  for(const {after}of hooks){
   const changed=after.replace('\n',' /* unreviewed */\n');a.notEqual(changed,after);
   for(const mutated of [source.replace(after,''),source.replace(after,()=>changed),source+after,after+source.replace(after,'')]){
    a.notEqual(mutated,source);a.throws(()=>buildScriptGuard(file,mutated),file);
   }
  }
 }
});

test('deferred-build normalization cannot hide old generator, resolver, notebook or scientific validation edits',()=>{
 const mutations=[
  ['scripts/generate-site.cjs',"const siteStylesheet='site.css?v=knowledge-map-v1';","const siteStylesheet='site.css?v=unreviewed';"],
  ['scripts/learning-entry.cjs','canonicalPage&&entry[1]!==canonicalPage','false'],
  ['scripts/notebook-topics.cjs','id.length>64','id.length>128'],
  ['scripts/research-guides.cjs',"url.protocol!=='https:'","url.protocol!=='http:'"],
  ['scripts/knowledge-map.cjs','selections.length&&','false&&'],
  ['scripts/paper-comparison-groups.cjs','value.length>64','value.length>128'],
  ['scripts/render-research-directory.cjs','&&exists(file)','&&true']
 ];
 for(const [file,before,after]of mutations){
  const source=read(file);a.equal(source.split(before).length,2,file+' original validation guard');
  const changed=source.replace(before,()=>after);a.notEqual(changed,source);a.throws(()=>buildScriptGuard(file,changed),file);
 }
 const untouched='scientific model bytes are not a build hook';a.equal(withoutBuildLinkValidation('offgrid-range-core.js',untouched),untouched);
});
