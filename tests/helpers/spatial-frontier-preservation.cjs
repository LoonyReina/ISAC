'use strict';
// Reverse only the two reviewed teaching links before the original frozen-card
// guard. Existing guide fields, traces, context trails and ordering stay protected.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const {withoutFrontierTraces}=require('./frontier-trace-preservation.cjs');
const spatialGuideId='nearfield-mechanism-aware-mapping-2026';
const spatialGuideHash='bc6e730ecfb7d457af7fc143d4fa5cb497e6ca57c97b62121f3f74784a2158fd';
const aperturePrerequisite={href:'multipath-channel.html#aperture-geometry',label:'独立教学图解：固定点与反射平面的五位置对照'};
function withoutApertureTeachingLinks(data){
 const prior=withoutFrontierTraces(data),matches=prior.cards.filter(c=>c.id===spatialGuideId);
 if(matches.length){
  a.equal(matches.length,1,'only one reviewed spatial guide');
  const card=matches[0],positions=card.prerequisites.flatMap((p,i)=>p.href===aperturePrerequisite.href?[i]:[]);
  a.deepEqual(positions,[card.prerequisites.length-1],'exactly one appended aperture prerequisite');
  a.deepEqual(card.prerequisites.pop(),aperturePrerequisite,'exact reviewed independent teaching prerequisite');
  const design=card.visualTrace.steps.filter(s=>s.id==='design');
  a.equal(design.length,1,'one existing design stage');
  a.equal(design[0].lessonHref,aperturePrerequisite.href,'exact reviewed design-stage teaching link');
  delete design[0].lessonHref;
 }
 return prior;
}
function withoutSpatialFrontier(data){
 const prior=withoutApertureTeachingLinks(data),matches=prior.cards.filter(c=>c.id===spatialGuideId);
 if(matches.length){
  a.equal(matches.length,1,'only one reviewed spatial guide');
  a.equal(crypto.createHash('sha256').update(JSON.stringify(matches[0])).digest('hex'),spatialGuideHash,'exact reviewed spatial card, trace and context');
  prior.cards=prior.cards.filter(c=>c.id!==spatialGuideId);
 }
 return prior;
}
module.exports={spatialGuideId,spatialGuideHash,aperturePrerequisite,withoutApertureTeachingLinks,withoutSpatialFrontier};
