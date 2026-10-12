'use strict';
// Reading-only association and frozen existing behavior; no paper algorithm claim.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createLearningEntryResolver}=require('../scripts/learning-entry.cjs');
const {buildResearchGuides,renderResearchGuides}=require('../scripts/research-guides.cjs');
const {spatialGuideId,spatialGuideHash,aperturePrerequisite,withoutApertureTeachingLinks,withoutSpatialFrontier}=require('./helpers/spatial-frontier-preservation.cjs');
const {withoutBuildLinkValidation}=require('./helpers/map-progression-preservation.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const registry=JSON.parse(read('site/registry.json')),data=JSON.parse(read(registry.researchGuidesFile));
const hash=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const spatial=d=>d.cards.find(c=>c.id===spatialGuideId),design=d=>spatial(d).visualTrace.steps.find(s=>s.id==='design');

test('only the new spatial guide links the independent illustration through the existing resolver',()=>{
 const href=aperturePrerequisite.href,card=spatial(data),before=JSON.stringify(data);
 a.deepEqual(card.prerequisites.at(-1),aperturePrerequisite);a.equal(design(data).lessonHref,href);
 a.deepEqual(data.cards.filter(c=>c.prerequisites.some(p=>p.href===href)).map(c=>c.id),[spatialGuideId]);
 a.deepEqual(data.cards.flatMap(c=>(c.visualTrace?.steps||[]).filter(s=>s.lessonHref===href).map(s=>[c.id,s.id])),[[spatialGuideId,'design']]);
 a.equal(createLearningEntryResolver(registry).unitEntry({href}),href);
 a.equal((read('multipath-channel.html').match(/id="aperture-geometry"/g)||[]).length,1);
 const guides=buildResearchGuides(data,registry),built=guides.find(c=>c.id===spatialGuideId),html=renderResearchGuides(guides);
 a.equal(built.existingSourceCase,undefined);a.equal(built.notebook.id,'near-field');
 a.equal((html.match(/href="multipath-channel\.html#aperture-geometry"/g)||[]).length,3,'prerequisite and matching screen/print trace links');
 a.ok(html.includes('需要时回看：'+aperturePrerequisite.label));a.equal(JSON.stringify(data),before);
});

test('guide and trace route validation rejects missing fragments and malformed destinations',()=>{
 for(const href of ['multipath-channel.html#aperture-geometry-missing','missing-aperture-page.html#aperture-geometry','multipath-channel.html#aperture-geometry\n','https://example.test/multipath-channel.html#aperture-geometry','multipath-channel.html#%ZZ']){
  const changed=structuredClone(data);spatial(changed).prerequisites.at(-1).href=href;design(changed).lessonHref=href;
  a.throws(()=>buildResearchGuides(changed,registry),/Missing|Invalid/);
 }
 const changed=structuredClone(data);spatial(changed).prerequisites.pop();
 a.throws(()=>buildResearchGuides(changed,registry),/Invalid visual trace prerequisite reference/);
});

test('only exact appended links are normalized before the unchanged spatial-card and old19 fingerprints',()=>{
 const before=JSON.stringify(data),restored=withoutApertureTeachingLinks(data);
 a.equal(hash(spatial(restored)),spatialGuideHash);
 a.equal(hash(JSON.stringify(withoutSpatialFrontier(data),null,2)+'\n'),'e73c1a092072100b345f1df53c566c45db590aee6c63bac2713479d2ffdb1515');
 a.equal(JSON.stringify(data),before);
 const mutations=[
  d=>spatial(d).prerequisites.pop(),
  d=>{spatial(d).prerequisites.at(-1).label+=' changed';},
  d=>{spatial(d).prerequisites.at(-1).href+='-changed';},
  d=>spatial(d).prerequisites.push({...aperturePrerequisite}),
  d=>spatial(d).prerequisites.unshift(spatial(d).prerequisites.pop()),
  d=>{spatial(d).prerequisites.at(-1).unreviewed=true;},
  d=>{delete design(d).lessonHref;},
  d=>{design(d).lessonHref='near-field.html#geometry';},
  d=>{spatial(d).visualTrace.steps[3].lessonHref=design(d).lessonHref;delete design(d).lessonHref;},
  d=>{spatial(d).visualTrace.steps[1].lessonHref=aperturePrerequisite.href;},
  d=>{spatial(d).source.edition+=' changed';},
  d=>{spatial(d).contextTrail.links[0].relationType='direct-citation';},
  d=>{design(d).explanation+=' changed';}
 ];
 for(const mutate of mutations){const changed=structuredClone(data);mutate(changed);a.throws(()=>withoutSpatialFrontier(changed));}
 for(const mutate of [d=>{d.cards[0].question+=' changed';},d=>{d.cards[0].visualTrace.title+=' changed';},d=>{d.cards[5].contextTrail.changedCondition+=' changed';}]){
  const changed=structuredClone(data);mutate(changed);
  a.notEqual(hash(JSON.stringify(withoutSpatialFrontier(changed),null,2)+'\n'),'e73c1a092072100b345f1df53c566c45db590aee6c63bac2713479d2ffdb1515');
 }
});

test('existing model, export, guide runtime and canonical registry/resolvers stay byte-exact',()=>{
 const expected={
  'multipath-channel-core.js':'414f00f2bcad736281881edd643308fa622887ccf4227aa2e227fe24119816a8',
  'multipath-channel.js':'f67b0b9a7ca812467677ea66d68d05afe7faad007373f1cb23b91d13b01e9cca',
  'experiment-record.js':'cb9f4bc1c330db98d013922287ae4625f5b9d788b74860d86fe22eec40f6bb8f',
  'scripts/generate-site.cjs':'9d36cef2452143e58eba8a7b0586c5971856cda8c6c82676c248fe2753e5c310',
  'scripts/learning-entry.cjs':'f7c2fcdeb49f2759f7de3537bfcdddfd3bb9a60abf4c58f27e31e6194b66d287',
  'scripts/research-guides.cjs':'54f29acc3441f7cca0e97a5fb293d798bb3958576de190c004331cc8020a536a',
  'research-guides.js':'67bd79cf79a670ad9ffa12d3ad13084c1ffb8f4e5b4cf2e538fae51904e2d890',
  'site/registry.json':'b8414c17f5251f1ea940c62c69e6e8f93327b964e972b3f7c3e89bef14ce7f07'
 };
 for(const [file,digest]of Object.entries(expected))a.equal(hash(withoutBuildLinkValidation(file,read(file))),digest,file);
 a.deepEqual([data.cards.length,registry.units.length,registry.cases.length,registry.knowledgeMap.nodes.length],[20,28,15,32]);
});
