'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {withoutMapProgressions,withoutMapProgressionGenerator,progression,guideDeclaration,homeDeclaration,directionDeclaration,mapCall,homeEmit}=require('./helpers/map-progression-preservation.cjs');
const {withoutReferenceUncertainty,withoutReferencePrerequisite}=require('./helpers/reference-uncertainty-registry.cjs');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const registry=JSON.parse(read('site/registry.json')),generator=read('scripts/generate-site.cjs');
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
 for(let i=1;i<4;i++)for(const field of ['nodeId','unitId','guideId','nextGuideId']){
  const r=structuredClone(registry);r.knowledgeMap.progressions[i][field]+='-changed';a.throws(()=>registryGuard(r));
 }
 for(const mutate of [r=>r.knowledgeMap.progressions.pop(),r=>r.knowledgeMap.progressions.reverse(),r=>r.knowledgeMap.progressions.push({...r.knowledgeMap.progressions[1]}),r=>r.knowledgeMap.progressions[1].relationType='direct-citation']){const r=structuredClone(registry);mutate(r);a.throws(()=>registryGuard(r));}
});
