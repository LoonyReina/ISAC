import {calculate,MODEL_ID,KERNEL_VERSION} from './kernel.mjs';
let active;
self.onmessage=async({data})=>{
  if(data.type==='cancel'){active?.abort();return;}
  if(data.type!=='run')return;
  active?.abort();const abort=new AbortController();active=abort;const envelope=data.envelope;
  if(envelope.modelId!==MODEL_ID||envelope.kernelVersion!==KERNEL_VERSION)return;
  try{
    const result=await calculate(envelope.input,{signal:abort.signal,chunkSlices:8,onProgress:progress=>{
      if(!abort.signal.aborted&&active===abort)self.postMessage({...envelope,type:'progress',progress});
    }});
    if(!abort.signal.aborted&&active===abort)self.postMessage({...envelope,type:'result',result});
  }catch(error){if(!abort.signal.aborted)self.postMessage({...envelope,type:'error',error:String(error.message)});}
};
