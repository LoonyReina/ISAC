'use strict';
importScripts('waveform-core.js','procrustes-core.js','waveform-live-model.js');
self.onmessage=async event=>{
 const request=event.data||{},id=request.id;
 if(request.type!=='solve'||!Number.isSafeInteger(id))return;
 try{
  const input=request.mode==='generated'?WaveformLiveModel.generated(request.settings):request.inputs;
  if(request.weightedOptions){try{importScripts('weighted-core.js');}catch(error){/* The model retains the freshly solved strict branch and reports weighted failure. */}}
  const result=request.weightedOptions?WaveformLiveModel.solveWeighted(input,request.weightedOptions,value=>self.postMessage({type:'progress',id,...value})):WaveformLiveModel.solve(input);
  result.requestSignature=WaveformLiveModel.canonicalRequest(result.inputs,request.weightedOptions||null);
  const text=WaveformLiveModel.canonicalInputs(result.inputs);
  if(self.crypto&&self.crypto.subtle){const digest=await self.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));result.inputSha256=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');result.inputHashStatus='verified';const requestDigest=await self.crypto.subtle.digest('SHA-256',new TextEncoder().encode(result.requestSignature));result.requestSha256=Array.from(new Uint8Array(requestDigest),v=>v.toString(16).padStart(2,'0')).join('');}
  else {result.inputSha256=null;result.inputHashStatus='unavailable-in-this-context';result.requestSha256=null;}
  self.postMessage({type:'result',id,result});
 }catch(error){self.postMessage({type:'error',id,error:WaveformLiveModel.friendlyError(error)});}
};
