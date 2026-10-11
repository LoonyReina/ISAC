'use strict';
// Strip only the reviewed context addition on the existing cell-free guide and
// the exact fifth map selector. Older fingerprints remain unchanged.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const guideId='cellfree-vq-compression-2026';
const sourceKeys=['firstSubmittedAt','versionAt','checkedAt','publicationStatus','publicationUrl'];
const progression={nodeId:'geometry',unitId:'geometry',guideId:'networks-cooperative-clusters-2024',nextGuideId:guideId};
const additionHash='ea9c99efee2990c727bea10e82d2af197f310fb0880e4e7a11779ad88944e5ad';
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function withoutNetworkContext(data){
 const prior=structuredClone(data);
 for(const c of prior.cards)if(c.id===guideId){
  const additions={source:Object.fromEntries(sourceKeys.map(k=>[k,c.source[k]])),contextTrail:c.contextTrail};
  a.equal(hash(additions),additionHash,'exact reviewed source fields and network problem-link');
  for(const key of sourceKeys)delete c.source[key];
  delete c.contextTrail;
 }
 return prior;
}
function withoutNetworkProgression(registry){
 const prior=structuredClone(registry),selections=prior.knowledgeMap.progressions;
 a.equal(selections.length,5,'exactly five reviewed progression selections');
 a.deepEqual(selections[4],progression,'only the declared geometry progression is appended');
 selections.pop();
 return prior;
}
module.exports={guideId,sourceKeys,progression,additionHash,withoutNetworkContext,withoutNetworkProgression};
