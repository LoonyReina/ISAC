'use strict';
// Remove only the nine newly reviewed optional fields. The pre-existing seven
// traces, all nineteen guide cores, context trails and ordering remain guarded.
const {withoutNetworkContext}=require('./network-context-preservation.cjs');
const remainingTraceIds=new Set([
 'otfs-sensing-assisted-2021','nearfield-double-array-ispac','mimo-ofdm-realtime-testbed-2023',
 'ofdm-ici-aware-receiver-2021','ofdm-passive-atomic-errors-2017',
 'channels-shared-clusters-2024','channels-target-environment-coupling-2025',
 'tradeoffs-feedback-capacity-distortion-2018','tradeoffs-causal-state-communication-2013'
]);
function withoutRemainingTraces(data){
 const prior=withoutNetworkContext(data);
 for(const card of prior.cards)if(remainingTraceIds.has(card.id))delete card.visualTrace;
 return prior;
}
const priorGuideSource=data=>JSON.stringify(withoutRemainingTraces(data),null,2)+'\n';
module.exports={remainingTraceIds,withoutRemainingTraces,priorGuideSource};
