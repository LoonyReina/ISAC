'use strict';
// Historical guards remove only the exact reviewed new guide. Existing guide
// fields, optional traces, context trails and relative ordering stay protected.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const spatialGuideId='nearfield-mechanism-aware-mapping-2026';
const spatialGuideHash='bc6e730ecfb7d457af7fc143d4fa5cb497e6ca57c97b62121f3f74784a2158fd';
function withoutSpatialFrontier(data){
 const prior=structuredClone(data),matches=prior.cards.filter(c=>c.id===spatialGuideId);
 if(matches.length){
  a.equal(matches.length,1,'only one reviewed spatial guide');
  a.equal(crypto.createHash('sha256').update(JSON.stringify(matches[0])).digest('hex'),spatialGuideHash,'exact reviewed spatial card, trace and context');
  prior.cards=prior.cards.filter(c=>c.id!==spatialGuideId);
 }
 return prior;
}
module.exports={spatialGuideId,spatialGuideHash,withoutSpatialFrontier};
