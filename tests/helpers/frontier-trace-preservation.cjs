'use strict';
// Only these three reviewed optional traces are removed before historical guards.
// Full prior cards, other traces, context trails and their order remain protected.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const frontierTraceHashes={
  "channels-sensing-communication-mapping-2026": "fea7341b5f62956169c87c936e33cbdca4032cded0d8fa1b823bce68ef34d099",
  "zak-otfs-semiblind-offgrid-2026": "10d0d7b8b0d773ca6265afd5aa145493b0527ef91834d5cf22a8dd8ffcb2f424",
  "sbfd-resource-synchronization-2026": "cc1e700994e269b8823a18355c672a6423d9f4babdba972f0d5e698032f54566"
};
const frontierTraceIds=Object.keys(frontierTraceHashes);
function withoutFrontierTraces(data){
 const prior=structuredClone(data);
 for(const id of frontierTraceIds){
  const matches=prior.cards.filter(c=>c.id===id);
  if(!matches.length)continue;
  a.equal(matches.length,1,'one existing guide per frontier trace');
  const card=matches[0];a.ok(Object.hasOwn(card,'visualTrace'),'reviewed frontier trace is present');
  a.equal(crypto.createHash('sha256').update(JSON.stringify(card.visualTrace)).digest('hex'),frontierTraceHashes[id],'exact reviewed frontier trace');
  delete card.visualTrace;
 }
 return prior;
}
module.exports={frontierTraceHashes,frontierTraceIds,withoutFrontierTraces};
