'use strict';
importScripts('waveform-core.js','procrustes-core.js','waveform-live-model.js');
self.onmessage=async event=>{
 const request=event.data||{},id=request.id;
 if(request.type!=='solve'||!Number.isSafeInteger(id))return;
 try{
  const input=request.mode==='generated'?WaveformLiveModel.generated(request.settings):request.inputs;
  const result=WaveformLiveModel.solve(input);
  const text=WaveformLiveModel.canonicalInputs(result.inputs);
  if(self.crypto&&self.crypto.subtle){const digest=await self.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));result.inputSha256=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');result.inputHashStatus='verified';}
  else {result.inputSha256=null;result.inputHashStatus='unavailable-in-this-context';}
  self.postMessage({type:'result',id,result});
 }catch(error){self.postMessage({type:'error',id,error:WaveformLiveModel.friendlyError(error)});}
};
